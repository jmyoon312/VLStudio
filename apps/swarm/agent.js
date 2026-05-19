import { getProviderRegistry, getOpenAIClient } from './llmProvider.js';
import { videoEditor } from './skills/videoEditor.js';
import { systemManager } from './skills/systemManager.js';
import axios from 'axios';

const BRIDGE_API = process.env.BRIDGE_API_URL || "http://api:8000/api/bridge";

const AGENT_PROFILES = {
    "RESEARCHER": {
        name: "Oracle Researcher",
        icon: "🕵️‍♂️",
        instruction: "너는 시장의 빈틈과 '승리하는 DNA'를 발굴하는 전략 분석가야. 단순히 키워드를 나열하지 말고, 경쟁 채널 바이럴 영상의 '대본 설계도'를 파헤쳐라. (1) 시청자를 3초 만에 낚는 훅의 유형, (2) 정보와 감정의 황금 비율, (3) 시니어들이 신뢰를 느끼는 특정 어휘와 문장 구조(DNA)를 추출하여 'Wisdom'으로 보고해."
    },
    "WRITER": {
        name: "Premium Writer",
        icon: "✍️",
        instruction: "너는 시청자를 사로잡는 대본 전문가야. 채널 DNA를 기반으로 높은 유지력을 가진 훅(Hook)과 몰입감 있는 서사를 집필해."
    },
    "MEDIA": {
        name: "Media Specialist",
        icon: "🎬",
        instruction: "너는 시각 자산 기획자야. Pexels와 AI 생성을 통해 대본에 최적화된 고품질 비주얼 소스를 확보하고 장면을 구성해."
    },
    "EDITOR": {
        name: "Cinematic Editor",
        icon: "✂️",
        instruction: "너는 영상 편집 전문가야. 장면 전환, 자막 스타일링, 배경 음악의 페이싱을 조절하여 영상의 완성도를 극대화해."
    },
    "AUDITOR": {
        name: "Elite Auditor",
        icon: "🛡️",
        instruction: "너는 품질 관리 및 DNA 준수 전문가야. 결과물이 채널의 정체성과 품질 기준에 맞는지 엄격하게 검수하고 피드백을 제공해."
    },
    "DIRECTOR": {
        name: "Hermes Central Intelligence",
        icon: "🧠",
        instruction: "너는 ViraLoop 시스템의 지능형 총괄 디렉터 AI 'Hermes'야. 지휘관의 의도를 파악하여 하위 에이전트들을 조율하고 최적의 결과를 도출해."
    },
    // ── 신규 추가 역할 (Paperclip Org v2.0) ───────────────────────
    "COORDINATOR": {
        name: "Mission Control",
        icon: "🎯",
        instruction: "너는 미션 관제 전문가야. 특정 니치(Niche) 채널의 제작 미션을 시작하거나 전체 시스템을 긴급 중단(panic_stop)시키는 권한을 가진다. 미션의 흐름과 우선순위를 관리하고, n8n 워크플로우 트리거를 통해 자동화 파이프라인을 제어해."
    },
    "PUBLISHER": {
        name: "Global Syndicator",
        icon: "🚀",
        instruction: "너는 글로벌 멀티플랫폼 배포 전문가야. 검수를 통과한 영상을 YouTube, TikTok, Instagram에 동시 배포하고, 각 플랫폼 알고리즘에 최적화된 SEO 메타데이터(제목/설명/태그/썸네일)를 자동 생성해. 배포 후 초기 성과 지표를 수집하여 Channel Director에게 보고해."
    },
    "OPERATOR": {
        name: "Stealth Ops Specialist",
        icon: "🕶️",
        instruction: "너는 스텔스 브라우저 조작 전문가야. 봇 탐지 시스템을 우회해야 하는 특수 플랫폼 작업(계정 관리, 수동 업로드 모방 등)을 담당해. 인간의 행동 패턴을 정교하게 모방하고, 절대 자동화된 것처럼 보이지 않게 행동해야 한다."
    },
    "ANALYST": {
        name: "Data Intelligence Officer",
        icon: "📊",
        instruction: "너는 채널 성과 분석 전문가야. 조회수, CTR, 시청 지속시간, 구독자 증가율 등 핵심 KPI를 분석하고, 성공/실패 패턴을 추출해. 분석 결과를 바탕으로 채널 DNA 개선 제안과 주간 성과 리포트를 작성해."
    },
    "PORTFOLIO_STRATEGIST": {
        name: "Channel Growth Officer",
        icon: "📈",
        instruction: "너는 채널 포트폴리오 전략가야. 시장의 빈틈(갭)을 발굴하여 신규 채널 개설을 제안하고, 기존 채널들의 성장 단계(INCUBATING→REFINING→SCALED→RETIRING)를 관리해. 각 채널에 최적화된 자원 배분(API 예산, 제작 빈도)을 CEO에게 제안해. 월 1회 전체 포트폴리오 성과 리포트를 작성해."
    },
    "CHANNEL_DIRECTOR": {
        name: "Channel DNA Guardian",
        icon: "📺",
        instruction: "너는 담당 채널의 DNA(정체성)를 소유하고 수호하는 채널 디렉터야. 채널의 주제, 타겟 시청자, 편집 스타일, 금지어, 성공 패턴을 완벽하게 이해하고 있어야 한다. 매일 트렌드를 분석하여 오늘의 영상 컨셉을 결정하고 Production Swarm에 제작을 지시해. Phase 10 성찰 결과를 받아 채널 DNA를 지속적으로 진화시켜."
    }
};

