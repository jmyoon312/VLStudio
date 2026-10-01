"""
Advanced ASS Subtitle Builder with Dynamic Kinetic Popups and Word-by-word Karaoke
Enforces Safe-zone (MarginV: 350px) to prevent YouTube Shorts UI collision.
"""
import os
import sys
import logging
from typing import List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

logger = logging.getLogger("ass_subtitle_builder")

class ShortsAssBuilder:
    @classmethod
    def format_time_ass(cls, seconds: float) -> str:
        """변환: 초 ➔ H:MM:SS.CS (ASS 표준 규격)"""
        if seconds < 0:
            seconds = 0.0
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        centiseconds = int(round((seconds % 1) * 100))
        if centiseconds >= 100:
            secs += 1
            centiseconds = 0
        return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"

    @classmethod
    def generate_ass(
        cls, 
        storyboard_scenes: List[Dict[str, Any]], 
        output_ass_path: str,
        font_name: str = "Black Han Sans",
        font_size: int = 85,
        margin_v: int = 350,
        primary_color: str = "&H00FFFFFF&",
        highlight_color: str = "&H0000FFFF&"
    ) -> str:
        """
        단어별 노래방 하이라이트(\\k) 및 충격 단어 팝업(\\fscX130)을 포함한 ASS 자막 파일 생성
        """
        ass_lines = [
            "[Script Info]",
            "ScriptType: v4.00+",
            "PlayResX: 1080",
            "PlayResY: 1920", # 세로형 9:16 기준
            "ScaledBorderAndShadow: yes",
            "",
            "[V4+ Styles]",
            "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
            # 기본 스타일: 테두리 두께 8, 그림자 4, 정렬 2(하단 중앙), MarginV (기본 350px 세이프존)
            f"Style: ShortsDefault,{font_name},{font_size},{primary_color},{highlight_color},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,8,4,2,10,10,{margin_v},1",
            "",
            "[Events]",
            "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
        ]

        for scene in storyboard_scenes:
            start_sec = scene.get("timestamp_start", 0.0)
            end_sec = scene.get("timestamp_end", 3.0)
            duration_cs = max(10, int((end_sec - start_sec) * 100))
            
            sub = scene.get("subtitle", {})
            text = sub.get("text", "")
            style_override = sub.get("style_override", "normal")
            
            words = text.split()
            if not words:
                continue
                
            cs_per_word = max(5, int(duration_cs / len(words)))
            start_str = cls.format_time_ass(start_sec)
            end_str = cls.format_time_ass(end_sec)
            
            formatted_text = ""
            if style_override == "highlight_yellow":
                # 단어가 읽힐 때마다 실시간으로 노란색으로 변하는 노래방 효과
                for w in words:
                    formatted_text += f"{{\\k{cs_per_word}}}{w} "
            elif style_override == "highlight_red":
                # 글자 크기가 1.3배 커졌다가 돌아오는 임팩트 팝업 효과
                formatted_text = f"{{\\fscX130\\fscY130\\1c&H000000FF&\\t(0,150,\\fscX100\\fscY100)}}{text}"
            else:
                formatted_text = text

            dialogue_line = f"Dialogue: 0,{start_str},{end_str},ShortsDefault,,0,0,0,,{formatted_text.strip()}"
            ass_lines.append(dialogue_line)

        os.makedirs(os.path.dirname(os.path.abspath(output_ass_path)), exist_ok=True)
        with open(output_ass_path, "w", encoding="utf-8") as f:
            f.write("\n".join(ass_lines))
            
        logger.info(f"✨ [ASS Builder] Generated kinetic subtitles at '{output_ass_path}' (MarginV: {margin_v})")
        return output_ass_path
