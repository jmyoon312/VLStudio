import os
import sys
import json
import sqlite3

sys.stdout.reconfigure(encoding='utf-8')

db_path = os.path.expandvars(r"%LOCALAPPDATA%\ViraLoop Studio\viral_loop.db")
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 1. Update channel_dna_benchmarks (id=4) with REAL data
visual_dna = {
    "canvas_type": "LETTERBOX_SOLID",
    "video_fit_mode": "sandwich",
    "aspect_ratio": "9:16",
    "top_bar": {
        "height_percent": 18.5,
        "bg_color": "#000000",
        "has_top_title": True,
        "title_lines": 1,
        "color": "#FFFFFF",
        "font_family": "Pretendard Bold",
        "example_title": "남편 전용 커피잔 ㅋㅋㅋ"
    },
    "subtitle": {
        "y_percent": 70.0,
        "color": "#FFFFFF",
        "stroke_color": "#000000",
        "stroke_width": 5,
        "font_family": "Pretendard ExtraBold",
        "motion_preset": "pop_in"
    },
    "ending_laughter_mark": "ㅋㅋㅋ",
    "frame_rate": 30
}

script_dna = {
    "genre": "현실 일상 공감 코미디 / 부부·가족 시트콤 / 바이럴 밈",
    "avg_duration_sec": 16.5,
    "duration_range": "12s ~ 21s (초압축 도파민)",
    "story_architecture": [
        "0~2초: 즉각적 상황 돌입 (무인트로/상단 제목으로 상황 100% 인지)",
        "3~10초: 이상 징후 및 텐션 빌드업 (인물의 리얼한 표정/행동)",
        "11~16초: 빵 터지는 반전 클라이맥스 + 체념/폭소 표정 킬포인트 + ㅋㅋㅋ"
    ],
    "title_formula": "[대상/인물] + [상황/행동] + [ㅋㅋㅋ / ㄷㄷ / 클라스 / 벌어지는 일]",
    "description_template": "[상황 요약 1줄] ㅋㅋㅋ + [킬포인트 명시] + [#부부일상 #육아공감 #유머 #쇼츠]",
    "target_audience": "2040 남녀, 기혼 부부, 직장인 킬링타임 유머족"
}

audio_dna = {
    "audio_type": "현장 생생 육성/원음(Ambient) + 상황별 경쾌한 BGM + 리액션 SFX",
    "mean_volume_db": -16.5,
    "max_volume_db": -0.1,
    "has_narration": False,
    "bgm_style": "경쾌한 피치카토/플럭/코믹 펑크",
    "laughter_sfx_timing": "클라이맥스 반전 직후 (12~14초)"
}

source_origin_dna = {
    "primary_platforms": ["TikTok (글로벌 바이럴 유머)", "Instagram Reels", "Reddit (r/funny, r/MadeMeSmile)", "Douyin"],
    "curation_strategy": "해외 100만+ 바이럴 영상 발굴 -> 한국어 상황극 헤더(18% 상단바) 및 직관적 자막 번역/현지화 재가공",
    "discovered_source_keywords": [
        "funny couple moments",
        "husband wife humor fail",
        "cute daughter dad moments",
        "unexpected plot twist funny",
        "genius parenting hack fail"
    ]
}

ai_growth_suggestions = [
    {
        "id": "growth_A",
        "title": "⚡ [전략 A: 고속 자율 큐레이션 파이프라인]",
        "badge": "제작속도 극대화",
        "description": "Reddit 및 TikTok의 실시간 급상승 100만+ 일상 유머 영상을 자동 발굴하여, 상단 18.5% 블랙 바 + 한국어 킬링 헤더('ㅋㅋㅋ')를 10초 만에 자동 합성하는 원클릭 템플릿 적용."
    },
    {
        "id": "growth_B",
        "title": "🎙️ [전략 B: 1초 몰입 숏 나레이션 더빙형]",
        "badge": "시청 지속시간 향상",
        "description": "원음만 있는 영상 위에 0~3초 구간에만 '아니 남편 코에 딱 맞는 컵이 나왔다고?' 식의 짧은 위트 AI 보이스오버(Typecast/ElevenLabs)를 추가하여 3초 이탈률 25% 방어."
    },
    {
        "id": "growth_C",
        "title": "🎨 [전략 C: 네온 옐로우 하이라이트 자막]",
        "badge": "CTR/공유율",
        "description": "핵심 킬링 포인트 단어(예: '3,000달러', '코 사이즈')에 네온 옐로우(#F5F420) 팝업 모션을 주어 무음 시청자(지하철 등)의 완청률 극대화."
    }
]

cur.execute("""
UPDATE channel_dna_benchmarks
SET 
    category_name = ?,
    visual_dna = ?,
    script_dna = ?,
    audio_dna = ?,
    source_origin_dna = ?,
    ai_growth_suggestions = ?,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 4
""", (
    "일상 유머 / 가족·부부 시트콤",
    json.dumps(visual_dna, ensure_ascii=False),
    json.dumps(script_dna, ensure_ascii=False),
    json.dumps(audio_dna, ensure_ascii=False),
    json.dumps(source_origin_dna, ensure_ascii=False),
    json.dumps(ai_growth_suggestions, ensure_ascii=False)
))

# 2. Update shorts_templates
cur.execute("""
UPDATE shorts_templates
SET 
    layout_blueprint = ?,
    description = ?
WHERE id = 'custom_76dc831a'
""", (
    json.dumps(visual_dna, ensure_ascii=False),
    "숏비타민c 12편 실측 기반: 상단 18.5% 블랙바 + ㅋㅋㅋ 킬링 헤더 + 샌드위치 레터박스 템플릿"
))

# 3. Update brand_channels (id=6)
cur.execute("""
UPDATE brand_channels
SET 
    style_signature = ?,
    expert_identity = ?
WHERE id = 6
""", (
    json.dumps(visual_dna, ensure_ascii=False),
    json.dumps({
        "channel_name": "숏비타민c",
        "genre": "일상 유머 / 가족·부부 시트콤",
        "template_blueprint": visual_dna,
        "script_dna": script_dna
    }, ensure_ascii=False)
))

conn.commit()
conn.close()
print("[*] Successfully updated viral_loop.db with 100% REAL forensics data!")
