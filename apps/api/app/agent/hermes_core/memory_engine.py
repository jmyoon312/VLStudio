"""
Hermes Working Memory & Multi-Turn Context Engine for ViraLoop Studio.
Sovereign implementation inspired by open-source memory architectures (Mem0, Letta, LangGraph).

Maintains:
1. Working Memory (Active Script, Active Voice, Active Audio, Active Preset, Genre/Audience).
2. Sanitized Multi-Turn Dialogue History for all 4 LLM providers (Gemini, Codex Astra, OpenAI, OmniRoute).
3. Zero-Amnesia Protocol: Solves context-loss when user gives follow-up commands (e.g. "여자 목소리로 바꿔줘", "앞에꺼랑 이어지는 거잖아").
"""

import re
import json
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger("hermes_memory_engine")


@dataclass
class WorkingMemory:
    active_script: Optional[str] = None
    active_voice_id: Optional[str] = None
    active_engine: Optional[str] = None
    active_audio_path: Optional[str] = None
    active_audio_url: Optional[str] = None
    active_genre: Optional[str] = None
    active_target_audience: Optional[str] = None
    active_preset_id: Optional[str] = None
    active_preset_name: Optional[str] = None
    active_deliverable: Optional[Dict[str, Any]] = None
    user_preferences: List[str] = field(default_factory=list)
    key_facts: List[str] = field(default_factory=list)
    is_mutation_prompt: bool = False
    mutation_type: Optional[str] = None  # "voice_change", "speed_change", "continuation", "style_change"


