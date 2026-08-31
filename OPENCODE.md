# 🚀 ViraLoop Studio (VLStudio) - OpenCode & Freebuff AI 개발 지침서

> 본 문서는 **OpenCode, Freebuff 및 오픈소스 AI 코딩 에이전트**가 ViraLoop Studio 프로젝트의 코드를 작성, 리팩토링, 디버깅할 때 **반드시 준수해야 하는 최상위 개발 헌법 및 엔지니어링 가이드라인**입니다.

---

## 🏛️ 1. 시스템 아키텍처 개요 (3-Tier Architecture)

ViraLoop Studio는 **Google Flow AI 및 TTS 기반의 미디어 자동 생성 후 CapCut 프로젝트로 원스톱 내보내기**를 지원하는 차세대 데스크톱 크리에이티브 스튜디오입니다.

1. **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Radix UI (Shadcn), TanStack Query
2. **Desktop Native (IPC)**: Electron (Main Process <-> Preload <-> Renderer)
3. **Backend API**: FastAPI (Python), SQLite (SQLAlchemy), Local Media Engine
4. **Export Engine**: CapCut Draft Builder (draft_content.json, draft_meta_info.json)

---

## 🧭 2. 단일 진실 공급원(SSOT) 4대 절대 원칙

1. **AI 모델 하드코딩 절대 금지 (Dynamic LLM Routing)**:
   - 코드 내에 특정 외부 인공지능 공급자(Groq, Google 등)나 모델명을 절대 하드코딩하지 않습니다.
   - 모든 AI 대본 분석 및 프롬프트 생성은 **시스템의 작업 환경 설정(DB Settings: `script_analysis_model`, `default_llm_model`)에 지정된 내부 인공지능 라우터(`LLMClient` / `Hermes Core`)를 단일 진실 공급원으로 실시간 동적 연동**하여 사용합니다.

2. **05_Exports 표준 저장소 헌법 (`storage-database-lifecycle`)**:
   - 모든 프로젝트 데이터와 미디어는 로컬 디스크 `05_Exports/<ProjectName>/` 폴더에만 원자적으로 저장합니다.
   - 프로젝트 디렉토리 표준 구조:
     ```
     05_Exports/<ProjectName>/
     ├── project.json       # 프로젝트 메타데이터, 씬 목록, 대본, 자막 설정
     ├── images/            # 생성된 씬 이미지 (scene_1_xxx.png)
     ├── audio/             # 생성된 TTS 음성 (scene_01.mp3)
     ├── videos/            # 생성된 I2V 영상 (scene_1_xxx.mp4)
     └── subtitles/         # 자막 파일 (.srt)
     ```

3. **디스크 실시간 자가치유(Self-Healing) 동기화**:
   - 프로젝트를 열거나 목록을 조회할 때, `project.json`의 텍스트뿐만 아니라 실제 디스크의 `images/`, `audio/`, `videos/` 폴더를 실시간 스캔하여 누락된 미디어 파일이 있으면 `file:///` 절대 경로로 100% 자동 매칭 및 복원합니다.

4. **비파괴적 원자적 파일 쓰기 (`withProjectWriteLock`)**:
   - `project.json`을 수정할 때는 `electron/ipc/filesystem.js`의 `withProjectWriteLock`을 통과하여 파일 손상 및 동시성 충돌을 원천 방지합니다.

---

## 🎨 3. UI/UX 디자인 시스템 가이드라인 (Design System Tokens)

기존 바이럴루프 스튜디오의 **세련되고 컴팩트한 프리미엄 다크 테마**를 반드시 계승하세요:

- **컬러 팔레트**:
  - 배경: `bg-card`, `bg-background`, `bg-muted/40` (깊이감 있는 차콜 다크)
  - 테두리: `border border-border/70`, `rounded-xl` 또는 `rounded-2xl`
  - 포인트 액센트:
    - Primary: Indigo/Blue (`#6366f1`) - 일반 액션 및 선택 버튼
    - Project/Folder: Amber (`#f59e0b`) - 폴더, 프로젝트 아이콘
    - Audio: Cyan (`#06b6d4`) - 오디오, 음성 배지
    - Video: Purple (`#a855f7`) - 비디오, 모션 배지
- **타이포그래피**:
  - 가변 폰트: `Wanted Sans`, `Pretendard Variable`
  - 계층 크기: 대시보드 컴팩트 룩앤필 (`text-xs`, `text-[11px]`, `text-[10px]`)
- **컴포넌트 & 인터랙션**:
  - 버튼/인풋: `h-7`, `h-8` 슬림 규격 유지
  - 상태 변화 시 부드러운 전환(Transition), Badge, 스피너(`RefreshCw animate-spin`), `sonner` 토스트 알림 연동.

---

