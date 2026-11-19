import {maximumSettlementNetAdmission,executionPriceCents} from './executionEconomics.mjs';
/** PR3-SIM2: real portfolio-ledger SIM child, no broker authority.
 * The database must still perform the final atomic loss, quote, seat and cash
 * checks; a constructed entry is NEVER itself a permission to INSERT.
 */
import {calculateAuroraSnapshotFromFeeModel,ATHENA_EXIT_INTELLIGENCE,INFINITY_BREAK,AURORA_EXECUTION,executionMarketFamilyExclusion,kalshiGeneralTakerFeeEstimateCents} from './doctrine.mjs';
import {pegasusRyuSeiKenCapitalAdmissionDecision,pegasusRyuSeiKenCapitalOperatorBandAllowed,pegasusRyuSeiKenCapitalSpreadAllowed,PR_CONCEPT,PR_VERSION} from './pegasusRyuSeiKenCapitalRecovery.mjs';
import {BUILD_INFO,authorityHash} from './authority.mjs';
import {greatHornAskDepth as pegasusRyuSeiKenCapitalAskDepth} from './greatHornSeatScheduler.mjs';

export const PR_SIM_VERSION='PR3-SIM-CAPITAL-V2';
export const PR_LIVE_VERSION='PR3-LIVE-CAPITAL-V1';
const PR_SETTINGS_KEYS=Object.freeze(['systemName','ownerId','mode','resetTimestampMs',
  'pegasusRyuSeiKenCapitalEnabled','pegasusRyuSeiKenCapitalStakeCents','pegasusRyuSeiKenCapitalMinEntryCents','pegasusRyuSeiKenCapitalMaxEntryCents',
  'pegasusRyuSeiKenCapitalMultiply','pegasusRyuSeiKenCapitalMinCrashCents','pegasusRyuSeiKenCapitalMinReboundCents',
  'pegasusRyuSeiKenCapitalMinUpwardTicks','pegasusRyuSeiKenCapitalObservationMinutes','pegasusRyuSeiKenCapitalLinkEnabled',
  'pegasusRyuSeiKenCapitalParentEntryRiseCents','pegasusRyuSeiKenCapitalAuroraDamageControlPercent',
  'pegasusRyuSeiKenCapitalMinProfitNetPerOriginalContractCents','pegasusRyuSeiKenCapitalAthenaX1Enabled',
  'infinityBreakMaximumBookAgeMs','infinityBreakRequiredConfirmations',
  'infinityBreakConfirmationWindowMs','pegasusRyuSeiKenCapitalMaxSpreadCents','maxPositions',
  'galacticExplosionEnabled','simFeeCents']);
export function pegasusRyuSeiKenCapitalSettingsFingerprint(settings={}){
  return authorityHash(PR_SETTINGS_KEYS.map(k=>[k,settings[k]??null]));
}

const deny=(reason)=>({ok:false,reason});

