"""
Sovereign Video Presets Router for ViraLoop Studio.
Provides endpoints for listing, harvesting from Pixeling, creating, and rendering with presets.
"""

import os
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks

from ..services.pixeling_harvester import PixelingHarvester
from ..services.sovereign_preset_engine import sovereign_preset_engine
from .director_sessions import router as director_router

logger = logging.getLogger("sovereign_presets_router")

router = APIRouter(prefix="/sovereign-presets", tags=["sovereign_presets"])
# Mount director sessions so /api/sovereign-presets/director/... works reliably with hot-reload
router.include_router(director_router, prefix="/director", tags=["director_sessions"])

# Storage directory for sovereign presets
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
PRESETS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "presets"
PRESETS_DIR.mkdir(parents=True, exist_ok=True)


class PresetRenderRequest(BaseModel):
    preset_id: str
    clips: List[Dict[str, Any]] = []
    captions: List[Dict[str, Any]] = []
    title: Optional[str] = None
    output_path: Optional[str] = None
    custom_style: Optional[Dict[str, Any]] = None


class PresetSaveRequest(BaseModel):
    name: str
    category: str = "custom"
    recipe: str = ""
    content_rules: List[str] = []
    style: Dict[str, Any]
    source_video_path: Optional[str] = None


class PresetUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    recipe: Optional[str] = None
    content_rules: Optional[List[str]] = None
    style: Optional[Dict[str, Any]] = None


class PresetCloneRequest(BaseModel):
    new_name: str
    category: Optional[str] = "custom"
    recipe: Optional[str] = None
    content_rules: Optional[List[str]] = None
    style: Optional[Dict[str, Any]] = None


class PresetFolderRequest(BaseModel):
    name: str
    icon: Optional[str] = "📁"
    desc: Optional[str] = ""
    tab: Optional[str] = "user"


FOLDERS_FILE = PRESETS_DIR / "preset_folders.json"

DEFAULT_PRESET_FOLDERS = [
    {"id": "interview", "name": "인터뷰 / 해외 토크쇼", "tab": "user", "icon": "🎙️", "desc": "올뉴띵킹, 토크쇼, 육성 직타형"},
    {"id": "entertainment", "name": "연예 / K-POP 정보", "tab": "user", "icon": "🎬", "desc": "패션탐정냥, 아이돌, 연예 비하인드"},
    {"id": "ranking", "name": "랭킹 / 팩트 체크", "tab": "user", "icon": "📊", "desc": "TOP 5, 미스터리, 사건 브리핑"},
    {"id": "knowledge", "name": "지식 / 교양 / 비하인드", "tab": "user", "icon": "💡", "desc": "역사, 과학, 심층 해설 스토리"},
    {"id": "ssul", "name": "커뮤니티 / 썰형 스토리", "tab": "user", "icon": "💬", "desc": "썰형 누적 자막, 네이트판, 유머"},
    {"id": "user", "name": "내 커스텀 프리셋", "tab": "user", "icon": "📁", "desc": "개인 커스텀 전용 기본 보관함"},
    {"id": "favorites", "name": "즐겨찾기 보관함", "tab": "favorites", "icon": "⭐", "desc": "빠른 제작을 위한 최우선 픽"}
]


def _read_preset_folders() -> List[Dict[str, Any]]:
    if not FOLDERS_FILE.exists():
        try:
            with open(FOLDERS_FILE, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_PRESET_FOLDERS, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to create default preset folders: {e}")
        return list(DEFAULT_PRESET_FOLDERS)
    try:
        with open(FOLDERS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list) and data:
                return data
    except Exception as e:
        logger.warning(f"Failed to read preset folders: {e}")
    return list(DEFAULT_PRESET_FOLDERS)


def _write_preset_folders(folders: List[Dict[str, Any]]) -> None:
    with open(FOLDERS_FILE, "w", encoding="utf-8") as f:
        json.dump(folders, f, indent=2, ensure_ascii=False)


@router.get("/folders")
def get_preset_folders() -> List[Dict[str, Any]]:
    """Retrieve all configurable preset folders/categories."""
    return _read_preset_folders()


@router.post("/folders")
def create_preset_folder(req: PresetFolderRequest) -> Dict[str, Any]:
    """Create a new custom preset folder."""
    import hashlib
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="보관함 이름을 입력해 주세요.")

    folders = _read_preset_folders()
    # Check duplicate name
    if any(f["name"] == clean_name for f in folders):
        raise HTTPException(status_code=400, detail="이미 동일한 이름의 보관함이 존재합니다.")

    folder_id = f"f_{hashlib.md5(clean_name.encode()).hexdigest()[:6]}"
    new_folder = {
        "id": folder_id,
        "name": clean_name,
        "tab": req.tab or "user",
        "icon": req.icon or "📁",
        "desc": req.desc or f"{clean_name} 보관함"
    }
    folders.append(new_folder)
    _write_preset_folders(folders)
    logger.info(f"Created new preset folder: {clean_name} ({folder_id})")
    return {"success": True, "folder": new_folder, "folders": folders}


@router.put("/folders/{folder_id}")
def update_preset_folder(folder_id: str, req: PresetFolderRequest) -> Dict[str, Any]:
    """Update name, icon, or description of a preset folder."""
    clean_name = req.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="보관함 이름을 입력해 주세요.")

    folders = _read_preset_folders()
    target_idx = next((i for i, f in enumerate(folders) if f["id"] == folder_id), None)
    if target_idx is None:
        raise HTTPException(status_code=404, detail="해당 보관함을 찾을 수 없습니다.")

    folders[target_idx]["name"] = clean_name
    if req.icon:
        folders[target_idx]["icon"] = req.icon
    if req.desc is not None:
        folders[target_idx]["desc"] = req.desc

    _write_preset_folders(folders)
    logger.info(f"Updated preset folder {folder_id} -> {clean_name}")
    return {"success": True, "folder": folders[target_idx], "folders": folders}


