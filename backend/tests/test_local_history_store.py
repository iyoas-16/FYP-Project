from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from services.local_history_store import LocalHistoryStore


class LocalHistoryStoreTestCase(unittest.TestCase):
    def test_save_and_fetch_history(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            store = LocalHistoryStore(str(Path(temp_dir) / "history.sqlite"))
            store.save_scan(
                user_id="user-123",
                user_email="user@example.com",
                url="https://example.com",
                result="phishing",
                confidence=0.9,
                created_at="2026-04-18T18:00:00+00:00",
            )

            history = store.fetch_history(user_id="user-123", limit=10, offset=0)

            self.assertEqual(history["total"], 1)
            self.assertEqual(history["items"][0]["url"], "https://example.com")
            self.assertEqual(history["items"][0]["result"], "phishing")