## 🧩 4. 10대 전문 개발 엔지니어링 매트릭스

모든 코드 작성 및 수정 시 아래 10대 전문 스킬을 내재화하여 작업합니다:

1. `clean-architecture-guardian`: Electron 3계층 분리, 의존성 역전, SRP 준수.
2. `code-refactoring-patterns`: 모놀리식 방지, 단일 책임 원칙, 깔끔한 모듈 분리.
3. `async-concurrency-state`: Race Condition 방지, React 18 동시성 제어, 디바운스.
4. `electron-web-synergy`: WebContentsView 레이아웃 제어, IPC 채널 보안, 안전한 OS 바인딩.
5. `network-api-reverse-engineer`: Google Flow AI tRPC/SSE 스트림 네이티브 재구축.
6. `media-codec-binary-pipeline`: Base64/Buffer 메모리 최적화, 마이크로초(`ms * 1000`) 정밀 타임코드 연산.
7. `storage-database-lifecycle`: `05_Exports` 표준 저장소 규칙, 원자적 락.
8. `bulletproof-fullstack-dev`: 3계층 계약 무결성 검증.
9. `systematic-debugging`: 추측성 수정 배제, 로그 및 디스크 상태 기반 5단계 결함 격리.
10. `performance-memory-profiler`: Electron V8 메모리 누수 방지, 렌더링 최적화.

---

## ⚡ 5. 핵심 개발 & 검증 워크플로우 (필수 검증 명령어)

작업 완료 전 **반드시 아래 통합 빌드 검증 명령어를 실행하여 에러가 없음을 확인**해야 합니다:

```bash
# 1. 통합 3계층 계약 검증 및 Vite/Electron 번들 빌드
node scripts/verify-and-build.cjs

# 2. 계약 무결성 검사기 (선택)
node scripts/contract-checker.js
```

---

## 🔗 6. Flow API 통신 아키텍처

Google Flow AI와의 통신은 AutoFlow Chrome 확장(10.7.58)을 역공학하여 구현합니다.

### 6.1 핵심 통신 흐름
```
Renderer (React) 
  → Preload (IPC Bridge) 
    → Main Process (Node.js)
      → Flow Page (Electron BrowserWindow)
        → Google Flow API (tRPC/SSE)
```

### 6.2 주요 IPC 핸들러
| IPC 채널 | 파일 | 용도 |
|----------|------|------|
| `flow:generate-image` | `electron/ipc/flow-api.js` | 이미지 생성 |
| `flow:generate-video-t2v` | `electron/ipc/video.js` | T2V 비디오 생성 |
| `flow:generate-video-i2v` | `electron/ipc/video.js` | I2V 비디오 생성 |
| `flow:check-video-status` | `electron/ipc/video.js` | 비디오 상태 확인 |
| `flow:upload-reference` | `electron/ipc/flow-api.js` | 레퍼런스 이미지 업로드 |

### 6.3 의존성 주입 패턴 (deps)
Main Process의 IPC 핸들러는 deps 객체를 통해 의존성을 주입받습니다:

```javascript
// electron/main.js
const videoDeps = {
  getMainWindow: () => mainWindow,
  setFlowPageInject,      // Flow 페이지 인젝션 함수
  clearFlowPageInject,    // 인젝션 초기화 함수
  fetchMediaAsBase64,     // 미디어 URL → Base64 변환
  // ... 기타 의존성
}

registerVideoIPC(ipcMain, videoDeps)
```

### 6.4 TRPC 리다이렉트 처리
Flow API의 미디어 URL은 TRPC 엔드포인트를 통해 302 리다이렉트로 반환됩니다:

```javascript
// electron/ipc/shared.js - fetchMediaAsBase64
const resp = await flowPageFetch(url, { redirect: 'manual' })
// 리다이렉트 응답에서 URL 추출
const mediaUrl = resp.url || pageResult.url
```

---

## 🎬 7. I2V 비디오 생성 아키텍처

### 7.1 이미지 참조 메커니즘
I2V(Image-to-Video)에서 이미지는 **mediaId(UUID)로 참조**되며, 재업로드되지 않습니다:

```
이미지 생성 (batchGenerateImages)
  → 응답에서 mediaId 추출 (mediaGenerationId 또는 name)
  → 씬 객체에 mediaId 저장
  → I2V 요청 시 startImageMediaId로 전달
  → Flow API가 해당 mediaId의 이미지를 시작 프레임으로 사용
```

### 7.2 Flow 페이지 인젝션
Monkey-patch가 T2V 요청을 가로채 I2V로 변환합니다:

