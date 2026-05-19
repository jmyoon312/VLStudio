# 🚀 ViraLoop Studio 모노레포 흡수 통합 마스터 로드맵 (Master Integration Roadmap)

본 문서는 현재 개발 중인 Electron 기반의 **VLStudio**에 기존 **ViraLoop** (FastAPI + React + Python Worker) 생태계를 100% 완벽하게 흡수 통합하기 위한 종합 마스터 계획서입니다. 
어떠한 상황에서 작업이 일시 중단되더라도, 본 문서의 체크리스트와 마일스톤을 통해 언제든 1초 만에 작업 컨텍스트를 파악하고 이어서 진행할 수 있도록 설계되었습니다.

---

## 🌟 1. 아키텍처적 당위성: 통합 선행 vs 다중 창 후행

본 로드맵은 기술적 부채와 시스템 붕괴를 원천 차단하기 위해 **[흡수 통합(Integration) 선행 ➔ 다중 창(Multi-View) 후행 확장]**이라는 확고한 아키텍처 원칙을 준수합니다.

```
+---------------------------------------------------------------------------------------+
|                               [ 마스터 아키텍처 로드맵 ]                              |
|                                                                                       |
|  [Phase 1] 모노레포 기반 구축 및 인프라 이관 (pnpm workspaces / 폴더 구조 개편)       |
|       │                                                                               |
|       ▼                                                                               |
|  [Phase 2] 메인 프로세스 오케스트레이션 결합 (FastAPI, Redis, 워커 생명주기 제어)     |
|       │                                                                               |
|       ▼                                                                               |
|  [Phase 3] UI 대시보드 통합 및 Flow2CapCut 메뉴 편입 (기존 메뉴 100% 보존 + 신규 편입)|
|       │                                                                               |
|       ▼                                                                               |
|  [Phase 4] 전면 스타일 개편 및 대시보드 반응형 최적화 (Sovereign 디자인 시스템 적용)  |
|       │                                                                               |
|       ▼                                                                               |
|  [Phase 5] SAIF-2026 다중 창(Multi-View) 그리드 확장 및 스토어 배포 (단독 패키징)     |
+---------------------------------------------------------------------------------------+
```

### 왜 통합을 먼저 해야 하는가? (3대 핵심 이유)
1.  **단일 진실 공급원(Single Source of Truth) 확보**: 다중 창 구조는 여러 웹뷰와 대시보드가 하나의 백엔드 및 상태를 공유하는 복잡한 시스템입니다. 다중 창을 먼저 개발하면, 추후 ViraLoop 백엔드(`apps/api`)와 대시보드(`apps/dashboard`)를 연동할 때 모든 IPC 통신, 라우팅, 상태 동기화 코드를 전부 폐기하고 재작성해야 하는 대혼돈이 발생합니다.
2.  **UI/UX 반응형 설계의 기준점**: 다중 창 분할(그리드 뷰)은 최종적으로 사용자에게 보여질 '틀(Container)'입니다. 그 틀 안에 담길 알맹이(ViraLoop 대시보드 + Flow2CapCut 메뉴)가 먼저 하나로 통합되고 스타일이 확정되어야, 창 크기 변화에 따른 반응형 UI/UX를 완벽하게 조율할 수 있습니다.
3.  **인프라 오케스트레이션 선행 필수**: 로컬 DB, Redis, FastAPI 워커 구동 스크립트를 Electron `whenReady()`에 먼저 통합해 두어야, 향후 다중 창에서 쏟아지는 수많은 AI 에이전트들의 병렬 작업 요청을 안정적으로 처리할 큐(Queue) 환경이 보장됩니다.

---

## 📅 2. 단계별 세부 마일스톤 및 진척도 추적표 (Milestones & Checklist)

### 📦 [Phase 1] 모노레포 기반 구축 및 인프라 이관
*   **목표**: 기존 단일 React 구조를 폐기하고, ViraLoop의 백엔드와 UI를 수용하는 pnpm workspaces 기반의 모노레포 구조 완성.
*   [x] **1-1. 루트 패키지 설정**: `package.json`에 `pnpm workspaces` (또는 `npm workspaces`) 정의 및 공통 스크립트 구성.
*   [x] **1-2. ViraLoop 소스 이관**: `apps/ViraLoop_repo`에 클론된 최신 소스코드(`apps/api`, `apps/dashboard`, `apps/swarm`, `infra`)를 정식 워크스페이스 경로로 이동.
*   [x] **1-3. 의존성 호이스팅 격리**: Electron 메인 프로세스(`sqlite3`, `fs-extra`)와 대시보드 UI(`React`, `Vite`) 간의 패키지 충돌 방지 설정.


