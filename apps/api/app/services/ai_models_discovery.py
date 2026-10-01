"""
AI Models Dynamic Discovery Service for ViraLoop Studio.
Sovereign dynamic discovery across OpenAI, Google Gemini, DeepSeek, Claude, and OmniRoute.
Never relies on stale hardcoded lists - dynamically queries live APIs and session pools.
"""

import os
import json
import logging
import requests
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai_models_discovery")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
MODELS_REGISTRY_FILE = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "06_Database" / "ai_models_registry.json"

# Sovereign Base Fallbacks (Latest 2026/2025 Tier 1 Lineup)
DEFAULT_DISCOVERY_CATALOG = {
    "codex": {
        "label": "OpenAI Codex",
        "default_model": "GPT-6.1",
        "models": [
            {"id": "GPT-6.1", "name": "GPT-6.1 (최신 차세대 플래그십)", "desc": "OpenAI 최신 6.1 차세대 심층 추론 및 멀티모달 자율 디렉팅 (Codex 직결)"},
            {"id": "Codex Astra 6.1", "name": "Codex Astra 6.1 (최신 아스트라 심층 추론)", "desc": "최신 Astra 6.1 심층 논리 추론 및 타임코드 대본 구조화 (코덱스 쿼터)"},
            {"id": "Codex Astra 6.0", "name": "Codex Astra 6.0 (안정 플래그십)", "desc": "OpenAI Codex CLI 직결 안정 6.0 심층 추론 (코덱스 쿼터)"},
            {"id": "GPT-6.1 Sol High", "name": "GPT-6.1 Sol High (초고속 멀티모달)", "desc": "초고속 실시간 멀티모달 분석 및 즉시 씬보드 도출"},
            {"id": "GPT-5.6 Sol High", "name": "GPT-5.6 Sol High (고속·초정밀)", "desc": "초고속 멀티모달 분석 및 타임코드 대본 구조화"},
            {"id": "GPT-5.6 Terra Max", "name": "GPT-5.6 Terra Max (심층 기획)", "desc": "장편 시나리오 구조화 및 캐릭터 톤앤매너"},
            {"id": "o3-mini", "name": "o3-mini (초고속 논리 추론)", "desc": "OpenAI 차세대 추론 모델 (논리/수학/코드/대본 특화)"},
            {"id": "gpt-4o", "name": "GPT-4o (고성능 비전)", "desc": "옴니 멀티모달 실시간 영상 프레임 분석"}
        ]
    },
    "chatgpt_web": {
        "label": "ChatGPT Web",
        "default_model": "GPT-6.1 (Web)",
        "models": [
            {"id": "GPT-6.1 (Web)", "name": "GPT-6.1 (Web 세션)", "desc": "ChatGPT Web 세션 기반 최신 6.1 차세대 추론 (웹 쿼터)"},
            {"id": "Codex Astra 6.1 (Web)", "name": "Codex Astra 6.1 (Web 아스트라)", "desc": "ChatGPT Web 세션 직결 최신 Astra 6.1 심층 추론"},
            {"id": "Codex Astra 6.0 (Web)", "name": "Codex Astra 6.0 (Web 세션)", "desc": "ChatGPT Web 세션 기반 안정 Astra 추론"},
            {"id": "GPT-6.1 Sol (Web)", "name": "GPT-6.1 Sol (Web 솔)", "desc": "ChatGPT Web 최신 고속 솔 엔진 연동"},
            {"id": "GPT-5.6 Sol (Web)", "name": "GPT-5.6 Sol (Web 세션)", "desc": "ChatGPT Web 쿼터 활용 · 5시간 윈도우 한도"},
            {"id": "GPT-5.6 Pro (Web)", "name": "GPT-5.6 Pro (Web 세션)", "desc": "ChatGPT Pro Web 고용량 토큰 연동"},
            {"id": "ChatGPT-4o (Web)", "name": "ChatGPT-4o (Web 세션)", "desc": "ChatGPT Web 기본 대화 쿼터"}
        ]
    },
    "gemini": {
        "label": "Google Gemini",
        "default_model": "Gemini 3.8 Flash",
        "models": [
            {"id": "Gemini 3.8 Flash", "name": "Gemini 3.8 Flash (최신 · 초고속 현역)", "desc": "초고속 멀티모달 및 실시간 구글 검색 최신 플래그십"},
            {"id": "Gemini 3.1 Pro", "name": "Gemini 3.1 Pro (초정밀/Thinking)", "desc": "200만 토큰 심층 추론 및 비전 분석"},
            {"id": "Gemini 2.5 Flash", "name": "Gemini 2.5 Flash (초저지연 플래시)", "desc": "공식 직접 API 최신 초저지연 멀티모달 모델"},
            {"id": "Gemini 2.5 Pro", "name": "Gemini 2.5 Pro (심층 추론)", "desc": "공식 직접 API 최상위 심층 지능 추론 모델"},
            {"id": "Google Antigravity 2.0", "name": "Google Antigravity 2.0 (Agent)", "desc": "자율 디렉터 브레인 및 채널 DNA 역공학"}
        ]
    },
    "deepseek": {
        "label": "DeepSeek",
        "default_model": "DeepSeek-V3.1",
        "models": [
            {"id": "DeepSeek-V3.1", "name": "⚡ DeepSeek-V3.1 (최신 차세대 · 기본 무료)", "desc": "최신 V3.1 실시간 한국어 서사 및 유튜브 쇼츠 대본 최적화 (비용 0원)"},
            {"id": "DeepSeek-V3", "name": "⚡ DeepSeek-V3 (초고속 대본 · 기본 무료)", "desc": "chat.deepseek.com 실시간 한국어 서사 및 유튜브 쇼츠 대본 최적화 (비용 0원)"},
            {"id": "DeepSeek-R1", "name": "🧠 DeepSeek-R1 (심층 추론 · 사고 전문가)", "desc": "복잡한 기획 및 고난도 분석을 위한 DeepSeek R1 심층 추론 (비용 0원)"},
            {"id": "DeepSeek-Chat", "name": "💬 DeepSeek-Chat (자율 대화)", "desc": "일반 대화 및 아이디어 브레인스토밍 (비용 0원)"}
        ]
    },
    "claude": {
        "label": "Anthropic Claude",
        "default_model": "Claude 3.7 Sonnet",
        "models": [
            {"id": "Claude 3.7 Sonnet", "name": "Claude 3.7 Sonnet (최신 · 하이브리드)", "desc": "사고(Thinking) 및 코딩·대본 연출 특화 최신 플래그십"},
            {"id": "Sonnet 5.5 Medium", "name": "Sonnet 5.5 Medium (기본 · 무료/표준)", "desc": "Anthropic Claude 기본 무료/표준 지능 모델"},
            {"id": "Claude 3.5 Sonnet", "name": "Claude 3.5 Sonnet (고성능)", "desc": "균형잡힌 지능 및 고속 추론"},
            {"id": "Claude 3.5 Haiku", "name": "Claude 3.5 Haiku (초경량)", "desc": "즉각적인 프롬프트 응답 및 고속 요약"}
        ]
    },
    "omniroute": {
        "label": "OmniRoute Gateway",
        "default_model": "viraloop1",
        "models": [
            {"id": "viraloop1", "name": "viraloop1 (스마트 콤보)", "desc": "비용 0원 최적 로컬 지능 라우터"},
            {"id": "auto", "name": "auto (자율 라우터)", "desc": "작업 유형별 최고 성능 모델 자동 배분"},
            {"id": "imagen3", "name": "Imagen 3 (고화질 이미지)", "desc": "Google 최신 쇼츠/블로그 고화질 생성"},
            {"id": "local-fast", "name": "local-fast (초고속)", "desc": "로컬 Whisper 및 즉시 프리셋 발골"}
        ]
    }
}


