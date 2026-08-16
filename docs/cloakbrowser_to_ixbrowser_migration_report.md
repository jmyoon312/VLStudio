# CloakBrowser -> iXBrowser Migration & Automation Report

## 1. 개요 (Overview)
기존 자체 개발된 `CloakBrowser` (Patchright/Playwright 기반)는 유지보수 및 핑거프린트 업데이트 지연으로 인해 YouTube 연좌제 노출 위험이 있었습니다. 이를 방지하기 위해 상용 안티디텍트 브라우저인 `iXBrowser`로의 전환 및 보안/네트워크 계층의 고도화를 진행했습니다.

## 2. 주요 변경 사항 (Key Changes)

### 2.1 iXBrowser 통합 및 CDP 업로드 안정화 (P1)
- **파일:** `apps/api/app/services/browser/ix_engine.py`
- **변경 사항:** 
  - iXBrowser를 제어하는 `IxEngine`을 구현하고, Playwright 기반 CDP 연결 로직을 통합.
  - YouTube 업로드 스크립트에 타임아웃, 예외 처리, 프로그레스 바 대기(`wait_for_function`) 로직 추가.
  - 업로드 완료 후 리소스 누수를 방지하기 위한 `finally` 페이지 닫기 처리.

### 2.2 ADB 및 LTE SOCKS5 프록시 자동화 (P2)
- **파일:** `apps/api/app/services/browser/proxy_chain.py`, `apps/api/app/routers/browser.py`
- **변경 사항:**
  - 모바일(스마트폰) USB 연결(ADB)을 활용한 LTE 테더링 프록시 체이닝을 자동화.
  - `lte_interface_ip="auto"` 요청 시 백그라운드에서 SOCKS5 터널링 구축 및 iXBrowser 실행 시 해당 프록시를 동적으로 주입.

### 2.3 시스템 전역 기본 엔진 변경 (P3)
- **파일:** `apps/api/app/models.py`, `apps/api/app/routers/browser.py`
- **변경 사항:**
  - DB 모델 `Profile.engine_type`의 기본값을 `"cloakbrowser"`에서 `"ixbrowser"`로 변경.
  - API Router의 Request Schema 기본값들도 모두 `"ixbrowser"`로 갱신하여 신규 생성 시 기본으로 iXBrowser가 선택되도록 조치.

### 2.4 CloakBrowser 자가 방어 (오토 업데이트) 로직 추가 (P0)
- **파일:** `apps/api/app/services/browser/updater.py`
- **변경 사항:**
  - 부득이하게 CloakBrowser를 써야 하는 상황을 대비해 `patchright install chromium` 명령을 자동으로 수행하는 업데이터 스크립트 작성. 구버전 핑거프린트로 인한 정지를 최소화.

## 3. 기대 효과 (Impact)
1. **연좌제 리스크 감소:** iXBrowser의 상용 수준 핑거프린트 방어 기술 적용으로 계정 간 연관성 차단 성능 극대화.
2. **네트워크 독립성 확보:** 스마트폰 LTE 프록시의 완전 자동화를 통해 IP 대역 중복 방지.
3. **안정성 증가:** CDP 통신 기반의 업로드 스크립트 예외 처리 강화로 업로드 실패율 감소.

## 4. 향후 계획 (Next Steps)
- 모니터링: iXBrowser 기반으로 생성된 초기 채널들의 7일~14일 간 밴(Ban) 발생 여부 관찰.
- 고도화: 향후 FoxEngine 등 다중 엔진 스위칭 아키텍처에 대한 유연성 검증.