import { ATHENA_EXIT_INTELLIGENCE } from './doctrine.mjs';

const n=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const round=(v,d=2)=>{const p=10**d;return Math.round(n(v)*p)/p;};

export function frozenAthenaX1MinimumProfitNetPerOriginal(entry){
  const armed=entry?.entryConfig?.athenaExit?.x1ProceedsOnlyAfterMinimumProfit===true
    || String(entry?.conceptName||'')==='Sagittarius Justice Arrow';
  if(!armed)return null;
  const paths=[
    entry?.entryConfig?.athenaExit?.minimumProfitNetPerOriginalContractCents,
    entry?.entryConfig?.economicTarget?.netPerOriginalContractCents,
    entry?.entryConfig?.justiceArrowFire?.economicTarget?.netPerOriginalContractCents,
  ];
  for(const raw of paths){
    const v=Number(raw);
    if(Number.isFinite(v)&&v>0)return Math.max(0.01,Math.min(99,v));
  }
  return Math.max(0.01,n(ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents,2));
}

export function resolveAthenaX1MinimumProfitNetPerOriginal(context={}){
  const raw=Number(context?.minimumProfitNetPerOriginalContractCents);
  if(Number.isFinite(raw)&&raw>0)return Math.max(0.01,Math.min(99,raw));
  return null;
}

function matureProfile(profile={}){
  const total=Math.max(0,n(profile.totalObservations));
  const pullbacks=Math.max(0,n(profile.oneTickPullbacks));
  return Boolean(profile.promoted)
    && total>=ATHENA_EXIT_INTELLIGENCE.historicalMinimumObservations
    && pullbacks>=ATHENA_EXIT_INTELLIGENCE.historicalMinimumPullbacks;
}

function profileRates(profile={}){
  const pullbacks=Math.max(0,n(profile.oneTickPullbacks));
  const recoveries=Math.max(0,n(profile.oneTickRecoveries));
  const continuation=Number.isFinite(Number(profile.continuationRate))
    ? clamp(n(profile.continuationRate),0,1)
    : (recoveries+2)/Math.max(4,pullbacks+4);
  const collapse=Number.isFinite(Number(profile.collapseRate))
    ? clamp(n(profile.collapseRate),0,1)
    : 0.25;
  return {continuation,collapse,mature:matureProfile(profile)};
}

function recentMetrics(observations=[]){
  const xs=observations.slice(-ATHENA_EXIT_INTELLIGENCE.recentObservationWindow);
  let up=0,down=0,flat=0,consecutiveDown=0,maxConsecutiveDown=0;
  for(let i=1;i<xs.length;i++){
    const d=n(xs[i].bidCents)-n(xs[i-1].bidCents);
    if(d>1e-9){up++;consecutiveDown=0;}
    else if(d<-1e-9){down++;consecutiveDown++;maxConsecutiveDown=Math.max(maxConsecutiveDown,consecutiveDown);}
    else{flat++;consecutiveDown=0;}
  }
  const delta=xs.length>1?n(xs.at(-1).bidCents)-n(xs[0].bidCents):0;
  const velocity=xs.length>1?delta/(xs.length-1):0;
  return {samples:xs.length,up,down,flat,consecutiveDown,maxConsecutiveDown,delta,velocity};
}

function gameProgress(context,observedAtMs){
  const start=n(context.gameStartTimeMs);
  const duration=Math.max(1,n(context.typicalDurationMs));
  if(start<=0||duration<=0||observedAtMs<start)return null;
  return clamp((observedAtMs-start)/duration,0,1.5);
}

function localCrashEvidence(crash={}){
  return {
    phase:String(crash?.phase||'NORMAL'),
    depthCents:Math.max(0,n(crash?.crashDepthCents)),
    reboundCents:Math.max(0,n(crash?.reboundCents)),
    reclaimRate:clamp(n(crash?.reclaimRate),0,1),
    lowerLowCount:Math.max(0,n(crash?.lowerLowCount)),
    reboundLostCount:Math.max(0,n(crash?.reboundLostCount)),
    stableObservations:Math.max(0,n(crash?.stableObservations)),
    upwardTicks:Math.max(0,n(crash?.upwardTicks)),
  };
}

