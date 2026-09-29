/**
 * Electron IPC Handler - OpenAI Codex (Astra) & ChatGPT Web Dual Sovereign Authentication
 *
 * Provides two independent, dedicated web authentication pipelines:
 * 1. ⚡ Codex CLI (Astra OAuth):
 *    - Launches bundled Codex CLI login in an isolated staging CODEX_HOME
 *    - Captures auth.json upon browser OAuth completion
 *    - Decodes JWT claims to resolve genuine email, name, and plan (Plus/Pro/Free)
 *    - Auto-saves to %LOCALAPPDATA%\ViraLoop Studio\media\04_Profiles\openai_sessions\{email}\auth.json
 *    - Syncs live with openai_account_pool and backend
 *
 * 2. 🌐 ChatGPT Web (Web Quota Session):
 *    - Opens an isolated stealth BrowserWindow for chatgpt.com
 *    - Intercepts __Secure-next-auth.session-token and session cookies
 *    - Auto-extracts account email and plan
 *    - Saves to %LOCALAPPDATA%\ViraLoop Studio\media\04_Profiles\openai_sessions\{email}\cookies_chatgpt.json
 *    - Expands quota without API costs
 */

import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import http from 'node:http'
import { spawn } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getOpenAISessionsDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dir = path.join(localAppData, 'ViraLoop Studio', 'media', '04_Profiles', 'openai_sessions')
  try {
    fsSync.mkdirSync(dir, { recursive: true })
  } catch (e) {}
  return dir
}

function getTempStagingDir(sub = 'codex_staging') {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dir = path.join(localAppData, 'ViraLoop Studio', 'media', '02_Operations', 'Temp', `${sub}_${Date.now()}`)
  try {
    fsSync.mkdirSync(dir, { recursive: true })
  } catch (e) {}
  return dir
}

function findPixelingCodexJs() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const releasesDir = path.join(localAppData, 'Programs', 'Pixeling', 'releases')
  if (!fsSync.existsSync(releasesDir)) return null

  try {
    const entries = fsSync.readdirSync(releasesDir)
    // Sort descending so highest version (e.g. 1.0.133 > 1.0.125) comes first
    entries.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }))

    for (const rel of entries) {
      const cand = path.join(releasesDir, rel, 'app', 'tools', 'codex', 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
      if (fsSync.existsSync(cand)) {
        return cand
      }
    }
  } catch (e) {
    console.warn('[OpenAI IPC] Error scanning Pixeling releases:', e)
  }
  return null
}

