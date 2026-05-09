from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS

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

    @app.get("/")
    def index():
        return jsonify(
            {
                "status": "ok",
                "service": "phishing-detection-api",
                "version": app.config["MODEL_VERSION"],
            }
        )

    app.register_blueprint(api_blueprint)
    register_error_handlers(app)
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
