---
name: viraloop-pixeling
description: Deep control Pixeling integration skill for the ViraLoop AI Content Workstation. Use when asked to render a video using Pixeling, apply specific templates, control BGM/Ducking, or remove silence from audio. Integrates with the ViraLoop FastAPI backend at http://127.0.0.1:8000/api/bridge/pixeling/render. Triggers on: "픽셀링으로 렌더링해", "픽셀링 영상 제작", "use pixeling to render".
---

# ViraLoop Pixeling Rendering Skill

Produces highly customized videos using the Pixeling Engine. This skill allows deep control over the rendering process, including aspect ratio, TTS, BGM ducking, silence removal, and subtitle styles.

## Deep Control Schema

When you need to render a video, you must construct a JSON payload based on the channel's specific style and the user's instructions.

### Endpoint
`POST http://127.0.0.1:8000/api/bridge/pixeling/render`

### Payload Structure

```json
{
  "project": {
    "type": "shorts",          // Choose "shorts" or "long_form"
    "aspect_ratio": "9:16",    // "9:16", "16:9", or "1:1"
    "channel_id": "CH_001",    // Optional: Channel identifier for preset loading
    "template_id": "TPL_썰형"  // Optional: Specific Pixeling template
  },
  "content": {
    "script": "Your full script here...",
    "assets": [
      { "type": "video", "path": "/media/bg_01.mp4", "duration": 5.0 },
      { "type": "image", "path": "/media/img_02.png", "effect": "pan_zoom" }
    ]
  },
  "audio_control": {
    "tts": {
      "voice_id": "ko-KR-Standard-A",
      "speed": 1.0,
      "pitch": 0.0
    },
    "bgm": {
      "track_id": "bgm_suspense_01",
      "volume": 0.15,
      "ducking": true           // Set to true to lower BGM when voice plays
    },
    "silence_removal": {
      "enabled": true,
      "threshold_db": -40.0,
      "min_silence_len": 0.5
    }
  },
  "visual_control": {
    "subtitles": {
      "enabled": true,
      "font": "Pretendard-Bold",
      "style": "karaoke",       // "karaoke", "pop", or "highlight"
      "primary_color": "#FFFF00",
      "stroke_color": "#000000"
    },
    "transitions": {
      "default_type": "fade",
      "duration": 0.3
    }
  }
}
```

## Workflow

### Step 1: Determine Video Specifications
Analyze the user's request or the current channel strategy to determine the `project` settings (shorts/long_form, aspect ratio).

### Step 2: Prepare Content and Audio Control
Fill the `content.script` with the full text. Select the appropriate TTS voice, BGM, and ensure `silence_removal` is configured correctly.

### Step 3: Execute Render Request
Send the POST request to the Bridge API.

If `response.data.status === "success"`, use `response.data.job_id` or `response.data.video_url` to confirm the rendering is queued or completed.

## Quality Gates
- **Script Length**: Ensure the script is fully prepared.
- **Ducking**: Always enable BGM ducking (`audio_control.bgm.ducking = true`) if TTS is used.
- **Silence Removal**: Enable silence removal for shorts to keep pacing fast.
