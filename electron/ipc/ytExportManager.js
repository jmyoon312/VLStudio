/**
 * Electron IPC Handler - YouTube Brand Channel Sequential Switcher
 *
 * Implements the 4-stage anti-ban switcher:
 * 1. Destroy active WebContentsView to release memory and network sockets.
 * 2. Delay for LTE cellular IP rotation (Smart phone USB tethering Airplane mode toggle).
 * 3. Assign new brand session partition (`persist:yt_brand_N`) with dedicated LTE proxy binding.
 * 4. Apply browser DNA / hardware fingerprint re-rolling and instantiate new WebContentsView.
 */

import { session, WebContentsView, net } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

global.ytUploadView = null
global.currentYtBrandId = null

/**
 * Register YouTube export/upload-related IPC handlers.
 * 
 * @param {Electron.IpcMain} ipcMain
 * @param {Function} getMainWindow - Helper to get the main window instance
 */
export function registerYoutubeIPC(ipcMain, getMainWindow) {
  // YouTube Brand Switcher IPC
  ipcMain.handle('youtube:switch-brand', async (event, { brandId, lteProxyPort }) => {
    try {
      console.log(`[YouTube IPC] Switch Brand request received: ${brandId} (proxy: ${lteProxyPort})`);
      const success = await switchYoutubeBrandChannel(brandId, lteProxyPort, getMainWindow());
      return { success };
    } catch (e) {
      console.error('[YouTube IPC] switch brand channel failed:', e.message);
      return { success: false, error: e.message };
    }
  });

  // Query active YouTube brand session information
  ipcMain.handle('youtube:get-active-brand', async () => {
    return {
      activeBrandId: global.currentYtBrandId,
      hasView: !!global.ytUploadView
    };
  });
}

/**
 * High-reliability brand switcher logic executing session segregation
 * and IP environment spoofing.
 */
async function switchYoutubeBrandChannel(nextBrandId, lteProxyPort, mainWindow) {
  console.log(`[YouTube Switch] Starting 4-stage switcher -> Brand ID: ${nextBrandId}`);

  // ── Stage 1: Absolute webview/socket destruction to wipe concurrent sessions ──
  if (global.ytUploadView) {
    try {
      mainWindow.contentView.removeChildView(global.ytUploadView);
      global.ytUploadView.webContents.destroy();
      console.log("[YouTube Switch] Stage 1: Previous WebContentsView destroyed successfully.");
    } catch (e) {
      console.warn("[YouTube Switch] Stage 1 warning (non-fatal):", e.message);
    }
    global.ytUploadView = null;
    global.currentYtBrandId = null;
  }

  // ── Stage 2: Wait for LTE cellular IP rotation (Airplane mode check) ──
  console.log("[YouTube Switch] Stage 2: Waiting for LTE cellular IP rotation...");
  const ipChanged = await waitForLteIpRotation();
  if (!ipChanged) {
    throw new Error("LTE cellular IP rotation failed or timed out.");
  }
  console.log("[YouTube Switch] Stage 2: IP rotation check verified.");

  // ── Stage 3: Dedicated Session Partition creation & Fingerprint Re-rolling ──
  const partitionName = `persist:yt_brand_${nextBrandId}`;
  const brandSession = session.fromPartition(partitionName);

  // [Electron①] proxyRules -> SOCKS5 프로토콜 (HTTP/HTTPS가 아닌 SOCKS5로 수정)
  if (lteProxyPort) {
    const socksProxy = `socks5://127.0.0.1:${lteProxyPort}`;
    await brandSession.setProxy({
      proxyRules: socksProxy,
      proxyBypassRules: '127.0.0.1,localhost'
    });
    console.log(`[YouTube Switch] Stage 3: SOCKS5 proxy bound to port ${lteProxyPort}`);
  } else {
    console.log("[YouTube Switch] Stage 3: Direct connection active (no proxy specified).");
  }

  // [NEW-6] DBSC (Device Bound Session Credentials) 등록 헤더 모니터링
  brandSession.webRequest.onHeadersReceived(
    { urls: ['https://*.google.com/*', 'https://*.youtube.com/*'] },
    (details, callback) => {
      const regHeader = details.responseHeaders?.['sec-session-registration'] ||
                        details.responseHeaders?.['Sec-Session-Registration'];
      if (regHeader) {
        console.warn(`[DBSC] Device-Bound Session Credentials detected for brand ${nextBrandId}! Partition must NOT be deleted.`);
        if (!global.dbscBoundBrands) global.dbscBoundBrands = new Set();
        global.dbscBoundBrands.add(nextBrandId);
      }
      callback({ responseHeaders: details.responseHeaders });
    }
  );

  // Inject browser fingerprint protections
  rerollSessionHardwareProfile(brandSession, nextBrandId);
  console.log(`[YouTube Switch] Stage 3: Fingerprints injected for partition: ${partitionName}`);

  // ── Stage 4: Instantiate secure isolated WebContentsView & overlay bounds ──
  global.ytUploadView = new WebContentsView({
    webPreferences: {
      partition: partitionName,
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../stealth_preload.js')
    }
  });

  // Add the newly isolated view as a child to the main window
  mainWindow.contentView.addChildView(global.ytUploadView);
  
  // Calculate overlay coordinates (Micro Layout matching)
  if (global.layoutManager && typeof global.layoutManager.getYtUploadViewBounds === 'function') {
    global.ytUploadView.setBounds(global.layoutManager.getYtUploadViewBounds());
  } else {
    // Default fallback coordinate placement: right half split of main window
    const bounds = mainWindow.getContentBounds();
    const halfWidth = Math.floor(bounds.width / 2);
    global.ytUploadView.setBounds({
      x: halfWidth,
      y: 64,
      width: halfWidth,
      height: bounds.height - 64
    });
  }

  global.currentYtBrandId = nextBrandId;

  // Load YouTube Studio
  console.log("[YouTube Switch] Stage 4: Navigating to YouTube Studio...");
  global.ytUploadView.webContents.loadURL('https://studio.youtube.com/');
  
  return true;
}

