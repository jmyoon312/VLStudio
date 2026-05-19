from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Settings
from app.services.search_manager import search_manager
import os

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    engine: str = "auto" # auto, tavily, searxng
    media_only: bool = False
    type: str = "auto" # video, image, auto

@router.post("/search")
async def bridge_search(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Unified Web Search.
    """
    settings = db.query(Settings).first()
    
    # Prepare Config from DB/Env
    tavily_key = None
    if settings.tavily_api_keys and len(settings.tavily_api_keys) > 0:
        tavily_key = settings.tavily_api_keys[0] # Rotation logic later if needed
    if not tavily_key:
        tavily_key = os.getenv("TAVILY_API_KEY")
        
    searxng_url = settings.searxng_url if settings else "https://search.gogloo.gleeze.com/search"

    config = {
        "tavily_key": tavily_key,
        "searxng_url": searxng_url
    }
    
    # If media_only is requested, we try to use specialized media search if possible
    # For now, if media_only is True, we use the assets.search_stock_assets logic for video/image
    if request.media_only:
        from app.routers.assets import search_stock_assets
        media_type = "video" if request.type in ["video", "auto"] else "image"
        try:
            results = search_stock_assets(request.query, media_type)
            return {"results": results, "source": "StockLibrary"}
        except:
            pass # Fallback to general search if stock fails

    result = search_manager.search(request.query, request.engine, config=config)
    
    if "error" in result:
        # If auto failed, try to return error but not 500 if it's just 'no results'
        # But here 'error' key implies system/config error.
        raise HTTPException(status_code=500, detail=result["error"])
        
    return result
