import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_PAIRS} from '../data.mjs';
import {newSession,valueProfile,profileStyles,fitPairs} from '../engine.mjs';
import {toPartnerProfileExtension} from '../partner-adapter.mjs';

test('systematic left-side choice suppresses pair ranking',()=>{
 const session=newSession();
 for(const p of BASE_PAIRS)session.pairAnswers[p.id]='L';
 const result=toPartnerProfileExtension(session);
 assert.equal(result.cautions.position_response_bias,true);
 assert.equal(result.pair_preference_order,null);
});
test('NONE and UNSURE are missing evidence, not dislikes or losses',()=>{
 const answers=Object.fromEntries(BASE_PAIRS.map((p,i)=>[p.id,i%2?'NONE':'UNSURE']));
 assert.ok(fitPairs(answers).every(p=>p.comparisons===0&&Math.abs(p.logWorth)<1e-9));
});
test('aesthetic style hypotheses remain unknown without self-reported values',()=>{
 const session=newSession();
 const initial=profileStyles(valueProfile(session.valueAnswers));
 assert.equal(initial.length,8);
 assert.ok(initial.every(item=>item.similarity===null));
 session.faceRatings.F01=7;
 assert.deepEqual(profileStyles(valueProfile(session.valueAnswers)),initial);
});
