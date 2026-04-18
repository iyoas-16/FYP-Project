from __future__ import annotations

from collections.abc import Mapping

import requests

from utils.errors import ConfigurationError, UpstreamServiceError, ValidationError


class AuthService:
    def __init__(self, config) -> None:
        self._config = config

    def sign_up(self, *, email: str, password: str) -> dict:
        normalized_email = email.strip().lower()
        if not normalized_email:
            raise ValidationError("Email is required")
        if "@" not in normalized_email:
            raise ValidationError("Enter a valid email address")
        if len(password) < 6:
            raise ValidationError("Password must be at least 6 characters")

        response = requests.post(
            f"{self._supabase_url}/auth/v1/admin/users",
            json={
                "email": normalized_email,
                "password": password,
                "email_confirm": True,
                "app_metadata": {"role": "user", "roles": ["user"]},
            },
            headers={
                "apikey": self._service_role_key,
                "Authorization": f"Bearer {self._service_role_key}",
                "Content-Type": "application/json",
            },
            timeout=self._config["SUPABASE_TIMEOUT_SECONDS"],
        )

        if response.status_code >= 500:
            raise UpstreamServiceError(
                f"Supabase signup request failed with status {response.status_code}: {response.text}"
            )

        if response.status_code >= 400:
            raise ValidationError(self._extract_error_message(response))

        payload = response.json() if response.content else {}
        return {
            "user": {
                "id": payload.get("id"),
                "email": payload.get("email"),
            }
        }

    @property
    def _supabase_url(self) -> str:
        url = self._config.get("SUPABASE_URL", "")
        if not url:
            raise ConfigurationError("SUPABASE_URL must be configured")
        return url

    @property
    def _service_role_key(self) -> str:
        service_role_key = self._config.get("SUPABASE_SERVICE_ROLE_KEY", "")
        if not service_role_key:
            raise ConfigurationError("SUPABASE_SERVICE_ROLE_KEY must be configured for signup")
        return service_role_key

    @staticmethod
    def _extract_error_message(response: requests.Response) -> str:
        try:
            payload = response.json()
        except ValueError:
            payload = {}

        if isinstance(payload, Mapping):
            for key in ("msg", "message", "error_description", "error"):
                value = payload.get(key)
                if isinstance(value, str) and value.strip():
                    return value

        text = response.text.strip()
        if text:
            return text

        return "Unable to create account"
