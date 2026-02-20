import os
from dotenv import load_dotenv

load_dotenv()  # Must be before any google-generativeai imports

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, products, images

app = FastAPI(
    title="Interior Designer Agent API",
    description="AI-powered furniture shopping assistant backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:4201"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(images.router, prefix="/api/images", tags=["images"])


@app.get("/health")
def health():
    return {"status": "ok", "api_key_set": bool(os.environ.get("GOOGLE_API_KEY"))}
