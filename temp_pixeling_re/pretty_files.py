import re

def pretty_js(input_path, output_path):
    with open(input_path, 'r', encoding='utf-8') as f:
        code = f.read()
    # Add newlines after commas, semicolons, and brackets to make it readable
    code = re.sub(r'([;\{\}])', r'\1\n', code)
    code = re.sub(r'(\(0,i\.jsx[s]?\))', r'\n\1', code)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(code)

pretty_js('temp_pixeling_re/kp_code.js', 'temp_pixeling_re/kp_pretty.js')
pretty_js('temp_pixeling_re/kb_code.js', 'temp_pixeling_re/kb_pretty.js')
pretty_js('temp_pixeling_re/ko_code.js', 'temp_pixeling_re/ko_pretty.js')
print("Formatted files created.")
