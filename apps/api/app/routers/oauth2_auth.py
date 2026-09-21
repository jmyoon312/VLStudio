"""
OAuth2 Authentication Endpoints
Handles Google OAuth2 authentication flow for YouTube API access
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session
import os
import json
import logging
import os
import subprocess
from pydantic import BaseModel
from urllib.parse import urlencode, urlparse, parse_qs
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials

from app.database import get_db
from app.models import Profile

logger = logging.getLogger(__name__)

router = APIRouter()

# OAuth2 configuration
SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
    'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'openid'
]

REDIRECT_URI = "http://127.0.0.1:8000/api/oauth2/callback"


def _get_redirect_uri(request_url: str = None) -> str:
    if not request_url:
        return REDIRECT_URI
    from urllib.parse import urlparse
    parsed = urlparse(request_url)
    scheme = parsed.scheme or "http"
    host = parsed.netloc or "127.0.0.1:8000"
    return f"{scheme}://{host}/api/oauth2/callback"


def _launch_browser_for_oauth(profile: Profile, auth_url: str, db: Session) -> bool:
    """
    [핵심 보안 원칙]
    해당 계정의 격리된 스텔스 브라우저(CloakBrowser) 환경으로 구글 OAuth 승인 창 실행.
    일반 브라우저가 뜨지 않도록 프로필의 독립 폴더와 바인딩된 프록시 환경에서 완벽 격리 구동.
    """
    try:
        from app.services.stealth_ops_v2 import stealth_ops
        logger.info(f"🛡️ [OAuth-Stealth] Launching isolated CloakBrowser for profile {profile.id} ({profile.email})")
        success = stealth_ops.launch_for_setup(
            profile_id=profile.id,
            email=None,     # OAuth 승인 창은 로그인 창이 아니므로 자격증명 자동입력 루프를 타지 않도록 None 전달 (DOM 프리징 방지)
            password=None,
            skip_proxy_check=False,  # 프로필에 설정된 프록시/LTE 네트워크 환경 100% 유지
            db=db,
            target_url=auth_url
        )
        if success:
            logger.info(f"✅ Isolated CloakBrowser successfully opened with OAuth URL for {profile.id}")
            return True
        else:
            logger.error(f"❌ Failed to launch isolated CloakBrowser for profile {profile.id}")
            return False
    except Exception as e:
        logger.error(f"❌ Error launching isolated CloakBrowser for OAuth: {e}", exc_info=True)
        return False


@router.get("/oauth2/authorize/{profile_id}")
async def start_oauth2_flow(profile_id: str, db: Session = Depends(get_db)):
    """
    Start OAuth2 authentication flow
    """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    if not profile.client_secret_json:
        raise HTTPException(400, "No client_secret.json uploaded for this profile")
    
    try:
        client_config = json.loads(profile.client_secret_json)
        
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        state_data = json.dumps({"profile_id": profile_id})
        
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            prompt='consent',
            state=state_data
        )
        
        logger.info(f"Starting OAuth2 flow for profile {profile_id}")
        return RedirectResponse(url=authorization_url)
        
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid client_secret.json format")
    except Exception as e:
        logger.error(f"Failed to start OAuth2 flow: {e}")
        raise HTTPException(500, f"Failed to start OAuth2 flow: {str(e)}")


@router.get("/oauth2/callback", response_class=HTMLResponse)
async def oauth2_callback(code: str, state: str = None, db: Session = Depends(get_db)):
    """
    OAuth2 callback endpoint
    """
    try:
        profile_id = None
        if state:
            try:
                state_json = json.loads(state)
                profile_id = state_json.get("profile_id")
            except Exception:
                pass
        
        if profile_id:
            profile = db.query(Profile).filter(Profile.id == profile_id).first()
        else:
            profile = db.query(Profile).filter(
                Profile.client_secret_json.isnot(None),
                Profile.refresh_token.is_(None)
            ).first()
        
        if not profile:
            return HTMLResponse(content="""
            <div style="font-family: sans-serif; text-align: center; padding: 50px;">
                <h2 style="color: #ef4444;">❌ 인증 대기 중인 프로필을 찾을 수 없습니다.</h2>
                <p>ViraLoop Studio에서 다시 인증을 시도해 주세요.</p>
            </div>
            """, status_code=400)
        
        client_config = json.loads(profile.client_secret_json)
        
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )
        
        flow.fetch_token(code=code)
        credentials = flow.credentials
        
        profile.access_token = credentials.token
        profile.refresh_token = credentials.refresh_token
        profile.token_expiry = credentials.expiry
        
        db.commit()
        
        logger.info(f"OAuth2 authentication successful for profile {profile.id} ({profile.email})")
        
        email_display = profile.email or "Google Account"
        return HTMLResponse(content=f"""
        <!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="utf-8">
            <title>ViraLoop Studio - Google API 인증 완료</title>
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    background: #0f172a;
                    color: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                }}
                .card {{
                    background: #1e293b;
                    border: 1px solid #334155;
                    border-radius: 16px;
                    padding: 40px;
                    text-align: center;
                    max-width: 480px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                }}
                .icon {{ font-size: 52px; margin-bottom: 16px; }}
                h1 {{ font-size: 22px; margin: 0 0 12px 0; color: #10b981; font-weight: 800; }}
                p {{ font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px 0; }}
                .email {{ color: #818cf8; font-weight: bold; background: #312e81; padding: 4px 8px; border-radius: 6px; }}
                .btn {{
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 12px 28px;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background 0.2s;
                }}
                .btn:hover {{ background: #4f46e5; }}
            </style>
        </head>
        <body>
            <div class="card">
                <div class="icon">🎉</div>
                <h1>Google API 연동 승인 완료!</h1>
                <p>계정(<span class="email">{email_display}</span>)에 YouTube API 권한이 정상 등록되었습니다.<br><br>이제 이 창을 닫고 <strong>ViraLoop Studio</strong>로 돌아가서 계속 진행하세요.</p>
                <button class="btn" onclick="window.close(); try { window.open('','_self').close(); } catch(e){}">이 창 닫기 (또는 Ctrl+W)</button>
                <div style="font-size: 12px; color: #64748b; margin-top: 14px;">※ 브라우저 보안 정책상 버튼으로 닫히지 않을 경우, 키보드의 <strong>Ctrl + W</strong> 또는 우측 상단 <strong>X</strong> 버튼을 눌러 직접 닫아주세요.</div>
            </div>
        </body>
        </html>
        """)
        
    except Exception as e:
        logger.error(f"OAuth2 callback error: {e}", exc_info=True)
        return HTMLResponse(content=f"""
        <div style="font-family: sans-serif; text-align: center; padding: 50px; background: #0f172a; color: white; min-height: 100vh;">
            <h2 style="color: #ef4444;">❌ Google API 인증 실패</h2>
            <p style="color: #94a3b8;">오류 내용: {str(e)}</p>
            <p style="color: #94a3b8;">테스트 사용자(Test Users) 등록 여부 및 client_secret.json 상태를 확인해 주세요.</p>
        </div>
        """, status_code=500)


class ManualCallbackRequest(BaseModel):
    profile_id: str
    code_or_url: str


@router.post("/oauth2/manual-callback")
async def manual_oauth2_callback(req: ManualCallbackRequest, db: Session = Depends(get_db)):
    """
    [Plan B 안전망]
    브라우저 자동 리다이렉트가 차단되거나 지연될 경우,
    브라우저 주소창의 최종 콜백 URL 또는 code 값을 복사하여 수동으로 즉시 인증을 완료하는 엔드포인트.
    """
    try:
        profile = db.query(Profile).filter(Profile.id == req.profile_id).first()
        if not profile:
            raise HTTPException(404, "프로필을 찾을 수 없습니다.")

        if not profile.client_secret_json:
            raise HTTPException(400, "해당 프로필에 등록된 client_secret.json 파일이 없습니다.")

        raw_input = req.code_or_url.strip()
        code = None

        # 1. URL 형태인 경우 파싱 (e.g. http://127.0.0.1:8000/api/oauth2/callback?code=4/0A...)
        if "code=" in raw_input:
            parsed = urlparse(raw_input)
            qs = parse_qs(parsed.query)
            if "code" in qs:
                code = qs["code"][0]
            else:
                import re
                m = re.search(r"code=([^&]+)", raw_input)
                if m:
                    code = m.group(1)
        else:
            code = raw_input

        if not code:
            raise HTTPException(400, "유효한 인증 코드(code)를 찾을 수 없습니다. 주소창의 전체 URL이나 코드를 확인해주세요.")

        client_config = json.loads(profile.client_secret_json)
        flow = Flow.from_client_config(
            client_config,
            scopes=SCOPES,
            redirect_uri=REDIRECT_URI
        )

        flow.fetch_token(code=code)
        credentials = flow.credentials

        profile.access_token = credentials.token
        profile.refresh_token = credentials.refresh_token
        profile.token_expiry = credentials.expiry

        db.commit()

        logger.info(f"Manual OAuth2 authentication successful for profile {profile.id} ({profile.email})")

        return {
            "success": True,
            "message": f"Google API 연동 승인 완료 ({profile.email})",
            "email": profile.email,
            "has_access_token": bool(profile.access_token),
            "has_refresh_token": bool(profile.refresh_token)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Manual OAuth2 callback error: {e}", exc_info=True)
        raise HTTPException(400, f"인증 코드 교환 실패: {str(e)} (코드가 만료되었거나 이미 사용되었을 수 있습니다.)")


@router.post("/oauth2/authenticate/{profile_id}")
async def start_oauth2_with_profile(profile_id: str, db: Session = Depends(get_db)):
    """
    Start OAuth2 authentication using profile's isolated Chrome profile
    """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    if not profile.client_secret_json:
        raise HTTPException(400, "해당 프로필에 등록된 client_secret.json 파일이 없습니다. 키 업로드를 먼저 진행해주세요.")
    
    try:
        client_config = json.loads(profile.client_secret_json)
        
        if 'installed' in client_config:
            oauth_config = client_config['installed']
        elif 'web' in client_config:
            oauth_config = client_config['web']
        else:
            raise HTTPException(400, "올바르지 않은 client_secret.json 형식입니다. (installed 또는 web 필요)")
        
        client_id = oauth_config['client_id']
        
        state_data = json.dumps({"profile_id": profile_id})
        
        auth_params = {
            'client_id': client_id,
            'redirect_uri': REDIRECT_URI,
            'response_type': 'code',
            'scope': ' '.join(SCOPES),
            'access_type': 'offline',
            'prompt': 'consent',
            'state': state_data
        }
        
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(auth_params)}"
        
        # Launch isolated stealth browser (strictly CloakBrowser with bound proxy)
        success = _launch_browser_for_oauth(profile, auth_url, db)
        if not success:
            raise HTTPException(500, "해당 계정의 격리 스텔스 브라우저(CloakBrowser) 구동에 실패했습니다. 프로필 상태 및 네트워크 설정을 확인해주세요.")
        
        logger.info(f"Started OAuth2 flow for profile {profile_id} strictly in isolated stealth browser")
        
        return {
            "status": "started",
            "message": "OAuth2 authentication started strictly in isolated stealth browser",
            "profile_id": profile_id
        }
        
    except json.JSONDecodeError:
        raise HTTPException(400, "client_secret.json 파일의 JSON 형식이 올바르지 않습니다.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start OAuth2 flow: {e}", exc_info=True)
        raise HTTPException(500, f"OAuth2 인증 시작 실패: {str(e)}")


@router.get("/oauth2/status/{profile_id}")
async def check_oauth2_status(profile_id: str, db: Session = Depends(get_db)):
    """
    Check OAuth2 authentication status
    """
    profile = db.query(Profile).filter(Profile.id == profile_id).first()
    
    if not profile:
        raise HTTPException(404, "Profile not found")
    
    has_tokens = bool(profile.access_token and profile.refresh_token)
    
    return {
        "authenticated": has_tokens,
        "has_access_token": bool(profile.access_token),
        "has_refresh_token": bool(profile.refresh_token),
        "token_expiry": profile.token_expiry.isoformat() if profile.token_expiry else None
    }
