# ViraLoop Studio Path F++ — 유튜브 전용 CloakBrowser & 네트워크 이중화 초강화 구현 계획

이 문서는 이전에 확정된 **Path F+ (10대 버그 해결 + 9대 보안 강화)** 위에 최신 웹 검색(2025년 5월)과 GitHub 리서치로 발굴한 **추가 12개 항목**을 덧붙인 통합 최종 계획입니다.

---

## ✅ 이전 계획에서 이미 다루고 있는 항목 (확정 기완료)

| # | 버그/개선 항목 | 담당 파일 |
|---|---|---|
| Bug 1 | Port Mismatch (포트 10800 통일) | `test_standalone_youtube.py`, `stealth_ops_v2.py` |
| Bug 2 | 무조건적 바인드 실패 경고 출력 | `network_core.py` |
| Bug 3 | Isolated 상태 LTE 어댑터 감지 누락 | `adb_service.py` |
| Bug 4 | 어댑터 별칭 오염 (괄호 접미사) | `network_monitor.py` |
| Bug 5 | 유선 LAN 오인 & IP 충돌 | `network_monitor.py` |
| Bug 6 | TypeError + PowerShell 호출 캐싱 누락 | `proxy_service.py`, `adb_service.py` |
| Bug 7 | SOCKS5 DNS Leak (Interface-Bound Resolver) | `network_core.py` |
| Bug 8 | IPv6 Leak (Wi-Fi/Wired 어댑터 IPv6 해제) | `network_monitor.py` |
| Bug 9 | `pipe` 메서드 정의 누락 | `network_core.py` |
| Bug 10 | 비행기 모드 후 USB 테더링 타이밍 버그 | `adb_service.py` |
| 보안① | WebRTC IP Leak 원천 차단 | `stealth_ops_v2.py` |
| 보안② | 미디어 디바이스 지문 위장 | `stealth_ops_v2.py` |
| 보안③ | CDP 포트 탐지 무력화 (`--remote-debugging-pipe`) | `stealth_ops_v2.py` |
| 보안④ | DNS Leak 방지 (DoH) | `stealth_ops_v2.py` |
| 보안⑤ | DrissionPage → Playwright Null-Safe 래퍼 | `stealth_ops_v2.py` |
| 보안⑥ | Canvas/Audio Noise Seed 주기적 갱신 | `stealth_ops_v2.py` |
| Electron① | Session Proxy 규칙 SOCKS5 수정 | `ytExportManager.js` |
| Electron② | WebRTC 봉쇄 앱 스위치 추가 | `main.js` |

---

## 🆕 추가 검토 사항 (12개 신규 항목)

### [NEW-1] QUIC/HTTP3 누출 차단 — `--disable-quic` 플래그 강제화

**문제**: CloakBrowser는 C++ 패치로 SOCKS5 `UDP ASSOCIATE`를 지원하지만, 우리의 Python SOCKS5 서버(`network_core.py`)는 현재 TCP `CONNECT` 전용으로 구현되어 있음. CloakBrowser가 QUIC(UDP) 트래픽을 프록시로 보내려 할 때 실패하거나 **우회(leak)**될 수 있음.

**해결책**:
1. `stealth_ops_v2.py`의 CloakBrowser 기동 인자에 `--disable-quic` 추가.
2. `ytExportManager.js`의 WebContentsView에도 동일하게 적용 (Electron 내부 크롬도 동일 취약).
3. 장기적으로는 `network_core.py`에 `UDP ASSOCIATE` 지원 추가 (RFC 1928 CMD=0x03).

```python
# stealth_ops_v2.py — CloakBrowser 기동 시
extra_args = [
    "--disable-quic",           # [NEW-1] QUIC/UDP 누출 차단
    "--disable-ipv6",           # Bug 8 대응
    # ... 기존 플래그들
]
```

**근거**: 표준 Chrome 조차 SOCKS5 프록시 설정 시 QUIC을 비활성화하고 HTTP/2 폴백. `--disable-quic`은 "비정상적인 설정"이 아닌 잘 알려진 Chrome 플래그로 탐지 위험 없음.

---

### [NEW-2] `asyncio` 기반 SOCKS5 서버로 리팩토링 (threading → asyncio)

**문제**: `network_core.py`의 현재 `threading` 기반 SOCKS5 프록시는 I/O-bound 작업(소켓 중계)에 매우 비효율적. 다수의 스레드를 생성하여 메모리·CPU 오버헤드 발생. GIL로 인해 병렬 연결 처리 제한.

