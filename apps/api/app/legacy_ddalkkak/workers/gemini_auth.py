import os
import random
import json
from pathlib import Path
import httpx

def parse_db_keys(raw_val) -> list:
    """DB에 저장된 JSON 문자열 또는 리스트/콤마 구분자에서 순수 API Key 목록 추출."""
    if not raw_val:
        return []
    if isinstance(raw_val, list):
        return [str(k).strip() for k in raw_val if k and str(k).strip()]
    if isinstance(raw_val, str):
        val_str = raw_val.strip()
        if val_str.startswith("["):
            try:
                parsed = json.loads(val_str)
                if isinstance(parsed, list):
                    return [str(k).strip() for k in parsed if k and str(k).strip()]
            except Exception:
                pass
        return [k.strip() for k in val_str.split(",") if k.strip()]
    return []

def get_db_settings_model(purpose: str = "subtitle") -> str:
    """시스템 작업환경설정(DB Settings)을 단일 진실 공급원(SSOT)으로 하여 모델명을 동적 추출.
    AGENTS.md Zero Hardcoding Policy 준수."""
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings:
            raw_model = getattr(settings, "script_analysis_model", None) or getattr(settings, "default_llm_model", None)
            if raw_model:
                clean = str(raw_model).strip()
                for prefix in ["omniroute/", "youtube1/", "9router/", "opencode/", "openrouter/", "groq/"]:
                    if clean.startswith(prefix):
                        clean = clean[len(prefix):]
                        break
                if clean:
                    return clean
    except Exception:
        pass
    
    env_m = os.environ.get("SCRIPT_ANALYSIS_MODEL") or os.environ.get("DEFAULT_LLM_MODEL") or os.environ.get("YOUTUBE1_MODEL")
    if env_m:
        clean = env_m.strip()
        for prefix in ["omniroute/", "youtube1/", "9router/", "opencode/", "openrouter/", "groq/"]:
            if clean.startswith(prefix):
                clean = clean[len(prefix):]
                break
        if clean:
            return clean
    return "viraloop1"

def get_youtube1_model(): 
    return get_db_settings_model("subtitle")

def get_youtube1_base_url(): 
    return os.environ.get("YOUTUBE1_BASE_URL", "") or os.environ.get("NINEROUTER_URL", "http://localhost:20128/v1")

def get_youtube1_api_key(): 
    key = os.environ.get("YOUTUBE1_API_KEY", "") or os.environ.get("NINEROUTER_KEY", "")
    if key and key.strip():
        return key.strip()
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings:
            keys = parse_db_keys(getattr(settings, "youtube1_api_keys", None))
            if keys:
                return keys[0]
            single = getattr(settings, "omniroute_api_key", None) or getattr(settings, "ninerouter_api_key", None)
            if single and str(single).strip():
                return str(single).strip()
    except Exception:
        pass
        
    try:
        import sqlite3
        sqlite_path = os.path.expanduser(r"~/.omniroute/storage.sqlite")
        if os.path.exists(sqlite_path):
            with sqlite3.connect(sqlite_path, timeout=1.0) as s_conn:
                s_cur = s_conn.cursor()
                s_cur.execute("SELECT key FROM api_keys WHERE key LIKE 'sk-%' ORDER BY created_at DESC LIMIT 1")
                row = s_cur.fetchone()
                if row and row[0]:
                    return row[0].strip()
    except Exception:
        pass
    return "sk-omniroute"

def get_gemini_key() -> str:
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings = db.query(models.Settings).first()
        db.close()
        if settings:
            keys = parse_db_keys(getattr(settings, "gemini_api_keys", None))
            if keys:
                return random.choice(keys)
            if getattr(settings, "gemini_api_key", None):
                k = str(settings.gemini_api_key).strip()
                if k:
                    return k
    except Exception:
        pass
    return ""

def get_llm_backend():
    return "youtube1"

