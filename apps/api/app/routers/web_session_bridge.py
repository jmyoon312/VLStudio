"""
Web Session Bridge Router for Hermes Agent and Sovereign LLMs.
Mounts at /api/web_session/v1 to provide full OpenAI-compatible /chat/completions and /models endpoints.
Direct Native Provider Sovereignty Law: Routes to user's configured sovereign model.
"""

import sys
import os
import json
import uuid
import time
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("web_session_bridge")

router = APIRouter(tags=["web_session_bridge"])


@router.get("/models")
async def list_models():
    """Returns available models for OpenAI client compatibility."""
    return {
        "object": "list",
        "data": [
            {"id": "viraloop1", "object": "model", "owned_by": "viraloop"},
            {"id": "gemini-3.8-flash-tiered", "object": "model", "owned_by": "google"},
            {"id": "GPT-6.1", "object": "model", "owned_by": "openai"},
            {"id": "claude-3-7-sonnet", "object": "model", "owned_by": "anthropic"}
        ]
    }


@router.post("/chat/completions")
async def create_chat_completion(request: Request):
    """
    OpenAI-compatible /chat/completions endpoint for Hermes Agent (AIAgent).
    Accepts messages, tools, model, and optional streaming flag.
    Dispatches directly to Sovereign AI provider.
    """
    try:
        body = await request.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {e}")

    messages = body.get("messages", [])
    model = body.get("model", "viraloop1")
    stream = body.get("stream", False)
    tools = body.get("tools", [])

    system_instruction = ""
    history_turns = []
    user_prompt = ""

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if isinstance(content, list):
            # Extract text parts
            parts = [p.get("text", "") for p in content if isinstance(p, dict) and p.get("type") == "text"]
            content = " ".join(parts)
        elif not isinstance(content, str):
            content = str(content)

        if role == "system":
            if system_instruction:
                system_instruction += "\n\n" + content
            else:
                system_instruction = content
        elif role in ("user", "assistant"):
            history_turns.append({"role": role, "content": content})

    if history_turns and history_turns[-1]["role"] == "user":
        user_prompt = history_turns[-1]["content"]
        history_context = history_turns[:-1]
    else:
        user_prompt = history_turns[-1]["content"] if history_turns else "안녕하세요"
        history_context = history_turns[:-1] if len(history_turns) > 1 else []

    logger.info(f"🌐 [WebSessionBridge] Chat completion: model={model}, stream={stream}, prompt_len={len(user_prompt)}")

    # Route via DirectorStreamRouter
    from app.agent.hermes_core.components.director_stream_router import DirectorStreamRouter

    # Map model name to provider
    provider = "Google Gemini"
    m_lower = model.lower()
    if "codex" in m_lower or "gpt" in m_lower or "openai" in m_lower:
        provider = "OpenAI Codex"
    elif "claude" in m_lower:
        provider = "Anthropic Claude"
    elif "deepseek" in m_lower:
        provider = "DeepSeek"
    elif "gemini" in m_lower:
        provider = "Google Gemini"

    if stream:
        async def sse_generator():
            call_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
            created_ts = int(time.time())
            try:
                async for chunk in DirectorStreamRouter.stream_chat(
                    prompt=user_prompt,
                    provider=provider,
                    model=model,
                    history=history_context,
                    system_guidance=system_instruction
                ):
                    if chunk:
                        delta_payload = {
                            "id": call_id,
                            "object": "chat.completion.chunk",
                            "created": created_ts,
                            "model": model,
                            "choices": [
                                {
                                    "index": 0,
                                    "delta": {"content": chunk},
                                    "finish_reason": None
                                }
                            ]
                        }
                        yield f"data: {json.dumps(delta_payload, ensure_ascii=False)}\n\n"

                final_chunk = {
                    "id": call_id,
                    "object": "chat.completion.chunk",
                    "created": created_ts,
                    "model": model,
                    "choices": [
                        {
                            "index": 0,
                            "delta": {},
                            "finish_reason": "stop"
                        }
                    ]
                }
                yield f"data: {json.dumps(final_chunk, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as stream_err:
                logger.error(f"[WebSessionBridge] Streaming error: {stream_err}")
                err_payload = {"error": {"message": str(stream_err), "type": "server_error"}}
                yield f"data: {json.dumps(err_payload)}\n\n"

        return StreamingResponse(
            sse_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    else:
        # Non-streaming: accumulate full response
        full_text = ""
        try:
            async for chunk in DirectorStreamRouter.stream_chat(
                prompt=user_prompt,
                provider=provider,
                model=model,
                history=history_context,
                system_guidance=system_instruction
            ):
                if chunk:
                    full_text += chunk
        except Exception as gen_err:
            logger.error(f"[WebSessionBridge] Generation error: {gen_err}")
            full_text = f"죄송합니다. 지능 모델 응답 생성 중 오류가 발생했습니다: {gen_err}"

        completion_id = f"chatcmpl-{uuid.uuid4().hex[:12]}"
        return JSONResponse({
            "id": completion_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model,
            "choices": [
                {
                    "index": 0,
                    "message": {
                        "role": "assistant",
                        "content": full_text
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": len(user_prompt) // 4,
                "completion_tokens": len(full_text) // 4,
                "total_tokens": (len(user_prompt) + len(full_text)) // 4
            }
        })
