"""
Gemini 2.0 Flash — agentic interior design assistant (google-genai SDK).

Tool loop: Gemini → function call → execute → result → Gemini → ...
Until Gemini produces a final text response, which is streamed via WebSocket.
"""

import os
import asyncio
import base64

from google import genai
from google.genai import types
from fastapi import WebSocket

from services.product_service import ProductService
from services.imagen_service import ImagenService

def _decode_image(data_url: str) -> tuple[bytes, str]:
    """
    Parse a base64 data-URL or a raw base64 string.
    Returns (raw_image_bytes, mime_type).
    The caller must base64-DECODE (not encode) the string to get real bytes.
    """
    mime_type = "image/jpeg"
    b64_data = data_url
    if data_url.startswith("data:"):
        # "data:image/jpeg;base64,/9j/..."
        header, b64_data = data_url.split(",", 1)
        if ";" in header:
            mime_type = header.split(":")[1].split(";")[0]
    # Pad if needed, then decode
    padding = 4 - len(b64_data) % 4
    if padding != 4:
        b64_data += "=" * padding
    return base64.b64decode(b64_data), mime_type


LLM_MODEL = "gemini-2.0-flash"

SYSTEM_PROMPT = """You are an expert AI interior designer and furniture shopping assistant.
You help users find furniture, visualize their spaces, and make confident design decisions.

You have access to tools:
- search_products: Search the furniture catalog
- generate_room_image: Generate a photorealistic room visualization
- update_floor_plan: Place furniture on a 2-D floor plan
- create_3d_visualization: Build a 3-D room scene

Guidelines:
- When a user describes what they want, proactively call search_products.
- When the user wants to see how furniture looks together, call generate_room_image.
- When discussing room layout, call update_floor_plan.
- When the user wants a 3-D view, call create_3d_visualization.
- Be warm, creative, and specific. Mention exact product names you found.
- Keep responses concise but informative.
"""

# ── Tool declarations ──────────────────────────────────────────────────────────

SEARCH_TOOL = types.FunctionDeclaration(
    name="search_products",
    description="Search the furniture product catalog. Call this whenever the user asks for furniture suggestions.",
    parameters={
        "type": "object",
        "properties": {
            "query":     {"type": "string",  "description": "Natural-language search query"},
            "category":  {"type": "string",  "description": "Furniture category: sofa, dining table, chair, bed, bookshelf, dresser, coffee table, desk, tv stand, floor lamp, rug"},
            "max_price": {"type": "number",  "description": "Maximum price in USD"},
            "style":     {"type": "string",  "description": "Style: modern, mid-century, farmhouse, industrial, contemporary, traditional, transitional, bohemian"},
        },
        "required": ["query"],
    },
)

GENERATE_IMAGE_TOOL = types.FunctionDeclaration(
    name="generate_room_image",
    description="Generate a photorealistic room visualization. Call when the user wants to see what the room will look like.",
    parameters={
        "type": "object",
        "properties": {
            "room_description": {"type": "string", "description": "Detailed description of the room, furniture, colours, and style"},
            "style":            {"type": "string", "description": "Interior design style"},
        },
        "required": ["room_description"],
    },
)

FLOOR_PLAN_TOOL = types.FunctionDeclaration(
    name="update_floor_plan",
    description="Update the 2-D floor plan with furniture placements.",
    parameters={
        "type": "object",
        "properties": {
            "room_width":  {"type": "number", "description": "Room width in feet"},
            "room_length": {"type": "number", "description": "Room length in feet"},
            "furniture_placements": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name":          {"type": "string"},
                        "x_percent":     {"type": "number", "description": "X position as % of room width (0-100)"},
                        "y_percent":     {"type": "number", "description": "Y position as % of room length (0-100)"},
                        "width_percent": {"type": "number"},
                        "depth_percent": {"type": "number"},
                        "rotation":      {"type": "number"},
                        "color":         {"type": "string", "description": "CSS hex color"},
                    },
                },
            },
        },
        "required": ["furniture_placements"],
    },
)

VIZ3D_TOOL = types.FunctionDeclaration(
    name="create_3d_visualization",
    description="Create a 3-D room scene with furniture. Call when the user wants a 3-D view.",
    parameters={
        "type": "object",
        "properties": {
            "room_width":  {"type": "number"},
            "room_length": {"type": "number"},
            "room_height": {"type": "number"},
            "furniture_items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id":       {"type": "string"},
                        "name":     {"type": "string"},
                        "type":     {"type": "string"},
                        "x":        {"type": "number"},
                        "z":        {"type": "number"},
                        "width":    {"type": "number"},
                        "depth":    {"type": "number"},
                        "height":   {"type": "number"},
                        "color":    {"type": "string"},
                        "rotation": {"type": "number"},
                    },
                },
            },
        },
        "required": ["furniture_items"],
    },
)

