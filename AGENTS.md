# ViraLoop Studio (VLStudio Desktop)

Electron 데스크톱 앱 - Google Flow AI로 이미지/비디오 생성 후 CapCut 프로젝트로 내보내기

## 기반 프로젝트
- whisk2capcut-desktop를 fork하여 Flow API로 교체
- AutoFlow Chrome 확장 (10.7.58)에서 역공학한 API 사용

## AI 에이전트 전역 규칙: 11대 순수 개발 전문 엔지니어링 매트릭스
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
11. **`exhaustive-audit-verification-cycle`**: [전수조사 폐루프] 5대 매트릭스(AST 스코프, 이벤트 전파, 레이어 격리, 렌더링 컨텍스트, 기획 명세 실측) 기반 전수조사-피드백-코드수정-재조사 폐루프 완결.

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

## 🎛️ 4대 폼팩터 독립 주권 전문 스튜디오 및 전용 템플릿 분리 절대 강제 규칙 (Four Sovereign Studios Law)
- **1. 모놀리식 단일 편집기 융합 전면 금지 (Zero Monolithic Editor)**:
  - 4대 폼팩터(1. 클래식, 2. 인스타, 3. 군림보, 4. 썰형)를 하나의 편집기 컴포넌트에 억지로 통합하고 탭 전환이나 if 조건문으로 분기 처리하는 땜질식 구현을 엄격히 금지한다.
  - 백엔드 렌더링 파이프라인과 단일 DB(`viral_loop.db`)가 단일한 것과 별개로, 프론트엔드 작업실은 **각 폼팩터에 100% 최적화된 독립 전용 편집기(`ClassicEditorStudio`, `InstaEditorStudio`, `GunlimboEditorStudio`, `SsulEditorStudio`)로 완전히 분리**해야 한다.
- **2. 템플릿 디자인 공방의 1:1 수직 격리 분리 (Dedicated Template Design Matrix)**:
  - 템플릿 디자인 화면 역시 4대 폼팩터별로 완전히 독립 분리한다.
  - 썰형 템플릿(헤더바, 메타데이터, 자막 누적 모드, 페페 밈)을 디자인할 때 군림보(훅 밴드, 0초 줌)나 인스타(프로필, 베댓) 속성이 섞이지 않도록 전용 템플릿 보관함과 디자인 도구를 1:1로 매칭한다.
- **3. 타 형식 UI 노이즈 0% 격리 (Zero Cross-Format Noise)**:
  - 각 전문 편집기에는 해당 형식에 반드시 필요한 캔버스 객체와 인스펙터 도구만 정갈하게 배치하며, 타 형식의 도구는 단 1개도 화면에 노출되지 않도록 완전 격리한다.
