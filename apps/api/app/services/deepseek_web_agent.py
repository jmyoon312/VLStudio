"""
DeepSeek Web Native Headless Automation Agent.
Connects directly to DeepSeek Web (https://chat.deepseek.com) using the user's authentic session cookies/tokens.
Provides 100% Free, Zero-Cost, Pure Sovereign DeepSeek-V3 & DeepSeek-R1 text streaming.
Supports:
  - DeepSeek-V3: Ultra-fast storytelling, Korean shorts scripts, natural dialogue.
  - DeepSeek-R1: Deep reasoning, step-by-step scene analysis, storyboard design.
"""

import os
import sys
import json
import time
import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Dict, Any, Optional, List

logger = logging.getLogger("deepseek_web_agent")
logger.setLevel(logging.INFO)

ROAMING_APPDATA = os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming"))
LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
PARTITIONS_DIR = Path(ROAMING_APPDATA) / "ViraLoop Studio" / "Partitions"
PROFILES_CONFIG_PATH = Path(ROAMING_APPDATA) / "ViraLoop Studio" / "flow-profiles-config.json"
SESSIONS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "04_Profiles" / "deepseek_sessions"

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
    """Returns the cookie path for the target email, or the currently active healthy DeepSeek account."""
    if not SESSIONS_DIR.exists():
        return None

    if target_email:
        target_path = SESSIONS_DIR / target_email.strip().lower() / "cookies_deepseek.json"
        if target_path.exists():
            return target_path

    try:
        from app.services.deepseek_account_pool import deepseek_account_pool
        active_acc = deepseek_account_pool.get_active_account()
        if active_acc and active_acc.get("email"):
            active_path = SESSIONS_DIR / active_acc["email"].strip().lower() / "cookies_deepseek.json"
            if active_path.exists():
                return active_path
    except Exception:
        pass

    for p in SESSIONS_DIR.iterdir():
        if p.is_dir() and "@" in p.name:
            c_file = p / "cookies_deepseek.json"
            if c_file.exists():
                return c_file
    return None


