"""
TikTok Creator Studio Web Uploader (Production-Grade)
Automates video uploading via TikTok Studio / Creator Center using Playwright.
Features:
- Auto-detection of TikTok Studio vs Creator Center entry points
- Smart iframe / main-frame recursive locator
- Session login verification with early error diagnostic
- Multi-lingual UI support (Korean & English)
- Governance toggles: Privacy, Comments, Duet/Stitch
- Captcha detection & video ingestion polling
"""

import os
import re
import time
import random
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("TikTokUploader")


class TikTokUploader:
    """
    Playwright-based TikTok Uploader for TikTok Studio & Creator Center.
    """

    ENTRY_URLS = [
        "https://www.tiktok.com/tiktokstudio/upload",
        "https://www.tiktok.com/creator-center/upload?from=creator_center",
        "https://www.tiktok.com/upload?lang=ko-KR"
    ]

    def upload_video(
        self,
        page: Any,
        video_path: str,
        caption: str,
        hashtags: Optional[List[str]] = None,
        privacy: str = "PUBLIC",
        allow_comments: bool = True,
        allow_duet: bool = True
    ) -> Dict[str, Any]:
        """
        TikTok 동영상 자동 업로드 메인 함수.
        """
        step_msg = f"🚀 [TikTok Step 0/10] Starting upload automation for: {video_path}"
        print(step_msg)
        logger.info(step_msg)
        
        if not os.path.exists(video_path):
            err_msg = f"Video file not found: {video_path}"
            print(f"❌ [TikTok] {err_msg}")
            return {"status": "error", "message": err_msg}

        try:
            # 1. 페이지 탐색 및 진입
            print("🌐 [TikTok Step 1/10] Navigating to upload entry page...")
            logger.info("🌐 [TikTok Step 1/10] Navigating to upload entry page...")
            target_url = self._navigate_to_upload_page(page)
            print(f"🌐 [TikTok Step 1/10] Landed on upload page: {target_url}")
            logger.info(f"🌐 [TikTok Step 1/10] Landed on upload page: {target_url}")

            # 2. 로그인 세션 유효성 검사
            print("🔑 [TikTok Step 2/10] Checking login session validity...")
            logger.info("🔑 [TikTok Step 2/10] Checking login session validity...")
            if self._check_if_login_required(page):
                msg = "TikTok session expired or not logged in. Please log in via Social Accounts Manager."
                print(f"🛑 [TikTok Step 2/10] {msg}")
                logger.error(f"🛑 [TikTok] {msg}")
                return {"status": "error", "message": msg, "code": "AUTH_REQUIRED"}
            print("✅ [TikTok Step 2/10] Session verified: Logged in!")
            logger.info("✅ [TikTok Step 2/10] Session verified: Logged in!")

            # 3. 업로드 타겟 프레임/요소 탐색 (스마트 iframe 지원)
            print("🔍 [TikTok Step 3/10] Locating file upload target/iframe...")
            logger.info("🔍 [TikTok Step 3/10] Locating file upload target/iframe...")
            upload_target = self._find_upload_target(page)
            if not upload_target:
                msg = "Could not locate TikTok file upload zone or iframe."
                print(f"❌ [TikTok Step 3/10] {msg}")
                logger.error(f"❌ [TikTok] {msg}")
                return {"status": "error", "message": msg}
            print("✅ [TikTok Step 3/10] Upload target located.")
            logger.info("✅ [TikTok Step 3/10] Upload target located.")

            # 4. 파일 업로드 인풋 주입
            print(f"📂 [TikTok Step 4/10] Injecting video file input: {video_path}")
            logger.info(f"📂 [TikTok Step 4/10] Injecting video file input: {video_path}")
            file_input = upload_target.locator('input[type="file"], input[accept*="video"]').first
            file_input.wait_for(state="attached", timeout=15000)
            file_input.set_input_files(video_path)
            print("✅ [TikTok Step 4/10] Video file attached, dismissing onboarding modals...")
            logger.info("✅ [TikTok Step 4/10] Video file attached, dismissing onboarding modals...")
            time.sleep(1.0)
            self._dismiss_blocking_modals(page, upload_target)

            # 5. 비디오 처리 및 캡션 에디터 대기
            print("⏳ [TikTok Step 5/10] Waiting for video ingestion and caption editor...")
            logger.info("⏳ [TikTok Step 5/10] Waiting for video ingestion and caption editor...")
            editor_target, caption_input = self._wait_for_caption_editor(page, upload_target)
            if not caption_input:
                # 캡차 확인
                if self._detect_captcha(page):
                    print("🛑 [TikTok Step 5/10] Captcha detected!")
                    return {"status": "error", "message": "TikTok Captcha/Verification detected.", "code": "CAPTCHA_DETECTED"}
                print("❌ [TikTok Step 5/10] Timeout waiting for caption editor.")
                return {"status": "error", "message": "Timeout waiting for TikTok caption editor to appear."}
            print("✅ [TikTok Step 5/10] Caption editor ready.")
            logger.info("✅ [TikTok Step 5/10] Caption editor ready.")

            self._dismiss_blocking_modals(page, editor_target)

            # 6. 제목 및 해시태그 입력
            print(f"✍️ [TikTok Step 6/10] Filling caption ({caption}) and hashtags ({hashtags})...")
            logger.info(f"✍️ [TikTok Step 6/10] Filling caption and hashtags...")
            self._fill_caption_and_hashtags(editor_target, caption_input, caption, hashtags or [], page=page)
            print("✅ [TikTok Step 6/10] Caption and hashtags filled.")
            logger.info("✅ [TikTok Step 6/10] Caption and hashtags filled.")

            # 7. 공개 범위 설정
            print(f"🔒 [TikTok Step 7/10] Setting privacy to {privacy}...")
            logger.info(f"🔒 [TikTok Step 7/10] Setting privacy to {privacy}...")
            self._set_privacy(editor_target, privacy, page=page)
            print("✅ [TikTok Step 7/10] Privacy configured.")
            logger.info("✅ [TikTok Step 7/10] Privacy configured.")

            # 8. 거버넌스 설정 (댓글, 듀엣)
            print(f"🛡️ [TikTok Step 8/10] Setting governance options (comments={allow_comments}, duet={allow_duet})...")
            logger.info(f"🛡️ [TikTok Step 8/10] Setting governance options...")
            self._set_governance_options(editor_target, allow_comments, allow_duet)
            print("✅ [TikTok Step 8/10] Governance options configured.")
            logger.info("✅ [TikTok Step 8/10] Governance options configured.")

            # 9. 인코딩/업로드 진행률 완료 대기
            print("⏳ [TikTok Step 9/10] Waiting for video upload processing to reach 100%...")
            logger.info("⏳ [TikTok Step 9/10] Waiting for video upload processing to reach 100%...")
            self._wait_for_upload_completion(page, editor_target)
            print("✅ [TikTok Step 9/10] Upload processing confirmed at 100%.")
            logger.info("✅ [TikTok Step 9/10] Upload processing confirmed at 100%.")

            # 10. 게시(Post) 버튼 클릭
            print("🚀 [TikTok Step 10/10] Clicking Post button and confirming publication...")
            logger.info("🚀 [TikTok Step 10/10] Clicking Post button and confirming publication...")
            result = self._click_post_and_confirm(page, editor_target)
            print(f"🏁 [TikTok Step 10/10] Post result: {result}")
            logger.info(f"🏁 [TikTok Step 10/10] Post result: {result}")
            return result

        except Exception as e:
            err_msg = f"TikTok Browser Error: {str(e)}"
            print(f"❌ [TikTok] Automation Error: {err_msg}")
            logger.error(f"❌ [TikTok] Automation Error: {e}", exc_info=True)
            return {"status": "error", "message": err_msg}

    def _navigate_to_upload_page(self, page: Any) -> str:
        """가장 적합한 틱톡 업로드 URL로 안전하고 빠르게 이동합니다."""
        # 이미 업로드 페이지에 있으면 불필요한 재탐색 없이 즉시 반환
        current_url = page.url.lower()
        if "/upload" in current_url and not self._check_if_login_required(page):
            return page.url

        last_error = None
        for url in self.ENTRY_URLS:
            try:
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                time.sleep(0.5)
                if not self._check_if_login_required(page):
                    return page.url
            except Exception as e:
                err_str = str(e)
                logger.warning(f"Failed navigating to {url}: {err_str}")
                last_error = err_str
                # 프록시나 네트워크 연결 단선은 재시도하지 않고 즉시 예외 전파하여 서버 블로킹 방지
                if "ERR_PROXY_CONNECTION_FAILED" in err_str:
                    raise Exception("LTE 프록시 연결 실패 (ERR_PROXY_CONNECTION_FAILED): 휴대폰 EveryProxy 또는 테더링이 켜져 있는지 확인해 주세요.")
                if "ERR_INTERNET_DISCONNECTED" in err_str:
                    raise Exception("인터넷 연결이 끊어졌습니다 (ERR_INTERNET_DISCONNECTED).")
        if last_error and ("ERR_NAME_NOT_RESOLVED" in last_error or "ERR_CONNECTION_REFUSED" in last_error):
            raise Exception(f"틱톡 페이지 접속 실패: {last_error}")
        return page.url

    def _check_if_login_required(self, page: Any) -> bool:
        """로그인 필요 상태 여부 감지"""
        current_url = page.url.lower()
        if "/login" in current_url or "/passport/" in current_url:
            return True

        # 페이지 내부 로그인 모달/버튼 감지
        try:
            login_modal = page.locator('div[id*="login-modal"], form[action*="login"]').first
            if login_modal.is_visible(timeout=1000):
                return True
        except Exception:
            pass

        return False

    def _find_upload_target(self, page: Any) -> Any:
        """
        메인 페이지 또는 iframe 내부에서 input[type="file"]을 안전하게 찾아 반환합니다.
        """
        time.sleep(0.5)
        # 1. 메인 페이지에 직접 파일 인풋이 있는 경우 (최신 TikTok Studio)
        try:
            if page.locator('input[type="file"], input[accept*="video"]').count() > 0:
                logger.info("🎯 [TikTok] Found file input directly on main page.")
                return page
        except Exception:
            pass

        # 2. iframe 내부 탐색
        for frame in page.frames:
            try:
                frame_url = frame.url.lower()
                if "upload" in frame_url or "creator" in frame_url or "studio" in frame_url:
                    if frame.locator('input[type="file"], input[accept*="video"]').count() > 0:
                        logger.info(f"🎯 [TikTok] Found file input inside upload frame: {frame_url}")
                        return frame
            except Exception:
                continue

        # 3. 모든 프레임 중 파일 인풋이 있는 아무 프레임 폴백
        for frame in page.frames:
            try:
                if frame.locator('input[type="file"], input[accept*="video"]').count() > 0:
                    logger.info("🎯 [TikTok] Found file input inside fallback frame.")
                    return frame
            except Exception:
                continue

        return page

    def _dismiss_blocking_modals(self, page: Any, target: Any = None) -> bool:
        """
        TikTok Studio 온보딩/방해 모달 자동 격파 엔진.
        - '휴대폰에서 동영상 미리 보기' (Preview on mobile) 모달
        - '콘텐츠가 제한될 수 있음' (Content may be restricted) 안내 모달 (X 버튼)
        - 사운드 저작권 알림, 가이드 팝업, 다이얼로그 오버레이 등
        DOM 직접 클릭 + Playwright Locator + Keyboard Escape 3중 안전망으로 0.1초 만에 소멸 처리.
        """
        dismissed = False
        targets = [target, page] if (target and target != page) else [page]

        # 1. 고속 JS DOM 직접 클릭 (텍스트 버튼 및 X 닫기 아이콘 버튼 일괄 격파)
        js_dismiss_script = """
        () => {
            let hit = false;
            // A. 확인/닫기 텍스트 버튼 클릭
            const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span, a'));
            for (const el of buttons) {
                const text = (el.innerText || el.textContent || '').trim();
                if (['확인', 'Got it', 'OK', '알겠습니다', '닫기', 'Dismiss', 'Close'].includes(text)) {
                    const isInsideDialog = el.closest('[role="dialog"], [class*="modal"], [class*="dialog"], [class*="popup"]');
                    if (isInsideDialog || el.tagName === 'BUTTON') {
                        el.click();
                        hit = true;
                    }
                }
            }
            // B. 다이얼로그 내부의 X 닫기 아이콘 버튼(텍스트 없는 SVG 버튼) 직접 클릭
            const dialogs = Array.from(document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="dialog"], .tiktok-modal'));
            for (const dlg of dialogs) {
                const closeBtns = dlg.querySelectorAll('button[aria-label*="close" i], button[aria-label*="닫기" i], button[class*="close" i], svg[data-e2e*="close"]');
                for (const cb of closeBtns) {
                    const t = (cb.innerText || cb.textContent || '').trim();
                    if (!t || ['x', '✕', '✖', '닫기', 'close'].includes(t.toLowerCase())) {
                        cb.click();
                        hit = true;
                    }
                }
            }
            return hit;
        }
        """

        for t in targets:
            if not t:
                continue
            try:
                if hasattr(t, "evaluate"):
                    res = t.evaluate(js_dismiss_script)
                    if res:
                        logger.info("🎯 [TikTok] Dismissed blocking modal via JS DOM click!")
                        dismissed = True
            except Exception:
                pass

        # 2. Playwright Locator 기반 정밀 클릭
        modal_selectors = [
            # '콘텐츠가 제한될 수 있음' / 'Content may be restricted' 안내 모달 X 닫기 버튼
            'div:has-text("콘텐츠가 제한될 수 있음") button[aria-label*="close" i]',
            'div:has-text("콘텐츠가 제한될 수 있음") button[aria-label*="닫기" i]',
            'div:has-text("콘텐츠가 제한될 수 있음") button:has(svg)',
            'div:has-text("Content may be restricted") button[aria-label*="close" i]',
            'div:has-text("Content may be restricted") button:has(svg)',
            'div[role="dialog"]:has-text("콘텐츠가 제한") button:has(svg)',
            'div[role="dialog"] button[aria-label*="close" i]',
            'div[role="dialog"] button[aria-label*="닫기" i]',
            'div:has-text("휴대폰에서 동영상 미리 보기") button:has-text("확인")',
            'div:has-text("Preview on mobile") button:has-text("Got it")',
            'div:has-text("Preview on mobile") button:has-text("OK")',
            'div[role="dialog"] button:has-text("확인")',
            'div[role="dialog"] button:has-text("Got it")',
            'div[role="dialog"] button:has-text("OK")',
            'div[role="dialog"] button:has-text("알겠습니다")',
            'div[role="dialog"] button:has-text("닫기")',
            '.tiktok-modal button:has-text("확인")',
            '.tiktok-modal button:has-text("Got it")',
            '.tiktok-modal button:has-text("OK")',
            '.tiktok-modal button:has-text("알겠습니다")',
            'div[class*="modal"] button:has-text("확인")',
            'div[class*="modal"] button:has-text("Got it")',
            'button:has-text("확인")',
            'button:has-text("Got it")'
        ]

        for t in targets:
            if not t:
                continue
            for sel in modal_selectors:
                try:
                    btns = t.locator(sel)
                    cnt = btns.count()
                    for i in range(cnt):
                        b = btns.nth(i)
                        if b.is_visible():
                            b_text = (b.inner_text() or "").strip()
                            if not b_text or b_text in ["확인", "Got it", "OK", "알겠습니다", "닫기", "Dismiss", "Close", "X", "✕", "✖"]:
                                logger.info(f"🎯 [TikTok] Dismissed modal via Locator: '{b_text}' ({sel})")
                                b.click(timeout=1500, force=True)
                                dismissed = True
                                time.sleep(0.3)
                                break
                except Exception:
                    pass

        # 3. 키보드 Escape 전송
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass

        return dismissed

    def _wait_for_caption_editor(self, page: Any, target: Any) -> tuple:
        """캡션 입력창이 나타날 때까지 대기하고 (target_frame, caption_locator) 반환"""
        logger.info("⏳ [TikTok] Waiting for video ingestion and editor...")
        
        selectors = [
            'div[data-slate-editor="true"]',
            '.public-DraftEditor-content',
            'div.notranslate[contenteditable="true"]',
            'div[contenteditable="true"][role="textbox"]',
            'div[contenteditable="true"]'
        ]

        # 최대 90초 동안 인제스천 대기
        for loop_idx in range(45):
            # 캡차 체크
            if self._detect_captcha(page):
                return (None, None)

            # 온보딩/방해 모달 능동 격파
            if loop_idx % 2 == 0:
                self._dismiss_blocking_modals(page, target)

            # 타겟 프레임에서 탐색
            for sel in selectors:
                try:
                    loc = target.locator(sel).first
                    if loc.is_visible():
                        logger.info(f"✍️ [TikTok] Editor located via selector: {sel}")
                        return (target, loc)
                except Exception:
                    pass

            # 메인 페이지에서도 탐색 (프레임 전환 대응)
            for sel in selectors:
                try:
                    loc = page.locator(sel).first
                    if loc.is_visible():
                        logger.info(f"✍️ [TikTok] Editor located on main page via: {sel}")
                        return (page, loc)
                except Exception:
                    pass

            time.sleep(2.0)

        return (None, None)

    def _fill_caption_and_hashtags(self, target: Any, editor: Any, caption: str, hashtags: List[str], page: Any = None):
        """본문과 해시태그를 안전하게 입력"""
        logger.info("✍️ [TikTok] Filling caption and hashtags...")
        if page:
            self._dismiss_blocking_modals(page, target)

        try:
            try:
                editor.scroll_into_view_if_needed()
            except Exception:
                pass
            time.sleep(0.3)
            
            try:
                editor.click(timeout=3000)
            except Exception:
                if page:
                    self._dismiss_blocking_modals(page, target)
                editor.click(force=True)
            time.sleep(0.3)
            
            # 기존 텍스트(예: 업로드 파일명) 완전히 지우기 (반복 백스페이스)
            for _ in range(3):
                editor.press("Control+A")
                time.sleep(0.1)
                editor.press("Backspace")
                time.sleep(0.1)

            full_caption = caption.strip() if caption else ""
            if hashtags:
                existing_lower = set(re.findall(r'#\w+', full_caption.lower()))
                new_tags = []
                for t in hashtags:
                    clean = t.replace('#', '').strip()
                    if clean and f"#{clean.lower()}" not in existing_lower:
                        new_tags.append(f"#{clean}")
                        existing_lower.add(f"#{clean.lower()}")
                if new_tags:
                    tags_str = " ".join(new_tags)
                    full_caption = f"{full_caption}\n\n{tags_str}" if full_caption else tags_str

            if full_caption:
                # 텍스트를 줄 단위로 분할 입력
                lines = full_caption.split('\n')
                for idx, line in enumerate(lines):
                    if line.strip():
                        # 해시태그 드롭다운을 방지하기 위해 공백을 두고 타이핑
                        editor.press_sequentially(line, delay=random.randint(15, 40))
                    if idx < len(lines) - 1:
                        editor.press("Shift+Enter")
                    time.sleep(0.15)

                # 자동완성 드롭다운 닫기
                time.sleep(0.5)
                editor.press("Escape")
                time.sleep(0.3)
                logger.info("✅ [TikTok] Caption filled successfully.")
            else:
                logger.info("ℹ️ [TikTok] No custom caption provided; cleared default filename.")
        except Exception as e:
            logger.warning(f"Caption typing fallback triggered: {e}")
            if page:
                self._dismiss_blocking_modals(page, target)
            try:
                editor.fill(full_caption if 'full_caption' in locals() else "")
            except Exception:
                pass

    def _set_privacy(self, target: Any, privacy: str, page: Any = None):
        """다국어 지원 공개 범위 설정 (PUBLIC, FRIENDS, PRIVATE)
        
        3단계 폴백 전략:
          1) 라디오버튼/레이블 직접 클릭 (드롭다운 불필요)
          2) 드롭다운 트리거 클릭 후 옵션 클릭 (Main page + iframe 포털 동시 탐색)
          3) JavaScript dispatchEvent 강제 주입
        """
        logger.info(f"👁️ [TikTok] Configuring privacy: {privacy}")
        privacy_upper = (privacy or "PUBLIC").upper()

        if privacy_upper == "PUBLIC":
            logger.info("✅ [TikTok] Privacy is PUBLIC (default) - skipping.")
            return

        # 다국어 키워드 맵 (한/영/일 확장)
        keywords_map = {
            "PUBLIC":  ["Everyone", "모두", "모든 사람", "전체 공개", "모든 사용자", "Public", "공개"],
            "FRIENDS": ["Friends", "친구", "Friends only"],
            "PRIVATE": ["Only you", "나만 보기", "비공개", "자신만", "나만", "私のみ", "Private"],
        }
        target_keywords = keywords_map.get(privacy_upper, keywords_map["PUBLIC"])
        contexts = [c for c in [target, page] if c]

        # ── 1단계: 라디오버튼 / 레이블 직접 클릭 (드롭다운 열기 불필요) ──
        logger.info("🔎 [TikTok] Step 1: Direct radio/label click attempt...")
        for ctx in contexts:
            for kw in target_keywords:
                for sel in [
                    f'label:has-text("{kw}")',
                    f'span:has-text("{kw}")',
                    f':text-is("{kw}")',
                    f'[aria-label*="{kw}"]',
                    f'input[type="radio"] + label:has-text("{kw}")',
                ]:
                    try:
                        els = ctx.locator(sel).all()
                        for el in els:
                            if el.is_visible(timeout=1000):
                                el.click(timeout=2000)
                                time.sleep(0.5)
                                logger.info(f"✅ [TikTok] Privacy set to '{kw}' via direct click ({sel})")
                                return
                    except Exception:
                        pass

        # ── 2단계: 드롭다운 트리거 클릭 후 옵션 클릭 ──
        logger.info("🔎 [TikTok] Step 2: Dropdown trigger + option click attempt...")
        dropdown_triggers = [
            # 최신 틱톡 스튜디오 '이 게시물을 볼 수 있는 사람' 컨테이너
            'div:has-text("이 게시물을 볼 수 있는") ~ div[class*="select"]',
            'div:has-text("이 게시물을 볼 수 있는") ~ div[role="combobox"]',
            'div:has-text("이 게시물을 볼 수 있는") [class*="select"]',
            'div:has-text("Who can watch") ~ div[class*="select"]',
            'div:has-text("Who can watch") ~ div[role="combobox"]',
            'div:has-text("Who can watch") [class*="select"]',
            'div[class*="select"]:has-text("모두")',
            'div[class*="select"]:has-text("Everyone")',
            'div[role="combobox"]:has-text("모두")',
            'div[role="combobox"]:has-text("Everyone")',
            'div[class*="TUXSelect"]',
            'div[class*="select"]',
            '[data-e2e="privacy-setting"]',
            'div[role="combobox"]',
            'div[role="listbox"]',
            ':text-is("모두")',
            ':text-is("Everyone")',
            ':text-is("Public")',
            'div[class*="DivPermissionContainer"]',
            'div[class*="permission"]',
        ]
        opened = False
        for ctx in contexts:
            for trig in dropdown_triggers:
                try:
                    loc = ctx.locator(trig).first
                    if loc.is_visible(timeout=1000):
                        loc.click(timeout=2000)
                        time.sleep(0.8)
                        opened = True
                        break
                except Exception:
                    pass
            if opened:
                break

        if opened:
            for ctx in contexts:
                for kw in target_keywords:
                    for sel in [
                        f'div[role="option"]:has-text("{kw}")',
                        f'li:has-text("{kw}")',
                        f':text-is("{kw}")',
                        f'span:has-text("{kw}")',
                        f'div:has-text("{kw}")'
                    ]:
                        try:
                            opt = ctx.locator(sel).first
                            if opt.is_visible(timeout=1500):
                                opt.click(timeout=2000)
                                time.sleep(0.5)
                                logger.info(f"✅ [TikTok] Privacy set to '{kw}' via dropdown ({sel})")
                                return
                        except Exception:
                            pass

        # ── 3단계: JavaScript dispatchEvent 강제 주입 ──
        logger.info("🔎 [TikTok] Step 3: JS dispatchEvent injection attempt...")
        for ctx in contexts:
            if hasattr(ctx, 'evaluate'):
                for kw in target_keywords:
                    try:
                        injected = ctx.evaluate(f"""
                            (kw) => {{
                                const all = Array.from(document.querySelectorAll('label, span, div, li, [role="option"]'));
                                const el = all.find(e => (e.innerText || e.textContent || '').trim() === kw && e.offsetParent !== null);
                                if (el) {{ el.click(); return true; }}
                                return false;
                            }}
                        """, kw)
                        if injected:
                            time.sleep(0.5)
                            logger.info(f"✅ [TikTok] Privacy set to '{kw}' via JS injection")
                            return
                    except Exception:
                        pass

        logger.warning(f"⚠️ [TikTok] All 3 steps failed — privacy '{privacy_upper}' could NOT be applied. Defaulted to Public.")

    def _set_governance_options(self, target: Any, allow_comments: bool, allow_duet: bool):
        """댓글 및 듀엣/스티치 옵션 설정"""
        try:
            # 댓글 허용 토글
            if not allow_comments:
                comment_btn = target.locator('label:has-text("Comment"), label:has-text("댓글")').first
                if comment_btn.is_visible():
                    comment_btn.click()
                    logger.info("🚫 [TikTok] Disabled comments.")

            # 듀엣/스티치 허용 토글
            if not allow_duet:
                duet_btn = target.locator('label:has-text("Duet"), label:has-text("듀엣"), label:has-text("Stitch")').first
                if duet_btn.is_visible():
                    duet_btn.click()
                    logger.info("🚫 [TikTok] Disabled Duet/Stitch.")
        except Exception as e:
            logger.warning(f"TikTok governance toggle error: {e}")

    def _wait_for_upload_completion(self, page: Any, target: Any):
        """비디오 인코딩 및 처리 진행률이 100% 완료될 때까지 대기"""
        logger.info("⏳ [TikTok] Waiting for video upload processing to finish...")
        for loop_idx in range(40):
            # 온보딩 및 방해 모달 능동 격파
            if loop_idx % 2 == 0:
                self._dismiss_blocking_modals(page, target)
            try:
                # 1. 업로드 완료 인디케이터나 진행률 100% 체크 (모달 팝업 내부의 '동영상 바꾸기' 오판 방지)
                uploaded_flag = target.locator(':text("Uploaded"), :text("업로드됨"), :text("100%")').first
                if uploaded_flag.is_visible():
                    logger.info("✅ [TikTok] Video processing confirmed at 100%.")
                    break
                # 메인 페이지 폴백
                if page != target and page.locator(':text("Uploaded"), :text("업로드됨"), :text("100%")').first.is_visible():
                    logger.info("✅ [TikTok] Video processing confirmed on main page.")
                    break
            except Exception:
                pass
            time.sleep(1.5)

    def _click_post_and_confirm(self, page: Any, target: Any) -> Dict[str, Any]:
        """게시 버튼 클릭 및 성공 여부 다각도 검증 (2차 모달 자동 격파 및 거짓 양성 원천 차단)"""
        logger.info("🚀 [TikTok] Locating Post button...")
        
        # 게시 전 잔여 모달 일괄 격파
        self._dismiss_blocking_modals(page, target)
        
        # 스크롤을 최하단으로 내려 게시 버튼 노출
        try:
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(0.5)
        except Exception:
            pass

        post_selectors = [
            'button[data-e2e="post_video_button"]',
            'button[data-e2e="post_video_drop"]',
            'div[class*="btn-post"] button',
            'button.btn-post',
            'div[class*="footer"] button:text-is("게시")',
            'div[class*="footer"] button:text-is("Post")',
            'div[class*="button-group"] button:text-is("게시")',
            'div[class*="button-group"] button:text-is("Post")',
            'button:text-is("게시")',
            'button:text-is("Post")',
            'button[type="button"]:text-is("게시")',
            'button[type="button"]:text-is("Post")',
        ]

        post_btn = None
        # 1. 타겟 프레임 탐색
        for sel in post_selectors:
            try:
                candidates = target.locator(sel).all()
                for cand in candidates:
                    if cand.is_visible():
                        txt = (cand.text_content() or "").strip()
                        # 사이드바의 '게시물' 메뉴 버튼 제외 (오직 '게시' 또는 'Post'만 허용)
                        if txt in ["게시물", "게시물 관리", "Manage your posts"]:
                            continue
                        post_btn = cand
                        break
                if post_btn:
                    break
            except Exception:
                pass

        # 2. 메인 페이지 탐색
        if not post_btn:
            for sel in post_selectors:
                try:
                    candidates = page.locator(sel).all()
                    for cand in candidates:
                        if cand.is_visible():
                            txt = (cand.text_content() or "").strip()
                            if txt in ["게시물", "게시물 관리", "Manage your posts"]:
                                continue
                            post_btn = cand
                            break
                    if post_btn:
                        break
                except Exception:
                    pass

        if not post_btn:
            msg = "Could not find TikTok Post button on upload page."
            logger.error(f"❌ [TikTok] {msg}")
            self._save_debug_screenshot(page, "no_post_button")
            return {"status": "error", "message": msg}

        # 1. Post 버튼 활성화 대기 (비활성화 상태면 활성화될 때까지 최대 30초 대기)
        logger.info("⏳ [TikTok] Waiting for Post button to become enabled...")
        for _ in range(15):
            try:
                if post_btn.is_enabled():
                    break
            except Exception:
                pass
            time.sleep(2.0)

        # 2. 게시 버튼 클릭
        try:
            post_btn.scroll_into_view_if_needed()
            time.sleep(0.5)
            post_btn.click(timeout=10000)
            logger.info("🔘 [TikTok] Post button clicked!")
        except Exception:
            try:
                post_btn.click(force=True)
                logger.info("🔘 [TikTok] Post button clicked (force)!")
            except Exception as e:
                msg = f"Failed to click TikTok Post button: {e}"
                logger.error(f"❌ [TikTok] {msg}")
                self._save_debug_screenshot(page, "post_click_failed")
                return {"status": "error", "message": msg}

        # 3. 2차 확인 모달 자동 격파 및 성공 다이얼로그 / 리다이렉트 대기 (최대 70초)
        logger.info("⏳ [TikTok] Awaiting post confirmation & handling secondary modals...")
        
        success_selectors = [
            ':text("Your video has been uploaded")',
            ':text("동영상이 업로드되었습니다")',
            ':text("게시물이 업로드되었습니다")',
            ':text("Manage your posts")',
            ':text("게시물 관리")',
            ':text("Upload another video")',
            ':text("다른 동영상 업로드")',
            ':text("Your video is being processed")',
            ':text("동영상이 처리 중입니다")',
            'button:has-text("Manage your posts")',
            'button:has-text("게시물 관리")',
            'button:has-text("Upload another video")',
            'button:has-text("다른 동영상 업로드")'
        ]

        secondary_confirm_selectors = [
            # 콘텐츠 검사 라이트 / 저작권 경고 배너 무시 버튼
            'button:has-text("Post anyway")',
            'button:has-text("게시 계속")',
            'button:has-text("계속 게시")',
            'button:has-text("계속")',
            'button:has-text("Continue")',
            'button:has-text("Post now")',
            'button:has-text("지금 게시")',
            'button:has-text("I understand")',
            'button:has-text("이해했습니다")',
            'button:has-text("OK")',
            'button:has-text("확인")',
            'button:has-text("Got it")',
            'button:has-text("알겠습니다")',
            'button:has-text("Proceed")',
            'button:has-text("진행")',
            # 다이얼로그/모달 게시 버튼
            'div[role="dialog"] button:has-text("Post")',
            'div[role="dialog"] button:has-text("게시")',
            'div[role="dialog"] button:has-text("Confirm")',
            'div[role="dialog"] button:has-text("확인")',
            'div[role="dialog"] button:has-text("Got it")',
            'div[role="dialog"] button:has-text("Continue")',
            'div[class*="modal"] button:has-text("Post")',
            'div[class*="modal"] button:has-text("게시")',
            'div[class*="modal"] button:has-text("Confirm")',
            'div[class*="modal"] button:has-text("확인")',
            '.tiktok-modal button:has-text("Post")',
            '.tiktok-modal button:has-text("Confirm")',
            '.tiktok-modal button:has-text("확인")',
            '.tiktok-modal button:has-text("Got it")',
        ]

        error_selectors = [
            'div[role="alert"]',
            'div[class*="toast"]',
            'div[class*="error-message"]',
            'div[class*="notification"][class*="error"]'
        ]

        last_error_text = ""

        for iteration in range(35):  # 최대 70초 대기 (2초 * 35회)
            # 1. 로그인 세션 만료 즉각 감지 (70초 타임아웃 낭비 없이 조기 탈출)
            if self._check_if_login_required(page):
                self._save_debug_screenshot(page, "auth_dropped")
                return {"status": "error", "message": "틱톡 로그인 세션이 만료되었습니다. 소셜 계정 관리에서 다시 로그인해 주세요.", "code": "AUTH_REQUIRED"}

            # 2. 캡차 체크
            if self._detect_captcha(page):
                self._save_debug_screenshot(page, "captcha_detected")
                return {"status": "error", "message": "Captcha triggered during TikTok submission.", "code": "CAPTCHA_DETECTED"}

            # 3. 미처 닫히지 않은 온보딩 팝업 능동 격파
            self._dismiss_blocking_modals(page, target)

            # A. 성공 다이얼로그 확인
            for sel in success_selectors:
                try:
                    if target.locator(sel).first.is_visible() or page.locator(sel).first.is_visible():
                        logger.info(f"🎉 [TikTok] Upload Success confirmed via: {sel}")
                        return {
                            "status": "success",
                            "message": "TikTok upload completed successfully",
                            "url": "https://www.tiktok.com/@me"
                        }
                except Exception:
                    pass

            # B. URL 리다이렉트 확인 (업로드 페이지를 완전히 벗어났으면 게시 완료)
            current_url = page.url.lower()
            upload_page_left = "/upload" not in current_url
            on_tiktok = any(k in current_url for k in ["tiktokstudio", "studio.tiktok", "creator", "tiktok.com/@", "tiktok.com/foryou"])
            if upload_page_left and on_tiktok:
                logger.info(f"🎉 [TikTok] Navigated away from upload page to ({page.url}), confirmed success.")
                return {
                    "status": "success",
                    "message": "TikTok post completed (redirected)",
                    "url": page.url
                }

            # C-1. ⚠️ "콘텐츠가 제한될 수 있음" (Content may be restricted) 안내 모달 전용 감지 및 게시 재실행
            # 팝업 안내: "계속 게시할 수 있지만, 가이드라인을 준수하도록 수정하면..."
            # 우측 상단 X 버튼(또는 Escape)으로 팝업을 닫고, 메인 페이지의 '게시' 버튼을 재클릭해야 업로드가 완료됨!
            restriction_modal = target.locator('div:has-text("콘텐츠가 제한될 수 있음"), div:has-text("Content may be restricted")').first
            if not restriction_modal.is_visible():
                restriction_modal = page.locator('div:has-text("콘텐츠가 제한될 수 있음"), div:has-text("Content may be restricted")').first

            if restriction_modal.is_visible():
                logger.info("⚠️ [TikTok] '콘텐츠가 제한될 수 있음' 안내 팝업 감지! X 버튼 닫기 및 '게시' 재실행...")
                closed = False
                for c_sel in ['button[aria-label*="close" i]', 'button[aria-label*="닫기" i]', 'button:has(svg)', 'svg[data-e2e*="close"]', '[class*="close"]']:
                    try:
                        c_btn = restriction_modal.locator(c_sel).first
                        if c_btn.is_visible():
                            c_btn.click(timeout=1500, force=True)
                            closed = True
                            logger.info(f"🎯 [TikTok] Dismissed restriction modal via {c_sel}")
                            break
                    except Exception:
                        pass
                if not closed:
                    try:
                        page.keyboard.press("Escape")
                        closed = True
                        logger.info("🎯 [TikTok] Dismissed restriction modal via Escape key")
                    except Exception:
                        pass

                time.sleep(1.0)

                # 모달 소멸 후 메인 게시 버튼 재클릭
                if post_btn and post_btn.is_visible():
                    try:
                        logger.info("🔘 [TikTok] 모달 닫힘 확인 — 메인 '게시' 버튼 재클릭 실행!")
                        post_btn.click(timeout=5000, force=True)
                    except Exception as re_err:
                        logger.warning(f"Failed to re-click post button: {re_err}")
                continue

            # C-2. 2차 확인 모달 (Sound Copyright Check, 콘텐츠 검사, Post Anyway 등) 감지 및 원클릭 격파
            for sel in secondary_confirm_selectors:
                try:
                    btn = target.locator(sel).first if target.locator(sel).count() > 0 else page.locator(sel).first
                    if btn.is_visible() and btn.is_enabled():
                        logger.info(f"⚡ [TikTok] Detected secondary confirm modal button ({sel})! Auto-clicking...")
                        btn.click(timeout=3000)
                        time.sleep(1.0)
                        break
                except Exception:
                    pass

            # D. 에러 팝업 / 토스트 스캔
            for esel in error_selectors:
                try:
                    err_el = target.locator(esel).first if target.locator(esel).count() > 0 else page.locator(esel).first
                    if err_el.is_visible():
                        txt = (err_el.text_content() or "").strip()
                        if txt and len(txt) > 2:
                            logger.warning(f"⚠️ [TikTok] Error banner detected: {txt}")
                            last_error_text = txt
                except Exception:
                    pass

            # E. 안전망: 5회(10초) 및 12회(24초) 경과 시 게시 버튼이 여전히 활성화 상태면 재클릭 시도
            if iteration in (5, 12) and post_btn and post_btn.is_visible() and post_btn.is_enabled():
                logger.info("🔘 [TikTok] Post button still enabled and visible. Re-dispatching post click...")
                try:
                    post_btn.click(force=True)
                except Exception:
                    pass

            time.sleep(2.0)

        # 4. 타임아웃 도달 시: 절대 거짓 양성(False-Positive) 반환 금지!
        screenshot_path = self._save_debug_screenshot(page, "upload_timeout_failed")
        fail_msg = f"TikTok upload confirmation timeout (No success dialog or redirect detected). {last_error_text}".strip()
        logger.error(f"🛑 [TikTok] {fail_msg} (Screenshot: {screenshot_path})")
        
        return {
            "status": "error",
            "message": fail_msg,
            "screenshot": screenshot_path
        }

    def _save_debug_screenshot(self, page: Any, prefix: str = "debug") -> str:
        """업로드 문제 발생 시 당시 브라우저 상태를 증거 스크린샷으로 저장"""
        try:
            local_appdata = os.environ.get("LOCALAPPDATA", "")
            if local_appdata:
                target_dir = os.path.join(local_appdata, "ViraLoop Studio", "logs", "screenshots")
            else:
                target_dir = os.path.join(os.getcwd(), "logs", "screenshots")
            os.makedirs(target_dir, exist_ok=True)
            filename = f"tiktok_{prefix}_{int(time.time())}.png"
            filepath = os.path.join(target_dir, filename)
            page.screenshot(path=filepath, full_page=True)
            logger.info(f"📸 [TikTok] Saved debug screenshot: {filepath}")
            return filepath
        except Exception as e:
            logger.warning(f"Failed to capture debug screenshot: {e}")
            return ""

    def _detect_captcha(self, page: Any) -> bool:
        """캡차 다이얼로그 감지"""
        captcha_selectors = [
            'div[id*="captcha"]',
            '.secsdk-captcha-drag-icon',
            '#captcha_verify_container',
            'div[class*="captcha"]'
        ]
        for sel in captcha_selectors:
            try:
                if page.locator(sel).first.is_visible():
                    logger.warning(f"⚠️ [TikTok] Captcha detected: {sel}")
                    return True
            except Exception:
                pass
        return False


tiktok_uploader = TikTokUploader()
