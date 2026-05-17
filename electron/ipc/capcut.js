/**
 * Electron IPC Handler - CapCut Project File Operations
 *
 * Handles detecting CapCut installation paths, scanning project folders,
 * writing complete CapCut project structures, and launching the CapCut app.
 *
 * CapCut project folder structure:
 * {basePath}/
 * └── {number}/              (e.g., 0130)
 *     ├── draft_info.json     (main project data)
 *     ├── draft_meta_info.json (metadata)
 *     └── media/
 *         ├── scene_001.png
 *         ├── scene_002.png
 *         └── subtitles.srt
 */

import fs from 'fs/promises'
import path from 'path'
import { exec } from 'child_process'
import os from 'os'
import { dialog } from 'electron'

// ============================================================
// Helper Functions
// ============================================================

/**
 * Check whether a path exists on disk.
 */
async function pathExists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Strip the data: URL prefix from base64 data and convert to a Buffer.
 * Handles both raw base64 and data URL formatted strings.
 */
function base64ToBuffer(base64Data) {
  const clean = base64Data.replace(/^data:[^;]+;base64,/, '')
  return Buffer.from(clean, 'base64')
}

/**
 * Execute a shell command and return a promise.
 */
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

/**
 * Get candidate CapCut project base paths for the current platform.
 * Returns an array of paths to check, in priority order.
 */
