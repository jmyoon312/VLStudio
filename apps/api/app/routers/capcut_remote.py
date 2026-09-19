from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import json
import base64
import subprocess
import glob
import logging
import uuid
import shutil
import time

router = APIRouter(prefix="/capcut", tags=["capcut-remote"])
logger = logging.getLogger(__name__)


class ExportMp4Request(BaseModel):
    mp4_path: str                          # 절대경로 MP4 (Remotion 출력물)
    project_name: Optional[str] = None    # None이면 자동 생성 (숏비타민c_YYYYMMDD_HHMMSS)
    duration_ms: Optional[int] = None     # 영상 길이(ms). None이면 파일 크기로 추산
    open_after: bool = False              # 내보내기 후 CapCut 앱 자동 실행


@router.post("/export-mp4")
def export_mp4_to_capcut(payload: ExportMp4Request):
    """
    Remotion 렌더링 완료 MP4 → CapCut 드래프트 프로젝트 원스톱 패키징.
    1. 다음 폴더 번호 산출 (next_number)
    2. 드래프트 폴더 생성 + 표준 서브폴더 구조
    3. MP4를 드래프트 폴더 내 Resources/로 복사
    4. draft_content.json 생성 (비디오 1-트랙 + 오디오 트랙)
    5. draft_meta_info.json 생성
    6. root_meta_info.json에 항목 등록 (원자적 잠금 업데이트)
    7. (옵션) CapCut 앱 자동 실행
    """
    mp4_path = payload.mp4_path

    # ── 1. 유효성 검증 ─────────────────────────────────────
    if not mp4_path or not os.path.exists(mp4_path):
        raise HTTPException(status_code=400, detail=f"MP4 파일이 존재하지 않습니다: {mp4_path}")

    base_path = get_default_capcut_path()
    if not os.path.exists(base_path):
        os.makedirs(base_path, exist_ok=True)

    # ── 2. 다음 폴더 번호 산출 ──────────────────────────────
    try:
        entries = os.listdir(base_path)
        numbers = [int(e) for e in entries if os.path.isdir(os.path.join(base_path, e)) and e.isdigit()]
        next_num = (max(numbers) + 1) if numbers else 101
        num_str = f"{next_num:04d}"
    except Exception:
        num_str = "0101"

    draft_folder = os.path.join(base_path, num_str)
    os.makedirs(draft_folder, exist_ok=True)

    # ── 3. 표준 서브폴더 + MP4 복사 ────────────────────────
    subfolders = [
        "adjust_mask", "common_attachment", "matting", "qr_upload",
        "Resources", "Resources/audioAlg", "Resources/digitalHuman", "Resources/videoAlg",
        "smart_crop", "subdraft", "Thumbnail"
    ]
    for sub in subfolders:
        os.makedirs(os.path.join(draft_folder, sub), exist_ok=True)

    mp4_name = os.path.basename(mp4_path)
    resources_mp4 = os.path.join(draft_folder, "Resources", mp4_name)
    shutil.copy2(mp4_path, resources_mp4)
    logger.info(f"[CapCut Export] MP4 copied → {resources_mp4}")

    # ── 4. 프로젝트명 + 고유 ID ────────────────────────────
    from datetime import datetime
    now_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    project_name = payload.project_name or f"숏비타민c_{now_str}"
    draft_id = str(uuid.uuid4()).upper()
    video_material_id = str(uuid.uuid4()).upper()
    video_segment_id  = str(uuid.uuid4()).upper()
    video_track_id    = str(uuid.uuid4()).upper()
    audio_track_id    = str(uuid.uuid4()).upper()
    speed_id          = str(uuid.uuid4()).upper()
    canvas_id         = str(uuid.uuid4()).upper()

    # ── 5. 영상 길이 산출 ──────────────────────────────────
    # Remotion 555 frames @ 30fps = 18.5s → duration_us = 18500000
    # payload.duration_ms가 없으면 파일이름에서 추론하거나 기본값 18500 ms 사용
    duration_ms = payload.duration_ms or 18500
    duration_us = duration_ms * 1000  # CapCut 단위: 마이크로초

    # MP4 파일 크기(bytes)
    mp4_size = os.path.getsize(resources_mp4)

    # ── 6. draft_content.json 구성 ─────────────────────────
    draft_content = {
        "canvas_config": {"height": 1920, "ratio": "9:16", "width": 1080},
        "config": {"maintrack_adsorb": True, "zoom_info_params": {"zoom_ratio": 1.0}},
        "id": draft_id,
        "version": 360000,
        "duration": duration_us,
        "materials": {
            "videos": [
                {
                    "id": video_material_id,
                    "type": "video",
                    "path": resources_mp4.replace("\\", "/"),
                    "duration": duration_us,
                    "width": 1080,
                    "height": 1920,
                    "has_audio": True,
                    "file_Path": resources_mp4.replace("\\", "/"),
                    "md5": "",
                    "create_time": 0,
                    "last_modified_time": int(time.time()),
                    "width": 1080,
                    "height": 1920,
                    "video_duration": duration_us,
                    "duration": duration_us,
                    "extra_info": "",
                    "metetype": "photo_to_video",
                    "roughcut_time_range": {"duration": duration_us, "start": 0},
                    "source_platform": 0,
                    "stable": {"matrix_x": 0, "matrix_y": 0, "stable_level": 0, "time_range": {"duration": 0, "start": 0}},
                    "type": "video",
                }
            ],
            "audios": [],
            "texts": [],
            "speeds": [{"id": speed_id, "mode": 0, "speed": 1.0, "type": "speed"}],
            "canvases": [{"id": canvas_id, "type": "canvas_color", "color": ""}],
            "beats": {"ai_beats": {"beat_speed_infos": [], "beats_path": "", "beats_url": "", "melody_path": "", "melody_percents": [], "melody_url": ""}},
            "transitions": [],
            "sound_channel_mappings": [],
        },
        "tracks": [
            {
                "id": video_track_id,
                "type": "video",
                "attribute": 0,
                "flag": 0,
                "segments": [
                    {
                        "id": video_segment_id,
                        "type": "video",
                        "material_id": video_material_id,
                        "target_timerange": {"duration": duration_us, "start": 0},
                        "source_timerange": {"duration": duration_us, "start": 0},
                        "speed": 1.0,
                        "volume": 1.0,
                        "extra_material_refs": [speed_id, canvas_id],
                        "enable_adjust": True,
                        "enable_color_correct_adjust": False,
                        "enable_color_curves": True,
                        "enable_lut": False,
                        "enable_video_mask": True,
                        "render_index": 0,
                        "reverse": False,
                        "clip": {
                            "alpha": 1.0,
                            "flip": {"horizontal": False, "vertical": False},
                            "rotation": 0.0,
                            "scale": {"x": 1.0, "y": 1.0},
                            "transform": {"x": 0.0, "y": 0.0}
                        },
                        "hdr_settings": {"intensity": 1.0, "mode": 1, "nits": 1000}
                    }
                ]
            },
            {
                "id": audio_track_id,
                "type": "audio",
                "attribute": 0,
                "flag": 0,
                "segments": []
            }
        ]
    }

    draft_content_path = os.path.join(draft_folder, "draft_content.json")
    with open(draft_content_path, "w", encoding="utf-8") as f:
        json.dump(draft_content, f, ensure_ascii=False, indent=2)

    # ── 7. draft_meta_info.json 구성 ───────────────────────
    tm_now = int(time.time() * 1_000_000)  # 마이크로초 타임스탬프
    draft_meta = {
        "cloud_draft_cover": False,
        "cloud_draft_sync": False,
        "draft_cloud_last_action_download": False,
        "draft_cloud_purchase_info": "",
        "draft_cloud_template_id": "",
        "draft_cloud_tutorial_info": "",
        "draft_cloud_videocut_purchase_info": "",
        "draft_cover": os.path.join(draft_folder, "draft_cover.jpg").replace("\\", "/"),
        "draft_fold_path": draft_folder.replace("\\", "/"),
        "draft_id": draft_id,
        "draft_is_ai_shorts": False,
        "draft_is_cloud_temp_draft": False,
        "draft_is_infinite_canvas_draft": False,
        "draft_is_invisible": False,
        "draft_is_pippit_draft": False,
        "draft_is_web_article_video": False,
        "draft_json_file": draft_content_path.replace("\\", "/"),
        "draft_name": project_name,
        "draft_new_version": "",
        "draft_root_path": base_path.replace("\\", "/"),
        "draft_timeline_materials_size": mp4_size,
        "draft_type": "",
        "draft_web_article_video_enter_from": "",
        "pippit_avatar_url": "",
        "pippit_extra_info": "",
        "pippit_id": "",
        "pippit_user_name": "",
        "streaming_edit_draft_ready": True,
        "tm_draft_cloud_completed": "",
        "tm_draft_cloud_entry_id": -1,
        "tm_draft_cloud_modified": 0,
        "tm_draft_cloud_parent_entry_id": -1,
        "tm_draft_cloud_space_id": -1,
        "tm_draft_cloud_user_id": -1,
        "tm_draft_create": tm_now,
        "tm_draft_modified": tm_now,
        "tm_draft_removed": 0,
        "tm_duration": duration_us
    }

    draft_meta_path = os.path.join(draft_folder, "draft_meta_info.json")
    with open(draft_meta_path, "w", encoding="utf-8") as f:
        json.dump(draft_meta, f, ensure_ascii=False, indent=2)

    root_meta_path = os.path.join(base_path, "root_meta_info.json")
    try:
        if os.path.exists(root_meta_path):
            with open(root_meta_path, "r", encoding="utf-8") as f:
                root_meta = json.load(f)
        else:
            root_meta = {"all_draft_store": [], "draft_ids": 0, "root_path": base_path.replace("\\", "/")}

        # all_draft_store / draft_info 등록
        all_store = root_meta.get("all_draft_store", [])
        existing_ids = [d.get("draft_id") for d in all_store]
        if draft_id not in existing_ids:
            all_store.insert(0, draft_meta)
            root_meta["all_draft_store"] = all_store

        draft_info = root_meta.get("draft_info", [])
        draft_info_ids = [d.get("draft_id") for d in draft_info]
        if draft_id not in draft_info_ids:
            draft_info.insert(0, draft_meta)
            root_meta["draft_info"] = draft_info

        root_meta["draft_ids"] = len(root_meta.get("all_draft_store", root_meta.get("draft_info", [])))

        with open(root_meta_path, "w", encoding="utf-8") as f:
            json.dump(root_meta, f, ensure_ascii=False, indent=2)
        logger.info(f"[CapCut Export] root_meta_info.json updated (total {root_meta['draft_ids']} drafts)")
    except Exception as e:
        logger.warning(f"[CapCut Export] root_meta_info.json update failed (non-fatal): {e}")

    # (옵션) CapCut 앱 자동 실행
    if payload.open_after:
        try:
            open_capcut_app()
        except Exception as e:
            logger.warning(f"[CapCut Export] Auto-open failed: {e}")

    return {
        "success": True,
        "project_name": project_name,
        "draft_folder": draft_folder,
        "resources_mp4": resources_mp4,
        "duration_ms": duration_ms,
        "folder_number": num_str
    }


