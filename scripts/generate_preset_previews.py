import os
import subprocess
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("generate_previews")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
SAMPLES_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "presets" / "samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

# Font path on Windows
FONT_PATH = "C\\:/Windows/Fonts/malgun.ttf"
FONT_BOLD = "C\\:/Windows/Fonts/malgunbd.ttf"
if not Path("C:/Windows/Fonts/malgunbd.ttf").exists():
    FONT_BOLD = FONT_PATH

PRESETS_META = [
    # 5 Official Core
    {
        "id": "pixeling_official_biology",
        "title": "BIOLOGY & NATURE",
        "subtitle": "경이로운 심해 생물의 기괴한 진화",
        "bg_color": "0x064E3B",
        "accent": "0x34D399",
        "box_color": "0x022C22"
    },
    {
        "id": "pixeling_official_gwanghae",
        "title": "HISTORICAL MYSTERY",
        "subtitle": "조선 왕조 실록 속 숨겨진 야담의 진실",
        "bg_color": "0x451A03",
        "accent": "0xFBBF24",
        "box_color": "0x260E02"
    },
    {
        "id": "pixeling_official_midas",
        "title": "MIDAS MONEY SECRETS",
        "subtitle": "상위 1% 부자들의 돈의 법칙과 투자 비결",
        "bg_color": "0x172554",
        "accent": "0xF59E0B",
        "box_color": "0x0F172A"
    },
    {
        "id": "pixeling_official_post",
        "title": "POST APOCALYPSE 2080",
        "subtitle": "인류 멸망 이후 살아남은 자들의 생존 기록",
        "bg_color": "0x1C1917",
        "accent": "0xEF4444",
        "box_color": "0x0C0A09"
    },
    {
        "id": "pixeling_official_science",
        "title": "COSMOS & QUANTUM",
        "subtitle": "블랙홀 너머 양자 시공간의 뒤틀림",
        "bg_color": "0x1E1B4B",
        "accent": "0x818CF8",
        "box_color": "0x0F0B29"
    },
    # 9 Community & Shared Presets matching disk
    {
        "id": "community_theater",
        "title": "CINEMA THEATER",
        "subtitle": "천만 관객을 울린 전설의 영화 명장면",
        "bg_color": "0x1E293B",
        "accent": "0xF59E0B",
        "box_color": "0x0F172A"
    },
    {
        "id": "personal_prosecutor_3",
        "title": "PROSECUTOR STORY",
        "subtitle": "무죄로 풀려났더니 검사의 진짜 거래",
        "bg_color": "0x18181B",
        "accent": "0xEAB308",
        "box_color": "0x000000"
    },
    {
        "id": "community_ogujjal",
        "title": "OGU HUMOR SHORTS",
        "subtitle": "지하철에서 보면 빵 터지는 현실 유머 짤",
        "bg_color": "0x3F3F46",
        "accent": "0xFDE047",
        "box_color": "0x18181B"
    },
    {
        "id": "community_zack_films",
        "title": "ZACK D. 3D FACTS",
        "subtitle": "인간의 몸에 바늘이 들어가면 벌어지는 일",
        "bg_color": "0x0F172A",
        "accent": "0x38BDF8",
        "box_color": "0x0284C7"
    },
    {
        "id": "community_animals",
        "title": "WILD ANIMAL SHORTS",
        "subtitle": "카메라에 딱 걸린 기상천외한 동물 순간포착",
        "bg_color": "0x14532D",
        "accent": "0x22C55E",
        "box_color": "0x052E16"
    },
    {
        "id": "community_fine_movie",
        "title": "FINE MOVIE REVIEW",
        "subtitle": "결말까지 3분! 숨막히는 스피드 영화 요약",
        "bg_color": "0x4C0519",
        "accent": "0xF43F5E",
        "box_color": "0x1F0208"
    },
    {
        "id": "community_noback",
        "title": "NOBACK TALK SHOW",
        "subtitle": "선 넘는 거침없는 폭탄 발언과 폭소 티키타카",
        "bg_color": "0x1E3A8A",
        "accent": "0x60A5FA",
        "box_color": "0x172554"
    },
    {
        "id": "community_meokguri",
        "title": "MEOKGURI FOOD SHOW",
        "subtitle": "새벽에 보면 미치는 치즈 폭탄 먹방",
        "bg_color": "0x431407",
        "accent": "0xF97316",
        "box_color": "0x1C0601"
    },
    {
        "id": "community_dakgangjeong",
        "title": "CRISPY DAKGANGJEONG",
        "subtitle": "겉바속촉 끝판왕 매콤달콤 닭강정 비법",
        "bg_color": "0x450A0A",
        "accent": "0xEF4444",
        "box_color": "0x1C0303"
    }
]

def generate_preset_video(meta):
    output_path = SAMPLES_DIR / f"{meta['id']}.mp4"
    logger.info(f"Generating preview video for: {meta['id']}")
    
    bg = meta['bg_color']
    accent = meta['accent']
    box = meta['box_color']
    title_text = meta['title']
    sub_text = meta['subtitle']

    vf = (
        f"color=c={bg}:s=720x1280:d=4:r=30,"
        f"drawbox=y=130:h=90:color={box}@0.88:t=fill,"
        f"drawbox=y=128:h=94:color={accent}@0.95:t=2,"
        f"drawtext=fontfile='{FONT_BOLD}':text='{title_text}':fontcolor={accent}:fontsize=34:x=(w-text_w)/2:y=158:shadowcolor=black:shadowx=2:shadowy=2,"
        f"drawbox=y=960:h=120:color=black@0.8:t=fill,"
        f"drawtext=fontfile='{FONT_PATH}':text='{sub_text}':fontcolor=white:fontsize=30:x=(w-text_w)/2:y=1004:shadowcolor=black:shadowx=2:shadowy=2"
    )

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", vf,
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
        "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "64k",
        "-shortest", "-t", "4",
        str(output_path)
    ]

    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
    if res.returncode != 0:
        logger.error(f"Failed to generate {meta['id']}: {res.stderr[:300]}")
    else:
        logger.info(f"Successfully generated {output_path.name} ({output_path.stat().st_size} bytes)")

def main():
    logger.info(f"Target sample directory: {SAMPLES_DIR}")
    for meta in PRESETS_META:
        generate_preset_video(meta)
    logger.info("All 14 preset previews generated successfully!")

if __name__ == "__main__":
    main()
