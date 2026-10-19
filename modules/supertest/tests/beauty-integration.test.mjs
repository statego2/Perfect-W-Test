import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createState,sanitizeState,exportJSON} from '../src/core.mjs';
import {newSession,validSession,summary} from '../../beauty/engine.mjs';
import {VALUE_QUESTIONS,PAIR_QUESTIONS} from '../../beauty/data.mjs';

const load=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const bank=load('../data/questions.json');
const modules=load('../data/modules.json');

test('BPL session survives Super Test JSON export/import without touching 135 answers',()=>{
  const superState=createState(), beauty=newSession();
  superState.answers['G-EMO']={choice:'A',at:'2026-10-19T12:00:00.000Z'};
  superState.importance.VIS=2;
  beauty.valueAnswers[VALUE_QUESTIONS[0].id]=6;
  beauty.faceRatings.F05=7;
  beauty.pairAnswers[PAIR_QUESTIONS[0].id]='L';
  assert.equal(validSession(beauty),true);
  superState.beautySession=beauty;
  const restored=sanitizeState(JSON.parse(exportJSON(superState)),bank,modules);
  assert.deepEqual(restored.beautySession,beauty);
  assert.equal(restored.answers['G-EMO'].choice,'A');
  assert.equal(restored.importance.VIS,2);
  assert.equal(Object.keys(restored.answers).length,1);
  assert.equal(summary(restored.beautySession).ratingsCompleted,1);
});

test('Old Super Test exports still import with empty Beauty module',()=>{
  const old=createState();delete old.beautySession;
  const restored=sanitizeState(old,bank,modules);
  assert.equal(restored.beautySession,null);
});

test('Corrupt or unversioned Beauty profile cannot gain access to results',()=>{
  const st=createState();st.beautySession={schema:1,version:'unknown',bank:'unknown',phase:'results',step:1,valueAnswers:{},faceRatings:{},pairAnswers:{}};
  const copy=sanitizeState(st,bank,modules);
  assert.equal(copy.beautySession,null);
});

test('Standalone generated Super Test includes all twelve exact static Beauty images',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes('Beauty Intelligence'));
  assert.ok(html.includes("case 'beauty':html=beautyView()"));
  assert.ok(html.includes('beautyResultsCard()'));
  const match=html.match(/const BPL_ASSET_IMAGES=(\{[^\n]+\});\n/);
  assert.ok(match,'Missing compiled asset map');
  const images=JSON.parse(match[1]);
  const manifest=load('../../beauty/assets/manifest.json');
  assert.deepEqual(Object.keys(images).sort(),manifest.images.map(x=>x.id).sort());
  for(const img of manifest.images){
    assert.ok(images[img.id].startsWith('data:image/webp;base64,'));
    const bytes=Buffer.from(images[img.id].split(',')[1],'base64');
    assert.equal(createHash('sha256').update(bytes).digest('hex'),img.sha256);
  }
});
