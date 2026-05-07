from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

import joblib
import pandas as pd

from app import create_app
from ml.training import train_and_export_model
from services.model_service import PhishingModelService
from utils.url_processing import prepare_url


class MlTrainingPipelineTestCase(unittest.TestCase):
    def test_training_pipeline_exports_bundle_and_model_service_can_use_it(self):
        dataset = pd.DataFrame(
            {
                "url": [
                    "https://google.com",
                    "https://github.com",
                    "https://openai.com",
                    "https://chatgpt.com",
                    "https://youtube.com",
                    "https://paypal.com",
                    "https://secure-paypal-login.com",
                    "https://account-google-alert.net",
                    "https://github-auth-check.com",
                    "https://microsoft-verify-login.com",
                    "https://appleid-secure-login.net",
                    "https://free-crypto-airdrop.xyz/claim",
                ],
                "label": [
                    0,
                    0,
                    0,
                    0,
                    0,
                    0,
                    1,
                    1,
                    1,
                    1,
                    1,
                    1,
                ],
            }
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            dataset_path = Path(temp_dir) / "dataset.csv"
            output_path = Path(temp_dir) / "phishing_model.pkl"
            vectorizer_path = Path(temp_dir) / "missing-vectorizer.pkl"
            dataset.to_csv(dataset_path, index=False)

            artifacts = train_and_export_model(dataset_path, output_path)
            self.assertTrue(output_path.exists())
            self.assertIn(artifacts.best_model_name, {"gradient_boosting", "logistic_regression", "random_forest", "xgboost"})

            exported = joblib.load(output_path)
            self.assertEqual(exported["artifact_type"], "phishing_model_bundle")
            self.assertIn("metrics", exported)
            self.assertIn("feature_names", exported)

            app = create_app(
                {
                    "TESTING": True,
                    "MODEL_PATH": str(output_path),
                    "VECTORIZER_PATH": str(vectorizer_path),
                }
            )
            service = PhishingModelService(app.config)

            legit_prediction = service.predict(prepare_url("https://google.com", app.config["BRAND_KEYWORDS"]))
            phishing_prediction = service.predict(
                prepare_url("https://secure-paypal-login.com", app.config["BRAND_KEYWORDS"])
            )

            self.assertEqual(legit_prediction.api_result, "legit")
            self.assertEqual(phishing_prediction.api_result, "phishing")
