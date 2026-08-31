# Media Pipeline Skill

> 이미지/비디오 미디어 파이프라인을 관리하는 스킬입니다.

## When to Use

- 미디어 파일 저장 경로 확인 시
- 프로젝트 구조 이해 시
- 미디어 파일 누락 문제 해결 시
- 내보내기(Export) 관련 작업 시

## Storage Architecture

### Media Folder Structure
```
C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media\
├── 01_Inbox/          # 원본 업로드
├── 02_Operations/     # 작업 중간 파일
├── 03_Assets/         # 미디어 에셋
├── 04_Profiles/       # 캐릭터 프로필
├── 05_Exports/        # 최종 내보내기 (이미지, 비디오)
├── 06_Database/       # project.json DB
├── 07_Downloads/      # 다운로드
├── 08_Intelligence/   # AI 모델/프롬프트
└── 09_System/         # 시스템 파일
```

### Project Export Structure
```
05_Exports/<ProjectName>/
├── project.json       # 프로젝트 메타데이터
├── images/            # 생성된 씬 이미지 (scene_1_xxx.png)
├── audio/             # 생성된 TTS 음성 (scene_01.mp3)
├── videos/            # 생성된 I2V 영상 (scene_1_xxx.mp4)
└── subtitles/         # 자막 파일 (.srt)
```

## Key Operations

### 1. Image Storage
```javascript
// CreativeStudio.tsx:1381-1411
const localPath = path.join(exportsDir, 'images', `${sceneId}.png`)
await fs.writeFile(localPath, Buffer.from(base64Data, 'base64'))

updateScene(id, { 
  media_url: `file:///${localPath}`,
  mediaId: res.images[0].mediaId,
  media_path: localPath
})
```

### 2. Video Storage
```javascript
// video.js - after video completion
const videoBuffer = await fetchMediaAsBase64(token, mediaId)
const localPath = path.join(exportsDir, 'videos', `${sceneId}.mp4`)
await fs.writeFile(localPath, Buffer.from(videoBuffer, 'base64'))
```

### 3. Self-Healing Sync
```javascript
// electron/ipc/filesystem.js
// Scan actual disk files and match with project.json
const diskFiles = await scanDirectory(mediaPath)
const missingFiles = projectFiles.filter(f => !diskFiles.includes(f))
// Auto-restore missing files
```

## Common Issues

### Issue: "Media file not found"
**Cause**: File exists in project.json but not on disk
**Fix**: Run self-healing sync or regenerate media

### Issue: "Incorrect file path"
**Cause**: Using relative paths instead of absolute
**Fix**: Always use `file:///` absolute paths

### Issue: "Media not persisting across restarts"
**Cause**: Only stored in memory, not written to disk
**Fix**: Ensure `fs.writeFile` is called after generation

## Project JSON Structure
```json
{
  "id": "project-uuid",
  "name": "My Project",
  "scenes": [
    {
      "id": "scene-1",
      "mediaId": "flow-media-uuid",
      "media_url": "file:///C:/.../images/scene-1.png",
      "media_path": "C:\\...\\images\\scene-1.png",
      "visualStatus": "completed"
    }
  ]
}
```

## Validation Commands

```bash
# Check media folder exists
dir "C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media"

# Check project exports
dir "C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media\05_Exports"

# Verify project.json
type "C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media\05Exports\<project>\project.json"
```
