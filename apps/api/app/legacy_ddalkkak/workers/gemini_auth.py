import os
import random
import json
from pathlib import Path

# LLM backend selection (mirrors llm.py for direct callers)
def get_llm_backend(): 
    env_backend = os.environ.get("LLM_BACKEND", "").strip().lower()
    if env_backend:
        return env_backend
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings:
            model = getattr(settings, "script_analysis_model", "") or getattr(settings, "default_llm_model", "")
            if "youtube1" in str(model).lower():
                return "youtube1"
            if getattr(settings, "youtube1_api_keys", None):
                return "youtube1"
    except Exception:
        pass
    return "youtube1" if get_youtube1_api_key() else "gemini"

def get_youtube1_api_key(): 
    key = os.environ.get("YOUTUBE1_API_KEY", "") or os.environ.get("NINEROUTER_KEY", "")
    if key:
        return key.strip()
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings and getattr(settings, "youtube1_api_keys", None):
            keys = [k.strip() for k in settings.youtube1_api_keys if k and str(k).strip()]
            if keys:
                return keys[0]
    except Exception:
        pass
    return ""

def get_youtube1_base_url(): 
    return os.environ.get("YOUTUBE1_BASE_URL", "") or os.environ.get("NINEROUTER_URL", "http://localhost:20128/v1")

def get_youtube1_model(): 
    model = os.environ.get("YOUTUBE1_MODEL", "youtube1").strip()
    if "/" in model and model.startswith("youtube1/"):
        model = model.split("/", 1)[1]
    return model or "youtube1"

def get_gemini_key() -> str:
    """Get Gemini API key from DB settings, environment, or .env file. Supports list/comma-separated keys."""
    # 1. Try DB settings (ViraLoop Studio Sovereign DB)
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings:
            if getattr(settings, "gemini_api_keys", None):
                keys = [k.strip() for k in settings.gemini_api_keys if k and str(k).strip()]
                if keys:
                    return random.choice(keys)
            if getattr(settings, "gemini_api_key", None):
                k = str(settings.gemini_api_key).strip()
                if k:
                    return k
    except Exception:
        pass

    # 2. Try environment variables
    keys_str = os.environ.get("GEMINI_API_KEY", "")
    if not keys_str:
        env_path = Path(__file__).parent.parent / ".env"
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                if line.startswith("GEMINI_API_KEY="):
                    keys_str = line.split("=", 1)[1].strip()
                    break
    if not keys_str:
        return ""
    keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    return random.choice(keys) if keys else ""


async def _call_gemini_direct(url: str, payload: dict, headers: dict = None, timeout: float = 180.0) -> dict:
    """Call Google Gemini API directly."""
    import httpx
    _headers = dict(headers or {})
    if "x-goog-api-key" not in _headers:
        key = get_gemini_key()
        if not key:
            raise RuntimeError("GEMINI_API_KEY not set. 작업환경설정(Settings)에서 Gemini API 키를 등록해주세요.")
        _headers["x-goog-api-key"] = key
    
    # URL 안의 모델명이 youtube1/youtube1 등 비정상 모델명인 경우 정규화
    if "models/youtube" in url or "models/youtube1" in url or "models/none" in url:
        url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, json=payload, headers=_headers)
        r.raise_for_status()
        return r.json()


async def call_gemini(url: str, payload: dict, headers: dict = None,
                      timeout: float = 180.0) -> dict:
    """Route Gemini API call based on LLM_BACKEND.
    When youtube1/9router, converts Gemini payload (including vision inline_data) to
    OpenAI multimodal format and sends to 9router. If 9router fails (e.g. 400 Bad Request on complex video parts),
    it automatically falls back to direct Gemini API."""
    if get_llm_backend() == "youtube1":
        import httpx

        gen_config = payload.get("generationConfig", {})
        max_tokens = gen_config.get("maxOutputTokens", 16384)
        temperature = gen_config.get("temperature", 0.3)

        system_parts = (payload.get("systemInstruction", {}) or {}).get("parts", [])
        system = " ".join(p.get("text", "") for p in system_parts) if system_parts else ""

        messages = []
        if system:
            messages.append({"role": "system", "content": system})

        contents = payload.get("contents", [])
        for c in contents:
            parts = (c.get("parts", []) if isinstance(c, dict) else [])
            text_parts = []
            image_parts = []
            for p in parts:
                if isinstance(p, dict):
                    if "text" in p:
                        text_parts.append(p["text"])
                    if "inline_data" in p:
                        mime = p["inline_data"].get("mime_type", "image/jpeg")
                        data = p["inline_data"].get("data", "")
                        image_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{data}"}
                        })
                    if "file_data" in p:
                        file_uri = p["file_data"].get("file_uri", "")
                        mime = p["file_data"].get("mime_type", "video/mp4")
                        if file_uri.startswith("data:"):
                            image_parts.append({
                                "type": "image_url",
                                "image_url": {"url": file_uri}
                            })
                        elif file_uri:
                            text_parts.append(f"[첨부파일: {file_uri}]")

            if image_parts:
                content = []
                joined_text = " ".join(text_parts)
                if joined_text:
                    content.append({"type": "text", "text": joined_text})
                content.extend(image_parts)
                messages.append({"role": "user", "content": content})
            else:
                joined_text = " ".join(text_parts)
                if not messages and not joined_text:
                    messages.append({"role": "user", "content": "Analyze."})
                elif joined_text:
                    messages.append({"role": "user", "content": joined_text})

        body = {
            "model": get_youtube1_model(),
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "stream": False,
        }
        if gen_config.get("responseMimeType") == "application/json":
            body["response_format"] = {"type": "json_object"}

        try:
            req_headers = {"Content-Type": "application/json"}
            api_key = get_youtube1_api_key()
            if api_key:
                req_headers["Authorization"] = f"Bearer {api_key}"

            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(
                    f"{get_youtube1_base_url()}/chat/completions",
                    json=body,
                    headers=req_headers,
                )
                r.raise_for_status()
                data = r.json()
            choice = data.get("choices", [{}])[0]
            text = choice.get("message", {}).get("content", "")
            return {
                "candidates": [{"content": {"parts": [{"text": text}]}}],
                "usageMetadata": {"totalTokenCount": (data.get("usage", {}) or {}).get("total_tokens", 0)},
            }
        except Exception as e:
            # 9Router / YouTube1 fail fallback to direct Gemini if key exists
            print(f"⚠️ [9Router] YouTube1 API Call failed ({e}). Falling back to direct Gemini API...", flush=True)
            return await _call_gemini_direct(url, payload, headers, timeout)

    # Default: call Gemini API directly
    return await _call_gemini_direct(url, payload, headers, timeout)

