from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import subprocess
import os
import uuid
import re
from pathlib import Path
from datetime import datetime
import json
import shutil
import urllib.parse
from .. import dependency_manager

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

@router.post("/short-batch")
async def render_short_batch_job(req: ShortBatchRenderRequest):
    """
    [ 주권 자율 팩토리 100% 실체화 ]
    Supertonic 로컬 음성 합성 -> BGM 오토덕킹 -> Remotion 1080x1920 MP4 프레임 렌더링 -> 픽셀링 표준 메타 생성
    """
    import scipy.io.wavfile
    import numpy as np
    from pydub import AudioSegment
    from app.services.remotion_renderer import remotion_renderer
    from app.config import settings as settings_conf

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

    # 2. Extract Sentences
    sentences = []
    if req.scenes and len(req.scenes) > 0:
        for sc in req.scenes:
            t = sc.get("text") or sc.get("narrative") or ""
            if t.strip():
                sentences.append(t.strip())
    
    if not sentences:
        raw_text = req.script if (req.script and len(req.script.strip()) > 0) else req.title
        # Split on sentence boundaries
        splits = re.split(r'[\n.?!]+', raw_text)
        sentences = [s.strip() for s in splits if s.strip()]
        if not sentences:
            sentences = [req.title]

    # Limit to reasonable short duration (4~8 punchy sentences)
    sentences = sentences[:8]

    # 3. Supertonic TTS Audio Synthesis
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

    subtitles_data = []
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
            # Fallback silence or tone to ensure 100% non-blocking pipeline
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

    narration_wav = temp_dir / f"{job_id}_narration.wav"
    full_voice.export(str(narration_wav), format="wav")
    total_audio_sec = max(len(full_voice) / 1000.0, 5.0)

    # 4. BGM Auto-Ducking Mixing
    bgm_path = _resolve_bgm_track_path(req.bgm_filename)
    mixed_audio_wav = temp_dir / f"{job_id}_final_audio.wav"

    if bgm_path and os.path.exists(bgm_path):
        try:
            bgm_raw = AudioSegment.from_file(bgm_path)
            target_ms = len(full_voice) + 600
            loop_factor = (target_ms // len(bgm_raw)) + 1
            bgm_looped = (bgm_raw * loop_factor)[:target_ms]
            
            # Apply volume & auto-ducking (-12dB)
            user_gain = (req.bgm_volume - 0.5) * 20.0
            ducking_gain = -12.0 if req.auto_ducking else 0.0
            bgm_ducked = bgm_looped + user_gain + ducking_gain
            
            mixed = full_voice.overlay(bgm_ducked)
            mixed.export(str(mixed_audio_wav), format="wav")
        except Exception as mix_err:
            print(f"[RenderBatch] BGM mixing error, using pure narration: {mix_err}")
            full_voice.export(str(mixed_audio_wav), format="wav")
    else:
        full_voice.export(str(mixed_audio_wav), format="wav")

    # 5. Visual Lego Props for ViraShortComposition
    preset_style = "humor" if req.archetype == "ssul" else "knowledge" if req.archetype == "gunlimbo" else "drama" if req.archetype == "instagram" else "shorts"
    badge_label = "썰" if req.archetype == "ssul" else "속보" if req.archetype == "gunlimbo" else "릴스" if req.archetype == "instagram" else "쇼츠"

    # Split title into 2 clean lines
    t_words = req.title.split()
    mid = len(t_words) // 2 or 1
    line1 = " ".join(t_words[:mid]) if len(t_words) > 1 else req.title
    line2 = " ".join(t_words[mid:]) if len(t_words) > 1 else ""

    props_data = {
        "titleLine1": line1,
        "titleLine2": line2 or req.title,
        "titleBadgeText": badge_label,
        "hasTopHeader": True,
        "hasBottomCredit": True,
        "bottomCreditText": "출처: ViraLoop Sovereign Factory",
        "subtitles": subtitles_data,
        "stylePreset": preset_style,
        "muteOriginalVideo": True,
        "jabOverlay": {
            "text": f"*{line1[:10]}*",
            "startMs": 1200,
            "endMs": min(cursor_ms, 6500),
            "placement": "top-third"
        }
    }

    if req.video_source and os.path.exists(req.video_source):
        props_data["videoSource"] = os.path.abspath(req.video_source)
    elif req.image_source and os.path.exists(req.image_source):
        props_data["imageSource"] = os.path.abspath(req.image_source)

    props_data["finalMixedAudio"] = str(mixed_audio_wav)

    props_file = temp_dir / f"{job_id}_props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props_data, f, ensure_ascii=False, indent=2)

    # 6. Execute Remotion Headless Direct Rendering
    fps = 30
    duration_frames = int(max(total_audio_sec, 6.0) * fps)
    
    remotion_dir = Path("apps/remotion-engine").resolve()
    cli_path = remotion_dir / "render_cli.js"

    cmd = [
        "node",
        str(cli_path),
        "--composition", "ViraShortComposition",
        "--props", str(props_file),
        "--out", str(final_mp4),
        "--duration", str(duration_frames),
        "--fps", str(fps),
        "--width", "1080",
        "--height", "1920"
    ]

    print(f"🚀 [RenderBatch] Executing Remotion Headless: {final_mp4.name} ({duration_frames} frames)...")
    process = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(remotion_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        err_msg = stderr.decode('utf-8', errors='replace')
        print(f"❌ [RenderBatch] Remotion failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"MP4 렌더링 실패: {err_msg[:300]}")

    if not final_mp4.exists() or final_mp4.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="렌더링 파일 생성 실패 (0 바이트)")

    file_size = final_mp4.stat().st_size
    print(f"✅ [RenderBatch] MP4 Rendering complete: {final_mp4} ({file_size / 1024 / 1024:.2f} MB)")

    # 7. Generate AI Viral Metadata in Pixeling Standard Format
    full_script = " ".join(sentences)
    pixeling_meta = _generate_smart_viral_meta(req.title, full_script, req.archetype)

    # Clean stream URL
    stream_url = f"/files/05_Exports/{final_mp4.name}"

    return {
        "success": True,
        "job_id": job_id,
        "video_path": str(final_mp4),
        "stream_url": stream_url,
        "filename": final_mp4.name,
        "file_size_bytes": file_size,
        "duration_seconds": total_audio_sec,
        "subtitles": subtitles_data,
        "pixeling_meta": pixeling_meta,
        "message": "성공적으로 1080x1920 MP4 실물 렌더링 및 픽셀링 메타데이터가 완성되었습니다."
    }