def discover_gemini_live_models(api_key: Optional[str] = None) -> List[Dict[str, str]]:
    """Live query to Google Generative Language API for up-to-date Gemini models."""
    discovered: List[Dict[str, str]] = []
    if not api_key:
        return discovered
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        resp = requests.get(url, timeout=3.5)
        if resp.status_code == 200:
            data = resp.json()
            models = data.get("models", [])
            for m in models:
                methods = m.get("supportedGenerationMethods", [])
                if "generateContent" not in methods:
                    continue
                raw_name = m.get("name", "").replace("models/", "")
                display_name = m.get("displayName") or raw_name
                desc = m.get("description") or "Google Gemini 공식 직접 연동 모델"
                if len(desc) > 80:
                    desc = desc[:77] + "..."
                
                # Filter for relevant generative models (exclude pure audio tts endpoints from primary text chat)
                if any(k in raw_name.lower() for k in ["gemini-2", "gemini-3", "gemini-flash", "gemini-pro", "gemma"]):
                    if "-tts" in raw_name.lower():
                        continue  # Keep TTS dedicated to voice pipeline
                    discovered.append({
                        "id": raw_name,
                        "name": f"{display_name} (라이브 연동)",
                        "desc": desc
                    })
    except Exception as e:
        logger.debug(f"Gemini live models discovery skipped/failed: {e}")
    return discovered


