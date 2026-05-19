# ViraLoop Bridge API Reference

Base URL: `http://127.0.0.1:8000/api/bridge`

## Endpoints

### POST /ai-agent/execute
Runs an LLM call with web search capability.
- `system_prompt`: string — role and task for the AI
- `user_input`: string — user query
- `config.use_web_search`: bool — enable Tavily/web search grounding
- **Returns**: `{ content: any, status: string }`

### POST /generate-asset
Generates a media asset (image or video).
- `type`: `"image"` | `"video"`
- `prompt`: string — descriptive generation prompt
- `config.model`: string — for video: `"kling-v1.0-standard"`, `"kling-v1.2-standard"`, `"luma-photon"`, `"wan-2.1"`, `"ltx-video"` (tries in order as fallback)
- `config.duration`: int — video duration in seconds (default: 5)
- `config.aspect_ratio`: string — `"9:16"` for Shorts, `"16:9"` for landscape
- `config.mode`: string — for image: `"quality"` | `"speed"`
- `config.style`: string — style prompt suffix for image generation
- **Returns**: `{ status: "success"|"error", file_path: string, detail?: string }`

### POST /tts/generate
Generates Korean TTS audio.
- `text`: string — script text (max ~800 chars per call for best quality)
- `voice`: string — `"ko-KR-Standard-A"` (female) | `"ko-KR-Standard-B"` (male)
- `speed`: float — -10 to 10, 0 = normal speed
- **Returns**: `{ status: "success"|"error", file_path: string }`

### POST /render
Renders final video via Remotion.
- `composition`: `"UniversalVideo"` or `"ShortsVideo"`
- `outName`: string — output filename (e.g., `ViraLoop_ch1_1234567890.mp4`)
- `props.scene.title`: string
- `props.scene.description`: string — subtitle/hook line
- `props.scene.videoClipPath`: string|null — path to AI video clip
- `props.scene.imagePath`: string|null — fallback static image path
- `props.scene.audioPath`: string|null — TTS audio path
- `props.scene.script`: string — full narration text
- `props.scene.style.textColor`: hex color
- `props.scene.style.backgroundColor`: hex color
- `props.scene.style.animation`: `"fade"` | `"slide"` | `"zoom"`
- `props.scene.style.subtitles`: bool — overlay Korean captions
- **Returns**: `{ status: "success"|"error", file_path: string }`

### POST /workflow/callback
Notifies ViraLoop of job completion.
- `session_id`: string
- `topic`: string
- `status`: `"completed"` | `"failed"`
- `result.video_path`: string

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 404 | Endpoint not found or service down | Check backend is running on port 8000 |
| 422 | Validation error | Check request body schema |
| 500 + "no API key" | Missing generation API key | Fall back to static image or mock |
| 500 + "no such column" | DB schema mismatch | Backend DB needs migration |
