import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { pixelingTheme } from './theme/pixeling'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Global Robust Polyfill for crypto.randomUUID (highly critical for HTTP and specific legacy Electron webviews)
if (typeof window !== 'undefined') {
  if (typeof (window as any).crypto === 'undefined') {
    (window as any).crypto = {} as any;
  }
  if (!(window.crypto as any).randomUUID) {
    (window.crypto as any).randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    console.log('[Polyfill] crypto.randomUUID successfully registered.');
  }
}

// Global Robust Fallback Mock for window.electronAPI in browser development environments
if (typeof window !== 'undefined' && typeof (window as any).electronAPI === 'undefined') {
  console.log('[Polyfill] window.electronAPI mock registered for non-Electron development environments.');
  (window as any).electronAPI = {
    loadProfiles: async () => ({ activeProfileId: 'default', profiles: [{ id: 'default', name: 'Default Profile' }] }),
    getSavedWorkFolder: async () => ({ success: true, path: 'MockWorkFolder', name: 'MockWorkFolder' }),
    getDefaultWorkFolder: async () => ({ success: true, path: 'MockWorkFolder', name: 'MockWorkFolder' }),
    saveWorkFolder: async () => ({ success: true }),
    checkFolderExists: async () => ({ exists: true }),
    listProjects: async () => ({ projects: [] }),
    projectExists: async () => ({ exists: false }),
    getProjectFolder: async () => ({ path: 'MockProjectFolder' }),
    getResourceFolder: async () => ({ path: 'MockResourceFolder', historyPath: 'MockHistoryFolder' }),
    saveResource: async () => ({ success: true }),
    readResource: async () => ({ success: false, error: 'Mock environment' }),
    getResourcePath: async () => ({ success: true, path: '' }),
    readFileByPath: async () => ({ success: false, error: 'Mock environment' }),
    getHistory: async () => ({ success: true, histories: [] }),
    readHistoryMetadata: async () => ({ success: false }),
    switchProfile: async () => ({ success: true }),
    deleteProfile: async () => ({ success: true }),
    createProfile: async () => ({ success: true }),
    extractToken: async () => ({ success: false, error: 'Mock environment' }),
    validateToken: async () => ({ expiry: Date.now() + 3600000 }),
    extractProjectId: async () => ({ success: false }),
    uploadReference: async () => ({ success: false }),
    scanAudioPackage: async () => ({ success: false }),
    rescanAudioPackage: async () => ({ success: false }),
    readFileAbsolute: async () => ({ success: false }),
    writeFileAbsolute: async () => ({ success: false }),
    googleSignIn: async () => ({ success: false, error: 'Mock environment' }),
    
    // Listeners
    onFlowStatus: (cb: any) => {
      console.log('[Mock] onFlowStatus listener registered');
      // Call mock immediately in browser to allow onboarding
      setTimeout(() => cb?.({ authenticated: true }), 100);
      return () => {};
    },
    onLayoutChanged: (cb: any) => {
      console.log('[Mock] onLayoutChanged listener registered');
      return () => {};
    },
    
    // Controls
    setLayout: async () => {},
    updateSplit: async () => {},
    switchTab: async () => {},
  };
}

const queryClient = new QueryClient()

document.documentElement.classList.remove('dark')
document.documentElement.classList.add('light')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MuiThemeProvider theme={pixelingTheme}>
        <CssBaseline />
        <App />
      </MuiThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
 
