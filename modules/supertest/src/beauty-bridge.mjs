/**
 * Super Test ↔ fixed Beauty Preference Lab bridge.
 * This view reuses Beauty Lab 1.0's exact IDs, prompts, comparative design,
 * scoring engine and immutable portrait files. Never map its scores to VIS importance.
 * BPL and BPL_ASSET_* are injected from the authoritative Beauty module by build.mjs.
 */
const BPL_STORAGE_KEY = 'my-perfect-woman.beauty.v1';
const BPL_TOTAL = BPL.VALUE_QUESTIONS.length + BPL.FACE_IDS.length + BPL.PAIR_QUESTIONS.length;
let beautyStep = 0;
const beautyImage = id => BPL_ASSET_IMAGES[id] || '';
function beautySession(){
  if(!BPL.validSession(state.beautySession)) state.beautySession=BPL.newSession();
  return state.beautySession;
}
function saveBeautySession(){
  persist(); // Included as a namespaced raw BPL v1 session in Super Test JSON exports.
  try{localStorage.setItem(BPL_STORAGE_KEY,JSON.stringify(state.beautySession))}catch(e){console.warn('Beauty module storage unavailable',e)}
}
function syncBeautyFromLocal(){
  let raw;
  try{raw=JSON.parse(localStorage.getItem(BPL_STORAGE_KEY)||'null')}catch{return false}
  if(!BPL.validSession(raw))return false;
  if(!BPL.validSession(state.beautySession) ||
    Object.keys(raw.valueAnswers).length + Object.keys(raw.faceRatings).length + Object.keys(raw.pairAnswers).length >
    Object.keys(state.beautySession.valueAnswers).length + Object.keys(state.beautySession.faceRatings).length + Object.keys(state.beautySession.pairAnswers).length
  ){state.beautySession=raw;persist();return true}
  return false;
}
function beautyProgress(session){
  return Object.keys(session.valueAnswers).length+Object.keys(session.faceRatings).length+Object.keys(session.pairAnswers).length;
}
function beautyResultContent(session){
  if(!BPL.validSession(session))return '<p class="empty">Δεν έχουν καταγραφεί έγκυρα αποτελέσματα Beauty Lab.</p>';
  const s=BPL.summary(session);
  const covered=s.axes.filter(a=>a.answered).length;
  const top=s.best.filter(x=>x.rating!==null).slice(0,3);
  const axes=s.axes.filter(x=>x.score!==null).map(a=>`<div class="data-row"><span>${esc(a.title)} <small>· ${a.answered}/2 απαντήσεις</small></span><strong>${esc(Math.abs(a.score)<0.15?'Ισορροπημένη προτίμηση':a.score<0?a.shortLow:a.shortHigh)}</strong></div>`).join('');
  const portraits=top.map(f=>`<div class="bpl-result-face"><img alt="Σταθερό συνθετικό πορτρέτο ${esc(f.id)}" src="${beautyImage(f.id)}"><span>${esc(f.id)} · ${f.rating}/7</span></div>`).join('');
  return `<div class="bpl-summary-meta"><strong>${s.valuesCompleted}/16</strong> αξίες · <strong>${s.ratingsCompleted}/12</strong> πορτρέτα · <strong>${s.baseCompleted}/24</strong> βασικές συγκρίσεις</div>
   ${top.length?`<div class="bpl-result-faces">${portraits}</div>`:'<p class="note">Δεν έχουν ακόμη βαθμολογηθεί πρόσωπα.</p>'}
   ${axes||'<p class="note">Δεν έχουν ακόμη αξιολογηθεί αισθητικές αξίες.</p>'}
   <p class="note">Κάλυψη αισθητικών αξόνων: ${covered}/8 · Έλεγχοι συνέπειας: ${s.checks.agreements} συμφωνίες σε ${s.checks.comparable} διαθέσιμους επανελέγχους. ${esc(s.evidence)}. Οι φωτογραφίες δεν προβλέπουν χαρακτήρα ή επιτυχία σχέσης.</p>
   <p class="note">Αποτελέσματα αισθητικής έλξης, <strong>όχι</strong> βαθμοί σημαντικότητας της εμφάνισης σε σύγκριση με άλλες αξίες.</p>`;
}
function beautyResultsCard(){
  if(!BPL.validSession(state.beautySession))return `<div class="result-card bpl-card"><h3>Beauty Intelligence · σταθερά πορτρέτα</h3><p class="note">Δεν έχεις ξεκινήσει ακόμη το ενοποιημένο οπτικό τεστ.</p>${btn('Έναρξη Beauty Test','beauty-open','primary')}</div>`;
  return `<div class="result-card bpl-card"><h3>Beauty Intelligence · προσωπική αισθητική</h3>${beautyResultContent(state.beautySession)}${btn('Συνέχεια / επανεξέταση','beauty-open','secondary')}</div>`;
}
function beautyView(){
  const session=beautySession(), index=beautyStep;
  const title=sectionPath('Beauty Intelligence');
  if(index>=BPL_TOTAL)return title+`<div class="hero"><span class="eyebrow">BEAUTY PREFERENCE LAB · BPL-1.0.0</span><h1>Το αισθητικό <em>προφίλ σου.</em></h1><p class="lead">Οι εικόνες είναι σταθερές, η βαθμολόγηση βασίζεται στις δικές σου επιλογές και δεν επηρεάζει τη σημαντικότητα των άλλων κατηγοριών.</p></div>${beautyResultsCard()}${btn('Προβολή ενιαίου προφίλ','results','primary')}${btn('Ξανά από τις ερωτήσεις','beauty-restart','soft')}`;
  let question,body,id,selected,kind;
  if(index<BPL.VALUE_QUESTIONS.length){
    const q=BPL.VALUE_QUESTIONS[index];
    kind='values';id=q.id;selected=session.valueAnswers[id];
    question=q.question;
    body=`<div class="bpl-extremes"><span>${esc(q.left)}</span><span>${esc(q.right)}</span></div><div class="importance-box bpl-scale">${[1,2,3,4,5,6,7].map(n=>`<button class="rating-btn ${selected===n?'selected':''}" data-action="beauty-answer" data-kind="values" data-id="${id}" data-value="${n}" aria-label="Αισθητική επιλογή ${n}/7">${n}</button>`).join('')}</div><p class="note">1 = αριστερή κατεύθυνση · 4 = ανάμεσα · 7 = δεξιά κατεύθυνση.</p>`;
  } else if(index<BPL.VALUE_QUESTIONS.length+BPL.FACE_IDS.length){
    kind='ratings';id=BPL.FACE_IDS[index-BPL.VALUE_QUESTIONS.length];selected=session.faceRatings[id];
    question='Πόσο σου αρέσει αισθητικά αυτό το πρόσωπο;';
    body=`<div class="bpl-one-face"><img src="${beautyImage(id)}" alt="Σταθερό συνθετικό πορτρέτο ${id}"></div><div class="importance-box bpl-scale">${[1,2,3,4,5,6,7].map(n=>`<button class="rating-btn ${selected===n?'selected':''}" data-action="beauty-answer" data-kind="ratings" data-id="${id}" data-value="${n}">${n}</button>`).join('')}</div><p class="note">1 = ελάχιστη προσωπική έλξη · 7 = πολύ μεγάλη προσωπική έλξη. Αυτή δεν είναι αντικειμενική βαθμολόγηση της γυναίκας.</p>`;
  } else {
    const q=BPL.PAIR_QUESTIONS[index-BPL.VALUE_QUESTIONS.length-BPL.FACE_IDS.length];
    kind='pairs';id=q.id;selected=session.pairAnswers[id];
    question='Ποιο από τα δύο πρόσωπα σε ελκύει περισσότερο;';
    body=`<div class="bpl-pair-images"><button class="bpl-face-choice ${selected==='L'?'selected':''}" data-action="beauty-answer" data-kind="pairs" data-id="${id}" data-value="L"><img src="${beautyImage(q.left)}" alt="Σταθερό πορτρέτο αριστερά"><span>Αριστερά</span></button><button class="bpl-face-choice ${selected==='R'?'selected':''}" data-action="beauty-answer" data-kind="pairs" data-id="${id}" data-value="R"><img src="${beautyImage(q.right)}" alt="Σταθερό πορτρέτο δεξιά"><span>Δεξιά</span></button></div><div class="utility-options">${[['TIE','Και τα δύο εξίσου'],['NONE','Κανένα'],['UNSURE','Δεν μπορώ να επιλέξω']].map(([val,label])=>`<button class="pill-btn ${selected===val?'selected':''}" data-action="beauty-answer" data-kind="pairs" data-id="${id}" data-value="${val}">${label}</button>`).join('')}</div>`;
  }
  return title+`<div class="question-panel bpl-screen">${commonPanelHeading('Beauty Intelligence · σταθερό τεστ',index+1,BPL_TOTAL)}<div class="question-kicker">${esc(kind==='values'?'Αισθητικές αξίες':kind==='ratings'?'Βαθμολόγηση προσώπων':'Σύγκριση προσώπων')} · ${esc(id)}</div><h1>${esc(question)}</h1>${body}<div class="toolbar">${btn('← Προηγούμενη','beauty-prev','soft',index===0?'disabled':'')}${btn('Παράλειψη / επόμενο →','beauty-next','secondary')}</div><p class="note">Το υλικό είναι ίδιο σε κάθε εκτέλεση (BPL-1.0.0). Τα δεδομένα μένουν στη συσκευή ή στο ιδιωτικό JSON export σου.</p></div>`;
}
function enterBeauty(){
  syncBeautyFromLocal();const s=beautySession();
  beautyStep=0;
  const steps=[
    ...BPL.VALUE_QUESTIONS.map(x=>['valueAnswers',x.id]),
    ...BPL.FACE_IDS.map(x=>['faceRatings',x]),
    ...BPL.PAIR_QUESTIONS.map(x=>['pairAnswers',x.id])
  ];
  const next=steps.findIndex(([group,id])=>!(id in s[group]));
  beautyStep=next<0?BPL_TOTAL:next;
  goto('beauty');
}
function answerBeauty(kind,id,value){
  const s=beautySession();
  if(kind==='values'){
    if(!BPL.VALUE_QUESTIONS.some(q=>q.id===id)||!Number.isInteger(+value)||+value<1||+value>7)throw Error('Invalid value question');
    s.valueAnswers[id]=Number(value);
  }else if(kind==='ratings'){
    if(!BPL.FACE_IDS.includes(id)||!Number.isInteger(+value)||+value<1||+value>7)throw Error('Invalid face');
    s.faceRatings[id]=Number(value);
  }else if(kind==='pairs'){
    if(!BPL.PAIR_QUESTIONS.some(p=>p.id===id)||!['L','R','TIE','NONE','UNSURE'].includes(value))throw Error('Invalid comparison');
    s.pairAnswers[id]=value;
  }else throw Error('Invalid Beauty answer');
  beautyStep=Math.min(BPL_TOTAL,beautyStep+1);
  s.phase=beautyStep<BPL.VALUE_QUESTIONS.length?'values':beautyStep<BPL.VALUE_QUESTIONS.length+BPL.FACE_IDS.length?'ratings':beautyStep<BPL_TOTAL?'pairs':'results';
  s.step=beautyStep;
  saveBeautySession();
  render();
}
