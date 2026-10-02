"""
CharacterVoiceTTS — Google Gemini 3.8 Live / Flash TTS 캐릭터 멀티 보이스 엔진
===========================================================================
Google Gemini 3.8 Live 및 Flash TTS의 5대 핵심 보이스(Charon, Kore, Puck, Fenrir, Aoede)와
gemini_tts_optimizer의 다연령대/다인격 페르소나를 결합하여
대본 파싱 시 등장인물 ↔ Gemini 보이스 매핑 및 실시간 감정 연기를 자동화한다.
Zero Edge TTS / Zero Paid API Key 원칙을 준수하며, Google 계정 세션 풀과 직결된다.
"""

import os
import re
import logging
from dataclasses import dataclass
from typing import Dict, Optional, List, Tuple, Any

from app.services.gemini_tts_optimizer import gemini_tts_optimizer, GEMINI_VOICES, AGE_DEMOGRAPHIC_PROFILES

logger = logging.getLogger("character_voice_tts")


@dataclass
class VoiceProfile:
    id: str
    name_kr: str
    provider: str
    voice_id: str
    gender: str = "M"
    pitch_shift: int = 0
    speed: float = 1.0
    emotion: str = "normal"
    style_instruction: str = ""
    age_tier: str = "adult"

    def __hash__(self):
        return hash(self.id)


