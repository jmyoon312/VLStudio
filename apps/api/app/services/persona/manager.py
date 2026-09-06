import logging
import json
import os
from sqlalchemy.orm import Session
from ... import models

logger = logging.getLogger(__name__)

class PersonaManager:
    """
    Manages identity presets for autonomous channels.
    Ensures consistent branding, voice, and visual style for each persona.
    v6.0: Loads from a centralized Persona Registry.
    """
    def __init__(self, db: Session):
        self.db = db
        # Adjusted path to find the sibling file in the same directory
        self.library_path = os.path.join(os.path.dirname(__file__), "persona_library.json")
        self._load_library()

    def _load_library(self):
        try:
            if os.path.exists(self.library_path):
                with open(self.library_path, "r", encoding="utf-8") as f:
                    self.library = json.load(f)
            else:
                # Fallback path check (sometimes it might be in current dir)
                logger.warning(f"[WARN] Persona library not found at {self.library_path}. Using empty fallback.")
                self.library = {"niches": []}
        except Exception as e:
            logger.error(f"[FAIL] Failed to load persona library: {e}")
            self.library = {"niches": []}

    def get_persona_config(self, channel_id: int) -> dict:
        """
        Retrieves the full production configuration for a specific channel persona.
        Integrates with Channel Virtual Clone 6-Layer Preset as Single Source of Truth.
        """
        from ..channel_clone_manager import channel_clone_manager
        channel = self.db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
        channel_title = channel.title if channel else f"채널 {channel_id}호기"
        
        # 1. First priority: 6-Layer Channel Clone Preset
        preset = channel_clone_manager.get_clone_preset(channel_id, channel_title)
        if preset:
            return {
                "channel_name": channel_title,
                "persona_name": f"{preset.persona.tone_style} Persona",
                "tone_of_voice": preset.persona.tone_style,
                "speech_speed_wpm": preset.persona.speech_speed_wpm,
                "forbidden_words": preset.persona.forbidden_words,
                "clean_shield": preset.persona.clean_shield,
                "tts_config": {
                    "engine": preset.audio.engine,
                    "voice_id": preset.audio.voice_id,
                    "rate": preset.audio.speed_rate,
                    "pitch": preset.audio.pitch_adjust,
                    "bgm_ducking_db": preset.audio.bgm_ducking_db
                },
                "visual_style": {
                    "engine": preset.visual.engine,
                    "template": "portrait_9_16",
                    "aspect_ratio": preset.visual.aspect_ratio,
                    "lighting_style": preset.visual.lighting_style,
                    "typography": preset.script_branch.active_typography_mix,
                    "pacing": "Fast" if preset.script_branch.pacing_jab_interval_sec < 1.0 else "Moderate"
                },
                "capcut_config": {
                    "font_family": preset.capcut.font_family,
                    "highlight_color": preset.capcut.highlight_color,
                    "bounce_animation": preset.capcut.bounce_animation
                },
                "stealth_required": True if (channel and (channel.warmup_stage or 0) < 30) else False,
                "trust_score": channel.trust_score if channel else 0,
                "autonomy_status": channel.autonomy_status if channel else "MANUAL"
            }

        # 2. Fallback heuristic matching
        target_niche = (channel_title or "").lower()
        matched_niche = None
        for niche in self.library.get("niches", []):
            if niche["id"] in target_niche or any(hook.lower() in target_niche for hook in niche.get("hooks", [])):
                matched_niche = niche
                break
        
        if not matched_niche:
            matched_niche = next((n for n in self.library.get("niches", []) if n["id"] == "senior_care"), None)

        if not matched_niche:
            return self._get_default_config()

        return {
            "channel_name": channel_title,
            "persona_name": matched_niche.get("display_name"),
            "tone_of_voice": matched_niche.get("vibe", "informative"),
            "tts_config": {
                "engine": "ElevenLabs / Typecast / Supertonic",
                "voice_id": "ko-KR-Standard-A",
                "rate": "+15%",
                "pitch": "+2Hz"
            },
            "visual_style": {
                "template": matched_niche.get("remotion_template", "blur_bg"),
                "typography": matched_niche.get("typography"),
                "pacing": matched_niche.get("pacing", "Moderate"),
                "motion_speed": 1.5 if matched_niche.get("pacing") == "Fast" else 1.2
            },
            "stealth_required": True if (channel and (channel.warmup_stage or 0) < 30) else False,
            "trust_score": channel.trust_score if channel else 0,
            "autonomy_status": channel.autonomy_status if channel else "MANUAL"
        }

    def _get_default_config(self):
        return {
            "tone_of_voice": "b_grade_meme",
            "tts_config": {"engine": "ElevenLabs / Typecast / Supertonic", "voice_id": "ko-KR-Standard-A"},
            "visual_style": {"template": "portrait_9_16"}
        }