export function createPegasusRyuSeiKenCapitalCapitalEntry({watch,parent,quote,plan,settings,seat,clientOrderId=null,now=Date.now()}={}){
  const live=settings?.mode==='LIVE';
  if(!live&&settings?.mode!=='SIMULATION')return deny('pr_execution_mode_invalid');
  if(live&&(!clientOrderId||settings.liveArmed!==true))return deny('pr_live_client_order_or_arm_missing');
  if(settings?.engineActive!==true || settings?.pegasusRyuSeiKenCapitalEnabled!==true)return deny('pr_disabled');
  if(executionMarketFamilyExclusion(quote?.ticker,settings,{concept:PR_CONCEPT})?.blocked)
    return deny('pr_market_family_excluded');
  const proof=pegasusRyuSeiKenCapitalAdmissionDecision({watch,seat,settings,quote,parent,now});
  if(!proof.ok)return proof;
  if(watch.version!==PR_VERSION || watch.status!=='WATCHING' || !watch.qualified
    || !(Number(watch.lastQuoteAtMs)>0) || !(Number(watch.lastQuoteAtMs)<=Number(quote.quoteAtMs)))
    return deny('pr_durable_observation_required');
  const count=Number(plan?.count),entryPrice=Number(plan?.averagePriceCents);
  const stake=Number(settings.pegasusRyuSeiKenCapitalStakeCents),ask=Number(quote?.yesAsk),bid=Number(quote?.yesBid);
  const quoteAtMs=Number(quote?.quoteAtMs),bookAtMs=Number(plan?.verifiedBookAtMs),maximumBookAgeMs=Math.min(5000,Number(settings.infinityBreakMaximumBookAgeMs??5000));
  if(!Number.isSafeInteger(count)||count<1||!Number.isFinite(entryPrice)||entryPrice<=0||entryPrice>=100
    ||!Number.isFinite(stake)||stake<=0||executionPriceCents(ask)==null||executionPriceCents(bid)==null||ask<bid
    ||!Number.isFinite(Number(plan?.bestAskCents)) || Number(plan.bestAskCents)!==ask
    ||entryPrice+1e-9<ask||!pegasusRyuSeiKenCapitalOperatorBandAllowed(watch,entryPrice,settings)
    ||count*entryPrice>stake+1e-9 || count>Math.floor(stake/ask)
    ||!(quoteAtMs>=watch.armedAtMs && quoteAtMs<=now && now-quoteAtMs<=maximumBookAgeMs)
    ||!(bookAtMs>0 && bookAtMs<=now && now-bookAtMs<=maximumBookAgeMs))
    return deny('pr_executable_plan_invalid');
  if(!pegasusRyuSeiKenCapitalSpreadAllowed(quote,settings))return deny('pr_excessive_spread');
  if(plan?.executionEvidence?.executable===false || plan?.executionEvidence?.bookInvalid===true)
    return deny('pr_book_execution_evidence_invalid');
  const cumulative=pegasusRyuSeiKenCapitalAskDepth(plan?.executionEvidence?.book,ask);
  const already=Number(plan?.existingGroupQuantity),available=Number(plan?.availableAtLimitCount);
  if(!cumulative.ok||!Number.isFinite(already)||already<0||(!live&&!Number.isSafeInteger(already))
    ||!Number.isSafeInteger(available)||available!==cumulative.count
    ||available<(live?count:already+count))return deny('pr_cumulative_book_depth_proof_missing');
  // LIVE rechecks actual current broker depth per order. Historical group fills
  // are already reflected in that book; SIM retains its cumulative budget.
  // Missing or malformed fee evidence must never be interpreted as 0c.
  const simFeeEvidence=settings?.simFeeCents;
  if(simFeeEvidence==null || typeof simFeeEvidence==='boolean'
    || (typeof simFeeEvidence==='string' && simFeeEvidence.trim()===''))
    return deny('fee_evidence_missing_or_invalid');
  const feeEach=Number(simFeeEvidence);
  const damage=Number(settings.pegasusRyuSeiKenCapitalAuroraDamageControlPercent);
  if(!Number.isFinite(feeEach)||feeEach<0||!(damage>0&&damage<=95))return deny('pr_fee_or_aurora_invalid');
  const entryFeeCents=live?kalshiGeneralTakerFeeEstimateCents({count,priceCents:entryPrice}):feeEach*count;
  const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entryPrice,count,entryFeeCents,
    mode:settings.mode,simFeeCents:feeEach,damageControlPercent:damage,calculatedAtMs:now});
  if(!aurora.ok||!aurora.frozen)return deny(`pr_aurora_unavailable:${aurora.reason||'unknown'}`);
  const minimumNet=Number(settings.pegasusRyuSeiKenCapitalMinProfitNetPerOriginalContractCents);
  if(!Number.isFinite(minimumNet)||minimumNet<=0||minimumNet>99)return deny('pr_profit_target_invalid');
  const ceiling=maximumSettlementNetAdmission({entryPriceCents:entryPrice,count,entryFeeCents,
    minimumNetPerOriginalContractCents:minimumNet});
  if(!ceiling.ok)return deny('pr_'+ceiling.reason);
  const x1=settings.pegasusRyuSeiKenCapitalAthenaX1Enabled===true;
  const profit=x1?{
    profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,
    profitAuthorityRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
    athenaExit:{version:ATHENA_EXIT_INTELLIGENCE.version,policyRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
      fullPositionOnly:true,positionSplitting:false,
      maximumExecutableBookAgeMs:ATHENA_EXIT_INTELLIGENCE.maximumExecutableBookAgeMs,
      lossAuthority:'U-SG1',minimumProfitNetPerOriginalContractCents:minimumNet,x1ProceedsOnlyAfterMinimumProfit:true},
  }:{
    profitAuthority:INFINITY_BREAK.version,profitAuthorityRevision:INFINITY_BREAK.policyRevision,
    infinityBreak:{version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,
      enabledAtEntry:true,minimumNetPerOriginalContractCents:minimumNet,
      requiredFreshConfirmations:Math.max(1,Math.floor(Number(settings.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),
      maximumBookAgeMs:Math.max(100,Math.floor(Number(settings.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs))),
      confirmationWindowMs:Math.max(250,Math.floor(Number(settings.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs))),
      fullPositionOnly:true,lossAuthority:'U-SG1'},
  };
  const entryConfig={pegasusRyuSeiKenCapitalSettingsFingerprint:pegasusRyuSeiKenCapitalSettingsFingerprint(settings),executionClass:'CAPITAL',executionBuild:BUILD_INFO,side:'YES',
    resetTimestampMs:Number(settings.resetTimestampMs||0),aurora,auroraDamageControlPercent:damage,
    lossAuthority:AURORA_EXECUTION.lossAuthority,
    economicTarget:{version:'PR3-INDEPENDENT-ECONOMIC-TARGET',netPerOriginalContractCents:minimumNet},
    model:{structuralRole:'VERIFIED_CAPITAL_LOSS_RECOVERY',stakeCents:stake,
      minEntryCents:Number(settings.pegasusRyuSeiKenCapitalMinEntryCents),maxEntryCents:Number(settings.pegasusRyuSeiKenCapitalMaxEntryCents),
      minCrashCents:Number(settings.pegasusRyuSeiKenCapitalMinCrashCents),minReboundCents:Number(settings.pegasusRyuSeiKenCapitalMinReboundCents),
      minUpwardTicks:Number(settings.pegasusRyuSeiKenCapitalMinUpwardTicks),stopProtection:'Aurora Execution'},
    ...profit,
    pegasusRyuSeiKenCapitalRecovery:{version:live?PR_LIVE_VERSION:PR_SIM_VERSION,watchId:watch.id,groupId:watch.id,parentEntryId:parent.id,
      seat,positionId:proof.positionId,watchRevision:Number(watch.revision),
      originalParentEntryPriceCents:Number(watch.originalParentEntryPriceCents),
      verifiedLosingExitPriceCents:Number(watch.verifiedLosingExitPriceCents),
      parentRealizedNetCents:Number(watch.parentRealizedNetCents),
      capturedSettings:{stakeCents:stake,multiply:Number(settings.pegasusRyuSeiKenCapitalMultiply),
        link:watch.link===true,auroraDamageControlPercent:damage,athenaX1:x1,
        minimumNetPerOriginalContractCents:minimumNet},
      // Signal observation and later executable REST proof have distinct clocks.
      signalQuoteAtMs:Number(watch.lastQuoteAtMs),
      quoteAtMs,quoteBidCents:bid,quoteAskCents:ask,
      authorization:live?'DURABLE_PENDING_AND_DISPATCH_PROOF_REQUIRED':'ATOMIC_SIM_CAPITAL_PROOF'},
    finalEntryConfirmation:{ok:true,quoteAtMs,bidCents:bid,askCents:ask,ticker:quote.ticker,
      eventTicker:quote.eventTicker,bookProof:{verifiedAtMs:bookAtMs,filledCount:count,
        availableAtLimitCount:available,existingGroupQuantity:already,
        averagePriceCents:entryPrice,witnessHash:authorityHash(plan.executionEvidence||{})},
      atMs:now},
  };
  const entry={id:proof.positionId,systemName:settings.systemName,ownerId:settings.ownerId,
    conceptName:PR_CONCEPT,executionClass:'CAPITAL',sourceFeeder:null,sourceTradeId:parent.id,
    ticker:watch.ticker,eventTicker:watch.eventTicker,marketTitle:String(quote.title||watch.ticker),
    watchdogModel:'bolt-athena-infinity-aurora',mode:settings.mode,status:live?'entry_pending':'open',
    entryPriceCents:entryPrice,exitPriceCents:null,currentPriceCents:bid,peakPriceCents:entryPrice,
    stopPriceCents:aurora.dangerPriceCents,stopLossCents:aurora.stopDistanceCents,
    count,remainingCount:count,volume24h:Number(quote.volume24h||0),spreadAtEntryCents:ask-bid,
    pnlCents:0,entryFeeCents:live?0:entryFeeCents,entryClientOrderId:live?clientOrderId:null,exitFeeCents:0,exitFilledCount:0,exitNotionalCents:0,
    gameStartTimeMs:Number(quote.gameStartTimeMs||0)||null,openedAtMs:now,updatedAtMs:now,
    lowestPriceAfterEntryCents:null,maeCents:0,maeAtMs:null,
    researchTrackingComplete:false,entryConfig:live?{...entryConfig,auroraPending:{version:AURORA_EXECUTION.version,preflight:aurora,exactFillRequired:true}}:entryConfig};
  return {ok:true,entry,seat,watchId:watch.id,reason:live?'pr_live_pending_candidate_requires_db_and_broker':'pr_sim_entry_candidate_db_verification_required'};
}

export function createPegasusRyuSeiKenCapitalSimCapitalEntry(args={}){return createPegasusRyuSeiKenCapitalCapitalEntry(args);}
