"""
ViraLoop Studio Sovereign stdio MCP Server for OpenAI Codex Astra & External LLMs
================================================================================
OpenAI Codex CLI(아스트라) 및 외부 LLM이 로컬 바이럴루프 22대 영상 제작/OS 통제 도구를
표준 stdio(Standard I/O) JSON-RPC 트랜스포트로 자율 호출할 수 있도록 제공합니다.
"""
import sys
import os
import asyncio
from pathlib import Path
from typing import Optional, List, Dict, Any

# UTF-8 IO Reconfiguration (Strict Windows Console encoding protection)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Add apps/api to sys.path
api_root = Path(__file__).resolve().parent.parent.parent.parent
if str(api_root) not in sys.path:
    sys.path.insert(0, str(api_root))

from fastmcp import FastMCP
from app.services.channel_dna_service import ChannelDNAService
from app.services.sovereign_preset_engine import sovereign_preset_engine
from app.agent.hermes_core.tools.hermes_tool_registry import hermes_tool_dispatcher
from app.services.local_os_controller import local_os_controller

# Codex Astra 전용 고지능 Sovereign MCP 서버 생성
sovereign_mcp = FastMCP("ViraLoop-Studio-Astra")


@sovereign_mcp.tool()
def montage_analyze_channel(channel_url: str, sample_count: int = 12) -> dict:
    """
    유튜브 채널 URL(@핸들 또는 채널 주소)의 대표 쇼츠 12편(최신 6편+인기 6편)을 로컬에 전수 다운로드하고,
    FFmpeg 씬 체인지, 평균 컷 주기(ASL), 자막 위치, 오디오 음향(WPM)을 100% 실제 계측하여 4대 제작 DNA를 도출합니다.
    """
    res = ChannelDNAService.analyze_channel(channel_url=channel_url, sample_count=sample_count)
    return {
        "success": True,
        "channel_title": res.get("channel_title"),
        "total_videos_analyzed": len(res.get("analyzed_videos", [])),
        "analyzed_videos": res.get("analyzed_videos", []),
        "visual_dna": res.get("visual_dna", {}),
        "script_dna": res.get("script_dna", {}),
        "audio_dna": res.get("audio_dna", {}),
        "source_origin_dna": res.get("source_origin_dna", {}),
        "ai_growth_suggestions": res.get("ai_growth_suggestions", []),
        "downloaded_video_path": res.get("downloaded_video_path")
    }


@sovereign_mcp.tool()
async def montage_create_production_plan(prompt: str, aspect_ratio: str = "1080x1920") -> dict:
    """
    기획 아이디어나 주제를 받아 3초 훅, 스토리 구조, 씬별 대본이 포함된 영상 제작 기획안을 수립합니다.
    """
    return await hermes_tool_dispatcher.dispatch("montage_create_production_plan", {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio
    })


@sovereign_mcp.tool()
async def montage_render_video(
    title: str,
    cues: list,
    form_factor: str = "classic",
    style_override: dict = None
) -> dict:
    """
    대본, 자막 타임코드(cues), 스타일을 종합하여 실제 로컬 FFmpeg/NLE 엔진으로 고화질 MP4 숏폼 영상을 합성·렌더링합니다.
    """
    return await hermes_tool_dispatcher.dispatch("montage_render_video", {
        "title": title,
        "cues": cues,
        "form_factor": form_factor,
        "style_override": style_override or {}
    })


@sovereign_mcp.tool()
async def montage_export_capcut_draft(
    project_name: str,
    video_path: str = None,
    duration_s: float = 15.0,
    auto_launch: bool = True
) -> dict:
    """
    현재 제작된 영상과 자막 트랙을 로컬 PC의 CapCut 드래프트 프로젝트로 즉시 변환하여 등록하고 CapCut을 실행합니다.
    """
    return await hermes_tool_dispatcher.dispatch("montage_export_capcut_draft", {
        "project_name": project_name,
        "video_path": video_path,
        "duration_s": duration_s,
        "auto_launch": auto_launch
    })


@sovereign_mcp.tool()
async def pixeling_revise_preset_draft(
    revision_intent: str,
    style_patch: dict = None
) -> dict:
    """
    픽셀링 역공학 특화 도구: 영상이나 음성을 다시 생성하지 않고, 자막 색상/폰트/크기/위치만 1초 만에 초고속으로 수정하여 새 영상으로 패치합니다.
    """
    return await hermes_tool_dispatcher.dispatch("pixeling_revise_preset_draft", {
        "revision_intent": revision_intent,
        "style_patch": style_patch or {}
    })


