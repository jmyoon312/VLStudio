from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Request
from ..utils import get_web_url
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from .. import crud, schemas, database, models
from ..creative_engine import CreativeEngine
from ..llm_manager import LLMClient
from pydantic import BaseModel
from typing import List, Optional
import os
import time
import json
import re
import shutil

router = APIRouter(tags=["creative"])

# Dependency
def get_creative_engine(db: Session = Depends(database.get_db)):
    settings = crud.get_settings(db)
    llm_client = LLMClient(settings)
    return CreativeEngine(llm_client)

from ..config import settings as app_settings
from ..services.smart_executor import smart_executor
from typing import Dict, Any

class GenerateScriptRequest(BaseModel):
    provider: str
    model: str
    system_instruction: str
    input_text: str
    config: Optional[Dict[str, Any]] = {} 
    node_id: str = "test_run"
    glossary: Optional[str] = None


class StyleAnalysisResponse(BaseModel):
    style_prompt: str
    negative_prompt: str

class SceneSegment(BaseModel):
    scene_id: int
    script: str
    visual_prompt: str
    video_prompt: Optional[str] = None
    media_url: Optional[str] = None
    media_path: Optional[str] = None
    audio_url: Optional[str] = None
    audio_path: Optional[str] = None
    video_url: Optional[str] = None
    video_path: Optional[str] = None
    
    # [NEW] Manual Asset Overrides & Intelligent Scouting
    is_manual_asset: bool = False
    frozen_effect: Optional[str] = "static" # static, zoom, pan_left, pan_right
    scout_status: Optional[str] = "idle" # idle, scouting, found, failed
    asset_score: Optional[float] = 0.0

class SegmentationRequest(BaseModel):
    text: str
    mode: str = "shorts"
    provider: Optional[str] = None
    model: Optional[str] = None
    style_prompt: str = ""
    split_method: str = "ai_smart" # ai_smart, visual_change, sentence, paragraph, semantic, custom_rule
    auto_generate_images: bool = False # [NEW] Auto-trigger Draft Gen
    auto_generate_audio: bool = False # [NEW] Auto-trigger Audio Gen
    pacing_config: Optional[Dict[str, Any]] = None # [NEW] {strategy: 'rule', unit: 'sentence', value: 2}

@router.get("/models")
async def get_available_models(
    db: Session = Depends(database.get_db),
    engine: CreativeEngine = Depends(get_creative_engine),
    force: bool = False
):
    try:
        return await engine.llm_client.fetch_available_models(db=db, force=force)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class TestChatRequest(BaseModel):
    message: str
    provider: str
    model: str
    system_instruction: Optional[str] = "You are a helpful assistant. Respond concisely."