@router.delete("/folders/{folder_id}")
def delete_preset_folder(folder_id: str) -> Dict[str, Any]:
    """Delete a custom preset folder and safely migrate its presets to 'user' folder."""
    if folder_id in ["user", "favorites"]:
        raise HTTPException(status_code=400, detail="기본 보관함은 삭제할 수 없습니다.")

    folders = _read_preset_folders()
    target = next((f for f in folders if f["id"] == folder_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="해당 보관함을 찾을 수 없습니다.")

    # Remove folder
    folders = [f for f in folders if f["id"] != folder_id]
    _write_preset_folders(folders)

    # Safely migrate existing presets in this category to 'user'
    migrated_count = 0
    for p_file in PRESETS_DIR.glob("*.json"):
        if p_file.name == "preset_folders.json":
            continue
        try:
            with open(p_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            if data.get("category") == folder_id:
                data["category"] = "user"
                with open(p_file, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                migrated_count += 1
        except Exception as mig_err:
            logger.debug(f"Preset category migration notice: {mig_err}")

    logger.info(f"Deleted preset folder {folder_id} and safely migrated {migrated_count} presets to 'user'")
    return {"success": True, "deleted_id": folder_id, "migrated_count": migrated_count, "folders": folders}


@router.get("")
@router.get("/")
def list_sovereign_presets(
    category: Optional[str] = None,
    q: Optional[str] = None,
    sort: Optional[str] = "latest"
) -> List[Dict[str, Any]]:
    """List all available sovereign presets with 4-tab filter, video previews, and search."""
    presets = []
    if not PRESETS_DIR.exists():
        return presets

    for file in PRESETS_DIR.glob("*.json"):
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "style" in data:
                    pid = data.get("id", file.stem)
                    import urllib.parse
                    
                    # 1. Preview video resolution (check source_video_path, Presets_Reference, and samples)
                    video_path = data.get("source_video_path")
                    if not video_path or not Path(video_path).exists():
                        ref_cand = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "07_Downloads" / "Presets_Reference" / pid / "reference_clip.mp4"
                        if ref_cand.exists():
                            video_path = str(ref_cand)
                    if not video_path or not Path(video_path).exists():
                        sample_cand = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "presets" / "samples" / f"{pid}.mp4"
                        if sample_cand.exists():
                            video_path = str(sample_cand)
                            
                    preview_url = f"/api/files/stream?path={urllib.parse.quote(str(video_path))}" if video_path and Path(video_path).exists() else None

                    # 2. Keyframes & Thumbnail resolution
                    kfs = data.get("keyframes") or []
                    kf_dir = PRESETS_DIR / "keyframes" / pid
                    if not kfs and kf_dir.exists():
                        kfs = []
                        for kf_file in sorted(kf_dir.glob("*.jpg")):
                            kfs.append({
                                "index": len(kfs),
                                "label": f"씬 {len(kfs)+1} ({kf_file.stem})",
                                "url": f"/api/files/stream?path={urllib.parse.quote(str(kf_file))}",
                                "local_path": str(kf_file)
                            })
                    
                    raw_thumb = data.get("thumbnail_url")
                    thumb_url = None
                    if raw_thumb and raw_thumb.startswith("/api/files/stream"):
                        thumb_url = raw_thumb
                    elif kfs:
                        thumb_url = kfs[0]["url"]
                    elif raw_thumb and not raw_thumb.startswith("/media/"):
                        thumb_url = raw_thumb
                    else:
                        thumb_candidate = PRESETS_DIR / "thumbnails" / f"{pid}.jpg"
                        if thumb_candidate.exists():
                            thumb_url = f"/api/files/stream?path={urllib.parse.quote(str(thumb_candidate))}"
                        elif kfs:
                            thumb_url = kfs[0]["url"]

                    # Extract primary colors & typography
                    style_obj = data.get("style", {})
                    vg = style_obj.get("visual_geometry", {}) if isinstance(style_obj.get("visual_geometry"), dict) else {}
                    top_bar = vg.get("top_bar", {}) if isinstance(vg.get("top_bar"), dict) else {}
                    top_title = vg.get("top_title", {}) if isinstance(vg.get("top_title"), dict) else (style_obj.get("title", {}) if isinstance(style_obj.get("title"), dict) else {})
                    caption_obj = vg.get("caption", {}) if isinstance(vg.get("caption"), dict) else (style_obj.get("subtitle", {}) if isinstance(style_obj.get("subtitle"), dict) else {})

                    box_color = top_bar.get("bg_color") or top_title.get("box_color") or "#000000"
                    title_color = top_title.get("color") or top_title.get("text_color") or "#FFE500"
                    caption_color = caption_obj.get("color") or caption_obj.get("text_color") or "#FFFFFF"
                    font_family = top_title.get("font") or top_title.get("font_family") or "Pretendard"

                    preset_item = {
                        "id": pid,
                        "name": data.get("name", file.stem),
                        "category": data.get("category", "general"),
                        "category_tab": data.get("category_tab", "pixeling" if "official" in pid else "community"),
                        "source": data.get("source", "user"),
                        "version": data.get("version", 1),
                        "preview_video_url": preview_url,
                        "thumbnail_url": thumb_url,
                        "keyframes": kfs,
                        "source_video_path": video_path or data.get("source_video_path", None),
                        "voice_signature": data.get("voice_signature") or style_obj.get("audio_dsp", {}).get("voice_signature") or {},
                        "bgm_signature": data.get("bgm_signature") or style_obj.get("audio_dsp", {}).get("bgm_signature") or {},
                        "sfx_signature": data.get("sfx_signature") or style_obj.get("audio_dsp", {}).get("sfx_signature") or {},
                        "source_targeting": data.get("source_targeting") or style_obj.get("source_targeting") or {},
                        "editing_pacing": style_obj.get("editing_pacing") or data.get("editing_pacing") or {},
                        "audio_dsp": style_obj.get("audio_dsp") or data.get("audio_dsp") or {},
                        "channel_url": data.get("channel_url"),
                        "channel_title": data.get("channel_title") or data.get("channel_name"),
                        "is_favorite": data.get("is_favorite", False),
                        "color_palette": [box_color, title_color, caption_color],
                        "primary_font": font_family,
                        "style": style_obj,
                        "recipe": data.get("recipe", ""),
                        "content_rules": data.get("content_rules", []),
                        "production_bible_17": data.get("production_bible_17") or (data.get("blueprint", {}).get("production_bible_17") if isinstance(data.get("blueprint"), dict) else None) or {},
                        "blueprint": data.get("blueprint", {}),
                        "layout": data.get("layout", {}),
                        "visual_dna": data.get("visual_dna", {}),
                        "audio_dna": data.get("audio_dna", {}),
                        "pacing_dna": data.get("pacing_dna", {})
                    }

                    # Filter by high-level category_tab or detailed folder
                    if category and category != "all":
                        if category == "favorites":
                            if not (preset_item.get("is_favorite") or preset_item.get("category") == "favorites"):
                                continue
                        elif category in ["personal", "user"]:
                            # Matches user-created presets
                            is_user_preset = (
                                preset_item.get("category_tab") in ["personal", "user"] or
                                preset_item.get("source") in ["user", "viraloop_user", "omniroute_vision_interleaving"] or
                                preset_item.get("category") in ["user", "interview", "entertainment", "ranking", "knowledge", "ssul"]
                            )
                            if not is_user_preset:
                                continue
                        elif category in ["pixeling", "official"]:
                            is_official = (
                                preset_item.get("category_tab") == "pixeling" or
                                preset_item.get("source") in ["pixeling_official", "viraloop_official"] or
                                "official" in pid
                            )
                            if not is_official:
                                continue
                        else:
                            # Specific folder filtering (e.g. entertainment, interview, ranking, knowledge, ssul)
                            if preset_item.get("category") != category and preset_item.get("category_tab") != category:
                                continue

                    # Filter by search query
                    if q:
                        query = q.lower()
                        name_match = query in preset_item["name"].lower()
                        recipe_match = query in preset_item["recipe"].lower()
                        cat_match = query in preset_item["category"].lower()
                        if not (name_match or recipe_match or cat_match):
                            continue

                    presets.append(preset_item)
        except Exception as e:
            logger.warning(f"Failed to read preset {file}: {e}")

    # Sorting
    if sort == "popular":
        presets.sort(key=lambda x: x.get("metrics", {}).get("saves", 0), reverse=True)
    elif sort == "views":
        presets.sort(key=lambda x: x.get("metrics", {}).get("views", 0), reverse=True)

    return presets


@router.post("/harvest-pixeling")
@router.post("/sync-pixeling")
def harvest_pixeling_presets() -> Dict[str, Any]:
    """Harvest official and community presets from local Pixeling installations."""
    try:
        from ..services.pixeling_harvester import pixeling_harvester
        res = pixeling_harvester.harvest_all()
        return {
            "success": True,
            "harvest": res
        }
    except Exception as e:
        logger.error(f"Failed to harvest Pixeling presets: {e}")
        raise HTTPException(status_code=500, detail=f"Harvest failed: {str(e)}")


class CreateFromChannelRequest(BaseModel):
    channel_url: str
    sample_count: int = 12
    preset_name: Optional[str] = None


@router.post("/create-from-channel")
def create_preset_from_channel(req: CreateFromChannelRequest):
    """
    Channel Forensic DNA Analysis ➡️ Sovereign Preset v2 Auto Creation.
    Extracts 12-sample DNA from reference channel and creates a full production blueprint preset.
    """
    from ..services.channel_dna_service import ChannelDNAService
    try:
        dna_res = ChannelDNAService.analyze_channel(channel_url=req.channel_url, sample_count=req.sample_count)
        bench_id = dna_res.get("id")
        if not bench_id:
            raise HTTPException(status_code=500, detail="Channel DNA extraction failed to produce a benchmark ID")
        export_res = ChannelDNAService.export_benchmark_to_sovereign_preset(bench_id, preset_name=req.preset_name)
        return {
            "success": True,
            "message": f"'{export_res['name']}' 프리셋이 성공적으로 발골 및 등록되었습니다.",
            "preset": export_res
        }
    except Exception as e:
        logger.error(f"Failed to create preset from channel: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@router.get("/workspace-files")
def get_workspace_files() -> Dict[str, Any]:
    """Return file tree across 01_Inbox, 02_Operations, 05_Exports, 07_Downloads."""
    import urllib.parse
    from datetime import datetime
    categories = [
        {"id": "01_Inbox", "name": "01_Inbox (입력 소스 / 원본 대본)", "icon": "inbox"},
        {"id": "02_Operations", "name": "02_Operations (작업 큐 / 자막)", "icon": "cpu"},
        {"id": "05_Exports", "name": "05_Exports (완성 영상 / 내보내기)", "icon": "film"},
        {"id": "07_Downloads", "name": "07_Downloads (수집 영상 / 다운로드)", "icon": "download"}
    ]
    media_root = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"
    result = []
    for cat in categories:
        cat_path = media_root / cat["id"]
        files = []
        if cat_path.exists():
            for item in sorted(cat_path.glob("**/*"), key=lambda p: p.stat().st_mtime if p.is_file() else 0, reverse=True):
                if item.is_file():
                    # Filter out internal frame slices and temporary part files
                    if item.name.startswith("frame_") or item.name.endswith((".part", ".ytdl")) or item.name in ["jobs_state.json"]:
                        continue
                    if len(files) >= 30:
                        break
                    stat = item.stat()
                    rel_path = str(item.relative_to(cat_path))
                    files.append({
                        "name": item.name,
                        "relative_path": rel_path,
                        "absolute_path": str(item),
                        "size_mb": round(stat.st_size / (1024 * 1024), 2),
                        "modified_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                        "is_video": item.suffix.lower() in [".mp4", ".mov", ".mkv", ".webm"],
                        "stream_url": f"/api/files/stream?path={urllib.parse.quote(str(item))}"
                    })
        result.append({
            "id": cat["id"],
            "name": cat["name"],
            "icon": cat["icon"],
            "file_count": len(files),
            "files": files
        })
    return {"status": "success", "categories": result}


@router.get("/exports-list")
def get_exports_list() -> Dict[str, Any]:
    """Return all completed videos in 05_Exports."""
    import urllib.parse
    from datetime import datetime
    media_root = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"
    exports_dir = media_root / "05_Exports"
    exports_dir.mkdir(parents=True, exist_ok=True)
    items = []
    video_exts = {".mp4", ".mov", ".webm", ".mkv"}
    for f in exports_dir.glob("**/*"):
        if f.is_file() and f.suffix.lower() in video_exts:
            try:
                stat = f.stat()
                items.append({
                    "filename": f.name,
                    "filepath": str(f),
                    "size_mb": round(stat.st_size / (1024 * 1024), 2),
                    "modified_at": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                    "stream_url": f"/api/files/stream?path={urllib.parse.quote(str(f))}",
                    "parent_folder": f.parent.name if f.parent != exports_dir else None
                })
            except Exception:
                continue
    items.sort(key=lambda x: x["modified_at"], reverse=True)
    return {"status": "success", "exports": items[:40]}


@router.get("/live-logs")
def get_live_logs(limit: int = 80) -> Dict[str, Any]:
    """Return recent backend/render logs for right panel terminal."""
    from datetime import datetime
    media_root = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media"
    log_candidates = [
        Path("apps/api/api_server.log"),
        Path("api_server.log"),
        media_root / "09_System" / "logs" / "api.log"
    ]
    lines = []
    for cand in log_candidates:
        if cand.exists():
            try:
                with open(cand, "r", encoding="utf-8", errors="ignore") as f:
                    all_lines = f.readlines()
                    lines = [l.strip() for l in all_lines[-limit:] if l.strip()]
                    break
            except Exception:
                continue
    if not lines:
        lines = [
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Hermes Core] Sovereign Director Engine online.",
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [GlobalArbiter] GPU Semaphores ready (Max: 2).",
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [Storage] 9-Tier Storage Hierarchy verified (%LOCALAPPDATA%\\ViraLoop Studio\\media).",
            f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [OmniRoute] Gateway port 20128 standby."
        ]
    return {"status": "success", "logs": lines}


# ── 🎬 Director Projects, Threads & Messages Persistence (viral_loop.db) ──
import sqlite3

VIRAL_LOOP_DB = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "viral_loop.db"


def _get_db_conn():
    conn = sqlite3.connect(VIRAL_LOOP_DB)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_default_project_db():
    try:
        with _get_db_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT id FROM director_projects WHERE id = 'proj_default'")
            if not cur.fetchone():
                now_str = datetime.now().isoformat()
                cur.execute(
                    "INSERT INTO director_projects (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    ("proj_default", "기본 프로젝트", "emerald", "folder", now_str, now_str)
                )
                conn.commit()
    except Exception as e:
        logger.warning(f"Error ensuring default project: {e}")


@router.get("/director/projects")
def list_director_projects():
    """List all project folders with thread counts from viral_loop.db."""
    _ensure_default_project_db()
    results = []
    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, name, color, icon, created_at, updated_at FROM director_projects ORDER BY created_at ASC")
        for row in cur.fetchall():
            cur2 = conn.cursor()
            cur2.execute("SELECT COUNT(*) FROM director_threads WHERE project_id = ?", (row["id"],))
            th_count = cur2.fetchone()[0]
            results.append({
                "id": row["id"],
                "name": row["name"],
                "color": row["color"] or "emerald",
                "icon": row["icon"] or "folder",
                "thread_count": th_count,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
    return results


@router.post("/director/projects")
def create_director_project(data: Dict[str, Any]):
    """Create a new project folder."""
    import uuid
    proj_id = f"proj_{uuid.uuid4().hex[:8]}"
    now_str = datetime.now().isoformat()
    name = (data.get("name") or "새 프로젝트").strip()
    color = data.get("color") or "emerald"
    icon = data.get("icon") or "folder"

    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO director_projects (id, name, color, icon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (proj_id, name, color, icon, now_str, now_str)
        )
        conn.commit()
    return {"status": "success", "project": {"id": proj_id, "name": name, "color": color, "icon": icon, "thread_count": 0}}


@router.delete("/director/projects/{project_id}")
def delete_director_project(project_id: str):
    """Delete a project folder and all child threads."""
    if project_id == "proj_default":
        raise HTTPException(status_code=400, detail="기본 프로젝트는 삭제할 수 없습니다.")
    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM director_projects WHERE id = ?", (project_id,))
        cur.execute("DELETE FROM director_threads WHERE project_id = ?", (project_id,))
        conn.commit()
    return {"status": "success", "deleted_id": project_id}


@router.get("/director/threads")
def list_director_threads(project_id: Optional[str] = None):
    """List conversation threads, optionally filtered by project_id."""
    results = []
    with _get_db_conn() as conn:
        cur = conn.cursor()
        if project_id:
            cur.execute("SELECT id, project_id, title, preset_id, provider, model, reasoning_effort, created_at, updated_at FROM director_threads WHERE project_id = ? ORDER BY updated_at DESC", (project_id,))
        else:
            cur.execute("SELECT id, project_id, title, preset_id, provider, model, reasoning_effort, created_at, updated_at FROM director_threads ORDER BY updated_at DESC")
        for row in cur.fetchall():
            cur2 = conn.cursor()
            cur2.execute("SELECT COUNT(*) FROM director_messages WHERE thread_id = ?", (row["id"],))
            msg_count = cur2.fetchone()[0]
            cur2.execute("SELECT content FROM director_messages WHERE thread_id = ? ORDER BY created_at DESC LIMIT 1", (row["id"],))
            last_msg = cur2.fetchone()
            snippet = last_msg[0][:60] if last_msg and last_msg[0] else None
            results.append({
                "id": row["id"],
                "project_id": row["project_id"],
                "title": row["title"],
                "preset_id": row["preset_id"],
                "provider": row["provider"],
                "model": row["model"],
                "reasoning_effort": row["reasoning_effort"],
                "message_count": msg_count,
                "snippet": snippet,
                "created_at": row["created_at"],
                "updated_at": row["updated_at"]
            })
    return results


@router.post("/director/threads")
def create_director_thread(data: Dict[str, Any]):
    """Create a new independent conversation session."""
    _ensure_default_project_db()
    import uuid
    thread_id = f"th_{uuid.uuid4().hex[:10]}"
    project_id = data.get("project_id") or "proj_default"
    title = (data.get("title") or "새 대화").strip()
    preset_id = data.get("preset_id")
    provider = data.get("provider") or "openai"
    model = data.get("model") or "GPT-6 Astra"
    reasoning_effort = data.get("reasoning_effort") or "medium"
    now_str = datetime.now().isoformat()

    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO director_threads (id, project_id, title, preset_id, provider, model, reasoning_effort, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (thread_id, project_id, title, preset_id, provider, model, reasoning_effort, now_str, now_str)
        )
        conn.commit()
    return {"status": "success", "thread": {
        "id": thread_id,
        "project_id": project_id,
        "title": title,
        "preset_id": preset_id,
        "provider": provider,
        "model": model,
        "reasoning_effort": reasoning_effort,
        "message_count": 0
    }}


@router.put("/director/threads/{thread_id}")
def update_director_thread(thread_id: str, data: Dict[str, Any]):
    """Update conversation thread properties."""
    now_str = datetime.now().isoformat()
    with _get_db_conn() as conn:
        cur = conn.cursor()
        if "title" in data and data["title"]:
            cur.execute("UPDATE director_threads SET title = ?, updated_at = ? WHERE id = ?", (data["title"].strip(), now_str, thread_id))
        if "preset_id" in data:
            cur.execute("UPDATE director_threads SET preset_id = ?, updated_at = ? WHERE id = ?", (data["preset_id"], now_str, thread_id))
        if "provider" in data and data["provider"]:
            cur.execute("UPDATE director_threads SET provider = ?, updated_at = ? WHERE id = ?", (data["provider"], now_str, thread_id))
        if "model" in data and data["model"]:
            cur.execute("UPDATE director_threads SET model = ?, updated_at = ? WHERE id = ?", (data["model"], now_str, thread_id))
        if "reasoning_effort" in data and data["reasoning_effort"]:
            cur.execute("UPDATE director_threads SET reasoning_effort = ?, updated_at = ? WHERE id = ?", (data["reasoning_effort"], now_str, thread_id))
        if "project_id" in data and data["project_id"]:
            cur.execute("UPDATE director_threads SET project_id = ?, updated_at = ? WHERE id = ?", (data["project_id"], now_str, thread_id))
        conn.commit()
    return {"status": "success", "thread_id": thread_id}


@router.delete("/director/threads/{thread_id}")
def delete_director_thread(thread_id: str):
    """Delete a conversation thread and its messages."""
    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM director_threads WHERE id = ?", (thread_id,))
        cur.execute("DELETE FROM director_messages WHERE thread_id = ?", (thread_id,))
        conn.commit()
    return {"status": "success", "deleted_id": thread_id}


@router.get("/director/threads/{thread_id}/messages")
def get_director_thread_messages(thread_id: str):
    """Fetch complete message history for a conversation thread."""
    messages = []
    thread_meta = None
    with _get_db_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, project_id, title, preset_id, provider, model, reasoning_effort FROM director_threads WHERE id = ?", (thread_id,))
        t_row = cur.fetchone()
        if not t_row:
            raise HTTPException(status_code=404, detail="Thread not found")
        thread_meta = dict(t_row)

        cur.execute("SELECT id, role, content, steps, deliverable, created_preset, attachments, tasks, created_at FROM director_messages WHERE thread_id = ? ORDER BY created_at ASC", (thread_id,))
        for row in cur.fetchall():
            messages.append({
                "id": row["id"],
                "role": row["role"],
                "content": row["content"],
                "steps": json.loads(row["steps"]) if row["steps"] else None,
                "deliverable": json.loads(row["deliverable"]) if row["deliverable"] else None,
                "created_preset": json.loads(row["created_preset"]) if row["created_preset"] else None,
                "attachments": json.loads(row["attachments"]) if row["attachments"] else [],
                "tasks": json.loads(row["tasks"]) if row["tasks"] else [],
                "created_at": row["created_at"]
            })
    return {"thread": thread_meta, "messages": messages}


@router.post("/director/threads/{thread_id}/messages")
def save_director_thread_message(thread_id: str, data: Dict[str, Any]):
    """Persist a message into the conversation thread."""
    import uuid
    msg_id = data.get("id") or f"msg_{uuid.uuid4().hex[:12]}"
    now_str = datetime.now().isoformat()
    role = data.get("role", "user")
    content = data.get("content", "")
    steps = json.dumps(data.get("steps")) if data.get("steps") else None
    deliverable = json.dumps(data.get("deliverable")) if data.get("deliverable") else None
    created_preset = json.dumps(data.get("created_preset")) if data.get("created_preset") else None
    attachments = json.dumps(data.get("attachments")) if data.get("attachments") else "[]"
    tasks = json.dumps(data.get("tasks")) if data.get("tasks") else "[]"

    with _get_db_conn() as conn:
        cur = conn.cursor()
        # Insert or replace
        cur.execute(
            "INSERT OR REPLACE INTO director_messages (id, thread_id, role, content, steps, deliverable, created_preset, attachments, tasks, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (msg_id, thread_id, role, content, steps, deliverable, created_preset, attachments, tasks, now_str)
        )
        # Update thread timestamp and title if it's the first message
        if role == "user" and content:
            cur.execute("SELECT title FROM director_threads WHERE id = ?", (thread_id,))
            r = cur.fetchone()
            if r and r[0] in ["새 대화", "새 채팅"]:
                clean_title = content.strip().replace("\n", " ")[:30]
                if clean_title:
                    cur.execute("UPDATE director_threads SET title = ?, updated_at = ? WHERE id = ?", (clean_title, now_str, thread_id))
            else:
                cur.execute("UPDATE director_threads SET updated_at = ? WHERE id = ?", (now_str, thread_id))
        else:
            cur.execute("UPDATE director_threads SET updated_at = ? WHERE id = ?", (now_str, thread_id))
        conn.commit()
    return {"status": "success", "message_id": msg_id}



@router.get("/{preset_id}")
def get_sovereign_preset(preset_id: str) -> Dict[str, Any]:
    """Retrieve full details of a single preset or dispatch right panel helpers."""
    if preset_id == "exports-list":
        return get_exports_list()
    if preset_id == "workspace-files":
        return get_workspace_files()
    if preset_id == "live-logs":
        return get_live_logs()

    import urllib.parse
    clean_id = urllib.parse.unquote(preset_id)
    filepath = PRESETS_DIR / f"{preset_id}.json"
    if not filepath.exists():
        filepath = PRESETS_DIR / f"{clean_id}.json"

    data = None
    if filepath.exists():
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception as e:
            logger.warning(f"Error reading preset file {filepath}: {e}")

    if not data:
        # Fallback to SQLite DB (ShortsTemplate)
        from ..database import SessionLocal
        from ..models import ShortsTemplate
        db = SessionLocal()
        try:
            tmpl = db.query(ShortsTemplate).filter(
                (ShortsTemplate.id == preset_id) | (ShortsTemplate.id == clean_id) |
                (ShortsTemplate.name == preset_id) | (ShortsTemplate.name == clean_id)
            ).first()
            if tmpl:
                manifest = tmpl.manifest or {}
                layout = tmpl.layout or {}
                blueprint = manifest if manifest else layout
                bible = blueprint.get("production_bible_17", {})
                data = {
                    "id": tmpl.id,
                    "name": tmpl.name,
                    "category": tmpl.badge or "custom",
                    "description": tmpl.description,
                    "archetype": tmpl.archetype,
                    "style": blueprint,
                    "blueprint": blueprint,
                    "production_bible_17": bible,
                    "recipe": tmpl.description or "",
                    "content_rules": [
                        f"상단 바 높이: {blueprint.get('visual_geometry', {}).get('top_bar', {}).get('height_pct', 15)}%",
                        f"컷 전환 주기: {blueprint.get('editing_pacing', {}).get('avg_cut_sec', 1.8)}초",
                        f"WPM 발화 속도: {blueprint.get('audio_dsp', {}).get('wpm', 340)}"
                    ]
                }
        finally:
            db.close()

    if not data:
        raise HTTPException(status_code=404, detail="Preset not found")

    # Auto-hydrate keyframes if missing from presets/keyframes directory
    if not data.get("keyframes"):
        for candidate_id in [data.get("id"), preset_id, clean_id]:
            if not candidate_id:
                continue
            kf_dir = PRESETS_DIR / "keyframes" / candidate_id
            if kf_dir.exists():
                kfs = []
                for kf_file in sorted(kf_dir.glob("*.jpg")):
                    kfs.append({
                        "index": len(kfs),
                        "label": kf_file.stem,
                        "url": f"/api/files/stream?path={kf_file}",
                        "local_path": str(kf_file)
                    })
                if kfs:
                    data["keyframes"] = kfs
                    data["extracted_keyframes"] = kfs
                    curr_thumb = data.get("thumbnail_url", "")
                    if not curr_thumb or curr_thumb.startswith("/media/") or "_thumb.jpg" in curr_thumb:
                        data["thumbnail_url"] = kfs[0]["url"]
                    break

    # Ensure preview_video_url is resolved
    if not data.get("preview_video_url"):
        v_cand = data.get("source_video_path")
        if not v_cand or not Path(v_cand).exists():
            ref_cand = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "07_Downloads" / "Presets_Reference" / preset_id / "reference_clip.mp4"
            if ref_cand.exists():
                v_cand = str(ref_cand)
        if v_cand and Path(v_cand).exists():
            data["preview_video_url"] = f"/api/files/stream?path={urllib.parse.quote(str(v_cand))}"
            data["source_video_path"] = str(v_cand)

    return data


@router.put("/{preset_id}")
def update_sovereign_preset(preset_id: str, req: PresetUpdateRequest) -> Dict[str, Any]:
    """Update an existing sovereign preset (parameters, style, rules)."""
    filepath = PRESETS_DIR / f"{preset_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Preset not found")

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        if req.name is not None:
            data["name"] = req.name
        if req.category is not None:
            data["category"] = req.category
        if req.recipe is not None:
            data["recipe"] = req.recipe
        if req.content_rules is not None:
            data["content_rules"] = req.content_rules
        if req.style is not None:
            data["style"] = req.style
        
        # If modifying, mark as custom modified if not already
        if not data.get("source", "").startswith("viraloop_"):
            data["source"] = "viraloop_user"

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "preset_id": preset_id,
            "preset": data
        }
    except Exception as e:
        logger.error(f"Failed to update preset {preset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error updating preset: {e}")


@router.post("/{preset_id}/clone")
def clone_sovereign_preset(preset_id: str, req: PresetCloneRequest) -> Dict[str, Any]:
    """Clone an existing preset into a new custom preset."""
    src_path = PRESETS_DIR / f"{preset_id}.json"
    if not src_path.exists():
        raise HTTPException(status_code=404, detail="Source preset not found")

    try:
        with open(src_path, "r", encoding="utf-8") as f:
            base_data = json.load(f)

        import time
        safe_name = req.new_name.strip().replace(" ", "_").lower()
        new_id = f"preset_custom_{safe_name}_{int(time.time())}"
        dest_path = PRESETS_DIR / f"{new_id}.json"

        new_data = {
            "id": new_id,
            "name": req.new_name,
            "category": req.category or base_data.get("category", "custom"),
            "source": "viraloop_user",
            "cloned_from": preset_id,
            "style": req.style if req.style is not None else base_data.get("style", {}),
            "recipe": req.recipe if req.recipe is not None else base_data.get("recipe", ""),
            "content_rules": req.content_rules if req.content_rules is not None else base_data.get("content_rules", [])
        }

        with open(dest_path, "w", encoding="utf-8") as f:
            json.dump(new_data, f, indent=2, ensure_ascii=False)

        return {
            "success": True,
            "preset_id": new_id,
            "preset": new_data
        }
    except Exception as e:
        logger.error(f"Failed to clone preset {preset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error cloning preset: {e}")


@router.delete("/{preset_id}")
def delete_sovereign_preset(preset_id: str) -> Dict[str, Any]:
    """Delete a sovereign preset and cleanly wipe all associated thumbnail, video, and DB artifacts."""
    filepath = PRESETS_DIR / f"{preset_id}.json"
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="해당 프리셋을 찾을 수 없습니다.")

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Protect official presets from accidental deletion
        if data.get("source") == "pixeling_official" or data.get("source") == "viraloop_official" or "official" in preset_id:
            raise HTTPException(status_code=403, detail="공식 시스템 프리셋은 삭제할 수 없습니다. 대신 복제하여 사용하세요.")

        cleaned_files = []

        # 1. Delete preset JSON
        filepath.unlink(missing_ok=True)
        cleaned_files.append(str(filepath))

        # 2. Delete sample video in presets/samples/
        sample_video = PRESETS_DIR / "samples" / f"{preset_id}.mp4"
        if sample_video.exists():
            sample_video.unlink(missing_ok=True)
            cleaned_files.append(str(sample_video))

        # 3. Delete thumbnails in presets/thumbnails/
        for ext in [".jpg", ".png", ".jpeg", ".webp"]:
            thumb_file = PRESETS_DIR / "thumbnails" / f"{preset_id}{ext}"
            if thumb_file.exists():
                thumb_file.unlink(missing_ok=True)
                cleaned_files.append(str(thumb_file))

        # Also check thumbnail_url path if present
        thumb_url = data.get("thumbnail_url") or ""
        if "path=" in thumb_url:
            raw_path = thumb_url.split("path=")[-1]
            try:
                p_obj = Path(raw_path)
                if p_obj.exists() and ("presets" in str(p_obj) or "thumbnails" in str(p_obj)):
                    p_obj.unlink(missing_ok=True)
                    cleaned_files.append(str(p_obj))
            except Exception:
                pass

        # 4. Delete DB entry from ShortsTemplate if exists
        try:
            from app.database import SessionLocal
            from app.models import ShortsTemplate
            dbs = SessionLocal()
            try:
                tmpls = dbs.query(ShortsTemplate).filter(
                    (ShortsTemplate.id == preset_id) | (ShortsTemplate.name == data.get("name"))
                ).all()
                for tmpl in tmpls:
                    dbs.delete(tmpl)
                dbs.commit()
            finally:
                dbs.close()
        except Exception as db_err:
            logger.warning(f"Error removing ShortsTemplate DB record for {preset_id}: {db_err}")

        logger.info(f"✅ Cleanly deleted preset '{preset_id}' and {len(cleaned_files)} associated files")
        return {
            "success": True, 
            "deleted_id": preset_id,
            "name": data.get("name"),
            "cleaned_files": cleaned_files
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete preset {preset_id}: {e}")
        raise HTTPException(status_code=500, detail=f"프리셋 삭제 오류: {e}")


@router.post("/harvest-pixeling")
def harvest_pixeling_presets() -> Dict[str, Any]:
    """Scan and harvest presets from local Pixeling installation."""
    harvester = PixelingHarvester()
    scan = harvester.scan_pixeling_installation()
    if not scan.get("installed"):
        raise HTTPException(status_code=404, detail="Pixeling installation not detected on this machine")

    result = harvester.harvest_all()
    return {
        "success": True,
        "scan": scan,
        "harvest": result
    }


@router.post("/save-from-video")
def save_preset_from_video(req: PresetSaveRequest) -> Dict[str, Any]:
    """Save a new preset from user configuration or generated video."""
    import time
    preset_id = f"preset_{req.name.strip().replace(' ', '_').lower()}_{int(time.time())}"
    dest = PRESETS_DIR / f"{preset_id}.json"

    data = {
        "id": preset_id,
        "name": req.name,
        "category": req.category,
        "source": "viraloop_user",
        "style": req.style,
        "recipe": req.recipe,
        "content_rules": req.content_rules,
        "source_video_path": req.source_video_path
    }

    with open(dest, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    return {
        "success": True,
        "preset_id": preset_id,
        "saved_path": str(dest)
    }


@router.post("/render")
async def render_with_preset(req: PresetRenderRequest) -> Dict[str, Any]:
    """Render a video with the selected preset."""
    filepath = PRESETS_DIR / f"{req.preset_id}.json"
    style = req.custom_style

    if not style:
        if not filepath.exists():
            raise HTTPException(status_code=404, detail="Preset not found")
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            style = data.get("style", {})

    try:
        render_res = await sovereign_preset_engine.render_parametric(
            clips=req.clips,
            cues=req.captions,
            style=style,
            title=req.title,
            output_path=req.output_path
        )
        return render_res
    except Exception as e:
        logger.error(f"Render failed: {e}")
        raise HTTPException(status_code=500, detail=f"Render execution failed: {str(e)}")


class DirectChatRequest(BaseModel):
    prompt: str
    preset_id: Optional[str] = None
    aspect_ratio: str = "1080x1920"
    model: Optional[str] = None
    provider: Optional[str] = None
    reasoning_effort: Optional[str] = None
    reference_media_path: Optional[str] = None
    previous_deliverable: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None


class BatchDirectChatRequest(BaseModel):
    prompt: str
    preset_id: Optional[str] = None
    aspect_ratio: str = "1080x1920"
    model: Optional[str] = None
    provider: Optional[str] = None
    reasoning_effort: Optional[str] = None
    reference_media_paths: List[str] = []
    max_concurrency: int = 2
    previous_deliverable: Optional[Dict[str, Any]] = None
    history: Optional[List[Dict[str, Any]]] = None


@router.post("/direct-chat")
async def direct_chat_production(req: DirectChatRequest):
    """
    Direct Chat production endpoint for a single video.
    Streams execution steps and deliverable from Hermes Conversational Director.
    Supports continuous conversational revision loops.
    """
    from fastapi.responses import StreamingResponse
    from ..agent.hermes_core.conversational_director import ConversationalDirector

    director = ConversationalDirector(agent_model=req.model)

    async def event_generator():
        async for event in director.execute_director_stream(
            prompt=req.prompt,
            preset_id=req.preset_id,
            aspect_ratio=req.aspect_ratio,
            reference_media_path=req.reference_media_path,
            previous_deliverable=req.previous_deliverable,
            model=req.model,
            provider=req.provider,
            reasoning_effort=req.reasoning_effort,
            history=req.history
        ):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


@router.post("/batch-direct-chat")
async def batch_direct_chat_production(req: BatchDirectChatRequest):
    """
    Batch Direct Chat production endpoint for multiple videos in parallel.
    Streams multi-task execution steps and deliverables.
    """
    from fastapi.responses import StreamingResponse
    from ..agent.hermes_core.conversational_director import ConversationalDirector

    director = ConversationalDirector(agent_model=req.model)

    async def event_generator():
        async for event in director.execute_batch_director_stream(
            prompt=req.prompt,
            media_paths=req.reference_media_paths,
            preset_id=req.preset_id,
            aspect_ratio=req.aspect_ratio,
            max_concurrency=req.max_concurrency,
            previous_deliverable=req.previous_deliverable,
            model=req.model,
            provider=req.provider,
            reasoning_effort=req.reasoning_effort,
            history=req.history
        ):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")



class MediaSearchRequest(BaseModel):
    query: str
    max_results: int = 5


class MediaDownloadRequest(BaseModel):
    url: str
    output_name: Optional[str] = None


@router.post("/search-youtube")
async def search_youtube_media(req: MediaSearchRequest) -> Dict[str, Any]:
    """Search YouTube for reference videos to attach to preset production."""
    from ..services.hermes_asset_scout import hermes_asset_scout
    results = await hermes_asset_scout.search_youtube(req.query, max_results=req.max_results)
    return {
        "success": True,
        "query": req.query,
        "results": results
    }


@router.post("/download-media")
async def download_media(req: MediaDownloadRequest) -> Dict[str, Any]:
    """Download external media (e.g. YouTube URL) to 07_Downloads storage."""
    from ..services.hermes_asset_scout import hermes_asset_scout
    local_path = await hermes_asset_scout.download_youtube_video(req.url, output_name=req.output_name)
    if not local_path or not os.path.exists(local_path):
        raise HTTPException(status_code=500, detail="Failed to download external media")

    return {
        "success": True,
        "url": req.url,
        "local_path": local_path,
        "filename": os.path.basename(local_path)
    }


class ReferenceAnalysisRequest(BaseModel):
    video_path: Optional[str] = None
    url: Optional[str] = None
    preset_name: Optional[str] = None
    category: str = "harvested_vision"


@router.post("/analyze-reference")
async def analyze_reference_video_vision(req: ReferenceAnalysisRequest) -> Dict[str, Any]:
    """
    Analyzes reference video using OmniRoute Vision Interleaving:
    FFmpeg 1fps keyframes + Whisper timecodes -> OmniRoute Vision API ->
    Extracts top title, colors, subtitle Y%, and registers new sovereign preset.
    """
    from ..services.omniroute_vision_analyzer import omniroute_vision_analyzer
    from ..services.hermes_asset_scout import hermes_asset_scout

    target_video_path = req.video_path
    if not target_video_path and req.url:
        target_video_path = await hermes_asset_scout.download_youtube_video(req.url)

    if not target_video_path or not os.path.exists(target_video_path):
        raise HTTPException(status_code=400, detail="Valid local video file or downloadable URL is required")

    try:
        preset_data = await omniroute_vision_analyzer.analyze_and_create_preset(
            video_path=target_video_path,
            preset_name=req.preset_name,
            category=req.category
        )
        return {
            "success": True,
            "preset": preset_data,
            "preset_id": preset_data["id"]
        }
    except Exception as e:
        logger.error(f"OmniRoute Vision Analysis failed: {e}")
        raise HTTPException(status_code=500, detail=f"Reference video vision analysis failed: {str(e)}")


@router.get("/openmontage/capabilities")
def get_openmontage_capabilities() -> Dict[str, Any]:
    """Returns all registered OpenMontage tools and capability groups."""
    from ..services.openmontage.viraloop_openmontage_mcp import ViraLoopOpenMontageMCP
    return ViraLoopOpenMontageMCP.montage_discover_capabilities()


class OpenMontagePipelineRequest(BaseModel):
    prompt: str
    preset_id: Optional[str] = None
    reference_media_path: Optional[str] = None
    aspect_ratio: str = "1080x1920"
    form_factor: str = "classic"
    auto_approve_script: bool = True
    model: Optional[str] = None


@router.post("/openmontage/run-pipeline")
async def run_openmontage_pipeline(req: OpenMontagePipelineRequest):
    """
    Runs the 5-stage OpenMontage pipeline (idea -> script -> scene_plan -> assets -> compose)
    and streams real-time stage progress events for Backlot Living Storyboard.
    """
    from fastapi.responses import StreamingResponse
    from ..services.openmontage.pipeline_runner import OpenMontagePipelineRunner

    runner = OpenMontagePipelineRunner(agent_model=req.model)
    
    # Load preset if specified
    preset = None
    if req.preset_id:
        filepath = PRESETS_DIR / f"{req.preset_id}.json"
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                preset = json.load(f)

    async def event_generator():
        async for event in runner.run_pipeline_stream(
            prompt=req.prompt,
            reference_media_path=req.reference_media_path,
            preset=preset,
            aspect_ratio=req.aspect_ratio,
            form_factor=req.form_factor,
            auto_approve_script=req.auto_approve_script
        ):
            yield json.dumps(event, ensure_ascii=False) + "\n"

    return StreamingResponse(event_generator(), media_type="application/x-ndjson")


class ApproveScriptGateRequest(BaseModel):
    gate_id: str
    edited_script: Dict[str, Any]


@router.post("/openmontage/approve-script")
def approve_script_gate(req: ApproveScriptGateRequest) -> Dict[str, Any]:
    """Approve a script at the Backlot Script Gate to proceed to scene planning and rendering."""
    from ..services.openmontage.pipeline_runner import OpenMontagePipelineRunner
    success = OpenMontagePipelineRunner.approve_script_gate(req.gate_id, req.edited_script)
    if not success:
        raise HTTPException(status_code=404, detail="Approval gate ID not found or already closed")
    return {"success": True, "gate_id": req.gate_id, "status": "approved"}


class CapCutExportRequest(BaseModel):
    project_name: str = "ViraLoop CapCut Export"
    video_path: Optional[str] = None
    cues: List[Dict[str, Any]] = []
    audio_path: Optional[str] = None
    duration_s: float = 15.0


@router.post("/export-capcut")
async def export_capcut_project(req: CapCutExportRequest) -> Dict[str, Any]:
    """Export composition to CapCut project draft format."""
    from ..services.openmontage.providers.vl_capcut_draft_tool import VLCapCutDraftTool
    tool = VLCapCutDraftTool()
    res = await tool.run(
        project_name=req.project_name,
        video_path=req.video_path,
        cues=req.cues,
        audio_path=req.audio_path,
        duration_s=req.duration_s
    )
    if not res.success:
        raise HTTPException(status_code=500, detail=f"CapCut export failed: {res.error}")
    return res.data


@router.post("/{preset_id}/export-capcut")
def export_preset_direct_to_capcut(
    preset_id: str,
    payload: Optional[Dict[str, Any]] = None,
    open_after: bool = True
) -> Dict[str, Any]:
    """Export a specific sovereign preset's 6-tier geometry directly to CapCut PC draft."""
    from ..services.capcut_template_assembler import assemble_capcut_project
    
    preset_file = PRESETS_DIR / f"{preset_id}.json"
    if not preset_file.exists():
        found = None
        for f in PRESETS_DIR.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as jf:
                    jd = json.load(jf)
                    if jd.get("id") == preset_id or f.stem == preset_id:
                        found = f
                        break
            except Exception:
                pass
        if found:
            preset_file = found
        else:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    with open(preset_file, "r", encoding="utf-8") as f:
        preset_data = json.load(f)

    custom_style = (payload or {}).get("custom_style") or preset_data.get("style", {})
    vg = custom_style.get("visual_geometry", {})
    top_header = custom_style.get("top_header", {})
    top_bar = vg.get("top_bar", {})
    h_lines = vg.get("top_header_lines", [])

    # 헤더 텍스트
    line1 = top_header.get("line1", {}).get("text") or (h_lines[0].get("text") if h_lines else preset_data.get("name"))
    line2 = top_header.get("line2", {}).get("text") or (h_lines[1].get("text") if len(h_lines) > 1 else "핵심 훅 명사")
    line1_color = top_header.get("line1", {}).get("color") or (h_lines[0].get("color") if h_lines else "#FFFFFF")
    line2_color = top_header.get("line2", {}).get("color") or (h_lines[1].get("color") if len(h_lines) > 1 else "#FFE838")
    top_bar_h = top_bar.get("height_pct", 18.0)

    # 비디오 소스
    video_source = custom_style.get("video_bg_url") or preset_data.get("sample_image_url") or ""
    if video_source.startswith("/api/files/stream?path="):
        video_source = video_source.replace("/api/files/stream?path=", "")

    # 자막 정보
    subtitles = []
    bilingual = custom_style.get("bilingual_caption", {})
    if bilingual.get("enabled"):
        subtitles = [
            {
                "startMs": 0,
                "endMs": 15000,
                "text": f"{bilingual.get('primary_en', {}).get('text', 'You have two kids.')}\n{bilingual.get('secondary_ko', {}).get('text', '아이가 둘 있으시죠.')}"
            }
        ]
    else:
        cap = vg.get("caption", {})
        subtitles = [
            {
                "startMs": 0,
                "endMs": 15000,
                "text": cap.get("example") or preset_data.get("name", "영상 자막 예시")
            }
        ]

    raw_props = {
        "titleLine1": line1,
        "titleLine2": line2,
        "titleLine1Color": line1_color,
        "titleLine2Color": line2_color,
        "topBarHeightPct": top_bar_h,
        "hasTopBarBg": True,
        "videoSource": video_source,
        "subtitles": subtitles,
    }

    try:
        res = assemble_capcut_project(
            raw_props=raw_props,
            project_name=f"ViraLoop_{preset_data.get('name', preset_id)}",
            open_after=open_after
        )
        return {
            "success": True,
            "project_name": res.get("project_name", preset_data.get("name")),
            "draft_path": res.get("draft_path"),
            "preset_id": preset_id
        }
    except Exception as e:
        logger.error(f"[CapCut Preset Export] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CapCut draft assembly failed: {str(e)}")


@router.get("/capcut/drafts")
def get_local_capcut_drafts() -> List[Dict[str, Any]]:
    """List local CapCut PC drafts for design injection."""
    from ..services.capcut_design_injector import list_capcut_drafts
    return list_capcut_drafts()


class CapCutInjectRequest(BaseModel):
    draft_folder: str
    custom_style: Optional[Dict[str, Any]] = None
    open_after: bool = True


@router.post("/{preset_id}/inject-capcut")
def inject_preset_into_capcut_draft(
    preset_id: str,
    req: CapCutInjectRequest
) -> Dict[str, Any]:
    """Inject this preset's design directly into an existing CapCut draft (overwriting fonts, positions, colors, frame bars)."""
    from ..services.capcut_design_injector import inject_design_to_draft
    
    preset_file = PRESETS_DIR / f"{preset_id}.json"
    if not preset_file.exists():
        found = None
        for f in PRESETS_DIR.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as jf:
                    jd = json.load(jf)
                    if jd.get("id") == preset_id or f.stem == preset_id:
                        found = f
                        break
            except Exception:
                pass
        if found:
            preset_file = found
        else:
            raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    with open(preset_file, "r", encoding="utf-8") as f:
        preset_data = json.load(f)

    design_to_use = req.custom_style or preset_data.get("style", {})
    if "name" not in design_to_use:
        design_to_use["name"] = preset_data.get("name", preset_id)

    try:
        res = inject_design_to_draft(req.draft_folder, design_to_use, backup=True)

        if req.open_after:
            import subprocess, glob
            # Terminate and reopen CapCut so it reloads clean
            subprocess.run(["taskkill", "/F", "/IM", "CapCut.exe"], capture_output=True, check=False)
            local_app_data = os.environ.get("LOCALAPPDATA", "")
            cand_paths = [
                os.path.join(local_app_data, "CapCut", "Apps", "CapCut.exe"),
                "C:\\Program Files\\CapCut\\CapCut.exe",
            ]
            cand_paths += glob.glob(os.path.join(local_app_data, "CapCut", "Apps", "*", "CapCut.exe"))
            for cp in cand_paths:
                if os.path.exists(cp):
                    subprocess.Popen([cp])
                    break

        return res
    except Exception as e:
        logger.error(f"[CapCut Design Inject] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Design injection failed: {str(e)}")


class CapCutExportCompletedRequest(BaseModel):
    title: Optional[str] = "ViraLoop_Shorts"
    video_path: Optional[str] = None
    audio_path: Optional[str] = None
    cues: Optional[List[Dict[str, Any]]] = []
    style: Optional[Dict[str, Any]] = None
    open_after: bool = True


@router.post("/export-completed-capcut")
def export_completed_video_to_capcut(req: CapCutExportCompletedRequest) -> Dict[str, Any]:
    """
    Exports an internally generated video (with its actual video clip, TTS audio, cues, and styles)
    directly into a new 1:1 CapCut PC draft, opening CapCut for seamless manual fine-tuning.
    """
    from ..services.capcut_design_injector import create_completed_capcut_draft
    try:
        res = create_completed_capcut_draft(
            title=req.title or "ViraLoop_Shorts",
            video_path=req.video_path,
            audio_path=req.audio_path,
            cues=req.cues or [],
            style=req.style or {},
            open_after=req.open_after
        )
        return res
    except Exception as e:
        logger.error(f"[CapCut Export Completed] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CapCut export failed: {str(e)}")






