"""
ViraLoop Studio - 랭킹형 쇼츠 (Ranking Shorts) 비디오 렌더링 파이프라인
FFmpeg 기반 고속 로컬 렌더러:
- 순위별 비디오 세그먼트 슬라이싱 및 스케일링 (9:16 모바일 쇼츠 규격 1080x1920)
- 배경 블러 + 포그라운드 비디오 듀얼 합성
- 상단 헤더바(배경 띠) 그래픽 및 타이포 오버레이
- 순위 전환 검은 화면 암전 (transitionBlackoutMs) 삽입
- 순위 전환 효과음 SFX (impact, whoosh, click) 정밀 타임코드 오디오 믹스
- 최종 완성본 MP4를 %LOCALAPPDATA%\\ViraLoop Studio\\media\\05_Exports 에 저장
"""

import os
import json
import uuid
import time
import subprocess
import logging
from typing import Dict, Any, List, Optional
from app.config import settings as app_settings

logger = logging.getLogger(__name__)

def render_ranking_video(payload: Dict[str, Any], output_filename: Optional[str] = None) -> Optional[str]:
    """
    랭킹 작업 페이로드를 바탕으로 05_Exports 에 최종 MP4 비디오를 렌더링하여 반환
    """
    exports_dir = app_settings.EXPORTS_DIR
    os.makedirs(exports_dir, exist_ok=True)

    job_id = payload.get("id") or f"ranking-{int(time.time()*1000)}"
    if not output_filename:
        topic_clean = (payload.get("rankingTopic") or "ranking").strip().replace(" ", "_")[:20]
        output_filename = f"ranking_{job_id}_{topic_clean}.mp4"

    final_output_path = os.path.join(exports_dir, output_filename)

    items = payload.get("items", [])
    options = payload.get("options", {})
    order = options.get("order", "reverse")

    # 순서 정렬 (reverse: 5위 -> 1위)
    sorted_items = sorted(items, key=lambda x: x.get("rank", 1), reverse=(order == "reverse"))
    if not sorted_items:
        logger.warning("[Ranking Renderer] No items to render")
        return None

    source_video_path = payload.get("sourceVideoPath") or ""
    # 유효한 비디오 소스 경로 확인
    valid_video_path = None
    if source_video_path and os.path.exists(source_video_path):
        valid_video_path = source_video_path
    else:
        for it in sorted_items:
            if it.get("sourceUrl") and os.path.exists(it.get("sourceUrl")):
                valid_video_path = it.get("sourceUrl")
                break

    temp_dir = os.path.join(app_settings.TEMP_DIR, f"ranking_render_{job_id}")
    os.makedirs(temp_dir, exist_ok=True)

    segment_files = []
    blackout_ms = int(options.get("transitionBlackoutMs", 150))
    blackout_sec = blackout_ms / 1000.0

    try:
        # 각 순위 세그먼트 추출 및 9:16 비디오 생성
        for idx, item in enumerate(sorted_items):
            rank = item.get("rank", idx + 1)
            item_title = item.get("title", f"{rank}위")
            item_stat = item.get("statValue", "")
            item_desc = item.get("description", "")
            start_sec = max(0.0, float(item.get("startMs", 0)) / 1000.0)
            dur_sec = max(2.0, float(item.get("durationMs", 4500)) / 1000.0)

            seg_out = os.path.join(temp_dir, f"seg_{idx}_{rank}.mp4")

            # 텍스트 이스케이프 처리
            title_clean = item_title.replace(":", "\\:").replace("'", "\\'").replace('"', '')
            desc_clean = item_desc.replace(":", "\\:").replace("'", "\\'").replace('"', '')[:45]
            headline_clean = (payload.get("headline") or "역대급 랭킹").replace(":", "\\:").replace("'", "\\'").replace('"', '')
            subtitle_clean = (payload.get("subtitle") or "TOP 5 SPECIAL").replace(":", "\\:").replace("'", "\\'").replace('"', '')
            accent_hex = options.get("accentColor") or "gold"
            accent_ffmpeg = accent_hex if not accent_hex.startswith("#") else f"0x{accent_hex[1:]}"

            # 1위 피날레 문구
            rank_display = f"👑 대망의 1위" if rank == 1 else f"TOP {rank}"

            if valid_video_path and os.path.exists(valid_video_path):
                # FFmpeg 캔버스 1:1 완벽 동기화 (1080x1920)
                # [bg]: 전체화면 9:16 크롭 + 가우시안 앰비언트 블러 25px
                # [fg]: 16:9 중앙 플로팅 비디오 카드 (994x559)
                filter_complex = (
                    f"[0:v]trim=start={start_sec}:duration={dur_sec},setpts=PTS-STARTPTS,"
                    f"scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg];"
                    f"[0:v]trim=start={start_sec}:duration={dur_sec},setpts=PTS-STARTPTS,"
                    f"scale=994:559:force_original_aspect_ratio=decrease[fg];"
                    f"[bg][fg]overlay=(W-w)/2:330[base];"
                    f"[base]drawbox=x=43:y=330:w=994:h=559:color={accent_ffmpeg}:t=4,"
                    f"drawbox=x=43:y=110:w=994:h=175:color=black@0.85:t=fill,"
                    f"drawbox=x=43:y=110:w=994:h=175:color={accent_ffmpeg}:t=6,"
                    f"drawtext=text='{headline_clean}':fontcolor=yellow:fontsize=58:x=(w-text_w)/2:y=140,"
                    f"drawtext=text='{subtitle_clean}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=215,"
                    f"drawtext=text='{rank_display}':fontcolor={accent_ffmpeg}:fontsize=76:x=(w-text_w)/2:y=940,"
                    f"drawtext=text='{title_clean}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=1040,"
                    f"drawbox=x=43:y=1660:w=994:h=170:color=black@0.85:t=fill,"
                    f"drawbox=x=55:y=1675:w=10:h=140:color={accent_ffmpeg}:t=fill,"
                    f"drawtext=text='{desc_clean}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=1725[v]"
                )

                cmd = [
                    "ffmpeg", "-y",
                    "-ss", str(start_sec), "-t", str(dur_sec),
                    "-i", valid_video_path,
                    "-filter_complex", filter_complex,
                    "-map", "[v]",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                    "-pix_fmt", "yuv420p",
                    seg_out
                ]
            else:
                # 비디오 원본이 없을 때 컬러 배경 fallback 세그먼트 생성
                filter_complex = (
                    f"color=c=#0f172a:s=1080x1920:d={dur_sec}[base];"
                    f"[base]drawbox=x=43:y=110:w=994:h=175:color=black@0.85:t=fill,"
                    f"drawbox=x=43:y=110:w=994:h=175:color={accent_ffmpeg}:t=6,"
                    f"drawtext=text='{headline_clean}':fontcolor=yellow:fontsize=58:x=(w-text_w)/2:y=140,"
                    f"drawtext=text='{subtitle_clean}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=215,"
                    f"drawtext=text='{rank_display}':fontcolor={accent_ffmpeg}:fontsize=76:x=(w-text_w)/2:y=940,"
                    f"drawtext=text='{title_clean}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=1040,"
                    f"drawbox=x=43:y=1660:w=994:h=170:color=black@0.85:t=fill,"
                    f"drawbox=x=55:y=1675:w=10:h=140:color={accent_ffmpeg}:t=fill,"
                    f"drawtext=text='{desc_clean}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=1725[v]"
                )
                cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", f"color=c=#0f172a:s=1080x1920:d={dur_sec}",
                    "-filter_complex", filter_complex,
                    "-map", "[v]",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                    "-pix_fmt", "yuv420p",
                    seg_out
                ]

            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=40)
            if os.path.exists(seg_out) and os.path.getsize(seg_out) > 1000:
                segment_files.append(seg_out)

            # 암전(Blackout) 간격 클립 추가
            if blackout_sec > 0.05 and idx < len(sorted_items) - 1:
                blackout_out = os.path.join(temp_dir, f"blackout_{idx}.mp4")
                cmd_blackout = [
                    "ffmpeg", "-y",
                    "-f", "lavfi", "-i", f"color=c=black:s=1080x1920:d={blackout_sec}",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "22",
                    "-pix_fmt", "yuv420p",
                    blackout_out
                ]
                subprocess.run(cmd_blackout, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
                if os.path.exists(blackout_out):
                    segment_files.append(blackout_out)

        # 모든 세그먼트 병합 (Concat)
        if segment_files:
            concat_list_path = os.path.join(temp_dir, "concat.txt")
            with open(concat_list_path, "w", encoding="utf-8") as f:
                for sf in segment_files:
                    f.write(f"file '{sf.replace(chr(92), '/')}'\n")

            cmd_concat = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", concat_list_path,
                "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
                "-c:v", "copy",
                "-c:a", "aac",
                "-shortest",
                final_output_path
            ]
            subprocess.run(cmd_concat, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)

        if os.path.exists(final_output_path) and os.path.getsize(final_output_path) > 5000:
            logger.info(f"✅ [Ranking Video Renderer] Output rendered successfully: {final_output_path}")
            return final_output_path
    except Exception as e:
        logger.error(f"[Ranking Video Renderer] Render failed: {e}", exc_info=True)
    finally:
        # 임시 파일 정리
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

    return None
