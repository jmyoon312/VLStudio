from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
import base64
import subprocess
import glob
import logging

router = APIRouter(prefix="/capcut", tags=["capcut-remote"])
logger = logging.getLogger(__name__)

def get_default_capcut_path() -> str:
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    if local_app_data:
        p = os.path.join(local_app_data, "CapCut", "User Data", "Projects", "com.lveditor.draft")
        if os.path.exists(p):
            return p
        # Candidate fallback
        cand = os.path.join(local_app_data, "JianyingPro", "User Data", "Projects", "com.lveditor.draft")
        if os.path.exists(cand):
            return cand
        return p
    return "C:\\CapCut Projects"

@router.get("/detect-path")
def detect_capcut_path():
    path = get_default_capcut_path()
    exists = os.path.exists(path)
    return {"success": True, "basePath": path, "exists": exists}

@router.get("/next-number")
def get_next_project_number():
    base_path = get_default_capcut_path()
    if not os.path.exists(base_path):
        return {"success": True, "nextNumber": "0101", "folderName": "0101", "folderPath": os.path.join(base_path, "0101")}
    
    try:
        entries = os.listdir(base_path)
        numbers = []
        for e in entries:
            full = os.path.join(base_path, e)
            if os.path.isdir(full) and e.isdigit():
                try:
                    numbers.append(int(e))
                except ValueError:
                    pass
        if numbers:
            next_num = max(numbers) + 1
            num_str = f"{next_num:04d}"
        else:
            num_str = "0101"
        return {
            "success": True,
            "nextNumber": num_str,
            "folderName": num_str,
            "folderPath": os.path.join(base_path, num_str)
        }
    except Exception as e:
        logger.error(f"[CapCut Remote] Error calculating next number: {e}")
        return {"success": False, "error": str(e), "nextNumber": "0101", "folderPath": os.path.join(base_path, "0101")}

class WriteCapcutRequest(BaseModel):
    targetPath: str
    draftInfo: Optional[Dict[str, Any]] = None
    draftContent: Optional[Dict[str, Any]] = None
    draftMetaInfo: Optional[Dict[str, Any]] = None
    timelineLayout: Optional[Dict[str, Any]] = None
    extraFiles: Optional[Dict[str, Any]] = None
    mediaFiles: Optional[List[Dict[str, Any]]] = None
    srtContent: Optional[str] = None
    srtFilename: Optional[str] = "subtitles.srt"

@router.post("/export-remote")
def export_remote_capcut_project(payload: WriteCapcutRequest):
    try:
        target_path = payload.targetPath
        if not target_path:
            raise HTTPException(status_code=400, detail="targetPath is required")

        os.makedirs(target_path, exist_ok=True)
        
        # Standard subfolders
        subfolders = [
            "adjust_mask", "common_attachment", "matting", "qr_upload",
            "Resources", "Resources/audioAlg", "Resources/digitalHuman", "Resources/videoAlg",
            "smart_crop", "subdraft", "Thumbnail"
        ]
        for sub in subfolders:
            os.makedirs(os.path.join(target_path, sub), exist_ok=True)

        final_draft_info = payload.draftInfo or payload.draftContent
        if final_draft_info:
            with open(os.path.join(target_path, "draft_content.json"), "w", encoding="utf-8") as f:
                json.dump(final_draft_info, f, ensure_ascii=False, indent=2)

        if payload.draftMetaInfo:
            with open(os.path.join(target_path, "draft_meta_info.json"), "w", encoding="utf-8") as f:
                json.dump(payload.draftMetaInfo, f, ensure_ascii=False, indent=2)

        # Write SRT
        if payload.srtContent:
            srt_name = payload.srtFilename or "subtitles.srt"
            with open(os.path.join(target_path, srt_name), "w", encoding="utf-8") as f:
                f.write(payload.srtContent)

        # Write Media Files if base64 provided
        if payload.mediaFiles:
            for item in payload.mediaFiles:
                fname = item.get("name")
                b64 = item.get("data")
                if fname and b64:
                    clean_b64 = b64.split(",")[-1] if "," in b64 else b64
                    try:
                        raw_data = base64.b64decode(clean_b64)
                        dest = os.path.join(target_path, fname)
                        with open(dest, "wb") as mf:
                            mf.write(raw_data)
                    except Exception as me:
                        logger.warning(f"[CapCut Remote] Failed to write media {fname}: {me}")

        logger.info(f"[CapCut Remote] Successfully wrote project to {target_path}")
        return {"success": True, "targetPath": target_path}
    except Exception as e:
        logger.error(f"[CapCut Remote] Export failed: {e}")
        return {"success": False, "error": str(e)}

@router.post("/open")
def open_capcut_app():
    """Launches the CapCut Desktop App on the Host PC."""
    local_app_data = os.environ.get("LOCALAPPDATA", "")
    candidates = [
        os.path.join(local_app_data, "CapCut", "Apps", "CapCut.exe"),
        os.path.join(local_app_data, "JianyingPro", "Apps", "JianyingPro.exe"),
        "C:\\Program Files\\CapCut\\CapCut.exe"
    ]
    
    # Try dynamic pattern search
    glob_patterns = [
        os.path.join(local_app_data, "CapCut", "Apps", "*", "CapCut.exe"),
        os.path.join(local_app_data, "JianyingPro", "Apps", "*", "JianyingPro.exe"),
    ]
    for pattern in glob_patterns:
        matches = glob.glob(pattern)
        if matches:
            candidates = matches + candidates

    for app in candidates:
        if os.path.exists(app):
            try:
                subprocess.Popen([app], shell=True)
                return {"success": True, "path": app}
            except Exception as e:
                logger.error(f"[CapCut Open] Failed to launch {app}: {e}")
                
    return {"success": False, "error": "CapCut executable not found on server PC"}
