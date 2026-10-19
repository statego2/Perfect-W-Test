import test from 'node:test';
import assert from 'node:assert/strict';
import {FACE_IDS,AXES,VALUE_QUESTIONS,BASE_PAIRS,PAIR_QUESTIONS} from '../data.mjs';
import {newSession,validSession,valueProfile,fitPairs,consistency,summary,exportJSON,importJSON} from '../engine.mjs';
test('immutable fixed inventory counts',()=>{
 assert.equal(FACE_IDS.length,12);assert.equal(AXES.length,8);
 assert.equal(VALUE_QUESTIONS.length,16);assert.equal(BASE_PAIRS.length,24);assert.equal(PAIR_QUESTIONS.length,27);
 assert.equal(new Set(BASE_PAIRS.map(p=>[p.left,p.right].sort().join(':'))).size,24);
 assert.equal(PAIR_QUESTIONS.filter(p=>p.kind==='repeat').length,3);
});
test('face presentations counterbalance side exactly',()=>{
 for(const id of FACE_IDS){
  assert.equal(BASE_PAIRS.filter(p=>p.left===id).length,2);
  assert.equal(BASE_PAIRS.filter(p=>p.right===id).length,2);
 }
});
test('self-report reverse anchoring is correct',()=>{
 const p=VALUE_QUESTIONS.find(q=>q.id==='V-01A');
 const r=VALUE_QUESTIONS.find(q=>q.id==='V-01B');
 assert.equal(valueProfile({[p.id]:7,[r.id]:1})[0].score,1);
 assert.equal(valueProfile({[p.id]:1,[r.id]:7})[0].score,-1);
 assert.equal(valueProfile({})[0].score,null);
});
test('Bradley Terry handles choices, ties and absent evidence',()=>{
 const answers={};
 for(const p of BASE_PAIRS)answers[p.id]=p.left==='F01'?'L':p.right==='F01'?'R':'TIE';
 assert.equal(fitPairs(answers)[0].id,'F01');
 assert.ok(fitPairs(Object.fromEntries(BASE_PAIRS.map(p=>[p.id,'TIE']))).every(x=>Math.abs(x.logWorth)<1e-9));
 assert.ok(fitPairs({}).every(x=>x.comparisons===0));
});
test('mirrored choice only tests consistency',()=>{
 const p=BASE_PAIRS[2],r=PAIR_QUESTIONS.find(x=>x.repeats===p.id);
 assert.equal(r.left,p.right);
 assert.deepEqual(consistency({[p.id]:'L',[r.id]:'R'}),{comparable:1,agreements:1,disagreements:0});
 assert.deepEqual(fitPairs({[p.id]:'L'}),fitPairs({[p.id]:'L',[r.id]:'L'}));
});
test('import validation and missing answers',()=>{
 const s=newSession();assert.equal(validSession(s),true);
 assert.equal(summary(s).axes.filter(a=>a.score===null).length,8);
 const bad=structuredClone(s);bad.faceRatings.F99=7;assert.equal(validSession(bad),false);
 assert.deepEqual(importJSON(exportJSON(s)).valueAnswers,{});
 assert.throws(()=>importJSON('{bad'),/Invalid JSON/);
});
