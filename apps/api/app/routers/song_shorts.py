"""
ViraLoop Studio - 노래형 일괄 쇼츠 (Song Shorts / 3-Track Karaoke) FastAPI 라우터
Module 31819 & Module 72385 규격 기반:
1. 로컬 Faster-Whisper + DB Settings LLM 3-Track 가사 분석 (/transcribe-3track)
2. Remotion 헤드리스 1080x1920 MP4 실물 비디오 렌더링 (/render-song-shorts)
"""

import os
import re
import json
import uuid
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from app.config import settings as app_settings
from app.dependency_manager import DependencyManager
from app.services.song_engine import process_song_source
from app.services.remotion_renderer import remotion_renderer

logger = logging.getLogger(__name__)
router = APIRouter()


def _sanitize_name(filename: Optional[str], fallback: str = "upload.mp4") -> str:
    if not filename:
        return fallback
    clean = re.sub(r'[\\/*?:"<>|\s]', '_', Path(filename).name)
    return clean or fallback


@router.post("/transcribe-3track")
async def api_song_transcribe_3track(
    file: Optional[UploadFile] = File(default=None),
    file_path: Optional[str] = Form(default=None),
    source_url: Optional[str] = Form(default=None),
    source_name: Optional[str] = Form(default=None),
    language: str = Form(default="auto"),
    translation_lang: str = Form(default="ko"),
    custom_instruction: Optional[str] = Form(default=None),
):
    """로컬 Faster-Whisper + DB Settings LLM 기반 노래 가사 3-Track (원어 + 발음 + 한국어 번역) 생성."""
    target_file = None
    target_name = source_name or "song"

    # 1. 직접 업로드된 오디오/비디오 파일
    if file and file.filename:
        target_name = file.filename
        temp_dir = Path(app_settings.TEMP_DIR)
        temp_dir.mkdir(parents=True, exist_ok=True)
        safe_name = _sanitize_name(file.filename, "song_upload.mp3")
        saved_path = temp_dir / f"song_up_{uuid.uuid4().hex[:8]}_{safe_name}"
        content = await file.read()
        with open(saved_path, "wb") as f:
            f.write(content)
        target_file = str(saved_path)

    # 2. 로컬 파일 경로 지정
    elif file_path and os.path.exists(file_path):
        target_file = file_path
        target_name = Path(file_path).name

    # 3. 유튜브 URL 음원 다운로드 (yt-dlp)
    elif source_url and ("youtube.com" in source_url or "youtu.be" in source_url):
        download_dir = Path(app_settings.DOWNLOADS_DIR) / "Songs"
        download_dir.mkdir(parents=True, exist_ok=True)
        safe_id = uuid.uuid4().hex[:8]
        out_tmpl = str(download_dir / f"yt_song_{safe_id}.%(ext)s")
        ffmpeg_bin = DependencyManager.get_ffmpeg_path()
        ffmpeg_dir = str(Path(ffmpeg_bin).parent) if ffmpeg_bin and os.path.exists(ffmpeg_bin) else None

        cmd = ["yt-dlp", "-x", "--audio-format", "mp3", "-o", out_tmpl]
        if ffmpeg_dir:
            cmd.extend(["--ffmpeg-location", ffmpeg_dir])
        cmd.append(source_url)

        proc = subprocess.run(cmd, capture_output=True, text=True)
        cand = list(download_dir.glob(f"yt_song_{safe_id}.*"))
        if cand and cand[0].exists():
            target_file = str(cand[0])
            target_name = cand[0].name
        else:
            raise HTTPException(400, f"YouTube audio download failed: {proc.stderr or proc.stdout}")

    if not target_file or not os.path.exists(target_file):
        raise HTTPException(400, "유효한 음원/영상 파일이나 유튜브 URL을 제공해야 합니다.")

    try:
        result = await process_song_source(
            file_path=target_file,
            source_name=target_name,
            language=language,
            translation_lang=translation_lang,
            custom_instruction=custom_instruction,
        )
        result["audio_path"] = target_file
        return {"ok": True, "data": result}
    except Exception as e:
        logger.exception("Song transcribe 3-track error")
        raise HTTPException(500, f"노래형 가사 3-Track 분석 중 오류 발생: {str(e)}")