- **4. 프리미엄 일괄 생성 허브(One-Take Batch Hub) 직결**:
  - 일괄 생성 시작 단계에서 입력 소스(키워드/기사/썰/대본)와 타겟 폼팩터를 지정하여 대량 생산하고, 완료된 작업은 해당 전용 편집기 또는 렌더링 대기열로 직결한다.

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
## 💾 공식 운영 경로 및 단일 데이터베이스(viral_loop.db) 단일 진실 공급원 절대 규칙 (Single Database Sovereignty Law)
1. **공식 운영 영구 런타임 저장소 단일화**:
   - ViraLoop Studio의 모든 영구 상태 데이터(Google Flow 다중 세션 프로필, 미디어 캐시, DB, 백업)는 Windows 환경 기준 `%LOCALAPPDATA%\ViraLoop Studio\` (`C:\Users\<사용자명>\AppData\Local\ViraLoop Studio\`)를 단일 진실 공급원(Single Source of Truth)으로 삼는다.
2. **단일 SQLite 데이터베이스 (`viral_loop.db`) 원칙 (Zero DB Fragmentation)**:
   - 시스템 내에서 분리된 임의의 SQLite DB 파일(`discover.db`, `hermes_state.db`, `cache.db`, `app.db`, `vl_database_dev.db` 등) 생성을 전면 금지하며, 오직 **`viral_loop.db`** 하나만을 공식 데이터베이스로 사용한다.
   - 모든 채널, 영상, 대본, 템플릿(`shorts_templates`), 자막/더빙 작업(`subtitle_jobs`), Hermes AI 상태(`hermes_fts`), 환경설정(`settings`), 캐시(`cache_entries`)는 `viral_loop.db`에 통합 저장한다.
3. **환경설정 DB 백업/복원 단일화**:
   - 시스템의 원클릭 DB 백업(`POST /system/backup-database`)은 `%LOCALAPPDATA%\ViraLoop Studio\viral_loop.db`를 `%LOCALAPPDATA%\ViraLoop Studio\db\backups\` 폴더로 스냅샷 저장하며, 복원 시에도 이 단일 DB를 복원 대상으로 삼는다.
4. **파편화 DB 생성 및 참조 금지**:
   - 코드베이스 어디에서도 하드코딩된 별도 DB 생성이나 조회를 금지하며, 기존에 생성되었거나 분리된 DB가 발견될 경우 즉시 `viral_loop.db`로 테이블과 데이터를 통합 마이그레이션한다.

## 🛡️ 100% 계획 충족 및 무누락·무축소 개발 절대 규칙 (Zero Omission & Token-Trimming Prohibition Law)
1. **계획 100% 충족 의무**: 모든 기능 구현은 승인된 기획 및 설계 계획을 100% 완벽히 충족해야 하며, 개발자 임의로 기능을 누락시키거나 범위를 축소하는 행위를 엄격히 금지한다.
2. **토큰 절약 목적 코드 축소 전면 금지 (No Code Trimming for Token Saving)**: 모델의 토큰 소모를 줄이기 위해 코드를 생략하거나(TODO, 생략 주석 등), 단순화하거나, 모듈을 축소 개발하는 행위를 영구 금지한다. 필요한 모든 로직, 예외 처리, UI 인터랙션, 타입 정의는 완전한 프로덕션 레벨 코드로 온전히 작성한다.
3. **단계별 완료율·충족률 실시간 자체 평가 및 즉시 보완 개발**: 개발의 각 단계가 완료될 때마다 계획 대비 완료율(%)과 충족률(%)을 자가 검증하여 보고하고, 기준에 미달하거나 부족한 부분이 발견될 경우 다음 단계로 넘어가기 전에 즉시 보완 개발을 완료한다.

## 🔄 절대 전수조사 및 폐루프 자체 치유 절대 규칙 (Exhaustive Audit & Closed-Loop Sovereignty Law)
사용자가 "전수조사", "전수 점검", "계획대로 되었는지 확인"을 지시했을 때, 에이전트는 아래 4대 폐루프 원칙을 헌법적 의무로 강제 준수해야 한다:

1. **단순 정적 텍스트 검색 및 무검증 빌드 기반 거짓 양성(False-Positive) 판정 원천 금지**:
   - `grep`, `includes`, `match` 등으로 "코드에 문자열이 존재한다"거나, `vite build`(타입 미검증 고속 번들러)가 성공했다는 이유만으로 런타임 정상 동작을 단정하는 기만 행위를 영구 금지한다.
2. **5대 다차원 물리 런타임 매트릭스 전수 검증 의무화**:
   - **0. AST 스코프 및 식별자 바인딩 무결성**: TypeScript Compiler API(`program.getSemanticDiagnostics`)로 수정 파일에 미선언 변수(`TS2304: Cannot find name`, `TS2552`)가 0개임을 입증하고, `contract-checker.js` Step 8을 필수 통과할 것.
   - **A. 이벤트 전달망 무결성**: 포인터 캡처(`setPointerCapture`), `stopPropagation`이 더블클릭이나 클릭을 가로채 증발시키는지 추적. 더블클릭 시간차(350ms 듀얼 감지) 안전망 확인.
   - **B. 시각 계층 및 레이어 스택 무결성**: 폼팩터 모드별(Classic, Ssul, Instagram, Gunlimbo) 레이어 완전 격리. 타 모드의 레터박스, 대제목, 자막이 누수되어 겹치지 않는지 확인. 유효하지 않은 CSS 클래스(`z-35` 등) 원천 차단.
   - **C. 렌더링 컨텍스트 및 스케일링 무결성**: 플로팅 창/인스펙터가 `scale()` 트랜스폼 내부에서 축소 왜곡되거나 `overflow-hidden`에 잘리지 않는지 확인.
   - **D. 기획 명세 1:1 실측 동일성**: 레퍼런스(Pixeling 등) 규격과 실제 화면 레이아웃이 1:1로 일치하는지 대조.
3. **가감 없는 결함 피드백과 근본 원인 해결 (No Excuses & Root-Cause Fix)**:
   - 발견된 결함을 미사여구로 포장하지 않고 물리적 증거(코드 라인, 차단 위치)를 가감 없이 보고하고, 즉시 근본적인 아키텍처 수정을 단행한다.
4. **전수조사-수정-재조사 폐루프 완결 의무**:
   - 수정한 후 반드시 재조사를 실시하여 결함이 100% 해소되었음을 입증해야 하며, 얻은 교훈을 바탕으로 스킬과 규칙을 지속적으로 고도화(Self-Evolution)한다.
