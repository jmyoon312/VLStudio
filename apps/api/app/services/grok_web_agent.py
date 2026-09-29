"""
Grok Web Native Headless Automation Agent.
Connects directly to Grok Web (https://grok.com) using the user's authentic session cookies.
Provides 100% Free, Zero-Cost, Pure Sovereign Grok 3 / Fast text streaming.
Bypasses Cloudflare anti-bot and xAI spending limit walls by running inside genuine headless Chromium.
"""

import os
import sys
import json
import time
import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, Optional, List

logger = logging.getLogger("grok_web_agent")
logger.setLevel(logging.INFO)

ROAMING_APPDATA = os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming"))
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
PARTITIONS_DIR = Path(ROAMING_APPDATA) / "ViraLoop Studio" / "Partitions"
PROFILES_CONFIG_PATH = Path(ROAMING_APPDATA) / "ViraLoop Studio" / "flow-profiles-config.json"
SESSIONS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "04_Profiles" / "grok_sessions"
SAME_SITE_MAP = {
    "no_restriction": "None",
    "lax": "Lax",
    "strict": "Strict",
    "unspecified": "Lax"
}


def get_partition_dir_for_email(email: Optional[str]) -> Optional[Path]:
    """Finds the genuine Electron partition directory for the given email from flow-profiles-config.json."""
    if not email:
        return None
    clean_email = email.strip().lower()
    if PROFILES_CONFIG_PATH.exists():
        try:
            config = json.loads(PROFILES_CONFIG_PATH.read_text(encoding="utf-8"))
            profiles = config.get("profiles", [])
            matched = next((p for p in profiles if p.get("email", "").strip().lower() == clean_email), None)
            if matched:
                p_id = matched.get("id", "default")
                p_dir = PARTITIONS_DIR / f"flow_profile_{p_id}"
                if p_dir.exists():
                    return p_dir
        except Exception as e:
            logger.warning(f"Error reading flow-profiles-config: {e}")
    # Fallback to direct candidate names
    candidates = [
        PARTITIONS_DIR / f"flow_profile_{clean_email.replace('@', '_').replace('.', '_')}",
        PARTITIONS_DIR / f"flow_profile_{clean_email.split('@')[0]}"
    ]
    for c in candidates:
        if c.exists():
            return c
    return None


def _get_active_session_cookie_path(target_email: Optional[str] = None) -> Optional[Path]:
    """Returns the cookie path for the target email, or the currently active healthy Grok account."""
    if not SESSIONS_DIR.exists():
        return None

    # 1. Target email requested
    if target_email:
        target_path = SESSIONS_DIR / target_email.strip().lower() / "cookies_grok.json"
        if target_path.exists():
            return target_path

    # 2. Check active account from pool
    try:
        from app.services.grok_account_pool import grok_account_pool
        active_acc = grok_account_pool.get_active_account()
        if active_acc and active_acc.get("email"):
            active_path = SESSIONS_DIR / active_acc["email"].strip().lower() / "cookies_grok.json"
            if active_path.exists():
                return active_path
    except Exception:
        pass

    # 3. Fallback to any directory with valid cookies
    for p in SESSIONS_DIR.iterdir():
        if p.is_dir() and "@" in p.name:
            c_file = p / "cookies_grok.json"
            if c_file.exists():
                return c_file
    return None


