import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FACE_IDS,VALUE_QUESTIONS,PAIR_QUESTIONS} from '../../beauty/data.mjs';

const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const bridge=read('../src/beauty-bridge.mjs');
const app=read('../src/app.mjs');
const html=read('../index.html');
const launcher=read('../../../resume-full-test.html');

test('All 55 fixed Beauty steps are present and portraits appear first',()=>{
  assert.equal(FACE_IDS.length,12);
  assert.equal(PAIR_QUESTIONS.length,27);
  assert.equal(VALUE_QUESTIONS.length,16);
  assert.match(bridge,/const beautySteps = \[\s*\.\.\.BPL\.FACE_IDS\.map\(id=>\(\{kind:'ratings',id\}\)\)/);
  assert.match(bridge,/\.\.\.BPL\.PAIR_QUESTIONS\.map/);
  assert.match(bridge,/\.\.\.BPL\.VALUE_QUESTIONS\.map/);
  assert.match(bridge,/const step=beautySteps\[index\]/);
  assert.match(bridge,/beautySteps\[beautyStep\]\?\.kind \?\? 'results'/);
});
test('Resuming launches Beauty first and preserves all original 135 questions',()=>{
  const photoGate=app.indexOf("if(!BPL.validSession(state.beautySession)||beautyProgress(state.beautySession)<BPL_TOTAL)");
  const oldQuestionGate=app.indexOf("if(availableQuestions().some");
  assert.ok(photoGate>0&&photoGate<oldQuestionGate);
  assert.match(app,/'questions-open'\(\)\{selectModule\('questions'\)\}/);
  assert.match(bridge,/Συνέχεια στις υπόλοιπες 135 ερωτήσεις/);
  assert.match(app,/Περιγραφική ερώτηση — όχι φωτογραφικό τεστ/);
  assert.match(launcher,/sessionStorage\.setItem\('mpw-supertest-photo-first-v1','1'\)/);
  assert.match(app,/sessionStorage\.getItem\('mpw-supertest-photo-first-v1'\)/);
  assert.ok(html.includes('data:image/webp;base64,'));
  assert.match(html,/Συνέχεια · φωτογραφίες πρώτα/);
});
