"""
OmniRoute Imagen 3 Image Generator Service for ViraLoop Studio.
Connects to local OmniRoute (http://localhost:20128) to generate ultra-high-definition 9:16 / 16:9 images
using Google's latest Imagen 3 model (imagen-3.0-generate-002).

Supports two communication protocols:
1. OpenAI Standard Protocol (client.images.generate)
2. Gemini Native Predict Endpoint (requests to /v1beta/models/imagen-3.0-generate-002:predict)
"""

import os
import base64
import logging
from typing import Optional, Dict, Any
from pathlib import Path

import requests
from openai import OpenAI

from app.config import settings as app_settings

logger = logging.getLogger("omniroute_image_generator")

OMNIROUTE_BASE_URL = os.environ.get("OMNIROUTE_BASE_URL", "http://localhost:20128")
IMAGEN_MODEL = "imagen-3.0-generate-002"


class OmniRouteImageGenerator:
    def __init__(self, base_url: str = OMNIROUTE_BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.openai_client = OpenAI(
            base_url=f"{self.base_url}/v1",
            api_key="omniroute-dummy-key"
        )
        self.output_dir = Path(app_settings.TEMP_DIR) / "images"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate_image_openai_style(
        self,
        prompt: str,
        size: str = "1024x1792",
        output_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Method 1: Generate image using OpenAI compatible standard format.
        Useful for general 1024x1792 vertical shorts or 1024x1024 square images.
        """
        logger.info(f"[OmniRoute Imagen3:OpenAI] Requesting image: '{prompt[:60]}...' size={size}")
        try:
            response = self.openai_client.images.generate(
                model=IMAGEN_MODEL,
                prompt=prompt,
                size=size,
                n=1,
                response_format="b64_json"
            )
            image_base64 = response.data[0].b64_json
            if not image_base64:
                logger.error("[OmniRoute Imagen3:OpenAI] Empty b64_json in response")
                return None

            if not output_filename:
                import uuid
                output_filename = f"omni_img_{uuid.uuid4().hex[:10]}.png"

            save_path = self.output_dir / output_filename
            with open(save_path, "wb") as f:
                f.write(base64.b64decode(image_base64))

            logger.info(f"[OmniRoute Imagen3:OpenAI] Successfully saved: {save_path}")
            return str(save_path)
        except Exception as e:
            logger.warning(f"[OmniRoute Imagen3:OpenAI] Generation failed: {e}")
            return None

    def generate_image_gemini_native(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        output_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Method 2: Generate image directly via Gemini Native Predict endpoint.
        Provides precise aspect ratio ('9:16', '16:9', '1:1') and adult person generation control.
        """
        logger.info(f"[OmniRoute Imagen3:Native] Requesting image: '{prompt[:60]}...' ratio={aspect_ratio}")
        url = f"{self.base_url}/v1beta/models/{IMAGEN_MODEL}:predict"
        payload = {
            "instances": [
                {
                    "prompt": prompt
                }
            ],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": aspect_ratio,
                "personGeneration": "ALLOW_ADULT",
                "outputOptions": {
                    "mimeType": "image/png"
                }
            }
        }
        headers = {
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=90)
            response.raise_for_status()
            result = response.json()

            predictions = result.get("predictions", [])
            if not predictions or "bytesBase64Encoded" not in predictions[0]:
                logger.error(f"[OmniRoute Imagen3:Native] Unexpected response: {result}")
                return None

            image_base64 = predictions[0]["bytesBase64Encoded"]

            if not output_filename:
                import uuid
                output_filename = f"omni_img_{uuid.uuid4().hex[:10]}.png"

            save_path = self.output_dir / output_filename
            with open(save_path, "wb") as f:
                f.write(base64.b64decode(image_base64))

            logger.info(f"[OmniRoute Imagen3:Native] Successfully saved: {save_path}")
            return str(save_path)
        except Exception as e:
            logger.warning(f"[OmniRoute Imagen3:Native] Generation failed: {e}")
            return None

    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        output_filename: Optional[str] = None
    ) -> Optional[str]:
        """
        Universal image generation with automatic fallback:
        Tries Native Predict first for best aspect ratio fidelity, falls back to OpenAI protocol if needed.
        """
        # Try native first
        result = self.generate_image_gemini_native(prompt, aspect_ratio=aspect_ratio, output_filename=output_filename)
        if result and os.path.exists(result):
            return result

        # Fallback to OpenAI style
        size = "1024x1792" if aspect_ratio == "9:16" else ("1792x1024" if aspect_ratio == "16:9" else "1024x1024")
        return self.generate_image_openai_style(prompt, size=size, output_filename=output_filename)


omniroute_image_generator = OmniRouteImageGenerator()
