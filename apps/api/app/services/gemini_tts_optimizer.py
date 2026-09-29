"""
Gemini 3.8 Flash TTS Voice Optimizer & Intelligent Voice Director
=================================================================
Provides fine-grained, multi-generational age demographics (toddler to elderly),
16 professional roles, 10 emotional moods, and automated script-based voice direction
for Google Gemini 3.8 Flash TTS.
"""

import logging
import re
from typing import Dict, Any, Optional, List, Tuple

logger = logging.getLogger("gemini_tts_optimizer")

# 5 Major Prebuilt Voices in Google Gemini 3.8 Flash TTS
GEMINI_VOICES = {
    "Puck": {
        "gender": "male",
        "tone": "Youthful, energetic, friendly, and bright",
        "best_for": ["shorts", "meme", "humor", "tech_review", "gaming", "child", "teen"],
        "korean_desc": "밝고 통통 튀며 에너지 넘치는 젊은 남성 목소리 (쇼츠/틱톡/밈/어린이 남아 1순위)"
    },
    "Charon": {
        "gender": "male",
        "tone": "Deep, authoritative, serious, and resonant",
        "best_for": ["crime_mystery", "news", "politics", "history_documentary", "heavy_narrative", "middle_aged", "elderly"],
        "korean_desc": "묵직하고 신뢰감 넘치는 중저음 남성 목소리 (그것이 알고싶다/시사/중년/할아버지 1순위)"
    },
    "Kore": {
        "gender": "female",
        "tone": "Warm, natural, clear, and empathetic",
        "best_for": ["lifestyle", "vlog", "shopping_review", "drama", "healing", "child", "teen"],
        "korean_desc": "따뜻하고 맑으며 전달력이 뛰어난 자연스러운 여성 목소리 (뷰티/쇼핑/어린이 여아 1순위)"
    },
    "Fenrir": {
        "gender": "male",
        "tone": "Intense, dramatic, powerful, and cinematic",
        "best_for": ["blockbuster", "trailer", "conspiracy", "scary_story", "sports", "villain"],
        "korean_desc": "강렬하고 비장하며 긴박감을 자아내는 영화 예고편 톤 (괴담/공포/블록버스터/빌런 1순위)"
    },
    "Aoede": {
        "gender": "female",
        "tone": "Calm, reflective, intellectual, and poetic",
        "best_for": ["philosophy", "essay", "meditation", "documentary", "audiobook", "mature", "elderly"],
        "korean_desc": "차분하고 지적이며 서정적인 고급 여성 나레이션 (철학/감성 다큐/중년/할머니 1순위)"
    }
}

