# Google Flow AI 우회 패치 및 2026 안티디텍션 최적화 사양서

본 문서는 Google Flow AI의 "Unusual Activity" 차단 우회를 위한 CDP 디버거 Interceptor 제거 조치와 스텔스 `window.fetch` Monkey-patching 기법 및 2026년 기준 ViraLoop Studio에 우선 적용할 안티디텍션/격리 아키텍처 사양을 정리한 문서입니다.

---

## 1. Google Flow AI "Unusual Activity" 차단 우회 구현 (Stealth window.fetch Monkey-Patching)

### ① 기존 CDP 디버거 방식의 한계와 감지 메커니즘
- **기존 방식**: CDP `Fetch.enable`을 통해 네트워크 요청을 일시 중단하고 Payload를 변조하는 방식을 사용했음.
- **감지 원인**: 최신 Google 봇 탐지 시스템은 CDP 디버거 부착(`Fetch.enable` 활성화 상태) 자체와 이에 수반되는 브라우저 이벤트 스트림(consoleAPICalled 등)을 실시간 모니터링하여 "Unusual Activity"로 탐지 및 계정 차단을 유도함.
- **해결 원칙**: Google Flow AI 자동화 프로세스 중 CDP 디버거 세션의 상시 부착을 제거하고, 브라우저가 정상적으로 동작하는 것처럼 위장하여 감지를 회피함.

### ② window.fetch Monkey-Patching 기법 (flow-page-injection.js)
- **위장 주입**: WebContentsView 로드/네비게이션 시점에 [flow-page-injection.js](file:///c:/ViraLoopMedia/VLStudio/electron/flow-page-injection.js) 스크립트를 강제 주입함.
- **요청 변조 및 응답 가로채기**:
  - `window.fetch`를 래핑하여 이미지 생성(`batchGenerateImages`), 비디오 생성(`batchAsyncGenerateVideo*`), 업샘플, 상태 조회 요청의 Body를 로컬 상태값(`window.__autoflowcut_inject__`)에 맞게 변조함.
  - 응답 값을 복사(`res.clone()`)한 후 Electron 메인 프로세스(`flow:report-response` IPC)로 전송하여 CDP 없이도 완벽한 비디오/이미지 생성 상태 모니터링 및 완료 데이터 수집 체계를 구축함.
- **안티디텍션 (Anti-detection)**:
  - 변조된 `fetch.toString()`이 호출될 때 봇 탐지 스캐너를 우회하기 위해 `function fetch() { [native code] }`를 반환하도록 Spoofing을 적용하여 JS 변조 흔적을 소거함.

---

## 2. 2026 최신 안티디텍션 및 격리 우선 적용 사양

### ① DBSC (Device Bound Session Credentials) 대응 및 물리 프로필 격리
- **작동 원리**: Google은 세션 쿠키를 기기의 물리적 TPM(보안 하드웨어) 암호화 키 쌍에 바인딩하여 세션을 강제 고정함. 쿠키 파일만 추출하는 기존의 이전 방식은 DBSC 활성화 시 무효화됨.
- **최우선 적용 사항**:
  - 특정 브랜드 채널은 항상 동일한 물리적 가상 파티션/경로를 고정 사용하여 물리 프로필 무결성을 보존함.
  - 단순 쿠키 백업이 아닌 Local State, IndexedDB, Cache 폴더를 통째로 보존 및 동기화함.
  - `ytExportManager.js`에서 `Sec-Session-Registration` 헤더를 실시간 모니터링하여 DBSC 설정 채널은 "삭제 금지(Locked)" 메타데이터 플래그를 할당함.

### ② SOCKS5 IPv6 DNS Leak 방지 및 Zero-Latency IP 캐싱
- **작동 원리**: SOCKS5 프록시가 IPv4만 지원할 경우, Wi-Fi/Wired 어댑터의 IPv6 바인딩을 통해 DNS 쿼리가 유출되는 DNS Leak 및 실IP 누출 현상이 발생함.
- **최우선 적용 사항**:
  - `network_monitor.py`에 `Disable-NetAdapterBinding -ComponentID ms_tcpip6` 명령을 적용하여, Wi-Fi 및 LAN 어댑터의 IPv6 바인딩을 OS 수준에서 해제함.
  - 프록시 연결 시 매번 PowerShell을 호출하여 발생하는 레이턴시(약 1.5초)를 제거하기 위해, 백그라운드 스레드에서 어댑터 IP를 주기적으로 쿼리하여 메모리에 Zero-Latency 캐싱하는 체계를 유지함.

### ③ WeakMap 기반 Google 봇가드(Botguard) 및 WebAuthn(패스키) 동시 우회
- **작동 원리**: Google 로그인 시 강제 노출되는 Windows OS 레벨 패스키(WebAuthn) 선택 팝업을 차단하기 위해 JS를 변조하면 구글 봇가드가 프로토타입 체인 오염을 즉시 감지하여 차단함.
- **최우선 적용 사항**:
  - 로그인 팝업 전용 [login_preload.js](file:///c:/ViraLoopMedia/VLStudio/electron/login_preload.js) 내에 `WeakMap` 기반의 `toString()` Spoofing 기법을 적용하여 패스키 요청 API를 `NotAllowedError`로 안전하게 거부 처리하고, 이를 검사하는 봇가드에는 완벽한 `[native code]` 문자열을 제공함.
  - 이를 통해 "패스키 실패 -> 일반 비밀번호/OTP 화면"으로 구글 로그인 흐름이 안전하게 Fallback되도록 유도함.

---

## 3. 핵심 업데이트 적용 및 우선순위 검토 로드맵

| 우선순위 | 작업 항목 | 대상 모듈 / 파일 | 기대 효과 |
|---|---|---|---|
| **P0 (완료)** | **CDP 의존성 제거 및 window.fetch 주입** | [flow-page-injection.js](file:///c:/ViraLoopMedia/VLStudio/electron/flow-page-injection.js), [main.js](file:///c:/ViraLoopMedia/VLStudio/electron/main.js), [flow-api.js](file:///c:/ViraLoopMedia/VLStudio/electron/ipc/flow-api.js) | Google Flow AI "Unusual Activity" 차단 우회 및 이미지/비디오 생성 즉각 정상화 |
| **P0 (완료)** | **Google 로그인 봇가드 우회 주입** | [login_preload.js](file:///c:/ViraLoopMedia/VLStudio/electron/login_preload.js) | Windows 패스키 팝업 블로킹 및 구글 로그인 스텔스 통과 보장 |
| **P1 (검토)** | **USB 테더링 RNDIS 전원 관리 최적화** | `scripts/usb_power_fix.ps1` | Windows 전원 관리 옵션 자동화를 통한 장시간 생성 시 USB 끊김 현상 방지 |
| **P2 (검토)** | **IndexedDB 및 전체 UserData 영속화 백업** | `stealth_ops_v2.py` | Google의 신규 브라우저 시그널(빈 캐시) 탐지 우회 및 세션 장기 보존 |