**해결책**: `asyncio-socks-server` (PyPI) 또는 `soxyproxy`로 교체.

```bash
pip install asyncio-socks-server
```

```python
# network_core_async.py (신규 파일)
import asyncio
from aiosocks_server import SocksServer

async def run_lte_proxy(lte_ip: str, port: int = 10800):
    server = SocksServer(
        host="127.0.0.1",
        port=port,
        bind_address=lte_ip,  # LTE 인터페이스에 바인딩
        auth=None,
    )
    await server.start()
    await server.wait_closed()
```

**대안**: `pproxy` 라이브러리 (HTTP+SOCKS5+Shadowsocks 멀티프로토콜 지원, 프로덕션 검증됨)

```bash
pip install pproxy
# 사용법: python -m pproxy -l socks5+http://:10800 --bind lte_ip
```

---

### [NEW-3] stealth_preload.js — Function.prototype.toString 네이티브 위장

**문제**: 현재 `stealth_preload.js`는 `navigator.webdriver`, WebGL, `hardwareConcurrency` 등을 덮어쓰지만, 이렇게 덮어쓴 함수들의 `.toString()` 결과가 `function () { [native code] }` 형태를 잃어버려 **CreepJS** 같은 고급 탐지 스크립트에 즉시 발각됨.

**해결책**: `Function.prototype.toString`을 먼저 위장한 뒤 나머지 API를 패치.

```javascript
// stealth_preload.js — 반드시 파일 최상단 (다른 코드보다 먼저) 삽입
(function() {
  'use strict';
  
  // Step 1: toString 위장을 위한 원본 저장
  const nativeToString = Function.prototype.toString;
  const proxyFunctions = new WeakMap();
  
  // Step 2: toString 오버라이드 (패치된 함수가 native code로 보이도록)
  Function.prototype.toString = function() {
    if (proxyFunctions.has(this)) {
      return proxyFunctions.get(this);
    }
    return nativeToString.call(this);
  };
  
  // Step 3: 안전한 속성 정의 헬퍼
  function makeNativeGetter(fakeValue, nativeSource) {
    const getter = function() { return fakeValue; };
    proxyFunctions.set(getter, `function get ${nativeSource.split('.').pop()}() { [native code] }`);
    return getter;
  }
  
  // Step 4: 기존 파치들을 이 헬퍼로 재작성
  Object.defineProperty(navigator, 'webdriver', {
    get: makeNativeGetter(false, 'Navigator.webdriver'),
    configurable: true,
  });
  
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: makeNativeGetter(hardwareCores, 'Navigator.hardwareConcurrency'),
    configurable: true,
  });
  
  // [NEW-3] Automation 탐지 우회 추가 속성
  Object.defineProperty(navigator, 'permissions', {
    value: {
      query: async (desc) => ({ state: 'granted', onchange: null }),
    },
    configurable: true,
  });

})();
```

---

### [NEW-4] stealth_preload.js — Canvas 지문 결정적 노이즈 주입 (Seeded)

**문제**: 현재 Canvas/Audio 지문 위장이 없음 (`stealth_preload.js` 확인). Canvas toDataURL()로 계정 간 공통 지문이 추출되어 연좌제 탐지 위험.

**해결책**: 프로필 ID 기반 결정적(Deterministic) 노이즈로 Canvas 지문 변조. 무작위 노이즈가 아닌 **동일 프로필 = 동일 지문** 유지 (세션 간 일관성 보장).

```javascript
// stealth_preload.js 추가
(function() {
  // [NEW-4] Deterministic Canvas Noise based on profile seed
  // seed는 main.js에서 additionalArguments로 주입
  const seed = parseInt(process.argv.find(a => a.startsWith('--fp-seed='))?.split('=')[1] || '0');
  
  function lcg(s) { return (1664525 * s + 1013904223) & 0xFFFFFFFF; }
  
  const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
  const origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
  
  HTMLCanvasElement.prototype.toDataURL = function(...args) {
    const ctx = this.getContext('2d');
    if (ctx) {
      const id = ctx.getImageData(0, 0, this.width, this.height);
      let s = seed;
      for (let i = 0; i < id.data.length; i += 4) {
        s = lcg(s);
        id.data[i] = (id.data[i] + (s & 0x03)) & 0xFF;  // 최대 3 픽셀 변화 (육안 불변)
      }
      ctx.putImageData(id, 0, 0);
    }
    const result = origToDataURL.apply(this, args);
    return result;
  };
  
  // AudioContext 지문 위장 (AnalyserNode 노이즈)
  const origGetChannelData = AudioBuffer.prototype.getChannelData;
  AudioBuffer.prototype.getChannelData = function(channel) {
    const data = origGetChannelData.apply(this, arguments);
    let s = seed + channel;
    for (let i = 0; i < data.length; i++) {
      s = lcg(s);
      data[i] += ((s & 0xFF) / 0xFF - 0.5) * 0.0003;  // ±0.00015 이하 변화
    }
    return data;
  };
})();
```