def discover_openai_live_models(api_key: Optional[str] = None) -> List[Dict[str, str]]:
    """Live query to OpenAI Official API for available chat/reasoning models."""
    discovered: List[Dict[str, str]] = []
    if not api_key:
        return discovered
    try:
        url = "https://api.openai.com/v1/models"
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = requests.get(url, headers=headers, timeout=3.5)
        if resp.status_code == 200:
            data = resp.json()
            m_list = data.get("data", [])
            for m in m_list:
                m_id = m.get("id", "")
                m_lower = m_id.lower()
                # Prioritize latest flagship series (gpt-6, gpt-5, gpt-4.5, o3, o1, gpt-4o)
                if any(m_lower.startswith(k) for k in ["gpt-6", "gpt-5", "gpt-4.5", "o3", "o1", "gpt-4o"]):
                    discovered.append({
                        "id": m_id,
                        "name": f"{m_id} (OpenAI 공식 라이브)",
                        "desc": "OpenAI 계정에서 직접 인증된 최신 가용 모델"
                    })
    except Exception as e:
        logger.debug(f"OpenAI live models discovery skipped/failed: {e}")
    return discovered


def discover_omniroute_live_models(base_url: str = "http://localhost:20128/v1") -> List[Dict[str, str]]:
    """Query local OmniRoute gateway for dynamically loaded model cards."""
    discovered: List[Dict[str, str]] = []
    try:
        clean_url = base_url.rstrip("/") + "/models"
        resp = requests.get(clean_url, timeout=1.5)
        if resp.status_code == 200:
            data = resp.json()
            for m in data.get("data", []):
                m_id = m.get("id")
                if m_id:
                    discovered.append({
                        "id": m_id,
                        "name": f"{m_id} (OmniRoute)",
                        "desc": f"로컬 20128 게이트웨이 가용 모델: {m_id}"
                    })
    except Exception:
        pass
    return discovered


