#!/usr/bin/env python3
"""Bundle CSS, JavaScript and the twelve fixed portraits into offline.html."""
import base64,json,re
from pathlib import Path
r=Path(__file__).resolve().parent
html=(r/'index.html').read_text()
css=(r/'styles.css').read_text()
data=(r/'data.mjs').read_text()
engine=(r/'engine.mjs').read_text()
app=(r/'app.mjs').read_text()
data=re.sub(r'(?m)^export\s+','',data)
engine=re.sub(r'(?m)^import .*?;\s*$','',engine)
engine=re.sub(r'(?m)^export\s+','',engine)
app=re.sub(r'(?m)^import .*?;\s*$','',app)
faces={}
for i in range(1,13):
    key=f'F{i:02d}'
    faces[key]='data:image/webp;base64,'+base64.b64encode((r/'assets'/f'{key}.webp').read_bytes()).decode()
needle='function face(id){return `./assets/${id}.webp`;}'
assert needle in app
app=app.replace(needle,'const EMBEDDED_FACES='+json.dumps(faces,separators=(',',':'))+';\nfunction face(id){return EMBEDDED_FACES[id];}')
script='\n'.join([data,engine,app])
html=html.replace('<link rel="stylesheet" href="./styles.css">','<style>\n'+css+'\n</style>')
html=html.replace('<script type="module" src="./app.mjs"></script>','<script>\n'+script+'\n</script>')
(r/'offline.html').write_text(html)
print('Offline HTML rebuilt',len(html))
