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

