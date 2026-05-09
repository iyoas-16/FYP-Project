from __future__ import annotations

<<<<<<< HEAD
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env before importing Settings
_BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(_BACKEND_DIR / ".env", override=True)
load_dotenv(_BACKEND_DIR.parent / ".env", override=False)

=======
from flask import Flask, jsonify, request
from flask_cors import CORS

>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
from config import Settings
from routes import api_blueprint
from services import AuthService, LocalHistoryStore, PhishingModelService, ScanService
from utils import SupabaseJWTVerifier, register_error_handlers


def create_app(test_config: dict | None = None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(Settings())

    if test_config:
        app.config.from_mapping(test_config)
    if not app.config.get("SUPABASE_JWKS_URL") and app.config.get("SUPABASE_URL"):
        app.config["SUPABASE_JWKS_URL"] = f"{app.config['SUPABASE_URL']}/auth/v1/.well-known/jwks.json"
    if not app.config.get("SUPABASE_ISSUER") and app.config.get("SUPABASE_URL"):
        app.config["SUPABASE_ISSUER"] = f"{app.config['SUPABASE_URL']}/auth/v1"

    model_service = PhishingModelService(app.config)
    local_history_store = LocalHistoryStore(app.config["LOCAL_HISTORY_DB_PATH"])
    app.extensions["auth_service"] = AuthService(app.config)
    app.extensions["jwt_verifier"] = SupabaseJWTVerifier(app.config)
    app.extensions["scan_service"] = ScanService(app.config, model_service, local_history_store)

    CORS(
        app,
        resources={r"/*": {"origins": app.config["CORS_ALLOWED_ORIGINS"] or "*"}},
        supports_credentials=True,
        allow_headers=["Authorization", "Content-Type"],
        methods=["GET", "POST", "OPTIONS"],
    )

<<<<<<< HEAD
=======
    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin")
        allowed_origins = app.config["CORS_ALLOWED_ORIGINS"] or []

        if origin and (allowed_origins == "*" or origin.lower() in allowed_origins):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"

        return response

>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
    @app.get("/")
    def index():
        return jsonify(
            {
                "status": "ok",
                "service": "phishing-detection-api",
                "version": app.config["MODEL_VERSION"],
            }
        )

<<<<<<< HEAD
    @app.get("/debug/config")
    def debug_config():
        """Debug endpoint to check configuration"""
        return jsonify(
            {
                "supabase_url": app.config.get("SUPABASE_URL"),
                "service_role_key_exists": bool(app.config.get("SUPABASE_SERVICE_ROLE_KEY")),
                "service_role_key_length": len(app.config.get("SUPABASE_SERVICE_ROLE_KEY", "")),
            }
        )

=======
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
    app.register_blueprint(api_blueprint)
    register_error_handlers(app)
    return app


app = create_app()

<<<<<<< HEAD

=======
>>>>>>> 0f6a9ea79a9cdd0c272e30d1a1fa0eb68e64c786
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
