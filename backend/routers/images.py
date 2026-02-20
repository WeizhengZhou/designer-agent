from fastapi import APIRouter, Query
from fastapi.responses import Response
from models.schemas import ImageGenerationRequest, PlanImageGenerationRequest
from services.imagen_service import ImagenService
import httpx

router = APIRouter()
_svc = ImagenService()


@router.post("/generate")
async def generate_image(req: ImageGenerationRequest):
    b64 = await _svc.generate_room_image(req.prompt)
    if not b64:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Image generation failed")
    return {"image": b64, "mime_type": "image/png"}


@router.post("/generate-from-plan")
async def generate_from_plan(req: PlanImageGenerationRequest):
    b64 = await _svc.generate_3d_visualization(req.furniture_items, req.floor_plan_image)
    if not b64:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="3D image generation failed")
    return {"image": b64, "mime_type": "image/png"}


@router.get("/proxy")
async def proxy_image(url: str = Query(..., description="Image URL to proxy")):
    """
    Proxy external images (e.g. SerpAPI thumbnails) to avoid browser CORS issues.
    Only proxies http/https URLs.
    """
    if not url.startswith(("http://", "https://")):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            content_type = resp.headers.get("content-type", "image/jpeg")
            return Response(content=resp.content, media_type=content_type)
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=502, detail=f"Failed to fetch image: {e}")
