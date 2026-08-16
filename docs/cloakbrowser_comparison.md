# Automation Engine Comparison: CloakBrowser vs Others

We analyzed **CloakBrowser** (github.com/CloakHQ/CloakBrowser) against our previously considered engines (DrissionPage, Patchright, Camoufox). 

## 1. Engine Comparison Matrix

| Feature / Engine | DrissionPage | Patchright | Camoufox | CloakBrowser (NEW) |
| :--- | :--- | :--- | :--- | :--- |
| **Base Browser** | Stock Chromium | Stock Chromium | Firefox | **Custom Patched Chromium** |
| **Stealth Method** | CDP + JS Injection | CDP + JS Overrides + Flags | C++ Source Level | **C++ Source Level (58 Patches)** |
| **API Compatibility**| Custom (Python only) | Playwright API | Playwright API | **Playwright API** |
| **Bot Detection** | High risk (Cloudflare/Google) | Medium (Passes some) | Low (Passes most) | **Zero (Passes Turnstile, reCAPTCHA v3 0.9)** |
| **Behavioral Spoof**| Manual | Manual | Basic | **Native `humanize=True` (Bézier curves, typing)** |
| **YouTube Suitability**| Low (Easily flagged) | Medium | Medium (Firefox is rare for Studio) | **Ultimate (Native Chrome fingerprint)** |
| **Maintenance** | Active but stealth degrades | Active | Unstable | **Active (Always tracks latest Chromium)** |

## 2. Why CloakBrowser is the Ultimate Choice for ViraLoop Studio

유튜브 연좌제 방어를 위한 최우선 원칙인 **"인위적인 JS 스크립트 주입 금지 (Native OPSEC)"**와 **"C++ 레벨의 엔진 개조"** 요구사항을 **100% 완벽하게 충족**하는 솔루션입니다.

### 핵심 강점 (Key Advantages)
1. **C++ Source-Level Fingerprinting (가장 중요)**: Patchright나 기존 Stealth 플러그인은 결국 순정 브라우저에 자바스크립트를 주입(Injection)하여 값을 속이는 방식(Spoofing)입니다. 구글/유튜브의 최신 봇 탐지는 JS 변조 여부를 스택 트레이스 레벨에서 잡아냅니다. 반면, CloakBrowser는 **크로미움 엔진 자체를 C++ 레벨에서 개조하여 재컴파일한 바이너리**입니다. 즉, 속이는 것이 아니라 "진짜 사람이 쓰는 브라우저" 그 자체로 동작합니다.
2. **Native Humanization (`humanize=True`)**: 마우스 커서의 베지어 곡선(Bézier curve) 이동, 타이핑 시 사람과 같은 지연 시간 및 오타 교정, 스크롤 가속도 등이 내장되어 있습니다. 추가적인 마우스 매크로 라이브러리 없이도 구글의 행동 기반 탐지(Behavioral Detection)를 무력화할 수 있습니다.
3. **Playwright 호환성**: Patchright와 100% 동일한 Playwright API를 사용합니다. 따라서 우리가 기획했던 파이썬 백엔드(FastAPI)와 Canvas Screencast 스트리밍 아키텍처를 **코드 수정 없이 그대로 적용**할 수 있습니다. 단지 `launch` import 구문만 바꾸면 됩니다.
4. **자동 WebRTC 및 IP 유출 방지**: 프록시 환경에서 WebRTC를 통한 실제 IP 유출을 C++ 레벨에서 차단하며, 타임존과 언어 설정 역시 프록시 IP에 맞춰 자동으로 세팅됩니다 (`geoip=True`).

## 3. Architecture Impact: The "Cloak Canvas" Architecture

기존 아키텍처 기획안(Patchright 기반 Canvas Screencast)에서 엔진만 **CloakBrowser**로 업그레이드합니다. 
Electron의 Z-order 버그나 창 위치/크기 가변성 문제는 브라우저 엔진의 종류와 무관한 UI 레이어의 문제이므로, 기존에 고안한 **Canvas Screencast 스트리밍 방식**이 여전히 가장 안전하고 유연한 방법입니다.

*   **UI Layer (Electron)**: 4개의 창 중 3개는 순정 `WebContentsView`(일반 사이트/Flow AI 용), 1개는 가변적인 크기/위치를 지원하는 `<canvas>` 엘리먼트로 구성.
*   **Automation Engine**: 백그라운드에 숨겨진 **CloakBrowser (Patched Chromium)**.
*   **Bridge**: FastAPI WebSocket을 통해 CloakBrowser의 화면 프레임을 React `<canvas>`로 스트리밍하고, 사용자의 마우스/키보드 입력(x,y 좌표)을 다시 CloakBrowser의 `humanize`된 입력으로 변환하여 전달.

## 4. Conclusion

CloakBrowser는 현재 오픈소스 생태계에서 얻을 수 있는 **가장 진보된 Anti-detect 브라우저 엔진**입니다. 유료 안티디텍트 브라우저(AdsPower, Dolphin Anty) 수준의 C++ 개조가 적용되어 있으면서도, 완벽한 자동화 API(Playwright)를 제공합니다. 

ViraLoop Studio의 **유튜브 업로드 전용 스텔스 창**을 위한 엔진으로 **Patchright를 폐기하고 CloakBrowser를 채택**하는 것이 기술적으로 압도적인 우위에 있습니다.
