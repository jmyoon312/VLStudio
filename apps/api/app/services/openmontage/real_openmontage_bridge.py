"""
Real OpenMontage Engine Bridge.
===============================
Connects ViraLoop Studio directly to the installed OpenMontage engine:
C:\\Users\\jmyoo\\AppData\\Local\\ViraLoop Studio\\engines\\openmontage\\remotion-composer

Executes Remotion CLI to render authentic 1080x1920 MP4 motion graphics shorts.
Output directory conforms to Rule 9 (Media Storage Hierarchy: 05_Exports).
"""

import sys
import os
import json
import uuid
import shutil
import logging
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("real_openmontage_bridge")

# Single Source of Truth Paths
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", r"C:\Users\jmyoo\AppData\Local")
STUDIO_ROOT = Path(LOCAL_APPDATA) / "ViraLoop Studio"
REAL_OPENMONTAGE_DIR = STUDIO_ROOT / "engines" / "openmontage"
REMOTION_COMPOSER_DIR = REAL_OPENMONTAGE_DIR / "remotion-composer"
MEDIA_DIR = STUDIO_ROOT / "media"
OPERATIONS_DIR = MEDIA_DIR / "02_Operations"
EXPORTS_DIR = MEDIA_DIR / "05_Exports"


def _find_cmd(*names: str) -> Optional[str]:
    for n in names:
        resolved = shutil.which(n)
        if resolved:
            return resolved
    return None


class RealOpenMontageBridge:
    """
    Direct bridge to the physically installed OpenMontage Remotion Engine.
    """

    @classmethod
    def is_engine_available(cls) -> bool:
        """Checks if the physical OpenMontage installation exists and node_modules are intact."""
        return (
            REMOTION_COMPOSER_DIR.exists()
            and (REMOTION_COMPOSER_DIR / "src" / "index.tsx").exists()
            and (REMOTION_COMPOSER_DIR / "node_modules").exists()
        )

    @classmethod
    def render_video_sync(
        cls,
        title: str,
        cues: List[Dict[str, Any]],
        duration_s: float = 15.0,
        archetype: str = "classic",
        narration_audio_path: Optional[str] = None,
        bgm_audio_path: Optional[str] = None,
        sidecar_v4: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Renders a video using the authentic OpenMontage Remotion CLI.
        Falls back to MontageFastRenderer if Node/Remotion encounters an execution error.
        """
        OPERATIONS_DIR.mkdir(parents=True, exist_ok=True)
        EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

        # 1. Transpile to OpenMontage ExplainerProps
        from app.services.openmontage.v4_to_montage_transpiler import V4ToMontageTranspiler
        props = V4ToMontageTranspiler.transpile_cues_to_props(
            title=title,
            cues=cues,
            duration_s=duration_s,
            narration_audio_path=narration_audio_path,
            bgm_audio_path=bgm_audio_path,
            sidecar_v4=sidecar_v4
        )

        # 2. Write props.json into 02_Operations
        task_id = uuid.uuid4().hex[:8]
        props_path = OPERATIONS_DIR / f"openmontage_props_{task_id}.json"
        with open(props_path, "w", encoding="utf-8") as f:
            json.dump(props, f, ensure_ascii=False, indent=2)

        # Save sidecar v4 JSON alongside
        if sidecar_v4:
            sidecar_path = OPERATIONS_DIR / f"sidecar_v4_{task_id}.json"
            with open(sidecar_path, "w", encoding="utf-8") as sf:
                json.dump(sidecar_v4, sf, ensure_ascii=False, indent=2)

        # 3. Output MP4 path in 05_Exports
        clean_title = "".join(c for c in title if c.isalnum() or c in (" ", "_", "-")).strip() or "video"
        output_filename = f"OpenMontage_{clean_title[:16].replace(' ', '_')}_{task_id}.mp4"
        output_path = EXPORTS_DIR / output_filename

        # 4. Attempt Authentic Remotion Render if engine is present
        npx_cmd = _find_cmd("npx.cmd", "npx", "npx.exe")
        if cls.is_engine_available() and npx_cmd:
            logger.info(f"🎬 [RealOpenMontage] Launching Remotion CLI render: {output_path}")
            try:
                cmd = [
                    npx_cmd,
                    "remotion",
                    "render",
                    "src/index.tsx",
                    "Explainer",
                    str(output_path),
                    "--props",
                    str(props_path),
                    "--codec",
                    "h264"
                ]
                # Execute synchronously within thread
                res = subprocess.run(
                    cmd,
                    cwd=str(REMOTION_COMPOSER_DIR),
                    capture_output=True,
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    timeout=180,
                    check=False
                )
                if res.returncode == 0 and output_path.exists() and output_path.stat().st_size > 1024:
                    logger.info(f"✅ [RealOpenMontage] Render completed successfully: {output_path} ({output_path.stat().st_size} bytes)")
                    return str(output_path)
                else:
                    logger.warning(f"⚠️ [RealOpenMontage] Remotion render non-zero returncode ({res.returncode}): {res.stderr[:300]}")
            except Exception as rem_err:
                logger.warning(f"⚠️ [RealOpenMontage] Remotion CLI execution error: {rem_err}")

        # 5. Graceful Sovereign Fallback: MontageFastRenderer
        logger.info(f"🔄 [RealOpenMontage] Using MontageFastRenderer for guaranteed deliverable: {output_path}")
        from app.services.openmontage.montage_fast_renderer import MontageFastRenderer
        return MontageFastRenderer.render_shorts_mp4(
            title=title,
            cues=cues,
            duration_s=duration_s,
            output_path=str(output_path)
        )

    @classmethod
    async def render_video(
        cls,
        title: str,
        cues: List[Dict[str, Any]],
        duration_s: float = 15.0,
        archetype: str = "classic",
        narration_audio_path: Optional[str] = None,
        bgm_audio_path: Optional[str] = None,
        sidecar_v4: Optional[Dict[str, Any]] = None
    ) -> str:
        """Asynchronous wrapper for background execution."""
        return await asyncio.to_thread(
            cls.render_video_sync,
            title=title,
            cues=cues,
            duration_s=duration_s,
            archetype=archetype,
            narration_audio_path=narration_audio_path,
            bgm_audio_path=bgm_audio_path,
            sidecar_v4=sidecar_v4
        )
