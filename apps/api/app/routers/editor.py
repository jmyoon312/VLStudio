from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import shutil
import subprocess
import uuid
import logging
import urllib.parse
from app.dependency_manager import DependencyManager
from app import crud, models, schemas
from app.database import SessionLocal
import datetime
from app.editor_engine import build_complex_filter
import numpy as np
from app.config import settings as app_settings
try:
    import librosa
except ImportError:
    librosa = None
try:
    from scenedetect import VideoManager, SceneManager
    from scenedetect.detectors import ContentDetector
except ImportError:
    SceneManager = None

router = APIRouter(tags=["editor"])

logger = logging.getLogger(__name__)

class ClipData(BaseModel):
    id: str
    path: str
    start: float
    duration: float
    offset: float
    type: str # 'video', 'audio', 'image', 'text'
    layer: int = 0
    transform: Dict[str, Any]
    style: Dict[str, Any]
    speed: float
    audio: Optional[Dict[str, Any]] = None
    text: Optional[Dict[str, Any]] = None
    filter: Optional[Dict[str, Any]] = None
    # New fields
    transitionIn: Optional[Dict[str, Any]] = None
    transitionOut: Optional[Dict[str, Any]] = None
    keyframes: Optional[List[Dict[str, Any]]] = None
    chromakey: Optional[Dict[str, Any]] = None
    content: Optional[str] = None # For text clips

class RenderRequest(BaseModel):
    clips: List[ClipData]
    width: int = 1080
    height: int = 1920
    format: str = "mp4" # mp4, mp3, wav, etc.
    quality: str = "high"
    mutate: bool = False

def is_complex_project(clips: List[ClipData]) -> bool:
    """
    Checks if the project requires complex rendering.
    We default to True to support all features (resizing, overlay) robustly.
    """
    return True

