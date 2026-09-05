from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
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
        db_model = getattr(settings, "script_analysis_model", None) or getattr(settings, "default_llm_model", None) or "viraloop1"
        target_provider = req.provider or "omniroute"
        target_model = req.model

        if not target_model or target_model in ["auto", "cerebras/llama3.1-8b", "llama-3.3-70b-versatile"]:
            target_model = db_model
            if "/" in db_model and not (db_model.startswith("viraloop") or db_model.startswith("youtube")):
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
            "4. assemble_capcut: CapCut 프로젝트 직접 조립 및 열기. params: {\"project_name\": \"프로젝트명\"}.\n"
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
            logger.warning(f"[WARN] Primary agent model ({target_provider}/{clean_model}) failed on all keys: {primary_err}. Falling back to Gemini...")
            try:
                fallback_llm = brain_router._create_langchain_model("google", "gemini-2.0-flash", settings)
                if not fallback_llm:
                    raise ValueError("Failed to initialize fallback Gemini model.")
                response = fallback_llm.invoke(messages)
                response_text = response.content
            except Exception as fallback_err:
                logger.error(f"[FAIL] Fallback Gemini model also failed: {fallback_err}")
                raise Exception(f"Primary error: {primary_err}. Fallback error: {fallback_err}")
        
        # Try to parse as JSON first; otherwise treat as plain chat reply
        if isinstance(response_text, str):
            cleaned = response_text.replace("```json", "").replace("```", "").strip()
            try:
                data = json.loads(cleaned)
                return AgentResponse(actions=data.get("actions", []), message=data.get("message", cleaned))
            except json.JSONDecodeError:
                # Plain chat response - just return as message
                return AgentResponse(actions=[], message=cleaned)
            
        return AgentResponse(actions=[], message="응답을 처리하는 중 오류가 발생했습니다.")

    except Exception as e:
        logger.error(f"Agent Error: {e}")
        return AgentResponse(actions=[], message=f"Error: {str(e)}")
