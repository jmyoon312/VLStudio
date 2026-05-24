import { app, BrowserWindow, WebContentsView, ipcMain, shell, protocol, net, powerSaveBlocker } from 'electron'
import http from 'node:http'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execSync as execSyncRaw, spawn, exec } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import { registerFilesystemIPC } from './ipc/filesystem.js'
import { registerAuthIPC } from './ipc/auth.js'
import { registerCapcutIPC } from './ipc/capcut.js'
import { registerMcpIPC } from './ipc/mcp.js'
import { registerFlowAPIIPC } from './ipc/flow-api.js'
import { registerVideoIPC } from './ipc/video.js'
import { registerDomIPC } from './ipc/dom.js'
import { registerYoutubeIPC } from './ipc/ytExportManager.js'
import { createSharedHelpers } from './ipc/shared.js'
import { updateBounds, registerLayoutIPC, setLayoutMode, setSplitRatio, setModalVisible, resetModalState } from './ipc/layout.js'
import { openApiSpec, getSwaggerHtml } from './api-docs.js'
import { setupAppMenuAndUpdater, noteProjectActivated } from './updater.js'
import { selectCdpCase } from './video-cdp-dispatch.js'
import { loadProfiles } from './profileManager.js'
import { injectImageBatchBody } from './cdp-image-inject.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Force the display name so dev-mode submenu items ("About …", "Quit …", etc.)
// match the productName from electron-builder. Has no effect on the bold app
// title in macOS menu bar (that comes from the Electron binary's Info.plist
// in dev; the packaged build sets it correctly).
app.setName('ViraLoop Studio')

