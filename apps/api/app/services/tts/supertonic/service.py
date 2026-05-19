import os
import json
import numpy as np
import onnxruntime as ort
import soundfile as sf
from typing import Optional, List, Tuple
from .text_processor import UnicodeProcessor, length_to_mask, chunk_text

class Style:
    def __init__(self, style_ttl_onnx: np.ndarray, style_dp_onnx: np.ndarray):
        self.ttl = style_ttl_onnx
        self.dp = style_dp_onnx

def get_latent_mask(
    wav_lengths: np.ndarray, base_chunk_size: int, chunk_compress_factor: int
) -> np.ndarray:
    latent_size = base_chunk_size * chunk_compress_factor
    latent_lengths = (wav_lengths + latent_size - 1) // latent_size
    latent_mask = length_to_mask(latent_lengths)
    return latent_mask

class SupertonicService:
    _instance = None
    _initialized = False

    def __init__(self, model_dir: str):
        # --- ROBUST PATH RESOLUTION START ---
        # 1. Convert to absolute path first
        abs_path = os.path.abspath(model_dir)
        print(f"[Supertonic] Resolving path: {abs_path}")

        # 2. Fix Double Backend (Common CWD issue)
        # Check for duplicated segments like 'backend\\backend' or 'backend/backend'
        if "backend" + os.sep + "backend" in abs_path:
            print(f"[Supertonic] Detected double 'backend' in path. Attempting to fix...")
            fixed_path = abs_path.replace("backend" + os.sep + "backend", "backend")
            if os.path.exists(fixed_path):
                 print(f"[Supertonic] Fix success -> {fixed_path}")
                 abs_path = fixed_path
        
        # 3. Fallback: Check Parent Directory relative
        # If absolute path doesn't exist, try resolving model_dir relative to parent of CWD
        if not os.path.exists(abs_path):
             parent_relative = os.path.abspath(os.path.join("..", model_dir))
             if os.path.exists(parent_relative):
                  print(f"[Supertonic] Found via parent path -> {parent_relative}")
                  abs_path = parent_relative

        self.model_dir = abs_path
        print(f"[Supertonic] Final Model Dir: {self.model_dir}")
        # --- ROBUST PATH RESOLUTION END ---

        self.cfgs = {}
        self.text_processor = None
        
        # ONNX Sessions
        self.dp_ort = None
        self.text_enc_ort = None
        self.vector_est_ort = None
        self.vocoder_ort = None
        
        self.sample_rate = 44100
        self.base_chunk_size = 32
        self.chunk_compress_factor = 256
        self.ldim = 80

    @classmethod
    def get_instance(cls, model_dir: Optional[str] = None):
        if cls._instance is None:
            if model_dir is None:
                raise ValueError("Model directory must be provided for first initialization")
            cls._instance = cls(model_dir)
        return cls._instance

    def load_models(self):
        if self._initialized:
            return

        print(f"[Supertonic] Loading models from: {self.model_dir}")
        
        # Verify directory exists
        if not os.path.exists(self.model_dir):
            print(f"[Supertonic] ERROR: Model directory not found at {self.model_dir}")
            print(f"[Supertonic] CWD: {os.getcwd()}")
            raise FileNotFoundError(f"Model directory not found at {self.model_dir}")
        
        # Load Configs
        cfg_path = os.path.join(self.model_dir, "config.json")
        if not os.path.exists(cfg_path):
             # Fallback check for tts.json
             tts_cfg_path = os.path.join(self.model_dir, "tts.json")
             if os.path.exists(tts_cfg_path):
                 cfg_path = tts_cfg_path
             else:
                 print(f"[Supertonic] WARNING: Config not found at {cfg_path}")
        
        try:
            with open(cfg_path, "r") as f:
                self.cfgs = json.load(f)
                
            # Apply Configs to Service Attributes
            ae_cfg = self.cfgs.get("ae", {})
            ttl_cfg = self.cfgs.get("ttl", {})
            
            # Update params with config values, fallback to hardcoded if missing
            self.sample_rate = ae_cfg.get("sample_rate", 44100)
            self.base_chunk_size = ae_cfg.get("base_chunk_size", 512)
            
            # chunk_compress_factor: Prioritize TTL (found 6 here), then AE
            self.chunk_compress_factor = ttl_cfg.get("chunk_compress_factor") or ae_cfg.get("chunk_compress_factor", 256)
            
            # Latent Dim (ldim): Found 'ldim' in TTL config
            self.ldim = ttl_cfg.get("latent_dim") or ttl_cfg.get("ldim", 80)
            
            # Validate dimensions to avoid 20480 vs 144 crazy mismatches
            # If product is suspiciously low or high, warn?
            # 24 * 6 = 144 (Matches error expectation)
            # 80 * 256 = 20480 (Matches previous error)
            
            print(f"[Supertonic] Model Config Loaded: SR={self.sample_rate}, Chunk={self.base_chunk_size}, Compress={self.chunk_compress_factor}, LDim={self.ldim}")
            
        except Exception as e:
            print(f"[Supertonic] Error loading config: {e}. Using defaults.")
            # Keep defaults set in __init__?
            # Re-assert defaults just in case
            self.sample_rate = 44100 
            self.base_chunk_size = 512 # Changed default to 512 as it's common in newer models
            self.chunk_compress_factor = 256
            self.ldim = 80
        
        # Load ONNX Models
        opts = ort.SessionOptions()
        providers = ["CPUExecutionProvider"] # Add CUDAExecutionProvider if GPU available

        try:
            # Expected structure: 4 separate ONNX files (flattened in model_dir)
            # Use dictionary to load and check existence first
            models = {
                "dp_ort": "duration_predictor.onnx",
                "text_enc_ort": "text_encoder.onnx",
                "vector_est_ort": "vector_estimator.onnx",
                "vocoder_ort": "vocoder.onnx"
            }
            
            for attr, filename in models.items():
                model_path = os.path.join(self.model_dir, filename)
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"{filename} not found at {model_path}")
                
                print(f"[Supertonic] Loading {filename}...")
                setattr(self, attr, ort.InferenceSession(model_path, sess_options=opts, providers=providers))

        except Exception as e:
            print(f"[Supertonic] Error loading ONNX models: {e}")
            raise e

        # Load Text Processor
        unicode_indexer_path = os.path.join(self.model_dir, "tokenizer.json")
        if not os.path.exists(unicode_indexer_path):
             unicode_indexer_path = os.path.join(self.model_dir, "unicode_indexer.json")
        
        self.text_processor = UnicodeProcessor(unicode_indexer_path)
        self._initialized = True
        print("Supertonic models loaded successfully.")

    def sample_noisy_latent(self, duration: np.ndarray, noise_scale: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
        bsz = len(duration)
        wav_len_max = duration.max() * self.sample_rate
        wav_lengths = (duration * self.sample_rate).astype(np.int64)
        chunk_size = self.base_chunk_size * self.chunk_compress_factor
        latent_len = ((wav_len_max + chunk_size - 1) / chunk_size).astype(np.int32)
        latent_dim = self.ldim * self.chunk_compress_factor
        
        # Apply noise_scale to increase/decrease variance
        noisy_latent = np.random.randn(bsz, latent_dim, latent_len).astype(np.float32) * noise_scale
        
        latent_mask = get_latent_mask(wav_lengths, self.base_chunk_size, self.chunk_compress_factor)
        noisy_latent = noisy_latent * latent_mask
        return noisy_latent, latent_mask

    def _infer(self, text_list: list[str], lang_list: list[str], style: Style, total_step: int, speed: float = 1.05, noise_scale: float = 1.0) -> tuple[np.ndarray, np.ndarray]:
        bsz = len(text_list)
        text_ids, text_mask = self.text_processor(text_list, lang_list)
        
        # Duration Predictor
        dur_onnx, *_ = self.dp_ort.run(None, {"text_ids": text_ids, "style_dp": style.dp, "text_mask": text_mask})
        dur_onnx = dur_onnx / speed
        
        # Text Encoder
        text_emb_onnx, *_ = self.text_enc_ort.run(None, {"text_ids": text_ids, "style_ttl": style.ttl, "text_mask": text_mask})
        
        # Diffusion
        xt, latent_mask = self.sample_noisy_latent(dur_onnx, noise_scale=noise_scale)
        total_step_np = np.array([total_step] * bsz, dtype=np.float32)
        
        for step in range(total_step):
            current_step = np.array([step] * bsz, dtype=np.float32)
            xt, *_ = self.vector_est_ort.run(
                None,
                {
                    "noisy_latent": xt,
                    "text_emb": text_emb_onnx,
                    "style_ttl": style.ttl,
                    "text_mask": text_mask,
                    "latent_mask": latent_mask,
                    "current_step": current_step,
                    "total_step": total_step_np,
                },
            )
            
        # Vocoder
        wav, *_ = self.vocoder_ort.run(None, {"latent": xt})
        return wav, dur_onnx

    def generate(self, text: str, lang: str = "ko", voice_id: str = "default", mix_voice_id: str = None, mix_ratio: float = 0.5, speed: float = 1.0, noise_scale: float = 1.0) -> Tuple[np.ndarray, int]:
        """
        Generate audio from text.
        Returns: (audio_array, sample_rate)
        """
        if not self._initialized:
            self.load_models()

        # Load style corresponding to voice_id (e.g. "M1" -> "styles/M1.json")
        style = self.load_style(voice_id)

        # [NEW] Voice Mixing Logic
        if mix_voice_id and mix_ratio > 0:
            try:
                style_mix = self.load_style(mix_voice_id)
                # Linear Interpolation
                # mix_ratio 0.0 = 100% Main, 1.0 = 100% Mix
                # Actually user likely expects "Add 30% of this" -> ratio 0.3
                
                # Formula: Result = (1 - ratio) * Main + ratio * Mix
                print(f"[Supertonic] Mixing Voice: {voice_id} ({(1-mix_ratio)*100}%) + {mix_voice_id} ({mix_ratio*100}%)")
                
                # Ensure shapes match (broadcasting should handle batch dim 1 vs 1)
                new_ttl = (1 - mix_ratio) * style.ttl + mix_ratio * style_mix.ttl
                new_dp = (1 - mix_ratio) * style.dp + mix_ratio * style_mix.dp
                style = Style(new_ttl, new_dp)
                
            except Exception as e:
                print(f"[Supertonic] Mix failed: {e}")
        
        max_len = 120 if lang == "ko" else 300
        text_list = chunk_text(text, max_len=max_len)
        
        wav_parts = []
        
        for chunk in text_list:
             wav, _ = self._infer([chunk], [lang], style, total_step=5, speed=speed, noise_scale=noise_scale)
             wav_parts.append(wav.squeeze()) # Remove batch dim
             # Add silence?
             silence = np.zeros(int(0.2 * self.sample_rate), dtype=np.float32)
             wav_parts.append(silence)
             
        final_wav = np.concatenate(wav_parts)
        return final_wav, self.sample_rate

    def load_style(self, voice_id: str) -> Style:
        # Default to M1 if voice_id is generic default
        if not voice_id or voice_id == "default" or voice_id.lower() == "supertonic generic":
            target_file = "M1.json"
        else:
            # Assume voice_id is the filename stem (e.g. "M1")
            target_file = f"{voice_id}.json"

        style_path = os.path.join(self.model_dir, "styles", target_file)
        
        # Fallback if specific style not found
        if not os.path.exists(style_path):
             # Try M1 as fallback
             fallback = os.path.join(self.model_dir, "styles", "M1.json")
             if os.path.exists(fallback):
                  style_path = fallback
        
        try:
            with open(style_path, "r") as f:
                data = json.load(f)
            
            # Simple loader
            # Check if lists, convert to numpy
            ttl_data = np.array(data["style_ttl"]["data"], dtype=np.float32).reshape(data["style_ttl"]["dims"])
            dp_data = np.array(data["style_dp"]["data"], dtype=np.float32).reshape(data["style_dp"]["dims"])
            
            return Style(ttl_data, dp_data)
        except Exception as e:
            print(f"[Supertonic] Warning: Could not load style {style_path}, using Zeros: {e}")
            # Fallback - Pure guess on dimensions
            return Style(np.zeros((1, 2, 80), dtype=np.float32), np.zeros((1, 2, 64), dtype=np.float32))

