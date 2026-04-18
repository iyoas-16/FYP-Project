from __future__ import annotations

import unittest
import tempfile
from pathlib import Path

from services.local_history_store import LocalHistoryStore
from services.model_service import ModelPrediction
from services.scan_service import ScanService
from utils.auth import AuthenticatedUser
from utils.errors import UpstreamServiceError


class _FakeModelService:
    def predict(self, prepared_url):
        return ModelPrediction(
            storage_result="phishing",
            api_result="phishing",
            confidence=0.88,
            model_name="DecisionTreeClassifier",
            model_version="test-model",
            heuristics=prepared_url.heuristics,
        )


class _FailingScanService(ScanService):
    def _save_scan(self, user, prepared_url, prediction, *, created_at) -> None:
        raise UpstreamServiceError("save failed")


class ScanServiceTestCase(unittest.TestCase):
    def test_scan_returns_prediction_when_persistence_fails(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            service = _FailingScanService(
                {
                    "BRAND_KEYWORDS": {
                        "paypal": "PayPal",
                    }
                },
                _FakeModelService(),
                LocalHistoryStore(str(Path(temp_dir) / "history.sqlite")),
            )
            user = AuthenticatedUser(
                user_id="user-123",
                email="user@example.com",
                claims={"sub": "user-123"},
                is_admin=False,
                access_token="token",
            )

            result = service.scan_url(user, "https://paypal.com/login")
            history = service.get_history(user, limit=10, offset=0)

            self.assertEqual(result["result"], "phishing")
            self.assertEqual(result["confidence"], 0.88)
            self.assertIn("warning", result)
            self.assertEqual(history["total"], 1)
            self.assertEqual(history["items"][0]["url"], "https://paypal.com/login")
