from __future__ import annotations

import unittest

from app import create_app
from services.model_service import ModelPrediction
from utils.auth import AuthenticatedUser
from utils.errors import AuthorizationError, ValidationError


class FakeVerifier:
    def __init__(self, user: AuthenticatedUser) -> None:
        self._user = user

    def require_user(self) -> AuthenticatedUser:
        return self._user

    def require_admin(self) -> AuthenticatedUser:
        if not self._user.is_admin:
            raise AuthorizationError("admin only")
        return self._user


class FakeModelService:
    def predict(self, prepared_url):
        return ModelPrediction(
            storage_result="phishing",
            api_result="phishing",
            confidence=0.91,
            model_name="DecisionTreeClassifier",
            model_version="test-model",
            heuristics=prepared_url.heuristics,
        )


class FakeScanService:
    def __init__(self) -> None:
        self.saved_payloads = []

    def scan_url(self, user, raw_url):
        if str(raw_url).startswith("ftp://"):
            raise ValidationError("Only http and https URLs are supported")
        self.saved_payloads.append({"user_id": user.user_id, "url": raw_url})
        return {"result": "phishing", "confidence": 0.91}

    def get_history(self, user, limit, offset, **kwargs):
        return {
            "items": [
                {
                    "id": "scan-1",
                    "user_id": user.user_id,
                    "result": "phishing",
                    "confidence": 0.91,
                    "created_at": "2025-01-01T00:00:00+00:00",
                    "limit_seen": limit,
                    "offset_seen": offset,
                    "received_filters": kwargs,
                }
            ],
            "total": 1,
            "pagination": {"limit": limit, "offset": offset},
        }

    def get_admin_stats(self, *, range_value):
        return {
            "overview": {
                "total_scans": 10,
                "phishing_count": 4,
                "legit_count": 6,
                "unique_users": 3,
                "avg_confidence": 0.74,
            },
            "activity": [],
            "top_risky_urls": [],
            "recent_scans": [],
        }

    def user_is_admin(self, user_id):
        return False


class ApiTestCase(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app({"TESTING": True})
        self.client = self.app.test_client()

    def _inject_services(self, *, is_admin: bool = False) -> FakeScanService:
        with self.app.app_context():
            user = AuthenticatedUser(
                user_id="user-123",
                email="admin@example.com" if is_admin else "user@example.com",
                claims={"sub": "user-123"},
                is_admin=is_admin,
            )
            self.app.extensions["jwt_verifier"] = FakeVerifier(user)
            scan_service = FakeScanService()
            self.app.extensions["scan_service"] = scan_service
            return scan_service

    def test_scan_endpoint_returns_prediction(self):
        scan_service = self._inject_services()

        response = self.client.post(
            "/scan",
            json={"url": "paypal.com/login"},
            headers={"Authorization": "Bearer token"},
        )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["result"], "phishing")
        self.assertEqual(payload["confidence"], 0.91)
        self.assertEqual(len(scan_service.saved_payloads), 1)

    def test_scan_endpoint_validates_input(self):
        self._inject_services()
        response = self.client.post(
            "/scan",
            json={"url": "ftp://example.com"},
            headers={"Authorization": "Bearer token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.get_json()["error"]["code"], "validation_error"
        )

    def test_history_endpoint_returns_records(self):
        self._inject_services()

        response = self.client.get(
            "/history?limit=5&offset=0",
            headers={"Authorization": "Bearer token"},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["pagination"]["limit"], 5)
        self.assertEqual(payload["items"][0]["user_id"], "user-123")

    def test_admin_stats_requires_admin(self):
        self._inject_services(is_admin=False)
        response = self.client.get(
            "/admin/stats", headers={"Authorization": "Bearer token"}
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_stats_returns_stats_for_admin(self):
        self._inject_services(is_admin=True)
        response = self.client.get(
            "/admin/stats?range=7d", headers={"Authorization": "Bearer token"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["overview"]["total_scans"], 10)
