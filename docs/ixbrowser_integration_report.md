# 안티디텍트 브라우저 전략 분석 보고서 (VLStudio 전체)

> VLStudio 전체 코드베이스 기준 자체 개발 안티디텍트 브라우저 기능 총 분석
> → iXBrowser 상용 제품으로 대체 가능성 연구
> 작성: 2026-07-21

---

## 0. 분석 범위

이 보고서는 **VLStudio 전체 코드베이스**를 기준으로 작성되었다.
`VLStudio-pool`은 이 분석의 결과물(구현체)을 별도 레포로 분리한 것일 뿐,
**분석 대상은 VLStudio 메인 모노레포 전체**이다.

---

## 1. 현재 구현된 자체 개발 안티디텍트 스택 (전체 매핑)

### 1.1 Electron 메인 프로세스

| 파일 | 역할 | iXBrowser 대체 가능? |
|------|------|---------------------|
| `electron/main.js` | BrowserWindow + WebContentsView 생성, 세션 파티션 격리, 하드웨어 프로필 로딩, stealth injection 제어, Google 로그인 창 분리 | ⚠️ **부분 가능** — iXBrowser의 Local API로 프로필 생성/관리는 가능하나, WebContentsView 기반 UI 임베딩 구조는 Electron 네이티브이므로 대체 불가 |
| `electron/profileManager.js` | 다중 프로필 저장/로드/스위치 + 하드웨어 핑거프린트(fingerprint) 할당 + fpSeed 생성 | ✅ **완전 대체 가능** — iXBrowser가 프로필당 고유 fingerprint + 저장소 제공 |
| `electron/stealth_preload.js` | **핵심 스텔스 엔진** — Function.prototype.toString 위장, webdriver=false, Canvas/Audio 노이즈, WebGL Override, navigator.connection 위장, window.chrome 객체 모킹, Notification/mimeTypes | ✅ **완전 대체 가능** — iXBrowser 자체가 C++ 레벨에서 동일한 모든 핑거프린트 조작 수행 |
| `electron/login_preload.js` | Google 로그인 페이지용 깨끗한 preload (stealth 우회 적용 안함) | ⚠️ **부분** — iXBrowser의 별도 프로필 창에서 로그인 처리 가능 |
| `electron/throttleManager.js` | 글로벌 레이트 리밋 (5s + jitter) — Flow 프롬프트 제출 간격 제어 | ❌ **해당사항 없음** — Flow API throttling은 브라우저 스텔스와 무관 |

### 1.2 IPC 레이어

| 파일 | 역할 | 비고 |
|------|------|------|
| `electron/ipc/ytExportManager.js` | 유튜브 업로드 CDP 자동화 | iXBrowser CDP debug port로 동일 기능 구현 가능 |
| `electron/ipc/video.js` | 비디오 생성/업로드 관련 IPC | 백엔드 로직, 브라우저 엔진과 무관 |
| `electron/ipc/flow-api.js` | Flow API 통신 | 브라우저 엔진과 무관 |
| `electron/ipc/auth.js` | 인증 관련 IPC | Google OAuth 로직 |
| `electron/ipc/dom.js` | DOM 조작 IPC | CDP로 대체 가능 |
| 기타 IPC 파일 | 파일시스템, 레이아웃, MCP 등 | 브라우저 엔진과 무관 |

### 1.3 FastAPI 백엔드

| 파일 | 역할 | 비고 |
|------|------|------|
| `apps/api/app/services/browser/*` | 브라우저 엔진 팩토리 (interface/cloak/ix/factory) | **이미 추상화 완료** — 두 엔진 모두 지원 |
| `apps/api/app/routers/browser.py` | `/api/browser/*` REST 엔드포인트 | 엔진 타입 선택 API |
| `apps/api/app/models.py` | Profile DB 모델 (engine_type 필드 포함) | `engine_type: cloakbrowser | ixbrowser` |

### 1.4 대시보드 (React)

| 파일 | 역할 | 비고 |
|------|------|------|
| `apps/dashboard/src/components/Settings.tsx` | 브라우저 엔진 선택 UI | cloakbrowser / ixbrowser 토글 |

### 1.5 네트워크 격리 (USB/LTE)

현재 코드베이스에서 **ADB → LTE SOCKS5 프록시 → 브라우저** 연결 자동화 코드는 **구현되지 않음**.
관련 아키텍처는 `docs/multi_phone_architecture.md`에 설계만 존재.

| 기능 | 구현 상태 | iXBrowser와 관계 |
|------|----------|-----------------|
| ADB USB 테더링 감지 | ❌ 미구현 (문서만 있음) | 브라우저 엔진 무관 — OS 레벨 |
| LTE 라우팅 → SOCKS5 프록시 | ❌ 미구현 | iXBrowser가 SOCKS5 프록시 설정 지원 → 연결만 하면 됨 |
| 프로필별 분리된 네트워크 인터페이스 | ❌ 미구현 | 브라우저 엔진 무관 |

