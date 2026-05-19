import torch
from PIL import Image
from sentence_transformers import SentenceTransformer, util
import logging

logger = logging.getLogger(__name__)

class AssetRanker:
    """
    Uses a local CLIP model to rank assets based on semantic similarity to a text prompt.
    Cost: Zero (Local GPU/CPU)
    """
    def __init__(self, model_name: str = 'clip-ViT-B-32'):
        try:
            self.model = SentenceTransformer(model_name)
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.model.to(self.device)
            logger.info(f"🧠 CLIP Model loaded on {self.device}")
        except Exception as e:
            logger.error(f"❌ Failed to load CLIP model: {e}")
            self.model = None

    def score_asset(self, image_path: str, text_prompt: str) -> float:
        """
        Returns a similarity score between 0 and 1.
        """
        if not self.model:
            return 0.0
            
        try:
            # 1. Load and encode image
            img = Image.open(image_path)
            img_emb = self.model.encode(img)
            
            # 2. Encode text
            text_emb = self.model.encode(text_prompt)
            
            # 3. Compute cosine similarity
            score = util.cos_sim(img_emb, text_emb).item()
            
            logger.info(f"📊 Asset Score: {score:.4f} for {image_path}")
            return score
        except Exception as e:
            logger.error(f"❌ Scoring failed: {e}")
            return 0.0

    def rank_assets(self, image_paths: list[str], text_prompt: str):
        """
        Ranks a list of assets and returns sorted list of (path, score).
        """
        results = []
        for path in image_paths:
            score = self.score_asset(path, text_prompt)
            results.append((path, score))
            
        return sorted(results, key=lambda x: x[1], reverse=True)
