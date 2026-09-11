try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

import logging
import time
import os
import base64
from openai import OpenAI
from typing import List, Dict, Any, Optional
from . import schemas
from app.services.metrics import collector

import json
from datetime import datetime, timedelta
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

# --- Legacy Global Cache (Phase-out in favor of DB) ---
_MODEL_CACHE = None
_CACHE_TTL = 86400  # 24 Hours

def clear_model_cache_global():
    """Global utility to clear model cache across all instances."""
    global _MODEL_CACHE
    _MODEL_CACHE = None
    logger.info("🧹 [Global] Model Cache Cleared.")

def parse_llm_error(e: Exception, provider: str) -> str:
    """
    Translates raw API exceptions into user-friendly localized messages.
    """
    error_msg = str(e).lower()
    
    if "401" in error_msg or "unauthorized" in error_msg:
        return f"[{provider}] API 키가 올바르지 않거나 만료되었습니다. 설정을 확인해 주세요."
    if "403" in error_msg or "forbidden" in error_msg or "permission denied" in error_msg:
        return f"[{provider}] API 액세스가 거부되었습니다(403). Google Cloud Console에서 'Generative Language API'가 활성화되어 있는지 확인해 주세요."
    if "402" in error_msg or "payment" in error_msg or "quota" in error_msg or "balance" in error_msg:
        return f"[{provider}] 결제 수단 등록이 필요하거나 크레딧이 부족합니다. 해당 서비스 포털(Billing)을 확인해 주세요."
    if "429" in error_msg or "rate limit" in error_msg:
        return f"[{provider}] 요청 한도를 초과했습니다. 잠시 후 다시 시도하거나 다른 제공자를 사용해 주세요."
    if "timeout" in error_msg:
        return f"[{provider}] 연결 시간이 초과되었습니다. 네트워크 상태를 확인하거나 잠시 후 다시 시도해 주세요."
    
    return f"[{provider} 오류] {str(e)}"

