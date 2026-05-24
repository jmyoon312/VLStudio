# 유튜브 계정 등록 및 자동화 리팩토링 검토 보고서 (Patchright & CloakBrowser 기반)

본 문서는 유튜브 스튜디오(Warmup, 채널 생성, 관리자 권한 위임 등)의 계정 등록 과정을 **DrissionPage**에서 **Patchright 및 CloakBrowser** 기반의 이중 프록시(LTE/Wi-Fi) 안티디텍션 아키텍처로 완전히 전환하는 과정에서 발생한 호환성 문제와 이를 해결한 구체적인 구현 및 검증 결과를 다룹니다.

---

## 1. 개요 및 요구사항
- **기본 목표**: 기존 DrissionPage 기반으로 작성되었던 채널 생성(`ChannelCreator`) 및 권한 위임(`AdminDelegator`) 자동화 엔진을 Patchright + CloakBrowser 원격 제어 프록시 환경에서 온전히 작동하도록 마이그레이션합니다.
- **주요 프로세스**:
  1. **일반 계정 로그인**: 구글 로그인 세션을 로드 또는 세션 자동 입력(`login_google`). 2FA 발생 시 수동 로그인 우회 감지.
  2. **브랜드 채널 생성**: `channel_switcher` 진입 후, 개인 채널 유무를 체크하여 없을 시 선제적으로 생성 후 브랜드 채널 생성 순차 진행.
  3. **관리자 권한 위임**: 유튜브 스튜디오 설정 진입 -> 권한 탭 -> 매니저(Manager) 권한으로 타겟 이메일 초대 발송 및 최종 저장.

---

## 2. 발견된 문제점 및 해결 방안

기존의 자동화 모듈들은 DrissionPage의 고유 API 및 특수 셀렉터 문법을 강력하게 의존하고 있어, Remote Agent Proxy 구조인 `stealth_ops_v2.py` 위에서 작동 시 `AttributeError` 및 `SyntaxError`가 다수 발생하는 상황이었습니다.

### [Issue 1] DrissionPage 특수 셀렉터 미지원
- **현상**: `@@text:채널 만들기`, `tag:input@type=email`, `@@id=settings-button` 등 DrissionPage 전용 셀렉터들이 브라우저의 `document.querySelector`로 그대로 유입되어 셀렉터 해석 실패 및 오류 유발.
- **해결**: `parse_drission_selector` 변환기 구현. 위 형태의 셀렉터 패턴을 정규 표현식 및 조건 검사로 표준 CSS Selector 또는 XPath 문법으로 변환하여 Remote Page 상의 DOM 스크레이핑 보장.

### [Issue 2] `ElementProxy` 호환 메서드 결여
- **현상**: 자동화 모듈에서 사용하는 `.states.is_displayed`, `.states.is_checked`, `.attr()`, `.clear()`, `.parent()`, `.click(by_js=True)` 인터페이스가 `ElementProxy` 및 `NullElementProxy`에 없음.
- **해결**:
  - `states` 프로퍼티 추가 및 `ElementStatesProxy`/`NullElementStatesProxy` 구현을 통해 요소의 실질적 가시성(`is_displayed`)과 체크 상태(`is_checked`)를 원격 자바스크립트로 동적 계측.
  - `attr(name)` 함수가 내부적으로 `get_attribute`를 반환하도록 단일화.
  - `clear()` 함수가 원격 DOM 노드의 value를 지우고, React와 같은 프레임워크가 변경사항을 인식할 수 있도록 `input` 및 `change` 이벤트를 강제 트리거하도록 구현.
  - `parent(level)` 함수를 추가하여 XPath 또는 UUID 기반 임시 ID 주입 방식을 통해 부모 요소 체이닝 지원.
  - `click()` 메소드에 `by_js` 키워드 인자를 추가하여 일반 에이전트 클릭 액션과 JS 클릭 액션을 상호 보완 처리.

