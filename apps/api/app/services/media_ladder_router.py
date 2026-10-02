"""
[Media Ladder Router]
2-Track Media Sourcing Ladder Router:
- Track A (Video Provided): Anchor preservation + minimal-intervention pinpoint B-roll.
- Track B (Text/Article Only): 3-Tier Media Escalation Ladder
  (Tier 1: Real Related Web Assets -> Tier 2: 4K Stock Footage -> Tier 3: Gemini Web Imagen 3 / Google Flow AI)
"""

import sys
import logging
import asyncio
from typing import List, Dict, Any, Optional

# Enforce UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.services.openmontage.stock_footage_tool import stock_footage_tool
from app.services.openmontage.broll_planner import broll_planner

logger = logging.getLogger("media_ladder_router")


class MediaLadderRouter:
    """
    Directs media harvesting and visual asset placement according to source availability,
    Channel DNA, and Deliberative Intervention Level.
    """

    async def route_and_source_media(
        self,
        scenes: List[Dict[str, Any]],
        source_media_path: Optional[str] = None,
        source_media_url: Optional[str] = None,
        intervention_level: int = 1,
        channel_dna: Optional[Dict[str, Any]] = None,
        plus_alpha_strategy: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Executes the media ladder strategy and returns resolved media segments for each scene.
        """
        # 1. Plan visual beat matrix using B-Roll Planner
        broll_plan = broll_planner.plan_broll_timeline(
            scenes=scenes,
            intervention_level=intervention_level,
            source_media_path=source_media_path,
            plus_alpha_strategy=plus_alpha_strategy
        )

        resolved_media_layers = []

        # TRACK A: Video Provided (Original Video is Base Anchor)
        if source_media_path or source_media_url:
            logger.info("[MediaLadder] TRACK A Activated: Source video provided. Preserving as anchor.")
            
            # Base anchor layer spanning the whole duration
            resolved_media_layers.append({
                "layerId": "layer_main_anchor",
                "layerType": "video",
                "trackIndex": 0,
                "role": "main_anchor",
                "sourcePath": source_media_path or source_media_url,
                "sourceType": "local_file" if source_media_path else "stream_url",
                "startTimeMs": 0,
                "durationMs": sum(s.get("targetDurationMs", 4000) for s in scenes),
                "transform": {"scale": 1.0, "x": 0, "y": 0, "fit": "cover"}
            })

            # For Level 0, stop right here
            if intervention_level == 0:
                logger.info("[MediaLadder] Level 0: Pure anchor retention. No external downloads.")
                return resolved_media_layers

            # For Level 1 ~ 3, selectively resolve pinpoint B-roll overlays
            for cue in broll_plan:
                if cue.get("layerTarget") == "broll_overlay":
                    # Search free stock as evidence/lore overlay
                    stock_items = await stock_footage_tool.search_stock_multi(
                        query=cue.get("searchQueryKo", "cinematic"),
                        limit_per_source=1
                    )
                    selected_stock = stock_items[0] if stock_items else None
                    resolved_media_layers.append({
                        "layerId": f"broll_overlay_{cue['sceneId']}",
                        "layerType": "video" if (selected_stock and selected_stock.get("mediaType") == "video") else "image",
                        "trackIndex": 1,
                        "role": cue["visualRole"],
                        "sourcePath": selected_stock.get("url") if selected_stock else None,
                        "sourceType": "stock_remote",
                        "startTimeMs": cue["startTimeMs"],
                        "durationMs": cue["durationMs"],
                        "motion": cue["recommendedMotion"],
                        "transform": {"scale": 1.05, "opacity": 0.95}
                    })

            return resolved_media_layers

        # TRACK B: Text/Article Only (No Source Video)
        logger.info("[MediaLadder] TRACK B Activated: No video source. Triggering 3-tier escalation ladder.")

        for cue in broll_plan:
            scene_idx = cue.get("sceneIndex", 0)
            query_ko = cue.get("searchQueryKo", "")
            visual_role = cue.get("visualRole", "context_broll")

            # Tier 1 & Tier 2: Free 4K Stock & Public Archive
            stock_items = await stock_footage_tool.search_stock_multi(
                query=query_ko or "korea documentary 4k",
                limit_per_source=2
            )

            if stock_items:
                chosen = stock_items[0]
                resolved_media_layers.append({
                    "layerId": f"main_stock_{cue['sceneId']}",
                    "layerType": chosen.get("mediaType", "video"),
                    "trackIndex": 0,
                    "role": visual_role,
                    "sourcePath": chosen.get("url"),
                    "sourceType": "stock_remote",
                    "startTimeMs": cue["startTimeMs"],
                    "durationMs": cue["durationMs"],
                    "motion": cue["recommendedMotion"],
                    "attribution": chosen.get("source", "stock")
                })
            else:
                # Tier 3: Escalate to Generative AI Prompt (Gemini Web Imagen 3 / Google Flow AI)
                prompt_en = f"Ultra-detailed 8k masterpiece cinematic frame: {cue.get('searchQueryEn', 'cinematic scene')}, dramatic volumetric lighting, 9:16 vertical ratio."
                resolved_media_layers.append({
                    "layerId": f"ai_gen_{cue['sceneId']}",
                    "layerType": "generative_placeholder",
                    "trackIndex": 0,
                    "role": visual_role,
                    "genEngine": "gemini_imagen3",
                    "genPrompt": prompt_en,
                    "startTimeMs": cue["startTimeMs"],
                    "durationMs": cue["durationMs"],
                    "motion": cue["recommendedMotion"],
                    "status": "ready_for_generation"
                })

        return resolved_media_layers


media_ladder_router = MediaLadderRouter()
