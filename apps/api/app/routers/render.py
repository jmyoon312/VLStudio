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
    
    remotion_dir = Path("apps/remotion-engine").resolve()
    cli_path = remotion_dir / "render_cli.js"

    cmd = [
        "node",
        str(cli_path),
        "--composition", "ViraShortComposition",
        "--props", str(props_file),
        "--output", str(final_mp4),
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
    style_preset: str = "bw-sketch" # "bw-sketch" | "ink-doodle" | "paper-cutout"

class StockMotionRenderRequest(BaseModel):
    job_id: Optional[str] = None
    title: str = "역대급 스톡모션 반전 씬"
    video_source: str
    sketch_source: Optional[str] = None
    style_preset: str = "bw-sketch"
    frame_count: int = 8
    hold_seconds: float = 1.6
    include_sfx: bool = True
    include_caption: bool = True
    archetype: str = "classic"

@router.post("/stock-motion/process-frame")
async def stock_motion_process_frame(req: StockMotionProcessFrameRequest):
    """
    원본 영상에서 900ms 피크 액션 프레임을 추출하고, 선택된 스타일 프리셋(bw-sketch, ink-doodle, paper-cutout)의
    흑백 스케치 필터를 적용하여 PNG 이미지를 생성합니다.
    """
    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
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
    sketch_frame_path = temp_dir / f"sketch_frame_{uid}.png"

    # 1. Resolve video source (if URL or local path)
    video_path = req.video_source
    if video_path.startswith("http://") or video_path.startswith("https://"):
        import yt_dlp
        download_target = downloads_dir / f"stock_dl_{uid}.mp4"
        ydl_opts = {
            'outtmpl': str(download_target),
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([video_path])
        video_path = str(download_target)

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"원본 영상 파일을 찾을 수 없습니다: {video_path}")

    # 2. Extract raw frame at timestamp_sec
    cmd_raw = [
        ffmpeg_exe, "-y",
        "-ss", str(req.timestamp_sec),
        "-i", video_path,
        "-vframes", "1",
        "-q:v", "2",
        str(raw_frame_path)
    ]
    proc_raw = await asyncio.create_subprocess_exec(*cmd_raw, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc_raw.communicate()

    if not raw_frame_path.exists():
        raise HTTPException(status_code=500, detail="프레임 추출에 실패했습니다.")

    # 3. Apply artistic filter according to style_preset
    filter_expr = "format=gray,edgedetect=low=0.1:high=0.4,negate"
    if req.style_preset == "ink-doodle":
        filter_expr = "format=gray,curves=strong_contrast,edgedetect=low=0.15:high=0.5,negate"
    elif req.style_preset == "paper-cutout":
        filter_expr = "format=gray,posterize=level=4,edgedetect=low=0.2:high=0.6,negate"

    cmd_sketch = [
        ffmpeg_exe, "-y",
        "-i", str(raw_frame_path),
        "-vf", filter_expr,
        "-q:v", "2",
        str(sketch_frame_path)
    ]
    proc_sketch = await asyncio.create_subprocess_exec(*cmd_sketch, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    await proc_sketch.communicate()

    if not sketch_frame_path.exists():
        sketch_frame_path = raw_frame_path

    preview_url = f"/files/02_Operations/Temp/stock_motion/{sketch_frame_path.name}"
    return {
        "success": True,
        "video_path": video_path,
        "raw_frame_path": str(raw_frame_path),
        "sketch_frame_path": str(sketch_frame_path),
        "preview_url": preview_url,
        "style_preset": req.style_preset
    }

@router.post("/stock-motion/render-mp4")
async def stock_motion_render_mp4(req: StockMotionRenderRequest):
    """
    Remotion StockMotionComposition을 통해 0~900ms 액션 + 프리즈 + 8프레임 지터 + 타이틀/마커가 합성된
    1080x1920 MP4 완성본을 05_Exports에 렌더링합니다.
    """
    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
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

    # 1. Resolve Video Source (URL download or local path)
    video_path = req.video_source
    if video_path.startswith("http://") or video_path.startswith("https://"):
        import yt_dlp
        download_target = downloads_dir / f"stock_dl_{job_id}.mp4"
        if not download_target.exists():
            ydl_opts = {
                'outtmpl': str(download_target),
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                'quiet': True,
                'no_warnings': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([video_path])
        video_path = str(download_target)

    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail=f"원본 영상 파일을 찾을 수 없습니다: {video_path}")

    # 2. Resolve or generate sketch image
    sketch_path = req.sketch_source
    if not sketch_path or not os.path.exists(sketch_path):
        raw_frame = temp_dir / f"raw_{job_id}.png"
        sketch_frame = temp_dir / f"sketch_{job_id}.png"
        cmd_raw = [ffmpeg_exe, "-y", "-ss", "0.9", "-i", video_path, "-vframes", "1", "-q:v", "2", str(raw_frame)]
        proc_raw = await asyncio.create_subprocess_exec(*cmd_raw, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await proc_raw.communicate()

        filter_expr = "format=gray,edgedetect=low=0.1:high=0.4,negate"
        if req.style_preset == "ink-doodle":
            filter_expr = "format=gray,curves=strong_contrast,edgedetect=low=0.15:high=0.5,negate"
        elif req.style_preset == "paper-cutout":
            filter_expr = "format=gray,posterize=level=4,edgedetect=low=0.2:high=0.6,negate"

        cmd_sketch = [ffmpeg_exe, "-y", "-i", str(raw_frame), "-vf", filter_expr, "-q:v", "2", str(sketch_frame)]
        proc_sketch = await asyncio.create_subprocess_exec(*cmd_sketch, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
        await proc_sketch.communicate()

        sketch_path = str(sketch_frame if sketch_frame.exists() else raw_frame)

    # 3. Calculate exact timing using Pixeling JI algorithm
    source_action_ms = 900
    hold_ms = max(800, round(1000 * req.hold_seconds))
    frame_ms = 160
    clamped_frame_count = max(4, min(20, req.frame_count))
    total_duration_ms = source_action_ms + hold_ms + frame_ms * clamped_frame_count
    duration_frames = int((total_duration_ms / 1000.0) * 30)

    # 4. Prepare Remotion Props
    props_data = {
        "videoSource": os.path.abspath(video_path),
        "sketchImageSource": os.path.abspath(sketch_path) if sketch_path else None,
        "title": req.title,
        "stylePreset": req.style_preset,
        "frameCount": clamped_frame_count,
        "holdSeconds": req.hold_seconds,
        "includeSfx": req.include_sfx,
        "includeCaption": req.include_caption,
    }

    props_file = temp_dir / f"{job_id}_props.json"
    with open(props_file, "w", encoding="utf-8") as f:
        json.dump(props_data, f, ensure_ascii=False, indent=2)

    # 5. Execute Remotion CLI
    remotion_dir = Path("apps/remotion-engine").resolve()
    cli_path = remotion_dir / "render_cli.js"

    cmd = [
        "node",
        str(cli_path),
        "--composition", "StockMotionComposition",
        "--props", str(props_file),
        "--out", str(final_mp4),
        "--duration", str(duration_frames),
        "--fps", "30",
        "--width", "1080",
        "--height", "1920"
    ]

    print(f"🚀 [StockMotion] Executing Remotion Headless: {final_mp4.name} ({duration_frames} frames)...")
    process = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(remotion_dir),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        err_msg = stderr.decode('utf-8', errors='replace')
        print(f"❌ [StockMotion] Remotion failed: {err_msg}")
        raise HTTPException(status_code=500, detail=f"스톡모션 렌더링 실패: {err_msg[:300]}")

    if not final_mp4.exists() or final_mp4.stat().st_size == 0:
        raise HTTPException(status_code=500, detail="스톡모션 MP4 파일 생성 실패 (0 바이트)")

    file_size = final_mp4.stat().st_size
    print(f"✅ [StockMotion] MP4 Rendering complete: {final_mp4} ({file_size / 1024 / 1024:.2f} MB)")

    # 6. Pixeling Standard Metadata
    style_label = "흑백 스케치" if req.style_preset == "bw-sketch" else "잉크 낙서" if req.style_preset == "ink-doodle" else "종이 컷아웃"
    summary_script = f"스톡모션 {style_label} 프리즈 씬. {clamped_frame_count}프레임 지터 모션과 팝 사운드가 결합된 키네틱 쇼츠."
    pixeling_meta = _generate_smart_viral_meta(req.title, summary_script, req.archetype)

    subtitles = [
        {"startMs": 0, "endMs": 900, "text": req.title},
        {"startMs": 900, "endMs": 900 + hold_ms, "text": f"{style_label} 프리즈"},
        {"startMs": 900 + hold_ms, "endMs": total_duration_ms, "text": "스톡모션 변환"}
    ]

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
        "message": "성공적으로 스톡모션 1080x1920 MP4 실물 렌더링이 완료되었습니다."
    }
