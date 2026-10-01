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
    """Retrieve Gemini API keys from google_account_pool SSOT, falling back to DB Settings and env var."""
    keys: List[str] = []
    try:
        from app.services.google_account_pool import google_account_pool
        pool_keys = google_account_pool.get_api_keys()
        for k in pool_keys:
            if isinstance(k, dict) and k.get("key"):
                keys.append(k["key"].strip())
            elif isinstance(k, str) and k.strip():
                keys.append(k.strip())
        for a in google_account_pool.get_accounts():
            ak = a.get("api_key")
            if ak and ak.strip() and ak.strip() not in keys:
                keys.append(ak.strip())
    except Exception as pool_err:
        logger.warning(f"[GeminiLive] Failed to load keys from pool: {pool_err}")

    try:
        db = SessionLocal()
        s = db.query(Settings).first()
        if s and s.gemini_api_keys:
            for k in s.gemini_api_keys:
                if k and k.strip() and k.strip() not in keys:
                    keys.append(k.strip())
        db.close()
    except Exception as e:
        logger.warning(f"[GeminiLive] Failed to load keys from DB: {e}")

    env_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if env_key and env_key.strip() and env_key.strip() not in keys:
        keys.append(env_key.strip())
    return keys


@router.websocket("/live-session")
async def gemini_live_websocket_endpoint(websocket: WebSocket, thread_id: Optional[str] = None):
    """
    Bi-directional Multimodal Live WebSocket proxy connecting Frontend to Google Gemini 3.8 Live.
    Streams:
    - Client -> Server: Microphone audio PCM, Screen/Canvas JPEG frames, text prompts
    - Server -> Client: Real-time Gemini spoken audio PCM (24kHz), user/model transcript text, tool calls
    - Integrated with DirectorThread & DirectorMessage for continuous memory and chat synchronization across infinite turns.
    """
    await websocket.accept()
    logger.info(f"🎙️ [GeminiLive] Client connected to live WebSocket proxy (thread_id: {thread_id}).")

    keys = _get_gemini_api_keys()
    if not keys:
        await websocket.send_json({
            "type": "error",
            "message": "등록된 Google Gemini 계정 자격 증명이 없습니다. 계정 풀을 확인해 주세요."
        })
        await websocket.close()
        return

    # Resolve Multimodal Live model candidates (Gemini 3.8 Live highest priority)
    candidate_models = [
        "models/gemini-3.8-live",
        "gemini-3.8-live",
        "models/gemini-3.1-flash-live-preview"
    ]
    try:
        db = SessionLocal()
        s = db.query(Settings).first()
        custom_live = getattr(s, "gemini_live_model", None)
        if custom_live and isinstance(custom_live, str) and custom_live.strip():
            c_name = custom_live.split("/")[-1].strip()
            if c_name not in candidate_models:
                candidate_models.insert(0, f"models/{c_name}")
                candidate_models.insert(1, c_name)
        db.close()
    except Exception as e:
        logger.warning(f"[GeminiLive] Custom live model check: {e}")

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
            from app.models import DirectorThread, DirectorMessage
            db = SessionLocal()
            th = db.query(DirectorThread).filter_by(id=thread_id).first()
            if th:
                msgs = db.query(DirectorMessage).filter_by(thread_id=thread_id).order_by(DirectorMessage.created_at.desc()).limit(15).all()
                msgs.reverse()
                history_lines = []
                for m in msgs:
                    if m.content and m.content.strip():
                        r_name = "사용자" if m.role == "user" else "루피(디렉터)"
                        history_lines.append(f"[{r_name}]: {m.content.strip()[:300]}")
                if history_lines:
                    system_instruction += (
                        f"\n\n[현재 대화방 이전 맥락 및 저장 메모리 - 연속성을 완벽하게 유지하세요]:\n" +
                        "\n".join(history_lines)
                    )
            db.close()
        except Exception as mem_err:
            logger.warning(f"[GeminiLive] Failed to inject thread memory: {mem_err}")

    from app.agent.hermes_core.tools.hermes_tool_registry import get_gemini_tools, hermes_tool_dispatcher
    hermes_tools = get_gemini_tools(camel_case=False)

    config = types.LiveConnectConfig(
        response_modalities=[types.Modality.AUDIO],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Kore"
                )
            )
        ),
        system_instruction=types.Content(
            parts=[types.Part.from_text(text=system_instruction)]
        ),
        tools=hermes_tools,
        input_audio_transcription=types.AudioTranscriptionConfig(language_codes=["ko-KR"]),
        output_audio_transcription=types.AudioTranscriptionConfig(language_codes=["ko-KR"]),
    )

    session_active = True
    connected = False

    try:
        for active_key in keys:
            if connected or not session_active:
                break
            client = genai.Client(api_key=active_key, http_options={"api_version": "v1alpha"})

            for candidate in candidate_models:
                if connected or not session_active:
                    break
                try:
                    logger.info(f"🔄 [GeminiLive] Connecting Live session with key ({active_key[:8]}...) model: {candidate}...")
                    async with client.aio.live.connect(model=candidate, config=config) as live_session:
                        connected = True
                        logger.info(f"✅ [GeminiLive] Connected to {candidate} successfully.")
                        await websocket.send_json({
                            "type": "ready",
                            "model": candidate,
                            "thread_id": thread_id,
                            "message": f"루피 디렉터 실시간 음성 세션이 연결되었습니다. ({candidate})"
                        })

                        curr_user_text: List[str] = []
                        curr_model_text: List[str] = []
                        curr_steps: List[Dict[str, Any]] = []

                        async def client_to_gemini():
                            """Receive data from Frontend WebSocket and forward to Gemini Live."""
                            nonlocal session_active
                            try:
                                while session_active:
                                    raw = await websocket.receive_text()
                                    data = json.loads(raw)
                                    msg_type = data.get("type")

                                    if msg_type == "audio_pcm":
                                        b64_pcm = data.get("pcm")
                                        sample_rate = int(data.get("sampleRate") or data.get("rate") or 16000)
                                        if b64_pcm:
                                            pcm_bytes = base64.b64decode(b64_pcm)
                                            await live_session.send_realtime_input(
                                                audio=types.Blob(mime_type=f"audio/pcm;rate={sample_rate}", data=pcm_bytes)
                                            )

                                    elif msg_type == "screen_frame":
                                        b64_jpeg = data.get("jpeg")
                                        if b64_jpeg:
                                            if "," in b64_jpeg:
                                                b64_jpeg = b64_jpeg.split(",", 1)[1]
                                            jpeg_bytes = base64.b64decode(b64_jpeg)
                                            await live_session.send_realtime_input(
                                                media_chunks=[types.Blob(mime_type="image/jpeg", data=jpeg_bytes)]
                                            )

                                    elif msg_type == "text_prompt":
                                        text = data.get("text", "")
                                        if text:
                                            curr_user_text.append(text)
                                            await live_session.send_client_content(
                                                turns=[
                                                    types.Content(
                                                        role="user",
                                                        parts=[types.Part.from_text(text=text)]
                                                    )
                                                ],
                                                turn_complete=True
                                            )

                                    elif msg_type == "user_speech_text":
                                        text = data.get("text", "")
                                        if text and text.strip():
                                            curr_user_text.append(text.strip())
                                            logger.info(f"🎙️ [GeminiLive] User speech STT captured: {text.strip()}")

                                    elif msg_type == "ping":
                                        await websocket.send_json({"type": "pong"})

                            except WebSocketDisconnect:
                                logger.info("[GeminiLive] Frontend WebSocket disconnected by user.")
                                session_active = False
                            except Exception as e:
                                logger.warning(f"[GeminiLive] client_to_gemini loop note: {e}")
                                session_active = False

                        async def gemini_to_client():
                            """Continuously receive real-time streamed responses across all multi-turn conversations."""
                            nonlocal session_active, curr_user_text, curr_model_text, curr_steps
                            while session_active:
                                try:
                                    async for response in live_session.receive():
                                        if not session_active:
                                            break

                                        # 1. Tool Calls
                                        tc = getattr(response, "tool_call", None)
                                        if tc and getattr(tc, "function_calls", None):
                                            function_responses = []
                                            for call in tc.function_calls:
                                                logger.info(f"🛠️ [GeminiLive] Tool call: {call.name}({call.args})")
                                                step_item = {
                                                    "id": f"step_{len(curr_steps) + 1}",
                                                    "title": f"도구 실행: {call.name}",
                                                    "detail": json.dumps(call.args or {}, ensure_ascii=False),
                                                    "status": "in_progress"
                                                }
                                                curr_steps.append(step_item)
                                                await websocket.send_json({
                                                    "type": "tool_calling",
                                                    "tool_name": call.name,
                                                    "args": call.args,
                                                    "step": step_item
                                                })
                                                try:
                                                    tool_result = await hermes_tool_dispatcher.dispatch(call.name, call.args or {})
                                                    step_item["status"] = "completed"
                                                except Exception as tool_err:
                                                    tool_result = {"status": "error", "message": str(tool_err)}
                                                    step_item["status"] = "failed"
                                                    step_item["detail"] = str(tool_err)

                                                await websocket.send_json({
                                                    "type": "tool_result",
                                                    "tool_name": call.name,
                                                    "result": tool_result,
                                                    "step": step_item
                                                })
                                                function_responses.append(
                                                    types.FunctionResponse(
                                                        name=call.name,
                                                        id=call.id,
                                                        response={"result": tool_result}
                                                    )
                                                )
                                            if function_responses:
                                                await live_session.send_tool_response(function_responses=function_responses)

                                        sc = response.server_content
                                        if sc:
                                            # 2. User Speech Transcript (Gemini Live STT)
                                            in_trans = getattr(sc, "input_transcription", None) or getattr(sc, "interim_input_transcription", None)
                                            if in_trans:
                                                txt = getattr(in_trans, "text", "")
                                                if txt and (not curr_user_text or txt not in "".join(curr_user_text)):
                                                    curr_user_text.append(txt)
                                                    await websocket.send_json({
                                                        "type": "user_transcript",
                                                        "text": "".join(curr_user_text),
                                                        "delta": txt,
                                                        "finished": getattr(in_trans, "finished", False)
                                                    })

                                            # 3. Interruption / Barge-in
                                            if getattr(sc, "interrupted", False):
                                                await websocket.send_json({"type": "interrupted"})

                                            # 4. Model Spoken Audio Chunks & Transcript
                                            if sc.model_turn:
                                                for part in sc.model_turn.parts:
                                                    if part.inline_data:
                                                        b64_audio = base64.b64encode(part.inline_data.data).decode("utf-8")
                                                        await websocket.send_json({
                                                            "type": "audio_chunk",
                                                            "pcm": b64_audio,
                                                            "mime": part.inline_data.mime_type or "audio/pcm;rate=24000"
                                                        })
                                                    if part.text:
                                                        curr_model_text.append(part.text)
                                                        await websocket.send_json({
                                                            "type": "transcript",
                                                            "text": part.text,
                                                            "full_text": "".join(curr_model_text)
                                                        })

                                            # 5. Output audio transcription (real-time spoken text streaming)
                                            if getattr(sc, "output_transcription", None):
                                                out_trans = sc.output_transcription
                                                o_txt = getattr(out_trans, "text", "")
                                                if o_txt:
                                                    curr_model_text.append(o_txt)
                                                    await websocket.send_json({
                                                        "type": "transcript",
                                                        "text": o_txt,
                                                        "full_text": "".join(curr_model_text)
                                                    })

                                            # 6. Turn Complete - Save both messages to SQLite and notify Frontend
                                            if getattr(sc, "turn_complete", False):
                                                full_user = "".join(curr_user_text).strip()
                                                if not full_user:
                                                    full_user = "🎙️ [음성 질문]"
                                                full_model = "".join(curr_model_text).strip()
                                                if thread_id and (full_user or full_model):
                                                    try:
                                                        import uuid
                                                        from datetime import datetime
                                                        from app.models import DirectorMessage, DirectorThread
                                                        db = SessionLocal()
                                                        th = db.query(DirectorThread).filter_by(id=thread_id).first()
                                                        now = datetime.now()
                                                        if not th:
                                                            th = DirectorThread(
                                                                id=thread_id,
                                                                project_id="proj_default",
                                                                title=full_user[:28] if full_user and full_user != "🎙️ [음성 질문]" else "🎙️ 음성 라이브 대화",
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
                                                            if th.title in ["새 대화", "새 채팅", "🎙️ 음성 라이브 대화"] and full_user != "🎙️ [음성 질문]":
                                                                th.title = full_user[:28]
                                                        if full_model:
                                                            a_msg = DirectorMessage(
                                                                id=f"msg_{uuid.uuid4().hex[:12]}",
                                                                thread_id=thread_id,
                                                                role="assistant",
                                                                content=full_model,
                                                                steps=curr_steps if curr_steps else None,
                                                                created_at=now
                                                            )
                                                            db.add(a_msg)
                                                        th.updated_at = now
                                                        db.commit()
                                                        db.close()
                                                        logger.info(f"💾 [GeminiLive] Turn saved to DB thread {thread_id}")
                                                    except Exception as db_save_err:
                                                        logger.warning(f"[GeminiLive] Save turn error: {db_save_err}")

                                                await websocket.send_json({
                                                    "type": "turn_complete",
                                                    "user_text": full_user,
                                                    "assistant_text": full_model
                                                })

                                                # Reset buffers for NEXT turn in the SAME ongoing call
                                                curr_user_text = []
                                                curr_model_text = []
                                                curr_steps = []

                                except Exception as receive_err:
                                    if not session_active:
                                        break
                                    logger.info(f"[GeminiLive] Turn cycle completed, ready for next turn: {receive_err}")
                                    await asyncio.sleep(0.05)

                        # Run both client listening and gemini streaming concurrently until websocket disconnects
                        await asyncio.gather(client_to_gemini(), gemini_to_client())
                        break  # Clean exit on disconnect
                except Exception as conn_err:
                    logger.warning(f"[GeminiLive] Model {candidate} (key {active_key[:8]}...) error: {conn_err}")
                    continue

        if not connected and session_active:
            await websocket.send_json({
                "type": "error",
                "message": "Gemini 3.8 Live 세션 연결에 실패했습니다. 계정 풀 상태를 확인해 주세요."
            })
            await websocket.close()
            return

    except Exception as e:
        logger.error(f"[GeminiLive] Session connection failed: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": f"Gemini 3.8 Live 세션 오류: {str(e)}"
            })
        except:
            pass
    finally:
        session_active = False
        try:
            await websocket.close()
        except:
            pass