async def call_gemini(url: str, payload: dict, headers: dict = None,
                      timeout: float = 300.0) -> dict:
    """DB Settings 단일 진실 공급원(SSOT) OmniRoute 엔진 호출 (Zero Hardcoding).
    임의 외부 모델 Fallback을 영구 배제하고 사용자가 지정한 모델만을 사용."""
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
                    # OpenAI image_url 규격은 오직 image/ 만 허용 (video/mp4 삽입 시 400 Bad Request 발생)
                    if mime.startswith("image/"):
                        image_parts.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{data}"}
                        })
                    elif mime.startswith("video/"):
                        text_parts.append("[동영상 시각 타임코드 및 대본 분석 모드]")
                if "file_data" in p:
                    file_uri = p["file_data"].get("file_uri", "")
                    if file_uri.startswith("data:image/"):
                        image_parts.append({
                            "type": "image_url",
                            "image_url": {"url": file_uri}
                        })
                    elif file_uri and not file_uri.startswith("inline:"):
                        text_parts.append(f"[첨부 미디어: {file_uri}]")

        if image_parts:
            content = []
            joined_text = " ".join(text_parts).strip()
            if joined_text:
                content.append({"type": "text", "text": joined_text})
            content.extend(image_parts)
            messages.append({"role": "user", "content": content})
        else:
            joined_text = " ".join(text_parts).strip()
            if not messages and not joined_text:
                messages.append({"role": "user", "content": "분석을 진행해줘."})
            elif joined_text:
                messages.append({"role": "user", "content": joined_text})


    target_model = get_db_settings_model("subtitle")
    if "/models/" in url:
        url_model = url.split("/models/")[-1].split(":")[0].strip()
        if url_model and url_model not in ("gemini-pro", "gemini-flash", "models"):
            target_model = url_model

    # VisionModelGuard: auto 및 gemini-web은 비전(이미지) 분석 미지원 → 안전 가드
    if image_parts:
        lower_target = target_model.lower()
        if lower_target in ("auto", "gemini-web") or lower_target.startswith("auto/"):
            raise ValueError(
                f"[VisionModelGuard] '{target_model}' 모델은 비전(이미지/멀티모달) 분석을 지원하지 않습니다. "
                f"OmniRoute 콤보 또는 DB Settings에서 멀티모달을 지원하는 비전 모델을 지정하십시오."
            )

    body = {
        "model": target_model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }
    if gen_config.get("responseMimeType") == "application/json":
        body["response_format"] = {"type": "json_object"}

    req_headers = {"Content-Type": "application/json"}
    api_key = get_youtube1_api_key()
    if api_key:
        req_headers["Authorization"] = f"Bearer {api_key}"

    base_url = get_youtube1_base_url().rstrip("/")
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(
            f"{base_url}/chat/completions",
            json=body,
            headers=req_headers,
        )
        r.raise_for_status()
        data = r.json()

    if not isinstance(data, dict):
        raise RuntimeError(f"OmniRoute 응답 형식 오류 (dict 아님): {type(data)}")
    if data.get("error"):
        raise RuntimeError(f"OmniRoute 에러 응답: {data.get('error')}")

    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"OmniRoute choices 응답 누락: {data}")

    first_choice = choices[0]
    msg = first_choice.get("message", {})
    text = msg.get("content") or msg.get("reasoning_content") or ""
    try:
        print(f"[gemini_auth] RAW TEXT: {repr(text)[:150]}", flush=True)
    except Exception:
        pass
    if not text.strip():
        # finish_reason이 length 등인 경우
        raise RuntimeError(f"OmniRoute 응답 본문이 비어 있습니다 (finish_reason: {first_choice.get('finish_reason')})")

    return {
        "candidates": [{"content": {"parts": [{"text": text}]}}],
        "usageMetadata": {"totalTokenCount": (data.get("usage", {}) or {}).get("total_tokens", 0)},
    }

