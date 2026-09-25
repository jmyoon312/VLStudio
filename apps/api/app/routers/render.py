from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import subprocess
import os
import uuid
import re
from pathlib import Path
from datetime import datetime
import json
import shutil
import urllib.parse
import cv2
import numpy as np
from .. import dependency_manager
from app.utils.ytdlp_utils import get_standard_ytdlp_opts

router = APIRouter(tags=["render"])

# === Models ===
class LayerData(BaseModel):
    id: str
    type: str # 'image', 'video', 'text'
    src: Optional[str] = None
    x: float
    y: float
    width: float
    height: float
    opacity: float = 1.0
    text: Optional[str] = None
    # ... other props

class TrackData(BaseModel):
    id: str
    file_path: str
    title: str
    duration: float

class RenderRequest(BaseModel):
    scene: Dict[str, Any] # Full scene data (layers, etc.)
    playlist: List[TrackData]
    duration_minutes: int # Target duration
    use_remotion: bool = True # Default to True for testing migrationfloat
    resolution: str = "1280x720"
    quality: str = "high"
    output_filename: str
    crossfade_duration: float = 1.0

class RenderTaskStatus(BaseModel):
    task_id: str
    status: str # 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    progress: int
    output_path: Optional[str] = None
    error: Optional[str] = None

# In-memory output store (replace with DB for production)
render_tasks = {}


from ..services.ffmpeg_generator import FFmpegGenerator
import asyncio

async def process_render_task(task_id: str, request: RenderRequest):
    """
    Background worker to generate long-form Lofi music video using pure FFmpeg.
    """
    try:
        render_tasks[task_id]["status"] = "PROCESSING"
        render_tasks[task_id]["progress"] = 10
        
        # 1. Setup Paths
        from ..database import SessionLocal
        from .. import crud
        from app.config import settings as settings_conf
        db = SessionLocal()
        try:
            settings = crud.get_settings(db)
            download_root = settings.root_download_path if settings and settings.root_download_path else settings_conf.root_download_path
        finally:
            db.close()
            
        if settings and settings.root_download_path:
            output_dir = os.path.join(settings.root_download_path, "05_Exports")
        else:
            output_dir = settings_conf.EXPORTS_DIR
        os.makedirs(output_dir, exist_ok=True)
        final_output = os.path.join(output_dir, f"{request.output_filename}.mp4")
        
        # 2. Extract Background Video
        bg_layer = None
        for layer in request.scene.get('layers', []):
            if layer.get('type') == 'video': 
                bg_layer = layer
                break
        
        if not bg_layer:
            raise Exception("No background video found in scene")
            
        visual_source = bg_layer.get('filePath') or bg_layer.get('src')
        if not visual_source:
             raise Exception("Background video has no path")

        # Resolve Path
        if visual_source.startswith("file:///"):
            visual_source = visual_source[8:]
        elif visual_source.startswith("/media/"):
            relative = visual_source[7:]
            visual_source = os.path.join(download_root, relative)
        elif not os.path.isabs(visual_source):
             visual_source = os.path.join(download_root, visual_source)
             
        if not os.path.exists(visual_source):
            # Try studio uploads
            alt = os.path.join(download_root, "studio_uploads", os.path.basename(visual_source))
            if os.path.exists(alt):
                visual_source = alt
            else:
                raise Exception(f"Background file not found: {visual_source}")

        # 3. Extract Audio Playlist
        audio_paths = []
        for track in request.playlist:
            path = track.file_path
            if path.startswith("file:///"):
                path = path[8:]
            elif path.startswith("/media/"):
                relative = path[7:]
                path = os.path.join(download_root, relative)
            elif not os.path.isabs(path):
                # Try common locations
                candidates = [
                    os.path.join(download_root, path),
                    os.path.join(download_root, "audio", path),
                    os.path.join(download_root, "studio_uploads", path),
                    os.path.join(download_root, "tts", path)
                ]
                found = False
                for c in candidates:
                    if os.path.exists(c):
                        path = c
                        found = True
                        break
                if not found:
                    print(f"Skipping missing audio: {path}")
                    continue
            
            if os.path.exists(path):
                audio_paths.append(path)
        
        if not audio_paths:
            raise Exception("No valid audio files found in playlist")

        render_tasks[task_id]["progress"] = 30
        
        # 4. Generate
        print(f"[VIDEO] Starting FFmpeg Render: BG={visual_source}, AudioCount={len(audio_paths)}")
        duration_sec = request.duration_minutes * 60
        
        # Get FFmpeg path
        ffmpeg_path = dependency_manager.DependencyManager.get_ffmpeg_path()
        if not ffmpeg_path or not os.path.exists(ffmpeg_path):
             # Fallback check or error
             if shutil.which("ffmpeg"):
                 ffmpeg_path = "ffmpeg"
             else:
                 raise Exception("FFmpeg binary not found. Please check settings.")
        
        # Infer ffprobe path
        ffprobe_path = "ffprobe"
        if ffmpeg_path != "ffmpeg":
             parent = os.path.dirname(ffmpeg_path)
             if os.name == 'nt':
                 ffprobe_path = os.path.join(parent, "ffprobe.exe")
             else:
                 ffprobe_path = os.path.join(parent, "ffprobe")
                 
             if not os.path.exists(ffprobe_path):
                 print(f"[WARN] ffprobe not found at {ffprobe_path}, trying default 'ffprobe'")
                 ffprobe_path = "ffprobe"

        generator = FFmpegGenerator(ffmpeg_path=ffmpeg_path, ffprobe_path=ffprobe_path)
        await generator.generate_lofi(
            bg_path=visual_source, 
            audio_paths=audio_paths, 
            duration=duration_sec, 
            output_file=final_output,
            crossfade=request.crossfade_duration
        )
        
        render_tasks[task_id]["progress"] = 100
        render_tasks[task_id]["status"] = "COMPLETED"
        render_tasks[task_id]["output_path"] = final_output
        print(f"[OK] Render complete: {final_output}")

    except Exception as e:
        print(f"[FAIL] Render Failed: {e}")
        render_tasks[task_id]["status"] = "FAILED"
        render_tasks[task_id]["error"] = str(e)

@router.post("/generate")
async def generate_music_video(request: RenderRequest, background_tasks: BackgroundTasks):
    task_id = str(uuid.uuid4())
    render_tasks[task_id] = {
        "task_id": task_id,
        "status": "PENDING",
        "progress": 0,
        "request": request.dict()
    }
    
    background_tasks.add_task(process_render_task, task_id, request)
    
    return {"task_id": task_id}

@router.get("/status/{task_id}")
async def get_task_status(task_id: str):
    task = render_tasks.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# =========================================================================
# [ 주권 자율 팩토리 ] 원테이크 일괄 실물 1080x1920 MP4 렌더링 & 픽셀링 메타데이터
# =========================================================================

class ShortBatchRenderRequest(BaseModel):
    project_id: Optional[str] = None
    title: str
    script: Optional[str] = None
    scenes: Optional[List[Dict[str, Any]]] = None
    archetype: str = "ssul"  # 'classic' | 'instagram' | 'gunlimbo' | 'ssul'
    template_id: Optional[str] = None
    voice_engine: str = "supertone-local"
    voice_id: str = "F1"
    speech_speed: float = 1.05
    bgm_filename: Optional[str] = None
    bgm_volume: float = 0.25
    auto_ducking: bool = True
    sfx_preset: Optional[str] = None
    extra_caption_type: Optional[str] = "reaction"
    video_source: Optional[str] = None
    image_source: Optional[str] = None
    subtitles_config: Optional[Dict[str, Any]] = None
    tone: Optional[str] = "snack"
    target_lang: Optional[str] = "ko"

def _resolve_supertonic_model_dir() -> str:
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

def _resolve_remotion_paths():
    """Remotion 엔진 디렉토리 및 render_cli.js 경로를 안전하게 탐색합니다."""
    current = Path(__file__).resolve()
    for p in [current] + list(current.parents):
        cand = p / "apps" / "remotion-engine"
        if cand.exists() and (cand / "render_cli.js").exists():
            return cand, cand / "render_cli.js"
    fallback = Path("c:/ViraLoopMedia/VLStudio/apps/remotion-engine")
    return fallback, fallback / "render_cli.js"

def _safe_cv2_imread(path: str, flags: int = cv2.IMREAD_COLOR) -> Optional[np.ndarray]:
    """Windows 환경 한글 및 특수문자 경로를 100% 안전하게 읽습니다."""
    try:
        if not path or not os.path.exists(path):
            return None
        data = np.fromfile(path, dtype=np.uint8)
        if data is None or len(data) == 0:
            return None
        return cv2.imdecode(data, flags)
    except Exception as e:
        print(f"[WARN] _safe_cv2_imread failed for {path}: {e}")
        return None

def _safe_cv2_imwrite(path: str, img: np.ndarray, params=None) -> bool:
    """Windows 환경 한글 및 특수문자 경로를 100% 안전하게 저장합니다."""
    try:
        ext = os.path.splitext(path)[1]
        if not ext:
            ext = ".png"
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        success, encoded = cv2.imencode(ext, img, params)
        if success:
            encoded.tofile(path)
            return True
        return False
    except Exception as e:
        print(f"[WARN] _safe_cv2_imwrite failed for {path}: {e}")
        return False

def _extract_youtube_id(text: Optional[str]) -> Optional[str]:
    """문자열, 파일명, URL에서 11자리 YouTube Video ID를 정밀 추출합니다."""
    if not text:
        return None
    url_patterns = [
        r"(?:v=|\/shorts\/|\/embed\/|\/watch\?v=)([a-zA-Z0-9_-]{11})",
        r"youtu\.be\/([a-zA-Z0-9_-]{11})",
    ]
    for pattern in url_patterns:
        m = re.search(pattern, text)
        if m:
            return m.group(1)
    
    base = os.path.basename(text)
    file_pattern = r"(?:^|[_\-\s])([a-zA-Z0-9_-]{11})(?:\.[a-zA-Z0-9]+|$)"
    m = re.search(file_pattern, base)
    if m:
        candidate = m.group(1)
        if len(candidate) == 11:
            return candidate
    return None

def _resolve_local_media_path(path: Optional[str]) -> Optional[str]:
    """로컬 미디어 파일 경로(절대/상대/URL/07_Downloads/파일명)를 안전하게 단일 진실 공급원 절대 경로로 매핑합니다."""
    if not path or not path.strip():
        return None

    p_str = path.strip()

    # 로컬 호스트 URL인 경우 경로 추출
    if p_str.startswith("http://localhost") or p_str.startswith("http://127.0.0.1"):
        try:
            parsed = urllib.parse.urlparse(p_str)
            p_str = parsed.path
        except Exception:
            pass

    # /files/ 또는 /media/ 접두어 정규화
    clean = p_str.replace("\\", "/").strip("/")
    if clean.startswith("files/"):
        clean = clean[len("files/"):]
    elif clean.startswith("media/"):
        clean = clean[len("media/"):]

    # 1. 이미 존재하는 파일 경로인 경우
    if os.path.isfile(p_str):
        return os.path.abspath(p_str)
    if os.path.isfile(clean):
        return os.path.abspath(clean)

    # 2. Windows 드라이브 매칭 (C:/, D:/ 등)
    for drive in ['C:', 'D:', 'E:', 'F:']:
        cand = f"{drive}/{clean}"
        if os.path.isfile(cand):
            return os.path.abspath(cand)

    # 3. 9대 미디어 저장소 경로 후보군 전수 탐색 (서브폴더 재귀 검색 포함)
    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    roots = []
    if local_app:
        roots.append(Path(local_app) / "ViraLoop Studio" / "media")
    roots.append(Path.home() / ".viraloop_studio" / "media")
    roots.append(Path("c:/ViraLoopMedia/VLStudio/media"))
    roots.append(Path("c:/ViraLoopMedia/VLStudio"))

    base_name = os.path.basename(clean)

    for root in roots:
        candidates = [
            root / clean,
            root / "07_Downloads" / clean,
            root / "07_Downloads" / base_name,
            root / "02_Operations" / "Temp" / clean,
            root / "02_Operations" / "Temp" / "stock_motion" / base_name,
            root / "05_Exports" / clean,
            root / "05_Exports" / base_name,
            root / "01_Inbox" / clean,
            root / "01_Inbox" / base_name,
        ]
        for c in candidates:
            if c.is_file():
                return str(c.resolve())

        # 07_Downloads 하위 카테고리 폴더 재귀 검색
        dl_folder = root / "07_Downloads"
        if dl_folder.is_dir() and base_name:
            matches = list(dl_folder.rglob(base_name))
            if matches and matches[0].is_file():
                return str(matches[0].resolve())

    return None

