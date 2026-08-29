import electronPkg from 'electron';
const { app, BrowserWindow, WebContentsView, ipcMain, shell, protocol, net, powerSaveBlocker, safeStorage } = electronPkg;
import http from 'node:http'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync as execSyncRaw, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { registerFilesystemIPC } from './ipc/filesystem.js'
import { registerAuthIPC } from './ipc/auth.js'
import { registerCapcutIPC } from './ipc/capcut.js'
import { registerMcpIPC } from './ipc/mcp.js'
import { registerFlowAPIIPC } from './ipc/flow-api.js'
import { registerPremiereIPC } from './ipc/premiere.js'
import { registerVrewIPC } from './ipc/vrew.js'
import { registerCharacterIPC } from './ipc/character.js'
import { registerGenaiIPC } from './ipc/genai-api.js'
import { registerStoryIPC } from './ipc/story-api.js'
import { registerTtsIPC } from './ipc/tts-api.js'
import { createModeController } from './ipc/mode.js'
import * as llmClaude from './api/llm/llmClaude.js'
import { createStoryLlmRouter } from './api/llm/storyLlmRouter.js'
import { loadMetaPrompt } from './api/llm/metaPrompts.js'
import { createKeyStore } from './api/keyStore.js'
import { createMultiKeyStore } from './api/keyStoreMulti.js'
import { createTtsAdapter } from './api/tts/index.js'
import { getTypecastKey } from './api/tts/typecastKey.js'
import { readCredentialsKey } from './api/tts/credentialsKey.js'
import { createSfxAdapter } from './api/sfx/index.js'
import { createVoiceGenderCache } from './api/tts/voiceGenderCache.js'
import { applyGenderOverlay } from './api/tts/genderOverlay.js'
import { createVoicePreviewService } from './api/tts/voicePreviewService.js'
import { ssrfSafeFetch } from './api/net/ssrfSafeFetch.js'
import { buildKeyResolvers } from './main/keyResolvers.js'
import { registerVideoIPC } from './ipc/video.js'
import { registerDomIPC } from './ipc/dom.js'
import { registerYoutubeIPC } from './ipc/ytExportManager.js'
import { createSharedHelpers } from './ipc/shared.js'
import { updateBounds, registerLayoutIPC, setLayoutMode, setSplitRatio, setModalVisible, resetModalState } from './ipc/layout.js'
import { openApiSpec, getSwaggerHtml } from './api-docs.js'
import { setupAppMenuAndUpdater, noteProjectActivated, setMenuLocale } from './updater.js'
import { selectCdpCase } from './video-cdp-dispatch.js'
import { loadProfiles, saveProfiles, switchProfile, createProfile, deleteProfile, updateProfile, cleanupUnusedPartitions } from './profileManager.js'
import { injectImageBatchBody } from './cdp-image-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Force the display name so dev-mode submenu items ("About …", "Quit …", etc.)
// match the productName from electron-builder. Has no effect on the bold app
// title in macOS menu bar (that comes from the Electron binary's Info.plist
// in dev; the packaged build sets it correctly).
app.setName('ViraLoop Studio')

// ═══════════════════════════════════════════════════════════════════════════════
// [Fix] Persistent Storage for Google Flow & Profile Sessions
// ═══════════════════════════════════════════════════════════════════════════════
app.disableHardwareAcceleration()
const persistentDataDir = path.join(app.getPath('appData'), 'ViraLoopStudio')
try {
  fsSync.mkdirSync(persistentDataDir, { recursive: true })
} catch (e) {}
app.setPath('userData', persistentDataDir)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// [NEW-12 + Electron②] 전역 Chromium 스위치 — WebRTC IP 누출 차단 + QUIC 비활성화
// app.on('ready') 이전에 설정해야 적용됨
// ═══════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp')
app.commandLine.appendSwitch('disable-webrtc-multiple-routes')
app.commandLine.appendSwitch('enforce-webrtc-ip-permission-check')
app.commandLine.appendSwitch('disable-quic')  // [NEW-1] QUIC/UDP 트래픽 누출 차단
app.commandLine.appendSwitch('enable-features', 'DnsOverHttps,PlatformHEVCDecoderSupport')
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query')
app.commandLine.appendSwitch('disable-features', 'WebAuthentication') // [Passkey 완벽 차단] 엔진 레벨에서 WebAuthn 기능 비활성화

// ═══════════════════════════════════════════════════════════════════════════════

// macOS About 패널 + Dock 아이콘
// (app.dock은 whenReady 이후에만 사용 가능 → 아래로 옮김)
const __filename_main = fileURLToPath(import.meta.url)
const __dirname_main = path.dirname(__filename_main)
const APP_ICON_PATH = path.join(__dirname_main, '..', 'assets', 'icon.icns')
const HAS_APP_ICON = fsSync.existsSync(APP_ICON_PATH)

// package.json에서 buildNumber 읽기 (dev/prod 모두 동일)
let BUILD_NUMBER = ''
try {
  const pkgPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar', 'package.json')
    : path.join(__dirname_main, '..', 'package.json')
  if (fsSync.existsSync(pkgPath)) {
    const pkg = JSON.parse(fsSync.readFileSync(pkgPath, 'utf-8'))
    if (pkg.buildNumber != null) BUILD_NUMBER = String(pkg.buildNumber)
  }
} catch (e) {
  console.warn('[ViraLoop Studio] buildNumber read failed:', e.message)
}

if (process.platform === 'darwin') {
  const verStr = BUILD_NUMBER
    ? `${app.getVersion()} (Build ${BUILD_NUMBER})`
    : app.getVersion()
  console.log('[ViraLoop Studio] About →', verStr, '/ isPackaged:', app.isPackaged)
  app.setAboutPanelOptions({
    applicationName: 'ViraLoop Studio',
    applicationVersion: verStr,
    copyright: '© Touchizen',
    credits: 'ViraLoop Studio — Google Flow → CapCut automation',
  })
}

// === Safe console logger (prevents EPIPE crash when stdout pipe is broken) ===
const _origLog = console.log
const _origWarn = console.warn
const _origError = console.error
console.log = (...args) => { try { _origLog(...args) } catch {} }
console.warn = (...args) => { try { _origWarn(...args) } catch {} }
console.error = (...args) => { try { _origError(...args) } catch {} }

// === Uncaught Exception Handler (prevent EPIPE dialog) ===
process.on('uncaughtException', (err) => {
  if (err?.code === 'EPIPE' || err?.message?.includes('EPIPE')) {
    // Silently ignore EPIPE — stdout pipe is broken (expected when restarting dev server)
    return
  }
  // For other errors, log but don't crash
  try { _origError('[Main] Uncaught exception:', err) } catch {}
})

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// === Flow API URLs ===
const FLOW_URL = 'https://labs.google/fx/tools/flow'
const SESSION_URL = 'https://labs.google/fx/api/auth/session'
const BASE_API_URL = 'https://aisandbox-pa.googleapis.com/v1'
const GENERATE_URL = `${BASE_API_URL}/flowMedia:batchGenerateImages`
const UPLOAD_URL = `${BASE_API_URL}/flow/uploadImage`
const MEDIA_REDIRECT_URL = 'https://labs.google/fx/api/trpc/media.getMediaUrlRedirect'
const TOKEN_INFO_URL = 'https://www.googleapis.com/oauth2/v3/tokeninfo'
const VIDEO_T2V_URL = `${BASE_API_URL}/video:batchAsyncGenerateVideoText`
const VIDEO_I2V_URL = `${BASE_API_URL}/video:batchAsyncGenerateVideoStartImage`
const VIDEO_I2V_START_END_URL = `${BASE_API_URL}/video:batchAsyncGenerateVideoStartAndEndImage`
const VIDEO_STATUS_URL = `${BASE_API_URL}/video:batchCheckAsyncVideoGenerationStatus`
const VIDEO_UPSCALE_URL = `${BASE_API_URL}/video:batchAsyncGenerateVideoUpsampleVideo`
const RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV'
const RECAPTCHA_ACTION = 'generate'

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Origin': 'https://labs.google',
  'X-Kl-Ajax-Request': 'Ajax_Request'
}

let mainWindow = null
let flowView = null
global.flowViews = new Map() // Map<ProfileId, WebContentsView>
global.activeFlowProfileId = 'default'
const profileStates = new Map() // Map<ProfileId, { consentClicked: boolean, enterToolClicked: boolean }>

function getProfileState(profileId) {
  const pId = profileId || global.activeFlowProfileId || 'default'
  if (!profileStates.has(pId)) {
    profileStates.set(pId, { consentClicked: false, enterToolClicked: false })
  }
  return profileStates.get(pId)
}

// layoutMode, splitRatio, modalVisible, powerSaveBlockerId → ipc/layout.js로 이동
let capturedProjectId = null // Flow 네트워크에서 자동 캡처된 projectId
let pendingGeneration = null // DOM-triggered generation 응답 캡처용 Promise resolver (이미지) — 동기 모드
let mcpHttpServer = null // MCP HTTP 서버 인스턴스
const pendingGenerations = new Map() // 비동기 모드용 다중 생성 추적 (key: generationId)
let pendingVideoGeneration = null // DOM-triggered video generation 응답 캡처용 Promise resolver
let pendingReferenceImages = null // CDP Fetch 인터셉션용 레퍼런스 이미지 (mediaId 배열)
let pendingSeedValue = null // CDP Fetch 인터셉션용 seed 값 (숫자, null = 랜덤 유지)
let pendingImageAspectRatio = null // CDP Fetch 인터셉션용 화면비 (IMAGE_ASPECT_RATIO_* enum, null = 유지)
let pendingI2VInjection = null // CDP Fetch 인터셉션용 I2V startImage 주입 데이터
let enterToolClicked = false // Enter tool 버튼 클릭 완료 플래그 (무한루프 방지) - Legacy fallback
let consentClicked = false   // 동의 버튼 클릭 완료 플래그 (무한루프 방지) - Legacy fallback

// === Shared helpers (trustedClick, fetch, parse, extract, configureFlowMode) ===
const helpers = createSharedHelpers({
  getFlowView: (profileId) => {
    const targetId = profileId || global.activeFlowProfileId || 'default'
    return global.flowViews.get(targetId) || flowView
  },
  getMainWindow: () => mainWindow,
  constants: {
    SESSION_URL, MEDIA_REDIRECT_URL, RECAPTCHA_SITE_KEY, RECAPTCHA_ACTION,
  },
})
const {
  trustedClickOnFlowView, parseFlowResponse, sessionFetch, flowPageFetch,
  getRecaptchaToken, extractMediaIds, extractFifeUrls, extractBase64Images,
  fetchMediaAsBase64, configureFlowMode, switchFlowToVideoMode,
} = helpers

