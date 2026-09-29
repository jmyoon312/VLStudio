/**
 * Electron IPC Handler - DeepSeek Sovereign Multi-Account Authentication
 *
 * Provides dedicated web authentication pipelines:
 * 1. 🌐 DeepSeek Web (chat.deepseek.com):
 *    - Opens an isolated stealth BrowserWindow for chat.deepseek.com
 *    - Connects with existing Google Flow profiles for instant 1-click Google OAuth
 *    - Intercepts chat.deepseek.com session cookies and userToken
 *    - Saves to %LOCALAPPDATA%\ViraLoop Studio\media\04_Profiles\deepseek_sessions\{email}\cookies_deepseek.json
 *    - Zero terminal, pure web browser login
 */

import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import http from 'node:http'
import { loadProfiles } from '../profileManager.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getLoginPreloadPath() {
  const candidates = [
    path.resolve(__dirname, 'login_preload.mjs'),
    path.resolve(__dirname, 'login_preload.js'),
    path.resolve(__dirname, '..', 'login_preload.js'),
    path.resolve(__dirname, '../electron/login_preload.js'),
    path.resolve(__dirname, '../dist-electron/login_preload.mjs')
  ]
  try {
    if (app && typeof app.getAppPath === 'function') {
      candidates.push(path.join(app.getAppPath(), 'dist-electron', 'login_preload.mjs'))
      candidates.push(path.join(app.getAppPath(), 'electron', 'login_preload.js'))
    }
  } catch {}
  for (const c of candidates) {
    if (fsSync.existsSync(c)) return c
  }
  return null
}

