# ViraLoop Studio (VLStudio Desktop)

Electron 데스크톱 앱 - Google Flow AI로 이미지/비디오 생성 후 CapCut 프로젝트로 내보내기

## 기반 프로젝트
- whisk2capcut-desktop를 fork하여 Flow API로 교체
- AutoFlow Chrome 확장 (10.7.58)에서 역공학한 API 사용

## AI 에이전트 전역 규칙: 10대 순수 개발 전문 엔지니어링 매트릭스
모든 코드 작성, 아키텍처 설계, 리팩토링, 디버깅, 최적화 시 아래 10대 순수 개발 전문 스킬을 유기적으로 적용한다:

1. **`clean-architecture-guardian`**: [아키텍처] Electron 3-Tier 계층 분리, 의존성 역전, Single Source of Truth 수호.
2. **`code-refactoring-patterns`**: [리팩토링] 모놀리식 컴포넌트 해체, 단일 책임 원칙(SRP), Strategy/Adapter 패턴 적용.
3. **`async-concurrency-state`**: [동시성/상태] Race Condition 방지, React 18 동시성 제어, 디스크-메모리 자가치유 복원.
4. **`electron-web-synergy`**: [네이티브 브릿지] WebContentsView 레이아웃 제어, 다중 구글 세션 격리, OS 바인딩.
5. **`network-api-reverse-engineer`**: [역공학 통신] Chrome 확장(AutoFlow) 번들 및 tRPC/OAuth/WebSocket 네이티브 재구축.
6. **`media-codec-binary-pipeline`**: [미디어 바이너리] Base64/Buffer 메모리 최적화, 마이크로초(`ms * 1000`) 정밀 타임코드 연산.
7. **`storage-database-lifecycle`**: [스토리지 I/O] `05_Exports` 표준 저장소 규칙, 원자적 파일 쓰기 락(`withProjectWriteLock`).
8. **`bulletproof-fullstack-dev`**: [인터페이스 계약] Renderer ↔ Preload ↔ Main 3계층 계약 무결성 검증기(`contract-checker.js`).
9. **`systematic-debugging`**: [과학적 디버깅] 추측성 수정 배제, 가설 수립 및 4대 상태 추적 기반 5단계 결함 격리.
10. **`performance-memory-profiler`**: [성능 최적화] Electron GPU/V8 메모리 누수 방지, 가상 렌더링, IPC 오버헤드 최소화.

- 모든 작업 전후 반드시 `contract-checker.js` 및 `storage-validator.js`를 실행하여 계약 무결성을 입증할 것.
