# ViraLoop Studio (VLStudio Desktop) 심층 분석 보고서 (Skills 반영)

본 문서는 현재 개발 중인 **ViraLoop Studio**의 전반적인 구조와 기능, 아키텍처, UI/UX를 분석하고 개선점을 도출한 결과 보고서입니다. 특히 내부 스킬 데이터베이스(`electron-development`, `frontend-design`)의 모범 사례를 적용하여 아키텍처 보안 및 프리미엄 디자인 방향성을 심층 분석했습니다.

---

## 1. 유튜브 연좌제(봇 차단) 회피를 위한 Electron 설계 분석

ViraLoop Studio는 Google Flow AI 웹 환경을 백그라운드(`WebContentsView`)로 제어합니다. 웹 스크래핑 및 자동화 시 동일한 IP나 브라우저 지문으로 여러 계정을 돌리면 "연좌제(Shadowban 또는 연쇄 계정 정지)"에 걸릴 위험이 매우 높습니다. 

### 현재 적용된 우회 기법 (Strong Points)
1. **하드웨어 지문 위장 (Hardware Fingerprint Profiles)**
   - `electron/main.js`에 NVIDIA, AMD, Intel GPU 사양을 랜덤화하는 프로필 시스템(`hardwareProfiles`)이 구축되어 있습니다.
   - 각 계정별 고정 프로필(`persist:flow_profile_xxx`)을 할당하여 서로 다른 기기에서 접속하는 것처럼 위장합니다.
2. **동적 스텔스 엔진 (CDP 활용)**
   - `navigator.webdriver`를 `false`로 변조하고 Chrome User-Agent를 덮어씁니다.
   - CDP(`Fetch.requestPaused`) 이벤트를 가로채어 API 페이로드에 Seed값이나 레퍼런스 이미지 데이터를 백그라운드에서 직접 주입(`injectImageBatchBody`)하여 봇 탐지를 피합니다.
3. **세션 및 쿠키 격리 (Partitioning)**
   - Electron의 Session `partition` 기능을 활용해 각 프로필마다 별도의 로컬 스토리지를 가집니다.

### 💡 심층 개선 제안 (Security & Bypass)
- **프록시(Proxy) 기반 네트워크 격리**: 하드웨어 지문이 달라도 IP가 동일하면 밴 위험이 있습니다. `Session.setProxy()`를 활용해 파티션(Profile)마다 개별 SOCKS5/HTTP 프록시를 할당하는 기능을 추가해야 합니다.
- **휴먼 에뮬레이션(Human Emulation) 강화**: DOM 직접 클릭(`el.click()`)은 구글의 reCAPTCHA v3에 비정상적인 행동으로 감지될 수 있습니다. CDP의 `Input.dispatchMouseEvent`를 활용해 Bezier 곡선 기반의 현실적인 마우스 궤적 이동 및 클릭 지연(Delay)을 구현해야 합니다.

---

## 2. 시스템 아키텍처 및 보안 (electron-development 스킬 반영)

### 현재 아키텍처
- **Frontend**: React 18 + Vite 6
- **Backend**: 파이썬 FastAPI 백엔드 (`apps/api`), Sovereign 에이전트 스웜 (`apps/swarm`)
- **Desktop Core**: Electron 36 (메인 프로세스에서 파일 I/O 및 파이썬 서브프로세스 감시)

### 💡 심층 개선 제안 (Architecture & Security)
> [!IMPORTANT]
> `electron-development` 스킬 지침에 따른 필수 보안 점검 및 아키텍처 최적화 사항입니다.

1. **IPC 통신 및 파일 시스템 보안 (Path Traversal 방어)**
   - 현재 `fs:*` (예: `electron/ipc/filesystem.js`) 네임스페이스를 통해 프론트엔드가 파일 I/O를 직접 요청합니다. 
   - 렌더러(프론트엔드)에서 전달되는 모든 파일 경로 파라미터는 메인 프로세스에서 엄격하게 검증(Sanitize)되어야 하며, 작업 디렉토리(Workspace)를 벗어나는 경로 접근(Path Traversal 공격)을 원천 차단해야 합니다.
