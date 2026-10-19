import {VERSION, BANK_ID, FACE_IDS, AXES, VALUE_QUESTIONS, BASE_PAIRS, PAIR_QUESTIONS, STYLES} from './data.mjs';

export function newSession() {return {schema:1,version:VERSION,bank:BANK_ID,startedAt:new Date().toISOString(),valueAnswers:{},faceRatings:{},pairAnswers:{},phase:'values',step:0};}
const validChoice = x=>['L','R','TIE','NONE','UNSURE'].includes(x);
export function validSession(input) {
  if(!input || typeof input!=='object'||Array.isArray(input)) return false;
  if(input.schema!==1 || input.version!==VERSION||input.bank!==BANK_ID) return false;
  if(!['values','ratings','pairs','results'].includes(input.phase))return false;
  if(!Number.isInteger(input.step)||input.step<0||input.step>1000)return false;
  if(![input.valueAnswers,input.faceRatings,input.pairAnswers].every(x=>x&&typeof x==='object'&&!Array.isArray(x)))return false;
  const qids=new Set(VALUE_QUESTIONS.map(q=>q.id));
  const pids=new Set(PAIR_QUESTIONS.map(p=>p.id));
  for(const [k,v] of Object.entries(input.valueAnswers)) if(!qids.has(k)||(!Number.isInteger(v)&&v!==null)||(v!==null &&(v<1||v>7)))return false;
  for(const [k,v] of Object.entries(input.faceRatings)) if(!FACE_IDS.includes(k)||(!Number.isInteger(v)&&v!==null)||(v!==null&&(v<1||v>7)))return false;
  for(const [k,v] of Object.entries(input.pairAnswers)) if(!pids.has(k)||!(validChoice(v)||v===null))return false;
  return true;
}

/** Per-axis score range −1 (left aesthetic anchor) to +1 (right). Never weights relationship priorities. */
export function valueProfile(answers) {
  return AXES.map(axis=>{
    const items=VALUE_QUESTIONS.filter(q=>q.axis===axis.id);
    const values=items.filter(q=>Number.isInteger(answers[q.id]))
      .map(q=>((answers[q.id]-4)/3)*(q.reverse?-1:1));
    const mean=values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
    const spread=values.length===2?Math.abs(values[0]-values[1]):null;
    return {...axis,score:mean,answered:values.length,divergent:spread!==null&&spread>1,spread};
  });
}

/** Ratings are personal judgments only. The set's portraits are confounded by multiple features. */
export function portraitProfile(ratings) {
  return FACE_IDS.map(id=>({id,rating:Number.isInteger(ratings[id])?ratings[id]:null}));
}

/**
 * Regularized Bradley–Terry paired-choice model: item log-worths, sigmoid(scoreA-scoreB).
 * Ties count as half a win for each; NONE and UNSURE are missing comparisons.
 * No claims of percentage chance of success/compatibility.
 */
export function fitPairs(answers) {
  const names=FACE_IDS;
  const index=new Map(names.map((id,i)=>[id,i]));
  const records=[];
  for(const pair of BASE_PAIRS){
    const response=answers[pair.id];
    if(!['L','R','TIE'].includes(response))continue;
    records.push({i:index.get(pair.left),j:index.get(pair.right),y:response==='L'?1:response==='R'?0:0.5});
  }
  let theta=Array(names.length).fill(0);
  // MAP estimate: sum(log likelihood) – 1/(2σ²) * sum θ², σ=1.5
  for(let n=0;n<1600;n++){
    const g=theta.map(x=>-x/(1.5**2));
    for(const {i,j,y} of records){
      const z=Math.max(-30,Math.min(30,theta[i]-theta[j]));
      const p=1/(1+Math.exp(-z));const d=y-p;g[i]+=d;g[j]-=d;
    }
    const lr=0.17/(1+0.002*n);
    theta=theta.map((x,i)=>x+lr*g[i]);
  }
  const counts=Object.fromEntries(names.map(id=>[id,0]));
  for(const {i,j} of records){counts[names[i]]++;counts[names[j]]++;}
  return names.map((id,i)=>({id,logWorth:theta[i],comparisons:counts[id]}))
    .sort((a,b)=>b.logWorth-a.logWorth || a.id.localeCompare(b.id));
}

