import logging
import os
import random
from app.llm_manager import LLMClient
from app.services.image_gen_browser import BrowserFarmWorker
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
        Unified Image Generation Entry Point.
        Modes:
        - 'fast' (API): Use Gemini/DALL-E.
        - 'quality' (Browser): Use ImageFX via Browser Farm.
        - 'remix' (Browser): Use Whisk via Browser Farm.
        - 'auto': Decide based on prompt complexity or settings.
        """
        
        # 1. Determine Strategy
        # 1. Determine Strategy
        strategy = "api"
        browser_provider = "whisk" # Default to Whisk as requested

        if mode == "quality": 
            strategy = "browser"
            browser_provider = "whisk" 
        elif mode == "whisk":
            strategy = "browser"
            browser_provider = "whisk"
        elif mode == "opal":
            strategy = "browser"
            browser_provider = "opal"
        elif mode == "imagefx":
            strategy = "browser"
            browser_provider = "imagefx"
        elif mode == "remix":
            strategy = "browser"
            browser_provider = "whisk"
        elif mode == "auto":
             strategy = "api"
        
        # [NEW] Apply Style Preset
        final_prompt = prompt
        if style:
             final_prompt = f"{prompt}, {style}"
             
        logger.info(f"🎨 Image Gen Request: '{final_prompt}' [Mode: {mode} -> Provider: {browser_provider}]")
        
        # 2. Execute Strategy
        if strategy == "api":
            return self._generate_via_api(final_prompt)
        else:
            return self._generate_via_browser_farm(final_prompt, browser_provider)
            
    def _generate_via_api(self, prompt: str) -> str:
        # Tries Gemini first (free), then DALL-E (paid)
        try:
             # Force provider to Google for cost saving if keys exist
             if self.settings.gemini_api_keys:
                 return self.llm_client.generate_image(prompt, provider="google")
             elif self.settings.openai_api_key:
                 return self.llm_client.generate_image(prompt, provider="openai")
             else:
                 logger.warning("No image API keys available. Mocking image generation for testing.")
                 return "https://dummyimage.com/1024x1024/000/fff&text=Mock+Image"
        except Exception as e:
            logger.error(f"❌ API Gen Failed: {e}")
            logger.warning("Falling back to mock image due to API error...")
            return "https://dummyimage.com/1024x1024/000/fff&text=Mock+Image"


    def _generate_via_browser_farm(self, prompt: str, mode: str) -> str:
        """
        Dispatches job to an available Browser Profile.
        """
        # 1. Find Available Profile with 'image_gen' tag
        # Logic: Find profile with lowest daily_gen_count
        profiles = self.db.query(models.BrowserProfile).all()
        
        candidates = []
        for p in profiles:
            # Check tags (mock logic as tags might be list of strings)
            # if "image_gen" in p.tags: candidates.append(p)
            # For now, accept ANY profile
            candidates.append(p)
            
        if not candidates:
            logger.warning("⚠️ No Browser Profiles available. Falling back to API.")
            return self._generate_via_api(prompt)
            
        # Pick least used
        worker_profile = sorted(candidates, key=lambda p: p.daily_gen_count)[0]
        
        logger.info(f"🚜 Dispatching to Browser Farm Worker: {worker_profile.name}")
        
        try:
            worker = BrowserFarmWorker(worker_profile.id, headless=True) # Run headless for speed
            
            result = ""
            if mode == "whisk":
                result = worker.generate_image_whisk(prompt)
            elif mode == "opal":
                result = worker.generate_image_opal(prompt)
            elif mode == "imagefx":
                result = worker.generate_image_imagefx(prompt)
            else:
                # Fallback to Whisk if unknown, or log error
                result = worker.generate_image_whisk(prompt)
                
            worker.close()
            
            # Update Stats
            worker_profile.daily_gen_count += 1
            self.db.commit()
            
            if not result:
                 raise RuntimeError("Browser Worker returned empty result")
                 
            return result
            
        except Exception as e:
            logger.error(f"❌ Browser Farm Failed: {e}. Falling back to API.")
            return self._generate_via_api(prompt)
