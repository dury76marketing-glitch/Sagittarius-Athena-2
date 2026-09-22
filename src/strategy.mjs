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
  MARKET_FAMILY_EXECUTION_EXCLUSION,
  executionMarketFamilyExclusion,
  PORTFOLIO_CONCEPTS,
  ACTIVE_PORTFOLIO_CONCEPTS,
  FEEDER_CONCEPTS,
  ACTIVE_FEEDER_CONCEPTS,
  RETIRED_PORTFOLIO_CONCEPTS,
  RETIRED_FEEDER_CONCEPTS,
  GALACTIC_EXPLOSION,
  BOLT_DIRECT,
  MEGA_WAVE,
  STARLIGHT_EXTINCTION,
  isStarlightParentStopLoss,
  EXECUTABLE_HUNTER_CONCEPTS,
  COSMO_ROUTING,
  SCARLET_NEEDLE,
  CRYSTAL_WALL,
  GEMINI_UNIVERSE,
  ANOTHER_DIMENSION,
  SAGITTARIUS_JUSTICE_ARROW,
  EXECUTION_ATTACK_DISPLAY,
  AURORA_EXECUTION,
  calculateAuroraSnapshotFromFeeModel,
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
import { RELEASE, crystalWallProofSettingKeys } from './config.mjs';
import { authoritativeClockSnapshot, isConfirmedGameClockState, isEntryAuthorizedGameClockState } from './gameClock.mjs';
import { EVENT_CLOCK_ANCHOR, eventClockEpisodeId, isExecutableLeadingEventClock, projectEventClock, stampEventClockRecord } from './eventClockAnchor.mjs';
import { AthenaExclamationEngine, ATHENA_EXCLAMATION, athenaExclamationPrimeReview, isGoldSaintConcept } from './athenaExclamation.mjs';
import { authorityHash, sealAthenaFireCommand, verifyAthenaFireCommandHash } from './authority.mjs';
import { phoenixSignalActive, revalidatePhoenixQualification } from './phoenix.mjs';

const nowId = () => randomUUID();

export function fullConfiguredSizeClassification(concept, flags = {}) {
  const name = String(concept || '');
  if (flags.crystalWallIndependentEntry === true) {
    return { reason: 'crystal_wall_full_configured_size_unavailable', event: 'crystal_wall_v3_full_size_blocked' };
  }
  if (flags.justiceArrowIndependentEntry === true || name === 'Sagittarius Justice Arrow') {
    return { reason: 'justice_arrow_full_configured_size_unavailable', event: 'justice_arrow_v3_full_size_blocked' };
  }
  if (flags.starlightReentry === true || name === STARLIGHT_EXTINCTION.conceptName) {
    return { reason: 'starlight_full_configured_size_unavailable', event: 'starlight_full_size_blocked' };
  }
  if (flags.megaWaveAthenaEntry === true || name === 'Athena Exclamation') {
    return { reason: 'athena_full_configured_size_unavailable', event: 'mega_wave_athena_full_size_blocked' };
  }
  if (flags.scarletContinuationEntry === true || name === 'Scarlet Needle') {
    return { reason: 'scarlet_needle_full_configured_size_unavailable', event: 'scarlet_needle_v3_full_size_blocked' };
  }
  if (flags.megaWaveSaintEntry === true || MEGA_WAVE.downstreamSaints.includes(name)) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'saint';
    return { reason: `${slug}_full_configured_size_unavailable`, event: `mega_wave_${slug}_full_size_blocked` };
  }
  return { reason: 'configured_full_size_unavailable', event: 'configured_full_size_blocked' };
}

const openLike = (s) => ['open', 'entry_pending', 'exit_pending', 'pending_recovery'].includes(s);
const slotsLeft = (entries, settings) => Math.max(
  0,
  settings.maxPositions - entries.filter((e) => PORTFOLIO_CONCEPTS.has(e.conceptName) && openLike(e.status)).length,
);
const FINAL_MARKET_STATUSES = new Set(['determined', 'finalized', 'settled']);

export function attackInfinityNetTargetCents(settings={}, concept=''){
  if(concept===STARLIGHT_EXTINCTION.conceptName)return Number(settings?.crashRecoveryInfinityNetPerOriginalContractCents??STARLIGHT_EXTINCTION.defaultInfinityNetPerOriginalContractCents);
  return Number(settings?.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);
}

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
  if(conceptName==='Lightning Plasma')return{minEntryCents:Number(s.lightningPlasmaMinEntryCents),maxEntryCents:Number(s.lightningPlasmaMaxEntryCents),maxSpreadCents:sharedMaxSpreadCents};
  return null;
}

export function hunterEntryBoundaryQualifiedAtQuote(conceptName, q, settings, executionPlan = null) {
  const envelope = hunterEntryEnvelope(settings, conceptName);
  if (!envelope) return { ok:false, reason:'unknown_hunter_concept' };
  const bid = Number(q?.yesBid || 0);
  const ask = Number(q?.yesAsk || 0);
  if (!(bid > 0) || !(ask > 0) || bid > ask) return { ok:false, reason:'invalid_quote', bid, ask, ...envelope };
  if (ask < envelope.minEntryCents || ask > envelope.maxEntryCents) return { ok:false, reason:'entry_band', bid, ask, ...envelope };
  if (Number.isFinite(envelope.maxSpreadCents) && ask - bid > envelope.maxSpreadCents) return { ok:false, reason:'spread', bid, ask, ...envelope };
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
  if(String(concept||'')==='Sagittarius Justice Arrow')return{ok:false,reason:'justice_arrow_v3_authority_required'};
  if(!command||typeof command!=='object')return{ok:false,reason:'athena_fire_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'athena_fire_hash_invalid'};
  if(String(command.version)!==String(ATHENA_COMMANDER.version))return{ok:false,reason:'athena_fire_version_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'athena_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!==String(concept||''))return{ok:false,reason:'athena_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'athena_fire_ticker_mismatch'};
  const marketFamilyExclusion=executionMarketFamilyExclusion(q?.ticker,settings);
  if(marketFamilyExclusion.blocked)return{ok:false,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
  // R60: Athena's sealed FIRE is the sole strategic entry decision. Execution
  // validates command integrity plus hard market/operator constraints only; no
  // downstream predictive model is allowed to re-veto the trade.
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'athena_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'athena_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'athena_fire_expired'};
  const envelope=hunterEntryEnvelope(settings,concept);if(!envelope)return{ok:false,reason:'unknown_attack'};
  const configuredStake=attackConfiguredStakeCents(settings,concept);const commandedStake=Number(command.stakeCents||0);if(!(configuredStake>0)||!(commandedStake>0))return{ok:false,reason:'athena_fire_stake_invalid',expectedStakeCents:configuredStake};
  if(concept==='Lightning Plasma'&&String(command.authorityMode||'')!==LIGHTNING_PLASMA.strategicEntryAuthority){if(Math.abs(Number(command.fieldBudgetCents)-configuredStake)>1e-9||commandedStake-configuredStake>1e-9)return{ok:false,reason:'athena_fire_plasma_budget_mismatch',expectedFieldBudgetCents:configuredStake};const maxRays=Math.max(1,Math.floor(Number(settings?.lightningPlasmaMaxStrikes||1)));if(Number(command.maxRays)!==maxRays)return{ok:false,reason:'athena_fire_plasma_rays_changed',expectedMaxRays:maxRays};}
  else if(Math.abs(commandedStake-configuredStake)>1e-9)return{ok:false,reason:'athena_fire_stake_mismatch',expectedStakeCents:configuredStake};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'athena_fire_operator_band_changed'};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0),maxAuthorized=Number(command.authorizedMaxEntryCents||0);
  if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  if(ask<envelope.minEntryCents||ask>envelope.maxEntryCents)return{ok:false,reason:'entry_band'};
  if(!(maxAuthorized>=envelope.minEntryCents)||ask>maxAuthorized)return{ok:false,reason:'athena_strike_price_exceeded',authorizedMaxEntryCents:maxAuthorized};
  const sharedSpread=Number(settings?.maxSpreadCents??3);if(ask-bid>sharedSpread)return{ok:false,reason:'shared_spread_safety'};
  if(Number(command.maxSpreadCents)>sharedSpread+1e-9)return{ok:false,reason:'athena_fire_spread_authority_invalid'};
  const commandedTarget=Number(command?.economicTarget?.netPerOriginalContractCents);
  const configuredPolicy=attackProfitAuthoritySnapshot(settings||{},concept);
  const configuredTarget=Number(configuredPolicy.pri1Enabled
    ? configuredPolicy.triggerNetPerOriginalContractCents
    : attackInfinityNetTargetCents(settings,concept));
  if(!(commandedTarget>0)||!Number.isFinite(commandedTarget))return{ok:false,reason:'athena_economic_target_missing'};
  if(Math.abs(commandedTarget-configuredTarget)>1e-9)return{ok:false,reason:'athena_economic_target_changed',commandedTargetNetPerOriginalContractCents:commandedTarget,configuredTargetNetPerOriginalContractCents:configuredTarget};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'athena_economic_target_unreachable'};
  if(concept==='Scarlet Needle'&&String(command.authorityMode||'')===SCARLET_NEEDLE.strategicEntryAuthority){
    const freshScarletTarget=scarletContinuationEconomicTarget({askCents:ask,stakeCents:commandedStake,settings});
    if(!freshScarletTarget.targetFeasible)return{ok:false,reason:'scarlet_economic_target_unreachable_at_fresh_price',requiredTargetBidCents:freshScarletTarget.requiredTargetBidCents,askCents:ask};
  }
  if(concept==='Lightning Plasma'&&String(command.authorityMode||'')===LIGHTNING_PLASMA.strategicEntryAuthority&&!command?.decisionEvidence?.lightningPlasmaContinuation)return{ok:false,reason:'lightning_plasma_continuation_missing'};
  return{ok:true,reason:'athena_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,authorizedMaxEntryCents:maxAuthorized,economicTargetNetPerOriginalContractCents:commandedTarget};
}


