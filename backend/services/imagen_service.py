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
from typing import Any

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

    async def generate_3d_visualization(self, furniture_items: list[Any], floor_plan_image: str | None = None) -> str | None:
        """
        Generate a 3D visualization of a room containing specific furniture using nano banana pro.
        Returns a base64-encoded PNG string, or None on failure.
        """
        import httpx
        from google.genai import types

        prompt_parts: list[types.Part] = []

        # Prepend uploaded floor plan image as the first reference
        if floor_plan_image:
            try:
                # Parse data URL: "data:<mime>;base64,<data>"
                header, b64data = floor_plan_image.split(",", 1)
                mime_type = header.split(":")[1].split(";")[0]
                image_bytes = base64.b64decode(b64data)
                prompt_parts.append(
                    types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                )
            except Exception as e:
                print(f"[ImagenService] Failed to parse floor plan image: {e}")

        items_desc = []

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            for item in furniture_items:
                title = item.title
                url = item.image_url
                items_desc.append(title)
                try:
                    # Some images in dummy data or SerpAPI might need proxy but here we just fetch directly
                    if url.startswith("http"):
                        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
                        if resp.status_code == 200:
                            content_type = resp.headers.get("content-type", "image/jpeg")
                            prompt_parts.append(
                                types.Part.from_bytes(data=resp.content, mime_type=content_type)
                            )
                except Exception as e:
                    print(f"Failed to fetch image for {title}: {e}")
                    
        items_str = ", ".join(items_desc)
        floor_plan_note = (
            "I have also provided an uploaded floor plan image as the first reference — "
            "use it to understand the room shape and layout. "
            if floor_plan_image else ""
        )
        full_prompt = (
            "Create a highly realistic, photorealistic 3D interior design visualization of a beautifully styled room "
            "containing the following furniture pieces: " + items_str + ". "
            + floor_plan_note +
            "I have provided reference images of the exact furniture pieces I want you to include. "
            "Ensure the lighting is natural, the textures are lifelike, and the composition looks like high-end architectural photography."
        )
        
        prompt_parts.append(types.Part.from_text(text=full_prompt))

        try:
            # Using the Pro Nano Banana model: gemini-3-pro-image-preview
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model="gemini-3-pro-image-preview",
                contents=prompt_parts,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )
            for part in response.candidates[0].content.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    return base64.b64encode(part.inline_data.data).decode("utf-8")
        except Exception as e:
            print(f"[ImagenService] Nano Banana Pro image generation failed: {e}")
        return None