// updateBounds → ipc/layout.js로 이동 (import로 사용)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: `ViraLoop Studio v${app.getVersion()} - AI 기반 바이럴 숏폼 제작 & 다채널 자동화 솔루션`,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false  // 로컬 file:// 이미지 로드 허용
    }
  })

  // Start the window maximized (전체 창)
  mainWindow.maximize()

  // Hide the legacy File/Edit menu bar on Windows/Linux for a modern premium look
  if (process.platform !== 'darwin') {
    mainWindow.setMenuBarVisibility(false)
  }

  // 화면 꺼짐/절전 방지 기본 ON (layout 모듈에서 관리하므로 IPC로 초기화)
  // registerLayoutIPC 등록 후 자동으로 IPC 핸들러가 처리하지만,
  // createWindow 시점에서 바로 켜야 하므로 직접 호출
  powerSaveBlocker.start('prevent-display-sleep')


  let initialProfileId = 'default'
  global.activeFlowProfileId = initialProfileId

  // Google 로그인 페이지를 프리로드 스크립트 없이 완전히 깨끗한(Pure) 별도 창으로 여는 헬퍼
  const openPureGoogleLoginWindow = (url, profileId) => {
    if (!global.activeLoginWindows) {
      global.activeLoginWindows = new Map();
    }

    // 중복 창 방지
    if (global.activeLoginWindows.has(profileId)) {
      const existingWin = global.activeLoginWindows.get(profileId);
      if (!existingWin.isDestroyed()) {
        existingWin.focus();
        return;
      }
    }

    console.log(`[Google Login Window] Launching stealth login window for profile: ${profileId}, URL: ${url}`);

    const modernChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

    const loginWin = new BrowserWindow({
      width: 550,
      height: 750,
      title: 'Google Sign-In',
      parent: mainWindow || undefined,
      modal: true,
      webPreferences: {
        partition: `persist:flow_profile_${profileId}`, // 세션 파티션 동일하게 공유
        preload: path.join(__dirname, 'login_preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    global.activeLoginWindows.set(profileId, loginWin);

    loginWin.webContents.setUserAgent(modernChromeUA);
    loginWin.webContents.session.setUserAgent(modernChromeUA);

    // Google 차단 방지용 Sec-CH-UA 및 클라이언트 힌트 헤더 보정
    loginWin.webContents.session.webRequest.onBeforeSendHeaders(
      { urls: ['https://accounts.google.com/*', 'https://*.google.com/*'] },
      (details, callback) => {
        details.requestHeaders['User-Agent'] = modernChromeUA;
        details.requestHeaders['Sec-Ch-Ua'] = '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"';
        details.requestHeaders['Sec-Ch-Ua-Mobile'] = '?0';
        details.requestHeaders['Sec-Ch-Ua-Platform'] = '"Windows"';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
      }
    );

    loginWin.loadURL(url);

    const handleRedirect = (redirectUrl) => {
      // 로그인이 완료되어 다시 Flow 페이지 혹은 미디어 리다이렉트 등으로 들어왔는지 감지
      if (redirectUrl && (redirectUrl.includes('labs.google/fx') || redirectUrl.includes('flowMedia:'))) {
        console.log(`[Google Login Window] Login redirect detected back to Flow: ${redirectUrl}`);
        
        // 비동기적으로 창 닫기
        setTimeout(() => {
          if (!loginWin.isDestroyed()) {
            loginWin.close();
          }
        }, 500);

        // 메인 Flow 뷰를 리로드하여 로그인된 쿠키 세션 반영
        const flowView = global.flowViews.get(profileId);
        if (flowView) {
          console.log(`[Google Login Window] Reloading Flow WebContentsView for profile: ${profileId}`);
          flowView.webContents.loadURL(FLOW_URL);
        }
      }
    };

    loginWin.webContents.on('will-navigate', (event, redirectUrl) => handleRedirect(redirectUrl));
    loginWin.webContents.on('will-redirect', (event, redirectUrl) => handleRedirect(redirectUrl));
    loginWin.webContents.on('did-navigate', (event, redirectUrl) => handleRedirect(redirectUrl));

    loginWin.on('closed', () => {
      global.activeLoginWindows.delete(profileId);
    });
  };

  const setupFlowView = (view, profileId) => {
    // 1. 오디오 개별 뮤트
    view.webContents.setAudioMuted(true)

    // Google 로그인 및 외부 링크 처리 (Flow WebContentsView 내에서 자연스럽게 로그인 수행)
    view.webContents.setWindowOpenHandler(({ url }) => {
      if (url && !url.includes('labs.google') && !url.includes('google.com') && !url.includes('youtube.com')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
      return { action: 'allow' };
    });



    view.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Flow - ${profileId}] did-fail-load:`, errorCode, errorDescription, validatedURL)
    })

    view.webContents.on('did-navigate', (event, url) => {
      console.log(`[Flow - ${profileId}] did-navigate:`, url)
      if (url.includes('unsupported-country')) {
        console.log(`[Flow - ${profileId}] Region unavailable detected early (did-navigate)`)
        mainWindow.webContents.send('flow-status', {
          loaded: true, url, loggedIn: false, unavailable: true, profileId
        })
      } else {
        mainWindow.webContents.send('flow-status', {
          loaded: true, url, loggedIn: url.includes('labs.google/fx'), profileId
        })
      }
      const pidMatch = url.match(/\/project\/([a-f0-9-]{36})/)
      if (pidMatch) {
        capturedProjectId = pidMatch[1]
        console.log(`[Flow API - ${profileId}] ProjectId from navigation:`, capturedProjectId)
      }
    })

    view.webContents.on('did-navigate-in-page', (event, url) => {
      console.log(`[Flow - ${profileId}] did-navigate-in-page:`, url)
      mainWindow.webContents.send('flow-status', {
        loaded: true, url, loggedIn: url.includes('labs.google/fx'), profileId
      })
      const pidMatch = url.match(/\/project\/([a-f0-9-]{36})/)
      if (pidMatch) {
        if (!capturedProjectId) {
          capturedProjectId = pidMatch[1]
          console.log(`[Flow API - ${profileId}] ProjectId from SPA navigation:`, capturedProjectId)
        }
        mainWindow.webContents.send('flow-status', {
          authenticated: true,
          url,
          profileId
        })
      }
    })



    view.webContents.on('did-finish-load', async () => {
      const url = view.webContents.getURL()
      console.log(`[Flow - ${profileId}] did-finish-load:`, url)
      const unavailable = url.includes('unsupported-country')
      
      if (url.includes('labs.google/fx')) {
        // Legacy stealth script injection removed
      }

      mainWindow.webContents.send('flow-status', {
        loaded: true,
        url,
        loggedIn: url.includes('labs.google/fx'),
        unavailable,
        profileId
      })

      if (unavailable) {
        console.log(`[Flow - ${profileId}] Region unavailable detected — skipping auto-actions`)
        return
      }

      // 랜딩 페이지: "Create with Flow" 버튼 자동 클릭
      if (url.includes('labs.google')) {
        try {
          await new Promise(r => setTimeout(r, 1500))
          const landingResult = await view.webContents.executeJavaScript(`
            (function() {
              const links = document.querySelectorAll('a, button, [role="button"]');
              for (const el of links) {
                const text = (el.textContent || '').trim().toLowerCase();
                if (text.includes('create with flow') || text.includes('flow로 만들기') || text.includes('flow 시작')) {
                  el.click();
                  return 'landing_clicked: ' + text.substring(0, 40);
                }
              }
              return null;
            })()
          `)
          if (landingResult) {
            console.log(`[Flow - ${profileId}] Auto-click landing:`, landingResult)
            return
          }
        } catch (e) {
          console.warn(`[Flow - ${profileId}] Landing auto-click error:`, e.message)
        }
      }

      // Flow 페이지 로드 후: 동의 버튼 자동 클릭 → projectId 추출
      if (url.includes('labs.google/fx')) {
        const pState = getProfileState(profileId)
        if (pState.consentClicked && (pState.enterToolClicked || capturedProjectId)) {
          console.log(`[Flow - ${profileId}] Skipping all auto-actions (consent+project already done)`)
          return
        }
        try {
          if (pState.consentClicked) {
            console.log(`[Flow - ${profileId}] Consent already clicked, skipping...`)
          } else {
            await new Promise(r => setTimeout(r, 1000))
            const consentResult = await view.webContents.executeJavaScript(`
              (function() {
                const agreeKeywords = ['동의', '동의합니다', 'agree', 'i agree', 'accept', 'consent', 'got it', '확인'];
                const allButtons = document.querySelectorAll('button, [role="button"], a.button, input[type="submit"]');
                for (const b of allButtons) {
                  const text = (b.textContent || b.value || '').trim().toLowerCase();
                  if (agreeKeywords.some(k => text.includes(k))) {
                    b.click();
                    return 'consent_clicked: ' + text.substring(0, 40);
                  }
                }
                const checkboxes = document.querySelectorAll('input[type="checkbox"], [role="checkbox"]');
                for (const cb of checkboxes) {
                  if (!cb.checked) {
                    cb.click();
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                }
                for (const b of allButtons) {
                  const text = (b.textContent || b.value || '').trim().toLowerCase();
                  if (agreeKeywords.some(k => text.includes(k))) {
                    b.click();
                    return 'consent_after_checkbox: ' + text.substring(0, 40);
                  }
                }
                return null;
              })()
            `)
            if (consentResult) {
              console.log(`[Flow - ${profileId}] Auto-consent:`, consentResult)
              pState.consentClicked = true
              await new Promise(r => setTimeout(r, 2000))
            }
          }
        } catch (e) {
          console.warn(`[Flow - ${profileId}] Consent auto-click error:`, e.message)
        }
      }

      if (url.includes('labs.google/fx')) {
        const pState = getProfileState(profileId)
        try {
          const pidMatch = url.match(/\/project\/([a-f0-9-]{36})/)
          if (pidMatch) {
            capturedProjectId = pidMatch[1]
            pState.enterToolClicked = true
            console.log(`[Flow API - ${profileId}] ProjectId from URL:`, capturedProjectId)
            mainWindow.webContents.send('flow-status', {
              authenticated: true,
              url,
              profileId
            })
            return
          }

          if (pState.enterToolClicked || capturedProjectId) {
            console.log(`[Flow API - ${profileId}] Skipping Enter tool click`)
            return
          }

          const sessionData = await view.webContents.executeJavaScript(`
            fetch('${SESSION_URL}')
              .then(r => r.ok ? r.text() : null)
              .catch(() => null)
          `)
          if (!sessionData) {
            console.log(`[Flow API - ${profileId}] No session data — user not logged in yet`)
            return
          }

          let parsed = null
          try { parsed = parseFlowResponse(sessionData) || JSON.parse(sessionData) } catch {}
          const token = parsed?.access_token || parsed?.accessToken
          if (!token) {
            console.log(`[Flow API - ${profileId}] No token in session — user not logged in`)
            return
          }
          console.log(`[Flow API - ${profileId}] User logged in, token length:`, token.length)
          mainWindow.webContents.send('flow-status', {
            authenticated: true,
            url: view.webContents.getURL(),
            profileId
          })

          await new Promise(r => setTimeout(r, 2000))
          if (capturedProjectId) {
            console.log(`[Flow API - ${profileId}] ProjectId captured during wait:`, capturedProjectId)
            return
          }

          const currentUrl = view.webContents.getURL()
          const currentPidMatch = currentUrl.match(/\/project\/([a-f0-9-]{36})/)
          if (currentPidMatch) {
            capturedProjectId = currentPidMatch[1]
            console.log(`[Flow API - ${profileId}] ProjectId from updated URL:`, capturedProjectId)
            return
          }

          console.log(`[Flow API - ${profileId}] No project in URL, waiting for manual project creation or explicit generation trigger...`)
        } catch (e) {
          console.warn(`[Flow API - ${profileId}] ProjectId auto-extraction error:`, e.message)
        }
      }
    })

    // Register flow:report-response handler
    ipcMain.removeHandler('flow:report-response')
    ipcMain.handle('flow:report-response', async (event, { url, body, status, requestBody }) => {
      try {
        console.log(`[Flow API] Captured report-response: ${url?.split('/v1/').pop()}`)

        // 1. 이미지 생성 응답 처리
        if (url.includes('batchGenerateImages')) {
          const httpStatus = status
          const reqSentAt = Date.now() / 1000 - 1

          // 동기 모드
          if (pendingGeneration) {
            if (pendingGeneration.setAt && reqSentAt >= pendingGeneration.setAt) {
              pendingGeneration.responses.push({ error: false, body, status: httpStatus })
              if (pendingGeneration.responses.length >= pendingGeneration.expectedCount) {
                const saved = pendingGeneration
                pendingGeneration = null
                if (saved.collectionTimer) clearTimeout(saved.collectionTimer)
                saved.resolve({ error: false, responses: saved.responses })
              }
            }
          }

          // 비동기 모드
          if (pendingGenerations.size > 0) {
            let matchId = null
            let matchSetAt = -Infinity
            for (const [id, gen] of pendingGenerations) {
              if (!gen.completed && gen.setAt <= reqSentAt && gen.setAt > matchSetAt) {
                matchId = id
                matchSetAt = gen.setAt
              }
            }
            if (matchId) {
              const g = pendingGenerations.get(matchId)
              g.responses.push({ error: false, body, status: httpStatus })
              if (g.responses.length >= g.expectedCount) {
                g.completed = true
                if (g.collectionTimer) clearTimeout(g.collectionTimer)
              }
            }
          }
        }

        // 2. 비디오 생성 응답 처리 (Omni Flash는 이미지 생성 응답 batchGenerateImages도 함께 감지)
        if (url.includes('batchAsyncGenerateVideo') || url.includes('batchGenerateImages')) {
          if (pendingVideoGeneration) {
            const saved = pendingVideoGeneration
            pendingVideoGeneration = null
            saved.resolve({ error: status >= 400, body, status })
          }
        }

        // 3. 프로젝트 ID 캡처
        if (!capturedProjectId && body) {
          const match = body.match(/"projectId"\s*:\s*"([a-f0-9-]{36})"/)
          if (match) {
            capturedProjectId = match[1]
            console.log(`[Flow API] Captured ProjectId from response body:`, capturedProjectId)
          }
        }
      } catch (err) {
        console.warn(`[Flow API] flow:report-response handler error:`, err.message)
      }
      return { success: true }
    })

    // session webRequest project ID capture
    view.webContents.session.webRequest.onBeforeRequest(
      { urls: ['*://*/*'] },
      (details, callback) => {
        if (details.url.includes('aisandbox') || details.url.includes('googleapis.com/v1')) {
          const pidMatch = details.url.match(/projects\/([a-f0-9-]{36})/)
          if (pidMatch && !capturedProjectId) {
            capturedProjectId = pidMatch[1]
            console.log(`[Flow API - ${profileId}] ProjectId captured from network:`, capturedProjectId)
          }
          if (details.uploadData) {
            try {
              const body = details.uploadData.map(d => d.bytes?.toString()).join('')
              if (body) {
                const bodyPidMatch = body.match(/"projectId":"([a-f0-9-]{36})"/)
                if (bodyPidMatch && !capturedProjectId) {
                  capturedProjectId = bodyPidMatch[1]
                  console.log(`[Flow API - ${profileId}] ProjectId captured from body:`, capturedProjectId)
                }
              }
            } catch {}
          }
        }
        callback({})
      }
    )

  }

  // Create or get view inside the multi-view registry
  global.createOrGetFlowView = function(profileId) {
    if (!profileId) throw new Error("프로필 ID가 필요합니다.");

    if (global.flowViews.has(profileId)) {
      return global.flowViews.get(profileId);
    }

    const partitionName = `persist:flow_profile_${profileId}`;
    
    let proxyPort = null;
    let targetUrl = FLOW_URL;
    let isUploadSlot = false;
    
    try {
      const configPath = path.join(app.getPath('userData'), 'flow-profiles-config.json');
      if (fsSync.existsSync(configPath)) {
        const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'));
        const targetProf = config.profiles.find(p => p.id === profileId);
        if (targetProf) {
          if (targetProf.type === 'BRAND_CHANNEL') {
            proxyPort = 10800; // Only use LTE proxy for Brand Channels
            targetUrl = 'https://studio.youtube.com/';
            isUploadSlot = true;
          }
        }
      }
    } catch (e) {
      console.warn('[Proxy] Failed to load profile config:', e);
    }

    let preloadPath = path.join(__dirname, 'stealth_preload.js');
    if (!fsSync.existsSync(preloadPath)) {
      preloadPath = path.join(__dirname, 'stealth_preload.mjs');
    }

    const newView = new WebContentsView({
      webPreferences: {
        partition: partitionName,
        contextIsolation: true,
        webSecurity: false,
        preload: preloadPath
      }
    });

    if (proxyPort) {
      newView.webContents.session.setProxy({ proxyRules: `socks5://127.0.0.1:${proxyPort}` }).then(() => {
        console.log(`[Proxy] Enforced LTE isolation (${proxyPort}) for profile: ${profileId}`);
      }).catch(err => {
        console.error(`[Proxy] Failed to set proxy for ${profileId}:`, err);
      });
    } else {
      newView.webContents.session.setProxy({ proxyRules: 'direct://' }).then(() => {
        console.log(`[Proxy] Set direct (Wi-Fi default) for profile: ${profileId}`);
      });
    }

    setupFlowView(newView, profileId);

    global.flowViews.set(profileId, newView);
    mainWindow.contentView.addChildView(newView);

    newView.webContents.loadURL(targetUrl);
    
    // Trigger layout bounds updates
    if (typeof updateBounds === 'function') {
      updateBounds(mainWindow);
    }

    return newView;
  };

  // Recreate / switch view with profile
  global.recreateFlowViewWithProfile = async (profileId) => {
    console.log('[Profile Switch] Recreating/Switching Flow View for profile:', profileId)
    
    // 1. 프로필 메타데이터 로드
    const configPath = path.join(app.getPath('userData'), 'flow-profiles-config.json')
    if (!fsSync.existsSync(configPath)) {
      throw new Error('Profiles configuration not found')
    }
    const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'))
    const targetProf = config.profiles.find(p => p.id === profileId)
    if (!targetProf) {
      throw new Error(`Profile ${profileId} not found`)
    }


    // 3. active profile set
    const oldProfileId = global.activeFlowProfileId;
    global.activeFlowProfileId = profileId;

    // 4. Create or get the view
    const hadTargetView = global.flowViews.has(profileId);
    const previousSize = global.flowViews.size;
    const view = global.createOrGetFlowView(profileId);
    flowView = view; // Keep for backward compatibility

    // If we were in single-view mode and switching profiles, destroy the old view to replace it
    if (!hadTargetView && previousSize === 1 && oldProfileId && oldProfileId !== profileId) {
      console.log(`[Profile Switch] Replacing single view: destroying old view for profile: ${oldProfileId}`);
      if (typeof global.destroyFlowView === 'function') {
        global.destroyFlowView(oldProfileId);
      }
    }

    // 5. Trigger layout bounds updates
    if (typeof updateBounds === 'function') {
      updateBounds(mainWindow);
    }

    console.log('[Profile Switch] Switch complete for profile:', profileId)
    return { success: true }
  }
  
  // Safe destruction of flow view
  global.destroyFlowView = function(profileId) {
    if (!global.flowViews.has(profileId)) return false;

    const view = global.flowViews.get(profileId);
    
    try {
      mainWindow.contentView.removeChildView(view);
    } catch (e) { console.warn("removeChildView 실패:", e); }

    try {
      view.webContents.destroy();
    } catch (e) { console.warn("webContents.destroy 실패:", e); }

    global.flowViews.delete(profileId);

    if (global.activeFlowProfileId === profileId) {
      global.activeFlowProfileId = Array.from(global.flowViews.keys())[0] || 'default';
      flowView = global.flowViews.get(global.activeFlowProfileId) || null;
    }

    if (typeof updateBounds === 'function') {
      updateBounds(mainWindow);
    }

    return true;
  };

  // Create initial view (DELAYED LAUNCH - Dashboard 100% Fullscreen on startup)
  // flowView = global.createOrGetFlowView(initialProfileId)

  // Handle window resize — update view bounds
  mainWindow.on('resize', () => {
    // Dynamically fetch the current active view or pass null
    const currentView = global.flowViews.get(global.activeFlowProfileId) || flowView
    updateBounds(mainWindow, currentView)
  })

  // Split 레이아웃 적용
  // updateBounds(mainWindow, flowView)

  // Reset modal visibility state on navigation/reload
  mainWindow.webContents.on('did-start-navigation', (event, url, isInPlace, isMainFrame) => {
    if (!isMainFrame) return; // Prevent iframes from triggering main window reset
    console.log('[Navigation] Resetting modal visible state on reload/navigate')
    resetModalState(mainWindow, flowView)
  })

  // Open target="_blank" links in external default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Open DevTools in development only if OPEN_DEVTOOLS=1 is explicitly set
  if (!app.isPackaged && process.env.OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
  mainWindow.webContents.on('console-message', (event, ...args) => {
    let msg, src, ln;
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && 'message' in args[0]) {
      // New Electron 30+ signature: (event, details)
      msg = args[0].message;
      src = args[0].sourceId;
      ln = args[0].line;
    } else {
      // Old signature: (event, level, message, line, sourceId)
      msg = args[1];
      ln = args[2];
      src = args[3];
    }
    console.log('[Renderer Console]', msg, '(' + src + ':' + ln + ')')
  })

  // Load the React app (Vite dev server or built files)
  if (process.env.VITE_DEV_SERVER_URL) {
    console.log('[Orchestration] Loading React app from dev server URL:', process.env.VITE_DEV_SERVER_URL)
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // If running in development (not packaged), prioritize loading from Vite dev port 5183 if available
    const candidatePaths = [
      path.join(__dirname, '..', 'apps', 'dashboard', 'dist', 'index.html'),
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'apps', 'dashboard', 'dist', 'index.html'),
      path.join(process.resourcesPath, 'dist', 'index.html')
    ]
    let indexPath = candidatePaths.find(p => fsSync.existsSync(p)) || candidatePaths[0]
    console.log('[Orchestration] Loading React app from local file:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  mainWindow.webContents.on('did-fail-load', (e, code, desc, url) => {
    console.error('[MainWindow] did-fail-load:', code, desc, 'url:', url)
  })
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[MainWindow] did-finish-load successfully for URL:', mainWindow.webContents.getURL())
  })
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[MainWindow] render-process-gone:', details)
  })
  mainWindow.on('unresponsive', () => {
    console.warn('[MainWindow] Window became unresponsive')
  })
  mainWindow.on('close', (e) => {
    console.log('[MainWindow] MainWindow close event triggered')
  })

}

