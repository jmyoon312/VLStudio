import os
import json
import uuid
import re
import shutil
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas
from app.config import settings as app_settings
from app.llm_manager import LLMClient
from app.dependency_manager import DependencyManager
from app.utils.ytdlp_utils import get_standard_ytdlp_opts

logger = logging.getLogger(__name__)

router = APIRouter(tags=["video-creative"])


# ==========================================
# Pydantic Request & Response Schemas
# ==========================================

class AnalyzeScriptRequest(BaseModel):
    script: str
    title: Optional[str] = ""
    surfaces: Optional[List[str]] = ["youtube", "instagram", "tiktok"]
    languages: Optional[List[str]] = ["ko", "en", "zh", "ja"]
    custom_languages: Optional[List[str]] = []


class MatchClipsRequest(BaseModel):
    scenes: List[Dict[str, Any]]
    candidate_urls: Optional[List[str]] = []
    local_video_paths: Optional[List[str]] = []
    target_source_count: int = 4
    surfaces: Optional[List[str]] = ["youtube", "instagram", "tiktok"]
    languages: Optional[List[str]] = ["ko"]


class RewriteScriptRequest(BaseModel):
    script: str
    tone: Optional[str] = "viral_hook" # "viral_hook" | "humor_story" | "deep_narrative"


class GenerateTTSRequest(BaseModel):
    text: str
    engine: Optional[str] = "supertone-local"
    language: Optional[str] = "ko"
    voice_id: Optional[str] = None
    rate: Optional[int] = 0
    pitch: Optional[int] = 0
    emotion: Optional[str] = "normal"
    silence_enabled: Optional[bool] = False


class AssembleCapCutRequest(BaseModel):
    project_title: str
    script: str
    scenes: List[Dict[str, Any]]
    downloaded_sources: List[Dict[str, Any]]
    audio_source: Optional[Dict[str, Any]] = None
    framing_mode: Optional[str] = "fit" # "fit" / "scene-preserve" (장면 전체 보존) | "fill" (세로 꽉 채우기)
    subtitle_preset: Optional[str] = "default" # "default" | "yellow_pop" | "neon_cyan" | "gunlimbo"
    entities: Optional[List[Dict[str, str]]] = []
    candidate_urls: Optional[List[str]] = []


class OpenDraftRequest(BaseModel):
    draft_path: str
    mode: Optional[str] = "folder" # "folder" | "file"


# ==========================================
# 1. STT: MP3 음성 대본 추출 (Faster-Whisper)
# ==========================================

