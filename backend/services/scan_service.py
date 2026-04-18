from __future__ import annotations

from collections import defaultdict
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

import requests

from services.model_service import ModelPrediction, PhishingModelService
from utils.auth import AuthenticatedUser
from utils.errors import ConfigurationError, UpstreamServiceError
from utils.url_processing import PreparedUrl, prepare_url


class ScanService:
    def __init__(self, config, model_service: PhishingModelService) -> None:
        self._config = config
        self._model_service = model_service

    def scan_url(self, user: AuthenticatedUser, raw_url: str) -> dict:
        prepared_url = prepare_url(raw_url, self._config["BRAND_KEYWORDS"])
        prediction = self._model_service.predict(prepared_url)
        self._save_scan(user, prepared_url, prediction)
        return {
            "result": prediction.api_result,
            "confidence": prediction.confidence,
        }

    def get_history(
        self,
        user: AuthenticatedUser,
        *,
        limit: int,
        offset: int,
        search: str = "",
        result: str | None = None,
        sort: str = "newest",
    ) -> dict:
        filters = {"user_id": f"eq.{user.user_id}"}
        if result:
            filters["result"] = f"eq.{self._to_storage_result(result)}"
        if search:
            filters["url"] = f"ilike.*{quote(search)}*"

        total = self._count_records(filters)
        response = self._request(
            "GET",
            f"/rest/v1/{self._config['SUPABASE_SCANS_TABLE']}",
            params=self._build_history_params(filters, limit, offset, sort),
        )
        items = response if isinstance(response, list) else []
        return {
            "items": [self._serialize_history_item(item) for item in items],
            "total": total,
            "pagination": {"limit": limit, "offset": offset},
        }

    def get_admin_stats(self, *, range_value: str = "30d") -> dict:
        now = datetime.now(UTC)
        start = now - {"7d": timedelta(days=7), "30d": timedelta(days=30), "90d": timedelta(days=90)}[
            range_value
        ]
        recent_rows = self._request(
            "GET",
            f"/rest/v1/{self._config['SUPABASE_SCANS_TABLE']}",
            params={
                "select": "id,user_id,email,url,result,confidence_score,created_at",
                "created_at": f"gte.{start.isoformat()}",
                "order": "created_at.desc",
                "limit": str(self._config["ADMIN_ANALYTICS_FETCH_LIMIT"]),
            },
        )
        rows = recent_rows if isinstance(recent_rows, list) else []
        serialized_rows = [self._serialize_history_item(row) for row in rows]
        range_filter = {"created_at": f"gte.{start.isoformat()}"}
        phishing_count = self._count_records({**range_filter, "result": "eq.phishing"})
        legit_count = self._count_records({**range_filter, "result": "eq.legitimate"})

        activity = defaultdict(lambda: {"total": 0, "phishing": 0, "legit": 0})
        top_urls: dict[str, dict] = {}
        for row in serialized_rows:
            created_at = row.get("created_at")
            if created_at:
                day_key = created_at[:10]
                activity[day_key]["total"] += 1
                activity[day_key][row["result"]] += 1
            if row["result"] == "phishing":
                current = top_urls.setdefault(
                    row["url"],
                    {"url": row["url"], "count": 0, "result": "phishing", "last_seen": created_at},
                )
                current["count"] += 1
                if created_at and (not current["last_seen"] or created_at > current["last_seen"]):
                    current["last_seen"] = created_at

        confidence_values = [
            float(row["confidence"])
            for row in serialized_rows
            if isinstance(row.get("confidence"), (int, float))
        ]

        return {
            "overview": {
                "total_scans": self._count_records(range_filter),
                "phishing_count": phishing_count,
                "legit_count": legit_count,
                "unique_users": len({row["user_id"] for row in serialized_rows if row.get("user_id")}),
                "avg_confidence": round(sum(confidence_values) / len(confidence_values), 4)
                if confidence_values
                else 0,
            },
            "activity": [
                {"date": date, **values}
                for date, values in sorted(activity.items(), key=lambda item: item[0])
            ],
            "top_risky_urls": sorted(top_urls.values(), key=lambda item: (-item["count"], item["url"]))[:10],
            "recent_scans": serialized_rows[:20],
        }

    def user_is_admin(self, user_id: str) -> bool:
        response = self._request(
            "GET",
            "/rest/v1/user_roles",
            params={"select": "role", "user_id": f"eq.{user_id}", "role": "eq.admin", "limit": "1"},
        )
        return bool(response)

    def _save_scan(self, user: AuthenticatedUser, prepared_url: PreparedUrl, prediction: ModelPrediction) -> None:
        payload = {
            "user_id": user.user_id,
            "email": user.email,
            "url": prepared_url.original_url,
            "normalized_url": prepared_url.normalized_url,
            "hostname": prepared_url.hostname,
            "inferred_target": prepared_url.inferred_target,
            "result": prediction.storage_result,
            "confidence_score": prediction.confidence,
            "detection_method": "ml",
            "details": {
                "hostname": prepared_url.hostname,
                "heuristics": prediction.heuristics,
                "model": {
                    "name": prediction.model_name,
                    "version": prediction.model_version,
                },
            },
            "model_name": prediction.model_name,
            "model_version": prediction.model_version,
            "metadata": {},
            "created_at": datetime.now(UTC).isoformat(),
        }
        response = self._request(
            "POST",
            f"/rest/v1/{self._config['SUPABASE_SCANS_TABLE']}",
            json=payload,
            headers={"Prefer": "return=minimal"},
        )
        if response not in ({}, None):
            return

    def _count_records(self, extra_filters: Mapping[str, str] | None = None) -> int:
        params = {"select": "id", "limit": "1"}
        if extra_filters:
            params.update(extra_filters)
        response = self._request(
            "GET",
            f"/rest/v1/{self._config['SUPABASE_SCANS_TABLE']}",
            params=params,
            headers={"Prefer": "count=exact"},
            return_response=True,
        )
        content_range = response.headers.get("Content-Range", "*/0")
        try:
            return int(content_range.split("/")[-1])
        except ValueError as exc:
            raise UpstreamServiceError("Supabase count response was malformed") from exc

    def _build_history_params(self, filters: dict[str, str], limit: int, offset: int, sort: str) -> dict:
        order = {
            "oldest": "created_at.asc",
            "confidence_desc": "confidence_score.desc",
            "confidence_asc": "confidence_score.asc",
        }.get(sort, "created_at.desc")
        params = {
            "select": "id,user_id,email,url,result,confidence_score,created_at",
            "limit": str(limit),
            "offset": str(offset),
            "order": order,
        }
        params.update(filters)
        return params

    def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        json: dict | None = None,
        headers: dict | None = None,
        return_response: bool = False,
    ):
        self._ensure_configured()
        merged_headers = {
            "apikey": self._config["SUPABASE_SERVICE_ROLE_KEY"],
            "Authorization": f"Bearer {self._config['SUPABASE_SERVICE_ROLE_KEY']}",
            "Content-Type": "application/json",
        }
        if headers:
            merged_headers.update(headers)

        response = requests.request(
            method=method,
            url=f"{self._config['SUPABASE_URL']}{path}",
            params=params,
            json=json,
            headers=merged_headers,
            timeout=self._config["SUPABASE_TIMEOUT_SECONDS"],
        )
        if response.status_code >= 400:
            raise UpstreamServiceError(
                f"Supabase request failed with status {response.status_code}: {response.text}"
            )
        if return_response:
            return response
        if not response.content:
            return {}
        return response.json()

    def _ensure_configured(self) -> None:
        if not self._config["SUPABASE_URL"] or not self._config["SUPABASE_SERVICE_ROLE_KEY"]:
            raise ConfigurationError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured")

    @staticmethod
    def _to_api_result(storage_result: str | None) -> str:
        return "phishing" if storage_result == "phishing" else "legit"

    @staticmethod
    def _to_storage_result(api_result: str) -> str:
        return "phishing" if api_result == "phishing" else "legitimate"

    def _serialize_history_item(self, record: dict) -> dict:
        return {
            "id": record.get("id"),
            "user_id": record.get("user_id"),
            "user_email": record.get("email"),
            "url": record.get("url", ""),
            "result": self._to_api_result(record.get("result")),
            "confidence": record.get("confidence_score") if record.get("confidence_score") is not None else 0,
            "created_at": record.get("created_at"),
        }