---

## 2. iXBrowser로 대체 가능한 기능 vs 필수 유지 기능

### 2.1 ✅ iXBrowser로 완전 대체 가능

| 자체 개발 기능 | iXBrowser 대체 |
|---------------|---------------|
| 핑거프린트 위장 (Canvas, WebGL, Audio, Fonts, WebRTC 등) | iXBrowser C++ 엔진이 기본 제공 |
| `navigator.webdriver = false` 위장 | iXBrowser 자체 처리 |
| `navigator.hardwareConcurrency` / `deviceMemory` 조작 | 프로필 설정에서 지정 가능 |
| `navigator.languages` / `plugins` / `mimeTypes` 위장 | iXBrowser 자동 처리 |
| `window.chrome` 객체 모킹 | iXBrowser 자체 처리 |
| `Notification.permission` 위장 | iXBrowser 자동 처리 |
| `Function.prototype.toString` 네이티브 위장 | iXBrowser C++ 레벨에서 처리 (더 강력) |
| Canvas/Audio 결정론적 노이즈 (LCG) | iXBrowser 프로필별 fingerprint 분기 처리 |
| 세션 파티션 격리 (`persist:flow_profile_*`) | iXBrowser 프로필별 독립 저장소 제공 |
| 하드웨어 프로필 저장/로드 | iXBrowser 프로필 API로 대체 |
| SOCKS5 프록시 연동 | iXBrowser 환경 설정에서 지원 |

### 2.2 ⚠️ iXBrowser로 부분 대체 가능 (추가 구현 필요)

| 자체 개발 기능 | 대체 방안 |
|---------------|----------|
| 유튜브 업로드 CDP 자동화 | iXBrowser CDP debug port 사용 → 기존 `ytExportManager.js` 로직 재사용 |
| Google Flow API 통신 | iXBrowser 브라우저에서 실행되는 웹앱이므로 동일 |
| CDP Fetch 주입 (seed, image, I2V) | iXBrowser CDP session으로 동일 패턴 사용 가능 |

### 2.3 ❌ iXBrowser로 대체 불가 (Electron 네이티브)

| 기능 | 이유 |
|------|------|
| WebContentsView 기반 UI 임베딩 | Electron이 브라우저를 앱 내에 임베딩하는 구조 — iXBrowser는 별도 프로세스 |
| 다중 WebContentsView 동시 표시 | iXBrowser는 각 프로필이 별도 창 → VLStudio의 unified UI와 구조 상이 |
| Canvas Screencast (Flow UI 미러링) | Playwright screencast 기반 — iXBrowser 지원 안함 |
| Google 로그인 창 격리 (`openPureGoogleLoginWindow`) | Electron BrowserWindow 기반 |
| 응답 파싱/미디어 처리 로직 | 비디오/이미지 처리 — 브라우저 엔진과 무관 |

---

## 3. 연좌제 위험 관점 분석

### 3.1 현재 자체 개발 스택의 위험

```
자체 개발 스택 유지 시 연좌제 위험 요인:

1. Chromium 업데이트 지연
   → Google 탐지 알고리즘이 최신 Chrome 기능을 요구할 때 대응 늦음
   → 실제 사례: Chrome 124→125 업데이트 시 WebGL fingerprinting 방식 변경

2. C++ 패치 유지보수
   → CloakBrowser의 58개 Chromium 패치 중 일부가 신규 버전에서 컴파일 실패
   → 해당 기간 동안 모든 계정이 unprotected 상태로 노출

3. JavaScript 레벨 스텔스 한계
   → `Function.prototype.toString` 위장 등 JS 레벨 패치는 C++ 레벨보다 탐지 쉬움
   → Google Botguard는 JS 컨텍스트 스캔으로 가짜 native code 탐지 가능

4. 단일 실패점 (Single Point of Failure)
   → CloakBrowser 하나만 의존 → 해당 레포가 죽으면 전체 시스템 마비
```

### 3.2 iXBrowser 도입 시 위험 완화

```
iXBrowser + CloakBrowser 이중화 시:

1. Chromium 업데이트: iXBrowser 제조사가 자동 대응 → 리드타임 0
2. C++ 패치: iXBrowser가 알아서 함 → 유지보수 필요 없음
3. JS 레벨 탐지: iXBrowser C++ 엔진이 JS 컨텍스트보다 상위 레벨에서 차단
4. 단일 실패점: CloakBrowser 죽으면 iXBrowser로 즉시 전환 (BrowserFactory 선택)
```

### 3.3 iXBrowser의 리스크