// ═══════════════════════════════════════════════════════════════════════════════
// [NEW-12 + Electron②] 전역 Chromium 스위치 — WebRTC IP 누출 차단 + QUIC 비활성화
// app.on('ready') 이전에 설정해야 적용됨
// ═══════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp')
app.commandLine.appendSwitch('disable-webrtc-multiple-routes')
app.commandLine.appendSwitch('enforce-webrtc-ip-permission-check')
app.commandLine.appendSwitch('disable-quic')  // [NEW-1] QUIC/UDP 트래픽 누출 차단
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('enable-features', 'DnsOverHttps')
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query')
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
    title: `ViraLoop Studio v${app.getVersion()}`,
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

  // ============================================
  // 안티봇 차단 우회용 하드웨어 지문 위장 프로필 (Hardware Fingerprint Profiles)
  // ============================================
  const hardwareProfiles = [
    {
      cores: 4,
      memory: 8,
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      cores: 8,
      memory: 16,
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      cores: 12,
      memory: 32,
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      cores: 16,
      memory: 64,
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      cores: 6,
      memory: 16,
      vendor: 'Google Inc. (AMD)',
      renderer: 'ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)'
    },
    {
      cores: 8,
      memory: 32,
      vendor: 'Google Inc. (Intel)',
      renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)'
    }
  ]

  // 초기 구동 시 무작위 대신 영구 저장된 프로필에서 하드웨어 스펙 동기 로딩
  let activeProfilePartition = 'persist:flow_profile_default'
  try {
    // 동기식 프로필 바인딩 설정
    const configPath = path.join(app.getPath('userData'), 'flow-profiles-config.json')
    if (fsSync.existsSync(configPath)) {
      const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'))
      const activeProf = config.profiles.find(p => p.id === config.activeProfileId)
      if (activeProf) {
        activeProfilePartition = `persist:flow_profile_${activeProf.id}`
        global.currentHardwareProfile = activeProf.hardware
        console.log('[Anti-bot] Profile Bound Hardware Loaded:', activeProf.name, '->', activeProf.hardware.renderer)
      }
    }
  } catch (err) {
    console.warn('[Profile Startup] Failed to load persistent profile:', err.message)
  }

  if (!global.currentHardwareProfile) {
    global.currentHardwareProfile = hardwareProfiles[Math.floor(Math.random() * hardwareProfiles.length)]
  }

  // 하드웨어 프로필 무작위 재추첨(Re-roll) 함수
  global.rerollHardwareProfile = () => {
    global.currentHardwareProfile = hardwareProfiles[Math.floor(Math.random() * hardwareProfiles.length)]
    console.log('[Anti-bot] Hardware Profile Re-rolled & Changed to:', global.currentHardwareProfile.renderer)
  }

  let initialProfileId = 'default'
  if (activeProfilePartition && activeProfilePartition.startsWith('persist:flow_profile_')) {
    initialProfileId = activeProfilePartition.replace('persist:flow_profile_', '')
  }
  global.activeFlowProfileId = initialProfileId

  const setupFlowView = (view, profileId) => {
    // 1. 오디오 개별 뮤트
    view.webContents.setAudioMuted(true)

    // 2. 동적 도메인 타겟팅 스텔스 엔진
    const applyDynamicStealth = (url) => {
      if (url && url.includes('labs.google/fx')) {
        console.log(`[Dynamic Stealth - ${profileId}] Activating Anti-bot Stealth Mode for Google Flow API...`);
        const modernChromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        view.webContents.setUserAgent(modernChromeUA);
        const stealthScript = `
          (function() {
            try {
              Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
                configurable: true
              });
              console.log('[Stealth] navigator.webdriver spoofed to false successfully.');
            } catch(e) {}
          })();
        `;
        view.webContents.executeJavaScript(stealthScript).catch(() => {});
      }
    };

    view.webContents.on('did-start-navigation', (_, url) => applyDynamicStealth(url));
    view.webContents.on('dom-ready', () => {
      const url = view.webContents.getURL();
      applyDynamicStealth(url);
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

          console.log(`[Flow API - ${profileId}] No project in URL, looking for Enter tool button...`)

          let clicked = null
          for (let retry = 0; retry < 6 && !capturedProjectId; retry++) {
            if (retry > 0) {
              await new Promise(r => setTimeout(r, 2000))
              if (capturedProjectId) break
              const retryUrl = view.webContents.getURL()
              const retryMatch = retryUrl.match(/\/project\/([a-f0-9-]{36})/)
              if (retryMatch) {
                capturedProjectId = retryMatch[1]
                console.log(`[Flow API - ${profileId}] ProjectId from URL during retry:`, capturedProjectId)
                break
              }
            }

            clicked = await view.webContents.executeJavaScript(`
              (function() {
                const allButtons = document.querySelectorAll('button');
                try {
                  const xr = document.evaluate(
                    "//button[.//i[normalize-space(text())='add_2']] | (//button[.//i[normalize-space(.)='add_2']])",
                    document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
                  );
                  if (xr.singleNodeValue) { xr.singleNodeValue.click(); return 'add_2_xpath'; }
                } catch {}

                for (const b of allButtons) {
                  const icons = b.querySelectorAll('i, span.material-icons, span.material-symbols-outlined, mat-icon');
                  for (const icon of icons) {
                    const t = icon.textContent.trim();
                    if (t === 'add_2' || t === 'add') {
                      b.click(); return 'icon_' + t;
                    }
                  }
                }
                for (const b of allButtons) {
                  const icons = b.querySelectorAll('i, span.material-icons, span.material-symbols-outlined');
                  for (const icon of icons) {
                    if (icon.textContent.trim() === 'arrow_forward') {
                      b.click(); return 'arrow_forward';
                    }
                  }
                }
                for (const b of allButtons) {
                  const text = b.textContent.trim().toLowerCase();
                  if (['start', '시작', 'enter', 'new', 'create', '새로 만들기', '새 프로젝트', '새프로젝트', '만들기'].some(k => text.includes(k))) {
                    b.click(); return 'text_' + text.substring(0, 30);
                  }
                }
                for (const b of allButtons) {
                  const cls = b.className || '';
                  if (cls.includes('primary') || cls.includes('filled') || cls.includes('cta')) {
                    b.click(); return 'cta';
                  }
                }
                return null;
              })()
            `).catch(() => null)

            if (clicked) {
              console.log(`[Flow API - ${profileId}] Clicked button (retry ${retry}):`, clicked)
              pState.enterToolClicked = true
              break
            }
          }

          if (clicked && !capturedProjectId) {
            console.log(`[Flow API - ${profileId}] Waiting for project creation after click...`)
            for (let i = 0; i < 20; i++) {
              await new Promise(r => setTimeout(r, 500))
              if (capturedProjectId) {
                console.log(`[Flow API - ${profileId}] ProjectId captured after button click:`, capturedProjectId)
                break
              }
              const pollUrl = view.webContents.getURL()
              const pollMatch = pollUrl.match(/\/project\/([a-f0-9-]{36})/)
              if (pollMatch) {
                capturedProjectId = pollMatch[1]
                console.log(`[Flow API - ${profileId}] ProjectId from polled URL:`, capturedProjectId)
                break
              }
            }
          }
        } catch (e) {
          console.warn(`[Flow API - ${profileId}] ProjectId auto-extraction error:`, e.message)
        }
      }
    })

    // CDP Debugger
    try {
      view.webContents.debugger.attach('1.3')
      view.webContents.debugger.sendCommand('Network.enable')
      const requestUrlMap = {}
      const requestMethodMap = {}
      const responseStatusMap = {}
      const requestSentTimeMap = {}

      view.webContents.debugger.on('message', (event, method, params) => {
        if (method === 'Fetch.requestPaused') {
          const reqUrl = params.request?.url || ''
          const reqMethod = params.request?.method || ''
          const continueRequest = (extra) =>
            view.webContents.debugger.sendCommand('Fetch.continueRequest', {
              requestId: params.requestId,
              ...(extra || {})
            })
          const cdpCase = selectCdpCase({
            reqUrl,
            reqMethod,
            pendingSeedValue,
            pendingI2VInjection,
          })

          if (cdpCase === 'image-batch') {
            try {
              const body = JSON.parse(params.request.postData || '{}')
              const applied = injectImageBatchBody(body, {
                referenceImages: pendingReferenceImages,
                seed: pendingSeedValue,
                aspectRatio: pendingImageAspectRatio,
              })
              if (applied.references) {
                console.log(`[Flow API - ${profileId}] Injected references`)
                pendingReferenceImages = null
              }
              if (applied.seed) {
                console.log(`[Flow API - ${profileId}] Injected seed:`, pendingSeedValue)
              }
              if (applied.aspectRatio) {
                console.log(`[Flow API - ${profileId}] Injected aspect ratio:`, pendingImageAspectRatio)
              }

              if (applied.references || applied.seed || applied.aspectRatio) {
                const modifiedPostData = Buffer.from(JSON.stringify(body)).toString('base64')
                continueRequest({ postData: modifiedPostData })
              } else {
                continueRequest()
              }
            } catch (e) {
              console.error(`[Flow API - ${profileId}] batchGenerateImages injection error:`, e.message)
              continueRequest()
            }
          }
          else if (cdpCase === 'i2v') {
            if (reqMethod === 'OPTIONS') {
              continueRequest()
            } else {
              try {
                const body = JSON.parse(params.request.postData || '{}')
                const hasEndImage = !!pendingI2VInjection.endImageMediaId
                const T2V_TO_I2V_MODEL_MAP = {
                  'veo_3_1_t2v_fast_ultra_relaxed': 'veo_3_1_i2v_s_fast_fl',
                  'veo_3_1_t2v_fast': 'veo_3_1_i2v_s_fast_fl',
                  'veo_3_1_t2v_fast_portrait_ultra_relaxed': 'veo_3_1_i2v_s_fast',
                  'veo_3_1_t2v_fast_portrait': 'veo_3_1_i2v_s_fast',
                  'veo_3_1_t2v_quality_ultra_relaxed': 'veo_3_1_i2v_quality',
                  'veo_3_1_t2v_quality': 'veo_3_1_i2v_quality',
                }
                const defaultCrop = { top: 0, left: 0, bottom: 1, right: 1 }

                if (body.requests) {
                  for (const req of body.requests) {
                    const originalModel = req.videoModelKey
                    const i2vModel = T2V_TO_I2V_MODEL_MAP[originalModel]
                    req.videoModelKey = i2vModel || 'veo_3_1_i2v_s_fast_fl'
                    req.startImage = {
                      mediaId: pendingI2VInjection.startImageMediaId,
                      cropCoordinates: defaultCrop
                    }
                    if (hasEndImage) {
                      req.endImage = {
                        mediaId: pendingI2VInjection.endImageMediaId,
                        cropCoordinates: defaultCrop
                      }
                    }
                    if (pendingSeedValue != null) {
                      req.seed = pendingSeedValue
                    }
                  }
                }
                const modifiedPostData = Buffer.from(JSON.stringify(body)).toString('base64')
                const targetUrl = hasEndImage
                  ? pendingI2VInjection.i2vStartEndUrl
                  : pendingI2VInjection.i2vUrl
                continueRequest({ url: targetUrl, postData: modifiedPostData })
                pendingI2VInjection = null
              } catch (e) {
                console.error(`[Flow Video I2V - ${profileId}] Injection error:`, e.message)
                continueRequest()
              }
            }
          }
          else if (cdpCase === 't2v-seed') {
            try {
              const body = JSON.parse(params.request.postData || '{}')
              if (body.requests) {
                for (const req of body.requests) {
                  req.seed = pendingSeedValue
                }
                const modifiedPostData = Buffer.from(JSON.stringify(body)).toString('base64')
                continueRequest({ postData: modifiedPostData })
              } else {
                continueRequest()
              }
            } catch (e) {
              console.error(`[Flow Video - ${profileId}] T2V seed injection error:`, e.message)
              continueRequest()
            }
          }
          else {
            continueRequest()
          }
          return
        }

        if (method === 'Network.requestWillBeSent') {
          requestUrlMap[params.requestId] = params.request?.url || ''
          requestMethodMap[params.requestId] = params.request?.method || ''
          requestSentTimeMap[params.requestId] = params.wallTime || (Date.now() / 1000)
        }

        if (method === 'Network.responseReceived') {
          responseStatusMap[params.requestId] = params.response?.status
          if (!capturedProjectId) {
            const url = params.response?.url || ''
            const pidMatch = url.match(/projects\/([a-f0-9-]{36})/)
            if (pidMatch) {
              capturedProjectId = pidMatch[1]
            }
          }
        }

        if (method === 'Network.loadingFailed' && pendingGeneration) {
          const reqUrl = requestUrlMap[params.requestId] || ''
          const failMethod = requestMethodMap[params.requestId] || ''
          if (reqUrl.includes('batchGenerateImages') && failMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
            if (pendingGeneration.setAt && reqSentAt < pendingGeneration.setAt) return
            pendingGeneration.responses.push({ error: true, message: params.errorText || 'Network request failed' })
            if (pendingGeneration.responses.length >= pendingGeneration.expectedCount) {
              const saved = pendingGeneration
              pendingGeneration = null
              if (saved.collectionTimer) clearTimeout(saved.collectionTimer)
              const hasSuccess = saved.responses.some(r => !r.error)
              saved.resolve(hasSuccess
                ? { error: false, responses: saved.responses }
                : { error: true, message: 'All image generations failed' })
            }
          }
        }

        if (method === 'Network.loadingFailed' && pendingGenerations.size > 0) {
          const reqUrl = requestUrlMap[params.requestId] || ''
          const failMethod = requestMethodMap[params.requestId] || ''
          if (reqUrl.includes('batchGenerateImages') && failMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
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
              g.responses.push({ error: true, message: params.errorText || 'Network request failed' })
              if (g.responses.length >= g.expectedCount) {
                g.completed = true
                if (g.collectionTimer) clearTimeout(g.collectionTimer)
              }
            }
          }
        }

        if (method === 'Network.loadingFailed' && pendingVideoGeneration) {
          const reqUrl = requestUrlMap[params.requestId] || ''
          const failMethod = requestMethodMap[params.requestId] || ''
          if (reqUrl.includes('batchAsyncGenerateVideo') && failMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
            if (pendingVideoGeneration.setAt && reqSentAt < pendingVideoGeneration.setAt) return
            const saved = pendingVideoGeneration
            pendingVideoGeneration = null
            saved.resolve({ error: true, message: params.errorText || 'Video API request failed' })
          }
        }

        if (method === 'Network.loadingFinished' && params.requestId) {
          const reqUrl = requestUrlMap[params.requestId] || ''
          const httpStatus = responseStatusMap[params.requestId]
          const reqMethod = requestMethodMap[params.requestId] || ''

          if (pendingGeneration && reqUrl.includes('batchGenerateImages') && reqMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
            if (pendingGeneration.setAt && reqSentAt < pendingGeneration.setAt) return

            view.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId })
              .then(result => {
                if (result?.body && pendingGeneration) {
                  pendingGeneration.responses.push({ error: false, body: result.body, status: httpStatus })
                  if (pendingGeneration.responses.length >= pendingGeneration.expectedCount) {
                    const saved = pendingGeneration
                    pendingGeneration = null
                    if (saved.collectionTimer) clearTimeout(saved.collectionTimer)
                    saved.resolve({ error: false, responses: saved.responses })
                  } else {
                    if (pendingGeneration.collectionTimer) clearTimeout(pendingGeneration.collectionTimer)
                    pendingGeneration.collectionTimer = setTimeout(() => {
                      if (pendingGeneration) {
                        const saved = pendingGeneration
                        pendingGeneration = null
                        saved.resolve({ error: false, responses: saved.responses })
                      }
                    }, 30000)
                  }
                }
              })
              .catch(err => {
                if (pendingGeneration) {
                  pendingGeneration.responses.push({ error: true, message: err.message })
                  if (pendingGeneration.responses.length >= pendingGeneration.expectedCount) {
                    const saved = pendingGeneration
                    pendingGeneration = null
                    if (saved.collectionTimer) clearTimeout(saved.collectionTimer)
                    saved.resolve({ error: false, responses: saved.responses })
                  }
                }
              })
          }
          else if (pendingGenerations.size > 0 && reqUrl.includes('batchGenerateImages') && reqMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
            let matchId = null
            let matchSetAt = -Infinity
            for (const [id, gen] of pendingGenerations) {
              if (!gen.completed && gen.setAt <= reqSentAt && gen.setAt > matchSetAt) {
                matchId = id
                matchSetAt = gen.setAt
              }
            }
            if (matchId) {
              view.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId })
                .then(result => {
                  if (result?.body && pendingGenerations.has(matchId)) {
                    const g = pendingGenerations.get(matchId)
                    g.responses.push({ error: false, body: result.body, status: httpStatus })
                    if (g.responses.length >= g.expectedCount) {
                      g.completed = true
                      if (g.collectionTimer) clearTimeout(g.collectionTimer)
                    } else {
                      if (g.collectionTimer) clearTimeout(g.collectionTimer)
                      g.collectionTimer = setTimeout(() => {
                        if (pendingGenerations.has(matchId)) {
                          const gg = pendingGenerations.get(matchId)
                          if (!gg.completed) {
                            gg.completed = true
                          }
                        }
                      }, 30000)
                    }
                  }
                })
                .catch(err => {
                  if (pendingGenerations.has(matchId)) {
                    const g = pendingGenerations.get(matchId)
                    g.responses.push({ error: true, message: err.message })
                    if (g.responses.length >= g.expectedCount) {
                      g.completed = true
                      if (g.collectionTimer) clearTimeout(g.collectionTimer)
                    }
                  }
                })
            }
          }
          else if (pendingVideoGeneration && reqUrl.includes('batchAsyncGenerateVideo') && reqMethod !== 'OPTIONS') {
            const reqSentAt = requestSentTimeMap[params.requestId] || 0
            if (pendingVideoGeneration.setAt && reqSentAt < pendingVideoGeneration.setAt) return

            view.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId })
              .then(result => {
                if (result?.body && pendingVideoGeneration) {
                  const saved = pendingVideoGeneration
                  pendingVideoGeneration = null
                  saved.resolve({ error: httpStatus >= 400, body: result.body, status: httpStatus })
                }
              })
              .catch(err => {
                if (pendingVideoGeneration) {
                  const saved = pendingVideoGeneration
                  pendingVideoGeneration = null
                  saved.resolve({ error: true, message: err.message })
                }
              })
          }
          else if (!capturedProjectId && reqUrl.includes('aisandbox-pa.googleapis.com')) {
            view.webContents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId })
              .then(result => {
                if (result?.body) {
                  const match = result.body.match(/"projectId"\s*:\s*"([a-f0-9-]{36})"/)
                  if (match && !capturedProjectId) {
                    capturedProjectId = match[1]
                  }
                }
              })
              .catch(() => {})
          }
        }
      })
      console.log(`[Flow - ${profileId}] Debugger attached successfully`)
    } catch (e) {
      console.warn(`[Flow - ${profileId}] Debugger attach failed:`, e.message)
    }

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
    
    // Load hardware DNA settings for this profile
    let hardware = {
      cores: 8,
      memory: 16,
      vendor: 'Google Inc. (NVIDIA)',
      renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'
    };
    let proxyPort = null;
    let targetUrl = FLOW_URL;
    let isUploadSlot = false;
    
    try {
      const configPath = path.join(app.getPath('userData'), 'flow-profiles-config.json');
      if (fsSync.existsSync(configPath)) {
        const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'));
        const targetProf = config.profiles.find(p => p.id === profileId);
        if (targetProf) {
          if (targetProf.hardware) {
            hardware = targetProf.hardware;
          }
          if (targetProf.type === 'BRAND_CHANNEL') {
            proxyPort = 10800; // Only use LTE proxy for Brand Channels
            targetUrl = 'https://studio.youtube.com/';
            isUploadSlot = true;
          }
        }
      }
    } catch (e) {
      console.warn('[Proxy/Hardware] Failed to load profile config:', e);
    }

    const newView = new WebContentsView({
      webPreferences: {
        partition: partitionName,
        contextIsolation: true,
        webSecurity: false,
        preload: path.join(__dirname, 'stealth_preload.js'),
        additionalArguments: [
          `--hardware-cores=${hardware.cores || 8}`,
          `--hardware-memory=${hardware.memory || 16}`,
          `--hardware-vendor=${hardware.vendor || 'Google Inc. (NVIDIA)'}`,
          `--hardware-renderer=${hardware.renderer || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)'}`
        ]
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

    // 2. 고유 바인딩 하드웨어 지문 매핑
    global.currentHardwareProfile = targetProf.hardware
    console.log('[Profile Switch] Bound hardware associated:', targetProf.hardware.renderer)

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
    if (global.flowViews.size <= 1) {
      console.warn("[Profile Switch] 거부: 최소 1개의 기본 창은 항상 유지되어야 합니다.");
      return false;
    }
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

  // Create initial view
  flowView = global.createOrGetFlowView(initialProfileId)

  // Handle window resize — update view bounds
  mainWindow.on('resize', () => updateBounds(mainWindow, flowView))

  // Split 레이아웃 적용
  updateBounds(mainWindow, flowView)

  // Reset modal visibility state on navigation/reload
  mainWindow.webContents.on('did-start-navigation', () => {
    console.log('[Navigation] Resetting modal visible state on reload/navigate')
    resetModalState(mainWindow, flowView)
  })

  // Open DevTools in development (detached so it doesn't cover WebContentsView)
  // if (process.env.VITE_DEV_SERVER_URL) {
  //   mainWindow.webContents.openDevTools({ mode: 'detach' })
  // }

  // Load the React app (Vite dev server or built files)
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

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
registerLayoutIPC(ipcMain, () => mainWindow, () => flowView)

// Renderer reports the active project (with its work folder) so the native
// "Recent Projects" menu stays in MRU order and scoped to the current folder.
ipcMain.handle('app:project-activated', (event, { name, workFolder }) => {
  try { noteProjectActivated(name, workFolder) } catch (e) { console.warn('[ViraLoop Studio] noteProjectActivated failed:', e.message) }
  return { success: true }
})

// === MCP HTTP Server ===
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

// === Flow API IPC (image generation, media fetch, token, reference upload) ===
const flowAPIDeps = {
  getFlowView: () => flowView,
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
  getFlowView: () => flowView,
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
  getFlowView: () => flowView,
  getMainWindow: () => mainWindow,
  trustedClickOnFlowView,
  FLOW_URL,
  getCapturedProjectId: () => capturedProjectId,
  setCapturedProjectId: (v) => { capturedProjectId = v },
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
            console.log(`[Orchestration] Found zombie process ${pid} listening on port ${port}. Terminating...`)
            try {
              execSyncRaw(`taskkill /F /PID ${pid}`)
            } catch (err) {
              console.warn(`[Orchestration] Failed to kill process ${pid}:`, err.message)
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
  killProcessOnPort(8000)
  // Give the OS 1 second to release the socket
  try {
    if (process.platform === 'win32') {
      execSyncRaw('ping 127.0.0.1 -n 2 >nul')
    } else {
      execSyncRaw('sleep 0.5')
    }
  } catch {}

  const isPackaged = app.isPackaged
  const resourcesPath = process.resourcesPath
  const storageDir = app.getPath('userData')

  let executablePath = ''
  let spawnArgs = []
  let workingDir = ''

  if (isPackaged) {
    console.log('[Orchestration] App is packaged. Launching ViraLoop FastAPI Backend via standalone executable...')
    executablePath = path.join(resourcesPath, 'api_server.exe')
    spawnArgs = []
    workingDir = resourcesPath

    if (!fsSync.existsSync(executablePath)) {
      console.error('[Orchestration] Standalone api_server.exe not found at:', executablePath)
      return
    }
  } else {
    console.log('[Orchestration] App is in development. Launching ViraLoop FastAPI Backend via local python venv...')
    const pythonExecutable = path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe')
    const apiDir = path.join(__dirname, '..', 'apps', 'api')

    if (!fsSync.existsSync(pythonExecutable)) {
      console.warn('[Orchestration] Python virtual environment not found at:', pythonExecutable)
      console.warn('[Orchestration] 백엔드 가동을 위해서는 프로젝트 루트에 venv가 설정되어 있어야 합니다.')
      return
    }

    executablePath = pythonExecutable
    spawnArgs = ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000']
    workingDir = apiDir
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

  infraProcess.stdout?.on('data', (data) => console.log(`[FastAPI] ${data}`))
  infraProcess.stderr?.on('data', (data) => console.warn(`[FastAPI ERR] ${data}`))
  
  infraProcess.on('close', (code) => {
    console.log(`[Orchestration] FastAPI backend process exited with code ${code}`)
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
  
  // 1순위: 직접 Spawn한 자식 프로세스 우선 Kill
  if (infraProcess) {
    console.log('[Orchestration] Terminating direct FastAPI backend process...');
    infraProcess.kill('SIGTERM');
  }
  
  // 2순위: 윈도우 작업 관리자 레벨 강제 종료 (좀비 프로세스 원천 소멸)
  // UAC 권한 요구 및 cmd 창이 뜨는 ViraLoop_Stop.bat 대신 직접 조용히 taskkill을 수행합니다.
  exec('taskkill /F /T /IM python.exe /IM redis-server.exe /IM celerys.exe /IM uvicorn.exe /IM postgres.exe 2>NUL', () => {
    console.log('[Orchestration] All local infrastructure processes cleaned successfully.')
  })
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
app.whenReady().then(() => {
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

  startViraLoopInfrastructure()
  // [Orchestration] 백엔드 준비 완료 후 창 생성 (Race Condition 원천 방지)
  waitForBackendReady(30000, 500).then(() => {
    createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
