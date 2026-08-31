# Flow API Integration Skill

> Google Flow AI와의 통신을 처리하는 스킬입니다.

## When to Use

- Flow API와의 통신 문제 진단 시
- 이미지/비디오 생성 IPC 핸들러 수정 시
- TRPC 엔드포인트 변경 시
- Monkey-patch 관련 작업 시

## Architecture

### Communication Flow
```
Renderer (React) 
  → Preload (IPC Bridge) 
    → Main Process (Node.js)
      → Flow Page (Electron BrowserWindow)
        → Google Flow API (tRPC/SSE)
```

### Key Files
| File | Purpose |
|------|---------|
| `electron/ipc/flow-api.js` | Flow API IPC handlers (image gen, upload) |
| `electron/ipc/video.js` | Video generation IPC (T2V, I2V, status) |
| `electron/ipc/shared.js` | Shared helpers (fetchMediaAsBase64) |
| `electron/flow-page-injection.js` | Page-level monkey-patch |
| `electron/flow-inject-payload.js` | Payload contract for injection |

## Critical Patterns

### 1. TRPC Redirect Handling
Flow API returns media URLs via TRPC 302 redirects:

```javascript
// CORRECT: Use redirect: 'manual'
const resp = await flowPageFetch(url, { redirect: 'manual' })
const mediaUrl = resp.url || pageResult.url

// WRONG: Automatic redirect following loses the URL
const resp = await flowPageFetch(url) // resp.url is empty
```

### 2. Dependency Injection (deps)
IPC handlers receive dependencies via deps objects:

```javascript
// electron/main.js
const videoDeps = {
  getMainWindow: () => mainWindow,
  setFlowPageInject,
  clearFlowPageInject,
  fetchMediaAsBase64,
  // ...
}

registerVideoIPC(ipcMain, videoDeps)
```

### 3. Page Injection Contract
Monkey-patch reads from `window.__autoflowcut_inject__`:

```javascript
window.__autoflowcut_inject__ = {
  i2v: {
    startImageMediaId: "<uuid>",
    endImageMediaId: null,
    i2vUrl: "https://.../video:batchAsyncGenerateVideoStartImage",
    duration: "8s",
    videoModel: "veo3"
  },
  seed: 12345,
  aspects: null
}
```

## Debugging Checklist

- [ ] Token is valid and not expired
- [ ] Flow project ID matches expected project
- [ ] `flowPageFetch` is available in deps
- [ ] `setFlowPageInject` is defined in main.js
- [ ] Monkey-patch is intercepting requests
- [ ] TRPC endpoint returns 302 redirect (not direct URL)

## Common Issues

### Issue: "No media URL in redirect response"
**Cause**: `fetchMediaAsBase64` uses automatic redirect following
**Fix**: Use `redirect: 'manual'` and extract URL from `resp.url`

### Issue: "No start image mediaId"
**Cause**: `setFlowPageInject` not defined or not in deps
**Fix**: Add function to main.js and include in videoDeps

### Issue: Image not used for I2V
**Cause**: `window.__autoflowcut_inject__.i2v` not set
**Fix**: Verify `setFlowPageInject` is called with i2v config
