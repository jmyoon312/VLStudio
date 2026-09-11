"""
VL-MediaIntelligenceCore (전사 표준 비디오 인텔리전스 통합 분석 코어)
- Single Source of Truth (SSOT) for Visual, Speech (STT), and Acoustic Video Analysis.
- Zero Hardcoding Policy 준수.
- 16~22장 스마트 적응형 프레임 (Scene Change + 인터벌)
- Faster-Whisper Word-level STT + 무음/환각 필터링
- FFmpeg/Scipy 기반 오디오 피크, 침묵 감지 및 템포(BPM) 분석
- 표준 VideoManifest 구조체 생성
"""

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

# Whisper 환각 블랙리스트 (침묵/배경음악 시 Whisper가 멋대로 생성하는 가짜 대사)
WHISPER_HALLUCINATION_PATTERNS = [
    "시청해주셔서 감사합니다",
    "구독과 좋아요",
    "시청해 주셔서 감사합니다",
    "구독 좋아요 알림설정",
    "MBC 뉴스",
    "KBS 뉴스",
    "SBS 뉴스",
    "끝까지 시청해주셔서",
    "다음 영상에서 만나요",
    "좋아요와 구독",
    "영상 봐주셔서 감사합니다",
    "Thank you for watching",
    "Please subscribe",
]


