import re

def pretty_js(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        code = f.read()
    code = re.sub(r'([;\{\}])', r'\1\n', code)
    code = re.sub(r'(\(0,i\.jsx[s]?\))', r'\n\1', code)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)

pretty_js('temp_pixeling_re/comp_KO.js', 'temp_pixeling_re/ko_pretty.js')
pretty_js('temp_pixeling_re/comp_KU.js', 'temp_pixeling_re/ku_pretty.js')
pretty_js('temp_pixeling_re/comp_KB.js', 'temp_pixeling_re/kb_pretty.js')
print("Formatted KO, KU, KB.")