@router.post("/render-song-shorts")
async def api_song_render_song_shorts(
    project_id: str = Form(...),
    song_title: str = Form(default="Untitled Song"),
    artist_name: str = Form(default="Unknown Artist"),
    visual_theme: str = Form(default="vinyl"),
    lyrics_json: str = Form(...),
    video_source: Optional[str] = Form(default=None),
    audio_source: Optional[str] = Form(default=None),
    audio_source_file: Optional[UploadFile] = File(default=None),
    album_cover: Optional[str] = Form(default=None),
    album_cover_file: Optional[UploadFile] = File(default=None),
    enable_original: bool = Form(default=True),
    enable_pronunciation: bool = Form(default=True),
    enable_meaning: bool = Form(default=True),
    sync_offset_ms: int = Form(default=0),
    duration_seconds: float = Form(default=30.0),
    original_color: Optional[str] = Form(default=None),
    pronunciation_color: Optional[str] = Form(default=None),
    meaning_color: Optional[str] = Form(default=None),
    text_position: Optional[str] = Form(default="bottom"),
):
    """Remotion 3-Track 가라오케 컴포지션을 통해 실제 1080x1920 MP4 비디오 렌더링."""
    try:
        lyrics = json.loads(lyrics_json)
    except Exception as e:
        raise HTTPException(400, f"Invalid lyrics_json format: {e}")

    # 커스텀 오디오 파일이 업로드된 경우 임시 저장 처리
    resolved_audio_source = audio_source
    if audio_source_file and audio_source_file.filename:
        temp_dir = Path(app_settings.TEMP_DIR)
        temp_dir.mkdir(parents=True, exist_ok=True)
        safe_audio_name = _sanitize_name(audio_source_file.filename, "audio.mp3")
        audio_path = temp_dir / f"song_audio_{uuid.uuid4().hex[:8]}_{safe_audio_name}"
        audio_content = await audio_source_file.read()
        with open(audio_path, "wb") as f:
            f.write(audio_content)
        resolved_audio_source = str(audio_path)

    # 커스텀 앨범 커버 파일이 업로드된 경우 임시 저장 처리
    resolved_album_cover = album_cover
    if album_cover_file and album_cover_file.filename:
        temp_dir = Path(app_settings.TEMP_DIR)
        temp_dir.mkdir(parents=True, exist_ok=True)
        safe_cover_name = _sanitize_name(album_cover_file.filename, "cover.png")
        cover_path = temp_dir / f"cover_{uuid.uuid4().hex[:8]}_{safe_cover_name}"
        cover_content = await album_cover_file.read()
        with open(cover_path, "wb") as f:
            f.write(cover_content)
        resolved_album_cover = str(cover_path)

    render_res = await remotion_renderer.render_song_short(
        project_id=project_id,
        lyrics=lyrics,
        video_source=video_source,
        audio_source=resolved_audio_source,
        album_cover=resolved_album_cover,
        song_title=song_title,
        artist_name=artist_name,
        visual_theme=visual_theme,
        enable_original=enable_original,
        enable_pronunciation=enable_pronunciation,
        enable_meaning=enable_meaning,
        sync_offset_ms=sync_offset_ms,
        duration_seconds=duration_seconds,
        original_color=original_color,
        pronunciation_color=pronunciation_color,
        meaning_color=meaning_color,
        text_position=text_position,
    )

    if not render_res.get("success"):
        err_msg = render_res.get('error') or render_res.get('details') or str(render_res)
        logger.error(f"[SongRender] MP4 Render failed: {err_msg}")
        raise HTTPException(500, f"노래형 쇼츠 MP4 렌더링 실패: {err_msg}")

    return {
        "ok": True,
        "video_path": render_res.get("video_path"),
        "file_size_bytes": render_res.get("file_size_bytes"),
        "duration_seconds": duration_seconds,
    }
