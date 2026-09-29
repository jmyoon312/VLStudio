# -*- coding: utf-8 -*-
"""
ViraLoop Sovereign Video Director Engine
Orchestrates end-to-end and surgical incremental video generation:
- Multi-scene Video/Image composition (Remotion + FFmpeg)
- Gemini 3.8 Flash TTS Voice Director (10 age groups, 16 roles, 10 moods) with Supertonic fallback
- HeyGen HyperFrames Voiceover Carve (400, 1000, 1600Hz formant pocket) + BGM ducking
- Fast surgical modifications (modify_subtitles, modify_voice, modify_jab, modify_media)
  that re-render only the affected layers in seconds while reusing all heavy cached assets.
"""

import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

import os
import json
import uuid
import asyncio
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.services.remotion_renderer import RemotionRenderer
from app.services.audio_production_pipeline import AudioProductionPipeline, AudioMixConfig
from app.services.gemini_tts_optimizer import gemini_tts_optimizer
from app.services.zero_download_slicer import zero_download_slicer
from app.services.direct_gemini_image_generator import direct_gemini_image_generator
from app.services.sfx_library_service import SFXLibraryService
from app.tts_engine import TTSEngine
from app.config import settings

logger = logging.getLogger("sovereign_video_director")

class SovereignVideoDirector:
    def __init__(self, export_dir: Optional[str] = None):
        if export_dir:
            self.export_dir = Path(export_dir)
        else:
            local_app = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
            if local_app:
                self.export_dir = Path(local_app) / "ViraLoop Studio" / "media" / "05_Exports"
            else:
                self.export_dir = Path.home() / ".viraloop_studio" / "media" / "05_Exports"
        self.export_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir = self.export_dir / "projects"
        self.projects_dir.mkdir(parents=True, exist_ok=True)

        self.remotion = RemotionRenderer()
        self.audio_pipeline = AudioProductionPipeline(output_dir=str(self.export_dir / "audio"))
        self.tts = TTSEngine(settings)

    def get_project_dir(self, project_id: str) -> Path:
        pdir = self.projects_dir / project_id
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir

    def get_storyboard_path(self, project_id: str) -> Path:
        return self.get_project_dir(project_id) / "storyboard.json"

    def load_storyboard(self, project_id: str) -> Optional[Dict[str, Any]]:
        sb_path = self.get_storyboard_path(project_id)
        if sb_path.exists():
            try:
                with open(sb_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"[Director] Failed to load storyboard for {project_id}: {e}")
        return None

    def save_storyboard(self, project_id: str, data: Dict[str, Any]) -> str:
        sb_path = self.get_storyboard_path(project_id)
        data["updated_at"] = datetime.now().isoformat()
        with open(sb_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(sb_path)

    async def init_or_update_project(
        self,
        project_id: str,
        title: str,
        script: str,
        scenes: Optional[List[Dict[str, Any]]] = None,
        voice_config: Optional[Dict[str, Any]] = None,
        subtitles: Optional[List[Dict[str, Any]]] = None,
        jab_overlay: Optional[Dict[str, Any]] = None,
        branding: Optional[Dict[str, Any]] = None,
        audio_config: Optional[Dict[str, Any]] = None,
        style_preset: str = "shorts",
    ) -> Dict[str, Any]:
        """
        Initializes or replaces the full Storyboard EDL for a project.
        """
        existing = self.load_storyboard(project_id) or {}
        pdir = self.get_project_dir(project_id)

        # Default Voice Config
        default_voice = {
            "provider": "gemini",
            "voice_name": "ko-KR-Standard-A",
            "role": "viral_creator",
            "age_demographic": "adult",
            "gender": "female",
            "mood": "excited",
            "speed_ratio": 1.15,
            "pitch_shift_semitones": 0.0,
            "audio_path": existing.get("voice", {}).get("audio_path"),
        }
        if voice_config:
            default_voice.update(voice_config)

        # Default Branding
        default_branding = {
            "has_top_header": True,
            "title_line1": title[:14] if title else "실시간 이슈 화제",
            "title_line2": "역대급 반전 순간 ㄷㄷ",
            "title_badge_text": "속보",
            "has_bottom_credit": True,
            "bottom_credit_text": "출처: 원본 비하인드 공식 영상",
        }
        if branding:
            default_branding.update(branding)

        # Default Jab Hook
        default_jab = {
            "text": "*상상도 못한 반전 직전*",
            "startMs": 2000,
            "endMs": 7000,
            "placement": "top-third",
            "tiltDeg": -3,
        }
        if jab_overlay:
            default_jab.update(jab_overlay)

        # Default Audio Mix
        default_audio = {
            "bgm_path": None,
            "bgm_volume": 0.22,
            "enable_ducking": True,
            "enable_formant_carve": True,
            "mixed_audio_path": existing.get("audio", {}).get("mixed_audio_path"),
        }
        if audio_config:
            default_audio.update(audio_config)

        storyboard = {
            "project_id": project_id,
            "title": title,
            "script": script,
            "scenes": scenes or existing.get("scenes") or [],
            "voice": default_voice,
            "subtitles": subtitles or existing.get("subtitles") or [],
            "jabOverlay": default_jab,
            "branding": default_branding,
            "audio": default_audio,
            "style_preset": style_preset,
            "last_rendered_mp4": existing.get("last_rendered_mp4"),
            "created_at": existing.get("created_at", datetime.now().isoformat()),
        }

        self.save_storyboard(project_id, storyboard)
        return storyboard

    async def render_project(
        self,
        project_id: str,
        force_voice: bool = False,
        force_audio_mix: bool = False,
    ) -> Dict[str, Any]:
        """
        Renders the complete project into MP4.
        Uses incremental caching: reuses existing TTS audio and mixed audio unless forced.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        pdir = self.get_project_dir(project_id)
        script_text = sb.get("script", "").strip()
        voice_cfg = sb.get("voice", {})

        # Step 1: Synthesize voice if needed
        voice_path = voice_cfg.get("audio_path")
        if force_voice or not voice_path or not os.path.exists(voice_path):
            logger.info(f"🎙️ [Director] Synthesizing voice for project '{project_id}'...")
            role = voice_cfg.get("role", "viral_creator")
            age = voice_cfg.get("age_demographic", "adult")
            gender = voice_cfg.get("gender", "female")
            mood = voice_cfg.get("mood", "excited")
            provider = voice_cfg.get("provider", "gemini")

            # Direct voice direction
            directing = gemini_tts_optimizer.auto_direct_script_voice(
                script_text, role=role, age_group=age, gender=gender, mood=mood
            )
            v_cfg = directing.get("voice_configuration", {})
            pitch_shift = voice_cfg.get("pitch_shift_semitones", v_cfg.get("pitch_shift", 0.0))
            speed_ratio = voice_cfg.get("speed_ratio", v_cfg.get("speed", 1.15))
            voice_name = voice_cfg.get("voice_name", v_cfg.get("voice_id", "Aoede"))
            style_instruction = v_cfg.get("style_instruction", "")

            try:
                gen_res = await self.tts.generate_audio(
                    text=script_text,
                    engine=provider,
                    language="ko",
                    voice_id=voice_name,
                    rate=int(round((speed_ratio - 1.0) * 100)),
                    pitch=int(round(pitch_shift)),
                    emotion=mood,
                    voice_settings={
                        "style_instruction": style_instruction,
                        "pitch_shift": pitch_shift,
                        "speed": speed_ratio,
                    },
                    project_name=project_id
                )

                if gen_res.get("file_path") and os.path.exists(gen_res["file_path"]):
                    voice_path = gen_res["file_path"]
                    dur = 15.0
                    try:
                        from pydub import AudioSegment
                        seg = AudioSegment.from_file(voice_path)
                        dur = len(seg) / 1000.0
                    except Exception:
                        pass
                    voice_cfg["audio_path"] = voice_path
                    voice_cfg["duration_seconds"] = dur
                    sb["voice"] = voice_cfg
                    force_audio_mix = True
            except Exception as e:
                logger.warning(f"Voice generation failed: {e}. Falling back to existing.")

        # If subtitles are empty, auto-generate aligned subtitles from script
        if not sb.get("subtitles") or len(sb["subtitles"]) == 0:
            total_duration_sec = voice_cfg.get("duration_seconds", 15.0)
            lines = [l.strip() for l in script_text.replace("\r", "").split("\n") if l.strip()]
            if not lines:
                lines = [script_text]
            line_duration_ms = int((total_duration_sec * 1000) / max(1, len(lines)))
            generated_subs = []
            for idx, line in enumerate(lines):
                s_ms = idx * line_duration_ms
                e_ms = s_ms + line_duration_ms
                generated_subs.append({"text": line, "startMs": s_ms, "endMs": e_ms})
            sb["subtitles"] = generated_subs

        # Step 2: Mix Audio (HeyGen HyperFrames Voiceover Carve + BGM ducking)
        audio_cfg = sb.get("audio", {})
        mixed_audio = audio_cfg.get("mixed_audio_path")
        bgm_path = audio_cfg.get("bgm_path")

        if force_audio_mix or not mixed_audio or not os.path.exists(mixed_audio):
            if voice_path and os.path.exists(voice_path):
                # Auto-select BGM if not provided
                if not bgm_path or not os.path.exists(bgm_path):
                    preview_dir = self.export_dir.parent / "03_Assets" / "bgm" / "preview_cache"
                    format_p = sb.get("format_preset") or sb.get("style_preset", "shorts")
                    bgm_map = {
                        "meokguri": "upbeat_preview.wav",
                        "gunlimbo_hook": "upbeat_preview.wav",
                        "one_take_batch": "upbeat_preview.wav",
                        "movie_drama": "suspense_preview.wav",
                        "ssul_board": "meme_preview.wav",
                        "song_karaoke": "piano_preview.wav",
                        "classic_shorts": "lofi_preview.wav"
                    }
                    cand = preview_dir / bgm_map.get(format_p, "upbeat_preview.wav")
                    if cand.exists():
                        bgm_path = str(cand)
                        audio_cfg["bgm_path"] = bgm_path

                sfx_paths = audio_cfg.get("sfx_paths", [])

                logger.info(f"🎛️ [Director] Mixing audio with HyperFrames Carve for '{project_id}' (BGM: {bool(bgm_path)}, SFX count: {len(sfx_paths)})...")
                mix_cfg = AudioMixConfig(
                    bgm_volume=audio_cfg.get("bgm_volume", 0.22),
                    voice_volume=1.0,
                    enable_ducking=audio_cfg.get("enable_ducking", True),
                    enable_voiceover_carve=audio_cfg.get("enable_formant_carve", True),
                )
                mixed_audio = await self.audio_pipeline._mix_audio(
                    voice_path=voice_path,
                    bgm_path=bgm_path,
                    sfx_paths=sfx_paths,
                    word_timestamps=[],
                    config=mix_cfg
                )
                audio_cfg["mixed_audio_path"] = mixed_audio
                sb["audio"] = audio_cfg

        # Step 3: Determine Total Duration
        duration_sec = voice_cfg.get("duration_seconds", 15.0)
        # Check if scenes have a longer duration
        scenes = sb.get("scenes", [])
        if scenes:
            max_scene_ms = max([s.get("endMs", 0) for s in scenes] or [0])
            if max_scene_ms > duration_sec * 1000:
                duration_sec = max_scene_ms / 1000.0

        # Step 4: Render via Remotion
        branding = sb.get("branding", {})
        logger.info(f"🚀 [Director] Rendering Remotion MP4 for project '{project_id}' ({duration_sec:.1f}s)...")
        render_res = await self.remotion.render_short(
            project_id=project_id,
            scenes=scenes,
            final_mixed_audio=mixed_audio,
            audio_source=voice_path if not mixed_audio else None,
            bgm_source=bgm_path if not mixed_audio else None,
            subtitles=sb.get("subtitles", []),
            jab_overlay=sb.get("jabOverlay"),
            has_top_header=branding.get("has_top_header", True),
            title_line1=branding.get("title_line1"),
            title_line2=branding.get("title_line2"),
            title_badge_text=branding.get("title_badge_text", "속보"),
            has_bottom_credit=branding.get("has_bottom_credit", True),
            bottom_credit_text=branding.get("bottom_credit_text"),
            style_preset=sb.get("style_preset", "shorts"),
            duration_seconds=duration_sec,
            fps=30
        )

        if render_res.get("success"):
            sb["last_rendered_mp4"] = render_res.get("video_path")
            self.save_storyboard(project_id, sb)
            render_res["storyboard"] = sb
            logger.info(f"✨ [Director] Project '{project_id}' rendered successfully: {render_res.get('video_path')}")
        else:
            logger.error(f"❌ [Director] Project '{project_id}' rendering failed: {render_res.get('error')}")

        return render_res

    # ─────────────────────────────────────────────────────────────────────────
    # ⚡ Surgical Quick Modification Methods (Instant Re-rendering)
    # ─────────────────────────────────────────────────────────────────────────

    async def modify_subtitles(
        self,
        project_id: str,
        new_subtitles: List[Dict[str, Any]],
        style_preset: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Modifies subtitles only and re-renders MP4 in ~3 seconds.
        Audio and media are 100% reused from cache.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        sb["subtitles"] = new_subtitles
        if style_preset:
            sb["style_preset"] = style_preset
        self.save_storyboard(project_id, sb)

        logger.info(f"⚡ [Director] Surgical update: Subtitles modified for '{project_id}'. Re-rendering...")
        return await self.render_project(project_id, force_voice=False, force_audio_mix=False)

    async def modify_voice(
        self,
        project_id: str,
        voice_updates: Dict[str, Any],
        new_script: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Modifies voice settings/actor or script text, re-synthesizes ONLY audio,
        and re-renders in seconds while reusing all scene video/image clips.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        if new_script:
            sb["script"] = new_script
        sb["voice"].update(voice_updates)
        self.save_storyboard(project_id, sb)

        logger.info(f"⚡ [Director] Surgical update: Voice modified for '{project_id}'. Re-synthesizing voice & re-rendering...")
        return await self.render_project(project_id, force_voice=True, force_audio_mix=True)

    async def modify_jab(
        self,
        project_id: str,
        jab_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Modifies 쨉쨉이 (jab hook) badge text/timing and re-renders in ~3 seconds.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        sb["jabOverlay"].update(jab_updates)
        self.save_storyboard(project_id, sb)

        logger.info(f"⚡ [Director] Surgical update: Jab hook modified for '{project_id}'. Re-rendering...")
        return await self.render_project(project_id, force_voice=False, force_audio_mix=False)

    async def modify_scene_media(
        self,
        project_id: str,
        scene_id: str,
        new_media_path: str,
        media_type: str = "image"
    ) -> Dict[str, Any]:
        """
        Replaces media asset for a single specific scene and re-renders.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        scenes = sb.get("scenes", [])
        matched = False
        for s in scenes:
            if str(s.get("id")) == str(scene_id) or str(s.get("scene_id")) == str(scene_id):
                s["src"] = new_media_path
                s["type"] = media_type
                matched = True
                break

        if not matched and scenes:
            scenes[0]["src"] = new_media_path
            scenes[0]["type"] = media_type

        sb["scenes"] = scenes
        self.save_storyboard(project_id, sb)

        logger.info(f"⚡ [Director] Surgical update: Scene media replaced for '{project_id}'. Re-rendering...")
        return await self.render_project(project_id, force_voice=False, force_audio_mix=False)

    async def modify_bgm(
        self,
        project_id: str,
        bgm_path: str,
        bgm_volume: float = 0.22
    ) -> Dict[str, Any]:
        """
        Replaces BGM track and re-renders.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        sb["audio"]["bgm_path"] = bgm_path
        sb["audio"]["bgm_volume"] = bgm_volume
        self.save_storyboard(project_id, sb)

        logger.info(f"⚡ [Director] Surgical update: BGM modified for '{project_id}'. Re-mixing & re-rendering...")
        return await self.render_project(project_id, force_voice=False, force_audio_mix=True)

    # ─────────────────────────────────────────────────────────────────────────
    # 🌟 Pixeling Reverse Engineering Evolutionary Capabilities
    # ─────────────────────────────────────────────────────────────────────────

    async def auto_sync_audio_peaks(
        self,
        project_id: str,
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Detects audio RMS peaks in the voice narration and automatically aligns:
        - Jab hook overlay (쨉쨉이 자막) precisely 500ms before the peak
        - Zoom pop beats (화면 줌 인) at the peak
        Reverse-engineered from Pixeling VE audio peak algorithm:
        Peaks >= 1200ms, startMs = peakMs - 500ms.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        voice_path = sb.get("voice", {}).get("audio_path")
        if not voice_path or not os.path.exists(voice_path):
            return {"success": False, "error": f"Voice audio not found for '{project_id}'"}

        peaks = self.audio_pipeline.detect_audio_peaks(voice_path)
        if not peaks:
            return {
                "success": True,
                "message": "No significant audio peaks detected. Existing timings preserved.",
                "peaks": []
            }

        # Select highest-scoring peak
        top_peak = max(peaks, key=lambda x: x["score"])
        jab = sb.get("jabOverlay", {})
        jab["startMs"] = top_peak["suggested_jab_start_ms"]
        jab["endMs"] = top_peak["suggested_jab_end_ms"]
        sb["jabOverlay"] = jab
        sb["audio_peaks"] = peaks
        self.save_storyboard(project_id, sb)

        logger.info(
            f"🎯 [Director] Audio peak synced for '{project_id}': peak at {top_peak['timeMs']}ms, "
            f"jab snapped to {jab['startMs']}~{jab['endMs']}ms"
        )

        render_res = {}
        if auto_re_render:
            render_res = await self.render_project(project_id, force_voice=False, force_audio_mix=False)

        return {
            "success": True,
            "project_id": project_id,
            "peaks": peaks,
            "top_peak": top_peak,
            "updated_jab": jab,
            "render_result": render_res
        }

    async def regenerate_weak_scenes(
        self,
        project_id: str,
        scene_indices: Optional[List[int]] = None,
        prompt_overrides: Optional[Dict[int, str]] = None,
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Surgically regenerates ONLY weak or failed scenes (약한 앵커/실패 씬 타겟 재생성)
        while preserving 100% of valid scenes, voice audio, BGM, and subtitles.
        Re-renders MP4 in ~4 seconds flat.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        scenes = sb.get("scenes", [])
        if not scenes:
            return {"success": False, "error": "No scenes found in project"}

        target_indices = []
        if scene_indices is not None:
            target_indices = [idx for idx in scene_indices if 0 <= idx < len(scenes)]
        else:
            # Auto-detect: missing files, placeholder, or weak scenes
            for idx, sc in enumerate(scenes):
                src = sc.get("src", "")
                if not src or not os.path.exists(src) or sc.get("is_weak") or sc.get("failed"):
                    target_indices.append(idx)

        if not target_indices:
            # If still none, target the first scene
            target_indices = [0]

        logger.info(f"🎨 [Director] Regenerating weak scenes {target_indices} for '{project_id}'...")

        pdir = self.get_project_dir(project_id)
        regenerated = []

        for idx in target_indices:
            sc = scenes[idx]
            override_prompt = prompt_overrides.get(idx) if prompt_overrides else None
            prompt = override_prompt or sc.get("prompt") or f"{sb.get('title', 'Scene')} visual scene {idx+1}"

            # High quality replacement image generation
            img_filename = f"scene_{idx+1}_regen_{uuid.uuid4().hex[:6]}.jpg"
            img_path = str(pdir / img_filename)
            generated_img_path = None
            account_used = "pil_fallback"

            # 1. Attempt Google Gemini 3.1 Flash Image (Nano Banana Pro via 10 Google accounts)
            try:
                gen_res = direct_gemini_image_generator.generate_image(
                    prompt=prompt,
                    aspect_ratio="9:16",
                    style_preset="cinematic_photorealism",
                    output_filename=img_filename
                )
                if gen_res.get("success") and gen_res.get("image_path"):
                    generated_img_path = gen_res["image_path"]
                    account_used = gen_res.get("account_used", "gemini_pool")
                    logger.info(f"✨ [Director] Scene {idx+1} generated via Gemini Flash Image: {generated_img_path}")
            except Exception as e:
                logger.warning(f"Direct Gemini image generation failed for scene {idx}: {e}")

            # 2. Attempt Free FLUX.1 engine fallback (100% free, no login needed)
            if not generated_img_path:
                try:
                    flux_res = direct_gemini_image_generator.generate_free_fallback_image(
                        prompt=prompt,
                        aspect_ratio="9:16",
                        output_filename=img_filename
                    )
                    if flux_res.get("success") and flux_res.get("image_path"):
                        generated_img_path = flux_res["image_path"]
                        account_used = "pollinations_flux1_free"
                        logger.info(f"🌸 [Director] Scene {idx+1} generated via FLUX.1 Free: {generated_img_path}")
                except Exception as e:
                    logger.warning(f"Free FLUX image generation failed for scene {idx}: {e}")

            # 3. Deterministic Aesthetic PIL Card fallback
            if not generated_img_path:
                try:
                    from PIL import Image, ImageDraw
                    img = Image.new("RGB", (1080, 1920), color=(15, 23, 42))
                    draw = ImageDraw.Draw(img)
                    colors = [(30, 41, 59), (51, 65, 85), (15, 23, 42)]
                    card_color = colors[idx % len(colors)]
                    draw.rectangle([60, 200, 1020, 1720], fill=card_color, outline=(245, 158, 11), width=4)
                    draw.text(
                        (540, 900),
                        f"[Regenerated Scene {idx+1}]\n{prompt[:35]}",
                        fill=(255, 255, 255),
                        anchor="mm"
                    )
                    img.save(img_path, quality=95)
                    generated_img_path = img_path
                except Exception as e:
                    logger.error(f"Failed to generate replacement for scene {idx}: {e}")

            if generated_img_path:
                sc["src"] = generated_img_path
                sc["type"] = "image"
                sc["is_weak"] = False
                sc["failed"] = False
                sc["prompt"] = prompt
                sc["regenerated_at"] = datetime.now().isoformat()
                sc["generator"] = account_used
                regenerated.append({"index": idx, "path": generated_img_path, "prompt": prompt, "engine": account_used})

        sb["scenes"] = scenes
        self.save_storyboard(project_id, sb)

        render_res = {}
        if auto_re_render:
            render_res = await self.render_project(project_id, force_voice=False, force_audio_mix=False)

        return {
            "success": True,
            "project_id": project_id,
            "regenerated_scenes": regenerated,
            "render_result": render_res
        }

    async def apply_format_preset(
        self,
        project_id: str,
        preset_name: str,
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Applies one of the 12 Pixeling-inspired sovereign format presets:
        one_take_batch, song_karaoke, meokguri, ranking_countdown, movie_drama,
        text_creative, stock_motion, gunlimbo_hook, ssul_board, classic_shorts.
        """
        if preset_name not in FORMAT_PRESETS:
            return {
                "success": False,
                "error": f"Unknown format preset '{preset_name}'. Available: {list(FORMAT_PRESETS.keys())}"
            }

        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        preset = FORMAT_PRESETS[preset_name]
        logger.info(f"🎭 [Director] Applying format preset '{preset_name}' ({preset['name']}) to '{project_id}'...")

        # Update voice
        sb["voice"].update(preset["voice"])
        # Update style preset
        sb["style_preset"] = preset.get("style_preset", "shorts")
        # Update jab hook
        sb["jabOverlay"].update(preset.get("jabOverlay", {}))
        # Update branding
        sb["branding"].update(preset.get("branding", {}))
        # Update audio mix
        sb["audio"].update(preset.get("audio", {}))
        sb["format_preset"] = preset_name

        self.save_storyboard(project_id, sb)

        render_res = {}
        if auto_re_render:
            # Re-synthesize voice if voice role/mood/speed changed
            render_res = await self.render_project(project_id, force_voice=True, force_audio_mix=True)

        return {
            "success": True,
            "project_id": project_id,
            "preset_applied": preset_name,
            "preset_details": preset,
            "render_result": render_res
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 🧬 Universal Archetype Detection & Analyzed Preset Transpiler
    # ─────────────────────────────────────────────────────────────────────────

    def detect_preset_archetype(self, preset_data: Dict[str, Any]) -> str:
        """
        Analyzes any preset JSON (from Channel DNA, Video Analysis, or Preset Vault)
        and automatically identifies its matching 12-form-factor archetype based purely
        on structural metadata, visual topology, typography, audio DSP, and pacing signatures.
        """
        if not isinstance(preset_data, dict):
            return "classic_shorts"

        # 1. Explicit tags or direct fields
        if preset_data.get("format_preset") and preset_data["format_preset"] in FORMAT_PRESETS:
            return preset_data["format_preset"]

        ff_match = preset_data.get("3_form_factor_matching", {})
        if isinstance(ff_match, dict) and ff_match.get("matched_archetype"):
            arch = ff_match["matched_archetype"]
            mapping = {
                "classic": "classic_shorts",
                "gunlimbo": "gunlimbo_hook",
                "ssul": "ssul_board",
                "instagram": "one_take_batch"
            }
            if arch in mapping:
                return mapping[arch]
            if arch in FORMAT_PRESETS:
                return arch

        if preset_data.get("matched_archetype"):
            arch = preset_data["matched_archetype"]
            mapping = {
                "classic": "classic_shorts",
                "gunlimbo": "gunlimbo_hook",
                "ssul": "ssul_board",
                "instagram": "one_take_batch"
            }
            if arch in mapping:
                return mapping[arch]
            if arch in FORMAT_PRESETS:
                return arch

        # 2. Structural & Typographical Signatures
        name = str(preset_data.get("name") or preset_data.get("blueprint_name") or "").lower()
        vg = preset_data.get("visual_geometry", {})
        audio_dsp = preset_data.get("audio_dsp", {})
        pacing = preset_data.get("editing_pacing", {})

        # A. Song Karaoke: 3-track lyrics, vinyl turntable, or visualizer
        if "lyrics" in preset_data or preset_data.get("visualTheme") in ["vinyl", "visualizer", "jacket"]:
            return "song_karaoke"

        # B. Ranking: countdown items, rank keys, blackout transitions
        if "items" in preset_data and any("rank" in it for it in preset_data.get("items", [])):
            return "ranking_countdown"
        if "transitionBlackoutMs" in preset_data or "rankingTopic" in preset_data:
            return "ranking_countdown"

        # C. Meokguri: ASMR gain boost, eating show, zoom pop beats
        if "gainBoostDb" in preset_data or "zoomPopIntensity" in preset_data or "eating" in name or "먹방" in name or "먹구리" in name:
            return "meokguri"

        # D. Stock Motion: speed lines, sketch frames, comic filter
        if "sketchFrames" in preset_data or "enableSpeedlines" in preset_data or "stock_motion" in name or "스톡모션" in name:
            return "stock_motion"

        # E. Ssul Board: comment cards, accumulated subtitles, community header
        if vg.get("interactive_layer", {}).get("type") == "comment_card" or "ssul" in name or "썰" in name or "게시판" in name:
            return "ssul_board"

        # F. Gunlimbo: extreme 0-second zoom (>=1.2x), punchy hook bands
        if float(pacing.get("opening_hook_zoom", 1.0)) >= 1.2 or "gunlimbo" in name or "군림보" in name:
            return "gunlimbo_hook"

        # G. Movie / Drama: cinematic letterbox, profiler voice, narrative drama
        if vg.get("container_type") == "letterbox_sandwich" and (vg.get("top_bar", {}).get("height_pct", 0) <= 12):
            return "movie_drama"
        if "movie" in name or "영화" in name or "드라마" in name or "drama" in name:
            return "movie_drama"

        # H. One-Take Batch: 2-line header, jab hook active, fast pace
        top_lines = vg.get("top_header_lines", [])
        if len(top_lines) >= 2 or vg.get("jab_hook", {}).get("enabled"):
            return "one_take_batch"

        return "classic_shorts"

    async def apply_analyzed_preset(
        self,
        project_id: str,
        preset_data: Dict[str, Any],
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Dynamically applies an analyzed preset (from reference video analysis or Channel DNA).
        1. Auto-detects the matching archetype (form factor) from structural signatures.
        2. Transpiles fine-grained blueprint geometry, DSP, pacing, and typography into Storyboard EDL.
        3. Re-renders the MP4 video with full format fidelity in seconds.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        detected_archetype = self.detect_preset_archetype(preset_data)
        logger.info(
            f"🧬 [Director] Analyzed preset auto-detected as '{detected_archetype}' "
            f"for project '{project_id}'"
        )

        # 1. Base archetype fallback defaults
        base_preset = FORMAT_PRESETS.get(detected_archetype, FORMAT_PRESETS["classic_shorts"])
        sb["voice"].update(base_preset["voice"])
        sb["style_preset"] = base_preset.get("style_preset", "shorts")
        sb["jabOverlay"].update(base_preset.get("jabOverlay", {}))
        sb["branding"].update(base_preset.get("branding", {}))
        sb["audio"].update(base_preset.get("audio", {}))
        sb["format_preset"] = detected_archetype

        # 2. Granular override from analyzed preset attributes
        vg = preset_data.get("visual_geometry", {})
        top_lines = vg.get("top_header_lines", [])
        if len(top_lines) > 0:
            if top_lines[0].get("text"):
                sb["branding"]["title_line1"] = top_lines[0]["text"]
            if len(top_lines) > 1 and top_lines[1].get("text"):
                sb["branding"]["title_line2"] = top_lines[1]["text"]

        sub_tape = vg.get("sub_tape_label", {})
        if sub_tape.get("text"):
            sb["branding"]["title_badge_text"] = sub_tape["text"]
            sb["jabOverlay"]["text"] = f"*{sub_tape['text']}*"

        jab_hook = vg.get("jab_hook", {})
        if jab_hook.get("tilt_deg") is not None:
            sb["jabOverlay"]["tiltDeg"] = jab_hook["tilt_deg"]
        if jab_hook.get("color"):
            sb["jabOverlay"]["color"] = jab_hook["color"]

        bot_src = vg.get("bottom_source", {})
        if bot_src.get("text"):
            sb["branding"]["bottom_credit_text"] = bot_src["text"]
            sb["branding"]["has_bottom_credit"] = True

        # Audio DSP overrides
        audio_dsp = preset_data.get("audio_dsp", {})
        wpm = audio_dsp.get("wpm")
        if wpm and isinstance(wpm, (int, float)) and wpm > 0:
            # WPM 350 is normal 1.0x, 410 is 1.17x
            sb["voice"]["speed_ratio"] = round(max(0.85, min(1.35, wpm / 350.0)), 2)

        bgm_db = audio_dsp.get("bgm_volume_db")
        if bgm_db and isinstance(bgm_db, (int, float)):
            # convert dB to linear approx (e.g. -22dB -> ~0.22)
            sb["audio"]["bgm_volume"] = round(max(0.08, min(0.45, 10 ** (bgm_db / 20.0) * 2.5)), 2)

        if "vocal_ducking" in audio_dsp:
            sb["audio"]["enable_ducking"] = bool(audio_dsp["vocal_ducking"])

        # Pacing overrides
        pacing = preset_data.get("editing_pacing", {})
        hook_zoom = pacing.get("opening_hook_zoom")
        if hook_zoom and hook_zoom >= 1.2:
            sb["style_preset"] = "gunlimbo"

        sb["analyzed_preset_source"] = {
            "name": preset_data.get("name") or preset_data.get("blueprint_name"),
            "detected_archetype": detected_archetype,
            "applied_at": datetime.now().isoformat()
        }

        self.save_storyboard(project_id, sb)

        render_res = {}
        if auto_re_render:
            render_res = await self.render_project(project_id, force_voice=True, force_audio_mix=True)

        return {
            "success": True,
            "project_id": project_id,
            "detected_archetype": detected_archetype,
            "storyboard": sb,
            "render_result": render_res
        }

    async def ripple_delete_scene(
        self,
        project_id: str,
        scene_index: int,
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Magnetic Main Track Ripple Delete (간격 닫고 삭제):
        Deletes scene at scene_index and shifts all subsequent scenes backward
        to close the timeline gap with zero dead air.
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        scenes = sb.get("scenes", [])
        if scene_index < 0 or scene_index >= len(scenes):
            return {"success": False, "error": f"Invalid scene_index {scene_index} (total {len(scenes)})"}

        deleted = scenes.pop(scene_index)
        del_dur = deleted.get("endMs", 0) - deleted.get("startMs", 0)

        # Ripple shift remaining subsequent scenes
        for sc in scenes[scene_index:]:
            sc["startMs"] = max(0, sc.get("startMs", 0) - del_dur)
            sc["endMs"] = max(0, sc.get("endMs", 0) - del_dur)

        sb["scenes"] = scenes
        self.save_storyboard(project_id, sb)

        logger.info(
            f"✂️ [Director] Ripple deleted scene {scene_index} for '{project_id}'. "
            f"Gap of {del_dur}ms closed across {len(scenes)} remaining scenes."
        )

        render_res = {}
        if auto_re_render:
            render_res = await self.render_project(project_id, force_voice=False, force_audio_mix=False)

        return {
            "success": True,
            "project_id": project_id,
            "deleted_scene": deleted,
            "remaining_scenes": len(scenes),
            "render_result": render_res
        }

    def plan_cutdown(
        self,
        subtitles: List[Dict[str, Any]],
        target_duration_sec: float = 55.0,
        style: str = "hook"
    ) -> Dict[str, Any]:
        """
        Smart Cutdown Planner (from Pixeling i1 / cutdown/plan):
        Snaps start and end boundaries precisely to sentence start/end timestamps
        to ensure speech is never abruptly chopped mid-syllable.
        """
        if not subtitles:
            return {"success": False, "error": "No subtitles provided"}

        sorted_subs = sorted(subtitles, key=lambda s: s.get("startMs", 0))
        target_dur_ms = int(target_duration_sec * 1000)

        # Pixeling alignment: start from index 0 or highest keyword density
        start_idx = 0
        if style == "middle-impact" and len(sorted_subs) > 3:
            start_idx = len(sorted_subs) // 3

        selected_subs = []
        start_time_ms = sorted_subs[start_idx].get("startMs", 0)
        end_time_ms = start_time_ms

        for sub in sorted_subs[start_idx:]:
            if (sub.get("endMs", 0) - start_time_ms) <= target_dur_ms:
                selected_subs.append(sub)
                end_time_ms = sub.get("endMs", 0)
            else:
                break

        if not selected_subs and sorted_subs:
            selected_subs = [sorted_subs[0]]
            end_time_ms = sorted_subs[0].get("endMs", 0)

        # Normalize relative timestamps for the cutdown
        relative_subs = []
        for s in selected_subs:
            relative_subs.append({
                "text": s.get("text", ""),
                "startMs": s.get("startMs", 0) - start_time_ms,
                "endMs": s.get("endMs", 0) - start_time_ms
            })

        duration_ms = end_time_ms - start_time_ms
        return {
            "success": True,
            "style": style,
            "sourceStartMs": start_time_ms,
            "sourceEndMs": end_time_ms,
            "durationMs": duration_ms,
            "durationSec": round(duration_ms / 1000.0, 2),
            "cutdown_subtitles": relative_subs,
            "alignmentReasons": [
                "자막 경계에 맞춰 시작점을 보정",
                "선택한 길이 제한에 맞춰 종료점을 보정",
                "문장 중간 절단 방지 무결성 확보"
            ]
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 🌐 Zero-Download Stream Slicing & Direct Project Ingestion
    # ─────────────────────────────────────────────────────────────────────────

    async def slice_stream_video(
        self,
        source_url: str,
        start_seconds: float,
        duration_seconds: float,
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Zero-Download Stream Slicing:
        Directly extracts a high-resolution clip (30-60s) from YouTube, TikTok, Douyin
        without downloading gigabytes of full media using yt-dlp remote probe and FFmpeg fast-seek.
        """
        return await zero_download_slicer.slice_stream(
            source_url=source_url,
            start_seconds=start_seconds,
            duration_seconds=duration_seconds,
            output_filename=output_filename
        )

    async def create_project_from_url_slice(
        self,
        project_id: str,
        source_url: str,
        start_seconds: float,
        duration_seconds: float,
        script: Optional[str] = None,
        title: Optional[str] = None,
        format_preset: str = "classic_shorts",
        auto_render: bool = True
    ) -> Dict[str, Any]:
        """
        End-to-End One-Click Pipeline:
        1. Slices remote stream on-the-fly without full download.
        2. Ingests the sliced clip as Scene 1 in a new sovereign storyboard.
        3. Applies format preset (voice, geometry, branding, audio).
        4. Synthesizes voice via Gemini 3.8 Flash TTS.
        5. Renders sovereign Remotion video in seconds.
        """
        logger.info(f"🌐 [Director] Creating project from stream slice: {source_url} ({start_seconds}s~+{duration_seconds}s)...")
        slice_res = await self.slice_stream_video(
            source_url=source_url,
            start_seconds=start_seconds,
            duration_seconds=duration_seconds
        )
        if not slice_res.get("success"):
            return slice_res

        clip_path = slice_res.get("filepath")
        video_title = title or slice_res.get("title") or "바이럴 하이라이트 영상"
        video_script = script or f"지금 보시는 장면은 가장 화제가 된 핵심 순간입니다. {video_title}의 놀라운 반전을 지금 확인해보세요!"

        # Ingest Scene 1
        scene_1 = {
            "id": "s1",
            "type": "video",
            "src": clip_path,
            "startMs": 0,
            "endMs": int(duration_seconds * 1000),
            "zoomDirection": "in"
        }

        # Create Storyboard
        self.create_storyboard(
            project_id=project_id,
            title=video_title,
            script=video_script,
            scenes=[scene_1]
        )

        # Apply Preset
        await self.apply_format_preset(
            project_id=project_id,
            preset_name=format_preset,
            auto_re_render=False
        )

        render_res = {}
        if auto_render:
            render_res = await self.render_project(project_id, force_voice=True, force_audio_mix=True)

        return {
            "success": True,
            "project_id": project_id,
            "sliced_clip": slice_res,
            "title": video_title,
            "format_preset": format_preset,
            "render_result": render_res
        }

    # ─────────────────────────────────────────────────────────────────────────
    # 🎨 Direct Gemini & Free AI Scene Image Generation
    # ─────────────────────────────────────────────────────────────────────────

    async def generate_ai_scene_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        style_preset: str = "cinematic_photorealism",
        project_id: Optional[str] = None,
        scene_index: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generates photorealistic AI image via Google Gemini 3.1 Flash Image (Nano Banana Pro)
        with 10-account Google Pool or Free FLUX.1 fallback.
        Optionally binds it directly to a project's scene.
        """
        logger.info(f"🎨 [Director] Generating AI scene image: '{prompt[:60]}...'")
        img_res = direct_gemini_image_generator.generate_image(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            style_preset=style_preset
        )
        if not img_res.get("success"):
            # Try free fallback
            img_res = direct_gemini_image_generator.generate_free_fallback_image(
                prompt=prompt,
                aspect_ratio=aspect_ratio
            )

        if not img_res.get("success"):
            return img_res

        # If project_id and scene_index provided, bind image to scene
        if project_id and scene_index is not None:
            sb = self.load_storyboard(project_id)
            if sb:
                scenes = sb.get("scenes", [])
                if 0 <= scene_index < len(scenes):
                    scenes[scene_index]["src"] = img_res["image_path"]
                    scenes[scene_index]["type"] = "image"
                    scenes[scene_index]["prompt"] = prompt
                    sb["scenes"] = scenes
                    self.save_storyboard(project_id, sb)
                    img_res["bound_to_project"] = project_id
                    img_res["bound_to_scene_index"] = scene_index

        return img_res

    # ─────────────────────────────────────────────────────────────────────────
    # 🎛️ Intelligent Sound Design (36-SFX Matrix & Dynamic BGM Placement)
    # ─────────────────────────────────────────────────────────────────────────

    async def auto_sound_design(
        self,
        project_id: str,
        auto_re_render: bool = True
    ) -> Dict[str, Any]:
        """
        Intelligently maps SFX and BGM to the video timeline:
        - Detects hook intro and binds impact sound (e.g. vine_boom)
        - Detects jabOverlay popup and binds whoosh / lightbulb sound
        - Automatically picks BGM from 03_Assets/bgm/preview_cache based on format_preset/mood
        """
        sb = self.load_storyboard(project_id)
        if not sb:
            return {"success": False, "error": f"Project '{project_id}' not found"}

        preview_dir = self.export_dir.parent / "03_Assets" / "bgm" / "preview_cache"
        audio_cfg = sb.get("audio", {})
        format_p = sb.get("format_preset") or sb.get("style_preset", "shorts")

        # 1. BGM selection if missing
        if not audio_cfg.get("bgm_path") or not os.path.exists(audio_cfg["bgm_path"]):
            bgm_map = {
                "meokguri": "upbeat_preview.wav",
                "gunlimbo_hook": "upbeat_preview.wav",
                "one_take_batch": "upbeat_preview.wav",
                "movie_drama": "suspense_preview.wav",
                "ssul_board": "meme_preview.wav",
                "song_karaoke": "piano_preview.wav",
                "classic_shorts": "lofi_preview.wav"
            }
            cand = preview_dir / bgm_map.get(format_p, "upbeat_preview.wav")
            if cand.exists():
                audio_cfg["bgm_path"] = str(cand)

        # 2. SFX detection based on jabOverlay text and 36 SFX matrix
        sfx_tracks = []
        jab = sb.get("jabOverlay", {})
        jab_text = jab.get("text", "")
        sfx_service = SFXLibraryService.get_instance()
        matched_sfx = sfx_service.auto_match_sfx_for_text(jab_text, placement_type="jab_popup")

        # Map to physical asset in preview_cache
        vine_boom = preview_dir / "sfx_vine_boom.wav"
        whoosh = preview_dir / "sfx_fast_whoosh.wav"

        # Hook intro SFX at startMs=0
        if vine_boom.exists():
            sfx_tracks.append({
                "name": "Intro Hook Boom",
                "path": str(vine_boom),
                "startMs": 0,
                "volume": 0.8
            })

        # Jab popup SFX
        if whoosh.exists() and jab.get("startMs"):
            sfx_tracks.append({
                "name": matched_sfx["name"] if matched_sfx else "Jab Popup Whoosh",
                "path": str(whoosh),
                "startMs": jab.get("startMs", 2000),
                "volume": 0.75
            })

        audio_cfg["sfx_tracks"] = sfx_tracks
        # Extract sfx file paths for ffmpeg mixer
        audio_cfg["sfx_paths"] = [t["path"] for t in sfx_tracks if os.path.exists(t["path"])]
        sb["audio"] = audio_cfg
        self.save_storyboard(project_id, sb)

        render_res = {}
        if auto_re_render:
            render_res = await self.render_project(project_id, force_voice=False, force_audio_mix=True)

        return {
            "success": True,
            "project_id": project_id,
            "selected_bgm": audio_cfg.get("bgm_path"),
            "sfx_tracks": sfx_tracks,
            "render_result": render_res
        }

    async def start_custom_preset_dialogue(
        self,
        reference_url: str,
        preset_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        [Stage 1 & 2] 대화형 커스텀 프리셋 진화 시작
        1. 채널/영상 1:1 심층 분석 후 100% 정밀 복제 프리셋(Base Clone) 저장 (기준점 확보)
        2. 원본 하드웨어/소프트웨어 특징 요약 브리핑
        3. 채널 헌법 v32.0 기반 3대 핵심 전략 질문(Strategic Elicitation) 생성 및 반환
        """
        from app.services.channel_dna_service import ChannelDNAService

        # 1. 100% 정밀 복제 분석 수행
        analysis_res = ChannelDNAService.analyze_channel(channel_url=reference_url, sample_count=12)
        benchmark_id = analysis_res.get("id")

        # 2. 복제 프리셋(Base Clone) 저장
        clean_handle = reference_url.split("@")[-1].split("/")[0] if "@" in reference_url else "channel"
        base_preset_name = preset_name or f"복제_{analysis_res.get('channel_title', clean_handle)}"
        export_res = ChannelDNAService.export_benchmark_to_sovereign_preset(
            benchmark_id=benchmark_id,
            preset_name=base_preset_name
        )
        base_preset_id = export_res.get("preset_id")

        # 3. 브리핑 데이터 구성
        bp = export_res.get("blueprint", {})
        vis = bp.get("visual_geometry", {})
        aud = bp.get("audio_dsp", {})
        narr = bp.get("narrative_dna", {})

        briefing = {
            "channel_title": analysis_res.get("channel_title"),
            "base_preset_id": base_preset_id,
            "measured_wpm": aud.get("wpm", 410),
            "avg_cut_sec": bp.get("editing_pacing", {}).get("avg_cut_sec", 1.85),
            "canvas_type": vis.get("canvas_type", "sandwich_1_1"),
            "top_bar_height_pct": vis.get("top_bar", {}).get("height_pct", 18.0),
            "opening_hook_type": narr.get("opening_hook_type", "직타 훅"),
            "dominant_endings": narr.get("dominant_endings", ["~입니다", "~하는데요", "~라고 하네요!"])
        }

        # 4. 채널 헌법 v32.0 및 3대 전략 질문(Strategic Elicitation) 도출
        questions = [
            {
                "id": "q1_narrative_intent",
                "question": "이 채널을 통해 시청자에게 어떤 감정과 카타르시스를 전달하고 싶으신가요?",
                "options": [
                    {"value": "catharsis_justice", "label": "⚡ 사이다 참교육: 빌런의 부당함을 고발하고 통쾌한 인과응보를 선사하는 정의 구현형"},
                    {"value": "shock_secret", "label": "🕵️ 충격/비밀 폭로: 겉보기와 완전히 다른 소름 돋는 진실을 파헤치는 탐사보도형"},
                    {"value": "fact_reversal", "label": "💡 상식 파괴/팩트 해설: 일반인의 잘못된 상식을 뒤집고 법률·의학적 팩트를 짚어주는 정보형"},
                    {"value": "comic_satire", "label": "🎭 황당 반전/유쾌 사이다: 일상 속 어이없는 사건을 위트 있게 비꼬는 코믹 풍자형"},
                    {"value": "human_touch", "label": "🥺 감동/인간미 실화: 위기 속에서 빛난 따뜻한 인간미와 헌신을 조명하는 감동 서사형"}
                ]
            },
            {
                "id": "q2_context_hook",
                "question": "알고리즘의 1만 조회수 벽을 깨기 위해 영상 첫 3초를 어떤 충격으로 열어볼까요?",
                "options": [
                    {"value": "provocative_question", "label": "❓ 도발적 질문형 ('당신이 이 차 운전자라면 과실 0%라고 생각하시나요?')"},
                    {"value": "ending_reversal", "label": "🔄 결말 역전형 ('모두가 피해자를 위로했지만 3분 뒤 체포된 건 피해자였습니다')"},
                    {"value": "hidden_truth", "label": "🔍 비하인드 고발형 ('평범한 식당 같지만 지하실에서는 매일 밤 믿기 힘든 일이 벌어집니다')"},
                    {"value": "legal_impact", "label": "⚖️ 법률 조항 직타형 ('합법이라고 착각하는 이 행동, 사실 징역 3년형에 처해집니다')"}
                ]
            },
            {
                "id": "q3_sensory_branding",
                "question": "시청자가 '아, 이 채널 영상이다!'라고 즉각 알아챌 수 있는 나만의 시그니처 연출은 무엇인가요?",
                "options": [
                    {"value": "neon_yellow_bold", "label": "🟨 사이다 옐로우 네온 자막 + 빠른 템포 (WPM 420+)"},
                    {"value": "warning_red_outline", "label": "🟥 경고 레드 볼드 자막 + 중후한 프로파일러 보이스"},
                    {"value": "minimal_white_ducking", "label": "⬜ 미니멀 화이트 박스 자막 + 현장음 -18dB 은은한 앰비언스 유지"}
                ]
            }
        ]

        return {
            "success": True,
            "stage": "elicitation",
            "message": f"'{briefing['channel_title']}'의 100% 복제 프리셋({base_preset_id})을 안전하게 보존했습니다. 나만의 커스텀 프리셋으로 진화시키기 위한 3대 전략 질문에 응답해 주세요.",
            "briefing": briefing,
            "base_preset_id": base_preset_id,
            "questions": questions
        }

    async def refine_custom_preset(
        self,
        base_preset_id: str,
        narrative_intent: str,
        context_hook_strategy: str,
        sensory_custom: Optional[Dict[str, Any]] = None,
        custom_name: Optional[str] = None,
        additional_feedback: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        [Stage 2 확정] 사용자 피드백을 반영하여 [커스텀 프리셋 (Custom Preset)] 생성 및 저장
        """
        import time
        from app.database import SessionLocal
        from app.models import ShortsTemplate

        sensory = sensory_custom or {}
        db = SessionLocal()
        try:
            base_tmpl = db.query(ShortsTemplate).filter(ShortsTemplate.id == base_preset_id).first()
            if not base_tmpl:
                raise ValueError(f"Base preset not found: {base_preset_id}")

            base_layout = json.loads(json.dumps(base_tmpl.layout or {}))
            base_manifest = json.loads(json.dumps(base_tmpl.manifest or {}))

            # 1. 서사 및 기획 차별화 주입 (Evolution)
            custom_narrative_dna = base_layout.get("narrative_dna", {})
            custom_narrative_dna["preset_type"] = "custom"
            custom_narrative_dna["parent_base_preset_id"] = base_preset_id
            custom_narrative_dna["chosen_narrative_intent"] = narrative_intent
            custom_narrative_dna["chosen_context_hook"] = context_hook_strategy
            custom_narrative_dna["additional_feedback"] = additional_feedback or ""

            # 의도에 따른 훅 및 톤앤매너 재정의
            intent_map = {
                "catharsis_justice": "사이다 참교육 및 인과응보 정의구현체",
                "shock_secret": "소름 돋는 진실 추적 탐사보도체",
                "fact_reversal": "상식 파괴 팩트 교정 해설체",
                "comic_satire": "위트 넘치는 풍자 유머체",
                "human_touch": "따뜻하고 뭉클한 감동 실화체"
            }
            custom_narrative_dna["tone_manner"] = intent_map.get(narrative_intent, "몰입감 높은 맞춤형 해설체")

            # 2. 시각/청각 감각 브랜딩 반영
            if sensory.get("subtitle_color"):
                base_layout.setdefault("visual_geometry", {}).setdefault("caption", {})["color"] = sensory["subtitle_color"]
            if sensory.get("voice_role"):
                base_layout.setdefault("audio_dsp", {})["voice_profile"] = sensory["voice_role"]
            if sensory.get("bgm_volume_db"):
                base_layout.setdefault("audio_dsp", {})["bgm_volume_db"] = sensory["bgm_volume_db"]

            base_layout["narrative_dna"] = custom_narrative_dna

            # 3. 신규 커스텀 프리셋 저장
            custom_id = f"custom_{int(time.time())}_{uuid.uuid4().hex[:6]}"
            clean_custom_name = custom_name or f"커스텀_{base_tmpl.name}"

            custom_tmpl = ShortsTemplate(
                id=custom_id,
                name=clean_custom_name,
                description=f"[{clean_custom_name}] 복제 프리셋({base_preset_id}) 기반 대화형 진화 커스텀 프리셋 (의도: {custom_narrative_dna['tone_manner']})",
                archetype=base_tmpl.archetype or "classic",
                aspect_ratio=base_tmpl.aspect_ratio or "9:16",
                is_system=False,
                layout=base_layout,
                manifest=base_manifest
            )
            db.add(custom_tmpl)
            db.commit()

            # 4. 파일 영구 저장
            local_appdata = Path(os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local")))
            preset_file = local_appdata / "ViraLoop Studio" / "media" / "03_Assets" / "presets" / f"{custom_id}.json"
            preset_file.parent.mkdir(parents=True, exist_ok=True)
            with open(preset_file, "w", encoding="utf-8") as f:
                json.dump({
                    "id": custom_id,
                    "name": clean_custom_name,
                    "preset_type": "custom",
                    "parent_base_preset_id": base_preset_id,
                    "layout": base_layout,
                    "manifest": base_manifest
                }, f, ensure_ascii=False, indent=2)

            logger.info(f"🏆 [SovereignVideoDirector] Custom preset successfully evolved & saved: {custom_id} ({clean_custom_name})")

            # 5. 첫 3초 샘플 훅 대본 즉시 생성 프리뷰
            sample_hook_text = f"이 사건, 단순한 줄 알았지만 {custom_narrative_dna['tone_manner']}로 파헤치자 충격적인 반전이 드러났습니다!"

            return {
                "success": True,
                "custom_preset_id": custom_id,
                "custom_name": clean_custom_name,
                "parent_base_preset_id": base_preset_id,
                "narrative_dna": custom_narrative_dna,
                "sample_preview_hook": sample_hook_text,
                "message": f"🏆 나만의 고유 커스텀 프리셋 '{clean_custom_name}'이 확정 저장되었습니다! 이제 노-프롬프트(No-Prompt) 완전 자율 쇼츠 대량 양산에 투입할 수 있습니다."
            }

        except Exception as e:
            db.rollback()
            logger.error(f"[SovereignVideoDirector] Failed to refine custom preset: {e}")
            raise
        finally:
            db.close()

    def segment_narration_fps_free(
        self,
        script_text: str,
        total_duration_sec: float = 30.0
    ) -> List[Dict[str, Any]]:
        """
        [지침서 V6.0: FPS-Free 다이내믹 멀티-컷 편집 프로토콜]
        - 1문장 2컷 의무화 (2.5초 초과 문장을 a, b 파트로 나노 분절)
        - 소스 번호 [S-01] 및 절대 타임코드(MM:SS.ms) 삼위일체 바인딩
        - 샷 순수성 보장 (±0.1초 안전 마진)
        """
        lines = [l.strip() for l in script_text.splitlines() if l.strip()]
        if not lines:
            return []

        avg_line_dur = total_duration_sec / max(len(lines), 1)
        multi_cut_table = []
        current_time_ms = 100  # 100ms safe in-point

        source_idx = 1
        for line_idx, line in enumerate(lines):
            # 문장이 15자 이상이거나 예상 시간 2.5초 초과 시 (a), (b)로 나노 분절
            if len(line) >= 14 and (" " in line):
                words = line.split(" ")
                mid = len(words) // 2
                part_a = " ".join(words[:mid])
                part_b = " ".join(words[mid:])
                sub_parts = [(part_a, avg_line_dur * 0.48), (part_b, avg_line_dur * 0.52)]
            else:
                sub_parts = [(line, avg_line_dur)]

            for sub_idx, (text_part, dur_sec) in enumerate(sub_parts):
                dur_ms = int(dur_sec * 1000)
                end_time_ms = current_time_ms + dur_ms

                # MM:SS.ms 형식 포맷팅
                start_m, start_s = divmod(current_time_ms // 1000, 60)
                start_ms_rem = current_time_ms % 1000
                end_m, end_s = divmod(end_time_ms // 1000, 60)
                end_ms_rem = end_time_ms % 1000

                time_str = f"{start_m:02d}:{start_s:02d}.{start_ms_rem:03d} ~ {end_m:02d}:{end_s:02d}.{end_ms_rem:03d}"
                s_id = f"S-{source_idx:02d}"
                speed_strategy = "[정배속]" if (source_idx % 2 == 1) else "[1.15배속 패스트컷]"

                multi_cut_table.append({
                    "step": f"{line_idx+1}-{chr(97+sub_idx)}",
                    "narration_nano": text_part,
                    "source_id": s_id,
                    "camera_angle": "전체 샷" if (sub_idx == 0) else "클로즈업 디테일 컷",
                    "speed_strategy": speed_strategy,
                    "absolute_timecode": time_str,
                    "start_ms": current_time_ms,
                    "end_ms": end_time_ms
                })

                source_idx += 1
                current_time_ms = end_time_ms

        return multi_cut_table



# Pixeling 12-Format Sovereign Directing Presets Definition
FORMAT_PRESETS = {
    "one_take_batch": {
        "name": "원테이크 훅 쇼츠 (One-Take Batch)",
        "description": "상단 강렬한 쨉쨉이 훅과 고속 스피치의 원테이크 바이럴 포맷",
        "voice": {"role": "viral_creator", "mood": "excited", "speed_ratio": 1.18, "pitch_shift_semitones": 0.5},
        "style_preset": "shorts",
        "jabOverlay": {"placement": "top-third", "tiltDeg": -3, "text": "*상상도 못한 반전 직전*"},
        "branding": {"has_top_header": True, "title_badge_text": "속보", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.22, "enable_ducking": True, "enable_formant_carve": True}
    },
    "song_karaoke": {
        "name": "노래/가사 3트랙 싱크 (Song Karaoke)",
        "description": "원어 가사, 발음, 한국어 번역 3단 정렬 및 보컬 감성 포맷",
        "voice": {"role": "calm_narrator", "mood": "calm", "speed_ratio": 1.0, "pitch_shift_semitones": -0.5},
        "style_preset": "classic",
        "jabOverlay": {"placement": "bottom-third", "tiltDeg": 0, "text": "🎵 감성 가사 해석"},
        "branding": {"has_top_header": True, "title_badge_text": "뮤직", "has_bottom_credit": False},
        "audio": {"bgm_volume": 0.35, "enable_ducking": False, "enable_formant_carve": True}
    },
    "meokguri": {
        "name": "먹구리 먹방 줌팝 (Meokguri Eating Show)",
        "description": "오디오 피크 증폭, 1.25x 줌 팝 비트, 바삭한 효과음 리액션 포맷",
        "voice": {"role": "viral_creator", "mood": "excited", "speed_ratio": 1.15, "pitch_shift_semitones": 1.0},
        "style_preset": "gunlimbo",
        "jabOverlay": {"placement": "center", "tiltDeg": 2, "text": "🔥 침샘 폭발 주의!"},
        "branding": {"has_top_header": True, "title_badge_text": "먹방", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.18, "enable_ducking": True, "enable_formant_carve": True}
    },
    "ranking_countdown": {
        "name": "랭킹 카운트다운 (Ranking Countdown)",
        "description": "Top 5 순위 전환 효과음, 순위표 뱃지, 전환 블랙아웃 포맷",
        "voice": {"role": "news_anchor", "mood": "dramatic", "speed_ratio": 1.12, "pitch_shift_semitones": 0.0},
        "style_preset": "shorts",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "🏆 역대 TOP 5 랭킹"},
        "branding": {"has_top_header": True, "title_badge_text": "랭킹", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.25, "enable_ducking": True, "enable_formant_carve": True}
    },
    "movie_drama": {
        "name": "영화/드라마 명장면 (Movie Drama)",
        "description": "시네마틱 레터박스, 중후한 프로파일러 보이스, 정밀 컷다운 포맷",
        "voice": {"role": "crime_profiler", "mood": "dramatic", "speed_ratio": 1.05, "pitch_shift_semitones": -2.0},
        "style_preset": "classic",
        "jabOverlay": {"placement": "bottom-third", "tiltDeg": 0, "text": "🎬 소름 돋는 명장면"},
        "branding": {"has_top_header": False, "has_bottom_credit": True, "bottom_credit_text": "출처: 공식 예고편 및 방송분"},
        "audio": {"bgm_volume": 0.20, "enable_ducking": True, "enable_formant_carve": True}
    },
    "text_creative": {
        "name": "텍스트 창작 캐릭터극 (Text Creative)",
        "description": "인물별 대사 분할과 역할 맞춤 보이스, 씬별 앵커 유지 포맷",
        "voice": {"role": "entertainment", "mood": "happy", "speed_ratio": 1.10, "pitch_shift_semitones": 0.5},
        "style_preset": "ssul",
        "jabOverlay": {"placement": "top-third", "tiltDeg": -2, "text": "💬 충격 실화 사연"},
        "branding": {"has_top_header": True, "title_badge_text": "사연", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.20, "enable_ducking": True, "enable_formant_carve": True}
    },
    "stock_motion": {
        "name": "스톡 모션 폰트팝 (Stock Motion)",
        "description": "고대비 키네틱 타이포그래피와 모션 캔버스 숏폼 포맷",
        "voice": {"role": "documentary", "mood": "mysterious", "speed_ratio": 1.12, "pitch_shift_semitones": -0.5},
        "style_preset": "shorts",
        "jabOverlay": {"placement": "center", "tiltDeg": 0, "text": "⚡ 10초 만에 이해하기"},
        "branding": {"has_top_header": True, "title_badge_text": "상식", "has_bottom_credit": False},
        "audio": {"bgm_volume": 0.24, "enable_ducking": True, "enable_formant_carve": True}
    },
    "gunlimbo_hook": {
        "name": "군림보 0초 줌인 훅 (Gunlimbo Hook)",
        "description": "첫 0초 강력 줌인, 상하단 훅 밴드, 즉각 시선 강탈 포맷",
        "voice": {"role": "viral_creator", "mood": "excited", "speed_ratio": 1.20, "pitch_shift_semitones": 1.0},
        "style_preset": "gunlimbo",
        "jabOverlay": {"placement": "top-third", "tiltDeg": -4, "text": "🚨 지금 난리난 이유"},
        "branding": {"has_top_header": True, "title_badge_text": "이슈", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.26, "enable_ducking": True, "enable_formant_carve": True}
    },
    "ssul_board": {
        "name": "커뮤니티 썰형 릴레이 (Ssul Board)",
        "description": "헤더바, 작성자 메타데이터, 자막 순차 누적 썰방 포맷",
        "voice": {"role": "viral_creator", "mood": "neutral", "speed_ratio": 1.15, "pitch_shift_semitones": 0.0},
        "style_preset": "ssul",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "📌 레전드 썰 모음"},
        "branding": {"has_top_header": True, "title_badge_text": "인기글", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.18, "enable_ducking": True, "enable_formant_carve": True}
    },
    "classic_shorts": {
        "name": "클래식 숏폼 (Classic Shorts)",
        "description": "중앙 직관형 자막과 표준 리듬감의 기본 숏폼 포맷",
        "voice": {"role": "news_anchor", "mood": "neutral", "speed_ratio": 1.10, "pitch_shift_semitones": 0.0},
        "style_preset": "classic",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "💡 오늘의 핵심 요약"},
        "branding": {"has_top_header": True, "title_badge_text": "하이라이트", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.22, "enable_ducking": True, "enable_formant_carve": True}
    },
    "classic": {
        "name": "클래식 숏폼 (Classic Shorts)",
        "description": "중앙 직관형 자막과 표준 리듬감의 기본 숏폼 포맷",
        "voice": {"role": "news_anchor", "mood": "neutral", "speed_ratio": 1.10, "pitch_shift_semitones": 0.0},
        "style_preset": "classic",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "💡 오늘의 핵심 요약"},
        "branding": {"has_top_header": True, "title_badge_text": "하이라이트", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.22, "enable_ducking": True, "enable_formant_carve": True}
    },
    "insta_feed": {
        "name": "인스타 릴스 피드형 (Instagram Reels)",
        "description": "프로필 핸들바, 베댓 상단 고정, 트렌디 비트 포맷",
        "voice": {"role": "viral_creator", "mood": "excited", "speed_ratio": 1.15, "pitch_shift_semitones": 0.5},
        "style_preset": "insta",
        "jabOverlay": {"placement": "top-third", "tiltDeg": -2, "text": "🔥 요즘 난리난 릴스"},
        "branding": {"has_top_header": True, "title_badge_text": "인스타", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.25, "enable_ducking": True, "enable_formant_carve": True}
    },
    "ranking_listicle": {
        "name": "랭킹 리스티클 (Ranking Listicle)",
        "description": "순위 전환 효과음과 항목별 상세 카운트다운",
        "voice": {"role": "news_anchor", "mood": "dramatic", "speed_ratio": 1.12, "pitch_shift_semitones": 0.0},
        "style_preset": "shorts",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "🏆 역대 TOP 순위"},
        "branding": {"has_top_header": True, "title_badge_text": "랭킹", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.25, "enable_ducking": True, "enable_formant_carve": True}
    },
    "long_to_short": {
        "name": "롱투숏 핵심 추출 (Long-to-Short)",
        "description": "긴 원본에서 핵심 발언 구간만을 압축 스냅핑한 쇼츠",
        "voice": {"role": "documentary", "mood": "neutral", "speed_ratio": 1.08, "pitch_shift_semitones": 0.0},
        "style_preset": "classic",
        "jabOverlay": {"placement": "top-third", "tiltDeg": 0, "text": "⚡ 핵심 30초 요약"},
        "branding": {"has_top_header": True, "title_badge_text": "요약", "has_bottom_credit": True},
        "audio": {"bgm_volume": 0.20, "enable_ducking": True, "enable_formant_carve": True}
    }
}

# Global singleton
sovereign_video_director = SovereignVideoDirector()

