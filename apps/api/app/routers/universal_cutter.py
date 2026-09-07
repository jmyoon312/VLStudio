import os
import json
import logging
import re
import uuid
import shutil
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import database, models, schemas, crud
from app.llm_manager import LLMClient
from app.config import settings as app_settings
from app.dependency_manager import DependencyManager

logger = logging.getLogger("universal_cutter")

router = APIRouter(prefix="/api/universal-cutter", tags=["universal_cutter"])

# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class SplitEpisodesRequest(BaseModel):
    video_id: Optional[int] = None
    video_path: Optional[str] = None
    video_title: Optional[str] = "미제 영상"
    srt_content: Optional[str] = None
    preset_id: str = "gutavari"  # gutavari, k_cider, b_trilogy, longform_docu, custom
    target_lang: str = "ko"       # ko, en, ja, de, es, zh-tw
    episode_count: int = 10       # 쇼츠 생성 수량 (예: 10개)
    target_duration_type: str = "shorts" # "shorts" (1분 미만) or "longform" (10/20/30분)
    target_minutes: int = 20      # 롱폼일 경우 목표 분수
    enable_speaker_diarization: bool = False
    custom_prompt: Optional[str] = None

class GeneratePresetRequest(BaseModel):
    prompt: str
    benchmark_channel: Optional[str] = None

class OptimizePronunciationRequest(BaseModel):
    text: str
    language: str = "ko"
    items: Optional[List[Dict[str, Any]]] = None # 클립별 대사/나레이션 리스트

class ExportCapCutRequest(BaseModel):
    project_title: str
    video_path: str
    episodes: List[Dict[str, Any]]
    target_lang: str = "ko"
    output_dir: Optional[str] = None

# ==============================================================================
# Helper Functions
# ==============================================================================

def get_llm_client_and_model(db: Session):
    """
    [CRITICAL RULE] Single Source of Truth for AI Model:
    Extract settings from DB and use script_analysis_model as priority.
    """
    settings = crud.get_settings(db)
    llm_client = LLMClient(settings)
    target_model = (
        getattr(settings, "script_analysis_model", None) or
        getattr(settings, "default_llm_model", None) or
        "opencode/deepseek-v4-flash-free"
    )
    return llm_client, target_model, settings

def parse_json_safely(raw_text: str) -> Any:
    """Extracts JSON structure from Markdown code blocks or raw text with dirty-JSON repair."""
    clean = raw_text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", clean)
    if match:
        clean = match.group(1).strip()
    try:
        return json.loads(clean)
    except Exception as e:
        logger.warning(f"Initial JSON parse failed: {e}. Trying fallback regex & cleanup...")
        first_bracket = min([i for i in [clean.find('{'), clean.find('[')] if i != -1], default=-1)
        last_bracket = max([clean.rfind('}'), clean.rfind(']')], default=-1)
        if first_bracket != -1 and last_bracket != -1 and last_bracket > first_bracket:
            sub = clean[first_bracket:last_bracket+1]
            # Remove trailing commas before closing braces/brackets
            sub = re.sub(r',\s*([\]}])', r'\1', sub)
            try:
                return json.loads(sub)
            except Exception:
                pass
        raise ValueError(f"Could not parse valid JSON from AI response: {raw_text[:200]}")

# ==============================================================================
# API Endpoints
# ==============================================================================

@router.get("/settings-model")
def get_settings_model(db: Session = Depends(database.get_db)):
    """현재 DB 환경설정의 표준 분석 모델명 조회"""
    _, target_model, settings = get_llm_client_and_model(db)
    return {
        "script_analysis_model": target_model,
        "default_llm_model": getattr(settings, "default_llm_model", None),
        "status": "ready"
    }

