# ViraLoop Studio (VLStudio Desktop)

Google Flow AI 영상 생성, 4대 폼팩터 NLE 엔진, 모바일 USB LTE 다중 회선 스텔스 채널 육성, 하이브리드 스마트 업로드 배포까지 아우르는 올인원 3계층 주권 자율 팩토리 데스크톱 앱.

## 기반 프로젝트
- whisk2capcut-desktop를 fork하여 Google Flow AI 및 3계층 주권 자율 팩토리로 전면 재설계/확장
- AutoFlow Chrome 확장 (10.7.58) 및 독자 역공학 tRPC/OAuth/Patchright 네이티브 통신 파이프라인 탑재

## AI 에이전트 전역 규칙: 11대 순수 개발 전문 엔지니어링 매트릭스
모든 코드 작성, 아키텍처 설계, 리팩토링, 디버깅, 최적화 시 아래 11대 순수 개발 전문 스킬을 유기적으로 적용한다:

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

## 📁 9대 미디어 저장소 계층(`01~09`) 및 개발 저장소 내 결과물 생성 영구 전면 금지 절대 규칙 (Media Storage Hierarchy & Zero Repo Artifacts Law)
1. **`media` 9대 번호 표준 계층 단일 진실 공급원 (Strict 9-Tier Storage Hierarchy)**:
   - `%LOCALAPPDATA%\ViraLoop Studio\media\` 하위에는 오직 공인된 9개 디렉토리만 존재해야 하며, `media` 루트에 임의 폴더/파일을 직접 생성(`mkdir`)하거나 저장하는 행위를 영구 금지한다:
     - `01_Inbox`: 원본 입력 소스, 원본 대본
     - `02_Operations`: 미션별 실행 워크스페이스, 임시 처리 작업(`Temp/`, `work_queue_uploads/`, `subtitles/`)
     - `03_Assets`: 불변 폰트, 공용 모델, 사운드 에셋
     - `04_Profiles`: 브라우저 및 플랫폼 세션 프로필 (Google, TikTok 등)
     - `05_Exports`: 최종 렌더링 완성본, CapCut 프로젝트, 내보내기 결과물
     - `06_Database`: SQLite 단일 DB(`viral_loop.db`) 및 DB 스냅샷 백업(`backups/`)
     - `07_Downloads`: 외부 수집 영상, 채널 모니터링 다운로드 (`07_Downloads/{카테고리}/{채널}/...`)
     - `08_Intelligence`: AI 리서치, 위키, 지능 분석 보고서
     - `09_System`: 시스템 바이너리(`bin/adb`, `bin/ffmpeg`, `bin/git`, `bin/yt-dlp`) 및 로컬 핵심 모델
   - 다운로드 및 채널 수집의 단일 진실 공급원은 항상 `07_Downloads`이며, `settings.root_download_path`는 항상 `%LOCALAPPDATA%\ViraLoop Studio\media\07_Downloads`여야 한다.
2. **개발 저장소(Git Repo) 내 미디어/결과물 생성 영구 전면 금지 (Zero Repository Artifacts Law)**:
   - 개발 소스 코드 폴더(`c:\ViraLoopMedia\VLStudio`) 내부에 `05_Exports`, `downloads`, `temp` 등 런타임 결과물 디렉토리를 생성하거나 상대 경로(`Path("05_Exports")`, `os.path.join(os.getcwd(), "05_Exports")`)로 저장하는 행위를 영구 금지한다.
   - 모든 미디어 I/O는 단일 진실 공급원인 절대 경로(`app_settings.EXPORTS_DIR`, `app_settings.DOWNLOADS_DIR` 등)만을 강제 사용한다.
3. **정적 검증 게이트키퍼 강제 (`contract-checker.js`)**:
   - `contract-checker.js`에서 개발 루트 내 `05_Exports` 등 런타임 디렉토리 존재 여부와 `media` 루트 내 비표준 폴더 존재 여부를 정적 검사하여 위반 시 빌드를 즉시 차단한다.

## 🛡️ 100% 계획 충족 및 무누락·무축소 개발 절대 규칙 (Zero Omission & Token-Trimming Prohibition Law)
1. **계획 100% 충족 의무**: 모든 기능 구현은 승인된 기획 및 설계 계획을 100% 완벽히 충족해야 하며, 개발자 임의로 기능을 누락시키거나 범위를 축소하는 행위를 엄격히 금지한다.
2. **토큰 절약 목적 코드 축소 전면 금지 (No Code Trimming for Token Saving)**: 모델의 토큰 소모를 줄이기 위해 코드를 생략하거나(TODO, 생략 주석 등), 단순화하거나, 모듈을 축소 개발하는 행위를 영구 금지한다. 필요한 모든 로직, 예외 처리, UI 인터랙션, 타입 정의는 완전한 프로덕션 레벨 코드로 온전히 작성한다.
3. **단계별 완료율·충족률 실시간 자체 평가 및 즉시 보완 개발**: 개발의 각 단계가 완료될 때마다 계획 대비 완료율(%)과 충족률(%)을 자가 검증하여 보고하고, 기준에 미달하거나 부족한 부분이 발견될 경우 다음 단계로 넘어가기 전에 즉시 보완 개발을 완료한다.

## 🚫 가짜 모의(Mock) UI 생성 영구 전면 금지 및 원천 소스 재사용 100% 실체화 절대 규칙 (Zero Mock UI & 100% Functional Realization Law)
1. **가짜 껍데기 탭(Placeholder Tabs) 영구 전면 금지**:
   - 상단에 탭 버튼만 배치하고 하단에 공통 더미 폼을 띄우거나, 탭 전환 시 실제 전용 뷰/파라미터/워크플로우가 변경되지 않는 기만적 껍데기 구현을 영구 금지한다.
   - 올인원 생성 허브의 모든 탭(원테이크, 노래형, 롱투숏 v1/v2, 영화·드라마, 텍스트 창작, 영상 창작, 먹구리, 랭킹, 스톡모션, 롱폼 멀티)은 원천 코드에서 규명된 고유 입력 필드, 전용 설정 컨트롤, 독립 상태 머신, 실제 백엔드 연동 파이프라인을 100% 온전히 탑재해야 한다.
2. **비디오 편집기 가짜 캔버스 및 빈 인스펙터 영구 전면 금지**:
   - 비디오 편집기 화면에 검은 박스와 정적 텍스트 한 줄만 띄우거나, 인스펙터에 "클립을 클릭하면 세부 속성을 편집할 수 있습니다"라는 빈 플레이스홀더만 방치하는 가짜 구현을 영구 금지한다.
   - 실제 비디오/오디오 미디어 파일 로딩, 플레이어 시간축 동기화, 실제 타임라인 클립 조작, 선택된 클립의 실제 속성(배속, 볼륨, 불투명도, 크롭, 외곽선, 그림자 등)을 실시간 제어하는 완전한 인스펙터를 100% 구현해야 한다.
3. **역공학 원천 소스 1:1 재사용 및 주권 로컬 백엔드 도킹 의무화**:
   - 역공학으로 확보된 픽셀링의 5.9MB 원천 번들(`24259...js`, `page-5ca...js`)에 존재하는 실제 폼 구조, 데이터 스키마, 캔버스 렌더러, 단축키 메커니즘을 1:1로 정밀 이식하여 사용한다.
   - 백엔드는 픽셀링의 유료 클라우드 대신 바이럴루프의 로컬 백엔드(Faster-Whisper, Edge-TTS, DB Settings LLM, FFmpeg)로 1:1 매핑 결합하여 크레딧이나 외부 서버 의존 없이 100% 자율 동작을 실현한다.

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

## 🔒 채널 계정 보안 접속 및 스텔스 브라우저 100% 격리 절대 규칙 (Zero Normal Browser Leakage Law)
채널 계정 등록, 로그인, 수동 설정, 구글 OAuth2 API 권한 승인, 스튜디오 접속 등 계정 및 플랫폼(YouTube, TikTok, Instagram)과 관련된 모든 동작 시 아래 4대 보안 격리 헌법을 강제 적용한다:

1. **일반 시스템 브라우저 호출 영구 전면 금지 (Zero System/Normal Browser)**:
   - 계정 인증이나 권한 승인 시 시스템 기본 브라우저(`webbrowser.open`), 프론트엔드 일반 새 창(`window.open`), 또는 일반 Google Chrome 바이너리의 임의 실행을 엄격히 금지한다.
   - 이를 위반하여 사용자의 로컬 실제 공인 IP, 개인 Chrome 프로필, 브라우저 핑거프린트가 노출되거나 타 채널과 연좌제로 묶이는 보안 사고를 0%로 원천 차단한다.
2. **채널 프로필 1:1 바인딩 격리 스텔스 브라우저(CloakBrowser) 강제 직결**:
   - 계정의 모든 브라우저 조작(인증, 승인, 업로드, 로그인)은 반드시 **해당 채널/프로필에 영구 바인딩된 고유 프로필 폴더(`folder_path`)와 지정된 네트워크 IP(LTE SOCKS5 모바일 프록시 또는 ISP 고정 프록시)를 물고 뜨는 스텔스 브라우저(`stealth_ops.launch_for_setup`)**만을 단일 통로로 사용해야 한다.
3. **로컬 백엔드 통신 루프백 바이패스 무결성**:
   - OAuth 승인 콜백 등 내부 백엔드(`127.0.0.1:8000`)와의 통신이 필요한 경우, 외부 통신은 격리된 프록시 IP로 철저히 보호하되 로컬 루프백(`127.0.0.1, localhost`)만 안전하게 바이패스(`--proxy-bypass-list`)하여 통신 단절을 방지한다.
4. **정적 검증 게이트키퍼 강제 (`contract-checker.js`)**:
   - `contract-checker.js` Step 9에서 계정 인증 모듈(`oauth2_auth.py`, `TinCanVault.tsx`) 내 일반 브라우저 호출(`webbrowser.open`, `window.open`)을 정적 검사하여 위반 시 빌드와 커밋을 즉시 차단한다.

## 🌐 네트워크 독립 주권 & 모바일 USB LTE 다중 회선 & SOCKS5h 원격 DNS 절대 규칙 (Sovereign Network & Multi-Line Multiplexing Law)
채널별 회선 격리, 프록시 바인딩, IP 교체 및 외부 통신 시 아래 4대 네트워크 헌법을 강제 적용한다:

1. **채널 1:1 회선 격리 2대 축 단일 진실 공급원 (`DIRECT_LTE` vs `ISP_PROXY`)**:
   - **모바일 LTE 모드 (`DIRECT_LTE`)**: 각 채널은 `bound_device_serial`을 통해 USB 연결된 실제 안드로이드 기기와 1:1 바인딩되어 고유 포트(`1080~1089`)의 Every Proxy SOCKS5 회선을 강제 사용한다.
   - **ISP 고정 IP 모드 (`ISP_PROXY`)**: 전용 고정 프록시가 지정된 채널은 등록된 `proxy_host:proxy_port` 회선만을 물고 통신한다.
   - 채널 간 회선 혼용이나 로컬 실제 공인 IP 직결 통신을 0%로 원천 차단한다.
2. **업로드 및 주요 작업 전 소프트 IP 교체 (Soft IP Rotation) 원칙**:
   - 채널 전환 시 또는 동영상 업로드 시작 전, 바인딩된 모바일 기기의 `adb_service.rotate_ip(serial, method='soft')`를 통해 에어플레인 모드 토글로 통신사 공인 IP를 소프트 교체하고 새 IP 발급을 확인한 후 작업을 진행한다.
   - **대용량 파일 전송 중 회선 보호 인터락**: 단, 영상 파일 업로드 전송이 실제로 진행 중인 상태(`is_upload_in_progress`)에서는 회선 단절 사고를 방지하기 위해 IP 교체를 안전하게 생략(Skip)한다.
3. **DNS 유출 0% 보장 (Remote DNS / SOCKS5h SSOT)**:
   - 로컬 PC의 ISP DNS 쿼리 노출로 인한 채널 연좌제 및 위치 유출을 원천 방지하기 위해, 모든 백엔드 Python 네트워크 클라이언트(`httplib2`, `requests`, `httpx` 등)는 **반드시 원격 호스트에서 도메인을 해석하는 `socks5h://` 프로토콜(또는 `proxy_rdns=True`)**만을 단일 진실 공급원으로 사용한다.
   - Chromium 브라우저 엔진(`CloakBrowser`)은 `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` 및 `--disable-quic`을 기본 탑재하여 WebRTC 및 비인증 UDP를 통한 실제 IP 유출을 원천 차단한다.