async def _ensure_media_available(video_source: str, downloads_dir: Path, ffmpeg_exe: str, prefix: str = "media") -> str:
    """
    로컬 미디어 파일이 존재하면 반환하고,
    부재하지만 온라인 URL이거나 파일명에 11자리 YouTube ID가 포함되어 있으면
    자가 치유(Self-Healing) 원칙에 따라 실물 미디어를 자동으로 복구 다운로드합니다.
    """
    resolved_local = _resolve_local_media_path(video_source)
    if resolved_local and os.path.exists(resolved_local):
        return resolved_local

    is_online_url = (video_source.startswith("http://") or video_source.startswith("https://")) and not any(
        video_source.startswith(h) for h in ["http://localhost", "http://127.0.0.1", "https://localhost", "https://127.0.0.1"]
    )

    yt_id = _extract_youtube_id(video_source)
    target_url = video_source if is_online_url else (f"https://www.youtube.com/watch?v={yt_id}" if yt_id else None)

    if target_url:
        import yt_dlp
        file_id = yt_id or uuid.uuid4().hex[:8]
        download_target = downloads_dir / f"{prefix}_dl_{file_id}.mp4"
        if not download_target.exists():
            ydl_opts = get_standard_ytdlp_opts({
                'outtmpl': str(download_target),
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'ffmpeg_location': os.path.dirname(ffmpeg_exe) if ffmpeg_exe and os.path.isabs(ffmpeg_exe) else None,
            })
            def _download_yt():
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([target_url])
            try:
                print(f"[Self-Healing] Downloading missing media: {target_url} -> {download_target.name}...")
                await asyncio.to_thread(_download_yt)
            except Exception as dl_err:
                print(f"[Self-Healing] Download failed: {dl_err}")
                if is_online_url:
                    raise HTTPException(status_code=400, detail=f"온라인 영상 다운로드 실패: {str(dl_err)[:200]}")
        
        if download_target.exists() and download_target.stat().st_size > 0:
            return str(download_target)
        candidates = list(downloads_dir.glob(f"{prefix}_dl_{file_id}*"))
        if candidates and candidates[0].exists() and candidates[0].stat().st_size > 0:
            return str(candidates[0])

    if resolved_local and os.path.exists(resolved_local):
        return resolved_local
    if os.path.exists(video_source):
        return video_source

    raise HTTPException(
        status_code=404,
        detail=f"원본 미디어를 찾을 수 없습니다: {video_source} (로컬 파일 부재 및 온라인 자가치유 다운로드 불가)"
    )

def _resolve_bgm_track_path(filename: Optional[str]) -> Optional[str]:
    if not filename:
        return None
    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    bgm_dir = Path(local_app) / "ViraLoop Studio" / "media" / "03_Assets" / "bgm" if local_app else Path.home() / ".viraloop_studio" / "media" / "03_Assets" / "bgm"
    
    clean_name = urllib.parse.unquote(filename).strip()
    candidates = [
        bgm_dir / clean_name,
        bgm_dir / "sfx" / clean_name,
        bgm_dir / "transition" / clean_name,
        bgm_dir / "trending" / clean_name,
        bgm_dir / filename,
        bgm_dir / "sfx" / filename,
        bgm_dir / "transition" / filename,
        bgm_dir / "trending" / filename,
    ]
    for c in candidates:
        if c.exists() and c.is_file():
            return str(c)
    matches = list(bgm_dir.rglob(clean_name))
    if matches:
        return str(matches[0])

    preview_cache = bgm_dir / "preview_cache"
    for cat in ["lofi", "suspense", "upbeat", "piano", "meme"]:
        p = preview_cache / f"{cat}_preview.wav"
        if p.exists():
            return str(p)
    return None

def _generate_smart_viral_meta(title: str, script: str, archetype: str) -> Dict[str, str]:
    today = datetime.now().strftime("%Y-%m-%d")
    clean_title = re.sub(r'[\[\](){}]', ' ', title).strip()
    words = [w for w in clean_title.split() if len(w) >= 2]
    
    # 1. Viral Title
    viral_title = clean_title
    if len(viral_title) > 36:
        viral_title = viral_title[:33] + "..."
    if not any(k in viral_title for k in ["실화", "충격", "반전", "폭로", "사이다", "레전드"]):
        prefix = "🔥 레전드 실화: " if archetype == "ssul" else "🚨 긴급 속보: " if archetype == "gunlimbo" else "🎬 꿀잼: "
        if len(prefix + viral_title) <= 40:
            viral_title = prefix + viral_title
            
    # 2. Description
    first_line = script.split("\n")[0] if script else title
    if len(first_line) > 60:
        first_line = first_line[:57] + "..."
    desc = f"{first_line}\n\n영상이 유익하거나 재밌으셨다면 구독과 좋아요 부탁드립니다!\n여러분의 의견을 댓글로 남겨주세요."
    
    # 3. Hashtags
    hashtags = "#Shorts #쇼츠 #실화 #사이다 #레전드 #viral"
    desc_with_hash = f"{desc}\n\n{hashtags}"
    
    # 4. Search Tags
    tag_pool = ["쇼츠", "유튜브 쇼츠", "실화", "레전드", "사이다 실화", "블라인드", "인기 급상승", "꿀잼", "shorts", "korean shorts"]
    tag_pool.extend(words)
    tags_str = ", ".join(list(dict.fromkeys(tag_pool))[:18])
    
    # 5. Formatted Text (Pixeling Standard)
    date_prefix = datetime.now().strftime("%y%m%d")
    safe_name = re.sub(r'[^a-zA-Z0-9가-힣_-]', '_', title)[:25]
    std_filename = f"{date_prefix}_KO_{safe_name}.mp4"
    
    formatted_lines = [
        f"저장일: {today}",
        "소스 수: 1",
        "메타 세트 수: 1",
        "",
        "========================================",
        f"1. {std_filename}",
        f"소스 파일명: {std_filename}",
        "포함 메타: 원본",
        "========================================",
        "[원본] 추천 메타",
        "언어: 원본",
        "제목",
        viral_title,
        "설명",
        desc_with_hash,
        "태그",
        tags_str,
        "대본",
        script or title,
        ""
    ]
    
    return {
        "title": viral_title,
        "description": desc_with_hash,
        "hashtags": hashtags,
        "tags": tags_str,
        "standard_filename": std_filename,
        "formatted_text": "\n".join(formatted_lines)
    }

def _resolve_video_file(src: Optional[str]) -> Optional[Path]:
    if not src or not str(src).strip():
        return None
    s = str(src).strip()
    if "/files/" in s:
        s = s.split("/files/")[-1]
        s = urllib.parse.unquote(s)
    
    p = Path(s)
    if p.is_absolute() and p.exists() and p.is_file():
        return p
    
    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    candidates = []
    if local_app:
        v_media = Path(local_app) / "ViraLoop Studio" / "media"
        candidates.extend([
            v_media / s,
            v_media / "07_Downloads" / s,
            v_media / "02_Operations" / "subtitles" / s,
            v_media / "01_Inbox" / s,
            v_media / "05_Exports" / s,
            Path(local_app) / "ViraLoop Studio" / "data" / "subtitles" / s,
        ])
    candidates.append(Path(s).resolve())
    for cand in candidates:
        if cand.exists() and cand.is_file():
            return cand
    
    # Check by filename search in media subfolders
    fname = Path(s).name
    if local_app:
        v_media = Path(local_app) / "ViraLoop Studio" / "media"
        for sub in ["07_Downloads", "02_Operations/subtitles", "01_Inbox"]:
            target_folder = v_media / sub
            if target_folder.exists():
                for match in target_folder.glob(f"**/{fname}"):
                    if match.is_file():
                        return match
    return None