export function validateMegaWaveSaintFireCommand(command,{concept,q,settings,authorization}={}){
  if(!command||!authorization||typeof command!=='object'||typeof authorization!=='object')return{ok:false,reason:'mega_wave_authority_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'mega_wave_fire_hash_invalid'};
  if(String(command.version)!==String(ATHENA_COMMANDER.version)||String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'mega_wave_fire_identity_invalid'};
  if(String(command.selectedAttack||'')!==String(concept||'')||String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'mega_wave_fire_attack_or_ticker_mismatch'};
  const marketFamilyExclusion=executionMarketFamilyExclusion(q?.ticker,settings);
  if(marketFamilyExclusion.blocked)return{ok:false,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
  if(String(authorization.version||'')!==String(MEGA_WAVE.version)||String(authorization.policyRevision||'')!==String(MEGA_WAVE.policyRevision)||String(authorization.parentConcept||'')!=='Athena Exclamation')return{ok:false,reason:'mega_wave_lineage_invalid'};
  if(String(authorization.ticker||'')!==String(q?.ticker||'')||String(authorization.saintConcept||'')!==String(concept||'')||!authorization.grantId||!authorization.reservationId||!authorization.parentEntryId)return{ok:false,reason:'mega_wave_reservation_invalid'};
  if(String(command?.decisionEvidence?.megaWaveAuthorization?.reservationId||'')!==String(authorization.reservationId))return{ok:false,reason:'mega_wave_command_lineage_mismatch'};
  const envelope=hunterEntryEnvelope(settings,concept);if(!envelope)return{ok:false,reason:'unknown_attack'};
  const stake=attackConfiguredStakeCents(settings,concept);if(!(stake>0)||Math.abs(Number(command.stakeCents||0)-stake)>1e-9)return{ok:false,reason:'mega_wave_stake_changed'};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  if(ask<Number(envelope.minEntryCents)||ask>Number(envelope.maxEntryCents))return{ok:false,reason:'entry_band'};
  if(ask-bid>Number(settings?.maxSpreadCents??3))return{ok:false,reason:'shared_spread_safety'};
  const policy=attackProfitAuthoritySnapshot(settings,concept);const expectedTarget=Number(policy.pri1Enabled?policy.triggerNetPerOriginalContractCents:attackInfinityNetTargetCents(settings,concept));
  if(!(Number(command?.economicTarget?.netPerOriginalContractCents)>0)||Math.abs(Number(command.economicTarget.netPerOriginalContractCents)-expectedTarget)>1e-9)return{ok:false,reason:'mega_wave_economic_target_changed'};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'mega_wave_economic_target_unreachable'};
  return{ok:true,reason:'mega_wave_fire_valid',envelope,stakeCents:stake};
}

export function validateStarlightFireCommand(command,{concept,q,settings,authorization}={}){
  if(!command||!authorization||typeof command!=='object'||typeof authorization!=='object')return{ok:false,reason:'starlight_authority_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'starlight_fire_hash_invalid'};
  if(String(command.version)!==String(ATHENA_COMMANDER.version)||String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'starlight_fire_identity_invalid'};
  if(String(concept||'')!==STARLIGHT_EXTINCTION.conceptName)return{ok:false,reason:'starlight_concept_mismatch'};
  if(String(command.selectedAttack||'')!==STARLIGHT_EXTINCTION.conceptName||String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'starlight_fire_attack_or_ticker_mismatch'};
  if(String(authorization.version||'')!==STARLIGHT_EXTINCTION.version||String(authorization.policyRevision||'')!==STARLIGHT_EXTINCTION.policyRevision)return{ok:false,reason:'starlight_lineage_invalid'};
  if(String(authorization.ticker||'')!==String(q?.ticker||'')||String(authorization.saintConcept||'')!==STARLIGHT_EXTINCTION.conceptName||!authorization.parentEntryId)return{ok:false,reason:'starlight_reservation_invalid'};
  if(String(authorization.parentConcept||'')===STARLIGHT_EXTINCTION.conceptName)return{ok:false,reason:'starlight_self_chain_forbidden'};
  if(!EXECUTABLE_HUNTER_CONCEPTS.has(String(authorization.parentConcept||'')))return{ok:false,reason:'starlight_parent_not_executable'};
  if(!isStarlightParentStopLoss(authorization.parentCloseReason))return{ok:false,reason:'starlight_parent_not_stop_loss'};
  const marketFamilyExclusion=executionMarketFamilyExclusion(q?.ticker,settings);
  if(marketFamilyExclusion.blocked)return{ok:false,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
  const envelope=hunterEntryEnvelope(settings,concept);if(!envelope)return{ok:false,reason:'unknown_attack'};
  const stake=attackConfiguredStakeCents(settings,concept);if(!(stake>0)||Math.abs(Number(command.stakeCents||0)-stake)>1e-9)return{ok:false,reason:'starlight_stake_changed'};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  if(ask<Number(envelope.minEntryCents)||ask>Number(envelope.maxEntryCents))return{ok:false,reason:'entry_band'};
  if(ask-bid>Number(settings?.maxSpreadCents??3))return{ok:false,reason:'shared_spread_safety'};
  const policy=attackProfitAuthoritySnapshot(settings,concept);const expectedTarget=Number(policy.pri1Enabled?policy.triggerNetPerOriginalContractCents:attackInfinityNetTargetCents(settings,concept));
  if(!(Number(command?.economicTarget?.netPerOriginalContractCents)>0)||Math.abs(Number(command.economicTarget.netPerOriginalContractCents)-expectedTarget)>1e-9)return{ok:false,reason:'starlight_economic_target_changed'};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'starlight_economic_target_unreachable'};
  return{ok:true,reason:'starlight_fire_valid',envelope,stakeCents:stake};
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

export function boltDirectEnabledAttacks(settings){
  return BOLT_DIRECT.attacks.filter((name)=>isModelEnabled(settings,name));
}

export function boltDirectAttackGeometry(settings,concept){
  const s=settings||{};
  if(concept==='Scarlet Needle')return{minCrashCents:Number(s.scarletNeedleMinCrashCents??15),minReboundCents:Number(s.scarletNeedleMinReboundCents??5),minUpwardTicks:Number(s.scarletNeedleMinUpwardTicks??2)};
  if(concept==='Sagittarius Justice Arrow')return{minCrashCents:Number(s.justiceArrowMinCrashCents??15),minReboundCents:Number(s.justiceArrowMinReboundCents??5),minUpwardTicks:Number(s.justiceArrowMinUpwardTicks??2)};
  if(concept==='Wave Surfer')return{minCrashCents:Number(s.waveMinCrashCents??15),minReboundCents:Number(s.waveMinReboundCents??5),minUpwardTicks:Number(s.waveMinUpwardTicks??2)};
  if(concept==='Momentum Hunter')return{minCrashCents:Number(s.momentumMinCrashCents??15),minReboundCents:Number(s.momentumMinReboundCents??5),minUpwardTicks:Number(s.momentumMinUpwardTicks??2)};
  if(concept==='Lightning Plasma')return{minCrashCents:Number(s.lightningPlasmaMinCrashCents??15),minReboundCents:Number(s.lightningPlasmaMinReboundCents??5),minUpwardTicks:Number(s.lightningPlasmaMinUpwardTicks??2)};
  if(concept==='Athena Exclamation')return{minCrashCents:Number(s.athenaExclamationMinCrashCents??15),minReboundCents:Number(s.athenaExclamationMinReboundCents??5),minUpwardTicks:Number(s.athenaExclamationMinUpwardTicks??2)};
  if(concept==='Recovery Hunter')return{minCrashCents:Number(s.crystalWallMinCrashCents??15),minReboundCents:Number(s.crystalWallMinReboundCents??5),minUpwardTicks:Number(s.crystalWallMinUpwardTicks??2)};
  return{minCrashCents:15,minReboundCents:5,minUpwardTicks:2};
}

export function boltDirectAttackCard(concept,q,settings,crashState=null){
  if(!BOLT_DIRECT.attacks.includes(String(concept||'')))return{ok:false,reason:'bolt_direct_attack_not_allowed'};
  if(!isModelEnabled(settings,concept))return{ok:false,reason:'model_disabled'};
  const band=hunterEntryBoundaryQualifiedAtQuote(concept,q,settings);
  if(!band.ok)return{ok:false,reason:band.reason||'entry_band'};
  const geo=boltDirectAttackGeometry(settings,concept);
  const state=(crashState&&typeof crashState==='object')?crashState:{};
  const crash=Number.isFinite(Number(state.crashDepthCents))?Number(state.crashDepthCents):(Number.isFinite(Number(state.depthCents))?Number(state.depthCents):0);
  const rebound=Number.isFinite(Number(state.reboundCents))?Number(state.reboundCents):0;
  const ticks=Number.isFinite(Number(state.upwardTicks))?Number(state.upwardTicks):0;
  const needCrash=Number(geo.minCrashCents||0),needRebound=Number(geo.minReboundCents||0),needTicks=Number(geo.minUpwardTicks||0);
  if(!(crash>=needCrash))return{ok:false,reason:'crash_not_confirmed',crashCents:crash,minCrashCents:needCrash};
  if(!(rebound>=needRebound))return{ok:false,reason:'rebound_not_confirmed',reboundCents:rebound,minReboundCents:needRebound};
  if(!(ticks>=needTicks))return{ok:false,reason:'upward_ticks_not_confirmed',upwardTicks:ticks,minUpwardTicks:needTicks};
  return{ok:true,reason:'bolt_direct_card_qualified',crashCents:crash,reboundCents:rebound,upwardTicks:ticks,minCrashCents:needCrash,minReboundCents:needRebound,minUpwardTicks:needTicks,bid:band.bid,ask:band.ask};
}


export function crystalWallFollowUpCard(q,settings,crashState=null){
  if(!isModelEnabled(settings,'Recovery Hunter'))return{ok:false,reason:'model_disabled'};
  const band=hunterEntryBoundaryQualifiedAtQuote('Recovery Hunter',q,settings);
  if(!band.ok)return{ok:false,reason:band.reason||'entry_band'};
  const geo=boltDirectAttackGeometry(settings,'Recovery Hunter');
  const state=(crashState&&typeof crashState==='object')?crashState:{};
  const crash=Number.isFinite(Number(state.crashDepthCents))?Number(state.crashDepthCents):(Number.isFinite(Number(state.depthCents))?Number(state.depthCents):0);
  const rebound=Number.isFinite(Number(state.reboundCents))?Number(state.reboundCents):0;
  const ticks=Number.isFinite(Number(state.upwardTicks))?Number(state.upwardTicks):0;
  const needCrash=Number(geo.minCrashCents||0),needRebound=Number(geo.minReboundCents||0),needTicks=Number(geo.minUpwardTicks||0);
  if(!(crash>=needCrash))return{ok:false,reason:'crash_not_confirmed',crashCents:crash,minCrashCents:needCrash};
  if(!(rebound>=needRebound))return{ok:false,reason:'rebound_not_confirmed',reboundCents:rebound,minReboundCents:needRebound};
  if(!(ticks>=needTicks))return{ok:false,reason:'upward_ticks_not_confirmed',upwardTicks:ticks,minUpwardTicks:needTicks};
  return{ok:true,reason:'crystal_wall_follow_qualified',crashCents:crash,reboundCents:rebound,upwardTicks:ticks,minCrashCents:needCrash,minReboundCents:needRebound,minUpwardTicks:needTicks,bid:band.bid,ask:band.ask};
}

export function validateCrystalWallFollowFireCommand(command,{concept,q,settings,now=Date.now()}={}){
  if(String(concept||'')!=='Recovery Hunter')return{ok:false,reason:'crystal_wall_follow_attack_mismatch'};
  if(!command||typeof command!=='object')return{ok:false,reason:'crystal_wall_follow_fire_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'crystal_wall_follow_hash_invalid'};
  if(String(command.authorityMode||'')!==String(CRYSTAL_WALL.followAuthority))return{ok:false,reason:'crystal_wall_follow_authority_invalid'};
  if(String(command.version||'')!==String(CRYSTAL_WALL.followVersion))return{ok:false,reason:'crystal_wall_follow_version_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'crystal_wall_follow_system_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'crystal_wall_follow_ticker_mismatch'};
  const replica=isExcaliburReplicaCommand(command);
  const envelope=hunterEntryEnvelope(settings,'Recovery Hunter');if(!envelope)return{ok:false,reason:'unknown_attack'};
  const configuredStake=attackConfiguredStakeCents(settings,'Recovery Hunter');const commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(commandedStake-configuredStake)>1e-9)return{ok:false,reason:'crystal_wall_follow_stake_mismatch',expectedStakeCents:configuredStake};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);
  if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  if(!replica && (ask<envelope.minEntryCents||ask>envelope.maxEntryCents))return{ok:false,reason:'entry_band'};
  return{ok:true,reason:'crystal_wall_follow_valid',envelope,stakeCents:commandedStake,authorizedMaxEntryCents:Number(command.authorizedMaxEntryCents||envelope.maxEntryCents)};
}

export function isExcaliburReplicaCommand(command){
  if(!command||typeof command!=='object')return false;
  if(command.excaliburReplica===true)return true;
  if(String(command.authorizationId||'').startsWith('EXCALIBUR:'))return true;
  const evidence=command.decisionEvidence;
  return Boolean(evidence&&typeof evidence==='object'&&evidence.excalibur&&typeof evidence.excalibur==='object');
}

export function validateBoltDirectFireCommand(command,{concept,q,settings,now=Date.now()}={}){
  if(!command||typeof command!=='object')return{ok:false,reason:'bolt_direct_fire_required'};
  if(!verifyAthenaFireCommandHash(command))return{ok:false,reason:'bolt_direct_fire_hash_invalid'};
  if(String(command.authorityMode||'')!==BOLT_DIRECT.strategicEntryAuthority)return{ok:false,reason:'bolt_direct_authority_invalid'};
  if(String(command.version||'')!==BOLT_DIRECT.version)return{ok:false,reason:'bolt_direct_version_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'bolt_direct_system_mismatch'};
  if(String(command.selectedAttack||'')!==String(concept||''))return{ok:false,reason:'bolt_direct_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'bolt_direct_ticker_mismatch'};
  if(!BOLT_DIRECT.attacks.includes(String(concept||'')))return{ok:false,reason:'bolt_direct_attack_not_allowed'};
  const marketFamilyExclusion=executionMarketFamilyExclusion(q?.ticker,settings);
  if(marketFamilyExclusion.blocked)return{ok:false,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'bolt_direct_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'bolt_direct_expired'};
  const envelope=hunterEntryEnvelope(settings,concept);if(!envelope)return{ok:false,reason:'unknown_attack'};
  const configuredStake=attackConfiguredStakeCents(settings,concept);const commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(commandedStake-configuredStake)>1e-9)return{ok:false,reason:'bolt_direct_stake_mismatch',expectedStakeCents:configuredStake};
  const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);
  if(!(ask>0)||!(bid>0)||bid>ask)return{ok:false,reason:'invalid_quote'};
  const replica=isExcaliburReplicaCommand(command);
  if(!replica && (ask<envelope.minEntryCents||ask>envelope.maxEntryCents))return{ok:false,reason:'entry_band'};
  const sharedSpread=Number(settings?.maxSpreadCents??3);if(ask-bid>sharedSpread)return{ok:false,reason:'shared_spread_safety'};
  const authorizedMax=replica?100:Number(envelope.maxEntryCents);
  return{ok:true,reason:replica?'bolt_direct_excalibur_replica_valid':'bolt_direct_fire_valid',envelope,stakeCents:commandedStake,authorizedMaxEntryCents:authorizedMax,excaliburReplica:replica===true};
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


export function attackProfitAuthoritySnapshot(settings={}, conceptName='') {
  const map={
    'Athena Exclamation':['athenaExclamationPri1R2Enabled','athenaExclamationPri1R2TriggerCents'],
    'Scarlet Needle':['scarletNeedlePri1R2Enabled','scarletNeedlePri1R2TriggerCents'],
    'Sagittarius Justice Arrow':['justiceArrowPri1R2Enabled','justiceArrowPri1R2TriggerCents'],
    'Momentum Hunter':['momentumPri1R2Enabled','momentumPri1R2TriggerCents'],
    'Wave Surfer':['wavePri1R2Enabled','wavePri1R2TriggerCents'],
    'Crash Recovery Hunter':['crashRecoveryPri1R2Enabled','crashRecoveryPri1R2TriggerCents'],
    'Lightning Plasma':['lightningPlasmaPri1R2Enabled','lightningPlasmaPri1R2TriggerCents'],
    'Recovery Hunter':['recoveryPri1R2Enabled','recoveryPri1R2TriggerCents'],
  };
  const keys=map[conceptName];
  if(!keys)return {authority:PORTFOLIO_CONCEPTS.has(conceptName)?INFINITY_BREAK.version:null,revision:PORTFOLIO_CONCEPTS.has(conceptName)?INFINITY_BREAK.policyRevision:null,pri1Enabled:false,triggerNetPerOriginalContractCents:null};
  const enabled=settings[keys[0]]===true;
  const trigger=Math.max(0.01,Number(settings[keys[1]]||0.01));
  const trail=conceptName==='Recovery Hunter'?Math.max(1,Math.min(4,Number(settings.recoveryPri1R2TrailCents||CRYSTAL_WALL.defaultPriTrailCents||1))):null;
  return enabled
    ? {authority:PROTECTED_RUNNER_INTELLIGENCE.version,revision:PROTECTED_RUNNER_INTELLIGENCE.policyRevision,pri1Enabled:true,triggerNetPerOriginalContractCents:trigger,...(trail?{trailNetPerOriginalContractCents:trail}:{})}
    : {authority:INFINITY_BREAK.version,revision:INFINITY_BREAK.policyRevision,pri1Enabled:false,triggerNetPerOriginalContractCents:trigger,...(trail?{trailNetPerOriginalContractCents:trail}:{})};
}

export function entryConfigSnapshot(settings, conceptName, sourceFeeder = null, actualStakeCents = null, sourceEntryConfig = null, gameClockState = null, eventTicker = '') {
  const sourceFeederConfig=sourceEntryConfig?.feeder&&typeof sourceEntryConfig.feeder==='object'?sourceEntryConfig.feeder:null;
  const feeder=sourceFeederConfig||(sourceFeeder?feederSettings(settings,sourceFeeder):null);
  const attackMap={
    'Momentum Hunter':{stake:Number(settings.momentumStakeCents),min:Number(settings.momentumMinEntryCents),max:Number(settings.momentumMaxEntryCents),minCrashCents:Number(settings.momentumMinCrashCents??15),minReboundCents:Number(settings.momentumMinReboundCents??5),minUpwardTicks:Number(settings.momentumMinUpwardTicks??2)},
    'Wave Surfer':{stake:Number(settings.waveStakeCents),min:Number(settings.waveMinEntryCents),max:Number(settings.waveMaxEntryCents),minCrashCents:Number(settings.waveMinCrashCents??15),minReboundCents:Number(settings.waveMinReboundCents??5),minUpwardTicks:Number(settings.waveMinUpwardTicks??2)},
    'Recovery Hunter':{stake:Number(settings.recoveryStakeCents),min:Number(settings.recoveryMinEntryCents),max:Number(settings.recoveryMaxEntryCents),structuralRole:'INDEPENDENT_CRASH_REBOUND_ONLY',minCrashCents:Number(settings.crystalWallMinCrashCents??CRYSTAL_WALL.defaultMinCrashCents),minReboundCents:Number(settings.crystalWallMinReboundCents??CRYSTAL_WALL.defaultMinReboundCents),minUpwardTicks:Number(settings.crystalWallMinUpwardTicks??CRYSTAL_WALL.defaultMinUpwardTicks),fixedStakeOnly:true,stakeMultiplier:1,oneEntryPerCrashEpisode:true},
    'Crash Recovery Hunter':{stake:Number(settings.crashRecoveryStakeCents),min:Number(settings.crashRecoveryMinEntryCents),max:Number(settings.crashRecoveryMaxEntryCents),structuralRole:'STARLIGHT_STOP_LOSS_SAME_COSMOS_REENTRY',minCrashCents:Number(settings.crashRecoveryMinCrashCents??15),minReboundCents:Number(settings.crashRecoveryMinReboundCents??5),minUpwardTicks:Number(settings.crashRecoveryMinUpwardTicks??settings.crashRecoveryUpwardTicks??2),profitTargetNetPerOriginalContractCents:Number(settings.crashRecoveryInfinityNetPerOriginalContractCents??STARLIGHT_EXTINCTION.defaultInfinityNetPerOriginalContractCents)},
    'Scarlet Needle':{stake:Number(settings.scarletNeedleStakeCents),min:Number(settings.scarletNeedleMinEntryCents),max:Number(settings.scarletNeedleMaxEntryCents),structuralRole:'MEGA_WAVE_POST_PROFITABLE_ATHENA_DIRECT_CONTINUATION',minCrashCents:Number(settings.scarletNeedleMinCrashCents??15),minReboundCents:Number(settings.scarletNeedleMinReboundCents??5),minUpwardTicks:Number(settings.scarletNeedleMinUpwardTicks??2),profitTargetNetPerOriginalContractCents:Number(settings.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents),maxRepeats:Math.max(0,Math.min(SCARLET_NEEDLE.maximumConfigurableRepeats,Math.floor(Number(settings.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats))))},
    'Sagittarius Justice Arrow':{stake:Number(settings.justiceArrowStakeCents),min:Number(settings.justiceArrowMinEntryCents),max:Number(settings.justiceArrowMaxEntryCents),structuralRole:'MEGA_WAVE_POST_PROFITABLE_ATHENA_OWN_CONFIRMATION',minCrashCents:Number(settings.justiceArrowMinCrashCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents),minReboundCents:Number(settings.justiceArrowMinReboundCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents),minUpwardTicks:Number(settings.justiceArrowMinUpwardTicks??SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks),fixedStakeOnly:true,stakeMultiplier:1,oneEntryPerCrashEpisode:false},
    'Athena Exclamation':{stake:Number(settings.athenaExclamationStakeCents),min:Number(settings.athenaExclamationMinEntryCents),max:Number(settings.athenaExclamationMaxEntryCents),structuralRole:'MEGA_WAVE_SUPREME_FIRST_REAL_ATTACK_AFTER_TRIPLE_CRYSTAL',minCrashCents:Number(settings.athenaExclamationMinCrashCents??15),minReboundCents:Number(settings.athenaExclamationMinReboundCents??5),minUpwardTicks:Number(settings.athenaExclamationMinUpwardTicks??2)},
    'Lightning Plasma':{stake:Number(settings.lightningPlasmaFieldStakeCents),min:Number(settings.lightningPlasmaMinEntryCents),max:Number(settings.lightningPlasmaMaxEntryCents),structuralRole:'MEGA_WAVE_POST_PROFITABLE_ATHENA_REBOUND_CONFIRMATION',minCrashCents:Number(settings.lightningPlasmaMinCrashCents??15),minReboundCents:Number(settings.lightningPlasmaMinReboundCents??5),minUpwardTicks:Number(settings.lightningPlasmaMinUpwardTicks??2)},
  };
  const attack=attackMap[conceptName]||null;
  const scarletContinuation=conceptName==='Scarlet Needle';
  const justiceContinuation=conceptName==='Sagittarius Justice Arrow';
  const crystalWallContinuation=conceptName==='Recovery Hunter';
  const lightningPlasmaContinuation=conceptName==='Lightning Plasma';
  const profitPolicy=attackProfitAuthoritySnapshot(settings,conceptName);
  return {
    release:RELEASE,
    authorityChain:conceptName==='Athena Exclamation'?'CONFIGURED_1_5_CRYSTAL_WALL_PROOFS->ATHENA_EXCLAMATION->ENTRY_FROZEN_INFINITY_OR_PRI1_R2/AURORA':conceptName===STARLIGHT_EXTINCTION.conceptName?'SAME_COSMOS_STOP_LOSS->STARLIGHT_OWN_CRASH_REBOUND_TICKS->OWN_INFINITY_OR_PRI1_R2/AURORA':MEGA_WAVE.downstreamSaints.includes(conceptName)?'ATHENA_EXCLAMATION_PROFIT->SAINT_OWN_DOCTRINE->ENTRY_FROZEN_INFINITY_OR_PRI1_R2/AURORA':crystalWallContinuation?'CI1_CRASH->CRYSTAL_WALL->TROUGH->REBOUND->HARD_EXECUTION_SAFETY->INFINITY_BREAK/AURORA':'LEGACY_OR_REFERENCE_ONLY',
    strategicEntryAuthority:conceptName==='Athena Exclamation'?ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority:conceptName===STARLIGHT_EXTINCTION.conceptName?STARLIGHT_EXTINCTION.strategicEntryAuthority:MEGA_WAVE.downstreamSaints.includes(conceptName)?MEGA_WAVE.downstreamAuthority:crystalWallContinuation?CRYSTAL_WALL.strategicEntryAuthority:ATHENA_COMMANDER.version,
    profitAuthority:profitPolicy.authority,
    profitAuthorityRevision:profitPolicy.revision,
    pri1R2:profitPolicy.authority===PROTECTED_RUNNER_INTELLIGENCE.version?{version:PROTECTED_RUNNER_INTELLIGENCE.version,policyRevision:PROTECTED_RUNNER_INTELLIGENCE.policyRevision,enabledAtEntry:true,triggerNetPerOriginalContractCents:profitPolicy.triggerNetPerOriginalContractCents,fullPositionOnly:true,lossAuthority:'U-SG1'}:null,
    lossAuthority:PORTFOLIO_CONCEPTS.has(conceptName)?AURORA_EXECUTION.lossAuthority:null,
    conceptName,sourceFeeder:sourceFeeder||null,modelEnabled:isModelEnabled(settings,conceptName),sourceFeederEnabled:sourceFeeder?isModelEnabled(settings,sourceFeeder):null,
    feeder:feeder?{minPriceCents:Number(feeder.minPriceCents),maxPriceCents:Number(feeder.maxPriceCents),dropCents:Number(feeder.dropCents),referenceStakeCents:Number(sourceEntryConfig?.referenceStakeCents??feederReferenceStake(settings,sourceFeeder)),maxSpreadCents:Number(sourceEntryConfig?.maxSpreadCents??settings.maxSpreadCents),...(feeder.maxEpisode==null?{}:{maxEpisode:Number(feeder.maxEpisode)}),...(feeder.intelligence==null?{}:{intelligence:String(feeder.intelligence)})}:null,
    model:attack?{stakeCents:Number(actualStakeCents??attack.stake),configuredStakeCents:Number(attack.stake),minEntryCents:Number(attack.min),maxEntryCents:Number(attack.max),...(attack.structuralRole?{structuralRole:attack.structuralRole}:{}),...(attack.minCrashCents!=null?{minCrashCents:Number(attack.minCrashCents),minReboundCents:Number(attack.minReboundCents),minUpwardTicks:Number(attack.minUpwardTicks),fixedStakeOnly:attack.fixedStakeOnly===true,stakeMultiplier:Number(attack.stakeMultiplier??1),oneEntryPerCrashEpisode:attack.oneEntryPerCrashEpisode!==false}:{}),...(attack.maxRepeats!=null?{maxRepeats:Number(attack.maxRepeats)}:{}),...(attack.profitTargetNetPerOriginalContractCents!=null?{profitTargetNetPerOriginalContractCents:Number(attack.profitTargetNetPerOriginalContractCents)}:{}),...(attack.maxStrikes?{maxStrikes:attack.maxStrikes,fieldBudgetSharedAcrossStrikes:true,oneStrikePerEvent:true}:{}),stopProtection:'Aurora Execution',stopPolicy:AURORA_EXECUTION.version}:null,
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


function executionAttackEconomicTarget(concept,{askCents=0,stakeCents=0,settings={}}={}) {
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const policy=attackProfitAuthoritySnapshot(settings,concept);
  const target=Math.max(0.01,Number(policy.pri1Enabled?policy.triggerNetPerOriginalContractCents:attackInfinityNetTargetCents(settings,concept))||INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);
  const count=Math.max(1,Math.floor(stake/ask));
  let entryFeePerContract=0,exitFeePerContract=0,targetBid=ask+target;
  if(String(settings.mode||'SIMULATION').toUpperCase()==='LIVE'){
    entryFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:ask})/count;
    for(let i=0;i<3;i+=1){const px=Math.max(1,Math.min(99,Math.ceil(targetBid)));exitFeePerContract=kalshiGeneralTakerFeeEstimateCents({count,priceCents:px})/count;targetBid=ask+target+entryFeePerContract+exitFeePerContract;}
  }else{entryFeePerContract=Math.max(0,Number(settings.simFeeCents||0));exitFeePerContract=entryFeePerContract;targetBid=ask+target+entryFeePerContract+exitFeePerContract;}
  const requiredTargetBidCents=Math.ceil(targetBid-1e-9);
  return {version:'MEGA-WAVE-ENTRY-FROZEN-ECONOMIC-TARGET-V1',authorityMode:policy.authority,profitAuthority:policy.authority,netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-ask,estimatedEntryFeePerContractCents:Number(entryFeePerContract.toFixed(6)),estimatedExitFeePerContractCents:Number(exitFeePerContract.toFixed(6)),targetFeasibilityScore:requiredTargetBidCents<=99?100:0,targetFeasible:requiredTargetBidCents<=99};
}

function scarletContinuationEconomicTarget({askCents=0,stakeCents=0,settings={}}={}) {
  const ask=Math.max(1,Number(askCents)||0),stake=Math.max(1,Number(stakeCents)||0);
  const target=Math.max(0.01,Number(attackProfitAuthoritySnapshot(settings,'Scarlet Needle').pri1Enabled?attackProfitAuthoritySnapshot(settings,'Scarlet Needle').triggerNetPerOriginalContractCents:(settings.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents)));
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

function scarletContinuationAuthorizedMaxEntryCents({handoffAskCents=0,stakeCents=0,minEntryCents=1,maxEntryCents=99,settings={}}={}) {
  const min=Math.max(1,Math.ceil(Number(minEntryCents)||1));
  const max=Math.min(99,Math.floor(Number(maxEntryCents)||99));
  const handoff=Math.max(1,Number(handoffAskCents)||0);
  if(max<min||handoff<min||handoff>max)return 0;
  let cap=max;
  while(cap>=min&&!scarletContinuationEconomicTarget({askCents:cap,stakeCents,settings}).targetFeasible)cap-=1;
  if(cap<min||handoff>cap)return 0;
  return cap;
}


export function saintConfirmationParameters(concept, settings={}){
  const s=settings||{};
  const pack=(crashKey,reboundKey,tickKey)=>({
    minCrashCents:Math.max(1,Number(s[crashKey]??15)),
    minReboundCents:Math.max(1,Number(s[reboundKey]??5)),
    minUpwardTicks:Math.max(1,Number(s[tickKey]??2)),
  });
  if(concept==='Sagittarius Justice Arrow')return pack('justiceArrowMinCrashCents','justiceArrowMinReboundCents','justiceArrowMinUpwardTicks');
  if(concept==='Athena Exclamation')return pack('athenaExclamationMinCrashCents','athenaExclamationMinReboundCents','athenaExclamationMinUpwardTicks');
  if(concept==='Scarlet Needle')return pack('scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks');
  if(concept==='Wave Surfer')return pack('waveMinCrashCents','waveMinReboundCents','waveMinUpwardTicks');
  if(concept==='Lightning Plasma')return pack('lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks');
  if(concept==='Momentum Hunter')return pack('momentumMinCrashCents','momentumMinReboundCents','momentumMinUpwardTicks');
  if(concept==='Crash Recovery Hunter')return pack('crashRecoveryMinCrashCents','crashRecoveryMinReboundCents','crashRecoveryMinUpwardTicks');
  return null;
}

export function megaWaveSaintSignalState(concept, priorWatch={}, q={}, settings={}, now=Date.now()){
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0),status=String(q?.status||'active').toLowerCase();
  const observedAtMs=Number(now)||Date.now();
  const base={...structuredClone(priorWatch),concept,ticker:String(q?.ticker||priorWatch?.ticker||''),lastObservedAtMs:observedAtMs};
  if(!(bid>0)||!(ask>0)||bid>ask||status!=='active'||Boolean(q?.result))return{qualified:false,reason:'market_not_executable',watch:{...base,lastBidCents:bid}};

  // Entry band and spread are final execution/safety gates. They must not erase
  // the crash/rebound/rise observations that a Saint's own doctrine needs in
  // order to become qualified later when price returns to an executable band.
  const envelope=hunterEntryEnvelope(settings,concept);
  const minEntry=Number(envelope?.minEntryCents),maxEntry=Number(envelope?.maxEntryCents);
  const entryBandEligible=Boolean(envelope&&ask>=minEntry&&ask<=maxEntry);
  const spreadCents=ask-bid,maxSpreadCents=Number(settings?.maxSpreadCents??3);
  const spreadEligible=spreadCents<=maxSpreadCents+1e-9;
  const priorBid=Number(priorWatch?.lastBidCents||0),upTicks=bid>priorBid?Number(priorWatch?.upwardTicks||0)+1:bid<priorBid?0:Number(priorWatch?.upwardTicks||0);
  const parentEntry=Number(priorWatch?.parentEntryPriceCents||0),parentExit=Number(priorWatch?.parentExitPriceCents||0),seed=Math.max(1,parentExit||parentEntry||bid);
  const executionState={entryBandEligible,spreadEligible,spreadCents,maxSpreadCents,minEntryCents:Number.isFinite(minEntry)?minEntry:null,maxEntryCents:Number.isFinite(maxEntry)?maxEntry:null};
  const finalize=(doctrineQualified,doctrineReason,watch)=>{
    const nextWatch={...watch,...executionState,doctrineQualified:Boolean(doctrineQualified)};
    if(!doctrineQualified)return{qualified:false,reason:doctrineReason,watch:nextWatch,doctrineQualified:false};
    if(!entryBandEligible)return{qualified:false,reason:'entry_band',watch:nextWatch,doctrineQualified:true};
    if(!spreadEligible)return{qualified:false,reason:'spread',watch:nextWatch,doctrineQualified:true};
    return{qualified:true,reason:doctrineReason,watch:{...nextWatch,qualifiedAtMs:observedAtMs},doctrineQualified:true};
  };

  const confirmation=saintConfirmationParameters(concept,settings);
  if(confirmation){
    let peak=Math.max(seed,Number(priorWatch?.peakCents||0),bid),trough=Number(priorWatch?.troughCents||peak),armed=Boolean(priorWatch?.crashArmed),crashDepth=Math.max(0,peak-bid);
    const minCrash=Number(confirmation.minCrashCents),minRebound=Number(confirmation.minReboundCents),requiredTicks=Number(confirmation.minUpwardTicks);
    if(!armed&&crashDepth+1e-9>=minCrash){armed=true;trough=bid;}
    if(armed&&bid<trough){trough=bid;}
    if(!armed&&bid>peak)peak=bid;
    const rebound=Math.max(0,bid-trough);
    const doctrineQualified=armed&&rebound+1e-9>=minRebound&&upTicks>=requiredTicks;
    const doctrineReason=doctrineQualified?'rebound_confirmed':!armed?'waiting_crash':rebound<minRebound?'waiting_rebound':'waiting_upward_ticks';
    return finalize(doctrineQualified,doctrineReason,{...base,lastBidCents:bid,upwardTicks:upTicks,peakCents:peak,troughCents:trough,crashArmed:armed,crashDepthCents:Math.max(0,peak-trough),reboundCents:rebound,minCrashCents:minCrash,minReboundCents:minRebound,minUpwardTicks:requiredTicks});
  }
  return{qualified:false,reason:'unsupported_mega_wave_saint',watch:{...base,lastBidCents:bid,...executionState}};
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

function justiceArrowEconomicTarget(args={}){return executionAttackEconomicTarget('Sagittarius Justice Arrow',args);}

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

export function crystalWallRequiredProofCount(settings={}){
  return Math.max(1,Math.min(5,Math.floor(Number(settings?.crystalWallWinsToTriggerAthena??CRYSTAL_WALL.defaultWinsToTriggerAthena??3)||3)));
}

export function crystalWallStageGeometry(settings={}, stage=1){
  const n=Math.max(1,Math.min(5,Math.floor(Number(stage)||1)));
  const keys=crystalWallProofSettingKeys(n);
  const sharedCrash=Math.max(1,Math.min(99,Math.floor(Number(settings?.crystalWallMinCrashCents??CRYSTAL_WALL.defaultMinCrashCents)||CRYSTAL_WALL.defaultMinCrashCents)));
  const sharedRebound=Math.max(1,Math.min(99,Math.floor(Number(settings?.crystalWallMinReboundCents??CRYSTAL_WALL.defaultMinReboundCents)||CRYSTAL_WALL.defaultMinReboundCents)));
  const sharedTicks=Math.max(1,Math.min(20,Math.floor(Number(settings?.crystalWallMinUpwardTicks??CRYSTAL_WALL.defaultMinUpwardTicks)||CRYSTAL_WALL.defaultMinUpwardTicks)));
  const crash=Math.max(1,Math.min(99,Math.floor(Number(settings?.[keys.crash]??sharedCrash)||sharedCrash)));
  const rebound=Math.max(1,Math.min(99,Math.floor(Number(settings?.[keys.rebound]??sharedRebound)||sharedRebound)));
  const ticks=Math.max(1,Math.min(20,Math.floor(Number(settings?.[keys.ticks]??sharedTicks)||sharedTicks)));
  return {proofStage:n,minCrashCents:crash,minReboundCents:rebound,minUpwardTicks:ticks,sharedMinCrashCents:sharedCrash,sharedMinReboundCents:sharedRebound,sharedMinUpwardTicks:sharedTicks};
}

export function crystalWallProofIdentitiesValid(ids=[], crashes=[], required=1){
  const need=Math.max(1,Math.floor(Number(required)||0));
  const idList=(ids||[]).map((x)=>String(x||'')).filter(Boolean);
  const crashList=(crashes||[]).map((x)=>String(x||'')).filter(Boolean);
  if(idList.length!==need||new Set(idList).size!==need)return{ok:false,reason:'duplicate_crystal_wall_proof_identity'};
  if(crashList.length!==need||new Set(crashList).size!==need)return{ok:false,reason:'duplicate_crystal_wall_proof_identity'};
  return{ok:true,reason:'distinct_proofs'};
}

export function crystalWallProofsBelongToResetEpoch(rows=[], resetTimestampMs=0){
  const reset=Math.max(0,Number(resetTimestampMs)||0);
  if(!(reset>0))return{ok:true,reason:'no_reset_epoch'};
  for(const row of rows||[]){
    const closed=Math.max(0,Number(row?.closedAtMs||row?.finalProofClosedAtMs||0));
    const opened=Math.max(0,Number(row?.openedAtMs||0));
    if(closed>0&&closed<reset)return{ok:false,reason:'stale_pre_reset_authority'};
    if(opened>0&&opened<reset&&!(closed>=reset))return{ok:false,reason:'stale_pre_reset_authority'};
  }
  return{ok:true,reason:'current_reset_epoch'};
}

export function crystalWallNextProofStage({completedConsecutive=0,required=3}={}){
  const need=Math.max(1,Math.min(5,Math.floor(Number(required)||3)));
  const done=Math.max(0,Math.floor(Number(completedConsecutive)||0));
  if(done>=need)return need;
  return Math.min(need,done+1);
}

export function snapshotEventClockMinutes(record, now=Date.now(), q={}){
  const projected=projectEventClock(record, now);
  if(projected.ok&&Number.isFinite(Number(projected.elapsedMinutes))){
    return {
      ok:true,
      elapsedMinutes:Number(projected.elapsedMinutes),
      source:'inherited_event_clock',
      version:record?.version||null,
      policyRevision:record?.policyRevision||null,
      clockSource:record?.source||null,
      phase:record?.phase||null,
      anchoredElapsedMinutes:Number(record?.anchoredElapsedMinutes),
      anchoredAtMs:Number(record?.anchoredAtMs),
      gameStartTimeMs:Number(q?.gameStartTimeMs||0)||null,
      observedAtMs:Number(now),
    };
  }
  const live=Number.isFinite(Number(q?.gameMinutes))?Number(q.gameMinutes):null;
  const start=Number(q?.gameStartTimeMs||0);
  const fromStart=start>0&&start<=now?Math.max(0,(now-start)/60000):null;
  const elapsed=live??fromStart;
  if(!(Number.isFinite(elapsed)&&elapsed>=0))return {ok:false,elapsedMinutes:null,source:'clock_unavailable',observedAtMs:Number(now),gameStartTimeMs:start||null};
  return {ok:true,elapsedMinutes:elapsed,source:live!=null?'quote_game_minutes':'start_time_elapsed',version:record?.version||null,policyRevision:record?.policyRevision||null,clockSource:record?.source||null,phase:record?.phase||null,gameStartTimeMs:start||null,observedAtMs:Number(now)};
}

export function crystalWallSignalState(priorWatch={}, q={}, settings={}, now=Date.now()) {
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0);
  const status=String(q?.status||'active').toLowerCase();
  const final=Boolean(q?.result)||FINAL_MARKET_STATUSES.has(status);
  const stageGeom=crystalWallStageGeometry(settings, priorWatch?.proofStage||1);
  const minCrash=stageGeom.minCrashCents;
  const minRebound=stageGeom.minReboundCents;
  const minUpward=stageGeom.minUpwardTicks;
  const minEntry=Number(settings?.recoveryMinEntryCents??CRYSTAL_WALL.defaultMinEntryCents);
  const maxEntry=Number(settings?.recoveryMaxEntryCents??CRYSTAL_WALL.defaultMaxEntryCents);
  const maxSpread=Math.max(0,Number(settings?.maxSpreadCents??3));
  const peak=Math.max(0,Number(priorWatch?.preCrashPeakCents||0));
  const priorTrough=Math.max(0,Number(priorWatch?.troughCents||0));
  const priorLast=Math.max(0,Number(priorWatch?.lastBidCents||0));
  const base={...structuredClone(priorWatch),observedAtMs:Number(now),bidCents:bid,askCents:ask,proofStage:stageGeom.proofStage,minCrashCents:minCrash,minReboundCents:minRebound,minUpwardTicks:minUpward,minEntryCents:minEntry,maxEntryCents:maxEntry,maxSpreadCents:maxSpread};
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
  if(crashDepth+1e-9<minCrash)reason='crash_depth';
  else if(rebound+1e-9<minRebound)reason=newLow?'tracking_new_low':'rebound_not_confirmed';
  else if(upwardTicks<minUpward)reason='upward_ticks_not_confirmed';
  else if(ask<minEntry||ask>maxEntry)reason='outside_entry_band';
  else if(spread>maxSpread+1e-9)reason='spread';
  return{...base,qualified:reason==='qualified',terminal:false,reason,newLow,troughCents:trough,troughAtMs:newLow?Number(now):Number(priorWatch?.troughAtMs||now),crashDepthCents:crashDepth,reboundCents:rebound,upwardTicks,lastBidCents:bid,spreadCents:spread};
}

export function crystalWallGeometryReady(priorWatch={}, q={}, settings={}, now=Date.now()) {
  const state=crystalWallSignalState(priorWatch,q,settings,now);
  const wallReason=String(state.reason||'');
  const geometryReady=state.terminal!==true && ['qualified','outside_entry_band','spread'].includes(wallReason);
  return {...state, geometryReady};
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
  if(String(command.selectedAttack||'')!==String(CRYSTAL_WALL.shadowConceptName))return{ok:false,reason:'crystal_wall_fire_attack_mismatch'};
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
  // R69.6: Justice Arrow starts its own observation immediately after a durable
  // profitable Scarlet close. It does not wait for or consume a CI1 episode.
  // Before the configured pullback is seen, the post-Scarlet peak trails upward;
  // once the pullback threshold is crossed, that peak freezes and the existing
  // trough/rebound/up-tick confirmation semantics take over.
  const bid=Number(q?.yesBid||0),ask=Number(q?.yesAsk||0),status=String(q?.status||'active').toLowerCase();
  const final=Boolean(q?.result)||FINAL_MARKET_STATUSES.has(status);
  const minCrash=Math.max(1,Math.floor(Number(settings?.justiceArrowMinCrashCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents)||SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents));
  const minRebound=Math.max(1,Math.floor(Number(settings?.justiceArrowMinReboundCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents)||SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents));
  const minUpward=Math.max(1,Math.floor(Number(settings?.justiceArrowMinUpwardTicks??SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks)||SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks));
  const minEntry=Number(settings?.justiceArrowMinEntryCents??SAGITTARIUS_JUSTICE_ARROW.defaultMinEntryCents),maxEntry=Number(settings?.justiceArrowMaxEntryCents??SAGITTARIUS_JUSTICE_ARROW.defaultMaxEntryCents),maxSpread=Math.max(0,Number(settings?.maxSpreadCents??3));
  const direct=priorWatch?.directPostScarletObservation===true,observationId=String(priorWatch?.observationId||'');
  let peak=Math.max(0,Number(priorWatch?.preCrashPeakCents||priorWatch?.parentScarletExitPriceCents||0));
  let trough=Math.max(0,Number(priorWatch?.troughCents||0)),last=Math.max(0,Number(priorWatch?.lastBidCents||0));
  let upwardTicks=Math.max(0,Math.floor(Number(priorWatch?.upwardTicks||0))),ownCrashArmed=priorWatch?.ownCrashArmed===true;
  let crashStartedAtMs=Math.max(0,Number(priorWatch?.crashStartedAtMs||0)),troughAtMs=Math.max(0,Number(priorWatch?.troughAtMs||0));
  const base={...structuredClone(priorWatch),directPostScarletObservation:direct,observationId,observedAtMs:Number(now),bidCents:bid,askCents:ask,minCrashCents:minCrash,minReboundCents:minRebound,minUpwardTicks:minUpward,minEntryCents:minEntry,maxEntryCents:maxEntry,maxSpreadCents:maxSpread};
  if(!direct||!observationId)return{...base,qualified:false,terminal:false,reason:'direct_post_scarlet_observation_missing'};
  if(final)return{...base,qualified:false,terminal:true,reason:'market_final'};
  if(!(bid>0)||!(ask>0)||bid>ask)return{...base,qualified:false,terminal:false,reason:'quote_unavailable'};
  if(!ownCrashArmed){
    peak=Math.max(peak,bid);
    const depth=Math.max(0,peak-bid);
    if(depth+1e-9<minCrash){
      return{...base,qualified:false,terminal:false,reason:'crash_depth',preCrashPeakCents:peak,troughCents:bid,troughAtMs:Number(now),crashDepthCents:depth,reboundCents:0,upwardTicks:0,lastBidCents:bid,ownCrashArmed:false,crashStartedAtMs:0,spreadCents:ask-bid};
    }
    ownCrashArmed=true;crashStartedAtMs=Number(now);trough=bid;troughAtMs=Number(now);upwardTicks=0;last=bid;
  }
  const priorTrough=trough>0?trough:bid,newLow=bid<priorTrough-1e-9;
  if(newLow){trough=bid;troughAtMs=Number(now);upwardTicks=0;}
  else if(last>0&&bid>last+1e-9)upwardTicks+=1;
  else if(last>0&&bid<last-1e-9)upwardTicks=0;
  const crashDepth=Math.max(Number(priorWatch?.crashDepthCents||0),Math.max(0,peak-trough)),rebound=Math.max(0,bid-trough),spread=ask-bid;
  let reason='qualified';
  if(crashDepth+1e-9<minCrash)reason='crash_depth';
  else if(rebound+1e-9<minRebound)reason=newLow?'tracking_new_low':'rebound_not_confirmed';
  else if(upwardTicks<minUpward)reason='upward_ticks_not_confirmed';
  else if(ask<minEntry||ask>maxEntry)reason='outside_entry_band';
  else if(spread>maxSpread+1e-9)reason='spread';
  return{...base,qualified:reason==='qualified',terminal:false,reason,newLow,preCrashPeakCents:peak,troughCents:trough,troughAtMs,crashDepthCents:crashDepth,reboundCents:rebound,upwardTicks,lastBidCents:bid,ownCrashArmed,crashStartedAtMs,spreadCents:spread};
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
  if(!command||typeof command!=='object')return{ok:false,reason:'justice_arrow_v3_fire_required'};
  if(!verifyJusticeArrowFireCommandHash(command))return{ok:false,reason:'justice_arrow_v3_fire_hash_invalid'};
  if(String(command.version)!==String(SAGITTARIUS_JUSTICE_ARROW.version)||String(command.policyRevision)!==String(SAGITTARIUS_JUSTICE_ARROW.policyRevision))return{ok:false,reason:'justice_arrow_v3_fire_version_invalid'};
  if(String(command.authorityMode||'')!==String(SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority))return{ok:false,reason:'justice_arrow_v3_fire_authority_invalid'};
  if(String(command.authoritySource||'')!=='POST_PROFITABLE_SCARLET_NEEDLE_CLOSE_DIRECT_OWN_CONFIRMATION')return{ok:false,reason:'justice_arrow_v3_fire_source_invalid'};
  if(String(command.systemName||'')!==String(settings?.systemName||''))return{ok:false,reason:'justice_arrow_v3_fire_system_mismatch'};
  if(String(command.selectedAttack||'')!=='Sagittarius Justice Arrow')return{ok:false,reason:'justice_arrow_v3_fire_attack_mismatch'};
  if(String(command.ticker||'')!==String(q?.ticker||''))return{ok:false,reason:'justice_arrow_v3_fire_ticker_mismatch'};
  const marketFamilyExclusion=executionMarketFamilyExclusion(q?.ticker,settings);
  if(marketFamilyExclusion.blocked)return{ok:false,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
  const expectedEvent=String(q?.eventTicker||q?.ticker||'');
  if(String(command.eventTicker||command.ticker||'')!==expectedEvent)return{ok:false,reason:'justice_arrow_v3_fire_event_mismatch'};
  const decided=Number(command.decidedAtMs||0),expires=Number(command.expiresAtMs||0);
  if(!(decided>0)||decided>Number(now)+2_000)return{ok:false,reason:'justice_arrow_v3_fire_time_invalid'};
  if(!(expires>=decided)||Number(now)>expires)return{ok:false,reason:'justice_arrow_v3_fire_expired'};
  const configuredStake=Number(settings?.justiceArrowStakeCents||0),commandedStake=Number(command.stakeCents||0);
  if(!(configuredStake>0)||Math.abs(configuredStake-commandedStake)>1e-9)return{ok:false,reason:'justice_arrow_v3_fire_stake_mismatch',expectedStakeCents:configuredStake};
  const envelope=hunterEntryEnvelope(settings,'Sagittarius Justice Arrow');
  if(!envelope)return{ok:false,reason:'unknown_attack'};
  if(Number(command.operatorMinEntryCents)!==Number(envelope.minEntryCents)||Number(command.operatorMaxEntryCents)!==Number(envelope.maxEntryCents))return{ok:false,reason:'justice_arrow_v3_fire_operator_band_changed'};
  const lineage=command?.decisionEvidence?.justiceArrow;
  if(!lineage?.authorizationId||!lineage?.observationId||!lineage?.parentScarletEntryId)return{ok:false,reason:'justice_arrow_v3_lineage_missing'};
  if(lineage?.postScarletContinuation!==true||lineage?.directPostScarletObservation!==true)return{ok:false,reason:'justice_arrow_v3_parent_authority_missing'};
  if(String(lineage?.parentScarletConcept||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept))return{ok:false,reason:'justice_arrow_v3_parent_concept_invalid'};
  if(String(lineage?.parentScarletVersion||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentVersion)||String(lineage?.parentScarletPolicyRevision||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentPolicyRevision))return{ok:false,reason:'justice_arrow_v3_parent_version_invalid'};
  if(!(Number(lineage?.parentScarletClosedAtMs||0)>0)||Number(lineage?.observationStartedAtMs||0)+1e-9<Number(lineage?.parentScarletClosedAtMs||0)||lineage?.ownCrashArmed!==true||Number(lineage?.crashStartedAtMs||0)+1e-9<Number(lineage?.observationStartedAtMs||0))return{ok:false,reason:'justice_arrow_v3_direct_observation_invalid'};
  const state=justiceArrowSignalState(lineage,q,settings,now);
  if(!state.qualified)return{ok:false,reason:`justice_arrow_v3_${state.reason}`,signal:state};
  if(String(command?.profitAuthority||'')!==String(ATHENA_EXIT_INTELLIGENCE.version)||command?.infinityBreakPolicyVersion!=null)return{ok:false,reason:'justice_arrow_v3_profit_authority_invalid'};
  const target=Number(command?.economicTarget?.netPerOriginalContractCents),configuredTarget=Number(ATHENA_EXIT_INTELLIGENCE.minimumPeakNetPerOriginalContractCents);
  if(!(target>0)||!Number.isFinite(target))return{ok:false,reason:'justice_arrow_v3_economic_target_missing'};
  if(Math.abs(target-configuredTarget)>1e-9)return{ok:false,reason:'justice_arrow_v3_economic_target_changed',commandedTargetNetPerOriginalContractCents:target,configuredTargetNetPerOriginalContractCents:configuredTarget};
  if(Number(command?.economicTarget?.requiredTargetBidCents)>99)return{ok:false,reason:'justice_arrow_v3_economic_target_unreachable'};
  return{ok:true,reason:'justice_arrow_v3_fire_valid',envelope,stakeCents:commandedStake,configuredStakeCents:configuredStake,economicTargetNetPerOriginalContractCents:target,signal:state};
}


export class StrategyEngine {
  constructor({ db, kalshi, market, learning, athena = null, getSettings, getLiveReady, refreshGameClock = null, onHunterOpened = null, onFeederOpened = null, onShadowAttackOpened = null, onShadowAttackClosed = null, onEntryPipeline = null, captureSimulationMutationToken = null, enterSimulationMutation = null, random = Math.random }) {
    this.db = db;
    this.kalshi = kalshi;
    this.market = market;
    this.learning = learning;
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
    this.eventClockByEvent = new Map();
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
    const result=await this.athenaExclamation.recordQualification({
      conceptName:concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,qualifiedAtMs:Date.now(),
      priceCents:ask,bidCents:bid,sourceFeeder,sourceTradeId,gameMinutes:null,qualificationSnapshot,
    });
    if (!result?.candidate || s.athenaExclamationEnabled!==true) return { ...result, entry:null };
    const entry=await this.executeAthenaExclamationCandidate(result.candidate,q);
    return { ...result, entry };
  }

  async executeAthenaExclamationCandidate(candidate,q) {
    const s=this.getSettings();
    if (s.athenaExclamationEnabled!==true || !candidate?.id || !q?.ticker) return null;
    await this.audit('athena_exclamation_legacy_convergence_blocked',{candidateId:candidate.id,ticker:q.ticker,reason:'mega_wave_triple_crystal_is_sole_athena_entry_authority'});
    return null;
    // The Exclamation has its own stake but never bypasses the shared portfolio
    // cap. This check is repeated by the ordinary event/capital path later.
    const entries=typeof this.db?.openEntries==='function'?await this.db.openEntries(s.systemName):await this.db.entries(s.systemName,{limit:5000});
    if (slotsLeft(entries.filter((e)=>openLike(e.status)),s)<=0) {
      await this.athenaExclamation.markDecision(candidate.id,{status:'EXECUTION_BLOCKED',review:{reason:'max_positions'}});
      await this.audit('athena_exclamation_execution_blocked',{id:candidate.id,ticker:candidate.ticker,reason:'max_positions'});
      return null;
    }
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

  async simulationAvailableCashCents(entriesOverride = null) {
    const s = this.getSettings();
    // HF5: callers that already loaded the ledger (dashboard/state collection)
    // may reuse it. Entry authorization still calls this without an override and
    // therefore performs its own fresh durable read before spending capital.
    if(!Array.isArray(entriesOverride)&&typeof this.db?.simulationCashAggregate==='function'){const a=await this.db.simulationCashAggregate(s.systemName,{simFeeCents:Number(s.simFeeCents||0)});return Number(s.startingCapitalCents||0)+Number(a.realizedCents||0)-Number(a.reservedCents||0);}
    const entries = Array.isArray(entriesOverride) ? entriesOverride : await this.db.entries(s.systemName, { limit: 5000 });
    const hunters = entries.filter((e) => e.mode === 'SIMULATION' && PORTFOLIO_CONCEPTS.has(e.conceptName));
    const fee = Number(s.simFeeCents || 0);
    let realized = 0;
    let reserved = 0;
    for (const e of hunters) {
      realized += Number(e.pnlCents || 0);
      if (!openLike(e.status)) continue;
      const originalCount = Math.max(0, Number(e.count || 0));
      const remaining = Math.max(0, Number(e.remainingCount || originalCount));
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

  async prepareEntryExecution(q, requested, {limitCents=q?.yesAsk,stakeCents=null,recomputeRequestedFromFreshAsk=false}={}) {
    // MHF5 execution confirmation is deliberately separate from signal doctrine
    // AND from the canonical websocket cache. Fresh REST proof is consumed
    // directly so revalidation cannot overwrite a sequence-aligned WS book and
    // trigger a REST<->WS recovery loop. Sealed authorities may explicitly
    // authorize movement above the evidence ask; the book walk must consume the
    // sealed limit rather than silently reverting to the stale evidence price.
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
    const authorityLimit=Number.isFinite(Number(limitCents))?Number(limitCents):Number(q?.yesAsk||0);
    const freshAsk=Number(freshMarket?.yesAsk||q?.yesAsk||0);
    // R69.4: a sealed third-proof authority may permit the market to move above the old
    // evidence ask, but that permission is NOT authority to sweep higher ask
    // levels for depth. Rebase the executable limit to the fresh best ask after
    // proving that best ask remains inside the sealed authority. This preserves
    // the historical full-depth-at-entry-price quality rule, exact stake sizing
    // and single-price entry economics while removing the stale handoff choke.
    const executionLimit=recomputeRequestedFromFreshAsk===true&&freshAsk>0
      ? Math.min(authorityLimit,freshAsk)
      : authorityLimit;
    let effectiveRequested=Math.max(1,Math.floor(Number(requested)||1));
    if(recomputeRequestedFromFreshAsk===true&&Number(stakeCents)>0&&freshAsk>0){
      effectiveRequested=Math.max(1,Math.floor(Number(stakeCents)/freshAsk));
    }
    const executeAsk=(count)=>refreshed?.book&&typeof this.market.executableAskFromBook==='function'
      ? this.market.executableAskFromBook(refreshed.book,count,executionLimit)
      : this.market.executableAsk(q.ticker,count,executionLimit);
    const exec=executeAsk(effectiveRequested);
    if(!exec||exec.filled<=0)return null;
    const count=Math.floor(Math.min(effectiveRequested,exec.filled)+1e-9);
    if(count<=0)return null;
    const exact=executeAsk(count);
    if(!exact||exact.filled+1e-9<count)return null;
    return{count,requestedCount:effectiveRequested,authorityLimitCents:authorityLimit,executionLimitCents:executionLimit,freshAskCents:freshAsk,averagePriceCents:Number(exact.avgCents??freshAsk??q.yesAsk),bestAskCents:Number(exact.bestCents??freshAsk??q.yesAsk),freshMarket,verifiedBookAtMs:Number(refreshed?.bookObservedAtMs||0)||null};
  }


  hunterConcurrencyLockKey(concept,ticker,settings=this.getSettings()) {
    const exact=String(ticker||'');
    if(!exact)return '';
    const attack=String(concept||'');
    const room=String(settings?.systemName||'');
    const unison=settings?.excaliburEnabled===true||settings?.rozanHyakuRyuHaEnabled===true;
    const galactic=settings?.galacticExplosionEnabled===true;
    if(galactic===true||unison===true){
      const scoped=`${exact}|attack:${attack}`;
      return room?`${scoped}|cosmos:${room}`:scoped;
    }
    return exact;
  }

  async activeHunterTickerExposure(ticker) {
    const s = this.getSettings();
    const rows = typeof this.db.openFleetHunterEntriesByTicker === 'function'
      ? await this.db.openFleetHunterEntriesByTicker(ticker)
      : typeof this.db.openHunterEntriesByTicker === 'function'
      ? await this.db.openHunterEntriesByTicker(s.systemName, ticker)
      : typeof this.db.openEntriesByTicker === 'function'
        ? await this.db.openEntriesByTicker(s.systemName, ticker)
        : (await this.db.entries(s.systemName, { limit: 5000 }))
          .filter((e) => e.ticker === ticker && openLike(e.status));
    return rows.filter((e) => PORTFOLIO_CONCEPTS.has(e.conceptName) && openLike(e.status));
  }

  async portfolioCapacityState() {
    const s=this.getSettings();
    const rows=typeof this.db?.openEntries==='function'
      ? await this.db.openEntries(s.systemName)
      : (await this.db.entries(s.systemName,{limit:5000})).filter((e)=>openLike(e.status));
    const active=rows.filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&openLike(e.status));
    const maximum=Math.max(1,Math.floor(Number(s.maxPositions)||1));
    return {active:active.length,maximum,blocked:active.length>=maximum};
  }

  async exactTickerExposureClear(concept, q, stage = 'policy', { crystalWallOverlay = false } = {}) {
    const s=this.getSettings();
    const active = await this.activeHunterTickerExposure(q.ticker);
    const room=String(s.systemName||'');
    const fleet=(s.rozanHyakuRyuHaEnabled===true||s.excaliburEnabled===true)
      ? active.filter((e)=>String(e.systemName||'')===room)
      : active;
    const conflicts=crystalWallOverlay===true
      ? fleet.filter((e)=>e.conceptName===concept)
      : s.galacticExplosionEnabled===true
        ? fleet.filter((e)=>e.conceptName===concept)
        : fleet;
    if (!conflicts.length) return true;
    const existing = conflicts
      .slice()
      .sort((a, b) => Number(a.openedAtMs || 0) - Number(b.openedAtMs || 0))[0];
    await this.audit('hunter_exact_ticker_exposure_blocked', {
      concept, ticker:q.ticker, eventTicker:q.eventTicker || q.ticker, stage,
      galacticExplosionEnabled:s.galacticExplosionEnabled===true, crystalWallOverlay:crystalWallOverlay===true,
      lockScope:s.galacticExplosionEnabled===true?GALACTIC_EXPLOSION.enabledLockScope:GALACTIC_EXPLOSION.disabledLockScope,
      activeHuntersOnTicker:active.length, conflictingHunters:conflicts.length,
      existingHunterId: existing?.id || null, existingConcept: existing?.conceptName || null,
      existingStatus: existing?.status || null, existingSourceFeeder: existing?.sourceFeeder || null,
      existingSourceTradeId: existing?.sourceTradeId || null, existingOpenedAtMs: Number(existing?.openedAtMs || 0) || null,
    });
    return false;
  }

  async hunterEventAdmissionState(q,{concept=null}={}){
    const s=this.getSettings(),event=q?.eventTicker||q?.ticker;
    let activeEntries=0,latestHunterEntryMs=0,latestByConcept={},executableRepeatEntries=0,latestExecutableCloseMs=0,repeatByConcept={},closeByConcept={};
    if(typeof this.db?.hunterEventPolicySnapshot==='function'){
      const snap=await this.db.hunterEventPolicySnapshot(s.systemName,event);
      activeEntries=Number(snap?.activeEntries||0);latestHunterEntryMs=Number(snap?.latestHunterEntryMs||0);latestByConcept={...(snap?.latestByConcept||{})};
      executableRepeatEntries=Number(snap?.executableRepeatEntries||0);latestExecutableCloseMs=Number(snap?.latestExecutableCloseMs||0);
      repeatByConcept={...(snap?.repeatByConcept||{})};closeByConcept={...(snap?.closeByConcept||{})};
    }else{
      const entries=await this.db.entries(s.systemName,{limit:5000});const hunters=entries.filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName));
      const eventHunters=hunters.filter((e)=>(e.eventTicker||e.ticker)===event);
      activeEntries=eventHunters.filter((e)=>openLike(e.status)).length;
      for(const e of eventHunters){if(e.status==='rejected')continue;const name=String(e.conceptName||'');if(!name)continue;latestByConcept[name]=Math.max(Number(latestByConcept[name]||0),Number(e.openedAtMs||0));}
      latestHunterEntryMs=eventHunters.filter((e)=>e.status!=='rejected').reduce((m,e)=>Math.max(m,Number(e.openedAtMs||0)),0);
      const repeatRows=eventHunters.filter((e)=>EXECUTABLE_HUNTER_CONCEPTS.has(e.conceptName)&&e.conceptName!==STARLIGHT_EXTINCTION.conceptName&&['open','entry_pending','exit_pending','pending_recovery','closed'].includes(String(e.status||'')));
      executableRepeatEntries=repeatRows.length;
      latestExecutableCloseMs=repeatRows.filter((e)=>e.status==='closed').reduce((m,e)=>Math.max(m,Number(e.closedAtMs||0)),0);
      for(const e of repeatRows){
        const name=String(e.conceptName||'');
        if(!name)continue;
        repeatByConcept[name]=Number(repeatByConcept[name]||0)+1;
        if(e.status==='closed')closeByConcept[name]=Math.max(Number(closeByConcept[name]||0),Number(e.closedAtMs||0));
      }
    }
    const maxEntriesPerTrade=Math.max(1,Math.floor(Number(s.maxEntriesPerTrade??s.maxPositions??1)));
    const hunterCooldownMinutes=Math.max(0,Number(s.hunterCooldownMinutes??0));
    const maxRepeatsPerMarket=Math.max(0,Math.floor(Number(s.maxRepeatsPerMarket||0)));
    const repeatCooldownMinutes=Math.max(0,Number(s.repeatCooldownMinutes||0));
    const cooldownCutoffMs=Date.now()-hunterCooldownMinutes*60_000;
    const sharedCooldownBlocked=hunterCooldownMinutes>0&&latestHunterEntryMs>=cooldownCutoffMs;
    const cooldownBlockedConcepts=Object.entries(latestByConcept).filter(([,at])=>hunterCooldownMinutes>0&&Number(at||0)>=cooldownCutoffMs).map(([name])=>String(name));
    const attackLatestEntryMs=concept?Number(latestByConcept[String(concept)]||0):0;
    const attackCooldownBlocked=Boolean(concept)&&hunterCooldownMinutes>0&&attackLatestEntryMs>=cooldownCutoffMs;
    const cooldownScope=s.galacticExplosionEnabled===true?'attack':'event';
    const cooldownBlocked=cooldownScope==='attack'?(concept?attackCooldownBlocked:sharedCooldownBlocked):sharedCooldownBlocked;
    const attackRepeatEntries=concept?Number(repeatByConcept[String(concept)]||0):executableRepeatEntries;
    const attackLatestCloseMs=concept?Number(closeByConcept[String(concept)]||0):latestExecutableCloseMs;
    const repeatUnitArmed=maxRepeatsPerMarket>0||repeatCooldownMinutes>0;
    const repeatCapBlocked=concept
      ? maxRepeatsPerMarket>0&&attackRepeatEntries>=maxRepeatsPerMarket
      : maxRepeatsPerMarket>0&&executableRepeatEntries>=maxRepeatsPerMarket;
    const repeatCooldownCutoffMs=Date.now()-repeatCooldownMinutes*60_000;
    const repeatCooldownBlocked=concept
      ? repeatCooldownMinutes>0&&attackLatestCloseMs>0&&attackLatestCloseMs>=repeatCooldownCutoffMs
      : repeatCooldownMinutes>0&&latestExecutableCloseMs>0&&latestExecutableCloseMs>=repeatCooldownCutoffMs;
    return{eventTicker:event,activeEntries,maxEntriesPerTrade,eventCapBlocked:activeEntries>=maxEntriesPerTrade,latestHunterEntryMs,latestByConcept,hunterCooldownMinutes,cooldownScope,sharedCooldownBlocked,attackLatestEntryMs,attackCooldownBlocked,cooldownBlockedConcepts,cooldownBlocked,executableRepeatEntries,latestExecutableCloseMs,maxRepeatsPerMarket,repeatCooldownMinutes,repeatCapBlocked,repeatCooldownBlocked,repeatByConcept,closeByConcept,attackRepeatEntries,attackLatestCloseMs,repeatUnitArmed};
  }

  eventClockResetEpoch(){
    return Math.max(0,Number(this.getSettings?.()?.resetTimestampMs||0));
  }

  eventClockRecord(eventTicker){
    const event=String(eventTicker||'');
    if(!event)return null;
    const record=this.eventClockByEvent.get(event)||null;
    if(!record)return null;
    const epoch=this.eventClockResetEpoch();
    if(!isExecutableLeadingEventClock(record, epoch))return null;
    return record;
  }

  leadingEventElapsedMinutes(eventTicker, now=Date.now()){
    const projected=projectEventClock(this.eventClockRecord(eventTicker), now, {resetTimestampMs:this.eventClockResetEpoch()||null});
    return projected.ok?projected.elapsedMinutes:null;
  }

  invalidateEventClockExecutableAuthority(resetTimestampMs=this.eventClockResetEpoch()){
    const dropped=Number(this.eventClockByEvent?.size||0);
    this.eventClockByEvent?.clear?.();
    return {dropped,resetTimestampMs:Math.max(0,Number(resetTimestampMs)||0),reason:'stale_pre_reset_game_clock_authority'};
  }

  resolveRealAttackElapsedMinutes(q, now=Date.now()){
    const event=String(q?.eventTicker||q?.ticker||'');
    const inherited=this.leadingEventElapsedMinutes(event, now);
    if(inherited!=null)return {elapsedMinutes:inherited,source:'crystal_wall_leading_clock',record:this.eventClockRecord(event)};
    const live=confirmedInGameElapsedMinutes(q, now);
    if(live==null)return {elapsedMinutes:null,source:'none',record:null};
    this.stampCrystalWallEventClock({id:'gca-promote',ticker:q?.ticker||event,eventTicker:event}, q, now).catch(()=>{});
    return {elapsedMinutes:live,source:'live_confirmed_clock',record:this.eventClockRecord(event)};
  }

  async stampCrystalWallEventClock(entry, q={}, now=Date.now()){
    const event=String(entry?.eventTicker||q?.eventTicker||q?.ticker||'');
    if(!event)return {ok:false,reason:'missing_event_ticker'};
    const epoch=this.eventClockResetEpoch();
    const existing=this.eventClockByEvent.get(event)||null;
    if(isExecutableLeadingEventClock(existing, epoch)){
      return stampEventClockRecord({
        eventTicker:event,
        ticker:String(entry?.ticker||q?.ticker||existing.ticker||''),
        crystalWallEntryId:String(entry?.id||existing.crystalWallEntryId||''),
        elapsedMinutes:existing.anchoredElapsedMinutes,
        nowMs:now,
        source:existing.source,
        prior:existing,
        resetTimestampMs:epoch,
      });
    }
    const live=confirmedInGameElapsedMinutes({...(q||{}),eventTicker:event,ticker:entry?.ticker||q?.ticker,gameClockState:q?.gameClockState,gameStartTimeMs:q?.gameStartTimeMs||entry?.gameStartTimeMs}, now);
    if(live==null){
      const waiting=stampEventClockRecord({
        eventTicker:event,
        ticker:String(entry?.ticker||q?.ticker||''),
        crystalWallEntryId:String(entry?.id||''),
        elapsedMinutes:null,
        nowMs:now,
        source:'event_clock_waiting_for_confirmed_game_time',
        phase:'UNKNOWN',
        prior:existing,
        resetTimestampMs:epoch,
        executableAuthority:false,
        provisional:true,
        clockConfirmed:false,
      });
      if(waiting.record)this.eventClockByEvent.set(event, waiting.record);
      await this.audit('event_clock_waiting_for_confirmed_game_time',{eventTicker:event,ticker:waiting.record?.ticker||null,crystalWallEntryId:String(entry?.id||''),reason:waiting.reason}).catch(()=>{});
      return waiting;
    }
    const gca=q?.gameClockState||{};
    const stamped=stampEventClockRecord({
      eventTicker:event,
      ticker:String(entry?.ticker||q?.ticker||''),
      crystalWallEntryId:String(entry?.id||''),
      elapsedMinutes:live,
      nowMs:now,
      source:existing?.provisional?'confirmed_gca_promoted':'confirmed_clock_at_crystal_wall',
      prior:existing,
      resetTimestampMs:epoch,
      executableAuthority:true,
      provisional:false,
      clockConfirmed:true,
      anchorClockReconstructionReason:gca.clockReconstructionReason||'',
      anchorAuthoritySource:gca.source||'kalshi_game_clock',
      anchorSourceCurrentElapsedMinutes:live,
    });
    if(!stamped.record)return stamped;
    this.eventClockByEvent.set(event, stamped.record);
    if(typeof this.db?.upsertOpportunityEpisode==='function'){
      await this.db.upsertOpportunityEpisode({
        id:eventClockEpisodeId(event),
        systemName:this.getSettings()?.systemName,
        ticker:stamped.record.ticker,
        eventTicker:event,
        athenaDecision:{decision:'EVENT_CLOCK_ANCHORED',reason:stamped.reason,eventClockAnchor:stamped.record},
        trackingComplete:false,
        updatedAtMs:now,
      }).catch(()=>{});
    }
    await this.audit('event_clock_anchored',{eventTicker:event,ticker:stamped.record.ticker,crystalWallEntryId:stamped.record.crystalWallEntryId,elapsedMinutes:stamped.record.anchoredElapsedMinutes,reason:stamped.reason,source:stamped.record.source}).catch(()=>{});
    return stamped;
  }

  async hydrateEventClockAnchors(){
    if(typeof this.db?.opportunityEpisodes!=='function')return {restored:0};
    const s=this.getSettings(),rows=await this.db.opportunityEpisodes(s.systemName,{limit:5000}).catch(()=>[]);
    let restored=0;
    for(const row of rows||[]){
      const record=row?.athenaDecision?.eventClockAnchor;
      const event=String(record?.eventTicker||row?.eventTicker||'');
      if(!event||record?.leading!==true)continue;
      if(!isExecutableLeadingEventClock(record, this.eventClockResetEpoch()))continue;
      const epoch=this.eventClockResetEpoch();
      const recordEpoch=Math.max(0,Number(record.resetEpoch||record.resetTimestampMs||0));
      if(epoch>0&&recordEpoch!==epoch)continue;
      if(!this.eventClockByEvent.has(event)){this.eventClockByEvent.set(event,record);restored+=1;}
    }
    return {restored};
  }

  async hunterEntryPolicyDecision(concept, q, { requireClock = true, includeCooldown = true, stage = 'policy', crystalWallOverlay = false, megaWaveAuthorized = false, starlightReentry = false, boltDirectAuthorized = false } = {}) {
    const s = this.getSettings();
    void requireClock;
    // Galactic Explosion topology is a hard exposure invariant, not a second
    // strategic opinion. It remains valid after FIRE and is returned with an
    // exact reason instead of the old generic STATIC_POLICY label.
    if (!(await this.exactTickerExposureClear(concept, q, stage, {crystalWallOverlay}))) return {ok:false,reason:'ticker_lock'};

    const eventState=await this.hunterEventAdmissionState(q,{concept}),event=eventState.eventTicker;
    // Real Athena and Mega Wave Saints use the operator cap and cooldown.
    // Only Crystal Wall paper proofs stay exempt.
    const galacticSaintCapBypass=(megaWaveAuthorized===true&&s.galacticExplosionEnabled===true&&MEGA_WAVE.downstreamSaints.includes(String(concept||'')))
      ||(boltDirectAuthorized===true&&s.galacticExplosionEnabled===true&&BOLT_DIRECT.attacks.includes(String(concept||'')));
    const excaliburFirstSeatBypass=boltDirectAuthorized===true&&s.excaliburEnabled===true&&s.rozanHyakuRyuHaEnabled!==true&&BOLT_DIRECT.attacks.includes(String(concept||''));
    const starlightCapBypass=starlightReentry===true&&concept===STARLIGHT_EXTINCTION.conceptName;
    if (eventState.eventCapBlocked && crystalWallOverlay!==true && !galacticSaintCapBypass && !excaliburFirstSeatBypass && !starlightCapBypass) {
      await this.audit('hunter_entry_trade_cap_blocked', { concept, ticker:q.ticker, eventTicker:event, activeEntries:eventState.activeEntries, maxEntriesPerTrade:eventState.maxEntriesPerTrade, stage, megaWaveAuthorized:megaWaveAuthorized===true });
      return {ok:false,reason:'event_entry_cap',...eventState};
    }
    const repeatUnitOwnsReentry=Number(s.maxRepeatsPerMarket||0)>0||Number(s.repeatCooldownMinutes||0)>0;
    if (includeCooldown && crystalWallOverlay!==true && !starlightCapBypass && !excaliburFirstSeatBypass && eventState.cooldownBlocked && !repeatUnitOwnsReentry) {
      await this.audit('hunter_entry_cooldown_blocked', { concept, ticker:q.ticker, eventTicker:event, hunterCooldownMinutes:eventState.hunterCooldownMinutes, cooldownScope:eventState.cooldownScope, latestHunterEntryMs:eventState.latestHunterEntryMs, attackLatestEntryMs:eventState.attackLatestEntryMs, stage, megaWaveAuthorized:megaWaveAuthorized===true });
      return {ok:false,reason:'hunter_cooldown',...eventState};
    }
    if (crystalWallOverlay!==true && !starlightCapBypass && !excaliburFirstSeatBypass && eventState.repeatCapBlocked) {
      await this.audit('hunter_entry_repeat_cap_blocked', { concept, ticker:q.ticker, eventTicker:event, executableRepeatEntries:eventState.executableRepeatEntries, maxRepeatsPerMarket:eventState.maxRepeatsPerMarket, stage });
      return {ok:false,reason:'event_repeat_cap',...eventState};
    }
    if (includeCooldown && crystalWallOverlay!==true && !starlightCapBypass && !excaliburFirstSeatBypass && eventState.repeatCooldownBlocked) {
      await this.audit('hunter_entry_repeat_cooldown_blocked', { concept, ticker:q.ticker, eventTicker:event, repeatCooldownMinutes:eventState.repeatCooldownMinutes, latestExecutableCloseMs:eventState.latestExecutableCloseMs, stage });
      return {ok:false,reason:'repeat_cooldown',...eventState};
    }
    return {ok:true,reason:'qualified',...eventState,cooldownApplied:includeCooldown&&crystalWallOverlay!==true&&starlightCapBypass!==true&&excaliburFirstSeatBypass!==true,eventCapBypassed:(crystalWallOverlay===true||galacticSaintCapBypass===true||excaliburFirstSeatBypass===true||starlightCapBypass===true)&&eventState.eventCapBlocked,crystalWallOverlay:crystalWallOverlay===true,megaWaveAuthorized:megaWaveAuthorized===true,galacticSaintCapBypass:galacticSaintCapBypass===true,excaliburFirstSeatBypass:excaliburFirstSeatBypass===true,starlightReentry:starlightCapBypass===true};
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
      if (String(entryQualificationSnapshot?.version||'')==='CW4-FOLLOW-Q1' || entryQualificationSnapshot?.crystalWallFollow===true) return boundary;
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

  async createHunter(concept, q, stakeCents, _legacyStopLossCents = 0, { sourceFeeder = null, sourceTradeId = null, sourceEntryConfig = null, recoverySourceSnapshot = null, crystalWallSourceSnapshot = null, justiceArrowSourceSnapshot = null, crashSourceSnapshot = null, entryQualificationSnapshot = null, athenaFireCommand = null, crystalWallFireCommand = null, justiceArrowFireCommand = null, megaWaveAuthorization = null, starlightAuthorization = null, boltDirectAuthorization = null, crystalWallFollowAuthorization = null, legacyCompatibility = false } = {}) {
    const s = this.getSettings();
    const simulationMutationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    const exactTicker = String(q?.ticker || '');
    if (!exactTicker) return null;
    const tickerLockKey = this.hunterConcurrencyLockKey(concept, exactTicker, s);
    const pipelineAttemptId = `${Date.now()}-${++this.entryPipelineAttemptSequence}`;
    const boltDirectPreview=legacyCompatibility!==true&&String(boltDirectAuthorization?.version||athenaFireCommand?.version||'')===BOLT_DIRECT.version&&String(athenaFireCommand?.authorityMode||boltDirectAuthorization?.authorityMode||'')===BOLT_DIRECT.strategicEntryAuthority;
    const crystalWallFollowUpEntry=legacyCompatibility!==true&&concept==='Recovery Hunter'&&(
      String(crystalWallFollowAuthorization?.version||'')===String(CRYSTAL_WALL.followVersion)
      || String(athenaFireCommand?.authorityMode||'')===String(CRYSTAL_WALL.followAuthority)
      || String(athenaFireCommand?.version||'')===String(CRYSTAL_WALL.followVersion)
    );
    const crystalWallIndependentEntry=legacyCompatibility!==true&&concept==='Recovery Hunter'&&crystalWallFireCommand!=null&&boltDirectPreview!==true&&crystalWallFollowUpEntry!==true;
    const justiceArrowIndependentEntry=legacyCompatibility!==true&&concept==='Sagittarius Justice Arrow'&&justiceArrowFireCommand!=null;
    const independentCrashRecoveryEntry=crystalWallIndependentEntry||justiceArrowIndependentEntry;
    const scarletContinuationEntry=legacyCompatibility!==true&&concept==='Scarlet Needle'&&String(athenaFireCommand?.authorityMode||'')===SCARLET_NEEDLE.strategicEntryAuthority;
    const megaWaveAthenaEntry=legacyCompatibility!==true&&concept==='Athena Exclamation'&&String(athenaFireCommand?.authorityMode||'')===String(ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority);
    const megaWaveSaintEntry=legacyCompatibility!==true&&megaWaveAuthorization?.version===MEGA_WAVE.version&&String(megaWaveAuthorization?.parentConcept||'')==='Athena Exclamation'&&concept!==STARLIGHT_EXTINCTION.conceptName;
    const starlightReentry=legacyCompatibility!==true&&concept===STARLIGHT_EXTINCTION.conceptName&&String(starlightAuthorization?.version||'')===STARLIGHT_EXTINCTION.version;
    const boltDirectEntry=legacyCompatibility!==true&&String(boltDirectAuthorization?.version||athenaFireCommand?.version||'')===BOLT_DIRECT.version&&String(athenaFireCommand?.authorityMode||boltDirectAuthorization?.authorityMode||'')===BOLT_DIRECT.strategicEntryAuthority&&BOLT_DIRECT.attacks.includes(String(concept||''));
    const megaWaveClockBypass=megaWaveSaintEntry===true;
    const strategicClockBypass=independentCrashRecoveryEntry||megaWaveClockBypass;
    const fullConfiguredSizeRequired=independentCrashRecoveryEntry||scarletContinuationEntry||megaWaveAthenaEntry||megaWaveSaintEntry||boltDirectEntry;
    const executionAuthorityCommand=crystalWallIndependentEntry?crystalWallFireCommand:justiceArrowIndependentEntry?justiceArrowFireCommand:athenaFireCommand;
    const candidateId=String(executionAuthorityCommand?.decisionEvidence?.preBoltClearance?.preBoltId||entryQualificationSnapshot?.preBoltClearance?.preBoltId||executionAuthorityCommand?.authorizationId||executionAuthorityCommand?.boltId||entryQualificationSnapshot?.boltId||'');
    const boltId=String(executionAuthorityCommand?.authorizationId||executionAuthorityCommand?.boltId||entryQualificationSnapshot?.boltId||'');
    const trace = (stage, status, reason = null, data = {}) => this.recordEntryPipeline(pipelineAttemptId, concept, exactTicker, stage, status, reason, {candidateId:candidateId||null,boltId:boltId||null,eventTicker:q?.eventTicker||q?.ticker||null,...data});
    trace('RECEIVED','PASS',null,{eventTicker:String(q?.eventTicker || exactTicker),sourceFeeder:sourceFeeder || null,galacticExplosionEnabled:s.galacticExplosionEnabled===true,concurrencyLockKey:tickerLockKey});
    // EMI1 defense-in-depth: Engine scheduling is the primary mode boundary,
    // but createHunter itself must independently fail closed before any market
    // refresh, capital work, or broker mutation if LIVE is not currently armed.
    if (s.mode === 'LIVE' && !this.getLiveReady()) {
      trace('MODE_AUTHORIZATION','BLOCKED','live_not_ready');
      await this.audit('hunter_entry_mode_authorization_blocked',{concept,ticker:exactTicker,eventTicker:q?.eventTicker || exactTicker,mode:s.mode});
      return null;
    }
    if (s.mode !== 'LIVE' && s.mode !== 'SIMULATION') {
      trace('MODE_AUTHORIZATION','BLOCKED','invalid_mode',{mode:s.mode});
      return null;
    }
    trace('MODE_AUTHORIZATION','PASS',s.mode === 'LIVE' ? 'live_ready' : 'simulation');
    // R13/MFE1 universal execution backstop. Shadow/research paths do not use createHunter().
    const marketFamilyExclusion=executionMarketFamilyExclusion(exactTicker,s);
    if(marketFamilyExclusion.blocked){
      trace('MARKET_FAMILY_EXCLUSION','BLOCKED',MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,{marketFamilyExclusion});
      await this.audit('market_family_execution_exclusion_blocked',{concept,ticker:exactTicker,eventTicker:q?.eventTicker||exactTicker,mode:s.mode,marketFamilyExclusion});
      return null;
    }
    if (concept===CRYSTAL_WALL.conceptName && boltDirectEntry!==true && crystalWallFollowUpEntry!==true && crystalWallIndependentEntry!==true) {
      trace('CRYSTAL_WALL_SHADOW_ISOLATION','BLOCKED','crystal_wall_shadow_only_no_real_hunter_authority');
      await this.audit('crystal_wall_real_entry_blocked',{concept,ticker:exactTicker,eventTicker:q?.eventTicker||exactTicker,reason:'crystal_wall_shadow_only_no_real_hunter_authority'});
      return null;
    }
    if (this.hunterTickerLocks.has(tickerLockKey)) {
      trace('LOCAL_TICKER_LOCK','BLOCKED','local_ticker_lock_busy');
      await this.audit('hunter_exact_ticker_lock_busy', { concept, ticker: exactTicker, eventTicker: q?.eventTicker || exactTicker });
      return null;
    }
    this.hunterTickerLocks.add(tickerLockKey);
    let dbEntryCommitUnlock = null;
    let fleetTickerUnlock = null;
    let localEntryCommitKey = null;
    const releaseEntryCommitLock = async () => {
      if (fleetTickerUnlock) {
        const unlock=fleetTickerUnlock;fleetTickerUnlock=null;
        await unlock();
      }
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
      if (!isModelEnabled(s, concept)) {
      trace('MODEL_ENABLEMENT','BLOCKED','model_disabled');
      await this.audit('model_entry_disabled', { concept, ticker: q.ticker, kind: 'hunter' });
      return null;
      }
      const newGenerationEntry=legacyCompatibility!==true;
      // Mega Wave is the sole new-entry strategic authority for Athena and all
      // downstream Saints. Historical rows remain protectable/closable, but
      // retired Bolt/convergence/Scarlet/Justice/Another-Dimension paths may
      // not create fresh positions after this release.
      if(concept==='Athena Exclamation'&&!megaWaveAthenaEntry&&!boltDirectEntry){
        trace('MEGA_WAVE_AUTHORITY','BLOCKED','triple_crystal_athena_authority_required');
        await this.audit('mega_wave_retired_athena_entry_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker});
        return null;
      }
      if(MEGA_WAVE.downstreamSaints.includes(concept)&&!megaWaveSaintEntry&&!boltDirectEntry){
        trace('MEGA_WAVE_AUTHORITY','BLOCKED','profitable_athena_parent_authority_required');
        await this.audit('mega_wave_retired_saint_entry_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker});
        return null;
      }
      if((megaWaveAthenaEntry||megaWaveSaintEntry)&&!boltDirectEntry){
        trace('BOLT_DIRECT_AUTHORITY','BLOCKED','mega_wave_permission_retired');
        await this.audit('bolt_direct_mega_wave_permission_retired',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker});
        return null;
      }
      if(concept===STARLIGHT_EXTINCTION.conceptName&&!starlightReentry){
        trace('STARLIGHT_AUTHORITY','BLOCKED','starlight_stop_loss_reentry_required');
        await this.audit('starlight_regular_entry_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker});
        return null;
      }
      let fireValidation=null;
      if(newGenerationEntry){
        if(concept==='Recovery Hunter'&&!crystalWallIndependentEntry&&!boltDirectEntry&&!crystalWallFollowUpEntry){
          trace('CRYSTAL_WALL_FIRE','BLOCKED','crystal_wall_infinity_follow_required');
          await this.audit('crystal_wall_v3_execution_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:'crystal_wall_v3_authority_required'});
          return null;
        }
        if(concept==='Sagittarius Justice Arrow'&&!justiceArrowIndependentEntry&&!megaWaveSaintEntry&&!boltDirectEntry){
          trace('JUSTICE_ARROW_FIRE','BLOCKED','justice_arrow_v3_authority_required');
          await this.audit('justice_arrow_v3_execution_blocked',{concept,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:'justice_arrow_v3_authority_required'});
          return null;
        }
        fireValidation=crystalWallFollowUpEntry
          ? validateCrystalWallFollowFireCommand(athenaFireCommand,{concept,q,settings:s,now:Date.now()})
          : crystalWallIndependentEntry
          ? validateCrystalWallFireCommand(crystalWallFireCommand,{q,settings:s,now:Date.now()})
          : boltDirectEntry
            ? validateBoltDirectFireCommand(athenaFireCommand,{concept,q,settings:s,now:Date.now()})
          : justiceArrowIndependentEntry
            ? validateJusticeArrowFireCommand(justiceArrowFireCommand,{q,settings:s,now:Date.now()})
            : starlightReentry
              ? validateStarlightFireCommand(athenaFireCommand,{concept,q,settings:s,authorization:starlightAuthorization})
            : megaWaveSaintEntry
              ? validateMegaWaveSaintFireCommand(athenaFireCommand,{concept,q,settings:s,authorization:megaWaveAuthorization})
              : validateAthenaFireCommand(athenaFireCommand,{concept,q,settings:s,now:Date.now()});
        const fireStage=crystalWallFollowUpEntry?'CRYSTAL_WALL_FOLLOW_FIRE':crystalWallIndependentEntry?'CRYSTAL_WALL_FIRE':boltDirectEntry?'BOLT_DIRECT_FIRE':justiceArrowIndependentEntry?'JUSTICE_ARROW_FIRE':starlightReentry?'STARLIGHT_FIRE':megaWaveSaintEntry?'MEGA_WAVE_FIRE':'ATHENA_FIRE';
        const independentAudit=crystalWallIndependentEntry?'crystal_wall_v3_execution_blocked':justiceArrowIndependentEntry?'justice_arrow_v3_execution_blocked':starlightReentry?'starlight_reentry_execution_blocked':megaWaveSaintEntry?'mega_wave_saint_execution_blocked':'athena_fire_execution_blocked';
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
      if(independentCrashRecoveryEntry||megaWaveAthenaEntry||megaWaveSaintEntry||starlightReentry){
        const capacity=await this.portfolioCapacityState();
        const event=crystalWallIndependentEntry?'crystal_wall_v3_capacity_blocked':justiceArrowIndependentEntry?'justice_arrow_v3_capacity_blocked':starlightReentry?'starlight_capacity_blocked':megaWaveAthenaEntry?'mega_wave_athena_capacity_blocked':'mega_wave_saint_capacity_blocked';
        if(capacity.blocked){trace('PORTFOLIO_CAPACITY','BLOCKED','max_positions',capacity);await this.audit(event,{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,...capacity});return null;}
        trace('PORTFOLIO_CAPACITY','PASS',null,capacity);
      }
      const specialistStage=crystalWallIndependentEntry?'crystal_wall_preflight':justiceArrowIndependentEntry?'justice_arrow_preflight':newGenerationEntry?'post_fire_preflight':'legacy_preflight';
      const preExecutionPolicy=await this.hunterEntryPolicyDecision(concept,q,{requireClock:false,includeCooldown:true,stage:specialistStage,crystalWallOverlay:independentCrashRecoveryEntry,megaWaveAuthorized:megaWaveAthenaEntry||megaWaveSaintEntry,starlightReentry,boltDirectAuthorized:boltDirectEntry||crystalWallFollowUpEntry});
      if(!preExecutionPolicy.ok){trace(newGenerationEntry?'EXECUTION_POLICY':'STATIC_POLICY','BLOCKED',preExecutionPolicy.reason,preExecutionPolicy);return null;}
      trace(newGenerationEntry?'EXECUTION_POLICY':'STATIC_POLICY','PASS',preExecutionPolicy.reason,preExecutionPolicy);

      // Game Clock is historical telemetry only. Elapsed minutes never veto
      // createHunter. Closed/settled books are still rejected by prepareEntryExecution.
      const executionMinGameMinutes = Math.max(0, Number(s.minGameMinutes ?? 0));
      const executionMaxGameMinutes = Math.max(0, Number(s.maxGameMinutes ?? 0));
      const executionElapsed=this.resolveRealAttackElapsedMinutes(q).elapsedMinutes;
      trace('GAME_CLOCK','PASS','clock_authority_retired',{elapsedMinutes:executionElapsed,minGameMinutes:executionMinGameMinutes,maxGameMinutes:executionMaxGameMinutes,clockAuthority:'NONE'});

      // Refresh market + orderbook AFTER the authority call so execution depth,
      // exact event identity and lifecycle are newer than the evidence request.
      const initialRequested = Math.max(1, Math.floor(stakeCents / Math.max(1, q.yesAsk)));
      const sealedExecutionAuthority=independentCrashRecoveryEntry||newGenerationEntry;
      const authorityLimit=Number(executionAuthorityCommand?.authorizedMaxEntryCents);
      const executionLimitCents=sealedExecutionAuthority&&Number.isFinite(authorityLimit)&&authorityLimit>0?authorityLimit:Number(q.yesAsk);
      const plan = await this.prepareEntryExecution(q, initialRequested,{limitCents:executionLimitCents,stakeCents,recomputeRequestedFromFreshAsk:sealedExecutionAuthority});
      if (!plan) {
        trace('EXECUTABLE_BOOK','BLOCKED','no_executable_ask',{requested:initialRequested,executionLimitCents});
        await this.audit('entry_no_executable_ask', { concept, ticker: q.ticker, requested:initialRequested, limitCents:executionLimitCents, mode: s.mode });
        return null;
      }
      const requested=Math.max(1,Math.floor(Number(plan.requestedCount||initialRequested)));
      if(fullConfiguredSizeRequired&&Number(plan.count||0)!==requested){
        const classified=fullConfiguredSizeClassification(concept,{crystalWallIndependentEntry,justiceArrowIndependentEntry,megaWaveAthenaEntry,megaWaveSaintEntry,scarletContinuationEntry,starlightReentry});
        trace('EXECUTABLE_BOOK','BLOCKED',classified.reason,{requested,filledCount:Number(plan.count||0),concept});
        await this.audit(classified.event,{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,requested,filledCount:Number(plan.count||0),stakeCents:Number(stakeCents),concept});
        return null;
      }
      trace('EXECUTABLE_BOOK','PASS',null,{requested,initialRequested,filledCount:Number(plan.count||0),freshAskCents:Number(plan.freshAskCents||0),executionLimitCents:Number(plan.executionLimitCents||executionLimitCents),averagePriceCents:Number(plan.averagePriceCents||0),fullConfiguredSizeRequired});
      if(scarletContinuationEntry){
        const plannedScarletEntry=Math.round(Number(plan.averagePriceCents||q.yesAsk||0));
        const executionScarletTarget=scarletContinuationEconomicTarget({askCents:plannedScarletEntry,stakeCents,settings:s});
        if(!executionScarletTarget.targetFeasible){
          trace('EXECUTABLE_ECONOMICS','BLOCKED','scarlet_economic_target_unreachable_at_full_depth',{plannedEntryPriceCents:plannedScarletEntry,requiredTargetBidCents:executionScarletTarget.requiredTargetBidCents,targetNetPerOriginalContractCents:executionScarletTarget.netPerOriginalContractCents});
          await this.audit('scarlet_needle_v3_execution_economics_blocked',{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,plannedEntryPriceCents:plannedScarletEntry,requiredTargetBidCents:executionScarletTarget.requiredTargetBidCents,targetNetPerOriginalContractCents:executionScarletTarget.netPerOriginalContractCents});
          return null;
        }
        plan.scarletExecutionEconomicTarget=executionScarletTarget;
        trace('EXECUTABLE_ECONOMICS','PASS','scarlet_target_revalidated_at_full_depth',{plannedEntryPriceCents:plannedScarletEntry,requiredTargetBidCents:executionScarletTarget.requiredTargetBidCents,targetNetPerOriginalContractCents:executionScarletTarget.netPerOriginalContractCents});
      }
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
      const freshMarketFamilyExclusion=executionMarketFamilyExclusion(executionQuote.ticker,s);
      if(freshMarketFamilyExclusion.blocked){
        trace('MARKET_FAMILY_EXCLUSION_FRESH','BLOCKED',MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,{marketFamilyExclusion:freshMarketFamilyExclusion});
        await this.audit('market_family_fresh_execution_exclusion_blocked',{concept,ticker:executionQuote.ticker,eventTicker:expectedEventTicker,mode:s.mode,marketFamilyExclusion:freshMarketFamilyExclusion});
        return null;
      }

      // R51 authority inversion: Athena has already decided the market thesis.
      // Crystal Wall V3 is a separate sealed authority: the crash/rebound thesis
      // is revalidated against the same fresh executable quote, then only hard
      // execution and safety invariants may abort it.
      if(independentCrashRecoveryEntry){
        const freshFire=crystalWallIndependentEntry
          ? validateCrystalWallFireCommand(crystalWallFireCommand,{q:executionQuote,settings:s,now:Date.now()})
          : validateJusticeArrowFireCommand(justiceArrowFireCommand,{q:executionQuote,settings:s,now:Date.now()});
        const stage=crystalWallIndependentEntry?'CRYSTAL_WALL_EXECUTION_ENVELOPE':'JUSTICE_ARROW_EXECUTION_ENVELOPE';
        const event=crystalWallIndependentEntry?'crystal_wall_v3_fresh_execution_blocked':'justice_arrow_v3_fresh_execution_blocked';
        const command=crystalWallIndependentEntry?crystalWallFireCommand:justiceArrowFireCommand;
        const source=crystalWallIndependentEntry?crystalWallSourceSnapshot:justiceArrowSourceSnapshot;
        if(!freshFire.ok){
          trace(stage,'BLOCKED',freshFire.reason,freshFire);
          await this.audit(event,{ticker:q.ticker,eventTicker:expectedEventTicker,authorizationId:command?.authorizationId||null,reason:freshFire.reason});
          return null;
        }
        const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
        if(!boundary.ok){trace(stage,'BLOCKED',boundary.reason,boundary);return null;}
        const authorizedMax=Number(command?.authorizedMaxEntryCents||(crystalWallIndependentEntry?s.recoveryMaxEntryCents:s.justiceArrowMaxEntryCents)||0);
        if(Number(plan.bestAskCents||executionQuote.yesAsk)>authorizedMax+1e-9||Number(plan.averagePriceCents||0)>authorizedMax+1e-9){
          trace(stage,'BLOCKED',crystalWallIndependentEntry?'crystal_wall_strike_price_exceeded':'justice_arrow_strike_price_exceeded',{authorizedMaxEntryCents:authorizedMax,bestAskCents:Number(plan.bestAskCents||0),averagePriceCents:Number(plan.averagePriceCents||0)});
          return null;
        }
        if(crystalWallIndependentEntry&&!source?.crashEpisodeId){trace(stage,'BLOCKED','crystal_wall_crash_source_missing');return null;}
        if(justiceArrowIndependentEntry&&(!source?.observationId||source?.directPostScarletObservation!==true||!source?.parentScarletEntryId)){trace(stage,'BLOCKED','justice_arrow_direct_observation_missing');return null;}
        trace(stage,'PASS',crystalWallIndependentEntry?'crash_rebound_command_still_executable':'post_scarlet_direct_confirmation_still_executable',{authorizationId:command.authorizationId,crashEpisodeId:crystalWallIndependentEntry?source?.crashEpisodeId||null:null,observationId:justiceArrowIndependentEntry?source?.observationId||null:null,parentScarletEntryId:source?.parentScarletEntryId||null});
      }else if(newGenerationEntry){
        if(crystalWallFollowUpEntry){
          const replica=isExcaliburReplicaCommand(athenaFireCommand);
          const card=crystalWallFollowUpCard(executionQuote,s,entryQualificationSnapshot?.crashState||entryQualificationSnapshot?.crystalWallGeometry||null);
          if(!replica && !card.ok){trace('CRYSTAL_WALL_FOLLOW_ENVELOPE','BLOCKED',card.reason,card);return null;}
          const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);
          if(!replica && !boundary.ok){trace('CRYSTAL_WALL_FOLLOW_ENVELOPE','BLOCKED',boundary.reason,boundary);return null;}
          trace('CRYSTAL_WALL_FOLLOW_ENVELOPE','PASS','infinity_parent_follow_still_executable');
        }else if(boltDirectEntry){
          const bdFire=validateBoltDirectFireCommand(athenaFireCommand,{concept,q:executionQuote,settings:s,now:Date.now()});
          if(!bdFire.ok){trace('BOLT_DIRECT_EXECUTION_ENVELOPE','BLOCKED',bdFire.reason,bdFire);await this.audit('bolt_direct_fresh_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,boltId:athenaFireCommand?.boltId||null,reason:bdFire.reason});return null;}
          const replica=isExcaliburReplicaCommand(athenaFireCommand);
          if(!replica){
            const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);if(!boundary.ok){trace('BOLT_DIRECT_EXECUTION_ENVELOPE','BLOCKED',boundary.reason,boundary);return null;}
            const authorizedMax=Number(athenaFireCommand.authorizedMaxEntryCents||bdFire.authorizedMaxEntryCents||0);
            if(Number(plan.bestAskCents||executionQuote.yesAsk)>authorizedMax+1e-9||Number(plan.averagePriceCents||0)>authorizedMax+1e-9){
              trace('BOLT_DIRECT_EXECUTION_ENVELOPE','BLOCKED','bolt_direct_strike_price_exceeded',{authorizedMaxEntryCents:authorizedMax});
              return null;
            }
          }
          trace('BOLT_DIRECT_EXECUTION_ENVELOPE','PASS','bolt_and_attack_card_still_executable',{boltId:athenaFireCommand.boltId,selectedAttack:concept});
        }else if(megaWaveSaintEntry){
          const mwFire=validateMegaWaveSaintFireCommand(athenaFireCommand,{concept,q:executionQuote,settings:s,authorization:megaWaveAuthorization});
          if(!mwFire.ok){trace('MEGA_WAVE_EXECUTION_ENVELOPE','BLOCKED',mwFire.reason,mwFire);await this.audit('mega_wave_saint_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,grantId:megaWaveAuthorization?.grantId||null,reservationId:megaWaveAuthorization?.reservationId||null,reason:mwFire.reason});return null;}
          const boundary=hunterEntryBoundaryQualifiedAtQuote(concept,executionQuote,s,plan);if(!boundary.ok){trace('MEGA_WAVE_EXECUTION_ENVELOPE','BLOCKED',boundary.reason,boundary);return null;}
          const doctrineRefresh=megaWaveSaintSignalState(concept,megaWaveAuthorization?.qualification||{},executionQuote,s,Date.now());
          if(!doctrineRefresh.qualified){trace('MEGA_WAVE_EXECUTION_ENVELOPE','BLOCKED',doctrineRefresh.reason,doctrineRefresh.watch);await this.audit('mega_wave_saint_doctrine_refresh_blocked',{concept,ticker:q.ticker,grantId:megaWaveAuthorization?.grantId||null,reservationId:megaWaveAuthorization?.reservationId||null,reason:doctrineRefresh.reason});return null;}
          trace('MEGA_WAVE_EXECUTION_ENVELOPE','PASS','saint_authorization_and_doctrine_still_executable',{grantId:megaWaveAuthorization.grantId,reservationId:megaWaveAuthorization.reservationId,parentEntryId:megaWaveAuthorization.parentEntryId,doctrineReason:doctrineRefresh.reason});
        }else{
        const scarletAuthorityMode=String(athenaFireCommand?.authorityMode||'')===SCARLET_NEEDLE.strategicEntryAuthority;
        const scarletLineage=athenaFireCommand?.decisionEvidence?.scarletContinuation;
        if(concept==='Scarlet Needle'&&(!scarletAuthorityMode||!scarletLineage?.authorizationId||!scarletLineage?.parentEntryId)){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','scarlet_continuation_authority_required');
          await this.audit('scarlet_continuation_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:'scarlet_continuation_authority_required'});
          return null;
        }
        if(concept!=='Scarlet Needle'&&scarletAuthorityMode){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','scarlet_authority_attack_mismatch');
          await this.audit('scarlet_continuation_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:'scarlet_authority_attack_mismatch'});
          return null;
        }
        const megaWaveAthenaAuthorityMode=concept==='Athena Exclamation'&&String(athenaFireCommand?.authorityMode||'')===String(ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority);
        if(megaWaveAthenaAuthorityMode){
          const mw=athenaFireCommand?.decisionEvidence?.megaWaveAuthorization||megaWaveAuthorization;
          if(!mw||mw.version!==MEGA_WAVE.version||String(mw.parentConcept||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentConcept)||!(mw.finalProofEntryId||mw.thirdProofEntryId)){
            trace('MEGA_WAVE_AUTHORITY','BLOCKED','mega_wave_athena_authorization_missing');
            await this.audit('mega_wave_athena_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:'mega_wave_athena_authorization_missing'});
            return null;
          }
        }
        const plasmaAuthorityMode=String(athenaFireCommand?.authorityMode||'')===LIGHTNING_PLASMA.strategicEntryAuthority;
        const plasmaLineage=athenaFireCommand?.decisionEvidence?.lightningPlasmaContinuation;
        if(concept==='Lightning Plasma'&&(!plasmaAuthorityMode||!plasmaLineage?.authorizationId||!plasmaLineage?.parentShadowTradeId)){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','lightning_plasma_continuation_authority_required');
          await this.audit('lightning_plasma_continuation_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:'lightning_plasma_continuation_authority_required'});
          return null;
        }
        if(concept!=='Lightning Plasma'&&plasmaAuthorityMode){
          trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','lightning_plasma_authority_attack_mismatch');
          await this.audit('lightning_plasma_continuation_execution_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:'lightning_plasma_authority_attack_mismatch'});
          return null;
        }
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
        if(concept==='Lightning Plasma'&&!plasmaLineage?.parentShadowTradeId){trace('FIRE_EXECUTION_ENVELOPE','BLOCKED','lightning_plasma_parent_missing');return null;}
        trace('FIRE_EXECUTION_ENVELOPE','PASS','athena_command_still_executable',{boltId:athenaFireCommand.boltId});
        }
      }else{
        const doctrineValidation=await this.revalidateHunterEntryDoctrine(concept,executionQuote,plan,s,{sourceFeeder,sourceTradeId,recoverySourceSnapshot,crashSourceSnapshot,entryQualificationSnapshot});
        if(!doctrineValidation.ok){trace('DOCTRINE','BLOCKED',doctrineValidation.reason||'doctrine');return null;}
        trace('DOCTRINE','PASS','legacy_compatibility');
      }

      // R51: the durable Athena FIRE command is the sole strategic entry
      // authority. R50 B1/B2 remains historical/legacy compatibility only and
      // is never allowed to re-veto a new-generation FIRE command.
      let athenaAssessment=null;
      let athenaExclamationReview=null;
      if(independentCrashRecoveryEntry){
        if(crystalWallIndependentEntry)trace('CRYSTAL_WALL_AUTHORITY','PASS','independent_crash_rebound_authority',{authorizationId:crystalWallFireCommand.authorizationId,crashEpisodeId:crystalWallSourceSnapshot?.crashEpisodeId||null});
        else trace('JUSTICE_ARROW_AUTHORITY','PASS','post_scarlet_direct_own_confirmation_authority_with_athena_x1_exit',{authorizationId:justiceArrowFireCommand.authorizationId,observationId:justiceArrowSourceSnapshot?.observationId||null,parentScarletEntryId:justiceArrowSourceSnapshot?.parentScarletEntryId||null});
      }else if(newGenerationEntry){
        if(boltDirectEntry){
          athenaAssessment={version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,decision:'FIRE',strategicAuthority:true,executionEnvelopeAuthority:true,authorityMode:BOLT_DIRECT.strategicEntryAuthority,boltId:athenaFireCommand.boltId,commandHash:athenaFireCommand.commandHash,selectedAttack:concept,ranking:structuredClone(athenaFireCommand.ranking||[]),decisionEvidence:structuredClone(athenaFireCommand.decisionEvidence||{}),survivalCertificate:null,legacyB2VetoApplied:false,decidedAtMs:Number(athenaFireCommand.decidedAtMs)};
          trace('BOLT_DIRECT_AUTHORITY','PASS','atomic_thunder_times_enabled_attack',{boltId:athenaFireCommand.boltId,selectedAttack:concept});
        }else if(megaWaveAthenaEntry||megaWaveSaintEntry){
          const authorityMode=megaWaveAthenaEntry?ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority:MEGA_WAVE.downstreamAuthority;
          athenaAssessment={version:ATHENA_COMMANDER.version,policyRevision:MEGA_WAVE.policyRevision,decision:'FIRE',strategicAuthority:false,executionEnvelopeAuthority:true,authorityMode,boltId:athenaFireCommand.boltId,commandHash:athenaFireCommand.commandHash,selectedAttack:concept,ranking:structuredClone(athenaFireCommand.ranking||[]),decisionEvidence:structuredClone(athenaFireCommand.decisionEvidence||{}),survivalCertificate:null,survivalAuthority:null,legacyB2VetoApplied:false,decidedAtMs:Number(athenaFireCommand.decidedAtMs)};
          trace('MEGA_WAVE_AUTHORITY','PASS',megaWaveAthenaEntry?'triple_crystal_athena_authority':'profitable_athena_saint_authority',{boltId:athenaFireCommand.boltId,selectedAttack:concept,authorityMode});
        }else{
          const scarletContinuationAuthority=concept==='Scarlet Needle'&&String(athenaFireCommand?.authorityMode||'')===SCARLET_NEEDLE.strategicEntryAuthority;
          const lightningPlasmaContinuationAuthority=concept==='Lightning Plasma'&&String(athenaFireCommand?.authorityMode||'')===LIGHTNING_PLASMA.strategicEntryAuthority;
          const dedicatedContinuationAuthority=scarletContinuationAuthority||lightningPlasmaContinuationAuthority;
          athenaAssessment={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,decision:'FIRE',strategicAuthority:!dedicatedContinuationAuthority,executionEnvelopeAuthority:true,authorityMode:scarletContinuationAuthority?SCARLET_NEEDLE.strategicEntryAuthority:lightningPlasmaContinuationAuthority?LIGHTNING_PLASMA.strategicEntryAuthority:'ATHENA_A3',boltId:athenaFireCommand.boltId,commandHash:athenaFireCommand.commandHash,selectedAttack:concept,ranking:structuredClone(athenaFireCommand.ranking||[]),decisionEvidence:structuredClone(athenaFireCommand.decisionEvidence||{}),survivalCertificate:null,survivalAuthority:null,legacyB2VetoApplied:false,decidedAtMs:Number(athenaFireCommand.decidedAtMs)};
          trace(scarletContinuationAuthority?'SCARLET_AUTHORITY':'ATHENA','PASS',scarletContinuationAuthority?'crystal_wall_win_direct_continuation_authority':lightningPlasmaContinuationAuthority?'lightning_plasma_post_shadow_loss_authority':'supreme_fire_authority',{boltId:athenaFireCommand.boltId,selectedAttack:concept,athenaApprovalRequired:scarletContinuationAuthority?false:null});
        }
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
      const commitScope=this.hunterConcurrencyLockKey(concept, exactTicker, s)||exactTicker;
      localEntryCommitKey = `commit:${commitScope}`;
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
      if (typeof this.db.acquireFleetTickerLock === 'function') {
        const fleetUnison=s.rozanHyakuRyuHaEnabled===true||s.excaliburEnabled===true;
        const fleetLockKey=s.galacticExplosionEnabled===true
          ? `${exactTicker}|attack:${concept}|cosmos:${s.systemName}`
          : fleetUnison?`${exactTicker}|cosmos:${s.systemName}`:exactTicker;
        fleetTickerUnlock = await this.db.acquireFleetTickerLock(fleetLockKey);
        if (!fleetTickerUnlock) {
          trace('FLEET_TICKER_LOCK','BLOCKED','fleet_ticker_lock_busy');
          await this.audit('fleet_ticker_lock_busy',{concept,ticker:exactTicker,eventTicker:expectedEventTicker,cosmos:s.systemName,rozanHyakuRyuHaEnabled:s.rozanHyakuRyuHaEnabled===true,excaliburEnabled:s.excaliburEnabled===true});
          return null;
        }
      }
      trace('ENTRY_COMMIT_LOCK','PASS');

      // The market refresh itself may consume time. Authorization is deliberately
      // short-lived; recheck its freshness at the last executable boundary.
      const finalNow = Date.now();
      if(megaWaveAthenaEntry||megaWaveSaintEntry||strategicClockBypass){
        const capacity=await this.portfolioCapacityState();
        const event=crystalWallIndependentEntry?'crystal_wall_v3_capacity_blocked':justiceArrowIndependentEntry?'justice_arrow_v3_capacity_blocked':megaWaveAthenaEntry?'mega_wave_athena_capacity_blocked':'mega_wave_saint_capacity_blocked';
        if(capacity.blocked){trace('PORTFOLIO_CAPACITY','BLOCKED','max_positions',capacity);await this.audit(event,{ticker:q.ticker,eventTicker:expectedEventTicker,stage:'commit',...capacity});return null;}
        trace('PORTFOLIO_CAPACITY','PASS','commit_recheck',capacity);
      }
      trace('FINAL_CLOCK','PASS','clock_authority_retired',{clockAuthority:'NONE'});
      // Re-run hard exposure topology at the serialized commit boundary. Crystal
      // Wall's overlay exemption applies only to the parent/other Attack; a
      // second Crystal Wall on the same ticker remains blocked.
      const finalSpecialistStage=crystalWallIndependentEntry?'crystal_wall_commit':justiceArrowIndependentEntry?'justice_arrow_commit':newGenerationEntry?'post_fire_commit':'legacy_commit';
      const finalEntryPolicy=await this.hunterEntryPolicyDecision(concept,q,{requireClock:false,includeCooldown:true,stage:finalSpecialistStage,crystalWallOverlay:independentCrashRecoveryEntry,megaWaveAuthorized:megaWaveAthenaEntry||megaWaveSaintEntry,starlightReentry,boltDirectAuthorized:boltDirectEntry||crystalWallFollowUpEntry});
      if(!finalEntryPolicy.ok){trace('FINAL_ENTRY_POLICY','BLOCKED',finalEntryPolicy.reason,finalEntryPolicy);return null;}
      trace('FINAL_ENTRY_POLICY','PASS',finalEntryPolicy.reason,finalEntryPolicy);

      if (s.mode === 'SIMULATION') {
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

      const id = nowId();
      const now = Date.now();
      const plannedCount = Math.max(1, Number(plan.count || 0));
      const plannedEntry = Math.round(Number(plan.averagePriceCents || executionQuote.yesAsk || q.yesAsk));
      const simFeePerContract = Math.max(0, Number(s.simFeeCents || 0));
      const preflightEntryFeeCents = s.mode==='LIVE' ? null : simFeePerContract * plannedCount;
      const auroraPreflight = calculateAuroraSnapshotFromFeeModel({
        entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:preflightEntryFeeCents,
        mode:s.mode,simFeeCents:simFeePerContract,damageControlPercent:Number(s.auroraDamageControlPercent??45),calculatedAtMs:now,
      });
      if(!auroraPreflight.ok){
        trace('AURORA','BLOCKED',auroraPreflight.reason || 'aurora_preflight_failed');
        await this.audit('aurora_entry_preflight_blocked',{concept,ticker:q.ticker,eventTicker:expectedEventTicker,reason:auroraPreflight.reason,entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:auroraPreflight.entryFeeCents??preflightEntryFeeCents,expectedExitFeeCents:auroraPreflight.expectedExitFeeCents??null});
        return null;
      }
      trace('AURORA','PASS','preflight',{stopDistanceCents:auroraPreflight.stopDistanceCents,dangerPriceCents:auroraPreflight.dangerPriceCents,economicLossRatioAtDanger:auroraPreflight.economicLossRatioAtDanger});

      const frozenEntryConfig = entryConfigSnapshot(s, concept, sourceFeeder, stakeCents, sourceEntryConfig, q.gameClockState, q.eventTicker || q.ticker);
      if (recoverySourceSnapshot && typeof recoverySourceSnapshot === 'object') frozenEntryConfig.recoverySource = structuredClone(recoverySourceSnapshot);
      if (crystalWallSourceSnapshot && typeof crystalWallSourceSnapshot === 'object') frozenEntryConfig.crystalWall = structuredClone(crystalWallSourceSnapshot);
      if (justiceArrowSourceSnapshot && typeof justiceArrowSourceSnapshot === 'object') frozenEntryConfig.justiceArrow = structuredClone(justiceArrowSourceSnapshot);
      if (crashSourceSnapshot && typeof crashSourceSnapshot === 'object') frozenEntryConfig.crashRecoverySource = structuredClone(crashSourceSnapshot);
      if (entryQualificationSnapshot && typeof entryQualificationSnapshot === 'object') frozenEntryConfig.entryQualification = structuredClone(entryQualificationSnapshot);
      if (concept==='Scarlet Needle' && entryQualificationSnapshot?.scarletContinuation) frozenEntryConfig.scarletContinuation=structuredClone(entryQualificationSnapshot.scarletContinuation);
      if (concept==='Sagittarius Justice Arrow' && entryQualificationSnapshot?.justiceArrow) frozenEntryConfig.justiceArrow=structuredClone(entryQualificationSnapshot.justiceArrow);
      if (concept==='Sagittarius Justice Arrow' && entryQualificationSnapshot?.justiceArrowContinuation) frozenEntryConfig.justiceArrowContinuation=structuredClone(entryQualificationSnapshot.justiceArrowContinuation);
      if (concept==='Recovery Hunter' && entryQualificationSnapshot?.crystalWall) frozenEntryConfig.crystalWall=structuredClone(entryQualificationSnapshot.crystalWall);
      if (concept==='Lightning Plasma' && entryQualificationSnapshot?.lightningPlasmaContinuation) frozenEntryConfig.lightningPlasmaContinuation=structuredClone(entryQualificationSnapshot.lightningPlasmaContinuation);
      if (megaWaveAuthorization && typeof megaWaveAuthorization==='object') frozenEntryConfig.megaWave=structuredClone(megaWaveAuthorization);
      if (athenaAssessment && typeof athenaAssessment === 'object' && concept!=='Scarlet Needle') frozenEntryConfig.athena = structuredClone(athenaAssessment);
      if (concept==='Scarlet Needle' && athenaAssessment && typeof athenaAssessment === 'object') frozenEntryConfig.scarletAuthority=structuredClone(athenaAssessment);
      if (concept==='Athena Exclamation') frozenEntryConfig.athenaExclamation={version:ATHENA_EXCLAMATION_DOCTRINE.version,policyRevision:ATHENA_EXCLAMATION_DOCTRINE.policyRevision,megaWaveAuthorization:structuredClone(megaWaveAuthorization||entryQualificationSnapshot?.megaWaveAuthorization||null),candidate:structuredClone(entryQualificationSnapshot?.candidate||null),primeReview:structuredClone(athenaExclamationReview)};
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
      else frozenEntryConfig.athenaFire=structuredClone(athenaFireCommand);
      const authorizationEconomicTarget=crystalWallIndependentEntry?crystalWallFireCommand?.economicTarget:justiceArrowIndependentEntry?justiceArrowFireCommand?.economicTarget:athenaFireCommand?.economicTarget;
      const authorityEconomicTarget=scarletContinuationEntry&&plan.scarletExecutionEconomicTarget
        ? {...structuredClone(plan.scarletExecutionEconomicTarget),authorizationSnapshot:structuredClone(authorizationEconomicTarget||null),executionEntryPriceCents:plannedEntry,revalidatedAtMs:now}
        : authorizationEconomicTarget;
      const frozenEconomicTargetNet=Number(authorityEconomicTarget?.netPerOriginalContractCents??s.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);
      const fallbackTargetVersion=crystalWallIndependentEntry?'CRYSTAL-WALL-V3-ECONOMIC-TARGET-V1':justiceArrowIndependentEntry?'JUSTICE-ARROW-ATHENA-X1-ECONOMIC-TARGET-V2':'ATHENA-A3-ECONOMIC-TARGET-V1';
      frozenEntryConfig.economicTarget=structuredClone(authorityEconomicTarget||{version:fallbackTargetVersion,netPerOriginalContractCents:frozenEconomicTargetNet});
      const frozenProfitPolicy=attackProfitAuthoritySnapshot(s,concept);
      frozenEntryConfig.profitAuthority=frozenProfitPolicy.authority;
      frozenEntryConfig.profitAuthorityRevision=frozenProfitPolicy.revision;
      if(frozenProfitPolicy.authority===PROTECTED_RUNNER_INTELLIGENCE.version){
        frozenEntryConfig.pri1R2={version:PROTECTED_RUNNER_INTELLIGENCE.version,policyRevision:PROTECTED_RUNNER_INTELLIGENCE.policyRevision,enabledAtEntry:true,triggerNetPerOriginalContractCents:frozenProfitPolicy.triggerNetPerOriginalContractCents,...(concept==='Recovery Hunter'?{trailNetPerOriginalContractCents:frozenProfitPolicy.trailNetPerOriginalContractCents,infinityLockNetPerOriginalContractCents:Math.max(1,Number(frozenProfitPolicy.trailNetPerOriginalContractCents||s.recoveryPri1R2TrailCents||1))}:{}),fullPositionOnly:true,lossAuthority:'U-SG1'};
        delete frozenEntryConfig.infinityBreak;
        delete frozenEntryConfig.athenaExit;
      }else if(PORTFOLIO_CONCEPTS.has(concept)){
        frozenEntryConfig.infinityBreak={
          version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,enabledAtEntry:true,
          minimumNetPerOriginalContractCents:frozenEconomicTargetNet,
          requiredFreshConfirmations:Math.max(1,Math.floor(Number(s.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),
          maximumBookAgeMs:Math.max(100,Math.floor(Number(s.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs))),
          confirmationWindowMs:Math.max(250,Math.floor(Number(s.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs))),
          fullPositionOnly:true,lossAuthority:'U-SG1',
        };
        delete frozenEntryConfig.pri1R2;
        delete frozenEntryConfig.athenaExit;
      }
      frozenEntryConfig.auroraDamageControlPercent=Number(s.auroraDamageControlPercent??45);


      const makeEntry = ({status='open',entryPriceCents=plannedEntry,count=plannedCount,entryFeeCents=preflightEntryFeeCents,entryOrderId=null,entryClientOrderId=null,aurora=null,entryConfig=frozenEntryConfig}={}) => ({
        id, systemName:s.systemName, ownerId:s.ownerId, conceptName:concept,
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
        const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,mode:'SIMULATION',simFeeCents:simFeePerContract,damageControlPercent:Number(s.auroraDamageControlPercent??45),calculatedAtMs:now});
        if(!aurora.ok){
          trace('AURORA','BLOCKED',aurora.reason || 'aurora_exact_failed');
          await this.audit('aurora_simulation_exact_blocked',{concept,ticker:q.ticker,reason:aurora.reason,entryPriceCents:entry,count});
          return null;
        }
        const config={...frozenEntryConfig,aurora};
        const e=makeEntry({status:'open',entryPriceCents:entry,count,entryFeeCents,aurora,entryConfig:config});
        let releaseSimulationMutation=null;
        if(this.enterSimulationMutation){
          releaseSimulationMutation=this.enterSimulationMutation(simulationMutationToken);
          if(!releaseSimulationMutation){trace('PERSISTENCE','BLOCKED','simulation_reset_epoch_or_barrier');await this.audit('simulation_reset_mutation_blocked',{kind:'execution_attack',concept,ticker:q.ticker,boltId:boltId||null,reason:'reset_epoch_or_barrier'});return null;}
        }
        try{await this.db.insertEntry(e);}finally{try{releaseSimulationMutation?.();}catch{}}
        try{this.onHunterOpened?.(e);}catch{}
        trace('PERSISTENCE','PASS','simulation_open_persisted',{hunterId:e.id,status:e.status});
        trace('OPENED','PASS',e.status,{hunterId:e.id,entryPriceCents:e.entryPriceCents,count:e.count,auroraDangerPriceCents:aurora.dangerPriceCents});
        return e;
      }

      // R45 LIVE entry durability: persist the exact owned entry intent before
      // any broker BUY can occur. A crash/network ambiguity after submission is
      // therefore recoverable by entryClientOrderId instead of becoming an
      // unowned broker position.
      if(!this.getLiveReady()){trace('EXECUTION','BLOCKED','live_not_ready');return null;}

      // LIVE shard preflight is execution infrastructure, not trading doctrine.
      // Resolve Kalshi's authoritative market shard, prove that shard has the
      // collateral required by this already-approved Athena FIRE, and route the
      // eventual broker mutation directly to that shard.
      const shardRequiredCents=Math.max(0,plannedCount*plannedEntry+Number(auroraPreflight.entryFeeCents||0));
      let shardPreflight={ok:true,reason:'live_exchange_preflight_unsupported',exchangeIndex:q.exchangeIndex!=null&&String(q.exchangeIndex).trim()!==''&&Number.isFinite(Number(q.exchangeIndex))?Math.trunc(Number(q.exchangeIndex)):null,availableCents:null,requiredCents:shardRequiredCents};
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
      const pendingConfig={...frozenEntryConfig,auroraPending:{version:AURORA_EXECUTION.version,preflight:auroraPreflight,exactFillRequired:true}};
      let e=makeEntry({status:'entry_pending',entryPriceCents:plannedEntry,count:plannedCount,entryFeeCents:0,entryClientOrderId,entryConfig:pendingConfig});
      await this.db.insertEntry(e);
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
      if(typeof this.db.acquireHunterTickerLock==='function'){
        brokerMutationUnlock=await this.db.acquireHunterTickerLock(s.systemName,`broker:${q.ticker}`);
        if(!brokerMutationUnlock){
          const patch={status:'rejected',remainingCount:0,closeReason:'broker_mutation_lock_busy',updatedAtMs:Date.now()};
          await this.db.updateEntry(id,patch);e={...e,...patch};
          await this.audit('live_broker_mutation_ticker_db_lock_busy',{id,ticker:q.ticker,concept,operation:'entry'},'warning');
          trace('EXECUTION','BLOCKED','ticker_broker_mutation_lock_busy',{hunterId:id});
          return null;
        }
      }
      let result;
      try{
        const liveEntryLimitCents=Math.round(Number(plan.executionLimitCents||executionQuote.yesAsk||q.yesAsk));
        result=await this.kalshi.placeOrder({ticker:q.ticker,action:'buy',count:plannedCount,priceCents:liveEntryLimitCents,clientOrderId:entryClientOrderId,exchangeIndex:shardPreflight.exchangeIndex,timeInForce:fullConfiguredSizeRequired?'fill_or_kill':'immediate_or_cancel'});
      }catch(error){
        await this.audit('live_entry_submit_exception_pending_reconciliation',{id,ticker:q.ticker,concept,clientOrderId:entryClientOrderId,message:String(error?.message||error)},'warning');
        trace('EXECUTION','PASS','live_submit_exception_pending_reconciliation',{hunterId:id});
        return e;
      }finally{
        if(brokerMutationUnlock){
          try{await brokerMutationUnlock();}catch(error){await this.audit('live_broker_mutation_ticker_db_unlock_failed',{id,ticker:q.ticker,concept,operation:'entry',message:String(error?.message||error)},'error');}
        }
      }
      const entryOrderId=result?.orderId||null;
      const liveClass=classifyLiveOrderResult(result);
      if(liveClass.kind==='fill'||Number(result?.fillCount)>0){
        const count=Number(result.fillCount);
        const entry=Math.round(Number(result.averageFillPriceCents ?? executionQuote.yesAsk ?? q.yesAsk));
        const entryFeeCents=Number.isFinite(Number(result.feePaidCents))?Number(result.feePaidCents):Number(auroraPreflight.entryFeeCents||0);
        let aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents:entry,count,entryFeeCents,mode:'LIVE',simFeeCents:simFeePerContract,damageControlPercent:Number(s.auroraDamageControlPercent??45),calculatedAtMs:Date.now()});
        if(!aurora.ok){
          // The BUY is already durably owned. If the actual fill/fee economics
          // cannot produce any Aurora line inside the 45% covenant, do not
          // fabricate a stop snapshot. Persist the fault and immediately create
          // a durable full-position flattening obligation. U-SG1/protection
          // then retries safe execution until the owned quantity is closed.
          const config={...frozenEntryConfig,auroraFault:{version:AURORA_EXECUTION.version,policyRevision:AURORA_EXECUTION.policyRevision,reason:aurora.reason||'exact_fill_fee_overrun',unprotectable:true,detectedAtMs:Date.now()}};
          const patch={status:'exit_pending',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,stopPriceCents:Math.max(0,entry-1),stopLossCents:1,count,remainingCount:count,entryFeeCents,entryOrderId,entryClientOrderId,entryConfig:config,closeReason:'aurora_covenant_fault',updatedAtMs:Date.now()};
          await this.db.updateEntry(id,patch);
          e={...e,...patch};
          try{this.onHunterOpened?.(e);}catch{}
          await this.audit('aurora_live_exact_fee_covenant_unprotectable',{id,ticker:q.ticker,concept,reason:aurora.reason,entryPriceCents:entry,count,entryFeeCents},'error');
          trace('AURORA','BLOCKED','live_exact_fee_covenant_unprotectable',{hunterId:id});
          return e;
        }
        const config={...frozenEntryConfig,aurora};
        const patch={status:'open',entryPriceCents:entry,currentPriceCents:entry,peakPriceCents:entry,stopPriceCents:aurora.dangerPriceCents,stopLossCents:aurora.stopDistanceCents,count,remainingCount:count,entryFeeCents,entryOrderId,entryClientOrderId,entryConfig:config,updatedAtMs:Date.now()};
        await this.db.updateEntry(id,patch);
        e={...e,...patch};
        try{this.onHunterOpened?.(e);}catch{}
        trace('EXECUTION','PASS','live_fill',{orderId:entryOrderId,count});
        trace('OPENED','PASS','open',{hunterId:e.id,entryPriceCents:entry,count,auroraDangerPriceCents:aurora.dangerPriceCents});
        return e;
      }
      if(liveClass.kind==='ambiguous'||result?.ambiguous){
        const patch={entryOrderId,status:'entry_pending',updatedAtMs:Date.now()};
        await this.db.updateEntry(id,patch);e={...e,...patch};
        trace('EXECUTION','PASS','live_ambiguous_pending',{orderId:entryOrderId,hunterId:id});
        return e;
      }
      if(liveClass.kind==='rejected'){
        await this.db.updateEntry(id,{status:'rejected',remainingCount:0,entryOrderId,closeReason:liveClass.reason,updatedAtMs:Date.now()});
        this.rememberLiveBrokerHardReject(concept,q.ticker,boltId,{httpStatus:result?.httpStatus||null,brokerErrorCode:result?.brokerErrorCode||null,exchangeIndex:shardPreflight.exchangeIndex});
        trace('EXECUTION','BLOCKED',liveClass.reason,{orderId:entryOrderId,httpStatus:result?.httpStatus||null,brokerErrorCode:result?.brokerErrorCode||null,exchangeIndex:shardPreflight.exchangeIndex});
        await this.audit('live_entry_broker_rejected',{id,concept,ticker:q.ticker,orderId:entryOrderId,count:plannedCount,limitCents:Number(plan.executionLimitCents||executionQuote.yesAsk||q.yesAsk),reason:liveClass.reason,httpStatus:result?.httpStatus||null,brokerError:result?.brokerError||null,brokerErrorCode:result?.brokerErrorCode||null,brokerErrorDetails:result?.brokerErrorDetails??null,exchangeIndex:shardPreflight.exchangeIndex},'warning');
        return null;
      }
      await this.db.updateEntry(id,{status:'rejected',remainingCount:0,entryOrderId,closeReason:'entry_ioc_unfilled',updatedAtMs:Date.now()});
      trace('EXECUTION','BLOCKED','live_ioc_unfilled',{orderId:entryOrderId});
      await this.audit('live_entry_ioc_unfilled',{id,concept,ticker:q.ticker,orderId:entryOrderId,count:plannedCount,limitCents:Number(plan.executionLimitCents||executionQuote.yesAsk||q.yesAsk)});
      return null;
    } finally {
      try {
        await releaseEntryCommitLock();
      } catch (e) {
        await this.audit('hunter_entry_commit_db_unlock_failed', { concept, ticker: exactTicker, message: String(e?.message || e) });
      }
      this.hunterTickerLocks.delete(tickerLockKey);
    }
  }

  async executeMegaWaveSaint(q,parentEntry,authorization,watch={}){
    const s=this.getSettings(),concept=String(authorization?.saintConcept||''),ticker=String(q?.ticker||'');
    if(!MEGA_WAVE.downstreamSaints.includes(concept)||String(parentEntry?.conceptName||'')!=='Athena Exclamation'||String(parentEntry?.ticker||'')!==ticker)return null;
    if(String(parentEntry?.id||'')!==String(authorization?.parentEntryId||'')||String(authorization?.ticker||'')!==ticker)return null;
    if(typeof this.db?.entryById!=='function'||typeof this.db?.opportunityEpisode!=='function')return null;
    const durableParent=await this.db.entryById(String(authorization.parentEntryId)).catch(()=>null),parentMw=durableParent?.entryConfig?.megaWave||{};
    const grantEpisode=await this.db.opportunityEpisode(String(authorization.grantId||'')).catch(()=>null),grant=grantEpisode?.athenaDecision?.megaWaveGrant,reservation=grant?.reservations?.[concept];
    const parentClosedProfit=String(durableParent?.status||'')==='closed'&&Number(durableParent?.remainingCount||0)<=1e-9&&Number(durableParent?.pnlCents||0)>0;
    const galacticOpenGrant=false;
    const resetAt=Math.max(0,Number(s.resetTimestampMs||0));
    const parentCurrentEpoch=durableParent?.archived!==true&&(resetAt<=0||Number(durableParent?.openedAtMs||0)>=resetAt);
    const parentOk=parentCurrentEpoch&&String(durableParent?.id||'')===String(authorization.parentEntryId)&&String(durableParent?.systemName||'')===String(s.systemName)&&String(durableParent?.ownerId||'')===String(s.ownerId)&&String(durableParent?.mode||'')===String(s.mode||'')&&String(durableParent?.conceptName||'')==='Athena Exclamation'&&String(durableParent?.ticker||'')===ticker&&parentClosedProfit&&String(parentMw?.version||'')===MEGA_WAVE.version&&String(parentMw?.policyRevision||'')===MEGA_WAVE.policyRevision;
    if(!parentOk)return null;
    if(String(grant?.version||'')!==MEGA_WAVE.version||String(grant?.policyRevision||'')!==MEGA_WAVE.policyRevision||String(grant?.status||'')!=='ACTIVE'||String(grant?.parentEntryId||'')!==String(authorization.parentEntryId)||String(grant?.ticker||'')!==ticker||!Array.isArray(grant?.eligibleSaints)||!grant.eligibleSaints.includes(concept)||String(reservation?.status||'')!=='RESERVED'||String(reservation?.reservationId||'')!==String(authorization.reservationId||''))return null;
    const signal=megaWaveSaintSignalState(concept,watch,q,s,Date.now());if(!signal.qualified)return null;
    const stakeCents=attackConfiguredStakeCents(s,concept),envelope=hunterEntryEnvelope(s,concept);if(!(stakeCents>0)||!envelope)return null;
    const target=executionAttackEconomicTarget(concept,{askCents:Number(q.yesAsk),stakeCents,settings:s});if(!target.targetFeasible)return null;
    const at=Date.now();const lineage={...structuredClone(authorization),qualification:structuredClone(signal.watch),qualifiedAtMs:at,profitAuthorityAtAttempt:attackProfitAuthoritySnapshot(s,concept)};
    const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,authorityMode:galacticOpenGrant?MEGA_WAVE.galacticOpenAuthority:MEGA_WAVE.downstreamAuthority,authoritySource:galacticOpenGrant?'GALACTIC_ATHENA_OPEN':'PROFITABLE_ATHENA_EXCLAMATION_CLOSE',strategicSelectionBypassed:true,boltId:String(authorization.reservationId),boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:at,expiresAtMs:at+5_000,ticker,eventTicker:String(q?.eventTicker||parentEntry?.eventTicker||ticker),side:'YES',selectedAttack:concept,selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:Number(envelope.minEntryCents),operatorMaxEntryCents:Number(envelope.maxEntryCents),entryPriceCents:Number(q.yesAsk),authorizedMaxEntryCents:Number(envelope.maxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,ranking:[{concept,displayName:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,score:100,authorityMode:MEGA_WAVE.downstreamAuthority,targetFeasible:true,requiredTargetBidCents:target.requiredTargetBidCents}],decisionEvidence:{megaWaveAuthorization:lineage,configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,normalStrategicDiscoveryBypassed:true,saintDoctrinePreserved:true,hardExecutionSafetyStillRequired:true}};
    const command=sealAthenaFireCommand(core),snapshot={version:'MEGA-WAVE-SAINT-Q1',policyRevision:MEGA_WAVE.policyRevision,megaWaveAuthorization:structuredClone(lineage),qualification:structuredClone(signal.watch),observedAtMs:at};
    return this.createHunter(concept,q,stakeCents,0,{sourceTradeId:String(parentEntry.id),entryQualificationSnapshot:snapshot,athenaFireCommand:command,megaWaveAuthorization:lineage,legacyCompatibility:false});
  }

  async executeStarlightExtinction(q,parentEntry,authorization,watch={}){
    const s=this.getSettings(),ticker=String(q?.ticker||''),concept=STARLIGHT_EXTINCTION.conceptName;
    if(String(parentEntry?.ticker||'')!==ticker||String(authorization?.ticker||'')!==ticker)return null;
    if(String(parentEntry?.id||'')!==String(authorization?.parentEntryId||''))return null;
    if(String(parentEntry?.systemName||'')!==String(s.systemName||''))return null;
    if(String(parentEntry?.conceptName||'')===concept)return null;
    if(!EXECUTABLE_HUNTER_CONCEPTS.has(String(parentEntry?.conceptName||'')))return null;
    if(typeof this.db?.entryById!=='function')return null;
    const durableParent=await this.db.entryById(String(authorization.parentEntryId)).catch(()=>null);
    const parentOk=String(durableParent?.id||'')===String(authorization.parentEntryId)
      &&String(durableParent?.systemName||'')===String(s.systemName)
      &&String(durableParent?.ownerId||'')===String(s.ownerId)
      &&String(durableParent?.mode||'')===String(s.mode||'')
      &&String(durableParent?.ticker||'')===ticker
      &&String(durableParent?.status||'')==='closed'
      &&Number(durableParent?.remainingCount||0)<=1e-9
      &&EXECUTABLE_HUNTER_CONCEPTS.has(String(durableParent?.conceptName||''))
      &&String(durableParent?.conceptName||'')!==concept
      &&isStarlightParentStopLoss(durableParent?.closeReason);
    if(!parentOk)return null;
    const existing=typeof this.db.entriesByConceptTicker==='function'
      ? await this.db.entriesByConceptTicker(s.systemName,concept,ticker).catch(()=>[])
      : [];
    if((existing||[]).some((row)=>String(row?.sourceTradeId||'')===String(durableParent.id)))return null;
    const signal=megaWaveSaintSignalState(concept,watch,q,s,Date.now());if(!signal.qualified)return null;
    const stakeCents=attackConfiguredStakeCents(s,concept),envelope=hunterEntryEnvelope(s,concept);if(!(stakeCents>0)||!envelope)return null;
    const target=executionAttackEconomicTarget(concept,{askCents:Number(q.yesAsk),stakeCents,settings:s});if(!target.targetFeasible)return null;
    const at=Date.now();
    const lineage={...structuredClone(authorization),parentConcept:String(durableParent.conceptName),parentCloseReason:String(durableParent.closeReason||''),parentSystemName:String(durableParent.systemName||s.systemName),qualification:structuredClone(signal.watch),qualifiedAtMs:at,profitAuthorityAtAttempt:attackProfitAuthoritySnapshot(s,concept)};
    const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,authorityMode:STARLIGHT_EXTINCTION.strategicEntryAuthority,authoritySource:'SAME_COSMOS_STOP_LOSS',strategicSelectionBypassed:true,boltId:String(authorization.grantId||durableParent.id),boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:at,expiresAtMs:at+5_000,ticker,eventTicker:String(q?.eventTicker||parentEntry?.eventTicker||ticker),side:'YES',selectedAttack:concept,selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:Number(envelope.minEntryCents),operatorMaxEntryCents:Number(envelope.maxEntryCents),entryPriceCents:Number(q.yesAsk),authorizedMaxEntryCents:Number(envelope.maxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,ranking:[{concept,displayName:EXECUTION_ATTACK_DISPLAY[concept]?.name||concept,score:100,authorityMode:STARLIGHT_EXTINCTION.strategicEntryAuthority,targetFeasible:true,requiredTargetBidCents:target.requiredTargetBidCents}],decisionEvidence:{starlightAuthorization:lineage,configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,normalStrategicDiscoveryBypassed:true,saintDoctrinePreserved:true,hardExecutionSafetyStillRequired:true}};
    const command=sealAthenaFireCommand(core),snapshot={version:'STARLIGHT-Q1',policyRevision:STARLIGHT_EXTINCTION.policyRevision,starlightAuthorization:structuredClone(lineage),qualification:structuredClone(signal.watch),observedAtMs:at};
    return this.createHunter(concept,q,stakeCents,0,{sourceTradeId:String(durableParent.id),entryQualificationSnapshot:snapshot,athenaFireCommand:command,starlightAuthorization:lineage,legacyCompatibility:false});
  }

  async executeMegaWaveAthenaContinuation(q, parentEntry, { authorizationId, thirdProof=null, authorizedAtMs=Date.now() } = {}) {
    const s=this.getSettings();
    if(s.athenaExclamationEnabled!==true)return null;
    const ticker=String(q?.ticker||''),parentTicker=String(parentEntry?.ticker||'');
    if(!ticker||ticker!==parentTicker)return null;
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall||{},crystalProof=thirdProof;
    if(String(parentEntry?.conceptName||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentConcept))return null;
    if(String(parentCrystalWall?.version||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentVersion)||String(parentCrystalWall?.policyRevision||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentPolicyRevision))return null;
    if(String(crystalProof?.version||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.thirdProofVersion)||String(crystalProof?.policyRevision||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.policyRevision))return null;
    const minProofs=Number(ATHENA_EXCLAMATION_DOCTRINE.minimumConsecutiveProfitableShadowProofs||1),maxProofs=Number(ATHENA_EXCLAMATION_DOCTRINE.maximumConsecutiveProfitableShadowProofs||5);
    const rawRequired=Number(crystalProof?.requiredProofCount??crystalProof?.requiredConsecutiveProfitableShadowProofs);
    if(!Number.isInteger(rawRequired)||rawRequired<minProofs||rawRequired>maxProofs)return null;
    const required=rawRequired;
    if(Number(crystalProof?.proofStage||0)!==required)return null;
    let proofRows=Array.isArray(crystalProof?.proofs)?crystalProof.proofs.map(x=>structuredClone(x)):[];
    if(proofRows.length!==required){
      const names=['first','second','third','fourth','fifth'];proofRows=[];
      for(let i=0;i<required;i++){
        const prefix=names[i]+'Proof',entryId=String(crystalProof?.[prefix+'EntryId']||''),crashEpisodeId=String(crystalProof?.[prefix+'CrashEpisodeId']||'');
        if(!entryId||!crashEpisodeId)return null;
        proofRows.push({index:i+1,entryId,crashEpisodeId,openedAtMs:Number(crystalProof?.[prefix+'OpenedAtMs']||0),closedAtMs:Number(crystalProof?.[prefix+'ClosedAtMs']||0),exitPriceCents:Number(crystalProof?.[prefix+'ExitPriceCents']||0),realizedPnlCents:Number(crystalProof?.[prefix+'RealizedPnlCents']||0)});
      }
    }
    const ids=proofRows.map(x=>String(x?.entryId||'')),crashes=proofRows.map(x=>String(x?.crashEpisodeId||''));
    if(ids.length!==required||ids.some(x=>!x)||new Set(ids).size!==required||crashes.some(x=>!x)||new Set(crashes).size!==required)return null;
    const identity=crystalWallProofIdentitiesValid(ids,crashes,required);if(!identity.ok)return null;
    const resetAt=Math.max(0,Number(s.resetTimestampMs||0));
    const epoch=crystalWallProofsBelongToResetEpoch([{openedAtMs:parentEntry?.openedAtMs,closedAtMs:parentEntry?.closedAtMs},...proofRows],resetAt);
    if(!epoch.ok)return null;
    const finalProofEntryId=String(crystalProof?.finalProofEntryId||ids.at(-1)||'');
    if(finalProofEntryId!==String(parentEntry?.id||'')||String(crystalProof?.ticker||'')!==ticker||crystalProof?.independentCrashEpisodes!==true||crystalProof?.sameExactTicker!==true)return null;
    if(Array.isArray(crystalProof?.proofEntryIds)&&crystalProof.proofEntryIds.map(String).join('|')!==ids.join('|'))return null;
    if(Array.isArray(crystalProof?.proofCrashEpisodeIds)&&crystalProof.proofCrashEpisodeIds.map(String).join('|')!==crashes.join('|'))return null;
    if(typeof this.db?.entryById!=='function')return null;
    const durable=await Promise.all(ids.map(id=>this.db.entryById(id).catch(()=>null)));
    for(let i=0;i<durable.length;i++){
      const row=durable[i],cw=row?.entryConfig?.crystalWall||{},expected=proofRows[i];
      if(String(row?.id||'')!==ids[i]||row?.archived===true||String(row?.ownerId||'')!==String(s.ownerId)||String(row?.mode||'')!==String(s.mode||'')||String(row?.conceptName||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentConcept)||String(row?.ticker||'')!==ticker||String(row?.status||'')!=='closed'||Number(row?.remainingCount||0)>1e-9||String(row?.closeReason||'')!==String(CRYSTAL_WALL.profitableCloseReason)||!(Number(row?.pnlCents||0)>0)||String(cw?.version||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentVersion)||String(cw?.policyRevision||'')!==String(ATHENA_EXCLAMATION_DOCTRINE.requiredParentPolicyRevision)||String(cw?.crashEpisodeId||'')!==crashes[i])return null;
      if(resetAt>0&&(Number(row?.openedAtMs||0)<resetAt||Number(row?.closedAtMs||0)<resetAt))return null;
      if(Number(expected?.openedAtMs||0)>0&&Number(row?.openedAtMs||0)!==Number(expected.openedAtMs))return null;
      if(Number(expected?.closedAtMs||0)>0&&Number(row?.closedAtMs||0)!==Number(expected.closedAtMs))return null;
      if(i>0&&Number(durable[i-1]?.closedAtMs||0)>Number(row?.openedAtMs||0))return null;
    }
    const ask=Number(q?.yesAsk||0),bid=Number(q?.yesBid||0);if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const envelope=hunterEntryEnvelope(s,'Athena Exclamation');if(!envelope||ask<Number(envelope.minEntryCents)||ask>Number(envelope.maxEntryCents))return null;
    const stakeCents=Number(s.athenaExclamationStakeCents||ATHENA_EXCLAMATION_DOCTRINE.defaultStakeCents);
    const economicTarget=executionAttackEconomicTarget('Athena Exclamation',{askCents:ask,stakeCents,settings:s});if(!economicTarget.targetFeasible)return null;
    const at=Math.max(1,Number(authorizedAtMs)||Date.now()),id=String(authorizationId||`MEGA-WAVE:ATHENA:${ids[0]}:${ids.at(-1)}`);
    const enabledSaintsAtEntry=MEGA_WAVE.downstreamSaints.filter(name=>isModelEnabled(s,name));
    const lineage={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,authority:ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority,authorizationId:id,parentConcept:String(parentEntry.conceptName||''),parentEntryId:String(parentEntry.id),ticker,requiredCrystalWallWins:required,requiredProofCount:required,proofEntryIds:[...ids],proofCrashEpisodeIds:[...crashes],finalProofEntryId:ids.at(-1),finalProofCrashEpisodeId:crashes.at(-1),firstProofEntryId:ids[0]||null,secondProofEntryId:ids[1]||null,thirdProofEntryId:ids[2]||null,firstProofCrashEpisodeId:crashes[0]||null,secondProofCrashEpisodeId:crashes[1]||null,thirdProofCrashEpisodeId:crashes[2]||null,crystalProof:structuredClone(crystalProof),thirdProof:structuredClone(crystalProof),authorizedAtMs:at,sameTicker:true,sameSide:true,normalStrategicDiscoveryBypassed:true,ordinaryClockBypassed:true,hardExecutionSafetyRequired:true,followUpAttacksAtEntry:Math.max(0,Math.min(12,Math.floor(Number(s.athenaExclamationFollowUpAttacks)||0))),enabledSaintsAtEntry};
    const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,authorityMode:ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority,authoritySource:'CONFIGURED_CONSECUTIVE_PROFITABLE_CRYSTAL_WALL_SHADOW_CLOSE',strategicSelectionBypassed:true,boltId:id,boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:at,expiresAtMs:at+5_000,ticker,eventTicker:String(q?.eventTicker||parentEntry?.eventTicker||ticker),side:'YES',selectedAttack:'Athena Exclamation',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Athena Exclamation']?.name||'Athena Exclamation',stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:Number(envelope.minEntryCents),operatorMaxEntryCents:Number(envelope.maxEntryCents),entryPriceCents:ask,authorizedMaxEntryCents:Number(envelope.maxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget,survivalCertificate:null,ranking:[{concept:'Athena Exclamation',displayName:'Athena Exclamation',score:100,authorityMode:ATHENA_EXCLAMATION_DOCTRINE.strategicEntryAuthority,targetFeasible:economicTarget.targetFeasible,requiredTargetBidCents:economicTarget.requiredTargetBidCents}],decisionEvidence:{megaWaveAuthorization:lineage,crystalProof:structuredClone(crystalProof),thirdProof:structuredClone(crystalProof),configuredTargetNetPerOriginalContractCents:economicTarget.netPerOriginalContractCents,normalStrategicDiscoveryBypassed:true,hardExecutionSafetyStillRequired:true}};
    const fireCommand=sealAthenaFireCommand(core);
    const snapshot={version:'MEGA-WAVE-ATHENA-Q1',policyRevision:MEGA_WAVE.policyRevision,megaWaveAuthorization:structuredClone(lineage),crystalProof:structuredClone(crystalProof),observedAtMs:Date.now()};
    return this.createHunter('Athena Exclamation',q,stakeCents,0,{sourceTradeId:id,entryQualificationSnapshot:snapshot,athenaFireCommand:fireCommand,megaWaveAuthorization:lineage,legacyCompatibility:false});
  }

  async executeScarletContinuation(q, parentEntry, { authorizationId, rootEntryId, repeatIndex=1, maxRepeats=1, authorizedAtMs=Date.now(), thirdProof=null } = {}) {
    const s=this.getSettings();
    if(s.scarletNeedleEnabled!==true)return null;
    const ticker=String(q?.ticker||''),parentTicker=String(parentEntry?.ticker||'');
    if(!ticker||ticker!==parentTicker)return null;
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall;
    if(String(parentEntry?.conceptName||'')!==String(SCARLET_NEEDLE.requiredParentConcept)||String(parentCrystalWall?.version||'')!==String(SCARLET_NEEDLE.requiredParentVersion))return null;
    if(String(parentCrystalWall?.policyRevision||'')!==String(SCARLET_NEEDLE.requiredParentPolicyRevision))return null;
    if(String(thirdProof?.version||'')!==String(SCARLET_NEEDLE.thirdProofVersion)||String(thirdProof?.policyRevision||'')!==String(SCARLET_NEEDLE.policyRevision))return null;
    if(String(thirdProof?.pairing||'')!==String(SCARLET_NEEDLE.proofPairing)||thirdProof?.lossResetsProof!==SCARLET_NEEDLE.shadowLossResetsProof)return null;
    const firstProofEntryId=String(thirdProof?.firstProofEntryId||''),secondProofEntryId=String(thirdProof?.secondProofEntryId||''),thirdProofEntryId=String(thirdProof?.thirdProofEntryId||'');
    const firstProofCrashEpisodeId=String(thirdProof?.firstProofCrashEpisodeId||''),secondProofCrashEpisodeId=String(thirdProof?.secondProofCrashEpisodeId||''),thirdProofCrashEpisodeId=String(thirdProof?.thirdProofCrashEpisodeId||'');
    const entryIds=[firstProofEntryId,secondProofEntryId,thirdProofEntryId],crashIds=[firstProofCrashEpisodeId,secondProofCrashEpisodeId,thirdProofCrashEpisodeId];
    if(entryIds.some(x=>!x)||new Set(entryIds).size!==3||thirdProofEntryId!==String(parentEntry?.id||''))return null;
    if(crashIds.some(x=>!x)||new Set(crashIds).size!==3||thirdProof?.independentCrashEpisodes!==true||thirdProof?.sameExactTicker!==true)return null;
    if(String(thirdProof?.ticker||'')!==ticker||Number(thirdProof?.secondProofClosedAtMs||0)>Number(parentEntry?.openedAtMs||0)||Number(thirdProof?.thirdProofClosedAtMs||0)!==Number(parentEntry?.closedAtMs||0))return null;
    const requiredProofs=Math.max(3,Number(SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs||3));
    if(Number(thirdProof?.proofStage||0)!==requiredProofs||Number(thirdProof?.consecutiveProfitCount||0)%requiredProofs!==0||Number(thirdProof?.proofGroupIndex||0)!==Math.ceil(Number(thirdProof?.consecutiveProfitCount||0)/requiredProofs))return null;
    // Defense in depth: immediately before constructing a real Scarlet FIRE,
    // re-read all three durable Crystal Wall proofs. The engine already formed
    // the triple from PostgreSQL history; execution independently proves that
    // every row still exists, is profitable, sequential and carries the exact
    // frozen R69.4 Crystal/Infinity provenance.
    if(typeof this.db?.entryById!=='function')return null;
    const [durableFirst,durableSecond,durableThird]=await Promise.all([this.db.entryById(firstProofEntryId).catch(()=>null),this.db.entryById(secondProofEntryId).catch(()=>null),this.db.entryById(thirdProofEntryId).catch(()=>null)]);
    const durableProofRowOk=(row,{id,crashEpisodeId,closedAtMs})=>{
      const cw=row?.entryConfig?.crystalWall||{};
      return String(row?.id||'')===String(id)&&String(row?.systemName||'')===String(s.systemName)&&String(row?.ownerId||'')===String(s.ownerId)&&String(row?.mode||'')===String(s.mode||'')&&String(row?.conceptName||'')===String(SCARLET_NEEDLE.requiredParentConcept)&&String(row?.ticker||'')===ticker&&String(row?.status||'')==='closed'&&Number(row?.remainingCount||0)<=1e-9&&String(row?.closeReason||'')===String(CRYSTAL_WALL.profitableCloseReason)&&Number(row?.pnlCents||0)>0&&String(cw?.version||'')===String(SCARLET_NEEDLE.requiredParentVersion)&&String(cw?.policyRevision||'')===String(SCARLET_NEEDLE.requiredParentPolicyRevision)&&String(cw?.crashEpisodeId||'')===String(crashEpisodeId)&&String(row?.entryConfig?.virtualInfinity?.version||'')===String(INFINITY_BREAK.version)&&Number(row?.closedAtMs||0)===Number(closedAtMs||0);
    };
    if(!durableProofRowOk(durableFirst,{id:firstProofEntryId,crashEpisodeId:firstProofCrashEpisodeId,closedAtMs:thirdProof.firstProofClosedAtMs}))return null;
    if(!durableProofRowOk(durableSecond,{id:secondProofEntryId,crashEpisodeId:secondProofCrashEpisodeId,closedAtMs:thirdProof.secondProofClosedAtMs}))return null;
    if(!durableProofRowOk(durableThird,{id:thirdProofEntryId,crashEpisodeId:thirdProofCrashEpisodeId,closedAtMs:thirdProof.thirdProofClosedAtMs}))return null;
    if(Number(durableFirst.closedAtMs||0)>Number(durableSecond.openedAtMs||0)||Number(durableSecond.closedAtMs||0)>Number(durableThird.openedAtMs||0))return null;
    if(parentEntry?.status!=='closed'||Number(parentEntry?.remainingCount||0)>1e-9||String(parentEntry?.closeReason||'')!==String(CRYSTAL_WALL.profitableCloseReason)||!(Number(parentEntry?.pnlCents||0)>0))return null;
    if(String(parentEntry?.entryConfig?.virtualInfinity?.version||'')!==String(INFINITY_BREAK.version))return null;
    const parentSide=String(parentEntry?.side||parentEntry?.entryConfig?.side||'YES').toUpperCase();
    if(parentSide!=='YES')return null;
    const ask=Math.max(0,Number(q?.yesAsk||0)),bid=Math.max(0,Number(q?.yesBid||0));
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const envelope=hunterEntryEnvelope(s,'Scarlet Needle')||{minEntryCents:Number(s.scarletNeedleMinEntryCents),maxEntryCents:Number(s.scarletNeedleMaxEntryCents)};
    const minEntryCents=Number(envelope.minEntryCents),maxEntryCents=Number(envelope.maxEntryCents),stakeCents=Number(s.scarletNeedleStakeCents);
    const target=scarletContinuationEconomicTarget({askCents:ask,stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    const authorizedMaxEntryCents=scarletContinuationAuthorizedMaxEntryCents({handoffAskCents:ask,stakeCents,minEntryCents,maxEntryCents,settings:s});
    if(!(authorizedMaxEntryCents>=ask))return null;
    const at=Math.max(1,Number(authorizedAtMs)||Date.now());
    const id=String(authorizationId||`SCARLET-THIRD-PROOF:${firstProofEntryId}:${parentEntry.id}`);
    const lineage={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,authority:SCARLET_NEEDLE.strategicEntryAuthority,authorizationId:id,rootEntryId:String(rootEntryId||firstProofEntryId),parentEntryId:String(parentEntry.id),parentConcept:String(parentEntry.conceptName||''),parentCrystalWallVersion:String(parentCrystalWall.version||''),parentCrystalWallPolicyRevision:String(parentCrystalWall.policyRevision||''),parentCrashEpisodeId:String(parentCrystalWall.crashEpisodeId||''),firstProofEntryId,firstProofCrashEpisodeId,secondProofEntryId,secondProofCrashEpisodeId,thirdProof:structuredClone(thirdProof),repeatIndex:1,maxRepeatsAtEntry:1,parentClosedAtMs:Number(parentEntry.closedAtMs||0),parentExitPriceCents:Number(parentEntry.exitPriceCents||0),parentRealizedPnlCents:Number(parentEntry.pnlCents||0),authorizedAtMs:at,sameTicker:true,sameSide:true,ordinaryCooldownBypassed:true,ordinaryGameClockBypassed:true,athenaApprovalRequired:false,athenaSoulVetoApplied:false,fullConfiguredSizeRequired:true,fullExecutionSafetyRequired:true,profitTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,authorizedMaxEntryCents,authorizationPricePolicy:'OPERATOR_BAND_CAPPED_BY_TARGET_FEASIBILITY'};
    const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority,authoritySource:'THIRD_CONSECUTIVE_PROFITABLE_CRYSTAL_WALL_SHADOW_CLOSE',strategicSelectionBypassed:true,boltId:id,boltFingerprint:null,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:at,expiresAtMs:at+5_000,ticker,eventTicker:String(q?.eventTicker||parentEntry?.eventTicker||ticker),side:'YES',selectedAttack:'Scarlet Needle',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Scarlet Needle']?.name||'Scarlet Needle',stakeCents,fieldBudgetCents:null,maxRays:null,operatorMinEntryCents:minEntryCents,operatorMaxEntryCents:maxEntryCents,entryPriceCents:ask,authorizedMaxEntryCents,maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,survivalCertificate:null,ranking:[{concept:'Scarlet Needle',displayName:EXECUTION_ATTACK_DISPLAY['Scarlet Needle']?.name||'Scarlet Needle',score:100,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority,targetFeasible:target.targetFeasible,requiredTargetBidCents:target.requiredTargetBidCents}],decisionEvidence:{scarletContinuation:lineage,thirdProof:structuredClone(thirdProof),parentClose:{entryId:String(parentEntry.id),concept:String(parentEntry.conceptName||''),closeReason:String(parentEntry.closeReason||''),realizedPnlCents:Number(parentEntry.pnlCents||0),exitPriceCents:Number(parentEntry.exitPriceCents||0),closedAtMs:Number(parentEntry.closedAtMs||0)},configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,athenaApprovalRequired:false,predictiveReVetoAllowed:false,normalStrategicDiscoveryBypassed:true,hardExecutionSafetyStillRequired:true}};
    const fireCommand=sealAthenaFireCommand(core);
    const decision={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,decision:'FIRE',reason:'third_crystal_wall_shadow_win_authorized_scarlet_continuation',decidedAtMs:at,boltId:id,ticker,ranking:core.ranking,selectedAttack:'Scarlet Needle',selectedAttackDisplay:core.selectedAttackDisplay,fireCommand,economicObjective:'THIRD_CONSECUTIVE_CRYSTAL_WALL_PROOF_CONTINUATION',configuredTargetNetPerOriginalContractCents:target.netPerOriginalContractCents,strategicAuthority:false,athenaApprovalRequired:false,scarletNeedleContinuationAuthority:true,durableFireRequired:true,durableFirePersisted:true};
    const bolt={id,ticker,eventTicker:core.eventTicker,side:'YES',sport:String(parentEntry?.sport||'Unknown'),detectedAtMs:at,expiresAtMs:core.expiresAtMs,fingerprint:null,features:{bidCents:bid,askCents:ask,sport:String(parentEntry?.sport||'Unknown'),eligibleAttacks:core.ranking},greenTrigger:null,preBoltClearance:null,authorityMode:SCARLET_NEEDLE.strategicEntryAuthority};
    return this.executeAthenaFire(q,bolt,decision,{cosmos:[],scarletContinuation:lineage});
  }
  async executeCrystalWallAttack(q, watch = {}) {
    return null;
    const s=this.getSettings();
    if(s.recoveryHunterEnabled!==true)return null;
    const ticker=String(q?.ticker||''),crashEpisodeId=String(watch?.crashEpisodeId||'');
    const authorizationId=String(watch?.authorizationId||`CRYSTAL-WALL-V3:${crashEpisodeId}`);
    if(!ticker||!crashEpisodeId||!authorizationId)return null;
    if(String(watch?.ticker||ticker)!==ticker)return null;
    const signal=crystalWallSignalState(watch,q,s,Date.now());
    if(!signal.qualified)return null;
    const evidenceAsk=Number(signal.askCents||q?.yesAsk||0),evidenceBid=Number(signal.bidCents||q?.yesBid||0);
    if(!(evidenceAsk>0)||!(evidenceBid>0)||evidenceBid>evidenceAsk)return null;
    const stakeCents=Math.max(1,Number(s.recoveryStakeCents??CRYSTAL_WALL.defaultStakeCents));
    const initialRequested=Math.max(1,Math.floor(stakeCents/evidenceAsk));
    const plan=await this.prepareEntryExecution(q,initialRequested,{limitCents:Number(s.recoveryMaxEntryCents),stakeCents,recomputeRequestedFromFreshAsk:true});
    if(!plan||plan.count!==plan.requestedCount)return null;
    const freshQ={...(q||{}),...(plan.freshMarket||{}),ticker,eventTicker:String(plan.freshMarket?.eventTicker||q?.eventTicker||watch?.eventTicker||ticker),yesAsk:Number(plan.freshAskCents||plan.bestAskCents||0),yesBid:Number(plan.freshMarket?.yesBid||q?.yesBid||0)};
    const freshSignal=crystalWallSignalState({...watch,...signal},freshQ,s,Date.now());
    if(!freshSignal.qualified)return null;
    if(Number(freshQ.yesAsk)!==Number(plan.executionLimitCents)||Number(plan.averagePriceCents)!==Number(plan.executionLimitCents))return null;
    const target=crystalWallEconomicTarget({askCents:Number(plan.averagePriceCents),stakeCents,settings:s});
    if(!target.targetFeasible)return null;
    if(typeof this.db?.entryByConceptSourceTradeId==='function'){
      const existing=await this.db.entryByConceptSourceTradeId(s.systemName,CRYSTAL_WALL.shadowConceptName,crashEpisodeId).catch(()=>null);
      if(existing)return null;
    }
    const count=Math.max(1,Number(plan.count||0));
    const entryPriceCents=Math.round(Number(plan.averagePriceCents));
    const entryFeeCents=String(s.mode||'SIMULATION').toUpperCase()==='LIVE'
      ? kalshiGeneralTakerFeeEstimateCents({count,priceCents:entryPriceCents})
      : Math.max(0,Number(s.simFeeCents||0))*count;
    const now=Date.now();
    const qualifiedClock=snapshotEventClockMinutes(this.eventClockRecord(freshQ.eventTicker), now, freshQ);
    const aurora=calculateAuroraSnapshotFromFeeModel({entryPriceCents,count,entryFeeCents,mode:s.mode,simFeeCents:Number(s.simFeeCents||0),damageControlPercent:Number(s.auroraDamageControlPercent??AURORA_EXECUTION.defaultDamageControlPercent),calculatedAtMs:now});
    if(!aurora?.ok)return null;
    const lineage={
      version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authority:CRYSTAL_WALL.strategicEntryAuthority,
      authorizationId,crashEpisodeId,ticker,eventTicker:freshQ.eventTicker,sourceKind:String(watch?.sourceKind||'TRACKED_MARKET'),coexistingEntryIds:[...(watch?.coexistingEntryIds||[])].map(String),
      crashStartedAtMs:Number(watch?.crashStartedAtMs||0),preCrashPeakCents:Number(watch?.preCrashPeakCents||0),troughCents:Number(freshSignal.troughCents||0),troughAtMs:Number(freshSignal.troughAtMs||0),crashDepthCents:Number(freshSignal.crashDepthCents||0),
      reboundCents:Number(freshSignal.reboundCents||0),proofStage:Number(watch?.proofStage||freshSignal.proofStage||1),requiredProofCount:Number(watch?.requiredProofCount||crystalWallRequiredProofCount(s)),
      configuredMinCrashCents:Number(freshSignal.minCrashCents||CRYSTAL_WALL.defaultMinCrashCents),configuredMinReboundCents:Number(freshSignal.minReboundCents||CRYSTAL_WALL.defaultMinReboundCents),configuredMinUpwardTicks:Number(freshSignal.minUpwardTicks||CRYSTAL_WALL.defaultMinUpwardTicks),
      minCrashCents:Number(freshSignal.minCrashCents||CRYSTAL_WALL.defaultMinCrashCents),minReboundCents:Number(freshSignal.minReboundCents||CRYSTAL_WALL.defaultMinReboundCents),upwardTicks:Number(freshSignal.upwardTicks||0),minUpwardTicks:Number(freshSignal.minUpwardTicks||CRYSTAL_WALL.defaultMinUpwardTicks),
      proofClock:{opened:structuredClone(watch?.proofClockOpened||null),qualified:qualifiedClock},
      openedGameMinutes:Number(watch?.proofClockOpened?.elapsedMinutes),qualifiedGameMinutes:qualifiedClock.elapsedMinutes,
      authorizedAtMs:Number(watch?.authorizedAtMs||now),firedAtMs:now,sameTicker:true,sameSide:true,fixedStakeCents:stakeCents,stakeMultiplier:1,stakeMultiplierAllowed:false,fullConfiguredSizeRequired:true,oneEntryPerCrashEpisode:true,ordinaryGameClockBypassed:true,ordinaryCooldownBypassed:true,ordinaryEventEntryCapBypassed:true,fullExecutionSafetyRequired:true,reboundOrigin:CRYSTAL_WALL.reboundOrigin,reboundPrice:CRYSTAL_WALL.reboundPrice,
    };
    const command=sealCrystalWallFireCommand({version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authorityMode:CRYSTAL_WALL.strategicEntryAuthority,authoritySource:'CI1_CRASH_EPISODE',authorizationId,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:now,expiresAtMs:now+5_000,ticker,eventTicker:lineage.eventTicker,side:'YES',selectedAttack:CRYSTAL_WALL.shadowConceptName,selectedAttackDisplay:CRYSTAL_WALL.displayName,stakeCents,operatorMinEntryCents:Number(s.recoveryMinEntryCents),operatorMaxEntryCents:Number(s.recoveryMaxEntryCents),entryPriceCents:entryPriceCents,authorizedMaxEntryCents:Number(s.recoveryMaxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:target,decisionEvidence:{crystalWall:lineage}});
    const e={
      id:nowId(),systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,sourceFeeder:null,sourceTradeId:crashEpisodeId,ticker,eventTicker:lineage.eventTicker,marketTitle:freshQ.title||q?.title||ticker,watchdogModel:WATCHDOG_MODEL,mode:s.mode,status:'open',
      entryPriceCents,exitPriceCents:null,currentPriceCents:entryPriceCents,peakPriceCents:entryPriceCents,stopPriceCents:Number(aurora.dangerPriceCents),stopLossCents:Number(aurora.stopDistanceCents),count,remainingCount:count,volume24h:Number(freshQ.volume24h||0),spreadAtEntryCents:Number(freshQ.yesAsk)-Number(freshQ.yesBid),pnlCents:0,entryFeeCents,exitFeeCents:0,exitFilledCount:0,exitNotionalCents:0,exitAttemptBookMs:0,gameStartTimeMs:Number(freshQ.gameStartTimeMs)||null,openedAtMs:now,updatedAtMs:now,lowestPriceAfterEntryCents:entryPriceCents,maeCents:0,maeAtMs:null,researchTrackingComplete:false,
      entryConfig:{release:RELEASE,conceptName:CRYSTAL_WALL.shadowConceptName,crystalWall:lineage,crystalWallFire:command,economicTarget:target,shadowAttack:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,brokerOrderAuthority:false,portfolioCapitalAuthority:false,simulationPortfolioCapitalAuthority:false,configuredVirtualStakeCents:stakeCents,fullExecutableDepthRequired:true,maxSpreadCents:Number(s.maxSpreadCents??3)},simFeeCents:Math.max(0,Number(s.simFeeCents||0)),virtualInfinity:{version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,minimumNetPerOriginalContractCents:Number(s.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents),requiredFreshConfirmations:Math.max(1,Math.floor(Number(s.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations))),maximumBookAgeMs:Math.max(100,Number(s.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs)),confirmationWindowMs:Math.max(250,Math.floor(Number(s.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs))),fullPositionOnly:true},aurora:structuredClone(aurora),profitAuthority:INFINITY_BREAK.version,profitAuthorityRevision:INFINITY_BREAK.policyRevision,lossAuthority:AURORA_EXECUTION.lossAuthority},
      feederState:{phase:'CRYSTAL_WALL_SHADOW',crashEpisodeId},
    };
    const simulationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    let releaseSimulationMutation=null;
    if(s.mode==='SIMULATION'&&this.enterSimulationMutation){releaseSimulationMutation=this.enterSimulationMutation(simulationToken);if(!releaseSimulationMutation)return null;}
    try{await this.db.insertEntry(e);}finally{try{releaseSimulationMutation?.();}catch{}}
    try{this.onShadowAttackOpened?.(e);}catch{}
    await this.stampCrystalWallEventClock(e, freshQ, now).catch(()=>{});
    await this.audit('crystal_wall_shadow_opened',{id:e.id,authorizationId,crashEpisodeId,ticker:e.ticker,entryPriceCents:e.entryPriceCents,count:e.count,virtualStakeCents:stakeCents,brokerOrderAuthority:false,simulationPortfolioCapitalAuthority:false,dangerPriceCents:e.stopPriceCents});
    return e;
  }

  async closeCrystalWallShadow(entry,{exitPriceCents,exitAverageCents=null,exitFeeCents=0,pnlCents=0,closeReason,bookMs=0,closedAtMs=Date.now(),peakPriceCents=null,lowestPriceAfterEntryCents=null,maeCents=null,maeAtMs=null}={}){
    const s=this.getSettings();
    if(!entry?.id||entry.conceptName!==CRYSTAL_WALL.shadowConceptName||!openLike(entry.status))return null;
    if(String(entry.systemName||'')!==String(s.systemName||'')||String(entry.ownerId||'')!==String(s.ownerId||'')||String(entry.mode||'')!==String(s.mode||''))return null;
    const at=Number(closedAtMs)||Date.now(),exit=Math.round(Number(exitPriceCents));
    if(!(exit>=0&&exit<=100)||!String(closeReason||''))return null;
    const remaining=Number(entry.remainingCount??entry.count??0);
    const closedClock=snapshotEventClockMinutes(this.eventClockRecord(entry.eventTicker||entry.ticker), at, {gameStartTimeMs:entry.gameStartTimeMs});
    const priorCw=entry.entryConfig?.crystalWall&&typeof entry.entryConfig.crystalWall==='object'?entry.entryConfig.crystalWall:{};
    const crystalWall={...priorCw,proofClock:{...(priorCw.proofClock||{}),closed:closedClock},closedGameMinutes:closedClock.elapsedMinutes};
    const patch={status:'closed',exitPriceCents:exit,currentPriceCents:exit,remainingCount:0,pnlCents:Number(pnlCents||0),exitFeeCents:Number(exitFeeCents||0),exitFilledCount:remaining,exitNotionalCents:Number(exitAverageCents??exit)*remaining,exitAttemptBookMs:Number(bookMs||0),closeReason:String(closeReason),closedAtMs:at,updatedAtMs:at,peakPriceCents:Math.max(Number(entry.peakPriceCents||entry.entryPriceCents||0),Number(peakPriceCents||0)),lowestPriceAfterEntryCents:Number.isFinite(Number(lowestPriceAfterEntryCents))?Number(lowestPriceAfterEntryCents):entry.lowestPriceAfterEntryCents,maeCents:Number.isFinite(Number(maeCents))?Number(maeCents):Number(entry.maeCents||0),maeAtMs:maeAtMs??entry.maeAtMs,entryConfig:{...(entry.entryConfig||{}),crystalWall}};
    const simulationToken=s.mode==='SIMULATION'?this.captureSimulationMutationToken?.():null;
    let releaseSimulationMutation=null;
    if(s.mode==='SIMULATION'&&this.enterSimulationMutation){releaseSimulationMutation=this.enterSimulationMutation(simulationToken);if(!releaseSimulationMutation)return null;}
    try{await this.db.updateEntry(entry.id,patch);}finally{try{releaseSimulationMutation?.();}catch{}}
    const closed={...entry,...patch};
    try{this.onShadowAttackClosed?.(closed);}catch{}
    await this.audit('crystal_wall_shadow_closed',{id:closed.id,crashEpisodeId:closed.sourceTradeId,ticker:closed.ticker,closeReason:closed.closeReason,exitPriceCents:closed.exitPriceCents,pnlCents:closed.pnlCents});
    return closed;
  }

  // Compatibility surface only: V3 cannot be armed by a closed parent trade.
  async executeCrystalWallContinuation() { return null; }

  async executeJusticeArrowAttack(q, watch = {}) {
    const s=this.getSettings();
    if(s.justiceArrowEnabled!==true)return null;
    const ticker=String(q?.ticker||''),parentScarletEntryId=String(watch?.parentScarletEntryId||''),observationId=String(watch?.observationId||'');
    const authorizationId=String(watch?.authorizationId||`JUSTICE-ARROW-V3:SCARLET:${parentScarletEntryId}`);
    if(!ticker||!observationId||!authorizationId||!parentScarletEntryId)return null;
    if(String(watch?.ticker||ticker)!==ticker||watch?.postScarletContinuation!==true||watch?.directPostScarletObservation!==true)return null;
    if(typeof this.db?.entryById!=='function')return null;
    const parentScarlet=await this.db.entryById(parentScarletEntryId).catch(()=>null),parentLineage=parentScarlet?.entryConfig?.scarletContinuation||{};
    if(String(parentScarlet?.systemName||'')!==String(s.systemName)||String(parentScarlet?.ownerId||'')!==String(s.ownerId)||String(parentScarlet?.mode||'')!==String(s.mode||''))return null;
    if(String(parentScarlet?.conceptName||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept)||String(parentScarlet?.ticker||'')!==ticker)return null;
    if(String(parentScarlet?.status||'')!=='closed'||Number(parentScarlet?.remainingCount||0)>1e-9||!(Number(parentScarlet?.pnlCents||0)>0)||String(parentScarlet?.closeReason||'')!=='infinity_break')return null;
    if(String(parentLineage?.version||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentVersion)||String(parentLineage?.policyRevision||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentPolicyRevision))return null;
    if(String(parentScarlet?.entryConfig?.profitAuthority||'')!==String(INFINITY_BREAK.version))return null;
    const parentClosedAtMs=Number(parentScarlet?.closedAtMs||0),observationStartedAtMs=Number(watch?.observationStartedAtMs||0),crashStartedAtMs=Number(watch?.crashStartedAtMs||0);
    if(!(parentClosedAtMs>0)||observationStartedAtMs+1e-9<parentClosedAtMs||watch?.ownCrashArmed!==true||crashStartedAtMs+1e-9<observationStartedAtMs)return null;
    const signal=justiceArrowSignalState(watch,q,s,Date.now());if(!signal.qualified)return null;
    const ask=Number(signal.askCents||q?.yesAsk||0),bid=Number(signal.bidCents||q?.yesBid||0);if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const stakeCents=Number(s.justiceArrowStakeCents??SAGITTARIUS_JUSTICE_ARROW.defaultStakeCents);if(!(stakeCents>0))return null;
    const target=justiceArrowEconomicTarget({askCents:ask,stakeCents,settings:s});if(!target.targetFeasible)return null;
    const decidedAt=Date.now();
    const lineage={
      version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authority:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,
      authorizationId,observationId,ticker,eventTicker:String(q?.eventTicker||watch?.eventTicker||ticker),postScarletContinuation:true,directPostScarletObservation:true,
      parentScarletEntryId,parentScarletConcept:String(parentScarlet.conceptName||''),parentScarletVersion:String(parentLineage.version||''),parentScarletPolicyRevision:String(parentLineage.policyRevision||''),parentScarletAuthorizationId:String(parentLineage.authorizationId||''),parentScarletClosedAtMs:parentClosedAtMs,parentScarletExitPriceCents:Number(parentScarlet.exitPriceCents||0),parentScarletRealizedPnlCents:Number(parentScarlet.pnlCents||0),
      sourceKind:'POST_SCARLET_NEEDLE',coexistingEntryIds:[...(watch?.coexistingEntryIds||[])].map(String),observationStartedAtMs,
      crashStartedAtMs:Number(signal.crashStartedAtMs||watch?.crashStartedAtMs||0),ownCrashArmed:signal.ownCrashArmed===true,preCrashPeakCents:Number(signal.preCrashPeakCents||watch?.preCrashPeakCents||0),
      troughCents:Number(signal.troughCents||0),troughAtMs:Number(signal.troughAtMs||0),crashDepthCents:Number(signal.crashDepthCents||0),reboundCents:Number(signal.reboundCents||0),
      minCrashCents:Number(signal.minCrashCents||SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents),minReboundCents:Number(signal.minReboundCents||SAGITTARIUS_JUSTICE_ARROW.defaultMinReboundCents),upwardTicks:Number(signal.upwardTicks||0),minUpwardTicks:Number(signal.minUpwardTicks||SAGITTARIUS_JUSTICE_ARROW.defaultMinUpwardTicks),
      authorizedAtMs:Number(watch?.authorizedAtMs||decidedAt),firedAtMs:decidedAt,sameTicker:true,sameSide:true,fixedStakeCents:stakeCents,stakeMultiplier:1,stakeMultiplierAllowed:false,
      fullConfiguredSizeRequired:true,oneEntryPerCrashEpisode:false,oneEntryPerParentScarlet:true,ordinaryGameClockBypassed:true,ordinaryCooldownBypassed:true,ordinaryEventEntryCapBypassed:true,fullExecutionSafetyRequired:true,
      observationOrigin:SAGITTARIUS_JUSTICE_ARROW.observationOrigin,reboundOrigin:SAGITTARIUS_JUSTICE_ARROW.reboundOrigin,reboundPrice:SAGITTARIUS_JUSTICE_ARROW.reboundPrice,profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,lossAuthority:AURORA_EXECUTION.lossAuthority,
    };
    const command=sealJusticeArrowFireCommand({
      version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authorityMode:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,
      authoritySource:'POST_PROFITABLE_SCARLET_NEEDLE_CLOSE_DIRECT_OWN_CONFIRMATION',authorizationId,systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:decidedAt,expiresAtMs:decidedAt+5_000,
      ticker,eventTicker:lineage.eventTicker,side:'YES',selectedAttack:'Sagittarius Justice Arrow',selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Sagittarius Justice Arrow']?.name||'Sagittarius Justice Arrow',
      stakeCents,operatorMinEntryCents:Number(s.justiceArrowMinEntryCents),operatorMaxEntryCents:Number(s.justiceArrowMaxEntryCents),entryPriceCents:ask,authorizedMaxEntryCents:Number(s.justiceArrowMaxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),auroraDamageControlPercent:Number(s.auroraDamageControlPercent??45),
      profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,infinityBreakPolicyVersion:null,economicTarget:target,decisionEvidence:{justiceArrow:lineage},
    });
    const qualification={version:'SAGITTARIUS-JUSTICE-ARROW-V3-Q2',policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,justiceArrow:lineage,observedAtMs:decidedAt};
    return this.createHunter('Sagittarius Justice Arrow',q,stakeCents,0,{sourceTradeId:observationId,justiceArrowSourceSnapshot:lineage,entryQualificationSnapshot:qualification,justiceArrowFireCommand:command,legacyCompatibility:false});
  }

  // SJA3 continuation is orchestrated by Engine after a durable profitable
  // Scarlet close and uses only Justice Arrow's own direct confirmation watch.
  async executeJusticeArrowContinuation(q, watch = {}) { return this.executeJusticeArrowAttack(q, watch); }

  async executeLightningPlasmaContinuation(q, parentShadow, { authorizationId, authorizedAtMs=Date.now(), recoveryContext=null } = {}) {
    const s=this.getSettings();
    if(s.lightningPlasmaEnabled!==true||s.geminiEnabled!==true)return null;
    if(parentShadow?.conceptName!=='Another Dimension'||parentShadow?.status!=='closed'||Number(parentShadow?.remainingCount||0)>1e-9)return null;
    if(String(parentShadow?.closeReason||'')!==ANOTHER_DIMENSION.lossCloseReason)return null;
    if(String(parentShadow?.conceptName||'')==='Lightning Plasma')return null;
    const ticker=String(q?.ticker||''),parentTicker=String(parentShadow?.ticker||'');
    if(!ticker||ticker!==parentTicker)return null;
    const parentSide=String(parentShadow?.side||parentShadow?.entryConfig?.side||'YES').toUpperCase();
    if(parentSide!=='YES')return null;
    const ask=Math.max(0,Number(q?.yesAsk||0)),bid=Math.max(0,Number(q?.yesBid||0));
    if(!(ask>0)||!(bid>0)||bid>ask)return null;
    const signal=plasmaSignalState(parentShadow,q,null,s,Number(recoveryContext?.troughCents||parentShadow.exitPriceCents||0));
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
    return this.executeAthenaFire(q,bolt,decision,{cosmos:[],lightningPlasmaContinuation:lineage,anotherDimensionEntry:parentShadow,recoveryContext:core.decisionEvidence.recoveryContext});
  }

  async executeBoltDirectFire(q, bolt, concept, context = {}) {
    const s = this.getSettings();
    this.lastAthenaFireAbort=null;
    const name=String(concept||'');
    const card=boltDirectAttackCard(name,q,s,context.crashState||context.crashSignal||null);
    if(!card.ok){this.lastAthenaFireAbort=card.reason;await this.audit('bolt_direct_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept:name,reason:card.reason,stage:'attack_card'});return null;}
    const family=executionMarketFamilyExclusion(q?.ticker,s);
    if(family.blocked){this.lastAthenaFireAbort=MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode;await this.audit('bolt_direct_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept:name,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,stage:'market_family'});return null;}
    const stakeCents=attackConfiguredStakeCents(s,name);
    if(!(stakeCents>0)){this.lastAthenaFireAbort='bolt_direct_stake_invalid';return null;}
    const envelope=hunterEntryEnvelope(s,name);
    const now=Date.now();
    const economicTarget=executionAttackEconomicTarget(name,{askCents:Number(q?.yesAsk||0),stakeCents,settings:s});
    const core={
      version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
      authoritySource:'ATOMIC_THUNDER_BOLT',strategicSelectionBypassed:false,boltId:String(bolt?.id||''),boltFingerprint:bolt?.fingerprint||null,
      systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:now,expiresAtMs:now+Number(BOLT_DIRECT.maximumOpportunityAgeMs||5000),
      ticker:String(q?.ticker||''),eventTicker:String(q?.eventTicker||q?.ticker||''),side:'YES',selectedAttack:name,
      selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY[name]?.name||name,stakeCents,
      operatorMinEntryCents:Number(envelope.minEntryCents),operatorMaxEntryCents:Number(envelope.maxEntryCents),
      entryPriceCents:Number(q?.yesAsk||0),authorizedMaxEntryCents:Number(envelope.maxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),
      economicTarget,ranking:[{concept:name,displayName:name,score:100,authorityMode:BOLT_DIRECT.strategicEntryAuthority}],
      decisionEvidence:{greenTrigger:structuredClone(bolt?.greenTrigger||null),crashState:structuredClone(context.crashState||null),galacticExplosionEnabled:s.galacticExplosionEnabled===true},
    };
    const command=sealAthenaFireCommand(core);
    const pre=validateBoltDirectFireCommand(command,{concept:name,q,settings:s,now:Date.now()});
    if(!pre.ok){this.lastAthenaFireAbort=pre.reason;await this.audit('bolt_direct_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept:name,reason:pre.reason,stage:'pre_execution'});return null;}
    const cosmos=Array.isArray(context.cosmos)?context.cosmos:[];
    const triggerShadowId=String(bolt?.greenTrigger?.shadowTradeId||'');
    const source=cosmos.find(x=>String(x?.id||'')===triggerShadowId)||cosmos.slice().sort((a,b)=>Number(b?.openedAtMs||0)-Number(a?.openedAtMs||0))[0]||null;
    const snapshot={version:'BOLT-DIRECT-Q1',policyRevision:BOLT_DIRECT.policyRevision,boltId:bolt?.id||command.boltId,commandHash:command.commandHash,selectedAttack:name,card,observedAtMs:Date.now()};
    const e=await this.createHunter(name,q,stakeCents,0,{
      sourceFeeder:source?.conceptName||null,sourceTradeId:source?.id||null,sourceEntryConfig:source?.entryConfig||null,
      crashSourceSnapshot:context.crashSignal?structuredClone(context.crashSignal):null,entryQualificationSnapshot:snapshot,
      athenaFireCommand:command,boltDirectAuthorization:{version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,boltId:String(bolt?.id||''),ticker:String(q?.ticker||''),selectedAttack:name},
      legacyCompatibility:false,
    });
    if(e&&source?.id&&ACTIVE_FEEDER_CONCEPTS.has(String(source.conceptName||''))&&typeof this.db?.updateEntry==='function'){
      const durable=typeof this.db?.entryById==='function'?await this.db.entryById(source.id).catch(()=>null):null;
      const feederState={...(durable?.feederState||source.feederState||{}),shadowTradeVersion:'COSMO-SHADOW-V1',atomicThunderBoltId:String(bolt?.id||''),atomicThunderBoltAtMs:Number(bolt?.detectedAtMs||now),athenaSelectedAttack:name,realEntryId:e.id,realEntryAtMs:Number(e.openedAtMs||now)};
      await this.db.updateEntry(source.id,{feederState,updatedAtMs:Date.now()}).catch(()=>{});
    }
    return e;
  }


  async executeCrystalWallFollowUp(q, parent, authorization, crashState = {}) {
    const s = this.getSettings();
    this.lastAthenaFireAbort=null;
    if(!isModelEnabled(s,'Recovery Hunter')){this.lastAthenaFireAbort='model_disabled';return null;}
    if(String(parent?.closeReason||'')!=='infinity_break' || !(Number(parent?.pnlCents||0)>0)){this.lastAthenaFireAbort='parent_not_profitable_infinity_close';return null;}
    if(String(parent?.conceptName||'')==='Recovery Hunter'){this.lastAthenaFireAbort='self_chain_forbidden';return null;}
    if(String(q?.ticker||'')!==String(parent?.ticker||'')){this.lastAthenaFireAbort='ticker_mismatch';return null;}
    const card=crystalWallFollowUpCard(q,s,crashState);
    if(!card.ok){this.lastAthenaFireAbort=card.reason;await this.audit('crystal_wall_follow_aborted',{parentEntryId:parent?.id||null,ticker:q?.ticker||null,reason:card.reason});return null;}
    const stakeCents=attackConfiguredStakeCents(s,'Recovery Hunter');
    if(!(stakeCents>0)){this.lastAthenaFireAbort='crystal_wall_follow_stake_invalid';return null;}
    const envelope=hunterEntryEnvelope(s,'Recovery Hunter');
    const now=Date.now();
    const economicTarget=executionAttackEconomicTarget('Recovery Hunter',{askCents:Number(q?.yesAsk||0),stakeCents,settings:s});
    const core={
      version:CRYSTAL_WALL.followVersion,policyRevision:CRYSTAL_WALL.policyRevision,authorityMode:CRYSTAL_WALL.followAuthority,
      authoritySource:'PARENT_INFINITY_WIN',strategicSelectionBypassed:false,boltId:String(authorization?.grantId||parent?.id||''),
      systemName:s.systemName,sourceRelease:RELEASE,decidedAtMs:now,expiresAtMs:now+60_000,
      ticker:String(q?.ticker||''),eventTicker:String(q?.eventTicker||q?.ticker||''),side:'YES',selectedAttack:'Recovery Hunter',
      selectedAttackDisplay:EXECUTION_ATTACK_DISPLAY['Recovery Hunter']?.name||'Crystal Wall',stakeCents,
      operatorMinEntryCents:Number(envelope.minEntryCents),operatorMaxEntryCents:Number(envelope.maxEntryCents),
      entryPriceCents:Number(q?.yesAsk||0),authorizedMaxEntryCents:Number(envelope.maxEntryCents),maxSpreadCents:Number(s.maxSpreadCents??3),
      economicTarget,ranking:[{concept:'Recovery Hunter',displayName:'Crystal Wall',score:100,authorityMode:CRYSTAL_WALL.followAuthority}],
      decisionEvidence:{crystalWallFollow:{parentEntryId:String(parent.id),parentConcept:String(parent.conceptName||''),parentCloseReason:'infinity_break',parentPnlCents:Number(parent.pnlCents||0)},crashState:structuredClone(crashState||{})},
    };
    const command=sealAthenaFireCommand(core);
    const snapshot={version:'CW4-FOLLOW-Q1',crystalWallFollow:true,parentEntryId:String(parent.id),grantId:authorization?.grantId||null,card,crashState:structuredClone(crashState||{}),observedAtMs:now};
    return this.createHunter('Recovery Hunter',q,stakeCents,0,{
      sourceTradeId:String(parent.id),sourceEntryConfig:parent.entryConfig||null,
      entryQualificationSnapshot:snapshot,athenaFireCommand:command,
      crystalWallFollowAuthorization:{version:CRYSTAL_WALL.followVersion,policyRevision:CRYSTAL_WALL.policyRevision,authorityMode:CRYSTAL_WALL.followAuthority,parentEntryId:String(parent.id),ticker:String(q.ticker||''),grantId:authorization?.grantId||null},
      legacyCompatibility:false,
    });
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
        await this.audit('athena_fire_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept,reason:'three_saints_candidate_missing_or_expired',stage:'structural_eligibility',saintCount,eventId:candidate?.id||null});
        return null;
      }
    }
    const scarletContinuation=concept==='Scarlet Needle'?structuredClone(context?.scarletContinuation||command?.decisionEvidence?.scarletContinuation||null):null;
    const lightningPlasmaContinuation=concept==='Lightning Plasma'?structuredClone(context?.lightningPlasmaContinuation||command?.decisionEvidence?.lightningPlasmaContinuation||null):null;
    const anotherDimensionEntry=concept==='Lightning Plasma'?(context?.anotherDimensionEntry||null):null;
    if(concept==='Lightning Plasma'){
      if(!anotherDimensionEntry?.id||anotherDimensionEntry.conceptName!=='Another Dimension'||String(anotherDimensionEntry.id)!==String(lightningPlasmaContinuation?.parentShadowTradeId||'')||String(anotherDimensionEntry.closeReason||'')!==ANOTHER_DIMENSION.lossCloseReason){
        await this.audit('athena_fire_execution_aborted',{boltId:bolt?.id||null,ticker:q?.ticker||null,concept,reason:'another_dimension_loss_source_missing',stage:'structural_eligibility'});
        return null;
      }
      sourceTradeId=anotherDimensionEntry.id;
    }
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
    const e = await this.createHunter(concept,q,Number(command.stakeCents),0,{
      sourceFeeder:concept==='Lightning Plasma'?'Another Dimension':source?.conceptName||null,sourceTradeId,sourceEntryConfig:concept==='Lightning Plasma'?anotherDimensionEntry?.entryConfig||null:source?.entryConfig||null,
      crashSourceSnapshot:context.crashSignal?structuredClone(context.crashSignal):null,entryQualificationSnapshot,athenaFireCommand:command,legacyCompatibility:false,
    });
    if (e && typeof this.db?.upsertOpportunityEpisode === 'function') {
      await this.db.upsertOpportunityEpisode({id:bolt?.id||command.boltId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker:e.ticker,eventTicker:e.eventTicker,side:'YES',sport:bolt?.sport||bolt?.features?.sport||'Unknown',boltAtMs:Number(bolt?.detectedAtMs||command.decidedAtMs),boltSnapshot:bolt||{},athenaDecision:decision,fireCommand:command,attackSelected:concept,entryId:e.id,entryAtMs:Number(e.openedAtMs||Date.now()),updatedAtMs:Date.now()}).catch(()=>{});
    }
    if(e&&source?.id&&ACTIVE_FEEDER_CONCEPTS.has(String(source.conceptName||''))&&typeof this.db?.updateEntry==='function'){
      const durable=typeof this.db?.entryById==='function'?await this.db.entryById(source.id).catch(()=>null):null;
      const feederState={...(durable?.feederState||source.feederState||{}),shadowTradeVersion:'COSMO-SHADOW-V1',atomicThunderBoltId:String(bolt?.id||command.boltId||''),atomicThunderBoltAtMs:Number(bolt?.detectedAtMs||command.decidedAtMs||Date.now()),athenaFireCommandHash:String(command.commandHash||''),athenaSelectedAttack:concept,athenaFiredAtMs:Number(command.decidedAtMs||Date.now()),realEntryId:e.id,realEntryAtMs:Number(e.openedAtMs||Date.now())};
      await this.db.updateEntry(source.id,{feederState,updatedAtMs:Date.now()}).catch(()=>{});
    }
    return e;
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
    if (isModelEnabled(s, 'Momentum Hunter')) for (const feeder of feeders) {
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

  async evaluateCrashRecovery(_marketMap, { onlyTicker = null, legacyCompatibility=false } = {}) {
    // SE1: Starlight Extinction is no longer a Cosmo/Mega Wave first attack.
    // The only live path is same-cosmos stop-loss re-entry.
    void onlyTicker; void legacyCompatibility;
    return [];
  }
}
