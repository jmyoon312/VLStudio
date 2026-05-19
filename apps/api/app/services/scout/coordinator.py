import logging
import os
from typing import Optional
from .browser_scout import BrowserAssetScout
from .ranker import AssetRanker
from .validator import AssetValidator

logger = logging.getLogger(__name__)

class ScoutCoordinator:
    """
    Orchestrates the intelligent scouting workflow:
    Scout -> Rank (CLIP) -> Validate (Gemini) -> Select.
    """
    def __init__(self):
        self.scout = BrowserAssetScout(headless=True)
        self.ranker = AssetRanker()
        self.validator = AssetValidator()

    async def find_best_asset(self, query: str, scene_id: int) -> Optional[str]:
        """
        End-to-end flow to find and select the best asset for a scene.
        """
        logger.info(f"🕵️‍♂️ Starting Intelligent Scouting for Scene #{scene_id}: '{query}'")
        
        # 1. Brower Scout: Find candidates
        candidates = self.scout.scout_tiktok(query, limit=3)
        if not candidates:
            logger.warning("🚫 No candidates found on web. Falling back to AI Gen.")
            return None
            
        ranked_candidates = []
        
        # 2. Download and Rank (CLIP)
        for cand in candidates:
            local_path = self.scout.download_asset(cand['url'])
            if local_path and os.path.exists(local_path):
                # If it's a video, ranker will use the first frame (Ranker currently handles images, let's assume it handles first frame)
                score = self.ranker.score_asset(local_path, query)
                ranked_candidates.append({
                    "path": local_path,
                    "score": score,
                    "url": cand['url']
                })
            else:
                logger.error(f"❌ Failed to download or verify candidate: {cand['url']}")

        if not ranked_candidates:
            return None
            
        # 3. Decision Logic
        # Sort by score
        ranked_candidates.sort(key=lambda x: x['score'], reverse=True)
        best = ranked_candidates[0]
        
        logger.info(f"🏆 Best Candidate: Score {best['score']:.4f} at {best['path']}")
        
        # 4. Final Validation (Gemini Flash) - Zero Cost refinement
        if 0.5 <= best['score'] < 0.75:
            logger.info("⚖️ Score in uncertain range. Invoking Gemini Validator...")
            validation = await self.validator.validate_asset(best['path'], query)
            if validation.get("verdict") == "poor":
                logger.warning(f"❌ Gemini rejected the best clip: {validation.get('reason')}")
                # Try second best or give up
                return None
                
        if best['score'] < 0.5:
            logger.warning("📉 Best score too low. Rejecting all.")
            return None
            
        return best['path']

    def close(self):
        self.scout.close()
