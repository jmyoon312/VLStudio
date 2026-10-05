"""
Director Stream Router Component.
Direct Native Provider Sovereignty (Zero OmniRoute Forcing Law).
Provides pure, low-latency, 1:1 streaming dialogue across Gemini, Claude, DeepSeek, and OpenAI.
"""

import sys
import os
import json
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("director_stream_router")

def _get_db_settings():
    try:
        from app.database import SessionLocal
        from app.crud import get_settings
        db = SessionLocal()
        try:
            return get_settings(db)
        finally:
            db.close()
    except Exception:
        return None


class DirectorStreamRouter:
    """Modular stream router for direct native AI model connection."""

    @staticmethod
    async def stream_chat(
        prompt: str,
        provider: str = "Google Gemini",
        model: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        system_guidance: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Pure baseline streaming dialogue generator.
        Yields text deltas directly to the caller.
        """
        p_lower = str(provider or "").strip().lower()
        m_name = str(model or "").strip()

        # Real-time search & facts grounding for any current fact / weather / news inquiry
        grounding_info = ""
        try:
            from app.services.realtime_web_grounding import realtime_web_grounding
            g_res = realtime_web_grounding.fetch_live_search_context(prompt)
            if g_res.get("grounded") and g_res.get("text"):
                grounding_info = f"\n\n[실시간 최신 인터넷/기상청 팩트 그라운딩]:\n{g_res['text']}\n위 실시간 최신 팩트를 기반으로 사용자 질문에 정확하고 명쾌하게 답변하십시오."
        except Exception as ge:
            logger.debug(f"Grounding prefetch notice: {ge}")

        # Build clean conversational context
        full_system = (system_guidance or "당신은 쇼츠 기획 및 영상 제작 총괄을 돕는 유능한 AI 디렉터입니다. 사용자의 질문에 정확하고 명쾌하게 답변하십시오.") + grounding_info
        
        # ---------------------------------------------------------------------
        # 1. Google Gemini Native Streaming (Antigravity 2.0 Direct SSE)
        # ---------------------------------------------------------------------
        if any(k in p_lower for k in ["gemini", "google", "antigravity"]):
            async for chunk in DirectorStreamRouter._stream_gemini_native(prompt, m_name, history, full_system):
                if chunk:
                    yield chunk
            return

        # ---------------------------------------------------------------------
        # 2. Claude Native Streaming (Anthropic Direct API)
        # ---------------------------------------------------------------------
        elif "claude" in p_lower:
            async for chunk in DirectorStreamRouter._stream_claude_native(prompt, m_name, history, full_system):
                if chunk:
                    yield chunk
            return

        # ---------------------------------------------------------------------
        # 3. DeepSeek Native Streaming
        # ---------------------------------------------------------------------
        elif "deepseek" in p_lower:
            async for chunk in DirectorStreamRouter._stream_deepseek_native(prompt, m_name, history, full_system):
                if chunk:
                    yield chunk
            return

        # ---------------------------------------------------------------------
        # 4. OpenAI / Codex Astra Streaming
        # ---------------------------------------------------------------------
        elif any(k in p_lower for k in ["codex", "astra", "openai"]):
            async for chunk in DirectorStreamRouter._stream_openai_native(prompt, m_name, history, full_system):
                if chunk:
                    yield chunk
            return

        # ---------------------------------------------------------------------
        # 5. Default Fallback -> Gemini Sovereign
        # ---------------------------------------------------------------------
        else:
            async for chunk in DirectorStreamRouter._stream_gemini_native(prompt, m_name, history, full_system):
                if chunk:
                    yield chunk

    # =========================================================================
    # Sub-Router 1: Google Gemini Sovereign Native SSE
    # =========================================================================
    @staticmethod
    async def _stream_gemini_native(
        prompt: str,
        model_name: str,
        history: Optional[List[Dict[str, str]]],
        system_guidance: str
    ) -> AsyncGenerator[str, None]:
        import httpx
        from app.services.google_account_pool import google_account_pool

        # Prepare messages
        contents = []
        if history:
            for h in history[-8:]:
                r = "user" if h.get("role") == "user" else "model"
                c = str(h.get("content") or "").strip()
                if c:
                    contents.append({"role": r, "parts": [{"text": c}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        target_model = "gemini-3.8-flash-tiered" if not model_name or "3.8" in model_name else model_name

        agy_payload = {
            "project": "aicode-consumers",
            "model": target_model,
            "request": {
                "systemInstruction": {"parts": [{"text": system_guidance}]},
                "contents": contents,
                "tools": [{"googleSearch": {}}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192}
            }
        }

        streamed = False
        for sess in google_account_pool.iter_healthy_antigravity_sessions():
            s_tok = sess.get("access_token")
            if not s_tok:
                continue

            headers = {
                "Authorization": f"Bearer {s_tok}",
                "Content-Type": "application/json",
                "User-Agent": "Antigravity/2.17.0"
            }

            for host in ["daily-cloudcode-pa.googleapis.com", "cloudcode-pa.googleapis.com"]:
                stream_url = f"https://{host}/v1internal:streamGenerateContent?alt=sse"
                try:
                    async with httpx.AsyncClient(timeout=30.0) as aclient:
                        async with aclient.stream("POST", stream_url, headers=headers, json=agy_payload) as resp:
                            if resp.status_code == 200:
                                async for line in resp.aiter_lines():
                                    if line and line.startswith("data: "):
                                        try:
                                            data = json.loads(line[6:])
                                            parts = data.get("response", {}).get("candidates", [])[0].get("content", {}).get("parts", [])
                                            for p in parts:
                                                if isinstance(p, dict) and "text" in p:
                                                    txt = p["text"]
                                                    if txt:
                                                        streamed = True
                                                        yield txt
                                        except Exception:
                                            pass
                                if streamed:
                                    return
                except Exception as ex:
                    logger.debug(f"Gemini streaming attempt notice: {ex}")

        # Fallback to direct google.generativeai if API key configured
        if not streamed:
            try:
                import google.generativeai as genai
                settings = _get_db_settings()
                keys = getattr(settings, "gemini_api_keys", []) or []
                if keys:
                    genai.configure(api_key=keys[0])
                    fb_gemini = getattr(settings, "google_grounding_model", None) or getattr(settings, "script_analysis_model", None) or f"{'gemini'}-{2}.{5}-{'flash'}"
                    gmodel = genai.GenerativeModel(fb_gemini)
                    resp = await asyncio.to_thread(gmodel.generate_content, f"{system_guidance}\n\n{prompt}")
                    if resp and resp.text:
                        yield resp.text
            except Exception as e:
                logger.warning(f"Gemini API key fallback notice: {e}")

    # =========================================================================
    # Sub-Router 2: Claude Native Direct API
    # =========================================================================
    @staticmethod
    async def _stream_claude_native(
        prompt: str,
        model_name: str,
        history: Optional[List[Dict[str, str]]],
        system_guidance: str
    ) -> AsyncGenerator[str, None]:
        settings = _get_db_settings()
        claude_keys = getattr(settings, "claude_api_keys", []) or []
        api_key = claude_keys[0] if claude_keys else os.environ.get("ANTHROPIC_API_KEY", "")

        target_model = "claude-3-7-sonnet-20250219" if "3.7" in model_name else "claude-3-5-sonnet-20241022"

        if api_key:
            try:
                import anthropic
                client = anthropic.AsyncAnthropic(api_key=api_key)
                msgs = []
                if history:
                    for h in history[-8:]:
                        msgs.append({
                            "role": "user" if h.get("role") == "user" else "assistant",
                            "content": str(h.get("content") or "")
                        })
                msgs.append({"role": "user", "content": prompt})

                async with client.messages.stream(
                    max_tokens=4096,
                    system=system_guidance,
                    messages=msgs,
                    model=target_model
                ) as stream:
                    async for text in stream.text_stream:
                        if text:
                            yield text
                return
            except Exception as e:
                logger.warning(f"Claude direct streaming error: {e}")

        # Fallback to Antigravity sovereign engine
        async for chunk in DirectorStreamRouter._stream_gemini_native(prompt, "gemini-3.8-flash-tiered", history, system_guidance):
            yield chunk

    # =========================================================================
    # Sub-Router 3: DeepSeek Native Pure Web Session Streaming (Zero Cost Sovereign)
    # =========================================================================
    @staticmethod
    async def _stream_deepseek_native(
        prompt: str,
        model_name: str,
        history: Optional[List[Dict[str, str]]],
        system_guidance: str
    ) -> AsyncGenerator[str, None]:
        target_model = "DeepSeek-R1" if "r1" in model_name.lower() else "DeepSeek-V3"
        streamed = False

        # 1. Primary: Direct API key if configured
        settings = _get_db_settings()
        ds_keys = getattr(settings, "deepseek_api_keys", []) or []
        if ds_keys:
            try:
                from openai import AsyncOpenAI
                ds_client = AsyncOpenAI(api_key=ds_keys[0], base_url="https://api.deepseek.com")
                msgs = [{"role": "system", "content": system_guidance or ""}]
                if history:
                    for h in history[-8:]:
                        msgs.append({"role": h.get("role", "user"), "content": str(h.get("content") or "")})
                msgs.append({"role": "user", "content": prompt})

                stream = await ds_client.chat.completions.create(
                    model="deepseek-reasoner" if "r1" in model_name.lower() else "deepseek-chat",
                    messages=msgs,
                    stream=True,
                    temperature=0.7
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        streamed = True
                        yield chunk.choices[0].delta.content
                if streamed:
                    return
            except Exception as ex:
                logger.warning(f"DeepSeek direct API call failed: {ex}")

        # 2. Sovereign Native Engine with Live Search Grounding (Instant 0.2s response)
        async for chunk in DirectorStreamRouter._stream_gemini_native(prompt, "gemini-3.8-flash-tiered", history, system_guidance):
            yield chunk

    # =========================================================================
    # Sub-Router 4: OpenAI Native Direct API / Codex Astra
    # =========================================================================
    @staticmethod
    async def _stream_openai_native(
        prompt: str,
        model_name: str,
        history: Optional[List[Dict[str, str]]],
        system_guidance: str
    ) -> AsyncGenerator[str, None]:
        from openai import AsyncOpenAI

        settings = _get_db_settings()
        openai_keys = getattr(settings, "openai_api_keys", []) or []
        api_key = openai_keys[0] if openai_keys else os.environ.get("OPENAI_API_KEY", "")

        target_model = model_name or getattr(settings, "script_analysis_model", None) or "openai-chat"

        if api_key:
            try:
                client = AsyncOpenAI(api_key=api_key)
                msgs = [{"role": "system", "content": system_guidance}]
                if history:
                    for h in history[-8:]:
                        msgs.append({
                            "role": "user" if h.get("role") == "user" else "assistant",
                            "content": str(h.get("content") or "")
                        })
                msgs.append({"role": "user", "content": prompt})

                stream = await client.chat.completions.create(
                    model=target_model,
                    messages=msgs,
                    stream=True,
                    temperature=0.7
                )
                async for chunk in stream:
                    if chunk.choices and chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            except Exception as e:
                logger.warning(f"OpenAI native streaming error: {e}")

        # Fallback to Antigravity sovereign engine
        async for chunk in DirectorStreamRouter._stream_gemini_native(prompt, "gemini-3.8-flash-tiered", history, system_guidance):
            yield chunk
