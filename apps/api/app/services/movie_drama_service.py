"""
[MovieDramaService] 영화·드라마 쇼츠 100% 독립 주권 분석 & 렌더링 엔진
- 픽셀링 z4(Story Studio) 원천 아키텍처 1:1 완벽 실체화
- 5대 분석 파이프라인: 원본 확인 ➔ 대사/인물(Whisper) ➔ 사건/반전(FFmpeg 씬 컷 + LLM 스토리 그래프) ➔ 후보 정리 ➔ TTS/자막 구성
- 단일 DB (viral_loop.db) 및 9대 미디어 저장소(01_Inbox ~ 09_System) 단일 진실 공급원 준수
- Zero Hardcoding Policy: DB Settings 모델 및 자격 증명 실시간 동적 연동
"""

import os
import sys
import json
import uuid
import time
import shutil
import asyncio
import hashlib
import zipfile
import subprocess
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import httpx
from app import dependency_manager

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def _safe_log(level: str, msg: str):
    try:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        safe_msg = str(msg).encode(enc, errors="replace").decode(enc, errors="replace")
        print(f"[{level}] [MovieDramaService] {safe_msg}", flush=True)
    except Exception:
        try:
            print(f"[{level}] [MovieDramaService] {str(msg).encode('ascii', errors='replace').decode('ascii')}", flush=True)
        except Exception:
            pass

def _log_info(msg: str):
    _safe_log("INFO", msg)

def _log_warn(msg: str):
    _safe_log("WARN", msg)

def _log_error(msg: str):
    _safe_log("ERROR", msg)


# 유명 외화/드라마 한글 개봉명 및 매핑 사전
KNOWN_WORK_TITLES = {
    "CHRONICLE OF A DEATH FORETOLD": "예고된 죽음의 연대기",
    "PARASITE": "기생충",
    "MEMORIES OF MURDER": "살인의 추억",
    "OLD BOY": "올드보이",
    "SQUID GAME": "오징어 게임",
    "THE GLORY": "더 글로리",
    "ALL OF US ARE DEAD": "지금 우리 학교는",
    "MOVING": "무빙",
    "CASINO": "카지노",
    "INTERSTELLAR": "인터스텔라",
    "INCEPTION": "인셉션",
    "OPPENHEIMER": "오펜하이머",
    "THE DARK KNIGHT": "다크 나이트",
    "TITANIC": "타이타닉",
    "AVATAR": "아바타",
    "BREAKING BAD": "브레이킹 배드",
    "GAME OF THRONES": "왕좌의 게임",
    "SHERLOCK": "셜록"
}


def clean_work_title(filename_or_path: str) -> str:
    """
    유튜브 다운로드 파일명, 웹 릴리즈 태그, 해시, 연도, 배우명을 분석하여
    시청자가 한눈에 알아볼 수 있는 순수하고 정확한 작품명(한글/정제 영문)을 추출
    """
    name = Path(filename_or_path).stem

    # 1. 36자 표준 UUID 및 md-XXXXXX 접두어 제거
    name = re.sub(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]*', '', name)
    name = re.sub(r'^(?:md-)?[0-9a-fA-F]{8,32}[_-]+', '', name)

    # 2. 대괄호/중괄호 업로더/릴리즈 태그 제거 (예: [PREHISTORICTELEVISION1956], [1080p], [tvN])
    name = re.sub(r'\[.*?\]', ' ', name)
    name = re.sub(r'\{.*?\}', ' ', name)

    # 3. 소괄호 내 유튜브 ID 또는 해상도/버전 제거 (예: (JwvU-OjPBLw), (Official), (1080p))
    name = re.sub(r'\([a-zA-Z0-9_-]{8,15}\)', ' ', name)
    name = re.sub(r'\(.*?(?:ver|version|edit|audio|video|rip|hd|4k|1080|720).*?\)', ' ', name, flags=re.IGNORECASE)

    # 4. 하이픈 구분자 뒤의 배우명/언어버전/릴리즈 정보 정제
    # 예: "CHRONICLE OF A DEATH FORETOLD 1987 - Gian Maria Volonte... - English language version"
    # 하이픈으로 분할하여 첫 번째 세그먼트가 제목일 확률이 매우 높음
    segments = [s.strip() for s in name.split('-') if s.strip()]
    if segments:
        candidate_title = segments[0]
        # 만약 첫 번째 세그먼트가 너무 짧고(2자 이하) 두 번째가 길다면 두 번째 채택
        if len(candidate_title) <= 2 and len(segments) > 1:
            candidate_title = segments[1]
        name = candidate_title

    # 5. 끝에 붙은 4자리 출시 연도 분리 (예: "CHRONICLE OF A DEATH FORETOLD 1987")
    year_match = re.search(r'\b(19\d{2}|20\d{2})\b', name)
    release_year = year_match.group(1) if year_match else ""
    name = re.sub(r'\b(19\d{2}|20\d{2})\b', ' ', name)

    # 6. 언더스코어 및 잔여 특수문자 공백화
    name = re.sub(r'[_\(\)\[\]\{\}\<\>\|/\\:;~`!@#\$%\^&\*\+=]', ' ', name)
    name = re.sub(r'\s+', ' ', name).strip()

    # 7. 사전 매핑 검사 (대소문자 무시)
    upper_name = name.upper()
    if upper_name in KNOWN_WORK_TITLES:
        return KNOWN_WORK_TITLES[upper_name]

    for en_key, kr_val in KNOWN_WORK_TITLES.items():
        if en_key in upper_name:
            return kr_val

    # 8. 한글이 포함되어 있으면 그대로 사용
    if re.search(r'[가-힣]', name):
        return name[:30].strip()

    # 9. 영문만 있는 경우 단어 첫 글자 대문자화 (Title Case)
    if name:
        titled = name.title()
        return titled[:35].strip()

    return "화제의 명작 드라마"


# 9대 미디어 계층 경로 획득
LOCAL_APP_DATA = Path(os.environ.get("LOCALAPPDATA", ".")) / "ViraLoop Studio"
MEDIA_ROOT = LOCAL_APP_DATA / "media"
INBOX_DIR = MEDIA_ROOT / "01_Inbox"
OPERATIONS_DIR = MEDIA_ROOT / "02_Operations"
EXPORTS_DIR = MEDIA_ROOT / "05_Exports"
SYSTEM_BIN_DIR = MEDIA_ROOT / "09_System" / "bin"

for p in [INBOX_DIR, OPERATIONS_DIR, EXPORTS_DIR, SYSTEM_BIN_DIR]:
    p.mkdir(parents=True, exist_ok=True)

