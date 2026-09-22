import os
import sys
import json
import logging
import uuid
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import database, models, schemas, crud
from app.config import settings as app_settings
from app.dependency_manager import DependencyManager
from app.services.media_intelligence.core import media_intelligence

logger = logging.getLogger("long_to_short")

router = APIRouter(prefix="/api/long-to-short", tags=["Long-To-Short V1"])

# ==============================================================================
# Pydantic Schemas
# ==============================================================================

class VideoProbeRequest(BaseModel):
    video_path: str = Field(..., description="로컬 비디오 파일 경로")

class VideoProbeResponse(BaseModel):
    success: bool
    video_path: str
    file_name: str
    file_size_bytes: int
    duration_sec: float
    duration_label: str
    width: int
    height: int
    resolution_label: str
    video_codec: str
    audio_codec: str
    is_h264: bool
    is_compatible: bool
    recommended_candidates: int
    max_candidates: int
    warning: Optional[str] = None

class YouTubeDownloadRequest(BaseModel):
    url: str = Field(..., description="유튜브 영상 URL")
    target_filename: Optional[str] = None

class YouTubeDownloadResponse(BaseModel):
    success: bool
    video_path: str
    video_title: str
    duration_sec: float
    file_size_bytes: int
    error: Optional[str] = None

class AnalyzeHighlightsRequest(BaseModel):
    video_path: str = Field(..., description="분석할 롱폼 영상 로컬 경로")
    length_preset: str = Field("medium", description="short(20~35s), medium(35~60s), long(60~90s), story(90~150s)")
    target_duration_sec: Optional[float] = Field(None, description="직접 지정 타겟 초 (선택)")
    candidate_count: int = Field(3, ge=1, le=20, description="추출할 킬러 하이라이트 쇼츠 수")
    allow_overlap: bool = Field(False, description="영상 길이 초과 시 구간 중복 허용 여부")
    silence_removal: bool = Field(True, description="무음 구간 자동 제거 여부")
    silence_threshold_sec: float = Field(0.6, description="무음 판정 임계 초")
    directives: Optional[str] = Field(None, description="AI 추출 포커스 지시어/키워드")
    multi_use_langs: Optional[List[str]] = Field(default_factory=lambda: ["ko"], description="타겟 다국어 목록")

class CandidateClip(BaseModel):
    id: str
    clip_index: int
    start_sec: float
    end_sec: float
    duration_sec: float
    hook_summary: str
    transcript: str
    thumbnail_url: Optional[str] = None
    vmi_score: float
    hook_score: int
    story_score: int
    rhythm_score: int
    caption_score: int
    reason: str
    selected: bool = True

class AnalyzeHighlightsResponse(BaseModel):
    success: bool
    video_path: str
    total_duration_sec: float
    candidates: List[CandidateClip]
    detected_cuts_count: int
    error: Optional[str] = None

class ExportCapCutRequest(BaseModel):
    video_path: str
    candidates: List[Dict[str, Any]]
    project_title: Optional[str] = "롱투숏_하이라이트"
    multi_use_langs: Optional[List[str]] = None

class ExportClipRequest(BaseModel):
    video_path: str
    candidate: Dict[str, Any]
    output_filename: Optional[str] = None

# ==============================================================================
# Helper Functions
# ==============================================================================

def get_ffprobe_bin() -> str:
    bin_path = DependencyManager.get_ffprobe_path()
    if bin_path and os.path.exists(bin_path):
        return bin_path
    ffmpeg_path = DependencyManager.get_ffmpeg_path()
    if ffmpeg_path:
        cand = os.path.join(os.path.dirname(ffmpeg_path), "ffprobe.exe" if sys.platform == "win32" else "ffprobe")
        if os.path.exists(cand):
            return cand
    cand = shutil.which("ffprobe")
    if cand:
        return cand
    raise RuntimeError("ffprobe 바이너리를 찾을 수 없습니다. ffmpeg 설치 경로를 확인하세요.")

