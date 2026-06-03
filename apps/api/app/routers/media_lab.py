from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from .. import database, crud
from ..dubbing_engine import DubbingEngine
from ..video_engine import VideoGenClient
from ..config import settings
import os
import shutil
import uuid

router = APIRouter(tags=["media_lab"])

def save_upload(file: UploadFile) -> str:
    temp_dir = settings.TEMP_DIR
    os.makedirs(temp_dir, exist_ok=True)
    filename = f"upload_{uuid.uuid4().hex}_{file.filename}"
    path = os.path.join(temp_dir, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return path

@router.post("/dubbing")
async def dub_video(
    file: UploadFile = File(...),
    target_lang: str = Form("en"),
    voice_id: str = Form(None),
    db: Session = Depends(database.get_db)
):
    settings = crud.get_settings(db)
    engine = DubbingEngine(settings)
    
    try:
        input_path = save_upload(file)
        output_path = await engine.dub_video(input_path, target_lang, voice_id)
        
        filename = os.path.basename(output_path)
        return {
            "status": "success",
            "url": f"http://127.0.0.1:8000/temp/{filename}",
            "path": output_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upscale")
async def upscale_video(
    file: UploadFile = File(...),
    scale: int = Form(2),
    db: Session = Depends(database.get_db)
):
    settings = crud.get_settings(db)
    client = VideoGenClient(settings)
    
    try:
        input_path = save_upload(file)
        # This is blocking/long-running. In prod, use background task.
        output_path = client.upscale_video(input_path, scale)
        
        filename = os.path.basename(output_path)
        return {
            "status": "success",
            "url": f"http://127.0.0.1:8000/temp/{filename}",
            "path": output_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/interpolate")
async def interpolate_video(
    file: UploadFile = File(...),
    fps: int = Form(60),
    db: Session = Depends(database.get_db)
):
    settings = crud.get_settings(db)
    client = VideoGenClient(settings)
    
    try:
        input_path = save_upload(file)
        output_path = client.smooth_motion(input_path, fps)
        
        filename = os.path.basename(output_path)
        return {
            "status": "success",
            "url": f"http://127.0.0.1:8000/temp/{filename}",
            "path": output_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mutate")
async def mutate_video(
    file: UploadFile = File(...),
    intensity: float = Form(0.5),
    channel_id: str = Form("default_channel"),
    db: Session = Depends(database.get_db)
):
    try:
        from app.services.video.mutation_engine import mutation_engine
        
        input_path = save_upload(file)
        
        # Save to the common Exports directory (05_Exports)
        settings_db = crud.get_settings(db)
        if settings_db and settings_db.root_download_path:
            exports_dir = os.path.join(settings_db.root_download_path, "05_Exports")
        else:
            exports_dir = settings.EXPORTS_DIR
            
        os.makedirs(exports_dir, exist_ok=True)
        filename = f"mutated_{uuid.uuid4().hex[:8]}_{file.filename}"
        output_path = os.path.join(exports_dir, filename)
        
        success = mutation_engine.apply_mutation(
            input_path=input_path,
            output_path=output_path,
            channel_id=channel_id,
            intensity=intensity
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Video mutation processing failed")
            
        return {
            "status": "success",
            "url": f"http://127.0.0.1:8000/media/05_Exports/{filename}",
            "path": output_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
