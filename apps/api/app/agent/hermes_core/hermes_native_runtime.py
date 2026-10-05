"""
Hermes Native Agent Runtime Bridge (nesquena pattern).
Directly imports and binds NousResearch Hermes AIAgent from local installation:
C:\\Users\\jmyoo\\AppData\\Local\\hermes\\hermes-agent\\run_agent.py

Provides 100% native function calling, tool execution, and real-time streaming:
- Zero CLI Subprocess (In-Process Python Binding)
- Pure Native OS Resource Control (file_tools, terminal_tool, etc.)
- Real-time tool execution notifications & token stream bridging
"""

import sys
import os
import asyncio
import logging
import queue
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, List, Optional

logger = logging.getLogger("hermes_native_runtime")

# 1. Ensure ViraLoop Studio engines/hermes Agent is mounted on sys.path
STUDIO_HERMES_DIR = Path(r"C:\Users\jmyoo\AppData\Local\ViraLoop Studio\engines\hermes")
HERMES_INSTALL_DIR = STUDIO_HERMES_DIR / "hermes-agent"
if not HERMES_INSTALL_DIR.exists():
    # Fallback to global AppData hermes if studio engines folder not ready
    HERMES_INSTALL_DIR = Path(r"C:\Users\jmyoo\AppData\Local\hermes\hermes-agent")

HERMES_VENV_SITE = HERMES_INSTALL_DIR / "venv" / "Lib" / "site-packages"

if STUDIO_HERMES_DIR.exists():
    os.environ["HERMES_HOME"] = str(STUDIO_HERMES_DIR)

if HERMES_INSTALL_DIR.exists() and str(HERMES_INSTALL_DIR) not in sys.path:
    sys.path.insert(0, str(HERMES_INSTALL_DIR))

if HERMES_VENV_SITE.exists() and str(HERMES_VENV_SITE) not in sys.path:
    sys.path.insert(0, str(HERMES_VENV_SITE))

import types
import socket
if "hermes_bootstrap" not in sys.modules:
    # Inject stub to prevent hermes_bootstrap from hijacking sys.argv and throwing RelaunchExit
    dummy_bootstrap = types.ModuleType("hermes_bootstrap")
    def _happy_eyeballs_conn(address, timeout=None, source_address=None, socket_options=()):
        return socket.create_connection(address, timeout=timeout, source_address=source_address)
    dummy_bootstrap._happy_eyeballs_create_connection = _happy_eyeballs_conn
    sys.modules["hermes_bootstrap"] = dummy_bootstrap

try:
    import run_agent
    try:
        run_agent.load_hermes_dotenv()
    except Exception:
        pass
    if not os.environ.get("GITHUB_TOKEN") and not os.environ.get("COPILOT_GITHUB_TOKEN"):
        try:
            import subprocess
            _gh_tok = subprocess.check_output(["gh", "auth", "token"], text=True, timeout=3).strip()
            if _gh_tok:
                os.environ["GITHUB_TOKEN"] = _gh_tok
                os.environ["COPILOT_GITHUB_TOKEN"] = _gh_tok
        except Exception:
            pass
    HERMES_AVAILABLE = True
except BaseException as e:
    logger.error(f"[HermesNativeRuntime] Failed to import run_agent: {e}")
    HERMES_AVAILABLE = False