/** Repeat checks not used in scores, only consistency signal. */
export function consistency(answers){
  let comparable=0, disagreements=0, agreements=0;
  for(const p of PAIR_QUESTIONS.filter(p=>p.kind==='repeat')){
    const base=BASE_PAIRS.find(q=>q.id===p.repeats);
    const original=answers[base.id],repeated=answers[p.id];
    if(!['L','R','TIE'].includes(original)||!['L','R','TIE'].includes(repeated))continue;
    comparable++;
    const expected=original==='L'?'R':original==='R'?'L':'TIE';
    if(expected===repeated)agreements++;else disagreements++;
  }
  return {comparable,agreements,disagreements};
}

export function profileStyles(axisResults){
  const scores=Object.fromEntries(axisResults.filter(a=>a.score!==null).map(a=>[a.id,a.score]));
  return STYLES.map(style=>{
    const available=Object.entries(style.targets).filter(([axis])=>scores[axis]!==undefined);
    // normalized proximity over directly covered dimensions, no probability interpretation
    const similarity=available.length?1-available.reduce((sum,[axis,target])=>sum+Math.abs(scores[axis]-target)/2,0)/available.length:null;
    return {...style,similarity,coverage:available.length,dimensions:Object.keys(style.targets).length};
  }).sort((a,b)=>(b.similarity??-1)-(a.similarity??-1));
}

export function summary(session){
  if(!validSession(session))throw new Error('Session invalid / incompatible version');
  const axes=valueProfile(session.valueAnswers);
  const portraits=portraitProfile(session.faceRatings);
  const pairs=fitPairs(session.pairAnswers);
  const checks=consistency(session.pairAnswers);
  const completed=Object.values(session.pairAnswers).filter(v=>['L','R','TIE'].includes(v)).length;
  const baseCompleted=BASE_PAIRS.filter(p=>['L','R','TIE'].includes(session.pairAnswers[p.id])).length;
  const ratingsCompleted=portraits.filter(p=>p.rating!==null).length;
  const valuesCompleted=VALUE_QUESTIONS.filter(q=>Number.isInteger(session.valueAnswers[q.id])).length;
  const best=portraits.filter(p=>p.rating!==null).sort((a,b)=>b.rating-a.rating);
  const styles=profileStyles(axes);
  const diverging=axes.filter(a=>a.divergent).length;
  // This is an evidence label, not confidence interval / probability.
  const positionChoices=BASE_PAIRS.map(q=>session.pairAnswers[q.id]).filter(x=>x==='L'||x==='R');
  const positionBias=positionChoices.length>=10 && Math.max(positionChoices.filter(x=>x==='L').length, positionChoices.filter(x=>x==='R').length)/positionChoices.length>=0.85;
  const pairContrast=pairs.length?pairs[0].logWorth-pairs.at(-1).logWorth:0;
  const evidence=positionBias || checks.disagreements>=2?'χρειάζεται επανέλεγχος':baseCompleted>=20 && checks.disagreements===0 && checks.comparable>=2?'καλύτερη κάλυψη':baseCompleted>=10?'ενδεικτική κάλυψη':'περιορισμένη κάλυψη';
  return {axes,portraits,pairs,checks,styles,best,diverging,completed,baseCompleted,ratingsCompleted,valuesCompleted,evidence,positionBias,pairContrast};
}

export function exportJSON(session){if(!validSession(session))throw new Error('Invalid session');return JSON.stringify({...session,exportedAt:new Date().toISOString()},null,2);}
export function importJSON(string){
  if(typeof string!=='string'||string.length>200000)throw new Error('Too large / invalid file');
  let data;try{data=JSON.parse(string);}catch{throw new Error('Invalid JSON');}
  if(!validSession(data))throw new Error('Incompatible or corrupted profile version');
  return data;
}
