@echo off
echo === VLStudio 500 Error Diagnostic ===
echo.

set VENV_PYTHON=C:\ViraLoopMedia\VLStudio\venv\Scripts\python.exe
set API_DIR=C:\ViraLoopMedia\VLStudio\apps\api

if not exist "%VENV_PYTHON%" (
    echo ERROR: venv not found at %VENV_PYTHON%
    echo Please run setup_install.bat first.
    pause
    exit /b 1
)

cd /d "%API_DIR%"

echo Running diagnostic...
"%VENV_PYTHON%" -c "
import sys, os, sqlite3, traceback, pathlib
sys.path.insert(0, r'C:\ViraLoopMedia\VLStudio\apps\api')

# Load DB path
try:
    import app.legacy_ddalkkak.api.database as db_module
    db_path = db_module.DB_PATH
    print(f'DB_PATH: {db_path}')
    print(f'DB exists: {db_path.exists()}')

    if db_path.exists():
        conn = sqlite3.connect(str(db_path))
        tables = [r[0] for r in conn.execute(\"SELECT name FROM sqlite_master WHERE type='table'\")]
        print(f'Tables count: {len(tables)}')
        for t in ['dissection_analyses', 'subtitle_jobs', 'tts_dub_jobs', 'clip_edit_jobs', 'remixes']:
            if t in tables:
                cols = [r[1] for r in conn.execute(f'PRAGMA table_info({t})')]
                print(f'  {t}.cost_usd: {\"cost_usd\" in cols}')
            else:
                print(f'  {t}: MISSING TABLE')
        conn.close()
    else:
        print('DB file does not exist - will be freshly created')
except Exception as e:
    print(f'DB check failed: {e}')
    traceback.print_exc()

print()
print('=== Testing API endpoints ===')
os.environ.setdefault('JWT_SECRET', 'test-secret')
os.environ.setdefault('SOLO_MODE', '1')

try:
    from app.legacy_ddalkkak.api import main
    from fastapi.testclient import TestClient
    client = TestClient(main.app)
    for ep in ['/subtitle/list', '/tts-dub/list', '/clip-edit/list', '/cost-summary']:
        try:
            r = client.get(ep, headers={'Authorization': 'Bearer solo'})
            status = r.status_code
            print(f'{ep} -> {status}')
            if status >= 400:
                print(f'  DETAIL: {r.text[:1500]}')
        except Exception as e:
            print(f'{ep} -> EXCEPTION: {e}')
            traceback.print_exc()
except Exception as e:
    print(f'Failed to import app: {e}')
    traceback.print_exc()
" 2>&1

echo.
echo === Done ===
pause
