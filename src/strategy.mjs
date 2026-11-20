import {createQ17LiveCashWitness} from './q17LiveCapitalAdmissibility.mjs';
import {liveEntryDispatchBookConfirmation} from './liveEntryDispatchBook.mjs';
import {MODEL_CLONE_CAPITAL_VERSION,modelCloneCapitalId} from './modelCloneCapital.mjs';
import {maximumSettlementNetAdmission,verifiedLiveBuyFillEconomics} from './executionEconomics.mjs';
import {athenaStarlightTriggerConfig,athenaStarlightTriggerDecision} from './athenaStarlightTrigger.mjs';
import {LP_CONTINUATION_VERSION,lightningParentEligibility,plasmaGeometryEligibility} from './lightningShadowContinuation.mjs';
import {STARLIGHT_CAPITAL_VERSION,starlightCapitalEntryId,starlightNoSendRetryGeneration} from './starlightCapital.mjs';
import { SHADOW_PROTOCOL, executionSettingsHash, executionSettingsHashMatches, shadowScope, sameShadowScope, shadowAdmissionId, validateShadowEntry } from './shadowProtocol.mjs';
import { randomUUID, createHash } from 'node:crypto';
import { classifyLiveOrderResult } from './kalshi.mjs';
import {
  FEEDERS,
  MOMENTUM,
  WAVE,
  RECOVERY,
  LIGHTNING_PLASMA,
  PHOENIX_COSMO,
  ATHENA_EXCLAMATION as ATHENA_EXCLAMATION_DOCTRINE,
  WATCHDOG_MODEL,
  PORTFOLIO_CONCEPTS,
  ACTIVE_PORTFOLIO_CONCEPTS,
  FEEDER_CONCEPTS,
  ACTIVE_FEEDER_CONCEPTS,
  RETIRED_PORTFOLIO_CONCEPTS,
  RETIRED_FEEDER_CONCEPTS,
  GALACTIC_EXPLOSION, CI1_WALL_CLONE,
  COSMO_ROUTING,
  SCARLET_NEEDLE,
  CRYSTAL_WALL,
  GEMINI_UNIVERSE,
  ANOTHER_DIMENSION,
  SAGITTARIUS_JUSTICE_ARROW,
  EXECUTION_ATTACK_DISPLAY,
  AURORA_EXECUTION,
  calculateAuroraSnapshotFromFeeModel, freezingCoffinSnapshot, isShadowSaintConcept, isShadowSaintEntry, starlightParentLossMayArmRecovery, SHADOW_SAINT_ARCHITECTURE, executionMarketFamilyExclusion, MARKET_FAMILY_EXECUTION_EXCLUSION,
  kalshiGeneralTakerFeeEstimateCents,
  PROTECTED_RUNNER_INTELLIGENCE,
  ATHENA_EXIT_INTELLIGENCE,
  GOLDEN_EYE,
  PROFIT_LEARNING_INTELLIGENCE,
  ATOMIC_THUNDER,
  INFINITY_BREAK,
  ATHENA_COMMANDER,
  ARAYASHIKI,
  stableDropEntry,
  estimateTimeLeftMs,
} from './doctrine.mjs';
import { RELEASE, EDITABLE_NUMERIC_SETTINGS, EDITABLE_BOOLEAN_SETTINGS } from './config.mjs';
import { authoritativeClockSnapshot, isConfirmedGameClockState, isEntryAuthorizedGameClockState } from './gameClock.mjs';
import { AthenaExclamationEngine, ATHENA_EXCLAMATION, athenaExclamationPrimeReview, isGoldSaintConcept } from './athenaExclamation.mjs';
import { BUILD_INFO, authorityHash, sealAthenaFireCommand, verifyAthenaFireCommandHash } from './authority.mjs';
import { phoenixSignalActive, revalidatePhoenixQualification } from './phoenix.mjs';

// Opaque, process-local preparation tokens. They never enter a ledger, an API
// request, a settings card or any broker path.
const pendingAthenaShadowBatches=new WeakMap();
const nowId = () => randomUUID();

function applyFreezingCoffin(config, settings, entryPriceCents, atMs, concept='', {shadowAdmission=false}={}){
  // Q17-R2: Freezing Coffin is a fixed-cent SHADOW stop, not a capital
  // entry's Aurora. The caller must explicitly be the shadow-admission path.
  // Both SIM and future LIVE capital entries retain their own frozen Aurora.
  if(!shadowAdmission || String(config?.executionClass||'')==='CAPITAL')return {config,stop:null};
  // Starlight's virtual recovery is independently Aurora-protected.
  if(String(concept)==='Crash Recovery Hunter')return {config,stop:null};
  if(settings?.freezingCoffinEnabled!==true)return {config,stop:null};
  const snap=freezingCoffinSnapshot({entryPriceCents,maxDropCents:settings.freezingCoffinMaxDropCents,calculatedAtMs:atMs});
  if(!snap.ok)return {config,stop:null,rejected:snap};
  return {config:{...config,freezingCoffin:snap},stop:snap};
}
const openLike = (s) => ['open', 'entry_pending', 'exit_pending', 'pending_recovery'].includes(s);
const slotsLeft = (entries, settings) => Math.max(
  0,
  settings.maxPositions - entries.filter((e) => PORTFOLIO_CONCEPTS.has(e.conceptName) && !isShadowSaintEntry(e) && openLike(e.status)).length,
);
const FINAL_MARKET_STATUSES = new Set(['determined', 'finalized', 'settled']);

function crashStructureAtQuote(signal, q, settings) {
  if (!signal?.episodeId || !q) return { ok:false, reason:'missing_signal_or_quote' };
  const bid = Number(q.yesBid || 0);
  const ask = Number(q.yesAsk || 0);
  if (!(bid > 0) || !(ask > 0) || bid > ask) return { ok:false, reason:'invalid_quote' };
  const depth = Math.max(1, Number(signal.crashDepthCents || 0));
  if (depth + 1e-9 < Number(settings.crashRecoveryMinCrashCents)) return { ok:false, reason:'crash_depth' };
  const trough = Number(signal.troughCents || 0);
  if (!(trough > 0) || bid < trough) return { ok:false, reason:'new_low' };
  const rebound = Math.max(0, bid - trough);
  const reclaimRate = rebound / depth;
  const minReclaim = Number(settings.crashRecoveryMinReclaimRate || 0);
  const requiredRebound = Math.max(Number(settings.crashRecoveryMinReboundCents || 0), Math.ceil(depth * minReclaim - 1e-12));
  if (rebound < requiredRebound || reclaimRate + 1e-12 < minReclaim) return { ok:false, reason:'rebound_structure' };
  if (Number(signal.stableObservations || 0) < Number(settings.crashRecoveryStableObservations || 0)) return { ok:false, reason:'stable_observations' };
  if (Number(signal.upwardTicks || 0) < Number(settings.crashRecoveryUpwardTicks || 0)) return { ok:false, reason:'upward_ticks' };
  return { ok:true, bid, ask, troughCents:trough, crashDepthCents:depth, reboundCents:rebound, reclaimRate, requiredReboundCents:requiredRebound };
}

function crashSignalQualifiedAtQuote(signal, q, settings) {
  const base = crashStructureAtQuote(signal, q, settings);
  if (!base.ok) return base;
  if (base.ask < Number(settings.crashRecoveryMinEntryCents) || base.ask > Number(settings.crashRecoveryMaxEntryCents)) return { ...base, ok:false, reason:'entry_band' };
  if (base.ask - base.bid > Number(settings.crashRecoveryMaxSpreadCents)) return { ...base, ok:false, reason:'spread' };
  return base;
}

export function dragonSignalQualifiedAtQuote(signal, q, settings) {
  const base = crashStructureAtQuote(signal, q, settings);
  if (!base.ok) return base;
  const episodeIndex = Number(signal.episodeIndex || 0);
  if (episodeIndex < 1 || episodeIndex > Number(settings.dragonMaxEpisode ?? 2)) return { ...base, ok:false, reason:'episode' };
  if (base.ask < Number(settings.dragonMinSignalPriceCents ?? 84) || base.ask > Number(settings.dragonMaxSignalPriceCents ?? 88)) return { ...base, ok:false, reason:'signal_band' };
  if (base.ask - base.bid > Number(settings.maxSpreadCents ?? 3)) return { ...base, ok:false, reason:'spread' };
  return base;
}

function crashSourceSnapshotFromSignal(signal, validation = null) {
  return {
    version:signal?.version || 'CI1', episodeId:String(signal?.episodeId || ''), episodeIndex:Number(signal?.episodeIndex || 0),
    preCrashPeakCents:Number(signal?.preCrashPeakCents || 0), troughCents:Number(signal?.troughCents || 0),
    crashDepthCents:Number(signal?.crashDepthCents || 0), reboundCents:Number(validation?.reboundCents ?? signal?.reboundCents ?? 0),
    reclaimRate:Number(validation?.reclaimRate ?? signal?.reclaimRate ?? 0), stableObservations:Number(signal?.stableObservations || 0),
    upwardTicks:Number(signal?.upwardTicks || 0), crashStartedAtMs:Number(signal?.crashStartedAtMs || 0),
    troughAtMs:Number(signal?.troughAtMs || 0), reboundConfirmedAtMs:Number(signal?.reboundConfirmedAtMs || 0),
    sport:signal?.sport || 'Unknown',
    lowerLowCount:Number(signal?.lowerLowCount || 0), reboundLostCount:Number(signal?.reboundLostCount || 0),
    validatedBidCents:validation?.bid == null ? null : Number(validation.bid),
    validatedAskCents:validation?.ask == null ? null : Number(validation.ask),
  };
}




export function hunterEntryEnvelope(settings, conceptName) {
  const s=settings||{};
  const sharedMaxSpreadCents=Number(s.maxSpreadCents??3);
  if(conceptName==='Athena Exclamation')return{minEntryCents:Number(s.athenaExclamationMinEntryCents),maxEntryCents:Number(s.athenaExclamationMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Momentum Hunter')return{minEntryCents:Number(s.momentumMinEntryCents),maxEntryCents:Number(s.momentumMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Wave Surfer')return{minEntryCents:Number(s.waveMinEntryCents),maxEntryCents:Number(s.waveMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Recovery Hunter')return{minEntryCents:Number(s.recoveryMinEntryCents),maxEntryCents:Number(s.recoveryMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Crash Recovery Hunter')return{minEntryCents:Number(s.crashRecoveryMinEntryCents),maxEntryCents:Number(s.crashRecoveryMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Scarlet Needle')return{minEntryCents:Number(s.scarletNeedleMinEntryCents),maxEntryCents:Number(s.scarletNeedleMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Sagittarius Justice Arrow')return{minEntryCents:Number(s.justiceArrowMinEntryCents),maxEntryCents:Number(s.justiceArrowMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Lightning Plasma')return{minEntryCents:s.lightningPlasmaLinkEnabled===true?1:Number(s.lightningPlasmaMinEntryCents),maxEntryCents:s.lightningPlasmaLinkEnabled===true?99:Number(s.lightningPlasmaMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  if(conceptName==='Sagittarius Arrow Recovery')return{minEntryCents:s.sagittariusArrowLinkEnabled===true?1:Number(s.sagittariusArrowMinEntryCents),maxEntryCents:s.sagittariusArrowLinkEnabled===true?99:Number(s.sagittariusArrowMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  return null;
}

export function hunterEntryBoundaryQualifiedAtQuote(conceptName, q, settings, executionPlan = null) {
  const envelope = hunterEntryEnvelope(settings, conceptName);
  if (!envelope) return { ok:false, reason:'unknown_hunter_concept' };
  const bid = Number(q?.yesBid || 0);
  const ask = Number(q?.yesAsk || 0);
  if (!(bid > 0) || !(ask > 0) || bid > ask) return { ok:false, reason:'invalid_quote', bid, ask, ...envelope };
  if (ask < envelope.minEntryCents || ask > envelope.maxEntryCents) return { ok:false, reason:'entry_band', bid, ask, ...envelope };
  if (Number.isFinite(envelope.maxSpreadCents) && ask - bid > envelope.maxSpreadCents+1e-9) return { ok:false, reason:'spread', bid, ask, ...envelope };
  if (executionPlan) {
    const bestAsk = Number(executionPlan.bestAskCents);
    const average = Number(executionPlan.averagePriceCents);
    if (!(bestAsk > 0) || !(average > 0)) return { ok:false, reason:'invalid_execution_plan', bid, ask, bestAskCents:bestAsk, averagePriceCents:average, ...envelope };
    if (bestAsk < envelope.minEntryCents || bestAsk > envelope.maxEntryCents || average > envelope.maxEntryCents) {
      return { ok:false, reason:'execution_price_band', bid, ask, bestAskCents:bestAsk, averagePriceCents:average, ...envelope };
    }
  }
  return { ok:true, reason:'qualified', bid, ask, ...envelope };
}



export function attackConfiguredStakeCents(settings,concept){
  if(concept==='Momentum Hunter')return Number(settings?.momentumStakeCents||0);
  if(concept==='Wave Surfer')return Number(settings?.waveStakeCents||0);
  if(concept==='Recovery Hunter')return Number(settings?.recoveryStakeCents||0);
  if(concept==='Crash Recovery Hunter')return Number(settings?.crashRecoveryStakeCents||0);
  if(concept==='Scarlet Needle')return Number(settings?.scarletNeedleStakeCents||0);
  if(concept==='Sagittarius Justice Arrow')return Number(settings?.justiceArrowStakeCents||0);
  if(concept==='Athena Exclamation')return Number(settings?.athenaExclamationStakeCents||0);
  if(concept==='Lightning Plasma')return Number(settings?.lightningPlasmaFieldStakeCents||0);
  return 0;
}

export function validateAthenaFireCommand(command,{concept,q,settings,now=Date.now()}={}){
  // Crystal Wall V3 is intentionally outside Athena. Reject the concept at
  // the Athena validator itself so no old/fabricated Athena FIRE command can
  // ever become an alternate Crystal Wall authority.
  if(String(concept||'')==='Recovery Hunter')return{ok:false,reason:'crystal_wall_v3_authority_required'};
  if(String(concept||'')==='Sagittarius Justice Arrow')return{ok:false,reason:'justice_arrow_v2_authority_required'};
  if(!command||typeof command!=='object')return{ok:false,reason:'athena_fire_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'athena_fire_hash_invalid'};
  if(String(command.version)!==String(ATHENA_COMMANDER.version))return{ok:false,reason:'athena_fire_version_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'athena_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!==String(concept||''))return{ok:false,reason:'athena_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'athena_fire_ticker_mismatch'};
  // R60: Athena's sealed FIRE is the sole strategic entry decision. Execution
  // validates command integrity plus hard market/operator constraints only; no
  // downstream predictive model is allowed to re-veto the trade.
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'athena_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'athena_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'athena_fire_expired'};
  const envelope=hunterEntryEnvelope(settings,concept);if(!envelope)return{ok:false,reason:'unknown_attack'};
  const configuredStake=attackConfiguredStakeCents(settings,concept);const commandedStake=Number(command.stakeCents||0);if(!(configuredStake>0)||!(commandedStake>0))return{ok:false,reason:'athena_fire_stake_invalid',expectedStakeCents:configuredStake};
  // AU2: Plasma is an ordinary Athena-path Attack. Field-budget / ray checks are retired.
  else if(Math.abs(commandedStake-configuredStake)>1e-9)return{ok:false,reason:'athena_fire_stake_mismatch',expectedStakeCents:configuredStake};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'athena_fire_operator_band_changed'};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0),maxAuthorized=Number(command.authorizedMaxEntryCents||0);
  if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  if(ask<envelope.minEntryCents||ask>envelope.maxEntryCents)return{ok:false,reason:'entry_band'};
  if(!(maxAuthorized>=envelope.minEntryCents)||ask>maxAuthorized)return{ok:false,reason:'athena_strike_price_exceeded',authorizedMaxEntryCents:maxAuthorized};
  const sharedSpread=Number(settings?.maxSpreadCents??3);if(ask-bid>sharedSpread)return{ok:false,reason:'shared_spread_safety'};
  if(Number(command.maxSpreadCents)>sharedSpread+1e-9)return{ok:false,reason:'athena_fire_spread_authority_invalid'};
  const commandedTarget=Number(command?.economicTarget?.netPerOriginalContractCents);
  const configuredTarget=concept==='Sagittarius Justice Arrow'
    ? Number(ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents)
    : concept==='Scarlet Needle'
      ? Number(settings?.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents)
    : Number(settings?.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);
  if(!(commandedTarget>0)||!Number.isFinite(commandedTarget))return{ok:false,reason:'athena_economic_target_missing'};
  if(Math.abs(commandedTarget-configuredTarget)>1e-9)return{ok:false,reason:'athena_economic_target_changed',commandedTargetNetPerOriginalContractCents:commandedTarget,configuredTargetNetPerOriginalContractCents:configuredTarget};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'athena_economic_target_unreachable'};
  // AU2: Plasma FIRE does not require a continuation lineage.
  if(!['Scarlet Needle','Lightning Plasma','Athena Exclamation'].includes(String(concept||''))){
    const geometry=attackGeometryQualified(settings,concept,command?.decisionEvidence?.features||{});
    if(!geometry.ok)return{ok:false,reason:`attack_confirmation_${geometry.reason}`,...geometry};
  }
  return{ok:true,reason:'athena_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,authorizedMaxEntryCents:maxAuthorized,economicTargetNetPerOriginalContractCents:commandedTarget};
}

// IA3: revalidate an independent, DB-verified Athena-loss authority at the
// final executable book AND again immediately before any LIVE broker dispatch.
// This is not an Athena FIRE and cannot be used for ordinary Athena entries.
export function independentRecoveryExecutionDecision({authority,parent,concept,sourceTradeId,
  quote,settings,plan,now=Date.now()}={}){
  if(!authority||authority.version!=='INDEPENDENT-ATHENA-LOSS-V2'
    ||authority.authorityMode!=='INDEPENDENT_ATHENA_SHADOW_STOP'
    ||authority.verifiedStop!==true||!String(authority.parentProofHash||'')
    ||!String(authority.authorizationId||'').startsWith('INDEP-STOP:')
    ||authority.parentEntryId!==String(sourceTradeId||'')
    ||authority.concept!==concept
    ||authority.systemName!==settings?.systemName||authority.ownerId!==settings?.ownerId
    ||authority.mode!==settings?.mode||Number(authority.resetEpoch)!==Number(settings?.resetTimestampMs||0)
    ||!['Lightning Plasma','Sagittarius Arrow Recovery'].includes(concept))
    return {ok:false,reason:'independent_execution_authority_invalid'};
  const ownEnabled=concept==='Lightning Plasma'?settings?.lightningPlasmaEnabled===true
    :settings?.sagittariusArrowEnabled===true;
  if(!ownEnabled||settings?.engineActive===false)return {ok:false,reason:'independent_attack_disabled'};
  if(!parent||parent.id!==String(sourceTradeId||'')||parent.conceptName!=='Athena Exclamation'
    ||parent.status!=='closed'||parent.closeReason!=='hard_stop_loss'
    ||!(Number(parent.pnlCents)<0)||parent.executionClass!=='SHADOW_SAINT'
    ||parent.archived===true||Number(parent.remainingCount)!==0
    ||parent.systemName!==settings.systemName||parent.ownerId!==settings.ownerId
    ||parent.mode!==settings.mode||Number(parent.shadowEpoch)!==Number(settings.resetTimestampMs||0)
    ||Number(parent.closedAtMs)!==Number(authority.parentClosedAtMs)
    ||Number(parent.pnlCents)!==Number(authority.parentPnlCents))
    return {ok:false,reason:'independent_parent_no_longer_authoritative'};
  const ask=Number(quote?.yesAsk),bid=Number(quote?.yesBid);
  if(!quote||quote.ticker!==authority.ticker||String(quote.eventTicker||quote.ticker)!==authority.eventTicker
    ||parent.ticker!==authority.ticker||String(parent.eventTicker||parent.ticker)!==authority.eventTicker
    ||quote.bookInvalid===true||quote.status!=='active'||Boolean(quote.result))
    return {ok:false,reason:'independent_market_identity_or_lifecycle_invalid'};
  const quoteAt=Number(quote.quoteAtMs),bookAt=Number(plan?.verifiedBookAtMs);
  const maxAge=Math.min(5000,Math.max(100,Number(settings?.infinityBreakMaximumBookAgeMs||5000)));
  if(!Number.isSafeInteger(quoteAt)||quoteAt<=0||quoteAt>now||now-quoteAt>maxAge
    ||!Number.isSafeInteger(bookAt)||bookAt<=0||bookAt>now||now-bookAt>maxAge)
    return {ok:false,reason:'independent_fresh_quote_or_book_missing'};
  const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,quote,settings,plan);
  if(!boundary.ok)return boundary;
  if(!(bid>0&&ask>0&&ask<=Number(authority.authorizedAskCents)+1e-9)
    ||ask>Number(authority.authorizedMaxEntryCents)+1e-9
    ||Number(plan?.count)<1
    ||Number(plan?.bestAskCents)>Number(authority.authorizedMaxEntryCents)+1e-9
    ||Number(plan?.averagePriceCents)>Number(authority.authorizedMaxEntryCents)+1e-9)
    return {ok:false,reason:'independent_executable_limit_changed'};
  return {ok:true,reason:'independent_verified_stop_fresh_book',
    authorizationId:authority.authorizationId};
}

export function recoverySignalState(loss, q, observation, settings, runtimeTroughCents = null) {
  const bid = Number(q?.yesBid || 0);
  const ask = Number(q?.yesAsk || 0);
  const exit = Number(loss?.exitPriceCents || 0);
  const persistedTrough = Number(observation?.trough_cents);
  const priorRuntimeTrough = Number(runtimeTroughCents);
  const troughCandidates = [exit, persistedTrough, priorRuntimeTrough, bid].filter((v) => Number.isFinite(v) && v > 0);
  const trough = troughCandidates.length ? Math.min(...troughCandidates) : 0;
  const rebound = bid > 0 && trough > 0 ? Math.max(0, bid - trough) : 0;
  const minRebound = Number(settings?.recoveryMinReboundCents ?? RECOVERY.minReboundCents);
  const minEntry = Number(settings?.recoveryMinEntryCents ?? RECOVERY.minEntryCents);
  const maxEntry = Number(settings?.recoveryMaxEntryCents ?? RECOVERY.maxEntryCents);
  const status = String(q?.status || '').toLowerCase();
  const final = Boolean(q?.result) || FINAL_MARKET_STATUSES.has(status);
  let reason = 'qualified';
  if (!q || bid <= 0 || ask <= 0) reason = 'quote_unavailable';
  else if (final) reason = 'market_final';
  else if (ask < minEntry || ask > maxEntry) reason = 'outside_entry_band';
  else if (rebound + 1e-9 < minRebound) reason = 'rebound_not_confirmed';
  return { qualified: reason === 'qualified', reason, bidCents:bid, askCents:ask, troughCents:trough, reboundCents:rebound, minReboundCents:minRebound, minEntryCents:minEntry, maxEntryCents:maxEntry };
}

export function plasmaSignalState(loss, q, observation, settings, runtimeTroughCents = null) {
  const bid = Number(q?.yesBid || 0);
  const ask = Number(q?.yesAsk || 0);
  const exit = Number(loss?.exitPriceCents || 0);
  const persistedTrough = Number(observation?.trough_cents);
  const priorRuntimeTrough = Number(runtimeTroughCents);
  const troughCandidates = [exit, persistedTrough, priorRuntimeTrough, bid].filter((v) => Number.isFinite(v) && v > 0);
  const trough = troughCandidates.length ? Math.min(...troughCandidates) : 0;
  const rebound = bid > 0 && trough > 0 ? Math.max(0, bid - trough) : 0;
  const minRebound = Number(settings?.lightningPlasmaMinReboundCents ?? LIGHTNING_PLASMA.minReboundCents);
  const minEntry = Number(settings?.lightningPlasmaMinEntryCents ?? LIGHTNING_PLASMA.minEntryCents);
  const maxEntry = Number(settings?.lightningPlasmaMaxEntryCents ?? LIGHTNING_PLASMA.maxEntryCents);
  const status = String(q?.status || '').toLowerCase();
  const final = Boolean(q?.result) || FINAL_MARKET_STATUSES.has(status);
  let reason = 'qualified';
  if (!q || bid <= 0 || ask <= 0) reason = 'quote_unavailable';
  else if (final) reason = 'market_final';
  else if (ask < minEntry || ask > maxEntry) reason = 'outside_entry_band';
  else if (rebound + 1e-9 < minRebound) reason = 'rebound_not_confirmed';
  return { qualified: reason === 'qualified', reason, bidCents:bid, askCents:ask, troughCents:trough, reboundCents:rebound, minReboundCents:minRebound, minEntryCents:minEntry, maxEntryCents:maxEntry };
}


export function activeCosmoSources(entries, settings, { ticker = null, now = Date.now() } = {}) {
  const wantedTicker = ticker == null ? null : String(ticker);
  return (entries || [])
    .filter((e) => ACTIVE_FEEDER_CONCEPTS.has(e?.conceptName) && isModelEnabled(settings, e.conceptName) && openLike(e?.status))
    .filter((e) => e?.conceptName !== 'Phoenix' || phoenixSignalActive(e, settings, now))
    .filter((e) => wantedTicker == null || String(e?.ticker || '') === wantedTicker);
}

export function selectCrashRecoveryCosmoSource(entries, settings, ticker, episodeId = '') {
  const sources = activeCosmoSources(entries, settings, { ticker });
  if (!sources.length) return null;
  const episode = String(episodeId || '');
  // Preserve the strongest causal lineage when Dragon materialized this exact
  // crash episode. Otherwise any active Cosmo may nominate the market. Newest
  // source wins deterministically, with stable concept/id tie-breaks.
  const exactDragon = episode ? sources
    .filter((e) => e.conceptName === 'Dragon' && String(e.sourceTradeId || '') === episode)
    .sort((a,b) => Number(b.openedAtMs || 0)-Number(a.openedAtMs || 0) || String(a.id||'').localeCompare(String(b.id||'')))[0] : null;
  if (exactDragon) return exactDragon;
  return sources.slice().sort((a,b) =>
    Number(b.openedAtMs || 0)-Number(a.openedAtMs || 0)
    || String(a.conceptName||'').localeCompare(String(b.conceptName||''))
    || String(a.id||'').localeCompare(String(b.id||''))
  )[0] || null;
}


export const ATTACK_MULTIPLY_KEYS = Object.freeze({
  'Momentum Hunter':'momentumHunterMultiply',
  'Wave Surfer':'waveSurferMultiply',
  'Crash Recovery Hunter':'crashRecoveryHunterMultiply',
  'Recovery Hunter':'recoveryHunterMultiply',
  'Sagittarius Justice Arrow':'justiceArrowMultiply',
  'Scarlet Needle':'scarletNeedleMultiply',
  'Lightning Plasma':'lightningPlasmaMultiply',
  'Sagittarius Arrow Recovery':'sagittariusArrowMultiply',
  'Athena Exclamation':'athenaExclamationMultiply',
});

export function attackMultiplySeats(settings, conceptName){
  const key=ATTACK_MULTIPLY_KEYS[conceptName];
  if(!key)return 1;
  const n=Math.floor(Number(settings?.[key]));
  if(!Number.isFinite(n)||n<=1)return 1;
  return Math.min(20,n);
}

// LP-SCALEIN-V1 decision. Pure. Caller supplies the open Starlight, a live
// mark, the operator threshold, and how many Lightning Plasma seats already
// exist for this exact parent. No follow-up is decided here.
export function lightningPlasmaScaleInDecision({
  starlight=null,
  quote=null,
  settings=null,
  existingPlasmaForParent=0,
  thresholdCents=null,
  observation=null,
}={}){
  const eligibility=lightningParentEligibility(starlight,settings||{}, {
    ticker:quote?.ticker??null});
  if(!eligibility.ok)return eligibility;
  if(settings?.lightningPlasmaEnabled!==true)
    return {ok:false,reason:'lp_disabled'};
  const geometry=plasmaGeometryEligibility(observation,settings,quote);
  if(!geometry.ok)return geometry;
  const thr=Number(thresholdCents??settings?.lightningPlasmaStarlightScaleInCents);
  if(!Number.isFinite(thr)||thr<=0)
    return {ok:false,reason:'threshold_off'};
  const bid=Number(quote?.yesBid);
  const entry=Number(starlight.entryPriceCents);
  if(!Number.isFinite(bid)||bid<=0||!Number.isFinite(entry)||entry<=0)
    return {ok:false,reason:'no_mark'};
  const profitCents=bid-entry;
  if(profitCents+1e-9<thr)
    return {ok:false,reason:'below_threshold',profitCents,thresholdCents:thr};
  const multiply=attackMultiplySeats(settings,'Lightning Plasma');
  const existing=Math.max(0,Math.floor(Number(existingPlasmaForParent)||0));
  if(existing>=multiply)
    return {ok:false,reason:'multiply_full',existing,multiply,profitCents,thresholdCents:thr};
  return {ok:true,profitCents,thresholdCents:thr,multiply,existing,seatsToOpen:multiply-existing,parentKind:eligibility.kind,parentRevision:eligibility.revision,geometry};
}

// LP-V5: last-price signal before SIM persistence and LIVE BUY. Durable
// OPEN CAPITAL Starlight authority is separately revalidated in the database.
export function lightningPlasmaFinalEntrySignal({quote=null,ticker='',parentEntryCents=0,
  triggerCents=0,minEntryCents=0,maxEntryCents=100,authorizedAskCents=100,now=Date.now(),settings=null,observation=null}={}){
  const at=Number(now);
  if(!quote || String(quote.ticker||'')!==String(ticker||'')
    || String(quote.status||'').toLowerCase()!=='active'
    || Boolean(quote.result) || quote.bookInvalid===true)
    return {ok:false,reason:'lp_final_quote_not_executable'};
  const observedAt=Number(quote.quoteAtMs||quote.updatedAtMs||0);
  if(!(observedAt>0) || observedAt>at || at-observedAt>5000)
    return {ok:false,reason:'lp_final_quote_stale'};
  const bid=Number(quote.yesBid),ask=Number(quote.yesAsk),parentEntry=Number(parentEntryCents),thr=Number(triggerCents);
  if(!(thr>0) || !(bid>0) || !(ask>0) || !(parentEntry>0) || bid-parentEntry+1e-9<thr)
    return {ok:false,reason:'lp_parent_profit_no_longer_qualified'};
  if(ask<Number(minEntryCents)||ask>Number(maxEntryCents) || ask<bid || ask>Number(authorizedAskCents)+1e-9)
    return {ok:false,reason:'lp_final_entry_guards_changed'};
  const geometry=plasmaGeometryEligibility(observation,settings||{},quote);
  if(!geometry.ok)return geometry;
  return {ok:true,atMs:at,route:'lp_starlight_profit',profitCents:bid-parentEntry,
    thresholdCents:thr,bidCents:bid,askCents:ask,quoteAtMs:observedAt,geometry};
}

// Hard rule. A Lightning Plasma close must never arm Starlight or any follow-up.
export function lightningPlasmaLossMayArmStarlight(entry){
  return starlightParentLossMayArmRecovery(entry);
}

export const ATTACK_ATHENA_X1_KEYS = Object.freeze({
  'Momentum Hunter':'momentumHunterAthenaX1Enabled',
  'Wave Surfer':'waveSurferAthenaX1Enabled',
  'Crash Recovery Hunter':'crashRecoveryHunterAthenaX1Enabled',
  'Recovery Hunter':'recoveryHunterAthenaX1Enabled',
  'Sagittarius Justice Arrow':'justiceArrowAthenaX1Enabled',
  'Scarlet Needle':'scarletNeedleAthenaX1Enabled',
  'Lightning Plasma':'lightningPlasmaAthenaX1Enabled',
  'Athena Exclamation':'athenaExclamationAthenaX1Enabled',
});

export const ATTACK_CONFIRMATION_KEYS = Object.freeze({
  'Momentum Hunter':{crash:'momentumHunterMinCrashCents',rebound:'momentumHunterMinReboundCents',ticks:'momentumHunterMinUpwardTicks',profit:'momentumHunterMinProfitNetPerOriginalContractCents'},
  'Wave Surfer':{crash:'waveSurferMinCrashCents',rebound:'waveSurferMinReboundCents',ticks:'waveSurferMinUpwardTicks',profit:'waveSurferMinProfitNetPerOriginalContractCents'},
  'Crash Recovery Hunter':{crash:'crashRecoveryHunterMinCrashCents',rebound:'crashRecoveryHunterMinReboundCents',ticks:'crashRecoveryHunterMinUpwardTicks',profit:'crashRecoveryHunterMinProfitNetPerOriginalContractCents'},
  'Recovery Hunter':{crash:'crystalWallMinCrashCents',rebound:'crystalWallMinReboundCents',ticks:'crystalWallMinUpwardTicks',profit:'recoveryHunterMinProfitNetPerOriginalContractCents'},
  'Sagittarius Justice Arrow':{crash:'justiceArrowMinCrashCents',rebound:'justiceArrowMinReboundCents',ticks:'justiceArrowMinUpwardTicks',profit:'justiceArrowMinProfitNetPerOriginalContractCents'},
  'Scarlet Needle':{crash:'scarletNeedleMinCrashCents',rebound:'scarletNeedleMinReboundCents',ticks:'scarletNeedleMinUpwardTicks',profit:'scarletNeedleMinProfitNetPerOriginalContractCents'},
  'Lightning Plasma':{crash:'lightningPlasmaMinCrashCents',rebound:'lightningPlasmaMinReboundCents',ticks:'lightningPlasmaMinUpwardTicks',profit:'lightningPlasmaMinProfitNetPerOriginalContractCents'},
  'Athena Exclamation':{crash:'athenaExclamationMinCrashCents',rebound:'athenaExclamationMinReboundCents',ticks:'athenaExclamationMinUpwardTicks',profit:'athenaExclamationMinProfitNetPerOriginalContractCents'},
});


export const CI1_WALL_CLONE_SAINTS = CI1_WALL_CLONE.saints;

// The parent-scoped recovery seat is idempotent across Railway processes,
// including restart races BEFORE a broker-order intent is saved. PostgreSQL's
// sag_entries primary key then prevents a second distinct child insertion.

function auroraPercentFor(settings={}, concept=''){
  if(String(concept)==='Crash Recovery Hunter'){
    const own=Number(settings.crashRecoveryHunterAuroraDamageControlPercent);
    if(Number.isFinite(own)&&own>0)return Math.max(1,Math.min(95,own));
  }
  if(String(concept)==='Sagittarius Arrow Recovery'){
    const own=Number(settings.sagittariusArrowAuroraDamageControlPercent);
    if(Number.isFinite(own)&&own>0)return Math.max(1,Math.min(95,own));
  }
  if(String(concept)==='Lightning Plasma'){
    const own=Number(settings.lightningPlasmaAuroraDamageControlPercent);
    if(Number.isFinite(own)&&own>0)return Math.max(1,Math.min(95,own));
  }
  return Math.max(1,Math.min(95,Number(settings.auroraDamageControlPercent??45)));
}

export function starlightRecoveryEntryId(snapshot={}){
  return starlightCapitalEntryId(snapshot);
}


// SE2-R5: independent Starlight post-stop geometry. A rising-only tape cannot
// manufacture a crash. All qualifications depend on a genuine post-stop decline,
// its subsequent rebound, fresh distinct upticks, and the existing operator
// thresholds. advance=false is read-only, for final broker/commit revalidation.
// SE2-R9: Quote milliseconds alone are not a sufficient observation identity:
// WebSocket/book events may change the bid more than once during the same ms.
// Preserve MarketHub's durable adapter epoch/revision to distinguish those
// independent observations, while failing closed on old/replayed revisions.
// The timestamp remains authoritative for quote freshness and cross-epoch
// ordering. Legacy quotes without a revision may advance only at a NEW ms.
export function starlightRecoveryQuoteOrder(w={},q={},liveEpoch=''){
  const priorAt=Number(w.lastQuoteAtMs||0);
  const at=Number(q?.quoteAtMs||q?.updatedAtMs||q?.quoteObservation?.observedAtMs||0);
  if(!(at>0))return -1;
  const epoch=String(q?.quoteObservation?.epoch||'');
  const current=String(liveEpoch||q?.quoteObservation?.liveEpoch||'');
  // Current-epoch authority comes from MarketHub. A quote whose own epoch
  // does not match the live process epoch is from a superseded stream.
  if(!epoch||!current||epoch!==current)return -1;
  if(!(priorAt>0))return 1;
  if(at<priorAt)return -1;
  const previousEpoch=String(w.lastQuoteEpoch||'');
  const revision=Number(q?.quoteObservation?.revision||0);
  const previousRevision=Number(w.lastQuoteRevision||0);
  if(epoch&&previousEpoch&&epoch===previousEpoch&&revision>0&&previousRevision>0){
    if(revision<previousRevision)return -1;
    if(revision===previousRevision){
      const sameBid=Number(q?.yesBid)===Number(w.lastBidCents);
      const sameAsk=!(Number(w.lastAskCents)>0) || Number(q?.yesAsk)===Number(w.lastAskCents);
      return sameBid&&sameAsk?0:-1;
    }
    return 1;
  }
  // A missing watch epoch or a different watch epoch is a new stream.
  // The quote already matched the live process epoch above, so this is
  // a legitimate transition only when the observation is strictly newer.
  return at>priorAt?1:0;
}


// One provenance stamp. Callers that omit the optional liveEpoch argument
// still get the current process epoch from the quote itself.
export function stampLiveEpoch(quote, liveEpoch){
  if(!quote || !liveEpoch) return quote;
  const obs = quote.quoteObservation ? {...quote.quoteObservation} : {};
  // Always overwrite with the current process epoch. An observation's own
  // epoch is the stream that produced it, not proof that the process is live.
  obs.liveEpoch = String(liveEpoch);
  quote.quoteObservation = obs;
  return quote;
}

export function starlightRecoverySignalState(w={},q={},s={},now=Date.now(),{advance=false,liveEpoch=''}={}){
  const out={...w};
  const bid=Number(q?.yesBid),ask=Number(q?.yesAsk);
  const at=Number(q?.quoteAtMs||q?.updatedAtMs||q?.quoteObservation?.observedAtMs||0);
  const operatorAge=Number(s.infinityBreakMaximumBookAgeMs??5000);
  const maxAge=Math.min(5000, Math.max(1, Number.isFinite(operatorAge)&&operatorAge>0?operatorAge:5000));
  const recoveryObservationWindowMs=maxAge; // never wider than the operator book-age limit
  const status=String(q?.status||q?.liveStatus||'active').toLowerCase();
  const terminal=Boolean(q?.result)||['finalized','settled','closed','determined'].includes(status);
  const pricesBad=!Number.isFinite(bid)||!Number.isFinite(ask)||bid<=0||ask<=0||bid>ask||ask>100;
  // R15-R4: an invalidated/untrusted book is not executable evidence.
  // Finite cached prices after a sequence gap or disconnect must not advance geometry.
  const bad=terminal||pricesBad||q?.bookInvalid===true;
  const expired=now>Number(w.expiresAtMs||0)||!Number.isFinite(Number(w.expiresAtMs));
  const minCrash=Math.max(0,Number(s.crashRecoveryHunterMinCrashCents||0));
  const minRebound=Math.max(0,Number(s.crashRecoveryHunterMinReboundCents||0));
  const minTicks=Math.max(0,Number(s.crashRecoveryHunterMinUpwardTicks||0));
  const minEntry=Number(s.crashRecoveryMinEntryCents||0),maxEntry=Number(s.crashRecoveryMaxEntryCents??100);
  const prevAt=Number(w.lastQuoteAtMs||0);
  const receivedAt=Number(q?.quoteObservation?.receivedAtMs||0);
  const trustedDelivery=advance&&Boolean(q?.quoteObservation?.epoch)
    &&Number(q?.quoteObservation?.revision||0)>0&&receivedAt>0
    &&receivedAt<=now+2_000&&receivedAt>=at-2_000;
  // Observation time may explain delivery delay, but it cannot outlive the
  // operator book-age limit. A 7s quote is stale when the operator max is 1s.
  const observedFresh=receivedAt>0&&at>0
    &&receivedAt+2_000>=at
    &&receivedAt-at<=maxAge
    &&now-at<=maxAge
    &&receivedAt<=now+2_000
    &&now-receivedAt<=recoveryObservationWindowMs;
  const freshnessReference=(trustedDelivery||observedFresh)?receivedAt:now;
  if(expired)return {...out,qualified:false,reason:'recovery_expired'};
  if(bad)return {...out,qualified:false,reason:'market_or_book_invalid'};
  if(!(at>0)||at>now+2_000||now-at>maxAge||(observedFresh?now-receivedAt>recoveryObservationWindowMs:freshnessReference-at>maxAge))return {...out,qualified:false,reason:'quote_stale_or_future'};
  const armedAt=Number(w.armedAtMs||0);
  const receivedAfterArm=receivedAt>=armedAt&&receivedAt<=now+2_000&&now-receivedAt<=maxAge&&receivedAt-at<=maxAge;
  const skewBound=at>=armedAt-maxAge;
  if(!(receivedAfterArm&&skewBound))return {...out,qualified:false,reason:'quote_pre_stop'};
  const observationOrder=starlightRecoveryQuoteOrder(w,q,liveEpoch);
  if(observationOrder<0)return {...out,qualified:false,reason:'quote_out_of_order'};
  if(!advance && Number(w.lastBidCents)!==bid)return {...out,qualified:false,reason:'unpersisted_price_change'};
  if(advance && observationOrder===0)return {...out,qualified:false,reason:'duplicate_quote'};
  let peak=Number(w.peakSinceArmCents??w.stopPriceCents??bid);
  let trough=Number(w.troughSinceArmCents??peak);
  let crashAt=Number(w.crashConfirmedAtMs||0);
  let ticks=Math.max(0,Number(w.upwardTicks||0));
  if(advance){
    if(!crashAt && minCrash>0){
      // Before a real decline, upward price movement only moves the swing high.
      if(bid>=peak){peak=bid;trough=bid;ticks=0;}
      else if(bid<trough){trough=bid;ticks=0;}
      if(peak-trough+1e-9>=minCrash)crashAt=at;
    }else{
      if(bid<trough){trough=bid;ticks=0;}
      else if(bid<Number(w.lastBidCents??bid))ticks=0;
      else if(bid>Number(w.lastBidCents??bid))ticks++;
      peak=Math.max(peak,bid);
    }
    out.peakSinceArmCents=peak;
    out.troughSinceArmCents=trough;
    out.crashConfirmedAtMs=crashAt||(minCrash<=0?Number(w.armedAtMs||at):0);
    out.upwardTicks=ticks;
    out.lastBidCents=bid;
    out.lastAskCents=ask;
    out.lastQuoteAtMs=at;
    out.lastQuoteEpoch=String(q?.quoteObservation?.epoch||'');
    out.lastQuoteRevision=Number(q?.quoteObservation?.revision||0);
    out.updatedAtMs=now;
  }
  const depth=(crashAt||minCrash<=0)?Math.max(0,peak-trough):0;
  const rebound=Math.max(0,bid-trough);
  const waited=now>=Number(w.releaseAtMs||0)&&Number(w.armedAtMs||0)>0;
  const inBand=ask>=minEntry&&ask<=maxEntry;
  const geometry=(minCrash<=0||Boolean(crashAt)&&depth+1e-9>=minCrash)
    &&rebound+1e-9>=minRebound&&ticks>=minTicks;
  const qualified=waited&&inBand&&geometry&&now>=Number(w.retryNotBeforeMs||0);
  return {...out,qualified,crashDepthCents:depth,reboundCents:rebound,
    reason:!waited?'observation_wait':!inBand?'price_band':!geometry?'crash_rebound_or_ticks':
      now<Number(w.retryNotBeforeMs||0)?'execution_retry_wait':'qualified'};
}



export function ci1EpisodeConsumptionKey(concept, episodeId) {
  return `${String(concept || '')}|${String(episodeId || '')}`;
}
export function ci1EpisodeEntryConsumes(entry, mode) {
  if (!entry || entry.archived === true) return false;
  if (String(entry.mode || '') !== String(mode || '')) return false;
  const status = String(entry.status || '');
  if (status === 'rejected' || status === 'entry_ioc_unfilled') return false;
  return true;
}

export function independentCi1SignalState(concept, priorWatch={}, q={}, settings={}, now=Date.now()){
  const spec=ATTACK_CONFIRMATION_KEYS[concept];
  const envelope=hunterEntryEnvelope(settings,concept)||{};
  return crystalWallSignalState(priorWatch,q,{
    ...settings,
    recoveryMinEntryCents:envelope.minEntryCents,
    recoveryMaxEntryCents:envelope.maxEntryCents,
    crystalWallMinCrashCents:spec?settings?.[spec.crash]:0,
    crystalWallMinReboundCents:spec?settings?.[spec.rebound]:0,
    crystalWallMinUpwardTicks:spec?settings?.[spec.ticks]:0,
  },now);
}

function sealIndependentCi1FireCommand(core={}){
  const clean=structuredClone(core);delete clean.commandHash;
  return Object.freeze({...clean,commandHash:authorityHash(clean)});
}
function verifyIndependentCi1FireCommandHash(command={}){
  if(!command||typeof command!=='object'||!command.commandHash)return false;
  const clean=structuredClone(command),provided=String(clean.commandHash);delete clean.commandHash;
  return authorityHash(clean)===provided;
}

export function validateIndependentCi1FireCommand(command,{concept,q,settings,now=Date.now()}={}){
  if(!command||typeof command!=='object')return{ok:false,reason:'ci1_wall_clone_fire_required'};
  if(!verifyIndependentCi1FireCommandHash(command))return{ok:false,reason:'ci1_wall_clone_fire_hash_invalid'};
  if(String(command.version)!==String(CI1_WALL_CLONE.version)||String(command.policyRevision)!==String(CI1_WALL_CLONE.policyRevision))return{ok:false,reason:'ci1_wall_clone_fire_version_invalid'};
  if(String(command.authorityMode||'')!==String(CI1_WALL_CLONE.strategicEntryAuthority))return{ok:false,reason:'ci1_wall_clone_fire_authority_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'ci1_wall_clone_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!==String(concept||''))return{ok:false,reason:'ci1_wall_clone_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'ci1_wall_clone_fire_ticker_mismatch'};
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');
  if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'ci1_wall_clone_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'ci1_wall_clone_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'ci1_wall_clone_fire_expired'};
  const configuredStake=attackConfiguredStakeCents(settings,concept),commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(configuredStake-commandedStake)>1e-9)return{ok:false,reason:'ci1_wall_clone_fire_stake_mismatch',expectedStakeCents:configuredStake};
  const envelope=hunterEntryEnvelope(settings,concept);
  if(!envelope)return{ok:false,reason:'unknown_attack'};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'ci1_wall_clone_fire_operator_band_changed'};
  const lineage=command?.decisionEvidence?.ci1WallClone;
  if(!lineage?.authorizationId||!lineage?.crashEpisodeId)return{ok:false,reason:'ci1_wall_clone_lineage_missing'};
  const state=independentCi1SignalState(concept,lineage,q,settings,now);
  if(!state.qualified)return{ok:false,reason:`ci1_wall_clone_${state.reason}`,signal:state};
  return{ok:true,reason:'ci1_wall_clone_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,signal:state};
}

export function attackUsesAthenaX1(settings, conceptName){
  const key=ATTACK_ATHENA_X1_KEYS[conceptName];
  if(!key)return false;
  if(conceptName==='Sagittarius Justice Arrow' && settings?.[key]==null)return true;
  return settings?.[key]===true;
}

export function attackMinProfitNetPerOriginal(settings, conceptName){
  if(attackUsesAthenaX1(settings,conceptName)){
    const spec=ATTACK_CONFIRMATION_KEYS[conceptName];
    const raw=spec?Number(settings?.[spec.profit]):NaN;
    if(Number.isFinite(raw)&&raw>0)return Math.max(0.01,Math.min(99,raw));
    return Math.max(0.01,Number(ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents??2));
  }
  if(conceptName==='Scarlet Needle')return Math.max(0.01,Number(settings?.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents));
  return Math.max(0.01,Number(settings?.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents??1));
}

export function isProfitableExecutableParent(entry){
  if(!entry||!ACTIVE_PORTFOLIO_CONCEPTS.has(String(entry.conceptName||'')))return false;
  if(String(entry.status||'')!=='closed')return false;
  if(Number(entry.remainingCount||0)>1e-9)return false;
  return Number(entry.pnlCents||0)>0;
}

export function followUpConfirmationState(priorWatch={}, q={}, settings={}, now=Date.now(), conceptName='Scarlet Needle'){
  const spec=ATTACK_CONFIRMATION_KEYS[conceptName]||ATTACK_CONFIRMATION_KEYS['Scarlet Needle'];
  const minCrash=Math.max(0,Math.floor(Number(settings?.[spec.crash]??0)||0));
  const minRebound=Math.max(0,Math.floor(Number(settings?.[spec.rebound]??0)||0));
  const minUpward=Math.max(0,Math.floor(Number(settings?.[spec.ticks]??0)||0));
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0);
  const status=String(q?.status||'active').toLowerCase();
  const final=Boolean(q?.result)||['finalized','settled'].includes(status);
  const peak=Math.max(0,Number(priorWatch?.preCrashPeakCents||0));
  const priorTrough=Math.max(0,Number(priorWatch?.troughCents||0));
  const priorLast=Math.max(0,Number(priorWatch?.lastBidCents||0));
  const parentExit=Math.max(0,Number(priorWatch?.parentExitPriceCents||0));
  const base={...structuredClone(priorWatch),observedAtMs:Number(now),bidCents:bid,askCents:ask,minCrashCents:minCrash,minReboundCents:minRebound,minUpwardTicks:minUpward};
  if(final)return{...base,qualified:false,terminal:true,reason:'market_final'};
  if(!(bid>0)||!(ask>0)||bid>ask)return{...base,qualified:false,terminal:false,reason:'quote_unavailable'};
  let trough=priorTrough>0?Math.min(priorTrough,bid):(parentExit>0?Math.min(parentExit,bid):bid);
  const newLow=!(priorTrough>0)||bid<priorTrough-1e-9;
  let upwardTicks=Math.max(0,Math.floor(Number(priorWatch?.upwardTicks||0)));
  if(newLow)upwardTicks=0;
  else if(priorLast>0&&bid>priorLast+1e-9)upwardTicks+=1;
  const crashDepth=peak>0?Math.max(0,peak-trough):Math.max(0,Number(priorWatch?.crashDepthCents||0));
  const rebound=Math.max(0,bid-trough);
  const crashOk=minCrash<=0||crashDepth+1e-9>=minCrash;
  const reboundOk=minRebound<=0||rebound+1e-9>=minRebound;
  const ticksOk=minUpward<=0||upwardTicks>=minUpward;
  const geometryOff=minCrash<=0&&minRebound<=0&&minUpward<=0;
  const qualified=geometryOff||(crashOk&&reboundOk&&ticksOk);
  let reason='qualified';
  if(!crashOk)reason='crash_not_confirmed';
  else if(!reboundOk)reason='rebound_not_confirmed';
  else if(!ticksOk)reason='upticks_not_confirmed';
  return{...base,troughCents:trough,crashDepthCents:crashDepth,reboundCents:rebound,upwardTicks,qualified,terminal:false,reason:qualified?'qualified':reason};
}

function confirmationFloor(value, fallback=0){
  const n=Number(value);
  const base=Number.isFinite(n)?Math.floor(n):Math.floor(Number(fallback)||0);
  return Math.max(0,base);
}

export function attackGeometryQualified(settings, conceptName, features={}){
  const spec=ATTACK_CONFIRMATION_KEYS[conceptName];
  if(!spec)return{ok:true,reason:'no_confirmation_card'};
  const minCrash=Math.max(0,Math.floor(Number(settings?.[spec.crash]??0)||0));
  const minRebound=Math.max(0,Math.floor(Number(settings?.[spec.rebound]??0)||0));
  const minUpward=Math.max(0,Math.floor(Number(settings?.[spec.ticks]??0)||0));
  if(minCrash<=0&&minRebound<=0&&minUpward<=0)return{ok:true,reason:'geometry_off'};
  const crash=Number(features?.crashDepthCents??features?.currentCrashDepthCents??0);
  const rebound=Number(features?.reboundCents??features?.currentReboundCents??0);
  const ticks=Number(features?.upwardTicks??features?.currentUpwardTicks??0);
  if(minCrash>0&&!(crash+1e-9>=minCrash))return{ok:false,reason:'crash_not_confirmed',crashDepthCents:crash,minCrashCents:minCrash};
  if(minRebound>0&&!(rebound+1e-9>=minRebound))return{ok:false,reason:'rebound_not_confirmed',reboundCents:rebound,minReboundCents:minRebound};
  if(minUpward>0&&!(ticks>=minUpward))return{ok:false,reason:'upticks_not_confirmed',upwardTicks:ticks,minUpwardTicks:minUpward};
  return{ok:true,reason:'qualified',crashDepthCents:crash,reboundCents:rebound,upwardTicks:ticks};
}

export const MODEL_ENABLE_KEYS = Object.freeze({
  Pegasus: 'pegasusEnabled',
  Dragon: 'dragonEnabled',
  Phoenix: 'phoenixEnabled',
  'Momentum Hunter': 'momentumHunterEnabled',
  'Wave Surfer': 'waveSurferEnabled',
  'Recovery Hunter': 'recoveryHunterEnabled',
  'Crash Recovery Hunter': 'crashRecoveryHunterEnabled',
  'Scarlet Needle': 'scarletNeedleEnabled',
  'Another Dimension': 'geminiEnabled',
  'Sagittarius Justice Arrow': 'justiceArrowEnabled',
  'Athena Exclamation': 'athenaExclamationEnabled',
  'Lightning Plasma': 'lightningPlasmaEnabled',
});

const FAIL_SAFE_OFF_MODELS = new Set(['Dragon', 'Phoenix', 'Crash Recovery Hunter', 'Scarlet Needle', 'Another Dimension', 'Sagittarius Justice Arrow', 'Athena Exclamation', 'Lightning Plasma']);
export function isModelEnabled(settings, conceptName) {
  if (RETIRED_PORTFOLIO_CONCEPTS.has(conceptName) || RETIRED_FEEDER_CONCEPTS.has(conceptName)) return false;
  const key = MODEL_ENABLE_KEYS[conceptName];
  if (!key) return false;
  return FAIL_SAFE_OFF_MODELS.has(conceptName) ? settings?.[key] === true : settings?.[key] !== false;
}

// R17/GCA1 shared safety gate. A timestamp alone is never authoritative: every
// real Hunter must carry a current GCA1 confirmation proving how that lower-
// bound game clock was established. Feeders remain exempt because they create
// no exposure. Unknown, conflicting, final, legacy, or timestamp-only clocks
// fail closed here before any Hunter order/fill path can run.
export function confirmedInGameElapsedMinutes(q, now = Date.now()) {
  const eventTicker = String(q?.eventTicker || q?.ticker || '');
  if (!eventTicker || !isConfirmedGameClockState(q?.gameClockState, eventTicker)) return null;
  const start = Number(q?.gameStartTimeMs || 0);
  const authorityStart = Number(q?.gameClockState?.startTimeMs || 0);
  if (!Number.isFinite(start) || start <= 0 || start > now) return null;
  if (!Number.isFinite(authorityStart) || authorityStart <= 0 || Math.abs(authorityStart - start) > 1000) return null;
  return Math.max(0, (now - start) / 60000);
}

export function feederReferenceStake(settings, name) {
  if (name === 'Pegasus') return Number(settings.pegasusReferenceStakeCents ?? 3000);
  if (name === 'Dragon') return Number(settings.dragonReferenceStakeCents ?? 3000);
  if (name === 'Phoenix') return Number(settings.phoenixReferenceStakeCents ?? 3000);
  return 0;
}

export function feederSettings(settings, name) {
  if (name === 'Pegasus') return {
    minPriceCents: Number(settings.pegasusMinPriceCents),
    maxPriceCents: Number(settings.pegasusMaxPriceCents),
    dropCents: Number(settings.pegasusDropCents),
  };
  if (name === 'Dragon') return {
    minPriceCents: Number(settings.dragonMinSignalPriceCents ?? 84),
    maxPriceCents: Number(settings.dragonMaxSignalPriceCents ?? 88),
    dropCents: 0,
    maxEpisode: Number(settings.dragonMaxEpisode ?? 2),
    intelligence: 'CI1',
  };
  if (name === 'Phoenix') return {
    minPriceCents: Number(settings.phoenixMinPriceCents ?? PHOENIX_COSMO.defaultMinPriceCents),
    maxPriceCents: Number(settings.phoenixMaxPriceCents ?? PHOENIX_COSMO.defaultMaxPriceCents),
    dropCents: 0,
    intelligence: PHOENIX_COSMO.version,
  };
  return null;
}

export function entryConfigSnapshot(settings, conceptName, sourceFeeder = null, actualStakeCents = null, sourceEntryConfig = null, gameClockState = null, eventTicker = '') {
  const sourceFeederConfig=sourceEntryConfig?.feeder&&typeof sourceEntryConfig.feeder==='object'?sourceEntryConfig.feeder:null;
  const feeder=sourceFeederConfig||(sourceFeeder?feederSettings(settings,sourceFeeder):null);
  const attackMap={
    'Momentum Hunter':{stake:Number(settings.momentumStakeCents),min:Number(settings.momentumMinEntryCents),max:Number(settings.momentumMaxEntryCents),minCrashCents:Number(settings.momentumHunterMinCrashCents??0),minReboundCents:Number(settings.momentumHunterMinReboundCents??0),minUpwardTicks:Number(settings.momentumHunterMinUpwardTicks??0)},
    'Wave Surfer':{stake:Number(settings.waveStakeCents),min:Number(settings.waveMinEntryCents),max:Number(settings.waveMaxEntryCents),minCrashCents:Number(settings.waveSurferMinCrashCents??0),minReboundCents:Number(settings.waveSurferMinReboundCents??0),minUpwardTicks:Number(settings.waveSurferMinUpwardTicks??0)},
    'Recovery Hunter':{stake:Number(settings.recoveryStakeCents),min:Number(settings.recoveryMinEntryCents),max:Number(settings.recoveryMaxEntryCents),structuralRole:'INDEPENDENT_CRASH_REBOUND_ONLY',minCrashCents:Number(settings.crystalWallMinCrashCents??CRYSTAL_WALL.defaultMinCrashCents),minReboundCents:Number(settings.crystalWallMinReboundCents??CRYSTAL_WALL.defaultMinReboundCents),minUpwardTicks:Number(settings.crystalWallMinUpwardTicks??CRYSTAL_WALL.defaultMinUpwardTicks),fixedStakeOnly:true,stakeMultiplier:1},
    'Crash Recovery Hunter':{stake:Number(settings.crashRecoveryStakeCents),min:Number(settings.crashRecoveryMinEntryCents),max:Number(settings.crashRecoveryMaxEntryCents),minCrashCents:Number(settings.crashRecoveryHunterMinCrashCents??0),minReboundCents:Number(settings.crashRecoveryHunterMinReboundCents??0),minUpwardTicks:Number(settings.crashRecoveryHunterMinUpwardTicks??0)},
    'Scarlet Needle':{stake:Number(settings.scarletNeedleStakeCents),min:Number(settings.scarletNeedleMinEntryCents),max:Number(settings.scarletNeedleMaxEntryCents),structuralRole:'ATHENA_PATH_INITIAL_ENTRY',profitTargetNetPerOriginalContractCents:attackMinProfitNetPerOriginal(settings,'Scarlet Needle'),maxRepeats:Math.max(0,Math.min(SCARLET_NEEDLE.maximumConfigurableRepeats,Math.floor(Number(settings.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats)))),minCrashCents:Number(settings.scarletNeedleMinCrashCents??0),minReboundCents:Number(settings.scarletNeedleMinReboundCents??0),minUpwardTicks:Number(settings.scarletNeedleMinUpwardTicks??0)},
    'Sagittarius Justice Arrow':{stake:Number(settings.justiceArrowStakeCents),min:Number(settings.justiceArrowMinEntryCents),max:Number(settings.justiceArrowMaxEntryCents),structuralRole:'INDEPENDENT_CRASH_REBOUND_ATHENA_X1',minCrashCents:Number(settings.justiceArrowMinCrashCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents),minReboundCents:Number(settings.justiceArrowMinReboundCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents),minUpwardTicks:Number(settings.justiceArrowMinUpwardTicks??SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks),profitTargetNetPerOriginalContractCents:Number(settings.justiceArrowMinProfitNetPerOriginalContractCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinProfitNetPerOriginalContractCents),fixedStakeOnly:true,stakeMultiplier:1},
    'Athena Exclamation':{stake:Number(settings.athenaExclamationStakeCents),min:Number(settings.athenaExclamationMinEntryCents),max:Number(settings.athenaExclamationMaxEntryCents),structuralRole:'ATHENA_SUBORDINATE_META_EXECUTION'},
    'Lightning Plasma':{stake:Number(settings.lightningPlasmaFieldStakeCents),min:Number(settings.lightningPlasmaMinEntryCents),max:Number(settings.lightningPlasmaMaxEntryCents),structuralRole:'ATHENA_PATH_INITIAL_ENTRY',minCrashCents:Number(settings.lightningPlasmaMinCrashCents??0),minReboundCents:Number(settings.lightningPlasmaMinReboundCents??0),minUpwardTicks:Number(settings.lightningPlasmaMinUpwardTicks??0),maxRepeats:Math.max(0,Math.min(LIGHTNING_PLASMA.maximumConfigurableRepeats,Math.floor(Number(settings.lightningPlasmaMaxRepeats??LIGHTNING_PLASMA.defaultMaxRepeats))))},
  };
  const attack=attackMap[conceptName]||null;
  const scarletContinuation=conceptName==='Scarlet Needle';
  const justiceContinuation=conceptName==='Sagittarius Justice Arrow';
  const crystalWallContinuation=conceptName==='Recovery Hunter';
  const lightningPlasmaContinuation=conceptName==='Lightning Plasma';
  return {
    release:RELEASE,
    executionBuild:BUILD_INFO,
    resetTimestampMs:Number(settings.resetTimestampMs)||null,
    authorityChain:justiceContinuation?'CI1_CRASH->SAGITTARIUS_JUSTICE_ARROW->TROUGH->REBOUND->HARD_EXECUTION_SAFETY->X1_OR_INFINITY/AURORA':crystalWallContinuation?'CI1_CRASH->CRYSTAL_WALL->TROUGH->REBOUND->HARD_EXECUTION_SAFETY->X1_OR_INFINITY/AURORA':'COSMO_SHADOW->COSMO_GREEN->ATOMIC_THUNDER_BOLT->ATHENA->CONFIRMATION->ATTACK->X1_OR_INFINITY/AURORA',
    strategicEntryAuthority:justiceContinuation?SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority:crystalWallContinuation?CRYSTAL_WALL.strategicEntryAuthority:ATHENA_COMMANDER.version,
    profitAuthority:PORTFOLIO_CONCEPTS.has(conceptName)?(attackUsesAthenaX1(settings,conceptName)?ATHENA_EXIT_INTELLIGENCE.version:INFINITY_BREAK.version):null,
    profitAuthorityRevision:PORTFOLIO_CONCEPTS.has(conceptName)?(attackUsesAthenaX1(settings,conceptName)?ATHENA_EXIT_INTELLIGENCE.policyRevision:INFINITY_BREAK.policyRevision):null,
    lossAuthority:PORTFOLIO_CONCEPTS.has(conceptName)?AURORA_EXECUTION.lossAuthority:null,
    conceptName,sourceFeeder:sourceFeeder||null,modelEnabled:isModelEnabled(settings,conceptName),sourceFeederEnabled:sourceFeeder?isModelEnabled(settings,sourceFeeder):null,
    feeder:feeder?{minPriceCents:Number(feeder.minPriceCents),maxPriceCents:Number(feeder.maxPriceCents),dropCents:Number(feeder.dropCents),referenceStakeCents:Number(sourceEntryConfig?.referenceStakeCents??feederReferenceStake(settings,sourceFeeder)),maxSpreadCents:Number(sourceEntryConfig?.maxSpreadCents??settings.maxSpreadCents),...(feeder.maxEpisode==null?{}:{maxEpisode:Number(feeder.maxEpisode)}),...(feeder.intelligence==null?{}:{intelligence:String(feeder.intelligence)})}:null,
    model:attack?{stakeCents:Number(actualStakeCents??attack.stake),configuredStakeCents:Number(attack.stake),minEntryCents:Number(attack.min),maxEntryCents:Number(attack.max),...(attack.structuralRole?{structuralRole:attack.structuralRole}:{}),...(attack.minCrashCents!=null?{minCrashCents:Number(attack.minCrashCents),minReboundCents:Number(attack.minReboundCents),minUpwardTicks:Number(attack.minUpwardTicks),fixedStakeOnly:attack.fixedStakeOnly===true,stakeMultiplier:Number(attack.stakeMultiplier??1),oneEntryPerCrashEpisode:true}:{}),...(attack.maxRepeats!=null?{maxRepeats:Number(attack.maxRepeats)}:{}),...(attack.profitTargetNetPerOriginalContractCents!=null?{profitTargetNetPerOriginalContractCents:Number(attack.profitTargetNetPerOriginalContractCents)}:{}),...(attack.maxStrikes?{maxStrikes:attack.maxStrikes,fieldBudgetSharedAcrossStrikes:true,oneStrikePerEvent:true}:{}),stopProtection:'Aurora Execution',stopPolicy:AURORA_EXECUTION.version}:null,
    sharedHunterLimits:{maxPositions:Number(settings.maxPositions),maxEntriesPerTrade:Number(settings.maxEntriesPerTrade),hunterCooldownMinutes:Number(settings.hunterCooldownMinutes),minGameMinutes:Number(settings.minGameMinutes),maxGameMinutes:Number(settings.maxGameMinutes||0),maxSpreadCents:Number(settings.maxSpreadCents)},
    gameClockAuthority:authoritativeClockSnapshot(gameClockState,eventTicker),stakeCents:Number(actualStakeCents??0),simFillProbability:Number(settings.simFillProbability),simFeeCents:Number(settings.simFeeCents),
  };
}

export function cosmoSourceSignalPriceCents(entry) {
  if (!entry || !ACTIVE_FEEDER_CONCEPTS.has(entry.conceptName)) return 0;
  if (entry.conceptName === 'Dragon') return Number(entry.entryConfig?.dragonSource?.signalPriceCents || 0) || 0;
  if (entry.conceptName === 'Phoenix') return Number(entry.entryConfig?.phoenixSource?.signalAskCents || entry.entryPriceCents || 0) || 0;
  return Number(entry.entryPriceCents || 0) || 0;
}

export function lightningPlasmaSourceObservedAtMs(entry) {
  if (!entry || !ACTIVE_FEEDER_CONCEPTS.has(entry.conceptName)) return 0;
  if (entry.conceptName === 'Dragon') {
    return Number(entry.entryConfig?.dragonSource?.signalAtMs || entry.openedAtMs || 0) || 0;
  }
  if (entry.conceptName === 'Phoenix') {
    return Number(entry.entryConfig?.phoenixSource?.signalAtMs || entry.openedAtMs || 0) || 0;
  }
  return Number(entry.openedAtMs || 0) || 0;
}

export function lightningPlasmaSourceAnchorCents(entry) {
  if (!entry || !ACTIVE_FEEDER_CONCEPTS.has(entry.conceptName)) return 0;
  if (entry.conceptName === 'Dragon') {
    return Number(entry.entryConfig?.dragonSource?.signalPriceCents || 0) || 0;
  }
  if (entry.conceptName === 'Phoenix') {
    return Number(entry.entryConfig?.phoenixSource?.signalAskCents || entry.entryPriceCents || 0) || 0;
  }
  return Number(entry.entryPriceCents || 0) || 0;
}

export function lightningPlasmaStrikeQualification(source, quote, settings, now = Date.now()) {
  const observedAtMs = lightningPlasmaSourceObservedAtMs(source);
  const anchorCents = lightningPlasmaSourceAnchorCents(source);
  const bid = Number(quote?.yesBid || 0);
  const ask = Number(quote?.yesAsk || 0);
  const minEntryCents = Number(settings?.lightningPlasmaMinEntryCents ?? LIGHTNING_PLASMA.minEntryCents);
  const maxEntryCents = Number(settings?.lightningPlasmaMaxEntryCents ?? LIGHTNING_PLASMA.maxEntryCents);
  const maxSpreadCents = Number(settings?.lightningPlasmaMaxSpreadCents ?? LIGHTNING_PLASMA.maxSpreadCents);
  const maxFadeCents = Math.max(0, Number(settings?.lightningPlasmaMaxSourceFadeCents ?? LIGHTNING_PLASMA.maxSourceFadeCents));
  const maxChaseCents = Math.max(0, Number(settings?.lightningPlasmaMaxChaseCents ?? LIGHTNING_PLASMA.maxChaseCents));
  const windowMs = Math.max(1000, Number(settings?.lightningPlasmaFieldWindowSeconds ?? LIGHTNING_PLASMA.fieldWindowMs / 1000) * 1000);
  const ageMs = Math.max(0, Number(now) - observedAtMs);
  const base = { observedAtMs, anchorCents, bidCents:bid, askCents:ask, ageMs, minEntryCents, maxEntryCents, maxSpreadCents, maxFadeCents, maxChaseCents };
  if (!source || !ACTIVE_FEEDER_CONCEPTS.has(source.conceptName) || !openLike(source.status)) return { ...base, ok:false, reason:'inactive_cosmo_source' };
  if (!(observedAtMs > 0) || ageMs > windowMs) return { ...base, ok:false, reason:'cosmo_source_stale' };
  if (!(anchorCents > 0)) return { ...base, ok:false, reason:'cosmo_anchor_missing' };
  if (!(bid > 0) || !(ask > 0) || bid > ask) return { ...base, ok:false, reason:'invalid_quote' };
  if (ask < minEntryCents || ask > maxEntryCents) return { ...base, ok:false, reason:'entry_band' };
  const spreadCents = ask - bid;
  if (spreadCents > maxSpreadCents) return { ...base, ok:false, reason:'spread', spreadCents };
  const fadeCents = Math.max(0, anchorCents - bid);
  if (fadeCents > maxFadeCents) return { ...base, ok:false, reason:'source_faded', fadeCents };
  const chaseCents = Math.max(0, ask - anchorCents);
  if (chaseCents > maxChaseCents) return { ...base, ok:false, reason:'source_overextended', chaseCents };
  const continuationCents = bid - anchorCents;
  // High score means fresh, narrow and still confirming the source. This score
  // only ranks independently eligible strikes; it never grants entry authority.
  const score = 100
    + Math.max(-10, Math.min(20, continuationCents * 4))
    + Math.max(0, (maxSpreadCents - spreadCents) * 4)
    - Math.min(25, ageMs / Math.max(1, windowMs) * 25)
    - Math.max(0, chaseCents - 1) * 3;
  return { ...base, ok:true, reason:'qualified', spreadCents, fadeCents, chaseCents, continuationCents, score };
}

export function lightningPlasmaFieldId(sources = []) {
  const identity = (sources || []).map((x) => `${String(x.id || '')}:${lightningPlasmaSourceObservedAtMs(x)}`).sort().join('|');
  if (!identity) return null;
  return `LP1-${createHash('sha256').update(identity).digest('hex').slice(0, 16)}`;
}

export function lightningPlasmaFieldSelection(entries, marketMap, settings, now = Date.now()) {
  const windowMs = Math.max(1000, Number(settings?.lightningPlasmaFieldWindowSeconds ?? LIGHTNING_PLASMA.fieldWindowMs / 1000) * 1000);
  const minCosmos = Math.max(2, Math.floor(Number(settings?.lightningPlasmaMinCosmos ?? LIGHTNING_PLASMA.minCosmos)));
  const minStrikes = Math.max(2, Math.floor(Number(settings?.lightningPlasmaMinStrikes ?? LIGHTNING_PLASMA.minStrikes)));
  const maxStrikes = Math.max(minStrikes, Math.floor(Number(settings?.lightningPlasmaMaxStrikes ?? LIGHTNING_PLASMA.maxStrikes)));
  const eligibleSources = activeCosmoSources(entries, settings)
    .filter((e) => {
      const observed = lightningPlasmaSourceObservedAtMs(e);
      return observed > 0 && Number(now) - observed <= windowMs;
    });
  // One source per event prevents a Plasma field from concentrating multiple
  // mutually related outcomes from the same event. Choose the strongest fresh
  // strike candidate deterministically inside each event.
  const byEvent = new Map();
  for (const source of eligibleSources) {
    const quote = marketMap?.get?.(source.ticker);
    if (!quote) continue;
    const qualification = lightningPlasmaStrikeQualification(source, quote, settings, now);
    if (!qualification.ok) continue;
    const eventTicker = String(source.eventTicker || quote.eventTicker || source.ticker || '');
    if (!eventTicker) continue;
    const row = { source, quote, qualification, eventTicker };
    const prior = byEvent.get(eventTicker);
    if (!prior
        || Number(row.qualification.score) > Number(prior.qualification.score)
        || (Number(row.qualification.score) === Number(prior.qualification.score) && lightningPlasmaSourceObservedAtMs(source) > lightningPlasmaSourceObservedAtMs(prior.source))
        || (Number(row.qualification.score) === Number(prior.qualification.score) && lightningPlasmaSourceObservedAtMs(source) === lightningPlasmaSourceObservedAtMs(prior.source) && String(source.id || '').localeCompare(String(prior.source.id || '')) < 0)) {
      byEvent.set(eventTicker, row);
    }
  }
  const candidates = [...byEvent.values()].sort((a,b) =>
    Number(b.qualification.score) - Number(a.qualification.score)
    || lightningPlasmaSourceObservedAtMs(b.source) - lightningPlasmaSourceObservedAtMs(a.source)
    || String(a.source.ticker || '').localeCompare(String(b.source.ticker || ''))
  );
  return {
    version: LIGHTNING_PLASMA.version,
    // A Plasma identity is defined only by independently qualified strikes.
    // Unqualified/stale Cosmos must not churn the field identity or cooldown.
    fieldId: lightningPlasmaFieldId(candidates.map((x)=>x.source)),
    sourceCount: eligibleSources.length,
    independentEventCount: candidates.length,
    minCosmos,
    minStrikes,
    maxStrikes,
    qualifies: candidates.length >= minCosmos && candidates.length >= minStrikes,
    candidates: candidates.slice(0, maxStrikes),
  };
}


const ATHENA_R2_FEEDER_CONTEXT_LIMIT = 4096;
function athenaR2FeederSignal(entry){
  if(String(entry?.conceptName||'')==='Dragon')return Number(entry?.entryConfig?.dragonSource?.signalPriceCents||0)||0;
  return 0;
}
function athenaR2Latest(rows=[]){return rows.length?rows[rows.length-1]:null;}
function athenaR2SequenceFeatures(rows=[],prefix=''){
  const xs=[...rows].sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0));const out={};out[`${prefix}Count`]=xs.length;
  if(!xs.length)return out;
  const last=xs[xs.length-1],prev=xs.length>1?xs[xs.length-2]:null,first=xs[0];
  const interval=prev?(Number(last.openedAtMs)-Number(prev.openedAtMs))/1000:null;
  const span=xs.length>1?(Number(last.openedAtMs)-Number(first.openedAtMs))/1000:0;
  const lastRef=Number(last.entryPriceCents||0),prevRef=prev?Number(prev.entryPriceCents||0):null,firstRef=Number(first.entryPriceCents||0);
  const lastSignal=athenaR2FeederSignal(last),prevSignal=prev?athenaR2FeederSignal(prev):null,firstSignal=athenaR2FeederSignal(first);
  Object.assign(out,{
    [`${prefix}LastRef`]:lastRef,[`${prefix}PrevRef`]:prevRef,[`${prefix}FirstRef`]:firstRef,
    [`${prefix}RefDelta1`]:prev?lastRef-prevRef:0,[`${prefix}RefDeltaTotal`]:lastRef-firstRef,[`${prefix}RefRate1`]:prev&&interval>0?(lastRef-prevRef)/(interval/60):0,
    [`${prefix}LastSignal`]:lastSignal,[`${prefix}PrevSignal`]:prevSignal,[`${prefix}FirstSignal`]:firstSignal,
    [`${prefix}SignalDelta1`]:prev?lastSignal-prevSignal:0,[`${prefix}SignalDeltaTotal`]:lastSignal-firstSignal,[`${prefix}SignalRate1`]:prev&&interval>0?(lastSignal-prevSignal)/(interval/60):0,
    [`${prefix}Interval1Sec`]:interval,[`${prefix}SpanSec`]:span,
  });
  return out;
}
function athenaR2ModelSettings(settings={},concept=''){
  const out={
    minGameMinutesSetting:Number(settings.minGameMinutes??0),maxGameMinutesSetting:Number(settings.maxGameMinutes??0),
    atomicThunderTarget:Number(settings.atomicThunderMinNetPerOriginalContractCents??1),maxPositionsSetting:Number(settings.maxPositions??0),
    pegasusDrop:Number(settings.pegasusDropCents??0),dragonMaxEpisode:Number(settings.dragonMaxEpisode??0),
    modelMinEntry:null,modelMaxEntry:null,modelMaxSpread:null,modelRise:null,modelMinPullback:null,modelMaxPullback:null,modelFavorable:null,
    modelCrash:null,modelRebound:null,modelReclaim:null,modelStable:null,modelUpTicks:null,modelFieldWindow:null,modelMinCosmos:null,modelMinStrikes:null,modelMaxStrikes:null,modelChase:null,modelFade:null,
  };
  if(concept==='Wave Surfer')Object.assign(out,{modelMinEntry:Number(settings.waveMinEntryCents),modelMaxEntry:Number(settings.waveMaxEntryCents),modelMaxSpread:Number(settings.waveMaxSpreadCents),modelFavorable:Number(settings.waveMinFeederFavorableMoveCents)});
  else if(concept==='Momentum Hunter')Object.assign(out,{modelMinEntry:Number(settings.momentumMinEntryCents),modelMaxEntry:Number(settings.momentumMaxEntryCents),modelMaxSpread:Number(settings.momentumMaxSpreadCents),modelRise:Number(settings.momentumMinRiseCents),modelMinPullback:Number(settings.momentumMinPullbackCents),modelMaxPullback:Number(settings.momentumMaxPullbackCents)});
  else if(concept==='Crash Recovery Hunter')Object.assign(out,{modelMinEntry:Number(settings.crashRecoveryMinEntryCents),modelMaxEntry:Number(settings.crashRecoveryMaxEntryCents),modelMaxSpread:Number(settings.crashRecoveryMaxSpreadCents),modelCrash:Number(settings.crashRecoveryMinCrashCents),modelRebound:Number(settings.crashRecoveryMinReboundCents),modelReclaim:Number(settings.crashRecoveryMinReclaimRate),modelStable:Number(settings.crashRecoveryStableObservations),modelUpTicks:Number(settings.crashRecoveryUpwardTicks)});
  else if(concept==='Recovery Hunter')Object.assign(out,{modelMinEntry:Number(settings.recoveryMinEntryCents),modelMaxEntry:Number(settings.recoveryMaxEntryCents),modelRebound:Number(settings.recoveryMinReboundCents)});
  else if(concept==='Lightning Plasma')Object.assign(out,{modelMinEntry:Number(settings.lightningPlasmaMinEntryCents),modelMaxEntry:Number(settings.lightningPlasmaMaxEntryCents),modelMaxSpread:Number(settings.lightningPlasmaMaxSpreadCents),modelFieldWindow:Number(settings.lightningPlasmaFieldWindowSeconds),modelMinCosmos:Number(settings.lightningPlasmaMinCosmos),modelMinStrikes:Number(settings.lightningPlasmaMinStrikes),modelMaxStrikes:Number(settings.lightningPlasmaMaxStrikes),modelChase:Number(settings.lightningPlasmaMaxChaseCents),modelFade:Number(settings.lightningPlasmaMaxSourceFadeCents)});
  return out;
}

function scarletContinuationEconomicTarget({askCents=0,stakeCents=0,settings={}}={}) {
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const target=Math.max(0.01,Number(settings.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents));
  const count=Math.max(1,Math.floor(stake/ask));
  let entryFeePerContract=0,exitFeePerContract=0,targetBid=ask+target;
  if(String(settings.mode||'SIMULATION').toUpperCase()==='LIVE'){
    entryFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask})/count;
    for(let i=0;i<3;i+=1){
      const px=Math.max(1,Math.min(99,Math.ceil(targetBid)));
      exitFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:px})/count;
      targetBid=ask+target+entryFeePerContract+exitFeePerContract;
    }
  }else{
    entryFeePerContract=Math.max(0,Number(settings.simFeeCents||0));
    exitFeePerContract=entryFeePerContract;
    targetBid=ask+target+entryFeePerContract+exitFeePerContract;
  }
  const requiredTargetBidCents=Math.ceil(targetBid-1e-9);
  return {version:'SCARLET-CONTINUATION-ECONOMIC-TARGET-V1',authorityMode:SCARLET_NEEDLE.strategicEntryAuthority,netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:Number(entryFeePerContract.toFixed(6)),estimatedExitFeePerContractCents:Number(exitFeePerContract.toFixed(6)),targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
}

export function anotherDimensionQualification(source,q,settings,{sourcePeakCents=null}={}){
  const s=settings||{};
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0);
  const base={version:ANOTHER_DIMENSION.version,policyRevision:ANOTHER_DIMENSION.policyRevision,bidCents:bid,askCents:ask};
  if(s.geminiEnabled!==true)return{...base,ok:false,reason:'gemini_disabled'};
  if(!source||!ACTIVE_FEEDER_CONCEPTS.has(String(source.conceptName||''))||!openLike(source.status))return{...base,ok:false,reason:'inactive_cosmo_source'};
  if(String(source.ticker||'')!==String(q?.ticker||''))return{...base,ok:false,reason:'ticker_mismatch'};
  const status=String(q?.status||'active').toLowerCase();
  if(status!=='active'||Boolean(q?.result))return{...base,ok:false,reason:'market_not_active'};
  if(!(bid>0)||!(ask>0)||bid>ask)return{...base,ok:false,reason:'invalid_quote'};
  const minEntry=Number(s.geminiMinPriceCents),maxEntry=Number(s.geminiMaxPriceCents),maxSpread=Number(s.maxSpreadCents??MOMENTUM.maxSpreadCents);
  if(ask<minEntry||ask>maxEntry)return{...base,ok:false,reason:'entry_band',minEntryCents:minEntry,maxEntryCents:maxEntry};
  const spread=ask-bid;
  if(spread>maxSpread)return{...base,ok:false,reason:'spread',spreadCents:spread,maxSpreadCents:maxSpread};
  const sourceEntry=Number(source.entryPriceCents||0);
  if(!(sourceEntry>0))return{...base,ok:false,reason:'source_entry_missing'};
  const peak=Math.max(sourceEntry,bid,Number(source.peakPriceCents||0),Number(sourcePeakCents||0));
  const rise=peak-sourceEntry,pullback=peak-bid;
  const minRise=Number(s.momentumMinRiseCents??MOMENTUM.minRiseCents);
  const minPullback=Number(s.momentumMinPullbackCents??MOMENTUM.minPullbackCents);
  const maxPullback=Number(s.momentumMaxPullbackCents??MOMENTUM.maxPullbackCents);
  if(rise+1e-9<minRise)return{...base,ok:false,reason:'momentum_rise',sourceEntryCents:sourceEntry,sourcePeakCents:peak,riseCents:rise,minRiseCents:minRise};
  if(pullback+1e-9<minPullback||pullback-1e-9>maxPullback)return{...base,ok:false,reason:'momentum_pullback',sourceEntryCents:sourceEntry,sourcePeakCents:peak,riseCents:rise,pullbackCents:pullback,minPullbackCents:minPullback,maxPullbackCents:maxPullback};
  return{...base,ok:true,reason:'qualified',sourceEntryCents:sourceEntry,sourcePeakCents:peak,riseCents:rise,pullbackCents:pullback,minRiseCents:minRise,minPullbackCents:minPullback,maxPullbackCents:maxPullback,minEntryCents:minEntry,maxEntryCents:maxEntry,spreadCents:spread,maxSpreadCents:maxSpread};
}

function justiceArrowEconomicTarget({askCents=0,stakeCents=0,settings={}}={}){
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const target=Math.max(0.01,Number(settings.justiceArrowMinProfitNetPerOriginalContractCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinProfitNetPerOriginalContractCents??ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents));
  const count=Math.max(1,Math.floor(stake/ask));
  let entryFeePerContract=0,exitFeePerContract=0,targetBid=ask+target;
  if(String(settings.mode||'SIMULATION').toUpperCase()==='LIVE'){
    entryFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask})/count;
    for(let i=0;i<3;i+=1){
      const px=Math.max(1,Math.min(99,Math.ceil(targetBid)));
      exitFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:px})/count;
      targetBid=ask+target+entryFeePerContract+exitFeePerContract;
    }
  }else{
    entryFeePerContract=Math.max(0,Number(settings.simFeeCents||0));
    exitFeePerContract=entryFeePerContract;
    targetBid=ask+target+entryFeePerContract+exitFeePerContract;
  }
  const requiredTargetBidCents=Math.ceil(targetBid-1e-9);
  return{version:'JUSTICE-ARROW-ATHENA-X1-ECONOMIC-TARGET-V1',authorityMode:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:Number(entryFeePerContract.toFixed(6)),estimatedExitFeePerContractCents:Number(exitFeePerContract.toFixed(6)),targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
}

function lightningPlasmaContinuationEconomicTarget({askCents=0,stakeCents=0,settings={}}={}) {
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const target=Math.max(0.01,Number(settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents));
  const count=Math.max(1,Math.floor(stake/ask));
  let entryFeePerContract=0,exitFeePerContract=0,targetBid=ask+target;
  if(String(settings.mode||'SIMULATION').toUpperCase()==='LIVE'){
    entryFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask})/count;
    for(let i=0;i<3;i+=1){
      const px=Math.max(1,Math.min(99,Math.ceil(targetBid)));
      exitFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:px})/count;
      targetBid=ask+target+entryFeePerContract+exitFeePerContract;
    }
  }else{
    entryFeePerContract=Math.max(0,Number(settings.simFeeCents||0));
    exitFeePerContract=entryFeePerContract;
    targetBid=ask+target+entryFeePerContract+exitFeePerContract;
  }
  const requiredTargetBidCents=Math.ceil(targetBid-1e-9);
  return{version:'LIGHTNING-PLASMA-CONTINUATION-ECONOMIC-TARGET-V1',authorityMode:LIGHTNING_PLASMA.strategicEntryAuthority,netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:Number(entryFeePerContract.toFixed(6)),estimatedExitFeePerContractCents:Number(exitFeePerContract.toFixed(6)),targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
}

export function crystalWallSignalState(priorWatch={}, q={}, settings={}, now=Date.now()) {
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0);
  const status=String(q?.status||'active').toLowerCase();
  const final=Boolean(q?.result)||FINAL_MARKET_STATUSES.has(status);
  const minCrash=confirmationFloor(settings?.crystalWallMinCrashCents, CRYSTAL_WALL.defaultMinCrashCents);
  const minRebound=confirmationFloor(settings?.crystalWallMinReboundCents, CRYSTAL_WALL.defaultMinReboundCents);
  const minUpward=confirmationFloor(settings?.crystalWallMinUpwardTicks, CRYSTAL_WALL.defaultMinUpwardTicks);
  const minEntry=Number(settings?.recoveryMinEntryCents??CRYSTAL_WALL.defaultMinEntryCents);
  const maxEntry=Number(settings?.recoveryMaxEntryCents??CRYSTAL_WALL.defaultMaxEntryCents);
  const maxSpread=Math.max(0,Number(settings?.maxSpreadCents??3));
  const peak=Math.max(0,Number(priorWatch?.preCrashPeakCents||0));
  const priorTrough=Math.max(0,Number(priorWatch?.troughCents||0));
  const priorLast=Math.max(0,Number(priorWatch?.lastBidCents||0));
  const base={...structuredClone(priorWatch),observedAtMs:Number(now),bidCents:bid,askCents:ask,minCrashCents:minCrash,minReboundCents:minRebound,minUpwardTicks:minUpward,minEntryCents:minEntry,maxEntryCents:maxEntry,maxSpreadCents:maxSpread};
  if(final)return{...base,qualified:false,terminal:true,reason:'market_final'};
  if(!(bid>0)||!(ask>0)||bid>ask)return{...base,qualified:false,terminal:false,reason:'quote_unavailable'};
  let trough=priorTrough>0?Math.min(priorTrough,bid):bid;
  const newLow=!(priorTrough>0)||bid<priorTrough-1e-9;
  let upwardTicks=Math.max(0,Math.floor(Number(priorWatch?.upwardTicks||0)));
  if(newLow)upwardTicks=0;
  else if(priorLast>0&&bid>priorLast+1e-9)upwardTicks+=1;
  else if(priorLast>0&&bid<priorLast-1e-9)upwardTicks=0;
  const crashDepth=Math.max(Number(priorWatch?.crashDepthCents||0),peak>0?Math.max(0,peak-trough):0);
  const rebound=Math.max(0,bid-trough);
  const spread=ask-bid;
  let reason='qualified';
  if(minCrash>0&&crashDepth+1e-9<minCrash)reason='crash_depth';
  else if(minRebound>0&&rebound+1e-9<minRebound)reason=newLow?'tracking_new_low':'rebound_not_confirmed';
  else if(minUpward>0&&upwardTicks<minUpward)reason='upward_ticks_not_confirmed';
  else if(ask<minEntry||ask>maxEntry)reason='outside_entry_band';
  else if(spread>maxSpread+1e-9)reason='spread';
  return{...base,qualified:reason==='qualified',terminal:false,reason,newLow,troughCents:trough,troughAtMs:newLow?Number(now):Number(priorWatch?.troughAtMs||now),crashDepthCents:crashDepth,reboundCents:rebound,upwardTicks,lastBidCents:bid,spreadCents:spread};
}

function crystalWallEconomicTarget({askCents=0,stakeCents=0,settings={}}={}) {
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const target=Math.max(0.01,Number(settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents));
  const count=Math.max(1,Math.floor(stake/ask));
  let entryFeePerContract=0,exitFeePerContract=0,targetBid=ask+target;
  if(String(settings.mode||'SIMULATION').toUpperCase()==='LIVE'){
    entryFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask})/count;
    for(let i=0;i<3;i+=1){
      const px=Math.max(1,Math.min(99,Math.ceil(targetBid)));
      exitFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:px})/count;
      targetBid=ask+target+entryFeePerContract+exitFeePerContract;
    }
  }else{
    entryFeePerContract=Math.max(0,Number(settings.simFeeCents||0));
    exitFeePerContract=entryFeePerContract;
    targetBid=ask+target+entryFeePerContract+exitFeePerContract;
  }
  const requiredTargetBidCents=Math.ceil(targetBid-1e-9);
  return{version:'CRYSTAL-WALL-V3-ECONOMIC-TARGET-V1',authorityMode:CRYSTAL_WALL.strategicEntryAuthority,netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:Number(entryFeePerContract.toFixed(6)),estimatedExitFeePerContractCents:Number(exitFeePerContract.toFixed(6)),targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
}

function sealCrystalWallFireCommand(core={}){
  const clean=structuredClone(core);delete clean.commandHash;
  return Object.freeze({...clean,commandHash:authorityHash(clean)});
}
function verifyCrystalWallFireCommandHash(command={}){
  if(!command||typeof command!=='object'||!command.commandHash)return false;
  const clean=structuredClone(command),provided=String(clean.commandHash);delete clean.commandHash;
  return authorityHash(clean)===provided;
}

export function validateCrystalWallFireCommand(command,{q,settings,now=Date.now()}={}){
  if(!command||typeof command!=='object')return{ok:false,reason:'crystal_wall_fire_required'};
  if(!verifyCrystalWallFireCommandHash(command))return{ok:false,reason:'crystal_wall_fire_hash_invalid'};
  if(String(command.version)!==String(CRYSTAL_WALL.version)||String(command.policyRevision)!==String(CRYSTAL_WALL.policyRevision))return{ok:false,reason:'crystal_wall_fire_version_invalid'};
  if(String(command.authorityMode||'')!==String(CRYSTAL_WALL.strategicEntryAuthority))return{ok:false,reason:'crystal_wall_fire_authority_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'crystal_wall_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!=='Recovery Hunter')return{ok:false,reason:'crystal_wall_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'crystal_wall_fire_ticker_mismatch'};
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');
  if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'crystal_wall_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'crystal_wall_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'crystal_wall_fire_expired'};
  const configuredStake=Number(settings?.recoveryStakeCents||0),commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(configuredStake-commandedStake)>1e-9)return{ok:false,reason:'crystal_wall_fire_stake_mismatch',expectedStakeCents:configuredStake};
  const envelope=hunterEntryEnvelope(settings,'Recovery Hunter');
  if(!envelope)return{ok:false,reason:'unknown_attack'};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'crystal_wall_fire_operator_band_changed'};
  const lineage=command?.decisionEvidence?.crystalWall;
  if(!lineage?.authorizationId||!lineage?.crashEpisodeId)return{ok:false,reason:'crystal_wall_lineage_missing'};
  const state=crystalWallSignalState(lineage,q,settings,now);
  if(!state.qualified)return{ok:false,reason:`crystal_wall_${state.reason}`,signal:state};
  const target=Number(command?.economicTarget?.netPerOriginalContractCents),configuredTarget=Number(settings?.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);
  if(!(target>0)||!Number.isFinite(target))return{ok:false,reason:'crystal_wall_economic_target_missing'};
  if(Math.abs(target-configuredTarget)>1e-9)return{ok:false,reason:'crystal_wall_economic_target_changed',commandedTargetNetPerOriginalContractCents:target,configuredTargetNetPerOriginalContractCents:configuredTarget};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'crystal_wall_economic_target_unreachable'};
  return{ok:true,reason:'crystal_wall_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,economicTargetNetPerOriginalContractCents:target,signal:state};
}

export function justiceArrowSignalState(priorWatch={},q={},settings={},now=Date.now()){
  // SJA2 deliberately reuses the exact Crystal Wall V3 crash/trough/rebound
  // state machine. Only the operator-owned parameter namespace and post-fill
  // profit authority differ, which keeps entry comparisons scientifically clean.
  return crystalWallSignalState(priorWatch,q,{
    ...settings,
    recoveryMinEntryCents:settings?.justiceArrowMinEntryCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinEntryCents,
    recoveryMaxEntryCents:settings?.justiceArrowMaxEntryCents??SAGITTARIUS_JUSTICE_ARROW.defaultMaxEntryCents,
    crystalWallMinCrashCents:settings?.justiceArrowMinCrashCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents,
    crystalWallMinReboundCents:settings?.justiceArrowMinReboundCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents,
    crystalWallMinUpwardTicks:settings?.justiceArrowMinUpwardTicks??SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks,
  },now);
}

function sealJusticeArrowFireCommand(core={}){
  const clean=structuredClone(core);delete clean.commandHash;
  return Object.freeze({...clean,commandHash:authorityHash(clean)});
}
function verifyJusticeArrowFireCommandHash(command={}){
  if(!command||typeof command!=='object'||!command.commandHash)return false;
  const clean=structuredClone(command),provided=String(clean.commandHash);delete clean.commandHash;
  return authorityHash(clean)===provided;
}

export function validateJusticeArrowFireCommand(command,{q,settings,now=Date.now()}={}){
  if(!command||typeof command!=='object')return{ok:false,reason:'justice_arrow_v2_fire_required'};
  if(!verifyJusticeArrowFireCommandHash(command))return{ok:false,reason:'justice_arrow_v2_fire_hash_invalid'};
  if(String(command.version)!==String(SAGITTARIUS_JUSTICE_ARROW.version)||String(command.policyRevision)!==String(SAGITTARIUS_JUSTICE_ARROW.policyRevision))return{ok:false,reason:'justice_arrow_v2_fire_version_invalid'};
  if(String(command.authorityMode||'')!==String(SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority))return{ok:false,reason:'justice_arrow_v2_fire_authority_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'justice_arrow_v2_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!=='Sagittarius Justice Arrow')return{ok:false,reason:'justice_arrow_v2_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'justice_arrow_v2_fire_ticker_mismatch'};
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');
  if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'justice_arrow_v2_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'justice_arrow_v2_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'justice_arrow_v2_fire_expired'};
  const configuredStake=Number(settings?.justiceArrowStakeCents||0),commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(configuredStake-commandedStake)>1e-9)return{ok:false,reason:'justice_arrow_v2_fire_stake_mismatch',expectedStakeCents:configuredStake};
  const envelope=hunterEntryEnvelope(settings,'Sagittarius Justice Arrow');
  if(!envelope)return{ok:false,reason:'unknown_attack'};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'justice_arrow_v2_fire_operator_band_changed'};
  const lineage=command?.decisionEvidence?.justiceArrow;
  if(!lineage?.authorizationId||!lineage?.crashEpisodeId)return{ok:false,reason:'justice_arrow_v2_lineage_missing'};
  const state=justiceArrowSignalState(lineage,q,settings,now);
  if(!state.qualified)return{ok:false,reason:`justice_arrow_v2_${state.reason}`,signal:state};
  const justiceUsesX1=attackUsesAthenaX1(settings,'Sagittarius Justice Arrow');
  const expectedProfit=justiceUsesX1?ATHENA_EXIT_INTELLIGENCE.version:INFINITY_BREAK.version;
  if(String(command?.profitAuthority||'')!==String(expectedProfit))return{ok:false,reason:'justice_arrow_v2_profit_authority_invalid'};
  if(justiceUsesX1&&command?.infinityBreakPolicyVersion!=null)return{ok:false,reason:'justice_arrow_v2_profit_authority_invalid'};
  const target=Number(command?.economicTarget?.netPerOriginalContractCents),configuredTarget=attackMinProfitNetPerOriginal(settings,'Sagittarius Justice Arrow');
  if(!(target>0)||!Number.isFinite(target))return{ok:false,reason:'justice_arrow_v2_economic_target_missing'};
  if(Math.abs(target-configuredTarget)>1e-9)return{ok:false,reason:'justice_arrow_v2_economic_target_changed',commandedTargetNetPerOriginalContractCents:target,configuredTargetNetPerOriginalContractCents:configuredTarget};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'justice_arrow_v2_economic_target_unreachable'};
  return{ok:true,reason:'justice_arrow_v2_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,economicTargetNetPerOriginalContractCents:target,signal:state};
}


export class StrategyEngine {
  constructor({ db, kalshi, market, learning, getCurrentCrashWatch = null, getCurrentStarlightWatch = null, registerObservationWatch = null, athena = null, getSettings, getLiveReady, refreshGameClock = null, onHunterOpened = null, onFeederOpened = null, onShadowAttackOpened = null, onShadowAttackClosed = null, onEntryPipeline = null, captureSimulationMutationToken = null, enterSimulationMutation = null, random = Math.random }) {
    this.db = db;
    this.kalshi = kalshi;
    this.market = market;
    this.learning = learning;
    this.getCurrentCrashWatch = typeof getCurrentCrashWatch==='function'?getCurrentCrashWatch:null;
    this.getCurrentStarlightWatch = typeof getCurrentStarlightWatch==='function'?getCurrentStarlightWatch:null;
    this.registerObservationWatch = typeof registerObservationWatch==='function'?registerObservationWatch:null;
    this.athena = athena;
    this.getSettings = getSettings;
    this.getLiveReady = getLiveReady;
    this.refreshGameClock = typeof refreshGameClock === 'function' ? refreshGameClock : null;
    this.onHunterOpened = typeof onHunterOpened === 'function' ? onHunterOpened : null;
    this.onFeederOpened = typeof onFeederOpened === 'function' ? onFeederOpened : null;
    this.onShadowAttackOpened = typeof onShadowAttackOpened === 'function' ? onShadowAttackOpened : null;
    this.onShadowAttackClosed = typeof onShadowAttackClosed === 'function' ? onShadowAttackClosed : null;
    this.onEntryPipeline = typeof onEntryPipeline === 'function' ? onEntryPipeline : null;
    this.captureSimulationMutationToken = typeof captureSimulationMutationToken === 'function' ? captureSimulationMutationToken : null;
    this.enterSimulationMutation = typeof enterSimulationMutation === 'function' ? enterSimulationMutation : null;
    this.random = random;
    // R13 process-local mutex: the engine is single-process/single-scanner, but
    // this also prevents accidental concurrent createHunter calls from racing
    // each other on the same exact market ticker.
    this.hunterTickerLocks = new Set();
    // R45 Galactic Explosion keeps different Attacks eligible on one ticker,
    // but their final capital/event-cap/persistence commit must still serialize
    // on that exact ticker. This coordinator is intentionally separate from
    // the exposure lock: it prevents a concurrent cross-Attack race without
    // restoring the old one-Hunter-per-ticker prohibition.
    this.hunterEntryCommitLocks = new Set();
    // R20/RH1 keeps post-stop trough memory hot between five-minute full scans
    // and rate-limits candidate telemetry to state transitions. Persisted
    // recovery observations remain the restart-safe source of truth.
    this.recoveryRuntimeTroughs = new Map();
    this.recoveryAuditStates = new Map();
    // R35/EPT1: bounded in-memory entry-pipeline telemetry. This is diagnostic
    // only and has zero execution authority. It records exactly which safety
    // boundary accepted or rejected each real-Hunter attempt so a future audit
    // does not have to infer the choke point from scattered log events.
    this.entryPipelineAttemptSequence = 0;
    this.entryPipelineEvents = [];
    // LIVE infrastructure guard only: suppress repeated submission of the same
    // exact Athena FIRE after a definitive broker rejection. A new Bolt/FIRE
    // is a new opportunity and is never blocked by this cache.
    this.liveBrokerHardRejects = new Map();
    this.lightningPlasmaTelemetry = { fieldsObserved:0, fieldsQualified:0, fieldsCooldownBlocked:0, strikeAttempts:0, strikesOpened:0, lastFieldId:null, lastFieldAtMs:0 };
    this.phoenixSignalLocks = new Set();
    this.athenaR2FeederHistory = [];
    this.athenaR2ContextReady = typeof this.db?.entries !== 'function';
    this.athenaExclamation = new AthenaExclamationEngine({ db:this.db, getSettings:()=>this.getSettings(), audit:(event,data)=>this.audit(event,data) });
  }

  recordAthenaR2FeederContext(entry){
    if(!entry||!['Pegasus','Dragon'].includes(String(entry.conceptName||''))||!entry.ticker)return;
    const conceptName=String(entry.conceptName||''),signalPriceCents=conceptName==='Dragon'?athenaR2FeederSignal(entry):0;
    // R50/RGM2: retain only the causal fields consumed by the Guardian. Full
    // feeder rows can contain large diagnostic/learning snapshots and are not
    // needed for pre-entry risk reconstruction.
    const row={id:String(entry.id||''),conceptName,ticker:String(entry.ticker||''),eventTicker:String(entry.eventTicker||entry.ticker||''),entryPriceCents:Number(entry.entryPriceCents||0),openedAtMs:Number(entry.openedAtMs||0),entryConfig:conceptName==='Dragon'?{dragonSource:{signalPriceCents}}:{}};
    this.athenaR2FeederHistory.push(row);
    this.athenaR2FeederHistory.sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0));
    if(this.athenaR2FeederHistory.length>ATHENA_R2_FEEDER_CONTEXT_LIMIT)this.athenaR2FeederHistory.splice(0,this.athenaR2FeederHistory.length-ATHENA_R2_FEEDER_CONTEXT_LIMIT);
  }
  async hydrateAthenaR2FeederContext(){
    if(typeof this.db?.entries!=='function'){this.athenaR2ContextReady=true;return;}
    const s=this.getSettings();const rows=typeof this.db?.athenaR2FeederContextRows==='function'?await this.db.athenaR2FeederContextRows(s.systemName,{limit:ATHENA_R2_FEEDER_CONTEXT_LIMIT}):await this.db.entries(s.systemName,{limit:5000});
    this.athenaR2FeederHistory=[];for(const e of [...rows].sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0)))this.recordAthenaR2FeederContext(e);
    this.athenaR2ContextReady=true;
  }
  buildAthenaR2Context({ticker,eventTicker,sourceFeeder,concept,settings,now=Date.now()}={}){
    const exact=String(ticker||''),event=String(eventTicker||exact),source=String(sourceFeeder||'NONE');
    const prior=this.athenaR2FeederHistory.filter((e)=>Number(e.openedAtMs||0)<=Number(now));
    const same=prior.filter((e)=>String(e.ticker||'')===exact),ev=prior.filter((e)=>String(e.eventTicker||e.ticker||'')===event),opp=ev.filter((e)=>String(e.ticker||'')!==exact);
    const out={ready:this.athenaR2ContextReady===true};
    for(const type of ['Pegasus','Dragon']){
      const low=type.toLowerCase();const stRows=same.filter((e)=>e.conceptName===type),otRows=opp.filter((e)=>e.conceptName===type);const st=athenaR2Latest(stRows),ot=athenaR2Latest(otRows);
      out[`${low}SamePresent`]=st?1:0;out[`${low}OppPresent`]=ot?1:0;
      out[`${low}SameRef`]=st?Number(st.entryPriceCents||0):null;out[`${low}SameSignal`]=st?athenaR2FeederSignal(st):null;out[`${low}SameAgeSec`]=st?(Number(now)-Number(st.openedAtMs||0))/1000:null;
      out[`${low}OppRef`]=ot?Number(ot.entryPriceCents||0):null;out[`${low}OppSignal`]=ot?athenaR2FeederSignal(ot):null;out[`${low}OppAgeSec`]=ot?(Number(now)-Number(ot.openedAtMs||0))/1000:null;
      out[`${low}SameCount`]=stRows.length;out[`${low}OppCount`]=otRows.length;
      if(st&&ot){const sr=Number(st.entryPriceCents||0),or=Number(ot.entryPriceCents||0),ss=athenaR2FeederSignal(st),os=athenaR2FeederSignal(ot);out[`${low}RefEdge`]=sr-or;out[`${low}SignalEdge`]=ss-os;out[`${low}RefShare`]=(sr+or)>0?sr/(sr+or):.5;}
      else{out[`${low}RefEdge`]=null;out[`${low}SignalEdge`]=null;out[`${low}RefShare`]=null;}
      Object.assign(out,athenaR2SequenceFeatures(stRows,`${low}SameSeq`),athenaR2SequenceFeatures(otRows,`${low}OppSeq`));
    }
    const ps=athenaR2Latest(same.filter((e)=>e.conceptName==='Pegasus')),ds=athenaR2Latest(same.filter((e)=>e.conceptName==='Dragon'));
    if(ps&&ds){out.sameCosmosRefGap=Number(ds.entryPriceCents||0)-Number(ps.entryPriceCents||0);out.sameCosmosSignalVsPegRef=athenaR2FeederSignal(ds)-Number(ps.entryPriceCents||0);out.cosmosAgreementAgeGapSec=Math.abs(Number(ps.openedAtMs||0)-Number(ds.openedAtMs||0))/1000;}
    else{out.sameCosmosRefGap=null;out.sameCosmosSignalVsPegRef=null;out.cosmosAgreementAgeGapSec=null;}
    out.eventPriorFeederCount=ev.length;out.tickerPriorFeederCount=same.length;out.eventDistinctTickerCount=new Set(ev.map((e)=>String(e.ticker||''))).size;out.eventDistinctCosmosCount=new Set(ev.map((e)=>String(e.conceptName||''))).size;
    const sourceRows=source==='Pegasus'||source==='Dragon'?same.filter((e)=>e.conceptName===source):[];const sourceEventRows=source==='Pegasus'||source==='Dragon'?ev.filter((e)=>e.conceptName===source):[];
    Object.assign(out,athenaR2SequenceFeatures(sourceRows,'sourceSeq'));
    const refs=sourceRows.map((e)=>Number(e.entryPriceCents||0));const eventRefs=sourceEventRows.map((e)=>Number(e.entryPriceCents||0));const first=sourceRows[0]||null;
    out.priorSourceSignalsTicker=sourceRows.length;out.priorSourceSignalsEvent=sourceEventRows.length;out.sourceRefRangePrior=refs.length?Math.max(...refs)-Math.min(...refs):null;out.sourceRefMinPrior=refs.length?Math.min(...refs):null;out.sourceRefMaxPrior=refs.length?Math.max(...refs):null;
    out.sourceEventRefRangePrior=eventRefs.length?Math.max(...eventRefs)-Math.min(...eventRefs):null;out.sourceEventRefMinPrior=eventRefs.length?Math.min(...eventRefs):null;out.sourceEventRefMaxPrior=eventRefs.length?Math.max(...eventRefs):null;out.sourceFirstAgeSec=first?(Number(now)-Number(first.openedAtMs||0))/1000:null;
    Object.assign(out,athenaR2ModelSettings(settings,concept));
    return out;
  }
  async init({backgroundResearch=false}={}){
    await this.athenaExclamation?.init?.().catch(()=>{});
    const hydrate=async()=>{try{await this.hydrateAthenaR2FeederContext();await this.audit('athena_b2_r2_context_hydrated',{feeders:this.athenaR2FeederHistory.length,limit:ATHENA_R2_FEEDER_CONTEXT_LIMIT,entryAuthority:false});}
      catch(e){this.athenaR2ContextReady=false;await this.audit('athena_b2_r2_context_hydration_failed',{error:String(e?.message||e),policy:'research_only_new_generation_trading_continues'},'warning').catch(()=>{});}};
    if(backgroundResearch)void hydrate();else await hydrate();
    return this;
  }

  async recordStarlightSourcePreIntentRefusal({snapshot,quote,reason,stage,attemptId}={}){
    // R12: invoked ONLY by the active production entry path before any call
    // capable of creating an entry_pending order or touching Kalshi. This is
    // NOT a string-based inference after a timed-out or ambiguous send.
    if(snapshot?.mode!=='LIVE'||snapshot?.virtualGroupVersion!==STARLIGHT_CAPITAL_VERSION
      ||typeof this.db?.recordStarlightPreDispatchRefusal!=='function')return null;
    const result=await this.db.recordStarlightPreDispatchRefusal(snapshot,quote,reason,{
      version:'SC1-R12-SOURCE-PRE-INTENT',phase:'BEFORE_DURABLE_INTENT',
      stage,attemptId,intentBoundaryEntered:false});
    if(result?.kind==='PRE_DISPATCH_REFUSAL'){
      this.lastStarlightRefusalByAuth ||= new Map();
      this.lastStarlightRefusalByAuth.set(String(snapshot.authorizationId),result);
    }
    return result;
  }

  recordEntryPipeline(attemptId, concept, ticker, stage, status, reason = null, data = {}) {
    // Telemetry payload is intentionally flattened for diagnostics, but reserved
    // pipeline identity fields must be authoritative. Put caller data first so
    // fields such as a Hunter's runtime `status=open` cannot overwrite EPT1's
    // gate result `status=PASS` (a defect caught by the R35 end-to-end test).
    const row = {
      ...data,
      version:'EPT1', attemptId:String(attemptId), concept:String(concept || ''), ticker:String(ticker || ''),
      stage:String(stage || 'UNKNOWN'), status:String(status || 'INFO'), reason:reason == null ? null : String(reason),
      atMs:Date.now(),
    };
    this.entryPipelineEvents.push(row);
    if (this.entryPipelineEvents.length > 500) this.entryPipelineEvents.splice(0, this.entryPipelineEvents.length - 500);
    try{this.onEntryPipeline?.(row);}catch{}
    return row;
  }

  entryPipelineSummary() {
    const rows = [...this.entryPipelineEvents].sort((a,b)=>Number(b.atMs||0)-Number(a.atMs||0));
    const byStage = {}, byReason = {};
    const attempts = new Set();
    let opened = 0, blocked = 0;
    for (const r of rows) {
      attempts.add(r.attemptId);
      const key = `${r.stage}:${r.status}`; byStage[key] = (byStage[key] || 0) + 1;
      if (r.reason) byReason[r.reason] = (byReason[r.reason] || 0) + 1;
      if (r.auroraClass) byReason[r.auroraClass] = (byReason[r.auroraClass] || 0) + 1;
      if (r.stage === 'OPENED' && r.status === 'PASS') opened += 1;
      if (r.status === 'BLOCKED') blocked += 1;
    }
    return { version:'EPT1', attempts:attempts.size, opened, blocked, byStage, byReason, recent:rows.slice(0,75) };
  }


  pruneRecoveryRuntime(eligibleSourceIds = new Set()) {
    const keep=eligibleSourceIds instanceof Set?eligibleSourceIds:new Set(eligibleSourceIds||[]);
    let removed=0;
    for(const id of [...this.recoveryRuntimeTroughs.keys()])if(!keep.has(String(id))){this.recoveryRuntimeTroughs.delete(id);removed++;}
    for(const id of [...this.recoveryAuditStates.keys()])if(!keep.has(String(id)))this.recoveryAuditStates.delete(id);
    return removed;
  }

  resourceSnapshot() {
    return {
      hunterTickerLocks:this.hunterTickerLocks.size,
      hunterEntryCommitLocks:this.hunterEntryCommitLocks.size,
      recoveryRuntimeTroughs:this.recoveryRuntimeTroughs.size,
      recoveryAuditStates:this.recoveryAuditStates.size,
      entryPipelineEvents:this.entryPipelineEvents.length,
      entryPipelineEventLimit:500,
      liveBrokerHardRejects:this.liveBrokerHardRejects.size,
      lightningPlasma:{...this.lightningPlasmaTelemetry},
      athenaExclamation:this.athenaExclamation?.summary?.()||null,
    };
  }

  async audit(event, data = {}) {
    await this.db.audit('info', event, data).catch(() => {});
  }

  async observeGoldSaintQualification(concept, q, {sourceFeeder=null,sourceTradeId=null,qualificationSnapshot=null,legacyCompatibility=false}={}) {
    if (legacyCompatibility !== true) return { vote:null, candidate:null, entry:null, legacyOnly:true };
    if (!isGoldSaintConcept(concept) || !q?.ticker) return { vote:null, candidate:null, entry:null };
    const s=this.getSettings();
    const bid=Number(q.yesBid||0),ask=Number(q.yesAsk||0);
    const status=String(q.status||'active').toLowerCase();
    if (!(bid>0) || !(ask>0) || bid>ask || status!=='active' || Boolean(q.result)) return { vote:null, candidate:null, entry:null };
    const gameMinutes=confirmedInGameElapsedMinutes(q);
    const sharedMin=Math.max(0,Number(s.minGameMinutes??20));
    const sharedMax=Math.max(0,Number(s.maxGameMinutes??0));
    // A Saint vote is an independently qualified Attack doctrine observation,
    // not an exposure grant. Require a confirmed in-game clock when available
    // here; the eventual Big Bang still force-refreshes GCA2 and the full book.
    if (gameMinutes==null || gameMinutes+1e-9<sharedMin || (sharedMax>0&&gameMinutes-1e-9>sharedMax)) return { vote:null, candidate:null, entry:null };
    const result=await this.athenaExclamation.recordQualification({
      conceptName:concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,qualifiedAtMs:Date.now(),
      priceCents:ask,bidCents:bid,sourceFeeder,sourceTradeId,gameMinutes,qualificationSnapshot,
    });
    if (!result?.candidate || s.athenaExclamationEnabled!==true) return { ...result, entry:null };
    const entry=await this.executeAthenaExclamationCandidate(result.candidate,q);
    return { ...result, entry };
  }

  async executeAthenaExclamationCandidate(candidate,q) {
    const s=this.getSettings();
    if (s.athenaExclamationEnabled!==true || !candidate?.id || !q?.ticker) return null;
    // Shadow admission retains source/ticker/event dedup, not real capital capacity.
    const saints=(candidate.saints||[]).slice().sort((a,b)=>Number(a.lastQualifiedAtMs||a.firstQualifiedAtMs||0)-Number(b.lastQualifiedAtMs||b.firstQualifiedAtMs||0));
    const first=saints[0]||{},third=saints[Math.min(2,saints.length-1)]||{};
    const snapshot={
      version:'AE1-Q1',policyRevision:ATHENA_EXCLAMATION.policyRevision,eventId:candidate.id,
      candidate:structuredClone(candidate),minimumSaints:ATHENA_EXCLAMATION.minimumSaints,
      firstVoteAtMs:Number(candidate.firstVoteAtMs||0),thirdVoteAtMs:Number(candidate.thirdVoteAtMs||0),
      convergenceSpanMs:Number(candidate.convergenceSpanMs||0),saintCount:Number(candidate.saintCount||saints.length),
      combination:[...(candidate.combination||[])],firstSaintPriceCents:Number(first.priceCents||0),
      thirdSaintPriceCents:Number(third.priceCents||0),observedAtMs:Date.now(),
    };
    const entry=await this.createHunter('Athena Exclamation',q,Number(s.athenaExclamationStakeCents||ATHENA_EXCLAMATION_DOCTRINE.defaultStakeCents),0,{
      sourceTradeId:candidate.id,entryQualificationSnapshot:snapshot,legacyCompatibility:true,
    });
    if(entry){
      await this.athenaExclamation.markDecision(candidate.id,{status:'EXECUTED',entryId:entry.id,review:entry.entryConfig?.athenaExclamation?.primeReview||null});
      await this.audit('athena_exclamation_executed',{id:candidate.id,entryId:entry.id,ticker:entry.ticker,entryPriceCents:entry.entryPriceCents,count:entry.count,combination:candidate.combination});
      return entry;
    }
    const current=this.athenaExclamation.events.get(String(candidate.id));
    if(current?.status==='CANDIDATE'||current?.status==='QUALIFIED')await this.athenaExclamation.markDecision(candidate.id,{status:'EXECUTION_BLOCKED',review:current.review||{reason:'entry_pipeline_blocked'}});
    return null;
  }

  // R45: Golden Dragon feeder / Golden Dragon Hunter / Dragon Recovery
  // Hunter runtime production paths are removed. Historical database records
  // remain readable through diagnostics/Athena, but StrategyEngine exposes no
  // callable creation or feed-authority lifecycle for those retired concepts.

  liveBrokerRejectKey(concept, ticker, boltId) {
    const bolt=String(boltId||'');
    return bolt ? `${String(ticker||'')}|${String(concept||'')}|${bolt}` : null;
  }

  pruneLiveBrokerHardRejects(now = Date.now()) {
    const cutoff=Number(now)-60_000;
    for(const [key,row] of this.liveBrokerHardRejects) if(Number(row?.atMs||0)<cutoff) this.liveBrokerHardRejects.delete(key);
    while(this.liveBrokerHardRejects.size>512) this.liveBrokerHardRejects.delete(this.liveBrokerHardRejects.keys().next().value);
  }

  liveBrokerHardRejectSuppressed(concept, ticker, boltId, now = Date.now()) {
    this.pruneLiveBrokerHardRejects(now);
    const key=this.liveBrokerRejectKey(concept,ticker,boltId);
    if(!key)return null;
    const row=this.liveBrokerHardRejects.get(key)||null;
    return row&&Number(now)-Number(row.atMs||0)<=60_000?row:null;
  }

  rememberLiveBrokerHardReject(concept, ticker, boltId, data = {}) {
    const key=this.liveBrokerRejectKey(concept,ticker,boltId);
    if(!key)return;
    this.liveBrokerHardRejects.set(key,{...data,atMs:Date.now()});
    this.pruneLiveBrokerHardRejects();
  }

  async persistPendingEntryResult(entry,patch){
    try{
      await this.db.updateEntry(entry.id,patch,null,entry);
      return {applied:true,entry:{...entry,...patch}};
    }catch(error){
      if(String(error?.message||'')!=='sag_entry_receipt_concurrent_change')throw error;
      await this.audit('entry_receipt_concurrent_change',{id:entry.id,ticker:entry.ticker,
        clientOrderId:entry.entryClientOrderId,orderId:entry.entryOrderId||null},'warning');
      // Never overwrite a newer receipt or discard its owned exposure.
      const current=await this.db.entryById(entry.id);
      if(!current)throw new Error('entry_receipt_conflict_current_row_missing');
      return {applied:false,entry:current};
    }
  }

  async rejectUndispatchedLightningEntry(entry,reason,entryConfig=entry.entryConfig){
    let released;
    try{
      const starlight=entry?.conceptName==='Crash Recovery Hunter'&&entry?.mode==='LIVE';
      const clone=entry?.mode==='LIVE'&&entry?.entryConfig?.starlightModelClone===true;
      const independent=entry?.mode==='LIVE'
        &&entry?.entryConfig?.independentRecovery?.version==='INDEPENDENT-ATHENA-LOSS-V2';
      // Called only at the LOCAL pre-submit boundary, or following an
      // authoritative broker result explicitly proving notSubmitted=true.
      // A terminal CAS rejection without this proof must never free a seat.
      if(starlight||clone||independent){
        if(entryConfig?.dispatchProof&&entryConfig.dispatchProof.submitted!==false)
          throw new Error('sc1_no_send_proof_conflict');
        if(!entryConfig?.dispatchProof)entryConfig={...entryConfig,dispatchProof:{
          version:'HC2-R1-DISPATCH',submitted:false,
          reason:String(reason||'local_pre_dispatch_rejection').slice(0,160),atMs:Date.now()}};
      }
      const method=independent
        ?this.db.rejectUndispatchedIndependentRecoveryIntent
        :starlight?this.db.rejectUndispatchedStarlightIntent
        :clone?this.db.rejectUndispatchedModelCloneIntent:this.db.rejectUndispatchedLightningIntent;
      if(typeof method!=='function')throw new Error('capital_safe_intent_release_unavailable');
      released=await method.call(this.db,entry,reason,entryConfig);
    }catch(error){
      await this.audit('lp_intent_release_pending_reconciliation',{id:entry.id,ticker:entry.ticker,
        reason,message:String(error?.message||error)},'warning');
      return entry;
    }
    if(released.rejected)return null;
    await this.audit('lp_intent_release_changed_pending_reconciliation',{id:entry.id,ticker:entry.ticker,
      reason,status:released.entry?.status||null,orderId:released.entry?.entryOrderId||null},'warning');
    return released.entry||entry;
  }

  async simulationAvailableCashCents(entriesOverride = null) {
    const s = this.getSettings();
    // HF5: callers that already loaded the ledger (dashboard/state collection)
    // may reuse it. Entry authorization still calls this without an override and
    // therefore performs its own fresh durable read before spending capital.
    if(!Array.isArray(entriesOverride)&&typeof this.db?.simulationCashAggregate==='function'){
      const a=await this.db.simulationCashAggregate(s.systemName,{simFeeCents:Number(s.simFeeCents||0),
        ownerId:s.ownerId,realizedSinceMs:Number(s.resetTimestampMs||0)});
      return Number(s.startingCapitalCents||0)+Number(a.realizedCents||0)-Number(a.reservedCents||0);
    }
    const entries = Array.isArray(entriesOverride) ? entriesOverride : await this.db.entries(s.systemName, { limit: 5000 });
    const hunters = entries.filter((e) => e.mode === 'SIMULATION' && e.archived!==true
      && String(e.systemName)===String(s.systemName) && String(e.ownerId)===String(s.ownerId)
      && !isShadowSaintEntry(e) && PORTFOLIO_CONCEPTS.has(e.conceptName));
    const fee = Number(s.simFeeCents || 0);
    let realized = 0;
    let reserved = 0;
    for (const e of hunters) {
      if(!Number(s.resetTimestampMs||0)||Number(e.openedAtMs)>=Number(s.resetTimestampMs))
        realized += Number(e.pnlCents || 0);
      if (!openLike(e.status)) continue;
      const originalCount = Math.max(0, Number(e.count || 0));
      const remaining = Math.max(0, Number(e.remainingCount ?? originalCount));
      const storedEntryFee = Number(e.entryFeeCents || 0);
      const totalEntryFee = storedEntryFee > 0 ? storedEntryFee : fee * originalCount;
      const remainingEntryFee = originalCount > 0 ? totalEntryFee * (remaining / originalCount) : 0;
      reserved += Number(e.entryPriceCents || 0) * remaining + remainingEntryFee;
    }
    return Number(s.startingCapitalCents || 0) + realized - reserved;
  }

  recoverySourcesFromEntries(entries, settings = this.getSettings()) {
    const now = Date.now();
    const windowMs = Math.max(1, Number(settings.recoveryTrackingHours || 24)) * 3600000;
    const cutoff = now - windowMs;
    const existingSourceIds = new Set(entries
      .filter((e) => e.conceptName === 'Recovery Hunter' && e.sourceTradeId)
      .map((e) => String(e.sourceTradeId)));
    return entries.filter((e) => e.status === 'closed'
      && e.closeReason === 'hard_stop_loss'
      && e.conceptName !== 'Recovery Hunter'
      && ACTIVE_PORTFOLIO_CONCEPTS.has(String(e.conceptName || ''))
      && Number(e.exitPriceCents) > 0
      && Number(e.closedAtMs || 0) >= cutoff
      && !existingSourceIds.has(String(e.id)));
  }

  async recoveryCandidateTickers() {
    const s = this.getSettings();
    if (!isModelEnabled(s, 'Recovery Hunter')) return [];
    const cutoff=Date.now()-Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    const entries=typeof this.db?.recoverySourceEntries==='function'?await this.db.recoverySourceEntries(s.systemName,{sinceMs:cutoff}):await this.db.entries(s.systemName,{limit:5000});
    const sources=typeof this.db?.recoverySourceEntries==='function'?entries:this.recoverySourcesFromEntries(entries,s);
    return [...new Set(sources.map((e) => e.ticker).filter(Boolean))];
  }

  async recoveryObservationsBySource(sourceIds=null) {
    const s = this.getSettings();
    const ids=Array.isArray(sourceIds)?[...new Set(sourceIds.map(String).filter(Boolean))]:null;
    if(ids&&typeof this.db?.recoveryObservationsByOriginalEntryIds==='function'){const rows=await this.db.recoveryObservationsByOriginalEntryIds(s.systemName,ids).catch(()=>[]);const map=new Map();for(const row of rows||[]){const source=String(row?.original_entry_id||'');if(!source||map.has(source))continue;map.set(source,row);}return map;}
    if (typeof this.db.recoveryObservations !== 'function') return new Map();
    const rows = await this.db.recoveryObservations(s.systemName, { limit: 5000 }).catch(() => []);
    const map = new Map();
    for (const row of rows || []) {
      const source = String(row?.original_entry_id || '');
      if (!source || map.has(source)) continue;
      map.set(source, row);
    }
    return map;
  }

  async noteRecoveryCandidate(loss, data) {
    const sourceTradeId = String(loss?.id || '');
    if (!sourceTradeId) return;
    const signature = [
      data.reason, data.troughCents, Math.floor(Number(data.reboundCents || 0)),
      data.targetStakeCents, data.actualStakeCents, data.capitalCapped,
    ].map((v) => v == null ? '' : String(v)).join('|');
    if (this.recoveryAuditStates.get(sourceTradeId) === signature) return;
    this.recoveryAuditStates.set(sourceTradeId, signature);
    await this.audit('recovery_candidate_state', {
      sourceTradeId, ticker:loss.ticker, sourceConcept:loss.conceptName, sourceExitPriceCents:Number(loss.exitPriceCents || 0),
      ...data,
    });
  }

  async createGhost(name, q, entryPrice, gameStartTimeMs, options = {}) {
    const s = this.getSettings();
    const simulationMutationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    if (!isModelEnabled(s, name)) {
      await this.audit('model_entry_disabled', { concept: name, ticker: q.ticker, kind: 'feeder' });
      return null;
    }
    // Ghost feeders are reference-only. Their reference stake exists only to
    // visualize hypothetical P/L; Hunter eligibility and sizing never read it.
    const feederStake = feederReferenceStake(s, name);
    const count = Math.max(1, Math.floor(feederStake / Math.max(1, entryPrice)));
    const now = Date.now();
    const currentPriceCents = Number(options.currentPriceCents ?? entryPrice);
    const peakPriceCents = Math.max(Number(options.peakPriceCents ?? currentPriceCents), currentPriceCents, Number(entryPrice));
    const e = {
      id: nowId(), systemName: s.systemName, ownerId: s.ownerId, conceptName: name,
      sourceFeeder: null, sourceTradeId: options.sourceTradeId || null, ticker: q.ticker,
      eventTicker: q.eventTicker || q.ticker, marketTitle: q.title || q.ticker,
      watchdogModel: WATCHDOG_MODEL, mode: s.mode, status: 'open',
      entryPriceCents: entryPrice, exitPriceCents: null, currentPriceCents,
      peakPriceCents, stopPriceCents: 0, stopLossCents: 0,
      count, remainingCount: count, volume24h: q.volume24h || 0,
      spreadAtEntryCents: q.yesAsk - q.yesBid, pnlCents: 0,
      entryFeeCents: 0, exitFeeCents: 0, exitFilledCount: 0, exitNotionalCents: 0,
      gameStartTimeMs: Number(q.gameStartTimeMs) || Number(gameStartTimeMs) || null, openedAtMs: now, updatedAtMs: now,
      entryConfig: {
        release: RELEASE, conceptName: name, feeder: feederSettings(s, name), referenceStakeCents: feederStake,
        shadowTrade:{version:'COSMO-SHADOW-V1',brokerOrderAuthority:false,portfolioCapitalAuthority:false,entryPriceCents:Number(entryPrice),openedAtMs:now},
        maxSpreadCents: Number(s.maxSpreadCents), ...(options.entryConfigExtra || {}),
      },
      feederState: options.feederState && typeof options.feederState === 'object' ? structuredClone(options.feederState) : {},
    };
    let releaseSimulationMutation=null;
    if(s.mode==='SIMULATION'&&this.enterSimulationMutation){
      releaseSimulationMutation=this.enterSimulationMutation(simulationMutationToken);
      if(!releaseSimulationMutation){await this.audit('simulation_reset_mutation_blocked',{kind:'cosmo_shadow',concept:name,ticker:q.ticker,reason:'reset_epoch_or_barrier'});return null;}
    }
    try{await this.db.insertEntry(e);}finally{try{releaseSimulationMutation?.();}catch{}}
    this.recordAthenaR2FeederContext(e);
    // FSI1 is diagnostics-only. Feeder creation must never depend on telemetry
    // persistence, so registration is fire-and-forget and isolated from the
    // reference feeder / Hunter execution path.
    try { this.onFeederOpened?.(e); } catch {}
    return e;
  }

  async createAnotherDimensionShadow(source,q,{sourcePeakCents=null}={}){
    const s=this.getSettings();
    if(!isModelEnabled(s,'Another Dimension'))return null;
    if(!source?.id||!q?.ticker||String(source.ticker||'')!==String(q.ticker||''))return null;
    if(!ACTIVE_FEEDER_CONCEPTS.has(String(source.conceptName||''))||!openLike(source.status))return null;
    if(String(source.systemName||'')!==String(s.systemName||'')||String(source.ownerId||'')!==String(s.ownerId||'')||String(source.mode||'')!==String(s.mode||''))return null;
    const qualification=anotherDimensionQualification(source,q,s,{sourcePeakCents});
    if(!qualification.ok)return null;
    const maxAge=Math.max(100,Number(s.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs));
    const quoteAge=typeof this.market?.quoteAgeMs==='function'?this.market.quoteAgeMs(q.ticker):Infinity;
    const bookAge=typeof this.market?.bookAgeMs==='function'?this.market.bookAgeMs(q.ticker):Infinity;
    if(quoteAge>maxAge||bookAge>maxAge||q.bookInvalid)return null;
    const configuredStake=Math.max(1,Number(s.geminiReferenceStakeCents||0));
    const requested=Math.max(1,Math.floor(configuredStake/Math.max(1,Number(q.yesAsk||0))));
    const exec=this.market?.executableAsk?.(q.ticker,requested,Number(q.yesAsk));
    if(!exec?.full||Number(exec.filled||0)+1e-9<requested||!(Number(exec.avgCents)>0))return null;
    if(Number(exec.avgCents)>Number(s.geminiMaxPriceCents)+1e-9)return null;
    if(typeof this.db?.entryByConceptSourceTradeId==='function'){
      const existing=await this.db.entryByConceptSourceTradeId(s.systemName,'Another Dimension',source.id).catch(()=>null);
      if(existing)return null;
    }
    if(typeof this.db?.openEntriesByTicker==='function'){
      const open=await this.db.openEntriesByTicker(s.systemName,q.ticker).catch(()=>[]);
      if((open||[]).some((e)=>e.conceptName==='Another Dimension'))return null;
    }
    const count=requested;
    const entryPriceCents=Math.round(Number(exec.avgCents));
    const entryFeeCents=String(s.mode||'SIMULATION').toUpperCase()==='LIVE'
      ? kalshiGeneralTakerFeeEstimateCents({count,priceCents:entryPriceCents})
      : Math.max(0,Number(s.simFeeCents||0))*count;
    const now=Date.now();
    const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents,count,entryFeeCents,mode:s.mode,simFeeCents:Number(s.simFeeCents||0),damageControlPercent:Number(s.auroraDamageControlPercent??AURORA_EXECUTION.defaultDamageControlPercent),calculatedAtMs:now});
    if(!aurora?.ok)return null;
    const e={
      id:nowId(),systemName:s.systemName,ownerId:s.ownerId,conceptName:'Another Dimension',sourceFeeder:String(source.conceptName),sourceTradeId:String(source.id),ticker:String(q.ticker),eventTicker:String(q.eventTicker||source.eventTicker||q.ticker),marketTitle:q.title||source.marketTitle||q.ticker,
      watchdogModel:WATCHDOG_MODEL,mode:s.mode,status:'open',entryPriceCents,exitPriceCents:null,currentPriceCents:entryPriceCents,peakPriceCents:entryPriceCents,stopPriceCents:Number(aurora.dangerPriceCents),stopLossCents:Number(aurora.stopDistanceCents),count,remainingCount:count,volume24h:Number(q.volume24h||source.volume24h||0),spreadAtEntryCents:Number(q.yesAsk)-Number(q.yesBid),pnlCents:0,entryFeeCents,exitFeeCents:0,exitFilledCount:0,exitNotionalCents:0,gameStartTimeMs:Number(q.gameStartTimeMs||source.gameStartTimeMs)||null,openedAtMs:now,updatedAtMs:now,lowestPriceAfterEntryCents:entryPriceCents,maeCents:0,maeAtMs:null,researchTrackingComplete:false,
      entryConfig:{
        release:RELEASE,conceptName:'Another Dimension',sourceFeeder:String(source.conceptName),sourceTradeId:String(source.id),
        universe:{version:GEMINI_UNIVERSE.version,policyRevision:GEMINI_UNIVERSE.policyRevision,name:'Gemini',brokerOrderAuthority:false,portfolioCapitalAuthority:false,simulationPortfolioCapitalAuthority:false,minPriceCents:Number(s.geminiMinPriceCents),maxPriceCents:Number(s.geminiMaxPriceCents),configuredVirtualStakeCents:configuredStake},
        shadowAttack:{version:ANOTHER_DIMENSION.version,policyRevision:ANOTHER_DIMENSION.policyRevision,universe:'Gemini',brokerOrderAuthority:false,portfolioCapitalAuthority:false,simulationPortfolioCapitalAuthority:false,entryPhysics:ANOTHER_DIMENSION.entryPhysics,configuredVirtualStakeCents:configuredStake},
        greatHornQualification:structuredClone(qualification),
        sourceShadow:{id:String(source.id),conceptName:String(source.conceptName),entryPriceCents:Number(source.entryPriceCents||0),peakPriceCents:Number(qualification.sourcePeakCents||0),openedAtMs:Number(source.openedAtMs||0)},
        simFeeCents:Math.max(0,Number(s.simFeeCents||0)),
        virtualInfinity:{version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,minimumNetPerOriginalContractCents:Number(ANOTHER_DIMENSION.minimumNetPerOriginalContractCents),requiredFreshConfirmations:Math.max(1,Math.floor(Number(s.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),maximumBookAgeMs:maxAge,confirmationWindowMs:Math.max(250,Math.floor(Number(s.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs))),fullPositionOnly:true},
        aurora:structuredClone(aurora),profitAuthority:INFINITY_BREAK.version,profitAuthorityRevision:INFINITY_BREAK.policyRevision,lossAuthority:AURORA_EXECUTION.lossAuthority,
      },
      feederState:{phase:'ANOTHER_DIMENSION',universe:'Gemini',sourceShadowTradeId:String(source.id),sourceCosmo:String(source.conceptName)},
    };
    const simulationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    let releaseSimulationMutation=null;
    if(s.mode==='SIMULATION'&&this.enterSimulationMutation){
      releaseSimulationMutation=this.enterSimulationMutation(simulationToken);
      if(!releaseSimulationMutation)return null;
    }
    try{await this.db.insertEntry(e);}finally{try{releaseSimulationMutation?.();}catch{}}
    try{this.onShadowAttackOpened?.(e);}catch{}
    await this.audit('another_dimension_opened',{id:e.id,sourceTradeId:e.sourceTradeId,sourceFeeder:e.sourceFeeder,ticker:e.ticker,entryPriceCents:e.entryPriceCents,count:e.count,riseCents:qualification.riseCents,pullbackCents:qualification.pullbackCents,dangerPriceCents:e.stopPriceCents});
    return e;
  }

  async closeAnotherDimensionShadow(entry,{exitPriceCents,exitAverageCents=null,exitFeeCents=0,pnlCents=0,closeReason,bookMs=0,closedAtMs=Date.now(),peakPriceCents=null,lowestPriceAfterEntryCents=null,maeCents=null,maeAtMs=null}={}){
    const s=this.getSettings();
    if(!entry?.id||entry.conceptName!=='Another Dimension'||!openLike(entry.status))return null;
    if(String(entry.systemName||'')!==String(s.systemName||'')||String(entry.ownerId||'')!==String(s.ownerId||'')||String(entry.mode||'')!==String(s.mode||''))return null;
    const at=Number(closedAtMs)||Date.now(),exit=Math.round(Number(exitPriceCents));
    if(!(exit>=0&&exit<=100)||!String(closeReason||''))return null;
    const patch={status:'closed',exitPriceCents:exit,currentPriceCents:exit,remainingCount:0,pnlCents:Number(pnlCents||0),exitFeeCents:Number(exitFeeCents||0),exitFilledCount:Number(entry.remainingCount??entry.count??0),exitNotionalCents:Number(exitAverageCents??exit)*Number(entry.remainingCount??entry.count??0),exitAttemptBookMs:Number(bookMs||0),closeReason:String(closeReason),closedAtMs:at,updatedAtMs:at,peakPriceCents:Math.max(Number(entry.peakPriceCents||entry.entryPriceCents||0),Number(peakPriceCents||0)),lowestPriceAfterEntryCents:Number.isFinite(Number(lowestPriceAfterEntryCents))?Number(lowestPriceAfterEntryCents):entry.lowestPriceAfterEntryCents,maeCents:Number.isFinite(Number(maeCents))?Number(maeCents):Number(entry.maeCents||0),maeAtMs:maeAtMs??entry.maeAtMs};
    const simulationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    let releaseSimulationMutation=null;
    if(s.mode==='SIMULATION'&&this.enterSimulationMutation){releaseSimulationMutation=this.enterSimulationMutation(simulationToken);if(!releaseSimulationMutation)return null;}
    try{await this.db.updateEntry(entry.id,patch);}finally{try{releaseSimulationMutation?.();}catch{}}
    const closed={...entry,...patch};
    try{this.onShadowAttackClosed?.(closed);}catch{}
    await this.audit('another_dimension_closed',{id:closed.id,sourceTradeId:closed.sourceTradeId,sourceFeeder:closed.sourceFeeder,ticker:closed.ticker,closeReason:closed.closeReason,exitPriceCents:closed.exitPriceCents,pnlCents:closed.pnlCents});
    return closed;
  }

  async prepareEntryExecution(q, requested) {
    // MHF5 execution confirmation is deliberately separate from signal doctrine
    // AND from the canonical websocket cache. Fresh REST proof is consumed
    // directly so revalidation cannot overwrite a sequence-aligned WS book and
    // trigger a REST<->WS recovery loop. The candidate IOC limit remains q.yesAsk.
    let freshMarket=null,refreshed=null;
    if(typeof this.market.verifyTickerSnapshot==='function'){
      refreshed=await this.market.verifyTickerSnapshot(q.ticker).catch(()=>null);
    }else if(typeof this.market.refreshTickerVerified==='function'){
      refreshed=await this.market.refreshTickerVerified(q.ticker).catch(()=>null);
    }else{
      freshMarket=await this.market.refreshTicker(q.ticker).catch(()=>null);
    }
    if(refreshed){
      if(!refreshed.marketFresh||!refreshed.bookFresh){
        await this.audit('hunter_entry_freshness_blocked',{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,marketFresh:Boolean(refreshed.marketFresh),bookFresh:Boolean(refreshed.bookFresh)});
        return null;
      }
      freshMarket=refreshed.quote||null;
    }
    const executeAsk=(count)=>refreshed?.book&&typeof this.market.executableAskFromBook==='function'
      ? this.market.executableAskFromBook(refreshed.book,count,q.yesAsk)
      : this.market.executableAsk(q.ticker,count,q.yesAsk);
    const exec=executeAsk(requested);
    if(!exec||exec.filled<=0)return null;
    const count=Math.floor(Math.min(requested,exec.filled)+1e-9);
    if(count<=0)return null;
    const exact=executeAsk(count);
    if(!exact||exact.filled+1e-9<count)return null;
    return{count,averagePriceCents:Number(exact.avgCents??q.yesAsk),bestAskCents:Number(exact.bestCents??q.yesAsk),freshMarket,
      verifiedBookAtMs:Number(refreshed?.bookObservedAtMs||refreshed?.book?.updatedAtMs||0)||null,
      executionEvidence:structuredClone({quote:refreshed?.quote||freshMarket||q,
        book:refreshed?.book||this.market.getBook?.(q.ticker)||null,limitPriceCents:Number(q.yesAsk),
        consumedLevels:exact.consumedLevels||null})};
  }


  hunterConcurrencyLockKey(concept,ticker,settings=this.getSettings(),stackIndex=1) {
    const exact=String(ticker||'');
    if(!exact)return '';
    if(settings?.galacticExplosionEnabled!==true)return exact;
    const multiply=attackMultiplySeats(settings,concept);
    const base=`${exact}|attack:${String(concept||'')}`;
    return multiply>1 ? `${base}|seat:${Number(stackIndex||1)}` : base;
  }

  hunterEntryCommitLockKey(concept,ticker,settings=this.getSettings(),stackIndex=1,stackSeat=false) {
    const exact=String(ticker||'');
    if(settings?.galacticExplosionEnabled!==true)return `commit:${exact}`;
    const multiply=attackMultiplySeats(settings,concept);
    return multiply>1 || stackSeat===true ? `commit:${exact}|attack:${concept}|seat:${Number(stackIndex||1)}` : `commit:${exact}|attack:${concept}`;
  }

  async activeHunterTickerExposure(ticker, {concept=null}={}) {
    const s=this.getSettings(),shadow=isShadowSaintConcept(concept);
    if(shadow && typeof this.db.shadowTickerEntries==='function')
      return this.db.shadowTickerEntries(shadowScope(s),ticker);
    const rows = (!shadow || typeof this.db.openEntriesByTicker!=='function') && typeof this.db.openHunterEntriesByTicker === 'function'
      ? await this.db.openHunterEntriesByTicker(s.systemName, ticker)
      : typeof this.db.openEntriesByTicker === 'function'
        ? await this.db.openEntriesByTicker(s.systemName, ticker)
        : (await this.db.entries(s.systemName,{limit:5000})).filter(e=>e.ticker===ticker);
    return rows.filter(e=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&openLike(e.status)
      && (shadow ? isShadowSaintEntry(e) && sameShadowScope({...e,resetEpoch:e.shadowEpoch??e.entryConfig?.shadowSaint?.resetEpoch},s)
        : !isShadowSaintEntry(e)));
  }

  async portfolioCapacityState() {
    const s=this.getSettings();
    const rows=typeof this.db?.openEntries==='function'
      ? await this.db.openEntries(s.systemName)
      : (await this.db.entries(s.systemName,{limit:5000})).filter((e)=>openLike(e.status));
    const active=rows.filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&!isShadowSaintEntry(e)&&openLike(e.status));
    const maximum=Math.max(1,Math.floor(Number(s.maxPositions)||1));
    return {active:active.length,maximum,blocked:active.length>=maximum};
  }

  async exactTickerExposureClear(concept, q, stage = 'policy', { crystalWallOverlay = false } = {}) {
    const s=this.getSettings();
    const active = await this.activeHunterTickerExposure(q.ticker,{concept});
    const multiply=attackMultiplySeats(s,concept);
    const sameConcept=active.filter((e)=>e.conceptName===concept);
    if(sameConcept.length>=multiply){
      const conflicts=sameConcept;
      const existing = conflicts.slice().sort((a, b) => Number(a.openedAtMs || 0) - Number(b.openedAtMs || 0))[0];
      await this.audit('hunter_exact_ticker_exposure_blocked', {
        concept, ticker:q.ticker, eventTicker:q.eventTicker || q.ticker, stage,
        galacticExplosionEnabled:s.galacticExplosionEnabled===true, crystalWallOverlay:crystalWallOverlay===true,
        lockScope:'exact_ticker_plus_attack_multiply', multiplySeats:multiply,
        activeHuntersOnTicker:active.length, conflictingHunters:conflicts.length,
        existingHunterId: existing?.id || null, existingConcept: existing?.conceptName || null,
        existingStatus: existing?.status || null,
      });
      return false;
    }
    if(s.galacticExplosionEnabled!==true){
      const others=active.filter((e)=>e.conceptName!==concept);
      if(others.length){
        const existing = others.slice().sort((a, b) => Number(a.openedAtMs || 0) - Number(b.openedAtMs || 0))[0];
        await this.audit('hunter_exact_ticker_exposure_blocked', {
          concept, ticker:q.ticker, eventTicker:q.eventTicker || q.ticker, stage,
          galacticExplosionEnabled:false, lockScope:GALACTIC_EXPLOSION.disabledLockScope,
          crystalWallOverlayIgnored:crystalWallOverlay===true,
          activeHuntersOnTicker:active.length, conflictingHunters:others.length,
          existingHunterId: existing?.id || null, existingConcept: existing?.conceptName || null,
        });
        return false;
      }
    }
    return true;
  }

  async hunterEventAdmissionState(q,{concept=null}={}){
    const s=this.getSettings(),event=q?.eventTicker||q?.ticker;
    const shadow=concept==null || isShadowSaintConcept(concept);
    let activeEntries=0,latestHunterEntryMs=0,latestByConcept={};
    if(shadow && typeof this.db?.shadowEventPolicySnapshot==='function'){
      const snap=await this.db.shadowEventPolicySnapshot(shadowScope(s),event);
      activeEntries=Number(snap?.activeEntries||0);latestHunterEntryMs=Number(snap?.latestHunterEntryMs||0);latestByConcept={...(snap?.latestByConcept||{})};
    }else if(!shadow && typeof this.db?.hunterEventPolicySnapshot==='function'){
      const snap=await this.db.hunterEventPolicySnapshot(s.systemName,event);
      activeEntries=Number(snap?.activeEntries||0);latestHunterEntryMs=Number(snap?.latestHunterEntryMs||0);latestByConcept={...(snap?.latestByConcept||{})};
    }else{
      const entries=await this.db.entries(s.systemName,{limit:5000});const hunters=entries.filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName) && (shadow?isShadowSaintEntry(e):!isShadowSaintEntry(e)));
      const eventHunters=hunters.filter((e)=>(e.eventTicker||e.ticker)===event && (!shadow || sameShadowScope({...e,resetEpoch:e.shadowEpoch??e.entryConfig?.shadowSaint?.resetEpoch},s)));
      activeEntries=eventHunters.filter((e)=>openLike(e.status)).length;
      for(const e of eventHunters){if(e.status==='rejected')continue;const name=String(e.conceptName||'');if(!name)continue;latestByConcept[name]=Math.max(Number(latestByConcept[name]||0),Number(e.openedAtMs||0));}
      latestHunterEntryMs=eventHunters.filter((e)=>e.status!=='rejected').reduce((m,e)=>Math.max(m,Number(e.openedAtMs||0)),0);
    }
    const maxEntriesPerTrade=Math.max(1,Math.floor(Number(s.maxEntriesPerTrade??s.maxPositions??1)));
    const hunterCooldownMinutes=Math.max(0,Number(s.hunterCooldownMinutes??0));
    const cooldownCutoffMs=Date.now()-hunterCooldownMinutes*60_000;
    const sharedCooldownBlocked=hunterCooldownMinutes>0&&latestHunterEntryMs>=cooldownCutoffMs;
    const cooldownBlockedConcepts=Object.entries(latestByConcept).filter(([,at])=>hunterCooldownMinutes>0&&Number(at||0)>=cooldownCutoffMs).map(([name])=>String(name));
    const attackLatestEntryMs=concept?Number(latestByConcept[String(concept)]||0):0;
    const attackCooldownBlocked=Boolean(concept)&&hunterCooldownMinutes>0&&attackLatestEntryMs>=cooldownCutoffMs;
    const cooldownScope=s.galacticExplosionEnabled===true?GALACTIC_EXPLOSION.cooldownScopeWhenEnabled:'event';
    const multiply=attackMultiplySeats(s,concept);
    let cooldownBlocked=cooldownScope==='attack'?(concept?attackCooldownBlocked:false):sharedCooldownBlocked;
    if(multiply>1)cooldownBlocked=false;
    let eventCapBlocked=activeEntries>=maxEntriesPerTrade;
    if(multiply>1 || (s.galacticExplosionEnabled===true && concept)){
      const own=(await this.activeHunterTickerExposure(q?.ticker||event,{concept}))
        .filter(e=>String(e.conceptName)===String(concept));
      eventCapBlocked=own.length >= (multiply>1?multiply:maxEntriesPerTrade);
    }else if(s.galacticExplosionEnabled===true && !concept)eventCapBlocked=false;

    return{eventTicker:event,activeEntries,maxEntriesPerTrade,eventCapBlocked,latestHunterEntryMs,latestByConcept,hunterCooldownMinutes,cooldownScope,sharedCooldownBlocked,attackLatestEntryMs,attackCooldownBlocked,cooldownBlockedConcepts,cooldownBlocked,galacticExplosionEnabled:s.galacticExplosionEnabled===true};
  }

  async hunterEntryPolicyDecision(concept, q, { requireClock = true, includeCooldown = true, stage = 'policy', crystalWallOverlay = false, starlightRecovery = false, lightningPlasmaScaleIn = false, starlightModelClone = false } = {}) {
    const s = this.getSettings();
    if (requireClock) {
      const minGameMinutes = Math.max(0, Number(s.minGameMinutes ?? 20));
      const maxGameMinutes = Math.max(0, Number(s.maxGameMinutes ?? 0));
      const elapsedMinutes = confirmedInGameElapsedMinutes(q);
      if (elapsedMinutes == null) {
        await this.audit('hunter_in_game_time_unknown', { concept, ticker:q?.ticker || null, eventTicker:q?.eventTicker || q?.ticker || null, minGameMinutes, maxGameMinutes, stage });
        return {ok:false,reason:'game_clock_unknown',elapsedMinutes:null,minGameMinutes,maxGameMinutes};
      }
      if (elapsedMinutes + 1e-9 < minGameMinutes) {
        await this.audit('hunter_min_game_minutes_blocked', { concept, ticker:q?.ticker || null, eventTicker:q?.eventTicker || q?.ticker || null, minGameMinutes, maxGameMinutes, elapsedMinutes, stage });
        return {ok:false,reason:'minimum_game_time',elapsedMinutes,minGameMinutes,maxGameMinutes};
      }
      if (maxGameMinutes > 0 && elapsedMinutes - 1e-9 > maxGameMinutes) {
        await this.audit('hunter_max_game_minutes_blocked', { concept, ticker:q?.ticker || null, eventTicker:q?.eventTicker || q?.ticker || null, minGameMinutes, maxGameMinutes, elapsedMinutes, stage });
        return {ok:false,reason:'maximum_game_time',elapsedMinutes,minGameMinutes,maxGameMinutes};
      }
    }
    // Galactic Explosion topology is a hard exposure invariant, not a second
    // strategic opinion. It remains valid after FIRE and is returned with an
    // exact reason instead of the old generic STATIC_POLICY label.
    // SE2-R6: Starlight's sole strategic entry authority is the confirmed
    // Aurora stop-loss followed by Starlight's own operator-set recovery signal.
    // A different live Attack (or a different stopped parent on this ticker)
    // must not silently veto this post-loss recovery. Durable parent-scoped
    // child identity, serialized commits, LIVE arming, real position capacity,
    // and broker/order integrity remain mandatory in createHunter().
    if(starlightRecovery===true || starlightModelClone===true){
      // No speculative admission SQL on a watch already authorized by its
      // durable stopped parent: event caps, global cooldown and cross-Attack
      // exposure cannot become hidden dependencies or vetoes. Financial and
      // broker/execution safety is enforced downstream at the commit boundary.
      return {ok:true,reason:'starlight_parent_scoped_recovery_authority',
        eventTicker:String(q?.eventTicker||q?.ticker||''),
        eventCapBypassed:true,cooldownApplied:false,crossAttackExposureGateBypassed:true};
    }
    // LP-SCALEIN-V1: the open Starlight is the authority, not a conflict.
    // Cross-attack ticker lock and the ordinary event cap would otherwise
    // reject every scale-in. Parent identity, threshold, band, and the
    // Multiply seat cap are enforced in the scale-in gate before this return.
    if(lightningPlasmaScaleIn===true){
      return {ok:true,reason:'lp_scalein_parent_scoped_authority',
        eventTicker:String(q?.eventTicker||q?.ticker||''),
        eventCapBypassed:true,cooldownApplied:false,crossAttackExposureGateBypassed:true};
    }
    if(!(await this.exactTickerExposureClear(concept, q, stage, {crystalWallOverlay}))) return {ok:false,reason:'ticker_lock'};

    const eventState=await this.hunterEventAdmissionState(q,{concept}),event=eventState.eventTicker;
    if (eventState.eventCapBlocked && crystalWallOverlay!==true && starlightRecovery!==true) {
      await this.audit('hunter_entry_trade_cap_blocked', { concept, ticker:q.ticker, eventTicker:event, activeEntries:eventState.activeEntries, maxEntriesPerTrade:eventState.maxEntriesPerTrade, stage });
      return {ok:false,reason:'event_entry_cap',...eventState};
    }
    if (includeCooldown && crystalWallOverlay!==true && starlightRecovery!==true && concept !== 'Athena Exclamation' && eventState.cooldownBlocked) {
      await this.audit('hunter_entry_cooldown_blocked', { concept, ticker:q.ticker, eventTicker:event, hunterCooldownMinutes:eventState.hunterCooldownMinutes, cooldownScope:eventState.cooldownScope, latestHunterEntryMs:eventState.latestHunterEntryMs, attackLatestEntryMs:eventState.attackLatestEntryMs, stage });
      return {ok:false,reason:'hunter_cooldown',...eventState};
    }
    return {ok:true,reason:'qualified',...eventState,cooldownApplied:includeCooldown&&crystalWallOverlay!==true,eventCapBypassed:crystalWallOverlay===true&&eventState.eventCapBlocked,crystalWallOverlay:crystalWallOverlay===true};
  }

  async hunterEntryPolicy(concept, q, { requireClock = true } = {}) {
    return (await this.hunterEntryPolicyDecision(concept,q,{requireClock,includeCooldown:true,stage:'legacy_policy'})).ok;
  }

  async revalidateHunterEntryDoctrine(concept, executionQuote, executionPlan, settings, {
    sourceFeeder = null,
    sourceTradeId = null,
    recoverySourceSnapshot = null,
    crashSourceSnapshot = null,
    entryQualificationSnapshot = null,
  } = {}) {
    const boundary = hunterEntryBoundaryQualifiedAtQuote(concept, executionQuote, settings, executionPlan);
    if (!boundary.ok) return boundary;

    if (concept === 'Athena Exclamation') {
      const snap=entryQualificationSnapshot;
      if (snap?.version!=='AE1-Q1' || !snap.candidate || String(snap.candidate.ticker||'')!==String(executionQuote.ticker||'')) return { ...boundary, ok:false, reason:'qualification_context_missing' };
      const saints=Array.isArray(snap.candidate.saints)?snap.candidate.saints:[];
      const distinct=new Set(saints.map((x)=>String(x.conceptName||'')).filter(isGoldSaintConcept));
      if(distinct.size<ATHENA_EXCLAMATION.minimumSaints)return { ...boundary,ok:false,reason:'three_saints_missing',saintCount:distinct.size };
      const windowMs=Math.max(1,Number(settings.athenaExclamationConvergenceWindowMinutes??ATHENA_EXCLAMATION.defaultConvergenceWindowMinutes))*60_000;
      const firstAt=Number(snap.firstVoteAtMs||snap.candidate.firstVoteAtMs||0),thirdAt=Number(snap.thirdVoteAtMs||snap.candidate.thirdVoteAtMs||0);
      if(!(firstAt>0)||!(thirdAt>=firstAt)||thirdAt-firstAt>windowMs||Date.now()-firstAt>windowMs)return { ...boundary,ok:false,reason:'convergence_window_expired' };
      return { ...boundary,saintCount:distinct.size,convergenceSpanMs:thirdAt-firstAt,eventId:snap.eventId||snap.candidate.id||null };
    }

    if (concept === 'Momentum Hunter') {
      if (!sourceFeeder || !sourceTradeId || entryQualificationSnapshot?.version !== 'MOMENTUM-Q1') return { ...boundary, ok:false, reason:'qualification_context_missing' };
      const feederEntry = Number(entryQualificationSnapshot.feederEntryPriceCents || 0);
      const feederPeak = Math.max(Number(entryQualificationSnapshot.feederPeakPriceCents || 0), feederEntry);
      if (!(feederEntry > 0) || !(feederPeak > 0)) return { ...boundary, ok:false, reason:'qualification_context_invalid' };
      const rise = feederPeak - feederEntry;
      const pullback = feederPeak - Number(executionQuote.yesBid || 0);
      const minRise = Number(settings.momentumMinRiseCents ?? MOMENTUM.minRiseCents);
      const minPullback = Number(settings.momentumMinPullbackCents ?? MOMENTUM.minPullbackCents);
      const maxPullback = Number(settings.momentumMaxPullbackCents ?? MOMENTUM.maxPullbackCents);
      if (rise + 1e-9 < minRise) return { ...boundary, ok:false, reason:'momentum_rise', riseCents:rise, minRiseCents:minRise };
      if (pullback + 1e-9 < minPullback || pullback - 1e-9 > maxPullback) return { ...boundary, ok:false, reason:'momentum_pullback', pullbackCents:pullback, minPullbackCents:minPullback, maxPullbackCents:maxPullback };
      const minTimeLeftMs = Number(settings.momentumMinTimeLeftMinutes ?? (MOMENTUM.minTimeLeftMs / 60000)) * 60000;
      const timeLeftMs = estimateTimeLeftMs(executionQuote, Date.now());
      if (timeLeftMs < minTimeLeftMs) return { ...boundary, ok:false, reason:'momentum_time_left', timeLeftMs, minTimeLeftMs };
      const elapsed = confirmedInGameElapsedMinutes(executionQuote);
      if (elapsed == null) return { ...boundary, ok:false, reason:'momentum_game_clock' };
      if (typeof this.learning?.recoveryRate === 'function') {
        const rec = await this.learning.recoveryRate(
          executionQuote.ticker,
          executionQuote.title || executionQuote.ticker,
          Number(executionQuote.yesAsk),
          pullback,
          elapsed,
          Number(settings.recoveryMinObservations ?? 5),
        );
        if (rec && rec.confidence !== 'low' && Number(rec.recoveryRate) < Number(settings.recoveryMinRate ?? 0.7)) {
          return { ...boundary, ok:false, reason:'momentum_recovery_learning', recoveryRate:Number(rec.recoveryRate), minimumRecoveryRate:Number(settings.recoveryMinRate ?? 0.7) };
        }
      }
      return { ...boundary, riseCents:rise, pullbackCents:pullback, timeLeftMs };
    }

    if (concept === 'Wave Surfer') {
      if (!sourceFeeder || !sourceTradeId || entryQualificationSnapshot?.version !== 'WAVE-Q1') return { ...boundary, ok:false, reason:'qualification_context_missing' };
      const feederEntry = Number(entryQualificationSnapshot.feederEntryPriceCents || 0);
      if (!(feederEntry > 0)) return { ...boundary, ok:false, reason:'qualification_context_invalid' };
      const favorableMove = Number(executionQuote.yesBid || 0) - feederEntry;
      const required = Number(settings.waveMinFeederFavorableMoveCents || 0);
      if (favorableMove + 1e-9 < required) return { ...boundary, ok:false, reason:'wave_favorable_move', favorableMoveCents:favorableMove, requiredFavorableMoveCents:required };
      return { ...boundary, favorableMoveCents:favorableMove };
    }

    if (concept === 'Recovery Hunter') {
      if (!sourceTradeId || !recoverySourceSnapshot || !(Number(recoverySourceSnapshot.troughCents) > 0)) return { ...boundary, ok:false, reason:'qualification_context_missing' };
      const rebound = Number(executionQuote.yesBid || 0) - Number(recoverySourceSnapshot.troughCents);
      const required = Number(settings.recoveryMinReboundCents ?? RECOVERY.minReboundCents);
      if (rebound + 1e-9 < required) return { ...boundary, ok:false, reason:'recovery_rebound', reboundCents:rebound, requiredReboundCents:required };
      return { ...boundary, reboundCents:rebound };
    }

    if (concept === 'Crash Recovery Hunter') {
      if (!sourceFeeder || !ACTIVE_FEEDER_CONCEPTS.has(sourceFeeder) || !sourceTradeId || !crashSourceSnapshot?.episodeId || !crashSourceSnapshot?.cosmoSourceId) {
        return { ...boundary, ok:false, reason:'qualification_context_missing' };
      }
      return boundary;
    }

    if (concept === 'Lightning Plasma') {
      const snap=entryQualificationSnapshot;
      if (!sourceFeeder || !ACTIVE_FEEDER_CONCEPTS.has(sourceFeeder) || !sourceTradeId || snap?.version !== 'LP1-Q1' || String(snap.sourceId || '') !== String(sourceTradeId)) {
        return { ...boundary, ok:false, reason:'qualification_context_missing' };
      }
      const expiresAtMs=Number(snap.fieldExpiresAtMs || 0);
      if (!(expiresAtMs > 0) || Date.now() > expiresAtMs) return { ...boundary, ok:false, reason:'plasma_field_expired' };
      const anchor=Number(snap.sourceAnchorCents || 0);
      if (!(anchor > 0)) return { ...boundary, ok:false, reason:'qualification_context_invalid' };
      const bid=Number(executionQuote.yesBid || 0), ask=Number(executionQuote.yesAsk || 0);
      const fade=Math.max(0,anchor-bid);
      const chase=Math.max(0,ask-anchor);
      const maxFade=Math.max(0,Number(settings.lightningPlasmaMaxSourceFadeCents ?? LIGHTNING_PLASMA.maxSourceFadeCents));
      const maxChase=Math.max(0,Number(settings.lightningPlasmaMaxChaseCents ?? LIGHTNING_PLASMA.maxChaseCents));
      if (fade > maxFade) return { ...boundary, ok:false, reason:'plasma_source_faded', fadeCents:fade, maxFadeCents:maxFade };
      if (chase > maxChase) return { ...boundary, ok:false, reason:'plasma_source_overextended', chaseCents:chase, maxChaseCents:maxChase };
      return { ...boundary, fadeCents:fade, chaseCents:chase, fieldId:snap.fieldId || null };
    }

    return { ...boundary, ok:false, reason:'unknown_hunter_concept' };
  }

  async stackSameAttackSeats(concept, q, sourceEntry, spawnOpts={}) {
    const s=this.getSettings();
    if(spawnOpts.stackSeat===true)return [];
    if(!sourceEntry?.id)return [];
    const multiply=attackMultiplySeats(s,concept);
    if(multiply<=1)return [];
    const stakeCents=attackConfiguredStakeCents(s,concept);
    const opened=[];
    for(let seat=2;seat<=multiply;seat+=1){
      const extra=await this.createHunter(concept,q,stakeCents,0,{
        ...spawnOpts,
        stackSeat:true,
        stackIndex:seat,
        stackParentId:sourceEntry.id,
      });
      if(!extra){
        await this.audit('attack_stack_seat_unfilled',{concept,ticker:q?.ticker||null,parentId:sourceEntry.id,seat,multiply},'warning').catch(()=>{});
        break;
      }
      opened.push(extra);
      await this.audit('attack_stack_seat_opened',{concept,ticker:q?.ticker||null,parentId:sourceEntry.id,seatId:extra.id,seat,multiply}).catch(()=>{});
    }
    return opened;
  }



  async restoreObservationWaits(){
    if(!this.observationWaits) this.observationWaits=new Map();
    const pending=new Map(this.observationWaits);
    if(typeof this.db?.pool?.query!=='function'){this.observationRestoreState='no_store';return this.observationWaits.size;}
    let saved;
    try{saved=await this.db.pool.query("select value from sag_settings where key='observation_waits'");}
    catch(error){this.observationRestoreState='failed';this.observationRestoreError=String(error?.message||error);await this.audit('observation_restore_failed',{error:this.observationRestoreError},'warning');return this.observationWaits.size;}
    const value=saved?.rows?.[0]?.value||{};
    const next=new Map();
    for(const [key,row] of Object.entries(value)){
      if(!row?.armedAtMs||row.consumed)continue;
      const episode=String(row.crashEpisodeId||'');
      const migrated=episode&&key.split('|').length<3?`${row.concept}|${row.ticker}|${episode}`:key;
      const prior=next.get(migrated);
      if(!prior||Number(row.armedAtMs)<Number(prior.armedAtMs))next.set(migrated,{...row,migratedFrom:migrated===key?row.migratedFrom||null:key});
    }
    for(const [key,row] of pending){
      if(!row?.armedAtMs||row.consumed)continue;
      const savedRow=next.get(key);
      if(!savedRow||row.dirty)next.set(key,{...savedRow,...row,dirty:false});
    }
    this.observationWaits=next;
    this.observationRestoreState='ready';
    this.observationRestoreError=null;
    await this.persistObservationWaits();
    return this.observationWaits.size;
  }

  async armObservationWait(wait){
    if(!this.observationWaits) this.observationWaits=new Map();
    if(!wait.authorizationId||!wait.crashEpisodeId){await this.audit('observation_wait_rejected',{concept:wait.concept,ticker:wait.ticker,reason:'missing_episode_identity'});return;}
    const current=this.getCurrentCrashWatch?.(wait.concept,wait.authorizationId,wait.crashEpisodeId)||{};
    const key=`${wait.concept}|${wait.ticker}|${wait.crashEpisodeId}`;
    if(this.observationWaits.has(key)) return;
    const row={
      ...current,...wait,
      parentAuthorizationId:wait.parentAuthorizationId||current.parentAuthorizationId||null,
      preCrashPeakCents:Number(wait.preCrashPeakCents??current.preCrashPeakCents??0),
      troughCents:Number(wait.troughCents??current.troughCents??0),
      crashDepthCents:Number(wait.crashDepthCents??current.crashDepthCents??0),
      reboundCents:Number(wait.reboundCents??current.reboundCents??0),
      upwardTicks:Number(wait.upwardTicks??current.upwardTicks??0),
      lastBidCents:Number(wait.lastBidCents??current.lastBidCents??0),
      releaseAtMs:wait.armedAtMs+wait.minutes*60_000,
      dirty:this.observationRestoreState!=='ready'&&this.observationRestoreState!=='no_store',
    };
    this.observationWaits.set(key,row);
    this.registerObservationWatch?.(wait.concept,row);
    if(row.dirty){await this.audit('observation_persist_blocked',{reason:'restore_not_ready'},'warning');return;}
    await this.persistObservationWaits();
    await this.audit('observation_wait_armed',{concept:wait.concept,ticker:wait.ticker,crashEpisodeId:wait.crashEpisodeId,authorizationId:wait.authorizationId,parentAuthorizationId:row.parentAuthorizationId,minutes:wait.minutes,releaseAtMs:row.releaseAtMs});
  }
  async releaseObservationWaits(now=Date.now()){
    if(!this.observationWaits) this.observationWaits=new Map();
    const s=this.getSettings();
    for(const [key,wait] of [...this.observationWaits.entries()]){
      const configured=s[{'Momentum Hunter':'momentumHunterObservationMinutes','Wave Surfer':'waveSurferObservationMinutes','Crash Recovery Hunter':'crashRecoveryHunterObservationMinutes','Recovery Hunter':'crystalWallObservationMinutes','Scarlet Needle':'scarletNeedleObservationMinutes','Lightning Plasma':'lightningPlasmaObservationMinutes','Sagittarius Justice Arrow':'justiceArrowObservationMinutes','Athena Exclamation':'athenaExclamationObservationMinutes'}[wait.concept]];
      const minutes=configured==null?Math.max(0,Math.min(1000,Math.round(Number(wait.minutes)||0))):Math.max(0,Math.min(1000,Math.round(Number(configured)||0)));
      const releaseAt=Number(wait.armedAtMs||0)+minutes*60_000;
      if(now<releaseAt) continue;
      this.observationWaits.delete(key);
      const quote=this.market?.getQuote?.(wait.ticker)||null;
      const registered=this.getCurrentCrashWatch?.(wait.concept,wait.authorizationId,wait.crashEpisodeId)||null;
      const watch=registered||(wait.preCrashPeakCents?wait:null);
      if(watch&&quote?.yesBid)this.registerObservationWatch?.(wait.concept,{...watch,lastBidCents:Number(quote.yesBid)});

      const signal=wait.concept==='Recovery Hunter'?crystalWallSignalState(watch||{},quote||{},s,now):wait.concept==='Sagittarius Justice Arrow'?justiceArrowSignalState(watch||{},quote||{},s,now):independentCi1SignalState(wait.concept,watch||{},quote||{},s,now);
      if(!watch||String(watch.crashEpisodeId)!==String(wait.crashEpisodeId)||!signal?.qualified){
        await this.audit('observation_wait_signal_rejected',{concept:wait.concept,ticker:wait.ticker,reason:signal?.reason||'watch_missing',crashEpisodeId:wait.crashEpisodeId||null});
        continue;
      }
      const attemptId=`${key}:${now}:${this.getSettings()?.mode||''}:${this.getSettings()?.resetTimestampMs||0}`;
      this.observationReleaseAttempt={key,attemptId,armedAtMs:wait.armedAtMs,episodeId:wait.crashEpisodeId};
      let opened=null;
      try{
        if(wait.concept==='Recovery Hunter') opened=await this.executeCrystalWallAttack(quote,watch);
        else if(wait.concept==='Sagittarius Justice Arrow') opened=await this.executeJusticeArrowAttack(quote,watch);
        else opened=await this.executeIndependentCi1Attack(wait.concept,quote,watch);
      }finally{if(this.observationReleaseAttempt?.attemptId===attemptId)this.observationReleaseAttempt=null;}
    }
    await this.persistObservationWaits();
  }
  async persistObservationWaits(){
    if(this.observationRestoreState!=='ready'&&this.observationRestoreState!=='no_store')return;
    try{await this.db?.pool?.query?.("insert into sag_settings(key,value) values('observation_waits',$1) on conflict(key) do update set value=excluded.value,updated_at=now()",[Object.fromEntries(this.observationWaits||new Map())]);}
    catch(error){for(const row of this.observationWaits.values())row.dirty=true;this.observationRestoreState='failed';await this.audit('observation_persist_failed',{error:String(error?.message||error)},'warning');}
  }


  async openShadowSaint({concept,q,plan,settings,stakeCents,sourceFeeder=null,sourceTradeId=null,
    frozenEntryConfig,finalConfirmation,stackIndex=1,simulationMutationToken=null,trace=()=>{},expectedEventTicker=null,shadowAdmissionBatch=null}={}) {
    const s=settings, now=Date.now();
    if(!isShadowSaintConcept(concept) || !frozenEntryConfig || typeof finalConfirmation!=='function')
      throw new Error('shadow_complete_entry_contract_required');
    if(typeof this.db.captureShadowScope!=='function' || typeof this.db.insertShadowEntry!=='function')
      throw new Error('durable_shadow_admission_unavailable');
    const count=Number(plan?.count),entry=Math.round(Number(plan?.averagePriceCents));
    if(!Number.isSafeInteger(count)||count<1||!(entry>0&&entry<100))return null;
    const feeModel=s.mode==='LIVE' ? {kind:'KALSHI_TAKER_ESTIMATE'}
      : {kind:'SIM_PER_CONTRACT',simFeeCents:Math.max(0,Number(s.simFeeCents||0))};
    const entryFeeCents=feeModel.kind==='SIM_PER_CONTRACT'?feeModel.simFeeCents*count
      : kalshiGeneralTakerFeeEstimateCents({count,priceCents:entry});
    const requestedAuroraPercent=auroraPercentFor(s,concept);
    let aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,
      mode:s.mode,simFeeCents:Number(s.simFeeCents||0),damageControlPercent:requestedAuroraPercent,calculatedAtMs:now});
    // Virtual-only fee-budget recovery: audit attempted and effective Aurora.
    // Capital Lightning/Great Horn never use this fallback.
    if(!aurora.ok && aurora.reason==='fee_budget_exhausts_aurora_loss_envelope' && (concept==='Crash Recovery Hunter' || concept==='Athena Exclamation')){
      for(const percent of [20,45,99]){
        const retry=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,
          mode:s.mode,simFeeCents:Number(s.simFeeCents||0),damageControlPercent:percent,calculatedAtMs:now});
        if(retry.ok){aurora={...retry,virtualRecoveryEnvelope:true,
          virtualRecoveryPolicy:'FEE_ENVELOPE_ONLY',virtualRecoveryRequestedPercent:requestedAuroraPercent,
          virtualRecoveryAttemptedPercent:percent,originalDenial:'fee_budget_exhausts_aurora_loss_envelope',
          auroraClass:'AURORA_SHADOW_FALLBACK_PASS'};break;}
      }
    }
    if(!aurora.ok){trace('SHADOW_SAINT','BLOCKED',aurora.reason);return null;}
    const coffin=applyFreezingCoffin({...structuredClone(frozenEntryConfig),aurora},s,entry,now,concept,{shadowAdmission:true});
    if(coffin.rejected){trace('SHADOW_SAINT','BLOCKED',coffin.rejected.reason);return null;}
    const confirmation=finalConfirmation();if(!confirmation.ok){trace('SHADOW_SAINT','BLOCKED',confirmation.reason);return null;}
    if(concept==='Crash Recovery Hunter'){
      const recovery=coffin.config.starlightRecovery;
      if(!recovery || recovery.shadowProtocol!==SHADOW_PROTOCOL || !recovery.shadowProofHash)
        throw new Error('shadow_starlight_verified_parent_required');
      coffin.config.starlightShadow=sealAthenaFireCommand({
        version:'APS2-VIRTUAL-STARLIGHT-V1',authorization:'VERIFIED_SHADOW_STOP_RECOVERY',
        authorizationId:recovery.authorizationId,parentEntryId:sourceTradeId,parentConcept:sourceFeeder,
        shadowProofHash:recovery.shadowProofHash,watchRevision:Number(recovery.revision),
        seat:Number(stackIndex),maximumSeats:Number(recovery.maximumSeats||attackMultiplySeats(s,concept)),
        systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetEpoch:Number(s.resetTimestampMs||0),
        ticker:q.ticker,eventTicker:expectedEventTicker||q.eventTicker||q.ticker,
      });
    }
    const auroraDecision={
      class:aurora.auroraClass||'AURORA_NORMAL_PASS',
      requestedPercent:aurora.virtualRecoveryRequestedPercent??aurora.damageControlPercent??null,
      effectivePercent:aurora.virtualRecoveryAttemptedPercent??aurora.damageControlPercent??null,
      originalDenial:aurora.originalDenial||null,
      calculatedAuroraStopCents:aurora.dangerPriceCents??null,
      finalStopCents:(coffin.stop||aurora).dangerPriceCents??null,
      finalStopProtection:coffin.stop?'FREEZING_COFFIN':'AURORA',
      brokerAuthority:false,
    };
    const config={...coffin.config,auroraDecision,executionClass:'SHADOW_SAINT',finalEntryConfirmation:confirmation,shadowSaint:{
      version:SHADOW_PROTOCOL,authorization:'VIRTUAL_ENTRY',brokerOrderAuthority:false,portfolioCapitalAuthority:false,
      parentConcept:concept,referenceStakeCents:Number(stakeCents),resetEpoch:Number(s.resetTimestampMs||0),feeModel,
      entryExecution:{...structuredClone(plan.executionEvidence||{}),filled:count,averagePriceCents:Number(plan.averagePriceCents),bestAskCents:Number(plan.bestAskCents),
        bookObservedAtMs:plan.verifiedBookAtMs||null,quoteObservedAtMs:q.quoteAtMs||null,
        ticker:q.ticker,eventTicker:expectedEventTicker||q.eventTicker||q.ticker}}};
    const e={id:null,systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,conceptName:concept,
      executionClass:'SHADOW_SAINT',shadowEpoch:Number(s.resetTimestampMs||0),sourceFeeder,sourceTradeId,
      ticker:q.ticker,eventTicker:expectedEventTicker||q.eventTicker||q.ticker,marketTitle:q.title||q.ticker,
      sport:q.sport||'Unknown',status:'open',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,
      stopPriceCents:(coffin.stop||aurora).dangerPriceCents,stopLossCents:(coffin.stop||aurora).stopDistanceCents,
      count,remainingCount:count,pnlCents:0,entryFeeCents,exitFeeCents:0,openedAtMs:now,updatedAtMs:now,
      entryConfig:config,archived:false};
    e.id=shadowAdmissionId(e,stackIndex);
    const invalid=validateShadowEntry(e);if(invalid)throw new Error(invalid);
    if(shadowAdmissionBatch){
      const batch=pendingAthenaShadowBatches.get(shadowAdmissionBatch);
      if(!batch||concept!=='Athena Exclamation'||batch.settingsHash!==executionSettingsHash(s)
        ||Number(stackIndex)!==batch.entries.length+1||Number(stackIndex)>batch.multiply)
        throw new Error('shadow_athena_batch_preparation_invalid');
      batch.entries.push(e);batch.confirmations.push(finalConfirmation);
      trace('SHADOW_SAINT','PREPARED','atomic_group_not_yet_committed',{id:e.id,seat:stackIndex});
      return e;
    }
    let release=null;
    if(s.mode==='SIMULATION' && this.enterSimulationMutation){
      release=this.enterSimulationMutation(simulationMutationToken);if(!release)return null;
    }
    try{
      const scope=await this.db.captureShadowScope(s);
      const isCurrent=()=>sameShadowScope(this.getSettings(),s)&&finalConfirmation().ok===true;
      const result=await this.db.insertShadowEntry(e,scope,{multiply:attackMultiplySeats(s,concept),isCurrent});
      trace('SHADOW_SAINT',result.ok?'PASS':'BLOCKED',result.reason,{id:e.id});
      if(!result.ok)return null;
      await this.audit('shadow_saint_opened',{id:e.id,concept,ticker:e.ticker,count,brokerOrderAuthority:false});
      const opened=result.entry||e;
      try{this.onShadowAttackOpened?.(opened);}catch{}
      return opened;
    }catch(error){
      const reason=String(error?.message||error);
      if(['shadow_runtime_scope_changed','shadow_runtime_fence_changed','shadow_runtime_changed_before_commit',
        'shadow_runtime_transaction_busy','shadow_entry_evidence_stale_or_future'].includes(reason)){
        trace('SHADOW_SAINT','BLOCKED',reason);await this.audit('shadow_admission_deferred',{concept,ticker:e.ticker,reason});return null;
      }
      throw error;
    }finally{release?.();}
  }

  async createHunter(concept, q, stakeCents, _legacyStopLossCents = 0, { sourceFeeder = null, sourceTradeId = null, sourceEntryConfig = null, recoverySourceSnapshot = null, crystalWallSourceSnapshot = null, justiceArrowSourceSnapshot = null, ci1SourceSnapshot = null, crashSourceSnapshot = null, entryQualificationSnapshot = null, athenaFireCommand = null, crystalWallFireCommand = null, justiceArrowFireCommand = null, ci1FireCommand = null, liveWatch = null, legacyCompatibility = false, stackSeat = false, stackIndex = 1, stackParentId = null, observationRelease = false, starlightRecovery = false, starlightRecoverySnapshot = null, lightningPlasmaScaleIn = false, parentStarlightId = null, shadowAdmissionBatch = null, multiplySeatDiagnostic = null, starlightModelClone = false, cloneRefusal = null, cloneAttemptGeneration = 0, independentRecovery = false } = {}) {
    // Q17-R4: stop admitting the superseded Lightning Plasma shadow/FIRE,
    // Starlight-profit scale-in and model-clone capital pathways. LP now has
    // one independent verified Athena-shadow-loss CAPITAL authority, matching
    // Arrow's independent watch/geometry/financial-admission machinery.
    // Existing shadow rows remain historical; no ledger entries are deleted.
    if(concept==='Lightning Plasma' && independentRecovery!==true)return null;
    // Snapshot the ORIGINAL committed operator card before deriving clone-only
    // effective LP/Arrow settings. Comparing the derived card to the live raw
    // card would reject every clone at the final setting-authority gate.
    const operatorCard=structuredClone(this.getSettings());
    const s = structuredClone(operatorCard);
    if(starlightModelClone===true && independentRecovery!==true){
      s.lightningPlasmaMinEntryCents=s.crashRecoveryMinEntryCents;
      s.lightningPlasmaMaxEntryCents=s.crashRecoveryMaxEntryCents;
      s.lightningPlasmaFieldStakeCents=s.crashRecoveryStakeCents;
      s.lightningPlasmaMinCrashCents=s.crashRecoveryHunterMinCrashCents;
      s.lightningPlasmaMinReboundCents=s.crashRecoveryHunterMinReboundCents;
      s.lightningPlasmaMinUpwardTicks=s.crashRecoveryHunterMinUpwardTicks;
      s.lightningPlasmaObservationMinutes=s.crashRecoveryHunterObservationMinutes;
      s.lightningPlasmaAuroraDamageControlPercent=s.crashRecoveryHunterAuroraDamageControlPercent;
      s.lightningPlasmaMultiply=s.crashRecoveryHunterMultiply;
      s.sagittariusArrowMinEntryCents=s.crashRecoveryMinEntryCents;
      s.sagittariusArrowMaxEntryCents=s.crashRecoveryMaxEntryCents;
      s.sagittariusArrowStakeCents=s.crashRecoveryStakeCents;
      s.sagittariusArrowMinCrashCents=s.crashRecoveryHunterMinCrashCents;
      s.sagittariusArrowMinReboundCents=s.crashRecoveryHunterMinReboundCents;
      s.sagittariusArrowMinUpwardTicks=s.crashRecoveryHunterMinUpwardTicks;
      s.sagittariusArrowObservationMinutes=s.crashRecoveryHunterObservationMinutes;
      s.sagittariusArrowAuroraDamageControlPercent=s.crashRecoveryHunterAuroraDamageControlPercent;
      s.sagittariusArrowMultiply=s.crashRecoveryHunterMultiply;
    }
    if(concept==='Momentum Hunter' || concept==='Great Horn Recovery' || concept==='Crystal Wall Recovery'){
      await this.audit('gh1_legacy_or_unverified_entry_denied',{concept,ticker:q?.ticker||null,reason:'gh1_capital_authorization_not_certified'});
      return null;
    }
    if(starlightRecovery===true && concept!=='Crash Recovery Hunter'){
      await this.audit('starlight_recovery_authority_invalid',{concept,ticker:q?.ticker||null,reason:'recovery_authority_restricted_to_starlight'});
      return null;
    }

    // R12 connected pre-pipeline closure: a claimed Starlight CAPITAL watch
    // can be refused by market-family or LINK authority guards BEFORE the
    // ordinary entry pipeline exists. Those guards never dispatch a BUY;
    // record the same typed source-phase witness instead of stranding the
    // claimed watch. The DB still rejects stale scope / unsafe child history.
    const starlightPrePipelineReject=async(stage,reason)=>{
      if(starlightRecovery!==true||concept!=='Crash Recovery Hunter'
        ||s.mode!=='LIVE'||starlightRecoverySnapshot?.virtualGroupVersion!==STARLIGHT_CAPITAL_VERSION)
        return null;
      return this.recordStarlightSourcePreIntentRefusal({snapshot:starlightRecoverySnapshot,
        quote:q,stage,reason:String(reason),
        attemptId:`${Date.now()}-${++this.entryPipelineAttemptSequence}`}).catch(()=>null);
    };
    const family=executionMarketFamilyExclusion(q?.ticker,s,{concept});
    if(family.blocked){
      // LIVE Multiply-only forensic witness; never grants entry authority.
      if(lightningPlasmaScaleIn===true && multiplySeatDiagnostic && typeof multiplySeatDiagnostic==='object')
        Object.assign(multiplySeatDiagnostic,{stage:'MARKET_FAMILY',status:'BLOCKED',reason:String(family.reason||'market_family_excluded')});
      await this.audit('market_family_excluded',{concept,ticker:q?.ticker||null,reason:family.reason,primaryRule:family.primaryRule,andromeda:family.andromeda});
      await starlightPrePipelineReject('MARKET_FAMILY',family.reason||'market_family_excluded');
      return null;
    }
    if(concept==='Crash Recovery Hunter' && starlightRecovery!==true){
      await this.audit('starlight_non_recovery_entry_blocked',{ticker:q?.ticker||null,reason:'stop_loss_recovery_only'});
      return null;
    }
    let athenaTriggerParent=null;
    const starlightLink=starlightRecovery===true && starlightRecoverySnapshot?.link===true && s.crashRecoveryHunterLinkEnabled===true;
    if(starlightLink){
      this.starlightLinkRejectByAuth=this.starlightLinkRejectByAuth||new Map();
      this.starlightLinkRejectByAuth.delete(String(starlightRecoverySnapshot?.authorizationId||''));
      const stop=Number(starlightRecoverySnapshot.stopPriceCents);
      if(!(stop>0)||stop>100){
        await this.audit('starlight_link_blocked',{ticker:q?.ticker||null,reason:'stop_price_invalid'});
        await starlightPrePipelineReject('LINK_PARENT_STOP','stop_price_invalid');
        return null;
      }
      const minEntry=Math.round(Number(s.crashRecoveryMinEntryCents)),maxEntry=Math.round(Number(s.crashRecoveryMaxEntryCents));
      // A settings PATCH can commit between the durable watch claim and the
      // final createHunter authorization. Never execute under a band different
      // from the one recorded in the claim. Retry and re-evaluate the CURRENT
      // inclusive band without retroactively reopening terminal blocked watches.
      const claimedBand=starlightRecoverySnapshot?.priceBandDecision||null;
      if(claimedBand&&(Number(claimedBand.minEntryCents)!==minEntry||Number(claimedBand.maxEntryCents)!==maxEntry)){
        const reason='link_band_changed_since_watch_claim';
        this.starlightLinkRejectByAuth.set(String(starlightRecoverySnapshot?.authorizationId||''),reason);
        await this.audit('starlight_link_settings_changed_during_claim',{
          ticker:q?.ticker||null,authorizationId:starlightRecoverySnapshot?.authorizationId||null,
          claimedBandMinCents:claimedBand.minEntryCents,claimedBandMaxCents:claimedBand.maxEntryCents,
          effectiveBandMinCents:minEntry,effectiveBandMaxCents:maxEntry,
          claimSettingsCommitRevision:claimedBand.settingsCommitRevision??null});
        await starlightPrePipelineReject('LINK_CLAIM_BAND',reason);
        return null;
      }
      if(!Number.isFinite(minEntry)||!Number.isFinite(maxEntry)||minEntry<1||maxEntry>99||minEntry>maxEntry){
        await this.audit('starlight_link_blocked',{ticker:q?.ticker||null,reason:'link_band_unusable',stopPriceCents:stop,minEntryCents:minEntry,maxEntryCents:maxEntry});
        await starlightPrePipelineReject('LINK_CLAIM_BAND','link_band_unusable');
        return null;
      }
      // Stop authenticates the parent loss. Link executes at a FRESH ask;
      // this price is not required to match the stop or operator entry band.
      // The parent stop is an authorization/limit, NEVER a replacement market quote.
    }
    const cardIdentity=(card)=>JSON.stringify(['mode','systemName','ownerId','resetTimestampMs','andromedaThunderWaveLevel',...EDITABLE_NUMERIC_SETTINGS,...EDITABLE_BOOLEAN_SETTINGS].map(k=>[k,card[k]]));
    const submittedCardIdentity=cardIdentity(operatorCard);
    const simulationMutationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    const exactTicker = String(q?.ticker || '');
    if (!exactTicker) return null;
    const tickerLockKey = starlightModelClone===true
      ? `${exactTicker}|attack:${concept}|seat:${Number(stackIndex||1)}`
      : this.hunterConcurrencyLockKey(concept, exactTicker, s, stackIndex);
    const pipelineAttemptId = `${Date.now()}-${++this.entryPipelineAttemptSequence}`;
    let starlightIntentBoundaryEntered=false;
    let starlightPreIntentDenial=null;
    if(starlightRecovery===true && s.mode==='LIVE' && starlightRecoverySnapshot?.authorizationId)
      this.lastStarlightRefusalByAuth?.delete(String(starlightRecoverySnapshot.authorizationId));
    const crystalWallIndependentEntry=legacyCompatibility!==true&&concept==='Recovery Hunter'&&crystalWallFireCommand!=null;
    const justiceArrowIndependentEntry=legacyCompatibility!==true&&concept==='Sagittarius Justice Arrow'&&justiceArrowFireCommand!=null;
    const ci1IndependentEntry=legacyCompatibility!==true&&ci1FireCommand!=null&&CI1_WALL_CLONE.saints.includes(String(concept||''))&&concept!=='Recovery Hunter'&&concept!=='Sagittarius Justice Arrow';
    const independentCrashRecoveryEntry=crystalWallIndependentEntry||justiceArrowIndependentEntry||ci1IndependentEntry;
    const scarletContinuationEntry=false;
    const lightningPlasmaContinuationEntry=false;
    // SE2-R6 operator authorization: Starlight is an independent post-loss
    // recovery entry, governed by its OWN observation deadline/geometry/band.
    // The ordinary 10-120 / 30-120 Game Clock is not its strategic veto.
    // This does not waive LIVE arming, lifecycle, orderbook, stake, fee, capital,
    // Aurora, owner/epoch CAS, or last-moment signal revalidation.
    const strategicClockBypass=independentCrashRecoveryEntry||scarletContinuationEntry||lightningPlasmaContinuationEntry||starlightRecovery===true||lightningPlasmaScaleIn===true||starlightModelClone===true||independentRecovery===true;
    const fullConfiguredSizeRequired=independentCrashRecoveryEntry||scarletContinuationEntry||lightningPlasmaContinuationEntry;
    let independentAuthority=null;
    let independentParent=null;
    let executionAuthorityCommand=independentAuthority||(crystalWallIndependentEntry?crystalWallFireCommand:justiceArrowIndependentEntry?justiceArrowFireCommand:ci1IndependentEntry?ci1FireCommand:athenaFireCommand);
    const lineage=executionAuthorityCommand?.decisionEvidence?.crystalWall||executionAuthorityCommand?.decisionEvidence?.justiceArrow||executionAuthorityCommand?.decisionEvidence?.ci1WallClone;
    let witness=lineage?structuredClone(lineage):null;
    const signalAt=(state,quote,at=Date.now(),config=this.getSettings())=>crystalWallIndependentEntry?crystalWallSignalState(state,quote,config,at):justiceArrowIndependentEntry?justiceArrowSignalState(state,quote,config,at):independentCi1SignalState(concept,state,quote,config,at);
    let releaseWitness=null;
    // Subscription starts before any await and is always released in finally.
    const observeWitness=(quote)=>{if(witness)witness=signalAt(witness,quote);};
    let candidateId=String(executionAuthorityCommand?.decisionEvidence?.preBoltClearance?.preBoltId||entryQualificationSnapshot?.preBoltClearance?.preBoltId||executionAuthorityCommand?.authorizationId||executionAuthorityCommand?.boltId||entryQualificationSnapshot?.boltId||'');
    let boltId=String(executionAuthorityCommand?.authorizationId||executionAuthorityCommand?.boltId||entryQualificationSnapshot?.boltId||'');
    const trace = (stage, status, reason = null, data = {}) => {
      if(starlightRecovery===true && s.mode==='LIVE' && !starlightIntentBoundaryEntered){
        if(status==='BLOCKED')starlightPreIntentDenial={stage:String(stage),
          reason:String(reason||stage),attemptId:pipelineAttemptId};
        else if(status==='PASS')starlightPreIntentDenial=null;
      }
      // A caller-scoped Multiply witness records the last actual rejection
      // without consulting other concurrent attempts or changing any gate.
      if(lightningPlasmaScaleIn===true && multiplySeatDiagnostic && typeof multiplySeatDiagnostic==='object'){
        multiplySeatDiagnostic.stage=String(stage||'UNKNOWN');
        multiplySeatDiagnostic.status=String(status||'INFO');
        multiplySeatDiagnostic.reason=reason==null?null:String(reason);
        if(status==='BLOCKED')multiplySeatDiagnostic.blocked={stage:multiplySeatDiagnostic.stage,reason:multiplySeatDiagnostic.reason};
      }
      if(starlightModelClone===true && cloneRefusal && typeof cloneRefusal==='object' && status==='BLOCKED'){
        cloneRefusal.stage=String(stage||'UNKNOWN');
        cloneRefusal.reason=reason==null?String(stage||'blocked'):String(reason);
      }
      if(starlightLink && status==='BLOCKED'){
        this.starlightLinkRejectByAuth=this.starlightLinkRejectByAuth||new Map();
        this.starlightLinkRejectByAuth.set(String(starlightRecoverySnapshot?.authorizationId||''), String(reason||stage||'link_not_filled_at_stop'));
      }
      return this.recordEntryPipeline(pipelineAttemptId, concept, exactTicker, stage, status, reason, {candidateId:candidateId||null,boltId:boltId||null,eventTicker:q?.eventTicker||q?.ticker||null,
      ...(starlightRecovery===true?{starlightRecoveryParentEntryId:String(sourceTradeId||'')}:{}),...data});
    };
    trace('RECEIVED','PASS',null,{eventTicker:String(q?.eventTicker || exactTicker),sourceFeeder:sourceFeeder || null,galacticExplosionEnabled:s.galacticExplosionEnabled===true,concurrencyLockKey:tickerLockKey});
    // EMI1 defense-in-depth: Engine scheduling is the primary mode boundary,
    // but createHunter itself must independently fail closed before any market
    // refresh, capital work, or broker mutation if LIVE is not currently armed.
    const starlightRealEarly=concept==='Crash Recovery Hunter' && starlightRecovery===true && s.starlightExtinctionRealTradeEnabled===true;
    const starlightClaimedCapitalProof=concept==='Crash Recovery Hunter'&&starlightRecovery===true
      &&s.mode==='LIVE'&&starlightRecoverySnapshot?.virtualGroupVersion===STARLIGHT_CAPITAL_VERSION;
    if ((!isShadowSaintConcept(concept) || lightningPlasmaScaleIn===true || starlightRealEarly || starlightModelClone===true || independentRecovery===true) && s.mode === 'LIVE' && !this.getLiveReady(independentRecovery===true?concept:null)) {
      trace('MODE_AUTHORIZATION','BLOCKED','live_not_ready');
      if(starlightClaimedCapitalProof){
        await this.recordStarlightSourcePreIntentRefusal({snapshot:starlightRecoverySnapshot,
          quote:q,reason:'live_not_ready',stage:'MODE_AUTHORIZATION',attemptId:pipelineAttemptId}).catch(()=>null);
      }
      await this.audit('hunter_entry_mode_authorization_blocked',{concept,ticker:exactTicker,eventTicker:q?.eventTicker || exactTicker,mode:s.mode,scaleIn:lightningPlasmaScaleIn===true});
      return null;
    }

    const observationKey={ 'Momentum Hunter':'momentumHunterObservationMinutes','Wave Surfer':'waveSurferObservationMinutes','Crash Recovery Hunter':'crashRecoveryHunterObservationMinutes','Recovery Hunter':'crystalWallObservationMinutes','Scarlet Needle':'scarletNeedleObservationMinutes','Lightning Plasma':'lightningPlasmaObservationMinutes','Sagittarius Justice Arrow':'justiceArrowObservationMinutes','Athena Exclamation':'athenaExclamationObservationMinutes' }[concept];
    const observationMinutes=Math.max(0,Math.min(1000,Math.round(Number(s[observationKey])||0)));
    const observationLineage=lineage||athenaFireCommand?.decisionEvidence?.crystalWall||athenaFireCommand?.decisionEvidence?.justiceArrow||crystalWallFireCommand?.decisionEvidence?.crystalWall||justiceArrowFireCommand?.decisionEvidence?.justiceArrow||ci1FireCommand?.decisionEvidence?.ci1WallClone||ci1SourceSnapshot||crystalWallSourceSnapshot||justiceArrowSourceSnapshot||{};
    const episodeId=String(observationLineage.crashEpisodeId||'');
    const releaseKey=`${concept}|${exactTicker}|${episodeId}`;
    const releaseMatches=this.observationReleaseAttempt?.key===releaseKey;
    const waitRow=this.observationWaits?.get(releaseKey);
    const armedAt=Number(waitRow?.armedAtMs||this.observationReleaseAttempt?.armedAtMs||0);
    const eligible=starlightRecovery===true||lightningPlasmaScaleIn===true||starlightModelClone===true||independentRecovery===true||observationMinutes===0||(armedAt>0&&Date.now()>=armedAt+observationMinutes*60_000);
    if(observationMinutes>0 && !eligible){
      if(!waitRow)await this.armObservationWait({...observationLineage,concept,ticker:exactTicker,eventTicker:q?.eventTicker||exactTicker,stakeCents,minutes:observationMinutes,armedAtMs:Date.now(),authorizationId:observationLineage.authorizationId||null,crashEpisodeId:episodeId,parentAuthorizationId:observationLineage.parentAuthorizationId||null});
      return null;
    }
    if(releaseMatches && waitRow)waitRow.consumed=true;
    if(observationRelease===true){
      const envelope=hunterEntryEnvelope(s,concept);
      const ask=Number(q?.yesAsk||0);
      if(!envelope||!(ask>=envelope.minEntryCents&&ask<=envelope.maxEntryCents)){
        await this.audit('observation_wait_expired_out_of_band',{concept,ticker:exactTicker,ask,min:envelope?.minEntryCents??null,max:envelope?.maxEntryCents??null});
        return null;
      }
    }
    if (s.mode !== 'LIVE' && s.mode !== 'SIMULATION') {
      trace('MODE_AUTHORIZATION','BLOCKED','invalid_mode',{mode:s.mode});
      return null;
    }
    trace('MODE_AUTHORIZATION','PASS',s.mode === 'LIVE' ? 'live_ready' : 'simulation');
    if (this.hunterTickerLocks.has(tickerLockKey)) {
      trace('LOCAL_TICKER_LOCK','BLOCKED','local_ticker_lock_busy');
      if(starlightClaimedCapitalProof){
        await this.recordStarlightSourcePreIntentRefusal({snapshot:starlightRecoverySnapshot,
          quote:q,reason:'local_ticker_lock_busy',stage:'LOCAL_TICKER_LOCK',attemptId:pipelineAttemptId}).catch(()=>null);
      }
      await this.audit('hunter_exact_ticker_lock_busy', { concept, ticker: exactTicker, eventTicker: q?.eventTicker || exactTicker });
      return null;
    }
    this.hunterTickerLocks.add(tickerLockKey);
    if(independentCrashRecoveryEntry && typeof this.market?.subscribeQuote==='function')releaseWitness=this.market.subscribeQuote(exactTicker,observeWitness);
    let dbEntryCommitUnlock = null;
    let localEntryCommitKey = null;
    const releaseEntryCommitLock = async () => {
      if (dbEntryCommitUnlock) {
        const unlock=dbEntryCommitUnlock;dbEntryCommitUnlock=null;
        await unlock();
      }
      if (localEntryCommitKey) {
        this.hunterEntryCommitLocks.delete(localEntryCommitKey);
        localEntryCommitKey=null;
      }
    };
    try {
      // HF3: do not hold a session advisory-lock connection across the long
      // market/clock/Athena qualification path. The process-local Attack/ticker
      // lock prevents duplicate work in this process; cross-process uniqueness
      // is authoritatively rechecked under the short exact-ticker commit lock
      // immediately before persistence.
      if (!isModelEnabled(s, concept) && !((starlightModelClone===true || independentRecovery===true) && ((concept==='Lightning Plasma' && s.lightningPlasmaEnabled===true) || (concept==='Sagittarius Arrow Recovery' && s.sagittariusArrowEnabled===true)))) {
      trace('MODEL_ENABLEMENT','BLOCKED','model_disabled');
      await this.audit('model_entry_disabled', { concept, ticker: q.ticker, kind: 'hunter' });
      return null;
      }
      const newGenerationEntry=legacyCompatibility!==true;
      let fireValidation=null, legacyDoctrineEvidence=null;
      let cloneAuthority=null;
      if(independentRecovery===true && starlightModelClone!==true){
        if(!['Lightning Plasma','Sagittarius Arrow Recovery'].includes(concept)
          ||starlightRecovery===true||lightningPlasmaScaleIn===true||legacyCompatibility===true
          ||!sourceTradeId){
          trace('INDEPENDENT_RECOVERY','BLOCKED','independent_source_or_concept_invalid');return null;
        }
        const attackEnabled = concept==='Lightning Plasma' ? s.lightningPlasmaEnabled===true
          : concept==='Sagittarius Arrow Recovery' ? s.sagittariusArrowEnabled===true : false;
        if(!attackEnabled){
          trace('INDEPENDENT_RECOVERY','BLOCKED','attack_disabled');return null;
        }
        if(!this.db?.verifiedShadowStop){
          trace('INDEPENDENT_RECOVERY','BLOCKED','independent_stop_reader_unavailable');return null;
        }
        let stopRecord=null;
        try{stopRecord=await this.db.verifiedShadowStop(String(sourceTradeId),shadowScope(s));}
        catch(error){trace('INDEPENDENT_RECOVERY','BLOCKED','independent_stop_lookup_failed');return null;}
        const parent=stopRecord?.parent;
        if(!parent||parent.conceptName!=='Athena Exclamation'||parent.status!=='closed'
          ||parent.closeReason!=='hard_stop_loss'||!(Number(parent.pnlCents)<0)
          ||parent.executionClass!=='SHADOW_SAINT'||parent.archived===true||Number(parent.remainingCount)!==0
          ||parent.ticker!==exactTicker||parent.systemName!==s.systemName
          ||parent.ownerId!==s.ownerId||parent.mode!==s.mode
          ||Number(parent.shadowEpoch)!==Number(s.resetTimestampMs||0)){
          trace('INDEPENDENT_RECOVERY','BLOCKED','independent_parent_stop_invalid');return null;
        }
        const stake=concept==='Lightning Plasma'
          ? Number(s.lightningPlasmaFieldStakeCents||0)
          : Number(s.sagittariusArrowStakeCents||0);
        const maxEntry=Number(hunterEntryEnvelope(s,concept)?.maxEntryCents);
        const envelope=hunterEntryBoundaryQualifiedAtQuote(concept,q,s);
        if(!envelope.ok){trace('INDEPENDENT_RECOVERY','BLOCKED',envelope.reason);return null;}
        fireValidation={ok:true,reason:'independent_athena_stop',stakeCents:stake,authorizedMaxEntryCents:maxEntry};
        if(Math.abs(Number(stakeCents)-stake)>1e-9){
          trace('INDEPENDENT_RECOVERY','BLOCKED','independent_stake_changed');return null;
        }
        trace('INDEPENDENT_RECOVERY','PASS','independent_verified_athena_stop',{
          parentEntryId:sourceTradeId,concept,stakeCents:stake});
        // IA3: this authority exists ONLY after the database has validated the
        // immutable parent hard-stop and the matching durable independent watch.
        // Never manufacture an ordinary Athena FIRE command for this pathway.
        const independentWatch=starlightRecoverySnapshot;
        if(!independentWatch || independentWatch.independentRecovery!==true
          || independentWatch.authorization!=='VALID_SHADOW_HARD_STOP'
          || independentWatch.parentConcept!=='Athena Exclamation'
          || independentWatch.parentEntryId!==String(sourceTradeId)
          || independentWatch.concept!==concept
          || independentWatch.ticker!==exactTicker
          || independentWatch.eventTicker!==String(q.eventTicker||exactTicker)
          || independentWatch.systemName!==s.systemName
          || independentWatch.ownerId!==s.ownerId
          || independentWatch.mode!==s.mode
          || Number(independentWatch.resetEpoch)!==Number(s.resetTimestampMs||0)
          || independentWatch.link!==(concept==='Lightning Plasma'
            ?s.lightningPlasmaLinkEnabled===true:s.sagittariusArrowLinkEnabled===true)
          || independentWatch.status!=='WATCHING'||independentWatch.qualified!==true
          || !Number.isSafeInteger(Number(independentWatch.lastQuoteAtMs))
          || Number(independentWatch.lastQuoteAtMs)<=0
          || Number(independentWatch.lastQuoteAtMs)>Date.now()
          || Date.now()-Number(independentWatch.lastQuoteAtMs)>5000
          || Number(independentWatch.lastQuoteAtMs)>Number(q.quoteAtMs)
          || !String(independentWatch.lastQuoteEpoch||'')
          || !Number.isSafeInteger(Number(independentWatch.lastQuoteRevision))
          || Number(independentWatch.lastQuoteRevision)<1
          || !Number.isSafeInteger(Number(independentWatch.revision))
          || Number(independentWatch.revision)<1
          || !String(independentWatch.authorizationId||'').startsWith(`INDEPENDENT:${concept}:`)
          || !String(stopRecord?.proofHash||'')){
          trace('INDEPENDENT_RECOVERY','BLOCKED','independent_durable_watch_or_proof_missing');return null;
        }
        independentParent=parent;
        const authorityIdentity={version:'INDEPENDENT-ATHENA-LOSS-V2',
          parentEntryId:String(sourceTradeId),parentProofHash:String(stopRecord.proofHash),
          watchAuthorizationId:String(independentWatch.authorizationId),
          watchRevision:Number(independentWatch.revision),
          signalQuoteAtMs:Number(independentWatch.lastQuoteAtMs),
          signalQuoteEpoch:String(independentWatch.lastQuoteEpoch),
          signalQuoteRevision:Number(independentWatch.lastQuoteRevision),
          concept,ticker:exactTicker,eventTicker:String(q.eventTicker||exactTicker),
          systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
          resetEpoch:Number(s.resetTimestampMs||0)};
        independentAuthority={...authorityIdentity,
          authorizationId:`INDEP-STOP:${authorityHash(authorityIdentity)}`,
          authorityMode:'INDEPENDENT_ATHENA_SHADOW_STOP',
          verifiedStop:true,parentClosedAtMs:Number(parent.closedAtMs||0),
          parentPnlCents:Number(parent.pnlCents),
          authorizedAskCents:Number(q.yesAsk),
          authorizedMaxEntryCents:maxEntry,stakeCents:stake,
          economicTarget:{version:'INDEPENDENT-ECONOMIC-TARGET-V1',
            netPerOriginalContractCents:Number(attackMinProfitNetPerOriginal(s,concept)||0)},
        };
        // The original command variable was initialized before the verified
        // parent existed. Rebind both execution identity and the broker hard-
        // reject key to this specific, durable parent/attack authorization.
        executionAuthorityCommand=independentAuthority;
        candidateId=independentAuthority.authorizationId;
        boltId=independentAuthority.authorizationId;

      }
      if(starlightModelClone===true){
        if(!['Lightning Plasma','Sagittarius Arrow Recovery'].includes(concept)
          ||starlightRecovery===true||lightningPlasmaScaleIn===true||legacyCompatibility===true
          ||!sourceTradeId||!Number.isSafeInteger(Number(stackIndex))||Number(stackIndex)<1){
          trace('SC_CLONE_AUTHORITY','BLOCKED','sc_clone_source_or_concept_invalid');return null;
        }
        if(!this.db?.verifiedShadowStop){
          trace('SC_CLONE_AUTHORITY','BLOCKED','sc_clone_durable_stop_reader_unavailable');return null;
        }
        try{cloneAuthority=await this.db.verifiedShadowStop(String(sourceTradeId),shadowScope(s));}
        catch(error){trace('SC_CLONE_AUTHORITY','BLOCKED','sc_clone_durable_stop_lookup_failed');return null;}
        const parent=cloneAuthority?.parent,watch=cloneAuthority?.watch;
        const cloneId=`STARLIGHT-CLONE:${concept}:${sourceTradeId}`;
        if(!parent||parent.conceptName!=='Athena Exclamation'||parent.status!=='closed'
          ||parent.closeReason!=='hard_stop_loss'||!(Number(parent.pnlCents)<0)
          ||parent.executionClass!=='SHADOW_SAINT'||parent.archived===true||Number(parent.remainingCount)!==0
          ||watch?.parentEntryId!==sourceTradeId||!['WATCHING','READY','EXECUTING','CONSUMED'].includes(watch?.status)
          ||!(Number(watch.revision)>0)||watch?.shadowProofHash!==cloneAuthority.proofHash
          ||watch?.ticker!==exactTicker||watch?.eventTicker!==String(q.eventTicker||exactTicker)
          ||parent.ticker!==exactTicker||parent.eventTicker!==watch.eventTicker
          ||parent.systemName!==s.systemName||parent.ownerId!==s.ownerId||parent.mode!==s.mode
          ||Number(parent.shadowEpoch)!==Number(s.resetTimestampMs||0)
          ||watch.systemName!==s.systemName||watch.ownerId!==s.ownerId||watch.mode!==s.mode
          ||Number(watch.resetEpoch)!==Number(s.resetTimestampMs||0)
          ||!Array.isArray(watch.modelClones)||!watch.modelClones.some(x=>x.id===cloneId&&x.concept===concept)){
          trace('SC_CLONE_AUTHORITY','BLOCKED','sc_clone_durable_watch_or_stop_invalid');return null;
        }
        const rise=athenaStarlightTriggerDecision({settings:s,parent,watch,quote:q,now:Date.now(),liveEpoch:this.market?.quoteEpoch||''});
        if(!rise.ok){trace('SC_CLONE_AUTHORITY','BLOCKED',rise.reason);return null;}
        const envelope=hunterEntryBoundaryQualifiedAtQuote(concept,q,s);
        if(!envelope.ok){trace('SC_CLONE_AUTHORITY','BLOCKED',envelope.reason);return null;}
        fireValidation={ok:true,reason:'sc_clone_verified_durable_stop',stakeCents:Number(s.crashRecoveryStakeCents),authorizedMaxEntryCents:Number(s.crashRecoveryMaxEntryCents)};
        if(Math.abs(Number(stakeCents)-Number(fireValidation.stakeCents))>1e-9){
          trace('SC_CLONE_AUTHORITY','BLOCKED','sc_clone_stake_changed');return null;
        }
        trace('SC_CLONE_AUTHORITY','PASS','sc_clone_verified_parent_and_signal',{
          parentEntryId:sourceTradeId,watchId:watch.authorizationId,watchRevision:watch.revision,seat:Number(stackIndex)});
      }
      let lpInitialParentEntryPriceCents=null,lpInitialParentAuthority=null,lpInitialObservation=null;
      if(lightningPlasmaScaleIn===true){
        const parentId=String(parentStarlightId||sourceTradeId||'');
        if(concept!=='Lightning Plasma' || !parentId){
          trace('LP_SCALEIN','BLOCKED','scalein_parent_required');
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'scalein_parent_required'});
          return null;
        }
        if(s.lightningPlasmaEnabled!==true){
          trace('LP_SCALEIN','BLOCKED','lp_disabled');
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'lp_disabled'});
          return null;
        }
        const thr=Number(s.lightningPlasmaStarlightScaleInCents);
        if(!Number.isFinite(thr)||thr<=0){
          trace('LP_SCALEIN','BLOCKED','threshold_off');
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'threshold_off'});
          return null;
        }
        // Joined durable authority, not an in-memory OPEN-only assertion. No
        // missing-database fallback may manufacture post-close eligibility.
        let parent=null;
        if(typeof this.db?.lightningParentById==='function'){
          try{parent=await this.db.lightningParentById(parentId);}catch{parent=null;}
        }
        const eligibility=lightningParentEligibility(parent,s,{ticker:q?.ticker});
        if(!eligibility.ok){
          trace('LP_SCALEIN','BLOCKED',eligibility.reason);
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:eligibility.reason,parentStarlightId:parentId});
          return null;
        }
        lpInitialParentAuthority=eligibility;
        lpInitialObservation=parent.lpObservation||null;
        const geometry=plasmaGeometryEligibility(lpInitialObservation,s,q);
        if(!geometry.ok){trace('LP_SCALEIN','BLOCKED',geometry.reason);return null;}
        lpInitialParentEntryPriceCents=Number(parent.entryPriceCents);
        const bid=Number(q?.yesBid||0), ask=Number(q?.yesAsk||0);
        const profitCents=bid-Number(parent.entryPriceCents||0);
        if(!(bid>0) || profitCents+1e-9<thr){
          trace('LP_SCALEIN','BLOCKED','below_threshold_at_commit',{bid,profitCents,thresholdCents:thr});
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'below_threshold_at_commit',profitCents,thresholdCents:thr});
          return null;
        }
        const envelope=hunterEntryEnvelope(s,concept);
        if(!envelope||!(ask>=envelope.minEntryCents&&ask<=envelope.maxEntryCents)){
          trace('LP_SCALEIN','BLOCKED','entry_band',{ask,min:envelope?.minEntryCents??null,max:envelope?.maxEntryCents??null});
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'entry_band',ask,min:envelope?.minEntryCents??null,max:envelope?.maxEntryCents??null});
          return null;
        }
        // Durable seat cap. Counts open and closed so a restart or a second
        // actor cannot exceed Multiply for this parent.
        const multiply=attackMultiplySeats(s,'Lightning Plasma');
        let used=0;
        if(typeof this.db?.pool?.query==='function'){
          try{
            const r=await this.db.pool.query(
              "select count(*)::int as n from sag_entries where system_name=$1 and owner_id=$2 and mode=$3 and concept_name='Lightning Plasma' and source_trade_id=$4 and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT' and coalesce(entry_config->>'executionClass','CAPITAL')<>'SHADOW_SAINT' and not (status='rejected' and coalesce(remaining_count,0)=0)",
              [s.systemName,s.ownerId,s.mode,parentId],
            );
            used=Number(r.rows?.[0]?.n||0);
          }catch{used=multiply;}
        }
        if(used>=multiply){
          trace('LP_SCALEIN','BLOCKED','multiply_full',{used,multiply});
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'multiply_full',used,multiply,parentStarlightId:parentId});
          return null;
        }
        fireValidation={ok:true,reason:'lp_scalein_authority',stakeCents:Number(s.lightningPlasmaFieldStakeCents||0),authorizedMaxEntryCents:envelope.maxEntryCents};
        trace('LP_SCALEIN','PASS','starlight_scoped_profit_authority',{parentStarlightId:parentId,thresholdCents:thr,ask,profitCents,used,multiply});
      }
      if(newGenerationEntry && starlightRecovery!==true && lightningPlasmaScaleIn!==true && starlightModelClone!==true && independentRecovery!==true){
        if(concept==='Recovery Hunter'&&!crystalWallIndependentEntry){
          trace('CRYSTAL_WALL_FIRE','BLOCKED','crystal_wall_v3_authority_required');
          await this.audit('crystal_wall_v3_execution_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:'crystal_wall_v3_authority_required'});
          return null;
        }
        if(concept==='Sagittarius Justice Arrow'&&!justiceArrowIndependentEntry){
          trace('JUSTICE_ARROW_FIRE','BLOCKED','justice_arrow_v2_authority_required');
          await this.audit('justice_arrow_v2_execution_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:'justice_arrow_v2_authority_required'});
          return null;
        }
        fireValidation=crystalWallIndependentEntry
          ? validateCrystalWallFireCommand(crystalWallFireCommand,{q,settings:s,now:Date.now()})
          : justiceArrowIndependentEntry
            ? validateJusticeArrowFireCommand(justiceArrowFireCommand,{q,settings:s,now:Date.now()})
            : ci1IndependentEntry
              ? validateIndependentCi1FireCommand(ci1FireCommand,{concept,q,settings:s,now:Date.now()})
              : validateAthenaFireCommand(athenaFireCommand,{concept,q,settings:s,now:Date.now()});
        const fireStage=crystalWallIndependentEntry?'CRYSTAL_WALL_FIRE':justiceArrowIndependentEntry?'JUSTICE_ARROW_FIRE':ci1IndependentEntry?'CI1_WALL_CLONE_FIRE':'ATHENA_FIRE';
        const independentAudit=crystalWallIndependentEntry?'crystal_wall_v3_execution_blocked':justiceArrowIndependentEntry?'justice_arrow_v2_execution_blocked':ci1IndependentEntry?'ci1_wall_clone_execution_blocked':'athena_fire_execution_blocked';
        if(!fireValidation.ok){
          trace(fireStage,'BLOCKED',fireValidation.reason,fireValidation);
          await this.audit(independentAudit,{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:fireValidation.reason,authorizationId:executionAuthorityCommand?.authorizationId||null,boltId:athenaFireCommand?.boltId||null});
          return null;
        }
        if(Math.abs(Number(stakeCents)-Number(fireValidation.stakeCents))>1e-9){
          trace(fireStage,'BLOCKED','attack_stake_not_commanded',{stakeCents,commandedStakeCents:fireValidation.stakeCents});
          return null;
        }
        trace(fireStage,'PASS','command_verified',{authorizationId:executionAuthorityCommand?.authorizationId||null,boltId:athenaFireCommand?.boltId||null,authorizedMaxEntryCents:fireValidation.authorizedMaxEntryCents??executionAuthorityCommand?.authorizedMaxEntryCents??null});
      }
      if (legacyCompatibility===true && sourceFeeder && !isModelEnabled(s, sourceFeeder)) {
      trace('SOURCE_ENABLEMENT','BLOCKED','source_feeder_disabled',{sourceFeeder});
      await this.audit('model_source_feeder_disabled', { concept, sourceFeeder, ticker: q.ticker });
      return null;
      }
      trace('MODEL_ENABLEMENT','PASS');
      // R58 FIRE/execution boundary: a sealed Athena command may be aborted by
      // hard exposure topology, but never by the old shared strategic cooldown.
      // Legacy paths keep the historical policy. Exact subreasons are surfaced
      // so a future choke cannot hide behind generic STATIC_POLICY telemetry.
      if(independentCrashRecoveryEntry){
        const capacity=(isShadowSaintConcept(concept)&&!starlightRealEarly&&!lightningPlasmaScaleIn&&!starlightModelClone&&!independentRecovery)?{active:0,maximum:null,blocked:false,virtual:true}:await this.portfolioCapacityState();
        const event=starlightRecovery===true?'starlight_recovery_capacity_blocked':crystalWallIndependentEntry?'crystal_wall_v3_capacity_blocked':justiceArrowIndependentEntry?'justice_arrow_v2_capacity_blocked':'ci1_wall_clone_capacity_blocked';
        if(capacity.blocked){trace('PORTFOLIO_CAPACITY','BLOCKED','max_positions',capacity);await this.audit(event,{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,...capacity});return null;}
        trace('PORTFOLIO_CAPACITY','PASS',null,capacity);
      }
      const specialistStage=crystalWallIndependentEntry?'crystal_wall_preflight':justiceArrowIndependentEntry?'justice_arrow_preflight':ci1IndependentEntry?'ci1_wall_clone_preflight':newGenerationEntry?'post_fire_preflight':'legacy_preflight';
      const preExecutionPolicy=await this.hunterEntryPolicyDecision(concept,q,{requireClock:false,includeCooldown:!newGenerationEntry&&starlightRecovery!==true&&starlightModelClone!==true&&independentRecovery!==true,stage:specialistStage,crystalWallOverlay:independentCrashRecoveryEntry,starlightRecovery,lightningPlasmaScaleIn,starlightModelClone});
      if(!preExecutionPolicy.ok){trace(newGenerationEntry?'EXECUTION_POLICY':'STATIC_POLICY','BLOCKED',preExecutionPolicy.reason,preExecutionPolicy);return null;}
      trace(newGenerationEntry?'EXECUTION_POLICY':'STATIC_POLICY','PASS',preExecutionPolicy.reason,preExecutionPolicy);

      // Ordinary attacks require the shared Game Clock. Crystal Wall V3 is
      // intentionally exempt because the independently observed CI1 crash and
      // rebound are its timing authority. Lifecycle/fresh-book truth remains
      // mandatory immediately below and again at the broker boundary.
      const executionMinGameMinutes = Math.max(0, Number(s.minGameMinutes ?? 20));
      const executionMaxGameMinutes = Math.max(0, Number(s.maxGameMinutes ?? 0));
      let executionElapsed=null;
      if(strategicClockBypass){
        trace('GAME_CLOCK','PASS',starlightRecovery===true?'starlight_post_stop_loss_authority_exempt':crystalWallIndependentEntry?'crystal_wall_crash_authority_exempt':justiceArrowIndependentEntry?'justice_arrow_crash_authority_exempt':ci1IndependentEntry?'ci1_wall_clone_crash_authority_exempt':'scarlet_crystal_wall_win_authority_exempt',{minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes});
      }else{
        if (!this.refreshGameClock) {
          trace('GAME_CLOCK','BLOCKED','clock_refresh_unavailable');
          await this.audit('hunter_clock_refresh_unavailable', { concept, ticker: q.ticker, eventTicker: q.eventTicker || q.ticker });
          return null;
        }
        const refreshed = await this.refreshGameClock(q, { forceFresh: true }).catch(() => null);
        if (!refreshed?.gameClockState) {
          trace('GAME_CLOCK','BLOCKED','clock_refresh_failed');
          await this.audit('hunter_clock_refresh_failed_closed', { concept, ticker: q.ticker, eventTicker: q.eventTicker || q.ticker });
          return null;
        }
        q.gameClockState = refreshed.gameClockState;
        q.gameStartTimeMs = refreshed.gameStartTimeMs ?? null;
        q.liveStatus = refreshed.liveStatus || q.liveStatus;
        const executionNow = Date.now();
        executionElapsed = confirmedInGameElapsedMinutes(q, executionNow);
        const entryAuthorityFresh = isEntryAuthorizedGameClockState(q.gameClockState, q.eventTicker || q.ticker, executionNow);
        const maximumExceeded=executionMaxGameMinutes>0&&executionElapsed!=null&&executionElapsed-1e-9>executionMaxGameMinutes;
        if (!entryAuthorityFresh || executionElapsed == null || executionElapsed + 1e-9 < executionMinGameMinutes || maximumExceeded) {
          const clockBlockReason=!entryAuthorityFresh?(q.gameClockState?.reason||'entry_authority_not_fresh'):executionElapsed==null?'elapsed_unknown':maximumExceeded?'maximum_game_time':'minimum_game_time';
          trace('GAME_CLOCK','BLOCKED',clockBlockReason,{phase:q.gameClockState?.phase || 'UNKNOWN',entryAuthorized:Boolean(q.gameClockState?.entryAuthorized),elapsedMinutes:executionElapsed,minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes});
          await this.audit('hunter_clock_revalidation_blocked', {
            concept, ticker: q.ticker, eventTicker: q.eventTicker || q.ticker,
            minGameMinutes: executionMinGameMinutes, maxGameMinutes:executionMaxGameMinutes, elapsedMinutes: executionElapsed,
            phase: q.gameClockState?.phase || 'UNKNOWN', reason: q.gameClockState?.reason || null,
            entryAuthorized: Boolean(q.gameClockState?.entryAuthorized),
            evidenceObservedAtMs: Number(q.gameClockState?.evidenceObservedAtMs || 0) || null,
          });
          return null;
        }
        trace('GAME_CLOCK','PASS',q.gameClockState?.authorizationReason || q.gameClockState?.reason || 'authorized',{elapsedMinutes:executionElapsed,minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes});
      }

      // Refresh market + orderbook AFTER the authority call so execution depth,
      // exact event identity and lifecycle are newer than the evidence request.
      const requested = Math.max(1, Math.floor(stakeCents / Math.max(1, q.yesAsk)));
      let plan = await this.prepareEntryExecution(q, requested);
      if (!plan) {
        trace('EXECUTABLE_BOOK','BLOCKED','no_executable_ask',{requested});
        await this.audit('entry_no_executable_ask', { concept, ticker: q.ticker, requested, limitCents: q.yesAsk, mode: s.mode });
        // R12 centralized finally records this denial from the untouched
        // source phase, with exact attempt and no durable intent proof.
        return null;
      }
      if(fullConfiguredSizeRequired&&Number(plan.count||0)!==requested){
        const reason=crystalWallIndependentEntry?'crystal_wall_full_configured_size_unavailable':justiceArrowIndependentEntry?'justice_arrow_full_configured_size_unavailable':'scarlet_needle_full_configured_size_unavailable';
        const event=crystalWallIndependentEntry?'crystal_wall_v3_full_size_blocked':justiceArrowIndependentEntry?'justice_arrow_v2_full_size_blocked':'scarlet_needle_v3_full_size_blocked';
        trace('EXECUTABLE_BOOK','BLOCKED',reason,{requested,filledCount:Number(plan.count||0)});
        await this.audit(event,{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,requested,filledCount:Number(plan.count||0),stakeCents:Number(stakeCents)});
        return null;
      }
      trace('EXECUTABLE_BOOK','PASS',null,{requested,filledCount:Number(plan.count||0),averagePriceCents:Number(plan.averagePriceCents||0),fullConfiguredSizeRequired});
      const freshMarket = plan.freshMarket || this.market?.getQuote?.(q.ticker);
      const expectedEventTicker = String(q.eventTicker || q.ticker);
      const freshEventTicker = String(freshMarket?.eventTicker || freshMarket?.ticker || '');
      const freshStatus = String(freshMarket?.status || '').toLowerCase();
      if (!freshMarket || freshEventTicker !== expectedEventTicker || freshStatus !== 'active' || Boolean(freshMarket?.result)) {
        const lifecycleReason = !freshMarket ? 'fresh_market_missing' : freshEventTicker !== expectedEventTicker ? 'event_identity_mismatch' : freshStatus !== 'active' ? 'market_not_active' : 'market_result_present';
        trace('LIFECYCLE','BLOCKED',lifecycleReason);
        await this.audit('hunter_entry_lifecycle_revalidation_blocked', {
          concept, ticker: q.ticker, eventTicker: expectedEventTicker,
          freshEventTicker: freshEventTicker || null,
          status: freshStatus || null, result: freshMarket?.result || null,
          reason: !freshMarket ? 'fresh_market_missing'
            : freshEventTicker !== expectedEventTicker ? 'event_identity_mismatch'
              : freshStatus !== 'active' ? 'market_not_active'
                : 'market_result_present',
        });
        return null;
      }
      trace('LIFECYCLE','PASS');

      const executionQuote = {
        ...q,
        ...freshMarket,
        ticker:q.ticker,
        eventTicker:expectedEventTicker,
        gameStartTimeMs:q.gameStartTimeMs,
        gameClockState:q.gameClockState,
        liveStatus:q.liveStatus,
      };

      // R51 authority inversion: Athena has already decided the market thesis.
      // Crystal Wall V3 is a separate sealed authority: the crash/rebound thesis
      // is revalidated against the same fresh executable quote, then only hard
      // execution and safety invariants may abort it.
      if(independentCrashRecoveryEntry){
        const freshFire=crystalWallIndependentEntry
          ? validateCrystalWallFireCommand(crystalWallFireCommand,{q:executionQuote,settings:s,now:Date.now()})
          : justiceArrowIndependentEntry
            ? validateJusticeArrowFireCommand(justiceArrowFireCommand,{q:executionQuote,settings:s,now:Date.now()})
            : validateIndependentCi1FireCommand(ci1FireCommand,{concept,q:executionQuote,settings:s,now:Date.now()});
        const stage=crystalWallIndependentEntry?'CRYSTAL_WALL_EXECUTION_ENVELOPE':justiceArrowIndependentEntry?'JUSTICE_ARROW_EXECUTION_ENVELOPE':'CI1_WALL_CLONE_EXECUTION_ENVELOPE';
        const event=crystalWallIndependentEntry?'crystal_wall_v3_fresh_execution_blocked':justiceArrowIndependentEntry?'justice_arrow_v2_fresh_execution_blocked':'ci1_wall_clone_fresh_execution_blocked';
        const command=crystalWallIndependentEntry?crystalWallFireCommand:justiceArrowIndependentEntry?justiceArrowFireCommand:ci1FireCommand;
        const source=crystalWallIndependentEntry?crystalWallSourceSnapshot:justiceArrowIndependentEntry?justiceArrowSourceSnapshot:ci1SourceSnapshot;
        if(!freshFire.ok){
          trace(stage,'BLOCKED',freshFire.reason,freshFire);
          await this.audit(event,{ticker:q.ticker,eventTicker:expectedEventTicker,authorizationId:command?.authorizationId||null,reason:freshFire.reason});
          return null;
        }
        const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
        if(!boundary.ok){trace(stage,'BLOCKED',boundary.reason,boundary);return null;}
        const authorizedMax=Number(command?.authorizedMaxEntryCents||hunterEntryEnvelope(s,concept)?.maxEntryCents||0);
        if(Number(plan.bestAskCents||executionQuote.yesAsk)>authorizedMax+1e-9||Number(plan.averagePriceCents||0)>authorizedMax+1e-9){
          trace(stage,'BLOCKED',crystalWallIndependentEntry?'crystal_wall_strike_price_exceeded':justiceArrowIndependentEntry?'justice_arrow_strike_price_exceeded':'ci1_wall_clone_strike_price_exceeded',{authorizedMaxEntryCents:authorizedMax,bestAskCents:Number(plan.bestAskCents||0),averagePriceCents:Number(plan.averagePriceCents||0)});
          return null;
        }
        if(!source?.crashEpisodeId){trace(stage,'BLOCKED',crystalWallIndependentEntry?'crystal_wall_crash_source_missing':justiceArrowIndependentEntry?'justice_arrow_crash_source_missing':'ci1_wall_clone_crash_source_missing');return null;}
        trace(stage,'PASS','crash_rebound_command_still_executable',{authorizationId:command.authorizationId,crashEpisodeId:source.crashEpisodeId});
      }else if(starlightRecovery===true){
        if(starlightRecoverySnapshot?.shadowProtocol===SHADOW_PROTOCOL){
          const authority=await this.db.verifiedShadowStop?.(starlightRecoverySnapshot.parentEntryId,shadowScope(s));
          if(!authority || authority.proofHash!==starlightRecoverySnapshot.shadowProofHash
            || authority.watch.status!=='EXECUTING' || Number(authority.watch.revision)!==Number(starlightRecoverySnapshot.revision)){
            trace('STARLIGHT_RECOVERY','BLOCKED','durable_shadow_stop_not_verified');return null;
          }
          athenaTriggerParent=authority.parent;
        }
        const live=this.getCurrentStarlightWatch?.(String(starlightRecoverySnapshot?.authorizationId||''));
        if(!live || live.status!=='EXECUTING' || Number(live.revision)!==Number(starlightRecoverySnapshot?.revision)
          || String(live.parentEntryId)!==String(starlightRecoverySnapshot?.parentEntryId)
          || String(live.ticker)!==String(exactTicker)||String(live.mode)!==String(s.mode)
          || String(live.ownerId)!==String(s.ownerId)||Number(live.resetEpoch||0)!==Number(s.resetTimestampMs||0)){
          trace('STARLIGHT_RECOVERY','BLOCKED','recovery_watch_ownership_or_revision_changed');return null;
        }
        const rise=athenaStarlightTriggerDecision({settings:s,parent:athenaTriggerParent,liveEpoch:this.market?.quoteEpoch||'',
          watch:live,quote:executionQuote,stamp:starlightRecoverySnapshot?.athenaTrigger,requireStamp:true});
        if(!rise.ok){trace('ATHENA_STARLIGHT_TRIGGER','BLOCKED',rise.reason,rise);return null;}
        const linkEntry=starlightRecoverySnapshot?.link===true && s.crashRecoveryHunterLinkEnabled===true;
        if(linkEntry){
          const stop=Number(starlightRecoverySnapshot.stopPriceCents);
          if(!(stop>0)||stop>100){trace('STARLIGHT_LINK','BLOCKED','stop_price_invalid');return null;}
          // Link ON: current executable ask, not a price cap tied to the stop.
          // The ordinary full book/size/spread/stake/Aurora checks remain below.
          trace('STARLIGHT_LINK','PASS','verified_athena_stop_current_executable_ask',{stopPriceCents:stop,actualAsk:executionQuote.yesAsk,athenaTrigger:rise});
        }else{
          const liveSignal=starlightRecoverySignalState(live,executionQuote,s,Date.now(),{liveEpoch:this.market?.quoteEpoch||''});
          if(!liveSignal.qualified){trace('STARLIGHT_RECOVERY','BLOCKED',liveSignal.reason);return null;}
          const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
          if(!boundary.ok){trace('STARLIGHT_RECOVERY','BLOCKED',boundary.reason,boundary);return null;}
        }
        trace('STARLIGHT_RECOVERY','PASS','stop_loss_recovery_envelope');
      }else if(lightningPlasmaScaleIn===true){
        const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
        if(!boundary.ok){trace('LP_SCALEIN_ENVELOPE','BLOCKED',boundary.reason,boundary);return null;}
        const envelope=hunterEntryEnvelope(s,concept);
        const ask=Number(plan.bestAskCents||executionQuote.yesAsk||0);
        const avg=Number(plan.averagePriceCents||0);
        if(!envelope||ask<envelope.minEntryCents||ask>envelope.maxEntryCents||avg>envelope.maxEntryCents){
          trace('LP_SCALEIN_ENVELOPE','BLOCKED','entry_band',{ask,avg,min:envelope?.minEntryCents??null,max:envelope?.maxEntryCents??null});
          await this.audit('lightning_plasma_scalein_blocked',{concept,ticker:q.ticker,reason:'fresh_entry_band',ask,avg});
          return null;
        }
        const thr=Number(s.lightningPlasmaStarlightScaleInCents);
        const bid=Number(executionQuote.yesBid||0);
        if(!(bid>0)||!(thr>0)||!(lpInitialParentEntryPriceCents>0)){
          trace('LP_SCALEIN_ENVELOPE','BLOCKED','fresh_mark_missing');
          return null;
        }
        if(bid-lpInitialParentEntryPriceCents+1e-9<thr){
          trace('LP_SCALEIN_ENVELOPE','BLOCKED','parent_profit_reversed',
            {parentStarlightId:String(parentStarlightId||sourceTradeId||''),bid,profitCents:bid-lpInitialParentEntryPriceCents,thresholdCents:thr});
          return null;
        }
        trace('LP_SCALEIN_ENVELOPE','PASS','fresh_executable_in_band',{ask,avg,bid,thresholdCents:thr});
      }else if(starlightModelClone===true){
        const w=cloneAuthority?.watch,p=cloneAuthority?.parent;
        const rise=athenaStarlightTriggerDecision({settings:s,parent:p,watch:w,quote:executionQuote,now:Date.now(),liveEpoch:this.market?.quoteEpoch||''});
        const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
        if(!rise.ok||!boundary.ok){trace('SC_CLONE_EXECUTION_ENVELOPE','BLOCKED',!rise.ok?rise.reason:boundary.reason);return null;}
        if(Number(plan.bestAskCents||0)>Number(s.crashRecoveryMaxEntryCents)
          ||Number(plan.averagePriceCents||0)>Number(s.crashRecoveryMaxEntryCents)){
          trace('SC_CLONE_EXECUTION_ENVELOPE','BLOCKED','sc_clone_executable_price_out_of_band');return null;
        }
        trace('SC_CLONE_EXECUTION_ENVELOPE','PASS','sc_clone_fresh_authority');
      }else if(independentRecovery===true){
        const decision=independentRecoveryExecutionDecision({
          authority:independentAuthority,parent:independentParent,concept,
          sourceTradeId,quote:executionQuote,settings:s,plan,now:Date.now()});
        if(!decision.ok){trace('INDEPENDENT_EXECUTION_ENVELOPE','BLOCKED',decision.reason,decision);return null;}
        trace('INDEPENDENT_EXECUTION_ENVELOPE','PASS','independent_verified_fresh_book',
          {authorizationId:independentAuthority.authorizationId});
      }else if(newGenerationEntry){
        const scarletAuthorityMode=String(athenaFireCommand?.authorityMode||'')===SCARLET_NEEDLE.strategicEntryAuthority;
        const scarletLineage=athenaFireCommand?.decisionEvidence?.scarletContinuation;
        const plasmaAuthorityMode=String(athenaFireCommand?.authorityMode||'')===LIGHTNING_PLASMA.strategicEntryAuthority;
        const plasmaLineage=athenaFireCommand?.decisionEvidence?.lightningPlasmaContinuation;
        const freshFire=validateAthenaFireCommand(athenaFireCommand,{concept,q:executionQuote,settings:s,now:Date.now()});
        if(!freshFire.ok){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED',freshFire.reason,freshFire);
          await this.audit('athena_fire_fresh_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,boltId:athenaFireCommand?.boltId||null,reason:freshFire.reason});
          return null;
        }
        const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
        if(!boundary.ok){trace('FIRE_EXECUTION_ENVELOPE','BLOCKED',boundary.reason,boundary);return null;}
        const authorizedMax=Number(athenaFireCommand.authorizedMaxEntryCents||0);
        if(Number(plan.bestAskCents||executionQuote.yesAsk)>authorizedMax+1e-9||Number(plan.averagePriceCents||0)>authorizedMax+1e-9){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','athena_strike_price_exceeded',{authorizedMaxEntryCents:authorizedMax,bestAskCents:Number(plan.bestAskCents||0),averagePriceCents:Number(plan.averagePriceCents||0)});
          await this.audit('athena_fire_price_moved_beyond_authorization',{concept,ticker:q.ticker,boltId:athenaFireCommand?.boltId||null,authorizedMaxEntryCents:authorizedMax,bestAskCents:Number(plan.bestAskCents||0),averagePriceCents:Number(plan.averagePriceCents||0)});
          return null;
        }
        trace('FIRE_EXECUTION_ENVELOPE','PASS','athena_command_still_executable',{boltId:athenaFireCommand.boltId});
      }else{
        const doctrineValidation=await this.revalidateHunterEntryDoctrine(concept,executionQuote,plan,s,{sourceFeeder,sourceTradeId,recoverySourceSnapshot,crashSourceSnapshot,entryQualificationSnapshot});
        if(!doctrineValidation.ok){trace('DOCTRINE','BLOCKED',doctrineValidation.reason||'doctrine');return null;}
        legacyDoctrineEvidence=structuredClone(doctrineValidation);
        trace('DOCTRINE','PASS','legacy_compatibility');
      }

      // R51: the durable Athena FIRE command is the sole strategic entry
      // authority. R50 B1/B2 remains historical/legacy compatibility only and
      // is never allowed to re-veto a new-generation FIRE command.
      let athenaAssessment=null;
      let athenaExclamationReview=null;
      if(independentCrashRecoveryEntry){
        if(crystalWallIndependentEntry)trace('CRYSTAL_WALL_AUTHORITY','PASS','independent_crash_rebound_authority',{authorizationId:crystalWallFireCommand?.authorizationId||null,crashEpisodeId:crystalWallSourceSnapshot?.crashEpisodeId||null});
        else if(justiceArrowIndependentEntry)trace('JUSTICE_ARROW_AUTHORITY','PASS','independent_crash_rebound_authority_with_athena_x1_exit',{authorizationId:justiceArrowFireCommand?.authorizationId||null,crashEpisodeId:justiceArrowSourceSnapshot?.crashEpisodeId||null});
        else trace('CI1_WALL_CLONE_AUTHORITY','PASS','independent_crash_rebound_authority',{authorizationId:ci1FireCommand?.authorizationId||null,crashEpisodeId:ci1SourceSnapshot?.crashEpisodeId||null,concept});
      }else if(starlightRecovery===true){
        athenaAssessment={version:'SE2-STOP-LOSS-RECOVERY',decision:'FIRE',strategicAuthority:false,executionEnvelopeAuthority:true,authorityMode:'STARLIGHT_STOP_LOSS_RECOVERY',selectedAttack:concept,decisionEvidence:{starlightRecovery:structuredClone(starlightRecoverySnapshot||{})},legacyB2VetoApplied:false,decidedAtMs:Date.now()};
        trace('ATHENA','PASS','stop_loss_recovery_authority',{parentEntryId:starlightRecoverySnapshot?.parentEntryId||null});
      }else if(lightningPlasmaScaleIn===true){
        athenaAssessment={version:'LP-SCALEIN-V1',decision:'FIRE',strategicAuthority:false,executionEnvelopeAuthority:true,authorityMode:'LP_SCALEIN_STARLIGHT_OPEN_PROFIT',selectedAttack:concept,decisionEvidence:{parentStarlightId:String(parentStarlightId||sourceTradeId||''),thresholdCents:Number(s.lightningPlasmaStarlightScaleInCents||0)},legacyB2VetoApplied:false,decidedAtMs:Date.now()};
        trace('ATHENA','PASS','lp_scalein_authority',{parentStarlightId:String(parentStarlightId||sourceTradeId||'')});
      }else if(starlightModelClone===true){
        athenaAssessment={version:MODEL_CLONE_CAPITAL_VERSION,decision:'FIRE',strategicAuthority:false,
          executionEnvelopeAuthority:true,authorityMode:'STARLIGHT_MODEL_CLONE',selectedAttack:concept,
          decisionEvidence:{parentEntryId:sourceTradeId,watchId:cloneAuthority.watch.authorizationId,
            watchRevision:Number(cloneAuthority.watch.revision),seat:Number(stackIndex)},decidedAtMs:Date.now()};
        trace('ATHENA','PASS','sc_clone_parent_scoped_authority');
      }else if(independentRecovery===true){
        athenaAssessment={version:independentAuthority.version,decision:'FIRE',
          strategicAuthority:false,executionEnvelopeAuthority:true,
          authorityMode:independentAuthority.authorityMode,selectedAttack:concept,
          authorizationId:independentAuthority.authorizationId,
          decisionEvidence:{parentEntryId:independentAuthority.parentEntryId,
            parentProofHash:independentAuthority.parentProofHash,
            watchAuthorizationId:independentAuthority.watchAuthorizationId,
            watchRevision:independentAuthority.watchRevision,
            resetEpoch:independentAuthority.resetEpoch},
          legacyB2VetoApplied:false,decidedAtMs:Date.now()};
        trace('ATHENA','PASS','independent_verified_shadow_stop_authority',
          {authorizationId:independentAuthority.authorizationId});
      }else if(newGenerationEntry){
        athenaAssessment={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,decision:'FIRE',strategicAuthority:true,executionEnvelopeAuthority:true,authorityMode:'ATHENA_A3',boltId:athenaFireCommand.boltId,commandHash:athenaFireCommand.commandHash,selectedAttack:concept,ranking:structuredClone(athenaFireCommand.ranking||[]),decisionEvidence:structuredClone(athenaFireCommand.decisionEvidence||{}),survivalCertificate:null,survivalAuthority:null,legacyB2VetoApplied:false,decidedAtMs:Number(athenaFireCommand.decidedAtMs)};
        trace('ATHENA','PASS','supreme_fire_authority',{boltId:athenaFireCommand.boltId,selectedAttack:concept});
      }else if(this.athena&&typeof this.athena.assess==='function'){
        athenaAssessment=this.athena.assess({conceptName:concept,sourceFeeder,ticker:q.ticker,title:executionQuote.title||q.title||q.ticker,entryPriceCents:Number(executionQuote.yesAsk||0),bidCents:Number(executionQuote.yesBid||0),askCents:Number(executionQuote.yesAsk||0),gameMinutes:confirmedInGameElapsedMinutes(q,Date.now())||0});
        if(athenaAssessment.blocked){trace('ATHENA','BLOCKED',athenaAssessment.reason||'legacy_athena_veto');return null;}
        trace('ATHENA','PASS','legacy_compatibility');
      }

      // R45 Galactic Explosion shared-commit boundary. Different Attacks may
      // legitimately coexist on one exact ticker, but shared event caps,
      // simulation cash, durable intent persistence and broker mutation must
      // never be decided concurrently from the same stale ledger
      // view. Serialize only this final commit window; the earlier structural
      // qualification/exposure lock remains concept-scoped when GE is ON.
      localEntryCommitKey = starlightModelClone===true
        ? `commit:${exactTicker}|attack:${concept}|seat:${Number(stackIndex||1)}`
        : this.hunterEntryCommitLockKey(concept, exactTicker, s, stackIndex, stackSeat);
      if (this.hunterEntryCommitLocks.has(localEntryCommitKey)) {
        trace('ENTRY_COMMIT_LOCK','BLOCKED','local_entry_commit_lock_busy');
        await this.audit('hunter_entry_commit_lock_busy',{concept,ticker:exactTicker,eventTicker:expectedEventTicker});
        return null;
      }
      this.hunterEntryCommitLocks.add(localEntryCommitKey);
      if (typeof this.db.acquireHunterTickerLock === 'function') {
        dbEntryCommitUnlock = await this.db.acquireHunterTickerLock(s.systemName, localEntryCommitKey);
        if (!dbEntryCommitUnlock) {
          trace('ENTRY_COMMIT_LOCK','BLOCKED','db_entry_commit_lock_busy');
          await this.audit('hunter_entry_commit_db_lock_busy',{concept,ticker:exactTicker,eventTicker:expectedEventTicker});
          return null;
        }
      }
      trace('ENTRY_COMMIT_LOCK','PASS');

      // The market refresh itself may consume time. Authorization is deliberately
      // short-lived; recheck its freshness at the last executable boundary.
      const finalNow = Date.now();
      if(strategicClockBypass){
        trace('FINAL_CLOCK','PASS',starlightRecovery===true?'starlight_post_stop_loss_authority_exempt':crystalWallIndependentEntry?'crystal_wall_crash_authority_exempt':justiceArrowIndependentEntry?'justice_arrow_crash_authority_exempt':ci1IndependentEntry?'ci1_wall_clone_crash_authority_exempt':'scarlet_crystal_wall_win_authority_exempt');
        const capacity=(isShadowSaintConcept(concept)&&lightningPlasmaScaleIn!==true&&!starlightRealEarly&&!starlightModelClone&&!independentRecovery)?{active:0,maximum:null,blocked:false,virtual:true}:await this.portfolioCapacityState();
        const event=lightningPlasmaScaleIn===true?'lightning_plasma_scalein_capacity_blocked':starlightRecovery===true?'starlight_recovery_capacity_blocked':crystalWallIndependentEntry?'crystal_wall_v3_capacity_blocked':justiceArrowIndependentEntry?'justice_arrow_v2_capacity_blocked':'ci1_wall_clone_capacity_blocked';
        if(capacity.blocked){trace('PORTFOLIO_CAPACITY','BLOCKED','max_positions',capacity);await this.audit(event,{ticker:q.ticker,eventTicker:expectedEventTicker,stage:'commit',...capacity});return null;}
        trace('PORTFOLIO_CAPACITY','PASS','commit_recheck',capacity);
      }else{
        const finalElapsed = confirmedInGameElapsedMinutes(q, finalNow);
        const finalMaximumExceeded=executionMaxGameMinutes>0&&finalElapsed!=null&&finalElapsed-1e-9>executionMaxGameMinutes;
        if (!isEntryAuthorizedGameClockState(q.gameClockState, expectedEventTicker, finalNow)
            || finalElapsed == null || finalElapsed + 1e-9 < executionMinGameMinutes || finalMaximumExceeded) {
          trace('FINAL_CLOCK','BLOCKED',finalMaximumExceeded?'maximum_game_time':'authorization_expired',{elapsedMinutes:finalElapsed,minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes});
          await this.audit('hunter_clock_authorization_expired_before_execution', {
            concept, ticker: q.ticker, eventTicker: expectedEventTicker,
            minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes,elapsedMinutes:finalElapsed,
            reason:finalMaximumExceeded?'maximum_game_time':'authorization_expired',
            evidenceObservedAtMs: Number(q.gameClockState?.evidenceObservedAtMs || 0) || null,
          });
          return null;
        }
        trace('FINAL_CLOCK','PASS');
      }
      // Re-run hard exposure topology at the serialized commit boundary. Crystal
      // Wall's overlay exemption applies only to the parent/other Attack; a
      // second Crystal Wall on the same ticker remains blocked.
      const finalSpecialistStage=crystalWallIndependentEntry?'crystal_wall_commit':justiceArrowIndependentEntry?'justice_arrow_commit':ci1IndependentEntry?'ci1_wall_clone_commit':newGenerationEntry?'post_fire_commit':'legacy_commit';
      const finalEntryPolicy=await this.hunterEntryPolicyDecision(concept,q,{requireClock:false,includeCooldown:!newGenerationEntry&&starlightRecovery!==true&&starlightModelClone!==true&&independentRecovery!==true,stage:finalSpecialistStage,crystalWallOverlay:independentCrashRecoveryEntry,starlightRecovery,lightningPlasmaScaleIn,starlightModelClone});
      if(!finalEntryPolicy.ok){trace('FINAL_ENTRY_POLICY','BLOCKED',finalEntryPolicy.reason,finalEntryPolicy);return null;}
      trace('FINAL_ENTRY_POLICY','PASS',finalEntryPolicy.reason,finalEntryPolicy);
      const finalConfirmation=()=>{
        const currentSettings=this.getSettings();
        if(!sameShadowScope(currentSettings,s) || currentSettings.engineActive===false || (!isModelEnabled(currentSettings,concept) && !((starlightModelClone===true || independentRecovery===true) && ((concept==='Lightning Plasma' && currentSettings.lightningPlasmaEnabled===true) || (concept==='Sagittarius Arrow Recovery' && currentSettings.sagittariusArrowEnabled===true)))) || ((!isShadowSaintConcept(concept)||lightningPlasmaScaleIn===true||starlightModelClone===true||independentRecovery===true||(concept==='Crash Recovery Hunter'&&starlightRecovery===true&&s.starlightExtinctionRealTradeEnabled===true))&&s.mode==='LIVE'&&!this.getLiveReady(independentRecovery===true?concept:null)))return {ok:false,reason:'execution_authority_changed'};
        if(cardIdentity(currentSettings)!==submittedCardIdentity)return {ok:false,reason:'execution_settings_changed'};
        const currentFamily=executionMarketFamilyExclusion(exactTicker,currentSettings,{concept});
        if(currentFamily.blocked)return {ok:false,reason:currentFamily.reason};
        if(starlightRecovery===true){
          const live=this.getCurrentStarlightWatch?.(String(starlightRecoverySnapshot?.authorizationId||''));
          const at=Date.now();
          if(!live || live.status!=='EXECUTING'||Number(live.revision)!==Number(starlightRecoverySnapshot?.revision)
            ||String(live.parentEntryId)!==String(starlightRecoverySnapshot?.parentEntryId)
            ||String(live.ticker)!==String(exactTicker)||String(live.ownerId)!==String(s.ownerId)
            ||String(live.mode)!==String(s.mode)||Number(live.resetEpoch||0)!==Number(s.resetTimestampMs||0))
            return {ok:false,reason:'starlight_watch_authority_changed'};
          const quote=this.market?.getQuote?.(exactTicker);
          if(!quote)return {ok:false,reason:'starlight_fresh_quote_missing'};
          const quoteAt=Number(quote.quoteAtMs);
          if(!(quoteAt>0)||quoteAt>at||at-quoteAt>5000||quote.bookInvalid||quote.status!=='active'||quote.result)
            return {ok:false,reason:'starlight_final_quote_not_executable'};
          const rise=athenaStarlightTriggerDecision({settings:currentSettings,parent:athenaTriggerParent,liveEpoch:this.market?.quoteEpoch||'',
            watch:live,quote,now:at,stamp:starlightRecoverySnapshot?.athenaTrigger,requireStamp:true});
          if(!rise.ok)return rise;
          if(starlightRecoverySnapshot?.link===true && currentSettings.crashRecoveryHunterLinkEnabled===true){
            const stop=Number(starlightRecoverySnapshot.stopPriceCents);
            // Fresh quote must not deteriorate above the executable plan.
            // No stop-price ceiling or ordinary Starlight price band on Link.
            if(!(stop>0)||stop>100 || !(Number(quote.yesAsk)>0)
              ||Number(quote.yesAsk)>Number(plan.bestAskCents)+1e-9)
              return {ok:false,reason:'starlight_link_execution_price_changed'};
            return {ok:true,atMs:at,route:'starlight_link_current_executable_ask',
              stopPriceCents:stop,...(rise.enabled?{athenaTrigger:rise.stamp}:{})};
          }
          const signal=starlightRecoverySignalState(live,quote,currentSettings,at,{liveEpoch:this.market?.quoteEpoch||''});
          if(!signal.qualified)return {ok:false,reason:`starlight_${signal.reason}`};
          if(Number(quote.yesAsk)>Number(q.yesAsk)||!hunterEntryBoundaryQualifiedAtQuote(concept,quote,currentSettings,plan).ok)
            return {ok:false,reason:'starlight_final_execution_envelope_changed'};
          return {ok:true,atMs:at,route:'durable_starlight_recovery',signal,...(rise.enabled?{athenaTrigger:rise.stamp}:{})};
        }
        if(starlightModelClone===true){
          const at=Date.now(),quote=this.market?.getQuote?.(exactTicker)||null;
          if(!quote||quote.ticker!==exactTicker||String(quote.eventTicker||quote.ticker)!==expectedEventTicker
            ||quote.bookInvalid||quote.result||quote.status!=='active'
            ||!Number.isSafeInteger(Number(quote.quoteAtMs))||Number(quote.quoteAtMs)>at
            ||!(Number(quote.quoteObservation?.receivedAtMs)>=Number(cloneAuthority.parent.closedAtMs))
            ||Number(quote.quoteObservation?.receivedAtMs)>at+2000
            ||at-Number(quote.quoteObservation?.receivedAtMs)>Math.min(5000,Number(currentSettings.infinityBreakMaximumBookAgeMs||5000))
            ||Number(quote.quoteObservation?.receivedAtMs)-Number(quote.quoteAtMs)>Math.min(5000,Number(currentSettings.infinityBreakMaximumBookAgeMs||5000))
            ||Number(quote.quoteAtMs)<Number(cloneAuthority.parent.closedAtMs)-Math.min(5000,Number(currentSettings.infinityBreakMaximumBookAgeMs||5000))
            ||at-Number(quote.quoteAtMs)>Math.min(5000,Number(currentSettings.infinityBreakMaximumBookAgeMs||5000))
            ||(cloneAuthority.watch?.lastQuoteEpoch && !(quote.quoteObservation?.epoch && Number(quote.quoteObservation?.revision)>0)))
            return {ok:false,reason:'sc_clone_fresh_quote_missing_or_invalid'};
          const rise=athenaStarlightTriggerDecision({settings:currentSettings,
            parent:cloneAuthority.parent,watch:cloneAuthority.watch,quote,now:at,liveEpoch:this.market?.quoteEpoch||''});
          if(!rise.ok)return rise;
          const envelope=hunterEntryBoundaryQualifiedAtQuote(concept,quote,currentSettings,plan);
          if(!envelope.ok || Number(quote.yesAsk)>Number(plan.bestAskCents)+1e-9)
            return {ok:false,reason:'sc_clone_final_executable_price_or_book_changed'};
          const bookAt=Number(plan.verifiedBookAtMs||0);
          if(!(bookAt>0)||bookAt>at||at-bookAt>5000)
            return {ok:false,reason:'sc_clone_final_book_proof_missing_or_stale'};
          return {ok:true,atMs:at,route:'starlight_model_clone',
            parentEntryId:sourceTradeId,watchId:cloneAuthority.watch.authorizationId,
            quoteAtMs:Number(quote.quoteAtMs),bookProof:{verifiedAtMs:bookAt}};
        }
        if(lightningPlasmaScaleIn===true){
          const at=Date.now();
          const quote=this.market?.getQuote?.(exactTicker)||null;
          const envelope=hunterEntryEnvelope(currentSettings,concept);
          const decision=lightningPlasmaFinalEntrySignal({quote,ticker:exactTicker,
            parentEntryCents:lpInitialParentEntryPriceCents,
            triggerCents:currentSettings.lightningPlasmaStarlightScaleInCents,
            minEntryCents:envelope?.minEntryCents,maxEntryCents:envelope?.maxEntryCents,
            authorizedAskCents:q.yesAsk,now:at,settings:currentSettings,observation:lpInitialObservation});
          if(!decision.ok)return decision;
          if(!envelope || !hunterEntryBoundaryQualifiedAtQuote(concept,quote,currentSettings,plan).ok)
            return {ok:false,reason:'lp_final_entry_guards_changed'};
          // The live IOC must still satisfy the frozen net target at the last
          // permitted dispatch instant, even if signals and Link qualify.
          const currentMinimumNet=Math.max(Number(frozenEntryConfig?.economicTarget?.netPerOriginalContractCents),
            Number(frozenEntryConfig?.athenaExit?.minimumProfitNetPerOriginalContractCents||0),
            Number(frozenEntryConfig?.infinityBreak?.minimumNetPerOriginalContractCents||0));
          const price=Number(plannedEntry);
          const qty=Number(plan?.count);
          const currentFeeEvidence=currentSettings?.simFeeCents;
          if(currentFeeEvidence==null||typeof currentFeeEvidence==='boolean'
            ||(typeof currentFeeEvidence==='string' && currentFeeEvidence.trim()==='')
            ||!Number.isFinite(Number(currentFeeEvidence))||Number(currentFeeEvidence)<0)
            return {ok:false,reason:'lp_fee_evidence_missing_at_final_confirmation'};
          const entryFee=currentSettings.mode==='LIVE'
            ?kalshiGeneralTakerFeeEstimateCents({count:qty,priceCents:price})
            :Number(currentSettings.simFeeCents)*qty;
          if(!maximumSettlementNetAdmission({entryPriceCents:price,count:qty,entryFeeCents:entryFee,
            minimumNetPerOriginalContractCents:currentMinimumNet}).ok)
            return {ok:false,reason:'lp_capital_economic_target_unreachable'};
          return {...decision,parentStarlightId:String(parentStarlightId||sourceTradeId||''),
            parentEntryPriceCents:lpInitialParentEntryPriceCents};
        }
        if(!independentCrashRecoveryEntry){
          const at=Date.now();
          if(independentRecovery===true){
            const freshQuote=this.market?.getQuote?.(exactTicker);
            const verified=independentRecoveryExecutionDecision({authority:independentAuthority,
              parent:independentParent,concept,sourceTradeId,quote:freshQuote,
              settings:currentSettings,plan,now:at});
            if(!verified.ok)return verified;
          }else if(executionAuthorityCommand){
            const freshQuote=this.market?.getQuote?.(q.ticker)||executionQuote;
            const valid=validateAthenaFireCommand(executionAuthorityCommand,{concept,q:freshQuote,settings:currentSettings,now:at});
            if(!valid.ok)return valid;
          }
          return {ok:true,atMs:at,route:independentRecovery===true?'independent_athena_stop':'ordinary_athena'};
        }
        if(!releaseWitness && !this.getCurrentCrashWatch)return {ok:false,reason:'current_confirmation_authority_missing'};
        const freshQuote=this.market?.getQuote?.(q.ticker)||executionQuote;
        if(freshQuote.bookInvalid || freshQuote.result || String(freshQuote.status||'active')!=='active')return {ok:false,reason:'current_market_unavailable'};
        const currentWatch=this.getCurrentCrashWatch && liveWatch?.galacticGrant!==true
          ?this.getCurrentCrashWatch(concept,lineage?.authorizationId,lineage?.crashEpisodeId):witness;
        if(!currentWatch)return {ok:false,reason:'confirmation_watch_missing'};
        const at=Date.now();
        const valid=crystalWallIndependentEntry?validateCrystalWallFireCommand(executionAuthorityCommand,{q:freshQuote,settings:currentSettings,now:at}):justiceArrowIndependentEntry?validateJusticeArrowFireCommand(executionAuthorityCommand,{q:freshQuote,settings:currentSettings,now:at}):validateIndependentCi1FireCommand(executionAuthorityCommand,{concept,q:freshQuote,settings:currentSettings,now:at});
        if(!valid.ok)return valid;
        const liveSignal=signalAt(currentWatch,freshQuote,at,currentSettings),witnessSignal=signalAt(witness,freshQuote,at,currentSettings);
        if(!liveSignal.qualified || !witnessSignal.qualified)return {ok:false,reason:liveSignal.qualified?witnessSignal.reason:liveSignal.reason};
        if(Number(freshQuote.yesAsk)>Number(q.yesAsk) || !hunterEntryBoundaryQualifiedAtQuote(concept,freshQuote,currentSettings,plan).ok)return {ok:false,reason:'final_execution_envelope_changed'};
        return {ok:true,atMs:at,quoteObservation:freshQuote.quoteObservation||null,signal:liveSignal};
      };
      const recordFinalConfirmation=(check)=>{
        trace('FINAL_SIGNAL',check.ok?'PASS':'BLOCKED',check.reason||'current_confirmation',check);
        if(!check.ok)void this.audit('hunter_confirmation_invalidated_before_submit',{concept,ticker:q.ticker,reason:check.reason}).catch(()=>{});
      };


      // LP is the sixth capital stage. Preserve an explicit 0c SIM fee, but
      // never interpret missing/corrupt fee evidence as that authorized value.
      if(lightningPlasmaScaleIn===true && (s.simFeeCents==null
        || typeof s.simFeeCents==='boolean'
        || (typeof s.simFeeCents==='string' && s.simFeeCents.trim()==='')
        || !Number.isFinite(Number(s.simFeeCents)) || Number(s.simFeeCents)<0)){
        trace('ECONOMIC_SAFETY','BLOCKED','lp_fee_evidence_missing_or_invalid');
        return null;
      }

      if ((!isShadowSaintConcept(concept) || lightningPlasmaScaleIn===true || starlightRealEarly || starlightModelClone===true || independentRecovery===true) && s.mode === 'SIMULATION') {
      const available = await this.simulationAvailableCashCents();
      const estimatedEntryFee = Number(s.simFeeCents || 0) * plan.count;
      const required = plan.averagePriceCents * plan.count + estimatedEntryFee;
      if (available + 1e-9 < required) {
        trace('CAPITAL','BLOCKED','simulation_cash',{availableCents:available,requiredCents:required});
        await this.audit('sim_entry_blocked_cash', { concept, ticker: q.ticker, availableCents: available, requiredCents: required, count: plan.count });
        return null;
      }
      trace('CAPITAL','PASS',null,{availableCents:available,requiredCents:required});
      // R63 live-parity SIM: after the same fresh-market and executable-depth
      // proof used by LIVE, the visible IOC quantity is filled deterministically.
      // No independent random coin flip is allowed to erase a proven executable
      // opportunity. Partial quantity remains governed by prepareEntryExecution().
      trace('EXECUTION','PASS','simulation_visible_ioc_fill',{visibleExecutableCount:plan.count});
      }

      const id = starlightRecovery===true?starlightRecoveryEntryId({...starlightRecoverySnapshot,stackIndex})
        :starlightModelClone===true?modelCloneCapitalId({systemName:s.systemName,ownerId:s.ownerId,
          mode:s.mode,resetEpoch:Number(s.resetTimestampMs||0),parentEntryId:String(sourceTradeId),
          concept,seat:Number(stackIndex||1),attemptGeneration:Number(cloneAttemptGeneration||0)}):nowId();
      const now = Date.now();
      const plannedCount = Math.max(1, Number(plan.count || 0));
      // Capital LP collateral and protection preflight use the exact LIVE
      // order limit; the actual fill replaces it later. Capital SIM retains
      // its executable average. Virtual shadow references keep their existing
      // integer-price witness protocol.
      const plannedAverage=Number(plan.averagePriceCents ?? executionQuote.yesAsk ?? q.yesAsk);
      const plannedEntry = lightningPlasmaScaleIn===true || starlightRealEarly || starlightModelClone===true || independentRecovery===true
        ? s.mode==='LIVE' ? Number(q.yesAsk) : plannedAverage
        : Math.round(plannedAverage);
      const simFeePerContract = Math.max(0, Number(s.simFeeCents || 0));
      const preflightEntryFeeCents = s.mode==='LIVE' ? null : simFeePerContract * plannedCount;
      const auroraPreflight = calculateAuroraSnapshotFromFeeModel({
        entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:preflightEntryFeeCents,
        mode:s.mode,simFeeCents:simFeePerContract,damageControlPercent:auroraPercentFor(s,concept),calculatedAtMs:now,
      });
      const athenaShadowFeeBypass=concept==='Athena Exclamation' && isShadowSaintConcept(concept)
        && lightningPlasmaScaleIn!==true && starlightRecovery!==true && starlightModelClone!==true
        && auroraPreflight.reason==='fee_budget_exhausts_aurora_loss_envelope';
      if(!auroraPreflight.ok && !athenaShadowFeeBypass){
        trace('AURORA','BLOCKED',auroraPreflight.reason || 'aurora_preflight_failed',{auroraClass:'AURORA_DENIED',requestedPercent:auroraPercentFor(s,concept)});
        // R12 centralized finally records the exact pre-intent denial.
        await this.audit('aurora_entry_preflight_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:auroraPreflight.reason,entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:auroraPreflight.entryFeeCents??preflightEntryFeeCents,expectedExitFeeCents:auroraPreflight.expectedExitFeeCents??null});
        return null;
      }
      if(athenaShadowFeeBypass){
        trace('AURORA','PASS','fee_budget_exhausts_aurora_loss_envelope',{
          auroraClass:'AURORA_SHADOW_FALLBACK_PASS',
          requestedPercent:auroraPercentFor(s,concept),
          brokerAuthority:false,
        });
      }else{
        trace('AURORA','PASS','preflight',{auroraClass:'AURORA_NORMAL_PASS',stopDistanceCents:auroraPreflight.stopDistanceCents,dangerPriceCents:auroraPreflight.dangerPriceCents,requestedPercent:auroraPercentFor(s,concept)});
      }

      const frozenEntryConfig = entryConfigSnapshot(s, concept, sourceFeeder, stakeCents, sourceEntryConfig, q.gameClockState, q.eventTicker || q.ticker);
      // Existing R13 watch groups retain their exact legacy card identity.
      // When a new V2 watch is claimed, its card excludes dashboard session
      // timestamps. Never mix generations inside one durable group: the
      // Starlight SQL entry fence compares this value to the locked watch.
      if(starlightRecovery===true){
        const frozenGroupHash=starlightRecoverySnapshot?.groupSettingsHash;
        if(!executionSettingsHashMatches(frozenGroupHash,s)){
          trace('EXECUTION','BLOCKED','sc1_group_operator_card_changed');
          return null;
        }
        frozenEntryConfig.executionSettingsHash=frozenGroupHash;
      }else frozenEntryConfig.executionSettingsHash=executionSettingsHash(s);
      frozenEntryConfig.entryExecutionWitness=structuredClone({...plan.executionEvidence,averagePriceCents:plan.averagePriceCents});
      if(legacyCompatibility===true && isShadowSaintConcept(concept)){
        // Preserve a genuinely validated historical pathway without pretending
        // that an independent specialist/legacy decision was an Athena FIRE.
        const legacy={kind:'LEGACY_QUALIFIED_ENTRY_NOT_ATHENA_FIRE',concept,ticker:q.ticker,
          eventTicker:expectedEventTicker,sourceTradeId,sourceFeeder,doctrine:legacyDoctrineEvidence,
          athenaAssessment:athenaAssessment?structuredClone(athenaAssessment):null,
          qualifiedAtMs:now,sourceObservation:executionQuote.quoteObservation||{atMs:executionQuote.quoteAtMs},
          scope:shadowScope(s)};
        legacy.authorizationId=`LEGACY-SHADOW:${authorityHash({...legacy,qualifiedAtMs:undefined})}`;
        frozenEntryConfig.legacyQualification={...legacy,commandHash:authorityHash(legacy)};
      }

      if (recoverySourceSnapshot && typeof recoverySourceSnapshot === 'object') frozenEntryConfig.recoverySource = structuredClone(recoverySourceSnapshot);
      if (crystalWallSourceSnapshot && typeof crystalWallSourceSnapshot === 'object') frozenEntryConfig.crystalWall = structuredClone(crystalWallSourceSnapshot);
      if (justiceArrowSourceSnapshot && typeof justiceArrowSourceSnapshot === 'object') frozenEntryConfig.justiceArrow = structuredClone(justiceArrowSourceSnapshot);
      if (crashSourceSnapshot && typeof crashSourceSnapshot === 'object') frozenEntryConfig.crashRecoverySource = structuredClone(crashSourceSnapshot);
      if(starlightRecovery===true && starlightRecoverySnapshot){starlightRecoverySnapshot.liveEpoch=String(this.market?.quoteEpoch||'');frozenEntryConfig.starlightRecovery=structuredClone(starlightRecoverySnapshot);}
      if (entryQualificationSnapshot && typeof entryQualificationSnapshot === 'object') frozenEntryConfig.entryQualification = structuredClone(entryQualificationSnapshot);
      if (concept==='Scarlet Needle' && entryQualificationSnapshot?.scarletContinuation) frozenEntryConfig.scarletContinuation=structuredClone(entryQualificationSnapshot.scarletContinuation);
      if (concept==='Sagittarius Justice Arrow' && entryQualificationSnapshot?.justiceArrow) frozenEntryConfig.justiceArrow=structuredClone(entryQualificationSnapshot.justiceArrow);
      if (concept==='Sagittarius Justice Arrow' && entryQualificationSnapshot?.justiceArrowContinuation) frozenEntryConfig.justiceArrowContinuation=structuredClone(entryQualificationSnapshot.justiceArrowContinuation);
      if (concept==='Recovery Hunter' && entryQualificationSnapshot?.crystalWall) frozenEntryConfig.crystalWall=structuredClone(entryQualificationSnapshot.crystalWall);
      if (concept==='Lightning Plasma' && entryQualificationSnapshot?.lightningPlasmaContinuation) frozenEntryConfig.lightningPlasmaContinuation=structuredClone(entryQualificationSnapshot.lightningPlasmaContinuation);
      if (athenaAssessment && typeof athenaAssessment === 'object' && concept!=='Scarlet Needle') frozenEntryConfig.athena = structuredClone(athenaAssessment);
      if (concept==='Scarlet Needle' && athenaAssessment && typeof athenaAssessment === 'object') frozenEntryConfig.scarletAuthority=structuredClone(athenaAssessment);
      if (concept==='Athena Exclamation') frozenEntryConfig.athenaExclamation={version:ATHENA_EXCLAMATION.version,policyRevision:ATHENA_EXCLAMATION.policyRevision,candidate:structuredClone(entryQualificationSnapshot?.candidate||null),primeReview:structuredClone(athenaExclamationReview)};
      frozenEntryConfig.strategyIdentity = {
        internalConcept:concept,
        displayName:EXECUTION_ATTACK_DISPLAY[concept]?.name || concept,
        legacyName:EXECUTION_ATTACK_DISPLAY[concept]?.legacy || concept,
      };
      frozenEntryConfig.galacticExplosion = {
        version:GALACTIC_EXPLOSION.version,
        enabledAtEntry:s.galacticExplosionEnabled===true,
        lockScope:s.galacticExplosionEnabled===true?GALACTIC_EXPLOSION.enabledLockScope:GALACTIC_EXPLOSION.disabledLockScope,
      };
      if(crystalWallIndependentEntry) frozenEntryConfig.crystalWallFire=structuredClone(crystalWallFireCommand);
      else if(justiceArrowIndependentEntry) frozenEntryConfig.justiceArrowFire=structuredClone(justiceArrowFireCommand);
      else if(ci1IndependentEntry) frozenEntryConfig.ci1WallCloneFire=structuredClone(ci1FireCommand);
      else if(independentAuthority) frozenEntryConfig.independentAuthority=structuredClone(independentAuthority);
      else frozenEntryConfig.athenaFire=structuredClone(athenaFireCommand);
      const authorityEconomicTarget=independentAuthority?.economicTarget||(crystalWallIndependentEntry?crystalWallFireCommand?.economicTarget:justiceArrowIndependentEntry?justiceArrowFireCommand?.economicTarget:ci1IndependentEntry?ci1FireCommand?.economicTarget:athenaFireCommand?.economicTarget);
      const frozenEconomicTargetNet=Number(authorityEconomicTarget?.netPerOriginalContractCents
        ??(concept==='Lightning Plasma'&&lightningPlasmaScaleIn===true
          ?attackMinProfitNetPerOriginal(s,concept)
          :s.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents));
      const fallbackTargetVersion=crystalWallIndependentEntry?'CRYSTAL-WALL-V3-ECONOMIC-TARGET-V1':justiceArrowIndependentEntry?'JUSTICE-ARROW-ATHENA-X1-ECONOMIC-TARGET-V2':ci1IndependentEntry?'CI1-WALL-CLONE-ECONOMIC-TARGET-V1':'ATHENA-A3-ECONOMIC-TARGET-V1';
      frozenEntryConfig.economicTarget=structuredClone(authorityEconomicTarget||{version:fallbackTargetVersion,netPerOriginalContractCents:frozenEconomicTargetNet});
      const useX1=attackUsesAthenaX1(s,concept);
      const frozenX1Net=useX1?attackMinProfitNetPerOriginal(s,concept):frozenEconomicTargetNet;
      if(useX1){
        frozenEntryConfig.profitAuthority=ATHENA_EXIT_INTELLIGENCE.version;
        frozenEntryConfig.profitAuthorityRevision=ATHENA_EXIT_INTELLIGENCE.policyRevision;
        frozenEntryConfig.athenaExit={
          version:ATHENA_EXIT_INTELLIGENCE.version,
          policyRevision:ATHENA_EXIT_INTELLIGENCE.policyRevision,
          fullPositionOnly:true,
          positionSplitting:false,
          maximumExecutableBookAgeMs:Number(ATHENA_EXIT_INTELLIGENCE.maximumExecutableBookAgeMs),
          lossAuthority:'U-SG1',
          minimumProfitNetPerOriginalContractCents:Math.max(0.01,Number(frozenX1Net||2)),
          x1ProceedsOnlyAfterMinimumProfit:true,
        };
        delete frozenEntryConfig.infinityBreak;
      }else{
        frozenEntryConfig.profitAuthority=INFINITY_BREAK.version;
        frozenEntryConfig.profitAuthorityRevision=INFINITY_BREAK.policyRevision;
        frozenEntryConfig.infinityBreak={
          version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,enabledAtEntry:true,
          minimumNetPerOriginalContractCents:frozenEconomicTargetNet,
          requiredFreshConfirmations:Math.max(1,Math.floor(Number(s.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),
          maximumBookAgeMs:Math.max(100,Math.floor(Number(s.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs))),
          confirmationWindowMs:Math.max(250,Math.floor(Number(s.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs))),
          fullPositionOnly:true,lossAuthority:'U-SG1',
        };
      }
      frozenEntryConfig.auroraDamageControlPercent=auroraPercentFor(s,concept);
      if(starlightModelClone===true){
        frozenEntryConfig.starlightModelClone=true;
        const w=cloneAuthority.watch;
        frozenEntryConfig.modelCloneCapital={version:MODEL_CLONE_CAPITAL_VERSION,
          positionId:id,cloneId:`STARLIGHT-CLONE:${concept}:${sourceTradeId}`,
          parentEntryId:String(sourceTradeId),watchId:w.authorizationId,
          watchRevision:Number(w.revision),shadowProofHash:cloneAuthority.proofHash,
          concept,seat:Number(stackIndex||1),attemptGeneration:Number(cloneAttemptGeneration||0),
          maximumSeats:Number(s.crashRecoveryHunterMultiply),
          resetEpoch:Number(s.resetTimestampMs||0),
          signalQuoteAtMs:Number(frozenEntryConfig.entryExecutionWitness?.quote?.quoteAtMs||0),liveEpoch:String(this.market?.quoteEpoch||'')};
      }
      frozenEntryConfig.auroraStopWindowMinutes=Math.max(1,Math.min(720,Math.round(Number(s.auroraStopWindowMinutes)||90)));
      // LP-SCALEIN-V1 is the only real-capital Lightning Plasma path. Ordinary
      // Athena-path Lightning Plasma stays a shadow saint. A scale-in must name
      // its eligible Starlight parent and is never a follow-up from a loss.
      const scaleInCapital=concept==='Lightning Plasma' && lightningPlasmaScaleIn===true && String(parentStarlightId||sourceTradeId||'')!=='';
      const cloneCapital=(starlightModelClone===true || independentRecovery===true) && (concept==='Lightning Plasma' || concept==='Sagittarius Arrow Recovery')
        && (independentRecovery===true
          ? (concept==='Lightning Plasma' ? s.lightningPlasmaEnabled===true : s.sagittariusArrowEnabled===true)
          : s.starlightExtinctionRealTradeEnabled===true);
      // Operator switch. OFF = Starlight stays a shadow saint. ON = the same
      // recovery signal opens as CAPITAL, in SIMULATION and in LIVE.
      const starlightReal=concept==='Crash Recovery Hunter' && starlightRecovery===true && s.starlightExtinctionRealTradeEnabled===true;
      if(isShadowSaintConcept(concept) && !scaleInCapital && !starlightReal && !cloneCapital){
        return await this.openShadowSaint({concept,q:executionQuote,plan,settings:s,stakeCents,
          sourceFeeder,sourceTradeId,frozenEntryConfig,finalConfirmation,stackIndex,
          simulationMutationToken,trace,expectedEventTicker,shadowAdmissionBatch});
      }
      if(!scaleInCapital&&!starlightReal&&!cloneCapital)throw new Error('capital_parent_authority_missing');
      // Independent entry-time ceiling; this cannot be bypassed by a stale
      // planning command or by a broker path that begins after the quote move.
      const lpMinimumNet=Math.max(Number(frozenEntryConfig?.economicTarget?.netPerOriginalContractCents),
        Number(frozenEntryConfig?.athenaExit?.minimumProfitNetPerOriginalContractCents||0),
        Number(frozenEntryConfig?.infinityBreak?.minimumNetPerOriginalContractCents||0));
      const lpEntryFee=s.mode==='LIVE'
        ?kalshiGeneralTakerFeeEstimateCents({count:plannedCount,priceCents:plannedEntry})
        :simFeePerContract*plannedCount;
      const lpCeiling=maximumSettlementNetAdmission({entryPriceCents:plannedEntry,count:plannedCount,
        entryFeeCents:lpEntryFee,minimumNetPerOriginalContractCents:lpMinimumNet});
      if(!lpCeiling.ok){
        trace('ECONOMIC_SAFETY','BLOCKED',lpCeiling.reason,{entryPriceCents:plannedEntry,count:plannedCount});
        await this.audit('lp_capital_economic_target_unreachable',{ticker:q.ticker,mode:s.mode,
          entryPriceCents:plannedEntry,count:plannedCount,reason:lpCeiling.reason});
        return null;
      }
      if(starlightModelClone===true || independentRecovery===true){
        // Independent Athena-loss and clone are capital BUYs, never shadow.
        frozenEntryConfig.executionClass='CAPITAL';
      }
      if(independentRecovery===true){
        frozenEntryConfig.independentRecovery={
          version:'INDEPENDENT-ATHENA-LOSS-V2',
          authorizationId:independentAuthority.authorizationId,
          parentProofHash:independentAuthority.parentProofHash,
          watchAuthorizationId:independentAuthority.watchAuthorizationId,
          watchRevision:independentAuthority.watchRevision,
          signalQuoteAtMs:independentAuthority.signalQuoteAtMs,
          signalQuoteEpoch:independentAuthority.signalQuoteEpoch,
          signalQuoteRevision:independentAuthority.signalQuoteRevision,
          resetEpoch:Number(s.resetTimestampMs||0),
          parentEntryId:String(sourceTradeId||''),concept:String(concept),
        };
      }
      if(starlightReal){
        frozenEntryConfig.executionClass='CAPITAL';
        frozenEntryConfig.starlightCapital={
          version:STARLIGHT_CAPITAL_VERSION,
          seat:Math.max(1,Math.floor(Number(stackIndex)||1)),
          maximumSeats:Number(starlightRecoverySnapshot?.maximumSeats||1),
          parentEntryId:String(starlightRecoverySnapshot?.parentEntryId||sourceTradeId||''),
          authorizationId:String(starlightRecoverySnapshot?.authorizationId||''),
          resetTimestampMs:Number(s.resetTimestampMs||0),
          link:starlightRecoverySnapshot?.link===true,
          independentlyProtected:true,
          noSendRetryGeneration:starlightNoSendRetryGeneration(starlightRecoverySnapshot),
        };
      }
      if(scaleInCapital){
        frozenEntryConfig.executionClass='CAPITAL';
        frozenEntryConfig.lightningPlasmaScaleIn={
          version:LP_CONTINUATION_VERSION,
          parentAuthorityRevision:lpInitialParentAuthority.revision,
          parentEntryPriceCents:lpInitialParentEntryPriceCents,parentKind:lpInitialParentAuthority.kind,
          parentStarlightId:String(parentStarlightId||sourceTradeId),
          thresholdCents:Number(s.lightningPlasmaStarlightScaleInCents||0),
          observationQuoteAtMs:Number(lpInitialObservation?.lastQuoteAtMs||0),
          crashDepth:Number(lpInitialObservation?.crashDepth||0),
          reboundCents:Number(lpInitialObservation?.reboundCents||0),
          upwardTicks:Number(lpInitialObservation?.upwardTicks||0),
          armedAtMs:Date.now(),
          noFollowUp:true,
          resetTimestampMs:Number(s.resetTimestampMs||0),
        };
      }



      // MW-R25 final durable per-event admission. The ordinary CI1 and Galactic
      // overlay exceptions remain strategic; they do NOT bypass the operator's
      // one-executed-regular-entry budget after a previous exit. The budget is
      // checked and consumed in the SAME PostgreSQL transaction as sag_entries.
      // Never apply it to Starlight's independently authorized parent child.
      const persistExecutableEntry=async(entry)=>{
        starlightIntentBoundaryEntered=true;
        starlightPreIntentDenial=null;
        if(independentRecovery===true){
          if(typeof this.db.insertIndependentRecoveryCapitalEntry!=='function'){
            trace('PERSISTENCE','BLOCKED','independent_atomic_capital_admission_unavailable');
            return false;
          }
          try{
            await this.db.insertIndependentRecoveryCapitalEntry(entry,{isCurrent:()=>finalConfirmation().ok===true});
            return true;
          }catch(error){
            trace('PERSISTENCE','BLOCKED',String(error?.message||error));
            await this.audit('independent_capital_persist_blocked',
              {concept,ticker:q.ticker,reason:String(error?.message||error)});
            return false;
          }
        }
        if(starlightRecovery===true || lightningPlasmaScaleIn===true || starlightModelClone===true){
          try{
            if(starlightModelClone===true){
              if(typeof this.db.insertStarlightModelCloneCapitalEntry!=='function')
                throw new Error('sc_clone_transactional_admission_unavailable');
              await this.db.insertStarlightModelCloneCapitalEntry(entry,{isCurrent:()=>finalConfirmation().ok===true});
            }else if(starlightReal){
              if(typeof this.db.insertStarlightCapitalEntry!=='function')throw new Error('athena_starlight_atomic_admission_unavailable');
              // Check current trigger/authority both before and after DB work.
              // A delayed write cannot commit a SIM fill after the signal died.
              await this.db.insertStarlightCapitalEntry(entry,{isCurrent:()=>finalConfirmation().ok===true});
            }else if(lightningPlasmaScaleIn===true){
              await this.db.insertLightningPlasmaScaleInEntry(entry,{isCurrent:()=>finalConfirmation().ok===true});
            }else throw new Error('capital_parent_authority_missing');
            return true;
          }
          catch(error){
            const reason=String(error?.message||error);
            trace('PERSISTENCE','BLOCKED',reason,{hunterId:entry?.id||null});
            await this.audit('lightning_plasma_scalein_persist_blocked',{concept,ticker:q.ticker,reason,parentStarlightId:parentStarlightId||sourceTradeId});
            return false;
          }
        }
        if(typeof this.db.insertRegularEntryWithEventCap!=='function'){
          // Only lightweight legacy unit doubles lack the production Database
          // method; a real database with an operational query pool fails closed.
          if(this.db?.pool)throw new Error('durable_regular_entry_cap_unavailable');
          await this.db.insertEntry(entry);return true;
        }
        const decision=await this.db.insertRegularEntryWithEventCap(entry,{
          resetTimestampMs:Number(s.resetTimestampMs||0),
          maxEntriesPerTrade:s.maxEntriesPerTrade,
          galacticExplosionEnabled:s.galacticExplosionEnabled===true,
          multiply:attackMultiplySeats(s,concept),
        });
        if(!decision?.ok){
          trace('DURABLE_EVENT_CAP','BLOCKED',decision?.reason||'durable_entry_not_committed',decision||{});
          await this.audit('hunter_durable_event_entry_blocked',{concept,ticker:exactTicker,eventTicker:expectedEventTicker,
            mode:s.mode,resetEpoch:Number(s.resetTimestampMs||0),...decision});
          return false;
        }
        trace('DURABLE_EVENT_CAP','PASS',decision.reason,decision);
        return true;
      };

      const makeEntry = ({status='open',entryPriceCents=plannedEntry,count=plannedCount,entryFeeCents=preflightEntryFeeCents,entryOrderId=null,entryClientOrderId=null,aurora=null,entryConfig=frozenEntryConfig}={}) => ({
        id, systemName:s.systemName, ownerId:s.ownerId, conceptName:concept, executionClass:'CAPITAL',
        // SC1 is the sole CAPITAL hunter that also serves as a durable parent.
        // Its reset epoch MUST be persisted on the row for LP-V5 to enroll.
        shadowEpoch:starlightReal?Number(s.resetTimestampMs||0):null,
        sourceFeeder, sourceTradeId, ticker:q.ticker, eventTicker:q.eventTicker || q.ticker,
        marketTitle:executionQuote.title || q.title || q.ticker, watchdogModel:WATCHDOG_MODEL, mode:s.mode, status,
        entryPriceCents, exitPriceCents:null, currentPriceCents:entryPriceCents, peakPriceCents:entryPriceCents,
        stopPriceCents:aurora?.dangerPriceCents ?? 0, stopLossCents:aurora?.stopDistanceCents ?? 0,
        count, remainingCount:count, volume24h:executionQuote.volume24h || q.volume24h || 0,
        spreadAtEntryCents:Number(executionQuote.yesAsk)-Number(executionQuote.yesBid), pnlCents:0,
        entryFeeCents, exitFeeCents:0, exitFilledCount:0, exitNotionalCents:0,
        entryOrderId, entryClientOrderId,
        gameStartTimeMs:Number(q.gameStartTimeMs)||null, openedAtMs:now, updatedAtMs:Date.now(),
        lowestPriceAfterEntryCents:null, maeCents:0, maeAtMs:null,
        recoveryToEntryAtMs:null, recoveryToGreenAtMs:null, recoveryGreenPriceCents:null,
        researchTrackingComplete:false, entryConfig,
      });

      if(s.mode==='SIMULATION'){
        const count=plannedCount;
        const entry=plannedEntry;
        const entryFeeCents=simFeePerContract*count;
        const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,mode:'SIMULATION',simFeeCents:simFeePerContract,damageControlPercent:auroraPercentFor(s,concept),calculatedAtMs:now});
        if(!aurora.ok){
          trace('AURORA','BLOCKED',aurora.reason || 'aurora_exact_failed');
          await this.audit('aurora_simulation_exact_blocked',{concept,ticker:q.ticker,reason:aurora.reason,entryPriceCents:entry,count});
          return null;
        }
        const coffin=applyFreezingCoffin({...frozenEntryConfig,aurora},s,entry,now,concept);
        if(coffin.rejected){trace('FREEZING_COFFIN','BLOCKED',coffin.rejected.reason);await this.audit('freezing_coffin_blocked',{concept,ticker:q.ticker,reason:coffin.rejected.reason});return null;}
        const config=coffin.config;
        if(starlightRecovery===true&&starlightRecoverySnapshot){starlightRecoverySnapshot.liveEpoch=String(this.market?.quoteEpoch||'');config.starlightRecovery=structuredClone(starlightRecoverySnapshot);}
        const e=makeEntry({status:'open',entryPriceCents:entry,count,entryFeeCents,aurora:coffin.stop||aurora,entryConfig:config});
        let releaseSimulationMutation=null;
        if(this.enterSimulationMutation){
          releaseSimulationMutation=this.enterSimulationMutation(simulationMutationToken);
          if(!releaseSimulationMutation){trace('PERSISTENCE','BLOCKED','simulation_reset_epoch_or_barrier');await this.audit('simulation_reset_mutation_blocked',{kind:'execution_attack',concept,ticker:q.ticker,boltId:boltId||null,reason:'reset_epoch_or_barrier'});return null;}
        }
        try{
          const confirmation=finalConfirmation();recordFinalConfirmation(confirmation);
          if(!confirmation.ok)return null;
          e.entryConfig.finalEntryConfirmation=structuredClone(confirmation);
          if(!(await persistExecutableEntry(e)))return null;
        }finally{try{releaseSimulationMutation?.();}catch{}}
        try{this.onHunterOpened?.(e);}catch{}
        trace('PERSISTENCE','PASS','simulation_open_persisted',{hunterId:e.id,status:e.status});
        trace('OPENED','PASS',e.status,{hunterId:e.id,entryPriceCents:e.entryPriceCents,count:e.count,auroraDangerPriceCents:aurora.dangerPriceCents});
        return e;
      }

      // R45 LIVE entry durability: persist the exact owned entry intent before
      // any broker BUY can occur. A crash/network ambiguity after submission is
      // therefore recoverable by entryClientOrderId instead of becoming an
      // unowned broker position.
      if(!this.getLiveReady(independentRecovery===true?concept:null)){trace('EXECUTION','BLOCKED','live_not_ready');return null;}

      // LIVE shard preflight is execution infrastructure, not trading doctrine.
      // Resolve Kalshi's authoritative market shard, prove that shard has the
      // collateral required by this already-approved Athena FIRE, and route the
      // eventual broker mutation directly to that shard.
      const shardRequiredCents=Math.max(0,plannedCount*plannedEntry+Number(auroraPreflight.entryFeeCents||0));
      let shardPreflight={ok:false,reason:'live_exchange_preflight_unavailable',exchangeIndex:q.exchangeIndex!=null&&String(q.exchangeIndex).trim()!==''&&Number.isFinite(Number(q.exchangeIndex))?Math.trunc(Number(q.exchangeIndex)):null,availableCents:null,requiredCents:shardRequiredCents};
      if(typeof this.kalshi?.ensureExchangeBalance==='function') shardPreflight=await this.kalshi.ensureExchangeBalance({ticker:q.ticker,exchangeIndex:q.exchangeIndex,requiredCents:shardRequiredCents});
      else if(typeof this.kalshi?.preflightExchangeBalance==='function') shardPreflight=await this.kalshi.preflightExchangeBalance({ticker:q.ticker,exchangeIndex:q.exchangeIndex,requiredCents:shardRequiredCents});
      if(!shardPreflight?.ok){
        trace('EXECUTION','BLOCKED',shardPreflight?.reason||'live_exchange_preflight_failed',{exchangeIndex:shardPreflight?.exchangeIndex??null,availableCents:shardPreflight?.availableCents??null,requiredCents:shardRequiredCents,fundingRequestedCents:shardPreflight?.fundingRequestedCents??null,transferIds:shardPreflight?.transferIds??null,retryable:shardPreflight?.retryable===true});
        await this.audit('live_entry_exchange_preflight_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:shardPreflight?.reason||'live_exchange_preflight_failed',exchangeIndex:shardPreflight?.exchangeIndex??null,availableCents:shardPreflight?.availableCents??null,requiredCents:shardRequiredCents,fundingRequestedCents:shardPreflight?.fundingRequestedCents??null,transferIds:shardPreflight?.transferIds??null,retryable:shardPreflight?.retryable===true},shardPreflight?.retryable===true?'info':'warning');
        return null;
      }
      const brokerRejectSuppressed=this.liveBrokerHardRejectSuppressed(concept,q.ticker,boltId);
      if(brokerRejectSuppressed){
        trace('EXECUTION','BLOCKED','live_broker_hard_reject_suppressed',{httpStatus:brokerRejectSuppressed.httpStatus??null,brokerErrorCode:brokerRejectSuppressed.brokerErrorCode??null});
        await this.audit('live_entry_broker_hard_reject_suppressed',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,boltId:boltId||null,httpStatus:brokerRejectSuppressed.httpStatus??null,brokerErrorCode:brokerRejectSuppressed.brokerErrorCode??null},'warning');
        return null;
      }
      frozenEntryConfig.brokerRouting={version:'LIVE-SHARD-R1',exchangeIndex:shardPreflight.exchangeIndex,preflightAvailableCents:shardPreflight.availableCents??null,preflightRequiredCents:shardRequiredCents};
      const entryClientOrderId=this.kalshi.buildClientOrderId(s.ownerId,id,'entry');
      const pendingConfirmation=finalConfirmation();recordFinalConfirmation(pendingConfirmation);if(!pendingConfirmation.ok)return null;frozenEntryConfig.finalEntryConfirmation=structuredClone(pendingConfirmation);
      const pendingConfig={...frozenEntryConfig,auroraPending:{version:AURORA_EXECUTION.version,preflight:auroraPreflight,exactFillRequired:true},finalEntryConfirmation:structuredClone(pendingConfirmation)};
      let e=makeEntry({status:'entry_pending',entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:0,entryClientOrderId,entryConfig:pendingConfig});
      // Independent Athena-loss LP/Arrow starts join the same native pending
      // cash admission fence as GH/CW/SN/PR. Normal SIM and other attack
      // qualification policies remain untouched.
      if(independentRecovery===true){
        const cashWitness=createQ17LiveCashWitness(e,shardPreflight);
        if(!cashWitness.ok){
          trace('EXECUTION','BLOCKED',cashWitness.reason,{hunterId:e.id});
          return null;
        }
        e.entryConfig.q17LiveCashWitness=cashWitness.witness;
      }
      if(!(await persistExecutableEntry(e)))return null;
      trace('PERSISTENCE','PASS','live_entry_intent_persisted',{hunterId:e.id,status:e.status,entryClientOrderId});
      // The durable entry_pending row is now the shared ledger truth. Release
      // the short commit lock BEFORE waiting for the broker-mutation lock so a
      // LIVE entry never nests two session advisory locks from the bounded lock
      // pool. Same-Attack/event/capital checks remain protected by the durable
      // row while broker mutation is serialized separately by exact ticker.
      await releaseEntryCommitLock();

      // Serialize all LIVE broker mutations on the exact ticker, regardless of
      // Galactic Explosion attack identity. This is separate from the exposure
      // lock: different Attacks may coexist, but a BUY and SELL on the same
      // aggregate broker position must never race across processes.
      let brokerMutationUnlock=null;
      // The durable broker-mutation lock is mandatory for LIVE capital entry.
      // Missing DB support must not silently authorize an unlocked BUY.
      if(typeof this.db?.acquireHunterTickerLock!=='function'){
        await this.audit('live_broker_mutation_ticker_db_lock_unavailable',{id,ticker:q.ticker,concept,operation:'entry'},'error');
        trace('EXECUTION','BLOCKED','ticker_broker_mutation_lock_unavailable',{hunterId:id});
        return this.rejectUndispatchedLightningEntry(e,'broker_mutation_lock_unavailable');
      }
      if(typeof s.ownerId!=='string'||!s.ownerId.trim()||s.ownerId!==s.ownerId.trim())
        return this.rejectUndispatchedLightningEntry(e,'broker_mutation_owner_scope_missing');
      brokerMutationUnlock=await this.db.acquireHunterTickerLock(s.ownerId,`broker:${q.ticker}`);
      if(!brokerMutationUnlock){
        await this.audit('live_broker_mutation_ticker_db_lock_busy',{id,ticker:q.ticker,concept,operation:'entry'},'warning');
        trace('EXECUTION','BLOCKED','ticker_broker_mutation_lock_busy',{hunterId:id});
        return this.rejectUndispatchedLightningEntry(e,'broker_mutation_lock_busy');
      }
      let result,submissionAttempted=false,dispatchExecution=null;
      const confirmLiveEntryDispatch=()=>{
        const current=finalConfirmation();recordFinalConfirmation(current);
        if(!current.ok)return current;
        return liveEntryDispatchBookConfirmation({execution:dispatchExecution,market:this.market,
          ticker:exactTicker,eventTicker:expectedEventTicker,count:plannedCount,
          limitCents:Number(q.yesAsk),maximumBookAgeMs:5000});
      };
      try{
        const confirmation=finalConfirmation();recordFinalConfirmation(confirmation);
        if(!confirmation.ok){
          return await this.rejectUndispatchedLightningEntry(e,'confirmation_invalidated_before_submit',
            {...pendingConfig,finalEntryConfirmation:confirmation});
        }
        frozenEntryConfig.finalEntryConfirmation=structuredClone(confirmation);
        if(this.db.shadowArchitectureRequired===true){
          const durable=independentRecovery===true
            ? await this.db.verifyIndependentRecoveryLiveIntent(e)
            : e?.entryConfig?.starlightModelClone===true
            ? await this.db.verifyStarlightModelCloneIntent(e)
            : concept==='Lightning Plasma' && e?.entryConfig?.lightningPlasmaScaleIn
            ? await this.db.verifyLightningPlasmaScaleInIntent(e)
            : await this.db.verifyStarlightBrokerIntent(e,{quote:this.market?.getQuote?.(exactTicker)});
          if(!durable.ok){
            trace('EXECUTION','BLOCKED',durable.reason);
            return await this.rejectUndispatchedLightningEntry(e,durable.reason);
          }
        }
        if(isShadowSaintEntry(e) || !(scaleInCapital&&e?.entryConfig?.lightningPlasmaScaleIn
          || starlightReal&&e?.entryConfig?.starlightCapital
          || e?.entryConfig?.starlightModelClone===true
          || independentRecovery===true&&e?.entryConfig?.independentRecovery?.version==='INDEPENDENT-ATHENA-LOSS-V2'))
          throw new Error('capital_live_broker_entry_not_authorized');
        // The durable verifier awaits I/O. A changed quote during that await
        // must not retain a previously reached Athena threshold.
        if(starlightModelClone===true || scaleInCapital || (starlightRecovery===true && (starlightRecoverySnapshot?.athenaTrigger || athenaStarlightTriggerConfig(this.getSettings(),starlightRecoverySnapshot?.parentConcept).enabled))){
          const last=finalConfirmation();recordFinalConfirmation(last);
          if(!last.ok){
            trace('EXECUTION','BLOCKED',last.reason);
            return await this.rejectUndispatchedLightningEntry(e,last.reason);
          }
        }
        submissionAttempted=true;
        result=await this.kalshi.placeOrder({ticker:q.ticker,action:'buy',count:plannedCount,priceCents:q.yesAsk,clientOrderId:entryClientOrderId,exchangeIndex:shardPreflight.exchangeIndex,timeInForce:fullConfiguredSizeRequired?'fill_or_kill':'immediate_or_cancel'},{
          // HC2-R1: the bounded broker lane can wait AFTER all checks above.
          // Keep the original durable intent and ticker lock while waiting;
          // re-check the SAME authority only when this request may dispatch.
          beforeDispatch:async()=>{
            const current=finalConfirmation();recordFinalConfirmation(current);
            if(!current.ok)return current;
            if(this.db.shadowArchitectureRequired===true){
              const durable=independentRecovery===true
                ?await this.db.verifyIndependentRecoveryLiveIntent(e)
                :e?.entryConfig?.starlightModelClone===true
                ?await this.db.verifyStarlightModelCloneIntent(e)
                :starlightReal?await this.db.verifyStarlightBrokerIntent(e)
                :await this.db.verifyLightningPlasmaScaleInIntent(e);
              if(!durable?.ok)return durable;
            }
            // Pre-intent funding already had its own mutation authority. A
            // queued BUY only reads spendable target-shard cash, so it never
            // waits on a transfer queued behind its own mutation-lane slot.
            if(typeof this.kalshi.preflightExchangeBalance!=='function')
              return {ok:false,reason:'lp_live_dispatch_balance_gate_missing'};
            const balance=await this.kalshi.preflightExchangeBalance({ticker:exactTicker,
              exchangeIndex:shardPreflight.exchangeIndex,requiredCents:shardRequiredCents});
            if(!balance?.ok)return {ok:false,reason:balance?.reason||'lp_live_dispatch_balance_not_ready'};
            // Refresh depth AFTER durable/balance waits. Do not resize or
            // widen the frozen intent; verify its original quantity and IOC
            // limit against one current executable market/book snapshot.
            const refreshed=await this.prepareEntryExecution({...q,yesAsk:Number(q.yesAsk)},plannedCount);
            const currentSettings=this.getSettings(),envelope=hunterEntryEnvelope(currentSettings,concept);
            if(starlightReal || starlightModelClone===true){
              if(!refreshed?.freshMarket)
                return {ok:false,reason:'sc1_live_queued_book_not_fresh'};
              const fresh=finalConfirmation();
              if(!fresh.ok)return fresh;
              // Link ON has a distinct verified-stop admission; it does not
              // inherit the independent crash/rebound band restriction.
              if(!starlightLink&&!hunterEntryBoundaryQualifiedAtQuote(concept,
                refreshed.freshMarket,currentSettings,refreshed).ok)
                return {ok:false,reason:'sc1_live_queued_entry_geometry_changed'};
            }else if(independentRecovery===true){
              const confirmed=independentRecoveryExecutionDecision({authority:independentAuthority,
                parent:independentParent,concept,sourceTradeId,quote:refreshed?.freshMarket,
                settings:currentSettings,plan:refreshed,now:Date.now()});
              if(!confirmed.ok)return confirmed;
              if(Number(refreshed?.count)!==Number(plannedCount)
                ||Number(refreshed?.bestAskCents)>Number(q.yesAsk)+1e-9
                ||Number(refreshed?.averagePriceCents)>Number(q.yesAsk)+1e-9)
                return {ok:false,reason:'independent_queued_executable_book_changed'};
            }else{
              const freshSignal=lightningPlasmaFinalEntrySignal({quote:refreshed?.freshMarket,
                ticker:exactTicker,parentEntryCents:lpInitialParentEntryPriceCents,
                triggerCents:currentSettings.lightningPlasmaStarlightScaleInCents,
                minEntryCents:envelope?.minEntryCents,maxEntryCents:envelope?.maxEntryCents,
                authorizedAskCents:q.yesAsk,now:Date.now(),settings:currentSettings,observation:lpInitialObservation});
              if(!freshSignal.ok)return freshSignal;
              if(!hunterEntryBoundaryQualifiedAtQuote(concept,refreshed.freshMarket,currentSettings,refreshed).ok)
                return {ok:false,reason:'lp_live_queued_entry_guards_changed'};
            }
            dispatchExecution=structuredClone(refreshed);
            return confirmLiveEntryDispatch();
          },
          confirmDispatch:confirmLiveEntryDispatch,
        });
      }catch(error){
        if(!submissionAttempted)throw error;
        await this.audit('live_entry_submit_exception_pending_reconciliation',{id,ticker:q.ticker,concept,clientOrderId:entryClientOrderId,message:String(error?.message||error)},'warning');
        trace('EXECUTION','PASS','live_submit_exception_pending_reconciliation',{hunterId:id});
        return e;
      }finally{
        if(brokerMutationUnlock){
          try{await brokerMutationUnlock();}catch(error){await this.audit('live_broker_mutation_ticker_db_unlock_failed',{id,ticker:q.ticker,concept,operation:'entry',message:String(error?.message||error)},'error');}
        }
      }
      const entryOrderId=result?.orderId||null;
      if(result?.notSubmitted===true){
        // Unlike a network timeout, this rejection is produced by the LOCAL
        // dispatch boundary before any BUY was sent. It can safely release a
        // no-fill intent, and must not poison broker hard-reject suppression.
        const reason=String(result.localRejectionReason||'dispatch_not_authorized');
        const dispatchProof={version:'HC2-R1-DISPATCH',submitted:false,reason,atMs:Date.now()};
        trace('EXECUTION','BLOCKED',reason,{hunterId:id,submitted:false});
        await this.audit('live_entry_dispatch_refused',{id,concept,ticker:q.ticker,clientOrderId:entryClientOrderId,reason});
        return this.rejectUndispatchedLightningEntry(e,'live_entry_not_dispatched',{...pendingConfig,dispatchProof});
      }
      // R12: an immediate LIVE BUY response can precede complete fills history.
      // When an authoritative order inspector is available, do not promote a
      // planned-size intent into confirmed inventory from an unverified POST.
      // Preserve the ORIGINAL client receipt and reconcile on the next cycle.
      let brokerFillReadbackVerified=false;
      if (entryOrderId && typeof this.kalshi.inspectOrderById === 'function') {
        const inspected=await this.kalshi.inspectOrderById(entryOrderId,entryClientOrderId,q.ticker,'bid')
          .catch(()=>({found:false,authoritative:false,order:null}));
        if (!inspected?.authoritative || !inspected.order) {
          const patch={entryOrderId,status:'entry_pending',updatedAtMs:Date.now()};
          const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;e=saved.entry;
          await this.audit('live_entry_immediate_fill_awaiting_verification',
            {id,ticker:q.ticker,concept,clientOrderId:entryClientOrderId,orderId:entryOrderId,
              reportedFillCount:result?.fillCount??null,reason:inspected?.reason||'broker_truth_incomplete'},'warning');
          return e;
        }
        result={...result,...inspected.order,ambiguous:false};
        brokerFillReadbackVerified=true;
      } else if (typeof this.kalshi.inspectOrderByClientId === 'function'
          && (Number(result?.fillCount)>0 || result?.ambiguous===true || entryOrderId)) {
        // No exact order ID means neither the POST response nor a negative
        // list query can release this durable intent without exposure risk.
        const patch={entryOrderId,status:'entry_pending',updatedAtMs:Date.now()};
        const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;e=saved.entry;
        await this.audit('live_entry_missing_order_id_awaiting_reconciliation',
          {id,ticker:q.ticker,concept,clientOrderId:entryClientOrderId,reportedFillCount:result?.fillCount??null},'warning');
        return e;
      }
      if ((entryOrderId || result?.ok===true) && !brokerFillReadbackVerified) {
        // Missing inspector authority is not evidence of an unfilled BUY.
        // Keep the original durable receipt for reconciliation and protection.
        const saved=await this.persistPendingEntryResult(e,{entryOrderId,
          status:'entry_pending',updatedAtMs:Date.now()});
        if(!saved.applied)return saved.entry;
        await this.audit('live_entry_broker_inspection_required',
          {id,concept,ticker:q.ticker,clientOrderId:entryClientOrderId,
            orderId:entryOrderId},'warning');
        return saved.entry;
      }
      const liveClass=classifyLiveOrderResult(result);
      if(liveClass.kind==='fill'||Number(result?.fillCount)>0){
        const evidence=verifiedLiveBuyFillEconomics({readbackVerified:brokerFillReadbackVerified,
          orderId:entryOrderId,filledCount:result?.fillCount,
          averageFillPriceCents:result?.averageFillPriceCents,
          feePaidCents:result?.feePaidCents,plannedCount});
        if(!evidence.ok){
          // Neither a POST receipt nor an unvalidated broker adapter can
          // create authoritative ownership, fees, or a fabricated stop.
          const saved=await this.persistPendingEntryResult(e,{entryOrderId,
            status:'entry_pending',updatedAtMs:Date.now()});
          if(!saved.applied)return saved.entry;
          await this.audit('live_entry_fill_economics_awaiting_authoritative_readback',
            {id,concept,ticker:q.ticker,clientOrderId:entryClientOrderId,
              orderId:entryOrderId,reason:evidence.reason},'warning');
          return saved.entry;
        }
        const count=evidence.count;
        const entry=evidence.price;
        const entryFeeCents=evidence.fee;
        const entryFillProof={version:'ENTRY-FILL-REPORT-V1',authoritative:true,filledCount:count,averageFillPriceCents:entry,feePaidCents:entryFeeCents,orderId:entryOrderId,clientOrderId:entryClientOrderId,observedAtMs:Date.now()};
        let aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,mode:'LIVE',simFeeCents:simFeePerContract,damageControlPercent:auroraPercentFor(s,concept),calculatedAtMs:Date.now()});
        if(!aurora.ok){
          // The BUY is already durably owned. If the actual fill/fee economics
          // cannot produce any Aurora line inside the 45% covenant, do not
          // fabricate a stop snapshot. Persist the fault and immediately create
          // a durable full-position flattening obligation. U-SG1/protection
          // then retries safe execution until the owned quantity is closed.
          const config={...frozenEntryConfig,entryFillProof,auroraFault:{version:AURORA_EXECUTION.version,policyRevision:AURORA_EXECUTION.policyRevision,reason:aurora.reason||'exact_fill_fee_overrun',unprotectable:true,detectedAtMs:Date.now()}};
          const patch={status:'exit_pending',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,stopPriceCents:Math.max(0,entry-1),stopLossCents:1,count,remainingCount:count,entryFeeCents,entryOrderId,entryClientOrderId,entryConfig:config,closeReason:'aurora_covenant_fault',updatedAtMs:Date.now()};
          const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;
          e=saved.entry;
          try{this.onHunterOpened?.(e);}catch{}
          await this.audit('aurora_live_exact_fee_covenant_unprotectable',{id,ticker:q.ticker,concept,reason:aurora.reason,entryPriceCents:entry,count,entryFeeCents},'error');
          trace('AURORA','BLOCKED','live_exact_fee_covenant_unprotectable',{hunterId:id});
          return e;
        }
        const coffin=applyFreezingCoffin({...frozenEntryConfig,aurora},s,entry,Date.now(),concept);
        if(coffin.rejected){
          // R11: The broker has ALREADY filled real contracts. Never return
          // without replacing the original planned-size entry_pending row by
          // the actual filled exposure and a durable protection obligation.
          const config={...frozenEntryConfig,entryFillProof,aurora,freezingCoffinFault:{version:'R11-COFFIN-FILL-FAULT',reason:coffin.rejected.reason,detectedAtMs:Date.now()}};
          const patch={status:'exit_pending',closeReason:'freezing_coffin_covenant_fault',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,
            stopPriceCents:Math.max(0,entry-1),stopLossCents:1,count,remainingCount:count,entryFeeCents,entryOrderId,entryClientOrderId,entryConfig:config,updatedAtMs:Date.now()};
          const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;e=saved.entry;
          try{this.onHunterOpened?.(e);}catch{}
          await this.audit('freezing_coffin_postfill_protection_committed',{id,ticker:q.ticker,concept,reason:coffin.rejected.reason,filledCount:count},'error');
          return e;
        }
        const config={...coffin.config,entryFillProof};
        const stop=coffin.stop||aurora;
        const nonterminalBuy=['resting','pending','active','open','accepted'].includes(String(result?.status||'').toLowerCase());
        const patch={status:nonterminalBuy?'entry_pending':'open',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,stopPriceCents:stop.dangerPriceCents,stopLossCents:stop.stopDistanceCents,count,remainingCount:count,entryFeeCents,entryOrderId,entryClientOrderId,entryConfig:config,updatedAtMs:Date.now()};
        const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;
        e=saved.entry;
        if(nonterminalBuy){
          // R33: a nonterminal broker BUY may already own real, receipt-backed
          // partial inventory. Subscribe it for exit protection immediately;
          // it remains entry_pending for exact broker reconciliation, not an
          // invented terminal fill or a new BUY/SELL authorization.
          try{this.onHunterOpened?.(e);}catch{}
          await this.audit('live_entry_nonterminal_partial_held',{id,ticker:q.ticker,concept,orderId:entryOrderId,confirmedFillCount:count},'warning');
          trace('EXECUTION','PASS','live_partial_pending_terminal_broker_status',{orderId:entryOrderId,count});
          return e;
        }
        try{this.onHunterOpened?.(e);}catch{}
        trace('EXECUTION','PASS','live_fill',{orderId:entryOrderId,count});
        trace('OPENED','PASS','open',{hunterId:e.id,entryPriceCents:entry,count,auroraDangerPriceCents:aurora.dangerPriceCents});
        return e;
      }
      if(liveClass.kind==='ambiguous'||result?.ambiguous){
        const patch={entryOrderId,status:'entry_pending',entryConfig:{...pendingConfig,finalEntryConfirmation:frozenEntryConfig.finalEntryConfirmation||pendingConfig.finalEntryConfirmation||null},updatedAtMs:Date.now()};
        const saved=await this.persistPendingEntryResult(e,patch);if(!saved.applied)return saved.entry;e=saved.entry;
        trace('EXECUTION','PASS','live_ambiguous_pending',{orderId:entryOrderId,hunterId:id});
        return e;
      }
      if(liveClass.kind==='rejected'){
        const saved=await this.persistPendingEntryResult(e,{status:'rejected',remainingCount:0,entryOrderId,closeReason:liveClass.reason,updatedAtMs:Date.now()});
        if(!saved.applied)return saved.entry;
        this.rememberLiveBrokerHardReject(concept,q.ticker,boltId,{httpStatus:result?.httpStatus||null,brokerErrorCode:result?.brokerErrorCode||null,exchangeIndex:shardPreflight.exchangeIndex});
        trace('EXECUTION','BLOCKED',liveClass.reason,{orderId:entryOrderId,httpStatus:result?.httpStatus||null,brokerErrorCode:result?.brokerErrorCode||null,exchangeIndex:shardPreflight.exchangeIndex});
        await this.audit('live_entry_broker_rejected',{id,concept,ticker:q.ticker,orderId:entryOrderId,count:plannedCount,limitCents:q.yesAsk,reason:liveClass.reason,httpStatus:result?.httpStatus||null,brokerError:result?.brokerError||null,brokerErrorCode:result?.brokerErrorCode||null,brokerErrorDetails:result?.brokerErrorDetails??null,exchangeIndex:shardPreflight.exchangeIndex},'warning');
        return null;
      }
      const saved=await this.persistPendingEntryResult(e,{status:'rejected',remainingCount:0,entryOrderId,closeReason:'entry_ioc_unfilled',updatedAtMs:Date.now()});
      if(!saved.applied)return saved.entry;
      trace('EXECUTION','BLOCKED','live_ioc_unfilled',{orderId:entryOrderId});
      await this.audit('live_entry_ioc_unfilled',{id,concept,ticker:q.ticker,orderId:entryOrderId,count:plannedCount,limitCents:q.yesAsk});
      return null;
    } finally {
      releaseWitness?.();
      try {
        await releaseEntryCommitLock();
      } catch (e) {
        await this.audit('hunter_entry_commit_db_unlock_failed', { concept, ticker: exactTicker, message: String(e?.message || e) });
      }
      this.hunterTickerLocks.delete(tickerLockKey);
      // No broker order can exist from this invocation if it never crossed
      // persistExecutableEntry(). Record a durable phase witness ONLY for a
      // source-observed BLOCKED outcome; every uncertain write/sent outcome
      // stays in durable reconciliation, never in this retry release path.
      if(starlightClaimedCapitalProof && !starlightIntentBoundaryEntered
        && starlightPreIntentDenial && starlightRecoverySnapshot){
        await this.recordStarlightSourcePreIntentRefusal({snapshot:starlightRecoverySnapshot,
          quote:q,...starlightPreIntentDenial}).catch(async error=>{
          await this.audit('starlight_pre_intent_proof_write_failed',{
            authorizationId:starlightRecoverySnapshot.authorizationId,
            reason:String(error?.message||error).slice(0,180)}).catch(()=>{});
        });
      }
    }
  }

  async executeScarletContinuation(q, parentEntry, { authorizationId, rootEntryId, repeatIndex=1, maxRepeats=1, authorizedAtMs=Date.now() } = {}) {
    return null;
    const s=this.getSettings();
    if(s.scarletNeedleEnabled!==true)return null;
    const ticker=String(q?.ticker||''),parentTicker=String(parentEntry?.ticker||'');
    if(!ticker||ticker!==parentTicker)return null;
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall||{};
    if(!isProfitableExecutableParent(parentEntry))return null;
    if(String(parentEntry.conceptName||'')==='Scarlet Needle')return null;
    const confirm=followUpConfirmationState({
      preCrashPeakCents:Number(parentEntry.peakPriceCents||parentEntry.exitPriceCents||0),
      troughCents:Number(parentEntry.exitPriceCents||0),
      parentExitPriceCents:Number(parentEntry.exitPriceCents||0),
      lastBidCents:Number(q?.yesBid||0),
      upwardTicks:0,
      crashDepthCents:Math.max(0,Number(parentEntry.peakPriceCents||0)-Number(parentEntry.exitPriceCents||0)),
    },q,s,Date.now(),'Scarlet Needle');
    if(!confirm.qualified)return null;
    const parentSide=String(parentEntry?.side||parentEntry?.entryConfig?.side||'YES').toUpperCase();
    if(parentSide!=='YES')return null;
    const ask=Math.max(0,Number(q?.yesAsk||0)),bid=Math.max(0,Number(q?.yesBid||0));
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const envelope=hunterEntryEnvelope(s,'Scarlet Needle')||{minEntryCents:Number(s.scarletNeedleMinEntryCents),maxEntryCents:Number(s.scarletNeedleMaxEntryCents)};
    const minEntryCents=Number(envelope.minEntryCents),maxEntryCents=Number(envelope.maxEntryCents),stakeCents=Number(s.scarletNeedleStakeCents);
    const target=scarletContinuationEconomicTarget({askCents:ask,stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    const at=Math.max(1,Number(authorizedAtMs)||Date.now());
    const id=String(authorizationId||`SCARLET-CONTINUATION:${parentEntry.id}:1`);
    const lineage={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,authority:SCARLET_NEEDLE.strategicEntryAuthority,authorizationId:id,rootEntryId:String(rootEntryId||parentEntry.id),parentEntryId:String(parentEntry.id),parentConcept:String(parentEntry.conceptName||''),parentCrystalWallVersion:String(parentCrystalWall.version||''),parentCrashEpisodeId:String(parentCrystalWall.crashEpisodeId||''),repeatIndex:1,maxRepeatsAtEntry:1,parentClosedAtMs:Number(parentEntry.closedAtMs||0),parentExitPriceCents:Number(parentEntry.exitPriceCents||0),parentRealizedPnlCents:Number(parentEntry.pnlCents||0),authorizedAtMs:at,sameTicker:true,sameSide:true,ordinaryCooldownBypassed:true,ordinaryGameClockBypassed:true,athenaApprovalRequired:false,athenaSoulVetoApplied:false,fullConfiguredSizeRequired:true,fullExecutionSafetyRequired:true,profitTargetNetPerOriginalContractCents:target.netPerOriginalContractCents};
    const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority,authoritySource:'PROFITABLE_CRYSTAL_WALL_INFINITY_CLOSE',strategicSelectionBypassed:true,boltId:id,boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:at,expiresAtMs:at+5_000,ticker,eventTicker:String(q?.eventTicker||parentEntry?.eventTicker||ticker),side:'YES',selectedAttack:'Scarlet Needle',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Scarlet Needle']?.name||'Scarlet Needle',stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:minEntryCents,operatorMaxEntryCents:maxEntryCents,entryPriceCents:ask,authorizedMaxEntryCents:ask,maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,ranking:[{concept:'Scarlet Needle',displayName:EXECUTION_ATTACK_DISPLAY['Scarlet Needle']?.name||'Scarlet Needle',score:100,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority,targetFeasible:target.targetFeasible,requiredTargetBidCents:target.requiredTargetBidCents}],decisionEvidence:{scarletContinuation:lineage,parentClose:{entryId:String(parentEntry.id),concept:String(parentEntry.conceptName||''),closeReason:String(parentEntry.closeReason||''),realizedPnlCents:Number(parentEntry.pnlCents||0),exitPriceCents:Number(parentEntry.exitPriceCents||0),closedAtMs:Number(parentEntry.closedAtMs||0)},configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,athenaApprovalRequired:false,predictiveReVetoAllowed:false,normalStrategicDiscoveryBypassed:true,hardExecutionSafetyStillRequired:true}};
    const fireCommand=sealAthenaFireCommand(core);
    const decision={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,decision:'FIRE',reason:'crystal_wall_win_authorized_scarlet_continuation',decidedAtMs:at,boltId:id,ticker,ranking:core.ranking,selectedAttack:'Scarlet Needle',selectedAttackDisplay:core.selectedAttackDisplay,fireCommand,economicObjective:'CRYSTAL_WALL_WIN_DIRECT_CONTINUATION',configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,strategicAuthority:false,athenaApprovalRequired:false,scarletNeedleContinuationAuthority:true,durableFireRequired:true,durableFirePersisted:true};
    const bolt={id,ticker,eventTicker:core.eventTicker,side:'YES',sport:String(parentEntry?.sport||'Unknown'),detectedAtMs:at,expiresAtMs:core.expiresAtMs,fingerprint:null,features:{bidCents:bid,askCents:ask,sport:String(parentEntry?.sport||'Unknown'),eligibleAttacks:core.ranking},greenTrigger:null,preBoltClearance:null,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority};
    return this.executeAthenaFire(q,bolt,decision,{cosmos:[],scarletContinuation:lineage});
  }

  async executeCrystalWallAttack(q, watch = {}) {
    const s=this.getSettings();
    if(s.recoveryHunterEnabled!==true)return null;
    const ticker=String(q?.ticker||''),crashEpisodeId=String(watch?.crashEpisodeId||'');
    const authorizationId=String(watch?.authorizationId||`CRYSTAL-WALL-V3:${crashEpisodeId}`);
    if(!ticker||!crashEpisodeId||!authorizationId)return null;
    if(String(watch?.ticker||ticker)!==ticker)return null;
    const signal=crystalWallSignalState(watch,q,s,Date.now());
    if(!signal.qualified)return null;
    const ask=Number(signal.askCents||q?.yesAsk||0),bid=Number(signal.bidCents||q?.yesBid||0);
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const stakeCents=Number(s.recoveryStakeCents??CRYSTAL_WALL.defaultStakeCents);
    if(!(stakeCents>0))return null;
    const target=crystalWallEconomicTarget({askCents:ask,stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    const decidedAt=Date.now();
    const lineage={
      version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authority:CRYSTAL_WALL.strategicEntryAuthority,
      authorizationId,crashEpisodeId,ticker,eventTicker:String(q?.eventTicker||watch?.eventTicker||ticker),
      sourceKind:String(watch?.sourceKind||'TRACKED_MARKET'),coexistingEntryIds:[...(watch?.coexistingEntryIds||[])].map(String),
      crashStartedAtMs:Number(watch?.crashStartedAtMs||0),preCrashPeakCents:Number(watch?.preCrashPeakCents||0),
      troughCents:Number(signal.troughCents||0),troughAtMs:Number(signal.troughAtMs||0),crashDepthCents:Number(signal.crashDepthCents||0),
      reboundCents:Number(signal.reboundCents||0),minCrashCents:Number(signal.minCrashCents||CRYSTAL_WALL.defaultMinCrashCents),
      minReboundCents:Number(signal.minReboundCents||CRYSTAL_WALL.defaultMinReboundCents),upwardTicks:Number(signal.upwardTicks||0),lastBidCents:Number(signal.lastBidCents||bid||0),
      minUpwardTicks:Number(signal.minUpwardTicks||CRYSTAL_WALL.defaultMinUpwardTicks),authorizedAtMs:Number(watch?.authorizedAtMs||decidedAt),
      firedAtMs:decidedAt,sameTicker:true,sameSide:true,fixedStakeCents:stakeCents,stakeMultiplier:1,stakeMultiplierAllowed:false,
      fullConfiguredSizeRequired:true,oneEntryPerCrashEpisode:true,ordinaryGameClockBypassed:true,ordinaryCooldownBypassed:true,
      ordinaryEventEntryCapBypassed:true,fullExecutionSafetyRequired:true,reboundOrigin:CRYSTAL_WALL.reboundOrigin,reboundPrice:CRYSTAL_WALL.reboundPrice,
    };
    const command=sealCrystalWallFireCommand({
      version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authorityMode:CRYSTAL_WALL.strategicEntryAuthority,
      authoritySource:'CI1_CRASH_EPISODE',authorizationId,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:decidedAt,expiresAtMs:decidedAt+5_000,
      ticker,eventTicker:lineage.eventTicker,side:'YES',selectedAttack:'Recovery Hunter',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Recovery Hunter']?.name||'Crystal Wall',
      stakeCents,operatorMinEntryCents:Number(s.recoveryMinEntryCents),operatorMaxEntryCents:Number(s.recoveryMaxEntryCents),entryPriceCents:ask,
      authorizedMaxEntryCents:Number(s.recoveryMaxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
      infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,decisionEvidence:{crystalWall:lineage},
    });
    const qualification={version:'CRYSTAL-WALL-V3-Q1',policyRevision:CRYSTAL_WALL.policyRevision,crystalWall:lineage,observedAtMs:decidedAt};
    const wallSpawn={sourceTradeId:crashEpisodeId,crystalWallSourceSnapshot:lineage,entryQualificationSnapshot:qualification,crystalWallFireCommand:command,liveWatch:watch,legacyCompatibility:false};
    const opened=await this.createHunter('Recovery Hunter',q,stakeCents,0,wallSpawn);
    if(opened && watch?.galacticGrant!==true){
      await this.grantGalacticSaintsAfterAthenaOpen(q,{id:`ci1:${opened.id}`,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,features:{askCents:ask,bidCents:bid,crashDepthCents:lineage.crashDepthCents,reboundCents:lineage.reboundCents,upwardTicks:lineage.upwardTicks}},opened,{watch:lineage}).catch((error)=>{
        this.audit('galactic_saint_grant_failed',{ticker:q?.ticker||null,sourceId:opened.id,message:String(error?.message||error)},'warning').catch(()=>{});
      });
    }
    if(opened)await this.stackSameAttackSeats('Recovery Hunter',q,opened,wallSpawn);
    return opened;
  }

  // Compatibility surface only: V3 cannot be armed by a closed parent trade.
  async executeCrystalWallContinuation() { return null; }

  async executeJusticeArrowAttack(q, watch = {}) {
    const s=this.getSettings();
    if(s.justiceArrowEnabled!==true)return null;
    const ticker=String(q?.ticker||''),crashEpisodeId=String(watch?.crashEpisodeId||'');
    const authorizationId=String(watch?.authorizationId||`JUSTICE-ARROW-V2:${crashEpisodeId}`);
    if(!ticker||!crashEpisodeId||!authorizationId)return null;
    if(String(watch?.ticker||ticker)!==ticker)return null;
    const signal=justiceArrowSignalState(watch,q,s,Date.now());
    if(!signal.qualified)return null;
    const ask=Number(signal.askCents||q?.yesAsk||0),bid=Number(signal.bidCents||q?.yesBid||0);
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const stakeCents=Number(s.justiceArrowStakeCents??SAGITTARIUS_JUSTICE_ARROW.defaultStakeCents);
    if(!(stakeCents>0))return null;
    const target=justiceArrowEconomicTarget({askCents:ask,stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    const decidedAt=Date.now();
    const lineage={
      version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authority:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,
      authorizationId,crashEpisodeId,ticker,eventTicker:String(q?.eventTicker||watch?.eventTicker||ticker),
      sourceKind:String(watch?.sourceKind||'TRACKED_MARKET'),coexistingEntryIds:[...(watch?.coexistingEntryIds||[])].map(String),
      crashStartedAtMs:Number(watch?.crashStartedAtMs||0),preCrashPeakCents:Number(watch?.preCrashPeakCents||0),
      troughCents:Number(signal.troughCents||0),troughAtMs:Number(signal.troughAtMs||0),crashDepthCents:Number(signal.crashDepthCents||0),
      reboundCents:Number(signal.reboundCents||0),minCrashCents:Number(signal.minCrashCents||SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents),
      minReboundCents:Number(signal.minReboundCents||SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents),upwardTicks:Number(signal.upwardTicks||0),lastBidCents:Number(signal.lastBidCents||bid||0),
      minUpwardTicks:Number(signal.minUpwardTicks||SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks),authorizedAtMs:Number(watch?.authorizedAtMs||decidedAt),
      firedAtMs:decidedAt,sameTicker:true,sameSide:true,fixedStakeCents:stakeCents,stakeMultiplier:1,stakeMultiplierAllowed:false,
      fullConfiguredSizeRequired:true,oneEntryPerCrashEpisode:true,ordinaryGameClockBypassed:true,ordinaryCooldownBypassed:true,
      ordinaryEventEntryCapBypassed:true,fullExecutionSafetyRequired:true,reboundOrigin:SAGITTARIUS_JUSTICE_ARROW.reboundOrigin,reboundPrice:SAGITTARIUS_JUSTICE_ARROW.reboundPrice,
      profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,lossAuthority:AURORA_EXECUTION.lossAuthority,
    };
    const command=sealJusticeArrowFireCommand({
      version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authorityMode:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,
      authoritySource:'CI1_CRASH_EPISODE',authorizationId,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:decidedAt,expiresAtMs:decidedAt+5_000,
      ticker,eventTicker:lineage.eventTicker,side:'YES',selectedAttack:'Sagittarius Justice Arrow',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Sagittarius Justice Arrow']?.name||'Sagittarius Justice Arrow',
      stakeCents,operatorMinEntryCents:Number(s.justiceArrowMinEntryCents),operatorMaxEntryCents:Number(s.justiceArrowMaxEntryCents),entryPriceCents:ask,
      authorizedMaxEntryCents:Number(s.justiceArrowMaxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
      profitAuthority:attackUsesAthenaX1(s,'Sagittarius Justice Arrow')?ATHENA_EXIT_INTELLIGENCE.version:INFINITY_BREAK.version,infinityBreakPolicyVersion:attackUsesAthenaX1(s,'Sagittarius Justice Arrow')?null:INFINITY_BREAK.version,economicTarget:target,decisionEvidence:{justiceArrow:lineage},
    });
    const qualification={version:'SAGITTARIUS-JUSTICE-ARROW-V2-Q1',policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,justiceArrow:lineage,observedAtMs:decidedAt};
    const jaSpawn={sourceTradeId:crashEpisodeId,justiceArrowSourceSnapshot:lineage,entryQualificationSnapshot:qualification,justiceArrowFireCommand:command,liveWatch:watch,legacyCompatibility:false};
    const opened=await this.createHunter('Sagittarius Justice Arrow',q,stakeCents,0,jaSpawn);
    if(opened && watch?.galacticGrant!==true){
      await this.grantGalacticSaintsAfterAthenaOpen(q,{id:`ci1:${opened.id}`,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,features:{askCents:ask,bidCents:bid,crashDepthCents:lineage.crashDepthCents,reboundCents:lineage.reboundCents,upwardTicks:lineage.upwardTicks}},opened,{watch:lineage}).catch((error)=>{
        this.audit('galactic_saint_grant_failed',{ticker:q?.ticker||null,sourceId:opened.id,message:String(error?.message||error)},'warning').catch(()=>{});
      });
    }
    if(opened)await this.stackSameAttackSeats('Sagittarius Justice Arrow',q,opened,jaSpawn);
    return opened;
  }

  // Compatibility surface only: SJA2 is never authorized by Gemini/Another
  // Dimension closure. The former V1 continuation path is intentionally inert.
  async executeJusticeArrowContinuation() { return null; }

  async executeIndependentCi1Attack(concept, q, watch = {}) {
    const s=this.getSettings();
    if(!CI1_WALL_CLONE.saints.includes(String(concept||'')))return null;
    if(concept==='Recovery Hunter'||concept==='Sagittarius Justice Arrow')return null;
    if(!isModelEnabled(s,concept))return null;
    const ticker=String(q?.ticker||''),crashEpisodeId=String(watch?.crashEpisodeId||'');
    const authorizationId=String(watch?.authorizationId||`CI1-WALL-CLONE:${concept}:${crashEpisodeId}`);
    if(!ticker||!crashEpisodeId||!authorizationId)return null;
    if(String(watch?.ticker||ticker)!==ticker)return null;
    if(typeof this.db?.entryByConceptSourceTradeId==='function'){
      const prior=await this.db.entryByConceptSourceTradeId(s.systemName,concept,crashEpisodeId).catch(()=>null);
      if(ci1EpisodeEntryConsumes(prior,s.mode))return null;
    }
    const signal=independentCi1SignalState(concept,watch,q,s,Date.now());
    if(!signal.qualified)return null;
    const ask=Number(signal.askCents||q?.yesAsk||0),bid=Number(signal.bidCents||q?.yesBid||0);
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const stakeCents=attackConfiguredStakeCents(s,concept);
    if(!(stakeCents>0))return null;
    const target=this.galacticSaintEconomicTarget(concept,ask,stakeCents,s);
    if(target.targetFeasible===false)return null;
    const decidedAt=Date.now();
    const lineage={
      version:CI1_WALL_CLONE.version,policyRevision:CI1_WALL_CLONE.policyRevision,authority:CI1_WALL_CLONE.strategicEntryAuthority,
      authorizationId,crashEpisodeId,ticker,eventTicker:String(q?.eventTicker||watch?.eventTicker||ticker),concept,
      sourceKind:String(watch?.sourceKind||'TRACKED_MARKET'),
      crashStartedAtMs:Number(watch?.crashStartedAtMs||0),preCrashPeakCents:Number(watch?.preCrashPeakCents||0),
      troughCents:Number(signal.troughCents||0),troughAtMs:Number(signal.troughAtMs||0),crashDepthCents:Number(signal.crashDepthCents||0),
      reboundCents:Number(signal.reboundCents||0),upwardTicks:Number(signal.upwardTicks||0),lastBidCents:Number(signal.lastBidCents||bid||0),
      minCrashCents:Number(signal.minCrashCents||CI1_WALL_CLONE.minCrashCents),
      minReboundCents:Number(signal.minReboundCents||CI1_WALL_CLONE.minReboundCents),
      minUpwardTicks:Number(signal.minUpwardTicks||CI1_WALL_CLONE.minUpwardTicks),
      authorizedAtMs:Number(watch?.authorizedAtMs||decidedAt),firedAtMs:decidedAt,
      sameTicker:true,sameSide:true,fixedStakeCents:stakeCents,
      ordinaryGameClockBypassed:true,ordinaryCooldownBypassed:true,ordinaryEventEntryCapBypassed:true,
      fullExecutionSafetyRequired:true,oneEntryPerCrashEpisode:true,
    };
    const envelope=hunterEntryEnvelope(s,concept);
    const command=sealIndependentCi1FireCommand({
      version:CI1_WALL_CLONE.version,policyRevision:CI1_WALL_CLONE.policyRevision,authorityMode:CI1_WALL_CLONE.strategicEntryAuthority,
      authoritySource:'CI1_CRASH_EPISODE',authorizationId,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:decidedAt,expiresAtMs:decidedAt+5_000,
      ticker,eventTicker:lineage.eventTicker,side:'YES',selectedAttack:concept,selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,
      stakeCents,operatorMinEntryCents:envelope.minEntryCents,operatorMaxEntryCents:envelope.maxEntryCents,entryPriceCents:ask,
      authorizedMaxEntryCents:envelope.maxEntryCents,maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
      profitAuthority:attackUsesAthenaX1(s,concept)?ATHENA_EXIT_INTELLIGENCE.version:INFINITY_BREAK.version,
      infinityBreakPolicyVersion:attackUsesAthenaX1(s,concept)?null:INFINITY_BREAK.version,
      economicTarget:target,decisionEvidence:{ci1WallClone:lineage},
    });
    const qualification={version:'CI1-WALL-CLONE-V1-Q1',policyRevision:CI1_WALL_CLONE.policyRevision,ci1WallClone:lineage,observedAtMs:decidedAt};
    const ci1Spawn={sourceTradeId:crashEpisodeId,ci1SourceSnapshot:lineage,entryQualificationSnapshot:qualification,ci1FireCommand:command,liveWatch:watch,legacyCompatibility:false};
    if(concept==='Athena Exclamation'&&attackMultiplySeats(s,concept)>1){
      const token={},batch={settingsHash:executionSettingsHash(s),multiply:attackMultiplySeats(s,concept),entries:[],confirmations:[]};
      const simulationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
      let release=null;
      pendingAthenaShadowBatches.set(token,batch);
      try{
        for(let seat=1;seat<=batch.multiply;seat++){
          const prepared=await this.createHunter(concept,q,stakeCents,0,{...ci1Spawn,
            shadowAdmissionBatch:token,stackSeat:seat>1,stackIndex:seat,stackParentId:batch.entries[0]?.id||null});
          if(!prepared){await this.audit('shadow_athena_group_deferred',{concept,ticker,multiply:batch.multiply,prepared:batch.entries.length},'warning');return null;}
        }
        if(s.mode==='SIMULATION'&&this.enterSimulationMutation){release=this.enterSimulationMutation(simulationToken);if(!release)return null;}
        const scope=await this.db.captureShadowScope(s);
        const isCurrent=()=>sameShadowScope(this.getSettings(),s)&&executionSettingsHash(this.getSettings())===batch.settingsHash
          &&batch.confirmations.every(confirm=>confirm().ok===true);
        const result=await this.db.insertAthenaShadowBatch(batch.entries,scope,{multiply:batch.multiply,isCurrent});
        if(!result.ok){await this.audit('shadow_athena_group_deferred',{concept,ticker,reason:result.reason},'warning');return null;}
        await this.audit('shadow_athena_group_opened',{concept,ticker,multiply:batch.multiply,ids:result.entries.map(e=>e.id),brokerOrderAuthority:false});
        return result.entries[0];
      }finally{pendingAthenaShadowBatches.delete(token);release?.();}
    }
    const opened=await this.createHunter(concept,q,stakeCents,0,ci1Spawn);
    if(opened)await this.stackSameAttackSeats(concept,q,opened,ci1Spawn);
    return opened;
  }

  async executeLightningPlasmaContinuation(q, parentShadow, { authorizationId, authorizedAtMs=Date.now(), recoveryContext=null } = {}) {
    return null;
    const s=this.getSettings();
    if(s.lightningPlasmaEnabled!==true)return null;
    const parentEntry=parentShadow;
    if(!isProfitableExecutableParent(parentEntry))return null;
    if(String(parentEntry.conceptName||'')==='Lightning Plasma')return null;
    const ticker=String(q?.ticker||''),parentTicker=String(parentShadow?.ticker||'');
    if(!ticker||ticker!==parentTicker)return null;
    const parentSide=String(parentShadow?.side||parentShadow?.entryConfig?.side||'YES').toUpperCase();
    if(parentSide!=='YES')return null;
    const ask=Math.max(0,Number(q?.yesAsk||0)),bid=Math.max(0,Number(q?.yesBid||0));
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const signal=followUpConfirmationState({
      preCrashPeakCents:Number(parentEntry.peakPriceCents||parentEntry.exitPriceCents||0),
      troughCents:Number(recoveryContext?.troughCents||parentEntry.exitPriceCents||0),
      parentExitPriceCents:Number(parentEntry.exitPriceCents||0),
      lastBidCents:Number(q?.yesBid||0),
      upwardTicks:0,
      crashDepthCents:Math.max(0,Number(parentEntry.peakPriceCents||0)-Number(parentEntry.exitPriceCents||0)),
    },q,s,Date.now(),'Lightning Plasma');
    if(!signal.qualified)return null;
    const minEntryCents=Number(s.lightningPlasmaMinEntryCents),maxEntryCents=Number(s.lightningPlasmaMaxEntryCents),stakeCents=Number(s.lightningPlasmaFieldStakeCents);
    const target=lightningPlasmaContinuationEconomicTarget({askCents:ask,stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    const at=Math.max(1,Number(authorizedAtMs)||Date.now());
    const decidedAt=Date.now();
    const id=String(authorizationId||`LIGHTNING-PLASMA-CONTINUATION:${parentShadow.id}:1`);
    const lineage={
      version:LIGHTNING_PLASMA.version,policyRevision:LIGHTNING_PLASMA.policyRevision,
      authority:LIGHTNING_PLASMA.strategicEntryAuthority,authorizationId:id,
      parentShadowTradeId:String(parentShadow.id),parentConcept:String(parentShadow.conceptName||''),
      sourceCosmo:String(parentShadow.sourceFeeder||parentShadow.entryConfig?.sourceFeeder||''),
      sourceCosmoTradeId:String(parentShadow.sourceTradeId||parentShadow.entryConfig?.sourceTradeId||''),
      parentClosedAtMs:Number(parentShadow.closedAtMs||0),parentExitPriceCents:Number(parentShadow.exitPriceCents||0),
      parentRealizedPnlCents:Number(parentShadow.pnlCents||0),parentCloseReason:String(parentShadow.closeReason||''),
      authorizedAtMs:at,firedAtMs:decidedAt,sameTicker:true,sameSide:true,ordinaryCooldownBypassed:true,fullExecutionSafetyRequired:true,
      reboundCents:Number(signal.reboundCents||0),troughCents:Number(signal.troughCents||0),
      reboundOrigin:LIGHTNING_PLASMA.reboundOrigin,reboundPrice:LIGHTNING_PLASMA.reboundPrice,
      profitAuthority:INFINITY_BREAK.version,lossAuthority:AURORA_EXECUTION.lossAuthority,
    };
    const ranking=[{concept:'Lightning Plasma',displayName:EXECUTION_ATTACK_DISPLAY['Lightning Plasma']?.name||'Lightning Plasma',score:100,authorityMode:LIGHTNING_PLASMA.strategicEntryAuthority,targetFeasible:target.targetFeasible,requiredTargetBidCents:target.requiredTargetBidCents}];
    const core={
      version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,
      authorityMode:LIGHTNING_PLASMA.strategicEntryAuthority,authoritySource:'LOSS_ANOTHER_DIMENSION_CLOSE',
      strategicSelectionBypassed:true,boltId:id,boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,
      decidedAtMs:decidedAt,expiresAtMs:decidedAt+5_000,ticker,eventTicker:String(q?.eventTicker||parentShadow?.eventTicker||ticker),side:'YES',
      selectedAttack:'Lightning Plasma',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Lightning Plasma']?.name||'Lightning Plasma',
      stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:minEntryCents,operatorMaxEntryCents:maxEntryCents,
      entryPriceCents:ask,authorizedMaxEntryCents:ask,maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
      infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,ranking,
      decisionEvidence:{
        lightningPlasmaContinuation:lineage,
        anotherDimensionClose:{entryId:String(parentShadow.id),universe:'Gemini',concept:'Another Dimension',sourceCosmo:lineage.sourceCosmo,sourceCosmoTradeId:lineage.sourceCosmoTradeId,closeReason:String(parentShadow.closeReason||''),realizedPnlCents:Number(parentShadow.pnlCents||0),exitPriceCents:Number(parentShadow.exitPriceCents||0),closedAtMs:Number(parentShadow.closedAtMs||0)},
        recoveryContext:{troughCents:signal.troughCents,reboundCents:signal.reboundCents,observationId:null},
        configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,
        predictiveReVetoAllowed:false,normalStrategicDiscoveryBypassed:true,hardExecutionSafetyStillRequired:true,
      },
    };
    const fireCommand=sealAthenaFireCommand(core);
    const decision={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,decision:'FIRE',reason:'lightning_plasma_post_shadow_loss',decidedAtMs:decidedAt,boltId:id,ticker,ranking,selectedAttack:'Lightning Plasma',selectedAttackDisplay:core.selectedAttackDisplay,fireCommand,economicObjective:'POST_SHADOW_LOSS_REBOUND_CONTINUATION',configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,strategicAuthority:false,lightningPlasmaContinuationAuthority:true,durableFireRequired:true,durableFirePersisted:true};
    const bolt={id,ticker,eventTicker:core.eventTicker,side:'YES',sport:String(parentShadow?.sport||'Unknown'),detectedAtMs:decidedAt,expiresAtMs:core.expiresAtMs,fingerprint:null,features:{bidCents:bid,askCents:ask,sport:String(parentShadow?.sport||'Unknown'),eligibleAttacks:ranking},greenTrigger:null,preBoltClearance:null,authorityMode:LIGHTNING_PLASMA.strategicEntryAuthority};
    return this.executeAthenaFire(q,bolt,decision,{cosmos:[],lightningPlasmaContinuation:lineage,parentEntry,recoveryContext:core.decisionEvidence.recoveryContext});
  }

  async executeAthenaFire(q, bolt, decision, context = {}) {
    const s = this.getSettings();
    this.lastAthenaFireAbort=null;
    const command = decision?.fireCommand;
    if (decision?.decision !== 'FIRE' || !command) { this.lastAthenaFireAbort='athena_fire_required'; return null; }
    const concept = String(command.selectedAttack || '');
    const pre = validateAthenaFireCommand(command,{concept,q,settings:s,now:Date.now()});
    if (!pre.ok) {
      this.lastAthenaFireAbort=pre.reason;
      await this.audit('athena_fire_execution_aborted',{boltId:bolt?.id||command.boltId||null,ticker:q?.ticker||null,concept,reason:pre.reason,stage:'pre_execution'});
      return null;
    }
    const cosmos = Array.isArray(context.cosmos) ? context.cosmos : [];
    const triggerShadowId=String(bolt?.greenTrigger?.shadowTradeId||command?.decisionEvidence?.greenTrigger?.shadowTradeId||'');
    const source = cosmos.find(x=>String(x?.id||'')===triggerShadowId) || cosmos.slice().sort((a,b)=>Number(b?.openedAtMs||0)-Number(a?.openedAtMs||0))[0] || null;
    let sourceTradeId = source?.id || null;
    if (concept === 'Athena Exclamation') {
      const frozenField=context.fieldContext||command?.decisionEvidence?.fieldContext||null;
      const candidate=frozenField?.athenaExclamationCandidate||null,saintCount=Number(candidate?.saintCount||0);
      if(!candidate?.id||String(candidate.ticker||'')!==String(q?.ticker||'')||!(saintCount>=ATHENA_EXCLAMATION.minimumSaints)||Number(candidate.expiresAtMs||0)<=Date.now()){
        this.lastAthenaFireAbort='three_saints_candidate_missing_or_expired';
        await this.audit('athena_fire_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept,reason:'three_saints_candidate_missing_or_expired',stage:'structural_eligibility',saintCount,eventId:candidate?.id||null});
        return null;
      }
    }
    const scarletContinuation=null;
    const lightningPlasmaContinuation=null;
    const entryQualificationSnapshot = {
      version:scarletContinuation?'SCARLET-CONTINUATION-Q1':lightningPlasmaContinuation?'LIGHTNING-PLASMA-CONTINUATION-Q1':'ATHENA-A3-FIRE-Q1',boltId:bolt?.id||command.boltId,commandHash:command.commandHash,selectedAttack:concept,
      operatorBand:{minEntryCents:Number(command.operatorMinEntryCents),maxEntryCents:Number(command.operatorMaxEntryCents)},
      authorizedMaxEntryCents:Number(command.authorizedMaxEntryCents),observedFeatures:structuredClone(command?.decisionEvidence?.features||{}),
      greenTrigger:structuredClone(command?.decisionEvidence?.greenTrigger||bolt?.greenTrigger||null),
      preBoltClearance:structuredClone(command?.decisionEvidence?.preBoltClearance||bolt?.preBoltClearance||null),
      fieldContext:structuredClone(context.fieldContext||command?.decisionEvidence?.fieldContext||null),
      arayashiki:null,
      scarletNeedle:concept==='Scarlet Needle'?structuredClone(command?.decisionEvidence?.scarletNeedle||null):null,scarletContinuation,lightningPlasmaContinuation,observedAtMs:Date.now(),
    };
    const athenaSpawn={sourceFeeder:source?.conceptName||null,sourceTradeId,sourceEntryConfig:source?.entryConfig||null,crashSourceSnapshot:context.crashSignal?structuredClone(context.crashSignal):null,entryQualificationSnapshot,athenaFireCommand:command,legacyCompatibility:false};
    const e = await this.createHunter(concept,q,Number(command.stakeCents),0,athenaSpawn);
    if (e && typeof this.db?.upsertOpportunityEpisode === 'function') {
      await this.db.upsertOpportunityEpisode({id:bolt?.id||command.boltId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker:e.ticker,eventTicker:e.eventTicker,side:'YES',sport:bolt?.sport||bolt?.features?.sport||'Unknown',boltAtMs:Number(bolt?.detectedAtMs||command.decidedAtMs),boltSnapshot:bolt||{},athenaDecision:decision,fireCommand:command,attackSelected:concept,entryId:e.id,entryAtMs:Number(e.openedAtMs||Date.now()),updatedAtMs:Date.now()}).catch(()=>{});
    }
    if(e&&source?.id&&ACTIVE_FEEDER_CONCEPTS.has(String(source.conceptName||''))&&typeof this.db?.updateEntry==='function'){
      const durable=typeof this.db?.entryById==='function'?await this.db.entryById(source.id).catch(()=>null):null;
      const feederState={...(durable?.feederState||source.feederState||{}),shadowTradeVersion:'COSMO-SHADOW-V1',atomicThunderBoltId:String(bolt?.id||command.boltId||''),atomicThunderBoltAtMs:Number(bolt?.detectedAtMs||command.decidedAtMs||Date.now()),athenaFireCommandHash:String(command.commandHash||''),athenaSelectedAttack:concept,athenaFiredAtMs:Number(command.decidedAtMs||Date.now()),realEntryId:e.id,realEntryAtMs:Number(e.openedAtMs||Date.now())};
      await this.db.updateEntry(source.id,{feederState,updatedAtMs:Date.now()}).catch(()=>{});
    }
    if(e && context?.galacticGrant!==true){
      await this.grantGalacticSaintsAfterAthenaOpen(q,bolt,e,context).catch((error)=>{
        this.audit('galactic_saint_grant_failed',{ticker:q?.ticker||null,sourceId:e.id,message:String(error?.message||error)},'warning').catch(()=>{});
      });
    }
    if(e)await this.stackSameAttackSeats(concept,q,e,athenaSpawn);
    return e;
  }

  galacticSaintEconomicTarget(concept, askCents, stakeCents, settings){
    const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
    const target=concept==='Scarlet Needle'
      ? Math.max(0.01,Number(settings.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents))
      : Math.max(0.01,Number(settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents));
    const simFee=Math.max(0,Number(settings.simFeeCents||0));
    const requiredTargetBidCents=Math.ceil(ask+target+2*simFee-1e-9);
    return {version:'ATHENA-A3-ECONOMIC-TARGET-V1',netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:simFee,estimatedExitFeePerContractCents:simFee,targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
  }

  galacticJoinFeatures(q, bolt, sourceEntry, context={}){
    const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);
    const snap=context.watch||sourceEntry?.justiceArrowSourceSnapshot||sourceEntry?.crystalWallSourceSnapshot||sourceEntry?.entryQualificationSnapshot?.justiceArrow||sourceEntry?.entryQualificationSnapshot?.crystalWall||context.crashSignal||{};
    const feat=bolt?.features||{};
    return {
      ...feat,
      askCents:ask,
      bidCents:bid,
      crashDepthCents:Number(snap.crashDepthCents??feat.crashDepthCents??feat.currentCrashDepthCents??0),
      reboundCents:Number(snap.reboundCents??feat.reboundCents??feat.currentReboundCents??0),
      upwardTicks:Number(snap.upwardTicks??feat.upwardTicks??feat.currentUpwardTicks??0),
      currentCrashDepthCents:Number(snap.crashDepthCents??feat.currentCrashDepthCents??0),
      currentReboundCents:Number(snap.reboundCents??feat.currentReboundCents??0),
      currentUpwardTicks:Number(snap.upwardTicks??feat.currentUpwardTicks??0),
    };
  }

  galacticJoinWatch(q, sourceEntry, context={}, features={}){
    const prior=context.watch||sourceEntry?.justiceArrowSourceSnapshot||sourceEntry?.crystalWallSourceSnapshot||{};
    const ticker=String(q?.ticker||sourceEntry?.ticker||'');
    return {
      ...prior,
      ticker,
      eventTicker:String(q?.eventTicker||sourceEntry?.eventTicker||ticker),
      crashEpisodeId:String(prior.crashEpisodeId||sourceEntry?.sourceTradeId||`GE-PARENT:${sourceEntry?.id||ticker}`),
      authorizationId:prior.authorizationId||null,
      parentAuthorizationId:prior.authorizationId||null,
      parentEntryId:sourceEntry?.id||null,
      preCrashPeakCents:Number(prior.preCrashPeakCents||features.askCents||q?.yesAsk||0),
      troughCents:Number(prior.troughCents||Math.max(0,Number(q?.yesBid||0)-Number(features.reboundCents||0))),
      crashDepthCents:Number(features.crashDepthCents||prior.crashDepthCents||0),
      reboundCents:Number(features.reboundCents||prior.reboundCents||0),
      upwardTicks:Number(features.upwardTicks||prior.upwardTicks||0),
      lastBidCents:Number(q?.yesBid||prior.lastBidCents||0),
      galacticGrant:true,
    };
  }

  async grantGalacticSaintsAfterAthenaOpen(q, bolt, sourceEntry, context={}){
    const s=this.getSettings();
    if(s.galacticExplosionEnabled!==true)return [];
    if(!sourceEntry?.id||!q?.ticker)return [];
    const sourceConcept=String(sourceEntry.conceptName||'');
    const saints=[...(GALACTIC_EXPLOSION.grantedSaints||[])].filter((concept)=>!(GALACTIC_EXPLOSION.excludedMetaAttacks||[]).includes(concept));
    const opened=[];
    const ask=Number(q.yesAsk||0),bid=Number(q.yesBid||0);
    const now=Date.now();
    const features=this.galacticJoinFeatures(q,bolt,sourceEntry,context);
    for(const concept of saints){
      if(concept===sourceConcept)continue;
      if(!isModelEnabled(s,concept))continue;
      const envelope=hunterEntryEnvelope(s,concept);
      const stakeCents=attackConfiguredStakeCents(s,concept);
      if(!envelope||!(stakeCents>0)||ask<envelope.minEntryCents||ask>envelope.maxEntryCents){
        await this.audit('galactic_saint_grant_skipped',{ticker:q.ticker,sourceId:sourceEntry.id,concept,reason:'band_or_stake'});
        continue;
      }
      const geometry=attackGeometryQualified(s,concept,features);
      if(!geometry.ok){
        await this.audit('galactic_saint_grant_skipped',{ticker:q.ticker,sourceId:sourceEntry.id,concept,reason:geometry.reason});
        continue;
      }
      if(concept==='Recovery Hunter' || concept==='Sagittarius Justice Arrow'){
        const watch={...this.galacticJoinWatch(q,sourceEntry,context,features),authorizationId:`${concept}:${sourceEntry.id}:${String(context.watch?.crashEpisodeId||sourceEntry.sourceTradeId||sourceEntry.id)}`,parentAuthorizationId:context.watch?.authorizationId||null};
        const granted=concept==='Recovery Hunter'
          ? await this.executeCrystalWallAttack(q,watch)
          : await this.executeJusticeArrowAttack(q,watch);
        if(granted){
          opened.push(granted);
          await this.audit('galactic_saint_granted',{ticker:q.ticker,sourceId:sourceEntry.id,sourceConcept,grantedId:granted.id,concept,door:'ci1_join'});
        }else{
          await this.audit('galactic_saint_grant_blocked',{ticker:q.ticker,sourceId:sourceEntry.id,concept,reason:this.lastAthenaFireAbort||'independent_card_blocked'});
        }
        continue;
      }
      const target=this.galacticSaintEconomicTarget(concept,ask,stakeCents,s);
      if(target.targetFeasible===false){
        await this.audit('galactic_saint_grant_skipped',{ticker:q.ticker,sourceId:sourceEntry.id,concept,reason:'economic_target_unreachable'});
        continue;
      }
      const replicaBoltId=`${String(bolt?.id||sourceEntry.id)}:ge:${concept}`;
      const core={
        version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,
        boltId:replicaBoltId,boltFingerprint:bolt?.fingerprint||null,systemName:s.systemName,sourceRelease:RELEASE,
        decidedAtMs:now,expiresAtMs:now+5_000,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,side:'YES',
        selectedAttack:concept,selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,
        stakeCents,fieldBudgetCents:concept==='Lightning Plasma'?stakeCents:null,
        maxRays:concept==='Lightning Plasma'?Math.max(1,Math.floor(Number(s.lightningPlasmaMaxStrikes||1))):null,
        operatorMinEntryCents:envelope.minEntryCents,operatorMaxEntryCents:envelope.maxEntryCents,
        entryPriceCents:ask,authorizedMaxEntryCents:ask,maxSpreadCents:Number(s.maxSpreadCents??3),
        auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
        infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,
        ranking:[{concept,score:100,authorityMode:'ATHENA_A3'}],
        decisionEvidence:{
          features:structuredClone(features),
          greenTrigger:structuredClone(bolt?.greenTrigger||null),
          galacticGrant:{version:GALACTIC_EXPLOSION.version,sourceEntryId:sourceEntry.id,sourceConcept,grantedAttack:concept,parentAuthorizationId:context.watch?.authorizationId||null},
          ci1WallClone:{authorizationId:`GE-CHILD:${sourceEntry.id}:${concept}`,crashEpisodeId:String(context.watch?.crashEpisodeId||sourceEntry.sourceTradeId||''),parentEntryId:sourceEntry.id,parentAuthorizationId:context.watch?.authorizationId||null,...this.galacticJoinWatch(q,sourceEntry,context,features)},
        },
      };
      const fireCommand=sealAthenaFireCommand(core);
      const decision={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,decision:'FIRE',reason:'galactic_explosion_open_ticker_card_join',decidedAtMs:now,boltId:replicaBoltId,ticker:q.ticker,selectedAttack:concept,selectedAttackDisplay:core.selectedAttackDisplay,fireCommand,ranking:core.ranking};
      const replicaBolt={...(bolt||{}),id:replicaBoltId,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,features:{...features,eligibleAttacks:[{concept,targetFeasible:true}]},greenTrigger:bolt?.greenTrigger||null};
      const granted=await this.executeAthenaFire(q,replicaBolt,decision,{...context,galacticGrant:true});
      if(granted){
        opened.push(granted);
        await this.audit('galactic_saint_granted',{ticker:q.ticker,sourceId:sourceEntry.id,sourceConcept,grantedId:granted.id,concept,door:'athena_join'});
      }else{
        await this.audit('galactic_saint_grant_blocked',{ticker:q.ticker,sourceId:sourceEntry.id,concept,reason:this.lastAthenaFireAbort||'execution_blocked'});
      }
    }
    return opened;
  }

  async materializePhoenixSignal(q, qualification, now=Date.now()) {
    const s=this.getSettings(),ticker=String(q?.ticker||qualification?.ticker||'');
    if(!ticker||!isModelEnabled(s,'Phoenix'))return null;
    const localKey=`Phoenix|${ticker}`;
    if(this.phoenixSignalLocks.has(localKey))return null;
    this.phoenixSignalLocks.add(localKey);
    let unlock=null;
    try{
      const current=this.market?.getQuote?.(ticker)||q;
      const at=Number.isFinite(Number(now))?Number(now):Date.now();
      const valid=revalidatePhoenixQualification(qualification,current,s,at);
      if(!valid.ok){await this.audit('phoenix_materialization_blocked',{ticker,reason:valid.reason,signalId:qualification?.signalId||null});return null;}
      if(typeof this.db?.acquireCosmoSignalLock==='function'){
        unlock=await this.db.acquireCosmoSignalLock(s.systemName,'Phoenix',ticker);
        if(!unlock){await this.audit('phoenix_materialization_lock_busy',{ticker,signalId:qualification?.signalId||null});return null;}
      }
      const open=typeof this.db?.openEntriesByTicker==='function'?await this.db.openEntriesByTicker(s.systemName,ticker):[];
      for(const e of open||[]){
        if(e.conceptName!=='Phoenix')continue;
        if(phoenixSignalActive(e,s,at))return null;
        await this.db.updateEntry?.(e.id,{status:'closed',closeReason:'phoenix_signal_expired',closedAtMs:at,updatedAtMs:at});
      }
      const source={...structuredClone(qualification),materializedAtMs:at,expiresAtMs:Number(qualification.expiresAtMs||at+PHOENIX_COSMO.signalTtlMs)};
      const entry=await this.createGhost('Phoenix',current,Number(source.signalAskCents),Number(current?.gameStartTimeMs)||null,{
        sourceTradeId:String(source.signalId),currentPriceCents:Number(current?.yesBid||source.signalBidCents),peakPriceCents:Number(current?.yesBid||source.signalBidCents),entryConfigExtra:{phoenixSource:source},feederState:{phase:'PHOENIX',expiresAtMs:source.expiresAtMs},
      });
      if(entry)await this.audit('phoenix_cosmo_qualified',{id:entry.id,ticker,eventTicker:entry.eventTicker,signalId:source.signalId,originBidCents:source.originBidCents,originAskCents:source.originAskCents,signalBidCents:source.signalBidCents,signalAskCents:source.signalAskCents,riseBidCents:source.riseBidCents,upTicks:source.upTicks,confirmationCount:source.confirmationCount,observationDurationMs:source.observationDurationMs,expiresAtMs:source.expiresAtMs});
      return entry;
    }finally{
      if(unlock)try{await unlock();}catch(error){await this.audit('phoenix_cosmo_unlock_failed',{ticker,message:String(error?.message||error)}).catch(()=>{});}
      this.phoenixSignalLocks.delete(localKey);
    }
  }

  async expirePhoenixSignals(now=Date.now()) {
    const s=this.getSettings();
    if(typeof this.db?.expirePhoenixSignals!=='function')return[];
    const forceAll=!isModelEnabled(s,'Phoenix');
    const task=()=>this.db.expirePhoenixSignals(s.systemName,Number(now),{forceAll});
    const expired=typeof this.db?.runLowPriorityPersistence==='function'?await this.db.runLowPriorityPersistence(task):await task();
    if(expired?.length)await this.audit('phoenix_cosmo_expired',{count:expired.length,tickers:expired.slice(0,32).map(x=>x.ticker),forceAll});
    return expired||[];
  }

  async evaluateFeeders(markets, trackerMap) {
    const s = this.getSettings();
    const cutoff = Date.now() - (s.eventCooldownMinutes ?? 5) * 60000;
    const all = typeof this.db?.feederEvaluationContext==='function'?await this.db.feederEvaluationContext(s.systemName,{sinceMs:cutoff}):await this.db.entries(s.systemName,{limit:5000});
    const open = all.filter((e) => openLike(e.status));
    // EMI1: active Cosmo feeders are reference-only observers. Hunter capacity
    // must never suppress feeder learning or signal materialization. Real
    // Hunters continue to enforce maxPositions independently through slotsLeft.
    const recentTickers = new Set(all.filter((e) => e.status !== 'rejected' && e.openedAtMs >= cutoff).map((e) => e.ticker));
    const openTickers = new Set(open.map((e) => e.ticker));
    const recentKeys = new Set(all
      .filter((e) => e.status !== 'rejected' && e.openedAtMs >= cutoff)
      .map((e) => `${e.conceptName}|${e.ticker}`));
    const openKeys = new Set(open.map((e) => `${e.conceptName}|${e.ticker}`));
    const lastByConceptEvent = new Map();
    for (const e of all) {
      const key = `${e.conceptName}|${e.eventTicker || e.ticker}`;
      if (!lastByConceptEvent.has(key) || e.openedAtMs > lastByConceptEvent.get(key)) lastByConceptEvent.set(key, e.openedAtMs);
    }
    const created = [];
    for (const q of markets) {
      const history = this.market.getHistory(q.ticker);
      for (const f of FEEDERS) {
        if (!isModelEnabled(s, f.name)) continue;
        if (q.recentTrades < (f.minTradesInPlay || 10)) continue;
        const key = `${f.name}|${q.ticker}`;
        // Galactic Explosion opens the exact market to independently qualified
        // Execution Attacks. Reference-only Cosmo signals must therefore remain
        // observable even when another Attack or the other feeder already owns
        // a row on the ticker. The same feeder still cannot duplicate itself.
        if (s.galacticExplosionEnabled === true) {
          if (openKeys.has(key) || recentKeys.has(key)) continue;
        } else if (openTickers.has(q.ticker) || recentTickers.has(q.ticker)) {
          break;
        }
        if (q.yesAsk - q.yesBid > (s.maxSpreadCents ?? 3)) break;
        if (openKeys.has(key)) continue;
        const last = lastByConceptEvent.get(`${f.name}|${q.eventTicker || q.ticker}`);
        if (last != null && last >= cutoff) continue;
        const fs = feederSettings(s, f.name);
        const price = stableDropEntry(history, fs.dropCents, fs.minPriceCents, fs.maxPriceCents);
        if (price == null) continue;
        const tr = trackerMap.get(q.ticker);
        const e = await this.createGhost(f.name, q, price, Number(tr?.game_start_time_ms) || null);
        if (!e) continue;
        created.push(e);
        openKeys.add(key);
        recentKeys.add(key);
        openTickers.add(q.ticker);
        recentTickers.add(q.ticker);
        lastByConceptEvent.set(`${f.name}|${q.eventTicker || q.ticker}`, Date.now());
        break;
      }
    }
    return created;
  }

  async evaluateDragon(marketMap, { onlyTicker = null } = {}) {
    const s = this.getSettings();
    if (!isModelEnabled(s, 'Dragon')) return [];
    const existingEpisodes = new Set(typeof this.db?.sourceTradeIdsByConcept==='function'
      ? await this.db.sourceTradeIdsByConcept(s.systemName,'Dragon')
      : (await this.db.entries(s.systemName,{limit:5000})).filter((e)=>e.conceptName==='Dragon'&&e.sourceTradeId).map((e)=>String(e.sourceTradeId)));
    const tickers = onlyTicker ? [onlyTicker] : [...marketMap.keys()];
    const created = [];
    for (const ticker of tickers) {
      const signal = typeof this.learning?.crashEntrySignal === 'function' ? this.learning.crashEntrySignal(ticker) : null;
      if (!signal?.episodeId || existingEpisodes.has(String(signal.episodeId))) continue;
      const q = marketMap.get(ticker);
      if (!q) continue;
      const validation = dragonSignalQualifiedAtQuote(signal, q, s);
      if (!validation.ok) continue;
      const dragonSource = {
        ...crashSourceSnapshotFromSignal(signal, validation),
        signalPriceCents:Number(validation.ask),
        signalAtMs:Date.now(),
        referenceOrigin:'crash_trough',
        maxEpisode:Number(s.dragonMaxEpisode ?? 2),
      };
      const e = await this.createGhost('Dragon', q, Number(validation.ask), Number(q.gameStartTimeMs) || null, {
        sourceTradeId:String(signal.episodeId),
        currentPriceCents:Number(validation.bid),
        peakPriceCents:Number(validation.bid),
        entryConfigExtra:{ dragonSource },
      });
      if (!e) continue;
      created.push(e);
      existingEpisodes.add(String(signal.episodeId));
      if (typeof this.learning?.markDragonSignal === 'function') {
        await this.learning.markDragonSignal(ticker, String(signal.episodeId), {
          signalAtMs:dragonSource.signalAtMs,
          signalBidCents:Number(validation.bid), signalAskCents:Number(validation.ask),
          gameMinutes:confirmedInGameElapsedMinutes(q),
          episodeIndex:Number(signal.episodeIndex || 0),
        }).catch(() => {});
      }
      await this.audit('dragon_signal_created', {
        id:e.id, ticker:e.ticker, eventTicker:e.eventTicker, episodeId:signal.episodeId,
        episodeIndex:Number(signal.episodeIndex || 0), referenceTroughCents:Number(validation.troughCents),
        signalBidCents:Number(validation.bid), signalAskCents:Number(validation.ask),
        crashDepthCents:Number(signal.crashDepthCents || 0), reboundCents:Number(validation.reboundCents), reclaimRate:Number(validation.reclaimRate),
      });
    }
    return created;
  }


  // R45 retired-model invariant: there are no StrategyEngine evaluation
  // methods for Golden Dragon, Golden Dragon Hunter, or Dragon Recovery Hunter.

  async evaluateMomentumAndWave(marketMap,{legacyCompatibility=false}={}) {
    if (legacyCompatibility !== true) return [];
    const s = this.getSettings();
    const entries = await this.db.entries(s.systemName, { limit: 5000 });
    const open = entries.filter((e) => openLike(e.status));
    let capacity = slotsLeft(open, s);
    // Turning a feeder OFF is immediate for new downstream entries: existing
    // ghost records remain visible/reference-only, but they cannot feed a new
    // Hunter until that feeder model is enabled again.
    const feeders = activeCosmoSources(open, s);
    // GCA1 may confirm the event after a reference-only feeder was created.
    // Hydrate the feeder clock only from a current confirmed authority state;
    // never from a timestamp-only tracker or broad market activity.
    for (const feeder of feeders) {
      const q = marketMap.get(feeder.ticker);
      const observedStart = Number(q?.gameStartTimeMs || 0);
      if (!feeder.gameStartTimeMs && observedStart > 0 && isConfirmedGameClockState(q?.gameClockState, q?.eventTicker || q?.ticker)) {
        feeder.gameStartTimeMs = observedStart;
        await this.db.updateEntry(feeder.id, { gameStartTimeMs: observedStart, updatedAtMs: Date.now() });
      }
    }
    const created = [];

    const momentum = entries.filter((e) => e.conceptName === 'Momentum Hunter');
    if (false /* GH1 retired Momentum Hunter; historical rows remain */) for (const feeder of feeders) {
      if ((feeder.peakPriceCents || feeder.entryPriceCents) - feeder.entryPriceCents < Number(s.momentumMinRiseCents ?? MOMENTUM.minRiseCents)) continue;
      if (momentum.some((e) => e.ticker === feeder.ticker && e.openedAtMs > feeder.openedAtMs)) continue;
      const q = marketMap.get(feeder.ticker);
      if (!q) continue;
      const pull = (feeder.peakPriceCents || feeder.entryPriceCents) - (feeder.currentPriceCents ?? feeder.entryPriceCents);
      if (pull < Number(s.momentumMinPullbackCents ?? MOMENTUM.minPullbackCents) || pull > Number(s.momentumMaxPullbackCents ?? MOMENTUM.maxPullbackCents)) continue;
      if (q.yesAsk < Number(s.momentumMinEntryCents ?? MOMENTUM.minEntryCents) || q.yesAsk > Number(s.momentumMaxEntryCents ?? MOMENTUM.maxEntryCents) || q.yesAsk - q.yesBid > Number(s.momentumMaxSpreadCents ?? MOMENTUM.maxSpreadCents)) continue;
      const timeLeft = estimateTimeLeftMs(q, Date.now());
      if (timeLeft < Number(s.momentumMinTimeLeftMinutes ?? (MOMENTUM.minTimeLeftMs / 60000)) * 60000) continue;
      const elapsed = confirmedInGameElapsedMinutes(q);
      // R28: an unknown scan-time clock is not a final rejection. createHunter()
      // performs the force-fresh GCA2 refresh and Momentum's executable-boundary
      // doctrine re-runs recovery learning with the authoritative elapsed time.
      // If we already have a confirmed clock, keep the cheap early filter.
      if (elapsed != null) {
        const rec = await this.learning.recoveryRate(feeder.ticker, feeder.marketTitle, q.yesAsk, pull, elapsed, s.recoveryMinObservations ?? 5);
        if (rec && rec.confidence !== 'low' && rec.recoveryRate < (s.recoveryMinRate ?? 0.7)) continue;
      }
      const stake = Number(s.momentumStakeCents ?? 20000);
      const momentumQualification={
        version:'MOMENTUM-Q1', feederId:feeder.id, feederConcept:feeder.conceptName,
        feederEntryPriceCents:Number(feeder.entryPriceCents), sourceOpenedAtMs:Number(feeder.openedAtMs||0),
        sourceSignalPriceCents:cosmoSourceSignalPriceCents(feeder),
        feederPeakPriceCents:Number(feeder.peakPriceCents || feeder.entryPriceCents),
        candidatePullbackCents:Number(pull), observedAtMs:Date.now(),
      };
      const ae=await this.observeGoldSaintQualification('Momentum Hunter',q,{sourceFeeder:feeder.conceptName,sourceTradeId:feeder.id,qualificationSnapshot:momentumQualification,legacyCompatibility:true});
      if(ae.entry){created.push(ae.entry);capacity=Math.max(0,capacity-1);continue;}
      if(capacity<=0)continue;
      const e = await this.createHunter('Momentum Hunter', q, stake, 0, {
        sourceFeeder: feeder.conceptName,
        sourceTradeId: feeder.id,
        sourceEntryConfig: feeder.entryConfig || null,
        entryQualificationSnapshot: momentumQualification,
        legacyCompatibility:true,
      });
      if (e) { created.push(e); capacity -= 1; }
    }

    if (!isModelEnabled(s, 'Wave Surfer')) return created;
    const after = [...entries, ...created];
    const waves = after.filter((e) => e.conceptName === 'Wave Surfer');
    for (const feeder of feeders) {
      if (waves.some((e) => e.ticker === feeder.ticker && e.openedAtMs > feeder.openedAtMs)) continue;
      const q = marketMap.get(feeder.ticker);
      if (!q || q.yesBid <= 0 || q.yesAsk <= 0) continue;
      // R8: feeders provide price context only. Wave qualification is based on
      // the market's favorable move from the feeder reference entry, never on
      // the feeder's hypothetical stake, contract count, fees, or dollar P/L.
      const favorableMoveCents = Number(q.yesBid) - Number(feeder.entryPriceCents);
      const minWave = Number(s.waveMinEntryCents);
      const maxWave = Number(s.waveMaxEntryCents);
      const minFeederMove = Number(s.waveMinFeederFavorableMoveCents);
      if (favorableMoveCents < minFeederMove || q.yesAsk < minWave || q.yesAsk > maxWave || q.yesAsk - q.yesBid > Number(s.waveMaxSpreadCents ?? WAVE.maxSpreadCents)) continue;
      const waveQualification={
        version:'WAVE-Q1', feederId:feeder.id, feederConcept:feeder.conceptName,
        feederEntryPriceCents:Number(feeder.entryPriceCents), sourceOpenedAtMs:Number(feeder.openedAtMs||0),
        sourceSignalPriceCents:cosmoSourceSignalPriceCents(feeder),
        candidateFavorableMoveCents:Number(favorableMoveCents), observedAtMs:Date.now(),
      };
      const ae=await this.observeGoldSaintQualification('Wave Surfer',q,{sourceFeeder:feeder.conceptName,sourceTradeId:feeder.id,qualificationSnapshot:waveQualification,legacyCompatibility:true});
      if(ae.entry){created.push(ae.entry);capacity=Math.max(0,capacity-1);continue;}
      if(capacity<=0)continue;
      const e = await this.createHunter('Wave Surfer', q, Number(s.waveStakeCents ?? 20000), 0, {
        sourceFeeder: feeder.conceptName,
        sourceTradeId: feeder.id,
        sourceEntryConfig: feeder.entryConfig || null,
        entryQualificationSnapshot: waveQualification,
        legacyCompatibility:true,
      });
      if (e) { created.push(e); capacity -= 1; }
    }
    return created;
  }

  async lightningPlasmaCandidateTickers(now = Date.now()) {
    const s=this.getSettings();
    if (!isModelEnabled(s,'Lightning Plasma')) return [];
    const entries=await this.db.entries(s.systemName,{limit:5000});
    const windowMs=Math.max(1000,Number(s.lightningPlasmaFieldWindowSeconds ?? LIGHTNING_PLASMA.fieldWindowMs/1000)*1000);
    const sources=activeCosmoSources(entries,s).filter((e)=>{
      const observed=lightningPlasmaSourceObservedAtMs(e);
      return observed>0&&Number(now)-observed<=windowMs;
    });
    const events=new Set(sources.map((e)=>String(e.eventTicker||e.ticker||'')).filter(Boolean));
    const minCosmos=Math.max(2,Math.floor(Number(s.lightningPlasmaMinCosmos ?? LIGHTNING_PLASMA.minCosmos)));
    if (sources.length < minCosmos || events.size < minCosmos) return [];
    return [...new Set(sources.map((e)=>e.ticker).filter(Boolean))];
  }

  async evaluateLightningPlasma(marketMap, { now = Date.now(), legacyCompatibility=false } = {}) {
    if (legacyCompatibility !== true) return [];
    const s=this.getSettings();
    if (!isModelEnabled(s,'Lightning Plasma')) return [];
    const entries=await this.db.entries(s.systemName,{limit:5000});
    const open=entries.filter((e)=>openLike(e.status));
    let capacity=slotsLeft(open,s);
    const minStrikes=Math.max(2,Math.floor(Number(s.lightningPlasmaMinStrikes ?? LIGHTNING_PLASMA.minStrikes)));
    this.lightningPlasmaTelemetry.fieldsObserved+=1;
    const field=lightningPlasmaFieldSelection(open,marketMap,s,now);
    if (!field.qualifies) return [];

    const cooldownMs=Math.max(0,Number(s.lightningPlasmaFieldCooldownSeconds ?? LIGHTNING_PLASMA.fieldCooldownMs/1000)*1000);
    const latestPlasma=entries.filter((e)=>e.conceptName==='Lightning Plasma'&&e.status!=='rejected')
      .reduce((m,e)=>Math.max(m,Number(e.openedAtMs||0)),0);
    if (cooldownMs>0&&latestPlasma>0&&Number(now)-latestPlasma<cooldownMs){
      this.lightningPlasmaTelemetry.fieldsCooldownBlocked+=1;
      await this.audit('lightning_plasma_field_cooldown',{fieldId:field.fieldId,latestPlasmaAtMs:latestPlasma,cooldownMs});
      return [];
    }

    const usedSourceIds=new Set(entries.filter((e)=>e.conceptName==='Lightning Plasma'&&e.sourceTradeId).map((e)=>String(e.sourceTradeId)));
    // Gold-Saint observation is independent of current portfolio capacity. A
    // fully qualified LP field can contribute a Saint vote even when ordinary
    // strike capacity is exhausted; Athena Exclamation itself still obeys the
    // shared max-position/capital gates before exposure.
    const selectedForVotes=field.candidates.filter((x)=>!usedSourceIds.has(String(x.source.id||''))).slice(0,field.maxStrikes);
    if (selectedForVotes.length<minStrikes) return [];
    const fieldStake=Math.max(1,Math.floor(Number(s.lightningPlasmaFieldStakeCents ?? LIGHTNING_PLASMA.fieldStakeCents)));
    const voteStrikeStake=Math.max(1,Math.floor(fieldStake/selectedForVotes.length));
    const ordinarySelected=capacity>=minStrikes?selectedForVotes.slice(0,Math.min(field.maxStrikes,capacity)):[];
    const strikeStake=ordinarySelected.length?Math.floor(fieldStake/ordinarySelected.length):0;
    const windowMs=Math.max(1000,Number(s.lightningPlasmaFieldWindowSeconds ?? LIGHTNING_PLASMA.fieldWindowMs/1000)*1000);
    const fieldExpiresAtMs=Math.min(...selectedForVotes.map((x)=>lightningPlasmaSourceObservedAtMs(x.source)+windowMs));
    if (!(fieldExpiresAtMs > Number(now))) return [];
    this.lightningPlasmaTelemetry.fieldsQualified+=1;
    this.lightningPlasmaTelemetry.lastFieldId=field.fieldId;
    this.lightningPlasmaTelemetry.lastFieldAtMs=Number(now);
    await this.audit('lightning_plasma_field_qualified',{
      fieldId:field.fieldId,sourceCount:field.sourceCount,independentEventCount:field.independentEventCount,
      selectedStrikes:selectedForVotes.length,ordinaryExecutableStrikes:ordinarySelected.length,fieldStakeCents:fieldStake,strikeStakeCents:strikeStake||null,
      sourceCosmos:selectedForVotes.map((x)=>({id:x.source.id,concept:x.source.conceptName,ticker:x.source.ticker,eventTicker:x.eventTicker,score:x.qualification.score})),
    });
    const created=[];
    for(let i=0;i<selectedForVotes.length;i+=1){
      const x=selectedForVotes[i];
      const observedAtMs=lightningPlasmaSourceObservedAtMs(x.source);
      const anchorCents=lightningPlasmaSourceAnchorCents(x.source);
      const qualification={
        version:'LP1-Q1',policyRevision:LIGHTNING_PLASMA.policyRevision,fieldId:field.fieldId,
        fieldObservedAtMs:Number(now),fieldExpiresAtMs,fieldSourceCount:field.sourceCount,
        fieldIndependentEventCount:field.independentEventCount,fieldStrikeCount:selectedForVotes.length,strikeIndex:i+1,
        fieldStakeCents:fieldStake,strikeStakeCents:ordinarySelected.includes(x)?strikeStake:voteStrikeStake,sourceId:x.source.id,sourceConcept:x.source.conceptName,
        sourceObservedAtMs:observedAtMs,sourceAnchorCents:anchorCents,sourceReferenceCents:Number(x.source.entryPriceCents||0),
        sourceSignalPriceCents:cosmoSourceSignalPriceCents(x.source)||anchorCents,sourceScore:Number(x.qualification.score),
        sourceBidCents:Number(x.quote.yesBid||0),sourceAskCents:Number(x.quote.yesAsk||0),
        sourceContinuationCents:Number(x.qualification.continuationCents||0),sourceFadeCents:Number(x.qualification.fadeCents||0),
        sourceChaseCents:Number(x.qualification.chaseCents||0),oneStrikePerEvent:true,
      };
      const ae=await this.observeGoldSaintQualification('Lightning Plasma',x.quote,{sourceFeeder:x.source.conceptName,sourceTradeId:x.source.id,qualificationSnapshot:qualification,legacyCompatibility:true});
      if(ae.entry){created.push(ae.entry);capacity=Math.max(0,capacity-1);continue;}
      if(!ordinarySelected.includes(x)||capacity<=0)continue;
      this.lightningPlasmaTelemetry.strikeAttempts+=1;
      const e=await this.createHunter('Lightning Plasma',x.quote,strikeStake,0,{
        sourceFeeder:x.source.conceptName,
        sourceTradeId:x.source.id,
        sourceEntryConfig:x.source.entryConfig||null,
        entryQualificationSnapshot:qualification,legacyCompatibility:true,
      });
      if(e){created.push(e);capacity=Math.max(0,capacity-1);this.lightningPlasmaTelemetry.strikesOpened+=1;}
    }
    await this.audit('lightning_plasma_field_execution',{
      fieldId:field.fieldId,attempted:ordinarySelected.length,opened:created.filter((e)=>e.conceptName==='Lightning Plasma').length,
      openedIds:created.map((e)=>e.id),openedTickers:created.map((e)=>e.ticker),
    });
    return created;
  }

  async evaluateRecovery(_marketMap, { onlyTicker = null, legacyCompatibility=false } = {}) {
    // Crystal Wall V3 has one and only one entry authority: the independent
    // CI1 crash/rebound path. The historical post-stop recovery evaluator is
    // deliberately inert so it cannot recreate 2x sizing, Athena votes, or a
    // second hidden route into the same Attack.
    void onlyTicker; void legacyCompatibility;
    return [];
  }

  async evaluateCrashRecovery(marketMap, { onlyTicker = null, legacyCompatibility=false } = {}) {
    if (legacyCompatibility !== true) return [];
    const s = this.getSettings();
    if (!isModelEnabled(s, 'Crash Recovery Hunter')) return [];
    const entries = await this.db.entries(s.systemName, { limit:5000 });
    const open = entries.filter((e) => openLike(e.status));
    let capacity = slotsLeft(open, s);

    const created = [];
    const tickers = onlyTicker ? [onlyTicker] : [...marketMap.keys()];
    const existingEpisodes = new Set(entries
      .filter((e) => e.conceptName === 'Crash Recovery Hunter')
      .map((e) => String(e.entryConfig?.crashRecoverySource?.episodeId || e.sourceTradeId || ''))
      .filter(Boolean));

    for (const ticker of tickers) {
      const q=marketMap.get(ticker);
      if(!q||typeof this.learning?.crashEntrySignal!=='function') continue;
      const signal=this.learning.crashEntrySignal(ticker);
      const episodeId=String(signal?.episodeId||'');
      if(!signal||!episodeId||existingEpisodes.has(episodeId))continue;

      // HF2: Starlight no longer requires a Dragon approval. Any currently
      // active Cosmo on the exact ticker may nominate the opportunity. The
      // crash episode itself is still independently proven by Starlight below
      // and again at the force-fresh execution boundary in createHunter().
      const cosmoSource=selectCrashRecoveryCosmoSource(open,s,ticker,episodeId);
      if(!cosmoSource)continue;
      const validation=crashSignalQualifiedAtQuote(signal,q,s);
      if(!validation.ok) continue;

      const dragonSource=cosmoSource.conceptName==='Dragon'?(cosmoSource.entryConfig?.dragonSource||{}):{};
      const exactDragonEpisode=cosmoSource.conceptName==='Dragon'&&String(cosmoSource.sourceTradeId||'')===episodeId;
      const crashSourceSnapshot={
        ...crashSourceSnapshotFromSignal(signal,validation),
        huntingGround:'active_cosmo_plus_independent_crash_episode',
        cosmoRouteVersion:COSMO_ROUTING.version,
        cosmoSourceId:cosmoSource.id||null,
        cosmoSourceConcept:cosmoSource.conceptName||null,
        cosmoSourceOpenedAtMs:Number(cosmoSource.openedAtMs||0)||null,
        cosmoSourceTradeId:cosmoSource.sourceTradeId||null,
        dragonSignalId:exactDragonEpisode?(cosmoSource.id||null):null,
        dragonEpisodeId:exactDragonEpisode?episodeId:null,
        dragonSignalAtMs:exactDragonEpisode?(Number(dragonSource.signalAtMs||cosmoSource.openedAtMs||0)||null):null,
        dragonSignalPriceCents:exactDragonEpisode?(Number(dragonSource.signalPriceCents||0)||null):null,
      };
      const crashQualification={version:'CRASH-RECOVERY-Q1',episodeId,cosmoSourceId:cosmoSource.id||null,sourceFeeder:cosmoSource.conceptName,crashDepthCents:Number(signal.crashDepthCents||0),reboundCents:Number(validation.reboundCents||0),reclaimRate:Number(validation.reclaimRate||0),observedAtMs:Date.now()};
      const ae=await this.observeGoldSaintQualification('Crash Recovery Hunter',q,{sourceFeeder:cosmoSource.conceptName,sourceTradeId:episodeId,qualificationSnapshot:crashQualification,legacyCompatibility:true});
      if(ae.entry){created.push(ae.entry);capacity=Math.max(0,capacity-1);existingEpisodes.add(episodeId);continue;}
      if(capacity<=0)continue;
      const e=await this.createHunter('Crash Recovery Hunter',q,Number(s.crashRecoveryStakeCents||20000),0,{
        sourceFeeder:cosmoSource.conceptName,sourceTradeId:episodeId,sourceEntryConfig:cosmoSource.entryConfig||null,crashSourceSnapshot,legacyCompatibility:true,
      });
      if(!e)continue;
      created.push(e);capacity-=1;existingEpisodes.add(episodeId);
      await this.audit('crash_recovery_hunter_created',{
        id:e.id,ticker:e.ticker,eventTicker:e.eventTicker,episodeId,sourceFeeder:cosmoSource.conceptName,
        cosmoRouteVersion:COSMO_ROUTING.version,cosmoSourceId:cosmoSource.id||null,
        dragonSignalId:exactDragonEpisode?(cosmoSource.id||null):null,entryPriceCents:e.entryPriceCents,count:e.count,
        crashDepthCents:signal.crashDepthCents,troughCents:signal.troughCents,reboundCents:validation.reboundCents,reclaimRate:validation.reclaimRate,
      });
    }
    return created;
  }
}
