import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../engine.mjs';
import {toPartnerProfileExtension} from '../partner-adapter.mjs';
test('VIS extension must not mutate original preferences',()=>{
 const s=newSession();s.faceRatings.F05=7;const snapshot=structuredClone(s);
 const a=toPartnerProfileExtension(s);
 assert.deepEqual(s,snapshot);
 assert.equal(a.namespace,'VIS:AESTHETIC_LAB');
 assert.equal(a.original_question_bank_untouched,true);
 assert.equal(a.domain_importance_override,null);
 assert.equal(a.relationship_compatibility_prediction,null);
 assert.equal(a.portraits.find(x=>x.id==='F05').attractiveness_1_to_7,7);
});