4. **로컬 루프백 바이패스 무결성**:
   - 프록시 적용 시 반드시 `--proxy-bypass-list=127.0.0.1,localhost,<local>`을 등록하여 로컬 백엔드(`127.0.0.1:8000`) 및 Electron 내부 IPC 통신 단절을 방지한다.

## 🚀 하이브리드 업로드 배포 거버넌스 및 숙성 파이프라인 절대 규칙 (Hybrid Upload & Smart Aging Sovereignty Law)
동영상 업로드 배포 시 플랫폼 안전성과 속도를 극대화하기 위해 아래 3대 규칙을 강제 적용한다:

1. **2대 업로드 전략의 명확한 역할 분담 (`BROWSER_AUTO` vs `API`)**:
   - **스텔스 브라우저 자동화 (`BROWSER_AUTO`)**: 채널 독립 회선(LTE 또는 ISP)과 고유 핑거프린트 프로필(`folder_path`)을 물고 백그라운드 브라우저가 직접 크리에이터 스튜디오에 진입하여 업로드한다. 회선 및 브라우저 환경을 100% 격리 보호해야 하는 채널에 표준으로 적용한다.
   - **Google Data API (`API`)**: 사전 승인된 OAuth2 토큰을 통해 5초 이내에 초고속 업로드한다. 단, 회선 핑거프린트 보호를 위해 반드시 `ChannelNetworkGuard`를 통과하여 채널에 바인딩된 프록시/SOCKS5(`proxy_rdns=True`)로 터널링 통신해야 한다.
