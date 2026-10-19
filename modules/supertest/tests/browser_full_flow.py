"""Full headless Chromium end-to-end walk through the unified flow.
Chromium navigation is admin-blocked in this environment, so set_content
checks runtime interaction without making unsupported persistence claims.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':390,'height':844})
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((ROOT/'index.html').read_text(encoding='utf-8'),wait_until='load')
 page.locator('[data-action="start"]').click()
 count=0
 while page.locator('button[data-action="answer"]').count():
  page.locator('button[data-action="answer"][data-choice="A"]').first.click()
  count+=1
  if count>135:raise AssertionError('Question stage did not advance')
 assert count==134,f'Expected 134 currently accessible text questions, got {count}'
 assert 'Πόσο σημαντική' in page.locator('h1').first.inner_text()
 for i in range(12):page.locator('button[data-action="rate"][data-n="5"]').click()
 assert 'Τι μετρά περισσότερο' in page.locator('h1').first.inner_text()
 for i in range(20):
  page.locator('[data-action="best"]').first.click()
  page.locator('[data-action="worst"]').nth(1).click()
  page.locator('[data-action="max-save"]').click()
 assert page.locator('[data-action="scenario"]').count()>0
 for i in range(12):page.locator('[data-action="scenario"][data-choice="B"]').first.click()
 assert 'Η εικόνα' in page.locator('h1').first.inner_text()
 # Optional discussion prompts remain accessible without gating the core survey
 page.locator('[data-action="home"]').first.click()
 page.locator('[data-module="reflection"]').click()
 assert 'Προσωπικές σημειώσεις' in page.locator('textarea').get_attribute('placeholder')
 for i in range(50):page.locator('[data-action="reflection-save"]').click()
 page.wait_for_timeout(100)
 assert 'Η εικόνα' in page.locator('h1').first.inner_text()
 result=page.content()
 assert '134' in result and '20' in result
 assert 'Συγκεκριμένα διλήμματα' in result and 'Απαντήσεις σε σενάρια' in result
 assert 'Σύνθεση στοιχείων από διαφορετικά τεστ' in result
 assert not errors,errors
 print('PASS: continuous flow 134 questions + 12 importance + 20 MaxDiff + 12 scenarios + 50 reflections -> results, no JS errors')
 browser.close()