---

### [NEW-5] HTTP/2 지문 위조 차단 — `--disable-http2` 전략적 검토

**배경**: HTTP/2 프레임 순서(`SETTINGS` 프레임 값, 헤더 압축 알고리즘 우선순위)가 브라우저마다 고유하여 JA3/JA4와 같은 방식으로 자동화 탐지에 사용됨.

**CloakBrowser 현황**: C++ 패치로 TLS/JA4 지문은 처리됨. HTTP/2 SETTINGS 프레임 순서까지 패치되는지는 릴리스 노트 확인 필요.

**단기 대응**:
- 현재로서는 CloakBrowser의 C++ 패치를 신뢰하고 추가 조치 불필요.
- 탐지 발생 시: `--disable-http2` 플래그로 HTTP/1.1 폴백 (탐지 회피 효과 있으나 성능 저하).

**장기 대응**: CloakBrowser GitHub Issues에서 `HTTP/2 fingerprint` 태그 모니터링.

---

### [NEW-6] DBSC (Device Bound Session Credentials) 대응 전략

**배경**: Google이 2025년부터 Chrome 세션에 **DBSC** 적용 확대 중. TPM 칩에 세션 키를 바인딩하여 쿠키 파일 이전이 무효화됨. 이는 `persist:yt_brand_N` 파티션의 **쿠키 백업/복원** 전략에 영향을 줌.

**현재 영향**:
- Electron의 `session.fromPartition('persist:yt_brand_N')`은 표준 Chromium 세션이므로 DBSC가 적용될 수 있음.
- DBSC가 적용된 경우, 다른 기기나 새 파티션으로 쿠키를 복사해도 인증이 풀림.

**대응 전략**:
1. **쿠키 백업 대신 프로필 지속성 유지**: 채널별로 동일한 `persist:yt_brand_{brandId}` 파티션을 유지하고 삭제하지 않음.
2. **Electron userData 경로 백업**: `session.fromPartition` 데이터는 `%APPDATA%/ViraLoop Studio/Partitions/{partition_name}/` 폴더에 저장되므로 이 폴더를 통째로 백업.
3. **DBSC 인식 모니터링**: `ytExportManager.js`에서 `session.webRequest.onHeadersReceived`로 `Sec-Session-Registration` 헤더를 감지, DBSC 등록 시 알림 발송.

```javascript
// ytExportManager.js — DBSC 등록 헤더 모니터링 추가
brandSession.webRequest.onHeadersReceived({ urls: ['https://*.google.com/*', 'https://*.youtube.com/*'] },
  (details, callback) => {
    if (details.responseHeaders['sec-session-registration']) {
      console.warn('[DBSC] Device-Bound Session Credentials registration detected!');
      // 채널이 DBSC 바인딩됨 → 이 파티션 폴더를 절대 삭제 금지 플래그 설정
      global.dbscBoundBrands = global.dbscBoundBrands || new Set();
      global.dbscBoundBrands.add(nextBrandId);
    }
    callback({ responseHeaders: details.responseHeaders });
  }
);
```

---

### [NEW-7] `ytExportManager.js` — UserAgent 최신화 및 Chrome Client Hints 일치

**문제**: 현재 `rerollSessionHardwareProfile()`에서 설정하는 UserAgent가 Chrome 119~120 (2023년말)으로 **2년 이상 구버전**. YouTube는 구버전 UA를 이상한 트래픽으로 처리할 수 있음. 또한 UA만 바꾸고 `Sec-CH-UA` 헤더를 일치시키지 않으면 불일치 탐지.

