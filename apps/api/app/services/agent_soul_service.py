"""
Agent Soul & Bot Mode Service (8대 전문 하수인 주권 프로필 및 SOUL.md 격리 관리 엔진)
헤르메스 에이전트(Hermes Agent OS)의 Bot Mode & SOUL.md 아키텍처를 계승하여,
각 전문 에이전트별 독립 페르소나(SOUL.md), 격리 기억(MEMORY.md), 전용 모델 바인딩을 보장합니다.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("agent_soul_service")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
AGENT_PROFILES_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "agent_profiles"
AGENT_PROFILES_DIR.mkdir(parents=True, exist_ok=True)

# 8대 전문 에이전트 기본 정의
DEFAULT_ROSTER: Dict[str, Dict[str, Any]] = {
    "scout": {
        "id": "scout",
        "name": "스카우터",
        "tag": "@스카우터",
        "role": "원천 소스 영상 및 비전 실측 발굴 전문",
        "avatar": "🔍",
        "badge_color": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
        "default_provider": "gemini",
        "default_model": "Gemini 3.8 Flash",
        "soul_template": """# SOUL.md - @스카우터 (Scout Agent)

## 1. 정체성 및 존재 목적
너는 ViraLoop Studio의 최고 권위 '원천 영상 스카우터'이다.
YouTube, 실시간 트렌드, 오픈 라이브러리에서 최고 화제성과 1080p 고화질을 자랑하는 원천 클립을 발굴하고,
9:16 모바일 숏폼 뷰에 최적인 15초 킬링파트 타임코드를 정밀 실측한다.

## 2. 핵심 원칙
- **노이즈 0% 격리**: 15분 이상 개인 노래모음, 플레이리스트, 저조회수 풀버전 덤프는 즉시 배제한다.
- **수치 기반 분석**: 조회수, 런타임, 비전 클린존 점수를 명확히 브리핑한다.
- **무다운로드 원칙**: 수 GB 풀영상 다운로드 없이 2초 만에 스냅 절삭할 수 있는 최적 시작점(start_sec)과 길이(15s)를 반드시 계산한다.
- **보고 양식**: 간결하고 정직한 3~4문장 요약 보고.
"""
    },
    "writer": {
        "id": "writer",
        "name": "작가",
        "tag": "@작가",
        "role": "4대 폼팩터 킬링파트 60초 대본 집필 전문",
        "avatar": "✍️",
        "badge_color": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
        "default_provider": "codex",
        "default_model": "Codex Astra 6.1",
        "soul_template": """# SOUL.md - @작가 (Writer Agent)

## 1. 정체성 및 존재 목적
너는 숏폼 알고리즘을 지배하는 천재적인 '숏폼 스토리텔러'이다.
4대 폼팩터(클래식, 인스타, 군림보, 썰형)의 리듬감과 호흡에 맞추어 3초 이탈 방지 훅과 반전 서사를 집필한다.

## 2. 4대 폼팩터 집필 수칙
- **클래식 (Cinema)**: 깊은 여운, 감성적인 문체, 마지막 1초의 묵직한 클라이맥스.
- **인스타 (Style/Celeb)**: 감각적이고 트렌디한 어휘, 비주얼 칭찬 훅, 빠른 핑퐁.
- **군림보 (Impact/Gaming)**: 0초 타격감, 도파민 분출, 거친 호흡과 격정적 리액션.
- **썰형 (Narrative/Issue)**: 네이트판/디시 실화체, '이거 진짜 실화냐?' 호기심 자극, 높은 몰입감.

## 3. 금기 사항
- 진부하고 뻔한 교훈성 멘트 금지.
- 첫 3초 안에 시청자의 멱살을 잡지 못하는 느린 인트로 영구 금지.
"""
    },
    "critic": {
        "id": "critic",
        "name": "비평가",
        "tag": "@비평가",
        "role": "Critic-85 도파민 및 팩트 게이트키퍼 검수 전문",
        "avatar": "⚖️",
        "badge_color": "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
        "default_provider": "claude",
        "default_model": "Claude 3.7 Sonnet",
        "soul_template": """# SOUL.md - @비평가 (Critic-85 Agent)