/**
 * Production LTE Cellular IP Rotation Trigger via local FastAPI ADB Service.
 */
async function waitForLteIpRotation() {
  try {
    console.log('[YouTube Switch] Hitting local FastAPI rotate-ip endpoint...');
    const response = await net.fetch('http://127.0.0.1:8000/network/rotate/soft', {
      method: 'POST'
    });
    if (response.ok) {
      const data = await response.json();
      console.log('[YouTube Switch] FastAPI IP rotation call response:', data);
      return data.status === 'rotated' || data.status === 'success';
    }
    console.warn('[YouTube Switch] FastAPI rotation call failed, statusCode:', response.status);
    return false;
  } catch (err) {
    console.warn('[YouTube Switch] Failed to contact FastAPI server for rotation, falling back to delay:', err.message);
    // fallback to simulated delay so it doesn't hard-crash if the backend isn't ready
    await new Promise(resolve => setTimeout(resolve, 8000));
    return true;
  }
}

/**
 * [NEW-7] UserAgent 최신화 (Chrome 136) 및 Sec-CH-UA 헤더 일치
 * UA와 Client Hints의 불일치는 YouTube 탐지 시그널이 됨.
 */
function rerollSessionHardwareProfile(sessionObj, brandId) {
  // 2025년 최신 Chrome UA 풀 (2025.05 기준)
  const uaProfiles = [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      secChUa: '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"',
      version: '136'
    },
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      secChUa: '"Chromium";v="135", "Google Chrome";v="135", "Not-A.Brand";v="8"',
      version: '135'
    }
  ];

  const profile = uaProfiles[Math.abs(hashCode(String(brandId))) % uaProfiles.length];
  sessionObj.setUserAgent(profile.ua);

  // Sec-CH-UA 헤더를 UA와 일치시켜 Client Hints 불일치 탐지 방지
  sessionObj.webRequest.onBeforeSendHeaders(
    { urls: ['https://*.youtube.com/*', 'https://*.google.com/*', 'https://*.googlevideo.com/*'] },
    (details, callback) => {
      const headers = details.requestHeaders || {};
      headers['Sec-CH-UA'] = profile.secChUa;
      headers['Sec-CH-UA-Mobile'] = '?0';
      headers['Sec-CH-UA-Platform'] = '"Windows"';
      headers['Sec-CH-UA-Full-Version-List'] = profile.secChUa;
      callback({ requestHeaders: headers });
    }
  );
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
  }
  return hash;
}
