from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")
load_dotenv(_BACKEND_DIR.parent / ".env", override=False)


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_list(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip().lower() for item in value.split(",") if item.strip()]


def _resolve_path(base_dir: Path, value: str) -> str:
    path = Path(value)
    return str(path if path.is_absolute() else base_dir / path)


class Settings:
    BASE_DIR = _BACKEND_DIR
    INSTANCE_DIR = BASE_DIR / "instance"
    TESTING = _as_bool(os.getenv("TESTING"))
    DEBUG = _as_bool(os.getenv("FLASK_DEBUG"))
    JSON_SORT_KEYS = False
    PROPAGATE_EXCEPTIONS = False

    MODEL_PATH = _resolve_path(BASE_DIR, os.getenv("MODEL_PATH", "model.pkl"))
    VECTORIZER_PATH = _resolve_path(BASE_DIR, os.getenv("VECTORIZER_PATH", "vectorizer.pkl"))
    MODEL_VERSION = os.getenv("MODEL_VERSION", "decision-tree-v1")

    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    SUPABASE_SCANS_TABLE = os.getenv("SUPABASE_SCANS_TABLE", "scans")
    SUPABASE_TIMEOUT_SECONDS = int(os.getenv("SUPABASE_TIMEOUT_SECONDS", "10"))
    ADMIN_ANALYTICS_FETCH_LIMIT = int(os.getenv("ADMIN_ANALYTICS_FETCH_LIMIT", "5000"))
    LOCAL_HISTORY_DB_PATH = _resolve_path(BASE_DIR, os.getenv("LOCAL_HISTORY_DB_PATH", "instance/scan_history.sqlite"))
    CORS_ALLOWED_ORIGINS = _as_list(
        os.getenv(
            "CORS_ALLOWED_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080",
        )
    )

    SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL", "")
    SUPABASE_JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
    SUPABASE_ISSUER = os.getenv("SUPABASE_ISSUER", "")
    SUPABASE_JWT_ALGORITHMS = _as_list(os.getenv("SUPABASE_JWT_ALGORITHMS")) or ["RS256"]

    ADMIN_ROLES = _as_list(os.getenv("ADMIN_ROLES", "admin,service_role"))
    ADMIN_EMAILS = _as_list(os.getenv("ADMIN_EMAILS"))

    BRAND_KEYWORDS = {
        "facebook": "Facebook",
        "paypal": "PayPal",
        "microsoft": "Microsoft",
        "google": "Google",
        "apple": "Apple",
        "steam": "Steam",
        "amazon": "Amazon",
        "mastercard": "Mastercard",
        "americanexpress": "American Express",
        "amex": "American Express",
        "irs": "Internal Revenue Service",
        "ebay": "eBay, Inc.",
        "orange": "Orange",
    }