export function athenaX1PolicyRevisionAccepted(revision){
  const allowed=ATHENA_EXIT_INTELLIGENCE.acceptedPolicyRevisions||[ATHENA_EXIT_INTELLIGENCE.policyRevision];
  const rev=String(revision||'');
  return rev===ATHENA_EXIT_INTELLIGENCE.policyRevision||allowed.includes(rev);
}

export function risePercentFromEntry(entryPriceCents, peakBidCents){
  const entry=n(entryPriceCents);
  const peak=n(peakBidCents);
  if(!(entry>0)||!(peak>=0))return 0;
  return Math.max(0,((peak-entry)/entry)*100);
}

export function emotionFromRisePercent(risePct){
  const r=Math.max(0,n(risePct));
  if(r<10)return clamp(r*2,0,20);
  if(r<25)return clamp(20+(r-10)*2,20,50);
  if(r<50)return clamp(50+(r-25)*1.2,50,80);
  if(r<100)return clamp(80+(r-50)*0.3,80,95);
  return clamp(95+(r-100)*0.05,95,100);
}

export function anxietyThresholdForEmotion(emotion){
  const e=n(emotion);
  if(e>=85)return 32;
  if(e>=70)return 42;
  if(e>=50)return 55;
  if(e>=30)return 68;
  return 80;
}

export function anxietyFromTape({
  emotion=0,pullback=0,runup=0,dwellMs=0,dwellObservations=0,
  velocity=0,consecDown=0,lowerLows=0,localCrash=false,
}={}){
  const e=clamp(n(emotion),0,100);
  const pb=Math.max(0,n(pullback));
  const ru=Math.max(0,n(runup));
  let a=0;
  if(pb>=1)a+=18+e*0.15;
  if(pb>=2)a+=12+e*0.10;
  if(pb>=3)a+=10;
  if(pb>=5)a+=12;
  if(pb>=8)a+=15;
  if(ru>0)a+=Math.min(25,(pb/ru)*40);
  if(ru>0&&pb/ru>=0.50)a+=20;
  if(ru>0&&pb/ru>=0.60)a+=10;
  if(n(dwellMs)>=ATHENA_EXIT_INTELLIGENCE.stallAtHighMs
    &&n(dwellObservations)>=ATHENA_EXIT_INTELLIGENCE.stallAtHighObservations
    &&pb<=1){
    a+=10+e*0.35;
  }
  if(n(dwellMs)>=15_000&&n(dwellObservations)>=3&&pb<=2)a+=8+e*0.15;
  if(n(velocity)<=0&&pb>=1)a+=8;
  if(n(consecDown)>=2)a+=10;
  if(n(consecDown)>=3)a+=10;
  if(n(lowerLows)>=1&&pb>=2)a+=8;
  if(localCrash)a+=25;
  if(e<40&&pb<5)a=Math.min(a,40);
  return clamp(Math.round(a),0,100);
}

function historicalDrawdownEvidence(raw={}){
  const total=Math.max(0,n(raw?.totalObservations));
  const probability=clamp(n(raw?.probability,n(raw?.smoothedRate,0.5)),0,1);
  const wilsonLow=clamp(n(raw?.wilsonLow,0),0,1);
  const wilsonHigh=clamp(n(raw?.wilsonHigh,1),0,1);
  const mature=total>=ATHENA_EXIT_INTELLIGENCE.historicalDrawdownMinimumObservations;
  const supportive=mature
    && probability>=ATHENA_EXIT_INTELLIGENCE.historicalDrawdownSupportProbability
    && wilsonLow>=ATHENA_EXIT_INTELLIGENCE.historicalDrawdownSupportWilsonLow
    && !Boolean(raw?.strongNegative);
  const strongNegative=mature&&(Boolean(raw?.strongNegative)||wilsonHigh<0.5);
  return {
    available:Boolean(raw?.available)&&total>0, mature, supportive, strongNegative,
    probability, totalObservations:total, wilsonLow, wilsonHigh,
    thresholdCents:Math.max(0,n(raw?.thresholdCents)),
    specificity:String(raw?.specificity||'none'),
    brainHash:String(raw?.brainHash||''),
  };
}