**해결책**:
```javascript
// ytExportManager.js — rerollSessionHardwareProfile 수정
function rerollSessionHardwareProfile(sessionObj, brandId) {
  // 2025년 최신 Chrome UA 풀 (2025.05 기준)
  const uaProfiles = [
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      secChUa: '"Chromium";v="136", "Google Chrome";v="136", "Not-A.Brand";v="99"',
      secChUaVersion: '136',
    },
    {
      ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
      secChUa: '"Chromium";v="135", "Google Chrome";v="135", "Not-A.Brand";v="8"',
      secChUaVersion: '135',
    },
  ];
  
  const profile = uaProfiles[Math.abs(hashCode(brandId)) % uaProfiles.length];
  sessionObj.setUserAgent(profile.ua);
  
  // Sec-CH-UA 헤더를 UA와 일치시켜 불일치 탐지 방지
  sessionObj.webRequest.onBeforeSendHeaders({ urls: ['https://*.youtube.com/*', 'https://*.google.com/*'] },
    (details, callback) => {
      details.requestHeaders['Sec-CH-UA'] = profile.secChUa;
      details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
      details.requestHeaders['Sec-CH-UA-Platform'] = '"Windows"';
      details.requestHeaders['Sec-CH-UA-Full-Version-List'] = profile.secChUa;
      callback({ requestHeaders: details.requestHeaders });
    }
  );
}
```

---

### [NEW-8] Windows 방화벽 기반 네트워크 완전 격리 (선택적 Kill-Switch)

**개념**: YouTube 채널 업로드 중 Wi-Fi 게이트웨이로의 트래픽을 **방화벽 레벨에서 완전 차단**하는 KillSwitch 스크립트. 프록시 서버 크래시나 연결 오류 시에도 Wi-Fi를 통해 실제 IP가 유출되지 않도록 하는 최후 방어선.

```python
# network_killswitch.py (신규 파일)
import subprocess, shlex

PS_BLOCK_WIFI = """
$wifi = "{wifi_name}"
New-NetFirewallRule -DisplayName "VLStudio_Block_WiFi_Out" `
    -Direction Outbound -InterfaceAlias $wifi -Action Block
New-NetFirewallRule -DisplayName "VLStudio_Block_WiFi_In" `
    -Direction Inbound -InterfaceAlias $wifi -Action Block
"""

PS_RESTORE_WIFI = """
Remove-NetFirewallRule -DisplayName "VLStudio_Block_WiFi_Out" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "VLStudio_Block_WiFi_In" -ErrorAction SilentlyContinue
"""

class NetworkKillSwitch:
    def __init__(self, wifi_name: str):
        self.wifi_name = wifi_name
        self._active = False
    
    def engage(self):
        """YouTube 업로드 시작 전 Wi-Fi 방화벽 차단 활성화"""
        if not self._active:
            script = PS_BLOCK_WIFI.format(wifi_name=self.wifi_name)
            subprocess.run(["powershell", "-Command", script], check=True)
            self._active = True
            print(f"[KillSwitch] Wi-Fi '{self.wifi_name}' blocked via firewall")
    
    def release(self):
        """업로드 완료 후 Wi-Fi 방화벽 차단 해제"""
        if self._active:
            subprocess.run(["powershell", "-Command", PS_RESTORE_WIFI], check=True)
            self._active = False
            print(f"[KillSwitch] Wi-Fi firewall rules removed")
    
    def __enter__(self):
        self.engage()
        return self
    
    def __exit__(self, *args):
        self.release()
```

> [!WARNING]
> `Set-NetFirewallProfile -DefaultOutboundAction Block` 전체 차단은 원격 접속(RDP)까지 끊기므로 사용 금지. 대신 특정 Wi-Fi 어댑터만 차단하는 위 방식을 사용할 것.

---

### [NEW-9] USB Tethering 물리 안정성 — 파워 관리 최적화

**문제**: Windows의 USB Selective Suspend 기능이 비활성 상태의 USB 허브(스마트폰 연결 포함)를 절전 모드로 전환, USB 테더링이 물리적으로 끊기는 원인이 됨.

**PowerShell 원클릭 해결 스크립트** (앱 시작 시 자동 실행):

```powershell
# usb_power_fix.ps1 (scripts/ 폴더에 저장)

# 1. USB Selective Suspend 비활성화 (현재 전원 계획)
powercfg /setacvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
powercfg /setdcvalueindex SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
powercfg /setactive SCHEME_CURRENT

# 2. 고성능 전원 계획으로 전환 (USB 유지에 유리)
powercfg /setactive SCHEME_MIN

# 3. RNDIS (USB Tethering) 어댑터 절전 방지
$rndis = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like "*RNDIS*" -or $_.InterfaceDescription -like "*Remote NDIS*" }
foreach ($adapter in $rndis) {
    $adapter | Get-NetAdapterPowerManagement | Set-NetAdapterPowerManagement -AllowComputerToTurnOffDevice Disabled
}

Write-Host "[USB Fix] USB Selective Suspend disabled, RNDIS power management fixed."
```

