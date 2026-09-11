"""
오디오 선택적 음소거 및 현장음 보존 믹싱 서비스
(Selective Vocal Muting & Ambient Sound Preservation)
- 원본 영상에서 Faster-Whisper 발화 구간(STT)을 기반으로 나레이션 음성만 소프트 뮤트(-45dB, 크로스페이드)
- 원본의 생동감 있는 현장음(발소리, 웃음소리, 리액션, 환경음 등)은 100% 보존
- 새로 합성된 Supertonic 나레이션 오디오와 정밀 밸런스 믹싱
"""
import os
import shutil
import subprocess
import logging
from typing import List, Tuple, Optional
from pydub import AudioSegment

logger = logging.getLogger(__name__)

class SelectiveAudioEngine:
    @staticmethod
    def extract_audio(video_path: str, output_wav: str) -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_wav)), exist_ok=True)
        cmd = [
            'ffmpeg', '-y',
            '-i', video_path,
            '-vn',
            '-acodec', 'pcm_s16le',
            '-ar', '44100',
            '-ac', '2',
            output_wav
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f'FFmpeg audio extraction failed: {res.stderr}')
        return output_wav

    @staticmethod
    def create_preserved_ambient_track(
        original_audio_path: str,
        speech_intervals: List[Tuple[float, float]],
        output_ambient_path: str,
        fade_ms: int = 100,
        ducking_db: float = -45.0,
        ambient_gain_db: float = 0.0
    ) -> str:
        audio = AudioSegment.from_file(original_audio_path)
        total_len_ms = len(audio)
        
        # Sort and merge overlapping intervals
        sorted_intervals = sorted(speech_intervals, key=lambda x: x[0])
        merged = []
        for start, end in sorted_intervals:
            s_ms = max(0, int(start * 1000) - fade_ms)
            e_ms = min(total_len_ms, int(end * 1000) + fade_ms)
            if not merged:
                merged.append((s_ms, e_ms))
            else:
                last_s, last_e = merged[-1]
                if s_ms <= last_e:
                    merged[-1] = (last_s, max(last_e, e_ms))
                else:
                    merged.append((s_ms, e_ms))
                    
        cleaned = AudioSegment.empty()
        last_end = 0
        
        for s_ms, e_ms in merged:
            # Preserved ambient part
            if s_ms > last_end:
                ambient = audio[last_end:s_ms]
                cleaned += ambient
            # Muted speech part
            speech = audio[s_ms:e_ms]
            muted = speech + ducking_db
            cleaned += muted
            last_end = e_ms
            
        if last_end < total_len_ms:
            cleaned += audio[last_end:total_len_ms]
            
        if ambient_gain_db != 0.0:
            cleaned = cleaned + ambient_gain_db
            
        os.makedirs(os.path.dirname(os.path.abspath(output_ambient_path)), exist_ok=True)
        cleaned.export(output_ambient_path, format='wav')
        return output_ambient_path

    @classmethod
    def process_and_mix(
        cls,
        video_path: str,
        speech_intervals: List[Tuple[float, float]],
        new_narration_wav: Optional[str],
        output_mixed_path: str,
        ambient_gain_db: float = -3.0,
        narration_gain_db: float = +2.0
    ) -> str:
        base_dir = os.path.dirname(os.path.abspath(output_mixed_path))
        temp_raw_wav = os.path.join(base_dir, 'temp_raw_extracted.wav')
        temp_ambient_wav = os.path.join(base_dir, 'temp_preserved_ambient.wav')
        
        # 1. Extract raw audio from video
        cls.extract_audio(video_path, temp_raw_wav)
        
        # 2. Selectively mute speech intervals while preserving ambient
        cls.create_preserved_ambient_track(
            temp_raw_wav,
            speech_intervals,
            temp_ambient_wav,
            ambient_gain_db=ambient_gain_db
        )
        
        # 3. Overlay new narration if provided
        if new_narration_wav and os.path.exists(new_narration_wav):
            ambient = AudioSegment.from_wav(temp_ambient_wav)
            narration = AudioSegment.from_wav(new_narration_wav) + narration_gain_db
            mixed = ambient.overlay(narration)
            mixed.export(output_mixed_path, format='wav')
        else:
            shutil.copyfile(temp_ambient_wav, output_mixed_path)
            
        # Clean temp
        for p in [temp_raw_wav, temp_ambient_wav]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass
                    
        return output_mixed_path
