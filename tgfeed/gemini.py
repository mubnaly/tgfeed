"""Gemini AI client for summarizing content with low token consumption."""

import logging
from typing import Optional

import httpx

from .config import Settings

log = logging.getLogger('tgfeed.gemini')

DEFAULT_SYSTEM_PROMPT = (
    "أنت مساعد ذكي لتلخيص المنشورات. لخص المنشور التالي بأسلوب مباشر ومفيد ودقيق باللغة العربية في سطرين إلى ثلاثة أسطر كحد أقصى، "
    "مركزاً على الفائدة الأساسية والمعلومات الجوهرية فقط، دون مقدمات أو ألقاب أو إشارات ترويجية."
)


async def summarize_text(
    text: str,
    api_key: str,
    model: str = "gemini-3.5-flash-lite",
    system_prompt: str = DEFAULT_SYSTEM_PROMPT,
    timeout: float = 15.0,
) -> str:
    """Summarize text using Google Gemini API with minimal token consumption."""
    if not api_key:
        raise ValueError("Gemini API key is not configured")
    cleaned_text = (text or "").strip()
    if not cleaned_text:
        raise ValueError("Text is empty")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {
                        "text": f"{system_prompt}\n\nالنص المراد تلخيصه:\n{cleaned_text[:4000]}"
                    }
                ]
            }
        ],
        "generationConfig": {
            "maxOutputTokens": 200,
            "temperature": 0.2,
        },
    }

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            log.error("Gemini API error %d: %s", resp.status_code, resp.text)
            raise RuntimeError(f"Gemini API returned error {resp.status_code}: {resp.text}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini returned no candidates")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise RuntimeError("Gemini returned empty content")

        summary = parts[0].get("text", "").strip()
        # Clean redundant prefixes if any
        if summary.startswith("ملخص:"):
            summary = summary[len("ملخص:"):].strip()
        return summary
