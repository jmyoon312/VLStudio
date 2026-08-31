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
