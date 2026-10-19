/**
 * Beauty Preference Lab 1.0 — fixed, versioned stimulus and question bank.
 * These are original exploratory prompts, NOT a clinically validated scale.
 * The left/right anchors are descriptive aesthetic impressions, not moral values.
 */
export const VERSION = 'BPL-1.0.0';
export const BANK_ID = 'beauty-aesthetic-fixed-v1';
export const FACE_IDS = Object.freeze(Array.from({length:12},(_,i)=>`F${String(i+1).padStart(2,'0')}`));

export const AXES = Object.freeze([
  {id:'presentation', title:'Φυσικότητα – επιμέλεια', low:'Ανεπιτήδευτη, φυσική εμφάνιση', high:'Προσεγμένο, polished αποτέλεσμα', shortLow:'Φυσικότητα', shortHigh:'Επιμέλεια', description:'Πόσο σε ελκύει η οπτικά ανεπιτήδευτη εικόνα σε σχέση με την εμφανώς επιμελημένη.'},
  {id:'presence', title:'Διακριτικότητα – ένταση', low:'Διακριτική οπτική παρουσία', high:'Εντυπωσιακή, statement παρουσία', shortLow:'Διακριτικότητα', shortHigh:'Ένταση', description:'Η ένταση της πρώτης οπτικής εντύπωσης.'},
  {id:'softness', title:'Απαλότητα – δυναμισμός', low:'Απαλά, γλυκά χαρακτηριστικά', high:'Έντονα, δυναμικά χαρακτηριστικά', shortLow:'Απαλότητα', shortHigh:'Δυναμισμός', description:'Οπτικό ύφος, όχι χαρακτήρας ή συμπεριφορά.'},
  {id:'timeless', title:'Κλασικό – πειραματικό', low:'Κλασικό, διαχρονικό look', high:'Μοντέρνο, πειραματικό look', shortLow:'Κλασικότητα', shortHigh:'Πειραματισμός', description:'Προτίμηση ανάμεσα σε οικείες αισθητικές φόρμες και στιλιστικές εκπλήξεις.'},
  {id:'distinct', title:'Αρμονία – ιδιαιτερότητα', low:'Αρμονικό, ισορροπημένο σύνολο', high:'Ασυνήθιστα, ξεχωριστά στοιχεία', shortLow:'Αρμονία', shortHigh:'Ιδιαιτερότητα', description:'Εδώ μετράμε τι προτιμάς, όχι πόσο όμορφος είναι κάποιος.'},
  {id:'ornament', title:'Λιτό – διακοσμημένο', low:'Λιτή, minimal αισθητική', high:'Πλούσια στιλιστική λεπτομέρεια', shortLow:'Λιτότητα', shortHigh:'Λεπτομέρεια', description:'Πόσο φορτωμένη αισθητικά εικόνα προτιμάς.'},
  {id:'expression', title:'Αυθορμητισμός – συγκράτηση', low:'Αυθόρμητη, χαμογελαστή έκφραση', high:'Συγκρατημένο, ήρεμο βλέμμα', shortLow:'Αυθορμητισμός', shortHigh:'Συγκράτηση', description:'Προτίμηση στη φωτογραφική έκφραση, χωρίς συμπέρασμα προσωπικότητας.'},
  {id:'contrast', title:'Απαλοί – έντονοι τόνοι', low:'Απαλοί, ήπιοι χρωματικοί τόνοι', high:'Υψηλή αντίθεση και έντονοι τόνοι', shortLow:'Απαλοί τόνοι', shortHigh:'Έντονοι τόνοι', description:'Η αισθητική εικόνας/στιλ, όχι η αξία οποιουδήποτε χρώματος δέρματος.'}
]);