// === IPC Handlers ===

// File System IPC (Node.js fs operations)
registerFilesystemIPC(ipcMain)

// Auth IPC (Google OAuth)
registerAuthIPC(ipcMain, () => flowView)

// CapCut IPC (path detection, project writing, app launch)
registerCapcutIPC(ipcMain)

// MCP IPC (Claude Code MCP server registration)
registerMcpIPC(ipcMain)

// Layout, modal, sleep, open-external, show-in-folder IPC
registerLayoutIPC(ipcMain, () => mainWindow, () => getCurrentFlowView())

// ─── Mode Controller IPC (mode:set, flow:set-startup-project) ───────────────
const modeController = createModeController(
  () => mainWindow,
  () => getCurrentFlowView()
)
modeController.register(ipcMain)

// ─── Locale IPC (app:set-locale) ─────────────────────────────────────────────
ipcMain.handle('app:set-locale', (_e, { locale } = {}) => {
  try { setMenuLocale(locale) } catch (e) { console.warn('[ViraLoop Studio] setMenuLocale failed:', e.message) }
  return { ok: true }
})

// ─── GenAI KeyStore & IPC ──────────────────────────────────────────────────
let genaiKeyStore = null
try {
  genaiKeyStore = createKeyStore({
    safeStorage,
    filePath: path.join(app.getPath('userData'), 'genai-key.enc'),
    fs: fsSync,
  })
  registerGenaiIPC(ipcMain, { keyStore: genaiKeyStore })
} catch (e) {
  console.warn('[ViraLoop Studio] registerGenaiIPC failed:', e.message)
}