# 10 Multi-Generational Age Demographic Profiles (Subdivided into Male/Female Pairs)
AGE_DEMOGRAPHIC_PROFILES: Dict[str, Dict[str, Any]] = {
    # 1. 영유아 (3~5세)
    "toddler_boy": {
        "label": "3~5세 영유아 남아 (어눌함/극강의 귀여움/호기심)",
        "age_tier": "toddler",
        "gender": "male",
        "voice_id": "Puck",
        "speed": 0.98,
        "pitch_shift": 7,  # +7 semitones for high toddler pitch
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 4세 귀여운 아기 남자아이] 혀가 아직 덜 풀려 발음이 살짝 어눌하고 새지만, 세상을 처음 마주한 듯 눈을 반짝이며 천진난만하게 조잘조잘 말하듯 연기하세요. 문장 끝을 작고 귀엽게 올리세요.",
        "pacing_hint": "단어를 한 음절씩 또박또박 더듬거리듯 천천히 발음하고 귀여운 감탄사(우와아!, 어?)를 살림"
    },
    "toddler_girl": {
        "label": "3~5세 영유아 여아 (앙증맞음/애교/사랑스러움)",
        "age_tier": "toddler",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 0.98,
        "pitch_shift": 7,  # +7 semitones
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 4세 앙증맞은 아기 여자아이] 작고 맑은 하이톤 목소리로 애교가 철철 넘치며, 곰인형에게 속삭이듯 부드럽고 둥글둥글하게 사랑스럽게 연기하세요.",
        "pacing_hint": "부드럽고 앙증맞은 숨소리와 아기 특유의 부드러운 리듬감 유지"
    },

    # 2. 어린이 / 초등 저학년 (6~9세)
    "child_boy": {
        "label": "6~9세 초등 저학년 남아 (천진난만/장난꾸러기/발랄)",
        "age_tier": "child",
        "gender": "male",
        "voice_id": "Puck",
        "speed": 1.05,
        "pitch_shift": 4,  # +4 semitones
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 7세 활발하고 장난기 많은 남자아이] 맑고 높은 고음으로, 호기심과 순수함이 가득 찬 천진난만한 아이의 억양으로 실감나게 연기하세요. 친구와 놀이터에서 뛰놀듯 생기발랄하게 문장 끝을 올리세요.",
        "pacing_hint": "짧은 감탄사(우와!, 에이~, 진짜?)를 살리고 빠른 템포로 순수한 리듬감 부여"
    },
    "child_girl": {
        "label": "6~9세 초등 저학년 여아 (또랑또랑/순수함/명랑)",
        "age_tier": "child",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 1.05,
        "pitch_shift": 5,  # +5 semitones
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 7세 또랑또랑하고 맑은 여자아이] 맑고 깨끗한 하이톤 목소리로, 동화책을 신나게 읽거나 엄마에게 자랑하듯 똑 부러지고 사랑스럽게 연기하세요.",
        "pacing_hint": "또랑또랑하고 선명한 딕션과 맑은 호흡 템포 유지"
    },

    # 3. 초등 고학년 / 중등 (10~14세)
    "early_teen_boy": {
        "label": "10~14세 소년 (변성기 직전/호기심/에너지)",
        "age_tier": "early_teen",
        "gender": "male",
        "voice_id": "Puck",
        "speed": 1.08,
        "pitch_shift": 2,  # +2 semitones
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 12세 모험심 가득한 소년] 아직 완전히 변성기가 오지 않은 맑은 소년의 목소리로, 게임이나 과학 미스터리에 푹 빠져 신나게 설명하듯 열정적으로 연기하세요.",
        "pacing_hint": "약간 빠른 비트감과 문장 끝의 활기찬 탄력성"
    },
    "early_teen_girl": {
        "label": "10~14세 소녀 (감수성/풋풋함/또래 대화)",
        "age_tier": "early_teen",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 1.08,
        "pitch_shift": 3,  # +3 semitones
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 13세 감수성 풍부한 사춘기 소녀] 친한 단짝 친구에게 비밀 이야기를 털어놓듯 솔직하고 반짝이는 눈빛으로 풋풋하게 연기하세요.",
        "pacing_hint": "자연스러운 말끝 떨림과 솔직한 대화체 억양"
    },

    # 4. 청소년 / 고등학생 (15~19세)
    "late_teen_boy": {
        "label": "15~19세 남학생 (쾌활함/트렌디/자연스러운 대화)",
        "age_tier": "late_teen",
        "gender": "male",
        "voice_id": "Puck",
        "speed": 1.12,
        "pitch_shift": 1,  # +1 semitone
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 18세 쾌활한 고등학생] 학교 쉬는 시간에 친구들과 수다 떨듯 거침없고 빠르며 위트 있는 청소년 톤으로 연기하세요.",
        "pacing_hint": "유행어 감각과 통통 튀는 빠른 비트감"
    },
    "late_teen_girl": {
        "label": "15~19세 여학생 (상큼함/Z세대 텐션/발랄함)",
        "age_tier": "late_teen",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 1.12,
        "pitch_shift": 2,  # +2 semitones
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 18세 발랄한 여고생] 트렌디한 Z세대 숏폼 감성으로 톡톡 튀고 생동감 넘치는 상큼한 톤으로 연기하세요.",
        "pacing_hint": "말끝을 톡 쏘듯 경쾌하게 처리하고 밝은 웃음기 머금기"
    },

    # 5. 20대 청년 / 크리에이터
    "young_adult_male": {
        "label": "20대 청년 남성 (세련됨/숏폼 크리에이터/에너지)",
        "age_tier": "young_adult",
        "gender": "male",
        "voice_id": "Puck",
        "speed": 1.14,
        "pitch_shift": 0,
        "emotion": "excited",
        "style_instruction": "[성우 연기 지침: 20대 전문 쇼츠 크리에이터] 자신감 넘치고 명확하며 에너제틱한 현대적 인플루언서 톤으로 시청자를 단숨에 몰입시키듯 연기하세요.",
        "pacing_hint": "공백 없이 속도감 있는 전환과 뚜렷한 액센트"
    },
    "young_adult_female": {
        "label": "20대 청년 여성 (트렌디/자연스러움/브이로그)",
        "age_tier": "young_adult",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 1.10,
        "pitch_shift": 0,
        "emotion": "happy",
        "style_instruction": "[성우 연기 지침: 20대 인기 뷰티/일상 브이로거] 귓가에 쏙쏙 박히는 감각적이고 트렌디한 발음으로 친근하게 말을 건네듯 연기하세요.",
        "pacing_hint": "산뜻하고 편안한 리듬감과 매끄러운 어조"
    },

    # 6. 30대 성인 / 전문직
    "adult_male": {
        "label": "30대 성인 남성 (스마트함/전문성/신뢰)",
        "age_tier": "adult",
        "gender": "male",
        "voice_id": "Charon",
        "speed": 1.06,
        "pitch_shift": 0,
        "emotion": "serious",
        "style_instruction": "[성우 연기 지침: 30대 스마트한 IT 전문가/애널리스트] 정확한 딕션과 정돈된 호흡으로 복잡한 지식을 명쾌하고 신뢰감 있게 설명하세요.",
        "pacing_hint": "명료한 자음 발음과 논리적 끊어읽기"
    },
    "adult_female": {
        "label": "30대 성인 여성 (프로페셔널/쇼호스트/안정감)",
        "age_tier": "adult",
        "gender": "female",
        "voice_id": "Kore",
        "speed": 1.06,
        "pitch_shift": 0,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 30대 베테랑 쇼호스트] 전달력 100%의 깔끔하고 지적인 발음으로 핵심을 정확히 짚어주는 프로페셔널한 어조로 연기하세요.",
        "pacing_hint": "안정적인 톤과 부드럽고 확신에 찬 어미 처리"
    },

    # 7. 40대 중년
    "middle_aged_male": {
        "label": "40대 중년 남성 (중후함/카리스마/심층 다큐)",
        "age_tier": "middle_aged",
        "gender": "male",
        "voice_id": "Charon",
        "speed": 1.02,
        "pitch_shift": -1,  # -1 semitone
        "emotion": "serious",
        "style_instruction": "[성우 연기 지침: 40대 중후하고 신뢰감 넘치는 중년 남성] 연륜과 무게감이 묻어나는 깊은 중저음으로, 묵직하고 단호하게 설득하듯 연기하세요.",
        "pacing_hint": "문장 사이 적절한 쉼표로 묵직한 권위 형성"
    },
    "middle_aged_female": {
        "label": "40대 중년 여성 (우아함/교양/단아함)",
        "age_tier": "middle_aged",
        "gender": "female",
        "voice_id": "Aoede",
        "speed": 1.02,
        "pitch_shift": 0,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 40대 우아하고 품격 있는 중년 여성] 차분하고 단아하며 깊은 모성애와 지성이 느껴지는 교양 다큐 톤으로 정갈하게 연기하세요.",
        "pacing_hint": "차분한 템포와 단아한 어조"
    },

    # 8. 50대 장년
    "mature_male": {
        "label": "50대 장년 남성 (깊은 울림/인생 연륜/권위)",
        "age_tier": "mature",
        "gender": "male",
        "voice_id": "Charon",
        "speed": 0.98,
        "pitch_shift": -2,  # -2 semitones
        "emotion": "serious",
        "style_instruction": "[성우 연기 지침: 50대 장년 리더/학자] 세상을 꿰뚫어 보는 혜안과 묵직한 카리스마가 담긴 깊은 울림으로 무게감 있게 전달하세요.",
        "pacing_hint": "단어 하나하나에 힘을 실어 천천히 눌러 발음"
    },
    "mature_female": {
        "label": "50대 장년 여성 (포용력/따스함/신뢰)",
        "age_tier": "mature",
        "gender": "female",
        "voice_id": "Aoede",
        "speed": 0.98,
        "pitch_shift": -1,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 50대 따뜻하고 지혜로운 원숙한 여성] 세상의 풍파를 겪고 품어주는 따스한 포용력과 진정성 있는 어조로 연기하세요.",
        "pacing_hint": "부드러운 호흡 휴지와 따스한 공감 톤"
    },

    # 9. 60~70대 시니어
    "senior_male": {
        "label": "60~70대 시니어 남성 (온화함/품격 있는 노신사)",
        "age_tier": "senior",
        "gender": "male",
        "voice_id": "Charon",
        "speed": 0.94,
        "pitch_shift": -2,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 70세 품격 있는 노신사] 은퇴 후 삶의 지혜를 온화하게 나누는 따뜻하고 여유로운 어조로 깊이 있게 낭독하세요.",
        "pacing_hint": "느긋하고 안정된 호흡과 편안한 쉼표 배치"
    },
    "senior_female": {
        "label": "60~70대 시니어 여성 (인자함/다정한 어머니)",
        "age_tier": "senior",
        "gender": "female",
        "voice_id": "Aoede",
        "speed": 0.92,
        "pitch_shift": -1,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 70세 자상하고 인자한 어머니] 자식과 손주를 바라보듯 무한한 애정과 인자함이 가득 담긴 다정한 어조로 연기하세요.",
        "pacing_hint": "부드럽게 말을 맺는 온화한 억양"
    },

    # 10. 80대 이상 초고령 노년
    "elderly_grandpa": {
        "label": "80대+ 할아버지 (거친 쇳소리/연륜/구수한 시골 옛날이야기)",
        "age_tier": "elderly",
        "gender": "male",
        "voice_id": "Charon",
        "speed": 0.88,
        "pitch_shift": -3,  # -3 semitones for deep hoarse elderly timbre
        "emotion": "dramatic",
        "style_instruction": "[성우 연기 지침: 80대 인자하고 연륜 넘치는 시골 할아버지] 숨이 약간 차고 목소리에 깊은 세월의 거친 울림과 쉰 소리가 자연스럽게 묻어나도록, 손주를 무릎에 앉히고 옛날 이야기를 구수하게 들려주듯 천천히 따뜻하게 연기하세요.",
        "pacing_hint": "말 끝을 길게 늘이고 가벼운 헛기침이나 한숨 같은 호흡 여백을 살림"
    },
    "elderly_grandma": {
        "label": "80대+ 할머니 (정겨움/포근한 온기/구수한 옛이야기)",
        "age_tier": "elderly",
        "gender": "female",
        "voice_id": "Aoede",
        "speed": 0.86,
        "pitch_shift": -2,
        "emotion": "normal",
        "style_instruction": "[성우 연기 지침: 80대 정겹고 따뜻한 시골 할머니] 손주를 바라보듯 다정하고 구수하며, 약간의 정겨운 떨림과 포근한 온기가 묻어나는 구수한 할머니 목소리로 연기하세요.",
        "pacing_hint": "정겨운 사투리 억양과 부드러운 호흡 휴지"
    }
}

