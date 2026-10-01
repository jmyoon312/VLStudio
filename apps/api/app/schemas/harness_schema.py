"""
[Harness v2 & Hermes Bot Mode] Standard Typed Data Schemas
Implements the structured data contracts between Director, Scout, Writer, Critic, and Cutter.
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class SubtitleCue(BaseModel):
    text: str
    style_override: str = Field("normal", description="normal | highlight_yellow | highlight_red | shaking")
    start_ms: int = 0
    end_ms: int = 0

class StoryboardScene(BaseModel):
    scene_id: int
    timestamp_start: float
    timestamp_end: float
    narration: str
    visual_prompt: str
    subtitle: SubtitleCue
    generated_assets: Dict[str, Optional[str]] = Field(default_factory=dict) # {"video_path": "...", "audio_path": "..."}
    cached_chunk_path: Optional[str] = None
    is_vault_reused: bool = False

class QCReport(BaseModel):
    is_passed: bool = False
    reason: str = ""
    scores: Dict[str, int] = Field(default_factory=lambda: {
        "audio_video_sync": 0,
        "subtitle_readability": 0,
        "pace_and_retention": 0
    })
    rollback_target_scene: Optional[int] = None
    checked_by: str = "Critic-85"

class ToneAndStyle(BaseModel):
    visual_theme: str = "시네마틱 실사 다큐"
    bgm_style: str = "긴장감 넘치는 앰비언트"
    speech_wpm: int = 185
    margin_v: int = 350
    primary_color: str = "&H00FFFFFF&"
    highlight_color: str = "&H0000FFFF&"

class Metadata(BaseModel):
    title: str
    description: Optional[str] = ""
    aspect_ratio: str = "9:16"
    target_duration_sec: int = 45
    applied_preset_id: Optional[str] = None
    preset_version: str = "1.0"
    tone_and_style: ToneAndStyle = Field(default_factory=ToneAndStyle)

class ShortsVideoHarnessSchema(BaseModel):
    project_id: str
    channel_id: Optional[int] = None
    metadata: Metadata
    storyboard: List[StoryboardScene]
    current_phase: str = "PLANNING"
    qc_report: Optional[QCReport] = None

class CreativeTake(BaseModel):
    take_id: str
    concept_title: str
    hook_narration: str
    core_punchline: str
    tempo_wpm: int
    simulated_retention_score: int
    self_critique: str
    storyboard_draft: Optional[List[Dict[str, Any]]] = None

class SelfPlayResult(BaseModel):
    topic: str
    takes: List[CreativeTake]
    winner_take_id: str
    elapsed_seconds: float
