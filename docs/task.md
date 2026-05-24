# Path F++ 구현 태스크

## Phase 1: network_core.py ✅
- [x] Bug 2: `start_proxy_server` 마지막 print 조건 분기 (실패 시에만 출력)
- [x] Bug 7: `resolve_dns_via_interface()` 인터페이스 바인딩 DNS 리졸버 추가
- [x] Bug 9: `pipe_sockets()` 전역 헬퍼 추출 (Socks5Handler + WifiSocks5Handler 공유)
- [x] `get_tethering_interface_ip(use_cache=True)` 호출 통일

## Phase 2: adb_service.py ✅
- [x] Bug 3: `_find_tethering_interface()` — 'Connected' + 'Isolated' 상태 모두 수용
- [x] Bug 4: 괄호 접미사 제거 — `re.sub` 으로 (IP-Match) 같은 접미사 제거
- [x] Bug 6: `get_tethering_interface_ip(use_cache=True)` 서명 수정 + monitor 캐시 우선 조회
- [x] Bug 10: `rotate_ip()` — 비행기 해제 후 ADB device 준비 대기 루프 (최대 15초) + USB tethering 재시도 3회
- [x] NEW-10: USB RNDIS 어댑터 절전 방지 PowerShell 로직 기록 (scripts/usb_power_fix.ps1)

## Phase 3: network_monitor.py ✅
- [x] Bug 4: lte_name에 실제 OS Alias만 저장 (접미사 오염 완전 제거)
- [x] Bug 5: BusType=5 PCI Wired LAN 식별 로직 추가, 192.168.1. IP 시그니처 제거
- [x] Bug 8: `fix_metrics_elevated`에 Wi-Fi `Disable-NetAdapterBinding ms_tcpip6` 명령 추가

## Phase 4: stealth_ops_v2.py ✅
- [x] NEW-14: `get_profile_path()` / `is_fresh_profile()` — 프로필 영속화 헬퍼
- [x] 보안①②③④: `browser_args` 목록에 WebRTC/QUIC/DoH/미디어 플래그 추가
- [x] 보안⑤: `safe_click()` / `safe_input()` Null-Safe 래퍼 추가
- [x] `launch_config`에 `profile_dir` 영속 경로 전달

## Phase 5: stealth_preload.js ✅
- [x] NEW-3: `Function.prototype.toString` 네이티브 위장 (파일 최상단)
- [x] NEW-4: Canvas/Audio Deterministic Noise (Seeded LCG — 프로필별 고유 지문)
- [x] NEW-11: window.chrome, Notification.permission, navigator.mimeTypes, navigator.connection 위장

## Phase 6: ytExportManager.js ✅
- [x] Electron①: `proxyRules` → `socks5://127.0.0.1:{port}` (SOCKS5 수정)
- [x] NEW-6: DBSC `Sec-Session-Registration` 헤더 모니터링 + `dbscBoundBrands` Set 기록
- [x] NEW-7: UserAgent → Chrome 136, `Sec-CH-UA` / `Sec-CH-UA-Platform` 헤더 일치

## Phase 7: main.js ✅
- [x] Electron② + NEW-12: `app.commandLine.appendSwitch` — WebRTC IP 누출 차단, QUIC 비활성화, DoH 강제

## Phase 8: Layout.tsx (Global UAC Trigger) ✅
- [x] USB 테더링 감지 시 라우팅 메트릭 미교정 상태일 때 자동으로 UAC 최적화 팝업 모달 노출

## 검증 ✅
- [x] Python 구문 검사 통과 (network_core.py, adb_service.py, network_monitor.py, stealth_ops_v2.py)
- [x] React 대시보드 컴파일 및 빌드 성공 (Vite build OK)

## 남은 검증 작업 (수동)
- [x] 실제 테스트: https://dnsleaktest.com Extended Test → LTE 통신사 DNS만 표시
- [x] QUIC 비활성화 확인: https://browserleaks.com/quic
- [x] Canvas 지문 일관성: https://creepjs.com (동일 프로필 동일 지문)
- [x] IP 로테이션 후 USB 테더링 자동 복구 확인
- [x] 추가 보안/안정성 개선 사항 구현 (Zero-latency IP 캐싱, Android 11-14 멀티-폴백 테더링)
- [x] 2026 최신 안티디텍션/격리 연구 및 검증 산출물 작성 (advanced_stealth_research_2026.md, walkthrough.md)

