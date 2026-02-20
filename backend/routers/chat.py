from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.gemini_service import GeminiService
from services.product_service import ProductService
from services.imagen_service import ImagenService

router = APIRouter()

_product_svc = ProductService()
_imagen_svc = ImagenService()
_gemini_svc = GeminiService(_product_svc, _imagen_svc)


@router.websocket("/ws")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    history: list[dict] = []

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "message":
                content = data.get("content", "").strip()
                images = data.get("images", [])  # list of base64 data-URL strings

                if not content and not images:
                    continue

                await _gemini_svc.process_message(
                    websocket=websocket,
                    content=content,
                    images=images,
                    history=history,
                )

            elif msg_type == "reset":
                history.clear()
                await websocket.send_json({"type": "reset_ack"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass
