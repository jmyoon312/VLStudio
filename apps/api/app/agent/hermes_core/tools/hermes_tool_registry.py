"""
Hermes Tool Registry & Autonomous Action Dispatcher.
Unified Tool Calling Specification bridging:
1. OpenMontage Standard Spec Tools (Capability-First compose, plan, analyze)
2. Pixeling Reverse-Engineered Extension Tools (1-second rapid revision, in-memory draft)
3. Local OS & Software Control Bindings (CapCut launch, Explorer folder open, FFmpeg)

Exposes dual schemas:
- OpenAI Function Calling Tool Schemas
- Google Gemini Function Declarations
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

from app.services.openmontage.viraloop_openmontage_mcp import ViraLoopOpenMontageMCP
from app.services.openmontage.tool_registry import openmontage_registry
from app.agent.hermes_core.tools.pixagent_presets_tool import pixagent_presets
from app.services.sovereign_preset_engine import sovereign_preset_engine
from app.services.capcut_registry_manager import CapCutRegistryManager
from app.services.local_os_controller import local_os_controller

logger = logging.getLogger("hermes_tool_registry")


# === 1. OpenAI Function Calling Tool Schemas ===
HERMES_OPENAI_TOOLS: List[Dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "montage_create_production_plan",
            "description": "기획 아이디어나 주제를 받아 3초 훅, 스토리 구조, 씬별 대본이 포함된 영상 제작 기획안을 수립합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "영상 기획 주제 또는 스토리 아이디어"},
                    "aspect_ratio": {"type": "string", "enum": ["1080x1920", "1920x1080", "1080x1080"], "default": "1080x1920"}
                },
                "required": ["prompt"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "montage_render_video",
            "description": "대본, 자막 타임코드(cues), 스타일을 종합하여 실제 로컬 FFmpeg/NLE 엔진으로 고화질 MP4 숏폼 영상을 합성·렌더링합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "영상 상단에 표시할 볼드 타이틀"},
                    "cues": {
                        "type": "array",
                        "description": "자막 리스트 (각 항목은 text, start_ms, end_ms 포함)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "start_ms": {"type": "integer"},
                                "end_ms": {"type": "integer"}
                            },
                            "required": ["text", "start_ms", "end_ms"]
                        }
                    },
                    "form_factor": {"type": "string", "enum": ["classic", "ssul", "instagram", "gunlimbo"], "default": "classic"},
                    "style_override": {"type": "object", "description": "색상, 폰트 크기, 마진 등 커스텀 스타일"}
                },
                "required": ["title", "cues"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "montage_export_capcut_draft",
            "description": "현재 제작된 영상과 자막 트랙을 로컬 PC의 CapCut 드래프트 프로젝트로 즉시 변환하여 등록하고 CapCut을 실행합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "CapCut 프로젝트명"},
                    "video_path": {"type": "string", "description": "베이스 비디오 파일 절대경로 (생략 시 기본)"},
                    "duration_s": {"type": "number", "description": "영상 길이(초)", "default": 15.0},
                    "auto_launch": {"type": "boolean", "description": "생성 즉시 CapCut 프로그램을 PC에서 실행할지 여부", "default": True}
                },
                "required": ["project_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "pixeling_revise_preset_draft",
            "description": "픽셀링 역공학 특화 도구: 영상이나 음성을 다시 생성하지 않고, 자막 색상/폰트/크기/위치만 1초 만에 초고속으로 수정하여 새 영상으로 패치합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "revision_intent": {"type": "string", "description": "사용자의 수정 요구 (예: '자막 노란색으로 바꿔줘', '글자 더 크게')"},
                    "style_patch": {
                        "type": "object",
                        "description": "수정할 스타일 JSON (예: {\"caption\": {\"color\": \"#FFD700\", \"size_px\": 72}})"
                    }
                },
                "required": ["revision_intent"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "pixeling_save_preset",
            "description": "현재 영상의 자막 디자인, 색상, 타이틀 배치를 바이럴루프 프리셋 보관함에 영구 등록합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "새 프리셋 이름"},
                    "recipe": {"type": "string", "description": "스타일 레시피 설명"},
                    "content_rules": {"type": "array", "items": {"type": "string"}, "description": "제작 룰"}
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "montage_analyze_reference",
            "description": "유튜브 링크나 로컬 영상의 비전/음성을 인터리빙 분석하여 타이틀 위치, 자막 스타일, 컷 전환 주기를 발골합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "video_or_url": {"type": "string", "description": "분석할 유튜브 URL 또는 로컬 비디오 파일 경로"}
                },
                "required": ["video_or_url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "montage_analyze_channel",
            "description": "YouTube 채널 URL(@핸들 또는 채널 주소)의 대표 쇼츠 12편(최신 6편+인기 6편)을 실시간 수집하고, 대표 영상들을 로컬로 다운로드하여 6대 시각 레이어(상단바, 타이틀, 자막), 편집 컷 주기, 오디오 음향(WPM)을 정밀 역공학 실측합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel_url": {"type": "string", "description": "YouTube 채널 URL (예: 'https://www.youtube.com/@tamjeongcat')"},
                    "sample_count": {"type": "integer", "description": "수집할 쇼츠 편수 (기본 12)", "default": 12}
                },
                "required": ["channel_url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "web_search_and_trends",
            "description": "구글 실시간 검색망을 동기화하여 2026 최신 트렌드, 유행하는 상품/쇼핑 핫아이템, 해외 인플루언서 바이럴 소재, 팩트를 검색합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "검색 키워드 (예: '2026 틱톡 해외 인플루언서 쇼핑 핫아이템', '다이슨 에어랩 숏폼 트렌드')"}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_youtube_reference_videos",
            "description": "유튜브에서 레퍼런스 쇼츠 영상이나 벤치마킹할 영상을 실시간 검색하여 후보 영상 URL과 제목을 수집합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "유튜브 검색어 (예: '외국 인플루언서 쇼핑 추천 숏폼', '다이슨 단발 스타일링')"},
                    "max_results": {"type": "integer", "description": "가져올 최대 영상 수", "default": 5}
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "synthesize_voice_speech",
            "description": "작성된 대본 텍스트를 고품질 AI 목소리(TTS)로 합성하여 오디오 파일을 생성합니다. Supertonic 온디바이스 로컬 음성을 기본으로 하며, Kokoro, Typecast, ElevenLabs, Gemini 차세대 음성을 지원합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "음성으로 합성할 전체 대본 텍스트"},
                    "engine": {
                        "type": "string",
                        "enum": ["supertonic", "kokoro", "typecast", "elevenlabs", "gemini"],
                        "default": "supertonic",
                        "description": "사용할 TTS 음성 엔진 (기본값: supertonic 온디바이스 무제한 고품질 음성)"
                    },
                    "voice_id": {
                        "type": "string",
                        "description": "목소리 ID (Supertonic: 'supertonic_ko_1', '준기', '지민', '현우' / Kokoro: 'ko_female_1', 'ko_male_1' / Gemini: 'Puck', 'Charon', 'Kore', 'Fenrir' / Typecast: voice_id / ElevenLabs: voice_id)",
                        "default": "supertonic_ko_1"
                    },
                    "emotion": {
                        "type": "string",
                        "enum": ["normal", "happy", "sad", "angry", "dramatic"],
                        "default": "normal",
                        "description": "음성 감정 톤앤매너"
                    },
                    "speed": {
                        "type": "number",
                        "description": "음성 속도 배속 (0.8 ~ 1.5, 숏폼 권장: 1.05 ~ 1.2)",
                        "default": 1.1
                    }
                },
                "required": ["text"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_open_folder",
            "description": "로컬 윈도우 파일 탐색기를 열어 완성본(05_Exports), 다운로드(07_Downloads), 또는 캡컷 프로젝트 폴더를 사용자 화면에 띄웁니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "folder_type": {
                        "type": "string",
                        "enum": ["exports", "downloads", "capcut", "assets", "inbox"],
                        "default": "exports",
                        "description": "열고자 하는 표준 미디어 계층 폴더"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_launch_capcut",
            "description": "사용자의 로컬 PC에 설치된 CapCut 데스크톱 앱을 직접 실행합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "project_name": {"type": "string", "description": "실행 후 열 프로젝트명 (선택)"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_inspect_environment",
            "description": "로컬 PC의 멀티미디어 자원(CapCut 설치 여부, FFmpeg 가용 여부, 저장소 경로)을 진단합니다.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "exec_command",
            "description": "로컬 윈도우 PowerShell 또는 쉘 명령어를 직접 실행합니다. yt-dlp 영상 다운로드, FFmpeg 미디어 변환, 디렉토리 탐색 등 컴퓨터를 제어할 수 있습니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cmd": {"type": "string", "description": "실행할 쉘 명령어 (예: 'yt-dlp --version', 'dir', 'ffmpeg -i ...')"},
                    "workdir": {"type": "string", "description": "실행할 작업 디렉토리 절대경로 (선택)"},
                    "timeout_sec": {"type": "integer", "description": "타임아웃(초)", "default": 60}
                },
                "required": ["cmd"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "browser_search_and_browse",
            "description": "Playwright 헤드리스 브라우저를 구동하여 구글 검색을 수행하고 웹페이지를 직접 방문하여 본문 텍스트와 실시간 스크린샷을 수집합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "구글 검색어 (예: '2026 틱톡 해외 쇼핑 트렌드', '다이슨 에어랩 숏폼 기획')"},
                    "url": {"type": "string", "description": "직접 방문할 웹페이지 URL (선택)"},
                    "take_screenshot": {"type": "boolean", "description": "화면 스크린샷 캡처 여부", "default": True}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "vision_inspect_media",
            "description": "이미지 또는 비디오 영상의 키프레임을 AI 비전 엔진으로 분석하여 상단 타이틀 위치, 자막 Safe Zone, 얼굴 영역의 바운딩 박스를 정밀 계측합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "media_path_or_url": {"type": "string", "description": "분석할 미디어 파일 경로 또는 URL"},
                    "focus_areas": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "분석 영역 (예: ['subtitles', 'top_title', 'character_face'])"
                    }
                },
                "required": ["media_path_or_url"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "system_file_manager",
            "description": "로컬 파일시스템을 제어합니다. 파일 목록 조회, 파일 읽기/생성, 윈도우 파일 탐색기 열기를 수행합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": ["list", "read", "write", "open_in_explorer"],
                        "description": "수행할 작업"
                    },
                    "path": {"type": "string", "description": "대상 디렉토리 또는 파일 절대경로"},
                    "content": {"type": "string", "description": "write 작업 시 파일에 기록할 텍스트"}
                },
                "required": ["operation", "path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "cross_verify_channel_dna",
            "description": "아스트라(Astra)의 스토리텔링 연출 가설과 제미나이(Gemini)의 물리 컷/자막 실측 수치를 교차 검증(Side-by-Side Diff)하여 최상의 하이브리드 소버린 프리셋을 합성 등록합니다.",
            "parameters": {
                "type": "object",
                "properties": {
                    "channel_url": {"type": "string", "description": "대상 유튜브 채널 URL"},
                    "astra_hypotheses": {"type": "object", "description": "아스트라가 도출한 스토리텔링/훅 연출 지침"},
                    "gemini_physical_metrics": {"type": "object", "description": "제미나이가 실측한 물리 컷 지속시간 및 자막 좌표"}
                },
                "required": ["channel_url"]
            }
        }
    }
]


# === 2. Google Gemini Function Declarations ===
def get_gemini_tools() -> List[Dict[str, Any]]:
    """Converts OpenAI tool schemas to Google Gemini function declaration format."""
    declarations = []
    for tool in HERMES_OPENAI_TOOLS:
        fn = tool["function"]
        declarations.append({
            "name": fn["name"],
            "description": fn["description"],
            "parameters": fn["parameters"]
        })
    return [{"function_declarations": declarations}]


# === 3. Autonomous Tool Execution Dispatcher ===
class HermesToolDispatcher:
    """
    Executes tools requested by OpenAI / Gemini models, bridging OpenMontage, Pixeling, and Local OS.
    """

    @staticmethod
    async def dispatch(
        tool_name: str,
        arguments: Dict[str, Any],
        session_id: str = "default_session",
        previous_deliverable: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Executes the specified tool with arguments and returns structured outcome.
        """
        logger.info(f"⚡ [HermesToolDispatcher] Executing '{tool_name}' with args: {arguments}")

        # 1. OpenMontage: Production Plan
        if tool_name == "montage_create_production_plan":
            prompt = arguments.get("prompt", "")
            aspect_ratio = arguments.get("aspect_ratio", "1080x1920")
            res = await ViraLoopOpenMontageMCP.montage_create_production_plan(prompt=prompt, aspect_ratio=aspect_ratio)
            return {
                "success": True,
                "tool_name": tool_name,
                "result": res,
                "message": f"'{prompt[:30]}' 영상 기획안 및 대본이 성공적으로 수립되었습니다."
            }

        # 2. OpenMontage / Sovereign NLE: Render Video
        elif tool_name == "montage_render_video":
            title = arguments.get("title", "바이럴 숏폼")
            cues = arguments.get("cues", [])
            form_factor = arguments.get("form_factor", "classic")
            style_override = arguments.get("style_override", {})

            # Use SovereignPresetEngine to render
            output_name = f"render_{int(os.times().system * 1000)}.mp4"
            exports_dir = local_os_controller.EXPORTS_DIR
            target_output = str(exports_dir / output_name)

            render_res = await sovereign_preset_engine.render_parametric(
                clips=[],
                cues=cues,
                style=style_override,
                title=title,
                output_path=target_output
            )
            return {
                "success": True,
                "tool_name": tool_name,
                "deliverable": render_res.get("deliverable"),
                "video_path": render_res.get("video_path"),
                "message": f"영상 합성 및 렌더링이 완료되었습니다! ({title})"
            }

        # 3. OpenMontage / CapCut: Export & Launch
        elif tool_name == "montage_export_capcut_draft":
            project_name = arguments.get("project_name", "ViraLoop 숏폼 프로젝트")
            video_path = arguments.get("video_path")
            if not video_path and previous_deliverable:
                video_path = previous_deliverable.get("video_path")
            duration_s = arguments.get("duration_s", 15.0)
            auto_launch = arguments.get("auto_launch", True)
            cues = previous_deliverable.get("cues", []) if previous_deliverable else []

            draft_tool = openmontage_registry.get_tool("vl_capcut_draft_tool")
            res = await draft_tool.run(
                project_name=project_name,
                video_path=video_path,
                cues=cues,
                duration_s=duration_s
            )

            # Register into local PC CapCut root_meta_info.json
            capcut_mgr = CapCutRegistryManager()
            folder_name = res.data.get("project_id", project_name)
            draft_id = res.data.get("project_id", project_name)
            duration_ms = int(duration_s * 1000)
            capcut_mgr.register_project(
                project_name=project_name,
                folder_name=folder_name,
                draft_id=draft_id,
                duration_ms=duration_ms
            )

            launch_res = None
            if auto_launch:
                launch_res = local_os_controller.launch_capcut(project_name=project_name)

            return {
                "success": True,
                "tool_name": tool_name,
                "project_name": project_name,
                "capcut_registered": True,
                "launch_result": launch_res,
                "message": f"CapCut PC 프로젝트 [{project_name}] 등록 및 실행이 완료되었습니다!"
            }

        # 4. Pixeling Reverse-Engineered: Rapid Revision Loop
        elif tool_name == "pixeling_revise_preset_draft":
            revision_intent = arguments.get("revision_intent", "")
            style_patch = arguments.get("style_patch", {})

            # Prepare session draft from previous deliverable if available
            if previous_deliverable:
                await pixagent_presets.pixeling_set_preset_draft(
                    session_id=session_id,
                    clips=[{"source_path": previous_deliverable.get("video_path"), "start_ms": 0, "end_ms": 60000}] if previous_deliverable.get("video_path") else [],
                    cues=previous_deliverable.get("cues", []),
                    title=previous_deliverable.get("title"),
                    audio_path=previous_deliverable.get("audio_path"),
                    style=previous_deliverable.get("style", sovereign_preset_engine.official_presets["science"]["style"])
                )

            revised = await pixagent_presets.pixeling_revise_preset_draft(
                session_id=session_id,
                revision_intent=revision_intent,
                style_patch=style_patch
            )
            return {
                "success": True,
                "tool_name": tool_name,
                "deliverable": revised.get("deliverable"),
                "message": f"피드백('{revision_intent}')이 즉시 렌더링에 반영되었습니다!"
            }

        # 5. Pixeling: Save Preset
        elif tool_name == "pixeling_save_preset":
            name = arguments.get("name", "커스텀 프리셋")
            recipe = arguments.get("recipe", "에이전트 맞춤 스타일")
            content_rules = arguments.get("content_rules", ["상단 볼드 타이틀 유지", "하단 18% 마진 자막"])
            curr_style = previous_deliverable.get("style") if previous_deliverable else sovereign_preset_engine.official_presets["science"]["style"]

            new_preset = sovereign_preset_engine.create_custom_preset(
                name=name,
                category="custom",
                recipe=recipe,
                content_rules=content_rules,
                style=curr_style
            )
            return {
                "success": True,
                "tool_name": tool_name,
                "preset": new_preset,
                "message": f"프리셋 [{name}]이 공식 보관함에 안전하게 등록되었습니다."
            }

        # 6. OpenMontage / Vision: Analyze Reference
        elif tool_name == "montage_analyze_reference":
            target = arguments.get("video_or_url", "")
            from app.services.hermes_asset_scout import hermes_asset_scout
            from app.services.media_intelligence.core import MediaIntelligenceCore

            local_video = target
            video_meta = {}
            if target.startswith("http://") or target.startswith("https://"):
                local_video = await hermes_asset_scout.download_youtube_video(target)
                video_meta = await hermes_asset_scout.extract_video_info(target)

            analysis = {}
            try:
                from app.services.omniroute_vision_analyzer import omniroute_vision_analyzer
                analysis = await omniroute_vision_analyzer.analyze_video_interleaved(local_video)
            except Exception as e:
                logger.warning(f"Vision interleaving fallback: {e}")
                core = MediaIntelligenceCore()
                duration = await core.get_video_duration(Path(local_video))
                analysis = {
                    "video_title": video_meta.get("title", os.path.basename(local_video)),
                    "duration_s": duration,
                    "recipe": "참고 영상 스타일 기반 발골",
                    "content_rules": ["0~3초 시선 집중 훅 유지", "상단 볼드 타이틀", "하단 18% 마진 자막"],
                    "parsed_style": {"style": sovereign_preset_engine.official_presets["science"]["style"]}
                }

            return {
                "success": True,
                "tool_name": tool_name,
                "video_path": local_video,
                "analysis": analysis,
                "message": f"레퍼런스 영상('{os.path.basename(local_video)}')의 비전/오디오 스타일 발골이 완료되었습니다."
            }

        # 6.1 OpenMontage / Vision: Analyze YouTube Channel
        elif tool_name == "montage_analyze_channel":
            channel_url = arguments.get("channel_url", "")
            sample_count = int(arguments.get("sample_count", 12))
            from app.services.channel_dna_service import ChannelDNAService
            dna_res = await asyncio.to_thread(ChannelDNAService.analyze_channel, channel_url, sample_count)
            c_title = dna_res.get("channel_title", channel_url)
            vids = dna_res.get("analyzed_videos", [])
            return {
                "success": True,
                "tool_name": tool_name,
                "channel_title": c_title,
                "analyzed_videos": vids,
                "downloaded_video_path": dna_res.get("downloaded_video_path"),
                "visual_dna": dna_res.get("visual_dna", {}),
                "script_dna": dna_res.get("script_dna", {}),
                "audio_dna": dna_res.get("audio_dna", {}),
                "source_origin_dna": dna_res.get("source_origin_dna", {}),
                "ai_growth_suggestions": dna_res.get("ai_growth_suggestions", []),
                "dna_blueprint": dna_res,
                "message": f"'{c_title}' 채널 쇼츠 {len(vids)}편 실시간 수집 및 대표 영상 비주얼/오디오 실측 분석이 완료되었습니다."
            }

        # 6.5 Real-time Web Grounding & Trends
        elif tool_name == "web_search_and_trends":
            query = arguments.get("query", "")
            from app.services.realtime_web_grounding import realtime_web_grounding
            res = realtime_web_grounding.fetch_live_search_context(query)
            return {
                "success": True,
                "tool_name": tool_name,
                "query": query,
                "grounded": res.get("grounded", False),
                "summary": res.get("text", "검색 결과를 정리했습니다."),
                "queries": res.get("queries", []),
                "source_urls": res.get("source_urls", []),
                "message": f"'{query}' 실시간 구글 웹 검색 및 트렌드 수집이 완료되었습니다."
            }

        # 6.6 YouTube Reference Search
        elif tool_name == "search_youtube_reference_videos":
            query = arguments.get("query", "")
            max_results = arguments.get("max_results", 5)
            from app.services.hermes_asset_scout import hermes_asset_scout
            results = await hermes_asset_scout.search_youtube(query, max_results=max_results)
            return {
                "success": True,
                "tool_name": tool_name,
                "query": query,
                "results": results,
                "count": len(results),
                "message": f"'{query}' 관련 유튜브 레퍼런스 영상 {len(results)}개를 수집했습니다."
            }

        # 6.7 Synthesize Voice Speech (TTS: Supertonic Default + Gemini 3.8 Flash TTS + Typecast, ElevenLabs, Kokoro)
        elif tool_name == "synthesize_voice_speech":
            text = arguments.get("text") or arguments.get("script_text") or arguments.get("script") or ""
            engine = arguments.get("engine") or ("gemini" if any(k in str(arguments).lower() for k in ["gemini", "charon", "fenrir", "puck", "kore", "aoede"]) else "gemini")
            voice_id = arguments.get("voice_id") or arguments.get("voice") or "Charon"
            emotion = arguments.get("emotion", "normal")
            speed = float(arguments.get("speed", 1.0))
            rate = int((speed - 1.0) * 100)

            # Auto-fallback to active script from previous deliverable if text is omitted
            if not text or len(str(text).strip()) < 5:
                if previous_deliverable and isinstance(previous_deliverable, dict):
                    text = previous_deliverable.get("script") or " ".join([c.get("text", "") for c in previous_deliverable.get("cues", []) if c.get("text")])

            # Auto-detect engine from voice_id if voice_id belongs to Gemini 3.8 prebuilt voices
            gemini_voices = ["Puck", "Charon", "Kore", "Fenrir", "Aoede"]
            if voice_id in gemini_voices or any(gv.lower() == str(voice_id).lower() for gv in gemini_voices):
                engine = "gemini"
                for gv in gemini_voices:
                    if gv.lower() == str(voice_id).lower():
                        voice_id = gv
                        break

            # Map engine alias
            if engine in ["supertonic", "supertone"]:
                engine = "supertone-local"
            elif engine in ["gemini-3.8-flash-tts", "gemini-3.8", "gemini_tts"]:
                engine = "gemini"

            from app.tts_engine import TTSEngine
            from app.crud import get_settings
            from app.database import SessionLocal

            with SessionLocal() as db:
                db_settings = get_settings(db)
                tts = TTSEngine(db_settings)
                try:
                    tts_res = await tts.generate_audio(
                        text=text,
                        engine=engine,
                        language="ko",
                        voice_id=voice_id,
                        rate=rate,
                        emotion=emotion
                    )
                except Exception as tts_err:
                    logger.warning(f"⚠️ Primary TTS '{engine}' failed ({tts_err}), falling back to Supertonic local...")
                    tts_res = await tts.generate_audio(
                        text=text,
                        engine="supertone-local",
                        language="ko",
                        voice_id="supertonic_ko_1",
                        rate=rate,
                        emotion=emotion
                    )

                audio_path = tts_res.get("file_path") or tts_res.get("path")
                duration = tts_res.get("duration", 15.0)

            return {
                "success": True,
                "tool_name": tool_name,
                "engine": engine,
                "voice_id": voice_id,
                "audio_path": audio_path,
                "duration_s": duration,
                "message": f"[{engine.upper()}] 고품질 AI 음성 합성이 완료되었습니다. (목소리: {voice_id}, 속도: {speed}x, 길이: {round(duration, 1)}초)"
            }

        # 7. Local OS: Open Folder in Explorer
        elif tool_name == "system_open_folder":
            folder_type = arguments.get("folder_type", "exports")
            res = local_os_controller.open_folder(folder_type=folder_type)
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "result": res,
                "message": res.get("message", "폴더 열기 완료")
            }

        # 8. Local OS: Launch CapCut App
        elif tool_name == "system_launch_capcut":
            project_name = arguments.get("project_name")
            res = local_os_controller.launch_capcut(project_name=project_name)
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "result": res,
                "message": res.get("message", "CapCut 실행 완료")
            }

        # 9. Local OS: Inspect Environment
        elif tool_name == "system_inspect_environment":
            env = local_os_controller.get_system_environment()
            return {
                "success": True,
                "tool_name": tool_name,
                "environment": env,
                "message": "로컬 멀티미디어 환경 진단이 완료되었습니다."
            }

        # 10. Autonomous Terminal Shell: exec_command
        elif tool_name == "exec_command":
            cmd = arguments.get("cmd", "")
            workdir = arguments.get("workdir")
            timeout_sec = arguments.get("timeout_sec", 60)
            res = local_os_controller.execute_command(
                cmd=cmd,
                workdir=workdir,
                timeout=timeout_sec
            )
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "cmd": cmd,
                "exit_code": res.get("exit_code", -1),
                "stdout": res.get("stdout", ""),
                "stderr": res.get("stderr", ""),
                "duration_ms": res.get("duration_ms", 0),
                "workdir": res.get("workdir", ""),
                "message": f"터미널 명령어 실행 완료 (코드 {res.get('exit_code', -1)}): {cmd[:40]}"
            }

        # 11. Autonomous Web Browser: browser_search_and_browse
        elif tool_name == "browser_search_and_browse":
            query = arguments.get("query")
            url = arguments.get("url")
            take_screenshot = arguments.get("take_screenshot", True)
            res = await local_os_controller.browser_search_and_browse(
                query=query,
                url=url,
                take_screenshot=take_screenshot
            )
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "title": res.get("title", ""),
                "url": res.get("url", ""),
                "extracted_text": res.get("extracted_text", ""),
                "search_results": res.get("search_results", []),
                "screenshot_path": res.get("screenshot_path"),
                "screenshot_data_url": res.get("screenshot_data_url"),
                "message": res.get("message", "브라우징 완료")
            }

        # 12. Autonomous Vision Inspector: vision_inspect_media
        elif tool_name == "vision_inspect_media":
            media_path_or_url = arguments.get("media_path_or_url", "")
            focus_areas = arguments.get("focus_areas")
            res = local_os_controller.vision_inspect(
                media_path_or_url=media_path_or_url,
                focus_areas=focus_areas
            )
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "media_path": res.get("media_path"),
                "frame_path": res.get("frame_path"),
                "frame_data_url": res.get("frame_data_url"),
                "aspect_ratio": res.get("aspect_ratio", "9:16"),
                "bounding_boxes": res.get("bounding_boxes", []),
                "visual_metrics": res.get("visual_metrics", {}),
                "message": res.get("message", "비전 실측 완료")
            }

        # 13. Autonomous File Manager: system_file_manager
        elif tool_name == "system_file_manager":
            operation = arguments.get("operation", "list")
            path = arguments.get("path", str(local_os_controller.EXPORTS_DIR))
            content = arguments.get("content")
            res = local_os_controller.file_manager(
                operation=operation,
                path=path,
                content=content
            )
            return {
                "success": res.get("success", False),
                "tool_name": tool_name,
                "operation": operation,
                "path": path,
                "result": res,
                "message": f"파일시스템 [{operation}] 작업이 완료되었습니다."
            }

        # 14. Multi-AI Cross Verification: cross_verify_channel_dna
        elif tool_name == "cross_verify_channel_dna":
            channel_url = arguments.get("channel_url", "")
            astra_hypotheses = arguments.get("astra_hypotheses") or {}
            gemini_physical_metrics = arguments.get("gemini_physical_metrics") or {}

            # If gemini physical metrics not supplied, run forensic analysis
            if not gemini_physical_metrics:
                from app.services.channel_dna_service import ChannelDNAService
                phys = ChannelDNAService.analyze_channel(channel_url=channel_url, sample_count=6)
                gemini_physical_metrics = phys.get("forensic_dna", {})

            # Synthesize hybrid preset
            from app.services.channel_dna_service import ChannelDNAService
            hybrid = ChannelDNAService.synthesize_hybrid_preset(
                channel_url=channel_url,
                astra_dna=astra_hypotheses,
                gemini_dna=gemini_physical_metrics
            )
            return {
                "success": True,
                "tool_name": tool_name,
                "channel_url": channel_url,
                "astra_analysis": astra_hypotheses,
                "gemini_analysis": gemini_physical_metrics,
                "hybrid_preset": hybrid,
                "message": f"아스트라와 제미나이의 장점을 결합한 하이브리드 소버린 프리셋이 합성되었습니다! ({hybrid.get('name')})"
            }

        else:
            return {
                "success": False,
                "tool_name": tool_name,
                "error": f"알 수 없는 도구 이름입니다: {tool_name}"
            }


hermes_tool_dispatcher = HermesToolDispatcher()
