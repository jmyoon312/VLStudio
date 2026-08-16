# Google Login 봇가드(Botguard) 및 WebAuthn(패스키) 동시 우회 전략 (2026)

## 📌 개요
ViraLoop Studio에서 Google Flow 로그인을 자동화할 때, 두 가지 심각한 장애물이 발생했습니다.
1. **Windows 패스키(WebAuthn) 팝업:** 자동화 도중 OS 레벨의 패스키 선택 창이 떠서 자동화 프로세스가 블로킹됨.
2. **Google 봇가드(Botguard) 차단:** 패스키 창을 막으려고 자바스크립트(JS)를 주입하면, 구글 봇가드가 "안전하지 않은 브라우저" 또는 "의심스러운 앱"으로 감지하여 로그인을 원천 차단함.

이 문서에서는 약 10시간의 시행착오 끝에 발견한 **"패스키 우회 + 봇가드 스텔스 100% 통과"**의 최종 해결책을 기록합니다. 향후 동일한 문제가 발생하지 않도록 코드를 철저히 보존합니다.

---

## ❌ 실패한 시도들 (시행착오 기록)

### 1. Electron C++ 엔진 플래그 (`--disable-features=WebAuthentication`)
* **시도:** `app.commandLine.appendSwitch('disable-features', 'WebAuthentication')`
* **결과:** 실패. Windows의 최신 WebAuthn 구현체는 이 플래그를 무시하고 여전히 OS 수준의 패스키 팝업을 띄움.

### 2. Electron 네이티브 권한 관리자 (`setPermissionRequestHandler`)
* **시도:** `loginWin.webContents.session.setPermissionRequestHandler`에서 `permission === 'security-key'`를 거부(false) 반환.
* **결과:** 실패. Windows OS 패스키 프롬프트는 Electron의 표준 권한 관리자를 우회하여 직접 실행됨. 패스키 팝업이 여전히 발생.

### 3. 단순 JS 변조 및 `Proxy` 객체 사용
* **시도:** `login_preload.js`에서 `navigator.credentials.get`을 `Proxy`로 덮어쓰거나, `delete Navigator.prototype.credentials`를 시도.
* **결과:** 패스키 팝업 차단에는 성공했으나 **봇가드(Botguard)에 차단됨.**
* **이유:** 구글 봇가드는 `Proxy` 객체 사용 여부, 프로토타입 체인 변조, `Object.getOwnPropertyDescriptor` 등을 정밀하게 검사함. JS 변조 흔적이 발각되어 봇으로 간주됨.

---

## 💡 최종 해결책: WeakMap 기반 `[native code]` 위장 스텔스

가장 근본적이고 확실한 방법은 **JS 레벨에서 WebAuthn을 차단하되, 구글 봇가드가 그 차단 코드를 "순정 브라우저의 기본 코드"로 착각하게 만드는 것**입니다.

이를 위해 `Function.prototype.toString`을 `WeakMap`을 사용하여 가로채고, 우리가 주입한 가짜 함수(`fakeGet`, `mockUserAgentData` 등)를 봇가드가 검사할 때 `function () { [native code] }`라는 문자열을 반환하도록 은폐(Masking)했습니다.

### 📄 `electron/login_preload.js` (최종 완성 코드)
로그인 창 전용 프리로드 스크립트입니다. 

