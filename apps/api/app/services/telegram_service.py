import logging
import requests
from typing import Optional
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import crud

logger = logging.getLogger("telegram_service")

class TelegramService:
    """
    Hermes Remote Messenger Command Tower: Dispatches alerts and status reports
    to Telegram channel/user.
    """
    @staticmethod
    def send_message(text: str, parse_mode: str = "Markdown") -> bool:
        try:
            db: Session = SessionLocal()
            try:
                settings = crud.get_settings(db)
                if not settings or not settings.telegram_notify_enabled:
                    return False
                
                token = settings.telegram_bot_token
                chat_id = settings.telegram_chat_id
                
                if not token or not chat_id:
                    return False
            finally:
                db.close()

            url = f"https://api.telegram.org/bot{token}/sendMessage"
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": True
            }
            resp = requests.post(url, json=payload, timeout=8)
            if resp.status_code == 200:
                logger.info("Telegram notification sent successfully.")
                return True
            else:
                logger.warning(f"Telegram API responded with {resp.status_code}: {resp.text}")
                return False
        except Exception as e:
            logger.warning(f"Telegram dispatch failed: {e}")
            return False

telegram_service = TelegramService()
