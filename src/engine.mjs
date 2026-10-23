import {MemoryTelemetry,MEMORY_REPAIR_VERSION} from './runtimeMemory.mjs';
import {athenaStarlightTriggerConfig,athenaStarlightTriggerDecision,ATHENA_STARLIGHT_TRIGGER_VERSION} from './athenaStarlightTrigger.mjs';
import {BUILD_INFO} from './authority.mjs';
import {STARLIGHT_SHADOW_VERSION} from './shadowStarlight.mjs';
import {LP_CONTINUATION_VERSION,lightningParentEligibility} from './lightningShadowContinuation.mjs';
import {EXECUTION_REPORT_VERSION,LIGHTNING_REPORT_VERSION,EXECUTION_ATTACKS,lightningCapital,executionCapital,actualOpenExposure,executionScopeMatches,executionValuation,statisticsFromRows,statisticsFromSnapshot,simulationAccountValue} from './executionReporting.mjs';
import { SHADOW_PROTOCOL, executionSettingsHash, shadowScope, sameShadowScope, entryMatchesShadowScope, validateShadowObservation } from './shadowProtocol.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { env, freshInstallSettings, factoryOperatorSettingsPatch, startupSettingsPreservation, sanitizeRuntimeSettings, preserveExecutionArm, kalshiAccountSnapshot, brokerLedgerGaps, sharedAccountBook, normalizeStartupExecutionMode, deploymentConfigRecord, EDITABLE_NUMERIC_SETTINGS, EDITABLE_BOOLEAN_SETTINGS, RELEASE } from './config.mjs';
import { Database, LOW_PRIORITY_DB_PERSISTENCE } from './db.mjs';
import { KalshiClient } from './kalshi.mjs';
import { MarketHub } from './market.mjs';
import { LearningEngine, classifyDeterministic } from './learning.mjs';
import { Athena, ATHENA_BRAIN, ATHENA_B2, AthenaCommander } from './athena.mjs';
import { StrategyEngine, starlightRecoverySignalState, starlightRecoveryQuoteOrder, activeCosmoSources, lightningPlasmaFieldSelection, anotherDimensionQualification, crystalWallSignalState, justiceArrowSignalState, independentCi1SignalState, isModelEnabled, recoverySignalState, plasmaSignalState, isProfitableExecutableParent, followUpConfirmationState, lightningPlasmaScaleInDecision, attackMultiplySeats, lightningPlasmaLossMayArmStarlight } from './strategy.mjs';
import { ci1EpisodeConsumptionKey, ci1EpisodeEntryConsumes } from './strategy.mjs';
import { ProfitGuard, evaluateShadowWithOriginalGuard } from './profitGuard.mjs';
import { GoldenEye } from './goldenEye.mjs';
import { FEEDER_SIGNAL_INTELLIGENCE } from './feederSignalIntel.mjs';
import { PhoenixCosmoEngine } from './phoenix.mjs';
import { PORTFOLIO_CONCEPTS, ACTIVE_PORTFOLIO_CONCEPTS, RETIRED_PORTFOLIO_CONCEPTS, FEEDER_CONCEPTS, ACTIVE_FEEDER_CONCEPTS, RETIRED_FEEDER_CONCEPTS, SHADOW_ATTACK_CONCEPTS, SHADOW_SAINT_ARCHITECTURE, isShadowSaintConcept, isShadowSaintEntry, SHADOW_SAINT_QUOTE_MAX_AGE_MS, executionMarketFamilyExclusion, MARKET_FAMILY_EXECUTION_EXCLUSION, EXECUTION_ATTACK_DISPLAY, GALACTIC_EXPLOSION, CI1_WALL_CLONE, COSMO_ROUTING, LIGHTNING_PLASMA, PHOENIX_COSMO, ATHENA_EXCLAMATION, SCARLET_NEEDLE, CRYSTAL_WALL, GEMINI_UNIVERSE, ANOTHER_DIMENSION, SAGITTARIUS_JUSTICE_ARROW, AURORA_EXECUTION, kalshiGeneralTakerFeeEstimateCents, computeLiveStatus, MOMENTUM, RECOVERY, ULTIMATE_STOP_GUARD, STOP_LOSS_WATCHDOG, STOP_GUARD_RECOVERY_LEARNING, ULTIMATE_PROFIT_GUARD, APEX_PROFIT_GUARD, PROTECTED_RUNNER_INTELLIGENCE, PROFIT_LEARNING_INTELLIGENCE, ATHENA_EXIT_INTELLIGENCE, GOLDEN_EYE, ATOMIC_THUNDER, ATOMIC_THUNDER_BOLT, ATOMIC_THUNDER_PATTERN_GUARDIAN, COSMO_SHADOW_TRADING, ATHENA_COMMANDER, ARAYASHIKI, INFINITY_BREAK, POST_EXIT_RESEARCH } from './doctrine.mjs';
import { GameClockAuthority, GAME_CLOCK_AUTHORITY, isConfirmedGameClockState, isEntryAuthorizedGameClockState } from './gameClock.mjs';
import { AtomicThunderBoltEngine, atomicThunderBoltFeatures } from './opportunity.mjs';

const openLike = (s) => ['open', 'entry_pending', 'exit_pending', 'pending_recovery'].includes(s);
const centsNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const waitUntil = async (ms) => { if (ms > 0) await sleep(ms); };
const FINAL_STATUSES = new Set(['finalized', 'settled']);
const PROTECTION_BACKUP_MS = 1500;
const GOLD_SAINT_ATTACKS = new Set(['Wave Surfer','Crash Recovery Hunter','Recovery Hunter','Momentum Hunter','Lightning Plasma','Scarlet Needle']);
const stableHash=(value)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rounded=(v,p=4)=>Number.isFinite(Number(v))?Number(Number(v).toFixed(p)):null;
export const ENTRY_CANDIDATE_FUNNEL = Object.freeze({version:'ECF1',maximumCandidates:512,maximumRecent:80});
export const DATABASE_PRESSURE_ISOLATION = Object.freeze({
  version:'DBPI2',
  referenceSignalSweepMs:30_000,
  stateSnapshotTtlMs:1_500,
  stateDbFanoutMaximum:2,
  entryEvaluationConcurrency:2,
  quoteProtectionConcurrency:3,
  ordinaryPoolReservedHeadroom:3,
  lowPriorityPersistenceConcurrency:LOW_PRIORITY_DB_PERSISTENCE.maximumConcurrency,
  lowPriorityPersistenceMaximumPending:LOW_PRIORITY_DB_PERSISTENCE.maximumPending,
  lowPriorityPersistenceScope:LOW_PRIORITY_DB_PERSISTENCE.scope,
  lowPriorityPersistenceMaximumBatchBytes:LOW_PRIORITY_DB_PERSISTENCE.maximumBatchBytes,
  fsiPersistenceRevision:FEEDER_SIGNAL_INTELLIGENCE.persistenceRevision,
  fsiPersistenceBatchSize:FEEDER_SIGNAL_INTELLIGENCE.persistenceBatchSize,
  quoteProtectionScope:'REAL_HUNTERS_ONLY',
});

// R68/OPI1: the browser/operator plane is deliberately compact and isolated
// from diagnostic/history payloads. Dynamic trading truth is still refreshed
// every dashboard state cycle, while slow observability summaries are cached
// briefly so UI polling can never become a PostgreSQL workload generator.
export const OPERATOR_PLANE_ISOLATION = Object.freeze({
  version:'OPI1',
  slowTelemetryTtlMs:10_000,
  targetStateBytes:220_000,
  maximumClosedRows:60,
  maximumAuditRows:20,
  role:'compact_dashboard_state_and_cached_observability_separate_from_diagnostics',
});

export const ENTRY_ADMISSION_CONTROL = Object.freeze({
  version:'EAC3',
  unknownProbeIntervalMs:30_000,
  maximumTrackedEvents:2048,
  preBoltExecutionMarginMs:5_000,
  role:'event_level_prequeue_clock_and_immediate_green_execution_admission',
});


export const BROKER_OWNERSHIP_RECONCILIATION = Object.freeze({
  version:'BOR1',
  policyRevision:'BOR1-R2-ZERO-INVENTORY-ORPHAN-QUARANTINE',
  role:'owner_wide_exact_exit_receipt_recovery_plus_zero_inventory_orphan_quarantine_without_pnl_inference',
});

const REFERENCE_SIGNAL_SWEEP_MS = DATABASE_PRESSURE_ISOLATION.referenceSignalSweepMs;
const STATE_SNAPSHOT_TTL_MS = DATABASE_PRESSURE_ISOLATION.stateSnapshotTtlMs;
const STATE_DB_FANOUT_MAX = DATABASE_PRESSURE_ISOLATION.stateDbFanoutMaximum;
const ENTRY_EVALUATION_CONCURRENCY = DATABASE_PRESSURE_ISOLATION.entryEvaluationConcurrency;
const QUOTE_PROTECTION_CONCURRENCY = DATABASE_PRESSURE_ISOLATION.quoteProtectionConcurrency;
const PROTECTION_FRESH_MS = 10_000;
const WS_FRESH_MS = 70_000;
const SCANNER_FRESH_MS = 7 * 60_000;
const DISPLAY_QUOTE_FRESH_MS = 15_000;
const LIVE_RESTART_REARM_RETRY_MS = 5_000;

// R67/RGM5 is an active trade-priority resource governor. It may compact or
// defer only reconstructable diagnostics/research state. It never shrinks the
// live executable market/protection set, delays Aurora/Infinity/reconciliation,
// rejects Athena FIRE, or changes any trading authority based on memory.
export const RUNTIME_RESOURCE_GOVERNOR = Object.freeze({
  version:'RGM5',
  preferredRssCeilingMiB:425,
  warningRssMiB:450,
  criticalRssMiB:500,
  greenBelowMiB:400,
  compactAtMiB:400,
  pressureAtMiB:450,
  tradePriorityAtMiB:475,
  hardResearchShedAtMiB:490,
  hardCeilingMiB:500,
  sampleIntervalMs:5000,
  // R58 diagnostics showed systems already sitting around 425-448 MiB while
  // only in COMPACT. Begin reconstructable-state compaction at that first
  // pressure tier instead of waiting until 450 MiB. Protected/live/crash
  // tickers are never evicted by LearningEngine's pruning contract.
  crashStateLimits:Object.freeze({GREEN:768,COMPACT:512,PRESSURE:384,TRADE_PRIORITY:320,HARD_RESEARCH_SHED:256}),
  fsiObservationLimits:Object.freeze({GREEN:96,COMPACT:64,PRESSURE:64,TRADE_PRIORITY:64,HARD_RESEARCH_SHED:64}),
  tradingAuthority:false,
});


export const RECOVERY_WATCH_EXECUTION_GOVERNOR = Object.freeze({
  version:'RWG1',
  minimumPriceChangeRetryMs:1_000,
  unchangedReadyRetryMs:5_000,
  exposureBlockedRetryMs:5_000,
  genericExecutionBlockedRetryMs:2_000,
  maximumWatchesPerAttack:256,
  role:'state_change_aware_recovery_execution_retry_without_quote_rate_rest_churn',
});

async function mapLimit(items, limit, fn) {
  const rows = Array.from(items || []);
  if (!rows.length) return [];
  const out = new Array(rows.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(Math.floor(Number(limit) || 1), rows.length)) }, async () => {
    while (true) {
      const i = cursor; cursor += 1;
      if (i >= rows.length) return;
      out[i] = await fn(rows[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}


// HF3 bounded coalescing executor. Repeated quote events for the same logical
// work key never create an unbounded chain of promises: while one run is active
// only the latest rerun request is retained. Global concurrency is capped so
// entry evaluation cannot consume every database connection and starve
// protection, reconciliation, diagnostics, or HTTP state requests.
// Calendar strategy totals for the non-SQL/diagnostic path, using the same
// Europe/Madrid calendar as PostgreSQL, not rolling UTC durations.
export function starlightPeriodTotals(rows,now=Date.now()){
  const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
  const local=ms=>{const p=Object.fromEntries(formatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
    const day=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day));return {year:p.year,month:p.year+'-'+p.month,day};};
  const n=local(now),weekStart=n.day-((new Date(n.day).getUTCDay()+6)%7)*86400000;
  const out={dayRealizedCents:0,weekRealizedCents:0,monthRealizedCents:0,yearRealizedCents:0};
  for(const e of rows){if(e.status!=='closed'||e.conceptName!=='Crash Recovery Hunter'||isShadowSaintEntry(e)||!e.closedAtMs)continue;
    const t=local(e.closedAtMs),pnl=Number(e.pnlCents)||0;
    if(t.day===n.day)out.dayRealizedCents+=pnl;
    if(t.day>=weekStart&&t.day<=n.day)out.weekRealizedCents+=pnl;
    if(t.month===n.month)out.monthRealizedCents+=pnl;
    if(t.year===n.year)out.yearRealizedCents+=pnl;
  }return out;
}

export class CoalescingWorkQueue {
  constructor({ maxConcurrency=4, maxPending=Infinity, onError=null }={}) {
    this.maxConcurrency=Math.max(1,Math.floor(Number(maxConcurrency)||1));
    this.maxPending=Math.max(1,Number(maxPending)||1);
    this.totalDeferred=0;
    this.onError=typeof onError==='function'?onError:null;
    this.pending=new Map();
    this.active=new Set();
    this.rerun=new Map();
    this.activeCount=0;
    this.totalStarted=0;
    this.totalCoalesced=0;
    this.maxObservedActive=0;
  }
  enqueue(key, task) {
    const k=String(key||'');
    if(!k||typeof task!=='function')return false;
    if(this.active.has(k)){
      this.rerun.set(k,task);
      this.totalCoalesced+=1;
      return true;
    }
    if(this.pending.has(k)){
      this.pending.set(k,task);
      this.totalCoalesced+=1;
      return true;
    }
    if(this.pending.size>=this.maxPending){this.totalDeferred++;return false;}
    this.pending.set(k,task);
    this.pump();
    return true;
  }
  pump() {
    while(this.activeCount<this.maxConcurrency&&this.pending.size){
      const [key,task]=this.pending.entries().next().value;
      this.pending.delete(key);
      this.active.add(key);
      this.activeCount+=1;
      this.totalStarted+=1;
      this.maxObservedActive=Math.max(this.maxObservedActive,this.activeCount);
      void Promise.resolve().then(task).catch(async(error)=>{
        if(this.onError)await this.onError(error,key);
      }).finally(()=>{
        this.active.delete(key);
        this.activeCount=Math.max(0,this.activeCount-1);
        const rerun=this.rerun.get(key);
        if(rerun){this.rerun.delete(key);this.pending.set(key,rerun);}
        this.pump();
      });
    }
  }
  snapshot(){return{maxConcurrency:this.maxConcurrency,maxPending:this.maxPending,totalDeferred:this.totalDeferred,active:this.activeCount,pending:this.pending.size,rerun:this.rerun.size,totalStarted:this.totalStarted,totalCoalesced:this.totalCoalesced,maxObservedActive:this.maxObservedActive};}
  isIdle(){return this.activeCount===0&&this.pending.size===0&&this.rerun.size===0;}
}

function brokerPositionCount(p) {
  return Math.abs(Number(p.position_fp ?? p.position ?? p.market_position ?? 0));
}

// Retained as the R14 deterministic fallback primitive and regression oracle.
// R17/GCA1 no longer uses occurrence_datetime as the sole clock authority: it
// first seeks official milestone live evidence and only falls back to this
// conservative rule when occurrence has actually passed. Broad trading
// activity alone can never authorize a Hunter clock.
export function resolveObservedGameStart({ priorStart = 0, liveStatus = 'unknown', occurrenceTimeMs = 0, now = Date.now() } = {}) {
  const prior = Number(priorStart || 0);
  const occurrence = Number(occurrenceTimeMs || 0);
  if (!Number.isFinite(occurrence) || occurrence <= 0 || occurrence > now) return 0;
  if (Number.isFinite(prior) && prior >= occurrence && prior <= now) return prior;
  return String(liveStatus || '').toLowerCase() === 'live' ? now : 0;
}


export function entryAdmissionDecision({ quote=null, mode='SIMULATION', minGameMinutes=0, maxGameMinutes=0, now=Date.now() }={}) {
  const state=quote?.gameClockState&&typeof quote.gameClockState==='object'?quote.gameClockState:{};
  const phase=String(state.phase||'UNKNOWN');
  const minMs=Math.max(0,Number(minGameMinutes||0))*60_000;
  const configuredMaxMinutes=Math.max(0,Number(maxGameMinutes||0));
  const maxMs=configuredMaxMinutes>0?configuredMaxMinutes*60_000:0;
  const t=Number(now);
  if(phase==='FINAL')return{action:'BLOCK',reason:'game_final',nextEligibleAtMs:null};
  if(phase==='CONFLICT')return{action:'BLOCK',reason:'game_clock_conflict',nextEligibleAtMs:null};
  const start=Number(state.startTimeMs||quote?.gameStartTimeMs||0);
  if(phase==='CONFIRMED'&&Number.isFinite(start)&&start>0){
    const nextEligibleAtMs=start+minMs;
    if(Number.isFinite(t)&&t+1e-9<nextEligibleAtMs)return{action:'BLOCK',reason:'minimum_game_time_wait',nextEligibleAtMs,startTimeMs:start};
    const lastEligibleAtMs=maxMs>0?start+maxMs:null;
    if(lastEligibleAtMs!=null&&Number.isFinite(t)&&t-1e-9>lastEligibleAtMs)return{action:'BLOCK',reason:'maximum_game_time_exceeded',nextEligibleAtMs:null,lastEligibleAtMs,startTimeMs:start};
    return{action:'ALLOW',reason:maxMs>0?'confirmed_entry_window':'confirmed_minimum_elapsed',nextEligibleAtMs,startTimeMs:start,lastEligibleAtMs};
  }
  // GCA2-R3 LIVE/SIM parity: the observed-activity lower bound is shared
  // strategic evidence. Legacy simulationActivityStartMs is accepted only as
  // restart-safe migration input from pre-parity persisted GCA2 rows.
  const observedStart=Number(state.observedActivityStartMs||state.simulationActivityStartMs||0);
  if(Number.isFinite(observedStart)&&observedStart>0){
    const nextEligibleAtMs=observedStart+minMs;
    if(Number.isFinite(t)&&t+1e-9<nextEligibleAtMs)return{action:'BLOCK',reason:'observed_activity_aging_wait',nextEligibleAtMs,startTimeMs:observedStart};
    // The lower bound is conservative. If even it exceeds the configured
    // maximum, the event is certainly too old and may be rejected before an
    // execution worker is consumed in either mode.
    const lastEligibleAtMs=maxMs>0?observedStart+maxMs:null;
    if(lastEligibleAtMs!=null&&Number.isFinite(t)&&t-1e-9>lastEligibleAtMs)return{action:'BLOCK',reason:'maximum_game_time_exceeded',nextEligibleAtMs:null,lastEligibleAtMs,startTimeMs:observedStart};
    // Maturity is not exposure authority. It earns one bounded shared GCA2
    // probe; only fresh exact-trade evidence can promote the event to CONFIRMED.
    return{action:'PROBE',reason:'observed_activity_due_for_authority_probe',nextEligibleAtMs,startTimeMs:observedStart,lastEligibleAtMs};
  }
  return{action:'PROBE',reason:'clock_authority_probe_required',nextEligibleAtMs:null};
}

// EAC3 keeps only the hard game-window proof needed by the immediate
// COSMO_GREEN -> Atomic Thunder -> Athena chain. There is no strategic
// PRE-BOLT waiting clock. A green signal or an already emitted Bolt needs only
// enough remaining game time for the bounded execution margin.
export function entryChainAdmissionDecision({
  quote=null,
  mode='SIMULATION',
  minGameMinutes=0,
  maxGameMinutes=0,
  now=Date.now(),
  stage='ATOMIC_GREEN',
  executionMarginMs=ENTRY_ADMISSION_CONTROL.preBoltExecutionMarginMs,
}={}){
  const normalizedStage=stage==='NEW_PRE_BOLT'||stage==='ACTIVE_PRE_BOLT'?'ATOMIC_GREEN':stage==='POST_ATB2'?'POST_BOLT':String(stage||'ATOMIC_GREEN');
  const base=entryAdmissionDecision({quote,mode,minGameMinutes,maxGameMinutes,now});
  if(base.action!=='ALLOW')return{...base,stage:normalizedStage};
  const maxAt=Number(base.lastEligibleAtMs||0),t=Number(now),margin=Math.max(0,Number(executionMarginMs)||0);
  if(!(maxAt>0))return{...base,stage:normalizedStage,executionMarginMs:margin,preBoltFeasible:true,immediateGreenChain:true};
  const expectedEvent=String(quote?.eventTicker||quote?.ticker||'');
  const freshClock=isEntryAuthorizedGameClockState(quote?.gameClockState,expectedEvent,t);
  if(['ATOMIC_GREEN','POST_BOLT'].includes(normalizedStage)&&!freshClock){
    return{action:'PROBE',reason:normalizedStage==='POST_BOLT'?'post_bolt_clock_authorization_refresh_required':'cosmo_green_clock_authorization_refresh_required',stage:normalizedStage,startTimeMs:base.startTimeMs,lastEligibleAtMs:maxAt,nextEligibleAtMs:base.nextEligibleAtMs};
  }
  const readyAtMs=t+margin;
  if(!(readyAtMs<maxAt))return{action:'BLOCK',reason:'execution_window_infeasible',stage:normalizedStage,startTimeMs:base.startTimeMs,lastEligibleAtMs:maxAt,readyAtMs,executionMarginMs:margin,nextEligibleAtMs:null};
  return{...base,stage:normalizedStage,executionMarginMs:margin,readyAtMs,preBoltFeasible:true,immediateGreenChain:true};
}

// R60-HF1 simulation reset mutation barrier. Reset invalidates the epoch,
// blocks new SIM work, and drains only already-entered entry work before the
// archive boundary. This covers both Cosmos shadow commits and real Attacks.
export class SimulationMutationGate {
  constructor(){this.epoch=0;this.blocked=false;this.active=0;this.waiters=[];}
  capture(){return{epoch:this.epoch,blocked:this.blocked};}
  enter(token){
    if(this.blocked||!token||Number(token.epoch)!==this.epoch)return null;
    this.active+=1;let released=false;
    return()=>{if(released)return;released=true;this.active=Math.max(0,this.active-1);if(this.active===0){const waiters=this.waiters.splice(0);for(const resolve of waiters)resolve();}};
  }
  async blockAndDrain(){
    if(this.blocked)throw new Error('simulation_reset_already_in_progress');
    this.blocked=true;this.epoch+=1;
    if(this.active>0)await new Promise((resolve)=>this.waiters.push(resolve));
    return{epoch:this.epoch,active:this.active};
  }
  release(){this.blocked=false;}
  snapshot(){return{version:'SIM-RESET-GATE-V1',epoch:this.epoch,blocked:this.blocked,active:this.active,waiting:this.waiters.length};}
}

// HF2 crash orchestration is independent of any one Cosmo source. CI1 wakes
// the Starlight lane; any active Cosmo may then nominate the market.
export function crashPipelineReadyFromState(state) {
  return Boolean(state && typeof state === 'object' && state.entryReady === true);
}

export class SagittariusEngine {
  constructor() {
    this.db = new Database(env.databaseUrl);
    this.settings = freshInstallSettings();
    this.credentials = null;
    this.balance = null;
    this.brokerPositions = [];
    this.running = false;
    this.scanRequested = false;
    // HF3: serialize dashboard/settings mutations so rapid one-by-one topology
    // toggles cannot persist out of order across PostgreSQL pool clients.
    this.settingsMutationTail = Promise.resolve();
    this.simulationMutationGate = new SimulationMutationGate();
    this.simulationResetPromise = null;
    this.intelligenceHydration = {legacyAthena:'IDLE',athenaCommander:'IDLE',atomicThunderResearch:'IDLE',lastError:null,startedAtMs:0,completedAtMs:0};
    this.intelligenceHydrationPromise = null;
    this.cyclePromise = null;
    this.protectionLoopPromise = null;
    this.startedAtMs = Date.now();
    this.resourceSampleAtNs = process.hrtime.bigint();
    this.resourceCpuUsage = process.cpuUsage();
    this.resourceGovernorTimer = null;
    this.resourcePressureState = 'GREEN';
    this.resourceResearchDeferred = false;
    this.resourceGovernorTransitions = 0;
    this.resourceGovernorActions = 0;
    this.resourceGovernorLastActionAtMs = 0;
    this.resourceGovernorLastResult = null;
    this.lastFullScanMs = 0;
    this.lastDiscoveryMs = 0;
    this.lastSnapshotMs = 0;
    this.lastReferenceSweepMs = 0;
    this.lastPostExitResearchMs = 0;
    this.lastScanMarkets = [];
    this.lastError = null;
    // HF5: all dashboard/SSE/diagnostic consumers share one bounded state
    // collector. This prevents multiple browser requests from each fanning out
    // large PostgreSQL reads while trading work is active.
    this.stateSnapshotCache = null;
    this.stateSnapshotAtMs = 0;
    this.stateCollectionPromise = null;
    this.stateCollectionCount = 0;
    this.operatorTelemetryCache = null;
    this.operatorTelemetryAtMs = 0;
    this.operatorTelemetryPromise = null;
    this.operatorPlaneStats = {version:OPERATOR_PLANE_ISOLATION.version,collections:0,lastCollectionMs:0,maxCollectionMs:0,averageCollectionMs:0,lastPayloadBytes:0,maxPayloadBytes:0,ssePushes:0,lastSsePushAtMs:0,lastSerializeMs:0,maxSerializeMs:0};
    this.quoteProtectionTimers = new Map();
    this.quoteProtectionQueue = new CoalescingWorkQueue({
      maxConcurrency:QUOTE_PROTECTION_CONCURRENCY,
      onError:async(error,ticker)=>{await this.db.audit('error','profit_guard_quote_backpressure',{ticker,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.entryEvaluationQueue = new CoalescingWorkQueue({
      maxConcurrency:ENTRY_EVALUATION_CONCURRENCY,
      onError:async(error,key)=>{await this.db.audit('error','entry_evaluation_backpressure',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.phoenixSignalQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('warning','phoenix_signal_backpressure',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.entryAdmissionProbeAt = new Map();
    this.entryAdmissionStats = {version:ENTRY_ADMISSION_CONTROL.version,allowed:0,blockedBeforeQueue:0,probeAllowed:0,probeCoalesced:0,byReason:{}};
    // R60/ECF1: one bounded identity follows an opportunity from COSMO_GREEN to
    // OPENED. These maps are telemetry/dedup only; they never grant authority.
    this.entryCandidateFunnel = new Map();
    this.entryCandidateFunnelTotals = {uniqueCandidates:0,byStage:{}};
    this.entryCandidateFunnelRecent = [];
    this.athenaDecisionMemo = new Map();
    this.athenaDecisionInFlight = new Set();
    this.entryDecisionDedupStats = {athenaEvaluated:0,athenaUnchangedSuppressed:0,athenaInFlightSuppressed:0,athenaChangedStateRetries:0};
    this.scarletContinuationInFlight = new Set();
    this.scarletContinuationStats = {version:SCARLET_NEEDLE.version,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,duplicateSuppressed:0,maxRepeatBlocked:0,modeMismatchBlocked:0,lastEvent:null};
    this.scarletContinuationQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','scarlet_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.crystalWallContinuationInFlight = new Set();
    this.crystalWallWatches = new Map();
    this.crystalWallContinuationStats = {version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,lastEvent:null};
    this.crystalWallContinuationQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','crystal_wall_v3_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    // R63 Gemini shadow universe. Another Dimension is deliberately isolated from
    // the ordinary Cosmo source class: it observes active Cosmos but can never
    // become an Atomic Thunder/Lightning Plasma source. Quote work is memory-only;
    // durable open/close transitions are serialized on one bounded worker.
    this.activeCosmosByTicker = new Map();
    this.anotherDimensionSourcePeaks = new Map();
    this.anotherDimensionOpenByTicker = new Map();
    this.anotherDimensionRecent = new Map();
    this.anotherDimensionRuntime = new Map();
    this.geminiOpenAttemptBookMs = new Map();
    this.anotherDimensionQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','another_dimension_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.anotherDimensionStats = {version:ANOTHER_DIMENSION.version,qualified:0,opened:0,profitClosed:0,lossClosed:0,realizedPnlCents:0,blocked:0,lastEvent:null};
    this.justiceArrowInFlight = new Set();
    this.justiceArrowWatches = new Map();
    this.starlightRecoveryWatches = new Map();
    this.starlightRecoveryInFlight = new Set();
    this.starlightRecoveryQuoteJobs=new Map();
    this.starlightRecoveryPendingQuotes=new Map();
    this.starlightRecoveryArmWrites=new Map();
    this.starlightRecoveryStats = {armed:0,qualified:0,opened:0,blocked:0,expired:0,selfChainBlocked:0,orphanReconciliations:0,orphansArmed:0,pendingQuoteReorders:0,pendingQuoteOverflows:0,lastEvent:null,lastOrphanReconciliation:null,lastOrphanError:null,lastRehydrateError:null};
    this.justiceArrowQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','justice_arrow_v2_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.justiceArrowStats = {version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,modeMismatchBlocked:0,lastEvent:null};
    this.ci1CloneWatches = new Map();
    this.ci1CloneInFlight = new Set();
    this.ci1ConsumedEpisodes = new Set();
    this.ci1EpisodeReservations = new Set();
    this.ci1CloneStats = {version:CI1_WALL_CLONE.version,policyRevision:CI1_WALL_CLONE.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,lastEvent:null};
    this.ci1CloneQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','ci1_wall_clone_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.lightningPlasmaContinuationInFlight = new Set();
    this.lightningPlasmaWatches = new Map();
    this.lightningPlasmaContinuationStats = {version:LIGHTNING_PLASMA.version,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,maxRepeatBlocked:0,selfParentBlocked:0,modeMismatchBlocked:0,lastEvent:null};
    this.lightningPlasmaContinuationQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','lightning_plasma_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    // R61-HF1: a dashboard settings write is only reported as verified after
    // the persisted PostgreSQL runtime record has been read back and the
    // edited fields match exactly. This telemetry never changes frozen trade
    // economics or grants trading authority.
    this.settingsPersistence = {version:'SETTINGS-PERSISTENCE-R1',lastVerifiedAtMs:0,lastKeys:[],lastValues:{},lastError:null};
    this.protectedTickers = new Set();
    this.goldenEyeTimer = null;
    this.goldenEyeEvaluationPromise = null;
    this.goldenEyeExecutionPromise = null;
    this.goldenEyeRerunRequested = false;
    this.goldenEye = null;
    this.feederSignalIntel = null;
    this.phoenixCosmo = null;
    this.atomicThunderBolt = null;
    this.athenaCommander = null;
    this.legacyAthena = null;
    // R20/RH1 keeps stopped-source tickers subscribed and lets fresh quote
    // events wake Recovery Hunter instead of waiting for the next 5-minute
    // full scan. The set contains only still-eligible hard-stop sources.
    this.recoveryPriorityTickers = new Set();
    this.recoveryEvaluationTimers = new Map();
    // R45 keeps existing active reference-feeder tickers hot so ordinary
    // active Cosmo -> Athena candidates are
    // evaluated from fresh WebSocket quotes instead of only at scan boundaries.
    this.feederPriorityTickers = new Set();
    this.feederHunterEvaluationTimers = new Map();
    this.athenaOpportunityTimers = new Map();
    // R46/LP1 is triggered only when Cosmo materializes, never by the raw quote
    // stream. One sliding quiet timer collects a short burst into a Plasma field
    // without reintroducing HF6/HF7 entry-queue pressure.
    this.lightningPlasmaTimer = null;
    this.lightningPlasmaEvaluationPromise = null;
    this.lightningPlasmaRerunRequested = false;
    // R21/CI1 keeps any active crash episode subscribed through its rebound or
    // terminal/reset transition. CRH1 evaluation is separately debounced and
    // remains subordinate to RH1 on a stopped-source ticker.
    this.crashPriorityTickers = new Set();
    this.crashRecoveryEvaluationTimers = new Map();
    this.reconcileTimer = null;
    this.reconcilePromise = null;
    // LIVE restart continuity: mode=LIVE is the durable operator intent. The
    // runtime arm itself remains transient/fail-closed and is restored only
    // after the normal health, broker-reconciliation and protection gates pass.
    this.startupLiveResumeRequested = false;
    this.liveAutoRearmTimer = null;
    this.liveAutoRearmPromise = null;
    this.liveAutoRearmLastReason = null;
    this.cycleFailureCount = 0;
    this.health = {
      restOk: false,
      websocketOk: false,
      websocketFresh: false,
      reconciliationOk: true,
      protectionOk: true,
      protectionFresh: false,
      goldenEyeOk: true,
      goldenEyeLastError: null,
      scannerFresh: false,
      degraded: true,
      dbOk: true,
      lastRestOkMs: 0,
      lastWsMessageMs: 0,
      lastDiscoveryMs: 0,
      lastProtectionMs: 0,
      lastError: null,
    };
    this.speed = {
      lastLoopMs: 0,
      avgCycleMs: 0,
      maxCycleMs: 0,
      checksCompleted: 0,
      fetchFailures: 0,
      closedThisLoop: 0,
      mode: 'idle',
    };
  }

  queueScarletContinuation(entry) {
    const id=String(entry?.id||'');
    if(!id)return false;
    if(!(this.scarletContinuationQueue instanceof CoalescingWorkQueue)){
      this.scarletContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','scarlet_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    }
    return this.scarletContinuationQueue.enqueue(`close:${id}`,()=>this.handleScarletContinuation(entry));
  }

  scarletContinuationRuntime() {
    if(!(this.scarletContinuationInFlight instanceof Set))this.scarletContinuationInFlight=new Set();
    if(!this.scarletContinuationStats||typeof this.scarletContinuationStats!=='object')this.scarletContinuationStats={version:SCARLET_NEEDLE.version,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,duplicateSuppressed:0,maxRepeatBlocked:0,modeMismatchBlocked:0,lastEvent:null};
    return this.scarletContinuationStats;
  }

  async handleScarletContinuation(parentEntry) {
    const stats=this.scarletContinuationRuntime();
    const s=this.settings||{};
    const parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),parentEntryId:parentId,ticker,...data};return stats.lastEvent;};
    return {status:'IGNORED',reason:'follow_up_retired_athena_initial_entry'};
    if(!parentId||!ticker||parentEntry?.status!=='closed'||Number(parentEntry?.remainingCount||0)>1e-9)return {status:'IGNORED',reason:'not_fully_closed'};
    if(!isProfitableExecutableParent(parentEntry))return {status:'IGNORED',reason:'not_profitable_executable_parent'};
    if(String(parentEntry.conceptName||'')==='Scarlet Needle')return {status:'IGNORED',reason:'self_parent_blocked'};
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall||{};
    if(s.scarletNeedleEnabled!==true)return {status:'IGNORED',reason:'scarlet_disabled'};
    if(String(parentEntry.systemName||'')!==String(s.systemName)||String(parentEntry.ownerId||'')!==String(s.ownerId)){
      stats.blocked+=1;record('BLOCKED',{reason:'owner_or_system_mismatch'});return {status:'BLOCKED',reason:'owner_or_system_mismatch'};
    }
    if(String(parentEntry.mode||'')!==String(s.mode||'')){
      stats.modeMismatchBlocked+=1;stats.blocked+=1;record('BLOCKED',{reason:'mode_changed_since_parent_close'});return {status:'BLOCKED',reason:'mode_changed_since_parent_close'};
    }
    const maxRepeats=Math.max(0,Math.min(SCARLET_NEEDLE.maximumConfigurableRepeats,Math.floor(Number(s.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats))));
    if(maxRepeats<=0)return {status:'IGNORED',reason:'repeat_limit_zero'};
    const repeatIndex=1,rootEntryId=parentId;
    stats.eligible+=1;
    const authorizationId=`SCARLET-CONTINUATION:${parentId}:${repeatIndex}`;
    if(this.scarletContinuationInFlight.has(authorizationId)){
      stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'local'});return {status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};
    }
    this.scarletContinuationInFlight.add(authorizationId);
    let unlock=null;
    const baseEpisode=(decision={})=>({id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentEntry.eventTicker||ticker),side:'YES',sport:String(parentEntry.sport||'Unknown'),boltAtMs:Number(parentEntry.closedAtMs||Date.now()),boltSnapshot:{version:SCARLET_NEEDLE.version,authority:SCARLET_NEEDLE.strategicEntryAuthority,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats},athenaDecision:decision,fireCommand:{},attackSelected:'Scarlet Needle',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    const terminal=async(reason,data={})=>{
      stats.blocked+=1;record('BLOCKED',{reason,authorizationId,repeatIndex,maxRepeats,rootEntryId,...data});
      const decision={decision:'BLOCKED',reason,strategicAuthority:false,scarletNeedleContinuation:{version:SCARLET_NEEDLE.version,status:'BLOCKED',terminal:true,authorizationId,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats,...data}};
      await this.db.upsertOpportunityEpisode(baseEpisode(decision)).catch(()=>{});
      await this.db.audit('info','scarlet_continuation_blocked',{authorizationId,parentEntryId:parentId,rootEntryId,ticker,repeatIndex,maxRepeats,reason,...data}).catch(()=>{});
      return {status:'BLOCKED',reason,authorizationId,repeatIndex,maxRepeats};
    };
    try{
      if(typeof this.db.acquireHunterTickerLock!=='function')return terminal('continuation_lock_unavailable');
      unlock=await this.db.acquireHunterTickerLock(s.systemName,`scarlet-continuation:${parentId}`);
      if(!unlock){stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'database_lock'});return {status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
      const existingStatus=String(existing?.athenaDecision?.scarletNeedleContinuation?.status||existing?.athenaDecision?.decision||'');
      if(existing?.entryId||['OPENED','BLOCKED'].includes(existingStatus)){
        stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'durable_episode',existingStatus,entryId:existing?.entryId||null});return {status:'DUPLICATE_SUPPRESSED',reason:'durable_authorization_already_consumed',entryId:existing?.entryId||null};
      }
      const authorizedAtMs=Date.now();
      const lineage={version:SCARLET_NEEDLE.version,status:'AUTHORIZED',terminal:false,authorizationId,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats,parentConcept:String(parentEntry.conceptName||''),parentCrystalWallVersion:String(parentCrystalWall.version||''),parentCrashEpisodeId:String(parentCrystalWall.crashEpisodeId||''),parentCloseReason:String(parentEntry.closeReason||''),parentRealizedPnlCents:Number(parentEntry.pnlCents||0),parentExitPriceCents:Number(parentEntry.exitPriceCents||0),parentClosedAtMs:Number(parentEntry.closedAtMs||0),authorizedAtMs,athenaApprovalRequired:false,athenaSoulVetoApplied:false,ordinaryGameClockBypassed:true,fullConfiguredSizeRequired:true,fullExecutionSafetyRequired:true,normalStrategicDiscoveryBypassed:true,profitTargetNetPerOriginalContractCents:Number(s.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents)};
      await this.db.upsertOpportunityEpisode(baseEpisode({decision:'AUTHORIZED',reason:'crystal_wall_win_authorized_scarlet_continuation',strategicAuthority:false,scarletNeedleContinuation:lineage}));
      stats.authorized+=1;record('AUTHORIZED',{authorizationId,repeatIndex,maxRepeats,rootEntryId});
      const refreshed=await this.freshExecutionSnapshot(ticker);
      if(!refreshed?.marketFresh||!refreshed?.bookFresh||!refreshed?.quote)return terminal('fresh_executable_market_unavailable');
      const q={...refreshed.quote,ticker,eventTicker:String(refreshed.quote.eventTicker||refreshed.quote.ticker||ticker)};
      const expectedEvent=String(parentEntry.eventTicker||ticker),status=String(q.status||'').toLowerCase();
      if(String(q.eventTicker||ticker)!==expectedEvent)return terminal('event_identity_mismatch',{expectedEventTicker:expectedEvent,freshEventTicker:q.eventTicker||null});
      if(status!=='active'||Boolean(q.result))return terminal('market_not_active',{status:status||null,result:q.result||null});
      const parentExit=Number(parentEntry.exitPriceCents||0);
      const handoffAsk=Number(q.yesAsk||0),handoffBid=Number(q.yesBid||0);
      if(!(handoffAsk>0)||!(handoffBid>0)||handoffBid>handoffAsk)return terminal('invalid_fresh_handoff_quote',{parentExitPriceCents:parentExit,askCents:handoffAsk,bidCents:handoffBid});
      stats.attempted+=1;record('ATTEMPTED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,bidCents:Number(q.yesBid||0),askCents:Number(q.yesAsk||0)});
      const opened=await this.strategy.executeScarletContinuation(q,parentEntry,{authorizationId,rootEntryId,repeatIndex,maxRepeats,authorizedAtMs});
      if(!opened)return terminal(this.strategy?.lastAthenaFireAbort||'hard_safety_or_execution_blocked');
      stats.opened+=1;record('OPENED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0)});
      const openedDecision={decision:'OPENED',reason:'scarlet_continuation_opened',strategicAuthority:false,scarletNeedleContinuation:{...lineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
      const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.athenaFire||current?.fireCommand||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:'Scarlet Needle',updatedAtMs:Date.now()}).catch(()=>{});
      await this.db.audit('info','scarlet_continuation_opened',{authorizationId,parentEntryId:parentId,rootEntryId,ticker,repeatIndex,maxRepeats,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),closeToEntryLatencyMs:Math.max(0,Number(opened.openedAtMs||Date.now())-Number(parentEntry.closedAtMs||authorizedAtMs))}).catch(()=>{});
      return {status:'OPENED',authorizationId,repeatIndex,maxRepeats,entry:opened};
    }catch(error){
      await this.db.audit('error','scarlet_continuation_failed',{authorizationId,parentEntryId:parentId,rootEntryId,ticker,repeatIndex,maxRepeats,message:String(error?.message||error)}).catch(()=>{});
      return terminal('continuation_exception',{message:String(error?.message||error)});
    }finally{
      if(unlock)await unlock().catch(()=>{});
      this.scarletContinuationInFlight.delete(authorizationId);
    }
  }

  async freshExecutionSnapshot(ticker) {
    if(typeof this.market?.verifyTickerSnapshot==='function')return this.market.verifyTickerSnapshot(ticker).catch(()=>null);
    if(typeof this.market?.refreshTickerVerified==='function')return this.market.refreshTickerVerified(ticker).catch(()=>null);
    const quote=typeof this.market?.refreshTicker==='function'?await this.market.refreshTicker(ticker).catch(()=>null):null;
    return quote?{quote,marketFresh:true,bookFresh:Boolean(this.market?.getBook?.(ticker))}:null;
  }

  recoveryWatchShouldQueue(prior,signal,now,{isNew=false}={}) {
    if(isNew||signal?.terminal)return true;
    if(!signal?.qualified)return false;
    const at=Math.max(1,Number(now)||Date.now()),last=Math.max(0,Number(prior?.lastAttemptQueuedAtMs||0));
    if(at<Number(prior?.retryNotBeforeMs||0))return false;
    const wasReady=String(prior?.status||'')==='READY';
    const bid=Number(signal?.bidCents??signal?.lastBidCents??-1),ask=Number(signal?.askCents??-1);
    const priceChanged=Number(prior?.lastAttemptBidCents??-1)!==bid||Number(prior?.lastAttemptAskCents??-1)!==ask;
    if(!wasReady)return true;
    if(priceChanged&&at-last>=RECOVERY_WATCH_EXECUTION_GOVERNOR.minimumPriceChangeRetryMs)return true;
    return at-last>=RECOVERY_WATCH_EXECUTION_GOVERNOR.unchangedReadyRetryMs;
  }

  stampRecoveryWatchAttempt(map,authorizationId,signal,now=Date.now()) {
    const id=String(authorizationId||''),prior=map?.get?.(id);if(!prior)return null;
    const next={...prior,lastAttemptQueuedAtMs:Number(now)||Date.now(),lastAttemptBidCents:Number(signal?.bidCents ?? signal?.lastBidCents ?? prior.lastBidCents ?? 0),lastAttemptAskCents:Number(signal?.askCents ?? prior.lastAttemptAskCents ?? 0)};
    map.set(id,next);return next;
  }

  setRecoveryWatchBackoff(map,authorizationId,reason,delayMs) {
    const id=String(authorizationId||''),prior=map?.get?.(id);if(!prior)return null;
    const delay=Math.max(0,Math.floor(Number(delayMs)||0));
    const next={...prior,retryReason:String(reason||'execution_blocked'),retryNotBeforeMs:Date.now()+delay};
    map.set(id,next);return next;
  }

  // Crystal Wall V3 is never armed by a close callback. Crash intelligence
  // on the quote stream is the sole trigger. Keep this compatibility method as
  // an inert surface so an old callback cannot recreate the V2 post-stop path.
  queueCrystalWallContinuation(_entry) { return false; }

  crystalWallContinuationRuntime() {
    if(!(this.crystalWallContinuationInFlight instanceof Set))this.crystalWallContinuationInFlight=new Set();
    if(!(this.crystalWallWatches instanceof Map))this.crystalWallWatches=new Map();
    if(!this.crystalWallContinuationStats||typeof this.crystalWallContinuationStats!=='object')this.crystalWallContinuationStats={version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,lastEvent:null};
    return this.crystalWallContinuationStats;
  }

  dropCrystalWallWatch(authorizationId) {
    if(!(this.crystalWallWatches instanceof Map))return null;
    const id=String(authorizationId||''),prior=this.crystalWallWatches.get(id)||null;
    if(!prior)return null;
    this.crystalWallWatches.delete(id);
    const ticker=String(prior?.ticker||'');
    if(ticker&&this.recoveryPriorityTickers instanceof Set){
      const cwStill=[...this.crystalWallWatches.values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');
      const jaStill=[...(this.justiceArrowWatches||new Map()).values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');
      if(!cwStill&&!jaStill)this.recoveryPriorityTickers.delete(ticker);
    }
    return prior;
  }

  observeCrystalWallQuote(q, crashState) {
    const s=this.settings||{};
    if(s.recoveryHunterEnabled!==true||!q?.ticker)return false;
    const ticker=String(q.ticker),now=Date.now();
    const minCrash=Math.max(0,Math.floor(Number.isFinite(Number(s.crystalWallMinCrashCents))?Number(s.crystalWallMinCrashCents):CRYSTAL_WALL.defaultMinCrashCents));
    let newAuthorizationId=null;
    if(crashState?.episodeId){
      const peak=Math.max(0,Number(crashState.preCrashPeakCents||0));
      const trough=Math.max(0,Number(crashState.troughCents||0));
      const crashDepth=Math.max(Number(crashState.crashDepthCents||0),peak>0&&trough>0?peak-trough:0);
      if(crashDepth+1e-9>=minCrash){
        const crashEpisodeId=String(crashState.episodeId),authorizationId=`CRYSTAL-WALL-V3:${crashEpisodeId}`;
        newAuthorizationId=authorizationId;
        let watch=this.crystalWallWatches.get(authorizationId);
        if(!watch){
          // A distinct new CI1 episode supersedes an unconsumed older watch on
          // the same ticker. The old episode remains durable audit history but
          // can no longer race the new trough for execution authority.
          for(const [id,prior] of this.crystalWallWatches){
            if(String(prior?.ticker||'')===ticker&&String(id)!==authorizationId)this.dropCrystalWallWatch(id);
          }
          watch={authorizationId,crashEpisodeId,ticker,eventTicker:String(q.eventTicker||q.ticker),sport:String(crashState.sport||'Unknown'),
            crashStartedAtMs:Number(crashState.crashStartedAtMs||crashState.startedAtMs||now),authorizedAtMs:now,preCrashPeakCents:peak,
            troughCents:trough||Number(q.yesBid||0),troughAtMs:Number(crashState.troughAtMs||now),crashDepthCents:crashDepth,
            upwardTicks:0,lastBidCents:Number(q.yesBid||0),lastAttemptQueuedAtMs:0,status:'CRASH_ARMED'};
          this.crystalWallWatches.set(authorizationId,watch);
          const stats=this.crystalWallContinuationRuntime();stats.eligible+=1;stats.lastEvent={status:'CRASH_ARMED',atMs:now,authorizationId,crashEpisodeId,ticker,crashDepthCents:crashDepth};
          if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);
        }
      }
    }

    // Continue advancing an already-armed watch even after CI1 resets its own
    // research episode to NORMAL. This prevents a temporary liquidity/spread
    // block at the first +5c rebound from permanently choking Crystal Wall.
    const watches=[...this.crystalWallWatches.values()].filter((w)=>String(w?.ticker||'')===ticker);
    for(const prior of watches){
      const signal=crystalWallSignalState(prior,q,s,now);
      const watch={...prior,...signal,authorizationId:String(prior.authorizationId),crashEpisodeId:String(prior.crashEpisodeId),ticker,eventTicker:String(q.eventTicker||prior.eventTicker||ticker),preCrashPeakCents:Math.max(Number(prior.preCrashPeakCents||0),Number(crashState?.preCrashPeakCents||0)),updatedAtMs:now,status:signal.terminal?'EXPIRED':signal.qualified?'READY':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};
      if(!signal.qualified&&!signal.terminal){watch.retryNotBeforeMs=0;watch.retryReason=null;}
      this.crystalWallWatches.set(String(watch.authorizationId),watch);
      // RWG1: queue authorization/terminal transitions immediately. READY work
      // is price/state-aware: a changed executable quote may retry at 1 Hz, an
      // unchanged READY book only every 5 s, and explicit execution blockers
      // install their own backoff. This removes the former 4/s REST retry loop.
      const isNew=String(watch.authorizationId)===String(newAuthorizationId)&&Number(prior.lastAttemptQueuedAtMs||0)===0;
      if(this.recoveryWatchShouldQueue(prior,signal,now,{isNew})){
        this.stampRecoveryWatchAttempt(this.crystalWallWatches,String(watch.authorizationId),signal,now);
        this.queueCrystalWallWatch(String(watch.authorizationId));
      }
    }
    while(this.crystalWallWatches.size>RECOVERY_WATCH_EXECUTION_GOVERNOR.maximumWatchesPerAttack){const oldest=this.crystalWallWatches.keys().next().value;this.dropCrystalWallWatch(oldest);}
    return watches.length>0;
  }

  queueCrystalWallWatch(authorizationOrTicker) {
    const key=String(authorizationOrTicker||'');
    if(!key||!(this.crystalWallWatches instanceof Map))return false;
    const watches=this.crystalWallWatches.has(key)?[this.crystalWallWatches.get(key)]:[...this.crystalWallWatches.values()].filter((w)=>String(w?.ticker||'')===key);
    if(!watches.length)return false;
    if(!(this.crystalWallContinuationQueue instanceof CoalescingWorkQueue))this.crystalWallContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,k)=>{await this.db.audit('error','crystal_wall_v3_queue',{key:k,message:String(error?.message||error)}).catch(()=>{});}});
    for(const watch of watches)this.crystalWallContinuationQueue.enqueue(`crash:${String(watch.authorizationId)}`,()=>this.attemptCrystalWallAttack(String(watch.authorizationId)));
    return true;
  }

  async attemptCrystalWallAttack(authorizationId) {
    const stats=this.crystalWallContinuationRuntime(),s=this.settings||{};
    const watch=this.crystalWallWatches.get(String(authorizationId));
    if(!watch)return {status:'IGNORED',reason:'watch_missing'};
    const ticker=String(watch.ticker||''),crashEpisodeId=String(watch.crashEpisodeId||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),authorizationId:String(authorizationId),crashEpisodeId,ticker,...data};return stats.lastEvent;};
    if(s.recoveryHunterEnabled!==true){this.dropCrystalWallWatch(String(authorizationId));return {status:'IGNORED',reason:'crystal_wall_disabled'};}
    const windowMs=Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    if(Number(watch.crashStartedAtMs||0)>0&&Date.now()-Number(watch.crashStartedAtMs)>windowMs){
      this.dropCrystalWallWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'tracking_window_elapsed'});return {status:'EXPIRED',reason:'tracking_window_elapsed'};
    }
    if(this.crystalWallContinuationInFlight.has(String(authorizationId))){stats.duplicateSuppressed+=1;return {status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};}
    this.crystalWallContinuationInFlight.add(String(authorizationId));
    let unlock=null;
    const baseEpisode=(decision={},fireCommand={})=>({id:String(authorizationId),systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(watch.eventTicker||ticker),side:'YES',sport:String(watch.sport||'Unknown'),boltAtMs:Number(watch.crashStartedAtMs||watch.authorizedAtMs||Date.now()),boltSnapshot:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authority:CRYSTAL_WALL.strategicEntryAuthority,crashEpisodeId,preCrashPeakCents:Number(watch.preCrashPeakCents||0),crashDepthCents:Number(watch.crashDepthCents||0)},athenaDecision:decision,fireCommand,attackSelected:'Recovery Hunter',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    try{
      if(typeof this.db.acquireHunterTickerLock==='function'){
        unlock=await this.db.acquireHunterTickerLock(s.systemName,`crystal-wall-v3:${String(authorizationId)}`);
        if(!unlock){stats.duplicateSuppressed+=1;return {status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}
      }
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):null;
      const existingState=String(existing?.athenaDecision?.crystalWall?.status||existing?.athenaDecision?.decision||'');
      if(existing?.entryId||['OPENED','EXPIRED','BLOCKED'].includes(existingState)){
        this.dropCrystalWallWatch(String(authorizationId));stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{existingState,entryId:existing?.entryId||null});return {status:'DUPLICATE_SUPPRESSED',reason:'durable_episode_consumed'};
      }
      if(!existing){
        const lineage={version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,status:'CRASH_ARMED',terminal:false,authorizationId:String(authorizationId),crashEpisodeId,ticker,eventTicker:String(watch.eventTicker||ticker),authorizedAtMs:Number(watch.authorizedAtMs||Date.now()),preCrashPeakCents:Number(watch.preCrashPeakCents||0),troughCents:Number(watch.troughCents||0),crashDepthCents:Number(watch.crashDepthCents||0),fixedStakeCents:Number(s.recoveryStakeCents),stakeMultiplier:1,stakeMultiplierAllowed:false,oneEntryPerCrashEpisode:true};
        await this.db.upsertOpportunityEpisode(baseEpisode({decision:'AUTHORIZED',reason:'ci1_crash_authorized_crystal_wall_v3',strategicAuthority:true,crystalWall:lineage}));
        stats.authorized+=1;record('AUTHORIZED',{crashDepthCents:Number(watch.crashDepthCents||0)});
      }
      if(watch.terminal||String(watch.status)==='EXPIRED'){
        const decision={decision:'EXPIRED',reason:'market_final',strategicAuthority:true,crystalWall:{version:CRYSTAL_WALL.version,status:'EXPIRED',terminal:true,authorizationId:String(authorizationId),crashEpisodeId}};
        await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...(existing||{}),athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
        this.dropCrystalWallWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_final'});return {status:'EXPIRED',reason:'market_final'};
      }
      const gate=this.shadowEntryGate();
      if(!gate.allowed){this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),gate.reason,RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:gate.reason});return {status:'WATCHING',reason:gate.reason};}
      // RWG1: durable crash authorization is cheap; REST execution proof is
      // reserved for an actually READY websocket-driven recovery watch.
      if(String(watch.status||'')!=='READY'){stats.watching+=1;record('WATCHING',{reason:'rebound_not_ready',watchStatus:String(watch.status||'')});return {status:'WATCHING',reason:'rebound_not_ready'};}
      // A same-attack position on this exact ticker cannot execute until the
      // existing position closes. Detect that before REST verification so an
      // impossible candidate cannot create quote-rate REST/WS recovery churn.
      const openRows=typeof this.db?.openEntriesByTicker==='function'?await this.db.openEntriesByTicker(s.systemName,ticker).catch(()=>[]):[];
      const coexisting=openRows.filter((e)=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&openLike(e.status)&&String(e.ownerId||s.ownerId)===String(s.ownerId)&&String(e.mode||s.mode)===String(s.mode));
      const sameConcept=coexisting.filter((e)=>String(e.conceptName||'')==='Recovery Hunter');
      if(sameConcept.length){
        this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),'ticker_exposure_active',RECOVERY_WATCH_EXECUTION_GOVERNOR.exposureBlockedRetryMs);
        stats.watching+=1;record('WATCHING',{reason:'ticker_exposure_active',existingEntryIds:sameConcept.map((e)=>String(e.id))});return {status:'WATCHING',reason:'ticker_exposure_active'};
      }
      const parentLike=coexisting.filter((e)=>String(e.conceptName||'')!=='Recovery Hunter');
      const sourceKind=parentLike.length?'OWNED_REAL_POSITION':'TRACKED_MARKET';
      // Use the already sequence-aligned websocket quote for the strategic
      // READY recheck. Strategy.prepareEntryExecution performs the one required
      // fresh REST market+book proof at the actual execution boundary.
      const cached=this.market?.getQuote?.(ticker)||null;
      if(!cached||cached.bookInvalid===true){this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),'canonical_book_not_ready',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'canonical_book_not_ready'});return {status:'WATCHING',reason:'canonical_book_not_ready'};}
      const q={...cached,ticker,eventTicker:String(cached.eventTicker||cached.ticker||ticker)};
      const status=String(q.status||'').toLowerCase();
      if(String(q.eventTicker||ticker)!==String(watch.eventTicker||ticker)){stats.blocked+=1;record('BLOCKED',{reason:'event_identity_mismatch'});return {status:'BLOCKED',reason:'event_identity_mismatch'};}
      if(status!=='active'||Boolean(q.result)){
        const decision={decision:'EXPIRED',reason:'market_not_active',strategicAuthority:true,crystalWall:{version:CRYSTAL_WALL.version,status:'EXPIRED',terminal:true,authorizationId:String(authorizationId),crashEpisodeId}};
        await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...(existing||{}),athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
        this.dropCrystalWallWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_not_active'});return {status:'EXPIRED',reason:'market_not_active'};
      }
      const signal=crystalWallSignalState(watch,q,s,Date.now());
      const updated={...watch,...signal,updatedAtMs:Date.now(),status:signal.qualified?'READY':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};
      this.crystalWallWatches.set(String(authorizationId),updated);
      if(!signal.qualified){stats.watching+=1;record('WATCHING',{reason:signal.reason,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});return {status:'WATCHING',reason:signal.reason};}
      const executionWatch={...updated,...signal,sourceKind,coexistingEntryIds:parentLike.map((e)=>String(e.id))};
      stats.attempted+=1;if(sourceKind==='OWNED_REAL_POSITION')stats.ownedSource+=1;else stats.trackedSource+=1;record('ATTEMPTED',{sourceKind,bidCents:signal.bidCents,askCents:signal.askCents,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});
      const opened=await this.strategy.executeCrystalWallAttack(q,executionWatch);
      if(!opened){this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),'hard_safety_liquidity_or_capacity_blocked',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'hard_safety_liquidity_or_capacity_blocked',sourceKind});return {status:'WATCHING',reason:'hard_safety_liquidity_or_capacity_blocked'};}
      this.dropCrystalWallWatch(String(authorizationId));
      stats.opened+=1;record('OPENED',{sourceKind,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0)});
      const lineage=structuredClone(opened.entryConfig?.crystalWall||executionWatch);
      const openedDecision={decision:'OPENED',reason:'crystal_wall_v3_crash_rebound_opened',strategicAuthority:true,crystalWall:{...lineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
      const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):existing;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision,structuredClone(opened.entryConfig?.crystalWallFire||{})),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.crystalWallFire||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:'Recovery Hunter',updatedAtMs:Date.now()}).catch(()=>{});
      await this.db.audit('info','crystal_wall_v3_opened',{authorizationId:String(authorizationId),crashEpisodeId,ticker,sourceKind,coexistingEntryIds:executionWatch.coexistingEntryIds,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0),troughCents:Number(signal.troughCents||0),reboundCents:Number(signal.reboundCents||0),fixedStakeCents:Number(s.recoveryStakeCents),stakeMultiplier:1}).catch(()=>{});
      return {status:'OPENED',authorizationId:String(authorizationId),entry:opened};
    }catch(error){
      stats.blocked+=1;record('BLOCKED',{reason:'crystal_wall_v3_exception',message:String(error?.message||error)});await this.db.audit('error','crystal_wall_v3_failed',{authorizationId:String(authorizationId),crashEpisodeId,ticker,message:String(error?.message||error)}).catch(()=>{});return {status:'BLOCKED',reason:'crystal_wall_v3_exception'};
    }finally{
      if(unlock)await unlock().catch(()=>{});
      this.crystalWallContinuationInFlight.delete(String(authorizationId));
    }
  }

  async hydrateCrystalWallV3() {
    this.crystalWallWatches=new Map();
    this.ci1CloneWatches=new Map();
    if(this.settings?.recoveryHunterEnabled!==true||typeof this.db?.opportunityEpisodes!=='function')return;
    const windowMs=Math.max(1,Number(this.settings.recoveryTrackingHours||24))*3600000;
    const sinceMs=Date.now()-windowMs;
    const episodes=await this.db.opportunityEpisodes(this.settings.systemName,{limit:1000,trackingComplete:false,sinceMs}).catch(()=>[]);
    for(const ep of episodes||[]){
      const cw=ep?.athenaDecision?.crystalWall;
      if(String(cw?.version||'')!==CRYSTAL_WALL.version||String(cw?.policyRevision||CRYSTAL_WALL.policyRevision)!==CRYSTAL_WALL.policyRevision)continue;
      const state=String(cw?.status||ep?.athenaDecision?.decision||'').toUpperCase();
      if(ep?.entryId||cw?.terminal===true||['OPENED','EXPIRED','BLOCKED'].includes(state))continue;
      const crashEpisodeId=String(cw?.crashEpisodeId||ep?.boltSnapshot?.crashEpisodeId||'');
      const ticker=String(ep?.ticker||cw?.ticker||'');
      if(!crashEpisodeId||!ticker)continue;
      const authorizationId=String(cw?.authorizationId||ep.id||`CRYSTAL-WALL-V3:${crashEpisodeId}`);
      const watch={
        authorizationId,crashEpisodeId,ticker,eventTicker:String(ep?.eventTicker||cw?.eventTicker||ticker),sport:String(ep?.sport||'Unknown'),
        crashStartedAtMs:Number(ep?.boltAtMs||cw?.crashStartedAtMs||0),authorizedAtMs:Number(cw?.authorizedAtMs||ep?.updatedAtMs||Date.now()),
        preCrashPeakCents:Number(cw?.preCrashPeakCents||ep?.boltSnapshot?.preCrashPeakCents||0),troughCents:Number(cw?.troughCents||0),
        troughAtMs:Number(cw?.troughAtMs||0),crashDepthCents:Number(cw?.crashDepthCents||ep?.boltSnapshot?.crashDepthCents||0),
        reboundCents:Number(cw?.reboundCents||0),upwardTicks:Number(cw?.upwardTicks||0),lastBidCents:Number(cw?.lastBidCents||cw?.troughCents||0),
        lastAttemptQueuedAtMs:0,status:'RESTART_REHYDRATED',sourceKind:String(cw?.sourceKind||'TRACKED_MARKET'),coexistingEntryIds:[...(cw?.coexistingEntryIds||[])].map(String),
      };
      this.crystalWallWatches.set(authorizationId,watch);
      if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);
    }
    const stats=this.crystalWallContinuationRuntime();
    stats.lastEvent=this.crystalWallWatches.size?{status:'RESTART_REHYDRATED',atMs:Date.now(),activeWatches:this.crystalWallWatches.size}:stats.lastEvent;
  }

  rememberAnotherDimension(entry) {
    if(!entry?.id)return;
    if(!(this.anotherDimensionRecent instanceof Map))this.anotherDimensionRecent=new Map();
    if(!(this.anotherDimensionOpenByTicker instanceof Map))this.anotherDimensionOpenByTicker=new Map();
    this.anotherDimensionRecent.delete(String(entry.id));
    this.anotherDimensionRecent.set(String(entry.id),entry);
    while(this.anotherDimensionRecent.size>ANOTHER_DIMENSION.maximumRecentResults){
      const oldest=this.anotherDimensionRecent.keys().next().value;
      this.anotherDimensionRecent.delete(oldest);
    }
    if(openLike(entry.status))this.anotherDimensionOpenByTicker.set(String(entry.ticker),entry);
    else if(this.anotherDimensionOpenByTicker.get(String(entry.ticker))?.id===entry.id)this.anotherDimensionOpenByTicker.delete(String(entry.ticker));
  }

  async hydrateAnotherDimension() {
    this.anotherDimensionOpenByTicker=new Map();
    this.anotherDimensionRecent=new Map();
    this.anotherDimensionRuntime=new Map();
    this.geminiOpenAttemptBookMs=new Map();
    if(typeof this.db?.entriesByConcept!=='function')return;
    const rows=await this.db.entriesByConcept(this.settings.systemName,'Another Dimension',{limit:ANOTHER_DIMENSION.maximumRecentResults}).catch(()=>[]);
    for(const entry of (rows||[]).slice().reverse())this.rememberAnotherDimension(entry);
  }

  anotherDimensionRuntimeState(entry) {
    const id=String(entry?.id||'');
    if(!id)return null;
    if(!(this.anotherDimensionRuntime instanceof Map))this.anotherDimensionRuntime=new Map();
    let state=this.anotherDimensionRuntime.get(id);
    if(!state){
      state={confirmations:0,firstConfirmationAtMs:0,lastBookMs:0,peakPriceCents:Number(entry.entryPriceCents||0),lowestPriceAfterEntryCents:Number(entry.entryPriceCents||0),maeCents:Number(entry.maeCents||0),maeAtMs:entry.maeAtMs||null,lastEvaluation:null};
      this.anotherDimensionRuntime.set(id,state);
    }
    return state;
  }

  evaluateAnotherDimensionExit(entry,q,{now=Date.now(),finalize=false}={}) {
    if(!entry?.id||entry.conceptName!=='Another Dimension'||!openLike(entry.status)||!q)return null;
    const state=this.anotherDimensionRuntimeState(entry);
    const count=Math.max(1,Number(entry.remainingCount??entry.count??0));
    const entryPrice=Number(entry.entryPriceCents||0);
    const entryFee=Number(entry.entryFeeCents||0);
    const bid=Number(q.yesBid||0);
    const required=Math.max(1,Math.floor(Number(entry.entryConfig?.virtualInfinity?.requiredFreshConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations)));
    const targetPerContract=Math.max(0.01,Number(entry.entryConfig?.virtualInfinity?.minimumNetPerOriginalContractCents??ANOTHER_DIMENSION.minimumNetPerOriginalContractCents));
    const targetNet=targetPerContract*count;
    const setEvaluation=(extra={})=>{
      state.lastEvaluation={
        universe:'Gemini',attack:'Another Dimension',evaluatedAtMs:now,entryPriceCents:entryPrice,
        currentBidCents:bid,requiredCount:count,confirmations:Number(state.confirmations||0),requiredConfirmations:required,
        targetNetPerOriginalContractCents:targetPerContract,targetNetCents:targetNet,
        ...extra,
      };
      return state.lastEvaluation;
    };
    if(bid>0){
      if(bid>state.peakPriceCents)state.peakPriceCents=bid;
      if(!(state.lowestPriceAfterEntryCents>0)||bid<state.lowestPriceAfterEntryCents){state.lowestPriceAfterEntryCents=bid;state.maeCents=Math.max(0,entryPrice-bid);state.maeAtMs=now;}
    }
    const status=String(q.status||'').toLowerCase();
    if(Boolean(q.result)||FINAL_STATUSES.has(status)){
      const payout=String(q.result||'').toLowerCase()==='yes'?100:0;
      const pnl=(payout-entryPrice)*count-entryFee;
      setEvaluation({action:'CLOSE',holdReason:null,settlement:true,fullPositionExecutable:true,executableCount:count,executableAverageBidCents:payout,executableNetPnlCents:pnl,bookMs:Number(q.updatedAtMs||now)});
      return{action:'CLOSE',closeReason:pnl>0?ANOTHER_DIMENSION.profitableCloseReason:ANOTHER_DIMENSION.lossCloseReason,exitPriceCents:payout,exitAverageCents:payout,exitFeeCents:0,pnlCents:pnl,bookMs:Number(q.updatedAtMs||now),peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,settlement:true};
    }
    const cfg=entry.entryConfig?.virtualInfinity||{};
    const maxBookAge=Math.max(100,Number(cfg.maximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs));
    const bookAge=typeof this.market?.bookAgeMs==='function'?this.market.bookAgeMs(entry.ticker,now):Infinity;
    const quoteAge=typeof this.market?.quoteAgeMs==='function'?this.market.quoteAgeMs(entry.ticker,now):Infinity;
    if(bookAge>maxBookAge||quoteAge>maxBookAge||q.bookInvalid){
      setEvaluation({action:'HOLD',holdReason:q.bookInvalid?'invalid_book':'stale_quote_or_book',bookAgeMs:Number.isFinite(bookAge)?bookAge:null,quoteAgeMs:Number.isFinite(quoteAge)?quoteAge:null,maximumBookAgeMs:maxBookAge,fullPositionExecutable:false,executableCount:0,executableAverageBidCents:null,executableNetPnlCents:null});
      return null;
    }
    const executable=this.market?.executableBid?.(entry.ticker,count);
    const executableCount=Math.max(0,Number(executable?.filled||0));
    const fullExecutable=Boolean(executable?.full)&&executableCount+1e-9>=count&&Number.isFinite(Number(executable?.avgCents));
    if(!fullExecutable){
      state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;
      setEvaluation({action:'HOLD',holdReason:'insufficient_full_position_executable_depth',bookAgeMs:bookAge,quoteAgeMs:quoteAge,maximumBookAgeMs:maxBookAge,fullPositionExecutable:false,executableCount,executableAverageBidCents:Number.isFinite(Number(executable?.avgCents))?Number(executable.avgCents):null,executableNetPnlCents:null});
      return null;
    }
    const avgBid=Number(executable.avgCents),bestBid=Number(executable.bestCents??bid);
    const bookMs=Number(this.market?.getBook?.(entry.ticker)?.updatedAtMs||q.updatedAtMs||now);
    const exitFee=String(entry.mode||this.settings.mode||'SIMULATION').toUpperCase()==='LIVE'
      ? kalshiGeneralTakerFeeEstimateCents({count,priceCents:Math.max(0,Math.min(100,avgBid))})
      : Math.max(0,Number(entry.entryConfig?.simFeeCents??this.settings.simFeeCents??0))*count;
    const pnl=(avgBid-entryPrice)*count-entryFee-exitFee;
    const danger=Number(entry.entryConfig?.aurora?.dangerPriceCents??entry.stopPriceCents??0);
    if(danger>0&&bestBid<=danger+1e-9){
      state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;
      setEvaluation({action:'CLOSE',holdReason:null,closeReason:ANOTHER_DIMENSION.lossCloseReason,bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,auroraTouch:true,confirmations:0});
      return{action:'CLOSE',closeReason:ANOTHER_DIMENSION.lossCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,auroraTouch:true};
    }
    if(pnl+1e-9<targetNet){
      state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;
      setEvaluation({action:'HOLD',holdReason:'below_plus_one_net_target',bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:0});
      return null;
    }
    const windowMs=Math.max(250,Number(cfg.confirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs));
    if(finalize){
      const confirmationFresh=state.confirmations>=required&&state.firstConfirmationAtMs>0&&now-state.firstConfirmationAtMs<=windowMs;
      if(!confirmationFresh){
        setEvaluation({action:'HOLD',holdReason:'profit_confirmation_expired_before_commit',bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:Number(state.confirmations||0)});
        return null;
      }
      setEvaluation({action:'CLOSE',holdReason:null,closeReason:ANOTHER_DIMENSION.profitableCloseReason,bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:Number(state.confirmations||0),finalRevalidation:true});
      return{action:'CLOSE',closeReason:ANOTHER_DIMENSION.profitableCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,confirmations:state.confirmations,finalRevalidation:true};
    }
    if(bookMs===state.lastBookMs){
      setEvaluation({action:'HOLD',holdReason:'waiting_for_fresh_confirmation_book',bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:Number(state.confirmations||0)});
      return null;
    }
    if(!state.firstConfirmationAtMs||now-state.firstConfirmationAtMs>windowMs){state.confirmations=1;state.firstConfirmationAtMs=now;}
    else state.confirmations+=1;
    state.lastBookMs=bookMs;
    if(state.confirmations<required){
      setEvaluation({action:'HOLD',holdReason:`profit_confirmation_${state.confirmations}_of_${required}`,bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:state.confirmations});
      return null;
    }
    setEvaluation({action:'CLOSE_PENDING_COMMIT',holdReason:null,bookAgeMs:bookAge,quoteAgeMs:quoteAge,bookMs,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,confirmations:state.confirmations});
    return{action:'CLOSE',closeReason:ANOTHER_DIMENSION.profitableCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,confirmations:state.confirmations};
  }

  observeAnotherDimensionQuote(q) {
    if(!q?.ticker||!this.strategy)return;
    const ticker=String(q.ticker);
    const sources=this.activeCosmosByTicker?.get?.(ticker)||[];
    for(const source of sources){
      const id=String(source?.id||'');if(!id)continue;
      if(!(this.anotherDimensionSourcePeaks instanceof Map))this.anotherDimensionSourcePeaks=new Map();
      const prior=Math.max(Number(source.entryPriceCents||0),Number(source.peakPriceCents||0),Number(this.anotherDimensionSourcePeaks.get(id)||0));
      const next=Math.max(prior,Number(q.yesBid||0));
      this.anotherDimensionSourcePeaks.set(id,next);
    }
    const open=this.anotherDimensionOpenByTicker.get(ticker);
    if(open&&openLike(open.status)){
      const decision=this.evaluateAnotherDimensionExit(open,q);
      if(decision?.action==='CLOSE'){
        this.anotherDimensionQueue.enqueue(`close:${open.id}`,async()=>{
          const durable=typeof this.db?.entryById==='function'?await this.db.entryById(open.id).catch(()=>null):open;
          if(!durable||!openLike(durable.status)||durable.conceptName!=='Another Dimension')return;
          // Re-prove the market/book at commit time, but do NOT demand a third
          // book merely because the second qualifying book already completed the
          // configured confirmation sequence. R62 re-ran the normal evaluator on
          // the same book and accidentally canceled every profitable close.
          let freshQ=this.market?.getQuote?.(ticker)||q;
          if(typeof this.market?.verifyTickerSnapshot==='function'||typeof this.market?.refreshTickerVerified==='function'){
            const refreshed=await this.freshExecutionSnapshot(ticker);
            if(!refreshed?.marketFresh||!refreshed?.bookFresh||!refreshed?.quote)return;
            freshQ=refreshed.quote;
          }
          const finalDecision=this.evaluateAnotherDimensionExit(durable,freshQ,{finalize:true});
          if(finalDecision?.action!=='CLOSE')return;
          const closed=await this.strategy.closeAnotherDimensionShadow(durable,finalDecision);
          if(closed)this.rememberAnotherDimension(closed);
        });
      }
      return;
    }
    if(this.settings?.geminiEnabled!==true)return;
    if(!sources.length)return;
    // Same visible market book should produce at most one durable Gemini-open
    // attempt. This bounds DB/lock churn without changing the qualification.
    const bookMs=Number(this.market?.getBook?.(ticker)?.updatedAtMs||q.updatedAtMs||0);
    if(bookMs>0&&Number(this.geminiOpenAttemptBookMs?.get?.(ticker)||0)===bookMs)return;
    for(const source of sources){
      const peak=this.anotherDimensionSourcePeaks.get(String(source.id));
      const qualification=anotherDimensionQualification(source,q,this.settings,{sourcePeakCents:peak});
      if(!qualification.ok)continue;
      if(bookMs>0){
        if(!(this.geminiOpenAttemptBookMs instanceof Map))this.geminiOpenAttemptBookMs=new Map();
        this.geminiOpenAttemptBookMs.set(ticker,bookMs);
        while(this.geminiOpenAttemptBookMs.size>2048)this.geminiOpenAttemptBookMs.delete(this.geminiOpenAttemptBookMs.keys().next().value);
      }
      this.anotherDimensionStats.qualified+=1;
      this.anotherDimensionStats.lastEvent={status:'QUALIFIED',atMs:Date.now(),universe:'Gemini',attack:'Another Dimension',sourceTradeId:source.id,ticker,riseCents:qualification.riseCents,pullbackCents:qualification.pullbackCents};
      this.anotherDimensionQueue.enqueue(`open:${ticker}`,async()=>{
        if(this.anotherDimensionOpenByTicker.has(ticker))return;
        const durable=typeof this.db?.entryById==='function'?await this.db.entryById(source.id).catch(()=>null):source;
        if(!durable||!openLike(durable.status)||!ACTIVE_FEEDER_CONCEPTS.has(String(durable.conceptName||'')))return;
        let unlock=null;
        try{
          if(typeof this.db?.acquireHunterTickerLock==='function')unlock=await this.db.acquireHunterTickerLock(this.settings.systemName,`gemini-another-dimension:${ticker}`);
          if(typeof this.db?.acquireHunterTickerLock==='function'&&!unlock){this.anotherDimensionStats.blocked+=1;return;}
          const freshQ=this.market?.getQuote?.(ticker)||q;
          const opened=await this.strategy.createAnotherDimensionShadow(durable,freshQ,{sourcePeakCents:this.anotherDimensionSourcePeaks.get(String(durable.id))});
          if(opened){this.anotherDimensionStats.opened+=1;this.rememberAnotherDimension(opened);this.anotherDimensionStats.lastEvent={status:'OPENED',atMs:Date.now(),universe:'Gemini',attack:'Another Dimension',entryId:opened.id,sourceTradeId:opened.sourceTradeId,ticker};}
        }finally{if(unlock)await unlock().catch(()=>{});}
      });
      break;
    }
  }

  // Compatibility surface only: SJA2 is never authorized by a Gemini /
  // Another Dimension close. Retaining this inert callback makes old event
  // wiring harmless during rolling deployments.
  queueJusticeArrowContinuation(_entry) { return false; }
  async handleJusticeArrowContinuation() { return {status:'IGNORED',reason:'justice_arrow_v2_independent_crash_authority'}; }

  justiceArrowRuntime() {
    if(!(this.justiceArrowInFlight instanceof Set))this.justiceArrowInFlight=new Set();
    if(!(this.justiceArrowWatches instanceof Map))this.justiceArrowWatches=new Map();
    if(!this.justiceArrowStats||typeof this.justiceArrowStats!=='object')this.justiceArrowStats={version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,modeMismatchBlocked:0,lastEvent:null};
    return this.justiceArrowStats;
  }

  dropJusticeArrowWatch(authorizationId) {
    if(!(this.justiceArrowWatches instanceof Map))return null;
    const id=String(authorizationId||''),prior=this.justiceArrowWatches.get(id)||null;
    if(!prior)return null;
    this.justiceArrowWatches.delete(id);
    const ticker=String(prior?.ticker||'');
    if(ticker&&this.recoveryPriorityTickers instanceof Set){
      const cwStill=[...(this.crystalWallWatches||new Map()).values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');
      const jaStill=[...this.justiceArrowWatches.values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');
      if(!cwStill&&!jaStill)this.recoveryPriorityTickers.delete(ticker);
    }
    return prior;
  }

  observeJusticeArrowQuote(q, crashState) {
    const s=this.settings||{};
    if(s.justiceArrowEnabled!==true||!q?.ticker)return false;
    const ticker=String(q.ticker),now=Date.now();
    const minCrash=Math.max(0,Math.floor(Number.isFinite(Number(s.justiceArrowMinCrashCents))?Number(s.justiceArrowMinCrashCents):SAGITTARIUS_JUSTICE_ARROW.defaultMinCrashCents));
    let newAuthorizationId=null;
    if(crashState?.episodeId){
      const peak=Math.max(0,Number(crashState.preCrashPeakCents||0));
      const trough=Math.max(0,Number(crashState.troughCents||0));
      const crashDepth=Math.max(Number(crashState.crashDepthCents||0),peak>0&&trough>0?peak-trough:0);
      if(crashDepth+1e-9>=minCrash){
        const crashEpisodeId=String(crashState.episodeId),authorizationId=`JUSTICE-ARROW-V2:${crashEpisodeId}`;
        newAuthorizationId=authorizationId;
        let watch=this.justiceArrowWatches.get(authorizationId);
        if(!watch){
          for(const [id,prior] of this.justiceArrowWatches){
            if(String(prior?.ticker||'')===ticker&&String(id)!==authorizationId)this.dropJusticeArrowWatch(id);
          }
          watch={authorizationId,crashEpisodeId,ticker,eventTicker:String(q.eventTicker||q.ticker),sport:String(crashState.sport||'Unknown'),
            crashStartedAtMs:Number(crashState.crashStartedAtMs||crashState.startedAtMs||now),authorizedAtMs:now,preCrashPeakCents:peak,
            troughCents:trough||Number(q.yesBid||0),troughAtMs:Number(crashState.troughAtMs||now),crashDepthCents:crashDepth,
            upwardTicks:0,lastBidCents:Number(q.yesBid||0),lastAttemptQueuedAtMs:0,status:'CRASH_ARMED'};
          this.justiceArrowWatches.set(authorizationId,watch);
          const stats=this.justiceArrowRuntime();stats.eligible+=1;stats.lastEvent={status:'CRASH_ARMED',atMs:now,authorizationId,crashEpisodeId,ticker,crashDepthCents:crashDepth};
          if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);
        }
      }
    }

    // SJA2 has the same continuity contract as Crystal Wall: after a crash is
    // armed, CI1 may reset its research state without erasing the live recovery
    // watch. This is essential when liquidity/spread blocks the first rebound.
    const watches=[...this.justiceArrowWatches.values()].filter((w)=>String(w?.ticker||'')===ticker);
    for(const prior of watches){
      const signal=justiceArrowSignalState(prior,q,s,now);
      const watch={...prior,...signal,authorizationId:String(prior.authorizationId),crashEpisodeId:String(prior.crashEpisodeId),ticker,eventTicker:String(q.eventTicker||prior.eventTicker||ticker),preCrashPeakCents:Math.max(Number(prior.preCrashPeakCents||0),Number(crashState?.preCrashPeakCents||0)),updatedAtMs:now,status:signal.terminal?'EXPIRED':signal.qualified?'READY':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};
      if(!signal.qualified&&!signal.terminal){watch.retryNotBeforeMs=0;watch.retryReason=null;}
      this.justiceArrowWatches.set(String(watch.authorizationId),watch);
      const isNew=String(watch.authorizationId)===String(newAuthorizationId)&&Number(prior.lastAttemptQueuedAtMs||0)===0;
      if(this.recoveryWatchShouldQueue(prior,signal,now,{isNew})){
        this.stampRecoveryWatchAttempt(this.justiceArrowWatches,String(watch.authorizationId),signal,now);
        this.queueJusticeArrowWatch(String(watch.authorizationId));
      }
    }
    while(this.justiceArrowWatches.size>RECOVERY_WATCH_EXECUTION_GOVERNOR.maximumWatchesPerAttack){const oldest=this.justiceArrowWatches.keys().next().value;this.dropJusticeArrowWatch(oldest);}
    return watches.length>0;
  }

  // SE2-R5 post-Aurora recovery watches. Entry is impossible until the watch
  // and every consumed quote have been durably committed with revision CAS.
  // Completed/expired parents retain a terminal DB row; restart never re-arms.
  starlightRecoveryRuntime(){
    if(!(this.starlightRecoveryWatches instanceof Map))this.starlightRecoveryWatches=new Map();
    if(!(this.starlightRecoveryInFlight instanceof Set))this.starlightRecoveryInFlight=new Set();
    if(!(this.starlightRecoveryQuoteJobs instanceof Map))this.starlightRecoveryQuoteJobs=new Map();
    if(!(this.starlightRecoveryPendingQuotes instanceof Map))this.starlightRecoveryPendingQuotes=new Map();
    if(!(this.starlightRecoveryArmWrites instanceof Map))this.starlightRecoveryArmWrites=new Map();
    if(!(this.starlightKnownParents instanceof Set))this.starlightKnownParents=new Set();
    if(!this.starlightRecoveryStats)this.starlightRecoveryStats={armed:0,qualified:0,opened:0,blocked:0,expired:0,selfChainBlocked:0,orphanReconciliations:0,orphansArmed:0,pendingQuoteReorders:0,pendingQuoteOverflows:0,lastEvent:null,lastOrphanReconciliation:null,lastOrphanError:null,lastRehydrateError:null};
    return this.starlightRecoveryStats;
  }

  starlightScopeMatches(w){
    const s=this.settings||{};
    return String(w.systemName)===String(s.systemName)
      &&String(w.ownerId)===String(s.ownerId)
      &&String(w.mode)===String(s.mode)
      &&Number(w.resetEpoch||0)===Number(s.resetTimestampMs||0);
  }

  armStarlightRecovery(entry){
    // New shadows enter through acceptCommittedShadowStop ONLY. Legacy real
    // watches already in PostgreSQL remain recoverable; do not mint new watches
    // from pre-cutover rows or caller-supplied closed-record JSON.
    if(isShadowSaintEntry(entry) || this.db?.shadowArchitectureRequired===true)return false;
    const s=this.settings||{},stats=this.starlightRecoveryRuntime();
    if(s.crashRecoveryHunterEnabled!==true||!entry?.id||!entry?.ticker)return false;
    const family=executionMarketFamilyExclusion(entry?.ticker,s,{concept:entry?.conceptName});
    if(family.blocked){
      void this.db?.audit?.('info','starlight_arm_market_family_blocked',{parentEntryId:entry?.id,ticker:entry?.ticker,reason:family.reason,primaryRule:family.primaryRule}).catch?.(()=>{});
      return false;
    }
    const concept=String(entry.conceptName||''),reason=String(entry.closeReason||'');
    if(concept==='Crash Recovery Hunter'){stats.selfChainBlocked++;return false;}
    // LP-SCALEIN-V1 hard rule: a Lightning Plasma loss never arms Starlight and
    // never creates a follow-up of any kind.
    if(!lightningPlasmaLossMayArmStarlight(entry)){
      stats.lpLossNoFollowUp=(stats.lpLossNoFollowUp||0)+1;
      return false;
    }
    if(String(entry.status)!=='closed'||reason!=='hard_stop_loss'||!ACTIVE_PORTFOLIO_CONCEPTS.has(concept)||entry.archived===true)return false;
    if(String(entry.mode)!==String(s.mode)||String(entry.systemName)!==String(s.systemName)
      ||String(entry.ownerId)!==String(s.ownerId))return false;
    const now=Date.now(),closedAt=Number(entry.closedAtMs||0),epoch=Number(s.resetTimestampMs||0);
    const obsMin=Math.max(0,Math.min(1000,Math.round(Number(s.crashRecoveryHunterObservationMinutes)||0)));
    // SE2-R6: after a stop-loss, the watch's lifetime is governed by market
    // finality, not a hidden six-hour cap. The configured observation only
    // determines EARLIEST eligibility; it does not prescribe an expiry.
    if(!Number.isFinite(closedAt)||closedAt<=0||closedAt>now+2000||closedAt<epoch)return false;
    const id=`STARLIGHT-RECOVERY:${entry.id}`;
    if(this.starlightKnownParents.has(id)||this.starlightRecoveryWatches.has(id))return false;
    const stopPrice=Number(entry.exitPriceCents??entry.currentPriceCents);
    if(!Number.isFinite(stopPrice)||stopPrice<0||stopPrice>100)return false;
    this.starlightKnownParents.add(id);
    const shadowParent=entry?.entryConfig?.executionClass===SHADOW_SAINT_ARCHITECTURE.classification;
    const watch={authorizationId:id,parentEntryId:String(entry.id),parentConcept:concept,
      authorization:shadowParent?SHADOW_SAINT_ARCHITECTURE.authorization:'REAL_PARENT_HARD_STOP',
      systemName:String(s.systemName),ownerId:String(s.ownerId),mode:String(s.mode),resetEpoch:epoch,
      ticker:String(entry.ticker),eventTicker:String(entry.eventTicker||entry.ticker),sport:String(entry.sport||'Unknown'),
      armedAtMs:closedAt,releaseAtMs:closedAt+obsMin*60_000,expiresAtMs:Number.MAX_SAFE_INTEGER,
      stopPriceCents:stopPrice,peakSinceArmCents:stopPrice,troughSinceArmCents:stopPrice,
      crashConfirmedAtMs:0,upwardTicks:0,lastBidCents:stopPrice,lastQuoteAtMs:0,
      status:'ARMED',attempts:0,revision:0,updatedAtMs:now};
    this.starlightRecoveryWatches.set(id,watch);
    const canPersist=typeof this.db?.insertStarlightWatch==='function';
    const persist=canPersist?this.db.insertStarlightWatch(watch).then(async(saved)=>{
      // A timeout can happen AFTER the insert committed. Read by its exact
      // scoped identity rather than inventing a second parent watch.
      const existing=saved||await this.db.starlightWatch?.(watch);
      if(!existing){
        const active=this.starlightRecoveryWatches.get(id);
        if(active)this.starlightRecoveryWatches.set(id,{...active,status:'PERSIST_FAILED'});
        return false;
      }
      const active=this.starlightRecoveryWatches.get(id);
      if(active){
        if(['CONSUMED','BLOCKED','EXPIRED'].includes(String(existing.status)))this.starlightRecoveryWatches.delete(id);
        else this.starlightRecoveryWatches.set(id,{...existing.watch,revision:Number(existing.revision)});
      }
      return true;
    }).catch((error)=>{
      const active=this.starlightRecoveryWatches.get(id);
      if(active)this.starlightRecoveryWatches.set(id,{...active,status:'PERSIST_FAILED'});
      void this.db?.audit?.('error','starlight_arm_persistence_failed',{authorizationId:id,error:String(error?.message||error)}).catch?.(()=>{});
      return false;
    }):Promise.resolve(false);
    this.starlightRecoveryArmWrites.set(id,persist);
    void persist.finally(()=>this.starlightRecoveryArmWrites.delete(id));
    stats.armed++;
    stats.lastEvent={status:'ARMED',atMs:now,authorizationId:id,ticker:entry.ticker,parentConcept:concept};
    if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(String(entry.ticker));
    if(s.crashRecoveryHunterLinkEnabled===true){
      this.starlightLinkJob=(async()=>{
        const write=this.starlightRecoveryArmWrites?.get(id);
        // RCV2: initial Link admission uses the same ticker lane as durable
        // recovery and resumed seats. The previous direct call bypassed RCV1
        // and could collide with another same-ticker recovery parent.
        if(write && !(await write))return {status:'WATCHING',reason:'watch_persistence_pending'};
        return this.scheduleStarlightLink(id)
          ?{status:'QUEUED',reason:'ticker_recovery_lane_claimed'}
          :{status:'WATCHING',reason:'ticker_recovery_lane_busy'};
      })().catch((error)=>{
        void this.db?.audit?.('error','starlight_link_failed',{authorizationId:id,message:String(error?.message||error)}).catch?.(()=>{});
        return {status:'ERROR',reason:String(error?.message||error)};
      });
    }
    return true;
  }


  starlightChildMatchesWatch(child,watch){
    if(!child?.id||!watch)return false;
    const epoch=isShadowSaintEntry(child)?child.shadowEpoch:child.entryConfig?.starlightRecovery?.resetEpoch;
    return child.conceptName==='Crash Recovery Hunter' && child.sourceTradeId===watch.parentEntryId
      && child.systemName===watch.systemName && child.ownerId===watch.ownerId && child.mode===watch.mode
      && child.ticker===watch.ticker && child.eventTicker===watch.eventTicker
      && Number(epoch)===Number(watch.resetEpoch);
  }

  // RCV1: a single Starlight recovery admission lane per exact ticker and
  // execution scope.  A parent-level in-flight set alone allowed several
  // independent Athena stops to contend repeatedly for the same seat-1
  // StrategyEngine lock.  Queue the retry at the caller rather than relaxing
  // that lock, its atomic database fence, or Multiply's parent/seat authority.
  claimStarlightRecoveryTicker(watch){
    if(!watch?.ticker)return null;
    if(!(this.starlightRecoveryTickerOwners instanceof Map))this.starlightRecoveryTickerOwners=new Map();
    const key=JSON.stringify([watch.systemName,watch.ownerId,watch.mode,Number(watch.resetEpoch),watch.ticker]);
    if(this.starlightRecoveryTickerOwners.has(key)){
      const stats=this.starlightRecoveryRuntime();
      stats.tickerBusyDeferrals=Number(stats.tickerBusyDeferrals||0)+1;
      return null;
    }
    const token={authorizationId:String(watch.authorizationId||''),startedAtMs:Date.now()};
    this.starlightRecoveryTickerOwners.set(key,token);
    return ()=>{if(this.starlightRecoveryTickerOwners.get(key)===token)this.starlightRecoveryTickerOwners.delete(key);};
  }

  starlightGroupClaim(watch,settings=this.settings){
    // Freeze one group's seat budget and operator card. Later changes cannot
    // retroactively grant more seats to the same parent.
    return {virtualGroupVersion:STARLIGHT_SHADOW_VERSION,
      maximumSeats:watch.maximumSeats??attackMultiplySeats(settings,'Crash Recovery Hunter'),
      groupSettingsHash:watch.groupSettingsHash??executionSettingsHash(settings)};
  }

  async resumeStarlightShadowGroups({maximum=16,seatBudget=16}={}){
    if(!this.shadowEntryGate().allowed||this.settings.crashRecoveryHunterEnabled!==true)return 0;
    this.starlightRecoveryRuntime();
    const pending=[...this.starlightRecoveryWatches.values()].filter(w=>
      w.virtualGroupVersion===STARLIGHT_SHADOW_VERSION && w.status==='EXECUTING' && this.starlightScopeMatches(w));
    if(!pending.length)return 0;
    const offset=Number(this.starlightShadowResumeCursor||0)%pending.length;
    const batch=Array.from({length:Math.min(maximum,pending.length)},(_,i)=>pending[(offset+i)%pending.length]);
    this.starlightShadowResumeCursor=(offset+batch.length)%pending.length;
    let admitted=0;
    for(const candidate of batch){
      if(admitted>=seatBudget)break;
      const id=candidate.authorizationId;
      if(this.starlightRecoveryInFlight.has(id)||this.starlightRecoveryQuoteJobs?.has(id))continue;
      if(Number(candidate.retryNotBeforeMs||0)>Date.now())continue;
      const releaseTicker=this.claimStarlightRecoveryTicker(candidate);
      if(!releaseTicker)continue;
      this.starlightRecoveryInFlight.add(id);
      try{
        const row=await this.db.starlightWatch(candidate);
        if(!row||row.status!=='EXECUTING'){if(row&&['CONSUMED','BLOCKED','EXPIRED'].includes(row.status))this.starlightRecoveryWatches.delete(id);continue;}
        const watch={...row.watch,status:row.status,revision:Number(row.revision)};
        if(watch.virtualGroupVersion!==STARLIGHT_SHADOW_VERSION||!this.starlightScopeMatches(watch))continue;
        this.starlightRecoveryWatches.set(id,watch);
        const settings=this.settings;
        if(watch.groupSettingsHash!==executionSettingsHash(settings)){
          const blocked={...watch,status:'BLOCKED',lastAttemptReason:'aps2_group_operator_card_changed'};
          const saved=await this.db.updateStarlightWatch(blocked,watch.revision);
          if(saved)this.starlightRecoveryWatches.delete(id);
          continue;
        }
        const seats=await this.db.starlightShadowSeats(watch,watch.parentEntryId);
        if(seats.some(e=>!this.starlightChildMatchesWatch(e,watch)))throw new Error('aps2_group_child_identity_mismatch');
        const used=new Set(seats.map(e=>Number(e.entryConfig.starlightShadow.seat)));
        const target=Number(watch.maximumSeats);
        if(!Number.isSafeInteger(target)||target<1||target>20||used.size!==seats.length)throw new Error('aps2_group_seat_integrity_invalid');
        if(used.size===target){await this.consumeStarlightRecoveryWatch(watch,seats[0].id);continue;}
        if(typeof this.market.ensureFreshBook==='function')await this.market.ensureFreshBook(watch.ticker,5000);
        const q=this.market.getQuote(watch.ticker);
        if(!q||Number(q.quoteAtMs)>Date.now()||Date.now()-Number(q.quoteAtMs)>5000)continue;
        if(q.result||q.status!=='active'){
          if(q.result||['settled','finalized','closed','determined'].includes(q.status)){
            const done=await this.db.updateStarlightWatch({...watch,status:'BLOCKED',lastAttemptReason:'market_finalized'},watch.revision);
            if(done)this.starlightRecoveryWatches.delete(id);
          }
          continue;
        }
        const rise=await this.starlightAthenaRiseDecision(watch,q,settings);
        if(!rise.ok)continue;
        if(watch.link!==true&&!starlightRecoverySignalState(watch,q,settings,Date.now()).qualified)continue;
        const snapshot={...watch,version:watch.link?'SE2-R10-STARLIGHT-LINK':'SE2-R5-DURABLE-STOP-LOSS-RECOVERY',
          ...(rise.enabled?{athenaTrigger:rise.stamp}:{})};
        const usedBefore=used.size;
        for(let seat=1;seat<=target&&admitted<seatBudget;seat++){
          if(used.has(seat))continue;
          const entry=await this.strategy.createHunter('Crash Recovery Hunter',structuredClone(q),Number(settings.crashRecoveryStakeCents||500),0,{
            sourceFeeder:watch.parentConcept,sourceTradeId:watch.parentEntryId,
            starlightRecovery:true,starlightRecoverySnapshot:snapshot,stackIndex:seat,stackSeat:seat>1,
            stackParentId:seats[0]?.id||null});
          if(!entry)break;
          if(!this.starlightChildMatchesWatch(entry,watch))throw new Error('aps2_resumed_child_identity_invalid');
          seats.push(entry);used.add(seat);admitted++;
        }
        if(used.size===target){await this.consumeStarlightRecoveryWatch(watch,seats[0].id);continue;}
        if(used.size>usedBefore)continue;
        // No seat was admitted: preserve all already-committed seats and
        // parent proof; retry after a short durable backoff.  Otherwise a
        // busy ticker can churn thousands of revisions without progress.
        const latest=[...(this.strategy?.entryPipelineEvents||[])].reverse().find(e=>
          e?.concept==='Crash Recovery Hunter'&&String(e?.starlightRecoveryParentEntryId||'')===String(watch.parentEntryId)
          &&e?.status==='BLOCKED');
        const reason=latest?.reason||'starlight_group_seat_deferred';
        const retry={...watch,status:'EXECUTING',lastAttemptReason:String(reason),
          lastAttemptAtMs:Date.now(),retryNotBeforeMs:Date.now()+2_000};
        const saved=await this.db.updateStarlightWatch(retry,watch.revision);
        if(saved)this.starlightRecoveryWatches.set(id,{...retry,revision:Number(saved.revision)});
        else{
          const current=await this.db.starlightWatch(watch);
          if(current&&current.status==='EXECUTING')this.starlightRecoveryWatches.set(id,{...current.watch,revision:Number(current.revision)});
          else this.starlightRecoveryWatches.delete(id);
        }
      }catch(error){
        try{await this.db.audit('warning','aps2_shadow_group_resume_deferred',{authorizationId:id,reason:String(error?.message||error)});}catch{}
      }finally{releaseTicker();this.starlightRecoveryInFlight.delete(id);}
    }
    return admitted;
  }

  async consumeStarlightRecoveryWatch(watch,childId){
    const id=String(watch?.authorizationId||'');
    const child=String(childId||'');
    if(!id||!child)return false;
    if(watch.virtualGroupVersion===STARLIGHT_SHADOW_VERSION){
      const seats=await this.db.starlightShadowSeats(watch,watch.parentEntryId);
      if(seats.length!==Number(watch.maximumSeats)||seats.some(e=>!this.starlightChildMatchesWatch(e,watch))){
        this.starlightRecoveryWatches.set(id,{...watch,status:'EXECUTING',consumePending:false});
        return false;
      }
    }
    const next={...watch,status:'CONSUMED',recoveredChildId:child,consumedAtMs:Date.now()};
    const revision=Number(watch.revision||0);
    if(typeof this.db?.updateStarlightWatch!=='function' || !(revision>0)){
      this.starlightRecoveryWatches.set(id,{...next,status:'EXECUTING',consumePending:true});
      return false;
    }
    try{
      const saved=await this.db.updateStarlightWatch(next,revision);
      if(saved){
        this.starlightRecoveryWatches.delete(id);
        return true;
      }
      const current=typeof this.db?.starlightWatch==='function'?await this.db.starlightWatch(watch):null;
      if(current && String(current.status)==='CONSUMED'){
        this.starlightRecoveryWatches.delete(id);
        return String(current.watch?.recoveredChildId||'')===child;
      }
      if(current && ['BLOCKED','EXPIRED'].includes(String(current.status))){
        this.starlightRecoveryWatches.delete(id);
        return false;
      }
      if(current && Number(current.revision)>0 && !['CONSUMED','BLOCKED','EXPIRED'].includes(String(current.status))){
        const retry=await this.db.updateStarlightWatch({...current.watch,revision:Number(current.revision),status:'CONSUMED',recoveredChildId:child,consumedAtMs:Date.now()},Number(current.revision));
        if(retry){this.starlightRecoveryWatches.delete(id);return true;}
      }
    }catch{
      this.starlightRecoveryWatches.set(id,{...next,status:'EXECUTING',revision,consumePending:true});
      return false;
    }
    this.starlightRecoveryWatches.set(id,{...next,status:'EXECUTING',revision,consumePending:true});
    return false;
  }


  starlightLinkRejectReason(authorizationId,ticker,parentEntryId){
    const scoped=this.strategy?.starlightLinkRejectByAuth?.get(String(authorizationId||''));
    if(scoped)return String(scoped);
    const rows=this.strategy?.entryPipelineEvents||[];
    const parent=String(parentEntryId||'');
    for(let i=rows.length-1;i>=0;i--){
      const e=rows[i];
      if(e?.concept!=='Crash Recovery Hunter'||String(e.ticker)!==String(ticker)||String(e.status)!=='BLOCKED')continue;
      if(parent && String(e.starlightRecoveryParentEntryId||'')!==parent)continue;
      return String(e.reason||e.stage||'link_not_filled_at_stop');
    }
    return 'link_not_filled_at_stop';
  }

  starlightLinkRejectIsPermanent(reason){
    // Only a reason that cannot become eligible later is permanent.
    // A missing book, a lock, or a status that is not explicitly dead must retry.
    return ['stop_price_invalid','link_stop_outside_band','market_result_present','fee_budget_exhausts_aurora_loss_envelope','aurora_loss_envelope','stop_loss_recovery_only','market_finalized'].includes(String(reason||''));
  }


  scheduleStarlightLink(authorizationId){
    const id=String(authorizationId||'');
    if(!id)return false;
    if(!(this.starlightRecoveryInFlight instanceof Set))this.starlightRecoveryInFlight=new Set();
    if(this.starlightRecoveryInFlight.has(id))return false;
    const watch=this.starlightRecoveryWatches?.get(id);
    if(!watch||!this.starlightScopeMatches(watch))return false;
    const releaseTicker=this.claimStarlightRecoveryTicker(watch);
    if(!releaseTicker)return false; // fair round-robin wake retries this parent
    this.starlightRecoveryInFlight.add(id);
    void this.attemptStarlightLinkEntry(id).catch((error)=>{
      void this.db?.audit?.('error','starlight_link_backpressure',{authorizationId:id,code:String(error?.code||''),message:String(error?.message||error).slice(0,180)}).catch?.(()=>{});
    }).finally(()=>{releaseTicker();this.starlightRecoveryInFlight.delete(id);});
    return true;
  }

  async blockLightningOriginWatch(watch){
    if(lightningPlasmaLossMayArmStarlight({conceptName:watch?.parentConcept}))return false;
    const id=String(watch?.authorizationId||'');
    if(!id || !Number.isSafeInteger(Number(watch.revision)) || Number(watch.revision)<1
      || typeof this.db?.updateStarlightWatch!=='function')
      return true; // fail closed even when persistence is unavailable
    const blocked={...watch,status:'BLOCKED',lastAttemptReason:'lightning_plasma_parent_no_follow_up'};
    const saved=await this.db.updateStarlightWatch(blocked,Number(watch.revision));
    if(saved)this.starlightRecoveryWatches.delete(id);
    else this.starlightRecoveryWatches.delete(id); // stale revision: never retry from stale state
    return true;
  }

  async starlightAthenaRiseDecision(watch, quote, settings=this.settings, verified=null){
    const cfg=athenaStarlightTriggerConfig(settings,watch?.parentConcept);
    if(!cfg.enabled)return {ok:true,enabled:false,reason:'athena_starlight_trigger_not_active'};
    if(!cfg.valid)return {ok:false,...cfg,reason:'athena_starlight_trigger_setting_invalid'};
    const proof=verified||await this.db.verifiedShadowStop?.(watch.parentEntryId,shadowScope(settings));
    if(!proof || proof.proofHash!==watch.shadowProofHash
      || Number(proof.watch?.revision)!==Number(watch.revision)
      || String(proof.watch?.status)!==String(watch.status))
      return {ok:false,...cfg,reason:'athena_starlight_shadow_stop_not_verified'};
    return athenaStarlightTriggerDecision({settings,parent:proof.parent,watch,quote});
  }

  starlightAthenaTriggerObservation(decision){
    return {version:ATHENA_STARLIGHT_TRIGGER_VERSION,reason:decision.reason,
      thresholdCents:decision.thresholdCents??null,originalEntryPriceCents:decision.originalEntryPriceCents??null,
      requiredBidCents:decision.requiredBidCents??null,observedBidCents:decision.observedBidCents??null};
  }

  async recordStarlightAthenaTriggerWait(watch, decision){
    const evidence=this.starlightAthenaTriggerObservation(decision);
    // Coalesce unchanged diagnostics; no unbounded write per market tick.
    if(JSON.stringify(watch.athenaTriggerObservation)===JSON.stringify(evidence))return;
    const next={...watch,athenaTriggerObservation:evidence,lastAttemptReason:decision.reason};
    const saved=await this.db.updateStarlightWatch(next,Number(watch.revision));
    if(saved)this.starlightRecoveryWatches.set(watch.authorizationId,{...next,revision:Number(saved.revision)});
    else {
      const current=await this.db.starlightWatch?.(watch);
      if(current && !['CONSUMED','BLOCKED','EXPIRED'].includes(String(current.status)))
        this.starlightRecoveryWatches.set(watch.authorizationId,{...current.watch,revision:Number(current.revision)});
      else this.starlightRecoveryWatches.delete(watch.authorizationId);
    }
  }

  async attemptStarlightLinkEntry(authorizationId){
    const id=String(authorizationId||''),s=this.settings||{};
    if(s.crashRecoveryHunterLinkEnabled!==true||s.crashRecoveryHunterEnabled!==true)return {status:'IGNORED',reason:'link_off'};
    if(this.shadowEntryGate && !this.shadowEntryGate().allowed)return {status:'WATCHING',reason:'entry_gate_disabled'};
    const watch=this.starlightRecoveryWatches?.get(id);
    if(!watch||!this.starlightScopeMatches(watch))return {status:'IGNORED',reason:'watch_missing'};
    if(await this.blockLightningOriginWatch(watch))return {status:'BLOCKED',reason:'lightning_plasma_parent_no_follow_up'};
    if(String(watch.status)==='PERSIST_FAILED'||!(Number(watch.revision)>0))return {status:'WATCHING',reason:'link_parent_not_durable'};
    if(['CONSUMED','BLOCKED','EXPIRED'].includes(String(watch.status)))return {status:'IGNORED',reason:'watch_not_linkable'};
    if(String(watch.status)==='EXECUTING' && watch.resultWritePending!==true)return {status:'IGNORED',reason:'watch_not_linkable'};
    if(Number(watch.retryNotBeforeMs||0)>Date.now())return {status:'WATCHING',reason:'link_retry_waiting'};
    const stop=Number(watch.stopPriceCents);
    if(!(stop>0)||stop>100){
      const blocked={...watch,status:'BLOCKED',lastAttemptReason:'stop_price_invalid',stopPriceCents:stop};
      if(typeof this.db?.updateStarlightWatch==='function' && Number(watch.revision)>0){
        const saved=await this.db.updateStarlightWatch(blocked,Number(watch.revision));
        if(!saved)return {status:'WATCHING',reason:'stale_revision_stop_block'};
        this.starlightRecoveryWatches.set(id,{...blocked,revision:Number(saved.revision)});
      }else this.starlightRecoveryWatches.set(id,blocked);
      return {status:'BLOCKED',reason:'stop_price_invalid'};
    }
    const minEntry=Math.round(Number(s.crashRecoveryMinEntryCents));
    const maxEntry=Math.round(Number(s.crashRecoveryMaxEntryCents));
    // MW-R25: freeze precisely which *effective* runtime card the gate read.
    // The stored config history is separately committed in applySettingsPatch;
    // neither a browser's unsaved edit nor a later changed card can rewrite
    // this historical watch. Both edges remain inclusive.
    const bandDecision={version:'MW-R25-BAND-EVIDENCE',decisionAtMs:Date.now(),
      ownerId:String(s.ownerId||''),systemName:String(s.systemName||''),mode:String(s.mode||''),
      resetEpoch:Number(s.resetTimestampMs||0),authorizationId:id,watchRevision:Number(watch.revision||0),
      stopPriceCents:stop,operatorMinEntryCents:Number(s.crashRecoveryMinEntryCents),
      operatorMaxEntryCents:Number(s.crashRecoveryMaxEntryCents),minEntryCents:minEntry,maxEntryCents:maxEntry,
      latestSettingsVerificationAtMs:Number(this.settingsPersistence?.lastVerifiedAtMs||0),
      settingsCommitRevision:Number(this.settingsPersistence?.lastRevision||0),
      effectiveBandFingerprint:stableHash(['STARLIGHT-BAND',s.systemName,s.ownerId,s.mode,s.resetTimestampMs,minEntry,maxEntry]),
      exactMatchEligible:stop>=minEntry&&stop<=maxEntry};
    if(!Number.isFinite(minEntry)||!Number.isFinite(maxEntry)||minEntry<1||maxEntry>100||minEntry>maxEntry){
      return {status:'WATCHING',reason:'link_band_unusable'};
    }
    if(stop<minEntry||stop>maxEntry){
      const reasonText=`STOP ${stop}c ${stop<minEntry?'BELOW':'ABOVE'} STARLIGHT ${stop<minEntry?'MIN '+minEntry:'MAX '+maxEntry}c`;
      const blocked={...watch,status:'BLOCKED',lastAttemptReason:'link_stop_outside_band',
        lastAttemptMessage:reasonText,priceBandDecision:bandDecision,stopPriceCents:stop,
        minEntryCents:minEntry,maxEntryCents:maxEntry};
      if(typeof this.db?.updateStarlightWatch==='function' && Number(watch.revision)>0){
        const saved=await this.db.updateStarlightWatch(blocked,Number(watch.revision));
        if(!saved)return {status:'WATCHING',reason:'stale_revision_band_block'};
        this.starlightRecoveryWatches.set(id,{...blocked,revision:Number(saved.revision)});
      }else this.starlightRecoveryWatches.set(id,blocked);
      this.starlightRecoveryStats.blocked=(this.starlightRecoveryStats.blocked||0)+1;
      return {status:'BLOCKED',reason:'link_stop_outside_band',message:reasonText,priceBandDecision:bandDecision,
        stopPriceCents:stop,minEntryCents:minEntry,maxEntryCents:maxEntry};
    }
    const liveQuote=this.market?.getQuote?.(watch.ticker);
    const marketDead=Boolean(liveQuote?.result)||['finalized','settled','closed','determined'].includes(String(liveQuote?.status||liveQuote?.liveStatus||'').toLowerCase());
    if(marketDead){
      const blocked={...watch,status:'BLOCKED',lastAttemptReason:'market_finalized',terminalReason:'market_finalized',terminalAtMs:Date.now()};
      if(typeof this.db?.updateStarlightWatch==='function' && Number(watch.revision)>0){
        const saved=await this.db.updateStarlightWatch(blocked,Number(watch.revision));
        if(!saved)return {status:'WATCHING',reason:'stale_revision_terminal_block'};
        this.starlightRecoveryWatches.set(id,{...blocked,revision:Number(saved.revision)});
      }else this.starlightRecoveryWatches.set(id,blocked);
      this.starlightRecoveryStats.blocked=(this.starlightRecoveryStats.blocked||0)+1;
      return {status:'BLOCKED',reason:'market_finalized'};
    }
    if(!liveQuote || Number(liveQuote.quoteAtMs)<=0 || Number(liveQuote.quoteAtMs)>Date.now()
      || Date.now()-Number(liveQuote.quoteAtMs)>5000 || !(Number(liveQuote.yesAsk)>0))
      return {status:'WATCHING',reason:'link_fresh_quote_unavailable'};
    let verified=null;
    if(watch.shadowProtocol===SHADOW_PROTOCOL){
      verified=await this.db.verifiedShadowStop?.(watch.parentEntryId,shadowScope(s));
      if(!verified || verified.proofHash!==watch.shadowProofHash)return {status:'WATCHING',reason:'shadow_stop_not_verified'};
    }
    const athenaRise=await this.starlightAthenaRiseDecision(watch,liveQuote,s,verified);
    if(!athenaRise.ok){
      await this.recordStarlightAthenaTriggerWait(watch,athenaRise);
      return {status:'WATCHING',reason:athenaRise.reason,athenaTrigger:athenaRise};
    }
    const claimed={...watch,...this.starlightGroupClaim(watch,s),status:'EXECUTING',attempts:Number(watch.attempts||0)+1,
      claimAtMs:Date.now(),link:true,priceBandDecision:bandDecision,
      ...(athenaRise.enabled?{athenaTrigger:athenaRise.stamp,lastAttemptReason:null,
        athenaTriggerObservation:this.starlightAthenaTriggerObservation(athenaRise)}:{} )};
    let revision=Number(watch.revision||0);
    if(typeof this.db?.updateStarlightWatch==='function' && revision>0){
      const saved=await this.db.updateStarlightWatch(claimed,revision);
      if(!saved)return {status:'WATCHING',reason:'stale_revision_claim'};
      revision=Number(saved.revision);
      claimed.revision=revision;
    }else{
      revision=Math.max(1,revision);
      claimed.revision=revision;
    }
    this.starlightRecoveryWatches.set(id,claimed);
    const quote=structuredClone(liveQuote);
    const snapshot={
      version:'SE2-R10-STARLIGHT-LINK',link:true,parentEntryId:watch.parentEntryId,
      shadowProtocol:watch.shadowProtocol||null,shadowProofHash:watch.shadowProofHash||null,
      parentConcept:watch.parentConcept,authorizationId:id,revision,maximumSeats:claimed.maximumSeats,
      ownerId:watch.ownerId,systemName:watch.systemName,mode:watch.mode,resetEpoch:watch.resetEpoch,
      armedAtMs:watch.armedAtMs,stopPriceCents:stop,priceBandDecision:bandDecision,
      ...(athenaRise.enabled?{athenaTrigger:athenaRise.stamp}:{}),
    };
    let already=null;
    if(typeof this.db?.entryByConceptSourceTradeId==='function'){
      try{already=await this.db.entryByConceptSourceTradeId(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);}
      catch{
        this.starlightRecoveryWatches.set(id,{...claimed,status:'EXECUTING',lastAttemptReason:'child_lookup_failed'});
        return {status:'WATCHING',reason:'child_lookup_failed'};
      }
    }
    if(already?.id){
      if(!this.starlightChildMatchesWatch(already,claimed)){
        this.starlightRecoveryWatches.set(id,{...claimed,status:'EXECUTING',lastAttemptReason:'child_scope_mismatch'});
        return {status:'WATCHING',reason:'child_scope_mismatch'};
      }
      if(!isShadowSaintEntry(already)){
        const saved=await this.db.updateStarlightWatch({...claimed,status:'BLOCKED',lastAttemptReason:'legacy_starlight_parent_already_executed'},claimed.revision);
        if(saved)this.starlightRecoveryWatches.delete(id);
      }else await this.consumeStarlightRecoveryWatch(claimed,already.id);
      return {status:'IGNORED',reason:'existing_child_or_pending_broker_receipt',entry:already};
    }
    let opened;
    try{
      opened=await this.strategy.createHunter('Crash Recovery Hunter',quote,Number(s.crashRecoveryStakeCents||500),0,{
        sourceFeeder:watch.parentConcept,sourceTradeId:watch.parentEntryId,
        starlightRecovery:true,starlightRecoverySnapshot:snapshot,
      });
    }catch(error){
      let child=null;
      try{child=await this.db?.entryByConceptSourceTradeId?.(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);}catch{child=null;}
      if(child?.id && this.starlightChildMatchesWatch(child,claimed)){
        const consumed=await this.consumeStarlightRecoveryWatch(claimed,child.id);
        return {status:'OPENED',entry:child,watchConsumed:consumed===true,reason:'opened_before_exception'};
      }
      this.starlightRecoveryWatches.set(id,{...claimed,status:'EXECUTING',lastAttemptReason:'execution_exception_no_child'});
      return {status:'WATCHING',reason:'execution_exception_no_child'};
    }
    if(opened?.id){
      const seats=await this.strategy.stackSameAttackSeats('Crash Recovery Hunter',quote,opened,{
        sourceFeeder:watch.parentConcept,sourceTradeId:watch.parentEntryId,
        starlightRecovery:true,starlightRecoverySnapshot:snapshot,
      }).catch(()=>[]);
      const consumed=await this.consumeStarlightRecoveryWatch(claimed,opened.id);
      this.starlightRecoveryStats.opened=(this.starlightRecoveryStats.opened||0)+1+(seats?.length||0);
      this.starlightRecoveryStats.lastEvent={status:consumed?'LINK_OPENED':'LINK_OPENED_CONSUME_PENDING',atMs:Date.now(),authorizationId:id,ticker:watch.ticker,entryPriceCents:Number(opened.entryPriceCents||stop),recoveredChildId:opened.id,seats:1+(seats?.length||0)};
      await this.db?.audit?.('info','starlight_link_opened',{authorizationId:id,parentEntryId:watch.parentEntryId,entryId:opened.id,stopPriceCents:stop,entryPriceCents:opened.entryPriceCents,watchConsumed:consumed===true,seats:1+(seats?.length||0)}).catch?.(()=>{});
      return {status:'OPENED',entry:opened,watchConsumed:consumed===true,seats:1+(seats?.length||0)};
    }
    let committed=null;
    try{committed=await this.db?.entryByConceptSourceTradeId?.(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);}catch{committed=null;}
    if(committed?.id && this.starlightChildMatchesWatch(committed,claimed)){
      const consumed=await this.consumeStarlightRecoveryWatch(claimed,committed.id);
      return {status:'OPENED',entry:committed,watchConsumed:consumed===true,reason:'child_committed_without_return'};
    }
    const reject=this.starlightLinkRejectReason(id,watch.ticker,watch.parentEntryId);
    const permanent=this.starlightLinkRejectIsPermanent(reject);
    const next=permanent
      ?{...claimed,status:'BLOCKED',lastAttemptReason:reject}
      :{...claimed,status:'WATCHING',lastAttemptReason:reject,retryNotBeforeMs:Date.now()+2_000};
    if(typeof this.db?.updateStarlightWatch==='function' && revision>0){
      const saved=await this.db.updateStarlightWatch(next,revision).catch(()=>null);
      if(!saved){
        this.starlightRecoveryWatches.set(id,{...claimed,status:'WATCHING',lastAttemptReason:reject,retryNotBeforeMs:Date.now()+2_000,resultWritePending:true});
        return {status:'WATCHING',reason:'stale_revision_link_result'};
      }
      next.revision=Number(saved.revision);
    }
    this.starlightRecoveryWatches.set(id,next);
    if(permanent)this.starlightRecoveryStats.blocked=(this.starlightRecoveryStats.blocked||0)+1;
    return {status:next.status,reason:reject};
  }

  // SE2-R8 durable stop-loss outbox reconciliation. Close events are already
  // committed before the asynchronous recovery callback; a crash or DB outage
  // between those operations must never make a valid parent disappear. This
  // compact query sees stopped parents even among millions of shadow entries.
  async reconcileStarlightStopLossParents({maximum=64}={}){
    this.starlightRecoveryRuntime();
    const s=this.settings||{};
    if(s.crashRecoveryHunterEnabled!==true||typeof this.db?.unwatchedStarlightStoppedParents!=='function')
      return {examined:0,armed:0,pending:false};
    if(this.starlightStopLossReconcileJob)return this.starlightStopLossReconcileJob;
    const run=(async()=>{
      const scope={systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetEpoch:Number(s.resetTimestampMs||0)};
      const rows=await this.db.unwatchedStarlightStoppedParents(scope,{limit:maximum,
        conceptNames:[...ACTIVE_PORTFOLIO_CONCEPTS].filter(x=>x!=='Crash Recovery Hunter'&&x!=='Lightning Plasma')});
      let armed=0,failed=0;
      for(const row of rows){
        if(!this.starlightScopeMatches({...row,resetEpoch:scope.resetEpoch}) ||
          !lightningPlasmaLossMayArmStarlight(row) ||
          String(row.status)!=='closed'||String(row.closeReason)!=='hard_stop_loss')continue;
        const id=`STARLIGHT-RECOVERY:${row.id}`;
        const inProgress=this.starlightRecoveryArmWrites.get(id);
        if(inProgress)await inProgress;
        const existing=this.starlightRecoveryWatches.get(id);
        if(existing && Number(existing.revision)>0 && existing.status!=='PERSIST_FAILED')continue;
        // No durable row exists in the database result. Recreate the arm from
        // the EXACT original close event, never from current clock time.
        if(existing){this.starlightRecoveryWatches.delete(id);this.starlightKnownParents.delete(id);}
        else if(this.starlightKnownParents.has(id))this.starlightKnownParents.delete(id);
        if(!this.armStarlightRecovery(row))continue;
        const committed=await this.starlightRecoveryArmWrites.get(id);
        if(committed)armed++;else failed++;
      }
      this.starlightRecoveryStats.orphanReconciliations=(this.starlightRecoveryStats.orphanReconciliations||0)+1;
      this.starlightRecoveryStats.orphansArmed=(this.starlightRecoveryStats.orphansArmed||0)+armed;
      this.starlightRecoveryStats.lastOrphanReconciliation={atMs:Date.now(),examined:rows.length,armed,failed,
        backlogPossible:rows.length>=Math.max(1,Math.min(128,Number(maximum)||64))};
      return {examined:rows.length,armed,failed};
    })();
    this.starlightStopLossReconcileJob=run;
    try{return await run;}finally{if(this.starlightStopLossReconcileJob===run)this.starlightStopLossReconcileJob=null;}
  }

  async rehydrateStarlightRecovery(){
    const s=this.settings||{};
    this.starlightRecoveryRuntime();
    if(s.crashRecoveryHunterEnabled!==true||typeof this.db?.listStarlightWatches!=='function')return 0;
    const scope={systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetEpoch:Number(s.resetTimestampMs||0)};
    // Database errors are not treated as an empty list: execution stays
    // fail-closed if its authoritative watch history cannot be read.
    const stored=await this.db.listStarlightWatches(scope);
    for(const row of stored){
      let watch={...row.watch,revision:Number(row.revision)};
      if(!this.starlightScopeMatches(watch))continue;
      if(!lightningPlasmaLossMayArmStarlight({conceptName:watch.parentConcept})){
        await this.blockLightningOriginWatch(watch);
        continue;
      }
      this.starlightKnownParents.add(String(watch.authorizationId));
      if(['CONSUMED','BLOCKED','EXPIRED'].includes(String(row.status)))continue;
      // Upgrade an R5 in-progress watch in place. CAS protects overlapping
      // Railway workers; retain all original stop/quote/rebound evidence.
      if(Number(watch.expiresAtMs)!==Number.MAX_SAFE_INTEGER){
        const revised={...watch,expiresAtMs:Number.MAX_SAFE_INTEGER,updatedAtMs:Date.now()};
        const committed=await this.db.updateStarlightWatch(revised,watch.revision);
        if(!committed){
          const current=await this.db.starlightWatch?.(watch);
          if(!current || ['CONSUMED','BLOCKED','EXPIRED'].includes(String(current.status)))continue;
          watch={...current.watch,revision:Number(current.revision)};
          if(Number(watch.expiresAtMs)!==Number.MAX_SAFE_INTEGER)continue; // another writer owns upgrade
        }else watch={...revised,revision:Number(committed.revision)};
      }
      if(watch.virtualGroupVersion===STARLIGHT_SHADOW_VERSION && watch.status==='EXECUTING'){
        this.starlightRecoveryWatches.set(String(watch.authorizationId),watch);continue;
      }
      if(String(watch.status)==='EXECUTING' && typeof this.db?.entryByConceptSourceTradeId==='function'){
        try{
          const child=await this.db.entryByConceptSourceTradeId(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);
          if(child?.id && this.starlightChildMatchesWatch(child,watch)){
            const consumed=await this.consumeStarlightRecoveryWatch(watch,child.id);
            if(consumed)continue;
          }
        }catch{ /* keep EXECUTING; do not consume without a confirmed child */ }
      }
      this.starlightRecoveryWatches.set(String(watch.authorizationId),watch);
    }
    // SE2-R8: reconcile orphaned hard stops from a SQL-filtered durable
    // outbox, rather than arbitrarily taking the latest 5,000 ledger rows.
    // In-memory test stores lacking the query retain their compatibility path.
    let imported=0;
    if(typeof this.db.unwatchedStarlightStoppedParents==='function'){
      const recovered=await this.reconcileStarlightStopLossParents({maximum:128});
      imported=Number(recovered.armed||0);
    }else{
      const rows=typeof this.db.entries==='function'?await this.db.entries(s.systemName,{limit:5000}):[];
      const children=new Set(rows.filter(e=>String(e.conceptName||'')==='Crash Recovery Hunter'&&String(e.mode)===String(s.mode)&&String(e.ownerId)===String(s.ownerId))
        .map(e=>String(e.sourceTradeId||e.entryConfig?.starlightRecovery?.parentEntryId||'')));
      for(const row of rows){
        const id=`STARLIGHT-RECOVERY:${row.id}`;
        if(this.starlightKnownParents.has(id)||children.has(String(row.id)))continue;
        if(String(row.status)!=='closed'||String(row.closeReason)!=='hard_stop_loss')continue;
        if(this.armStarlightRecovery(row)){
          imported++;
          await this.starlightRecoveryArmWrites.get(id);
        }
      }
    }
    // An uncertain pre-restart execution must reconcile by parent-derived
    // child identity before becoming retryable; pending broker BUYs remain owned.
    for(const [id,prior] of this.starlightRecoveryWatches){
      if(String(prior.status)!=='EXECUTING'||prior.virtualGroupVersion===STARLIGHT_SHADOW_VERSION)continue;
      const child=await this.db.entryByConceptSourceTradeId?.(s.systemName,'Crash Recovery Hunter',prior.parentEntryId);
      const next=child&&String(child.ownerId)===String(prior.ownerId)&&String(child.mode)===String(prior.mode)
        ?{...prior,status:'CONSUMED',recoveredChildId:child.id}
        :s.mode==='LIVE'?{...prior,status:'EXECUTING',lastAttemptReason:'live_reconciliation_required'}
        :{...prior,status:'WATCHING',retryNotBeforeMs:Date.now()+2000};
      const saved=await this.db.updateStarlightWatch(next,prior.revision);
      if(saved){if(next.status==='CONSUMED')this.starlightRecoveryWatches.delete(id);
        else this.starlightRecoveryWatches.set(id,{...next,revision:Number(saved.revision)});}
      else this.starlightRecoveryWatches.delete(id); // stale process: fail closed
    }
    await this.refreshRecoveryPriorityTickers();
    this.starlightRecoveryBootPending=false;
    return imported+stored.length;
  }

  // SE2-R8: Starlight must see successive DISTINCT upward observations.
  // R7 coalesced every in-flight quote into just the latest one, systematically
  // losing the operator-required tick count when PostgreSQL commits were slow.
  // Persist each bounded, ordered batch as ONE revisioned geometry update;
  // final execution still revalidates only the newest committed fresh quote.
  // OOM1: quote callbacks must not await an already-running watch task.
  // One worker owns each watch; following quotes append bounded evidence,
  // without building a new Promise.all/reaction graph for every market tick.
  bufferStarlightRecoveryQuote(id,q){
    const pending=this.starlightRecoveryPendingQuotes.get(id)||[],last=pending.at(-1);
    const terminal=Boolean(q.result)||['finalized','settled','closed','determined'].includes(String(q.status||q.liveStatus||'').toLowerCase());
    const order=last?starlightRecoveryQuoteOrder({lastQuoteAtMs:Number(last.quoteAtMs||last.updatedAtMs||last.quoteObservation?.observedAtMs||0),lastQuoteEpoch:String(last.quoteObservation?.epoch||''),lastQuoteRevision:Number(last.quoteObservation?.revision||0)},q):1;
    if(last&&order<=0&&!terminal){this.starlightRecoveryStats.pendingQuoteReorders=(this.starlightRecoveryStats.pendingQuoteReorders||0)+1;return false;}
    // Exact fields consumed by the ORIGINAL recovery reducer and ordering check.
    const compact={};for(const key of ['ticker','yesBid','yesAsk','status','liveStatus','result','quoteAtMs','updatedAtMs','bookInvalid'])compact[key]=q[key];
    compact.quoteObservation=q.quoteObservation?{...q.quoteObservation}:null;
    pending.push(compact);
    if(pending.length>128){pending.shift();this.starlightRecoveryStats.pendingQuoteOverflows=(this.starlightRecoveryStats.pendingQuoteOverflows||0)+1;}
    this.starlightRecoveryPendingQuotes.set(id,pending);return true;
  }

  enqueueStarlightRecoveryQuote(q){
    if(!q?.ticker||this.settings?.crashRecoveryHunterEnabled!==true)return false;
    this.starlightRecoveryRuntime();
    const terminal=Boolean(q.result)||['finalized','settled','closed','determined'].includes(String(q.status||q.liveStatus||'').toLowerCase());
    const link=this.settings.crashRecoveryHunterLinkEnabled===true;
    this.starlightTerminalQuoteJobs||=new Map();
    let accepted=false;
    for(const [id,w] of this.starlightRecoveryWatches){
      if(String(w.ticker)!==String(q.ticker)||!this.starlightScopeMatches(w)||['CONSUMED','EXPIRED','BLOCKED'].includes(String(w.status)))continue;
      if(link&&!terminal){if(['ARMED','READY','WATCHING'].includes(String(w.status)))this.scheduleStarlightLink(id);continue;}
      const jobs=link?this.starlightTerminalQuoteJobs:this.starlightRecoveryQuoteJobs;
      if(jobs.has(id)){if(!link)this.bufferStarlightRecoveryQuote(id,q);accepted=true;continue;}
      const task=this.observeStarlightRecoveryQuote(q,{onlyId:id});
      if(link)jobs.set(id,task);
      // One error observer per WORKER, not per incoming quote.
      void task.catch(error=>{this.starlightRecoveryStats.lastError=String(error?.message||error).slice(0,500);
        return this.db?.audit?.('error','starlight_quote_worker_failed',{id,message:this.starlightRecoveryStats.lastError}).catch?.(()=>{});
      }).finally(()=>{if(link&&jobs.get(id)===task)jobs.delete(id);});
      accepted=true;
    }
    return accepted;
  }

  async observeStarlightRecoveryQuote(q,{onlyId=null}={}){
    if(this.settings?.crashRecoveryHunterLinkEnabled===true){
      const ticker=String(q?.ticker||'');
      const terminal=Boolean(q?.result)||['finalized','settled','closed','determined'].includes(String(q?.status||q?.liveStatus||'').toLowerCase());
      for(const watch of [...(this.starlightRecoveryWatches?.values?.()||[])]){
        if((onlyId&&String(watch.authorizationId)!==String(onlyId))||String(watch.ticker)!==ticker||!this.starlightScopeMatches(watch))continue;
        if(terminal && !['CONSUMED','BLOCKED','EXPIRED'].includes(String(watch.status))){
          const blocked={...watch,status:'BLOCKED',terminalReason:'market_finalized',terminalAtMs:Date.now(),lastAttemptReason:'market_finalized'};
          if(typeof this.db?.updateStarlightWatch==='function' && Number(watch.revision)>0){
            const saved=await this.db.updateStarlightWatch(blocked,Number(watch.revision)).catch(()=>null);
            if(saved)this.starlightRecoveryWatches.set(watch.authorizationId,{...blocked,revision:Number(saved.revision)});
          }else this.starlightRecoveryWatches.set(watch.authorizationId,blocked);
          continue;
        }
        if(['ARMED','READY','WATCHING'].includes(String(watch.status)))this.scheduleStarlightLink(watch.authorizationId);
      }
      return false;
    }

    const s=this.settings||{};
    if(s.crashRecoveryHunterEnabled!==true||!q?.ticker)return false;
    this.starlightRecoveryRuntime();
    const ticker=String(q.ticker);
    const ids=[...this.starlightRecoveryWatches.values()]
      .filter(w=>(!onlyId||String(w.authorizationId)===String(onlyId))&&String(w.ticker)===ticker&&this.starlightScopeMatches(w)
        &&!['CONSUMED','EXPIRED','BLOCKED'].includes(String(w.status))
        &&(w.status!=='EXECUTING'||(w.virtualGroupVersion===STARLIGHT_SHADOW_VERSION&&!this.starlightRecoveryInFlight.has(w.authorizationId))))
      .map(w=>String(w.authorizationId));
    if(!ids.length)return false;
    const cap=128;
    await Promise.all(ids.map(async id=>{
      if(!this.bufferStarlightRecoveryQuote(id,q))return;
      if(this.starlightRecoveryQuoteJobs.has(id))return this.starlightRecoveryQuoteJobs.get(id);
      const task=(async()=>{
        const arm=this.starlightRecoveryArmWrites.get(id);
        if(arm && !(await arm))return;
        for(;;){
          const packet=this.starlightRecoveryPendingQuotes.get(id);
          this.starlightRecoveryPendingQuotes.delete(id);
          if(!packet?.length)break;
          let before=this.starlightRecoveryWatches.get(id);
          if(!before||!this.starlightScopeMatches(before))break;
          if(!Number(before.revision)||before.status==='PERSIST_FAILED'){
            let durable=await this.db.starlightWatch?.(before);
            if(!durable){
              const saved=await this.db.insertStarlightWatch({...before,status:'ARMED'});
              durable=saved||await this.db.starlightWatch?.(before);
            }
            if(!durable)break;
            if(['CONSUMED','BLOCKED','EXPIRED'].includes(String(durable.status))){
              this.starlightRecoveryWatches.delete(id);break;
            }
            before={...durable.watch,revision:Number(durable.revision)};
            this.starlightRecoveryWatches.set(id,before);
          }
          if((before.status==='EXECUTING'&&(before.virtualGroupVersion!==STARLIGHT_SHADOW_VERSION||this.starlightRecoveryInFlight.has(id)))||['CONSUMED','EXPIRED','BLOCKED'].includes(before.status))break;
          let state=before,accepted=0,terminalMarket=false;
          for(const quote of packet){
            const terminal=Boolean(quote.result)||['finalized','settled','closed','determined']
              .includes(String(quote.status||quote.liveStatus||'').toLowerCase());
            // Pure timestamp/adapter revisions with identical prices carry no
            // new crash, rebound or uptick information. Do not write 27 whole
            // PostgreSQL watch rows for one redundant market observation.
            // Market finality and any changed executable ask are never skipped.
            if(!terminal && !quote.bookInvalid && Number(state.lastQuoteAtMs||0)>0
              && Number(state.lastBidCents)===Number(quote.yesBid)
              && Number(state.lastAskCents)===Number(quote.yesAsk)){
              this.starlightRecoveryStats.redundantQuotesSkipped=(this.starlightRecoveryStats.redundantQuotesSkipped||0)+1;
              continue;
            }
            const next=starlightRecoverySignalState(state,quote,this.settings,Date.now(),{advance:true});
            const terminalStatus=String(quote.status||quote.liveStatus||'').toLowerCase();
            terminalMarket=Boolean(quote.result)||['finalized','settled','closed','determined'].includes(terminalStatus);
            if(terminalMarket){
              state={...next,lastSignalReason:next.reason,terminalReason:'market_finalized',terminalAtMs:Date.now()};
              accepted++;break;
            }
            if(['duplicate_quote','quote_out_of_order','quote_stale_or_future','quote_pre_stop'].includes(next.reason))continue;
            state={...next,lastSignalReason:next.reason};
            accepted++;
          }
          if(!accepted)continue;
          const status=terminalMarket?'BLOCKED':Date.now()>Number(before.expiresAtMs)?'EXPIRED':before.status==='EXECUTING'&&before.virtualGroupVersion===STARLIGHT_SHADOW_VERSION?'EXECUTING':state.qualified?'READY':'WATCHING';
          const record={...state,status};
          delete record.qualified;delete record.reason;
          const saved=await this.db.updateStarlightWatch(record,before.revision);
          if(!saved){
            const latest=await this.db.starlightWatch?.(before);
            if(latest && !['CONSUMED','BLOCKED','EXPIRED'].includes(String(latest.status)))
              this.starlightRecoveryWatches.set(id,{...latest.watch,revision:Number(latest.revision)});
            else this.starlightRecoveryWatches.delete(id);
            break;
          }
          const persisted={...record,revision:Number(saved.revision)};
          if(status==='EXPIRED'||status==='BLOCKED'){
            this.starlightRecoveryWatches.delete(id);
            if(status==='EXPIRED')this.starlightRecoveryStats.expired++;
            else this.starlightRecoveryStats.blocked++;
            break;
          }
          this.starlightRecoveryWatches.set(id,persisted);
          if(status==='READY'&&this.shadowEntryGate().allowed){
            this.starlightRecoveryStats.qualified++;
            this.queueStarlightRecovery(id);
          }
        }
      })();
      this.starlightRecoveryQuoteJobs.set(id,task);
      try{await task;}finally{
        if(this.starlightRecoveryQuoteJobs.get(id)===task)this.starlightRecoveryQuoteJobs.delete(id);
        // Recover a packet queued after the last empty read. Preserve its
        // order; never flatten it back into one quote during a slow DB write.
        const trailing=this.starlightRecoveryPendingQuotes.get(id);
        if(trailing?.length){
          this.starlightRecoveryPendingQuotes.delete(id);
          for(const item of trailing)await this.observeStarlightRecoveryQuote(item,{onlyId:id});
        }
      }
    }));
    return true;
  }

  // SE2-R7: Recovery is a post-exit obligation, not a subscriber to the
  // ordinary discovery feed. REST seeds update the market cache without
  // emitting onQuote; a stopped ticker with no further WS traffic would never
  // be evaluated. Poll ONLY active watch tickers, with a hard per-pass budget
  // and staggered rotation. REST quotes enter the SAME durable observer as WS.
  async refreshStarlightRecoveryMarketQuotes({maximum=6}={}){
    if(this.settings?.crashRecoveryHunterEnabled!==true)return {polled:0,observed:0};
    const tickers=[...new Set([...(this.starlightRecoveryWatches?.values?.()||[])]
      .filter(w=>this.starlightScopeMatches(w)&&!['CONSUMED','BLOCKED','EXPIRED'].includes(String(w.status))&&(w.status!=='EXECUTING'||w.virtualGroupVersion===STARLIGHT_SHADOW_VERSION))
      .map(w=>String(w.ticker||'')).filter(Boolean))].sort();
    if(!tickers.length)return {polled:0,observed:0};
    const cap=Math.max(1,Math.min(12,Math.floor(Number(maximum)||6)));
    const offset=Number(this.starlightRecoveryRestCursor||0)%tickers.length;
    const batch=Array.from({length:Math.min(cap,tickers.length)},(_,i)=>tickers[(offset+i)%tickers.length]);
    this.starlightRecoveryRestCursor=(offset+batch.length)%tickers.length;
    let observed=0,failed=0,bookRefreshed=0;
    await Promise.all(batch.map(async ticker=>{
      try{
        // An invalid or expired WS orderbook cannot be cured by getMarket()
        // alone. MarketHub.seed() deliberately inherits bookInvalid from its
        // prior cache; without verified-book recovery Starlight can watch an
        // otherwise tradable rebound forever without becoming eligible.
        const cached=this.market?.getQuote?.(ticker);
        const book=this.market?.getBook?.(ticker);
        const maxAge=Math.max(250,Number(this.settings.infinityBreakMaximumBookAgeMs||5_000));
        const bookAge=book?.updatedAtMs?Date.now()-Number(book.updatedAtMs):Infinity;
        if(typeof this.market?.ensureFreshBook==='function' &&
          (cached?.bookInvalid===true||!book||book?.sequenceValid===false||bookAge>maxAge)){
          await this.market.ensureFreshBook(ticker,maxAge);
          bookRefreshed++;
        }
        const revision=Number(this.market?.quoteRevision||0);
        const fresh=await this.kalshi?.getMarket?.(ticker);
        if(!fresh||String(fresh.ticker||'')!==ticker)return;
        // The adapter guards REST/WS revision ordering. Never forge quote time
        // or count unchanged quotes as additional upward ticks.
        const accepted=this.market?.seed?.(fresh,{requestRevision:revision,emit:true});
        if(accepted && String(accepted.ticker||'')===ticker)observed++;
      }catch(error){
        failed++;
        try{await this.db?.audit?.('warning','starlight_rest_watch_poll_failed',{ticker,message:String(error?.message||error)});}catch{}
      }
    }));
    return {polled:batch.length,observed,failed,bookRefreshed};
  }

  // SE2-R7: A READY watch is a durable eligible command. If the entry gate
  // was unavailable at the qualifying quote, or the previous execution failed
  // transiently, do not require a second WS price movement to retry. Every
  // wakeup rechecks the SAME latest committed quote and all safety controls.
  async wakeStarlightRecoveryWatches({maximum=16}={}){
    if(this.settings?.crashRecoveryHunterEnabled!==true||!this.shadowEntryGate().allowed)return 0;
    const resumed=await this.resumeStarlightShadowGroups({maximum});
    const candidates=[...(this.starlightRecoveryWatches?.values?.()||[])]
      .filter(w=>!(w.status==='EXECUTING'&&w.virtualGroupVersion===STARLIGHT_SHADOW_VERSION)&&this.starlightScopeMatches(w)&&(this.settings?.crashRecoveryHunterLinkEnabled===true?['ARMED','READY','WATCHING'].includes(String(w.status)):['READY','WATCHING','EXECUTING'].includes(String(w.status))));
    if(!candidates.length)return resumed;
    // Rotate rather than indefinitely starving watches after the first 16.
    const cap=Math.max(1,Math.min(32,Math.floor(Number(maximum)||16)));
    const offset=Number(this.starlightRecoveryWakeCursor||0)%candidates.length;
    const scope=Array.from({length:Math.min(cap,candidates.length)},(_,i)=>candidates[(offset+i)%candidates.length]);
    this.starlightRecoveryWakeCursor=(offset+scope.length)%candidates.length;
    let awake=resumed;
    if(this.settings?.crashRecoveryHunterLinkEnabled===true){
      // RCV3: READY is a durable nonexecuted watch, not a consumed signal.
      // An OFF-to-ON toggle or restored READY watch must be scheduled through
      // the same ticker lane; the Link entry handler rechecks every gate.
      for(const current of scope){
        const w=this.starlightRecoveryWatches.get(String(current.authorizationId));
        if(!w||!this.starlightScopeMatches(w)||this.starlightRecoveryInFlight?.has(String(w.authorizationId)))continue;
        if(!['ARMED','READY','WATCHING'].includes(String(w.status))){
          if(!(String(w.status)==='EXECUTING' && w.resultWritePending===true && Number(w.retryNotBeforeMs||0)<=Date.now()))continue;
        }else if(Number(w.retryNotBeforeMs||0)>Date.now())continue;
        if(this.scheduleStarlightLink(w.authorizationId))awake++;
      }
      return awake;
    }
    for(const current of scope){
      const w=this.starlightRecoveryWatches.get(String(current.authorizationId));
      if(!w||!this.starlightScopeMatches(w)||this.starlightRecoveryInFlight?.has(String(w.authorizationId)))continue;
      if(w.status==='EXECUTING'){
        if(w.consumePending===true){
          try{
            const pendingChild=await this.db.entryByConceptSourceTradeId(this.settings.systemName,'Crash Recovery Hunter',w.parentEntryId);
            if(pendingChild?.id && this.starlightChildMatchesWatch(pendingChild,w)){
              const consumed=await this.consumeStarlightRecoveryWatch(w,pendingChild.id);
              if(consumed)continue;
            }
          }catch{ /* keep EXECUTING; never consume without a confirmed child */ }
        }
        if(Date.now()-Number(w.claimAtMs||0)<30_000)continue;
        // Broker submits are preceded by a durable child intent. A missing
        // entry can be retried only after a successful authoritative lookup.
        try{
          const child=await this.db.entryByConceptSourceTradeId(this.settings.systemName,'Crash Recovery Hunter',w.parentEntryId);
          if(!child && this.settings.mode==='LIVE'){
            // Unknown broker truth stays pending until explicit reconciliation.
            // Never turn an ambiguous LIVE submit into a second BUY.
            this.starlightRecoveryStats.lastEvent={status:'BROKER_RECONCILIATION_REQUIRED',
              atMs:Date.now(),authorizationId:w.authorizationId,reason:'live_claim_without_authoritative_child'};
            continue;
          }
          const next=child?{...w,status:'CONSUMED',recoveredChildId:child.id}
            :{...w,status:'WATCHING',retryNotBeforeMs:Date.now()+2_000,lastAttemptReason:'recovered_stale_execution_claim'};
          const saved=await this.db.updateStarlightWatch(next,w.revision);
          if(saved){if(child)this.starlightRecoveryWatches.delete(String(w.authorizationId));
            else this.starlightRecoveryWatches.set(String(w.authorizationId),{...next,revision:Number(saved.revision)});}
        }catch(error){try{await this.db?.audit?.('warning','starlight_stale_claim_reconciliation_pending',{authorizationId:w.authorizationId,message:String(error?.message||error)});}catch{}}
        continue;
      }
      const q=this.market?.getQuote?.(w.ticker);
      if(!q)continue;
      const signal=starlightRecoverySignalState(w,q,this.settings,Date.now());
      if(!signal.qualified)continue;
      if(w.status==='WATCHING'){
        try{
          const saved=await this.db.updateStarlightWatch({...w,status:'READY',lastSignalReason:'qualified_on_recovery_wakeup'},w.revision);
          if(!saved)continue;
          this.starlightRecoveryWatches.set(String(w.authorizationId),{...w,status:'READY',revision:Number(saved.revision),lastSignalReason:'qualified_on_recovery_wakeup'});
        }catch(error){try{await this.db?.audit?.('warning','starlight_ready_wakeup_persist_failed',{authorizationId:w.authorizationId,message:String(error?.message||error)});}catch{}continue;}
      }
      if(this.queueStarlightRecovery(w.authorizationId))awake++;
    }
    return awake;
  }

  // SE2-R9: Starlight is an independent post-stop execution obligation.
  // Recovery liveness must not depend on the ordinary scan loop completing
  // a potentially long protection/learning/REST cycle. Each maintenance lane
  // is independently scheduled, bounded to ONE outstanding operation, and
  // reports its last success/error. A slow REST poll cannot delay READY wakes.
  startStarlightRecoveryMaintenance({wakeMs=3_000,restMs=15_000,orphanMs=60_000,bootMs=30_000}={}){
    if(this.starlightRecoveryMaintenanceTimers?.length)return false;
    this.starlightRecoveryMaintenanceTimers=[];
    this.starlightRecoveryMaintenanceBusy=new Set();
    this.starlightRecoveryMaintenanceState ||= {};
    const lanes=[
      ['wake',wakeMs,async()=>{
        this.starlightRecoveryLastWakeMs=Date.now();
        return this.wakeStarlightRecoveryWatches({maximum:16});
      }],
      ['rest',restMs,async()=>{
        this.starlightRecoveryLastPollMs=Date.now();
        return this.refreshStarlightRecoveryMarketQuotes({maximum:6});
      }],
      ['orphan',orphanMs,async()=>{
        this.starlightRecoveryLastOrphanCheckMs=Date.now();
        return this.reconcileStarlightStopLossParents({maximum:64});
      }],
      ['boot',bootMs,async()=>{
        if(!this.starlightRecoveryBootPending)return 'not_required';
        await this.rehydrateStarlightRecovery();
        this.starlightRecoveryBootPending=false;
        return 'rehydrated';
      }],
    ];
    for(const [name,intervalMs,job] of lanes){
      const tick=()=>{
        if(!this.running || this.starlightRecoveryMaintenanceBusy.has(name))return;
        this.starlightRecoveryMaintenanceBusy.add(name);
        const started=Date.now();
        void Promise.resolve().then(job).then(()=>{
          this.starlightRecoveryMaintenanceState[name]={lastSuccessAtMs:Date.now(),lastDurationMs:Date.now()-started,error:null};
        }).catch(async(error)=>{
          const message=String(error?.message||error);
          this.starlightRecoveryMaintenanceState[name]={lastFailureAtMs:Date.now(),lastDurationMs:Date.now()-started,error:message};
          if(name==='boot')this.starlightRecoveryStats.lastRehydrateError=message;
          if(name==='orphan')this.starlightRecoveryStats.lastOrphanError=message;
          try{await this.db?.audit?.('warning','starlight_maintenance_failed',{lane:name,message});}catch{}
        }).finally(()=>this.starlightRecoveryMaintenanceBusy.delete(name));
      };
      const timer=setInterval(tick,Math.max(10,Number(intervalMs)||10));
      timer.unref?.();
      this.starlightRecoveryMaintenanceTimers.push(timer);
    }
    return true;
  }

  stopStarlightRecoveryMaintenance(){
    for(const timer of this.starlightRecoveryMaintenanceTimers||[])clearInterval(timer);
    this.starlightRecoveryMaintenanceTimers=[];
  }

  queueStarlightRecovery(authorizationId){
    this.starlightRecoveryRuntime();
    const id=String(authorizationId||'');
    if(!id)return false;
    if(!this.starlightExecutionQueue)this.starlightExecutionQueue=new CoalescingWorkQueue({maxConcurrency:2,maxPending:128,
      onError:async(error,key)=>{this.starlightRecoveryStats.lastEvent={status:'ERROR',authorizationId:key,
        reason:String(error?.message||error),atMs:Date.now()};
        await this.db?.audit?.('error','starlight_execution_failed',{id:key,message:String(error?.message||error)});}});
    // Overflow remains a durable watch and is picked up by regular maintenance.
    return this.starlightExecutionQueue.enqueue(id,async()=>{
      if(this.starlightRecoveryInFlight.has(id))return;
      const watch=this.starlightRecoveryWatches?.get(id);
      if(!watch||!this.starlightScopeMatches(watch))return;
      // RCV2: the Link-OFF READY queue (and its Link-ON compatibility path)
      // previously bypassed the RCV1 per-ticker claim. Coalesced queue
      // concurrency is per watch, not per ticker; two valid recovery parents
      // could enter StrategyEngine's same-ticker seat lock simultaneously.
      // A busy ticker remains durably READY/EXECUTING and is retried by the
      // independent maintenance lane; it is never consumed or discarded.
      const releaseTicker=this.claimStarlightRecoveryTicker(watch);
      if(!releaseTicker)return {status:'WATCHING',reason:'ticker_recovery_lane_busy'};
      this.starlightRecoveryInFlight.add(id);
      try{return await this.attemptStarlightRecovery(id);}finally{
        releaseTicker();
        this.starlightRecoveryInFlight.delete(id);
      }
    });
  }

  async attemptStarlightRecovery(authorizationId){
    const id=String(authorizationId),s=this.settings||{};
    if(s.crashRecoveryHunterLinkEnabled===true)return this.attemptStarlightLinkEntry(id);
    const watch=this.starlightRecoveryWatches?.get(id);
    if(!watch||watch.status!=='READY'||!this.starlightScopeMatches(watch)||!Number(watch.revision))
      return {status:'IGNORED',reason:'watch_not_durably_ready'};
    if(await this.blockLightningOriginWatch(watch))return {status:'BLOCKED',reason:'lightning_plasma_parent_no_follow_up'};
    if(!this.shadowEntryGate().allowed)return {status:'WATCHING',reason:'entry_gate_disabled'};
    if(s.crashRecoveryHunterEnabled!==true)return {status:'WATCHING',reason:'model_disabled'};
    if(Date.now()>Number(watch.expiresAtMs))return {status:'WATCHING',reason:'expired_requires_persistence'};
    if(typeof this.db?.entryById!=='function'||typeof this.db?.entryByConceptSourceTradeId!=='function'
      ||typeof this.db?.updateStarlightWatch!=='function')return {status:'WATCHING',reason:'durable_authority_unavailable'};
    const parent=await this.db.entryById(watch.parentEntryId);
    if(!parent||String(parent.status)!=='closed'||String(parent.closeReason)!=='hard_stop_loss'
      ||String(parent.ownerId)!==String(watch.ownerId)||String(parent.systemName)!==String(watch.systemName)
      ||String(parent.mode)!==String(watch.mode)||parent.archived===true
      ||String(parent.conceptName)===String('Crash Recovery Hunter')
      ||!lightningPlasmaLossMayArmStarlight(parent))return {status:'WATCHING',reason:'parent_authority_invalid'};
    const existing=await this.db.entryByConceptSourceTradeId(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);
    if(existing){
      if(!this.starlightChildMatchesWatch(existing,watch))return {status:'BLOCKED',reason:'existing_child_scope_mismatch'};
      const virtual=isShadowSaintEntry(existing)&&watch.virtualGroupVersion===STARLIGHT_SHADOW_VERSION;
      const next={...watch,status:virtual?'EXECUTING':'BLOCKED',recoveredChildId:existing.id,
        lastAttemptReason:virtual?'aps2_resume_unfinished_group':'legacy_starlight_parent_already_executed'};
      const saved=await this.db.updateStarlightWatch(next,watch.revision);
      if(saved){if(virtual)this.starlightRecoveryWatches.set(id,{...next,revision:Number(saved.revision)});else this.starlightRecoveryWatches.delete(id);}
      return {status:'IGNORED',reason:next.lastAttemptReason};
    }
    if(typeof this.market?.ensureFreshBook==='function')await this.market.ensureFreshBook(watch.ticker,Math.max(250,Number(s.infinityBreakMaximumBookAgeMs||5000)));
    const quote=this.market?.getQuote?.(watch.ticker);
    if(!quote)return {status:'WATCHING',reason:'quote_missing'};
    const athenaRise=await this.starlightAthenaRiseDecision(watch,quote,s);
    if(!athenaRise.ok){
      await this.recordStarlightAthenaTriggerWait(watch,athenaRise);
      return {status:'WATCHING',reason:athenaRise.reason,athenaTrigger:athenaRise};
    }
    const signal=starlightRecoverySignalState(watch,quote,s,Date.now());
    if(!signal.qualified){
      if(signal.reason==='unpersisted_price_change')
        this.enqueueStarlightRecoveryQuote(quote);
      return {status:'WATCHING',reason:signal.reason};
    }
    // The DB claim is a CAS. Only one worker can enter EXECUTING, regardless
    // of how many Railway processes observed the same recovery.
    const claimed={...watch,...this.starlightGroupClaim(watch,s),status:'EXECUTING',attempts:Number(watch.attempts||0)+1,claimAtMs:Date.now(),
      ...(athenaRise.enabled?{athenaTrigger:athenaRise.stamp,lastAttemptReason:null,
        athenaTriggerObservation:this.starlightAthenaTriggerObservation(athenaRise)}:{})};
    const claim=await this.db.updateStarlightWatch(claimed,watch.revision);
    if(!claim){this.starlightRecoveryWatches.delete(id);return {status:'WATCHING',reason:'stale_revision_claim'};}
    claimed.revision=Number(claim.revision);
    this.starlightRecoveryWatches.set(id,claimed);
    const snapshot={version:'SE2-R5-DURABLE-STOP-LOSS-RECOVERY',parentEntryId:watch.parentEntryId,
      shadowProtocol:watch.shadowProtocol||null,shadowProofHash:watch.shadowProofHash||null,
      parentConcept:watch.parentConcept,authorizationId:id,revision:claimed.revision,maximumSeats:claimed.maximumSeats,
      ownerId:watch.ownerId,systemName:watch.systemName,mode:watch.mode,resetEpoch:watch.resetEpoch,
      armedAtMs:watch.armedAtMs,releaseAtMs:watch.releaseAtMs,expiresAtMs:watch.expiresAtMs,
      stopPriceCents:watch.stopPriceCents,peakSinceArmCents:watch.peakSinceArmCents,
      troughSinceArmCents:watch.troughSinceArmCents,crashConfirmedAtMs:watch.crashConfirmedAtMs,
      upwardTicks:watch.upwardTicks,lastQuoteAtMs:watch.lastQuoteAtMs,
      ...(athenaRise.enabled?{athenaTrigger:athenaRise.stamp}:{})};
    // Any exception/ambiguous LIVE result intentionally leaves EXECUTING
    // durable. Restart reconciles a broker-owned intent BEFORE retrying.
    let opened;
    try{
      opened=await this.strategy.createHunter('Crash Recovery Hunter',quote,Number(s.crashRecoveryStakeCents||500),0,{
        sourceFeeder:watch.parentConcept,sourceTradeId:watch.parentEntryId,
        starlightRecovery:true,starlightRecoverySnapshot:snapshot,
      });
    }catch(error){
      // SE2-R7: an exception after the durable claim previously left the
      // watch in EXECUTING forever, even in SIM with no broker mutation.
      // Query child truth before releasing: a completed/ambiguous LIVE BUY
      // must NEVER be duplicated by a blind retry.
      try{
        const child=await this.db.entryByConceptSourceTradeId(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);
        if(!child && s.mode==='SIMULATION'){
          const retry={...claimed,status:'WATCHING',retryNotBeforeMs:Date.now()+2_000,
            lastAttemptReason:'execution_exception_no_child',lastExecutionError:String(error?.message||error).slice(0,240)};
          const saved=await this.db.updateStarlightWatch(retry,claimed.revision);
          if(saved)this.starlightRecoveryWatches.set(id,{...retry,revision:Number(saved.revision)});
        }
        // If a child exists, retain the claim and let durable reconciliation
        // decide its final broker/ledger state. No second BUY is authorized.
      }catch{ /* Database uncertainty must remain fail-closed in EXECUTING. */ }
      throw error;
    }
    if(opened){
      const seats=await this.strategy.stackSameAttackSeats('Crash Recovery Hunter',quote,opened,{
        sourceFeeder:watch.parentConcept,sourceTradeId:watch.parentEntryId,
        starlightRecovery:true,starlightRecoverySnapshot:snapshot,
      }).catch(()=>[]);
      await this.consumeStarlightRecoveryWatch(claimed,opened.id);
      this.starlightRecoveryStats.opened+=(1+(seats?.length||0));
      this.starlightRecoveryStats.lastEvent={status:'OPENED',atMs:Date.now(),authorizationId:id,entryId:opened.id,ticker:watch.ticker,seats:1+(seats?.length||0)};
      return {status:'OPENED',entry:opened,seats:1+(seats?.length||0)};
    }
    const pending=await this.db.entryByConceptSourceTradeId(s.systemName,'Crash Recovery Hunter',watch.parentEntryId);
    if(pending){
      if(this.starlightChildMatchesWatch(pending,claimed))await this.consumeStarlightRecoveryWatch(claimed,pending.id);
      return {status:'WATCHING',reason:'aps2_group_resume_required'};
    }
    // SE2-R7: Record the REAL StrategyEngine rejection stage on the parent
    // watch. Prior builds returned null and stored only a generic retry timer,
    // making another zero-entry ledger impossible to diagnose.
    const blocked=[...(this.strategy?.entryPipelineEvents||[])].reverse().find(e=>
      String(e.concept)==='Crash Recovery Hunter'&&String(e.starlightRecoveryParentEntryId||'')===String(watch.parentEntryId)
      &&String(e.status)==='BLOCKED');
    const reason=blocked?String(blocked.reason||blocked.stage||'entry_safety_rejected'):'entry_safety_rejected';
    const next={...claimed,status:'WATCHING',retryNotBeforeMs:Date.now()+20_000,
      lastAttemptReason:reason,lastAttemptStage:blocked?.stage||null,lastAttemptAtMs:Date.now()};
    const saved=await this.db.updateStarlightWatch(next,claimed.revision);
    if(saved)this.starlightRecoveryWatches.set(id,{...next,revision:Number(saved.revision)});
    else this.starlightRecoveryWatches.delete(id);
    return {status:'WATCHING',reason};
  }

  currentCrashWatch(concept, authorizationId, episodeId) {
    const watch=concept==='Recovery Hunter'?this.crystalWallWatches?.get(String(authorizationId))
      :concept==='Sagittarius Justice Arrow'?this.justiceArrowWatches?.get(String(authorizationId))
      :this.ci1CloneWatches?.get(this.ci1CloneWatchKey(concept,authorizationId));
    return watch && String(watch.crashEpisodeId)===String(episodeId)?watch:null;
  }

  ci1CloneWatchKey(concept, authorizationId){return `${concept}|${authorizationId}`;}

  registerObservationWatch(concept, watch={}){
    if(!watch?.authorizationId||!watch?.crashEpisodeId)return false;
    const row={...watch,concept,parentAuthorizationId:watch.parentAuthorizationId||null};
    if(concept==='Recovery Hunter'){
      if(!(this.crystalWallWatches instanceof Map))this.crystalWallWatches=new Map();
      this.crystalWallWatches.set(String(watch.authorizationId),{...this.crystalWallWatches.get(String(watch.authorizationId)),...row});
    }else if(concept==='Sagittarius Justice Arrow'){
      if(!(this.justiceArrowWatches instanceof Map))this.justiceArrowWatches=new Map();
      this.justiceArrowWatches.set(String(watch.authorizationId),{...this.justiceArrowWatches.get(String(watch.authorizationId)),...row});
    }else{
      if(!(this.ci1CloneWatches instanceof Map))this.ci1CloneWatches=new Map();
      const key=this.ci1CloneWatchKey(concept,watch.authorizationId);
      this.ci1CloneWatches.set(key,{...this.ci1CloneWatches.get(key),...row});
    }
    return true;
  }

  observeCi1WallCloneQuotes(q, crashState) {
    const s=this.settings||{};
    if(!q?.ticker)return false;
    if(!(this.ci1CloneWatches instanceof Map))this.ci1CloneWatches=new Map();
    const ticker=String(q.ticker),now=Date.now();
    const saints=(CI1_WALL_CLONE.saints||[]).filter((concept)=>concept!=='Recovery Hunter'&&concept!=='Sagittarius Justice Arrow'&&concept!=='Crash Recovery Hunter'&&isModelEnabled(s,concept));
    if(!saints.length)return false;
    let armed=false;
    if(crashState?.episodeId){
      const peak=Math.max(0,Number(crashState.preCrashPeakCents||0));
      const trough=Math.max(0,Number(crashState.troughCents||0));
      const crashDepth=Math.max(Number(crashState.crashDepthCents||0),peak>0&&trough>0?peak-trough:0);
      for(const concept of saints){
        const specMin=concept==='Momentum Hunter'?Number(s.momentumHunterMinCrashCents||0)
          :concept==='Wave Surfer'?Number(s.waveSurferMinCrashCents||0)
          :concept==='Crash Recovery Hunter'?Number(s.crashRecoveryHunterMinCrashCents||0)
          :concept==='Scarlet Needle'?Number(s.scarletNeedleMinCrashCents||0)
          :concept==='Lightning Plasma'?Number(s.lightningPlasmaMinCrashCents||0)
          :Number(s.athenaExclamationMinCrashCents||0);
        const minCrash=Math.max(0,Math.floor(Number.isFinite(specMin)?specMin:CI1_WALL_CLONE.minCrashCents));
        if(!(crashDepth+1e-9>=minCrash))continue;
        const crashEpisodeId=String(crashState.episodeId);
        const authorizationId=`CI1-WALL-CLONE:${concept}:${crashEpisodeId}`;
        const key=this.ci1CloneWatchKey(concept,authorizationId);
        if(this.ci1ConsumedEpisodes?.has(ci1EpisodeConsumptionKey(concept,crashEpisodeId)))continue;
        if(!this.ci1CloneWatches.get(key)){
          for(const [id,prior] of this.ci1CloneWatches){
            if(String(prior?.ticker||'')===ticker&&String(prior?.concept||'')===concept&&id!==key)this.ci1CloneWatches.delete(id);
          }
          this.ci1CloneWatches.set(key,{authorizationId,crashEpisodeId,concept,ticker,eventTicker:String(q.eventTicker||q.ticker),sport:String(crashState.sport||'Unknown'),
            crashStartedAtMs:Number(crashState.crashStartedAtMs||crashState.startedAtMs||now),authorizedAtMs:now,preCrashPeakCents:peak,
            troughCents:trough||Number(q.yesBid||0),troughAtMs:Number(crashState.troughAtMs||now),crashDepthCents:crashDepth,
            upwardTicks:0,lastBidCents:Number(q.yesBid||0),lastAttemptQueuedAtMs:0,status:'CRASH_ARMED'});
          this.ci1CloneStats.eligible+=1;
          armed=true;
        }
      }
    }
    const watches=[...this.ci1CloneWatches.values()].filter((w)=>String(w?.ticker||'')===ticker);
    for(const prior of watches){
      const concept=String(prior.concept||'');
      if(!saints.includes(concept))continue;
      const signal=independentCi1SignalState(concept,prior,q,s,now);
      const watch={...prior,...signal,authorizationId:String(prior.authorizationId),crashEpisodeId:String(prior.crashEpisodeId),concept,ticker,eventTicker:String(q.eventTicker||prior.eventTicker||ticker),preCrashPeakCents:Math.max(Number(prior.preCrashPeakCents||0),Number(crashState?.preCrashPeakCents||0)),updatedAtMs:now,status:signal.terminal?'EXPIRED':signal.qualified?'READY':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};
      const key=this.ci1CloneWatchKey(concept,watch.authorizationId);
      if(signal.terminal){this.ci1CloneWatches.delete(key);continue;}
      this.ci1CloneWatches.set(key,watch);
      if(signal.qualified && Number(watch.retryNotBeforeMs||0)<=now && this.shadowEntryGate().allowed){
        this.ci1CloneQueue.enqueue(key,()=>this.attemptCi1WallCloneAttack(key));
      }
    }
    return watches.length>0||armed;
  }

  async attemptCi1WallCloneAttack(watchKey) {
    const s=this.settings||{};
    const watch=this.ci1CloneWatches.get(String(watchKey));
    if(!watch)return {status:'IGNORED',reason:'watch_missing'};
    const concept=String(watch.concept||'');
    const gate=this.shadowEntryGate();
    if(!gate.allowed){
      const current=this.ci1CloneWatches.get(String(watchKey));
      if(current){current.retryNotBeforeMs=Date.now()+15_000;current.retryReason=gate.reason;this.ci1CloneWatches.set(String(watchKey),current);}
      this.ci1CloneStats.lastEvent={status:'WATCHING',atMs:Date.now(),concept,ticker:watch.ticker,reason:gate.reason};
      return {status:'WATCHING',reason:gate.reason};
    }
    if(concept==='Crash Recovery Hunter'){this.ci1CloneWatches.delete(String(watchKey));return {status:'IGNORED',reason:'starlight_stop_loss_only'};}
    if(!isModelEnabled(s,concept)){this.ci1CloneWatches.delete(String(watchKey));return {status:'IGNORED',reason:'model_disabled'};}
    if(this.ci1CloneInFlight.has(String(watchKey)))return {status:'IGNORED',reason:'in_flight'};
    const episodeKey=ci1EpisodeConsumptionKey(concept,watch.crashEpisodeId);
    if(this.ci1ConsumedEpisodes.has(episodeKey)||this.ci1EpisodeReservations.has(episodeKey)){
      this.ci1CloneWatches.delete(String(watchKey));
      this.ci1CloneStats.blocked+=1;
      this.ci1CloneStats.lastEvent={status:'BLOCKED',atMs:Date.now(),concept,ticker:watch.ticker,reason:'one_entry_per_crash_episode'};
      return {status:'BLOCKED',reason:'one_entry_per_crash_episode'};
    }
    this.ci1CloneInFlight.add(String(watchKey));
    this.ci1EpisodeReservations.add(episodeKey);
    try{
      if(await this.ci1EpisodeConsumed(concept,watch.crashEpisodeId)){
        this.ci1CloneWatches.delete(String(watchKey));
        this.ci1CloneStats.blocked+=1;
        this.ci1CloneStats.lastEvent={status:'BLOCKED',atMs:Date.now(),concept,ticker:watch.ticker,reason:'one_entry_per_crash_episode'};
        return {status:'BLOCKED',reason:'one_entry_per_crash_episode'};
      }
      const q=this.market?.getQuote?.(watch.ticker)||null;
      if(!q)return {status:'WATCHING',reason:'quote_missing'};
      this.ci1CloneStats.attempted+=1;
      const opened=await this.strategy.executeIndependentCi1Attack(concept,q,watch);
      if(!opened){this.ci1CloneStats.watching+=1;this.ci1CloneStats.lastEvent={status:'WATCHING',atMs:Date.now(),concept,ticker:watch.ticker,reason:'hard_safety_or_card'};return {status:'WATCHING',reason:'hard_safety_or_card'};}
      this.ci1CloneWatches.delete(String(watchKey));
      this.ci1ConsumedEpisodes.add(episodeKey);
      this.ci1CloneStats.opened+=1;
      this.ci1CloneStats.lastEvent={status:'OPENED',atMs:Date.now(),concept,ticker:watch.ticker,id:opened.id};
      if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(watch.ticker);
      return {status:'OPENED',id:opened.id,concept};
    }catch(error){
      this.ci1CloneStats.blocked+=1;
      const current=this.ci1CloneWatches.get(String(watchKey));
      if(current){
        current.retryNotBeforeMs=Date.now()+15_000;
        current.retryReason='ci1_wall_clone_exception';
        this.ci1CloneWatches.set(String(watchKey),current);
      }
      await this.db.audit('error','ci1_wall_clone_failed',{concept,ticker:watch.ticker,message:String(error?.message||error)}).catch(()=>{});
      return {status:'BLOCKED',reason:'ci1_wall_clone_exception'};
    }finally{
      this.ci1CloneInFlight.delete(String(watchKey));
      this.ci1EpisodeReservations.delete(episodeKey);
    }
  }

  async ci1EpisodeConsumed(concept, episodeId){
    const key=ci1EpisodeConsumptionKey(concept,episodeId);
    if(this.ci1ConsumedEpisodes.has(key))return true;
    const existing=typeof this.db?.entryByConceptSourceTradeId==='function'?await this.db.entryByConceptSourceTradeId(this.settings.systemName,concept,episodeId).catch(()=>null):null;
    if(!ci1EpisodeEntryConsumes(existing,this.settings.mode))return false;
    this.ci1ConsumedEpisodes.add(key);
    return true;
  }

  async hydrateCi1ConsumedEpisodes(){
    this.ci1ConsumedEpisodes=new Set();
    if(typeof this.db?.listCi1ConsumedEpisodes!=='function')return;
    const rows=await this.db.listCi1ConsumedEpisodes(this.settings.systemName,this.settings.mode).catch(()=>[]);
    for(const row of rows||[])this.ci1ConsumedEpisodes.add(ci1EpisodeConsumptionKey(row.conceptName,row.sourceTradeId));
  }

  queueJusticeArrowWatch(authorizationOrTicker) {
    const key=String(authorizationOrTicker||'');
    if(!key||!(this.justiceArrowWatches instanceof Map))return false;
    const watches=this.justiceArrowWatches.has(key)?[this.justiceArrowWatches.get(key)]:[...this.justiceArrowWatches.values()].filter((w)=>String(w?.ticker||'')===key);
    if(!watches.length)return false;
    if(!(this.justiceArrowQueue instanceof CoalescingWorkQueue))this.justiceArrowQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,k)=>{await this.db.audit('error','justice_arrow_v2_queue',{key:k,message:String(error?.message||error)}).catch(()=>{});}});
    for(const watch of watches)this.justiceArrowQueue.enqueue(`crash:${String(watch.authorizationId)}`,()=>this.attemptJusticeArrowAttack(String(watch.authorizationId)));
    return true;
  }

  async attemptJusticeArrowAttack(authorizationId) {
    const stats=this.justiceArrowRuntime(),s=this.settings||{};
    const watch=this.justiceArrowWatches.get(String(authorizationId));
    if(!watch)return {status:'IGNORED',reason:'watch_missing'};
    const ticker=String(watch.ticker||''),crashEpisodeId=String(watch.crashEpisodeId||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),authorizationId:String(authorizationId),crashEpisodeId,ticker,...data};return stats.lastEvent;};
    if(s.justiceArrowEnabled!==true){this.dropJusticeArrowWatch(String(authorizationId));return {status:'IGNORED',reason:'justice_arrow_disabled'};}
    const windowMs=Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    if(Number(watch.crashStartedAtMs||0)>0&&Date.now()-Number(watch.crashStartedAtMs)>windowMs){
      this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'tracking_window_elapsed'});return {status:'EXPIRED',reason:'tracking_window_elapsed'};
    }
    if(this.justiceArrowInFlight.has(String(authorizationId))){stats.duplicateSuppressed+=1;return {status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};}
    this.justiceArrowInFlight.add(String(authorizationId));
    let unlock=null;
    const baseEpisode=(decision={},fireCommand={})=>({id:String(authorizationId),systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(watch.eventTicker||ticker),side:'YES',sport:String(watch.sport||'Unknown'),boltAtMs:Number(watch.crashStartedAtMs||watch.authorizedAtMs||Date.now()),boltSnapshot:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authority:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,crashEpisodeId,preCrashPeakCents:Number(watch.preCrashPeakCents||0),crashDepthCents:Number(watch.crashDepthCents||0)},athenaDecision:decision,fireCommand,attackSelected:'Sagittarius Justice Arrow',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    try{
      if(typeof this.db.acquireHunterTickerLock==='function'){
        unlock=await this.db.acquireHunterTickerLock(s.systemName,`justice-arrow-v2:${String(authorizationId)}`);
        if(!unlock){stats.duplicateSuppressed+=1;return {status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}
      }
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):null;
      const existingState=String(existing?.athenaDecision?.justiceArrow?.status||existing?.athenaDecision?.decision||'');
      if(existing?.entryId||['OPENED','EXPIRED','BLOCKED'].includes(existingState)){
        this.dropJusticeArrowWatch(String(authorizationId));stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{existingState,entryId:existing?.entryId||null});return {status:'DUPLICATE_SUPPRESSED',reason:'durable_episode_consumed'};
      }
      if(!existing){
        const lineage={version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,status:'CRASH_ARMED',terminal:false,authorizationId:String(authorizationId),crashEpisodeId,ticker,eventTicker:String(watch.eventTicker||ticker),authorizedAtMs:Number(watch.authorizedAtMs||Date.now()),preCrashPeakCents:Number(watch.preCrashPeakCents||0),troughCents:Number(watch.troughCents||0),crashDepthCents:Number(watch.crashDepthCents||0),fixedStakeCents:Number(s.justiceArrowStakeCents),stakeMultiplier:1,stakeMultiplierAllowed:false,oneEntryPerCrashEpisode:true,profitAuthority:ATHENA_EXIT_INTELLIGENCE.version};
        await this.db.upsertOpportunityEpisode(baseEpisode({decision:'AUTHORIZED',reason:'ci1_crash_authorized_justice_arrow_v2',strategicAuthority:true,justiceArrow:lineage}));
        stats.authorized+=1;record('AUTHORIZED',{crashDepthCents:Number(watch.crashDepthCents||0)});
      }
      if(watch.terminal||String(watch.status)==='EXPIRED'){
        const decision={decision:'EXPIRED',reason:'market_final',strategicAuthority:true,justiceArrow:{version:SAGITTARIUS_JUSTICE_ARROW.version,status:'EXPIRED',terminal:true,authorizationId:String(authorizationId),crashEpisodeId}};
        await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...(existing||{}),athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
        this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_final'});return {status:'EXPIRED',reason:'market_final'};
      }
      const gate=this.shadowEntryGate();
      if(!gate.allowed){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),gate.reason,RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:gate.reason});return {status:'WATCHING',reason:gate.reason};}
      // RWG1: durable crash authorization is cheap; REST execution proof is
      // reserved for an actually READY websocket-driven recovery watch.
      if(String(watch.status||'')!=='READY'){stats.watching+=1;record('WATCHING',{reason:'rebound_not_ready',watchStatus:String(watch.status||'')});return {status:'WATCHING',reason:'rebound_not_ready'};}
      // A same-attack position on this exact ticker cannot execute until the
      // existing position closes. Detect that before REST verification so an
      // impossible candidate cannot create quote-rate REST/WS recovery churn.
      const openRows=typeof this.db?.openEntriesByTicker==='function'?await this.db.openEntriesByTicker(s.systemName,ticker).catch(()=>[]):[];
      const coexisting=openRows.filter((e)=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&openLike(e.status)&&String(e.ownerId||s.ownerId)===String(s.ownerId)&&String(e.mode||s.mode)===String(s.mode));
      const sameConcept=coexisting.filter((e)=>String(e.conceptName||'')==='Sagittarius Justice Arrow');
      if(sameConcept.length){
        this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'ticker_exposure_active',RECOVERY_WATCH_EXECUTION_GOVERNOR.exposureBlockedRetryMs);
        stats.watching+=1;record('WATCHING',{reason:'ticker_exposure_active',existingEntryIds:sameConcept.map((e)=>String(e.id))});return {status:'WATCHING',reason:'ticker_exposure_active'};
      }
      const parentLike=coexisting.filter((e)=>String(e.conceptName||'')!=='Sagittarius Justice Arrow');
      const sourceKind=parentLike.length?'OWNED_REAL_POSITION':'TRACKED_MARKET';
      // Use the already sequence-aligned websocket quote for the strategic
      // READY recheck. Strategy.prepareEntryExecution performs the one required
      // fresh REST market+book proof at the actual execution boundary.
      const cached=this.market?.getQuote?.(ticker)||null;
      if(!cached||cached.bookInvalid===true){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'canonical_book_not_ready',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'canonical_book_not_ready'});return {status:'WATCHING',reason:'canonical_book_not_ready'};}
      const q={...cached,ticker,eventTicker:String(cached.eventTicker||cached.ticker||ticker)};
      const status=String(q.status||'').toLowerCase();
      if(String(q.eventTicker||ticker)!==String(watch.eventTicker||ticker)){stats.blocked+=1;record('BLOCKED',{reason:'event_identity_mismatch'});return {status:'BLOCKED',reason:'event_identity_mismatch'};}
      if(status!=='active'||Boolean(q.result)){
        const decision={decision:'EXPIRED',reason:'market_not_active',strategicAuthority:true,justiceArrow:{version:SAGITTARIUS_JUSTICE_ARROW.version,status:'EXPIRED',terminal:true,authorizationId:String(authorizationId),crashEpisodeId}};
        await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...(existing||{}),athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
        this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_not_active'});return {status:'EXPIRED',reason:'market_not_active'};
      }
      const signal=justiceArrowSignalState(watch,q,s,Date.now());
      const updated={...watch,...signal,updatedAtMs:Date.now(),status:signal.qualified?'READY':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};
      this.justiceArrowWatches.set(String(authorizationId),updated);
      if(!signal.qualified){stats.watching+=1;record('WATCHING',{reason:signal.reason,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});return {status:'WATCHING',reason:signal.reason};}
      const executionWatch={...updated,...signal,sourceKind,coexistingEntryIds:parentLike.map((e)=>String(e.id))};
      stats.attempted+=1;if(sourceKind==='OWNED_REAL_POSITION')stats.ownedSource+=1;else stats.trackedSource+=1;record('ATTEMPTED',{sourceKind,bidCents:signal.bidCents,askCents:signal.askCents,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});
      const opened=await this.strategy.executeJusticeArrowAttack(q,executionWatch);
      if(!opened){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'hard_safety_liquidity_or_capacity_blocked',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'hard_safety_liquidity_or_capacity_blocked',sourceKind});return {status:'WATCHING',reason:'hard_safety_liquidity_or_capacity_blocked'};}
      this.dropJusticeArrowWatch(String(authorizationId));
      stats.opened+=1;record('OPENED',{sourceKind,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0)});
      const lineage=structuredClone(opened.entryConfig?.justiceArrow||executionWatch);
      const openedDecision={decision:'OPENED',reason:'justice_arrow_v2_crash_rebound_opened',strategicAuthority:true,justiceArrow:{...lineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
      const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):existing;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision,structuredClone(opened.entryConfig?.justiceArrowFire||{})),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.justiceArrowFire||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:'Sagittarius Justice Arrow',updatedAtMs:Date.now()}).catch(()=>{});
      await this.db.audit('info','justice_arrow_v2_opened',{authorizationId:String(authorizationId),crashEpisodeId,ticker,sourceKind,coexistingEntryIds:executionWatch.coexistingEntryIds,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0),troughCents:Number(signal.troughCents||0),reboundCents:Number(signal.reboundCents||0),fixedStakeCents:Number(s.justiceArrowStakeCents),stakeMultiplier:1,profitAuthority:opened.entryConfig?.profitAuthority||null}).catch(()=>{});
      return {status:'OPENED',authorizationId:String(authorizationId),entry:opened};
    }catch(error){
      stats.blocked+=1;record('BLOCKED',{reason:'justice_arrow_v2_exception',message:String(error?.message||error)});await this.db.audit('error','justice_arrow_v2_failed',{authorizationId:String(authorizationId),crashEpisodeId,ticker,message:String(error?.message||error)}).catch(()=>{});return {status:'BLOCKED',reason:'justice_arrow_v2_exception'};
    }finally{
      if(unlock)await unlock().catch(()=>{});
      this.justiceArrowInFlight.delete(String(authorizationId));
    }
  }

  async hydrateJusticeArrowV2() {
    this.justiceArrowWatches=new Map();
    if(this.settings?.justiceArrowEnabled!==true||typeof this.db?.opportunityEpisodes!=='function')return;
    const windowMs=Math.max(1,Number(this.settings.recoveryTrackingHours||24))*3600000;
    const sinceMs=Date.now()-windowMs;
    const episodes=await this.db.opportunityEpisodes(this.settings.systemName,{limit:1000,trackingComplete:false,sinceMs}).catch(()=>[]);
    for(const ep of episodes||[]){
      const ja=ep?.athenaDecision?.justiceArrow;
      if(String(ja?.version||'')!==SAGITTARIUS_JUSTICE_ARROW.version||String(ja?.policyRevision||SAGITTARIUS_JUSTICE_ARROW.policyRevision)!==SAGITTARIUS_JUSTICE_ARROW.policyRevision)continue;
      const state=String(ja?.status||ep?.athenaDecision?.decision||'').toUpperCase();
      if(ep?.entryId||ja?.terminal===true||['OPENED','EXPIRED','BLOCKED'].includes(state))continue;
      const crashEpisodeId=String(ja?.crashEpisodeId||ep?.boltSnapshot?.crashEpisodeId||'');
      const ticker=String(ep?.ticker||ja?.ticker||'');
      if(!crashEpisodeId||!ticker)continue;
      const authorizationId=String(ja?.authorizationId||ep.id||`JUSTICE-ARROW-V2:${crashEpisodeId}`);
      const watch={
        authorizationId,crashEpisodeId,ticker,eventTicker:String(ep?.eventTicker||ja?.eventTicker||ticker),sport:String(ep?.sport||'Unknown'),
        crashStartedAtMs:Number(ep?.boltAtMs||ja?.crashStartedAtMs||0),authorizedAtMs:Number(ja?.authorizedAtMs||ep?.updatedAtMs||Date.now()),
        preCrashPeakCents:Number(ja?.preCrashPeakCents||ep?.boltSnapshot?.preCrashPeakCents||0),troughCents:Number(ja?.troughCents||0),
        troughAtMs:Number(ja?.troughAtMs||0),crashDepthCents:Number(ja?.crashDepthCents||ep?.boltSnapshot?.crashDepthCents||0),
        reboundCents:Number(ja?.reboundCents||0),upwardTicks:Number(ja?.upwardTicks||0),lastBidCents:Number(ja?.lastBidCents||ja?.troughCents||0),
        lastAttemptQueuedAtMs:0,status:'RESTART_REHYDRATED',sourceKind:String(ja?.sourceKind||'TRACKED_MARKET'),coexistingEntryIds:[...(ja?.coexistingEntryIds||[])].map(String),
      };
      this.justiceArrowWatches.set(authorizationId,watch);
      if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);
    }
    const stats=this.justiceArrowRuntime();
    stats.lastEvent=this.justiceArrowWatches.size?{status:'RESTART_REHYDRATED',atMs:Date.now(),activeWatches:this.justiceArrowWatches.size}:stats.lastEvent;
  }

  queueLightningPlasmaContinuation(entry) {
    const id=String(entry?.id||'');
    if(!id)return false;
    if(!(this.lightningPlasmaContinuationQueue instanceof CoalescingWorkQueue)){
      this.lightningPlasmaContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','lightning_plasma_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    }
    return this.lightningPlasmaContinuationQueue.enqueue(`close:${id}`,()=>this.handleLightningPlasmaContinuation(entry));
  }

  queueLightningPlasmaWatch(ticker) {
    const exact=String(ticker||'');
    if(!exact||!(this.lightningPlasmaWatches instanceof Map))return false;
    const watches=[...this.lightningPlasmaWatches.values()].filter((w)=>String(w?.ticker||'')===exact);
    if(!watches.length)return false;
    if(!(this.lightningPlasmaContinuationQueue instanceof CoalescingWorkQueue)){
      this.lightningPlasmaContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','lightning_plasma_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    }
    for(const watch of watches)this.lightningPlasmaContinuationQueue.enqueue(`close:${String(watch.parentShadow?.id||watch.authorizationId)}`,()=>this.handleLightningPlasmaContinuation(watch.parentShadow));
    return true;
  }

  lightningPlasmaContinuationRuntime() {
    if(!(this.lightningPlasmaContinuationInFlight instanceof Set))this.lightningPlasmaContinuationInFlight=new Set();
    if(!(this.lightningPlasmaWatches instanceof Map))this.lightningPlasmaWatches=new Map();
    if(!this.lightningPlasmaContinuationStats||typeof this.lightningPlasmaContinuationStats!=='object')this.lightningPlasmaContinuationStats={version:LIGHTNING_PLASMA.version,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,maxRepeatBlocked:0,selfParentBlocked:0,modeMismatchBlocked:0,lastEvent:null};
    return this.lightningPlasmaContinuationStats;
  }

  async handleLightningPlasmaContinuation(parentShadow) {
    const stats=this.lightningPlasmaContinuationRuntime();
    const s=this.settings||{};
    const parentId=String(parentShadow?.id||''),ticker=String(parentShadow?.ticker||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),parentShadowTradeId:parentId,ticker,...data};return stats.lastEvent;};
    return {status:'IGNORED',reason:'follow_up_retired_athena_initial_entry'};
    if(!parentId||!ticker||parentShadow?.status!=='closed'||Number(parentShadow?.remainingCount||0)>1e-9)return {status:'IGNORED',reason:'not_fully_closed'};
    if(!isProfitableExecutableParent(parentShadow))return {status:'IGNORED',reason:'not_profitable_executable_parent'};
    if(String(parentShadow.conceptName||'')==='Lightning Plasma')return {status:'IGNORED',reason:'self_parent_blocked'};
    if(s.lightningPlasmaEnabled!==true||s.geminiEnabled!==true)return {status:'IGNORED',reason:'lightning_plasma_disabled'};
    if(String(parentShadow.conceptName||'')==='Lightning Plasma'){
      stats.selfParentBlocked+=1;record('IGNORED',{reason:'parent_is_lightning_plasma'});
      return {status:'IGNORED',reason:'parent_is_lightning_plasma'};
    }
    if(String(parentShadow.systemName||'')!==String(s.systemName)||String(parentShadow.ownerId||'')!==String(s.ownerId)){
      stats.blocked+=1;record('BLOCKED',{reason:'owner_or_system_mismatch'});return {status:'BLOCKED',reason:'owner_or_system_mismatch'};
    }
    if(String(parentShadow.mode||'')!==String(s.mode||'')){
      stats.modeMismatchBlocked+=1;stats.blocked+=1;record('BLOCKED',{reason:'mode_changed_since_shadow_close'});return {status:'BLOCKED',reason:'mode_changed_since_shadow_close'};
    }
    const windowMs=Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    if(Number(parentShadow.closedAtMs||0)>0 && Date.now()-Number(parentShadow.closedAtMs)>windowMs)return {status:'IGNORED',reason:'tracking_window_elapsed'};
    stats.eligible+=1;
    const authorizationId=`LIGHTNING-PLASMA-CONTINUATION:${parentId}:1`;
    if(this.lightningPlasmaContinuationInFlight.has(authorizationId)){
      stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,scope:'local'});return {status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};
    }
    this.lightningPlasmaContinuationInFlight.add(authorizationId);
    let unlock=null;
    const baseEpisode=(decision={})=>({id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentShadow.eventTicker||ticker),side:'YES',sport:String(parentShadow.sport||'Unknown'),boltAtMs:Number(parentShadow.closedAtMs||Date.now()),boltSnapshot:{version:LIGHTNING_PLASMA.version,authority:LIGHTNING_PLASMA.strategicEntryAuthority,parentShadowTradeId:parentId},athenaDecision:decision,fireCommand:{},attackSelected:'Lightning Plasma',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    try{
      if(typeof this.db.acquireHunterTickerLock!=='function')return {status:'BLOCKED',reason:'continuation_lock_unavailable'};
      unlock=await this.db.acquireHunterTickerLock(s.systemName,`lightning-plasma-continuation:${parentId}`);
      if(!unlock){stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,scope:'database_lock'});return {status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
      const existingStatus=String(existing?.athenaDecision?.lightningPlasmaContinuation?.status||existing?.athenaDecision?.decision||'');
      if(existing?.entryId||['OPENED','BLOCKED'].includes(existingStatus)){
        stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,scope:'durable_episode',existingStatus,entryId:existing?.entryId||null});return {status:'DUPLICATE_SUPPRESSED',reason:'durable_authorization_already_consumed',entryId:existing?.entryId||null};
      }
      const authorizedAtMs=Number(existing?.athenaDecision?.lightningPlasmaContinuation?.authorizedAtMs||Date.now());
      const lineage={version:LIGHTNING_PLASMA.version,status:'AUTHORIZED',terminal:false,authorizationId,parentShadowTradeId:parentId,parentConcept:String(parentShadow.conceptName||''),parentCloseReason:String(parentShadow.closeReason||''),parentRealizedPnlCents:Number(parentShadow.pnlCents||0),parentExitPriceCents:Number(parentShadow.exitPriceCents||0),parentClosedAtMs:Number(parentShadow.closedAtMs||0),sourceCosmo:String(parentShadow.sourceFeeder||''),sourceCosmoTradeId:String(parentShadow.sourceTradeId||''),authorizedAtMs,fullExecutionSafetyRequired:true,normalStrategicDiscoveryBypassed:true,reboundRequired:true};
      if(existingStatus!=='AUTHORIZED'&&existingStatus!=='WATCHING'){
        await this.db.upsertOpportunityEpisode(baseEpisode({decision:'AUTHORIZED',reason:'another_dimension_aurora_authorized_lightning_plasma',strategicAuthority:false,lightningPlasmaContinuation:lineage}));
        stats.authorized+=1;record('AUTHORIZED',{authorizationId});
      }
      const watch={authorizationId,parentShadow,authorizedAtMs,ticker,eventTicker:String(parentShadow.eventTicker||ticker)};
      this.lightningPlasmaWatches.set(authorizationId,watch);
      return this.attemptLightningPlasmaContinuation(watch);
    }catch(error){
      await this.db.audit('error','lightning_plasma_continuation_failed',{authorizationId,parentShadowTradeId:parentId,ticker,message:String(error?.message||error)}).catch(()=>{});
      stats.blocked+=1;record('BLOCKED',{reason:'continuation_exception',authorizationId});
      return {status:'BLOCKED',reason:'continuation_exception'};
    }finally{
      if(unlock)await unlock().catch(()=>{});
      this.lightningPlasmaContinuationInFlight.delete(authorizationId);
    }
  }

  async attemptLightningPlasmaContinuation(watch) {
    const stats=this.lightningPlasmaContinuationRuntime();
    const s=this.settings||{};
    const authorizationId=String(watch?.authorizationId||'');
    const parentShadow=watch?.parentShadow;
    const parentId=String(parentShadow?.id||'');
    const ticker=String(watch?.ticker||parentShadow?.ticker||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),parentShadowTradeId:parentId,ticker,authorizationId,...data};return stats.lastEvent;};
    if(!authorizationId||!parentId||!ticker)return {status:'IGNORED',reason:'watch_incomplete'};
    const windowMs=Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    if(Number(parentShadow.closedAtMs||0)>0 && Date.now()-Number(parentShadow.closedAtMs)>windowMs){
      this.lightningPlasmaWatches.delete(authorizationId);
      stats.blocked+=1;record('BLOCKED',{reason:'tracking_window_elapsed'});
      return {status:'BLOCKED',reason:'tracking_window_elapsed'};
    }
    const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
    const existingStatus=String(existing?.athenaDecision?.lightningPlasmaContinuation?.status||existing?.athenaDecision?.decision||'');
    if(existing?.entryId||['OPENED','BLOCKED'].includes(existingStatus)){
      this.lightningPlasmaWatches.delete(authorizationId);
      return {status:'DUPLICATE_SUPPRESSED',reason:'durable_authorization_already_consumed',entryId:existing?.entryId||null};
    }
    const refreshed=await this.freshExecutionSnapshot(ticker);
    if(!refreshed?.marketFresh||!refreshed?.bookFresh||!refreshed?.quote){
      stats.watching+=1;record('WATCHING',{reason:'fresh_executable_market_unavailable'});
      return {status:'WATCHING',reason:'fresh_executable_market_unavailable'};
    }
    const q={...refreshed.quote,ticker,eventTicker:String(refreshed.quote.eventTicker||refreshed.quote.ticker||ticker)};
    const expectedEvent=String(parentShadow.eventTicker||ticker),status=String(q.status||'').toLowerCase();
    if(String(q.eventTicker||ticker)!==expectedEvent){
      this.lightningPlasmaWatches.delete(authorizationId);stats.blocked+=1;record('BLOCKED',{reason:'event_identity_mismatch'});
      await this.db.upsertOpportunityEpisode({...(existing||{}),id:authorizationId,athenaDecision:{decision:'BLOCKED',reason:'event_identity_mismatch',lightningPlasmaContinuation:{status:'BLOCKED',terminal:true,authorizationId}},updatedAtMs:Date.now()}).catch(()=>{});
      return {status:'BLOCKED',reason:'event_identity_mismatch'};
    }
    if(status!=='active'||Boolean(q.result)){
      this.lightningPlasmaWatches.delete(authorizationId);stats.blocked+=1;record('BLOCKED',{reason:'market_not_active'});
      await this.db.upsertOpportunityEpisode({...(existing||{}),id:authorizationId,athenaDecision:{decision:'BLOCKED',reason:'market_not_active',lightningPlasmaContinuation:{status:'BLOCKED',terminal:true,authorizationId}},updatedAtMs:Date.now()}).catch(()=>{});
      return {status:'BLOCKED',reason:'market_not_active'};
    }
    const signal=followUpConfirmationState({
      preCrashPeakCents:Number(parentShadow.peakPriceCents||parentShadow.exitPriceCents||0),
      troughCents:Number(parentShadow.exitPriceCents||0),
      parentExitPriceCents:Number(parentShadow.exitPriceCents||0),
      lastBidCents:Number(q.yesBid||0),
      upwardTicks:0,
      crashDepthCents:Math.max(0,Number(parentShadow.peakPriceCents||0)-Number(parentShadow.exitPriceCents||0)),
    },q,s,Date.now(),'Lightning Plasma');
    if(!signal.qualified){
      stats.watching+=1;record('WATCHING',{reason:signal.reason,bidCents:signal.bidCents,troughCents:signal.troughCents,reboundCents:signal.reboundCents});
      await this.db.upsertOpportunityEpisode({...(existing||{}),id:authorizationId,athenaDecision:{decision:'WATCHING',reason:signal.reason,lightningPlasmaContinuation:{status:'WATCHING',terminal:false,authorizationId,reboundCents:signal.reboundCents,troughCents:signal.troughCents}},updatedAtMs:Date.now()}).catch(()=>{});
      return {status:'WATCHING',reason:signal.reason};
    }
    stats.attempted+=1;record('ATTEMPTED',{authorizationId,bidCents:signal.bidCents,askCents:signal.askCents,reboundCents:signal.reboundCents});
    const opened=await this.strategy.executeLightningPlasmaContinuation(q,parentShadow,{authorizationId,authorizedAtMs:Number(watch.authorizedAtMs||Date.now()),recoveryContext:{troughCents:signal.troughCents,reboundCents:signal.reboundCents}});
    if(!opened){
      stats.watching+=1;record('WATCHING',{reason:'hard_safety_or_execution_blocked'});
      return {status:'WATCHING',reason:'hard_safety_or_execution_blocked'};
    }
    this.lightningPlasmaWatches.delete(authorizationId);
    stats.opened+=1;record('OPENED',{authorizationId,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0)});
    const parentDurable=typeof this.db?.entryById==='function'?await this.db.entryById(parentId).catch(()=>null):parentShadow;
    if(parentDurable&&typeof this.db?.updateEntry==='function'){
      const feederState={...(parentDurable.feederState||parentShadow.feederState||{}),universe:'Gemini',lightningPlasmaEntryId:opened.id,lightningPlasmaOpenedAtMs:Number(opened.openedAtMs||Date.now()),lightningPlasmaAuthorizationId:authorizationId};
      await this.db.updateEntry(parentId,{feederState,updatedAtMs:Date.now()}).catch(()=>{});
      this.rememberAnotherDimension({...parentDurable,feederState,updatedAtMs:Date.now()});
    }
    const openedDecision={decision:'OPENED',reason:'lightning_plasma_continuation_opened',strategicAuthority:false,lightningPlasmaContinuation:{version:LIGHTNING_PLASMA.version,status:'OPENED',terminal:true,authorizationId,parentShadowTradeId:parentId,repeatIndex:1,maxRepeats:1,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
    await this.db.upsertOpportunityEpisode({id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentShadow.eventTicker||ticker),side:'YES',sport:String(parentShadow.sport||'Unknown'),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.athenaFire||{}),attackSelected:'Lightning Plasma',entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),updatedAtMs:Date.now()}).catch(()=>{});
    await this.db.audit('info','lightning_plasma_continuation_opened',{authorizationId,parentShadowTradeId:parentId,ticker,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),reboundCents:Number(opened.entryConfig?.lightningPlasmaContinuation?.reboundCents||0),closeToEntryLatencyMs:Math.max(0,Number(opened.openedAtMs||Date.now())-Number(parentShadow.closedAtMs||watch.authorizedAtMs||0))}).catch(()=>{});
    return {status:'OPENED',authorizationId,entry:opened};
  }

  async init() {
    await this.db.init();
    const loadedSettings = await this.db.loadSettings(freshInstallSettings());
    if(typeof this.db.loadSettingsRevision==='function')this.settingsPersistence.lastRevision=await this.db.loadSettingsRevision();
    const startupMode = normalizeStartupExecutionMode(loadedSettings, env.allowLiveTrading);
    this.settings = startupMode.settings;
    // The database loader already supplies fresh-install defaults for missing
    // fields. Seal legacy card migrations BEFORE any can overwrite saved values.
    const preserved = startupSettingsPreservation(this.settings,{preserveCard:true});
    this.settings = preserved.settings;
    if (this.settings.card20261006SessionApplied !== true) {
      const card = factoryOperatorSettingsPatch();
      const keep = { mode: this.settings.mode, liveArmed: this.settings.liveArmed === true, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      this.settings = { ...this.settings, ...card, ...keep, card20261006SessionApplied: true };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'card_20261006_session_applied', { release: RELEASE }).catch(() => {});
    }
    if (this.settings.card20261007LiveApplied !== true) {
      const card = factoryOperatorSettingsPatch();
      const keep = { mode: this.settings.mode, liveArmed: this.settings.liveArmed === true, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      this.settings = { ...this.settings, ...card, ...keep, card20261007LiveApplied: true };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'card_20261007_live_applied', { release: RELEASE }).catch(() => {});
    }
    if (this.settings.card20261008Applied !== true) {
      const card = factoryOperatorSettingsPatch();
      const keep = { mode: this.settings.mode, liveArmed: this.settings.liveArmed === true, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      this.settings = { ...this.settings, ...card, ...keep, card20261008Applied: true };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'card_20261008_applied', { release: RELEASE }).catch(() => {});
    }
    if (!preserved.overwrite) {
      this.settings = preserved.settings;
      if (preserved.sealed.length) {
        await this.db.saveSettings(this.settings);
        await this.db.audit('info', 'settings_migration_flags_sealed', { release: RELEASE, sealed: preserved.sealed }).catch(() => {});
      }
    } else if (this.settings.factoryTradingProfile20261005Applied !== true) {
      const factory = factoryOperatorSettingsPatch();
      this.settings = { ...this.settings, ...factory, factoryTradingProfile20261005Applied: true, mode: this.settings.mode, liveArmed: false, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'factory_trading_profile_applied', { release: RELEASE, profile: '2026-10-05-TRADING-BOX' }).catch(() => {});
    }
    if (this.settings.athenaArrowCloneApplied !== true) {
      const s = this.settings;
      this.settings = { ...s,
        athenaExclamationEnabled: s.justiceArrowEnabled === true,
        athenaExclamationAthenaX1Enabled: s.justiceArrowAthenaX1Enabled !== false,
        athenaExclamationStakeCents: s.justiceArrowStakeCents,
        athenaExclamationMinEntryCents: s.justiceArrowMinEntryCents,
        athenaExclamationMaxEntryCents: s.justiceArrowMaxEntryCents,
        athenaExclamationMinCrashCents: s.justiceArrowMinCrashCents,
        athenaExclamationMinReboundCents: s.justiceArrowMinReboundCents,
        athenaExclamationMinUpwardTicks: s.justiceArrowMinUpwardTicks,
        athenaExclamationMinProfitNetPerOriginalContractCents: s.justiceArrowMinProfitNetPerOriginalContractCents,
        athenaExclamationMultiply: s.justiceArrowMultiply,
        athenaArrowCloneApplied: true,
      };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'athena_arrow_clone_applied', { release: RELEASE }).catch(() => {});
    }
    if (this.settings.winningCard20261005Applied !== true) {
      const card = factoryOperatorSettingsPatch();
      const keep = { mode: this.settings.mode, liveArmed: this.settings.liveArmed === true, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      this.settings = { ...this.settings, ...card, ...keep, winningCard20261005Applied: true };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'winning_card_20261005_applied', { release: RELEASE }).catch(() => {});
    }
    if (this.settings.card20261006Applied !== true) {
      const card = factoryOperatorSettingsPatch();
      const keep = { mode: this.settings.mode, liveArmed: this.settings.liveArmed === true, engineActive: this.settings.engineActive !== false, systemName: this.settings.systemName, ownerId: this.settings.ownerId, resetTimestampMs: this.settings.resetTimestampMs ?? null };
      this.settings = { ...this.settings, ...card, ...keep, card20261006Applied: true };
      await this.db.saveSettings(this.settings);
      await this.db.audit('info', 'card_20261006_applied', { release: RELEASE }).catch(() => {});
    }
    // A persisted LIVE mode is the operator's durable execution intent. Keep the
    // runtime arm false during boot, then restore it automatically only after
    // the same hard readiness gates used by manual LIVE arming are green.
    this.startupLiveResumeRequested = false;
    this.settings.liveArmed = false;
    await this.db.saveSettings(this.settings);
    if (startupMode.recovered) {
      await this.db.saveSettings(this.settings);
      await this.db.audit('warning', 'startup_mode_recovered_to_simulation', {
        release: RELEASE, priorMode:'LIVE', mode:'SIMULATION', reason:startupMode.reason,
        allowLiveTrading:env.allowLiveTrading, engineActive:this.settings.engineActive === true,
      }).catch(() => {});
    }
    // Migration flags may have committed additional card revisions on boot.
    // Capture the final post-migration database revision before watches run.
    if(typeof this.db.loadSettingsRevision==='function')this.settingsPersistence.lastRevision=await this.db.loadSettingsRevision();
    await this.db.saveDeploymentConfig(deploymentConfigRecord());
    const stored = await this.db.loadCredentials();
    this.credentials = stored || ((env.kalshiApiKeyId && env.kalshiPrivateKeyPem)
      ? { keyId: env.kalshiApiKeyId, privateKeyPem: env.kalshiPrivateKeyPem }
      : null);
    this.kalshi = new KalshiClient(this.credentials || {}, env.kalshiBaseUrl, env.kalshiFallbackBaseUrl);
    this.gameClock = new GameClockAuthority({
      kalshi: this.kalshi,
      audit: (event, data) => this.db.audit('info', event, data),
    });
    this.learning = new LearningEngine(this.db, this.settings.systemName);
    await this.learning.init();
    this.legacyAthena = new Athena({
      db:this.db, systemName:this.settings.systemName, sourceRelease:RELEASE,
      audit:(event,data)=>this.db.audit('info',event,data),
    });
    // R60-HF1: legacy Athena is research/read-only context. It starts neutral
    // and hydrates after the executable runtime is already alive.
    // R52: Athena-C2 is the single economic strategic entry commander. The R50 Athena
    // object remains loaded only for creation-era/legacy compatibility.
    this.athenaCommander = new AthenaCommander({
      db:this.db, systemName:this.settings.systemName, sourceRelease:RELEASE,
      getSettings:()=>this.settings, legacyAthena:this.legacyAthena,
      audit:(event,data)=>this.db.audit('info',event,data),
    });
    // AthenaCommander can rank immediately from live GREEN geometry using its
    // neutral memory. Historical economic memory is optional enrichment only.
    this.athena = this.athenaCommander;
    this.phoenixCosmo = new PhoenixCosmoEngine({ getSettings:()=>this.settings });
    this.market = new MarketHub({
      kalshi: this.kalshi,
      wsUrl: env.kalshiWsUrl,
      fallbackWsUrl: env.kalshiFallbackWsUrl,
      getCredentials: () => this.credentials,
      onStatus: (ok, ts) => {
        this.health.websocketOk = ok;
        this.health.lastWsMessageMs = ts || this.health.lastWsMessageMs;
        this.recomputeHealth();
      },
      onQuote: (q) => {
        // R55/PC1 Phoenix is a lightweight event-driven observer on the already
        // subscribed market stream. It has no entry/order authority; only a
        // fully confirmed ignition is queued for durable Cosmo materialization.
        try {
          const phoenix=this.phoenixCosmo?.observe?.(q,Date.now());
          if(phoenix?.qualified)this.queuePhoenixSignal(phoenix,q);
        } catch(error) {
          void this.db.audit('warning','phoenix_quote_observer',{ticker:q?.ticker||null,message:String(error?.message||error)}).catch(()=>{});
        }
        try { this.atomicThunderBolt?.observeCounterfactual?.(q,Date.now()); } catch {}
        this.queueQuoteProtection(q?.ticker);
        this.queueGoldenEyeEvaluation(q?.ticker);
        // SE2-R6: this is an independent post-stop-loss watcher, not a
        // subscriber to CI1 crash-learning admissibility. CI1 may be absent,
        // stale, or resetting while Starlight still must observe the quote.
        if(q?.ticker)this.enqueueStarlightRecoveryQuote(q);
        // R59/CI1-F1: update causal crash state before the quote is allowed to
        // wake Atomic Thunder/A8. R58 queued Athena first and only then updated
        // CI1, which let a fresh market quote race a stale crash-state snapshot.
        if (q?.ticker && this.learning) {
          try {
            const observedAtMs=Math.min(Date.now(),Math.max(1,Number(q?.quoteAtMs||q?.updatedAtMs||Date.now())));
            const result=this.learning.observeCrashQuote(q,this.settings,observedAtMs);
            const state = result?.state;
            if (result?.transition !== 'STALE_OBSERVATION') {
              if (state?.phase === 'CRASHING' || state?.phase === 'REBOUND_CONFIRMED') this.crashPriorityTickers.add(q.ticker);
              else if (state?.phase === 'NORMAL' || state?.phase === 'FINAL') this.crashPriorityTickers.delete(q.ticker);
              this.observeCrystalWallQuote(q,state);
              this.observeJusticeArrowQuote(q,state);
              this.observeCi1WallCloneQuotes(q,state);
            }
          } catch(e) {
            void this.db.audit('error','crash_intelligence_quote',{ticker:q.ticker,message:String(e?.message||e)}).catch(()=>{});
          }
        }
        // R63 Gemini / Another Dimension observes the already-cached quote/book state.
        // This call performs no SQL/network I/O on the quote hot path; only a
        // qualified open/close transition is coalesced onto its bounded worker.
        try { this.observeAnotherDimensionQuote(q); } catch(error) {
          void this.db.audit('error','another_dimension_quote_observer',{ticker:q?.ticker||null,message:String(error?.message||error)}).catch(()=>{});
        }
        this.queueAthenaOpportunityEvaluation(q?.ticker);
        if(q?.ticker)this.queueLightningPlasmaWatch(q.ticker);
      },
      onPrivate: () => this.queueReconcile(),
    });
    // R60 removes FSI1 from the live process. Its historical module/schema stay
    // readable for audits, but quote-rate observation/persistence was redundant
    // with visible Cosmos shadow trades and was the largest reconstructable
    // memory/DB pressure source in R59.
    this.feederSignalIntel = null;
    this.atomicThunderBolt = new AtomicThunderBoltEngine({
      db:this.db, market:this.market, getSettings:()=>this.settings,
      systemName:this.settings.systemName, sourceRelease:RELEASE,
      audit:(event,data)=>this.db.audit('info',event,data),
      onOpportunityCompleted:(episode)=>this.athenaCommander?.learnEpisode?.(episode),
      onCandidateStage:(event)=>this.recordEntryCandidateStage(event),
    });
    // Counterfactual restart hydration is research-only. The authoritative
    // COSMO_GREEN detector is live immediately and does not wait for history.
    this.profitGuard = new ProfitGuard({
      db: this.db,
      kalshi: this.kalshi,
      market: this.market,
      learning: this.learning,
      athena: this.legacyAthena,
      getSettings: () => this.settings,
      onOpportunityCompleted: (episode) => this.athenaCommander?.learnEpisode?.(episode),
      onPositionClosed: (entry) => {
        // AU2: Scarlet and Plasma are ordinary Athena-path Attacks. Close events no longer arm them.
        // SE2: a hard_stop_loss of a real executable hunter arms Starlight Extinction recovery.
        try { this.armStarlightRecovery(entry); } catch(error) {
          void this.db?.audit?.('error','starlight_recovery_arm_failed',{id:entry?.id||null,message:String(error?.message||error)}).catch?.(()=>{});
        }
      },
    });
    this.goldenEye = new GoldenEye({
      db:this.db, market:this.market, getSettings:()=>this.settings,
      audit:(event,data)=>this.db.audit('info',event,data),
    });
    await this.goldenEye.init();
    await this.rehydrateStarlightRecovery().catch(async(error)=>{
      this.starlightRecoveryBootPending=true;
      this.starlightRecoveryStats.lastRehydrateError=String(error?.message||error);
      try{await this.db.audit('error','starlight_rehydrate_retry_required',{message:String(error?.message||error)});}catch{}
      return 0;
    });
    this.strategy = new StrategyEngine({
      db: this.db,
      kalshi: this.kalshi,
      market: this.market,
      learning: this.learning,
      getCurrentCrashWatch: (concept,id,episode)=>this.currentCrashWatch(concept,id,episode),getCurrentStarlightWatch:(id)=>this.starlightRecoveryWatches?.get(String(id))||null,registerObservationWatch:(concept,watch)=>this.registerObservationWatch(concept,watch),
      athena: this.legacyAthena,
      getSettings: () => this.settings,
      getLiveReady: () => this.isLiveReady(),
      refreshGameClock: (q, options) => this.refreshGameClockForQuote(q, options),
      onHunterOpened: (entry) => {
        if (!entry?.ticker) return;
        this.protectedTickers.add(entry.ticker);
        this.profitGuard?.registerInfinityBreakFastWake?.(entry,this.settings);
        this.invalidateStateSnapshot();
        const wanted = new Set(this.market?.wanted || []);
        wanted.add(entry.ticker);
        this.market?.setWanted?.([...wanted]);
        this.queueGoldenEyeEvaluation(entry.ticker);
      },
      onFeederOpened: (entry) => {
        this.invalidateStateSnapshot();
        if(entry?.ticker)this.feederPriorityTickers.add(entry.ticker);
        if(entry?.ticker&&ACTIVE_FEEDER_CONCEPTS.has(String(entry.conceptName||''))){
          const ticker=String(entry.ticker),rows=this.activeCosmosByTicker.get(ticker)||[];
          if(!rows.some((x)=>String(x.id)===String(entry.id)))this.activeCosmosByTicker.set(ticker,[...rows,entry]);
          this.anotherDimensionSourcePeaks.set(String(entry.id),Math.max(Number(entry.entryPriceCents||0),Number(entry.peakPriceCents||0)));
        }
        this.queueAthenaOpportunityEvaluation(entry?.ticker);
      },
      onShadowAttackOpened: (entry) => {
        this.rememberAnotherDimension(entry);
        this.invalidateStateSnapshot();
        if(entry?.ticker){const wanted=new Set(this.market?.wanted||[]);wanted.add(entry.ticker);this.market?.setWanted?.([...wanted]);}
      },
      onShadowAttackClosed: (entry) => {
        this.rememberAnotherDimension(entry);
        this.anotherDimensionRuntime.delete(String(entry?.id||''));
        if(Number(entry?.pnlCents||0)>0&&String(entry?.closeReason||'')===ANOTHER_DIMENSION.profitableCloseReason){this.anotherDimensionStats.profitClosed+=1;}
        else if(entry?.status==='closed'){
          this.anotherDimensionStats.lossClosed+=1;
          // AU1: Lightning Plasma follows profitable real Attacks, not Gemini shadow losses.
        }
        if(entry?.status==='closed')this.anotherDimensionStats.realizedPnlCents=Number(this.anotherDimensionStats.realizedPnlCents||0)+Number(entry?.pnlCents||0);
        this.anotherDimensionStats.lastEvent={status:'CLOSED',atMs:Date.now(),entryId:entry?.id||null,ticker:entry?.ticker||null,closeReason:entry?.closeReason||null,pnlCents:Number(entry?.pnlCents||0)};
        this.invalidateStateSnapshot();
      },
      onEntryPipeline: (row) => this.recordEntryPipelineCandidateStage(row),
      captureSimulationMutationToken: () => this.simulationMutationGate.capture(),
      enterSimulationMutation: (token) => this.simulationMutationGate.enter(token),
    });
    await this.strategy.init({backgroundResearch:true});
    await this.hydrateAnotherDimension();
    await this.hydrateCrystalWallV3();
    await this.hydrateJusticeArrowV2();
    await this.hydrateCi1ConsumedEpisodes();
    await this.refreshFeederPriorityTickers();
    const trackers = typeof this.db?.trackerHistoryRows==='function'
      ? await this.db.trackerHistoryRows(this.settings.systemName,100)
      : await this.db.trackers(this.settings.systemName,100);
    this.market.hydrateHistories(trackers);
    this.running = true;
    // R54/RGM3 starts only after all trading authorities are hydrated. The
    // first pass immediately compacts non-authoritative startup residue; a
    // detached unref'ed interval keeps pressure governance independent from
    // protection and scanner cadence.
    this.applyResourceGovernance({force:true});
    this.resourceGovernorTimer=setInterval(()=>{try{this.applyResourceGovernance();}catch{}},RUNTIME_RESOURCE_GOVERNOR.sampleIntervalMs);
    this.resourceGovernorTimer.unref?.();
    // R61 Scarlet Needle has no delayed/restart arm state. Crystal-Wall-win continuation
    // is authorized only by a newly persisted profitable close event.
    this.market.start();
    await this.testConnection().catch((e) => this.recordError('kalshi_connection', e));
    await this.reconcileBroker().catch((e) => this.recordError('reconciliation', e));
    this.startStarlightRecoveryMaintenance();
    this.protectionLoopPromise = this.protectionLoop();
    this.cyclePromise = this.cycleLoop();
    this.startBackgroundIntelligenceHydration();
    if (this.startupLiveResumeRequested) this.scheduleLiveAutoRearm(0);
    return this;
  }

  startBackgroundIntelligenceHydration(){
    if(this.intelligenceHydrationPromise)return this.intelligenceHydrationPromise;
    const startedAtMs=Date.now();
    this.intelligenceHydration={legacyAthena:'LOADING',athenaCommander:'LOADING',atomicThunderResearch:'LOADING',lastError:null,startedAtMs,completedAtMs:0};
    const legacy=Promise.resolve().then(()=>this.legacyAthena?.init?.()).then(()=>{this.intelligenceHydration={...this.intelligenceHydration,legacyAthena:this.legacyAthena?.loadError?'FAILED':'READY',lastError:this.legacyAthena?.loadError||this.intelligenceHydration.lastError};return this.legacyAthena?.brain||null;}).catch((error)=>{this.intelligenceHydration={...this.intelligenceHydration,legacyAthena:'FAILED',lastError:String(error?.message||error)};return null;});
    const commander=Promise.resolve().then(()=>this.athenaCommander?.refreshLearning?.()).then((memory)=>{this.intelligenceHydration={...this.intelligenceHydration,athenaCommander:'READY'};return memory;}).catch((error)=>{this.intelligenceHydration={...this.intelligenceHydration,athenaCommander:'FAILED',lastError:String(error?.message||error)};return null;});
    const atomic=Promise.resolve().then(()=>this.atomicThunderBolt?.init?.()).then((r)=>{this.intelligenceHydration={...this.intelligenceHydration,atomicThunderResearch:'READY'};return r;}).catch((error)=>{this.intelligenceHydration={...this.intelligenceHydration,atomicThunderResearch:'FAILED',lastError:String(error?.message||error)};return null;});
    const run=Promise.allSettled([legacy,commander,atomic]).then(async()=>{
      this.intelligenceHydration={...this.intelligenceHydration,completedAtMs:Date.now()};
      await this.db.audit('info','background_intelligence_hydration_complete',{release:RELEASE,legacyAthena:this.intelligenceHydration.legacyAthena,athenaCommander:this.intelligenceHydration.athenaCommander,atomicThunderResearch:this.intelligenceHydration.atomicThunderResearch,lastError:this.intelligenceHydration.lastError,tradingBlocked:false}).catch(()=>{});
      return this.intelligenceHydration;
    }).finally(()=>{if(this.intelligenceHydrationPromise===run)this.intelligenceHydrationPromise=null;});
    this.intelligenceHydrationPromise=run;
    return run;
  }

  recomputeHealth() {
    const now = Date.now();
    this.health.protectionOk = this.profitGuard?.protectionOk !== false;
    this.health.protectionFresh = this.health.lastProtectionMs > 0 && now - this.health.lastProtectionMs <= PROTECTION_FRESH_MS;
    const goldenEyeRequired = this.settings?.goldenEyeEnabled === true
      && (this.settings?.mode !== 'LIVE' || this.settings?.goldenEyeLiveEnabled === true);
    this.health.goldenEyeOk = !goldenEyeRequired || this.goldenEye?.healthy !== false;
    this.health.goldenEyeLastError = this.goldenEye?.lastError || null;
    this.health.websocketFresh = this.health.websocketOk && this.health.lastWsMessageMs > 0 && now - this.health.lastWsMessageMs <= WS_FRESH_MS;
    this.health.scannerFresh = this.lastFullScanMs > 0 && now - this.lastFullScanMs <= SCANNER_FRESH_MS;
    this.health.dbOk = this.db?.dbInterrupted !== true;
    // Liveness remains separate from readiness. A stopped/failed virtual worker
    // must be visible and cannot silently authorize new capital exposure.
    const shadowRequired = this.db?.shadowArchitectureRequired === true;
    this.health.shadowSchemaReady = !shadowRequired || this.db.shadowSchemaReady === true;
    this.health.shadowWorkerFresh = !shadowRequired || Boolean(sameShadowScope(this.settings,this.shadowSaintStats?.lastSuccessScope)
      && this.shadowSaintStats?.lastSuccessAtMs > 0
      && now - this.shadowSaintStats.lastSuccessAtMs >= 0
      && now - this.shadowSaintStats.lastSuccessAtMs <= 60_000);
    this.health.shadowWorkerOk = !shadowRequired || this.shadowSaintStats?.degraded !== true;
    this.health.shadowLastError = shadowRequired ? this.shadowSaintStats?.lastError || null : null;
    this.health.degraded = !(
      this.health.restOk
      && this.health.websocketFresh
      && this.health.reconciliationOk
      && this.health.protectionOk
      && this.health.protectionFresh
      && this.health.goldenEyeOk
      && this.health.scannerFresh
      && this.health.shadowSchemaReady
      && this.health.shadowWorkerFresh
      && this.health.shadowWorkerOk
      && this.health.dbOk
    );
    this.health.lastError = this.lastError;
  }

  recordError(event, e) {
    this.lastError = String(e?.message || e);
    this.health.lastError = this.lastError;
    this.recomputeHealth();
    void this.db.audit('error', event, { message: this.lastError }).catch(() => {});
  }

  markProtection() {
    this.health.lastProtectionMs = Date.now();
    this.recomputeHealth();
  }

  async runProtectionSweep(source = 'backup') {
    try {
      const count = await this.profitGuard.sweep();
      this.protectedTickers = new Set(this.profitGuard.activeTickers || []);
      this.markProtection();
      return count;
    } catch (e) {
      this.recomputeHealth();
      await this.db.audit('error', 'profit_guard_sweep', { source, message: String(e?.message || e) }).catch(() => {});
      throw e;
    }
  }

  async runReferenceSignalSweep(source = 'reference_30s') {
    try {
      await this.strategy?.expirePhoenixSignals?.(Date.now()).catch(async(error)=>{await this.db.audit('warning','phoenix_expiry_sweep',{source,message:String(error?.message||error)}).catch(()=>{});});
      const count=await this.profitGuard.referenceSweep();
      this.lastReferenceSweepMs=Date.now();
      return count;
    } catch(e) {
      await this.db.audit('warning','reference_signal_sweep',{source,message:String(e?.message||e)}).catch(()=>{});
      return 0;
    }
  }

  async runPostExitResearchIfDue(source='post_exit',force=false) {
    const now=Date.now();
    // Post-exit counterfactual research has no protection or entry authority.
    // Under RGM3 pressure it yields completely; forced diagnostic/manual work
    // remains available and ordinary cadence resumes once pressure clears.
    if(!force&&this.resourceResearchDeferred===true)return 0;
    if(!force&&now-this.lastPostExitResearchMs<POST_EXIT_RESEARCH.sweepIntervalMs)return 0;
    // Set the cadence marker before starting the bounded work so overlapping
    // full/fast phases cannot fan out duplicate post-exit market refreshes.
    this.lastPostExitResearchMs=now;
    try{return await this.profitGuard.trackPostExit();}
    catch(error){await this.db.audit('warning','post_exit_research_sweep',{source,message:String(error?.message||error)}).catch(()=>{});return 0;}
  }

  queueQuoteProtection(ticker) {
    if (!ticker || !this.running || !this.profitGuard || !this.protectedTickers.has(ticker)) return;
    const enqueue=()=>{
      const queue=this.quoteProtectionQueue||(this.quoteProtectionQueue=new CoalescingWorkQueue({maxConcurrency:QUOTE_PROTECTION_CONCURRENCY}));
      queue.enqueue(String(ticker), async()=>{
        try {
          await this.profitGuard.protectTicker(ticker);
          this.markProtection();
          await this.learning.trackStopGuardRecovery?.(this.market.quotes,this.settings,this.market,{ticker}).catch(async(error)=>{
            await this.db.audit('warning','stop_guard_recovery_tracking',{ticker,message:String(error?.message||error)}).catch(()=>{});
          });
        } catch (e) {
          await this.db.audit('error', 'profit_guard_quote', { ticker, message: String(e?.message || e) }).catch(() => {});
          this.recomputeHealth();
        }
      });
    };
    // IB1-R2: when an Infinity-protected position is within two cents of its
    // exact frozen target, bypass only the 125ms debounce. Work remains fully
    // bounded/coalesced by the existing protection queue and cannot fan out.
    const fastInfinity=Boolean(this.profitGuard.shouldFastWakeInfinity?.(ticker,this.market?.getQuote?.(ticker)));
    if(fastInfinity){
      const pending=this.quoteProtectionTimers.get(ticker);
      if(pending){clearTimeout(pending);this.quoteProtectionTimers.delete(ticker);}
      enqueue();
      return;
    }
    if (this.quoteProtectionTimers.has(ticker)) return;
    const timer = setTimeout(() => {
      this.quoteProtectionTimers.delete(ticker);
      enqueue();
    }, 125);
    this.quoteProtectionTimers.set(ticker, timer);
  }

  queuePhoenixSignal(qualification,q=null) {
    const ticker=String(qualification?.ticker||q?.ticker||'');
    if(!ticker||!this.running||!this.strategy||!this.referenceSignalGate().allowed)return;
    const simulationToken=this.settings?.mode==='SIMULATION'?this.simulationMutationGate.capture():null;
    const queue=this.phoenixSignalQueue;
    queue.enqueue(`phoenix:${ticker}`,async()=>{
      let releaseSimulationWork=null;
      if(this.settings?.mode==='SIMULATION'){
        releaseSimulationWork=this.simulationMutationGate.enter(simulationToken);
        if(!releaseSimulationWork)return;
      }
      try{
        const live=this.market?.getQuote?.(ticker)||q;
        if(!live)return;
        await this.strategy.materializePhoenixSignal(live,qualification);
      }finally{try{releaseSimulationWork?.();}catch{}}
    });
  }

  queueAthenaOpportunityEvaluation(ticker) {
    if (!ticker || !this.running || !this.strategy || !this.atomicThunderBolt || !this.athenaCommander) return;
    if (!this.shadowEntryGate().allowed) return;
    const simulationToken=this.settings?.mode==='SIMULATION'?this.simulationMutationGate.capture():null;
    // EAC2 is the quote-event authority boundary. R57's scanner path used EAC1
    // but this centralized quote path bypassed it, allowing A8/Athena FIRE to
    // run before a later createHunter() Game Clock rejection. No expensive
    // intelligence is queued unless a current lane is clock-admissible or has
    // earned one bounded authority probe.
    if(!this.shouldQueueInitialExposure(ticker,{allowProbe:true}))return;
    if (this.athenaOpportunityTimers.has(ticker)) return;
    const timer=setTimeout(()=>{
      this.athenaOpportunityTimers.delete(ticker);
      const queue=this.entryEvaluationQueue||(this.entryEvaluationQueue=new CoalescingWorkQueue({maxConcurrency:ENTRY_EVALUATION_CONCURRENCY}));
      queue.enqueue(`athena:${ticker}`,async()=>{
        let releaseSimulationWork=null;
        if(this.settings?.mode==='SIMULATION'){
          releaseSimulationWork=this.simulationMutationGate.enter(simulationToken);
          if(!releaseSimulationWork)return;
        }
        try{
          const q=this.market?.getQuote?.(ticker);if(!q)return;
          await this.evaluateNewGenerationOpportunities(new Map([[ticker,q]]),{onlyTicker:ticker});
        }catch(e){await this.db.audit('error','athena_opportunity_quote_evaluation',{ticker,message:String(e?.message||e)}).catch(()=>{});}
        finally{try{releaseSimulationWork?.();}catch{}}
      });
    },125);
    this.athenaOpportunityTimers.set(ticker,timer);
  }

  async evaluateNewGenerationOpportunities(marketMap,{onlyTicker=null}={}) {
    if (!this.shadowEntryGate().allowed || !this.atomicThunderBolt || !this.athenaCommander || !this.strategy) return [];
    // Telemetry/dedup state is constructor-owned in production, but keep the
    // authority path self-healing for focused harnesses and restart/recovery
    // edges. These maps can only suppress duplicate work; they never authorize
    // an entry.
    if(!(this.athenaDecisionMemo instanceof Map))this.athenaDecisionMemo=new Map();
    if(!(this.athenaDecisionInFlight instanceof Set))this.athenaDecisionInFlight=new Set();
    if(!this.entryDecisionDedupStats||typeof this.entryDecisionDedupStats!=='object')this.entryDecisionDedupStats={athenaEvaluated:0,athenaUnchangedSuppressed:0,athenaInFlightSuppressed:0,athenaChangedStateRetries:0};
    const s=this.settings, now=Date.now();
    // EAC3 defense-in-depth: prove the hard clock/window boundary before any
    // DB fanout, Cosmos GREEN work, or Athena ranking.
    // A PROBE is resolved once through the authoritative GCA2 refresh and then
    // re-evaluated; failure remains upstream and never turns into a post-FIRE
    // Game Clock choke.
    const candidates=[];
    for(const [ticker,original] of marketMap||[]){
      if(onlyTicker&&ticker!==onlyTicker)continue;
      const q=original;if(!q)continue;
      let admission=this.entryChainAdmissionForQuote(q,{lane:'ANY',now:Date.now()});
      if(admission.action==='PROBE'){
        const refreshed=await this.refreshGameClockForQuote(q,{forceFresh:true}).catch(()=>null);
        if(refreshed?.gameClockState)admission=this.entryChainAdmissionForQuote(q,{lane:'ANY',now:Date.now()});
        else admission={action:'BLOCK',reason:'game_clock_probe_failed',stage:admission.stage||null,lane:admission.lane||null};
      }
      if(admission.action!=='ALLOW'){
        await this.db.audit('info','entry_chain_upstream_admission_blocked',{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:admission.reason,stage:admission.stage||null,lane:admission.lane||null,lastEligibleAtMs:admission.lastEligibleAtMs||null,readyAtMs:admission.readyAtMs||null}).catch(()=>{});
        continue;
      }
      candidates.push(q);
    }
    if(!candidates.length)return[];
    const recoveryCutoff=Date.now()-Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;
    const [openRows,recoveryRows]=await Promise.all([
      (typeof this.db?.openEntries==='function'?this.db.openEntries(s.systemName):this.db.entries(s.systemName,{limit:5000})).catch(()=>[]),
      (typeof this.db?.recoverySourceEntries==='function'?this.db.recoverySourceEntries(s.systemName,{sinceMs:recoveryCutoff}):this.db.entries(s.systemName,{limit:5000})).catch(()=>[]),
    ]);
    const rows=openRows||[];
    const cosmosRows=rows.filter(e=>ACTIVE_FEEDER_CONCEPTS.has(e.conceptName)&&openLike(e.status));
    const recoveryLosses=typeof this.db?.recoverySourceEntries==='function'?(recoveryRows||[]):this.strategy.recoverySourcesFromEntries(recoveryRows||[],s);
    const observations=await this.strategy.recoveryObservationsBySource(recoveryLosses.map((e)=>e.id)).catch(()=>new Map());
    const maxRays=Math.max(1,Math.floor(Number(s.lightningPlasmaMaxStrikes||1)));
    // One ray can never reserve more than its equal share of the operator's
    // total field budget. The DB reservation below authoritatively caps both
    // ray count and aggregate budget across processes.
    const fieldBudgetCents=Math.max(1,Number(s.lightningPlasmaFieldStakeCents||0));
    const rayStakeCents=Math.max(1,Math.floor(fieldBudgetCents/maxRays));
    // R59/LP1-F2: Plasma fields are defined by independently qualified *Cosmos*,
    // never by the number of active Atomic Thunder Bolts. Build one current
    // field from the exact source quotes available in MarketHub/this scan.
    const plasmaMarketMap=new Map();
    for(const source of cosmosRows){const quote=marketMap?.get?.(source.ticker)||this.market?.getQuote?.(source.ticker)||null;if(quote)plasmaMarketMap.set(String(source.ticker),quote);}
    const plasmaField=s.lightningPlasmaEnabled===true?lightningPlasmaFieldSelection(cosmosRows,plasmaMarketMap,s,now):{fieldId:null,sourceCount:0,independentEventCount:0,minCosmos:LIGHTNING_PLASMA.minCosmos,minStrikes:LIGHTNING_PLASMA.minStrikes,maxStrikes:maxRays,qualifies:false,candidates:[]};
    const fieldWindowMs=Math.max(1000,Number(s.lightningPlasmaFieldWindowSeconds??LIGHTNING_PLASMA.fieldWindowMs/1000)*1000);
    const fieldExpiresAtMs=plasmaField.qualifies&&plasmaField.candidates.length?Math.min(...plasmaField.candidates.map(x=>Number(x?.qualification?.observedAtMs||now)+fieldWindowMs)):now;
    const fieldId=plasmaField.fieldId||null;
    const plasmaByTicker=new Map((plasmaField.candidates||[]).map(x=>[String(x?.source?.ticker||''),x]));
    const created=[];
    for(const original of candidates){
      const q={...original};
      // R52: Athena's historical sport profiles are only useful when the live
      // Bolt receives the same deterministic classification. Do this locally
      // with zero database work so quote-rate evaluation cannot create a new
      // pressure path.
      const detectedSport=classifyDeterministic(q.ticker,q.title||q.marketTitle||'')?.sportName||'Unknown';
      if(!q.sport||String(q.sport)==='Unknown')q.sport=detectedSport;
      if(!q.sportName||String(q.sportName)==='Unknown')q.sportName=detectedSport;
      const state=q.gameClockState||{};
      if(isConfirmedGameClockState(state,q.eventTicker||q.ticker)&&Number(state.startTimeMs)>0)q.gameMinutes=Math.max(0,(now-Number(state.startTimeMs))/60000);
      const cosmos=cosmosRows.filter(e=>String(e.ticker||'')===String(q.ticker||''));
      // Keep CI1 current for Dragon/Crash-Recovery specialist context and
      // historical research. It has no veto over the R60 GREEN command path.
      // Use the quote's own observation time, not wall-clock now, so an actually
      // stale quote cannot manufacture a fresh crash-state timestamp.
      if(typeof this.learning?.observeCrashQuote==='function'){
        const observedAtMs=Math.min(Date.now(),Math.max(1,Number(q?.quoteAtMs||q?.updatedAtMs||Date.now())));
        try{this.learning.observeCrashQuote(q,s,observedAtMs);}catch(error){await this.db.audit('warning','ci1_candidate_refresh_failed',{ticker:q.ticker,message:String(error?.message||error)}).catch(()=>{});}
      }
      const crashSignal=typeof this.learning?.crashEntrySignal==='function'?this.learning.crashEntrySignal(q.ticker):null;
      const crashState=typeof this.learning?.crashState==='function'?this.learning.crashState(q.ticker):null;
      const recoverySource=recoveryLosses.filter(e=>String(e.ticker||'')===String(q.ticker||'')).sort((a,b)=>Number(b.closedAtMs||0)-Number(a.closedAtMs||0))[0]||null;
      let recoveryContext=null;
      if(recoverySource){
        const obs=observations.get(String(recoverySource.id))||null;
        const bid=Number(q.yesBid||0),exit=Number(recoverySource.exitPriceCents||0),persisted=Number(obs?.trough_cents||0);
        const trough=[bid,exit,persisted].filter(v=>v>0).reduce((a,b)=>Math.min(a,b),Infinity);
        recoveryContext={eligible:true,sourceTradeId:recoverySource.id,sourceConcept:recoverySource.conceptName,troughCents:Number.isFinite(trough)?trough:exit,reboundCents:Number.isFinite(trough)?Math.max(0,bid-trough):0,observationId:obs?.id||null};
      }
      const plasmaStrike=plasmaByTicker.get(String(q.ticker||''))||null;
      const aeCandidate=this.activeAthenaExclamationCandidate(q.ticker,now);
      const preliminaryFieldContext={version:LIGHTNING_PLASMA.version,fieldId,lightningPlasmaQualified:plasmaField.qualifies===true,currentTickerEligible:Boolean(plasmaStrike),currentEventEligible:Boolean(plasmaStrike),sourceCount:Number(plasmaField.sourceCount||0),cosmoCount:cosmos.length,independentEventCount:Number(plasmaField.independentEventCount||0),minCosmos:Number(plasmaField.minCosmos||LIGHTNING_PLASMA.minCosmos),minStrikes:Number(plasmaField.minStrikes||LIGHTNING_PLASMA.minStrikes),maxRays,rayStakeCents,fieldBudgetCents,expiresAtMs:fieldExpiresAtMs,sourceCosmoId:plasmaStrike?.source?.id||null,athenaExclamationCandidate:aeCandidate,goldSaintCount:Number(aeCandidate?.saintCount||0)};
      // R61 Scarlet Needle no longer participates in the Bolt/retracement lane.
      // These fresh features remain normal Athena context for ordinary Attacks.
      const survivalFeatures=atomicThunderBoltFeatures({q,history:this.market?.getHistory?.(q.ticker)||[],settings:s,cosmos,crashSignal,recoveryContext,fieldContext:preliminaryFieldContext,now});
      const openEntriesOnTicker=(rows||[]).filter(e=>String(e.ticker||'')===String(q.ticker||'')&&openLike(e.status));
      const preTriggerContext={cosmos,crashSignal,crashState,survivalFeatures,recoveryContext,recoverySource,fieldContext:preliminaryFieldContext,openEntriesOnTicker};
      const atbAdmission=await this.resolveEntryChainAdmission(q,{lane:'ATB',forceProbe:true});
      let bolt=null;
      if(atbAdmission.action==='ALLOW')bolt=await this.atomicThunderBolt.detect(q,{cosmos,crashSignal,crashState,recoveryContext,fieldContext:preliminaryFieldContext,now});
      else await this.db.audit('info','atomic_thunder_green_admission_blocked',{ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:atbAdmission.reason,stage:atbAdmission.stage||null,lastEligibleAtMs:atbAdmission.lastEligibleAtMs||null,readyAtMs:atbAdmission.readyAtMs||null}).catch(()=>{});
      if(!bolt)continue;
      // COSMO_GREEN earns only a Bolt, never clock authority. Re-prove fresh
      // GCA2 authorization before Athena so a stale/final event cannot FIRE.
      const postBoltAdmission=await this.resolveEntryChainAdmission(q,{lane:'POST_BOLT',forceProbe:true});
      if(postBoltAdmission.action!=='ALLOW'){
        await this.db.audit('info','post_bolt_clock_admission_blocked',{boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,reason:postBoltAdmission.reason,lastEligibleAtMs:postBoltAdmission.lastEligibleAtMs||null}).catch(()=>{});
        this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:postBoltAdmission.reason});
        continue;
      }
      if(isConfirmedGameClockState(q.gameClockState,q.eventTicker||q.ticker)&&Number(q.gameClockState.startTimeMs)>0)q.gameMinutes=Math.max(0,(Date.now()-Number(q.gameClockState.startTimeMs))/60000);
      const eventAdmission=await this.strategy.hunterEventAdmissionState(q).catch(()=>null);
      if(!eventAdmission){await this.db.audit('warning','post_bolt_event_policy_unavailable',{boltId:bolt.id,ticker:q.ticker}).catch(()=>{});this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:'event_policy_unavailable'});continue;}
      if(eventAdmission.eventCapBlocked && s.galacticExplosionEnabled!==true){await this.db.audit('info','post_bolt_event_cap_blocked',{boltId:bolt.id,ticker:q.ticker,eventTicker:eventAdmission.eventTicker,activeEntries:eventAdmission.activeEntries,maxEntriesPerTrade:eventAdmission.maxEntriesPerTrade}).catch(()=>{});this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:'event_entry_cap'});continue;}
      const athenaExclamationEligible=Boolean(preliminaryFieldContext.athenaExclamationCandidate);
      if(eventAdmission.cooldownBlocked&&!athenaExclamationEligible){await this.db.audit('info','post_bolt_cooldown_blocked',{boltId:bolt.id,ticker:q.ticker,eventTicker:eventAdmission.eventTicker,hunterCooldownMinutes:eventAdmission.hunterCooldownMinutes,cooldownScope:eventAdmission.cooldownScope,latestHunterEntryMs:eventAdmission.latestHunterEntryMs}).catch(()=>{});this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:'hunter_cooldown'});continue;}
      const fieldContext={...preliminaryFieldContext};
      const commandContext={cosmos,crashSignal,crashState,recoveryContext,recoverySource,fieldContext,entryAdmission:eventAdmission,openEntriesOnTicker};
      const candidateId=this.candidateIdForBolt(bolt),decisionFingerprint=this.athenaStateFingerprint({bolt,q,crashState,cosmos,recoveryContext,fieldContext,eventAdmission,openEntriesOnTicker:commandContext.openEntriesOnTicker});
      const priorDecision=this.athenaDecisionMemo.get(String(bolt.id));
      if(priorDecision?.fingerprint===decisionFingerprint){this.entryDecisionDedupStats.athenaUnchangedSuppressed+=1;continue;}
      if(this.athenaDecisionInFlight.has(String(bolt.id))){this.entryDecisionDedupStats.athenaInFlightSuppressed+=1;continue;}
      if(priorDecision)this.entryDecisionDedupStats.athenaChangedStateRetries+=1;
      this.athenaDecisionInFlight.add(String(bolt.id));this.entryDecisionDedupStats.athenaEvaluated+=1;
      let decision=null;
      try{decision=await this.athenaCommander.decide(bolt,commandContext);this.setBoundedRuntimeMap(this.athenaDecisionMemo,String(bolt.id),{fingerprint:decisionFingerprint,decision:String(decision?.decision||''),reason:String(decision?.reason||''),atMs:Date.now()},ENTRY_CANDIDATE_FUNNEL.maximumCandidates);}
      finally{this.athenaDecisionInFlight.delete(String(bolt.id));}
      this.atomicThunderBolt.noteDecision(bolt,decision);
      if(decision.decision!=='FIRE'){
        this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:decision.decision==='WATCH'?'ATHENA_WATCH':'ATHENA_REJECT',status:'BLOCKED',reason:decision.reason||String(decision.decision||'reject').toLowerCase()});
        continue;
      }
      this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'ATHENA_FIRE',status:'PASS',reason:decision.reason||'fire'});
      // AE1 qualifications now originate only from a real Athena-selected Gold
      // Saint. Recording the vote has no authority over the current FIRE and
      // cannot execute a Big Bang by itself; it may form a durable candidate
      // for a future Bolt on this exact ticker.
      if(GOLD_SAINT_ATTACKS.has(String(decision.selectedAttack||''))){
        try{
          if(typeof this.strategy?.athenaExclamation?.recordQualification==='function')await this.strategy.athenaExclamation.recordQualification({conceptName:String(decision.selectedAttack),ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,qualifiedAtMs:Date.now(),priceCents:Number(q.yesAsk||0),bidCents:Number(q.yesBid||0),sourceFeeder:cosmos?.[0]?.conceptName||null,sourceTradeId:cosmos?.[0]?.id||null,gameMinutes:q.gameMinutes??null,qualificationSnapshot:{version:'A3-GOLD-SAINT-Q1',boltId:bolt.id,commandHash:decision.fireCommand?.commandHash||null,selectedAttack:String(decision.selectedAttack),fieldContext:structuredClone(fieldContext)}});
        }catch(error){await this.db.audit('warning','athena_gold_saint_vote_failed',{boltId:bolt.id,ticker:q.ticker,concept:decision.selectedAttack,message:String(error?.message||error)}).catch(()=>{});}
      }
      const plasmaReservation=null;
      this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_ELIGIBLE',status:'PASS',reason:'fire_and_hard_preconditions_ready'});
      let e=null;
      try{e=await this.strategy.executeAthenaFire(q,bolt,decision,commandContext);}
      catch(error){
        this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_BLOCKED',status:'BLOCKED',reason:'execution_exception'});
        throw error;
      }
      if(!e){
        // R13 visibility only: previously a FIRE that returned no position
        // disappeared from the entry-funnel summary. Retain all original
        // deduplication, receipt and broker idempotency behavior unchanged.
        this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_BLOCKED',status:'BLOCKED',reason:String(this.strategy.lastAthenaFireAbort||'fire_returned_no_entry')});
      }
      if(e){
        created.push(e);this.atomicThunderBolt.consume(bolt.id,q.ticker);
        if(plasmaReservation?.ok)await this.db.linkLightningPlasmaReservation({systemName:s.systemName,fieldId,boltId:bolt.id,entryId:e.id}).catch(()=>{});
      }
    }
    return created;
  }

  queueGoldenEyeEvaluation(ticker) {
    if (!ticker || !this.running || !this.goldenEye || !this.protectedTickers.has(ticker)) return;
    if (this.goldenEyeExecutionPromise) {
      this.goldenEyeRerunRequested = true;
      return;
    }
    if (this.goldenEyeEvaluationPromise) {
      this.goldenEyeRerunRequested = true;
      return;
    }
    if (this.goldenEyeTimer) return;
    this.goldenEyeTimer = setTimeout(() => {
      this.goldenEyeTimer = null;
      void this.runGoldenEyeEvaluation('quote_event').catch(async (e) => {
        this.recomputeHealth();
        await this.db.audit('error','golden_eye_evaluation',{message:String(e?.message||e)}).catch(()=>{});
      });
    }, GOLDEN_EYE.minimumSampleIntervalMs);
  }

  async runGoldenEyeEvaluation(source = 'quote_event') {
    if (!this.goldenEye || this.goldenEyeExecutionPromise) return null;
    if (this.goldenEyeEvaluationPromise) {
      this.goldenEyeRerunRequested = true;
      return this.goldenEyeEvaluationPromise;
    }
    this.goldenEyeEvaluationPromise = (async () => {
      const entries = (typeof this.db.openHunterEntries === 'function'
        ? await this.db.openHunterEntries(this.settings.systemName)
        : (await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)))
        .filter((e) => e.status === 'open');
      const observed = await this.goldenEye.observe(entries, Date.now());
      this.recomputeHealth();
      const signal = observed?.signal;
      if (!signal) return observed;

      const hasFrozenGoldenEye = entries.some((e) => String(e?.entryConfig?.profitAuthority || '') === GOLDEN_EYE.version);
      // Current enablement controls new authority assignment, but already-open
      // SIM Hunters whose immutable snapshot delegated profit authority to
      // Golden Eye must remain protected if the operator later toggles the
      // setting. LIVE autonomy remains separately fail-closed.
      const simulationAllowed = this.settings.mode === 'SIMULATION'
        && (this.settings.goldenEyeEnabled === true || hasFrozenGoldenEye);
      const liveAllowed = this.settings.mode === 'LIVE'
        && this.settings.goldenEyeEnabled === true
        && this.settings.goldenEyeLiveEnabled === true
        && this.goldenEye.healthy === true
        && this.isLiveReady();
      if (!simulationAllowed && !liveAllowed) {
        await this.db.audit('info','golden_eye_shadow_signal',{...signal,source,mode:this.settings.mode,enabled:this.settings.goldenEyeEnabled===true,liveEnabled:this.settings.goldenEyeLiveEnabled===true,healthy:this.goldenEye.healthy===true});
        return observed;
      }

      this.goldenEyeExecutionPromise = (async () => {
        const result = await this.manualCashout({ allProfitable:true }, 'golden_eye_cashout');
        await this.goldenEye.noteExecution(signal,result,Date.now());
        this.recomputeHealth();
        await this.db.audit(result.errorCount>0?'warning':'info','golden_eye_cashout',{...signal,source,closedCount:result.closedCount,partialCount:result.partialCount,pendingCount:result.pendingCount,skippedCount:result.skippedCount,errorCount:result.errorCount,totalProfitCents:result.totalProfitCents});
        return result;
      })();
      try { await this.goldenEyeExecutionPromise; } finally { this.goldenEyeExecutionPromise = null; }
      return observed;
    })();
    try {
      return await this.goldenEyeEvaluationPromise;
    } finally {
      this.goldenEyeEvaluationPromise = null;
      if (this.goldenEyeRerunRequested && !this.goldenEyeExecutionPromise && this.running) {
        this.goldenEyeRerunRequested = false;
        queueMicrotask(() => {
          void this.runGoldenEyeEvaluation('quote_rerun').catch(async (e) => {
            this.recomputeHealth();
            await this.db.audit('error','golden_eye_evaluation',{message:String(e?.message||e)}).catch(()=>{});
          });
        });
      }
    }
  }

  setBoundedRuntimeMap(map,key,value,limit=ENTRY_CANDIDATE_FUNNEL.maximumCandidates){
    if(map.has(key))map.delete(key);map.set(key,value);
    while(map.size>limit){const first=map.keys().next().value;map.delete(first);}
  }

  recordEntryCandidateStage(event={}){
    const candidateId=String(event.candidateId||event.preBoltId||'');if(!candidateId)return null;
    // Keep the telemetry hook safe for focused/unit harnesses that construct an
    // Engine from its prototype, and for any future recovery path that invokes
    // the hook before the normal constructor-owned runtime maps are hydrated.
    // These are telemetry/dedup structures only; lazily creating them can never
    // grant trading authority.
    if(!(this.entryCandidateFunnel instanceof Map))this.entryCandidateFunnel=new Map();
    if(!this.entryCandidateFunnelTotals||typeof this.entryCandidateFunnelTotals!=='object')this.entryCandidateFunnelTotals={uniqueCandidates:0,byStage:{}};
    if(!this.entryCandidateFunnelTotals.byStage||typeof this.entryCandidateFunnelTotals.byStage!=='object')this.entryCandidateFunnelTotals.byStage={};
    if(!Array.isArray(this.entryCandidateFunnelRecent))this.entryCandidateFunnelRecent=[];
    if(!this.entryDecisionDedupStats||typeof this.entryDecisionDedupStats!=='object')this.entryDecisionDedupStats={athenaEvaluated:0,athenaUnchangedSuppressed:0,athenaInFlightSuppressed:0,athenaChangedStateRetries:0};
    const stage=String(event.stage||'UNKNOWN'),status=String(event.status||'INFO'),reason=event.reason==null?null:String(event.reason),atMs=Number(event.atMs||Date.now());
    let rec=this.entryCandidateFunnel.get(candidateId);
    if(!rec){rec={candidateId,ticker:String(event.ticker||''),eventTicker:String(event.eventTicker||event.ticker||''),boltId:event.boltId||null,firstAtMs:atMs,lastAtMs:atMs,currentStage:stage,currentStatus:status,currentReason:reason,stages:{}};this.entryCandidateFunnelTotals.uniqueCandidates+=1;}
    rec.ticker=String(event.ticker||rec.ticker||'');rec.eventTicker=String(event.eventTicker||rec.eventTicker||rec.ticker||'');rec.boltId=event.boltId||rec.boltId||null;rec.lastAtMs=atMs;rec.currentStage=stage;rec.currentStatus=status;rec.currentReason=reason;
    if(!rec.stages[stage]){rec.stages[stage]={status,reason,atMs};this.entryCandidateFunnelTotals.byStage[stage]=Number(this.entryCandidateFunnelTotals.byStage[stage]||0)+1;}
    else rec.stages[stage]={...rec.stages[stage],status,reason,lastAtMs:atMs};
    this.setBoundedRuntimeMap(this.entryCandidateFunnel,candidateId,rec);
    this.entryCandidateFunnelRecent.push({candidateId,boltId:rec.boltId,ticker:rec.ticker,eventTicker:rec.eventTicker,stage,status,reason,atMs});
    if(this.entryCandidateFunnelRecent.length>ENTRY_CANDIDATE_FUNNEL.maximumRecent)this.entryCandidateFunnelRecent.splice(0,this.entryCandidateFunnelRecent.length-ENTRY_CANDIDATE_FUNNEL.maximumRecent);
    return rec;
  }

  recordEntryPipelineCandidateStage(row={}){
    const candidateId=String(row?.candidateId||'');if(!candidateId)return;
    if(row.stage==='OPENED'&&row.status==='PASS')this.recordEntryCandidateStage({candidateId,boltId:row.boltId||null,ticker:row.ticker,eventTicker:row.eventTicker,stage:'OPENED',status:'PASS',reason:row.reason||'open',atMs:row.atMs});
    else if(row.status==='BLOCKED')this.recordEntryCandidateStage({candidateId,boltId:row.boltId||null,ticker:row.ticker,eventTicker:row.eventTicker,stage:'EXECUTION_BLOCKED',status:'BLOCKED',reason:row.reason||String(row.stage||'execution').toLowerCase(),atMs:row.atMs});
  }

  entryCandidateFunnelSummary(){
    if(!(this.entryCandidateFunnel instanceof Map))this.entryCandidateFunnel=new Map();
    if(!this.entryCandidateFunnelTotals||typeof this.entryCandidateFunnelTotals!=='object')this.entryCandidateFunnelTotals={uniqueCandidates:0,byStage:{}};
    if(!Array.isArray(this.entryCandidateFunnelRecent))this.entryCandidateFunnelRecent=[];
    if(!this.entryDecisionDedupStats||typeof this.entryDecisionDedupStats!=='object')this.entryDecisionDedupStats={athenaEvaluated:0,athenaUnchangedSuppressed:0,athenaInFlightSuppressed:0,athenaChangedStateRetries:0};
    const currentByStage={},currentByReason={};
    for(const rec of this.entryCandidateFunnel.values()){currentByStage[rec.currentStage]=Number(currentByStage[rec.currentStage]||0)+1;if(rec.currentReason)currentByReason[rec.currentReason]=Number(currentByReason[rec.currentReason]||0)+1;}
    return{version:ENTRY_CANDIDATE_FUNNEL.version,maximumCandidates:ENTRY_CANDIDATE_FUNNEL.maximumCandidates,uniqueCandidates:Number(this.entryCandidateFunnelTotals.uniqueCandidates||0),retainedCandidates:this.entryCandidateFunnel.size,byStage:{...(this.entryCandidateFunnelTotals.byStage||{})},currentByStage,currentByReason,dedup:{...this.entryDecisionDedupStats},recent:this.entryCandidateFunnelRecent.slice().reverse()};
  }

  candidateIdForBolt(bolt){return String(bolt?.preBoltClearance?.preBoltId||bolt?.id||'');}

  activeAthenaExclamationCandidate(ticker,now=Date.now()){
    const ae=this.strategy?.athenaExclamation,id=ae?.activeEventByTicker?.get?.(String(ticker||''));if(!id)return null;
    const event=ae?.events?.get?.(String(id))||null;
    if(!event||Number(event.expiresAtMs||0)<=Number(now)||Number(event.saintCount||0)<ATHENA_EXCLAMATION.minimumSaints)return null;
    return{id:String(event.id),ticker:String(event.ticker||ticker||''),eventTicker:String(event.eventTicker||event.ticker||ticker||''),saintCount:Number(event.saintCount||0),combination:[...(event.combination||[])],createdAtMs:Number(event.createdAtMs||0),expiresAtMs:Number(event.expiresAtMs||0)};
  }

  executionBookState(ticker,requested=1,limitCents=null){
    const count=Math.max(1,Math.floor(Number(requested||1)));
    if(typeof this.market?.executableAsk!=='function')return null;
    try{
      const exec=this.market.executableAsk(String(ticker||''),count,limitCents==null?undefined:Number(limitCents));
      if(!exec)return{requested:count,filled:0,full:false,bestCents:null,avgCents:null};
      return{requested:count,filled:Math.max(0,Math.floor(Number(exec.filled||0))),full:exec.full===true,bestCents:Number.isFinite(Number(exec.bestCents))?Number(exec.bestCents):null,avgCents:Number.isFinite(Number(exec.avgCents))?Number(Number(exec.avgCents).toFixed(4)):null};
    }catch{return null;}
  }

  athenaStateFingerprint({bolt,q,crashState,cosmos=[],recoveryContext=null,fieldContext=null,eventAdmission=null,openEntriesOnTicker=[]}={}){
    const now=Date.now(),f=bolt?.features||{},marketObserved=Number(f.marketObservedAtMs||q?.quoteAtMs||q?.updatedAtMs||0),ciAt=Number(crashState?.lastObservationAtMs||crashState?.updatedAtMs||0);
    const cosmosState=(cosmos||[]).map(x=>[String(x.id||''),String(x.conceptName||''),Number(x.openedAtMs||0),String(x.entryConfig?.dragonSource?.episodeId||''),Number(x.entryConfig?.phoenixSource?.signalAtMs||0)]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
    const eligible=(f.eligibleAttacks||[]).map(x=>[String(x.concept||''),Number(x.plannedEntryCents||0),Number(x.requiredTargetBidCents||0),x.targetFeasible!==false]).sort((a,b)=>String(a[0]).localeCompare(String(b[0])));
    const requested=Math.max(1,...(f.eligibleAttacks||[]).map(x=>Math.max(1,Math.floor(Number(x?.count||0)))));
    const executionBook=this.executionBookState(q?.ticker||bolt?.ticker,requested,Number(q?.yesAsk||f.askCents||0));
    return stableHash({boltId:String(bolt?.id||''),bid:Number(q?.yesBid||f.bidCents||0),ask:Number(q?.yesAsk||f.askCents||0),status:String(q?.status||''),result:String(q?.result||''),marketFresh:marketObserved>0&&now-marketObserved<=ARAYASHIKI.maximumMarketAgeMs,historySamples:Number(f.historySamples||0),currentUp:Number(f.currentUpwardTicks??0),currentLower:Number(f.currentLowerLowCount??0),currentCrash:rounded(f.currentCrashDepthCents),currentRebound:rounded(f.currentReboundCents),currentReclaim:rounded(f.currentReclaimRate),move30:rounded(f.recentMove30Cents),v15:rounded(f.velocity15CentsPerSec),v30:rounded(f.velocity30CentsPerSec),eligible,executionBook,crash:{present:!!crashState,fresh:ciAt>0&&now-ciAt<=ARAYASHIKI.maximumCrashStateAgeMs,phase:String(crashState?.phase||''),episodeId:String(crashState?.episodeId||''),lastEpisodeId:String(crashState?.lastEpisodeId||''),lastResetAtMs:Number(crashState?.lastResetAtMs||0),entryReady:crashState?.entryReady===true,bid:Number(crashState?.lastBidCents||0),ask:Number(crashState?.lastAskCents||0),reclaim:rounded(crashState?.reclaimRate)},cosmos:cosmosState,recovery:recoveryContext?{id:String(recoveryContext.sourceTradeId||''),trough:Number(recoveryContext.troughCents||0),rebound:Number(recoveryContext.reboundCents||0)}:null,field:{plasmaId:String(fieldContext?.fieldId||''),plasma:fieldContext?.lightningPlasmaQualified===true,plasmaTicker:fieldContext?.currentTickerEligible===true,independent:Number(fieldContext?.independentEventCount||0),aeId:String(fieldContext?.athenaExclamationCandidate?.id||''),aeSaints:Number(fieldContext?.athenaExclamationCandidate?.saintCount||0)},admission:{eventCap:eventAdmission?.eventCapBlocked===true,cooldownScope:String(eventAdmission?.cooldownScope||''),blockedConcepts:[...(eventAdmission?.cooldownBlockedConcepts||[])].sort(),active:Number(eventAdmission?.activeEntries||0)},open:[...(openEntriesOnTicker||[])].map(x=>String(x.conceptName||'')).sort(),memoryHash:String(this.athenaCommander?.memory?.memoryHash||'')});
  }

  noteEntryAdmission(reason,field){
    const stats=this.entryAdmissionStats||(this.entryAdmissionStats={version:ENTRY_ADMISSION_CONTROL.version,allowed:0,blockedBeforeQueue:0,probeAllowed:0,probeCoalesced:0,byReason:{}});
    stats[field]=Number(stats[field]||0)+1;
    const key=String(reason||'unknown');stats.byReason[key]=Number(stats.byReason[key]||0)+1;
  }

  entryAdmissionSnapshot(){
    const stats=this.entryAdmissionStats||{};
    return{version:ENTRY_ADMISSION_CONTROL.version,role:ENTRY_ADMISSION_CONTROL.role,unknownProbeIntervalMs:ENTRY_ADMISSION_CONTROL.unknownProbeIntervalMs,preBoltExecutionMarginMs:ENTRY_ADMISSION_CONTROL.preBoltExecutionMarginMs,trackedProbeEvents:this.entryAdmissionProbeAt?.size||0,allowed:Number(stats.allowed||0),blockedBeforeQueue:Number(stats.blockedBeforeQueue||0),probeAllowed:Number(stats.probeAllowed||0),probeCoalesced:Number(stats.probeCoalesced||0),byReason:{...(stats.byReason||{})}};
  }

  entryChainAdmissionForQuote(q,{lane='ANY',now=Date.now()}={}){
    const ticker=String(q?.ticker||'');
    const activeBolt=this.atomicThunderBolt?.activeByTicker?.get?.(ticker)||null;
    const activeBoltReady=activeBolt&&Number(activeBolt.expiresAtMs||0)>=Number(now);
    const common={quote:q,mode:this.settings.mode,minGameMinutes:this.settings.minGameMinutes,maxGameMinutes:this.settings.maxGameMinutes,now,executionMarginMs:ENTRY_ADMISSION_CONTROL.preBoltExecutionMarginMs};
    const stage=(lane==='POST_BOLT'||lane==='POST_ATB2')?'POST_BOLT':activeBoltReady?'POST_BOLT':'ATOMIC_GREEN';
    return entryChainAdmissionDecision({...common,stage});
  }

  async resolveEntryChainAdmission(q,{lane='ANY',forceProbe=true}={}){
    let decision=this.entryChainAdmissionForQuote(q,{lane,now:Date.now()});
    if(decision.action==='PROBE'&&forceProbe){
      const refreshed=await this.refreshGameClockForQuote(q,{forceFresh:true}).catch(()=>null);
      if(refreshed?.gameClockState)decision=this.entryChainAdmissionForQuote(q,{lane,now:Date.now()});
      else decision={action:'BLOCK',reason:'game_clock_probe_failed',stage:decision.stage||null,lane};
    }
    return decision;
  }

  shouldQueueInitialExposure(ticker,{allowProbe=true}={}){
    const q=this.market?.getQuote?.(ticker);if(!q)return false;
    const decision=this.entryChainAdmissionForQuote(q,{lane:'ANY',now:Date.now()});
    if(decision.action==='ALLOW'){this.noteEntryAdmission(decision.reason,'allowed');return true;}
    if(decision.action==='BLOCK'){this.noteEntryAdmission(decision.reason,'blockedBeforeQueue');return false;}
    if(!allowProbe){this.noteEntryAdmission(decision.reason,'blockedBeforeQueue');return false;}
    const event=String(q.eventTicker||q.ticker||ticker),now=Date.now(),last=Number(this.entryAdmissionProbeAt.get(event)||0);
    if(last>0&&now-last<ENTRY_ADMISSION_CONTROL.unknownProbeIntervalMs){this.noteEntryAdmission('clock_probe_throttled','probeCoalesced');return false;}
    this.entryAdmissionProbeAt.set(event,now);
    while(this.entryAdmissionProbeAt.size>ENTRY_ADMISSION_CONTROL.maximumTrackedEvents){const first=this.entryAdmissionProbeAt.keys().next().value;this.entryAdmissionProbeAt.delete(first);}
    this.noteEntryAdmission(decision.reason,'probeAllowed');return true;
  }

  admittedInitialExposureMap(marketMap,{allowProbe=false}={}){
    const admitted=new Map();
    for(const [ticker,q] of marketMap||[]){
      const decision=this.entryChainAdmissionForQuote(q,{lane:'ANY',now:Date.now()});
      if(decision.action==='ALLOW'){admitted.set(ticker,q);this.noteEntryAdmission(decision.reason,'allowed');continue;}
      if(decision.action==='PROBE'&&allowProbe&&this.shouldQueueInitialExposure(ticker,{allowProbe:true})){admitted.set(ticker,q);continue;}
      this.noteEntryAdmission(decision.reason,'blockedBeforeQueue');
    }
    return admitted;
  }

  async refreshFeederPriorityTickers() {
    if (!this.db || !this.settings?.systemName) {
      this.feederPriorityTickers = new Set();
      this.activeCosmosByTicker = new Map();
      this.anotherDimensionSourcePeaks = new Map();
      return this.feederPriorityTickers;
    }
    const rows = (typeof this.db.openFeederEntries === 'function'
      ? await this.db.openFeederEntries(this.settings.systemName)
      : await this.db.openEntries(this.settings.systemName).catch(() => [])
    );
    const active=activeCosmoSources(rows || [],this.settings,{now:Date.now()});
    this.feederPriorityTickers = new Set(active.map((e) => e.ticker).filter(Boolean));
    const byTicker=new Map(),activeIds=new Set();
    for(const e of active){
      const ticker=String(e?.ticker||''),id=String(e?.id||'');if(!ticker||!id)continue;
      activeIds.add(id);
      const list=byTicker.get(ticker)||[];list.push(e);byTicker.set(ticker,list);
      const prior=Number(this.anotherDimensionSourcePeaks.get(id)||0);
      this.anotherDimensionSourcePeaks.set(id,Math.max(prior,Number(e.entryPriceCents||0),Number(e.peakPriceCents||0)));
    }
    this.activeCosmosByTicker=byTicker;
    for(const id of [...this.anotherDimensionSourcePeaks.keys()])if(!activeIds.has(id))this.anotherDimensionSourcePeaks.delete(id);
    return this.feederPriorityTickers;
  }

  // R51 compatibility wrappers.  These names are retained only so an older
  // callback cannot accidentally reopen the distributed R50 entry graph.
  // Every real new-generation exposure is routed back through Bolt -> Athena.
  queueLightningPlasmaEvaluation() {
    if (!this.running || this.settings.lightningPlasmaEnabled !== true) return;
    for (const q of this.lastScanMarkets || []) this.queueAthenaOpportunityEvaluation(q?.ticker);
  }

  queueFeederHunterEvaluation(ticker) {
    this.queueAthenaOpportunityEvaluation(ticker);
  }

  async refreshRecoveryPriorityTickers() {
    if (!this.strategy) {
      this.recoveryPriorityTickers = new Set();
      return this.recoveryPriorityTickers;
    }
    // SE2-R6: a finalized market may stop publishing websocket quotes, so
    // retire its durable Starlight watch during scanner refresh as well.
    // Otherwise an unrestricted-lifetime watch could pin the same closed
    // ticker forever after its final onQuote notification was missed.
    if(this.settings?.crashRecoveryHunterEnabled===true&&this.starlightRecoveryWatches instanceof Map){
      const finalTickers=new Set();
      for(const w of this.starlightRecoveryWatches.values()){
        if(!this.starlightScopeMatches(w))continue;
        if(['CONSUMED','EXPIRED','BLOCKED','EXECUTING'].includes(String(w.status)))continue;
        const q=this.market?.getQuote?.(w.ticker);
        if(!q)continue;
        const status=String(q.status||q.liveStatus||'').toLowerCase();
        if(q.result||['finalized','settled','closed','determined'].includes(status))finalTickers.add(String(w.ticker));
      }
      for(const ticker of finalTickers){
        const terminalQuote=this.market?.getQuote?.(ticker);
        if(terminalQuote)await this.observeStarlightRecoveryQuote(terminalQuote);
      }
    }
    // CW3/SJA2: scanner priority is the bounded union of live crash-rebound
    // watches. Neither specialist may evict the other's armed ticker during a
    // refresh/restart. Active CI1 CRASHING/REBOUND_CONFIRMED tickers are also
    // carried independently by crashPriorityTickers.
    const watches=[];
    if(this.settings.recoveryHunterEnabled===true&&this.crystalWallWatches instanceof Map)watches.push(...this.crystalWallWatches.values());
    if(this.settings.justiceArrowEnabled===true&&this.justiceArrowWatches instanceof Map)watches.push(...this.justiceArrowWatches.values());
    if(this.settings.crashRecoveryHunterEnabled===true&&this.starlightRecoveryWatches instanceof Map)
      watches.push(...[...this.starlightRecoveryWatches.values()].filter(w=>this.starlightScopeMatches(w)));
    this.recoveryPriorityTickers = new Set(watches.filter((w)=>!w?.terminal
      &&!['EXPIRED','CONSUMED','BLOCKED'].includes(String(w?.status||''))
      &&!(String(w?.authorizationId||'').startsWith('STARLIGHT-RECOVERY:')&&Date.now()>Number(w?.expiresAtMs||0)))
      .map((w)=>String(w?.ticker||'')).filter(Boolean));
    return this.recoveryPriorityTickers;
  }

  queueRecoveryEvaluation(ticker) {
    this.queueAthenaOpportunityEvaluation(ticker);
  }

  refreshCrashPriorityTickers() {
    const terminal=(ticker)=>{const q=this.market?.getQuote?.(ticker);return Boolean(q?.result)||['closed','settled','finalized','determined'].includes(String(q?.status||'').toLowerCase());};
    const states=this.learning?.crashStates instanceof Map?[...this.learning.crashStates.values()]:(this.learning?.crashLearningSummary?.().states||[]);
    const active=new Set(states.filter(x=>(x.phase==='CRASHING'||x.phase==='REBOUND_CONFIRMED')&&!terminal(x.ticker)).map(x=>x.ticker).filter(Boolean));
    // Executable watches remain subscribed even after CI1 leaves the display's
    // active phase. Remove only terminal watches; never clear owned positions or
    // the durable consumed-episode ledger, and never reset on a trade counter.
    for(const map of [this.crystalWallWatches,this.justiceArrowWatches,this.ci1CloneWatches]){
      if(!(map instanceof Map))continue;
      for(const [id,watch] of map){
        if(watch.terminal||watch.status==='EXPIRED'||terminal(watch.ticker)){map.delete(id);continue;}
        if(watch.ticker)active.add(watch.ticker);
      }
    }
    this.crashPriorityTickers=active;
    return active;
  }

  queueCrashRecoveryEvaluation(ticker) {
    this.queueAthenaOpportunityEvaluation(ticker);
  }


  async acceptCommittedShadowStop(parentId,scope) {
    const record=await this.db.verifiedShadowStop(parentId,scope);
    if(!record)throw new Error('shadow_stop_authority_unavailable');
    const family=executionMarketFamilyExclusion(record.watch?.ticker,this.settings,{concept:record.watch?.parentConcept});
    if(family.blocked){
      void this.db?.audit?.('info','starlight_shadow_stop_market_family_blocked',{parentId,ticker:record.watch?.ticker,reason:family.reason,primaryRule:family.primaryRule}).catch?.(()=>{});
      return null;
    }
    if(!sameShadowScope(this.settings,scope))throw new Error('shadow_stop_authority_unavailable');
    const stats=this.starlightRecoveryRuntime(),watch=record.watch,id=watch.authorizationId;
    if(!this.starlightKnownParents.has(id)){
      this.starlightKnownParents.add(id);stats.armed++;
    }
    const active=this.starlightRecoveryWatches.get(id);
    if(!['CONSUMED','EXPIRED','BLOCKED'].includes(watch.status) && (!active||Number(active.revision)<=watch.revision)){
      this.starlightRecoveryWatches.set(id,watch);
      this.recoveryPriorityTickers?.add(watch.ticker);
      if(this.settings.crashRecoveryHunterLinkEnabled===true)this.queueStarlightRecovery(id);
    }
    await this.db.markShadowStopDelivered(parentId,record.proofHash,scope);
    return record;
  }

  async sweepShadowSaints(){
    if(this.shadowSweepPromise)return this.shadowSweepPromise;
    this.shadowSweepPromise=this._sweepShadowSaints().finally(()=>{this.shadowSweepPromise=null;});
    return this.shadowSweepPromise;
  }

  async _sweepShadowSaints(){
    const settings=structuredClone(this.settings||{});
    const stats=this.shadowSaintStats||(this.shadowSaintStats={version:SHADOW_PROTOCOL,examined:0,closed:0,
      armed:0,waits:0,conflicts:0,errors:0,lastStartedAtMs:0,lastSuccessAtMs:0,lastError:null,degraded:false});
    stats.lastStartedAtMs=Date.now();
    const token=settings.mode==='SIMULATION'?this.simulationMutationGate?.capture():null;
    const isCurrent=()=>this.shadowStopping!==true&&sameShadowScope(this.settings,settings);
    let scope,hadError=false;
    try{
      scope=await this.db.captureShadowScope(settings);
      const rows=await this.db.openShadowEntriesPage(scope,{limit:32});
      for(const entry of rows){
        if(!isCurrent())break;
        let release=null;
        try{
          if(!entryMatchesShadowScope(entry,scope))throw new Error('shadow_work_page_scope_mismatch');
          if(settings.mode==='SIMULATION' && this.simulationMutationGate){
            release=this.simulationMutationGate.enter(token);if(!release)break;
          }
          const observation=structuredClone({quote:this.market?.getQuote?.(entry.ticker)||null,
            book:this.market?.getBook?.(entry.ticker)||null});
          const valid=validateShadowObservation(entry,observation,Date.now(),{allowSame:true});
          stats.examined++;
          if(!valid.ok){
            await this.db.recordShadowWait(entry,scope,valid.reason,{isCurrent});stats.waits++;continue;
          }
          const evaluation=await evaluateShadowWithOriginalGuard(entry,observation,
            {settings,learning:this.learning,athena:this.legacyAthena||this.athena});
          if(evaluation.deferred){
            await this.db.recordShadowWait(entry,scope,evaluation.reason,{isCurrent});stats.waits++;continue;
          }
          const result=await this.db.commitShadowEvaluation(entry,observation,evaluation,scope,{isCurrent});
          if(!result.ok){stats.conflicts++;continue;}
          if(result.closed)stats.closed++;
        }catch(error){
          const message=String(error?.message||error).slice(0,500);
          if(message==='shadow_runtime_transaction_busy'){
            stats.waits++;
            if(isCurrent())await this.db.recordShadowWait(entry,scope,'shadow_runtime_transaction_busy',{isCurrent}).catch(()=>{});
            continue;
          }
          hadError=true;stats.errors++;stats.lastError=message;
          if(isCurrent())await this.db.recordShadowWait(entry,scope,stats.lastError,{isCurrent}).catch(()=>{});
          await this.db.audit('error','shadow_lifecycle_failed',{id:entry.id,scope,message:stats.lastError}).catch(()=>{});
        }finally{release?.();}
      }
      if(isCurrent()){
        const pending=await this.db.pendingShadowStops(scope,{limit:32});
        for(const parentId of pending){
          if(!isCurrent())break;
          await this.acceptCommittedShadowStop(parentId,scope);stats.armed++;
        }
      }
      if(!hadError&&isCurrent()){stats.lastSuccessAtMs=Date.now();stats.lastSuccessScope=shadowScope(settings);stats.lastError=null;}
    }catch(error){
      hadError=true;stats.errors++;stats.lastError=String(error?.message||error).slice(0,500);
      await this.db?.audit?.('error','shadow_sweep_failed',{message:stats.lastError}).catch(()=>{});
    }
    stats.degraded=hadError;
    if(this.health)this.recomputeHealth();
    return {...stats};
  }

  compactShadowDiagnostic(e){
    return {id:e.id,ticker:e.ticker,eventTicker:e.eventTicker,conceptName:e.conceptName,mode:e.mode,
      executionClass:'SHADOW_SAINT',status:e.status,count:e.count,remainingCount:e.remainingCount,
      entryPriceCents:e.entryPriceCents,currentPriceCents:e.currentPriceCents,exitPriceCents:e.exitPriceCents,
      entryFeeCents:e.entryFeeCents,exitFeeCents:e.exitFeeCents,pnlCents:e.pnlCents,closeReason:e.closeReason,
      openedAtMs:e.openedAtMs,closedAtMs:e.closedAtMs,shadowRevision:e.shadowRevision,
      shadowLastEvaluatedAtMs:e.shadowLastEvaluatedAtMs,shadowEpoch:e.shadowEpoch,waitReason:e.shadowState?.waitReason||null,
      verifiedProtocol:e.entryConfig?.shadowSaint?.version===SHADOW_PROTOCOL,
      sourceTradeId:e.sourceTradeId||null,sourceFeeder:e.sourceFeeder||null,continuation:e.lpContinuation||null,
      virtualRecoveryVersion:e.entryConfig?.starlightShadow?.version||null,
      virtualCloseProofHash:e.shadowState?.closeProofHash||null,
      recovery:e.recovery||null,shadowProofHash:e.shadowProofHash||null,deliveryStatus:e.shadowDeliveryStatus||null,stopPriceCents:e.stopPriceCents};
  }

  async shadowProofDiagnostic(parentId) {
    if(typeof parentId !== 'string' || !parentId || parentId.length > 1000)
      throw new Error('shadow_proof_parent_id_invalid');
    return this.db.shadowProofDiagnostic(parentId,shadowScope(this.settings));
  }

  async shadowDiagnostics({limit=100,status=null,beforeOpenedAtMs,beforeId}={}){
    const scope=shadowScope(this.settings);
    const [rows,summary]=await Promise.all([
      this.db.shadowDiagnostics(scope,{limit,status,beforeOpenedAtMs,beforeId}),this.db.shadowSummary(scope)]);
    const cap=Math.max(1,Math.min(200,Number(limit)||100)),last=rows.at(-1);
    return {version:SHADOW_PROTOCOL,classification:'VIRTUAL_ONLY',scope,summary,worker:this.shadowSaintStats||null,rows,
      nextCursor:rows.length===cap&&last?{beforeOpenedAtMs:last.openedAtMs,beforeId:last.id}:null};
  }

  async sweepLightningPlasmaScaleIn(){
    if(this.lightningPlasmaScaleInPromise)return this.lightningPlasmaScaleInPromise;
    const pending=this._sweepLightningPlasmaScaleIn().catch(async(error)=>{
      const stats=this.lightningPlasmaScaleInRuntime();
      stats.lastError=String(error?.message||error);
      stats.lastEvent={status:'BLOCKED',reason:'lp_scalein_sweep_error',message:stats.lastError,atMs:Date.now()};
      await this.db?.audit?.('error','lightning_plasma_scalein_failed',{message:stats.lastError}).catch?.(()=>{});
    }).finally(()=>{if(this.lightningPlasmaScaleInPromise===pending)this.lightningPlasmaScaleInPromise=null;});
    this.lightningPlasmaScaleInPromise=pending;
    return pending;
  }

  async _sweepLightningPlasmaScaleIn(){
    const s=this.settings||{};
    const stats=this.lightningPlasmaScaleInRuntime();
    // Bounded diagnostic sample refreshed every sweep. No telemetry failure
    // is allowed to affect trading or add a synthetic entry signal.
    stats.lastChecks=[];
    const observe=(parent,reason,data={})=>{
      const row={parentStarlightId:String(parent?.id||''),ticker:String(parent?.ticker||''),parentState:parent?.lpContinuation?.state||null,parentRevision:parent?.lpContinuation?.revision??null,reason,atMs:Date.now(),...data};
      stats.lastChecks.push(row);
      if(stats.lastChecks.length>64)stats.lastChecks.shift();
      return row;
    };
    if(s.lightningPlasmaEnabled!==true){this.lightningPriorityTickers?.clear?.();return;}
    const thr=Number(s.lightningPlasmaStarlightScaleInCents);
    if(!Number.isFinite(thr)||thr<=0)return;
    const gate=this.entryExecutionGate?.();
    if(gate && gate.allowed!==true){stats.lastEvent={status:'BLOCKED',reason:gate.reason||'gate',atMs:Date.now()};return;}
    let starlights=[];
    try{
      if(typeof this.db?.lightningMonitorParents!=='function')throw new Error('lp_v3_durable_monitor_unavailable');
      starlights=await this.db.lightningMonitorParents(s,{limit:64});
      // Fair database-backed pagination. Missing marks or exhausted seats must
      // not starve later parents, and a process restart must not reset priority.
      await this.db.touchLightningMonitorParents(s,starlights.map(e=>e.id));
    }catch(error){stats.lastError=String(error?.message||error);stats.lastEvent={status:'BLOCKED',reason:'lp_v3_durable_monitor_unavailable',atMs:Date.now()};return;}
    const scopeKey=JSON.stringify([s.systemName,s.ownerId,s.mode,s.resetTimestampMs||0]);
    if(this.lightningPriorityScope!==scopeKey){this.lightningPriorityScope=scopeKey;this.lightningPriorityTickers=new Map();}
    for(const parent of starlights){
      if(lightningParentEligibility(parent,s).ok){
        this.lightningPriorityTickers.delete(parent.ticker);this.lightningPriorityTickers.set(parent.ticker,Date.now());
      }
    }
    // This is only a bounded quote-cache hint. The complete durable monitor
    // remains in PostgreSQL; REST rotation also covers watches outside the hint.
    // Expire cache hints, not durable monitoring authority. Closed/revoked parents
    // must not occupy subscriptions forever after leaving the current DB page.
    for(const [ticker,seen] of this.lightningPriorityTickers)if(Date.now()-seen>60000)this.lightningPriorityTickers.delete(ticker);
    while(this.lightningPriorityTickers.size>512)this.lightningPriorityTickers.delete(this.lightningPriorityTickers.keys().next().value);
    await this.refreshLightningContinuationQuotes(starlights,{maximum:6});
    if(!starlights.length)return;
    if(!(this.lightningPlasmaScaleInInFlight instanceof Set))this.lightningPlasmaScaleInInFlight=new Set();
    for(const star of starlights){
      const parentId=String(star.id||'');
      if(!parentId||this.lightningPlasmaScaleInInFlight.has(parentId))continue;
      const cachedQuote=this.market?.getQuote?.(star.ticker)||null;
      if(cachedQuote?.ticker===star.ticker&&['finalized','settled','determined','closed'].includes(String(cachedQuote.status||'').toLowerCase())){
        await this.db.terminateLightningMonitor(star,'lp_market_terminal');
        this.lightningPriorityTickers?.delete(star.ticker);observe(star,'lp_market_terminal');continue;
      }
      const eligibility=lightningParentEligibility(star,s);
      if(!eligibility.ok){observe(star,eligibility.reason);continue;}
      let existing;
      try{existing=await this.lightningPlasmaSeatsForParent(parentId);}
      catch(error){
        const message=String(error?.message||error);
        stats.lastError=message;
        observe(star,'durable_seat_query_unavailable',{message});
        await this.db?.audit?.('error','lightning_plasma_scalein_seat_query_failed',{parentStarlightId:parentId,message}).catch?.(()=>{});
        continue;
      }
      // Live quote only. Never invent a mark or a status.
      const quote=this.market?.getQuote?.(star.ticker)||null;
      if(!quote || !(Number(quote.yesBid)>0) || !(Number(quote.yesAsk)>0) || String(quote.status||'').toLowerCase()!=='active'){
        stats.examined=(stats.examined||0)+1;
        observe(star,'quote_unavailable_or_inactive',{existing});
        continue;
      }
      const decision=lightningPlasmaScaleInDecision({
        starlight:star,quote,settings:s,
        existingPlasmaForParent:existing,
        thresholdCents:thr,
      });
      stats.examined=(stats.examined||0)+1;
      if(!decision.ok){observe(star,decision.reason,{existing,profitCents:decision.profitCents??null,thresholdCents:thr});continue;}
      const ask=Number(quote.yesAsk);
      if(ask<Number(s.lightningPlasmaMinEntryCents)||ask>Number(s.lightningPlasmaMaxEntryCents)){
        observe(star,'lightning_own_entry_band',{askCents:ask,existing,profitCents:decision.profitCents});
        continue;
      }
      this.lightningPlasmaScaleInInFlight.add(parentId);
      try{
        const stake=Number(s.lightningPlasmaFieldStakeCents||0);
        const want=Math.max(0,Number(decision.seatsToOpen)||0);
        let openedCount=0,pendingCount=0;
        for(let n=0;n<want;n+=1){
          const opened=await this.strategy.createHunter('Lightning Plasma',quote,stake,0,{
            sourceTradeId:parentId,
            parentStarlightId:parentId,
            lightningPlasmaScaleIn:true,
            stackSeat:decision.multiply>1,
            stackIndex:existing+n+1,
          });
          stats.attempted=(stats.attempted||0)+1;
          if(!opened){
            stats.blocked=(stats.blocked||0)+1;
            observe(star,'entry_guards_or_order_blocked',{existing,profitCents:decision.profitCents});
            break;
          }
          if(opened.status==='open'){
            openedCount+=1;stats.opened=(stats.opened||0)+1;
          }else{
            pendingCount+=1;stats.pending=(stats.pending||0)+1;
          }
        }
        if(openedCount||pendingCount){
          stats.lastEvent={status:pendingCount?'PENDING_OR_OPEN':'OPENED',atMs:Date.now(),parentStarlightId:parentId,ticker:star.ticker,profitCents:decision.profitCents,seats:openedCount,pendingSeats:pendingCount};
          observe(star,stats.lastEvent.status,{existing,profitCents:decision.profitCents,openedCount,pendingCount});
        }
      }catch(error){
        stats.lastError=String(error?.message||error);
        await this.db?.audit?.('error','lightning_plasma_scalein_failed',{parentStarlightId:parentId,message:stats.lastError}).catch?.(()=>{});
      }finally{
        this.lightningPlasmaScaleInInFlight.delete(parentId);
      }
    }
  }

  async refreshLightningContinuationQuotes(parents,{maximum=6}={}){
    const at=Date.now();
    const tickers=[...new Set(parents.map(p=>p.ticker).filter(Boolean))].filter(t=>{
      const q=this.market?.getQuote?.(t),qt=Number(q?.quoteAtMs||q?.updatedAtMs||0);
      return !q||q.bookInvalid||!qt||qt>at||at-qt>4000;
    });
    if(!tickers.length)return {polled:0};
    const offset=Number(this.lightningRestCursor||0)%tickers.length;
    const batch=Array.from({length:Math.min(Math.max(1,maximum),tickers.length)},(_,i)=>tickers[(offset+i)%tickers.length]);
    this.lightningRestCursor=(offset+batch.length)%tickers.length;
    let failed=0;
    await mapLimit(batch,2,async(ticker)=>{
      try{
        if(typeof this.market?.ensureFreshBook==='function')await this.market.ensureFreshBook(ticker,5000);
        const revision=Number(this.market?.quoteRevision||0);
        const fresh=await this.kalshi?.getMarket?.(ticker);
        if(fresh?.ticker===ticker)this.market?.seed?.(fresh,{requestRevision:revision,emit:true});
      }catch{failed++;}
    });
    const stats=this.lightningPlasmaScaleInRuntime();stats.lastRestRefresh={atMs:at,polled:batch.length,failed};
    return stats.lastRestRefresh;
  }

  async lightningPlasmaSeatsForParent(parentId){
    const s=this.settings||{};
    const id=String(parentId||'');
    if(!id)return 0;
    if(typeof this.db?.pool?.query==='function'){
      try{
        const r=await this.db.pool.query(
          "select count(*)::int as n from sag_entries where system_name=$1 and owner_id=$2 and mode=$3 and concept_name='Lightning Plasma' and source_trade_id=$4 and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT' and coalesce(entry_config->>'executionClass','CAPITAL')<>'SHADOW_SAINT' and not (status='rejected' and coalesce(remaining_count,0)=0)",
          [s.systemName,s.ownerId,s.mode,id],
        );
        return Number(r.rows?.[0]?.n||0);
      }catch(error){
        throw new Error(`lp_scalein_durable_seat_query_unavailable:${String(error?.message||error)}`);
      }
    }
    // Open-only fallback loses closed children and can replay a seat after a
    // restart. LP capital admission requires the complete durable seat ledger.
    throw new Error('lp_scalein_durable_seat_query_unavailable:pool_missing');
  }

  lightningPlasmaScaleInRuntime(){
    if(!this.lightningPlasmaScaleInStats||typeof this.lightningPlasmaScaleInStats!=='object')
      this.lightningPlasmaScaleInStats={version:LP_CONTINUATION_VERSION,examined:0,attempted:0,opened:0,pending:0,blocked:0,lastChecks:[],lastEvent:null,lastError:null};
    return this.lightningPlasmaScaleInStats;
  }

  async protectionLoop() {
    while (this.running) {
      try {
        const now=Date.now();
        if (now - this.health.lastProtectionMs >= 1000) await this.runProtectionSweep('independent_1500ms');
        // Shadow research is single-flight and lower priority; never hold the
        // genuine open-position protection loop waiting for a shadow DB page.
        if(!this.shadowSweepPromise)void this.sweepShadowSaints();
        if(!this.lightningPlasmaScaleInPromise)void this.sweepLightningPlasmaScaleIn();
        if (now - this.lastReferenceSweepMs >= REFERENCE_SIGNAL_SWEEP_MS) await this.runReferenceSignalSweep('reference_30s');
        if(!this.strategy?.observationWaits||this.strategy?.observationRestoreState==='failed') await this.strategy?.restoreObservationWaits?.().catch(()=>{});
        await this.strategy?.releaseObservationWaits?.(now).catch(()=>{});
      } catch {}
      await sleep(PROTECTION_BACKUP_MS);
    }
  }

  queueReconcile() {
    if (!this.running || this.reconcileTimer) return;
    this.reconcileTimer = setTimeout(() => {
      this.reconcileTimer = null;
      void this.reconcileBroker().catch((e) => this.recordError('private_reconciliation', e));
    }, 150);
  }

  async testConnection() {
    if (!this.credentials) {
      this.health.restOk = false;
      this.recomputeHealth();
      throw new Error('Kalshi credentials are not configured');
    }
    try {
      this.kalshi.setCredentials(this.credentials);
      const r = await this.kalshi.testConnection();
      this.balance = r.balance;
      this.health.restOk = true;
      this.health.lastRestOkMs = Date.now();
      this.lastError = null;
      this.recomputeHealth();
      return r;
    } catch (e) {
      this.health.restOk = false;
      this.recomputeHealth();
      throw e;
    }
  }

  async saveCredentials(keyId, privateKeyPem) {
    const c = {
      keyId: String(keyId || '').trim(),
      privateKeyPem: String(privateKeyPem || '').replace(/\\n/g, '\n').trim(),
    };
    if (!c.keyId || !c.privateKeyPem) throw new Error('Both Kalshi API Key ID and private key PEM are required');
    const old = this.credentials;
    this.credentials = c;
    this.kalshi.setCredentials(c);
    try {
      const test = await this.testConnection();
      await this.db.saveCredentials(c.keyId, c.privateKeyPem);
      this.market.reconnectToken += 1;
      this.market.ws?.close(1000, 'credentials updated');
      return test;
    } catch (e) {
      this.credentials = old;
      this.kalshi.setCredentials(old || {});
      throw e;
    }
  }

  shadowEntryGate() {
    const gate=this.referenceSignalGate();
    if(!gate.allowed)return gate;
    if(this.db?.shadowArchitectureRequired===true && (this.db.shadowSchemaReady!==true || this.shadowSaintStats?.degraded))
      return {...gate,allowed:false,reason:'shadow_architecture_not_ready'};
    return {...gate,allowed:true,reason:'shadow_only',brokerOrderAuthority:false};
  }

  entryExecutionGate() {
    if(this.db?.shadowArchitectureRequired===true && (!sameShadowScope(this.settings,this.shadowSaintStats?.lastSuccessScope)
      || !(this.shadowSaintStats?.lastSuccessAtMs>0) || Date.now()-this.shadowSaintStats.lastSuccessAtMs>60000
      || Date.now()<this.shadowSaintStats.lastSuccessAtMs))
      return {version:'APS2',allowed:false,reason:'virtual_parent_worker_not_fresh',liveReady:false};
    if(this.db?.shadowArchitectureRequired===true && (this.db.shadowSchemaReady!==true || this.shadowSaintStats?.degraded))
      return {version:'EMI1',allowed:false,reason:'shadow_architecture_not_ready',liveReady:false};
    const engineActive = this.settings?.engineActive === true;
    const mode = String(this.settings?.mode || 'SIMULATION').toUpperCase();
    if (!engineActive) return { version:'EMI1', allowed:false, reason:'engine_disabled', engineActive, mode, liveReady:false };
    if (mode === 'SIMULATION' && this.simulationMutationGate?.blocked) return { version:'EMI1', allowed:false, reason:'simulation_reset_in_progress', engineActive, mode, liveReady:false };
    if (mode === 'SIMULATION') return { version:'EMI1', allowed:true, reason:'simulation', engineActive, mode, liveReady:false };
    if (mode !== 'LIVE') return { version:'EMI1', allowed:false, reason:'invalid_mode', engineActive, mode, liveReady:false };
    if (!env.allowLiveTrading) return { version:'EMI1', allowed:false, reason:'live_trading_disabled', engineActive, mode, liveReady:false };
    if (this.settings.liveArmed !== true) return { version:'EMI1', allowed:false, reason:'live_disarmed', engineActive, mode, liveReady:false };
    this.recomputeHealth();
    if (this.health.degraded) return { version:'EMI1', allowed:false, reason:'health_degraded', engineActive, mode, liveReady:false };
    return { version:'EMI1', allowed:true, reason:'live_ready', engineActive, mode, liveReady:true };
  }

  referenceSignalGate() {
    const engineActive = this.settings?.engineActive === true;
    const resetBlocked=this.settings?.mode==='SIMULATION'&&this.simulationMutationGate?.blocked===true;
    return { version:'EMI1', allowed:engineActive&&!resetBlocked, reason:!engineActive?'engine_disabled':resetBlocked?'simulation_reset_in_progress':'engine_active' };
  }

  isLiveReady() {
    this.recomputeHealth();
    return this.settings.mode === 'LIVE'
      && this.settings.liveArmed === true
      && env.allowLiveTrading
      && !this.health.degraded;
  }

  deploymentAllowsLiveTrading() {
    return env.allowLiveTrading === true;
  }

  cancelLiveAutoRearm({ clearRequest=true }={}) {
    if (this.liveAutoRearmTimer) clearTimeout(this.liveAutoRearmTimer);
    this.liveAutoRearmTimer = null;
    if (clearRequest) this.startupLiveResumeRequested = false;
  }

  scheduleLiveAutoRearm(delayMs = LIVE_RESTART_REARM_RETRY_MS) {
    if (!this.running || !this.startupLiveResumeRequested || this.liveAutoRearmTimer || this.liveAutoRearmPromise) return false;
    const delay = Math.max(0, Number(delayMs) || 0);
    this.liveAutoRearmTimer = setTimeout(() => {
      this.liveAutoRearmTimer = null;
      if (!this.running || !this.startupLiveResumeRequested) return;
      const run = this.attemptLiveAutoRearm();
      this.liveAutoRearmPromise = run;
      void run.finally(() => {
        if (this.liveAutoRearmPromise === run) this.liveAutoRearmPromise = null;
        if (this.running && this.startupLiveResumeRequested) this.scheduleLiveAutoRearm(LIVE_RESTART_REARM_RETRY_MS);
      });
    }, delay);
    this.liveAutoRearmTimer.unref?.();
    return true;
  }

  attemptLiveAutoRearm() {
    const safetyRevision=this.runtimeSettingsSafetyRevision||0;
    return this.queueRuntimeSettingsMutation(()=>this.applyLiveAutoRearm(safetyRevision));
  }

  async applyLiveAutoRearm(safetyRevision) {
    if(safetyRevision!==(this.runtimeSettingsSafetyRevision||0))return false;
    if (!this.running || !this.startupLiveResumeRequested) return false;
    if (this.settings.mode !== 'LIVE') { this.cancelLiveAutoRearm(); return false; }
    if (!this.deploymentAllowsLiveTrading()) {
      this.settings = { ...this.settings, liveArmed:false };
      this.cancelLiveAutoRearm();
      return false;
    }
    if (this.settings.liveArmed === true) { this.cancelLiveAutoRearm(); return true; }

    try {
      // Re-run the exact safety classes required by manual LIVE arming. No
      // broker mutation is possible while liveArmed remains false.
      await this.testConnection();
      const reconciled = await this.reconcileBroker();
      if (reconciled !== true) throw new Error('broker_reconciliation_not_clean');
      await this.runProtectionSweep('live_restart_rearm_check');
      this.recomputeHealth();

      if (this.health.degraded) {
        const reason = [
          !this.health.restOk && 'rest',
          !this.health.websocketFresh && 'websocket',
          !this.health.reconciliationOk && 'reconciliation',
          !this.health.protectionOk && 'protection',
          !this.health.protectionFresh && 'protection_freshness',
          !this.health.goldenEyeOk && 'golden_eye',
          !this.health.scannerFresh && 'scanner_freshness',
        ].filter(Boolean).join(',') || 'health_degraded';
        if (reason !== this.liveAutoRearmLastReason) {
          this.liveAutoRearmLastReason = reason;
          await this.db.audit?.('warning','live_restart_rearm_waiting',{release:RELEASE,reason,mode:this.settings.mode,allowLiveTrading:true}).catch(()=>{});
        }
        return false;
      }

      // Final race check: a concurrent operator switch to SIMULATION must win.
      if (!this.running || !this.startupLiveResumeRequested || this.settings.mode !== 'LIVE' || !this.deploymentAllowsLiveTrading()
        || safetyRevision!==(this.runtimeSettingsSafetyRevision||0)) return false;
      if(this.db?.shadowArchitectureRequired===true && (this.db.shadowSchemaReady!==true || this.shadowSaintStats?.degraded || !this.shadowSaintStats?.lastSuccessAtMs))
        throw new Error('Shadow architecture has not completed a healthy monitoring cycle');
      // The SQL admission/pre-dispatch fence reads persisted liveArmed. Restoring
      // only the in-memory arm would look ready but block every new LIVE entry.
      const committed=await this.persistRuntimeSettings({...this.settings,liveArmed:true},{safetyRevision,changedKeys:['liveArmed']});
      if(committed.superseded || !this.running || !this.startupLiveResumeRequested || this.settings.mode!=='LIVE' || !this.settings.liveArmed)return false;
      this.liveAutoRearmLastReason = null;
      this.cancelLiveAutoRearm();
      this.invalidateStateSnapshot();
      // Re-evaluate current market state immediately after the safe arm is
      // restored instead of waiting for the normal five-minute scan cadence.
      this.requestScan();
      await this.db.audit?.('info','live_restart_rearm_restored',{
        release:RELEASE,mode:'LIVE',liveArmed:true,allowLiveTrading:true,
        reconciliationOk:this.health.reconciliationOk===true,protectionOk:this.health.protectionOk===true,
        protectionFresh:this.health.protectionFresh===true,websocketFresh:this.health.websocketFresh===true,
        scannerFresh:this.health.scannerFresh===true,
      }).catch(()=>{});
      return true;
    } catch (error) {
      this.settings = { ...this.settings, liveArmed:false };
      const reason = String(error?.message || error || 'live_restart_rearm_failed');
      if (reason !== this.liveAutoRearmLastReason) {
        this.liveAutoRearmLastReason = reason;
        await this.db.audit?.('warning','live_restart_rearm_waiting',{release:RELEASE,reason,mode:this.settings.mode,allowLiveTrading:true}).catch(()=>{});
      }
      return false;
    }
  }

  // All full-runtime writes share one queue. A card save, mode switch, reset,
  // engine control and restart rearm must never race stale whole-object saves.
  queueRuntimeSettingsMutation(action) {
    const prior=this.settingsMutationTail||Promise.resolve();
    const run=prior.catch(()=>{}).then(action);
    this.settingsMutationTail=run.catch(()=>{});
    return run;
  }

  raiseRuntimeSafetyFence(patch,reason) {
    this.runtimeSettingsSafetyRevision=(this.runtimeSettingsSafetyRevision||0)+1;
    this.settings={...this.settings,...patch};
    if(this.settings.mode!=='LIVE')this.settings.liveArmed=false;
    // Snapshot only execution controls; normal operator card edits are retained.
    this.runtimeSettingsSafetyState={mode:this.settings.mode,liveArmed:this.settings.liveArmed===true,
      engineActive:this.settings.engineActive===true,resetTimestampMs:this.settings.resetTimestampMs??null};
    this.cancelLiveAutoRearm();
    this.haltNewEntries(reason);
    this.invalidateStateSnapshot();
    return this.runtimeSettingsSafetyRevision;
  }

  async persistRuntimeSettings(candidate,{safetyRevision=this.runtimeSettingsSafetyRevision||0,changedKeys=Object.keys(candidate)}={}) {
    let next={...candidate,liveArmed:candidate.mode==='LIVE'&&candidate.liveArmed===true},observed=safetyRevision;
    const initial=safetyRevision;
    try {
      // Urgent Stop/SIM/reset takes effect in memory immediately, even while an
      // earlier save is stalled. Before acknowledging, replace any stale durable
      // controls too; never publish the earlier armed/active/reset state again.
      for(let attempt=0;attempt<8;attempt++){
        if(observed!==(this.runtimeSettingsSafetyRevision||0)){
          next={...next,...this.runtimeSettingsSafetyState};
          next.liveArmed=next.mode==='LIVE'&&next.liveArmed===true;
          observed=this.runtimeSettingsSafetyRevision||0;
        }
        const committed=await this.db.saveSettings(next);
        if(observed!==(this.runtimeSettingsSafetyRevision||0))continue;
        if(typeof this.db.loadSettings!=='function')throw new Error('settings_persistence_readback_unavailable');
        const persisted=await this.db.loadSettings(freshInstallSettings(),{preserveRuntimeArm:true});
        if(observed!==(this.runtimeSettingsSafetyRevision||0))continue;
        for(const k of Object.keys(next)){
          const expected=next[k],actual=persisted?.[k];
          const matches=expected==null?actual==null:typeof expected==='number'
            ?actual!=null&&Number(actual)===expected:typeof expected==='boolean'?actual===expected
            :typeof expected==='object'?JSON.stringify(actual)===JSON.stringify(expected):String(actual??'')===String(expected);
          if(!matches)throw new Error(`settings_persistence_verification_failed:${k}`);
        }
        this.settings=next;
        this.settingsPersistence={version:'APS2-SERIALIZED-RUNTIME-CONTROLS',lastVerifiedAtMs:Date.now(),
          lastRevision:Number(committed?.revision||0),lastCommittedAtMs:Number(committed?.changedAtMs||0),
          lastKeys:[...changedKeys],lastValues:Object.fromEntries(changedKeys.map(k=>[k,next[k]])),lastError:null};
        this.invalidateStateSnapshot();
        return {settings:next,superseded:initial!==observed};
      }
      throw new Error('runtime_controls_changing_during_save');
    } catch(error) {
      // An unknown commit must never leave memory armed or admitting new trades.
      // Best-effort durable disarm does not turn the failed operation into success.
      this.raiseRuntimeSafetyFence({engineActive:false,liveArmed:false},'runtime_settings_commit_failed');
      try {await this.db.saveSettings({...this.settings});}catch(disarmError){error.disarmError=String(disarmError?.message||disarmError);}
      this.settingsPersistence={...(this.settingsPersistence||{}),version:'APS2-SERIALIZED-RUNTIME-CONTROLS',lastError:String(error?.message||error)};
      await Promise.resolve(this.db.audit?.('error','settings_persistence_verification_failed',{
        release:RELEASE,changedKeys,message:String(error?.message||error),disarmError:error.disarmError||null})).catch(()=>{});
      throw error;
    }
  }

  async setMode(mode, confirmation = '') {
    const m = String(mode).toUpperCase() === 'LIVE' ? 'LIVE' : 'SIMULATION';
    if(m==='LIVE'){
      if (!env.allowLiveTrading) throw new Error('ALLOW_LIVE_TRADING is false');
      if (confirmation !== 'ENABLE LIVE TRADING') throw new Error('Type ENABLE LIVE TRADING to arm real trading');
    }
    const safetyRevision=m==='SIMULATION'
      ?this.raiseRuntimeSafetyFence({mode:'SIMULATION',liveArmed:false},'operator_simulation_mode')
      :(this.runtimeSettingsSafetyRevision||0);
    return this.queueRuntimeSettingsMutation(async()=>{
      if(m==='LIVE'){
        if(safetyRevision!==(this.runtimeSettingsSafetyRevision||0))throw new Error('live_arm_superseded_by_safety_control');
        await this.testConnection();
        const reconciled=await this.reconcileBroker();
        if(reconciled!==true)throw new Error('broker_reconciliation_not_clean');
        await this.runProtectionSweep('live_arm_check');
        this.recomputeHealth();
        if (this.health.degraded) throw new Error('System health is not clean enough to arm LIVE');
        if(this.db?.shadowArchitectureRequired===true && (this.db.shadowSchemaReady!==true || this.shadowSaintStats?.degraded || !this.shadowSaintStats?.lastSuccessAtMs))
          throw new Error('Shadow architecture has not completed a healthy monitoring cycle');
        if(safetyRevision!==(this.runtimeSettingsSafetyRevision||0))throw new Error('live_arm_superseded_by_safety_control');
      }
      const committed=await this.persistRuntimeSettings({...this.settings,mode:m,liveArmed:m==='LIVE'},
        {safetyRevision,changedKeys:['mode','liveArmed']});
      if(m==='LIVE'&&committed.superseded)throw new Error('live_arm_superseded_by_safety_control');
      this.cancelLiveAutoRearm();
      return committed.settings;
    });
  }

  patchSettings(patch) {
    return this.queueRuntimeSettingsMutation(()=>this.applySettingsPatch(patch));
  }

  resetOperatorSettingsToFactory() {
    return this.patchSettings(factoryOperatorSettingsPatch());
  }

  async applySettingsPatch(patch) {
    const safetyRevision=this.runtimeSettingsSafetyRevision||0;
    if(Object.hasOwn(patch||{},'athenaExclamationStarlightTriggerCents')){
      const value=patch.athenaExclamationStarlightTriggerCents;
      if(value==null||value===''||typeof value==='boolean'||!athenaStarlightTriggerConfig({athenaExclamationStarlightTriggerCents:value}).valid)
        throw new RangeError('athenaExclamationStarlightTriggerCents must be an integer from 0 to 99');
    }
    const numeric = new Set(EDITABLE_NUMERIC_SETTINGS);
    const booleans = new Set(EDITABLE_BOOLEAN_SETTINGS);
    const allowed = new Set([...numeric, ...booleans, 'systemName', 'andromedaThunderWaveLevel']);
    const unknown = Object.keys(patch || {}).filter((k) => !allowed.has(k));
    if (unknown.length) throw new Error(`Unknown or retired setting: ${unknown.join(', ')}`);

    let next = { ...this.settings };
    for (const k of numeric) {
      if (!Object.hasOwn(patch, k)) continue;
      const raw=patch[k];
      if(raw==null||typeof raw==='boolean'||typeof raw==='object'||(typeof raw==='string'&&!raw.trim()))
        throw new TypeError(`${k} must be an explicit numeric value`);
      const v = Number(raw);
      if (!Number.isFinite(v)) throw new Error(`${k} must be numeric`);
      next[k] = v;
    }
    for (const k of booleans) {
      if (!Object.hasOwn(patch, k)) continue;
      const v = patch[k];
      if(typeof v!=='boolean'&&!/^(1|0|true|false|yes|no|on|off)$/i.test(String(v)))
        throw new TypeError(`${k} must be a boolean value`);
      next[k] = typeof v === 'boolean' ? v : /^(1|true|yes|on)$/i.test(String(v));
    }
    if (Object.hasOwn(patch, 'systemName')) {
      const v = String(patch.systemName || '').trim();
      if (!v) throw new Error('systemName cannot be empty');
      next.systemName = v;
    }
    if (Object.hasOwn(patch, 'andromedaThunderWaveLevel')) {
      const raw = String(patch.andromedaThunderWaveLevel || '').trim().toUpperCase();
      next.andromedaThunderWaveLevel = raw==='MID'||raw==='MEDIUM'?'MID':raw==='LOW'?'LOW':(raw==='OPEN'||raw==='ALL'||raw==='NONE'||raw==='CLEAR')?'OPEN':'HIGH';
    }

    const price=(k)=>{if(next[k]<1||next[k]>99)throw new Error(`${k} must be between 1 and 99 cents`);};
    for(const k of ['pegasusMinPriceCents','pegasusMaxPriceCents','dragonMinSignalPriceCents','dragonMaxSignalPriceCents','phoenixMinPriceCents','phoenixMaxPriceCents','geminiMinPriceCents','geminiMaxPriceCents','momentumMinEntryCents','momentumMaxEntryCents','waveMinEntryCents','waveMaxEntryCents','recoveryMinEntryCents','recoveryMaxEntryCents','crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents','scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents','justiceArrowMinEntryCents','justiceArrowMaxEntryCents','athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents','lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents'])price(k);
    for(const [lo,hi,label] of [
      ['pegasusMinPriceCents','pegasusMaxPriceCents','Pegasus'],['dragonMinSignalPriceCents','dragonMaxSignalPriceCents','Dragon'],['phoenixMinPriceCents','phoenixMaxPriceCents','Phoenix'],
      ['momentumMinEntryCents','momentumMaxEntryCents','Great Horn'],['waveMinEntryCents','waveMaxEntryCents','Pegasus Ryu Sei Ken'],
      ['recoveryMinEntryCents','recoveryMaxEntryCents','Crystal Wall'],['crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents','Starlight Extinction'],
      ['geminiMinPriceCents','geminiMaxPriceCents','Gemini'],['scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents','Scarlet Needle'],['justiceArrowMinEntryCents','justiceArrowMaxEntryCents','Sagittarius Justice Arrow'],['athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents','Athena Exclamation'],['lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents','Lightning Plasma'],
    ])if(next[lo]>next[hi])throw new Error(`${label} minimum price cannot exceed maximum price`);
    if(next.pegasusDropCents<1||next.pegasusDropCents>99)throw new Error('pegasusDropCents must be between 1 and 99 cents');
    for(const k of ['pegasusReferenceStakeCents','dragonReferenceStakeCents','phoenixReferenceStakeCents','geminiReferenceStakeCents','momentumStakeCents','waveStakeCents','recoveryStakeCents','crashRecoveryStakeCents','scarletNeedleStakeCents','justiceArrowStakeCents','athenaExclamationStakeCents','lightningPlasmaFieldStakeCents','startingCapitalCents'])if(next[k]<=0)throw new Error(`${k} must be greater than zero`);
    if(next.scarletNeedleInfinityNetPerOriginalContractCents<0.01||next.scarletNeedleInfinityNetPerOriginalContractCents>99)throw new Error('scarletNeedleInfinityNetPerOriginalContractCents must be between 0.01 and 99 cents');
    for(const key of ['scarletNeedleMaxRepeats','lightningPlasmaMaxRepeats'])
      if(!Number.isInteger(next[key])||next[key]<0||next[key]>1)throw new RangeError(`${key} must be 0 or 1`);
    next.scarletNeedleMaxRepeats=Math.max(0,Math.min(SCARLET_NEEDLE.maximumConfigurableRepeats,Math.floor(Number(next.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats))));
    if(next.maxPositions<1||!Number.isInteger(next.maxPositions))throw new Error('maxPositions must be a positive integer');
    if(next.maxEntriesPerTrade<1||!Number.isInteger(next.maxEntriesPerTrade))throw new Error('maxEntriesPerTrade must be a positive integer');
    if(next.hunterCooldownMinutes<0)throw new Error('hunterCooldownMinutes cannot be negative');
    if(next.minGameMinutes<0||!Number.isInteger(next.minGameMinutes))throw new Error('minGameMinutes must be a non-negative integer');
    if(next.maxGameMinutes<0||!Number.isInteger(next.maxGameMinutes))throw new Error('maxGameMinutes must be a non-negative integer');
    if(next.maxGameMinutes>0&&next.maxGameMinutes<next.minGameMinutes)throw new Error('maxGameMinutes must be zero (disabled) or greater than or equal to minGameMinutes');
    if(next.eventCooldownMinutes<0)throw new Error('eventCooldownMinutes cannot be negative');
    if(next.maxSpreadCents<0||next.maxSpreadCents>99)throw new Error('maxSpreadCents must be between 0 and 99');
    if(next.simFeeCents<0)throw new Error('simFeeCents cannot be negative');
    if(next.recoveryTrackingHours<=0)throw new Error('recoveryTrackingHours must be greater than zero');
    const confirmInt=(k,max=99)=>{const v=next[k];if(!Number.isInteger(v)||v<0||v>max)throw new Error(`${k} must be an integer from 0 to ${max}`);};
    confirmInt('crystalWallMinCrashCents');confirmInt('crystalWallMinReboundCents');confirmInt('crystalWallMinUpwardTicks',20);
    confirmInt('justiceArrowMinCrashCents');confirmInt('justiceArrowMinReboundCents');confirmInt('justiceArrowMinUpwardTicks',20);
    confirmInt('momentumHunterMinCrashCents');confirmInt('momentumHunterMinReboundCents');confirmInt('momentumHunterMinUpwardTicks',20);
    confirmInt('waveSurferMinCrashCents');confirmInt('waveSurferMinReboundCents');confirmInt('waveSurferMinUpwardTicks',20);
    confirmInt('crashRecoveryHunterMinCrashCents');confirmInt('crashRecoveryHunterMinReboundCents');confirmInt('crashRecoveryHunterMinUpwardTicks',20);
    confirmInt('scarletNeedleMinCrashCents');confirmInt('scarletNeedleMinReboundCents');confirmInt('scarletNeedleMinUpwardTicks',20);
    confirmInt('lightningPlasmaMinCrashCents');confirmInt('lightningPlasmaMinReboundCents');confirmInt('lightningPlasmaMinUpwardTicks',20);
    if(!(next.justiceArrowMinProfitNetPerOriginalContractCents>0)||next.justiceArrowMinProfitNetPerOriginalContractCents>99)throw new Error('justiceArrowMinProfitNetPerOriginalContractCents must be greater than zero and at most 99');
    if(next.atomicThunderGreenTriggerCents<1||next.atomicThunderGreenTriggerCents>99||!Number.isInteger(next.atomicThunderGreenTriggerCents))throw new Error('atomicThunderGreenTriggerCents must be an integer from 1 to 99');
    if(next.dragonMaxEpisode<1||!Number.isInteger(next.dragonMaxEpisode))throw new Error('dragonMaxEpisode must be a positive integer');
    if(next.infinityBreakMinNetPerOriginalContractCents<=0)throw new Error('infinityBreakMinNetPerOriginalContractCents must be greater than zero');
    if(next.infinityBreakRequiredConfirmations<1||!Number.isInteger(next.infinityBreakRequiredConfirmations))throw new Error('infinityBreakRequiredConfirmations must be a positive integer');
    if(next.infinityBreakMaximumBookAgeMs<100)throw new Error('infinityBreakMaximumBookAgeMs must be at least 100ms');
    if(next.infinityBreakConfirmationWindowMs<250)throw new Error('infinityBreakConfirmationWindowMs must be at least 250ms');
    if(next.auroraDamageControlPercent<1||next.auroraDamageControlPercent>95)throw new Error('auroraDamageControlPercent must be between 1 and 95 percent');
    if(next.lightningPlasmaMaxStrikes<1||!Number.isInteger(next.lightningPlasmaMaxStrikes))throw new Error('lightningPlasmaMaxStrikes must be a positive integer');

    // Reject invalid card edits before persistence. Silent clamping would save a
    // different strategy from the one the operator submitted and display.
    for(const key of numeric){
      const value=next[key];
      if(/Multiply$/.test(key)&&(!Number.isInteger(value)||value<1||value>20))
        throw new RangeError(`${key} must be an integer from 1 to 20`);
      if(/[aA]uroraDamageControlPercent$/.test(key)&&(!(value>=1)||value>95))
        throw new RangeError(`${key} must be between 1 and 95 percent`);
      if(/ObservationMinutes$/.test(key)&&(!Number.isInteger(value)||value<0||value>1000))
        throw new RangeError(`${key} must be an integer from 0 to 1000`);
      if(/MinProfitNetPerOriginalContractCents$/.test(key)&&(!(value>=0.01)||value>99))
        throw new RangeError(`${key} must be between 0.01 and 99 cents`);
    }
    confirmInt('athenaExclamationMinCrashCents');
    confirmInt('athenaExclamationMinReboundCents');
    confirmInt('athenaExclamationMinUpwardTicks',20);
    confirmInt('lightningPlasmaStarlightScaleInCents',50);

    const topologyKeys=['pegasusEnabled','dragonEnabled','phoenixEnabled','momentumHunterEnabled','waveSurferEnabled','recoveryHunterEnabled','crashRecoveryHunterEnabled','scarletNeedleEnabled','geminiEnabled','justiceArrowEnabled','athenaExclamationEnabled','lightningPlasmaEnabled','galacticExplosionEnabled'];
    const executionArm={mode:this.settings?.mode,liveArmed:this.settings?.liveArmed===true};
    next=preserveExecutionArm(executionArm, sanitizeRuntimeSettings(next));
    const topologyChanged=topologyKeys.some((k)=>Object.hasOwn(patch||{},k)&&this.settings?.[k]!==next[k]);
    const changedKeys=Object.keys(patch||{});
    const committed=await this.persistRuntimeSettings(next,{safetyRevision,changedKeys});
    next=committed.settings;
    if(Object.hasOwn(patch||{},'phoenixEnabled')&&next.phoenixEnabled!==true)this.phoenixCosmo?.clear?.();
    this.invalidateStateSnapshot();
    if(topologyChanged){
      // HF3 activation coordination: settings writes remain fast and durable,
      // while the scanner/priority sets are synchronised out-of-band. Multiple
      // one-by-one toggle changes collapse into one requested scan rather than
      // launching an entry storm inside the HTTP PATCH request.
      this.requestScan();
      queueMicrotask(()=>{
        void Promise.allSettled([this.refreshFeederPriorityTickers(),this.refreshRecoveryPriorityTickers()]).catch(()=>{});
        this.refreshCrashPriorityTickers();
      });
      if(typeof this.db.audit==='function')await this.db.audit('info','entry_topology_settings_changed',{release:RELEASE,changed:topologyKeys.filter((k)=>Object.hasOwn(patch||{},k)),galacticExplosionEnabled:next.galacticExplosionEnabled===true,pegasusEnabled:next.pegasusEnabled===true,dragonEnabled:next.dragonEnabled===true,momentumHunterEnabled:next.momentumHunterEnabled===true,waveSurferEnabled:next.waveSurferEnabled===true,recoveryHunterEnabled:next.recoveryHunterEnabled===true,crashRecoveryHunterEnabled:next.crashRecoveryHunterEnabled===true,scarletNeedleEnabled:next.scarletNeedleEnabled===true,geminiEnabled:next.geminiEnabled===true,justiceArrowEnabled:next.justiceArrowEnabled===true,athenaExclamationEnabled:next.athenaExclamationEnabled===true}).catch(()=>{});
    }
    return next;
  }

  haltNewEntries(reason='engine_stopped') {
    this.ci1CloneWatches?.clear?.();
    this.ci1CloneInFlight?.clear?.();
    this.justiceArrowWatches?.clear?.();
    this.crystalWallWatches?.clear?.();
    this.entryEvaluationQueue?.clear?.();
    return reason;
  }

  async setEngine(active) {
    const on=Boolean(active);
    const safetyRevision=on?(this.runtimeSettingsSafetyRevision||0)
      :this.raiseRuntimeSafetyFence({engineActive:false},'engine_stopped');
    return this.queueRuntimeSettingsMutation(async()=>{
      if(on&&safetyRevision!==(this.runtimeSettingsSafetyRevision||0))throw new Error('engine_start_superseded_by_safety_control');
      const committed=await this.persistRuntimeSettings({...this.settings,engineActive:on},
        {safetyRevision,changedKeys:['engineActive']});
      if(on&&committed.superseded)throw new Error('engine_start_superseded_by_safety_control');
      await Promise.resolve(this.db.audit?.('info',on?'engine_started':'engine_stopped',
        {release:RELEASE,engineActive:this.settings.engineActive===true})).catch(()=>{});
      return committed.settings;
    });
  }

  requestScan() { this.scanRequested = true; }

  async resetDashboard() {
    const resetTimestampMs=Math.max(Date.now(),Number(this.settings.resetTimestampMs||0)+1);
    const safetyRevision=this.raiseRuntimeSafetyFence({resetTimestampMs,engineActive:false},'dashboard_reset');
    this.ci1ConsumedEpisodes?.clear?.();
    this.invalidateOperatorTelemetry();
    return this.queueRuntimeSettingsMutation(async()=>{
      const committed=await this.persistRuntimeSettings({...this.settings,resetTimestampMs,engineActive:false},
        {safetyRevision,changedKeys:['resetTimestampMs','engineActive']});
      this.invalidateOperatorTelemetry();
      await Promise.resolve(this.db.audit?.('info','dashboard_reset_completed',
        {release:RELEASE,resetTimestampMs:this.settings.resetTimestampMs,engineActive:false})).catch(()=>{});
      return committed.settings;
    });
  }

  async resetSimulation() {
    if (this.settings.mode !== 'SIMULATION') throw new Error('Simulation reset is only allowed in SIMULATION mode');
    if(this.simulationResetPromise)return this.simulationResetPromise;
    const requestedSystem=this.settings.systemName,requestedOwner=this.settings.ownerId;
    this.raiseRuntimeSafetyFence({engineActive:false},'simulation_reset');
    const run=this.queueRuntimeSettingsMutation(async()=>{
      if(this.settings.mode!=='SIMULATION'||this.settings.systemName!==requestedSystem||this.settings.ownerId!==requestedOwner)
        throw new Error('simulation_reset_scope_changed');
      const before=this.simulationMutationGate.snapshot();
      await this.simulationMutationGate.blockAndDrain();
      try{
        const n = await this.db.archiveSimulation(this.settings.systemName);
        // Performance reset archives economic SIM rows only. The following are
        // intelligence and MUST survive: tracker rows, MarketHub histories,
        // crash/learning state, Atomic Thunder observations and Athena memory.
        this.anotherDimensionOpenByTicker?.clear?.();
        this.anotherDimensionRecent?.clear?.();
        this.anotherDimensionRuntime?.clear?.();
        this.anotherDimensionSourcePeaks?.clear?.();
        this.geminiOpenAttemptBookMs?.clear?.();
        this.activeCosmosByTicker?.clear?.();
        this.refreshCrashPriorityTickers();
        this.haltNewEntries?.('simulation_reset');
        this.ci1ConsumedEpisodes?.clear?.();
        this.starlightRecoveryWatches?.clear?.();
        this.starlightRecoveryInFlight?.clear?.();
        const resetTimestampMs=Math.max(Date.now(),Number(this.settings.resetTimestampMs||0)+1);
        const safetyRevision=this.raiseRuntimeSafetyFence({resetTimestampMs,engineActive:false},'simulation_reset_committed');
        await this.persistRuntimeSettings({...this.settings},{safetyRevision,changedKeys:['resetTimestampMs','engineActive']});
        this.invalidateStateSnapshot();
        this.invalidateOperatorTelemetry();
        await this.db.audit('info','simulation_reset_completed',{release:RELEASE,archivedEntries:n,intelligencePreserved:true,trackersCleared:false,marketHistoriesCleared:false,athenaMemoryPreserved:true,atomicThunderHistoryPreserved:true,mutationGateBefore:before,mutationGateAtArchive:this.simulationMutationGate.snapshot()}).catch(()=>{});
        return n;
      }finally{this.simulationMutationGate.release();}
    });
    this.simulationResetPromise=run;
    try{return await run;}finally{if(this.simulationResetPromise===run)this.simulationResetPromise=null;}
  }

  async _reconcileBroker() {
    if (!this.credentials) {
      this.health.reconciliationOk = this.settings.mode !== 'LIVE';
      this.recomputeHealth();
      return this.health.reconciliationOk;
    }
    try {
      let positions = await this.kalshi.getPositions();
      this.brokerPositions = positions;
      let owned = await this.db.liveOpenHunterEntries(this.settings.ownerId);

      const summarize=(positionRows,ownedRows)=>{
        const byTicker=new Map();
        for(const p of positionRows||[]){
          const t=p.ticker||p.market_ticker;
          const qty=brokerPositionCount(p);
          if(t)byTicker.set(t,(byTicker.get(t)||0)+qty);
        }
        let ok=true;
        const requiredByTicker=new Map();
        const entriesByTicker=new Map();
        for(const e of ownedRows||[]){
          if(e.status==='entry_pending'||e.status==='pending_recovery'){ok=false;continue;}
          const required=Math.max(0,Number(e.remainingCount??e.count??0));
          requiredByTicker.set(e.ticker,(requiredByTicker.get(e.ticker)||0)+required);
          if(!entriesByTicker.has(e.ticker))entriesByTicker.set(e.ticker,[]);
          entriesByTicker.get(e.ticker).push(e);
        }
        const shortages=[];
        for(const [ticker,required] of requiredByTicker){
          const broker=byTicker.get(ticker)||0;
          if(broker+1e-6<required){ok=false;shortages.push({ticker,required,broker,entries:entriesByTicker.get(ticker)||[]});}
        }
        return{ok,byTicker,requiredByTicker,shortages};
      };

      let summary=summarize(positions,owned);
      if(summary.shortages.length&&typeof this.profitGuard?.reconcileBrokerOwnershipShortfall==='function'){
        let repaired=false;
        for(const shortage of summary.shortages){
          const out=await this.profitGuard.reconcileBrokerOwnershipShortfall({ticker:shortage.ticker,brokerCount:shortage.broker,entries:shortage.entries}).catch(async(error)=>{
            await this.db.audit('error','live_broker_ownership_recovery_error',{ticker:shortage.ticker,message:String(error?.message||error),policyRevision:BROKER_OWNERSHIP_RECONCILIATION.policyRevision}).catch(()=>{});
            return{recovered:false};
          });
          repaired=repaired||Boolean(out?.recovered)||Boolean(out?.quarantined);
        }
        if(repaired){
          // Re-read both authorities after any durable repair/quarantine. A zero-
          // inventory quarantine removes only an unprovable local ledger claim;
          // it never fabricates a broker fill, exit price, or realized P&L.
          // Reconciliation is clean only if fresh broker truth covers the fresh
          // owner-wide active ledger after that durable state transition.
          positions=await this.kalshi.getPositions();
          this.brokerPositions=positions;
          owned=await this.db.liveOpenHunterEntries(this.settings.ownerId);
          summary=summarize(positions,owned);
        }
      }

      if(summary.shortages.length){
        await this.db.audit('error','live_broker_ownership_reconciliation_unresolved',{policyRevision:BROKER_OWNERSHIP_RECONCILIATION.policyRevision,shortages:summary.shortages.map((x)=>({ticker:x.ticker,brokerCount:x.broker,ownedRemaining:x.required,ownedRows:x.entries.length}))}).catch(()=>{});
      }
      const gaps=brokerLedgerGaps(positions,owned);
      const shared=sharedAccountBook({systemId:this.settings.ownerId||this.settings.systemName,positions,owned});
      this.brokerLedgerGaps={...gaps,untracked:shared.ignoredOtherSystem,ignoredOtherSystem:shared.ignoredOtherSystem,quarantineOwn:shared.quarantineOwn,ownTradable:shared.ownTradable,continueTrading:shared.continueTrading};
      const gapKey=JSON.stringify(shared.ignoredOtherSystem||[]);
      if(gapKey!==this.brokerLedgerGapKey){
        this.brokerLedgerGapKey=gapKey;
        if(shared.ignoredOtherSystem.length)await this.db.audit('info','shared_account_other_system_ignored',{policyRevision:BROKER_OWNERSHIP_RECONCILIATION.policyRevision,ignored:shared.ignoredOtherSystem}).catch(()=>{});
      }
      // Other-system contracts are visible and ignored. They do not fail this box.
      // An own-row hole is quarantined by the shortfall path; it does not claim the other box.
      this.health.reconciliationOk=summary.ok || shared.quarantineOwn.length===0;
      this.recomputeHealth();
      return summary.ok;
    } catch (e) {
      this.health.reconciliationOk = false;
      this.recomputeHealth();
      throw e;
    }
  }

  reconcileBroker() {
    if (this.reconcilePromise) return this.reconcilePromise;
    const p = this._reconcileBroker().finally(() => {
      if (this.reconcilePromise === p) this.reconcilePromise = null;
    });
    this.reconcilePromise = p;
    return p;
  }

  async persistTrackers(markets, additionalRequiredTickers = []) {
    // Production GCA2 persists event-clock truth in its dedicated table, so the
    // full tracker-history JSON is unnecessary here. Legacy test adapters that
    // lack gameClockStates keep the old fallback semantics on a bounded set.
    const oldRows = typeof this.db?.gameClockStates==='function'?[]:await this.db.trackers(this.settings.systemName,100);
    const entered = new Set(await this.openMemoryPriorityTickers());
    const recoveryRequired = new Set((additionalRequiredTickers || []).map(String).filter(Boolean));
    const requiredTickers = new Set([...entered, ...recoveryRequired]);
    const bands = [];
    if (this.settings.pegasusEnabled) bands.push([this.settings.pegasusMinPriceCents, this.settings.pegasusMaxPriceCents]);
    if (this.settings.dragonEnabled) bands.push([this.settings.dragonMinSignalPriceCents, this.settings.dragonMaxSignalPriceCents]);
    if (this.settings.waveSurferEnabled) bands.push([this.settings.waveMinEntryCents, this.settings.waveMaxEntryCents]);
    if (this.settings.momentumHunterEnabled) bands.push([this.settings.momentumMinEntryCents ?? MOMENTUM.minEntryCents, this.settings.momentumMaxEntryCents ?? MOMENTUM.maxEntryCents]);
    if (this.settings.geminiEnabled) bands.push([this.settings.geminiMinPriceCents ?? MOMENTUM.minEntryCents, this.settings.geminiMaxPriceCents ?? MOMENTUM.maxEntryCents]);
    if (this.settings.recoveryHunterEnabled) bands.push([this.settings.recoveryMinEntryCents ?? RECOVERY.minEntryCents, this.settings.recoveryMaxEntryCents ?? RECOVERY.maxEntryCents]);
    if (this.settings.crashRecoveryHunterEnabled) bands.push([this.settings.crashRecoveryMinEntryCents, this.settings.crashRecoveryMaxEntryCents]);
    const inBand = (ask) => bands.some(([min,max]) => ask >= min && ask <= max);
    const distance = (ask) => bands.length ? Math.min(...bands.map(([min,max]) => Math.abs(ask - ((min + max) / 2)))) : 0;
    const now = Date.now();
    // Open entries are safety-critical and must never fall out of the clock
    // authority set merely because the discovery list/top-50 tracker ranking
    // changed. Merge current cached quotes for every open ticker, then retain
    // all of those required rows plus the best non-entered observation rows.
    const candidatesByTicker = new Map((markets || []).map((q) => [q.ticker, q]));
    for (const ticker of requiredTickers) {
      if (candidatesByTicker.has(ticker)) continue;
      const cached = this.market?.getQuote?.(ticker);
      if (cached) candidatesByTicker.set(ticker, cached);
    }
    const ranked = [...candidatesByTicker.values()].sort((a, b) => {
      const ae = requiredTickers.has(a.ticker) ? 0 : 1;
      const be = requiredTickers.has(b.ticker) ? 0 : 1;
      if (ae !== be) return ae - be;
      const ab = inBand(a.yesAsk) ? 0 : 1;
      const bb = inBand(b.yesAsk) ? 0 : 1;
      if (ab !== bb) return ab - bb;
      return distance(a.yesAsk) - distance(b.yesAsk);
    });
    const required = ranked.filter((q) => requiredTickers.has(q.ticker));
    const optional = ranked.filter((q) => !requiredTickers.has(q.ticker)).slice(0, Math.max(0, 50 - required.length));
    const selected = [...required, ...optional];
    const keep = new Set([...requiredTickers, ...selected.map((q) => q.ticker)]);

    // Discovery/live classification is deliberately broad and remains useful
    // for feeders. GCA1 is a separate authority plane for exposure-creating
    // Hunters, so compute broad status first and then resolve one shared,
    // persisted event clock for every sibling market in the selected set.
    for (const q of selected) {
      const status = computeLiveStatus({
        tradeCount: q.recentTrades, yesBid: q.yesBid, yesAsk: q.yesAsk,
        prevYesBid: q.prevYesBid || 0, prevYesAsk: q.prevYesAsk || 0,
        occurrenceTimeMs: q.occurrenceTimeMs, closeTimeMs: q.closeTimeMs,
        volume24h: q.volume24h, now,
      });
      q.liveStatus = status;
    }

    if (!this.gameClock) {
      this.gameClock = new GameClockAuthority({
        kalshi: this.kalshi || {},
        audit: (event, data) => this.db.audit?.('info', event, data) || Promise.resolve(),
      });
    }
    const eventTickers = [...new Set(selected.map((q) => q.eventTicker || q.ticker).filter(Boolean))];
    let priorClockStates = new Map();
    if (typeof this.db.gameClockStates === 'function') {
      priorClockStates = await this.db.gameClockStates(this.settings.systemName, eventTickers);
    } else {
      // Test/backward-compatible projection only. R17 production uses the
      // dedicated event authority table so tracker pruning cannot erase truth.
      for (const row of oldRows) {
        const event = row.event_ticker || row.ticker;
        if (!priorClockStates.has(event) && row.game_clock_state?.version === GAME_CLOCK_AUTHORITY.version) {
          priorClockStates.set(event, row.game_clock_state);
        }
      }
    }
    // Resolve the authority plane for the full selected observation set so the
    // first official live observation is captured near real game start, not
    // only after a feeder later becomes attractive. Expensive PBP fallback is
    // reserved for already-open exposure-chain tickers; normal candidates use
    // the lighter milestone + live-data path. Endpoint calls are cached and
    // bounded in KalshiClient, so optional enrichment cannot dominate a scan.
    const gameStatsEventTickers = new Set(selected.filter((q) => entered.has(q.ticker)).map((q) => q.eventTicker || q.ticker));
    const resolvedClockStates = await this.gameClock.resolveBatch(selected, priorClockStates, now, {
      gameStatsEventTickers,
      allowObservedActivityClock: true,
      minimumElapsedMs: Math.max(0, Number(this.settings.minGameMinutes || 0)) * 60 * 1000,
    });
    const clockStates = new Map(priorClockStates);
    for (const [eventTicker, state] of resolvedClockStates) {
      clockStates.set(eventTicker, state);
      if (typeof this.db.upsertGameClockState === 'function') {
        await this.db.upsertGameClockState(this.settings.systemName, eventTicker, state);
      }
    }

    for (const q of selected) {
      const event = q.eventTicker || q.ticker;
      const state = clockStates.get(event) || null;
      q.gameClockState = state || {};
      q.gameStartTimeMs = isConfirmedGameClockState(state, event) ? Number(state.startTimeMs) : null;
      await this.db.upsertTracker(
        this.settings.systemName,
        q,
        this.market.getHistory(q.ticker),
        [],
        entered.has(q.ticker) ? 'entered' : recoveryRequired.has(q.ticker) ? 'recovery' : 'tracking',
      );
    }
    await this.db.deleteStaleTrackers(this.settings.systemName, [...keep]);
    if (typeof this.db.pruneGameClockStates === 'function') {
      await this.db.pruneGameClockStates(this.settings.systemName, now - 14 * 24 * 60 * 60 * 1000).catch(() => {});
    }
    return new Map((await this.db.trackers(this.settings.systemName, 2000)).map((x) => [x.ticker, x]));
  }

  async refreshGameClockForQuote(candidate, { forceFresh = false } = {}) {
    const ticker = String(candidate?.ticker || '');
    const eventTicker = String(candidate?.eventTicker || ticker);
    if (!ticker || !eventTicker || !this.gameClock) return null;
    // Pre-execution calls force a fresh exact market REST/book observation
    // before resolving the clock. This prevents the weaker occurrence fallback
    // from being authorized by a stale cached activity classification.
    if (forceFresh && typeof this.market?.refreshTicker === 'function') {
      await this.market.refreshTicker(ticker).catch(() => null);
      // Broad scan activity is intentionally not trusted at the executable
      // boundary. Refresh the exact ticker's last-five-minute trades so the
      // occurrence fallback cannot inherit a stale `recentTrades` count.
      const tradeProbe = typeof this.kalshi?.getRecentTradesForTicker === 'function'
        ? await this.kalshi.getRecentTradesForTicker(ticker, 5).catch(() => null)
        : null;
      const refreshedQuote = this.market?.getQuote?.(ticker);
      if (refreshedQuote) {
        refreshedQuote.recentTradesObservedAtMs = tradeProbe ? Number(tradeProbe.observedAtMs || Date.now()) : 0;
        if (tradeProbe) {
          refreshedQuote.recentTrades = Number(tradeProbe.count || 0);
          if (Number(tradeProbe.lastPriceCents || 0) > 0) refreshedQuote.lastPrice = Number(tradeProbe.lastPriceCents);
        }
      }
    }
    const now = Date.now();
    const current = this.market?.getQuote?.(ticker) || candidate;
    if (!current || String(current.eventTicker || current.ticker || '') !== eventTicker) {
      await Promise.resolve(this.db.audit?.('info', 'game_clock_refresh_event_identity_blocked', {
        ticker, eventTicker, freshEventTicker: current ? String(current.eventTicker || current.ticker || '') : null,
      })).catch(() => {});
      return null;
    }
    const siblings = [];
    const seen = new Set();
    const add = (q) => {
      if (!q?.ticker || seen.has(q.ticker)) return;
      if (String(q.eventTicker || q.ticker) !== eventTicker) return;
      seen.add(q.ticker);
      const liveStatus = computeLiveStatus({
        tradeCount: q.recentTrades, yesBid: q.yesBid, yesAsk: q.yesAsk,
        prevYesBid: q.prevYesBid || 0, prevYesAsk: q.prevYesAsk || 0,
        occurrenceTimeMs: q.occurrenceTimeMs, closeTimeMs: q.closeTimeMs,
        volume24h: q.volume24h, now,
      });
      siblings.push({ ...q, liveStatus });
    };
    add(current);
    for (const q of this.lastScanMarkets || []) add(q);
    if (!siblings.length) return null;
    const priorMap = typeof this.db.gameClockStates === 'function'
      ? await this.db.gameClockStates(this.settings.systemName, [eventTicker])
      : new Map();
    const prior = priorMap.get(eventTicker) || candidate?.gameClockState || null;
    const state = await this.gameClock.resolveEvent({
      eventTicker,
      quotes: siblings,
      priorState: prior,
      now,
      allowGameStats: true,
      forceFresh,
      allowObservedActivityClock: true,
      minimumElapsedMs: Math.max(0, Number(this.settings.minGameMinutes || 0)) * 60 * 1000,
    });
    if (typeof this.db.upsertGameClockState === 'function') {
      await this.db.upsertGameClockState(this.settings.systemName, eventTicker, state);
    }
    const gameStartTimeMs = isConfirmedGameClockState(state, eventTicker) ? Number(state.startTimeMs) : null;
    candidate.gameClockState = state || {};
    candidate.gameStartTimeMs = gameStartTimeMs;
    candidate.liveStatus = siblings.find((q) => q.ticker === ticker)?.liveStatus || candidate.liveStatus;
    const cached = this.market?.getQuote?.(ticker);
    if (cached) {
      cached.gameClockState = state || {};
      cached.gameStartTimeMs = gameStartTimeMs;
      cached.liveStatus = candidate.liveStatus;
    }
    return { gameClockState: state || {}, gameStartTimeMs, liveStatus: candidate.liveStatus };
  }

  async evaluateEntryChain(markets, trackerMap, marketMap) {
    const created=[];
    if(!this.referenceSignalGate().allowed)return created;
    const simulationToken=this.settings?.mode==='SIMULATION'?this.simulationMutationGate.capture():null;
    let releaseSimulationWork=null;
    if(this.settings?.mode==='SIMULATION'){
      releaseSimulationWork=this.simulationMutationGate.enter(simulationToken);
      if(!releaseSimulationWork)return created;
    }
    try{
      // Cosmo Universe remains observation/reference-only and is evaluated first
      // so Athena can consume the newest Pegasus/Dragon context in the same scan.
      // Phoenix is quote-event driven and therefore never adds a second scanner.
      created.push(...await this.strategy.evaluateDragon(marketMap));
      created.push(...await this.strategy.evaluateFeeders(markets,trackerMap));
      await this.refreshFeederPriorityTickers();
      if(this.shadowEntryGate().allowed){
        const admitted=this.admittedInitialExposureMap(marketMap,{allowProbe:false});
        created.push(...await this.evaluateNewGenerationOpportunities(admitted));
      }
      return created;
    }finally{try{releaseSimulationWork?.();}catch{}}
  }

  async openMemoryPriorityTickers(){
    if(typeof this.db.openEntryTickers==='function')return this.db.openEntryTickers(this.settings.systemName);
    return (await this.db.openEntries(this.settings.systemName)).map(x=>x.ticker);
  }
  async openMemoryHunterCount(){
    if(typeof this.db.openHunterCount==='function')return this.db.openHunterCount(this.settings.systemName);
    return (typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):await this.db.openEntries(this.settings.systemName)).filter(x=>PORTFOLIO_CONCEPTS.has(x.conceptName)).length;
  }

  async fullScan() {
    const start = Date.now();
    this.speed = { ...this.speed, mode: 'fullScan', lastLoopMs: start, checksCompleted: 0, closedThisLoop: 0, fetchFailures: 0 };
    try {
      const openTickers = await this.openMemoryPriorityTickers();
      await this.refreshRecoveryPriorityTickers();
      this.refreshCrashPriorityTickers();
      const priority = [...new Set([...openTickers, ...this.recoveryPriorityTickers, ...this.crashPriorityTickers,...(this.lightningPriorityTickers?.keys?.()||[])])];
      const markets = await this.market.discover(priority);
      for (const q of markets) if (!q.quoteAtMs) q.quoteAtMs = Number(q.updatedAtMs || 0) || Date.now();
      this.lastScanMarkets = markets;
      this.lastDiscoveryMs = Date.now();
      this.health.lastDiscoveryMs = this.lastDiscoveryMs;
      for (const q of markets) this.market.sample(q.ticker, Date.now());
      for (const t of priority) {
        if (markets.some((q) => q.ticker === t)) continue;
        const q = this.market.getQuote(t);
        if (q) this.market.sample(q.ticker, Date.now());
      }
      const trackerMap = await this.persistTrackers(markets, [...new Set([...this.recoveryPriorityTickers, ...this.crashPriorityTickers])]);
      const map = new Map(markets.map((x) => [x.ticker, x]));
      for (const t of priority) {
        if (!map.has(t)) {
          const q = this.market.getQuote(t);
          if (q) map.set(t, q);
        }
      }

      // Recovery is a rescue path, so it gets first claim on capacity/cash.
      // Protection runs before all new exposure; newly stopped sources are then
      // added to the recovery-priority set and evaluated before Momentum/Wave.
      const before = await this.openMemoryHunterCount();
      await this.runProtectionSweep('full_scan');
      const after = await this.openMemoryHunterCount();
      this.speed.closedThisLoop = Math.max(0, before - after);
      await this.refreshRecoveryPriorityTickers();
      // Independent SE2-R9 recovery maintenance runs on dedicated bounded
      // lanes. Do not block the scanner or double-process these watch jobs.
      await this.learning.trackRecovery(this.market.quotes, this.settings);
      await this.learning.trackStopGuardRecovery?.(this.market.quotes,this.settings,this.market).catch(async(error)=>{
        await this.db.audit('warning','stop_guard_recovery_tracking',{source:'full_scan',message:String(error?.message||error)}).catch(()=>{});
      });
      for (const q of map.values()) await this.learning.observeCrashQuote(q, this.settings, Number(q.quoteAtMs || q.updatedAtMs || q.observedAtMs || 0) || Date.now());
      this.refreshCrashPriorityTickers();

      const newEntries = await this.evaluateEntryChain(markets, trackerMap, map);

      await this.runPostExitResearchIfDue('full_scan');
      const trackers = await this.db.trackers(this.settings.systemName, 2000);
      await this.learning.learnMarketDrops(trackers, this.market.quotes);
      await this.learning.aggregatePatterns();
      await this.learning.aggregateStopGuardProfiles?.().catch(async(error)=>{
        await this.db.audit('warning','stop_guard_recovery_profile_aggregation',{message:String(error?.message||error)}).catch(()=>{});
      });
      await this.learning.learnDurations(this.market.quotes);
      await this.reconcileBroker().catch(() => {});
      await this.testConnection().catch(() => {});
      await this.snapshot();
      this.lastFullScanMs = Date.now();
      this.speed.lastLoopMs = this.lastFullScanMs;
      this.cycleFailureCount = 0;
      this.recomputeHealth();
      await this.db.audit('info', 'full_scan', { markets: markets.length, newEntries: newEntries.length, ms: Date.now() - start });
      return { markets: markets.length, newEntries: newEntries.length };
    } catch (e) {
      this.speed.fetchFailures = Number(this.speed.fetchFailures || 0) + 1;
      this.recordError('full_scan', e);
      throw e;
    }
  }

  async fastPhase(index) {
    const start = Date.now();
    const timestamps = [];
    let first = true;
    let closed = 0;
    let fail = 0;
    this.speed.mode = 'entryOnly';
    while (Date.now() - start < 50_000 && this.running) {
      const t = Date.now();
      timestamps.push(t);
      try {
        if (first) {
          const trackers = await this.db.trackers(this.settings.systemName, 500);
          const openTickers = await this.openMemoryPriorityTickers();
          await this.refreshRecoveryPriorityTickers();
          this.refreshCrashPriorityTickers();
          const requiredTickers = new Set([...openTickers, ...this.recoveryPriorityTickers, ...this.crashPriorityTickers]);
          const requiredTrackers = trackers.filter((tr) => requiredTickers.has(tr.ticker));
          const optionalTrackers = trackers.filter((tr) => !requiredTickers.has(tr.ticker)).slice(0, Math.max(0, 50 - requiredTrackers.length));
          const activeTrackers = [...requiredTrackers, ...optionalTrackers];
          const marketList = [];
          const trackerMap = new Map(trackers.map((x) => [x.ticker, x]));
          for (const tr of activeTrackers) {
            const q = this.market.getQuote(tr.ticker);
            if (q && !q.bookInvalid) {
              q.gameStartTimeMs = Number(tr.game_start_time_ms) || null;
              q.gameClockState = tr.game_clock_state && typeof tr.game_clock_state === 'object' ? tr.game_clock_state : {};
              q.liveStatus = tr.live_status;
              this.market.sample(q.ticker, t);
              marketList.push(q);
            }
          }
          const map = new Map(marketList.map((x) => [x.ticker, x]));
          for (const q of marketList) await this.learning.observeCrashQuote(q, this.settings, Number(q.quoteAtMs || q.updatedAtMs || q.observedAtMs || 0) || Date.now());
          this.refreshCrashPriorityTickers();
          await this.evaluateEntryChain(marketList, trackerMap, map);
          first = false;
        }
        const before = await this.openMemoryHunterCount();
        await this.runProtectionSweep('fast_phase');
        const after = await this.openMemoryHunterCount();
        closed += Math.max(0, before - after);
        // A new stop-loss can arm mid-cycle. Recovery has a bounded independent
        // REST/READY wakeup, rather than waiting for another 5-minute discovery.
        // Starlight wake/poll/reconcile is independently scheduled. A slow
        // protection sweep must never be its only opportunity to execute.
      } catch (e) {
        fail += 1;
        await this.db.audit('error', 'fast_phase', { message: String(e?.message || e), loopIndex: index }).catch(() => {});
      }
      const spent = Date.now() - t;
      await waitUntil(Math.max(0, 450 - spent));
    }
    const cycles = timestamps.slice(1).map((x, i) => x - timestamps[i]);
    this.speed = {
      lastLoopMs: Date.now(),
      avgCycleMs: cycles.length ? Math.round(cycles.reduce((a, b) => a + b, 0) / cycles.length) : 0,
      maxCycleMs: cycles.length ? Math.max(...cycles) : 0,
      checksCompleted: timestamps.length,
      fetchFailures: fail,
      closedThisLoop: closed,
      mode: 'entryOnly',
      loopIndex: index,
    };
    await this.runPostExitResearchIfDue('fast_phase');
    await this.learning.trackStopGuardRecovery?.(this.market.quotes,this.settings,this.market).catch(async(error)=>{
      await this.db.audit('warning','stop_guard_recovery_tracking',{source:'fast_phase',message:String(error?.message||error)}).catch(()=>{});
    });
  }

  async cycleLoop() {
    while (this.running) {
      const cycleStart = Date.now();
      let complete = false;
      try {
        await this.fullScan();
        for (let i = 0; i < 3 && this.running; i += 1) await this.fastPhase(i);
        complete = true;
      } catch {
        this.cycleFailureCount += 1;
      }
      if (!this.running) break;
      if (!complete) {
        // A failed full scan retries quickly with bounded backoff instead of
        // sleeping out the entire 5-minute cadence. This is process recovery,
        // not a second concurrent scanner.
        const retryMs = Math.min(10_000 * Math.max(1, this.cycleFailureCount), 60_000);
        const until = Date.now() + retryMs;
        while (this.running && !this.scanRequested && Date.now() < until) await sleep(500);
      } else {
        while (this.running && !this.scanRequested && Date.now() - cycleStart < 300_000) await sleep(500);
      }
      this.scanRequested = false;
    }
  }

  quoteView(entry) {
    const q = this.market?.getQuote(entry.ticker);
    const age = q ? this.market.quoteAgeMs(entry.ticker) : Infinity;
    const status = String(q?.status || '').toLowerCase();
    const final = FINAL_STATUSES.has(status) && Boolean(q?.result);
    if (final) {
      return {
        q,
        priceCents: String(q.result).toLowerCase() === 'yes' ? 100 : 0,
        quoteAgeMs: age,
        dataState: 'FINALIZED',
      };
    }
    if (q && age <= DISPLAY_QUOTE_FRESH_MS && Number(q.yesBid) > 0 && !q.bookInvalid) {
      return { q, priceCents: Number(q.yesBid), quoteAgeMs: age, dataState: 'LIVE' };
    }
    const fallback = Number(entry.currentPriceCents) > 0 ? Number(entry.currentPriceCents) : Number(entry.entryPriceCents);
    const dataState = q?.result ? 'SETTLEMENT_PENDING' : q && Number(q.yesBid) <= 0 ? 'NO_BID' : 'STALE';
    return { q, priceCents: fallback, quoteAgeMs: age, dataState };
  }

  entryFeeRemaining(entry) {
    const original = Math.max(0, Number(entry.count || 0));
    const remaining = Math.max(0, Number(entry.remainingCount ?? original));
    const total = Number(entry.entryFeeCents || 0) > 0
      ? Number(entry.entryFeeCents)
      : Number(this.settings.simFeeCents || 0) * original;
    return original > 0 ? total * (remaining / original) : 0;
  }

  openUnrealized(entry, priceCents) {
    const remaining = Math.max(0, Number(entry.remainingCount ?? entry.count ?? 0));
    const exitFee = Number(this.settings.simFeeCents || 0) * remaining;
    return (Number(priceCents) - Number(entry.entryPriceCents)) * remaining - this.entryFeeRemaining(entry) - exitFee;
  }

  async snapshot() {
    const state = await this.performance();
    await this.db.insertSnapshot({
      systemName: state.reportingScope.systemName,
      createdAtMs: Date.now(),
      portfolioValueCents: state.portfolioValueCents,
      realizedPnlCents: state.hunterRealizedCents,
      unrealizedPnlCents: state.hunterUnrealizedCents,
      hunterRealizedPnlCents: state.hunterRealizedCents,
      hunterUnrealizedPnlCents: state.hunterUnrealizedCents,
      feederRealizedPnlCents: state.feederRealizedCents,
      feederUnrealizedPnlCents: state.feederUnrealizedCents,
      winRate: state.winRate,
      openCount: state.openHunters,
      closedCount: state.closedHunters,
      reportingVersion:state.reportingVersion,reportingScope:state.reportingScope,
      reportingDetail:{byAttack:state.byAttack,valuationComplete:state.valuationComplete,missingValuations:state.missingValuations,periodsComplete:state.periodsComplete},
    });
    this.lastSnapshotMs = Date.now();
  }

  async performance({ fullHistory=false, dashboard=false }={}) {
    const settings={...this.settings};let now=Date.now();
    let rows,openRows,closedRows,report,account,legacyClosedRows=[],conceptAggregate=null,snapshot=null;
    const marks=new Map();
    const getQuote=(ticker)=>{
      if(!marks.has(ticker)){const q=this.market?.getQuote?.(ticker)||this.market?.quotes?.get?.(ticker)||null;marks.set(ticker,q?{...q}:null);}
      return marks.get(ticker);
    };
    if(typeof this.db?.executionPerformanceSnapshot==='function'){
      snapshot=await this.db.executionPerformanceSnapshot(settings.systemName,{
        ownerId:settings.ownerId,mode:settings.mode,resetTimestampMs:settings.resetTimestampMs,
        limit:dashboard?OPERATOR_PLANE_ISOLATION.maximumClosedRows:150,simFeeCents:settings.simFeeCents});
      openRows=snapshot.openRows;closedRows=snapshot.closedRows;legacyClosedRows=snapshot.legacyClosedRows||[];now=Date.now();
      report=statisticsFromSnapshot(snapshot,settings,{getQuote,now});
      account=snapshot.account;
      if(typeof this.db.conceptStatsAggregate==='function')conceptAggregate=await this.db.conceptStatsAggregate(settings.systemName,{resetTimestampMs:settings.resetTimestampMs,mode:settings.mode});
      rows=fullHistory?(typeof this.db.tradingLogRows==='function'
        ?await this.db.tradingLogRows(settings.systemName,{limit:5000})
        :await this.db.entries(settings.systemName,{limit:5000})):[...openRows,...closedRows,...legacyClosedRows];
    }else{
      // Explicit in-memory/offline path only. A production snapshot failure
      // throws above; it is not turned into successful zero financial totals.
      rows=fullHistory&&typeof this.db.tradingLogRows==='function'
        ?await this.db.tradingLogRows(settings.systemName,{limit:5000})
        :await this.db.entries(settings.systemName,{limit:5000});
      openRows=rows.filter(e=>openLike(e.status)&&executionScopeMatches(e,settings,{ignoreReset:true}));
      closedRows=rows.filter(e=>lightningCapital(e)&&executionScopeMatches(e,settings)&&e.status==='closed'&&Number(e.count)>0);
      legacyClosedRows=rows.filter(e=>e.conceptName==='Crash Recovery Hunter'&&executionCapital(e)&&executionScopeMatches(e,settings)&&e.status==='closed'&&Number(e.count)>0);
      report=statisticsFromRows(rows,settings,{getQuote,now});
      const accountRows=rows.filter(e=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&!isShadowSaintEntry(e)&&executionScopeMatches(e,settings,{ignoreReset:true}));
      account={realized_cents:accountRows.reduce((a,e)=>a+Number(e.pnlCents||0),0),reserved_cents:accountRows.filter(e=>openLike(e.status)).reduce((a,e)=>a+Number(e.entryPriceCents||0)*Number(e.remainingCount||0)+(Number(e.count)>0?Number(e.entryFeeCents??Number(settings.simFeeCents||0)*Number(e.count))*Number(e.remainingCount||0)/Number(e.count):0),0)};
    }
    for(const e of openRows)e.reportValuation=executionValuation(e,getQuote(e.ticker),settings,now);
    // The same valuation snapshot is used by headline, cards and table rows.
    const marked=new Map(openRows.map(e=>[e.id,e]));
    rows=rows.map(e=>marked.get(e.id)||e);
    const open=openRows.filter(e=>lightningCapital(e)&&executionScopeMatches(e,settings)&&actualOpenExposure(e));
    const closed=closedRows.filter(e=>lightningCapital(e)&&executionScopeMatches(e,settings)&&e.status==='closed'&&Number(e.count)>0);
    const active=rows.filter(e=>!e.archived),c=report.byAttack['Lightning Plasma'];
    // Legacy losses remain real in account cash/reservations, never in Lightning performance.
    const legacyCapitalPerformance=report.byAttack['Crash Recovery Hunter'];
    const legacyClosed=legacyClosedRows.filter(e=>e.conceptName==='Crash Recovery Hunter'&&executionCapital(e)&&executionScopeMatches(e,settings)&&e.status==='closed'&&Number(e.count)>0);
    const simulationCashCents=settings.mode==='SIMULATION'
      ?Number(settings.startingCapitalCents||0)+Number(account?.realized_cents||0)-Number(account?.reserved_cents||0):null;
    const ghosts=openRows.filter(e=>FEEDER_CONCEPTS.has(e.conceptName));
    const feederUnrealized=ghosts.reduce((sum,e)=>{const v=this.quoteView(e),count=Number(e.count||0);return sum+(v.priceCents-e.entryPriceCents)*count-2*Number(settings.simFeeCents||2)*count;},0);
    const portfolioValueCents=settings.mode==='LIVE'?kalshiAccountSnapshot(this.balance)?.portfolioCents??null
      :simulationAccountValue(openRows,simulationCashCents,settings,{getQuote,now});
    return {entries:rows,active,hunters:[...open,...closed],closed,open,
      wins:c.wins,losses:c.losses,scratches:c.scratches,winRate:c.winRate,openHunters:c.open,closedHunters:c.closed,pendingHunters:c.pending,
      hunterRealizedCents:c.realizedCents,closedRealizedCents:c.closedRealizedCents,partialRealizedCents:c.partialRealizedCents,
      dayRealizedCents:c.dayRealizedCents,weekRealizedCents:c.weekRealizedCents,monthRealizedCents:c.monthRealizedCents,yearRealizedCents:c.yearRealizedCents,
      hunterUnrealizedCents:c.unrealizedCents,knownUnrealizedCents:c.knownUnrealizedCents,valuationComplete:c.valuationComplete,missingValuations:c.missingValuations,
      periodsComplete:c.periodsComplete,byAttack:report.byAttack,legacyCapitalPerformance,accountExecutionSummary:report.combined,reportingVersion:LIGHTNING_REPORT_VERSION,asOfMs:now,
      reportingScope:{systemName:settings.systemName,ownerId:settings.ownerId,mode:settings.mode,resetTimestampMs:Number(settings.resetTimestampMs||0),conceptName:'Lightning Plasma',executionClass:'CAPITAL'},
      feederRealizedCents:0,feederUnrealizedCents:feederUnrealized,portfolioValueCents,simulationCashCents,conceptAggregate,operationalHistory:!!snapshot,
      shadowSaints:rows.filter(isShadowSaintEntry),legacyClosedDashboardRows:legacyClosed.sort((a,b)=>Number(b.closedAtMs||0)-Number(a.closedAtMs||0)).slice(0,OPERATOR_PLANE_ISOLATION.maximumClosedRows),closedDashboardRows:closed.sort((a,b)=>Number(b.closedAtMs||0)-Number(a.closedAtMs||0)).slice(0,OPERATOR_PLANE_ISOLATION.maximumClosedRows)};
  }

  buildAuroraSummary(entries = []) {
    const protectedRows=(entries||[]).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&e?.entryConfig?.aurora?.version===AURORA_EXECUTION.version&&e.entryConfig.aurora.frozen===true);
    const exits=protectedRows.filter((e)=>e.status==='closed'&&['hard_stop_loss','aurora_covenant_fault'].includes(String(e.closeReason||'')));
    const active=protectedRows.filter((e)=>openLike(e.status));
    const avg=(rows,fn)=>rows.length?rows.reduce((sum,e)=>sum+Number(fn(e)||0),0)/rows.length:0;
    let avoided=0,forgone=0,observable=0,finalized=0,finalCapitalPreserved=0;
    for(const e of exits){
      const v=this.quoteView(e);
      if(!['LIVE','FINALIZED'].includes(v.dataState)||e.exitPriceCents==null)continue;
      const qty=Math.max(0,Number(e.count||0));
      const delta=(Number(e.exitPriceCents)-Number(v.priceCents))*qty;
      if(delta>0)avoided+=delta;else if(delta<0)forgone+=-delta;
      observable+=1;
      if(v.dataState==='FINALIZED'){finalized+=1;if(delta>0)finalCapitalPreserved+=delta;}
    }
    const recovered=exits.filter((e)=>Number(e.recoveryToGreenAtMs||0)>0).length;
    const recoveryObserved=exits.filter((e)=>e.researchTrackingComplete===true||Number(e.recoveryToGreenAtMs||0)>0).length;
    const bands={};
    for(const e of protectedRows){
      const band=String(e.entryConfig?.aurora?.entryBand||'unknown');
      const b=bands[band]||(bands[band]={protected:0,active:0,exits:0,realizedPnlCents:0,averageStopDistanceCents:0,_stopTotal:0});
      b.protected+=1;b._stopTotal+=Number(e.entryConfig.aurora.stopDistanceCents||0);
      if(openLike(e.status))b.active+=1;
      if(e.status==='closed'&&['hard_stop_loss','aurora_covenant_fault'].includes(String(e.closeReason||''))){b.exits+=1;b.realizedPnlCents+=Number(e.pnlCents||0);}
    }
    for(const b of Object.values(bands)){b.averageStopDistanceCents=b.protected?b._stopTotal/b.protected:0;delete b._stopTotal;}
    return {
      version:AURORA_EXECUTION.version,policyRevision:AURORA_EXECUTION.policyRevision,damageControlPercent:Number(this.settings.auroraDamageControlPercent??AURORA_EXECUTION.defaultDamageControlPercent),maximumEconomicLossRatio:Number(this.settings.auroraDamageControlPercent??AURORA_EXECUTION.defaultDamageControlPercent)/100,
      protectedHunters:protectedRows.length,activeAuroraPositions:active.length,auroraExits:exits.length,
      averageAuroraStopCents:avg(protectedRows,e=>e.entryConfig.aurora.stopDistanceCents),
      averageEconomicLossRatio:avg(protectedRows,e=>e.entryConfig.aurora.economicLossRatioAtDanger),
      realizedAuroraPnlCents:exits.reduce((sum,e)=>sum+Number(e.pnlCents||0),0),
      averageAuroraLossCents:exits.length?exits.reduce((sum,e)=>sum+Math.min(0,Number(e.pnlCents||0)),0)/exits.length:0,
      recoveredAfterAuroraExit:recovered,recoveryObserved,recoveryRate:recoveryObserved?recovered/recoveryObserved:null,
      falseStopEvidence:recovered,
      counterfactual:{label:'COUNTERFACTUAL',observableExits:observable,finalizedExits:finalized,capitalPreservedCents:finalCapitalPreserved,lossAvoidedCents:avoided,forgoneUpsideCents:forgone,netProtectionValueCents:avoided-forgone,basis:'post_exit_current_or_final_mark_vs_actual_exit_gross_contract_delta'},
      averageTimeToAuroraMs:avg(exits,e=>Math.max(0,Number(e.closedAtMs||0)-Number(e.openedAtMs||0))),entryBands:bands,
    };
  }

  buildInfinityBreakSummary(entries=[]){
    const rows=(entries||[]).filter(e=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&String(e?.entryConfig?.infinityBreak?.version||'')===INFINITY_BREAK.version);
    const closed=rows.filter(e=>e.status==='closed'&&e.closeReason==='infinity_break');
    const active=rows.filter(e=>openLike(e.status));
    const pnl=closed.reduce((sum,e)=>sum+Number(e.pnlCents||0),0);
    return{version:INFINITY_BREAK.version,policyRevision:INFINITY_BREAK.policyRevision,role:INFINITY_BREAK.role,authority:INFINITY_BREAK.authority,positionsObserved:rows.length,activePositions:active.length,breaksExecuted:closed.length,realizedPnlCents:pnl,averageProfitCents:closed.length?pnl/closed.length:0,averageTimeToBreakMs:closed.length?closed.reduce((sum,e)=>sum+Math.max(0,Number(e.closedAtMs||0)-Number(e.openedAtMs||0)),0)/closed.length:0,minimumNetPerOriginalContractCents:Number(this.settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents),requiredFreshConfirmations:Number(this.settings.infinityBreakRequiredConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations),maximumBookAgeMs:Number(this.settings.infinityBreakMaximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs),confirmationWindowMs:Number(this.settings.infinityBreakConfirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs),fullPositionOnly:true,lossAuthority:INFINITY_BREAK.lossAuthority};
  }

  resourcePressureForRss(rssBytes=0){
    const mib=Math.max(0,Number(rssBytes||0))/(1024*1024);
    if(mib>=RUNTIME_RESOURCE_GOVERNOR.hardResearchShedAtMiB)return 'HARD_RESEARCH_SHED';
    if(mib>=RUNTIME_RESOURCE_GOVERNOR.tradePriorityAtMiB)return 'TRADE_PRIORITY';
    if(mib>=RUNTIME_RESOURCE_GOVERNOR.pressureAtMiB)return 'PRESSURE';
    if(mib>=RUNTIME_RESOURCE_GOVERNOR.compactAtMiB)return 'COMPACT';
    return 'GREEN';
  }

  resourceProtectedCrashTickers(){
    return new Set([
      ...(this.market?.wanted||[]),...(this.protectedTickers||[]),...(this.recoveryPriorityTickers||[]),
      ...(this.crashPriorityTickers||[]),...(this.feederPriorityTickers||[]),
    ].filter(Boolean).map(String));
  }

  applyResourceGovernance({memory=null,force=false}={}){
    const mem=memory&&typeof memory==='object'?memory:process.memoryUsage();
    const rssBytes=Math.max(0,Number(mem.rss||0));
    const next=this.resourcePressureForRss(rssBytes);
    const prior=this.resourcePressureState||'GREEN';
    const at=Date.now(),transitioned=next!==prior;
    if(transitioned)this.resourceGovernorTransitions+=1;
    this.resourcePressureState=next;
    this.resourceResearchDeferred=['PRESSURE','TRADE_PRIORITY','HARD_RESEARCH_SHED'].includes(next);
    // RGM5 single-flight cadence: collectState() may sample resources between
    // the 5-second governor timer ticks. Sampling must not repeat the expensive
    // compaction/maintenance action inside the same cadence window.
    if(!force&&!transitioned&&Number(this.resourceGovernorLastActionAtMs||0)>0&&at-Number(this.resourceGovernorLastActionAtMs)<RUNTIME_RESOURCE_GOVERNOR.sampleIntervalMs){
      this.resourceGovernorLastResult={...(this.resourceGovernorLastResult||{}),pressureState:next,priorPressureState:prior,rssBytes,researchDeferred:this.resourceResearchDeferred,suppressedDuplicateAction:true,sampledAtMs:at};
      return this.resourceGovernorLastResult;
    }
    const crashLimit=RUNTIME_RESOURCE_GOVERNOR.crashStateLimits[next]||RUNTIME_RESOURCE_GOVERNOR.crashStateLimits.GREEN;
    const fsiLimit=RUNTIME_RESOURCE_GOVERNOR.fsiObservationLimits[next]||RUNTIME_RESOURCE_GOVERNOR.fsiObservationLimits.GREEN;
    const protectedTickers=this.resourceProtectedCrashTickers();
    const crash=this.learning?.compactForMemoryPressure?.({limit:crashLimit,protectedTickers})||null;
    let phoenix=null;
    if(this.phoenixCosmo){const limits={GREEN:1024,COMPACT:768,PRESSURE:512,TRADE_PRIORITY:256,HARD_RESEARCH_SHED:128};phoenix=this.phoenixCosmo.compact?.({maximumStates:limits[next]||512})||null;}
    let fsi=null;
    if(this.feederSignalIntel){
      if(next==='GREEN')this.feederSignalIntel.restoreNormalObservationLimit?.();
      fsi=this.feederSignalIntel.compactForMemoryPressure?.(fsiLimit)||null;
    }
    // MRM1 is non-authority housekeeping only: prune caches outside the current
    // wanted/protected universe, release orphaned recovery buffers, and perform
    // bounded invalid-book repair. It never discards wanted trading truth.
    let marketMaintenance=null;
    try{marketMaintenance=this.market?.maintenance?.({now:at,pressureState:next})||null;}catch(error){marketMaintenance={error:String(error?.message||error)};}
    if(this.resourceResearchDeferred){this.stateSnapshotCache=null;this.stateSnapshotAtMs=0;}
    this.learning?.retryProfitObservations?.();
    this.memoryTelemetry ||= new MemoryTelemetry();
    const sample=this.memoryTelemetry.sample({
      entryQueue:this.entryEvaluationQueue?.snapshot?.(),protectionQueue:this.quoteProtectionQueue?.snapshot?.(),
      starlight:{watches:this.starlightRecoveryWatches?.size||0,activeQuoteWorkers:this.starlightRecoveryQuoteJobs?.size||0,
        pendingQuoteWatches:this.starlightRecoveryPendingQuotes?.size||0,quoteOverflows:this.starlightRecoveryStats?.pendingQuoteOverflows||0},
      learning:this.learning?.resourceSnapshot?.(),database:this.db?.resourceSnapshot?.(),
      export:this.ledgerExportMemory||null,
      market:{quotes:this.market?.quotes?.size||0,books:this.market?.books?.size||0,histories:this.market?.histories?.size||0,wanted:this.market?.wanted?.size||0},
      protection:this.profitGuard?.resourceSnapshot?.(),
    });
    if(!this.memoryLastLogAtMs||at-this.memoryLastLogAtMs>=30000){
      this.memoryLastLogAtMs=at;console.log(JSON.stringify({event:'sag_memory_sample',...sample}));
    }
    this.resourceGovernorActions+=1;
    this.resourceGovernorLastActionAtMs=at;
    this.resourceGovernorLastResult={pressureState:next,priorPressureState:prior,rssBytes,crash,phoenix,fsi,marketMaintenance,researchDeferred:this.resourceResearchDeferred,protectedCrashTickers:protectedTickers.size,suppressedDuplicateAction:false,sampledAtMs:at};
    return this.resourceGovernorLastResult;
  }

  resourceUsageSnapshot() {
    const sampledAtNs=process.hrtime.bigint();
    const cpu=process.cpuUsage();
    const priorAtNs=typeof this.resourceSampleAtNs==='bigint'?this.resourceSampleAtNs:sampledAtNs;
    const priorCpu=this.resourceCpuUsage&&Number.isFinite(Number(this.resourceCpuUsage.user))&&Number.isFinite(Number(this.resourceCpuUsage.system))?this.resourceCpuUsage:cpu;
    const elapsedMicros=Math.max(0,Number(sampledAtNs-priorAtNs)/1000);
    const cpuMicros=Math.max(0,Number(cpu.user)-Number(priorCpu.user)+Number(cpu.system)-Number(priorCpu.system));
    const cpuPercent=elapsedMicros>0?Math.max(0,100*cpuMicros/elapsedMicros):0;
    this.resourceSampleAtNs=sampledAtNs;
    this.resourceCpuUsage=cpu;
    const memory=process.memoryUsage();
    const rssBytes=Math.max(0,Number(memory.rss||0));
    const MiB=1024*1024;
    const status=rssBytes>=RUNTIME_RESOURCE_GOVERNOR.criticalRssMiB*MiB?'HIGH':rssBytes>=RUNTIME_RESOURCE_GOVERNOR.warningRssMiB*MiB?'WATCH':'NORMAL';
    const pressureState=this.resourcePressureForRss(rssBytes);
    return {
      version:RUNTIME_RESOURCE_GOVERNOR.version,memoryRepairVersion:MEMORY_REPAIR_VERSION,memoryTelemetry:this.memoryTelemetry?.last||null,status,sampledAtMs:Date.now(),
      preferredRssCeilingMiB:RUNTIME_RESOURCE_GOVERNOR.preferredRssCeilingMiB,
      warningRssMiB:RUNTIME_RESOURCE_GOVERNOR.warningRssMiB,
      criticalRssMiB:RUNTIME_RESOURCE_GOVERNOR.criticalRssMiB,hardCeilingMiB:RUNTIME_RESOURCE_GOVERNOR.hardCeilingMiB,
      pressureState,resourceGovernorTransitions:Number(this.resourceGovernorTransitions||0),resourceGovernorActions:Number(this.resourceGovernorActions||0),resourceGovernorLastActionAtMs:Number(this.resourceGovernorLastActionAtMs||0),resourceGovernorLastResult:this.resourceGovernorLastResult,
      researchDeferred:this.resourceResearchDeferred===true,tradingAuthority:RUNTIME_RESOURCE_GOVERNOR.tradingAuthority,
      authority:'TELEMETRY_AND_NON_AUTHORITY_CACHE_GOVERNANCE',
      cpuPercent,uptimeSeconds:process.uptime(),pid:process.pid,
      memory:{rssBytes,heapUsedBytes:Number(memory.heapUsed||0),heapTotalBytes:Number(memory.heapTotal||0),externalBytes:Number(memory.external||0),arrayBuffersBytes:Number(memory.arrayBuffers||0)},
      operatorPlane:{...(this.operatorPlaneStats||{}),slowTelemetryTtlMs:OPERATOR_PLANE_ISOLATION.slowTelemetryTtlMs,targetStateBytes:OPERATOR_PLANE_ISOLATION.targetStateBytes,slowTelemetryAgeMs:this.operatorTelemetryAtMs?Math.max(0,Date.now()-this.operatorTelemetryAtMs):null},
      queues:{
        entry:this.entryEvaluationQueue?.snapshot?.()||{},
        protection:this.quoteProtectionQueue?.snapshot?.()||{},
        anotherDimension:this.anotherDimensionQueue?.snapshot?.()||{},
        justiceArrow:this.justiceArrowQueue?.snapshot?.()||{},
      },
      entryAdmission:this.entryAdmissionSnapshot?.()||{},
      workload:{version:DATABASE_PRESSURE_ISOLATION.version,entryAdmissionControl:ENTRY_ADMISSION_CONTROL.version,quoteProtectionScope:DATABASE_PRESSURE_ISOLATION.quoteProtectionScope,entryWorkers:ENTRY_EVALUATION_CONCURRENCY,protectionWorkers:QUOTE_PROTECTION_CONCURRENCY,ordinaryPoolReservedHeadroom:DATABASE_PRESSURE_ISOLATION.ordinaryPoolReservedHeadroom,lowPriorityPersistenceConcurrency:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceConcurrency,lowPriorityPersistenceMaximumPending:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceMaximumPending,lowPriorityPersistenceScope:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceScope,lowPriorityPersistenceMaximumBatchBytes:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceMaximumBatchBytes,fsiPersistenceRevision:DATABASE_PRESSURE_ISOLATION.fsiPersistenceRevision,fsiPersistenceBatchSize:DATABASE_PRESSURE_ISOLATION.fsiPersistenceBatchSize,referenceSignalSweepIntervalMs:REFERENCE_SIGNAL_SWEEP_MS,lastReferenceSweepMs:this.lastReferenceSweepMs||0,postExitResearchSweepIntervalMs:POST_EXIT_RESEARCH.sweepIntervalMs,postExitResearchMaximumRowsPerSweep:POST_EXIT_RESEARCH.maximumRowsPerSweep,lastPostExitResearchMs:this.lastPostExitResearchMs||0,stateCollectionSingleFlight:true,stateSnapshotTtlMs:STATE_SNAPSHOT_TTL_MS,stateDbFanoutMaximum:STATE_DB_FANOUT_MAX,stateCollectionCount:Number(this.stateCollectionCount||0),stateSnapshotAgeMs:this.stateSnapshotAtMs?Math.max(0,Date.now()-this.stateSnapshotAtMs):null},
      database:this.db?.resourceSnapshot?.()||{},
      market:this.market?.resourceSnapshot?.()||{},
      gameClock:this.gameClock?.resourceSnapshot?.()||{},
      feederSignalIntel:this.feederSignalIntel?.resourceSnapshot?.()||{},
      learning:this.learning?.resourceSnapshot?.()||{},
      strategy:this.strategy?.resourceSnapshot?.()||{},
      shadowAttack:{universe:'Gemini',activeCosmosTickers:Number(this.activeCosmosByTicker?.size||0),sourcePeaks:Number(this.anotherDimensionSourcePeaks?.size||0),anotherDimensionOpen:Number(this.anotherDimensionOpenByTicker?.size||0),anotherDimensionRecent:Number(this.anotherDimensionRecent?.size||0),anotherDimensionRuntime:Number(this.anotherDimensionRuntime?.size||0),openAttemptBookDedup:Number(this.geminiOpenAttemptBookMs?.size||0),maximumRecent:ANOTHER_DIMENSION.maximumRecentResults},
      profitGuard:this.profitGuard?.resourceSnapshot?.()||{},
    };
  }

  invalidateOperatorTelemetry() { this.operatorTelemetryAtMs=0; }

  async operatorTelemetrySnapshot({force=false}={}) {
    const now=Date.now();
    if(!force&&this.operatorTelemetryCache&&now-this.operatorTelemetryAtMs<=OPERATOR_PLANE_ISOLATION.slowTelemetryTtlMs)return this.operatorTelemetryCache;
    if(this.operatorTelemetryPromise)return this.operatorTelemetryPromise;
    const run=(async()=>{
      const jobs=[
        ()=>typeof this.db.trackerDashboardRows==='function'?this.db.trackerDashboardRows(this.settings.systemName,100):this.db.trackers(this.settings.systemName,100),
        ()=>typeof this.db.trackerSummary==='function'?this.db.trackerSummary(this.settings.systemName):null,
        ()=>this.db.recentAudit(OPERATOR_PLANE_ISOLATION.maximumAuditRows),
        ()=>this.db.recoveryTrackingCount(this.settings.systemName),
        ()=>typeof this.db.atomicThunderStats==='function'?this.db.atomicThunderStats(this.settings.systemName):{observedHunters:0,opportunitiesDetected:0,harvestsExecuted:0,invalidOpportunitiesBlocked:0,confirmationResets:0,realizedPnlCents:0,averageProfitCents:0,averageTimeToHarvestMs:0,lossesAvoided:0,avoidedLossCents:0,forgoneUpsideCents:0,researchComplete:0,recent:[]},
        ()=>typeof this.db.opportunitySummary==='function'?this.db.opportunitySummary(this.settings.systemName):{total:0,fire:0,watch:0,reject:0,expired:0,clean:0,toxicLate:0,falseBolt:0,expiredNoImpulse:0,complete:0},
      ];
      const [trackers,trackerAggregate,audit,recoveryTracking,atomicThunder,opportunitySummary]=await mapLimit(jobs,STATE_DB_FANOUT_MAX,(job)=>job());
      const value={trackers:trackers||[],trackerAggregate:trackerAggregate||null,audit:audit||[],recoveryTracking:Number(recoveryTracking||0),atomicThunder:atomicThunder||{},opportunitySummary:opportunitySummary||{}};
      this.operatorTelemetryCache=value;this.operatorTelemetryAtMs=Date.now();return value;
    })();
    this.operatorTelemetryPromise=run;
    try{return await run;}finally{if(this.operatorTelemetryPromise===run)this.operatorTelemetryPromise=null;}
  }

  recordOperatorPayload({bytes=0,serializeMs=0,sse=false}={}){
    const st=this.operatorPlaneStats||(this.operatorPlaneStats={version:OPERATOR_PLANE_ISOLATION.version,collections:0,lastCollectionMs:0,maxCollectionMs:0,averageCollectionMs:0,lastPayloadBytes:0,maxPayloadBytes:0,ssePushes:0,lastSsePushAtMs:0,lastSerializeMs:0,maxSerializeMs:0});
    st.lastPayloadBytes=Math.max(0,Number(bytes)||0);st.maxPayloadBytes=Math.max(Number(st.maxPayloadBytes||0),st.lastPayloadBytes);
    st.lastSerializeMs=Math.max(0,Number(serializeMs)||0);st.maxSerializeMs=Math.max(Number(st.maxSerializeMs||0),st.lastSerializeMs);
    if(sse){st.ssePushes=Number(st.ssePushes||0)+1;st.lastSsePushAtMs=Date.now();}
  }

  compactAthenaForDashboard(a={}){
    const d=a?.lastDecision&&typeof a.lastDecision==='object'?a.lastDecision:null;
    const top=d?.ranking?.[0]||null;
    const green=d?.fireCommand?.decisionEvidence?.greenTrigger||null;
    return {
      version:a.version||ATHENA_COMMANDER.version,policyRevision:a.policyRevision||null,loadedAtMs:Number(a.loadedAtMs||0)||null,
      memory:a.memory?{version:a.memory.version||null,memoryHash:a.memory.memoryHash||null,entryRows:Number(a.memory.entryRows||0),opportunityRows:Number(a.memory.opportunityRows||0),profitEpisodeRows:Number(a.memory.profitEpisodeRows||0),profileCount:Number(a.memory.profileCount||0),load:a.memory.load?{state:a.memory.load.state||null,lastError:a.memory.load.lastError||null}:null}:null,
      decisions:Number(a.decisions||0),fire:Number(a.fire||0),watch:Number(a.watch||0),reject:Number(a.reject||0),expired:Number(a.expired||0),survivalCertified:Number(a.survivalCertified||0),survivalRejected:Number(a.survivalRejected||0),
      lastDecision:d?{decision:d.decision||null,selectedAttack:d.selectedAttack||null,selectedAttackDisplay:d.selectedAttackDisplay||null,reason:d.reason||null,configuredTargetNetPerOriginalContractCents:d.configuredTargetNetPerOriginalContractCents??null,boltId:d.boltId||null,ranking:top?[{expectedNetPerOriginalContractCents:top.expectedNetPerOriginalContractCents??null,targetHitProbability:top.targetHitProbability??null}]:[],fireCommand:green?{decisionEvidence:{greenTrigger:{cosmo:green.cosmo||null,moveCents:green.moveCents??null}}}:null}:null,
      scarletNeedle:a.scarletNeedle?{version:a.scarletNeedle.version||null,armed:Number(a.scarletNeedle.armed||0),strategicAuthority:a.scarletNeedle.strategicAuthority===true}:null,
      arayashiki:a.arayashiki?{version:a.arayashiki.version||null,policyRevision:a.arayashiki.policyRevision||null,role:a.arayashiki.role||null}:null,
      soul:a.soul?{version:a.soul.version||null,policyRevision:a.soul.policyRevision||null,color:a.soul.color||null,openStories:Number(a.soul.openStories||0),ledger:a.soul.ledger||null}:null,
    };
  }

  compactDashboardEntry(e={}){
    const x=this.decorateEntry(e);const a=x.aurora||null;const v=x.virtualExecution||null;
    const profitAuthority=x.entryConfig?.profitAuthority||x.entryConfig?.infinityBreak?.version||null;
    return {
      executionClass:isShadowSaintEntry(x)?'SHADOW_SAINT':(x.executionClass||'LEGACY_UNCLASSIFIED'),
      id:x.id||null,systemName:x.systemName||null,ownerId:x.ownerId||null,archived:x.archived===true,ticker:x.ticker||null,eventTicker:x.eventTicker||null,marketTitle:x.marketTitle||'',conceptName:x.conceptName||'',executionAttackName:x.executionAttackName||x.conceptName||'',sourceFeeder:x.sourceFeeder||null,sourceTradeId:x.sourceTradeId||null,mode:x.mode||null,status:x.status||null,
      entryPriceCents:x.entryPriceCents??null,exitPriceCents:x.exitPriceCents??null,currentPriceCents:x.currentPriceCents??null,currentBidCents:x.currentBidCents??null,currentAskCents:x.currentAskCents??null,peakPriceCents:x.peakPriceCents??null,stopPriceCents:x.stopPriceCents??null,count:x.count??0,remainingCount:x.remainingCount??0,pnlCents:x.pnlCents??0,positionPnlCents:x.positionPnlCents??null,unrealizedCents:x.unrealizedCents??null,valuationComplete:x.valuationComplete!==false,valuationReason:x.valuationReason||null,positionExposureConfirmed:x.positionExposureConfirmed===true,
      lowestPriceAfterEntryCents:x.lowestPriceAfterEntryCents??null,maeCents:x.maeCents??null,maeAfterEntryMs:x.maeAfterEntryMs??null,recoveryToEntryMs:x.recoveryToEntryMs??null,recoveryToGreenMs:x.recoveryToGreenMs??null,closeReason:x.closeReason||null,openedAtMs:x.openedAtMs??null,closedAtMs:x.closedAtMs??null,updatedAtMs:x.updatedAtMs??null,dataState:x.dataState||null,quoteAgeMs:x.quoteAgeMs??null,gameMinutes:x.gameMinutes??null,liveStatus:x.liveStatus||null,
      aurora:a?{version:a.version||null,frozen:a.frozen===true,damageControlPercent:a.damageControlPercent??null,maximumEconomicLossRatio:a.maximumEconomicLossRatio??null,dangerPriceCents:a.dangerPriceCents??a.dangerLineCents??null,dangerLineCents:a.dangerLineCents??a.dangerPriceCents??null}:null,
      entryConfig:{executionClass:isShadowSaintEntry(x)?'SHADOW_SAINT':(x.executionClass||'LEGACY_UNCLASSIFIED'),profitAuthority,infinityBreak:x.entryConfig?.infinityBreak?{version:x.entryConfig.infinityBreak.version||null,minimumNetPerOriginalContractCents:x.entryConfig.infinityBreak.minimumNetPerOriginalContractCents??null}:null,virtualInfinity:x.entryConfig?.virtualInfinity?{requiredFreshConfirmations:x.entryConfig.virtualInfinity.requiredFreshConfirmations??null}:null},
      postExitCurrentPriceCents:x.postExitCurrentPriceCents??null,postExitDeltaFromExitCents:x.postExitDeltaFromExitCents??null,postExitBestPriceCents:x.postExitBestPriceCents??null,postExitBestDeltaCents:x.postExitBestDeltaCents??null,postExitMissedUpsideCents:x.postExitMissedUpsideCents??null,postExitWorstPriceCents:x.postExitWorstPriceCents??null,postExitWorstDeltaCents:x.postExitWorstDeltaCents??null,postExitLossAvoidedCents:x.postExitLossAvoidedCents??null,postExitResearchComplete:x.postExitResearchComplete===true,
      shadowPnlCents:x.shadowPnlCents??null,shadowMoveCents:x.shadowMoveCents??null,shadowState:x.shadowState||null,greenTriggerCents:x.greenTriggerCents??null,atomicThunderBoltId:x.atomicThunderBoltId||null,athenaSelectedAttack:x.athenaSelectedAttack||null,realEntryId:x.realEntryId||null,referencePnlCents:x.referencePnlCents??null,signalPriceCents:x.signalPriceCents??null,referenceOriginCents:x.referenceOriginCents??null,
      virtualExecution:v?{fullPositionExecutable:v.fullPositionExecutable===true,executableAverageBidCents:v.executableAverageBidCents??null,executableCount:v.executableCount??null,requiredCount:v.requiredCount??null,confirmations:v.confirmations??null,requiredConfirmations:v.requiredConfirmations??null,targetNetPerOriginalContractCents:v.targetNetPerOriginalContractCents??null,holdReason:v.holdReason||null,action:v.action||null}:null,
    };
  }

  invalidateStateSnapshot() { this.stateSnapshotAtMs=0; this.stateSnapshotCache=null; }

  async state({ force=false }={}) {
    const now=Date.now();
    if(!force&&this.stateSnapshotCache&&now-this.stateSnapshotAtMs<=STATE_SNAPSHOT_TTL_MS)return this.stateSnapshotCache;
    if(this.stateCollectionPromise)return this.stateCollectionPromise;
    const run=this.collectState().then((snapshot)=>{this.stateSnapshotCache=snapshot;this.stateSnapshotAtMs=Date.now();this.stateCollectionCount+=1;return snapshot;});
    this.stateCollectionPromise=run;
    try{return await run;}
    finally{if(this.stateCollectionPromise===run)this.stateCollectionPromise=null;}
  }

  async collectState() {
    const collectionStartedAt=Date.now();
    this.recomputeHealth();
    // R68 operator state is a compact display projection. Trading authority and
    // diagnostic fidelity stay on their own paths; dashboard polling may not
    // hydrate full JSON graphs from sag_entries.
    this.applyResourceGovernance();
    const p = await this.performance({dashboard:true});
    const shadowView=typeof this.db?.shadowDiagnostics==='function'
      ? await this.shadowDiagnostics({limit:60}).catch(error=>({rows:[],summary:null,error:String(error?.message||error),worker:this.shadowSaintStats||null}))
      : {rows:p.shadowSaints||[],summary:null,worker:this.shadowSaintStats||null};
    const legacyRealExposure=typeof this.db?.legacyRealOpenEntries==='function'
      ? await this.db.legacyRealOpenEntries(this.settings.systemName,{ownerId:this.settings.ownerId,mode:this.settings.mode,resetTimestampMs:this.settings.resetTimestampMs})
      : (p.entries||[]).filter(e=>PORTFOLIO_CONCEPTS.has(e.conceptName)
        &&(e.conceptName!=='Lightning Plasma'||e.mode!==this.settings.mode||Number(e.openedAtMs)<Number(this.settings.resetTimestampMs||0))
        &&String(e.systemName)===String(this.settings.systemName)&&String(e.ownerId)===String(this.settings.ownerId)
        &&!e.archived&&!isShadowSaintEntry(e)&&openLike(e.status));
    const entries = p.active;
    // HF5: state is observability, never trading authority. Collect its DB
    // sections with a small fan-out instead of consuming all eight ordinary
    // PostgreSQL clients at once every SSE tick.
    // R54 operational state is intentionally small. Historical/research tables
    // are loaded only by an explicit diagnostics request, never every SSE tick.
    const operatorTelemetry=await this.operatorTelemetrySnapshot();
    const {trackers,trackerAggregate,audit,recoveryTracking,atomicThunder,opportunitySummary}=operatorTelemetry;
    const patterns=[],sports=[],snapshots=[],crashEpisodes=[];
    const crashLearningFull = this.learning?.crashLearningSummary?.() || { version:'CI1', states:[], totalEpisodes:0, multipleCrashMarkets:0 };
    const {states:_operatorCrashStates,...crashLearning}=crashLearningFull;
    const profitLearning = this.learning?.profitLearningSummary?.() || { version:PROFIT_LEARNING_INTELLIGENCE.version, tracked:0, complete:0, postExitTracking:0, active:0 };
    const stopGuardRecoveryLearning = await this.learning?.stopGuardRecoverySummary?.().catch(()=>null) || { version:STOP_GUARD_RECOVERY_LEARNING.version, tracked:0, complete:0, recovered:0, decisionEvidenceMode:STOP_GUARD_RECOVERY_LEARNING.decisionEvidenceMode };
    const athenaFull = this.athena?.summary?.() || { version:ATHENA_BRAIN.version, ready:false, adaptiveMode:ATHENA_BRAIN.adaptiveMode, adaptiveDecisionWeight:0 };
    const athena = this.compactAthenaForDashboard(athenaFull);
    const entryPipelineFull = this.strategy?.entryPipelineSummary?.() || { version:'EPT1', attempts:0, opened:0, blocked:0, byStage:{}, byReason:{}, recent:[] };
    const entryPipeline={...entryPipelineFull,recent:Array.isArray(entryPipelineFull.recent)?entryPipelineFull.recent.slice(0,10):[]};
    const entryCandidateFunnelFull=this.entryCandidateFunnelSummary();
    const entryCandidateFunnel={...entryCandidateFunnelFull,recent:Array.isArray(entryCandidateFunnelFull.recent)?entryCandidateFunnelFull.recent.slice(0,10):[]};
    // R51: Cosmos strengthens Athena intelligence but is never a prerequisite
    // for a Bolt or for an Athena-authorized initial Attack.
    const initialExposureEnabled = [
      this.settings.momentumHunterEnabled === true ? 'Momentum Hunter' : null,
      this.settings.waveSurferEnabled === true ? 'Wave Surfer' : null,
      this.settings.crashRecoveryHunterEnabled === true ? 'Crash Recovery Hunter' : null,
      this.settings.recoveryHunterEnabled === true ? 'Recovery Hunter' : null,
      this.settings.justiceArrowEnabled === true ? 'Sagittarius Justice Arrow' : null,
      this.settings.athenaExclamationEnabled === true ? 'Athena Exclamation' : null,
      this.settings.scarletNeedleEnabled === true ? 'Scarlet Needle' : null,
      this.settings.lightningPlasmaEnabled === true ? 'Lightning Plasma' : null,
    ].filter(Boolean);
    const executionGate = this.entryExecutionGate();
    const referenceGate = this.referenceSignalGate();
    const entryPathWarnings = [];
    const enabledGoldSaints=[
      this.settings.waveSurferEnabled===true?'Wave Surfer':null,
      this.settings.crashRecoveryHunterEnabled===true?'Crash Recovery Hunter':null,
      this.settings.recoveryHunterEnabled===true?'Recovery Hunter':null,
      this.settings.momentumHunterEnabled===true?'Momentum Hunter':null,
      this.settings.lightningPlasmaEnabled===true?'Lightning Plasma':null,
      this.settings.scarletNeedleEnabled===true?'Scarlet Needle':null,
    ].filter(Boolean);
    if (this.settings.galacticExplosionEnabled===true) entryPathWarnings.push('Galactic Explosion ON: first valid door opens the ticker, then every enabled Attack whose own band and confirmation card pass may join that exact ticker');
    if (!initialExposureEnabled.length) entryPathWarnings.push('No currently enabled configuration can create an initial real Hunter exposure');
    if (referenceGate.allowed && !executionGate.allowed) entryPathWarnings.push(`Real Hunter execution blocked by ${executionGate.reason}; reference feeders remain active`);
    const entryPathConfiguration = {
      version:'APS2-ENTRY-PATH',capitalAttack:'Lightning Plasma',virtualRecoveryAttack:'Crash Recovery Hunter', authorityChain:'GAME_CLOCK->COSMO_SHADOW->COSMO_GREEN->ATOMIC_THUNDER_BOLT->ATHENA->ATTACK->INFINITY_BREAK/AURORA + CRYSTAL_WALL_INFINITY_WIN->SCARLET_NEEDLE->HARD_SAFETY->OWN_INFINITY_BREAK/AURORA + CI1_CRASH->SAGITTARIUS_JUSTICE_ARROW->TROUGH->REBOUND->HARD_SAFETY->ATHENA_X1/AURORA + ANOTHER_DIMENSION_AURORA->LIGHTNING_PLASMA->REBOUND->HARD_SAFETY->INFINITY_BREAK/AURORA + CI1_CRASH->CRYSTAL_WALL->TROUGH->REBOUND->HARD_SAFETY->INFINITY_BREAK/AURORA', noBoltNoAttack:true, noBoltNoAttackExceptions:['SAGITTARIUS_JUSTICE_ARROW_V2_CRASH_RECOVERY_AUTHORITY','CRYSTAL_WALL_V3_CRASH_RECOVERY_AUTHORITY','CI1_WALL_CLONE_CRASH_RECOVERY_AUTHORITY'], cosmoGreenRequired:true, initialExposureEnabled, scarletNeedleContinuationEnabled:false, geminiEnabled:this.settings.geminiEnabled===true, anotherDimensionAttackEnabled:this.settings.geminiEnabled===true, justiceArrowIndependentEnabled:this.settings.justiceArrowEnabled===true, justiceArrowContinuationEnabled:false, crystalWallIndependentEnabled:this.settings.recoveryHunterEnabled===true, crystalWallContinuationEnabled:false, lightningPlasmaContinuationEnabled:this.settings.lightningPlasmaEnabled===true, lightningPlasmaLegacyFollowOnEnabled:false, lightningPlasmaProfitContinuation:{version:LP_CONTINUATION_VERSION,authority:'VERIFIED_VIRTUAL_STARLIGHT_OPEN_OR_CONFIRMED_CLOSED_PROFIT',reference:'ORIGINAL_STARLIGHT_ENTRY',lossPolicy:'PERMANENT_PARENT_REVOCATION'}, recoveryFollowOnEnabled:false, warnings:entryPathWarnings,
      entryModeIsolation:'EMI1', referenceSignalEvaluationActive:referenceGate.allowed,
      realHunterExecutionAuthorized:executionGate.allowed, executionGateReason:executionGate.reason,
    };
    const conceptStats = p.conceptAggregate ? this.buildConceptStatsFromAggregate(p.conceptAggregate) : this.buildConceptStats(entries);
    for(const name of ['Lightning Plasma']){
      const a=p.byAttack?.[name];if(!a)continue;
      const target=Array.isArray(conceptStats)?conceptStats.find(x=>x.concept===name||x.conceptName===name||x.name===name):conceptStats[name];
      if(target)Object.assign(target,{total:a.total,open:a.open,closed:a.closed,wins:a.wins,losses:a.losses,winRate:a.winRate,pnlCents:a.realizedCents,
        realizedCents:a.realizedCents,unrealizedCents:a.unrealizedCents,avgEntryCents:a.avgEntryCents,periodsComplete:a.periodsComplete,
        dayRealizedCents:a.dayRealizedCents,weekRealizedCents:a.weekRealizedCents,monthRealizedCents:a.monthRealizedCents,yearRealizedCents:a.yearRealizedCents});
    }
    for(const [name,a] of Object.entries(shadowView.summary?.byConcept||{})){
      // Lightning's card is financial; its ordinary shadow candidates remain
      // in virtual history. Every other Saint card is explicitly virtual.
      if(name==='Lightning Plasma')continue;
      const target=Array.isArray(conceptStats)?conceptStats.find(x=>x.name===name||x.conceptName===name):conceptStats[name];
      if(target)Object.assign(target,a);
    }
    const financialRows=entries.filter(e=>lightningCapital(e)&&executionScopeMatches(e,p.reportingScope));
    const auroraExecution = {...this.buildAuroraSummary(financialRows),reportingScope:p.reportingScope,coverage:'retained_lightning_rows_not_full_history'};
    const infinityBreak = {...this.buildInfinityBreakSummary(financialRows),reportingScope:p.reportingScope,coverage:'retained_lightning_rows_not_full_history'};
    const atomicThunderBolt={...this.atomicThunderBolt?.summary?.(),episodes:opportunitySummary};
    // Main positions are Lightning only. All genuine legacy positions remain
    // protected and visible in their separate risk/history sections.
    const openHunters = financialRows.filter(e=>openLike(e.status)).map(e=>this.compactDashboardEntry(e));
    // R60: the real Attack is the durable forward authority for Cosmos -> Bolt -> FIRE
    // lineage. Reconstruct the reverse dashboard link from sourceTradeId so an
    // interrupted best-effort shadow-row back-link can never hide causality after
    // restart. The newest linked Attack wins when historical rows share a source.
    const realEntryByShadowId = new Map();
    for (const hunter of [...(p.hunters || [])].sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0))) {
      const sourceId=String(hunter?.sourceTradeId||'');
      if (!sourceId || !PORTFOLIO_CONCEPTS.has(hunter?.conceptName)) continue;
      realEntryByShadowId.set(sourceId,hunter);
    }
    const openFeeders = entries.filter((e) => ACTIVE_FEEDER_CONCEPTS.has(e.conceptName) && openLike(e.status)).map((e) => {
      const decorated=this.compactDashboardEntry(e);
      const linked=realEntryByShadowId.get(String(e.id));
      if (!linked) return decorated;
      return {
        ...decorated,
        athenaSelectedAttack:decorated.athenaSelectedAttack||linked.conceptName||null,
        realEntryId:decorated.realEntryId||linked.id||null,
      };
    });
    const anotherDimensionRows=[...this.anotherDimensionRecent.values()]
      .filter((e)=>!e.archived)
      .sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0))
      .slice(0,ANOTHER_DIMENSION.maximumRecentResults)
      .map((e)=>{
        const decorated=this.compactDashboardEntry(e);
        const linked=realEntryByShadowId.get(String(e.id));
        return linked?{...decorated,athenaSelectedAttack:'Sagittarius Justice Arrow',realEntryId:linked.id||null}:decorated;
      });
    const cosmoShadowTrades=[...openFeeders]
      .sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0));
    const geminiTrades=[...anotherDimensionRows];
    // Gemini board statistics are reconstructed from the durable virtual-trade
    // rows rather than process-local counters. A Railway restart therefore
    // cannot make the Gemini table show trades while its W/L/P&L header resets
    // to zero. The table is intentionally capped to the same bounded recent
    // cohort as the rows rendered below.
    const geminiClosed=geminiTrades.filter((e)=>e.status==='closed');
    const geminiSummary={
      version:GEMINI_UNIVERSE.version,policyRevision:GEMINI_UNIVERSE.policyRevision,name:'Gemini',enabled:this.settings.geminiEnabled===true,
      referenceStakeCents:Number(this.settings.geminiReferenceStakeCents||0),minPriceCents:Number(this.settings.geminiMinPriceCents||0),maxPriceCents:Number(this.settings.geminiMaxPriceCents||0),
      brokerOrderAuthority:false,portfolioCapitalAuthority:false,simulationPortfolioCapitalAuthority:false,attack:'Another Dimension',
      total:geminiTrades.length,open:geminiTrades.filter((e)=>openLike(e.status)).length,closed:geminiClosed.length,
      wins:geminiClosed.filter((e)=>Number(e.pnlCents||0)>0).length,losses:geminiClosed.filter((e)=>Number(e.pnlCents||0)<0).length,pnlCents:geminiClosed.reduce((sum,e)=>sum+Number(e.pnlCents||0),0),
      avgEntryCents:geminiTrades.length?geminiTrades.reduce((sum,e)=>sum+Number(e.entryPriceCents||0),0)/geminiTrades.length:0,
      avgCurrentCents:geminiTrades.length?geminiTrades.reduce((sum,e)=>sum+Number(e.currentPriceCents||e.exitPriceCents||e.entryPriceCents||0),0)/geminiTrades.length:0,
    };
    const closedHunters = (p.closedDashboardRows||p.closed).map((e) => this.compactDashboardEntry(e));
    const legacyClosedHunters=(p.legacyClosedDashboardRows||[]).map(e=>this.compactDashboardEntry(e));
    const scanned = this.lastScanMarkets.slice(0, 100);
    const trackerSummary = trackerAggregate || {
      tracked: trackers.length,
      hot: trackers.filter((t) => t.phase === 'hot').length,
      aboutToEnter: trackers.filter((t) => t.phase === 'about_to_enter').length,
      entered: trackers.filter((t) => t.phase === 'entered').length,
      recovery: trackers.filter((t) => t.phase === 'recovery').length,
    };
    const feederSummary = p.conceptAggregate ? this.buildFeederSummaryFromAggregate(p.conceptAggregate) : (()=>{
      const fedHunters=p.hunters.filter((e)=>e.sourceFeeder&&ACTIVE_FEEDER_CONCEPTS.has(e.sourceFeeder));
      const fedClosed=fedHunters.filter((e)=>e.status==='closed'),fedWins=fedClosed.filter((e)=>e.pnlCents>0).length,fedLosses=fedClosed.filter((e)=>e.pnlCents<0).length;
      return{hunters:fedHunters.length,wins:fedWins,losses:fedLosses,scratches:fedClosed.filter((e)=>e.pnlCents===0).length,pnlCents:fedClosed.reduce((sum,e)=>sum+e.pnlCents,0),winRate:fedClosed.length?fedWins/fedClosed.length:0};
    })();
    const resourceUsage=this.resourceUsageSnapshot();
    // An asynchronous read may overlap a mode/reset/owner change. Do not label
    // an old cohort's money with the new settings; the next poll retries.
    if(['systemName','ownerId','mode'].some(k=>String(p.reportingScope[k])!==String(this.settings[k]))
      ||Number(p.reportingScope.resetTimestampMs)!==Number(this.settings.resetTimestampMs||0))
      throw new Error('dashboard_scope_changed_during_collection');
    const state={
      release:RELEASE,build:BUILD_INFO,
      settings: { ...this.settings, allowLiveTrading: env.allowLiveTrading, liveReady: this.isLiveReady() },
      athenaExclamation:this.strategy?.athenaExclamation?.summary?.()||null,
      riskControls: {
        resetSafetyVersion:'R60-HF1-SIMULATION-MUTATION-EPOCH-DRAIN',
        simulationResetInProgress:Boolean(this.simulationResetPromise||this.simulationMutationGate?.blocked),
        simulationMutationGate:this.simulationMutationGate?.snapshot?.()||null,
        intelligenceHydration:{...(this.intelligenceHydration||{}),tradingBlocked:false},
        athenaHistoricalMemoryLoad:{...(this.athenaCommander?.memoryLoad||{}),entryAuthorityBlockedUntilLoaded:false},
        historicalIntelligenceBlocksTrading:false,
        settingsPersistence:{...(this.settingsPersistence||{version:'SETTINGS-PERSISTENCE-R1',lastVerifiedAtMs:0,lastKeys:[],lastValues:{},lastError:null})},
        brokerOwnershipReconciliation:BROKER_OWNERSHIP_RECONCILIATION.version,
        brokerOwnershipReconciliationPolicyRevision:BROKER_OWNERSHIP_RECONCILIATION.policyRevision,
        brokerOwnershipReconciliationRole:BROKER_OWNERSHIP_RECONCILIATION.role,
        singleRealHunterPerExactTicker: this.settings.galacticExplosionEnabled !== true,
        exactTickerLockScope: this.settings.galacticExplosionEnabled === true ? GALACTIC_EXPLOSION.enabledLockScope : GALACTIC_EXPLOSION.disabledLockScope,
        galacticExplosion: GALACTIC_EXPLOSION.version,
        galacticExplosionEnabled: this.settings.galacticExplosionEnabled === true,
        galacticExplosionSameAttackDuplicatesAllowed: GALACTIC_EXPLOSION.sameAttackDuplicatesAllowed,
        feederSignalsExempt: true,
        entryModeIsolation: 'EMI1',
        entryCandidateFunnelTelemetry:ENTRY_CANDIDATE_FUNNEL.version,
        entryDecisionDeduplication:'BOLT_STATE_FINGERPRINT_V1',
        referenceFeederEvaluationRequiresLiveReady: false,
        realHunterExecutionRequiresLiveReadyInLiveMode: true,
        freshInstallMode: 'SIMULATION',
        gameClockAuthority: GAME_CLOCK_AUTHORITY.version,
        gameClockPolicyRevision: GAME_CLOCK_AUTHORITY.policyRevision,
        gameClockActivityOnlyAuthorization: false,
        gameClockStrongSources: ['kalshi_live_data', 'kalshi_game_stats'],
        gameClockMilestoneDiscovery: ['related_event_ticker', 'events_with_milestones_exact_primary_or_related'],
        gameClockUnknownCandidateForceFreshBeforeClockGate: true,
        gameClockFallback: 'occurrence_passed_plus_broad_live_or_pbp_current_official_window',
        gameClockPersistenceScope: 'event_ticker',
        gameClockFreshEntryAuthorizationRequired: true,
        gameClockEntryAuthorizationMaxAgeMs: GAME_CLOCK_AUTHORITY.entryAuthorizationMaxAgeMs,
        gameClockObservedActivityFallback: 'LIVE_SIM_SHARED',
        gameClockObservedActivityLiveAuthority: true,
        gameClockObservedActivityMaximumGapMs: GAME_CLOCK_AUTHORITY.observedActivityMaxGapMs,
        gameClockMilestoneSeriesBulkCacheMs: GAME_CLOCK_AUTHORITY.seriesMilestoneCacheMs,
        gameClockMilestoneForceRefreshMinIntervalMs: GAME_CLOCK_AUTHORITY.milestoneForceRefreshMinIntervalMs,
        gameClockExactActiveMarketRevalidation: true,
        gameClockFallbackFreshTradeEvidenceRequired: true,
        gameClockPbpEntryAuthorization: 'requires_fresh_exact_trade_plus_current_official_window',
        entryAdmissionControl: ENTRY_ADMISSION_CONTROL.version,
        entryAdmissionRole: ENTRY_ADMISSION_CONTROL.role,
        entryAdmissionUnknownProbeIntervalMs: ENTRY_ADMISSION_CONTROL.unknownProbeIntervalMs,
        entryAdmissionPrequeueMinimumGameTimeGate: true,
        entryAdmissionPrequeueMaximumGameTimeGate: true,
        entryAdmissionImmediateGreenFeasibilityGate: true,
        entryAdmissionPreBoltExecutionMarginMs: ENTRY_ADMISSION_CONTROL.preBoltExecutionMarginMs,
        entryAdmissionPostBoltFreshClockGate: true,
        postFireStrategicCooldownVeto: false,
        entryTimeWindow:'ETW1',
        minimumGameMinutes:Number(this.settings.minGameMinutes||0),
        maximumGameMinutes:Number(this.settings.maxGameMinutes||0),
        ultimateStopGuard: ULTIMATE_STOP_GUARD.version,
        stopLossWatchdog: STOP_LOSS_WATCHDOG.version,
        stopLossWatchdogRole: 'observation_classifier_above_aurora_then_usg1_advisor_after_verified_touch',
        stopLossWatchdogPolicyRevision: STOP_LOSS_WATCHDOG.policyRevision,
        stopLossWatchdogStakeNormalized: STOP_LOSS_WATCHDOG.stakeNormalized,
        stopLossWatchdogStakeBasis: STOP_LOSS_WATCHDOG.stakeBasis,
        stopLossWatchdogReferenceStakeCents: STOP_LOSS_WATCHDOG.referenceStakeCents,
        stopLossWatchdogWakeLossRatio: STOP_LOSS_WATCHDOG.wakeLossRatio,
        stopLossWatchdogResetLossRatio: STOP_LOSS_WATCHDOG.resetLossRatio,
        stopLossWatchdogSevereLossRatio: STOP_LOSS_WATCHDOG.severeLossRatio,
        stopLossWatchdogCatastrophicLossRatio: STOP_LOSS_WATCHDOG.catastrophicLossRatio,
        stopLossWatchdogReferenceWakeLossCents: STOP_LOSS_WATCHDOG.wakeLossCents,
        stopLossWatchdogReferenceResetLossCents: STOP_LOSS_WATCHDOG.resetLossCents,
        stopLossWatchdogReferenceSevereLossCents: STOP_LOSS_WATCHDOG.severeLossCents,
        stopLossWatchdogMaximumBookAgeMs: STOP_LOSS_WATCHDOG.maximumBookAgeMs,
        stopLossWatchdogMaximumFutureBookSkewMs: STOP_LOSS_WATCHDOG.maximumFutureBookSkewMs,
        stopLossWatchdogMinimumLearningObservations: STOP_LOSS_WATCHDOG.minimumLearningObservations,
        stopLossWatchdogLossAuthority: ULTIMATE_STOP_GUARD.version,
        stopLossWatchdogWeakHistoryGraceMs: STOP_LOSS_WATCHDOG.weakHistoryGraceMs,
        stopLossWatchdogMinimumLiveOverrideAgeMs: STOP_LOSS_WATCHDOG.minimumLiveOverrideAgeMs,
        stopLossWatchdogStrongHistorySevereGraceMs: STOP_LOSS_WATCHDOG.strongHistorySevereGraceMs,
        stopLossWatchdogSevereStallMs: STOP_LOSS_WATCHDOG.severeStallMs,
        stopLossWatchdogReferenceCatastrophicLossCents: STOP_LOSS_WATCHDOG.catastrophicLossCents,
        stopLossWatchdogCatastrophicStallMs: STOP_LOSS_WATCHDOG.catastrophicStallMs,
        authorityChain:'GAME_CLOCK->COSMO_SHADOW->COSMO_GREEN->ATOMIC_THUNDER_BOLT->ATHENA->EXECUTION_ATTACK->INFINITY_BREAK/AURORA',
        noBoltNoAttack:true,
        atomicThunderBolt:ATOMIC_THUNDER_BOLT.version,
        atomicThunderBoltAuthority:ATOMIC_THUNDER_BOLT.authority,
        atomicThunderPatternGuardian:ATOMIC_THUNDER_PATTERN_GUARDIAN.version,
        atomicThunderPatternGuardianPolicyRevision:ATOMIC_THUNDER_PATTERN_GUARDIAN.policyRevision,
        atomicThunderPatternGuardianAuthority:'RESEARCH_ONLY',
        atomicThunderGreenTriggerCents:Number(this.settings.atomicThunderGreenTriggerCents??COSMO_SHADOW_TRADING.defaultGreenTriggerCents),
        cosmoShadowTrading:COSMO_SHADOW_TRADING.version,
        cosmoGreenPriceBasis:COSMO_SHADOW_TRADING.greenPriceBasis,
        athenaCommander:ATHENA_COMMANDER.version,
        athenaCommanderAuthority:ATHENA_COMMANDER.authority,
        athenaCommanderRole:ATHENA_COMMANDER.role,
        athenaEconomicObjective:ATHENA_COMMANDER.economicObjective,
        athenaTargetAwareAttackSelection:ATHENA_COMMANDER.targetAwareAttackSelection,
        athenaForcedAttackDiversification:ATHENA_COMMANDER.forcedAttackDiversification,
        athenaMatureNegativeExpectedValueMayFire:ATHENA_COMMANDER.matureNegativeExpectedValueMayFire,
        arayashiki:ARAYASHIKI.version,
        arayashikiPolicyRevision:ARAYASHIKI.policyRevision,
        arayashikiRole:ARAYASHIKI.role,
        arayashikiStrategicAuthority:false,
        arayashikiNoEvidencePolicy:ARAYASHIKI.noEvidencePolicy,
        arayashikiCertificateTtlMs:ARAYASHIKI.certificateTtlMs,
        arayashikiRegimeContinuityRequired:ARAYASHIKI.regimeContinuityRequired,
        arayashikiPostFirePredictiveVeto:ARAYASHIKI.postFirePredictiveVeto,
        attackDoctrineRevalidationRequired:false,
        normalAttackExecutionOnlyAfterAthenaFire:true,
        scarletNeedleStrategicAuthorityException:true,
        gemini:GEMINI_UNIVERSE.version,
        geminiPolicyRevision:GEMINI_UNIVERSE.policyRevision,
        geminiEnabled:this.settings.geminiEnabled===true,
        geminiEntryBand:[Number(this.settings.geminiMinPriceCents),Number(this.settings.geminiMaxPriceCents)],
        geminiReferenceStakeCents:Number(this.settings.geminiReferenceStakeCents),
        geminiBrokerOrderAuthority:false,
        geminiPortfolioCapitalAuthority:false,
        geminiSimulationPortfolioCapitalAuthority:false,
        anotherDimension:ANOTHER_DIMENSION.version,
        anotherDimensionPolicyRevision:ANOTHER_DIMENSION.policyRevision,
        anotherDimensionShadowOnly:true,
        anotherDimensionBrokerOrderAuthority:false,
        anotherDimensionPortfolioCapitalAuthority:false,
        anotherDimensionSimulationPortfolioCapitalAuthority:false,
        anotherDimensionMinimumNetPerOriginalContractCents:Number(ANOTHER_DIMENSION.minimumNetPerOriginalContractCents),
        anotherDimensionRuntime:{...(this.anotherDimensionStats||{}),active:Number(this.anotherDimensionOpenByTicker?.size||0),recent:Number(this.anotherDimensionRecent?.size||0),queue:this.anotherDimensionQueue?.snapshot?.()||{}},
        justiceArrow:SAGITTARIUS_JUSTICE_ARROW.version,
        justiceArrowPolicyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,
        justiceArrowTrigger:SAGITTARIUS_JUSTICE_ARROW.trigger,
        justiceArrowTriggerSources:[...SAGITTARIUS_JUSTICE_ARROW.triggerSources],
        justiceArrowIndependentAuthority:true,
        justiceArrowAthenaEntryAuthority:false,
        justiceArrowMinimumCrashCents:Number(this.settings.justiceArrowMinCrashCents),
        justiceArrowMinimumReboundCents:Number(this.settings.justiceArrowMinReboundCents),
        justiceArrowMinimumUpwardTicks:Number(this.settings.justiceArrowMinUpwardTicks),
        justiceArrowFixedStakeCents:Number(this.settings.justiceArrowStakeCents),
        justiceArrowStakeMultiplierAllowed:false,
        justiceArrowGameClockExempt:true,
        justiceArrowEventCapOverlayExempt:true,
        justiceArrowFullConfiguredSizeRequired:true,
        justiceArrowOneEntryPerCrashEpisode:true,
        justiceArrowProfitAuthority:ATHENA_EXIT_INTELLIGENCE.version,
        justiceArrowLossAuthority:AURORA_EXECUTION.version,
        justiceArrowRuntime:{...(this.justiceArrowStats||{}),activeWatches:this.justiceArrowWatches?.size||0,queue:this.justiceArrowQueue?.snapshot?.()||null},
        infinityBreak:INFINITY_BREAK.version,
        infinityBreakAuthority:INFINITY_BREAK.authority,
        infinityBreakMinimumNetPerOriginalContractCents:Number(this.settings.infinityBreakMinNetPerOriginalContractCents ?? INFINITY_BREAK.minimumNetPerOriginalContractCents),
        infinityBreakRequiredFreshConfirmations:Number(this.settings.infinityBreakRequiredConfirmations ?? INFINITY_BREAK.requiredFreshConfirmations),
        infinityBreakMaximumBookAgeMs:Number(this.settings.infinityBreakMaximumBookAgeMs ?? INFINITY_BREAK.maximumBookAgeMs),
        infinityBreakConfirmationWindowMs:Number(this.settings.infinityBreakConfirmationWindowMs ?? INFINITY_BREAK.confirmationWindowMs),
        noPostEntryTimeBasedForcedExit:true,
        legacyAtomicThunderCompatibilityOnly:true,
        stopDoctrine: 'AURORA_VERIFIED_FROZEN_DANGER_GATE_PLUS_USG1_SLW1_OBSERVER',
        auroraExecution: AURORA_EXECUTION.version,
        auroraPolicyRevision: AURORA_EXECUTION.policyRevision,
        auroraDamageControlPercent: Number(this.settings.auroraDamageControlPercent ?? AURORA_EXECUTION.defaultDamageControlPercent),
        auroraMaximumEconomicLossRatio: Number(this.settings.auroraDamageControlPercent ?? AURORA_EXECUTION.defaultDamageControlPercent)/100,
        auroraFrozenAtEntry: AURORA_EXECUTION.frozenAtEntry,
        auroraTrails: AURORA_EXECUTION.trails,
        auroraNormalAutomatedLossExitGate:AURORA_EXECUTION.normalAutomatedLossExitGate,
        auroraWatchdogAboveDangerLine:AURORA_EXECUTION.watchdogAboveDangerLine,
        stopGuardRecoveryLearning: STOP_GUARD_RECOVERY_LEARNING.version,
        stopGuardRecoveryLearningRole: STOP_GUARD_RECOVERY_LEARNING.role,
        stopGuardRecoveryLearningDecisionEvidenceMode: STOP_GUARD_RECOVERY_LEARNING.decisionEvidenceMode,
        stopGuardRecoveryLearningHunterOnly: true,
        stopGuardRecoveryLearningMarketObserverDecisionAuthority: STOP_GUARD_RECOVERY_LEARNING.marketObserverDecisionAuthority,
        stopGuardLegacyRecoveryPatternDecisionAuthority: STOP_GUARD_RECOVERY_LEARNING.legacyRecoveryPatternDecisionAuthority,
        stopGuardRecoveryDefinition: 'full_position_executable_fee_adjusted_positive_net',
        stopGuardRecoveryMinimumNetPerOriginalContractCents: STOP_GUARD_RECOVERY_LEARNING.minimumNetPerOriginalContractCents,
        stopGuardRecoveryMinimumConfirmations: STOP_GUARD_RECOVERY_LEARNING.minimumPositiveConfirmations,
        stopGuardRecoveryMinimumDurationMs: STOP_GUARD_RECOVERY_LEARNING.minimumPositiveDurationMs,
        stopGuardRecoveryProfileDimensions: ['concept','source_feeder','sport','entry_band','drop_bucket','game_bucket','crash_bucket'],
        stopGuardHistoricalStrongUnlimitedVeto: false,
        feederSignalIntelligence: FEEDER_SIGNAL_INTELLIGENCE.version,
        feederSignalIntelligenceRole: FEEDER_SIGNAL_INTELLIGENCE.role,
        feederSignalIntelligenceDiagnosticsOnly: true,
        feederSignalIntelligenceRuntime: 'DISABLED_R60_SHADOW_TABLE_REPLACES_QUOTE_RATE_FSI',
        feederSignalIntelligenceEntryAuthority: false,
        feederSignalIntelligenceExecutionAuthority: false,
        feederSignalIntelligenceAthenaDecisionAuthority: false,
        feederSignalIntelligenceAnalysisStakeCents: FEEDER_SIGNAL_INTELLIGENCE.analysisStakeCents,
        feederSignalIntelligenceReferenceProfitThresholdsCents: [...FEEDER_SIGNAL_INTELLIGENCE.referenceProfitThresholdsCents],
        stopGuardDangerLine: 'frozen_aurora_or_creation_era_legacy_stop',
        stopGuardEmergencyExtensionCents: ULTIMATE_STOP_GUARD.emergencyExtensionCents,
        stopGuardCriticalMinimumRecoveryRate: ULTIMATE_STOP_GUARD.minimumCriticalRecoveryRate,
        stopGuardCriticalMinimumObservations: ULTIMATE_STOP_GUARD.minimumLearningObservations,
        recoveryHunterContinuity: 'RH1',
        recoveryTickerPriority: true,
        recoveryEventDrivenQuoteEvaluation: true,
        feederHunterEventDrivenQuoteEvaluation: false,
        centralizedAthenaOpportunityEvaluation: true,
        feederHunterPriorityTickerCount: this.feederPriorityTickers.size,
        entryEvaluationBackpressure: this.entryEvaluationQueue?.snapshot?.() || {maxConcurrency:ENTRY_EVALUATION_CONCURRENCY,active:0,pending:0,rerun:0,totalStarted:0,totalCoalesced:0,maxObservedActive:0},
        phoenixSignalBackpressure:this.phoenixSignalQueue?.snapshot?.()||{maxConcurrency:1,active:0,pending:0,rerun:0,totalStarted:0,totalCoalesced:0,maxObservedActive:0},
        quoteProtectionBackpressure: this.quoteProtectionQueue?.snapshot?.() || {maxConcurrency:QUOTE_PROTECTION_CONCURRENCY,active:0,pending:0,rerun:0,totalStarted:0,totalCoalesced:0,maxObservedActive:0},
        databasePressureIsolation:DATABASE_PRESSURE_ISOLATION.version,
        quoteProtectionScope:DATABASE_PRESSURE_ISOLATION.quoteProtectionScope,
        referenceSignalSweepIntervalMs:REFERENCE_SIGNAL_SWEEP_MS,
        stateCollectionSingleFlight:true,
        stateSnapshotTtlMs:STATE_SNAPSHOT_TTL_MS,
        stateDbFanoutMaximum:STATE_DB_FANOUT_MAX,
        ordinaryPoolReservedHeadroom:DATABASE_PRESSURE_ISOLATION.ordinaryPoolReservedHeadroom,
        lowPriorityPersistenceConcurrency:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceConcurrency,
        lowPriorityPersistenceMaximumPending:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceMaximumPending,
        lowPriorityPersistenceScope:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceScope,
        lowPriorityPersistenceMaximumBatchBytes:DATABASE_PRESSURE_ISOLATION.lowPriorityPersistenceMaximumBatchBytes,
        fsiPersistenceRevision:DATABASE_PRESSURE_ISOLATION.fsiPersistenceRevision,
        fsiPersistenceBatchSize:DATABASE_PRESSURE_ISOLATION.fsiPersistenceBatchSize,
        advisoryLockIsolation: 'DEDICATED_LOCK_POOL',
        advisoryLockPoolMaximumConnections: 2,
        resourceGovernor: RUNTIME_RESOURCE_GOVERNOR.version,
        resourceGovernorTradingAuthority: RUNTIME_RESOURCE_GOVERNOR.tradingAuthority,
        resourceGovernorRole:'TRADE_PRIORITY_NON_AUTHORITY_MEMORY_GOVERNANCE',
        resourcePreferredRssCeilingMiB: RUNTIME_RESOURCE_GOVERNOR.preferredRssCeilingMiB,
        resourceWarningRssMiB: RUNTIME_RESOURCE_GOVERNOR.warningRssMiB,
        resourceHardCeilingMiB:RUNTIME_RESOURCE_GOVERNOR.hardCeilingMiB,
        resourcePressureState:this.resourcePressureState,
        resourceResearchDeferred:this.resourceResearchDeferred===true,
        resourceRuntimeCachePolicy: 'active_current_and_safety_priority_only',
        recoveryWatchExecutionGovernor:RECOVERY_WATCH_EXECUTION_GOVERNOR.version,
        recoveryWatchMinimumPriceChangeRetryMs:RECOVERY_WATCH_EXECUTION_GOVERNOR.minimumPriceChangeRetryMs,
        recoveryWatchUnchangedReadyRetryMs:RECOVERY_WATCH_EXECUTION_GOVERNOR.unchangedReadyRetryMs,
        recoveryWatchExposureBlockedRetryMs:RECOVERY_WATCH_EXECUTION_GOVERNOR.exposureBlockedRetryMs,
        entryPipelineTelemetry: 'EPT1',
        recoveryReboundOrigin: 'crash_episode_trough',
        recoveryReboundPrice: 'best_bid',
        recoveryTargetStakeMultiplier: 1,
        recoveryExactConfiguredSizing: true,
        recoveryPriorityTickerCount: this.recoveryPriorityTickers.size,
        crashIntelligence: 'CI1',
        crashRecoveryHunter:'STARLIGHT-EXECUTION-R51',
        crashLearningAlwaysOn:true,
        crashRecoveryModelEnabled:this.settings.crashRecoveryHunterEnabled === true,
        crashFeaturesStrategicAuthority:'ATHENA_ONLY',
        crashRecoveryIndependentQualificationVeto:false,
        crashRecoveryPriorityTickerCount:this.crashPriorityTickers.size,
        crashRecoveryRequiresActiveCosmo:false,
        crashRecoverySourceFeeders:[...COSMO_ROUTING.activeCosmos],
        scarletNeedle:SCARLET_NEEDLE.version,
        scarletNeedleContinuationAuthority:false,
        scarletNeedleTrigger:SCARLET_NEEDLE.trigger,
        scarletNeedleMaxRepeats:Number(this.settings.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats),
        scarletNeedleRetracementTriggerEnabled:false,
        scarletNeedleContinuation:{...(this.scarletContinuationStats||{})},
        noBoltNoAttackExceptions:['SAGITTARIUS_JUSTICE_ARROW_V2_CRASH_RECOVERY_AUTHORITY','CRYSTAL_WALL_V3_CRASH_RECOVERY_AUTHORITY'],
        crystalWall:CRYSTAL_WALL.version,
        crystalWallPolicyRevision:CRYSTAL_WALL.policyRevision,
        crystalWallIndependentAuthority:true,
        crystalWallAthenaAuthority:false,
        crystalWallTrigger:CRYSTAL_WALL.trigger,
        crystalWallTriggerSources:[...CRYSTAL_WALL.triggerSources],
        crystalWallMinimumCrashCents:Number(this.settings.crystalWallMinCrashCents),
        crystalWallMinimumReboundCents:Number(this.settings.crystalWallMinReboundCents),
        crystalWallMinimumUpwardTicks:Number(this.settings.crystalWallMinUpwardTicks),
        crystalWallFixedStakeCents:Number(this.settings.recoveryStakeCents),
        crystalWallStakeMultiplierAllowed:false,
        crystalWallGameClockExempt:true,
        crystalWallEventCapOverlayExempt:true,
        crystalWallFullConfiguredSizeRequired:true,
        crystalWallOneEntryPerCrashEpisode:true,
        crystalWallRuntime:{...(this.crystalWallContinuationStats||{}),activeWatches:this.crystalWallWatches?.size||0,queue:this.crystalWallContinuationQueue?.snapshot?.()||null},
        lightningPlasmaContinuationAuthority:true,
        lightningPlasmaTrigger:LIGHTNING_PLASMA.trigger,
        lightningPlasmaContinuation:{...(this.lightningPlasmaContinuationStats||{})},
        cosmoRouting: COSMO_ROUTING.version,
        cosmoRoutingRole: COSMO_ROUTING.role,
        cosmoRoutingInitialEntryConsumers: [...COSMO_ROUTING.currentInitialEntryConsumers],
        cosmoRoutingFollowOnOnlyExceptions: [...COSMO_ROUTING.followOnOnlyExceptions],
        cosmoRoutingIndependentAuthorityExceptions: [...(COSMO_ROUTING.independentAuthorityExceptions||[])],
        cosmoRoutingFutureInitialEntryDefault: COSMO_ROUTING.defaultFutureInitialEntryConsumer,
        cosmoSourceDoesNotAuthorizeEntry: COSMO_ROUTING.sourceDoesNotAuthorizeEntry,
        athenaExclamation:ATHENA_EXCLAMATION.version,
        athenaExclamationEnabled:this.settings.athenaExclamationEnabled===true,
        athenaExclamationRole:'ATHENA_SUBORDINATE_META_EXECUTION_PATTERN',
        athenaExclamationStrategicAuthority:ATHENA_COMMANDER.version,
        athenaExclamationIndependentPrimeVeto:false,
        athenaExclamationStakeCents:Number(this.settings.athenaExclamationStakeCents),
        athenaExclamationEntryBand:[Number(this.settings.athenaExclamationMinEntryCents),Number(this.settings.athenaExclamationMaxEntryCents)],
        lightningPlasma:LIGHTNING_PLASMA.version,
        lightningPlasmaPolicyRevision:LIGHTNING_PLASMA.policyRevision,
        lightningPlasmaRole:LIGHTNING_PLASMA.role,
        lightningPlasmaSourceCosmos:[...LIGHTNING_PLASMA.sourceCosmos],
        lightningPlasmaFieldBudgetSharedAcrossStrikes:true,
        lightningPlasmaOneStrikePerEvent:true,
        dragonFeeder: 'DRAGON-V1',
        dragonReferenceOnly: true,
        dragonEnabled: this.settings.dragonEnabled === true,
        dragonMinSignalPriceCents: Number(this.settings.dragonMinSignalPriceCents),
        dragonMaxSignalPriceCents: Number(this.settings.dragonMaxSignalPriceCents),
        dragonMaxEpisode: Number(this.settings.dragonMaxEpisode),
        dragonCrashIntelligenceSource: 'CI1',
        phoenixCosmo:PHOENIX_COSMO.version,
        phoenixPolicyRevision:PHOENIX_COSMO.policyRevision,
        phoenixReferenceOnly:true,
        phoenixEnabled:this.settings.phoenixEnabled===true,
        phoenixEntryBand:[Number(this.settings.phoenixMinPriceCents),Number(this.settings.phoenixMaxPriceCents)],
        phoenixMinimumRiseCents:PHOENIX_COSMO.minimumRiseCents,
        phoenixMinimumUpTicks:PHOENIX_COSMO.minimumUpTicks,
        phoenixRequiredFreshConfirmations:PHOENIX_COSMO.requiredFreshConfirmations,
        phoenixSignalTtlMs:PHOENIX_COSMO.signalTtlMs,
        phoenixRuntime:this.phoenixCosmo?.summary?.()||null,
        athenaBrain: ATHENA_BRAIN.version,
        athenaRole: ATHENA_BRAIN.role,
        athenaPlacement: ATHENA_BRAIN.placement,
        athenaB2:ATHENA_B2.version,
        athenaB2PolicyRevision:ATHENA_B2.policyRevision,
        athenaB2Role:ATHENA_B2.role,
        athenaB2Placement:ATHENA_B2.placement,
        athenaB2DecisionAuthority:ATHENA_B2.decisionAuthority,
        athenaB2NewGenerationDecisionAuthority:false,
        athenaB2HistoricalCompatibilityOnly:true,
        athenaB2Mode:ATHENA_B2.mode,
        athenaB2HistoricalLabeledHunters:ATHENA_B2.historicalCorpus.labeledHunters,
        athenaB2HistoricalBadTrades:ATHENA_B2.historicalCorpus.badTrades,
        athenaB2FullCorpusBadBlocked:ATHENA_B2.historicalCorpus.fullCorpusReplayBadBlocked,
        athenaB2FullCorpusBadTotal:ATHENA_B2.historicalCorpus.fullCorpusReplayBadTotal,
        athenaB2FullCorpusGoodAllowed:ATHENA_B2.historicalCorpus.fullCorpusReplayGoodAllowed,
        athenaB2FullCorpusAllowedPnlDollars:ATHENA_B2.historicalCorpus.fullCorpusReplayAllowedPnlDollars,
        athenaB2GroupedTickerHoldoutBadBlocked:ATHENA_B2.historicalCorpus.groupedTickerHoldoutBadBlocked,
        athenaB2GroupedTickerHoldoutBadTotal:ATHENA_B2.historicalCorpus.groupedTickerHoldoutBadTotal,
        athenaB2GroupedTickerHoldoutGoodAllowed:ATHENA_B2.historicalCorpus.groupedTickerHoldoutGoodAllowed,
        athenaB2GroupedTickerHoldoutAllowedPnlDollars:ATHENA_B2.historicalCorpus.groupedTickerHoldoutAllowedPnlDollars,
        athenaB2GuardianThreshold:ATHENA_B2.guardianThreshold,
        athenaB2GuardianModelHash:ATHENA_B2.guardianModelHash,
        athenaB2GuardianModelValid:ATHENA_B2.guardianModelValidation?.ok===true,
        athenaConsumers: ['Athena Exclamation','Momentum Hunter','Wave Surfer','Recovery Hunter','Crash Recovery Hunter','Lightning Plasma'],
        athenaFeedersExcluded: true,
        athenaExitAuthority: false,
        athenaB1ExitAuthority: false,
        athenaExitIntelligence: ATHENA_EXIT_INTELLIGENCE.version,
        athenaExitPolicyRevision: ATHENA_EXIT_INTELLIGENCE.policyRevision,
        athenaExitRole: ATHENA_EXIT_INTELLIGENCE.role,
        athenaExitAppliesTo: 'R36_plus_Hunter_entries_with_ATHENA_X1_snapshot',
        athenaExitFullPositionOnly: ATHENA_EXIT_INTELLIGENCE.fullPositionOnly,
        athenaExitPositionSplitting: ATHENA_EXIT_INTELLIGENCE.positionSplitting,
        athenaExitNoLookahead: ATHENA_EXIT_INTELLIGENCE.noLookahead,
        athenaExitFullExecutableDepthRequired: ATHENA_EXIT_INTELLIGENCE.fullExecutableDepthRequired,
        athenaExitMaximumExecutableBookAgeMs: ATHENA_EXIT_INTELLIGENCE.maximumExecutableBookAgeMs,
        athenaExitMaximumFutureBookSkewMs: ATHENA_EXIT_INTELLIGENCE.maximumFutureBookSkewMs,
        athenaExitHistoricalDrawdownSupportWilsonLow: ATHENA_EXIT_INTELLIGENCE.historicalDrawdownSupportWilsonLow,
        athenaExitPolicyRevisionFailClosed: true,
        athenaExitIntentionalPartialSubmission: false,
        athenaExitLossDomainAuthority: ULTIMATE_STOP_GUARD.version,
        athenaExitLegacyPri1Compatibility: 'creation_time_PRI1_preserved',
        athenaInsufficientEvidencePolicy: ATHENA_BRAIN.insufficientEvidencePolicy,
        athenaBlockPolicy: ATHENA_BRAIN.blockPolicy,
        athenaAdaptiveMode: ATHENA_BRAIN.adaptiveMode,
        athenaAdaptiveDecisionWeight: ATHENA_BRAIN.adaptiveDecisionWeight,
        goldenEye: GOLDEN_EYE.version,
        goldenEyePolicyRevision: GOLDEN_EYE.policyRevision,
        goldenEyeRole: GOLDEN_EYE.role,
        goldenEyeLearningAlwaysOn: GOLDEN_EYE.learningAlwaysOn,
        goldenEyeEnabled: this.settings.goldenEyeEnabled === true,
        goldenEyeLiveEnabled: this.settings.goldenEyeLiveEnabled === true,
        goldenEyeAppliesTo: 'R37_plus_Hunter_entries_with_GOLDEN_EYE_snapshot',
        goldenEyeAllProfitableCashout: GOLDEN_EYE.allProfitableCashout,
        goldenEyePerTradeSelection: GOLDEN_EYE.perTradeSelection,
        goldenEyeMaximumSignalQuoteAgeMs: GOLDEN_EYE.maximumSignalQuoteAgeMs,
        goldenEyeMaximumSignalBookAgeMs: GOLDEN_EYE.maximumSignalBookAgeMs,
        goldenEyeMaximumExecutionBookAgeMs: GOLDEN_EYE.maximumExecutionBookAgeMs,
        goldenEyeMinimumNaturalEpisodes: GOLDEN_EYE.minimumNaturalEpisodes,
        goldenEyeMinimumCollectiveEpisodes: GOLDEN_EYE.minimumCollectiveEpisodes,
        goldenEyeManualTrainingEnabled: true,
        goldenEyeManualBackfillEnabled: true,
        goldenEyeManualBackfillGroupingMs: GOLDEN_EYE.manualBackfillGroupingMs,
        goldenEyeMinimumComparableEpisodes: GOLDEN_EYE.minimumComparableEpisodes,
        goldenEyeMaximumExtensionProbability: GOLDEN_EYE.maximumExtensionProbability,
        goldenEyeUsesManualCashoutExecutionPath: true,
        goldenEyeLossDomainAuthority: ULTIMATE_STOP_GUARD.version,
        goldenEyeLegacyAthenaX1Compatibility: 'creation_time_ATHENA_X1_preserved',
        protectedRunnerIntelligence: PROTECTED_RUNNER_INTELLIGENCE.version,
        protectedRunnerPolicyRevision: PROTECTED_RUNNER_INTELLIGENCE.policyRevision,
        protectedRunnerAppliesTo: 'R33_plus_Hunter_entries_with_PRI1_R2_snapshot',
        protectedRunnerR32Compatibility: 'creation_time_PRI1_R1_preserved',
        protectedRunnerLegacyProfitAuthority: `${APEX_PROFIT_GUARD.version}+${ULTIMATE_PROFIT_GUARD.version}`,
        protectedRunnerCapitalSafeNetPerOriginalContractCents: PROTECTED_RUNNER_INTELLIGENCE.capitalLatchNetPerOriginalContractCents,
        protectedRunnerProfitFloorArmNetPerOriginalContractCents: PROTECTED_RUNNER_INTELLIGENCE.profitFloorArmNetPerOriginalContractCents,
        protectedRunnerColdStartGivebackNetPerContractCents: PROTECTED_RUNNER_INTELLIGENCE.coldStartRunnerGivebackNetPerContractCents,
        protectedRunnerMinimumGivebackNetPerContractCents: PROTECTED_RUNNER_INTELLIGENCE.minimumRunnerGivebackNetPerContractCents,
        protectedRunnerMaximumGivebackNetPerContractCents: PROTECTED_RUNNER_INTELLIGENCE.maximumRunnerGivebackNetPerContractCents,
        protectedRunnerLateProfitTightenAtNetPerOriginalContractCents: PROTECTED_RUNNER_INTELLIGENCE.lateProfitTightenAtNetPerOriginalContractCents,
        protectedRunnerLateProfitGivebackNetPerContractCents: PROTECTED_RUNNER_INTELLIGENCE.lateProfitGivebackNetPerContractCents,
        protectedRunnerLegacyR32ColdStartRetentionRatio: PROTECTED_RUNNER_INTELLIGENCE.legacyColdStartRetentionRatio,
        protectedRunnerFullExecutableDepthRequired: PROTECTED_RUNNER_INTELLIGENCE.fullExecutableDepthRequired,
        protectedRunnerImmediateProtectedFloorExit: PROTECTED_RUNNER_INTELLIGENCE.immediateProtectedFloorExit,
        protectedRunnerLossDomainDelegatedToStopGuard: PROTECTED_RUNNER_INTELLIGENCE.lossDomainDelegatedToStopGuard,
        profitLearningIntelligence: PROFIT_LEARNING_INTELLIGENCE.version,
        profitLearningMinimumProfileObservations: PROFIT_LEARNING_INTELLIGENCE.minimumProfileObservations,
        profitLearningMinimumPullbackObservations: PROFIT_LEARNING_INTELLIGENCE.minimumPullbackObservations,
        profitLearningRunnerGivebackPromotionEnabled: PROFIT_LEARNING_INTELLIGENCE.runnerGivebackPromotionEnabled,
        profitLearningPostExitCounterfactualTracking: true,
        profitLearningShadowPolicies: Object.keys(PROFIT_LEARNING_INTELLIGENCE.shadowPolicies),
        profitLearningShadowPoliciesHaveExecutionAuthority: false,
        apexProfitGuard: APEX_PROFIT_GUARD.version,
        apexProfitGuardActivationMoveCents: APEX_PROFIT_GUARD.activationMoveCents,
        apexProfitGuardPeakGivebackCents: APEX_PROFIT_GUARD.peakGivebackCents,
        apexProfitGuardFailureConfirmations: APEX_PROFIT_GUARD.failureConfirmations,
        apexProfitGuardImmediateGapThroughCents: APEX_PROFIT_GUARD.immediateGapThroughCents,
        apexProfitGuardMinimumNetPerContractCents: APEX_PROFIT_GUARD.minimumNetProfitPerContractCents,
        apexProfitGuardFullExecutableDepthRequired: APEX_PROFIT_GUARD.fullExecutableDepthRequired,
        apexProfitGuardPositiveNetExecutionOnly: APEX_PROFIT_GUARD.positiveNetExecutionOnly,
        apexProfitGuardLossDomainDelegatedToStopGuard: APEX_PROFIT_GUARD.lossDomainDelegatedToStopGuard,
        manualCashoutIsProfitGuardSignal: false,
        ultimateProfitGuard: ULTIMATE_PROFIT_GUARD.version,
        profitGuardActivationMoveCents: ULTIMATE_PROFIT_GUARD.activationMoveCents,
        profitGuardPeakGivebackCents: ULTIMATE_PROFIT_GUARD.peakGivebackCents,
        profitGuardRecoveryBufferCents: ULTIMATE_PROFIT_GUARD.recoveryBufferCents,
        profitGuardMinimumNetPerContractCents: ULTIMATE_PROFIT_GUARD.minimumNetProfitPerContractCents,
        profitGuardHeadroomQualifiedArming: ULTIMATE_PROFIT_GUARD.headroomQualifiedArming,
        profitGuardHeadroomRequiredCents: ULTIMATE_PROFIT_GUARD.peakGivebackCents + ULTIMATE_PROFIT_GUARD.recoveryBufferCents,
        profitGuardEconomicBreakEvenTelemetryOnly: !ULTIMATE_PROFIT_GUARD.economicBreakEvenImmediateExit,
        profitGuardLossDomainDelegatedToStopGuard: ULTIMATE_PROFIT_GUARD.lossDomainDelegatedToStopGuard,
        profitGuardFullExecutableDepthRequired: true,
        activeStatuses: ['open', 'entry_pending', 'exit_pending', 'pending_recovery'],
      },
      health: {
        ...this.health,
        protectionOk: this.profitGuard.protectionOk,
        lastProtectionError: this.profitGuard.lastError,
        startedAtMs: this.startedAtMs,
        lastFullScanMs: this.lastFullScanMs,
        protectionAgeMs: this.health.lastProtectionMs ? Date.now() - this.health.lastProtectionMs : null,
        websocketAgeMs: this.health.lastWsMessageMs ? Date.now() - this.health.lastWsMessageMs : null,
        scannerAgeMs: this.lastFullScanMs ? Date.now() - this.lastFullScanMs : null,
      },
      balance: this.balance,
      brokerContext: this.brokerPositions,
      brokerLedgerGaps: this.brokerLedgerGaps || brokerLedgerGaps(this.brokerPositions, []),
      performance: {
        reportingVersion:p.reportingVersion,asOfMs:p.asOfMs,scope:p.reportingScope,byAttack:{'Lightning Plasma':p.byAttack['Lightning Plasma']},
        valuationComplete:p.valuationComplete,missingValuations:p.missingValuations,knownUnrealizedCents:p.knownUnrealizedCents,periodsComplete:p.periodsComplete,pending:p.pendingHunters,
        portfolioValueCents: this.settings.mode==='LIVE' && kalshiAccountSnapshot(this.balance) ? kalshiAccountSnapshot(this.balance).portfolioCents : p.portfolioValueCents,
        kalshiPortfolioCents: this.settings.mode==='LIVE' ? kalshiAccountSnapshot(this.balance)?.portfolioCents ?? null : null,
        kalshiCashCents: this.settings.mode==='LIVE' ? kalshiAccountSnapshot(this.balance)?.cashCents ?? null : null,
        kalshiPositionCents: this.settings.mode==='LIVE' ? kalshiAccountSnapshot(this.balance)?.positionCents ?? null : null,
        realizedCents: p.hunterRealizedCents,
        closedRealizedCents: p.closedRealizedCents,
        partialRealizedCents: p.partialRealizedCents,
        dayRealizedCents: p.dayRealizedCents,
        weekRealizedCents: p.weekRealizedCents,
        monthRealizedCents: p.monthRealizedCents,
        yearRealizedCents: p.yearRealizedCents,
        unrealizedCents: p.hunterUnrealizedCents,
        wins: p.wins, losses: p.losses, scratches: p.scratches,
        winRate: p.winRate, open: p.openHunters, closed: p.closedHunters,
        feederUnrealizedCents: p.feederUnrealizedCents,
        simulationCashCents: p.simulationCashCents,
      },
      accountBalances:{scope:'ACTUAL_ACCOUNT_INCLUDING_LEGACY',systemName:p.reportingScope.systemName,ownerId:p.reportingScope.ownerId,mode:p.reportingScope.mode,resetTimestampMs:p.reportingScope.resetTimestampMs,asOfMs:p.asOfMs,
        portfolioValueCents:p.portfolioValueCents,simulationCashCents:p.simulationCashCents,
        kalshiPortfolioCents:this.settings.mode==='LIVE'?kalshiAccountSnapshot(this.balance)?.portfolioCents??null:null,
        kalshiCashCents:this.settings.mode==='LIVE'?kalshiAccountSnapshot(this.balance)?.cashCents??null:null},
      legacyCapitalPerformance:{...p.legacyCapitalPerformance,scope:{...p.reportingScope,conceptName:'Crash Recovery Hunter'},asOfMs:p.asOfMs},legacyClosedHunters,
      conceptStats, feederSummary, entryPipeline, entryCandidateFunnel, entryPathConfiguration, auroraExecution, resourceUsage, openHunters, openFeeders, cosmoShadowTrades, shadowSaints:shadowView.rows.map(e=>this.compactShadowDiagnostic(e)),shadowDiagnostics:{...shadowView,rows:undefined},legacyRealExposure:legacyRealExposure.map(e=>this.compactDashboardEntry(e)), gemini:geminiSummary, geminiTrades, anotherDimension:{...(this.anotherDimensionStats||{}),active:Number(this.anotherDimensionOpenByTicker?.size||0),recent:Number(this.anotherDimensionRecent?.size||0)}, justiceArrow:{...(this.justiceArrowStats||{})}, closedHunters,
      trackedMarkets: trackers, trackerSummary, patterns, recoveryTracking, sports,
      crashLearning, crashEpisodes, profitLearning, stopGuardRecoveryLearning, athena, atomicThunderBolt, infinityBreak, legacyAtomicThunder:{ version:ATOMIC_THUNDER.version, policyRevision:ATOMIC_THUNDER.policyRevision, legacyCompatibilityOnly:true, ...atomicThunder }, goldenEye:this.goldenEye?.summary?.() || {version:GOLDEN_EYE.version,ready:false,enabled:false},
      liveMarkets: scanned,
      scanner: { tracked: trackerSummary.tracked, activeMarkets: scanned.length, lastScanMs: this.lastFullScanMs, ...this.speed },
      snapshots, audit,
    };
    const elapsed=Math.max(0,Date.now()-collectionStartedAt);const st=this.operatorPlaneStats;
    st.collections=Number(st.collections||0)+1;st.lastCollectionMs=elapsed;st.maxCollectionMs=Math.max(Number(st.maxCollectionMs||0),elapsed);st.averageCollectionMs=st.collections===1?elapsed:((Number(st.averageCollectionMs||0)*(st.collections-1))+elapsed)/st.collections;
    return state;
  }

  decorateEntry(e) {
    const view = this.quoteView(e);
    const guard = this.profitGuard?.getState(e.id);
    const reportValuation=executionCapital(e)?(e.reportValuation||executionValuation(e,this.market?.getQuote?.(e.ticker)||this.market?.quotes?.get?.(e.ticker),this.settings,Date.now())):null;
    const unrealized = reportValuation?reportValuation.unrealizedCents:(openLike(e.status) && PORTFOLIO_CONCEPTS.has(e.conceptName)
      ? this.openUnrealized(e, view.priceCents) : 0);
    const isFeeder = FEEDER_CONCEPTS.has(e.conceptName);
    const isShadowAttack = SHADOW_ATTACK_CONCEPTS.has(e.conceptName);
    const isShadow = isFeeder || isShadowAttack;
    const referenceCount = isShadow ? Number(e.count || 0) : 0;
    const shadowPrice=e.status==='closed'&&Number.isFinite(Number(e.exitPriceCents))?Number(e.exitPriceCents):Number(view.priceCents);
    const shadowMoveCents = isShadow ? shadowPrice - Number(e.entryPriceCents) : null;
    let referencePnlCents=null,shadowPnlCents=null;
    if(isFeeder){
      referencePnlCents=(Number(view.priceCents)-Number(e.entryPriceCents))*referenceCount-2*Number(this.settings.simFeeCents||2)*referenceCount;
      shadowPnlCents=shadowMoveCents*referenceCount;
    }else if(isShadowAttack){
      if(e.status==='closed')referencePnlCents=shadowPnlCents=Number(e.pnlCents||0);
      else{
        const exitFee=String(e.mode||this.settings.mode||'SIMULATION').toUpperCase()==='LIVE'
          ? kalshiGeneralTakerFeeEstimateCents({count:referenceCount,priceCents:Math.max(0,Math.min(100,Number(view.priceCents||0)))})
          : Math.max(0,Number(e.entryConfig?.simFeeCents??this.settings.simFeeCents??0))*referenceCount;
        referencePnlCents=shadowPnlCents=shadowMoveCents*referenceCount-Number(e.entryFeeCents||0)-exitFee;
      }
    }
    const favorableMoveCents = isShadow ? Math.max(0, shadowMoveCents) : null;
    const adverseMoveCents = isShadow ? Math.max(0, -shadowMoveCents) : null;
    const greenTriggerCents = isFeeder ? Number(this.settings.atomicThunderGreenTriggerCents||COSMO_SHADOW_TRADING.defaultGreenTriggerCents) : null;
    const atomicThunderBoltId = isFeeder ? (e.feederState?.atomicThunderBoltId||null) : null;
    const shadowState = isFeeder ? (atomicThunderBoltId?'BOLT_SENT':shadowMoveCents>=greenTriggerCents?'GREEN':'TRACKING') : isShadowAttack ? (openLike(e.status)?'ANOTHER_DIMENSION':Number(e.pnlCents||0)>0?'WIN':Number(e.pnlCents||0)<0?'LOSS':'SCRATCH') : null;
    const sourceSignalPrice = e.conceptName === 'Dragon' ? e.entryConfig?.dragonSource?.signalPriceCents : (e.conceptName === 'Phoenix' ? e.entryConfig?.phoenixSource?.signalAskCents : (e.conceptName === 'Golden Dragon' ? e.entryConfig?.goldenDragonSource?.signalPriceCents : null));
    const signalPriceCents = Number.isFinite(Number(sourceSignalPrice)) ? Number(sourceSignalPrice) : null;
    const referenceOriginCents = isShadow ? Number(e.entryPriceCents) : null;
    const referenceOrigin = e.conceptName==='Dragon'?'dragon_signal':(e.conceptName==='Phoenix'?'phoenix_signal':(isShadowAttack?'another_dimension':(isFeeder?'feeder_entry':null)));
    const identity=EXECUTION_ATTACK_DISPLAY[e.conceptName]||null;
    const aurora=e?.entryConfig?.aurora?.version===AURORA_EXECUTION.version&&e.entryConfig.aurora.frozen===true?e.entryConfig.aurora:null;
    const postExit=e?.postExitState&&typeof e.postExitState==='object'?e.postExitState:{};
    const closedPostPrice=e?.status==='closed'&&Number.isFinite(Number(postExit.latestMarketPriceCents))?Number(postExit.latestMarketPriceCents):null;
    const shadowRuntime=isShadowAttack?this.anotherDimensionRuntime?.get?.(String(e.id||'')):null;
    const shadowEvaluation=shadowRuntime?.lastEvaluation||null;
    const shadowPeak=isShadowAttack&&openLike(e.status)?Math.max(Number(e.peakPriceCents||e.entryPriceCents||0),Number(shadowRuntime?.peakPriceCents||0)):Number(e.peakPriceCents||0);
    const shadowLow=isShadowAttack&&openLike(e.status)&&Number(shadowRuntime?.lowestPriceAfterEntryCents)>0?Number(shadowRuntime.lowestPriceAfterEntryCents):e.lowestPriceAfterEntryCents;
    const shadowMae=isShadowAttack&&openLike(e.status)?Number(shadowRuntime?.maeCents??e.maeCents??0):Number(e.maeCents||0);
    const shadowMaeAt=isShadowAttack&&openLike(e.status)?(shadowRuntime?.maeAtMs??e.maeAtMs):e.maeAtMs;
    return {
      ...e,
      ...(isShadowAttack?{peakPriceCents:shadowPeak,lowestPriceAfterEntryCents:shadowLow,maeCents:shadowMae,maeAtMs:shadowMaeAt}:{}),
      currentPriceCents: e?.status==='closed'&&closedPostPrice!=null?closedPostPrice:reportValuation&&!reportValuation.complete?null:view.priceCents,
      currentBidCents:Number(view.q?.yesBid||view.priceCents||0)||null,
      currentAskCents:Number(view.q?.yesAsk||0)||null,
      postExitCurrentPriceCents:closedPostPrice,
      postExitDeltaFromExitCents:Number.isFinite(Number(postExit.deltaFromExitCents))?Number(postExit.deltaFromExitCents):null,
      postExitBestPriceCents:Number.isFinite(Number(postExit.bestExecutableBidCents))?Number(postExit.bestExecutableBidCents):null,
      postExitBestDeltaCents:Number.isFinite(Number(postExit.bestDeltaFromExitCents))?Number(postExit.bestDeltaFromExitCents):null,
      postExitMissedUpsideCents:Number.isFinite(Number(postExit.missedUpsideNetCents))?Number(postExit.missedUpsideNetCents):null,
      postExitWorstPriceCents:Number.isFinite(Number(postExit.worstExecutableBidCents))?Number(postExit.worstExecutableBidCents):null,
      postExitWorstDeltaCents:Number.isFinite(Number(postExit.worstDeltaFromExitCents))?Number(postExit.worstDeltaFromExitCents):null,
      postExitLossAvoidedCents:Number.isFinite(Number(postExit.lossAvoidedNetCents))?Number(postExit.lossAvoidedNetCents):null,
      postExitResearchComplete:postExit.researchComplete===true,
      volume24h: view.q?.volume24h ?? e.volume24h,
      unrealizedCents: unrealized,
      positionPnlCents:unrealized==null?null:Number(e.pnlCents || 0) + unrealized,
      valuationComplete:reportValuation?.complete??true,valuationReason:reportValuation?.reason||null,positionExposureConfirmed:actualOpenExposure(e),
      referencePnlCents, shadowPnlCents, shadowMoveCents, shadowState, greenTriggerCents, atomicThunderBoltId, athenaSelectedAttack:e.feederState?.athenaSelectedAttack||null, realEntryId:e.feederState?.realEntryId||null, favorableMoveCents, adverseMoveCents, signalPriceCents, referenceOriginCents, referenceOrigin,
      universe:isShadowAttack?'Gemini':null,virtualExecution:isShadowAttack?shadowEvaluation:null,justiceArrowEntryId:isShadowAttack?(e.feederState?.justiceArrowEntryId||null):null,
      executionAttackName:identity?.name||e.conceptName,legacyConceptName:identity?.legacy||e.conceptName,retiredRuntimeConcept:RETIRED_PORTFOLIO_CONCEPTS.has(e.conceptName)||RETIRED_FEEDER_CONCEPTS.has(e.conceptName),aurora,
      quoteAgeMs: Number.isFinite(view.quoteAgeMs) ? view.quoteAgeMs : null,
      dataState: view.dataState,
      gameMinutes: e.gameStartTimeMs ? Math.max(0, Math.round((Date.now() - e.gameStartTimeMs) / 60000)) : null,
      liveStatus: view.q?.liveStatus || view.q?.status || '',
      maeAfterEntryMs: (isShadowAttack?shadowMaeAt:e.maeAtMs) == null ? null : Math.max(0, Number(isShadowAttack?shadowMaeAt:e.maeAtMs) - Number(e.openedAtMs || 0)),
      recoveryToEntryMs: e.recoveryToEntryAtMs == null || e.closedAtMs == null ? null : Math.max(0, Number(e.recoveryToEntryAtMs) - Number(e.closedAtMs)),
      recoveryToGreenMs: e.recoveryToGreenAtMs == null || e.closedAtMs == null ? null : Math.max(0, Number(e.recoveryToGreenAtMs) - Number(e.closedAtMs)),
      profitGuard: guard,
    };
  }

  buildConceptStatsFromAggregate(aggregate={}) {
    const names=['Athena Exclamation','Scarlet Needle','Sagittarius Justice Arrow','Wave Surfer','Crash Recovery Hunter','Recovery Hunter','Momentum Hunter','Lightning Plasma','Pegasus','Dragon','Phoenix'];
    const portfolio=new Map((aggregate.portfolio||[]).map((r)=>[String(r.concept_name||''),r]));
    const signals=new Map((aggregate.signals||[]).map((r)=>[String(r.concept_name||''),r]));
    const linked=new Map((aggregate.linked||[]).map((r)=>[String(r.source_feeder||''),r]));
    const out=[];
    for(const name of names){
      if(ACTIVE_FEEDER_CONCEPTS.has(name)){
        const sig=signals.get(name)||{},link=linked.get(name)||{},closed=Number(link.closed||0),wins=Number(link.wins||0),losses=Number(link.losses||0);
        out.push({name,displayName:name,legacyName:null,total:Number(link.total||0),open:Number(link.open||0),closed,wins,losses,winRate:closed?wins/closed:0,pnlCents:Number(link.pnl_cents||0),avgEntryCents:Math.round(Number(sig.avg_entry_cents||0)),avgCurrentCents:Math.round(Number(sig.avg_current_cents||0)),avgLiquidity:Number(sig.avg_liquidity||0),fedHunters:Number(link.total||0),feederSignals:Number(sig.feeder_signals||0),statsBasis:'fed_hunters'});
      }else{
        const r=portfolio.get(name)||{},closed=Number(r.closed||0),wins=Number(r.wins||0),losses=Number(r.losses||0);
        out.push({name,displayName:EXECUTION_ATTACK_DISPLAY[name]?.name||name,legacyName:EXECUTION_ATTACK_DISPLAY[name]?.legacy||name,total:Number(r.total||0),open:Number(r.open||0),closed,wins,losses,winRate:closed?wins/closed:0,pnlCents:Number(r.pnl_cents||0),avgEntryCents:Math.round(Number(r.avg_entry_cents||0)),avgCurrentCents:Math.round(Number(r.avg_current_cents||0)),avgLiquidity:Number(r.avg_liquidity||0),fedHunters:null});
      }
    }
    return out.sort((a,b)=>b.pnlCents-a.pnlCents);
  }

  buildFeederSummaryFromAggregate(aggregate={}) {
    const rows=(aggregate.linked||[]).filter((r)=>ACTIVE_FEEDER_CONCEPTS.has(String(r.source_feeder||'')));
    const total=rows.reduce((sum,r)=>sum+Number(r.total||0),0),wins=rows.reduce((sum,r)=>sum+Number(r.wins||0),0),losses=rows.reduce((sum,r)=>sum+Number(r.losses||0),0),scratches=rows.reduce((sum,r)=>sum+Number(r.scratches||0),0),pnlCents=rows.reduce((sum,r)=>sum+Number(r.pnl_cents||0),0),closed=wins+losses+scratches;
    return{hunters:total,wins,losses,scratches,pnlCents,winRate:closed?wins/closed:0};
  }

  buildConceptStats(entries) {
    const reset=Number(this.settings?.resetTimestampMs||0), mode=this.settings?.mode||null;
    entries=(entries||[]).filter((e)=>(!mode||e.mode===mode)&&(!reset||(e.status==='closed'?Number(e.closedAtMs||0)>=reset:Number(e.openedAtMs||0)>=reset)));
    const names = ['Athena Exclamation','Scarlet Needle','Sagittarius Justice Arrow','Wave Surfer','Crash Recovery Hunter','Recovery Hunter','Momentum Hunter','Lightning Plasma','Pegasus','Dragon','Phoenix'];
    const out = [];
    for (const name of names) {
      if (ACTIVE_FEEDER_CONCEPTS.has(name)) {
        const signals = entries.filter((e) => e.conceptName === name);
        const linked = entries.filter((e) => PORTFOLIO_CONCEPTS.has(e.conceptName) && e.sourceFeeder === name);
        const closed = linked.filter((e) => e.status === 'closed');
        const wins = closed.filter((e) => e.pnlCents > 0).length;
        const losses = closed.filter((e) => e.pnlCents < 0).length;
        out.push({
          name, displayName:name, legacyName:null,
          total: linked.length,
          open: linked.filter((e) => openLike(e.status)).length,
          closed: closed.length,
          wins, losses,
          winRate: closed.length ? wins / closed.length : 0,
          pnlCents: closed.reduce((sum, e) => sum + e.pnlCents, 0),
          avgEntryCents: signals.length ? Math.round(signals.reduce((sum, e) => {
            const signal = e.conceptName === 'Dragon' ? e.entryConfig?.dragonSource?.signalPriceCents : (e.conceptName==='Phoenix'?e.entryConfig?.phoenixSource?.signalAskCents:null);
            return sum + (Number.isFinite(Number(signal)) ? Number(signal) : Number(e.entryPriceCents || 0));
          }, 0) / signals.length) : 0,
          avgCurrentCents: signals.length ? Math.round(signals.reduce((sum, e) => sum + this.quoteView(e).priceCents, 0) / signals.length) : 0,
          avgLiquidity: signals.length ? signals.reduce((sum, e) => sum + e.volume24h, 0) / signals.length : 0,
          fedHunters: linked.length,
          feederSignals: signals.length,
          statsBasis: 'fed_hunters',
        });
        continue;
      }
      const rows = entries.filter((e) => e.conceptName === name);
      const closed = rows.filter((e) => e.status === 'closed');
      const wins = closed.filter((e) => e.pnlCents > 0).length;
      const losses = closed.filter((e) => e.pnlCents < 0).length;
      out.push({
        name, displayName:EXECUTION_ATTACK_DISPLAY[name]?.name||name, legacyName:EXECUTION_ATTACK_DISPLAY[name]?.legacy||name,
        total: rows.length,
        open: rows.filter((e) => openLike(e.status)).length,
        closed: closed.length,
        wins, losses,
        winRate: closed.length ? wins / closed.length : 0,
        pnlCents: closed.reduce((sum, e) => sum + e.pnlCents, 0),
        avgEntryCents: rows.length ? Math.round(rows.reduce((sum, e) => sum + e.entryPriceCents, 0) / rows.length) : 0,
        avgCurrentCents: rows.length ? Math.round(rows.reduce((sum, e) => sum + this.quoteView(e).priceCents, 0) / rows.length) : 0,
        avgLiquidity: rows.length ? rows.reduce((sum, e) => sum + e.volume24h, 0) / rows.length : 0,
        fedHunters: null,
      });
    }
    return out.sort((a, b) => b.pnlCents - a.pnlCents);
  }

  async emergencyExit({ entryId } = {}) {
    const row=await this.db?.entryById?.(entryId).catch(()=>null);
    if(isShadowSaintEntry(row)){await this.audit("shadow_saint_broker_wall",{id:entryId,path:"emergencyExit"});return {ok:false,reason:"shadow_saint_no_broker"};}
    const id=String(entryId||'').trim();
    if(!id)throw new Error('entryId is required');
    const entry=await this.db.entryById(id);
    if(!entry)throw new Error('Entry not found');
    if(String(entry.systemName||'')!==String(this.settings.systemName||'')||String(entry.ownerId||'')!==String(this.settings.ownerId||'')){
      await this.db.audit('error','emergency_exit_owner_mismatch',{id,ticker:entry.ticker,entrySystemName:entry.systemName,entryOwnerId:entry.ownerId,runtimeSystemName:this.settings.systemName,runtimeOwnerId:this.settings.ownerId}).catch(()=>{});
      throw new Error('Entry is not owned by this SAGITTARIUS runtime');
    }
    if(!PORTFOLIO_CONCEPTS.has(entry.conceptName))throw new Error('Emergency Exit applies only to real Hunter positions');
    if(!openLike(entry.status))return{ok:false,closed:entry.status==='closed',skipped:'position_not_open',status:entry.status};
    if(entry.mode==='LIVE'&&!this.isLiveReady()){
      await this.db.audit('warning','emergency_exit_live_authorization_blocked',{id,ticker:entry.ticker,mode:this.settings.mode,liveArmed:this.settings.liveArmed===true,allowLiveTrading:env.allowLiveTrading,healthDegraded:this.health.degraded});
      return{ok:false,closed:false,skipped:'live_not_authorized'};
    }
    const out=await this.profitGuard.emergencyExit(entry);
    this.invalidateStateSnapshot();
    return{ok:Boolean(out.closed||out.pending),entryId:id,ticker:entry.ticker,conceptName:entry.conceptName,...out};
  }

  async manualCashout({ entryIds = null, allProfitable = false } = {}, reason = 'manual_cashout') {
    if(Array.isArray(entryIds)){const rows=await Promise.all(entryIds.map((id)=>this.db?.entryById?.(id).catch(()=>null)));if(rows.some(isShadowSaintEntry)){await this.audit("shadow_saint_broker_wall",{path:"manualCashout"});return {ok:false,reason:"shadow_saint_no_broker"};}}
    const open = (typeof this.db.openHunterEntries==='function'
      ? await this.db.openHunterEntries(this.settings.systemName)
      : (await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)))
      .filter((e) => e.status === 'open' && (!entryIds || entryIds.includes(e.id)));
    if (!allProfitable && !Array.isArray(entryIds)) throw new Error('Provide entryIds or allProfitable');
    let manualTrainingContext=null;
    if (reason === 'manual_cashout') {
      manualTrainingContext=await this.goldenEye?.beginManualTraining?.(open,Date.now(),{allProfitable}).catch(async(error)=>{
        await this.db.audit('warning','golden_eye_manual_training_begin_error',{message:String(error?.message||error)}).catch(()=>{});
        return null;
      });
    }
    const rows = await mapLimit(open, reason === 'golden_eye_cashout' ? GOLDEN_EYE.maximumParallelCashouts : Math.min(4, GOLDEN_EYE.maximumParallelCashouts), async (e) => {
      try {
        let q = this.market.getQuote(e.ticker);
        if (!q || this.market.quoteAgeMs(e.ticker) > DISPLAY_QUOTE_FRESH_MS) q = await this.market.refreshTicker(e.ticker).catch(() => null);
        if (!q) return { kind:'skipped', value:{ id:e.id,ticker:e.ticker,reason:'market_data_unavailable' } };
        const out = await this.profitGuard.manualCashout(e, q, { reason });
        if (out.closed) {
          const fresh = await this.db.entryById(e.id);
          const pnlCents = fresh?.pnlCents ?? out.pnlCents ?? 0;
          return { kind:'closed', value:{ id:e.id,ticker:e.ticker,exitPriceCents:fresh?.exitPriceCents ?? q.yesBid,pnlCents,realizedThisActionCents:Number(pnlCents)-Number(e.pnlCents||0) } };
        }
        if (out.reopened && Number(out.filled || 0) > 0) {
          return { kind:'partial', value:{ id:e.id,ticker:e.ticker,filled:Number(out.filled||0),remaining:Number(out.remaining||0),fillPriceCents:Number(out.fillPriceCents||0),realizedThisActionCents:Number(out.pnlCents||0)-Number(e.pnlCents||0) } };
        }
        if (out.pending) return { kind:'pending', value:{ id:e.id,ticker:e.ticker,reason:out.skipped || 'exit_pending' } };
        return { kind:'skipped', value:{ id:e.id,ticker:e.ticker,reason:out.skipped || 'not_closed',netPnlCents:out.netPnlCents } };
      } catch (error) {
        const message=String(error?.message||error||'cashout_error');
        await this.db.audit('error', reason === 'golden_eye_cashout' ? 'golden_eye_cashout_entry_error' : 'manual_cashout_entry_error', {id:e.id,ticker:e.ticker,message}).catch(()=>{});
        return { kind:'error', value:{ id:e.id,ticker:e.ticker,reason:'cashout_error',message } };
      }
    });
    const closed=rows.filter((x)=>x?.kind==='closed').map((x)=>x.value);
    const partial=rows.filter((x)=>x?.kind==='partial').map((x)=>x.value);
    const pending=rows.filter((x)=>x?.kind==='pending').map((x)=>x.value);
    const skipped=rows.filter((x)=>x?.kind==='skipped').map((x)=>x.value);
    const errors=rows.filter((x)=>x?.kind==='error').map((x)=>x.value);
    const totalProfitCents=[...closed,...partial].reduce((sum,x)=>sum+Number(x.realizedThisActionCents||0),0);
    const result={
      closed,partial,pending,skipped,errors,
      closedCount:closed.length,partialCount:partial.length,pendingCount:pending.length,skippedCount:skipped.length,errorCount:errors.length,
      totalProfitCents,reason,
    };
    if (reason === 'manual_cashout' && manualTrainingContext) {
      await this.goldenEye?.completeManualTraining?.(manualTrainingContext,result,Date.now()).catch(async(error)=>{
        await this.db.audit('warning','golden_eye_manual_training_complete_error',{message:String(error?.message||error)}).catch(()=>{});
      });
    }
    this.invalidateStateSnapshot();
    return result;
  }

  athenaBrainDocument() {
    const memory=this.athenaCommander?.memory||null;if(!memory)throw new Error('Athena A3 is not ready');
    return{format:'SAGITTARIUS-ATHENA-A3-ECONOMIC-SURVIVAL-MEMORY',formatVersion:3,exportedAt:new Date().toISOString(),brain:{version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,memory,summary:this.athenaCommander.summary()}};
  }

  async assertAthenaMutationSafe(action='change'){
    if(this.settings.mode!=='SIMULATION'||this.settings.liveArmed===true)throw new Error(`Athena ${action} is allowed only in SIMULATION with LIVE disarmed`);
    if(this.settings.engineActive!==false)throw new Error(`Stop the engine before Athena ${action}`);
    const active=(typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):(await this.db.openEntries(this.settings.systemName)).filter(e=>PORTFOLIO_CONCEPTS.has(e.conceptName))).filter(e=>openLike(e.status));
    if(active.length)throw new Error(`Close all active real Hunters before Athena ${action}`);
  }

  async installAthenaBrain(){throw new Error('Athena A3 is database-derived and continuously learned; direct brain import is disabled');}

  async rebuildAthenaBrain(){await this.assertAthenaMutationSafe('rebuild');const memory=await this.athenaCommander.refreshLearning();return{ok:true,athena:this.athenaCommander.summary(),memory};}

  starlightRecoveryDiagnostics(limit=32){
    const scope=[...(this.starlightRecoveryWatches?.values?.()||[])].filter(w=>this.starlightScopeMatches(w));
    const byStatus={};
    for(const w of scope){const k=String(w.status||'UNKNOWN');byStatus[k]=(byStatus[k]||0)+1;}
    return {version:'SE2-R9-RECOVERY-DIAGNOSTICS',activation:'durable_aurora_hard_stop_only',
      athenaStarlightTrigger:{version:ATHENA_STARLIGHT_TRIGGER_VERSION,reference:'ORIGINAL_ATHENA_ENTRY',...athenaStarlightTriggerConfig(this.settings)},
      strategicClockGate:false,ordinaryCooldownGate:false,ordinaryEventCapGate:false,
      ordinaryTickerCrossAttackGate:false,marketFinalityRequired:true,
      watchExpiry:'only_when_market_finalized_or_operator_reset',
      executionSafety:'live_arming_book_spread_liquidity_capital_capacity_aurora_parent_CAS_broker_receipts',
      stats:{...(this.starlightRecoveryStats||{})},activeWatchCount:scope.length,byStatus,
      recoveryRestPollLastAtMs:Number(this.starlightRecoveryLastPollMs||0),
      recoveryReadyWakeLastAtMs:Number(this.starlightRecoveryLastWakeMs||0),
      independentMaintenance:this.starlightRecoveryMaintenanceState||{},
      recoveryWakeRotationCursor:Number(this.starlightRecoveryWakeCursor||0),
      recoveryOrphanLastCheckAtMs:Number(this.starlightRecoveryLastOrphanCheckMs||0),
      recoveryBootPending:Boolean(this.starlightRecoveryBootPending),
      recoveryPendingQuoteCount:[...(this.starlightRecoveryPendingQuotes?.values?.()||[])]
        .reduce((n,v)=>n+(Array.isArray(v)?v.length:0),0),
      recordsIncluded:Math.min(Math.max(0,Math.floor(Number(limit)||0)),scope.length),
      recordsAvailable:scope.length,
      watches:scope.slice(0,Math.max(0,Math.min(64,Math.floor(Number(limit)||0)))).map(w=>({
        authorizationId:w.authorizationId,parentEntryId:w.parentEntryId,ticker:w.ticker,
        status:w.status,revision:w.revision,armedAtMs:w.armedAtMs,releaseAtMs:w.releaseAtMs,
        expiresAtMs:w.expiresAtMs,stopPriceCents:w.stopPriceCents,
        parentConcept:w.parentConcept,athenaTrigger:w.athenaTrigger||null,athenaTriggerObservation:w.athenaTriggerObservation||null,
        peakSinceArmCents:w.peakSinceArmCents,troughSinceArmCents:w.troughSinceArmCents,
        crashConfirmedAtMs:w.crashConfirmedAtMs,upwardTicks:w.upwardTicks,
        lastBidCents:w.lastBidCents,lastAskCents:w.lastAskCents??null,
        lastSpreadCents:Number.isFinite(Number(w.lastAskCents))&&Number.isFinite(Number(w.lastBidCents))
          ?Number(w.lastAskCents)-Number(w.lastBidCents):null,
        operatorMinEntryCents:Number(this.settings.crashRecoveryMinEntryCents),
        operatorMaxEntryCents:Number(this.settings.crashRecoveryMaxEntryCents),
        lastQuoteAtMs:w.lastQuoteAtMs,lastQuoteEpoch:w.lastQuoteEpoch||null,
        lastQuoteRevision:Number(w.lastQuoteRevision||0),
        lastSignalReason:w.lastSignalReason,lastAttemptReason:w.lastAttemptReason||null,
        lastAttemptMessage:w.lastAttemptMessage||null,priceBandDecision:w.priceBandDecision||null,
        retryNotBeforeMs:w.retryNotBeforeMs||0,
      }))};
  }

  async diagnostics() {
    const base=await this.state();
    // R54: historical observability is explicit/on-demand. The 2-second SSE
    // state never pays these allocations, but a diagnostics download still
    // receives bounded research context for auditability.
    const detailJobs=[
      ()=>typeof this.db.trackerDashboardRows==='function'?this.db.trackerDashboardRows(this.settings.systemName,250):this.db.trackers(this.settings.systemName,250),
      ()=>this.db.patterns(this.settings.systemName),
      ()=>this.db.sportProfiles(),
      ()=>this.db.snapshots(this.settings.systemName,150),
      ()=>this.db.recentAudit(50),
      ()=>typeof this.db.crashEpisodes==='function'?this.db.crashEpisodes(this.settings.systemName,{limit:250}):[],
      ()=>typeof this.db.openEntries==='function'?this.db.openEntries(this.settings.systemName):[],
    ];
    const [trackedMarkets,patterns,sports,snapshots,audit,crashEpisodes,fullOpenEntries]=await mapLimit(detailJobs,STATE_DB_FANOUT_MAX,(job)=>job()).catch(()=>[base.trackedMarkets||[],[],[],[],base.audit||[],[],[]]);
    const feederSignalIntelligence={version:FEEDER_SIGNAL_INTELLIGENCE.version,role:FEEDER_SIGNAL_INTELLIGENCE.role,runtime:'DISABLED_R60_SHADOW_TABLE_REPLACES_QUOTE_RATE_FSI',healthy:true,records:[],recordsIncluded:0,recordsAvailable:0,summary:{signals:0,tracking:0,complete:0}};
    const diagnosticOpenHunters=(fullOpenEntries||[]).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)&&!isShadowSaintEntry(e)).map((e)=>this.decorateEntry(e));
    const boundedBase={...base,trackedMarkets,patterns,sports,snapshots,audit,crashEpisodes,athena:this.athena?.summary?.()||base.athena,crashLearning:this.learning?.crashLearningSummary?.()||base.crashLearning,entryPipeline:this.strategy?.entryPipelineSummary?.()||base.entryPipeline,entryCandidateFunnel:this.entryCandidateFunnelSummary(),starlightRecovery:this.starlightRecoveryDiagnostics(),openHunters:diagnosticOpenHunters,closedHunters:Array.isArray(base.closedHunters)?base.closedHunters.slice(0,150):[]};
    return {...boundedBase,feederSignalIntelligence,diagnosticExport:{version:'DX2',hardMaximumBytes:2_000_000,targetMaximumBytes:1_850_000,serialization:'compact_json',priority:'safety_runtime_performance_open_positions_stop_guard_then_recent_research',operationalStateHistoricalRows:false,onDemandResearch:true,closedHuntersIncluded:boundedBase.closedHunters?.length||0,closedHuntersAvailable:base.closedHunters?.length||0,fsiRecordsIncluded:feederSignalIntelligence?.recordsIncluded||0,fsiRecordsAvailable:feederSignalIntelligence?.recordsAvailable||0}};
  }

  async tradingLogText() {
    const p = await this.performance({fullHistory:true});
    const clean=(value,max=120)=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
    const money=(v)=>`$${(Number(v||0)/100).toFixed(2)}`;
    const c=(v)=>v==null?'-':`${Number(v).toFixed(Number.isInteger(Number(v))?0:2)}c`;
    const ms=(v)=>v==null?'-':`${Math.round(Number(v)/1000)}s`;
    const active=[...p.active].sort((a,b)=>{
      const ao=openLike(a.status)?1:0,bo=openLike(b.status)?1:0;
      if(ao!==bo)return bo-ao;
      return Number(b.updatedAtMs||b.closedAtMs||b.openedAtMs||0)-Number(a.updatedAtMs||a.closedAtMs||a.openedAtMs||0);
    });
    const lines = [
      '=== SAGITTARIUS TRADING LOGS ===',
      `Generated: ${new Date().toISOString()}`,
      `Release: ${RELEASE}`,
      'Format: TLX1 compact analysis log | Server hard cap: 2000000 UTF-8 bytes',
      `Loaded records (all classes): ${active.length} | LIGHTNING ONLY trades: ${p.hunters.length} | Open Lightning: ${p.open.length} | Closed Lightning: ${p.closed.length}`,
      `Wins: ${p.wins} | Losses: ${p.losses} | Scratches: ${p.scratches} | Realized P&L: ${money(p.hunterRealizedCents)} | Unrealized P&L: ${money(p.hunterUnrealizedCents)}`,
      'Fields: ticker | concept<-source | mode/status/data | entry/ref/signal/current/peak/stop | count/remain | pnl | MAE/low/MAEtime/recoveryEntry/recoveryGreen | postPrice/delta/bestExec/missed/worstExec/saved | reason | opened/closed',
      '',
    ];
    for (const raw of active) {
      const e = this.decorateEntry(raw);
      const hunter=PORTFOLIO_CONCEPTS.has(e.conceptName);
      const shownPnl = hunter && openLike(e.status) ? e.positionPnlCents : e.pnlCents;
      const source=e.sourceFeeder?`<-${clean(e.sourceFeeder,40)}`:'';
      const data=e.quoteAgeMs==null?clean(e.dataState,20):`${clean(e.dataState,20)}:${Math.round(Number(e.quoteAgeMs)/1000)}s`;
      const economics=FEEDER_CONCEPTS.has(e.conceptName) && e.signalPriceCents != null
        ? `sig=${c(e.signalPriceCents)},ref=${c(e.referenceOriginCents)},cur=${c(e.currentPriceCents)},peak=${c(e.peakPriceCents)}`
        : `entry=${c(e.entryPriceCents)},cur=${c(e.currentPriceCents)},peak=${c(e.peakPriceCents)},stop=${c(e.stopPriceCents)}`;
      const research=`mae=${c(e.maeCents)},low=${c(e.lowestPriceAfterEntryCents)},maet=${ms(e.maeAfterEntryMs)},rEntry=${ms(e.recoveryToEntryMs)},rGreen=${ms(e.recoveryToGreenMs)}`;
      const post=e.status==='closed'
        ? `post=${c(e.postExitCurrentPriceCents)},dExit=${c(e.postExitDeltaFromExitCents)},best=${c(e.postExitBestPriceCents)},missed=${e.postExitMissedUpsideCents==null?'-':money(e.postExitMissedUpsideCents)},worst=${c(e.postExitWorstPriceCents)},saved=${e.postExitLossAvoidedCents==null?'-':money(e.postExitLossAvoidedCents)},postDone=${e.postExitResearchComplete?'Y':'N'}`
        : 'post=-';
      lines.push([
        clean(e.ticker,120),
        `${clean(e.conceptName,50)}${source}`,
        `${clean(e.mode,12)}/${clean(e.status,24)}/${data}`,
        economics,
        `qty=${Number(e.count||0)},rem=${Number(e.remainingCount||0)}`,
        `pnl=${money(shownPnl)}`,
        research,
        post,
        `reason=${clean(e.closeReason,80)||'-'}`,
        `open=${Number(e.openedAtMs||0)},close=${Number(e.closedAtMs||0)||'-'}`,
      ].join(' | '));
    }
    return lines.join('\n');
  }

  async shutdown() {
    this.running = false;
    this.stopStarlightRecoveryMaintenance();
    if(this.resourceGovernorTimer)clearInterval(this.resourceGovernorTimer);
    this.resourceGovernorTimer=null;
    this.memoryTelemetry?.close?.();
    for (const timer of this.quoteProtectionTimers.values()) clearTimeout(timer);
    this.quoteProtectionTimers.clear();
    if (this.goldenEyeTimer) clearTimeout(this.goldenEyeTimer);
    this.goldenEyeTimer = null;
    this.goldenEyeRerunRequested = false;
    for (const timer of this.recoveryEvaluationTimers.values()) clearTimeout(timer);
    this.recoveryEvaluationTimers.clear();
    for (const timer of this.feederHunterEvaluationTimers.values()) clearTimeout(timer);
    this.feederHunterEvaluationTimers.clear();
    for(const timer of this.athenaOpportunityTimers.values())clearTimeout(timer);
    this.athenaOpportunityTimers.clear();
    if(this.lightningPlasmaTimer)clearTimeout(this.lightningPlasmaTimer);
    this.lightningPlasmaTimer=null;
    this.lightningPlasmaRerunRequested=false;
    for (const timer of this.crashRecoveryEvaluationTimers.values()) clearTimeout(timer);
    this.crashRecoveryEvaluationTimers.clear();
    this.entryAdmissionProbeAt?.clear?.();
    if (this.reconcileTimer) clearTimeout(this.reconcileTimer);
    this.cancelLiveAutoRearm();
    this.shadowStopping=true;
    if(this.shadowSweepPromise)await this.shadowSweepPromise;
    this.market?.stop();
    const goldenEyePending=[this.goldenEyeEvaluationPromise,this.goldenEyeExecutionPromise].filter(Boolean);
    if(goldenEyePending.length)await Promise.race([Promise.allSettled(goldenEyePending),sleep(2000)]).catch(()=>{});
    await this.goldenEye?.persist?.(true).catch(()=>{});
    // PLI1 is deliberately off the protection critical path. On orderly
    // shutdown, give already-queued observations a bounded chance to persist
    // before closing PostgreSQL; shutdown can never wait indefinitely on
    // learning I/O.
    await this.profitGuard?.flushProfitLearningQueues?.(2000).catch(()=>false);
    await this.learning?.flushProfitProfileRebuild?.(2000).catch(()=>false);
    await this.profitGuard?.flushPostExitPersistence?.(2000).catch(()=>false);
    await this.feederSignalIntel?.flush?.(2000).catch(()=>false);
    await this.learning?.flushCrashPersistence?.(2000).catch(()=>false);
    await this.atomicThunderBolt?.flushCounterfactualCompletions?.(2000).catch(()=>false);
    await this.db.close();
  }
}
