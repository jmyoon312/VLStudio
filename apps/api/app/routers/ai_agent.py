from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from .. import database, crud

from ..llm_manager import LLMClient
import logging
import json
import os

router = APIRouter(tags=["agent"])
logger = logging.getLogger(__name__)

class CommandRequest(BaseModel):
    command: str
    context: dict = {} # Current editor state (optional)
    provider: str = "cerebras"
    model: str = "cerebras/llama3.1-8b"

class Action(BaseModel):
    type: str
    params: dict = {}

class AgentResponse(BaseModel):
    actions: list[Action]
    message: str

# --- Tool Definitions ---
# We define tools for Gemini to "call".
# In reality, we just want the structured output.

def get_editor_tools():
    return [
        {
            "name": "remove_silence",
            "description": "Remove silent parts from the video.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "threshold": {"type": "NUMBER", "description": "Silence threshold in dB (e.g. -30). Default -30."}
                }
            }
        },
        {
            "name": "add_text",
            "description": "Add a text overlay or subtitle.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "content": {"type": "STRING", "description": "The text content to display."},
                    "style": {"type": "STRING", "description": "Style preset (e.g. 'title', 'subtitle', 'caption')."}
                },
                "required": ["content"]
            }
        },
        {
            "name": "add_music",
            "description": "Add background music.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "genre": {"type": "STRING", "description": "Genre or mood of the music (e.g. 'happy', 'cinematic')."}
                },
                "required": ["genre"]
            }
        },
        {
            "name": "cut_clip",
            "description": "Cut or trim the video.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "start": {"type": "NUMBER", "description": "Start time in seconds."},
                    "end": {"type": "NUMBER", "description": "End time in seconds."}
                }
            }
        },
        {
            "name": "apply_filter",
            "description": "Apply a visual filter or color grading.",
            "parameters": {
                "type": "OBJECT",
                "properties": {
                    "filter_type": {"type": "STRING", "description": "Type of filter (e.g. 'bw', 'vintage', 'bright')."}
                },
                "required": ["filter_type"]
            }
        }
    ]