class HermesNativeRuntime:
    """
    Direct in-process bridge to the authentic NousResearch Hermes AIAgent.
    Runs the agent conversation loop with real-time token and tool event yield.
    """

    @staticmethod
    async def stream_hermes_conversation(
        prompt: str,
        provider: str = "custom",
        model: str = "viraloop1",
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        system_guidance: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Runs an autonomous Hermes conversation turn and streams real-time events:
          - {"type": "tool_start", "tool_name": str, "tool_args": dict}
          - {"type": "tool_complete", "tool_name": str, "result": dict}
          - {"type": "content_chunk", "delta": str}
          - {"type": "chat_response", "content": str}
        """
        if not HERMES_AVAILABLE:
            yield {
                "type": "content_chunk",
                "delta": "❌ 로컬 Hermes Agent(run_agent) 모듈을 로드할 수 없습니다. C:\\Users\\jmyoo\\AppData\\Local\\hermes 설치를 확인하세요."
            }
            return

        # Event queue to bridge sync Hermes callbacks to async generator
        event_q: asyncio.Queue = asyncio.Queue()
        loop = asyncio.get_running_loop()

        import time
        import re
        import urllib.parse
        from collections import OrderedDict

        run_start_time = time.time()
        tool_steps: List[Dict[str, Any]] = []
        active_step_map: Dict[str, Dict[str, Any]] = OrderedDict()

        def _get_friendly_tool_label(tool_name: str) -> str:
            tn = str(tool_name or "").lower()
            if "terminal" in tn or "cmd" in tn or "bash" in tn:
                return "명령 실행"
            if "web_search" in tn or "search" in tn:
                return "웹 검색"
            if "browser" in tn:
                return "브라우저 탐색"
            if "vision" in tn or "image" in tn or "photo" in tn:
                return "그림 봄"
            if "file" in tn:
                return "도구 작업"
            return "도구 작업"

        def _extract_target_summary(args: Any) -> str:
            if not args:
                return ""
            if isinstance(args, dict):
                for k in ["query", "q", "url", "path", "file_path", "filename", "command", "cmd"]:
                    v = args.get(k)
                    if v and isinstance(v, str):
                        clean_v = v.strip().split("\n")[0]
                        if len(clean_v) > 60:
                            clean_v = clean_v[:57] + "..."
                        return clean_v
                return str(args)[:50]
            s = str(args).strip().split("\n")[0]
            return s[:50] if len(s) > 50 else s

        def _on_stream_delta(delta: str):
            if delta:
                loop.call_soon_threadsafe(
                    event_q.put_nowait,
                    {"type": "content_chunk", "delta": delta}
                )

        def _on_tool_start(tool_name: str, args: Any):
            label = _get_friendly_tool_label(tool_name)
            target = _extract_target_summary(args)
            step_id = f"step_{len(tool_steps) + 1}_{int(time.time() * 1000)}"
            st_time = time.time()

            step_data = {
                "id": step_id,
                "tool_name": tool_name,
                "label": label,
                "target": target,
                "status": "in_progress",
                "start_time": st_time,
                "elapsed_seconds": 0
            }
            tool_steps.append(step_data)
            active_step_map[step_id] = step_data

            # Emit fine-grained step event matching Pixeling standard
            loop.call_soon_threadsafe(
                event_q.put_nowait,
                {
                    "type": "tool_step",
                    "step": step_data,
                    "total_steps": len(tool_steps),
                    "total_elapsed_seconds": max(1, round(time.time() - run_start_time))
                }
            )

            # Auto sync real-time right dock browser when searching or navigating
            search_query = None
            nav_url = None
            if isinstance(args, dict):
                search_query = args.get("query") or args.get("q") or args.get("search_query")
                nav_url = args.get("url")
            elif isinstance(args, str):
                if args.startswith("http://") or args.startswith("https://"):
                    nav_url = args
                elif "search" in tool_name.lower():
                    search_query = args

            if search_query and not nav_url:
                nav_url = f"https://www.google.com/search?q={urllib.parse.quote(str(search_query))}&igu=1"

            if nav_url:
                loop.call_soon_threadsafe(
                    event_q.put_nowait,
                    {
                        "type": "browser_navigate",
                        "url": nav_url,
                        "query": search_query or nav_url,
                        "tool_name": tool_name
                    }
                )

        delivered_paths = set()

        def _find_video_path(data: Any) -> Optional[str]:
            if isinstance(data, dict):
                for k in ["video_path", "output_path", "file_path", "video", "output"]:
                    v = data.get(k)
                    if v and isinstance(v, str) and v.lower().endswith((".mp4", ".mov", ".webm", ".mkv")):
                        if Path(v).exists():
                            return v
            text = str(data or "")
            matches = re.findall(r'([a-zA-Z]:[\\/][^:*?"<>|\r\n\s]+?\.(?:mp4|mov|webm|mkv))', text, re.IGNORECASE)
            for m in matches:
                clean_p = m.strip().strip("'\"`")
                if Path(clean_p).exists():
                    return clean_p
            return None

        def _emit_deliverable_if_found(source_data: Any, title_hint: Optional[str] = None):
            v_path = _find_video_path(source_data)
            if v_path and v_path not in delivered_paths:
                delivered_paths.add(v_path)
                p = Path(v_path)
                size_mb = round(p.stat().st_size / (1024 * 1024), 2) if p.exists() else 0.5
                deliverable_payload = {
                    "video_path": str(v_path),
                    "video_url": f"/api/files/stream?path={urllib.parse.quote(str(v_path))}",
                    "title": title_hint or p.stem,
                    "duration": source_data.get("duration", "") if isinstance(source_data, dict) else "",
                    "file_size": size_mb,
                    "aspect_ratio": source_data.get("aspect_ratio", "9:16") if isinstance(source_data, dict) else "9:16",
                    "resolution": source_data.get("resolution", "1080x1920") if isinstance(source_data, dict) else "1080x1920",
                    "fps": source_data.get("fps", 30) if isinstance(source_data, dict) else 30,
                    "description": source_data.get("description", "") if isinstance(source_data, dict) else "",
                    "style": source_data.get("style", {}) if isinstance(source_data, dict) else {}
                }
                loop.call_soon_threadsafe(
                    event_q.put_nowait,
                    {
                        "type": "deliverable",
                        "deliverable": deliverable_payload
                    }
                )

        def _on_tool_complete(tool_name: str, result: Any):
            # Find matching active step
            matched_step_id = None
            for sid, sdata in reversed(list(active_step_map.items())):
                if sdata.get("tool_name") == tool_name and sdata.get("status") == "in_progress":
                    matched_step_id = sid
                    break

            elapsed = 1
            if matched_step_id and matched_step_id in active_step_map:
                st = active_step_map[matched_step_id]
                st["status"] = "completed"
                st["elapsed_seconds"] = max(1, round(time.time() - st["start_time"]))
                elapsed = st["elapsed_seconds"]

            loop.call_soon_threadsafe(
                event_q.put_nowait,
                {
                    "type": "tool_step_complete",
                    "step_id": matched_step_id,
                    "tool_name": tool_name,
                    "elapsed_seconds": elapsed,
                    "total_elapsed_seconds": max(1, round(time.time() - run_start_time)),
                    "total_steps": len(tool_steps),
                    "summary": str(result)[:150]
                }
            )

            # 동적 결과물(Deliverable) 감지 및 대화창 카드 연동
            _emit_deliverable_if_found(result, title_hint=f"{tool_name} 결과물")

        # Resolve provider connection settings dynamically (Zero hardcoding law)
        # Every selected model (Codex Astra, Gemini, DeepSeek, Claude) becomes the brain of Hermes Agent
        # via the OpenAI-compatible Sovereign Web Session bridge (http://127.0.0.1:8000/api/web_session/v1).
        fallback_m = "hermes-agent"
        try:
            from app.database import SessionLocal
            from app.crud import get_settings
            _db = SessionLocal()
            try:
                _s = get_settings(_db)
                if _s:
                    fallback_m = getattr(_s, "script_analysis_model", None) or getattr(_s, "default_llm_model", None) or "hermes-agent"
            finally:
                _db.close()
        except Exception:
            pass

        p_raw = str(provider or "").strip().lower()
        eff_base_url = "http://127.0.0.1:8000/api/web_session/v1"
        eff_api_key = "sovereign-session"
        eff_provider = "custom"
        eff_model = model or fallback_m

        # If user explicitly chooses pure Copilot CLI and token is available, use copilot
        if p_raw == "copilot" and os.environ.get("COPILOT_GITHUB_TOKEN"):
            eff_provider = "copilot"
            eff_base_url = None
            eff_api_key = os.environ.get("COPILOT_GITHUB_TOKEN")
            eff_model = model or fallback_m

        # Prepare prefill messages from conversation history if available
        prefills = []
        if history:
            for h in history[-8:]:
                r = "user" if h.get("role") == "user" else "assistant"
                c = str(h.get("content") or "").strip()
                if c:
                    prefills.append({"role": r, "content": c})

        # Background thread executor for synchronous AIAgent (nesquena pattern)
        def _run_agent_sync():
            try:
                try:
                    run_agent.load_hermes_dotenv()
                except Exception:
                    pass
                
                # Ensure Copilot / GitHub token is bound
                eff_api_key_to_pass = eff_api_key
                if eff_provider == "copilot" and not eff_api_key_to_pass:
                    eff_tok = os.environ.get("COPILOT_GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN")
                    if not eff_tok:
                        try:
                            import subprocess
                            eff_tok = subprocess.check_output(["gh", "auth", "token"], text=True, timeout=3).strip()
                        except Exception:
                            pass
                    if not eff_tok:
                        eff_tok = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
                    if eff_tok:
                        os.environ["COPILOT_GITHUB_TOKEN"] = eff_tok
                        os.environ["GITHUB_TOKEN"] = eff_tok
                        eff_api_key_to_pass = eff_tok

                agent = run_agent.AIAgent(
                    base_url=eff_base_url,
                    api_key=eff_api_key_to_pass,
                    model=eff_model,
                    provider=eff_provider,
                    cwd=str(STUDIO_HERMES_DIR),
                    enabled_toolsets=['web', 'search', 'terminal', 'file', 'browser', 'vision'],
                    skip_context_files=True,
                    prefill_messages=prefills if prefills else None,
                    stream_delta_callback=_on_stream_delta,
                    tool_start_callback=_on_tool_start,
                    tool_complete_callback=_on_tool_complete,
                    quiet_mode=True
                )
                res = agent.run_conversation(prompt)
                final_text = res.get("final_response", "") if isinstance(res, dict) else str(res or "")
                _emit_deliverable_if_found(final_text, title_hint="헤르메스 생성 영상")
                loop.call_soon_threadsafe(
                    event_q.put_nowait,
                    {
                        "type": "chat_response",
                        "content": final_text,
                        "steps": list(tool_steps),
                        "total_steps": len(tool_steps),
                        "total_elapsed_seconds": max(1, round(time.time() - run_start_time)),
                        "done": True
                    }
                )
            except Exception as ex:
                logger.error(f"[HermesNativeRuntime] Execution error: {ex}", exc_info=True)
                loop.call_soon_threadsafe(
                    event_q.put_nowait,
                    {
                        "type": "chat_response",
                        "content": f"\n\n⚠️ Hermes 실행 오류: {ex}",
                        "steps": list(tool_steps),
                        "total_steps": len(tool_steps),
                        "total_elapsed_seconds": max(1, round(time.time() - run_start_time)),
                        "done": True
                    }
                )

        # Launch agent worker thread
        worker_task = asyncio.to_thread(_run_agent_sync)
        asyncio.create_task(worker_task)

        # Stream events out
        while True:
            evt = await event_q.get()
            yield evt
            if evt.get("done"):
                break