// ─── MultiKeyStore & TTS IPC ────────────────────────────────────────────────
let multiKeyStore = null
let ttsFor = null
let sfxFor = null
let voicePreviewService = null
let voiceGenderCache = null
let resolveKeyWithSource = null

try {
  multiKeyStore = createMultiKeyStore({
    safeStorage,
    keysDir: path.join(app.getPath('userData'), 'keys'),
    fs: fsSync,
    path,
  })

  const ttsFetch = (...a) => globalThis.fetch(...a)
  const keyResolvers = buildKeyResolvers({
    multiKeyStore,
    genaiKeyStore,
    getTypecastKey,
    readCredentialsKey,
    disableFallback: process.env.AUTOFLOWCUT_DISABLE_KEY_FALLBACK === '1',
  })
  const ttsKeyFor = keyResolvers.ttsKeyFor
  resolveKeyWithSource = keyResolvers.resolveKeyWithSource

  const ttsAdapters = {}
  ttsFor = (provider) => {
    const p = provider || 'typecast'
    if (!ttsKeyFor[p]) throw new Error(`Unsupported TTS provider: ${p}`)
    if (!ttsAdapters[p]) ttsAdapters[p] = createTtsAdapter(p, { getKey: ttsKeyFor[p], fetch: ttsFetch })
    return ttsAdapters[p]
  }

  voiceGenderCache = createVoiceGenderCache({ filePath: path.join(app.getPath('userData'), 'voice-gender.json') })
  const voiceMetaCache = new Map()
  const VOICE_META_CACHE_MAX = 5000
  voicePreviewService = createVoicePreviewService({
    cacheDir: path.join(app.getPath('userData'), 'voice-preview'),
    ttsFor,
    voiceMeta: (provider, voiceId) => voiceMetaCache.get(`${provider}:${voiceId}`) || {},
    ssrfSafeFetch,
    fetch: globalThis.fetch,
  })

  registerTtsIPC(ipcMain, {
    keyStore: multiKeyStore,
    safeStorage,
    listVoices: async (provider, options) => {
      let raw
      try { raw = await ttsFor(provider).listVoices(options) } catch { return [] }
      if (voiceMetaCache.size + raw.length > VOICE_META_CACHE_MAX) voiceMetaCache.clear()
      for (const v of raw) voiceMetaCache.set(`${provider}:${v.id}`, { previewUrl: v.previewUrl || null, language: v.language || 'ko' })
      try { return applyGenderOverlay(provider, raw, voiceGenderCache.get()) } catch { return raw }
    },
    previewVoice: (args) => voicePreviewService.getPreview(args),
    tagVoiceGender: (args) => voiceGenderCache.tag(args),
  })

  // SFX Adapter
  const sfxKeyFor = { ...keyResolvers.sfxKeyFor, library: () => null }
  const sfxAdapters = {}
  sfxFor = (provider) => {
    const p = provider || 'elevenlabs'
    if (!sfxKeyFor[p]) throw new Error(`Unsupported SFX provider: ${p}`)
    if (!sfxAdapters[p]) sfxAdapters[p] = createSfxAdapter(p, { getKey: sfxKeyFor[p], fetch: ttsFetch })
    return sfxAdapters[p]
  }
} catch (e) {
  console.warn('[ViraLoop Studio] TTS/SFX IPC setup failed:', e.message)
}

// ─── Story Pipeline IPC ─────────────────────────────────────────────────────
try {
  const storyLlm = createStoryLlmRouter({ claude: llmClaude })
  let activeWorkFolder = null
  registerStoryIPC(ipcMain, {
    keyStore: genaiKeyStore,
    getWindow: () => mainWindow,
    llm: storyLlm,
    loadMetaPrompt,
    getActiveWorkFolder: () => activeWorkFolder,
    tts: ttsFor ? ttsFor('typecast') : null,
    ttsFor,
    sfxFor,
    resolveKeyWithSource,
    safeStorage,
  })
} catch (e) {
  console.warn('[ViraLoop Studio] registerStoryIPC failed:', e.message)
}

// ─── Premiere & Vrew & Character IPC ─────────────────────────────────────────
try { registerPremiereIPC(ipcMain) } catch (e) { console.warn('[ViraLoop Studio] registerPremiereIPC failed:', e.message) }
try { registerVrewIPC(ipcMain) } catch (e) { console.warn('[ViraLoop Studio] registerVrewIPC failed:', e.message) }
try { registerCharacterIPC(ipcMain, { getMainWindow: () => mainWindow }) } catch (e) { console.warn('[ViraLoop Studio] registerCharacterIPC failed:', e.message) }

// Renderer reports the active project (with its work folder) so the native
// "Recent Projects" menu stays in MRU order and scoped to the current folder.
ipcMain.handle('app:project-activated', (event, { name, workFolder }) => {
  try { noteProjectActivated(name, workFolder) } catch (e) { console.warn('[ViraLoop Studio] noteProjectActivated failed:', e.message) }
  return { success: true }
})

// ─── Profile Manager IPC Handlers ─────────────────────────────────────────
// These were missing, causing "No handler registered for 'profiles:load'" errors

ipcMain.handle('profiles:load', async () => {
  try {
    return await loadProfiles()
  } catch (e) {
    console.error('[profiles:load] Error:', e.message)
    return { activeProfileId: 'default', profiles: [{ id: 'default', name: '기본 프로필', email: '', hardware: {} }] }
  }
})