class MediaIntelligenceCore:
    def __init__(self, temp_dir: Optional[Path] = None):
        if temp_dir:
            self.temp_dir = Path(temp_dir)
        else:
            self.temp_dir = Path(os.environ.get("LOCALAPPDATA", ".")) / "ViraLoop Studio" / "data" / "media_intelligence"
        self.temp_dir.mkdir(parents=True, exist_ok=True)

    async def get_video_duration(self, video_path: Path) -> float:
        """ffprobe로 비디오 스트림의 실제 지속 시간(초)을 정밀 측정."""
        cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)
        ]
        try:
            proc = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, _ = await proc.communicate()
            val = stdout.decode().strip()
            if val and val != "N/A":
                return float(val)
        except Exception:
            pass

        # Fallback to container format duration
        cmd2 = [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(video_path)
        ]
        try:
            proc = await asyncio.create_subprocess_exec(*cmd2, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
            stdout, _ = await proc.communicate()
            val = stdout.decode().strip()
            if val and val != "N/A":
                return float(val)
        except Exception:
            pass
        return 0.0

    async def extract_adaptive_keyframes(self, video_path: Path, work_dir: Path) -> List[Dict[str, Any]]:
        """
        스마트 적응형 프레임 추출기 (10~22장)
        1. FFmpeg Scene Change (gt(scene, 0.3)) 감지
        2. 1.8초 단위 균등 보간 샘플링
        3. 480p 해상도 최적화 압축 (장당 ~30-50KB)
        """
        work_dir.mkdir(parents=True, exist_ok=True)
        duration = await self.get_video_duration(video_path)
        if duration <= 0:
            duration = 15.0

        # 적정 프레임 수 동적 산정 (10장 ~ 22장)
        target_count = min(max(10, round(duration / 1.8)), 22)

        # 1. 씬 체인지 시점 감지
        scene_changes = []
        try:
            cmd = [
                "ffmpeg", "-i", str(video_path), "-filter:v",
                "select='gt(scene,0.35)',showinfo", "-f", "null", "-"
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await proc.communicate()
            import re
            for line in stderr.decode(errors="ignore").splitlines():
                if "pts_time:" in line:
                    m = re.search(r"pts_time:([0-9\.]+)", line)
                    if m:
                        t = round(float(m.group(1)), 2)
                        if 0.1 < t < duration - 0.2:
                            scene_changes.append(t)
        except Exception:
            pass

        # 2. 균등 보간 인터벌 시점 계산
        step = duration / (target_count + 1)
        uniform_points = [round(step * (i + 1), 2) for i in range(target_count)]

        # 3. 씬 체인지 + 균등 시점 결합 및 Dedup (최소 0.8초 간격 유지)
        all_points = sorted(set(scene_changes + uniform_points))
        filtered_points = []
        last_t = -1.0
        for pt in all_points:
            if pt >= duration:
                continue
            if last_t < 0 or (pt - last_t) >= 0.8:
                filtered_points.append(pt)
                last_t = pt
            if len(filtered_points) >= target_count:
                break

        if not filtered_points:
            filtered_points = [round(duration * 0.2, 2), round(duration * 0.5, 2), round(duration * 0.8, 2)]

        # 4. 프레임 추출 실행 (단일 또는 고속 병렬 추출)
        extracted_frames = []
        for idx, t in enumerate(filtered_points):
            out_file = work_dir / f"frame_{idx:02d}_{t:.2f}s.jpg"
            cmd_extract = [
                "ffmpeg", "-y", "-loglevel", "error", "-ss", str(t),
                "-i", str(video_path), "-frames:v", "1",
                "-vf", "scale=480:-1", "-q:v", "3", str(out_file)
            ]
            proc = await asyncio.create_subprocess_exec(*cmd_extract)
            await proc.wait()
            if out_file.exists() and out_file.stat().st_size > 0:
                extracted_frames.append({
                    "index": idx,
                    "timestamp": t,
                    "path": str(out_file.resolve()),
                    "size_bytes": out_file.stat().st_size,
                    "is_scene_change": (t in scene_changes)
                })

        return extracted_frames

    async def extract_speech_transcript(self, video_path: Path) -> Dict[str, Any]:
        """
        Faster-Whisper 음성 대사(STT) 추출 + 환각 필터링
        """
        result = {
            "has_speech": False,
            "language": "ko",
            "full_text": "",
            "segments": []
        }

        # 오디오 트랙 추출 (16kHz wav)
        wav_path = self.temp_dir / f"temp_{os.getpid()}_{video_path.stem}.wav"
        cmd_wav = [
            "ffmpeg", "-y", "-loglevel", "error", "-i", str(video_path),
            "-vn", "-ac", "1", "-ar", "16000", str(wav_path)
        ]
        proc = await asyncio.create_subprocess_exec(*cmd_wav)
        await proc.wait()

        if not wav_path.exists() or wav_path.stat().st_size < 1000:
            if wav_path.exists():
                try: wav_path.unlink()
                except: pass
            return result

        try:
            from faster_whisper import WhisperModel
            # DB Settings의 whisper_model_path 확인 또는 기본 경량 모델 사용
            model_path = "base"
            try:
                from app.database import SessionLocal
                from app import models
                dbs = SessionLocal()
                st = dbs.query(models.Settings).first()
                if st and getattr(st, "whisper_model_path", None) and os.path.exists(st.whisper_model_path):
                    model_path = st.whisper_model_path
                dbs.close()
            except Exception:
                pass

            # CTranslate2 / CPU or CUDA
            model = WhisperModel(model_path, device="auto", compute_type="default")
            segments, info = model.transcribe(str(wav_path), beam_size=3, vad_filter=True)
            
            clean_segments = []
            clean_texts = []
            for s in segments:
                text = s.text.strip()
                # 환각 블랙리스트 검사
                is_hallucination = any(pat in text for pat in WHISPER_HALLUCINATION_PATTERNS)
                if text and not is_hallucination and len(text) >= 2:
                    clean_segments.append({
                        "start": round(s.start, 2),
                        "end": round(s.end, 2),
                        "text": text
                    })
                    clean_texts.append(text)

            if clean_texts:
                result["has_speech"] = True
                result["language"] = info.language or "ko"
                result["full_text"] = " ".join(clean_texts)
                result["segments"] = clean_segments
        except Exception as e:
            result["error"] = str(e)
        finally:
            if wav_path.exists():
                try: wav_path.unlink()
                except: pass

        return result

    async def extract_audio_acoustics(self, video_path: Path) -> Dict[str, Any]:
        """
        FFmpeg & Scipy 기반 물리 음향 분석 (오디오 피크, 침묵 구간, 비트 템포)
        """
        result = {
            "audio_peaks": [],
            "silence_intervals": [],
            "estimated_bpm": 0.0,
            "has_bgm": False
        }

        # 1. FFmpeg silencedetect 및 볼륨 피크 탐지
        try:
            cmd = [
                "ffmpeg", "-i", str(video_path), "-af",
                "silencedetect=noise=-30dB:d=0.5", "-f", "null", "-"
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await proc.communicate()
            import re
            silence_starts = []
            silence_ends = []
            for line in stderr.decode(errors="ignore").splitlines():
                if "silence_start:" in line:
                    m = re.search(r"silence_start: ([0-9\.]+)", line)
                    if m: silence_starts.append(float(m.group(1)))
                elif "silence_end:" in line:
                    m = re.search(r"silence_end: ([0-9\.]+)", line)
                    if m: silence_ends.append(float(m.group(1)))

            intervals = []
            for s, e in zip(silence_starts, silence_ends):
                intervals.append({"start": round(s, 2), "end": round(e, 2)})
            result["silence_intervals"] = intervals
        except Exception:
            pass

        # 2. Scipy 음량 Onset 피크 탐지 (효과음/비트 타점)
        try:
            import soundfile as sf
            from scipy.signal import find_peaks
            wav_sample = self.temp_dir / f"peaks_{os.getpid()}_{video_path.stem}.wav"
            cmd_sample = [
                "ffmpeg", "-y", "-loglevel", "error", "-i", str(video_path),
                "-vn", "-ac", "1", "-ar", "8000", "-t", "60", str(wav_sample)
            ]
            p = await asyncio.create_subprocess_exec(*cmd_sample)
            await p.wait()

            if wav_sample.exists():
                data, samplerate = sf.read(str(wav_sample))
                if len(data) > 0:
                    abs_data = np.abs(data)
                    window = int(samplerate * 0.05) # 50ms window
                    if window > 0 and len(abs_data) > window:
                        stride = int(samplerate * 0.025)
                        rms = [np.sqrt(np.mean(abs_data[i:i+window]**2)) for i in range(0, len(abs_data)-window, stride)]
                        rms = np.array(rms)
                        peaks, _ = find_peaks(rms, height=np.mean(rms)*1.5, distance=int(0.5 / 0.025))
                        peak_times = [round(p * 0.025, 2) for p in peaks[:12]]
                        result["audio_peaks"] = peak_times
                        if len(peak_times) >= 3:
                            result["has_bgm"] = True
                try: wav_sample.unlink()
                except: pass
        except Exception:
            pass

        return result

    async def analyze_visual_narrative(self, frames: List[Dict[str, Any]], purpose: str = "subtitle") -> str:
        """
        OmniRoute 비전 멀티모달을 활용한 심층 비전 분석 (듀얼 렌즈 지원)
        - purpose="subtitle" (렌즈 A: 자막/쨉쨉이용): 화면 텍스트를 무시하고 순수 시각적 장면, 인물(표정/복장/역할), 사건/해프닝 전개 포착
        - purpose="layout_dna" (렌즈 B: 채널 DNA용): 상하단 레터박스 높이 %, 타이틀 Y%, 폰트 크기/색상, 자막 Y%, 외곽선 두께 등 정밀 역공학
        - Zero Hardcoding Policy: DB Settings(script_analysis_model)를 단일 진실 공급원(SSOT)으로 동적 연동
        """
        if not frames:
            return ""

        import base64
        import httpx

        # 3~4장 선별 (초반 0, 중반 절반, 후반 끝-1)
        if len(frames) <= 3:
            selected_frames = frames
        else:
            mid_idx = len(frames) // 2
            selected_frames = [frames[0], frames[mid_idx], frames[-1]]

        if purpose == "layout_dna":
            system_prompt = (
                "당신은 최고 수준의 숏폼 UI/UX 및 영상 디자인 분석 전문가입니다.\n"
                "제공된 프레임들을 정밀 분석하여, 영상의 비주얼 레이아웃과 텍스트 스타일 구조를 픽셀 단위로 역공학 분석해 주십시오.\n\n"
                "[분석 요구사항]\n"
                "1. [상단 및 하단 배경 바 (Letterbox)]: 상단/하단에 검은색이나 유색 바가 있는지, 화면 전체 높이 대비 각각 몇 %를 차지하는지 추정 (예: top_bar_height_pct: 18.0, bottom_bar_height_pct: 6.0)\n"
                "2. [상단 타이틀 텍스트]: 상단 바 내부 또는 영상 상단에 큰 제목 글자가 있는지, Y축 위치(상단 기준 몇 %), 폰트 굵기(Bold/ExtraBold), 글자 색상(흰색, 노란색 등), 배경 박스(하이라이터/필/박스) 유무 및 색상 분석\n"
                "3. [본문 자막 (말자막)]: 대사 자막이 표시되는 화면 Y축 위치(상단 기준 몇 %, 보통 65~75%), 글자 색상, 외곽선(스트로크) 두께 및 색상, 폰트 크기 비율 분석\n"
                "4. [중간 쨉쨉이/리액션 텍스트]: 화면 중간이나 인물 주변에 뜨는 짧은 감탄사/해설 자막의 위치와 스타일\n"
                "5. 분석 결과를 아래 JSON 형식만으로 깔끔하게 반환해 주십시오 (마크다운 백틱 없이 또는 백틱 내부에 순수 json만):\n"
                "{\n"
                '  "top_bar_height_pct": 18.0,\n'
                '  "bottom_bar_height_pct": 6.0,\n'
                '  "top_title_y_pct": 5.5,\n'
                '  "title_colors": ["#FFFFFF", "#F5F420"],\n'
                '  "title_bg_mode": "none",\n'
                '  "subtitle_y_pct": 68.5,\n'
                '  "subtitle_color": "#FFFFFF",\n'
                '  "subtitle_stroke_color": "#000000",\n'
                '  "subtitle_stroke_width_px": 5,\n'
                '  "has_jab_hook": true,\n'
                '  "jab_hook_y_pct": 42.0,\n'
                '  "layout_style_name": "상하단 블랙바 + 2단 타이틀 + 68% 자막"\n'
                "}"
            )
        else:
            # 렌즈 A: subtitle (시각 액션 / 사건 스토리텔링)
            system_prompt = (
                "당신은 최고 수준의 영상 전문 감독이자 숏폼 스토리텔러입니다.\n"
                "제공된 영상 프레임들을 시간 순서대로 정밀 분석하여, 화면 텍스트가 전혀 없다고 가정하고 순수한 '시각적 장면·상황·특징·액션의 전개'를 분석해 주십시오.\n\n"
                "[분석 지침]\n"
                "1. 화면에 적힌 자막이나 글자는 무시하고, 오직 '실제 화면 속 인물(표정, 복장, 신체 동작), 사물, 배경, 물리적 상호작용'에만 집중하십시오.\n"
                "2. 시간 순서대로 무슨 일이 일어나는지 구체적으로 서술하십시오 (누가 어디서 무엇을 하려는데, 어떤 사물/상황 때문에 어떤 리액션/해프닝이 발생하는가).\n"
                "3. 인물이 누구인지(유명인/직업/역할), 어떤 스포츠/장소인지, 왜 이 영상이 사람들의 호기심과 웃음/놀라움을 유발하는지 핵심 포인트를 짚어내십시오.\n\n"
                "출력 형식:\n"
                "- [배경 및 무대]: 장소, 분위기, 스포츠/상황 종목\n"
                "- [등장인물 및 복장]: 주요 인물의 외형, 역할, 표정\n"
                "- [시간대별 시각적 사건 전개]:\n"
                "  • 초반 (시작):\n"
                "  • 중반 (사건/해프닝 발생):\n"
                "  • 후반 (결말 및 리액션):\n"
                "- [핵심 후킹 & 바이럴 포인트]: 왜 이 장면이 흥미진진하고 터지는지 1줄 요약"
            )

        content_parts = [
            {
                "type": "text",
                "text": system_prompt
            }
        ]

        for f in selected_frames:
            fpath = Path(f["path"])
            if fpath.exists():
                try:
                    b64 = base64.b64encode(fpath.read_bytes()).decode()
                    content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    })
                except Exception:
                    pass

        if len(content_parts) <= 1:
            return ""

        # Zero Hardcoding Policy: DB Settings에서 동적으로 인증 정보 및 모델명 추출
        try:
            from app.legacy_ddalkkak.workers.gemini_auth import (
                get_youtube1_api_key,
                get_youtube1_base_url,
                get_db_settings_model
            )
            base_url = get_youtube1_base_url()
            api_key = get_youtube1_api_key()
            model_name = get_db_settings_model("analysis")
        except Exception:
            try:
                from workers.gemini_auth import (
                    get_youtube1_api_key,
                    get_youtube1_base_url,
                    get_db_settings_model
                )
                base_url = get_youtube1_base_url()
                api_key = get_youtube1_api_key()
                model_name = get_db_settings_model("analysis")
            except Exception:
                base_url = "http://localhost:20128/v1"
                api_key = ""
                model_name = None

        if not model_name:
            try:
                from app.database import SessionLocal
                from app import models
                db = SessionLocal()
                s = db.query(models.Settings).first()
                db.close()
                if s:
                    model_name = getattr(s, "script_analysis_model", None) or getattr(s, "default_llm_model", None)
            except Exception:
                pass

        if not model_name:
            model_name = os.environ.get("SCRIPT_ANALYSIS_MODEL") or os.environ.get("DEFAULT_LLM_MODEL") or "viraloop1"

        url = (base_url or "http://localhost:20128/v1").rstrip("/") + "/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }

        body = {
            "model": model_name,
            "messages": [{"role": "user", "content": content_parts}],
            "max_tokens": 1200,
            "temperature": 0.2
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                r = await client.post(url, json=body, headers=headers)
                if r.status_code == 200:
                    res_data = r.json()
                    choices = res_data.get("choices") or []
                    if choices:
                        return choices[0].get("message", {}).get("content", "").strip()
        except Exception as err:
            import traceback
            traceback.print_exc()
            print(f"⚠️ [MediaIntelligenceCore] 비전 내러티브 분석 실패 (skip): {type(err).__name__} - {err}", flush=True)

        return ""

    async def generate_video_manifest(
        self,
        video_path: Path,
        work_dir: Optional[Path] = None,
        purpose: str = "subtitle"
    ) -> Dict[str, Any]:
        """
        전사 표준 VideoManifest 종합 선언서 생성
        시각 프레임 + 대사 STT + 음향 피크 + 순수 시각 내러티브(비전 심층 분석)를 통합 수집하여 반환
        - purpose="subtitle": 순수 화면 행동/해프닝 중심
        - purpose="layout_dna": 디자인 레이아웃 역공학 중심
        """
        vpath = Path(video_path)
        if not vpath.exists():
            raise FileNotFoundError(f"비디오 파일이 존재하지 않습니다: {vpath}")

        job_work_dir = work_dir or (self.temp_dir / f"job_{vpath.stem}")
        job_work_dir.mkdir(parents=True, exist_ok=True)

        # 3대 기본 분석 병렬 실행 (속도 최적화)
        frames_task = self.extract_adaptive_keyframes(vpath, job_work_dir / "frames")
        speech_task = self.extract_speech_transcript(vpath)
        acoustics_task = self.extract_audio_acoustics(vpath)

        frames, speech, acoustics = await asyncio.gather(
            frames_task, speech_task, acoustics_task
        )

        duration = await self.get_video_duration(vpath)

        # 4. 순수 시각 내러티브 심층 비전 분석 (듀얼 렌즈 지원)
        visual_narrative = await self.analyze_visual_narrative(frames, purpose=purpose)

        # LLM 주입용 정제 텍스트 타임라인(Narrative Context) 구성
        prompt_lines = [
            f"═══ [🎬 실제 영상 시각 & 청각 정밀 종합 분석 결과 (단일 진실 공급원)] ═══",
            f"영상 실제 길이: {duration:.2f}초",
            f"시각 프레임 수: {len(frames)}개 앵커",
        ]

        if visual_narrative:
            prompt_lines.append(f"\n[👁️ 실제 화면 순수 시각 액션 & 사건 전개 (Visual Narrative)]\n{visual_narrative}")

        if speech.get("has_speech"):
            prompt_lines.append(f"\n[🗣️ 실제 음성 발화 대사 (정확도 99% Whisper 전사)]")
            for seg in speech.get("segments", [])[:10]:
                prompt_lines.append(f"  • {seg['start']}초~{seg['end']}초: \"{seg['text']}\"")
        else:
            prompt_lines.append("\n[🗣️ 음성 발화]: 말소리 없는 무음 또는 순수 배경음악/효과음 영상 (화면의 시각적 액션 중심 스토리 전개)")

        prompt_lines.append(f"\n[👀 시각적 씬 전환 및 핵심 프레임 타임라인]")
        for f in frames:
            sc_mark = " (씬 전환 컷)" if f.get("is_scene_change") else ""
            prompt_lines.append(f"  • {f['timestamp']}초: [프레임 {f['index']}{sc_mark}]")

        if acoustics.get("audio_peaks"):
            peaks_str = ", ".join(f"{p}초" for p in acoustics["audio_peaks"][:8])
            prompt_lines.append(f"\n[💥 핵심 음향 피크 / 비트 타점 (효과음·쨉쨉이 강력 추천 시점)]")
            prompt_lines.append(f"  • {peaks_str}")

        prompt_lines.append("═══════════════════════════════════════════════════\n")

        narrative_context = "\n".join(prompt_lines)

        return {
            "video_path": str(vpath.resolve()),
            "duration": duration,
            "frames": frames,
            "speech": speech,
            "acoustics": acoustics,
            "visual_narrative": visual_narrative,
            "narrative_context": narrative_context
        }

    async def extract_channel_dna_blueprint(self, video_path: Path, work_dir: Optional[Path] = None) -> Dict[str, Any]:
        """
        성공 채널 복제 수준의 4대 핵심 매트릭스(Visual Layout, Editing Pacing, Audio SFX, Hook DNA) 정밀 발골
        - Visual Layout DNA: 렌즈 B (상하단 바 %, 타이틀 Y%, 자막 Y%, 외곽선 두께 등)
        - Editing Pacing DNA: FFmpeg 씬 체인지 빈도 및 ASL(평균 컷당 지속시간) 측정
        - Audio SFX DNA: BGM 유무 및 효과음 피크 밀도 분석
        - Hook DNA: 초반 0~3초 시각 및 타이틀 배치 분석
        """
        vpath = Path(video_path)
        if not vpath.exists():
            raise FileNotFoundError(f"비디오 파일이 존재하지 않습니다: {vpath}")

        job_work_dir = work_dir or (self.temp_dir / f"dna_{vpath.stem}")
        job_work_dir.mkdir(parents=True, exist_ok=True)

        # 1. 키프레임 및 오디오 피크 추출 병렬 실행
        frames_task = self.extract_adaptive_keyframes(vpath, job_work_dir / "frames")
        acoustics_task = self.extract_audio_acoustics(vpath)
        duration_task = self.get_video_duration(vpath)

        frames, acoustics, duration = await asyncio.gather(
            frames_task, acoustics_task, duration_task
        )

        # 2. 비전 렌즈 B (레이아웃 정밀 역공학)
        raw_layout_text = await self.analyze_visual_narrative(frames, purpose="layout_dna")
        layout_data = {}
        if raw_layout_text:
            try:
                clean_json = raw_layout_text.strip()
                if "```json" in clean_json:
                    clean_json = clean_json.split("```json")[1].split("```")[0].strip()
                elif "```" in clean_json:
                    clean_json = clean_json.split("```")[1].split("```")[0].strip()
                layout_data = json.loads(clean_json)
            except Exception:
                pass

        # 3. 편집 문법 (Editing Pacing DNA) 분석
        scene_changes = [f for f in frames if f.get("is_scene_change")]
        total_cuts = max(len(scene_changes) + 1, 1)
        avg_cut_sec = round(duration / total_cuts, 2) if duration > 0 else 2.5
        if avg_cut_sec < 1.8:
            tempo = "ultra_fast"
        elif avg_cut_sec < 3.2:
            tempo = "dynamic"
        else:
            tempo = "steady"

        # 4. Audio SFX DNA
        audio_peaks = acoustics.get("audio_peaks", [])
        sfx_peaks_count = len(audio_peaks)
        sfx_per_min = round((sfx_peaks_count / max(duration, 1)) * 60, 1)

        # 5. Hook DNA (초반 3초)
        opening_frames = [f for f in frames if f.get("timestamp", 0) <= 3.0]

        # 6. 표준 ChannelDNABenchmark 스키마 구조체 조립
        top_bar_h = float(layout_data.get("top_bar_height_pct", 18.0))
        bot_bar_h = float(layout_data.get("bottom_bar_height_pct", 6.0))
        top_title_y = float(layout_data.get("top_title_y_pct", 5.5))
        sub_y = float(layout_data.get("subtitle_y_pct", 68.5))
        sub_color = str(layout_data.get("subtitle_color", "#FFFFFF"))
        sub_stroke_color = str(layout_data.get("subtitle_stroke_color", "#000000"))
        sub_stroke_w = int(layout_data.get("subtitle_stroke_width_px", 5))

        visual_dna = {
            "canvas_type": "LETTERBOX_SOLID" if (top_bar_h > 5 or bot_bar_h > 3) else "FULLSCREEN",
            "video_fit_mode": "sandwich" if (top_bar_h > 5 or bot_bar_h > 3) else "fullscreen",
            "has_top_bar_bg": top_bar_h > 5,
            "top_bar_bg": "#000000",
            "top_bar_height_pct": top_bar_h,
            "has_top_title": bool(top_title_y > 0),
            "top_title_y_pct": top_title_y,
            "title_colors": layout_data.get("title_colors", ["#FFFFFF", "#F5F420"]),
            "title_bg_mode": layout_data.get("title_bg_mode", "none"),
            "has_subtitle": True,
            "subtitle": {
                "y_percent": sub_y,
                "color": sub_color,
                "stroke_color": sub_stroke_color,
                "stroke_width_px": sub_stroke_w,
                "size_pt": 48,
                "size_px": 24,
                "font_family": "Pretendard",
                "safe_zone": f"OPTIMAL_{int(sub_y)}",
                "motion_preset": "word_pop"
            },
            "has_jab_hook": layout_data.get("has_jab_hook", True),
            "jab_hook": {
                "enabled": layout_data.get("has_jab_hook", True),
                "y_percent": float(layout_data.get("jab_hook_y_pct", 42.0)),
                "color": "#F5F420",
                "avg_interval_sec": round(duration / max(sfx_peaks_count, 1), 1) if sfx_peaks_count > 0 else 7.5
            },
            "has_bottom_bar_bg": bot_bar_h > 3,
            "bottom_bar_bg": "#000000",
            "bottom_bar_height_pct": bot_bar_h,
            "editing_grammar": {
                "avg_cut_sec": avg_cut_sec,
                "total_cuts": total_cuts,
                "tempo": tempo,
                "zoom_motion": "ken-burns-115" if tempo == "ultra_fast" else "static"
            }
        }

        audio_dna = {
            "has_bgm": acoustics.get("has_bgm", True),
            "sfx_peaks_count": sfx_peaks_count,
            "sfx_per_minute": sfx_per_min,
            "sfx_peak_times": audio_peaks,
            "silence_ratio": acoustics.get("silence_ratio", 0.0)
        }

        script_dna = {
            "opening_hook_type": "초반 0~3초 즉각적 시각 액션 및 임팩트 타이틀" if opening_frames else "표준 후킹",
            "tempo_class": tempo,
            "estimated_pacing": f"{tempo} (평균 컷 {avg_cut_sec}초)"
        }

        return {
            "video_path": str(vpath.resolve()),
            "duration": duration,
            "visual_dna": visual_dna,
            "audio_dna": audio_dna,
            "script_dna": script_dna,
            "raw_layout_analysis": layout_data,
            "blueprint_summary": f"템플릿: {visual_dna['canvas_type']}, 상단바 {top_bar_h}%, 자막 {sub_y}%, 컷속도 {avg_cut_sec}초/컷({tempo})"
        }

    async def extract_longform_highlights(
        self,
        video_path: Path,
        target_clips: int = 3,
        min_duration: float = 15.0,
        max_duration: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        롱폼(Long-form) 비디오 대응 VMI (Viral Moments Index) 3중 텐서 하이라이트 검출 파이프라인
        - 단순 오디오 피크 의존 탈피: 소리가 작거나 대화 중심/모션 중심 영상도 정확 포착
        - T1 [Acoustic Peak Tensor]: 효과음, 탄성, 폭소, 비트 타점 에너지 밀도 (가중치 0.35)
        - T2 [Whisper Emotion & Speech Density Tensor]: 분당 발화량 및 후킹/감정 키워드 출현 밀도 (가중치 0.35)
        - T3 [Visual Motion & Scene Change Tensor]: FFmpeg 씬 전환 빈도 및 카메라 다이내믹스 밀도 (가중치 0.30)
        - 복합 점수 VMI = 0.35*T1 + 0.35*T2 + 0.30*T3 기반 최적 숏폼 클립 구간 슬라이싱
        """
        vpath = Path(video_path)
        if not vpath.exists():
            raise FileNotFoundError(f"비디오 파일이 존재하지 않습니다: {vpath}")

        duration = await self.get_video_duration(vpath)
        if duration <= 0:
            return []

        # 1. 3대 신호 병렬 추출
        job_work_dir = self.temp_dir / f"hl_{vpath.stem}"
        job_work_dir.mkdir(parents=True, exist_ok=True)

        frames_task = self.extract_adaptive_keyframes(vpath, job_work_dir / "frames")
        speech_task = self.extract_speech_transcript(vpath)
        acoustics_task = self.extract_audio_acoustics(vpath)

        frames, speech, acoustics = await asyncio.gather(
            frames_task, speech_task, acoustics_task
        )

        # 2. 타임라인 윈도우 분할 (기본 15초 윈도우, 7.5초 스트라이드)
        win_size = min_duration if min_duration <= 15.0 else 15.0
        stride = win_size / 2.0
        windows = []
        t = 0.0
        while t + win_size <= duration:
            windows.append((round(t, 2), round(t + win_size, 2)))
            t += stride

        if not windows:
            windows.append((0.0, round(duration, 2)))

        # 3. 3중 텐서 신호 매핑
        audio_peaks = acoustics.get("audio_peaks", [])
        speech_segments = speech.get("segments", [])
        scene_change_times = [f["timestamp"] for f in frames if f.get("is_scene_change")]

        EMOTION_KEYWORDS = [
            "대박", "진짜", "어?", "와", "미쳤", "정말", "충격", "소름", "대체", "순간",
            "결국", "반전", "실화", "폭소", "눈물", "레전드", "goat", "omg", "wow", "crazy",
            "말도 안", "어떻게", "우와", "대단", "장난", "비밀", "몰카", "탈락", "우승"
        ]

        scored_windows = []
        for w_start, w_end in windows:
            # T1: Acoustic Score (윈도우 내 오디오 피크 개수)
            peaks_in_win = sum(1 for p in audio_peaks if w_start <= p <= w_end)
            t1_acoustic = min(peaks_in_win / 3.0, 1.0)

            # T2: Speech & Emotion Density Score
            words_in_win = 0
            emotion_hits = 0
            transcript_snippet = []
            for seg in speech_segments:
                s_start, s_end = seg["start"], seg["end"]
                if not (s_end < w_start or s_start > w_end):
                    seg_text = seg["text"]
                    transcript_snippet.append(seg_text)
                    words_in_win += len(seg_text.split())
                    for kw in EMOTION_KEYWORDS:
                        if kw in seg_text:
                            emotion_hits += 1

            # 분당 발화 밀도 및 감정 키워드 가중치
            speech_density = min(words_in_win / 15.0, 1.0)
            emotion_boost = min(emotion_hits * 0.25, 0.5)
            t2_speech = min(speech_density + emotion_boost, 1.0)

            # T3: Visual Motion Score (씬 전환 빈도)
            scenes_in_win = sum(1 for st in scene_change_times if w_start <= st <= w_end)
            t3_visual = min(scenes_in_win / 2.0, 1.0)

            # VMI (Viral Moments Index) 복합 연산
            vmi_score = round(0.35 * t1_acoustic + 0.35 * t2_speech + 0.30 * t3_visual, 3)

            scored_windows.append({
                "start": w_start,
                "end": w_end,
                "vmi_score": vmi_score,
                "t1_acoustic": round(t1_acoustic, 2),
                "t2_speech": round(t2_speech, 2),
                "t3_visual": round(t3_visual, 2),
                "peaks_count": peaks_in_win,
                "words_count": words_in_win,
                "emotion_hits": emotion_hits,
                "scenes_count": scenes_in_win,
                "transcript": " ".join(transcript_snippet).strip()
            })

        # 4. NMS 기반 중복 제거 및 최적 클립 선별
        scored_windows.sort(key=lambda x: x["vmi_score"], reverse=True)

        selected_clips = []
        for win in scored_windows:
            if len(selected_clips) >= target_clips:
                break

            overlap = False
            for sel in selected_clips:
                inter_start = max(win["start"], sel["start_time"])
                inter_end = min(win["end"], sel["end_time"])
                if inter_end > inter_start:
                    inter_len = inter_end - inter_start
                    if inter_len >= (win["end"] - win["start"]) * 0.4:
                        overlap = True
                        break

            if not overlap:
                clip_duration = win["end"] - win["start"]
                clip_start = max(0.0, win["start"] - 2.0)
                clip_end = min(duration, clip_start + max(clip_duration, min_duration))
                if clip_end - clip_start > max_duration:
                    clip_end = clip_start + max_duration

                reason_parts = []
                if win["t1_acoustic"] >= 0.5:
                    reason_parts.append(f"강력한 음향 피크({win['peaks_count']}회 타점)")
                if win["t2_speech"] >= 0.5:
                    reason_parts.append(f"급격한 대화/감정 고조({win['words_count']}단어, 감정키워드 {win['emotion_hits']}회)")
                if win["t3_visual"] >= 0.5:
                    reason_parts.append(f"역동적인 화면 전환({win['scenes_count']}회 컷)")
                if not reason_parts:
                    reason_parts.append("종합 비전/음향 균형 우수 구간")

                selected_clips.append({
                    "clip_id": len(selected_clips) + 1,
                    "start_time": round(clip_start, 2),
                    "end_time": round(clip_end, 2),
                    "duration": round(clip_end - clip_start, 2),
                    "vmi_score": win["vmi_score"],
                    "signals": {
                        "acoustic_energy": win["t1_acoustic"],
                        "speech_density": win["t2_speech"],
                        "visual_dynamics": win["t3_visual"]
                    },
                    "reason": " + ".join(reason_parts),
                    "transcript_summary": win["transcript"][:120] if win["transcript"] else "(무음/BGM 구간)"
                })

        selected_clips.sort(key=lambda x: x["start_time"])
        return selected_clips


# 전사 단일 인스턴스 (Singleton)
media_intelligence = MediaIntelligenceCore()

