import os
import subprocess
import sys

def build():
    print("[Build] Compiling FastAPI backend with PyInstaller...")
    
    # 1. Define paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    api_dir = os.path.abspath(os.path.join(script_dir, ".."))
    entry_point = os.path.join(api_dir, "app", "main.py")
    output_dir = os.path.abspath(os.path.join(api_dir, "..", "..", "dist-backend"))
    
    # Ensure dist-backend directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Collect all workers submodule names for hidden imports
    workers_dir = os.path.join(api_dir, "app", "legacy_ddalkkak", "workers")
    worker_hidden = []
    if os.path.isdir(workers_dir):
        for fname in os.listdir(workers_dir):
            if fname.endswith(".py") and not fname.startswith("__"):
                mod = fname[:-3]
                worker_hidden.append(f"app.legacy_ddalkkak.workers.{mod}")
                # Also include without full path (legacy import style)
                worker_hidden.append(f"workers.{mod}")

    # 2. PyInstaller flags
    cmd = [
        "pyinstaller",
        "--onefile",
        "--name=api_server",
        f"--distpath={output_dir}",
        "--clean",
        # Core uvicorn/FastAPI hidden imports
        "--hidden-import=uvicorn.logging",
        "--hidden-import=uvicorn.loops",
        "--hidden-import=uvicorn.loops.auto",
        "--hidden-import=uvicorn.protocols",
        "--hidden-import=uvicorn.protocols.http",
        "--hidden-import=uvicorn.protocols.http.auto",
        "--hidden-import=uvicorn.protocols.websockets",
        "--hidden-import=uvicorn.protocols.websockets.auto",
        "--hidden-import=uvicorn.lifespan",
        "--hidden-import=uvicorn.lifespan.on",
        "--hidden-import=sqlalchemy.sql.default_comparator",
        "--hidden-import=sqlite3",
        "--hidden-import=pydantic_settings",
        "--hidden-import=jinja2",
        # Legacy ddalkkak package and workers
        "--hidden-import=app.legacy_ddalkkak",
        "--hidden-import=app.legacy_ddalkkak.api",
        "--hidden-import=app.legacy_ddalkkak.api.main",
        "--hidden-import=app.legacy_ddalkkak.api.database",
        "--hidden-import=app.legacy_ddalkkak.api.auth",
        "--hidden-import=app.legacy_ddalkkak.workers",
        # Include workers package data
        f"--add-data={os.path.join(api_dir, 'app', 'legacy_ddalkkak', 'workers')};app/legacy_ddalkkak/workers",
        # Include legacy db schema data
        f"--add-data={os.path.join(api_dir, 'app', 'legacy_ddalkkak', 'db')};app/legacy_ddalkkak/db",
        # Include static datasets / JSON resources
        "--add-data=app/services/persona/persona_library.json;app/services/persona",
        "--add-data=app/legacy_ddalkkak/frontend/dist;app/legacy_ddalkkak/frontend/dist",
        # Set main.py as the build target
        entry_point
    ]

    # Add all worker hidden imports
    for hidden in worker_hidden:
        cmd.append(f"--hidden-import={hidden}")
    
    print(f"[Build] Command: {' '.join(cmd)}")
    
    # Use python environment's pyinstaller
    pyinstaller_bin = os.path.join(api_dir, "..", "..", "venv_build", "Scripts", "pyinstaller.exe")
    if not os.path.exists(pyinstaller_bin):
        pyinstaller_bin = os.path.join(api_dir, "..", "..", "venv", "Scripts", "pyinstaller.exe")
    if not os.path.exists(pyinstaller_bin):
        pyinstaller_bin = os.path.join(api_dir, "venv", "Scripts", "pyinstaller.exe")
    if os.path.exists(pyinstaller_bin):
        cmd[0] = pyinstaller_bin
        
    subprocess.check_call(cmd, cwd=api_dir)
    print(f"[Build] Standalone backend compiled successfully to: {os.path.join(output_dir, 'api_server.exe')}")

if __name__ == "__main__":
    build()