def execute_deepseek_web_chat_sync(
    prompt: str,
    model: str = "DeepSeek-V3",
    timeout_seconds: int = 45,
    target_email: Optional[str] = None,
    on_chunk: Optional[Any] = None
) -> Optional[str]:
    """Executes a real browser session on chat.deepseek.com, submits prompt, and returns the response."""
    partition_dir = get_partition_dir_for_email(target_email)
    cookie_path = _get_active_session_cookie_path(target_email)

    if not partition_dir and not cookie_path:
        logger.warning(f"No profile partition or cookies_deepseek.json found for {target_email}.")
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
        if any(k in domain for k in ["deepseek.com", "google.com", "x.com"]):
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

    user_token = None
    if cookie_path and cookie_path.exists():
        try:
            cookies_data = json.loads(cookie_path.read_text(encoding="utf-8"))
            user_token = cookies_data.get("userToken")
        except Exception:
            pass

    if (not user_token or user_token == "null") and target_email:
        token_path = SESSIONS_DIR / target_email.strip().lower() / "session_token.json"
        if token_path.exists():
            try:
                td = json.loads(token_path.read_text(encoding="utf-8"))
                user_token = td.get("token")
            except Exception:
                pass

    if not user_token and not playwright_cookies:
        logger.warning(f"⚠️ [DeepSeekWebAgent] Account {target_email} has neither userToken nor valid cookies. Skipping.")
        return None


    from playwright.sync_api import sync_playwright

    t_start = time.time()
    logger.info(f"🌐 [DeepSeekWebAgent] Launching browser for prompt ({len(prompt)} chars, model={model}, account: {target_email})...")

    with sync_playwright() as p:
        browser_args = [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage"
        ]

        is_persistent = False
        browser = None
        context = None

        if partition_dir and partition_dir.exists() and not (partition_dir / "SingletonLock").exists():
            try:
                logger.info(f"🌐 [DeepSeekWebAgent] Using genuine profile partition: {partition_dir.name}")
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

        # Inject genuine userToken into localStorage before DeepSeek scripts execute
        if user_token and isinstance(user_token, str) and len(user_token) > 20:
            token_json = json.dumps({"value": user_token, "__version": "0"})
            context.add_init_script(f"""
                try {{
                    localStorage.setItem('userToken', {json.dumps(token_json)});
                }} catch (e) {{}}
            """)

        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://chat.deepseek.com", wait_until="domcontentloaded", timeout=25000)
        time.sleep(1.0)

        # Early check for CloudFront / Cloudflare WAF block
        page_title = page.title()
        if any(err_kw in page_title.lower() for err_kw in ["error: the request could not be satisfied", "just a moment", "attention required"]):
            logger.warning(f"⚠️ [DeepSeekWebAgent] WAF / CloudFront block detected ({page_title}). Aborting immediately.")
            return None

        # 1. Dismiss any welcome dialogs or consent modals
        try:
            close_btn = page.locator("button:has-text('Confirm'), button:has-text('확인'), button:has-text('닫기'), button[aria-label='Close']")
            if close_btn.count() > 0 and close_btn.first.is_visible():
                close_btn.first.click(force=True)
                time.sleep(0.3)
        except Exception:
            pass

        # 2. Model selection: DeepThink (R1) toggle
        is_r1_requested = any(k in str(model).lower() for k in ["r1", "reason", "think"])
        try:
            # DeepSeek has a toggle for "DeepThink (R1)"
            deepthink_toggle = page.locator("div[role='button']:has-text('DeepThink'), button:has-text('DeepThink'), [class*='deepthink']")
            if deepthink_toggle.count() > 0 and deepthink_toggle.first.is_visible():
                is_currently_active = "active" in (deepthink_toggle.first.get_attribute("class") or "").lower()
                if is_r1_requested and not is_currently_active:
                    deepthink_toggle.first.click(force=True)
                    time.sleep(0.3)
                    logger.info("🧠 [DeepSeekWebAgent] Enabled DeepThink (R1) mode.")
                elif not is_r1_requested and is_currently_active:
                    deepthink_toggle.first.click(force=True)
                    time.sleep(0.3)
                    logger.info("⚡ [DeepSeekWebAgent] Disabled DeepThink (V3 standard mode).")
        except Exception as me:
            logger.debug(f"Model toggle notice: {me}")

        # 3. Focus editor and insert prompt
        editor = page.locator("textarea#chat-input, textarea[placeholder*='DeepSeek'], textarea, div[contenteditable='true']").first
        editor.wait_for(state="visible", timeout=15000)
        editor.click(force=True)
        time.sleep(0.2)

        # Use insert_text / execCommand for Unicode Korean support
        editor.fill(prompt)
        time.sleep(0.3)

        # 4. Click Send button
        send_btn = page.locator("div[role='button']:has(svg), button[type='submit'], [class*='send-btn']").last
        if send_btn.is_visible():
            send_btn.click(force=True)
        else:
            page.keyboard.press("Enter")

        # 5. Poll for completion & live-stream DOM text
        poll_interval = 0.3
        max_wait = timeout_seconds
        elapsed = 0
        final_answer = ""
        last_sent_text = ""
        is_rate_limited = False
        current_email = target_email or (cookie_path.parent.name if cookie_path else "unknown")

        RATE_LIMIT_PATTERNS = [
            "Server is busy",
            "Too many requests",
            "요청이 너무 많습니다",
            "서버가 혼잡합니다",
            "잠시 후 다시 시도"
        ]

        while elapsed < max_wait:
            time.sleep(poll_interval)
            elapsed += poll_interval

            # Check rate limits
            body_txt = page.locator("body").inner_text()
            for pat in RATE_LIMIT_PATTERNS:
                if pat in body_txt:
                    logger.warning(f"⚠️ [DeepSeekWebAgent] Rate limit detected for {current_email}: {pat}")
                    is_rate_limited = True
                    break

            if is_rate_limited:
                try:
                    from app.services.deepseek_account_pool import deepseek_account_pool
                    deepseek_account_pool.mark_exhausted(current_email, cooldown_seconds=3600)
                except Exception:
                    pass
                break

            # Extract response text in real-time preserving Markdown tables and line breaks
            try:
                extract_script = """
                () => {
                    const containers = document.querySelectorAll("div.ds-markdown, div[class*='message-content'], div.markdown");
                    if (!containers || containers.length === 0) return "";
                    const lastEl = containers[containers.length - 1];

                    function nodeToMarkdown(node) {
                        if (!node) return "";
                        if (node.nodeType === Node.TEXT_NODE) {
                            return node.textContent || "";
                        }
                        if (node.nodeType !== Node.ELEMENT_NODE) return "";

                        const tag = node.tagName.toLowerCase();

                        // Headings
                        if (tag === "h1") return "\\n\\n# " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "h2") return "\\n\\n## " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "h3") return "\\n\\n### " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "h4") return "\\n\\n#### " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "h5") return "\\n\\n##### " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "h6") return "\\n\\n###### " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";

                        // Paragraphs & Blockquotes
                        if (tag === "p") return "\\n\\n" + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";
                        if (tag === "blockquote") return "\\n\\n> " + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "\\n\\n";

                        // Bold / Italic / Code
                        if (tag === "strong" || tag === "b") return "**" + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "**";
                        if (tag === "em" || tag === "i") return "*" + Array.from(node.childNodes).map(nodeToMarkdown).join("").trim() + "*";
                        if (tag === "code" && node.parentNode && node.parentNode.tagName.toLowerCase() === "pre") {
                            return "\\n```\\n" + (node.textContent || "") + "\\n```\\n";
                        }
                        if (tag === "code") return "`" + (node.textContent || "") + "`";
                        if (tag === "pre") return "\\n```\\n" + (node.textContent || "") + "\\n```\\n";

                        // Lists
                        if (tag === "ul") {
                            const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === "li");
                            return "\\n\\n" + items.map(li => "- " + Array.from(li.childNodes).map(nodeToMarkdown).join("").trim()).join("\\n") + "\\n\\n";
                        }
                        if (tag === "ol") {
                            const items = Array.from(node.children).filter(c => c.tagName.toLowerCase() === "li");
                            return "\\n\\n" + items.map((li, idx) => (idx + 1) + ". " + Array.from(li.childNodes).map(nodeToMarkdown).join("").trim()).join("\\n") + "\\n\\n";
                        }
                        if (tag === "li") {
                            return Array.from(node.childNodes).map(nodeToMarkdown).join("").trim();
                        }

                        // Tables
                        if (tag === "table") {
                            const rows = Array.from(node.querySelectorAll("tr"));
                            if (rows.length === 0) return "";
                            let md = "\\n\\n";
                            let headerProcessed = false;
                            rows.forEach((tr) => {
                                const ths = Array.from(tr.querySelectorAll("th"));
                                const tds = Array.from(tr.querySelectorAll("td"));
                                const cells = (ths.length > 0 ? ths : tds).map(c => Array.from(c.childNodes).map(nodeToMarkdown).join("").trim().replace(/\\n+/g, " "));
                                if (cells.length > 0) {
                                    md += "| " + cells.join(" | ") + " |\\n";
                                    if (!headerProcessed && ths.length > 0) {
                                        md += "| " + cells.map(() => ":---").join(" | ") + " |\\n";
                                        headerProcessed = true;
                                    }
                                }
                            });
                            return md + "\\n\\n";
                        }

                        // Links
                        if (tag === "a") {
                            const href = node.getAttribute("href") || "";
                            const text = Array.from(node.childNodes).map(nodeToMarkdown).join("").trim();
                            return href ? `[${text}](${href})` : text;
                        }

                        // Ignore citation badges / buttons from DeepSeek web search
                        if (tag === "button" || (node.getAttribute && node.getAttribute("data-type") === "citation") || (node.className && typeof node.className === "string" && (node.className.includes("citation") || node.className.includes("cite")))) {
                            return "";
                        }

                        // Default: iterate children
                        return Array.from(node.childNodes).map(nodeToMarkdown).join("");
                    }

                    const rawMd = nodeToMarkdown(lastEl).trim();
                    const cleanMd = rawMd.replace(/ +-(?:\d+)(?:-\d+)*(?=\s|$|[.,!?)\]])/g, "");
                    return cleanMd.replace(/\n{3,}/g, "\n\n");
                }
                """
                latest = page.evaluate(extract_script)
                if latest and latest != prompt and len(latest) > 0:
                    final_answer = latest

                    # Real-time streaming to UI as text appears on the web page
                    if on_chunk and len(latest) > len(last_sent_text):
                        delta = latest[len(last_sent_text):]
                        last_sent_text = latest
                        on_chunk(delta, latest)
                        stable_ticks = 0
                    else:
                        stable_ticks += 1

                        # Robust completion detection: Text must have stabilized for at least 6 ticks (1.8s)
                        # and generation must have been running for at least 4.0s
                        if len(final_answer) >= 80 and stable_ticks >= 6 and elapsed >= 4.0:
                            logger.info(f"⚡ [DeepSeekWebAgent] Text stabilized ({len(final_answer)} chars), generation concluded.")
                            break
                        elif stable_ticks >= 12 and elapsed >= 5.0:
                            # Fallback if answer is naturally short but completely stopped
                            break
            except Exception:
                pass

        # Save refreshed session cookies back to disk
        try:
            fresh_cookies = context.cookies()
            if fresh_cookies and cookie_path and any("deepseek" in c.get("domain", "") for c in fresh_cookies):
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
                context.close()
                browser.close()
        except Exception:
            pass

        if is_rate_limited:
            try:
                from app.services.deepseek_account_pool import deepseek_account_pool
                exhausted_email = current_email
                next_acc = deepseek_account_pool.mark_exhausted(exhausted_email, 3600)
                if next_acc and next_acc.get("email") and next_acc["email"].lower() != exhausted_email.lower():
                    logger.info(f"🔄 [DeepSeekWebAgent] Auto-rotating to next healthy account: {next_acc['email']}...")
                    return execute_deepseek_web_chat_sync(prompt, model=model, timeout_seconds=timeout_seconds, target_email=next_acc["email"], on_chunk=on_chunk)
            except Exception as fe:
                logger.warning(f"Failover rotation error: {fe}")

            return (
                f"⚠️ **DeepSeek 일시 한도 도달 안내**\n\n"
                f"현재 연동된 **{current_email}** 계정의 사용량이 일시 소진되었거나 서버가 혼잡합니다.\n"
                f"- **소진된 계정**: `{current_email}`\n\n"
                f"💡 **즉시 해결 방법**:\n"
                f"우측 상단 **설정 > AI 계정 관리 > DeepSeek** 탭에서 추가 구글 계정으로 연동해 주시거나, **Gemini 3.8 Flash** 또는 **Codex Astra**로 즉시 전환하실 수 있습니다."
            )

        dur = int((time.time() - t_start) * 1000)
        logger.info(f"✅ [DeepSeekWebAgent] Response completed in {dur}ms ({len(final_answer)} chars)")
        return final_answer or None