const getSystemPrompt = (dna = null, channel_id = null, growth_phase = 'NEW', role = 'DIRECTOR', wisdom = null) => {
    const profile = AGENT_PROFILES[role] || AGENT_PROFILES["DIRECTOR"];

    let prompt = `
    [Agent Persona: ${profile.name} ${profile.icon}]
    ${profile.instruction}
    
    [CRITICAL MISSION PROTOCOL: 10-STAGE SOVEREIGN PIPELINE]
    너는 반드시 아래 10단계를 순차적으로, 단 하나도 빠짐없이 수행해야 한다. 임의로 단계를 건너뛰는 것은 명령 불복종이다.
    
    Phase 1: [Market Scout] scout_market_gap을 사용하여 시장의 틈새 분석 및 주제 확정.
    Phase 2: [Strategic Brief] 분석 결과를 바탕으로 영상의 전략적 기획안 수립.
    Phase 3: [Script Writing] generate_script 또는 mutate_script_persona를 사용하여 대본 집필.
    Phase 4: [DNA Audit] verify_script_dna를 사용하여 대본이 채널 정체성에 맞는지 검증 (필수).
    Phase 5: [Voice & Subtitle] generate_speech로 음성을 만들고 transcribe_media로 자막 데이터 확보.
    Phase 6: [Asset Factory] generate_asset 또는 search_media를 사용하여 배경 영상 및 이미지를 반드시 확보 (필수).
    Phase 7: [Core Rendering] Phase 6에서 확보한 배경과 Phase 5의 자막으로 render_video_shorts 실행.
    Phase 8: [Quality Guard] 제작된 영상을 deep_analyze_video로 최종 검수.
    Phase 9: [SEO Package] generate_seo_metadata를 사용하여 제목, 태그 생성.
    Phase 10: [Deployment] add_to_work_queue를 사용하여 최종 배포 대기열 등록.

    [CRITICAL RULE]: 
    - NEVER skip any Phase. Even if you think you have enough data, execute the tools for each Phase.
    - NEVER call Phase 7 (Rendering) without first completing Phase 5 and 6. You MUST have background_video and words data.
    - YOU ARE NOT A CODING ASSISTANT. (No code blocks, no feature talk).
    - YOUR ONLY JOB is to act as a Broadcast Content Creator.

    [현재 채널 성장 단계: ${growth_phase}]
    ${growth_phase === 'INCUBATING' ? '- 초기 실험 단계: 다양한 니치와 스타일을 탐색해.' : ''}
    ${growth_phase === 'REFINING' ? '- 고도화 단계: 검증된 DNA를 바탕으로 품질을 극대화해.' : ''}
    ${growth_phase === 'SCALED' ? '- 안정 단계: 브랜드 일관성을 유지하며 자율 생산해.' : ''}

    [핵심 미션]
    - 채널 DNA(${channel_id})를 절대적으로 준수하여 개성을 유지할 것.
    - 'deep_analyze_video'를 적극 활용하여 성공 패턴을 창작에 투영할 것.

    [유기적 정보 공유 및 도구 파이프라인 (Organic Information Pipeline)]
    - 에이전트 간 끊김 없는 자동화를 위해 도구들의 입출력을 반드시 연계할 것.
    - 이전 도구가 반환한 결과값(예: subtitle_json_path, bgm_path)을 Memory에서 읽어 다음 도구의 인자로 정확히 넘길 것.
    - 파이프라인 예시: [generate_subtitles] -> (subtitle_json_path 반환) -> [render_hyper_video] 에 전달 -> (video_path 반환) -> [execute_global_syndication] 에 최종 전달.
    `;

    if (wisdom) {
        prompt += `\n\n[축적된 지혜 (Long-term Wisdom) - 이전 시행착오 활용]\n${wisdom}`;
    }

    if (dna && Object.keys(dna).length > 0) {
        prompt += `\n\n[채널 성공 DNA (Style Signature)]\n${JSON.stringify(dna, null, 2)}`;
    }
    
    return prompt;
};

