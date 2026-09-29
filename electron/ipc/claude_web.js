/**
 * Electron IPC Handler - Anthropic Claude Sovereign Multi-Account Authentication
 *
 * Provides dedicated web authentication pipelines:
 * 1. 🌐 Claude Web (claude.ai):
 *    - Opens an isolated stealth BrowserWindow for claude.ai
 *    - Intercepts sessionKey cookie (sk-ant-sid01-...)
 *    - Auto-extracts account email and plan
 *    - Saves to %LOCALAPPDATA%\ViraLoop Studio\media\04_Profiles\claude_sessions\{email}\cookies_claude.json
 *    - Zero terminal, pure web browser login with real-time 5h/weekly quotas
 *
 * 2. ⚡ Claude Code CLI (OAuth fallback):
 *    - Runs claude auth login in isolated CLAUDE_CONFIG_DIR
 */

import { app, BrowserWindow, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import os from 'node:os'
import http from 'node:http'
import { spawn } from 'node:child_process'
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
    console.warn('[Claude Web IPC] resolvePartitionForTarget error:', err)
  }

  const cleanKey = (emailOrProfileId || `session_${Date.now()}`).trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
  return {
    partition: `persist:flow_profile_${cleanKey}`,
    profile: null
  }
}

function getClaudeSessionsDir() {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const dir = path.join(localAppData, 'ViraLoop Studio', 'media', '04_Profiles', 'claude_sessions')
  try {
    fsSync.mkdirSync(dir, { recursive: true })
  } catch (e) {}
  return dir
}

