# ViraLoop Studio (VLStudio Desktop)

Electron 데스크톱 앱 - Google Flow AI로 이미지/비디오 생성 후 CapCut 프로젝트로 내보내기

## 기반 프로젝트
- whisk2capcut-desktop를 fork하여 Flow API로 교체
- AutoFlow Chrome 확장 (10.7.58)에서 역공학한 API 사용

## AI 에이전트 전역 규칙: 10대 순수 개발 전문 엔지니어링 매트릭스
모든 코드 작성, 아키텍처 설계, 리팩토링, 디버깅, 최적화 시 아래 10대 순수 개발 전문 스킬을 유기적으로 적용한다:

1. **`clean-architecture-guardian`**: [아키텍처] Electron 3-Tier 계층 분리, 의존성 역전, Single Source of Truth 수호.
2. **`code-refactoring-patterns`**: [리팩토링] 모놀리식 컴포넌트 해체, 단일 책임 원칙(SRP), Strategy/Adapter 패턴 적용.
3. **`async-concurrency-state`**: [동시성/상태] Race Condition 방지, React 18 동시성 제어, 디스크-메모리 자가치유 복원.
4. **`electron-web-synergy`**: [네이티브 브릿지] WebContentsView 레이아웃 제어, 다중 구글 세션 격리, OS 바인딩.
5. **`network-api-reverse-engineer`**: [역공학 통신] Chrome 확장(AutoFlow) 번들 및 tRPC/OAuth/WebSocket 네이티브 재구축.
6. **`media-codec-binary-pipeline`**: [미디어 바이너리] Base64/Buffer 메모리 최적화, 마이크로초(`ms * 1000`) 정밀 타임코드 연산.
7. **`storage-database-lifecycle`**: [스토리지 I/O] `05_Exports` 표준 저장소 규칙, 원자적 파일 쓰기 락(`withProjectWriteLock`).
8. **`bulletproof-fullstack-dev`**: [인터페이스 계약] Renderer ↔ Preload ↔ Main 3계층 계약 무결성 검증기(`contract-checker.js`).
9. **`systematic-debugging`**: [과학적 디버깅] 추측성 수정 배제, 가설 수립 및 4대 상태 추적 기반 5단계 결함 격리.
10. **`performance-memory-profiler`**: [성능 최적화] Electron GPU/V8 메모리 누수 방지, 가상 렌더링, IPC 오버헤드 최소화.

- 모든 작업 전후 반드시 `contract-checker.js` 및 `storage-validator.js`를 실행하여 계약 무결성을 입증할 것.

## 🎯 전역 인공지능 엔진 절대 규칙: 내부 작업 환경 설정(DB Settings) 단일 진실 공급원
- **절대 원칙 (AI 모델/공급자 하드코딩 완전 금지 - Zero Hardcoding Policy)**:
  1. **임의 모델 하드코딩 절대 금지**: `gemini-1.5-flash`, `gpt-4o`, `auto` 등 특정 모델명 문자열을 코드 기본값, fallback 파라미터, 하드코딩 대체값으로 직접 박아넣는 행위를 엄격히 금지한다.
  2. **사용자 지정 DB Settings 절대 존중**: 모든 AI 생성, 대본 분석, 프롬프트 작성, 테스트 챗은 **시스템의 작업 환경 설정(DB Settings: `script_analysis_model`, `default_llm_model`, `youtube1_api_keys`)에 지정된 모델과 자격 증명만을 단일 진실 공급원(Single Source of Truth)으로 실시간 동적 연동**하여 사용한다.
  3. **임의 모델 강제 변환/덮어쓰기 금지**: 사용자가 선택한 모델(예: `viraloop1`)을 개발자 임의로 `auto`나 다른 모델명으로 가로채거나 덮어쓰는 행위를 영구 금지한다.
  4. **사용자 맞춤 모델(Combo) 및 스마트 라우터 중심 정제 유지**: OmniRoute 게이트웨이의 수백 개 외부 모델 난립으로 인한 혼선을 방지하기 위해, **사용자가 직접 명명한 모델(Combo, 슬래시 없는 모델명: 예 `viraloop1`)과 핵심 스마트 라우터(`auto`, `auto/*`), 그리고 DB Settings 지정 모델만을 깔끔하게 선별하여 제공**한다.
  5. **정적 검증 게이트키퍼 강제**: `contract-checker.js`에서 AI 모델명 하드코딩을 자동 검사하여 위반 시 빌드를 차단한다.

## 🏛️ 3계층 주권 자율 팩토리 & 3차원 직교 격리 아키텍처 절대 강제 규칙 (Single Sovereign Architecture Law)
- **상세 규격서**: `docs/3_TIER_SOVEREIGN_AUTONOMOUS_FACTORY_SPEC.md`를 단일 진실 공급원(SSOT)으로 삼는다.
- **1. 3계층 조직 엄격 준수 (Strict 3-Tier Topology)**:
  - **Tier 1 (루피 총사령탑 / Hermes Brain)**: 전역 자원 중재(`GlobalArbiter`: GPU 세마포어 최대 2개, 프록시 지터링, API 예산), 대표님 1:1 직속 비서(텔레그램 양방향 결재), 전역 킬스위치.
  - **Tier 2 (채널별 중간 관리자 / Channel Directors)**: 각 채널 독립 인스턴스, 7단계 독립 상태 머신, 독립 격리 보안망(`ChannelNetworkGuard`), 채널 독립 큐.
  - **Tier 3 (전문 실행 하수인 / 8대 에이전트 Roster)**: Scout, Writer, Critic, Voice, Visual, Cutter, Assembler, Deployer 및 미디어 바이너리 파이프라인.
