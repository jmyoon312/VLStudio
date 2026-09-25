"""
ViraLoop Procedural Asset Self-Healing Engine.
Generates procedural cinematic overlays (theater curtains, cinema seats, vignette, tape labels)
using PIL with zero external image dependencies to guarantee 100% render availability.
"""

import os
import math
import logging
from pathlib import Path
from typing import Optional
from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger("procedural_asset_generator")

LOCAL_APPDATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
ASSETS_OVERLAYS_DIR = Path(LOCAL_APPDATA) / "ViraLoop Studio" / "media" / "03_Assets" / "overlays"


class ProceduralAssetGenerator:
    """
    Guarantees asset self-healing for ViraLoop production templates.
    Generates procedural PNG overlays dynamically on disk if not already present.
    """

    def __init__(self, output_dir: Optional[Path] = None):
        self.output_dir = output_dir or ASSETS_OVERLAYS_DIR
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def ensure_theater_curtain_top(self, width: int = 1080, height: int = 460) -> Path:
        """
        Generates a rich burgundy velvet theater curtain overlay with procedural folds and gold fringe.
        """
        dest_path = self.output_dir / "burgundy_curtain_top.png"
        if dest_path.exists() and dest_path.stat().st_size > 5000:
            return dest_path

        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 1. Base burgundy gradient & vertical velvet folds
        num_folds = 24
        fold_width = width / num_folds

        for x in range(width):
            fold_idx = int(x / fold_width)
            t = (x % fold_width) / fold_width
            # Sine wave shading for realistic velvet fabric depth
            shading = math.sin(t * math.pi)
            
            # Base color: deep royal burgundy
            r = int(75 + shading * 65)
            g = int(8 + shading * 14)
            b = int(18 + shading * 22)

            for y in range(height):
                # Vertical drop-off gradient (darker near bottom)
                y_factor = 1.0 - (y / height) * 0.45
                final_r = max(0, min(255, int(r * y_factor)))
                final_g = max(0, min(255, int(g * y_factor)))
                final_b = max(0, min(255, int(b * y_factor)))

                # Bottom scalloped fringe curve
                scallop_y = height - 35 + int(math.sin((x / 45.0) * math.pi) * 18)
                if y <= scallop_y:
                    alpha = 255
                    draw.point((x, y), fill=(final_r, final_g, final_b, alpha))
                elif y <= scallop_y + 8:
                    # Gold fringe edge
                    gold_alpha = int(255 * (1.0 - (y - scallop_y) / 8.0))
                    draw.point((x, y), fill=(235, 185, 45, gold_alpha))

        # Soft blur for fabric softness
        img = img.filter(ImageFilter.GaussianBlur(radius=1.2))
        img.save(dest_path, "PNG", optimize=True)
        logger.info(f"✨ [Self-Healing] Generated procedural theater curtain overlay: {dest_path}")
        return dest_path

    def ensure_cinema_seats_bottom(self, width: int = 1080, height: int = 460) -> Path:
        """
        Generates a dark cinematic theater seat silhouettes overlay for the bottom 24% letterbox.
        """
        dest_path = self.output_dir / "cinema_seats_bottom.png"
        if dest_path.exists() and dest_path.stat().st_size > 5000:
            return dest_path

        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # 1. Dark ambient background gradient (near pitch black with deep navy/crimson undertone)
        for y in range(height):
            alpha = min(255, int(200 + (y / height) * 55))
            # Subtle gradient from y=0 to y=height
            dark_shade = int(12 * (y / height))
            draw.line([(0, y), (width, y)], fill=(dark_shade, dark_shade + 1, dark_shade + 3, alpha))

        # 2. Draw row of cinema seat headrests (front perspective silhouette)
        seat_count = 7
        seat_w = width / seat_count
        for i in range(seat_count + 1):
            cx = int(i * seat_w)
            cy = int(height * 0.28)
            radius_x = int(seat_w * 0.42)
            radius_y = int(height * 0.35)

            # Curved seat top
            draw.ellipse(
                [(cx - radius_x, cy - radius_y), (cx + radius_x, cy + radius_y)],
                fill=(4, 4, 6, 255)
            )
            # Seat body fill down to bottom
            draw.rectangle(
                [(cx - radius_x, cy), (cx + radius_x, height)],
                fill=(4, 4, 6, 255)
            )

        # Ambient vignette shadow on top boundary
        for y in range(int(height * 0.35)):
            v_alpha = int(255 * (1.0 - (y / (height * 0.35))))
            draw.line([(0, y), (width, y)], fill=(0, 0, 0, int(v_alpha * 0.6)))

        img = img.filter(ImageFilter.GaussianBlur(radius=1.8))
        img.save(dest_path, "PNG", optimize=True)
        logger.info(f"✨ [Self-Healing] Generated procedural cinema seats overlay: {dest_path}")
        return dest_path

    def ensure_sub_tape_overlay(self, width: int = 400, height: int = 70, bg_hex: str = "#FDE68A") -> Path:
        """
        Generates a realistic washi tape / paper sticker label overlay with rough torn edges.
        """
        dest_path = self.output_dir / "tape_sticker_label.png"
        if dest_path.exists() and dest_path.stat().st_size > 2000:
            return dest_path

        img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Parse hex
        h = bg_hex.lstrip("#")
        base_rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

        # Draw semi-translucent washi tape with rough ends
        for x in range(width):
            # Jagged torn edges on left and right
            left_offset = int(math.sin(x * 0.5) * 4) if x < 15 else 0
            right_offset = int(math.sin(x * 0.5) * 4) if x > width - 15 else 0

            for y in range(4, height - 4):
                draw.point((x, y), fill=(*base_rgb, 230))

        img.save(dest_path, "PNG", optimize=True)
        logger.info(f"✨ [Self-Healing] Generated procedural tape sticker overlay: {dest_path}")
        return dest_path


procedural_asset_generator = ProceduralAssetGenerator()