async function resolvePartitionForTarget(emailOrProfileId) {
  try {
    const config = await loadProfiles()
    if (config && config.profiles) {
      const matched = config.profiles.find(
        (p) =>
          p.id === emailOrProfileId ||
          (p.email &&
            emailOrProfileId &&
            p.email.toLowerCase().trim() === emailOrProfileId.toLowerCase().trim())
      )
      if (matched) {
        return {
          partition:
            matched.id === 'default'
              ? 'persist:flow_profile_default'
              : `persist:flow_profile_${matched.id}`,
          profile: matched
        }
      }
    }
  } catch (err) {
    console.warn('[DeepSeek Web IPC] resolvePartitionForTarget error:', err)
  }

  const cleanKey = (emailOrProfileId || `session_${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
  return {
    partition: `persist:flow_profile_${cleanKey}`,
    profile: null
  }
}

function getDeepSeekSessionsDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dir = path.join(localAppData, 'ViraLoop Studio', 'media', '04_Profiles', 'deepseek_sessions')
  try {
    fsSync.mkdirSync(dir, { recursive: true })
  } catch (e) {}
  return dir
}

async function notifyBackendDeepSeekWebSession(sessionData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(sessionData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/deepseek/web-session',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          resolve(res.statusCode === 200)
        }
      )
      req.on('error', () => resolve(false))
      req.write(payload)
      req.end()
    } catch {
      resolve(false)
    }
  })
}

export function registerDeepSeekWebIPC(ipcMain) {
  ipcMain.handle('deepseek:open-deepseek-web-login', async (_event, emailHint, options = {}) => {
    const { partition, profile } = await resolvePartitionForTarget(emailHint)
    const customSession = session.fromPartition(partition)

    // [Cookie Reset / Re-collect Support]
    if (options && options.resetCookies) {
      console.log(`[DeepSeek Web IPC] Resetting stale session cookies for partition: ${partition} (${emailHint})`)
      try {
        await customSession.clearStorageData({
          storages: ['cookies', 'serviceworkers', 'cache']
        })
      } catch (err) {
        console.warn('[DeepSeek Web IPC] clearStorageData error:', err)
      }
    }

    // Bypass WebAuthn hardware prompts
    customSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (['security-key', 'u2f', 'webauthn'].includes(permission)) {
        return callback(false)
      }
      callback(true)
    })

    const preloadPath = getLoginPreloadPath()
    const cleanUA = (session.defaultSession.getUserAgent() || '').replace(/Electron\/[0-9.]+\s*/g, '')
    if (cleanUA) {
      customSession.setUserAgent(cleanUA)
    }

    const win = new BrowserWindow({
      width: 1080,
      height: 800,
      title: `DeepSeek Web 세션 로그인 (${profile?.name ? profile.name + ' - ' : ''}chat.deepseek.com)`,
      autoHideMenuBar: true,
      webPreferences: {
        session: customSession,
        preload: preloadPath || undefined,
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
        webSecurity: true
      }
    })

    if (cleanUA) {
      win.webContents.setUserAgent(cleanUA)
    }
    win.webContents.setWindowOpenHandler(() => ({
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 600,
        height: 720,
        autoHideMenuBar: true,
        webPreferences: {
          session: customSession,
          preload: preloadPath || undefined,
          nodeIntegration: false,
          contextIsolation: true,
          plugins: true,
          webSecurity: true
        }
      }
    }))

    const suppressPasskeyScript = `
      if (window.PublicKeyCredential) {
        try {
          PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable = () => Promise.resolve(false);
          if (PublicKeyCredential.isConditionalMediationAvailable) {
            PublicKeyCredential.isConditionalMediationAvailable = () => Promise.resolve(false);
          }
        } catch (e) {}
      }
    `;

    win.webContents.on('dom-ready', () => {
      win.webContents.executeJavaScript(suppressPasskeyScript).catch(() => {})
    })

    win.webContents.on('did-create-window', (childWin) => {
      if (cleanUA) {
        childWin.webContents.setUserAgent(cleanUA)
      }
      try {
        childWin.setMenuBarVisibility(false)
      } catch {}
      childWin.webContents.on('dom-ready', () => {
        childWin.webContents.executeJavaScript(suppressPasskeyScript).catch(() => {})
      })
    })

    return new Promise((resolve) => {
      let resolved = false
      let checkTimer = null

      const finishSuccess = async (email, cookies, userToken) => {
        if (resolved) return
        resolved = true
        if (checkTimer) clearInterval(checkTimer)

        try {
          const finalEmail = (email || profile?.email || emailHint || 'deepseek_user@gmail.com').toLowerCase().trim()
          const targetDir = path.join(getDeepSeekSessionsDir(), finalEmail)
          await fs.mkdir(targetDir, { recursive: true })

          const sessionData = {
            email: finalEmail,
            updated_at: new Date().toISOString(),
            cookie_count: cookies.length,
            userToken: userToken || null,
            cookies: cookies.map((c) => ({
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              secure: c.secure,
              httpOnly: c.httpOnly,
              sameSite: c.sameSite
            }))
          }

          await fs.writeFile(
            path.join(targetDir, 'cookies_deepseek.json'),
            JSON.stringify(sessionData, null, 2),
            'utf-8'
          )

          if (userToken) {
            await fs.writeFile(
              path.join(targetDir, 'session_token.json'),
              JSON.stringify({ email: finalEmail, token: userToken, updated_at: new Date().toISOString() }, null, 2),
              'utf-8'
            )
          }

          // Synchronously persist to deepseek_accounts_pool.json & ai_accounts_vault.json
          try {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
            const poolPath = path.join(localAppData, 'ViraLoop Studio', 'deepseek_accounts_pool.json')
            let poolAccs = []
            if (fsSync.existsSync(poolPath)) {
              try {
                poolAccs = JSON.parse(fsSync.readFileSync(poolPath, 'utf-8'))
              } catch {}
            }
            const existingIdx = poolAccs.findIndex((a) => a.email?.toLowerCase() === finalEmail)
            const accObj = {
              account_id: `deepseek_${finalEmail.split('@')[0]}`,
              email: finalEmail,
              name: finalEmail.split('@')[0],
              plan: 'DeepSeek Web',
              is_active: poolAccs.length === 0 || existingIdx === 0,
              has_session: true,
              daily_remaining_pct: 100,
              weekly_remaining_pct: 100,
              reset_daily: '매일 자정 초기화',
              reset_weekly: '월요일 09:00 초기화',
              cooldown_until: 0,
              exhausted_count: 0,
              status: 'healthy',
              updated_at: new Date().toISOString()
            }
            if (existingIdx >= 0) {
              poolAccs[existingIdx] = { ...poolAccs[existingIdx], ...accObj }
            } else {
              poolAccs.push(accObj)
            }
            fsSync.writeFileSync(poolPath, JSON.stringify(poolAccs, null, 2), 'utf-8')

            const vaultPath = path.join(localAppData, 'ViraLoop Studio', 'media', '06_Database', 'ai_accounts_vault.json')
            if (fsSync.existsSync(vaultPath)) {
              try {
                const vault = JSON.parse(fsSync.readFileSync(vaultPath, 'utf-8'))
                const dVault = vault.deepseek || {}
                dVault.connected = true
                dVault.active_plan = 'DeepSeek Web'
                const dAccs = dVault.accounts || []
                const dIdx = dAccs.findIndex((a) => a.email?.toLowerCase() === finalEmail)
                const vAcc = {
                  id: accObj.account_id,
                  email: finalEmail,
                  name: accObj.name,
                  plan: 'DeepSeek Web',
                  is_active: accObj.is_active,
                  status: 'healthy',
                  has_session: true,
                  quotas: {
                    window_5h: { used_pct: 0, remain_pct: 100, reset_in: '매일 자정 초기화' },
                    window_weekly: { used_pct: 0, remain_pct: 100, reset_in: '월요일 09:00 초기화' }
                  }
                }
                if (dIdx >= 0) {
                  dAccs[dIdx] = vAcc
                } else {
                  dAccs.push(vAcc)
                }
                dVault.accounts = dAccs
                vault.deepseek = dVault
                fsSync.writeFileSync(vaultPath, JSON.stringify(vault, null, 2), 'utf-8')
              } catch {}
            }
          } catch (syncErr) {
            console.warn('[DeepSeek Web IPC] pool/vault direct sync error:', syncErr)
          }

          await notifyBackendDeepSeekWebSession(sessionData)

          setTimeout(() => {
            if (!win.isDestroyed()) win.close()
          }, 1500)

          resolve({
            success: true,
            email: finalEmail,
            message: `DeepSeek Web 세션이 성공적으로 연동되었습니다! (${finalEmail})`
          })
        } catch (err) {
          resolve({ success: false, message: `세션 저장 실패: ${err.message}` })
        }
      }

      const inspectAuth = async () => {
        if (resolved) return
        try {
          if (win.isDestroyed()) return
          const currentUrl = win.webContents.getURL() || ''

          // 1. NEVER consider logged-in while on sign-in, login, or Google/Apple OAuth pages
          const isAuthPage =
            currentUrl.includes('/sign_in') ||
            currentUrl.includes('/login') ||
            currentUrl.includes('accounts.google.com') ||
            currentUrl.includes('appleid.apple.com')

          if (isAuthPage) {
            // User is actively logging in; keep the window open!
            return
          }

          // 2. Check localStorage in deepseek.com
          let storageInfo = null
          try {
            storageInfo = await win.webContents.executeJavaScript(`
              (() => {
                try {
                  const tokenRaw = localStorage.getItem('userToken') || localStorage.getItem('token');
                  let genuineToken = null;
                  if (tokenRaw) {
                    try {
                      const parsed = JSON.parse(tokenRaw);
                      if (parsed && typeof parsed === 'object') {
                        const candidate = parsed.value || parsed.token;
                        if (typeof candidate === 'string' && candidate.length > 20 && candidate !== 'null' && !candidate.includes('"value":null')) {
                          genuineToken = candidate;
                        }
                      } else if (typeof tokenRaw === 'string' && tokenRaw.length > 20 && !tokenRaw.includes('null') && !tokenRaw.includes('{')) {
                        genuineToken = tokenRaw;
                      }
                    } catch {
                      if (typeof tokenRaw === 'string' && tokenRaw.length > 20 && !tokenRaw.includes('null') && !tokenRaw.includes('{')) {
                        genuineToken = tokenRaw;
                      }
                    }
                  }

                  const userRaw = localStorage.getItem('user') || localStorage.getItem('userInfo');
                  let email = null;
                  let hasValidUser = false;
                  if (userRaw) {
                    try {
                      const u = JSON.parse(userRaw);
                      if (u && typeof u === 'object' && (u.id || u.email)) {
                        email = u.email || u.user_email || null;
                        hasValidUser = true;
                      }
                    } catch {}
                  }

                  const modals = Array.from(
                    document.querySelectorAll(
                      '[role="dialog"], .ds-modal-mask, .ds-modal, [class*="modal-mask"], [class*="dialog-wrap"], [class*="onboarding"], [class*="age-"]'
                    )
                  )
                  const visibleModals = modals.filter((m) => {
                    try {
                      const style = window.getComputedStyle(m)
                      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
                    } catch {
                      return false
                    }
                  })
                  const hasActiveModal = visibleModals.length > 0

                  const chatInput = document.querySelector(
                    'textarea#chat-input, textarea[placeholder*="DeepSeek"], textarea'
                  )
                  const hasInput = !!(chatInput && !chatInput.disabled && chatInput.offsetParent !== null)

                  return { genuineToken, email, hasValidUser, hasInput, hasActiveModal }
                } catch {
                  return { genuineToken: null, email: null, hasValidUser: false, hasInput: false, hasActiveModal: true }
                }
              })()
            `)
          } catch {}

          const cookies = await customSession.cookies.get({})
          const deepseekCookies = cookies.filter((c) => c.domain?.includes('deepseek.com'))

          // 3. User is ONLY logged in if:
          //    - On chat.deepseek.com (and not on an auth page)
          //    - AND has genuine token (>20 chars)
          //    - AND chat input is active & visible
          //    - AND NO onboarding/age verification modals are currently blocking the screen
          const isChatDomain = currentUrl.includes('chat.deepseek.com') && !isAuthPage
          const hasValidToken = !!(storageInfo && storageInfo.genuineToken)
          const isReadyInChat = !!(storageInfo && storageInfo.hasInput && !storageInfo.hasActiveModal)

          const isLoggedIn = isChatDomain && hasValidToken && isReadyInChat

          if (isLoggedIn) {
            let detectedEmail = storageInfo?.email || profile?.email || emailHint || null
            if (!detectedEmail) {
              try {
                detectedEmail = await win.webContents.executeJavaScript(`
                  (() => {
                    try {
                      const text = document.body.innerText || '';
                      const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                      return match ? match[0] : null;
                    } catch { return null; }
                  })()
                `)
              } catch {}
            }

            console.log(`[DeepSeek Web IPC] ✅ Genuine authentication confirmed for: ${detectedEmail || 'deepseek_user'}`)
            await finishSuccess(detectedEmail, deepseekCookies.length > 0 ? deepseekCookies : cookies, storageInfo?.genuineToken)
          }
        } catch (e) {
          console.warn('[DeepSeek Web IPC] inspectAuth error:', e)
        }
      }

      checkTimer = setInterval(inspectAuth, 1500)

      win.webContents.on('did-navigate', async (_e, url) => {
        if (url.includes('chat.deepseek.com') && !url.includes('sign_in')) {
          setTimeout(inspectAuth, 1000)
        }
      })

      win.on('closed', () => {
        if (checkTimer) clearInterval(checkTimer)
        if (!resolved) {
          resolve({ success: false, message: 'DeepSeek 로그인 창이 닫혔습니다.' })
        }
      })

      win.loadURL('https://chat.deepseek.com/sign_in').catch((err) => {
        console.warn('[DeepSeek Web IPC] LoadURL warning:', err.message)
      })
    })
  })
}
