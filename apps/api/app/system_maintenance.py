"""
System Maintenance Module
Handles automatic updates for yt-dlp and other system maintenance tasks
"""

import subprocess
import asyncio
import sys # [FIX] Import sys
from datetime import datetime, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

# Will be imported from other modules
from .database import SessionLocal
from . import crud


class SystemMaintenance:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.is_running = False
        
    async def get_ytdlp_version(self) -> str:
        """Get currently installed yt-dlp version"""
        try:
            # [FIX] Use run_in_executor (to_thread) to avoid Windows asyncio subprocess issues
            def _run():
                # Creation flag for NO_WINDOW on Windows
                creationflags = 0x08000000 if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                return subprocess.run(
                    [sys.executable, '-m', 'yt_dlp', '--version'], # [FIX] Use python -m yt_dlp
                    capture_output=True,
                    text=True,
                    creationflags=creationflags
                )
            
            result = await asyncio.to_thread(_run)
            
            if result.returncode == 0:
                version = result.stdout.strip()
                return version
            return "Unknown"
        except Exception as e:
            print(f"Error getting yt-dlp version: {e}")
            return "Error"
    
    async def update_ytdlp(self) -> dict:
        """
        Update yt-dlp to latest version using pip
        """
        try:
            # Get current version
            old_version = await self.get_ytdlp_version()
            
            print("Updating yt-dlp...")
            
            # [FIX] Use run_in_executor (to_thread)
            def _run_update():
                creationflags = 0x08000000 if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0
                return subprocess.run(
                    [sys.executable, '-m', 'pip', 'install', '--upgrade', 'yt-dlp'], # [FIX] Use python -m pip
                    capture_output=True,
                    text=True,
                    creationflags=creationflags
                )

            result = await asyncio.to_thread(_run_update)
            
            if result.returncode != 0:
                error_msg = result.stderr
                print(f"yt-dlp update failed: {error_msg}")
                return {
                    'status': 'failed',
                    'error': error_msg,
                    'old_version': old_version
                }
            
            # Get new version
            new_version = await self.get_ytdlp_version()
            
            # Update database
            db = SessionLocal()
            try:
                settings = crud.get_settings(db)
                if settings:
                    settings.ytdlp_version = new_version
                    settings.ytdlp_last_check = datetime.now()
                    db.commit()
            finally:
                db.close()
            
            message = f"Updated from {old_version} to {new_version}"
            if old_version == new_version:
                message = f"Already up to date ({new_version})"
            
            print(f"[OK] {message}")
            
            return {
                'status': 'success',
                'old_version': old_version,
                'new_version': new_version,
                'message': message
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            print(f"Error updating yt-dlp: {e}\n{error_trace}")
            return {
                'status': 'failed',
                'error': str(e)
            }
    
    async def should_check_for_updates(self) -> bool:
        """Check if it's time to check for updates (7 days since last check)"""
        db = SessionLocal()
        try:
            settings = crud.get_settings(db)
            if not settings:
                return True  # No settings, should check
            
            if not settings.ytdlp_auto_update:
                return False  # Auto-update disabled
            
            if not settings.ytdlp_last_check:
                return True  # Never checked before
            
            # Check if 7 days have passed
            days_since_check = (datetime.now() - settings.ytdlp_last_check).days
            return days_since_check >= 7
            
        finally:
            db.close()
    
    async def scheduled_update_check(self):
        """Job that runs on schedule to check and update yt-dlp"""
        print("Running scheduled yt-dlp update check...")
        
        if await self.should_check_for_updates():
            result = await self.update_ytdlp()
            if result['status'] == 'success':
                print(f"Scheduled update completed: {result['message']}")
            else:
                print(f"Scheduled update failed: {result.get('error', 'Unknown error')}")
        else:
            print(f"Skipping update check (not yet due or disabled)")
    
    async def daily_cleanup_wrapper(self):
        """
        Wrapper for daily cleanup task (async)
        """
        try:
            from .services.scheduler import daily_cleanup_task
            # Run in thread since it's synchronous
            await asyncio.to_thread(daily_cleanup_task)
        except Exception as e:
            print(f"Daily cleanup failed: {e}")
    
    def start_scheduler(self):
        """Start the maintenance scheduler"""
        if self.is_running:
            print("Scheduler already running")
            return
        
        # Add weekly update job
        self.scheduler.add_job(
            self.scheduled_update_check,
            trigger=IntervalTrigger(days=7),
            id='ytdlp_update',
            name='yt-dlp Weekly Update Check',
            replace_existing=True
        )
        
        # Run initial check on startup
        self.scheduler.add_job(
            self.scheduled_update_check,
            trigger='date',  # Run once
            run_date=datetime.now() + timedelta(seconds=10),  # 10 seconds after startup
            id='ytdlp_startup_check',
            name='yt-dlp Startup Check'
        )
        
        # [NEW] Add daily cleanup job (매일 새벽 3시)
        from apscheduler.triggers.cron import CronTrigger
        self.scheduler.add_job(
            self.daily_cleanup_wrapper,
            trigger=CronTrigger(hour=3, minute=0),  # 매일 03:00
            id='daily_cleanup',
            name='Daily Video Cleanup (10 days old)',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        print("System maintenance scheduler started")
    
    def stop_scheduler(self):
        """Stop the maintenance scheduler"""
        if not self.is_running:
            return
        
        self.scheduler.shutdown(wait=False)
        self.is_running = False
        print("System maintenance scheduler stopped")


# Global instance
system_maintenance = SystemMaintenance()
