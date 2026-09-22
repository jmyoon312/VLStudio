import re

with open('temp_pixeling_re/video_creative_re.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's inspect KP (the form component)
kp_idx = text.find('function KP(')
if kp_idx != -1:
    kp_code = text[kp_idx:kp_idx+8000]
    with open('temp_pixeling_re/kp_code.js', 'w', encoding='utf-8') as out:
        out.write(kp_code)
    print("Wrote kp_code.js")

# Let's inspect KB (the container component)
kb_idx = text.find('function KB(')
if kb_idx != -1:
    kb_code = text[kb_idx:kb_idx+8000]
    with open('temp_pixeling_re/kb_code.js', 'w', encoding='utf-8') as out:
        out.write(kb_code)
    print("Wrote kb_code.js")

# Let's inspect KO (the job item component)
ko_idx = text.find('function KO(')
if ko_idx != -1:
    ko_code = text[ko_idx:ko_idx+8000]
    with open('temp_pixeling_re/ko_code.js', 'w', encoding='utf-8') as out:
        out.write(ko_code)
    print("Wrote ko_code.js")
