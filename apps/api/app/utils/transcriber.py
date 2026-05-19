import os
import time
from faster_whisper import WhisperModel
from datetime import timedelta

class WhisperTranscriber:
    def __init__(self, model_size="base", device="cuda", compute_type="auto", model_path=None):
        self.model_size = model_size
        self.model_path = model_path
        self.device = device
        self.compute_type = compute_type
        
        print(f"[Whisper] Initializing Transcriber with model={model_size}, device={device}")

        try:
            import torch
            if device == "cuda":
                if not torch.cuda.is_available():
                    print("[Whisper] Device is 'cuda' but CUDA not available. Falling back to CPU...")
                    device = "cpu"
                    compute_type = "int8"
                else:
                    cap = torch.cuda.get_device_capability()
                    if cap[0] < 7 and compute_type == "auto":
                        print(f"[Whisper] Detected GPU Compute {cap[0]}.{cap[1]} (< 7.0). Forcing compute_type='int8' to prevent VRAM/arch mismatch.")
                        compute_type = "int8"
        except Exception as e:
            print(f"[Whisper] Warning during CUDA pre-check: {e}")

        try:
            print(f"[Whisper] Initializing model '{model_size}' on '{device}' (compute: {compute_type})...")
            self.model = WhisperModel(model_size, device=device, compute_type=compute_type, download_root=model_path)
            print(f"✅ [Whisper] Model '{model_size}' loaded successfully on '{device}'.")
        except Exception as e:
            print(f"⚠️ [Whisper] Failed to initialize on '{device}': {e}")
            if device == "cuda":
                print("[Whisper] Retrying on CPU with 'int8'...")
                try:
                    self.model = WhisperModel(model_size, device="cpu", compute_type="int8", download_root=model_path)
                    print(f"✅ [Whisper] Model '{model_size}' loaded successfully on CPU.")
                except Exception as e2:
                    print(f"❌ [Whisper] CRITICAL: CPU fallback also failed: {e2}")
                    raise e2
            else:
                raise e

    def format_timestamp(self, seconds: float):
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        secs = total_seconds % 60
        millis = int((td.total_seconds() - total_seconds) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def transcribe(self, video_path, output_srt_path=None, language=None):
        if not os.path.exists(video_path):
            print(f"[Whisper] ERROR: File not found for transcription: {video_path}")
            return {"status": "error", "message": f"File not found: {video_path}"}

        try:
            print(f"[Whisper] Starting actual transcription call for: {video_path}")
            start_time = time.time()
            
            current_beam = 5 if self.device == "cuda" else 2
            transcribe_kwargs = {"beam_size": current_beam}
            if language:
                transcribe_kwargs["language"] = language
                
            print(f"[Whisper] Calling self.model.transcribe(language={language or 'auto'}, beam_size={current_beam})...")
            try:
                segments, info = self.model.transcribe(video_path, **transcribe_kwargs)
            except Exception as e:
                error_str = str(e)
                if "ARCH_MISMATCH" in error_str or "libcublas" in error_str:
                    print(f"⚠️ [Whisper] GPU execution failed ({error_str.splitlines()[-1]}).")
                    print(f"🔄 [Whisper] Emergency Fallback: Reloading model onto CPU for maximum stability...")
                    self.model = None
                    import gc; gc.collect()
                    try:
                        import torch; torch.cuda.empty_cache()
                    except:
                        pass
                    from faster_whisper import WhisperModel
                    self.device = "cpu"
                    self.compute_type = "int8"
                    self.model = WhisperModel(self.model_size, device="cpu", compute_type="int8", download_root=self.model_path)
                    print("✅ [Whisper] CPU Model reloaded. Retrying transcription at higher speed...")
                    transcribe_kwargs["beam_size"] = 2
                    segments, info = self.model.transcribe(video_path, **transcribe_kwargs)
                else:
                    raise e
            
            detected_lang = info.language
            print(f"[Whisper] Detected language: {detected_lang} (probability: {info.language_probability:.2f})")

            if not output_srt_path:
                base_name = os.path.splitext(video_path)[0]
                output_srt_path = f"{base_name}.{detected_lang}.srt"

            # 3. Generate SRT content
            with open(output_srt_path, "w", encoding="utf-8") as f:
                for i, segment in enumerate(segments, start=1):
                    start_val = segment.start
                    end_val = segment.end
                    
                    if i % 5 == 0 or i == 1:
                        print(f"[Whisper] Progress: {end_val:.1f}s / {info.duration:.1f}s (Segment #{i})")
                        
                    start = self.format_timestamp(start_val)
                    end = self.format_timestamp(end_val)
                    text = segment.text.strip()
                    
                    f.write(f"{i}\n")
                    f.write(f"{start} --> {end}\n")
                    f.write(f"{text}\n\n")

            elapsed = time.time() - start_time
            print(f"[Whisper] Transcription completed in {elapsed:.2f}s -> {output_srt_path}")
            
            return {
                "status": "success",
                "language": detected_lang,
                "srt_path": output_srt_path,
                "duration": info.duration,
                "processing_time": elapsed
            }

        except Exception as e:
            print(f"[Whisper] Error during transcription: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

_transcriber_instances = {}

def get_transcriber(model_size="base", model_path=None):
    key = f"{model_size}_{model_path}"
    if key not in _transcriber_instances:
        _transcriber_instances[key] = WhisperTranscriber(model_size=model_size, model_path=model_path)
    return _transcriber_instances[key]
