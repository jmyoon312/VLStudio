with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_only.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Let's find return (0, i.jsx)( or return(0,i.jsxs)(
return_idx = text.rfind('return(0,')
if return_idx == -1:
    return_idx = text.rfind('return (0,')
print('return_idx:', return_idx)

if return_idx != -1:
    jsx_part = text[return_idx:]
    with open(r'c:\ViraLoopMedia\VLStudio\temp_pixeling_re\z4_jsx.js', 'w', encoding='utf-8') as out:
        out.write(jsx_part)
    print('Saved z4_jsx.js, len:', len(jsx_part))
