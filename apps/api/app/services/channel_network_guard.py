import logging
from typing import Optional, Dict, Any, Tuple, List
from sqlalchemy.orm import Session
from app import models
from app.services.adb_service import adb_service

logger = logging.getLogger(__name__)

import time

# 직전 작업 채널 ID 캐시 및 회전 쿨다운 (글로벌 싱글톤)
_LAST_ACTIVE_CHANNEL: Optional[str] = None
_LAST_ROTATION_TIME: float = 0.0
_ROTATION_COOLDOWN_SEC: float = 45.0

class ChannelNetworkGuard:
    """
    ViraLoop Studio 채널별 보안 네트워크 가드:
    - 채널 프로필(Profile)의 proxy_mode를 단일 진실 공급원(SSOT)으로 존중
    - ISP_PROXY (고정 프록시): IP 로테이션 절대 금지 + 전용 고정 프록시 바인딩
    - DIRECT_LTE (LTE 모바일): 채널 변경 시 소프트 IP 교체(adb_service.rotate_ip) + 통신사 모바일 프록시 바인딩
    - DIRECT (로컬): 직결
    """

    @staticmethod
    def resolve_channel_profile(db: Session, channel_id: str) -> Optional[models.Profile]:
        """
        channel_id에 매핑된 Profile(TIN_CAN/Captain) 조회
        """
        if not channel_id or channel_id == "all":
            return None

        # 1. Profile.channel_id 매핑 확인
        profile = db.query(models.Profile).filter(models.Profile.channel_id == channel_id).first()
        if profile:
            return profile

        # 2. BrandChannel을 통한 역추적
        brand = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id).first()
        if brand and hasattr(brand, "profile_id") and brand.profile_id:
            return db.query(models.Profile).filter(models.Profile.id == brand.profile_id).first()

        # 3. 기본 프로필 fallback
        return db.query(models.Profile).first()

    @classmethod
    def prepare_network_context(
        cls,
        db: Session,
        channel_id: Optional[str]
    ) -> Dict[str, Any]:
        """
        채널 작업 진입 전 보안 네트워크 환경을 확립하고 프록시 딕셔너리를 반환
        """
        global _LAST_ACTIVE_CHANNEL

        if not channel_id or channel_id == "all":
            return {"mode": "DIRECT", "proxies": None, "rotated": False}

        profile = cls.resolve_channel_profile(db, channel_id)
        if not profile:
            logger.info(f"[NetworkGuard] 채널 {channel_id}에 매핑된 프로필 없음 ➔ 기본 로컬 접속")
            return {"mode": "DIRECT", "proxies": None, "rotated": False}

        proxy_mode = getattr(profile, "proxy_mode", "DIRECT_LTE") or "DIRECT_LTE"
        logger.info(f"🛡️ [NetworkGuard] 채널 [{channel_id}] 보안 모드: {proxy_mode}")

        # ── CASE 1: ISP_PROXY (고정 IP 채널) ──────────────────────────
        if proxy_mode == "ISP_PROXY":
            host = getattr(profile, "proxy_host", None)
            port = getattr(profile, "proxy_port", 1080)
            user = getattr(profile, "proxy_username", None)
            pwd = getattr(profile, "proxy_password", None)
            proto = getattr(profile, "proxy_protocol", "socks5") or "socks5"

            if host:
                auth = f"{user}:{pwd}@" if (user and pwd) else ""
                proxy_url = f"{proto}://{auth}{host}:{port}"
                logger.info(f"🔒 [NetworkGuard] 채널 [{channel_id}] 고정 ISP 프록시 바인딩 (IP 로테이션 생략): {proto}://{host}:{port}")
                _LAST_ACTIVE_CHANNEL = channel_id
                return {
                    "mode": "ISP_PROXY",
                    "proxies": {"http": proxy_url, "https": proxy_url},
                    "rotated": False,
                    "proxy_url": proxy_url
                }

        # ── CASE 2: DIRECT_LTE / NETSHARE (LTE 모바일 로테이션 채널) ──
        elif proxy_mode in ["DIRECT_LTE", "NETSHARE"]:
            global _LAST_ROTATION_TIME
            rotated = False

            # 1. 쇼츠 대용량 업로드 진행 중 충돌 방지: NativeQueueWorker의 profile_busy 상태 확인
            is_upload_in_progress = False
            try:
                from app.services.native_queue_worker import native_worker
                with native_worker.profile_lock:
                    if bool(native_worker.profile_busy):
                        is_upload_in_progress = True
            except Exception:
                pass

            now = time.time()
            if is_upload_in_progress:
                logger.warning(f"🛡️ [NetworkGuard] 쇼츠 대용량 업로드 작업 진행 중! LTE 회선 단선 방지를 위해 IP 교체를 안전하게 생략합니다.")
                _LAST_ACTIVE_CHANNEL = channel_id
            elif (now - _LAST_ROTATION_TIME) < _ROTATION_COOLDOWN_SEC:
                logger.info(f"⏳ [NetworkGuard] 최근 IP 교체 쿨다운 활성 ({int(now - _LAST_ROTATION_TIME)}s < {_ROTATION_COOLDOWN_SEC}s). IP 로테이션 스킵")
                _LAST_ACTIVE_CHANNEL = channel_id
            elif _LAST_ACTIVE_CHANNEL != channel_id:
                logger.info(f"⚡ [NetworkGuard] 채널 전환 감지 ({_LAST_ACTIVE_CHANNEL} -> {channel_id}). LTE 소프트 IP 교체 중...")
                try:
                    adb_service.rotate_ip(method='soft')
                    rotated = True
                    _LAST_ROTATION_TIME = now
                except Exception as e:
                    logger.warning(f"[NetworkGuard] LTE 소프트 교체 경고: {e}")
                _LAST_ACTIVE_CHANNEL = channel_id

            # 로컬 Every Proxy SOCKS5/HTTP 포트 매핑 (기본 1080)
            lte_proxy_url = "socks5://127.0.0.1:1080"
            return {
                "mode": "DIRECT_LTE",
                "proxies": {"http": lte_proxy_url, "https": lte_proxy_url},
                "rotated": rotated,
                "proxy_url": lte_proxy_url
            }

        # ── CASE 3: DIRECT (로컬 직결 채널) ────────────────────────────
        _LAST_ACTIVE_CHANNEL = channel_id
        return {"mode": "DIRECT", "proxies": None, "rotated": False}

    @classmethod
    def get_channel_security_summary(cls, db: Session, channel_id: Optional[str]) -> Dict[str, Any]:
        """
        프론트엔드 UI 뱃지 및 메타데이터용 보안 정보 반환
        """
        if not channel_id or channel_id == "all":
            return {
                "channel_id": "all",
                "proxy_mode": "ALL",
                "label": "전체 채널 통합",
                "badge_type": "all",
                "description": "다채널 통합 집계 (개별 채널 작업 시 해당 보안 프로필 적용)"
            }

        profile = cls.resolve_channel_profile(db, channel_id)
        if not profile:
            return {
                "channel_id": channel_id,
                "proxy_mode": "DIRECT",
                "label": "로컬 직결",
                "badge_type": "direct",
                "description": "프록시 없음 (로컬 IP 직결)"
            }

        proxy_mode = getattr(profile, "proxy_mode", "DIRECT_LTE") or "DIRECT_LTE"
        if proxy_mode == "ISP_PROXY":
            host = getattr(profile, "proxy_host", "") or "미지정"
            port = getattr(profile, "proxy_port", 1080)
            return {
                "channel_id": channel_id,
                "proxy_mode": "ISP_PROXY",
                "label": f"🔒 고정 ISP ({host}:{port})",
                "badge_type": "isp_proxy",
                "host": host,
                "port": port,
                "is_static": True,
                "description": "지정된 고정 IP 프록시 전용 통신 (IP 로테이션 금지)"
            }
        elif proxy_mode in ["DIRECT_LTE", "NETSHARE"]:
            return {
                "channel_id": channel_id,
                "proxy_mode": proxy_mode,
                "label": "⚡ LTE 모바일 (소프트 IP 자동 교체)",
                "badge_type": "lte_proxy",
                "is_static": False,
                "description": "채널 전환 시 LTE 비행기모드 소프트 교체로 통신사 IP 자동 갱신"
            }
        else:
            return {
                "channel_id": channel_id,
                "proxy_mode": "DIRECT",
                "label": "🌐 로컬 직결",
                "badge_type": "direct",
                "is_static": False,
                "description": "프록시 미사용 직결 접속"
            }

    @classmethod
    def get_ytdlp_proxy_args(cls, db: Session, channel_id: Optional[str]) -> List[str]:
        """
        yt-dlp 실행 시 보안 프록시 인자 반환
        """
        ctx = cls.prepare_network_context(db, channel_id)
        proxy_url = ctx.get("proxy_url")
        if proxy_url:
            return ["--proxy", proxy_url]
        return []

    @classmethod
    def get_cloak_proxy_config(cls, db: Session, channel_id: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        CloakBrowser 프로필 생성 시 필요한 프록시 설정 반환
        """
        profile = cls.resolve_channel_profile(db, channel_id)
        if not profile:
            return None
        proxy_mode = getattr(profile, "proxy_mode", "DIRECT_LTE")
        if proxy_mode == "ISP_PROXY":
            return {
                "proxy_type": getattr(profile, "proxy_protocol", "socks5") or "socks5",
                "proxy_host": getattr(profile, "proxy_host", ""),
                "proxy_port": getattr(profile, "proxy_port", 1080),
                "proxy_user": getattr(profile, "proxy_username", ""),
                "proxy_pass": getattr(profile, "proxy_password", "")
            }
        elif proxy_mode in ["DIRECT_LTE", "NETSHARE"]:
            return {
                "proxy_type": "socks5",
                "proxy_host": "127.0.0.1",
                "proxy_port": 1080,
                "proxy_user": "",
                "proxy_pass": ""
            }
        return None

channel_network_guard = ChannelNetworkGuard()

