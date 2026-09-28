"""
Direct Gemini Image Generator Service (Sovereign Nano Banana Pro Engine)
========================================================================
Google Antigravity / Gemini Native CloudCode Internal API Direct Connection:
- Model: gemini-3.1-flash-image (Nano Banana Pro / Nano Banana 2)
- Zero OmniRoute dependency (100% Direct Native Google Connection)
- 10-Account Sovereign Quota Pool Auto-Rotation & Failover
- 9-Tier Storage Hierarchy Conformance (%LOCALAPPDATA%\\ViraLoop Studio\\media\\02_Operations\\Temp\\images)
- Prompt Engineering & Visual Direction Guide for Maximum Fidelity
"""

import os
import sys
import json
import time
import uuid
import base64
import logging
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple

from app.config import settings as app_settings
from app.services.google_account_pool import (
    google_account_pool,
    read_windows_keyring_cred,
    is_valid_token_for_email,
    _GOOGLE_AGY_CLIENT_ID,
    _GOOGLE_AGY_CLIENT_SECRET,
    SESSIONS_DIR,
)

logger = logging.getLogger("direct_gemini_image_generator")

# Official Google CloudCode Internal Endpoints
PRIMARY_HOST = "daily-cloudcode-pa.googleapis.com"
FALLBACK_HOST = "cloudcode-pa.googleapis.com"
DEFAULT_PROJECT = "aicode-consumers"
DEFAULT_MODEL = "gemini-3.1-flash-image"