- **2. 정보 오염 0% 보장: 3차원 직교 격리 원칙 (3-Axis Orthogonal Sandbox)**:
  - **축 1 [채널 주권 DNA 샌드박스]**: 장르/도메인(정치, 경제, 야담, 철학, 종교, 애니 등) 톤앤매너, 어휘집, 금기어를 `BrandChannel.expert_identity` / `style_signature`에 완전 격리 보관. 타 채널 침범 절대 금지.
  - **축 2 [제작 워크플로우 매트릭스]**: 입력 소스 형태(`video_present`, `script_present`, `keyword_only`, `minimal_hook`, `deep_narrative`)에 따라 워크플로우 자동 분기.
  - **축 3 [지능 연산 엔진 슬롯]**: OmniRoute 콤보 게이트웨이 무상태(Stateless) 라우팅. 기본 4대 체급 콤보(`viraloop-story`, `viraloop-fast`, `viraloop-global`, `viraloop-bespoke`) 및 장르별 전용 콤보 무제한 확장.
  - **무오염 결합**: 매 작업 발주 시 `[축 1 DNA] ⊕ [축 2 모드]`를 결합한 일회성 독립 페이로드로 `[축 3 엔진]`에 전송하여 채널 간 간섭 0% 보장.
- **3. 리소스 인터락 거버넌스 필수 통과**:
  - 미디어 렌더링/다운로드는 반드시 `GlobalArbiter` GPU 세마포어를 통과해야 하며 직접 실행을 금지한다.
  - 대본은 `Critic-85`의 85점 게이트키퍼를 통과해야만 미디어 생성 단계로 진입할 수 있다.

## 🎨 전역 UI/UX 통일성 및 멀티 플랫폼(Electron·웹·모바일) 렌더링 무결성 절대 규칙 (Universal UI/UX Sovereignty Law)
모든 프론트엔드 신규 화면 구현, 컴포넌트 추가, 기존 화면 리팩토링 시 아래 4대 UI/UX 절대 헌법을 강제 적용한다:

1. **디자인 시맨틱 토큰 단일 진실 공급원 (Zero Theme Hardcoding)**:
   - `bg-slate-900`, `bg-white`, `text-black`, `text-slate-100`, `border-slate-800` 등 특정 테마(라이트/다크 중 하나)에만 고정되는 원시 컬러 클래스의 단독 사용을 전면 금지한다.
   - 모든 컴포넌트는 Tailwind CSS 변수 기반 시맨틱 토큰만을 사용해야 한다:
     - 컨테이너/카드 배경: `bg-background`, `bg-card`, `bg-muted`, `bg-popover`, `bg-accent`
     - 텍스트/라벨: `text-foreground`, `text-card-foreground`, `text-muted-foreground`, `text-accent-foreground`
     - 경계선/구분선: `border-border`, `border-border/60`, `divide-border`
     - 강조/브랜드 액센트: `bg-primary`, `text-primary-foreground`, `bg-secondary`
     - 컬러풀 뱃지/지표: `text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/20`와 같이 반드시 라이트/다크 듀얼 모드 페어링을 준수한다.
2. **라이트 모드 & 다크 모드 100% 양방향 시인성 및 가독성 수호 (Contrast Sovereignty)**:
   - 라이트 모드 전환 시 카드가 뜬금없이 검은 박스로 보이거나, 흰 배경에 연회색 텍스트가 묻혀 안 보이는 현상(Contrast Failure)을 원천 차단한다.
   - 모든 패널과 카드 박스는 모드에 관계없이 입체감과 위계를 갖추도록 `border border-border/80 shadow-xs dark:shadow-none`을 표준으로 채택한다.
3. **3대 환경(Electron 데스크톱 + 크롬 웹 브라우저 + 모바일/태블릿) 완벽 적응형 반응형 레이아웃**:
   - **Fixed-width 파괴 금지**: 고정 픽셀 가로폭(`w-[800px]` 등)을 금지하고, 반응형 유동폭(`w-full max-w-5xl mx-auto`, `min-w-0`)을 적용한다.
   - **텍스트 오버플로우 방어 (Bulletproof Typography)**: 긴 채널명, 동영상 제목, URL, 태그는 작은 화면에서 컨테이너를 찢고 튀어나가지 않도록 `truncate`, `line-clamp-N`, `break-all`을 기본 탑재한다.
   - **적응형 그리드(Responsive Grid)**: 탭이나 통계 그리드는 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` 형태로 화면 폭에 따라 자연스럽게 감싸지도록(Wrap) 구현한다.
   - **터치 & 포인터 세이프존**: 모바일/태블릿 브라우저 및 고해상도 터치 모니터 사용자를 고려하여 인터랙션 버튼/탭의 최소 높이를 `h-8`(32px) 이상 확보한다.
4. **정적 검증 게이트키퍼 강제 (`contract-checker.js`)**:
   - `scripts/contract-checker.js`에서 페이지 단위의 테마 토큰 위반(하드코딩된 다크 전용 클래스 `bg-slate-900` 등)을 자동 검사하여 위반 시 빌드를 차단한다.


