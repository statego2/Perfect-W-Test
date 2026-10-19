from playwright.sync_api import sync_playwright
from pathlib import Path
import subprocess, time

ROOT=Path(__file__).resolve().parents[1]
URL='http://127.0.0.1:8399/'
server=subprocess.Popen(['python','-m','http.server','8399','--bind','127.0.0.1','--directory',str(ROOT/'dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(.5)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=2)
 errors=[]
 page.on('pageerror', lambda e: errors.append(str(e)))
 page.set_content((ROOT/'dist/index.html').read_text(encoding='utf-8'),wait_until='load')
 page.wait_for_timeout(800)
 print('initial title:',page.title(),'hero:',page.locator('h1').first.inner_text())
 assert page.get_by_text('Οι έξι ενότητες').is_visible()
 page.screenshot(path=str(ROOT/'tests/mobile-home.png'),full_page=True)
 page.get_by_role('button',name='Συνέχεια στο Super Test').click()
 print('question title:',page.locator('h1').first.inner_text())
 assert 'Ποιος γενικός τύπος' in page.locator('h1').first.inner_text()  # G-VIS gated
 page.locator('[data-action="answer"][data-choice="A"]').first.click()
 assert 'G-EMO' in page.locator('.question-kicker').inner_text()
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-module="maxdiff"]').click()
 page.locator('[data-action="best"]').first.click()
 page.locator('[data-action="worst"]').nth(1).click()
 page.locator('[data-action="max-save"]').click()
 assert 'MW-02' in page.locator('.question-kicker').inner_text()
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-module="importance"]').click()
 page.locator('[data-action="rate"][data-n="5"]').click()
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-module="situations"]').click()
 page.locator('[data-action="scenario"][data-choice="A"]').first.click()
 page.locator('[data-action="home"]').first.click()
 page.get_by_role('button',name='Προβολή του προφίλ μου').click()
 assert 'Προσωπική σειρά σημαντικότητας' in page.content()
 page.screenshot(path=str(ROOT/'tests/mobile-results.png'),full_page=True)
 page.set_content((ROOT/'dist/index.html').read_text(encoding='utf-8'),wait_until='load');page.wait_for_timeout(300)
 assert page.get_by_text('Προβολή του προφίλ μου').is_visible()
 page.locator('[data-action="results"]').click()
 assert 'Εμφάνιση και αισθητική' in page.content()
 print('Errors:',errors)
 assert not errors
 browser.close()
 server.terminate()
