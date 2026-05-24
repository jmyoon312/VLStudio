/**
 * Electron Preload Script for Stealth WebContentsView
 *
 * Injects fingerprint protection overrides to mask canvas, WebGL vendor,
 * languages, and the webdriver flag from YouTube Studio anti-bot detection.
 *
 * Patch Order (critical):
 *   1. Function.prototype.toString 위장 (NEW-3) — 반드시 최상단
 *   2. navigator.webdriver / hardwareConcurrency 등 기존 패치
 *   3. Canvas/Audio Deterministic Noise (NEW-4)
 *   4. window.chrome, Notification, mimeTypes, connection 위장 (NEW-11)
 */

// ─────────────────────────────────────────────────────────────────────────────
// [NEW-3] Function.prototype.toString 네이티브 위장
// 이 블록은 반드시 다른 모든 패치보다 먼저 실행되어야 합니다.
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  'use strict';
  const _nativeToString = Function.prototype.toString;
  const _proxyMap = new WeakMap();

  Function.prototype.toString = function () {
    if (_proxyMap.has(this)) {
      return _proxyMap.get(this);
    }
    return _nativeToString.call(this);
  };

  // 안전한 getter 정의 헬퍼 — toString이 native code로 보이도록 등록
  globalThis.__makeNativeGetter = function (fakeValue, nativePropPath) {
    const getter = function () { return fakeValue; };
    const propName = nativePropPath.split('.').pop();
    _proxyMap.set(getter, `function get ${propName}() { [native code] }`);
    return getter;
  };

  // toString 자체도 native로 위장
  _proxyMap.set(Function.prototype.toString, 'function toString() { [native code] }');
})();

// ─────────────────────────────────────────────────────────────────────────────
// Argument parsing (from main process additionalArguments)
// ─────────────────────────────────────────────────────────────────────────────
let hardwareCores = 8;
let hardwareMemory = 16;
let hardwareVendor = 'Google Inc. (NVIDIA)';
let hardwareRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
let fpSeed = 0; // [NEW-4] Canvas/Audio noise seed (profile-specific)

try {
  if (process && process.argv) {
    for (const arg of process.argv) {
      if (arg.startsWith('--hardware-cores=')) {
        hardwareCores = parseInt(arg.split('=')[1], 10) || 8;
      } else if (arg.startsWith('--hardware-memory=')) {
        hardwareMemory = parseInt(arg.split('=')[1], 10) || 16;
      } else if (arg.startsWith('--hardware-vendor=')) {
        hardwareVendor = arg.split('=')[1] || hardwareVendor;
      } else if (arg.startsWith('--hardware-renderer=')) {
        hardwareRenderer = arg.split('=')[1] || hardwareRenderer;
      } else if (arg.startsWith('--fp-seed=')) {
        fpSeed = parseInt(arg.split('=')[1], 10) || 0;
      }
    }
  }
} catch (e) {
  console.warn('[Stealth Preload] Failed to parse additionalArguments:', e.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fingerprint patches
// ─────────────────────────────────────────────────────────────────────────────
try {
  const makeNativeGetter = globalThis.__makeNativeGetter;

  // Override webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: makeNativeGetter(false, 'Navigator.webdriver'),
    configurable: true
  });

  // Override CPU core count
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: makeNativeGetter(hardwareCores, 'Navigator.hardwareConcurrency'),
    configurable: true
  });

  // Override Device Memory
  Object.defineProperty(navigator, 'deviceMemory', {
    get: makeNativeGetter(hardwareMemory, 'Navigator.deviceMemory'),
    configurable: true
  });

  // Mask languages
  Object.defineProperty(navigator, 'languages', {
    get: makeNativeGetter(['ko-KR', 'ko', 'en-US', 'en'], 'Navigator.languages'),
    configurable: true
  });

  // Subtle override of plugins
  if (!navigator.plugins || navigator.plugins.length === 0) {
    const mockPlugins = [
      { name: 'PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' }
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: makeNativeGetter(mockPlugins, 'Navigator.plugins'),
      configurable: true
    });
  }

  // Override WebGL parameters (GPU details)
  const overrideWebGL = (proto) => {
    if (!proto) return;
    try {
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function (parameter) {
        if (parameter === 37445) return hardwareVendor;   // UNMASKED_VENDOR_WEBGL
        if (parameter === 37446) return hardwareRenderer; // UNMASKED_RENDERER_WEBGL
        return originalGetParameter.apply(this, arguments);
      };
    } catch (e) {
      console.warn('[Stealth Preload] WebGL getParameter override error:', e.message);
    }
  };

  if (globalThis.WebGLRenderingContext) overrideWebGL(WebGLRenderingContext.prototype);
  if (globalThis.WebGL2RenderingContext) overrideWebGL(WebGL2RenderingContext.prototype);

} catch (e) {
  console.error('[Stealth Preload] Core patch failed:', e.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// [NEW-4] Canvas / AudioContext Deterministic Noise (Profile-Seeded LCG)
// 동일 프로필 = 동일 지문, 프로필 간 지문 상이 → 연좌제 방지
// ─────────────────────────────────────────────────────────────────────────────
(function () {
  // LCG (Linear Congruential Generator) — 단순하지만 결정적
  function lcg(s) { return ((1664525 * s + 1013904223) >>> 0); }

  // Canvas toDataURL noise injection
  try {
    const _origToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      const ctx = this.getContext('2d');
      if (ctx && this.width > 0 && this.height > 0) {
        const imageData = ctx.getImageData(0, 0, this.width, this.height);
        let s = fpSeed;
        for (let i = 0; i < imageData.data.length; i += 4) {
          s = lcg(s);
          // 최대 ±1 픽셀 변화 (육안 식별 불가)
          imageData.data[i]     = Math.min(255, Math.max(0, imageData.data[i]     + (s & 1)));
          imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + ((s >> 1) & 1)));
        }
        ctx.putImageData(imageData, 0, 0);
      }
      return _origToDataURL.apply(this, args);
    };
  } catch (e) {}

  // AudioContext fingerprint noise
  try {
    if (globalThis.AudioBuffer) {
      const _origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (channel) {
        const data = _origGetChannelData.apply(this, arguments);
        let s = fpSeed + channel * 31337;
        for (let i = 0; i < data.length; i++) {
          s = lcg(s);
          // ±0.00005 이하 변화 (청각적으로 무의미)
          data[i] += ((s & 0xFF) / 0xFF - 0.5) * 0.0001;
        }
        return data;
      };
    }
  } catch (e) {}
})();