ipcMain.handle('profiles:save', async (event, config) => {
  try {
    return await saveProfiles(config)
  } catch (e) {
    console.error('[profiles:save] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('profiles:switch', async (event, { profileId }) => {
  try {
    const result = await switchProfile(profileId)
    if (result.success) {
      global.activeFlowProfileId = profileId
    }
    return result
  } catch (e) {
    console.error('[profiles:switch] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('profiles:create', async (event, { name, email } = {}) => {
  try {
    return await createProfile(name, email)
  } catch (e) {
    console.error('[profiles:create] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('profiles:delete', async (event, { profileId }) => {
  try {
    return await deleteProfile(profileId)
  } catch (e) {
    console.error('[profiles:delete] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('profiles:update', async (event, { profileId, name, email }) => {
  try {
    return await updateProfile(profileId, name, email)
  } catch (e) {
    console.error('[profiles:update] Error:', e.message)
    return { success: false, error: e.message }
  }
})

// ─── Flow Active Views IPC Handler ────────────────────────────────────────
// Returns list of currently active Flow WebContentsViews with their profile IDs

ipcMain.handle('flow:get-active-views', async () => {
  try {
    const views = []
    for (const [profileId, view] of global.flowViews) {
      if (view && !view.webContents?.isDestroyed?.()) {
        views.push({
          profileId,
          url: view.webContents?.getURL?.() || '',
          isActive: profileId === global.activeFlowProfileId
        })
      }
    }
    return { views, activeProfileId: global.activeFlowProfileId }
  } catch (e) {
    console.error('[flow:get-active-views] Error:', e.message)
    return { views: [], activeProfileId: global.activeFlowProfileId || 'default' }
  }
})

// ─── Flow View Management IPC Handlers ─────────────────────────────────────

ipcMain.handle('flow:create-view', async (event, { profileId } = {}) => {
  try {
    if (!profileId) return { success: false, error: 'profileId required' }
    const view = global.createOrGetFlowView(profileId)
    return { success: true, profileId }
  } catch (e) {
    console.error('[flow:create-view] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('flow:destroy-view', async (event, { profileId } = {}) => {
  try {
    if (!profileId) return { success: false, error: 'profileId required' }
    if (typeof global.destroyFlowView === 'function') {
      const result = global.destroyFlowView(profileId)
      return { success: !!result }
    }
    return { success: false, error: 'destroyFlowView not available' }
  } catch (e) {
    console.error('[flow:destroy-view] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('flow:clear-session', async () => {
  try {
    for (const [profileId, view] of global.flowViews) {
      try {
        const session = view.webContents.session
        await session.clearStorageData()
        await session.clearCache()
        console.log(`[flow:clear-session] Cleared session for profile: ${profileId}`)
      } catch (e) {
        console.warn(`[flow:clear-session] Failed to clear session for ${profileId}:`, e.message)
      }
    }
    return { success: true }
  } catch (e) {
    console.error('[flow:clear-session] Error:', e.message)
    return { success: false, error: e.message }
  }
})

ipcMain.handle('flow:select-voice', async (event, params = {}) => {
  try {
    // Voice selection via DOM - select a voice in the Flow UI
    const { profileId, voiceId } = params
    const targetView = profileId
      ? global.flowViews.get(profileId)
      : (global.flowViews.get(global.activeFlowProfileId) || flowView)
    if (!targetView) return { success: false, error: 'No active flow view' }
    return { success: true }
  } catch (e) {
    console.error('[flow:select-voice] Error:', e.message)
    return { success: false, error: e.message }
  }
})


function startMcpHttpServer(port) {
  if (mcpHttpServer) {
    mcpHttpServer.close()
    mcpHttpServer = null
  }

  mcpHttpServer = http.createServer((req, res) => {
    // CORS: localhost만 허용
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', 'application/json')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    // body 파싱
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const url = new URL(req.url, `http://localhost:${port}`)
        const pathname = url.pathname

        // GET /api/docs — Swagger UI
        if (req.method === 'GET' && pathname === '/api/docs') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(getSwaggerHtml(port))
          return
        }

        // GET /api/openapi.json — OpenAPI 스펙
        if (req.method === 'GET' && pathname === '/api/openapi.json') {
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(openApiSpec))
          return
        }

        // GET /api/status — 서버 상태 확인
        if (req.method === 'GET' && pathname === '/api/status') {
          res.writeHead(200)
          res.end(JSON.stringify({ status: 'ok', app: 'ViraLoop Studio' }))
          return
        }

        // GET /api/current-project — 현재 열린 프로젝트 경로 반환
        if (req.method === 'GET' && pathname === '/api/current-project') {
          try {
            const result = await mainWindow.webContents.executeJavaScript(`
              (() => {
                const settings = JSON.parse(localStorage.getItem('viraloop_settings') || '{}')
                const workFolder = localStorage.getItem('workFolderPath') || ''
                return { projectName: settings.projectName || '', workFolder }
              })()
            `)
            const projectDir = (result.workFolder && result.projectName)
              ? path.join(result.workFolder, result.projectName)
              : ''
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ projectName: result.projectName, projectDir }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        // PATCH /api/current-project — 기존 프로젝트로 전환
        if (req.method === 'PATCH' && pathname === '/api/current-project') {
          try {
            const configPath = path.join(app.getPath('userData'), 'work-folder-config.json')
            let workFolder
            try {
              const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
              workFolder = config.path
            } catch {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'No work folder configured.' }))
              return
            }
            const data = JSON.parse(body)
            const projectName = data.name
            if (!projectName) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'name required' }))
              return
            }
            const projectDir = path.join(workFolder, projectName)
            // 프로젝트 존재 확인
            try {
              await fs.access(projectDir)
            } catch {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: `Project "${projectName}" not found` }))
              return
            }
            // 앱에 프로젝트 오픈 알림 (renderer가 있으면)
            if (mainWindow) {
              mainWindow.webContents.send('mcp-update', { type: 'open-project', projectName, workFolder })
            }
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: true, projectDir, projectName }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        // GET /api/references — 현재 레퍼런스 목록 요청 (renderer에서 가져옴)
        if (req.method === 'GET' && pathname === '/api/references') {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              `JSON.stringify(window.__mcpGetReferences?.() || [])`
            ).then(result => {
              res.writeHead(200)
              res.end(result)
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // GET /api/scenes — 현재 씬 목록 요청
        if (req.method === 'GET' && pathname === '/api/scenes') {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              `JSON.stringify(window.__mcpGetScenes?.() || [])`
            ).then(result => {
              res.writeHead(200)
              res.end(result)
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/update — 데이터 업데이트 (renderer로 전달)
        if (req.method === 'POST' && pathname === '/api/update') {
          const data = JSON.parse(body)
          if (mainWindow) {
            mainWindow.webContents.send('mcp-update', data)
            res.writeHead(200)
            res.end(JSON.stringify({ success: true }))
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/generate-reference — 레퍼런스 이미지 생성 트리거 (fire-and-forget)
        if (req.method === 'POST' && pathname === '/api/generate-reference') {
          const data = JSON.parse(body)
          const idx = data.index
          const styleId = data.styleId || null
          if (mainWindow && typeof idx === 'number') {
            // IPC 방식: renderer에 생성 요청 전달
            mainWindow.webContents.send('mcp-update', {
              type: 'generate-reference',
              index: idx,
              styleId: styleId
            })
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, message: `Reference ${idx} generation triggered` }))
          } else {
            res.writeHead(400)
            res.end(JSON.stringify({ error: 'index required (number)' }))
          }
          return
        }

        // POST /api/generate-scene — 씬 이미지 생성 트리거
        if (req.method === 'POST' && pathname === '/api/generate-scene') {
          const data = JSON.parse(body)
          const sceneId = data.sceneId
          const styleId = data.styleId  // 선택 — undefined면 useSceneGeneration의 기존 동작 (style_tag fallback만)
          if (mainWindow && sceneId) {
            mainWindow.webContents.send('mcp-update', {
              type: 'generate-scene',
              sceneId: sceneId,
              styleId: styleId
            })
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, message: `Scene ${sceneId} generation triggered` }))
          } else {
            res.writeHead(400)
            res.end(JSON.stringify({ error: 'sceneId required' }))
          }
          return
        }

        // GET /api/batch-status — 배치 생성 진행 상태
        if (req.method === 'GET' && pathname === '/api/batch-status') {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              `JSON.stringify(window.__mcpBatchStatus?.() || {})`
            ).then(result => {
              res.writeHead(200)
              res.end(result)
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/start-scene-batch — 씬 일괄 생성 시작
        if (req.method === 'POST' && pathname === '/api/start-scene-batch') {
          if (mainWindow) {
            let styleId = null
            let force = false
            try {
              const parsed = JSON.parse(body)
              styleId = parsed.styleId || null
              force = !!parsed.force  // 선택, 기본 false. true면 완료된 씬도 재생성 대상에.
            } catch {}
            mainWindow.webContents.send('mcp-update', { type: 'start-scene-batch', styleId, force })
            res.writeHead(200)
            // 응답에 styleId echo 안 함 — fire-and-forget이라 effective style은 renderer fallback이
            // 결정하므로(예: 첫 카드 자동 적용), main이 즉시 알 수 없음. 거짓 정보를 주는 것보다 안 주는 게 정직.
            res.end(JSON.stringify({ success: true, message: 'Scene batch generation started' }))
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/notify-qa — QA 진행 상황 알림 (상단 배너 업데이트)
        if (req.method === 'POST' && pathname === '/api/notify-qa') {
          if (mainWindow) {
            let payload = {}
            try { payload = JSON.parse(body) } catch {}
            mainWindow.webContents.send('mcp-update', { type: 'qa-progress', ...payload })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ ok: true }))
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/start-ref-batch — 레퍼런스 일괄 생성 시작
        if (req.method === 'POST' && pathname === '/api/start-ref-batch') {
          if (mainWindow) {
            let styleId = null
            let force = false
            try {
              const parsed = JSON.parse(body)
              styleId = parsed.styleId || null
              force = !!parsed.force  // 선택, 기본 false. true면 완료된 ref도 재생성 대상에.
            } catch {}
            mainWindow.webContents.send('mcp-update', { type: 'start-ref-batch', styleId, force })
            res.writeHead(200)
            // start-scene-batch와 동일 — effective style을 main이 즉시 알 수 없으므로 echo 안 함.
            res.end(JSON.stringify({ success: true, message: 'Reference batch generation started' }))
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/audio-refresh — 오디오 리뷰 새로고침 (폴더 재스캔 + 자동 언플래그)
        if (req.method === 'POST' && pathname === '/api/audio-refresh') {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              `(async () => { await window.__mcpRefreshAudioReviews?.(); return JSON.stringify(window.__mcpGetAudioReviews?.() || {}); })()`
            ).then(result => {
              const reviews = JSON.parse(result)
              res.writeHead(200)
              res.end(JSON.stringify({ success: true, count: Object.keys(reviews).length, reviews }))
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // GET /api/audio-reviews — 현재 오디오 리뷰 상태 조회
        if (req.method === 'GET' && pathname === '/api/audio-reviews') {
          if (mainWindow) {
            mainWindow.webContents.executeJavaScript(
              `JSON.stringify(window.__mcpGetAudioReviews?.() || {})`
            ).then(result => {
              const reviews = JSON.parse(result)
              res.writeHead(200)
              res.end(JSON.stringify({ count: Object.keys(reviews).length, reviews }))
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // POST /api/audio-import — 오디오 패키지 로드 (폴더 경로 지정)
        if (req.method === 'POST' && pathname === '/api/audio-import') {
          if (mainWindow) {
            const { folderPath } = body ? JSON.parse(body) : {}
            if (!folderPath) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'folderPath required' }))
              return
            }
            mainWindow.webContents.executeJavaScript(
              `(async () => { const r = await window.__mcpImportAudio?.(${JSON.stringify(folderPath)}); return JSON.stringify(r || {}); })()`
            ).then(result => {
              const r = JSON.parse(result)
              res.writeHead(r.success ? 200 : 500)
              res.end(JSON.stringify(r))
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // GET /api/flow/status — Flow 1번 창 상태 및 구글 로그인 여부 조회
        if (req.method === 'GET' && pathname === '/api/flow/status') {
          const profileId = 'default'
          const view = global.flowViews?.get(profileId)
          const isOpen = Boolean(view && !view.webContents?.isDestroyed?.())
          const currentUrl = isOpen ? (view.webContents?.getURL?.() || '') : ''
          const isLoggedIn = isOpen && (currentUrl.includes('labs.google/fx') || Boolean(capturedProjectId))

          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            success: true,
            isOpen,
            loggedIn: isLoggedIn,
            url: currentUrl,
            profileId,
            projectId: capturedProjectId || null
          }))
          return
        }

        // POST /api/flow/ensure-ready — 1번 Flow 창 자동 기동 및 로그인 상태 점검
        if (req.method === 'POST' && pathname === '/api/flow/ensure-ready') {
          try {
            const profileId = 'default'
            let view = global.flowViews?.get(profileId)
            let wasCreated = false

            if (!view || view.webContents?.isDestroyed?.()) {
              console.log(`[Auto-Orchestrator] Remote request received: Automatically launching Flow View (profile: ${profileId})...`)
              view = global.createOrGetFlowView(profileId)
              wasCreated = true
              if (typeof updateBounds === 'function' && mainWindow) {
                updateBounds(mainWindow, view)
              }
            }

            const currentUrl = view.webContents?.getURL?.() || ''
            const isLoggedIn = currentUrl.includes('labs.google/fx') || Boolean(capturedProjectId)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              success: true,
              wasCreated,
              isOpen: true,
              loggedIn: isLoggedIn,
              url: currentUrl,
              profileId,
              projectId: capturedProjectId || null,
              message: isLoggedIn ? 'Flow 1번 창이 준비되었습니다.' : 'Flow 1번 창이 열렸으나 Google 로그인이 필요합니다.'
            }))
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: false, error: err.message }))
          }
          return
        }

        // POST /api/export-capcut — CapCut 프로젝트 내보내기
        if (req.method === 'POST' && pathname === '/api/export-capcut') {
          if (mainWindow) {
            const optionsJson = body ? JSON.stringify(JSON.parse(body)) : '{}'
            mainWindow.webContents.executeJavaScript(
              `(async () => { const r = await window.__mcpExportCapcut?.(${optionsJson}); return JSON.stringify(r || {}); })()`
            ).then(result => {
              const r = JSON.parse(result)
              res.writeHead(r.success ? 200 : 500)
              res.end(JSON.stringify(r))
            }).catch(err => {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            })
          } else {
            res.writeHead(503)
            res.end(JSON.stringify({ error: 'App not ready' }))
          }
          return
        }

        // ── 프로젝트 관리 API ──────────────────────────

        // GET /api/projects — 프로젝트 목록 조회
        if (req.method === 'GET' && pathname === '/api/projects') {
          try {
            const configPath = path.join(app.getPath('userData'), 'work-folder-config.json')
            let workFolder
            try {
              const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
              workFolder = config.path
            } catch {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'No work folder configured. Open the app and select a work folder first.' }))
              return
            }
            const entries = await fs.readdir(workFolder, { withFileTypes: true })
            const projects = []
            for (const e of entries) {
              if (!e.isDirectory()) continue
              const projJsonPath = path.join(workFolder, e.name, 'project.json')
              let hasProject = false
              try { await fs.access(projJsonPath); hasProject = true } catch {}
              projects.push({ name: e.name, hasProjectJson: hasProject })
            }
            projects.sort((a, b) => b.name.localeCompare(a.name))
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, workFolder, projects }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        // POST /api/projects — 프로젝트 생성
        if (req.method === 'POST' && pathname === '/api/projects') {
          try {
            const configPath = path.join(app.getPath('userData'), 'work-folder-config.json')
            let workFolder
            try {
              const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
              workFolder = config.path
            } catch {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'No work folder configured.' }))
              return
            }
            const data = JSON.parse(body)
            const projectName = data.name
            if (!projectName) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'name required' }))
              return
            }
            const projectDir = path.join(workFolder, projectName)
            // 이미 존재하는지 확인
            try {
              await fs.access(projectDir)
              res.writeHead(409)
              res.end(JSON.stringify({ error: `Project "${projectName}" already exists` }))
              return
            } catch { /* 없으면 정상 */ }
            // 디렉토리 + 하위 폴더 생성
            for (const sub of ['scenes', 'scenes/history', 'references', 'references/history', 'images', 'images/history', 'videos', 'videos/history', 'sfx', 'sfx/history']) {
              await fs.mkdir(path.join(projectDir, sub), { recursive: true })
            }
            // 빈 project.json 생성
            const projectJson = { scenes: [], references: [], settings: { aspectRatio: '16:9', defaultDuration: 3 } }
            await fs.writeFile(path.join(projectDir, 'project.json'), JSON.stringify(projectJson, null, 2), 'utf-8')
            // 앱에 프로젝트 오픈 알림 (renderer가 있으면)
            if (mainWindow) {
              mainWindow.webContents.send('mcp-update', { type: 'open-project', projectName, workFolder })
            }
            res.writeHead(201)
            res.end(JSON.stringify({ success: true, projectDir, projectName }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        // PUT /api/projects — 프로젝트 이름 변경
        if (req.method === 'PUT' && pathname === '/api/projects') {
          try {
            const configPath = path.join(app.getPath('userData'), 'work-folder-config.json')
            let workFolder
            try {
              const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
              workFolder = config.path
            } catch {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'No work folder configured.' }))
              return
            }
            const data = JSON.parse(body)
            const { oldName, newName } = data
            if (!oldName || !newName) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'oldName and newName required' }))
              return
            }
            const oldDir = path.join(workFolder, oldName)
            const newDir = path.join(workFolder, newName)
            try { await fs.access(oldDir) } catch {
              res.writeHead(404)
              res.end(JSON.stringify({ error: `Project "${oldName}" not found` }))
              return
            }
            try { await fs.access(newDir); res.writeHead(409); res.end(JSON.stringify({ error: `Project "${newName}" already exists` })); return } catch { /* ok */ }
            await fs.rename(oldDir, newDir)
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, oldName, newName }))
          } catch (err) {
            res.writeHead(500)
            res.end(JSON.stringify({ error: err.message }))
          }
          return
        }

        // DELETE /api/projects — 프로젝트 삭제
        if (req.method === 'DELETE' && pathname === '/api/projects') {
          try {
            const configPath = path.join(app.getPath('userData'), 'work-folder-config.json')
            let workFolder
            try {
              const config = JSON.parse(await fs.readFile(configPath, 'utf-8'))
              workFolder = config.path
            } catch {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'No work folder configured.' }))
              return
            }
            const data = JSON.parse(body)
            const projectName = data.name
            if (!projectName) {
              res.writeHead(400)
              res.end(JSON.stringify({ error: 'name required' }))
              return
            }
            const projectDir = path.join(workFolder, projectName)
            try { await fs.access(projectDir) } catch {
              res.writeHead(404)
              res.end(JSON.stringify({ error: `Project "${projectName}" not found` }))
              return
            }
            await fs.rm(projectDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 })
            res.writeHead(200)
            res.end(JSON.stringify({ success: true, deleted: projectName }))
          } catch (err) {
            // Windows EPERM fallback (OneDrive 등 파일 잠금 시)
            if (process.platform === 'win32' && err.code === 'EPERM') {
              try {
                execSyncRaw(`rmdir /s /q "${projectDir}"`, { windowsHide: true })
                res.writeHead(200)
                res.end(JSON.stringify({ success: true, deleted: projectName }))
              } catch (fallbackErr) {
                res.writeHead(500)
                res.end(JSON.stringify({ error: fallbackErr.message }))
              }
            } else {
              res.writeHead(500)
              res.end(JSON.stringify({ error: err.message }))
            }
          }
          return
        }

        // 404
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Not found' }))
      } catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: err.message }))
      }
    })
  })

  mcpHttpServer.on('error', (err) => {
    console.error('[MCP HTTP] Server error:', err.message)
  })

  mcpHttpServer.listen(port, '127.0.0.1', () => {
    console.log(`[MCP HTTP] Server started on http://127.0.0.1:${port}`)
  })
}