# ─── Google Gemini 3.8 Live & Flash TTS 기반 캐릭터 보이스 세트 ───
CHARACTER_VOICES: Dict[str, VoiceProfile] = {
    "grandfather": VoiceProfile(
        id="elder_m",
        name_kr="할아버지 (중저음/인자함/연륜)",
        provider="gemini",
        voice_id="Charon",
        gender="M",
        pitch_shift=-3,
        speed=0.96,
        emotion="serious",
        style_instruction="[성우 연기 지침: 70대 인자한 할아버지] 연륜이 깊게 묻어나는 따뜻하고 나직한 톤으로, 옛날이야기를 손주에게 들려주듯 깊은 울림으로 연기하세요.",
        age_tier="elderly"
    ),
    "grandmother": VoiceProfile(
        id="elder_f",
        name_kr="할머니 (온화함/구수함/다정)",
        provider="gemini",
        voice_id="Aoede",
        gender="F",
        pitch_shift=-2,
        speed=0.96,
        emotion="calm",
        style_instruction="[성우 연기 지침: 70대 다정한 할머니] 손주의 손을 꼭 잡고 위로해 주듯 따뜻하고 구수하며 온화한 어머니의 어머니 목소리로 연기하세요.",
        age_tier="elderly"
    ),
    "middle_man": VoiceProfile(
        id="mid_m",
        name_kr="아저씨/중년 남성 (신뢰감/묵직함)",
        provider="gemini",
        voice_id="Charon",
        gender="M",
        pitch_shift=-1,
        speed=1.02,
        emotion="normal",
        style_instruction="[성우 연기 지침: 40대 든든한 중년 남성] 사회적 경험이 풍부하고 신뢰감 넘치는 안정된 톤으로 명확하고 무게감 있게 연기하세요.",
        age_tier="middle_aged"
    ),
    "middle_woman": VoiceProfile(
        id="mid_f",
        name_kr="아줌마/중년 여성 (친근함/생활력)",
        provider="gemini",
        voice_id="Aoede",
        gender="F",
        pitch_shift=0,
        speed=1.02,
        emotion="normal",
        style_instruction="[성우 연기 지침: 40대 친근한 중년 여성] 따뜻한 일상 대화체로 배려와 활력이 넘치며 똑 부러지는 톤으로 연기하세요.",
        age_tier="middle_aged"
    ),
    "young_woman": VoiceProfile(
        id="young_f",
        name_kr="20대 여성 (트렌디/자연스러움/쇼츠)",
        provider="gemini",
        voice_id="Kore",
        gender="F",
        pitch_shift=0,
        speed=1.10,
        emotion="happy",
        style_instruction="[성우 연기 지침: 20대 트렌디한 여성 크리에이터] 밝고 상큼하며 전달력이 뛰어난 대한민국 표준어 톤으로 리듬감 있게 연기하세요.",
        age_tier="young_adult"
    ),
    "young_man": VoiceProfile(
        id="young_m",
        name_kr="20대 남성 (청년/에너지/유쾌함)",
        provider="gemini",
        voice_id="Puck",
        gender="M",
        pitch_shift=0,
        speed=1.10,
        emotion="excited",
        style_instruction="[성우 연기 지침: 20대 활력 넘치는 청년] 젊고 통통 튀며 에너지 넘치는 유튜버 톤으로 1초의 오디오 낭비 없이 흡입력 있게 연기하세요.",
        age_tier="young_adult"
    ),
    "child_girl": VoiceProfile(
        id="child_f",
        name_kr="여자아이 (또랑또랑/순수함)",
        provider="gemini",
        voice_id="Kore",
        gender="F",
        pitch_shift=5,
        speed=1.05,
        emotion="happy",
        style_instruction="[성우 연기 지침: 7세 또랑또랑한 여자아이] 맑고 깨끗한 하이톤으로 호기심과 순수함이 가득 차게 연기하세요.",
        age_tier="child"
    ),
    "child_boy": VoiceProfile(
        id="child_m",
        name_kr="아들/남자아이 (장난꾸러기/발랄)",
        provider="gemini",
        voice_id="Puck",
        gender="M",
        pitch_shift=4,
        speed=1.05,
        emotion="excited",
        style_instruction="[성우 연기 지침: 7세 장난기 많은 남자아이] 맑고 높은 고음으로 놀이터에서 신나게 외치듯 발랄하게 연기하세요.",
        age_tier="child"
    ),
    "toddler": VoiceProfile(
        id="toddler",
        name_kr="아기/유아 (3~5세 극강의 귀여움)",
        provider="gemini",
        voice_id="Puck",
        gender="M",
        pitch_shift=7,
        speed=0.98,
        emotion="excited",
        style_instruction="[성우 연기 지침: 4세 앙증맞은 아기] 혀가 아직 덜 풀려 발음이 살짝 어눌하고 새지만 천진난만하게 조잘조잘 말하듯 연기하세요.",
        age_tier="toddler"
    ),
    "villain": VoiceProfile(
        id="villain",
        name_kr="빌런/괴담/긴박 (강렬함)",
        provider="gemini",
        voice_id="Fenrir",
        gender="M",
        pitch_shift=-1,
        speed=1.05,
        emotion="dramatic",
        style_instruction="[성우 연기 지침: 영화 예고편/미스터리] 비장하고 강렬하며 긴박감을 자아내는 압도적인 톤으로 연기하세요.",
        age_tier="adult"
    ),
    "narrator": VoiceProfile(
        id="narrator",
        name_kr="공식 나레이터 (표준 해설)",
        provider="gemini",
        voice_id="Charon",
        gender="M",
        pitch_shift=0,
        speed=1.08,
        emotion="normal",
        style_instruction="[성우 연기 지침: 다큐멘터리/쇼츠 공식 나레이션] 정제되고 신뢰도 높은 명확한 딕션으로 전달력을 극대화하세요.",
        age_tier="adult"
    )
}

