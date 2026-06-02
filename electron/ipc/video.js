/**
 * Electron IPC Handler - Video Generation
 *
 * Text-to-Video (T2V), Image-to-Video (I2V) DOM automation,
 * and video status polling.
 */

import { acquireGlobalThrottle } from '../throttleManager.js'

/**
 * Register video-generation-related IPC handlers.
 *
 * @param {Electron.IpcMain} ipcMain
 * @param {object} deps - Shared dependencies from main process
 */
export function registerVideoIPC(ipcMain, deps) {
  const {
    getFlowView, getMainWindow, trustedClickOnFlowView, sessionFetch, flowPageFetch,
    parseFlowResponse, getRecaptchaToken, configureFlowMode, switchFlowToVideoMode,
    getCapturedProjectId, setCapturedProjectId,
    getPendingVideoGeneration, setPendingVideoGeneration,
    getPendingI2VInjection, setPendingI2VInjection,
    setPendingSeedValue,
    SESSION_URL, VIDEO_T2V_URL, VIDEO_I2V_URL, VIDEO_I2V_START_END_URL, VIDEO_STATUS_URL, VIDEO_UPSCALE_URL,
    API_HEADERS, FLOW_URL,
  } = deps

  // LOCAL helper — 비디오 응답에서 generation ID (UUID) 추출
  function extractVideoGenerationId(data) {
    const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || '').trim())
    // media[].name (video entries)
    if (Array.isArray(data?.media)) {
      for (const m of data.media) {
        if ((m?.video || /video/i.test(String(m?.mediaMetadata?.mediaType || ''))) && isUuid(m?.name)) {
          return m.name
        }
      }
    }
    // workflows[].metadata.primaryMediaId
    if (Array.isArray(data?.workflows)) {
      for (const w of data.workflows) {
        if (isUuid(w?.metadata?.primaryMediaId)) return w.metadata.primaryMediaId
      }
    }
    // Legacy fallbacks
    return data?.asyncVideoGenerationOperations?.[0]?.operationId
      || data?.responses?.[0]?.generationId
      || null
  }

  // Google Flow Approve 버튼 감지 및 자동 클릭 헬퍼 함수
  async function clickApproveButtonIfPresent(flowView, profileId) {
    console.log('[Flow Video] [ApproveCheck] Checking for Approve button...');
    const maxAttempts = 20; // 20 * 500ms = 10초 대기
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const btnCheck = await flowView.webContents.executeJavaScript(`
        (function() {
          const els = Array.from(document.querySelectorAll('button, [role="button"], div, span, p, a'));
          for (const el of els) {
            const text = el.textContent.trim().toLowerCase();
            if (text.includes('approve') || text.includes('승인')) {
              const rect = el.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                return { found: true, disabled: el.disabled || false };
              }
            }
          }
          return { found: false };
        })()
      `).catch(() => ({ found: false }));

      if (btnCheck.found) {
        if (btnCheck.disabled) {
          console.log('[Flow Video] [ApproveCheck] Approve button found but disabled, waiting 500ms...');
        } else {
          console.log('[Flow Video] [ApproveCheck] Approve button found active. Clicking...');
          const approveBtnSelector = `(function() {
            const els = Array.from(document.querySelectorAll('button, [role="button"], div, span, p, a'));
            for (const el of els) {
              const text = el.textContent.trim().toLowerCase();
              if (text.includes('approve') || text.includes('승인')) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) return el;
              }
            }
            return null;
          })()`;
          const clickRes = await trustedClickOnFlowView(approveBtnSelector, profileId);
          console.log('[Flow Video] [ApproveCheck] Trusted click on Approve button result:', clickRes);
          return { success: clickRes?.success ?? false, clicked: true };
        }
      }
      await new Promise(r => setTimeout(r, 500));
    }
    console.log('[Flow Video] [ApproveCheck] Approve button not found or did not become active within timeout.');
    return { success: true, clicked: false };
  }

  // Helper to ensure Flow is on a project page. If on landing page, click "+ New project" or equivalent.
  async function ensureOnProjectPage(flowView) {
    // 1. Auto dismiss cookies/consent banners if found
    await flowView.webContents.executeJavaScript(`
      (function() {
        const dismissBtns = Array.from(document.querySelectorAll('button'));
        const agreeBtn = dismissBtns.find(b => b.textContent.trim().toLowerCase() === 'agree' || b.textContent.trim().toLowerCase() === 'agree & proceed');
        if (agreeBtn) {
          agreeBtn.click();
          console.log('[DOM] Auto-clicked Cookie Agree button');
          return;
        }
        const noThanksBtn = dismissBtns.find(b => b.textContent.trim().toLowerCase() === 'no thanks');
        if (noThanksBtn) {
          noThanksBtn.click();
          console.log('[DOM] Auto-clicked No thanks button');
          return;
        }
        const dismissBtn = dismissBtns.find(b => b.textContent.trim().toLowerCase().includes('dismiss') || b.textContent.trim().toLowerCase() === 'close');
        if (dismissBtn) {
          dismissBtn.click();
          console.log('[DOM] Auto-clicked Dismiss/Close button');
        }
      })()
    `).catch(() => {});

    const currentUrl = flowView.webContents.getURL()
    console.log('[Flow Video] ensureOnProjectPage checking URL:', currentUrl)
    
    if (currentUrl.includes('/project/') || currentUrl.includes('/tools/flow/')) {
      return { success: true }
    }

    // If we're not even on labs.google/fx, load it
    if (!currentUrl.includes('labs.google/fx')) {
      console.log('[Flow Video] Not on Flow. Loading URL:', FLOW_URL)
      await flowView.webContents.loadURL(FLOW_URL)
      await new Promise(r => setTimeout(r, 4000))
    }

    // Try to click New project button
    console.log('[Flow Video] Attempting to click New project button...')
    const clicked = await flowView.webContents.executeJavaScript(`
      (function() {
        for (const b of document.querySelectorAll('button')) {
          const text = b.textContent.trim().toLowerCase();
          if (text.includes('new project') || text.includes('새 프로젝트') || text.includes('새프로젝트') || text.includes('add_2')) {
            b.click();
            return 'button_clicked';
          }
        }
        for (const b of document.querySelectorAll('button')) {
          if (b.textContent.includes('+')) {
            b.click();
            return 'plus_button_clicked';
          }
        }
        return null;
      })()
    `).catch(() => null)

    if (clicked) {
      console.log('[Flow Video] New project click result:', clicked)
      // Wait up to 15 seconds for project URL redirection
      for (let w = 0; w < 30; w++) {
        await new Promise(r => setTimeout(r, 500))
        const checkUrl = flowView.webContents.getURL()
        if (checkUrl.includes('/project/') || checkUrl.includes('/tools/flow/')) {
          console.log('[Flow Video] Successfully redirected to project:', checkUrl)
          return { success: true }
        }
      }
      return { success: false, error: 'Timed out waiting for project creation/redirection' }
    }

    return { success: false, error: 'Failed to find and click New project button' }
  }

  // Text-to-Video generation (DOM 자동화 — 페이지가 reCAPTCHA 자체 처리)
  ipcMain.handle('flow:generate-video-t2v', async (event, {
    token, prompt, projectId, model, aspectRatio, duration, videoBatchCount, seed, profileId
  }) => {
    // Enforce global rate-limit throttling
    await acquireGlobalThrottle()

    const flowView = getFlowView(profileId)
    const mainWindow = getMainWindow()
    if (!prompt) return { success: false, error: 'No prompt' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    // Seed: page-level fetch patch injection
    if (global.setFlowPageInject) {
      global.setFlowPageInject(profileId, {
        seed: typeof seed === 'number' && Number.isFinite(seed) ? seed : null,
        aspectRatio: null,
        references: null,
        i2v: null
      })
    }

    console.log('[Flow Video T2V] Starting DOM-triggered video generation:', prompt?.substring(0, 50), seed != null ? `(seed: ${seed})` : '(seed: random)')

    try {
      // 0. Flow 프로젝트 페이지 확인 및 자동 진입
      const pageCheck = await ensureOnProjectPage(flowView)
      if (!pageCheck.success) {
        return { success: false, error: pageCheck.error || 'Not on Flow project page. Please open a Flow project first.' }
      }

      // 1. 비디오 모드로 전환 (배치 카운트 적용)
      const effectiveBatchCount = Math.max(1, Math.min(4, videoBatchCount || 1))
      const modeResult = await configureFlowMode('VIDEO', effectiveBatchCount, profileId)
      if (!modeResult.success) {
        return { success: false, error: modeResult.error || 'Failed to switch to video mode' }
      }
      console.log('[Flow Video T2V] Video mode active:', modeResult.method)

      // 2. 프롬프트 입력 (이미지와 동일한 Slate 에디터 사용)
      const promptBounds = flowView.getBounds()
      const promptWasHidden = (promptBounds.width === 0 || promptBounds.height === 0)
      if (promptWasHidden) {
        const { width, height } = mainWindow.getContentBounds()
        flowView.setBounds({ x: width + 5000, y: 0, width, height })
        await new Promise(r => setTimeout(r, 300))
      }

      const promptResult = await flowView.webContents.executeJavaScript(`
        (async function() {
          const promptText = ${JSON.stringify(prompt)};
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));

          // Slate editor 찾기 (사이드바, 에이전트, 서브패널 배제)
          let editor = document.querySelector(".composer-container [data-slate-editor='true'], .prompt-container [data-slate-editor='true'], [data-slate-editor='true']:not([class*='sidebar'] *):not([class*='agent'] *):not(#af-bot-panel *)");
          
          if (!editor) {
            const candidates = Array.from(document.querySelectorAll("div[role='textbox'][contenteditable='true'], [contenteditable='true']:not([aria-hidden])"));
            editor = candidates.find(el => {
              let parent = el.parentElement;
              while (parent) {
                const id = (parent.id || '').toLowerCase();
                const cls = (parent.className || '').toString().toLowerCase();
                if (
                  id.includes('sidebar') || id.includes('agent') || id.includes('instruction') || id.includes('drawer') || id.includes('panel') ||
                  cls.includes('sidebar') || cls.includes('agent') || cls.includes('instruction') || cls.includes('drawer') || cls.includes('panel') ||
                  cls.includes('chat-history') || cls.includes('history')
                ) {
                  return false;
                }
                parent = parent.parentElement;
              }
              const rect = el.getBoundingClientRect();
              return rect.width > 100 && rect.height > 20;
            });
          }

          if (!editor) return { success: false, error: 'Editor not found' };

          const isSlate = !!(editor.matches?.("[data-slate-editor='true']") || editor.querySelector?.("[data-slate-node]"));

          // Slate React API로 프롬프트 주입
          let injected = false;
          if (isSlate) {
            try {
              const reactKeys = Object.keys(editor).filter(k => k.startsWith('__react'));
              let slateEditor = null;
              for (const key of reactKeys) {
                const stack = [editor[key]];
                const visited = new Set();
                let guard = 0;
                while (stack.length > 0 && guard < 5000) {
                  const node = stack.pop(); guard++;
                  if (!node || typeof node !== 'object' || visited.has(node)) continue;
                  visited.add(node);
                  const candidate = node?.memoizedProps?.node || node?.memoizedProps?.editor
                    || node?.pendingProps?.node || node?.pendingProps?.editor
                    || node?.stateNode?.editor || node?.editor;
                  if (candidate && typeof candidate.apply === 'function') { slateEditor = candidate; break; }
                  if (node.child) stack.push(node.child);
                  if (node.sibling) stack.push(node.sibling);
                  if (node.return) stack.push(node.return);
                  if (node.alternate) stack.push(node.alternate);
                }
                if (slateEditor) break;
              }
              if (slateEditor) {
                try {
                  const existingText = slateEditor.children?.[0]?.children?.[0]?.text || '';
                  if (existingText) slateEditor.apply({ type: 'remove_text', path: [0, 0], offset: 0, text: existingText });
                } catch {}
                slateEditor.apply({ type: 'insert_text', path: [0, 0], offset: 0, text: promptText });
                if (typeof slateEditor.onChange === 'function') slateEditor.onChange();
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(200);
                const modelText = (slateEditor.children?.[0]?.children?.[0]?.text || '').trim();
                if (modelText && modelText.includes(promptText.slice(0, 40))) injected = true;
              }
            } catch {}
          }

          // Fallback: execCommand
          if (!injected) {
            try {
              editor.focus(); editor.click(); await sleep(100);
              if (isSlate) {
                const sel = window.getSelection(); const range = document.createRange();
                const stringNodes = Array.from(editor.querySelectorAll('[data-slate-string]'))
                  .map(n => n.firstChild).filter(n => n && n.nodeType === Node.TEXT_NODE);
                if (stringNodes.length > 0) {
                  range.setStart(stringNodes[0], 0);
                  const last = stringNodes[stringNodes.length - 1];
                  range.setEnd(last, (last.textContent || '').length);
                } else {
                  const zeroNode = Array.from(editor.querySelectorAll('[data-slate-zero-width]'))
                    .map(n => n.firstChild).find(n => n && n.nodeType === Node.TEXT_NODE);
                  if (zeroNode) { range.setStart(zeroNode, 0); range.setEnd(zeroNode, (zeroNode.textContent || '').length); }
                  else range.selectNodeContents(editor);
                }
                sel.removeAllRanges(); sel.addRange(range);
              } else {
                document.execCommand('selectAll', false, null);
              }
              document.execCommand('delete', false, null); await sleep(50);
              try { editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: promptText })); } catch {}
              const inserted = document.execCommand('insertText', false, promptText);
              if (inserted) { injected = true; }
            } catch {}
          }

          if (!injected) return { success: false, error: 'Prompt injection failed' };
          await sleep(500);
          return { success: true };
        })()
      `)

      if (promptWasHidden) {
        flowView.setBounds(promptBounds)
        await new Promise(r => setTimeout(r, 200))
      }

      if (!promptResult?.success) {
        return { success: false, error: promptResult?.error || 'Prompt injection failed' }
      }
      console.log('[Flow Video T2V] Prompt injected successfully')

      // 3. CDP 비디오 응답 캡처 Promise 설정
      let resolveVideo = null
      let videoTimeout = null
      const videoResponsePromise = new Promise((resolve) => {
        videoTimeout = setTimeout(() => {
          if (getPendingVideoGeneration()) {
            setPendingVideoGeneration(null)
            resolve({ error: true, message: 'Video response timeout (30s)' })
          }
        }, 30000) // 비디오 제출은 이미지보다 빠름 (초기 응답만 캡처)
        resolveVideo = resolve
      })

      // 4. Generate 버튼 Trusted Click
      const generateBtnSelector = `(function() {
        try {
          const xr = document.evaluate("//button[.//i[text()='arrow_forward']]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (xr.singleNodeValue && !xr.singleNodeValue.disabled) return xr.singleNodeValue;
        } catch {}
        for (const b of document.querySelectorAll('button')) {
          for (const icon of b.querySelectorAll('i')) {
            if (icon.textContent.trim() === 'arrow_forward' && !b.disabled) return b;
          }
        }
        return null;
      })()`

      // 4-a. 클릭 전 인간 행동 시뮬레이션 (reCAPTCHA 점수 향상)
      try {
        await flowView.webContents.executeJavaScript(`
          (async () => {
            try {
              const moves = 3 + Math.floor(Math.random() * 3)
              for (let i = 0; i < moves; i++) {
                document.dispatchEvent(new MouseEvent('mousemove', {
                  clientX: 200 + Math.random() * 800,
                  clientY: 100 + Math.random() * 500,
                  bubbles: true
                }))
                await new Promise(r => setTimeout(r, 120 + Math.random() * 180))
              }
              const scrollAmt = 30 + Math.random() * 60
              window.scrollBy(0, scrollAmt)
              await new Promise(r => setTimeout(r, 150 + Math.random() * 250))
              window.scrollBy(0, -scrollAmt * 0.6)
              await new Promise(r => setTimeout(r, 100 + Math.random() * 150))
              const btn = (() => { for(const b of document.querySelectorAll('button')) { for(const i of b.querySelectorAll('i')) { if(i.textContent.trim()==='arrow_forward') return b } } return null })()
              if (btn) {
                const rect = btn.getBoundingClientRect()
                btn.dispatchEvent(new MouseEvent('mousemove', {
                  clientX: rect.left + rect.width * (0.3 + Math.random() * 0.4),
                  clientY: rect.top  + rect.height * (0.3 + Math.random() * 0.4),
                  bubbles: true
                }))
                btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
                await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
              }
            } catch(e) {}
          })()
        `)
        console.log('[Flow Video T2V] Human behavior simulation complete')
      } catch (simErr) { /* non-fatal */ }

      // ★ 클릭 전 pendingVideoGeneration을 먼저 무장(Arm)하여 레이스 컨디션 방지!
      const videoSetAt = Date.now() / 1000 - 5
      setPendingVideoGeneration({
        setAt: videoSetAt,
        resolve: (result) => {
          clearTimeout(videoTimeout)
          resolveVideo(result)
        }
      })
      console.log('[Flow Video T2V] pendingVideoGeneration armed before click...')

      const clickResult = await trustedClickOnFlowView(generateBtnSelector, profileId)
      console.log('[Flow Video T2V] Trusted click result:', clickResult)

      if (!clickResult?.success) {
        setPendingVideoGeneration(null)
        clearTimeout(videoTimeout)
        return { success: false, error: clickResult?.error || 'Failed to click Generate button' }
      }

      // ==== AUTO-APPROVE AUTOMATION ====
      // Click Approve if it appears after the Generate click
      const approveRes = await clickApproveButtonIfPresent(flowView, profileId).catch(err => {
        console.error('[Flow Video T2V] Approve button automation failed:', err.message);
        return { success: false };
      });
      if (approveRes && approveRes.clicked) {
        // Reset the timeout timer to allow full 30s after the click
        clearTimeout(videoTimeout);
        videoTimeout = setTimeout(() => {
          if (getPendingVideoGeneration()) {
            setPendingVideoGeneration(null)
            resolveVideo({ error: true, message: 'Video response timeout (30s)' })
          }
        }, 30000);
        console.log('[Flow Video T2V] Reset videoTimeout after Approve button click');
      }

      // 5. 비디오 API 응답 대기
      const netResult = await videoResponsePromise

      if (netResult.error) {
        const statusCode = netResult.status
        const rawBody = netResult.body || ''
        console.warn('[Flow Video T2V] Video API failed: HTTP', statusCode)
        console.warn('[Flow Video T2V] Response body:', rawBody?.substring(0, 500))

        // Google 에러 body 파싱해서 실제 원인 추출
        let googleErrorMsg = null
        try {
          const errData = JSON.parse(rawBody)
          googleErrorMsg = errData?.error?.message || errData?.error?.status || null
        } catch {}

        let errorStr
        if (statusCode === 403) {
          // 403 = PERMISSION_DENIED — unusual activity 또는 세션 만료
          const isUnusualActivity = rawBody.includes('unusual') || rawBody.includes('PERMISSION_DENIED')
            || rawBody.includes('safety') || rawBody.includes('policy')
          if (isUnusualActivity) {
            errorStr = '403: Google이 비정상 활동을 감지했습니다. Flow 페이지를 새로 고침하거나 잠시 후 다시 시도하세요.'
          } else if (googleErrorMsg) {
            errorStr = `403: ${googleErrorMsg}`
          } else {
            errorStr = '403: PERMISSION_DENIED — 계정 세션을 확인하세요.'
          }

          // 403 차단 감지 시 Flow 페이지 자동 새로고침 (이상활동 배너 해제 시도)
          try {
            console.warn('[Flow Video T2V] 403 차단 감지 → Flow 페이지 자동 새로고침')
            flowView.webContents.reload()
          } catch (reloadErr) {
            console.warn('[Flow Video T2V] 페이지 새로고침 실패:', reloadErr.message)
          }
        } else if (statusCode === 429) {
          errorStr = '429: 요청 한도 초과. 잠시 후 재시도합니다.'
        } else {
          errorStr = googleErrorMsg || netResult.message || `HTTP ${statusCode}: Video generation failed`
        }

        console.warn('[Flow Video T2V] Parsed error:', errorStr)
        return { success: false, error: errorStr }
      }

      // 6. 응답에서 generation ID 추출
      const data = parseFlowResponse(netResult.body)
      const generationId = extractVideoGenerationId(data)

      if (generationId) {
        console.log('[Flow Video T2V] Generation ID:', generationId)
        return { success: true, generationId }
      }

      return { success: false, error: `No generation ID. Response keys: ${Object.keys(data || {}).join(',')}` }
    } catch (e) {
      console.error('[Flow Video T2V] Error:', e.message)
      return { success: false, error: e.message }
    } finally {
      if (global.clearFlowPageInject) {
        global.clearFlowPageInject(profileId)
      }
    }
  })

  // Image-to-Video generation (DOM 자동화 + CDP Fetch 인터셉션)
  // T2V와 동일한 DOM 흐름: 프롬프트 주입 → Generate 클릭 → CDP 응답 캡처
  // 차이점: CDP Fetch로 나가는 T2V 요청을 가로채서 startImage 주입 + URL을 I2V 엔드포인트로 변경
  ipcMain.handle('flow:generate-video-i2v', async (event, {
    token, prompt, startImageMediaId, endImageMediaId, projectId, model, aspectRatio, duration, videoBatchCount, seed, profileId
  }) => {
    // Enforce global rate-limit throttling
    await acquireGlobalThrottle()

    const flowView = getFlowView(profileId)
    const mainWindow = getMainWindow()
    if (!startImageMediaId) return { success: false, error: 'No start image mediaId' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    const hasEndImage = !!endImageMediaId
    console.log('[Flow Video I2V] Starting DOM-triggered I2V generation, start:', startImageMediaId?.substring(0, 8),
      hasEndImage ? ', end: ' + endImageMediaId?.substring(0, 8) : '(start only)',
      seed != null ? `(seed: ${seed})` : '(seed: random)')

    // Seed/I2V page-level fetch patch injection
    if (global.setFlowPageInject) {
      global.setFlowPageInject(profileId, {
        seed: typeof seed === 'number' && Number.isFinite(seed) ? seed : null,
        aspectRatio: null,
        references: null,
        i2v: {
          startImageMediaId,
          endImageMediaId: hasEndImage ? endImageMediaId : null,
          i2vUrl: VIDEO_I2V_URL,
          i2vStartEndUrl: VIDEO_I2V_START_END_URL
        }
      })
    }

    try {
      // 0. Flow 프로젝트 페이지 확인 및 자동 진입
      const pageCheck = await ensureOnProjectPage(flowView)
      if (!pageCheck.success) {
        return { success: false, error: pageCheck.error || 'Not on Flow project page. Please open a Flow project first.' }
      }

      // 1. 비디오 모드로 전환 (배치 카운트 적용)
      const effectiveBatchCount = Math.max(1, Math.min(4, videoBatchCount || 1))
      const modeResult = await configureFlowMode('VIDEO', effectiveBatchCount, profileId)
      if (!modeResult.success) {
        return { success: false, error: modeResult.error || 'Failed to switch to video mode' }
      }
      console.log('[Flow Video I2V] Video mode active:', modeResult.method)

      // 2. 프롬프트 입력 (T2V와 동일한 Slate 에디터 사용)
      const promptBounds = flowView.getBounds()
      const promptWasHidden = (promptBounds.width === 0 || promptBounds.height === 0)
      if (promptWasHidden) {
        const { width, height } = mainWindow.getContentBounds()
        flowView.setBounds({ x: width + 5000, y: 0, width, height })
        await new Promise(r => setTimeout(r, 300))
      }

      const promptResult = await flowView.webContents.executeJavaScript(`
        (async function() {
          const promptText = ${JSON.stringify(prompt || '')};
          const sleep = (ms) => new Promise(r => setTimeout(r, ms));

          // Slate editor 찾기 (사이드바, 에이전트, 서브패널 배제)
          let editor = document.querySelector(".composer-container [data-slate-editor='true'], .prompt-container [data-slate-editor='true'], [data-slate-editor='true']:not([class*='sidebar'] *):not([class*='agent'] *):not(#af-bot-panel *)");
          
          if (!editor) {
            const candidates = Array.from(document.querySelectorAll("div[role='textbox'][contenteditable='true'], [contenteditable='true']:not([aria-hidden])"));
            editor = candidates.find(el => {
              let parent = el.parentElement;
              while (parent) {
                const id = (parent.id || '').toLowerCase();
                const cls = (parent.className || '').toString().toLowerCase();
                if (
                  id.includes('sidebar') || id.includes('agent') || id.includes('instruction') || id.includes('drawer') || id.includes('panel') ||
                  cls.includes('sidebar') || cls.includes('agent') || cls.includes('instruction') || cls.includes('drawer') || cls.includes('panel') ||
                  cls.includes('chat-history') || cls.includes('history')
                ) {
                  return false;
                }
                parent = parent.parentElement;
              }
              const rect = el.getBoundingClientRect();
              return rect.width > 100 && rect.height > 20;
            });
          }

          if (!editor) return { success: false, error: 'Editor not found' };

          const isSlate = !!(editor.matches?.("[data-slate-editor='true']") || editor.querySelector?.("[data-slate-node]"));

          // Slate React API로 프롬프트 주입
          let injected = false;
          if (isSlate) {
            try {
              const reactKeys = Object.keys(editor).filter(k => k.startsWith('__react'));
              let slateEditor = null;
              for (const key of reactKeys) {
                const stack = [editor[key]];
                const visited = new Set();
                let guard = 0;
                while (stack.length > 0 && guard < 5000) {
                  const node = stack.pop(); guard++;
                  if (!node || typeof node !== 'object' || visited.has(node)) continue;
                  visited.add(node);
                  const candidate = node?.memoizedProps?.node || node?.memoizedProps?.editor
                    || node?.pendingProps?.node || node?.pendingProps?.editor
                    || node?.stateNode?.editor || node?.editor;
                  if (candidate && typeof candidate.apply === 'function') { slateEditor = candidate; break; }
                  if (node.child) stack.push(node.child);
                  if (node.sibling) stack.push(node.sibling);
                  if (node.return) stack.push(node.return);
                  if (node.alternate) stack.push(node.alternate);
                }
                if (slateEditor) break;
              }
              if (slateEditor) {
                try {
                  const existingText = slateEditor.children?.[0]?.children?.[0]?.text || '';
                  if (existingText) slateEditor.apply({ type: 'remove_text', path: [0, 0], offset: 0, text: existingText });
                } catch {}
                slateEditor.apply({ type: 'insert_text', path: [0, 0], offset: 0, text: promptText });
                if (typeof slateEditor.onChange === 'function') slateEditor.onChange();
                editor.dispatchEvent(new Event('input', { bubbles: true }));
                await sleep(200);
                const modelText = (slateEditor.children?.[0]?.children?.[0]?.text || '').trim();
                if (modelText && modelText.includes(promptText.slice(0, 40))) injected = true;
              }
            } catch {}
          }

          // Fallback: execCommand
          if (!injected) {
            try {
              editor.focus(); editor.click(); await sleep(100);
              if (isSlate) {
                const sel = window.getSelection(); const range = document.createRange();
                const stringNodes = Array.from(editor.querySelectorAll('[data-slate-string]'))
                  .map(n => n.firstChild).filter(n => n && n.nodeType === Node.TEXT_NODE);
                if (stringNodes.length > 0) {
                  range.setStart(stringNodes[0], 0);
                  const last = stringNodes[stringNodes.length - 1];
                  range.setEnd(last, (last.textContent || '').length);
                } else {
                  const zeroNode = Array.from(editor.querySelectorAll('[data-slate-zero-width]'))
                    .map(n => n.firstChild).find(n => n && n.nodeType === Node.TEXT_NODE);
                  if (zeroNode) { range.setStart(zeroNode, 0); range.setEnd(zeroNode, (zeroNode.textContent || '').length); }
                  else range.selectNodeContents(editor);
                }
                sel.removeAllRanges(); sel.addRange(range);
              } else {
                document.execCommand('selectAll', false, null);
              }
              document.execCommand('delete', false, null); await sleep(50);
              try { editor.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: promptText })); } catch {}
              const inserted = document.execCommand('insertText', false, promptText);
              if (inserted) { injected = true; }
            } catch {}
          }

          if (!injected) return { success: false, error: 'Prompt injection failed' };
          await sleep(500);
          return { success: true };
        })()
      `)

      if (promptWasHidden) {
        flowView.setBounds(promptBounds)
        await new Promise(r => setTimeout(r, 200))
      }

      if (!promptResult?.success) {
        return { success: false, error: promptResult?.error || 'Prompt injection failed' }
      }
      console.log('[Flow Video I2V] Prompt injected successfully')

      // 4. CDP 비디오 응답 캡처 Promise 설정
      let resolveVideo = null
      let videoTimeout = null
      const videoResponsePromise = new Promise((resolve) => {
        videoTimeout = setTimeout(() => {
          if (getPendingVideoGeneration()) {
            setPendingVideoGeneration(null)
            resolve({ error: true, message: 'Video response timeout (30s)' })
          }
        }, 30000)
        resolveVideo = resolve
      })

      // 5. Generate 버튼 Trusted Click
      const generateBtnSelector = `(function() {
        try {
          const xr = document.evaluate("//button[.//i[text()='arrow_forward']]",
            document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (xr.singleNodeValue && !xr.singleNodeValue.disabled) return xr.singleNodeValue;
        } catch {}
        for (const b of document.querySelectorAll('button')) {
          for (const icon of b.querySelectorAll('i')) {
            if (icon.textContent.trim() === 'arrow_forward' && !b.disabled) return b;
          }
        }
        return null;
      })()`

      // 5-a. 클릭 전 인간 행동 시뮬레이션 (reCAPTCHA 점수 향상)
      // Generate 버튼 위로 마우스를 자연스럽게 이동시키고 스크롤을 살짝 움직여
      // Google의 행동 기반 reCAPTCHA 점수를 높임
      try {
        await flowView.webContents.executeJavaScript(`
          (async () => {
            try {
              // 랜덤 마우스 이동 (페이지 전체 범위)
              const moves = 3 + Math.floor(Math.random() * 3)
              for (let i = 0; i < moves; i++) {
                const x = 200 + Math.random() * 800
                const y = 100 + Math.random() * 500
                document.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }))
                await new Promise(r => setTimeout(r, 120 + Math.random() * 180))
              }
              // 미세 스크롤 (사람처럼 조금 내렸다 올림)
              const scrollAmt = 30 + Math.random() * 60
              window.scrollBy(0, scrollAmt)
              await new Promise(r => setTimeout(r, 150 + Math.random() * 250))
              window.scrollBy(0, -scrollAmt * 0.6)
              await new Promise(r => setTimeout(r, 100 + Math.random() * 150))
              // Generate 버튼 근처로 호버
              const btn = document.querySelector('button [data-icon="arrow_forward"]')?.closest('button')
                || (() => { for(const b of document.querySelectorAll('button')) { for(const i of b.querySelectorAll('i')) { if(i.textContent.trim()==='arrow_forward') return b } } return null })()
              if (btn) {
                const rect = btn.getBoundingClientRect()
                const cx = rect.left + rect.width * (0.3 + Math.random() * 0.4)
                const cy = rect.top  + rect.height * (0.3 + Math.random() * 0.4)
                btn.dispatchEvent(new MouseEvent('mousemove', { clientX: cx, clientY: cy, bubbles: true }))
                btn.dispatchEvent(new MouseEvent('mouseenter', { clientX: cx, clientY: cy, bubbles: true }))
                await new Promise(r => setTimeout(r, 200 + Math.random() * 300))
              }
            } catch(e) {}
          })()
        `)
        console.log('[Flow Video I2V] Human behavior simulation complete')
      } catch (simErr) {
        // non-fatal
      }

      // ★ 클릭 전 pendingVideoGeneration을 먼저 무장(Arm)하여 레이스 컨디션 방지!
      const videoSetAt = Date.now() / 1000 - 5
      setPendingVideoGeneration({
        setAt: videoSetAt,
        resolve: (result) => {
          clearTimeout(videoTimeout)
          resolveVideo(result)
        }
      })
      console.log('[Flow Video I2V] pendingVideoGeneration armed before click...')

      const clickResult = await trustedClickOnFlowView(generateBtnSelector, profileId)
      console.log('[Flow Video I2V] Trusted click result:', clickResult)

      if (!clickResult?.success) {
        setPendingVideoGeneration(null)
        clearTimeout(videoTimeout)
        return { success: false, error: clickResult?.error || 'Failed to click Generate button' }
      }

      // ==== AUTO-APPROVE AUTOMATION ====
      // Click Approve if it appears after the Generate click
      const approveRes = await clickApproveButtonIfPresent(flowView, profileId).catch(err => {
        console.error('[Flow Video I2V] Approve button automation failed:', err.message);
        return { success: false };
      });
      if (approveRes && approveRes.clicked) {
        // Reset the timeout timer to allow full 30s after the click
        clearTimeout(videoTimeout);
        videoTimeout = setTimeout(() => {
          if (getPendingVideoGeneration()) {
            setPendingVideoGeneration(null)
            resolveVideo({ error: true, message: 'Video response timeout (30s)' })
          }
        }, 30000);
        console.log('[Flow Video I2V] Reset videoTimeout after Approve button click');
      }

      // 6. 비디오 API 응답 대기
      const netResult = await videoResponsePromise

      if (netResult.error) {
        const statusCode = netResult.status
        const rawBody = netResult.body || ''
        console.warn('[Flow Video I2V] Video API failed: HTTP', statusCode)
        console.warn('[Flow Video I2V] Response body:', rawBody?.substring(0, 500))
        let googleErrorMsg = null
        try { const errData = JSON.parse(rawBody); googleErrorMsg = errData?.error?.message || errData?.error?.status || null } catch {}
        let errorStr
        if (statusCode === 403) {
          const isUnusualActivity = rawBody.includes('unusual') || rawBody.includes('PERMISSION_DENIED') || rawBody.includes('safety') || rawBody.includes('policy')
          errorStr = isUnusualActivity
            ? '403: Google이 비정상 활동을 감지했습니다. Flow 페이지를 새로 고침하거나 잠시 후 다시 시도하세요.'
            : (googleErrorMsg ? `403: ${googleErrorMsg}` : '403: PERMISSION_DENIED — 계정 세션을 확인하세요.')

          // 403 차단 감지 시 Flow 페이지 자동 새로고침 (이상활동 배너 해제 시도)
          try {
            console.warn('[Flow Video I2V] 403 차단 감지 → Flow 페이지 자동 새로고침')
            flowView.webContents.reload()
          } catch (reloadErr) {
            console.warn('[Flow Video I2V] 페이지 새로고침 실패:', reloadErr.message)
          }
        } else if (statusCode === 429) {
          errorStr = '429: 요청 한도 초과. 잠시 후 재시도합니다.'
        } else {
          errorStr = googleErrorMsg || netResult.message || `HTTP ${statusCode}: Video generation failed`
        }
        console.warn('[Flow Video I2V] Parsed error:', errorStr)
        return { success: false, error: errorStr }
      }

      // 7. 응답에서 generation ID 추출
      const data = parseFlowResponse(netResult.body)
      const generationId = extractVideoGenerationId(data)

      if (generationId) {
        console.log('[Flow Video I2V] Generation ID:', generationId)
        return { success: true, generationId }
      }

      return { success: false, error: `No generation ID. Response keys: ${Object.keys(data || {}).join(',')}` }
    } catch (e) {
      console.error('[Flow Video I2V] Error:', e.message)
      return { success: false, error: e.message }
    } finally {
      if (global.clearFlowPageInject) {
        global.clearFlowPageInject(profileId)
      }
    }
  })

  // Check video generation status (페이지 컨텍스트에서 실행 — origin 일치)
  ipcMain.handle('flow:check-video-status', async (event, { token, generationIds, projectId }) => {
    const flowView = getFlowView()
    if (!token) return { success: false, error: 'No token' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    const pid = projectId || getCapturedProjectId() || ''

    try {
      // 페이지 컨텍스트에서 fetch 실행 (AutoFlow 동일 바디 구조)
      // AutoFlow: { media: [{ name: "<genId>", projectId: "<pid>" }] }
      const result = await flowView.webContents.executeJavaScript(`
        (async function() {
          try {
            const ids = ${JSON.stringify(generationIds)};
            const pid = ${JSON.stringify(pid)};
            const media = ids.map(name => pid ? { name, projectId: pid } : { name });
            const body = { media };
            const resp = await fetch('${VIDEO_STATUS_URL}', {
              method: 'POST',
              mode: 'cors',
              credentials: 'include',
              headers: { authorization: 'Bearer ' + ${JSON.stringify(token)} },
              body: JSON.stringify(body)
            });
            const text = await resp.text().catch(() => '');
            return { ok: resp.ok, status: resp.status, text };
          } catch (e) {
            return { ok: false, status: 0, text: e.message };
          }
        })()
      `)

      console.log('[Flow VideoStatus] HTTP', result.status, 'body length:', result.text?.length || 0)

      if (!result.ok) {
        console.warn('[Flow VideoStatus] Error:', result.text?.substring(0, 300))
        return { success: false, error: `HTTP ${result.status}: ${(result.text || '').substring(0, 200)}` }
      }

      const data = parseFlowResponse(result.text)
      console.log('[Flow VideoStatus] Parsed keys:', data ? Object.keys(data).join(',') : 'null')

      // AutoFlow 형식: media[].mediaMetadata.mediaStatus.mediaGenerationStatus
      const statuses = []

      // 방법 1: media[] 배열 (최신 API 응답 형식)
      if (Array.isArray(data?.media)) {
        for (const m of data.media) {
          const genStatus = m?.mediaMetadata?.mediaStatus?.mediaGenerationStatus || ''
          const mediaId = m?.name
          console.log('[Flow VideoStatus] media status:', genStatus, 'mediaId:', mediaId?.substring(0, 30))
          if (genStatus === 'MEDIA_GENERATION_STATUS_SUCCESSFUL') {
            // 전체 media 객체 구조 디버깅
            const findUrls = (obj, path = '') => {
              if (!obj || typeof obj !== 'object') return []
              const urls = []
              for (const [k, v] of Object.entries(obj)) {
                if (typeof v === 'string' && (v.startsWith('http') || v.includes('googleapis') || v.includes('google'))) {
                  urls.push({ path: path + '.' + k, url: v.substring(0, 150) })
                } else if (typeof v === 'object' && v !== null) {
                  urls.push(...findUrls(v, path + '.' + k))
                }
              }
              return urls
            }
            const allUrls = findUrls(m, 'media')
            console.log('[Flow VideoStatus] ✅ URLs in response:', JSON.stringify(allUrls))
            console.log('[Flow VideoStatus] ✅ mediaMetadata keys:', JSON.stringify(Object.keys(m?.mediaMetadata || {})))

            // AutoFlow: 비디오 URL은 status 응답에서 직접 추출
            const meta = m?.mediaMetadata
            const videoUrl = meta?.videoData?.generatedVideo?.fifeUri
              || meta?.videoData?.generatedVideo?.url
              || meta?.videoData?.fifeUri
              || meta?.videoData?.url
              || meta?.imageData?.fifeUri
              || meta?.imageData?.url
              || m?.mediaData?.url
              || m?.generatedMedia?.url
              || m?.thumbnailUrl
              || m?.url
              || null
            console.log('[Flow VideoStatus] ✅ Complete! videoUrl:', videoUrl?.substring(0, 80))
            statuses.push({ status: 'complete', mediaId, videoUrl })
          } else if (genStatus.includes('FAILED') || genStatus.includes('ERROR')) {
            console.warn('[Flow VideoStatus] ❌ FAILED media detail:', JSON.stringify(m).substring(0, 1000))
            const failReason = m?.mediaMetadata?.mediaStatus?.failureReason
              || m?.mediaMetadata?.mediaStatus?.errorMessage
              || m?.error?.message
              || genStatus
            statuses.push({ status: 'failed', error: failReason })
          } else {
            statuses.push({ status: 'pending', progress: null })
          }
        }
      }

      // 방법 2: responses[] / asyncVideoGenerationOperations[] (레거시)
      if (statuses.length === 0) {
        const results = data?.responses || data?.asyncVideoGenerationOperations || []
        console.log('[Flow VideoStatus] Legacy path, results count:', results.length)
        for (const r of results) {
          console.log('[Flow VideoStatus] Response item keys:', Object.keys(r).join(','),
            'done:', r.done, 'status:', r.status, 'state:', r.state)
          const done = r.done || r.status === 'COMPLETE' || r.state === 'COMPLETE'
          const failed = r.error || r.status === 'FAILED' || r.state === 'FAILED'
          const mediaId = r.result?.mediaGenerationId || r.mediaGenerationId || r.name
          const progress = r.progress || r.metadata?.progress

          if (failed) statuses.push({ status: 'failed', error: r.error?.message || 'Generation failed' })
          else if (done && mediaId) statuses.push({ status: 'complete', mediaId })
          else statuses.push({ status: 'pending', progress })
        }
      }

      // 아무 statuses도 못 뽑았으면 raw data 로깅
      if (statuses.length === 0) {
        console.warn('[Flow VideoStatus] No statuses parsed! Raw data (first 500):', JSON.stringify(data)?.substring(0, 500))
      }

      console.log('[Flow VideoStatus] Final statuses:', JSON.stringify(statuses))
      return { success: true, statuses }
    } catch (e) {
      console.error('[Flow VideoStatus] Exception:', e.message)
      return { success: false, error: e.message }
    }
  })

  // ─── Video Upscale (API 기반, DOM 불필요) ───
  // AutoFlow 10.7.58 역공학: upscaleVideoDirect (sidepanel.js:20223)
  // mediaId → workflowId 조회 → reCAPTCHA → upscale 제출 → resultMediaName 반환
  ipcMain.handle('flow:upscale-video', async (event, { token, mediaId, projectId, resolution, aspectRatio }) => {
    const flowView = getFlowView()
    if (!token) return { success: false, error: 'No token' }
    if (!mediaId) return { success: false, error: 'No mediaId' }
    if (!flowView) return { success: false, error: 'Flow view not ready' }

    const normalizedRes = String(resolution || '1080p').toLowerCase()
    const resolutionEnum = normalizedRes === '4k' ? 'VIDEO_RESOLUTION_4K' : 'VIDEO_RESOLUTION_1080P'
    const modelKey = normalizedRes === '4k' ? 'veo_3_1_upsampler_4k' : 'veo_3_1_upsampler_1080p'
    const pid = projectId || getCapturedProjectId() || ''

    console.log('[Flow Upscale] Starting upscale — mediaId:', mediaId?.substring(0, 20),
      'resolution:', normalizedRes, 'projectId:', pid?.substring(0, 8))

    try {
      // 페이지 컨텍스트에서 전체 실행 (reCAPTCHA origin 일치 + projectInitialData 상대 URL)
      const result = await flowView.webContents.executeJavaScript(`
        (async function() {
          try {
            const mediaId = ${JSON.stringify(mediaId)};
            const pid = ${JSON.stringify(pid)};
            const token = ${JSON.stringify(token)};
            const endpoint = ${JSON.stringify(VIDEO_UPSCALE_URL)};
            const resolutionEnum = ${JSON.stringify(resolutionEnum)};
            const modelKey = ${JSON.stringify(modelKey)};
            const videoAspectRatio = ${JSON.stringify(aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE')};

            // 1. projectInitialData에서 workflowId 조회
            let workflowId = '';
            if (pid) {
              const pdUrl = '/fx/api/trpc/flow.projectInitialData?input='
                + encodeURIComponent(JSON.stringify({ json: { projectId: pid } }))
                + '&af_upscale_ts=' + Date.now();
              const pdResp = await fetch(pdUrl, {
                method: 'GET', cache: 'no-store', credentials: 'same-origin',
                headers: { accept: 'application/json, text/plain, */*' }
              });
              if (pdResp.ok) {
                const pdData = await pdResp.json().catch(() => null);
                // TRPC 응답 언래핑 (AutoFlow unwrapProjectData 패턴)
                const unwrap = (raw) => {
                  if (!raw) return null;
                  const queue = [raw]; const seen = new Set();
                  while (queue.length > 0) {
                    const node = queue.shift();
                    if (!node || typeof node !== 'object' || seen.has(node)) continue;
                    seen.add(node);
                    const candidate = node.projectContents ? node : node.data;
                    const pc = candidate?.projectContents || null;
                    if (pc && (pc.workflows !== undefined || pc.media !== undefined)) return candidate;
                    if (node.json) queue.push(node.json);
                    if (node.result) queue.push(node.result);
                    if (node.data) queue.push(node.data);
                    if (Array.isArray(node)) node.forEach(i => queue.push(i));
                  }
                  return null;
                };
                const pc = unwrap(pdData)?.projectContents || {};
                const asArr = (v) => v ? (Array.isArray(v) ? v : Object.keys(v).sort((a,b)=>a-b).map(k=>v[k]).filter(Boolean)) : [];
                const mediaItems = asArr(pc.media);
                const workflows = asArr(pc.workflows);
                const bareId = mediaId.split('/').pop();

                // media[].workflowId 직접 매칭
                for (const m of mediaItems) {
                  const mName = (m?.name || m?.mediaId || m?.id || '').split('/').pop();
                  if (mName !== bareId) continue;
                  const wid = String(m?.workflowId || '').trim();
                  if (wid) { workflowId = wid.split('/').pop() || wid; break; }
                }
                // fallback: workflows[].metadata.primaryMediaId 매칭
                if (!workflowId) {
                  for (const w of workflows) {
                    const pmId = (w?.metadata?.primaryMediaId || '').split('/').pop();
                    if (pmId !== bareId) continue;
                    const wid = (w?.workflowId || w?.name || '').split('/').pop();
                    if (wid) { workflowId = wid; break; }
                  }
                }
              }
            }
            if (!workflowId) return { ok: false, error: 'Could not resolve workflowId for mediaId: ' + mediaId.substring(0, 20) };

            // 2. reCAPTCHA 토큰 획득 (AutoFlow 패턴: ready() 대기 후 execute())
            let recaptchaToken = '';
            try {
              const g = window.grecaptcha;
              if (g?.enterprise?.execute) {
                // ready() 대기 — reCAPTCHA가 완전히 초기화될 때까지 기다림
                if (g.enterprise.ready) {
                  await new Promise(resolve => g.enterprise.ready(resolve));
                }
                recaptchaToken = await g.enterprise.execute('6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV', { action: 'generate' });
                recaptchaToken = String(recaptchaToken || '').trim();
                console.log('[Flow Upscale] reCAPTCHA token obtained, length:', recaptchaToken.length);
              } else {
                console.warn('[Flow Upscale] grecaptcha.enterprise.execute not available');
              }
            } catch (e) {
              console.warn('[Flow Upscale] reCAPTCHA error:', e.message);
            }

            // 3. Upscale 요청 body 구성 (AutoFlow buildClientContext 패턴)
            const body = {
              mediaGenerationContext: { batchId: crypto.randomUUID() },
              clientContext: {
                projectId: pid,
                tool: 'PINHOLE',
                userPaygateTier: 'PAYGATE_TIER_ONE',
                sessionId: ';' + Date.now(),
                recaptchaContext: {
                  token: recaptchaToken,
                  applicationType: 'RECAPTCHA_APPLICATION_TYPE_WEB'
                }
              },
              requests: [{
                resolution: resolutionEnum,
                aspectRatio: videoAspectRatio,
                seed: Math.floor(Math.random() * 2147483647),
                videoModelKey: modelKey,
                metadata: { workflowId },
                videoInput: { mediaId }
              }],
              useV2ModelConfig: true
            };

            // 4. Upscale API 호출 (페이지 컨텍스트 fetch — origin 일치)
            const resp = await fetch(endpoint, {
              method: 'POST',
              headers: { authorization: 'Bearer ' + token },
              body: JSON.stringify(body)
            });
            const text = await resp.text().catch(() => '');
            if (!resp.ok) return { ok: false, error: 'HTTP ' + resp.status + ': ' + (text || '').substring(0, 200) };

            // 5. 응답에서 resultMediaName 추출 (_upsampled suffix)
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch {}

            let resultMediaName = '';
            if (data) {
              const candidates = [];
              if (Array.isArray(data.operations))
                for (const item of data.operations) candidates.push(item?.operation?.name);
              if (Array.isArray(data.media))
                for (const item of data.media) candidates.push(item?.name);
              for (const c of candidates) {
                const name = String(c || '').trim();
                if (/_upsampled$/i.test(name)) { resultMediaName = name; break; }
              }
            }

            return { ok: true, resultMediaName, workflowId, recaptchaLen: recaptchaToken.length, responseKeys: data ? Object.keys(data).slice(0, 12) : [] };
          } catch (e) {
            return { ok: false, error: e.message };
          }
        })()
      `)

      if (!result.ok) {
        console.warn('[Flow Upscale] ❌ Failed:', result.error)
        return { success: false, error: result.error }
      }

      if (result.resultMediaName) {
        console.log('[Flow Upscale] ✅ Upscale submitted — resultMediaName:', result.resultMediaName,
          'workflowId:', result.workflowId)
        return { success: true, resultMediaName: result.resultMediaName, workflowId: result.workflowId }
      }

      console.warn('[Flow Upscale] ⚠️ No _upsampled media name. Response keys:', result.responseKeys)
      return { success: false, error: 'No upsampled media name in response. Keys: ' + (result.responseKeys || []).join(',') }
    } catch (e) {
      console.error('[Flow Upscale] Error:', e.message)
      return { success: false, error: e.message }
    }
  })
}