@router.post("/generate-preset")
def generate_custom_preset(
    req: GeneratePresetRequest,
    db: Session = Depends(database.get_db)
):
    """
    사용자가 임의로 입력한 기획 지침서/프롬프트를 분석하여
    새로운 연출 프리셋(JSON)으로 자동 구조화 등록
    """
    llm_client, target_model, _ = get_llm_client_and_model(db)
    
    system_prompt = (
        "You are an Elite Video Director and Prompt Engineer for YouTube Shorts/Longform viral content.\n"
        "Analyze the user's instructions/benchmark notes and extract a structured Preset Configuration JSON.\n\n"
        "CRITICAL: Output ONLY valid JSON in this exact schema:\n"
        "{\n"
        '  "id": "custom_" + 8_char_random_slug,\n'
        '  "name": "프리셋 명칭 (이모지 포함, 예: 🔍 범죄 다큐 프로파일러)",\n'
        '  "icon": "Lucide 아이콘명 (예: Search, Film, Flame, Shield, Sparkles, Scissors, Zap)",\n'
        '  "description": "한 줄 요약 설명",\n'
        '  "tone": "어조/종결어미 규칙 (예: ~것으로 드러났습니다, 명사형 종결)",\n'
        '  "pacing": "호흡/컷 전환 주기 (예: 2~3초 빠른 컷팅, 15초 루프)",\n'
        '  "hookStyle": "상단 훅 제목 작명 공식",\n'
        '  "dripStyle": "쨉쨉이 드립 스티커 스타일 (2~5자 감탄사)",\n'
        '  "promptInstruction": "AI가 영상을 분할하고 각색할 때 적용할 핵심 시스템 지침 전문"\n'
        "}"
    )

    user_prompt = f"Benchmark Note / User Rule:\n{req.prompt}"
    if req.benchmark_channel:
        user_prompt += f"\nBenchmark Target Channel/Style: {req.benchmark_channel}"

    try:
        resp = llm_client.generate_content(
            prompt=user_prompt,
            model_name=target_model,
            system_instruction=system_prompt,
            full_response=True
        )
        raw_text = resp.get("content", "") if isinstance(resp, dict) else str(resp)
        result = parse_json_safely(raw_text)
        if not result.get("id"):
            result["id"] = f"custom_{uuid.uuid4().hex[:8]}"
        return {"success": True, "preset": result, "model_used": target_model}
    except Exception as e:
        logger.error(f"Failed to generate custom preset: {e}")
        raise HTTPException(status_code=500, detail=f"프리셋 자동 생성 실패: {str(e)}")

