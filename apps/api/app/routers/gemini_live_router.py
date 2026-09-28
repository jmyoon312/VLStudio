import os
import json
import base64
import asyncio
import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from google import genai
from google.genai import types

from app.database import SessionLocal
from app.models import Settings

logger = logging.getLogger("gemini_live_router")

router = APIRouter(prefix="/api/agent", tags=["Gemini 3.8 Live"])


def _get_gemini_api_keys() -> List[str]:
    """Retrieve Gemini API keys from DB Settings, falling back to env var."""
    keys: List[str] = []
    try:
        db = SessionLocal()
        s = db.query(Settings).first()
        if s and s.gemini_api_keys:
            keys = [k.strip() for k in s.gemini_api_keys if k and k.strip()]
        db.close()
    except Exception as e:
        logger.warning(f"[GeminiLive] Failed to load keys from DB: {e}")

    if not keys:
        env_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if env_key:
            keys.append(env_key.strip())
    return keys


@router.websocket("/live-session")
async def gemini_live_websocket_endpoint(websocket: WebSocket):
    """
    Bi-directional Multimodal Live WebSocket proxy connecting Frontend to Google Gemini 3.8 Live.
    Streams:
    - Client -> Server: Microphone audio PCM (16kHz), Screen/Canvas JPEG frames, text prompts
    - Server -> Client: Real-time Gemini spoken audio PCM (24kHz), transcript text, tool calls
    """
    await websocket.accept()
    logger.info("🎙️ [GeminiLive] Client connected to live WebSocket proxy.")

    keys = _get_gemini_api_keys()
    if not keys:
        await websocket.send_json({
            "type": "error",
            "message": "등록된 Google Gemini API 키가 없습니다. 환경설정에서 등록해 주세요."
        })
        await websocket.close()
        return

    active_key = keys[0]
    client = genai.Client(api_key=active_key, http_options={"api_version": "v1alpha"})

    # Resolve Multimodal Live model dynamically from DB Settings SSOT
    candidate_models: List[str] = []
    try:
        db = SessionLocal()
        s = db.query(Settings).first()
        custom_live = getattr(s, "gemini_live_model", None)
        if custom_live and isinstance(custom_live, str) and custom_live.strip():
            candidate_models.append(custom_live.split("/")[-1].strip())
        db.close()
    except Exception as e:
        logger.warning(f"[GeminiLive] Failed to load custom live model: {e}")

    env_live_model = os.getenv("GEMINI_LIVE_MODEL")
    if env_live_model and env_live_model.strip() and env_live_model.strip() not in candidate_models:
        candidate_models.append(env_live_model.strip())

    # Add Gemini 3.8 Live (September 2026 official model) as default live model
    default_live = "gemini-3.8-live"
    if default_live not in candidate_models:
        candidate_models.append(default_live)

    system_instruction = (
        "당신은 ViraLoop Studio의 최고 AI 총괄 디렉터이자 대표님의 전속 비서인 '루피(Loopie)'입니다. "
        "대표님의 4대 쇼츠(클래식, 인스타, 군림보, 썰형) 제작 총괄 연출뿐 아니라, "
        "비즈니스 전략, 채널 성장 로드맵, 창의적 스토리텔링, 그리고 인생과 철학에 대한 깊은 대화까지 막힘없이 수행하는 만능 AI 디렉터입니다. "
        "화면 공유 프레임이 전달되면 캔버스의 자막 위치, 상단 타이틀 여백, 색상 조화, 3초 훅 텐션을 직접 보면서 "
        "친절하고 세련된 한국어(1~2문장 내외)로 실시간 피드백을 전달하세요. "
        "군대식/SF식 은어나 딱딱한 표현('지휘관', '사령관', '사령탑', '작전', '하수인' 등)을 일절 사용하지 말고, "
        "대표님에 대한 정중하고 따뜻한 예우와 함께 전문적이고 친절한 상업 프로덕션 및 일상 대화 톤을 일관되게 유지하세요."
    )

    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Aoede"
                )
            )
        ),
        system_instruction=types.Content(
            parts=[types.Part.from_text(text=system_instruction)]
        )
    )

    session_active = True
    connected = False

    try:
        for candidate in candidate_models:
            try:
                logger.info(f"🔄 [GeminiLive] Attempting Live connection with model: {candidate}...")
                async with client.aio.live.connect(model=candidate, config=config) as live_session:
                    connected = True
                    logger.info(f"✅ [GeminiLive] Connected to {candidate} successfully.")
                    await websocket.send_json({
                        "type": "ready",
                        "model": candidate,
                        "message": f"루피 총괄 디렉터 실시간 음성 세션이 연결되었습니다. ({candidate})"
                    })

                    async def client_to_gemini():
                        """Receive data from Frontend WebSocket and forward to Gemini Live."""
                        nonlocal session_active
                        try:
                            while session_active:
                                raw = await websocket.receive_text()
                                data = json.loads(raw)
                                msg_type = data.get("type")

                                if msg_type == "audio_pcm":
                                    # 16kHz PCM audio chunk (base64)
                                    b64_pcm = data.get("pcm")
                                    if b64_pcm:
                                        pcm_bytes = base64.b64decode(b64_pcm)
                                        await live_session.send_realtime_input(
                                            audio=types.Blob(mime_type="audio/pcm;rate=16000", data=pcm_bytes)
                                        )

                                elif msg_type == "screen_frame":
                                    # JPEG screenshot frame (base64)
                                    b64_jpeg = data.get("jpeg")
                                    if b64_jpeg:
                                        if "," in b64_jpeg:
                                            b64_jpeg = b64_jpeg.split(",", 1)[1]
                                        jpeg_bytes = base64.b64decode(b64_jpeg)
                                        await live_session.send_realtime_input(
                                            media=types.Blob(mime_type="image/jpeg", data=jpeg_bytes)
                                        )

                                elif msg_type == "text_prompt":
                                    text = data.get("text", "")
                                    if text:
                                        await live_session.send_client_content(
                                            turns=[
                                                types.Content(
                                                    role="user",
                                                    parts=[types.Part.from_text(text=text)]
                                                )
                                            ],
                                            turn_complete=True
                                        )

                                elif msg_type == "ping":
                                    await websocket.send_json({"type": "pong"})

                        except WebSocketDisconnect:
                            logger.info("[GeminiLive] Frontend WebSocket disconnected.")
                            session_active = False
                        except Exception as e:
                            logger.warning(f"[GeminiLive] client_to_gemini error: {e}")
                            session_active = False

                    async def gemini_to_client():
                        """Receive real-time streamed responses from Gemini Live and forward to Frontend."""
                        nonlocal session_active
                        try:
                            async for response in live_session.receive():
                                if not session_active:
                                    break

                                sc = response.server_content
                                if sc:
                                    # 1. Check for barge-in / user interruption
                                    if getattr(sc, "interrupted", False):
                                        await websocket.send_json({"type": "interrupted"})

                                    # 2. Extract model audio & transcript parts
                                    if sc.model_turn:
                                        for part in sc.model_turn.parts:
                                            if part.inline_data:
                                                # 24kHz PCM audio chunk
                                                b64_audio = base64.b64encode(part.inline_data.data).decode("utf-8")
                                                await websocket.send_json({
                                                    "type": "audio_chunk",
                                                    "pcm": b64_audio,
                                                    "mime": part.inline_data.mime_type or "audio/pcm;rate=24000"
                                                })
                                            if part.text:
                                                await websocket.send_json({
                                                    "type": "transcript",
                                                    "text": part.text
                                                })

                                    if getattr(sc, "turn_complete", False):
                                        await websocket.send_json({"type": "turn_complete"})

                        except Exception as e:
                            logger.warning(f"[GeminiLive] gemini_to_client error: {e}")
                            session_active = False

                    # Run both streaming directions concurrently
                    await asyncio.gather(client_to_gemini(), gemini_to_client())
                    break  # Session finished cleanly
            except Exception as conn_err:
                logger.warning(f"[GeminiLive] Model {candidate} session error: {conn_err}")
                continue

        if not connected:
            await websocket.send_json({
                "type": "error",
                "message": "Gemini 실시간 음성 모델 연결에 실패했습니다. API 키 권한 또는 가용 모델을 확인해 주세요."
            })
            await websocket.close()
            return

    except Exception as e:
        logger.error(f"[GeminiLive] Session connection failed: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Gemini 3.8 Live 세션 연결 실패: {str(e)}"
            })
        except:
            pass
    finally:
        session_active = False
        try:
            await websocket.close()
        except:
            pass
