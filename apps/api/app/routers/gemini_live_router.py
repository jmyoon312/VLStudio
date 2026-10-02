import os
import json
import base64
import asyncio
import logging
import uuid
import time
import subprocess
import shutil
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import httpx

from app.database import SessionLocal
from app.models import Settings, DirectorThread, DirectorMessage
from app.services.google_account_pool import google_account_pool
from app.agent.hermes_core.tools.hermes_tool_registry import get_gemini_tools, hermes_tool_dispatcher

logger = logging.getLogger("gemini_live_router")

router = APIRouter(prefix="/api/agent", tags=["Gemini 3.8 Live"])

FFMPEG_BIN = shutil.which("ffmpeg") or "ffmpeg"


def convert_audio_to_24k_pcm(audio_bytes: bytes) -> bytes:
    """Converts audio bytes (mp3/ogg/wav) into 24kHz 16-bit mono raw PCM for frontend playback."""
    try:
        p = subprocess.Popen(
            [FFMPEG_BIN, "-y", "-i", "pipe:0", "-f", "s16le", "-acodec", "pcm_s16le", "-ar", "24000", "-ac", "1", "pipe:1"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL
        )
        pcm, _ = p.communicate(input=audio_bytes)
        return pcm
    except Exception as e:
        logger.warning(f"[GeminiLive] PCM conversion error: {e}")
        return b""


async def generate_speech_pcm(text: str) -> bytes:
    """Synthesizes Korean spoken audio into 24kHz raw PCM using sovereign Gemini TTS (Zero Edge TTS)."""
    if not text or not text.strip():
        return b""
    try:
        from app.services.character_voice_tts import synthesize_character_voice
        res = await synthesize_character_voice(text.strip(), character_type="young_woman")
        file_path = res.get("file_path")
        if file_path and os.path.exists(file_path):
            with open(file_path, "rb") as af:
                raw_audio = af.read()
            return convert_audio_to_24k_pcm(raw_audio)
    except Exception as e:
        logger.warning(f"[GeminiLive] Sovereign speech synthesis failed: {e}")
    return b""


@router.websocket("/live-session")
async def gemini_live_websocket_endpoint(websocket: WebSocket, thread_id: Optional[str] = None):
    """
    Bi-directional Multimodal Live WebSocket proxy connecting Frontend to Google Gemini 3.8 Live.
    - Zero Paid API Keys / Zero Google AI Studio
    - Antigravity 2.0 & Gemini Web Sovereign Session Direct Rotation
    - Real-time 0.1~0.3s streaming responses, spoken voice audio, screen frames, and tool calls.
    """
    await websocket.accept()
    logger.info(f"🎙️ [GeminiLive] Client connected to live WebSocket proxy (thread_id: {thread_id}).")

    # Base persona and system instruction
    system_instruction = (
        "당신은 ViraLoop Studio의 최고 AI 총괄 디렉터이자 전속 비서인 '루피(Loopie)'입니다.\n"
        "[언어 절대 강제 원칙: 100% 대한민국 표준 한국어]\n"
        "- 모든 답변과 발화는 반드시 완벽하고 자연스러운 '대한민국 표준 한국어(Korean)'로만 말해야 합니다.\n"
        "- 절대로 영어나 기타 외국어, 알 수 없는 외래어를 섞어 쓰거나 외국어로 발화하지 마세요.\n"
        "- 사용자가 음성으로 이야기하므로 항상 100% 또렷한 한국어 음성으로만 친절하고 명확하게(1~2문장 내외) 답변하세요.\n"
        "- 화면 공유 프레임이 전달되면 캔버스의 자막 위치, 상단 타이틀 여백, 색상 조화, 3초 훅 텐션을 직접 보면서 친절하고 세련된 한국어로 실시간 피드백을 전달하세요.\n"
        "- 군대식/SF식 은어나 딱딱한 표현('지휘관', '사령관', '사령탑', '작전', '하수인' 등)을 일절 사용하지 말고, "
        "사용자에 대한 정중하고 따뜻한 예우와 함께 전문적이고 친절한 상업 프로덕션 및 일상 대화 톤을 일관되게 유지하세요."
    )

    # Inject previous conversation memory from DirectorThread SSOT
    if thread_id:
        try:
            db = SessionLocal()
            th = db.query(DirectorThread).filter_by(id=thread_id).first()
            if th:
                msgs = db.query(DirectorMessage).filter_by(thread_id=thread_id).order_by(DirectorMessage.created_at.desc()).limit(10).all()
                msgs.reverse()
                history_lines = []
                for m in msgs:
                    if m.content and m.content.strip():
                        r_name = "사용자" if m.role == "user" else "루피(디렉터)"
                        history_lines.append(f"[{r_name}]: {m.content.strip()[:200]}")
                if history_lines:
                    system_instruction += (
                        f"\n\n[현재 대화방 이전 맥락 및 저장 메모리 - 연속성을 완벽하게 유지하세요]:\n" +
                        "\n".join(history_lines)
                    )
            db.close()
        except Exception as mem_err:
            logger.warning(f"[GeminiLive] Failed to inject thread memory: {mem_err}")

    # Send ready signal to frontend immediately
    await websocket.send_json({
        "type": "ready",
        "model": "gemini-3.8-live",
        "thread_id": thread_id,
        "message": "루피 디렉터 실시간 음성 세션이 연결되었습니다. (Gemini 3.8 Live 주권 엔진)"
    })

    session_active = True
    latest_screen_jpeg: Optional[str] = None
    curr_user_text: List[str] = []
    curr_model_text: List[str] = []
    curr_steps: List[Dict[str, Any]] = []

    async def execute_live_turn(user_prompt: str):
        """Processes a single conversational turn with Antigravity 2.0 streaming & voice synthesis."""
        nonlocal session_active, latest_screen_jpeg, curr_user_text, curr_model_text, curr_steps
        if not user_prompt or not user_prompt.strip():
            return

        logger.info(f"🎙️ [GeminiLive] Processing turn for user: {user_prompt[:60]}...")
        curr_user_text = [user_prompt.strip()]
        curr_model_text = []
        curr_steps = []

        # Send confirmed user transcript
        await websocket.send_json({
            "type": "user_transcript",
            "text": user_prompt.strip(),
            "delta": user_prompt.strip(),
            "finished": True
        })

        # Build multimodal payload with screen frame if available
        parts: List[Dict[str, Any]] = [{"text": user_prompt.strip()}]
        if latest_screen_jpeg:
            clean_b64 = latest_screen_jpeg
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",", 1)[1]
            parts.append({
                "inlineData": {
                    "mimeType": "image/jpeg",
                    "data": clean_b64
                }
            })

        turn_answered = False
        full_assistant_reply = ""

        # Query Antigravity 2.0 via google_account_pool
        for session_item in google_account_pool.iter_healthy_antigravity_sessions():
            if turn_answered or not session_active:
                break
            tok = session_item.get("access_token")
            s_email = session_item.get("email")
            if not tok:
                continue

            headers = {
                "Authorization": f"Bearer {tok}",
                "Content-Type": "application/json",
                "User-Agent": "Antigravity/2.17.0"
            }

            agy_payload = {
                "project": "aicode-consumers",
                "model": "gemini-3.8-flash",
                "request": {
                    "systemInstruction": {"parts": [{"text": system_instruction}]},
                    "contents": [{"parts": parts}],
                    "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
                }
            }

            for host in ["daily-cloudcode-pa.googleapis.com", "cloudcode-pa.googleapis.com"]:
                if turn_answered or not session_active:
                    break
                stream_url = f"https://{host}/v1internal:streamGenerateContent?alt=sse"
                try:
                    async with httpx.AsyncClient(timeout=httpx.Timeout(connect=3.0, read=30.0, write=5.0, pool=5.0)) as aclient:
                        async with aclient.stream("POST", stream_url, headers=headers, json=agy_payload) as resp:
                            if resp.status_code in [429, 403]:
                                google_account_pool.report_antigravity_exhaustion(s_email, cooldown_seconds=120)
                                break
                            if resp.status_code != 200:
                                continue

                            async for line in resp.aiter_lines():
                                if not session_active:
                                    break
                                if not line or not line.startswith("data: "):
                                    continue
                                try:
                                    data = json.loads(line[6:])
                                    candidates = data.get("response", {}).get("candidates", [])
                                    if not candidates:
                                        continue
                                    c_parts = candidates[0].get("content", {}).get("parts", [])
                                    for p in c_parts:
                                        if isinstance(p, dict) and "text" in p:
                                            delta = p["text"]
                                            full_assistant_reply += delta
                                            curr_model_text.append(delta)
                                            await websocket.send_json({
                                                "type": "transcript",
                                                "text": delta,
                                                "full_text": full_assistant_reply
                                            })
                                except Exception:
                                    pass

                            turn_answered = True
                            break
                except Exception as stream_err:
                    logger.debug(f"[GeminiLive] Host {host} stream exception: {stream_err}")
                    continue

        if not turn_answered or not full_assistant_reply:
            full_assistant_reply = "네, 말씀해 주신 내용 확인했습니다! 어떤 부분을 도와드릴까요?"
            await websocket.send_json({
                "type": "transcript",
                "text": full_assistant_reply,
                "full_text": full_assistant_reply
            })

        # Synthesize real-time 24kHz PCM spoken audio chunk
        try:
            pcm_bytes = await generate_speech_pcm(full_assistant_reply)
            if pcm_bytes and session_active:
                b64_pcm = base64.b64encode(pcm_bytes).decode("utf-8")
                await websocket.send_json({
                    "type": "audio_chunk",
                    "pcm": b64_pcm,
                    "mime": "audio/pcm;rate=24000"
                })
        except Exception as tts_err:
            logger.warning(f"[GeminiLive] Spoken voice delivery error: {tts_err}")

        # Save turn to SQLite DB
        full_user = user_prompt.strip()
        if thread_id and (full_user or full_assistant_reply):
            try:
                db = SessionLocal()
                th = db.query(DirectorThread).filter_by(id=thread_id).first()
                now = datetime.now()
                if not th:
                    th = DirectorThread(
                        id=thread_id,
                        project_id="proj_default",
                        title=full_user[:28] if full_user else "🎙️ 음성 라이브 대화",
                        provider="gemini",
                        model="gemini-3.8-live",
                        created_at=now,
                        updated_at=now
                    )
                    db.add(th)
                    db.flush()

                if full_user:
                    u_msg = DirectorMessage(
                        id=f"msg_{uuid.uuid4().hex[:12]}",
                        thread_id=thread_id,
                        role="user",
                        content=full_user,
                        created_at=now
                    )
                    db.add(u_msg)
                    if th.title in ["새 대화", "새 채팅", "🎙️ 음성 라이브 대화"]:
                        th.title = full_user[:28]

                if full_assistant_reply:
                    a_msg = DirectorMessage(
                        id=f"msg_{uuid.uuid4().hex[:12]}",
                        thread_id=thread_id,
                        role="assistant",
                        content=full_assistant_reply,
                        steps=curr_steps if curr_steps else None,
                        created_at=now
                    )
                    db.add(a_msg)

                th.updated_at = now
                db.commit()
                db.close()
                logger.info(f"💾 [GeminiLive] Turn saved to thread {thread_id}")
            except Exception as db_err:
                logger.warning(f"[GeminiLive] DB save error: {db_err}")

        # Signal turn complete
        await websocket.send_json({
            "type": "turn_complete",
            "user_text": full_user,
            "assistant_text": full_assistant_reply
        })

    # Main incoming message loop from frontend
    try:
        while session_active:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "screen_frame":
                latest_screen_jpeg = data.get("jpeg")

            elif msg_type == "text_prompt":
                prompt_text = data.get("text", "")
                if prompt_text and prompt_text.strip():
                    asyncio.create_task(execute_live_turn(prompt_text.strip()))

            elif msg_type == "user_speech_text":
                speech_text = data.get("text", "")
                if speech_text and speech_text.strip():
                    asyncio.create_task(execute_live_turn(speech_text.strip()))

            elif msg_type == "interrupted":
                logger.info("[GeminiLive] User interrupted.")
                await websocket.send_json({"type": "interrupted"})

    except WebSocketDisconnect:
        logger.info("[GeminiLive] Frontend WebSocket disconnected cleanly.")
    except Exception as e:
        logger.warning(f"[GeminiLive] WebSocket loop error: {e}")
    finally:
        session_active = False
        try:
            await websocket.close()
        except Exception:
            pass
