---
name: viraloop-pixelearning
description: Enables the Agent to query the Pixeling Discovery and PixeLearning databases to gather trending hooks, templates, and production best practices for a specific niche.
---

# ViraLoop PixeLearning & Discovery Skill

This skill grants ViraLoop Agents (Researcher, Writer, Editor) the ability to tap into the intelligence of the Pixeling ecosystem.

## 1. Pixeling Discovery (`pixeling_discovery` tool)
Use this tool during the **Research phase** to find out what formats, templates, and hooks are currently "going viral" in a specific niche.

### How to use
- Call the `pixeling_discovery` function with the `niche` (e.g. '의학', '테크').
- The tool returns a list of trending templates and hook structures.
- Pass this knowledge to the `writerNode` or the Writer Agent so they can adapt the script to these proven patterns.

## 2. PixeLearning Database (`pixeling_learning` tool)
Use this tool during the **Planning/Writing phase** to learn the optimal settings (BGM ducking, subtitle colors, pacing) for a specific niche before rendering.

### How to use
- Call the `pixeling_learning` function with the `niche`.
- The tool returns JSON data detailing `best_practices` (like `bgm_mood`, `subtitle_style`).
- Pass these specific values into the `audio_control` and `visual_control` parameters of the `render_pixeling` tool.

## Workflow Example
1. User requests: "건강 채널 쇼츠 하나 만들어줘"
2. **RESEARCHER Agent**: Calls `pixeling_discovery(niche="건강")` -> Learns that "TPL_의학상식" template and "Question Hook" are trending.
3. **RESEARCHER Agent**: Calls `pixeling_learning(niche="건강")` -> Learns that 'karaoke' subtitles with Blue stroke perform best.
4. **WRITER Agent**: Writes the script using the "Question Hook".
5. **EDITOR Agent**: Calls `render_pixeling` using the "TPL_의학상식" template and the precise audio/visual controls learned from PixeLearning.
