"""
ViraLoop Studio - 랭킹형 쇼츠 (Ranking Shorts) FastAPI 라우터
픽셀링 원천 8대 엔드포인트 완벽 대체 및 주권 로컬 연동
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Body
from typing import Dict, Any, Optional, List
import json
import logging
from app.services.ranking_pipeline import (
    analyze_ranking_source,
    generate_ranking_script,
    suggest_ranking_style,
    process_ranking_job,
    get_db_connection
)

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/analyze-source")
async def api_analyze_source(payload: Dict[str, Any] = Body(...)):
    """단일 영상에서 랭킹 주제/기준에 맞는 하이라이트 씬 및 대체 후보군 추출"""
    video_path = payload.get("videoPath")
    topic = payload.get("rankingTopic", "유튜브 랭킹")
    criteria = payload.get("rankingCriteria", "조회수/인기")
    scene_count = int(payload.get("sceneCount", 5))

    try:
        result = analyze_ranking_source(
            video_path=video_path,
            ranking_topic=topic,
            ranking_criteria=criteria,
            scene_count=scene_count
        )
        return result
    except Exception as e:
        logger.error(f"[Ranking API] Analyze source error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-script")
async def api_generate_script(payload: Dict[str, Any] = Body(...)):
    """랭킹 주제 및 기준으로부터 1위~5위 순위 대본 자동 구성"""
    topic = payload.get("rankingTopic", "유튜브 랭킹")
    criteria = payload.get("rankingCriteria", "인기도")
    item_count = int(payload.get("itemCount", 5))

    try:
        result = generate_ranking_script(
            ranking_topic=topic,
            ranking_criteria=criteria,
            item_count=item_count
        )
        return result
    except Exception as e:
        logger.error(f"[Ranking API] Generate script error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/style-suggestions")
async def api_style_suggestions(payload: Dict[str, Any] = Body(...)):
    """주제/대본에 적합한 9대 랭킹 템플릿 추천"""
    topic = payload.get("rankingTopic", "")
    criteria = payload.get("rankingCriteria", "")
    try:
        return suggest_ranking_style(topic=topic, criteria=criteria)
    except Exception as e:
        logger.error(f"[Ranking API] Style suggestion error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs")
async def api_create_job(payload: Dict[str, Any] = Body(...)):
    """랭킹 쇼츠 생성 작업 등록 및 CapCut 초안 조립 실행"""
    try:
        result = process_ranking_job(payload)
        return result
    except Exception as e:
        logger.error(f"[Ranking API] Create job error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
async def api_list_jobs():
    """랭킹 작업 목록 조회"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, batch_id, source_type, archetype, status, created_at, metadata, result_video_path
            FROM work_queue
            WHERE source_type = 'ranking-shorts' OR tab_id = 'ranking-shorts'
            ORDER BY created_at DESC
            LIMIT 50
        """)
        rows = cur.fetchall()
        conn.close()

        jobs = []
        for r in rows:
            jobs.append({
                "id": r["id"],
                "batchId": r["batch_id"],
                "status": r["status"],
                "createdAt": r["created_at"],
                "resultVideoPath": r["result_video_path"],
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {}
            })
        return {"success": True, "jobs": jobs}
    except Exception as e:
        logger.error(f"[Ranking API] List jobs error: {e}", exc_info=True)
        return {"success": True, "jobs": []}

@router.get("/jobs/{job_id}")
async def api_get_job(job_id: str):
    """특정 랭킹 작업 상세 조회"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            SELECT id, batch_id, source_type, archetype, status, created_at, metadata, result_video_path
            FROM work_queue
            WHERE id = ?
        """, (job_id,))
        row = cur.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

        return {
            "success": True,
            "job": {
                "id": row["id"],
                "batchId": row["batch_id"],
                "status": row["status"],
                "createdAt": row["created_at"],
                "resultVideoPath": row["result_video_path"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else {}
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Ranking API] Get job error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
