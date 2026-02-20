from fastapi import APIRouter, Query, HTTPException
from models.schemas import Product, ProductSearchRequest
from services.product_service import ProductService

router = APIRouter()
_svc = ProductService()


@router.get("/", response_model=list[Product])
async def list_products(limit: int = Query(default=24, le=48)):
    return await _svc.get_all(limit=limit)


@router.post("/search", response_model=list[Product])
async def search_products(req: ProductSearchRequest):
    return await _svc.search(
        query=req.query,
        category=req.category,
        max_price=req.max_price,
        style=req.style,
        limit=req.limit,
    )


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await _svc.get_by_id(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product