# 16 Professional Roles Matrix
ROLE_PRESETS: Dict[str, Dict[str, Any]] = {
    "news_anchor": {
        "role_name": "9시 뉴스 앵커",
        "recommended_voice": "Charon",
        "speed": 1.05,
        "pitch_shift": 0,
        "emotion": "serious",
        "acting_note": "단호하고 정확하며 국민적 신뢰감을 주는 앵커 톤. 문장 끝을 확실히 맺고 명확한 딕션을 유지하세요."
    },
    "crime_profiler": {
        "role_name": "미스터리 범죄 프로파일러",
        "recommended_voice": "Charon",
        "speed": 1.00,
        "pitch_shift": -1,
        "emotion": "dramatic",
        "acting_note": "어둡고 서늘한 사건 현장을 분석하듯, 묵직하고 서스펜스 넘치는 긴장감 있는 어조로 연기하세요."
    },
    "horror_whisperer": {
        "role_name": "심야 공포 괴담 낭독자",
        "recommended_voice": "Fenrir",
        "speed": 0.95,
        "pitch_shift": -2,
        "emotion": "whisper",
        "acting_note": "오싹한 한기가 느껴지듯 낮게 깔리는 속삭임과 서늘한 공포감을 극대화하여 연기하세요."
    },
    "viral_creator": {
        "role_name": "텐션 200% 쇼츠 크리에이터",
        "recommended_voice": "Puck",
        "speed": 1.15,
        "pitch_shift": 0,
        "emotion": "excited",
        "acting_note": "첫 문장에서 시청자를 무조건 사로잡는 극강의 하이텐션과 폭발적인 리듬감으로 몰아치세요."
    },
    "teacher_mentor": {
        "role_name": "일타강사 / 친절한 멘토",
        "recommended_voice": "Kore",
        "speed": 1.08,
        "pitch_shift": 0,
        "emotion": "happy",
        "acting_note": "귀에 쏙쏙 박히는 발음과 핵심을 짚어주는 명쾌함으로 누구라도 이해하기 쉽게 설명하세요."
    },
    "doctor_specialist": {
        "role_name": "차분하고 전문적인 의사/전문의",
        "recommended_voice": "Charon",
        "speed": 1.00,
        "pitch_shift": 0,
        "emotion": "serious",
        "acting_note": "환자를 안심시키는 따뜻함과 의학적 권위가 공존하는 침착하고 신뢰도 높은 톤으로 연기하세요."
    },
    "dramatic_actor": {
        "role_name": "정통 드라마/영화 배우",
        "recommended_voice": "Fenrir",
        "speed": 1.02,
        "pitch_shift": 0,
        "emotion": "dramatic",
        "acting_note": "대사 속 숨겨진 갈등과 복합적인 감정선을 섬세하게 표현하는 깊이 있는 연기를 선보이세요."
    },
    "villain": {
        "role_name": "비열하고 냉소적인 다크 빌런",
        "recommended_voice": "Fenrir",
        "speed": 1.00,
        "pitch_shift": -2,
        "emotion": "sarcastic",
        "acting_note": "조소 섞인 웃음과 차가운 냉혹함이 묻어나는 비열하고 카리스마 넘치는 악당 톤으로 연기하세요."
    },
    "fairytale_storyteller": {
        "role_name": "상상력 넘치는 동화 구연가",
        "recommended_voice": "Kore",
        "speed": 1.02,
        "pitch_shift": 3,
        "emotion": "happy",
        "acting_note": "아이들의 눈높이에 맞춘 다채로운 음조와 풍부한 표정이 느껴지는 따뜻한 동화 구연 톤으로 연기하세요."
    },
    "folklore_elder": {
        "role_name": "구수한 옛날이야기 구술자",
        "recommended_voice": "Aoede",
        "speed": 0.88,
        "pitch_shift": -1,
        "emotion": "normal",
        "acting_note": "호랑이 담배 피우던 시절 이야기를 들려주듯 구수하고 푸근한 시골 정서로 연기하세요."
    },
    "shopping_host": {
        "role_name": "완판 신화 라이브 쇼호스트",
        "recommended_voice": "Kore",
        "speed": 1.12,
        "pitch_shift": 1,
        "emotion": "excited",
        "acting_note": "절대 놓칠 수 없는 혜택을 솔직하고 설레는 톤으로 어필하는 설득력 만점의 쇼호스트 톤."
    },
    "philosopher_dj": {
        "role_name": "심야 감성 라디오 DJ",
        "recommended_voice": "Aoede",
        "speed": 0.98,
        "pitch_shift": 0,
        "emotion": "normal",
        "acting_note": "지친 하루를 위로하는 따뜻한 차 한 잔 같은 감미롭고 지적인 심야 라디오 감성으로 낭독하세요."
    },
    "teen_student": {
        "role_name": "솔직발랄 10대 학생",
        "recommended_voice": "Puck",
        "speed": 1.12,
        "pitch_shift": 1,
        "emotion": "excited",
        "acting_note": "거짓 없이 솔직하고 통통 튀는 10대의 억양과 생생한 에너지로 대화하듯 전달하세요."
    },
    "comedy_meme": {
        "role_name": "초특급 밈 / 코미디 더빙",
        "recommended_voice": "Puck",
        "speed": 1.18,
        "pitch_shift": 2,
        "emotion": "excited",
        "acting_note": "과장된 리액션과 익살스러운 억양으로 폭소를 자아내는 코미디 밈 특화 더빙 연기."
    },
    "calm_healer": {
        "role_name": "마음 치유 / 명상 가이드",
        "recommended_voice": "Aoede",
        "speed": 0.90,
        "pitch_shift": 0,
        "emotion": "normal",
        "acting_note": "깊은 들숨과 날숨을 유도하는 편안하고 고요한 톤으로 영혼을 정화하듯 연기하세요."
    },
    "epic_trailer": {
        "role_name": "블록버스터 영화 예고편",
        "recommended_voice": "Fenrir",
        "speed": 1.04,
        "pitch_shift": -1,
        "emotion": "dramatic",
        "acting_note": "거대한 스케일의 서사와 숨 막히는 긴박감을 웅장한 목소리로 전달하는 예고편 나레이션."
    }
}