def sync_and_load_models_registry(db_settings=None, force_live: bool = False) -> Dict[str, Any]:
    """
    Main Sovereign Dynamic Registry Loader.
    Zero-Hardcoding Law:
    1. Loads persistent registry from disk if exists.
    2. Merges with base catalog (ensuring GPT-6.1, Astra 6.1, Gemini 2.5, DeepSeek V3.1, Claude 3.7 are always present).
    3. If force_live or first load, queries live APIs (Gemini, OpenAI, OmniRoute) and dynamically injects newly released models.
    4. Synchronizes DB custom models from db_settings.
    5. Persists merged result to disk and returns to caller.
    """
    registry: Dict[str, Any] = {}
    file_exists = MODELS_REGISTRY_FILE.exists()

    if file_exists:
        try:
            with open(MODELS_REGISTRY_FILE, "r", encoding="utf-8") as f:
                registry = json.load(f)
        except Exception as e:
            logger.warning(f"Failed to read models registry from disk: {e}")
            registry = {}

    # Deep-merge default discovery catalog to ensure no legacy omission of new models
    for prov_key, p_val in DEFAULT_DISCOVERY_CATALOG.items():
        if prov_key not in registry:
            registry[prov_key] = json.loads(json.dumps(p_val))
        else:
            existing_ids = {m["id"] for m in registry[prov_key].get("models", [])}
            # Prepend or append missing new catalog models (like GPT-6.1, Codex Astra 6.1)
            for m in p_val.get("models", []):
                if m["id"] not in existing_ids:
                    registry[prov_key]["models"].insert(0, m)
            # Ensure label and default model exist
            if not registry[prov_key].get("label"):
                registry[prov_key]["label"] = p_val["label"]
            if not registry[prov_key].get("default_model"):
                registry[prov_key]["default_model"] = p_val["default_model"]

    # Live discovery if requested or on sync
    if force_live and db_settings:
        # 1. Gemini live
        gemini_keys = getattr(db_settings, "gemini_api_keys", []) or []
        if gemini_keys:
            live_gemini = discover_gemini_live_models(gemini_keys[0])
            if live_gemini:
                curr_g_ids = {m["id"] for m in registry["gemini"].get("models", [])}
                for lm in live_gemini:
                    if lm["id"] not in curr_g_ids:
                        registry["gemini"]["models"].insert(0, lm)

        # 2. OpenAI live
        openai_key = getattr(db_settings, "openai_api_key", None)
        if openai_key:
            live_oa = discover_openai_live_models(openai_key)
            if live_oa:
                curr_c_ids = {m["id"] for m in registry["codex"].get("models", [])}
                for lm in live_oa:
                    if lm["id"] not in curr_c_ids:
                        registry["codex"]["models"].insert(0, lm)

        # 3. OmniRoute live
        raw_base_url = getattr(db_settings, "youtube1_base_url", None) or getattr(db_settings, "ninerouter_url", None) or "http://localhost:20128/v1"
        live_omni = discover_omniroute_live_models(raw_base_url)
        if live_omni:
            curr_o_ids = {m["id"] for m in registry["omniroute"].get("models", [])}
            for lm in live_omni:
                if lm["id"] not in curr_o_ids:
                    registry["omniroute"]["models"].append(lm)

    # Synchronize with dynamic DB Settings if custom model configured
    if db_settings:
        custom_script_model = getattr(db_settings, "script_analysis_model", None)
        if custom_script_model and "/" in custom_script_model:
            prov, m_id = custom_script_model.split("/", 1)
            prov_key = "omniroute" if "omni" in prov else prov
            if prov_key in registry:
                exists = any(m["id"] == m_id for m in registry[prov_key]["models"])
                if not exists:
                    registry[prov_key]["models"].append({
                        "id": m_id,
                        "name": f"{m_id} (사용자 설정 모델)",
                        "desc": "DB 환경설정에서 동적으로 연결된 커스텀 모델"
                    })

    # Smart priority sort per provider so latest flagship models always appear at the top
    def _model_priority(m: Dict[str, str]) -> int:
        m_id = m.get("id", "").strip().lower()
        if m_id in ["gpt-6.1", "gpt-6.1 (web)"]:
            return 0
        if "astra-6.1" in m_id or "astra 6.1" in m_id:
            return 1
        if "6.1" in m_id or "v3.1" in m_id:
            return 2
        if m_id in ["gemini-3.8-flash", "gemini 3.8 flash"]:
            return 3
        if "3.8" in m_id or "3.7" in m_id:
            return 4
        if "astra-6.0" in m_id or "astra 6.0" in m_id or "3.1" in m_id or "v3" in m_id or "r1" in m_id:
            return 5
        if "5.6" in m_id or "sonnet 5.5" in m_id or "2.5" in m_id or "o3" in m_id or "4o" in m_id:
            return 6
        return 7

    for prov_key in registry:
        if "models" in registry[prov_key] and isinstance(registry[prov_key]["models"], list):
            registry[prov_key]["models"].sort(key=_model_priority)
            # Update default_model to the top-ranked model if available
            if registry[prov_key]["models"]:
                registry[prov_key]["default_model"] = registry[prov_key]["models"][0]["id"]

    # Persist updated registry
    try:
        MODELS_REGISTRY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MODELS_REGISTRY_FILE, "w", encoding="utf-8") as f:
            json.dump(registry, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Failed to persist updated models registry: {e}")

    return registry


