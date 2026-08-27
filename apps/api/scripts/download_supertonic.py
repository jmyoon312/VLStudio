import os
import sys
import shutil
import json

# Add backend directory to path
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if base_dir not in sys.path:
    sys.path.append(base_dir)

local_app_data = os.environ.get("LOCALAPPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Local"))
default_app_model_dir = os.path.join(local_app_data, "ViraLoop Studio", "media", "09_System", "models", "supertonic").replace("\\", "/")

try:
    from app import crud, database
    # Get session
    db = next(database.get_db())
    settings = crud.get_settings(db)
    model_dir = settings.supertone_model_path if settings.supertone_model_path and settings.supertone_model_path != "backend/models/supertonic" else default_app_model_dir
except Exception as e:
    print(f"Failed to load DB settings: {e}")
    model_dir = default_app_model_dir

# Resolve absolute path
if os.path.isabs(model_dir):
    target_dir = model_dir
else:
    target_dir = os.path.abspath(os.path.join(base_dir, model_dir))

print(f"Target directory resolved to: {target_dir}")
os.makedirs(target_dir, exist_ok=True)

# List of critical files that MUST exist for a valid install
required_files = [
    "onnx/tts.json",
    "onnx/unicode_indexer.json",
    "onnx/duration_predictor.onnx",
    "onnx/text_encoder.onnx",
    "onnx/vector_estimator.onnx",
    "onnx/vocoder.onnx",
    "voice_styles/M1.json"
]

def check_all_files_exist(directory):
    for f in required_files:
        if not os.path.exists(os.path.join(directory, f)):
            return False
    return True

repo_id = "Supertone/supertonic-3"

try:
    from huggingface_hub import HfApi, snapshot_download
    print(f"Checking version of Supertonic models from Hugging Face ({repo_id})...")
    
    # Check latest commit SHA on Hugging Face
    api = HfApi()
    repo_info = api.repo_info(repo_id=repo_id, repo_type="model")
    latest_sha = repo_info.sha
    print(f"Latest remote commit SHA: {latest_sha}")

    # Check local version
    version_file = os.path.join(target_dir, ".version")
    local_sha = ""
    if os.path.exists(version_file):
        try:
            with open(version_file, "r") as f:
                local_sha = f.read().strip()
        except:
            pass
    print(f"Local version SHA: {local_sha}")

    # If version matches and all critical files are present, skip download
    if local_sha == latest_sha and check_all_files_exist(target_dir):
        print("Supertonic model is already at the latest version. Skipping download.")
        sys.exit(0)

    print("New version detected or files missing. Downloading update...")
    
    # Download repository snapshot
    temp_download_dir = snapshot_download(
        repo_id=repo_id,
        allow_patterns=[
            "config.json",
            "onnx/*",
            "voice_styles/*"
        ]
    )
    print(f"Downloaded snapshot to temp dir: {temp_download_dir}")

    # Copy files according to SupertonicService expectations
    
    # 1. Copy onnx/ directory
    src_onnx_dir = os.path.join(temp_download_dir, "onnx")
    dst_onnx_dir = os.path.join(target_dir, "onnx")
    if os.path.exists(src_onnx_dir):
        # Clean existing directory
        if os.path.exists(dst_onnx_dir):
            shutil.rmtree(dst_onnx_dir)
        shutil.copytree(src_onnx_dir, dst_onnx_dir)
        print("Copied onnx/ directory")
    else:
        print("WARNING: onnx/ directory not found in snapshot!")

    # 2. Copy voice_styles/ directory
    src_voice_styles_dir = os.path.join(temp_download_dir, "voice_styles")
    dst_voice_styles_dir = os.path.join(target_dir, "voice_styles")
    if os.path.exists(src_voice_styles_dir):
        # Clean existing directory
        if os.path.exists(dst_voice_styles_dir):
            shutil.rmtree(dst_voice_styles_dir)
        shutil.copytree(src_voice_styles_dir, dst_voice_styles_dir)
        print("Copied voice_styles/ directory")
    else:
        print("WARNING: voice_styles/ directory not found in snapshot!")

    # Write the SHA version
    with open(version_file, "w") as f:
        f.write(latest_sha)
        
    print("Supertonic model setup completed and version .version file written!")

except Exception as e:
    print(f"Error downloading models: {e}")
    sys.exit(1)