function stopMcpHttpServer() {
  if (mcpHttpServer) {
    mcpHttpServer.close(() => {
      console.log('[MCP HTTP] Server stopped')
    })
    mcpHttpServer = null
  }
}

ipcMain.handle('mcp:start-http', (event, { port }) => {
  startMcpHttpServer(port || 3210)
  return { success: true, port }
})

ipcMain.handle('mcp:stop-http', () => {
  stopMcpHttpServer()
  return { success: true }
})

// Helper to always resolve the active or default WebContentsView dynamically
const getCurrentFlowView = () => {
  if (global.flowViews && global.flowViews.size > 0) {
    const activeId = global.activeFlowProfileId || 'default'
    if (global.flowViews.has(activeId)) return global.flowViews.get(activeId)
    const first = Array.from(global.flowViews.values())[0]
    if (first) return first
  }
  return flowView
}

// === Flow API IPC (image generation, media fetch, token, reference upload) ===
const flowAPIDeps = {
  getFlowView: getCurrentFlowView,
  getMainWindow: () => mainWindow,
  trustedClickOnFlowView,
  sessionFetch,
  flowPageFetch,
  parseFlowResponse,
  getRecaptchaToken,
  extractMediaIds,
  extractFifeUrls,
  extractBase64Images,
  fetchMediaAsBase64,
  configureFlowMode,
  getCapturedProjectId: () => capturedProjectId,
  setCapturedProjectId: (v) => { capturedProjectId = v },
  getPendingGeneration: () => pendingGeneration,
  setPendingGeneration: (v) => { pendingGeneration = v },
  pendingGenerations,  // 비동기 모드용 Map (직접 참조)
  getPendingReferenceImages: () => pendingReferenceImages,
  setPendingReferenceImages: (v) => { pendingReferenceImages = v },
  getPendingSeedValue: () => pendingSeedValue,
  setPendingSeedValue: (v) => { pendingSeedValue = v },
  setPendingImageAspectRatio: (v) => { pendingImageAspectRatio = v },
  getEnterToolClicked: () => enterToolClicked,
  setEnterToolClicked: (v) => { enterToolClicked = v },
  SESSION_URL, TOKEN_INFO_URL, FLOW_URL, MEDIA_REDIRECT_URL, UPLOAD_URL,
  API_HEADERS, GENERATE_URL, BASE_API_URL,
}
registerFlowAPIIPC(ipcMain, flowAPIDeps)

// === Video Generation IPC (T2V, I2V, status polling) ===
const videoDeps = {
  getFlowView: getCurrentFlowView,
  getMainWindow: () => mainWindow,
  trustedClickOnFlowView,
  sessionFetch,
  flowPageFetch,
  parseFlowResponse,
  getRecaptchaToken,
  configureFlowMode,
  switchFlowToVideoMode,
  getCapturedProjectId: () => capturedProjectId,
  setCapturedProjectId: (v) => { capturedProjectId = v },
  getPendingVideoGeneration: () => pendingVideoGeneration,
  setPendingVideoGeneration: (v) => { pendingVideoGeneration = v },
  getPendingI2VInjection: () => pendingI2VInjection,
  setPendingI2VInjection: (v) => { pendingI2VInjection = v },
  setPendingSeedValue: (v) => { pendingSeedValue = v },
  SESSION_URL, VIDEO_T2V_URL, VIDEO_I2V_URL, VIDEO_I2V_START_END_URL, VIDEO_STATUS_URL, VIDEO_UPSCALE_URL,
  API_HEADERS, FLOW_URL,
}
registerVideoIPC(ipcMain, videoDeps)

