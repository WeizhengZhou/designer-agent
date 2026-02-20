"""
Image generation service (google-genai SDK).

Uses Gemini 2.0 Flash with image output modality for room visualization.

To swap for Google Imagen 3 (Vertex AI), install google-cloud-aiplatform and
replace generate_room_image() with a Vertex AI call:

    from vertexai.preview.vision_models import ImageGenerationModel
    model = ImageGenerationModel.from_pretrained("imagegeneration@006")
    images = model.generate_images(prompt=prompt)
    image_bytes = images[0]._image_bytes

Note: the model name "nano banana" specified in the project brief does not
correspond to any real Google model. Update IMAGE_MODEL with the correct
model ID once confirmed.
"""

import os
import asyncio
import base64

from google import genai
from google.genai import types

IMAGE_MODEL = "gemini-2.0-flash-preview-image-generation"


class ImagenService:
    def __init__(self):
        self._client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY", ""))

    async def generate_room_image(self, prompt: str) -> str | None:
        """
        Generate a room visualization image.
        Returns a base64-encoded PNG string, or None on failure.
        """
        full_prompt = (
            f"Create a photorealistic interior design visualization: {prompt}. "
            "High quality, professional interior photography style, warm natural lighting, "
            "sharp focus, 4K resolution."
        )
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=IMAGE_MODEL,
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    return base64.b64encode(part.inline_data.data).decode("utf-8")
        except Exception as e:
            print(f"[ImagenService] Image generation failed: {e}")
        return None