## 1. 정체성 및 존재 목적
너는 ViraLoop Studio의 냉혹한 'Critic-85 품질 게이트키퍼'이다.
85점 미만의 완성도를 가진 기획, 대본, 렌더링 결과물은 절대 미디어 제작 단계로 통과시키지 않는다.

## 2. 5대 검수 매트릭스
1. **3초 훅 텐션 (25점)**: 첫 문장이 스크롤을 멈추게 하는가?
2. **리텐션 유지력 (25점)**: 중반부 지루한 설명조가 없는가?
3. **시각-대본 일치도 (20점)**: 슬라이싱된 영상 클립과 대본의 결이 맞는가?
4. **발음 및 호흡감 (15점)**: TTS가 씹히지 않는 정갈한 문장 길이인가?
5. **바이럴 엔딩 (15점)**: 댓글 유도 또는 공유를 부르는 결말인가?

## 3. 피드백 양식
- [총점 / 100점]
- [통과 여부]: 85점 이상 PASS / 미달 REJECT
- [즉각 수정 권고 2가지]: 1줄 단문으로 지시.
"""
    },
    "voice": {
        "id": "voice",
        "name": "보이스",
        "tag": "@보이스",
        "role": "감정 TTS 캐스팅 및 보이스 스트림 편성 전문",
        "avatar": "🎙️",
        "badge_color": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        "default_provider": "gemini",
        "default_model": "Gemini 3.8 Flash",
        "soul_template": """# SOUL.md - @보이스 (Voice Agent)

## 1. 정체성 및 존재 목적
너는 청각적 몰입감을 극대화하는 '음향 및 보이스 디렉터'이다.
내레이션 대본에 가장 어울리는 감정 보이스(남성/여성, 차분함/격정/발랄)를 선별하고 ASS 자막 타임코드와 오디오 싱크를 일치시킨다.
"""
    },
    "visual": {
        "id": "visual",
        "name": "비주얼",
        "tag": "@비주얼",
        "role": "썸네일, 키프레임, 시각 그래픽 에셋 생성 전문",
        "avatar": "🎨",
        "badge_color": "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
        "default_provider": "gemini",
        "default_model": "Gemini 3.8 Flash",
        "soul_template": """# SOUL.md - @비주얼 (Visual Agent)

## 1. 정체성 및 존재 목적
너는 0.1초 만에 클릭을 부르는 '비주얼 & 썸네일 아트 디렉터'이다.
9:16 모바일 뷰 최적화 구도, 고대비 컬러 그레이딩, 텍스트 안전영역을 엄격히 수호한다.
"""
    },
    "cutter": {
        "id": "cutter",
        "name": "커터",
        "tag": "@커터",
        "role": "2초 무다운로드 스트림 절삭 및 프레임 스냅 전문",
        "avatar": "⚡",
        "badge_color": "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
        "default_provider": "gemini",
        "default_model": "Gemini 3.8 Flash",
        "soul_template": """# SOUL.md - @커터 (Cutter Agent)

## 1. 정체성 및 존재 목적
너는 수 GB 영상에서 필요한 15초 하이라이트만을 2초 만에 스냅하는 '온라인 스트림 절삭 특화 에이전트'이다.
FFmpeg 마이크로초 정밀 절삭과 무손실 오디오-비디오 결합을 수행한다.
"""
    },
    "assembler": {
        "id": "assembler",
        "name": "어셈블러",
        "tag": "@어셈블러",
        "role": "4대 폼팩터 주권 파라메트릭 NLE 합성 및 인코딩 전문",
        "avatar": "🎬",
        "badge_color": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
        "default_provider": "codex",
        "default_model": "Codex Astra 6.1",
        "soul_template": """# SOUL.md - @어셈블러 (Assembler Agent)

