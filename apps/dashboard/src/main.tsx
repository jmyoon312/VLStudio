import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import axios from 'axios'
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material'
import { pixelingTheme } from './theme/pixeling'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Configure global Axios and Fetch defaults for packaged Electron env (file:/// protocol)
if (typeof window !== 'undefined') {
  const isFileProtocol = window.location.protocol === 'file:';
  const backendBase = 'http://127.0.0.1:8000';
  axios.defaults.baseURL = isFileProtocol ? backendBase : '';
  console.log(`[Axios Setup] Global axios.defaults.baseURL forced to: ${axios.defaults.baseURL || 'relative'}`);

  // Global window.fetch interceptor for file:/// packaged electron app
  if (isFileProtocol && window.fetch) {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string') {
        if (input.startsWith('/api/') || input === '/api' || input.startsWith('/files/') || input.startsWith('/thumbnails/')) {
          input = `${backendBase}${input}`;
        } else if (input.startsWith('/swarm/') || input === '/swarm') {
          input = `http://127.0.0.1:4000${input}`;
        }
      } else if (input instanceof URL) {
        if (input.pathname.startsWith('/api') || input.pathname.startsWith('/files') || input.pathname.startsWith('/thumbnails')) {
          input = new URL(`${backendBase}${input.pathname}${input.search}`);
        }
      }
      return originalFetch(input, init);
    };
  }
}
// Global Robust Polyfill for crypto.randomUUID (highly critical for HTTP and specific legacy Electron webviews)
if (typeof window !== 'undefined') {
  if (typeof (window as any).crypto === 'undefined') {
    (window as any).crypto = {};
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
  console.log('[Polyfill] Smart window.electronAPI Proxy mock registered for non-Electron browser environments.');
  const baseMock: Record<string, any> = {
    isMock: true,
    loadProfiles: async () => {
      try {
        const res = await fetch('/api/browser-profiles/');
        const profiles = await res.json();
        return { activeProfileId: Array.isArray(profiles) && profiles.length > 0 ? profiles[0].id : 'default', profiles: Array.isArray(profiles) ? profiles : [] };
      } catch (e) {
        return { activeProfileId: 'default', profiles: [] };
      }
    },
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
    getActiveViews: async () => ({ views: [] }),
    loadStyleThumbnails: async () => ({ success: true, thumbnails: {} }),
    checkStyleThumbnails: async () => ({ success: true, thumbnails: {} }),
    switchProfile: async ({ profileId }: any) => ({ success: true }),
    deleteProfile: async () => ({ success: true }),
    createProfile: async () => ({ success: true }),
    extractToken: async () => ({ success: false, error: 'Browser environment' }),
    validateToken: async () => ({ expiry: Date.now() + 3600000 }),
    extractProjectId: async () => ({ success: false }),
    uploadReference: async () => ({ success: false }),
    scanAudioPackage: async () => ({ success: false }),
    rescanAudioPackage: async () => ({ success: false }),
    readFileAbsolute: async () => ({ success: false }),
    writeFileAbsolute: async () => ({ success: false }),
    
    // Listeners
    onFlowStatus: (cb: any) => () => {},
    onLayoutChanged: (cb: any) => () => {},
    onMenuAction: (cb: any) => () => {},
    onStoryEvent: (cb: any) => () => {},
    onMcpUpdate: (cb: any) => () => {},
  };

  (window as any).electronAPI = new Proxy(baseMock, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop.startsWith('on')) {
        return (cb: any) => () => {};
      }
      return async (...args: any[]) => {
        return { success: true, isMock: true };
      };
    }
  });
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
 
