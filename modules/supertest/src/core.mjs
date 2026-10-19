export const SCHEMA='mpw-supertest/v1';
export const CHOICES=new Set(['A','B','BOTH','NEITHER','UNSURE','SKIP']);
export const VISUAL_COUNT=15;
const safeObject=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
export function createState(){return {schema:SCHEMA,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),answers:{},importance:{},maxdiff:{},situations:{},visuals:{},reflections:{},dealbreakers:[],snapshots:[],legacyImports:[],extensions:[],extensionAnswers:{},beautySession:null};}
export function indexBank(bank,modules){
 if(bank?.questions?.length!==135||bank?.domains?.length!==12)throw Error('Expected original 135-question v2 bank and 12 domains');
 const questions=new Map(),domainSet=new Set(bank.domains.map(d=>d.code));
 for(const q of bank.questions){if(questions.has(q.id)||(!domainSet.has(q.domain)&&q.domain!=='TRADEOFF')||!q.prompt||!q.A||!q.B)throw Error('Malformed or duplicate bank question '+q.id);questions.set(q.id,q)}
 if(modules?.maxdiff?.length!==20||modules?.situations?.length!==12||modules?.reflections?.length!==50)throw Error('Missing extension modules');
 const cardIds=new Set();for(const card of modules.maxdiff){if(cardIds.has(card.id)||card.facets.length!==4||new Set(card.facets).size!==4)throw Error('Invalid MaxDiff cards');cardIds.add(card.id)}
 const facetCounts=new Map(modules.facets.map(f=>[f.id,0]));for(const c of modules.maxdiff)for(const id of c.facets){if(!facetCounts.has(id))throw Error('Unknown facet');facetCounts.set(id,facetCounts.get(id)+1)}
 if([...facetCounts.values()].some(n=>n!==5))throw Error('MaxDiff balance broken');
 return {questions,domainSet,facets:new Map(modules.facets.map(f=>[f.id,f]))};
}
export function sanitizeState(raw,bank,modules){
 const indexes=indexBank(bank,modules); const st=createState();
 if(!safeObject(raw)||raw.schema!==SCHEMA)throw Error('Unsupported schema');
 for(const key of ['createdAt','updatedAt'])if(typeof raw[key]==='string'&&raw[key].length<100)st[key]=raw[key];
 if(safeObject(raw.answers))for(const [id,record] of Object.entries(raw.answers)){
  if(indexes.questions.has(id)&&safeObject(record)&&CHOICES.has(record.choice))st.answers[id]={choice:record.choice,at:typeof record.at==='string'?record.at:st.updatedAt};
 }
 if(safeObject(raw.importance))for(const [domain,n] of Object.entries(raw.importance))if(indexes.domainSet.has(domain)&&Number.isInteger(n)&&n>=0&&n<=5)st.importance[domain]=n;
 const maxIds=new Map(modules.maxdiff.map(c=>[c.id,c]));
 if(safeObject(raw.maxdiff))for(const [id,v] of Object.entries(raw.maxdiff)){const card=maxIds.get(id);if(card&&safeObject(v)&&card.facets.includes(v.best)&&card.facets.includes(v.worst)&&v.best!==v.worst)st.maxdiff[id]={best:v.best,worst:v.worst};}
 const situIds=new Set(modules.situations.map(x=>x.id));if(safeObject(raw.situations))for(const [id,c] of Object.entries(raw.situations))if(situIds.has(id)&&CHOICES.has(c))st.situations[id]=c;
 if(safeObject(raw.visuals))for(const [id,c] of Object.entries(raw.visuals))if(/^VP-(0[1-9]|1[0-5])$/.test(id)&&CHOICES.has(c))st.visuals[id]=c;
 const reflectIds=new Set(modules.reflections.map(x=>x.id));if(safeObject(raw.reflections))for(const [id,t] of Object.entries(raw.reflections))if(reflectIds.has(id)&&typeof t==='string')st.reflections[id]=t.slice(0,5000);
 if(Array.isArray(raw.dealbreakers))st.dealbreakers=raw.dealbreakers.filter(x=>typeof x==='string').slice(0,30).map(x=>x.slice(0,300));
 if(Array.isArray(raw.snapshots))st.snapshots=raw.snapshots.filter(s=>safeObject(s)&&safeObject(s.answers)&&typeof s.at==='string').slice(-15).map(s=>({at:s.at,answers:Object.fromEntries(Object.entries(s.answers).filter(([k,v])=>indexes.questions.has(k)&&CHOICES.has(v)))}));
 if(Array.isArray(raw.legacyImports))st.legacyImports=raw.legacyImports.filter(x=>safeObject(x)&&typeof x.importedAt==='string').slice(-5).map(x=>({importedAt:x.importedAt,source:x.source==='unknown-legacy'?'unknown-legacy':'unmapped',payload:x.payload,notice:'Not mapped onto v2 answers.'}));
 // Preserve raw, versioned BPL session for the independent fixed-image engine.
 if(safeObject(raw.beautySession)&&raw.beautySession.schema===1&&raw.beautySession.version==='BPL-1.0.0'&&raw.beautySession.bank==='beauty-aesthetic-fixed-v1'&&['values','ratings','pairs','results'].includes(raw.beautySession.phase)&&Number.isInteger(raw.beautySession.step)&&raw.beautySession.step>=0&&raw.beautySession.step<=1000&&['valueAnswers','faceRatings','pairAnswers'].every(k=>safeObject(raw.beautySession[k])&&Object.keys(raw.beautySession[k]).length<=32))st.beautySession=JSON.parse(JSON.stringify(raw.beautySession));
 if(Array.isArray(raw.extensions))for(const item of raw.extensions.slice(0,30)){try{const module=validateExtension(item);if(!st.extensions.some(x=>x.id===module.id))st.extensions.push(module)}catch{ /* malformed imports are ignored */ }}
 if(safeObject(raw.extensionAnswers))for(const item of st.extensions){const entries=raw.extensionAnswers[item.id];if(!safeObject(entries))continue;st.extensionAnswers[item.id]={};for(const q of item.questions)if(q.options.some(o=>o.id===entries[q.id]))st.extensionAnswers[item.id][q.id]=entries[q.id];}
 return st;
}
export function saveAnswer(st,id,choice,bank){if(!bank.questions.some(q=>q.id===id)||!CHOICES.has(choice))throw Error('Invalid question/choice');st.answers[id]={choice,at:new Date().toISOString()};touch(st);}
export function touch(st){st.updatedAt=new Date().toISOString();}
export function answered(choice){return ['A','B','BOTH','NEITHER'].includes(choice)}
export function progress(st,bank,modules,visualPairs=[]) {
 const qa=bank.questions.filter(q=>own(st.answers,q.id)&&st.answers[q.id].choice!=='SKIP').length;
 return {questions:{done:qa,total:bank.questions.length},importance:{done:Object.keys(st.importance).length,total:bank.domains.length},maxdiff:{done:Object.keys(st.maxdiff).length,total:modules.maxdiff.length},situations:{done:Object.keys(st.situations).filter(id=>st.situations[id]!=='SKIP').length,total:modules.situations.length},visuals:{done:Object.keys(st.visuals).filter(id=>st.visuals[id]!=='SKIP').length,total:VISUAL_COUNT},reflections:{done:Object.keys(st.reflections).filter(id=>st.reflections[id].trim()).length,total:modules.reflections.length},photoPairsReady:visualPairs.filter(p=>p.ready).length};
}
export function domainSummary(st,bank){return bank.domains.map(d=>{
 const qs=bank.questions.filter(q=>q.domain===d.code);
 const evidence=qs.filter(q=>answered(st.answers[q.id]?.choice)).map(q=>({id:q.id,choice:st.answers[q.id].choice,label:st.answers[q.id].choice==='A'?q.A:st.answers[q.id].choice==='B'?q.B:'Και οι δύο εκδοχές',A:q.A,B:q.B}));
 const skip=qs.filter(q=>st.answers[q.id]?.choice==='SKIP').length;
 return {domain:d.code,name:d.name,importance:st.importance[d.code]??null,evidence,covered:evidence.length,asked:qs.length,skip,uncertain:qs.filter(q=>st.answers[q.id]?.choice==='UNSURE').length};
});}
export function maxdiffSummary(st,modules){return modules.facets.map(f=>{
 const exposures=modules.maxdiff.filter(c=>c.facets.includes(f.id)).length;
 const best=Object.values(st.maxdiff).filter(v=>v.best===f.id).length;
 const worst=Object.values(st.maxdiff).filter(v=>v.worst===f.id).length;
 const answeredCards=modules.maxdiff.filter(c=>c.facets.includes(f.id)&&st.maxdiff[c.id]).length;
 return {...f,exposures,answeredCards,best,worst,net:best-worst,rate:answeredCards?(best-worst)/answeredCards:null};
}).sort((a,b)=>(b.rate??-99)-(a.rate??-99));}
/** Transparent cross-module synthesis. Not a psychometric estimator. */
export function crossModuleInsights(st,bank,modules){
 const ds=domainSummary(st,bank),mx=maxdiffSummary(st,modules);
 const byDomain=new Map(bank.domains.map(d=>[d.code,[]]));
 for(const f of mx){if(byDomain.has(f.domain)&&f.answeredCards>=3)byDomain.get(f.domain).push(f)}
 return ds.map(d=>{
  const forced=byDomain.get(d.domain)||[];
  const cards=modules.maxdiff.filter(c=>st.maxdiff[c.id]&&c.facets.some(id=>modules.facets.some(f=>f.id===id&&f.domain===d.domain))).map(c=>c.id);
  const relevantSituations=modules.situations.filter(q=>q.domain===d.domain&&answered(st.situations[q.id]));
  let signal='insufficient';
  if(d.importance!==null&&forced.length){
   const net=forced.reduce((total,f)=>total+f.net,0);
   signal=d.importance>=4&&net>0?'aligned-high':d.importance>=4&&net<0?'different-signals':d.importance<=2&&net>0?'different-signals':'mixed';
  }
  return {domain:d.domain,name:d.name,importance:d.importance,questionEvidence:d.evidence.map(e=>e.id),
   maxdiffEvidence:cards,facetEvidence:forced.map(f=>({id:f.id,label:f.label,net:f.net,seen:f.answeredCards})),
   scenarioEvidence:relevantSituations.map(q=>q.id),signal};
 }).filter(x=>x.signal!=='insufficient').sort((a,b)=>['different-signals','aligned-high','mixed'].indexOf(a.signal)-['different-signals','aligned-high','mixed'].indexOf(b.signal));
}
export function situationalSummary(st,modules){return modules.situations.filter(q=>answered(st.situations[q.id])).map(q=>({id:q.id,domain:q.domain,title:q.title,choice:st.situations[q.id],selected:st.situations[q.id]==='A'?q.A:st.situations[q.id]==='B'?q.B:'Και οι δύο'}));}
export function comparePartner(a,b,bank){const rows=[];for(const q of bank.questions){const x=a.answers[q.id]?.choice,y=b.answers[q.id]?.choice;if(!answered(x)||!answered(y))continue;const agree=x===y||(x==='BOTH'&&(y==='A'||y==='B'))||(y==='BOTH'&&(x==='A'||x==='B'));rows.push({id:q.id,domain:q.domain,a:x,b:y,agree});}return {shared:rows.length,agreements:rows.filter(x=>x.agree).length,differences:rows.filter(x=>!x.agree),note:'Descriptive concordance on exactly shared responses, not predictive relationship compatibility.'};}
export function snapshot(st){st.snapshots.push({at:new Date().toISOString(),answers:Object.fromEntries(Object.entries(st.answers).map(([k,v])=>[k,v.choice]))});st.snapshots=st.snapshots.slice(-15);touch(st);}
export function compareHistory(st,bank){if(!st.snapshots.length)return null;const previous=st.snapshots[st.snapshots.length-1];const common=[],changed=[];for(const q of bank.questions){const old=previous.answers[q.id],now=st.answers[q.id]?.choice;if(answered(old)&&answered(now)){common.push(q.id);if(old!==now)changed.push(q.id)}}return {at:previous.at,common:common.length,changed};}
export function importSession(raw,bank,modules,previous=null){
 if(!safeObject(raw))throw Error('JSON object required');
 if(raw.schema===SCHEMA){return {state:sanitizeState(raw,bank,modules),type:'unified',notice:'Εισαγωγή ενιαίας συνεδρίας.'};}
 const v2raw=safeObject(raw.answers)?raw.answers:null;
 const keys=v2raw?Object.keys(v2raw):[];
 const known=new Set(bank.questions.map(q=>q.id));
 const matches=keys.filter(k=>known.has(k)).length;
 if(matches>0&&matches===keys.length){const st=previous?sanitizeState(previous,bank,modules):createState();
  for(const [id,v] of Object.entries(v2raw)){const c=typeof v==='string'?v:((v?.response)??(v?.choice));if(CHOICES.has(c)&&!own(st.answers,id))st.answers[id]={choice:c,at:typeof v?.answered_at==='string'?v.answered_at:new Date().toISOString()};}
  if(safeObject(raw.importance_by_domain))for(const [key,n] of Object.entries(raw.importance_by_domain))if(bank.domains.some(x=>x.code===key)&&Number.isInteger(n)&&n>=0&&n<=5&&!own(st.importance,key))st.importance[key]=n;
  touch(st);return {state:st,type:'v2',notice:'Αντιστοίχιση μέσω πραγματικών ID ερωτήσεων v2 (χωρίς επικάλυψη υπαρχουσών απαντήσεων).'};
 }
 const st=previous?sanitizeState(previous,bank,modules):createState();
 // retain unknown legacy evidence without interpreting / mapping it
 st.legacyImports.push({importedAt:new Date().toISOString(),source:'unknown-legacy',payload:JSON.parse(JSON.stringify(raw)),notice:'Not mapped onto v2 answers.'});st.legacyImports=st.legacyImports.slice(-5);touch(st);
 return {state:st,type:'legacy-unmapped',notice:'Το παλαιό αρχείο αποθηκεύτηκε αυτούσιο, αλλά ΔΕΝ αντιστοιχίστηκε σε ερωτήσεις v2.'};
}
export function exportJSON(st){return JSON.stringify(st,null,2)}

