"""Photo module browser smoke, with a minimal in-memory IndexedDB API shim.
The shim validates UI wiring but NOT durable IndexedDB or Safari persistence.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
mock_db=r'''<script>
(()=>{
 const data=new Map();
 const fakeDb={createObjectStore(){},transaction(name,mode){
   const tx={oncomplete:null,onerror:null,objectStore(){return {
     put(v,k){data.set(k,v);queueMicrotask(()=>tx.oncomplete?.())},
     clear(){data.clear();queueMicrotask(()=>tx.oncomplete?.())},
     getAllKeys(){return {result:[...data.keys()]}},
     getAll(){const r={result:[...data.values()]};queueMicrotask(()=>tx.oncomplete?.());return r}
   }}};return tx;
 }};
 Object.defineProperty(window,'indexedDB',{configurable:true,value:{open(){
   const req={result:fakeDb,onsuccess:null,onerror:null,onupgradeneeded:null};
   queueMicrotask(()=>{req.onupgradeneeded?.();req.onsuccess?.()});return req;
 }}})
})()
</script>'''
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 html=(ROOT/'index.html').read_text(encoding='utf-8').replace('<script type="module">',mock_db+'<script type="module">')
 page.set_content(html,wait_until='load')
 page.wait_for_timeout(150)
 page.locator('[data-module="photos"]').click()
 assert page.locator('[data-action="visual"]').count()==0
 photo={'name':'adult-test.png','mimeType':'image/png','buffer':bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000b49444154789c636000020000050001a5f645400000000049454e44ae426082')}
 page.locator('[data-upload="VP-01-A"]').set_input_files(photo)
 page.wait_for_timeout(100)
 assert page.locator('[data-action="visual"]').count()==0
 page.locator('[data-upload="VP-01-B"]').set_input_files(photo)
 page.wait_for_timeout(100)
 assert page.locator('[data-action="visual"][data-choice="A"]').count()==1,page.locator('#toast').inner_text()
 page.locator('[data-action="visual"][data-choice="A"]').click()
 page.locator('[data-action="photo-prev"]').click()
 assert page.locator('[data-action="visual"][data-choice="A"]').count()==1
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-action="results"]').first.click()
 assert page.locator('.stats').inner_text().count('1 / 15')==1
 assert '1 / 135' in page.locator('.stats').inner_text()
 # Editing the first image must invalidate both linked votes.
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-module="photos"]').click()
 page.locator('[data-action="photo-prev"]').click()
 page.locator('[data-upload="VP-01-A"]').set_input_files(photo)
 page.wait_for_timeout(120)
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-action="results"]').first.click()
 assert '0 / 15' in page.locator('.stats').inner_text()
 assert '0 / 135' in page.locator('.stats').inner_text()
 assert not errors,errors
 print('PASS: image pair gating, synchronized G-VIS vote, replacement invalidation, zero JavaScript errors')
 browser.close()
