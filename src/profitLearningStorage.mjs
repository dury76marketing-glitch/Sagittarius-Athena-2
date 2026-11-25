// R40: retain operational PLI evidence while keeping optional detail out of
// the trading process. The original detailed reducer remains an offline API.
export const PROFIT_LEARNING_STORAGE_REVISION='PLI1-COMPACT-R40';

export function compactProfitLearningState(state,{copy=true,legacyDetailIsDurable=false}={}){
  if(!state||typeof state!=='object')return state;
  const {observations,shadow,...operational}=state;
  const hadLegacyDetail=Array.isArray(observations)||Boolean(shadow&&typeof shadow==='object');
  operational.storageRevision=PROFIT_LEARNING_STORAGE_REVISION;
  operational.researchCoverage={
    ...(state.researchCoverage&&typeof state.researchCoverage==='object'?state.researchCoverage:{}),
    mode:'operational_summary',timeline:'not_collected',shadowPolicies:'offline_only',
    ...(hadLegacyDetail&&legacyDetailIsDurable?{legacyDetailPreservedInDatabase:true,
      legacyDetailThroughMs:Object.hasOwn(state.researchCoverage||{},'legacyDetailThroughMs')
        ?state.researchCoverage.legacyDetailThroughMs:Number(state.lastObservedAtMs)||null}:{}),
  };
  return copy?structuredClone(operational):operational;
}

// Diagnostic detail resumed after compaction cannot recreate the unobserved
// interval. Keep the gap explicit, including for the public offline reducer.
export function resumeDetailedProfitLearningState(state,now,{copy=true}={}){
  if(!state||typeof state!=='object')return state;
  const detailed=copy?structuredClone(state):state;
  if(detailed.storageRevision===PROFIT_LEARNING_STORAGE_REVISION){
    detailed.storageRevision='PLI1-DETAIL-R40';
    detailed.researchCoverage={...detailed.researchCoverage,mode:'diagnostic_detail',
      timeline:'partial_bounded',shadowPolicies:'partial_hypothetical',
      detailResumedAtMs:now,continuousDetail:false};
  }
  return detailed;
}