| 리스크 | 대응 |
|--------|------|
| iXBrowser 자체가 탐지됨 | iXBrowser는 한국 유저 대상 제품 → Google 탐지 리스크 낮음. 단, 대규모 사용 시 패턴 분석 가능성 |
| iXBrowser API 정책 변경 | Local REST API는 안정적이나, 유료화/정책 변경 가능성. 무료 버전 프로필 수 제한 확인 필요 |
| iXBrowser 업데이트로 인한 CDP 호환성 깨짐 | iXBrowser 버전 업 시 CDP debug port 동작 확인 필요. 테스트 자동화 권장 |

---

## 4. 최종 아키텍처 권장

```
현재 구조 (자체 개발 단일):
  Electron App ─── WebContentsView ─── Stealth Preload ─── CloakBrowser ─── YouTube
                      (UI)               (JS Level)         (C++ Level)

권장 구조 (이중화):
  VLStudio App ─── FastAPI (BrowserFactory)
                      │
                      ├── "cloakbrowser" ─── CloakBrowserEngine (주력, default)
                      │     ├── Playwright → CDP → YouTube
                      │     ├── Stealth preload (JS level)
                      │     └── Auto-update: GitHub 최신 코드 fetch
                      │
                      └── "ixbrowser" ─────── IXBrowserEngine (안전망, fallback)
                            ├── Local REST API → 프로필 생성/관리
                            ├── CDP debug port → YouTube 업로드
                            └── 모든 fingerprint는 iXBrowser 자체 처리
```

### 4.1 엔진 선택 기준

| 상황 | 선택 |
|------|------|
| 정상 운영 | CloakBrowser (성능 좋음, 무료) |
| CloakBrowser 업데이트 지연 발견 | iXBrowser로 전환 (Settings UI에서 토글) |
| 특정 계정에서 탐지 의심 | 해당 계정만 iXBrowser로 개별 전환 |
| 신규 계통 (고위험) | iXBrowser로 시작 (C++ 레벨 보안 확보) |

### 4.2 마이그레이션 로드맵

| 단계 | 작업 | 기한 |
|------|------|------|
| P0 | ✅ BrowserInterface 추상화 완료 | 완료 |
| P0 | ✅ CloakBrowserEngine 구현 | 완료 |
| P0 | ✅ IXBrowserEngine 구현 | 완료 |
| P0 | ✅ DB 스키마 확장 (`engine_type`) | 완료 |
| P0 | ✅ REST API 라우터 + Settings UI | 완료 |
| P1 | CloakBrowser 자동 업데이트 기능 (GitHub fetch → build) | 1주 |
| P1 | iXBrowser CDP upload 안정화 (retry, timeout, fallback) | 1주 |
| P2 | ADB → LTE SOCKS5 → iXBrowser 프록시 체인 자동화 | 2주 |
| P2 | 연좌제 모니터링 대시보드 (계정별 엔진 상태 표시) | 2주 |
| P3 | 부하 테스트: CloakBrowser vs iXBrowser 동시 10계정 운영 | 3주 |

---

## 5. 코드 수정 사항 요약 (이미 적용됨)

### 5.1 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `apps/api/app/services/browser/interface.py` | BrowserInterface 추상 클래스 정의 |
| `apps/api/app/services/browser/cloak_engine.py` | CloakBrowser CDP 엔진 구현 (Playwright) |
| `apps/api/app/services/browser/ix_engine.py` | iXBrowser Local API + CDP 엔진 구현 |
| `apps/api/app/services/browser/factory.py` | 엔진 팩토리 + register_engine() 패턴 |
| `apps/api/app/services/browser/__init__.py` | 모듈 초기화 |
| `apps/api/app/routers/browser.py` | `/api/browser/engine` API + 프록시 설정 |
| `apps/api/app/models.py` | Profile에 `engine_type` 필드 추가 |
| `apps/api/app/main.py` | browser 라우터 등록 |

### 5.2 영향도

- **기존 CloakBrowser 로직 변경 없음** — fallback으로만 사용
- **기존 Profile DB와 호환** — `engine_type` 기본값 `cloakbrowser`
- **React Settings UI** — 엔진 선택 토글만 추가
- **Electron main.js, profileManager.js, stealth_preload.js** — **수정 없음** (iXBrowser 사용 시 이들 파일은 무시됨)

---

## 6. 최종 평가

```
판단: iXBrowser 도입으로 연좌제 위험 실질적 감소 가능.

이유:
1. CloakBrowser와 iXBrowser는 독립적인 엔진 → 동시에 탐지될 확률 낮음
2. iXBrowser C++ 레벨 스텔스는 JS 레벨보다 탐지 회피에 유리
3. 프로필별 엔진 선택 가능 → 중요한 계정은 iXBrowser로 이중 보호
4. 업데이트 지연 리스크를 두 엔진이 커버 → 단일 실패점 제거

조건:
1. iXBrowser 무료 버전의 프로필 수 제한 확인 필요
2. CDP debug port 버전 호환성 테스트 주기적 수행
3. ADB/LTE 네트워크 격리 모듈은 별도 구현 필요 (iXBrowser와 무관)