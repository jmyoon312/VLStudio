/**
 * Electron IPC Handler - xAI Grok Sovereign Multi-Account Authentication
 *
 * Provides dedicated web authentication pipelines:
 * 1. 🌐 Grok Web (grok.com):
 *    - Opens an isolated stealth BrowserWindow for grok.com
 *    - Connects with existing Google Flow profiles for instant 1-click Google OAuth
 *    - Intercepts grok.com / x.ai session cookies
 *    - Saves to %LOCALAPPDATA%\ViraLoop Studio\media\04_Profiles\grok_sessions\{email}\cookies_grok.json
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
    console.warn('[Grok Web IPC] resolvePartitionForTarget error:', err)
  }

  const cleanKey = (emailOrProfileId || `session_${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
  return {
    partition: `persist:flow_profile_${cleanKey}`,
    profile: null
  }
}

function getGrokSessionsDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dir = path.join(localAppData, 'ViraLoop Studio', 'media', '04_Profiles', 'grok_sessions')
  try {
    fsSync.mkdirSync(dir, { recursive: true })
  } catch (e) {}
  return dir
}

async function notifyBackendGrokWebSession(sessionData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(sessionData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/grok/web-session',
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

export function registerGrokWebIPC(ipcMain) {
  ipcMain.handle('grok:open-grok-web-login', async (_event, emailHint, options = {}) => {
    const { partition, profile } = await resolvePartitionForTarget(emailHint)
    const customSession = session.fromPartition(partition)

    // [Cookie Reset / Re-collect Support]
    if (options && options.resetCookies) {
      console.log(`[Grok Web IPC] Resetting stale session cookies for partition: ${partition} (${emailHint})`)
      try {
        await customSession.clearStorageData({
          storages: ['cookies', 'serviceworkers', 'cache']
        })
      } catch (err) {
        console.warn('[Grok Web IPC] clearStorageData error:', err)
      }
    }

    // Bypass WebAuthn hardware prompts
    customSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (['security-key', 'u2f', 'webauthn'].includes(permission)) {
        return callback(false)
      }
      callback(true)
    })

    const modernChromeUA =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
    customSession.setUserAgent(modernChromeUA)

    // Intercept Grok / X domains only (never Google to prevent BotGuard cookie mismatch)
    customSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.grok.com/*', 'https://grok.com/*', 'https://*.x.ai/*', 'https://*.twitter.com/*', 'https://*.x.com/*'] },
      (details, callback) => {
        const headers = { ...details.requestHeaders }
        headers['User-Agent'] = modernChromeUA
        headers['Sec-Ch-Ua'] = '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"'
        headers['Sec-Ch-Ua-Mobile'] = '?0'
        headers['Sec-Ch-Ua-Platform'] = '"Windows"'
        callback({ cancel: false, requestHeaders: headers })
      }
    )

    const win = new BrowserWindow({
      width: 1050,
      height: 780,
      title: `xAI Grok Web 세션 로그인 (${profile?.name ? profile.name + ' - ' : ''}grok.com)`,
      autoHideMenuBar: true,
      webPreferences: {
        session: customSession,
        nodeIntegration: false,
        contextIsolation: true,
        plugins: true,
        webSecurity: true
      }
    })

    win.webContents.setUserAgent(modernChromeUA)
    win.webContents.setWindowOpenHandler(() => ({
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 600,
        height: 720,
        autoHideMenuBar: true,
        webPreferences: {
          session: customSession,
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true
        }
      }
    }))

    win.webContents.on('did-create-window', (childWin) => {
      childWin.webContents.setUserAgent(modernChromeUA)
      try {
        childWin.setMenuBarVisibility(false)
      } catch {}
    })

    return new Promise((resolve) => {
      let resolved = false
      let checkTimer = null

      const finishSuccess = async (email, cookies) => {
        if (resolved) return
        resolved = true
        if (checkTimer) clearInterval(checkTimer)

        try {
          const finalEmail = (email || profile?.email || emailHint || 'grok_user@gmail.com').toLowerCase().trim()
          const targetDir = path.join(getGrokSessionsDir(), finalEmail)
          await fs.mkdir(targetDir, { recursive: true })

          const sessionData = {
            email: finalEmail,
            updated_at: new Date().toISOString(),
            cookie_count: cookies.length,
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
            path.join(targetDir, 'cookies_grok.json'),
            JSON.stringify(sessionData, null, 2),
            'utf-8'
          )

          await notifyBackendGrokWebSession(sessionData)

          setTimeout(() => {
            if (!win.isDestroyed()) win.close()
          }, 1200)

          resolve({
            success: true,
            email: finalEmail,
            message: `xAI Grok Web 세션이 성공적으로 연동되었습니다! (${finalEmail})`
          })
        } catch (err) {
          resolve({ success: false, message: `세션 저장 실패: ${err.message}` })
        }
      }

      const inspectCookies = async () => {
        if (resolved) return
        try {
          const cookies = await customSession.cookies.get({})

          // Check for genuine Grok authentication session cookies (sso, sso-rw)
          const grokAuthCookie = cookies.find(
            (c) =>
              (c.domain?.includes('grok.com') || c.domain?.includes('x.ai') || c.domain?.includes('x.com')) &&
              (c.name === 'sso' || c.name === 'sso-rw')
          )

          if (grokAuthCookie && grokAuthCookie.value) {
            // Attempt to extract email from DOM
            let detectedEmail = profile?.email || emailHint || null
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

            await finishSuccess(detectedEmail, cookies)
          }
        } catch (e) {
          console.warn('[Grok Web IPC] inspectCookies error:', e)
        }
      }

      checkTimer = setInterval(inspectCookies, 2000)

      win.webContents.on('did-navigate', async (_e, url) => {
        if (url.includes('grok.com') && !url.includes('login')) {
          setTimeout(inspectCookies, 1000)
        }
      })

      win.on('closed', () => {
        if (checkTimer) clearInterval(checkTimer)
        if (!resolved) {
          resolve({ success: false, message: 'Grok 로그인 창이 닫혔습니다.' })
        }
      })

      win.loadURL('https://grok.com').catch((err) => {
        console.warn('[Grok Web IPC] LoadURL warning:', err.message)
      })
    })
  })
}