@sovereign_mcp.tool()
def montage_save_preset(
    name: str,
    recipe: str,
    content_rules: list = None,
    archetype: str = "classic",
    style_patch: dict = None,
    interactive_layer: dict = None,
    speaker_colors: dict = None,
    stepwise_expansion: bool = None
) -> dict:
    """
    분석된 스타일 지표를 바탕으로 새로운 공식 Sovereign Preset을 시스템에 영구 저장합니다.
    """
    style = sovereign_preset_engine.official_presets.get("science", {}).get("style", {})
    if style_patch:
        style.update(style_patch)
    if interactive_layer:
        style["interactive_layer"] = interactive_layer
    if speaker_colors:
        style["speaker_colors"] = speaker_colors
    if stepwise_expansion is not None:
        style["stepwise_expansion"] = stepwise_expansion

    preset = sovereign_preset_engine.create_custom_preset(
        name=name,
        category="custom",
        recipe=recipe,
        content_rules=content_rules or ["상단 볼드 타이틀 유지", "하단 18% 마진 자막"],
        style=style
    )
    return {
        "success": True,
        "preset_id": preset.get("id"),
        "name": preset.get("name"),
        "message": f"프리셋 [{name}]이 바이럴루프 공식 보관함에 안전하게 등록되었습니다."
    }


@sovereign_mcp.tool()
async def pixeling_capture_template_draft(video_or_url: str, preset_name: str = None) -> dict:
    """
    레퍼런스 영상에서 0.5초 콘택트 시트와 자막 ROI 스트립을 합성·발골하여 상단바, 타이틀, 자막 및 인터랙티브 레이어를 세션 드래프트에 즉시 캡처·동기화합니다.
    """
    return await hermes_tool_dispatcher.dispatch("pixeling_capture_template_draft", {
        "video_or_url": video_or_url,
        "preset_name": preset_name
    })


@sovereign_mcp.tool()
async def montage_analyze_reference(video_or_url: str) -> dict:
    """
    유튜브 링크나 로컬 영상의 비전/음성을 시각 지능 팩(Contact Sheet + Subtitle ROI Strip)으로 인터리빙 분석하여 타이틀 위치, 자막 스타일, 컷 전환 주기를 발골합니다.
    """
    return await hermes_tool_dispatcher.dispatch("montage_analyze_reference", {
        "video_or_url": video_or_url
    })


@sovereign_mcp.tool()
async def synthesize_voice_speech(
    text: str,
    engine: str = "supertonic",
    voice_id: str = "supertonic_ko_1",
    emotion: str = "normal",
    speed: float = 1.1
) -> dict:
    """
    대본 텍스트를 고품질 AI 목소리(TTS)로 합성합니다. Supertonic 온디바이스 음성, Gemini 3.8 감정 연출 보이스를 지원합니다.
    """
    return await hermes_tool_dispatcher.dispatch("synthesize_voice_speech", {
        "text": text,
        "engine": engine,
        "voice_id": voice_id,
        "emotion": emotion,
        "speed": speed
    })


@sovereign_mcp.tool()
async def web_search_and_trends(query: str) -> dict:
    """
    구글 실시간 검색망을 동기화하여 2026 최신 트렌드, 핫아이템, 바이럴 소재, 팩트를 검색합니다.
    """
    return await hermes_tool_dispatcher.dispatch("web_search_and_trends", {"query": query})


@sovereign_mcp.tool()
async def search_youtube_reference_videos(query: str, max_results: int = 5) -> dict:
    """
    유튜브에서 레퍼런스 쇼츠 영상이나 벤치마킹할 영상을 실시간 검색합니다.
    """
    return await hermes_tool_dispatcher.dispatch("search_youtube_reference_videos", {
        "query": query,
        "max_results": max_results
    })


@sovereign_mcp.tool()
async def system_open_folder(folder_type: str = "exports") -> dict:
    """
    로컬 윈도우 파일 탐색기를 열어 완성본(exports), 다운로드(downloads), 캡컷(capcut) 폴더를 화면에 띄웁니다.
    """
    return await hermes_tool_dispatcher.dispatch("system_open_folder", {"folder_type": folder_type})


@sovereign_mcp.tool()
async def system_launch_capcut(project_name: str = None) -> dict:
    """
    로컬 PC에 설치된 CapCut 데스크톱 앱을 직접 실행합니다.
    """
    return await hermes_tool_dispatcher.dispatch("system_launch_capcut", {"project_name": project_name})


