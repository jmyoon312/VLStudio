import logging
import html
import asyncio
import aiohttp
import requests
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud, models
from app.llm_manager import LLMClient

logger = logging.getLogger("telegram_service")

class TelegramService:
    """
    루피(Loopie) AI 텔레그램 원격 양방향 사령탑:
    - 텔레그램 스마트 푸시 알림 디스패처 (일일 리포트, 대박/저조 분석, 악플 감지, 긴급 장애)
    - 양방향 리스너(Telegram Polling Listener): 대표님의 모바일 자연어 명령 수신 및 루피 AI 브레인 연동 응답
    - 인라인 키보드(Inline Keyboard) 원클릭 댓글 답글 승인 인터랙션
    """

    def __init__(self):
        self.is_polling = False
        self._poll_task = None
        self._last_update_id = 0

    @staticmethod
    def is_event_enabled(event_type: Optional[str], settings: Any) -> bool:
        if not event_type:
            return True
        if not settings:
            return False
        events = getattr(settings, "telegram_events", None) or {}
        return bool(events.get(event_type, True))

    @staticmethod
    def send_raw(token: str, chat_id: str, text: str, parse_mode: str = "HTML", reply_markup: Optional[Dict] = None) -> tuple[bool, str]:
        if not token or not chat_id:
            return False, "봇 토큰 또는 Chat ID가 비어 있습니다."

        url = f"https://api.telegram.org/bot{token}/sendMessage"
        payload = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup

        try:
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                logger.info("[Telegram] Message dispatched successfully.")
                return True, "성공"
            else:
                err_msg = f"텔레그램 응답 오류 ({resp.status_code}): {resp.text}"
                logger.warning(f"[Telegram] {err_msg}")
                return False, err_msg
        except Exception as e:
            err_msg = f"텔레그램 통신 실패: {str(e)}"
            logger.error(f"[Telegram] {err_msg}")
            return False, err_msg

    @classmethod
    def send_message(cls, text: str, parse_mode: str = "HTML", event_type: Optional[str] = None, reply_markup: Optional[Dict] = None) -> bool:
        db: Session = SessionLocal()
        try:
            settings = crud.get_settings(db)
            if not settings or not getattr(settings, "telegram_notify_enabled", False):
                return False
            
            token = getattr(settings, "telegram_bot_token", None)
            chat_id = getattr(settings, "telegram_chat_id", None)
            
            if not token or not chat_id:
                return False
                
            if event_type and not cls.is_event_enabled(event_type, settings):
                logger.info(f"[Telegram] Event '{event_type}' is disabled in settings. Skipping.")
                return False

            ok, _ = cls.send_raw(token, chat_id, text, parse_mode, reply_markup=reply_markup)
            return ok
        finally:
            db.close()

    @classmethod
    def send_daily_report_brief(cls, report_date_str: str, stats: Dict[str, Any], ai_summary_text: str = "") -> bool:
        sourcing = stats.get("sourcing", {})
        distribution = stats.get("distribution", {})
        growth = stats.get("growth", {})
        revenue = stats.get("revenue_bi", {})
        hook = stats.get("hook_analytics", {})
        community = stats.get("community_engagement", {})

        videos_collected = sourcing.get("videos_collected", 0)
        uploaded_today = distribution.get("uploaded_today", 0)
        upload_success_rate = distribution.get("upload_success_rate", 100.0)
        views_inc = growth.get("total_daily_views_increase", 0)
        subs_inc = growth.get("total_daily_subs_increase", 0)

        rev_val = revenue.get("total_revenue", 0)
        roi_val = revenue.get("roi_percentage", 0)
        rpm_val = revenue.get("avg_rpm", 42.0)

        viral_c = hook.get("viral_count", 0)
        under_c = hook.get("underperforming_count", 0)
        comm_c = community.get("total_comments", 0)
        reply_rate = community.get("replied_rate", 100.0)

        summary_snippet = ""
        if ai_summary_text:
            lines = [l.strip() for l in ai_summary_text.split("\n") if l.strip() and not l.strip().startswith("#")][:3]
            if lines:
                summary_snippet = "\n".join([f"• {html.escape(l)}" for l in lines])

        msg = (
            f"🤖 <b>[루피 AI 사령탑] 일일 결산 종합 리포트</b>\n"
            f"📅 <b>일자:</b> {html.escape(report_date_str)}\n\n"
            f"💰 <b>다채널 수익 & ROI</b>\n"
            f"• 💵 <b>추정 일일 수익:</b> ₩{rev_val:,}원 (RPM ₩{rpm_val})\n"
            f"• 📈 <b>순이익률 (ROI):</b> <b>{roi_val}%</b>\n\n"
            f"📊 <b>파이프라인 & 채널 성장</b>\n"
            f"• 📥 <b>소재 수집:</b> +{videos_collected}개 | 🚀 <b>쇼츠 배포:</b> {uploaded_today}건 ({upload_success_rate}%)\n"
            f"• 📈 <b>채널 순증:</b> +{views_inc:,}회 조회수 | +{subs_inc:,}명 구독자\n\n"
            f"🎯 <b>후킹 진단 & 댓글 소통</b>\n"
            f"• 🔥 <b>바이럴 성공:</b> {viral_c}건 | ⚠️ <b>보완 진단:</b> {under_c}건\n"
            f"• 💬 <b>댓글 상호작용:</b> {comm_c}건 (AI 맞춤 답글율: <b>{reply_rate}%</b>)\n"
        )

        if summary_snippet:
            msg += f"\n💡 <b>루피의 핵심 총평</b>\n{summary_snippet}\n"

        msg += f"\n<i>상세 분석 대시보드: VLStudio 데스크톱 /reports</i>"
        return cls.send_message(msg, parse_mode="HTML", event_type="daily_report")


    @classmethod
    def send_viral_alert(cls, channel_title: str, video_title: str, views: int, diagnosis: str, is_breakout: bool = True) -> bool:
        icon = "🔥 <b>[대박 숏폼 감지!]</b>" if is_breakout else "⚠️ <b>[후킹 저조 영상 진단]</b>"
        msg = (
            f"{icon}\n\n"
            f"📺 <b>채널:</b> {html.escape(channel_title)}\n"
            f"🎬 <b>영상:</b> {html.escape(video_title)}\n"
            f"👁️ <b>조회수:</b> {views:,}회\n\n"
            f"🧠 <b>루피의 AI 역분석:</b>\n"
            f"{html.escape(diagnosis)}\n\n"
            f"<i>피드백이 다음 영상 대본 생성 프롬프트에 자동 반영되었습니다.</i>"
        )
        return cls.send_message(msg, parse_mode="HTML", event_type="viral_alert")

    @classmethod
    def send_emergency_alert(cls, title: str, detail: str) -> bool:
        msg = (
            f"🚨 <b>[VLStudio 긴급 관제 알림]</b>\n\n"
            f"⚠️ <b>유형:</b> {html.escape(title)}\n"
            f"📝 <b>세부 내용:</b>\n<code>{html.escape(detail[:800])}</code>\n\n"
            f"<i>즉시 시스템 환경설정 및 로그 센터를 점검해 주십시오.</i>"
        )
        return cls.send_message(msg, parse_mode="HTML", event_type="system_critical_error")

    # ── 📡 양방향 리스너 (텔레그램 명령 수신 & 루피 대화) ──────────────────────
    def start_listener(self):
        if self.is_polling:
            return
        self.is_polling = True
        try:
            loop = asyncio.get_running_loop()
            self._poll_task = loop.create_task(self._poll_updates_loop())
            logger.info("📡 [Telegram Listener] Two-way Bot Polling started.")
        except RuntimeError:
            logger.warning("[Telegram Listener] No active asyncio loop for polling.")

    def stop_listener(self):
        self.is_polling = False
        if self._poll_task and not self._poll_task.done():
            self._poll_task.cancel()
            logger.info("🛑 [Telegram Listener] Polling stopped.")

    async def _poll_updates_loop(self):
        while self.is_polling:
            try:
                db = SessionLocal()
                settings = crud.get_settings(db)
                token = getattr(settings, "telegram_bot_token", None)
                admin_chat_id = str(getattr(settings, "telegram_chat_id", ""))
                db.close()

                if not token:
                    await asyncio.sleep(10)
                    continue

                url = f"https://api.telegram.org/bot{token}/getUpdates"
                params = {"offset": self._last_update_id + 1, "timeout": 5}

                async with aiohttp.ClientSession() as session:
                    async with session.get(url, params=params, timeout=10) as resp:
                        if resp.status == 200:
                            data = await resp.json()
                            updates = data.get("result", [])
                            for u in updates:
                                self._last_update_id = u["update_id"]
                                await self._handle_incoming_update(u, token, admin_chat_id)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.debug(f"[Telegram Listener] Polling error: {e}")
                await asyncio.sleep(5)

            await asyncio.sleep(2)

    async def _handle_incoming_update(self, update: Dict[str, Any], token: str, admin_chat_id: str):
        # 1. 인라인 버튼 콜백 처리 (Callback Query)
        if "callback_query" in update:
            cb = update["callback_query"]
            data = cb.get("data", "")
            from_user = cb.get("from", {})
            sender_id = str(from_user.get("id", ""))
            
            if admin_chat_id and sender_id != admin_chat_id:
                return

            if data.startswith("reply_approve:"):
                comment_id = data.split(":", 1)[1]
                db = SessionLocal()
                try:
                    from app.services.community_service import CommunityService
                    res = CommunityService.post_reply(db, comment_id)
                    posted_text = res.get('posted_reply', '')
                    self.send_raw(token, admin_chat_id, f"✅ <b>[답글 게시 완료]</b> 댓글(ID: {comment_id})에 AI 맞춤 답글이 공식 등록되었습니다!\n\n등록 답글: \"{posted_text}\"")
                except Exception as ex:
                    self.send_raw(token, admin_chat_id, f"❌ 답글 게시 실패: {str(ex)}")
                finally:
                    db.close()
            return

        # 2. 텍스트 메시지 수신 처리 (Message)
        message = update.get("message", {})
        text = message.get("text", "").strip()
        from_user = message.get("from", {})
        sender_id = str(from_user.get("id", ""))

        if not text:
            return

        # 대표님 Chat ID 검증
        if admin_chat_id and sender_id != admin_chat_id:
            logger.warning(f"[Telegram Security] Unauthorized access attempt from ID: {sender_id}")
            self.send_raw(token, sender_id, "⛔ 인가되지 않은 사용자입니다. ViraLoop Studio 대표님 계정만 명령할 수 있습니다.")
            return

        # 3. 명령어 및 루피 자연어 대화 처리
        await self._process_command(text, token, sender_id)

    async def _process_command(self, text: str, token: str, chat_id: str):
        db = SessionLocal()
        try:
            cmd = text.lower()

            # 1. 자연어 의도(Intent) 분석기 (조사/어미에 영향받지 않고 의도 파악)
            is_report_intent = any(k in cmd for k in ["성과", "실적", "리포트", "수익", "조회수", "현황", "브리핑", "report", "통계"])
            is_comments_intent = any(k in cmd for k in ["댓글", "답글", "소통", "피드백", "comment"])
            is_hook_intent = any(k in cmd for k in ["후킹", "저조", "이탈", "hook", "바이럴", "대박"])

            if cmd in ["/start", "/help", "도움말"]:
                help_msg = (
                    "👋 <b>안녕하세요 대표님! ViraLoop Studio 총괄 사령관 '루피 AI(Loopie)'입니다.</b>\n\n"
                    "모바일에서 언제든지 스튜디오 현황을 확인하고 명령을 내리실 수 있습니다.\n\n"
                    "📌 <b>주요 명령어 & 자연어 예시:</b>\n"
                    "• <code>/report</code> 또는 <b>'오늘의 성과는?'</b>, <b>'실시간 수익 브리핑'</b>\n"
                    "• <code>/comments</code> 또는 <b>'댓글 확인'</b>, <b>'시청자 소통 현황'</b>\n"
                    "• <code>/hook</code> 또는 <b>'저조 영상 분석해줘'</b>, <b>'후킹 진단'</b>\n"
                    "• <b>그 외 질문</b>: 스튜디오 운영, 영상 기획, 알고리즘 전략 등 편하게 말씀해 주시면 루피가 즉각 분석 보고합니다!"
                )
                self.send_raw(token, chat_id, help_msg)
                return

            elif is_report_intent:
                from app.services.analytics_service import AnalyticsService
                data = AnalyticsService.get_channel_analytics(db, time_range="daily")
                summary = data.get("summary", {})
                rev_val = summary.get('estimated_revenue', 0)
                profit_val = summary.get('net_profit', 0)
                rev_str = f"₩{int(rev_val):,}원" if rev_val >= 100 else f"${rev_val:,.1f}"
                profit_str = f"₩{int(profit_val):,}원" if profit_val >= 100 else f"${profit_val:,.1f}"
                
                msg = (
                    f"📊 <b>[루피 AI 실시간 성과 브리핑]</b>\n\n"
                    f"• 👁️ <b>일일 총 조회수:</b> {summary.get('views', 0):,}회\n"
                    f"• ⏱️ <b>시청 시간:</b> {summary.get('watch_time_hours', 0):,}시간\n"
                    f"• 💰 <b>예상 수익:</b> {rev_str}\n"
                    f"• 📈 <b>순이익 (ROI):</b> {profit_str} (<b>+{summary.get('roi_percentage', 0)}%</b>)\n"
                    f"• 👥 <b>구독자 순증:</b> +{summary.get('sub_increase', 0):,}명\n\n"
                    f"💡 <i>현재 모든 채널이 안정적으로 알고리즘 트래픽을 순항 중입니다!</i>"
                )
                self.send_raw(token, chat_id, msg)
                return

            elif is_comments_intent:
                from app.services.community_service import CommunityService
                comments = CommunityService.list_comments(db, is_replied=False, limit=3)
                if not comments:
                    self.send_raw(token, chat_id, "✨ 현재 대기 중인 미처리 댓글이 없습니다! 모든 시청자와 원활히 소통 중입니다.")
                    return

                for c in comments:
                    c_text = c.get('text', '')
                    c_reply = c.get('ai_reply', '')
                    msg = (
                        f"💬 <b>[시청자 댓글]</b>\n"
                        f"• 영상: {c.get('video_title')}\n"
                        f"• 작성자: {c.get('author_name')}\n"
                        f"• 댓글: \"{c_text}\"\n\n"
                        f"🤖 <b>AI 추천 답글:</b>\n\"{c_reply}\""
                    )
                    keyboard = {
                        "inline_keyboard": [[
                            {"text": "✅ 즉시 답글 등록", "callback_data": f"reply_approve:{c['comment_id']}"}
                        ]]
                    }
                    self.send_raw(token, chat_id, msg, reply_markup=keyboard)
                return

            elif is_hook_intent:
                from app.services.analytics_service import AnalyticsService
                data = AnalyticsService.get_channel_analytics(db, time_range="monthly")
                under = data.get("underperforming_videos", [])
                if not under:
                    self.send_raw(token, chat_id, "🎉 현재 저조한 영상 없이 모든 영상이 높은 시청 유지율을 보이고 있습니다!")
                    return
                target = under[0]
                msg = (
                    f"⚠️ <b>[루피 AI 후킹 긴급 진단]</b>\n\n"
                    f"🎬 <b>영상:</b> {target.get('title')}\n"
                    f"📉 <b>초반 3초 유지율:</b> {target.get('retention_rate_3s')}% (위험 구간)\n"
                    f"🎯 <b>후킹 점수:</b> {target.get('hook_score')}점\n\n"
                    f"🔍 <b>이탈 원인 및 보완 가이드:</b>\n"
                    f"{target.get('weakness_feedback')}\n\n"
                    f"💡 <i>다음 대본 작성 시 위 개선점이 자동 반영되도록 프롬프트 가중치를 조정했습니다.</i>"
                )
                self.send_raw(token, chat_id, msg)
                return

            # 2. 일반 자연어 질문 -> DB Settings 단일 진실 공급원(SSOT) 모델 연동
            settings = crud.get_settings(db)
            # [SSOT & 백업 폴백 원칙]: 
            # 1차 주 모델: 대표님 맞춤 모델(script_analysis_model, e.g. viraloop1)
            # 2차 백업 폴백: 텔레그램 모바일 응답성을 위한 default_llm_model (대본 분석 등 핵심 업무는 절대규칙 고수)
            primary_model = getattr(settings, "script_analysis_model", None) or "viraloop1"
            fallback_model = getattr(settings, "default_llm_model", None)

            models_to_try = [primary_model]
            if fallback_model and fallback_model != primary_model:
                models_to_try.append(fallback_model)

            llm_client = LLMClient(settings)

            # 실시간 스튜디오 컨텍스트 수집 (루피 AI의 정확한 상황 인지를 위한 데이터 주입)
            channel_count = db.query(models.BrandChannel).count()
            queue_count = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.status == 'pending').count()
            latest_report = db.query(models.DailyReport).order_by(models.DailyReport.id.desc()).first()
            summary_snippet = (latest_report.summary_markdown[:200] if latest_report and latest_report.summary_markdown else "정상 가동 중")

            system_instruction = (
                "당신은 유튜브 팩토리 시스템 ViraLoop Studio의 총괄 사령관 '루피 AI(Loopie)'입니다. "
                "대표님(user)께 모바일 텔레그램을 통해 보고와 자문을 드리는 최고 운영 사령관입니다.\n"
                "절대 원칙:\n"
                "1. 당신은 오직 '루피 AI'로서만 행동하며, 절대 다른 외부 AI 모델(예: MiMo, Llama, Claude, GPT 등)이나 시스템의 역할을 칭하지 마십시오.\n"
                "2. 대표님에 대한 극진한 예우와 함께, 데이터와 실행에 기반한 듬직하고 전문적인 비즈니스 톤을 일관되게 유지하십시오.\n"
                "3. 모바일에서 한눈에 읽기 편하도록 3~5문장 내외로 명확하고 핵심적으로 답변하십시오."
            )

            prompt = f"""
[스튜디오 실시간 운영 현황 컨텍스트]
- 가동 중인 브랜드 채널: {channel_count}개
- 발행 대기 큐: {queue_count}개
- 최근 일일 리포트 요약: {summary_snippet}

[대표님 메시지]
"{text}"

위 대표님의 메시지에 대해 루피 AI 총괄 사령관으로서 성심성의껏 전문적인 보고 및 답변을 작성하십시오.
"""
            answer = None
            last_err = None
            for model_candidate in models_to_try:
                try:
                    res = llm_client.generate_content(
                        prompt=prompt,
                        model_name=model_candidate,
                        system_instruction=system_instruction
                    )
                    clean_res = res.strip() if isinstance(res, str) else ""
                    if clean_res and not clean_res.startswith("ERROR:"):
                        answer = clean_res
                        break
                    else:
                        last_err = clean_res
                except Exception as e:
                    last_err = str(e)
                    logger.warning(f"[Telegram Bot] Model [{model_candidate}] failed: {e}. Trying fallback if available...")
                    continue

            if not answer:
                answer = f"대표님, 요청하신 내용을 접수하였습니다. 현재 스튜디오 관제 시스템을 점검 중이며 최적의 방안을 모색하여 즉시 보고드리겠습니다. (상세: {last_err})"

            self.send_raw(token, chat_id, f"🤖 <b>[루피 COO]</b>\n\n{answer}")

        finally:
            db.close()

telegram_service = TelegramService()
