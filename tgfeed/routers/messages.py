"""Live message actions: engagement stats + republish to the user's own channel.

Split from ``preview.py`` (which shares the ``/api/messages`` prefix) because
everything here goes through TgManager's real-time Telethon calls, while
preview.py has no Telegram dependency.

Forwarding is **source-generic** since 2026-07-27: ``POST /api/forward`` takes an
item key like the rest of the read/hide/feedback family. The old TG-only path is
kept as a thin shell so iOS builds already on people's phones keep working when
the server upgrades ahead of the app.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from telememo import db as tdb
from telethon.errors import FloodWaitError, UnauthorizedError

from .. import db, forward, gemini
from ..auth import get_tg, require_auth
from ..config import Settings, get_settings
from ..items import ItemKey
from ..tg import MessageStats, TelegramMessageNotFound, TgManager
from ..types import ForwardItemBody, ForwardMessageBody
from .common import parse_key_or_422

router = APIRouter(prefix='/api', tags=['messages'], dependencies=[Depends(require_auth)])

_UNAUTHORIZED = HTTPException(status_code=503, detail='telegram not authorized')


def _require_authorized(tg: TgManager) -> None:
    if tg.service is None or not tg.service.is_authorized:
        raise _UNAUTHORIZED


def _flood(exc: FloodWaitError) -> HTTPException:
    return HTTPException(status_code=429, detail='rate limited by telegram', headers={'Retry-After': str(exc.seconds)})


async def _forward(tg: TgManager, key: ItemKey, comment: Optional[str]) -> dict:
    """The one forward path; both endpoints translate its failures identically."""
    _require_authorized(tg)
    try:
        return await tg.forward_item(key, comment)
    except LookupError:
        raise HTTPException(status_code=422, detail='forward target channel not configured')
    except forward.ItemNotFound:
        raise HTTPException(status_code=404, detail='item not found')
    except TelegramMessageNotFound:
        raise HTTPException(status_code=404, detail='message not found')
    except FloodWaitError as e:
        raise _flood(e)
    except UnauthorizedError:
        raise _UNAUTHORIZED


@router.get('/messages/{channel_id}/{message_id}/stats')
async def message_stats(channel_id: int, message_id: int, tg: TgManager = Depends(get_tg)) -> MessageStats:
    """Views / forwards / reactions, read live from Telegram (never cached or stored)."""
    _require_authorized(tg)
    try:
        return await tg.get_message_stats(channel_id, message_id)
    except TelegramMessageNotFound:
        raise HTTPException(status_code=404, detail='message not found')
    except FloodWaitError as e:
        raise _flood(e)
    except UnauthorizedError:
        raise _UNAUTHORIZED


@router.post('/forward')
async def forward_item(body: ForwardItemBody, tg: TgManager = Depends(get_tg)) -> dict:
    """Publish any item into ``app_meta.forward_channel`` (TG natively, others rendered)."""
    return await _forward(tg, parse_key_or_422(body.key), body.comment)


@router.post('/messages/{channel_id}/{message_id}/forward')
async def forward_message(
    channel_id: int, message_id: int, body: ForwardMessageBody, tg: TgManager = Depends(get_tg)
) -> dict:
    """Legacy TG-only shell over ``/api/forward`` (pre-2026-07-27 clients)."""
    return await _forward(tg, ItemKey(source='telegram', ref1=channel_id, ref2=message_id), body.comment)


class TelegramSummaryRequest(BaseModel):
    channel_id: int
    message_id: int
    text: Optional[str] = None


@router.get('/telegram/summary')
async def get_telegram_summary(channel_id: int, message_id: int) -> dict:
    """Retrieve cached summary for a Telegram message from the database."""
    cached = db.get_telegram_summary(channel_id, message_id)
    if cached:
        return {'summary': cached['summary'], 'model': cached['model'], 'cached': True}
    raise HTTPException(status_code=404, detail='summary not found')


@router.post('/telegram/summary')
async def summarize_telegram_message(
    body: TelegramSummaryRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get or generate an AI summary for a Telegram message and cache it in the database."""
    cached = db.get_telegram_summary(body.channel_id, body.message_id)
    if cached:
        return {'summary': cached['summary'], 'model': cached['model'], 'cached': True}

    text = body.text
    if not text:
        cur = tdb.db.execute_sql('SELECT text FROM messages WHERE channel_id = ? AND id = ?', (body.channel_id, body.message_id))
        row = cur.fetchone()
        if row and row[0]:
            text = row[0]

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail='Message has no text to summarize')

    api_key = settings.gemini_api_key
    model = settings.gemini_model or 'gemini-3.5-flash-lite'
    try:
        summary = await gemini.summarize_text(text=text, api_key=api_key, model=model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f'Gemini summary failed: {e}')

    db.save_telegram_summary(body.channel_id, body.message_id, summary, model=model)
    return {'summary': summary, 'model': model, 'cached': False}


class UniversalSummaryRequest(BaseModel):
    key: str
    title: Optional[str] = None
    text: Optional[str] = None


@router.get('/summary')
async def get_summary_endpoint(key: str) -> dict:
    """Retrieve cached summary for any item key from the database."""
    cached = db.get_post_summary(key)
    if cached:
        return {'key': key, 'summary': cached['summary'], 'model': cached.get('model'), 'cached': True}
    raise HTTPException(status_code=404, detail='summary not found')


@router.post('/summary')
async def summarize_item_endpoint(
    body: UniversalSummaryRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get or generate an AI summary for any timeline item and cache in database."""
    cached = db.get_post_summary(body.key)
    if cached:
        return {'key': body.key, 'summary': cached['summary'], 'model': cached.get('model'), 'cached': True}

    text_parts = []
    if body.title and body.title.strip():
        text_parts.append(body.title.strip())
    if body.text and body.text.strip():
        text_parts.append(body.text.strip())
    content = '\n\n'.join(text_parts).strip()

    if not content and body.key.startswith('tg:'):
        parts = body.key.split(':')
        if len(parts) == 3:
            cid, mid = int(parts[1]), int(parts[2])
            cur = tdb.db.execute_sql('SELECT text FROM messages WHERE channel_id = ? AND id = ?', (cid, mid))
            row = cur.fetchone()
            if row and row[0]:
                content = row[0]

    if not content or not content.strip():
        raise HTTPException(status_code=400, detail='Item has no text to summarize')

    api_key = settings.gemini_api_key
    model = settings.gemini_model or 'gemini-3.5-flash-lite'
    try:
        summary = await gemini.summarize_text(text=content, api_key=api_key, model=model)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f'Gemini summary failed: {e}')

    db.save_post_summary(body.key, summary, model=model)
    return {'key': body.key, 'summary': summary, 'model': model, 'cached': False}
