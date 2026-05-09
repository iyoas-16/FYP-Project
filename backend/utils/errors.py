from __future__ import annotations

import logging

import requests
from flask import Flask, jsonify
from jwt import InvalidTokenError
from werkzeug.exceptions import HTTPException


class ApiError(Exception):
    def __init__(self, message: str, status_code: int = 400, error_code: str = "bad_request") -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class AuthenticationError(ApiError):
    def __init__(self, message: str = "Authentication required") -> None:
        super().__init__(message, status_code=401, error_code="authentication_error")


class AuthorizationError(ApiError):
    def __init__(self, message: str = "Not authorized") -> None:
        super().__init__(message, status_code=403, error_code="authorization_error")


class ConfigurationError(ApiError):
    def __init__(self, message: str = "Service is not configured") -> None:
        super().__init__(message, status_code=503, error_code="configuration_error")


class ValidationError(ApiError):
    def __init__(self, message: str) -> None:
        super().__init__(message, status_code=400, error_code="validation_error")


class UpstreamServiceError(ApiError):
    def __init__(self, message: str = "Upstream service request failed") -> None:
        super().__init__(message, status_code=502, error_code="upstream_service_error")


def register_error_handlers(app: Flask) -> None:
    logger = logging.getLogger(__name__)

    @app.errorhandler(ApiError)
    def handle_api_error(error: ApiError):
        return jsonify({"error": {"code": error.error_code, "message": error.message}}), error.status_code

    @app.errorhandler(InvalidTokenError)
    def handle_invalid_token(_: InvalidTokenError):
        error = AuthenticationError("Invalid bearer token")
        return jsonify({"error": {"code": error.error_code, "message": error.message}}), error.status_code

    @app.errorhandler(requests.RequestException)
    def handle_requests_error(error: requests.RequestException):
        logger.exception("External request failed", exc_info=error)
        wrapped = UpstreamServiceError(str(error))
        return jsonify({"error": {"code": wrapped.error_code, "message": wrapped.message}}), wrapped.status_code

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException):
        return (
            jsonify(
                {
                    "error": {
                        "code": error.name.lower().replace(" ", "_"),
                        "message": error.description,
                    }
                }
            ),
            error.code,
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception):
        logger.exception("Unhandled API error", exc_info=error)
        wrapped = ApiError(
            "An unexpected server error occurred",
            status_code=500,
            error_code="internal_server_error",
        )
        return jsonify({"error": {"code": wrapped.error_code, "message": wrapped.message}}), wrapped.status_code
