/**
 * Electron Preload Script for Stealth WebContentsView
 * 
 * Injects fingerprint protection overrides to mask canvas, WebGL vendor,
 * languages, and the webdriver flag from YouTube Studio anti-bot detection.
 */

try {
  // Override webdriver flag
  Object.defineProperty(navigator, 'webdriver', {
    get: () => false,
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

  console.log('[Stealth Preload] Fingerprint protection overrides successfully injected.');
} catch (e) {
  console.error('[Stealth Preload] Failed to inject protection overrides:', e.message);
}
