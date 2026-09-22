
import os
import json
import logging
import asyncio
from typing import Optional
from sqlalchemy.orm import Session
from datetime import datetime

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

from app import models
from app.services.credential_manager import CredentialManager, encrypt_token, decrypt_token
from app.services.adb_service import adb_service
from app.services.upload_priority import (
    get_upload_priority_manager, 
    UploadMethod,
    UploadPriorityManager
)

logger = logging.getLogger(__name__)


class YouTubeAPIError(Exception):
    """Custom exception for YouTube API errors"""
    def __init__(self, message: str, error_code: str = None, retryable: bool = True):
        super().__init__(message)
        self.error_code = error_code
        self.retryable = retryable


class YouTubeUploader:
    
    @staticmethod
    def upload_video(db: Session, item_id: int, force_ip_rotation: bool = True):
        """
        Orchestrates the Stealth Upload Logic for WorkQueueItems:
        1. Config Check
        2. Auth Resolution (TinCan)
        3. Stealth Guard (IP Check & Rotation)
        4. Upload
        """
        item = db.query(models.WorkQueueItem).filter(models.WorkQueueItem.id == item_id).first()
        if not item:
            logger.error(f"WorkQueueItem {item_id} not found.")
            return

        try:
            # --- 1. Validation ---
            if not item.video_file_path or not os.path.exists(item.video_file_path):
                raise Exception("File missing")
                
            # Resolve Channel ID from Platform Configs
            # WorkQueueItem stores channel_id in platform_configs['youtube']['channel_id']
            yt_config = item.platform_configs.get('youtube', {})
            channel_id = yt_config.get('channel_id')
            
            if not channel_id:
                raise Exception("No YouTube Channel ID specified in platform configs")

            # Find BrandChannel
            brand_channel = db.query(models.BrandChannel).filter(models.BrandChannel.channel_id == channel_id).first()
            if not brand_channel:
                 # If using API upload, we MUST have a BrandChannel record (Authorized)
                 raise Exception(f"Brand Channel {channel_id} not found in database")
                 
            tin_can = getattr(brand_channel, 'owner_profile', None)
            if not tin_can and hasattr(brand_channel, 'owner_profile_id') and brand_channel.owner_profile_id:
                tin_can = db.query(models.Profile).filter(models.Profile.id == brand_channel.owner_profile_id).first()
            if not tin_can:
                tin_can = getattr(brand_channel, 'tin_can_account', None)
            if not tin_can:
                raise Exception("No Profile/TinCan Owner assigned to this Brand Channel")
                
            if tin_can.status != "ACTIVE":
                raise Exception(f"TinCan Account is {tin_can.status}")

            # [DEATH_VALLEY Blocker] Uploads are strictly forbidden in this recovery mode
            if hasattr(brand_channel, 'youtube_channel') and brand_channel.youtube_channel and getattr(brand_channel.youtube_channel, 'cultivation_strategy', None) == "DEATH_VALLEY":
                raise Exception("Uploads are blocked during Death Valley recovery. The channel is in pure viewer mode.")

            # --- 2 & 3. Channel Network Guard & Stealth Proxy Binding (SSOT) ---
            # 브라우저 자동화 및 보안 접속과 100% 동일한 통합 네트워크 거버넌스 적용 (핸드폰 LTE Every Proxy SOCKS5 또는 ISP 고정 프록시)
            from app.services.channel_network_guard import ChannelNetworkGuard
            from urllib.parse import urlparse
            import socks
            import httplib2
            import google_auth_httplib2

            net_ctx = ChannelNetworkGuard.prepare_network_context(db, channel_id, force_rotation=force_ip_rotation)
            proxy_url = net_ctx.get("proxy_url")
            proxy_mode = net_ctx.get("mode", "DIRECT")
            logger.info(f"🛡️ [YouTubeUploader] ChannelNetworkGuard applied: mode={proxy_mode}, proxy_url={proxy_url}, rotated={net_ctx.get('rotated')}")

            creds = CredentialManager.get_credentials(db, brand_channel.id)

            if proxy_url:
                p = urlparse(proxy_url)
                scheme = (p.scheme or '').lower()
                port = p.port or 1080
                host = p.hostname or '127.0.0.1'
                user = p.username
                pwd = p.password

                if scheme in ['socks5', 'socks5h']:
                    ptype = socks.PROXY_TYPE_SOCKS5
                elif scheme in ['socks4', 'socks4a']:
                    ptype = socks.PROXY_TYPE_SOCKS4
                else:
                    ptype = socks.PROXY_TYPE_HTTP

                proxy_info = httplib2.ProxyInfo(
                    proxy_type=ptype,
                    proxy_host=host,
                    proxy_port=int(port),
                    proxy_user=user,
                    proxy_pass=pwd,
                    proxy_rdns=True
                )
                logger.info(f"🔒 [Stealth Shield] Binding YouTube API traffic to SOCKS5/Proxy ({scheme}://{host}:{port})")
                bound_http = httplib2.Http(proxy_info=proxy_info, timeout=600)
                authorized_http = google_auth_httplib2.AuthorizedHttp(creds, http=bound_http)
                service = build("youtube", "v3", http=authorized_http, cache_discovery=False)
            else:
                logger.info("Using Direct/Local Network for Google Data API connection (DIRECT mode).")
                service = build("youtube", "v3", credentials=creds, cache_discovery=False)

            # --- 4. Metadata Preparation (NEW LOGIC) ---
            privacy = yt_config.get('privacy', 'private')
            scheduled_time = yt_config.get('scheduled_time') or getattr(item, 'scheduled_upload_time', None)

            # Determine privacyStatus and publishAt
            status_dict = {
                'selfDeclaredMadeForKids': yt_config.get('made_for_kids', False)
            }

            # File size in MB for dynamic aging calculation
            file_mb = 15.0
            try:
                if item.video_file_path and os.path.exists(item.video_file_path):
                    file_mb = os.path.getsize(item.video_file_path) / (1024 * 1024)
            except Exception:
                pass

            from datetime import datetime, timedelta

            if privacy in ['scheduled', 'SCHEDULED'] and scheduled_time:
                # [Custom Scheduled Upload]
                status_dict['privacyStatus'] = 'private'
                try:
                    if isinstance(scheduled_time, str):
                        clean_time = scheduled_time.replace(' ', 'T')
                        if not clean_time.endswith('Z') and '+' not in clean_time:
                            clean_time += 'Z'
                        dt = datetime.fromisoformat(clean_time.replace('Z', '+00:00'))
                        status_dict['publishAt'] = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                    elif isinstance(scheduled_time, datetime):
                        status_dict['publishAt'] = scheduled_time.strftime('%Y-%m-%dT%H:%M:%SZ')
                    logger.info(f"[YouTubeUploader] Custom Scheduled publishAt: {status_dict.get('publishAt')}")
                except Exception as ex:
                    logger.warning(f"[YouTubeUploader] Failed to parse scheduled_time ({scheduled_time}): {ex}")
            elif privacy == 'smart_scheduled':
                # [대안 B: 지능형 용량 기반 자동 숙성 예약]
                # 1MB당 ~0.15분 가산, 최소 15분, 최대 30분
                aging_mins = min(max(15, int(file_mb * 0.15) + 12), 30)
                target_dt = datetime.utcnow() + timedelta(minutes=aging_mins)
                status_dict['privacyStatus'] = 'private'
                status_dict['publishAt'] = target_dt.strftime('%Y-%m-%dT%H:%M:%SZ')
                logger.info(f"[YouTubeUploader] Smart Aging Schedule applied: {file_mb:.1f}MB -> publishAt {target_dt.isoformat()}Z (+{aging_mins}min)")
            elif privacy == 'public':
                # [대안 A: 하이브리드 공개 전략]
                # 1단계로 비공개 업로드 후 VERIFYING 큐로 이송하여 브라우저 워커가 자동 공개 전환
                status_dict['privacyStatus'] = 'private'
                logger.info("[YouTubeUploader] Hybrid strategy active: uploading as private, routing to VERIFYING for browser public switch.")
            else:
                status_dict['privacyStatus'] = privacy if privacy in ['private', 'unlisted'] else 'private'

            # Construct Description
            description = item.description or ""
            raw_hashtags = getattr(item, 'hashtags', None)
            hashtags_list = []
            if isinstance(raw_hashtags, list):
                hashtags_list = raw_hashtags
            elif isinstance(raw_hashtags, str) and raw_hashtags.strip():
                try:
                    parsed = json.loads(raw_hashtags)
                    if isinstance(parsed, list):
                        hashtags_list = parsed
                    else:
                        hashtags_list = [raw_hashtags]
                except Exception:
                    import ast
                    try:
                        parsed = ast.literal_eval(raw_hashtags)
                        if isinstance(parsed, list):
                            hashtags_list = parsed
                        else:
                            hashtags_list = [raw_hashtags]
                    except Exception:
                        hashtags_list = [raw_hashtags]

            if hashtags_list:
                joined_hashtags = " ".join(str(h) for h in hashtags_list if h)
                if joined_hashtags:
                    description = f"{description}\n\n{joined_hashtags}".strip()

            # Prepare Tags
            raw_tags = getattr(item, 'tags', None)
            final_tags = []
            if isinstance(raw_tags, list):
                final_tags = list(raw_tags)
            elif isinstance(raw_tags, str) and raw_tags.strip():
                try:
                    parsed = json.loads(raw_tags)
                    if isinstance(parsed, list):
                        final_tags = list(parsed)
                    else:
                        final_tags = [raw_tags]
                except Exception:
                    import ast
                    try:
                        parsed = ast.literal_eval(raw_tags)
                        if isinstance(parsed, list):
                            final_tags = list(parsed)
                        else:
                            final_tags = [raw_tags]
                    except Exception:
                        final_tags = [raw_tags]

            if getattr(brand_channel, 'default_tags', None):
                try:
                    defaults = json.loads(brand_channel.default_tags) if isinstance(brand_channel.default_tags, str) else brand_channel.default_tags
                    if isinstance(defaults, list):
                        final_tags = list(dict.fromkeys(final_tags + defaults))
                except Exception:
                    pass

            # --- [Shorts Algorithm Optimization] Ensure #Shorts in Description ---
            if '#Shorts' not in description and '#shorts' not in description:
                description = f"{description}\n\n#Shorts".strip()

            body = {
                'snippet': {
                    'title': item.title[:100], 
                    'description': description,
                    'tags': final_tags,
                    'categoryId': yt_config.get('category', '22')
                },
                'status': status_dict
            }

            # --- [Algorithm Optimization] Auto-detect or Apply Language Codes ---
            lang_code = yt_config.get('language') or getattr(brand_channel, 'default_language', None)
            if not lang_code and item.title:
                import re
                has_jp = bool(re.search(r'[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]', item.title))
                has_ko = bool(re.search(r'[\uAC00-\uD7AF\u1100-\u11FF]', item.title))
                if has_jp and not has_ko:
                    lang_code = 'ja'
                elif has_ko:
                    lang_code = 'ko'

            if lang_code:
                body['snippet']['defaultLanguage'] = lang_code
                body['snippet']['defaultAudioLanguage'] = lang_code
                logger.info(f"🌐 [YouTubeUploader] Language tags applied: {lang_code}")

            # --- 4.5. Channel Mismatch Interlock Guard ---
            # 구글 API 토큰의 실제 채널과 작업 카드의 목표 채널 ID가 일치하는지 전수 검증
            try:
                ch_check = service.channels().list(mine=True, part='id,snippet').execute()
                items = ch_check.get('items', [])
                if items:
                    token_ch_id = items[0]['id']
                    token_ch_title = items[0]['snippet']['title']
                    if token_ch_id != channel_id:
                        err_msg = (
                            f"🚨 [YouTube API 채널 불일치 차단] 현재 구글 OAuth 토큰의 채널({token_ch_title}, ID: {token_ch_id})이 "
                            f"업로드 대상 브랜드 채널({brand_channel.title}, ID: {channel_id})과 일치하지 않습니다! "
                            f"엉뚱한 채널로 영상이 잘못 업로드되는 것을 방지하기 위해 업로드를 즉시 중단했습니다. "
                            f"프로필 관리에서 Google API 재인증 시 계정 목록에서 반드시 '{brand_channel.title}' 브랜드 계정을 선택해 주세요."
                        )
                        logger.error(err_msg)
                        item.status = "FAILED"
                        item.last_error = err_msg
                        db.commit()
                        raise YouTubeAPIError(err_msg, error_code="CHANNEL_MISMATCH", retryable=False)
                    else:
                        logger.info(f"✅ [Channel Guard] Verified YouTube OAuth channel match: {token_ch_title} ({token_ch_id})")
            except YouTubeAPIError:
                raise
            except Exception as ch_verify_err:
                logger.warning(f"[YouTubeUploader] Pre-upload channel check warning: {ch_verify_err}")

            # --- 5. Upload Execution ---
            logger.info(f"Starting Upload for {item.title}...")
            item.status = "UPLOADING"
            item.upload_progress = 0
            db.commit()

            media_body = MediaFileUpload(item.video_file_path, chunksize=-1, resumable=True)
            request = service.videos().insert(part='snippet,status', body=body, media_body=media_body)
            
            # Execute upload
            response = request.execute()

            # --- 6. Success Handling ---
            item.upload_progress = 100
            item.upload_completed_at = datetime.utcnow()
            
            # Save Uploaded URL
            vid_id = response.get("id")
            if vid_id:
                urls = item.uploaded_urls or {}
                urls['youtube'] = f"https://youtu.be/{vid_id}"
                item.uploaded_urls = urls

                # --- 6.1. Shorts Hook Custom Thumbnail Auto-Upload (API) ---
                try:
                    from app.services.browser_uploader import extract_shorts_thumbnail
                    thumb_file = extract_shorts_thumbnail(item.video_file_path, getattr(item, 'thumbnail_path', None))
                    if thumb_file and os.path.exists(thumb_file):
                        logger.info(f"📸 [YouTubeUploader] Setting Shorts hook thumbnail via API for {vid_id}: {thumb_file}")
                        thumb_media = MediaFileUpload(thumb_file, mimetype='image/jpeg')
                        service.thumbnails().set(videoId=vid_id, media_body=thumb_media).execute()
                        logger.info(f"✅ [YouTubeUploader] Custom thumbnail uploaded successfully via API for video {vid_id}")
                except Exception as thumb_err:
                    # Note: Unverified channels will return 403 for thumbnails; this is non-fatal for video upload
                    logger.warning(f"⚠️ [YouTubeUploader] Thumbnail upload skipped/warning (channel verification required for API custom thumbs): {thumb_err}")
            
            # Record successful upload
            priority_manager = get_upload_priority_manager()
            channel_id = yt_config.get('channel_id')
            if channel_id:
                priority_manager.record_attempt(
                    channel_id=channel_id,
                    method=UploadMethod.API,
                    success=True
                )

            # If target was PUBLIC without publishAt, route to VERIFYING for verification worker (대안 A)
            if privacy == 'public' and 'publishAt' not in status_dict:
                item.status = "VERIFYING"
                logger.info(f"[HYBRID] API Upload complete as private (ID: {vid_id}). Routed to VERIFYING queue for browser review & auto-publish.")
            else:
                item.status = "COMPLETED"
                logger.info(f"Upload Success! ID: {vid_id} (Status: {item.status}, Privacy: {status_dict.get('privacyStatus')}, publishAt: {status_dict.get('publishAt')})")

            db.commit()

        except HttpError as e:
            logger.error(f"Google API Error: {e}")
            
            # Parse error details
            error_details = e.error_details() if hasattr(e, 'error_details') else {}
            error_reason = error_details.get('error', {}).get('errors', [{}])[0].get('reason', 'unknown')
            
            # Determine if retryable
            retryable_errors = ['quotaExceeded', 'rateLimitExceeded', 'serviceUnavailable', 'backendError']
            is_retryable = error_reason in retryable_errors
            
            # Record attempt
            priority_manager = get_upload_priority_manager()
            channel_id = yt_config.get('channel_id')
            if channel_id:
                priority_manager.record_attempt(
                    channel_id=channel_id,
                    method=UploadMethod.API,
                    success=False,
                    error=f"{error_reason}: {str(e)}"
                )
                
                # Check if should fall back to browser
                if is_retryable:
                    fallback = priority_manager.get_fallback_method(UploadMethod.API, e)
                    if fallback == UploadMethod.BROWSER_AUTO:
                        logger.warning(f"📤 API failed with {error_reason}, recommending browser fallback")
            
            item.status = "FAILED"
            item.failure_reason = f"API Error ({error_reason}): {str(e)}"
            db.commit()
            
            raise YouTubeAPIError(str(e), error_code=error_reason, retryable=is_retryable)
            
        except Exception as e:
            logger.error(f"Upload Logic Error: {e}")
            item.status = "FAILED"
            item.failure_reason = str(e)
            db.commit()
            
            # Record non-retryable error
            priority_manager = get_upload_priority_manager()
            channel_id = yt_config.get('channel_id')
            if channel_id:
                priority_manager.record_attempt(
                    channel_id=channel_id,
                    method=UploadMethod.API,
                    success=False,
                    error=str(e)
                )
            
            raise

youtube_uploader = YouTubeUploader()
