import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from .. import models, database
from .global_arbiter import global_arbiter

logger = logging.getLogger(__name__)


class ChannelDirector:
    """Tier 2 Sovereign Channel Director:
    Autonomously claims matched viral articles for brand channels and dispatches them
    into the production pipeline under GlobalArbiter GPU locking.
    """

    def __init__(self):
        self._is_running = False
        self._daemon_task: Optional[asyncio.Task] = None

    def claim_article(self, article_id: int, channel_id: int, db: Session) -> models.ViralArticle:
        """Atomically claim a viral article for a specific brand channel."""
        article = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")

        if article.claimed_by_channel_id and str(article.claimed_by_channel_id) != str(channel_id):
            raise ValueError(f"Article {article_id} is already claimed by Channel #{article.claimed_by_channel_id}")

        channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
        channel_name = getattr(channel, "title", None) or f"Channel_{channel_id}"

        article.claimed_by_channel_id = str(channel_id)
        article.claimed_at = datetime.now()
        article.status = "claimed"

        db.commit()
        db.refresh(article)
        logger.info(f"🏛️ [ChannelDirector] Article #{article_id} ('{article.title[:30]}...') claimed by Channel '{channel_name}'")
        return article

    def unclaim_article(self, article_id: int, db: Session) -> models.ViralArticle:
        """Release a claimed article back to the public pool."""
        article = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")

        article.claimed_by_channel_id = None
        article.claimed_at = None
        article.status = "analyzed" if article.analysis_summary else "collected"

        db.commit()
        db.refresh(article)
        logger.info(f"🏛️ [ChannelDirector] Article #{article_id} unclaimed and returned to pool.")
        return article

    async def run_dispatch_cycle(self) -> Dict[str, Any]:
        """Scan unassigned high-viral articles and dispatch to matching active channels."""
        claimed_count = 0
        with database.SessionLocal() as db:
            channels = db.query(models.BrandChannel).all()
            if not channels:
                return {"claimed": 0, "message": "No brand channels registered"}

            # Find unassigned analyzed articles with viral_score >= 70
            unclaimed = db.query(models.ViralArticle).filter(
                models.ViralArticle.claimed_by_channel_id.is_(None),
                models.ViralArticle.status == "analyzed",
                models.ViralArticle.viral_score >= 70.0
            ).order_by(models.ViralArticle.viral_score.desc()).limit(20).all()

            if not unclaimed:
                return {"claimed": 0, "message": "No matching high-score articles"}

            for art in unclaimed:
                # Find best fitting channel
                best_channel = None
                for ch in channels:
                    # DNA match: check if category or style matches
                    ch_dna = (getattr(ch, "expert_identity", "") or getattr(ch, "title", "")).lower()
                    art_cat = (art.category or "").lower()
                    if ch_dna and (art_cat in ch_dna or ch_dna in art_cat):
                        best_channel = ch
                        break

                # Fallback to first channel if no strict genre match
                if not best_channel and channels:
                    best_channel = channels[0]

                if best_channel:
                    self.claim_article(art.id, best_channel.id, db)
                    claimed_count += 1

        return {
            "timestamp": datetime.now().isoformat(),
            "claimed_count": claimed_count
        }

    def start_director_daemon(self, interval_seconds: int = 180):
        if self._is_running:
            return
        self._is_running = True

        async def _loop():
            logger.info(f"[ChannelDirector] Tier 2 autonomous claim daemon started (interval={interval_seconds}s)")
            while self._is_running:
                try:
                    await self.run_dispatch_cycle()
                except Exception as e:
                    logger.error(f"[ChannelDirector] Dispatch cycle error: {e}")
                await asyncio.sleep(interval_seconds)

        self._daemon_task = asyncio.create_task(_loop())

    def stop_director_daemon(self):
        self._is_running = False
        if self._daemon_task and not self._daemon_task.done():
            self._daemon_task.cancel()
        logger.info("[ChannelDirector] Autonomous daemon stopped.")


channel_director = ChannelDirector()
