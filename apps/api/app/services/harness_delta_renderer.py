"""
[Harness v2 Modular 0.5-Second Delta Re-Renderer]
Re-encodes ONLY modified scene chunks and instantly concatenates cached chunks
via FFmpeg concat demuxer (Copy Mode) for ultra-fast human creative decision making.
"""
import os
import sys
import subprocess
import logging
import time
from typing import List, Dict, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

from app.services.global_arbiter import global_arbiter
from app.config import settings

logger = logging.getLogger("delta_renderer")

class HarnessDeltaRenderer:
    @classmethod
    def get_delta_cache_dir(cls, project_id: str) -> str:
        """단일 진실 공급원 미디어 계층(02_Operations/Temp/delta_cache) 디렉토리 반환"""
        base_temp = os.path.join(settings.MEDIA_ROOT, "02_Operations", "Temp", "delta_cache", str(project_id))
        os.makedirs(base_temp, exist_ok=True)
        return base_temp

    @classmethod
    async def render_single_scene_chunk(
        cls,
        scene: Dict[str, Any],
        output_chunk_path: str,
        ass_path: Optional[str] = None,
        channel_title: str = "Default"
    ) -> str:
        """
        단일 씬 비디오 + 자막을 초고속(ultrafast)으로 0.3초 내 인코딩
        Tier 1 GlobalArbiter GPU 락을 통과하여 리소스 안정성 확보
        """
        start_t = time.time()
        video_src = scene.get("generated_assets", {}).get("video_path")
        
        # 소스 파일 검증
        if not video_src or not os.path.exists(video_src):
            logger.warning(f"[Delta Renderer] Source video missing for scene #{scene.get('scene_id')}: '{video_src}'. Using fallback color bar.")
            # 1080x1920 세로형 블랙 솔리드 생성
            duration_sec = max(1.0, scene.get("timestamp_end", 3.0) - scene.get("timestamp_start", 0.0))
            cmd = [
                "ffmpeg", "-y",
                "-f", "lavfi", "-i", f"color=c=black:s=1080x1920:d={duration_sec}:r=30",
                "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22",
                "-an",
                output_chunk_path
            ]
        else:
            start_sec = max(0.0, scene.get("timestamp_start", 0.0))
            duration_sec = max(0.5, scene.get("timestamp_end", 3.0) - start_sec)
            
            vf_filters = ["crop=ih*9/16:ih:(iw-ow)/2:0", "scale=1080:1920", "fps=30"]
            if ass_path and os.path.exists(ass_path):
                escaped_ass = ass_path.replace("\\", "/").replace(":", "\\:")
                vf_filters.append(f"subtitles='{escaped_ass}'")
                
            filter_str = ",".join(vf_filters)
            cmd = [
                "ffmpeg", "-y",
                "-ss", str(start_sec),
                "-i", video_src,
                "-t", str(duration_sec),
                "-vf", filter_str,
                "-c:v", "libx264", "-crf", "18", "-preset", "ultrafast",
                "-an",
                output_chunk_path
            ]

        acquired = await global_arbiter.acquire_gpu(channel_title)
        try:
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
            elapsed = time.time() - start_t
            logger.info(f"⚡ [Chunk Render] Scene #{scene.get('scene_id')} rendered in {elapsed:.2f}s ➔ {output_chunk_path}")
            return output_chunk_path
        finally:
            if acquired:
                global_arbiter.release_gpu(channel_title)

    @classmethod
    async def hot_patch_and_merge(
        cls,
        project_id: str,
        target_scene_id: int,
        patched_scene_data: Dict[str, Any],
        all_scene_chunks: List[str],
        master_audio_path: Optional[str],
        final_output_mp4: str,
        ass_path: Optional[str] = None,
        channel_title: str = "Default"
    ) -> str:
        """
        대표님의 대화형 잡도리(수정 지시) 시:
        1. target_scene_id 청크만 0.3초 만에 다시 렌더링
        2. 나머지 캐시된 씬들과 Concat demuxer로 0.2초 만에 무손실 결합 (합계 0.5초)
        """
        start_t = time.time()
        cache_dir = cls.get_delta_cache_dir(project_id)
        logger.info(f"⚡ [Delta Merge] Hot-patching Scene #{target_scene_id} for project '{project_id}'...")

        # 1. 대상 씬 청크 갱신
        v_version = int(time.time() * 1000) % 100000
        new_chunk_path = os.path.join(cache_dir, f"scene_{target_scene_id}_v{v_version}.mp4")
        await cls.render_single_scene_chunk(patched_scene_data, new_chunk_path, ass_path=ass_path, channel_title=channel_title)

        # 2. 리스트 교체
        idx = target_scene_id - 1
        if 0 <= idx < len(all_scene_chunks):
            all_scene_chunks[idx] = new_chunk_path
        else:
            all_scene_chunks.append(new_chunk_path)

        # 3. Concat List 파일 작성
        concat_txt = os.path.join(cache_dir, "concat_delta_list.txt")
        with open(concat_txt, "w", encoding="utf-8") as f:
            for p in all_scene_chunks:
                f.write(f"file '{os.path.abspath(p)}'\n")

        # 4. 결합 및 마스터 출력
        temp_merged_blank = os.path.join(cache_dir, "tmp_merged_video.mp4")
        concat_cmd = [
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c", "copy",
            temp_merged_blank
        ]
        subprocess.run(concat_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)

        if master_audio_path and os.path.exists(master_audio_path):
            final_cmd = [
                "ffmpeg", "-y",
                "-i", temp_merged_blank,
                "-i", master_audio_path,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                final_output_mp4
            ]
        else:
            final_cmd = [
                "ffmpeg", "-y",
                "-i", temp_merged_blank,
                "-c", "copy",
                final_output_mp4
            ]

        subprocess.run(final_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=True)
        elapsed = time.time() - start_t
        logger.info(f"🚀 [Delta Merge Complete] Video hot-patched and ready in {elapsed:.2f}s ➔ {final_output_mp4}")
        return final_output_mp4
