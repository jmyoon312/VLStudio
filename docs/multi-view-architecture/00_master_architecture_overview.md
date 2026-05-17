# ViraLoop Studio - 다중 창(Multi-View) 및 차세대 자동화 아키텍처 마스터 개요

본 문서 세트는 ViraLoop Studio를 단일 뷰 구조에서 **고성능 다중 창(Multi-View) 및 병렬 AI 자동화 플랫폼**으로 확장하기 위한 종합 설계 및 개발 명세서입니다. 
각 문서는 시스템의 핵심 모듈별 상세 아키텍처, 기술적 극복 과제, 그리고 구체적인 코드 구현 가이드를 제공합니다.

---

## 📂 문서 구조 및 인덱스

```text
docs/multi-view-architecture/
 ├── 00_master_architecture_overview.md        # 현재 문서 (마스터 개요 및 로드맵)
 ├── 01_multi_view_grid_architecture.md        # 다중 창 웹뷰 레지스트리 및 그리드 레이아웃 명세
 ├── 02_mcp_skills_parallel_orchestration.md   # MCP/스킬 병렬 큐 라우팅 및 동시성 제어 명세
 ├── 03_openclaude_integration_guide.md        # OpenClaude 연동 및 무료/로컬 AI 모델 최적화 가이드
 └── 04_network_split_and_youtube_antiban.md   # 네트워크 분할 라우팅 및 유튜브 연좌제 방지 순차 업로드 명세
```

---

## 🌟 4대 핵심 아키텍처 요약

### 1. 다중 창(Multi-View) 그리드 및 세션 격리 아키텍처 (`01_multi_view`)
*   **핵심 사상**: 기존 단일 `flowView` 전역 변수를 해체하고, `Map<ProfileId, WebContentsView>` 기반의 다중 뷰 레지스트리를 구축합니다.
*   **주요 기능**: 2단계 계층형 그리드 레이아웃(1x1, 1x2, 2x2) 동적 계산, 타겟 인식 IPC 라우팅(`getFlowViewById`), 오디오 뮤트 및 뷰 인스턴스 소멸/재활용을 통한 메모리 최적화.

### 2. MCP 및 스킬(Skills) 병렬 오케스트레이션 (`02_mcp_skills`)
*   **핵심 사상**: ViraLoop Studio에 완비된 MCP 서버(`mcp-server/index.js`)와 스킬 엔진을 다중 프로젝트 병렬 처리 구조로 확장합니다.
*   **주요 기능**: 프로젝트 ID 기반의 다중 대기열(`generationQueues = new Map()`) 격리, 프로젝트-프로필 바인딩, 파일 I/O 동시성 락(IPC Mutex), 전역 스로틀링 및 지터링을 통한 봇 탐지 방지.

### 3. OpenClaude 및 무료/로컬 AI 모델 연동 가이드 (`03_openclaude`)
*   **핵심 사상**: 공식 Claude Code CLI 대신 무료 오픈소스 에이전트 CLI인 OpenClaude를 연동하여 100% 동일한 제어 환경을 구축합니다.
*   **주요 기능**: OpenClaude 연동 규격 분석, 로컬 소형 모델의 도구 호출(Tool Calling) 스키마 생성 오류 방어, 출력 토큰 및 컨텍스트 망각 극복 전략.

### 4. 네트워크 분할 라우팅 및 유튜브 연좌제 방지 아키텍처 (`04_network_yt`)
*   **핵심 사상**: 물리적 네트워크 어댑터 분리 한계를 로컬 프록시 바인딩으로 극복하고, 단일 웹뷰 기반 순차 스위칭으로 유튜브 연좌제(Chain Ban)를 완벽히 회피합니다.
*   **주요 기능**: Flow 창(Wi-Fi) vs. 유튜브 창(LTE) 세션 프록시(`setProxy`) 분할, 단일 웹뷰 순차 전환 4단계 라이프사이클(업로드 -> 파기 -> LTE IP 변경 대기 -> 재생성), `persist:` 파티션 영속성을 통한 로그인 쿠키 100% 복원 및 하드웨어 지문 롤링.

---

## 🚀 단계별 개발 및 전환 로드맵 (Implementation Roadmap)

### Phase 1: 코어 레지스트리 및 그리드 레이아웃 개편
1.  `electron/main.js`의 전역 변수 `flowView`를 `flowViews = new Map()` 레지스트리 구조로 전환.
2.  `electron/ipc/layout.js`를 개편하여 컨테이너 영역을 N등분하는 2단계 그리드 계산 로직 구현.
3.  `electron/ipc/shared.js` 및 `flow-api.js`의 IPC 핸들러에 `viewId` / `profileId` 파라미터 주입.

### Phase 2: MCP 서버 다중 큐 및 파일 동시성 락 적용
1.  `mcp-server/index.js`의 모든 제어 도구 스키마에 `projectId` 필수 매개변수 추가.
2.  대시보드 UI(`App.jsx`) 및 메인 프로세스에 프로젝트별 다중 생성 대기열(`generationQueues`) 구축.
3.  디스크 I/O 충돌 방지를 위한 원자적 쓰기(Atomic Write) 패턴 및 메인 프로세스 IPC 뮤텍스 도입.

### Phase 3: 네트워크 분할 및 유튜브 순차 업로드 엔진 기동
1.  로컬 프록시 바인딩(CCProxy/3Proxy 등) 환경 구축 및 세션별 `setProxy()` 주입 로직 작성.
2.  유튜브 전용 단일 웹뷰(`ytUploadView`)의 4단계 순차 전환 라이프사이클 및 IP 변경 대기 IPC 브릿지 구현.
3.  하드웨어 지문 롤링(`rerollHardwareProfile`) 결합 테스트 및 최종 프로덕션 검증.
