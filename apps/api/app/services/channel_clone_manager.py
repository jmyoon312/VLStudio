"""
Channel Virtual Clone Manager (6-Layer Ultra-Granular Preset Engine)
Single Source of Truth for Channel-Bound Autonomous Worker Clones.
"""
import os
import json
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class PersonaLayer(BaseModel):
    tone_style: str = "b_grade_meme"  # b_grade_meme | documentary | casual_talk | financial_fact
    speech_speed_wpm: int = 140
    forbidden_words: List[str] = Field(default_factory=lambda: ["비속어", "과격표현", "사기", "무조건"])
    clean_shield: bool = True  # 플랫폼 노란딱지 은유 순화 사전 자동 활성화
    required_ending_hook: str = "구독하고 매일 1개씩 떡상 노하우 챙겨가세요!"

class ScriptBranchLayer(BaseModel):
    mode: str = "video_present"  # video_present | script_present | keyword_only
    pacing_jab_interval_sec: float = 0.8
    climax_second: int = 42
    active_typography_mix: List[str] = Field(default_factory=lambda: [
        "HOOK_ANCHOR", "NARRATION", "PACING_JAB", "POV_REACTION", 
        "KINETIC_KEYWORD", "MULTI_DIALOGUE", "SFX_GRAPHIC", "FACT_BULLET"
    ])

class AudioLayer(BaseModel):
    engine: str = "ElevenLabs / Typecast / Supertonic"
    voice_id: str = "ko-KR-Standard-A"
    speed_rate: str = "+18%"
    pitch_adjust: str = "+4Hz"
    bgm_ducking_db: float = -18.5
    sfx_pack_name: str = "viral_tension_thud"

class VisualLayer(BaseModel):
    engine: str = "Google Flow AI v2.0"
    aspect_ratio: str = "9:16"
    lens_focal_length: str = "35mm_cinematic"
    lighting_style: str = "Dramatic Studio Lighting"
    seed_lock_enabled: bool = True
    reference_image_ids: List[str] = Field(default_factory=list)

class CapCutAssemblyLayer(BaseModel):
    font_family: str = "Sandoll NeoGothic Black"
    font_size: float = 18.5
    primary_color: str = "#FFFFFF"
    highlight_color: str = "#FFE500"
    bounce_animation: str = "POP_UP_SPRING_02"
    silence_cut_threshold_db: float = -35.0

class GatekeeperLayer(BaseModel):
    min_pass_score: float = 85.0
    channel_dna_strict_check: bool = True
    auto_retry_limit: int = 3

class ChannelClonePresetSchema(BaseModel):
    channel_id: int
    channel_name: str = "채널 1호기"
    version: str = "2.4.0"
    persona: PersonaLayer = Field(default_factory=PersonaLayer)
    script_branch: ScriptBranchLayer = Field(default_factory=ScriptBranchLayer)
    audio: AudioLayer = Field(default_factory=AudioLayer)
    visual: VisualLayer = Field(default_factory=VisualLayer)
    capcut: CapCutAssemblyLayer = Field(default_factory=CapCutAssemblyLayer)
    gatekeeper: GatekeeperLayer = Field(default_factory=GatekeeperLayer)

class ChannelCloneManager:
    def __init__(self):
        # Base storage path for channel clone presets
        self.base_dir = os.path.abspath(os.path.join(
            os.path.dirname(__file__), "..", "..", "..", "data", "studio_brain", "clones"
        ))
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_preset_path(self, channel_id: int) -> str:
        return os.path.join(self.base_dir, f"{channel_id}_preset.json")

    def get_default_preset(self, channel_id: int, channel_name: str = "") -> ChannelClonePresetSchema:
        name = channel_name or f"채널 {channel_id}호기"
        return ChannelClonePresetSchema(
            channel_id=channel_id,
            channel_name=name
        )

    def get_clone_preset(self, channel_id: int, channel_name: str = "") -> ChannelClonePresetSchema:
        preset_file = self._get_preset_path(channel_id)
        if os.path.exists(preset_file):
            try:
                with open(preset_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return ChannelClonePresetSchema(**data)
            except Exception as e:
                logger.warning(f"Error reading clone preset for channel {channel_id}: {e}. Returning default.")
        
        # If not exists, save and return default
        default_preset = self.get_default_preset(channel_id, channel_name)
        self.save_clone_preset(channel_id, default_preset)
        return default_preset

    def save_clone_preset(self, channel_id: int, preset: ChannelClonePresetSchema) -> bool:
        preset_file = self._get_preset_path(channel_id)
        try:
            with open(preset_file, "w", encoding="utf-8") as f:
                json.dump(preset.dict(), f, ensure_ascii=False, indent=2)
            logger.info(f"Successfully saved 6-Layer Clone Preset for channel {channel_id} at {preset_file}")
            return True
        except Exception as e:
            logger.error(f"Failed to save clone preset for channel {channel_id}: {e}")
            raise e

    def list_clone_presets(self) -> List[ChannelClonePresetSchema]:
        presets = []
        if not os.path.exists(self.base_dir):
            return presets
        for fname in os.listdir(self.base_dir):
            if fname.endswith("_preset.json"):
                try:
                    fpath = os.path.join(self.base_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        presets.append(ChannelClonePresetSchema(**data))
                except Exception as e:
                    logger.warning(f"Error reading preset file {fname}: {e}")
        return presets

channel_clone_manager = ChannelCloneManager()