@sovereign_mcp.tool()
async def system_inspect_environment() -> dict:
    """
    로컬 PC의 멀티미디어 자원(CapCut 설치 여부, FFmpeg 가용 여부, 저장소 경로)을 진단합니다.
    """
    return await hermes_tool_dispatcher.dispatch("system_inspect_environment", {})


@sovereign_mcp.tool()
def exec_command(cmd: str, workdir: str = None, timeout_sec: int = 60) -> dict:
    """
    로컬 윈도우 쉘 또는 PowerShell 명령어를 직접 실행합니다. yt-dlp, FFmpeg 등 컴퓨터를 제어합니다.
    """
    return local_os_controller.execute_command(cmd=cmd, workdir=workdir, timeout=timeout_sec)


@sovereign_mcp.tool()
async def browser_search_and_browse(query: str = None, url: str = None, take_screenshot: bool = True) -> dict:
    """
    Playwright 헤드리스 브라우저로 구글 검색을 수행하고 웹페이지를 방문하여 텍스트 및 스크린샷을 수집합니다.
    """
    return await local_os_controller.browser_search_and_browse(query=query, url=url, take_screenshot=take_screenshot)


@sovereign_mcp.tool()
def vision_inspect_media(media_path_or_url: str, focus_areas: list = None) -> dict:
    """
    영상 또는 이미지의 키프레임을 분석하여 상단 타이틀, 자막 세이프존, 얼굴 바운딩 박스를 정밀 계측합니다.
    """
    return local_os_controller.vision_inspect(media_path_or_url=media_path_or_url, focus_areas=focus_areas)


@sovereign_mcp.tool()
def system_file_manager(operation: str, path: str, content: str = None) -> dict:
    """
    로컬 파일시스템(목록 조회 list, 파일 읽기 read, 파일 쓰기 write, 탐색기 열기 open_in_explorer)을 제어합니다.
    """
    return local_os_controller.file_manager(operation=operation, path=path, content=content)


@sovereign_mcp.tool()
async def stream_slice_online(url: str, start_time: str, end_time: str, output_name: str = None) -> dict:
    """
    온라인 무다운로드 스트림 슬라이서: 풀영상을 다운로드하지 않고 필요한 구간만 온라인 스트림에서 2초 만에 절삭합니다.
    """
    return await hermes_tool_dispatcher.dispatch("stream_slice_online", {
        "url": url,
        "start_time": start_time,
        "end_time": end_time,
        "output_name": output_name
    })


@sovereign_mcp.tool()
async def reverse_source_shorts(shorts_url: str) -> dict:
    """
    쇼츠 원본 역추적 스카우터: 쇼츠 URL을 입력받아 원본 1080p 고화질 긴 영상 풀버전을 자동 발굴합니다.
    """
    return await hermes_tool_dispatcher.dispatch("reverse_source_shorts", {"shorts_url": shorts_url})


@sovereign_mcp.tool()
async def upload_queue_enqueue(
    title: str,
    video_path: str = None,
    description: str = None,
    tags: list = None,
    channel_id: str = "default_channel",
    priority: str = "high"
) -> dict:
    """
    완성된 숏폼 영상(MP4)을 바이럴 메타데이터와 함께 유튜브 자동 배포 관리 대기열로 직결 등록합니다.
    """
    return await hermes_tool_dispatcher.dispatch("upload_queue_enqueue", {
        "title": title,
        "video_path": video_path,
        "description": description or f"{title}\n\n#Shorts #Viral #ViraLoop",
        "tags": tags or ["Shorts", "Viral"],
        "channel_id": channel_id,
        "priority": priority
    })


@sovereign_mcp.tool()
async def interactive_overlay_composite(
    overlay_type: str,
    config: dict,
    video_path: str = None
) -> dict:
    """
    [픽셀링 최신 1.0.124 동급 기능] 인터랙티브 오버레이 3종 합성:
    - comment_card: 베댓 카드 (author, text, likes, avatar)
    - product_tracker: 3단 쇼핑 상품 바 (product_name, price, discount_badge)
    - quiz_card: 실시간 OX / 다지선다 인터랙티브 퀴즈 박스
    """
    from app.services.sovereign_preset_engine import sovereign_preset_engine
    return await sovereign_preset_engine.composite_interactive_overlay(
        overlay_type=overlay_type,
        config=config,
        video_path=video_path
    )


if __name__ == "__main__":
    # Standard I/O MCP transport for OpenAI Codex CLI
    sovereign_mcp.run(transport="stdio")
