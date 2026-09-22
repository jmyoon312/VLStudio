import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

def show(label, start, length=800):
    print(f'=== {label} at {start} ===')
    print(bundle[start:start+length])
    print('\n')

show('jn, ji, jl area', 1290800, 1500)
show('km (upload area)', 1294900, 1500)
show('kh (workstation form)', 1299900, 2500)
show('vw (settings) & kj start', 1314700, 2000)
