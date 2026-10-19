/** Build the immutable, JSON-only test bank. */
import fs from 'node:fs';
import {VERSION,BANK_ID,FACE_IDS,AXES,VALUE_QUESTIONS,PAIR_QUESTIONS,STYLES} from './data.mjs';
const face_manifest=JSON.parse(fs.readFileSync(new URL('./assets/manifest.json',import.meta.url),'utf8'));
const bank={
 title:'Beauty Preference Lab — fixed stimulus inventory',
 version:VERSION,bank_id:BANK_ID,
 test_category:'exploratory personal aesthetic preferences; not validated psychometrics',language:'el',
 phases:[
  {id:'values',question_count:VALUE_QUESTIONS.length,scale:'1..7, two reversed & separated items per axis'},
  {id:'ratings',question_count:FACE_IDS.length,scale:'1..7 absolute face attractiveness'},
  {id:'pairs',question_count:PAIR_QUESTIONS.length,scale:'L,R,TIE,NONE,UNSURE',check_items:3}
 ],
 axes:AXES,questions:VALUE_QUESTIONS,face_manifest,comparisons:PAIR_QUESTIONS,style_hypotheses:STYLES,
 rules:{images:'immutable assets bundled with app; SHA-256 verified',
 paired_score:'regularized Bradley–Terry fitted to 24 primary pairs only',
 repeats:'3 mirrored comparisons count only for consistency',
 missing:'not scored; no inference from skipped items',
 value_axis:'mean of two correctly reverse-coded value self-ratings',
 ranking:'withhold if no meaningful contrast, insufficient evidence or side bias',
 compatibility:'never infer personality or romantic compatibility from portrait',
 original_135_question_bank:'not overwritten; namespace extension VIS:AESTHETIC_LAB'}
};
fs.writeFileSync(new URL('./beauty_question_bank_v1.json',import.meta.url),JSON.stringify(bank,null,2));
console.log('Created',bank.version);
