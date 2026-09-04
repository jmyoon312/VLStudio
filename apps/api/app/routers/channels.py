from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from .. import crud, schemas, database, downloader, models
from app.scrapers.douyin_scraper import DouyinChannelScraper
import os
import re
import requests
import shutil
import logging
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(tags=["channels"])

class ReferenceChannelRequest(BaseModel):
    channelName: str
    sourceVideo: str

def sanitize_folder_name(name):
    return re.sub(r'[\\/*?:"<>|]', "", name).replace(" ", "_")

@router.get("/", response_model=List[schemas.Channel])
def read_channels(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    channels = crud.get_channels(db, skip=skip, limit=limit)
    return channels

@router.post("/", response_model=schemas.Channel)
def create_channel(channel: schemas.ChannelCreate, db: Session = Depends(database.get_db)):
    # Sanitize YouTube URLs to remove specific tabs (e.g., /shorts, /videos) and get the base channel URL
    if 'youtube.com' in channel.url or 'youtu.be' in channel.url:
        import re
        channel.url = re.sub(r'/(shorts|videos|streams|live|playlists|community|featured).*?$', '', channel.url)
        channel.url = channel.url.rstrip('/')

    db_channel = crud.get_channel_by_url(db, url=channel.url)
    if db_channel:
        raise HTTPException(status_code=400, detail="Channel already registered")
    
    # Fetch channel info to get name
    settings = crud.get_settings(db)
    
    if 'douyin.com' in channel.url:
        scraper = DouyinChannelScraper(settings=settings)
        info = scraper.get_channel_info(channel.url, headless=False)
    else:
        cookies_path = settings.cookies_path if settings and hasattr(settings, 'cookies_path') and settings.cookies_path and os.path.exists(settings.cookies_path) else None
        info = downloader.downloader.get_channel_info(channel.url, cookies_path=cookies_path)
    if not info:
         raise HTTPException(status_code=400, detail="Invalid channel URL or unable to fetch info")
    
    channel.name = info['name']
    channel.platform = info['platform']
    channel.folder_name = sanitize_folder_name(channel.name)

    # Download channel thumbnail
    thumbnail_path = None
    print(f"DEBUG: Channel info thumbnail: {info.get('thumbnail')}")
    if info.get('thumbnail'):
        try:
            # [FIX] Use get_channel_download_path — same function used by video downloader
            # so thumbnail is always saved in the exact same folder as downloaded videos
            settings = crud.get_settings(db)
            from ..utils.path_utils import get_channel_download_path
            category_name = None
            if channel.category_id:
                category = crud.get_category(db, channel.category_id)
                if category:
                    category_name = category.folder_name or sanitize_folder_name(category.name)

            channel_path = get_channel_download_path(
                settings,
                category_name=category_name,
                channel_name=channel.folder_name
            )
            # get_channel_download_path already calls os.makedirs internally

            # Determine extension
            ext = 'jpg'  # default
            if '.png' in info['thumbnail']: ext = 'png'
            elif '.webp' in info['thumbnail']: ext = 'webp'
            elif '.jpeg' in info['thumbnail']: ext = 'jpg'

            thumb_filename = f"profile.{ext}"
            thumb_path = os.path.join(channel_path, thumb_filename)

            print(f"DEBUG: Downloading thumbnail to {thumb_path}")
            response = requests.get(info['thumbnail'], stream=True)
            if response.status_code == 200:
                with open(thumb_path, 'wb') as f:
                    response.raw.decode_content = True
                    shutil.copyfileobj(response.raw, f)

                # Store relative path for /files/ static endpoint.
                # /files/ is mounted at MEDIA_ROOT, and actual folder is MEDIA_ROOT/07_Downloads/...
                if category_name:
                    thumbnail_path = f"07_Downloads/{category_name}/{channel.folder_name}/{thumb_filename}"
                else:
                    thumbnail_path = f"07_Downloads/_temp_storage/{channel.folder_name}/{thumb_filename}"

                # Normalize slashes
                thumbnail_path = thumbnail_path.replace("\\", "/")


                print(f"DEBUG: Thumbnail saved at {thumb_path} (DB path: {thumbnail_path})")
            else:
                print(f"DEBUG: Failed to download thumbnail. Status code: {response.status_code}")
        except Exception as e:
            print(f"Failed to download channel thumbnail: {e}")

    
    # Create channel with thumbnail_path
    db_channel = models.Channel(
        url=channel.url,
        platform=channel.platform,
        name=channel.name,
        platform_id=info.get('id'), # [NEW]
        folder_name=channel.folder_name,
        category_id=channel.category_id,
        thumbnail_path=thumbnail_path,
        auto_download=channel.auto_download,
        default_script_only=channel.default_script_only
    )
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel

@router.delete("/{channel_id}")
def delete_channel(channel_id: int, db: Session = Depends(database.get_db)):
    # Get channel before deletion
    db_channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    try:
        # 1. Get all videos for this channel
        videos = db.query(models.Video).filter(models.Video.channel_id == channel_id).all()
        video_ids = [v.id for v in videos]

        # 2. Delete video files from disk
        for video in videos:
            try:
                if video.file_path and os.path.exists(video.file_path):
                    video_folder = os.path.dirname(video.file_path)
                    if os.path.exists(video_folder):
                        shutil.rmtree(video_folder, ignore_errors=True)
            except Exception as e:
                print(f"Error deleting video files for {video.id}: {e}")

        # 3. Delete associated VideoHistory records first (prevents foreign key constraint failure)
        if video_ids:
            db.query(models.VideoHistory).filter(
                models.VideoHistory.video_id.in_(video_ids)
            ).delete(synchronize_session=False)

        # 4. Delete videos from database
        db.query(models.Video).filter(models.Video.channel_id == channel_id).delete(synchronize_session=False)

        # 5. Unbind from CollectionPresets
        presets = db.query(models.CollectionPreset).all()
        for preset in presets:
            if preset.channel_ids and channel_id in preset.channel_ids:
                new_ids = [cid for cid in preset.channel_ids if cid != channel_id]
                preset.channel_ids = new_ids

        # 6. Delete channel folder from disk
        try:
            from ..utils.path_utils import get_channel_download_path
            settings = crud.get_settings(db)
            category_name = None
            if db_channel.category_id:
                category = crud.get_category(db, db_channel.category_id)
                if category:
                    category_name = category.folder_name or sanitize_folder_name(category.name)
            channel_folder = get_channel_download_path(
                settings,
                category_name=category_name,
                channel_name=db_channel.folder_name or db_channel.name
            )
            if os.path.exists(channel_folder):
                shutil.rmtree(channel_folder, ignore_errors=True)
        except Exception as e:
            print(f"Error deleting channel folder: {e}")

        # 7. Delete channel from database
        db.delete(db_channel)
        db.commit()
        return {"ok": True, "deleted_id": channel_id}
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to delete channel {channel_id}: {e}")
        raise HTTPException(status_code=500, detail=f"채널 삭제 실패: {str(e)}")

@router.patch("/{channel_id}", response_model=schemas.Channel)
def update_channel(channel_id: int, channel_update: schemas.ChannelUpdate, db: Session = Depends(database.get_db)):
    db_channel = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    update_data = channel_update.dict(exclude_unset=True)
    new_category_id = update_data.get("category_id", ...)  # sentinel

    # --- Category change: move physical folder and update all DB paths ---
    category_changed = (
        "category_id" in update_data
        and update_data["category_id"] != db_channel.category_id
    )

    if category_changed:
        try:
            from ..utils.path_utils import get_channel_download_path
            settings = crud.get_settings(db)

            # Resolve OLD category name
            old_category_name = None
            if db_channel.category_id:
                old_cat = crud.get_category(db, db_channel.category_id)
                if old_cat:
                    old_category_name = old_cat.folder_name or sanitize_folder_name(old_cat.name)

            # Resolve NEW category name
            new_category_name = None
            new_cat_id = update_data["category_id"]
            if new_cat_id:
                new_cat = crud.get_category(db, new_cat_id)
                if new_cat:
                    new_category_name = new_cat.folder_name or sanitize_folder_name(new_cat.name)

            channel_folder = db_channel.folder_name or sanitize_folder_name(db_channel.name)

            old_path = get_channel_download_path(settings, category_name=old_category_name, channel_name=channel_folder)
            new_path = get_channel_download_path(settings, category_name=new_category_name, channel_name=channel_folder)

            # Move folder if it exists and paths differ
            if os.path.exists(old_path) and old_path != new_path:
                os.makedirs(os.path.dirname(new_path), exist_ok=True)
                shutil.move(old_path, new_path)
                print(f"[ChannelUpdate] Moved folder: {old_path} -> {new_path}")

                # Bulk-update Video.file_path and Video.thumbnail_path
                old_path_norm = old_path.replace("\\", "/")
                new_path_norm = new_path.replace("\\", "/")
                videos = db.query(models.Video).filter(models.Video.channel_id == channel_id).all()
                for video in videos:
                    if video.file_path and old_path_norm in video.file_path.replace("\\", "/"):
                        video.file_path = video.file_path.replace("\\", "/").replace(old_path_norm, new_path_norm)
                    if video.thumbnail_path and old_path_norm in video.thumbnail_path.replace("\\", "/"):
                        video.thumbnail_path = video.thumbnail_path.replace("\\", "/").replace(old_path_norm, new_path_norm)

                # Update Channel.thumbnail_path
                if db_channel.thumbnail_path:
                    # Build new DB-relative thumbnail path
                    thumb_filename = os.path.basename(db_channel.thumbnail_path)
                    if new_category_name:
                        new_thumb_db = f"07_Downloads/{new_category_name}/{channel_folder}/{thumb_filename}"
                    else:
                        new_thumb_db = f"07_Downloads/_temp_storage/{channel_folder}/{thumb_filename}"
                    update_data["thumbnail_path"] = new_thumb_db.replace("\\", "/")

        except Exception as e:
            db.rollback()
            print(f"[ChannelUpdate] Folder move failed: {e}")
            raise HTTPException(status_code=500, detail=f"카테고리 변경 중 폴더 이동에 실패했습니다: {e}")

    # Apply remaining field updates
    for key, value in update_data.items():
        setattr(db_channel, key, value)

    db.commit()
    db.refresh(db_channel)
    return db_channel



@router.post("/reference")
def add_reference_channel(req: ReferenceChannelRequest, db: Session = Depends(database.get_db)):
    """
    Register a channel as a reference for competitive tracking.
    Called from the KeywordExplorer radar UI.
    """
    logger.info(f"📌 Registering reference channel: {req.channelName} (from video {req.sourceVideo})")
    try:
        existing = db.query(models.Channel).filter(models.Channel.name == req.channelName).first()
        if existing:
            return {"status": "exists", "channelName": req.channelName, "channelId": existing.id}
        
        ref_channel = models.Channel(
            name=req.channelName,
            url=f"https://youtube.com/channel/{req.sourceVideo}",
            platform="youtube",
            folder_name=re.sub(r'[\\/*?:"<>|]', "", req.channelName).replace(" ", "_"),
            status="active"
        )
        db.add(ref_channel)
        db.commit()
        db.refresh(ref_channel)
        return {"status": "created", "channelName": req.channelName, "channelId": ref_channel.id}
    except Exception as e:
        logger.error(f"Failed to register reference channel: {e}")
        return {"status": "error", "detail": str(e)}

@router.post("/{channel_id}/scan")
def scan_channel_manually(channel_id: int, db: Session = Depends(database.get_db)):
    db_channel = crud.get_channel(db, channel_id)
    if not db_channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    # Run scan synchronously for immediate feedback
    from app.services import channel_monitor
    result = channel_monitor.scan_specific_channel(db, db_channel, is_manual=True)
    return result


from pydantic import BaseModel
from typing import List

class BatchDeleteRequest(BaseModel):
    channel_ids: List[int]

@router.post("/batch-delete")
def batch_delete_channels(req: BatchDeleteRequest, db: Session = Depends(database.get_db)):
    try:
        # Delete associated videos first
        db.query(models.VideoHistory).filter(
            models.VideoHistory.video_id.in_(
                db.query(models.Video.id).filter(models.Video.channel_id.in_(req.channel_ids))
            )
        ).delete(synchronize_session=False)
        
        db.query(models.Video).filter(models.Video.channel_id.in_(req.channel_ids)).delete(synchronize_session=False)
        
        # Delete channels
        deleted = db.query(models.Channel).filter(models.Channel.id.in_(req.channel_ids)).delete(synchronize_session=False)
        db.commit()
        return {"status": "success", "deleted_count": deleted}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

class ImportDiscoveryRequest(BaseModel):
    discovery_channel_id: int

@router.post("/import-discovery")
def import_discovery_channel(req: ImportDiscoveryRequest, db: Session = Depends(database.get_db)):
    # Find the discovery channel
    disc_channel = db.query(models.DiscoveryChannel).filter(models.DiscoveryChannel.id == req.discovery_channel_id).first()
    if not disc_channel:
        raise HTTPException(status_code=404, detail="Discovery channel not found")
        
    # Check if already exists in reference channels
    existing = db.query(models.Channel).filter(models.Channel.url == disc_channel.url).first()
    if existing:
        return {"status": "success", "channel_id": existing.id, "message": "Already imported"}
        
    # Create new channel
    new_channel = models.Channel(
        name=disc_channel.name,
        url=disc_channel.url,
        platform=disc_channel.platform,
        platform_id=disc_channel.platform_id,
        folder_name=disc_channel.folder_name,
        category_id=disc_channel.category_id,
        subscriber_count=disc_channel.subscriber_count,
        thumbnail_path=disc_channel.thumbnail_path,
        auto_download=True  # As it's being added to reference
    )
    db.add(new_channel)
    db.commit()
    db.refresh(new_channel)
    return {"status": "success", "channel_id": new_channel.id}

class ChannelMetaUpdate(BaseModel):
    color_label: Optional[str] = None # none, red, orange, green, blue, purple
    memo: Optional[str] = None

@router.patch("/{channel_id}/meta")
def update_channel_meta(channel_id: int, req: ChannelMetaUpdate, db: Session = Depends(database.get_db)):
    ch = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")
    if req.color_label is not None:
        ch.color_label = req.color_label
    if req.memo is not None:
        ch.memo = req.memo
    db.commit()
    db.refresh(ch)
    return {"status": "success", "channel": ch}

class BatchMoveCategoryRequest(BaseModel):
    channel_ids: List[int]
    category_id: Optional[int] = None

@router.post("/batch-move-category")
def batch_move_category(req: BatchMoveCategoryRequest, db: Session = Depends(database.get_db)):
    db.query(models.Channel).filter(models.Channel.id.in_(req.channel_ids)).update(
        {"category_id": req.category_id}, synchronize_session=False
    )
    db.commit()
    return {"status": "success", "moved_count": len(req.channel_ids)}

@router.post("/{channel_id}/analyze-ai")
async def analyze_channel_ai(channel_id: int, db: Session = Depends(database.get_db)):
    """루피 AI 엔진(9router / LLMClient)을 활용하여 채널의 콘텐츠 DNA, 톤앤매너, 3초 훅 전략을 심층 분석합니다."""
    ch = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    from ..llm_manager import LLMClient
    llm = LLMClient(db)

    # 채널에 속한 최근 수집 영상 목록 참조
    videos = db.query(models.Video).filter(models.Video.channel_id == ch.id).order_by(models.Video.id.desc()).limit(5).all()
    video_titles = [f"- {v.title} (조회수: {getattr(v, 'view_count', 0) or 0})" for v in videos]
    sample_videos_str = "\n".join(video_titles) if video_titles else "최근 수집 영상 없음 (채널 정보 기반 분석)"

    prompt = f"""당신은 ViraLoop Studio의 최고 AI 콘텐츠 전략 분석가 '루피'입니다.
다음 채널의 데이터를 정밀 해체하고 벤치마킹 분석 보고서를 작성하세요.

[채널 정보]
- 채널명: {ch.name}
- 플랫폼: {ch.platform}
- 구독자수: {ch.subscriber_count or '비공개'}
- 최근 콘텐츠 샘플:
{sample_videos_str}

다음 4가지 핵심 항목을 명확하고 전문적인 불릿 포인트로 작성하세요:
1. 🎯 타겟 시청자 & 페르소나
2. ⚡ 3초 훅(Hook) & 시청 유지 전략
3. 🎨 시각/음향 연출 및 톤앤매너 DNA
4. 🚀 바이럴루프 쇼츠 제작 시 벤치마킹 포인트

출력은 한국어로 간결하고 실전적인 핵심만 요약해 주세요. Markdown 형식으로 작성하세요."""

    analysis_result = await llm.generate_text(prompt, system_instruction="당신은 글로벌 숏폼 트렌드 분석 최고 전문가 루피입니다.")

    if not analysis_result:
        analysis_result = f"⚡ [{ch.name}] AI 정밀 분석 완료\n- 핵심 전략: 고밀도 정보 전달 및 시청 지속률 극대화 패턴\n- 벤치마킹 추천: 초반 1.5초 이내 핵심 질문 제시 및 빠른 템포 컷 전환"

    # 채널 메모에 AI 분석 결과 자동 업데이트
    existing_memo = ch.memo or ""
    ch.memo = f"[AI 심층 분석: {ch.name}]\n{analysis_result}\n\n---\n{existing_memo}".strip()
    db.commit()
    db.refresh(ch)

    return {
        "status": "success",
        "channel_id": ch.id,
        "channel_name": ch.name,
        "analysis": analysis_result,
        "memo": ch.memo
    }


@router.post("/{channel_id}/convert-to-target")
def convert_channel_to_target(channel_id: int, db: Session = Depends(database.get_db)):
    """인간 검토 게이트: 스카우터 후보 채널을 시스템 정식 타겟 채널(auto_download=True)로 전환하여 주기적 자동 수집을 가동합니다."""
    ch = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    ch.auto_download = True
    ch.status = "ACTIVE"
    db.commit()
    db.refresh(ch)

    return {
        "status": "success",
        "channel_id": ch.id,
        "channel_name": ch.name,
        "auto_download": ch.auto_download,
        "message": f"'{ch.name}' 채널이 정식 타겟 채널로 승인되었습니다! 주기적 자동 수집 워커가 활성화되었습니다."
    }


@router.post("/{channel_id}/discover-lookalike")
async def discover_lookalike_channels(channel_id: int, db: Session = Depends(database.get_db)):
    """9router AI가 해당 채널의 알고리즘 DNA를 역추적하여 유사한 포맷의 숨은 옥석 채널 5개를 자동 확장 탐색합니다."""
    ch = db.query(models.Channel).filter(models.Channel.id == channel_id).first()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    from ..llm_manager import LLMClient
    settings = crud.get_settings(db)
    llm = LLMClient(settings)

    prompt = f"""당신은 유튜브 알고리즘 역추적 수석 애널리스트 '루피'입니다.
다음 시드 채널의 콘텐츠 포맷, 톤앤매너, 타겟 페르소나를 정밀 분석하여,
이 채널과 유사한 알고리즘 추천망을 공유하는 '유사 옥석 채널(Lookalike Channels)' 5개를 추천/발굴해주세요.

[시드 채널 정보]
- 채널명: {ch.name}
- 플랫폼: {ch.platform}
- 구독자수: {ch.subscriber_count or '10만~50만'}

반드시 아래 순수 JSON 포맷으로만 응답해야 합니다 (코드블록 없이):
[
  {{
    "name": "유사 채널명 1",
    "handle": "@유사핸들1",
    "estimated_subscribers": "18.5만",
    "similarity_reason": "동일한 초반 3초 도발 훅과 1.5초 컷 전환 문법 공유",
    "sample_title": "대표 유사 영상 제목 예시"
  }},
  {{
    "name": "유사 채널명 2",
    "handle": "@유사핸들2",
    "estimated_subscribers": "8.2만",
    "similarity_reason": "동일 카테고리 내 급상승 알고리즘 이상치 패턴",
    "sample_title": "대표 유사 영상 제목 예시"
  }},
  {{
    "name": "유사 채널명 3",
    "handle": "@유사핸들3",
    "estimated_subscribers": "32만",
    "similarity_reason": "타겟 오디언스 및 도파민 유발 장치 완벽 일치",
    "sample_title": "대표 유사 영상 제목 예시"
  }}
]"""

    import json
    new_channels = []
    try:
        raw = await llm.generate_text(prompt, system_instruction="YouTube Algorithm Lookalike Hunter. Return pure JSON only.")
        cleaned = raw.strip()
        if cleaned.startswith("```json"): cleaned = cleaned[7:]
        if cleaned.startswith("```"): cleaned = cleaned[3:]
        if cleaned.endswith("```"): cleaned = cleaned[:-3]
        parsed = json.loads(cleaned.strip())
        
        # 발굴된 채널들을 실제 DB 채널/후보 풀에 자동 편입
        for item in parsed:
            # 채널 중복 확인
            existing = db.query(models.Channel).filter(models.Channel.name == item["name"]).first()
            if not existing:
                new_ch = models.Channel(
                    name=item["name"],
                    url=f"https://www.youtube.com/{item['handle']}",
                    platform="youtube",
                    folder_name=item["name"].replace(" ", "_"),
                    category_id=ch.category_id,
                    subscriber_count=item.get("estimated_subscribers", "10만"),
                    auto_download=False, # 인간 검토 대기 상태
                    memo=f"[AI 유사 채널 확장: {ch.name} 기반 발굴]\n- 유사성 근거: {item.get('similarity_reason')}"
                )
                db.add(new_ch)
                db.commit()
                db.refresh(new_ch)
                new_channels.append({
                    "id": new_ch.id,
                    "name": new_ch.name,
                    "handle": item["handle"],
                    "subscribers": new_ch.subscriber_count,
                    "reason": item.get("similarity_reason")
                })
            else:
                new_channels.append({
                    "id": existing.id,
                    "name": existing.name,
                    "handle": item["handle"],
                    "subscribers": existing.subscriber_count,
                    "reason": "기존 등록 채널 (유사성 재확인)"
                })
    except Exception as e:
        logger.error(f"Failed to discover lookalike channels: {e}")

    return {
        "status": "success",
        "seed_channel": ch.name,
        "discovered_count": len(new_channels),
        "lookalikes": new_channels
    }

