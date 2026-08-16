# ViraLoop Studio (VLStudio) - 진행상황 및 개발 로드맵

> 최종 업데이트: 2026-06-08
> 버전: v0.9.10 (Build 538)
> 저장소: github.com/jmyoon312/VLStudio

---

## 1. 프로젝트 개요

**VLStudio Desktop**은 Google Flow AI로 이미지/비디오를 대량 생성하고, 생성된 미디어를 CapCut 프로젝트로 내보내는 Electron 기반 데스크톱 앱.

| 영역 | 기술 스택 |
|------|----------|
| 데스크톱 셸 | Electron 36.9.5 + Vite 6.1 + vite-plugin-electron |
| 프론트엔드 | React 18 + MUI 5 + Radix UI + TanStack Query + Zustand |
| 백엔드 | Python FastAPI (PyInstaller → api_server.exe 번들) |
| MCP 서버 | @modelcontextprotocol/sdk (stdio + HTTP 3210) |
| 데이터베이스 | Firebase Realtime |
| AI 모델 | Gemini 2.5 Pro/Flash, Veo 3.1 (T2V/I2V/Upscale), Imagen 4 |
| 빌드/배포 | electron-builder (Win: NSIS+APPX, Mac: DMG+notarize, Linux: AppImage+deb) |

---

## 2. 완료된 작업 (코드 구현 완료)

### 2.1 Phase 1: 프로젝트 부트스트랩 ✅
- [x] whisk2capcut-desktop에서 포크, 리네이밍 완료
- [x] Monorepo 구성 (`apps/*`, `mcp-server`)
- [x] pnpm workspace 설정
- [x] Vite + Electron 빌드 체인 구축
- [x] Vite 빌드 성공 확인
- [x] 모든 `whisk` 참조 제거 완료 (grep 0건)

### 2.2 Phase 2: Flow API 코어 ✅
**Electron 메인 프로세스 (`electron/`):**
- [x] `main.js` (2,243줄) — Flow IPC 핸들러 전면 구현
- [x] `preload.js` — 6개 네임스페이스 40+개 API 브릿지
- [x] `flow-page-injection.js` — `fetch()` monkey-patch, 요청/응답 인터셉트
- [x] `stealth_preload.js` — 하드웨어 핑거프린트 스푸핑, WebDriver 차단
- [x] `login_preload.js` — Passkey 차단, 클린 로그인 환경
- [x] `profileManager.js` — 멀티 Google 계정 프로필 관리
- [x] `throttleManager.js` — Rate limiting
- [x] `cdp-image-inject.js` — CDP Fetch body 변환 (seed, aspect ratio)
- [x] `video-cdp-dispatch.js` — CDP 디스패치 로직

**IPC 핸들러 (`electron/ipc/`):**
- [x] `flow-api.js` (2,138줄) — 이미지 생성, 토큰 관리, 미디어 업로드/조회
- [x] `video.js` (1,155줄) — T2V/I2V 생성, 업스케일 (3-Phase Async)
- [x] `capcut.js` (675줄) — CapCut 프로젝트 탐색 및 쓰기
- [x] `filesystem.js` (1,588줄) — 파일 I/O, 히스토리, 오디오 패키지
- [x] `dom.js` (473줄) — Flow DOM 자동화 (네비게이션, 프롬프트, 조회)
- [x] `auth.js` — Google OAuth 팝업
- [x] `layout.js` — 창 레이아웃, 파워 세이브 차단
- [x] `mcp.js` — MCP 서버 등록
- [x] `ytExportManager.js` — YouTube 브랜드 채널 업로드
- [x] `shared.js` (615줄) — trustedClick, sessionFetch, reCAPTCHA

