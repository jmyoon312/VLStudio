# 에이전트 컷 데이터 표준 명세서 (Agent Cut Integration Schema)

본 문서는 **[리서치/인텔리전스 봇]**이 대본 및 에셋 생성을 완료한 후, 프론트엔드의 **[에이전트 컷 에디터 (Agent Cut Editor)]**로 넘겨주어야 하는 데이터의 표준 JSON 양식을 정의합니다.

## 1. 목적 및 철학
*   **Decoupling:** 리서치 로직과 에디터 렌더링 로직의 완벽한 분리.
*   **Template-Driven:** 사전에 정의된 템플릿(제한적 레이아웃)에 동적 데이터를 안전하게 바인딩(`{{variable}}`)하는 구조.
*   **CapCut-Ready:** 최종적으로 캡컷(CapCut) 프로젝트 파일로 쉽게 변환될 수 있는 구조 차용.

---

## 2. JSON 스키마 구조 (Schema Definition)

리서치 봇은 편집기를 로출할 때 아래 구조를 가지는 JSON 객체를 payload로 전달해야 합니다.

```json
{
  "version": "1.0",
  "projectId": "string",             // 프로젝트 고유 ID
  
  // 1. 채널 페르소나 (연출 지침)
  "channelPersona": {
    "channelName": "string",         // 예: "ViraLoop 팁 채널"
    "handle": "string",              // 예: "@viraloop_tips"
    "editingDirectives": {
      "pacing": "fast | normal | slow", // 전체적인 컷 편집 템포
      "defaultTransition": "string",    // 범용 트랜지션 식별자 (예: "glitch", "fade_black")
      "colorCorrection": "string"       // 범용 필터 식별자 (예: "vibrant", "cinematic")
    }
  },

  // 2. 템플릿 지정 (레이아웃 틀)
  "template": {
    "templateId": "string",          // 템플릿 에디터에서 사전 정의된 레이아웃 ID (예: "ig_reels_style_01")
    "aspectRatio": "9:16 | 16:9 | 1:1 | 4:5 | 3:4",
    // 템플릿에 정의된 변수들에 바인딩될 실제 값들
    "bindings": {
      "title": "string",
      "subtitle": "string",
      "avatarUrl": "url_string"
    }
  },

  // 3. 타임라인 에셋 리스트 (자동 세팅될 에셋들)
  "assets": {
    "videos": [
      {
        "id": "v1",
        "sourceUrl": "url_string",
        "duration": 5.5,
        "agentMetadata": {
          "prompt": "사이버펑크 도시 배경",
          "model": "Flow_V1"
        }
      }
    ],
    "audios": [
      {
        "id": "a1",
        "type": "tts | bgm",
        "sourceUrl": "url_string",
        "duration": 10.0,
        "agentMetadata": {
          "speaker": "ko-KR-Standard-A"
        }
      }
    ]
  },

  // 4. 타임라인 트랙 및 클립 배치 (트랙별 Z-index 순서대로 렌더링)
  "tracks": [
    {
      "type": "video",          // 트랙 종류 (video, audio, text)
      "clips": [
        {
          "id": "clip_v1",
          "assetId": "v1",      // assets.videos 배열의 ID 참조
          "start": 0,           // 타임라인 상의 시작 시간 (초)
          "end": 5.5,           // 타임라인 상의 종료 시간 (초)
          "trimIn": 0,          // 원본 소스의 재생 시작 시점
          "transitionOut": "fade_black" // 개별 클립의 전환 효과
        }
      ]
    },
    {
      "type": "audio",
      "clips": [
        {
          "id": "clip_a1",
          "assetId": "a1",      // assets.audios 배열의 ID 참조
          "start": 0,
          "end": 10.0
        }
      ]
    },
    {
      "type": "caption",
      "clips": [
        {
          "id": "cap1",
          "text": "안녕하세요, 바이럴루프입니다.",
          "start": 0,
          "end": 2.5
        },
        {
          "id": "cap2",
          "text": "오늘은 에이전트 컷에 대해 알아볼게요.",
          "start": 2.5,
          "end": 5.5
        }
      ]
    }
  ]
}
```

## 3. 필드 상세 설명 (Field Descriptions)

### `channelPersona`
해당 채널의 성격과 고유한 스타일을 나타냅니다. 에디터는 이 지침에 따라 템플릿 렌더링 방식이나 타임라인 클립 배치를 미세하게 조절합니다.
*   `editingDirectives`: 에이전트가 영상의 컷 간격이나 전환 효과를 자동 결정할 때 참고하는 메타데이터입니다. 이 값은 캡컷 내보내기 시 캡컷 전용 이펙트 ID로 변환됩니다.

### `template`
제한적 레이아웃 에디터(템플릿 에디터)에서 생성된 "틀"을 호출합니다.
*   `bindings`: 템플릿 내부에 `{{title}}` 혹은 `{{avatarUrl}}` 형태로 지정된 플레이스홀더에 주입될 텍스트나 URL을 key-value 형태로 넘깁니다. 영상 렌더링 시 자동으로 치환됩니다.

### `assets`
타임라인에서 사용할 미디어 원본(소스) 파일들의 정보입니다. 
*   `agentMetadata`: 사용자가 에디터 내에서 "이 에셋 마음에 안듦. 다시 생성(Regenerate)해줘" 라고 요청할 때 활용되는 프롬프트나 모델 정보입니다.

### `tracks`
실제 타임라인에 클립이 어떤 시간(start, end)에 배치될지를 나타내는 OpenTimelineIO 방식의 구조입니다. 하위 배열 인덱스가 클수록 위쪽 레이어로 렌더링됩니다.
