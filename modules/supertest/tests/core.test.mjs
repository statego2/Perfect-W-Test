import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {SCHEMA,createState,indexBank,saveAnswer,progress,domainSummary,maxdiffSummary,comparePartner,sanitizeState,importSession,snapshot,compareHistory,exportJSON} from '../src/core.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/questions.json',import.meta.url)));const modules=JSON.parse(readFileSync(new URL('../data/modules.json',import.meta.url)));
test('recovered 135 original questions have exact counts, unique IDs and 12 topics',()=>{
 indexBank(bank,modules);assert.equal(bank.questions.length,135);assert.equal(bank.domains.length,12);assert.equal(bank.questions.filter(x=>x.phase===1).length,12);assert.equal(bank.questions.filter(x=>x.phase===2).length,105);assert.equal(bank.questions.filter(x=>x.phase===3).length,18);assert.equal(bank.questions.find(x=>x.id==='D-VIS-09').A,'Λεπτή σιλουέτα');
});
test('balanced MaxDiff: 16 facets each appears exactly five times and no duplicate facet on card',()=>{const seen={};for(const c of modules.maxdiff){assert.equal(new Set(c.facets).size,4);for(const id of c.facets)seen[id]=(seen[id]||0)+1;}assert.deepEqual(new Set(Object.values(seen)),new Set([5]));assert.equal(Object.keys(seen).length,16);});
test('all IDs are independent; 135 binary answers do not infer domain importance',()=>{const s=createState();for(const q of bank.questions)saveAnswer(s,q.id,'A',bank);const p=progress(s,bank,modules);assert.equal(p.questions.done,135);assert.equal(p.importance.done,0);assert.equal(domainSummary(s,bank).find(x=>x.domain==='VIS').importance,null);});
test('explicit 0 importance retained independently of response choice',()=>{const s=createState();s.importance.VIS=0;saveAnswer(s,'D-VIS-09','A',bank);let a=domainSummary(s,bank).find(x=>x.domain==='VIS');assert.equal(a.importance,0);assert.equal(a.evidence.find(e=>e.id==='D-VIS-09').label,'Λεπτή σιλουέτα');});
test('valid other response categories remain distinguishable',()=>{const s=createState();saveAnswer(s,'G-VIS','BOTH',bank);saveAnswer(s,'G-CHEM','UNSURE',bank);saveAnswer(s,'G-EMO','SKIP',bank);assert.equal(domainSummary(s,bank).find(x=>x.domain==='VIS').covered,1);assert.equal(domainSummary(s,bank).find(x=>x.domain==='CHEM').uncertain,1);assert.equal(domainSummary(s,bank).find(x=>x.domain==='EMO').skip,1);});
test('saving unknown question or answer throws without mutation',()=>{const s=createState();assert.throws(()=>saveAnswer(s,'D-FUTURE','A',bank));assert.throws(()=>saveAnswer(s,'G-VIS','INVALID',bank));assert.deepEqual(s.answers,{});});
test('MaxDiff only counts observed comparisons and never invents confidence',()=>{const s=createState();const c=modules.maxdiff[0];s.maxdiff[c.id]={best:c.facets[0],worst:c.facets[1]};const sum=maxdiffSummary(s,modules);assert.equal(sum.find(f=>f.id===c.facets[0]).rate,1);assert.equal(sum.find(f=>f.id===c.facets[1]).rate,-1);assert.equal(sum.find(f=>f.id===c.facets[2]).rate,0);assert.equal(sum.filter(f=>f.rate===null).length,12);});
test('v2 import matches exact IDs and does not clobber prior responses',()=>{const s=createState();saveAnswer(s,'G-CHEM','A',bank);const legacy={answers:{'G-CHEM':{response:'B'},'D-VIS-09':{response:'B'}},importance_by_domain:{VIS:5}};const imported=importSession(legacy,bank,modules,s);assert.equal(imported.type,'v2');assert.equal(imported.state.answers['G-CHEM'].choice,'A');assert.equal(imported.state.answers['D-VIS-09'].choice,'B');assert.equal(imported.state.importance.VIS,5);});
test('numeric legacy IDs quarantined as opaque not fabricated mappings',()=>{const s=createState();const raw={answers:{'1':'A','2':'B'},visualPreferences:[5]};const imported=importSession(raw,bank,modules,s);assert.equal(imported.type,'legacy-unmapped');assert.equal(Object.keys(imported.state.answers).length,0);assert.deepEqual(imported.state.legacyImports[0].payload,raw);});
test('mixed known and unknown source IDs do not silently merge',()=>{const imported=importSession({answers:{'G-VIS':'A', '42':'B'}},bank,modules);assert.equal(imported.type,'legacy-unmapped');assert.deepEqual(imported.state.answers,{});});
test('full export roundtrip, malicious keys removed, invalid values dropped',()=>{const s=createState();s.answers['G-PER']={choice:'B',at:'2026-10-19'};s.answers['FAKE']={choice:'A'};s.importance.PER=5;s.importance.UNKNOWN=5;s.maxdiff['MW-01']={best:'whatever',worst:'whatever'};s.situations['SC-01']='A';const re=sanitizeState(JSON.parse(exportJSON(s)),bank,modules);assert.equal(re.schema,SCHEMA);assert.deepEqual(Object.keys(re.answers),['G-PER']);assert.deepEqual(re.importance,{PER:5});assert.deepEqual(re.maxdiff,{});assert.equal(re.situations['SC-01'],'A');});
test('pair comparison requires shared actual choices and skips unsure',()=>{const a=createState(),b=createState();saveAnswer(a,'G-PER','A',bank);saveAnswer(a,'G-EMO','UNSURE',bank);saveAnswer(a,'G-INT','BOTH',bank);saveAnswer(b,'G-PER','B',bank);saveAnswer(b,'G-EMO','A',bank);saveAnswer(b,'G-INT','A',bank);const c=comparePartner(a,b,bank);assert.equal(c.shared,2);assert.equal(c.agreements,1);assert.deepEqual(c.differences.map(x=>x.id),['G-PER']);});
test('history only compares identical item IDs answered both times',()=>{const s=createState();saveAnswer(s,'G-VIS','A',bank);snapshot(s);saveAnswer(s,'G-VIS','B',bank);saveAnswer(s,'G-EMO','A',bank);const hist=compareHistory(s,bank);assert.equal(hist.common,1);assert.deepEqual(hist.changed,['G-VIS']);});

test('cross-module analysis demands observed Best-Worst plus explicit importance and shows evidence IDs',async()=>{
 const {crossModuleInsights}=await import('../src/core.mjs');const st=createState();
 st.importance.EMO=5;
 // no evidence yet => no synthetic result
 assert.deepEqual(crossModuleInsights(st,bank,modules),[]);
 const subset=modules.maxdiff.filter(card=>card.facets.includes('emo')).slice(0,3);
 for(const c of subset)st.maxdiff[c.id]={best:'emo',worst:c.facets.find(x=>x!=='emo')};
 saveAnswer(st,'G-EMO','A',bank);
 const items=crossModuleInsights(st,bank,modules);
 const row=items.find(x=>x.domain==='EMO');
 assert.ok(row);assert.equal(row.importance,5);assert.equal(row.signal,'aligned-high');
 assert.equal(row.maxdiffEvidence.length,3);assert.ok(row.questionEvidence.includes('G-EMO'));
});

test('repeated highest importance does not auto-create arbitrary rank or force alignment',async()=>{
 const {crossModuleInsights}=await import('../src/core.mjs');const st=createState();
 for(const d of bank.domains)st.importance[d.code]=5;
 assert.deepEqual(crossModuleInsights(st,bank,modules),[]);
});