function scores({state,context,observation,newPeak}){
  const bid=n(observation.executableBidCents);
  const ask=n(observation.askCents,bid);
  const spread=Math.max(0,ask-bid);
  const entry=n(context.entryPriceCents);
  const peak=n(state.peakExecutableBidCents,bid);
  const runup=Math.max(0,peak-entry);
  const pullback=Math.max(0,peak-bid);
  const pullbackRatio=runup>0?pullback/runup:0;
  const trough=n(state.postPeakMinBidCents,bid);
  const recoveryFromTrough=Math.max(0,bid-trough);
  const drawdownFromPeakToTrough=Math.max(0,peak-trough);
  const reclaimRatio=drawdownFromPeakToTrough>0?clamp(recoveryFromTrough/drawdownFromPeakToTrough,0,1):1;
  const trajectoryMetrics=recentMetrics(state.observations);
  const postPeakMetrics=recentMetrics((state.observations||[]).filter(x=>n(x?.t)>=n(state.peakAtMs)));
  const metrics=trajectoryMetrics;
  const profile=profileRates(context.profile||{});
  const crash=localCrashEvidence(context.crash||{});
  const historicalDrawdown=historicalDrawdownEvidence(context.historicalDrawdownEvidence||{});
  const progress=gameProgress(context,n(observation.observedAtMs));
  const entryAthenaScore=clamp(n(context.entryAthenaScore,50),0,100);
  const postPeakFresh=Math.max(0,n(state.postPeakFreshObservations));
  const timeSincePeakMs=Math.max(0,n(observation.observedAtMs)-n(state.peakAtMs,observation.observedAtMs));
  const originalCount=Math.max(1,n(context.originalCount,1));
  const peakNetPerOriginal=n(state.peakExecutableNetCents)/originalCount;
  const currentNetPerOriginal=n(observation.executableNetCents)/originalCount;
  const operatorMinProfit=resolveAthenaX1MinimumProfitNetPerOriginal(context);
  const minProfitNetPerOriginal=operatorMinProfit==null
    ? Math.max(0.01,n(ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents,2))
    : operatorMinProfit;
  const minProfitReached=operatorMinProfit==null
    ? true
    : (peakNetPerOriginal+1e-9>=minProfitNetPerOriginal && currentNetPerOriginal+1e-9>=minProfitNetPerOriginal);
  const peakExhaustion=peak>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseMinimumPeakPriceCents
    && bid>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseMinimumCurrentPriceCents
    && runup>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseMinimumRunupCents
    && peakNetPerOriginal+1e-9>=ATHENA_EXIT_INTELLIGENCE.capitalDefensePeakNetPerOriginalContractCents
    && currentNetPerOriginal>=-1e-9
    && currentNetPerOriginal<=ATHENA_EXIT_INTELLIGENCE.capitalDefenseCurrentNetPerOriginalContractCents+1e-9
    && pullbackRatio+1e-9>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseMinimumErasedRunupRatio
    && pullback+1e-9>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseMinimumPullbackCents
    && postPeakMetrics.velocity<0
    && postPeakFresh>=1;
  const minAdaptivePullback=clamp(
    Math.round(Math.max(0,runup)*0.32),
    ATHENA_EXIT_INTELLIGENCE.minimumStructuralPullbackCents,
    ATHENA_EXIT_INTELLIGENCE.maximumAdaptivePullbackCents,
  );

  let continuation=50;
  const continuationEvidence=[];
  if(newPeak){continuation+=30;continuationEvidence.push('fresh_executable_high');}
  else if(pullback<=1){continuation+=15;continuationEvidence.push('near_peak');}
  else if(pullback<=ATHENA_EXIT_INTELLIGENCE.maximumNoisePullbackCents){continuation+=6;continuationEvidence.push('noise_scale_pullback');}
  if(metrics.velocity>1){continuation+=12;continuationEvidence.push('positive_short_velocity');}
  else if(metrics.velocity>0){continuation+=7;continuationEvidence.push('positive_velocity');}
  else if(metrics.velocity<-2){continuation-=10;}
  if(metrics.up>=metrics.down&&metrics.samples>=3){continuation+=6;continuationEvidence.push('up_ticks_not_weaker');}
  if(reclaimRatio>=0.8&&pullback>0){continuation+=16;continuationEvidence.push('strong_reclaim');}
  else if(reclaimRatio>=0.5&&pullback>0){continuation+=9;continuationEvidence.push('partial_reclaim');}
  else if(reclaimRatio<=0.2&&pullback>=minAdaptivePullback){continuation-=8;}
  if(profile.mature){
    continuation+=clamp((profile.continuation-0.5)*40,-14,14);
    continuation+=clamp((0.25-profile.collapse)*30,-12,8);
    continuationEvidence.push('mature_pli1_history');
  }
  continuation+=clamp((entryAthenaScore-50)*0.10,-5,5);
  if(progress!=null&&progress>=0.65&&bid>=90){continuation+=8;continuationEvidence.push('late_high_price_state');}
  if(progress!=null&&progress>=0.8&&bid>=95){continuation+=4;}
  if(crash.phase==='REBOUND_CONFIRMED'){
    if(crash.reclaimRate>=0.55){continuation+=12;continuationEvidence.push('ci1_rebound_confirmed');}
    if(crash.upwardTicks>=3)continuation+=5;
  }
  if(crash.phase==='CRASHING'&&crash.depthCents>=ATHENA_EXIT_INTELLIGENCE.severeCrashDepthCents)continuation-=15;
  if(historicalDrawdown.supportive){continuation+=12;continuationEvidence.push('athena_b1_drawdown_survival_support');}
  if(historicalDrawdown.strongNegative){continuation-=12;continuationEvidence.push('athena_b1_drawdown_survival_negative');}
  if(peakExhaustion){continuation-=12;continuationEvidence.push('high_price_peak_exhaustion');}
  continuation=clamp(Math.round(continuation),0,100);

  let recovery=45;
  const recoveryEvidence=[];
  if(pullback<=ATHENA_EXIT_INTELLIGENCE.maximumNoisePullbackCents){recovery+=12;recoveryEvidence.push('small_pullback');}
  if(reclaimRatio>=0.8){recovery+=24;recoveryEvidence.push('strong_reclaim');}
  else if(reclaimRatio>=0.5){recovery+=15;recoveryEvidence.push('meaningful_reclaim');}
  else if(reclaimRatio>=0.25){recovery+=7;}
  if(recoveryFromTrough>=5){recovery+=12;recoveryEvidence.push('rebound_5c_plus');}
  else if(recoveryFromTrough>=2){recovery+=6;}
  if(postPeakMetrics.velocity>0){recovery+=10;recoveryEvidence.push('trajectory_turning_up');}
  if(postPeakMetrics.up>postPeakMetrics.down&&postPeakMetrics.samples>=3)recovery+=7;
  if(profile.mature){
    recovery+=clamp((profile.continuation-0.5)*35,-12,14);
    recovery-=clamp((profile.collapse-0.2)*25,-5,12);
    recoveryEvidence.push('mature_pli1_recovery_history');
  }
  if(crash.phase==='REBOUND_CONFIRMED'){
    recovery+=15;recoveryEvidence.push('ci1_rebound_confirmed');
    recovery+=clamp(crash.reclaimRate*10,0,10);
  }
  recovery-=Math.min(18,n(state.failedReclaimCount)*7);
  recovery-=Math.min(15,n(state.localLowerLowCount)*4);
  if(postPeakFresh<ATHENA_EXIT_INTELLIGENCE.minimumFreshPostPeakObservations&&pullback>0){recovery+=8;recoveryEvidence.push('insufficient_post_peak_confirmation');}
  if(historicalDrawdown.supportive){recovery+=22;recoveryEvidence.push('athena_b1_drawdown_survival_support');}
  if(historicalDrawdown.strongNegative){recovery-=15;recoveryEvidence.push('athena_b1_drawdown_survival_negative');}
  if(peakExhaustion){recovery-=18;recoveryEvidence.push('high_price_peak_exhaustion');}
  recovery=clamp(Math.round(recovery),0,100);

  let failure=10;
  const failureEvidence=[];
  if(pullback>=4&&pullback<=5){failure+=12;failureEvidence.push('meaningful_pullback');}
  else if(pullback<=8&&pullback>=6){failure+=20;failureEvidence.push('large_pullback');}
  else if(pullback<=12&&pullback>=9){failure+=30;failureEvidence.push('major_pullback');}
  else if(pullback>12){failure+=40;failureEvidence.push('severe_pullback');}
  if(pullbackRatio>=0.75){failure+=30;failureEvidence.push('runup_mostly_erased');}
  else if(pullbackRatio>=0.55){failure+=22;failureEvidence.push('runup_half_erased');}
  else if(pullbackRatio>=0.35){failure+=12;}
  if(postPeakMetrics.maxConsecutiveDown>=4){failure+=22;failureEvidence.push('four_step_down_sequence');}
  else if(postPeakMetrics.maxConsecutiveDown>=3){failure+=15;failureEvidence.push('three_step_down_sequence');}
  else if(postPeakMetrics.maxConsecutiveDown>=2){failure+=8;}
  if(postPeakMetrics.velocity<=-4){failure+=20;failureEvidence.push('fast_negative_velocity');}
  else if(postPeakMetrics.velocity<=-2){failure+=11;}
  if(n(state.localLowerLowCount)>=4){failure+=20;failureEvidence.push('repeated_lower_lows');}
  else if(n(state.localLowerLowCount)>=2){failure+=12;failureEvidence.push('lower_lows');}
  else if(n(state.localLowerLowCount)>=1){failure+=5;}
  if(n(state.failedReclaimCount)>0){failure+=Math.min(24,n(state.failedReclaimCount)*9);failureEvidence.push('failed_reclaim');}
  if(pullback>=minAdaptivePullback&&timeSincePeakMs>=180_000){failure+=10;failureEvidence.push('pullback_persisting');}
  else if(pullback>=minAdaptivePullback&&timeSincePeakMs>=60_000){failure+=5;}
  if(spread>=7){failure+=12;failureEvidence.push('spread_instability');}
  else if(spread>=4){failure+=5;}
  if(profile.mature){
    failure+=clamp((profile.collapse-0.20)*45,-8,22);
    failure-=clamp((profile.continuation-0.65)*30,-5,12);
    failureEvidence.push('mature_pli1_collapse_history');
  }
  if(crash.phase==='CRASHING'){
    if(crash.depthCents>=35){failure+=38;failureEvidence.push('ci1_deep_crash');}
    else if(crash.depthCents>=20){failure+=25;failureEvidence.push('ci1_severe_crash');}
    else if(crash.depthCents>=10){failure+=13;failureEvidence.push('ci1_crash');}
    failure+=Math.min(18,crash.lowerLowCount*2);
    failure+=Math.min(12,crash.reboundLostCount*3);
    if(crash.reclaimRate<0.25&&crash.depthCents>=10)failure+=8;
  }else if(crash.phase==='REBOUND_CONFIRMED'&&crash.reclaimRate>=0.55){
    failure-=12;
  }
  if(progress!=null&&progress>=0.8&&pullback>=5){failure+=8;failureEvidence.push('late_game_recovery_window_compressing');}
  if(historicalDrawdown.supportive){failure-=25;failureEvidence.push('athena_b1_drawdown_survival_support');}
  if(historicalDrawdown.strongNegative){failure+=22;failureEvidence.push('athena_b1_drawdown_survival_negative');}
  if(peakExhaustion){failure+=42;failureEvidence.push('high_price_peak_exhaustion');}
  failure=clamp(Math.round(failure),0,100);

  const severeCrash=crash.phase==='CRASHING'
    && crash.depthCents>=ATHENA_EXIT_INTELLIGENCE.severeCrashDepthCents
    && crash.lowerLowCount>=ATHENA_EXIT_INTELLIGENCE.severeCrashLowerLows
    && crash.reclaimRate<0.35;
  const confirmedDeterioration=postPeakFresh>=ATHENA_EXIT_INTELLIGENCE.minimumFreshPostPeakObservations
    && (postPeakMetrics.maxConsecutiveDown>=2||n(state.localLowerLowCount)>=1||n(state.failedReclaimCount)>=1||timeSincePeakMs>=30_000);
  const peakMature=peakNetPerOriginal+1e-9>=minProfitNetPerOriginal;
  const structuralPullback=pullback+1e-9>=minAdaptivePullback;
  const risePct=risePercentFromEntry(entry,peak);
  const emotion=emotionFromRisePercent(risePct);
  const dwellObservations=Math.max(0,n(state.dwellObservations));
  const localCrash=Boolean(severeCrash)&&pullback>=3;
  const anxiety=anxietyFromTape({
    emotion,pullback,runup,dwellMs:timeSincePeakMs,dwellObservations,
    velocity:postPeakMetrics.velocity,consecDown:postPeakMetrics.maxConsecutiveDown,
    lowerLows:n(state.localLowerLowCount),localCrash,
  });
  const anxietyThreshold=anxietyThresholdForEmotion(emotion);
  const stillGreen=n(observation.executableNetCents)>=-1e-9;
  const emotionHarvestBlockedByHistory=historicalDrawdown.supportive
    && emotion<85
    && pullback<=Math.max(15,n(historicalDrawdown.thresholdCents));
  const emotionHarvest=peakMature&&stillGreen&&anxiety+1e-9>=anxietyThreshold&&!emotionHarvestBlockedByHistory;
  const capitalDefense=peakExhaustion
    && failure>=ATHENA_EXIT_INTELLIGENCE.capitalDefenseFailureScore
    && recovery<=50;
  const crashExit=peakMature&&structuralPullback&&severeCrash&&postPeakFresh>=1&&failure>=65&&recovery<=50;
  const structuralWouldExit=stillGreen && (emotionHarvest||capitalDefense||crashExit);
  const exit=structuralWouldExit && minProfitReached;
  let exitReason=null;
  if(exit){
    if(emotionHarvest&&anxiety>=85)exitReason='peak_emotion_take_the_money';
    else if(emotionHarvest&&pullback<=1)exitReason='emotion_stall_at_high';
    else if(emotionHarvest)exitReason='emotion_anxiety_harvest';
    else if(capitalDefense)exitReason='capital_defense';
    else if(crashExit)exitReason='severe_crash_deterioration';
  }else if(structuralWouldExit&&!minProfitReached){
    exitReason='justice_x1_minimum_profit_not_reached';
  }

  return {
    continuationScore:continuation,recoveryScore:recovery,failureScore:failure,
    runupCents:round(runup),pullbackCents:round(pullback),pullbackRatio:round(pullbackRatio,4),
    postPeakTroughCents:round(trough),recoveryFromTroughCents:round(recoveryFromTrough),reclaimRatio:round(reclaimRatio,4),
    adaptivePullbackCents:minAdaptivePullback,postPeakFreshObservations:postPeakFresh,timeSincePeakMs,
    recent:trajectoryMetrics,postPeakRecent:postPeakMetrics,gameProgress:progress==null?null:round(progress,4),
    profile:{mature:profile.mature,continuationRate:round(profile.continuation,4),collapseRate:round(profile.collapse,4),totalObservations:n(context.profile?.totalObservations),specificity:context.profile?.specificity||'cold_start'},
    crash,historicalDrawdown,peakExhaustion,
    continuationEvidence,recoveryEvidence,failureEvidence,
    exit,exitReason,
    severeCrash,confirmedDeterioration,peakMature,structuralPullback,minProfitNetPerOriginal:round(minProfitNetPerOriginal,4),minProfitReached,
    peakNetPerOriginal:round(peakNetPerOriginal,4),currentNetPerOriginal:round(currentNetPerOriginal,4),
    risePercent:round(risePct,4),emotionScore:round(emotion,2),anxietyScore:anxiety,anxietyThreshold,
    dwellObservations,
  };
}

