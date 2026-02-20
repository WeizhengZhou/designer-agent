"""
Layout router — uses Gemini to generate a 3-D room layout from a plan's furniture list.
"""

import os
import json
import asyncio

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types

router = APIRouter()


# ── Request / response models ──────────────────────────────────────────────────

class FurnitureInput(BaseModel):
    name: str
    preset_type: str   # e.g. "sofa", "dining-table", "bed-king"
    quantity: int
    width: float       # feet
    depth: float       # feet
    height: float      # feet
    color: str         # hex


class GenerateLayoutRequest(BaseModel):
    furniture_items: list[FurnitureInput]
    room_width: float = 15.0
    room_length: float = 20.0
    room_height: float = 9.0


# ── Gemini JSON schema for the response ────────────────────────────────────────

LAYOUT_RESPONSE_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "room_width":  {"type": "NUMBER"},
        "room_length": {"type": "NUMBER"},
        "room_height": {"type": "NUMBER"},
        "furniture_items": {
            "type": "ARRAY",
            "items": {
                "type": "OBJECT",
                "properties": {
                    "id":       {"type": "STRING"},
                    "name":     {"type": "STRING"},
                    "type":     {"type": "STRING"},
                    "x":        {"type": "NUMBER"},
                    "z":        {"type": "NUMBER"},
                    "width":    {"type": "NUMBER"},
                    "depth":    {"type": "NUMBER"},
                    "height":   {"type": "NUMBER"},
                    "color":    {"type": "STRING"},
                    "rotation": {"type": "NUMBER"},
                },
                "required": ["id", "name", "type", "x", "z", "width", "depth", "height", "color", "rotation"],
            },
        },
    },
    "required": ["room_width", "room_length", "room_height", "furniture_items"],
}


# ── Prompt template ────────────────────────────────────────────────────────────

LAYOUT_PROMPT = """\
You are a professional interior designer. Your task is to arrange the following \
furniture pieces inside a room and return their 3-D positions as JSON.

Room: {room_width} ft wide (X axis) × {room_length} ft long (Z axis) × {room_height} ft tall.

Furniture to place (each line is one individual piece — quantity already expanded):
{furniture_list}

Coordinate convention:
- X: 0 = left wall, {room_width} = right wall
- Z: 0 = front wall, {room_length} = back wall
- x and z in your response are the LEFT-FRONT corner of each piece (not the center).
- Keep every piece fully inside the room. Minimum clearance from walls: 0.5 ft.
- Pieces must NOT overlap. Allow at least 2 ft of walking passage between large items.
- rotation is in degrees (0 / 90 / 180 / 270). Use it to orient pieces sensibly.
- Give each piece a short, unique id such as "sofa-1", "chair-2", etc.
- Preserve the original color values exactly.

Interior design rules:
- Sofas should face the TV stand / focal wall with a coffee table in between.
- Dining chairs belong around the dining table.
- Beds should be placed against a wall, nightstands on the sides.
- Desks and bookshelves typically go along walls.
- Rugs go beneath seating groups or dining sets.
- Leave comfortable traffic lanes (≥ 3 ft) between main furniture groups.

Return ONLY the JSON object matching the schema — no commentary.
"""


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/generate-3d-layout")
async def generate_3d_layout(req: GenerateLayoutRequest):
    """Generate a 3-D room layout from a furniture plan using Gemini."""

    if not req.furniture_items:
        raise HTTPException(status_code=400, detail="furniture_items must not be empty")

    # Expand items by quantity and build the prompt's furniture list
    lines: list[str] = []
    counts: dict[str, int] = {}
    for item in req.furniture_items:
        key = item.preset_type
        for _ in range(item.quantity):
            counts[key] = counts.get(key, 0) + 1
            suffix = f" {counts[key]}" if item.quantity > 1 else ""
            lines.append(
                f"- {item.name}{suffix}  "
                f"(type={item.preset_type}, "
                f"size={item.width}w × {item.depth}d × {item.height}h ft, "
                f"color={item.color})"
            )

    furniture_list = "\n".join(lines)
    prompt = LAYOUT_PROMPT.format(
        room_width=req.room_width,
        room_length=req.room_length,
        room_height=req.room_height,
        furniture_list=furniture_list,
    )

    client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=LAYOUT_RESPONSE_SCHEMA,
    )

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.0-flash",
            contents=prompt,
            config=config,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    try:
        data = json.loads(response.text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Invalid JSON from Gemini: {exc}") from exc

    return data