class HermesMemoryEngine:
    """
    Sovereign working memory and multi-turn context orchestrator.
    Eliminates AI amnesia across conversational turns.
    """

    @classmethod
    def extract_working_memory(
        cls,
        history: Optional[List[Dict[str, Any]]],
        current_prompt: str,
        previous_deliverable: Optional[Dict[str, Any]] = None,
        preset: Optional[Dict[str, Any]] = None
    ) -> WorkingMemory:
        mem = WorkingMemory()

        # 1. Preset binding
        if preset:
            mem.active_preset_id = preset.get("id")
            mem.active_preset_name = preset.get("name") or preset.get("id")

        # 2. Previous deliverable binding
        if previous_deliverable:
            mem.active_deliverable = previous_deliverable
            if previous_deliverable.get("script"):
                mem.active_script = previous_deliverable["script"]
            elif previous_deliverable.get("cues"):
                cues_text = " ".join([c.get("text", "") for c in previous_deliverable["cues"] if c.get("text")])
                if cues_text.strip():
                    mem.active_script = cues_text.strip()

        # 3. Scan History (Reverse order to find most recent artifacts)
        if history:
            for item in reversed(history):
                # A. Audio Deliverable tracking
                if not mem.active_audio_url and item.get("audio_url"):
                    mem.active_audio_url = item.get("audio_url")
                if not mem.active_voice_id and item.get("audio_voice_id"):
                    mem.active_voice_id = item.get("audio_voice_id")
                if not mem.active_engine and item.get("audio_engine"):
                    mem.active_engine = item.get("audio_engine")

                # B. Deliverable tracking
                deliv = item.get("deliverable")
                if deliv and isinstance(deliv, dict):
                    if not mem.active_script and deliv.get("script"):
                        mem.active_script = deliv["script"]
                    elif not mem.active_script and deliv.get("cues"):
                        cues_text = " ".join([c.get("text", "") for c in deliv["cues"] if c.get("text")])
                        if cues_text.strip():
                            mem.active_script = cues_text.strip()

                # C. Script extraction from Assistant text
                role = item.get("role")
                content = item.get("content") or ""
                if role in ["assistant", "model"] and content and not mem.active_script:
                    extracted = cls._extract_script_from_text(content)
                    if extracted:
                        mem.active_script = extracted

                # D. Audio path tracking in content or deliverable
                if not mem.active_audio_path:
                    path_match = re.search(r'([A-Za-z]:\\[^\s\r\n]+\.mp3|/api/stream\?path=[^\s\r\n]+)', content)
                    if path_match:
                        mem.active_audio_path = path_match.group(1)

                # E. User Preferences extraction
                if role == "user" and content:
                    cls._extract_preferences(content, mem)

        # 4. Genre & Target Audience Inference
        all_text = " ".join([(h.get("content") or "") for h in (history or [])]) + " " + current_prompt
        cls._infer_genre_and_audience(all_text, mem)

        # 5. Analyze Current Prompt Intent (Mutation / Continuation Check)
        clean_cp = current_prompt.strip().lower()

        # Check for Voice Mutation ("여자 목소리로", "여성으로", "목소리 바꿔", "남자 목소리로", "kore로", "aoede로")
        if any(kw in clean_cp for kw in ["여자 목소리", "여성 목소리", "여성 보이스", "여자 보이스", "여자 목소리로", "여성으로", "여자톤", "목소리 바꿔", "목소리 변경", "남자 목소리", "남성 목소리", "성우 바꿔"]):
            mem.is_mutation_prompt = True
            mem.mutation_type = "voice_change"
            if any(w in clean_cp for w in ["여자", "여성"]):
                mem.user_preferences.append("사용자가 명시적으로 '여성 목소리'로 전환 요청함")
            elif any(w in clean_cp for w in ["남자", "남성"]):
                mem.user_preferences.append("사용자가 명시적으로 '남성 목소리'로 전환 요청함")

        # Check for Continuation ("이어지는", "앞에꺼", "다음 내용", "이어서", "다음 편", "2편", "이어줘")
        elif any(kw in clean_cp for kw in ["이어지는", "앞에꺼", "앞의 내용", "이어서", "다음 내용", "다음편", "2편", "다음 이야기", "이어져"]):
            mem.is_mutation_prompt = True
            mem.mutation_type = "continuation"

        # Check for Speed / Tone Mutation
        elif any(kw in clean_cp for kw in ["속도", "빠르게", "느리게", "배속", "감동적", "슬프게", "더 톤다운"]):
            mem.is_mutation_prompt = True
            mem.mutation_type = "speed_change"

        return mem

    @classmethod
    def _extract_script_from_text(cls, text: str) -> Optional[str]:
        """Extracts narration / dialogue script block from assistant text."""
        # Pattern 1: Block enclosed in [내레이션 대본], [대본], [음성 스크립트]
        patterns = [
            r'\[(?:내레이션 대본|대본|음성 대본|스크립트|내레이션|나레이션)\]\s*\n*(.*?)(?=\n\n\[|\n\n#|\n\n\*\*|\Z)',
            r'```(?:text|markdown)?\s*\n*(?:\[대본\]|내레이션:)?\s*(.*?)\s*```',
            r'>\s*\"(.*?)\"',
            r'\"([^\"]{30,500})\"'
        ]
        for pat in patterns:
            match = re.search(pat, text, re.DOTALL)
            if match:
                res = match.group(1).strip()
                if len(res) >= 20 and not res.startswith("http"):
                    return res

        # If text contains quotes and dialogue lines
        lines = [line.strip().lstrip(">").strip() for line in text.split("\n") if line.strip()]
        script_candidates = []
        in_script = False
        for line in lines:
            if any(h in line for h in ["대본:", "내레이션:", "[대본]", "[내레이션]"]):
                in_script = True
                continue
            if in_script:
                if line.startswith("#") or line.startswith("[") or "제작" in line or "완료" in line:
                    break
                script_candidates.append(line)

        if script_candidates:
            res = " ".join(script_candidates).strip()
            if len(res) >= 20:
                return res

        return None

    @classmethod
    def _extract_preferences(cls, content: str, mem: WorkingMemory):
        """Extracts user preferences from a prompt."""
        c_low = content.lower()
        if "시니어" in c_low or "어르신" in c_low or "50대" in c_low or "60대" in c_low:
            if "타겟층: 50~70대 시니어 어르신" not in mem.user_preferences:
                mem.user_preferences.append("타겟층: 50~70대 시니어 어르신")
        if "감동" in c_low or "눈물" in c_low or "실화" in c_low or "야담" in c_low:
            if "장르 및 톤: 가슴 뭉클한 감동 실화 / 야담 (따뜻하고 진중한 호흡)" not in mem.user_preferences:
                mem.user_preferences.append("장르 및 톤: 가슴 뭉클한 감동 실화 / 야담 (따뜻하고 진중한 호흡)")
        if "여성" in c_low or "여자" in c_low:
            if "음성 성별 선호: 여성" not in mem.user_preferences:
                mem.user_preferences.append("음성 성별 선호: 여성")
        if "남성" in c_low or "남자" in c_low:
            if "음성 성별 선호: 남성" not in mem.user_preferences:
                mem.user_preferences.append("음성 성별 선호: 남성")

    @classmethod
    def _infer_genre_and_audience(cls, text: str, mem: WorkingMemory):
        """Infers active genre and target audience from collective text."""
        t_low = text.lower()
        if any(w in t_low for w in ["시니어", "어머니", "아버지", "할머니", "야담", "실화", "사연", "눈물", "감동"]):
            mem.active_genre = "시니어 감동 실화 / 따뜻한 인생 야담"
            mem.active_target_audience = "50~70대 시니어 및 감성 숏폼 시청자"
        elif any(w in t_low for w in ["랭킹", "순위", "top5", "top 5", "top10", "top 10"]):
            mem.active_genre = "호기심 자극 랭킹 쇼츠"
            mem.active_target_audience = "10~30대 빠른 템포 시청자"
        elif any(w in t_low for w in ["맛집", "먹방", "디저트", "레시피"]):
            mem.active_genre = "푸드 / 미식 리뷰"
            mem.active_target_audience = "20~40대 미식 탐방객"
        else:
            mem.active_genre = mem.active_genre or "스토리텔링 숏폼"
            mem.active_target_audience = mem.active_target_audience or "대중 숏폼 시청자"

    @classmethod
    def build_memory_context_prompt(cls, mem: Optional[WorkingMemory], current_prompt: str) -> str:
        """
        Builds authoritative, structured Working Memory prompt block (Mem0 / Letta Sovereign Protocol).
        Injected into the LLM system instructions to guarantee continuous recall.
        """
        if not mem:
            return ""

        lines = [
            "======================================================================",
            "🧠 [Hermes Active Working Memory & Context Slot (Mem0 Sovereign Memory)]",
            "======================================================================"
        ]

        if mem.active_script:
            lines.append("📌 [현재 작업 중인 활성 대본 (Active Script)]:")
            lines.append(f'"""\n{mem.active_script}\n"""')
        else:
            lines.append("📌 [현재 작업 중인 활성 대본]: (아직 작성된 대본 없음)")

        if mem.active_voice_id or mem.active_engine:
            v_desc = f"{mem.active_engine or 'Gemini 3.8 Flash TTS'} (Voice ID: {mem.active_voice_id or 'Charon'})"
            lines.append(f"🎙️ [최근 사용된 활성 음성]: {v_desc}")
        if mem.active_audio_path or mem.active_audio_url:
            lines.append(f"🎵 [최근 생성된 오디오 파일]: {mem.active_audio_path or mem.active_audio_url}")

        if mem.active_preset_name:
            lines.append(f"🎨 [활성 비주얼 스타일 프리셋]: {mem.active_preset_name}")

        lines.append(f"👥 [장르 및 타겟 맥락]: {mem.active_genre} (타겟: {mem.active_target_audience})")

        if mem.user_preferences:
            lines.append("💡 [기억된 사용자 요구사항 및 누적 선호]:")
            for pref in mem.user_preferences[-4:]:
                lines.append(f"   • {pref}")

        # Directive for mutations or continuations
        lines.append("\n⚠️ [기억 연속성 및 자율 행동 절대 지침 (Zero Amnesia Law)]:")
        if mem.is_mutation_prompt and mem.mutation_type == "voice_change":
            lines.append("🚨 [최우선 즉시 실행 과업 (Voice Mutation)]: ")
            lines.append("   - 사용자가 '여자 목소리로 바꿔줘' 등 음성 변경을 요청했습니다.")
            lines.append("   - 절대로 '무슨 대본인가요?'라고 되묻거나 대본을 새로 쓰지 마십시오!")
            lines.append("   - 위의 [현재 작업 중인 활성 대본]을 100% 그대로 유지한 채,")
            lines.append("     여성 목소리(Gemini인 경우 'Aoede' 또는 'Kore', Supertonic인 경우 'supertonic_ko_female')로")
            lines.append("     `synthesize_voice_speech` 도구를 즉시 호출하여 새로운 오디오를 생성하십시오!")
        elif mem.is_mutation_prompt and mem.mutation_type == "continuation":
            lines.append("🚨 [최우선 즉시 실행 과업 (Continuation)]: ")
            lines.append("   - 사용자가 이전 내용과 이어지는 다음 대본/이야기를 요청했습니다.")
            lines.append("   - 위의 [현재 작업 중인 활성 대본]의 줄거리와 감정선을 그대로 계승하여 자연스러운 2편/다음 이야기를 작성하세요.")
        else:
            lines.append("   - 사용자가 맥락을 생략한 짧은 지시나 피드백을 주더라도, 위의 작업 중인 활성 대본과 음성 설정을 기반으로 일관성 있게 작업을 이어가세요.")

        lines.append("======================================================================\n")
        return "\n".join(lines)

    @classmethod
    def format_gemini_contents(
        cls,
        history: Optional[List[Dict[str, Any]]],
        current_prompt: str,
        mem: WorkingMemory
    ) -> List[Dict[str, Any]]:
        """
        Formats multi-turn conversation history for Google Gemini API.
        Strictly guarantees:
        1. Alternating turns: user -> model -> user -> model -> user.
        2. No empty text parts.
        3. Collapses consecutive same-role messages to satisfy Google API specifications.
        """
        gemini_contents: List[Dict[str, Any]] = []

        if history:
            for h in history[-10:]:
                raw_role = h.get("role")
                content = h.get("content")
                if not content or not str(content).strip():
                    continue

                mapped_role = "model" if raw_role in ["assistant", "model"] else "user"
                clean_text = str(content).strip()

                # If the previous item in gemini_contents has the SAME role, merge parts!
                if gemini_contents and gemini_contents[-1]["role"] == mapped_role:
                    gemini_contents[-1]["parts"].append({"text": clean_text})
                else:
                    gemini_contents.append({"role": mapped_role, "parts": [{"text": clean_text}]})

        # Ensure that the first turn is 'user' (Gemini requirement)
        if gemini_contents and gemini_contents[0]["role"] == "model":
            # Prepend a synthetic user greeting/context
            gemini_contents.insert(0, {"role": "user", "parts": [{"text": "안녕하세요 Hermes, 영상 제작 작업을 함께 시작해 봅시다."}]})

        # Now append current user prompt
        prompt_with_mutation_cue = current_prompt
        if mem and mem.is_mutation_prompt and mem.mutation_type == "voice_change" and mem.active_script:
            prompt_with_mutation_cue = (
                f"{current_prompt}\n\n"
                f"[Hermes Working Memory 지시: 이전 활성 대본을 유지하며 요청된 목소리(여성 보이스 Aoede 또는 Kore)로 "
                f"synthesize_voice_speech를 즉시 실행하세요. 대본: \"{mem.active_script}\"]"
            )

        if gemini_contents and gemini_contents[-1]["role"] == "user":
            gemini_contents[-1]["parts"].append({"text": prompt_with_mutation_cue})
        else:
            gemini_contents.append({"role": "user", "parts": [{"text": prompt_with_mutation_cue}]})

        return gemini_contents

    @classmethod
    def format_openai_messages(
        cls,
        base_system_prompt: str,
        history: Optional[List[Dict[str, Any]]],
        current_prompt: str,
        mem: WorkingMemory
    ) -> List[Dict[str, Any]]:
        """
        Formats multi-turn messages for OpenAI, Codex Astra, and OmniRoute.
        Injects Working Memory block into system prompt and appends recent history.
        """
        memory_block = cls.build_memory_context_prompt(mem, current_prompt)
        full_system = f"{base_system_prompt}\n\n{memory_block}"

        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": full_system}
        ]

        if history:
            for h in history[-10:]:
                r = h.get("role")
                c = h.get("content")
                if not c or not str(c).strip():
                    continue
                role_mapped = "assistant" if r in ["assistant", "model"] else "user"
                messages.append({"role": role_mapped, "content": str(c).strip()})

        prompt_with_mutation_cue = current_prompt
        if mem and mem.is_mutation_prompt and mem.mutation_type == "voice_change" and mem.active_script:
            prompt_with_mutation_cue = (
                f"{current_prompt}\n\n"
                f"[Hermes Working Memory 지시: 이전 활성 대본을 유지하며 요청된 목소리(여성 보이스 Aoede 또는 Kore / supertonic_ko_female)로 "
                f"synthesize_voice_speech를 즉시 실행하세요. 대본: \"{mem.active_script}\"]"
            )

        messages.append({"role": "user", "content": prompt_with_mutation_cue})
        return messages


# Global singleton instance
hermes_memory_engine = HermesMemoryEngine()
