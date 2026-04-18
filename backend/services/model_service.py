from __future__ import annotations

from dataclasses import dataclass
from threading import Lock
from typing import Any

import joblib
import numpy as np
from joblib.numpy_pickle import NumpyUnpickler
from sklearn.tree import _tree

from utils.errors import ConfigurationError
from utils.url_processing import PreparedUrl


class _LegacyTreePlaceholder:
    def __init__(self, *args) -> None:
        self.args = args
        self.state = None

    def __setstate__(self, state) -> None:
        self.state = state


class _LegacyTreeUnpickler(NumpyUnpickler):
    def find_class(self, module, name):
        if module == "sklearn.tree._tree" and name == "Tree":
            return _LegacyTreePlaceholder
        return super().find_class(module, name)


@dataclass(frozen=True)
class ModelPrediction:
    storage_result: str
    api_result: str
    confidence: float
    model_name: str
    model_version: str
    heuristics: dict


class PhishingModelService:
    def __init__(self, config) -> None:
        self._config = config
        self._load_lock = Lock()
        self._model: Any | None = None
        self._vectorizer: Any | None = None

    def predict(self, prepared_url: PreparedUrl) -> ModelPrediction:
        self._ensure_loaded()
        features = self._transform([prepared_url.combined_text])
        prediction = int(self._model.predict(features)[0])
        phishing_probability = self._extract_probability(features)
        confidence = (
            round(phishing_probability if prediction == 1 else 1 - phishing_probability, 4)
            if phishing_probability is not None
            else 0.5
        )
        is_phishing = prediction == 1
        return ModelPrediction(
            storage_result="phishing" if is_phishing else "legitimate",
            api_result="phishing" if is_phishing else "legit",
            confidence=confidence,
            model_name=type(self._model).__name__,
            model_version=self._config["MODEL_VERSION"],
            heuristics=prepared_url.heuristics,
        )

    def _ensure_loaded(self) -> None:
        if self._model is not None:
            return

        with self._load_lock:
            if self._model is not None:
                return
            try:
                self._model = joblib.load(self._config["MODEL_PATH"])
                self._vectorizer = joblib.load(self._config["VECTORIZER_PATH"])
            except FileNotFoundError as exc:
                raise ConfigurationError("Model artifacts are missing from the configured paths") from exc
            except ValueError as exc:
                if "node array from the pickle has an incompatible dtype" not in str(exc):
                    raise ConfigurationError(f"Unable to load model artifacts: {exc}") from exc
                self._model = self._load_legacy_decision_tree(self._config["MODEL_PATH"])
                self._vectorizer = joblib.load(self._config["VECTORIZER_PATH"])
            except Exception as exc:
                raise ConfigurationError(f"Unable to load model artifacts: {exc}") from exc

    def _transform(self, text_inputs: list[str]):
        if self._vectorizer is None:
            return text_inputs
        transformed = self._vectorizer.transform(text_inputs)
        return transformed.toarray() if hasattr(transformed, "toarray") else transformed

    def _extract_probability(self, features) -> float | None:
        if not hasattr(self._model, "predict_proba"):
            return None
        probabilities = np.asarray(self._model.predict_proba(features)[0], dtype=float)
        probability_sum = probabilities.sum()
        if probability_sum > 0:
            probabilities = probabilities / probability_sum
        classes = np.asarray(getattr(self._model, "classes_", []))
        if 1 in classes:
            phishing_index = int(np.where(classes == 1)[0][0])
            return float(probabilities[phishing_index])
        return float(max(probabilities))

    def _load_legacy_decision_tree(self, model_path: str):
        try:
            with open(model_path, "rb") as handle:
                model = _LegacyTreeUnpickler(
                    model_path,
                    handle,
                    ensure_native_byte_order=False,
                ).load()
            placeholder = getattr(model, "tree_", None)
            if not isinstance(placeholder, _LegacyTreePlaceholder) or placeholder.state is None:
                raise ConfigurationError("Legacy model tree state could not be recovered")

            tree_state = dict(placeholder.state)
            nodes = tree_state["nodes"]
            if "missing_go_to_left" not in nodes.dtype.names:
                tree_state["nodes"] = self._upgrade_legacy_nodes(nodes)

            restored_tree = _tree.Tree(
                model.n_features_in_,
                np.array([len(model.classes_)], dtype=np.intp),
                model.n_outputs_,
            )
            restored_tree.__setstate__(tree_state)
            model.tree_ = restored_tree
            if not hasattr(model, "monotonic_cst"):
                model.monotonic_cst = None
            return model
        except Exception as exc:
            raise ConfigurationError(f"Unable to rebuild legacy decision tree artifact: {exc}") from exc

    @staticmethod
    def _upgrade_legacy_nodes(nodes):
        upgraded_dtype = np.dtype(
            {
                "names": list(nodes.dtype.names) + ["missing_go_to_left"],
                "formats": [nodes.dtype.fields[name][0] for name in nodes.dtype.names] + ["u1"],
                "offsets": [nodes.dtype.fields[name][1] for name in nodes.dtype.names] + [nodes.dtype.itemsize],
                "itemsize": nodes.dtype.itemsize + 8,
            }
        )
        upgraded_nodes = np.empty(nodes.shape, dtype=upgraded_dtype)
        for name in nodes.dtype.names:
            upgraded_nodes[name] = nodes[name]
        upgraded_nodes["missing_go_to_left"] = 0
        return upgraded_nodes