function isCommittedPhase(phase){ return String(phase||'')==='X1_EXIT_COMMITTED'; }

export function advanceAthenaExitState(priorState,{observation,context}={}){
  const rawObservedAtMs=Number(observation?.observedAtMs);
  const rawBid=Number(observation?.executableBidCents);
  const rawNet=Number(observation?.executableNetCents);
  if(!Number.isFinite(rawObservedAtMs)||rawObservedAtMs<=0||!Number.isFinite(rawBid)||!Number.isFinite(rawNet)){
    throw new Error('athena_x1_invalid_observation');
  }
  const observedAtMs=rawObservedAtMs;
  const bid=rawBid;
  const net=rawNet;
  const nowMs=Math.max(1,n(context?.nowMs,Date.now()));
  if(observedAtMs-nowMs>ATHENA_EXIT_INTELLIGENCE.maximumFutureBookSkewMs){
    throw new Error('athena_x1_future_observation');
  }
  const obs={t:observedAtMs,bidCents:bid,netCents:net,askCents:n(observation?.askCents,bid)};
  const priorX1=priorState&&typeof priorState==='object'&&priorState.version===ATHENA_EXIT_INTELLIGENCE.version?structuredClone(priorState):null;
  if(priorX1&&!athenaX1PolicyRevisionAccepted(priorX1.policyRevision)){
    throw new Error('athena_x1_policy_revision_mismatch');
  }
  if(priorX1)priorX1.policyRevision=ATHENA_EXIT_INTELLIGENCE.policyRevision;
  const validPrior=priorX1;
  if(validPrior&&isCommittedPhase(validPrior.phase)){
    return {state:validPrior,decision:'EXIT',fresh:false,reason:'exit_commit_sticky'};
  }
  if(validPrior&&['X1_EXIT_FILLED','X1_SETTLED'].includes(String(validPrior.phase||''))){
    return {state:validPrior,decision:'HOLD',fresh:false,reason:'terminal_state'};
  }
  if(validPrior&&observedAtMs<=n(validPrior.lastObservedBookMs)){
    return {state:validPrior,decision:'HOLD',fresh:false,reason:'duplicate_or_old_book'};
  }

  let state=validPrior||{
    version:ATHENA_EXIT_INTELLIGENCE.version,
    policyRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
    phase:'X1_TRACKING',
    armedAtMs:observedAtMs,
    observations:[],
    peakExecutableBidCents:bid,
    peakExecutableNetCents:net,
    peakAtMs:observedAtMs,
    postPeakMinBidCents:bid,
    postPeakMinAtMs:observedAtMs,
    reclaimHighBidCents:bid,
    localLowerLowCount:0,
    failedReclaimCount:0,
    postPeakFreshObservations:0,
    dwellObservations:1,
    pullbackStartedAtMs:null,
  };

  const priorPeakNet=n(state.peakExecutableNetCents,net);
  const priorPeakBid=n(state.peakExecutableBidCents,bid);
  const newPeak=net>priorPeakNet+1e-9||(Math.abs(net-priorPeakNet)<=1e-9&&bid>priorPeakBid+1e-9);
  let lowerLows=Math.max(0,n(state.localLowerLowCount));
  let failedReclaims=Math.max(0,n(state.failedReclaimCount));
  let trough=n(state.postPeakMinBidCents,bid);
  let troughAt=n(state.postPeakMinAtMs,observedAtMs);
  let reclaimHigh=n(state.reclaimHighBidCents,bid);
  let postPeakFresh=Math.max(0,n(state.postPeakFreshObservations));
  let pullbackStartedAt=state.pullbackStartedAtMs||null;

  let dwellObservations=Math.max(0,n(state.dwellObservations,1));
  if(newPeak){
    state.peakExecutableBidCents=bid;
    state.peakExecutableNetCents=net;
    state.peakAtMs=observedAtMs;
    trough=bid;troughAt=observedAtMs;reclaimHigh=bid;lowerLows=0;failedReclaims=0;postPeakFresh=0;pullbackStartedAt=null;dwellObservations=1;
  }else{
    dwellObservations+=1;
    const pullbackActive=Boolean(pullbackStartedAt)||bid<priorPeakBid-1e-9;
    if(bid<priorPeakBid-1e-9&&!pullbackStartedAt)pullbackStartedAt=observedAtMs;
    if(pullbackActive)postPeakFresh+=1;
    if(bid<trough-1e-9){
      if(reclaimHigh-trough>=2-1e-9)failedReclaims+=1;
      lowerLows+=1;trough=bid;troughAt=observedAtMs;reclaimHigh=bid;
    }else if(bid>reclaimHigh+1e-9){
      reclaimHigh=bid;
    }
  }

  state={
    ...state,
    policyRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
    lastObservedBookMs:observedAtMs,
    lastExecutableBidCents:bid,
    lastExecutableNetCents:net,
    observations:[...(Array.isArray(state.observations)?state.observations:[]),obs].slice(-ATHENA_EXIT_INTELLIGENCE.maximumStateObservations),
    postPeakMinBidCents:trough,postPeakMinAtMs:troughAt,reclaimHighBidCents:reclaimHigh,
    localLowerLowCount:lowerLows,failedReclaimCount:failedReclaims,postPeakFreshObservations:postPeakFresh,dwellObservations,pullbackStartedAtMs:pullbackStartedAt,
    entryAthenaScore:clamp(n(context?.entryAthenaScore,50),0,100),
    entryAthenaClassification:String(context?.entryAthenaClassification||'UNKNOWN'),
    profileSpecificity:String(context?.profile?.specificity||'cold_start'),
    profileObservations:Math.max(0,n(context?.profile?.totalObservations)),
    updatedAtMs:observedAtMs,
  };
  const scored=scores({state,context:context||{},observation:{...observation,observedAtMs},newPeak});
  const phase=scored.exit?'X1_EXIT_COMMITTED':newPeak?'X1_PEAK_ADVANCE':(scored.pullbackCents>0||n(scored.anxietyScore)>=n(scored.anxietyThreshold)*0.6)?'X1_RECOVERY_WATCH':'X1_TRACKING';
  state={
    ...state,...scored,phase,
    decision:scored.exit?'EXIT':'HOLD',
    decisionReason:scored.exit?scored.exitReason:(scored.exitReason||(newPeak?'higher_high':'continuation_or_recovery_preferred')),
    ...(scored.exit?{exitCommittedAtMs:observedAtMs,exitTrigger:scored.exitReason,triggerExecutableBidCents:bid,triggerExecutableNetCents:net}:{}),
  };
  return {state,decision:scored.exit?'EXIT':'HOLD',fresh:true,newPeak,reason:state.decisionReason,scores:scored};
}

