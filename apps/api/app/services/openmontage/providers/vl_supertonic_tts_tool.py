"""
VLSupertonicTTSTool: OpenMontage Provider Adapter for Speech Synthesis.
Integrates ViraLoop's Supertonic on-device TTS and Google TTS engine.
"""

from typing import Dict, Any, List, Optional
from app.services.openmontage.base_tool import BaseTool, ToolCapability, ToolResult
from app.database import SessionLocal
from app.crud import get_settings
from app.tts_engine import TTSEngine


class VLSupertonicTTSTool(BaseTool):
    name: str = "vl_supertonic_tts_tool"
    description: str = "Synthesizes high-fidelity speech audio using Supertonic or Google TTS"
    capabilities: List[str] = [ToolCapability.TTS]
    parameters_schema: Dict[str, Any] = {
        "properties": {
            "text": {"type": "string", "description": "The speech transcript text to synthesize"},
            "voice_id": {"type": "string", "description": "Voice identifier", "default": "google_female_calm"},
            "language": {"type": "string", "default": "ko"},
            "engine": {"type": "string", "default": "google"}
        },
        "required": ["text"]
    }

    async def execute(
        self,
        text: str,
        voice_id: str = "google_female_calm",
        language: str = "ko",
        engine: str = "google"
    ) -> Dict[str, Any]:
        with SessionLocal() as db:
            db_settings = get_settings(db)
            tts = TTSEngine(db_settings)
            result = await tts.generate_audio(
                text=text,
                engine=engine,
                language=language,
                voice_id=voice_id
            )
            return {
                "audio_path": result.get("file_path") or result.get("path"),
                "duration_s": result.get("duration", 0),
                "voice_id": voice_id,
                "engine": engine
            }