```javascript
// electron/flow-page-injection.js
function injectI2VBody(body, i2v) {
  for (const req of body.requests) {
    req.videoModelKey = toI2VModelKey(req.videoModelKey)
    req.startImage = { 
      mediaId: i2v.startImageMediaId, 
      name: i2v.startImageMediaId,
      media: { name: i2v.startImageMediaId },
      cropCoordinates: { top: 0, left: 0, bottom: 1, right: 1 }
    }
  }
}
```

### 7.3 인젝션 아키텍처
```
window.__autoflowcut_inject__ = {
  i2v: {
    startImageMediaId: "<uuid>",
    endImageMediaId: "<uuid>" | null,
    i2vUrl: "https://.../video:batchAsyncGenerateVideoStartImage",
    duration: "8s",
    videoModel: "veo3"
  },
  seed: 12345,
  aspects: null
}
```

---

## 🧠 8. 메모리 시스템

AI 에이전트의 세션 간 기억을 유지하기 위한 인프라입니다.

### 8.1 디렉토리 구조
```
.opencode/memory/
├── INDEX.md                    # 마스터 인덱스
├── current/                    # 활성 세션 기억
│   ├── PROJECT_CONTEXT.md      # 프로젝트 아키텍처 & 규칙
│   ├── ACTIVE_TASKS.md         # 현재 작업 & 진행 상황
│   ├── TECHNICAL_DECISIONS.md  # 주요 기술적 결정
│   └── SESSION_LOG.md          # 세션 기록
├── .archive/                   # 아카이브된 오래된 기억
└── history/                    # 히스토리 기록
```

### 8.2 메모리 카테고리
| 카테고리 | 용도 | 파일 |
|----------|------|------|
| Project Context | 아키텍처, 규칙, 컨벤션 | PROJECT_CONTEXT.md |
| Active Tasks | 현재 작업 진행 상황 | ACTIVE_TASKS.md |
| Technical Decisions | 기술적 결정 및 이유 | TECHNICAL_DECISIONS.md |
| Session History | 세션별 작업 기록 | SESSION_LOG.md |

### 8.3 미디어 폴더와의 차이
| 시스템 | 위치 | 용도 |
|--------|------|------|
| 메모리 시스템 | `.opencode/memory/` | AI 에이전트의 기억 |
| 미디어 폴더 | `AppData/.../media/` | 생성된 파일 저장 |

---

## 🐛 9. 디버깅 체크리스트

### 9.1 I2V 비디오 생성 실패 시
- [ ] `scene.mediaId`가 유효한 Flow mediaId(UUID)인지 확인
- [ ] `setFlowPageInject`가 main.js에서 정의되어 있는지 확인
- [ ] `videoDeps`에 `setFlowPageInject`/`clearFlowPageInject`가 주입되어 있는지 확인
- [ ] `window.__autoflowcut_inject__`에 i2v 설정이 기록되는지 확인
- [ ] Monkey-patch가 T2V 요청을 가로채는지 확인

### 9.2 비디오 상태 확인 실패 시
- [ ] `fetchMediaAsBase64`가 `redirect: 'manual'`을 사용하는지 확인
- [ ] TRPC 엔드포인트가 302 리다이렉트를 반환하는지 확인
- [ ] CDN 직접 URL 접근이 가능한지 확인 (mediaId가 UUID 형태인지)

### 9.3 이미지 생성 실패 시
- [ ] Flow 프로젝트 ID가 올바른지 확인
- [ ] 토큰이 유효한지 확인
- [ ] `batchGenerateImages` 응답에서 `mediaGenerationId`가 반환되는지 확인

### 9.4 빌드 검증
```bash
# 필수 빌드 검증
node scripts/verify-and-build.cjs

# 계약 무결성 검사
node scripts/contract-checker.js
```

---

## 📁 10. 주요 파일 참조

### 10.1 Electron 메인 프로세스
| 파일 | 용도 |
|------|------|
| `electron/main.js` | IPC 핸들러 등록, deps 객체, 유틸리티 함수 |
| `electron/preload.js` | IPC 브릿지 (Renderer ↔ Main) |
| `electron/flow-page-injection.js` | Flow 페이지 monkey-patch |
| `electron/flow-inject-payload.js` | 인젝션 페이로드 빌더 |

### 10.2 IPC 핸들러
| 파일 | 용도 |
|------|------|
| `electron/ipc/video.js` | 비디오 생성 IPC (T2V, I2V, 상태 확인) |
| `electron/ipc/flow-api.js` | Flow API IPC (이미지 생성, 업로드) |
| `electron/ipc/shared.js` | 공유 헬퍼 (fetchMediaAsBase64 등) |

### 10.3 프론트엔드
| 파일 | 용도 |
|------|------|
| `apps/dashboard/src/pages/CreativeStudio.tsx` | 메인 크리에이티브 스튜디오 UI |
| `apps/dashboard/src/features/flow2capcut/` | Flow → CapCut 내보내기 엔진 |