**프론트엔드 (`apps/dashboard/src/features/flow2capcut/`):**
- [x] `Flow2CapCutApp.jsx` — 메인 오케스트레이터
- [x] `Shell.jsx` — 분할 레이아웃 (split-left/right/top/bottom)
- [x] 26개 Hooks 전부 구현
  - `useFlowAPI`, `useAutomation`, `useScenes`, `useSceneGeneration`
  - `useReferenceGeneration`, `useGenerationQueue`
  - `useExport`, `useProjectData`, `useAppSettings`
  - `useVideoAutomation`, `useVideoScenes`
  - `useImageUpload`, `useAudioImport`, `useFlowEvents`, `useMcpServer`
  - 외 13개
- [x] 18개 Utils 전부 구현
- [x] 8개 Services 전부 구현
- [x] 3개 Exporters (capcut, capcutCloud, capcutLocalGenerator)
- [x] i18n (한국어/영어)
- [x] UI 브랜딩 완료 (Header, WelcomeScreen, SideDrawer 등)

**인프라:**
- [x] Python FastAPI 백엔드 (`apps/api/`) — TTS, 채널 모니터링, ADB
- [x] MCP 서버 (`mcp-server/`) — 17+ 도구, 스킬 관리
- [x] Self-healing: 포트 충돌 해결, 좀비 프로세스 정리, 10초 백엔드 헬스체크
- [x] Electron auto-updater 설정

---

## 3. 남은 작업 (구현 필요)

### 3.1 🔴 Phase 2 검증: 실행 테스트 (최우선 - 보류/미확인)

> 코드는 구현되었으나 **실제 앱 실행 및 Flow 연동 테스트가 완료되지 않음**.

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| 1 | `npm run dev` 앱 실행 확인 | ❌ 미확인 | Vite 빌드는 OK |
| 2 | Flow 탭 로딩 (labs.google/fx/tools/flow) | ❌ 미확인 | |
| 3 | Google 로그인 → 세션 토큰 추출 | ❌ 미확인 | |
| 4 | 프롬프트 → 이미지 생성 → 결과 표시 | ❌ 미확인 | |
| 5 | XSSI prefix `)]}'` 파싱 | ❌ 미확인 | |
| 6 | mediaId → redirect → fetch 2단계 조회 | ❌ 미확인 | |
| 7 | DOM 셀렉터 Flow 페이지 적합성 | ❌ 미확인 | |
| 8 | 레퍼런스 이미지 업로드 | ❌ 미확인 | |
| 9 | CapCut Export → ZIP 생성 | ❌ 미확인 | |

### 3.2 🟡 Phase 3: 비디오 생성 (신규 개발 필요)

> IPC 핸들러(`video.js`)는 구현됨. UI/Hook 연동만 남음.

| # | 작업 | 파일 | 상태 | 비고 |
|---|------|------|------|------|
| 3.1 | `useVideoGeneration.js` 훅 생성 | 신규 파일 | ❌ 미구현 | T2V/I2V 비동기 워크플로 |
| 3.2 | `useScenes.js` 확장 | 기존 파일 수정 | ❌ 미구현 | scene.type(image/video), videoModel 등 |
| 3.3 | `useAutomation.js` 확장 | 기존 파일 수정 | ❌ 미구현 | processVideoScene() 분기 |
| 3.4 | SceneList 토글 (이미지/비디오) | 기존 수정 | ❌ 미구현 | |
| 3.5 | VideoPreview 컴포넌트 | 신규 파일 | ❌ 미구현 | 비디오 플레이어 |
| 3.6 | App.jsx 모델 셀렉터 | 기존 수정 | ❌ 미구현 | veo2_fast, veo3_quality |

> 참고: `useVideoAutomation.js`와 `useVideoScenes.js`는 이미 존재하나 Phase 3 요구사항에 맞게 보강/연결 필요.

### 3.3 🟡 Phase 4: CapCut 비디오 Export

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| 4.1 | `useExport.js` 비디오 씬 포함 | ❌ 미구현 | project videos 배열 |
| 4.2 | `capcut.js` mp4 파일 쓰기 검증 | ❌ 미확인 | |
| 4.3 | 비디오 포함 CapCut 프로젝트 Export 테스트 | ❌ 미확인 | |

