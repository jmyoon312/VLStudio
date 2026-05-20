/**
 * Electron Preload Script for Stealth WebContentsView
 * 
 * Injects fingerprint protection overrides to mask canvas, WebGL vendor,
 * languages, and the webdriver flag from YouTube Studio anti-bot detection.
 */

// Default fallback values
let hardwareCores = 8;
let hardwareMemory = 16;
let hardwareVendor = 'Google Inc. (NVIDIA)';
let hardwareRenderer = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)';

try {
  // Parse additionalArguments passed from electron main process
  if (process && process.argv) {
    for (const arg of process.argv) {
      if (arg.startsWith('--hardware-cores=')) {
        hardwareCores = parseInt(arg.split('=')[1], 10) || 8;
      } else if (arg.startsWith('--hardware-memory=')) {
        hardwareMemory = parseInt(arg.split('=')[1], 10) || 16;
      } else if (arg.startsWith('--hardware-vendor=')) {
        hardwareVendor = arg.split('=')[1] || 'Google Inc. (NVIDIA)';
      } else if (arg.startsWith('--hardware-renderer=')) {
        hardwareRenderer = arg.split('=')[1] || 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      }
    }
  }
} catch (e) {
  console.warn('[Stealth Preload] Failed to parse additionalArguments:', e.message);
}

try {
  // Override webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
    configurable: true
  });

  // Override CPU core count
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => hardwareCores,
    configurable: true
  });

  // Override Device Memory
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => hardwareMemory,
    configurable: true
  });

  // Mask languages to match a standard localized desktop browser
  Object.defineProperty(navigator, 'languages', {
    get: () => ['ko-KR', 'ko', 'en-US', 'en'],
    configurable: true
  });

  // Subtle override of plugins to avoid blank lists (often used by basic fingerprint scripts)
  if (!navigator.plugins || navigator.plugins.length === 0) {
    const mockPlugins = [
      { name: 'PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
      { name: 'Chrome PDF Viewer', description: 'Portable Document Format', filename: 'internal-pdf-viewer' }
    ];
    Object.defineProperty(navigator, 'plugins', {
      get: () => mockPlugins,
      configurable: true
    });
  }

  // Override WebGL parameters (GPU details)
  const overrideWebGL = (proto) => {
    if (!proto) return;
    try {
      const originalGetParameter = proto.getParameter;
      proto.getParameter = function(parameter) {
        // UNMASKED_VENDOR_WEBGL (0x9245)
        if (parameter === 37445) {
          return hardwareVendor;
        }
        // UNMASKED_RENDERER_WEBGL (0x9246)
        if (parameter === 37446) {
          return hardwareRenderer;
        }
        return originalGetParameter.apply(this, arguments);
      };
    } catch (e) {
      console.warn('[Stealth Preload] WebGL getParameter override error:', e.message);
    }
  };

  if (globalThis.WebGLRenderingContext) {
    overrideWebGL(WebGLRenderingContext.prototype);
  }
  if (globalThis.WebGL2RenderingContext) {
    overrideWebGL(WebGL2RenderingContext.prototype);
  }

  console.log('[Stealth Preload] Fingerprint protection overrides successfully injected.');
} catch (e) {
  console.error('[Stealth Preload] Failed to inject protection overrides:', e.message);
}

