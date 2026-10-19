/** Adapter: never changes prior partner answers, weights or importances. */
import {VERSION,BANK_ID} from './data.mjs';
import {validSession,summary} from './engine.mjs';
export function toPartnerProfileExtension(session){
  if(!validSession(session))throw new Error('Invalid Beauty Preference Lab session');
  const s=summary(session),usePairs=s.baseCompleted>=10&&s.pairContrast>=0.45&&!s.positionBias;
  return {schema:'my-perfect-woman.extension/1',namespace:'VIS:AESTHETIC_LAB',
    module_version:VERSION,question_bank:BANK_ID,
    source:'respondent_self_report_and_fixed_synthetic_portraits',
    original_question_bank_untouched:true,domain_importance_override:null,
    relationship_compatibility_prediction:null,
    values:s.axes.map(a=>({id:a.id,left:a.low,right:a.high,relative_preference:a.score,answered:a.answered,internally_divergent:a.divergent,source:'direct_self_report'})),
    portraits:s.portraits.map(p=>({id:p.id,attractiveness_1_to_7:p.rating,synthetic:true})),
    pair_preference_order:usePairs?s.pairs.map(p=>p.id):null,
    cautions:{unvalidated_instrument:true,trait_from_photo_inference:false,position_response_bias:s.positionBias,repeat_disagreements:s.checks.disagreements},
    evidence:{value_items:s.valuesCompleted,portrait_ratings:s.ratingsCompleted,unique_pairs:s.baseCompleted,comparable_repeat_checks:s.checks.comparable,label:s.evidence}
  };
}