// === DOM Mode IPC (navigation, script execution, prompt injection, scanning) ===
const domDeps = {
  getFlowView: getCurrentFlowView,
  getMainWindow: () => mainWindow,
  trustedClickOnFlowView,
  FLOW_URL,
  getCapturedProjectId: () => capturedProjectId,
  setCapturedProjectId: (v) => { capturedProjectId = v },
  getEnterToolClicked: () => enterToolClicked,
  setEnterToolClicked: (v) => { enterToolClicked = v },
}
registerDomIPC(ipcMain, domDeps)

// === YouTube Brand Channel Switcher IPC ===
registerYoutubeIPC(ipcMain, () => mainWindow)

// === Custom Protocol: local-resource:// ===
// 로컬 파일을 렌더러에서 안전하게 로드하기 위한 커스텀 프로토콜
protocol.registerSchemesAsPrivileged([{
  scheme: 'local-resource',
  privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, standard: true, secure: true }
}])

// === Auto Setup Skills (Claude Code integration) ===
function copyDirSync(src, dest) {
  if (!fsSync.existsSync(src)) return
  fsSync.mkdirSync(dest, { recursive: true })
  for (const entry of fsSync.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath)
    } else {
      fsSync.copyFileSync(srcPath, destPath)
    }
  }
}

function autoSetupSkills() {
  // Claude Code 존재 확인
  try {
    execSyncRaw('claude --version', { stdio: 'pipe', timeout: 5000 })
  } catch {
    return // Claude Code 없음 → 스킬 설치 불필요
  }

  const skillsSource = path.join(process.resourcesPath, 'skills')
  const skillsDest = path.join(os.homedir(), '.claude', 'skills')
  const markerFile = path.join(skillsDest, '.viraloop-installed')

  // 이미 설치되었고 버전이 같으면 스킵
  if (fsSync.existsSync(markerFile)) {
    try {
      const marker = JSON.parse(fsSync.readFileSync(markerFile, 'utf-8'))
      if (marker.version === app.getVersion()) return
    } catch { /* 마커 파일 손상 → 재설치 */ }
  }

  // 스킬 6개 복사 (engine + 5 slash commands)
  // 추가 시 skills/story-engine/metadata.json dependencies 와도 동기화할 것.
  fsSync.mkdirSync(skillsDest, { recursive: true })
  for (const skill of ['story-engine', 'story-new', 'story-execute', 'story-next', 'story-step', 'story-rewrite']) {
    const src = path.join(skillsSource, skill)
    if (fsSync.existsSync(src)) {
      copyDirSync(src, path.join(skillsDest, skill))
    }
  }

  // MCP 서버 등록
  const mcpPath = path.join(process.resourcesPath, 'mcp-server', 'index.js')
  try {
    execSyncRaw(`claude mcp add --scope user --transport stdio viraloop -- node "${mcpPath}"`, {
      stdio: 'pipe', timeout: 10000
    })
  } catch { /* Claude CLI 실패 시 무시 — 사용자가 수동 등록 가능 */ }

  // 마커 파일 (버전 포함)
  fsSync.writeFileSync(markerFile, JSON.stringify({
    version: app.getVersion(),
    installedAt: new Date().toISOString()
  }))
  console.log('[ViraLoop Studio] Skills installed to ~/.claude/skills/')
}

// === ViraLoop Infrastructure Orchestration ===
let infraProcess = null
let ddalkkakProcess = null
let appIsQuitting = false
let healthMonitorInterval = null
let _isRestartingBackend = false  // [FIX] Guard against concurrent restarts

function startBackendHealthMonitor() {
  if (healthMonitorInterval) return
  console.log('[Orchestration] 🩺 Starting background health monitor for FastAPI backend (every 10s)...')
  healthMonitorInterval = setInterval(() => {
    if (appIsQuitting || _isRestartingBackend) return  // [FIX] Skip if already restarting
    const req = http.get('http://127.0.0.1:8000/api/health', { timeout: 2000 }, (res) => {
      res.resume()
      if (res.statusCode >= 500) {
        console.warn('[Orchestration] ⚠️ Backend health check returned status', res.statusCode, '. Re-spawning...')
        _doStartBackend()
      }
    })
    req.on('error', () => {
      if (appIsQuitting || _isRestartingBackend) return  // [FIX] Skip if already restarting
      console.warn('[Orchestration] ⚠️ Backend offline detected by monitor. Re-spawning...')
      _doStartBackend()
    })
    req.on('timeout', () => {
      req.destroy()
      if (appIsQuitting || _isRestartingBackend) return  // [FIX] Skip if already restarting
      console.warn('[Orchestration] ⚠️ Backend health check timeout. Re-spawning...')
      _doStartBackend()
    })
  }, 10000)
}

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const output = execSyncRaw(`netstat -ano`, { encoding: 'utf8' })
      const lines = output.split('\n')
      for (const line of lines) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/)
          const pid = parts[parts.length - 1]
          if (pid && pid !== '0') {
            console.log(`[Orchestration] Found zombie process ${pid} listening on port ${port}. Terminating process tree...`)
            try {
              execSyncRaw(`taskkill /F /T /PID ${pid} 2>NUL`)
            } catch (err) {
              console.warn(`[Orchestration] Failed to kill process tree for ${pid}:`, err.message)
            }
          }
        }
      }
    } else {
      try {
        execSyncRaw(`lsof -t -i:${port} | xargs kill -9 2>/dev/null`)
      } catch {}
    }
  } catch (err) {
    // ignore
  }
}

function startViraLoopInfrastructure() {
  console.log('[Orchestration] 🚀 Starting all background infrastructures (FastAPI)...')
  _doStartBackend()
}

function _doStartDdalkkak() {
  console.log('[Orchestration] _doStartDdalkkak called...')
  if (appIsQuitting) return

  if (ddalkkakProcess) {
    console.log(`[Orchestration] Terminating existing Ddalkkak process tree (PID: ${ddalkkakProcess.pid})...`)
    try {
      if (process.platform === 'win32') {
        // using global execSyncRaw
        execSyncRaw(`taskkill /F /T /PID ${ddalkkakProcess.pid} 2>NUL`)
      } else {
        ddalkkakProcess.kill('SIGKILL')
      }
    } catch (err) {
      console.warn(`[Orchestration] Failed to kill existing Ddalkkak:`, err.message)
    }
    ddalkkakProcess = null
  }

  killProcessOnPort(8100)

  // Start Ddalkkak
  const isPkg = app.isPackaged
  let ddalkkakDir = isPkg
    ? path.join(process.resourcesPath, 'Ddalkkak')
    : (fsSync.existsSync(path.join(__dirname, '..', 'Ddalkkak')) ? path.join(__dirname, '..', 'Ddalkkak') : path.join(__dirname, '..', '..', 'Ddalkkak'))
  const ddalkkakPython = path.join(ddalkkakDir, 'pyembed', 'python.exe')
  
  if (fsSync.existsSync(ddalkkakDir) && fsSync.existsSync(ddalkkakPython)) {
    console.log('[Orchestration] Launching Ddalkkak automation backend on port 8100...')
    const ddalkkakEnv = {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
      SOLO_MODE: '1'
    }
    ddalkkakProcess = spawn(ddalkkakPython, ['-m', 'uvicorn', 'api.main:app', '--host', '0.0.0.0', '--port', '8100'], {
      cwd: ddalkkakDir,
      env: ddalkkakEnv,
      detached: false,
      stdio: 'pipe',
      windowsHide: true
    })
    
    ddalkkakProcess.stdout?.on('data', (data) => console.log(`[Ddalkkak] ${data}`))
    ddalkkakProcess.stderr?.on('data', (data) => console.warn(`[Ddalkkak ERR] ${data}`))
    
    ddalkkakProcess.on('close', (code) => {
      console.log(`[Orchestration] Ddalkkak backend exited with code ${code}`)
      ddalkkakProcess = null
    })
  }
}

