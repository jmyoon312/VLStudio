import os
import asyncio
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

from app.dependency_manager import DependencyManager

async def run_command(*args):
    """Run an async subprocess command."""
    # Ensure ffmpeg uses the globally configured path
    cmd_args = list(args)
    if cmd_args[0] == 'ffmpeg':
        cmd_args[0] = DependencyManager.get_ffmpeg_path()
        
    process = await asyncio.create_subprocess_exec(
        *cmd_args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        logger.error(f"Command failed: {' '.join(cmd_args)}\nError: {stderr.decode()}")
        raise RuntimeError(f"FFmpeg command failed: {stderr.decode()}")
        
    return stdout.decode()

async def cut_video(input_path: str, output_path: str, start_time: float, end_time: float) -> str:
    """
    Cuts a video using ffmpeg without re-encoding (-c copy).
    Returns the output path.
    """
    duration = end_time - start_time
    if duration <= 0:
        raise ValueError("End time must be greater than start time")
        
    await run_command(
        'ffmpeg',
        '-y', # Overwrite output files
        '-ss', str(start_time),
        '-i', input_path,
        '-t', str(duration),
        '-c', 'copy',
        output_path
    )
    
    return output_path

async def extract_audio(input_path: str, output_path: str) -> str:
    """Extract audio track from video."""
    await run_command(
        'ffmpeg',
        '-y',
        '-i', input_path,
        '-q:a', '0',
        '-map', 'a',
        output_path
    )
    return output_path

def get_media_duration(file_path: str) -> float:
    """Returns duration in seconds using FFmpeg probe."""
    try:
        import subprocess, re
        ffmpeg_exe = DependencyManager.get_ffmpeg_path()
        res = subprocess.run([ffmpeg_exe, "-i", file_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors='replace')
        m = re.search(r'Duration:\s*(\d+):(\d+):(\d+\.?\d*)', res.stderr)
        if m:
            h, m_, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
            return h * 3600 + m_ * 60 + s
    except Exception as e:
        logger.warning(f"Failed to probe media duration: {e}")
    return 0.0

def extract_mp3_streaming(video_path: str, output_mp3_path: str = None, progress_callback=None) -> str:
    """
    Extracts audio to MP3 from video using FFmpeg streaming demuxing (-vn).
    Utilizes multi-threading (-threads 0) and reports real-time progress via progress_callback.
    Guarantees minimal memory footprint (<50MB) even on 2GB+ video files.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Input video file not found: {video_path}")

    if not output_mp3_path:
        base, _ = os.path.splitext(video_path)
        output_mp3_path = f"{base}.mp3"

    ffmpeg_exe = DependencyManager.get_ffmpeg_path()
    temp_output = f"{output_mp3_path}.tmp.mp3"
    if os.path.exists(temp_output):
        try:
            os.remove(temp_output)
        except OSError:
            pass

    total_duration = get_media_duration(video_path)
    import subprocess
    cmd = [
        ffmpeg_exe,
        "-y",
        "-nostats",
        "-progress", "pipe:1",
        "-i", video_path,
        "-vn",
        "-map", "0:a:0?",
        "-c:a", "libmp3lame",
        "-q:a", "2",
        "-compression_level", "0",
        "-threads", "0",
        temp_output
    ]

    logger.info(f"[FFmpeg] Turbo extracting MP3 from {video_path} (Duration: {total_duration:.1f}s) -> {temp_output}")
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1)

    speed_str = "1x"
    try:
        if process.stdout:
            for line in iter(process.stdout.readline, ''):
                line = line.strip()
                if not line:
                    continue
                if line.startswith("speed="):
                    speed_str = line.split("=", 1)[1].strip()
                elif line.startswith("out_time_us="):
                    try:
                        time_us = int(line.split("=", 1)[1].strip())
                        cur_sec = time_us / 1_000_000.0
                        if total_duration > 0 and progress_callback:
                            pct = min(100.0, (cur_sec / total_duration) * 100.0)
                            progress_callback(pct, cur_sec, total_duration, speed_str)
                    except (ValueError, IndexError):
                        pass
                elif line.startswith("progress=end"):
                    if progress_callback and total_duration > 0:
                        progress_callback(100.0, total_duration, total_duration, speed_str)
    finally:
        if process.stdout:
            process.stdout.close()
        process.wait(timeout=600)

    if process.returncode != 0:
        err_msg = process.stderr.read() if process.stderr else ""
        if os.path.exists(temp_output):
            try:
                os.remove(temp_output)
            except OSError:
                pass
        raise RuntimeError(f"FFmpeg MP3 extraction failed (code {process.returncode}): {err_msg[:400]}")

    if os.path.exists(output_mp3_path):
        try:
            os.remove(output_mp3_path)
        except OSError:
            pass
    os.replace(temp_output, output_mp3_path)
    logger.info(f"[FFmpeg] MP3 extracted ({os.path.getsize(output_mp3_path):,} bytes): {output_mp3_path}")
    return output_mp3_path

def extract_or_transcribe_srt(video_path: str, mp3_path: str = None, language: str = None, whisper_model: str = "base", whisper_model_path: str = None, progress_callback=None) -> str:
    """
    Extracts or generates an SRT subtitle file.
    1. Checks for existing .srt/.vtt in the same folder.
    2. Checks if the video container has embedded subtitle tracks.
    3. If none exist, transcribes using Faster-Whisper on the MP3 (or video) with GPU acceleration and real-time progress.
    """
    base, _ = os.path.splitext(video_path)

    # 1. Check existing .srt files
    for ext in [".srt", ".ko.srt", ".en.srt", ".vtt"]:
        candidate = f"{base}{ext}"
        if os.path.exists(candidate) and os.path.getsize(candidate) > 10:
            logger.info(f"[Subtitle] Found existing subtitle: {candidate}")
            if progress_callback:
                progress_callback(100.0, 1.0, 1.0, 1)
            return candidate

    import subprocess
    ffmpeg_exe = DependencyManager.get_ffmpeg_path()

    # 2. Try extracting embedded subtitle stream via FFmpeg
    temp_srt = f"{base}.embedded.srt"
    cmd_sub = [
        ffmpeg_exe,
        "-y",
        "-i", video_path,
        "-map", "0:s:0",
        temp_srt
    ]
    try:
        sub_res = subprocess.run(cmd_sub, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60)
        if sub_res.returncode == 0 and os.path.exists(temp_srt) and os.path.getsize(temp_srt) > 10:
            target_srt = f"{base}.srt"
            if os.path.exists(target_srt):
                try:
                    os.remove(target_srt)
                except OSError:
                    pass
            os.replace(temp_srt, target_srt)
            logger.info(f"[Subtitle] Extracted embedded subtitle: {target_srt}")
            if progress_callback:
                progress_callback(100.0, 1.0, 1.0, 1)
            return target_srt
    except Exception as e:
        logger.warning(f"[Subtitle] Embedded subtitle extraction attempt: {e}")
    finally:
        if os.path.exists(temp_srt):
            try:
                os.remove(temp_srt)
            except OSError:
                pass

    # 3. Fallback: Transcribe using Faster-Whisper on MP3 (lightweight) or Video
    source_audio = mp3_path if (mp3_path and os.path.exists(mp3_path)) else video_path
    logger.info(f"[Subtitle] Running Faster-Whisper turbo transcription on: {source_audio}")

    try:
        from app.utils.transcriber import get_transcriber
        transcriber = get_transcriber(model_size=whisper_model, model_path=whisper_model_path)
        output_srt = f"{base}.srt"
        transcribe_res = transcriber.transcribe(
            source_audio,
            output_srt_path=output_srt,
            language=language,
            progress_callback=progress_callback,
            beam_size=1,
            vad_filter=True
        )
        if transcribe_res.get("status") == "success" and os.path.exists(output_srt):
            logger.info(f"[Subtitle] Faster-Whisper turbo transcription completed: {output_srt}")
            return output_srt
    except Exception as e:
        logger.error(f"[Subtitle] Whisper transcription error: {e}")

    return None

async def merge_video_audio(video_path: str, audio_path: str, output_path: str) -> str:
    """Merges a video file and an audio file (replacing original audio)."""
    await run_command(
        'ffmpeg',
        '-y',
        '-i', video_path,
        '-i', audio_path,
        '-c:v', 'copy',
        '-c:a', 'aac',
        '-map', '0:v:0',
        '-map', '1:a:0',
        output_path
    )
    return output_path