async def stream_deepseek_web_chat(
    prompt: str,
    model: str = "DeepSeek-V3",
    target_email: Optional[str] = None
) -> AsyncGenerator[Dict[str, Any], None]:
    """Async generator that streams live chunks directly as they are generated on chat.deepseek.com."""
    loop = asyncio.get_running_loop()
    queue = asyncio.Queue()

    def thread_chunk_callback(delta: str, current_full: str):
        loop.call_soon_threadsafe(queue.put_nowait, ("chunk", delta, current_full))

    def run_sync():
        try:
            res = execute_deepseek_web_chat_sync(
                prompt,
                model=model,
                target_email=target_email,
                on_chunk=thread_chunk_callback
            )
            loop.call_soon_threadsafe(queue.put_nowait, ("done", res))
        except Exception as e:
            loop.call_soon_threadsafe(queue.put_nowait, ("error", str(e)))

    task = asyncio.create_task(asyncio.to_thread(run_sync))

    full_accumulated = ""
    while True:
        msg = await queue.get()
        kind = msg[0]
        if kind == "chunk":
            delta, current_full = msg[1], msg[2]
            full_accumulated = current_full
            yield {
                "type": "content_chunk",
                "delta": delta,
                "content": full_accumulated
            }
        elif kind == "done":
            final_text = msg[1] or full_accumulated
            if not final_text:
                yield {
                    "type": "error",
                    "message": "DeepSeek Web에서 응답을 수신하지 못했습니다. 세션을 새로고침해 주세요."
                }
                return
            display_name = "DeepSeek-R1" if "r1" in str(model).lower() else "DeepSeek-V3"
            yield {
                "type": "chat_response",
                "content": final_text,
                "action_chips": [
                    f"⚡ {display_name}으로 대본 계속 발전시키기",
                    "🎙️ AI 음성 합성하기",
                    "🎬 쇼츠 씬별 콘티 제작"
                ]
            }
            break
        elif kind == "error":
            yield {
                "type": "error",
                "message": f"DeepSeek Web 통신 오류: {msg[1]}"
            }
            break

    await task