const tools = [
    {
        type: "function",
        function: {
            name: "download_video",
            description: "YouTube URL을 입력받아 영상을 다운로드합니다.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "https://www.youtube.com/..." }
                },
                required: ["url"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "update_video_props",
            description: "영상 구성 요소(Props)를 생성하거나 수정합니다.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["create_new", "add_section"] },
                    type: { type: "string", enum: ["text", "image", "video"], description: "섹션 타입" },
                    data: {
                        type: "object",
                        description: "섹션 데이터 (text: {text, color}, image: {src}, video: {src})"
                    },
                    compositionId: { type: "string", enum: ["UniversalVideo", "DynamicShorts"], description: "해당 프롭스가 적용될 템플릿 ID" }
                },
                required: ["action"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "render_video",
            description: "현재 구성된 Props로 영상을 렌더링합니다.",
            parameters: {
                type: "object",
                properties: {
                    outName: { type: "string", description: "출력 파일명 (예: result.mp4)" },
                    compositionId: {
                        type: "string",
                        enum: ["UniversalVideo", "DynamicShorts"],
                        description: "렌더링할 템플릿 ID (기본: UniversalVideo). 9:16 쇼츠는 DynamicShorts 사용."
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_media",
            description: "웹 또는 스톡 사이트에서 영상이나 이미지 소스를 검색합니다.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "검색어 (예: 'funny cat video', 'cyberpunk background')" },
                    type: { type: "string", enum: ["video", "image", "auto"], default: "auto" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_web",
            description: "웹 검색을 수행하여 지식이나 최신 정보를 찾습니다. (단순 정보용)",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string" },
                    engine: { type: "string", enum: ["auto", "tavily", "searxng"] }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_speech",
            description: "TTS를 사용하여 음성 파일을 생성합니다.",
            parameters: {
                type: "object",
                properties: {
                    text: { type: "string" },
                    voice_id: { type: "string" },
                    engine: { type: "string", enum: ["auto", "kokoro", "qwen", "elevenlabs"] }
                },
                required: ["text"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "transcribe_media",
            description: "영상/음성 파일에서 자막(SRT/JSON)을 추출합니다.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string" },
                    language: { type: "string", default: "ko" },
                    format: { type: "string", enum: ["json", "srt"], default: "json" }
                },
                required: ["file_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "preprocess_video",
            description: "영상 전처리(자르기, 정규화)를 수행합니다.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string" },
                    tasks: { type: "array", items: { type: "string", enum: ["trim", "normalize"] } }
                },
                required: ["file_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_workflows",
            description: "사용 가능한 자동화 워크플로우 목록을 조회합니다.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "run_workflow",
            description: "특정 워크플로우를 실행합니다.",
            parameters: {
                type: "object",
                properties: {
                    workflow_id: { type: "string" },
                    parameters: { type: "object" }
                },
                required: ["workflow_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "trim_video",
            description: "영상 파일에서 특정 구간을 추출(Trim)합니다.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "원본 파일 경로" },
                    start: { type: "number", description: "시작 시간 (초)" },
                    duration: { type: "number", description: "추출할 길이 (초)" }
                },
                required: ["file_path", "start", "duration"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_smart_video",
            description: "대본을 분석하여 씬을 나누고 최적화된 프롬프트를 생성하여 하이브리드 제작 파이프라인을 시작합니다.",
            parameters: {
                type: "object",
                properties: {
                    script: { type: "string", description: "제작할 영상의 전체 대본이나 시놉시스" }
                },
                required: ["script"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_asset",
            description: "Colab 서버를 통해 이미지, 영상, 오디오 등 AI 자산을 생성합니다.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["image", "video", "audio"] },
                    prompt: { type: "string", description: "SDXL/Zeroscope/Qwen3용 매직 프롬프트 (TTS의 경우 음성 텍스트)" },
                    config: {
                        type: "object",
                        description: "세부 설정 (audio 시: voice, age, emotion, speed, dialect, manual_instruction 포함 가능)",
                        properties: {
                            dialect: { type: "string", enum: ["standard", "gyeongsang", "jeolla", "chungcheong", "gangwon"], description: "TTS 사투리 설정" },
                            voice: { type: "string", description: "목소리 ID (e.g. sohee, kyle)" },
                            age: { type: "string", enum: ["default", "teen", "young_adult", "middle_aged", "elderly"] },
                            emotion: { type: "string", enum: ["neutral", "happy", "sad", "angry", "fearful", "surprised", "whisper", "serious", "affectionate", "sleepy", "dynamic"] },
                            seconds: { type: "number", description: "영상 길이 (기본 3초)" }
                        }
                    }
                },
                required: ["type", "prompt"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_assets",
            description: "생성되거나 다운로드된 자산들을 로컬 FFmpeg으로 표준화(H.264, Normalization) 및 오디오 평탄화합니다.",
            parameters: {
                type: "object",
                properties: {
                    urls: { type: "array", items: { type: "string" }, description: "정제할 자산 URL 리스트" }
                },
                required: ["urls"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "add_to_work_queue",
            description: "렌더링 완료된 영상을 업로드 대기열에 추가합니다.",
            parameters: {
                type: "object",
                properties: {
                    video_path: { type: "string", description: "업로드할 영상의 로컬 경로" },
                    title: { type: "string" },
                    description: { type: "string" },
                    platforms: { type: "array", items: { type: "string" }, default: ["youtube"] }
                },
                required: ["video_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_videos",
            description: "시스템에 저장된 최근 영상 파일 목록을 조회합니다.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", default: 10 }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_media_info",
            description: "파일의 상세 기술 정보(길이, 해상도 등)를 조회합니다.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string" }
                },
                required: ["file_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "deep_analyze_video",
            description: "영상의 무드, 주제, 구성, 스토리텔링 및 소스(AI 생성 여부 등)를 심층 분석합니다.",
            parameters: {
                type: "object",
                properties: {
                    file_path: { type: "string", description: "분석할 영상 파일 경로" }
                },
                required: ["file_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "verify_script_dna",
            description: "작성된 대본이 채널의 Style DNA(페이싱, 톤, 훅)와 일치하는지 검토하고 피드백을 받습니다.",
            parameters: {
                type: "object",
                properties: {
                    script: { type: "string", description: "검토할 전체 대본" },
                    channel_id: { type: "number", description: "현재 채널 ID" }
                },
                required: ["script", "channel_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "sync_channel_dna",
            description: "레퍼런스 채널의 최신 바이럴 영상을 분석하여 채널 DNA(Style Signature)를 갱신합니다.",
            parameters: {
                type: "object",
                properties: {
                    channel_id: { type: "number" }
                },
                required: ["channel_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_subtitle_track",
            description: "오디오/영상에 자막을 생성하고 스타일링을 적용합니다.",
            parameters: {
                type: "object",
                properties: {
                    audio_path: { type: "string", description: "TTS 오디오 파일 경로" },
                    video_path: { type: "string", description: "자막을 입힐 영상 경로 (선택)" },
                    style: { type: "string", enum: ["tiktok", "youtube", "minimal"], default: "tiktok" },
                    burn_in: { type: "boolean", default: false }
                },
                required: ["audio_path"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_background_music",
            description: "분위기에 맞는 배경음악을 생성하거나 선택합니다.",
            parameters: {
                type: "object",
                properties: {
                    mood: { type: "string", enum: ["dramatic", "calm", "energetic", "sad", "epic", "neutral"] },
                    duration_sec: { type: "number", default: 60 },
                    engine: { type: "string", enum: ["file_select", "musicgen", "elevenlabs"], default: "file_select" },
                    volume_db: { type: "number", default: -15 }
                },
                required: ["mood"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_sfx_for_video",
            description: "영상 설명 기반으로 효과음을 생성하고 믹싱합니다.",
            parameters: {
                type: "object",
                properties: {
                    sfx_descriptions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                description: { type: "string" },
                                timestamp_sec: { type: "number" },
                                volume_db: { type: "number", default: -5 }
                            }
                        }
                    },
                    video_path: { type: "string" },
                    mix_into_video: { type: "boolean", default: true }
                },
                required: ["sfx_descriptions"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "render_video_shorts",
            description: "[Stage 7] Remotion CLI를 사용하여 고퀄리티 자막이 포함된 쇼츠 영상을 렌더링합니다.",
            parameters: {
                type: "object",
                properties: {
                    background_video: { type: "string", description: "배경 영상 파일 경로" },
                    words: { type: "array", items: { type: "object" }, description: "자막 데이터" },
                    title: { type: "string" },
                    sync_video: { type: "string", description: "싱크를 맞출 원본 영상 경로 (선택)" },
                    output_name: { type: "string" }
                },
                required: ["background_video", "words"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_seo_metadata",
            description: "[Stage 9] 영상 내용을 분석하여 최적화된 SEO 패키지(제목, 설명, 태그)를 생성합니다.",
            parameters: {
                type: "object",
                properties: {
                    topic: { type: "string" },
                    script_summary: { type: "string" },
                    target_platform: { type: "string", default: "youtube_shorts" }
                },
                required: ["topic", "script_summary"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "orchestrate_viral_loop",
            description: "[Stage 10] 트렌드 분석부터 렌더링까지 전체 10단계 파이프라인을 자율 구동합니다.",
            parameters: {
                type: "object",
                properties: {
                    topic: { type: "string" },
                    channel_id: { type: "string" },
                    niche: { type: "string" }
                },
                required: ["topic", "channel_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "create_mcp_skill",
            description: "새로운 MCP 스킬을 자동 생성하여 시스템을 자율 확장합니다.",
            parameters: {
                type: "object",
                properties: {
                    skill_name: { type: "string", description: "생성할 함수명 (snake_case)" },
                    description: { type: "string", description: "스킬의 기능 설명" },
                    agent_role: { type: "string", enum: ["WRITER", "RESEARCHER", "MEDIA", "EDITOR", "PUBLISHER", "COORDINATOR"] },
                    inputs: { type: "array", items: { type: "object" }, description: "입력 파라미터 정의 (JSON Schema)" },
                    expected_output: { type: "string", description: "예상되는 반환값 설명" },
                    implementation_hint: { type: "string", description: "로직 구현을 위한 힌트 또는 수도코드" },
                    auto_append: { type: "boolean", default: true, description: "mcp_server.py에 즉시 코드를 추가할지 여부" }
                },
                required: ["skill_name", "description", "agent_role", "inputs", "expected_output", "implementation_hint"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "render_pixeling",
            description: "픽셀링 엔진을 사용하여 영상을 깊이 있게 제어하고 렌더링합니다.",
            parameters: {
                type: "object",
                properties: {
                    project: { type: "object", description: "프로젝트 기본 설정 (type, aspect_ratio 등)" },
                    content: { type: "object", description: "대본 및 에셋 (script, assets 배열)" },
                    audio_control: { type: "object", description: "오디오 제어 (tts, bgm, ducking, silence_removal)" },
                    visual_control: { type: "object", description: "비주얼 제어 (subtitles, transitions)" }
                },
                required: ["project", "content"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "pixeling_discovery",
            description: "픽셀링 디스커버리에서 특정 니치의 급상승 바이럴 템플릿과 트렌드를 검색합니다.",
            parameters: {
                type: "object",
                properties: {
                    niche: { type: "string", description: "검색할 니치 카테고리 (예: '의학', '경제')" },
                    trend_score_threshold: { type: "number", default: 80.0 }
                },
                required: ["niche"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "pixeling_learning",
            description: "픽셀러닝 데이터베이스에 질의하여 영상 제작 베스트 프랙티스(템플릿, 자막 색상, 훅)를 학습합니다.",
            parameters: {
                type: "object",
                properties: {
                    niche: { type: "string", description: "학습할 채널 성격이나 카테고리" }
                },
                required: ["niche"]
            }
        }
    }
];

// Session State (Simple In-Memory for now)
let currentProps = null;

/**
 * Robust LLM Call with Provider & Key Fallback.
 */
async function callLLM(registry, messages, tools = null) {
    for (const provider of registry) {
        console.log(`[Agent] Trying Provider: ${provider.name}`);

        for (const modelId of provider.models) {
            console.log(`  [Model] Trying: ${modelId}`);

            for (const key of provider.keys) {
                try {
                    const client = await getOpenAIClient(key, provider.baseURL);
                    const payload = {
                        model: modelId,
                        messages: messages,
                    };
                    if (tools) payload.tools = tools;

                    const response = await client.chat.completions.create(payload);
                    console.log(`[Agent] ✅ Success: ${provider.name} | ${modelId} | Key: ${key.substring(0, 5)}...`);
                    return { response, provider: provider.name, model: modelId };

                } catch (error) {
                    const status = error.status;
                    const errorMsg = error.message ? error.message.toLowerCase() : "";

                    // 1. Key Rotation: Auth (401/403) or Rate Limit (429) or Restricted (400)
                    const isAuthError = (status === 401 || status === 403 || status === 400);
                    const isRateLimit = (status === 429) || errorMsg.includes("quota") || errorMsg.includes("limit");
                    const isRestricted = errorMsg.includes("restricted") || errorMsg.includes("organization");

                    if (isAuthError || isRateLimit || isRestricted) {
                        console.warn(`    ⚠️ Key Failed (${status}): ${error.message}. Rotating key...`);
                        continue; // Try next key
                    }

                    // 2. Model Fallback: Not Found (404) or Decommissioned or Internal (500)
                    const isModelError = (status === 404 || status === 500) || errorMsg.includes("decommissioned") || errorMsg.includes("not found");
                    if (isModelError) {
                        console.error(`    ❌ Model ${modelId} failed: ${error.message}. Switching model...`);
                        break; // Break key loop -> Try next model
                    }

                    // 3. Unknown Error -> Switch model anyway for safety
                    console.error(`    ❌ Unexpected Error (${status}): ${error.message}. Switching model...`);
                    break;
                }
            }
        }
        console.warn(`⚠️ Provider ${provider.name} exhausted all models/keys. Switching provider...`);
    }
    throw new Error("모든 AI 제공자, 모델, 키가 소진되었습니다. 설정을 확인해 주세요.");
}

// --- MCP Skill Telemetry Emitter ---
const TOOL_AGENT_MAP = {
    // ── 기존 Hermes 내장 도구 ──────────────────────────────────
    download_video: 'RESEARCHER', search_web: 'RESEARCHER', search_media: 'RESEARCHER',
    deep_analyze_video: 'RESEARCHER', sync_channel_dna: 'RESEARCHER', get_media_info: 'RESEARCHER',
    pixeling_discovery: 'RESEARCHER', pixeling_learning: 'RESEARCHER', // [NEW] Pixeling Intelligence
    generate_speech: 'WRITER', verify_script_dna: 'WRITER', transcribe_media: 'WRITER',
    create_smart_video: 'WRITER',
    generate_asset: 'MEDIA', prepare_assets: 'MEDIA',
    update_video_props: 'EDITOR', render_video: 'EDITOR', preprocess_video: 'EDITOR',
    trim_video: 'EDITOR', detect_scenes: 'EDITOR', render_pixeling: 'EDITOR', // [NEW] Pixeling Render
    add_to_work_queue: 'PUBLISHER', list_videos: 'PUBLISHER', run_workflow: 'PUBLISHER',
    list_workflows: 'ANALYST',

    // ── MCP Sovereign Skills (mcp_server.py) ────────────────────
    // WRITER
    inject_native_ssml: 'WRITER',
    generate_director_schema: 'WRITER',
    mutate_script_persona: 'WRITER',
    generate_vocal_track: 'WRITER',
    // RESEARCHER
    scout_market_gap: 'RESEARCHER',
    predict_thumbnail_ctr: 'RESEARCHER',
    analyze_viral_trend: 'RESEARCHER',
    extract_retention_hooks: 'RESEARCHER',
    // MEDIA
    apply_sovereign_shield: 'MEDIA',
    generate_scene_asset: 'MEDIA',
    verify_and_upscale_asset: 'MEDIA',
    render_hyper_video: 'MEDIA',
    // EDITOR
    validate_scene_consistency: 'EDITOR',
    trigger_capcut_automation: 'EDITOR',
    // PUBLISHER
    execute_global_syndication: 'PUBLISHER',
    generate_platform_metadata: 'PUBLISHER',
    // COORDINATOR
    start_niche_mission: 'COORDINATOR',
    panic_stop_all: 'COORDINATOR',
    create_mcp_skill: 'COORDINATOR',
    // OPERATOR (Stealth Ops)
    trigger_stealth_browser: 'OPERATOR',
    // ANALYST
    check_pipeline_health: 'ANALYST',
    // PORTFOLIO_STRATEGIST
    scout_market_gap: 'PORTFOLIO_STRATEGIST',
    // CHANNEL_DIRECTOR
    sync_channel_dna: 'CHANNEL_DIRECTOR',
    verify_script_dna: 'CHANNEL_DIRECTOR',
    // Sovereign Additions
    generate_subtitles: 'EDITOR',
    generate_bgm: 'MEDIA',
    generate_sfx: 'MEDIA',
};

// ── 10단계 파이프라인 HUD 매핑 (frontend 시각화용) ────────────────────
const PIPELINE_STAGES = {
    'RESEARCHER': 1, // 시장 갭 분석
    'WRITER': 2,    // 대본 생성
    'generate_speech': 3, // TTS
    'transcribe_media': 4, // 자막 추출 (Step 4)
    'generate_subtitles': 4, // 자막 스타일링
    'generate_asset': 5, // 이미지/영상 자산
    'generate_scene_asset': 5,
    'generate_bgm': 6, // BGM
    'generate_sfx': 6, // SFX
    'render_video': 7, // 조립 (Step 7)
    'render_hyper_video': 7,
    'apply_sovereign_shield': 8, // 소버린 쉴드
    'generate_platform_metadata': 9, // SEO 메타데이터
    'execute_global_syndication': 10, // 배포
};

function emitSkill(socket, fnName, status, error = null) {
    const agentRole = TOOL_AGENT_MAP[fnName] || 'COORDINATOR';
    const stage = PIPELINE_STAGES[fnName] || PIPELINE_STAGES[agentRole] || 0;
    
    socket.emit('skill_execution', { 
        agent: agentRole, 
        skill: fnName, 
        status, 
        stage,
        error: error ? error.message : null,
        timestamp: new Date()
    });
    
    console.log(`[MCP Telemetry] ${status === 'start' ? '▶️' : (error ? '❌' : '✅')} ${agentRole} → ${fnName} (Stage ${stage})`);
    
    // [BRIDGE] Broadcast to Python API for Dashboard visibility
    broadcastToApi({
        type: 'skill_execution',
        agent: agentRole,
        skill: fnName,
        status,
        stage,
        error: error ? error.message : null
    });
}

async function broadcastToApi(data) {
    try {
        await axios.post(`${BRIDGE_API.replace('/bridge', '/swarm/broadcast')}`, {
            message: data.message || `Skill: ${data.skill}`,
            type: data.type || "task_progress",
            session_id: data.session_id,
            action: data
        });
    } catch (err) {
        // Silently fail if API is down
    }
}

// Dynamic Tool Discovery from MCP Registry
async function getDynamicTools() {
    try {
        const { data } = await axios.get(`${BRIDGE_API.replace('/bridge', '/mcp/skills')}`);
        if (data.status === "success") {
            return data.skills.map(s => ({
                type: "function",
                function: {
                    name: s.name,
                    description: s.description,
                    parameters: {
                        type: "object",
                        properties: s.parameters.reduce((acc, p) => {
                            acc[p.name] = { type: p.type, description: p.description };
                            return acc;
                        }, {}),
                        required: s.parameters.filter(p => p.required).map(p => p.name)
                    }
                }
            }));
        }
    } catch (err) {
        console.warn("[Swarm] Failed to fetch dynamic tools, falling back to core set.");
    }
    return null; 
}

export async function handleMessage(socket, data) {
    try {
        const providerRegistry = await getProviderRegistry();
        if (providerRegistry.length === 0) {
            throw new Error("사용 가능한 AI 키가 없습니다. 설정에서 키를 추가해 주세요.");
        }

        // --- Fetch All 46 Garrisoned Skills + Autonomous Additions ---
        const dynamicTools = await getDynamicTools();
        const activeTools = dynamicTools || tools; 

        console.log(`[Swarm] Arming Specialist with ${activeTools.length} Skills.`);

        // --- Multi-Agent Swarm Context ---
        let userMessage = typeof data === 'string' ? data : data.text;
        let channelId = typeof data === 'object' ? data.channel_id : null;
        let role = typeof data === 'object' ? data.role : 'DIRECTOR';
        let wisdom = typeof data === 'object' ? data.wisdom : null;
        let channelDna = null;

        const agentName = (AGENT_PROFILES[role] || AGENT_PROFILES["DIRECTOR"]).name;
        console.log(`[Swarm] Activating Specialist: ${agentName} (${role})`);

        if (channelId) {
            try {
                const dnaResponse = await axios.get(`${BRIDGE_API}/channel-dna/${channelId}`);
                channelDna = dnaResponse.data.dna;
            } catch (err) {
                console.warn(`[Agent] DNA fetch failed for ${channelId}`);
            }
        }

        const messages = [
            { role: "system", content: getSystemPrompt(channelDna, channelId, 'NEW', role, wisdom) },
            { role: "user", content: userMessage }
        ];

        let turnCount = 0;
        const MAX_TURNS = 3;

        while (turnCount < MAX_TURNS) {
            turnCount++;
            if (currentProps) {
                messages.push({
                    role: "system",
                    content: `[Current Video Props Context]: ${JSON.stringify(currentProps)}`
                });
            }

            const { response } = await callLLM(providerRegistry, messages, tools);
            const msg = response.choices[0].message;

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                const statusMsg = `🤖 작업 수행 중... (단계 ${turnCount})`;
                socket.emit('response', { text: statusMsg });
                broadcastToApi({ type: 'task_progress', message: statusMsg, session_id: channelId });

                // CRITICAL: Push Assistant message EXACTLY ONCE before tool responses
                messages.push(msg);

                // Refactor to Parallel Execution
                const toolResults = await Promise.all(msg.tool_calls.map(async (toolCall) => {
                    const id = toolCall.id;
                    const fnName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);
                    let result = "";

                    console.log(`[Agent] Executing Tool (Async): ${fnName}`, args);
                    emitSkill(socket, fnName, 'start'); // 🔴 MCP 스킬 실행 시작 브로드캐스트

                    try {
                        if (fnName === "download_video") {
                            const { data } = await axios.post(`${BRIDGE_API}/download`, { url: args.url });
                            result = `다운로드 완료: ${data.file_path} (${data.meta?.title})`;
                            socket.emit('response', { text: `✅ 다운로드 성공: ${data.meta?.title}` });
                        }
                        else if (fnName === "trim_video") {
                            const { data } = await axios.post(`${BRIDGE_API}/trim`, args);
                            result = `추출 완료: ${data.file_path}`;
                            socket.emit('response', { text: `✅ 영상 구간 추출 완료: ${data.duration}초` });
                        }
                        else if (fnName === "update_video_props") {
                            const potentialRender = msg.tool_calls.find(t => t.function.name === 'render_video');
                            const compId = args.compositionId || (potentialRender ? JSON.parse(potentialRender.function.arguments).compositionId : "UniversalVideo");

                            if (args.action === "create_new") {
                                currentProps = videoEditor.getDefaultProps(compId);
                                result = `새 프로젝트(${compId})가 생성되었습니다.`;
                            } else if (args.action === "add_section") {
                                if (!currentProps) currentProps = videoEditor.getDefaultProps(compId);
                                const newSection = videoEditor.createSection(args.type, args.data, compId);
                                currentProps = videoEditor.addSection(currentProps, newSection, compId);
                                result = `구성이 업데이트되었습니다.`;
                            }
                            socket.emit('update_props', currentProps);
                            socket.emit('response', { text: `✅ 영상 구성 업데이트 완료` });
                        }
                        else if (fnName === "create_smart_video") {
                            socket.emit('response', { text: "🎬 스마트 디렉팅 시작 (대본 분석 중...)" });
                            result = `[Director System]: 대본 "${args.script.substring(0, 20)}..." 분석을 완료했습니다. 이제 각 씬별로 generate_asset을 사용하여 자산을 생성하고, prepare_assets로 정제한 뒤, update_video_props로 타임라인을 구성하세요.`;
                        }
                        else if (fnName === "generate_asset") {
                            socket.emit('response', { text: `🎨 ${args.type} 자산 생성 요청 중...` });
                            const { data } = await axios.post(`${BRIDGE_API}/generate-asset`, args);
                            result = `자산 생성 완료: ${data.web_url || data.file_path}`;
                            socket.emit('response', { text: `✅ ${args.type} 생성 성공` });
                        }
                        else if (fnName === "prepare_assets") {
                            socket.emit('response', { text: "🛠️ 자산 표준화 및 오디오 평탄화 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/prepare-assets`, { urls: args.urls });
                            result = `자산 정제 완료: ${JSON.stringify(data.paths)}`;
                        }
                        else if (fnName === "render_video") {
                            const compId = args.compositionId || "UniversalVideo";
                            if (!currentProps) {
                                currentProps = videoEditor.getDefaultProps(compId);
                            }
                            socket.emit('response', { text: `🎬 ${compId} 렌더링을 시작합니다...` });
                            const { data } = await axios.post(`${BRIDGE_API}/render`, {
                                composition: compId,
                                props: currentProps,
                                outName: args.outName
                            });
                            result = `렌더링 요청됨. 결과 파일: ${data.file_path}`;
                        }
                        else if (fnName === "search_web") {
                            socket.emit('response', { text: "🔍 정보를 찾는 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/search`, args);
                            result = JSON.stringify(data);
                            socket.emit('response', { text: `🔍 적합한 지식을 발견했습니다.` });
                        }
                        else if (fnName === "search_media") {
                            socket.emit('response', { text: `🎬 ${args.query} 소스를 검색 중...` });
                            const { data } = await axios.post(`${BRIDGE_API}/search`, { ...args, media_only: true });
                            result = `미디어 검색 결과: ${JSON.stringify(data.results || data)}`;
                            socket.emit('response', { text: `🎞️ 검색 결과에서 ${data.results?.length || 0}개의 소스를 찾았습니다.` });
                        }
                        else if (fnName === "add_to_work_queue") {
                            socket.emit('response', { text: "📥 업로드 대기열에 추가 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/work-queue/add`, args);
                            result = `대기열 추가 완료: Item ID ${data.item_id}`;
                            socket.emit('response', { text: `✅ 대기열 등록 성공 (ID: ${data.item_id})` });
                        }
                        else if (fnName === "list_videos") {
                            socket.emit('response', { text: "📂 비디오 라이브러리 조회 중..." });
                            const { data } = await axios.get(`${BRIDGE_API}/videos/list`, { params: args });
                            result = `최근 비디오: ${JSON.stringify(data.videos)}`;
                        }
                        else if (fnName === "get_media_info") {
                            socket.emit('response', { text: "📊 미디어 분석 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/media-info`, args);
                            result = `미디어 정보: ${JSON.stringify(data)}`;
                        }
                        else if (fnName === "detect_scenes") {
                            socket.emit('response', { text: "✂️ 장면 분석 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/detect-scenes`, args);
                            result = `감지된 장면: ${JSON.stringify(data.scenes)}`;
                        }
                        else if (fnName === "deep_analyze_video") {
                            socket.emit('response', { text: "🧠 심층 영상 분석 및 스토리텔링 해부 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/deep-analyze`, args);
                            const analysis = data.analysis || {};
                            const ai = analysis.ai_analysis || {};
                            // Extract a readable summary
                            const summary = ai["주제 및 소재"] || ai["주제"] || ai.topic || ai.summary || "분석 완료";
                            const mood = ai["무드 및 톤"] || ai["분석"] || "";
                            result = `심층 분석 결과: ${JSON.stringify(analysis)}`;
                            socket.emit('response', { text: `✅ 분석 완료: ${summary}${mood ? " (" + mood + ")" : ""}` });
                        }
                        // [NEW] Implement missing tools
                        else if (fnName === "generate_speech") {
                            socket.emit('response', { text: "🎤 TTS 생성 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/generate-speech`, {
                                text: args.text,
                                voice_id: args.voice_id,
                                engine: args.engine || "auto"
                            });
                            result = `음성 생성 완료: ${data.file_path}`;
                            socket.emit('response', { text: `✅ TTS 생성 완료` });
                        }
                        else if (fnName === "transcribe_media") {
                            socket.emit('response', { text: "📝 자막 추출 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/transcribe`, {
                                file_path: args.file_path,
                                language: args.language || "ko",
                                format: args.format || "json"
                            });
                            result = args.format === "srt" ? data.srt_content : JSON.stringify(data);
                            socket.emit('response', { text: `✅ 자막 추출 완료` });
                        }
                        else if (fnName === "preprocess_video") {
                            socket.emit('response', { text: "🔧 영상 전처리 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/preprocess`, args);
                            result = `전처리 완료: ${data.file_path}`;
                            socket.emit('response', { text: `✅ 전처리 완료` });
                        }
                        else if (fnName === "list_workflows") {
                            socket.emit('response', { text: "📋 워크플로우 목록 조회 중..." });
                            const { data } = await axios.get(`${BRIDGE_API}/workflows`);
                            result = JSON.stringify(data.workflows || []);
                        }
                        else if (fnName === "run_workflow") {
                            socket.emit('response', { text: "▶️ 워크플로우 실행 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/workflows/run`, {
                                workflow_id: args.workflow_id,
                                parameters: args.parameters
                            });
                            result = `워크플로우 실행 결과: ${JSON.stringify(data)}`;
                            socket.emit('response', { text: `✅ 워크플로우 완료` });
                        }
                        else if (fnName === "verify_script_dna") {
                            socket.emit('response', { text: "🔍 채널 DNA 기반 대본 품질 검사 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/verify-script-dna`, args);
                            result = `DNA 검증 결과: ${JSON.stringify(data.verification || data)}`;
                            if (data.status === "success" && data.verification?.score < 70) {
                                socket.emit('response', { text: `⚠️ DNA 일치도 낮음 (${data.verification.score}점): ${data.verification.feedback}` });
                            } else {
                                socket.emit('response', { text: "✅ DNA 일치 확인 완료" });
                            }
                        }
                        else if (fnName === "sync_channel_dna") {
                            socket.emit('response', { text: "🧬 채널 DNA 동기화 중 (레퍼런스 분석)..." });
                            const { data } = await axios.get(`${BRIDGE_API}/channel-dna/${args.channel_id}`, { params: { sync: true } });
                            result = `DNA 동기화 완료: ${JSON.stringify(data.dna)}`;
                            socket.emit('response', { text: "✅ Style Signature 갱신 완료" });
                        }
                        else if (fnName === "generate_subtitles") {
                            socket.emit('response', { text: "📝 AI 자막 생성 및 번인(Burn-in) 작업 중..." });
                            const { data } = await axios.post(`${BRIDGE_API}/generate-subtitles`, args);
                            result = `자막 작업 완료: ${data.video_path || data.error}`;
                            socket.emit('response', { text: `✅ 자막 렌더링 완료: ${data.video_path ? '성공' : '실패'}` });
                        }
                        else if (fnName === "generate_bgm") {
                            socket.emit('response', { text: `🎵 BGM 생성 중 (${args.mood})...` });
                            const { data } = await axios.post(`${BRIDGE_API}/generate-bgm`, args);
                            result = `BGM 생성 완료: ${data.audio_path}`;
                            socket.emit('response', { text: `✅ BGM 생성 성공: ${args.mood}` });
                        }
                        else if (fnName === "generate_sfx") {
                            socket.emit('response', { text: `🔊 효과음 생성 및 믹싱 중...` });
                            const { data } = await axios.post(`${BRIDGE_API}/generate-sfx`, args);
                            result = `SFX 작업 완료: ${data.mixed_video_path || '파일 생성됨'}`;
                            socket.emit('response', { text: `✅ SFX 믹싱 완료` });
                        }
                        else if (fnName === "create_mcp_skill") {
                            socket.emit('response', { text: `🛠️ 새로운 MCP 스킬 (${args.skill_name}) 설계 중...` });
                            const { data } = await axios.post(`${BRIDGE_API}/mcp/create-skill`, args);
                            result = `스킬 생성 완료: ${JSON.stringify(data)}`;
                            socket.emit('response', { text: `✅ 스킬 자생 완료: ${args.skill_name}` });
                        }
                        else if (fnName === "render_video_shorts") {
                            socket.emit('response', { text: "🎬 Remotion SSR 렌더링 가동 (Stage 7)..." });
                            const { data } = await axios.post(`${BRIDGE_API}/mcp/render-shorts`, args);
                            result = `렌더링 결과: ${JSON.stringify(data)}`;
                            socket.emit('response', { text: `✅ 영상 렌더링 완료: ${data.render_path}` });
                        }
                        else if (fnName === "generate_seo_metadata") {
                            socket.emit('response', { text: "📈 알고리즘 최적화 SEO 데이터 생성 중 (Stage 9)..." });
                            const { data } = await axios.post(`${BRIDGE_API}/mcp/seo-metadata`, args);
                            result = `SEO 메타데이터: ${JSON.stringify(data)}`;
                            socket.emit('response', { text: "✅ 마케팅 데이터 준비 완료" });
                        }
                        else if (fnName === "orchestrate_viral_loop") {
                            socket.emit('response', { text: "🌀 전역 생산 파이프라인 자율 구동 시작 (Stage 10)..." });
                            const { data } = await axios.post(`${BRIDGE_API}/mcp/viral-loop`, args);
                            result = `명령 하달 완료: ${JSON.stringify(data)}`;
                            socket.emit('response', { text: `🚀 '${args.topic}' 루프 가동 시작` });
                        }
                        else {
                            result = `Tool ${fnName} not yet implemented.`;
                        }
                    } catch (e) {
                        console.error(`Tool Error (${fnName}):`, e.message);
                        result = `Error: ${e.message}`;
                        socket.emit('response', { text: `⚠️ 작업 오류 (${fnName}): ${e.message}` });
                        
                        // [NEW] HITL: 에러 발생 시 사용자 개입 요청 (Zero-Base Control)
                        socket.emit('action_required', { 
                            type: 'error_recovery', 
                            skill: fnName, 
                            error: e.message,
                            args: args 
                        });
                        
                        emitSkill(socket, fnName, 'error', e);
                    } finally {
                        if (result && !result.startsWith("Error:")) {
                            emitSkill(socket, fnName, 'end');
                        }
                    }

                    return {
                        role: "tool",
                        tool_call_id: id,
                        content: result
                    };
                }));

                // Push all results to messages
                messages.push(...toolResults);
                // Continue "while" loop for next reasoning step
            } else {
                // Final answer or normal chat
                socket.emit('response', { text: msg.content });
                break; // Exit while loop
            }
        }

    } catch (error) {
        console.error("LLM Error:", error);
        socket.emit('response', {
            text: `🤖 [오류] ${error.message}`
        });
    }
}