2. **지능형 스마트 숙성 공개 파이프라인 (Smart Aging Pipeline)**:
   - 즉시 공개 시 알고리즘 페널티를 방지하기 위해, 기본 업로드는 **비공개(Private)** 상태로 안전하게 진행한다.
   - **스마트 숙성 예약 (`smart_scheduled`)**: 영상 용량에 비례하여 15~30분 뒤 구글 클라우드 자동 공개(`publishAt`)를 예약하여 고화질 인코딩 및 알고리즘 검토 시간을 확보한다.
   - **하이브리드 공개 (`hybrid_public`)**: API로 5초 만에 비공개 업로드 후 15분간 숙성 검토를 거쳐 브라우저가 공개로 자동 전환한다.
3. **알고리즘 교란 엔진(Sovereign Mutation Engine) 인터락**:
   - 동일 영상 다채널 재업로드 시 연좌제 중복 필터링을 회피하기 위해, 업로드 직전 미세 비트레이트/FPS/오디오 주파수 변조(`apply_mutation`) 및 메타데이터 파괴를 필수로 통과한다.

## 🖥️ 윈도우 인터랙티브 데스크톱 런타임 수호 및 AI 세션 임의 백엔드 실행 영구 전면 금지 절대 규칙 (Windows Desktop Interactive Sovereignty Law)
본 프로젝트(ViraLoop Studio)는 헤드리스 웹 서버가 아니라, **사용자의 물리 모니터 화면(`WinSta0\Default`)에 직접 네이티브 일렉트론 GUI와 스텔스 크롬 브라우저(CloakBrowser/Chromium) 창을 띄워 사용자가 직접 시각적으로 검수하고 상호작용하는 'Windows Native GUI 데스크톱 앱'**이다. 아래 5대 원칙을 헌법적 의무로 강제한다:

