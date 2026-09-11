import logging
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app import crud, models
from app.llm_manager import LLMClient

logger = logging.getLogger(__name__)

class CommunityService:
    @staticmethod
    def list_comments(
        db: Session,
        channel_id: Optional[str] = None,
        sentiment: Optional[str] = None,
        is_replied: Optional[bool] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        유튜브 댓글 목록 조회 및 필터링
        """
        query = db.query(models.YouTubeComment)
        if channel_id and channel_id != "all":
            query = query.filter(models.YouTubeComment.channel_id == channel_id)
        if sentiment and sentiment != "all":
            query = query.filter(models.YouTubeComment.sentiment == sentiment)
        if is_replied is not None:
            query = query.filter(models.YouTubeComment.is_replied == is_replied)

        results = query.order_by(models.YouTubeComment.published_at.desc()).limit(limit).all()

        if not results:
            results = CommunityService._seed_comments_if_empty(db, channel_id)

        return [
            {
                "id": c.id,
                "comment_id": c.comment_id,
                "channel_id": c.channel_id,
                "video_id": c.video_id,
                "video_title": c.video_title or "바이럴 쇼츠 에피소드",
                "author_name": c.author_name,
                "author_profile_image": c.author_profile_image,
                "text": c.text,
                "sentiment": c.sentiment,
                "ai_reply": c.ai_reply,
                "is_replied": c.is_replied,
                "reply_mode": c.reply_mode,
                "published_at": c.published_at.strftime("%Y-%m-%d %H:%M") if c.published_at else "",
                "replied_at": c.replied_at.strftime("%Y-%m-%d %H:%M") if c.replied_at else None
            }
            for c in results
        ]

    _autopilot_global_enabled = True
    _autopilot_last_run = None
    _autopilot_stats = {
        "cycles": 0,
        "total_evaluated": 0,
        "auto_replied": 0,
        "flagged_review": 0
    }

    @staticmethod
    def _seed_comments_if_empty(db: Session, channel_id: Optional[str]) -> List[models.YouTubeComment]:
        target_channel = channel_id if (channel_id and channel_id != "all") else "ch_default_1"
        ch_slug = target_channel.replace("-", "_").replace(" ", "_")[-8:]

        # 채널 제목 조회
        brand_ch = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == target_channel).first()
        ch_title = brand_ch.title if brand_ch else "공식 채널"

        sample_comments = [
            models.YouTubeComment(
                comment_id=f"yt_c_{ch_slug}_101",
                channel_id=target_channel,
                video_id=f"v_{ch_slug}_01",
                video_title=f"{ch_title} - 단 3초 만에 10억 번 비밀 실화 쇼츠",
                author_name="알고리즘탐험가",
                author_profile_image="",
                text="이거 진짜 실화인가요? 어디서 더 자세한 공식 자료를 볼 수 있나요?",
                sentiment="question",
                ai_reply="네, 실제로 보도된 공식 사건 기록과 법원 판결문을 바탕으로 제작되었습니다! 다음 영상에서 더 놀라운 후속편을 공개할 예정이니 구독 누르고 기다려주세요 🔥",
                is_replied=False,
                reply_mode="manual",
                published_at=datetime.now() - timedelta(minutes=25)
            ),
            models.YouTubeComment(
                comment_id=f"yt_c_{ch_slug}_102",
                channel_id=target_channel,
                video_id=f"v_{ch_slug}_01",
                video_title=f"{ch_title} - 단 3초 만에 10억 번 비밀 실화 쇼츠",
                author_name="꿀팁저장소",
                author_profile_image="",
                text="영상 편집 템포랑 BGM 선곡 대박이네요 ㄷㄷ 10번 넘게 돌려봄!",
                sentiment="praise",
                ai_reply="좋게 봐주셔서 정말 감사합니다! 매일 더 몰입감 넘치고 흥미진진한 쇼츠로 찾아뵙겠습니다 ✨",
                is_replied=True,
                reply_mode="manual",
                published_at=datetime.now() - timedelta(hours=2),
                replied_at=datetime.now() - timedelta(hours=1)
            ),
            models.YouTubeComment(
                comment_id=f"yt_c_{ch_slug}_103",
                channel_id=target_channel,
                video_id=f"v_{ch_slug}_02",
                video_title=f"{ch_title} - 일상에서 유용한 과학 상식 5가지 모음",
                author_name="팩트체커",
                author_profile_image="",
                text="2번에 나온 내용은 논란이 많은 가설 아닌가요? 출처가 어디인가요?",
                sentiment="criticism",
                ai_reply="날카로운 지적 감사드립니다! 2번 내용은 최근 네이처지에 실린 연구 논문을 참조했으나, 학계의 상반된 반론도 존재합니다. 고정 댓글로 해당 논문 링크와 반론 요약을 함께 정리해두겠습니다!",
                is_replied=False,
                reply_mode="manual",
                published_at=datetime.now() - timedelta(minutes=10)
            )
        ]
        created = []
        for c in sample_comments:
            exists = db.query(models.YouTubeComment).filter(models.YouTubeComment.comment_id == c.comment_id).first()
            if not exists:
                db.add(c)
                created.append(c)
            else:
                created.append(exists)
        try:
            db.commit()
        except Exception:
            db.rollback()
        return created

    @staticmethod
    def get_autopilot_status(db: Session) -> Dict[str, Any]:
        """
        루피 AI 커뮤니티 오토파일럿 사령탑 상태 및 채널별 설정 조회
        """
        from app.services.channel_network_guard import channel_network_guard
        from app.services.background_workers import background_workers

        channels = db.query(models.BrandChannel).all()
        channel_statuses = []
        for ch in channels:
            identity = ch.expert_identity if isinstance(ch.expert_identity, dict) else {}
            style = ch.style_signature if isinstance(ch.style_signature, dict) else {}

            autopilot_mode = identity.get("autopilot_mode") or style.get("autopilot_mode") or ch.autonomy_status or "SAFE_AUTO"
            persona = identity.get("persona") or style.get("persona") or "friendly"
            is_enabled = ch.is_autonomous_enabled if ch.is_autonomous_enabled is not None else True

            pending_count = db.query(models.YouTubeComment).filter(
                models.YouTubeComment.channel_id == ch.channel_id,
                models.YouTubeComment.is_replied == False
            ).count()
            replied_count = db.query(models.YouTubeComment).filter(
                models.YouTubeComment.channel_id == ch.channel_id,
                models.YouTubeComment.is_replied == True
            ).count()
            sec_info = channel_network_guard.get_channel_security_summary(db, ch.channel_id)

            channel_statuses.append({
                "channel_id": ch.channel_id,
                "title": ch.title,
                "is_autonomous_enabled": is_enabled,
                "autopilot_mode": autopilot_mode,
                "persona": persona,
                "pending_count": pending_count,
                "replied_count": replied_count,
                "security": sec_info
            })

        return {
            "is_global_active": CommunityService._autopilot_global_enabled,
            "is_worker_running": getattr(background_workers, "is_running", True),
            "last_run_at": CommunityService._autopilot_last_run.strftime("%Y-%m-%d %H:%M:%S") if CommunityService._autopilot_last_run else "대기 중",
            "stats": CommunityService._autopilot_stats,
            "channels": channel_statuses
        }

    @staticmethod
    def set_channel_autopilot_config(
        db: Session,
        channel_id: str,
        is_autonomous_enabled: Optional[bool] = None,
        autopilot_mode: Optional[str] = None,
        persona: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        채널별 또는 전체 채널 오토파일럿 정책 설정
        """
        if channel_id == "all":
            channels = db.query(models.BrandChannel).all()
        else:
            channels = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id).all()

        for ch in channels:
            if is_autonomous_enabled is not None:
                ch.is_autonomous_enabled = is_autonomous_enabled
            if autopilot_mode is not None:
                ch.autonomy_status = autopilot_mode

            ident = dict(ch.expert_identity) if isinstance(ch.expert_identity, dict) else {}
            if autopilot_mode is not None:
                ident["autopilot_mode"] = autopilot_mode
            if persona is not None:
                ident["persona"] = persona
            ch.expert_identity = ident

        try:
            db.commit()
        except Exception:
            db.rollback()

        return {"status": "success", "channel_id": channel_id, "updated_count": len(channels)}

    @staticmethod
    def toggle_autopilot(db: Session, enabled: Optional[bool] = None) -> Dict[str, Any]:
        """
        루피 커뮤니티 오토파일럿 전역 활성화/비활성화 토글
        """
        if enabled is not None:
            CommunityService._autopilot_global_enabled = enabled
        else:
            CommunityService._autopilot_global_enabled = not CommunityService._autopilot_global_enabled
        return {"status": "success", "is_global_active": CommunityService._autopilot_global_enabled}

    @staticmethod
    def run_autopilot_cycle(db: Session, target_channel_id: Optional[str] = None) -> Dict[str, Any]:
        """
        루피 AI 사령탑이 통제하는 채널별 자율 댓글 관리 워커 사이클 실행
        1. 채널별 보안 네트워크(고정 ISP 또는 LTE 교체) 격리 컨텍스트 적용
        2. 채널별 댓글 스카우트/수집
        3. 루피 AI 맞춤 답글 생성 및 정책(SAFE_AUTO, FULL_AUTO, MANUAL_REVIEW)에 따른 자동 처리
        """
        from app.services.channel_network_guard import channel_network_guard
        from app.services.telegram_service import telegram_service

        if target_channel_id and target_channel_id != "all":
            channels = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == target_channel_id).all()
        else:
            channels = db.query(models.BrandChannel).all()

        if not channels:
            channels = [models.BrandChannel(channel_id="ch_default_1", title="메인 공식 채널", is_autonomous_enabled=True, autonomy_status="SAFE_AUTO")]

        cycle_summary = {
            "executed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "channels_processed": 0,
            "total_comments_evaluated": 0,
            "auto_replied_count": 0,
            "flagged_for_review": 0,
            "channel_reports": []
        }

        for ch in channels:
            ident = ch.expert_identity if isinstance(ch.expert_identity, dict) else {}
            style = ch.style_signature if isinstance(ch.style_signature, dict) else {}
            raw_mode = ident.get("autopilot_mode") or style.get("autopilot_mode") or ch.autonomy_status or "SAFE_AUTO"
            if raw_mode in ("MANUAL", "MANUAL_REVIEW"):
                autopilot_mode = "MANUAL_REVIEW"
            elif raw_mode == "FULL_AUTO":
                autopilot_mode = "FULL_AUTO"
            else:
                autopilot_mode = "SAFE_AUTO"

            persona = ident.get("persona") or style.get("persona") or "friendly"

            # 1. 채널 보안 네트워크 준비
            net_ctx = channel_network_guard.prepare_network_context(db, ch.channel_id)
            sec_mode = net_ctx.get("mode", "DIRECT")

            # 2. 미답변 댓글 조회
            unreplied = db.query(models.YouTubeComment).filter(
                models.YouTubeComment.channel_id == ch.channel_id,
                models.YouTubeComment.is_replied == False
            ).all()

            if not unreplied:
                total_for_ch = db.query(models.YouTubeComment).filter(models.YouTubeComment.channel_id == ch.channel_id).count()
                if total_for_ch == 0:
                    CommunityService._seed_comments_if_empty(db, ch.channel_id)
                    unreplied = db.query(models.YouTubeComment).filter(
                        models.YouTubeComment.channel_id == ch.channel_id,
                        models.YouTubeComment.is_replied == False
                    ).all()

            ch_auto_replied = 0
            ch_flagged = 0

            for c in unreplied:
                cycle_summary["total_comments_evaluated"] += 1

                # AI 답글 생성
                if not c.ai_reply:
                    try:
                        reply_res = CommunityService.generate_ai_reply(db, c.comment_id, persona=persona)
                        c.ai_reply = reply_res.get("ai_reply")
                    except Exception as e:
                        logger.warning(f"Error generating AI reply for {c.comment_id}: {e}")
                        c.ai_reply = f"소중한 의견 감사합니다, {c.author_name}님! 더 좋은 영상으로 보답하겠습니다 ✨"

                # 모드별 처리 결정
                if autopilot_mode == "FULL_AUTO":
                    c.is_replied = True
                    c.reply_mode = "auto"
                    c.replied_at = datetime.now()
                    ch_auto_replied += 1
                    cycle_summary["auto_replied_count"] += 1
                elif autopilot_mode == "SAFE_AUTO":
                    if c.sentiment in ["praise", "question", "neutral"]:
                        c.is_replied = True
                        c.reply_mode = "auto"
                        c.replied_at = datetime.now()
                        ch_auto_replied += 1
                        cycle_summary["auto_replied_count"] += 1
                    else:
                        c.is_replied = False
                        c.reply_mode = "manual"
                        ch_flagged += 1
                        cycle_summary["flagged_for_review"] += 1
                        if not c.is_alerted:
                            msg = (
                                f"⚠️ <b>[루피 사령탑 관제] {ch.title} 채널 주의 댓글 감지!</b>\n\n"
                                f"• 영상: {c.video_title or '영상'}\n"
                                f"• 작성자: {c.author_name} ({c.sentiment})\n"
                                f"• 내용: \"{c.text}\"\n\n"
                                f"💡 <b>루피 대응 제안:</b>\n{c.ai_reply}\n\n"
                                f"안전 모드 정책에 따라 자동 게시를 보류했습니다. 데스크톱 [댓글 소통 센터]에서 검토 승인하세요."
                            )
                            if telegram_service.send_message(msg, parse_mode="HTML", event_type="viral_alert"):
                                c.is_alerted = True
                else:
                    c.is_replied = False
                    c.reply_mode = "manual"
                    ch_flagged += 1
                    cycle_summary["flagged_for_review"] += 1

            try:
                db.commit()
            except Exception:
                db.rollback()

            cycle_summary["channels_processed"] += 1
            cycle_summary["channel_reports"].append({
                "channel_id": ch.channel_id,
                "title": ch.title,
                "mode": autopilot_mode,
                "security_mode": sec_mode,
                "evaluated": len(unreplied),
                "auto_replied": ch_auto_replied,
                "flagged": ch_flagged
            })

        CommunityService._autopilot_last_run = datetime.now()
        CommunityService._autopilot_stats["cycles"] += 1
        CommunityService._autopilot_stats["total_evaluated"] += cycle_summary["total_comments_evaluated"]
        CommunityService._autopilot_stats["auto_replied"] += cycle_summary["auto_replied_count"]
        CommunityService._autopilot_stats["flagged_review"] += cycle_summary["flagged_for_review"]

        logger.info(
            f"🤖 [루피 워커] 커뮤니티 자율 관리 완료: "
            f"{cycle_summary['channels_processed']}개 채널, "
            f"자동 게시 {cycle_summary['auto_replied_count']}건, "
            f"검토 보류 {cycle_summary['flagged_for_review']}건"
        )
        return cycle_summary

    @staticmethod
    def generate_ai_reply(
        db: Session,
        comment_id: str,
        persona: str = "friendly"
    ) -> Dict[str, Any]:
        """
        루피 AI 브레인을 통한 채널 페르소나 맞춤형 답글 생성
        """
        comment = db.query(models.YouTubeComment).filter(models.YouTubeComment.comment_id == comment_id).first()
        if not comment:
            raise ValueError(f"댓글 ID {comment_id}를 찾을 수 없습니다.")

        settings = crud.get_settings(db)
        target_model = (
            getattr(settings, "script_analysis_model", None) or
            getattr(settings, "default_llm_model", None) or
            "viraloop1"
        )
        llm_client = LLMClient(settings)

        persona_guide = {
            "friendly": "따뜻하고 친근하며, 감사함을 진심으로 표현하고 이모지를 적절히 활용하는 소통형 크리에이터",
            "witty": "센스 있고 재치 넘치며 유쾌하게 티키타카를 주고받는 바이럴 쇼츠 크리에이터",
            "expert": "차분하고 논리적이며, 정확한 근거와 신뢰감을 바탕으로 답변하는 지식 큐레이터"
        }.get(persona, "친근하고 정중한 크리에이터")

        prompt = f"""
당신은 유튜브 채널 공식 소통 담당 '루피 AI(Loopie)'입니다.
시청자가 남긴 댓글에 대해 아래 페르소나 지침에 맞춰 최고의 답글을 작성하세요.

[시청자 댓글 정보]
- 영상 제목: {comment.video_title or '영상'}
- 시청자 닉네임: {comment.author_name}
- 댓글 내용: "{comment.text}"
- 댓글 감성 분류: {comment.sentiment}

[답변 페르소나 스타일]
- 스타일: {persona_guide}
- 규칙:
  1. 길지 않고 임팩트 있게 1~3문장 이내로 작성하세요.
  2. 질문일 경우 핵심을 명쾌하게 답변하고 다음 영상 기대감을 조성하세요.
  3. 비판이나 의문일 경우 정중하게 경청하고 신뢰감 있게 대처하세요.
  4. 칭찬일 경우 진심 어린 감사와 함께 알고리즘 공유/구독을 유도하세요.
  5. 설명 없이 오직 시청자에게 보낼 완성된 답글 텍스트만 출력하세요.
"""

        try:
            generated_text = llm_client.generate_content(prompt, model_name=target_model).strip()
            # 따옴표 제거
            if generated_text.startswith('"') and generated_text.endswith('"'):
                generated_text = generated_text[1:-1].strip()
        except Exception as e:
            logger.warning(f"AI reply generation failed: {e}. Fallback reply used.")
            generated_text = f"소중한 의견 남겨주셔서 감사합니다, {comment.author_name}님! 앞으로 더 좋은 영상으로 보답하겠습니다 ✨"

        comment.ai_reply = generated_text
        try:
            db.commit()
            db.refresh(comment)
        except Exception:
            db.rollback()

        return {
            "comment_id": comment_id,
            "ai_reply": generated_text,
            "persona": persona
        }

    @staticmethod
    def post_reply(
        db: Session,
        comment_id: str,
        custom_reply: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        작성된 답글을 채널에 게시 완료 처리 (채널 프로필별 고정 ISP 프록시 또는 LTE 소프트 교체 자동 적용)
        """
        comment = db.query(models.YouTubeComment).filter(models.YouTubeComment.comment_id == comment_id).first()
        if not comment:
            raise ValueError(f"댓글 ID {comment_id}를 찾을 수 없습니다.")

        final_reply = custom_reply or comment.ai_reply
        if not final_reply:
            raise ValueError("게시할 답글 내용이 없습니다.")

        # 🛡️ [보안 가드] 채널 계정 설정(고정 ISP 프록시 vs LTE 소프트 교체) 적용
        from app.services.channel_network_guard import channel_network_guard
        net_ctx = channel_network_guard.prepare_network_context(db, comment.channel_id)

        comment.ai_reply = final_reply
        comment.is_replied = True
        comment.replied_at = datetime.now()

        try:
            db.commit()
            db.refresh(comment)
        except Exception:
            db.rollback()

        return {
            "status": "success",
            "comment_id": comment_id,
            "is_replied": True,
            "replied_at": comment.replied_at.strftime("%Y-%m-%d %H:%M"),
            "posted_reply": final_reply,
            "security_mode": net_ctx.get("mode"),
            "proxy_applied": bool(net_ctx.get("proxies")),
            "lte_rotated": net_ctx.get("rotated", False)
        }
