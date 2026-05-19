from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import crud, schemas, database, models
import os
import shutil

router = APIRouter(tags=["categories"])

@router.get("/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    categories = crud.get_categories(db, skip=skip, limit=limit)
    return categories

@router.post("/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(database.get_db)):
    # Check if category already exists
    db_category = crud.get_category_by_name(db, name=category.name)
    if db_category:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    return crud.create_category(db=db, category=category)

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(database.get_db)):
    # Get category before deletion
    db_category = db.query(models.CategoryTree).filter(models.CategoryTree.id == category_id).first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Get all channels in this category
    channels = db.query(models.Channel).filter(models.Channel.category_id == category_id).all()
    
    # Delete all videos and files for each channel
    for channel in channels:
        videos = db.query(models.Video).filter(models.Video.channel_id == channel.id).all()
        
        # Delete video files
        for video in videos:
            try:
                if video.file_path and os.path.exists(video.file_path):
                    video_folder = os.path.dirname(video.file_path)
                    if os.path.exists(video_folder):
                        shutil.rmtree(video_folder, ignore_errors=True)
            except Exception as e:
                print(f"Error deleting video files for {video.id}: {e}")
        
        # Delete videos from database
        db.query(models.Video).filter(models.Video.channel_id == channel.id).delete()
    
    # Delete all channels in this category
    db.query(models.Channel).filter(models.Channel.category_id == category_id).delete()
    
    # Delete category folder
    try:
        from ..utils.path_utils import get_standardized_download_path
        downloads_path = get_standardized_download_path(settings)
        
        if db_category.folder_name:
            category_folder = os.path.join(downloads_path, db_category.folder_name)
            if os.path.exists(category_folder):
                shutil.rmtree(category_folder, ignore_errors=True)
    except Exception as e:
        print(f"Error deleting category folder: {e}")
    
    # Delete category from database
    db.delete(db_category)
    db.commit()
    
    return {"ok": True}
