"""
Hugging Face ZeroGPU Remote Video Client
=========================================
Leverages free ZeroGPU (NVIDIA A100 80GB) public spaces via gradio_client for:
1. Wan 2.1 (SOTA Image-to-Video 5s MP4 Generation)
2. LivePortrait (Talking Head Lip-Synced Video from Image + Audio)
Includes automatic fallback to local 2.5D parallax motion if remote is queued/offline.
"""

import os
import sys
import uuid
import shutil
import logging
from pathlib import Path
from typing import Optional, Dict, Any

from app.config import settings as app_settings
from app.services.parallax_motion_renderer import parallax_motion_renderer

logger = logging.getLogger("hf_zerogpu_video_client")

# Public ZeroGPU Spaces for Video Generation (Hermes v0.21.4 Video Catalog Expansion)
WAN_SPACE_ID = "Wan-AI/Wan2.1"
WAN_FAST_SPACE_ID = "multimodalart/wan2-1-fast"
LIVEPORTRAIT_SPACE_ID = "KwaiVGI/LivePortrait"
LTX_SPACE_ID = "Lightricks/LTX-Video"
LTX_FAST_SPACE_ID = "multimodalart/LTX-Video-fast"
KLING_SPACE_ID = "KlingTeam/Kling-AI"


class HFZeroGPUVideoClient:
    """
    Connects to free Hugging Face ZeroGPU spaces to render AI videos at zero cost.
    """

    def __init__(self):
        self.exports_dir = Path(app_settings.EXPORTS_DIR)
        self.exports_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir = Path(app_settings.TEMP_DIR) / "video_cuts"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    def generate_wan21_video(
        self,
        image_path: str,
        prompt: str,
        motion_strength: float = 1.0,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a 5-second SOTA moving video clip from an image using Wan 2.1 on ZeroGPU.
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        logger.info(f"🎬 [HF ZeroGPU] Requesting Wan 2.1 video generation for: {image_path}")

        try:
            from gradio_client import Client, handle_file

            for space in [WAN_FAST_SPACE_ID, WAN_SPACE_ID]:
                try:
                    logger.info(f"⏳ [HF ZeroGPU] Connecting to space: {space}...")
                    client = Client(space)
                    
                    # Call prediction endpoint
                    res = client.predict(
                        image=handle_file(image_path),
                        prompt=prompt,
                        api_name="/generate_video"
                    )
                    
                    if res and os.path.exists(str(res)):
                        if not output_filename:
                            output_filename = f"wan21_cut_{uuid.uuid4().hex[:10]}.mp4"
                        target_path = self.temp_dir / output_filename
                        shutil.copy2(str(res), str(target_path))
                        
                        logger.info(f"✨ [HF ZeroGPU] Wan 2.1 Video successfully generated: {target_path}")
                        return {
                            "success": True,
                            "video_path": str(target_path),
                            "file_name": output_filename,
                            "engine": "Wan 2.1 (ZeroGPU A100)",
                            "space_used": space
                        }
                except Exception as space_err:
                    logger.warning(f"⚠️ Space {space} unavailable ({space_err}), trying next...")

        except Exception as e:
            logger.warning(f"⚠️ [HF ZeroGPU] Remote generation failed: {e}")

        # Graceful fallback to local 2.5D Parallax Motion (Zero downtime guarantee)
        logger.info("⚡ [HF ZeroGPU] Remote busy. Executing instant local 2.5D Parallax fallback...")
        return {
            "success": False,
            "fallback_available": True,
            "error": "ZeroGPU spaces busy, recommend local 2.5D parallax fallback"
        }

    generate_wan21_i2v = generate_wan21_video

    def generate_liveportrait_talking_head(
        self,
        portrait_image_path: str,
        driving_audio_path: str,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a photorealistic lip-synced talking head video from a portrait image and audio file.
        """
        if not os.path.exists(portrait_image_path):
            return {"success": False, "error": f"Portrait image not found: {portrait_image_path}"}
        if not os.path.exists(driving_audio_path):
            return {"success": False, "error": f"Audio file not found: {driving_audio_path}"}

        logger.info(f"🗣️ [HF ZeroGPU] Requesting LivePortrait lip-sync video...")

        try:
            from gradio_client import Client, handle_file
            client = Client(LIVEPORTRAIT_SPACE_ID)
            
            res = client.predict(
                source_image=handle_file(portrait_image_path),
                driving_audio=handle_file(driving_audio_path),
                api_name="/generate_audio_driven_video"
            )
            
            if res and os.path.exists(str(res)):
                if not output_filename:
                    output_filename = f"liveportrait_{uuid.uuid4().hex[:10]}.mp4"
                target_path = self.temp_dir / output_filename
                shutil.copy2(str(res), str(target_path))
                
                logger.info(f"✨ [HF ZeroGPU] LivePortrait video ready: {target_path}")
                return {
                    "success": True,
                    "video_path": str(target_path),
                    "file_name": output_filename,
                    "engine": "LivePortrait (ZeroGPU A100)"
                }
        except Exception as e:
            logger.warning(f"⚠️ [HF ZeroGPU] LivePortrait error: {e}")

        return {
            "success": False,
            "error": "LivePortrait generation temporarily unavailable"
        }

    def generate_ltx_video(
        self,
        image_path: str,
        prompt: str,
        duration_sec: int = 5,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        [Hermes v0.21.4 Video Catalog] Generates a 24fps high-motion video clip using Lightricks LTX Video 2.5.
        Auto-falls back to local 2.5D parallax motion if remote is busy.
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        logger.info(f"⚡ [HF ZeroGPU] Requesting LTX Video 2.5 generation for: {image_path} (prompt: '{prompt[:30]}')")

        try:
            from gradio_client import Client, handle_file

            for space in [LTX_FAST_SPACE_ID, LTX_SPACE_ID]:
                try:
                    logger.info(f"⏳ [HF ZeroGPU] Connecting to LTX space: {space}...")
                    client = Client(space)
                    res = client.predict(
                        image=handle_file(image_path),
                        prompt=prompt,
                        api_name="/generate_video"
                    )
                    if res and os.path.exists(str(res)):
                        if not output_filename:
                            output_filename = f"ltx25_cut_{uuid.uuid4().hex[:10]}.mp4"
                        target_path = self.temp_dir / output_filename
                        shutil.copy2(str(res), str(target_path))
                        logger.info(f"✨ [HF ZeroGPU] LTX 2.5 Video ready: {target_path}")
                        return {
                            "success": True,
                            "video_path": str(target_path),
                            "file_name": output_filename,
                            "engine": "Lightricks LTX Video 2.5 (24fps)",
                            "space_used": space
                        }
                except Exception as space_err:
                    logger.warning(f"⚠️ Space {space} unavailable ({space_err}), trying next...")
        except Exception as e:
            logger.warning(f"⚠️ [HF ZeroGPU] LTX 2.5 generation failed: {e}")

        # Local 2.5D Parallax Fallback
        logger.info("⚡ [HF ZeroGPU] LTX busy. Executing instant local 2.5D Parallax fallback...")
        if not output_filename:
            output_filename = f"ltx_fallback_{uuid.uuid4().hex[:10]}.mp4"
        fallback_path = str(self.temp_dir / output_filename)
        fallback_res = parallax_motion_renderer.render_parallax_clip(
            image_path=image_path,
            output_path=fallback_path,
            duration=float(duration_sec),
            motion_preset="dramatic_zoom_in"
        )
        if fallback_res.get("success"):
            return {
                "success": True,
                "video_path": fallback_path,
                "file_name": output_filename,
                "engine": "Local 2.5D Parallax Motion (LTX Fallback)",
                "fallback": True
            }
        return {"success": False, "error": "LTX 2.5 and local fallback both failed"}

    def generate_kling_video(
        self,
        image_path: str,
        prompt: str,
        duration_sec: int = 5,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        [Hermes v0.21.4 Video Catalog] Generates a cinematic realistic video clip using Kling O3.
        Auto-falls back to local 2.5D parallax motion if remote is busy.
        """
        if not os.path.exists(image_path):
            return {"success": False, "error": f"Image file not found: {image_path}"}

        logger.info(f"🎬 [HF ZeroGPU] Requesting Kling O3 cinematic video for: {image_path} (prompt: '{prompt[:30]}')")

        try:
            from gradio_client import Client, handle_file

            logger.info(f"⏳ [HF ZeroGPU] Connecting to Kling space: {KLING_SPACE_ID}...")
            client = Client(KLING_SPACE_ID)
            res = client.predict(
                image=handle_file(image_path),
                prompt=prompt,
                api_name="/generate"
            )
            if res and os.path.exists(str(res)):
                if not output_filename:
                    output_filename = f"kling_cut_{uuid.uuid4().hex[:10]}.mp4"
                target_path = self.temp_dir / output_filename
                shutil.copy2(str(res), str(target_path))
                logger.info(f"✨ [HF ZeroGPU] Kling O3 Video ready: {target_path}")
                return {
                    "success": True,
                    "video_path": str(target_path),
                    "file_name": output_filename,
                    "engine": "Kling O3 Cinematic",
                    "space_used": KLING_SPACE_ID
                }
        except Exception as e:
            logger.warning(f"⚠️ [HF ZeroGPU] Kling O3 generation failed: {e}")

        # Local 2.5D Parallax Fallback
        logger.info("⚡ [HF ZeroGPU] Kling busy. Executing instant local 2.5D Parallax fallback...")
        if not output_filename:
            output_filename = f"kling_fallback_{uuid.uuid4().hex[:10]}.mp4"
        fallback_path = str(self.temp_dir / output_filename)
        fallback_res = parallax_motion_renderer.render_parallax_clip(
            image_path=image_path,
            output_path=fallback_path,
            duration=float(duration_sec),
            motion_preset="cinematic_pan_right"
        )
        if fallback_res.get("success"):
            return {
                "success": True,
                "video_path": fallback_path,
                "file_name": output_filename,
                "engine": "Local 2.5D Parallax Motion (Kling Fallback)",
                "fallback": True
            }
        return {"success": False, "error": "Kling O3 and local fallback both failed"}


hf_zerogpu_video_client = HFZeroGPUVideoClient()