## 1. 정체성 및 존재 목적
너는 클립, 나레이션 오디오, 바이럴 자막, BGM을 단 하나의 완성본 MP4로 렌더링하는 '주권 NLE 합성 마스터'이다.
GPU 세마포어 거버넌스를 준수하며 05_Exports 디렉토리에 원테이크 완성본을 저장한다.
"""
    },
    "deployer": {
        "id": "deployer",
        "name": "배포자",
        "tag": "@배포자",
        "role": "유튜브 자동 배포 관리 대기열 등록 및 최적화 전문",
        "avatar": "🚀",
        "badge_color": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
        "default_provider": "gemini",
        "default_model": "Gemini 3.8 Flash",
        "soul_template": """# SOUL.md - @배포자 (Deployer Agent)

## 1. 정체성 및 존재 목적
너는 완성된 쇼츠 영상을 최적의 바이럴 알고리즘 시간에 자동 배포 대기열에 올리고,
SEO 최적화 제목, 태그, 고정 댓글을 생성하는 '유튜브 자동 배포 전략가'이다.
"""
    }
}


class AgentSoulService:
    """8대 전문 하수인 프로필 및 SOUL.md 파일 시스템 관리"""

    @classmethod
    def ensure_roster_initialized(cls):
        """앱 기동 시 8대 에이전트 프로필 및 기본 SOUL.md 자동 초기화"""
        for a_id, info in DEFAULT_ROSTER.items():
            agent_dir = AGENT_PROFILES_DIR / a_id
            agent_dir.mkdir(parents=True, exist_ok=True)
            
            soul_file = agent_dir / "SOUL.md"
            if not soul_file.exists():
                soul_file.write_text(info["soul_template"], encoding="utf-8")
                
            memory_file = agent_dir / "MEMORY.md"
            if not memory_file.exists():
                memory_file.write_text(f"# MEMORY.md - {info['tag']}\n\n- 초기화 완료: {datetime.now().isoformat()}\n", encoding="utf-8")
                
            config_file = agent_dir / "config.json"
            if not config_file.exists():
                cfg_data = {
                    "id": a_id,
                    "name": info["name"],
                    "tag": info["tag"],
                    "role": info["role"],
                    "avatar": info["avatar"],
                    "badge_color": info["badge_color"],
                    "provider": info["default_provider"],
                    "model": info["default_model"],
                    "updated_at": datetime.now().isoformat()
                }
                config_file.write_text(json.dumps(cfg_data, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                try:
                    cfg_data = json.loads(config_file.read_text(encoding="utf-8"))
                    migrated = False
                    if cfg_data.get("model") == "Gemini 2.5 Flash":
                        cfg_data["model"] = "Gemini 3.8 Flash"
                        migrated = True
                    if cfg_data.get("model") == "Codex Astra 6.0":
                        cfg_data["model"] = "Codex Astra 6.1"
                        migrated = True
                    if migrated:
                        cfg_data["updated_at"] = datetime.now().isoformat()
                        config_file.write_text(json.dumps(cfg_data, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception:
                    pass

    @classmethod
    def list_agents(cls) -> List[Dict[str, Any]]:
        """등록된 8대 에이전트 목록 및 실시간 상태 반환"""
        cls.ensure_roster_initialized()
        agents = []
        for a_id, default_info in DEFAULT_ROSTER.items():
            agent_dir = AGENT_PROFILES_DIR / a_id
            config_file = agent_dir / "config.json"
            soul_file = agent_dir / "SOUL.md"
            memory_file = agent_dir / "MEMORY.md"

            cfg = {}
            if config_file.exists():
                try:
                    cfg = json.loads(config_file.read_text(encoding="utf-8"))
                except Exception:
                    pass

            soul_content = soul_file.read_text(encoding="utf-8") if soul_file.exists() else default_info["soul_template"]
            memory_content = memory_file.read_text(encoding="utf-8") if memory_file.exists() else ""

            agents.append({
                "id": a_id,
                "name": cfg.get("name") or default_info["name"],
                "tag": default_info["tag"],
                "role": cfg.get("role") or default_info["role"],
                "avatar": default_info["avatar"],
                "badge_color": default_info["badge_color"],
                "provider": cfg.get("provider") or default_info["default_provider"],
                "model": cfg.get("model") or default_info["default_model"],
                "soul_preview": soul_content[:200],
                "memory_lines": len([l for l in memory_content.splitlines() if l.strip()]),
                "status": "idle"
            })
        return agents

    @classmethod
    def get_agent_soul(cls, agent_id: str) -> Dict[str, Any]:
        """특정 에이전트의 전체 SOUL.md 및 설정 조회"""
        cls.ensure_roster_initialized()
        if agent_id not in DEFAULT_ROSTER:
            raise ValueError(f"Unknown agent: {agent_id}")

        agent_dir = AGENT_PROFILES_DIR / agent_id
        soul_file = agent_dir / "SOUL.md"
        memory_file = agent_dir / "MEMORY.md"
        config_file = agent_dir / "config.json"

        cfg = {}
        if config_file.exists():
            try:
                cfg = json.loads(config_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        default_info = DEFAULT_ROSTER[agent_id]
        return {
            "id": agent_id,
            "name": cfg.get("name") or default_info["name"],
            "tag": default_info["tag"],
            "role": cfg.get("role") or default_info["role"],
            "avatar": default_info["avatar"],
            "badge_color": default_info["badge_color"],
            "provider": cfg.get("provider") or default_info["default_provider"],
            "model": cfg.get("model") or default_info["default_model"],
            "soul_content": soul_file.read_text(encoding="utf-8") if soul_file.exists() else default_info["soul_template"],
            "memory_content": memory_file.read_text(encoding="utf-8") if memory_file.exists() else ""
        }

    @classmethod
    def update_agent_soul(cls, agent_id: str, soul_content: str, provider: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
        """사용자가 튜닝한 SOUL.md 및 모델 설정 저장"""
        cls.ensure_roster_initialized()
        if agent_id not in DEFAULT_ROSTER:
            raise ValueError(f"Unknown agent: {agent_id}")

        agent_dir = AGENT_PROFILES_DIR / agent_id
        soul_file = agent_dir / "SOUL.md"
        config_file = agent_dir / "config.json"

        soul_file.write_text(soul_content, encoding="utf-8")

        cfg = {}
        if config_file.exists():
            try:
                cfg = json.loads(config_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        if provider:
            cfg["provider"] = provider
        if model:
            cfg["model"] = model
        cfg["updated_at"] = datetime.now().isoformat()

        config_file.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")
        logger.info(f"✅ Updated SOUL.md for agent {agent_id}")
        return cls.get_agent_soul(agent_id)

    @classmethod
    def reset_agent_soul(cls, agent_id: str) -> Dict[str, Any]:
        """기본 SOUL.md로 공장 초기화"""
        if agent_id not in DEFAULT_ROSTER:
            raise ValueError(f"Unknown agent: {agent_id}")

        default_info = DEFAULT_ROSTER[agent_id]
        agent_dir = AGENT_PROFILES_DIR / agent_id
        soul_file = agent_dir / "SOUL.md"
        config_file = agent_dir / "config.json"

        soul_file.write_text(default_info["soul_template"], encoding="utf-8")
        cfg_data = {
            "id": agent_id,
            "name": default_info["name"],
            "tag": default_info["tag"],
            "role": default_info["role"],
            "avatar": default_info["avatar"],
            "badge_color": default_info["badge_color"],
            "provider": default_info["default_provider"],
            "model": default_info["default_model"],
            "updated_at": datetime.now().isoformat()
        }
        config_file.write_text(json.dumps(cfg_data, ensure_ascii=False, indent=2), encoding="utf-8")
        return cls.get_agent_soul(agent_id)

    @classmethod
    def match_mentioned_agent(cls, prompt: str) -> Optional[Dict[str, Any]]:
        """사용자 프롬프트에서 @스카우터, @작가 등 멘션된 에이전트 감지"""
        cls.ensure_roster_initialized()
        prompt_lower = prompt.lower()
        for a_id, info in DEFAULT_ROSTER.items():
            if info["tag"].lower() in prompt_lower or f"@{info['name'].lower()}" in prompt_lower:
                return cls.get_agent_soul(a_id)
        return None


agent_soul_service = AgentSoulService()
