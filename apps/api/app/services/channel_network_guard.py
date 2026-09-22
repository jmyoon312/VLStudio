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
        if brand:
            if getattr(brand, "owner_profile", None):
                return brand.owner_profile
            if getattr(brand, "owner_profile_id", None):
                p = db.query(models.Profile).filter(models.Profile.id == brand.owner_profile_id).first()
                if p:
                    return p
            if getattr(brand, "profile_id", None):
                p = db.query(models.Profile).filter(models.Profile.id == brand.profile_id).first()
                if p:
                    return p

        # 3. YouTubeChannel을 통한 역추적
        yt_ch = db.query(models.YouTubeChannel).filter(models.YouTubeChannel.channel_id == channel_id).first()
        if yt_ch and getattr(yt_ch, "owner_profile_id", None):
            p = db.query(models.Profile).filter(models.Profile.id == yt_ch.owner_profile_id).first()
            if p:
                return p

        # 4. 기본 프로필 fallback
        return db.query(models.Profile).first()

    @classmethod
    def prepare_network_context(
        cls,
        db: Session,
        channel_id: Optional[str],
        force_rotation: bool = False
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
        logger.info(f"🛡️ [NetworkGuard] 채널 [{channel_id}] 보안 모드: {proxy_mode} (force_rotation={force_rotation})")

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

            # 2. 대표님 수동 보안 접속(Interactive Session) 활성 확인 -> 회선 및 소켓 보호
            is_interactive_active = False
            try:
                from app.services.stealth_ops_v2 import is_user_interactive_active, get_active_interactive_profile_ids
                if profile and is_user_interactive_active(profile.id):
                    is_interactive_active = True
                elif is_user_interactive_active(channel_id):
                    is_interactive_active = True
                else:
                    # 동일 기기(bound_device_serial)를 공유하는 다른 프로필이 수동 접속 중인지 검사
                    target_serial = getattr(profile, "bound_device_serial", None)
                    if target_serial:
                        active_pids = get_active_interactive_profile_ids()
                        for apid in active_pids:
                            act_prof = db.query(models.Profile).filter(models.Profile.id == apid).first()
                            if act_prof and getattr(act_prof, "bound_device_serial", None) == target_serial:
                                is_interactive_active = True
                                logger.info(f"👑 [NetworkGuard] 기기 [{target_serial}]를 공유하는 프로필 [{apid}]이 수동 보안 접속 중입니다.")
                                break
            except Exception as check_e:
                logger.debug(f"[NetworkGuard] Interactive session check soft warning: {check_e}")

            now = time.time()
            if is_upload_in_progress:
                logger.warning(f"🛡️ [NetworkGuard] 쇼츠 대용량 업로드 작업 진행 중! LTE 회선 단선 방지를 위해 IP 교체를 안전하게 생략합니다.")
                _LAST_ACTIVE_CHANNEL = channel_id
            elif is_interactive_active:
                logger.info(f"👑 [NetworkGuard] 수동 보안 접속(Interactive Session) 활성 중! 회선 연결 유지 및 소켓 보호를 위해 LTE IP 교체를 안전하게 생략합니다.")
                _LAST_ACTIVE_CHANNEL = channel_id
            elif force_rotation or _LAST_ACTIVE_CHANNEL != channel_id or (now - _LAST_ROTATION_TIME) >= _ROTATION_COOLDOWN_SEC:
                logger.info(f"⚡ [NetworkGuard] 업로드 전 LTE 소프트 IP 교체 실행 (force={force_rotation}, channel={channel_id})...")
                try:
                    target_serial = getattr(profile, "bound_device_serial", None)
                    adb_service.rotate_ip(serial=target_serial, method='soft')
                    rotated = True
                    _LAST_ROTATION_TIME = now
                except Exception as e:
                    logger.warning(f"[NetworkGuard] LTE 소프트 교체 경고: {e}")
                _LAST_ACTIVE_CHANNEL = channel_id
            else:
                logger.info(f"⏳ [NetworkGuard] 최근 IP 교체 쿨다운 활성 ({int(now - _LAST_ROTATION_TIME)}s < {_ROTATION_COOLDOWN_SEC}s). IP 로테이션 스킵")
                _LAST_ACTIVE_CHANNEL = channel_id

            # 로컬 Every Proxy SOCKS5 매핑 (socks5h:// 사용하여 DNS 누출 원천 방지)
            port = getattr(profile, "proxy_port", None) or adb_service.get_device_port(getattr(profile, "bound_device_serial", None))
            adb_service.ensure_every_proxy_socks_active(getattr(profile, "bound_device_serial", None))
            lte_proxy_url = f"socks5h://127.0.0.1:{port}"
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
            port = getattr(profile, "proxy_port", None) or adb_service.get_device_port(getattr(profile, "bound_device_serial", None))
            serial = getattr(profile, "bound_device_serial", None)
            serial_label = f" (Port {port})" if port else ""
            return {
                "channel_id": channel_id,
                "proxy_mode": proxy_mode,
                "label": f"⚡ LTE 모바일{serial_label}",
                "badge_type": "lte_proxy",
                "is_static": False,
                "port": port,
                "bound_device_serial": serial,
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