class LLMClient:
    def __init__(self, settings: schemas.Settings):
        self.settings = settings
        
        # [CRITICAL] SOVEREIGN TRUTH: DB Settings must override .env entirely
        # Gemini Setup
        self.gemini_keys = []
        if settings.gemini_api_keys:
            for k in settings.gemini_api_keys:
                if k:
                    clean_key = k.strip().replace('\n', '').replace('\r', '')
                    if clean_key:
                        self.gemini_keys.append(clean_key)
        self.gemini_key_index = 0
        
        # OpenRouter Setup
        self.openrouter_keys = []
        if hasattr(settings, "openrouter_api_keys") and settings.openrouter_api_keys:
            for k in settings.openrouter_api_keys:
                if k:
                    clean_key = k.strip().replace("\n", "").replace("\r", "")
                    if clean_key: self.openrouter_keys.append(clean_key)
        elif hasattr(settings, "openrouter_api_key") and settings.openrouter_api_key:
            self.openrouter_keys.append(settings.openrouter_api_key.strip())
        self.openrouter_key_index = 0
        
        # Groq Setup
        self.groq_keys = []
        if settings.groq_api_keys:
            for k in settings.groq_api_keys:
                if k:
                    clean_key = k.strip().replace("\n", "").replace("\r", "")
                    if clean_key: self.groq_keys.append(clean_key)
        elif hasattr(settings, "groq_api_key") and settings.groq_api_key:
            self.groq_keys.append(settings.groq_api_key.strip())
        self.groq_key_index = 0
        
        # SambaNova Setup
        self.sambanova_keys = []
        if settings.sambanova_api_keys:
            for k in settings.sambanova_api_keys:
                if k:
                    clean_key = k.strip()
                    if clean_key: self.sambanova_keys.append(clean_key)
        self.sambanova_key_index = 0

        # Cerebras Setup
        self.cerebras_keys = []
        if settings.cerebras_api_keys:
            for k in settings.cerebras_api_keys:
                if k:
                    clean_key = k.strip()
                    if clean_key: self.cerebras_keys.append(clean_key)
        self.cerebras_key_index = 0

        # NVIDIA Setup (Added)
        self.nvidia_keys = []
        if hasattr(settings, "nvidia_api_keys") and settings.nvidia_api_keys:
            for k in settings.nvidia_api_keys:
                if k:
                    clean_key = k.strip()
                    if clean_key: self.nvidia_keys.append(clean_key)
        self.nvidia_key_index = 0
        # OpenCode Zen Setup
        self.opencode_keys = []
        if hasattr(settings, "opencode_api_keys") and settings.opencode_api_keys:
            for k in settings.opencode_api_keys:
                if k:
                    clean_key = k.strip()
                    if clean_key: self.opencode_keys.append(clean_key)
        self.opencode_key_index = 0

        # YouTube1 Setup (Custom OpenAI-compatible endpoint)
        self.youtube1_keys = []
        if hasattr(settings, "youtube1_api_keys") and settings.youtube1_api_keys:
            for k in settings.youtube1_api_keys:
                if k:
                    clean_key = k.strip()
                    if clean_key: self.youtube1_keys.append(clean_key)
        self.youtube1_key_index = 0
    
    def _get_ollama_v1_url(self) -> str:
        """
        [NEW] Centralized helper to get the verified Ollama V1 endpoint from DB.
        """
        raw_url = getattr(self.settings, "ollama_api_base_url", "http://host.docker.internal:11434/v1")
        clean_url = str(raw_url).strip().rstrip("/")
        if clean_url.endswith("/v1"):
            return clean_url
        return f"{clean_url}/v1"

    def _get_gemini_client(self):
        if not self.gemini_keys:
            raise ValueError("No Gemini API Keys available in DB Settings.")
        
        key = self.gemini_keys[self.gemini_key_index]
        self.gemini_key_index = (self.gemini_key_index + 1) % len(self.gemini_keys)
        return genai.Client(api_key=key)

    def generate(self, prompt: str, model_name: str = None, system_instruction: str = None) -> str:
        """Compatibility wrapper for code calling llm.generate(...)"""
        if not model_name:
            model_name = getattr(self.settings, "script_analysis_model", None) or getattr(self.settings, "default_llm_model", None) or "viraloop1"
        res = self.generate_content(prompt, model_name=model_name, system_instruction=system_instruction)
        if isinstance(res, dict):
            import json
            return json.dumps(res)
        return str(res)

    async def generate_text(self, prompt: str, model_name: str = None, system_instruction: str = None, temperature: float = 0.7) -> str:
        """Async non-blocking generation using DB Settings model"""
        import asyncio
        return await asyncio.to_thread(self.generate, prompt, model_name, system_instruction)

    def generate_content(self, prompt: str, model_name: str = None, system_instruction: str = None, full_response: bool = False, images: list = None) -> str | dict:
        """
        Unified generation method.
        [SOVEREIGN TRUTH] Exclusively routes all prompts through the OmniRoute sovereign gateway.
        """
        try:
            return self._generate_content_internal(prompt, model_name, system_instruction, full_response, images)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[OmniRoute] Generate content failed: {e}")
            if full_response:
                return {"content": f"ERROR: {error_msg}", "error": error_msg}
            return f"ERROR: {error_msg}"

    def _generate_content_internal(self, prompt: str, model_name: str = None, system_instruction: str = None, full_response: bool = False, images: list = None) -> str | dict:
        """
        [SOVEREIGN TRUTH] Exclusively routes all text generation through the local OmniRoute gateway (port 20128).
        Single Source of Truth: DB Settings (script_analysis_model, youtube1_api_keys).
        """
        try:
            # 1. Resolve Effective Model Name from DB Settings
            if not model_name or str(model_name).lower() in ["free", "auto", "default", "none", ""]:
                model_name = getattr(self.settings, "script_analysis_model", None) or getattr(self.settings, "default_llm_model", None) or "viraloop1"

            # 2. Clean Model Name (Strip any provider prefixes to send pure model ID to OmniRoute)
            clean_model = str(model_name).strip()
            for prefix in ["youtube1/", "omniroute/", "9router/", "opencode/", "openrouter/", "groq/", "nvidia/", "google/", "gemini/", "openai/", "anthropic/", "sambanova/", "cerebras/", "ollama/"]:
                if clean_model.startswith(prefix):
                    clean_model = clean_model[len(prefix):]
                    break
            
            if not clean_model:
                clean_model = "viraloop1"

            # 3. Resolve OmniRoute Gateway Base URL & API Key from DB Settings
            raw_base_url = getattr(self.settings, "youtube1_base_url", None) or getattr(self.settings, "ninerouter_url", None) or "http://localhost:20128/v1"
            clean_base_url = str(raw_base_url).strip().rstrip("/")
            if not clean_base_url.endswith("/v1") and not clean_base_url.endswith("/chat/completions"):
                clean_base_url = f"{clean_base_url}/v1"

            # DB Settings의 실제 API Key 가져오기
            keys_to_try = []
            if hasattr(self.settings, "youtube1_api_keys") and self.settings.youtube1_api_keys:
                for k in self.settings.youtube1_api_keys:
                    if k and k.strip():
                        keys_to_try.append(k.strip())
            
            db_k = getattr(self.settings, "omniroute_api_key", None) or getattr(self.settings, "ninerouter_api_key", None)
            if db_k and db_k.strip() and db_k.strip() not in keys_to_try:
                keys_to_try.append(db_k.strip())

            if not keys_to_try:
                try:
                    import sqlite3
                    sqlite_path = os.path.expanduser(r"~/.omniroute/storage.sqlite")
                    if os.path.exists(sqlite_path):
                        with sqlite3.connect(sqlite_path, timeout=1.0) as s_conn:
                            s_cur = s_conn.cursor()
                            try:
                                s_cur.execute("SELECT key FROM api_keys WHERE key LIKE 'sk-%' AND (is_active IS NULL OR is_active = 1) ORDER BY created_at DESC LIMIT 1")
                                row = s_cur.fetchone()
                            except Exception:
                                s_cur.execute("SELECT api_key FROM api_keys WHERE api_key LIKE 'sk-%' LIMIT 1")
                                row = s_cur.fetchone()
                            if row and row[0]:
                                keys_to_try.append(row[0])
                except Exception:
                    pass

            if not keys_to_try:
                keys_to_try = ["sk-omniroute"]

            last_error = None
            for key_idx, current_key in enumerate(keys_to_try):
                if not current_key:
                    continue
                try:
                    return self._generate_openai_compatible(
                        prompt=prompt,
                        model=clean_model,
                        system_instruction=system_instruction,
                        full_response=full_response,
                        base_url=clean_base_url,
                        api_key=current_key,
                        provider_name="OmniRoute",
                        images=images,
                        request_timeout=180.0
                    )
                except Exception as e:
                    last_error = e
                    logger.warning(f"[WAIT] [OmniRoute] Error with model [{clean_model}] on key #{key_idx}: {e}. Retrying...")
                    time.sleep(0.5)
                    continue

            logger.error(f"[FAIL] [OmniRoute] All attempts failed for model [{clean_model}]: {last_error}")
            raise last_error or Exception(f"OmniRoute generation failed for model [{clean_model}]")
        except Exception as e:
            raise e

    def _generate_gemini(self, prompt: str, model: str, system_instruction: str, full_response: bool, images: list = None):
        requested_model = model if model else self.settings.default_model
        # Use ONLY the requested model to honor user choice
        models_to_try = [requested_model]

        last_error = None

        for current_model in models_to_try:
            # Retry loop for API Keys
            for attempt in range(len(self.gemini_keys) + 1):
                try:
                    start_ts = time.time()
                    client = self._get_gemini_client()
                    if attempt == 0: logger.info(f"[FALLBACK] [Gemini] Sending to [{current_model}] (Images: {len(images) if images else 0})...")

                    config = types.GenerateContentConfig(
                        temperature=0.7,
                        system_instruction=system_instruction
                    )

                    # Prepare contents
                    contents = [prompt]
                    if images:
                        for img in images:
                            if isinstance(img, bytes):
                                contents.append(types.Part.from_bytes(data=img, mime_type="image/jpeg"))
                            elif isinstance(img, dict) and "data" in img and "mime_type" in img:
                                contents.append(types.Part.from_bytes(data=img["data"], mime_type=img["mime_type"]))
                            else:
                                contents.append(img)

                    response = client.models.generate_content(
                        model=current_model,
                        contents=contents,
                        config=config
                    )
                    
                    if response and hasattr(response, 'text') and response.text:
                        latency = time.time() - start_ts
                        collector.record_event("llm", "generate", "success", {"provider": "gemini", "model": current_model, "latency": latency})
                        if full_response:
                            return {
                                "content": response.text,
                                "model": f"google/{current_model}"
                            }
                        else:
                            return response.text
                    else:
                        logger.warning(f"[WARN] [Gemini] Empty response from {current_model}. Attempting rotation...")
                        continue
                    
                except Exception as e:
                    error_msg = str(e)
                    last_error = e
                    
                    if "404" in error_msg or "not found" in error_msg.lower() or "400" in error_msg:
                        logger.warning(f"[WARN] [Gemini] Model {current_model} unavailable. Switching...")
                        break 
                    
                    if "403" in error_msg or "permission" in error_msg.lower():
                        collector.record_event("llm", "auth_error", "error", {"provider": "gemini", "model": current_model, "error": error_msg})
                        logger.error(f"[FAIL] [Gemini] ACCESS FORBIDDEN (403). Please enable 'Generative Language API' in your Google Cloud Console for project 1024666224541.")
                        break

                    if "429" in error_msg or "quota" in error_msg.lower():
                        collector.record_event("llm", "rate_limit", "warning", {"provider": "gemini", "model": current_model, "error": error_msg})
                        logger.warning(f"[WAIT] [Gemini] Quota limit. Rotating key... (Sleeping 5s)")
                        time.sleep(5)
                        continue
                    
                    logger.error(f"[FAIL] [Gemini] Error with {current_model}: {error_msg}")
                    break
        
        msg = f"Gemini failed after {len(self.gemini_keys)} attempts. Last error: {last_error}"
        raise Exception(msg)
        
    def embed_text(self, text: str, model: str = "text-embedding-004") -> List[float]:
        """
        Generates a vector embedding for the given text using Gemini.
        """
        try:
            client = self._get_gemini_client()
            response = client.models.embed_content(
                model=model,
                contents=[text]
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"[FAIL] Embedding failed: {e}")
            return [0.0] * 768 

    def _generate_openai_compatible(self, prompt: str, model: str, system_instruction: str, full_response: bool, base_url: str, api_key: str, provider_name: str, images: list = None, extra_headers: dict = None, request_timeout: float = 180.0):
        if not api_key:
            raise ValueError(f"{provider_name} API Key is missing. Please check Settings.")

        client = OpenAI(
            base_url=base_url, 
            api_key=api_key,
            default_headers=extra_headers,
            max_retries=0,
            timeout=request_timeout
        )
        
        # Some models (Gemma, Llama-2, etc.) don't support the 'system' role or 'developer instructions'
        # We merge the system prompt into the first user message for compatibility.
        use_system_role = True
        model_lower = model.lower()
        if "gemma" in model_lower or "llama-2" in model_lower:
            use_system_role = False
            logger.info(f"ℹ️ [{provider_name}] Model {model} does not support system role. Merging instruction into prompt.")
        
        messages = []
        if system_instruction and use_system_role:
            messages.append({"role": "system", "content": system_instruction})
        
        # Construct final prompt (incorporating system instruction if role is not supported)
        final_prompt = prompt
        if system_instruction and not use_system_role:
            final_prompt = f"### SYSTEM INSTRUCTION ###\n{system_instruction}\n\n### USER PROMPT ###\n{prompt}"

        # Construct payload based on provider and model type
        if images:
            # Standard OpenAI Vision payload
            user_content = [{"type": "text", "text": final_prompt}]
            
            import base64
            for img in images:
                img_data = img
                mime_type = "image/jpeg"
                
                if isinstance(img, dict) and "data" in img:
                    img_data = img["data"]
                    mime_type = img.get("mime_type", "image/jpeg")
                
                if isinstance(img_data, bytes):
                    b64_image = base64.b64encode(img_data).decode('utf-8')
                    user_content.append({
                        "type": "image_url", 
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64_image}"
                        }
                    })
            messages.append({"role": "user", "content": user_content})
            
        else:
            # Standard Text payload (Simple String)
            messages.append({"role": "user", "content": final_prompt})

        logger.info(f"[FALLBACK] [{provider_name}] Sending to [{model}] (Images: {len(images) if images else 0})...")
        start_ts = time.time()

        try:
            # Explicit timeout to prevent hanging
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                timeout=request_timeout
            )
            
            content = response.choices[0].message.content
            
            if full_response:
                latency = time.time() - start_ts
                collector.record_event("llm", "generate", "success", {"provider": provider_name, "model": model, "latency": latency})
                return {
                    "content": content,
                    "model": f"{provider_name.lower()}/{model}"
                }
            return content
            
        except Exception as e:
            error_msg = str(e).lower()
            logger.error(f"[FAIL] [{provider_name}] Error: {e}")
            raise e

    # --- Image Generation ---
    def generate_image(self, prompt: str, provider: str = "openai", model: str = "dall-e-3", size: str = "1024x1024") -> str:
        """
        Generates an image using OpenAI DALL-E 3 or Google Gemini Imagen 3.
        Returns the image URL or Local File Path.
        """
        
        # 1. Google Gemini (Imagen 3) Strategy
        if provider.lower() in ["google", "gemini"]:
             # Use Imagen 3 model by default if not specified or generic 'dall-e-3' passed
             target_model = "imagen-3.0-generate-001" 
             if model and "imagen" in model:
                 target_model = model
             
             return self._generate_image_gemini(prompt, target_model)

        # 2. OpenAI / OpenRouter Strategy (Existing)
        api_key = self.openrouter_key if provider == "openrouter" else self.settings.openai_api_key
        base_url = "https://openrouter.ai/api/v1" if provider == "openrouter" else None
        
        # If using OpenAI direct (default for DALL-E 3)
        if provider == "openai" and not api_key:
             # Fallback to OpenRouter if OpenAI key missing but OpenRouter available
             if self.openrouter_key:
                 provider = "openrouter"
                 api_key = self.openrouter_key
                 base_url = "https://openrouter.ai/api/v1"
                 # OpenRouter might not support dall-e-3 directly via this path, usually it's different models
                 # But let's assume user might have configured it or we use a fallback model
                 if model == "dall-e-3": model = "stabilityai/stable-diffusion-xl-base-1.0" # Fallback model
             else:
                # [Failover to Gemini if OpenAI is missing]
                if self.gemini_keys:
                    logger.info("[WARN] OpenAI Key missing. Auto-failover to Gemini Imagen 3.")
                    return self._generate_image_gemini(prompt, "imagen-3.0-generate-001")
                raise ValueError("OpenAI API Key is missing for Image Generation.")

        client = OpenAI(api_key=api_key, base_url=base_url)
        
        logger.info(f"🎨 Generating Image [{provider}/{model}]...")
        
        try:
            response = client.images.generate(
                model=model,
                prompt=prompt,
                size=size,
                quality="standard",
                n=1,
            )
            
            image_url = response.data[0].url
            return image_url
            
        except Exception as e:
            logger.error(f"[FAIL] Image Generation Failed: {e}")
            raise e

    def _generate_image_gemini(self, prompt: str, model: str) -> str:
        """
        Generates image using Google GenAI SDK (Imagen 3).
        Rotates keys on failure/quota.
        Saves to local temp file and returns absolute path.
        """
        import os
        import uuid
        import base64
        
        # [FIX] Use settings for cross-platform temp directory
        from app.database import SessionLocal
        from app import crud
        db = SessionLocal()
        settings = crud.get_settings(db)
        db.close()
        
        from app.config import settings as settings_conf
        temp_dir = settings.root_download_path if settings and settings.root_download_path else settings_conf.MEDIA_ROOT
        temp_dir = os.path.join(temp_dir, "temp")
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir, exist_ok=True)
            
        last_error = None
        
        # Try up to (Number of Keys * 1) times - strictly rotate 
        attempts = len(self.gemini_keys)
        if attempts == 0:
             raise ValueError("No Gemini API Keys available for Image Generation.")
             
        for i in range(attempts + 1): # +1 to try the first key again if loop wraps or just ensuring coverage
             if i >= attempts: break 
             
             try:
                 client = self._get_gemini_client()
                 logger.info(f"🎨 [Gemini] Generating Image with Imagen 3 (Key #{self.gemini_key_index})...")
                 
                 start_ts = time.time()
                 
                 # GenAI SDK for Images
                 response = client.models.generate_images(
                     model=model,
                     prompt=prompt,
                     config=types.GenerateImagesConfig(
                         number_of_images=1,
                         aspect_ratio="1:1",
                     )
                 )
                 
                 if response.generated_images:
                     image_bytes = response.generated_images[0].image.image_bytes
                     
                     filename = f"gemini_gen_{uuid.uuid4()}.png"
                     filepath = os.path.join(temp_dir, filename)
                     
                     with open(filepath, "wb") as f:
                         f.write(image_bytes)
                         
                     logger.info(f"[OK] [Gemini] Image Saved: {filepath}")
                     return filepath
                 else:
                     raise ValueError("No images returned from Gemini.")

             except Exception as e:
                 error_msg = str(e).lower()
                 last_error = e
                 logger.warning(f"[WARN] [Gemini] Image Gen Error (Key #{self.gemini_key_index}): {e}")
                 
                 if "429" in error_msg or "quota" in error_msg or "403" in error_msg:
                     logger.warning(f"[WAIT] [Gemini] Key Quota Exceeded. Rotating to next key...")
                     continue
                 else:
                     if "safety" in error_msg or "blocked" in error_msg:
                         logger.error(f"[FAIL] [Gemini] Image Blocked by Safety Filters.")
                         raise e
                     continue

        raise last_error or Exception("All Gemini keys failed for Image Generation.")


    # --- Caching Mechanism ---
    def clear_model_cache(self):
        """Force clears the model cache."""
        global _MODEL_CACHE
        _MODEL_CACHE = None
        logger.info("🧹 Model Cache Cleared.")

    async def fetch_available_models(self, db: Optional[Any] = None, force: bool = False, provider: Optional[str] = None) -> dict:
        """
        Fetches models exclusively from OmniRoute sovereign local gateway (port 20128).
        Eliminates all external provider scrapers, latency, and legacy logs.
        """
        global _MODEL_CACHE
        
        # 1. In-Memory Cache Check (5 min TTL)
        if not force and _MODEL_CACHE and "omniroute" in _MODEL_CACHE.get("data", {}):
            age = time.time() - _MODEL_CACHE.get("timestamp", 0)
            if age < 300:
                return _MODEL_CACHE["data"]

        # 2. Persistent DB Cache Check
        if db and not force:
            try:
                from . import crud
                settings = crud.get_settings(db)
                if settings.model_cache and settings.model_cache_updated_at and "omniroute" in settings.model_cache:
                    age = datetime.now() - settings.model_cache_updated_at
                    if age < timedelta(hours=24):
                        _MODEL_CACHE = {
                            "timestamp": time.time(),
                            "data": settings.model_cache
                        }
                        return settings.model_cache
            except Exception as e:
                logger.error(f"Failed to read model cache from DB: {e}")

        logger.info("[OmniRoute] Fetching models directly from local gateway (port 20128)...")
        data = await self._get_available_models_fresh_async()
        
        if db:
            try:
                from . import crud, schemas
                crud.update_settings(db, schemas.SettingsUpdate(
                    model_cache=data,
                    model_cache_updated_at=datetime.now()
                ))
                logger.info("[OK] OmniRoute model cache updated in DB.")
            except Exception as e:
                logger.error(f"Failed to save model cache to DB: {e}")

        _MODEL_CACHE = {
            "timestamp": time.time(),
            "data": data
        }
        return data

    async def _get_available_models_fresh_async(self, target_provider: str = "") -> dict:
        """
        Exclusively fetches models from the OmniRoute sovereign local gateway (port 20128).
        All external scrapers (Google, OpenRouter, Nvidia, Ollama, Groq, etc.) have been permanently deleted.
        """
        omni_models = await self._fetch_youtube1_models_async()
        models = {
            "omniroute": omni_models,
            "youtube1": omni_models
        }
        logger.info(f"[OK] Provider [omniroute] loaded {len(omni_models)} models.")
        return models

    async def _fetch_openai_compatible_async(self, api_key, base_url, provider_name="omniroute", fallback_models=[]):
        if not api_key:
            return fallback_models
        try:
            db_active_model = getattr(self.settings, "script_analysis_model", None) or "viraloop1"
            raw_active_id = db_active_model.replace("omniroute/", "").replace("youtube1/", "").strip()

            async with aiohttp.ClientSession() as session:
                headers = {"Authorization": f"Bearer {api_key}"}
                async with session.get(f"{base_url}/models", headers=headers, timeout=5.0) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to fetch {provider_name} models: Status {resp.status}")
                        return fallback_models
                    
                    data = await resp.json()
                    fetched = []
                    
                    model_list = data.get("data", data) if isinstance(data, dict) else data
                    if not isinstance(model_list, list):
                        return fallback_models

                    for m in model_list:
                        mid = m.get("id") if isinstance(m, dict) else m
                        if not mid:
                            continue

                        mid_str = str(mid).strip()
                        # 선별 규칙: 스마트 라우터(auto/*), 사용자 명명 모델(슬래시 없는 Combo), DB 지정 모델
                        is_auto_router = (mid_str == "auto" or mid_str.startswith("auto/"))
                        is_user_combo = ("/" not in mid_str)
                        is_db_active = (mid_str == raw_active_id)

                        if not (is_auto_router or is_user_combo or is_db_active):
                            continue

                        clean_val = f"omniroute/{mid_str}" if not mid_str.startswith("omniroute/") else mid_str
                        fetched.append({"value": clean_val, "label": mid_str})
                    
                    return fetched
        except Exception as e:
            logger.error(f"Async fetch failed for {provider_name}: {e}")
            return fallback_models

    async def _fetch_youtube1_models_async(self) -> list:
        # 1. Retrieve API key directly from DB Settings
        keys_to_try = []
        if hasattr(self.settings, "youtube1_api_keys") and self.settings.youtube1_api_keys:
            for k in self.settings.youtube1_api_keys:
                if k and k.strip():
                    keys_to_try.append(k.strip())
        
        db_k = getattr(self.settings, "omniroute_api_key", None)
        if db_k and db_k.strip() and db_k.strip() not in keys_to_try:
            keys_to_try.append(db_k.strip())

        key = keys_to_try[0] if keys_to_try else (self.youtube1_keys[0] if self.youtube1_keys else None)
        if not key:
            key = getattr(self.settings, "ninerouter_api_key", None) or "sk-omniroute"

        # 2. Extract active model from DB Settings as primary anchor
        db_active_model = getattr(self.settings, "script_analysis_model", None) or "viraloop1"
        raw_active_id = db_active_model.replace("omniroute/", "").replace("youtube1/", "").strip()

        fallback = [
            {"value": f"omniroute/{raw_active_id}", "label": raw_active_id},
            {"value": "omniroute/auto", "label": "auto"},
            {"value": "omniroute/auto/fast", "label": "auto/fast"},
            {"value": "omniroute/auto/coding", "label": "auto/coding"},
        ]
        if not key:
            return fallback

        gateway_url = getattr(self.settings, "youtube1_base_url", None) or "http://localhost:20128/v1"
        fetched = await self._fetch_openai_compatible_async(key, gateway_url, "omniroute", fallback_models=fallback)
        
        seen = set()
        result = []
        
        # Always place DB configured model at the very top
        active_val = f"omniroute/{raw_active_id}"
        seen.add(active_val)
        result.append({"value": active_val, "label": raw_active_id})

        for m in fetched:
            val = m["value"]
            raw_id = val.replace("omniroute/", "").replace("youtube1/", "").strip()
            omni_val = f"omniroute/{raw_id}"
            if omni_val in seen:
                continue
            seen.add(omni_val)
            result.append({"value": omni_val, "label": raw_id})

        return result

    def test_provider_connectivity(self, provider: str = "omniroute", base_url: str = None, api_key: str = None) -> dict:
        """
        Connectivity test for the OmniRoute sovereign gateway (port 20128).
        """
        try:
            target_url = base_url or getattr(self.settings, "youtube1_base_url", None) or "http://localhost:20128/v1"
            if not target_url.endswith("/v1"):
                target_url = f"{target_url.rstrip('/')}/v1"

            target_key = api_key or (self.youtube1_keys[0] if self.youtube1_keys else None)
            if not target_key:
                target_key = getattr(self.settings, "ninerouter_api_key", None) or "sk-omniroute"

            temp_client = OpenAI(api_key=target_key, base_url=target_url)
            models_res = temp_client.models.list()
            model_count = len(models_res.data) if hasattr(models_res, 'data') else 1
            return {"success": True, "message": f"OmniRoute 로컬 게이트웨이 연결 성공! (사용 가능 모델: {model_count}개 감지)"}

        except Exception as e:
            return {"success": False, "message": parse_llm_error(e, "OmniRoute")}