export function athenaExitTelemetry(state={}){
  if(!state||state.version!==ATHENA_EXIT_INTELLIGENCE.version)return{};
  return {
    athenaExitIntelligence:ATHENA_EXIT_INTELLIGENCE.version,
    athenaExitPolicyRevision:String(state.policyRevision||ATHENA_EXIT_INTELLIGENCE.policyRevision),
    athenaExitPhase:state.phase||'X1_TRACKING',
    athenaExitDecision:state.decision||'HOLD',
    athenaExitDecisionReason:state.decisionReason||null,
    athenaExitContinuationScore:n(state.continuationScore,50),
    athenaExitRecoveryScore:n(state.recoveryScore,50),
    athenaExitFailureScore:n(state.failureScore,0),
    athenaExitPeakExecutableBidCents:n(state.peakExecutableBidCents),
    athenaExitPeakExecutableNetCents:n(state.peakExecutableNetCents),
    athenaExitPullbackCents:n(state.pullbackCents),
    athenaExitAdaptivePullbackCents:n(state.adaptivePullbackCents),
    athenaExitReclaimRatio:n(state.reclaimRatio),
    athenaExitPostPeakFreshObservations:n(state.postPeakFreshObservations),
    athenaExitLocalLowerLowCount:n(state.localLowerLowCount),
    athenaExitFailedReclaimCount:n(state.failedReclaimCount),
    athenaExitHistoricalContinuationRate:n(state.profile?.continuationRate,0.5),
    athenaExitHistoricalCollapseRate:n(state.profile?.collapseRate,0.25),
    athenaExitHistoricalProfileMature:Boolean(state.profile?.mature),
    athenaExitCrashPhase:String(state.crash?.phase||'NORMAL'),
    athenaExitCrashDepthCents:n(state.crash?.depthCents),
    athenaExitHistoricalDrawdownAvailable:Boolean(state.historicalDrawdown?.available),
    athenaExitHistoricalDrawdownProbability:n(state.historicalDrawdown?.probability,0.5),
    athenaExitHistoricalDrawdownObservations:n(state.historicalDrawdown?.totalObservations),
    athenaExitHistoricalDrawdownThresholdCents:n(state.historicalDrawdown?.thresholdCents),
    athenaExitHistoricalDrawdownSupportive:Boolean(state.historicalDrawdown?.supportive),
    athenaExitHistoricalDrawdownStrongNegative:Boolean(state.historicalDrawdown?.strongNegative),
    athenaExitPeakExhaustion:Boolean(state.peakExhaustion),
    athenaExitMinimumProfitNetPerOriginal:n(state.minProfitNetPerOriginal),
    athenaExitMinProfitReached:Boolean(state.minProfitReached),
    athenaExitRisePercent:n(state.risePercent),
    athenaExitEmotionScore:n(state.emotionScore),
    athenaExitAnxietyScore:n(state.anxietyScore),
    athenaExitAnxietyThreshold:n(state.anxietyThreshold),
    athenaExitGameProgress:state.gameProgress==null?null:n(state.gameProgress),
    athenaExitFullPositionOnly:true,
    athenaExitPositionSplitting:false,
    athenaExitNoLookahead:true,
  };
}
