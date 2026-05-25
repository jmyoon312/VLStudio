import sys
import os

# Add to path
sys.path.append("C:/ViraLoopMedia/VLStudio/apps/api")

from app.database import SessionLocal
from app import models
from app.routers.browser_profiles import BrowserProfileResponse

db = SessionLocal()
try:
    profiles = db.query(models.BrowserProfile).all()
    for p in profiles:
        resp = BrowserProfileResponse.from_orm(p)
        resp.tiktok_count = len(p.tiktok_channels)
        resp.insta_count = len(p.instagram_channels)
        resp.notebooklm_count = len(p.notebooklm_accounts)
        print(f"Success for profile {p.id}")
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
