"""
Zero-Latency NLE Structured Stream Bus.
========================================
Ported & adapted from Nous Research Hermes Agent v0.21.4:
- --format stream-json
- stream_delivery.py & chat_completion_stream_monitor.py

Provides real-time, microsecond-precision JSONL streaming directly to the NLE timeline:
1. 'nle_cue': Sentence-by-sentence subtitle cues with millisecond timecodes.
2. 'nle_media': Video cuts (LTX 2.5, Kling O3, Wan 2.1, 2.5D Parallax) as they generate.
3. 'nle_audio': Synthesized voice waveform packets mapped to tracks.
4. 'nle_timeline_ready': Complete, live-assembled NLE draft timeline.

Eliminates production wait latency (0-second wait feel) by incrementally
assembling clips on the user's NLE timeline in real-time.
"""

import json
import time
import logging
from typing import Dict, Any, Optional, AsyncGenerator

logger = logging.getLogger("nle_stream_bus")


class NLEStructuredStreamBus:
    """
    Structured JSONL Streaming Bus for NLE Timeline synchronization.
    """

    @staticmethod
    def format_event(event_type: str, payload: Dict[str, Any]) -> str:
        """Encodes event into standard Hermes stream-json SSE format."""
        packet = {
            "bus": "nle_stream_json",
            "event": event_type,
            "timestamp": time.time(),
            "data": payload
        }
        return f"data: {json.dumps(packet, ensure_ascii=False)}\n\n"

    @classmethod
    def emit_cue(
        cls,
        index: int,
        text: str,
        start_ms: int,
        duration_ms: int,
        cut_type: str = "micro_cut",
        zoom: float = 1.0,
        hook_band: Optional[str] = None
    ) -> str:
        """Emits an incremental subtitle/shot cue to the NLE timeline."""
        return cls.format_event("nle_cue", {
            "index": index,
            "text": text,
            "start_ms": start_ms,
            "duration_ms": duration_ms,
            "end_ms": start_ms + duration_ms,
            "cut_type": cut_type,
            "zoom": zoom,
            "hook_band": hook_band
        })

    @classmethod
    def emit_media(
        cls,
        cue_index: int,
        media_type: str,
        media_path: str,
        engine: str = "flow_ai",
        is_fallback: bool = False
    ) -> str:
        """Emits a newly generated media asset (video cut or keyframe) to NLE video track."""
        return cls.format_event("nle_media", {
            "cue_index": cue_index,
            "media_type": media_type,
            "media_path": media_path,
            "engine": engine,
            "is_fallback": is_fallback
        })

    @classmethod
    def emit_audio(
        cls,
        cue_index: int,
        audio_path: str,
        duration_ms: int,
        speaker: str = "gemini_voice",
        ducking_db: float = -18.0
    ) -> str:
        """Emits synthesized speech audio clip to NLE voice track."""
        return cls.format_event("nle_audio", {
            "cue_index": cue_index,
            "audio_path": audio_path,
            "duration_ms": duration_ms,
            "speaker": speaker,
            "ducking_db": ducking_db
        })

    @classmethod
    def emit_timeline_sync(
        cls,
        total_cues: int,
        total_duration_ms: int,
        form_factor: str = "classic",
        project_name: str = "Sovereign_Shorts"
    ) -> str:
        """Emits comprehensive timeline state sync packet."""
        return cls.format_event("nle_timeline_sync", {
            "total_cues": total_cues,
            "total_duration_ms": total_duration_ms,
            "total_duration_s": round(total_duration_ms / 1000.0, 2),
            "form_factor": form_factor,
            "project_name": project_name,
            "status": "in_progress"
        })


nle_stream_bus = NLEStructuredStreamBus()