@router.post("/test-chat")
def test_chat(
    request: TestChatRequest,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    [NEW] Simple chat test for model verification.
    """
    try:
        # [FIX] Robust provider/model mapping
        model_name = request.model
        actual_provider = request.provider
        
        for p in ["google", "groq", "openrouter", "sambanova", "cerebras", "ollama", "nvidia", "opencode", "youtube1"]:
            if model_name.startswith(f"{p}/"):
                actual_provider = p
                break
        
        # Ensure prefix is consistent for llm_client
        if not model_name.startswith(f"{actual_provider}/") and actual_provider != "google":
            model_name = f"{actual_provider}/{model_name}"
            
        response = engine.llm_client.generate_content(
            prompt=request.message,
            model_name=model_name,
            system_instruction=request.system_instruction
        )
        
        if isinstance(response, dict):
            if str(response.get("content", "")).startswith("ERROR:"):
                raise HTTPException(status_code=500, detail=response.get("content"))
            return response
        
        if str(response).startswith("ERROR:"):
            raise HTTPException(status_code=500, detail=str(response))
        return {"content": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat test failed: {str(e)}")



@router.post("/analyze-style", response_model=StyleAnalysisResponse)
async def analyze_style(
    file: UploadFile = File(...),
    provider: str = Form("google"),
    model: str = Form("gemini-2.0-flash-exp"),
    engine: CreativeEngine = Depends(get_creative_engine)
):
    try:
        contents = await file.read()
        result = engine.analyze_style_image(contents, provider=provider, model=model)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/split-script", response_model=List[SceneSegment])
async def segment_script(
    request: SegmentationRequest,
    req: Request, # Inject Request for URL generation
    engine: CreativeEngine = Depends(get_creative_engine),
    db: Session = Depends(database.get_db) # Need DB for ImageGenService
):
    try:
        # 1. Segment Script
        result_segments = engine.segment_script(
            request.text, 
            request.mode, 
            request.provider, 
            request.model, 
            request.style_prompt,
            request.split_method,
            request.pacing_config
        )

        
        updated_segments = result_segments
        settings = crud.get_settings(db)

        # 2. Auto Image Generation (Draft Mode)
        if request.auto_generate_images:
            from ..services.image_gen_service import ImageGenService
            image_service = ImageGenService(settings)
            
            # Map dictionaries to SceneSegment objects if needed, or update dicts
            # updated_segments = [] # Don't reset!
            
            for seg in updated_segments:
                # segment_script returns list of dicts: {'scene_id':..., 'visual_prompt':...}
                # But response_model is List[SceneSegment]. FastAPI handles dict->Model conversion.
                # We need to inject media_url/media_path into the dict.
                
                v_prompt = seg.get("visual_prompt", "")
                if v_prompt:
                    try:
                        # Use "fast" mode (API) for auto-draft
                        local_path = image_service.generate_image(v_prompt, mode="fast")
                        
                        # Set Path
                        seg["media_path"] = local_path
                        
                        # Set URL (Web Accessible)
                        seg["media_url"] = get_web_url(req, local_path)
                        
                    except Exception as gen_err:
                        print(f"[WARN] Auto-Gen Failed for Scene {seg.get('scene_id')}: {gen_err}")
                
                
                # updated_segments.append(seg) # Removed to avoid dup in in-place mod
            
            
            # 3. Auto Audio Generation (TTS)
            if request.auto_generate_audio:
                from ..video_engine import VideoGenClient
                video_client = VideoGenClient(settings)
                
                for seg in updated_segments:
                    script_text = seg.get("script", "")
                    if script_text:
                        try:
                            tts_config = {
                                "engine": settings.default_tts_engine or "google",
                                "language": settings.default_language or "ko",
                                "voice_id": "ko-KR-Standard-A" 
                            }
                            audio_path = await video_client.generate_scene_audio(
                                scene_id=seg.get("scene_id", 0),
                                script=script_text,
                                tts_config=tts_config
                            )
                            seg["audio_path"] = audio_path
                            seg["audio_url"] = get_web_url(req, audio_path)
                        except Exception as tts_err:
                            print(f"[WARN] Auto-TTS Failed for Scene {seg.get('scene_id')}: {tts_err}")

            return updated_segments

        return result_segments

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



class ImageGenRequest(BaseModel):
    prompt: str
    provider: str = "openai"
    model: str = "dall-e-3"

@router.post("/generate-image")
def generate_image(
    request: Request,
    gen_request: ImageGenRequest,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    try:
        # Use VideoGenClient to ensure image is downloaded and saved locally
        from ..video_engine import VideoGenClient
        settings = engine.llm_client.settings
        video_client = VideoGenClient(settings)
        
        # We need a scene_id. If not provided, use 0 or timestamp.
        # Request model doesn't have scene_id. Let's assume 0.
        scene_id = 0 
        
        local_path = video_client.generate_scene_image(
            scene_id=scene_id,
            prompt=gen_request.prompt,
            provider=gen_request.provider,
            model=gen_request.model
        )
        
        return {
            "status": "success",
            "web_url": get_web_url(request, local_path),
            "server_path": local_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Batch Processing Endpoints

class BatchImageRequest(BaseModel):
    scenes: List[SceneSegment]
    provider: str = "openai"
    model: str = "dall-e-3"

@router.post("/batch-image")
def batch_generate_images(
    request: BatchImageRequest,
    fastapi_req: Request,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    Generates images for all scenes in the list.
    Returns the list with updated 'media_url' (which will be a local file path).
    """
    # We need VideoGenClient here, but CreativeEngine doesn't have it by default in this context.
    # Let's instantiate it or add it to CreativeEngine.
    # For simplicity, we'll instantiate VideoGenClient here using settings.
    # Ideally, CreativeEngine should hold VideoGenClient or vice versa.
    # Let's do it cleanly:
    from ..video_engine import VideoGenClient
    settings = engine.llm_client.settings # Hacky but works if LLMClient stores settings
    video_client = VideoGenClient(settings)
    
    updated_scenes = []
    for scene in request.scenes:
        try:
            # Generate Image
            # Use scene_id and visual_prompt
            # Note: visual_prompt might contain aspect ratio, we should strip it or let DALL-E handle it.
            # DALL-E 3 handles natural language well.
            
            local_path = video_client.generate_scene_image(
                scene_id=scene.scene_id,
                prompt=scene.visual_prompt,
                provider=request.provider,
                model=request.model
            )
            
            # Convert local path to a serve-able URL if needed, or just return path
            # Frontend needs to be able to access it.
            # We should probably serve 'temp' directory statically.
            # For now, let's return the filename and assume frontend constructs URL or we return a relative URL.
            # Use the intelligent URL utility which handles relative path generation
            # to prevent internal container hostnames (api:8000) from leaking to the browser.
            url = get_web_url(fastapi_req, local_path)

            scene.media_url = url
            scene.media_path = local_path   # batch-render 가 직접 경로 사용할 수 있도록
            updated_scenes.append(scene)

            
        except Exception as e:
            print(f"Failed to generate image for scene {scene.scene_id}: {e}")
            updated_scenes.append(scene) # Return original if failed
            
    return updated_scenes

class BatchRenderRequest(BaseModel):
    scenes: List[SceneSegment]
    voice_id: str = "af_heart" # Default Kokoro voice
    speed: float = 1.0
    aspect_ratio: str = "9:16"
    motion_config: Optional[dict] = None
    subtitle_config: Optional[dict] = None
    audio_config: Optional[dict] = None

@router.post("/batch-render")
def batch_render_videos(
    request: BatchRenderRequest,
    fastapi_req: Request,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    Renders videos for all scenes.
    1. Generates TTS if audio is missing (TODO: Implement TTS generation here or assume audio exists).
       For now, we will mock audio or assume it exists. 
       Actually, let's use a placeholder audio if missing to unblock the flow.
    2. Renders Video using FFmpeg (Ken Burns).
    """
    from ..video_engine import VideoGenClient
    settings = engine.llm_client.settings
    video_client = VideoGenClient(settings)
    
    updated_scenes = []
    
    # Ensure temp dir exists for dummy audio
    temp_dir = app_settings.TEMP_DIR
    os.makedirs(temp_dir, exist_ok=True)
    dummy_audio_path = os.path.join(temp_dir, "dummy_audio.mp3")
    
    # Create dummy audio if not exists (5초 무음) - subprocess 사용으로 경로 공백 문제 해결
    if not os.path.exists(dummy_audio_path):
        import subprocess
        try:
            from app import dependency_manager
            ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
        except Exception:
            ffmpeg_exe = "ffmpeg"
        subprocess.run([
            ffmpeg_exe, '-hide_banner', '-y',
            '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
            '-t', '5', '-q:a', '9', '-acodec', 'libmp3lame',
            dummy_audio_path
        ], capture_output=True)


    for scene in request.scenes:
        try:
            # 1. Check Image - media_path 우선(직접 경로), 없으면 URL 파싱으로 폴백
            image_path = ""

            if scene.media_path and os.path.exists(scene.media_path):
                image_path = scene.media_path
            elif scene.media_url:
                # URL에서 파일명 추출해 temp_dir 에서 찾기
                filename = scene.media_url.split("/")[-1].split("?")[0]
                candidate = os.path.join(temp_dir, filename)
                if os.path.exists(candidate):
                    image_path = candidate

            if not image_path:
                print(f"Skipping scene {scene.scene_id}: No valid image file found "
                      f"(media_path={scene.media_path}, media_url={scene.media_url})")
                updated_scenes.append(scene)
                continue


            # 2. Check Audio - use scene's actual audio_path if available
            if scene.audio_path and os.path.exists(scene.audio_path):
                audio_path = scene.audio_path
                # Probe actual duration
                try:
                    import subprocess
                    from app import dependency_manager
                    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
                    ffprobe_exe = os.path.join(os.path.dirname(ffmpeg_exe), "ffprobe.exe")
                    if not os.path.exists(ffprobe_exe):
                        ffprobe_exe = "ffprobe"
                    cmd_dur = [ffprobe_exe, '-v', 'error', '-show_entries', 'format=duration',
                               '-of', 'default=noprint_wrappers=1:nokey=1', audio_path]
                    result = subprocess.run(cmd_dur, capture_output=True, text=True)
                    duration = float(result.stdout.strip()) if result.stdout.strip() else 5.0
                except Exception:
                    duration = 5.0
            else:
                audio_path = dummy_audio_path
                duration = 5.0

            # 3. Render Video
            output_path = video_client.render_scene_video(
                scene_id=scene.scene_id,
                image_path=image_path,
                audio_path=audio_path,
                duration=duration,
                aspect_ratio=request.aspect_ratio,
                motion_config=request.motion_config,
                subtitle_config=request.subtitle_config,
                audio_config=request.audio_config,
                script=scene.script if hasattr(scene, 'script') else ""
            )

            # 4. Update Scene - video_path 필수 (merge-scenes 가 이걸 읽음)
            url = get_web_url(fastapi_req, output_path)
            scene.media_url = url
            scene.video_url = url
            scene.video_path = output_path  # merge-scenes 에서 검증하는 필드
            updated_scenes.append(scene)

            
        except Exception as e:
            print(f"Failed to render video for scene {scene.scene_id}: {e}")
            updated_scenes.append(scene)
            
    return updated_scenes

# Style Preset Endpoints

@router.get("/styles", response_model=List[schemas.StylePreset])
def get_style_presets(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    presets = db.query(models.StylePreset).offset(skip).limit(limit).all()
    return presets

@router.post("/styles", response_model=schemas.StylePreset)
def create_style_preset(
    preset: schemas.StylePresetCreate,
    db: Session = Depends(database.get_db)
):
    db_preset = models.StylePreset(**preset.dict())
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    return db_preset

@router.put("/styles/{style_id}", response_model=schemas.StylePreset)
def update_style_preset(
    style_id: int,
    preset: schemas.StylePresetUpdate,
    db: Session = Depends(database.get_db)
):
    db_preset = db.query(models.StylePreset).filter(models.StylePreset.id == style_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Style preset not found")
    
    update_data = preset.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_preset, key, value)
    
    db.commit()
    db.refresh(db_preset)
    return db_preset

@router.delete("/styles/{style_id}")
def delete_style_preset(
    style_id: int,
    db: Session = Depends(database.get_db)
):
    db_preset = db.query(models.StylePreset).filter(models.StylePreset.id == style_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Style preset not found")
    
    db.delete(db_preset)
    db.commit()
    return {"status": "success"}

# Config Preset Endpoints

@router.get("/presets/{preset_type}", response_model=List[schemas.ConfigPreset])
def get_config_presets(
    preset_type: str,
    db: Session = Depends(database.get_db)
):
    return db.query(models.ConfigPreset).filter(models.ConfigPreset.type == preset_type).all()

@router.post("/presets", response_model=schemas.ConfigPreset)
def create_config_preset(
    preset: schemas.ConfigPresetCreate,
    db: Session = Depends(database.get_db)
):
    db_preset = models.ConfigPreset(**preset.dict())
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    return db_preset

@router.delete("/presets/{preset_id}")
def delete_config_preset(
    preset_id: int,
    db: Session = Depends(database.get_db)
):
    db_preset = db.query(models.ConfigPreset).filter(models.ConfigPreset.id == preset_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    db.delete(db_preset)
    db.commit()
    return {"status": "success"}

class OrchestratePromptRequest(BaseModel):
    script: str
    visual_anchor: Optional[str] = "Main subject"
    style_bible: Optional[dict] = {}
    master_visual_dna: Optional[str] = ""
    provider: str = "google"
    model: str = "gemini-2.0-flash-exp"

@router.post("/generate-prompt")
def generate_prompt(
    request: OrchestratePromptRequest,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    try:
        # Extract Style Bible components
        sb = request.style_bible or {}
        colors = sb.get("color_palette", "Natural, high-dynamic range")
        lighting = sb.get("lighting", "Cinematic, soft shadows")
        camera = sb.get("camera", "8k, anamorphic lens, shallow depth of field")
        
        # Build the Super-Prompt for Orchestration
        system_prompt = (
            "You are an Elite Visual Director for high-end cinematic production.\n"
            "Your task is to synthesize a single, master visual prompt based on a script segment and its strategic context.\n"
            "The prompt MUST be highly descriptive, technical, and optimized for high-tier image generators (Midjourney, Flux, Imagen).\n\n"
            "### STRATEGIC CONTEXT:\n"
            f"- Subject (Visual Anchor): {request.visual_anchor}\n"
            f"- Color Palette: {colors}\n"
            f"- Lighting: {lighting}\n"
            f"- Camera: {camera}\n"
            f"- Visual DNA: {request.master_visual_dna}\n\n"
            "### OUTPUT RULES:\n"
            "1. Output ONLY the synthesized English prompt.\n"
            "2. Use professional cinematography terms.\n"
            "3. Ensure the Subject is the focus.\n"
            "4. DO NOT generate images, ONLY the precise text description."
        )
        
        prompt = engine.llm_client.generate_content(
            prompt=f"SCRIPT SEGMENT: {request.script}", 
            model_name=request.model if request.provider == "google" else f"{request.provider}/{request.model}",
            system_instruction=system_prompt
        )
        
        if isinstance(prompt, dict):
             prompt = prompt.get("content", "")
             
        return {"prompt": prompt}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SceneTTSRequest(BaseModel):
    scene_id: int
    script: str
    image_url: Optional[str] = ""
    tts_config: Optional[dict] = None
    old_file_path: Optional[str] = None # For cleanup
    project_name: Optional[str] = None

class InitProjectRequest(BaseModel):
    project_name: str
    scenes: Optional[List[dict]] = None
    script: Optional[str] = None

@router.post("/init-project")
def init_project_folder(
    req: InitProjectRequest,
    db: Session = Depends(database.get_db)
):
    import json
    settings = crud.get_settings(db)
    root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
    project_dir = os.path.join(root, "05_Exports", req.project_name)
    subdirs = ["audio", "images", "videos", "subtitles"]
    for sub in subdirs:
        os.makedirs(os.path.join(project_dir, sub), exist_ok=True)
    
    meta_path = os.path.join(project_dir, "project.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({
            "project_name": req.project_name,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": "active",
            "script": req.script or "",
            "scene_count": len(req.scenes) if req.scenes else 0,
            "scenes": req.scenes or []
        }, f, ensure_ascii=False, indent=2)
        
    return {"status": "success", "project_dir": project_dir, "project_name": req.project_name}

class SaveProjectRequest(BaseModel):
    project_name: str
    script: Optional[str] = ""
    scenes: Optional[List[dict]] = []
    subtitle_config: Optional[dict] = None

@router.get("/projects")
def list_creative_projects(
    db: Session = Depends(database.get_db)
):
    """
    05_Exports 디스크 폴더 내의 모든 프로젝트 목록을 최신 수정 순으로 반환합니다.
    """
    settings = crud.get_settings(db)
    root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
    exports_dir = os.path.join(root, "05_Exports")
    if not os.path.exists(exports_dir):
        return []
        
    projects = []
    for item in os.listdir(exports_dir):
        item_path = os.path.join(exports_dir, item)
        if not os.path.isdir(item_path):
            continue
        
        meta_path = os.path.join(item_path, "project.json")
        proj_info = {
            "name": item,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getctime(item_path))),
            "updated_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getmtime(item_path))),
            "mtime": os.path.getmtime(item_path),
            "scene_count": 0,
            "script_preview": "",
            "has_images": os.path.exists(os.path.join(item_path, "images")) and len(os.listdir(os.path.join(item_path, "images"))) > 0,
            "has_videos": os.path.exists(os.path.join(item_path, "videos")) and len(os.listdir(os.path.join(item_path, "videos"))) > 0,
            "has_audio": os.path.exists(os.path.join(item_path, "audio")) and len(os.listdir(os.path.join(item_path, "audio"))) > 0,
        }
        
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    pdata = json.load(f)
                proj_info["created_at"] = pdata.get("created_at") or proj_info["created_at"]
                proj_info["scene_count"] = pdata.get("scene_count") or len(pdata.get("scenes", []))
                script_text = pdata.get("script", "")
                proj_info["script_preview"] = script_text[:80] + ("..." if len(script_text) > 80 else "")
            except Exception:
                pass
                
        projects.append(proj_info)
        
    projects.sort(key=lambda p: p.get("mtime", 0), reverse=True)
    return projects

@router.get("/projects/{project_name}")
def get_creative_project(
    project_name: str,
    db: Session = Depends(database.get_db)
):
    """
    특정 프로젝트의 project.json 메타데이터 및 전체 씬 정보를 로드합니다.
    """
    settings = crud.get_settings(db)
    root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
    project_dir = os.path.join(root, "05_Exports", project_name)
    if not os.path.exists(project_dir):
        raise HTTPException(status_code=404, detail=f"Project {project_name} not found")
        
    meta_path = os.path.join(project_dir, "project.json")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                pdata = json.load(f)
            return pdata
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to read project.json: {str(e)}")
            
    return {
        "project_name": project_name,
        "created_at": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(os.path.getctime(project_dir))),
        "scenes": [],
        "script": ""
    }

@router.post("/save-project")
def save_creative_project(
    req: SaveProjectRequest,
    db: Session = Depends(database.get_db)
):
    """
    프로젝트의 최신 씬 상태, 대본, 자막 서식 설정을 05_Exports/{project_name}/project.json에 원자적으로 저장합니다.
    """
    settings = crud.get_settings(db)
    root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
    project_dir = os.path.join(root, "05_Exports", req.project_name)
    os.makedirs(project_dir, exist_ok=True)
    
    meta_path = os.path.join(project_dir, "project.json")
    existing = {}
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
        except Exception:
            pass
            
    existing.update({
        "project_name": req.project_name,
        "created_at": existing.get("created_at") or time.strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "status": "active",
        "script": req.script if req.script is not None else existing.get("script", ""),
        "scene_count": len(req.scenes) if req.scenes else 0,
        "scenes": req.scenes if req.scenes is not None else existing.get("scenes", []),
    })
    if req.subtitle_config:
        existing["subtitle_config"] = req.subtitle_config
        
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
        
    return {"status": "success", "project_name": req.project_name, "scene_count": len(req.scenes or [])}

class SyncSubtitlesRequest(BaseModel):
    project_name: str
    scenes: List[dict]
    subtitle_config: Optional[dict] = None

def format_srt_timestamp(ms: int) -> str:
    hours = ms // 3600000
    ms %= 3600000
    minutes = ms // 60000
    ms %= 60000
    seconds = ms // 1000
    millis = ms % 1000
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"

from app.subtitle_core import balanced_split_kor

def split_script_into_cues(script: str, total_dur_ms: int, split_limit: int = 24, max_lines: int = 2) -> List[dict]:
    """
    app.subtitle_core의 정밀 한국어 분절 엔진(balanced_split_kor)을 사용하여
    대본 문장을 사용자의 자막 설정(split_limit)에 맞춘 고품질 SRT 다중 큐로 분할합니다.
    """
    if not script or not script.strip():
        return []
        
    text = script.strip()
    
    # 1. subtitle_core의 검증된 balanced_split_kor 분절기 적용
    effective_limit = max(10, split_limit)
    chunks = balanced_split_kor(text, limit=effective_limit, min_words=2, min_chars=4)
    if not chunks:
        chunks = [text]

    # 2. 전체 씬 지속시간(total_dur_ms)을 글자수 비율로 정밀 밀리초 타임코드 배분
    total_chars = sum(max(1, len(c.replace(' ', ''))) for c in chunks)
    cues = []
    curr_ms = 0
    
    for i, ch in enumerate(chunks):
        ch_len = max(1, len(ch.replace(' ', '')))
        if i == len(chunks) - 1:
            chunk_dur = max(300, total_dur_ms - curr_ms)
        else:
            chunk_dur = max(300, int(round((ch_len / total_chars) * total_dur_ms)))
            
        cues.append({
            "text": ch,
            "duration_ms": chunk_dur
        })
        curr_ms += chunk_dur

    return cues

@router.post("/sync-subtitles")
def sync_project_subtitles(
    req: SyncSubtitlesRequest,
    db: Session = Depends(database.get_db)
):
    settings = crud.get_settings(db)
    root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
    sub_dir = os.path.join(root, "05_Exports", req.project_name, "subtitles")
    os.makedirs(sub_dir, exist_ok=True)
    srt_path = os.path.join(sub_dir, "subtitles.srt")

    # 자막 분절 설정 추출 (기본: 28자, 최대 2줄)
    sub_cfg = req.subtitle_config or {}
    split_limit = int(sub_cfg.get("splitLimit", 28) or 28)
    max_lines = int(sub_cfg.get("maxLines", 2) or 2)

    srt_blocks = []
    entries = []
    acc_ms = 0
    idx = 1

    for s in req.scenes:
        script = str(s.get("script") or "").strip()
        if not script:
            continue
        try:
            dur = float(s.get("duration", 5.0) or 5.0)
        except Exception:
            dur = 5.0
        dur_ms = int(round(dur * 1000))
        
        # 씬 대본을 정밀 다중 자막 큐로 분할
        scene_cues = split_script_into_cues(script, dur_ms, split_limit=split_limit, max_lines=max_lines)
        if not scene_cues:
            scene_cues = [{"text": script, "duration_ms": dur_ms}]

        for cue in scene_cues:
            cue_text = cue["text"]
            cue_dur_ms = cue["duration_ms"]
            start_ms = acc_ms
            end_ms = acc_ms + cue_dur_ms
            acc_ms = end_ms

            start_str = format_srt_timestamp(start_ms)
            end_str = format_srt_timestamp(end_ms)

            srt_blocks.append(f"{idx}\n{start_str} --> {end_str}\n{cue_text}\n")
            entries.append({
                "id": idx,
                "scene_id": s.get("scene_id", idx),
                "startTime": start_str,
                "endTime": end_str,
                "startMs": start_ms,
                "endMs": end_ms,
                "durationMs": cue_dur_ms,
                "text": cue_text
            })
            idx += 1

    srt_content = "\n".join(srt_blocks)
    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(srt_content)

    # 자막 서식 설정(폰트, 색상, 박스, 위치 등)을 subtitles/config.json 및 project.json에 영구 저장
    if sub_cfg:
        cfg_path = os.path.join(sub_dir, "config.json")
        with open(cfg_path, "w", encoding="utf-8") as f:
            json.dump(sub_cfg, f, ensure_ascii=False, indent=2)
        
        # project.json 업데이트
        meta_path = os.path.join(root, "05_Exports", req.project_name, "project.json")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    pdata = json.load(f)
                pdata["subtitle_config"] = sub_cfg
                with open(meta_path, "w", encoding="utf-8") as f:
                    json.dump(pdata, f, ensure_ascii=False, indent=2)
            except Exception as pe:
                print(f"[Subtitles] project.json update error: {pe}")

    return {
        "status": "success",
        "srt_path": srt_path,
        "srt_content": srt_content,
        "entries": entries,
        "total_duration_ms": acc_ms
    }

@router.post("/scene-tts")
async def generate_scene_tts(
    request: SceneTTSRequest,
    fastapi_req: Request, # Inject Request
    engine: CreativeEngine = Depends(get_creative_engine)
):
    from ..video_engine import VideoGenClient
    settings = engine.llm_client.settings
    video_client = VideoGenClient(settings)
    
    try:
        # Cleanup old file if exists
        if request.old_file_path and os.path.exists(request.old_file_path):
            try:
                os.remove(request.old_file_path)
                print(f"🗑️ Deleted old audio: {request.old_file_path}")
            except Exception as e:
                print(f"[WARN] Failed to delete old audio: {e}")

        # Resolve robust TTS config fallback
        config = request.tts_config or {}
        if not config.get("engine"):
            config["engine"] = getattr(settings, "default_tts_engine", "edge") or "edge"
        if not config.get("language"):
            config["language"] = "ko"
        if not config.get("voice_id"):
            config["voice_id"] = "ko-KR-SunHiNeural" if config.get("language") == "ko" else "en-US-JennyNeural"

        audio_path = await video_client.generate_scene_audio(
            scene_id=request.scene_id,
            script=request.script,
            tts_config=config,
            project_name=request.project_name
        )
        
        # Calculate exact audio duration
        duration = 5.0
        try:
            from ..video_engine import get_audio_metadata
            duration = get_audio_metadata(audio_path)
        except Exception as dur_err:
            try:
                import soundfile as sf
                info = sf.info(audio_path)
                duration = float(info.duration)
            except Exception:
                duration = 5.0
        
        # Ensure project folder audio copy
        if request.project_name:
            root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
            proj_audio_dir = os.path.join(root, "05_Exports", request.project_name, "audio")
            os.makedirs(proj_audio_dir, exist_ok=True)
            proj_filename = f"scene_{request.scene_id:02d}.mp3"
            proj_audio_path = os.path.join(proj_audio_dir, proj_filename)
            try:
                if os.path.abspath(audio_path) != os.path.abspath(proj_audio_path):
                    shutil.copy2(audio_path, proj_audio_path)
                    audio_path = proj_audio_path
            except Exception as cp_err:
                print(f"[WARN] Failed to copy audio to project folder: {cp_err}")

        web_url = get_web_url(fastapi_req, audio_path)
        
        return {
            "status": "success",
            "web_url": web_url,
            "server_path": audio_path,
            "duration": round(duration, 3)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class RenderSceneRequest(BaseModel):
    scene_id: int
    image_path: str
    audio_path: str
    duration: Optional[float] = None
    aspect_ratio: str = "9:16"
    voice_id: str = "af_heart"
    speed: float = 1.0
    motion_config: Optional[dict] = None
    subtitle_config: Optional[dict] = None
    audio_config: Optional[dict] = None
    script: Optional[str] = ""
    old_file_path: Optional[str] = None # For cleanup

@router.post("/render-scene")
async def render_scene(
    scene_request: RenderSceneRequest,
    fastapi_req: Request,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    Renders a single scene video with custom TTS settings.
    Strictly requires absolute paths for image and audio.
    """
    print(f"Received Render Request: {scene_request.dict()}")
    from ..video_engine import VideoGenClient
    import subprocess
    import traceback
    
    # Import DependencyManager
    # Import DependencyManager
    from app import dependency_manager

    settings = engine.llm_client.settings
    video_client = VideoGenClient(settings)
    
    try:
        # 0. Cleanup old file if exists
        if scene_request.old_file_path and os.path.exists(scene_request.old_file_path):
            try:
                os.remove(scene_request.old_file_path)
                print(f"🗑️ Deleted old video: {scene_request.old_file_path}")
                
                # Cleanup associated .ass files for this scene
                dir_path = os.path.dirname(scene_request.old_file_path)
                import glob
                ass_files = glob.glob(os.path.join(dir_path, f"scene_{scene_request.scene_id}_*.ass"))
                for ass_f in ass_files:
                    try:
                        os.remove(ass_f)
                        print(f"🗑️ Deleted old ass: {ass_f}")
                    except Exception as e:
                        print(f"[WARN] Failed to delete old ass {ass_f}: {e}")
                        
            except Exception as e:
                print(f"[WARN] Failed to delete old video: {e}")

        # 1. Strict Path Validation
        image_path = scene_request.image_path
        audio_path = scene_request.audio_path
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=400, detail=f"Image path invalid: {image_path}")
            
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=400, detail=f"Audio path invalid: {audio_path}")

        # 2. Duration Logic
        duration = scene_request.duration
        if duration is None:
            # Probe audio duration if not provided
            ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
            ffprobe_exe = os.path.join(os.path.dirname(ffmpeg_exe), "ffprobe.exe" if os.name == 'nt' else "ffprobe")
            
            if not os.path.exists(ffprobe_exe):
                 try:
                     ffprobe_exe = dependency_manager.DependencyManager.get_ffprobe_path()
                 except:
                     pass
            
            try:
                cmd_dur = [
                    ffprobe_exe, '-v', 'error', '-show_entries', 'format=duration',
                    '-of', 'default=noprint_wrappers=1:nokey=1', audio_path
                ]
                result = subprocess.run(cmd_dur, capture_output=True, text=True, check=True)
                duration = float(result.stdout.strip())
                print(f"[OK] Audio Duration Detected: {duration}s")
            except Exception as e:
                print(f"[WARN] Duration probe failed (Using default 5s): {e}")
                duration = 5.0

        # 3. Render Video
        video_path = video_client.render_scene_video(
            scene_id=scene_request.scene_id,
            image_path=image_path,
            audio_path=audio_path,
            duration=duration,
            aspect_ratio=scene_request.aspect_ratio,
            motion_config=scene_request.motion_config,
            subtitle_config=scene_request.subtitle_config,
            audio_config=scene_request.audio_config,
            script=scene_request.script
        )
        
        # 4. Success Response
        web_url = get_web_url(fastapi_req, video_path)
        
        return {
            "status": "success",
            "web_url": web_url,
            "server_path": video_path
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Render Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from typing import List, Optional

class BatchDownloadRequest(BaseModel):
    scenes: List[SceneSegment]
    target_type: str # "audio", "visual", "video"
    full_video_path: Optional[str] = None

@router.post("/batch-download")
def batch_download(
    request: BatchDownloadRequest,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    Creates a ZIP file containing all assets of the specified type.
    Returns the ZIP file.
    """
    from ..export_manager import ExportManager
    export_manager = ExportManager()
    
    file_paths = []
    # Ensure temp dir exists
    temp_dir = app_settings.TEMP_DIR
    
    for scene in request.scenes:
        scene_prefix = f"scene_{scene.scene_id:02d}"
        
        # 1. Script (SRT/Text fallback)
        if scene.script:
            txt_path = os.path.join(temp_dir, f"{scene_prefix}_script.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(scene.script)
            file_paths.append((txt_path, f"{scene_prefix}_script.txt"))
            
        # 2. Audio
        if scene.audio_path and os.path.exists(scene.audio_path):
            ext = os.path.splitext(scene.audio_path)[1]
            file_paths.append((scene.audio_path, f"{scene_prefix}_audio{ext}"))
        elif scene.audio_url:
            filename = scene.audio_url.split("/")[-1]
            path = os.path.join(temp_dir, filename)
            if os.path.exists(path):
                ext = os.path.splitext(path)[1]
                file_paths.append((path, f"{scene_prefix}_audio{ext}"))
                
        # 3. Visual Source (Image/Video)
        if request.target_type in ["visual", "video"]:
            if scene.media_path and os.path.exists(scene.media_path):
                ext = os.path.splitext(scene.media_path)[1]
                file_paths.append((scene.media_path, f"{scene_prefix}_source{ext}"))
            elif scene.media_url and ("/files/" in scene.media_url or "/temp/" in scene.media_url):
                filename = scene.media_url.split("/")[-1]
                path = os.path.join(temp_dir, filename)
                if os.path.exists(path):
                    ext = os.path.splitext(path)[1]
                    file_paths.append((path, f"{scene_prefix}_source{ext}"))

        # 4. Final Video
        if request.target_type == "video":
            if scene.video_path and os.path.exists(scene.video_path):
                ext = os.path.splitext(scene.video_path)[1]
                file_paths.append((scene.video_path, f"{scene_prefix}_final{ext}"))
            elif scene.video_url and scene.video_url.endswith(".mp4"):
                filename = scene.video_url.split("/")[-1]
                path = os.path.join(temp_dir, filename)
                if os.path.exists(path):
                    file_paths.append((path, f"{scene_prefix}_final.mp4"))
            
        # 5. Full Merged Video
        if request.target_type == "video" and request.full_video_path and os.path.exists(request.full_video_path):
            ext = os.path.splitext(request.full_video_path)[1]
            file_paths.append((request.full_video_path, f"full_merged_video{ext}"))
            
    if not file_paths:
        raise HTTPException(status_code=404, detail="No valid files found to download.")
        
    timestamp = int(time.time())
    zip_filename = f"batch_{request.target_type}_{timestamp}.zip"
    
    try:
        zip_path = export_manager.create_batch_zip(file_paths, zip_filename)
        return FileResponse(zip_path, media_type='application/zip', filename=zip_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CleanupRequest(BaseModel):
    file_paths: List[str]

@router.post("/cleanup")
def cleanup_files(request: CleanupRequest):
    """
    Deletes the specified files from the server.
    """
    deleted_count = 0
    errors = []
    
    for path in request.file_paths:
        if not path: continue
        
        # Security check: ensure path is within allowed directories (optional but good practice)
        # For now, we trust the input as it's a local tool
        
        if os.path.exists(path):
            try:
                os.remove(path)
                deleted_count += 1
                print(f"🗑️ Cleanup: Deleted {path}")
            except Exception as e:
                errors.append(f"Failed to delete {path}: {str(e)}")
                print(f"[WARN] Cleanup Error: {e}")
        else:
            # Consider it "deleted" if it doesn't exist
            pass
            
    return {
        "status": "success",
        "deleted_count": deleted_count,
        "errors": errors
    }

def format_srt_time(seconds: float) -> str:
    """Converts seconds to SRT time format: HH:MM:SS,mmm"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def get_media_duration(file_path: str) -> float:
    import subprocess
    from ..dependency_manager import DependencyManager
    ffprobe = DependencyManager.get_ffprobe_path()
    if not ffprobe:
        ffprobe = "ffprobe"
    cmd = [ffprobe, '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return float(res.stdout.strip())
    except Exception as e:
        print(f"Error getting duration for {file_path}: {e}")
        return 5.0 # fallback
class MergeScenesRequest(BaseModel):
    scenes: List[SceneSegment]

@router.post("/merge-scenes")
def merge_scenes(
    request: MergeScenesRequest,
    fastapi_req: Request,
    engine: CreativeEngine = Depends(get_creative_engine)
):
    """
    Merges rendered videos from the provided scenes into a single video file.
    """
    from ..video_engine import VideoGenClient
    settings = engine.llm_client.settings
    video_client = VideoGenClient(settings)
    
    video_paths = []
    for scene in request.scenes:
        if scene.video_path and os.path.exists(scene.video_path):
            video_paths.append(scene.video_path)
        else:
            print(f"[WARN] Skipping merge for scene {scene.scene_id}: Video path missing or invalid ({scene.video_path})")
            
    if not video_paths:
        raise HTTPException(status_code=400, detail="No valid video files found to merge. Please render scenes first.")
        
    try:
        merged_path = video_client.merge_videos(video_paths)
        
        # --- Generate SRT and ZIP ---
        import zipfile
        import datetime
        
        srt_content = []
        current_time = 0.0
        
        valid_scenes = [s for s in request.scenes if s.video_path and os.path.exists(s.video_path)]
        for i, scene in enumerate(valid_scenes):
            duration = get_media_duration(scene.video_path)
            start_str = format_srt_time(current_time)
            current_time += duration
            end_str = format_srt_time(current_time)
            
            srt_content.append(f"{i+1}")
            srt_content.append(f"{start_str} --> {end_str}")
            srt_content.append(scene.script)
            srt_content.append("")
            
        srt_text = "\n".join(srt_content)
        
        # Save SRT to same directory as merged video
        output_dir = os.path.dirname(merged_path)
        base_name = os.path.splitext(os.path.basename(merged_path))[0]
        srt_path = os.path.join(output_dir, f"{base_name}.srt")
        zip_path = os.path.join(output_dir, f"{base_name}_bundle.zip")
        
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_text)
            
        # Create ZIP
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            zipf.write(merged_path, arcname=f"merged_video.mp4")
            zipf.write(srt_path, arcname=f"subtitles.srt")
            
        web_url = get_web_url(fastapi_req, zip_path)
        
        return {
            "status": "success",
            "web_url": web_url,
            "server_path": zip_path
        }
    except Exception as e:
        print(f"Merge Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Script Writer Endpoints

@router.get("/script-styles", response_model=List[schemas.ScriptStyle])
def get_script_styles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(database.get_db)
):
    return db.query(models.ScriptStyle).offset(skip).limit(limit).all()

@router.post("/script-styles", response_model=schemas.ScriptStyle)
def create_script_style(
    style: schemas.ScriptStyleCreate,
    db: Session = Depends(database.get_db)
):
    db_style = models.ScriptStyle(**style.dict())
    db.add(db_style)
    db.commit()
    db.refresh(db_style)
    return db_style

@router.put("/script-styles/{style_id}", response_model=schemas.ScriptStyle)
def update_script_style(
    style_id: int,
    style: schemas.ScriptStyleUpdate,
    db: Session = Depends(database.get_db)
):
    db_style = db.query(models.ScriptStyle).filter(models.ScriptStyle.id == style_id).first()
    if not db_style:
        raise HTTPException(status_code=404, detail="Script style not found")
    
    update_data = style.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_style, key, value)
    
    db.commit()
    db.refresh(db_style)
    return db_style

@router.delete("/script-styles/{style_id}")
def delete_script_style(
    style_id: int,
    db: Session = Depends(database.get_db)
):
    db_style = db.query(models.ScriptStyle).filter(models.ScriptStyle.id == style_id).first()
    if not db_style:
        raise HTTPException(status_code=404, detail="Script style not found")
    
    db.delete(db_style)
    db.commit()
    return {"status": "success"}

@router.post("/generate-script", response_model=schemas.ScriptGenerationResponse)
def generate_script(
    request: GenerateScriptRequest,
    engine: CreativeEngine = Depends(get_creative_engine),
    db: Session = Depends(database.get_db)
):
    try:
        # Define Adapter for SmartExecutor
        # The executor expects llm_callable(system, user) -> str
        def _llm_adapter(system, user):
            return engine.llm_client.generate_content(
                prompt=user,
                model_name=request.model if request.provider == "google" else f"{request.provider}/{request.model}",
                system_instruction=system
            )

        # Build Config
        # Ensure we pass the API Key / Provider context if executor needs it? 
        # Actually executor calls adapter. Adapter uses engine.llm_client which has keys.
        
        # Prepare System Prompt (append glossary if present)
        final_system = request.system_instruction
        if request.glossary:
            final_system += f"\n\nGlossary/Terms:\n{request.glossary}"
        
        # Enforce Strict Output
        final_system += (
            "\n\n[STRICT OUTPUT RULES]"
            "\n1. Output ONLY the final script/text."
            "\n2. DO NOT include 'Here is the script', 'Sure', 'Pattern A', or any analysis."
            "\n3. DO NOT include markdown code blocks (```) unless requested."
            "\n4. If you include intros/outros, the system will fail."
            "\n5. Your output must start directly with the content."
        )

        # Execute
        # Ensure config has model for cache key generation
        exec_config = request.config or {}
        exec_config["model"] = request.model
        # [ENHANCED] Enable real-time web search for script generation
        if "use_web_search" not in exec_config:
            exec_config["use_web_search"] = True

        result = smart_executor.execute(
            db=db,
            node_id=request.node_id,
            system_prompt=final_system,
            user_input=request.input_text,
            llm_callable=_llm_adapter,
            config=exec_config
        )

        # Strip <think> tags if present (common in reasoning models like DeepSeek)
        import re
        content = result["content"]
        content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL | re.IGNORECASE).strip()
        
        # Also clean up any leading "---" or "Here is..." if they survived
        content = re.sub(r'^---\s*', '', content).strip()
        # Remove Markdown bold/italic markers (** or *)
        content = re.sub(r'\*\*+', '', content)
        # Remove content in parentheses (meta comments)
        content = re.sub(r'\([^)]*\)', '', content).strip()

        return {
            "script": content,
            "model_used": request.model
        }

    except ValueError as ve:
         # Likely Missing Key
         print(f"Auth Error: {ve}")
         raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"Generate Script Error: {e}")
        # Detect Rate Limits
        if "429" in str(e):
             raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
        raise HTTPException(status_code=500, detail=f"Generation Failed: {str(e)}")


