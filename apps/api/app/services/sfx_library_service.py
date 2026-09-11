"""
쇼츠 전문 6대 카테고리 36종 바이럴 SFX(효과음) 라이브러리 및 AI 지능형 자동 매핑 엔진
(Shorts Viral 36-SFX Sound Effects Matrix and Auto-Trigger Engine)
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# 6대 카테고리 36종 SFX 정의
SFX_CATALOG: List[Dict[str, Any]] = [
    # 1. 💥 임팩트 & 후킹 (Impact/Hook)
    {
        "id": "impact_cinematic_boom",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "시네마틱 붐 (Cinematic Boom)",
        "duration_ms": 1200,
        "recommended_trigger": "hook_intro",
        "trigger_keywords": ["충격", "경악", "드디어", "최초 공개", "실제 상황", "결국"],
        "description": "묵직한 저음으로 첫 3초 시선 강탈 시 강력 추천",
        "default_volume": 0.85
    },
    {
        "id": "impact_heavy_bass_drop",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "헤비 베이스 드롭 (Bass Drop)",
        "duration_ms": 1500,
        "recommended_trigger": "climax",
        "trigger_keywords": ["폭발", "대참사", "박살", "무너진", "끝장"],
        "description": "클라이맥스나 사건의 전말 폭로 시 압도감 형성",
        "default_volume": 0.90
    },
    {
        "id": "impact_sub_thud",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "서브 서든 쿵 (Sub Thud)",
        "duration_ms": 800,
        "recommended_trigger": "jab_popup",
        "trigger_keywords": ["퍽", "쿵", "직격탄", "정면 충돌"],
        "description": "짧고 굵게 명치를 때리는 서브 베이스 타격음",
        "default_volume": 0.80
    },
    {
        "id": "impact_dramatic_hit",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "드라마틱 오케스트라 히트 (Hit)",
        "duration_ms": 950,
        "recommended_trigger": "statement",
        "trigger_keywords": ["진실은", "그것은 바로", "범인은", "정체"],
        "description": "비밀이나 반전이 밝혀지는 순간 오케스트라 히트",
        "default_volume": 0.75
    },
    {
        "id": "impact_lightning_strike",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "벼락 번개 (Lightning)",
        "duration_ms": 1100,
        "recommended_trigger": "shock",
        "trigger_keywords": ["마른 하늘", "날벼락", "충격적인", "경악"],
        "description": "예상치 못한 날벼락 같은 사건 발생 시",
        "default_volume": 0.85
    },
    {
        "id": "impact_punch_thump",
        "category": "impact",
        "category_name": "💥 임팩트 & 후킹",
        "name": "펀치 타격음 (Punch Thump)",
        "duration_ms": 400,
        "recommended_trigger": "fast_jab",
        "trigger_keywords": ["철벽", "철통", "방어", "차단", "막아서"],
        "description": "쨉쨉이 자막이 팍 튀어나올 때 찰진 타격음",
        "default_volume": 0.80
    },

    # 2. 💨 속도감 & 전환 (Whoosh/Whip)
    {
        "id": "whoosh_fast_air",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "에어 쉭 (Air Whoosh)",
        "duration_ms": 350,
        "recommended_trigger": "subtitle_bounce",
        "trigger_keywords": ["질주", "스피드", "달려", "순식간에", "빠르게"],
        "description": "자막이 바운스되며 등장할 때 쇼츠 기본 바람 소리",
        "default_volume": 0.70
    },
    {
        "id": "whoosh_whip_swish",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "채찍 휙 (Whip Swish)",
        "duration_ms": 300,
        "recommended_trigger": "transition",
        "trigger_keywords": ["휙", "전환", "하지만", "그런데", "반면에"],
        "description": "화면이 빠르게 넘어가거나 화제가 바뀔 때",
        "default_volume": 0.75
    },
    {
        "id": "whoosh_digital_glitch",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "디지털 글리치 (Digital Glitch)",
        "duration_ms": 500,
        "recommended_trigger": "twist",
        "trigger_keywords": ["오류", "버그", "이상 현상", "조작", "의문"],
        "description": "화면이 지지직거리며 의문을 제기할 때",
        "default_volume": 0.65
    },
    {
        "id": "whoosh_tape_rewind",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "테이프 되감기 (Tape Rewind)",
        "duration_ms": 900,
        "recommended_trigger": "flashback",
        "trigger_keywords": ["과거로", "알고 보니", "몇 시간 전", "다시 보면"],
        "description": "과거 회상이나 원본 영상을 되짚어볼 때",
        "default_volume": 0.70
    },
    {
        "id": "whoosh_laser_zoom",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "레이저 줌 (Laser Zoom)",
        "duration_ms": 450,
        "recommended_trigger": "punch_zoom",
        "trigger_keywords": ["포착", "확대", "발견", "눈빛"],
        "description": "인물 얼굴로 펀치 줌인할 때 첨단 느낌의 사운드",
        "default_volume": 0.65
    },
    {
        "id": "whoosh_swoosh_heavy",
        "category": "whoosh",
        "category_name": "💨 속도감 & 전환",
        "name": "헤비 스우시 (Heavy Swoosh)",
        "duration_ms": 600,
        "recommended_trigger": "scene_change",
        "trigger_keywords": ["다음 장면", "그 결과", "이후"],
        "description": "묵직하게 장면 전체가 슬라이드될 때",
        "default_volume": 0.75
    },

    # 3. 🤣 코믹 & 반전 (Humor/Twist)
    {
        "id": "humor_cartoon_boing",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "만화 띠용 (Cartoon Boing)",
        "duration_ms": 450,
        "recommended_trigger": "fail",
        "trigger_keywords": ["띠용", "어라", "실패", "당황", "어이없네"],
        "description": "황당한 실수나 어이없는 표정이 잡힐 때",
        "default_volume": 0.80
    },
    {
        "id": "humor_record_scratch",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "레코드 스크래치 (Record Scratch)",
        "duration_ms": 700,
        "recommended_trigger": "pause_moment",
        "trigger_keywords": ["잠깐만", "스톱", "멈춰", "이게 맞나", "실화냐"],
        "description": "음악이 뚝 끊기며 싸해지는 정적 유머 연출",
        "default_volume": 0.85
    },
    {
        "id": "humor_awkward_cricket",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "싸늘한 귀뚜라미 (Cricket)",
        "duration_ms": 1200,
        "recommended_trigger": "silence",
        "trigger_keywords": ["싸늘", "정적", "아무도", "개썰렁"],
        "description": "아무 반응이 없어 민망한 순간의 백미",
        "default_volume": 0.60
    },
    {
        "id": "humor_slap_face",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "찰진 따귀 뺨 (Slap)",
        "duration_ms": 250,
        "recommended_trigger": "reality_check",
        "trigger_keywords": ["팩폭", "참교육", "정신 차려", "때치"],
        "description": "팩트 폭격이나 참교육 멘트가 터질 때",
        "default_volume": 0.85
    },
    {
        "id": "humor_laugh_track",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "예능 방청객 웃음 (Laugh Track)",
        "duration_ms": 1400,
        "recommended_trigger": "funny_punchline",
        "trigger_keywords": ["빵 터짐", "ㅋㅋㅋ", "웃음 참기", "대폭소"],
        "description": "예능 하이라이트 웃음 유발 구간",
        "default_volume": 0.70
    },
    {
        "id": "humor_squeak_toy",
        "category": "humor",
        "category_name": "🤣 코믹 & 반전",
        "name": "삑삑이 고무인형 (Squeak)",
        "duration_ms": 300,
        "recommended_trigger": "cute_moment",
        "trigger_keywords": ["귀여워", "댕댕이", "냥이", "뽀짝"],
        "description": "귀여운 행동이나 아기/반려동물 쇼츠에 제격",
        "default_volume": 0.70
    },

    # 4. 💰 돈 & 성과 (Money/Success)
    {
        "id": "money_cash_register",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "금전등록기 카칭 (Cha-Ching)",
        "duration_ms": 900,
        "recommended_trigger": "wealth",
        "trigger_keywords": ["돈", "매출", "수익", "억", "부자", "대박", "수입"],
        "description": "금액이나 성공 지표가 화면에 뜰 때 필수",
        "default_volume": 0.85
    },
    {
        "id": "money_coin_drop",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "동전 짤랑 (Coin Drop)",
        "duration_ms": 650,
        "recommended_trigger": "number",
        "trigger_keywords": ["비용", "할인", "가성비", "현금", "포인트"],
        "description": "금전 관련 꿀팁이나 절약 내용 설명 시",
        "default_volume": 0.75
    },
    {
        "id": "money_level_up",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "게임 레벨업 팡파레 (Level Up)",
        "duration_ms": 1100,
        "recommended_trigger": "achievement",
        "trigger_keywords": ["성공", "달성", "1위", "최고", "인정"],
        "description": "목표 달성이나 대기록 수립 시",
        "default_volume": 0.80
    },
    {
        "id": "money_sparkle_chime",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "샤방샤방 챠임 (Sparkle)",
        "duration_ms": 950,
        "recommended_trigger": "glow",
        "trigger_keywords": ["미모", "비주얼", "빛나는", "황금", "다이아"],
        "description": "연예인 비주얼이나 명품, 화려함 강조 시",
        "default_volume": 0.70
    },
    {
        "id": "money_slot_machine",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "슬롯머신 잭팟 (Jackpot)",
        "duration_ms": 1300,
        "recommended_trigger": "jackpot",
        "trigger_keywords": ["당첨", "로또", "대박 사건", "행운"],
        "description": "인생 역전이나 극적인 행운 강조 시",
        "default_volume": 0.85
    },
    {
        "id": "money_winner_bell",
        "category": "money",
        "category_name": "💰 돈 & 성과",
        "name": "승리의 종 (Winner Bell)",
        "duration_ms": 800,
        "recommended_trigger": "victory",
        "trigger_keywords": ["승리", "우승", "완벽", "합격"],
        "description": "승부 결과나 대결 쇼츠의 승자 발표 시",
        "default_volume": 0.80
    },

    # 5. 🔔 정보 & 알림 (Alert/Ping)
    {
        "id": "alert_iphone_ping",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "스마트폰 핑 (Message Ping)",
        "duration_ms": 400,
        "recommended_trigger": "tip",
        "trigger_keywords": ["꿀팁", "주의", "참고", "알림", "핵심"],
        "description": "정보성 쇼츠에서 꿀팁 텍스트가 뜰 때",
        "default_volume": 0.70
    },
    {
        "id": "alert_camera_shutter",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "카메라 찰칵 (Shutter Click)",
        "duration_ms": 500,
        "recommended_trigger": "snapshot",
        "trigger_keywords": ["캡처", "사진", "증거", "인증", "목격"],
        "description": "사진 증거 자료나 캡처본이 화면에 뜰 때",
        "default_volume": 0.80
    },
    {
        "id": "alert_glass_ding",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "맑은 글래스 띵 (Glass Ding)",
        "duration_ms": 600,
        "recommended_trigger": "notice",
        "trigger_keywords": ["첫째", "둘째", "셋째", "체크", "질문"],
        "description": "목록을 나열하거나 순번을 매길 때",
        "default_volume": 0.75
    },
    {
        "id": "alert_bubble_pop",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "통통 버블 팝 (Bubble Pop)",
        "duration_ms": 250,
        "recommended_trigger": "bullet_point",
        "trigger_keywords": ["뿅", "바로", "이거"],
        "description": "경쾌하고 가볍게 아이콘이나 단어가 뜰 때",
        "default_volume": 0.70
    },
    {
        "id": "alert_computer_beep",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "컴퓨터 비프 (Data Beep)",
        "duration_ms": 350,
        "recommended_trigger": "stat",
        "trigger_keywords": ["통계", "데이터", "분석", "연구", "수치"],
        "description": "숫자 그래프나 과학적 사실 설명 시",
        "default_volume": 0.65
    },
    {
        "id": "alert_doorbell",
        "category": "alert",
        "category_name": "🔔 정보 & 알림",
        "name": "초인종 딩동 (Doorbell)",
        "duration_ms": 850,
        "recommended_trigger": "arrival",
        "trigger_keywords": ["도착", "등장", "방문", "손님"],
        "description": "새로운 인물이나 게스트가 나타날 때",
        "default_volume": 0.75
    },

    # 6. ⏳ 긴장 & 서스펜스 (Suspense/Ticking)
    {
        "id": "suspense_heartbeat",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "심장 쿵쾅 (Heartbeat Pulse)",
        "duration_ms": 1400,
        "recommended_trigger": "nervous",
        "trigger_keywords": ["두근", "긴장", "일촉즉발", "위기", "숨멎"],
        "description": "결과를 기다리는 극도의 긴장감 형성",
        "default_volume": 0.85
    },
    {
        "id": "suspense_clock_tick",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "초침 째깍째깍 (Clock Ticking)",
        "duration_ms": 1200,
        "recommended_trigger": "countdown",
        "trigger_keywords": ["3초", "시간", "카운트다운", "마감", "촉박"],
        "description": "호기심을 유발하며 3초 후 공개 카운트다운",
        "default_volume": 0.75
    },
    {
        "id": "suspense_dark_drone",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "다크 서스펜스 드론 (Dark Drone)",
        "duration_ms": 2000,
        "recommended_trigger": "mystery",
        "trigger_keywords": ["괴담", "미스터리", "기이한", "공포", "음모"],
        "description": "야담이나 미스터리 채널의 분위기를 으스스하게 잡을 때",
        "default_volume": 0.70
    },
    {
        "id": "suspense_violin_screech",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "바이올린 비명 스크리치 (Screech)",
        "duration_ms": 900,
        "recommended_trigger": "jumpscare",
        "trigger_keywords": ["섬뜩", "소름", "깜짝", "기겁"],
        "description": "순간적으로 소름 돋는 순간 연출",
        "default_volume": 0.80
    },
    {
        "id": "suspense_riser_tension",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "텐션 라이저 (Tension Riser)",
        "duration_ms": 1800,
        "recommended_trigger": "buildup",
        "trigger_keywords": ["점점", "과연", "어떻게 될까", "결과는"],
        "description": "하이라이트 직전 소리가 점점 커지며 몰입감 폭발",
        "default_volume": 0.80
    },
    {
        "id": "suspense_sonar_ping",
        "category": "suspense",
        "category_name": "⏳ 긴장 & 서스펜스",
        "name": "심해 소나 핑 (Sonar Ping)",
        "duration_ms": 1100,
        "recommended_trigger": "deep_search",
        "trigger_keywords": ["추적", "탐색", "깊은", "비밀리"],
        "description": "추적 조사, 탐정 추리 쇼츠의 시그니처 핑 사운드",
        "default_volume": 0.70
    }
]

class SFXLibraryService:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def list_sfx(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """SFX 목록 반환 (카테고리 필터링 지원)"""
        if category and category != "all":
            return [s for s in SFX_CATALOG if s["category"] == category]
        return SFX_CATALOG

    def get_sfx_by_id(self, sfx_id: str) -> Optional[Dict[str, Any]]:
        for s in SFX_CATALOG:
            if s["id"] == sfx_id:
                return s
        return None

    def auto_match_sfx_for_text(self, text: str, placement_type: str = "subtitle") -> Optional[Dict[str, Any]]:
        """대본 문장이나 쨉쨉이 텍스트에 가장 어울리는 SFX를 AI 키워드 규칙으로 자동 매칭"""
        text_lower = text.lower()
        
        # 1. 특정 키워드 우선 매칭
        for sfx in SFX_CATALOG:
            for kw in sfx["trigger_keywords"]:
                if kw in text_lower:
                    return sfx

        # 2. 배치 타입별 폴백 기본 SFX
        if placement_type == "hook_intro":
            return self.get_sfx_by_id("impact_cinematic_boom")
        elif placement_type == "jab_popup":
            return self.get_sfx_by_id("whoosh_fast_air")
        elif placement_type == "subtitle_bounce":
            return self.get_sfx_by_id("whoosh_fast_air")
        elif placement_type == "transition":
            return self.get_sfx_by_id("whoosh_whip_swish")
        
        return self.get_sfx_by_id("whoosh_fast_air")