@router.post("/optimize-pronunciation")
def optimize_pronunciation(
    req: OptimizePronunciationRequest,
    db: Session = Depends(database.get_db)
):
    """
    대본 전체 및 각 씬/클립별 나레이션의 한글 발음 최적화 (TTS 맞춤 발음 교정)
    예: 123명 -> 백스물세 명, 2024년 -> 이천이십사년, 100% -> 백 퍼센트, Apple -> 애플 등
    자연스러운 음성 합성을 위한 단어 변환 목록 및 교정문 반환
    """
    if not req.text or not req.text.strip():
        return {
            "success": True,
            "data": {
                "original": "",
                "optimized": "",
                "diffs": []
            },
            "model_used": "none"
        }

    llm_client, target_model, _ = get_llm_client_and_model(db)
    
    system_prompt = (
        "You are an Elite Spoken Narration and TTS Pronunciation Specialist.\n"
        "Your task is to convert written text into natural spoken pronunciation suitable for AI Text-To-Speech (TTS) models (ElevenLabs, Typecast, Supertone, Kokoro, Edge TTS).\n\n"
        "Key Rules for Korean Spoken TTS:\n"
        "1. Numbers with Korean counter units MUST be converted to Native Korean numerals where appropriate:\n"
        "   - 사람 수: 1명 -> 한 명, 2명 -> 두 명, 3명 -> 세 명, 4명 -> 네 명, 5명 -> 다섯 명, 20명 -> 스무 명, 21명 -> 스물한 명\n"
        "   - 개수: 1개 -> 한 개, 2개 -> 두 개, 3개 -> 세 개, 10개 -> 열 개\n"
        "   - 시간: 1시 -> 한 시, 2시 -> 두 시 / 30분 -> 삼십 분\n"
        "   - 연도/금액/전화번호: Sino-Korean (2024년 -> 이천이십사년, 5000원 -> 오천 원)\n"
        "2. English abbreviations & acronyms to Korean phonetics:\n"
        "   - AI -> 에이아이, CEO -> 씨이오, SNS -> 에스엔에스, FBI -> 에프비아이, DNA -> 디엔에이\n"
        "3. Units & Symbols:\n"
        "   - % -> 퍼센트 (또는 프로), $ -> 달러, km -> 킬로미터, kg -> 킬로그램\n"
        "4. Foreign brand names or words to standard Korean pronunciation:\n"
        "   - Apple -> 애플, Google -> 구글, Tesla -> 테슬라\n"
        "5. Preserve the exact sentence structure and tone; only optimize phonetic pronunciation where TTS would misread or stutter.\n\n"
        "CRITICAL: Output ONLY a valid JSON Object with this exact schema:\n"
        "{\n"
        '  "original": "원본 전체 텍스트",\n'
        '  "optimized": "발음 최적화된 전체 텍스트",\n'
        '  "diffs": [\n'
        '    {\n'
        '      "id": 1,\n'
        '      "original_word": "123명",\n'
        '      "replaced_word": "백스물세 명",\n'
        '      "reason": "인원 수 세는 고유어 수사 변환"\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    user_prompt = f"Target Language: {req.language}\nOriginal Script:\n{req.text}"

    try:
        resp = llm_client.generate_content(
            prompt=user_prompt,
            model_name=target_model,
            system_instruction=system_prompt,
            full_response=True
        )
        raw_text = resp.get("content", "") if isinstance(resp, dict) else str(resp)
        result = parse_json_safely(raw_text)
        if not isinstance(result, dict) or "optimized" not in result:
            result = {
                "original": req.text,
                "optimized": req.text,
                "diffs": []
            }
        return {"success": True, "data": result, "model_used": target_model}
    except Exception as e:
        logger.warning(f"Pronunciation optimization LLM fallback triggered: {e}")
        # 자가치유 폴백: 500 에러로 중단되지 않고 원본을 안전하게 유지하여 반환
        return {
            "success": True,
            "data": {
                "original": req.text,
                "optimized": req.text,
                "diffs": []
            },
            "model_used": target_model,
            "warning": f"AI 발음 최적화 일시 지연으로 원본 유지 ({str(e)})"
        }

@router.post("/split-episodes")
def split_episodes(
    req: SplitEpisodesRequest,
    db: Session = Depends(database.get_db)
):
    """
    영상의 대본/SRT 또는 메타데이터를 분석하여 쇼츠 N개 에피소드 덱 또는 롱폼 단일 타임라인 생성
    (나레이션, 인물 대사 1/2, 쨉쨉이 드립, SFX 효과음, 가상 타임코드 인덱스 일체 포함)
    """
    llm_client, target_model, _ = get_llm_client_and_model(db)

    # 1. Prepare text context from SRT or Video Metadata
    content_context = req.srt_content or ""
    if not content_context and req.video_id:
        video = db.query(models.Video).filter(models.Video.id == req.video_id).first()
        if video:
            content_context = getattr(video, "description", "") or getattr(video, "title", "")
            if hasattr(video, "metadata_json") and video.metadata_json:
                content_context += "\n" + json.dumps(video.metadata_json, ensure_ascii=False)

    if not content_context:
        content_context = f"영상 제목: {req.video_title}. 본 영상의 극적인 갈등과 반전 하이라이트를 중심으로 설계하세요."

    # 2. Build Localization & Style Rules
    lang_rules = {
        "en": "Write all titles, hooks, dialogues, jabs, and narrations in native US Gen-Z / viral spoken English with high retention hooks. Example jabs: (Bruh...), (Emotional Damage), (Side eye).",
        "ja": "Write in natural Japanese shorts style with Tsukkomi & dramatic anime-style reactions. Example jabs: (脳内バグ), (草生える), (時が止まった).",
        "de": "Write in engaging German documentary/reaction spoken style. Example jabs: (Kopfkino), (Fremdscham pur).",
        "es": "Write in viral Latin American/Spanish spoken style. Example jabs: (Momento XD), (Sin palabras).",
        "zh-tw": "Write in Taiwanese viral shorts style with popular buzzwords.",
        "ko": "한국어 특유의 찰진 말맛, 구타바리/K-사이다 종결어미 및 명사형 종결 유지. 쨉쨉이 예시: (동공지진), (어이탈출), (극대노), (킹받네)."
    }
    lang_prompt = lang_rules.get(req.target_lang, lang_rules["ko"])

    diarization_prompt = ""
    if req.enable_speaker_diarization:
        diarization_prompt = (
            "Speaker Diarization is ENABLED.\n"
            "Separate the characters into 'speaker_a' (e.g. Male Lead) and 'speaker_b' (e.g. Female Lead / Villain).\n"
            "Keep the 'narration' strictly for the 3rd-person narrator/reviewer.\n"
        )

    system_prompt = (
        f"You are an Elite Video Master Director specialized in YouTube Shorts & Longform viral storytelling.\n"
        f"Language Directive: {lang_prompt}\n"
        f"{diarization_prompt}\n"
        f"Mode: {'Multi-Shorts Episode Generation' if req.target_duration_type == 'shorts' else 'Single Longform Highlight Storyboard'}\n"
        f"Number of Episodes requested: {req.episode_count if req.target_duration_type == 'shorts' else 1}\n\n"
        "CRITICAL: Output ONLY a JSON Object matching this exact structure:\n"
        "{\n"
        '  "project_title": "' + req.video_title + ' - 쇼츠 마스터 패키지",\n'
        '  "target_lang": "' + req.target_lang + '",\n'
        '  "episodes": [\n'
        '    {\n'
        '      "id": 1,\n'
        '      "title": "에피소드 1: 3초 만에 털린 사연",\n'
        '      "top_hook": "상단에 띄울 굵은 훅 타이틀 (예: 10초 만에 10억 날림)",\n'
        '      "total_duration_sec": 58.5,\n'
        '      "clips": [\n'
        '        {\n'
        '          "clip_id": 1,\n'
        '          "source_start": 12.0,\n'
        '          "source_end": 17.5,\n'
        '          "duration": 5.5,\n'
        '          "narration": "해설자의 상황 설명 나레이션 대사",\n'
        '          "speaker_a_dialogue": "등장인물 A 대사 (화자분리 시 작성, 없으면 빈문자열)",\n'
        '          "speaker_b_dialogue": "등장인물 B 대사 (화자분리 시 작성, 없으면 빈문자열)",\n'
        '          "jab_sticker": "(동공지진)",\n'
        '          "sfx_recommend": "ding / boom / slap / whoosh / record_scratch 중 택1"\n'
        '        }\n'
        '      ]\n'
        '    }\n'
        '  ]\n'
        "}"
    )

    user_prompt = (
        f"분석할 영상 소스 내용:\n{content_context[:4000]}\n\n"
        f"프리셋: {req.preset_id}\n"
        f"사용자 추가 지침: {req.custom_prompt or '없음'}\n"
        f"목표 에피소드 수량: {req.episode_count if req.target_duration_type == 'shorts' else 1}개\n"
        f"각 에피소드는 1분 미만(45~59초)으로 긴장감 넘치는 기승전결 완결성을 갖춰야 합니다."
    )

    try:
        resp = llm_client.generate_content(
            prompt=user_prompt,
            model_name=target_model,
            system_instruction=system_prompt,
            full_response=True
        )
        raw_text = resp.get("content", "") if isinstance(resp, dict) else str(resp)
        result = parse_json_safely(raw_text)
        return {"success": True, "data": result, "model_used": target_model}
    except Exception as e:
        logger.error(f"Failed to split episodes: {e}")
        raise HTTPException(status_code=500, detail=f"에피소드 분할 분석 실패: {str(e)}")

@router.post("/export-capcut")
def export_capcut_project(
    req: ExportCapCutRequest,
    db: Session = Depends(database.get_db)
):
    """
    퇴고된 에피소드 클립 데이터를 11단 멀티 트랙 CapCut 규격 draft_content.json으로 조립하여 내보냄
    """
    try:
        export_root = os.path.join(app_settings.MEDIA_ROOT, "05_Exports", "CapCut_Projects")
        os.makedirs(export_root, exist_ok=True)
        
        safe_title = re.sub(r'[\\/*?:"<>|]', "", req.project_title).strip() or "SceneStudio_Export"
        project_folder = os.path.join(export_root, f"{safe_title}_{uuid.uuid4().hex[:6]}")
        os.makedirs(project_folder, exist_ok=True)

        # Build 11-Track CapCut Structure
        draft_content = {
            "canvas_config": {"height": 1920, "width": 1080, "ratio": "9:16"},
            "color_space": 0,
            "config": {"adjust_max_index": 1, "attachment_info": []},
            "fps": 30.0,
            "materials": {
                "videos": [],
                "audios": [],
                "texts": [],
                "stickers": [],
                "sound_effects": []
            },
            "tracks": [
                {"id": "track_1_title", "type": "text", "name": "Track 1: 제목 (상단 훅)", "segments": []},
                {"id": "track_2_jab", "type": "text", "name": "Track 2: 쨉쨉이 (중앙 드립 스티커)", "segments": []},
                {"id": "track_3_narration_sub", "type": "text", "name": "Track 3: 나레이션 자막", "segments": []},
                {"id": "track_4_speaker_a_sub", "type": "text", "name": "Track 4: 인물 대사 1 (화자 A)", "segments": []},
                {"id": "track_5_speaker_b_sub", "type": "text", "name": "Track 5: 인물 대사 2 (화자 B)", "segments": []},
                {"id": "track_6_video", "type": "video", "name": "Track 6: 비디오 컷", "segments": []},
                {"id": "track_7_narration_tts", "type": "audio", "name": "Track 7: 나레이션 TTS", "segments": []},
                {"id": "track_8_speaker_a_tts", "type": "audio", "name": "Track 8: 인물 더빙 1", "segments": []},
                {"id": "track_9_speaker_b_tts", "type": "audio", "name": "Track 9: 인물 더빙 2", "segments": []},
                {"id": "track_10_orig_audio", "type": "audio", "name": "Track 10: 원본 오디오", "segments": []},
                {"id": "track_11_sfx", "type": "audio", "name": "Track 11: SFX 효과음", "segments": []},
            ]
        }

        # Populate tracks with microsecond timecodes
        current_timeline_us = 0
        for ep_idx, episode in enumerate(req.episodes):
            clips = episode.get("clips", [])
            for clip in clips:
                dur_us = int(float(clip.get("duration", 3.0)) * 1_000_000)
                seg_target_timerange = {"duration": dur_us, "start": current_timeline_us}

                # 1. Title (Top Hook)
                if episode.get("top_hook"):
                    draft_content["tracks"][0]["segments"].append({
                        "id": f"seg_hook_{ep_idx}_{clip.get('clip_id')}",
                        "target_timerange": seg_target_timerange,
                        "text": episode["top_hook"]
                    })

                # 2. Jab Sticker (중앙 드립)
                if clip.get("jab_sticker"):
                    draft_content["tracks"][1]["segments"].append({
                        "id": f"seg_jab_{clip.get('clip_id')}",
                        "target_timerange": seg_target_timerange,
                        "text": clip["jab_sticker"]
                    })

                # 3. Narration Subtitle
                if clip.get("narration"):
                    draft_content["tracks"][2]["segments"].append({
                        "id": f"seg_narr_sub_{clip.get('clip_id')}",
                        "target_timerange": seg_target_timerange,
                        "text": clip["narration"]
                    })

                # 4. Speaker A Subtitle
                if clip.get("speaker_a_dialogue"):
                    draft_content["tracks"][3]["segments"].append({
                        "id": f"seg_spk_a_{clip.get('clip_id')}",
                        "target_timerange": seg_target_timerange,
                        "text": clip["speaker_a_dialogue"]
                    })

                # 5. Speaker B Subtitle
                if clip.get("speaker_b_dialogue"):
                    draft_content["tracks"][4]["segments"].append({
                        "id": f"seg_spk_b_{clip.get('clip_id')}",
                        "target_timerange": seg_target_timerange,
                        "text": clip["speaker_b_dialogue"]
                    })

                # 6. Video Slice
                source_start_us = int(float(clip.get("source_start", 0)) * 1_000_000)
                draft_content["tracks"][5]["segments"].append({
                    "id": f"seg_vid_{clip.get('clip_id')}",
                    "source_timerange": {"duration": dur_us, "start": source_start_us},
                    "target_timerange": seg_target_timerange,
                    "material_path": req.video_path
                })

                current_timeline_us += dur_us

        # Save draft_content.json and project metadata
        draft_path = os.path.join(project_folder, "draft_content.json")
        with open(draft_path, "w", encoding="utf-8") as f:
            json.dump(draft_content, f, ensure_ascii=False, indent=2)

        meta_path = os.path.join(project_folder, "draft_meta_info.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump({
                "draft_id": str(uuid.uuid4()),
                "draft_name": safe_title,
                "draft_root_path": project_folder,
                "tm_draft_create": int(uuid.uuid1().time)
            }, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "project_path": project_folder,
            "total_duration_sec": current_timeline_us / 1_000_000,
            "total_segments": len(draft_content["tracks"][5]["segments"])
        }
    except Exception as e:
        logger.error(f"Failed to export CapCut project: {e}")
        raise HTTPException(status_code=500, detail=f"CapCut 프로젝트 내보내기 실패: {str(e)}")
