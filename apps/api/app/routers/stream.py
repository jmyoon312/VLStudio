from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
import subprocess
import os
import logging
import asyncio
import asyncio
from .. import dependency_manager, database, crud
from ..database import SessionLocal

router = APIRouter(tags=["stream"])
logger = logging.getLogger(__name__)

# Global state for the streaming processes
# Key: channel_id (str), Value: subprocess.Popen
active_streams = {}

@router.post("/start")
async def start_stream(request: Request):
    """
    Starts an FFmpeg streaming process for a specific channel.
    Expects JSON: { "channel_id": "...", "rtmp_url": "..." }
    """
    global active_streams
    
    data = await request.json()
    logger.info(f"Start Stream Request Data: {data}")
    channel_id = data.get("channel_id")
    rtmp_url = data.get("rtmp_url")
    
    if not channel_id or not rtmp_url:
        raise HTTPException(status_code=400, detail="Missing channel_id or rtmp_url")
        
    if channel_id in active_streams:
        proc = active_streams[channel_id]
        if proc.poll() is None:
            return {"status": "already_running", "channel_id": channel_id}
        else:
            # Cleanup dead process
            del active_streams[channel_id]

    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    
    cmd = [
        ffmpeg_exe,
        '-re', # Read input at native frame rate
        '-i', '-', # Read from stdin
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k', '-maxrate', '3000k', '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p', '-g', '60', # Keyframe interval 2s for 30fps
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-f', 'flv',
        rtmp_url
    ]
    
    logger.info(f"Starting Stream for {channel_id}: {' '.join(cmd)}")
    
    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE # Log stderr if needed
        )
        active_streams[channel_id] = proc
        return {"status": "started", "channel_id": channel_id}
    except Exception as e:
        logger.error(f"Failed to start stream for {channel_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest")
async def ingest_stream(request: Request):
    """
    Receives binary video chunks and writes them to ALL active FFmpeg processes (Fan-out).
    """
    global active_streams
    
    if not active_streams:
        return {"status": "ignored_no_active_streams"}
        
    try:
        chunk = await request.body()
        if not chunk:
            return {"status": "empty_chunk"}
            
        # Fan-out to all active streams
        dead_channels = []
        for channel_id, proc in active_streams.items():
            if proc.poll() is None:
                try:
                    proc.stdin.write(chunk)
                    proc.stdin.flush()
                except Exception as e:
                    logger.error(f"Write failed to channel {channel_id}: {e}")
                    dead_channels.append(channel_id)
            else:
                dead_channels.append(channel_id)
        
        # Cleanup dead streams
        for cid in dead_channels:
            if cid in active_streams:
                del active_streams[cid]
                
        return {"status": "ok", "active_targets": len(active_streams)}
    except Exception as e:
        logger.error(f"Ingest fan-out failed: {e}")
        return {"status": "error", "detail": str(e)}

import tempfile

@router.post("/lofi/start")
async def start_lofi_stream(request: Request):
    """
    Starts a Headless Lofi Station (Server-side FFmpeg).
    Inputs:
    - channel_id: Target Channel
    - rtmp_url: Full RTMP URL
    - background_path: Path to looping video/image
    - playlist: List of audio file paths
    - playback_order: 'sequential' | 'shuffle' (default sequential for now)
    """
    global active_streams
    
    data = await request.json()
    channel_id = data.get("channel_id")
    rtmp_url = data.get("rtmp_url")
    bg_path = data.get("background_path")
    playlist = data.get("playlist", [])
    
    if not channel_id or not rtmp_url or not bg_path:
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    if not os.path.exists(bg_path):
        raise HTTPException(status_code=400, detail=f"Background file not found: {bg_path}")
        
    if not playlist:
        raise HTTPException(status_code=400, detail="Playlist is empty")
        
    # Check if already running
    if channel_id in active_streams:
        proc = active_streams[channel_id]
        if proc.poll() is None:
            return {"status": "already_running", "channel_id": channel_id, "type": "headless"}
        else:
            del active_streams[channel_id]

    # 1. Generate Audio Playlist File for Concat Demuxer
    # Format: file 'path/to/file.mp3'
    try:
        # Create a named temp file that persists so FFmpeg can read it. 
        # We need to manually delete it later or let OS handle it (tempfile default is /tmp)
        # Windows requires closing the file before other process reads it.
        # We use delete=False
        tf = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt', encoding='utf-8')
        for audio_path in playlist:
            if not os.path.exists(audio_path):
                 logger.warning(f"Audio file not found: {audio_path}")
                 continue
            # Escape paths for FFmpeg concat: single quotes and backslashes
            safe_path = audio_path.replace('\\', '/').replace("'", r"'\''")
            tf.write(f"file '{safe_path}'\n")
        tf.close()
        
        playlist_txt_path = tf.name
    except Exception as e:
        logger.error(f"Failed to create playlist file: {e}")
        raise HTTPException(status_code=500, detail="Failed to prepare playlist")

    ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
    
    # 2. Construct FFmpeg Command
    # -stream_loop -1 -i bg.mp4 (Loop Video Infinite)
    # -f concat -safe 0 -i list.txt (Read Audio List)
    # -map 0:v -map 1:a (Map Video from 0, Audio from 1)
    # -c:v libx264 ... -c:a aac ...
    # -shortest (Stop when shortest input ends? No, video is infinite. Audio is finite?)
    # Wait, if Audio ends, we want it to loop? 
    # 'concat' demuxer just plays through. To loop audio playlist, we need -stream_loop -1 on input 1?
    # Yes, -stream_loop -1 before -i list.txt should loop the concat list.
    
    cmd = [
        ffmpeg_exe,
        '-re',
        '-stream_loop', '-1', '-i', bg_path,           # Input 0: Video (Looped)
        '-stream_loop', '-1', '-f', 'concat', '-safe', '0', '-i', playlist_txt_path, # Input 1: Audio Playlist (Looped)
        '-map', '0:v', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '3000k', '-maxrate', '3000k', '-bufsize', '6000k',
        '-pix_fmt', 'yuv420p', '-g', '60',
        '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
        '-f', 'flv',
        rtmp_url
    ]
    
    logger.info(f"Starting Headless Lofi for {channel_id}")
    
    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE, # We might not need stdin but keep it consistent
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE
        )
        active_streams[channel_id] = proc
        
        # We don't delete playlist_txt_path immediately because FFmpeg needs it.
        # Ideally we track it and delete on stop. 
        # For a hack/prototype, we leave it in temp. OS cleans up eventually.
        
        return {"status": "started", "channel_id": channel_id, "mode": "headless"}
    except Exception as e:
        logger.error(f"Failed to start headless stream: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/active")