1. **개발 및 운영 환경의 본질 단일 진실 공급원 (Interactive Desktop Context)**:
   - **개발 환경**: 실시간 빠른 확인과 디버깅을 위해 **사용자가 배치 파일(`ViraLoop Studio.bat`)을 통해 윈도우 데스크톱 대화형 세션(`cmd.exe`)으로 백엔드(FastAPI)와 프론트엔드(Vite Dev Server)를 직접 실행**한다.
   - **운영 환경**: Electron 데스크톱 패키징 앱으로서 사용자의 윈도우 로그인 데스크톱 환경에서 모든 프로세스가 구동된다.
   - 백엔드는 단순 데이터 API 서버가 아니라, **사용자 화면에 스텔스 브라우저 창(`local_browser.py`)을 팝업하고 탐색기(`explorer.exe`)를 호출하는 네이티브 데스크톱 브릿지** 역할을 수행한다.

2. **AI 에이전트의 백엔드 임의 백그라운드 구동 영구 전면 금지 (Zero AI Daemon Execution)**:
   - AI 에이전트(IDE 언어 서버, Antigravity 백그라운드 러너 등)의 실행 컨텍스트는 물리 모니터 화면 출력이 원천 차단된 **비인터랙티브(Non-Interactive) 백그라운드 가상 세션**이다.
   - AI 에이전트가 편의나 테스트 목적으로 `run_command`나 백그라운드 태스크를 통해 `uvicorn` 백엔드를 직접 띄우는 행위를 **영구 전면 금지**한다.
   - **금지 사유**: 비인터랙티브 세션에서 백엔드가 구동되면, 백엔드가 호출하는 모든 크롬 GUI 창(`chrome.exe`)이 사용자의 물리 모니터에 나타나지 못하고 보이지 않는 백그라운드 가상 데스크톱에 영구 감금되어 **"화면에는 창이 안 뜨는데 백그라운드에서는 좀비 크롬이 프로필 락을 쥐고 시스템을 마비시키는 치명적 장애"**를 100% 유발하기 때문이다.

