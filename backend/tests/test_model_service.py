from __future__ import annotations

import unittest

from app import create_app
from services.model_service import PhishingModelService
from utils.url_processing import prepare_url


class ModelServiceArtifactTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app({"TESTING": True})
        self.service = PhishingModelService(self.app.config)

    def test_service_loads_real_model_and_vectorizer_with_matching_feature_counts(self):
        self.service._ensure_loaded()

        self.assertEqual(type(self.service._model).__name__, "DecisionTreeClassifier")
        self.assertEqual(type(self.service._vectorizer).__name__, "CountVectorizer")
        self.assertEqual(
            self.service._model.n_features_in_,
            len(self.service._vectorizer.get_feature_names_out()),
        )
        self.assertEqual(self.service._model.classes_.tolist(), [0, 1])

    def test_real_artifact_can_produce_both_supported_labels(self):
        legit_prediction = self.service.predict(
            prepare_url("https://google.com", self.app.config["BRAND_KEYWORDS"])
        )
        phishing_prediction = self.service.predict(
            prepare_url(
                "https://palermo.libretyreserve.mu/php/habbotuttogratis",
                self.app.config["BRAND_KEYWORDS"],
            )
        )

        self.assertEqual(legit_prediction.api_result, "legit")
        self.assertEqual(legit_prediction.storage_result, "legitimate")
        self.assertEqual(phishing_prediction.api_result, "phishing")
        self.assertEqual(phishing_prediction.storage_result, "phishing")
        self.assertGreaterEqual(legit_prediction.confidence, 0.0)
        self.assertLessEqual(legit_prediction.confidence, 1.0)
        self.assertGreaterEqual(phishing_prediction.confidence, 0.0)
        self.assertLessEqual(phishing_prediction.confidence, 1.0)
