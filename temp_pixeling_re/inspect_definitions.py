import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('temp_pixeling_re/24259-e2b669ff1d273a05.js', 'r', encoding='utf-8') as f:
    bundle = f.read()

# Let's find definition of jn, ji, vw exactly
m_jn = bundle.find('let jn=')
if m_jn == -1:
    m_jn = bundle.find('var jn=')
if m_jn == -1:
    # search around 1290500
    sub = bundle[1290000:1292000]
    print('Around 1290000:')
    print(sub[:1500])
else:
    print('Found jn:')
    print(bundle[m_jn:m_jn+500])

m_vw = bundle.find('let vw=')
if m_vw == -1:
    m_vw = bundle.find('var vw=')
if m_vw == -1:
    sub = bundle[1314000:1316000]
    print('\nAround 1314000 (vw):')
    print(sub[:1500])
else:
    print('\nFound vw:')
    print(bundle[m_vw:m_vw+500])