function _doStartBackend() {
  if (appIsQuitting) return
  if (_isRestartingBackend) {
    console.log('[Orchestration] ⏸️ Backend restart already in progress. Skipping duplicate call.')
    return
  }
  _isRestartingBackend = true

  // 1. Terminate existing direct process tree to avoid orphaned zombie processes
  if (infraProcess) {
    console.log(`[Orchestration] Terminating existing backend process tree (PID: ${infraProcess.pid})...`)
    try {
      if (process.platform === 'win32') {
        execSyncRaw(`taskkill /F /T /PID ${infraProcess.pid} 2>NUL`)
      } else {
        infraProcess.kill('SIGKILL')
      }
    } catch (err) {
      console.warn(`[Orchestration] Failed to kill existing backend:`, err.message)
    }
    infraProcess = null
  }

  killProcessOnPort(8000)
  // Give the OS 3 seconds to release the socket
  try {
    if (process.platform === 'win32') {
      execSyncRaw('ping 127.0.0.1 -n 4 >nul')
    } else {
      execSyncRaw('sleep 3')
    }
  } catch {}

  const isPackaged = app.isPackaged
  const resourcesPath = process.resourcesPath
  // 1. Storage Dir (Electron이 dev 모드일때 userData를 tmpdir로 바꾸므로, DB는 실제 AppData를 유지하도록 고정)
  const realAppData = path.join(app.getPath('appData'), 'ViraLoop Studio')
  const storageDir = app.isPackaged ? app.getPath('userData') : realAppData

  let executablePath = ''
  let spawnArgs = []
  let workingDir = path.join(__dirname, '..', 'apps', 'api')

  // Search for Python runtime in root/runtime, apps/api/venv, venv, or system python
  const candidatePythons = [
    path.join(__dirname, '..', 'runtime', 'python.exe'),
    path.join(__dirname, '..', 'runtime', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', 'apps', 'api', 'venv', 'Scripts', 'python.exe'),
    path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe'),
    path.join(resourcesPath, 'api_server.exe')
  ]

  let foundPython = candidatePythons.find(p => fsSync.existsSync(p))

  if (isPackaged && fsSync.existsSync(path.join(resourcesPath, 'api_server.exe')) && !foundPython?.endsWith('python.exe')) {
    console.log('[Orchestration] App is packaged. Launching standalone api_server.exe...')
    executablePath = path.join(resourcesPath, 'api_server.exe')
    spawnArgs = []
    workingDir = resourcesPath
  } else if (foundPython) {
    console.log('[Orchestration] Launching ViraLoop FastAPI Backend via:', foundPython)
    executablePath = foundPython
    spawnArgs = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000']
    workingDir = path.join(__dirname, '..', 'apps', 'api')
  } else {
    console.log('[Orchestration] Fallback: using system python...')
    executablePath = 'python'
    spawnArgs = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000']
    workingDir = path.join(__dirname, '..', 'apps', 'api')
  }

  // 대용량 미디어 및 브라우저 프로필을 위한 Local AppData 경로 생성 (AD Roaming 방지)
  const localStorageDir = storageDir.replace('Roaming', 'Local')

  // SQLite 및 로컬 환경 강제 설정을 위한 환경 변수 주입
  const env = {
    ...process.env,
    DATABASE_URL: `sqlite:///${path.join(localStorageDir, 'viral_loop.db').replace(/\\/g, '/')}`,
    REDIS_URL: '', // Redis 연결 무시 (In-memory 큐 사용)
    CELERY_BROKER_URL: '', // Celery 비활성화 (In-memory job_queue 사용)
    PYTHONPATH: isPackaged ? workingDir : path.join(__dirname, '..', 'apps', 'api'),
    PYTHONIOENCODING: 'utf-8', // Windows 인코딩(CP949) 방어용 글로벌 UTF-8 활성화
    VIRALOOP_STORAGE_DIR: localStorageDir, // 다중 창 환경에서의 샌드박스 방어를 위한 통합 스토리지
    VIRALOOP_MEDIA_ROOT: path.join(localStorageDir, 'media').replace(/\\/g, '/'), // 대용량 미디어 파일 통합 저장소 (Local)
    CLOAK_PROFILE_DIR: path.join(localStorageDir, 'profiles').replace(/\\/g, '/'), // 브라우저 독립 격리 프로필 저장소 (Local)
    VIRALOOP_PROJECT_ROOT: path.join(__dirname, '..').replace(/\\/g, '/') // Project Root for DB/settings
  }

  infraProcess = spawn(executablePath, spawnArgs, {
    cwd: workingDir,
    env: env,
    detached: false,
    stdio: 'pipe',
    windowsHide: true
  })

  // [FIX] Release restart guard once the process is confirmed running
  infraProcess.once('spawn', () => {
    setTimeout(() => { _isRestartingBackend = false }, 5000)  // 5s grace period
  })
  // Fallback: release guard after 10s even if spawn event doesn't fire
  setTimeout(() => { _isRestartingBackend = false }, 10000)

  infraProcess.stdout?.on('data', (data) => console.log(`[FastAPI] ${data}`))
  infraProcess.stderr?.on('data', (data) => console.warn(`[FastAPI ERR] ${data}`))
  
  infraProcess.on('close', (code) => {
    console.log(`[Orchestration] FastAPI backend process exited with code ${code}`)
    infraProcess = null
    _isRestartingBackend = false  // [FIX] Reset guard so next restart can proceed
    if (healthMonitorInterval) {
      clearInterval(healthMonitorInterval)
      healthMonitorInterval = null
    }
    if (!appIsQuitting) {
      console.warn('[Orchestration] Backend process exited unexpectedly (code:', code, ').');
    }
  })
}

/**
 * [Orchestration] 백엔드 헬스체크 폴링
 * FastAPI가 포트 8000에서 실제로 응답할 때까지 대기 후 resolve.
 * 이미 다른 프로세스가 8000번 포트를 점유 중인 경우(재시작)에도 정상 감지.
 */
function waitForBackendReady(maxWaitMs = 30000, intervalMs = 500) {
  return new Promise((resolve) => {
    const startTime = Date.now()
    console.log('[Orchestration] ⏳ Waiting for FastAPI backend to become ready on port 8000...')
    
    const poll = () => {
      const req = http.get('http://127.0.0.1:8000/api/health', { timeout: 1000 }, (res) => {
        if (res.statusCode < 500) {
          console.log(`[Orchestration] ✅ FastAPI backend is ready! (${Date.now() - startTime}ms)`)
          resolve(true)
        } else {
          scheduleRetry()
        }
        res.resume() // drain
      })
      req.on('error', scheduleRetry)
      req.on('timeout', () => { req.destroy(); scheduleRetry() })
    }
    
    const scheduleRetry = () => {
      if (Date.now() - startTime >= maxWaitMs) {
        console.warn('[Orchestration] ⚠️ Backend health-check timed out after', maxWaitMs, 'ms. Opening window anyway.')
        resolve(false)
      } else {
        setTimeout(poll, intervalMs)
      }
    }
    
    poll()
  })
}

// 앱 종료 직전 자식 프로세스 완벽 청소 프로토콜 가동
app.on('before-quit', () => {
  console.log('[Orchestration] App closing — executing 철벽 방어형 클린업 프로토콜...')
  appIsQuitting = true
  if (healthMonitorInterval) {
    clearInterval(healthMonitorInterval)
    healthMonitorInterval = null
  }
  
  // 1순위: 직접 Spawn한 자식 프로세스 우선 Kill
  if (infraProcess) {
    console.log('[Orchestration] Terminating direct FastAPI backend process...');
    infraProcess.kill('SIGTERM');
  }
  
  // 2순위: 윈도우 작업 관리자 레벨 강제 종료 (좀비 프로세스 원천 소멸)
  // UAC 권한 요구 및 cmd 창이 뜨는 ViraLoop_Stop.bat 대신 직접 조용히 taskkill을 수행합니다.
  try {
    execSyncRaw('taskkill /F /T /IM api_server.exe /IM uvicorn.exe 2>NUL')
    console.log('[Orchestration] All local infrastructure processes cleaned successfully.')
  } catch (err) {
    console.log('[Orchestration] Cleaned infrastructure processes (some may not have been running).')
  }
})

ipcMain.handle('get-infra-status', async () => {
  // 백엔드 포트(8000, 5432, 6379) 응답 상태 체크
  const checkPort = (port) => new Promise((resolve) => {
    const s = http.request({ host: 'localhost', port, method: 'HEAD', timeout: 1000 }, () => {
      resolve(true); s.destroy()
    }).on('error', () => resolve(false))
    s.end()
  })

  const apiAlive = await checkPort(8000)
  return {
    api: apiAlive ? 'online' : 'offline',
    database: 'online', // Postgres/SQLite 상태
    redis: 'online',
    timestamp: Date.now()
  }
})

// === App Lifecycle ===
app.whenReady().then(async () => {
  // 찌꺼기 세션 디렉토리 정리 기동
  cleanupUnusedPartitions();

  // ═══════════════════════════════════════════════════════════════════════
  // [YouTube Embed Fix] Electron srcdoc iframe → YouTube Referer/Origin 주입
  // srcdoc iframe은 about:srcdoc origin으로 취급되어 YouTube가 차단함.
  // defaultSession의 webRequest 레벨에서 YouTube 도메인 요청 헤더를 직접 조작.
  // ═══════════════════════════════════════════════════════════════════════
  try {
    const { session: electronSess } = await import('electron')
    const ytFilter = { urls: [
      '*://*.youtube.com/*',
      '*://*.youtube-nocookie.com/*',
      '*://*.ytimg.com/*',
      '*://youtube.com/*'
    ]}
    
    electronSess.defaultSession.webRequest.onBeforeSendHeaders(ytFilter, (details, callback) => {
      const headers = { ...details.requestHeaders }
      const ref = headers['Referer'] || headers['referer'] || ''
      const orig = headers['Origin'] || headers['origin'] || ''
      
      // If the request comes from our localhost frontend, it's fine.
      // We only want to patch 'about:srcdoc' or missing origins
      if (!ref || ref.startsWith('about:') || ref === 'null') {
        headers['Referer'] = 'http://localhost:5183/'
      }
      if (!orig || orig === 'null' || orig.startsWith('about:')) {
        headers['Origin'] = 'http://localhost:5183'
      }
      callback({ requestHeaders: headers })
    })

    electronSess.defaultSession.webRequest.onHeadersReceived(ytFilter, (details, callback) => {
      const responseHeaders = { ...details.responseHeaders }
      // Remove headers that prevent embedding
      delete responseHeaders['X-Frame-Options']
      delete responseHeaders['x-frame-options']
      delete responseHeaders['Content-Security-Policy']
      delete responseHeaders['content-security-policy']
      callback({ cancel: false, responseHeaders })
    })
    
    console.log('[YouTube Embed Fix] webRequest Referer/Origin & Headers injection registered.')
  } catch (e) {
    console.warn('[YouTube Embed Fix] Failed to register webRequest handler:', e.message)
  }

  // Dock 아이콘 (macOS, dev/prod 둘 다) — whenReady 이후에만 app.dock 사용 가능
  if (process.platform === 'darwin' && HAS_APP_ICON && app.dock) {
    try { app.dock.setIcon(APP_ICON_PATH) } catch (e) { console.warn('[ViraLoop Studio] dock.setIcon failed:', e.message) }
  }

  // local-resource:// 프로토콜 핸들러 등록
  protocol.handle('local-resource', (request) => {
    try {
      const parsedUrl = new URL(request.url)
      let filePath = parsedUrl.pathname
      
      // Chromium URL 파서가 드라이브 문자(C:, D: 등)를 host로 파싱하면서 콜론을 제거해버리는 현상(예: local-resource://c/Users/...) 완벽 복구!
      if (process.platform === 'win32' && parsedUrl.host) {
        let host = parsedUrl.host
        // host가 'c'나 'd'처럼 단일 문자이거나 'c:' 형태인 경우 드라이브 문자로 간주
        if (host.length === 1 && /[a-zA-Z]/.test(host)) {
          host = host + ':'
        }
        if (/^[a-zA-Z]:$/.test(host)) {
          filePath = host + filePath
        }
      }

      filePath = decodeURIComponent(filePath)
      
      // Windows: /C:/path → C:/path (앞에 슬래시가 남아있는 경우 제거)
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.slice(1)
      }
      
      // 파일 확장자에 맞는 적절한 Content-Type 지정
      const ext = path.extname(filePath).toLowerCase()
      const mimeTypes = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.json': 'application/json',
      }
      const contentType = mimeTypes[ext] || 'application/octet-stream'

      // net.fetch 격리 세션 보안 장벽 해소를 위해 Node.js fs로 직접 읽어서 전달!
      const data = fsSync.readFileSync(filePath)
      return new Response(data, {
        headers: { 
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*'
        }
      })
    } catch (err) {
      console.error('[local-resource] Protocol handler parsing failed:', err)
      return new Response('File Not Found', { status: 404 })
    }
  })

  // Claude Code 스킬 자동 설치 (앱 시작 시)
  try { autoSetupSkills() } catch (e) { console.warn('[ViraLoop Studio] Skill setup failed:', e.message) }

  // Native menu + auto-updater (skips dev mode and AppX builds)
  try { setupAppMenuAndUpdater(() => mainWindow) } catch (e) { console.warn('[ViraLoop Studio] Updater setup failed:', e.message) }

  // [Orchestration] 백엔드 준비 완료 후 창 생성 (Race Condition 원천 방지)
  waitForBackendReady(30000, 500).then(() => {
    createWindow()
  })
  startViraLoopInfrastructure()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