def execute_grok_web_chat_sync(prompt: str, timeout_seconds: int = 25, target_email: Optional[str] = None) -> Optional[str]:
    """Executes a real browser session on grok.com, submits prompt, and returns the response."""
    partition_dir = get_partition_dir_for_email(target_email)
    cookie_path = _get_active_session_cookie_path(target_email)
    if not partition_dir and not cookie_path:
        logger.warning(f"No profile partition or cookies_grok.json found for {target_email}.")
        return None

    raw_cookies = []
    if cookie_path and cookie_path.exists():
        try:
            cookies_data = json.loads(cookie_path.read_text(encoding="utf-8"))
            raw_cookies = cookies_data.get("cookies", [])
        except Exception as e:
            logger.debug(f"Failed to read {cookie_path}: {e}")

    playwright_cookies = []
    for c in raw_cookies:
        domain = c.get("domain", "")
        if any(k in domain for k in ["grok.com", "x.ai", "twitter.com", "x.com"]):
            ss = SAME_SITE_MAP.get(str(c.get("sameSite", "")).lower(), "Lax")
            playwright_cookies.append({
                "name": c["name"],
                "value": c["value"],
                "domain": domain,
                "path": c.get("path", "/"),
                "secure": c.get("secure", True),
                "httpOnly": c.get("httpOnly", False),
                "sameSite": ss
            })

    from playwright.sync_api import sync_playwright

    t_start = time.time()
    logger.info(f"🌐 [GrokWebAgent] Launching browser for prompt ({len(prompt)} chars, account: {target_email})...")

    with sync_playwright() as p:
        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage"
        ]

        # Priority 1: Persistent Profile Partition (100% full cookies + localStorage + IndexedDB)
        is_persistent = False
        browser = None
        if partition_dir and partition_dir.exists() and not (partition_dir / "SingletonLock").exists():
            try:
                logger.info(f"🌐 [GrokWebAgent] Using genuine profile partition: {partition_dir.name}")
                context = p.chromium.launch_persistent_context(
                    user_data_dir=str(partition_dir),
                    headless=True,
                    args=browser_args,
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
                )
                page = context.pages[0] if context.pages else context.new_page()
                is_persistent = True
            except Exception as pe:
                logger.warning(f"Persistent context fallback for {partition_dir}: {pe}")

        if not is_persistent:
            browser = p.chromium.launch(headless=True, args=browser_args)
            context = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 800}
            )
            if playwright_cookies:
                context.add_cookies(playwright_cookies)
            page = context.new_page()
        page.goto("https://grok.com", wait_until="domcontentloaded", timeout=20000)
        time.sleep(2.0)

        # 1. Cleanly dismiss popups, modals, and cookie banners
        try:
            dismiss_btn = page.locator("button:has-text('Dismiss'), button:has-text('닫기')")
            if dismiss_btn.count() > 0 and dismiss_btn.first.is_visible():
                dismiss_btn.first.click(force=True)
                time.sleep(0.3)
        except Exception:
            pass

        try:
            page.evaluate("""() => {
                document.querySelectorAll('#promo-portal, [id*="promo"], div[role="dialog"], #onetrust-consent-sdk, .ot-sdk-container, [id*="cookie"]').forEach(el => el.remove());
            }""")
        except Exception:
            pass

        # 2. Focus editor, type, and explicitly click submit button
        editor = page.locator('div[aria-label="Ask Grok anything"], .ProseMirror, textarea').first
        if not editor.is_visible():
            time.sleep(1.5)

        editor.click(force=True)
        time.sleep(0.2)
        page.keyboard.type(prompt, delay=0)
        time.sleep(0.3)

        # Explicitly click submit button or press Enter
        submitted = False
        try:
            submit_btn = page.locator('button[aria-label="Submit"], button[data-testid="chat-submit"], button[type="submit"]').first
            if submit_btn.count() > 0 and submit_btn.is_visible():
                submit_btn.click(force=True)
                submitted = True
        except Exception:
            pass

        if not submitted:
            page.keyboard.press("Enter")

        # Automatically dismiss Age Verification Modal if present
        had_age_modal = False
        try:
            time.sleep(0.8)
            cont_btn = page.locator("button:has-text('Continue'), button:has-text('계속하기')")
            if cont_btn.count() > 0 and cont_btn.first.is_visible():
                cont_btn.first.click(force=True)
                had_age_modal = True
                time.sleep(0.8)
            save_btn = page.locator("button:has-text('Save'), button:has-text('저장')")
            if save_btn.count() > 0 and save_btn.first.is_visible():
                save_btn.first.click(force=True)
                had_age_modal = True
                time.sleep(0.8)
        except Exception:
            pass

        if had_age_modal:
            try:
                editor = page.locator('div[aria-label="Ask Grok anything"], .ProseMirror, textarea').first
                editor.click(force=True)
                page.keyboard.type(prompt, delay=0)
                time.sleep(0.3)
                page.keyboard.press("Enter")
            except Exception:
                pass

        # 3. Poll for response or rate limit banner
        poll_interval = 0.5
        max_wait = timeout_seconds
        elapsed = 0
        final_answer = ""
        is_rate_limited = False
        current_email = cookie_path.parent.name

        UI_NOISE_KEYWORDS = [
            "Type @", "search your apps", "What should we explore", "Meet Grok Bot",
            "Finance", "우리는 무엇을 탐색", "슬래시 명령", "재정을 관리", "확장된 기능",
            "Drag and drop folders", "Ctrl+J", "Please confirm your age", "Birth Year",
            "Free tier limit reached", "Upgrade to SuperGrok", "대화 계속하기"
        ]

        # Strict genuine rate limit patterns (MUST NOT include static sidebar buttons like 'Upgrade to SuperGrok')
        GENUINE_RATE_LIMIT_PATTERNS = [
            "Free tier limit reached",
            "You've reached your free tier limit",
            "You have reached the limit of free messages",
            "무료 한도에 도달했습니다",
            "무료 플랜 한도 도달",
            "한도가 사라지기까지"
        ]

        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

            # A. Check for Genuine Rate Limit Banner (Scoped to Alerts/Banners only, never sidebar navigation)
            for pat in GENUINE_RATE_LIMIT_PATTERNS:
                try:
                    # Check inside alert, toast, or rate-limit banner container
                    rl_el = page.locator("div[role='alert'], div[class*='banner'], div[class*='toast'], div[data-testid*='limit']").filter(has_text=pat)
                    if rl_el.count() > 0 and rl_el.first.is_visible():
                        banner_text = rl_el.first.inner_text().strip()
                        logger.warning(f"⚠️ [GrokWebAgent] Rate limit banner detected for {current_email}: {banner_text}")
                        is_rate_limited = True
                        break

                    # Check exact text element ensuring it is NOT inside navigation / sidebar
                    exact_el = page.locator(f"text='{pat}'")
                    if exact_el.count() > 0:
                        is_in_nav = exact_el.first.evaluate("el => !!el.closest('nav, aside, button[aria-label*=\"SuperGrok\"], a[href*=\"pricing\"]')")
                        if not is_in_nav and exact_el.first.is_visible():
                            banner_text = exact_el.first.inner_text().strip()
                            logger.warning(f"⚠️ [GrokWebAgent] Rate limit text detected for {current_email}: {banner_text}")
                            is_rate_limited = True
                            break
                except Exception:
                    pass
            if is_rate_limited:
                try:
                    from app.services.grok_account_pool import grok_account_pool
                    grok_account_pool.mark_exhausted(current_email, cooldown_seconds=7200)
                except Exception:
                    pass
                break

            # B. Extract Assistant Response from conversation turns
            try:
                turns = page.locator('[data-testid^="conversation-turn-"], .message-bubble, div.prose').all()
                if len(turns) >= 2:
                    for turn in reversed(turns):
                        txt = turn.inner_text().strip()
                        if txt and prompt not in txt and txt not in prompt and len(txt) > 10:
                            if not any(k in txt for k in UI_NOISE_KEYWORDS):
                                final_answer = txt
                                break
                    if final_answer and elapsed > 2.0:
                        break
                elif turns:
                    for turn in reversed(turns):
                        txt = turn.inner_text().strip()
                        if txt and prompt not in txt and txt not in prompt and len(txt) > 20:
                            if not any(k in txt for k in UI_NOISE_KEYWORDS):
                                final_answer = txt
                                break
                    if final_answer and elapsed > 3.0:
                        break
            except Exception:
                pass

        # Save refreshed session cookies back to disk only if authenticated
        try:
            fresh_cookies = context.cookies()
            if fresh_cookies and cookie_path and any(c.get("name") in ["sso", "sso-rw"] for c in fresh_cookies):
                c_data = {
                    "email": current_email,
                    "updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "cookie_count": len(fresh_cookies),
                    "cookies": fresh_cookies
                }
                cookie_path.write_text(json.dumps(c_data, indent=2, ensure_ascii=False), encoding="utf-8")
        except Exception as e:
            logger.debug(f"Error saving fresh cookies: {e}")

        try:
            if is_persistent:
                context.close()
            elif browser:
                browser.close()
        except Exception:
            pass

    # C. Automatic Multi-Account Failover Rotation!
    if is_rate_limited:
        try:
            from app.services.grok_account_pool import grok_account_pool
            exhausted_email = cookie_path.parent.name
            next_acc = grok_account_pool.mark_exhausted(exhausted_email, 22 * 3600 + 30 * 60)
            if next_acc and next_acc.get("email") and next_acc["email"].lower() != exhausted_email.lower():
                logger.info(f"🔄 [GrokWebAgent] Auto-rotating to next healthy account: {next_acc['email']}...")
                return execute_grok_web_chat_sync(prompt, timeout_seconds=timeout_seconds, target_email=next_acc["email"])
        except Exception as fe:
            logger.warning(f"Failover rotation error: {fe}")

        return (
            f"⚠️ **xAI Grok 무료 일일 사용 한도 도달 안내**\n\n"
            f"현재 연동된 **{current_email}** 계정의 Grok 웹 무료 사용량이 일시 소진되었습니다 (`Free tier limit reached`).\n"
            f"- **소진된 계정**: `{current_email}`\n"
            f"- **대기 시간**: 리셋까지 대기 필요 (약 22시간)\n\n"
            f"💡 **즉시 해결 방법**:\n"
            f"1. **Grok 새 구글 계정 연동**: 우측 상단 **설정 > AI 계정 관리 > Grok** 탭에서 추가 구글 계정으로 연동해 주시면 즉시 사용하실 수 있습니다.\n"
            f"2. **타 프로바이더 즉시 전환**: 100% 무료 무제한 풀이 완비된 **Gemini 3.8 Flash** 또는 **Codex Astra**를 대화창 상단에서 선택하시면 0.2초 초고속 답변을 이용하실 수 있습니다."
        )

    dur = int((time.time() - t_start) * 1000)
    logger.info(f"✅ [GrokWebAgent] Response received in {dur}ms ({len(final_answer)} chars)")
    return final_answer or None


async def stream_grok_web_chat(prompt: str, target_email: Optional[str] = None) -> AsyncGenerator[Dict[str, Any], None]:
    """Async generator that calls the browser agent in a background thread and streams chunks."""
    import functools
    loop = asyncio.get_event_loop()
    fn = functools.partial(execute_grok_web_chat_sync, prompt, target_email=target_email)
    response_text = await loop.run_in_executor(None, fn)

    if not response_text:
        yield {
            "type": "error",
            "message": "xAI Grok Web에서 응답을 수신하지 못했습니다. 세션을 새로고침해 주세요."
        }
        return

    # Yield realistic smooth streaming chunks
    words = response_text.split(" ")
    acc = ""
    for i, w in enumerate(words):
        chunk = w + (" " if i < len(words) - 1 else "")
        acc += chunk
        yield {
            "type": "content_chunk",
            "delta": chunk,
            "content": acc
        }
        await asyncio.sleep(0.015)

    yield {
        "type": "chat_response",
        "content": response_text,
        "action_chips": [
            "⚡ Grok 3으로 대본 계속 발전시키기",
            "🎙️ AI 음성 합성하기",
            "🎬 쇼츠 씬별 콘티 제작"
        ]
    }