# 10 Emotional Moods Matrix
MOOD_PRESETS: Dict[str, Dict[str, Any]] = {
    "urgent": {
        "label": "긴박 / 위기 / 긴급상황",
        "speed_factor": 1.10,
        "instruction": "1초가 다급한 절체절명의 위기 상황처럼 숨 가쁘고 긴박하게 전달하세요."
    },
    "suspense": {
        "label": "서스펜스 / 추리 / 의혹",
        "speed_factor": 0.98,
        "instruction": "숨겨진 진실을 파헤치듯 낮고 팽팽한 긴장감을 유지하며 서스펜스를 조성하세요."
    },
    "excited": {
        "label": "열광 / 텐션폭발 / 흥분",
        "speed_factor": 1.14,
        "instruction": "도파민이 폭발하듯 매우 신나고 짜릿한 열광의 톤으로 연기하세요."
    },
    "calm": {
        "label": "차분 / 사색 / 평온",
        "speed_factor": 0.96,
        "instruction": "물결 하나 없는 고요한 호수처럼 평온하고 깊은 사색의 여운을 남기세요."
    },
    "fear": {
        "label": "공포 / 전율 / 오싹함",
        "speed_factor": 0.94,
        "instruction": "등골이 서늘해지는 극한의 공포와 전율을 속삭이듯 전달하세요."
    },
    "sad": {
        "label": "애절 / 슬픔 / 감동",
        "speed_factor": 0.92,
        "instruction": "목이 메어오듯 깊은 슬픔과 가슴 뭉클한 감동을 실어 애절하게 연기하세요."
    },
    "confident": {
        "label": "당당함 / 확신 / 설득",
        "speed_factor": 1.05,
        "instruction": "단 하나의 의심도 허용하지 않는 강력한 확신과 당당함으로 설득하세요."
    },
    "playful": {
        "label": "장난기 / 유쾌 / 익살",
        "speed_factor": 1.10,
        "instruction": "눈웃음을 치듯 장난기 넘치고 통통 튀는 유쾌한 에너지로 연기하세요."
    },
    "warm": {
        "label": "따스함 / 포근 / 위로",
        "speed_factor": 0.95,
        "instruction": "따뜻한 이불처럼 온몸을 감싸주는 다정하고 포근한 위로의 어조로 연기하세요."
    },
    "heroic": {
        "label": "비장 / 웅장 / 결의",
        "speed_factor": 1.02,
        "instruction": "거대한 운명에 맞서는 영웅처럼 비장하고 웅장한 결의를 담아 연기하세요."
    }
}