3. **사용자 구동 프로세스 임의 강제 종료(taskkill) 및 가로채기 금지 (Zero Process Hijacking)**:
   - 사용자가 `ViraLoop Studio.bat` 또는 터미널을 통해 띄워둔 정상적인 대화형 백엔드/프론트엔드 프로세스를 AI 에이전트가 임의로 `taskkill`하여 죽이거나 가로채는 행위를 엄격히 금지한다.
   - 백엔드 재시작이 필요한 코드 수정이 발생한 경우, **AI가 몰래 프로세스를 재시작하지 않고 반드시 사용자에게 "배치 파일 또는 백엔드 콘솔 창 재시작"을 명확히 안내하고 요청**해야 한다.

4. **환경 오류에 대한 추측성 코드 훼손 금지 (No Guesswork Code Distortion)**:
   - 브라우저 창이 뜨지 않는 등의 런타임 문제가 발생했을 때, 프로세스 실행 환경(Interactive vs Non-interactive Desktop)을 확인하지 않고 정상 동작하던 `local_browser.py`, `stealth_ops_v2.py`의 윈도우 플래그(`creationflags`), 뷰포트(`no_viewport`), Win32 API 호출 등을 개발자 임의로 추측하여 코드를 훼손(Code Trimming & Guesswork Patching)하는 행위를 영구 금지한다.

5. **좀비 프로세스 및 프로필 잠금 자가 치유 의무**:
   - 비정상 종료된 브라우저나 유령 크롬 프로세스가 프로필 폴더(`SingletonLock`, `lockfile`)를 쥐고 있을 경우, 스텔스 접속 및 자동화 시작 전 이를 즉시 감지하여 안전하게 격리 해제(Cleanup)해야 한다.

## 🔏 스텔스 브라우저 다중 창 동시성 및 세션 우선순위 절대 규칙 (Stealth Session & Multi-Window Concurrency Law)
- **상세 규격서**: `docs/STEALTH_SESSION_CONCURRENCY_SPEC.md`를 단일 진실 공급원(SSOT)으로 삼는다.
- **1. 3단계 논리적 우선순위 절대 준수 (3-Tier Priority Law)**:
  - **Level 1 (최상위): 대표님 수동 보안 접속 (`USER_INTERACTIVE`)**: 로그인, 2단계 인증, 계정 세팅 등 인간의 직접 조작. 절대 불가침 선점권을 가지며 그 어떤 자동화 봇도 이를 간섭하거나 종료할 수 없다.
  - **Level 2 (차상위): 자동 배포 및 업로드 (`AUTOMATED_UPLOAD`)**: 편성 시간 준수 및 메타데이터 전송. 웜업보다 항상 우선순위를 가진다.
  - **Level 3 (최하위): 백그라운드 웜업 육성 (`BACKGROUND_WARMUP`)**: 홈 피드 시청 및 댓글. 상위 작업 요청 시 언제든 즉시 양보(Soft Abort/Yield)한다.
- **2. 대표님 수동 보안 접속 창 강제 종료(Kill) 영구 전면 금지 (Human Interactive Protection)**:
  - 백그라운드 자동화(업로드, 웜업)는 프로필을 점유할 때 반드시 `is_user_interactive_active(profile_id)`를 필수로 사전 검사해야 한다.
  - 대표님이 수동 조작 중인 활성 브라우저 창을 좀비 프로세스로 오인하여 강제 종료(`p.kill()`)하는 행위를 영구 금지한다.
  - 수동 세션 감지 시 즉시 `UserInteractiveActiveException`을 발생시켜 업로드 작업을 `PAUSED` 상태로 안전 대기시켜야 한다.