class DirectGeminiImageGenerator:
    """
    Direct Native Gemini Image Generator leveraging the 10-account Google pool.
    """

    def __init__(self):
        self.output_dir = Path(app_settings.TEMP_DIR) / "images"
        self.output_dir.mkdir(parents=True, exist_ok=True)

    @staticmethod
    def enhance_prompt(
        base_prompt: str,
        style_preset: str = "cinematic_photorealism",
        aspect_ratio: str = "9:16",
        camera_angle: Optional[str] = None
    ) -> str:
        """
        Transforms a simple idea/script into an industry-grade prompt
        optimized for Gemini 3.1 Flash Image (Nano Banana Pro).
        """
        presets = {
            "cinematic_photorealism": (
                "Hyperrealistic 8k cinematic film still, shot on 35mm Arri Alexa LF, "
                "shallow depth of field, anamorphic bokeh, volumetric natural lighting, "
                "subtle film grain, masterwork photorealism, award-winning cinematography, ultra-detailed textures"
            ),
            "cyberpunk_noir": (
                "Cinematic neo-noir aesthetic, neon rim lighting, reflective wet asphalt, "
                "volumetric haze and rain mist, Unreal Engine 5 render, cinematic lighting, 8k resolution"
            ),
            "webtoon_anime": (
                "High quality modern Korean webtoon art style, crisp dynamic line art, "
                "vibrant soft cel shading, studio anime aesthetic, Makoto Shinkai lighting, 4k digital illustration"
            ),
            "documentary_historical": (
                "National Geographic documentary photography, authentic historical detail, "
                "natural documentary lighting, sharp candid focus, Hasselblad medium format capture"
            ),
            "3d_pixar": (
                "High-end 3D animated feature film character, Pixar/DreamWorks style, "
                "subsurface scattering, expressive lighting, Disney animation studio render, 8k"
            )
        }

        style_modifiers = presets.get(style_preset, presets["cinematic_photorealism"])
        ratio_desc = "Vertical 9:16 composition for mobile full-screen" if aspect_ratio == "9:16" else (
            "Widescreen 16:9 cinematic landscape" if aspect_ratio == "16:9" else "Square 1:1 balanced composition"
        )
        angle_desc = f", {camera_angle} angle" if camera_angle else ""

        # Compose enhanced prompt
        enhanced = f"{base_prompt.strip()}, {ratio_desc}{angle_desc}, {style_modifiers}"
        return enhanced

    def _get_account_tokens(self) -> List[Tuple[str, str, Optional[str]]]:
        """
        Retrieves ordered list of (email, access_token, refresh_token) across all accounts in pool.
        """
        accounts_to_try = []

        # 1. Keyring active account first
        keyring_data = read_windows_keyring_cred("gemini:antigravity")
        if keyring_data:
            try:
                tok = keyring_data.get("token", {})
                acc_tok = tok.get("access_token")
                ref_tok = tok.get("refresh_token")
                id_tok = keyring_data.get("id_token")
                email = "active_keyring@gmail.com"
                if id_tok and "." in id_tok:
                    parts = id_tok.split(".")
                    if len(parts) > 1:
                        part = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
                        jwt = json.loads(base64.urlsafe_b64decode(part).decode("utf-8", errors="ignore"))
                        email = jwt.get("email", email)
                if acc_tok:
                    accounts_to_try.append((email, acc_tok, ref_tok))
            except Exception:
                pass

        # 2. Add all snapshots from session_vault
        pool_accounts = google_account_pool.get_accounts()
        for acc in pool_accounts:
            email = acc.get("email")
            if not email:
                continue
            if any(em.lower() == email.lower() for em, _, _ in accounts_to_try):
                continue

            acc_dir = SESSIONS_DIR / email
            acc_tok = None
            ref_tok = None
            for fn in ["keyring_token.json", "oauth_creds.json"]:
                fpath = acc_dir / fn
                if fpath.exists() and is_valid_token_for_email(fpath, email):
                    try:
                        d = json.loads(fpath.read_text(encoding="utf-8"))
                        t = d.get("token", d)
                        acc_tok = t.get("access_token")
                        ref_tok = t.get("refresh_token")
                        if acc_tok:
                            break
                    except Exception:
                        pass
            if acc_tok:
                accounts_to_try.append((email, acc_tok, ref_tok))

        return accounts_to_try

    def _refresh_access_token(self, refresh_token: str) -> Optional[str]:
        """Refreshes Google OAuth access token using official endpoint."""
        try:
            post_data = urllib.parse.urlencode({
                "client_id": _GOOGLE_AGY_CLIENT_ID,
                "client_secret": _GOOGLE_AGY_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://oauth2.googleapis.com/token",
                data=post_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode("utf-8"))
                return res.get("access_token")
        except Exception as e:
            logger.warning(f"[DirectGeminiImage] Token refresh failed: {e}")
            return None

    def generate_image(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        style_preset: str = "cinematic_photorealism",
        auto_enhance: bool = True,
        output_filename: Optional[str] = None,
        account_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates an ultra-high-definition image directly via Google Gemini 3.1 Flash Image.
        Automatically rotates across the 10 accounts if quota/rate-limits are encountered.
        """
        final_prompt = self.enhance_prompt(prompt, style_preset=style_preset, aspect_ratio=aspect_ratio) if auto_enhance else prompt
        logger.info(f"🎨 [DirectGeminiImage] Generating image: '{final_prompt[:80]}...' (ratio: {aspect_ratio})")

        accounts = self._get_account_tokens()
        if not accounts:
            return {"success": False, "error": "No authenticated Google accounts available in pool"}

        # If specific email requested, prioritize it
        if account_email:
            accounts.sort(key=lambda x: 0 if x[0].lower() == account_email.lower() else 1)

        payload = {
            "project": DEFAULT_PROJECT,
            "model": DEFAULT_MODEL,
            "request": {
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": final_prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "responseModalities": ["IMAGE"]
                }
            }
        }
        body_bytes = json.dumps(payload).encode("utf-8")

        last_error = None
        for email, access_token, ref_token in accounts:
            logger.info(f"🔄 [DirectGeminiImage] Attempting generation with account: {email}")
            tok_to_use = access_token

            for host in [PRIMARY_HOST, FALLBACK_HOST]:
                url = f"https://{host}/v1internal:generateContent"
                headers = {
                    "Authorization": f"Bearer {tok_to_use}",
                    "Content-Type": "application/json",
                    "User-Agent": "Antigravity/2.17.0"
                }
                try:
                    req = urllib.request.Request(url, data=body_bytes, headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=45) as resp:
                        if resp.status == 200:
                            data = json.loads(resp.read().decode("utf-8"))
                            resp_obj = data.get("response", {})
                            candidates = resp_obj.get("candidates", [])
                            image_b64 = None
                            mime_type = "image/jpeg"

                            for c in candidates:
                                for p in c.get("content", {}).get("parts", []):
                                    if "inlineData" in p:
                                        image_b64 = p["inlineData"].get("data")
                                        mime_type = p["inlineData"].get("mimeType", mime_type)
                                        break
                                if image_b64:
                                    break

                            if image_b64:
                                ext = "png" if "png" in mime_type else "jpg"
                                if not output_filename:
                                    output_filename = f"gemini_img_{uuid.uuid4().hex[:12]}.{ext}"

                                save_path = self.output_dir / output_filename
                                with open(save_path, "wb") as f:
                                    f.write(base64.b64decode(image_b64))

                                file_size_kb = round(save_path.stat().st_size / 1024, 1)
                                logger.info(f"✨ [DirectGeminiImage] Successfully created {save_path} ({file_size_kb} KB) using {email}")

                                return {
                                    "success": True,
                                    "image_path": str(save_path),
                                    "file_name": output_filename,
                                    "aspect_ratio": aspect_ratio,
                                    "account_used": email,
                                    "model": DEFAULT_MODEL,
                                    "size_kb": file_size_kb,
                                    "prompt_used": final_prompt
                                }
                except urllib.error.HTTPError as he:
                    status = he.code
                    err_body = he.read().decode("utf-8", errors="ignore")
                    logger.warning(f"⚠️ [DirectGeminiImage] Account {email} HTTP {status}: {err_body[:150]}")

                    # If 401 (token expired), try refresh once
                    if status == 401 and ref_token:
                        new_tok = self._refresh_access_token(ref_token)
                        if new_tok:
                            tok_to_use = new_tok
                            continue  # retry with refreshed token

                    last_error = f"HTTP {status}: {err_body[:120]}"
                    break  # Try next account in pool
                except Exception as ex:
                    logger.warning(f"⚠️ [DirectGeminiImage] Account {email} host {host} error: {ex}")
            logger.warning(f"⚠️ [DirectGeminiImage] All 10 Google accounts failed. Falling back to Pollinations.ai FLUX.1 engine...")
            fallback_res = self.generate_image_pollinations(
                prompt=final_prompt,
                aspect_ratio=aspect_ratio,
                output_filename=output_filename
            )
            if fallback_res.get("success"):
                return fallback_res

        return {
            "success": False,
            "error": f"All Google accounts and Pollinations fallback failed. Last error: {last_error}"
        }

    def generate_image_pollinations(
        self,
        prompt: str,
        aspect_ratio: str = "9:16",
        output_filename: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        100% Free Zero-Authentication fallback using Pollinations.ai FLUX.1 engine.
        Requires no API key, no login, and provides ultra-high resolution images.
        """
        width, height = (768, 1344) if aspect_ratio == "9:16" else ((1344, 768) if aspect_ratio == "16:9" else (1024, 1024))
        encoded_prompt = urllib.parse.quote(prompt.strip())
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&model=flux&nologo=true"
        
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            with urllib.request.urlopen(req, timeout=40) as resp:
                if resp.status == 200:
                    data = resp.read()
                    if len(data) > 5000:
                        if not output_filename:
                            output_filename = f"flux_img_{uuid.uuid4().hex[:12]}.jpg"
                        save_path = self.output_dir / output_filename
                        save_path.write_bytes(data)
                        file_size_kb = round(save_path.stat().st_size / 1024, 1)
                        logger.info(f"🌸 [Pollinations:FLUX.1] Successfully saved {save_path} ({file_size_kb} KB)")
                        return {
                            "success": True,
                            "image_path": str(save_path),
                            "file_name": output_filename,
                            "aspect_ratio": aspect_ratio,
                            "account_used": "pollinations_flux1_free",
                            "model": "flux.1-schnell",
                            "size_kb": file_size_kb,
                            "prompt_used": prompt
                        }
        except Exception as e:
            logger.warning(f"⚠️ [Pollinations:FLUX.1] Generation failed: {e}")
            return {"success": False, "error": str(e)}

        return {"success": False, "error": "Pollinations returned empty or invalid data"}


# Singleton instance
direct_gemini_image_generator = DirectGeminiImageGenerator()
