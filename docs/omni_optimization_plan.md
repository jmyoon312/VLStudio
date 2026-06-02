# Omni 모델 맞춤형 프롬프트 최적화(Model-Aware Prompt Optimization) 계획서

## 1. 개요
현재 VLStudio의 프롬프트 엔지니어링 파이프라인(Bento Box 기법)은 키워드 나열식 방식을 취하고 있어, 전통적인 Diffusion 모델인 **Veo 3.1**에 최적화되어 있습니다. 
최근 발표된 **Omni(Flash)** 모델은 LLM 네이티브 멀티모달 아키텍처이므로 키워드 나열보다는 '서술형(Narrative) 문장'을 더 잘 이해합니다. 따라서 모델 종류에 따라 백엔드 AI가 다른 방식으로 프롬프트를 번역하도록 하는 **모델 맞춤형 분기 로직**을 도입할 계획입니다.

## 2. 현행 문제점
*   **프론트엔드(`AgentCopilot.jsx`)**: 사용자가 선택한 모델(`veo_3_1` 또는 `omni_flash`) 정보가 백엔드 프롬프트 생성기(`veo_prompt_agent.py`)로 전달되지 않고 있습니다.
*   **백엔드(`veo_prompt_agent.py`)**: 단일 프롬프트 가이드라인(쉼표 기반의 태그 조합)만 가지고 씬 묘사를 생성하므로, Omni 모델에서 렌더링 시 일부 화풍 키워드가 무시되거나 일관성이 흔들릴(Drifting) 위험이 존재합니다.

## 3. 구현 목표 및 방안

### Phase 1: 파라미터 전달 연동
*   **대상 파일**: `AgentCopilot.jsx`
*   **작업 내용**: 백엔드 API (`/api/agent/veo-prompt`) 호출 시, Payload에 `model: selectedModel` 필드를 추가하여 현재 사용자가 타겟팅하는 엔진 정보를 넘겨줍니다.

### Phase 2: 백엔드 AI 지시문(System Prompt) 분기 처리
*   **대상 파일**: `veo_prompt_agent.py`
*   **작업 내용**: 전달받은 `model` 값에 따라 LLM에게 주어지는 프롬프트 가이드라인을 동적으로 변경합니다.
    *   **Veo 모드 (`veo_3_1`)**: 기존 방식 유지. 쉼표(,)로 구분된 태그 중심의 정교한 묘사 (`Subject, Action, Lighting, Style`).
    *   **Omni 모드 (`omni_flash`)**: 서술형 묘사(Narrative) 강제. 쉼표 나열을 금지하고 완벽한 영문장 형태로 컨텍스트를 연결하도록 지시. (예: "A medium shot of a man wearing a red hoodie, standing in a room with faded colors and 1990s VHS aesthetic.")

### Phase 3: 프론트엔드 조합 로직 분기
*   **대상 파일**: `AgentCopilot.jsx`
*   **작업 내용**: `brandPersona.vibe` 등의 페르소나 잠금용 키워드를 조합할 때, Omni 모드인 경우 쉼표로 단순히 이어붙이는 대신 자연스럽게 문장의 서두나 말미에 연결되도록 조립 방식을 개선합니다.

## 4. 기대 효과
*   **Veo 3.1**: 특유의 섬세한 질감 묘사와 조명 통제력 극대화 유지.
*   **Omni Flash**: 역동적인 10초 영상 생성 시에도 LLM이 문맥을 완벽히 이해하여 컷이 무너지거나 캐릭터가 변형되는 현상 방지.

---
**비고:** 본 문서는 기본 렌더링 테스트(Veo 기반 단일 고정 시드 + I2V 지능형 전환)가 완전히 안정화된 직후, 다음 개발 스프린트에서 즉시 참조하여 개발을 재개하기 위해 작성되었습니다.