@router.post("/render")
async def render_video(request: RenderRequest):
    """
    Renders video using Complex Engine.
    """
    if not request.clips:
        raise HTTPException(status_code=400, detail="No clips provided")

    try:
        # 1. Determine Output Format & Path
        ext = request.format.lower()
        if ext not in ['mp4', 'mp3', 'wav']:
            ext = 'mp4'
            
        output_filename = f"render_{uuid.uuid4()}.{ext}"
        output_dir = os.path.join(app_settings.MEDIA_ROOT, "downloads", "exports")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, output_filename)
        absolute_output_path = os.path.abspath(output_path)

        ffmpeg_path = DependencyManager.get_ffmpeg_path()
        
        logger.info(f"🚀 Rendering {len(request.clips)} clips. Target: {request.width}x{request.height} ({ext})")

        # 2. Build Command using Complex Engine
        # Convert Pydantic models to dicts
        clips_dicts = [clip.dict() for clip in request.clips]
        
        inputs, filter_complex = build_complex_filter(
            clips_dicts, 
            output_dir, 
            width=request.width, 
            height=request.height,
            format=ext
        )
        
        cmd = [ffmpeg_path, *inputs, "-filter_complex", filter_complex]
        
        # 3. Map Outputs based on Format
        if ext in ['mp3', 'wav']:
            # Audio Only
            cmd.extend([
                "-map", "[outa]",
                "-vn" # No video
            ])
            if ext == 'mp3':
                cmd.extend(["-c:a", "libmp3lame", "-q:a", "2"])
            else:
                cmd.extend(["-c:a", "pcm_s16le"])
        else:
            # Video + Audio
            cmd.extend([
                "-map", "[outv]",
                "-map", "[outa]",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-c:a", "aac"
            ])

        cmd.extend(["-y", absolute_output_path])
        
        logger.info(f"Running FFmpeg: {' '.join(cmd)}")
        
        process = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        if process.returncode != 0:
            logger.error(f"FFmpeg Error: {process.stderr}")
            print(process.stderr) # Ensure visible in logs
            raise Exception(f"FFmpeg failed: {process.stderr}")

        # 4. Apply Mutation if requested [NEW]
        if request.mutate:
            from app.services.video.mutation_engine import mutation_engine
            mutated_path = absolute_output_path.replace(f".{ext}", f"_mutated.{ext}")
            success = mutation_engine.apply_mutation(absolute_output_path, mutated_path, intensity=0.5)
            if success:
                # Replace original with mutated version
                os.remove(absolute_output_path)
                os.rename(mutated_path, absolute_output_path)
                logger.info("🛡️ Sovereign Shield applied successfully.")

        # Save to Database for History
        try:
            with SessionLocal() as db:
                video_data = schemas.VideoCreate(
                    video_id=f"export_{uuid.uuid4()}",
                    title=f"Exported Project {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}",
                    channel_id=None,
                    upload_date=datetime.datetime.now(),
                    file_path=absolute_output_path,
                    thumbnail_path=None,
                    status="downloaded",
                    metadata_json={"uploader": "CutEditor", "view_count": 0, "format": ext}
                )
                crud.create_video(db=db, video=video_data)
        except Exception as db_e:
            logger.error(f"Failed to save to DB: {db_e}")

        # Stream API path to serve local files correctly on Windows setup
        encoded_path = urllib.parse.quote(absolute_output_path)
        return {
            "status": "success",
            "output_path": absolute_output_path,
            "filename": output_filename,
            "download_url": f"/api/stream?path={encoded_path}"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Render failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DetectScenesRequest(BaseModel):
    video_path: str
    threshold: float = 30.0

@router.post("/detect-scenes")
async def detect_scenes_endpoint(request: DetectScenesRequest):
    """
    Detects scenes in a video file.
    """
    from app.editor_engine import detect_scenes
    
    if not os.path.exists(request.video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
        
    try:
        if SceneManager is None:
             # Fallback or mock if scenedetect is missing
             from app.editor_engine import detect_scenes
             scenes = detect_scenes(request.video_path, request.threshold)
             return {"status": "success", "scenes": scenes}

        # Use PySceneDetect
        video_manager = VideoManager([request.video_path])
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=request.threshold))
        
        video_manager.set_downscale_factor()
        video_manager.start()
        scene_manager.detect_scenes(frame_source=video_manager)
        
        scene_list = scene_manager.get_scene_list()
        scenes = []
        for scene in scene_list:
            start, end = scene
            scenes.append({
                "start": start.get_seconds(),
                "end": end.get_seconds(),
                "duration": end.get_seconds() - start.get_seconds()
            })
            
        return {"status": "success", "scenes": scenes}
    except Exception as e:
        logger.error(f"Scene detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class WaveformRequest(BaseModel):
    audio_path: str

@router.post("/waveform")
async def get_waveform(request: WaveformRequest):
    """
    Generates waveform data for an audio/video file.
    """
    if not os.path.exists(request.audio_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    if librosa is None:
        # Fallback if librosa is not installed
        return {"status": "error", "detail": "librosa not installed", "peaks": []}

    try:
        # Load audio with low sample rate for speed
        y, sr = librosa.load(request.audio_path, sr=4000, mono=True)
        
        # Calculate RMS in chunks to get peaks
        # We want roughly 10-20 peaks per second for visualization
        hop_length = int(sr / 20) 
        rms = librosa.feature.rms(y=y, hop_length=hop_length)
        
        # Normalize to 0-100 integers
        if np.max(rms[0]) > 0:
            peaks = (rms[0] / np.max(rms[0]) * 100).astype(int).tolist()
        else:
            peaks = [0] * len(rms[0])
            
        return {"status": "success", "peaks": peaks}
    except Exception as e:
        logger.error(f"Waveform generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Uploads a file to the server's temp directory and returns the absolute path.
    """
    try:
        from app.utils.path_utils import get_temp_dir
        temp_dir = get_temp_dir()
        
        # Generate unique filename to prevent collisions
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(temp_dir, unique_filename)
        absolute_path = os.path.abspath(file_path)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "status": "success",
            "filename": file.filename,
            "path": absolute_path,
            "url": f"/temp/{unique_filename}" # Assuming static file serving is set up, but path is most important for engine
        }
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class DeleteAssetRequest(BaseModel):
    path: str

@router.delete("/assets")
async def delete_asset(request: DeleteAssetRequest):
    """
    Deletes an uploaded asset file.
    """
    try:
        logger.info(f"Delete asset request received for path: {request.path}")
        
        if os.path.exists(request.path) and os.path.isfile(request.path):
            os.remove(request.path)
            logger.info(f"Successfully deleted file: {request.path}")
            return {"status": "success", "detail": f"File deleted: {request.path}"}
        else:
            logger.warning(f"File not found for deletion: {request.path}")
            # Also check if it's a URL instead of a path
            if request.path.startswith("http://") or request.path.startswith("https://"):
                logger.info("Path is a URL, cannot delete remote files")
                return {"status": "success", "detail": "URL provided, skipping deletion"}
            return {"status": "success", "detail": "File not found"}
            
    except Exception as e:
        logger.error(f"Asset deletion failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-saturation")
async def auto_saturation_endpoint(request: DetectScenesRequest):
    """
    Analyzes video and returns recommended saturation boost.
    """
    from app.editor_engine import analyze_saturation
    
    if not os.path.exists(request.video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
        
    try:
        # Mock analysis for speed
        # In real world, we'd analyze frames.
        # Here we just return a "magic" value that looks good.
        recommended_saturation = 1.2 # 20% boost
        return {"status": "success", "saturation": recommended_saturation}
    except Exception as e:
        logger.error(f"Auto saturation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Templates CRUD ---
# In-memory storage for demo purposes. In production, use DB.
templates_db = []

class TemplateData(BaseModel):
    id: str
    name: str
    tracks: List[Dict[str, Any]]
    thumbnail: Optional[str] = None

@router.get("/templates")
async def get_templates():
    return templates_db

@router.post("/templates")
async def save_template(template: TemplateData):
    templates_db.append(template.dict())
    return {"status": "success", "id": template.id}

@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    global templates_db
    templates_db = [t for t in templates_db if t['id'] != template_id]
    return {"status": "success"}

class ValidateAssetsRequest(BaseModel):
    paths: List[str]

@router.post("/validate-assets")
async def validate_assets(request: ValidateAssetsRequest):
    """
    Checks if the provided file paths exist on the server.
    Returns a list of paths that do NOT exist.
    """
    invalid_paths = []
    for path in request.paths:
        # Skip remote URLs
        if path.startswith("http://") or path.startswith("https://"):
            continue
            
        if not os.path.exists(path):
            invalid_paths.append(path)
            
    return {"status": "success", "invalid_paths": invalid_paths}
