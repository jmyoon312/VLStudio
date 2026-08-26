const { webFrame } = require('electron');

// We use webFrame.executeJavaScript to run this in the Main World before Google's scripts run.
webFrame.executeJavaScript(`
  (function () {
    'use strict';
    
    // 1. Setup WeakMap-based toString() masking
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

    // mask toString itself
    _proxyMap.set(Function.prototype.toString, 'function toString() { [native code] }');

    // 2. Block WebAuthn safely
    try {
      if (globalThis.CredentialsContainer && CredentialsContainer.prototype) {
        if (CredentialsContainer.prototype.get) {
          const fakeGet = function() {
            return Promise.reject(new DOMException("The operation either timed out or was not allowed.", "NotAllowedError"));
          };
          maskFunction(fakeGet, 'function get() { [native code] }');
          CredentialsContainer.prototype.get = fakeGet;
        }
        if (CredentialsContainer.prototype.create) {
          const fakeCreate = function() {
            return Promise.reject(new DOMException("The operation either timed out or was not allowed.", "NotAllowedError"));
          };
          maskFunction(fakeCreate, 'function create() { [native code] }');
          CredentialsContainer.prototype.create = fakeCreate;
        }
      }
    } catch(e) {}

    // 3. Spoof userAgentData to remove "Electron" & mask webdriver
    try {
      if (Navigator.prototype.userAgentData) {
        const mockUserAgentData = {
          brands: [
            { brand: 'Chromium', version: '136' },
            { brand: 'Google Chrome', version: '136' },
            { brand: 'Not-A.Brand', version: '99' }
          ],
          mobile: false,
          platform: 'Windows',
          getHighEntropyValues: function(hints) {
            return Promise.resolve({
              brands: [
                { brand: 'Chromium', version: '136.0.0.0' },
                { brand: 'Google Chrome', version: '136.0.0.0' },
                { brand: 'Not-A.Brand', version: '99.0.0.0' }
              ],
              mobile: false,
              platform: 'Windows',
              platformVersion: '15.0.0',
              architecture: 'x86',
              bitness: '64',
              model: '',
              uaFullVersion: '136.0.0.0',
              fullVersionList: [
                { brand: 'Chromium', version: '136.0.0.0' },
                { brand: 'Google Chrome', version: '136.0.0.0' },
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

      // Hide webdriver completely
      Object.defineProperty(Navigator.prototype, 'webdriver', {
        get: makeNativeGetter(undefined, 'webdriver'),
        configurable: true
      });
    } catch(e) {}

    // 4. window.chrome spoofing
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
