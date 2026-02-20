"""
Real product search via SerpAPI Google Shopping.
Falls back to an empty list (with a warning) if the API is unavailable.
"""

import os
import asyncio
import hashlib
from models.schemas import Product

# ── Category keyword matching ─────────────────────────────────────────────────

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "sofa":             ["sofa", "couch", "sectional", "loveseat", "chesterfield"],
    "dining table":     ["dining table", "kitchen table", "dinner table"],
    "chair":            ["chair", "armchair", "recliner", "accent chair", "accent seat"],
    "bed":              ["bed frame", "bedframe", "platform bed", "headboard", "bed base"],
    "bookshelf":        ["bookshelf", "bookcase", "shelving unit", "shelf"],
    "dresser":          ["dresser", "chest of drawers", "drawer chest"],
    "coffee table":     ["coffee table"],
    "side table":       ["side table", "end table", "nightstand", "bedside table"],
    "desk":             ["desk", "workstation", "writing desk"],
    "tv stand":         ["tv stand", "tv console", "media console", "entertainment center", "media unit"],
    "floor lamp":       ["floor lamp", "torchiere"],
    "rug":              ["rug", "area rug", "carpet runner"],
    "outdoor furniture":["outdoor", "patio", "garden chair", "garden table"],
    "wardrobe":         ["wardrobe", "closet", "armoire"],
    "bench":            ["bench", "ottoman", "footstool"],
}


def _guess_category(title: str) -> str:
    t = title.lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in t for kw in keywords):
            return cat
    return "furniture"


def _make_id(r: dict) -> str:
    raw = r.get("product_id") or f"{r.get('title','')}{r.get('source','')}"
    return "SRP-" + hashlib.md5(raw.encode()).hexdigest()[:10]


def _parse_price(r: dict) -> float:
    """Return extracted_price; fall back to parsing the price string."""
    ep = r.get("extracted_price")
    if ep:
        return float(ep)
    price_str = r.get("price", "0")
    # handle ranges like "$499.00 - $799.00" → take the lower
    cleaned = price_str.split("–")[0].split("-")[0]
    cleaned = "".join(c for c in cleaned if c.isdigit() or c == ".")
    try:
        return float(cleaned) if cleaned else 0.0
    except ValueError:
        return 0.0


def _build_description(r: dict) -> str:
    snippet = r.get("snippet", "")
    extensions: list[str] = r.get("extensions") or []
    parts = [p for p in [snippet] + extensions if p]
    return " · ".join(parts[:4]) if parts else r.get("title", "")


def _map_product(r: dict) -> Product:
    title = r.get("title", "")
    description = _build_description(r)
    short_description = description[:120] if description else title[:80]
    price = _parse_price(r)
    thumbnail = r.get("thumbnail") or "https://placehold.co/400x300/e2e8f0/94a3b8?text=No+Image"

    return Product(
        id=_make_id(r),
        title=title,
        description=description or title,
        short_description=short_description,
        price=price,
        currency="USD",
        seller=r.get("source") or "Unknown Seller",
        rating=float(r.get("rating") or 0.0),
        review_count=int(r.get("reviews") or 0),
        category=_guess_category(title),
        style="",
        images=[thumbnail],
        dimensions=None,
        colors=[],
        in_stock=True,
        url=r.get("product_link") or r.get("link") or "#",
        tags=[],
    )


import logging
import json

# ── Configure Logger ──────────────────────────────────────────────────────────
logging.basicConfig(
    filename='product_search.log',
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

CACHE_FILE = "search_cache.json"

# ── Service ───────────────────────────────────────────────────────────────────

class ProductService:
    def __init__(self):
        self._api_key = os.environ.get("SERPAPI_KEY", "")
        self._cache = self._load_cache()

    def _load_cache(self) -> dict:
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load cache: {e}")
        return {}

    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w") as f:
                json.dump(self._cache, f)
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    async def search(
        self,
        query: str,
        category: str | None = None,
        max_price: float | None = None,
        style: str | None = None,
        limit: int = 12,
    ) -> list[Product]:
        """Search Google Shopping via SerpAPI."""
        if not self._api_key:
            print("[ProductService] SERPAPI_KEY not set")
            return []

        # Build a richer search query
        parts = []
        if style:
            parts.append(style)
        if category and category.lower() not in query.lower():
            parts.append(category)
        parts.append(query)
        search_q = " ".join(parts)

        # Build cache key
        cache_key = json.dumps({
            "q": search_q,
            "max": max_price,
            "limit": limit
        }, sort_keys=True)

        if cache_key in self._cache:
            logger.info(f"Cache hit for query: '{search_q}' (limit: {limit})")
            cached_data = self._cache[cache_key]
            # Must deserialize back into Product objects
            return [Product(**p) for p in cached_data]

        logger.info(f"Cache miss for query: '{search_q}' (limit: {limit}). Calling SerpAPI...")

        params: dict = {
            "engine":  "google_shopping",
            "q":       search_q,
            "api_key": self._api_key,
            "num":     min(limit, 20),
            "gl":      "us",
            "hl":      "en",
        }
        if max_price:
            params["tbs"] = f"price:1,ppr_max:{int(max_price)}"

        try:
            from serpapi import GoogleSearch
            results = await asyncio.to_thread(self._run_search, params)
            products = [_map_product(r) for r in results[:limit]]
            
            # Save to cache
            self._cache[cache_key] = [p.model_dump() for p in products]
            # Fire-and-forget save to disk
            asyncio.create_task(asyncio.to_thread(self._save_cache))
            
            logger.info(f"Successfully fetched and cached {len(products)} products for '{search_q}'")
            return products
        except Exception as e:
            logger.error(f"SerpAPI error: {e}")
            print(f"[ProductService] SerpAPI error: {e}")
            return []

    def _run_search(self, params: dict) -> list[dict]:
        from serpapi import GoogleSearch
        search = GoogleSearch(params)
        data = search.get_dict()
        return data.get("shopping_results", [])

    async def get_all(self, limit: int = 24) -> list[Product]:
        return await self.search("furniture living room bedroom", limit=limit)

    async def get_by_id(self, product_id: str) -> Product | None:
        # SerpAPI doesn't support lookup by ID
        return None