async def get_active_streams():
    """Returns list of active channel IDs"""
    # Clean up dead ones first
    dead = []
    for cid, proc in active_streams.items():
        if proc.poll() is not None:
            dead.append(cid)
    for d in dead:
        del active_streams[d]
        
    return {"active_channels": list(active_streams.keys())}

@router.post("/stop")
async def stop_stream(request: Request):

    """
    Stops the stream for a specific channel.
    Expects JSON: { "channel_id": "..." }
    """
    global active_streams
    
    data = await request.json()
    channel_id = data.get("channel_id")
    
    if not channel_id:
        raise HTTPException(status_code=400, detail="Missing channel_id")

    if channel_id in active_streams:
        proc = active_streams[channel_id]
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        del active_streams[channel_id]
        
    return {"status": "stopped", "channel_id": channel_id}

# [NEW] File Stream Endpoint for Playback
from fastapi.responses import FileResponse
import mimetypes

@router.get("")
async def stream_video(path: str):
    """
    Stream video file from absolute path.
    Used by frontend for local file playback.
    """
    # Standardized root for Docker
    DOCKER_MEDIA_ROOT = "/app/media"
    
    # 1. Try absolute path as is
    target_path = path

    if not os.path.exists(target_path):
        # 2. Try relative to DOCKER_MEDIA_ROOT (Prioritize this)
        stripped_path = path.lstrip("/\\")
        potential_path = os.path.join(DOCKER_MEDIA_ROOT, stripped_path)
        if os.path.exists(potential_path):
            target_path = potential_path
        else:
            # 3. Special case: If path starts with downloads/ but it's nested
            if "downloads/" in path:
                rel_part = path.split("downloads/")[-1]
                potential_path_dl = os.path.join(DOCKER_MEDIA_ROOT, "downloads", rel_part)
                if os.path.exists(potential_path_dl):
                    target_path = potential_path_dl
            
            # 4. Check temp_storage (For remover system)
            if "temp_storage" in path:
                # If path is already absolute within Docker, it might be /app/apps/api/temp_storage/...
                if os.path.exists(path):
                    target_path = path
                else:
                    # Try resolving relative to apps/api/
                    rel_part = path.split("temp_storage")[-1].lstrip("/\\")
                    potential_temp = os.path.join("/app/apps/api/temp_storage", rel_part)
                    if os.path.exists(potential_temp):
                        target_path = potential_temp

    if not os.path.exists(target_path):
        logger.error(f"Stream 404: Requested: {path} | Resolved: {target_path}")
        raise HTTPException(status_code=404, detail="File not found")
        
    # Security Check: Prevent accessing sensitive system files?
    # For local desktop app, we usually trust the path if it's within expected drives, 
    # but let's at least ensure it's not trying to read system config blindly.
    # However, user assets can be anywhere (F:, C:, D:).
    # We will allow it for now as this is a local tool.
    
    media_type, _ = mimetypes.guess_type(target_path)
    return FileResponse(target_path, media_type=media_type or "application/octet-stream")