class SaveBase64AssetRequest(BaseModel):
    project_name: Optional[str] = "project_default"
    scene_id: int
    base64: str
    asset_type: str = "image" # "image" or "video"

@router.post("/save-base64-asset")
def save_base64_asset(
    req: SaveBase64AssetRequest,
    db: Session = Depends(database.get_db)
):
    try:
        import base64
        import time
        settings = crud.get_settings(db)
        root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
        
        target_dir = os.path.join(root, "05_Exports", req.project_name, "images" if req.asset_type == "image" else "videos")
        os.makedirs(target_dir, exist_ok=True)
        
        ext = "png" if req.asset_type == "image" else "mp4"
        raw_b64 = req.base64
        if "base64," in raw_b64:
            raw_b64 = raw_b64.split("base64,")[1]
            
        file_bytes = base64.b64decode(raw_b64)
        filename = f"scene_{req.scene_id}_{int(time.time())}.{ext}"
        filepath = os.path.join(target_dir, filename)
        
        with open(filepath, "wb") as f:
            f.write(file_bytes)
            
        return {
            "status": "success",
            "local_path": filepath,
            "filename": filename
        }
    except Exception as e:
        print(f"Failed to save base64 asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class InitProjectRequest(BaseModel):
    project_name: str
    scenes: List[Dict[str, Any]] = []
    script: Optional[str] = ""

@router.post("/init-project")
def init_project(
    req: InitProjectRequest,
    db: Session = Depends(database.get_db)
):
    try:
        settings = crud.get_settings(db)
        root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
        proj_dir = os.path.join(root, "05_Exports", req.project_name)
        os.makedirs(os.path.join(proj_dir, "images"), exist_ok=True)
        os.makedirs(os.path.join(proj_dir, "audio"), exist_ok=True)
        os.makedirs(os.path.join(proj_dir, "videos"), exist_ok=True)
        os.makedirs(os.path.join(proj_dir, "subtitles"), exist_ok=True)
        
        project_meta = {
            "project_name": req.project_name,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "script": req.script,
            "scene_count": len(req.scenes),
            "scenes": req.scenes
        }
        
        meta_path = os.path.join(proj_dir, "project.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(project_meta, f, ensure_ascii=False, indent=2)
            
        return {
            "status": "success",
            "project_name": req.project_name,
            "project_path": proj_dir
        }
    except Exception as e:
        print(f"[Error] init_project failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SyncSubtitlesRequest(BaseModel):
    project_name: str
    scenes: List[Dict[str, Any]]
    subtitle_config: Optional[Dict[str, Any]] = None

@router.post("/sync-subtitles")
def sync_subtitles(
    req: SyncSubtitlesRequest,
    db: Session = Depends(database.get_db)
):
    try:
        settings = crud.get_settings(db)
        root = settings.root_download_path or os.path.join(os.environ.get("LOCALAPPDATA", ""), "ViraLoop Studio", "media")
        sub_dir = os.path.join(root, "05_Exports", req.project_name, "subtitles")
        os.makedirs(sub_dir, exist_ok=True)
        
        cfg = req.subtitle_config or {}
        split_limit = cfg.get("splitLimit", 24)
        
        srt_entries = []
        srt_lines = []
        entry_id = 1
        current_time = 0.0
        
        for sc in req.scenes:
            script = (sc.get("script") or "").strip()
            duration = float(sc.get("duration") or 3.5)
            if not script:
                current_time += duration
                continue
                
            words = re.split(r'\s+', re.sub(r'[\r\n]+', ' ', script))
            chunks = []
            cur_words = []
            for w in words:
                if not w:
                    continue
                test_str = " ".join(cur_words + [w]) if cur_words else w
                if len(test_str) <= split_limit or not cur_words:
                    cur_words.append(w)
                else:
                    chunks.append(" ".join(cur_words))
                    cur_words = [w]
            if cur_words:
                chunks.append(" ".join(cur_words))
            if not chunks:
                chunks = [script]
                
            chunk_dur = duration / max(1, len(chunks))
            for c_idx, chunk_text in enumerate(chunks):
                c_start = current_time + c_idx * chunk_dur
                c_end = c_start + chunk_dur
                
                def sec_to_srt_time(sec):
                    hrs = int(sec // 3600)
                    mins = int((sec % 3600) // 60)
                    secs = int(sec % 60)
                    millis = int(round((sec - int(sec)) * 1000))
                    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"
                    
                start_str = sec_to_srt_time(c_start)
                end_str = sec_to_srt_time(c_end)
                
                srt_entries.append({
                    "id": entry_id,
                    "start": c_start,
                    "end": c_end,
                    "startMs": int(round(c_start * 1000)),
                    "endMs": int(round(c_end * 1000)),
                    "startTime": start_str,
                    "endTime": end_str,
                    "text": chunk_text,
                    "scene_id": sc.get("scene_id", entry_id)
                })
                
                srt_lines.append(f"{entry_id}")
                srt_lines.append(f"{start_str} --> {end_str}")
                srt_lines.append(chunk_text)
                srt_lines.append("")
                entry_id += 1
                
            current_time += duration
            
        srt_file_path = os.path.join(sub_dir, "subtitles.srt")
        with open(srt_file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(srt_lines))
            
        return {
            "status": "success",
            "entries": srt_entries,
            "srt_path": srt_file_path
        }
    except Exception as e:
        print(f"[Error] sync_subtitles failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


