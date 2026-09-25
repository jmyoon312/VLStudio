"""
ViraLoop Studio Sovereign stdio MCP Server for OpenAI Codex Astra
================================================================
OpenAI Codex CLI(아스트라)가 로컬 바이럴루프 도구를 자율적으로 호출할 수 있도록
표준 stdio(Standard I/O) JSON-RPC 트랜스포트로 FastMCP 서버를 구동합니다.
"""
import sys
import os
from pathlib import Path

# UTF-8 IO Reconfiguration
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
def montage_save_preset(
    name: str,
    recipe: str,
    content_rules: list,
    archetype: str = "classic",
    style_patch: dict = None
) -> dict:
    """
    분석된 스타일 지표를 바탕으로 새로운 공식 Sovereign Preset을 시스템에 영구 저장합니다.
    """
    style = sovereign_preset_engine.official_presets.get("science", {}).get("style", {})
    if style_patch:
        style.update(style_patch)
    preset = sovereign_preset_engine.create_custom_preset(
        name=name,
        category="custom",
        recipe=recipe,
        content_rules=content_rules,
        style=style
    )
    return {
        "success": True,
        "preset_id": preset.get("id"),
        "name": preset.get("name"),
        "message": f"프리셋 [{name}]이 바이럴루프 공식 보관함에 안전하게 등록되었습니다."
    }

@sovereign_mcp.tool()
def exec_command(cmd: str, workdir: str = None, timeout_sec: int = 60) -> dict:
    """
    로컬 윈도우 쉘 또는 PowerShell 명령어를 직접 실행합니다.
    yt-dlp, FFmpeg, 파일 목록 등 로컬 컴퓨터를 자율 제어합니다.
    """
    from app.services.local_os_controller import local_os_controller
    return local_os_controller.execute_command(cmd=cmd, workdir=workdir, timeout=timeout_sec)

@sovereign_mcp.tool()
async def browser_search_and_browse(query: str = None, url: str = None, take_screenshot: bool = True) -> dict:
    """
    Playwright 헤드리스 브라우저로 구글 검색을 수행하고 웹페이지를 방문하여 텍스트 및 스크린샷을 수집합니다.
    """
    from app.services.local_os_controller import local_os_controller
    return await local_os_controller.browser_search_and_browse(query=query, url=url, take_screenshot=take_screenshot)

@sovereign_mcp.tool()
def vision_inspect_media(media_path_or_url: str, focus_areas: list = None) -> dict:
    """
    영상 또는 이미지의 키프레임을 분석하여 상단 타이틀, 자막 세이프존, 얼굴 바운딩 박스를 정밀 계측합니다.
    """
    from app.services.local_os_controller import local_os_controller
    return local_os_controller.vision_inspect(media_path_or_url=media_path_or_url, focus_areas=focus_areas)

@sovereign_mcp.tool()
def system_file_manager(operation: str, path: str, content: str = None) -> dict:
    """
    로컬 파일시스템(목록 조회 list, 파일 읽기 read, 파일 쓰기 write, 탐색기 열기 open_in_explorer)을 제어합니다.
    """
    from app.services.local_os_controller import local_os_controller
    return local_os_controller.file_manager(operation=operation, path=path, content=content)

if __name__ == "__main__":
    # Standard I/O MCP transport for OpenAI Codex CLI
    sovereign_mcp.run(transport="stdio")