@router.post("/short-batch")
async def render_short_batch_job(req: ShortBatchRenderRequest):
    """
    [ 주권 자율 팩토리 100% 실체화 비디오 파이프라인 ]
    1. 비디오 소스 투입 시: MediaIntelligenceCore(프레임/씬 컷 + Whisper STT + 음향 피크)
       -> DB Settings LLM(1분기악/MZ 밈 톤 상황 자막 및 쨉쨉이)
       -> Remotion 1080x1920 템플릿 실물 MP4 렌더링 -> 픽셀링 표준 메타 반환
    2. 텍스트 소스 투입 시: Supertonic 로컬 음성 합성 -> BGM 오토덕킹 -> Remotion MP4 렌더링
    """
    import scipy.io.wavfile
    import numpy as np
    from pydub import AudioSegment
    from app.services.remotion_renderer import remotion_renderer
    from app.config import settings as settings_conf

    try:
        from app.services.media_intelligence.core import media_intelligence
    except ImportError:
        from ..services.media_intelligence.core import media_intelligence

    try:
        from app.legacy_ddalkkak.workers.gemini_auth import call_gemini, get_db_settings_model
    except ImportError:
        from ..legacy_ddalkkak.workers.gemini_auth import call_gemini, get_db_settings_model

    # 1. Job ID & Directories
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    job_id = req.project_id or f"batch_{timestamp}_{uuid.uuid4().hex[:6]}"
    
    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app:
        export_dir = Path(local_app) / "ViraLoop Studio" / "media" / "05_Exports"
        temp_dir = Path(local_app) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp" / job_id
    else:
        export_dir = Path.home() / ".viraloop_studio" / "media" / "05_Exports"
        temp_dir = Path.home() / ".viraloop_studio" / "media" / "02_Operations" / "Temp" / job_id
        
    export_dir.mkdir(parents=True, exist_ok=True)
    temp_dir.mkdir(parents=True, exist_ok=True)

    final_mp4 = export_dir / f"{job_id}.mp4"

    # 2. 소스 비디오 존재 여부 판별 (미디어 인텔리전스 가동)
    resolved_video = _resolve_video_file(req.video_source)
    has_video_input = resolved_video is not None and resolved_video.exists()

    subtitles_data = []
    total_duration_sec = 15.0
    mixed_audio_wav = temp_dir / f"{job_id}_final_audio.wav"
    ai_data = {}

    final_title = req.title
    title_candidates = [req.title]
    line1 = req.title
    line2 = ""
    best_jab = {
        "text": f"*{req.title[:10]}*",
        "startMs": 1200,
        "endMs": 6500,
        "placement": "top-third"
    }

    if has_video_input:
        print(f"🎬 [RenderBatch] 소스 비디오 정밀 인텔리전스 분석 개시: {resolved_video.name}...")
        # 2-A. MediaIntelligenceCore 3대 분석 (프레임 씬 체인지 + Whisper STT + 음향 피크)
        manifest = await media_intelligence.generate_video_manifest(resolved_video, temp_dir)
        total_duration_sec = float(manifest.get("duration", 0.0) or 30.0)
        frames = manifest.get("frames", [])
        speech = manifest.get("speech", {})
        acoustics = manifest.get("acoustics", {})
        narrative_context = manifest.get("narrative_context", "")

        # 2-B. DB Settings LLM 1분기악 / MZ 밈 톤 자막 & 쨉쨉이 생성
        model_name = get_db_settings_model("subtitle")
        target_lang = getattr(req, "target_lang", None) or "ko"

        llm_prompt = f"""[영상 시각 & 오디오 종합 분석 데이터]
{narrative_context}

[요청 사항]
위 실제 영상의 프레임 시각적 사건 전개, 행동, 인물 표정, Whisper 발화 대사를 100% 반영하여 1분기악/MZ 밈 톤의 바이럴 쇼츠 자막 및 메타데이터를 작성하라.

1. situation_subtitles (상황 설명 자막 4~8개):
   - 영상 전체 길이({total_duration_sec:.1f}초) 내에서 핵심 액션과 발화 타이밍에 맞춤 (startMs, endMs, text).
   - 각 자막은 12~16자 내외로 빠르고 읽기 쉽게.
   - 뜬구름 잡는 일반론("이게 된다고?", "분위기가 달라짐") 절대 금지! 실제 화면의 구체적 사건을 작성!
2. jjap_jjap_i_subtitles (쨉쨉이 리액션 1~2개):
   - 음향 피크나 돌발 순간에 화면 상단에 띄울 감탄/멘붕 리액션 ("* 찐당황 ㅋㅋ *", "* 표정 실화냐 *").
   - startMs, endMs, placement("top-third").
3. title_candidates:
   - 클릭 부르는 제목 5개.
4. title_line1, title_line2:
   - 2줄 분리 타이틀.

타겟 언어: {target_lang}

반드시 아래 JSON 포맷으로만 응답:
```json
{{
  "title": "메인 제목",
  "title_line1": "제목 1행",
  "title_line2": "제목 2행",
  "title_candidates": ["후보1", "후보2", "후보3", "후보4", "후보5"],
  "situation_subtitles": [
    {{ "text": "상황설명 자막 1", "startMs": 0, "endMs": 3500 }},
    {{ "text": "상황설명 자막 2", "startMs": 3600, "endMs": 7200 }}
  ],
  "jjap_jjap_i_subtitles": [
    {{ "text": "* 찐당황 ㅋㅋ *", "startMs": 1200, "endMs": 5500, "placement": "top-third" }}
  ],
  "youtube_description": "유튜브 업로드용 설명",
  "hashtags": ["#쇼츠", "#이슈", "#레전드"]
}}
```"""

        try:
            ai_res = await call_gemini(
                url=f"/models/{model_name}",
                payload={
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 4096},
                    "contents": [{"parts": [{"text": llm_prompt}]}]
                }
            )
            cand_list = ai_res.get("candidates") or []
            if cand_list:
                parts = cand_list[0].get("content", {}).get("parts") or []
                if parts:
                    raw_text = parts[0].get("text", "").strip()
                    clean_json = raw_text
                    if "```json" in clean_json:
                        clean_json = clean_json.split("```json")[-1].split("```")[0].strip()
                    elif "```" in clean_json:
                        clean_json = clean_json.split("```")[-1].split("```")[0].strip()
                    ai_data = json.loads(clean_json)
        except Exception as llm_err:
            print(f"[RenderBatch] Video AI LLM analysis fallback note: {llm_err}")

        # 자막 정제 및 타임코드 보정
        raw_subs = ai_data.get("situation_subtitles") or []
        for s in raw_subs:
            if isinstance(s, dict) and s.get("text"):
                t = str(s["text"]).strip()
                s_ms = int(s.get("startMs", s.get("start", 0) * 1000 if s.get("start", 0) < 1000 else s.get("start", 0)))
                e_ms = int(s.get("endMs", s.get("end", 0) * 1000 if s.get("end", 0) < 1000 else s.get("end", 0)))
                if e_ms <= s_ms:
                    e_ms = s_ms + 2500
                subtitles_data.append({
                    "text": t,
                    "startMs": s_ms,
                    "endMs": min(e_ms, int(total_duration_sec * 1000))
                })

        # LLM 자막 실패 시 Whisper STT 대사 직결 폴백
        if not subtitles_data and speech.get("segments"):
            for seg in speech["segments"]:
                subtitles_data.append({
                    "text": seg["text"].strip(),
                    "startMs": int(float(seg["start"]) * 1000),
                    "endMs": int(float(seg["end"]) * 1000)
                })

        if not subtitles_data:
            step_ms = max(int((total_duration_sec * 1000) / 4), 2000)
            for idx, sample_text in enumerate(["시작부터 시선 집중", "예상치 못한 돌발 상황", "눈을 의심케 하는 순간", "결국 터져버린 결말"]):
                subtitles_data.append({
                    "text": sample_text,
                    "startMs": idx * step_ms,
                    "endMs": min((idx + 1) * step_ms, int(total_duration_sec * 1000))
                })

        # 쨉쨉이 자막
        jab_list = ai_data.get("jjap_jjap_i_subtitles") or []
        if jab_list and isinstance(jab_list[0], dict) and jab_list[0].get("text"):
            j0 = jab_list[0]
            j_s = int(j0.get("startMs", j0.get("start", 1.2) * 1000 if j0.get("start", 1.2) < 1000 else j0.get("start", 1200)))
            j_e = int(j0.get("endMs", j0.get("end", 5.5) * 1000 if j0.get("end", 5.5) < 1000 else j0.get("end", 5500)))
            best_jab = {
                "text": str(j0["text"]).strip(),
                "startMs": j_s,
                "endMs": min(j_e, int(total_duration_sec * 1000)),
                "placement": j0.get("placement", "top-third")
            }

        title_candidates = ai_data.get("title_candidates") or [req.title]
        final_title = ai_data.get("title") or title_candidates[0] or req.title
        t_words = final_title.split()
        mid = len(t_words) // 2 or 1
        line1 = ai_data.get("title_line1") or (" ".join(t_words[:mid]) if len(t_words) > 1 else final_title)
        line2 = ai_data.get("title_line2") or (" ".join(t_words[mid:]) if len(t_words) > 1 else "")

        # 2-C. 오디오 추출 및 BGM 믹싱
        orig_audio_wav = temp_dir / f"{job_id}_orig_audio.wav"
        cmd_audio = [
            "ffmpeg", "-y", "-i", str(resolved_video),
            "-vn", "-ac", "2", "-ar", "44100", str(orig_audio_wav)
        ]
        proc_a = await asyncio.create_subprocess_exec(*cmd_audio, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await proc_a.communicate()

        if orig_audio_wav.exists() and orig_audio_wav.stat().st_size > 1000:
            full_audio = AudioSegment.from_wav(str(orig_audio_wav))
        else:
            full_audio = AudioSegment.silent(duration=int(total_duration_sec * 1000))

        bgm_path = _resolve_bgm_track_path(req.bgm_filename)
        if bgm_path and os.path.exists(bgm_path):
            try:
                bgm_raw = AudioSegment.from_file(bgm_path)
                target_ms = len(full_audio) + 600
                loop_factor = (target_ms // len(bgm_raw)) + 1
                bgm_looped = (bgm_raw * loop_factor)[:target_ms]
                user_gain = (req.bgm_volume - 0.5) * 20.0
                ducking_gain = -14.0 if req.auto_ducking else -8.0
                bgm_ducked = bgm_looped + user_gain + ducking_gain
                mixed = full_audio.overlay(bgm_ducked)
                mixed.export(str(mixed_audio_wav), format="wav")
            except Exception as mix_e:
                print(f"[RenderBatch] Video BGM mix note: {mix_e}")
                full_audio.export(str(mixed_audio_wav), format="wav")
        else:
            full_audio.export(str(mixed_audio_wav), format="wav")

    else:
        # 3. 텍스트 소스 전용: Supertonic TTS + 대본 분할
        sentences = []
        if req.scenes and len(req.scenes) > 0:
            for sc in req.scenes:
                t = sc.get("text") or sc.get("narrative") or ""
                if t.strip():
                    sentences.append(t.strip())
        
        if not sentences:
            raw_text = req.script if (req.script and len(req.script.strip()) > 0) else req.title
            splits = re.split(r'[\n.?!]+', raw_text)
            sentences = [s.strip() for s in splits if s.strip()]
            if not sentences:
                sentences = [req.title]

        sentences = sentences[:8]

        supertonic_available = False
        st_service = None
        try:
            from app.services.tts.supertonic.service import SupertonicService
            st_dir = _resolve_supertonic_model_dir()
            st_service = SupertonicService.get_instance(st_dir)
            st_service.load_models()
            supertonic_available = True
        except Exception as e:
            print(f"[RenderBatch] Supertonic init note: {e}")

        full_voice = AudioSegment.empty()
        cursor_ms = 0
        voice_id = req.voice_id or "F1"
        speed = req.speech_speed or 1.05

        for i, sent in enumerate(sentences):
            part_wav = temp_dir / f"voice_part_{i}.wav"
            synthesized = False
            
            if supertonic_available and (req.voice_engine == "supertone-local" or not req.voice_engine):
                try:
                    wav, sr = st_service.generate(text=sent, voice_id=voice_id, speed=speed)
                    if wav.dtype != np.int16:
                        wav_norm = (wav * 32767).clip(-32768, 32767).astype(np.int16)
                    else:
                        wav_norm = wav
                    scipy.io.wavfile.write(str(part_wav), sr, wav_norm)
                    synthesized = True
                except Exception as st_err:
                    print(f"[RenderBatch] Supertonic sentence synthesis failed: {st_err}")

            if not synthesized:
                fallback_duration_ms = max(1800, int(len(sent) * 140 / speed))
                silent_seg = AudioSegment.silent(duration=fallback_duration_ms)
                silent_seg.export(str(part_wav), format="wav")

            part_audio = AudioSegment.from_wav(str(part_wav))
            duration_ms = len(part_audio)
            
            subtitles_data.append({
                "text": sent,
                "startMs": cursor_ms,
                "endMs": cursor_ms + duration_ms
            })
            full_voice += part_audio
            full_voice += AudioSegment.silent(duration=160)
            cursor_ms += duration_ms + 160

        total_duration_sec = max(len(full_voice) / 1000.0, 5.0)

        bgm_path = _resolve_bgm_track_path(req.bgm_filename)
        if bgm_path and os.path.exists(bgm_path):
            try:
                bgm_raw = AudioSegment.from_file(bgm_path)
                target_ms = len(full_voice) + 600
                loop_factor = (target_ms // len(bgm_raw)) + 1
                bgm_looped = (bgm_raw * loop_factor)[:target_ms]
                user_gain = (req.bgm_volume - 0.5) * 20.0
                ducking_gain = -12.0 if req.auto_ducking else 0.0
                bgm_ducked = bgm_looped + user_gain + ducking_gain
                mixed = full_voice.overlay(bgm_ducked)
                mixed.export(str(mixed_audio_wav), format="wav")
            except Exception as mix_err:
                full_voice.export(str(mixed_audio_wav), format="wav")
        else:
            full_voice.export(str(mixed_audio_wav), format="wav")

        t_words = req.title.split()
        mid = len(t_words) // 2 or 1
        line1 = " ".join(t_words[:mid]) if len(t_words) > 1 else req.title
        line2 = " ".join(t_words[mid:]) if len(t_words) > 1 else ""

    # 4. Visual Lego Props for ViraShortComposition
    preset_style = "humor" if req.archetype == "ssul" else "knowledge" if req.archetype == "gunlimbo" else "drama" if req.archetype == "instagram" else "shorts"
    badge_label = "썰" if req.archetype == "ssul" else "속보" if req.archetype == "gunlimbo" else "릴스" if req.archetype == "instagram" else "쇼츠"

    props_data = {
        "titleLine1": line1,
        "titleLine2": line2 or final_title,
        "titleBadgeText": badge_label,
        "hasTopHeader": True,
        "hasBottomCredit": True,
        "bottomCreditText": "출처: ViraLoop Sovereign Factory",
        "subtitles": subtitles_data,
        "stylePreset": preset_style,
        "muteOriginalVideo": True,
        "canvasType": "LETTERBOX_SOLID" if req.archetype == "classic" else "FULL_BLEED_OVERLAY",
        "jabOverlay": best_jab,
        "finalMixedAudio": str(mixed_audio_wav)
    }

    if has_video_input:
        props_data["videoSource"] = str(resolved_video.resolve())
    elif req.image_source and os.path.exists(req.image_source):
        props_data["imageSource"] = os.path.abspath(req.image_source)

    props_file = temp_dir / f"{job_id}_props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props_data, f, ensure_ascii=False, indent=2)

    # 5. Execute Remotion Headless Direct Rendering
    fps = 30
    duration_frames = int(max(total_duration_sec, 6.0) * fps)
    
    remotion_dir, cli_path = _resolve_remotion_paths()
    node_exe = shutil.which("node") or "node"

    cmd = [
        node_exe,
        str(cli_path),
        "--composition", "ViraShortComposition",
        "--props", str(props_file),
        "--output", str(final_mp4),
        "--duration", str(duration_frames),
        "--fps", str(fps),
        "--width", "1080",
        "--height", "1920"
    ]

    print(f"[START] [RenderBatch] Executing Remotion Headless: {final_mp4.name} ({duration_frames} frames)...")
    process = await asyncio.to_thread(
        subprocess.run,
        cmd,
        cwd=str(remotion_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    if process.returncode != 0:
        err_msg = process.stderr.decode('utf-8', errors='replace')
        print(f"[FAIL] [RenderBatch] Remotion failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"MP4 렌더링 실패: {err_msg[:300]}")

    if not final_mp4.exists() or final_mp4.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="렌더링 파일 생성 실패 (0 바이트)")

    file_size = final_mp4.stat().st_size
    print(f"[OK] [RenderBatch] MP4 Rendering complete: {final_mp4} ({file_size / 1024 / 1024:.2f} MB)")

    # 6. Generate AI Viral Metadata
    if ai_data:
        pixeling_meta = {
            "title": final_title,
            "candidate_titles": title_candidates,
            "subtitles": subtitles_data,
            "jabs": [best_jab],
            "description": ai_data.get("youtube_description") or final_title,
            "hashtags": ai_data.get("hashtags") or ["#쇼츠", "#이슈", "#바이럴"],
            "tags": ", ".join(title_candidates + ["쇼츠", "유튜브 쇼츠", "실화", "레전드"]),
            "video_duration": total_duration_sec,
            "archetype": req.archetype,
            "video_source": str(resolved_video.resolve()) if has_video_input else None,
        }
    else:
        full_script = " ".join([s["text"] for s in subtitles_data])
        pixeling_meta = _generate_smart_viral_meta(final_title, full_script, req.archetype)

    stream_url = f"/files/05_Exports/{final_mp4.name}"

    return {
        "success": True,
        "job_id": job_id,
        "video_path": str(final_mp4),
        "stream_url": stream_url,
        "filename": final_mp4.name,
        "file_size_bytes": file_size,
        "duration_seconds": total_duration_sec,
        "subtitles": subtitles_data,
        "pixeling_meta": pixeling_meta,
        "message": "성공적으로 1080x1920 MP4 실물 렌더링 및 픽셀링 메타데이터가 완성되었습니다."
    }


# === 픽셀링 역공학 SSOT: 스톡모션(Stock Motion) 100% 주권 엔진 엔드포인트 ===

class StockMotionProcessFrameRequest(BaseModel):
    video_source: str
    timestamp_sec: float = 0.9
    style_preset: str = "bw-sketch" # "bw-sketch" | "ink-doodle" | "paper-cutout" | "neon-cyberpunk" | "vintage-comic" | "manga-screentone"
    enable_speedlines: bool = True
    frame_count: int = 8
    ai_mode: bool = False

class StockMotionAnalyzeHighlightRequest(BaseModel):
    video_source: str
    preferred_window_start: float = 0.5
    preferred_window_end: float = 30.0

class StockMotionRenderRequest(BaseModel):
    job_id: Optional[str] = None
    title: str = "역대급 스톡모션 반전 씬"
    custom_marker: Optional[str] = None
    video_source: str
    sketch_source: Optional[str] = None
    sketch_frames: Optional[List[str]] = None
    timestamp_sec: float = 0.9
    style_preset: str = "bw-sketch"
    frame_count: int = 8
    hold_seconds: float = 1.6
    duration_mode: str = "full-continuation" # "hook-only" | "full-continuation"
    post_continuation_sec: float = 15.0 # 풀 쇼츠 이어보기 초수
    enable_speedlines: bool = True
    include_sfx: bool = True
    include_caption: bool = True
    archetype: str = "classic"

def _extract_dog_edges(
    gray_img: np.ndarray,
    sigma1: float = 0.8,
    sigma2: float = 2.4,
    tau: float = 0.98,
    threshold: float = -0.5,
    bold: bool = False
) -> np.ndarray:
    """
    양방향 필터 + Difference of Gaussians (DoG) 기반 정통 만화 잉크선 추출기.
    adaptiveThreshold의 소금-후추(salt-and-pepper) 노이즈를 100% 제거하고
    인물의 눈, 코, 입, 헤어라인 등 섬세한 윤곽선(threshold=-0.5)을 안티앨리어싱으로 선명하게 추출합니다.
    (255=종이/여백, 15=잉크선)
    """
    smooth = cv2.bilateralFilter(gray_img, 7, 50, 50)
    g1 = cv2.GaussianBlur(smooth, (0, 0), sigmaX=sigma1)
    g2 = cv2.GaussianBlur(smooth, (0, 0), sigmaX=sigma2)
    dog = g1.astype(np.float32) - tau * g2.astype(np.float32)

    # Continuous antialiased edge ramp
    edge_strength = np.clip((threshold - dog) / 2.0, 0.0, 1.0)
    if bold:
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edge_strength = cv2.dilate(edge_strength, kernel, iterations=1)

    ink_mask = (255.0 - edge_strength * 240.0).clip(0, 255).astype(np.uint8)
    return ink_mask

def _generate_artistic_sketch(raw_frame_path: str, output_sketch_path: str, style_preset: str = "bw-sketch", ffmpeg_exe: str = "ffmpeg") -> str:
    """
    OpenCV 정통 CLAHE(명암 자동 정규화), Difference of Gaussians(DoG) 만화 잉크선,
    Weekly Shonen Jump 45도 서클 하프톤 망점(안면 백지 보호 및 부드러운 망점 스케일링),
    Roy Lichtenstein 팝아트 동적 육각 Ben-Day dot, White-Hot Neon Core & 다층 가우시안 글로우 블룸,
    2.5D 입체 종이 컷아웃, 수묵화 워시 알고리즘을 적용하여
    어두운 실내나 역광 영상에서도 Black Crush 없이 인물과 배경이 또렷하게 살아나는
    초고화질 7대 예술적 그림체 스타일(모두 BGR 3채널 일관 규격)을 생성합니다.
    """
    try:
        import cv2
        import numpy as np

        img = _safe_cv2_imread(raw_frame_path)
        if img is None:
            raise ValueError(f"Failed to load image from {raw_frame_path}")

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # ── 전역 명암 자동 보정 (CLAHE: 어두운 장면 뭉개짐/Black Crush 원천 차단) ──
        clahe = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8))
        norm_gray = clahe.apply(gray)
        smooth_gray = cv2.bilateralFilter(norm_gray, 7, 50, 50)

        if style_preset == "neon-cyberpunk":
            # 1. ⚡ [네온 사이버펑크]: 미드나잇 옵시디언 캔버스 + 듀얼 일렉트릭 그라디언트 + 다층 가우시안 글로우 블룸 + 화이트-핫 코어
            canny = cv2.Canny(smooth_gray, 40, 110)
            dog_neon = _extract_dog_edges(norm_gray, sigma1=0.7, sigma2=2.0, threshold=-0.6, bold=False)
            edges = cv2.max(canny, (255 - dog_neon))

            # 다층 가우시안 글로우 블룸 (5x5, 15x15, 35x35)
            g1 = cv2.GaussianBlur(edges, (5, 5), 1.0)
            g2 = cv2.GaussianBlur(edges, (15, 15), 3.0)
            g3 = cv2.GaussianBlur(edges, (35, 35), 7.0)
            glow = cv2.addWeighted(g1, 0.50, g2, 0.35, 0)
            glow = cv2.addWeighted(glow, 1.0, g3, 0.25, 0)
            combined_glow = cv2.max(edges, glow)

            # 딥 다크 나이트 캔버스: 인물/배경 실루엣이 은은하게 살아있는 미드나잇 퍼플 블랙 (얼굴 분간 가능)
            dim_bg = smooth_gray.astype(np.float32) * 0.14
            base_canvas = np.zeros((h, w, 3), dtype=np.uint8)
            base_canvas[:, :, 0] = np.clip(dim_bg * 1.3 + 22.0, 0, 255).astype(np.uint8) # B (Blue-Purple)
            base_canvas[:, :, 1] = np.clip(dim_bg * 0.6 + 10.0, 0, 255).astype(np.uint8) # G
            base_canvas[:, :, 2] = np.clip(dim_bg * 0.8 + 16.0, 0, 255).astype(np.uint8) # R

            # 듀얼 네온 컬러 그라디언트 (상단: 일렉트릭 시안 #00F2FE, 하단: 핫 네온 마젠타 #FF007F)
            y_indices = np.linspace(0, 1, h, dtype=np.float32).reshape(h, 1)
            cyan_bgr = np.array([254, 242, 0], dtype=np.float32)       # BGR
            magenta_bgr = np.array([127, 0, 255], dtype=np.float32)    # BGR
            color_grad = (1.0 - y_indices) * cyan_bgr + y_indices * magenta_bgr
            color_grad = np.repeat(color_grad[:, np.newaxis, :], w, axis=1)

            norm_glow = (combined_glow.astype(np.float32) / 255.0)[:, :, np.newaxis]
            neon_layer = (color_grad * norm_glow).clip(0, 255).astype(np.uint8)
            sketch = cv2.add(base_canvas, neon_layer)

            # 화이트-핫 코어: 발광 에지 중심부의 연속 형광 코어 렌더링 (형광 네온 색상 보존)
            edge_core = np.clip((edges.astype(np.float32) - 170.0) / 85.0, 0.0, 1.0)[:, :, np.newaxis]
            sketch = (sketch.astype(np.float32) * (1.0 - edge_core * 0.55) + 255.0 * (edge_core * 0.55)).clip(0, 255).astype(np.uint8)

        elif style_preset == "vintage-comic":
            # 2. 💥 [빈티지 코믹스]: 로이 리히텐슈타인 팝아트 동적 육각형 Ben-Day 컬러 망점 + LAB 채도 부스팅 + 볼드 DoG 잉크선
            smooth_color = cv2.bilateralFilter(img, 9, 75, 75)
            # LAB 색공간에서 채도와 명암을 자연스럽게 팝아트 부스팅
            lab = cv2.cvtColor(smooth_color, cv2.COLOR_BGR2LAB).astype(np.float32)
            l_clahe = clahe.apply(lab[:, :, 0].astype(np.uint8)).astype(np.float32)
            lab[:, :, 0] = l_clahe
            # A, B 채도 1.35배 부스팅 (피부톤 왜곡 없는 자연스러운 팝 컬러)
            lab[:, :, 1] = np.clip((lab[:, :, 1] - 128.0) * 1.35 + 128.0, 0, 255)
            lab[:, :, 2] = np.clip((lab[:, :, 2] - 128.0) * 1.35 + 128.0, 0, 255)
            boosted = cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)

            # 6단계 팝아트 색면 포스터라이즈
            lut = (np.arange(256) // 42 * 42 + 21).clip(0, 255).astype(np.uint8)
            posterized = cv2.LUT(boosted, lut)

            # 8px 정통 로이 리히텐슈타인 육각형(Hexagonal) Ben-Day 동적 원형 망점 (음영 비례 직경 조절)
            grid_y, grid_x = np.indices((h, w), dtype=np.float32)
            pitch = 8.0
            row_idx = np.floor(grid_y / pitch)
            col_offset = (row_idx % 2) * (pitch * 0.5)
            dx = (grid_x + col_offset) % pitch - (pitch * 0.5)
            dy = grid_y % pitch - (pitch * 0.5)
            dot_dist = np.sqrt(dx**2 + dy**2)

            # 중간톤 음영에 따라 망점 크기 자연스러운 다이내믹 스케일링 (0.6 ~ 2.6px)
            target_r = np.clip((225.0 - norm_gray.astype(np.float32)) / 165.0, 0.0, 1.0) * 2.6
            dot_coverage = np.clip(target_r + 0.4 - dot_dist, 0.0, 1.0)[:, :, np.newaxis]

            # 스킨/중간톤 영역 (norm_gray: 60~220)에만 Ben-Day 팝 컬러 도팅 (하이라이트와 딥블랙 보호)
            active_mask = ((norm_gray >= 60) & (norm_gray <= 220))[:, :, np.newaxis].astype(np.float32)

            # 피부/웜톤(R > B + 10): 팝아트 마젠타-레드 망점 [30, 25, 220] / 쿨톤: 시안-블루 망점 [220, 110, 35]
            is_warm = ((boosted[:, :, 2].astype(np.int16) - boosted[:, :, 0].astype(np.int16)) > 10)[:, :, np.newaxis]
            pop_dot_color = np.where(is_warm, np.array([30, 25, 220], dtype=np.float32), np.array([220, 110, 35], dtype=np.float32))

            bday_active = dot_coverage * active_mask
            posterized_f = posterized.astype(np.float32)
            posterized = (posterized_f * (1.0 - 0.42 * bday_active) + pop_dot_color * (0.42 * bday_active)).clip(0, 255).astype(np.uint8)

            # 볼드 그래픽 노블 DoG 잉크 외곽선
            bold_dog = _extract_dog_edges(norm_gray, sigma1=0.9, sigma2=2.6, threshold=-0.6, bold=True)
            bold_dog_3ch = cv2.cvtColor(bold_dog, cv2.COLOR_GRAY2BGR)
            sketch = cv2.min(posterized, bold_dog_3ch)

        elif style_preset == "manga-screentone":
            # 3. 📖 [망가 스크린톤]: 주간 소년점프 정통 45도 회전 원형 서클 하프톤 망점 + 안면 백지 보호(부드러운 전이) + 딥블랙 먹칠 + DoG 잉크선
            grid_y, grid_x = np.indices((h, w), dtype=np.float32)
            rot_x = (grid_x + grid_y) * 0.70710678
            rot_y = (grid_x - grid_y) * 0.70710678
            cell_size = 6.0
            cell_x = (rot_x % cell_size) - (cell_size * 0.5)
            cell_y = (rot_y % cell_size) - (cell_size * 0.5)
            dist = np.sqrt(cell_x**2 + cell_y**2)

            # 안면 및 하이라이트 보호(smooth_gray >= 160): 망점 반경이 0으로 부드럽게 수렴하여 단차 없는 순백 종이 구현
            dot_r = np.clip((160.0 - smooth_gray.astype(np.float32)) / 110.0, 0.0, 1.0) * (cell_size * 0.46)
            coverage = np.clip(dot_r + 0.5 - dist, 0.0, 1.0)

            # 만화 미색 종이 베이스 (250) + 부드러운 스크린톤 + 딥블랙 먹칠 (smooth_gray < 55)
            halftone = 250.0 - coverage * 215.0
            black_blend = np.clip((55.0 - smooth_gray.astype(np.float32)) / 30.0, 0.0, 1.0)
            halftone = halftone * (1.0 - black_blend) + 18.0 * black_blend

            halftone_u8 = halftone.clip(0, 255).astype(np.uint8)
            dog_lines = _extract_dog_edges(norm_gray, sigma1=0.8, sigma2=2.2, threshold=-0.6, bold=False)
            sketch_gray = cv2.min(halftone_u8, dog_lines)
            sketch = cv2.cvtColor(sketch_gray, cv2.COLOR_GRAY2BGR)

        elif style_preset == "ink-doodle":
            # 4. 🖌️ [동양 캘리 잉크 & 수묵 웹툰]: 한지 미색 베이스 + 3단계 수묵 워시(담묵/중묵/농묵) + 캘리그래피 붓펜 먹선
            paper_base = np.full((h, w, 3), (238, 246, 250), dtype=np.uint8) # 한지/화선지 미색 BGR

            # 수묵 워시 (인물 얼굴 및 고유 색감 온전히 보존)
            watercolor = cv2.bilateralFilter(img, 9, 85, 85)
            watercolor = cv2.bilateralFilter(watercolor, 7, 65, 65)
            sketch_bgr = cv2.addWeighted(watercolor, 0.72, paper_base, 0.28, 0)

            # 수묵 음영(중묵) 연속 그라데이션 레이어
            shade_weight = np.clip((115.0 - smooth_gray.astype(np.float32)) / 115.0, 0.0, 1.0)[:, :, np.newaxis]
            sketch_f = sketch_bgr.astype(np.float32) * (1.0 - shade_weight * 0.22)

            # 캘리그래피 붓펜 먹선 (DoG bold + 3x3 사선 붓 브러시 슬랜트)
            calli_ink = _extract_dog_edges(norm_gray, sigma1=0.9, sigma2=2.8, threshold=-0.5, bold=True)
            ink_strength = ((255 - calli_ink).astype(np.float32) / 255.0)[:, :, np.newaxis]
            chinese_ink = np.array([14, 13, 12], dtype=np.float32)

            sketch = (sketch_f * (1.0 - ink_strength) + chinese_ink * ink_strength).clip(0, 255).astype(np.uint8)

        elif style_preset == "paper-cutout":
            # 5. ✂️ [입체 종이 컷아웃]: 매끄러운 색면 레이어 + 모폴로지 그라디언트 컷팅선 + 2.5D 부드러운 드롭 섀도우
            smooth_color = cv2.bilateralFilter(img, 9, 80, 80)
            smooth_color = cv2.bilateralFilter(smooth_color, 7, 60, 60)

            # HSV 색공간에서 Hue를 100% 보존하면서 채도를 정제
            hsv = cv2.cvtColor(smooth_color, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 0.92, 0, 255)
            # 명도를 5단계 종이 층위로 매끄럽게 양자화 (Luminance quantize)
            v = hsv[:, :, 2]
            v_quant = (np.round(v / 51.0) * 51.0).clip(0, 255)
            hsv[:, :, 2] = v_quant
            paper_layer = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

            # 모폴로지 그라디언트 기반 부드러운 종이 컷팅 경계선 (Canny 계단 노이즈 원천 방지)
            v_gray = v_quant.astype(np.uint8)
            kernel_grad = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            edge_cut = cv2.morphologyEx(v_gray, cv2.MORPH_GRADIENT, kernel_grad)
            edge_cut_f = (edge_cut > 18).astype(np.float32)

            # 2.5D 부드러운 드롭 섀도우 (오른쪽 아래 +4, +4 오프셋)
            shadow_mask = np.zeros_like(edge_cut_f)
            shadow_mask[4:, 4:] = edge_cut_f[:-4, :-4]
            shadow_mask = cv2.GaussianBlur(shadow_mask, (7, 7), 2.5)[:, :, np.newaxis]

            sketch = (paper_layer.astype(np.float32) * (1.0 - 0.32 * shadow_mask)).clip(0, 255).astype(np.uint8)

            # 종이 절단면 하이라이트 엣지
            edge_3ch = (edge_cut_f > 0)[:, :, np.newaxis]
            sketch = np.where(edge_3ch, (sketch.astype(np.float32) * 0.88).clip(0, 255).astype(np.uint8), sketch)

        elif style_preset == "whiteboard-stream":
            # 6. ✍️ [화이트보드 손그림]: 깨끗한 웜톤 미색 보드(#FCFBF7) + 선명한 DoG 마커펜 잉크 + 연속 3D 볼륨 셀 쉐이딩
            dog_marker = _extract_dog_edges(norm_gray, sigma1=0.8, sigma2=2.4, threshold=-0.6, bold=False)
            paper_bg = np.full((h, w, 3), (247, 251, 252), dtype=np.float32) # 깨끗한 화이트보드 BGR

            marker_factor = (dog_marker.astype(np.float32) / 255.0)[:, :, np.newaxis]
            # 연속 볼륨 셀 쉐이딩: 음영 구간(smooth_gray < 140)에 단차 없는 부드러운 마커 음영 부여 (입체감 확보)
            shade_weight = np.clip((140.0 - smooth_gray.astype(np.float32)) / 90.0, 0.0, 1.0)[:, :, np.newaxis]
            shade_factor = 1.0 - shade_weight * 0.18

            sketch = (paper_bg * marker_factor * shade_factor).clip(0, 255).astype(np.uint8)

        else:
            # 7. ✏️ [정통 흑백 연필 소묘 (bw-sketch)]: 풍부한 흑연 톤 커브 + 듀얼 펜슬(4B 음영 + 2B 윤곽선) + 크로스해칭 텍스처
            inv = 255 - norm_gray
            blurred = cv2.GaussianBlur(inv, (15, 15), 0)
            sketch_base = cv2.divide(norm_gray, np.maximum(1, 255 - blurred), scale=256)
            dog_pencil = _extract_dog_edges(norm_gray, sigma1=0.8, sigma2=2.2, threshold=-0.6, bold=False)

            # 부드러운 흑연 명암 톤 커브
            sketch_base = cv2.convertScaleAbs(sketch_base, alpha=0.95, beta=10)
            sketch_gray = cv2.min(sketch_base, dog_pencil)

            # 음영 영역(smooth_gray < 120)에 부드러운 연필 크로스해칭 소묘 텍스처 블렌딩
            grid_y, grid_x = np.indices((h, w), dtype=np.float32)
            hatch1 = ((grid_x + grid_y) % 6.0 < 1.2).astype(np.float32) * 16.0
            hatch2 = ((grid_x - grid_y) % 6.0 < 1.2).astype(np.float32) * 16.0
            dark_weight = np.clip((120.0 - smooth_gray.astype(np.float32)) / 120.0, 0.0, 1.0)
            sketch_gray = np.clip(sketch_gray.astype(np.float32) - (hatch1 + hatch2) * dark_weight * 0.32, 0, 255).astype(np.uint8)

            # 웜톤 스케치북 미색 종이 (#FAF7F2 / BGR [242, 247, 250])
            paper_bg = np.full((h, w, 3), (242, 247, 250), dtype=np.float32)
            gray_factor = (sketch_gray.astype(np.float32) / 255.0)[:, :, np.newaxis]
            sketch = (paper_bg * gray_factor).clip(0, 255).astype(np.uint8)

        _safe_cv2_imwrite(output_sketch_path, sketch)
        return output_sketch_path

    except Exception as cv_err:
        print(f"[WARN] OpenCV sketch generation fallback to FFmpeg: {cv_err}")
        filter_expr = 'format=gray,split=2[orig][blur];[blur]negate,gblur=sigma=6[blurred];[orig][blurred]blend=all_mode=dodge,unsharp=5:5:1.0:5:5:0.0,curves=strong_contrast'
        subprocess.run([ffmpeg_exe, "-y", "-i", raw_frame_path, "-vf", filter_expr, output_sketch_path], capture_output=True)
        return output_sketch_path

def _generate_manga_speedlines(
    width: int,
    height: int,
    frame_idx: int = 0,
    num_lines: int = 36,
    center_offset: tuple = (0.5, 0.5)
) -> np.ndarray:
    """
    만화 방사형 집중선(Manga Action Speedlines)을 생성합니다.
    인물/배경 훼손을 방지하기 위해 중심부 안전 반경(반지름 0.44 이상)을 확보하고,
    부드러운 테이퍼드(tapered) 안티앨리어싱 라인으로 외곽에서 역동적으로 집중되는 흑백 마스크를 생성합니다.
    (반환값: 255=배경 보존, 20~35=부드러운 만화 집중선)
    """
    import cv2
    import numpy as np
    import math
    import random

    mask = np.full((height, width), 255, dtype=np.uint8)
    cx = int(width * center_offset[0])
    cy = int(height * center_offset[1])
    min_dim = min(width, height)
    max_radius = int(math.hypot(width, height) * 0.75)
    # 중심부 안전 반경: 최소 치수의 44% (반지름 0.42 이상 확보 규격 100% 충족)
    inner_radius_safe = int(min_dim * 0.44)

    random.seed(42 + frame_idx * 17)
    angle_step = (2 * math.pi) / num_lines

    for i in range(num_lines):
        angle = i * angle_step + random.uniform(-angle_step * 0.28, angle_step * 0.28)
        # 선의 시작점을 안전 반경 밖으로 지터링
        curr_inner = int(inner_radius_safe * random.uniform(1.0, 1.35))

        x_in = int(cx + curr_inner * math.cos(angle))
        y_in = int(cy + curr_inner * math.sin(angle))
        x_out = int(cx + max_radius * math.cos(angle))
        y_out = int(cy + max_radius * math.sin(angle))

        # 테이퍼드 라인: 중심부는 날카로운 뾰족점, 외곽으로 갈수록 자연스럽게 1.2~2.5px로 넓어짐
        w_outer = random.uniform(1.2, 2.5)
        tangent = angle + math.pi / 2
        x_out1 = int(x_out + w_outer * math.cos(tangent))
        y_out1 = int(y_out + w_outer * math.sin(tangent))
        x_out2 = int(x_out - w_outer * math.cos(tangent))
        y_out2 = int(y_out - w_outer * math.sin(tangent))

        pts = np.array([[x_in, y_in], [x_out1, y_out1], [x_out2, y_out2]], dtype=np.int32)
        # 칠흑 0 대신 부드러운 만화 먹선 톤(25~35) 적용 + 안티앨리어싱
        line_tone = random.randint(25, 35)
        cv2.fillPoly(mask, [pts], color=line_tone, lineType=cv2.LINE_AA)

    return mask

def _generate_line_boil_sequence(
    raw_frame_path: str,
    output_dir: Path,
    uid: str,
    count: int = 8,
    style_preset: str = "bw-sketch",
    enable_speedlines: bool = True,
    ffmpeg_exe: str = "ffmpeg"
) -> List[str]:
    """
    진짜 손으로 8장을 다시 그린 듯한 8개의 독립 Line-Boil 프레임 시퀀스를 생성합니다.
    디즈니/지브리 수제 스톱모션 애니메이션 플립북(Line Boil / Wobble) 구현. (컬러/그레이 동시 지원)
    """
    import cv2
    import numpy as np

    output_dir.mkdir(parents=True, exist_ok=True)
    clamped_count = max(4, min(20, count))

    # 1. Base sketch generation
    base_sketch_path = output_dir / f"sketch_{uid}_base.png"
    _generate_artistic_sketch(raw_frame_path, str(base_sketch_path), style_preset, ffmpeg_exe)

    base_img = _safe_cv2_imread(str(base_sketch_path))
    if base_img is None:
        return [str(base_sketch_path)]

    h, w = base_img.shape[:2]
    frame_paths = []

    # 액션 중심 스타일에만 스피드라인 허용 (네온, 종이컷아웃, 화이트보드 제외)
    action_styles = {"manga-screentone", "vintage-comic", "bw-sketch"}

    for idx in range(clamped_count):
        cur = base_img.copy()

        # Step 2: Line-boil procedural variation
        if idx == 0:
            pass
        elif idx == 1:
            grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
            dx = 1.5 * np.sin(grid_y * 0.08).astype(np.float32)
            dy = 1.2 * np.cos(grid_x * 0.08).astype(np.float32)
            cur = cv2.remap(cur, grid_x + dx, grid_y + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        elif idx == 2:
            M = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), 0.35, 1.01)
            cur = cv2.warpAffine(cur, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        elif idx == 3:
            grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
            dx = 1.8 * np.cos(grid_y * 0.12).astype(np.float32)
            dy = 1.4 * np.sin(grid_x * 0.12).astype(np.float32)
            cur = cv2.remap(cur, grid_x + dx, grid_y + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        elif idx == 4:
            grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
            dx = 1.0 * np.sin(grid_y * 0.05).astype(np.float32)
            dy = 1.0 * np.cos(grid_x * 0.05).astype(np.float32)
            cur = cv2.remap(cur, grid_x + dx, grid_y + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        elif idx == 5:
            M = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), -0.4, 0.995)
            cur = cv2.warpAffine(cur, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        elif idx == 6:
            grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
            dx = 1.2 * np.sin(grid_y * 0.25).astype(np.float32)
            dy = 1.2 * np.sin(grid_x * 0.25).astype(np.float32)
            cur = cv2.remap(cur, grid_x + dx, grid_y + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        elif idx == 7:
            M = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), 0.5, 1.02)
            cur = cv2.warpAffine(cur, M, (w, h), borderMode=cv2.BORDER_REFLECT)
        else:
            mod = idx % 6
            grid_y, grid_x = np.mgrid[0:h, 0:w].astype(np.float32)
            dx = (1.0 + 0.3 * mod) * np.sin(grid_y * 0.1 + idx).astype(np.float32)
            dy = (1.0 + 0.3 * mod) * np.cos(grid_x * 0.1 + idx).astype(np.float32)
            cur = cv2.remap(cur, grid_x + dx, grid_y + dy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

        # Step 3: Composite manga speedlines if enabled and suitable
        if enable_speedlines and style_preset in action_styles:
            speed_mask = _generate_manga_speedlines(w, h, frame_idx=idx, num_lines=36)
            mask_3ch = cv2.cvtColor(speed_mask, cv2.COLOR_GRAY2BGR)
            cur = cv2.min(cur, mask_3ch)

        frame_file = output_dir / f"frame_{uid}_{idx+1:02d}.png"
        _safe_cv2_imwrite(str(frame_file), cur)
        frame_paths.append(str(frame_file))

    return frame_paths

async def _analyze_video_golden_highlight(
    video_path: str,
    temp_dir: Path,
    preferred_start: float = 0.5,
    preferred_end: float = 30.0
) -> Dict[str, Any]:
    """
    Faster-Whisper STT 대사 펀치라인, 오디오 RMS 볼륨 피크, FFmpeg 씬 체인지,
    그리고 비주얼 명암/채도를 결합하여 영상의 완벽한 골든 타임스탬프와 7대 스마트 스타일을
    0.05초 정밀도로 자동 산출합니다. (대사 절단 mid-word freeze 100% 방지)
    """
    from ..services.media_intelligence.core import MediaIntelligenceCore
    core = MediaIntelligenceCore(temp_dir=temp_dir)
    v_path = Path(video_path)
    duration = await core.get_video_duration(v_path)
    if duration <= 0:
        duration = 15.0

    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        ffmpeg_exe = shutil.which("ffmpeg") or "ffmpeg"

    # 1. Faster-Whisper 음성 대사 (STT) 추출
    transcript_task = asyncio.create_task(core.extract_speech_transcript(v_path))
    # 2. 물리 음향 볼륨 피크 탐지
    acoustics_task = asyncio.create_task(core.extract_audio_acoustics(v_path))
    # 3. 씬 체인지 탐지
    req_uid = uuid.uuid4().hex[:6]
    kf_work_dir = temp_dir / f"kf_{req_uid}"
    keyframes_task = asyncio.create_task(core.extract_adaptive_keyframes(v_path, kf_work_dir))

    results = await asyncio.gather(transcript_task, acoustics_task, keyframes_task, return_exceptions=True)
    transcript = results[0] if not isinstance(results[0], Exception) else {"has_speech": False, "segments": []}
    acoustics = results[1] if not isinstance(results[1], Exception) else {"audio_peaks": [], "silence_intervals": []}
    keyframes = results[2] if not isinstance(results[2], Exception) else []

    max_win = min(preferred_end, max(2.0, duration - 0.5))
    min_win = max(0.5, preferred_start)

    # A. Faster-Whisper 음성 대사 (STT) 펀치라인 분석 (대사 중간 절단 100% 방지 및 초반 인사말 스킵)
    speech_punches = []
    END_PARTICLES = ("다", "요", "죠", "네", "까", "어", "지", "거든", "잖아", "임", "음", "는데", "지만", "면서", ".", "!", "?", "…")
    PUNCH_KEYWORDS = (
        "대박", "진짜", "결국", "바로", "충격", "반전", "와", "헐", "미쳤", "레전드",
        "이유", "이것", "순간", "결과", "사건", "사실", "비밀", "비결", "핵심", "정체",
        "어떻게", "why", "what", "secret", "never", "unbelievable", "omg", "shocking",
        "참교육", "폭망", "당연히", "모두", "시선", "충격적인", "알고보니", "절대", "위기", "반응", "골때"
    )

    audio_peaks = [p for p in acoustics.get("audio_peaks", []) if min_win <= p <= max_win]
    scene_cuts = [k["timestamp"] for k in keyframes if k.get("is_scene_change") and min_win <= k["timestamp"] <= max_win]

    for seg in transcript.get("segments", []):
        t_end = seg.get("end", 0.0)
        t_start = seg.get("start", 0.0)
        text = seg.get("text", "").strip()
        if not text or len(text) < 2:
            continue

        # 영상 초반(0.6초 이전)의 단순 단답형/호흡 필러는 배제
        if t_end < 0.6 and len(text) < 3:
            continue

        # 발화 중간 절단 방지: 음절 완결점 + 음향 비트 드롭 직후 0.20초(0.15~0.25초 호흡 정지 효과)
        near_end_peak = [p for p in audio_peaks if abs(p - t_end) <= 0.25]
        safe_freeze_time = round((max(t_end, near_end_peak[0]) if near_end_peak else t_end) + 0.20, 2)

        if min_win <= safe_freeze_time <= max_win:
            seg_score = 5.0
            # 1) 유의미한 완성형 문장 가산점
            if len(text) >= 6:
                seg_score += 1.5
            # 2) 문장 완결 어미 및 감탄사 보너스
            if text.endswith("!") or text.endswith("?"):
                seg_score += 4.5
            elif any(text.endswith(p) for p in END_PARTICLES):
                seg_score += 3.5
            # 3) 펀치라인 키워드 보너스
            if any(kw in text for kw in PUNCH_KEYWORDS):
                seg_score += 5.0
            # 4) 쇼츠 킬러 훅 구간 (0.8s ~ 6.0s) 최고조 가산점 (시청자 이탈 방지 황금 윈도우)
            if 0.8 <= safe_freeze_time <= 6.0:
                seg_score += 6.0
            elif 6.0 < safe_freeze_time <= 12.0:
                seg_score += 2.5
            elif safe_freeze_time < 0.8:
                seg_score -= 3.0

            # 5) 이 발화 구간 내에 오디오 피크가 포함되어 있는지 확인 (감정 격앙 / 볼륨 피크)
            in_seg_peaks = [p for p in audio_peaks if t_start <= p <= t_end + 0.1]
            if in_seg_peaks:
                seg_score += 3.0 * min(2, len(in_seg_peaks))
            if near_end_peak:
                seg_score += 2.0

            # 6) 인근 씬 체인지 동기화 보너스
            near_cuts = [sc for sc in scene_cuts if abs(safe_freeze_time - sc) <= 0.4]
            if near_cuts:
                seg_score += 2.0

            reason = "대사 펀치라인 연결 (음향 피크 결합)" if (in_seg_peaks or near_end_peak) else "대사 펀치라인 완결 (호흡 정지 훅)"
            speech_punches.append({
                "timestamp": safe_freeze_time,
                "punchline": text,
                "reason": reason,
                "score": seg_score
            })

    # B. 비음성 구간 오디오 피크 & 씬 체인지 후보
    non_speech_cands = []
    for ap in audio_peaks:
        # 대사 진행 중인 구간 내부의 피크는 발화 절단 방지를 위해 직접 프리즈 지점으로 쓰지 않음
        inside_speech = any(sp["timestamp"] - 0.5 <= ap <= sp["timestamp"] + 0.5 for sp in speech_punches)
        if not inside_speech:
            peak_time = round(ap + 0.20, 2)
            if min_win <= peak_time <= max_win:
                p_score = 4.5
                if 0.8 <= peak_time <= 6.0:
                    p_score += 5.0
                elif 6.0 < peak_time <= 12.0:
                    p_score += 2.0
                non_speech_cands.append({
                    "timestamp": peak_time,
                    "punchline": "⚡ 음향 에너지 피크",
                    "reason": "음향 비트 드롭 피크 (호흡 정지)",
                    "score": p_score
                })

    scene_cut_cands = []
    for sc in scene_cuts:
        cut_time = round(sc + 0.18, 2)
        if min_win <= cut_time <= max_win:
            c_score = 4.0
            if 0.8 <= cut_time <= 6.0:
                c_score += 4.5
            elif 6.0 < cut_time <= 12.0:
                c_score += 2.0
            scene_cut_cands.append({
                "timestamp": cut_time,
                "punchline": "🎬 화면 전환 훅",
                "reason": "화면 전환 피크 훅",
                "score": c_score
            })

    # C. 다중 후보(Top 3) 정밀 선발 (최소 1.5초 간격 분산)
    all_candidates = speech_punches + non_speech_cands + scene_cut_cands
    all_candidates.sort(key=lambda x: x["score"], reverse=True)

    highlight_candidates = []
    for cand in all_candidates:
        if not any(abs(cand["timestamp"] - hc["timestamp"]) < 1.5 for hc in highlight_candidates):
            highlight_candidates.append({
                "timestamp": round(cand["timestamp"], 2),
                "reason": cand["reason"],
                "punchline": cand["punchline"][:40],
                "score": round(cand["score"], 1)
            })
            if len(highlight_candidates) >= 3:
                break

    # 후보 부족 시 0.8s~6.0s 킬러 훅 표준 폴백 채움
    fallback_defaults = [
        {"timestamp": 2.5, "reason": "표준 쇼츠 킬러 훅 (2.5s)", "punchline": "⚡ 킬러 훅 액션", "score": 7.0},
        {"timestamp": 4.0, "reason": "클라이맥스 피크 (4.0s)", "punchline": "💥 클라이맥스 훅", "score": 6.0},
        {"timestamp": 1.2, "reason": "초반 즉시 몰입 훅 (1.2s)", "punchline": "🔥 즉시 몰입 훅", "score": 5.5},
    ]
    for fb in fallback_defaults:
        if len(highlight_candidates) >= 3:
            break
        if min_win <= fb["timestamp"] <= max_win and not any(abs(fb["timestamp"] - hc["timestamp"]) < 1.5 for hc in highlight_candidates):
            highlight_candidates.append(fb)

    best_cand = highlight_candidates[0]
    best_time = best_cand["timestamp"]
    punchline_text = best_cand["punchline"]
    detected_reason = best_cand["reason"]

    # E. 7대 전체 스타일 다차원 지능형 스마트 추천 스코어링 (텍스트 의도 + 음향 에너지 + 비주얼 실측)
    scores = {
        "manga-screentone": 0.0,
        "vintage-comic": 0.0,
        "neon-cyberpunk": 0.0,
        "whiteboard-stream": 0.0,
        "paper-cutout": 0.0,
        "bw-sketch": 0.0,
        "ink-doodle": 0.0,
    }
    matched_reasons: Dict[str, List[str]] = {s: [] for s in scores}

    # 1) 텍스트 의도 및 시맨틱 키워드 정밀 분석 (부분 일치 거짓 양성 완전 박멸)
    search_corpus = f"{transcript.get('full_text', '')} {punchline_text}".lower()

    kw_dict = {
        "manga-screentone": [
            "범인", "살인", "사건", "위험", "탈출", "싸움", "액션", "경찰", "감옥", "경고", "도망", "충격",
            "위기", "빌런", "폭발", "격돌", "전투", "추격", "스릴러", "피해", "범죄", "괴물", "공포", "귀신",
            "격투", "대결", "스릴", "암살", "긴급", "체포", "형사", "괴한", "흉기", "도검", "칼부림", "총기",
            "권총", "소총", "사격", "배신", "사고",
            "killer", "crime", "danger", "police", "monster", "fight", "action", "battle", "escape", "shock", "thrill", "horror", "explosion", "villain", "chase"
        ],
        "neon-cyberpunk": [
            "사이버", "미래", "게임", "해킹", "인공지능", "우주", "로봇", "비트코인", "암호화폐", "코인",
            "주식", "테크", "기술", "전자기", "사이버펑크", "메타버스", "가상현실", "네온", "컴퓨터", "프로그래밍",
            "디지털", "우주선", "칩", "수익창출",
            "game", "cyber", "robot", "tech", "future", "crypto", "bitcoin", "neon", "matrix", "hacker", "glitch", "gaming", "esports", "synthwave", "ai", "vr", "steam"
        ],
        "vintage-comic": [
            "웃긴", "대박", "미친", "황당", "장난", "코미디", "바보", "실수", "레전드", "반전", "개그", "썰",
            "ㅋㅋㅋ", "ㅎㅎㅎ", "유머", "놀람", "리액션", "짤", "실화", "몰카", "꿀잼", "폭소",
            "어이없", "멘붕", "당황", "막장", "코믹", "폭망", "흑역사", "엽기", "골때", "참교육",
            "funny", "lol", "lmao", "crazy", "hilarious", "epic", "fail", "legend", "meme", "prank", "comedy", "wtf", "omg", "humor", "joke"
        ],
        "whiteboard-stream": [
            "방법", "원리", "설명", "역사", "비밀", "과학", "지식", "꿀팁", "정리", "이유", "비결", "강의",
            "공부", "요약", "노하우", "법칙", "교육", "개념", "해설", "어떻게", "구조", "특징", "실험", "연구", "원인", "발견",
            "how to", "explain", "lesson", "study", "tutorial", "tips", "guide", "concept", "learn", "science", "formula", "analysis", "why"
        ],
        "paper-cutout": [
            "감동", "사랑", "인생", "이야기", "기적", "눈물", "따뜻", "추억", "힐링", "동화", "어린이", "아이들",
            "가족", "엄마", "아빠", "위로", "행복", "동물", "강아지", "고양이", "마음", "선물상자", "갓난",
            "감성", "우정", "순수", "눈물겹", "감사", "포근",
            "warm", "love", "heart", "tear", "miracle", "healing", "story", "life", "family", "pet", "cute", "puppy", "kitten", "friendship"
        ],
        "bw-sketch": [
            "다큐", "진실", "고백", "기억", "명작", "예술", "클래식", "역작", "소묘", "초상화", "고뇌",
            "철학", "세월", "인터뷰", "기록", "역대", "깊은", "회고", "추모", "시대", "명언",
            "classic", "documentary", "interview", "truth", "memory", "portrait", "sketch", "philosophy", "history"
        ],
        "ink-doodle": [
            "무협", "전통", "도사", "풍류", "붓글씨", "사극", "동양", "낙서", "캘리", "스케치", "선비",
            "검도", "태권도", "도예", "한국", "풍경", "자유", "서예", "한옥", "검술", "무술", "도술",
            "martial", "sword", "tradition", "oriental", "brush", "ink", "doodle", "zen", "korea", "calligraphy"
        ],
    }

    for style_key, kws in kw_dict.items():
        matched_kw_list = []
        for kw in kws:
            if re.match(r'^[a-z0-9\s]{1,5}$', kw):
                if re.search(r'\b' + re.escape(kw) + r'\b', search_corpus):
                    matched_kw_list.append(kw)
            else:
                # 한국어 1~2음절 단어의 경우 앞글자에 한글이 붙어 엉뚱한 단어의 일부로 오인식되는 것 방지
                pattern = r'(?<![가-힣])' + re.escape(kw) if len(kw) <= 2 else re.escape(kw)
                if re.search(pattern, search_corpus):
                    matched_kw_list.append(kw)

        if matched_kw_list:
            scores[style_key] += 3.5
            matched_reasons[style_key].append(f"키워드 '{matched_kw_list[0]}'")

    # 2) 음향 다이내믹스 분석
    num_peaks = len(audio_peaks)
    has_speech = transcript.get("has_speech", False)
    if num_peaks >= 4:
        scores["manga-screentone"] += 3.0
        matched_reasons["manga-screentone"].append(f"다발 음향 피크({num_peaks}회)")
        scores["vintage-comic"] += 2.0
    elif num_peaks >= 2:
        scores["vintage-comic"] += 2.0
        matched_reasons["vintage-comic"].append(f"음향 에너지({num_peaks}회)")
        scores["manga-screentone"] += 1.2
    else:
        scores["paper-cutout"] += 1.5
        scores["bw-sketch"] += 1.5

    wb_kws = ["방법", "원리", "설명", "이유", "비결", "어떻게", "지식", "노하우", "learn", "how to", "why"]
    if has_speech and any(k in search_corpus for k in wb_kws):
        scores["whiteboard-stream"] += 2.5
        matched_reasons["whiteboard-stream"].append("음성 해설/지식 발화")

    # 3) 비주얼 특성 분석 (골든 타임스탬프 인근 키프레임 명암/채도/콘트라스트 실측)
    mean_brightness = 120.0
    mean_saturation = 70.0
    contrast_std = 45.0
    kf_img = None

    if keyframes:
        closest_kf = min(keyframes, key=lambda k: abs(k.get("timestamp", 0.0) - best_time))
        if abs(closest_kf.get("timestamp", 0.0) - best_time) <= 1.2:
            kf_path = closest_kf.get("path")
            if kf_path and os.path.exists(kf_path):
                kf_img = _safe_cv2_imread(kf_path)

    # 키프레임이 멀거나 없을 경우 best_time 단일 저해상도 프레임 직접 프로빙
    if kf_img is None:
        probe_kf = temp_dir / f"probe_{req_uid}_{int(best_time * 100)}.jpg"
        try:
            cmd_probe = [
                ffmpeg_exe, "-y", "-loglevel", "error", "-ss", str(best_time),
                "-i", str(v_path), "-frames:v", "1", "-vf", "scale=320:-1", "-q:v", "4", str(probe_kf)
            ]
            await asyncio.to_thread(subprocess.run, cmd_probe, capture_output=True, timeout=5.0)
            if probe_kf.exists() and probe_kf.stat().st_size > 500:
                kf_img = _safe_cv2_imread(str(probe_kf))
                try: probe_kf.unlink()
                except Exception: pass
        except Exception:
            pass

    if kf_img is not None:
        kf_gray = cv2.cvtColor(kf_img, cv2.COLOR_BGR2GRAY)
        mean_brightness = float(np.mean(kf_gray))
        contrast_std = float(np.std(kf_gray))
        kf_hsv = cv2.cvtColor(kf_img, cv2.COLOR_BGR2HSV)
        mean_saturation = float(np.mean(kf_hsv[:, :, 1]))

        if mean_brightness < 85: # 어두운 저조도/야경 씬
            scores["neon-cyberpunk"] += 3.5
            matched_reasons["neon-cyberpunk"].append(f"저조도/야경(명도 {mean_brightness:.0f})")
            scores["bw-sketch"] += 1.5
        elif mean_brightness > 160: # 밝은 하이키 씬
            scores["paper-cutout"] += 2.5
            matched_reasons["paper-cutout"].append(f"화사한 조명(명도 {mean_brightness:.0f})")
            scores["whiteboard-stream"] += 2.0

        if mean_saturation > 88: # 채도가 높고 화려한 팝 컬러
            scores["vintage-comic"] += 3.5
            matched_reasons["vintage-comic"].append(f"선명한 팝 컬러(채도 {mean_saturation:.0f})")
            scores["neon-cyberpunk"] += 1.5
        elif mean_saturation < 42: # 채도가 낮고 차분한 모노톤
            scores["bw-sketch"] += 3.5
            matched_reasons["bw-sketch"].append(f"차분한 모노톤(채도 {mean_saturation:.0f})")
            scores["ink-doodle"] += 2.0
            matched_reasons["ink-doodle"].append(f"은은한 수묵톤(채도 {mean_saturation:.0f})")

        if contrast_std > 52: # 명암 대비가 강한 씬
            scores["manga-screentone"] += 3.0
            matched_reasons["manga-screentone"].append("강렬한 흑백 대비")
            scores["ink-doodle"] += 1.8

    # 최고 득점 스타일 선발
    rec_style = max(scores, key=scores.get)

    STYLE_LABELS = {
        "manga-screentone": "소년점프 망가 스크린톤",
        "vintage-comic": "로이 리히텐슈타인 빈티지 코믹스",
        "neon-cyberpunk": "네온 사이버펑크",
        "whiteboard-stream": "화이트보드 손그림",
        "paper-cutout": "2.5D 입체 종이 컷아웃",
        "bw-sketch": "정통 연필 소묘(bw-sketch)",
        "ink-doodle": "동양 캘리 잉크(ink-doodle)",
    }

    if all(v == 0.0 for v in scores.values()):
        rec_style = "vintage-comic" if mean_saturation >= 50 else "bw-sketch"
        style_reason = f"전역 비주얼 밸런스(명도 {mean_brightness:.0f}, 채도 {mean_saturation:.0f}) ➔ {STYLE_LABELS.get(rec_style, rec_style)} 추천"
    else:
        reasons_list = matched_reasons.get(rec_style, [])
        if reasons_list:
            style_reason = f"{', '.join(reasons_list[:2])} 감지 ➔ {STYLE_LABELS.get(rec_style, rec_style)} 추천"
        else:
            style_reason = f"비주얼 밸런스(명도 {mean_brightness:.0f}, 채도 {mean_saturation:.0f}) ➔ {STYLE_LABELS.get(rec_style, rec_style)} 추천"

    # 임시 키프레임 디렉토리 정리 (스토리지 누수 방지, 비동기 스레드 실행)
    try:
        await asyncio.to_thread(shutil.rmtree, kf_work_dir, ignore_errors=True)
    except Exception:
        pass

    return {
        "golden_timestamp": best_time,
        "punchline_text": punchline_text,
        "detected_reason": detected_reason,
        "highlight_candidates": highlight_candidates,
        "recommended_style": rec_style,
        "style_reason": style_reason,
        "has_speech": transcript.get("has_speech", False),
        "audio_peaks": audio_peaks,
        "scene_cuts": scene_cuts
    }

@router.post("/stock-motion/analyze-highlight")
async def stock_motion_analyze_highlight(req: StockMotionAnalyzeHighlightRequest):
    """
    영상 선택 시 Faster-Whisper와 오디오/비주얼 파이프라인으로
    대사 타이밍, 오디오 피크, 씬 체인지를 분석하여 0.05초 정밀도의 골든 타임스탬프와 최적 스타일을 반환합니다.
    (분석 완료 즉시 골든 피크의 프리뷰 스케치 프레임을 1:1 자동 합성하여 반환)
    """
    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        ffmpeg_exe = shutil.which("ffmpeg") or "ffmpeg"

    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app:
        temp_dir = Path(local_app) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp" / "stock_motion_analysis"
        downloads_dir = Path(local_app) / "ViraLoop Studio" / "media" / "07_Downloads"
    else:
        temp_dir = Path.home() / ".viraloop_studio" / "media" / "02_Operations" / "Temp" / "stock_motion_analysis"
        downloads_dir = Path.home() / ".viraloop_studio" / "media" / "07_Downloads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    downloads_dir.mkdir(parents=True, exist_ok=True)

    # Self-Healing 비디오 소스 확보
    video_path = await _ensure_media_available(req.video_source, downloads_dir, ffmpeg_exe, prefix="stock_analyze")

    try:
        analysis = await _analyze_video_golden_highlight(
            video_path,
            temp_dir,
            preferred_start=req.preferred_window_start,
            preferred_end=req.preferred_window_end
        )

        # [실시간 골든 프리뷰 생성] 분석된 golden_timestamp와 recommended_style로 1:1 대표 스케치 프레임 즉시 렌더링
        golden_ts = analysis.get("golden_timestamp", 1.2)
        rec_style = analysis.get("recommended_style", "vintage-comic")
        uid = uuid.uuid4().hex[:8]
        preview_raw_path = temp_dir / f"raw_preview_{uid}.png"
        preview_sketch_path = temp_dir / f"sketch_preview_{uid}.png"

        cmd_extract = [
            ffmpeg_exe, "-y", "-ss", str(golden_ts), "-i", str(video_path),
            "-vframes", "1", "-q:v", "2", str(preview_raw_path)
        ]
        await asyncio.to_thread(subprocess.run, cmd_extract, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if preview_raw_path.exists():
            await asyncio.to_thread(_generate_artistic_sketch, str(preview_raw_path), str(preview_sketch_path), rec_style, ffmpeg_exe)
            if preview_sketch_path.exists():
                analysis["preview_url"] = f"/files/02_Operations/Temp/stock_motion_analysis/{preview_sketch_path.name}"
                analysis["sketch_frame_path"] = str(preview_sketch_path)

        return {
            "success": True,
            "video_path": video_path,
            **analysis
        }
    except Exception as e:
        print(f"[WARN] Highlight analysis fallback: {e}")
        # 폴백 시에도 기본 프레임 및 스타일 안전하게 반환
        return {
            "success": True,
            "video_path": video_path,
            "golden_timestamp": 2.5,
            "punchline_text": "⚡ 킬러 훅 액션",
            "detected_reason": "안전 폴백 훅",
            "highlight_candidates": [
                {"timestamp": 2.5, "reason": "표준 쇼츠 킬러 훅", "punchline": "⚡ 킬러 훅 액션", "score": 7.0},
                {"timestamp": 4.0, "reason": "클라이맥스 피크", "punchline": "💥 클라이맥스 훅", "score": 6.0},
                {"timestamp": 1.2, "reason": "초반 즉시 몰입", "punchline": "🔥 즉시 몰입 훅", "score": 5.5}
            ],
            "recommended_style": "vintage-comic",
            "style_reason": "표준 바이럴 스타일",
            "has_speech": False,
            "audio_peaks": [],
            "scene_cuts": []
        }

@router.post("/stock-motion/process-frame")
async def stock_motion_process_frame(req: StockMotionProcessFrameRequest):
    """
    원본 영상에서 가변 피크 액션 타임스탬프(timestamp_sec)의 프레임을 추출하고,
    선택된 스타일 프리셋(7대 바이럴 스타일)의 8-프레임 리얼 Line-Boil 시퀀스를 생성합니다.
    (Self-Healing: 유실 미디어 자동 복구 포함)
    """
    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        ffmpeg_exe = shutil.which("ffmpeg") or "ffmpeg"

    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app:
        temp_dir = Path(local_app) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp" / "stock_motion"
        downloads_dir = Path(local_app) / "ViraLoop Studio" / "media" / "07_Downloads"
    else:
        temp_dir = Path.home() / ".viraloop_studio" / "media" / "02_Operations" / "Temp" / "stock_motion"
        downloads_dir = Path.home() / ".viraloop_studio" / "media" / "07_Downloads"
    temp_dir.mkdir(parents=True, exist_ok=True)
    downloads_dir.mkdir(parents=True, exist_ok=True)

    uid = uuid.uuid4().hex[:8]
    raw_frame_path = temp_dir / f"raw_frame_{uid}.png"

    # 1. Resolve & Self-Heal video source
    video_path = await _ensure_media_available(req.video_source, downloads_dir, ffmpeg_exe, prefix="stock")

    # 2. Extract raw frame at dynamic timestamp_sec via asyncio.to_thread
    clamped_timestamp = max(0.1, min(300.0, req.timestamp_sec))
    cmd_raw = [
        ffmpeg_exe, "-y",
        "-ss", str(clamped_timestamp),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        str(raw_frame_path)
    ]
    proc_raw = await asyncio.to_thread(subprocess.run, cmd_raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if not raw_frame_path.exists():
        # Fallback to 0.0s frame
        cmd_fallback = [ffmpeg_exe, "-y", "-ss", "0.0", "-i", video_path, "-vframes", "1", "-q:v", "2", str(raw_frame_path)]
        await asyncio.to_thread(subprocess.run, cmd_fallback, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if not raw_frame_path.exists():
        err_msg = proc_raw.stderr.decode('utf-8', errors='replace') if proc_raw and proc_raw.stderr else "알 수 없는 에러"
        raise HTTPException(status_code=500, detail=f"프레임 추출에 실패했습니다: {err_msg[:200]}")

    # 3. Generate 8-frame Line-Boil sequence with Manga Speedlines
    clamped_frame_count = max(4, min(20, req.frame_count))
    sketch_frames = await asyncio.to_thread(
        _generate_line_boil_sequence,
        str(raw_frame_path),
        temp_dir,
        uid,
        clamped_frame_count,
        req.style_preset,
        req.enable_speedlines,
        ffmpeg_exe
    )

    primary_sketch_path = sketch_frames[0] if sketch_frames else str(raw_frame_path)
    preview_url = f"/files/02_Operations/Temp/stock_motion/{Path(primary_sketch_path).name}"
    preview_urls = [f"/files/02_Operations/Temp/stock_motion/{Path(p).name}" for p in sketch_frames]

    return {
        "success": True,
        "video_path": video_path,
        "raw_frame_path": str(raw_frame_path),
        "sketch_frame_path": str(primary_sketch_path),
        "sketch_frames": [str(p) for p in sketch_frames],
        "preview_url": preview_url,
        "preview_urls": preview_urls,
        "style_preset": req.style_preset,
        "timestamp_sec": clamped_timestamp,
        "enable_speedlines": req.enable_speedlines,
        "frame_count": len(sketch_frames)
    }

@router.post("/stock-motion/render-mp4")
async def stock_motion_render_mp4(req: StockMotionRenderRequest):
    """
    Remotion StockMotionComposition을 통해 액션(timestamp_sec) + 프리즈 + 8-프레임 Line-Boil 플립북 + 집중선 + 타이틀/마커가 합성된
    1080x1920 MP4 완성본을 05_Exports에 렌더링합니다. (풀 쇼츠 이어보기 duration_mode 지원)
    """
    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    if not ffmpeg_exe or not os.path.exists(ffmpeg_exe):
        ffmpeg_exe = shutil.which("ffmpeg") or "ffmpeg"

    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app:
        exports_dir = Path(local_app) / "ViraLoop Studio" / "media" / "05_Exports"
        temp_dir = Path(local_app) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp" / "stock_motion"
        downloads_dir = Path(local_app) / "ViraLoop Studio" / "media" / "07_Downloads"
    else:
        exports_dir = Path.home() / ".viraloop_studio" / "media" / "05_Exports"
        temp_dir = Path.home() / ".viraloop_studio" / "media" / "02_Operations" / "Temp" / "stock_motion"
        downloads_dir = Path.home() / ".viraloop_studio" / "media" / "07_Downloads"

    exports_dir.mkdir(parents=True, exist_ok=True)
    temp_dir.mkdir(parents=True, exist_ok=True)
    downloads_dir.mkdir(parents=True, exist_ok=True)

    job_id = req.job_id or f"stock_motion_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    final_mp4 = exports_dir / f"{job_id}.mp4"

    # 1. Resolve & Self-Heal Video Source
    video_path = await _ensure_media_available(req.video_source, downloads_dir, ffmpeg_exe, prefix="stock")

    # 2. Resolve or generate 8-frame sequence
    sketch_frames = req.sketch_frames
    if not sketch_frames or not all(os.path.exists(p) for p in sketch_frames):
        raw_frame = temp_dir / f"raw_{job_id}.png"
        clamped_ts = max(0.1, min(300.0, req.timestamp_sec))
        cmd_raw = [ffmpeg_exe, "-y", "-ss", str(clamped_ts), "-i", video_path, "-vframes", "1", "-q:v", "2", str(raw_frame)]
        await asyncio.to_thread(subprocess.run, cmd_raw, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        clamped_fc = max(4, min(20, req.frame_count))
        sketch_frames = await asyncio.to_thread(
            _generate_line_boil_sequence,
            str(raw_frame),
            temp_dir,
            job_id,
            clamped_fc,
            req.style_preset,
            req.enable_speedlines,
            ffmpeg_exe
        )

    primary_sketch_path = sketch_frames[0] if sketch_frames else req.sketch_source

    # 3. Calculate exact timing using Pixeling JI algorithm + Full Continuation
    source_action_ms = max(100, round(1000 * req.timestamp_sec))
    hold_ms = max(800, round(1000 * req.hold_seconds))
    frame_ms = 160
    clamped_frame_count = max(4, min(20, len(sketch_frames) if sketch_frames else req.frame_count))
    motion_duration_ms = source_action_ms + hold_ms + frame_ms * clamped_frame_count

    if req.duration_mode == "full-continuation":
        post_cont_ms = max(3000, round(1000 * req.post_continuation_sec))
        total_duration_ms = motion_duration_ms + post_cont_ms
    else:
        total_duration_ms = motion_duration_ms

    duration_frames = int((total_duration_ms / 1000.0) * 30)

    # 4. Prepare Remotion Props
    props_data = {
        "videoSource": os.path.abspath(video_path),
        "sketchImageSource": os.path.abspath(primary_sketch_path) if primary_sketch_path else None,
        "sketchFrames": [os.path.abspath(p) for p in sketch_frames] if sketch_frames else None,
        "title": req.title,
        "customMarker": req.custom_marker,
        "stylePreset": req.style_preset,
        "frameCount": clamped_frame_count,
        "holdSeconds": req.hold_seconds,
        "timestampSec": req.timestamp_sec,
        "durationMode": req.duration_mode,
        "postContinuationSec": req.post_continuation_sec,
        "enableSpeedlines": req.enable_speedlines,
        "includeSfx": req.include_sfx,
        "includeCaption": req.include_caption,
    }

    props_file = temp_dir / f"{job_id}_props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props_data, f, ensure_ascii=False, indent=2)

    # 5. Execute Remotion CLI via asyncio.to_thread
    remotion_dir, cli_path = _resolve_remotion_paths()
    node_exe = shutil.which("node") or "node"

    cmd = [
        node_exe,
        str(cli_path),
        "--composition", "StockMotionComposition",
        "--props", str(props_file),
        "--out", str(final_mp4),
        "--duration", str(duration_frames),
        "--fps", "30",
        "--width", "1080",
        "--height", "1920"
    ]

    print(f"[START] [StockMotion] Executing Remotion Headless: {final_mp4.name} ({duration_frames} frames)...")
    process = await asyncio.to_thread(
        subprocess.run,
        cmd,
        cwd=str(remotion_dir),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    if process.returncode != 0:
        err_msg = process.stderr.decode('utf-8', errors='replace')
        print(f"[FAIL] [StockMotion] Remotion failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"스톡모션 렌더링 실패: {err_msg[:300]}")

    if not final_mp4.exists() or final_mp4.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="스톡모션 MP4 파일 생성 실패 (0 바이트)")

    file_size = final_mp4.stat().st_size
    print(f"[OK] [StockMotion] MP4 Rendering complete: {final_mp4} ({file_size / 1024 / 1024:.2f} MB)")

    # 6. Pixeling Standard Metadata
    style_labels = {
        "bw-sketch": "흑백 스케치",
        "ink-doodle": "잉크 낙서",
        "paper-cutout": "종이 컷아웃",
        "neon-cyberpunk": "네온 사이버펑크",
        "vintage-comic": "빈티지 코믹스",
        "manga-screentone": "망가 스크린톤",
    }
    style_label = style_labels.get(req.style_preset, "스톡모션")
    summary_script = f"스톡모션 {style_label} 프리즈 씬. {clamped_frame_count}프레임 리얼 Line-Boil 플립북과 방사형 집중선, 시네마틱 4단 사운드가 결합된 키네틱 쇼츠."
    pixeling_meta = _generate_smart_viral_meta(req.title, summary_script, req.archetype)

    subtitles = [
        {"startMs": 0, "endMs": source_action_ms, "text": req.title},
        {"startMs": source_action_ms, "endMs": source_action_ms + hold_ms, "text": req.custom_marker or f"{style_label} 프리즈"},
        {"startMs": source_action_ms + hold_ms, "endMs": motion_duration_ms, "text": "스톡모션 변환"}
    ]
    if req.duration_mode == "full-continuation":
        subtitles.append({"startMs": motion_duration_ms, "endMs": total_duration_ms, "text": "풀 쇼츠 이어보기"})

    stream_url = f"/files/05_Exports/{final_mp4.name}"

    return {
        "success": True,
        "job_id": job_id,
        "video_path": str(final_mp4),
        "stream_url": stream_url,
        "filename": final_mp4.name,
        "file_size_bytes": file_size,
        "duration_seconds": total_duration_ms / 1000.0,
        "subtitles": subtitles,
        "pixeling_meta": pixeling_meta,
        "sketch_frames": [str(p) for p in sketch_frames],
        "message": f"성공적으로 스톡모션 1080x1920 MP4 실물 렌더링이 완료되었습니다. ({req.duration_mode}, {total_duration_ms/1000.0:.1f}초)"
    }


# === SRT 기반 화이트보드 손그림 애니메이션(Whiteboard Animation) 엔드포인트 ===

class WhiteboardProcessSceneRequest(BaseModel):
    video_source: str
    timestamp_sec: float = 0.9
    subtitles: Optional[List[Dict[str, Any]]] = None
    paper_color_hex: str = "#F5EBD7"
    aspect_ratio: str = "9:16"

class WhiteboardRenderRequest(BaseModel):
    job_id: Optional[str] = None
    title: str = "화이트보드 손그림 애니메이션"
    source_image: str
    elements: Optional[List[Dict[str, Any]]] = None
    subtitles: Optional[List[Dict[str, Any]]] = None
    paper_color_hex: str = "#F5EBD7"
    aspect_ratio: str = "9:16"
    enable_stylus: bool = True
    include_sfx: bool = True
    archetype: str = "classic"

@router.post("/whiteboard/process-scene")
async def whiteboard_process_scene(req: WhiteboardProcessSceneRequest):
    """
    영상 또는 정적 이미지와 자막을 입력받아 화이트보드 씬의 시맨틱 영역 분할(Semantic Auto-Segmentation) 및
    프리뷰 이미지를 생성합니다. (Self-Healing 자가치유 다운로드 및 한글 경로 안전 입출력 적용)
    """
    from ..services.video.whiteboard_engine import WhiteboardAnimationEngine

    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path() or shutil.which("ffmpeg") or "ffmpeg"
    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    if local_app:
        temp_dir = Path(local_app) / "ViraLoop Studio" / "media" / "02_Operations" / "Temp" / "whiteboard"
        downloads_dir = Path(local_app) / "ViraLoop Studio" / "media" / "07_Downloads"
    else:
        temp_dir = Path.home() / ".viraloop_studio" / "media" / "02_Operations" / "Temp" / "whiteboard"
        downloads_dir = Path.home() / ".viraloop_studio" / "media" / "07_Downloads"

    temp_dir.mkdir(parents=True, exist_ok=True)
    downloads_dir.mkdir(parents=True, exist_ok=True)

    uid = f"wb_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    raw_frame_path = temp_dir / f"{uid}_base.png"

    # 1. Resolve & Self-Heal Media
    video_path = await _ensure_media_available(req.video_source, downloads_dir, ffmpeg_exe, prefix="wb")

    is_image = video_path.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
    if is_image:
        loaded_img = _safe_cv2_imread(video_path)
        if loaded_img is not None:
            _safe_cv2_imwrite(str(raw_frame_path), loaded_img)
        else:
            import shutil as fs_shutil
            fs_shutil.copyfile(video_path, str(raw_frame_path))
    else:
        # 영상에서 피크 프레임 추출
        cmd = [
            ffmpeg_exe, "-y",
            "-ss", str(max(0.1, req.timestamp_sec)),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            str(raw_frame_path)
        ]
        await asyncio.to_thread(subprocess.run, cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        if not raw_frame_path.exists():
            # Fallback 0.0s
            cmd_fb = [ffmpeg_exe, "-y", "-ss", "0.0", "-i", video_path, "-vframes", "1", "-q:v", "2", str(raw_frame_path)]
            await asyncio.to_thread(subprocess.run, cmd_fb, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if not raw_frame_path.exists():
        raise HTTPException(status_code=500, detail="화이트보드 베이스 프레임 추출에 실패했습니다.")

    # 2. 이미지 읽기 및 자동 시맨틱 분할 (한글 경로 100% 안전 읽기)
    img_bgr = _safe_cv2_imread(str(raw_frame_path))
    if img_bgr is None:
        raise HTTPException(status_code=500, detail="베이스 프레임 이미지 로딩 실패 (손상되었거나 읽을 수 없는 포맷)")

    engine = WhiteboardAnimationEngine(paper_color_hex=req.paper_color_hex)
    elements = engine.auto_segment_image(
        img_bgr,
        subtitles=req.subtitles or [],
        aspect_ratio=req.aspect_ratio
    )

    preview_url = f"/files/02_Operations/Temp/whiteboard/{raw_frame_path.name}"

    return {
        "success": True,
        "base_image_path": str(raw_frame_path),
        "video_path": video_path,
        "preview_url": preview_url,
        "elements": elements,
        "paper_color_hex": req.paper_color_hex,
        "aspect_ratio": req.aspect_ratio
    }

@router.post("/whiteboard/render-mp4")
async def whiteboard_render_mp4(req: WhiteboardRenderRequest):
    """
    WhiteboardAnimationEngine을 통해 스트림 손그림(ink -> color) + 펜촉 트래킹 + 마커 ASMR이 결합된
    1080x1920 또는 1920x1080 실물 MP4를 05_Exports에 렌더링합니다.
    """
    from ..services.video.whiteboard_engine import WhiteboardAnimationEngine

    local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
    exports_dir = Path(local_app) / "ViraLoop Studio" / "media" / "05_Exports" if local_app else Path.home() / ".viraloop_studio" / "media" / "05_Exports"
    exports_dir.mkdir(parents=True, exist_ok=True)

    job_id = req.job_id or f"whiteboard_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    final_mp4 = exports_dir / f"{job_id}.mp4"

    # 이미지 소스 확인 (한글 경로 안전 읽기)
    source_path = _resolve_local_media_path(req.source_image) or req.source_image
    img_bgr = _safe_cv2_imread(source_path)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail=f"원본 이미지를 읽을 수 없습니다: {source_path}")

    target_size = (1080, 1920) if req.aspect_ratio == "9:16" else (1920, 1080)
    engine = WhiteboardAnimationEngine(paper_color_hex=req.paper_color_hex)

    # elements가 없으면 자동 분할
    elements = req.elements
    if not elements:
        elements = engine.auto_segment_image(img_bgr, req.subtitles or [], req.aspect_ratio)

    rendered_path = await asyncio.to_thread(
        engine.render_whiteboard_video,
        source_image_bgr=img_bgr,
        elements=elements,
        output_mp4_path=str(final_mp4),
        fps=30,
        enable_stylus=req.enable_stylus,
        target_size=target_size
    )

    if not os.path.exists(rendered_path) or os.path.getsize(rendered_path) == 0:
        raise HTTPException(status_code=500, detail="화이트보드 MP4 렌더링 실패")

    file_size = os.path.getsize(rendered_path)
    stream_url = f"/files/05_Exports/{Path(rendered_path).name}"

    # 메타데이터 생성
    summary_script = f"화이트보드 손그림 설명 애니메이션. 웜톤 종이 질감과 펜선 스트림 드로잉, 채색 및 펜촉 트래킹이 적용된 영상."
    pixeling_meta = _generate_smart_viral_meta(req.title, summary_script, req.archetype)

    return {
        "success": True,
        "job_id": job_id,
        "video_path": rendered_path,
        "stream_url": stream_url,
        "filename": Path(rendered_path).name,
        "file_size_bytes": file_size,
        "elements": elements,
        "pixeling_meta": pixeling_meta,
        "message": "성공적으로 화이트보드 손그림 MP4 실물 렌더링이 완료되었습니다."
    }

