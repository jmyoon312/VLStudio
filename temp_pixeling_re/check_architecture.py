import re, json

with open('temp_pixeling_re/page-5ca01b04f75cb3f3.js', 'r', encoding='utf-8', errors='ignore') as f:
    ve_code = f.read()

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8', errors='ignore') as f:
    batch_code = f.read()

print("=== 1. TAURI IPC COMMANDS (window.__TAURI__.invoke / @tauri-apps/api) ===")
tauri_invokes_ve = set(re.findall(r'invoke\([\'\"]([a-zA-Z0-9_\:]+)[\'\"]', ve_code))
tauri_invokes_batch = set(re.findall(r'invoke\([\'\"]([a-zA-Z0-9_\:]+)[\'\"]', batch_code))
print("Tauri invokes in /ve:", tauri_invokes_ve)
print("Tauri invokes in batch:", tauri_invokes_batch)

print("\n=== 2. LOCAL VS CLOUD API CALLS ===")
# Check where fetch() or axios or trpc calls go:
fetch_calls = set(re.findall(r'fetch\([\'\"`]([^\'\"`\)\s]+)[\'\"`]', ve_code + batch_code))
print(f"Total direct fetch endpoints: {len(fetch_calls)}")
for ep in sorted(fetch_calls)[:35]:
    print("  fetch:", ep)

print("\n=== 3. CLIENT-SIDE VS SERVER-SIDE RENDERING & LOGIC ===")
# Does it render via Canvas / WebGL / Web Audio locally?
canvas_ops = re.findall(r'getContext\([\'\"](2d|webgl|webgl2)[\'\"]\)', ve_code + batch_code)
print("Canvas getContext calls:", len(canvas_ops))

# Does it use FFmpeg in browser (ffmpeg.wasm) or local binary or server?
ffmpeg_wasm = "ffmpeg.wasm" in ve_code or "createFFmpeg" in ve_code
print("ffmpeg.wasm used in client?:", ffmpeg_wasm)

# Check what happens during generation:
# e.g., POST to server job queue vs client-side processing
job_queues = set(re.findall(r'/api/[a-zA-Z0-9_\-]+/jobs', ve_code + batch_code))
print("Server job queue endpoints:", job_queues)
