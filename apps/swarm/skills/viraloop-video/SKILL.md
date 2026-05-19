---
name: viraloop-video
description: Full autonomous video production pipeline for the ViraLoop AI Content Workstation. Use when asked to produce, create, render, or generate a YouTube Short, long-form video, or any social media video clip. Handles the entire workflow: trend research → script writing → AI video/image generation (Higgsfield Kling/Luma, or static image) → Korean TTS voiceover → Remotion final render. Integrates with the ViraLoop FastAPI backend at http://127.0.0.1:8000/api/bridge. Triggers on: "쇼츠 만들어", "영상 제작", "create a short", "generate video", "make a YouTube video", "produce content for channel".
---

# ViraLoop Video Production Skill

Produces complete, broadcast-ready videos by coordinating ViraLoop's backend services. The backend exposes all tools via the bridge API at `http://127.0.0.1:8000/api/bridge`.

## Decision Framework: Choosing the Right Video Tool

Before starting, evaluate which tool combination to use based on the goal:

| Goal | Image Strategy | Video Strategy |
|------|---------------|----------------|
| Maximum quality (시니어 정보 채널) | Higgsfield AI Video Clip | `generate-asset` type=video, use Kling/Luma model |
| Fast / high-volume batch | Static image + pan/zoom | `generate-asset` type=image |
| No API keys available | Mock/placeholder | Remotion-only slide render |

**Always prefer AI-generated video clips over static images when possible.** Only fall back to static images if the video generation endpoint returns an error or no API key is available.

## Workflow

### Step 1: Research Trends
```
POST http://127.0.0.1:8000/api/bridge/ai-agent/execute
{
  "system_prompt": "You are a Korean content strategist for a senior-focused informational YouTube channel. Find the 3 most viral, high-watch-time topics for: {TOPIC}. Return JSON array with {title, hook, key_points[3], target_emotion}.",
  "user_input": "Find trending senior-interest content about {TOPIC}",
  "config": { "use_web_search": true }
}
```
Save `response.data.content` as `research`.

### Step 2: Write Script
Use the research to write a complete Korean video script:
- Hook (첫 3초 grabber)
- 3 key talking points (30–60 sec each)
- CTA closing

### Step 3: Generate AI Video Clip (Preferred)
```
POST http://127.0.0.1:8000/api/bridge/generate-asset
{
  "type": "video",
  "prompt": "{cinematic_prompt_based_on_script}",
  "config": {
    "model": "kling-v1.0-standard",
    "duration": 5,
    "aspect_ratio": "9:16"
  }
}
```
If `response.data.status === "success"`, use `response.data.file_path` as `videoClipPath`.
If it fails, fall back to Step 3b.

### Step 3b: Fallback — Static Image Generation
```
POST http://127.0.0.1:8000/api/bridge/generate-asset
{
  "type": "image",
  "prompt": "{descriptive_visual_prompt}",
  "config": { "mode": "quality", "style": "cinematic, 4k, warm tones, Korean elderly audience" }
}
```

### Step 4: Korean TTS Voiceover
```
POST http://127.0.0.1:8000/api/bridge/tts/generate
{
  "text": "{full_script}",
  "voice": "ko-KR-Standard-A",
  "speed": 0
}
```
Save `response.data.file_path` as `audioPath`. If TTS fails, proceed without audio (Remotion will render silently).

### Step 5: Final Render with Remotion
```
POST http://127.0.0.1:8000/api/bridge/render
{
  "composition": "UniversalVideo",
  "outName": "ViraLoop_{CHANNEL_ID}_{TIMESTAMP}.mp4",
  "props": {
    "scene": {
      "title": "{title}",
      "description": "{hook}",
      "videoClipPath": "{videoClipPath_or_null}",
      "imagePath": "{imagePath_or_null}",
      "audioPath": "{audioPath_or_null}",
      "script": "{full_script}",
      "style": {
        "textColor": "#ffffff",
        "backgroundColor": "#0a0a0a",
        "animation": "fade",
        "subtitles": true
      }
    }
  }
}
```

## Quality Gates

After each step, evaluate the output:
- **Research**: Did we get ≥3 topics with hooks? If not, retry with a broader prompt.
- **Video/Image**: Is the generated asset thematically relevant? If the prompt was too generic, refine it.
- **Audio**: Is the script ≤800 characters per TTS call to avoid truncation?

See `references/api-spec.md` for full endpoint documentation and error codes.
See `references/channel-strategy.md` for the 30-category senior content strategy.
