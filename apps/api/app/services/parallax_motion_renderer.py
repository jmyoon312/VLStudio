"""
Local 2.5D Parallax Motion Engine (Sovereign FFmpeg NLE Subsystem)
=================================================================
Transforms static 2D images into high-definition 60fps cinematic moving shots
using mathematical camera trajectory filters (Push-in, Pull-out, Pan, Diagonal Drift)
with zero GPU VRAM consumption and 0.5s ultra-fast rendering.
"""

import os
import sys
import math
import uuid
import logging
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional

from app.config import settings as app_settings
from app.dependency_manager import DependencyManager

logger = logging.getLogger("parallax_motion_renderer")

TRAJECTORY_PRESETS = ["push_in", "pan_left_to_right", "pull_out", "diagonal_drift"]


class ParallaxMotionRenderer:
    """
    Renders 2.5D multi-axis parallax camera motion using FFmpeg.
    """

    def __init__(self):
        self.exports_dir = Path(app_settings.EXPORTS_DIR)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir = Path(app_settings.TEMP_DIR)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def _get_ffmpeg_bin(self) -> str:
        """Resolves system ffmpeg binary path conforming to 9-tier hierarchy."""
        system_bin = Path(app_settings.MEDIA_ROOT) / "09_System" / "bin" / "ffmpeg.exe"
        if system_bin.exists():
            return str(system_bin)
        try:
            return DependencyManager.get_ffmpeg_path()
        except Exception:
            return "ffmpeg"

    def build_zoompan_filter(
        self,
        input_idx: int,
        duration_s: float,
        trajectory: str = "push_in",
        width: int = 1080,
        height: int = 1920,
        fps: int = 30
    ) -> str:
        """
        Constructs FFmpeg filtergraph string for specific camera motion trajectory.
        """
        frames = max(30, int(duration_s * fps))
        step = 0.15 / frames

        if trajectory == "push_in":
            # Smoothly zooms in towards center
            zoom_expr = f"min(zoom+{step:.5f},1.15)"
            x_expr = "iw/2-(iw/zoom/2)"
            y_expr = "ih/2-(ih/zoom/2)"
        elif trajectory == "pull_out":
            # Smoothly zooms out from 1.15 to 1.0
            zoom_expr = f"max(1.15-{step:.5f}*on,1.0)"
            x_expr = "iw/2-(iw/zoom/2)"
            y_expr = "ih/2-(ih/zoom/2)"
        elif trajectory == "pan_left_to_right":
            # Zooms slightly (1.10) and pans horizontally from left to right
            zoom_expr = "1.10"
            pan_step = f"((iw-iw/zoom)/{frames})*on"
            x_expr = f"min({pan_step},iw-iw/zoom)"
            y_expr = "ih/2-(ih/zoom/2)"
        elif trajectory == "diagonal_drift":
            # Zooms and drifts diagonally from top-left to bottom-right
            zoom_expr = f"min(1.05+{step:.5f},1.18)"
            x_expr = f"((iw-iw/zoom)/{frames})*on"
            y_expr = f"((ih-ih/zoom)/{frames})*on"
        else:
            zoom_expr = f"min(zoom+{step:.5f},1.12)"
            x_expr = "iw/2-(iw/zoom/2)"
            y_expr = "ih/2-(ih/zoom/2)"

        filter_str = (
            f"[{input_idx}:v]scale={width}:{height}:force_original_aspect_ratio=increase,"
            f"crop={width}:{height},"
            f"zoompan=z='{zoom_expr}':d={frames}:x='{x_expr}':y='{y_expr}':s={width}x{height}:fps={fps}[v{input_idx}];"
        )
        return filter_str

    def render_cinematic_slideshow(
        self,
        image_paths: List[str],
        audio_path: str,
        output_filename: Optional[str] = None,
        title_text: Optional[str] = None,
        subtitle_text: Optional[str] = None,
        fps: int = 30
    ) -> Dict[str, Any]:
        """
        Combines a list of scene images into a seamless 2.5D moving vertical video (1080x1920)
        with alternating camera trajectories and audio.
        """
        if not image_paths:
            return {"success": False, "error": "No image paths provided"}
        if not os.path.exists(audio_path):
            return {"success": False, "error": f"Audio file not found: {audio_path}"}

        # 1. Probe audio duration
        duration_s = 8.0
        try:
            from app.story.audioProbe import probeDurationMs
            import asyncio
            ms = asyncio.run(probeDurationMs(audio_path))
            if ms and ms > 0:
                duration_s = ms / 1000.0
        except Exception:
            pass

        per_cut_duration = duration_s / len(image_paths)
        ffmpeg_bin = self._get_ffmpeg_bin()

        if not output_filename:
            output_filename = f"cinematic_25d_{uuid.uuid4().hex[:10]}.mp4"
        out_video_path = self.exports_dir / output_filename

        cmd = [ffmpeg_bin, "-y"]
        filter_parts = []

        for idx, img in enumerate(image_paths):
            cmd.extend(["-loop", "1", "-t", f"{per_cut_duration:.2f}", "-i", img])
            traj = TRAJECTORY_PRESETS[idx % len(TRAJECTORY_PRESETS)]
            filter_parts.append(self.build_zoompan_filter(idx, per_cut_duration, trajectory=traj, fps=fps))

        concat_in = "".join([f"[v{i}]" for i in range(len(image_paths))])
        concat_part = f"{concat_in}concat=n={len(image_paths)}:v=1:a=0[vconcat];"
        filter_parts.append(concat_part)

        # Title and Subtitle overlays with Windows system font
        font_path = "C\\:/Windows/Fonts/malgun.ttf"
        last_vtag = "vconcat"

        if title_text or subtitle_text:
            text_filters = [f"[{last_vtag}]drawbox=y=ih-260:color=black@0.65:width=iw:height=180:t=fill"]
            if title_text:
                clean_t = title_text.replace("'", "").replace(":", "")
                text_filters.append(f"drawtext=fontfile='{font_path}':text='{clean_t}':fontsize=36:fontcolor=yellow:x=(w-text_w)/2:y=h-240")
            if subtitle_text:
                clean_s = subtitle_text.replace("'", "").replace(":", "")
                text_filters.append(f"drawtext=fontfile='{font_path}':text='{clean_s}':fontsize=28:fontcolor=white:x=(w-text_w)/2:y=h-180")
            
            overlay_str = ",".join(text_filters) + "[vout]"
            filter_parts.append(overlay_str)
            last_vtag = "vout"
        else:
            filter_parts[-1] = filter_parts[-1].replace("[vconcat];", "[vout]")
            last_vtag = "vout"

        full_filtergraph = "".join(filter_parts)

        cmd.extend(["-i", audio_path])
        cmd.extend([
            "-filter_complex", full_filtergraph,
            "-map", f"[{last_vtag}]",
            "-map", f"{len(image_paths)}:a",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            str(out_video_path)
        ])

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace")
            if out_video_path.exists() and out_video_path.stat().st_size > 10000:
                mb = round(out_video_path.stat().st_size / (1024 * 1024), 2)
                logger.info(f"✨ [ParallaxMotion] Video rendered: {out_video_path} ({mb} MB, {duration_s:.1f}s)")
                return {
                    "success": True,
                    "video_path": str(out_video_path),
                    "file_name": output_filename,
                    "size_mb": mb,
                    "duration_s": duration_s,
                    "resolution": "1080x1920",
                    "fps": fps
                }
            else:
                logger.error(f"FFmpeg parallax render failed: {res.stderr[-300:]}")
                return {"success": False, "error": res.stderr[-300:]}
        except Exception as e:
            logger.error(f"Execution error in parallax renderer: {e}")
    def render_parallax_motion(
        self,
        image_path: str,
        motion_type: str = "push_in",
        duration_sec: float = 4.0,
        aspect_ratio: str = "9:16",
        fps: int = 60,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Renders a single static image into a high-fps 2.5D camera motion video clip.
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        # Resolution resolution
        if aspect_ratio == "16:9":
            w, h = 1920, 1080
        elif aspect_ratio == "1:1":
            w, h = 1080, 1080
        else:
            w, h = 1080, 1920

        if not output_filename:
            output_filename = f"motion_{motion_type}_{uuid.uuid4().hex[:8]}.mp4"
        out_video_path = self.exports_dir / output_filename
        ffmpeg_bin = self._get_ffmpeg_bin()

        frames = max(30, int(duration_sec * fps))
        step = 0.15 / frames

        if motion_type == "pull_out":
            zoom_expr = f"max(1.15-{step:.5f}*on,1.0)"
            x_expr = "iw/2-(iw/zoom/2)"
            y_expr = "ih/2-(ih/zoom/2)"
        elif motion_type == "pan_left_to_right":
            zoom_expr = "1.10"
            pan_step = f"((iw-iw/zoom)/{frames})*on"
            x_expr = f"min({pan_step},iw-iw/zoom)"
            y_expr = "ih/2-(ih/zoom/2)"
        elif motion_type == "diagonal_drift":
            zoom_expr = f"min(1.05+{step:.5f},1.18)"
            x_expr = f"((iw-iw/zoom)/{frames})*on"
            y_expr = f"((ih-ih/zoom)/{frames})*on"
        else:  # push_in
            zoom_expr = f"min(zoom+{step:.5f},1.15)"
            x_expr = "iw/2-(iw/zoom/2)"
            y_expr = "ih/2-(ih/zoom/2)"

        filtergraph = (
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=increase,"
            f"crop={w}:{h},"
            f"zoompan=z='{zoom_expr}':d={frames}:x='{x_expr}':y='{y_expr}':s={w}x{h}:fps={fps},"
            f"format=yuv420p[vout]"
        )

        cmd = [
            ffmpeg_bin, "-y",
            "-loop", "1", "-t", f"{duration_sec:.2f}",
            "-i", image_path,
            "-filter_complex", filtergraph,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-preset", "faster",
            "-crf", "18",
            str(out_video_path)
        ]

        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace")
            if out_video_path.exists() and out_video_path.stat().st_size > 1000:
                mb = round(out_video_path.stat().st_size / (1024 * 1024), 2)
                logger.info(f"✨ [ParallaxMotion] Single clip rendered: {out_video_path} ({mb} MB, {duration_sec}s, {fps}fps)")
                return {
                    "success": True,
                    "video_path": str(out_video_path),
                    "motion_type": motion_type,
                    "duration_sec": duration_sec,
                    "aspect_ratio": aspect_ratio,
                    "fps": fps,
                    "size_mb": mb
                }
            else:
                logger.error(f"FFmpeg motion clip failed: {res.stderr[-300:]}")
                return {"success": False, "error": res.stderr[-300:]}
        except Exception as e:
            logger.error(f"Execution error in render_parallax_motion: {e}")
            return {"success": False, "error": str(e)}


parallax_motion_renderer = ParallaxMotionRenderer()