2. **커스텀 프로토콜 렌더링 최적화**
   - 100장이 넘는 이미지 썸네일을 `fs`를 통해 base64로 렌더링하면 브릿지(Bridge) 오버헤드와 심각한 메모리 누수가 발생합니다. 
   - `protocol.registerSchemesAsPrivileged`를 활용해 `app://` 같은 안전한 로컬 이미지 전용 커스텀 프로토콜을 등록하고, 프론트엔드에서 `<img src="app://local-media-path">` 형태로 직접 렌더링하도록 구조를 변경해야 합니다.
3. **서브프로세스 라이프사이클 (Zombie Process 방지)**
   - 파이썬 서버 스폰 시 포트 충돌 해결 로직은 있으나, 메인 앱 강제 종료 시 고아(Orphan) 프로세스가 남을 수 있습니다. OS 레벨의 Job Object(Windows) 설정을 곁들여 완벽한 프로세스 트리를 관리해야 합니다.

---

## 3. 프리미엄 UI/UX 디자인 (frontend-design 스킬 반영)

### 현재 상태
- 듀얼 뷰 레이아웃 (탭/분할/상하) 지원.
- 오디오/SRT 타임코드 매칭 멀티 트랙 타임라인 제공.

### 💡 심층 개선 제안 (Distinctive Frontend Design)
> [!TIP]
> `frontend-design` 스킬의 "Design Feasibility & Impact Index (DFII)" 원칙에 따라, 뻔한 '제네릭 AI 템플릿'을 벗어나 명확한 미학적 정체성을 확립해야 합니다.

1. **미학적 방향성 설정: 'Industrial Studio (산업용 스튜디오)' 테마**
   - ViraLoop Studio는 무거운 미디어 렌더링과 대량 생성을 다루는 '전문가용 소프트웨어'입니다. 
   - 흔한 보라색/그라데이션(SaaS 기본 스타일)을 탈피하고, 어두운 계열의 차분한 모노톤(Dark Slate/Charcoal) 배경에 강렬한 액센트 컬러(Neon Cyan 또는 Alert Orange)를 사용하는 **Industrial / Utilitarian** 테마를 도입해야 합니다.
2. **시각적 계층 및 타이포그래피 (Typography Structure)**
   - `Inter`나 `Roboto` 같은 시스템 기본 폰트를 구조적으로 배치하고, 프로젝트 제목이나 상태 표시에는 뚜렷한 Mono(고정폭) 폰트(예: `JetBrains Mono`)를 혼합하여 "엔지니어링 툴"다운 신뢰감을 줘야 합니다.
3. **마이크로 인터랙션 (Micro-Animations & Motion)**
   - 의미 없는 화려한 애니메이션은 배제합니다. 대신, 비디오 폴링(`Phase 2`) 완료 시 썸네일 격자가 팝업되는 모션이나, 오디오 트랙을 드래그하여 스냅(Snap)할 때 미세한 햅틱/시각적 피드백(Framer Motion 활용)을 추가하여 조작의 정밀도를 높여야 합니다.

---

## 4. 기능적인 부분 분석 (Functional)

### 💡 개선 제안
- **백그라운드 렌더링 스로틀링 해제**: 긴 배치(Batch) 작업 중 사용자가 브라우저(WebContents) 탭을 내리거나 가려둘 때 생성 속도가 느려지지 않도록, Electron의 `app.commandLine.appendSwitch('disable-renderer-backgrounding')` 속성을 추가해야 합니다.
- **다이내믹 스키마 로딩**: CapCut `.json` 파일 구조가 업데이트될 때마다 데스크톱 앱 전체를 재배포해야 하는 현행 방식을 버리고, 매핑 템플릿 로직을 외부 클라우드(Firebase 등)에서 시작 시 동적으로 내려받는 플러그인 아키텍처로 개선하면 유지보수성이 크게 향상됩니다.
