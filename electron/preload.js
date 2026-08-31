import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // App
  openExternal: (url) => ipcRenderer.invoke('app:open-external', { url }),
  showInFolder: (filePath) => ipcRenderer.invoke('app:show-in-folder', { filePath }),
  notifyOS: () => ({ success: true }),

  // Layout
  setLayout: (params) => ipcRenderer.invoke('app:set-layout', params),
  updateSplit: (params) => ipcRenderer.invoke('app:update-split', params),
  flowDragStart: () => ({ success: true }),
  flowDragEnd: () => ({ success: true }),
  getLayout: () => ipcRenderer.invoke('app:get-layout'),
  onLayoutChanged: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('layout-changed', handler)
    return () => ipcRenderer.removeListener('layout-changed', handler)
  },
  setModalVisible: (params) => ipcRenderer.invoke('app:set-modal-visible', params),
  setFlowTabActive: (params) => ipcRenderer.invoke('app:set-flow-tab-active', params),
  setLocale: (params) => ipcRenderer.invoke('app:set-locale', params),
  setFlowAgentMode: (params) => ipcRenderer.invoke('flow:set-agent-mode', params),

  // Native menu (File → New Project / Recent Projects)
  onMenuAction: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('menu:action', handler)
    return () => ipcRenderer.removeListener('menu:action', handler)
  },
  notifyProjectActivated: (name, workFolder) => ipcRenderer.invoke('app:project-activated', { name, workFolder }),

  // Multi-Profile & Multi-Window API (Electron 네이티브 다중창 제어)
  loadProfiles: () => ipcRenderer.invoke('profiles:load'),
  saveProfiles: (params) => ipcRenderer.invoke('profiles:save', params),
  switchProfile: (params) => ipcRenderer.invoke('profiles:switch', params),
  createProfile: (params) => ipcRenderer.invoke('profiles:create', params),
  deleteProfile: (params) => ipcRenderer.invoke('profiles:delete', params),
  updateProfile: (params) => ipcRenderer.invoke('profiles:update', params),
  createFlowView: (params) => ipcRenderer.invoke('flow:create-view', params),
  destroyFlowView: (params) => ipcRenderer.invoke('flow:destroy-view', params),
  focusFlowView: (params) => ipcRenderer.invoke('flow:focus-view', params),
  clearFlowSession: () => ipcRenderer.invoke('flow:clear-session'),
  reloadFlowView: (params) => ipcRenderer.invoke('flow:reload-view', params),
  navigateFlowHome: (params) => ipcRenderer.invoke('flow:navigate-home', params),

  // File System
  getDefaultWorkFolder: () => ipcRenderer.invoke('fs:get-default-work-folder'),
  getSavedWorkFolder: () => ipcRenderer.invoke('fs:get-saved-work-folder'),
  saveWorkFolder: (params) => ipcRenderer.invoke('fs:save-work-folder', params),
  selectWorkFolder: () => ipcRenderer.invoke('fs:select-work-folder'),
  selectImageFile: () => ipcRenderer.invoke('fs:select-image-file'),
  selectVideoFile: () => ipcRenderer.invoke('fs:select-video-file'),
  checkFolderExists: (params) => ipcRenderer.invoke('fs:check-folder-exists', params),
  listProjects: (params) => ipcRenderer.invoke('fs:list-projects', params),
  getProjectFolder: (params) => ipcRenderer.invoke('fs:get-project-folder', params),
  getResourceFolder: (params) => ipcRenderer.invoke('fs:get-resource-folder', params),
  saveResource: (params) => ipcRenderer.invoke('fs:save-resource', params),
  readResource: (params) => ipcRenderer.invoke('fs:read-resource', params),
  getResourcePath: (params) => ipcRenderer.invoke('fs:get-resource-path', params),
  readFileByPath: (params) => ipcRenderer.invoke('fs:read-file-by-path', params),
  saveProjectData: (params) => ipcRenderer.invoke('fs:save-project-data', params),
  mergeProjectData: (params) => ipcRenderer.invoke('fs:merge-project-data', params),
  loadProjectData: (params) => ipcRenderer.invoke('fs:load-project-data', params),
  projectExists: (params) => ipcRenderer.invoke('fs:project-exists', params),
  renameProject: (params) => ipcRenderer.invoke('fs:rename-project', params),
  duplicateProject: (params) => ipcRenderer.invoke('fs:duplicate-project', params),
  deleteProject: (params) => ipcRenderer.invoke('fs:delete-project', params),
  getHistory: (params) => ipcRenderer.invoke('fs:get-history', params),
  readHistoryFile: (params) => ipcRenderer.invoke('fs:read-history-file', params),
  readHistoryMetadata: (params) => ipcRenderer.invoke('fs:read-history-metadata', params),
  restoreFromHistory: (params) => ipcRenderer.invoke('fs:restore-from-history', params),
  saveToHistory: (params) => ipcRenderer.invoke('fs:save-to-history', params),
  deleteHistory: (params) => ipcRenderer.invoke('fs:delete-history', params),
  saveStyleThumbnail: (params) => ipcRenderer.invoke('fs:save-style-thumbnail', params),
  loadStyleThumbnails: () => ipcRenderer.invoke('fs:load-style-thumbnails'),
  checkStyleThumbnails: () => ipcRenderer.invoke('fs:check-style-thumbnails'),
  deleteStyleThumbnail: (params) => ipcRenderer.invoke('fs:delete-style-thumbnail', params),
  scanAudioPackage: () => ipcRenderer.invoke('fs:scan-audio-package'),
  rescanAudioPackage: (params) => ipcRenderer.invoke('fs:rescan-audio-package', params),
  probeAudioFile: (params) => ipcRenderer.invoke('fs:probe-audio-file', params),
  copyDroppedAudio: (params) => ipcRenderer.invoke('fs:copy-dropped-audio', params),
  getPathForFile: (file) => file?.path || file?.name || '',
  readFileAbsolute: (params) => ipcRenderer.invoke('fs:read-file-absolute', params),
  writeFileAbsolute: (params) => ipcRenderer.invoke('fs:write-file-absolute', params),

  // CapCut
  detectCapcutPath: () => ipcRenderer.invoke('capcut:detect-path'),
  checkCapcutInstalled: () => ipcRenderer.invoke('capcut:check-installed'),
  getNextProjectNumber: (params) => ipcRenderer.invoke('capcut:next-number', params),
  writeCapcutProject: (params) => ipcRenderer.invoke('capcut:write-project', params),
  writeSrtToWorkFolder: (params) => ipcRenderer.invoke('capcut:write-srt-to-workfolder', params),
  openCapcut: (projectPath) => ipcRenderer.invoke('capcut:open-app', { projectPath }),
  saveSrtFile: (params) => ipcRenderer.invoke('capcut:save-srt-file', params),
  getSystemInfo: () => ipcRenderer.invoke('capcut:get-system-info'),
  getVolumePath: () => ipcRenderer.invoke('capcut:get-volume-path'),

  // Premiere (.prproj — gzipped XML)
  writePremiereProject: (params) => ipcRenderer.invoke('premiere:write-project', params),
  checkPremiereInstalled: () => ipcRenderer.invoke('premiere:check-installed'),
  openPremiereProject: (params) => ipcRenderer.invoke('premiere:open-project', params),

  // Vrew (.vrew — ZIP archive)
  writeVrewProject: (params) => ipcRenderer.invoke('vrew:write-project', params),
  openVrewProject: (params) => ipcRenderer.invoke('vrew:open-project', params),
  checkVrewInstalled: () => ipcRenderer.invoke('vrew:check-installed'),

  // MCP (Claude Code integration)
  mcpStatus: () => ipcRenderer.invoke('mcp:status'),
  mcpRegister: () => ipcRenderer.invoke('mcp:register'),
  mcpUnregister: () => ipcRenderer.invoke('mcp:unregister'),
  skillsList: () => ipcRenderer.invoke('skills:list'),
  skillsInstall: (params) => ipcRenderer.invoke('skills:install', params),
  skillsUninstall: (params) => ipcRenderer.invoke('skills:uninstall', params),
  startMcpHttp: (params) => ipcRenderer.invoke('mcp:start-http', params),
  stopMcpHttp: () => ipcRenderer.invoke('mcp:stop-http'),
  onMcpUpdate: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('mcp-update', handler)
    return () => ipcRenderer.removeListener('mcp-update', handler)
  },

  // Auth
  googleSignIn: () => ipcRenderer.invoke('auth:google-sign-in'),
  googleSignOut: () => ipcRenderer.invoke('auth:google-sign-out'),

  // Power Save
  setPreventSleep: (params) => ipcRenderer.invoke('app:set-prevent-sleep', params),
  getPreventSleep: () => ipcRenderer.invoke('app:get-prevent-sleep'),

  // GenAI official API
  genaiSaveKey: (params) => ipcRenderer.invoke('genai:save-key', params),
  genaiHasKey: () => ipcRenderer.invoke('genai:has-key'),
  genaiDeleteKey: () => ipcRenderer.invoke('genai:delete-key'),
  genaiVerifyKey: (params) => ipcRenderer.invoke('genai:verify-key', params),
  genaiGenerateImage: (params) => ipcRenderer.invoke('genai:generate-image', params),
  genaiGenerateVideo: (params) => ipcRenderer.invoke('genai:generate-video', params),
  genaiPollVideo: (params) => ipcRenderer.invoke('genai:poll-video', params),

  // Story Pipeline API
  storyOpen: (params) => ipcRenderer.invoke('story:open', params),
  storyStart: (params) => ipcRenderer.invoke('story:start', params),
  storyAbort: () => ipcRenderer.invoke('story:abort'),
  storyPushAck: (params) => ipcRenderer.invoke('story:push-ack', params),
  storyGenerateTitle: (params) => ipcRenderer.invoke('story:generate-title', params),
  storyGenerateSynopsis: (params) => ipcRenderer.invoke('story:generate-synopsis', params),
  storyReviewSynopsis: (params) => ipcRenderer.invoke('story:review-synopsis', params),
  storyConfirmSynopsis: (params) => ipcRenderer.invoke('story:confirm-synopsis', params),
  storyTtsPreview: (params) => ipcRenderer.invoke('story:tts-preview', params),
  storyAudioPreflight: (params) => ipcRenderer.invoke('story:audio-preflight', params),
  storyLoadAudioPackage: (params) => ipcRenderer.invoke('story:load-audio-package', params),
  storyPickAudioImportFile: (params) => ipcRenderer.invoke('story:pick-audio-import-file', params),
  storyResearchSearch: (params) => ipcRenderer.invoke('story:research-search', params),
  storyResearchFetch: (params) => ipcRenderer.invoke('story:research-fetch', params),
  storyResearchAnalyze: (params) => ipcRenderer.invoke('story:research-analyze', params),
  storyResearchFactCheck: (params) => ipcRenderer.invoke('story:research-factcheck', params),
  storyResearchCommit: (params) => ipcRenderer.invoke('story:research-commit', params),
  storyResearchSkip: () => ipcRenderer.invoke('story:research-skip'),
  storyResearchSelect: (params) => ipcRenderer.invoke('story:research-select', params),
  storyResearchVideoDetails: (params) => ipcRenderer.invoke('story:research-video-details', params),
  onStoryEvent: (callback) => {
    const handler = (_, data) => callback(data)
    ipcRenderer.on('story:event', handler)
    return () => ipcRenderer.removeListener('story:event', handler)
  },

  // TTS & SFX
  ttsListVoices: (params) => ipcRenderer.invoke('tts:list-voices', params),
  ttsPreviewVoice: (params) => ipcRenderer.invoke('tts:preview-voice', params),
  ttsTagVoiceGender: (params) => ipcRenderer.invoke('tts:tag-voice-gender', params),
  ttsSaveKey: (params) => ipcRenderer.invoke('keys:set', { provider: 'typecast', ...params }),
  ttsHasKey: (params) => ipcRenderer.invoke('keys:status', { provider: 'typecast', ...params }),
  ttsDeleteKey: (params) => ipcRenderer.invoke('keys:delete', { provider: 'typecast', ...params }),

  // Mode controller
  setMode: (params) => ipcRenderer.invoke('mode:set', params),

  // Flow DOM automation bridges (Flow mode)
  domNavigate: (params) => ipcRenderer.invoke('flow:dom-navigate', params),
  domGetUrl: () => ipcRenderer.invoke('flow:dom-get-url'),
  domClickEnterTool: (params) => ipcRenderer.invoke('flow:dom-click-enter-tool', params),
  domSendPrompt: (params) => ipcRenderer.invoke('flow:dom-send-prompt', params),
  domSnapshotBlobs: () => ipcRenderer.invoke('flow:dom-snapshot-blobs'),
  domScanImages: (params) => ipcRenderer.invoke('flow:dom-scan-images', params),
  domBlobToBase64: (params) => ipcRenderer.invoke('flow:dom-blob-to-base64', params),
  domShowFlow: () => ipcRenderer.invoke('flow:dom-show-flow'),

  flowExtractToken: () => ipcRenderer.invoke('flow:extract-token'),
  extractToken: () => ipcRenderer.invoke('flow:extract-token'),
  flowValidateToken: (payload) => ipcRenderer.invoke('flow:validate-token', payload),
  validateToken: (payload) => ipcRenderer.invoke('flow:validate-token', payload),
  flowExtractProjectId: (opts) => ipcRenderer.invoke('flow:extract-project-id', opts),
  extractProjectId: (opts) => ipcRenderer.invoke('flow:extract-project-id', opts),
  flowGenerateImage: (payload) => ipcRenderer.invoke('flow:generate-image', payload),
  generateImage: (payload) => ipcRenderer.invoke('flow:generate-image', payload),
  flowCheckGeneration: (payload) => ipcRenderer.invoke('flow:check-generation', payload),
  checkGeneration: (payload) => ipcRenderer.invoke('flow:check-generation', payload),
  flowCollectGeneration: (payload) => ipcRenderer.invoke('flow:collect-generation', payload),
  collectGeneration: (payload) => ipcRenderer.invoke('flow:collect-generation', payload),
  flowClearGenerations: () => ipcRenderer.invoke('flow:clear-generations'),
  clearGenerations: () => ipcRenderer.invoke('flow:clear-generations'),
  flowUploadReference: (payload) => ipcRenderer.invoke('flow:upload-reference', payload),
  uploadReference: (payload) => ipcRenderer.invoke('flow:upload-reference', payload),
  flowGenerateCharacter: (payload) => ipcRenderer.invoke('flow:generate-character', payload),
  flowRerollCharacter: (payload) => ipcRenderer.invoke('flow:reroll-character', payload),
  flowUploadCharacterEntity: (payload) => ipcRenderer.invoke('flow:upload-character-entity', payload),
  flowFetchMedia: (payload) => ipcRenderer.invoke('flow:fetch-media', payload),
  fetchMedia: (payload) => ipcRenderer.invoke('flow:fetch-media', payload),
  flowGenerateVideoT2V: (payload) => ipcRenderer.invoke('flow:generate-video-t2v', payload),
  generateVideoT2V: (payload) => ipcRenderer.invoke('flow:generate-video-t2v', payload),
  flowGenerateVideoI2V: (payload) => ipcRenderer.invoke('flow:generate-video-i2v', payload),
  generateVideoI2V: (payload) => ipcRenderer.invoke('flow:generate-video-i2v', payload),
  flowCheckVideoStatus: (payload) => ipcRenderer.invoke('flow:check-video-status', payload),
  checkVideoStatus: (payload) => ipcRenderer.invoke('flow:check-video-status', payload),
  flowDownloadVideoUrl: (payload) => ipcRenderer.invoke('flow:download-video-url', payload),
  downloadVideoUrl: (payload) => ipcRenderer.invoke('flow:download-video-url', payload),
  flowDomDownloadVideo: (payload) => ipcRenderer.invoke('flow:dom-download-video', payload),
  domDownloadVideo: (payload) => ipcRenderer.invoke('flow:dom-download-video', payload),
  flowUpscaleVideo: (payload) => ipcRenderer.invoke('flow:upscale-video', payload),
  upscaleVideo: (payload) => ipcRenderer.invoke('flow:upscale-video', payload),
  flowUpscaleImage: (payload) => ipcRenderer.invoke('flow:upscale-image', payload),
  upscaleImage: (payload) => ipcRenderer.invoke('flow:upscale-image', payload),
  flowFetchGallery: (payload) => ipcRenderer.invoke('flow:fetch-gallery', payload),
  fetchGallery: (payload) => ipcRenderer.invoke('flow:fetch-gallery', payload),
  flowListProjects: (payload) => ipcRenderer.invoke('flow:list-projects', payload),
  listFlowProjects: (payload) => ipcRenderer.invoke('flow:list-projects', payload),
  flowGenerateScene: (payload) => ipcRenderer.invoke('flow:generate-scene', payload),
  resetFlowProject: () => ipcRenderer.invoke('flow:new-project'),
  selectVoice: (params) => ipcRenderer.invoke('flow:select-voice', params),
  refreshFlowComposer: (payload) => ipcRenderer.invoke('flow:refresh-composer', payload),
  renameFlowCharacter: (payload) => ipcRenderer.invoke('flow:rename-character', payload),
  flowRegisterCharacterEntity: (payload) => ipcRenderer.invoke('flow:register-character-entity', payload),
  setStartupProject: (params) => ipcRenderer.invoke('flow:set-startup-project', params),
  openFlowProject: (params) => ipcRenderer.invoke('flow:open-project', params),
  newFlowProject: () => ipcRenderer.invoke('flow:new-project'),
  dumpFlowSettings: () => ipcRenderer.invoke('flow:dump-settings'),
  listFlowAgentModels: () => ipcRenderer.invoke('flow:list-projects'),
  onFlowStatus: (cb) => {
    const handler = (_, data) => cb(data)
    ipcRenderer.on('flow-status', handler)
    return () => ipcRenderer.removeListener('flow-status', handler)
  },

  // GenAI & System Bridge Aliases
  isMock: () => false,
  flow: (payload) => ipcRenderer.invoke('flow:generate-image', payload),
  openWorkFolder: () => ipcRenderer.invoke('fs:open-work-folder'),
  openProjectFolder: (projectName) => ipcRenderer.invoke('fs:open-project-folder', projectName),
  openPath: (targetPath) => ipcRenderer.invoke('fs:open-path', targetPath),
  switchTab: () => ({ success: true }),
  notifyOS: () => ({ success: true }),
  flowDragStart: () => ({ success: true }),
  flowDragEnd: () => ({ success: true }),
  genaiSaveKey: (params) => ipcRenderer.invoke('keys:set', { provider: 'gemini', ...params }),
  genaiHasKey: (params) => ipcRenderer.invoke('keys:status', { provider: 'gemini', ...params }),
  genaiDeleteKey: (params) => ipcRenderer.invoke('keys:delete', { provider: 'gemini', ...params }),
  genaiVerifyKey: (params) => ipcRenderer.invoke('genai:validate-key', params),
  genaiPollVideo: (params) => ipcRenderer.invoke('genai:check-video-status', params),
  genaiGetKeyStatus: () => ipcRenderer.invoke('genai:get-key-status'),
  genaiValidateKey: (params) => ipcRenderer.invoke('genai:validate-key', params),
  genaiSetKey: (params) => ipcRenderer.invoke('genai:set-key', params),
  genaiClearKey: () => ipcRenderer.invoke('genai:clear-key'),
  genaiListModels: () => ipcRenderer.invoke('genai:list-models'),
  genaiCheckVideoStatus: (params) => ipcRenderer.invoke('genai:check-video-status', params),
  genaiDownloadVideo: (params) => ipcRenderer.invoke('genai:download-video', params),
  storyGetState: (params) => ipcRenderer.invoke('story:get-state', params),
  keysStatus: (params) => ipcRenderer.invoke('keys:status', params),
  keysSet: (params) => ipcRenderer.invoke('keys:set', params),
  keysDelete: (params) => ipcRenderer.invoke('keys:delete', params),
})