// ─────────────────────────────────────────────────────────────────────────────
// [NEW-11] 추가 탐지 벡터 4종 차단
//   • window.chrome 객체 존재 위장
//   • Notification.permission → 'default' 위장
//   • navigator.mimeTypes → PDF 포함 목록 위장
//   • navigator.connection → LTE-like 값 위장
// ─────────────────────────────────────────────────────────────────────────────
try {
  // 1. window.chrome 런타임 객체 (Electron에서 부재 시 탐지됨)
  if (!window.chrome || !window.chrome.runtime) {
    window.chrome = {
      runtime: {
        connect: () => {},
        sendMessage: () => {},
        onMessage: { addListener: () => {}, removeListener: () => {} },
        id: undefined
      },
      loadTimes: function () { return {}; },
      csi: function () { return {}; },
      app: {}
    };
  }

  // 2. Notification.permission → 'default' (실제 사용자는 결정하지 않은 상태)
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      Object.defineProperty(Notification, 'permission', {
        get: () => 'default',
        configurable: true
      });
    }
  } catch (e) {}

  // 3. navigator.mimeTypes → PDF 포함 표준 목록
  try {
    if (!navigator.mimeTypes || navigator.mimeTypes.length === 0) {
      const mimeItem0 = { type: 'application/pdf', description: 'Portable Document Format', suffixes: 'pdf', enabledPlugin: null };
      const mimeItem1 = { type: 'text/pdf', description: 'Portable Document Format', suffixes: 'pdf', enabledPlugin: null };
      const fakeMimes = {
        length: 2,
        0: mimeItem0,
        1: mimeItem1,
        namedItem: (n) => (n === 'application/pdf' ? mimeItem0 : n === 'text/pdf' ? mimeItem1 : null),
        item: (i) => [mimeItem0, mimeItem1][i] || null,
        [Symbol.iterator]: function* () { yield mimeItem0; yield mimeItem1; }
      };
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => fakeMimes,
        configurable: true
      });
    }
  } catch (e) {}

  // 4. navigator.connection → LTE 환경처럼 위장 (모바일 LTE 프록시와 일치)
  try {
    if (navigator.connection !== undefined) {
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          downlink: 15.2 + (fpSeed % 10) * 0.3,
          rtt: 65 + (fpSeed % 20),
          saveData: false,
          type: 'cellular',
          onchange: null,
          addEventListener: () => {},
          removeEventListener: () => {}
        }),
        configurable: true
      });
    }
  } catch (e) {}

  console.log('[Stealth Preload] All fingerprint protection overrides injected. Seed:', fpSeed);
} catch (e) {
  console.error('[Stealth Preload] NEW-11 patch block failed:', e.message);
}
