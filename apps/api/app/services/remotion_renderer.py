"""
[ViraLoop Sovereign Media Engine] Remotion Headless Direct Renderer Service
Bridges Python backend with Node.js Remotion CLI for 100% autonomous MP4 rendering.
"""

import os
import sys
import json
import logging
import asyncio
import subprocess
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger("remotion_renderer")

class RemotionRenderer:
    def __init__(self, workspace_root: Optional[str] = None):
        if workspace_root:
            self.root_dir = Path(workspace_root)
        else:
            # Detect project root (c:/ViraLoopMedia/VLStudio)
            current = Path(__file__).resolve()
            # Climb up until we find apps/remotion-engine or reach drive root
            root_candidate = current.parents[4] if len(current.parents) >= 5 else current.parent
            for p in current.parents:
                if (p / "apps" / "remotion-engine").exists():
                    root_candidate = p
                    break
            self.root_dir = root_candidate
            
        self.remotion_dir = self.root_dir / "apps" / "remotion-engine"
        self.cli_path = self.remotion_dir / "render_cli.js"
        
        # Default export directory (05_Exports standard)
        self.export_dir = self.root_dir / "05_Exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)

    async def render_short(
        self,
        project_id: str,
        video_source: Optional[str] = None,
        image_source: Optional[str] = None,
        audio_source: Optional[str] = None,
        bgm_source: Optional[str] = None,
        title_hook: str = "0.8초 쨉쨉이 충격 반전!",
        subtitles: Optional[List[Dict[str, Any]]] = None,
        accent_color: str = "#FFE600",
        duration_seconds: float = 15.0,
        fps: int = 30,
    ) -> Dict[str, Any]:
        """
        Renders a 9:16 short video directly to MP4 using headless Remotion.
        """
        output_mp4 = self.export_dir / f"{project_id}.mp4"
        props_file = self.export_dir / f"{project_id}_props.json"

        # Format input props
        props_data = {
            "titleHook": title_hook,
            "accentColor": accent_color,
            "subtitles": subtitles or [],
        }

        if video_source and os.path.exists(video_source):
            # Normalize to forward slashes or file URL for Chromium
            props_data["videoSource"] = Path(video_source).as_posix()
        elif image_source and os.path.exists(image_source):
            props_data["imageSource"] = Path(image_source).as_posix()

        if audio_source and os.path.exists(audio_source):
            props_data["audioSource"] = Path(audio_source).as_posix()

        if bgm_source and os.path.exists(bgm_source):
            props_data["bgmSource"] = Path(bgm_source).as_posix()

        # Write props JSON
        with open(props_file, "w", encoding="utf-8") as f:
            json.dump(props_data, f, ensure_ascii=False, indent=2)

        duration_in_frames = int(duration_seconds * fps)

        cmd = [
            "node",
            str(self.cli_path),
            "--props", str(props_file),
            "--output", str(output_mp4),
            "--durationInFrames", str(duration_in_frames),
        ]

        logger.info(f"🚀 [RemotionRenderer] Launching render CLI for project '{project_id}'...")
        logger.info(f"   Command: {' '.join(cmd)}")

        try:
            # Run async subprocess in worker directory
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(self.remotion_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            stdout, stderr = await process.communicate()
            stdout_text = stdout.decode("utf-8", errors="replace")
            stderr_text = stderr.decode("utf-8", errors="replace")

            if process.returncode != 0:
                logger.error(f"❌ [RemotionRenderer] Process failed (code {process.returncode}):\n{stderr_text}\n{stdout_text}")
                return {
                    "success": False,
                    "error": f"Render process failed with exit code {process.returncode}",
                    "details": stderr_text or stdout_text
                }

            # Verify file exists on disk and is non-empty
            if not output_mp4.exists() or output_mp4.stat().st_size == 0:
                logger.error(f"❌ [RemotionRenderer] Rendered file does not exist or is empty: {output_mp4}")
                return {
                    "success": False,
                    "error": "Rendered MP4 file missing or 0 bytes",
                    "details": stdout_text
                }

            file_size_mb = output_mp4.stat().st_size / (1024 * 1024)
            logger.info(f"✅ [RemotionRenderer] Successfully rendered MP4: {output_mp4} ({file_size_mb:.2f} MB)")

            return {
                "success": True,
                "video_path": str(output_mp4),
                "file_size_bytes": output_mp4.stat().st_size,
                "duration_seconds": duration_seconds,
                "props_path": str(props_file),
            }

        except Exception as e:
            logger.exception(f"❌ [RemotionRenderer] Exception during rendering: {e}")
            return {
                "success": False,
                "error": str(e)
            }


remotion_renderer = RemotionRenderer()
