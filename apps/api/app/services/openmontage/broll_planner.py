"""
[OpenMontage B-Roll Matrix Planner]
Translates script narrative scenes, forensic diagnosis, and plus-alpha strategies
into an actionable visual beat matrix (B-Roll Timeline).
Generates multi-language search queries (KO + EN) and visual roles for stock & AI footage.
"""

import sys
import logging
from typing import List, Dict, Any, Optional

# Enforce UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

logger = logging.getLogger("broll_planner")


class BRollMatrixPlanner:
    """
    OpenMontage B-Roll Planner absorbing the 12-pipeline visual matrix engine.
    """

    def plan_broll_timeline(
        self,
        scenes: List[Dict[str, Any]],
        intervention_level: int = 1,
        source_media_path: Optional[str] = None,
        plus_alpha_strategy: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Plans B-Roll coverage based on intervention level:
        - Level 0: 0% B-roll intervention (preserve 100% original video anchor)
        - Level 1: Hook intervention only (0s~3s hook boost + reaction)
        - Level 2: Intermittent intervention (Lore/Debunk evidence inserts over anchor)
        - Level 3: Dynamic narrative matrix (Full multi-track coverage)
        """
        if intervention_level == 0:
            logger.info("[BRollPlanner] Level 0: Pure anchor preservation. Zero B-roll injection.")
            return []

        planned_tracks = []
        current_time_ms = 0

        # Extract plus-alpha cues if available
        debunk_clues = []
        if plus_alpha_strategy and "suggested_angles" in plus_alpha_strategy:
            debunk_clues = plus_alpha_strategy.get("suggested_angles", [])

        for idx, scene in enumerate(scenes):
            duration_ms = scene.get("targetDurationMs", 4000)
            role = scene.get("role", "narrative")
            script_text = scene.get("scriptText", "")
            keywords = scene.get("keywords", [])

            # Level 1 only injects for the opening hook
            if intervention_level == 1 and idx > 0 and role != "0s_hook":
                current_time_ms += duration_ms
                continue

            # Determine visual archetype
            if role == "0s_hook" or idx == 0:
                visual_role = "curiosity_hook"
                priority_source = "stock_curiosity"
                motion = {"type": "zoom_in_punch", "speed": 1.4}
            elif any(k in script_text for k in ["사실", "진실", "실제", "원래", "팩트"]):
                visual_role = "debunk_evidence"
                priority_source = "archive_real"
                motion = {"type": "ken_burns_pan", "speed": 1.0}
            elif any(k in script_text for k in ["비하인드", "역사", "원인", "당시", "배경"]):
                visual_role = "lore_illustration"
                priority_source = "wikimedia_history"
                motion = {"type": "slow_drift", "speed": 0.8}
            else:
                visual_role = "context_broll"
                priority_source = "stock_general"
                motion = {"type": "subtle_zoom", "speed": 1.0}

            # Generate Korean and English search queries
            query_ko = " ".join(keywords[:2]) if keywords else script_text[:15]
            query_en = self._estimate_en_keywords(query_ko, visual_role)

            planned_tracks.append({
                "sceneIndex": idx,
                "sceneId": scene.get("sceneId", f"scene_{idx+1}"),
                "startTimeMs": current_time_ms,
                "durationMs": duration_ms,
                "visualRole": visual_role,
                "prioritySource": priority_source,
                "searchQueryKo": query_ko,
                "searchQueryEn": query_en,
                "recommendedMotion": motion,
                "coveragePercent": 100 if intervention_level >= 2 else 50,
                "layerTarget": "broll_overlay" if source_media_path else "main_video"
            })

            current_time_ms += duration_ms

        logger.info(f"[BRollPlanner] Planned {len(planned_tracks)} B-Roll visual cues for Level {intervention_level}")
        return planned_tracks

    def _estimate_en_keywords(self, ko_query: str, visual_role: str) -> str:
        """Heuristic English keyword helper for international stock libraries."""
        role_map = {
            "curiosity_hook": "shocking mystery cinematic close up",
            "debunk_evidence": "investigation document proof real footage",
            "lore_illustration": "historical archive vintage documentary",
            "context_broll": "4k aesthetic slow motion cinematic"
        }
        return role_map.get(visual_role, "cinematic 4k vertical")


broll_planner = BRollMatrixPlanner()
