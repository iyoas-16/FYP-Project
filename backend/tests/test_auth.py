from __future__ import annotations

import unittest
from unittest.mock import Mock, patch

from jwt.exceptions import PyJWKClientError

from utils.auth import SupabaseJWTVerifier


class SupabaseJWTVerifierTestCase(unittest.TestCase):
    @patch("utils.auth.requests.get")
    @patch("utils.auth._build_jwk_client")
    def test_falls_back_to_supabase_user_lookup_when_jwks_key_is_missing(
        self, mock_build_jwk_client, mock_requests_get
    ):
        mock_build_jwk_client.return_value.get_signing_key_from_jwt.side_effect = (
            PyJWKClientError("missing key")
        )
        mock_requests_get.return_value = Mock(
            status_code=200,
            json=Mock(
                return_value={
                    "id": "user-123",
                    "email": "admin@example.com",
                    "role": "authenticated",
                    "app_metadata": {"role": "admin", "roles": ["admin"]},
                    "user_metadata": {"email_verified": True},
                }
            ),
        )
        verifier = SupabaseJWTVerifier(
            {
                "SUPABASE_URL": "https://example.supabase.co",
                "SUPABASE_PUBLISHABLE_KEY": "publishable-key",
                "SUPABASE_JWKS_URL": "https://example.supabase.co/auth/v1/.well-known/jwks.json",
                "SUPABASE_JWT_SECRET": "",
                "SUPABASE_JWT_AUDIENCE": "authenticated",
                "SUPABASE_ISSUER": "https://example.supabase.co/auth/v1",
                "SUPABASE_JWT_ALGORITHMS": ["RS256"],
                "ADMIN_ROLES": ["admin", "service_role"],
                "ADMIN_EMAILS": [],
            }
        )

        claims = verifier._decode_token("jwt-token")

        self.assertEqual(claims["sub"], "user-123")
        self.assertEqual(claims["email"], "admin@example.com")
        self.assertEqual(claims["app_metadata"]["role"], "admin")
