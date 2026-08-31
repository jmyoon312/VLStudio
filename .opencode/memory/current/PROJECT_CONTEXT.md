# Project Context

Last Updated: 2026-09-01

## Project Overview

**ViraLoop Studio (VLStudio Desktop)** - Electron 데스크톱 앱
- Google Flow AI로 이미지/비디오 생성
- CapCut 프로젝트로 내보내기
- AutoFlow Chrome 확장 (10.7.58)에서 역공학한 API 사용

## Architecture

### 3-Tier Electron Architecture
```
Renderer (React) ←→ Preload (IPC Bridge) ←→ Main (Node.js)
```

### Key Files
- `electron/main.js` - Central IPC registration, deps objects
- `electron/ipc/shared.js` - Shared helpers (fetchMediaAsBase64, etc.)
- `electron/ipc/video.js` - Video generation IPC handlers
- `electron/ipc/flow-api.js` - Flow API IPC handlers
- `electron/flow-page-injection.js` - Page-level monkey-patch
- `electron/flow-inject-payload.js` - Payload contract for injection

### Storage Structure
```
C:\Users\jmyoo\AppData\Local\ViraLoop Studio\media\
├── 01_Inbox/          # Raw uploads
├── 02_Operations/     # Working files
├── 03_Assets/         # Media assets
├── 04_Profiles/       # Character profiles
├── 05_Exports/        # Final exports (images, videos)
├── 06_Database/       # project.json DB
├── 07_Downloads/      # Downloads
├── 08_Intelligence/   # AI models/prompts
└── 09_System/         # System files
```

## Critical Rules (from AGENTS.md)

1. **Dynamic LLM Routing** - Never hardcode AI providers
2. **05_Exports Storage** - All generated content goes here
3. **Self-Healing Sync** - Automatic error recovery
4. **withProjectWriteLock** - Atomic file operations

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Electron + Node.js
- **AI**: Google Flow API (reverse-engineered from AutoFlow)
- **Storage**: JSON-based project database
- **Build**: Vite + electron-builder
