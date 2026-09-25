"""
[ViraLoop Sovereign Hugging Face Music Service]
Cloud Serverless AI MusicGen & SFX Generation Engine with Multi-Key Rotation.
Supports 100% Free, GPU-free Text-to-BGM generation via Hugging Face Serverless API.
"""

import os
import time
import uuid
import hashlib
import logging
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger("huggingface_music_service")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
GENERATED_BGM_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "bgm" / "generated"
GENERATED_SFX_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "sfx" / "generated"

GENERATED_BGM_DIR.mkdir(parents=True, exist_ok=True)
GENERATED_SFX_DIR.mkdir(parents=True, exist_ok=True)


class HuggingFaceMusicService:
    _instance = None
    _key_index: int = 0

    DEFAULT_MODELS = {
        "musicgen_small": "facebook/musicgen-small",
        "musicgen_medium": "facebook/musicgen-medium",
        "musicgen_melody": "facebook/musicgen-melody",
        "audioldm": "cvssp/audioldm-s-full-v2"
    }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @staticmethod
    def get_configured_keys() -> List[str]:
        """Fetch registered Hugging Face API keys from SQLite settings."""
        try:
            import sqlite3
            db_path = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "viral_loop.db"
            if not db_path.exists():
                return []
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT huggingface_api_keys FROM settings LIMIT 1")
            row = cur.fetchone()
            conn.close()
            if row and row[0]:
                import json
                raw = row[0]
                if isinstance(raw, str):
                    try:
                        keys = json.loads(raw)
                        if isinstance(keys, list):
                            return [str(k).strip() for k in keys if str(k).strip()]
                    except Exception:
                        return [k.strip() for k in raw.split(",") if k.strip()]
                elif isinstance(raw, list):
                    return [str(k).strip() for k in raw if str(k).strip()]
        except Exception as e:
            logger.warning(f"Failed to fetch huggingface_api_keys from settings: {e}")
        return []

    def get_active_key(self) -> Optional[str]:
        """Get current active key with round-robin rotation."""
        keys = self.get_configured_keys()
        if not keys:
            return None
        key = keys[self._key_index % len(keys)]
        return key

    def rotate_key(self):
        """Rotate to next key upon rate-limit (429) or error."""
        keys = self.get_configured_keys()
        if keys:
            self._key_index = (self._key_index + 1) % len(keys)
            logger.info(f"Rotated Hugging Face API key to index {self._key_index}")

    async def generate_bgm(
        self,
        prompt: str,
        model_name: str = "facebook/musicgen-small",
        duration_sec: int = 15,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Generates background music from natural language prompt via Hugging Face Serverless API.
        Automatically rotates keys if 429 rate limit is hit.
        """
        keys = self.get_configured_keys()
        if not keys:
            raise ValueError(
                "등록된 Hugging Face API 키가 없습니다. [설정] > [음성 및 사운드 설정]에서 무료 API 키(hf_...)를 1개 이상 등록해 주세요."
            )

        clean_prompt = prompt.strip()
        if not clean_prompt:
            clean_prompt = "Cinematic ambient documentary piano, 70 bpm, emotional, calm background music"

        # Unique file naming
        prompt_hash = hashlib.md5(clean_prompt.encode("utf-8")).hexdigest()[:8]
        timestamp = int(time.time())
        out_filename = f"hf_bgm_{prompt_hash}_{timestamp}.wav"
        out_path = GENERATED_BGM_DIR / out_filename

        endpoints = [
            f"https://router.huggingface.co/hf-inference/models/{model_name}",
            f"https://api-inference.huggingface.co/models/{model_name}"
        ]

        last_error = None
        for attempt in range(max(len(keys), max_retries)):
            current_key = self.get_active_key()
            if not current_key:
                break

            headers = {
                "Authorization": f"Bearer {current_key}",
                "Content-Type": "application/json",
                "x-use-cache": "false"
            }
            payload = {
                "inputs": clean_prompt,
                "parameters": {
                    "max_new_tokens": min(duration_sec * 50, 1500)
                }
            }

            for endpoint in endpoints:
                try:
                    logger.info(f"Calling Hugging Face MusicGen ({endpoint}) with key ***{current_key[-4:]}...")
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        resp = await client.post(endpoint, headers=headers, json=payload)

                        # Handle model loading state (HTTP 503 with estimated_time)
                        if resp.status_code == 503:
                            try:
                                data = resp.json()
                                wait_time = data.get("estimated_time", 20.0)
                                logger.info(f"MusicGen model is loading, waiting {wait_time:.1f}s...")
                                time.sleep(min(wait_time, 15.0))
                                continue
                            except Exception:
                                pass

                        # Handle Rate Limit (HTTP 429) -> Rotate Key
                        if resp.status_code == 429:
                            logger.warning(f"Key ***{current_key[-4:]} hit rate limit (429). Rotating to next key...")
                            self.rotate_key()
                            break

                        if resp.status_code == 200 and resp.content:
                            with open(out_path, "wb") as f:
                                f.write(resp.content)

                            stream_url = f"/api/files/stream?path={urllib.parse.quote(str(out_path))}"
                            logger.info(f"Successfully generated AI BGM: {out_filename} ({len(resp.content)} bytes)")
                            return {
                                "success": True,
                                "file_path": str(out_path),
                                "filename": out_filename,
                                "stream_url": stream_url,
                                "prompt": clean_prompt,
                                "model": model_name,
                                "size_bytes": len(resp.content),
                                "source": "huggingface_musicgen_free"
                            }
                        else:
                            last_error = f"HF Status {resp.status_code}: {resp.text[:200]}"
                except Exception as e:
                    last_error = str(e)
                    logger.warning(f"Attempt failed on {endpoint}: {e}")

            # Try next key on failure
            self.rotate_key()

        raise RuntimeError(f"Hugging Face BGM 생성 실패: {last_error or '모든 API 키의 호출 한도 초과 또는 일시적 모델 응답 지연'}")

    async def test_key(self, api_key: str) -> Dict[str, Any]:
        """Verify if a Hugging Face API key is active and valid."""
        clean_key = api_key.strip()
        if not clean_key:
            return {"valid": False, "message": "API 키가 비어 있습니다."}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://huggingface.co/api/whoami-v2",
                    headers={"Authorization": f"Bearer {clean_key}"}
                )
                if resp.status_code == 200:
                    data = resp.json()
                    user_name = data.get("name") or data.get("preferred_username") or "Hugging Face User"
                    return {
                        "valid": True,
                        "username": user_name,
                        "message": f"성공: '{user_name}' 계정으로 인증되었습니다."
                    }
                elif resp.status_code == 401:
                    return {"valid": False, "message": "유효하지 않은 API 토큰입니다 (401 Unauthorized)."}
                else:
                    return {"valid": False, "message": f"인증 오류 ({resp.status_code}): {resp.text[:100]}"}
        except Exception as e:
            return {"valid": False, "message": f"연결 실패: {str(e)}"}


huggingface_music_service = HuggingFaceMusicService.get_instance()
