from __future__ import annotations

import unittest
import numpy as np

from app import create_app
from services.model_service import PhishingModelService


class ModelServiceArtifactTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app({"TESTING": True})
        self.service = PhishingModelService(self.app.config)

    def test_service_loads_real_gradient_boosting_artifact(self):
        self.service._ensure_loaded()

        self.assertEqual(type(self.service._model).__name__, "GradientBoostingClassifier")
        self.assertIsNone(self.service._vectorizer)
        self.assertEqual(self.service._input_mode, "feature_extraction")
        self.assertEqual(self.service._model.n_features_in_, 30)
        self.assertEqual(self.service._model.classes_.tolist(), [-1, 1])

    def test_feature_extraction_mode_maps_negative_one_to_phishing(self):
        class _FakeFeatureModel:
            classes_ = np.array([-1, 1])
            n_features_in_ = 30

            def predict(self, features):
                return np.array([-1])

            def predict_proba(self, features):
                return np.array([[0.91, 0.09]])

        prepared_url = type(
            "PreparedUrlStub",
            (),
            {
                "normalized_url": "https://paypal.com/login",
                "heuristics": {"uses_https": True},
            },
        )()

        self.service._model = _FakeFeatureModel()
        self.service._vectorizer = None
        self.service._input_mode = "feature_extraction"
        self.service._extract_url_features = lambda prepared_url: np.zeros((1, 30))

        prediction = self.service.predict(prepared_url)

        self.assertEqual(prediction.api_result, "phishing")
        self.assertEqual(prediction.storage_result, "phishing")
        self.assertEqual(prediction.confidence, 0.91)