@router.post("/stt")
async def extract_audio_stt(
    audio: UploadFile = File(...),
    language: Optional[str] = Form("auto"),
    db: Session = Depends(get_db)
):
    """
    MP3/오디오 파일을 로컬 Faster-Whisper로 전사하여 대본과 문장별 타임코드를 추출합니다.
    """
    try:
        # 1. 02_Operations/Temp 경로 준비
        temp_dir = os.path.join(app_settings.OPERATIONS_DIR, "Temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        safe_filename = f"stt_{uuid.uuid4().hex[:8]}_{re.sub(r'[^a-zA-Z0-9_.-]', '_', audio.filename or 'audio.mp3')}"
        audio_save_path = os.path.join(temp_dir, safe_filename)
        
        with open(audio_save_path, "wb") as f:
            shutil.copyfileobj(audio.file, f)
            
        # 2. ffprobe를 통한 duration 정밀 측정 (ms)
        duration_ms = 0
        try:
            cmd = [
                DependencyManager.get_ffmpeg_path().replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe"),
                "-v", "error", "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1", audio_save_path
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            dur_sec = float(res.stdout.strip() or 0.0)
            duration_ms = int(dur_sec * 1000)
        except Exception as e:
            logger.warning(f"ffprobe duration probe warning: {e}")
            duration_ms = 30000 # fallback 30s
            
        # 3. SubtitleEngine / Faster-Whisper 호출
        from app.subtitle_core import SubtitleEngine
        db_settings = crud.get_settings(db)
        whisper_path = db_settings.whisper_model_path or os.getenv("WHISPER_MODEL_PATH", "base")
        
        engine = SubtitleEngine(
            ffmpeg_path=DependencyManager.get_ffmpeg_path(),
            model_path=whisper_path
        )
        
        raw_srt, error = engine.extract_subtitle(
            audio_save_path,
            model_name="base",
            language=None if language in ("auto", "", None) else language
        )
        
        if error and not raw_srt:
            raise HTTPException(status_code=500, detail=f"STT 전사 실패: {error}")
            
        # 4. SRT를 파싱하여 문장별 timedSegments 생성
        timed_segments = []
        transcript_lines = []
        
        # SRT block regex: index, timestamp, text
        srt_pattern = re.compile(
            r'(\d+)\s*\n(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*\n(.*?)(?=\n\s*\n|\Z)',
            re.DOTALL
        )
        
        def srt_time_to_ms(ts_str):
            ts_str = ts_str.replace(",", ".")
            parts = ts_str.split(":")
            h = int(parts[0])
            m = int(parts[1])
            s_parts = parts[2].split(".")
            s = int(s_parts[0])
            ms = int(s_parts[1]) if len(s_parts) > 1 else 0
            return (h * 3600 + m * 60 + s) * 1000 + ms
            
        matches = srt_pattern.findall(raw_srt or "")
        if matches:
            for m in matches:
                seg_idx = int(m[0])
                start_ms = srt_time_to_ms(m[1])
                end_ms = srt_time_to_ms(m[2])
                text_clean = m[3].strip().replace("\n", " ")
                if text_clean:
                    timed_segments.append({
                        "id": seg_idx,
                        "text": text_clean,
                        "startMs": start_ms,
                        "endMs": end_ms,
                        "durationMs": max(500, end_ms - start_ms)
                    })
                    transcript_lines.append(text_clean)
        else:
            # Fallback: simple line split if srt parsing returned raw text
            text_clean = (raw_srt or "").strip()
            if text_clean:
                lines = [l.strip() for l in text_clean.split("\n") if l.strip() and not l.strip().isdigit()]
                avg_ms = duration_ms // max(1, len(lines))
                for i, line in enumerate(lines):
                    timed_segments.append({
                        "id": i + 1,
                        "text": line,
                        "startMs": i * avg_ms,
                        "endMs": (i + 1) * avg_ms,
                        "durationMs": avg_ms
                    })
                    transcript_lines.append(line)
                    
        full_transcript = " ".join(transcript_lines)
        
        return {
            "status": "ready",
            "source": {
                "filename": audio.filename or os.path.basename(audio_save_path),
                "path": audio_save_path,
                "durationMs": duration_ms,
                "transcript": full_transcript,
                "timedSegments": timed_segments
            }
        }
    except Exception as e:
        logger.error(f"[VideoCreative STT] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 2. Analyze: 대본 AI 씬 분할 & 엔티티 추출
# ==========================================

@router.post("/analyze")
async def analyze_script_for_video_creative(
    request: AnalyzeScriptRequest,
    db: Session = Depends(get_db)
):
    """
    대본을 DB Settings LLM을 활용해 문장별 시각 타깃(target), 검색 쿼리(query), 
    및 인물/키워드 엔티티(entities)로 구조화 분해합니다.
    """
    settings = crud.get_settings(db)
    
    # [ZERO HARDCODING LAW] DB Settings 단일 진실 공급원
    model_name = settings.script_analysis_model or settings.default_llm_model
    if not model_name:
        model_name = "viraloop1" # Fallback to default user combo route
        
    script_text = request.script.strip()
    if not script_text:
        raise HTTPException(status_code=400, detail="대본이 비어 있습니다.")
        
    title = request.title.strip()
    if not title:
        first_line = script_text.split("\n")[0].strip()
        title = first_line[:30] if len(first_line) > 30 else first_line
        
    system_instruction = (
        "당신은 바이럴 숏폼 영상 연출 및 B-Roll 스톡 비디오 기획 전문가입니다.\n"
        "제공된 대본을 숏폼 리듬에 맞추어 문장/호흡 단위로 분할하고 각 장면마다 다음 정보를 도출하세요:\n"
        "1. line: 원본 문장 텍스트\n"
        "2. target: 이 장면에 어울리는 시각적 핵심 상황/사물 묘사 (한국어 15자 내외)\n"
        "3. query: YouTube 및 스톡 비디오 검색용 핵심 키워드 (한국어/영어 혼용, 예: '스마트폰 분해 close up')\n"
        "4. search_query_en: Pexels/Shutterstock/YouTube 영문 검색 최적화 쿼리 (예: 'smartphone teardown high quality 4k')\n"
        "5. shot_type: 연출 구도 (closeup, medium, wide, macro, pov 중 1개)\n"
        "6. mood: 분위기/톤 (energetic, intense, curiosity, calm, humorous 중 1개)\n"
        "7. visual_description: 영상 클립을 찾거나 생성할 때 참고할 세부 비주얼 설명 (한 줄)\n\n"
        "또한 대본 전체에서 핵심 인물, 사물, 핵심 키워드를 'entities' 목록으로 추출하세요.\n\n"
        "반드시 아래 JSON 형식으로만 응답하세요:\n"
        "{\n"
        "  \"title\": \"추천 제목\",\n"
        "  \"entities\": [\n"
        "    {\"type\": \"keyword\", \"label\": \"케이블 타이\"},\n"
        "    {\"type\": \"object\", \"label\": \"지폐\"},\n"
        "    {\"type\": \"person\", \"label\": \"중국 공장\"}\n"
        "  ],\n"
        "  \"scenes\": [\n"
        "    {\n"
        "      \"id\": 1,\n"
        "      \"line\": \"문장 내용\",\n"
        "      \"target\": \"상황 묘사\",\n"
        "      \"query\": \"스마트폰 클로즈업\",\n"
        "      \"search_query_en\": \"smartphone teardown macro shot\",\n"
        "      \"shot_type\": \"closeup\",\n"
        "      \"mood\": \"curiosity\",\n"
        "      \"visual_description\": \"카메라가 스마트폰 내부 부품을 초접사로 비추는 장면\"\n"
        "    }\n"
        "  ]\n"
        "}"
    )
    
    user_prompt = f"제목 제안 및 분석할 대본:\n{script_text}"
    
    llm_client = LLMClient(settings)
    parsed_result = None
    
    try:
        response = llm_client.generate_content(
            prompt=user_prompt,
            model_name=model_name,
            system_instruction=system_instruction
        )
        
        content = ""
        if isinstance(response, dict):
            content = response.get("content", "")
        else:
            content = str(response)
            
        # 1차: Markdown code block 파싱
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            parsed_result = json.loads(json_match.group(1))
        else:
            # 2차: 최외곽 중괄호 블록 파싱
            brace_match = re.search(r'(\{[\s\S]*\})', content)
            if brace_match:
                parsed_result = json.loads(brace_match.group(1))
            else:
                parsed_result = json.loads(content)
    except Exception as e:
        logger.warning(f"[VideoCreative Analyze] LLM generation warning: {e}. Executing rule-based analyzer.")
        
    # Robust Rule-Based Fallback if LLM output fails
    if not parsed_result or not isinstance(parsed_result, dict) or "scenes" not in parsed_result:
        sentences = [s.strip() for s in re.split(r'(?<=[.?!])\s+|\n+', script_text) if s.strip()]
        fallback_scenes = []
        fallback_entities = []
        
        shot_types_pool = ["closeup", "medium", "wide", "macro", "pov"]
        moods_pool = ["energetic", "curiosity", "intense", "calm"]
        
        for idx, sentence in enumerate(sentences):
            # Extract basic nouns / tokens
            words = [w for w in re.findall(r'[가-힣a-zA-Z0-9]+', sentence) if len(w) >= 2]
            target_desc = f"{words[0]} {words[1] if len(words)>1 else '상황'}" if words else "장면 연출"
            query_kw = f"{' '.join(words[:2])} b-roll stock" if words else "viral shorts footage"
            en_query = f"{' '.join(words[:2])} cinematic footage 4k" if words else "trending viral video clip"
            
            fallback_scenes.append({
                "id": idx + 1,
                "line": sentence,
                "target": target_desc,
                "query": query_kw,
                "search_query_en": en_query,
                "shot_type": shot_types_pool[idx % len(shot_types_pool)],
                "mood": moods_pool[idx % len(moods_pool)],
                "visual_description": f"{target_desc}을(를) 강조하는 숏폼 클립"
            })
            for w in words[:2]:
                if not any(e["label"] == w for e in fallback_entities) and len(fallback_entities) < 6:
                    fallback_entities.append({"type": "keyword", "label": w})
                    
        parsed_result = {
            "title": title,
            "entities": fallback_entities,
            "scenes": fallback_scenes
        }
        
    # Ensure title is populated
    if not parsed_result.get("title"):
        parsed_result["title"] = title
        
    return parsed_result


# ==========================================
# 2-1. Rewrite: 숏폼 바이럴 후킹 AI 리라이팅
# ==========================================

@router.post("/rewrite-script")
async def rewrite_script_for_video_creative(
    request: RewriteScriptRequest,
    db: Session = Depends(get_db)
):
    """
    대본을 DB Settings LLM을 활용해 숏폼 바이럴 후킹 구조로 재작성합니다.
    """
    settings = crud.get_settings(db)
    model_name = settings.script_analysis_model or settings.default_llm_model or "viraloop1"
    
    script_text = request.script.strip()
    if not script_text:
        raise HTTPException(status_code=400, detail="대본이 비어 있습니다.")

    tone = request.tone or "viral_hook"
    
    tone_instructions = {
        "viral_hook": "첫 3초 시청자의 시선을 100% 사로잡는 강력한 의문형/충격형 0초 훅과 속도감 있는 간결한 문장 구조로 재작성하세요.",
        "humor_story": "반전 유머와 위트 있는 입담을 섞어 시청자가 끝까지 피식거리며 보게 만드는 스토리텔링 톤으로 재작성하세요.",
        "deep_narrative": "몰입감 넘치는 서사와 진지한 내레이션 어조로 정보와 반전을 전달하는 톤으로 재작성하세요."
    }
    tone_desc = tone_instructions.get(tone, tone_instructions["viral_hook"])

    system_instruction = (
        "당신은 유튜브 쇼츠, 인스타그램 릴스, 틱톡에서 1000만 조회수를 달성하는 숏폼 전문 바이럴 작가입니다.\n"
        f"{tone_desc}\n\n"
        "지침:\n"
        "1. 문장은 한 줄에 20~35자 내외로 호흡을 짧게 끊으세요.\n"
        "2. 총 4~6문장 분량으로 구성하세요.\n"
        "3. 부가 설명이나 인사말 없이 오직 완성된 대본 텍스트만을 그대로 출력하세요."
    )

    llm_client = LLMClient(settings)
    try:
        response = llm_client.generate_content(
            prompt=f"다음 원본 대본을 바이럴 숏폼 대본으로 고도화하세요:\n\n{script_text}",
            model_name=model_name,
            system_instruction=system_instruction
        )
        rewritten_text = ""
        if isinstance(response, dict):
            rewritten_text = response.get("content", "").strip()
        else:
            rewritten_text = str(response).strip()
            
        if not rewritten_text:
            rewritten_text = script_text
            
        return {
            "status": "success",
            "rewrittenScript": rewritten_text,
            "originalLength": len(script_text),
            "rewrittenLength": len(rewritten_text)
        }
    except Exception as e:
        logger.error(f"[RewriteScript] LLM Error: {e}")
        raise HTTPException(status_code=500, detail=f"대본 AI 변환 실패: {str(e)}")


# ==========================================
# 3. Match Clips: 로컬 07_Downloads 및 에셋 매칭
# ==========================================

@router.post("/match-clips")
async def match_local_clips(
    request: MatchClipsRequest,
    db: Session = Depends(get_db)
):
    """
    07_Downloads 및 03_Assets에 보관된 비디오 클립을 검색하여 매칭하거나,
    후보 URL이 있을 경우 스텔스 프록시를 적용해 다운로드 후 반환합니다.
    사용자가 드롭하거나 선택한 로컬 비디오(local_video_paths)를 최우선으로 매칭합니다.
    """
    downloads_dir = app_settings.DOWNLOADS_DIR
    matched_sources = []
    max_target = max(1, request.target_source_count)
    vc_download_dir = os.path.join(downloads_dir, "VideoCreative")
    os.makedirs(vc_download_dir, exist_ok=True)
    
    settings = crud.get_settings(db)
    socks5_proxy = None
    try:
        if settings and getattr(settings, 'use_proxy', False):
            host = getattr(settings, 'proxy_host', '')
            port = getattr(settings, 'proxy_port', '')
            if host and port:
                socks5_proxy = f"socks5://{host}:{port}"
    except Exception:
        pass
        
    ffprobe_bin = DependencyManager.get_ffmpeg_path().replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe")

    # [1순위] 사용자가 드래그 앤 드롭 또는 라이브러리 모달에서 직접 선택한 로컬 파일
    if request.local_video_paths:
        for lpath in request.local_video_paths:
            if len(matched_sources) >= max_target:
                break
            clean_path = lpath.strip()
            if os.path.exists(clean_path) and os.path.isfile(clean_path):
                fname = os.path.basename(clean_path)
                dur_ms = 15000
                try:
                    cmd = [ffprobe_bin, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", clean_path]
                    res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    dur_ms = int(float(res.stdout.strip() or 15.0) * 1000)
                except Exception:
                    pass
                matched_sources.append({
                    "filename": fname,
                    "filePath": clean_path,
                    "sourceUrl": f"file:///{clean_path.replace(os.sep, '/')}",
                    "title": fname.rsplit(".", 1)[0],
                    "durationMs": dur_ms
                })

    # [2순위] 후보 URL 다운로드 및 매핑 (목표 소스 수가 부족할 때만)
    if len(matched_sources) < max_target and request.candidate_urls:
        remaining_needed = max_target - len(matched_sources)
        for idx, url in enumerate(request.candidate_urls[:remaining_needed]):
            clean_url = url.strip()
            if not clean_url:
                continue
                
            dl_result = None
            try:
                def _download_candidate_url():
                    import yt_dlp
                    out_tmpl = os.path.join(vc_download_dir, "%(id)s.%(ext)s")
                    extra = {
                        'outtmpl': out_tmpl,
                        'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                        'max_filesize': 80 * 1024 * 1024,
                        'socket_timeout': 15,
                    }
                    if socks5_proxy:
                        extra['proxy'] = socks5_proxy
                    ydl_opts = get_standard_ytdlp_opts(extra)
                        
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        info = ydl.extract_info(clean_url, download=True)
                        if info:
                            vid_id = info.get("id", f"url_{idx+1}")
                            ext = info.get("ext", "mp4")
                            title = info.get("title", f"후보 영상 #{idx+1}")
                            dur = float(info.get("duration", 15) or 15)
                            fpath = os.path.join(vc_download_dir, f"{vid_id}.{ext}")
                            if os.path.exists(fpath):
                                return {
                                    "filename": os.path.basename(fpath),
                                    "filePath": fpath,
                                    "sourceUrl": clean_url,
                                    "title": title,
                                    "durationMs": int(dur * 1000)
                                }
                    return None

                dl_result = await asyncio.wait_for(
                    asyncio.to_thread(_download_candidate_url),
                    timeout=25.0
                )
            except Exception as e:
                logger.warning(f"yt_dlp download for candidate url {clean_url} warning: {e}")
                
            if dl_result:
                matched_sources.append(dl_result)
            else:
                matched_sources.append({
                    "filename": f"candidate_url_{idx+1}.mp4",
                    "filePath": clean_url,
                    "sourceUrl": clean_url,
                    "title": f"후보 영상 #{idx+1}",
                    "durationMs": 15000
                })

    # [3순위] 07_Downloads 하위 로컬 비디오 보관함 자동 스캔 매칭
    needed = max_target - len(matched_sources)
    if needed > 0 and os.path.exists(downloads_dir):
        local_videos = []
        for root, _, files in os.walk(downloads_dir):
            for file in files:
                if file.lower().endswith((".mp4", ".mov", ".mkv", ".webm")):
                    full_path = os.path.join(root, file)
                    # 이미 matched_sources에 포함된 경로는 제외
                    if any(s.get("filePath") == full_path for s in matched_sources):
                        continue
                    try:
                        size_mb = os.path.getsize(full_path) / (1024 * 1024)
                        if size_mb > 0.5:
                            local_videos.append(full_path)
                    except Exception:
                        pass
                        
        if local_videos:
            for v_path in local_videos[:needed]:
                fname = os.path.basename(v_path)
                dur_ms = 10000
                try:
                    cmd = [ffprobe_bin, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", v_path]
                    res = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                    dur_ms = int(float(res.stdout.strip() or 10.0) * 1000)
                except Exception:
                    pass
                    
                matched_sources.append({
                    "filename": fname,
                    "filePath": v_path,
                    "sourceUrl": f"file:///{v_path.replace(os.sep, '/')}",
                    "title": fname.rsplit(".", 1)[0],
                    "durationMs": dur_ms
                })

    # [4순위] 미디어 0% 결손 방어: FFmpeg 9:16 모션 배경 비디오 자동 생성
    if len(matched_sources) == 0:
        placeholder_path = os.path.join(vc_download_dir, "vc_motion_bg_1080x1920.mp4")
        if not os.path.exists(placeholder_path) or os.path.getsize(placeholder_path) < 1000:
            try:
                ffmpeg_bin = DependencyManager.get_ffmpeg_path()
                cmd = [
                    ffmpeg_bin, "-y", "-f", "lavfi",
                    "-i", "color=c=0x18181b:s=1080x1920:d=15:r=30",
                    "-c:v", "libx264", "-pix_fmt", "yuv420p",
                    placeholder_path
                ]
                subprocess.run(cmd, capture_output=True, timeout=15)
            except Exception as bg_err:
                logger.warning(f"Failed to generate fallback background: {bg_err}")
                
        if os.path.exists(placeholder_path):
            matched_sources.append({
                "filename": "vc_motion_bg_1080x1920.mp4",
                "filePath": placeholder_path,
                "sourceUrl": "local://vc_motion_bg_1080x1920.mp4",
                "title": "9:16 세로 숏폼 배경",
                "durationMs": 15000
            })

    return {
        "status": "success",
        "matchedCount": len(matched_sources),
        "downloadedSources": matched_sources
    }


# ==========================================
# 3-1. Library Videos: 로컬 보관함 비디오 목록 조회
# ==========================================

@router.get("/library-videos")
async def get_library_videos(
    request: Request,
    limit: int = 60,
    search: Optional[str] = None
):
    """
    07_Downloads 및 05_Exports에서 사용 가능한 로컬 비디오 목록을 스캔하여 반환합니다.
    """
    from app.utils import get_web_url
    
    scan_roots = [
        app_settings.DOWNLOADS_DIR,
        os.path.join(app_settings.EXPORTS_DIR, "CapCut_Projects"),
        app_settings.EXPORTS_DIR
    ]
    
    videos = []
    seen_paths = set()
    ffprobe_bin = DependencyManager.get_ffmpeg_path().replace("ffmpeg.exe", "ffprobe.exe").replace("ffmpeg", "ffprobe")
    
    for root_dir in scan_roots:
        if not os.path.exists(root_dir):
            continue
            
        for cur_dir, _, files in os.walk(root_dir):
            for file in files:
                if file.lower().endswith((".mp4", ".mov", ".mkv", ".webm")):
                    full_path = os.path.abspath(os.path.join(cur_dir, file))
                    if full_path in seen_paths:
                        continue
                    seen_paths.add(full_path)
                    
                    if search and search.lower() not in file.lower():
                        continue
                        
                    try:
                        stat = os.stat(full_path)
                        size_mb = round(stat.st_size / (1024 * 1024), 2)
                        if size_mb < 0.2: # 200KB 미만 깨진 파일 무시
                            continue
                            
                        # Duration 정밀 측정 (간이 캐시/빠른 probe)
                        duration_sec = 15.0
                        try:
                            cmd = [ffprobe_bin, "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", full_path]
                            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3)
                            dur_str = res.stdout.strip()
                            if dur_str:
                                duration_sec = round(float(dur_str), 1)
                        except Exception:
                            pass
                            
                        web_url = get_web_url(request, full_path)
                        
                        videos.append({
                            "id": uuid.uuid5(uuid.NAMESPACE_URL, full_path).hex[:12],
                            "filename": file,
                            "title": file.rsplit(".", 1)[0],
                            "filePath": full_path,
                            "webUrl": web_url,
                            "sizeMb": size_mb,
                            "durationSec": duration_sec,
                            "mtime": stat.st_mtime
                        })
                    except Exception:
                        pass
                        
    # 최근 수정된 순으로 정렬
    videos.sort(key=lambda x: x["mtime"], reverse=True)
    
    return {
        "status": "success",
        "total": len(videos),
        "videos": videos[:limit]
    }


# ==========================================
# 3-2. Generate TTS: 대본 음성 생성 & Whisper 타임스탬프 추출
# ==========================================

@router.post("/generate-tts")
async def generate_tts_for_video_creative(
    request: Request,
    body: GenerateTTSRequest,
    db: Session = Depends(get_db)
):
    """
    영상 창작형을 위한 다중 엔진(Supertonic, ElevenLabs, Typecast, Kokoro) 음성 생성 및 Faster-Whisper 타임코드 자동 추출.
    """
    text = body.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="TTS 생성할 대본 텍스트가 비어 있습니다.")
        
    settings = crud.get_settings(db)
    
    try:
        from app.tts_engine import TTSEngine
        from app.utils import get_web_url
        from app.subtitle_core import SubtitleEngine
        
        tts_engine = TTSEngine(settings)
        engine_name = body.engine or "supertone-local"
        voice_id = body.voice_id or "F1"
        
        tts_result = await tts_engine.generate_audio(
            text=text,
            engine=engine_name,
            language=body.language or "ko",
            voice_id=voice_id,
            rate=body.rate or 0,
            pitch=body.pitch or 0,
            emotion=body.emotion or "normal",
            silence_enabled=body.silence_enabled or False
        )
        
        output_path = tts_result["file_path"]
        web_url = get_web_url(request, output_path)
        
        # Duration 측정
        duration_ms = 0
        try:
            duration_sec = DependencyManager.get_media_duration(output_path)
            duration_ms = int(duration_sec * 1000)
        except Exception:
            duration_ms = 30000
            
        # Whisper 타임스탬프 추출
        whisper_path = settings.whisper_model_path or os.getenv("WHISPER_MODEL_PATH", "base")
        sub_engine = SubtitleEngine(
            ffmpeg_path=DependencyManager.get_ffmpeg_path(),
            model_path=whisper_path
        )
        
        raw_srt, error = sub_engine.extract_subtitle(
            output_path,
            model_name="base",
            language=body.language if body.language not in ("auto", None) else "ko"
        )
        
        # SRT 파싱
        segments = []
        if raw_srt:
            srt_blocks = re.split(r'\n\s*\n', raw_srt.strip())
            for block in srt_blocks:
                lines = [l.strip() for l in block.split('\n') if l.strip()]
                if len(lines) >= 3:
                    time_match = re.search(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', lines[1])
                    if time_match:
                        def parse_ms(tc: str) -> int:
                            h, m, s_ms = tc.split(':')
                            s, ms = s_ms.split(',')
                            return (int(h)*3600 + int(m)*60 + int(s))*1000 + int(ms)
                            
                        start_ms = parse_ms(time_match.group(1))
                        end_ms = parse_ms(time_match.group(2))
                        seg_text = ' '.join(lines[2:])
                        segments.append({
                            "text": seg_text,
                            "startMs": start_ms,
                            "endMs": end_ms,
                            "durationMs": end_ms - start_ms
                        })
                        
        return {
            "status": "success",
            "audioPath": output_path,
            "webUrl": web_url,
            "durationMs": duration_ms,
            "filename": os.path.basename(output_path),
            "transcript": text,
            "segments": segments
        }
    except Exception as e:
        logger.error(f"[VideoCreative TTS] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"TTS 음성 생성 실패: {str(e)}")


# ==========================================
# 4. Assemble: CapCut 11단 초안 프로젝트 조립
# ==========================================

@router.post("/assemble")
async def assemble_capcut_project(request: AssembleCapCutRequest):
    """
    영상 창작형 프로젝트를 CapCut 규격 draft_content.json으로 조립하여
    %LOCALAPPDATA%/ViraLoop Studio/media/05_Exports/CapCut_Projects/에 저장합니다.
    """
    try:
        from app.legacy_ddalkkak.workers.capcut_builder import CapCutBuilder
        from app.legacy_ddalkkak.workers.capcut_registry_manager import CapCutRegistryManager
        
        safe_title = re.sub(r'[\\/*?:"<>|]', '_', request.project_title.strip()) or f"VideoCreative_{int(uuid.uuid4().hex[:6], 16)}"
        
        # 05_Exports/CapCut_Projects 표준 경로 (Single Source of Truth)
        capcut_root = os.path.join(app_settings.EXPORTS_DIR, "CapCut_Projects")
        os.makedirs(capcut_root, exist_ok=True)
        
        project_folder = os.path.join(capcut_root, safe_title)
        os.makedirs(project_folder, exist_ok=True)
        
        builder = CapCutBuilder(project_name=safe_title)
        
        # 0. 자막 스타일 프리셋 설정
        preset_styles = {
            "default": {
                "size": 8.0,
                "color": [1.0, 1.0, 1.0],
                "stroke_color": [0.0, 0.0, 0.0],
                "stroke_width": 0.05,
            },
            "yellow_pop": {
                "size": 9.0,
                "color": [1.0, 0.9, 0.0],
                "stroke_color": [0.0, 0.0, 0.0],
                "stroke_width": 0.09,
            },
            "neon_cyan": {
                "size": 9.0,
                "color": [0.0, 0.95, 1.0],
                "stroke_color": [0.05, 0.05, 0.2],
                "stroke_width": 0.08,
            },
            "gunlimbo": {
                "size": 9.5,
                "color": [1.0, 1.0, 0.2],
                "stroke_color": [0.0, 0.0, 0.0],
                "stroke_width": 0.12,
            }
        }
        style_cfg = preset_styles.get(request.subtitle_preset or "default", preset_styles["default"])
        
        # 1. 텍스트/자막 세그먼트 시간축 사전 구성
        text_segments = []
        if request.audio_source and request.audio_source.get("timedSegments"):
            for seg in request.audio_source.get("timedSegments"):
                text_segments.append({
                    "text": seg.get("text", ""),
                    "start": seg.get("startMs", 0) / 1000.0,
                    "duration": seg.get("durationMs", 2000) / 1000.0
                })
        else:
            base_total = max(10.0, len(request.scenes) * 3.0)
            sec_per_scene = base_total / max(1, len(request.scenes))
            for idx, sc in enumerate(request.scenes):
                text_segments.append({
                    "text": sc.get("line", ""),
                    "start": idx * sec_per_scene,
                    "duration": sec_per_scene
                })

        # 목표 전체 타임라인 길이 산정
        sources_to_use = request.downloaded_sources if request.downloaded_sources else []
        total_target_dur = 0.0
        if request.audio_source and request.audio_source.get("durationMs"):
            total_target_dur = float(request.audio_source.get("durationMs")) / 1000.0
        elif text_segments:
            last_seg = text_segments[-1]
            total_target_dur = last_seg["start"] + last_seg["duration"]
        if total_target_dur <= 0:
            total_target_dur = max(10.0, len(sources_to_use) * 3.5)

        # 2. 비디오 세그먼트 배치 (Layer 0) - 발화 리듬 및 씬 균등 동기화
        current_time_sec = 0.0
        if sources_to_use:
            num_sources = len(sources_to_use)
            slot_dur = max(2.0, total_target_dur / num_sources)
            for idx, source in enumerate(sources_to_use):
                v_path = source.get("filePath", "")
                if v_path.startswith("file:///"):
                    v_path = v_path.replace("file:///", "").replace("/", os.sep)
                if os.path.exists(v_path):
                    dur = float(source.get("durationMs", slot_dur * 1000)) / 1000.0
                    actual_use_dur = min(slot_dur, dur)
                    builder.add_video_segment(v_path, duration_sec=actual_use_dur, start_time_sec=current_time_sec)
                    current_time_sec += actual_use_dur

        # 3. 오디오 세그먼트 배치 (오디오 트랙)
        if request.audio_source and request.audio_source.get("path"):
            a_path = request.audio_source.get("path")
            if os.path.exists(a_path):
                a_dur = float(request.audio_source.get("durationMs", 0)) / 1000.0
                if a_dur > 0:
                    builder.add_audio_segment(a_path, duration_sec=a_dur, start_time_sec=0.0)
                    if current_time_sec < a_dur:
                        current_time_sec = a_dur

        # 4. 자막 세그먼트 배치 (텍스트 트랙 - 프리셋 스타일 적용)
        for t_seg in text_segments:
            if t_seg["text"].strip():
                builder.add_text_segment(
                    content=t_seg["text"].strip(),
                    start_time_sec=t_seg["start"],
                    duration_sec=t_seg["duration"],
                    font_size=style_cfg["size"],
                    font_color=style_cfg["color"],
                    stroke_color=style_cfg["stroke_color"],
                    stroke_width=style_cfg["stroke_width"]
                )
                
        # 4. draft_content.json 파일 쓰기
        draft_json_path = os.path.join(project_folder, "draft_content.json")
        with open(draft_json_path, "w", encoding="utf-8") as f:
            json.dump(builder.data, f, ensure_ascii=False, indent=2)
            
        # 백업본 동시 생성
        with open(os.path.join(project_folder, "draft_content.json.bak"), "w", encoding="utf-8") as f:
            json.dump(builder.data, f, ensure_ascii=False, indent=2)
            
        # 5. CapCut 레지스트리에 프로젝트 등록
        registry_success = False
        try:
            registry_mgr = CapCutRegistryManager()
            registry_success = registry_mgr.register_draft(project_folder, safe_title)
        except Exception as e:
            logger.warning(f"CapCut registry registration warning: {e}")
            
        return {
            "success": True,
            "projectName": safe_title,
            "draftPath": draft_json_path,
            "draftFolder": project_folder,
            "registryRegistered": registry_success,
            "durationSec": current_time_sec,
            "clipCount": len(sources_to_use),
            "textCount": len(text_segments)
        }
    except Exception as e:
        logger.error(f"[VideoCreative Assemble] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 5. OS Explorer: 초안 폴더/파일 탐색기 열기
# ==========================================

@router.post("/open-draft")
async def open_draft_in_explorer(request: OpenDraftRequest):
    """
    생성된 CapCut 초안 폴더를 열거나(Explorer), 파일의 위치를 선택 상태로 엽니다.
    """
    target_path = request.draft_path.strip()
    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=404, detail="요청한 초안 경로가 존재하지 않습니다.")
        
    try:
        norm_path = os.path.normpath(target_path)
        if request.mode == "file" or os.path.isfile(norm_path):
            subprocess.Popen(["explorer.exe", f"/select,{norm_path}"])
        else:
            subprocess.Popen(["explorer.exe", norm_path])
        return {"success": True, "openedPath": norm_path}
    except Exception as e:
        logger.error(f"[Open Draft] Failed to open explorer: {e}")
        raise HTTPException(status_code=500, detail=f"탐색기를 열 수 없습니다: {e}")


# ==========================================
# 6. Metrics: 영상 창작형 요약 통계
# ==========================================

@router.get("/metrics")
async def get_video_creative_metrics():
    """
    영상 창작형의 현재 작업 수, 초안 폴더 현황 등을 반환합니다.
    """
    capcut_root = os.path.join(app_settings.EXPORTS_DIR, "CapCut_Projects")
    project_count = 0
    if os.path.exists(capcut_root):
        project_count = len([d for d in os.listdir(capcut_root) if os.path.isdir(os.path.join(capcut_root, d))])
        
    return {
        "exportedProjects": project_count,
        "exportRoot": capcut_root,
        "status": "online"
    }
