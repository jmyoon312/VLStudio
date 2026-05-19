from google import genai
from google.genai.types import Part
from app.config import settings
import logging
import os

logger = logging.getLogger(__name__)

class AssetValidator:
    """
    Uses Gemini 1.5 Flash (Free Tier) as a high-level validator 
    for visual quality and contextual relevance.
    Used when local CLIP score is in the 'uncertain' range (e.g., 0.6 - 0.75).
    """
    def __init__(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("⚠️ GEMINI_API_KEY not found. Validation will be skipped.")
            self.client = None
            return
            
        self.client = genai.Client(api_key=api_key)
        self.model_id = 'gemini-1.5-flash'

    async def validate_asset(self, image_path: str, prompt: str, target_aspect_ratio: str = "9:16") -> dict:
        """
        Analyzes an image and returns a verdict.
        """
        if not self.client:
            return {"verdict": "pass", "reason": "No API Key (Fallback)"}
            
        try:
            # The new SDK handles files easily, but let's keep it simple with bytes or path
            with open(image_path, "rb") as f:
                img_data = f.read()
                
            instruction = f"""
            Analyze this image/frame for a video production tool.
            Prompt it should match: "{prompt}"
            Target Aspect Ratio: {target_aspect_ratio}
            
            Evaluate based on:
            1. Visual Quality (No blur, artifacts, watermarks).
            2. Relevance to Prompt.
            3. Composition for {target_aspect_ratio}.
            
            Return JSON only:
            {{
                "score": 0-100,
                "verdict": "excellent" | "good" | "poor",
                "reason": "summary"
            }}
            """
            
            response = self.client.models.generate_content(
                model=self.model_id,
                contents=[
                    Part.from_bytes(data=img_data, mime_type="image/jpeg"),
                    instruction
                ]
            )
            
            import json
            import re
            
            # Clean JSON from response
            text = response.text
            match = re.search(r'\{.*\}', text, re.DOTALL)
            if match:
                return json.loads(match.group())
            else:
                return {"verdict": "fail", "reason": f"JSON Parsing Error: {text}"}
                
        except Exception as e:
            logger.error(f"❌ Gemini Validation failed: {e}")
            return {"verdict": "error", "reason": str(e)}

    def is_suitable(self, validation_result: dict) -> bool:
        """Helper to decide on suitability."""
        return validation_result.get("verdict") in ["excellent", "good"]
