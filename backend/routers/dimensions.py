"""
Dimensions router — fetches real product dimensions from a product URL.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from services.dimension_service import DimensionService

router = APIRouter()

# Singleton service instance (reuses the same Gemini client)
_service: DimensionService | None = None


def _get_service() -> DimensionService:
    global _service
    if _service is None:
        _service = DimensionService()
    return _service


class DimensionRequest(BaseModel):
    url: str
    product_title: str


class DimensionResponse(BaseModel):
    width:  Optional[float] = None  # inches
    depth:  Optional[float] = None  # inches
    height: Optional[float] = None  # inches
    found:  bool = False


@router.post("/fetch", response_model=DimensionResponse)
async def fetch_dimensions(req: DimensionRequest) -> DimensionResponse:
    """
    Fetch real product dimensions by scraping the product URL.
    Returns width / depth / height in inches, or nulls if not found.
    Never raises an error — returns found=False instead.
    """
    svc    = _get_service()
    result = await svc.fetch_dimensions(req.url, req.product_title)

    if result is None:
        return DimensionResponse(found=False)

    return DimensionResponse(
        width=result['width'],
        depth=result['depth'],
        height=result['height'],
        found=True,
    )