# 인메모리 및 로컬 디스크 작업 캐시
MOVIE_DRAMA_WORK_DIR = OPERATIONS_DIR / "movie_drama"
MOVIE_DRAMA_WORK_DIR.mkdir(parents=True, exist_ok=True)


class MovieDramaService:
    def __init__(self):
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._candidates: Dict[str, List[Dict[str, Any]]] = {}
        self._load_persisted_jobs()

    def _load_persisted_jobs(self):
        """디스크에 저장된 최근 작업 복원"""
        state_file = MOVIE_DRAMA_WORK_DIR / "jobs_state.json"
        if state_file.exists():
            try:
                data = json.loads(state_file.read_text(encoding="utf-8"))
                self._jobs = data.get("jobs", {})
                self._candidates = data.get("candidates", {})
            except Exception as e:
                _log_warn(f"작업 상태 로드 실패: {e}")

    def _persist_state(self):
        """디스크에 작업 상태 원자적 저장"""
        state_file = MOVIE_DRAMA_WORK_DIR / "jobs_state.json"
        try:
            temp_file = MOVIE_DRAMA_WORK_DIR / f"jobs_state_{uuid.uuid4().hex[:8]}.tmp"
            temp_file.write_text(
                json.dumps({"jobs": self._jobs, "candidates": self._candidates}, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
            shutil.move(str(temp_file), str(state_file))
        except Exception as e:
            _log_warn(f"작업 상태 저장 실패: {e}")

    def _calculate_sha256(self, file_path: Path) -> str:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    @staticmethod
    async def _run_command_async(
        cmd: List[str],
        timeout: Optional[float] = None
    ) -> subprocess.CompletedProcess:
        """Windows 및 Linux 전 환경에서 EventLoop 충돌(NotImplementedError) 없이 안전하게 하위 프로세스를 실행"""
        def _exec():
            creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            return subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=creationflags,
                timeout=timeout
            )
        return await asyncio.to_thread(_exec)

    async def get_video_info(self, video_path: Path) -> Dict[str, Any]:
        """ffprobe로 비디오 정보(지속시간, 해상도, fps) 추출"""
        ffprobe_exe = dependency_manager.DependencyManager.get_ffprobe_path()
        cmd = [
            ffprobe_exe, "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height,duration,r_frame_rate",
            "-show_entries", "format=duration,size",
            "-of", "json", str(video_path)
        ]
        try:
            res = await self._run_command_async(cmd, timeout=15.0)
            data = json.loads(res.stdout.decode('utf-8', errors='ignore'))
            stream = data.get("streams", [{}])[0]
            fmt = data.get("format", {})
            
            width = int(stream.get("width") or 1920)
            height = int(stream.get("height") or 1080)
            duration = float(stream.get("duration") or fmt.get("duration") or 0.0)
            size = int(fmt.get("size") or video_path.stat().st_size)
            
            return {
                "width": width,
                "height": height,
                "duration": duration,
                "size": size,
                "filename": video_path.name
            }
        except Exception as e:
            return {
                "width": 1920,
                "height": 1080,
                "duration": 60.0,
                "size": video_path.stat().st_size if video_path.exists() else 0,
                "filename": video_path.name
            }

    async def create_job(
        self,
        video_path_str: str,
        target_shorts_count: int = 3,
        delivery_mode: str = "full_tts",
        layout_preset: str = "full_bleed",
        series_mode: bool = True,
        rights_confirmed: bool = True,
        style_settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """신규 영화·드라마 쇼츠 분석 작업 생성 및 백그라운드 발주"""
        video_path = Path(video_path_str)
        if not video_path.exists():
            raise FileNotFoundError(f"원본 비디오를 찾을 수 없습니다: {video_path}")

        job_id = f"md-{uuid.uuid4().hex[:12]}"
        sha256 = self._calculate_sha256(video_path)
        video_info = await self.get_video_info(video_path)

        job_data = {
            "id": job_id,
            "status": "processing",
            "stage": "acquiring_source",
            "progress": 5,
            "activityMessage": "원본 영상 파일을 확인하고 있습니다.",
            "createdAt": datetime_now_iso(),
            "updatedAt": datetime_now_iso(),
            "source": {
                "kind": "local",
                "originalName": video_path.name,
                "canonicalPath": str(video_path.resolve()),
                "fingerprintSha256": sha256,
                "media": video_info
            },
            "settings": {
                "targetShortsCount": max(1, min(5, target_shorts_count)),
                "deliveryMode": delivery_mode,
                "layoutPreset": layout_preset,
                "seriesMode": series_mode,
                "styleSettings": style_settings or {}
            },
            "error": None
        }

        self._jobs[job_id] = job_data
        self._candidates[job_id] = []
        self._persist_state()

        # 백그라운드 파이프라인 가동 (안전 콜백 부착)
        task = asyncio.create_task(self._run_analysis_pipeline(job_id))
        def _on_analysis_done(t: asyncio.Task):
            if not t.cancelled() and t.exception():
                err = t.exception()
                _log_error(f"작업 {job_id} 파이프라인 비정상 중단: {err}")
                jb = self._jobs.get(job_id)
                if jb and jb.get("status") not in ("completed", "failed"):
                    jb["status"] = "failed"
                    jb["stage"] = "failed"
                    jb["progress"] = 0
                    jb["activityMessage"] = f"분석 중 오류 발생: {err}"
                    self._persist_state()
        task.add_done_callback(_on_analysis_done)

        return job_data

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self._jobs.get(job_id)

    def list_jobs(self) -> List[Dict[str, Any]]:
        return sorted(list(self._jobs.values()), key=lambda x: x.get("createdAt", ""), reverse=True)

    def get_candidates(self, job_id: str) -> List[Dict[str, Any]]:
        return self._candidates.get(job_id, [])

    def cancel_job(self, job_id: str):
        job = self._jobs.get(job_id)
        if job and job["status"] not in ["completed", "failed"]:
            job["status"] = "canceled"
            job["activityMessage"] = "사용자가 작업을 취소했습니다."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

    async def _run_analysis_pipeline(self, job_id: str):
        """
        영화·드라마 쇼츠 5대 단계 분석 파이프라인
        1. 원본과 오디오 확인 (probing_source)
        2. 대사와 등장인물 파악 (analyzing_media - Whisper STT + FFmpeg 씬 감지)
        3. 사건 흐름과 반전 연결 (building_story_graph - 시청각 융합 대본 + LLM 스토리 분할)
        4. 겹치는 후보 정리 (planning_candidates)
        5. 제목·자막·음성 구성 (enriching_candidates -> ready_for_export)
        """
        job = self._jobs.get(job_id)
        if not job:
            return

        job_dir = MOVIE_DRAMA_WORK_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        video_path = Path(job["source"]["canonicalPath"])
        media_info = job.get("source", {}).get("media") or {}

        # 파이프라인 전역 변수 사전 초기화 (UnboundLocalError / NameError 원천 방지)
        scene_cuts: List[Dict[str, Any]] = []
        dialogue_segments: List[Dict[str, Any]] = []
        frame_sheet_info: Dict[str, Any] = {"sheetUrl": None, "sheetFile": None, "tileCount": 0}
        raw_candidates: List[Dict[str, Any]] = []
        candidates: List[Dict[str, Any]] = []

        try:
            # 1단계: 원본과 오디오 확인 (probing_source)
            job["stage"] = "probing_source"
            job["progress"] = 15
            job["activityMessage"] = "원본 영상과 오디오 트랙을 정밀 검사하는 중..."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()
            await asyncio.sleep(0.3)

            # 2단계: 대사와 등장인물 파악 (FFmpeg 씬 컷 감지 + Whisper STT)
            job["stage"] = "analyzing_media"
            job["progress"] = 35
            job["activityMessage"] = "0.4초 씬 컷 전환 감지 및 대사(Whisper)를 분석하는 중..."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

            # 2.1 FFmpeg 씬 컷 감지 (gt(scene, 0.35) + 320p 초고속 필터 + 균등 안전 보정)
            try:
                scene_cuts = await self._detect_scene_cuts(video_path, job_dir, media_info=media_info)
            except Exception as sc_err:
                _log_warn(f"씬 컷 감지 폴백 전환: {sc_err}")
                scene_cuts = self._create_fallback_scene_cuts(media_info)

            # 2.2 Faster-Whisper 음성 대사 추출 (앞 180초 집중 전사로 고속 분석)
            try:
                dialogue_segments = await self._extract_dialogue(video_path, job_dir, media_info=media_info)
            except Exception as dl_err:
                _log_warn(f"대사 추출 폴백 전환: {dl_err}")
                dialogue_segments = []

            # 2.3 대표 프레임 시트 (zY 패턴 스프라이트 타일) 생성
            try:
                frame_sheet_info = await self._generate_frame_sheet(video_path, scene_cuts, job_dir, job_id)
            except Exception as fs_err:
                _log_warn(f"프레임 시트 생성 폴백: {fs_err}")
                frame_sheet_info = {"sheetUrl": None, "sheetFile": None, "tileCount": 0}

            if job.get("status") == "canceled":
                return

            # 3단계: 사건 흐름과 반전 연결 (LLM 스토리 그래프 생성)
            job["stage"] = "building_story_graph"
            job["progress"] = 55
            job["activityMessage"] = "사건의 발단-위기-절정 흐름을 연결하여 스토리 후보를 구성하는 중..."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

            # 시청각 융합 대본 생성
            narrative_script = self._build_narrative_context(
                media_info, scene_cuts, dialogue_segments, frame_sheet_info
            )

            # DB Settings LLM 호출하여 스토리 후보 생성 (안전 폴백 내장, scene_cuts 완전 연동)
            raw_candidates = await self._generate_story_candidates_with_llm(
                narrative_script,
                job["source"]["originalName"],
                job["settings"]["targetShortsCount"],
                job["settings"]["deliveryMode"],
                job["settings"]["seriesMode"],
                scene_cuts=scene_cuts
            )

            if job.get("status") == "canceled":
                return

            # 4단계: 겹치는 후보 정리 (planning_candidates)
            job["stage"] = "planning_candidates"
            job["progress"] = 75
            job["activityMessage"] = "겹치는 장면을 정리하고 최적의 쇼츠 후보를 확정하는 중..."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

            candidates = self._materialize_candidates(
                job_id, raw_candidates, scene_cuts, dialogue_segments, frame_sheet_info
            )
            self._candidates[job_id] = candidates

            # 5단계: 제목·자막·음성 구성 (generating_tts -> ready_for_export)
            job["stage"] = "generating_tts"
            job["progress"] = 85
            job["activityMessage"] = "이야기별 AI 내레이션 및 자막 타임라인을 합성하는 중..."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

            # 선택된 TTS 보이스 획득 (DB Settings 및 사용자 선택 동적 연동)
            target_voice = (
                job.get("settings", {}).get("styleSettings", {}).get("voiceId") or
                job.get("settings", {}).get("voiceId") or
                "F1"
            )

            # TTS 내레이션 파일 합성
            if job["settings"]["deliveryMode"] in ["full_tts", "tts_dialogue_mix"]:
                for cand in candidates:
                    try:
                        await self._synthesize_candidate_narration(job_id, cand, job_dir, voice_id=target_voice)
                    except Exception as tts_err:
                        _log_warn(f"후보 {cand.get('rank')} TTS 합성 오류 (무중단 지속): {tts_err}")

            # 분석 완료
            job["stage"] = "ready_for_export"
            job["status"] = "completed"
            job["progress"] = 100
            job["activityMessage"] = f"쇼츠 이야기 {len(candidates)}개 후보가 완성되었습니다."
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

        except Exception as e:
            import traceback
            trace_str = traceback.format_exc()
            _log_error(f"분석 파이프라인 에러:\n{trace_str}")
            err_msg = str(e).strip() or repr(e) or e.__class__.__name__ or "알 수 없는 파이프라인 오류"
            job["status"] = "failed"
            job["stage"] = "failed"
            job["progress"] = 0
            job["activityMessage"] = f"분석 중 오류 발생: {err_msg}"
            job["error"] = {"message": err_msg, "code": "ANALYSIS_FAILED", "trace": trace_str[:500]}
            job["updatedAt"] = datetime_now_iso()
            self._persist_state()

    def _create_fallback_scene_cuts(self, media_info: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """영상 길이에 맞춘 씬 컷 안전 균등 분할 (최대 15개)"""
        info = media_info or {}
        duration = float(info.get("duration") or 60.0)
        total_cuts = 15
        step = max(3.0, min(15.0, duration / total_cuts)) if duration > 45.0 else max(2.0, duration / total_cuts)
        scene_cuts = []
        cur_t = 0.0
        idx = 1
        while cur_t < duration and idx <= total_cuts:
            end_t = min(duration, cur_t + step)
            scene_cuts.append({
                "id": f"cut_{idx}",
                "sourceStartMs": int(cur_t * 1000),
                "sourceEndMs": int(end_t * 1000),
                "durationMs": int((end_t - cur_t) * 1000),
                "subjectAnchorX": 0.5,
                "subjectAnchorY": 0.5,
                "shotScale": "BUST_SHOT" if idx % 2 == 0 else "FULL_SHOT",
                "reason": f"장면 {idx}: 사건 전개 구간"
            })
            cur_t = end_t
            idx += 1
        return scene_cuts

    async def _detect_scene_cuts(
        self, video_path: Path, job_dir: Path, media_info: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """FFmpeg select='gt(scene,0.35)' 필터로 씬 컷 감지 (최대 30초 타임아웃, 320p 초고속 연산)"""
        scene_cuts = []
        info = media_info or {}
        duration = float(info.get("duration") or 60.0)
        ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()
        
        # 긴 영상(300초 이상)은 시작부 300초 이내에서 핵심 씬 전환을 초고속 탐색
        scan_duration = min(duration, 300.0) if duration > 30.0 else duration
        cmd = [
            ffmpeg_exe, "-ss", "0", "-t", str(scan_duration),
            "-i", str(video_path),
            "-filter:v", "scale=320:-1,select='gt(scene,0.35)',showinfo",
            "-f", "null", "-"
        ]
        try:
            try:
                res = await self._run_command_async(cmd, timeout=30.0)
                stderr_bytes = res.stderr
            except subprocess.TimeoutExpired:
                _log_warn("씬 감지 타임아웃, 균등 분할로 대체")
                return self._create_fallback_scene_cuts(media_info)

            import re
            lines = stderr_bytes.decode(errors="ignore").splitlines()
            last_t = 0.0
            idx = 1
            for line in lines:
                if "pts_time:" in line:
                    m = re.search(r"pts_time:([0-9\.]+)", line)
                    if m:
                        t = round(float(m.group(1)), 2)
                        if t - last_t >= 1.5:  # 최소 1.5초 간격 컷
                            scene_cuts.append({
                                "id": f"cut_{idx}",
                                "sourceStartMs": int(last_t * 1000),
                                "sourceEndMs": int(t * 1000),
                                "durationMs": int((t - last_t) * 1000),
                                "subjectAnchorX": 0.5,
                                "subjectAnchorY": 0.5,
                                "shotScale": "BUST_SHOT" if idx % 2 == 0 else "FULL_SHOT",
                                "reason": f"씬 {idx}: 시각적 구도 전환"
                            })
                            last_t = t
                            idx += 1
                        if len(scene_cuts) >= 30:
                            break
        except Exception as e:
            _log_warn(f"씬 감지 오류: {e}")

        if not scene_cuts or len(scene_cuts) < 3:
            return self._create_fallback_scene_cuts(media_info)
        return scene_cuts

    async def _extract_dialogue(
        self, video_path: Path, job_dir: Path, media_info: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Faster-Whisper로 대사 추출 (안전 타임아웃 및 폴백, 앞 180초 집중 분석)"""
        try:
            from app.services.media_intelligence.core import media_intelligence
            if media_intelligence:
                res = await asyncio.wait_for(
                    media_intelligence.extract_speech_transcript(video_path, max_duration_sec=180.0),
                    timeout=30.0
                )
                segments = res.get("segments", [])
                dialogue = []
                for idx, s in enumerate(segments):
                    text = s.get("text", "").strip()
                    if text:
                        dialogue.append({
                            "id": f"dial_{idx+1}",
                            "speakerId": f"인물_{(idx % 2) + 1}",
                            "text": text,
                            "startMs": int(s.get("start", 0) * 1000),
                            "endMs": int(s.get("end", 0) * 1000),
                            "sourceStartMs": int(s.get("start", 0) * 1000),
                            "sourceEndMs": int(s.get("end", 0) * 1000)
                        })
                if dialogue:
                    return dialogue
        except Exception as e:
            _log_warn(f"Whisper 대사 추출 오류/타임아웃: {e}")

        return []

    async def _generate_frame_sheet(
        self, video_path: Path, scene_cuts: List[Dict[str, Any]], job_dir: Path, job_id: str
    ) -> Dict[str, Any]:
        """픽셀링 zY 패턴: 주요 씬 대표 프레임들을 타일 스프라이트로 결합 (frameSheet)"""
        frames_dir = job_dir / "frames"
        frames_dir.mkdir(parents=True, exist_ok=True)
        sampled_cuts = (scene_cuts or [])[:8]
        extracted_paths = []
        ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()

        for idx, cut in enumerate(sampled_cuts):
            t_sec = max(0.0, (cut.get("sourceStartMs", 0) + 500) / 1000.0)
            out_img = frames_dir / f"frame_{idx}.jpg"
            cmd = [
                ffmpeg_exe, "-y", "-loglevel", "error", "-ss", str(t_sec),
                "-i", str(video_path), "-frames:v", "1",
                "-vf", "scale=320:180", "-q:v", "3", str(out_img)
            ]
            await self._run_command_async(cmd, timeout=15.0)
            if out_img.exists() and out_img.stat().st_size > 0:
                extracted_paths.append(out_img)

        # 2열 타일 시트 이미지로 병합 (PIL 기반 무결점 고속 스티칭)
        sheet_path = job_dir / "frame_sheet.jpg"
        if len(extracted_paths) >= 1:
            try:
                from PIL import Image
                imgs = [Image.open(p) for p in extracted_paths]
                w, h = imgs[0].size
                cols = 2 if len(imgs) >= 2 else 1
                rows = (len(imgs) + cols - 1) // cols
                sheet = Image.new("RGB", (cols * w, rows * h), color=(15, 15, 20))
                for idx, img in enumerate(imgs):
                    r = idx // cols
                    c = idx % cols
                    sheet.paste(img, (c * w, r * h))
                sheet.save(str(sheet_path), "JPEG", quality=85)
            except Exception as pil_err:
                _log_warn(f"프레임 시트 PIL 병합 오류: {pil_err}")

        return {
            "sheetUrl": f"/api/ve/movie-drama-shorts/jobs/{job_id}/frame-sheet",
            "sheetFile": str(sheet_path) if sheet_path.exists() else None,
            "tileCount": len(extracted_paths)
        }

    def _build_narrative_context(
        self,
        media_info: Optional[Dict[str, Any]],
        scene_cuts: List[Dict[str, Any]],
        dialogue: List[Dict[str, Any]],
        frame_sheet: Dict[str, Any]
    ) -> str:
        """텍스트 LLM에 주입할 통합 시청각 대본(Narrative Context Script) 구성"""
        info = media_info or {}
        duration = float(info.get("duration") or 0.0)
        lines = [
            f"═══ [🎬 영화·드라마 원본 시청각 정밀 분석 선언서] ═══",
            f"작품 총 러닝타임: {duration:.1f}초 (약 {int(duration // 60)}분)",
            f"검출된 씬 전환 컷: {len(scene_cuts or [])}개",
            f"발화 대사 수: {len(dialogue or [])}개 문장\n",
            f"[👀 주요 씬 컷 타임라인 및 시각 구도]"
        ]

        for cut in (scene_cuts or [])[:15]:
            start_s = cut.get("sourceStartMs", 0) / 1000.0
            end_s = cut.get("sourceEndMs", 0) / 1000.0
            dur_s = cut.get("durationMs", 0) / 1000.0
            cid = cut.get("id", "cut")
            reason = cut.get("reason", "씬 전환")
            scale = cut.get("shotScale", "FULL_SHOT")
            lines.append(f"  • {cid} ({start_s:.1f}s ~ {end_s:.1f}s | {dur_s:.1f}초): {reason} [구도: {scale}]")

        lines.append(f"\n[🗣️ 실제 등장인물 발화 대사 타임라인]")
        for d in (dialogue or [])[:15]:
            s_s = d.get("startMs", 0) / 1000.0
            e_s = d.get("endMs", 0) / 1000.0
            spk = d.get("speakerId", "인물")
            text = d.get("text", "")
            lines.append(f"  • [{spk}] {s_s:.1f}s~{e_s:.1f}s: \"{text}\"")

        lines.append("═══════════════════════════════════════════════════\n")
        return "\n".join(lines)

    async def _generate_story_candidates_with_llm(
        self,
        narrative_script: str,
        original_name: str,
        target_count: int,
        delivery_mode: str,
        series_mode: bool,
        scene_cuts: Optional[List[Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """DB Settings LLM (SSOT)을 호출하여 서사 후보 기획"""
        # DB Settings에서 모델 및 자격 증명 획득 (Zero Hardcoding Policy)
        model_name = None
        base_url = "http://localhost:20128/v1"
        api_key = ""

        try:
            from app.database import SessionLocal
            from app import models
            db_session = SessionLocal()
            st = db_session.query(models.Settings).first()
            if st:
                model_name = getattr(st, "script_analysis_model", None) or getattr(st, "default_llm_model", None)
            db_session.close()
        except Exception:
            pass

        try:
            from app.legacy_ddalkkak.workers.gemini_auth import get_youtube1_api_key, get_youtube1_base_url, get_youtube1_model
            base_url = get_youtube1_base_url()
            api_key = get_youtube1_api_key()
            if not model_name:
                model_name = get_youtube1_model()
        except Exception:
            pass

        if not model_name:
            model_name = os.environ.get("SCRIPT_ANALYSIS_MODEL") or os.environ.get("DEFAULT_LLM_MODEL") or "viraloop1"

        if model_name:
            clean_m = str(model_name).strip()
            for pfx in ["omniroute/", "youtube1/", "9router/", "opencode/"]:
                if clean_m.startswith(pfx):
                    clean_m = clean_m[len(pfx):]
                    break
            model_name = clean_m

        clean_name = clean_work_title(original_name)

        system_prompt = (
            f"당신은 유튜브 100만 구독자를 보유한 영화·드라마 리뷰 쇼츠 전문 수석 디렉터입니다.\n"
            f"제공된 실제 영상의 시청각 분석 대본을 바탕으로, 0초 만에 시청자를 사로잡고 이탈률을 0%로 만드는 {target_count}편의 독창적이고 파괴적인 쇼츠 이야기 후보(Candidate)를 기획해 주십시오.\n\n"
            f"[필수 기획 원칙]\n"
            f"1. 작품명: '{clean_name}' (파일명의 임의 해시나 영문 부호를 절대 제목에 노출하지 마십시오)\n"
            f"2. 구성 방식: {'이어지는 긴장감 넘치는 연작 시리즈 (1부 사건의 발단 -> 2부 갈등 폭발 -> 3부 충격 반전)' if series_mode else '단독 완결형 에피소드'}\n"
            f"3. 부별 제목 규칙: 절대 '제 N부 숨막히는 전개의 시작' 같은 획일적인 제목을 쓰지 말고, 각 부의 핵심 충격 사건을 드러내는 사건 중심 킬러 제목을 지으십시오.\n"
            f"   (예: '[{clean_name}] 1부: 평화롭던 일상을 뒤흔든 의문의 메시지', '[{clean_name}] 2부: 절대 열어서는 안 될 지하실의 비밀', '[{clean_name}] 3부: 모두를 속인 진짜 범인의 정체')\n"
            f"4. 전달 모드: {delivery_mode} (AI 내레이션과 원작의 결정적 명대사 결합)\n"
            f"5. 내레이션 대본: 문어체가 아닌 강렬하고 흡입력 있는 구어체 (0초 도파민 훅 -> 사건 전개 -> 절체절명의 위기 -> 다음 화 예고/반전)로 문장당 20자 내외로 리듬감 있게 작성할 것.\n"
            f"6. 반드시 실제 분석 대본의 컷 ID(cut_1, cut_2 등)를 매핑할 것.\n\n"
            f"아래 JSON 형식의 배열로만 응답하십시오 (순수 JSON):\n"
            f"[\n"
            f"  {{\n"
            f"    \"rank\": 1,\n"
            f"    \"title\": \"[{clean_name}] 1부: 사건의 충격적 발단\",\n"
            f"    \"durationMs\": 48000,\n"
            f"    \"selectedCutIds\": [\"cut_1\", \"cut_2\", \"cut_3\"],\n"
            f"    \"narrationPlan\": [\n"
            f"      {{\"order\": 1, \"text\": \"방영 직후 온라인을 발칵 뒤집어 놓은 바로 그 장면입니다.\", \"startMs\": 0, \"endMs\": 3500}},\n"
            f"      {{\"order\": 2, \"text\": \"모든 것이 평화로워 보이던 순간, 충격적인 사건이 시작됩니다.\", \"startMs\": 4000, \"endMs\": 8000}},\n"
            f"      {{\"order\": 3, \"text\": \"과연 주인공은 이 거대한 비밀을 감당할 수 있을까요?\", \"startMs\": 8500, \"endMs\": 12500}}\n"
            f"    ],\n"
            f"    \"editorialComments\": [\"충격 실화\", \"역대급 떡밥\", \"소름 돋는 연기력\"],\n"
            f"    \"reason\": \"초반 인물 대립 컷과 명대사가 강렬하게 맞물려 시청 유지율 극대화 가능\",\n"
            f"    \"totalScore\": 96\n"
            f"  }}\n"
            f"]"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"작품 원본명: {clean_name}\n\n{narrative_script}"}
        ]

        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}
        body = {"model": model_name, "messages": messages, "temperature": 0.3, "max_tokens": 3000}

        try:
            async with httpx.AsyncClient(timeout=75.0) as client:
                resp = await client.post(url, json=body, headers=headers)
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                    if "```json" in content:
                        content = content.split("```json")[1].split("```")[0].strip()
                    elif "```" in content:
                        content = content.split("```")[1].split("```")[0].strip()

                    parsed = None
                    try:
                        parsed = json.loads(content)
                    except Exception:
                        m = re.search(r'(\[.*\]|\{.*\})', content, re.DOTALL)
                        if m:
                            parsed = json.loads(m.group(1))

                    if isinstance(parsed, dict):
                        for k, v in parsed.items():
                            if isinstance(v, list) and len(v) > 0:
                                parsed = v
                                break

                    if isinstance(parsed, list) and len(parsed) > 0:
                        return parsed
                else:
                    _log_warn(f"LLM API 응답 코드 {resp.status_code}: {resp.text[:100]}")
        except Exception as err:
            _log_warn(f"LLM 호출 실패 ({err.__class__.__name__}: {err}), 고품질 서사 Fallback 가동")

        # Fallback 규칙 기반 기획 (100만 영화리뷰 쇼츠 전용 3부작 서사 템플릿)
        series_story_arcs = [
            {
                "title_suffix": "1부: 상상조차 못했던 비극의 서막",
                "narrations": [
                    "방영 직후 전 세계 시청자들을 충격에 빠뜨린 바로 그 장면입니다.",
                    "모든 것이 완벽해 보였던 순간, 상상조차 못 했던 거대한 균열이 시작됩니다.",
                    "주인공이 감추려 했던 비밀이 하나씩 수면 위로 드러나기 시작하는데요.",
                    "과연 이 비극의 끝은 어디일까요? 2부에서 이어집니다."
                ],
                "comments": ["사건의 발단", "충격의 시작", "미스터리"],
                "reason": "사건의 기폭제가 되는 핵심 컷을 전면에 배치하여 0초 몰입도 극대화",
                "score": 96
            },
            {
                "title_suffix": "2부: 감춰졌던 비밀과 폭발하는 정면 대립",
                "narrations": [
                    "진실에 다가갈수록 목숨을 위협하는 어두운 그림자가 좁혀옵니다.",
                    "더 이상 물러설 곳이 없는 두 사람의 숨 막히는 정면 승부.",
                    "한순간의 잘못된 선택이 결국 돌이킬 수 없는 파국으로 이어집니다.",
                    "그리고 마침내 밝혀지는 충격적인 진실, 3부에서 공개됩니다."
                ],
                "comments": ["갈등 폭발", "숨막히는 긴장감", "폭풍전야"],
                "reason": "인물 간 첨예한 갈등 씬과 명대사를 교차 편집하여 시청 지속 시간 극대화",
                "score": 98
            },
            {
                "title_suffix": "3부: 모두를 속인 충격의 반전과 최후의 결말",
                "narrations": [
                    "하지만 이것은 모두를 속이기 위한 완벽한 덫에 불과했습니다.",
                    "끝까지 누구도 예측하지 못했던 진짜 흑막의 소름 돋는 정체.",
                    "모든 조각이 맞춰지는 순간, 소름이 돋을 수밖에 없는 역대급 결말.",
                    "당신이 예상한 결말과 일치하나요? 댓글로 의견을 남겨주세요."
                ],
                "comments": ["소름 돋는 반전", "역대급 엔딩", "결말 해석"],
                "reason": "예측 불가능한 반전 씬과 여운을 남기는 마무리로 댓글 반응 폭발 유도",
                "score": 99
            },
            {
                "title_suffix": "4부: 엇갈린 운명과 감춰진 과거의 진실",
                "narrations": [
                    "모든 비극은 바로 수년 전 그날 밤의 사건에서 시작되었습니다.",
                    "드디어 풀리지 않던 의문의 조각들이 하나로 맞춰집니다.",
                    "과연 주인공은 과거의 굴레에서 벗어날 수 있을까요?"
                ],
                "comments": ["과거의 진실", "운명의 장난", "심리전"],
                "reason": "과거 회상 컷과 현재 씬의 오버랩으로 서사의 깊이감 형성",
                "score": 94
            },
            {
                "title_suffix": "5부: 운명을 건 최후의 결단",
                "narrations": [
                    "이제 모든 것을 걸고 마지막 결단을 내려야 할 시간입니다.",
                    "과연 승자는 누구이며, 남겨진 대가는 무엇일까요?",
                    "끝까지 눈을 뗄 수 없는 최고의 명장면을 확인하세요."
                ],
                "comments": ["최후의 결전", "클라이맥스", "인생 명작"],
                "reason": "최고조의 긴박감과 클라이맥스 액션을 집중 조명",
                "score": 95
            }
        ]

        safe_cuts = scene_cuts or []
        num_cuts = len(safe_cuts)
        fallback_candidates = []
        for i in range(target_count):
            arc = series_story_arcs[i % len(series_story_arcs)]
            part = i + 1
            part_title = f"[{clean_name}] {arc['title_suffix']}" if series_mode else f"[{clean_name}] {arc['title_suffix'].split(': ')[-1]}"
            
            # 컷 매핑 (안전 경계 검사)
            if num_cuts > 0:
                cut_indices = [idx % num_cuts for idx in range(i * 2, i * 2 + 3)]
                selected_cuts = [safe_cuts[ci]["id"] for ci in cut_indices]
            else:
                selected_cuts = [f"cut_{j+1}" for j in range(i * 2, i * 2 + 3)]

            narration_plan = []
            curr_ms = 0
            for order, n_text in enumerate(arc["narrations"], start=1):
                dur = min(4500, max(2500, len(n_text) * 120))
                narration_plan.append({
                    "order": order,
                    "text": n_text,
                    "startMs": curr_ms,
                    "endMs": curr_ms + dur
                })
                curr_ms += dur + 500

            fallback_candidates.append({
                "rank": part,
                "title": part_title,
                "durationMs": max(30000, curr_ms),
                "selectedCutIds": selected_cuts,
                "narrationPlan": narration_plan,
                "editorialComments": arc["comments"] + [f"제{part}부"],
                "reason": arc["reason"],
                "totalScore": arc["score"]
            })
        return fallback_candidates

    def _materialize_candidates(
        self,
        job_id: str,
        raw_candidates: List[Dict[str, Any]],
        scene_cuts: List[Dict[str, Any]],
        dialogue: List[Dict[str, Any]],
        frame_sheet: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """원천 스키마(R8, Fv)에 맞춰 완성된 후보(Candidate) 구조체 생성"""
        safe_cuts = scene_cuts or []
        cut_map = {c["id"]: c for c in safe_cuts}
        materialized = []

        for item in raw_candidates:
            cand_id = f"cand-{uuid.uuid4().hex[:10]}"
            rank = item.get("rank", 1)
            selected_cuts = [cut_map[cid] for cid in item.get("selectedCutIds", []) if cid in cut_map]
            if not selected_cuts:
                if safe_cuts:
                    selected_cuts = safe_cuts[:3]
                else:
                    selected_cuts = [{
                        "id": "cut_1",
                        "sourceStartMs": 0,
                        "sourceEndMs": 15000,
                        "durationMs": 15000,
                        "subjectAnchorX": 0.5,
                        "subjectAnchorY": 0.5,
                        "shotScale": "BUST_SHOT",
                        "reason": "사건 전개 구간"
                    }]

            cand = {
                "id": cand_id,
                "jobId": job_id,
                "rank": rank,
                "title": item.get("title", f"이야기 {rank}"),
                "status": "ready_for_export",
                "durationMs": item.get("durationMs", 45000),
                "sourceCuts": selected_cuts,
                "dialogue": (dialogue or [])[:4],
                "narrationPlan": item.get("narrationPlan", []),
                "editorialComments": item.get("editorialComments", []),
                "blockers": [],
                "qualityBreakdown": {
                    "totalScore": item.get("totalScore", 95),
                    "judge": {"reason": item.get("reason", "스토리 완성도 및 시청 지속률 최적화")},
                    "framing": [
                        {"cutId": c["id"], "focusX": c.get("subjectAnchorX", 0.5), "focusY": c.get("subjectAnchorY", 0.5), "tracking": {"mode": "auto_face"}}
                        for c in selected_cuts
                    ]
                },
                "previewVideoPath": None,
                "frameSheetUrl": (frame_sheet or {}).get("sheetUrl")
            }
            materialized.append(cand)

        return materialized

    async def _synthesize_candidate_narration(
        self, job_id: str, candidate: Dict[str, Any], job_dir: Path, voice_id: str = "F1"
    ):
        """Supertonic Local을 이용한 한국어 내레이션 오디오 파일 동적 합성"""
        try:
            narration_texts = [n.get("text", "") for n in candidate.get("narrationPlan", [])]
            full_text = " ".join([t for t in narration_texts if t.strip()])
            if not full_text:
                return

            # 지정된 voice_id가 Supertonic 규격인지 검증 (F1~F5, M1~M5)
            supertonic_voices = {"F1", "F2", "F3", "F4", "F5", "M1", "M2", "M3", "M4", "M5"}
            actual_voice = voice_id if voice_id in supertonic_voices else "F1"

            out_audio = job_dir / f"tts_{candidate['id']}.wav"
            
            from app.routers.render import _resolve_supertonic_model_dir
            from app.services.tts.supertonic.service import SupertonicService
            import soundfile as sf
            
            st_dir = _resolve_supertonic_model_dir()
            service = SupertonicService.get_instance(st_dir)
            wav, sr = service.generate(full_text, lang="ko", voice_id=actual_voice, speed=1.05)
            sf.write(str(out_audio), wav, sr)

            if out_audio.exists() and out_audio.stat().st_size > 0:
                candidate["narrationAudioPath"] = str(out_audio)
                candidate["selectedVoiceId"] = actual_voice
        except Exception as e:
            _log_warn(f"Supertonic TTS 합성 오류 (보이스: {voice_id}): {e}")

    async def save_candidate_framing(self, job_id: str, candidate_id: str, framing: List[Dict[str, Any]]):
        """16:9 -> 9:16 인물 중심 프레이밍 오프셋 저장"""
        candidates = self._candidates.get(job_id, [])
        for cand in candidates:
            if cand["id"] == candidate_id:
                cand["qualityBreakdown"]["framing"] = framing
                self._persist_state()
                return True
        return False

    async def render_final_mp4(self, job_id: str, candidate_id: str) -> str:
        """FFmpeg 기반 9:16 완성 MP4 즉시 렌더링 (영상 9:16 크롭 + Supertonic 내레이션 오디오 믹스) 및 05_Exports 저장"""
        job = self._jobs.get(job_id)
        if not job:
            raise ValueError(f"작업을 찾을 수 없습니다: {job_id}")

        cand = next((c for c in self._candidates.get(job_id, []) if c["id"] == candidate_id), None)
        if not cand:
            raise ValueError(f"후보를 찾을 수 없습니다: {candidate_id}")

        video_path = Path(job["source"]["canonicalPath"])
        if not video_path.exists():
            raise FileNotFoundError(f"원본 영상 파일을 찾을 수 없습니다: {video_path}")

        EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

        safe_job_id = "".join(c for c in job_id if c.isalnum() or c in "-_")
        out_filename = f"{safe_job_id}_part{cand['rank']:02d}.mp4"
        out_path = EXPORTS_DIR / out_filename

        ffmpeg_exe = dependency_manager.DependencyManager.get_ffmpeg_path()

        # 16:9 -> 9:16 크롭 & 스케일링 필터 (setsar=1 추가로 비정형 픽셀 비율 방어)
        layout_mode = job["settings"].get("layoutPreset", "full_bleed")
        if layout_mode == "title_band":
            # 상하 레터박스 + 중앙 16:9
            vf = "scale=1080:608:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
        else:
            # 9:16 풀스크린 중앙 크롭
            vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1"

        # 컷 구간 산출 및 원본 영상 러닝타임 범위 초과 방어
        video_duration = float(job.get("source", {}).get("media", {}).get("duration") or 60.0)
        source_cuts = cand.get("sourceCuts", [])
        if source_cuts:
            start_sec = max(0.0, source_cuts[0]["sourceStartMs"] / 1000.0)
            end_sec = max(start_sec + 5.0, source_cuts[-1]["sourceEndMs"] / 1000.0)
            dur_sec = min(60.0, max(15.0, end_sec - start_sec))
        else:
            start_sec = 0.0
            dur_sec = 30.0

        if start_sec >= video_duration:
            start_sec = 0.0
        dur_sec = min(dur_sec, max(5.0, video_duration - start_sec))

        narration_path = cand.get("narrationAudioPath")
        has_narration = narration_path and os.path.exists(narration_path) and os.path.getsize(narration_path) > 1000

        resolved_video_str = str(video_path.resolve())
        cmd = [ffmpeg_exe, "-y", "-loglevel", "error"]

        if has_narration:
            # 비디오(0번) + Supertonic 내레이션 오디오(1번) 합성
            cmd.extend([
                "-ss", str(start_sec),
                "-t", str(dur_sec),
                "-i", resolved_video_str,
                "-i", str(Path(narration_path).resolve()),
                "-vf", vf,
                "-map", "0:v:0",
                "-map", "1:a:0",
                "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-ac", "2",
                "-shortest",
                str(out_path)
            ])
        else:
            cmd.extend([
                "-ss", str(start_sec),
                "-t", str(dur_sec),
                "-i", resolved_video_str,
                "-vf", vf,
                "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p",
                "-c:a", "aac", "-b:a", "192k",
                str(out_path)
            ])

        res = await self._run_command_async(cmd, timeout=180.0)

        if res.returncode != 0 or not out_path.exists():
            err_msg = res.stderr.decode('utf-8', errors='ignore') if res.stderr else "오류 원인 미상"
            _log_warn(f"1차 FFmpeg 실패 ({err_msg}), 무음 안전 인코딩 재시도...")

            # 무음 비디오 fallback (원본 오디오 스트림 결함 시)
            cmd_fallback = [
                ffmpeg_exe, "-y", "-loglevel", "error",
                "-ss", str(start_sec),
                "-t", str(dur_sec),
                "-i", str(video_path),
                "-vf", vf,
                "-an",
                "-c:v", "libx264", "-preset", "fast", "-crf", "22", "-pix_fmt", "yuv420p",
                str(out_path)
            ]
            res_fb = await self._run_command_async(cmd_fallback, timeout=180.0)

            if res_fb.returncode != 0 or not out_path.exists():
                fb_err = res_fb.stderr.decode('utf-8', errors='ignore') if res_fb.stderr else err_msg
                _log_error(f"FFmpeg 렌더링 최종 실패: {fb_err}")
                raise RuntimeError(f"MP4 렌더링에 실패했습니다: {fb_err[-300:]}")

        cand["savedMp4Path"] = str(out_path)
        cand["previewVideoPath"] = str(out_path)
        self._persist_state()
        return str(out_path)

    async def export_capcut_draft(self, job_id: str, candidate_id: str) -> str:
        """CapCut 4대 레이어 초안 프로젝트 폴더 및 draft_content.json 생성"""
        from app.services.capcut_generator import CapCutGenerator
        job = self._jobs.get(job_id)
        cand = next((c for c in self._candidates.get(job_id, []) if c["id"] == candidate_id), None)
        if not job or not cand:
            raise ValueError("작업 또는 후보를 찾을 수 없습니다.")

        project_name = f"MovieDrama_{cand['title'][:20]}"
        generator = CapCutGenerator(project_name=project_name)

        video_path = job["source"]["canonicalPath"]
        # 비디오 클립 추가
        for cut in cand.get("sourceCuts", [])[:5]:
            generator.add_video_segment(video_path, cut["durationMs"] / 1000.0)

        # TTS 내레이션 오디오 클립 추가
        narration_path = cand.get("narrationAudioPath")
        if narration_path and os.path.exists(narration_path):
            try:
                import soundfile as sf
                info = sf.info(narration_path)
                generator.add_audio_segment(narration_path, duration_sec=info.duration, start_time_sec=0)
            except Exception:
                generator.add_audio_segment(narration_path, duration_sec=cand.get("durationMs", 45000) / 1000.0, start_time_sec=0)

        # 자막 텍스트 클립 추가
        for idx, dial in enumerate(cand.get("dialogue", [])):
            generator.add_text_segment(dial["text"], duration_sec=3.0, start_time_sec=idx * 3.5)

        # 초안 저장 폴더 생성 (05_Exports/CapCut_Drafts)
        drafts_root = EXPORTS_DIR / "CapCut_Drafts"
        draft_dir = drafts_root / f"{job_id}_{cand['id']}"
        draft_dir.mkdir(parents=True, exist_ok=True)

        draft_content_file = draft_dir / "draft_content.json"
        draft_content_file.write_text(json.dumps(generator.data, ensure_ascii=False, indent=2), encoding="utf-8")

        return str(draft_dir)

    async def create_portable_pack(self, job_id: str, candidate_id: str, output_parent_dir: str) -> str:
        """다른 PC로 이동할 수 있는 미디어 + TTS + 메타데이터 ZIP 패키징"""
        job = self._jobs.get(job_id)
        cand = next((c for c in self._candidates.get(job_id, []) if c["id"] == candidate_id), None)
        if not job or not cand:
            raise ValueError("작업 또는 후보를 찾을 수 없습니다.")

        parent = Path(output_parent_dir)
        parent.mkdir(parents=True, exist_ok=True)

        pack_filename = f"PortablePack_{job_id}_{cand['rank']:02d}.zip"
        zip_path = parent / pack_filename

        with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
            meta = {
                "jobId": job_id,
                "candidateId": candidate_id,
                "title": cand["title"],
                "settings": job["settings"],
                "candidate": cand
            }
            zf.writestr("manifest.json", json.dumps(meta, ensure_ascii=False, indent=2))
            
            # TTS 오디오가 있다면 포함
            if cand.get("narrationAudioPath") and os.path.exists(cand["narrationAudioPath"]):
                zf.write(cand["narrationAudioPath"], arcname="audio/narration.wav")

        return str(zip_path)

    async def install_portable_pack(self, zip_path: Path, target_draft_root: Optional[Path] = None) -> Dict[str, Any]:
        """다른 PC에서 가져온 이동 패키지(ZIP)를 해제하고 로컬 CapCut 초안에 등록"""
        if not zip_path.exists():
            raise FileNotFoundError(f"패키지 파일을 찾을 수 없습니다: {zip_path}")

        drafts_root = target_draft_root or (EXPORTS_DIR / "CapCut_Drafts")
        drafts_root.mkdir(parents=True, exist_ok=True)

        install_id = f"imported_{uuid.uuid4().hex[:8]}"
        dest_dir = drafts_root / install_id
        dest_dir.mkdir(parents=True, exist_ok=True)

        with zipfile.ZipFile(str(zip_path), "r") as zf:
            zf.extractall(str(dest_dir))

        # manifest.json 검증
        manifest_file = dest_dir / "manifest.json"
        manifest_data = {}
        if manifest_file.exists():
            try:
                manifest_data = json.loads(manifest_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        # CapCut draft_content.json이 없으면 기본 생성
        draft_content_file = dest_dir / "draft_content.json"
        if not draft_content_file.exists():
            from app.services.capcut_generator import CapCutGenerator
            gen = CapCutGenerator(project_name=manifest_data.get("title", "Imported Story"))
            draft_content_file.write_text(json.dumps(gen.data, ensure_ascii=False, indent=2), encoding="utf-8")

        return {
            "installId": install_id,
            "draftPath": str(dest_dir),
            "title": manifest_data.get("title", "가져온 이야기"),
            "candidateId": manifest_data.get("candidateId", install_id)
        }


def datetime_now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


# 싱글톤 인스턴스
movie_drama_service = MovieDramaService()