/** Integration contract: questionnaire-only plugin, no executable code and no silent legacy crosswalk. */
export function validateExtension(raw){
 if(!safeObject(raw)||raw.schema!=='mpw-module/v1'||typeof raw.id!=='string'||!/^ext-[a-z0-9-]{3,48}$/.test(raw.id))throw Error('Invalid module ID/schema');
 if(typeof raw.title!=='string'||raw.title.trim().length<3||raw.title.length>110)throw Error('Invalid module title');
 if(!Array.isArray(raw.questions)||raw.questions.length<1||raw.questions.length>200)throw Error('Invalid module questions count');
 const qIds=new Set();const questions=raw.questions.map(q=>{
  if(!safeObject(q)||typeof q.id!=='string'||!/^[-a-zA-Z0-9_]{1,50}$/.test(q.id)||qIds.has(q.id)||typeof q.prompt!=='string'||!q.prompt.trim()||q.prompt.length>500)throw Error('Invalid/duplicate module question');
  qIds.add(q.id);if(!Array.isArray(q.options)||q.options.length<2||q.options.length>6)throw Error('2..6 options required');
  const ids=new Set(),options=q.options.map(o=>{if(!safeObject(o)||typeof o.id!=='string'||!/^[-a-zA-Z0-9_]{1,30}$/.test(o.id)||ids.has(o.id)||typeof o.label!=='string'||!o.label.trim()||o.label.length>240)throw Error('Invalid option');ids.add(o.id);return {id:o.id,label:o.label}});
  return {id:q.id,prompt:q.prompt,options};
 });
 return {schema:'mpw-module/v1',id:raw.id,title:raw.title,description:typeof raw.description==='string'?raw.description.slice(0,400):'',questions};
}
export function addExtension(st,raw){const def=validateExtension(raw);if(st.extensions.some(x=>x.id===def.id))throw Error('This module already exists');st.extensions.push(def);st.extensionAnswers[def.id]={};touch(st);return def;}
export function recordExtensionChoice(st,moduleId,questionId,optionId){const mod=st.extensions.find(x=>x.id===moduleId),q=mod?.questions.find(q=>q.id===questionId);if(!q||!q.options.some(o=>o.id===optionId))throw Error('Unknown module question/option');st.extensionAnswers[moduleId]??={};st.extensionAnswers[moduleId][questionId]=optionId;touch(st);}
export function extensionSummary(st){return st.extensions.map(m=>({id:m.id,title:m.title,done:m.questions.filter(q=>st.extensionAnswers[m.id]?.[q.id]).length,total:m.questions.length,items:m.questions.filter(q=>st.extensionAnswers[m.id]?.[q.id]).map(q=>({id:q.id,prompt:q.prompt,selected:q.options.find(x=>x.id===st.extensionAnswers[m.id][q.id]).label}))}));}