```python
# adb_service.py — 앱 시작 시 자동 실행
import subprocess, pathlib

def apply_usb_power_fix():
    """앱 시작 시 USB 안정성을 위한 Windows 전원 관리 최적화"""
    script = pathlib.Path(__file__).parent.parent.parent / "scripts" / "usb_power_fix.ps1"
    if script.exists():
        subprocess.Popen(
            ["powershell", "-ExecutionPolicy", "Bypass", "-File", str(script)],
            creationflags=subprocess.CREATE_NO_WINDOW
        )
```

---

### [NEW-10] ADB 타이밍 개선 — `adbutils` 라이브러리 도입 (순수 Python ADB)

**문제**: 현재 `adb_service.py`는 `subprocess.run(["adb", ...])` 외부 프로세스 방식. 오버헤드가 크고, ADB 연결 끊김 감지가 느림.

**개선책**: `adbutils` 라이브러리는 ADB 프로토콜을 Python에서 직접 구현하여 서브프로세스 없이 100ms 이하 응답.

```bash
pip install adbutils
```

```python
# adb_service.py 핵심 부분 adbutils로 교체
from adbutils import adb

class AdbService:
    def get_device(self):
        devices = adb.device_list()
        return devices[0] if devices else None
    
    async def rotate_ip_reliable(self, max_wait: int = 25) -> bool:
        """비행기 모드 토글로 LTE IP 회전 — adbutils 기반 안정 버전"""
        dev = self.get_device()
        if not dev:
            return False
        
        # Step 1: 비행기 ON
        dev.shell("cmd connectivity airplane-mode enable")
        await asyncio.sleep(5)
        
        # Step 2: 기기 연결 상태 확인 (최대 5초 대기)
        for _ in range(5):
            if adb.device_list():
                break
            await asyncio.sleep(1)
        
        # Step 3: 비행기 OFF
        dev.shell("cmd connectivity airplane-mode disable")
        
        # Step 4: 셀 재연결 대기 + IP 획득 확인
        for i in range(max_wait):
            await asyncio.sleep(1)
            try:
                result = dev.shell("ip addr show rmnet0 || ip addr show wwan0")
                if "inet " in result:
                    # Step 5: USB 테더링 재활성화 (3회 재시도)
                    for attempt in range(3):
                        dev.shell("service call tethering 3 i32 1")
                        await asyncio.sleep(2)
                        check = dev.shell("getprop init.svc.dhcpcd_rndis0")
                        if "running" in check.lower():
                            return True
                    return True
            except Exception:
                pass
        return False
```

---

### [NEW-11] `stealth_preload.js` — 추가 탐지 벡터 3종 차단

**문제**: 현재 구현에서 누락된 3가지 탐지 벡터:
1. `navigator.mimeTypes` — 빈 목록은 자동화 탐지 시그널
2. `Notification.permission` — 자동화 브라우저는 항상 'denied' 반환
3. `window.chrome` 객체 부재 — Electron 기반 브라우저 탐지

**해결책** (`stealth_preload.js` 추가):
```javascript
// [NEW-11] 추가 탐지 벡터 3종 차단
try {
  // 1. chrome 런타임 객체 위장 (Electron에서 window.chrome이 부재할 경우)
  if (!window.chrome) {
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {},
    };
  }
  
  // 2. Notification.permission — 'default'로 위장 (일반 사용자처럼)
  if (Notification.permission === 'denied') {
    Object.defineProperty(Notification, 'permission', {
      get: () => 'default',
      configurable: true,
    });
  }
  
  // 3. navigator.mimeTypes — PDF 뷰어 포함된 표준 목록 위장
  if (navigator.mimeTypes.length === 0) {
    const mimeTypeList = {
      length: 2,
      0: { type: 'application/pdf', description: 'Portable Document Format' },
      1: { type: 'text/pdf', description: 'Portable Document Format' },
      namedItem: (name) => null,
      item: (i) => mimeTypeList[i] || null,
    };
    Object.defineProperty(navigator, 'mimeTypes', {
      get: () => mimeTypeList,
      configurable: true,
    });
  }
  
  // 4. [NEW-11] navigator.connection 위장 (LTE 환경처럼 보이도록)
  if (navigator.connection) {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        downlink: 15.2,
        rtt: 65,
        saveData: false,
        type: 'cellular',
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
      configurable: true,
    });
  }
} catch(e) {}
```

