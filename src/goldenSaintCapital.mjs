/** R17 Golden Saints — one immutable Starlight-derived capital-entry template.
 * Pure candidate construction; ONLY GoldenSaintRepository.reserveSeat may
 * admit an entry. A quote or constructed entry is never broker authority.
 */
import {BUILD_INFO,authorityHash} from './authority.mjs';
import {r17InternalConcept,r17ScopedId,R17_VERSION,saintRole,r17CardFingerprint,r17QualifiedObservationEvidence} from './goldenSaintDomain.mjs';
import {validateGoldenSaintCard} from './goldenSaintCards.mjs';
import {maximumSettlementNetAdmission,liveRecoveryCollateralRequirement} from './executionEconomics.mjs';
import {calculateAuroraSnapshotFromFeeModel,kalshiGeneralTakerFeeEstimateCents,
  ATHENA_EXIT_INTELLIGENCE,INFINITY_BREAK,AURORA_EXECUTION,executionMarketFamilyExclusion} from './doctrine.mjs';

const deny=(reason)=>({ok:false,reason});
const integer=(v)=>Number.isSafeInteger(v)&&v>0;
export function createGoldenSaintCapitalEntry({watch,card,settings,quote,execution,seat,clientOrderId=null,now=Date.now()}={}){
  const scope=watch?.scope;
  if(!scope||!watch||!saintRole(watch.saint)||watch.version!==R17_VERSION||!validateGoldenSaintCard(card).ok
    ||card.enabled!==true||watch.cardFingerprint!==r17CardFingerprint(card)
    ||!Number.isSafeInteger(seat)||seat<1||seat>card.multiply
    ||!['SIMULATION','LIVE'].includes(scope.mode)||settings?.mode!==scope.mode
    ||settings.systemName!==scope.systemName||settings.ownerId!==scope.ownerId
    ||Number(settings.resetTimestampMs||0)!==scope.resetEpoch||settings.engineActive!==true)
    return deny('r17_candidate_scope_settings_invalid');
  const live=scope.mode==='LIVE';
  if(live&&(settings.liveArmed!==true||settings.liveOwnerAuthorized!==true||!clientOrderId))
    return deny('r17_live_candidate_not_authorized');
  if(!live&&clientOrderId)return deny('r17_sim_broker_identity_forbidden');
  if(quote?.ticker!==watch.ticker||(quote.eventTicker||quote.ticker)!==watch.eventTicker
    ||String(quote.status||quote.liveStatus||'').toLowerCase()!=='active'||quote.result
    ||quote.bookInvalid===true||executionMarketFamilyExclusion(quote.ticker,settings,{concept:r17InternalConcept(watch.saint)}).blocked)
    return deny('r17_market_lifecycle_or_family_invalid');
  const bid=Number(quote.yesBid),ask=Number(quote.yesAsk),at=Number(quote.quoteAtMs||quote.updatedAtMs||0);
  if(!Number.isFinite(bid)||!Number.isFinite(ask)||!(bid>0&&bid<=ask&&ask<100)
    ||ask-bid>card.maxSpreadCents+1e-9||!Number.isFinite(at)||at<=0||at>now+2000||now-at>5000)
    return deny('r17_fresh_quote_spread_invalid');
  // Re-evaluate the exact persisted card-specific rebound/ticks/original-entry
  // condition at the entry constructor, not only at the caller's watch loop.
  // This was missing in R17: an unqualified Leo Rebound=7 watch could be
  // turned into a valid capital candidate by a stale/bypassing caller.
  const eligibility=r17QualifiedObservationEvidence({watch,card,quote,now});
  if(!eligibility.ok)return deny(eligibility.reason);
  const link=card.linkEnabled===true;
  if(!link&&(ask<card.minEntryCents||ask>card.maxEntryCents))return deny('r17_card_entry_band_invalid');
  // Exact strategy signal revision and prices are immutable throughout seat
  // admission. A different ask with the SAME millisecond is still a drift;
  // none of the ten sibling strategies may manufacture a cheaper book or
  // silently accept an ask that was never qualified by Starlight.
  if(Number(watch.lastQuoteAtMs)!==at||watch.ticker!==quote.ticker
    ||Number(watch.lastBidCents)!==bid||Number(watch.lastAskCents)!==ask)
    return deny('r17_signal_and_execution_quote_changed');
  const count=Number(execution?.count),avg=Number(execution?.averagePriceCents);
  const best=Number(execution?.bestAskCents),verifiedAt=Number(execution?.verifiedBookAtMs);
  if(!integer(count)||!Number.isFinite(avg)||!Number.isFinite(best)
    ||best>ask+1e-9||avg>ask+1e-9||best<=0||avg<=0
    ||verifiedAt<=0||verifiedAt>now+2000||now-verifiedAt>5000
    ||execution?.executionEvidence?.book==null||execution?.freshMarket==null
    ||(execution.freshMarket.eventTicker||execution.freshMarket.ticker)!==watch.eventTicker
    ||Number(execution.freshMarket.yesAsk)>ask+1e-9
    ||Number(execution.executionEvidence?.quote?.yesAsk)>ask+1e-9)
    return deny('r17_executable_depth_not_verified');
  if(!link&&(best<card.minEntryCents||best>card.maxEntryCents||avg>card.maxEntryCents))
    return deny('r17_executable_price_band_invalid');
  const fee=live?kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask}):Number(settings.simFeeCents||0)*count;
  const economic=maximumSettlementNetAdmission({entryPriceCents:ask,count,entryFeeCents:fee,
    minimumNetPerOriginalContractCents:card.minProfitNetPerOriginalContractCents});
  if(!economic.ok)return deny('r17_'+economic.reason);
  const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:ask,count,
    entryFeeCents:fee,mode:scope.mode,simFeeCents:Number(settings.simFeeCents||0),
    damageControlPercent:card.auroraDamageControlPercent,calculatedAtMs:now});
  if(!aurora.ok||aurora.frozen!==true)return deny('r17_aurora_unavailable');
  const x1=card.athenaX1Enabled===true,target=card.minProfitNetPerOriginalContractCents;
  const profit=x1?{profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,
    profitAuthorityRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
    athenaExit:{version:ATHENA_EXIT_INTELLIGENCE.version,policyRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
      fullPositionOnly:true,positionSplitting:false,
      maximumExecutableBookAgeMs:ATHENA_EXIT_INTELLIGENCE.maximumExecutableBookAgeMs,
      lossAuthority:'U-SG1',minimumProfitNetPerOriginalContractCents:target,x1ProceedsOnlyAfterMinimumProfit:true}}:
    {profitAuthority:INFINITY_BREAK.version,profitAuthorityRevision:INFINITY_BREAK.policyRevision,
      infinityBreak:{version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,
        enabledAtEntry:true,minimumNetPerOriginalContractCents:target,
        requiredFreshConfirmations:Math.max(1,Math.floor(Number(settings.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),
        maximumBookAgeMs:Math.min(5000,Math.max(1,Number(settings.infinityBreakMaximumBookAgeMs??5000))),
        confirmationWindowMs:Math.max(250,Number(settings.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs)),
        fullPositionOnly:true,lossAuthority:'U-SG1'}};
  const id=r17ScopedId('ENTRY',scope,watch.parentEntryId,watch.saint,seat);
  // A distinct regular seat is the recoverable root, never the COMMON Athena
  // stop that authorized ten sibling attacks and their Multiply seats.
  const regularRootId=watch.role==='REGULAR'?id:watch.regularRootId;
  if(typeof regularRootId!=='string'||!regularRootId)return deny('r17_regular_ancestor_missing');
  const stamp={version:R17_VERSION,saint:watch.saint,role:watch.role,systemName:scope.systemName,
    ownerId:scope.ownerId,mode:scope.mode,resetEpoch:scope.resetEpoch,
    parentEntryId:watch.parentEntryId,watchAuthorizationId:watch.authorizationId,
    parentProofHash:watch.parentProofHash,regularRootId,seat,maximumSeats:card.multiply,
    cardFingerprint:watch.cardFingerprint,signalQuoteAtMs:watch.lastQuoteAtMs,
    signalEligibility:eligibility.evidence,
    finalBookObservedAtMs:verifiedAt,finalBookHash:authorityHash(execution.executionEvidence),
    instrument:'YES',legacyEntryPathsRetired:true};
  const entryConfig={executionClass:'CAPITAL',executionBuild:BUILD_INFO,side:'YES',
    resetTimestampMs:scope.resetEpoch,aurora,auroraDamageControlPercent:card.auroraDamageControlPercent,
    lossAuthority:AURORA_EXECUTION.lossAuthority,
    economicTarget:{version:'R17-GOLDEN-NET-TARGET',netPerOriginalContractCents:target},
    sportingTimeAdmission:watch.role==='REGULAR'&&quote?.gameClockState?.phase==='SCHEDULE_LIVE'
      ?{version:'R36-SCHEDULE-REFERENCE-1',kind:'matched_official_schedule_plus_fresh_live',
        exactKickoffProven:false,scheduledStartIsEstimate:true,
        milestoneId:String(quote.gameClockState.milestoneId||''),
        scheduleReferenceMs:Number(quote.gameClockState.scheduledStartMs)||null,
        liveObservedAtMs:Number(quote.gameClockState.evidenceObservedAtMs)||null}
      :watch.role==='REGULAR'&&quote?.gameClockState?.phase==='BOUNDED'
      ?{version:'R29-BOUND-1',kind:'observed_provider_status_transition',
        exactKickoffProven:false,milestoneId:String(quote.gameClockState.milestoneId||''),
        startLowerMs:Number(quote.gameClockState.boundedStartLowerMs)||null,
        startUpperMs:Number(quote.gameClockState.boundedStartUpperMs)||null,
        liveObservedAtMs:Number(quote.gameClockState.evidenceObservedAtMs)||null}
      :watch.role==='REGULAR'&&quote?.gameClockState?.phase==='CONFIRMED'
        ?{version:'R29-BOUND-1',kind:'explicit_actual_start',exactKickoffProven:true,
          exactStartMs:Number(quote.gameClockState.actualStartMs)||null}
        :null,
    model:{structuralRole:'ATHENA_LOSS_RECOVERY_GOLDEN_SAINT',stakeCents:card.stakeCents,
      minEntryCents:card.minEntryCents,maxEntryCents:card.maxEntryCents,
      minCrashCents:card.minCrashCents,minReboundCents:card.minReboundCents,
      minUpwardTicks:card.minUpwardTicks,stopProtection:'Aurora Execution'},
    ...profit,goldenSaintR17:stamp,
    finalEntryConfirmation:{ok:true,atMs:now,quoteAtMs:at,bidCents:bid,askCents:ask,
      ticker:quote.ticker,eventTicker:watch.eventTicker,verifiedBookAtMs:verifiedAt,
      fullDepthConfirmed:true,count,averagePriceCents:avg,witnessHash:stamp.finalBookHash}};
  if(live){entryConfig.auroraPending={version:AURORA_EXECUTION.version,preflight:aurora,exactFillRequired:true};}
  const entry={id,systemName:scope.systemName,ownerId:scope.ownerId,
    conceptName:r17InternalConcept(watch.saint),executionClass:'CAPITAL',sourceFeeder:null,
    sourceTradeId:watch.parentEntryId,ticker:watch.ticker,eventTicker:watch.eventTicker,
    marketTitle:String(quote.title||watch.ticker),watchdogModel:'bolt-athena-infinity-aurora',
    mode:scope.mode,shadowEpoch:scope.resetEpoch,status:live?'entry_pending':'open',entryPriceCents:ask,
    exitPriceCents:null,currentPriceCents:bid,peakPriceCents:ask,
    stopPriceCents:aurora.dangerPriceCents,stopLossCents:aurora.stopDistanceCents,
    count,remainingCount:count,volume24h:Number(quote.volume24h||0),
    spreadAtEntryCents:ask-bid,pnlCents:0,entryFeeCents:live?0:fee,
    entryClientOrderId:live?clientOrderId:null,exitFeeCents:0,
    exitFilledCount:0,exitNotionalCents:0,gameStartTimeMs:Number(quote.gameStartTimeMs||0)||null,
    openedAtMs:now,updatedAtMs:now,lowestPriceAfterEntryCents:null,
    maeCents:0,maeAtMs:null,researchTrackingComplete:false,entryConfig};
  const collateral=liveRecoveryCollateralRequirement(entry);
  if(live&&!collateral.ok)return deny(collateral.reason);
  return {ok:true,entry,requiredCents:ask*count+fee,fee,reason:live?'r17_live_pending_requires_broker':'r17_sim_native_commit_required'};
}
