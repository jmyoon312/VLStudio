import os
import json
import logging
import docker
from app.crud import get_settings
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class SovereignOrchestrator:
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings(db)
        try:
            self.docker_client = docker.from_env()
        except Exception:
            self.docker_client = None

    def sync_all(self):
        """Orchestrates synchronization across all hubs."""
        logger.info("Starting global hub synchronization...")
        self.update_env_file()
        self.sync_paperclip()
        self.sync_n8n_env()

    def update_env_file(self):
        """Updates the root .env file with latest keys from DB."""
        from app.config import settings
        env_path = os.path.join(settings.PROJECT_ROOT, ".env")
        
        if not os.path.exists(env_path):
            logger.error(f".env file not found at {env_path}")
            return

        try:
            with open(env_path, "r") as f:
                lines = f.readlines()

            new_lines = []
            keys_to_update = {
                "ANTHROPIC_API_KEY": self.settings.openrouter_api_keys[0] if self.settings.openrouter_api_keys else "",
                "GOOGLE_API_KEY": self.settings.gemini_api_keys[0] if self.settings.gemini_api_keys else "",
                "OPENROUTER_API_KEY": self.settings.openrouter_api_keys[0] if self.settings.openrouter_api_keys else "",
                "GROQ_API_KEY": self.settings.groq_api_keys[0] if self.settings.groq_api_keys else "",
                "CLAUDE_CONFIG_DIR": "/tmp/.claude" # Bypass login
            }

            updated_keys = set()
            for line in lines:
                matched = False
                for key, value in keys_to_update.items():
                    if line.startswith(f"{key}=") or line.startswith(f"#{key}=") or line.startswith(f"# {key}="):
                        new_lines.append(f"{key}={value}\n")
                        updated_keys.add(key)
                        matched = True
                        break
                if not matched:
                    new_lines.append(line)
            
            # Add missing keys
            for key, value in keys_to_update.items():
                if key not in updated_keys:
                    new_lines.append(f"{key}={value}\n")

            with open(env_path, "w") as f:
                f.writelines(new_lines)
            logger.info("Successfully updated .env file with latest keys.")
        except Exception as e:
            logger.error(f"Failed to update .env: {e}")

    def sync_paperclip(self):
        """[Elite] Paperclip 컨테이너가 제거됨 — 안전하게 스킵."""
        logger.info("[Elite] Paperclip service removed. sync_paperclip() skipped (no-op).")
        return


    def sync_n8n_env(self):
        """
        [Elite] 외부 n8n 노드 URL 동기화.
        DB의 n8n_base_url 또는 환경변수 N8N_EXTERNAL_URL을 사용.
        """
        try:
            external_url = os.getenv("N8N_EXTERNAL_URL", "")
            if external_url:
                logger.info(f"[Elite] External n8n URL configured: {external_url}")
            else:
                logger.info("[Elite] N8N_EXTERNAL_URL not set. n8n triggers use DB-configured n8n_base_url.")
        except Exception as e:
            logger.warning(f"[Elite] sync_n8n_env warning: {e}")
