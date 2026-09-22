# Let's inspect the handlers in comp_KB.js
with open('temp_pixeling_re/comp_KB.js', 'r', encoding='utf-8') as f:
    kb = f.read()

import re

# Look for addJobs, export, startQueue, STT, audio handlers
print("=== HANDLERS IN KB ===")
handlers = re.findall(r'(const|let|function)?\s*([a-zA-Z0-9_$]+)\s*=\s*(?:\([^\)]*\)|async\s*\([^\)]*\))\s*=>', kb)
for h in handlers:
    print(" ", h)

# Let's inspect how handleSelectDesktopAudio or audio upload works
audio_snippet = re.search(r'.{0,100}handleSelectDesktopAudio.{0,300}', kb)
if audio_snippet:
    print("\nhandleSelectDesktopAudio snippet:\n", audio_snippet.group(0))

# Let's inspect STT call in KB
stt_snippet = re.search(r'.{0,100}stt.{0,400}', kb, re.IGNORECASE)
if stt_snippet:
    print("\nSTT snippet:\n", stt_snippet.group(0))

# Let's inspect CapCut export call in KB / KO
capcut_snippet = re.search(r'.{0,100}CapCut.{0,300}', kb)
if capcut_snippet:
    print("\nCapCut snippet:\n", capcut_snippet.group(0))
