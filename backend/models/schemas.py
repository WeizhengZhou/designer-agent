from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class Dimensions(BaseModel):
    width: float  # inches
    depth: float
    height: float


class Product(BaseModel):
    id: str
    title: str
    description: str
    short_description: str
    price: float
    currency: str = "USD"
    seller: str
    rating: float
    review_count: int
    category: str
    style: str
    images: list[str]
    dimensions: Optional[Dimensions] = None
    colors: list[str] = []
    in_stock: bool = True
    url: str = "#"
    tags: list[str] = []


class FurniturePlacement(BaseModel):
    name: str
    x_percent: float
    y_percent: float
    width_percent: float
    depth_percent: float
    rotation: float = 0
    color: str = "#94a3b8"


class FloorPlanData(BaseModel):
    room_width: float = 15
    room_length: float = 20
    furniture_placements: list[FurniturePlacement]


class Furniture3DItem(BaseModel):
    id: str
    name: str
    type: str
    x: float
    z: float
    width: float
    depth: float
    height: float
    color: str = "#94a3b8"
    rotation: float = 0


class Scene3DData(BaseModel):
    room_width: float = 15
    room_length: float = 20
    room_height: float = 9
    furniture_items: list[Furniture3DItem]


class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    images: list[str] = []  # base64 data


class ProductSearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    max_price: Optional[float] = None
    style: Optional[str] = None
    limit: int = Field(default=12, le=24)


class ImageGenerationRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 768


class PlanFurnitureItem(BaseModel):
    title: str
    image_url: str


class PlanImageGenerationRequest(BaseModel):
    furniture_items: list[PlanFurnitureItem]
    floor_plan_image: Optional[str] = None  # base64 data URL