@router.post("/command", response_model=AgentResponse)
def process_command(req: CommandRequest, db: Session = Depends(database.get_db)):
    settings = crud.get_settings(db)
    
    # Use brain_router to get the LangChain model
    try:
        # Determine Provider and Model Name dynamically from DB Settings if not specified or legacy default
        db_model = getattr(settings, "script_analysis_model", None) or getattr(settings, "default_llm_model", None) or "auto"
        target_provider = req.provider or getattr(settings, "script_analysis_provider", None) or "omniroute"
        target_model = req.model

        if not target_model or target_model in ["auto", "cerebras/llama3.1-8b", "llama-3.3-70b-versatile"]:
            target_model = db_model
            if "/" in db_model and not db_model.startswith(("omniroute/", "youtube1/")):
                target_provider = db_model.split("/")[0]
            else:
                target_provider = "omniroute"

        clean_model = target_model.split("/", 1)[1] if "/" in target_model else target_model

        logger.info(f"🤖 [Loopie] Routing command request via OmniRoute/BrainRouter: {target_provider}/{clean_model} (full: {target_model})")
        current_path = req.context.get("currentPath", "")
        system_instruction = (
            "당신은 'ViraLoop Studio'의 최고 전략 에이전트, '루피(Loopie)'입니다. "
            "단순한 챗봇이 아닌, OmniRoute AI 두뇌와 MCP 도구 및 CapCut 직접 조립 엔진을 지휘하여 실제 바이럴 쇼츠/영상을 제작하는 '자율 영상 프로덕션 디렉터'입니다. "
            "지휘관(사용자)의 명령을 수행할 때 항상 다음을 고려하십시오:\n"
            "1. 3초 후킹(Hook): 첫 화면에서 이탈을 막는 강렬한 시각/음성 후킹.\n"
            "2. 9-Wave 바이럴 스토리텔링: 야담, 다크 히스토리, 랭킹형, 떡상 레퍼런스 복제 등 채널 성격에 맞는 대본 구조.\n"
            "3. CapCut Direct No-ZIP 조립 및 쇼츠 자동 배포 관리(WorkQueue) 연동.\n\n"
            "**[절대 규칙 1]: 어떤 상황에서도 반드시 100% '한국어'로만 대답하세요.**\n"
            "**[절대 규칙 2]: 사용자의 명령을 분석하여 실제 시스템 제어 액션을 JSON 형태로 반환해야 합니다.** "
            "순수 JSON 문자열만 출력하세요 (마크다운 코드블록 제외).\n"
            "형식: {\"actions\": [{\"type\": \"액션명\", \"params\": {\"키\": \"값\"}}], \"message\": \"사용자에게 브리핑할 한국어 메시지\"}\n"
            "사용 가능한 액션:\n"
            "1. navigate: 화면 이동. params: {\"path\": \"/channels, /insights, /work-queue, /settings, /flow2capcut 중 하나\"}.\n"
            "2. start_production_pipeline: 영상 자동 제작 미션 시작. params: {\"topic\": \"주제\", \"genre\": \"yadam/dark-history/viral-ranking/bespoke\", \"target_duration_sec\": 60}.\n"
            "3. scout_viral_materials: 떡상 소재 탐색. params: {\"topic\": \"주제\", \"genre\": \"장르\"}.\n"
            "4. assemble_capcut: 제작된 영상의 원천 소스(음성 트랙, 자막 트랙, 상단 타이틀, 비디오)를 CapCut 타임라인 멀티트랙 드래프트 프로젝트로 조립 및 내보내기. "
            "params: {\"project_name\": \"프로젝트명\", \"open_after\": true}. "
            "사용자가 '캡컷 내보내기', '캡컷으로 열어줘', '캡컷 프로젝트 조립', '캡컷으로 보내', '원천 소스 내보내기', '캡컷 테스트' 등을 말하면 반드시 이 액션을 사용하세요.\n"
            "5. autonomous_produce_video: 채널 DNA 기반 완전 자율 영상 제작 (대본+TTS+렌더링 원스톱). "
            "params: {\"reference_url\": \"복제 기준 채널 URL (예: https://www.youtube.com/@숏비타민c/shorts)\", "
            "\"source_keyword\": \"소재 키워드 또는 URL\", \"auto_enqueue\": true}. "
            "사용자가 '영상 만들어', '채널 복제', '쇼츠 제작', 'DNA 기반 만들어' 등을 말하면 이 액션을 사용하세요.\n"
            f"현재 사용자가 보고 있는 페이지: {current_path}."
        )
        
        # [STRATEGIC CONTEXT] Inject video metadata if available
        video_title = req.context.get("videoTitle")
        transcript = req.context.get("transcript")
        
        prompt = req.command
        if video_title or transcript:
            prompt = (
                f"[현재 분석 중인 영상 데이터]\n"
                f"제목: {video_title or '제목 없음'}\n"
                f"대본 내용: {transcript or '대본 없음'}\n\n"
                f"명령: {req.command}"
            )

        from langchain_core.messages import SystemMessage, HumanMessage
        messages = [
            SystemMessage(content=system_instruction),
            HumanMessage(content=prompt)
        ]
        
        from app.agent.brain_router import brain_router
        
        # Collect API keys for rotation
        keys = []
        if target_provider == "groq":
            if settings.groq_api_keys:
                keys = [k for k in settings.groq_api_keys if k]
            elif hasattr(settings, "groq_api_key") and settings.groq_api_key:
                keys = [settings.groq_api_key]
        elif target_provider in ["google", "gemini"]:
            if settings.gemini_api_keys:
                keys = [k for k in settings.gemini_api_keys if k]
                
        if not keys:
            keys = [None] # fallback to env variables

        llm = None
        response_text = None
        primary_err = None
        
        for i, api_key in enumerate(keys):
            try:
                llm = brain_router._create_langchain_model(target_provider, clean_model, settings, api_key=api_key)
                if not llm:
                    raise ValueError(f"Failed to initialize LangChain model for '{target_provider}/{clean_model}'")
                
                logger.info(f"🤖 [Loopie] Routing command request via LangChain brain_router: {target_provider}/{clean_model} (Key #{i})")
                response = llm.invoke(messages)
                response_text = response.content
                primary_err = None # Clear error on success
                break
            except Exception as e:
                primary_err = e
                logger.warning(f"[WAIT] [Loopie] Key #{i} failed with error: {e}. Rotating keys...")
                continue

        if primary_err:
            logger.warning(f"[WARN] Primary model ({target_provider}/{clean_model}) failed: {primary_err}. Checking secondary DB settings model...")
            secondary_model = getattr(settings, "default_llm_model", None)
            if secondary_model and secondary_model != target_model:
                try:
                    sec_provider = "omniroute"
                    if "/" in secondary_model and not (secondary_model.startswith("viraloop") or secondary_model.startswith("youtube")):
                        sec_provider = secondary_model.split("/")[0]
                    sec_clean = secondary_model.split("/", 1)[1] if "/" in secondary_model else secondary_model
                    
                    fallback_llm = brain_router._create_langchain_model(sec_provider, sec_clean, settings)
                    if fallback_llm:
                        response = fallback_llm.invoke(messages)
                        response_text = response.content
                        primary_err = None
                except Exception as sec_err:
                    logger.error(f"[FAIL] Secondary model ({secondary_model}) also failed: {sec_err}")
            
            if primary_err:
                raise Exception(f"AI 엔진({target_provider}/{clean_model}) 응답 오류: {primary_err}")
        
        # Try to parse as JSON first; otherwise treat as plain chat reply
        if isinstance(response_text, str):
            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(cleaned)
                actions = data.get("actions", [])
                message = data.get("message", cleaned)

                # ─── 액션 핸들러 처리 ─────────────────────────────────────
                for action in actions:
                    act_type = action.get("type")
                    if act_type == "autonomous_produce_video":
                        params = action.get("params", {})
                        ref_url = params.get("reference_url", "")
                        source_kw = params.get("source_keyword", "")
                        auto_enqueue = params.get("auto_enqueue", True)
                        if ref_url:
                            try:
                                import httpx as _httpx
                                pipeline_resp = _httpx.post(
                                    "http://127.0.0.1:8000/api/discovery/autonomous-clone-and-produce",
                                    json={
                                        "reference_url": ref_url,
                                        "source_keyword": source_kw,
                                        "auto_enqueue": auto_enqueue,
                                        "channel_id": req.context.get("channelId", 1)
                                    },
                                    timeout=360.0
                                )
                                if pipeline_resp.status_code == 200:
                                    pipe_data = pipeline_resp.json()
                                    rendered = pipe_data.get("rendered_mp4", "")
                                    status_msg = f"완제품 렌더링 완료: {rendered}" if rendered else "대본/TTS 완료 (렌더링 비동기 진행)"
                                    message = f"✅ 자율 영상 제작 파이프라인 완료!\n채널: {ref_url}\n{status_msg}"
                                else:
                                    message = f"⚠️ 파이프라인 호출 오류: HTTP {pipeline_resp.status_code}"
                            except Exception as pipe_err:
                                logger.warning(f"[Loopie] autonomous_produce_video 호출 예외: {pipe_err}")
                                message = f"⚠️ 파이프라인 연결 실패: {pipe_err}"
                        break

                    elif act_type == "assemble_capcut":
                        params = action.get("params", {})
                        proj_name = params.get("project_name")
                        open_after = params.get("open_after", True)
                        try:
                            import httpx as _httpx
                            capcut_resp = _httpx.post(
                                "http://127.0.0.1:8000/api/capcut/export-draft",
                                json={
                                    "project_name": proj_name,
                                    "open_after": open_after
                                },
                                timeout=60.0
                            )
                            if capcut_resp.status_code == 200:
                                res_data = capcut_resp.json()
                                f_num = res_data.get("folder_number", "0000")
                                p_name = res_data.get("project_name", "CapCut Project")
                                t_sum = res_data.get("track_summary", {})
                                sub_cnt = t_sum.get("subtitles_count", 0)
                                has_audio = "O" if t_sum.get("has_audio_track") else "X"
                                has_video = "O" if t_sum.get("has_video_track") else "X"
                                has_title = "O" if t_sum.get("has_top_title") else "X"

                                message = (
                                    f"🎬 [CapCut NLE 원천 소스 멀티트랙 조립 완료!]\n\n"
                                    f"• 프로젝트 폴더: [{f_num}] {p_name}\n"
                                    f"• 원천 소스 분리 트랙 구성:\n"
                                    f"  - 🎵 나레이션 음성 트랙: {has_audio} (원천 TTS mp3 파일 바인딩)\n"
                                    f"  - 💬 자막 트랙: {sub_cnt}개 문장 세그먼트 (타임코드 싱크 분리 배치)\n"
                                    f"  - 🏷️ 상단 후킹 바: {has_title} (텍스트 레이어)\n"
                                    f"  - 🎥 배경 비디오 트랙: {has_video}\n\n"
                                    f"• CapCut PC 실행: {'타임라인에 프로젝트가 성공적으로 로드되었습니다!' if res_data.get('opened') else '드래프트 폴더에 안전하게 저장되었습니다.'}"
                                )
                            else:
                                message = f"⚠️ CapCut 드래프트 조립 오류: HTTP {capcut_resp.status_code} ({capcut_resp.text[:100]})"
                        except Exception as c_err:
                            logger.warning(f"[Loopie] assemble_capcut 호출 예외: {c_err}")
                            message = f"⚠️ CapCut 드래프트 연결 실패: {c_err}"
                        break

                return AgentResponse(actions=actions, message=message)
            except json.JSONDecodeError:
                # Plain chat response - just return as message
                return AgentResponse(actions=[], message=cleaned)
            
        return AgentResponse(actions=[], message="응답을 처리하는 중 오류가 발생했습니다.")

    except Exception as e:
        logger.error(f"Agent Error: {e}")
        return AgentResponse(actions=[], message=f"Error: {str(e)}")


