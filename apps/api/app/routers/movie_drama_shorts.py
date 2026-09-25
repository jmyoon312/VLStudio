"""
ViraLoop Studio - 영화·드라마 쇼츠 (Movie Drama Shorts / Story Studio) FastAPI 라우터
픽셀링 원천 z4(Story Studio) 100% 독립 주권 라우터
"""

from fastapi import APIRouter, HTTPException, Body, File, UploadFile
from fastapi.responses import FileResponse
from typing import Dict, Any, Optional, List
import logging
import uuid
from pathlib import Path
from app.services.movie_drama_service import (
    movie_drama_service,
    MOVIE_DRAMA_WORK_DIR,
    INBOX_DIR,
    EXPORTS_DIR
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/voices")
async def api_movie_drama_list_voices():
    """영화·드라마 쇼츠 전용 최적화 AI 보이스 카탈로그 (Supertonic Local, Kokoro, DB Settings)"""
    import os
    base_voices = [
        {
            "id": "F1",
            "name": "서연 (수퍼토닉)",
            "gender": "female",
            "category": "스토리텔러",
            "tag": "추천 1위",
            "description": "몰입감 높은 여성 스토리텔러, 감정 전달력 최상",
            "engine": "supertone-local"
        },
        {
            "id": "M1",
            "name": "민준 (수퍼토닉)",
            "gender": "male",
            "category": "다큐멘터리",
            "tag": "인기",
            "description": "신뢰감 있는 다큐멘터리 & 진지한 사건 해설",
            "engine": "supertone-local"
        },
        {
            "id": "M2",
            "name": "도윤 (수퍼토닉)",
            "gender": "male",
            "category": "추리·분석",
            "tag": "지적",
            "description": "차분하고 지적인 톤, 범죄·미스터리 분석 최적화",
            "engine": "supertone-local"
        },
        {
            "id": "M3",
            "name": "하준 (수퍼토닉)",
            "gender": "male",
            "category": "스릴러",
            "tag": "긴박감",
            "description": "긴박한 스릴러·액션 씬의 숨막히는 전개",
            "engine": "supertone-local"
        },
        {
            "id": "M4",
            "name": "시우 (수퍼토닉)",
            "gender": "male",
            "category": "중후함",
            "tag": "신뢰",
            "description": "깊은 울림과 호소력 있는 중년 남성 내레이션",
            "engine": "supertone-local"
        },
        {
            "id": "M5",
            "name": "태오 (수퍼토닉)",
            "gender": "male",
            "category": "임팩트",
            "tag": "파워",
            "description": "단단하고 힘 있는 에너지의 액션·반전 내레이션",
            "engine": "supertone-local"
        },
        {
            "id": "F2",
            "name": "지아 (수퍼토닉)",
            "gender": "female",
            "category": "자연스러움",
            "tag": "구어체",
            "description": "친구에게 들려주듯 편안하고 생생한 구어체",
            "engine": "supertone-local"
        },
        {
            "id": "F3",
            "name": "유나 (수퍼토닉)",
            "gender": "female",
            "category": "감성",
            "tag": "드라마",
            "description": "밝고 섬세한 감정선의 드라마·로맨스 리뷰",
            "engine": "supertone-local"
        },
        {
            "id": "F4",
            "name": "수아 (수퍼토닉)",
            "gender": "female",
            "category": "차분함",
            "tag": "미스터리",
            "description": "차분하고 은밀한 긴장감을 주는 속삭임 톤",
            "engine": "supertone-local"
        },
        {
            "id": "F5",
            "name": "채원 (수퍼토닉)",
            "gender": "female",
            "category": "생동감",
            "tag": "트렌디",
            "description": "트렌디하고 명확한 딕션의 현대극 쇼츠 최적화",
            "engine": "supertone-local"
        },
        {
            "id": "ko_female_1",
            "name": "혜진 (코코로)",
            "gender": "female",
            "category": "표준",
            "tag": "뉴럴",
            "description": "정돈되고 맑은 표준 한국어 코코로 음성",
            "engine": "kokoro"
        },
        {
            "id": "ko_male_1",
            "name": "정우 (코코로)",
            "gender": "male",
            "category": "표준",
            "tag": "뉴럴",
            "description": "안정감 있고 단단한 표준 한국어 남성 코코로 음성",
            "engine": "kokoro"
        }
    ]
    # DB Settings에 ElevenLabs API 키가 등록되어 있으면 ElevenLabs 추천 보이스 추가 서빙
    try:
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        settings_row = db.query(models.Settings).first()
        elevenlabs_keys = getattr(settings_row, "elevenlabs_api_keys", None) or os.environ.get("ELEVENLABS_API_KEY")
        if elevenlabs_keys:
            base_voices.append({
                "id": "eleven_rachel",
                "name": "레이첼 (일레븐랩스)",
                "gender": "female",
                "category": "글로벌",
                "tag": "ElevenLabs",
                "description": "부드럽고 자연스러운 고품질 글로벌 AI 보이스",
                "engine": "elevenlabs"
            })
            base_voices.append({
                "id": "eleven_adam",
                "name": "아담 (일레븐랩스)",
                "gender": "male",
                "category": "글로벌",
                "tag": "ElevenLabs",
                "description": "깊고 풍부한 중저음 다큐멘터리 AI 보이스",
                "engine": "elevenlabs"
            })
        db.close()
    except Exception:
        pass

    return base_voices


@router.post("/jobs")
async def api_movie_drama_create_job(payload: Dict[str, Any] = Body(...)):
    """신규 영화·드라마 쇼츠 분석 작업 생성 및 백그라운드 발주"""
    video_path = payload.get("videoPath") or payload.get("video_path")
    if not video_path:
        raise HTTPException(status_code=400, detail="videoPath가 필요합니다.")

    target_count = payload.get("targetShortsCount", 3)
    delivery_mode = payload.get("deliveryMode", "full_tts")
    layout_preset = payload.get("layoutPreset", "full_bleed")
    series_mode = payload.get("seriesMode", True)
    rights_confirmed = payload.get("rightsConfirmed", True)
    style_settings = payload.get("styleSettings", {})

    try:
        job = await movie_drama_service.create_job(
            video_path_str=video_path,
            target_shorts_count=target_count,
            delivery_mode=delivery_mode,
            layout_preset=layout_preset,
            series_mode=series_mode,
            rights_confirmed=rights_confirmed,
            style_settings=style_settings
        )
        return job
    except Exception as e:
        logger.error(f"[MovieDrama API] Create job error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs")
async def api_movie_drama_list_jobs():
    """영화·드라마 쇼츠 작업 목록 조회"""
    try:
        return movie_drama_service.list_jobs()
    except Exception as e:
        logger.error(f"[MovieDrama API] List jobs error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}")
async def api_movie_drama_get_job(job_id: str):
    """영화·드라마 쇼츠 작업 상세 및 진행 상태 조회"""
    job = movie_drama_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")
    return job


@router.get("/jobs/{job_id}/candidates")
async def api_movie_drama_get_candidates(job_id: str):
    """영화·드라마 쇼츠 작업의 후보(Candidate) 목록 조회"""
    try:
        return movie_drama_service.get_candidates(job_id)
    except Exception as e:
        logger.error(f"[MovieDrama API] Get candidates error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/jobs/{job_id}/frame-sheet")
async def api_movie_drama_get_frame_sheet(job_id: str):
    """픽셀링 zY 패턴 프레임 시트 이미지 서빙"""
    sheet_file = MOVIE_DRAMA_WORK_DIR / job_id / "frame_sheet.jpg"
    if not sheet_file.exists():
        raise HTTPException(status_code=404, detail="프레임 시트를 찾을 수 없습니다.")
    return FileResponse(str(sheet_file), media_type="image/jpeg")


@router.post("/jobs/{job_id}/candidates/{candidate_id}/framing")
async def api_movie_drama_save_framing(job_id: str, candidate_id: str, payload: Dict[str, Any] = Body(...)):
    """16:9 -> 9:16 인물 중심 프레이밍 오프셋 저장"""
    framing = payload.get("framing", [])
    try:
        success = await movie_drama_service.save_candidate_framing(job_id, candidate_id, framing)
        if not success:
            raise HTTPException(status_code=404, detail="후보를 찾을 수 없습니다.")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[MovieDrama API] Save framing error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/candidates/{candidate_id}/render")
async def api_movie_drama_render_mp4(job_id: str, candidate_id: str):
    """후보 9:16 완성 MP4 즉시 렌더링"""
    try:
        mp4_path = await movie_drama_service.render_final_mp4(job_id, candidate_id)
        return {
            "success": True,
            "savedPath": mp4_path,
            "previewUrl": f"/api/files/stream?path={mp4_path}",
            "downloadUrl": f"/api/files/stream?path={mp4_path}"
        }
    except ValueError as ve:
        logger.warning(f"[MovieDrama API] Candidate or job not found: {ve}")
        raise HTTPException(status_code=404, detail=str(ve))
    except FileNotFoundError as fe:
        logger.error(f"[MovieDrama API] Source video file not found: {fe}")
        raise HTTPException(status_code=400, detail=str(fe))
    except Exception as e:
        logger.error(f"[MovieDrama API] Render MP4 error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"MP4 렌더링 실패: {str(e)}")


@router.post("/jobs/{job_id}/candidates/{candidate_id}/capcut")
async def api_movie_drama_export_capcut(job_id: str, candidate_id: str):
    """CapCut 4대 레이어 초안 프로젝트 내보내기"""
    try:
        draft_path = await movie_drama_service.export_capcut_draft(job_id, candidate_id)
        return {"success": True, "draftPath": draft_path}
    except Exception as e:
        logger.error(f"[MovieDrama API] Export CapCut error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/jobs/{job_id}/candidates/{candidate_id}/portable-pack")
async def api_movie_drama_create_portable_pack(job_id: str, candidate_id: str, payload: Dict[str, Any] = Body(...)):
    """이동 패키지(Portable Pack) ZIP 파일 생성"""
    out_dir = payload.get("outputParent") or str(EXPORTS_DIR / "PortablePacks")
    try:
        pack_path = await movie_drama_service.create_portable_pack(job_id, candidate_id, out_dir)
        return {"success": True, "packPath": pack_path}
    except Exception as e:
        logger.error(f"[MovieDrama API] Create portable pack error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload-source")
async def api_movie_drama_upload_source(file: UploadFile = File(...)):
    """웹 브라우저 환경에서 원본 영상 파일을 01_Inbox로 업로드 수신"""
    safe_name = "".join(c for c in file.filename if c.isalnum() or c in " ._-")
    dest_path = INBOX_DIR / f"{uuid.uuid4().hex[:8]}_{safe_name}"

    try:
        with open(dest_path, "wb") as f:
            content = await file.read()
            f.write(content)

        info = await movie_drama_service.get_video_info(dest_path)
        return {
            "success": True,
            "canonicalPath": str(dest_path),
            "videoPath": str(dest_path),
            "filename": file.filename,
            "media": info
        }
    except Exception as e:
        logger.error(f"[MovieDrama API] Upload source error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/install-portable-pack")
async def api_movie_drama_install_portable_pack(file: UploadFile = File(...)):
    """다른 PC에서 가져온 이동 패키지(ZIP) 파일 업로드 및 CapCut 초안 등록"""
    temp_zip = MOVIE_DRAMA_WORK_DIR / f"temp_pack_{uuid.uuid4().hex[:8]}.zip"
    try:
        with open(temp_zip, "wb") as f:
            content = await file.read()
            f.write(content)

        res = await movie_drama_service.install_portable_pack(temp_zip)
        return {"success": True, **res}
    except Exception as e:
        logger.error(f"[MovieDrama API] Install portable pack error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_zip.exists():
            try:
                temp_zip.unlink()
            except Exception:
                pass


@router.post("/cancel")
async def api_movie_drama_cancel_job(payload: Dict[str, Any] = Body(...)):
    """영화·드라마 쇼츠 작업 취소"""
    job_id = payload.get("jobId")
    if job_id:
        movie_drama_service.cancel_job(job_id)
    return {"success": True}
