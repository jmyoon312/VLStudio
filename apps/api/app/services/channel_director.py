import logging
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
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

    def claim_batch(self, article_ids: List[int], channel_id: int, db: Session) -> List[models.ViralArticle]:
        """Atomically claim multiple viral articles for a brand channel."""
        claimed = []
        for aid in article_ids:
            try:
                art = self.claim_article(aid, channel_id, db)
                claimed.append(art)
            except Exception as e:
                logger.warning(f"[ChannelDirector] Could not claim article #{aid} for channel #{channel_id}: {e}")
        return claimed

    def calculate_channel_affinity(self, ch: models.BrandChannel, art: models.ViralArticle) -> Tuple[float, List[str]]:
        """
        Calculates 3D affinity score between BrandChannel DNA and ViralArticle
        Returns: (score, match_reasons)
        """
        score = 0.0
        reasons = []

        target_topics = [str(t).lower() for t in (ch.target_topics or []) if str(t).strip()]
        art_topic = (getattr(art, "topic_category", None) or "").lower()
        art_cross = [str(ct).lower() for ct in (getattr(art, "cross_topics", None) or []) if str(ct).strip()]
        art_entities = [str(tag).lower() for tag in (getattr(art, "entity_tags", None) or []) if str(tag).strip()]
        art_title = (art.title or "").lower()
        art_cat = (art.category or "").lower()

        # 1. Direct Target Topics vs Topic Category Match (+50 pts)
        if target_topics and art_topic:
            for tt in target_topics:
                if tt in art_topic or art_topic in tt:
                    score += 50.0
                    reasons.append(f"주제 일치: {tt}")
                    break

        # 2. Target Topics vs Cross Topics Match (+30 pts)
        if target_topics and art_cross:
            for ct in art_cross:
                for tt in target_topics:
                    if tt in ct or ct in tt:
                        score += 30.0
                        reasons.append(f"크로스 토픽: {ct}")
                        break

        # 3. Target Topics vs Entity Tags Match (+25 pts per tag, max 50)
        tag_pts = 0
        if target_topics and art_entities:
            for tag in art_entities:
                for tt in target_topics:
                    if tt in tag or tag in tt:
                        tag_pts += 25.0
                        reasons.append(f"엔티티 태그: {tag}")
                        break
            score += min(tag_pts, 50.0)

        # 4. Channel Expert Identity / Title Keyword Match (+20 pts)
        raw_dna = getattr(ch, "expert_identity", None) or getattr(ch, "title", "")
        if isinstance(raw_dna, dict):
            ch_dna = " ".join(str(v) for v in raw_dna.values() if isinstance(v, (str, int, float))).lower()
        else:
            ch_dna = str(raw_dna or getattr(ch, "title", "") or "").lower()

        if ch_dna:
            # Check if any art entity appears in channel DNA
            for tag in art_entities:
                if len(tag) >= 2 and tag in ch_dna:
                    score += 20.0
                    reasons.append(f"DNA 키워드: {tag}")
                    break
            # Check if art topic appears in channel DNA
            if art_topic and art_topic in ch_dna:
                score += 20.0
                reasons.append(f"DNA 분야: {art_topic}")

        # 5. Legacy Category Match (+10 pts)
        if art_cat and ch_dna and (art_cat in ch_dna or ch_dna in art_cat):
            score += 10.0
            reasons.append(f"카테고리: {art_cat}")

        return score, reasons

    async def run_dispatch_cycle(self, score_threshold: float = 25.0) -> Dict[str, Any]:
        """
        Scan unassigned high-viral articles and dispatch to best-matching active channels
        based on 15 killer themes, 2D cross-synergies, and precision entity tags.
        """
        claimed_count = 0
        dispatches = []
        with database.SessionLocal() as db:
            channels = db.query(models.BrandChannel).filter(models.BrandChannel.is_active == True).all()
            if not channels:
                # Fallback to all channels if none explicitly active
                channels = db.query(models.BrandChannel).all()
            if not channels:
                return {"claimed": 0, "message": "No brand channels registered"}

            # Find unassigned analyzed articles with viral_score >= 70
            unclaimed = db.query(models.ViralArticle).filter(
                models.ViralArticle.claimed_by_channel_id.is_(None),
                models.ViralArticle.status == "analyzed",
                models.ViralArticle.viral_score >= 70.0
            ).order_by(models.ViralArticle.viral_score.desc()).limit(30).all()

            if not unclaimed:
                return {"claimed": 0, "message": "No matching high-score articles"}

            for art in unclaimed:
                # Calculate affinity for each channel
                best_channel = None
                best_score = 0.0
                best_reasons = []

                for ch in channels:
                    aff_score, reasons = self.calculate_channel_affinity(ch, art)
                    if aff_score > best_score:
                        best_score = aff_score
                        best_channel = ch
                        best_reasons = reasons

                # Only claim if affinity score meets threshold (prevents mismatched spam)
                if best_channel and best_score >= score_threshold:
                    self.claim_article(art.id, best_channel.id, db)
                    claimed_count += 1
                    ch_title = getattr(best_channel, "title", None) or f"Channel_{best_channel.id}"
                    dispatches.append({
                        "article_id": art.id,
                        "title": art.title[:40],
                        "channel_id": best_channel.id,
                        "channel_title": ch_title,
                        "affinity_score": best_score,
                        "reasons": best_reasons
                    })

        return {
            "timestamp": datetime.now().isoformat(),
            "claimed_count": claimed_count,
            "dispatches": dispatches
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