def _resolve_supertonic_dir() -> str:
    candidates = [
        os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media", "09_System", "models", "supertonic"),
        os.path.abspath("apps/api/backend/models/supertonic"),
        os.path.abspath("data/models/supertonic"),
        os.path.abspath("backend/models/supertonic"),
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return p
    return candidates[0]


class SpeakRequest(BaseModel):
    text: str
    voice: str = "F1"
    rate: str = "1.05"
    pitch: str = "0"


@router.post("/speak")
async def speak_text(req: SpeakRequest):
    """
    High-Performance Neural TTS for Loopie Assistant.
    Powered by Supertonic Local Neural Voice (F1, M1).
    Returns audio bytes directly for instant streaming playback.
    """
    import re
    import io
    from fastapi.responses import Response

    clean_text = req.text
    # Strip markdown, URLs, code blocks, excessive symbols for clean speech
    clean_text = re.sub(r'```.*?```', '', clean_text, flags=re.DOTALL)
    clean_text = re.sub(r'`.*?`', '', clean_text)
    clean_text = re.sub(r'https?://\S+', '', clean_text)
    clean_text = re.sub(r'[*_~#>-]', '', clean_text)
    clean_text = (
        clean_text
        .replace("ViraLoop", "바이럴루프")
        .replace("Loopie", "루피")
        .replace("OmniRoute", "옴니라우트")
        .replace("CapCut", "캡컷")
        .strip()
    )

    if not clean_text:
        raise HTTPException(status_code=400, detail="Text is empty")

    # For concise real-time voice speech, take the first 2-3 sentences if very long
    if len(clean_text) > 280:
        sentences = [s.strip() for s in re.split(r'(?<=[.?!])\s+', clean_text) if s.strip()]
        clean_text = " ".join(sentences[:3])

    voice = req.voice if req.voice and not req.voice.startswith("ko-KR-") else "F1"
    speed = 1.05
    if req.rate:
        try:
            if "%" in req.rate:
                speed = 1.0 + (float(req.rate.replace("%", "").replace("+", "")) / 100.0)
            else:
                speed = float(req.rate)
        except Exception:
            speed = 1.05

    try:
        from app.services.tts.supertonic.service import SupertonicService
        import soundfile as sf

        st_dir = _resolve_supertonic_dir()
        service = SupertonicService.get_instance(st_dir)
        wav, sr = service.generate(clean_text, lang="ko", voice_id=voice, speed=speed)

        wav_buffer = io.BytesIO()
        sf.write(wav_buffer, wav, sr, format='WAV')
        wav_bytes = wav_buffer.getvalue()
        return Response(content=wav_bytes, media_type="audio/wav")
    except Exception as e:
        logger.error(f"[Loopie Speak] Supertonic TTS failed: {e}")
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")


class ExecuteCommandRequest(BaseModel):
    cmd: str
    workdir: Optional[str] = None
    timeout_sec: int = 60

@router.post("/execute-command")
async def execute_local_command(req: ExecuteCommandRequest):
    """
    Executes a shell command directly on the host machine for human takeover or agent tool execution.
    """
    from app.services.local_os_controller import local_os_controller
    res = local_os_controller.execute_command(cmd=req.cmd, workdir=req.workdir, timeout=req.timeout_sec)
    return res

class BrowserSearchRequest(BaseModel):
    query: Optional[str] = None
    url: Optional[str] = None
    take_screenshot: bool = True

@router.post("/browser-search")
async def execute_browser_search(req: BrowserSearchRequest):
    """
    Executes Playwright web search or page browse.
    """
    from app.services.local_os_controller import local_os_controller
    return await local_os_controller.browser_search_and_browse(query=req.query, url=req.url, take_screenshot=req.take_screenshot)

@router.get("/files-list")
async def list_workspace_files(folder: str = "downloads"):
    """
    Lists media files in 05_Exports or 07_Downloads.
    """
    from app.services.local_os_controller import local_os_controller, DOWNLOADS_DIR, EXPORTS_DIR
    target = DOWNLOADS_DIR if folder == "downloads" else EXPORTS_DIR
    return local_os_controller.file_manager(operation="list", path=str(target))

class OpenFolderRequest(BaseModel):
    folder: str = "downloads"

@router.post("/open-folder")
async def open_workspace_folder(req: OpenFolderRequest):
    """
    Opens downloads or exports folder in Windows Explorer.
    """
    from app.services.local_os_controller import local_os_controller, DOWNLOADS_DIR, EXPORTS_DIR
    target = DOWNLOADS_DIR if req.folder == "downloads" else EXPORTS_DIR
    return local_os_controller.open_folder(custom_path=str(target))

class BrowserLoginWindowRequest(BaseModel):
    url: Optional[str] = "https://accounts.google.com"

@router.post("/browser-login-window")
async def open_browser_login_window(req: BrowserLoginWindowRequest):
    """
    Launches an interactive Chromium window with persistent user profile (04_Profiles)
    so the user can log into Google/YouTube.
    """
    from app.services.local_os_controller import local_os_controller
    return local_os_controller.open_browser_login_window(url=req.url or "https://accounts.google.com")