function parseJwtClaims(token) {
  try {
    if (token && token.includes('.')) {
      const part = token.split('.')[1]
      const padded = part + '='.repeat((4 - (part.length % 4)) % 4)
      const decoded = Buffer.from(padded, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    }
  } catch (e) {}
  return {}
}

async function notifyBackendAccountAuth(authData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(authData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/codex/account-auth',
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

async function notifyBackendWebSession(sessionData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(sessionData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/chatgpt-web/web-session',
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

export function registerOpenAIWebIPC(ipcMain) {
  // -------------------------------------------------------------------------
  // 1. ⚡ Codex CLI OAuth Browser Login
  // -------------------------------------------------------------------------
  ipcMain.handle('openai:open-codex-login', async (_event, emailHint) => {
    const codexJs = findPixelingCodexJs()
    if (!codexJs) {
      return {
        success: false,
        message: 'OpenAI Codex 실행 엔진(Pixeling 번들)을 찾을 수 없습니다. 경로를 확인해 주세요.'
      }
    }

    const stagingDir = getTempStagingDir('codex_auth')
    const stagingAuthJson = path.join(stagingDir, 'auth.json')

    console.log(`[OpenAI IPC] Launching Codex OAuth login in staging dir: ${stagingDir}`)

    const env = { ...process.env, CODEX_HOME: stagingDir }
    const nodeBin = process.execPath.endsWith('node.exe') ? process.execPath : 'node'
    let child = null
    try {
      child = spawn(nodeBin, [codexJs, 'login'], {
        env,
        windowsHide: true
      })
    } catch (e) {
      return { success: false, message: `Codex 로그인 프로세스 실행 실패: ${e.message}` }
    }

    let openedUrl = false
    let outputBuffer = ''

    const handleOutput = (chunk) => {
      outputBuffer += chunk.toString()
      if (!openedUrl) {
        const match = outputBuffer.match(/https:\/\/auth\.openai\.com\/oauth\/authorize[^\s\r\n]+/)
        if (match) {
          openedUrl = true
          const authUrl = match[0]
          console.log(`[OpenAI IPC] Automatically opening browser for Codex OAuth: ${authUrl}`)
          shell.openExternal(authUrl).catch((err) => {
            console.warn('[OpenAI IPC] shell.openExternal notice:', err)
          })
        }
      }
    }

    child.stdout?.on('data', handleOutput)
    child.stderr?.on('data', handleOutput)
    child.on('error', (err) => {
      console.warn('[OpenAI IPC] Codex child process error notice:', err)
    })

    // Poll stagingDir for auth.json creation (up to 600 seconds / 10 minutes)
    const startTime = Date.now()
    const maxWaitMs = 600000

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (Date.now() - startTime > maxWaitMs) {
          clearInterval(interval)
          try {
            if (child && !child.killed) child.kill()
            await fs.rm(stagingDir, { recursive: true, force: true })
          } catch {}
          resolve({ success: false, message: 'Codex OAuth 로그인 대기 시간이 초과되었습니다 (10분).' })
          return
        }

        if (fsSync.existsSync(stagingAuthJson)) {
          try {
            const raw = await fs.readFile(stagingAuthJson, 'utf-8')
            const parsed = JSON.parse(raw)
            const tokens = parsed.tokens || {}
            const accTok = tokens.access_token
            const idTok = tokens.id_token || accTok

            if (accTok) {
              clearInterval(interval)
              try {
                if (child && !child.killed) child.kill()
              } catch {}
              const claims = parseJwtClaims(idTok)
              const email = claims.email || (emailHint && emailHint.includes('@') ? emailHint.trim() : null) || 'openai_user@gmail.com'
              const authClaim = claims['https://api.openai.com/auth'] || {}
              const plan = (authClaim.chatgpt_plan_type || 'plus').toUpperCase()
              const name = claims.name || email.split('@')[0]

              // Save to official profile directory: 04_Profiles/openai_sessions/{email}/auth.json
              const targetDir = path.join(getOpenAISessionsDir(), email)
              await fs.mkdir(targetDir, { recursive: true })
              await fs.writeFile(path.join(targetDir, 'auth.json'), JSON.stringify(parsed, null, 2), 'utf-8')

              // Also sync Pixeling's main codex-home if none existed
              const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
              const pixCodexHome = path.join(localAppData, 'Programs', 'Pixeling', 'state', 'codex-home')
              if (!fsSync.existsSync(path.join(pixCodexHome, 'auth.json'))) {
                try {
                  await fs.mkdir(pixCodexHome, { recursive: true })
                  await fs.writeFile(path.join(pixCodexHome, 'auth.json'), JSON.stringify(parsed, null, 2), 'utf-8')
                } catch {}
              }

              // Notify backend
              await notifyBackendAccountAuth({
                email,
                name,
                plan,
                auth_data: parsed
              })

              // Clean up staging
              try {
                await fs.rm(stagingDir, { recursive: true, force: true })
              } catch {}

              resolve({
                success: true,
                email,
                plan,
                name,
                message: `'${email}' (${plan} 플랜) 계정의 Codex OAuth 세션이 성공적으로 연동되었습니다!`
              })
              return
            }
          } catch (e) {
            // File might still be writing, wait next cycle
          }
        }
      }, 2000)
    })
  })

  // -------------------------------------------------------------------------
  // 2. 🌐 ChatGPT Web (chatgpt.com) Session Stealth Browser Login
  // -------------------------------------------------------------------------
  ipcMain.handle('openai:open-chatgpt-web-login', async (_event, emailHint) => {
    const cleanKey = (emailHint || `session_${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
    const partition = `persist:chatgpt_web_${cleanKey}`
    const customSession = session.fromPartition(partition)

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

    customSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.openai.com/*', 'https://chatgpt.com/*', 'https://*.chatgpt.com/*', 'https://auth0.openai.com/*'] },
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
      title: 'OpenAI ChatGPT Web 세션 로그인 (웹 쿼터 연동)',
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
    win.webContents.setWindowOpenHandler(() => ({ action: 'allow' }))

    win.loadURL('https://chatgpt.com')

    return new Promise((resolve) => {
      let pollInterval = null
      let captured = false

      const checkSession = async () => {
        if (captured || win.isDestroyed()) return

        try {
          const currentUrl = win.webContents.getURL() || ''
          const cookies = await customSession.cookies.get({})
          const nextAuthToken = cookies.find((c) => c.name.includes('next-auth.session-token') || c.name === 'session-token')

          // Check if user is logged into ChatGPT
          if (nextAuthToken && (currentUrl.includes('chatgpt.com') || currentUrl.includes('chat.openai.com'))) {
            // Attempt to get user email from session
            let extractedEmail = emailHint || null
            try {
              const domEmail = await win.webContents.executeJavaScript(`
                (() => {
                  try {
                    // Try to extract from window.__NEXT_DATA__
                    if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
                      const u = window.__NEXT_DATA__.props.pageProps.user;
                      if (u && u.email) return u.email;
                    }
                    // Try avatar or navigation elements
                    const els = document.querySelectorAll('[aria-label*="@"], [data-testid*="user"]');
                    for (const el of els) {
                      const txt = el.getAttribute('aria-label') || el.textContent || '';
                      const m = txt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                      if (m) return m[0];
                    }
                    const bodyTxt = document.body ? document.body.innerText : '';
                    const bm = bodyTxt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                    if (bm) return bm[0];
                  } catch (e) {}
                  return null;
                })()
              `)
              if (domEmail) extractedEmail = domEmail
            } catch {}

            const finalEmail = extractedEmail || emailHint || 'chatgpt_web_user@openai.com'
            captured = true
            clearInterval(pollInterval)

            const targetDir = path.join(getOpenAISessionsDir(), finalEmail)
            await fs.mkdir(targetDir, { recursive: true })

            const sessionData = {
              email: finalEmail,
              session_token: nextAuthToken.value,
              updated_at: new Date().toISOString(),
              cookie_count: cookies.length,
              cookies: cookies.map((c) => ({
                name: c.name,
                value: c.value,
                domain: c.domain,
                path: c.path,
                secure: c.secure,
                httpOnly: c.httpOnly,
                expirationDate: c.expirationDate
              }))
            }

            await fs.writeFile(path.join(targetDir, 'cookies_chatgpt.json'), JSON.stringify(sessionData, null, 2), 'utf-8')
            await notifyBackendWebSession(sessionData)

            setTimeout(() => {
              if (!win.isDestroyed()) win.close()
            }, 1000)

            resolve({
              success: true,
              email: finalEmail,
              cookieCount: cookies.length,
              message: `'${finalEmail}' ChatGPT Web 세션 쿠키가 성공적으로 연동되었습니다!`
            })
          }
        } catch (e) {
          console.warn('[OpenAI IPC] Error inspecting ChatGPT web cookies:', e)
        }
      }

      pollInterval = setInterval(checkSession, 2000)

      win.on('closed', () => {
        clearInterval(pollInterval)
        if (!captured) {
          resolve({ success: false, message: 'ChatGPT Web 로그인 창이 완료 전에 닫혔습니다.' })
        }
      })
    })
  })
}