# 한국어 등장인물 명칭 → CHARACTER_VOICES 매핑 사전
CHARACTER_ALIASES: Dict[str, str] = {
    # 조부모 / 노년
    "할아버지": "grandfather",
    "시아버지": "grandfather",
    "외할아버지": "grandfather",
    "노인": "grandfather",
    "어르신": "grandfather",
    "시자/宅": "grandfather",
    "할머니": "grandmother",
    "시어머니": "grandmother",
    "장모": "grandmother",
    "외할머니": "grandmother",
    "노파": "grandmother",

    # 중년 / 부모
    "아버지": "middle_man",
    "아빠": "middle_man",
    "남편": "middle_man",
    "아저씨": "middle_man",
    "부장님": "middle_man",
    "사장님": "middle_man",
    "중년남": "middle_man",
    "어머니": "middle_woman",
    "엄마": "middle_woman",
    "아내": "middle_woman",
    "아줌마": "middle_woman",
    "사모님": "middle_woman",
    "중년여": "middle_woman",

    # 청년 / 젊은이
    "며느리": "young_woman",
    "딸": "young_woman",
    "언니": "young_woman",
    "누나": "young_woman",
    "여친": "young_woman",
    "여자친구": "young_woman",
    "20대여": "young_woman",
    "젊은여자": "young_woman",
    "아들": "young_man",
    "형": "young_man",
    "오빠": "young_man",
    "남친": "young_man",
    "남자친구": "young_man",
    "20대남": "young_man",
    "젊은남자": "young_man",
    "청년": "young_man",

    # 어린이 / 유아
    "어린이": "child_girl",
    "소녀": "child_girl",
    "어린여자아이": "child_girl",
    "소년": "child_boy",
    "어린남자아이": "child_boy",
    "아들아이": "child_boy",
    "아기": "toddler",
    "유아": "toddler",

    # 특수
    "해설": "narrator",
    "나레이션": "narrator",
    "진행자": "narrator",
    "괴한": "villain",
    "빌런": "villain",
    "악역": "villain"
}


def get_voice_profile(character_type: str) -> VoiceProfile:
    """등장인물 키에 따른 Gemini VoiceProfile 반환"""
    if character_type in CHARACTER_VOICES:
        return CHARACTER_VOICES[character_type]
    alias_key = CHARACTER_ALIASES.get(character_type)
    if alias_key and alias_key in CHARACTER_VOICES:
        return CHARACTER_VOICES[alias_key]
    return CHARACTER_VOICES["narrator"]


def parse_speaker_line(line: str) -> Tuple[Optional[str], str]:
    """[등장인물] 대사 텍스트 → (voice_key, speech_text) 파싱"""
    match = re.match(r'^\s*\[([^\]]+)\]\s*(.*)$', line)
    if not match:
        return None, line.strip()
    char_name = match.group(1).strip()
    speech = match.group(2).strip()
    voice_key = CHARACTER_ALIASES.get(char_name, "middle_man")
    return voice_key, speech


def default_voice_for_gender(gender: str) -> VoiceProfile:
    """성별에 따른 기본 Gemini VoiceProfile"""
    if gender.upper() == "F":
        return CHARACTER_VOICES["young_woman"]
    return CHARACTER_VOICES["young_man"]


async def synthesize_character_voice(
    text: str,
    character_type: str = "narrator",
    output_path: Optional[str] = None,
    project_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    등장인물 설정에 맞추어 Google Gemini 3.8 Flash TTS로 음성을 합성합니다.
    Zero Edge TTS 원칙을 준수하며, TTSEngine의 Gemini 경로를 사용합니다.
    """
    profile = get_voice_profile(character_type)
    from app.tts_engine import TTSEngine
    from app.crud import get_settings
    from app.database import SessionLocal

    with SessionLocal() as db:
        db_settings = get_settings(db)
        engine_instance = TTSEngine(db_settings)

    rate_val = int((profile.speed - 1.0) * 100)
    voice_settings = {
        "pitch_shift": profile.pitch_shift,
        "speed": profile.speed,
        "style_instruction": profile.style_instruction
    }

    res = await engine_instance.generate_audio(
        text=text,
        engine="gemini",
        language="ko",
        voice_id=profile.voice_id,
        rate=rate_val,
        pitch=profile.pitch_shift,
        emotion=profile.emotion,
        voice_settings=voice_settings,
        project_name=project_name
    )

    return {
        "status": res.get("status", "success"),
        "file_path": res.get("file_path"),
        "url": res.get("url"),
        "profile": {
            "character_type": character_type,
            "name_kr": profile.name_kr,
            "voice_id": profile.voice_id,
            "speed": profile.speed,
            "pitch_shift": profile.pitch_shift
        }
    }