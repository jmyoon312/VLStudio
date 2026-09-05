/**
 * OmniRoute IPC & Lifecycle Manager
 * Handles OmniRoute detection, background daemon lifecycle (start/stop/restart),
 * one-click automatic installation via npm, and automated patch updates.
 */

import { spawn, exec } from 'node:child_process'
import http from 'node:http'
import { shell } from 'electron'

const OMNIROUTE_PORT = 20128
const OMNIROUTE_DASHBOARD_URL = 'http://localhost:20128/dashboard'
const OMNIROUTE_API_URL = 'http://localhost:20128/v1'

let omnirouteProcess = null
let isStarting = false

/**
 * Check if port 20128 is listening and responding
 */
export function isOmniRouteListening(port = OMNIROUTE_PORT, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: timeoutMs }, (res) => {
      resolve(true)
      res.resume()
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * Check if omniroute CLI is installed globally or locally
 */
export function getOmniRouteVersion() {
  return new Promise((resolve) => {
    exec('omniroute --version', { timeout: 4000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ installed: false, version: null })
      } else {
        const match = stdout.match(/(\d+\.\d+\.\d+)/)
        const cleanVer = match ? match[1] : stdout.trim().split('\n')[0].replace(/^v/i, '').trim()
        resolve({ installed: true, version: cleanVer || '3.8.50' })
      }
    })
  })
}

/**
 * Fetch latest version from npm registry
 */
export function getLatestOmniRouteVersion() {
  return new Promise((resolve) => {
    const req = http.get('http://registry.npmjs.org/omniroute/latest', { timeout: 3000 }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.version || null)
        } catch {
          resolve(null)
        }
      })
    })
    req.on('error', () => resolve(null))
    req.on('timeout', () => { req.destroy(); resolve(null) })
  })
}

/**
 * Start OmniRoute server daemon
 */
