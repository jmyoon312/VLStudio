import electronPkg from 'electron';
const { app } = electronPkg;
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import http from 'node:http';
import https from 'node:https';
import AdmZip from 'adm-zip';

const GITHUB_OWNER = 'jmyoon312';
const GITHUB_REPO = 'VLStudio';
const VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/main/release_assets/version.json`;
const FALLBACK_VERSION_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/version.json`;

class HotPatcher {
  constructor() {
    this.isUpdating = false;
    this.updateAvailable = false;
    this.pendingRestart = false;
    this.lastCheckTime = null;
    this.lastCheckStatus = null;
  }

  getHotpatchDir() {
    return path.join(app.getPath('userData'), 'hotpatch_bundle');
  }

  getMetaPath() {
    return path.join(this.getHotpatchDir(), 'patch-meta.json');
  }

  /**
   * Returns current hotpatch status and bundle metadata.
   */
  getStatus(appVersion = '0.9.46', buildNumber = 1046) {
    const hotpatchDir = this.getHotpatchDir();
    const hotpatchIndex = path.join(hotpatchDir, 'index.html');
    const isHotpatchActive = fs.existsSync(hotpatchIndex);
    let meta = null;

    if (fs.existsSync(this.getMetaPath())) {
      try {
        meta = JSON.parse(fs.readFileSync(this.getMetaPath(), 'utf8'));
      } catch (e) {
        console.warn('[HotPatcher] Failed to read patch-meta.json:', e.message);
      }
    }

    return {
      appVersion: appVersion || (app ? app.getVersion() : '0.9.46'),
      buildNumber: buildNumber || 1046,
      isHotpatchActive,
      hotpatchDir,
      meta,
      isUpdating: this.isUpdating,
      lastCheckTime: this.lastCheckTime,
      lastCheckStatus: this.lastCheckStatus
    };
  }

  /**
   * Clears the hotpatch cache directory so the app falls back to built-in bundle.
   */
  clearCache() {
    const hotpatchDir = this.getHotpatchDir();
    try {
      if (fs.existsSync(hotpatchDir)) {
        fs.rmSync(hotpatchDir, { recursive: true, force: true });
        console.log('[HotPatcher] Hotpatch cache directory cleared successfully.');
        return { success: true, message: '핫패치 캐시가 성공적으로 초기화되었습니다.' };
      }
      return { success: true, message: '핫패치 캐시가 비어 있습니다.' };
    } catch (e) {
      console.error('[HotPatcher] Failed to clear hotpatch cache:', e.message);
      return { success: false, error: e.message };
    }
  }

  /**
   * Returns the active web bundle path (hotpatch bundle if valid, otherwise fallback builtin dist).
   */
  getActiveBundlePath(builtinDistPath) {
    try {
      const hotpatchIndex = path.join(this.getHotpatchDir(), 'index.html');
      if (fs.existsSync(hotpatchIndex)) {
        console.log(`[HotPatcher] Using active Hot-Patch bundle from: ${this.getHotpatchDir()}`);
        return this.getHotpatchDir();
      }
    } catch (e) {
      console.warn('[HotPatcher] Failed to check hotpatch directory:', e.message);
    }
    console.log(`[HotPatcher] Using builtin application dist: ${builtinDistPath}`);
    return builtinDistPath;
  }

  /**
   * Checks GitHub for a newer version of the web bundle.
   */
  async checkForUpdate(currentVersion = '0.0.0', currentBuild = 0) {
    if (this.isUpdating) return { updated: false, reason: 'in_progress' };
    this.isUpdating = true;
    this.lastCheckTime = new Date().toISOString();

    try {
      console.log(`[HotPatcher] Checking for OTA Hot-Patch (Current: v${currentVersion}, #${currentBuild})...`);
      const remoteMeta = await this._fetchJson(VERSION_URL).catch(() => this._fetchJson(FALLBACK_VERSION_URL));
      if (!remoteMeta || !remoteMeta.version) {
        this.isUpdating = false;
        this.lastCheckStatus = 'no_remote_meta';
        return { updated: false, reason: 'no_remote_meta', message: '원격 버전 정보를 가져올 수 없습니다.' };
      }

      const remoteBuild = Number(remoteMeta.buildNumber || 0);
      const isNewer = remoteBuild > currentBuild || this._compareSemver(remoteMeta.version, currentVersion) > 0;

      if (!isNewer) {
        console.log(`[HotPatcher] Already running latest version (v${currentVersion} #${currentBuild}).`);
        this.isUpdating = false;
        this.lastCheckStatus = 'up_to_date';
        return { updated: false, reason: 'up_to_date', message: `이미 최신 버전입니다 (v${currentVersion} #${currentBuild}).` };
      }

      console.log(`[HotPatcher] New Hot-Patch found: v${remoteMeta.version} (#${remoteBuild})`);
      const downloadUrl = remoteMeta.downloadUrl || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/update-bundle.zip`;

      const applied = await this._downloadAndApplyPatch(downloadUrl, remoteMeta);
      this.isUpdating = false;
      this.lastCheckStatus = applied ? 'applied' : 'failed';
      return { 
        updated: applied, 
        version: remoteMeta.version, 
        buildNumber: remoteBuild, 
        message: applied ? `성공적으로 v${remoteMeta.version} (#${remoteBuild}) 핫패치를 적용했습니다!` : '핫패치 적용 실패' 
      };
    } catch (err) {
      console.error('[HotPatcher] Error checking/applying hotpatch:', err.message);
      this.isUpdating = false;
      this.lastCheckStatus = 'error';
      return { updated: false, error: err.message, message: `업데이트 검사 중 오류: ${err.message}` };
    }
  }

