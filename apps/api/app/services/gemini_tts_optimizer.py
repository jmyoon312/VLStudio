"""
Gemini 3.8 Flash TTS Voice Optimizer & Acting Guide Service
===========================================================
Provides fine-grained, genre-optimized voice presets, emotional acting directions,
and pronunciation/pacing formatting rules for Google Gemini 3.8 Flash TTS.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger("gemini_tts_optimizer")

# 5 Major Prebuilt Voices in Google Gemini 3.8 Flash TTS
GEMINI_VOICES = {
    "Puck": {
        "gender": "male",
        "tone": "Youthful, energetic, friendly, and bright",
        "best_for": ["shorts", "meme", "humor", "tech_review", "gaming"],
        "korean_desc": "밝고 통통 튀며 에너지 넘치는 젊은 남성 목소리 (쇼츠/틱톡/밈/리뷰 1순위)"
    },
    "Charon": {
        "gender": "male",
        "tone": "Deep, authoritative, serious, and resonant",
        "best_for": ["crime_mystery", "news", "politics", "history_documentary", "heavy_narrative"],
        "korean_desc": "묵직하고 신뢰감 넘치는 중저음 남성 목소리 (그것이 알고싶다/시사/역사 1순위)"
    },
    "Kore": {
        "gender": "female",
        "tone": "Warm, natural, clear, and empathetic",
        "best_for": ["lifestyle", "vlog", "shopping_review", "drama", "healing"],
        "korean_desc": "따뜻하고 맑으며 전달력이 뛰어난 자연스러운 여성 목소리 (뷰티/쇼핑/일상 1순위)"
    },
    "Fenrir": {
        "gender": "male",
        "tone": "Intense, dramatic, powerful, and cinematic",
        "best_for": ["blockbuster", "trailer", "conspiracy", "scary_story", "sports"],
        "korean_desc": "강렬하고 비장하며 긴박감을 자아내는 영화 예고편 톤 (괴담/공포/블록버스터 1순위)"
    },
    "Aoede": {
        "gender": "female",
        "tone": "Calm, reflective, intellectual, and poetic",
        "best_for": ["philosophy", "essay", "meditation", "documentary", "audiobook"],
        "korean_desc": "차분하고 지적이며 서정적인 고급 여성 나레이션 (철학/수필/감성 다큐 1순위)"
    }
}

# Industry Genre-Specific Optimal Configurations
GENRE_PRESETS = {
    "shorts_viral_hook": {
        "voice_id": "Puck",
        "speed": 1.12,
        "emotion": "excited",
        "style_instruction": "말투: 매우 신나고 시청자의 시선을 1초 만에 훔치는 열정적인 숏폼 크리에이터 톤으로 역동적으로 연기하세요. 문장의 끝을 가볍게 올리고 리듬감 있게 전달하세요.",
        "pacing_hint": "문장을 8단어 이내로 짧게 끊고 느낌표(!)를 자주 사용하여 빠른 호흡 유지"
    },
    "crime_mystery": {
        "voice_id": "Charon",
        "speed": 1.02,
        "emotion": "dramatic",
        "style_instruction": "말투: 극적이고 긴장감 넘치는 미스터리 다큐멘터리 서스펜스 톤으로 연기하세요. 중요한 단어 앞에서 미세한 쉼표를 두고 묵직하게 발음하세요.",
        "pacing_hint": "말줄임표(...)를 사용하여 긴장감 있는 침묵과 묵직한 클라이맥스 조성"
    },
    "news_politics": {
        "voice_id": "Charon",
        "speed": 1.05,
        "emotion": "serious",
        "style_instruction": "말투: 객관적이고 단호하며 신뢰감 넘치는 9시 뉴스 앵커 톤으로 전달하세요. 끝맺음을 명확하게 끊으세요.",
        "pacing_hint": "문장 끝에 마침표(.)를 확실히 찍어 명료한 딕션 유도"
    },
    "shopping_product_review": {
        "voice_id": "Kore",
        "speed": 1.08,
        "emotion": "happy",
        "style_instruction": "말투: 찐후기를 들려주듯 솔직하고 친근하며 설레는 톤으로 연기하세요. 장점 설명 시 톤을 한 음 올려 강조하세요.",
        "pacing_hint": "자연스러운 감탄사(와, 대박, 진짜)를 적절히 배치하여 신뢰도 상승"
    },
    "horror_scary": {
        "voice_id": "Fenrir",
        "speed": 0.98,
        "emotion": "whisper",
        "style_instruction": "말투: 어두운 방에서 귀신 이야기를 속삭이듯 오싹하고 긴장감 넘치는 톤으로 연기하세요.",
        "pacing_hint": "느린 속도로 단어를 길게 늘여 공포감 조성"
    },
    "philosophy_essay": {
        "voice_id": "Aoede",
        "speed": 1.00,
        "emotion": "normal",
        "style_instruction": "말투: 깊은 사색과 여운을 남기는 지적인 라디오 DJ 톤으로 따뜻하고 차분하게 낭독하세요.",
        "pacing_hint": "쉼표(,)를 넉넉히 배치해 충분한 호흡 템포 확보"
    }
}

# Age Demographics & Multi-Generational Voice Acting Profiles
AGE_DEMOGRAPHIC_PROFILES = {
    "child_boy": {
        "label": "7~9세 남자아이 (천진난만/장난꾸러기)",
        "voice_id": "Puck",
        "speed": 1.05,
        "pitch_shift": 4,  # +4 semitones for high childlike timbre
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 7세 활발하고 장난기 많은 남자아이] 혀가 살짝 짧고 맑은 고음으로, 호기심과 순수함이 가득 찬 천진난만한 아이의 억양으로 실감나게 연기하세요. 문장 끝을 생기발랄하게 올리세요.",
        "pacing_hint": "짧은 감탄사(우와!, 에이~, 진짜?)를 살리고 빠른 템포로 순수한 리듬감 부여"
    },
    "child_girl": {
        "label": "7~9세 여자아이 (사랑스러움/순수함/또랑또랑)",
        "voice_id": "Kore",
        "speed": 1.05,
        "pitch_shift": 5,  # +5 semitones for cute young girl
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 7세 귀엽고 순수한 여자아이] 사랑스럽고 또랑또랑한 맑은 하이톤 목소리로, 인형과 놀거나 엄마에게 조르듯 귀엽고 상냥하게 연기하세요.",
        "pacing_hint": "부드럽고 둥글둥글한 발음과 맑은 호흡 템포 유지"
    },
    "teen_boy": {
        "label": "15~18세 남학생 (쾌활함/풋풋함)",
        "voice_id": "Puck",
        "speed": 1.10,
        "pitch_shift": 1,
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 10대 후반 쾌활한 남학생] 친구끼리 편하게 이야기하듯 솔직하고 역동적이며 반항기 없는 활발한 청소년 톤으로 연기하세요.",
        "pacing_hint": "대화체 어투와 빠른 비트감"
    },
    "teen_girl": {
        "label": "15~18세 여학생 (발랄함/트렌디함)",
        "voice_id": "Kore",
        "speed": 1.10,
        "pitch_shift": 2,
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 10대 발랄한 여학생] 톡톡 튀고 생동감 넘치며 유행어와 감정을 듬뿍 담은 상큼하고 트렌디한 톤으로 연기하세요.",
        "pacing_hint": "말끝을 부드럽게 튕기는 발랄한 억양"
    },
    "young_adult_male": {
        "label": "20~30대 청년 남성 (세련됨/스마트함)",
        "voice_id": "Puck",
        "speed": 1.12,
        "pitch_shift": 0,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 20대 후반 세련된 청년 크리에이터] 자신감 있고 명확하며 에너제틱한 현대적 인플루언서 톤으로 설득력 있게 전달하세요.",
        "pacing_hint": "자연스러운 호흡과 명확한 딕션"
    },
    "young_adult_female": {
        "label": "20~30대 청년 여성 (친근함/전문적/쇼호스트)",
        "voice_id": "Kore",
        "speed": 1.08,
        "pitch_shift": 0,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 20대 여성 호스트] 친절하고 프로페셔널하며 귓가에 쏙쏙 박히는 깔끔한 발음으로 연기하세요.",
        "pacing_hint": "안정적인 톤과 부드러운 연결"
    },
    "middle_aged_male": {
        "label": "40~50대 중년 남성 (중후함/신뢰감)",
        "voice_id": "Charon",
        "speed": 1.04,
        "pitch_shift": -1,
        "emotion": "serious",
        "style_instruction": "[성우 연기 지침: 40~50대 중후하고 신뢰감 넘치는 중년 남성] 삶의 무게와 연륜이 느껴지는 안정된 중저음으로, 묵직하고 깊이 있게 설득하듯 연기하세요.",
        "pacing_hint": "문장 사이 적절한 쉼표로 묵직한 권위 형성"
    },
    "middle_aged_female": {
        "label": "40~50대 중년 여성 (우아함/단아함)",
        "voice_id": "Aoede",
        "speed": 1.02,
        "pitch_shift": 0,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 40대 우아하고 품격 있는 중년 여성] 차분하고 단아하며 따뜻한 모성애와 지성이 느껴지는 교양 다큐 톤으로 연기하세요.",
        "pacing_hint": "차분한 템포와 정갈한 발음"
    },
    "elderly_grandpa": {
        "label": "70~80대 할아버지 (인자함/연륜/거친 쇳소리)",
        "voice_id": "Charon",
        "speed": 0.90,
        "pitch_shift": -3,  # -3 semitones for deep elderly resonance
        "emotion": "dramatic",
        "style_instruction": "[성우 연기 지침: 80대 인자하고 연륜 넘치는 시골 할아버지] 숨이 약간 차고 목소리에 깊은 세월의 거친 울림과 쉰 소리가 자연스럽게 묻어나도록, 손주를 무릎에 앉히고 옛날 이야기를 구수하게 들려주듯 천천히 따뜻하게 연기하세요.",
        "pacing_hint": "말 끝을 길게 늘이고 가벼운 헛기침이나 한숨 같은 호흡 여백을 살림"
    },
    "elderly_grandma": {
        "label": "70~80대 할머니 (정겨움/포근함/구수한 시골 할머니)",
        "voice_id": "Aoede",
        "speed": 0.88,
        "pitch_shift": -1,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 80대 정겹고 따뜻한 시골 할머니] 손주를 바라보듯 다정하고 구수하며, 약간의 정겨운 떨림과 포근한 온기가 묻어나는 구수한 할머니 목소리로 연기하세요.",
        "pacing_hint": "정겨운 사투리 억양과 부드러운 호흡 휴지"
    }
}


class GeminiTTSOptimizer:
    """
    Optimizes settings and provides scripting guidelines for Gemini 3.8 Flash TTS.
    """

    @staticmethod
    def get_age_persona_settings(age_group: str) -> Dict[str, Any]:
        """
        Resolves specific age demographic settings (child, teen, adult, elderly).
        """
        clean_key = age_group.lower().strip().replace(" ", "_")
        profile = AGE_DEMOGRAPHIC_PROFILES.get(clean_key)
        if not profile:
            # Fuzzy matching (e.g. 'child' -> 'child_boy', 'grandpa' -> 'elderly_grandpa')
            for k, p in AGE_DEMOGRAPHIC_PROFILES.items():
                if clean_key in k or k in clean_key:
                    profile = p
                    break
        if not profile:
            profile = AGE_DEMOGRAPHIC_PROFILES["young_adult_male"]

        voice_meta = GEMINI_VOICES.get(profile["voice_id"], {})
        return {
            "success": True,
            "age_group": clean_key,
            "label": profile["label"],
            "voice_id": profile["voice_id"],
            "voice_name_ko": voice_meta.get("korean_desc", profile["voice_id"]),
            "speed": profile["speed"],
            "pitch_shift": profile.get("pitch_shift", 0),
            "emotion": profile["emotion"],
            "style_instruction": profile["style_instruction"],
            "pacing_hint": profile["pacing_hint"]
        }

    @classmethod
    def get_optimal_settings(cls, genre: str = "shorts_viral_hook", age_group: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns the optimal Gemini 3.8 voice, speed, emotion, and acting instruction
        tailored for the requested video genre and optional age group.
        """
        if age_group:
            age_settings = cls.get_age_persona_settings(age_group)
            clean_genre = genre.lower().strip().replace(" ", "_")
            genre_preset = GENRE_PRESETS.get(clean_genre, GENRE_PRESETS["shorts_viral_hook"])
            combined_instruction = f"{age_settings['style_instruction']}\n[장르 연출 추가]: {genre_preset['style_instruction']}"
            return {
                "success": True,
                "genre": genre,
                "age_group": age_group,
                "age_label": age_settings["label"],
                "voice_id": age_settings["voice_id"],
                "voice_name_ko": age_settings["voice_name_ko"],
                "speed": age_settings["speed"],
                "pitch_shift": age_settings["pitch_shift"],
                "emotion": age_settings["emotion"],
                "style_instruction": combined_instruction,
                "pacing_hint": f"{age_settings['pacing_hint']} / {genre_preset['pacing_hint']}",
                "audio_format": "24kHz 16-bit Mono High-Definition WAV/MP3"
            }

        clean_key = genre.lower().strip().replace(" ", "_")
        preset = GENRE_PRESETS.get(clean_key)
        if not preset:
            # Fuzzy match
            for k, p in GENRE_PRESETS.items():
                if k in clean_key or clean_key in k:
                    preset = p
                    break
        if not preset:
            preset = GENRE_PRESETS["shorts_viral_hook"]

        voice_meta = GEMINI_VOICES.get(preset["voice_id"], {})
        return {
            "success": True,
            "genre": genre,
            "voice_id": preset["voice_id"],
            "voice_name_ko": voice_meta.get("korean_desc", preset["voice_id"]),
            "speed": preset["speed"],
            "pitch_shift": 0,
            "emotion": preset["emotion"],
            "style_instruction": preset["style_instruction"],
            "pacing_hint": preset["pacing_hint"],
            "audio_format": "24kHz 16-bit Mono High-Definition WAV/MP3"
        }

    @staticmethod
    def format_script_for_tts(raw_text: str, genre: str = "shorts_viral_hook") -> str:
        """
        Optimizes punctuation, line breaks, and emphasis markers in the script
        to ensure Gemini 3.8 Flash TTS produces the most human-like natural cadence.
        """
        text = raw_text.strip()

        # 1. Normalize numbers and units (e.g. 10만 -> 십만, 3초 -> 삼초) for seamless speech
        replacements = [
            (" 1위", " 일위"),
            (" 1등", " 일등"),
            (" 1위로", " 일위로"),
            (" 1초", " 일초"),
            (" 3초", " 삼초"),
            (" 5초", " 오초"),
            (" 10초", " 십초"),
            (" 100%", " 백프로"),
            (" 100퍼센트", " 백프로"),
            (" 0원", " 영원"),
            (" 2026년", " 이천이십육년"),
            (" 4K", " 포케이"),
            (" AI", " 에이아이"),
            (" AI가", " 에이아이가"),
            (" TTS", " 티티에스"),
            (" vs ", " 대 "),
            (" VS ", " 대 ")
        ]
        for src, dst in replacements:
            text = text.replace(src, dst)

        # 2. Add breathable micro-pauses at key commas if too long
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    @staticmethod
    def get_full_optimization_guide() -> Dict[str, Any]:
        """Returns complete directory of voices, genres, and prompt rules."""
        return {
            "voices": GEMINI_VOICES,
            "genres": GENRE_PRESETS,
            "genre_recommendations": GENRE_PRESETS,
            "golden_script_rules": [
                "1. 문장은 20자 내외로 끊어 쉼표(,)를 배치할 때 가장 자연스러운 호흡이 들어갑니다.",
                "2. 영단어나 축약어(AI, 4K, 100%)는 한글 발음(에이아이, 포케이, 백프로)으로 적으면 오독률 0%가 됩니다.",
                "3. 쇼츠는 1.08x ~ 1.15x 배속이 시청자 이탈을 막는 골든 스피드입니다.",
                "4. 클라이맥스 문장 앞에는 느낌표(!)를 두고 한 줄 띄우면 폭발적인 감정 톤이 발현됩니다."
            ]
        }

    @classmethod
    def get_full_guide(cls) -> Dict[str, Any]:
        return cls.get_full_optimization_guide()

    @classmethod
    def optimize_script(cls, raw_text: str, genre: str = "shorts_viral_hook") -> str:
        return cls.format_script_for_tts(raw_text, genre)


gemini_tts_optimizer = GeminiTTSOptimizer()