export async function startOmniRouteDaemon() {
  const isAlive = await isOmniRouteListening()
  if (isAlive) {
    console.log('[OmniRoute] ✅ Server already active on port', OMNIROUTE_PORT)
    return { success: true, message: 'OmniRoute already running' }
  }

  if (isStarting) {
    console.log('[OmniRoute] ⏳ Start already in progress...')
    return { success: true, message: 'Start in progress' }
  }

  isStarting = true
  console.log('[OmniRoute] 🚀 Spawning omniroute serve on port', OMNIROUTE_PORT)

  try {
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'cmd.exe' : 'omniroute'
    const args = isWin ? ['/c', 'omniroute', 'serve'] : ['serve']

    omnirouteProcess = spawn(cmd, args, {
      detached: false,
      stdio: 'pipe',
      windowsHide: true,
      env: {
        ...process.env,
        PORT: String(OMNIROUTE_PORT)
      }
    })

    omnirouteProcess.stdout?.on('data', (data) => {
      console.log(`[OmniRoute] ${data.toString().trim()}`)
    })

    omnirouteProcess.stderr?.on('data', (data) => {
      console.warn(`[OmniRoute ERR] ${data.toString().trim()}`)
    })

    omnirouteProcess.on('close', (code) => {
      console.log(`[OmniRoute] Process exited with code ${code}`)
      omnirouteProcess = null
      isStarting = false
    })

    // Poll until ready (up to 15s)
    let waited = 0
    while (waited < 15000) {
      await new Promise(r => setTimeout(r, 800))
      waited += 800
      if (await isOmniRouteListening()) {
        isStarting = false
        console.log('[OmniRoute] ✅ Server successfully listening on port', OMNIROUTE_PORT)
        return { success: true, message: 'OmniRoute started successfully' }
      }
    }

    isStarting = false
    return { success: true, message: 'OmniRoute process launched' }
  } catch (err) {
    isStarting = false
    console.error('[OmniRoute] Failed to spawn:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Stop OmniRoute server daemon
 */
export async function stopOmniRouteDaemon() {
  console.log('[OmniRoute] 🛑 Stopping OmniRoute daemon...')
  try {
    if (omnirouteProcess && omnirouteProcess.pid) {
      if (process.platform === 'win32') {
        exec(`taskkill /F /T /PID ${omnirouteProcess.pid} 2>NUL`)
      } else {
        omnirouteProcess.kill('SIGTERM')
      }
      omnirouteProcess = null
    }

    // Call CLI stop as safety backup
    exec('omniroute stop', () => {})
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

/**
 * One-click install or update omniroute via npm
 */
export function runNpmInstall(onLog) {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'cmd.exe' : 'npm'
    const args = isWin ? ['/c', 'npm', 'install', '-g', 'omniroute@latest'] : ['install', '-g', 'omniroute@latest']

    if (onLog) onLog('[OmniRoute Installer] npm install -g omniroute@latest 시작...\n')

    const child = spawn(cmd, args, {
      detached: false,
      windowsHide: true,
      env: process.env
    })

    child.stdout?.on('data', (d) => {
      const line = d.toString()
      if (onLog) onLog(line)
    })

    child.stderr?.on('data', (d) => {
      const line = d.toString()
      if (onLog) onLog(line)
    })

    child.on('close', (code) => {
      if (code === 0) {
        if (onLog) onLog('\n[OmniRoute Installer] ✅ 설치/업데이트 완료! 서버를 기동합니다...\n')
        resolve({ success: true })
      } else {
        if (onLog) onLog(`\n[OmniRoute Installer] ❌ 설치 실패 (Exit code: ${code})\n`)
        resolve({ success: false, error: `Exit code ${code}` })
      }
    })

    child.on('error', (err) => {
      if (onLog) onLog(`\n[OmniRoute Installer] ❌ 오류 발생: ${err.message}\n`)
      resolve({ success: false, error: err.message })
    })
  })
}

/**
 * Register OmniRoute IPC handlers
 */
export function registerOmniRouteIPC(ipcMain, getMainWindow) {
  const handlers = [
    'omniroute:get-status',
    'omniroute:check-update',
    'omniroute:start',
    'omniroute:stop',
    'omniroute:restart',
    'omniroute:install',
    'omniroute:open-dashboard'
  ]
  for (const h of handlers) {
    try {
      ipcMain.removeHandler(h)
    } catch {}
  }

  // 1. Get full status
  ipcMain.handle('omniroute:get-status', async () => {
    const alive = await isOmniRouteListening()
    const { installed, version } = await getOmniRouteVersion()
    return {
      running: alive,
      installed: installed,
      version: version || '알 수 없음',
      port: OMNIROUTE_PORT,
      endpointUrl: OMNIROUTE_API_URL,
      dashboardUrl: OMNIROUTE_DASHBOARD_URL
    }
  })

  // 2. Check for updates
  ipcMain.handle('omniroute:check-update', async () => {
    const { installed, version: currentVersion } = await getOmniRouteVersion()
    const latestVersion = await getLatestOmniRouteVersion()
    const hasUpdate = Boolean(currentVersion && latestVersion && currentVersion !== latestVersion)

    return {
      installed,
      currentVersion,
      latestVersion: latestVersion || currentVersion,
      hasUpdate
    }
  })

  // 3. Start daemon
  ipcMain.handle('omniroute:start', async () => {
    return await startOmniRouteDaemon()
  })

  // 4. Stop daemon
  ipcMain.handle('omniroute:stop', async () => {
    return await stopOmniRouteDaemon()
  })

  // 5. Restart daemon
  ipcMain.handle('omniroute:restart', async () => {
    await stopOmniRouteDaemon()
    await new Promise(r => setTimeout(r, 1200))
    return await startOmniRouteDaemon()
  })

  // 6. One-stop install / update
  ipcMain.handle('omniroute:install', async (event) => {
    const sendLog = (text) => {
      try {
        event.sender.send('omniroute:install-log', text)
      } catch {}
    }

    const result = await runNpmInstall(sendLog)
    if (result.success) {
      // Start server right after install
      await startOmniRouteDaemon()
    }
    return result
  })

  // 7. Open Dashboard
  ipcMain.handle('omniroute:open-dashboard', async () => {
    try {
      await shell.openExternal(OMNIROUTE_DASHBOARD_URL)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  })
}