  async _downloadAndApplyPatch(url, meta) {
    const tempZip = path.join(app.getPath('temp'), `vlstudio_hotpatch_${Date.now()}.zip`);
    const tempExtract = path.join(app.getPath('temp'), `vlstudio_extracted_${Date.now()}`);

    try {
      console.log(`[HotPatcher] Downloading patch from ${url}...`);
      await this._downloadFile(url, tempZip);

      // Verify SHA-256 if provided
      if (meta.sha256) {
        const fileBuffer = fs.readFileSync(tempZip);
        const calcHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        if (calcHash.toLowerCase() !== meta.sha256.toLowerCase()) {
          throw new Error(`SHA-256 checksum mismatch! Expected: ${meta.sha256}, Got: ${calcHash}`);
        }
        console.log('[HotPatcher] SHA-256 checksum verified successfully.');
      }

      // Extract to temp folder first
      const zip = new AdmZip(tempZip);
      zip.extractAllTo(tempExtract, true);

      // Ensure index.html exists in extracted files
      const extractedIndex = path.join(tempExtract, 'index.html');
      if (!fs.existsSync(extractedIndex)) {
        throw new Error('Invalid bundle: index.html not found in archive root.');
      }

      // Atomically replace hotpatch_bundle
      const targetDir = this.getHotpatchDir();
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      this._copyDirSync(tempExtract, targetDir);
      fs.writeFileSync(this.getMetaPath(), JSON.stringify(meta, null, 2), 'utf8');

      console.log(`✨ [HotPatcher] Successfully applied Hot-Patch v${meta.version} (#${meta.buildNumber})!`);
      this.updateAvailable = true;
      return true;
    } finally {
      try { if (fs.existsSync(tempZip)) fs.unlinkSync(tempZip); } catch {}
      try { if (fs.existsSync(tempExtract)) fs.rmSync(tempExtract, { recursive: true, force: true }); } catch {}
    }
  }

  _fetchJson(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.get(url, { headers: { 'User-Agent': 'ViraLoopStudio-HotPatcher' }, timeout: 4000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return resolve(this._fetchJson(res.headers.location));
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    });
  }

  _downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);
      const req = client.get(url, { headers: { 'User-Agent': 'ViraLoopStudio-HotPatcher' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          return resolve(this._downloadFile(res.headers.location, destPath));
        }
        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`Download failed with status: ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      });
      req.on('error', (err) => {
        try { fs.unlinkSync(destPath); } catch {}
        reject(err);
      });
    });
  }

  _compareSemver(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      const na = pa[i] || 0;
      const nb = pb[i] || 0;
      if (na > nb) return 1;
      if (na < nb) return -1;
    }
    return 0;
  }

  _copyDirSync(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this._copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}

export const hotPatcher = new HotPatcher();

/**
 * Register Hot-Patch & App Version IPC handlers
 */
export function registerHotpatchIPC(ipcMain, getMainWindow, buildNumber = 1042) {
  ipcMain.handle('hotpatch:get-status', async () => {
    return hotPatcher.getStatus(app.getVersion(), buildNumber);
  });

  ipcMain.handle('hotpatch:check-update', async () => {
    return await hotPatcher.checkForUpdate(app.getVersion(), buildNumber);
  });

  ipcMain.handle('hotpatch:clear-cache', async () => {
    return hotPatcher.clearCache();
  });

  ipcMain.handle('hotpatch:reload', async () => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (win && win.webContents) {
      win.webContents.reload();
      return { success: true };
    }
    return { success: false, error: 'Main window not available' };
  });
}

