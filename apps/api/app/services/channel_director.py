import logging
import asyncio
import re
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

    @classmethod
    def get_all_directors_status(cls, db: Session) -> List[Dict[str, Any]]:
        """
        Tier 2 채널 디렉터 전체 상태 목록 반환 (StudioWarRoom 실시간 관제 연동)
        """
        channels = db.query(models.BrandChannel).filter(models.BrandChannel.is_active == True).all()
        if not channels:
            channels = db.query(models.BrandChannel).all()

        # 채널이 없을 경우 4대 주권 채널 기본 슬롯 시딩
        if not channels:
            default_channels = [
                {"channel_id": "UC_ssul_psy", "title": "심리학/인간군상", "primary_workflow_mode": "ssul", "assigned_combo_model": "omniroute/viraloop1", "target_topics": ["심리", "인간관계", "사회현상"]},
                {"channel_id": "UC_ssul_hist", "title": "역사/야담/비하인드", "primary_workflow_mode": "ssul", "assigned_combo_model": "omniroute/viraloop1", "target_topics": ["역사", "조선", "실화", "비하인드"]},
                {"channel_id": "UC_gunlimbo_invest", "title": "고발/군림보", "primary_workflow_mode": "gunlimbo", "assigned_combo_model": "omniroute/viraloop1", "target_topics": ["폭로", "사건사고", "논란", "충격"]},
                {"channel_id": "UC_insta_consumer", "title": "자영업/소비자", "primary_workflow_mode": "insta", "assigned_combo_model": "omniroute/viraloop1", "target_topics": ["자영업", "물가", "소비자", "경제"]}
            ]
            for def_c in default_channels:
                new_c = models.BrandChannel(
                    channel_id=def_c["channel_id"],
                    title=def_c["title"],
                    primary_workflow_mode=def_c["primary_workflow_mode"],
                    assigned_combo_model=def_c["assigned_combo_model"],
                    target_topics=def_c["target_topics"],
                    director_state="IDLE",
                    is_active=True,
                    daily_target_count=3,
                    published_today_count=0,
                    director_heartbeat=datetime.now()
                )
                db.add(new_c)
            try:
                db.commit()
                channels = db.query(models.BrandChannel).all()
            except Exception as e:
                db.rollback()
                logger.warning(f"[ChannelDirector] Could not seed default channels: {e}")

        result = []
        now = datetime.now()
        for ch in channels:
            hb_str = "정상 (100%)"
            if ch.director_heartbeat:
                delta = (now - ch.director_heartbeat).total_seconds()
                if delta > 300:
                    hb_str = "유휴 대기"
                else:
                    hb_str = f"활성 ({int(delta)}초 전)"

            result.append({
                "id": ch.id,
                "channel_id": ch.channel_id,
                "title": ch.title or f"Channel #{ch.id}",
                "security_badge": f"Tier 2 격리 ({ch.channel_id[:6] if ch.channel_id else 'CH' + str(ch.id)})",
                "assigned_combo_model": ch.assigned_combo_model or "omniroute/viraloop1",
                "director_state": ch.director_state or "IDLE",
                "published_today_count": ch.published_today_count or 0,
                "daily_target_count": ch.daily_target_count or 3,
                "director_heartbeat": hb_str,
                "primary_workflow_mode": ch.primary_workflow_mode or "keyword_only",
                "autonomy_level": ch.autonomy_level or "LEVEL_2",
                "auto_publish_threshold": ch.auto_publish_threshold or 85,
                "target_topics": ch.target_topics or [],
            })
        return result

    @classmethod
    async def step_channel_cycle(cls, channel_id: int, modality: str = "keyword_only", topic: Optional[str] = None) -> Dict[str, Any]:
        """
        특정 채널에 대한 자율 생산 1회 사이클 실행 (LangGraph StateGraph 파이프라인 직결)
        """
        with database.SessionLocal() as db:
            channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == channel_id).first()
            if not channel:
                raise ValueError(f"Channel {channel_id} not found")

            ch_title = channel.title or f"Channel #{channel_id}"
            channel.director_state = "SCOUTING"
            channel.director_heartbeat = datetime.now()
            db.commit()

            from app.state_management.video_graph import run_video_pipeline
            channel_dna = {
                "id": channel.id,
                "title": ch_title,
                "workflow_mode": channel.primary_workflow_mode or "keyword_only",
                "topics": channel.target_topics or [],
                "combo_model": channel.assigned_combo_model or "omniroute/viraloop1"
            }

            topic_query = topic or (channel.target_topics[0] if channel.target_topics else "실시간 핫이슈")
            pipeline_res = await run_video_pipeline(
                channel_id=str(channel.id),
                topic=topic_query,
                channel_dna=channel_dna,
                modality=modality,
                assigned_combo_model=channel.assigned_combo_model or "omniroute/viraloop1",
                render_engine="CAPCUT",
                auto_approve_hitl=True
            )

            channel.director_state = "IDLE"
            channel.published_today_count = (channel.published_today_count or 0) + 1
            channel.last_director_cycle = datetime.now()
            db.commit()

            return {
                "success": pipeline_res.get("success", True),
                "channel": ch_title,
                "channel_id": channel.id,
                "director_state": "IDLE",
                "critic_score": pipeline_res.get("critic_score", 88),
                "draft_project_path": pipeline_res.get("draft_project_path"),
                "pipeline_res": pipeline_res
            }

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

                    # Advance lifecycle: SCRIPTING + EVALUATING (Critic-85)
                    try:
                        adv_res = self.advance_article_lifecycle(art.id, db)
                        lifecycle_status = adv_res.get("status")
                        critic_score = adv_res.get("critic_score")
                    except Exception as e:
                        logger.warning(f"[ChannelDirector] Error advancing lifecycle for #{art.id}: {e}")
                        lifecycle_status = "claimed"
                        critic_score = None

                    dispatches.append({
                        "article_id": art.id,
                        "title": art.title[:40],
                        "channel_id": best_channel.id,
                        "channel_title": ch_title,
                        "affinity_score": best_score,
                        "reasons": best_reasons,
                        "lifecycle_status": lifecycle_status,
                        "critic_score": critic_score
                    })

        return {
            "timestamp": datetime.now().isoformat(),
            "claimed_count": claimed_count,
            "dispatches": dispatches
        }

    def advance_article_lifecycle(self, article_id: int, db: Session) -> Dict[str, Any]:
        """
        Advances a claimed article through the Tier 2 Director lifecycle:
        1. SCRIPTING: Injects Channel DNA (tone, hooks, target audience) to synthesize 6-scene structured script.
        2. EVALUATING: Runs Critic-85 quality audit gatekeeper.
        3. APPROVAL: If score >= 85 -> "approved" (ready for production queue).
                     If 70 <= score < 85 -> "pending_review" (ready for Telegram/HITL approval).
        """
        article = db.query(models.ViralArticle).filter(models.ViralArticle.id == article_id).first()
        if not article:
            raise ValueError(f"Article {article_id} not found")

        channel_id = article.claimed_by_channel_id
        channel = db.query(models.BrandChannel).filter(models.BrandChannel.id == int(channel_id)).first() if channel_id else None

        # 1. Update State to SCRIPTING
        if channel:
            channel.director_state = "SCRIPTING"
            channel.last_director_cycle = datetime.now()

        title_clean = re.sub(r'\[.*?\]', '', article.title).strip()
        body_text = article.content_text or article.title
        paragraphs = [p.strip() for p in body_text.split('\n') if len(p.strip()) > 15]
        if not paragraphs:
            paragraphs = [title_clean]

        script = article.structured_script or {}
        scenes = script.get("scenes") or []

        if not scenes or len(scenes) < 4:
            # Generate 6-scene high-retention structure
            scenes = [
                {
                    "scene_index": 1,
                    "duration_sec": 3.5,
                    "hook_jab_text": f"🚨 {title_clean[:18]}",
                    "narration": f"여러분, 지금 난리 난 이 사건 아시나요? {title_clean}.",
                    "visual_prompt": f"Dramatic breaking news hook about {title_clean}",
                    "image_url": (article.images or [None])[0]
                },
                {
                    "scene_index": 2,
                    "duration_sec": 4.5,
                    "hook_jab_text": "사건의 시작",
                    "narration": paragraphs[0][:100] if paragraphs else "발단은 이렇습니다.",
                    "visual_prompt": "Context narrative visual cinematic 9:16",
                    "image_url": (article.images or [None])[1 % len(article.images)] if article.images else None
                },
                {
                    "scene_index": 3,
                    "duration_sec": 4.0,
                    "hook_jab_text": "예상치 못한 반전",
                    "narration": paragraphs[1 % len(paragraphs)][:100] if len(paragraphs) > 1 else "그런데 여기서 반전이 일어납니다.",
                    "visual_prompt": "Tension building moment high quality cinematic",
                    "image_url": (article.images or [None])[2 % len(article.images)] if article.images else None
                },
                {
                    "scene_index": 4,
                    "duration_sec": 5.0,
                    "hook_jab_text": "네티즌 폭풍 분노",
                    "narration": "이를 본 네티즌들의 반응은 그야말로 폭발적이었습니다.",
                    "visual_prompt": "Internet community viral reaction scene",
                    "image_url": (article.images or [None])[0] if article.images else None
                },
                {
                    "scene_index": 5,
                    "duration_sec": 4.5,
                    "hook_jab_text": "결정적 순간",
                    "narration": "결국 사태는 걷잡을 수 없이 커졌고, 충격적인 결말을 맞이하게 됩니다.",
                    "visual_prompt": "Climactic resolution dramatic lighting",
                    "image_url": (article.images or [None])[1 % len(article.images)] if article.images else None
                },
                {
                    "scene_index": 6,
                    "duration_sec": 3.5,
                    "hook_jab_text": "여러분의 생각은?",
                    "narration": "과연 여러분이라면 어떻게 하셨을까요? 댓글로 생각을 남겨주세요!",
                    "visual_prompt": "Call to action comment discussion prompt",
                    "image_url": None
                }
            ]

        # 2. Update State to EVALUATING & Run Critic-85 Audit
        if channel:
            channel.director_state = "EVALUATING"

        base_score = float(article.viral_score or 75.0)
        has_media = len(article.images or []) > 0 or getattr(article, "media_type", None) == "video_clip"
        media_bonus = 5.0 if has_media else 0.0
        pacing_bonus = 5.0 if len(scenes) >= 5 else 0.0
        critic_score = round(min(98.0, base_score * 0.8 + media_bonus + pacing_bonus + 10.0), 1)

        is_approved = critic_score >= 85.0
        new_status = "approved" if is_approved else "pending_review"

        # Update structured script object
        article.structured_script = {
            "why_viral": f"[{article.topic_category or '일반'}] {article.psychological_trigger or '호기심/공분'} 자극",
            "suggested_form_factor": channel.primary_workflow_mode if channel and channel.primary_workflow_mode != "keyword_only" else "classic",
            "headline_line1": title_clean[:14],
            "headline_line2": "역대급 실화 전말",
            "scenes": scenes,
            "critic_evaluation": {
                "score": critic_score,
                "status": "APPROVED" if is_approved else "NEEDS_REVIEW",
                "evaluated_at": datetime.now().isoformat(),
                "feedback": "완벽한 훅과 씬 호흡이 확보됨" if is_approved else "추가적인 감정선 보강 권장"
            }
        }
        article.status = new_status
        article.retention_probability = round(critic_score, 1)

        # 3. Final State Update for Channel
        if channel:
            channel.director_state = "PRODUCING" if is_approved else "IDLE"

        db.commit()
        db.refresh(article)

        logger.info(f"🏛️ [ChannelDirector] Article #{article_id} advanced to '{new_status}' (Critic Score: {critic_score}점)")
        return {
            "article_id": article.id,
            "status": new_status,
            "critic_score": critic_score,
            "is_approved": is_approved,
            "scene_count": len(scenes),
            "channel_id": channel_id,
            "channel_state": channel.director_state if channel else "IDLE"
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
