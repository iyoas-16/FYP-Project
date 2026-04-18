from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import jwt
from flask import current_app, request
from jwt import PyJWKClient

from utils.errors import AuthenticationError, AuthorizationError, ConfigurationError


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    email: str | None
    claims: dict
    is_admin: bool


@lru_cache(maxsize=4)
def _build_jwk_client(jwks_url: str) -> PyJWKClient:
    return PyJWKClient(jwks_url)


class SupabaseJWTVerifier:
    def __init__(self, config) -> None:
        self._config = config

    def require_user(self) -> AuthenticatedUser:
        auth_header = request.headers.get("Authorization", "").strip()
        if not auth_header.startswith("Bearer "):
            raise AuthenticationError("Missing Bearer token")

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            raise AuthenticationError("Missing Bearer token")

        claims = self._decode_token(token)
        user_id = claims.get("sub")
        if not user_id:
            raise AuthenticationError("Bearer token is missing subject claim")

        email = claims.get("email")
        return AuthenticatedUser(
            user_id=user_id,
            email=email,
            claims=claims,
            is_admin=self._is_admin(claims, email),
        )

    def require_admin(self) -> AuthenticatedUser:
        user = self.require_user()
        if not user.is_admin:
            raise AuthorizationError("Admin privileges are required")
        return user

    def _decode_token(self, token: str) -> dict:
        issuer = self._config["SUPABASE_ISSUER"] or None
        audience = self._config["SUPABASE_JWT_AUDIENCE"] or None
        verify_audience = audience is not None

        if self._config["SUPABASE_JWT_SECRET"]:
            return jwt.decode(
                token,
                self._config["SUPABASE_JWT_SECRET"],
                algorithms=self._config["SUPABASE_JWT_ALGORITHMS"],
                audience=audience,
                issuer=issuer,
                options={"verify_aud": verify_audience},
            )

        jwks_url = self._config["SUPABASE_JWKS_URL"]
        if not jwks_url:
            raise ConfigurationError("Supabase JWT verification is not configured")

        signing_key = _build_jwk_client(jwks_url).get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=self._config["SUPABASE_JWT_ALGORITHMS"],
            audience=audience,
            issuer=issuer,
            options={"verify_aud": verify_audience},
        )

    def _is_admin(self, claims: dict, email: str | None) -> bool:
        roles = {str(claims.get("role", "")).lower()}
        app_metadata = claims.get("app_metadata") or {}
        if isinstance(app_metadata, dict):
            roles.add(str(app_metadata.get("role", "")).lower())
            for entry in app_metadata.get("roles", []) or []:
                roles.add(str(entry).lower())

        return bool(roles & set(self._config["ADMIN_ROLES"])) or bool(
            email and email.lower() in set(self._config["ADMIN_EMAILS"])
        )


def get_jwt_verifier() -> SupabaseJWTVerifier:
    verifier = current_app.extensions.get("jwt_verifier")
    if verifier is None:
        raise ConfigurationError("JWT verifier is unavailable")
    return verifier