# Legacy Genre Presets
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


class GeminiTTSOptimizer:
    """
    Intelligent Voice Director & Pacing Optimizer for Gemini 3.8 Flash TTS.
    """

    @staticmethod
    def get_age_persona_settings(age_group: str) -> Dict[str, Any]:
        """
        Resolves specific age demographic settings (toddler, child, teen, adult, elderly).
        """
        clean_key = age_group.lower().strip().replace(" ", "_").replace("-", "_")
        profile = AGE_DEMOGRAPHIC_PROFILES.get(clean_key)
        if not profile:
            # Fuzzy matching
            for k, p in AGE_DEMOGRAPHIC_PROFILES.items():
                if clean_key in k or k in clean_key:
                    profile = p
                    break
        if not profile:
            # Default to young adult
            profile = AGE_DEMOGRAPHIC_PROFILES["young_adult_male"]

        voice_meta = GEMINI_VOICES.get(profile["voice_id"], {})
        return {
            "success": True,
            "age_group": clean_key,
            "age_tier": profile.get("age_tier", "young_adult"),
            "gender": profile.get("gender", "male"),
            "label": profile["label"],
            "voice_id": profile["voice_id"],
            "voice_name_ko": voice_meta.get("korean_desc", profile["voice_id"]),
            "speed": profile["speed"],
            "pitch_shift": profile.get("pitch_shift", 0),
            "emotion": profile["emotion"],
            "style_instruction": profile["style_instruction"],
            "pacing_hint": profile["pacing_hint"]
        }

    @staticmethod
    def get_role_settings(role_key: str) -> Dict[str, Any]:
        """Resolves role-specific configuration."""
        clean_key = role_key.lower().strip().replace(" ", "_")
        preset = ROLE_PRESETS.get(clean_key)
        if not preset:
            for k, p in ROLE_PRESETS.items():
                if clean_key in k or k in clean_key:
                    preset = p
                    break
        if not preset:
            preset = ROLE_PRESETS["viral_creator"]
        return preset

    @staticmethod
    def get_mood_settings(mood_key: str) -> Dict[str, Any]:
        """Resolves emotional mood configuration."""
        clean_key = mood_key.lower().strip().replace(" ", "_")
        preset = MOOD_PRESETS.get(clean_key)
        if not preset:
            for k, p in MOOD_PRESETS.items():
                if clean_key in k or k in clean_key:
                    preset = p
                    break
        if not preset:
            preset = MOOD_PRESETS["excited"]
        return preset

    @classmethod
    def auto_direct_script_voice(
        cls,
        script: str,
        role: Optional[str] = None,
        age_group: Optional[str] = None,
        gender: Optional[str] = None,
        mood: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Deep script analysis & auto-direction engine.
        Automatically resolves age demographic, gender, professional role, emotional mood,
        and produces the exact Gemini 3.8 voice ID, pitch shift, speed, and acting instructions.
        """
        text = script.strip()
        
        # 1. Intent / Context Detection from script keywords
        detected_role = role
        detected_age = age_group
        detected_gender = gender
        detected_mood = mood

        # Auto-detect role if unspecified
        if not detected_role:
            if any(k in text for k in ["앵커", "보도국", "속보입니다", "취재했습니다", "뉴스입니다", "폭우", "전면 통제", "차량 통행", "기록적"]):
                detected_role = "news_anchor"
            elif any(k in text for k in ["살인", "용의자", "형사", "미스터리", "사건 현장", "CCTV", "그날 밤", "의문의 남자", "의문의", "도망쳤을까요"]):
                detected_role = "crime_profiler"
            elif any(k in text for k in ["귀신", "괴담", "오싹", "소름", "심야", "공포"]):
                detected_role = "horror_whisperer"
            elif any(k in text for k in ["인생네컷", "시험 끝나고", "손 들어봐", "야 진짜 대박", "체육대회", "교복"]):
                detected_role = "teen_student"
            elif any(k in text for k in ["구독과 좋아요", "댓글", "이거 모르면", "대박", "1초", "꿀팁"]):
                detected_role = "viral_creator"
            elif any(k in text for k in ["옛날 옛적", "호랑이", "시골", "우리 손주", "할애비", "할미", "에헴"]):
                detected_role = "folklore_elder"
            elif any(k in text for k in ["동화", "숲속", "토끼", "공주님", "마법"]):
                detected_role = "fairytale_storyteller"
            elif any(k in text for k in ["원플러스원", "할인", "매진", "주문 폭주", "최저가"]):
                detected_role = "shopping_host"
            elif any(k in text for k in ["인생", "위로", "사색", "마음", "라디오"]):
                detected_role = "philosopher_dj"
            elif any(k in text for k in ["선생님", "수능", "개념", "암기"]):
                detected_role = "teacher_mentor"
            else:
                detected_role = "viral_creator"

        # Auto-detect age if unspecified
        if not detected_age:
            if any(k in text for k in ["응애", "맘마", "까꿍", "쪼꼬미", "장난감 죠아"]):
                detected_age = "toddler_boy" if detected_gender == "male" else "toddler_girl"
            elif any(k in text for k in ["엄마!", "아빠!", "숙제", "초등학교", "놀이터", "공룡 뼈"]):
                detected_age = "child_boy" if detected_gender == "male" else "child_girl"
            elif any(k in text for k in ["에헴", "할애비", "할배", "할아버지", "살았단다", "보거라"]):
                detected_age = "elderly_grandpa"
            elif any(k in text for k in ["우리 손주", "할미", "할머니", "칠십 평생", "팔십 평생"]):
                detected_age = "elderly_grandma"
            elif any(k in text for k in ["인생네컷", "시험 끝나고", "손 들어봐", "교복", "급식", "시험기간", "독서실"]):
                detected_age = "late_teen_girl" if detected_gender != "male" else "late_teen_boy"
            elif any(k in text for k in ["중년", "부장", "세월", "연륜", "폭우", "기록적인", "전면 통제"]):
                detected_age = "adult_male" if detected_gender != "female" else "adult_female"
            else:
                detected_age = "young_adult_male" if detected_gender != "female" else "young_adult_female"

        # Auto-detect mood if unspecified
        if not detected_mood:
            if any(k in text for k in ["왜일까요", "의문", "비밀", "흔적", "도망쳤을까요", "그날 밤", "인적이 끊긴"]):
                detected_mood = "suspense"
            elif any(k in text for k in ["기록적인", "폭우", "전면 통제", "당장", "빨리", "긴급", "경보", "충격"]):
                detected_mood = "urgent"
            elif any(k in text for k in ["옛날 옛적", "호랑이", "에헴", "우리 손주", "살았단다"]):
                detected_mood = "calm"
            elif any(k in text for k in ["눈물", "슬픔", "가슴이 아프", "그리움"]):
                detected_mood = "sad"
            elif any(k in text for k in ["와", "대박", "신난다", "최고", "인생네컷", "손 들어봐"]):
                detected_mood = "excited"
            elif any(k in text for k in ["위로", "따뜻", "행복", "포근"]):
                detected_mood = "warm"
            else:
                detected_mood = "excited"

        # Resolve components
        age_settings = cls.get_age_persona_settings(detected_age)
        role_settings = cls.get_role_settings(detected_role)
        mood_settings = cls.get_mood_settings(detected_mood)

        # Decide voice: if role specifies strong character voice (e.g. Fenrir for horror/villain), prioritize role, else age voice
        if detected_role in ["horror_whisperer", "villain", "epic_trailer"]:
            chosen_voice = role_settings["recommended_voice"]
        elif detected_role in ["news_anchor", "crime_profiler", "doctor_specialist"]:
            chosen_voice = "Charon" if age_settings["gender"] == "male" else "Aoede"
        else:
            chosen_voice = age_settings["voice_id"]

        # Calculate final combined speed & pitch
        base_speed = age_settings["speed"]
        mood_speed_factor = mood_settings.get("speed_factor", 1.0)
        final_speed = round(base_speed * mood_speed_factor, 2)
        # Clamp speed between 0.85 and 1.25
        final_speed = max(0.85, min(1.25, final_speed))

        final_pitch = age_settings["pitch_shift"] + role_settings.get("pitch_shift", 0)
        # Clamp pitch shift between -4 and +8 semitones
        final_pitch = max(-4, min(8, final_pitch))

        # Build composite, directorial acting prompt for Gemini 3.8 Flash TTS
        acting_components = [
            f"[배역: {role_settings['role_name']}] {role_settings['acting_note']}",
            f"[연령/성별: {age_settings['label']}] {age_settings['style_instruction']}",
            f"[감정/상황 분위기: {mood_settings['label']}] {mood_settings['instruction']}"
        ]
        composite_instruction = "\n".join(acting_components)

        voice_meta = GEMINI_VOICES.get(chosen_voice, {})

        return {
            "success": True,
            "detected_analysis": {
                "role": detected_role,
                "role_name": role_settings["role_name"],
                "age_group": detected_age,
                "age_label": age_settings["label"],
                "gender": age_settings["gender"],
                "mood": detected_mood,
                "mood_label": mood_settings["label"]
            },
            "voice_configuration": {
                "voice_id": chosen_voice,
                "voice_name_ko": voice_meta.get("korean_desc", chosen_voice),
                "speed": final_speed,
                "pitch_shift": final_pitch,
                "emotion": age_settings["emotion"],
                "style_instruction": composite_instruction,
                "pacing_hint": age_settings["pacing_hint"]
            },
            "script_optimized": cls.format_script_for_tts(text)
        }

    @classmethod
    def get_optimal_settings(cls, genre: str = "shorts_viral_hook", age_group: Optional[str] = None) -> Dict[str, Any]:
        """
        Returns optimal settings for genre and optional age group.
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

        # Normalize numbers and units for seamless speech
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

        lines = [line.strip() for line in text.split("\n") if line.strip()]
        return "\n".join(lines)

    @staticmethod
    def get_full_optimization_guide() -> Dict[str, Any]:
        """Returns complete directory of voices, age demographics, roles, and prompt rules."""
        return {
            "voices": GEMINI_VOICES,
            "age_demographics": AGE_DEMOGRAPHIC_PROFILES,
            "roles": ROLE_PRESETS,
            "moods": MOOD_PRESETS,
            "genres": GENRE_PRESETS,
            "golden_script_rules": [
                "1. 문장은 20자 내외로 끊어 쉼표(,)를 배치할 때 가장 자연스러운 호흡이 들어갑니다.",
                "2. 영단어나 축약어(AI, 4K, 100%)는 한글 발음(에이아이, 포케이, 백프로)으로 적으면 오독률 0%가 됩니다.",
                "3. 쇼츠는 1.08x ~ 1.15x 배속이 시청자 이탈을 막는 골든 스피드입니다.",
                "4. 클라이맥스 문장 앞에는 느낌표(!)를 두고 한 줄 띄우면 폭발적인 감정 톤이 발현됩니다.",
                "5. 유아/어린이 연출 시 +4~+7 반음 피치 시프트, 고령 노년 연출 시 -2~-4 반음 피치 시프트가 사람 성대의 물리적 한계를 정밀 재현합니다."
            ]
        }

    @classmethod
    def get_full_guide(cls) -> Dict[str, Any]:
        return cls.get_full_optimization_guide()

    @classmethod
    def optimize_script(cls, raw_text: str, genre: str = "shorts_viral_hook") -> str:
        return cls.format_script_for_tts(raw_text, genre)


gemini_tts_optimizer = GeminiTTSOptimizer()
