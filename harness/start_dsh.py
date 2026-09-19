import subprocess
import os
import sys
import re
import time

root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
os.chdir(root_dir)

env = os.environ.copy()
env["YOUTUBE2_API_KEY"] = "sk-95b157f52819c50b-62f661-a5667588"
env["DEEPSEEK_API_KEY"] = "sk-95b157f52819c50b-62f661-a5667588"

cmd = ["cmd.exe", "/c", "npx", "@deepseek-ai/dsh", "--profile", "web", "--no-open"]

print("[DSH Launcher] Starting DeepSeek Harness...")
proc = subprocess.Popen(
    cmd,
    cwd=root_dir,
    env=env,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    encoding="utf-8",
    errors="replace"
)

url_file = os.path.join(root_dir, "harness", "dsh_active_url.txt")

for line in iter(proc.stdout.readline, ''):
    line_clean = line.strip()
    print(line_clean)
    match = re.search(r'(http://127\.0\.0\.1:3080/\?token=[A-Za-z0-9_\-]+)', line_clean)
    if match:
        active_url = match.group(1)
        print(f"\n[DSH Launcher] >>> CAPTURED ACTIVE URL: {active_url} <<<\n")
        with open(url_file, "w", encoding="utf-8") as f:
            f.write(active_url)
        # Open in default browser automatically
        try:
            import webbrowser
            webbrowser.open(active_url)
        except Exception:
            pass

proc.wait()