---

### [NEW-12] Electron `main.js` — 전역 WebRTC + QUIC 차단 스위치 추가

**현재 상태**: `main.js`에 어떠한 `app.commandLine.appendSwitch`도 없음 (grep 결과 확인).

**추가 필요**:
```javascript
// main.js 최상단 (app.on('ready') 이전에 삽입)
import { app } from 'electron';

// ═══════════════════════════════════════════════════════════
// 안티봇 우회 & 개인정보 보호 전역 Chromium 스위치
// ═══════════════════════════════════════════════════════════
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp');  // WebRTC IP 누출 차단
app.commandLine.appendSwitch('disable-webrtc-multiple-routes');                               // WebRTC 다중 경로 차단
app.commandLine.appendSwitch('enforce-webrtc-ip-permission-check');                          // WebRTC IP 권한 강제
app.commandLine.appendSwitch('disable-quic');                                                 // [NEW-1] QUIC 누출 차단
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');              // mDNS 난독화 해제 (실IP 사용)
app.commandLine.appendSwitch('disable-background-networking');                                // 백그라운드 네트워크 요청 차단
app.commandLine.appendSwitch('enable-features', 'DnsOverHttps');                             // DoH 강제
app.commandLine.appendSwitch('dns-over-https-templates', 'https://chrome.cloudflare-dns.com/dns-query');
```

---

## 📋 전체 수정 대상 파일 목록 (Priority 순서)