- **3. 동일 프로필 Chromium 디렉토리 독점 락 (Profile Mutex)**:
  - Chromium 엔진의 물리적 특성상 동일 프로필 디렉토리는 2개 이상의 프로세스가 동시에 열 수 없으므로, 프로필 ID 단위로 상호 배타적 세션 락을 강제한다.
- **4. 동일 모바일 LTE 기기 공유 채널의 직렬 큐잉 (Device Mutex)**:
  - 동일한 물리 안드로이드 기기(`bound_device_serial`)를 공유하는 채널들은 IP 교체 및 통신 단절 사고를 방지하기 위해 절대 동시 실행을 금지하며, 반드시 선행 작업 완료 후 IP가 회전된 다음 순차적으로 실행한다.
- **5. 최대 동시 활성 브라우저 수 제한 (Max Concurrency 3)**:
  - PC 하드웨어 과부하(GPU/RAM 멈춤)를 방지하기 위해, 시스템 전체에서 동시에 실행될 수 있는 최대 Chromium 브라우저 프로세스 수는 3개로 엄격히 제한한다.

## 🚫 가짜 모의(Mock) UI 생성 영구 전면 금지 및 원천 소스 재사용 100% 실체화 절대 규칙 (Zero Mock UI & 100% Functional Realization Law)
모든 컴포넌트 개발, 서브 스튜디오 구현, 역공학 포팅 작업 시 아래 5대 절대 헌법을 영구 강제한다:

1. **가짜 Mock UI/정적 껍데기/더미 탭 생성 영구 전면 금지 (Zero Mock/Placeholder UI)**:
   - 이름만 다르고 실제로는 동일한 정적 폼을 보여주거나, 버튼/탭을 눌렀을 때 껍데기 카드나 빈 안내문구("추후 구현 예정", "Mock")만 띄우는 행위를 일체 금지한다.
   - 모든 탭, 모드, 메뉴는 해당 목적에 맞는 독립적인 입력 필드, 전용 설정 파라미터, 상호작용 컨트롤, 캔버스/미디어 프리뷰, 실제 생성 파이프라인 트리거를 100% 온전히 갖추어야 한다.

2. **원천 소스(Pixeling RE 번들) 100% 무누락 재사용 및 실체화 (100% Source Code Functional Reuse)**:
   - 픽셀링 로컬 앱(`io.pixeling.desktop`) 및 프론트엔드 번들(`24259-e2b669ff1d273a05.js`, `page-5ca01b04f75cb3f3.js` 등)에서 역공학 추출된 실제 로직(3중 트랙 가사 동기화, 오디오 에너지 피크 감지, 얼굴 트래킹 리프레임, 0.4초 씬 감지, 먹구리 줌 팝 및 효과음 시퀀서, 랭킹 5단계 순위 밴드 등)을 1:1로 정확하게 분석하여 프론트엔드 컴포넌트로 완벽히 구현 및 재사용한다.

3. **거짓 보고 및 사탕발림 허위 완료 영구 금지 (Zero False Claims Policy)**:
   - 실제 코드가 작성되지 않았거나 껍데기만 만들어 놓은 상태에서 "완벽히 구현되었다", "100% 완료되었다"고 허위 보고하는 행위를 엄격히 금지한다.
   - 모든 보고는 실제 구현된 파일 경로, 컴포넌트 코드 라인, 인터랙션 동작 여부, 빌드 및 계약 검증 결과를 물리적 사실에 입각하여 가감 없이 진술한다.

4. **단일 진실 공급원(DB Settings & 단일 DB) 및 ViraLoop 생태계 100% 직결**:
   - 추출된 컴포넌트는 단순 스탠드얼론에 그치지 않고, 시스템의 DB Settings 지정 AI 모델, 4대 전문 스튜디오 템플릿, CapCut 1:1 초안 내보내기, 단일 DB(`viral_loop.db`) 작업 큐와 유기적으로 직결되어 실제 완성 영상을 산출할 수 있어야 한다.

5. **정적 및 런타임 폐루프 검증 통과 강제**:
   - 11대 전문 탭과 비디오 에디터는 `contract-checker.js` 및 `npm run build:dashboard` 빌드를 무결하게 통과해야 하며, 각 탭 전환 시 오류 없이 고유 화면이 렌더링되어야 한다.

