"""
[Montage NLE Native Assembly Engine]
Converts VLStandardBlueprint v4.0 into multi-track NLE timeline structures,
computes broadcast-grade logarithmic decibel ducking envelopes (V(t) = 10^(gain/20)),
and guarantees microsecond integer precision for CapCut and Remotion exports.
"""

import math
from typing import Dict, Any, List, Optional
from datetime import datetime


class MontageNLE:
    """
    NLE Engine for assembling multi-track timelines and calculating DSP ducking curves.
    """

    @staticmethod
    def compute_logarithmic_ducking_gain(gain_db: float) -> float:
        """
        방송 표준 로그 데시벨 변환:
        Gain(t) = 10 ^ (target_db / 20)
        -24dB -> 약 0.0630957
        """
        return 10.0 ** (gain_db / 20.0)

    @staticmethod
    def ms_to_microsecond_int(ms: float | int) -> int:
        """
        CapCut 및 비디오 타임코드 마이크로초 정수 변환:
        t_us = round(t_ms * 1000)
        부동소수점 오차로 인한 프레임 드리프트 원천 방지
        """
        return int(round(float(ms) * 1000.0))

    @staticmethod
    def assemble_5track_timeline(blueprint: Dict[str, Any]) -> Dict[str, Any]:
        """
        VLStandardBlueprint v4.0으로부터 5단 NLE 타임라인 구조를 자동 조립합니다.
        Track 1: Video / Visuals (Main background & B-roll)
        Track 2: Overlays / Shapes (Header, hook band, banners)
        Track 3: Kinetic Subtitles (Karaoke word-level highlights)
        Track 4: Voiceover TTS (Narration audio)
        Track 5: BGM & SFX (Background music with -24dB ducking)
        """
        scenes = blueprint.get("scenes", [])
        global_layers = blueprint.get("globalLayers", [])
        audio_dsp = blueprint.get("audioDSP", {})
        ducking_env = audio_dsp.get("duckingEnvelope", {})
        target_ducking_db = ducking_env.get("targetDuckingDb", -24.0)

        track_video: List[Dict[str, Any]] = []
        track_overlays: List[Dict[str, Any]] = []
        track_subtitles: List[Dict[str, Any]] = []
        track_voice: List[Dict[str, Any]] = []
        track_bgm: List[Dict[str, Any]] = []

        current_time_ms = 0

        # Global layers (track 2)
        for layer in global_layers:
            track_overlays.append({
                "id": layer.get("id"),
                "name": layer.get("name"),
                "kind": layer.get("kind"),
                "startMs": layer.get("inMs", 0),
                "durationMs": layer.get("outMs") or 60000,
                "layer": layer,
            })

        # Scenes iteration
        for idx, sc in enumerate(scenes):
            duration_ms = sc.get("actualDurationMs") or sc.get("targetDurationMs", 4000)
            start_ms = current_time_ms
            end_ms = start_ms + duration_ms

            # 1. Video track
            track_video.append({
                "id": f"vid_{sc.get('sceneId')}",
                "sceneIndex": idx,
                "startMs": start_ms,
                "durationMs": duration_ms,
                "startUs": MontageNLE.ms_to_microsecond_int(start_ms),
                "durationUs": MontageNLE.ms_to_microsecond_int(duration_ms),
                "mediaAssetId": sc.get("mediaAssetId"),
                "motion": sc.get("motion"),
            })

            # 2. Voice track
            track_voice.append({
                "id": f"vox_{sc.get('sceneId')}",
                "sceneIndex": idx,
                "startMs": start_ms,
                "durationMs": duration_ms,
                "scriptText": sc.get("scriptText"),
            })

            # 3. Kinetic Subtitle track
            words = sc.get("words", [])
            for w_idx, w in enumerate(words):
                w_start = start_ms + w.get("startMs", 0)
                w_end = start_ms + w.get("endMs", duration_ms)
                track_subtitles.append({
                    "id": f"sub_{sc.get('sceneId')}_{w_idx}",
                    "word": w.get("word"),
                    "startMs": w_start,
                    "durationMs": max(100, w_end - w_start),
                    "highlightColor": w.get("highlightColor", "#FFE600"),
                    "scaleEffect": w.get("scaleEffect", "pop"),
                })

            current_time_ms = end_ms

        total_duration_ms = current_time_ms

        # 5. BGM track with ducking
        bgm_gain = MontageNLE.compute_logarithmic_ducking_gain(target_ducking_db)
        track_bgm.append({
            "id": "bgm_main",
            "startMs": 0,
            "durationMs": total_duration_ms,
            "normalVolumeDb": audio_dsp.get("bgmSignature", {}).get("volumeDb", -18.0),
            "duckedVolumeDb": target_ducking_db,
            "duckedLinearGain": bgm_gain,
            "attackMs": ducking_env.get("attackMs", 150),
            "releaseMs": ducking_env.get("releaseMs", 300),
        })

        return {
            "totalDurationMs": total_duration_ms,
            "totalDurationUs": MontageNLE.ms_to_microsecond_int(total_duration_ms),
            "tracks": {
                "track1_video": track_video,
                "track2_overlays": track_overlays,
                "track3_subtitles": track_subtitles,
                "track4_voice": track_voice,
                "track5_bgm": track_bgm,
            },
        }


montage_nle = MontageNLE()
