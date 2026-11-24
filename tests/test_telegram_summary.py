"""Unit tests for Telegram message AI summarization and database caching."""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from tgfeed import db
from tgfeed.app import create_app
from tgfeed.config import Settings


@pytest.fixture
def client(tmp_path, monkeypatch):
    db_file = str(tmp_path / "test.db")
    monkeypatch.setenv("CONDENSER_DB_PATH", db_file)
    monkeypatch.setenv("CONDENSER_APP_PASSWORD", "testpass")
    monkeypatch.setenv("CONDENSER_SECRET_KEY", "testkey")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
    
    app = create_app()
    db.init_db(db_file)
    with TestClient(app) as c:
        # Authenticate
        c.post("/api/auth/login", json={"password": "testpass"})
        yield c


def test_telegram_summary_caching_and_api(client):
    channel_id = -1001999999
    message_id = 42
    
    # 1. Initially no summary
    res = client.get(f"/api/telegram/summary?channel_id={channel_id}&message_id={message_id}")
    assert res.status_code == 404

    # 2. Summarize via mock
    mock_summary_text = "هذا ملخص تجريبي للمنشور بواسطة الذكاء الاصطناعي."
    with patch("tgfeed.gemini.summarize_text", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = mock_summary_text

        res = client.post(
            "/api/telegram/summary",
            json={
                "channel_id": channel_id,
                "message_id": message_id,
                "text": "منشور طويل جداً يتحدث عن التكنولوجيا والذكاء الاصطناعي في العالم العربي.",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["summary"] == mock_summary_text
        assert data["cached"] is False
        assert mock_gemini.call_count == 1

        # 3. Requesting again MUST NOT call Gemini (0 tokens consumed, cached=True)
        res2 = client.post(
            "/api/telegram/summary",
            json={
                "channel_id": channel_id,
                "message_id": message_id,
                "text": "نفس المنشور",
            },
        )
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["summary"] == mock_summary_text
        assert data2["cached"] is True
        # Gemimi was NOT called again!
        assert mock_gemini.call_count == 1

    # 4. GET endpoint also returns the cached summary
    res3 = client.get(f"/api/telegram/summary?channel_id={channel_id}&message_id={message_id}")
    assert res3.status_code == 200
    assert res3.json()["summary"] == mock_summary_text
    assert res3.json()["cached"] is True