TOOLS = [types.Tool(function_declarations=[SEARCH_TOOL, GENERATE_IMAGE_TOOL, FLOOR_PLAN_TOOL, VIZ3D_TOOL])]


# ── Gemini service ──────────────────────────────────────────────────────────────

class GeminiService:
    def __init__(self, product_service: ProductService, imagen_service: ImagenService):
        self._client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        self._product_svc = product_service
        self._imagen_svc = imagen_service
        self._config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            tools=TOOLS,
        )

    async def process_message(
        self,
        websocket: WebSocket,
        content: str,
        images: list[str],
        history: list[dict],
    ) -> None:
        """Run the agentic tool loop, streaming results back via WebSocket."""

        # Build the current user turn parts
        user_parts: list[types.Part] = []
        for img_data in images:
            raw_bytes, mime_type = _decode_image(img_data)
            user_parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime_type))
        if content:
            user_parts.append(types.Part.from_text(text=content))

        # Build conversation history for the API
        gemini_contents = self._build_contents(history)
        gemini_contents.append(types.Content(role="user", parts=user_parts))

        # Persist to history
        history.append({"role": "user", "content": content, "images": images})

        assistant_text = ""

        # Agentic loop
        while True:
            try:
                response = await asyncio.to_thread(
                    self._client.models.generate_content,
                    model=LLM_MODEL,
                    contents=gemini_contents,
                    config=self._config,
                )
            except Exception as e:
                await websocket.send_json({"type": "error", "message": str(e)})
                await websocket.send_json({"type": "done"})
                return

            candidate = response.candidates[0] if response.candidates else None
            if not candidate:
                await websocket.send_json({"type": "done"})
                return

            fn_calls = []
            text_parts = []
            for part in candidate.content.parts:
                if part.function_call:
                    fn_calls.append(part.function_call)
                elif part.text:
                    text_parts.append(part.text)

            if fn_calls:
                # Append model turn (function call) to contents
                gemini_contents.append(candidate.content)

                # Execute tools and collect results
                tool_result_parts: list[types.Part] = []
                for fc in fn_calls:
                    await websocket.send_json(
                        {"type": "thinking", "text": f"Using tool: {fc.name}…"}
                    )
                    result = await self._execute_tool(fc.name, dict(fc.args), websocket)
                    tool_result_parts.append(
                        types.Part.from_function_response(
                            name=fc.name,
                            response={"result": result},
                        )
                    )

                # Append function responses
                gemini_contents.append(
                    types.Content(role="user", parts=tool_result_parts)
                )

            else:
                # Final text response
                full_text = "".join(text_parts)
                if full_text:
                    chunk_size = 60
                    for i in range(0, len(full_text), chunk_size):
                        await websocket.send_json({"type": "stream", "content": full_text[i:i + chunk_size]})
                        await asyncio.sleep(0.02)
                    assistant_text = full_text

                history.append({"role": "assistant", "content": assistant_text})
                await websocket.send_json({"type": "done"})
                break

    # ── Tool execution ────────────────────────────────────────────────────────

    async def _execute_tool(self, name: str, args: dict, websocket: WebSocket) -> dict:
        if name == "search_products":
            products = await self._product_svc.search(
                query=args.get("query", ""),
                category=args.get("category"),
                max_price=args.get("max_price"),
                style=args.get("style"),
            )
            product_dicts = [p.model_dump() for p in products]
            await websocket.send_json({"type": "products", "data": product_dicts})
            return {"products_found": len(products), "products": [p.title for p in products]}

        elif name == "generate_room_image":
            desc  = args.get("room_description", "")
            style = args.get("style", "")
            prompt = f"{desc} Style: {style}" if style else desc
            b64 = await self._imagen_svc.generate_room_image(prompt)
            if b64:
                await websocket.send_json({"type": "image", "data": b64})
                return {"status": "image generated successfully"}
            return {"status": "image generation failed — no image output from model"}

        elif name == "update_floor_plan":
            await websocket.send_json({"type": "floor_plan", "data": args})
            return {"status": "floor plan updated"}

        elif name == "create_3d_visualization":
            await websocket.send_json({"type": "scene_3d", "data": args})
            return {"status": "3d scene created"}

        return {"status": "unknown tool"}

    # ── History helpers ───────────────────────────────────────────────────────

    def _build_contents(self, history: list[dict]) -> list[types.Content]:
        contents: list[types.Content] = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            parts: list[types.Part] = []
            for img in msg.get("images", []):
                raw_bytes, mime_type = _decode_image(img)
                parts.append(types.Part.from_bytes(data=raw_bytes, mime_type=mime_type))
            if msg.get("content"):
                parts.append(types.Part.from_text(text=msg["content"]))
            if parts:
                contents.append(types.Content(role=role, parts=parts))
        return contents
