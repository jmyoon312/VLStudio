import logging
import os
from app.llm_manager import LLMClient
from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)

class ImageGenService:
    def __init__(self, settings: models.Settings):
        self.settings = settings
        self.db = SessionLocal()
        self.llm_client = LLMClient(settings)
        
    def generate_image(self, prompt: str, mode: str = "auto", style: str = None) -> str:
        """
        Unified Image Generation Entry Point (100% API Driven).
        Modes are now unified to use cost-effective and fast API engines.
        """
        final_prompt = prompt
        if style:
             final_prompt = f"{prompt}, {style}"
             
        logger.info(f"🎨 Image Gen Request: '{final_prompt}' [Mode: {mode}]")
        return self._generate_via_api(final_prompt)
            
    def _generate_via_api(self, prompt: str) -> str:
        # 1. Tier 1: Sovereign Google Account Pool (Direct Gemini Image Generator - Nano Banana Pro / Imagen 3)
        try:
            from app.services.direct_gemini_image_generator import direct_gemini_image_generator
            res = direct_gemini_image_generator.generate_image(prompt, aspect_ratio="9:16")
            if res.get("success") and res.get("image_path"):
                return res["image_path"]
        except Exception as sovereign_err:
            logger.warning(f"⚠️ Sovereign Gemini Image Generator error ({sovereign_err}), attempting API key fallback...")

        # 2. Tier 2: Paid API Keys (if explicitly provided in DB settings)
        try:
            if self.settings.gemini_api_keys:
                return self.llm_client.generate_image(prompt, provider="google")
            elif self.settings.openai_api_key:
                return self.llm_client.generate_image(prompt, provider="openai")
        except Exception as e:
            logger.error(f"[FAIL] API Gen Failed: {e}")

        logger.warning("Falling back to mock image due to all image generation methods failing...")
        return "https://dummyimage.com/1024x1024/000/fff&text=Mock+Image"
