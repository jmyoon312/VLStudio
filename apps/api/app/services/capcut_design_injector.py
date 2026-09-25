"""
CapCut Design Injector & Universal WYSIWYG Synchronizer for ViraLoop Studio.
Converts between ViraLoop Universal Preset Design and CapCut PC Draft (com.lveditor.draft).

Enables:
  1. 1:1 Coordinate & Style Equivalence between ViraLoop Editor and CapCut PC.
  2. One-click Design Injection into existing Pixeling/raw drafts (overwrites texts, positions, colors, frame bars).
  3. Single Source of Truth (SSOT) JSON format across all 4 Studios and CapCut.
"""

import os
import re
import json
import uuid
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image

logger = logging.getLogger("capcut_design_injector")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
CAPCUT_DRAFT_BASE = Path(LOCAL_APPDATA) / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"


# ── 1. Coordinate & Color Converters (1080x1920 Normalized ↔ CapCut PC) ──

def to_capcut_coord(x_pct: float = 50.0, y_pct: float = 50.0) -> Tuple[float, float]:
    """Convert percentage coordinates (0~100, top-left 0,0) to CapCut normalized coords (-1.0~1.0, center 0,0)."""
    tx = round((float(x_pct) - 50.0) / 50.0, 4)
    ty = round((50.0 - float(y_pct)) / 50.0, 4)
    return tx, ty


def from_capcut_coord(tx: float = 0.0, ty: float = 0.0) -> Tuple[float, float]:
    """Convert CapCut normalized coords (-1.0~1.0) back to percentage coordinates (0~100)."""
    x_pct = round((float(tx) * 50.0) + 50.0, 2)
    y_pct = round(50.0 - (float(ty) * 50.0), 2)
    return x_pct, y_pct


def hex_to_rgb01(hex_str: Optional[str], default_rgb=(1.0, 1.0, 1.0)) -> List[float]:
    """Convert '#RRGGBB' to [r, g, b] where each is 0.0 ~ 1.0."""
    if not hex_str or not isinstance(hex_str, str) or not hex_str.startswith("#"):
        return list(default_rgb)
    s = hex_str.lstrip("#")
    if len(s) != 6:
        return list(default_rgb)
    try:
        return [round(int(s[i:i+2], 16) / 255.0, 3) for i in (0, 2, 4)]
    except Exception:
        return list(default_rgb)


def rgb01_to_hex(rgb_list: Optional[List[float]], default_hex="#FFFFFF") -> str:
    """Convert [r, g, b] (0.0~1.0) to '#RRGGBB'."""
    if not rgb_list or len(rgb_list) < 3:
        return default_hex
    try:
        return "#{:02x}{:02x}{:02x}".format(
            max(0, min(255, int(round(rgb_list[0] * 255)))),
            max(0, min(255, int(round(rgb_list[1] * 255)))),
            max(0, min(255, int(round(rgb_list[2] * 255)))),
        ).upper()
    except Exception:
        return default_hex


# ── 2. Universal Design Spec Normalizer (SSOT) ──

