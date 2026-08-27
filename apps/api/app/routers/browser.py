"""Browser engine router — unified API for CloakBrowser & iXBrowser."""

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..database import get_db
from ..models import Profile, YouTubeChannel
from ..services.browser import (
    ProfileConfig,
    VideoPayload,
    get_browser_engine,
)

router = APIRouter(prefix="/api/browser", tags=["browser"])
logger = logging.getLogger(__name__)


# ── request schemas ───────────────────────────────────────────

class LaunchRequest(BaseModel):
    profile_id: str
    engine_mode: str = "cloakbrowser"  # cloakbrowser | ixbrowser
    proxy_host: str = ""
    proxy_port: int = 0
    proxy_type: str = "http"
    lte_interface_ip: Optional[str] = None


class UploadRequest(BaseModel):
    profile_id: str
    video_path: str
    thumbnail_path: Optional[str] = None
    title: str = ""
    description: str = ""
    tags: list[str] = []
    category_id: str = "22"
    privacy: str = "public"
    schedule_publish_at: Optional[str] = None

class TypeRequest(BaseModel):
    text: str
    press_enter: bool = False


# ── endpoints ─────────────────────────────────────────────────

@router.post("/launch")
async def launch_browser(req: LaunchRequest, db=Depends(get_db)):
    """Launch a browser profile with the given engine."""
    engine = get_browser_engine(req.engine_mode)
    profile = db.query(Profile).filter(Profile.id == req.profile_id).first()
    if not profile:
        raise HTTPException(404, f"Profile {req.profile_id} not found")

    config = ProfileConfig(
        profile_id=req.profile_id,
        user_data_dir=Path(profile.folder_path) if profile.folder_path else Path.cwd() / "profiles",
        proxy_host=req.proxy_host or (profile.proxy_info or {}).get("host", ""),
        proxy_port=req.proxy_port or (profile.proxy_info or {}).get("port", 0),
        proxy_type=req.proxy_type,
        proxy_username=getattr(profile, "proxy_username", ""),
        proxy_password=getattr(profile, "proxy_password", ""),
        lte_interface_ip=req.lte_interface_ip,
        engine_mode=req.engine_mode,
    )
    try:
        session = await engine.launch_browser(config.profile_id)
        return {"session_id": session.session_id, "cdp_url": session.cdp_url, "pid": session.pid}
    except Exception as e:
        raise HTTPException(500, f"Browser launch failed: {e}")


@router.post("/upload")
async def upload_video(req: UploadRequest, db=Depends(get_db)):
    """Upload a video to YouTube using the profile's engine."""
    profile = db.query(Profile).filter(Profile.id == req.profile_id).first()
    if not profile:
        raise HTTPException(404, f"Profile {req.profile_id} not found")

    engine_mode = req.engine_mode if hasattr(req, 'engine_mode') else getattr(profile, 'engine_mode', 'cloakbrowser')
    engine = get_browser_engine(engine_mode)

    payload = VideoPayload(
        video_path=Path(req.video_path),
        thumbnail_path=Path(req.thumbnail_path) if req.thumbnail_path else None,
        title=req.title,
        description=req.description,
        tags=req.tags,
        category_id=req.category_id,
        privacy=req.privacy,
        schedule_publish_at=req.schedule_publish_at,
    )
    # Create ephemeral session (engine handles its own lifecycle)
    from ..services.browser import BrowserSession
    session = BrowserSession(profile_id=req.profile_id)

    result = await engine.upload_youtube(session, payload)
    return {
        "success": result.success,
        "video_id": result.video_id,
        "error": result.error,
        "uploaded_at": result.uploaded_at,
    }


@router.post("/close")
async def close_browser(profile_id: str, engine_mode: str = "cloakbrowser"):
    """Close a browser profile."""
    engine = get_browser_engine(engine_mode)
    try:
        await engine.close()
        return {"status": "closed"}
    except Exception as e:
        raise HTTPException(500, f"Close failed: {e}")


@router.get("/engines")
async def list_engines():
    """List available browser engines."""
    from ..services.browser.factory import _engines
    return {"engines": list(_engines.keys())}


@router.post("/type-active")
async def type_into_active_window(req: TypeRequest):
    """OS macro based paste for Manual Browser Uploads."""
    try:
        import pyautogui
        import pyperclip
        import time

        # Copy the text to OS clipboard
        pyperclip.copy(req.text)
        
        # Give a small delay before firing the keys just in case
        time.sleep(0.1)
        
        # Press Ctrl+V
        pyautogui.hotkey('ctrl', 'v')
        
        if req.press_enter:
            time.sleep(0.1)
            pyautogui.press('enter')
        
        return {"status": "success", "length": len(req.text)}
    except ImportError:
        logger.error("pyautogui or pyperclip not installed.")
        raise HTTPException(500, "Macro libraries not installed.")
    except Exception as e:
        logger.error(f"Macro injection failed: {e}")
        raise HTTPException(500, f"Macro injection failed: {e}")


class IXBrowserTestRequest(BaseModel):
    url: str = "http://127.0.0.1:53200"


@router.post("/test-ixbrowser")
async def test_ixbrowser_connection(req: IXBrowserTestRequest):
    """Test connection to local ixBrowser API client."""
    import httpx
    import time
    
    raw_url = req.url.strip().rstrip('/')
    if not raw_url:
        raise HTTPException(400, "ixBrowser API URL이 비어 있습니다.")
    
    # Normalize url (ensure http scheme)
    if not raw_url.startswith("http://") and not raw_url.startswith("https://"):
        raw_url = f"http://{raw_url}"
        
    endpoint = f"{raw_url}/api/v2/profile-list" if not raw_url.endswith("/profile-list") else raw_url
    
    t0 = time.time()
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(endpoint, json={"page": 1, "limit": 10})
            elapsed_ms = int((time.time() - t0) * 1000)
            
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == 0:
                    profile_count = data.get("data", {}).get("total", 0)
                    return {
                        "status": "success",
                        "message": f"ixBrowser 연결 정상! (응답 시간: {elapsed_ms}ms, 감지된 프로필: {profile_count}개)",
                        "profile_count": profile_count
                    }
                else:
                    return {
                        "status": "success",
                        "message": f"ixBrowser 클라이언트 감지됨 (응답 시간: {elapsed_ms}ms, 코드: {data.get('code')})",
                        "profile_count": 0
                    }
            else:
                raise HTTPException(400, f"ixBrowser 응답 오류 (HTTP {resp.status_code}): {resp.text[:150]}")
    except httpx.ConnectError:
        raise HTTPException(400, f"ixBrowser 앱에 연결할 수 없습니다. ixBrowser 데스크톱 클라이언트가 실행 중이고 포트({raw_url})가 맞는지 확인하세요.")
    except httpx.TimeoutException:
        raise HTTPException(400, f"ixBrowser 연결 시간 초과 ({raw_url}). 앱이 응답하지 않습니다.")
    except Exception as e:
        raise HTTPException(400, f"ixBrowser 연결 실패: {str(e)}")