### ⚡ [Phase 2] 메인 프로세스 오케스트레이션 결합
*   **목표**: Electron 앱 실행/종료 시 ViraLoop 로컬 인프라(FastAPI, Redis, 워커, Postgres)를 원자적으로 자동 제어.
*   [x] **2-1. 구동 배치 연동**: `main.js`의 `whenReady()` 시점에 `infra/Start_Infr.bat` (또는 포터블 파이썬/Redis 바이너리) 비동기 실행 로직 추가.
*   [x] **2-2. 철벽 방어형 클린업**: `before-quit` 및 `SIGINT`/`SIGTERM` 이벤트에 좀비 프로세스 강제 종료(`taskkill` / `ViraLoop_Stop.bat`) 및 Postgres PID 잠금 해제 브릿지 탑재.
*   [x] **2-3. 포트 할당 및 상태 모니터링**: 백엔드 포트(8000, 5173, 5432, 6379) 충돌 감지 및 대시보드 전달용 IPC 하트비트(Heartbeat) 구현.

### 🖥️ [Phase 3] UI 대시보드 통합 및 Flow2CapCut 메뉴 편입
*   **목표**: ViraLoop 대시보드의 기존 39개 메뉴 체계를 100% 보존하면서, VLStudio의 Flow AI 및 캡컷 내보내기 기능을 신규 메뉴로 편입.
*   [x] **3-1. 기존 대시보드 라우팅 보존**: `apps/dashboard/src/pages/` 내부의 `BrandChannelManager`, `EliteCommandStudio`, `SwarmHub` 등 전체 페이지 및 GNB/LNB 네비게이션 체계 완벽 유지.
*   [x] **3-2. Flow2CapCut 모듈화 편입**: 기존 VLStudio 프론트엔드 코드(`src/`)를 `apps/dashboard/src/features/flow2capcut/`으로 캡슐화하여 마이그레이션.
*   [x] **3-3. IPC 브릿지 연동**: 편입된 Flow2CapCut 모듈이 `window.electronAPI`를 통해 메인 프로세스와 원활히 통신하도록 브릿지 계층 통합.

### 🎨 [Phase 4] 전면 스타일 개편 및 대시보드 반응형 최적화
*   **목표**: 구버전 ViraLoop Studio 스타일을 ViraLoop의 프리미엄 Sovereign 디자인 시스템으로 통일하고 반응형 레이아웃 최적화.
*   [x] **4-1. 디자인 시스템 통합**: ViraLoop의 테마(`theme/`), 색상 팔레트, 타이포그래피를 편입된 Flow2CapCut 컴포넌트에 전면 적용.
*   [x] **4-2. 버튼 및 레이아웃 리팩토링**: 기존의 투박한 버튼과 폼을 ViraLoop의 프리미엄 컴포넌트(카드 뷰, 모달, 드롭다운)로 교체.
*   [x] **4-3. 미디어 프리뷰 최적화**: 16:9 및 9:16 비율 전환 시 썸네일과 프리뷰 컨테이너가 완벽히 반응형으로 조율되도록 CSS 리팩토링.

### 🚀 [Phase 5] SAIF-2026 다중 창 그리드 확장 및 스토어 배포
*   **목표**: 단일 통합 대시보드 완성을 기반으로 다중 창 분할 아키텍처를 구현하고, Microsoft Store용 단독 설치 패키지 생성.
*   [x] **5-1. WebContentsView 그리드 매핑**: `Map<ProfileId, WebContentsView>` 레지스트리를 대시보드 그리드 UI 셀 좌표에 맞춰 동적 렌더링.
*   [x] **5-2. 뷰포트 마스킹 프로토콜**: 대시보드에서 모달/팝업 호출 시 네이티브 웹뷰 가림 현상을 방지하기 위한 Z-index 및 임시 숨김 IPC 통신 구현.
*   [x] **5-3. 단독 배포(Standalone) 패키징**: `extraResources` 번들링, 백엔드 PyInstaller 바이너리화, SQLite/인메모리 큐 전환을 통한 원클릭 무설치 배포 파일(`EXE`/`MSIX`) 생성.

---

## 🛑 3. 중단 및 재개 지침 (How to Resume)

작업이 예기치 않게 중단되거나 담당자가 변경될 경우, 다음 절차를 통해 1분 만에 컨텍스트를 복구할 수 있습니다.

1.  **현재 상태 파악**: 본 문서(`01_master_integration_roadmap.md`)의 2장 체크리스트(`[ ]` vs `[x]`)를 확인하여 완료된 페이즈와 진행 중인 태스크를 즉시 파악합니다.
2.  **상세 명세서 열람**: 작업할 페이즈에 해당하는 심화 명세서(`02_monorepo_architecture...` ~ `05_saif_2026_defense...`)를 열람하여 구체적인 아키텍처 지침과 예시 코드를 숙지합니다.
3.  **Git 작업 트리 점검**: `git status` 및 `git log`를 확인하여 마지막으로 커밋된 통합 진행 상황을 대조한 뒤, 체크리스트의 다음 미완료 항목부터 개발을 이어서 진행합니다.