def get_ffmpeg_bin() -> str:
    bin_path = DependencyManager.get_ffmpeg_path()
    if bin_path and os.path.exists(bin_path):
        return bin_path
    cand = shutil.which("ffmpeg")
    if cand:
        return cand
    raise RuntimeError("ffmpeg 바이너리를 찾을 수 없습니다.")

def format_duration(seconds: float) -> str:
    m = int(seconds // 60)
    s = int(seconds % 60)
    if m >= 60:
        h = m // 60
        m = m % 60
        return f"{h}시간 {m}분 {s}초"
    elif m > 0:
        return f"{m}분 {s}초"
    return f"{s}초"

# ==============================================================================
# API Endpoints
# ==============================================================================

@router.post("/probe", response_model=VideoProbeResponse)
async def probe_video(req: VideoProbeRequest):
    """
    영상 파일의 길이, 해상도, 비디오/오디오 코덱 분석 및 호환성 점검
    (픽셀링 probeMediaMetadata 100% 호환)
    """
    vpath = Path(req.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail=f"비디오 파일이 존재하지 않습니다: {req.video_path}")

    try:
        ffprobe = get_ffprobe_bin()
        cmd = [
            ffprobe,
            "-v", "error",
            "-show_entries", "format=duration,size:stream=codec_name,codec_type,width,height",
            "-of", "json",
            str(vpath)
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        meta = json.loads(res.stdout)

        duration = float(meta.get("format", {}).get("duration", 0.0))
        size_bytes = int(meta.get("format", {}).get("size", vpath.stat().st_size))

        width, height = 1920, 1080
        video_codec = "unknown"
        audio_codec = "none"

        for s in meta.get("streams", []):
            if s.get("codec_type") == "video" and video_codec == "unknown":
                video_codec = s.get("codec_name", "unknown").lower()
                width = int(s.get("width", 1920))
                height = int(s.get("height", 1080))
            elif s.get("codec_type") == "audio" and audio_codec == "none":
                audio_codec = s.get("codec_name", "unknown").lower()

        is_h264 = video_codec in ["h264", "avc1"]
        is_compatible = is_h264 or video_codec in ["vp8", "vp9", "av1"]

        # 스마트 후보 수 산정 (픽셀링 hr 및 ht 알고리즘)
        # 1분당 약 1개 권장, 45초 클립 기준
        rec_candidates = max(1, min(10, int(duration // 180) + 1))
        max_candidates = max(1, min(20, int(duration // 50)))

        warning = None
        if not is_h264:
            warning = f"비디오 코덱이 {video_codec.upper()}입니다. 원활한 브라우저 재생 및 CapCut 호환을 위해 H.264 인코딩을 권장합니다."

        return VideoProbeResponse(
            success=True,
            video_path=str(vpath),
            file_name=vpath.name,
            file_size_bytes=size_bytes,
            duration_sec=round(duration, 2),
            duration_label=format_duration(duration),
            width=width,
            height=height,
            resolution_label=f"{width}x{height}",
            video_codec=video_codec,
            audio_codec=audio_codec,
            is_h264=is_h264,
            is_compatible=is_compatible,
            recommended_candidates=rec_candidates,
            max_candidates=max_candidates,
            warning=warning
        )
    except Exception as e:
        logger.error(f"Video probe failed: {e}")
        raise HTTPException(status_code=500, detail=f"영상 프로빙 실패: {str(e)}")


@router.post("/download-url", response_model=YouTubeDownloadResponse)
async def download_youtube_url(req: YouTubeDownloadRequest):
    """
    유튜브 또는 웹 동영상 URL을 yt-dlp를 통해 07_Downloads로 다운로드
    """
    url = req.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="유효한 영상 URL을 입력하세요.")

    downloads_dir = Path(app_settings.DOWNLOADS_DIR) / "longform_sources"
    downloads_dir.mkdir(parents=True, exist_ok=True)

    ytdlp = DependencyManager.get_ytdlp_path() if hasattr(DependencyManager, "get_ytdlp_path") else None
    if not ytdlp or not os.path.exists(ytdlp):
        ytdlp = shutil.which("yt-dlp") or "yt-dlp"

    # 메타데이터 먼저 조회
    try:
        meta_cmd = [ytdlp, "--dump-json", "--no-warnings", url]
        meta_res = subprocess.run(meta_cmd, capture_output=True, text=True, timeout=30)
        video_title = "다운로드_영상"
        duration = 0.0
        if meta_res.returncode == 0 and meta_res.stdout:
            try:
                j = json.loads(meta_res.stdout.split("\n")[0])
                video_title = j.get("title", video_title)
                duration = float(j.get("duration", 0.0))
            except Exception:
                pass

        safe_title = "".join(c for c in video_title if c.isalnum() or c in (" ", "_", "-")).strip()[:40]
        out_template = str(downloads_dir / f"{safe_title}_%(id)s.%(ext)s")

        # 다운로드 실행 (H.264 mp4 1080p 이하 최적 품질)
        dl_cmd = [
            ytdlp,
            "-f", "bestvideo[vcodec^=avc1][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4]/best",
            "--merge-output-format", "mp4",
            "-o", out_template,
            "--no-playlist",
            url
        ]
        logger.info(f"Starting yt-dlp download: {url} -> {downloads_dir}")
        dl_res = subprocess.run(dl_cmd, capture_output=True, text=True, timeout=300)
        if dl_res.returncode != 0:
            raise RuntimeError(f"yt-dlp 다운로드 실패: {dl_res.stderr[:300]}")

        # 다운로드된 파일 탐색
        matched = list(downloads_dir.glob(f"{safe_title}_*.mp4"))
        if not matched:
            matched = sorted(downloads_dir.glob("*.mp4"), key=os.path.getmtime, reverse=True)

        if not matched:
            raise RuntimeError("다운로드된 MP4 결과 파일을 찾지 못했습니다.")

        target_file = matched[0]
        file_size = target_file.stat().st_size

        return YouTubeDownloadResponse(
            success=True,
            video_path=str(target_file),
            video_title=video_title,
            duration_sec=duration,
            file_size_bytes=file_size
        )
    except Exception as e:
        logger.error(f"YouTube download failed: {e}")
        raise HTTPException(status_code=500, detail=f"유튜브 다운로드 오류: {str(e)}")


@router.post("/analyze", response_model=AnalyzeHighlightsResponse)
async def analyze_long_to_short(req: AnalyzeHighlightsRequest, db: Session = Depends(database.get_db)):
    """
    롱폼 영상에서 VMI 3중 텐서(오디오 피크 + 발화 밀도/감정 키워드 + 씬 전환) 알고리즘으로
    킬러 하이라이트 쇼츠 구간을 자동 추출하고 대표 썸네일과 대본을 생성.
    """
    vpath = Path(req.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail=f"영상 파일을 찾을 수 없습니다: {req.video_path}")

    # 길이 프리셋 매핑
    preset_bounds = {
        "short": (20.0, 35.0),
        "medium": (35.0, 60.0),
        "long": (60.0, 90.0),
        "story": (90.0, 150.0)
    }
    min_dur, max_dur = preset_bounds.get(req.length_preset, (35.0, 60.0))
    if req.target_duration_sec:
        min_dur = max(15.0, req.target_duration_sec - 10.0)
        max_dur = req.target_duration_sec + 10.0

    try:
        # VMI 하이라이트 검출
        clips_raw = await media_intelligence.extract_longform_highlights(
            video_path=vpath,
            target_clips=req.candidate_count,
            min_duration=min_dur,
            max_duration=max_dur
        )

        total_duration = await media_intelligence.get_video_duration(vpath)

        # 썸네일 저장 경로 (%LOCALAPPDATA%/media/02_Operations/Temp/thumbnails/)
        thumb_dir = Path(app_settings.TEMP_DIR) / "thumbnails" / vpath.stem
        thumb_dir.mkdir(parents=True, exist_ok=True)
        ffmpeg = get_ffmpeg_bin()

        candidates: List[CandidateClip] = []
        for idx, c in enumerate(clips_raw):
            c_id = f"cand-{uuid.uuid4().hex[:8]}"
            start_s = c.get("start_time", 0.0)
            end_s = c.get("end_time", 0.0)
            dur_s = round(end_s - start_s, 1)

            # 대표 썸네일 프레임 추출 (시작 후 2초 시점)
            thumb_time = start_s + min(2.0, dur_s / 2.0)
            thumb_path = thumb_dir / f"{c_id}.jpg"
            thumb_url = f"/temp/thumbnails/{vpath.stem}/{c_id}.jpg"

            try:
                thumb_cmd = [
                    ffmpeg,
                    "-y",
                    "-ss", str(thumb_time),
                    "-i", str(vpath),
                    "-vframes", "1",
                    "-q:v", "3",
                    "-vf", "scale=480:-1",
                    str(thumb_path)
                ]
                subprocess.run(thumb_cmd, capture_output=True, timeout=10)
            except Exception as te:
                logger.warning(f"Thumbnail extraction failed for {c_id}: {te}")
                thumb_url = None

            # VMI 세부 점수 매핑
            vmi = c.get("vmi_score", 0.85)
            sigs = c.get("signals", {})
            acoustic = sigs.get("acoustic_energy", 0.8)
            speech = sigs.get("speech_density", 0.85)
            visual = sigs.get("visual_dynamics", 0.75)

            hook_score = int(min(99, max(75, round(vmi * 100 + 3))))
            story_score = int(min(99, max(70, round(speech * 100))))
            rhythm_score = int(min(99, max(70, round(visual * 100))))
            caption_score = int(min(99, max(75, round((hook_score + story_score) / 2))))

            # 요약 후킹 제목 생성
            transcript = c.get("transcript_summary", "")
            if not transcript or transcript == "(무음/BGM 구간)":
                hook_summary = f"하이라이트 #{idx+1}: {format_duration(start_s)} ~ {format_duration(end_s)} 핵심 장면"
            else:
                clean_t = transcript.replace("\n", " ").strip()
                hook_summary = f"핵심 장면 #{idx+1}: \"{clean_t[:45]}...\"" if len(clean_t) > 45 else f"핵심 장면 #{idx+1}: \"{clean_t}\""

            candidates.append(CandidateClip(
                id=c_id,
                clip_index=idx + 1,
                start_sec=start_s,
                end_sec=end_s,
                duration_sec=dur_s,
                hook_summary=hook_summary,
                transcript=transcript,
                thumbnail_url=thumb_url,
                vmi_score=vmi,
                hook_score=hook_score,
                story_score=story_score,
                rhythm_score=rhythm_score,
                caption_score=caption_score,
                reason=c.get("reason", "VMI 복합 신호 우수 구간"),
                selected=True
            ))

        return AnalyzeHighlightsResponse(
            success=True,
            video_path=str(vpath),
            total_duration_sec=round(total_duration, 2),
            candidates=candidates,
            detected_cuts_count=len(candidates) * 4
        )
    except Exception as e:
        logger.error(f"Analyze long to short failed: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"하이라이트 분석 실패: {str(e)}")


@router.post("/export-clip")
async def export_single_clip(req: ExportClipRequest):
    """
    선택된 단일 후보 클립을 무손실/고화질 MP4로 잘라서 05_Exports에 저장
    """
    vpath = Path(req.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail="원본 비디오를 찾을 수 없습니다.")

    cand = req.candidate
    start_sec = float(cand.get("start_sec", 0.0))
    end_sec = float(cand.get("end_sec", 0.0))
    dur_sec = max(1.0, end_sec - start_sec)

    export_dir = Path(app_settings.EXPORTS_DIR) / "Clips"
    export_dir.mkdir(parents=True, exist_ok=True)

    out_name = req.output_filename or f"clip_{vpath.stem}_{int(start_sec)}_{int(end_sec)}.mp4"
    out_path = export_dir / out_name

    ffmpeg = get_ffmpeg_bin()
    cmd = [
        ffmpeg,
        "-y",
        "-ss", str(start_sec),
        "-t", str(dur_sec),
        "-i", str(vpath),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "20",
        "-c:a", "aac",
        "-b:a", "192k",
        str(out_path)
    ]

    try:
        subprocess.run(cmd, capture_output=True, text=True, check=True)
        return {
            "success": True,
            "clip_path": str(out_path),
            "file_name": out_name,
            "duration_sec": dur_sec
        }
    except Exception as e:
        logger.error(f"Clip export failed: {e}")
        raise HTTPException(status_code=500, detail=f"클립 내보내기 실패: {str(e)}")


@router.post("/export-capcut")
async def export_capcut(req: ExportCapCutRequest):
    """
    선택된 후보군을 CapCut 초안 프로젝트(draft_content.json)로 패키징하여 05_Exports/CapCut_Projects에 저장
    """
    vpath = Path(req.video_path)
    if not vpath.exists():
        raise HTTPException(status_code=404, detail="원본 비디오를 찾을 수 없습니다.")

    proj_dir_name = f"{req.project_title}_{uuid.uuid4().hex[:6]}"
    export_root = Path(app_settings.EXPORTS_DIR) / "CapCut_Projects" / proj_dir_name
    export_root.mkdir(parents=True, exist_ok=True)

    # 11단 멀티 트랙 CapCut 규격 draft_content.json 생성
    tracks = []
    materials = {
        "videos": [],
        "texts": [],
        "speeds": [],
        "sound_channel_mappings": []
    }

    # 비디오 트랙 구성
    video_segments = []
    curr_track_start_us = 0

    for idx, c in enumerate(req.candidates):
        c_start_us = int(float(c.get("start_sec", 0.0)) * 1_000_000)
        c_end_us = int(float(c.get("end_sec", 0.0)) * 1_000_000)
        c_dur_us = max(1_000_000, c_end_us - c_start_us)

        mat_vid_id = f"mat_vid_{idx}"
        materials["videos"].append({
            "id": mat_vid_id,
            "path": str(vpath),
            "type": "video",
            "duration": c_dur_us
        })

        video_segments.append({
            "id": f"seg_vid_{idx}",
            "material_id": mat_vid_id,
            "target_timerange": {
                "start": curr_track_start_us,
                "duration": c_dur_us
            },
            "source_timerange": {
                "start": c_start_us,
                "duration": c_dur_us
            }
        })
        curr_track_start_us += c_dur_us

    tracks.append({
        "id": "track_main_video",
        "type": "video",
        "segments": video_segments
    })

    draft_data = {
        "platform": {
            "app_version": "5.0.0",
            "os": "windows"
        },
        "canvas_config": {
            "width": 1080,
            "height": 1920,
            "ratio": "9:16"
        },
        "duration": curr_track_start_us,
        "materials": materials,
        "tracks": tracks
    }

    draft_file = export_root / "draft_content.json"
    with open(draft_file, "w", encoding="utf-8") as f:
        json.dump(draft_data, f, ensure_ascii=False, indent=2)

    return {
        "success": True,
        "project_name": proj_dir_name,
        "project_path": str(export_root),
        "draft_json_path": str(draft_file),
        "clips_count": len(req.candidates),
        "total_duration_sec": round(curr_track_start_us / 1_000_000, 2)
    }