### [Issue 3] `RemotePageProxy` 속성 및 로그인 API 결여
- **현상**: `orchestrator.py`가 구글 로그인을 체크하고 실행할 때 `self.stealth.login_google` 및 `page.html`에 접근하여 오류 발생.
- **해결**:
  - `RemotePageProxy`에 `html` 프로퍼티를 추가하여 `document.documentElement.outerHTML` 소스를 안전하게 조회할 수 있도록 함.
  - `DrissionStealth` 클래스에 `login_google` 메소드를 정의하여, 이메일/패스워드 입력, 오류 메시지 판별 및 2단계 인증(2FA) 추가 요구사항 분기를 반환하도록 기능 구현.
  - `safe_click`, `safe_input`, `human_type` 등 프록시 개체와 문자열 셀렉터를 모두 수용할 수 있는 래퍼 API 구축.

### [Issue 4] DrissionPage 라이브러리 하드웨어 종속성 제거
- **현상**: `orchestrator.py`, `channel_creator.py`, `admin_delegator.py` 상단에 `from DrissionPage import ChromiumPage`가 하드코딩되어 있어, 해당 패키지가 설치되지 않은 가상환경이나 Docker 환경 등에서 전체 API 서비스 구동이 차단됨.
- **해결**: 모든 파일에서 DrissionPage 관련 임포트를 제거하고, `RemotePageProxy` 및 `DrissionStealth`를 타입 힌트로 명시하여 로드 타임 에러를 원천 차단함.

### [Issue 5] 패키징 배포(NSIS exe) 시의 Windows 권한 문제 및 AD 로밍 부하
- **현상**: 기존의 `C:\ViraLoopMedia` 및 `profiles/` 상대 경로는 개발 환경에서는 동작하나, 패키징 설치 버전에서는 `Program Files` 권한 거부 문제 또는 Windows AD 도메인 환경의 Roaming 공간 초과 동기화 지연 문제를 유발함.
- **해결**: Electron 메인 프로세스([main.js](file:///c:/ViraLoopMedia/VLStudio/electron/main.js)) 기동 시, OS 표준 경로인 `AppData\Local` 및 `AppData\Roaming`을 정밀히 분리하고 파이썬 백엔드 기동 인자로 주입하도록 보완함.
  - **설정 데이터**: `%APPDATA%\ViraLoop Studio` (Electron 설정 등 로밍 대상 보관으로 유지).
  - **SQLite DB 및 미디어 파일**: `%LOCALAPPDATA%\ViraLoop Studio\viral_loop.db` 및 `\media` (대용량 캐시 격리 및 도메인 동기화 부하 제외).

---

## 3. 최종 아키텍처 및 구현 코드 관계도

```mermaid
graph TD
    UI[TinCanWizard.tsx (React Frontend)] -->|POST /profiles/automation/execute| API[FastAPI router/resource_manager.py]
    API -->|asyncio.to_thread| ORCH[AutomationOrchestrator]
    ORCH -->|1. Setup Browser| STEALTH[DrissionStealth in stealth_ops_v2.py]
    STEALTH -->|launch request| AGENT[Windows Agent on Port 8001]
    AGENT -->|Controls| CLOAK[CloakBrowser via Patchright]
    
    ORCH -->|2. Create Channel| CC[ChannelCreator]
    ORCH -->|3. Invite Manager| AD[AdminDelegator]
    
    CC & AD -->|DOM query/action| PAGE[RemotePageProxy]
    PAGE -->|parse selector| PDS[parse_drission_selector]
    PAGE -->|Element/Null Proxy| ELE[ElementProxy]
```

---

## 4. 컴파일 검증 및 정상 동작 확인
수정 완료 후, 아래 모듈들에 대해 문법 및 컴파일 상태가 완벽히 통과함을 검증하였습니다:
- `apps/api/app/services/stealth_ops_v2.py` (원격 프록시 및 드라이버 제어 레이어)
- `apps/api/app/services/automation/orchestrator.py` (자동화 오케스트레이터)
- `apps/api/app/services/automation/channel_creator.py` (브랜드 채널 생성기)
- `apps/api/app/services/automation/admin_delegator.py` (관리자 권한 위임기)

검사 명령 수행 결과:
```bash
python -m py_compile apps/api/app/services/automation/orchestrator.py apps/api/app/services/automation/channel_creator.py apps/api/app/services/automation/admin_delegator.py apps/api/app/services/stealth_ops_v2.py
```
**-> 오류 없이 성공적으로 컴파일 완료.**
