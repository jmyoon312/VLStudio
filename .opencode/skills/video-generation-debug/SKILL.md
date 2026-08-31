# Video Generation Debug Skill

> I2V/T2V 비디오 생성 문제를 진단하고 수정하는 스킬입니다.

## When to Use

- 비디오 생성이 실패할 때
- 이미지가 I2V에서 사용되지 않을 때
- 비디오 상태 확인이 실패할 때
- Flow API 비디오 관련 에러 발생 시

## Video Generation Types

### T2V (Text-to-Video)
- 텍스트 프롬프트만으로 비디오 생성
- 엔드포인트: `batchAsyncGenerateVideoText`

### I2V (Image-to-Video)
- 이미지를 시작 프레임으로 사용하여 비디오 생성
- 엔드포인트: `batchAsyncGenerateVideoStartImage`
- 이미지는 `mediaId`(UUID)로 참조 (재업로드 없음)

## Debugging Flow

### Step 1: Check Image Generation
```bash
# 이미지가 정상 생성되었는지 확인
# CreativeStudio.tsx:1381-1411에서 mediaId 추출 확인
```

Verify:
- [ ] `res.images[0].mediaId` exists
- [ ] `mediaId` is a valid UUID format
- [ ] Scene object has `mediaId` stored

### Step 2: Check IPC Handler
```bash
# electron/ipc/video.js:505-571 확인
```

Verify:
- [ ] `startImageMediaId` is passed correctly
- [ ] `effectiveStartMediaId` is resolved
- [ ] No "No start image mediaId" error

### Step 3: Check Page Injection
```javascript
// Flow 페이지에서 확인
console.log(window.__autoflowcut_inject__)
```

Verify:
- [ ] `i2v.startImageMediaId` is set
- [ ] `i2v.i2vUrl` is correct endpoint
- [ ] Payload is written to page

### Step 4: Check Monkey-Patch
```javascript
// flow-page-injection.js:136-159 확인
```

Verify:
- [ ] `injectI2VBody` is called
- [ ] `req.startImage` is injected
- [ ] URL is rewritten to I2V endpoint

### Step 5: Check Status Polling
```bash
# electron/ipc/video.js:960+ 확인
```

Verify:
- [ ] `flow:check-video-status` handler exists
- [ ] `fetchMediaAsBase64` uses `redirect: 'manual'`
- [ ] Video URL is extracted correctly

## Common Issues & Fixes

### Issue: "Image not used for I2V"
**Symptoms**: Video generates but without image reference
**Root Cause**: `setFlowPageInject` not defined
**Fix**:
```javascript
// electron/main.js
const setFlowPageInject = async (arm) => {
  const payload = buildFlowInjectPayload(arm)
  await win.webContents.executeJavaScript(
    `window.__autoflowcut_inject__ = ${JSON.stringify(payload)}`
  )
}
```

### Issue: "No media URL in redirect response"
**Symptoms**: Video status check fails
**Root Cause**: `fetchMediaAsBase64` follows redirects automatically
**Fix**:
```javascript
// electron/ipc/shared.js
const resp = await flowPageFetch(url, { redirect: 'manual' })
const mediaUrl = resp.url || pageResult.url
```

### Issue: "No start image mediaId"
**Symptoms**: I2V fails immediately
**Root Cause**: `setFlowPageInject` not in deps
**Fix**:
```javascript
// electron/main.js
const videoDeps = {
  setFlowPageInject,  // Add this
  clearFlowPageInject, // Add this
  // ...
}
```

## Key Files Reference

| File | Lines | Purpose |
|------|-------|---------|
| `electron/ipc/video.js` | 505-571 | I2V handler |
| `electron/ipc/video.js` | 752-768 | Inject config build |
| `electron/ipc/video.js` | 960+ | Status polling |
| `electron/ipc/shared.js` | 326-410 | fetchMediaAsBase64 |
| `electron/flow-page-injection.js` | 136-159 | injectI2VBody |
| `electron/main.js` | 218+ | setFlowPageInject |