function getCapcutCandidatePaths() {
  const platform = process.platform
  const home = os.homedir()

  if (platform === 'darwin') {
    return [
      path.join(home, 'Movies', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Movies', 'CapCutPro', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    ]
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local')
    return [
      path.join(localAppData, 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(localAppData, 'CapCutPro', 'User Data', 'Projects', 'com.lveditor.draft'),
      path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
    ]
  }

  // Linux or other — try common paths
  return [
    path.join(home, 'Documents', 'CapCut', 'User Data', 'Projects', 'com.lveditor.draft'),
  ]
}

/**
 * Get CapCut application paths for the current platform.
 * Used by both check-installed and open-app handlers.
 */
function getCapcutAppPaths() {
  const platform = process.platform

  if (platform === 'darwin') {
    return [
      '/Applications/CapCut.app',
      '/Applications/CapCut Pro.app',
    ]
  } else if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

    return [
      path.join(localAppData, 'CapCut', 'Apps', 'CapCut.exe'),
      path.join(localAppData, 'Programs', 'CapCut', 'CapCut.exe'),
      path.join(programFiles, 'CapCut', 'CapCut.exe'),
      path.join(programFilesX86, 'CapCut', 'CapCut.exe'),
    ]
  }

  return []
}

// ============================================================
// IPC Registration
// ============================================================

/**
 * Register all CapCut-related IPC handlers on the given ipcMain instance.
 */
export function registerCapcutIPC(ipcMain) {

  // ----------------------------------------------------------
  // 1. capcut:detect-path
  //
  // Auto-detect the CapCut projects base path.
  // Checks platform-specific candidate paths and returns the
  // first one that exists on disk.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:detect-path', async () => {
    try {
      const candidates = getCapcutCandidatePaths()

      for (const candidatePath of candidates) {
        if (await pathExists(candidatePath)) {
          return { success: true, basePath: candidatePath, exists: true }
        }
      }

      // No path found — return the primary candidate for the platform
      return { success: true, basePath: candidates[0], exists: false }
    } catch (error) {
      return { success: false, basePath: null, exists: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 1.5. capcut:check-installed
  //
  // Check if CapCut application is installed on the system.
  // Checks app executable paths (not project folders).
  // ----------------------------------------------------------
  ipcMain.handle('capcut:check-installed', async () => {
    try {
      const appPaths = getCapcutAppPaths()

      for (const appPath of appPaths) {
        if (await pathExists(appPath)) {
          return { installed: true }
        }
      }

      return { installed: false }
    } catch (error) {
      console.warn('[capcut:check-installed] Error:', error.message)
      // On error, don't block the user
      return { installed: true }
    }
  })

  // ----------------------------------------------------------
  // 2. capcut:next-number
  //
  // Scan existing project folders in basePath and return the
  // next available project number (max + 1), zero-padded to
  // 4 digits. CapCut folders are typically named like 0128, 0129.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:next-number', async (_event, { basePath }) => {
    try {
      if (!(await pathExists(basePath))) {
        return { success: true, number: 1, folderName: '0001' }
      }

      const entries = await fs.readdir(basePath, { withFileTypes: true })
      let maxNumber = 0

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        // Match directories that are purely numeric
        const match = entry.name.match(/^(\d+)$/)
        if (match) {
          const num = parseInt(match[1], 10)
          if (num > maxNumber) {
            maxNumber = num
          }
        }
      }

      const nextNumber = maxNumber + 1
      const folderName = String(nextNumber).padStart(4, '0')

      return { success: true, number: nextNumber, folderName }
    } catch (error) {
      return { success: false, number: null, folderName: null, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 3. capcut:write-project
  //
  // Write a complete CapCut project folder structure.
  // Creates the directory, writes draft_info.json,
  // draft_meta_info.json, media files, and SRT files.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:write-project', async (_event, {
    targetPath, draftInfo, draftMetaInfo, timelineLayout, extraFiles = {}, mediaFiles = [], srtContent = null, srtFilename = 'subtitles.srt'
  }) => {
    try {
      // Create project directory and standard subfolders
      console.log(`[CapCut IPC] Creating project structure at: ${targetPath}`);
      await fs.mkdir(targetPath, { recursive: true });
      
      const subfolders = [
        'adjust_mask',
        'common_attachment',
        'matting',
        'qr_upload',
        'Resources',
        'Resources/audioAlg',
        'Resources/digitalHuman',
        'Resources/videoAlg',
        'smart_crop',
        'subdraft',
        'Thumbnail'
      ];

      for (const sub of subfolders) {
        await fs.mkdir(path.join(targetPath, sub), { recursive: true });
      }

      // Meticulously clone actual local platform details to ensure strict OS/app compatibility
      try {
        const parentDir = path.dirname(targetPath);
        const entries = await fs.readdir(parentDir, { withFileTypes: true });
        let realPlatform = null;
        let realLastModified = null;
        let realVersion = null;
        let realNewVersion = null;

        for (const entry of entries) {
          if (entry.isDirectory() && entry.name !== path.basename(targetPath) && /^\d+$/.test(entry.name)) {
            const contentPath = path.join(parentDir, entry.name, 'draft_content.json');
            if (await pathExists(contentPath)) {
              console.log(`[CapCut IPC] Found existing project ${entry.name} to extract platform metadata.`);
              const existingContent = JSON.parse(await fs.readFile(contentPath, 'utf-8'));
              if (existingContent.platform) {
                realPlatform = existingContent.platform;
                realLastModified = existingContent.last_modified_platform || existingContent.platform;
                realVersion = existingContent.version;
                realNewVersion = existingContent.new_version;
                break;
              }
            }
          }
        }

        if (realPlatform) {
          console.log(`[CapCut IPC] Cloning local platform metadata: ${realPlatform.app_version}, version: ${realVersion}, new_version: ${realNewVersion}`);
          if (draftInfo && typeof draftInfo === 'object') {
            draftInfo.platform = realPlatform;
            draftInfo.last_modified_platform = realLastModified;
            if (realVersion) draftInfo.version = realVersion;
            if (realNewVersion) draftInfo.new_version = realNewVersion;
          }
          if (extraFiles) {
            if (extraFiles['template-2.tmp'] && typeof extraFiles['template-2.tmp'] === 'object') {
              extraFiles['template-2.tmp'].platform = realPlatform;
              extraFiles['template-2.tmp'].last_modified_platform = realLastModified;
              if (realVersion) extraFiles['template-2.tmp'].version = realVersion;
              if (realNewVersion) extraFiles['template-2.tmp'].new_version = realNewVersion;
            }
            if (extraFiles['draft_content.json.bak'] && typeof extraFiles['draft_content.json.bak'] === 'object') {
              extraFiles['draft_content.json.bak'].platform = realPlatform;
              extraFiles['draft_content.json.bak'].last_modified_platform = realLastModified;
              if (realVersion) extraFiles['draft_content.json.bak'].version = realVersion;
              if (realNewVersion) extraFiles['draft_content.json.bak'].new_version = realNewVersion;
            }
          }
        }
      } catch (err) {
        console.warn('[CapCut IPC] Could not dynamically extract platform binding details:', err.message);
      }

      // Write draft_content.json (main project data)
      console.log(`[CapCut IPC] Writing draft_content.json`);
      const draftInfoContent = typeof draftInfo === 'string'
        ? draftInfo
        : JSON.stringify(draftInfo, null, 2)
      await fs.writeFile(path.join(targetPath, 'draft_content.json'), draftInfoContent, 'utf-8')

      // Write draft_meta_info.json (metadata)
      console.log(`[CapCut IPC] Writing draft_meta_info.json`);
      const draftMetaInfoContent = typeof draftMetaInfo === 'string'
        ? draftMetaInfo
        : JSON.stringify(draftMetaInfo, null, 2)
      await fs.writeFile(path.join(targetPath, 'draft_meta_info.json'), draftMetaInfoContent, 'utf-8')

      // Meticulously register/update this draft inside root_meta_info.json to ensure CapCut opens it instantly
      try {
        const parentDir = path.dirname(targetPath);
        const rootMetaPath = path.join(parentDir, 'root_meta_info.json');
        if (await pathExists(rootMetaPath)) {
          console.log('[CapCut IPC] Updating root_meta_info.json to bind UUID and enable project launch...');
          const rootMeta = JSON.parse(await fs.readFile(rootMetaPath, 'utf-8'));
          
          if (rootMeta && Array.isArray(rootMeta.all_draft_store)) {
            const folderName = path.basename(targetPath);
            const normalizedFoldPath = targetPath.replace(/\\/g, '/');
            const normalizedRootPath = parentDir.replace(/\\/g, '/');
            
            // Format paths with backslashes for the file part to match CapCut's native format perfectly
            const coverPath = `${normalizedRootPath}/${folderName}\\draft_cover.jpg`;
            const jsonPath = `${normalizedRootPath}/${folderName}\\draft_content.json`;

            // Extract the real parsed draftInfo object
            const parsedDraftInfo = typeof draftInfo === 'string' ? JSON.parse(draftInfo) : draftInfo;

            const newEntry = {
              cloud_draft_cover: false,
              cloud_draft_sync: false,
              draft_cloud_last_action_download: false,
              draft_cloud_purchase_info: "",
              draft_cloud_template_id: "",
              draft_cloud_tutorial_info: "",
              draft_cloud_videocut_purchase_info: "",
              draft_cover: coverPath,
              draft_fold_path: normalizedFoldPath,
              draft_id: parsedDraftInfo.id,
              draft_is_ai_shorts: false,
              draft_is_cloud_temp_draft: false,
              draft_is_invisible: false,
              draft_is_web_article_video: false,
              draft_json_file: jsonPath,
              draft_name: folderName,
              draft_new_version: "",
              draft_root_path: normalizedRootPath,
              draft_timeline_materials_size: 100000,
              draft_type: "",
              draft_web_article_video_enter_from: "",
              streaming_edit_draft_ready: true,
              tm_draft_cloud_completed: "",
              tm_draft_cloud_entry_id: -1,
              tm_draft_cloud_modified: 0,
              tm_draft_cloud_parent_entry_id: -1,
              tm_draft_cloud_space_id: -1,
              tm_draft_cloud_user_id: -1,
              tm_draft_create: Date.now() * 1000,
              tm_draft_modified: Date.now() * 1000,
              tm_draft_removed: 0,
              tm_duration: parsedDraftInfo.duration || 0
            };

            const existingIndex = rootMeta.all_draft_store.findIndex(
              item => item.draft_fold_path.toLowerCase() === normalizedFoldPath.toLowerCase()
            );

            if (existingIndex !== -1) {
              console.log(`[CapCut IPC] Updating existing draft entry in root_meta_info.json at index ${existingIndex}`);
              newEntry.tm_draft_create = rootMeta.all_draft_store[existingIndex].tm_draft_create || newEntry.tm_draft_create;
              rootMeta.all_draft_store[existingIndex] = newEntry;
            } else {
              console.log('[CapCut IPC] Appending new draft entry to root_meta_info.json');
              rootMeta.all_draft_store.push(newEntry);
            }

            await fs.writeFile(rootMetaPath, JSON.stringify(rootMeta, null, 2), 'utf-8');
            console.log('[CapCut IPC] root_meta_info.json successfully written and synchronized!');
          }
        } else {
          console.warn('[CapCut IPC] root_meta_info.json was not found in parent directory.');
        }
      } catch (metaErr) {
        console.error('[CapCut IPC] Failed to update root_meta_info.json:', metaErr.message);
      }

      // Write timeline_layout.json (layout info)
      if (timelineLayout) {
        console.log(`[CapCut IPC] Writing timeline_layout.json`);
        const layoutContent = typeof timelineLayout === 'string'
          ? timelineLayout
          : JSON.stringify(timelineLayout, null, 2)
        await fs.writeFile(path.join(targetPath, 'timeline_layout.json'), layoutContent, 'utf-8')
      }

      // Write extra boilerplate files (draft_settings, biz_config, etc.)
      for (const [filename, content] of Object.entries(extraFiles)) {
        console.log(`[CapCut IPC] Writing extra file: ${filename}`);
        const fileContent = typeof content === 'string'
          ? content
          : JSON.stringify(content, null, 2)
        await fs.writeFile(path.join(targetPath, filename), fileContent, 'utf-8')
      }

      // Copy/Write media files if provided
      if (mediaFiles && Array.isArray(mediaFiles)) {
        console.log(`[CapCut IPC] Processing ${mediaFiles.length} media files`);
        for (const media of mediaFiles) {
          try {
            const destPath = path.join(targetPath, media.targetName)
            if (media.isBase64 && media.source) {
              console.log(`[CapCut IPC] Saving base64 image as: ${media.targetName}`);
              const base64Data = media.source.replace(/^data:image\/[^;]+;base64,/, '')
              await fs.writeFile(destPath, Buffer.from(base64Data, 'base64'))
              
              // Also create a draft_cover.jpg from the first image
              if (media.targetName.includes('_1.')) {
                console.log(`[CapCut IPC] Saving draft_cover.jpg`);
                await fs.writeFile(path.join(targetPath, 'draft_cover.jpg'), Buffer.from(base64Data, 'base64'))
              }
            } else if (media.source && await pathExists(media.source)) {
              console.log(`[CapCut IPC] Copying local file: ${media.source} -> ${media.targetName}`);
              await fs.copyFile(media.source, destPath)

              // Also create a draft_cover.jpg from the first image
              if (media.targetName.includes('_1.')) {
                console.log(`[CapCut IPC] Copying draft_cover.jpg`);
                await fs.copyFile(media.source, path.join(targetPath, 'draft_cover.jpg'))
              }
            } else {
              console.warn(`[CapCut IPC] Skipping media (not found): ${media.source}`);
            }
          } catch (mediaError) {
            console.error(`[CapCut IPC] Failed to handle media ${media.targetName}:`, mediaError)
          }
        }
      }

      // Write SRT file if provided
      if (srtContent) {
        console.log(`[CapCut IPC] Writing SRT file: ${srtFilename}`);
        await fs.writeFile(path.join(targetPath, srtFilename), srtContent, 'utf-8')
      }

      return { success: true, targetPath, fileCount: 4 + (timelineLayout ? 1 : 0) + Object.keys(extraFiles).length + (srtContent ? 1 : 0) }
    } catch (error) {
      return { success: false, targetPath, fileCount: 0, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 3.5. capcut:write-srt-to-workfolder
  //
  // Write SRT file to the work folder and return its absolute path.
  // Used by desktop absolute-path mode to avoid media/ subfolder.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:write-srt-to-workfolder', async (_event, {
    workFolder, filename, content
  }) => {
    try {
      await fs.mkdir(workFolder, { recursive: true })
      const filePath = path.join(workFolder, filename)
      await fs.writeFile(filePath, content, 'utf-8')
      return { success: true, filePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 4. capcut:open-app
  //
  // Launch the CapCut application.
  // macOS: Uses `open -a` command
  // Windows: Searches typical install locations
  // ----------------------------------------------------------
  ipcMain.handle('capcut:open-app', async () => {
    try {
      const platform = process.platform

      if (platform === 'darwin') {
        // macOS: Try known CapCut app names
        const appNames = ['CapCut', 'CapCut Pro']
        let launched = false

        for (const appName of appNames) {
          try {
            await execPromise(`open -a "${appName}"`)
            launched = true
            break
          } catch {
            // App not found with this name, try next
          }
        }

        if (!launched) {
          // Try to find CapCut in /Applications directly
          const appPaths = [
            '/Applications/CapCut.app',
            '/Applications/CapCut Pro.app',
          ]

          for (const appPath of appPaths) {
            if (await pathExists(appPath)) {
              await execPromise(`open "${appPath}"`)
              launched = true
              break
            }
          }
        }

        if (!launched) {
          return { success: false, error: 'CapCut application not found on this Mac' }
        }

        return { success: true }

      } else if (platform === 'win32') {
        // Windows: Search typical install locations
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files'
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'

        const exePaths = [
          path.join(localAppData, 'CapCut', 'Apps', 'CapCut.exe'),
          path.join(localAppData, 'Programs', 'CapCut', 'CapCut.exe'),
          path.join(programFiles, 'CapCut', 'CapCut.exe'),
          path.join(programFilesX86, 'CapCut', 'CapCut.exe'),
        ]

        // 1. Check typical static locations
        for (const exePath of exePaths) {
          if (await pathExists(exePath)) {
            exec(`start "" "${exePath}"`)
            return { success: true }
          }
        }

        // 2. Perform deep dynamic scan inside LOCALAPPDATA/CapCut/Apps/ for versioned folders (e.g. Apps/3.8.0.x/CapCut.exe)
        try {
          const appsDir = path.join(localAppData, 'CapCut', 'Apps')
          if (await pathExists(appsDir)) {
            const entries = await fs.readdir(appsDir, { withFileTypes: true })
            for (const entry of entries) {
              if (entry.isDirectory()) {
                const nestedExe = path.join(appsDir, entry.name, 'CapCut.exe')
                if (await pathExists(nestedExe)) {
                  console.log(`[CapCut IPC] Found CapCut inside version subfolder: ${entry.name}`);
                  exec(`start "" "${nestedExe}"`)
                  return { success: true }
                }
              }
            }
          }
        } catch (scanError) {
          console.warn('[CapCut IPC] Dynamic version lookup search failed:', scanError.message)
        }

        return { success: false, error: 'CapCut application not found on this PC' }

      } else {
        return { success: false, error: `Unsupported platform: ${platform}` }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 5. capcut:get-system-info
  //
  // Return system username, platform, and home directory.
  // Used by ExportModal to auto-fill username and detect OS.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:get-system-info', async () => {
    try {
      return {
        success: true,
        username: os.userInfo().username,
        platform: process.platform,  // 'darwin' | 'win32' | 'linux'
        homedir: os.homedir()
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 6. capcut:save-srt-file
  //
  // Save an SRT subtitle file via native save dialog.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:save-srt-file', async (_event, { filename, content }) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [
          { name: 'SRT Subtitle', extensions: ['srt'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'cancelled' }
      }

      await fs.writeFile(result.filePath, content, 'utf-8')
      return { success: true, filePath: result.filePath }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // ----------------------------------------------------------
  // 8. capcut:get-volume-path
  //
  // macOS: Get the root volume mount path (e.g., /Volumes/Macintosh HD)
  // CapCut requires volume-prefixed paths for uncached file resolution.
  // ----------------------------------------------------------
  ipcMain.handle('capcut:get-volume-path', async () => {
    try {
      if (process.platform !== 'darwin') {
        return { success: true, volumePath: '' }
      }
      const { stdout } = await execPromise('diskutil info / | grep "Volume Name"')
      const match = stdout.match(/Volume Name:\s+(.+)/)
      const volumeName = match ? match[1].trim() : 'Macintosh HD'
      return { success: true, volumePath: `/Volumes/${volumeName}` }
    } catch {
      return { success: true, volumePath: '/Volumes/Macintosh HD' }
    }
  })
}