def normalize_design_preset(raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalizes any preset representation (ViraLoop style, Sagong templates, shorts_templates DB)
    into the Single Source of Truth (SSOT) Universal Design format.
    """
    style = raw.get("style", raw)
    vg = style.get("visual_geometry", {})
    top_header = style.get("top_header", {})
    top_bar = vg.get("top_bar", top_header)
    bot_bar = vg.get("bottom_bar", style.get("bottom_bar", {}))
    h_lines = vg.get("top_header_lines", [])

    # Container type & archetypes
    container_type = vg.get("container_type", style.get("container_type", "letterbox_sandwich"))
    floating_capsule = vg.get("floating_capsule", {})
    sub_tape = vg.get("sub_tape_label", {})
    two_tone = vg.get("two_tone_caption", {})
    top_source = vg.get("top_source", "")

    # Frame Top & Bottom Bars
    has_top = bool(top_bar.get("enabled", True) if "enabled" in top_bar else top_bar.get("hasTopBarBg", True))
    if container_type in ("floating_capsule", "none"):
        has_top = False

    top_h = float(top_bar.get("height_pct", top_bar.get("topBarHeightPct", 18.0)))
    top_color = top_bar.get("bg_color", top_bar.get("bar_bg", "#000000"))

    has_bot = bool(bot_bar.get("enabled", False) if "enabled" in bot_bar else bot_bar.get("hasBottomBarBg", False))
    if container_type in ("floating_capsule", "none"):
        has_bot = False

    bot_h = float(bot_bar.get("height_pct", bot_bar.get("bottomBarHeightPct", 11.0)))
    bot_color = bot_bar.get("bg_color", bot_bar.get("bar_bg", "#000000"))

    # Roles: 제목 (Title 1 & 2)
    line1_text = top_header.get("line1", {}).get("text") or (h_lines[0].get("text") if h_lines else raw.get("name", "영상 대제목 1줄"))
    line1_col = top_header.get("line1", {}).get("color") or (h_lines[0].get("color") if h_lines else "#FFE500" if container_type == "floating_capsule" else "#FFFFFF")
    line1_size = float(top_header.get("line1", {}).get("size_px") or (h_lines[0].get("size_px") if h_lines else 28))

    line2_text = top_header.get("line2", {}).get("text") or (h_lines[1].get("text") if len(h_lines) > 1 else "핵심 훅 명사")
    line2_col = top_header.get("line2", {}).get("color") or (h_lines[1].get("color") if len(h_lines) > 1 else "#FFFFFF" if container_type == "floating_capsule" else "#FFE838")
    line2_size = float(top_header.get("line2", {}).get("size_px") or (h_lines[1].get("size_px") if len(h_lines) > 1 else 32))

    # Title Y positioning (in CapCut coords)
    if container_type == "floating_capsule":
        title_y_pct = float(floating_capsule.get("top_y_pct", 8.0)) + (float(floating_capsule.get("height_pct", 10.5)) / 2.0)
    elif container_type == "none":
        title_y_pct = 10.0
    else:
        title_y_pct = top_h * 0.58 if has_top else 11.5
    title_tx, title_ty = to_capcut_coord(50.0, title_y_pct)

    # Sub-tape sticker positioning
    st_text = sub_tape.get("text", "")
    st_emoji = sub_tape.get("emoji", "")
    st_enabled = bool(sub_tape.get("enabled", False) and (st_text or st_emoji))
    st_y_pct = float(sub_tape.get("top_y_pct", 19.5))
    st_tx, st_ty = to_capcut_coord(50.0, st_y_pct)

    # Subtitle (Dialogue / 대사)
    bilingual = style.get("bilingual_caption", {})
    cap = vg.get("caption", style.get("caption", {}))
    sub_col = cap.get("color", "#FFFFFF")
    sub_outline_col = cap.get("outline_color", "#000000")
    sub_outline_px = cap.get("outline_px", 6)
    sub_margin_bot = float(cap.get("margin_v_pct", 28.0))
    sub_y_pct = 100.0 - sub_margin_bot
    sub_tx, sub_ty = to_capcut_coord(50.0, sub_y_pct)

    # Jab Hook (쨉쨉이)
    jab = vg.get("jab_hook", style.get("jab_hook", {}))
    jab_tx, jab_ty = to_capcut_coord(50.0, 32.0)

    # Situation / Context (상황설명)
    sit_tx, sit_ty = to_capcut_coord(50.0, 22.0)

    # Comment Card (댓글)
    cmt_tx, cmt_ty = to_capcut_coord(50.0, 45.0)

    return {
        "version": 3,
        "name": raw.get("name", "ViraLoop Universal Preset"),
        "container_type": container_type,
        "frame": {
            "has_top_bar": has_top,
            "top_height_pct": top_h,
            "top_color": top_color,
            "has_bottom_bar": has_bot,
            "bottom_height_pct": bot_h,
            "bottom_color": bot_color,
        },
        "roles": {
            "제목": {
                "x": title_tx,
                "y": title_ty,
                "line1": {"text": line1_text, "color": line1_col, "font_size": line1_size},
                "line2": {"text": line2_text, "color": line2_col, "font_size": line2_size},
                "font_size": max(15.0, round(line2_size * 0.52, 1)),
                "color": line1_col,
                "line2_color": line2_col,
                "is_floating_capsule": container_type == "floating_capsule",
                "bg_color": floating_capsule.get("bg_color", "#000000"),
                "border_radius": floating_capsule.get("border_radius_px", 24),
            },
            "sub_tape_label": {
                "enabled": st_enabled,
                "text": f"{st_text} {st_emoji}".strip(),
                "x": st_tx,
                "y": st_ty,
                "bg_color": sub_tape.get("bg_color", "#FDE68A"),
                "text_color": sub_tape.get("text_color", "#1E293B"),
                "font_size": 11.5,
                "tilt_deg": float(sub_tape.get("tilt_deg", 0.0)),
            },
            "two_tone_caption": {
                "enabled": bool(two_tone.get("enabled", False)),
                "highlight_text": two_tone.get("highlight_text", ""),
                "highlight_color": two_tone.get("highlight_color", "#FFE500"),
                "base_color": two_tone.get("base_color", "#FFFFFF"),
            },
            "top_source": {
                "enabled": bool(top_source),
                "text": top_source,
                "font_size": 9.0,
                "color": "#CBD5E1",
            },
            "상황설명": {
                "x": sit_tx,
                "y": sit_ty,
                "font_size": 13.0,
                "color": "#FFFFFF",
            },
            "쨉쨉이": {
                "enabled": bool(jab.get("enabled", False)),
                "text": jab.get("text", "⚡ 핵심 훅 ⚡"),
                "x": jab_tx,
                "y": jab_ty,
                "tilt": float(jab.get("tilt_deg", -4.0)),
                "color": jab.get("color", "#FFE838"),
                "font_size": 12.0,
            },
            "대사": {
                "x": sub_tx,
                "y": sub_ty,
                "font_size": max(11.0, round(float(cap.get("size_px", 32)) * 0.42, 1)),
                "color": sub_col,
                "outline_color": sub_outline_col,
                "outline_px": sub_outline_px,
                "bilingual": bool(bilingual.get("enabled", False)),
                "primary_en_color": bilingual.get("primary_en", {}).get("color", "#FFE838"),
                "secondary_ko_color": bilingual.get("secondary_ko", {}).get("color", "#FFFFFF"),
            },
            "댓글": {
                "x": cmt_tx,
                "y": cmt_ty,
                "scale": 1.0,
            },
        },
        "video_geometry": {
            "video_bg_url": style.get("video_bg_url", raw.get("sample_image_url", "")),
            "zoom_pct": style.get("editing_pacing", {}).get("opening_hook_zoom", 1.05) * 100,
            "center_y_pct": (top_h + ((100.0 - top_h - (bot_h if has_bot else 0.0)) / 2.0)) if has_top else 50.0,
        },
    }


# ── 3. Draft Scanner & Role Detection ──

def identify_text_role(text_id: str, content_str: str = "") -> str:
    """Identify text role based on Pixeling/ViraLoop text ID heuristics."""
    tid = (text_id or "").lower()
    if "extra-caption" in tid or "jab" in tid or "hook" in tid:
        return "쨉쨉이"
    if "title" in tid or "headline" in tid or "batch-title" in tid or "lts2" in tid:
        return "제목"
    if "one-take-beat" in tid or "situation" in tid or "context" in tid or "beat" in tid:
        return "상황설명"
    if "comment" in tid:
        return "댓글"
    if "dialogue" in tid or "subtitle" in tid or "caption" in tid:
        return "대사"
    return "대사"


def list_capcut_drafts() -> List[Dict[str, Any]]:
    """Scan local CapCut PC drafts directory."""
    if not CAPCUT_DRAFT_BASE.exists():
        return []

    drafts = []
    for item in CAPCUT_DRAFT_BASE.iterdir():
        if not item.is_dir() or item.name.startswith("."):
            continue

        draft_content_p = item / "draft_content.json"
        meta_info_p = item / "draft_meta_info.json"
        if not draft_content_p.exists():
            continue

        draft_name = item.name
        if meta_info_p.exists():
            try:
                with open(meta_info_p, "r", encoding="utf-8") as f:
                    meta = json.load(f)
                    draft_name = meta.get("draft_name", draft_name)
            except Exception:
                pass

        # Check thumbnail
        thumb_url = None
        for cand in [item / "draft_cover.jpg", item / "draft_cover.png", item / "Thumbnail" / "cover.jpg"]:
            if cand.exists():
                thumb_url = f"/api/files/stream?path={cand}"
                break

        mtime = item.stat().st_mtime
        drafts.append({
            "folder_name": item.name,
            "draft_name": draft_name,
            "path": str(item),
            "modified_ts": mtime,
            "thumbnail_url": thumb_url,
            "has_backup": (item / "draft_content.json.bak").exists(),
        })

    # Sort newest first
    drafts.sort(key=lambda x: x["modified_ts"], reverse=True)
    return drafts


# ── 4. CapCut Draft Design Injection Engine (WYSIWYG Overwrite) ──

def inject_design_to_draft(
    draft_folder: str | Path,
    raw_design_preset: Dict[str, Any],
    backup: bool = True
) -> Dict[str, Any]:
    """
    Injects a ViraLoop Universal Preset Design directly into an existing CapCut draft.
    Overwrites text positions, colors, sizes, and inserts top/bottom black frame bars.
    """
    folder = Path(draft_folder)
    if not folder.is_dir():
        raise FileNotFoundError(f"CapCut draft folder not found: {folder}")

    draft_content_p = folder / "draft_content.json"
    if not draft_content_p.exists():
        raise FileNotFoundError(f"draft_content.json missing in: {folder}")

    # Backup once
    bak_p = folder / "draft_content.json.bak"
    if backup and not bak_p.exists():
        shutil.copy2(draft_content_p, bak_p)

    with open(draft_content_p, "r", encoding="utf-8") as f:
        draft = json.load(f)

    # Normalize design preset
    spec = normalize_design_preset(raw_design_preset)
    roles = spec["roles"]
    frame = spec["frame"]

    materials = draft.setdefault("materials", {})
    texts = materials.setdefault("texts", [])
    tracks = draft.setdefault("tracks", [])

    # Map material_id to role
    text_role_map = {}
    for t in texts:
        tid = t.get("id", "")
        text_role_map[tid] = identify_text_role(tid, t.get("content", ""))

    changed_counts = {"positions": 0, "sizes": 0, "colors": 0, "materials_updated": 0}

    # 1. Update text materials (font_size, color)
    for t in texts:
        tid = t.get("id", "")
        role_name = text_role_map.get(tid, "대사")
        r_spec = roles.get(role_name)
        if not r_spec:
            continue

        target_font_size = float(r_spec.get("font_size", t.get("font_size", 14)))
        t["font_size"] = target_font_size

        content_raw = t.get("content")
        if content_raw:
            try:
                c = json.loads(content_raw)
                styles = c.get("styles", [])
                if styles:
                    st = styles[0]
                    st["size"] = target_font_size

                    # Update fill color
                    target_color = r_spec.get("color")
                    if target_color:
                        rgb = hex_to_rgb01(target_color)
                        fill = st.setdefault("fill", {})
                        content_obj = fill.setdefault("content", {})
                        solid = content_obj.setdefault("solid", {})
                        solid["color"] = rgb
                        changed_counts["colors"] += 1

                c_text = c.get("text", "")

                # Handle 2-line title individual line colors if applicable
                if role_name == "제목" and "\n" in c_text and len(styles) > 1:
                    line2_col = r_spec.get("line2_color", r_spec.get("color", "#FFE838"))
                    styles[1]["fill"]["content"]["solid"]["color"] = hex_to_rgb01(line2_col)
                    styles[1]["size"] = float(r_spec.get("line2", {}).get("font_size", target_font_size))

                t["content"] = json.dumps(c, ensure_ascii=False)
                changed_counts["materials_updated"] += 1
            except Exception as e:
                logger.warning(f"[CapCut Injector] Text content json edit failed for {tid}: {e}")

    # 2. Update track segment positions (transform.x, transform.y)
    for track in tracks:
        if track.get("type") != "text":
            continue
        for seg in track.get("segments", []):
            mid = seg.get("material_id")
            role_name = text_role_map.get(mid, "대사")
            r_spec = roles.get(role_name)
            if not r_spec:
                continue

            clip = seg.setdefault("clip", {})
            tf = clip.setdefault("transform", {})
            if "x" in r_spec:
                tf["x"] = float(r_spec["x"])
            if "y" in r_spec:
                tf["y"] = float(r_spec["y"])
            changed_counts["positions"] += 1

    # 3. Dynamic Frame Bars Injection (Top & Bottom black bars)
    resources_dir = folder / "Resources"
    resources_dir.mkdir(parents=True, exist_ok=True)
    norm_folder = str(folder).replace("\\", "/")

    # Check if frame bar tracks already exist
    existing_bar_names = {t.get("name") for t in tracks if t.get("type") == "video"}

    total_duration_us = 15000000
    for t in tracks:
        for s in t.get("segments", []):
            tr = s.get("target_timerange", {})
            dur = tr.get("duration", 0)
            if dur > total_duration_us:
                total_duration_us = dur

    if frame.get("has_top_bar") and "V1 Top Frame Bar" not in existing_bar_names:
        top_h_pct = float(frame.get("top_height_pct", 18.0))
        if top_h_pct > 0:
            top_px = max(10, int(round(1920 * (top_h_pct / 100.0))))
            top_bar_img_p = resources_dir / "top_black_bar.png"
            Image.new("RGB", (1080, top_px), (0, 0, 0)).save(top_bar_img_p)

            t_mat_id = str(uuid.uuid4()).upper()
            t_seg_id = str(uuid.uuid4()).upper()
            t_trk_id = str(uuid.uuid4()).upper()
            tx_tb, ty_tb = to_capcut_coord(50.0, top_h_pct / 2.0)

            materials.setdefault("videos", []).append({
                "id": t_mat_id, "type": "video",
                "path": f"{norm_folder}/Resources/top_black_bar.png",
                "file_Path": f"{norm_folder}/Resources/top_black_bar.png",
                "name": "top_black_bar.png", "material_name": "top_black_bar.png",
                "duration": total_duration_us, "video_duration": total_duration_us,
                "width": 1080, "height": top_px, "has_audio": False,
                "metetype": "photo_to_video",
                "roughcut_time_range": {"duration": total_duration_us, "start": 0}
            })
            tracks.append({
                "id": t_trk_id, "type": "video", "attribute": 0, "flag": 0, "name": "V1 Top Frame Bar",
                "segments": [{
                    "id": t_seg_id, "type": "video", "material_id": t_mat_id,
                    "target_timerange": {"duration": total_duration_us, "start": 0},
                    "source_timerange": {"duration": total_duration_us, "start": 0},
                    "speed": 1.0, "volume": 1.0, "render_index": 2000,
                    "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": tx_tb, "y": ty_tb}}
                }]
            })

    # Save modified draft_content.json
    with open(draft_content_p, "w", encoding="utf-8") as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)

    return {
        "success": True,
        "draft_folder": str(folder),
        "preset_name": spec["name"],
        "counts": changed_counts,
        "backup_path": str(bak_p) if bak_p.exists() else None,
    }


def restore_draft_backup(draft_folder: str | Path) -> bool:
    """Restores draft_content.json from draft_content.json.bak."""
    folder = Path(draft_folder)
    dc_p = folder / "draft_content.json"
    bak_p = folder / "draft_content.json.bak"
    if not bak_p.exists():
        return False
    shutil.copy2(bak_p, dc_p)
    return True


def create_completed_capcut_draft(
    title: str,
    video_path: Optional[str] = None,
    audio_path: Optional[str] = None,
    cues: Optional[List[Dict[str, Any]]] = None,
    style: Optional[Dict[str, Any]] = None,
    open_after: bool = True
) -> Dict[str, Any]:
    """
    Exports an internally generated video and its full styling (top/bottom frame bars,
    2-line header titles, and timed subtitles) directly into a new 1:1 CapCut PC draft.

    This ensures that when a user wants to make additional manual refinements in CapCut,
    the project opens with the exact same visual styling as rendered in ViraLoop Studio.
    """
    import time
    import subprocess

    cues = cues or []
    style = style or {}
    spec = normalize_design_preset(style)

    # 1. Calculate duration (in microseconds, CapCut standard)
    total_duration_us = 15000000
    if cues:
        last_ms = max(c.get("end_ms", 0) for c in cues)
        if last_ms > 0:
            total_duration_us = int(last_ms * 1000)

    # 2. Prepare Project Directory in CapCut User Data
    clean_title = re.sub(r'[\\/*?:"<>|]', "", title or "ViraLoop_AutoShorts").strip()[:30]
    ts_str = str(int(time.time() * 1000))
    folder_name = f"{clean_title}_{ts_str[-6:]}"
    project_dir = CAPCUT_DRAFT_BASE / folder_name
    project_dir.mkdir(parents=True, exist_ok=True)
    resources_dir = project_dir / "Resources"
    resources_dir.mkdir(parents=True, exist_ok=True)
    norm_folder = str(project_dir).replace("\\", "/")

    # 3. Initialize Draft Data (Schema v7.5+ 360000)
    draft_id = str(uuid.uuid4()).upper()
    draft = {
        "canvas_config": {"height": 1920, "width": 1080, "ratio": "9:16"},
        "config": {
            "maintrack_adsorb": True,
            "zoom_info_params": {"zoom_ratio": 1.0}
        },
        "id": draft_id,
        "materials": {
            "videos": [],
            "audios": [],
            "texts": [],
            "speeds": [],
            "canvases": []
        },
        "tracks": [],
        "version": 360000
    }

    # Video Track 0: Main Video Clip
    video_track = {"id": str(uuid.uuid4()).upper(), "type": "video", "attribute": 0, "flag": 0, "name": "Main Video", "segments": []}
    if video_path and os.path.exists(video_path):
        v_mat_id = str(uuid.uuid4()).upper()
        v_seg_id = str(uuid.uuid4()).upper()
        draft["materials"]["videos"].append({
            "id": v_mat_id, "type": "video",
            "path": video_path.replace("\\", "/"),
            "file_Path": video_path.replace("\\", "/"),
            "name": os.path.basename(video_path),
            "duration": total_duration_us,
            "width": 1080, "height": 1920,
            "has_audio": True
        })
        video_track["segments"].append({
            "id": v_seg_id, "type": "video", "material_id": v_mat_id,
            "target_timerange": {"duration": total_duration_us, "start": 0},
            "source_timerange": {"duration": total_duration_us, "start": 0},
            "speed": 1.0, "volume": 1.0, "render_index": 0,
            "clip": {"alpha": 1.0, "flip": {"horizontal": False, "vertical": False}, "rotation": 0.0, "scale": {"x": 1.0, "y": 1.0}, "transform": {"x": 0.0, "y": 0.0}}
        })
    draft["tracks"].append(video_track)

    # Audio Track: Voice / TTS
    if audio_path and os.path.exists(audio_path):
        a_track = {"id": str(uuid.uuid4()).upper(), "type": "audio", "attribute": 0, "flag": 0, "name": "TTS Narration", "segments": []}
        a_mat_id = str(uuid.uuid4()).upper()
        a_seg_id = str(uuid.uuid4()).upper()
        draft["materials"]["audios"].append({
            "id": a_mat_id, "type": "extract_music",
            "path": audio_path.replace("\\", "/"),
            "name": os.path.basename(audio_path),
            "duration": total_duration_us
        })
        a_track["segments"].append({
            "id": a_seg_id, "type": "audio", "material_id": a_mat_id,
            "target_timerange": {"duration": total_duration_us, "start": 0},
            "source_timerange": {"duration": total_duration_us, "start": 0},
            "speed": 1.0, "volume": 1.0
        })
        draft["tracks"].append(a_track)

    # Frame Bars (Top & Bottom Letterbox Bars)
    frame = spec.get("frame_bars", {})
    if frame.get("has_top_bar"):
        top_h_pct = float(frame.get("top_height_pct", 18.0))
        if top_h_pct > 0:
            top_px = max(10, int(round(1920 * (top_h_pct / 100.0))))
            top_bar_img_p = resources_dir / "top_black_bar.png"
            Image.new("RGB", (1080, top_px), (0, 0, 0)).save(top_bar_img_p)

            t_mat_id = str(uuid.uuid4()).upper()
            t_seg_id = str(uuid.uuid4()).upper()
            tx_tb, ty_tb = to_capcut_coord(50.0, top_h_pct / 2.0)

            draft["materials"]["videos"].append({
                "id": t_mat_id, "type": "video",
                "path": f"{norm_folder}/Resources/top_black_bar.png",
                "name": "top_black_bar.png",
                "duration": total_duration_us,
                "width": 1080, "height": top_px, "has_audio": False,
                "metetype": "photo_to_video"
            })
            draft["tracks"].append({
                "id": str(uuid.uuid4()).upper(), "type": "video", "attribute": 0, "flag": 0, "name": "Top Frame Bar",
                "segments": [{
                    "id": t_seg_id, "type": "video", "material_id": t_mat_id,
                    "target_timerange": {"duration": total_duration_us, "start": 0},
                    "source_timerange": {"duration": total_duration_us, "start": 0},
                    "speed": 1.0, "volume": 1.0, "render_index": 2000,
                    "clip": {"alpha": 1.0, "transform": {"x": tx_tb, "y": ty_tb}}
                }]
            })

    if frame.get("has_bottom_bar"):
        bot_h_pct = float(frame.get("bottom_height_pct", 11.0))
        if bot_h_pct > 0:
            bot_px = max(10, int(round(1920 * (bot_h_pct / 100.0))))
            bot_bar_img_p = resources_dir / "bottom_black_bar.png"
            Image.new("RGB", (1080, bot_px), (0, 0, 0)).save(bot_bar_img_p)

            b_mat_id = str(uuid.uuid4()).upper()
            b_seg_id = str(uuid.uuid4()).upper()
            tx_bb, ty_bb = to_capcut_coord(50.0, 100.0 - (bot_h_pct / 2.0))

            draft["materials"]["videos"].append({
                "id": b_mat_id, "type": "video",
                "path": f"{norm_folder}/Resources/bottom_black_bar.png",
                "name": "bottom_black_bar.png",
                "duration": total_duration_us,
                "width": 1080, "height": bot_px, "has_audio": False,
                "metetype": "photo_to_video"
            })
            draft["tracks"].append({
                "id": str(uuid.uuid4()).upper(), "type": "video", "attribute": 0, "flag": 0, "name": "Bottom Frame Bar",
                "segments": [{
                    "id": b_seg_id, "type": "video", "material_id": b_mat_id,
                    "target_timerange": {"duration": total_duration_us, "start": 0},
                    "source_timerange": {"duration": total_duration_us, "start": 0},
                    "speed": 1.0, "volume": 1.0, "render_index": 2000,
                    "clip": {"alpha": 1.0, "transform": {"x": tx_bb, "y": ty_bb}}
                }]
            })

    # 2-Line Header Titles Track
    roles = spec.get("roles", {})
    title_spec = roles.get("제목", {})
    l1_text = title_spec.get("line1_text", title)
    l2_text = title_spec.get("line2_text", "")
    full_title_text = f"{l1_text}\n{l2_text}" if l2_text else l1_text

    t_mat_id = str(uuid.uuid4()).upper()
    t_seg_id = str(uuid.uuid4()).upper()
    t_font_size = float(title_spec.get("font_size", 16.0))
    t_x = float(title_spec.get("x", 0.0))
    t_y = float(title_spec.get("y", 0.72))
    l1_rgb = hex_to_rgb01(title_spec.get("color", "#FFFFFF"))
    l2_rgb = hex_to_rgb01(title_spec.get("line2_color", "#FFE838"))

    styles_payload = [{
        "fill": {"content": {"solid": {"color": l1_rgb}}},
        "range": [0, len(l1_text)],
        "size": t_font_size
    }]
    if l2_text:
        styles_payload.append({
            "fill": {"content": {"solid": {"color": l2_rgb}}},
            "range": [len(l1_text) + 1, len(full_title_text)],
            "size": float(title_spec.get("line2", {}).get("font_size", t_font_size * 1.15))
        })

    title_content_json = json.dumps({
        "styles": styles_payload,
        "text": full_title_text
    }, ensure_ascii=False)

    draft["materials"]["texts"].append({
        "id": t_mat_id,
        "type": "text",
        "content": title_content_json,
        "font_size": t_font_size,
        "typesetting": 0
    })

    title_track = {
        "id": str(uuid.uuid4()).upper(), "type": "text", "attribute": 0, "flag": 0, "name": "Header Title",
        "segments": [{
            "id": t_seg_id, "type": "text", "material_id": t_mat_id,
            "target_timerange": {"duration": total_duration_us, "start": 0},
            "source_timerange": {"duration": total_duration_us, "start": 0},
            "render_index": 100,
            "clip": {"alpha": 1.0, "transform": {"x": t_x, "y": t_y}}
        }]
    }
    draft["tracks"].append(title_track)

    # Sub-Tape Sticker Track (e.g. 패션탐정냥 Type B)
    sub_tape_spec = roles.get("sub_tape_label", {})
    if sub_tape_spec.get("enabled") and sub_tape_spec.get("text"):
        st_text = str(sub_tape_spec.get("text")).strip()
        st_mat_id = str(uuid.uuid4()).upper()
        st_seg_id = str(uuid.uuid4()).upper()
        st_rgb = hex_to_rgb01(sub_tape_spec.get("text_color", "#1E293B"))
        st_tx = float(sub_tape_spec.get("x", 0.0))
        st_ty = float(sub_tape_spec.get("y", 0.61))
        st_font_size = float(sub_tape_spec.get("font_size", 11.5))

        st_content_json = json.dumps({
            "styles": [{
                "fill": {"content": {"solid": {"color": st_rgb}}},
                "range": [0, len(st_text)],
                "size": st_font_size
            }],
            "text": st_text
        }, ensure_ascii=False)

        draft["materials"]["texts"].append({
            "id": st_mat_id,
            "type": "text",
            "content": st_content_json,
            "font_size": st_font_size,
            "typesetting": 0
        })

        draft["tracks"].append({
            "id": str(uuid.uuid4()).upper(), "type": "text", "attribute": 0, "flag": 0, "name": "Sub Tape Sticker",
            "segments": [{
                "id": st_seg_id, "type": "text", "material_id": st_mat_id,
                "target_timerange": {"duration": total_duration_us, "start": 0},
                "source_timerange": {"duration": total_duration_us, "start": 0},
                "render_index": 150,
                "clip": {"alpha": 1.0, "transform": {"x": st_tx, "y": st_ty}}
            }]
        })

    # Subtitles Track (From cues, with 2-Tone Keyword Highlighting)
    cap_spec = roles.get("대사", {})
    cap_font_size = float(cap_spec.get("font_size", 14.0))
    cap_rgb = hex_to_rgb01(cap_spec.get("color", "#FFFFFF"))
    cap_x = float(cap_spec.get("x", 0.0))
    cap_y = float(cap_spec.get("y", -0.64))

    two_tone_spec = roles.get("two_tone_caption", {})
    tt_enabled = bool(two_tone_spec.get("enabled"))
    tt_highlight = str(two_tone_spec.get("highlight_text", "")).strip()
    tt_color_rgb = hex_to_rgb01(two_tone_spec.get("highlight_color", "#FFE500"))

    subtitle_track = {
        "id": str(uuid.uuid4()).upper(), "type": "text", "attribute": 0, "flag": 0, "name": "Subtitles",
        "segments": []
    }

    for cue in cues:
        cue_text = cue.get("text", "").strip()
        if not cue_text:
            continue
        c_start_us = int(cue.get("start_ms", 0) * 1000)
        c_end_us = int(cue.get("end_ms", 0) * 1000)
        c_dur_us = max(100000, c_end_us - c_start_us)

        c_mat_id = str(uuid.uuid4()).upper()
        c_seg_id = str(uuid.uuid4()).upper()

        c_styles = [{
            "fill": {"content": {"solid": {"color": cap_rgb}}},
            "range": [0, len(cue_text)],
            "size": cap_font_size
        }]

        # Two-tone keyword highlight
        if tt_enabled and tt_highlight and tt_highlight in cue_text:
            hl_start = cue_text.find(tt_highlight)
            hl_end = hl_start + len(tt_highlight)
            c_styles.append({
                "fill": {"content": {"solid": {"color": tt_color_rgb}}},
                "range": [hl_start, hl_end],
                "size": round(cap_font_size * 1.08, 1)
            })

        c_content = json.dumps({
            "styles": c_styles,
            "text": cue_text
        }, ensure_ascii=False)

        draft["materials"]["texts"].append({
            "id": c_mat_id,
            "type": "text",
            "content": c_content,
            "font_size": cap_font_size,
            "typesetting": 0
        })

        subtitle_track["segments"].append({
            "id": c_seg_id, "type": "text", "material_id": c_mat_id,
            "target_timerange": {"duration": c_dur_us, "start": c_start_us},
            "source_timerange": {"duration": c_dur_us, "start": 0},
            "render_index": 200,
            "clip": {"alpha": 1.0, "transform": {"x": cap_x, "y": cap_y}}
        })

    if subtitle_track["segments"]:
        draft["tracks"].append(subtitle_track)

    # Save draft_content.json
    draft_content_p = project_dir / "draft_content.json"
    with open(draft_content_p, "w", encoding="utf-8") as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)

    # Save draft_meta_info.json (CapCut project catalog indexing)
    meta_info = {
        "draft_id": draft_id,
        "draft_name": clean_title,
        "draft_materials": [],
        "draft_fold_path": str(project_dir).replace("/", "\\"),
        "tm_draft_create": int(time.time() * 1000000),
        "tm_draft_modified": int(time.time() * 1000000),
        "draft_root_path": str(CAPCUT_DRAFT_BASE).replace("/", "\\")
    }
    with open(project_dir / "draft_meta_info.json", "w", encoding="utf-8") as f:
        json.dump(meta_info, f, ensure_ascii=False, indent=2)

    # Open CapCut if requested
    opened = False
    if open_after:
        capcut_exe = Path(LOCAL_APPDATA) / "CapCut" / "Apps" / "CapCut.exe"
        if not capcut_exe.exists():
            for p in (Path(LOCAL_APPDATA) / "CapCut" / "Apps").glob("**/CapCut.exe"):
                capcut_exe = p
                break
        if capcut_exe.exists():
            try:
                subprocess.Popen([str(capcut_exe)])
                opened = True
            except Exception as e:
                logger.warning(f"CapCut auto-launch failed: {e}")

    return {
        "success": True,
        "project_name": clean_title,
        "folder_name": folder_name,
        "project_path": str(project_dir),
        "opened": opened,
        "total_duration_sec": round(total_duration_us / 1000000.0, 2),
        "cues_count": len(cues)
    }

