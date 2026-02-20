"""
DimensionService — fetches a product page and uses Gemini to extract dimensions.

Separated into its own file so it can be swapped out or extended independently
(e.g. replace with a dedicated scraping API, use product schema markup, etc.).
"""

import os
import re
import json
import asyncio

import httpx
from google import genai
from google.genai import types


# ── HTML helpers ──────────────────────────────────────────────────────────────

def _strip_html(html: str) -> str:
    """Remove script/style blocks and HTML tags, collapse whitespace."""
    html = re.sub(r'<(script|style)[^>]*>.*?</(script|style)>', ' ', html,
                  flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r'<[^>]+>', ' ', html)
    html = re.sub(r'\s+', ' ', html)
    return html.strip()


def _extract_relevant_text(page_text: str, max_chars: int = 5000) -> str:
    """
    Heuristic: dimension info tends to appear near keywords.
    We grab the surrounding context to keep the Gemini prompt small.
    """
    keywords = ['dimension', 'width', 'depth', 'height', 'length',
                'size', 'measurement', 'specification', 'spec', 'inches', '"', 'cm']
    text_lower = page_text.lower()
    best_start = 0
    best_score = 0
    window = 2000

    for i in range(0, len(page_text) - window, 300):
        chunk = text_lower[i: i + window]
        score = sum(chunk.count(kw) for kw in keywords)
        if score > best_score:
            best_score = score
            best_start = i

    relevant = page_text[best_start: best_start + window]
    # Also prepend the very beginning (product title / intro)
    intro = page_text[:800]
    combined = intro + ' ... ' + relevant
    return combined[:max_chars]


DIMENSION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "width":  {"type": "NUMBER"},
        "depth":  {"type": "NUMBER"},
        "height": {"type": "NUMBER"},
    },
}

DIMENSION_PROMPT = """\
You are a data extraction assistant. Extract the physical dimensions of the \
furniture product from the page text below.

Product title: {title}

Page text:
{text}

Rules:
- Return width, depth (front-to-back), and height in INCHES.
- If the page lists dimensions in centimetres, convert: 1 cm = 0.394 inches.
- If the page lists dimensions as W × D × H or similar, map them correctly.
- If a dimension is missing or unclear, return 0 for that field.
- Do NOT guess; only extract what is explicitly stated.

Return ONLY a JSON object: {{"width": <number>, "depth": <number>, "height": <number>}}
"""


class DimensionService:
    """Fetches product dimensions by scraping the product URL and querying Gemini."""

    def __init__(self) -> None:
        self._client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        self._config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DIMENSION_SCHEMA,
        )

    async def fetch_dimensions(
        self, url: str, product_title: str
    ) -> dict[str, float] | None:
        """
        Scrape the product URL and ask Gemini to extract width/depth/height in inches.
        Returns a dict with keys 'width', 'depth', 'height' (all in inches),
        or None if dimensions could not be found.
        """
        if not url or url.strip() in ('#', ''):
            return None

        # ── Fetch the page ─────────────────────────────────────────────────────
        try:
            async with httpx.AsyncClient(
                timeout=12.0,
                follow_redirects=True,
                headers={
                    'User-Agent': (
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                        'AppleWebKit/537.36 (KHTML, like Gecko) '
                        'Chrome/120.0.0.0 Safari/537.36'
                    ),
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
            ) as client:
                resp = await client.get(url)
                raw_text = _strip_html(resp.text)
        except Exception:
            return None

        if not raw_text:
            return None

        # ── Build prompt ───────────────────────────────────────────────────────
        context = _extract_relevant_text(raw_text)
        prompt  = DIMENSION_PROMPT.format(title=product_title, text=context)

        # ── Ask Gemini ─────────────────────────────────────────────────────────
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model="gemini-2.0-flash",
                contents=prompt,
                config=self._config,
            )
            data: dict = json.loads(response.text)
        except Exception:
            return None

        w = data.get('width',  0) or 0
        d = data.get('depth',  0) or 0
        h = data.get('height', 0) or 0

        # Return None if Gemini found nothing meaningful
        if w <= 0 or d <= 0 or h <= 0:
            return None

        return {'width': float(w), 'depth': float(d), 'height': float(h)}