```javascript
const { webFrame } = require('electron');

// 구글 봇가드 스크립트가 실행되기 전, Main World(순정 탭 공간)에 위장 코드를 주입합니다.
webFrame.executeJavaScript(`
  (function () {
    'use strict';
    
    // ==========================================
    // 1. WeakMap을 이용한 toString() 완벽 은폐 (핵심)
    // ==========================================
    const _nativeToString = Function.prototype.toString;
    const _proxyMap = new WeakMap();

    Function.prototype.toString = function () {
      if (_proxyMap.has(this)) {
        return _proxyMap.get(this);
      }
      return _nativeToString.call(this);
    };

    const maskFunction = function (fn, fakeToString) {
      _proxyMap.set(fn, fakeToString);
    };

    const makeNativeGetter = function (fakeValue, propName) {
      const getter = function () { return fakeValue; };
      _proxyMap.set(getter, 'function get ' + propName + '() { [native code] }');
      return getter;
    };

    // 가로챈 toString 함수 자체도 순정인 것처럼 속입니다.
    _proxyMap.set(Function.prototype.toString, 'function toString() { [native code] }');

    // ==========================================
    // 2. WebAuthn(패스키) 안전 차단
    // ==========================================
    // 패스키 호출 시 "NotAllowedError"를 조용히 뱉게 만들어, 
    // 구글 로그인이 자연스럽게 OTP/비밀번호 화면으로 폴백(Fallback)되도록 유도합니다.
    try {
      if (navigator.credentials && navigator.credentials.get) {
        const fakeGet = function() {
          return Promise.reject(new DOMException("The operation either timed out or was not allowed.", "NotAllowedError"));
        };
        maskFunction(fakeGet, 'function get() { [native code] }');
        navigator.credentials.get = fakeGet;
      }
      if (navigator.credentials && navigator.credentials.create) {
        const fakeCreate = function() {
          return Promise.reject(new DOMException("The operation either timed out or was not allowed.", "NotAllowedError"));
        };
        maskFunction(fakeCreate, 'function create() { [native code] }');
        navigator.credentials.create = fakeCreate;
      }
    } catch(e) {}

    // ==========================================
    // 3. User-Agent 데이터 위장 (Electron 흔적 지우기)
    // ==========================================
    try {
      if (Navigator.prototype.userAgentData) {
        const mockUserAgentData = {
          brands: [
            { brand: 'Chromium', version: '124' },
            { brand: 'Google Chrome', version: '124' },
            { brand: 'Not-A.Brand', version: '99' }
          ],
          mobile: false,
          platform: 'Windows',
          getHighEntropyValues: function(hints) {
            return Promise.resolve({
              brands: [
                { brand: 'Chromium', version: '124.0.0.0' },
                { brand: 'Google Chrome', version: '124.0.0.0' },
                { brand: 'Not-A.Brand', version: '99.0.0.0' }
              ],
              mobile: false,
              platform: 'Windows',
              platformVersion: '10.0.0',
              architecture: 'x86',
              bitness: '64',
              model: '',
              uaFullVersion: '124.0.0.0',
              fullVersionList: [
                { brand: 'Chromium', version: '124.0.0.0' },
                { brand: 'Google Chrome', version: '124.0.0.0' },
                { brand: 'Not-A.Brand', version: '99.0.0.0' }
              ]
            });
          }
        };
        
        maskFunction(mockUserAgentData.getHighEntropyValues, 'function getHighEntropyValues() { [native code] }');

        Object.defineProperty(Navigator.prototype, 'userAgentData', {
          get: makeNativeGetter(mockUserAgentData, 'userAgentData'),
          configurable: true
        });
      }
    } catch(e) {}

    // ==========================================
    // 4. window.chrome 객체 위장
    // ==========================================
    try {
      if (!window.chrome || !window.chrome.runtime) {
        const connect = function() {};
        const sendMessage = function() {};
        const addListener = function() {};
        const removeListener = function() {};
        
        maskFunction(connect, 'function connect() { [native code] }');
        maskFunction(sendMessage, 'function sendMessage() { [native code] }');
        maskFunction(addListener, 'function addListener() { [native code] }');
        maskFunction(removeListener, 'function removeListener() { [native code] }');

        window.chrome = {
          runtime: {
            connect,
            sendMessage,
            onMessage: { addListener, removeListener },
            id: undefined
          },
          loadTimes: function () { return {}; },
          csi: function () { return {}; },
          app: {}
        };
        maskFunction(window.chrome.loadTimes, 'function loadTimes() { [native code] }');
        maskFunction(window.chrome.csi, 'function csi() { [native code] }');
      }
    } catch(e) {}

  })();
`).catch(() => {});
```

### 🧠 왜 이 방식이 완벽한가?
- 구글 봇가드 스캐너는 의심스러운 함수 객체가 발견되면 `toString()`을 호출하여 네이티브 코드인지, 개발자가 재정의한 코드인지 판별합니다.
- 우리가 주입한 코드는 `_proxyMap` (WeakMap)을 통해 검사기에 가짜 `[native code]` 문자열을 뱉어냅니다.
- 프록시(`Proxy`) 객체를 전혀 사용하지 않았기 때문에 자바스크립트 엔진의 깊은 단까지 검사하더라도 우회가 가능합니다.
- WebAuthn 호출을 `NotAllowedError`로 조용히 거부하여, 구글의 로그인 흐름이 에러 처리 로직을 타게 되어 자연스럽게 "패스키 실패 -> OTP 입력 창 출력"이라는 정상 루트로 폴백(Fallback) 됩니다.