### 3.4 🟢 Phase 5: 빌드 & 배포

| # | 작업 | 상태 | 비고 |
|---|------|------|------|
| 5.1 | appx identityName 확인 | ❌ 미확인 | |
| 5.2 | notarize.cjs 하드코딩 참조 업데이트 | ❌ 미확인 | |
| 5.3 | 아이콘 교체 | ❌ 미확인 | assets/icon.* |
| 5.4 | macOS 빌드 테스트 | ❌ 미확인 | |
| 5.5 | Windows 빌드 테스트 | ❌ 미확인 | |
| 5.6 | macOS 공증 (notarize) | ❌ 미확인 | |

---

## 4. Tech Debt / 개선 필요

| # | 항목 | 우선순위 | 예상 시간 |
|---|------|---------|----------|
| TD-1 | **테스트 인프라 복구**: Node 18 + jsdom 27 ESM 충돌 | 🔴 높음 | 1일 |
| TD-2 | **`uploadReference` cleanup**: `category` 인자 불필요 | 🟢 낮음 | 30분 |
| TD-3 | **Gallery Flow archive 미디어 누락**: archive namespace 미연동 | 🟡 중간 | 1일 |
| TD-4 | **Gallery refresh 버튼**: stale 상태 개선 | 🟢 낮음 | 1시간 |
| TD-5 | **story-engine Hook 분리**: 별도 W3 출력 파일 | 🟢 낮음 | 1-2일 |
| TD-6 | **AudioTab SFX 프롬프트 노출**: cross-reference 필요 | 🟡 중간 | 3시간 |
| TD-7 | **TTS/SFX API key 사전 검증**: preflight | 🟡 중간 | 3시간 |
| TD-8 | **Production-scope gate**: SFX/Dialogue 선택 스킵 | 🟢 낮음 | 1시간 |

---

## 5. 디렉토리 구조 (핵심만)

```
C:\ViraLoopMedia\VLStudio\
├── electron/                          # ✅ Electron 메인 프로세스
│   ├── main.js                        #   2243줄 - 진입점, 창생성, IPC 등록
│   ├── preload.js                     #   145줄 - contextBridge API 노출
│   ├── stealth_preload.js             #   330줄 - 핑거프린트 스푸핑
│   ├── flow-page-injection.js         #   280줄 - fetch monkey-patch
│   └── ipc/                           #   13개 IPC 핸들러
│       ├── flow-api.js                #   2138줄 - 이미지 생성
│       ├── video.js                   #   1155줄 - 비디오 생성 ✅ (IPC만)
│       ├── capcut.js                  #   675줄 - CapCut 내보내기
│       └── ...
├── apps/dashboard/src/features/flow2capcut/  # ✅ React 프론트엔드
│   ├── Flow2CapCutApp.jsx
│   ├── Shell.jsx
│   ├── hooks/                         #   26개 hooks
│   ├── utils/                         #   18개 utils
│   ├── services/                      #   8개 services
│   ├── exporters/                     #   3개 exporters
│   └── components/                    #   UI 컴포넌트
├── apps/api/                          # ✅ FastAPI 백엔드
├── mcp-server/                        # ✅ MCP 서버
├── tests/                             # ⚠️ 인프라 깨짐
├── TODO.md                            # 진행상황 문서
└── PROGRESS.md                        # 👈 이 파일
```

---

## 6. 권장 개발 순서

```
1순위: Phase 2 검증 (앱 실행 → Flow 연동 테스트)
  └── 앱이 정상 동작하는지 확인이 최우선

2순위: Phase 3 비디오 생성 (useVideoGeneration.js → Scene 확장 → UI)
  └── IPC는 이미 완료, Hook/UI만 연결

3순위: Phase 4 CapCut 비디오 Export

4순위: Tech Debt (TD-1 테스트 복구, TD-3 Gallery 등)

5순위: Phase 5 빌드 & 배포
```