async function notifyBackendClaudeAccount(authData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(authData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/claude/account-auth',
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

async function notifyBackendClaudeWebSession(sessionData) {
  return new Promise((resolve) => {
    try {
      const payload = JSON.stringify(sessionData)
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: 8000,
          path: '/api/ai-accounts/claude/web-session',
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

export function registerClaudeWebIPC(ipcMain) {
  // -------------------------------------------------------------------------
  // 1. 🌐 Claude Web (claude.ai) Session Stealth Browser Login (Primary UX)
  // -------------------------------------------------------------------------
  ipcMain.handle('claude:open-claude-web-login', async (_event, emailHint, options = {}) => {
    const { partition, profile } = await resolvePartitionForTarget(emailHint)
    const customSession = session.fromPartition(partition)

    // [Cookie Reset / Re-collect Support]
    if (options && options.resetCookies) {
      console.log(`[Claude Web IPC] Resetting stale session cookies for partition: ${partition} (${emailHint})`)
      try {
        await customSession.clearStorageData({
          storages: ['cookies', 'serviceworkers', 'cache']
        })
      } catch (err) {
        console.warn('[Claude Web IPC] clearStorageData error:', err)
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

    // IMPORTANT: Exclude Google domains completely to prevent BotGuard "쿠키 설정에 문제가 있음을 발견했습니다"
    customSession.webRequest.onBeforeSendHeaders(
      { urls: ['https://*.anthropic.com/*', 'https://claude.ai/*', 'https://*.claude.ai/*'] },
      (details, callback) => {
        const headers = { ...details.requestHeaders }
        headers['User-Agent'] = modernChromeUA
        headers['Sec-Ch-Ua'] = '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"'
        headers['Sec-Ch-Ua-Mobile'] = '?0'
        headers['Sec-Ch-Ua-Platform'] = '"Windows"'
        callback({ cancel: false, requestHeaders: headers })
      }
    )

    // [Check existing session first - only if NOT resetting]
    if (!options?.resetCookies) {
      try {
        const existingCookies = await customSession.cookies.get({})
        const sessionKeyCookie = existingCookies.find((c) => c.name === 'sessionKey')
        if (sessionKeyCookie && sessionKeyCookie.value) {
          const finalEmail = profile?.email || emailHint || 'claude_user@gmail.com'
          const targetDir = path.join(getClaudeSessionsDir(), finalEmail)
          await fs.mkdir(targetDir, { recursive: true })

          const sessionData = {
            email: finalEmail,
            session_key: sessionKeyCookie.value,
            updated_at: new Date().toISOString(),
            cookie_count: existingCookies.length,
            cookies: existingCookies.map((c) => ({
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
            path.join(targetDir, 'cookies_claude.json'),
            JSON.stringify(sessionData, null, 2),
            'utf-8'
          )

          await notifyBackendClaudeWebSession(sessionData)

          return {
            success: true,
            email: finalEmail,
            message: `[${profile?.name || finalEmail}] Google 프로필 세션에서 Claude Web 세션이 즉시 연동되었습니다!`
          }
        }
      } catch (e) {
        console.warn('[Claude Web IPC] Check existing session error:', e)
      }
    }

    const win = new BrowserWindow({
      width: 1050,
      height: 780,
      title: `Anthropic Claude Web 세션 로그인 (${profile?.name ? profile.name + ' - ' : ''}claude.ai)`,
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
        autoHideMenuBar: true,
        webPreferences: {
          session: customSession,
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
      childWin.webContents.setUserAgent(modernChromeUA)
      try {
        childWin.setMenuBarVisibility(false)
      } catch {}
      childWin.webContents.on('dom-ready', () => {
        childWin.webContents.executeJavaScript(suppressPasskeyScript).catch(() => {})
      })
    })

    win.loadURL('https://claude.ai/login')

    return new Promise((resolve) => {
      let pollInterval = null
      let captured = false

      const checkSession = async () => {
        if (captured || win.isDestroyed()) return

        try {
          const currentUrl = win.webContents.getURL() || ''
          const cookies = await customSession.cookies.get({})
          const sessionKeyCookie = cookies.find((c) => c.name === 'sessionKey')

          // Check if user is logged into Claude
          if (sessionKeyCookie && sessionKeyCookie.value && (currentUrl.includes('claude.ai') && !currentUrl.includes('/login'))) {
            // Attempt to get user email from session
            let extractedEmail = null
            try {
              extractedEmail = await win.webContents.executeJavaScript(`
                (async () => {
                  try {
                    // 1. Try Claude's internal account API
                    const accRes = await fetch('/api/auth/current_account').then(r => r.json()).catch(() => null);
                    if (accRes && accRes.account && accRes.account.email_address) {
                      const apiEmail = accRes.account.email_address.trim().toLowerCase();
                      if (apiEmail && !apiEmail.includes('@anthropic.com') && !apiEmail.includes('@claude.ai')) {
                        return apiEmail;
                      }
                    }

                    // 2. Try navigation / user menu elements
                    const els = document.querySelectorAll('[aria-label*="@"], [data-testid*="user"], [data-testid*="profile"]');
                    for (const el of els) {
                      const txt = el.getAttribute('aria-label') || el.textContent || '';
                      const m = txt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/);
                      if (m && !m[0].toLowerCase().includes('@anthropic.com') && !m[0].toLowerCase().includes('@claude.ai')) {
                        return m[0].toLowerCase();
                      }
                    }
                  } catch (e) {}
                  return null;
                })()
              `)
            } catch {}

            const finalEmail = (
              (profile?.email && !profile.email.toLowerCase().includes('@anthropic.com') ? profile.email : null) ||
              (emailHint && emailHint.includes('@') && !emailHint.toLowerCase().includes('@anthropic.com') ? emailHint : null) ||
              (extractedEmail && !extractedEmail.toLowerCase().includes('@anthropic.com') ? extractedEmail : null) ||
              `claude_user_${Date.now()}@gmail.com`
            ).trim().toLowerCase()
            captured = true
            clearInterval(pollInterval)

            const targetDir = path.join(getClaudeSessionsDir(), finalEmail)
            await fs.mkdir(targetDir, { recursive: true })

            const sessionData = {
              email: finalEmail,
              session_key: sessionKeyCookie.value,
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
              path.join(targetDir, 'cookies_claude.json'),
              JSON.stringify(sessionData, null, 2),
              'utf-8'
            )

            // Notify backend
            await notifyBackendClaudeWebSession(sessionData)

            setTimeout(() => {
              try {
                if (!win.isDestroyed()) win.close()
              } catch {}
            }, 1200)

            resolve({
              success: true,
              email: finalEmail,
              plan: 'Claude Web',
              message: `'${finalEmail}' Claude Web 세션이 성공적으로 연동되었습니다!`
            })
          }
        } catch (e) {
          console.warn('[Claude IPC] Session poll notice:', e)
        }
      }

      pollInterval = setInterval(checkSession, 1500)

      win.on('closed', () => {
        clearInterval(pollInterval)
        if (!captured) {
          resolve({ success: false, message: '로그인 창이 닫혔습니다.' })
        }
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. ⚡ Claude Code CLI OAuth Browser Login
  // -------------------------------------------------------------------------
  ipcMain.handle('claude:open-claude-login', async (_event, emailHint) => {
    const rawEmail = (emailHint || '').trim().toLowerCase()
    const targetEmail = rawEmail.includes('@') ? rawEmail : `claude_user_${Date.now()}@gmail.com`
    const sessionsDir = getClaudeSessionsDir()
    const targetDir = path.join(sessionsDir, targetEmail)
    try {
      await fs.mkdir(targetDir, { recursive: true })
      const configPath = path.join(targetDir, '.claude.json')
      if (!fsSync.existsSync(configPath)) {
        await fs.writeFile(configPath, JSON.stringify({ hasCompletedOnboarding: true, theme: 'dark' }, null, 2), 'utf-8')
      }
    } catch (e) {}

    console.log(`[Claude IPC] Launching Claude Code OAuth login in: ${targetDir}`)

    const env = { ...process.env, CLAUDE_CONFIG_DIR: targetDir }
    const emailArg = rawEmail.includes('@') ? `--email "${rawEmail}"` : ''
    const batPath = path.join(targetDir, 'launch_login.bat')

    const batContent = [
      '@echo off',
      'chcp 65001 >nul',
      'title Anthropic Claude Code 로그인',
      'echo ====================================================',
      'echo [Anthropic Claude Code OAuth 브라우저 로그인]',
      'echo 브라우저가 열리면 Claude 계정으로 로그인해 주세요.',
      'echo ====================================================',
      `claude auth login ${emailArg}`,
      'pause'
    ].join('\r\n')

    try {
      await fs.writeFile(batPath, batContent, 'utf-8')
    } catch (e) {}

    let child = null
    try {
      child = spawn('cmd.exe', ['/c', 'start', 'Claude Code OAuth Login', batPath], {
        env,
        shell: true
      })
    } catch (e) {
      return { success: false, message: `Claude 로그인 창 실행 실패: ${e.message}` }
    }

    const startTime = Date.now()
    const maxWaitMs = 600000

    return new Promise((resolve) => {
      const interval = setInterval(async () => {
        if (Date.now() - startTime > maxWaitMs) {
          clearInterval(interval)
          resolve({ success: false, message: 'Claude OAuth 로그인 대기 시간이 초과되었습니다 (10분).' })
          return
        }

        const claudeJsonPath = path.join(targetDir, '.claude.json')
        const sessionJsonPath = path.join(targetDir, 'session.json')

        if (fsSync.existsSync(claudeJsonPath) || fsSync.existsSync(sessionJsonPath)) {
          let resolvedEmail = targetEmail
          try {
            if (fsSync.existsSync(sessionJsonPath)) {
              const sessRaw = await fs.readFile(sessionJsonPath, 'utf-8')
              const sess = JSON.parse(sessRaw)
              if (sess?.account?.email) resolvedEmail = sess.account.email.toLowerCase()
            }
          } catch (e) {}

          clearInterval(interval)

          // Notify backend
          await notifyBackendClaudeAccount({
            email: resolvedEmail,
            name: resolvedEmail.split('@')[0],
            plan: 'Claude Code'
          })

          resolve({
            success: true,
            email: resolvedEmail,
            plan: 'Claude Code',
            message: `'${resolvedEmail}' 계정의 Claude Code 세션이 성공적으로 연동되었습니다!`
          })
        }
      }, 2500)
    })
  })
}