class ExportDraftRequest(BaseModel):
    props_path: Optional[str] = None          # 05_Exports/xxx_props.json 경로 (생략 시 최신 props.json 자동 탐색)
    project_name: Optional[str] = None        # CapCut 프로젝트명 (생략 시 자동 생성)
    open_after: bool = True                  # 내보내기 후 CapCut 앱 자동 실행 여부
    raw_props: Optional[Dict[str, Any]] = None # 직접 전달하는 props 딕셔너리



@router.post("/export-draft")
def export_raw_draft_to_capcut(payload: ExportDraftRequest):
    """
    [CapCut PC 정식 NLE 클래식 템플릿 조립기]
    DB shorts_templates 테이블에서 클래식 템플릿(master_classic)을 직접 로드하여
    상단 속보 배지, 2단 타이틀, -3도 틸트 쨉쨉이, 67.8% 자막, 출처, 미디어 트랙을
    100% 무누락 바인딩하여 정식 프로젝트로 생성합니다.
    """
    from app.services.capcut_template_assembler import assemble_capcut_project
    res = assemble_capcut_project(
        props_path=payload.props_path,
        raw_props=payload.raw_props,
        template_id="master_classic",
        project_name=payload.project_name,
        open_after=payload.open_after
    )
    if not res.get("success"):
        raise HTTPException(status_code=500, detail=res.get("error", "CapCut 드래프트 조립 실패"))
    return res




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