// Second item per axis reverses the left/right labels to reduce automatic side agreement.
export const VALUE_QUESTIONS = Object.freeze((()=>{
  // Test–retest prompts are separated by several unrelated axes: no adjacent duplicate.
  const first=AXES.map((axis,i)=>({
    id:`V-${String(i+1).padStart(2,'0')}A`,axis:axis.id,reverse:false,
    question:i%2===0?'Ποιο γενικό αισθητικό αποτέλεσμα σε ελκύει περισσότερο;':'Ποια από τις δύο κατευθύνσεις ύφους θα επέλεγες συνήθως;',
    left:axis.low,right:axis.high
  }));
  const second=AXES.map((axis,i)=>({
    id:`V-${String(i+1).padStart(2,'0')}B`,axis:axis.id,reverse:true,
    question:i%2===0?'Αν έπρεπε να διαλέξεις έναν οπτικό προσανατολισμό, ποιος θα σε κέρδιζε;':'Ποια αισθητική κατεύθυνση θα σε προσέλκυε πιο εύκολα;',
    left:axis.high,right:axis.low
  }));
  // Fixed counterbalanced ordering for the second pass, never generated at runtime.
  return [...first,...[3,0,5,2,7,1,6,4].map(i=>second[i])];
})());

/** 12 faces × 4 distinct neighbors / face = 24 unique balanced comparisons. */
export const BASE_PAIRS = Object.freeze((()=>{
  const pairs=[];
  for (const step of [1,3]) for(let a=0;a<12;a++) {
    const b=(a+step)%12;
    // Each face must appear exactly twice on LEFT and twice on RIGHT.
    // Step 1 is forward, step 3 is reverse: avoids a position confound.
    const swap=step===3;
    pairs.push({id:`P-${step}-${String(a+1).padStart(2,'0')}`,left:FACE_IDS[swap?b:a],right:FACE_IDS[swap?a:b],kind:'primary'});
  }
  return pairs;
})());

// These 3 mirror prior comparisons, with reversed side, well separated in the test.
export const PAIR_QUESTIONS = Object.freeze((()=>{
  const core=[...BASE_PAIRS];
  const mirrorIndices=[2,8,16];
  const mirrors=mirrorIndices.map((j,k)=>({id:`R-${k+1}`,left:core[j].right,right:core[j].left,kind:'repeat',repeats:core[j].id}));
  // Insert late enough to reduce immediate memory effects; fixed order versioned.
  core.splice(18,0,mirrors[0]); core.splice(23,0,mirrors[1]); core.push(mirrors[2]);
  return core;
})());

export const STYLES = Object.freeze([
  {id:'natural',name:'Φυσική & ανεπιτήδευτη',targets:{presentation:-0.9,ornament:-0.7,contrast:-0.4},about:'Ελκυστική απλότητα, με λίγη εμφανή στιλιστική παρέμβαση.'},
  {id:'classic',name:'Κλασική & κομψή',targets:{timeless:-0.9,presentation:0.6,ornament:-0.4},about:'Διαχρονική γραμμή, περιποιημένη και ισορροπημένη εμφάνιση.'},
  {id:'romantic',name:'Ρομαντική & απαλή',targets:{softness:-0.9,presence:-0.5,contrast:-0.6},about:'Απαλή, διακριτική αισθητική παρουσία.'},
  {id:'striking',name:'Έντονη & εντυπωσιακή',targets:{presence:0.9,softness:0.7,contrast:0.8},about:'Δυνατή οπτική εντύπωση και έντονες γραμμές.'},
  {id:'alternative',name:'Ιδιαίτερη & πειραματική',targets:{distinct:0.9,timeless:0.8,ornament:0.5},about:'Ασυνήθιστα στοιχεία και στιλιστικός πειραματισμός.'},
  {id:'minimal',name:'Minimal & διακριτική',targets:{ornament:-0.9,presence:-0.4,timeless:-0.3},about:'Καθαρές γραμμές με συγκρατημένο αποτέλεσμα.'},
  {id:'glam',name:'Polished & glam',targets:{presentation:0.9,ornament:0.8,presence:0.7},about:'Επιμελημένη εικόνα με ιδιαίτερη προσοχή στη λεπτομέρεια.'},
  {id:'expressive',name:'Αυθόρμητη & φωτεινή',targets:{expression:-0.9,presentation:-0.3,contrast:-0.4},about:'Φυσική, ζωντανή έκφραση και χαλαρή εικόνα.'}
]);
