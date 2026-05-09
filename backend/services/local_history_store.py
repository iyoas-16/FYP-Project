from __future__ import annotations

import sqlite3
import uuid
from contextlib import closing
from pathlib import Path


class LocalHistoryStore:
    def __init__(self, database_path: str) -> None:
        self._database_path = Path(database_path)
        self._database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def save_scan(
        self,
        *,
        user_id: str,
        user_email: str | None,
        url: str,
        result: str,
        confidence: float,
        created_at: str,
    ) -> dict:
        record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": user_email,
            "url": url,
            "result": result,
            "confidence": confidence,
            "created_at": created_at,
        }
        with closing(sqlite3.connect(self._database_path)) as connection:
            connection.execute(
                """
                INSERT INTO scans (id, user_id, user_email, url, result, confidence, created_at)
                VALUES (:id, :user_id, :user_email, :url, :result, :confidence, :created_at)
                """,
                record,
            )
            connection.commit()
        return record

    def fetch_history(
        self,
        *,
        user_id: str,
        limit: int,
        offset: int,
        search: str = "",
        result: str | None = None,
        sort: str = "newest",
    ) -> dict:
        where_clauses = ["user_id = ?"]
        parameters: list[object] = [user_id]

        if result:
            where_clauses.append("result = ?")
            parameters.append(result)
        if search:
            where_clauses.append("LOWER(url) LIKE ?")
            parameters.append(f"%{search.lower()}%")

        where_sql = " AND ".join(where_clauses)
        order_sql = {
            "oldest": "created_at ASC",
            "confidence_desc": "confidence DESC, created_at DESC",
            "confidence_asc": "confidence ASC, created_at DESC",
        }.get(sort, "created_at DESC")

        with closing(sqlite3.connect(self._database_path)) as connection:
            connection.row_factory = sqlite3.Row
            total = connection.execute(
                f"SELECT COUNT(*) FROM scans WHERE {where_sql}",
                parameters,
            ).fetchone()[0]
            rows = connection.execute(
                f"""
                SELECT id, user_id, user_email, url, result, confidence, created_at
                FROM scans
                WHERE {where_sql}
                ORDER BY {order_sql}
                LIMIT ? OFFSET ?
                """,
                [*parameters, limit, offset],
            ).fetchall()

        return {
            "items": [dict(row) for row in rows],
            "total": total,
            "pagination": {"limit": limit, "offset": offset},
        }

    def _initialize(self) -> None:
        with closing(sqlite3.connect(self._database_path)) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS scans (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    user_email TEXT,
                    url TEXT NOT NULL,
                    result TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            connection.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_scans_user_created_at
                ON scans(user_id, created_at DESC)
                """
            )
            connection.commit()
