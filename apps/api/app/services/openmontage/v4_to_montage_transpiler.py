"""
VLStandardBlueprint v4.0 to OpenMontage ExplainerProps Transpiler.
===================================================================
Converts ultra-detailed 17-point v4.0 blueprints and timing cues into
OpenMontage Remotion ExplainerProps format without information loss.
Embeds sidecar metadata envelope for 100% preservation.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("v4_to_montage_transpiler")


class V4ToMontageTranspiler:
    """
    Transpiles VLStandardBlueprint v4.0 or production cues into OpenMontage ExplainerProps.
    """

    @staticmethod
    def transpile_cues_to_props(
        title: str,
        cues: List[Dict[str, Any]],
        duration_s: float = 15.0,
        theme: str = "flat-motion-graphics",
        narration_audio_path: Optional[str] = None,
        bgm_audio_path: Optional[str] = None,
        sidecar_v4: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Fast transpilation from structured cues to OpenMontage ExplainerProps.
        """
        cuts: List[Dict[str, Any]] = []
        captions: List[Dict[str, Any]] = []
        overlays: List[Dict[str, Any]] = []

        # 1. Add Hero Title Cut for 0s Hook if title is provided
        if not cues:
            cuts.append({
                "id": "cut_hero_default",
                "in_seconds": 0.0,
                "out_seconds": min(3.5, duration_s),
                "type": "hero_title",
                "text": title or "바이럴 숏폼",
                "subtitle": "🔥 화제의 킬링 파트"
            })
            if duration_s > 3.5:
                cuts.append({
                    "id": "cut_body_default",
                    "in_seconds": 3.5,
                    "out_seconds": duration_s,
                    "type": "text_card",
                    "text": "영상 제작 완료"
                })
        else:
            for idx, c in enumerate(cues):
                start_s = round(float(c.get("start_ms", 0)) / 1000.0, 3)
                end_s = round(float(c.get("end_ms", 3000)) / 1000.0, 3)
                if end_s <= start_s:
                    end_s = start_s + 2.5
                text = str(c.get("text", "")).strip()

                # First cut is hero_title, subsequent cuts are text_card or stat_card
                cut_type = "hero_title" if idx == 0 else "text_card"
                if "💡" in text or "⚡" in text or "%" in text:
                    cut_type = "stat_card"

                cut_obj = {
                    "id": f"cut_{idx + 1}",
                    "in_seconds": start_s,
                    "out_seconds": end_s,
                    "type": cut_type,
                    "text": text,
                    "subtitle": title if idx == 0 else ""
                }
                cuts.append(cut_obj)

                # Word captions if present, or split sentence
                words = text.split()
                if words:
                    word_duration = (end_s - start_s) / max(1, len(words))
                    for w_idx, w in enumerate(words):
                        w_start = start_s + (w_idx * word_duration)
                        w_end = w_start + word_duration
                        captions.append({
                            "word": w,
                            "startMs": int(w_start * 1000),
                            "endMs": int(w_end * 1000),
                            "highlightColor": "#FFE600" if (w_idx % 2 == 1) else "#00FFCC"
                        })

        # 2. Add Top Header Bar as persistent overlay
        if title:
            overlays.append({
                "type": "section_title",
                "in_seconds": 0.0,
                "out_seconds": duration_s,
                "text": title,
                "subtitle": "ViraLoop Sovereign Studio"
            })

        # 3. Audio block
        audio_props: Dict[str, Any] = {}
        if narration_audio_path and os.path.exists(narration_audio_path):
            audio_props["narration"] = {
                "src": narration_audio_path.replace("\\", "/"),
                "volume": 1.0
            }
        if bgm_audio_path and os.path.exists(bgm_audio_path):
            audio_props["music"] = {
                "src": bgm_audio_path.replace("\\", "/"),
                "volume": 0.18,
                "fadeInSeconds": 1.0
            }

        props_payload = {
            "cuts": cuts,
            "overlays": overlays,
            "captions": captions,
            "audio": audio_props,
            "theme": theme
        }

        if sidecar_v4:
            props_payload["_sidecar_v4"] = sidecar_v4

        return props_payload

    @staticmethod
    def transpile_blueprint_v4(blueprint_v4: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep transpilation from complete VLStandardBlueprint v4.0 to OpenMontage ExplainerProps.
        """
        scenes = blueprint_v4.get("scenes", [])
        title = blueprint_v4.get("name", "바이럴 숏폼")
        archetype = blueprint_v4.get("archetype", "classic")

        # Map archetype to OpenMontage theme
        theme_map = {
            "classic": "flat-motion-graphics",
            "gunlimbo": "dark",
            "instagram": "clean-professional",
            "ssul": "minimal-editorial",
            "bespoke": "flat-motion-graphics"
        }
        theme = theme_map.get(archetype, "flat-motion-graphics")

        cues = []
        total_duration_ms = 0
        for s in scenes:
            s_dur = s.get("actualDurationMs") or s.get("targetDurationMs", 3000)
            cues.append({
                "start_ms": total_duration_ms,
                "end_ms": total_duration_ms + s_dur,
                "text": s.get("scriptText", "")
            })
            total_duration_ms += s_dur

        duration_s = max(15.0, round(total_duration_ms / 1000.0, 1))

        return V4ToMontageTranspiler.transpile_cues_to_props(
            title=title,
            cues=cues,
            duration_s=duration_s,
            theme=theme,
            sidecar_v4=blueprint_v4
        )