### 긴급 (즉시 구현)
| 파일 | 수정 항목 |
|---|---|
| [`network_core.py`](file:///c:/ViraLoopMedia/VLStudio/apps/api/app/services/network_core.py) | Bug 2, 7, 9 + NEW-2(asyncio 선택) |
| [`adb_service.py`](file:///c:/ViraLoopMedia/VLStudio/apps/api/app/services/adb_service.py) | Bug 3, 6, 10 + NEW-9, NEW-10 |
| [`network_monitor.py`](file:///c:/ViraLoopMedia/VLStudio/apps/api/app/services/network_monitor.py) | Bug 4, 5, 8 |
| [`stealth_ops_v2.py`](file:///c:/ViraLoopMedia/VLStudio/apps/api/app/services/stealth_ops_v2.py) | 보안①②③④⑤⑥ + NEW-1 |
| [`stealth_preload.js`](file:///c:/ViraLoopMedia/VLStudio/electron/stealth_preload.js) | NEW-3, NEW-4, NEW-11 |
| [`ytExportManager.js`](file:///c:/ViraLoopMedia/VLStudio/electron/ipc/ytExportManager.js) | Electron① + NEW-7, NEW-6 |
| [`main.js`](file:///c:/ViraLoopMedia/VLStudio/electron/main.js) | Electron② + NEW-12 |

### 중기 (다음 스프린트)
| 파일 | 수정 항목 |
|---|---|
| `network_killswitch.py` (신규) | NEW-8 |
| `scripts/usb_power_fix.ps1` (신규) | NEW-9 |
| `test_standalone_youtube.py` | Bug 1 (포트 수정) |

---

## 🔬 확장 검증 계획

### DNS Leak 검증 (Bug 7 + NEW-1)
```bash
# 브라우저가 LTE 프록시를 통해 접속한 상태에서:
# 1. https://dnsleaktest.com → Extended Test
# 결과: LTE 통신사 DNS만 표시되어야 함 (Wi-Fi DNS 없어야 함)

# 2. https://browserleaks.com/quic
# 결과: QUIC 비활성화 표시되어야 함 (--disable-quic 적용 확인)
```

### 지문 탐지 검증 (NEW-3, NEW-4, NEW-11)
```bash
# https://creepjs.com 에서:
# Trust Score > 60% 목표 (현재 구현 시 예상 30~40%)
# 주요 체크포인트: 
#   - webdriver: hidden ✓
#   - canvas: unique but consistent ✓
#   - audio: consistent noise ✓
#   - chrome object: present ✓
```

### KillSwitch 기능 검증 (NEW-8)
```powershell
# KillSwitch 활성화 후:
Get-NetFirewallRule -DisplayName "VLStudio_Block_WiFi*"
# 2개의 규칙이 활성 상태여야 함

# Wi-Fi를 통한 외부 접속 시도
Test-NetConnection -ComputerName google.com -Port 443 -InformationLevel Detailed
# Wi-Fi 인터페이스 통한 연결은 실패해야 함
```

---

---

## 🔬 2025 최신 연구 기반 추가 심층 분석 (서브에이전트 리서치 결과)

### [NEW-13] CDP Runtime.enable 탐지 누출 — nodriver 도입 검토

**결정적 발견**: Playwright가 내부적으로 `Runtime.enable` CDP 명령을 호출하면 크롬이 모든 콘솔 이벤트를 방출하기 시작하고 반복적인 전역 객체 평가를 수행함. 유튜브/구글의 안티봇 스크립트는 이 사이드이펙트를 감지하여 자동화 여부를 판별함.

**CloakBrowser의 한계**: CloakBrowser의 C++ 패치로도 `Runtime.enable`에 의한 CDP 탐지는 차단되지 않음. 이는 바이너리 레벨 문제가 아닌 **CDP 프로토콜 사용 패턴** 문제.

**해결책 옵션**:
1. **단기**: `--remote-debugging-pipe` (보안③에서 이미 계획) + 최소한의 CDP 도메인만 활성화
2. **장기**: `nodriver` 라이브러리로 전환 (CDP-minimal, `Runtime.enable` 호출 회피)

```bash
pip install nodriver
```

```python
# stealth_ops_v2.py 장기 마이그레이션 옵션
import nodriver as uc

async def create_page_nodriver(profile_id: str, proxy: str):
    browser = await uc.start(
        user_data_dir=f"profiles/chan_{profile_id}",
        browser_args=["--proxy-server=" + proxy, "--disable-quic"],
    )
    page = await browser.get('https://studio.youtube.com/')
    return page
```

**우선순위**: 장기 과제 (현재 CloakBrowser + `--remote-debugging-pipe`로 부분 완화)

---

### [NEW-14] IndexedDB 지속성 결여 — 프로필 영속화 전략

**문제**: 매 세션마다 새로운 CloakBrowser 프로필을 생성하면 IndexedDB, LocalStorage, ServiceWorker 캐시가 초기화됨. 구글은 이 빈 상태를 **신규/봇 브라우저의 시그널**로 사용. 특히 유튜브는 IDB에 이전 시청 기록, 설정, 광고 게재 데이터를 저장하는데 이것이 없으면 의심.\n
**해결책**: `stealth_ops_v2.py`의 프로필 경로를 채널별로 영속화. 신규 채널의 경우 "웜업 세션"으로 유기적 IDB 데이터를 축적.

```python
# stealth_ops_v2.py — 프로필 경로 전략
import os, pathlib

PROFILE_BASE = pathlib.Path("profiles")

def get_profile_path(profile_id: str) -> str:
    path = PROFILE_BASE / f"chan_{profile_id}"
    path.mkdir(parents=True, exist_ok=True)
    return str(path)

# 프로필 신규 여부 확인 (웜업 필요 여부)
def is_fresh_profile(profile_id: str) -> bool:
    idb_path = PROFILE_BASE / f"chan_{profile_id}" / "Default" / "IndexedDB"
    return not idb_path.exists() or len(list(idb_path.iterdir())) == 0
```

**웜업 시퀀스** (신규 채널 최초 사용 전):
1. 유튜브 홈 → 10~20개 영상 시청 (30-60초씩)
2. 검색 3~5회 수행
3. 구독 1~2회
4. 24시간 이후 계정 생성/업로드 시도

---

### [NEW-15] 행동 물리 기반 마우스 이동 (Physics-Based Behavioral Biometrics)

**문제**: 현재 `humanize=True` 옵션(CloakBrowser)은 단순 베지에 곡선 수준. 2025년 유튜브/구글의 ML 탐지 모델은 **근육 미진동(micro-jitter), 인지 처리 지연, 목표 근처에서의 속도 감소**를 구별함.

**물리 기반 마우스 이동 구현** (`stealth_ops_v2.py` 추가):

```python
import numpy as np, asyncio

async def physics_mouse_move(page, target_x: float, target_y: float):
    """물리 기반 마우스 이동: 미세 진동 + 인지 지연 + 목표 근방 감속"""
    steps = np.random.randint(25, 45)
    current_pos = await page.evaluate("() => ({x: window.mouseX || 0, y: window.mouseY || 0})")
    cx, cy = current_pos.get('x', 0), current_pos.get('y', 0)
    
    for i in range(steps):
        t = i / steps
        # Ease-in-out + 목표 근방 15% 구간에서 감속
        ease = t * t * (3 - 2 * t)
        if t > 0.85:  # 목표 근방 감속
            ease = ease * 0.6 + 0.4
        
        # 미세 근육 진동 (손 떨림 시뮬레이션)
        jitter_x = np.random.normal(0, 0.7)  # σ = 0.7px
        jitter_y = np.random.normal(0, 0.7)
        
        x = cx + (target_x - cx) * ease + jitter_x
        y = cy + (target_y - cy) * ease + jitter_y
        
        await page.mouse.move(x, y)
        
        # 감마 분포 기반 지연 (균등하지 않은 인간 반응)
        delay = np.random.gamma(shape=2.0, scale=0.008)
        await asyncio.sleep(delay)
    
    await page.mouse.move(target_x, target_y)  # 최종 정확한 위치

async def human_type(page, selector: str, text: str):
    """인간적 타이핑: WPM 분포, 오타 시뮬레이션"""
    avg_delay = 60.0 / (np.random.normal(45, 8) * 5)  # 평균 45 WPM
    for char in text:
        await page.keyboard.press(char)
        # 단어 경계에서 미세 멈춤
        if char == ' ':
            await asyncio.sleep(np.random.exponential(0.08))
        else:
            await asyncio.sleep(max(0.02, np.random.normal(avg_delay, avg_delay * 0.3)))
```

---

### CloakBrowser v0.3.30 탐지 벡터 커버리지 매트릭스

| 탐지 벡터 | CloakBrowser 커버리지 | 추가 대응 필요 |
|---|---|---|
| TLS/JA4 지문 | ⚠️ 부분적 | 바이너리 Chrome 버전 갱신 필요 |
| reCAPTCHA v3 기본 지문 | ✅ 양호 | IP 평판, 구글 계정 없으면 한계 |
| YouTube 캔버스/WebGL 지문 | ✅ 양호 | NEW-4로 추가 강화 |
| HTTP/2 SETTINGS 프레임 | ✅ 양호 | 실 Chromium 바이너리가 정확한 프레임 생성 |
| Chrome 확장 감지 | ❌ 미처리 | 최소 2-3개 일반 확장 설치 권장 |
| 행동 생체인식 | ❌ 미처리 | NEW-15로 구현 필요 |
| ServiceWorker 동작 | ✅ 양호 | 실 Chromium이 정상 처리 |
| **IndexedDB 지속성** | ❌ 미처리 | **NEW-14 즉시 구현 필요** |
| 폰트 지문 | ✅ 양호 | C++ 레벨 패치 |
| navigator.connection | ⚠️ 부분적 | NEW-11에서 위장 추가 |
| 미디어 디바이스 목록 | ⚠️ 부분적 | 보안②에서 `--use-fake-device` 적용 |
| **CDP Runtime.enable 누출** | ❌ 미처리 | **NEW-13 `--remote-debugging-pipe` 필수** |

---

> [!IMPORTANT]
> **구현 순서**: network_core.py (Bug 2,7,9) → adb_service.py (Bug 3,6,10) → network_monitor.py (Bug 4,5,8) → stealth_ops_v2.py (보안 강화 + NEW-13,14,15) → stealth_preload.js (NEW-3,4,11) → ytExportManager.js (NEW-6,7) → main.js (NEW-12)
>
> `stealth_preload.js`의 `Function.prototype.toString` 위장(NEW-3)은 **반드시 다른 코드보다 먼저** 파일 상단에 위치해야 합니다.

> [!NOTE]
> **CloakBrowser의 C++ 패치에 의존하는 항목**: TLS/JA4 지문, HTTP/2 SETTINGS 프레임, WebRTC IP 격리는 CloakBrowser가 네이티브로 처리. JS 레벨 패치 불필요.
>
> **2025 핵심 인사이트**: 현재 최대 취약점은 기술적 지문이 아닌 **행동 패턴 + IndexedDB 빈 상태 + 구글 계정 히스토리 부재**임. CloakBrowser가 지문 차단을 해줘도 이 3가지가 없으면 탐지됨.
>
> **Electron WebContentsView에 적용해야 하는 항목**: `main.js`의 `commandLine` 스위치는 Electron 내부 크롬(Flow AI 등)에도 적용됨. 충돌 여부 테스트 필요.
