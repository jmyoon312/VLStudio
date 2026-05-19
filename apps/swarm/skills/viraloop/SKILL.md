---
name: viraloop
description: Specialized skill for the ViraLoop AI Content Workstation. Orchestrates autonomous multi-agent production of high-quality, senior-focused video content. Use when producing videos, conducting senior-focused research, generating AI assets via Higgsfield, or rendering Remotion templates. Triggers on production mission goals, content generation requests, and video rendering tasks.
---

# ViraLoop AI Content Swarm

This skill empowers the OpenClaw swarm to operate the ViraLoop content generation pipeline. It enables specialized agents to collaborate on research, scriptwriting, asset generation, and final rendering.

## Swarm Roles

- **Coordinator**: Owns the mission goal. Spawns and manages sub-agents (Researcher, MediaSpecialist). Ensures quality gates are met.
- **Researcher**: Investigates topics for the target demographic (senior-focused). Writes the shooting script and voiceover text.
- **MediaSpecialist**: Generates visual assets (videos via Higgsfield, images) and orchestrates the final Remotion render.

## Core Workflow

1.  **Mission Inception**: The Coordinator receives the production topic and parameters (Format, Quality).
2.  **Research & Script**: Coordinator spawns a **Researcher** sub-agent to produce the script.
    -   *Tool*: `research` (via bridge)
3.  **Asset Generation**: Coordinator spawns a **MediaSpecialist** to generate video/audio assets based on the script.
    -   *Tool*: `generate_video`, `tts` (via bridge)
4.  **Quality Check & Fallback**: MediaSpecialist verifies asset quality. If AI video generation fails, falls back to styled static imagery.
5.  **Rendering**: MediaSpecialist triggers the final render.
    -   *Tool*: `render` (via bridge)

## Tools (via viraloop_bridge.py)

The following bridge actions are available through `scripts/viraloop_bridge.py`:

| Action | Description | Payload Example |
| :--- | :--- | :--- |
| `assets` | Generate AI assets (video, audio, images) | `{"type": "video", "prompt": "...", "channel_id": "..."}` |
| `render` | Trigger Remotion render | `{"script": "...", "assets": [...], "format": "vertical"}` |
| `status` | Check task status | `{"task_id": "..."}` |

## Quality Gates

- **Video Priority**: Always attempt `video` asset generation first using Higgsfield.
- **Image Fallback**: If the bridge returns a failure or exhaustion error from the AI provider, immediately pivot to generating `image` assets with appropriate styling.
- **Consistency**: Ensure the Researcher passes the `channel_id` to the MediaSpecialist to maintain brand consistency.

## Usage Guide

To start a production run, use the `viraloop_bridge.py` script:

```bash
python3 scripts/viraloop_bridge.py assets '{"type": "video", "prompt": "..."}'
```

The Coordinator should always announce mission milestones to the requester.
