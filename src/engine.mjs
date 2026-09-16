import { setTimeout as sleep } from 'node:timers/promises';
import { createHash } from 'node:crypto';
import { env, freshInstallSettings, factoryOperatorSettingsPatch, normalizeStartupExecutionMode, deploymentConfigRecord, applyJusticeArrowPostScarletV3Migration, EDITABLE_NUMERIC_SETTINGS, EDITABLE_BOOLEAN_SETTINGS, RELEASE } from './config.mjs';
import { Database, LOW_PRIORITY_DB_PERSISTENCE } from './db.mjs';
import { KalshiClient } from './kalshi.mjs';
import { MarketHub } from './market.mjs';
import { LearningEngine, classifyDeterministic } from './learning.mjs';
import { Athena, ATHENA_BRAIN, ATHENA_B2, AthenaCommander } from './athena.mjs';
import { StrategyEngine, activeCosmoSources, lightningPlasmaFieldSelection, anotherDimensionQualification, crystalWallSignalState, justiceArrowSignalState, recoverySignalState, plasmaSignalState, megaWaveSaintSignalState, isModelEnabled } from './strategy.mjs';
import { ProfitGuard } from './profitGuard.mjs';
import { GoldenEye } from './goldenEye.mjs';
import { FEEDER_SIGNAL_INTELLIGENCE } from './feederSignalIntel.mjs';
import { PhoenixCosmoEngine } from './phoenix.mjs';
import { PORTFOLIO_CONCEPTS, ACTIVE_PORTFOLIO_CONCEPTS, RETIRED_PORTFOLIO_CONCEPTS, FEEDER_CONCEPTS, ACTIVE_FEEDER_CONCEPTS, RETIRED_FEEDER_CONCEPTS, SHADOW_ATTACK_CONCEPTS, EXECUTION_ATTACK_DISPLAY, GALACTIC_EXPLOSION, MEGA_WAVE, COSMO_ROUTING, LIGHTNING_PLASMA, PHOENIX_COSMO, ATHENA_EXCLAMATION, SCARLET_NEEDLE, CRYSTAL_WALL, GEMINI_UNIVERSE, ANOTHER_DIMENSION, SAGITTARIUS_JUSTICE_ARROW, AURORA_EXECUTION, kalshiGeneralTakerFeeEstimateCents, computeLiveStatus, MOMENTUM, RECOVERY, ULTIMATE_STOP_GUARD, STOP_LOSS_WATCHDOG, STOP_GUARD_RECOVERY_LEARNING, ULTIMATE_PROFIT_GUARD, APEX_PROFIT_GUARD, PROTECTED_RUNNER_INTELLIGENCE, PROFIT_LEARNING_INTELLIGENCE, ATHENA_EXIT_INTELLIGENCE, GOLDEN_EYE, ATOMIC_THUNDER, ATOMIC_THUNDER_BOLT, ATOMIC_THUNDER_PATTERN_GUARDIAN, COSMO_SHADOW_TRADING, ATHENA_COMMANDER, ARAYASHIKI, INFINITY_BREAK, POST_EXIT_RESEARCH, MARKET_FAMILY_EXECUTION_EXCLUSION, executionMarketFamilyExclusion } from './doctrine.mjs';
import { GameClockAuthority, GAME_CLOCK_AUTHORITY, isConfirmedGameClockState, isEntryAuthorizedGameClockState } from './gameClock.mjs';
import { AtomicThunderBoltEngine, atomicThunderBoltFeatures } from './opportunity.mjs';
import { ConstellationHost, CONSTELLATION, COSMOS_IDS, normalizeCosmosId, cosmosSettingsKey, isolateBook, emptyCosmosBooks, FairScanScheduler, inCosmosClockWindow, watchdogDiscoveryTokens, watchdogMayDiscover } from './constellation.mjs';

const openLike = (s) => ['open', 'entry_pending', 'exit_pending', 'pending_recovery'].includes(s);
const centsNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const waitUntil = async (ms) => { if (ms > 0) await sleep(ms); };
const FINAL_STATUSES = new Set(['finalized', 'settled']);
const PROTECTION_BACKUP_MS = 1500;
const GOLD_SAINT_ATTACKS = new Set(['Wave Surfer','Crash Recovery Hunter','Momentum Hunter','Lightning Plasma']);
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
export class CoalescingWorkQueue {
  constructor({ maxConcurrency=4, onError=null }={}) {
    this.maxConcurrency=Math.max(1,Math.floor(Number(maxConcurrency)||1));
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
  snapshot(){return{maxConcurrency:this.maxConcurrency,active:this.activeCount,pending:this.pending.size,rerun:this.rerun.size,totalStarted:this.totalStarted,totalCoalesced:this.totalCoalesced,maxObservedActive:this.maxObservedActive};}
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
    this.constellation = new ConstellationHost();
    this.cosmosBooks = emptyCosmosBooks();
    this.fairScan = new FairScanScheduler({ ids: COSMOS_IDS, budget: CONSTELLATION.fairScanBudget });
    this.cosmosWindowById = Object.fromEntries(COSMOS_IDS.map((id)=>({id,minGameMinutes:0,maxGameMinutes:0})).map((x)=>[x.id,{minGameMinutes:x.minGameMinutes,maxGameMinutes:x.maxGameMinutes}]));
    this.constellationScan = { lastAtMs:0, evaluated:[], discoverOnce:true, probeOwner:'host', windows:{} };
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
    this.scarletContinuationStats = {version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,duplicateSuppressed:0,maxRepeatBlocked:0,modeMismatchBlocked:0,firstProofArmed:0,secondProofArmed:0,thirdProofCertified:0,proofLossResets:0,proofHistoryBlocked:0,lastEvent:null};
    this.scarletContinuationQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','scarlet_continuation_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.crystalWallContinuationInFlight = new Set();
    this.crystalWallWatches = new Map();
    this.crystalWallContinuationStats = {version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,lastEvent:null};
    this.crystalWallConsumedEpisodeIds = new Set();
    this.crystalWallShadowOpenByTicker = new Map();
    this.crystalWallShadowRecent = new Map();
    this.crystalWallShadowRuntime = new Map();
    this.crystalWallContinuationQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','crystal_wall_v3_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.crystalWallShadowQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','crystal_wall_shadow_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
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
    this.justiceArrowQueue = new CoalescingWorkQueue({
      maxConcurrency:1,
      onError:async(error,key)=>{await this.db.audit('error','justice_arrow_v3_queue',{key,message:String(error?.message||error)}).catch(()=>{});},
    });
    this.justiceArrowStats = {version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,eligible:0,parentArmed:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,modeMismatchBlocked:0,lastEvent:null};
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
    if(!this.scarletContinuationStats||typeof this.scarletContinuationStats!=='object')this.scarletContinuationStats={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,eligible:0,authorized:0,attempted:0,opened:0,blocked:0,duplicateSuppressed:0,maxRepeatBlocked:0,modeMismatchBlocked:0,firstProofArmed:0,secondProofArmed:0,thirdProofCertified:0,proofLossResets:0,proofHistoryBlocked:0,lastEvent:null};
    const stats=this.scarletContinuationStats;
    stats.version=SCARLET_NEEDLE.version;
    stats.policyRevision=SCARLET_NEEDLE.policyRevision;
    for(const key of ['eligible','authorized','attempted','opened','blocked','duplicateSuppressed','maxRepeatBlocked','modeMismatchBlocked','firstProofArmed','secondProofArmed','thirdProofCertified','proofLossResets','proofHistoryBlocked']){
      if(!Number.isFinite(Number(stats[key])))stats[key]=0;
    }
    return stats;
  }

  megaWaveGrantFromEpisode(episode){
    const grant=episode?.athenaDecision?.megaWaveGrant;return grant&&grant.version===MEGA_WAVE.version?structuredClone(grant):null;
  }

  queueMegaWaveAthenaClose(entry){
    const id=String(entry?.id||'');if(!id)return false;
    return this.entryEvaluationQueue.enqueue(`mega-wave-athena-close:${id}`,()=>this.handleMegaWaveAthenaClose(entry));
  }

  async handleMegaWaveAthenaClose(entry){
    const stats=this.megaWaveRuntime(),s=this.settings||{},id=String(entry?.id||''),ticker=String(entry?.ticker||'');
    if(!id||!ticker||String(entry?.conceptName||'')!=='Athena Exclamation'||entry?.status!=='closed'||Number(entry?.remainingCount||0)>1e-9)return{status:'IGNORED'};
    const marketFamilyExclusion=executionMarketFamilyExclusion(ticker,this.settings);
    if(marketFamilyExclusion.blocked){
      stats.lastEvent={status:'MARKET_FAMILY_EXCLUSION',atMs:Date.now(),entryId:id,ticker,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
      await this.db?.audit?.('info','mega_wave_athena_market_family_grant_blocked',{entryId:id,ticker,marketFamilyExclusion}).catch(()=>{});
      return{status:'BLOCKED',reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
    }
    if(typeof this.db?.entryById!=='function')return{status:'BLOCKED',reason:'durable_parent_read_unavailable'};
    const durable=await this.db.entryById(id).catch(()=>null),mw=durable?.entryConfig?.athenaExclamation?.megaWaveAuthorization||durable?.entryConfig?.megaWave||{};
    const roomOk=Boolean(normalizeCosmosId(durable?.systemName)||String(durable?.systemName||'')===String(s.systemName||''));
    const durableOk=String(durable?.id||'')===id&&roomOk&&String(durable?.ownerId||'')===String(s.ownerId)&&String(durable?.mode||'')===String(s.mode||'')&&String(durable?.conceptName||'')==='Athena Exclamation'&&String(durable?.ticker||'')===ticker&&String(durable?.status||'')==='closed';
    if(!durableOk)return{status:'BLOCKED',reason:'athena_parent_provenance_invalid'};
    if(!(Number(durable?.pnlCents||0)>0)){
      stats.athenaLossStops=Number(stats.athenaLossStops||0)+1;stats.lastEvent={status:'ATHENA_LOSS_CHAIN_STOP',atMs:Date.now(),entryId:id,ticker,pnlCents:Number(durable?.pnlCents||0)};
      await this.db.audit('info','mega_wave_athena_loss_chain_stopped',{entryId:id,ticker,pnlCents:Number(durable?.pnlCents||0),closeReason:durable?.closeReason||null}).catch(()=>{});
      return{status:'CHAIN_STOPPED',reason:'athena_not_profitable'};
    }
    const grantId=`MEGA-WAVE:GRANT:${id}`;
    const followUpRaw=mw.followUpAttacksAtEntry!=null?mw.followUpAttacksAtEntry:s.athenaExclamationFollowUpAttacks;
    const followUpNumber=Number(followUpRaw);
    const limit=Math.max(0,Math.min(MEGA_WAVE.maximumFollowUpAttacks,Math.floor(Number.isFinite(followUpNumber)?followUpNumber:Number(MEGA_WAVE.defaultFollowUpAttacks||0))));
    const frozenSaints=Array.isArray(mw.enabledSaintsAtEntry)?mw.enabledSaintsAtEntry:[];
    const liveSaints=MEGA_WAVE.downstreamSaints.filter((name)=>isModelEnabled(s,name));
    const eligible=(frozenSaints.length?frozenSaints:liveSaints).filter((x)=>MEGA_WAVE.downstreamSaints.includes(String(x)));
    const existing=typeof this.db?.opportunityEpisode==='function'?await this.db.opportunityEpisode(grantId).catch(()=>null):null;
    if(existing){const grant=this.megaWaveGrantFromEpisode(existing);if(grant){this.installMegaWaveGrant(grant,durable);return{status:grant.status||'ACTIVE',grant};}}
    const createdAtMs=Date.now();
    const grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:id,parentConcept:'Athena Exclamation',ticker,eventTicker:String(durable.eventTicker||ticker),ownerId:String(durable.ownerId||''),systemName:String(durable.systemName||''),mode:String(durable.mode||''),createdAtMs,limit,eligibleSaints:[...eligible],allocationDoctrine:MEGA_WAVE.allocationDoctrine,reservations:{},status:limit<=0||eligible.length===0?'COMPLETE':'ACTIVE',parentRealizedPnlCents:Number(durable.pnlCents||0),parentCloseReason:String(durable.closeReason||''),parentClosedAtMs:Number(durable.closedAtMs||createdAtMs)};
    await this.db.upsertOpportunityEpisode({id:grantId,systemName:String(durable.systemName||s.systemName),sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:grant.eventTicker,side:'YES',sport:String(durable.sport||'Unknown'),boltAtMs:grant.parentClosedAtMs,boltSnapshot:{version:MEGA_WAVE.version,parentEntryId:id},athenaDecision:{decision:grant.status,reason:'profitable_athena_exclamation_close',megaWaveGrant:grant},fireCommand:{},attackSelected:null,entryId:null,entryAtMs:null,outcome:{parentRealizedPnlCents:Number(durable.pnlCents||0)},outcomeLabel:'MEGA_WAVE_ATHENA_PROFIT_GRANT',trackingComplete:grant.status==='COMPLETE',updatedAtMs:createdAtMs});
    stats.athenaProfitGrants=Number(stats.athenaProfitGrants||0)+1;stats.lastEvent={status:'GRANT_CREATED',atMs:createdAtMs,grantId,parentEntryId:id,ticker,limit,eligibleSaints:eligible};
    this.installMegaWaveGrant(grant,durable);
    return{status:grant.status,grant};
  }

  installMegaWaveGrant(grant,parentEntry=null){
    this.megaWaveRuntime();if(!grant?.grantId||grant.status!=='ACTIVE')return false;
    if(executionMarketFamilyExclusion(grant.ticker,this.settings).blocked)return false;
    this.megaWaveGrants.set(String(grant.grantId),structuredClone(grant));
    const seedEntry=Number(parentEntry?.entryPriceCents||0),seedExit=Number(parentEntry?.exitPriceCents||0),seedPeak=Math.max(seedEntry,seedExit,Number(parentEntry?.peakPriceCents||0));
    for(const concept of [...(grant.eligibleSaints||[])].sort()){
      const r=grant.reservations?.[concept];if(r?.status==='OPENED'||r?.status==='RESERVED')continue;
      const key=`${grant.grantId}|${concept}`;
      if(!this.megaWaveSaintWatches.has(key))this.megaWaveSaintWatches.set(key,{grantId:grant.grantId,saintConcept:concept,parentEntryId:grant.parentEntryId,parentConcept:'Athena Exclamation',ticker:grant.ticker,eventTicker:grant.eventTicker,parentEntryPriceCents:seedEntry,parentExitPriceCents:seedExit,peakCents:seedPeak,troughCents:seedExit||seedPeak,lastBidCents:seedExit||seedPeak,upwardTicks:0,stableObservations:0,crashArmed:false,startedAtMs:Number(grant.parentClosedAtMs||Date.now())});
    }
    return true;
  }

  async hydrateMegaWaveGrants(){
    this.megaWaveRuntime();if(typeof this.db?.opportunityEpisodes!=='function')return 0;
    const seen=new Set();const rows=[];
    for(const id of [this.settings?.systemName,...COSMOS_IDS]){
      const key=String(id||'');if(!key||seen.has(key))continue;seen.add(key);
      rows.push(...(await this.db.opportunityEpisodes(key,{limit:5000,trackingComplete:false}).catch(()=>[])));
    }
    let n=0;
    for(const row of rows){if(!String(row?.id||'').startsWith('MEGA-WAVE:GRANT:'))continue;const grant=this.megaWaveGrantFromEpisode(row);if(!grant||grant.status!=='ACTIVE')continue;const marketFamilyExclusion=executionMarketFamilyExclusion(grant.ticker,this.settings);if(marketFamilyExclusion.blocked){grant.status='COMPLETE';grant.completedReason=MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode;grant.completedAtMs=Date.now();grant.marketFamilyExclusion=structuredClone(marketFamilyExclusion);await this.persistMegaWaveGrantEpisode(row,grant,true).catch(()=>{});await this.db?.audit?.('info','mega_wave_market_family_grant_hydration_blocked',{grantId:grant.grantId,ticker:grant.ticker,marketFamilyExclusion}).catch(()=>{});continue;}const parent=typeof this.db?.entryById==='function'?await this.db.entryById(grant.parentEntryId).catch(()=>null):null;if(!parent)continue;if(this.installMegaWaveGrant(grant,parent))n+=1;}
    return n;
  }

  async recoverMegaWaveAthenaCloseHandoffs(){
    const stats=this.megaWaveRuntime(),s=this.settings||{};
    if(typeof this.db?.entriesByConcept!=='function'||typeof this.db?.entryById!=='function'||typeof this.db?.opportunityEpisode!=='function'||typeof this.db?.upsertOpportunityEpisode!=='function')return 0;
    const resetAt=Math.max(0,Number(s.resetTimestampMs||0));
    const seenBooks=new Set();const rows=[];
    for(const id of [s.systemName,...COSMOS_IDS]){
      const key=String(id||'');if(!key||seenBooks.has(key))continue;seenBooks.add(key);
      rows.push(...(await this.db.entriesByConcept(key,MEGA_WAVE.athenaConcept,{limit:2000,includeArchived:false}).catch(()=>[])));
    }
    const candidates=(rows||[]).filter((row)=>{
      const openedAt=Math.max(0,Number(row?.openedAtMs||0)),closedAt=Math.max(0,Number(row?.closedAtMs||0));
      if(String(row?.ownerId||'')!==String(s.ownerId)||String(row?.mode||'')!==String(s.mode||''))return false;
      if(!(normalizeCosmosId(row?.systemName)||String(row?.systemName||'')===String(s.systemName)))return false;
      if(String(row?.conceptName||'')!==String(MEGA_WAVE.athenaConcept)||String(row?.status||'')!=='closed'||Number(row?.remainingCount||0)>1e-9||!(Number(row?.pnlCents||0)>0))return false;
      if(!(openedAt>0&&closedAt>=openedAt))return false;
      if(resetAt>0)return openedAt>=resetAt&&closedAt>=resetAt;
      return true;
    }).sort((a,b)=>Number(a.closedAtMs||0)-Number(b.closedAtMs||0)||String(a.id||'').localeCompare(String(b.id||'')));
    let recovered=0;
    for(const row of candidates){
      const grantId=`MEGA-WAVE:GRANT:${String(row.id)}`;
      const existing=await this.db.opportunityEpisode(grantId).catch(()=>null);
      if(existing){const grant=this.megaWaveGrantFromEpisode(existing);if(grant?.status==='ACTIVE')this.installMegaWaveGrant(grant,row);continue;}
      const out=await this.handleMegaWaveAthenaClose(row).catch(()=>null);
      if(out?.grant){recovered+=1;stats.recoveredAthenaProfitHandoffs=Number(stats.recoveredAthenaProfitHandoffs||0)+1;await this.db.audit('warning','mega_wave_athena_profit_handoff_recovered',{entryId:row.id,ticker:row.ticker,closeReason:row.closeReason,pnlCents:Number(row.pnlCents||0),closedAtMs:Number(row.closedAtMs||0),grantId,status:out.status}).catch(()=>{});}
    }
    return recovered;
  }

  observeMegaWaveQuote(q){
    if(!q?.ticker||!(this.megaWaveSaintWatches instanceof Map)||!this.megaWaveSaintWatches.size)return false;
    const ticker=String(q.ticker),matches=[...this.megaWaveSaintWatches.entries()].filter(([,w])=>String(w?.ticker||'')===ticker).sort((a,b)=>String(a[1]?.saintConcept||'').localeCompare(String(b[1]?.saintConcept||'')));
    const final=Boolean(q?.result)||['closed','final','settled','determined'].includes(String(q?.status||'').toLowerCase());
    if(final){for(const [,w] of matches)this.queueMegaWaveGrantExpiry(w.grantId,'market_final');return matches.length>0;}
    for(const [key,prior] of matches){const result=megaWaveSaintSignalState(prior.saintConcept,prior,q,this.settings,Date.now());this.megaWaveSaintWatches.set(key,result.watch);if(result.qualified)this.queueMegaWaveSaintAttempt(prior.grantId,prior.saintConcept);}
    return matches.length>0;
  }

  queueMegaWaveGrantExpiry(grantId,reason='market_final'){
    if(!(this.megaWaveSaintQueue instanceof CoalescingWorkQueue))this.megaWaveSaintQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','mega_wave_saint_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    return this.megaWaveSaintQueue.enqueue(`expire:${grantId}`,()=>this.completeMegaWaveGrant(grantId,reason));
  }

  async completeMegaWaveGrant(grantId,reason='market_final'){
    if(typeof this.db?.acquireHunterTickerLock!=='function')return{status:'BLOCKED',reason:'durable_grant_lock_unavailable'};
    const unlock=await this.db.acquireHunterTickerLock(this.settings.systemName,`mega-wave-grant:${grantId}`);if(!unlock)return{status:'BUSY'};
    try{const episode=await this.db.opportunityEpisode(grantId).catch(()=>null),grant=this.megaWaveGrantFromEpisode(episode);if(!grant||grant.status!=='ACTIVE')return{status:'IGNORED'};grant.status='COMPLETE';grant.completedReason=reason;grant.completedAtMs=Date.now();await this.persistMegaWaveGrantEpisode(episode,grant,true);this.megaWaveGrants.delete(grantId);for(const key of [...this.megaWaveSaintWatches.keys()])if(key.startsWith(`${grantId}|`))this.megaWaveSaintWatches.delete(key);return{status:'COMPLETE',grant};}finally{try{await unlock();}catch{}}
  }

  queueMegaWaveSaintAttempt(grantId,concept){
    if(!(this.megaWaveSaintQueue instanceof CoalescingWorkQueue))this.megaWaveSaintQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','mega_wave_saint_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    return this.megaWaveSaintQueue.enqueue(`${grantId}|${concept}`,()=>this.attemptMegaWaveSaint(grantId,concept));
  }

  async persistMegaWaveGrantEpisode(episode,grant,trackingComplete=false){
    await this.db.upsertOpportunityEpisode({...episode,athenaDecision:{decision:grant.status,reason:'mega_wave_grant_state',megaWaveGrant:grant},trackingComplete,updatedAtMs:Date.now()});
  }

  async attemptMegaWaveSaint(grantId,concept){
    const stats=this.megaWaveRuntime(),s=this.settings||{};let unlock=null,episode=null,grant=null,reservation=null;
    try{
      if(typeof this.db?.acquireHunterTickerLock!=='function')return{status:'BLOCKED',reason:'durable_grant_lock_unavailable'};
      unlock=await this.db.acquireHunterTickerLock(s.systemName,`mega-wave-grant:${grantId}`);if(!unlock)return{status:'BUSY'};
      episode=await this.db.opportunityEpisode(grantId).catch(()=>null);grant=this.megaWaveGrantFromEpisode(episode);if(!grant||grant.status!=='ACTIVE'||!grant.eligibleSaints.includes(concept))return{status:'IGNORED'};
      const marketFamilyExclusion=executionMarketFamilyExclusion(grant.ticker,this.settings);if(marketFamilyExclusion.blocked){grant.status='COMPLETE';grant.completedReason=MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode;grant.completedAtMs=Date.now();grant.marketFamilyExclusion=structuredClone(marketFamilyExclusion);await this.persistMegaWaveGrantEpisode(episode,grant,true);this.megaWaveGrants.delete(grantId);for(const key of [...this.megaWaveSaintWatches.keys()])if(key.startsWith(`${grantId}|`))this.megaWaveSaintWatches.delete(key);stats.saintBlocked=Number(stats.saintBlocked||0)+1;await this.db?.audit?.('info','mega_wave_saint_market_family_execution_blocked',{grantId,concept,ticker:grant.ticker,marketFamilyExclusion}).catch(()=>{});return{status:'BLOCKED',reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};}
      const reservations={...(grant.reservations||{})},current=reservations[concept];if(current?.status==='OPENED'||current?.status==='RESERVED')return{status:'DUPLICATE_SUPPRESSED'};
      const used=Object.values(reservations).filter(x=>x?.status==='OPENED'||x?.status==='RESERVED').length;if(used>=Number(grant.limit||0)){grant.status='COMPLETE';await this.persistMegaWaveGrantEpisode(episode,grant,true);this.megaWaveGrants.delete(grantId);return{status:'EXHAUSTED'};}
      const reservationId=`${grantId}:SAINT:${concept}`;reservation={status:'RESERVED',reservationId,reservedAtMs:Date.now(),saintConcept:concept};reservations[concept]=reservation;grant.reservations=reservations;await this.persistMegaWaveGrantEpisode(episode,grant,false);stats.saintReserved=Number(stats.saintReserved||0)+1;
    }finally{if(unlock){try{await unlock();}catch{}unlock=null;}}
    const parent=await this.db.entryById(grant.parentEntryId).catch(()=>null),q=this.market?.getQuote?.(grant.ticker),watch=this.megaWaveSaintWatches.get(`${grantId}|${concept}`)||{};
    const authorization={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId:reservation.reservationId,parentEntryId:grant.parentEntryId,parentConcept:'Athena Exclamation',saintConcept:concept,ticker:grant.ticker,eventTicker:grant.eventTicker,allocationDoctrine:grant.allocationDoctrine,reservedAtMs:reservation.reservedAtMs,limit:Number(grant.limit||0)};
    let opened=null;if(parent&&q){
      const cosmosId=normalizeCosmosId(grant.systemName)||normalizeCosmosId(parent.systemName)||normalizeCosmosId(s.systemName);
      opened=cosmosId
        ? await this.withCosmosSettings(cosmosId,()=>this.strategy.executeMegaWaveSaint(q,parent,authorization,watch)).catch(()=>null)
        : await this.strategy.executeMegaWaveSaint(q,parent,authorization,watch).catch(()=>null);
    }
    try{
      if(typeof this.db?.acquireHunterTickerLock!=='function')return{status:'BLOCKED_AFTER_EXECUTION',entry:opened,reason:'durable_grant_lock_unavailable'};
      unlock=await this.db.acquireHunterTickerLock(s.systemName,`mega-wave-grant:${grantId}`);if(!unlock)return{status:'BUSY_AFTER_EXECUTION',entry:opened};
      episode=await this.db.opportunityEpisode(grantId).catch(()=>episode);grant=this.megaWaveGrantFromEpisode(episode)||grant;const reservations={...(grant.reservations||{})};
      if(opened){reservations[concept]={...reservation,status:'OPENED',entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now())};stats.saintOpened=Number(stats.saintOpened||0)+1;this.megaWaveSaintWatches.delete(`${grantId}|${concept}`);}else{reservations[concept]={...reservation,status:'RELEASED',releasedAtMs:Date.now(),reason:'entry_pipeline_blocked'};stats.saintBlocked=Number(stats.saintBlocked||0)+1;}
      grant.reservations=reservations;const used=Object.values(reservations).filter(x=>x?.status==='OPENED').length;const remainingEligible=(grant.eligibleSaints||[]).some(x=>reservations[x]?.status!=='OPENED');const complete=used>=Number(grant.limit||0)||!remainingEligible;grant.status=complete?'COMPLETE':'ACTIVE';await this.persistMegaWaveGrantEpisode(episode,grant,complete);
      if(complete)this.megaWaveGrants.delete(grantId);else this.megaWaveGrants.set(grantId,structuredClone(grant));
      return{status:opened?'OPENED':'RELEASED',entry:opened,grant};
    }finally{if(unlock)try{await unlock();}catch{}}
  }

  megaWaveRuntime() {
    if(!(this.megaWaveAthenaInFlight instanceof Set))this.megaWaveAthenaInFlight=new Set();
    if(!(this.megaWaveGrants instanceof Map))this.megaWaveGrants=new Map();
    if(!(this.megaWaveSaintWatches instanceof Map))this.megaWaveSaintWatches=new Map();
    if(!(this.athenaExclamationConfirmationWatches instanceof Map))this.athenaExclamationConfirmationWatches=new Map();
    if(!this.megaWaveStats||typeof this.megaWaveStats!=='object')this.megaWaveStats={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,firstProofArmed:0,secondProofArmed:0,tripleCertified:0,crystalProofCertified:0,proofStageArmed:{},athenaOpened:0,athenaProfitGrants:0,recoveredAthenaProfitHandoffs:0,athenaLossStops:0,saintReserved:0,saintOpened:0,saintBlocked:0,lastEvent:null};
    if(!this.megaWaveStats.proofStageArmed||typeof this.megaWaveStats.proofStageArmed!=='object')this.megaWaveStats.proofStageArmed={};
    if(!Number.isFinite(Number(this.megaWaveStats.crystalProofCertified)))this.megaWaveStats.crystalProofCertified=0;
    return this.megaWaveStats;
  }

  queueMegaWaveAthenaContinuation(entry){
    const id=String(entry?.id||'');if(!id)return false;
    if(!(this.scarletContinuationQueue instanceof CoalescingWorkQueue))this.scarletContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','mega_wave_athena_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    return this.scarletContinuationQueue.enqueue(`mega-wave-athena:${id}`,()=>this.handleMegaWaveAthenaContinuation(entry));
  }

  async megaWaveThirdProofDecision(parentEntry) {
    const s=this.settings||{},parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall||{};
    const required=Math.max(
      Number(ATHENA_EXCLAMATION.minimumConsecutiveProfitableShadowProofs||MEGA_WAVE.minimumCrystalProofsRequired||1),
      Math.min(
        Number(ATHENA_EXCLAMATION.maximumConsecutiveProfitableShadowProofs||MEGA_WAVE.maximumCrystalProofsRequired||5),
        Math.floor(Number(s.crystalWallWinsToTriggerAthena??ATHENA_EXCLAMATION.requiredConsecutiveProfitableShadowProofs??MEGA_WAVE.defaultCrystalProofsRequired??3)||3),
      ),
    );
    if(!parentId||!ticker)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_identity_missing'};
    if(String(parentCrystalWall?.policyRevision||'')!==String(ATHENA_EXCLAMATION.requiredParentPolicyRevision))return{ok:false,status:'IGNORED',reason:'parent_crystal_wall_policy_not_third_proof_capable'};
    let rows=[],athenaRows=[],authorizationEpisodes=[];
    try{
      if(typeof this.db?.entriesByConceptTicker==='function'){
        rows=await this.db.entriesByConceptTicker(s.systemName,ATHENA_EXCLAMATION.requiredParentConcept,ticker,{limit:1000,includeArchived:false});
        athenaRows=await this.db.entriesByConceptTicker(s.systemName,'Athena Exclamation',ticker,{limit:1000,includeArchived:false});
      }else if(typeof this.db?.entriesByConcept==='function'){
        rows=(await this.db.entriesByConcept(s.systemName,ATHENA_EXCLAMATION.requiredParentConcept,{limit:2000,includeArchived:false})).filter((e)=>String(e?.ticker||'')===ticker);
        athenaRows=(await this.db.entriesByConcept(s.systemName,'Athena Exclamation',{limit:2000,includeArchived:false})).filter((e)=>String(e?.ticker||'')===ticker);
      }else return{ok:false,status:'BLOCKED',reason:'third_proof_history_unavailable'};
      if(typeof this.db?.opportunityEpisodes==='function')authorizationEpisodes=await this.db.opportunityEpisodes(s.systemName,{limit:5000,sinceMs:Number(s.resetTimestampMs||0)||null});
      else return{ok:false,status:'BLOCKED',reason:'crystal_proof_authorization_history_unavailable'};
    }catch(error){return{ok:false,status:'BLOCKED',reason:'third_proof_history_unavailable',message:String(error?.message||error)};}
    const currentOpenedAt=Math.max(0,Number(parentEntry?.openedAtMs||0)),currentClosedAt=Math.max(0,Number(parentEntry?.closedAtMs||0));
    const candidate=(row)=>{
      const cw=row?.entryConfig?.crystalWall||{};
      if(String(row?.conceptName||'')!==String(ATHENA_EXCLAMATION.requiredParentConcept))return false;
      if(String(row?.ticker||'')!==ticker||String(row?.systemName||'')!==String(s.systemName)||String(row?.ownerId||'')!==String(s.ownerId)||String(row?.mode||'')!==String(s.mode||''))return false;
      if(String(row?.status||'')!=='closed'||Number(row?.remainingCount||0)>1e-9)return false;
      if(String(cw?.version||'')!==String(ATHENA_EXCLAMATION.requiredParentVersion)||String(cw?.policyRevision||'')!==String(ATHENA_EXCLAMATION.requiredParentPolicyRevision))return false;
      if(String(row?.entryConfig?.virtualInfinity?.version||'')!==String(INFINITY_BREAK.version))return false;
      const opened=Math.max(0,Number(row?.openedAtMs||0)),closed=Math.max(0,Number(row?.closedAtMs||0));
      if(!(opened>0&&closed>=opened))return false;
      if(String(row?.id||'')!==parentId&&(opened>currentOpenedAt||closed>currentClosedAt))return false;
      return true;
    };
    const byId=new Map();for(const row of rows||[]){if(candidate(row))byId.set(String(row.id),structuredClone(row));}
    // Persistence invariant: the current proof must already be durable. Never
    // let an in-memory close object backfill a missing PostgreSQL row.
    if(!byId.has(parentId))return{ok:false,status:'BLOCKED',reason:'third_proof_parent_not_durable'};

    const proofFrom=(obj)=>obj?.crystalProof||obj?.thirdProof||null;
    const finalProofIdentity=(proof)=>{
      if(!proof||typeof proof!=='object')return{id:'',closedAtMs:0};
      const ids=Array.isArray(proof.proofEntryIds)?proof.proofEntryIds.map(String).filter(Boolean):[];
      const rows=Array.isArray(proof.proofs)?proof.proofs:[];
      const id=String(proof.finalProofEntryId||ids.at(-1)||rows.at(-1)?.entryId||proof.fifthProofEntryId||proof.fourthProofEntryId||proof.thirdProofEntryId||proof.secondProofEntryId||proof.firstProofEntryId||'');
      const closedAtMs=Math.max(0,Number(proof.finalProofClosedAtMs||rows.at(-1)?.closedAtMs||proof.fifthProofClosedAtMs||proof.fourthProofClosedAtMs||proof.thirdProofClosedAtMs||proof.secondProofClosedAtMs||proof.firstProofClosedAtMs||0));
      return{id,closedAtMs};
    };
    let consumedThroughClosedAtMs=0,priorAuthorizationCount=0;
    const consumedFinalIds=new Set();
    const rememberConsumed=(proof)=>{const x=finalProofIdentity(proof);if(!x.id&&!x.closedAtMs)return;if(x.id)consumedFinalIds.add(x.id);consumedThroughClosedAtMs=Math.max(consumedThroughClosedAtMs,x.closedAtMs);};
    for(const ep of authorizationEpisodes||[]){
      if(String(ep?.ticker||'')!==ticker||!String(ep?.id||'').startsWith('MEGA-WAVE:ATHENA:'))continue;
      const proof=proofFrom(ep?.boltSnapshot)||proofFrom(ep?.athenaDecision?.megaWave)||proofFrom(ep?.fireCommand?.decisionEvidence);
      const before=consumedFinalIds.size;rememberConsumed(proof);if(consumedFinalIds.size>before)priorAuthorizationCount+=1;
    }
    for(const row of athenaRows||[]){
      if(String(row?.ticker||'')!==ticker||String(row?.systemName||'')!==String(s.systemName)||String(row?.ownerId||'')!==String(s.ownerId))continue;
      const mw=row?.entryConfig?.athenaExclamation?.megaWaveAuthorization||row?.entryConfig?.megaWave||{};
      const proof=proofFrom(mw)||proofFrom(row?.entryConfig?.athenaExclamation)||null;
      const before=consumedFinalIds.size;rememberConsumed(proof);if(consumedFinalIds.size>before)priorAuthorizationCount+=1;
    }

    const ordered=[...byId.values()].sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0)||Number(a.closedAtMs||0)-Number(b.closedAtMs||0)||String(a.id).localeCompare(String(b.id)));
    let streak=[];let found=false;
    for(const row of ordered){
      const rowId=String(row.id||''),opened=Math.max(0,Number(row.openedAtMs||0)),closed=Math.max(0,Number(row.closedAtMs||0));
      // An already consumed authorization boundary is absolute. This prevents a
      // runtime proof-count edit (for example 5 -> 2) from reusing old proofs.
      if(consumedThroughClosedAtMs>0&&(closed<=consumedThroughClosedAtMs||opened<consumedThroughClosedAtMs)){streak=[];if(rowId===parentId){found=true;break;}continue;}
      const profit=String(row.closeReason||'')===String(CRYSTAL_WALL.profitableCloseReason)&&Number(row.pnlCents||0)>0;
      if(!profit){streak=[];if(rowId===parentId){found=true;break;}continue;}
      const prior=streak[streak.length-1]||null;
      if(prior&&Number(prior.closedAtMs||0)>opened)streak=[];
      streak.push(row);
      if(rowId===parentId){found=true;break;}
    }
    if(!found)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_not_durable'};
    const consecutiveProfitCount=streak.length;
    if(consecutiveProfitCount<1)return{ok:false,status:'BLOCKED',reason:'third_proof_sequence_invalid'};
    const proofStage=Math.min(required,consecutiveProfitCount),groupRows=streak.slice(-proofStage);
    const ids=groupRows.map(r=>String(r?.id||'')),crashes=groupRows.map(r=>String(r?.entryConfig?.crystalWall?.crashEpisodeId||''));
    if(ids.some(x=>!x)||new Set(ids).size!==ids.length||crashes.some(x=>!x)||new Set(crashes).size!==crashes.length)return{ok:false,status:'BLOCKED',reason:'third_proof_independence_failed'};
    for(let i=1;i<groupRows.length;i++)if(Number(groupRows[i-1]?.closedAtMs||0)>Number(groupRows[i]?.openedAtMs||0))return{ok:false,status:'BLOCKED',reason:'third_proof_not_sequential'};
    const proofGroupIndex=priorAuthorizationCount+1;
    const proofRows=groupRows.map((row,index)=>{const cw=row?.entryConfig?.crystalWall||{};return{index:index+1,entryId:String(row?.id||''),crashEpisodeId:String(cw?.crashEpisodeId||''),openedAtMs:Number(row?.openedAtMs||0),closedAtMs:Number(row?.closedAtMs||0),exitPriceCents:Number(row?.exitPriceCents||0),realizedPnlCents:Number(row?.pnlCents||0)};});
    const proof={version:ATHENA_EXCLAMATION.thirdProofVersion,policyRevision:ATHENA_EXCLAMATION.policyRevision,ticker,proofGroupIndex,pairing:ATHENA_EXCLAMATION.proofPairing,requiredConsecutiveProfitableShadowProofs:required,requiredProofCount:required,consecutiveProfitCount,proofStage,proofEntryIds:[...ids],proofCrashEpisodeIds:[...crashes],proofs:proofRows,finalProofEntryId:ids.at(-1),finalProofCrashEpisodeId:crashes.at(-1),finalProofClosedAtMs:Number(groupRows.at(-1)?.closedAtMs||0),independentCrashEpisodes:true,sameExactTicker:true,lossResetsProof:ATHENA_EXCLAMATION.shadowLossResetsProof===true};
    const names=['first','second','third','fourth','fifth'];
    for(let i=0;i<proofRows.length;i++){
      const row=proofRows[i],prefix=names[i]+'Proof';
      proof[prefix+'EntryId']=row.entryId;proof[prefix+'CrashEpisodeId']=row.crashEpisodeId;proof[prefix+'OpenedAtMs']=row.openedAtMs;proof[prefix+'ClosedAtMs']=row.closedAtMs;proof[prefix+'ExitPriceCents']=row.exitPriceCents;proof[prefix+'RealizedPnlCents']=row.realizedPnlCents;
    }
    if(proofStage<required)return{ok:false,status:'ARMED',reason:`mega_wave_crystal_profit_armed_${proofStage}_of_${required}`,proof};
    if(String(groupRows.at(-1)?.id||'')!==parentId)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_mismatch'};
    return{ok:true,status:'CERTIFIED',reason:`mega_wave_${required}_crystal_profits_certified_athena`,firstProof:groupRows[0]||null,secondProof:groupRows[1]||null,thirdProof:groupRows[2]||null,finalProof:groupRows.at(-1)||null,proof};
  }

  async scarletThirdProofDecision(parentEntry) {
    const s=this.settings||{},parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall||{};
    if(!parentId||!ticker)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_identity_missing'};
    if(String(parentCrystalWall?.policyRevision||'')!==String(SCARLET_NEEDLE.requiredParentPolicyRevision))return{ok:false,status:'IGNORED',reason:'parent_crystal_wall_policy_not_third_proof_capable'};
    let rows=[];
    try{
      if(typeof this.db?.entriesByConceptTicker==='function')rows=await this.db.entriesByConceptTicker(s.systemName,SCARLET_NEEDLE.requiredParentConcept,ticker,{limit:1000,includeArchived:false});
      else if(typeof this.db?.entriesByConcept==='function')rows=(await this.db.entriesByConcept(s.systemName,SCARLET_NEEDLE.requiredParentConcept,{limit:2000,includeArchived:false})).filter((e)=>String(e?.ticker||'')===ticker);
      else return{ok:false,status:'BLOCKED',reason:'third_proof_history_unavailable'};
    }catch(error){return{ok:false,status:'BLOCKED',reason:'third_proof_history_unavailable',message:String(error?.message||error)};}
    const currentOpenedAt=Math.max(0,Number(parentEntry?.openedAtMs||0)),currentClosedAt=Math.max(0,Number(parentEntry?.closedAtMs||0));
    const candidate=(row)=>{
      const cw=row?.entryConfig?.crystalWall||{};
      if(String(row?.conceptName||'')!==String(SCARLET_NEEDLE.requiredParentConcept))return false;
      if(String(row?.ticker||'')!==ticker||String(row?.systemName||'')!==String(s.systemName)||String(row?.ownerId||'')!==String(s.ownerId)||String(row?.mode||'')!==String(s.mode||''))return false;
      if(String(row?.status||'')!=='closed'||Number(row?.remainingCount||0)>1e-9)return false;
      if(String(cw?.version||'')!==String(SCARLET_NEEDLE.requiredParentVersion)||String(cw?.policyRevision||'')!==String(SCARLET_NEEDLE.requiredParentPolicyRevision))return false;
      if(String(row?.entryConfig?.virtualInfinity?.version||'')!==String(INFINITY_BREAK.version))return false;
      const opened=Math.max(0,Number(row?.openedAtMs||0)),closed=Math.max(0,Number(row?.closedAtMs||0));
      if(!(opened>0&&closed>=opened))return false;
      if(String(row?.id||'')!==parentId&&(opened>currentOpenedAt||closed>currentClosedAt))return false;
      return true;
    };
    const byId=new Map();for(const row of rows||[]){if(candidate(row))byId.set(String(row.id),structuredClone(row));}
    // R69.4 persistence invariant: the current proof must already be durable.
    // Never let an in-memory close object backfill a missing PostgreSQL row.
    if(!byId.has(parentId))return{ok:false,status:'BLOCKED',reason:'third_proof_parent_not_durable'};
    const ordered=[...byId.values()].sort((a,b)=>Number(a.openedAtMs||0)-Number(b.openedAtMs||0)||Number(a.closedAtMs||0)-Number(b.closedAtMs||0)||String(a.id).localeCompare(String(b.id)));
    let streak=[];let found=false;
    for(const row of ordered){
      const rowId=String(row.id||''),profit=String(row.closeReason||'')===String(CRYSTAL_WALL.profitableCloseReason)&&Number(row.pnlCents||0)>0;
      if(!profit){streak=[];if(rowId===parentId){found=true;break;}continue;}
      const prior=streak[streak.length-1]||null;
      if(prior&&Number(prior.closedAtMs||0)>Number(row.openedAtMs||0))streak=[];
      streak.push(row);
      if(rowId===parentId){found=true;break;}
    }
    if(!found)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_not_durable'};
    const consecutiveProfitCount=streak.length,required=Math.max(3,Number(SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs||3));
    if(consecutiveProfitCount<1)return{ok:false,status:'BLOCKED',reason:'third_proof_sequence_invalid'};
    const stageRemainder=consecutiveProfitCount%required,proofStage=stageRemainder===0?required:stageRemainder;
    const groupRows=streak.slice(-proofStage);
    const ids=groupRows.map(r=>String(r?.id||'')),crashes=groupRows.map(r=>String(r?.entryConfig?.crystalWall?.crashEpisodeId||''));
    if(ids.some(x=>!x)||new Set(ids).size!==ids.length||crashes.some(x=>!x)||new Set(crashes).size!==crashes.length)return{ok:false,status:'BLOCKED',reason:'third_proof_independence_failed'};
    for(let i=1;i<groupRows.length;i++)if(Number(groupRows[i-1]?.closedAtMs||0)>Number(groupRows[i]?.openedAtMs||0))return{ok:false,status:'BLOCKED',reason:'third_proof_not_sequential'};
    const proofGroupIndex=Math.ceil(consecutiveProfitCount/required);
    const proof={version:SCARLET_NEEDLE.thirdProofVersion,policyRevision:SCARLET_NEEDLE.policyRevision,ticker,proofGroupIndex,pairing:SCARLET_NEEDLE.proofPairing,requiredConsecutiveProfitableShadowProofs:required,consecutiveProfitCount,proofStage,independentCrashEpisodes:true,sameExactTicker:true,lossResetsProof:SCARLET_NEEDLE.shadowLossResetsProof===true};
    const names=['first','second','third'];
    for(let i=0;i<groupRows.length;i++){
      const row=groupRows[i],cw=row?.entryConfig?.crystalWall||{},prefix=names[i]+'Proof';
      proof[prefix+'EntryId']=String(row?.id||'');proof[prefix+'CrashEpisodeId']=String(cw?.crashEpisodeId||'');proof[prefix+'OpenedAtMs']=Number(row?.openedAtMs||0);proof[prefix+'ClosedAtMs']=Number(row?.closedAtMs||0);proof[prefix+'ExitPriceCents']=Number(row?.exitPriceCents||0);proof[prefix+'RealizedPnlCents']=Number(row?.pnlCents||0);
    }
    if(proofStage<required){
      const reason=proofStage===1?'first_crystal_wall_profit_armed_second_proof':'second_consecutive_crystal_wall_profit_armed_third_proof';
      return{ok:false,status:'ARMED',reason,proof};
    }
    const [firstProof,secondProof,thirdProof]=groupRows;
    if(String(thirdProof?.id||'')!==parentId)return{ok:false,status:'BLOCKED',reason:'third_proof_parent_mismatch'};
    return{ok:true,status:'CERTIFIED',reason:'third_consecutive_crystal_wall_profit_certified_scarlet',firstProof,secondProof,thirdProof,proof};
  }

  async handleMegaWaveAthenaContinuation(parentEntry) {
    const stats=this.megaWaveRuntime(),s=this.settings||{},parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    if(!parentId||!ticker||String(parentEntry?.conceptName||'')!==String(ATHENA_EXCLAMATION.requiredParentConcept))return{status:'IGNORED',reason:'not_crystal_wall_parent'};
    if(parentEntry?.status!=='closed'||Number(parentEntry?.remainingCount||0)>1e-9)return{status:'IGNORED',reason:'parent_not_fully_closed'};
    if(String(parentEntry?.closeReason||'')!==String(CRYSTAL_WALL.profitableCloseReason)||!(Number(parentEntry?.pnlCents||0)>0))return{status:'IGNORED',reason:'not_profitable_crystal_wall'};
    if(s.athenaExclamationEnabled!==true)return{status:'IGNORED',reason:'athena_exclamation_disabled'};
    if(String(parentEntry?.ownerId||'')!==String(s.ownerId)||String(parentEntry?.mode||'')!==String(s.mode||''))return{status:'BLOCKED',reason:'parent_identity_or_mode_mismatch'};
    const marketFamilyExclusion=executionMarketFamilyExclusion(ticker,this.settings);
    if(marketFamilyExclusion.blocked){
      stats.lastEvent={status:'BLOCKED',atMs:Date.now(),parentEntryId:parentId,ticker,reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
      await this.db?.audit?.('info','mega_wave_athena_continuation_market_family_blocked',{parentEntryId:parentId,ticker,marketFamilyExclusion}).catch(()=>{});
      return{status:'BLOCKED',reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,marketFamilyExclusion};
    }
    const proofDecision=await this.megaWaveThirdProofDecision(parentEntry);
    if(proofDecision.status==='ARMED'){
      const stage=Number(proofDecision?.proof?.proofStage||0),required=Number(proofDecision?.proof?.requiredProofCount||proofDecision?.proof?.requiredConsecutiveProfitableShadowProofs||3);if(stage===1)stats.firstProofArmed+=1;else if(stage===2)stats.secondProofArmed+=1;
      stats.proofStageArmed[stage]=Number(stats.proofStageArmed[stage]||0)+1;
      stats.lastEvent={status:'ARMED',atMs:Date.now(),parentEntryId:parentId,ticker,proofStage:stage,requiredProofCount:required,reason:proofDecision.reason};
      return{status:'ARMED',reason:proofDecision.reason,proof:proofDecision.proof};
    }
    if(!proofDecision.ok){stats.lastEvent={status:'BLOCKED',atMs:Date.now(),parentEntryId:parentId,ticker,reason:proofDecision.reason};return{status:proofDecision.status||'BLOCKED',reason:proofDecision.reason};}
    const proof=proofDecision.proof,requiredProofCount=Number(proof?.requiredProofCount||proof?.requiredConsecutiveProfitableShadowProofs||3);
    stats.crystalProofCertified+=1;if(requiredProofCount===3)stats.tripleCertified+=1;
    const firstProofEntryId=String(proof?.proofEntryIds?.[0]||proof?.firstProofEntryId||''),finalProofEntryId=String(proof?.finalProofEntryId||proof?.proofEntryIds?.at?.(-1)||proof?.thirdProofEntryId||'');
    const authorizationId=`MEGA-WAVE:ATHENA:${firstProofEntryId}:${finalProofEntryId}`;
    if(typeof this.db?.opportunityEpisode==='function'){
      const existing=await this.db.opportunityEpisode(authorizationId).catch(()=>null);
      if(existing?.entryId)return{status:'DUPLICATE_SUPPRESSED',reason:'athena_authorization_already_consumed',entryId:existing.entryId};
      if(existing?.trackingComplete===true&&String(existing?.athenaDecision?.decision||'')==='BLOCKED')return{status:'DUPLICATE_SUPPRESSED',reason:'athena_authorization_group_already_finalized'};
    }
    if(typeof this.db?.upsertOpportunityEpisode!=='function')return{status:'BLOCKED',reason:'crystal_proof_authorization_persistence_unavailable'};
    const baseEpisode={id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentEntry.eventTicker||ticker),side:'YES',sport:String(parentEntry.sport||'Unknown'),boltAtMs:Number(parentEntry.closedAtMs||Date.now()),boltSnapshot:{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,parentEntryId:parentId,crystalProof:proof,thirdProof:proof},athenaDecision:{decision:'CERTIFIED',reason:'configured_crystal_proofs_certified',megaWave:{version:MEGA_WAVE.version,crystalProof:proof,thirdProof:proof}},fireCommand:{},attackSelected:'Athena Exclamation',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()};
    try{await this.db.upsertOpportunityEpisode(baseEpisode);}catch(error){
      stats.lastEvent={status:'BLOCKED',atMs:Date.now(),ticker,authorizationId,reason:'crystal_proof_authorization_persistence_failed'};
      await this.db?.audit?.('error','mega_wave_crystal_proof_authorization_persistence_failed',{authorizationId,parentEntryId:parentId,ticker,requiredProofCount,message:String(error?.message||error)}).catch(()=>{});
      return{status:'BLOCKED',reason:'crystal_proof_authorization_persistence_failed'};
    }
    const seedExit=Math.max(1,Number(parentEntry.exitPriceCents||parentEntry.entryPriceCents||0));
    const watch={authorizationId,ticker,eventTicker:String(parentEntry.eventTicker||ticker),parentEntryId:parentId,parentEntry:structuredClone(parentEntry),crystalProof:structuredClone(proof),parentEntryPriceCents:Number(parentEntry.entryPriceCents||0),parentExitPriceCents:seedExit,peakCents:seedExit,troughCents:seedExit,lastBidCents:seedExit,upwardTicks:0,crashArmed:false,startedAtMs:Date.now()};
    if(!(this.athenaExclamationConfirmationWatches instanceof Map))this.athenaExclamationConfirmationWatches=new Map();
    this.athenaExclamationConfirmationWatches.set(authorizationId,watch);
    const observing={...baseEpisode,athenaDecision:{decision:'OBSERVING',reason:'waiting_own_crash_rebound_ticks',megaWave:{version:MEGA_WAVE.version,crystalProof:proof,thirdProof:proof},athenaExclamationConfirmation:watch},trackingComplete:false,updatedAtMs:Date.now()};
    await this.db.upsertOpportunityEpisode(observing).catch(()=>{});
    stats.lastEvent={status:'OBSERVING',atMs:Date.now(),ticker,authorizationId,parentEntryId:parentId,reason:'waiting_own_crash_rebound_ticks'};
    const q=this.market?.getQuote?.(ticker);if(q)this.observeAthenaExclamationConfirmationQuote(q);
    const live=this.athenaExclamationConfirmationWatches.get(authorizationId);
    if(!live)return stats.lastEvent?.status==='ATHENA_OPENED'?{status:'OPENED',authorizationId,thirdProof:proof,crystalProof:proof}: {status:'OBSERVING',authorizationId,reason:'waiting_own_crash_rebound_ticks'};
    return{status:'OBSERVING',authorizationId,reason:'waiting_own_crash_rebound_ticks',watch:structuredClone(live)};
  }

  observeAthenaExclamationConfirmationQuote(q){
    const s=this.settings||{};
    if(s.athenaExclamationEnabled!==true||!q?.ticker||!(this.athenaExclamationConfirmationWatches instanceof Map))return false;
    const ticker=String(q.ticker),matches=[...this.athenaExclamationConfirmationWatches.entries()].filter(([,w])=>String(w?.ticker||'')===ticker);
    if(!matches.length)return false;
    for(const [id,prior] of matches){
      const result=megaWaveSaintSignalState('Athena Exclamation',prior,q,s,Date.now());
      const next={...prior,...result.watch};
      this.athenaExclamationConfirmationWatches.set(id,next);
      if(result.qualified)this.queueAthenaExclamationConfirmationAttempt(id);
    }
    return true;
  }

  queueAthenaExclamationConfirmationAttempt(authorizationId){
    const id=String(authorizationId||'');if(!id)return false;
    if(!(this.scarletContinuationQueue instanceof CoalescingWorkQueue))this.scarletContinuationQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','athena_exclamation_confirmation_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    return this.scarletContinuationQueue.enqueue(`athena-confirm:${id}`,()=>this.attemptAthenaExclamationConfirmation(id));
  }

  async attemptAthenaExclamationConfirmation(authorizationId){
    const stats=this.megaWaveRuntime(),s=this.settings||{},id=String(authorizationId||'');
    const watch=this.athenaExclamationConfirmationWatches?.get(id);if(!watch)return{status:'IGNORED'};
    const ticker=String(watch.ticker||'');
    if(executionMarketFamilyExclusion(ticker,this.settings).blocked){
      this.athenaExclamationConfirmationWatches.delete(id);
      return{status:'BLOCKED',reason:MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode};
    }
    const q=this.market?.getQuote?.(ticker);if(!q)return{status:'BLOCKED',reason:'fresh_quote_missing'};
    const fresh=megaWaveSaintSignalState('Athena Exclamation',watch,q,s,Date.now());
    this.athenaExclamationConfirmationWatches.set(id,{...watch,...fresh.watch});
    if(!fresh.qualified)return{status:'OBSERVING',reason:fresh.reason};
    const parentEntry=watch.parentEntry||await this.db?.entryById?.(watch.parentEntryId).catch(()=>null);
    const proof=watch.crystalProof;
    if(!parentEntry||!proof){this.athenaExclamationConfirmationWatches.delete(id);return{status:'BLOCKED',reason:'confirmation_lineage_missing'};}
    const cosmosId=this.pickCosmosForRealHunter(ticker);
    const opened=await this.withCosmosSettings(cosmosId,()=>this.strategy.executeMegaWaveAthenaContinuation(q,parentEntry,{authorizationId:id,thirdProof:proof,authorizedAtMs:Date.now()}));
    this.athenaExclamationConfirmationWatches.delete(id);
    const episode={id,systemName:opened?.systemName||cosmosId||s.systemName,ticker,eventTicker:String(watch.eventTicker||ticker),athenaDecision:{decision:opened?'OPENED':'BLOCKED',reason:opened?'confirmed_crash_rebound_ticks_authorized_athena':fresh.reason||'athena_entry_pipeline_blocked',megaWave:{version:MEGA_WAVE.version,crystalProof:proof,thirdProof:proof}},entryId:opened?.id||null,entryAtMs:opened?Number(opened.openedAtMs||Date.now()):null,attackSelected:'Athena Exclamation',trackingComplete:!opened,updatedAtMs:Date.now()};
    await this.db?.upsertOpportunityEpisode?.(episode).catch(()=>{});
    if(opened){stats.athenaOpened+=1;stats.lastEvent={status:'ATHENA_OPENED',atMs:Date.now(),entryId:opened.id,ticker,authorizationId:id};return{status:'OPENED',entry:opened,authorizationId:id};}
    stats.lastEvent={status:'BLOCKED',atMs:Date.now(),ticker,authorizationId:id,reason:'athena_entry_pipeline_blocked'};
    return{status:'BLOCKED',reason:'athena_entry_pipeline_blocked'};
  }

  async handleScarletContinuation(parentEntry) {
    const stats=this.scarletContinuationRuntime();
    const s=this.settings||{};
    const parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),parentEntryId:parentId,ticker,...data};return stats.lastEvent;};
    if(!parentId||!ticker||parentEntry?.status!=='closed'||Number(parentEntry?.remainingCount||0)>1e-9)return {status:'IGNORED',reason:'not_fully_closed'};
    if(String(parentEntry.conceptName||'')!==String(SCARLET_NEEDLE.requiredParentConcept))return {status:'IGNORED',reason:'not_crystal_wall_parent'};
    const parentCrystalWall=parentEntry?.entryConfig?.crystalWall;
    if(String(parentCrystalWall?.version||'')!==String(SCARLET_NEEDLE.requiredParentVersion))return {status:'IGNORED',reason:'not_crystal_wall_v3_parent'};
    if(String(parentCrystalWall?.policyRevision||'')!==String(SCARLET_NEEDLE.requiredParentPolicyRevision))return {status:'IGNORED',reason:'parent_crystal_wall_policy_not_third_proof_capable'};
    if(String(parentEntry?.entryConfig?.virtualInfinity?.version||'')!==String(INFINITY_BREAK.version))return {status:'IGNORED',reason:'parent_not_virtual_infinity_controlled'};
    if(String(parentEntry.closeReason||'')!==String(CRYSTAL_WALL.profitableCloseReason)||!(Number(parentEntry.pnlCents||0)>0))return {status:'IGNORED',reason:'not_profitable_crystal_wall_shadow_infinity_close'};
    if(s.scarletNeedleEnabled!==true)return {status:'IGNORED',reason:'scarlet_disabled'};
    if(String(parentEntry.systemName||'')!==String(s.systemName)||String(parentEntry.ownerId||'')!==String(s.ownerId)){
      stats.blocked+=1;record('BLOCKED',{reason:'owner_or_system_mismatch'});return {status:'BLOCKED',reason:'owner_or_system_mismatch'};
    }
    if(String(parentEntry.mode||'')!==String(s.mode||'')){
      stats.modeMismatchBlocked+=1;stats.blocked+=1;record('BLOCKED',{reason:'mode_changed_since_parent_close'});return {status:'BLOCKED',reason:'mode_changed_since_parent_close'};
    }
    const maxRepeats=Math.max(0,Math.min(SCARLET_NEEDLE.maximumConfigurableRepeats,Math.floor(Number(s.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats))));
    if(maxRepeats<=0)return {status:'IGNORED',reason:'repeat_limit_zero'};
    const proofDecision=await this.scarletThirdProofDecision(parentEntry);
    if(proofDecision.status==='ARMED'){
      const proof=proofDecision.proof||{},stage=Math.max(1,Math.min(2,Number(proof.proofStage||1)));
      const decisionName=stage===1?'FIRST_PROOF_ARMED':'SECOND_PROOF_ARMED';
      const durableReason=stage===1?'first_proof_already_durable':'second_proof_already_durable';
      const proofEpisodeId=`SCARLET-PROOF-${stage}:${parentId}`;
      const existing=typeof this.db?.opportunityEpisode==='function'?await this.db.opportunityEpisode(proofEpisodeId).catch(()=>null):null;
      if(String(existing?.athenaDecision?.decision||'')===decisionName){
        stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{reason:durableReason,proofEpisodeId});return{status:'DUPLICATE_SUPPRESSED',reason:durableReason};
      }
      if(stage===1)stats.firstProofArmed+=1;else stats.secondProofArmed+=1;
      record(decisionName,{proof});
      await this.db?.upsertOpportunityEpisode?.({id:proofEpisodeId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentEntry.eventTicker||ticker),side:'YES',sport:String(parentEntry.sport||'Unknown'),boltAtMs:Number(parentEntry.closedAtMs||Date.now()),boltSnapshot:{version:SCARLET_NEEDLE.version,authority:SCARLET_NEEDLE.strategicEntryAuthority,parentEntryId:parentId,thirdProof:proof},athenaDecision:{decision:decisionName,reason:proofDecision.reason,strategicAuthority:false,scarletNeedleThirdProof:proof},fireCommand:{},attackSelected:null,entryId:null,entryAtMs:null,outcome:{informationOnly:true,scarletAuthority:false,proofStage:stage},outcomeLabel:stage===1?'SCARLET_FIRST_PROOF_INFORMATION_ONLY':'SCARLET_SECOND_PROOF_INFORMATION_ONLY',trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
      await this.db?.audit?.('info',stage===1?'scarlet_first_proof_armed':'scarlet_second_proof_armed',{parentEntryId:parentId,ticker,proofStage:stage,firstProofCrashEpisodeId:proof.firstProofCrashEpisodeId||null,secondProofCrashEpisodeId:proof.secondProofCrashEpisodeId||null,requiredConsecutiveProfitableShadowProofs:proof.requiredConsecutiveProfitableShadowProofs||3}).catch(()=>{});
      return{status:'ARMED',reason:proofDecision.reason,proof};
    }
    if(!proofDecision.ok){
      if(proofDecision.status==='IGNORED')return{status:'IGNORED',reason:proofDecision.reason};
      stats.proofHistoryBlocked+=1;stats.blocked+=1;record('BLOCKED',{reason:proofDecision.reason,message:proofDecision.message||null});
      await this.db?.audit?.('warning','scarlet_third_proof_blocked',{parentEntryId:parentId,ticker,reason:proofDecision.reason,message:proofDecision.message||null}).catch(()=>{});
      return{status:'BLOCKED',reason:proofDecision.reason};
    }
    const proof=proofDecision.proof,firstProof=proofDecision.firstProof,secondProof=proofDecision.secondProof;
    stats.thirdProofCertified+=1;stats.eligible+=1;
    const repeatIndex=1,rootEntryId=String(proof.firstProofEntryId),authorizationId=`SCARLET-THIRD-PROOF:${proof.firstProofEntryId}:${parentId}`;
    if(this.scarletContinuationInFlight.has(authorizationId)){
      stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'local',proof});return {status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};
    }
    this.scarletContinuationInFlight.add(authorizationId);
    let unlock=null;
    const baseEpisode=(decision={})=>({id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(parentEntry.eventTicker||ticker),side:'YES',sport:String(parentEntry.sport||'Unknown'),boltAtMs:Number(parentEntry.closedAtMs||Date.now()),boltSnapshot:{version:SCARLET_NEEDLE.version,authority:SCARLET_NEEDLE.strategicEntryAuthority,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats,thirdProof:proof},athenaDecision:decision,fireCommand:{},attackSelected:'Scarlet Needle',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    const terminal=async(reason,data={})=>{
      stats.blocked+=1;record('BLOCKED',{reason,authorizationId,repeatIndex,maxRepeats,rootEntryId,proof,...data});
      const decision={decision:'BLOCKED',reason,strategicAuthority:false,scarletNeedleContinuation:{version:SCARLET_NEEDLE.version,status:'BLOCKED',terminal:true,authorizationId,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats,thirdProof:proof,...data}};
      await this.db.upsertOpportunityEpisode(baseEpisode(decision)).catch(()=>{});
      await this.db.audit('info','scarlet_continuation_blocked',{authorizationId,parentEntryId:parentId,rootEntryId,ticker,repeatIndex,maxRepeats,reason,thirdProof:proof,...data}).catch(()=>{});
      return {status:'BLOCKED',reason,authorizationId,repeatIndex,maxRepeats};
    };
    try{
      if(typeof this.db.acquireHunterTickerLock!=='function')return terminal('continuation_lock_unavailable');
      unlock=await this.db.acquireHunterTickerLock(s.systemName,`scarlet-third-proof:${proof.firstProofEntryId}:${parentId}`);
      if(!unlock){stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'database_lock'});return {status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
      const existingStatus=String(existing?.athenaDecision?.scarletNeedleContinuation?.status||existing?.athenaDecision?.decision||'');
      if(existing?.entryId||['OPENED','BLOCKED'].includes(existingStatus)){
        stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,scope:'durable_episode',existingStatus,entryId:existing?.entryId||null});return {status:'DUPLICATE_SUPPRESSED',reason:'durable_authorization_already_consumed',entryId:existing?.entryId||null};
      }
      const authorizedAtMs=Date.now();
      const lineage={version:SCARLET_NEEDLE.version,policyRevision:SCARLET_NEEDLE.policyRevision,status:'AUTHORIZED',terminal:false,authorizationId,parentEntryId:parentId,rootEntryId,repeatIndex,maxRepeats,parentConcept:String(parentEntry.conceptName||''),parentCrystalWallVersion:String(parentCrystalWall.version||''),parentCrystalWallPolicyRevision:String(parentCrystalWall.policyRevision||''),parentCrashEpisodeId:String(parentCrystalWall.crashEpisodeId||''),parentCloseReason:String(parentEntry.closeReason||''),parentRealizedPnlCents:Number(parentEntry.pnlCents||0),parentExitPriceCents:Number(parentEntry.exitPriceCents||0),parentClosedAtMs:Number(parentEntry.closedAtMs||0),firstProofEntryId:String(firstProof?.id||''),firstProofCrashEpisodeId:String(firstProof?.entryConfig?.crystalWall?.crashEpisodeId||''),firstProofClosedAtMs:Number(firstProof?.closedAtMs||0),secondProofEntryId:String(secondProof?.id||''),secondProofCrashEpisodeId:String(secondProof?.entryConfig?.crystalWall?.crashEpisodeId||''),secondProofClosedAtMs:Number(secondProof?.closedAtMs||0),thirdProof:proof,authorizedAtMs,athenaApprovalRequired:false,athenaSoulVetoApplied:false,ordinaryGameClockBypassed:true,fullConfiguredSizeRequired:true,fullExecutionSafetyRequired:true,normalStrategicDiscoveryBypassed:true,profitTargetNetPerOriginalContractCents:Number(s.scarletNeedleInfinityNetPerOriginalContractCents??SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents)};
      await this.db.upsertOpportunityEpisode(baseEpisode({decision:'AUTHORIZED',reason:'third_crystal_wall_shadow_win_authorized_scarlet_continuation',strategicAuthority:false,scarletNeedleContinuation:lineage}));
      stats.authorized+=1;record('AUTHORIZED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,proof});
      const refreshed=await this.freshExecutionSnapshot(ticker);
      if(!refreshed?.marketFresh||!refreshed?.bookFresh||!refreshed?.quote)return terminal('fresh_executable_market_unavailable');
      const q={...refreshed.quote,ticker,eventTicker:String(refreshed.quote.eventTicker||refreshed.quote.ticker||ticker)};
      const expectedEvent=String(parentEntry.eventTicker||ticker),status=String(q.status||'').toLowerCase();
      if(String(q.eventTicker||ticker)!==expectedEvent)return terminal('event_identity_mismatch',{expectedEventTicker:expectedEvent,freshEventTicker:q.eventTicker||null});
      if(status!=='active'||Boolean(q.result))return terminal('market_not_active',{status:status||null,result:q.result||null});
      const parentExit=Number(parentEntry.exitPriceCents||0),handoffAsk=Number(q.yesAsk||0),handoffBid=Number(q.yesBid||0);
      if(!(handoffAsk>0)||!(handoffBid>0)||handoffBid>handoffAsk)return terminal('invalid_fresh_handoff_quote',{parentExitPriceCents:parentExit,askCents:handoffAsk,bidCents:handoffBid});
      stats.attempted+=1;record('ATTEMPTED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,bidCents:Number(q.yesBid||0),askCents:Number(q.yesAsk||0),proof});
      const opened=await this.strategy.executeScarletContinuation(q,parentEntry,{authorizationId,rootEntryId,repeatIndex,maxRepeats,authorizedAtMs,thirdProof:proof});
      if(!opened)return terminal(this.strategy?.lastAthenaFireAbort||'hard_safety_or_execution_blocked');
      stats.opened+=1;record('OPENED',{authorizationId,repeatIndex,maxRepeats,rootEntryId,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),proof});
      const openedDecision={decision:'OPENED',reason:'scarlet_third_proof_continuation_opened',strategicAuthority:false,scarletNeedleContinuation:{...lineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
      const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.athenaFire||current?.fireCommand||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:'Scarlet Needle',updatedAtMs:Date.now()}).catch(()=>{});
      await this.db.audit('info','scarlet_third_proof_continuation_opened',{authorizationId,parentEntryId:parentId,firstProofEntryId:proof.firstProofEntryId,secondProofEntryId:proof.secondProofEntryId,thirdProofEntryId:proof.thirdProofEntryId,rootEntryId,ticker,repeatIndex,maxRepeats,proofGroupIndex:proof.proofGroupIndex,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),closeToEntryLatencyMs:Math.max(0,Number(opened.openedAtMs||Date.now())-Number(parentEntry.closedAtMs||authorizedAtMs))}).catch(()=>{});
      return {status:'OPENED',authorizationId,repeatIndex,maxRepeats,thirdProof:proof,entry:opened};
    }catch(error){
      await this.db.audit('error','scarlet_continuation_failed',{authorizationId,parentEntryId:parentId,rootEntryId,ticker,repeatIndex,maxRepeats,thirdProof:proof,message:String(error?.message||error)}).catch(()=>{});
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
    // An open Crystal Wall shadow owns only its own virtual lifecycle. It must
    // never arm a second shadow on the same ticker until that row closes.
    if(this.observeCrystalWallShadowExit(q))return true;
    const minCrash=Math.max(1,Math.floor(Number(s.crystalWallMinCrashCents??CRYSTAL_WALL.defaultMinCrashCents)||CRYSTAL_WALL.defaultMinCrashCents));
    let newAuthorizationId=null;
    if(crashState?.episodeId){
      const peak=Math.max(0,Number(crashState.preCrashPeakCents||0));
      const trough=Math.max(0,Number(crashState.troughCents||0));
      const crashDepth=Math.max(Number(crashState.crashDepthCents||0),peak>0&&trough>0?peak-trough:0);
      if(crashDepth+1e-9>=minCrash){
        const crashEpisodeId=String(crashState.episodeId),authorizationId=`CRYSTAL-WALL-V3:${crashEpisodeId}`;
        if(this.crystalWallConsumedEpisodeIds?.has?.(crashEpisodeId))return false;
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
    const baseEpisode=(decision={},fireCommand={})=>({id:String(authorizationId),systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(watch.eventTicker||ticker),side:'YES',sport:String(watch.sport||'Unknown'),boltAtMs:Number(watch.crashStartedAtMs||watch.authorizedAtMs||Date.now()),boltSnapshot:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,authority:CRYSTAL_WALL.strategicEntryAuthority,crashEpisodeId,preCrashPeakCents:Number(watch.preCrashPeakCents||0),crashDepthCents:Number(watch.crashDepthCents||0)},athenaDecision:decision,fireCommand,attackSelected:CRYSTAL_WALL.shadowConceptName,entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
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
      const gate=this.entryExecutionGate();
      if(!gate.allowed){this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),gate.reason,RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:gate.reason});return {status:'WATCHING',reason:gate.reason};}
      // RWG1: durable crash authorization is cheap; REST execution proof is
      // reserved for an actually READY websocket-driven recovery watch.
      if(String(watch.status||'')!=='READY'){stats.watching+=1;record('WATCHING',{reason:'rebound_not_ready',watchStatus:String(watch.status||'')});return {status:'WATCHING',reason:'rebound_not_ready'};}
      // Crystal Wall is shadow-only in R69.3 and therefore cannot be blocked
      // by real portfolio exposure. We still classify coexisting real rows for
      // audit/source lineage, but they have no capital/exposure authority over
      // the shadow observation.
      const openRows=typeof this.db?.openEntriesByTicker==='function'?await this.db.openEntriesByTicker(s.systemName,ticker).catch(()=>[]):[];
      const coexisting=openRows.filter((e)=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&openLike(e.status)&&String(e.ownerId||s.ownerId)===String(s.ownerId)&&String(e.mode||s.mode)===String(s.mode));
      const parentLike=coexisting;
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
      if(!opened){this.setRecoveryWatchBackoff(this.crystalWallWatches,String(authorizationId),'shadow_hard_safety_or_liquidity_blocked',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'shadow_hard_safety_or_liquidity_blocked',sourceKind});return {status:'WATCHING',reason:'shadow_hard_safety_or_liquidity_blocked'};}
      this.dropCrystalWallWatch(String(authorizationId));
      this.rememberCrystalWallConsumedEpisode(crashEpisodeId);
      this.rememberCrystalWallShadow(opened);
      stats.opened+=1;record('OPENED',{sourceKind,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0)});
      const lineage=structuredClone(opened.entryConfig?.crystalWall||executionWatch);
      const openedDecision={decision:'OPENED',reason:'crystal_wall_v3_shadow_opened',strategicAuthority:true,crystalWall:{...lineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};
      const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):existing;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision,structuredClone(opened.entryConfig?.crystalWallFire||{})),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.crystalWallFire||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:CRYSTAL_WALL.shadowConceptName,updatedAtMs:Date.now()}).catch(()=>{});
      await this.db.audit('info','crystal_wall_v3_shadow_opened',{authorizationId:String(authorizationId),crashEpisodeId,ticker,sourceKind,coexistingEntryIds:executionWatch.coexistingEntryIds,entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0),troughCents:Number(signal.troughCents||0),reboundCents:Number(signal.reboundCents||0),fixedVirtualStakeCents:Number(s.recoveryStakeCents),brokerOrderAuthority:false,simulationPortfolioCapitalAuthority:false}).catch(()=>{});
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
    if(this.settings?.recoveryHunterEnabled!==true||typeof this.db?.opportunityEpisodes!=='function')return;
    const windowMs=Math.max(1,Number(this.settings.recoveryTrackingHours||24))*3600000;
    const sinceMs=Date.now()-windowMs;
    const episodes=await this.db.opportunityEpisodes(this.settings.systemName,{limit:5000,sinceMs}).catch(()=>[]);
    for(const ep of episodes||[]){
      const cw=ep?.athenaDecision?.crystalWall;
      if(String(cw?.version||'')!==CRYSTAL_WALL.version)continue;
      const state=String(cw?.status||ep?.athenaDecision?.decision||'').toUpperCase();
      const crashEpisodeId=String(cw?.crashEpisodeId||ep?.boltSnapshot?.crashEpisodeId||'');
      const ticker=String(ep?.ticker||cw?.ticker||'');
      if(!crashEpisodeId||!ticker)continue;
      if(ep?.entryId||state==='OPENED'){this.rememberCrystalWallConsumedEpisode(crashEpisodeId);continue;}
      if(cw?.terminal===true||['EXPIRED','BLOCKED'].includes(state))continue;
      if(this.crystalWallConsumedEpisodeIds?.has?.(crashEpisodeId))continue;
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

  rememberCrystalWallConsumedEpisode(crashEpisodeId) {
    const id=String(crashEpisodeId||'');if(!id)return;
    if(!(this.crystalWallConsumedEpisodeIds instanceof Set))this.crystalWallConsumedEpisodeIds=new Set();
    // Set preserves insertion order: refresh the episode then evict oldest.
    this.crystalWallConsumedEpisodeIds.delete(id);this.crystalWallConsumedEpisodeIds.add(id);
    const limit=Math.max(100,Number(CRYSTAL_WALL.maximumConsumedCrashEpisodes||5000));
    while(this.crystalWallConsumedEpisodeIds.size>limit){const oldest=this.crystalWallConsumedEpisodeIds.values().next().value;this.crystalWallConsumedEpisodeIds.delete(oldest);}
  }

  rememberCrystalWallShadow(entry) {
    if(!entry?.id||String(entry.conceptName||'')!==String(CRYSTAL_WALL.shadowConceptName))return;
    if(!(this.crystalWallShadowRecent instanceof Map))this.crystalWallShadowRecent=new Map();
    if(!(this.crystalWallShadowOpenByTicker instanceof Map))this.crystalWallShadowOpenByTicker=new Map();
    if(!(this.crystalWallConsumedEpisodeIds instanceof Set))this.crystalWallConsumedEpisodeIds=new Set();
    this.crystalWallShadowRecent.delete(String(entry.id));
    this.crystalWallShadowRecent.set(String(entry.id),entry);
    while(this.crystalWallShadowRecent.size>CRYSTAL_WALL.maximumRecentResults){const oldest=this.crystalWallShadowRecent.keys().next().value;this.crystalWallShadowRecent.delete(oldest);}
    const crashEpisodeId=String(entry?.entryConfig?.crystalWall?.crashEpisodeId||entry?.sourceTradeId||'');
    if(crashEpisodeId)this.rememberCrystalWallConsumedEpisode(crashEpisodeId);
    if(openLike(entry.status))this.crystalWallShadowOpenByTicker.set(String(entry.ticker),entry);
    else if(this.crystalWallShadowOpenByTicker.get(String(entry.ticker))?.id===entry.id)this.crystalWallShadowOpenByTicker.delete(String(entry.ticker));
  }

  crystalWallShadowRuntimeState(entry) {
    const id=String(entry?.id||'');if(!id)return null;
    if(!(this.crystalWallShadowRuntime instanceof Map))this.crystalWallShadowRuntime=new Map();
    let state=this.crystalWallShadowRuntime.get(id);
    if(!state){state={confirmations:0,firstConfirmationAtMs:0,lastBookMs:0,peakPriceCents:Number(entry.entryPriceCents||0),lowestPriceAfterEntryCents:Number(entry.entryPriceCents||0),maeCents:Number(entry.maeCents||0),maeAtMs:entry.maeAtMs||null,lastEvaluation:null};this.crystalWallShadowRuntime.set(id,state);}
    return state;
  }

  evaluateCrystalWallShadowExit(entry,q,{now=Date.now(),finalize=false}={}) {
    if(!entry?.id||String(entry.conceptName||'')!==String(CRYSTAL_WALL.shadowConceptName)||!openLike(entry.status)||!q)return null;
    const state=this.crystalWallShadowRuntimeState(entry),count=Math.max(1,Number(entry.remainingCount??entry.count??0)),entryPrice=Number(entry.entryPriceCents||0),entryFee=Number(entry.entryFeeCents||0),bid=Number(q.yesBid||0);
    const cfg=entry.entryConfig?.virtualInfinity||{};
    const required=Math.max(1,Math.floor(Number(cfg.requiredFreshConfirmations??INFINITY_BREAK.defaultRequiredFreshConfirmations)));
    const targetPerContract=Math.max(0.01,Number(cfg.minimumNetPerOriginalContractCents??this.settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents));
    const targetNet=targetPerContract*count;
    const setEvaluation=(extra={})=>{state.lastEvaluation={attack:'Crystal Wall',shadowOnly:true,evaluatedAtMs:now,entryPriceCents:entryPrice,currentBidCents:bid,requiredCount:count,confirmations:Number(state.confirmations||0),requiredConfirmations:required,targetNetPerOriginalContractCents:targetPerContract,targetNetCents:targetNet,...extra};return state.lastEvaluation;};
    if(bid>0){if(bid>state.peakPriceCents)state.peakPriceCents=bid;if(!(state.lowestPriceAfterEntryCents>0)||bid<state.lowestPriceAfterEntryCents){state.lowestPriceAfterEntryCents=bid;state.maeCents=Math.max(0,entryPrice-bid);state.maeAtMs=now;}}
    const status=String(q.status||'').toLowerCase();
    if(Boolean(q.result)||FINAL_STATUSES.has(status)){
      const payout=String(q.result||'').toLowerCase()==='yes'?100:0,pnl=(payout-entryPrice)*count-entryFee;
      setEvaluation({action:'CLOSE',settlement:true,fullPositionExecutable:true,executableCount:count,executableAverageBidCents:payout,executableNetPnlCents:pnl,bookMs:Number(q.updatedAtMs||now)});
      return{action:'CLOSE',closeReason:pnl>0?CRYSTAL_WALL.profitableCloseReason:CRYSTAL_WALL.lossCloseReason,exitPriceCents:payout,exitAverageCents:payout,exitFeeCents:0,pnlCents:pnl,bookMs:Number(q.updatedAtMs||now),peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,settlement:true};
    }
    const maxBookAge=Math.max(100,Number(cfg.maximumBookAgeMs??INFINITY_BREAK.defaultMaximumBookAgeMs));
    const bookAge=typeof this.market?.bookAgeMs==='function'?this.market.bookAgeMs(entry.ticker,now):Infinity,quoteAge=typeof this.market?.quoteAgeMs==='function'?this.market.quoteAgeMs(entry.ticker,now):Infinity;
    if(bookAge>maxBookAge||quoteAge>maxBookAge||q.bookInvalid){setEvaluation({action:'HOLD',holdReason:q.bookInvalid?'invalid_book':'stale_quote_or_book',fullPositionExecutable:false});return null;}
    const executable=this.market?.executableBid?.(entry.ticker,count),executableCount=Math.max(0,Number(executable?.filled||0));
    const fullExecutable=Boolean(executable?.full)&&executableCount+1e-9>=count&&Number.isFinite(Number(executable?.avgCents));
    if(!fullExecutable){state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;setEvaluation({action:'HOLD',holdReason:'insufficient_full_position_executable_depth',fullPositionExecutable:false,executableCount});return null;}
    const avgBid=Number(executable.avgCents),bestBid=Number(executable.bestCents??bid),bookMs=Number(this.market?.getBook?.(entry.ticker)?.updatedAtMs||q.updatedAtMs||now);
    const exitFee=String(entry.mode||this.settings.mode||'SIMULATION').toUpperCase()==='LIVE'?kalshiGeneralTakerFeeEstimateCents({count,priceCents:Math.max(0,Math.min(100,avgBid))}):Math.max(0,Number(entry.entryConfig?.simFeeCents??this.settings.simFeeCents??0))*count;
    const pnl=(avgBid-entryPrice)*count-entryFee-exitFee,danger=Number(entry.entryConfig?.aurora?.dangerPriceCents??entry.stopPriceCents??0);
    if(danger>0&&bestBid<=danger+1e-9){state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;setEvaluation({action:'CLOSE',closeReason:CRYSTAL_WALL.lossCloseReason,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,bookMs});return{action:'CLOSE',closeReason:CRYSTAL_WALL.lossCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,auroraTouch:true};}
    if(pnl+1e-9<targetNet){state.confirmations=0;state.firstConfirmationAtMs=0;state.lastBookMs=0;setEvaluation({action:'HOLD',holdReason:'below_virtual_infinity_target',fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,auroraDangerPriceCents:danger,bookMs});return null;}
    const windowMs=Math.max(250,Number(cfg.confirmationWindowMs??INFINITY_BREAK.defaultConfirmationWindowMs));
    if(finalize){const confirmationFresh=state.confirmations>=required&&state.firstConfirmationAtMs>0&&now-state.firstConfirmationAtMs<=windowMs;if(!confirmationFresh){setEvaluation({action:'HOLD',holdReason:'profit_confirmation_expired_before_commit'});return null;}setEvaluation({action:'CLOSE',closeReason:CRYSTAL_WALL.profitableCloseReason,fullPositionExecutable:true,executableCount,executableAverageBidCents:avgBid,executableBestBidCents:bestBid,executableExitFeeCents:exitFee,executableNetPnlCents:pnl,bookMs,finalRevalidation:true});return{action:'CLOSE',closeReason:CRYSTAL_WALL.profitableCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,confirmations:state.confirmations,finalRevalidation:true};}
    if(bookMs===state.lastBookMs){setEvaluation({action:'HOLD',holdReason:'waiting_for_fresh_confirmation_book',bookMs});return null;}
    if(!state.firstConfirmationAtMs||now-state.firstConfirmationAtMs>windowMs){state.confirmations=1;state.firstConfirmationAtMs=now;}else state.confirmations+=1;state.lastBookMs=bookMs;
    if(state.confirmations<required){setEvaluation({action:'HOLD',holdReason:`profit_confirmation_${state.confirmations}_of_${required}`,bookMs});return null;}
    setEvaluation({action:'CLOSE_PENDING_COMMIT',bookMs,fullPositionExecutable:true,executableNetPnlCents:pnl});
    return{action:'CLOSE',closeReason:CRYSTAL_WALL.profitableCloseReason,exitPriceCents:Math.round(avgBid),exitAverageCents:avgBid,exitFeeCents:exitFee,pnlCents:pnl,bookMs,peakPriceCents:state.peakPriceCents,lowestPriceAfterEntryCents:state.lowestPriceAfterEntryCents,maeCents:state.maeCents,maeAtMs:state.maeAtMs,confirmations:state.confirmations};
  }

  observeCrystalWallShadowExit(q) {
    const ticker=String(q?.ticker||'');if(!ticker)return false;
    const open=this.crystalWallShadowOpenByTicker?.get?.(ticker);if(!open||!openLike(open.status))return false;
    const decision=this.evaluateCrystalWallShadowExit(open,q);if(decision?.action!=='CLOSE')return true;
    this.crystalWallShadowQueue.enqueue(`close:${open.id}`,async()=>{
      const durable=typeof this.db?.entryById==='function'?await this.db.entryById(open.id).catch(()=>null):open;
      if(!durable||!openLike(durable.status)||String(durable.conceptName||'')!==String(CRYSTAL_WALL.shadowConceptName))return;
      let freshQ=this.market?.getQuote?.(ticker)||q;
      if(typeof this.market?.verifyTickerSnapshot==='function'||typeof this.market?.refreshTickerVerified==='function'){const refreshed=await this.freshExecutionSnapshot(ticker);if(!refreshed?.marketFresh||!refreshed?.bookFresh||!refreshed?.quote)return;freshQ=refreshed.quote;}
      const finalDecision=this.evaluateCrystalWallShadowExit(durable,freshQ,{finalize:true});if(finalDecision?.action!=='CLOSE')return;
      const closed=await this.strategy.closeCrystalWallShadow(durable,finalDecision);if(closed)this.rememberCrystalWallShadow(closed);
    });
    return true;
  }

  async hydrateCrystalWallShadow() {
    this.crystalWallShadowOpenByTicker=new Map();this.crystalWallShadowRecent=new Map();this.crystalWallShadowRuntime=new Map();this.crystalWallConsumedEpisodeIds=new Set();
    if(typeof this.db?.migrateSimulationCrystalWallToShadow==='function'){
      const migrated=await this.db.migrateSimulationCrystalWallToShadow(this.settings.systemName,{shadowConceptName:CRYSTAL_WALL.shadowConceptName,release:RELEASE,policyRevision:CRYSTAL_WALL.policyRevision}).catch(()=>0);
      if(migrated>0)await this.db.audit('warning','crystal_wall_simulation_rows_migrated_to_shadow',{count:migrated,shadowConceptName:CRYSTAL_WALL.shadowConceptName,release:RELEASE}).catch(()=>{});
    }
    if(typeof this.db?.entriesByConcept!=='function')return;
    const rows=await this.db.entriesByConcept(this.settings.systemName,CRYSTAL_WALL.shadowConceptName,{limit:2000}).catch(()=>[]);
    for(const entry of (rows||[]).slice().reverse())this.rememberCrystalWallShadow(entry);
  }

  rememberAnotherDimension(entry) {
    if(!entry?.id||String(entry.conceptName||'')!=='Another Dimension')return;
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

  // SJA3 is a post-Scarlet continuation authority. R69.6 removes the extra
  // CI1 gate: a profitable, fully closed Scarlet Needle row immediately arms
  // one same-ticker Justice observation. From that moment Justice measures only
  // its own configured pullback -> trough -> rebound -> upward-tick parameters.
  queueJusticeArrowContinuation(entry) {
    const id=String(entry?.id||'');if(!id)return false;
    if(!(this.justiceArrowQueue instanceof CoalescingWorkQueue))this.justiceArrowQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,key)=>{await this.db.audit('error','justice_arrow_v3_queue',{key,message:String(error?.message||error)}).catch(()=>{});}});
    return this.justiceArrowQueue.enqueue(`scarlet:${id}`,()=>this.handleJusticeArrowContinuation(entry));
  }

  justiceArrowRuntime() {
    if(!(this.justiceArrowInFlight instanceof Set))this.justiceArrowInFlight=new Set();
    if(!(this.justiceArrowWatches instanceof Map))this.justiceArrowWatches=new Map();
    if(!this.justiceArrowStats||typeof this.justiceArrowStats!=='object')this.justiceArrowStats={version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,eligible:0,parentArmed:0,authorized:0,attempted:0,opened:0,blocked:0,watching:0,duplicateSuppressed:0,expired:0,ownedSource:0,trackedSource:0,modeMismatchBlocked:0,lastEvent:null};
    const stats=this.justiceArrowStats;stats.version=SAGITTARIUS_JUSTICE_ARROW.version;stats.policyRevision=SAGITTARIUS_JUSTICE_ARROW.policyRevision;
    for(const key of ['eligible','parentArmed','authorized','attempted','opened','blocked','watching','duplicateSuppressed','expired','ownedSource','trackedSource','modeMismatchBlocked'])if(!Number.isFinite(Number(stats[key])))stats[key]=0;
    return stats;
  }

  async handleJusticeArrowContinuation(parentEntry) {
    const stats=this.justiceArrowRuntime(),s=this.settings||{},parentId=String(parentEntry?.id||''),ticker=String(parentEntry?.ticker||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),parentScarletEntryId:parentId,ticker,...data};return stats.lastEvent;};
    if(!parentId||!ticker||String(parentEntry?.conceptName||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept))return{status:'IGNORED',reason:'not_scarlet_parent'};
    if(parentEntry?.status!=='closed'||Number(parentEntry?.remainingCount||0)>1e-9)return{status:'IGNORED',reason:'parent_not_fully_closed'};
    if(!(Number(parentEntry?.pnlCents||0)>0)||String(parentEntry?.closeReason||'')!=='infinity_break')return{status:'IGNORED',reason:'parent_not_profitable_infinity_close'};
    if(s.justiceArrowEnabled!==true)return{status:'IGNORED',reason:'justice_arrow_disabled'};
    if(String(parentEntry?.systemName||'')!==String(s.systemName)||String(parentEntry?.ownerId||'')!==String(s.ownerId)){stats.blocked+=1;record('BLOCKED',{reason:'owner_or_system_mismatch'});return{status:'BLOCKED',reason:'owner_or_system_mismatch'};}
    if(String(parentEntry?.mode||'')!==String(s.mode||'')){stats.modeMismatchBlocked+=1;stats.blocked+=1;record('BLOCKED',{reason:'mode_changed_since_scarlet_close'});return{status:'BLOCKED',reason:'mode_changed_since_scarlet_close'};}
    if(typeof this.db?.entryById!=='function'){stats.blocked+=1;record('BLOCKED',{reason:'parent_durable_read_unavailable'});return{status:'BLOCKED',reason:'parent_durable_read_unavailable'};}
    const durable=await this.db.entryById(parentId).catch(()=>null),scarlet=durable?.entryConfig?.scarletContinuation||{};
    const parentOk=String(durable?.id||'')===parentId&&String(durable?.systemName||'')===String(s.systemName)&&String(durable?.ownerId||'')===String(s.ownerId)&&String(durable?.mode||'')===String(s.mode||'')&&String(durable?.conceptName||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept)&&String(durable?.ticker||'')===ticker&&String(durable?.status||'')==='closed'&&Number(durable?.remainingCount||0)<=1e-9&&Number(durable?.pnlCents||0)>0&&String(durable?.closeReason||'')==='infinity_break'&&String(scarlet?.version||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentVersion)&&String(scarlet?.policyRevision||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentPolicyRevision)&&String(durable?.entryConfig?.profitAuthority||'')===String(INFINITY_BREAK.version)&&Number(durable?.closedAtMs||0)>0;
    if(!parentOk){stats.blocked+=1;record('BLOCKED',{reason:'parent_scarlet_durable_provenance_invalid'});await this.db.audit('warning','justice_arrow_v3_parent_blocked',{parentScarletEntryId:parentId,ticker,reason:'parent_scarlet_durable_provenance_invalid'}).catch(()=>{});return{status:'BLOCKED',reason:'parent_scarlet_durable_provenance_invalid'};}
    const authorizationId=`JUSTICE-ARROW-V3:SCARLET:${parentId}`,observationId=`JUSTICE-ARROW-V3:OBS:${parentId}`;
    const existing=typeof this.db?.opportunityEpisode==='function'?await this.db.opportunityEpisode(authorizationId).catch(()=>null):null,existingState=String(existing?.athenaDecision?.justiceArrow?.status||existing?.athenaDecision?.decision||'').toUpperCase();
    if(existing?.entryId||['OPENED','EXPIRED','BLOCKED'].includes(existingState)){stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{authorizationId,reason:'durable_parent_already_consumed',existingState});return{status:'DUPLICATE_SUPPRESSED',reason:'durable_parent_already_consumed'};}
    const parentClosedAtMs=Number(durable.closedAtMs||0),seed=Math.max(1,Number(durable.exitPriceCents||0));
    const watch={authorizationId,observationId,parentScarletEntryId:parentId,postScarletContinuation:true,directPostScarletObservation:true,ticker,eventTicker:String(durable.eventTicker||ticker),sport:String(durable.sport||'Unknown'),parentScarletClosedAtMs:parentClosedAtMs,parentScarletExitPriceCents:seed,parentScarletRealizedPnlCents:Number(durable.pnlCents||0),parentScarletVersion:String(scarlet.version||''),parentScarletPolicyRevision:String(scarlet.policyRevision||''),parentScarletAuthorizationId:String(scarlet.authorizationId||''),authorizedAtMs:Date.now(),observationStartedAtMs:parentClosedAtMs,preCrashPeakCents:seed,troughCents:seed,troughAtMs:parentClosedAtMs,crashDepthCents:0,crashStartedAtMs:0,ownCrashArmed:false,reboundCents:0,upwardTicks:0,lastBidCents:seed,lastAttemptQueuedAtMs:0,status:'OBSERVING',sourceKind:'POST_SCARLET_NEEDLE'};
    for(const [id,prior] of this.justiceArrowWatches){if(String(prior?.ticker||'')===ticker&&String(id)!==authorizationId)this.dropJusticeArrowWatch(id);}
    const lineage={version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,status:'OBSERVING',terminal:false,authorizationId,observationId,parentScarletEntryId:parentId,postScarletContinuation:true,directPostScarletObservation:true,ticker,eventTicker:watch.eventTicker,parentScarletClosedAtMs:parentClosedAtMs,parentScarletExitPriceCents:seed,parentScarletRealizedPnlCents:watch.parentScarletRealizedPnlCents,parentScarletVersion:watch.parentScarletVersion,parentScarletPolicyRevision:watch.parentScarletPolicyRevision,parentScarletAuthorizationId:watch.parentScarletAuthorizationId,authorizedAtMs:watch.authorizedAtMs,observationStartedAtMs:parentClosedAtMs,preCrashPeakCents:seed,ownCrashArmed:false,profitAuthority:ATHENA_EXIT_INTELLIGENCE.version};
    const decision={decision:'OBSERVING',reason:'profitable_scarlet_started_direct_justice_observation',strategicAuthority:false,justiceArrow:lineage};
    await this.db.upsertOpportunityEpisode({id:authorizationId,systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:watch.eventTicker,side:'YES',sport:watch.sport,boltAtMs:parentClosedAtMs,boltSnapshot:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authority:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,parentScarletEntryId:parentId,parentScarletClosedAtMs:parentClosedAtMs,observationId,observationStartedAtMs:parentClosedAtMs},athenaDecision:decision,fireCommand:{},attackSelected:'Sagittarius Justice Arrow',entryId:null,entryAtMs:null,outcome:{informationOnly:true,justiceArrowAuthority:false,waitingForJusticeOwnConfirmation:true,ci1CrashRequired:false},trackingComplete:false,updatedAtMs:Date.now()});
    this.justiceArrowWatches.set(authorizationId,watch);if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);if(this.market?.setWanted){const wanted=new Set(this.market?.wanted||[]);wanted.add(ticker);this.market.setWanted([...wanted]);}
    stats.eligible+=1;stats.parentArmed+=1;record('OBSERVING',{authorizationId,observationId,parentClosedAtMs,parentScarletExitPriceCents:seed,parentScarletRealizedPnlCents:watch.parentScarletRealizedPnlCents});
    await this.db.audit('info','justice_arrow_v3_direct_observation_started',{authorizationId,observationId,parentScarletEntryId:parentId,ticker,parentClosedAtMs,parentScarletExitPriceCents:seed,parentScarletRealizedPnlCents:watch.parentScarletRealizedPnlCents,minCrashCents:Number(s.justiceArrowMinCrashCents),minReboundCents:Number(s.justiceArrowMinReboundCents),minUpwardTicks:Number(s.justiceArrowMinUpwardTicks),ci1CrashRequired:false}).catch(()=>{});
    return{status:'OBSERVING',authorizationId,observationId,parentScarletEntryId:parentId};
  }

  dropJusticeArrowWatch(authorizationId) {
    if(!(this.justiceArrowWatches instanceof Map))return null;const id=String(authorizationId||''),prior=this.justiceArrowWatches.get(id)||null;if(!prior)return null;this.justiceArrowWatches.delete(id);const ticker=String(prior?.ticker||'');
    if(ticker&&this.recoveryPriorityTickers instanceof Set){const cwStill=[...(this.crystalWallWatches||new Map()).values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');const jaStill=[...this.justiceArrowWatches.values()].some((w)=>String(w?.ticker||'')===ticker&&!w?.terminal&&String(w?.status||'')!=='EXPIRED');if(!cwStill&&!jaStill)this.recoveryPriorityTickers.delete(ticker);}return prior;
  }

  observeJusticeArrowQuote(q) {
    const s=this.settings||{};if(s.justiceArrowEnabled!==true||!q?.ticker||!(this.justiceArrowWatches instanceof Map))return false;
    const ticker=String(q.ticker),now=Date.now(),watches=[...this.justiceArrowWatches.values()].filter((w)=>String(w?.ticker||'')===ticker);if(!watches.length)return false;
    for(const prior of watches){
      const signal=justiceArrowSignalState(prior,q,s,now),newOwnCrash=prior?.ownCrashArmed!==true&&signal?.ownCrashArmed===true;
      const status=signal.terminal?'EXPIRED':signal.qualified?'READY':signal.ownCrashArmed!==true?'TRACKING_PEAK':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING';
      const watch={...prior,...signal,authorizationId:String(prior.authorizationId),observationId:String(prior.observationId),ticker,eventTicker:String(q.eventTicker||prior.eventTicker||ticker),updatedAtMs:now,status};
      if(!signal.qualified&&!signal.terminal){watch.retryNotBeforeMs=0;watch.retryReason=null;}this.justiceArrowWatches.set(String(watch.authorizationId),watch);
      if(newOwnCrash){const stats=this.justiceArrowRuntime();stats.lastEvent={status:'OWN_CRASH_ARMED',atMs:now,authorizationId:watch.authorizationId,parentScarletEntryId:watch.parentScarletEntryId,observationId:watch.observationId,ticker,crashDepthCents:Number(signal.crashDepthCents||0)};}
      if(this.recoveryWatchShouldQueue(prior,signal,now,{isNew:newOwnCrash})){this.stampRecoveryWatchAttempt(this.justiceArrowWatches,String(watch.authorizationId),signal,now);this.queueJusticeArrowWatch(String(watch.authorizationId));}
    }
    while(this.justiceArrowWatches.size>RECOVERY_WATCH_EXECUTION_GOVERNOR.maximumWatchesPerAttack){const oldest=this.justiceArrowWatches.keys().next().value;this.dropJusticeArrowWatch(oldest);}return true;
  }

  queueJusticeArrowWatch(authorizationOrTicker) {
    const key=String(authorizationOrTicker||'');if(!key||!(this.justiceArrowWatches instanceof Map))return false;
    const watches=this.justiceArrowWatches.has(key)?[this.justiceArrowWatches.get(key)]:[...this.justiceArrowWatches.values()].filter((w)=>String(w?.ticker||'')===key);if(!watches.length)return false;
    if(!(this.justiceArrowQueue instanceof CoalescingWorkQueue))this.justiceArrowQueue=new CoalescingWorkQueue({maxConcurrency:1,onError:async(error,k)=>{await this.db.audit('error','justice_arrow_v3_queue',{key:k,message:String(error?.message||error)}).catch(()=>{});}});
    for(const watch of watches)this.justiceArrowQueue.enqueue(`observe:${String(watch.authorizationId)}`,()=>this.attemptJusticeArrowAttack(String(watch.authorizationId)));return true;
  }

  async attemptJusticeArrowAttack(authorizationId) {
    const stats=this.justiceArrowRuntime(),s=this.settings||{},watch=this.justiceArrowWatches.get(String(authorizationId));if(!watch)return{status:'IGNORED',reason:'watch_missing'};
    const ticker=String(watch.ticker||''),observationId=String(watch.observationId||''),parentScarletEntryId=String(watch.parentScarletEntryId||'');
    const record=(status,data={})=>{stats.lastEvent={status,atMs:Date.now(),authorizationId:String(authorizationId),parentScarletEntryId,observationId,ticker,...data};return stats.lastEvent;};
    if(s.justiceArrowEnabled!==true){this.dropJusticeArrowWatch(String(authorizationId));return{status:'IGNORED',reason:'justice_arrow_disabled'};}
    if(!parentScarletEntryId||!observationId||watch.postScarletContinuation!==true||watch.directPostScarletObservation!==true){stats.blocked+=1;record('BLOCKED',{reason:'post_scarlet_direct_observation_missing'});return{status:'BLOCKED',reason:'post_scarlet_direct_observation_missing'};}
    if(watch.ownCrashArmed!==true){stats.watching+=1;record('WATCHING',{reason:'waiting_for_justice_own_crash'});return{status:'WATCHING',reason:'waiting_for_justice_own_crash'};}
    const windowMs=Math.max(1,Number(s.recoveryTrackingHours||24))*3600000;if(Number(watch.parentScarletClosedAtMs||0)>0&&Date.now()-Number(watch.parentScarletClosedAtMs)>windowMs){this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'tracking_window_elapsed'});return{status:'EXPIRED',reason:'tracking_window_elapsed'};}
    if(this.justiceArrowInFlight.has(String(authorizationId))){stats.duplicateSuppressed+=1;return{status:'DUPLICATE_SUPPRESSED',reason:'local_in_flight'};}this.justiceArrowInFlight.add(String(authorizationId));
    let unlock=null;
    const baseEpisode=(decision={},fireCommand={})=>({id:String(authorizationId),systemName:s.systemName,sourceRelease:RELEASE,cohortId:String(s.resetTimestampMs||''),ticker,eventTicker:String(watch.eventTicker||ticker),side:'YES',sport:String(watch.sport||'Unknown'),boltAtMs:Number(watch.parentScarletClosedAtMs||watch.observationStartedAtMs||watch.authorizedAtMs||Date.now()),boltSnapshot:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,authority:SAGITTARIUS_JUSTICE_ARROW.strategicEntryAuthority,parentScarletEntryId,parentScarletClosedAtMs:Number(watch.parentScarletClosedAtMs||0),observationId,observationStartedAtMs:Number(watch.observationStartedAtMs||0),preCrashPeakCents:Number(watch.preCrashPeakCents||0),crashDepthCents:Number(watch.crashDepthCents||0)},athenaDecision:decision,fireCommand,attackSelected:'Sagittarius Justice Arrow',entryId:null,entryAtMs:null,outcome:{},trackingComplete:false,updatedAtMs:Date.now()});
    try{
      if(typeof this.db.acquireHunterTickerLock==='function'){unlock=await this.db.acquireHunterTickerLock(s.systemName,`justice-arrow-v3:${String(authorizationId)}`);if(!unlock){stats.duplicateSuppressed+=1;return{status:'DUPLICATE_SUPPRESSED',reason:'database_lock_busy'};}}
      const existing=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):null;if(!existing){stats.blocked+=1;record('BLOCKED',{reason:'parent_authorization_not_durable'});return{status:'BLOCKED',reason:'parent_authorization_not_durable'};}
      const existingState=String(existing?.athenaDecision?.justiceArrow?.status||existing?.athenaDecision?.decision||'').toUpperCase();if(existing?.entryId||['OPENED','EXPIRED','BLOCKED'].includes(existingState)){this.dropJusticeArrowWatch(String(authorizationId));stats.duplicateSuppressed+=1;record('DUPLICATE_SUPPRESSED',{existingState,entryId:existing?.entryId||null});return{status:'DUPLICATE_SUPPRESSED',reason:'durable_episode_consumed'};}
      if(String(existing?.athenaDecision?.justiceArrow?.parentScarletEntryId||existing?.boltSnapshot?.parentScarletEntryId||'')!==parentScarletEntryId||String(existing?.athenaDecision?.justiceArrow?.observationId||existing?.boltSnapshot?.observationId||'')!==observationId){stats.blocked+=1;record('BLOCKED',{reason:'durable_parent_or_observation_identity_mismatch'});return{status:'BLOCKED',reason:'durable_parent_or_observation_identity_mismatch'};}
      if(typeof this.db?.entryById!=='function'){stats.blocked+=1;record('BLOCKED',{reason:'parent_durable_read_unavailable'});return{status:'BLOCKED',reason:'parent_durable_read_unavailable'};}
      const parent=await this.db.entryById(parentScarletEntryId).catch(()=>null),scarlet=parent?.entryConfig?.scarletContinuation||{},observationStartedAtMs=Number(watch.observationStartedAtMs||0);
      const parentOk=String(parent?.systemName||'')===String(s.systemName)&&String(parent?.ownerId||'')===String(s.ownerId)&&String(parent?.mode||'')===String(s.mode||'')&&String(parent?.conceptName||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept)&&String(parent?.ticker||'')===ticker&&String(parent?.status||'')==='closed'&&Number(parent?.remainingCount||0)<=1e-9&&Number(parent?.pnlCents||0)>0&&String(parent?.closeReason||'')==='infinity_break'&&String(scarlet?.version||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentVersion)&&String(scarlet?.policyRevision||'')===String(SAGITTARIUS_JUSTICE_ARROW.requiredParentPolicyRevision)&&String(parent?.entryConfig?.profitAuthority||'')===String(INFINITY_BREAK.version)&&observationStartedAtMs+1e-9>=Number(parent?.closedAtMs||0)&&Number(watch.crashStartedAtMs||0)+1e-9>=observationStartedAtMs;
      if(!parentOk){const decision={decision:'BLOCKED',reason:'parent_scarlet_revalidation_failed',strategicAuthority:false,justiceArrow:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,status:'BLOCKED',terminal:true,authorizationId:String(authorizationId),parentScarletEntryId,observationId}};await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...existing,athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});this.dropJusticeArrowWatch(String(authorizationId));stats.blocked+=1;record('BLOCKED',{reason:'parent_scarlet_revalidation_failed'});return{status:'BLOCKED',reason:'parent_scarlet_revalidation_failed'};}
      const lineage={version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,status:'OWN_CRASH_ARMED',terminal:false,authorizationId:String(authorizationId),observationId,parentScarletEntryId,postScarletContinuation:true,directPostScarletObservation:true,parentScarletClosedAtMs:Number(parent.closedAtMs||0),parentScarletExitPriceCents:Number(parent.exitPriceCents||0),parentScarletRealizedPnlCents:Number(parent.pnlCents||0),parentScarletVersion:String(scarlet.version||''),parentScarletPolicyRevision:String(scarlet.policyRevision||''),parentScarletAuthorizationId:String(scarlet.authorizationId||''),ticker,eventTicker:String(watch.eventTicker||ticker),authorizedAtMs:Number(watch.authorizedAtMs||Date.now()),observationStartedAtMs,crashStartedAtMs:Number(watch.crashStartedAtMs||0),ownCrashArmed:true,preCrashPeakCents:Number(watch.preCrashPeakCents||0),troughCents:Number(watch.troughCents||0),troughAtMs:Number(watch.troughAtMs||0),crashDepthCents:Number(watch.crashDepthCents||0),reboundCents:Number(watch.reboundCents||0),upwardTicks:Number(watch.upwardTicks||0),fixedStakeCents:Number(s.justiceArrowStakeCents),stakeMultiplier:1,stakeMultiplierAllowed:false,oneEntryPerCrashEpisode:false,oneEntryPerParentScarlet:true,profitAuthority:ATHENA_EXIT_INTELLIGENCE.version,sourceKind:'POST_SCARLET_NEEDLE'};
      if(existingState!=='AUTHORIZED'&&existingState!=='OWN_CRASH_ARMED'){const decision={decision:'AUTHORIZED',reason:'post_scarlet_direct_own_confirmation_authorized_justice_arrow_v3',strategicAuthority:true,justiceArrow:lineage};await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...existing,athenaDecision:decision,trackingComplete:false,updatedAtMs:Date.now()});stats.authorized+=1;record('AUTHORIZED',{crashDepthCents:Number(watch.crashDepthCents||0)});}
      if(watch.terminal||String(watch.status)==='EXPIRED'){const decision={decision:'EXPIRED',reason:'market_final',strategicAuthority:true,justiceArrow:{...lineage,status:'EXPIRED',terminal:true}};await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...existing,athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_final'});return{status:'EXPIRED',reason:'market_final'};}
      const gate=this.entryExecutionGate();if(!gate.allowed){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),gate.reason,RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:gate.reason});return{status:'WATCHING',reason:gate.reason};}
      if(String(watch.status||'')!=='READY'){stats.watching+=1;record('WATCHING',{reason:'rebound_not_ready',watchStatus:String(watch.status||'')});return{status:'WATCHING',reason:'rebound_not_ready'};}
      const openRows=typeof this.db?.openEntriesByTicker==='function'?await this.db.openEntriesByTicker(s.systemName,ticker).catch(()=>[]):[],coexisting=openRows.filter((e)=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&openLike(e.status)&&String(e.ownerId||s.ownerId)===String(s.ownerId)&&String(e.mode||s.mode)===String(s.mode)),sameConcept=coexisting.filter((e)=>String(e.conceptName||'')==='Sagittarius Justice Arrow');
      if(sameConcept.length){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'ticker_exposure_active',RECOVERY_WATCH_EXECUTION_GOVERNOR.exposureBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'ticker_exposure_active',existingEntryIds:sameConcept.map((e)=>String(e.id))});return{status:'WATCHING',reason:'ticker_exposure_active'};}
      const cached=this.market?.getQuote?.(ticker)||null;if(!cached||cached.bookInvalid===true){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'canonical_book_not_ready',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'canonical_book_not_ready'});return{status:'WATCHING',reason:'canonical_book_not_ready'};}
      const q={...cached,ticker,eventTicker:String(cached.eventTicker||cached.ticker||ticker)},status=String(q.status||'').toLowerCase();if(String(q.eventTicker||ticker)!==String(watch.eventTicker||ticker)){stats.blocked+=1;record('BLOCKED',{reason:'event_identity_mismatch'});return{status:'BLOCKED',reason:'event_identity_mismatch'};}
      if(status!=='active'||Boolean(q.result)){const decision={decision:'EXPIRED',reason:'market_not_active',strategicAuthority:true,justiceArrow:{...lineage,status:'EXPIRED',terminal:true}};await this.db.upsertOpportunityEpisode({...baseEpisode(decision),...existing,athenaDecision:decision,trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});this.dropJusticeArrowWatch(String(authorizationId));stats.expired+=1;record('EXPIRED',{reason:'market_not_active'});return{status:'EXPIRED',reason:'market_not_active'};}
      const signal=justiceArrowSignalState(watch,q,s,Date.now()),updated={...watch,...signal,updatedAtMs:Date.now(),status:signal.qualified?'READY':signal.ownCrashArmed!==true?'TRACKING_PEAK':signal.reason==='tracking_new_low'?'TRACKING_TROUGH':'REBOUND_CONFIRMING'};this.justiceArrowWatches.set(String(authorizationId),updated);
      if(!signal.qualified){stats.watching+=1;record('WATCHING',{reason:signal.reason,preCrashPeakCents:signal.preCrashPeakCents,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});return{status:'WATCHING',reason:signal.reason};}
      const executionWatch={...updated,...signal,sourceKind:'POST_SCARLET_NEEDLE',coexistingEntryIds:coexisting.filter((e)=>String(e.conceptName||'')!=='Sagittarius Justice Arrow').map((e)=>String(e.id))};stats.attempted+=1;record('ATTEMPTED',{sourceKind:'POST_SCARLET_NEEDLE',bidCents:signal.bidCents,askCents:signal.askCents,troughCents:signal.troughCents,reboundCents:signal.reboundCents,upwardTicks:signal.upwardTicks});
      const opened=await this.strategy.executeJusticeArrowContinuation(q,executionWatch);if(!opened){this.setRecoveryWatchBackoff(this.justiceArrowWatches,String(authorizationId),'hard_safety_liquidity_or_capacity_blocked',RECOVERY_WATCH_EXECUTION_GOVERNOR.genericExecutionBlockedRetryMs);stats.watching+=1;record('WATCHING',{reason:'hard_safety_liquidity_or_capacity_blocked',sourceKind:'POST_SCARLET_NEEDLE'});return{status:'WATCHING',reason:'hard_safety_liquidity_or_capacity_blocked'};}
      this.dropJusticeArrowWatch(String(authorizationId));stats.opened+=1;record('OPENED',{sourceKind:'POST_SCARLET_NEEDLE',entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0)});
      const openedLineage=structuredClone(opened.entryConfig?.justiceArrow||executionWatch),openedDecision={decision:'OPENED',reason:'justice_arrow_v3_direct_post_scarlet_confirmation_opened',strategicAuthority:true,justiceArrow:{...openedLineage,status:'OPENED',terminal:true,entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),entryPriceCents:Number(opened.entryPriceCents||0)}};const current=typeof this.db.opportunityEpisode==='function'?await this.db.opportunityEpisode(String(authorizationId)).catch(()=>null):existing;
      await this.db.upsertOpportunityEpisode({...baseEpisode(openedDecision,structuredClone(opened.entryConfig?.justiceArrowFire||{})),...(current||{}),athenaDecision:openedDecision,fireCommand:structuredClone(opened.entryConfig?.justiceArrowFire||{}),entryId:opened.id,entryAtMs:Number(opened.openedAtMs||Date.now()),attackSelected:'Sagittarius Justice Arrow',trackingComplete:true,updatedAtMs:Date.now()}).catch(()=>{});
      if(typeof this.db?.updateEntry==='function'){const feederState={...(parent.feederState||{}),justiceArrowEntryId:opened.id,justiceArrowOpenedAtMs:Number(opened.openedAtMs||Date.now()),justiceArrowAuthorizationId:String(authorizationId)};await this.db.updateEntry(parentScarletEntryId,{feederState,updatedAtMs:Date.now()}).catch(()=>{});}
      await this.db.audit('info','justice_arrow_v3_opened',{authorizationId:String(authorizationId),observationId,parentScarletEntryId,ticker,sourceKind:'POST_SCARLET_NEEDLE',entryId:opened.id,entryPriceCents:Number(opened.entryPriceCents||0),count:Number(opened.count||0),troughCents:Number(signal.troughCents||0),reboundCents:Number(signal.reboundCents||0),fixedStakeCents:Number(s.justiceArrowStakeCents),stakeMultiplier:1,profitAuthority:opened.entryConfig?.profitAuthority||null,ci1CrashRequired:false}).catch(()=>{});return{status:'OPENED',authorizationId:String(authorizationId),entry:opened};
    }catch(error){stats.blocked+=1;record('BLOCKED',{reason:'justice_arrow_v3_exception',message:String(error?.message||error)});await this.db.audit('error','justice_arrow_v3_failed',{authorizationId:String(authorizationId),parentScarletEntryId,observationId,ticker,message:String(error?.message||error)}).catch(()=>{});return{status:'BLOCKED',reason:'justice_arrow_v3_exception'};}finally{if(unlock)await unlock().catch(()=>{});this.justiceArrowInFlight.delete(String(authorizationId));}
  }

  async hydrateJusticeArrowV3() {
    this.justiceArrowWatches=new Map();if(this.settings?.justiceArrowEnabled!==true||typeof this.db?.opportunityEpisodes!=='function')return;
    const windowMs=Math.max(1,Number(this.settings.recoveryTrackingHours||24))*3600000,sinceMs=Date.now()-windowMs,episodes=await this.db.opportunityEpisodes(this.settings.systemName,{limit:1000,trackingComplete:false,sinceMs}).catch(()=>[]);
    for(const ep of episodes||[]){
      const ja=ep?.athenaDecision?.justiceArrow;if(String(ja?.version||'')!==String(SAGITTARIUS_JUSTICE_ARROW.version)||String(ja?.policyRevision||'')!==String(SAGITTARIUS_JUSTICE_ARROW.policyRevision))continue;const state=String(ja?.status||ep?.athenaDecision?.decision||'').toUpperCase();if(ep?.entryId||ja?.terminal===true||['OPENED','EXPIRED','BLOCKED'].includes(state))continue;
      const parentScarletEntryId=String(ja?.parentScarletEntryId||ep?.boltSnapshot?.parentScarletEntryId||''),ticker=String(ep?.ticker||ja?.ticker||''),observationId=String(ja?.observationId||ep?.boltSnapshot?.observationId||'');if(!parentScarletEntryId||!ticker||!observationId)continue;
      const parent=typeof this.db?.entryById==='function'?await this.db.entryById(parentScarletEntryId).catch(()=>null):null,scarlet=parent?.entryConfig?.scarletContinuation||{};if(String(parent?.systemName||'')!==String(this.settings.systemName)||String(parent?.ownerId||'')!==String(this.settings.ownerId)||String(parent?.mode||'')!==String(this.settings.mode)||String(parent?.conceptName||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept)||String(parent?.ticker||'')!==ticker||String(parent?.status||'')!=='closed'||Number(parent?.remainingCount||0)>1e-9||Number(parent?.pnlCents||0)<=0||String(parent?.closeReason||'')!=='infinity_break'||String(scarlet?.version||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentVersion)||String(scarlet?.policyRevision||'')!==String(SAGITTARIUS_JUSTICE_ARROW.requiredParentPolicyRevision))continue;
      const authorizationId=String(ja?.authorizationId||ep.id||`JUSTICE-ARROW-V3:SCARLET:${parentScarletEntryId}`),seed=Math.max(1,Number(parent.exitPriceCents||ja?.parentScarletExitPriceCents||0)),observationStartedAtMs=Number(ja?.observationStartedAtMs||ep?.boltSnapshot?.observationStartedAtMs||parent.closedAtMs||0);
      const watch={authorizationId,observationId,parentScarletEntryId,postScarletContinuation:true,directPostScarletObservation:true,ticker,eventTicker:String(ep?.eventTicker||ja?.eventTicker||ticker),sport:String(ep?.sport||'Unknown'),parentScarletClosedAtMs:Number(parent.closedAtMs||ja?.parentScarletClosedAtMs||0),parentScarletExitPriceCents:seed,parentScarletRealizedPnlCents:Number(parent.pnlCents||ja?.parentScarletRealizedPnlCents||0),parentScarletVersion:String(scarlet.version||''),parentScarletPolicyRevision:String(scarlet.policyRevision||''),parentScarletAuthorizationId:String(scarlet.authorizationId||''),authorizedAtMs:Number(ja?.authorizedAtMs||ep?.updatedAtMs||Date.now()),observationStartedAtMs,preCrashPeakCents:Number(ja?.preCrashPeakCents||ep?.boltSnapshot?.preCrashPeakCents||seed),troughCents:Number(ja?.troughCents||seed),troughAtMs:Number(ja?.troughAtMs||observationStartedAtMs),crashDepthCents:Number(ja?.crashDepthCents||ep?.boltSnapshot?.crashDepthCents||0),crashStartedAtMs:Number(ja?.crashStartedAtMs||0),ownCrashArmed:ja?.ownCrashArmed===true,reboundCents:Number(ja?.reboundCents||0),upwardTicks:Number(ja?.upwardTicks||0),lastBidCents:Number(ja?.lastBidCents||ja?.troughCents||seed),lastAttemptQueuedAtMs:0,status:'RESTART_REHYDRATED',sourceKind:'POST_SCARLET_NEEDLE',coexistingEntryIds:[]};
      this.justiceArrowWatches.set(authorizationId,watch);if(this.recoveryPriorityTickers instanceof Set)this.recoveryPriorityTickers.add(ticker);
    }
    const stats=this.justiceArrowRuntime();stats.lastEvent=this.justiceArrowWatches.size?{status:'RESTART_REHYDRATED',atMs:Date.now(),activeWatches:this.justiceArrowWatches.size}:stats.lastEvent;
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
    if(!parentId||!ticker||parentShadow?.conceptName!=='Another Dimension'||parentShadow?.status!=='closed'||Number(parentShadow?.remainingCount||0)>1e-9)return {status:'IGNORED',reason:'not_completed_another_dimension'};
    if(String(parentShadow.closeReason||'')!==ANOTHER_DIMENSION.lossCloseReason)return {status:'IGNORED',reason:'not_another_dimension_aurora_loss'};
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
    const signal=plasmaSignalState(parentShadow,q,null,s,Number(parentShadow.exitPriceCents||0));
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
    // R69.5 one-time doctrine migration: Justice Arrow used to be an optional
    // independent CI1 authority and may therefore be persisted OFF in existing
    // R69.4 deployments. Arm the new post-Scarlet authority exactly once, then
    // persist a hidden migration marker so later operator disables remain durable.
    const justiceMigration=applyJusticeArrowPostScarletV3Migration(loadedSettings);
    const justiceArrowV3MigrationRequired=justiceMigration.migrated;
    const startupMode = normalizeStartupExecutionMode(justiceMigration.settings, env.allowLiveTrading);
    this.settings = startupMode.settings;
    if (justiceArrowV3MigrationRequired) {
      await this.db.saveSettings(this.settings);
      await this.db.audit('info','justice_arrow_v3_post_scarlet_migration_applied',{
        release:RELEASE, enabled:true, policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,
      }).catch(()=>{});
    }
    // A persisted LIVE mode is the operator's durable execution intent. Keep the
    // runtime arm false during boot, then restore it automatically only after
    // the same hard readiness gates used by manual LIVE arming are green.
    this.startupLiveResumeRequested = this.settings.mode === 'LIVE' && env.allowLiveTrading === true;
    if (startupMode.recovered) {
      await this.db.saveSettings(this.settings);
      await this.db.audit('warning', 'startup_mode_recovered_to_simulation', {
        release: RELEASE, priorMode:'LIVE', mode:'SIMULATION', reason:startupMode.reason,
        allowLiveTrading:env.allowLiveTrading, engineActive:this.settings.engineActive === true,
      }).catch(() => {});
    }
    if (typeof this.db.ensureCosmosSettingsRows === 'function') {
      await this.db.ensureCosmosSettingsRows(freshInstallSettings()).catch(()=>{});
    }
    await this.hydrateCosmosBooks().catch(()=>{});
    this.syncCosmosWindowsFromSettings(this.settings);
    await this.hydrateCosmosWindows().catch(()=>{});
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
        // R59/CI1-F1: update causal crash state before the quote is allowed to
        // wake Atomic Thunder/A8. R58 queued Athena first and only then updated
        // CI1, which let a fresh market quote race a stale crash-state snapshot.
        if (q?.ticker && this.learning) {
          try {
            const observedAtMs=Math.min(Date.now(),Math.max(1,Number(q?.quoteAtMs||q?.updatedAtMs||Date.now())));
            const result=this.learning.observeCrashQuote(q,this.settings,observedAtMs);
            const state = result?.state;
            if (state?.phase === 'CRASHING' || state?.phase === 'REBOUND_CONFIRMED') this.crashPriorityTickers.add(q.ticker);
            else if (state?.phase === 'NORMAL' || state?.phase === 'FINAL') this.crashPriorityTickers.delete(q.ticker);
            // CW3 hot path is memory-only. CI1's unique crash episode arms an
            // independent rebound watch; only meaningful state transitions or
            // a READY execution attempt are queued off the quote callback.
            this.observeCrystalWallQuote(q,state);
          } catch(e) {
            void this.db.audit('error','crash_intelligence_quote',{ticker:q.ticker,message:String(e?.message||e)}).catch(()=>{});
          }
        }
        // R69.6 Justice Arrow is independent of CI1 after Scarlet. Its quote-rate
        // observer is memory-only and runs even if crash intelligence is unavailable.
        try { this.observeJusticeArrowQuote(q); } catch(error) {
          void this.db.audit('error','justice_arrow_v3_quote_observer',{ticker:q?.ticker||null,message:String(error?.message||error)}).catch(()=>{});
        }
        try { this.observeMegaWaveQuote(q); } catch(error) {
          void this.db.audit('error','mega_wave_quote_observer',{ticker:q?.ticker||null,message:String(error?.message||error)}).catch(()=>{});
        }
        try { this.observeAthenaExclamationConfirmationQuote(q); } catch(error) {
          void this.db.audit('error','athena_exclamation_confirmation_quote_observer',{ticker:q?.ticker||null,message:String(error?.message||error)}).catch(()=>{});
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
        if(String(entry?.conceptName||'')==='Athena Exclamation')this.queueMegaWaveAthenaClose(entry);
      },
    });
    this.goldenEye = new GoldenEye({
      db:this.db, market:this.market, getSettings:()=>this.settings,
      audit:(event,data)=>this.db.audit('info',event,data),
    });
    await this.goldenEye.init();
    this.strategy = new StrategyEngine({
      db: this.db,
      kalshi: this.kalshi,
      market: this.market,
      learning: this.learning,
      athena: this.legacyAthena,
      getSettings: () => this.settings,
      getLiveReady: () => this.isLiveReady(),
      refreshGameClock: (q, options) => this.refreshGameClockForQuote(q, options),
      onHunterOpened: (entry) => {
        if (!entry?.ticker) return;
        this.rememberCosmosBookEntry?.(entry);
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
        if(String(entry?.conceptName||'')==='Another Dimension')this.rememberAnotherDimension(entry);
        else if(String(entry?.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName))this.rememberCrystalWallShadow(entry);
        this.invalidateStateSnapshot();
        if(entry?.ticker){const wanted=new Set(this.market?.wanted||[]);wanted.add(entry.ticker);this.market?.setWanted?.([...wanted]);}
      },
      onShadowAttackClosed: (entry) => {
        if(String(entry?.conceptName||'')==='Another Dimension'){
          this.rememberAnotherDimension(entry);
          this.anotherDimensionRuntime.delete(String(entry?.id||''));
          if(Number(entry?.pnlCents||0)>0&&String(entry?.closeReason||'')===ANOTHER_DIMENSION.profitableCloseReason){this.anotherDimensionStats.profitClosed+=1;}
          else if(entry?.status==='closed'){
            this.anotherDimensionStats.lossClosed+=1;
            // Mega Wave retires the old Another Dimension -> Lightning Plasma
            // creation authority. Historical Another Dimension rows remain
            // observable, but only a profitable Athena parent may release LP.
          }
          if(entry?.status==='closed')this.anotherDimensionStats.realizedPnlCents=Number(this.anotherDimensionStats.realizedPnlCents||0)+Number(entry?.pnlCents||0);
          this.anotherDimensionStats.lastEvent={status:'CLOSED',atMs:Date.now(),entryId:entry?.id||null,ticker:entry?.ticker||null,closeReason:entry?.closeReason||null,pnlCents:Number(entry?.pnlCents||0)};
        } else if(String(entry?.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName)) {
          this.rememberCrystalWallShadow(entry);
          this.crystalWallShadowRuntime.delete(String(entry?.id||''));
          if(entry?.status==='closed'){
            if(Number(entry?.pnlCents||0)>0&&String(entry?.closeReason||'')===String(CRYSTAL_WALL.profitableCloseReason)){
              this.crystalWallContinuationStats.profitClosed=Number(this.crystalWallContinuationStats.profitClosed||0)+1;
              this.queueMegaWaveAthenaContinuation(entry);
            } else {
              this.crystalWallContinuationStats.lossClosed=Number(this.crystalWallContinuationStats.lossClosed||0)+1;
              if(String(entry?.entryConfig?.crystalWall?.policyRevision||'')===String(ATHENA_EXCLAMATION.requiredParentPolicyRevision)){
                const mwStats=this.megaWaveRuntime();mwStats.proofLossResets=Number(mwStats.proofLossResets||0)+1;
                void this.db?.audit?.('info','mega_wave_crystal_proof_sequence_reset_by_loss',{entryId:entry?.id||null,ticker:entry?.ticker||null,crashEpisodeId:entry?.entryConfig?.crystalWall?.crashEpisodeId||null,closeReason:entry?.closeReason||null,pnlCents:Number(entry?.pnlCents||0)}).catch(()=>{});
              }
            }
            this.crystalWallContinuationStats.realizedShadowPnlCents=Number(this.crystalWallContinuationStats.realizedShadowPnlCents||0)+Number(entry?.pnlCents||0);
            this.crystalWallContinuationStats.lastEvent={status:'SHADOW_CLOSED',atMs:Date.now(),entryId:entry?.id||null,ticker:entry?.ticker||null,closeReason:entry?.closeReason||null,pnlCents:Number(entry?.pnlCents||0)};
          }
        }
        this.invalidateStateSnapshot();
      },
      onEntryPipeline: (row) => this.recordEntryPipelineCandidateStage(row),
      captureSimulationMutationToken: () => this.simulationMutationGate.capture(),
      enterSimulationMutation: (token) => this.simulationMutationGate.enter(token),
    });
    await this.strategy.init({backgroundResearch:true});
    await this.hydrateMegaWaveGrants();
    // A profitable Athena close is first made durable by ProfitGuard. If the
    // process dies in the tiny window before its asynchronous strategic handoff,
    // rebuild the missing idempotent grant from the current cohort on restart.
    await this.recoverMegaWaveAthenaCloseHandoffs();
    await this.hydrateAnotherDimension();
    await this.hydrateCrystalWallShadow();
    await this.strategy.hydrateEventClockAnchors().catch(()=>({restored:0}));
    await this.hydrateCrystalWallV3();
    await this.hydrateJusticeArrowV3();
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
    this.health.degraded = !(
      this.health.restOk
      && this.health.websocketFresh
      && this.health.reconciliationOk
      && this.health.protectionOk
      && this.health.protectionFresh
      && this.health.goldenEyeOk
      && this.health.scannerFresh
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
    if (!this.entryExecutionGate().allowed) return;
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
    if (!this.entryExecutionGate().allowed || !this.atomicThunderBolt || !this.athenaCommander || !this.strategy) return [];
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
      const openEntriesOnTicker=(rows||[]).filter(e=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&String(e.ticker||'')===String(q.ticker||'')&&openLike(e.status));
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
      if(eventAdmission.eventCapBlocked){await this.db.audit('info','post_bolt_event_cap_blocked',{boltId:bolt.id,ticker:q.ticker,eventTicker:eventAdmission.eventTicker,activeEntries:eventAdmission.activeEntries,maxEntriesPerTrade:eventAdmission.maxEntriesPerTrade}).catch(()=>{});this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:'event_entry_cap'});continue;}
      const athenaExclamationEligible=Boolean(preliminaryFieldContext.athenaExclamationCandidate);
      if(eventAdmission.cooldownBlocked){await this.db.audit('info','post_bolt_cooldown_blocked',{boltId:bolt.id,ticker:q.ticker,eventTicker:eventAdmission.eventTicker,hunterCooldownMinutes:eventAdmission.hunterCooldownMinutes,cooldownScope:eventAdmission.cooldownScope,latestHunterEntryMs:eventAdmission.latestHunterEntryMs,athenaExclamationEligible}).catch(()=>{});this.recordEntryCandidateStage({candidateId:this.candidateIdForBolt(bolt),boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'POST_BOLT_BLOCKED',status:'BLOCKED',reason:'hunter_cooldown'});continue;}
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
      let plasmaReservation=null;
      if(decision.selectedAttack==='Lightning Plasma'&&String(decision.fireCommand?.authorityMode||decision.authorityMode||'')!==LIGHTNING_PLASMA.strategicEntryAuthority){
        // LP2 continuation never enters this Cosmo GREEN loop. Any ordinary
        // Athena selection of Plasma is the retired LP1 field path and must
        // fail closed instead of opening a first-entry strike.
        if(fieldContext.lightningPlasmaQualified!==true||fieldContext.currentTickerEligible!==true||!fieldId||Number(fieldExpiresAtMs)<=Date.now()){
          await this.db.audit('info','athena_fire_execution_aborted',{boltId:bolt.id,ticker:q.ticker,concept:'Lightning Plasma',reason:'lightning_plasma_field_no_longer_executable',fieldId,independentEventCount:fieldContext.independentEventCount}).catch(()=>{});
          this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_BLOCKED',status:'BLOCKED',reason:'lightning_plasma_field_no_longer_executable'});
          continue;
        }
        plasmaReservation=await this.db.reserveLightningPlasmaRay({systemName:s.systemName,fieldId,eventTicker:q.eventTicker||q.ticker,boltId:bolt.id,stakeCents:Number(decision.fireCommand?.stakeCents||rayStakeCents),fieldBudgetCents,maxRays,expiresAtMs:fieldExpiresAtMs}).catch(()=>null);
        if(!plasmaReservation?.ok){
          await this.db.audit('info','athena_fire_execution_aborted',{boltId:bolt.id,ticker:q.ticker,concept:'Lightning Plasma',reason:`lightning_plasma_${plasmaReservation?.reason||'reservation_failed'}`,fieldId,maxRays}).catch(()=>{});
          this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_BLOCKED',status:'BLOCKED',reason:`lightning_plasma_${plasmaReservation?.reason||'reservation_failed'}`});
          continue;
        }
      }
      this.recordEntryCandidateStage({candidateId,boltId:bolt.id,ticker:q.ticker,eventTicker:q.eventTicker||q.ticker,stage:'EXECUTION_ELIGIBLE',status:'PASS',reason:'fire_and_hard_preconditions_ready'});
      const e=await this.strategy.executeAthenaFire(q,bolt,decision,commandContext);
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
    // CW3/SJA3: scanner priority is the bounded union of live crash-rebound
    // watches. Neither specialist may evict the other's armed ticker during a
    // refresh/restart. Active CI1 CRASHING/REBOUND_CONFIRMED tickers are also
    // carried independently by crashPriorityTickers.
    const watches=[];
    if(this.settings.recoveryHunterEnabled===true&&this.crystalWallWatches instanceof Map)watches.push(...this.crystalWallWatches.values());
    if(this.settings.justiceArrowEnabled===true&&this.justiceArrowWatches instanceof Map)watches.push(...this.justiceArrowWatches.values());
    this.recoveryPriorityTickers = new Set(watches.filter((w)=>!w?.terminal&&String(w?.status||'')!=='EXPIRED').map((w)=>String(w?.ticker||'')).filter(Boolean));
    return this.recoveryPriorityTickers;
  }

  queueRecoveryEvaluation(ticker) {
    this.queueAthenaOpportunityEvaluation(ticker);
  }

  refreshCrashPriorityTickers() {
    if (!this.learning) {
      this.crashPriorityTickers = new Set();
      return this.crashPriorityTickers;
    }
    const summary = this.learning.crashLearningSummary?.();
    const active = (summary?.states || [])
      .filter((x) => x.phase === 'CRASHING' || x.phase === 'REBOUND_CONFIRMED')
      .map((x) => x.ticker)
      .filter(Boolean);
    this.crashPriorityTickers = new Set(active);
    return this.crashPriorityTickers;
  }

  queueCrashRecoveryEvaluation(ticker) {
    this.queueAthenaOpportunityEvaluation(ticker);
  }

  async protectionLoop() {
    while (this.running) {
      try {
        const now=Date.now();
        if (now - this.health.lastProtectionMs >= 1000) await this.runProtectionSweep('independent_1500ms');
        if (now - this.lastReferenceSweepMs >= REFERENCE_SIGNAL_SWEEP_MS) await this.runReferenceSignalSweep('reference_30s');
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

  entryExecutionGate() {
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

  async attemptLiveAutoRearm() {
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
      if (!this.running || !this.startupLiveResumeRequested || this.settings.mode !== 'LIVE' || !this.deploymentAllowsLiveTrading()) return false;
      this.settings = { ...this.settings, liveArmed:true };
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

  async setMode(mode, confirmation = '') {
    const m = String(mode).toUpperCase() === 'LIVE' ? 'LIVE' : 'SIMULATION';
    if (m === 'LIVE') {
      if (!env.allowLiveTrading) throw new Error('ALLOW_LIVE_TRADING is false');
      if (confirmation !== 'ENABLE LIVE TRADING') throw new Error('Type ENABLE LIVE TRADING to arm real trading');
      await this.testConnection();
      await this.reconcileBroker();
      await this.runProtectionSweep('live_arm_check');
      this.recomputeHealth();
      if (this.health.degraded) throw new Error('System health is not clean enough to arm LIVE');
      this.settings = { ...this.settings, mode: 'LIVE', liveArmed: true };
      this.cancelLiveAutoRearm();
    } else {
      this.settings = { ...this.settings, mode: 'SIMULATION', liveArmed: false };
      this.cancelLiveAutoRearm();
    }
    await this.db.saveSettings(this.settings);
    this.invalidateStateSnapshot();
    return this.settings;
  }

  patchSettings(patch) {
    const prior=this.settingsMutationTail||Promise.resolve();
    const run=prior.catch(()=>{}).then(()=>this.applySettingsPatch(patch));
    this.settingsMutationTail=run.catch(()=>{});
    return run;
  }

  resetOperatorSettingsToFactory() {
    return this.patchSettings(factoryOperatorSettingsPatch());
  }

  async hydrateCosmosBooks() {
    if (typeof this.db.hydrateAllCosmosEntries === 'function') {
      this.cosmosBooks = await this.db.hydrateAllCosmosEntries({ limit: 5000 });
      return this.cosmosBooks;
    }
    const books = emptyCosmosBooks();
    if (typeof this.db.entries === 'function') {
      for (const id of COSMOS_IDS) {
        const rows = await this.db.entries(id, { limit: 5000 }).catch(() => []);
        books[id] = isolateBook(rows, id);
      }
    }
    this.cosmosBooks = books;
    return books;
  }


  syncCosmosWindowsFromSettings(settings) {
    const minGameMinutes=Math.max(0,Number(settings?.minGameMinutes||0));
    const maxGameMinutes=Math.max(0,Number(settings?.maxGameMinutes||0));
    this.cosmosWindowById=Object.fromEntries(COSMOS_IDS.map((id)=>[id,{minGameMinutes,maxGameMinutes}]));
  }

  setCosmosWindow(id, settings) {
    const cosmosId=normalizeCosmosId(id);
    if(!cosmosId) return;
    this.cosmosWindowById=this.cosmosWindowById||{};
    this.cosmosWindowById[cosmosId]={
      minGameMinutes:Math.max(0,Number(settings?.minGameMinutes||0)),
      maxGameMinutes:Math.max(0,Number(settings?.maxGameMinutes||0)),
    };
  }

  async hydrateCosmosWindows() {
    if(typeof this.db.loadCosmosSettings!=='function') return this.cosmosWindowById;
    for(const id of COSMOS_IDS){
      const row=await this.db.loadCosmosSettings(id,freshInstallSettings()).catch(()=>null);
      if(row) this.setCosmosWindow(id,row);
    }
    return this.cosmosWindowById;
  }

  sharedElapsedMinutes(quote, now=Date.now()) {
    const eventTicker=String(quote?.eventTicker||quote?.ticker||'');
    if(eventTicker && typeof this.strategy?.leadingEventElapsedMinutes==='function'){
      const anchored=this.strategy.leadingEventElapsedMinutes(eventTicker, now);
      if(Number.isFinite(Number(anchored))) return Number(anchored);
    }
    const start=Number(quote?.gameClockState?.startTimeMs||quote?.gameStartTimeMs||0);
    if(Number.isFinite(start)&&start>0) return Math.max(0,(Number(now)-start)/60000);
    if(Number.isFinite(Number(quote?.gameMinutes))) return Number(quote.gameMinutes);
    return null;
  }

  watchdogDiscoveryTokens() {
    return watchdogDiscoveryTokens(this.resourcePressureState||'GREEN');
  }

  observeConstellationScan(markets=[]) {
    const tokens=this.watchdogDiscoveryTokens();
    const evaluated=tokens>0?(this.fairScan?.nextTick?.(tokens)||[]):[];
    const windows={};
    for(const id of COSMOS_IDS){
      const w=this.cosmosWindowById?.[id]||{minGameMinutes:Number(this.settings.minGameMinutes||0),maxGameMinutes:Number(this.settings.maxGameMinutes||0)};
      windows[id]={...w,inWindow:0,outWindow:0};
    }
    for(const quote of (markets||[]).slice(0,24)){
      const elapsed=this.sharedElapsedMinutes(quote);
      for(const id of evaluated){
        if(inCosmosClockWindow(elapsed, windows[id].minGameMinutes, windows[id].maxGameMinutes)) windows[id].inWindow+=1;
        else windows[id].outWindow+=1;
      }
    }
    this.constellationScan={
      lastAtMs:Date.now(),
      evaluated,
      discoverOnce:true,
      probeOwner:'host',
      fairBudget:this.fairScan?.budget||CONSTELLATION.fairScanBudget,
      ticks:this.fairScan?.ticks||0,
      pressureState:this.resourcePressureState||'GREEN',
      tokens,
      discoveryDeferred:tokens<=0,
      protectionExempt:true,
      windows,
    };
    return this.constellationScan;
  }

  isConstellationOverviewHunter(row) {
    const concept=String(row?.conceptName||'');
    if(!concept) return false;
    if(FEEDER_CONCEPTS.has(concept) || SHADOW_ATTACK_CONCEPTS.has(concept)) return false;
    if(concept===CRYSTAL_WALL.shadowConceptName || concept===CRYSTAL_WALL.conceptName || concept==='Recovery Hunter') return false;
    return PORTFOLIO_CONCEPTS.has(concept);
  }

  liveKalshiBalanceCents() {
    const raw=this.balance;
    if(!raw||typeof raw!=='object') return null;
    if(Number.isFinite(Number(raw.balance))) return Number(raw.balance);
    const breakdown=Array.isArray(raw.balance_breakdown)?raw.balance_breakdown:[];
    let sum=0,any=false;
    for(const row of breakdown){
      if(!Number.isFinite(Number(row?.balance))) continue;
      sum+=Number(row.balance)*100;
      any=true;
    }
    return any?sum:null;
  }

  portfolioValueCentsForMode(simulationPortfolioCents) {
    if(String(this.settings?.mode||'')==='LIVE'){
      const live=this.liveKalshiBalanceCents();
      return Number.isFinite(Number(live))?Number(live):null;
    }
    return Number(simulationPortfolioCents||0);
  }

  pickCosmosForRealHunter(ticker) {
    const exact=String(ticker||'');
    const unison=this.settings?.rozanHyakuRyuHaEnabled===true;
    const openLike=(status)=>['open','entry_pending','exit_pending','pending_recovery'].includes(String(status||''));
    const rowsFor=(id)=>isolateBook(this.cosmosBooks?.[id]||[],id);
    const holding=[];
    for(const id of COSMOS_IDS){
      if(rowsFor(id).some((row)=>this.isConstellationOverviewHunter(row)&&openLike(row.status)&&String(row.ticker||'')===exact)) holding.push(id);
    }
    if(holding.length && unison!==true) return holding[0];
    const candidates=COSMOS_IDS.filter((id)=>unison!==true || !holding.includes(id));
    const pool=candidates.length?candidates:COSMOS_IDS;
    let best=pool[0], bestOpen=Number.POSITIVE_INFINITY, bestIdx=0;
    for(let i=0;i<pool.length;i+=1){
      const id=pool[i];
      const open=rowsFor(id).filter((row)=>this.isConstellationOverviewHunter(row)&&openLike(row.status)).length;
      if(open<bestOpen || (open===bestOpen && i<bestIdx)){ best=id; bestOpen=open; bestIdx=i; }
    }
    return best;
  }

  rememberCosmosBookEntry(entry) {
    const id=normalizeCosmosId(entry?.systemName);
    if(!id || !this.isConstellationOverviewHunter(entry)) return false;
    this.cosmosBooks=this.cosmosBooks||emptyCosmosBooks();
    const rows=isolateBook(this.cosmosBooks[id]||[],id);
    this.cosmosBooks[id]=[...rows.filter((row)=>String(row?.id||'')!==String(entry.id||'')), entry];
    return true;
  }

  collectConstellationOverview(liveRows=[]) {
    for(const row of liveRows||[]) this.rememberCosmosBookEntry(row);
    const rooms=[];
    for(const id of COSMOS_IDS){
      const entries=isolateBook(this.cosmosBooks?.[id]||[],id).filter((row)=>this.isConstellationOverviewHunter(row));
      const open=entries.filter((row)=>['open','entry_pending','exit_pending','pending_recovery'].includes(row.status));
      const closed=entries.filter((row)=>row.status==='closed');
      const window=this.cosmosWindowById?.[id]||{minGameMinutes:Number(this.settings?.minGameMinutes||0),maxGameMinutes:Number(this.settings?.maxGameMinutes||0)};
      rooms.push({
        id, displayName:this.constellation.displayName(id),
        settingsKey:`runtime:${id}`,
        open:open.length, closed:closed.length,
        pnlCents:closed.reduce((sum,row)=>sum+Number(row.pnlCents||0),0),
        minGameMinutes:Number(window.minGameMinutes||0),
        maxGameMinutes:Number(window.maxGameMinutes||0),
      });
    }
    return rooms;
  }

  async getCosmosBook(id) {
    const cosmosId = normalizeCosmosId(id);
    if (!cosmosId) throw new Error(`unknown_cosmos:${id}`);
    if (typeof this.db.entries === 'function') {
      const rows = await this.db.entries(cosmosId, { limit: 5000 });
      this.cosmosBooks[cosmosId] = isolateBook(rows, cosmosId);
    }
    const entries = isolateBook(this.cosmosBooks[cosmosId] || [], cosmosId);
    return {
      cosmos: cosmosId,
      displayName: this.constellation.displayName(cosmosId),
      open: entries.filter((e) => ['open', 'entry_pending', 'exit_pending', 'pending_recovery'].includes(e.status)).length,
      closed: entries.filter((e) => e.status === 'closed').length,
      entries,
    };
  }

  async getCosmosSettings(id) {
    const cosmosId=normalizeCosmosId(id);
    if(!cosmosId) throw new Error(`unknown_cosmos:${id}`);
    if(typeof this.db.loadCosmosSettings!=='function') throw new Error('cosmos_settings_unavailable');
    return this.db.loadCosmosSettings(cosmosId, freshInstallSettings());
  }

  patchCosmosSettings(id, patch) {
    const cosmosId=normalizeCosmosId(id);
    if(!cosmosId) return Promise.reject(new Error(`unknown_cosmos:${id}`));
    const prior=this.settingsMutationTail||Promise.resolve();
    const run=prior.catch(()=>{}).then(()=>this.applySettingsPatch(patch,{scope:'cosmos',cosmosId}));
    this.settingsMutationTail=run.catch(()=>{});
    return run;
  }

  async patchCosmosSubset(ids, patch) {
    const selected=[...new Set((ids||[]).map((id)=>normalizeCosmosId(id)).filter(Boolean))];
    if(!selected.length) throw new Error('cosmos_subset_empty');
    const results=[];
    for(const id of selected) results.push({cosmos:id, settings:await this.applySettingsPatch(patch,{scope:'cosmos',cosmosId:id})});
    return {ok:true, count:results.length, results};
  }

  async applySettingsPatch(patch, {scope='master', cosmosId=null}={}) {
    const numeric = new Set(EDITABLE_NUMERIC_SETTINGS);
    const booleans = new Set(EDITABLE_BOOLEAN_SETTINGS);
    const allowed = new Set([...numeric, ...booleans, 'systemName', 'andromedaThunderWaveLevel']);
    const unknown = Object.keys(patch || {}).filter((k) => !allowed.has(k));
    if (unknown.length) throw new Error(`Unknown or retired setting: ${unknown.join(', ')}`);

    const roomId=scope==='cosmos'?normalizeCosmosId(cosmosId):null;
    if(scope==='cosmos'&&!roomId) throw new Error(`unknown_cosmos:${cosmosId}`);
    if(scope==='cosmos'&&typeof this.db.loadCosmosSettings!=='function') throw new Error('cosmos_settings_unavailable');
    const current=scope==='cosmos'?await this.db.loadCosmosSettings(roomId,freshInstallSettings()):this.settings;
    const next = { ...current };
    for (const k of numeric) {
      if (!Object.hasOwn(patch, k)) continue;
      const v = Number(patch[k]);
      if (!Number.isFinite(v)) throw new Error(`${k} must be numeric`);
      next[k] = v;
    }
    for (const k of booleans) {
      if (!Object.hasOwn(patch, k)) continue;
      const v = patch[k];
      next[k] = typeof v === 'boolean' ? v : /^(1|true|yes|on)$/i.test(String(v));
    }
    if (Object.hasOwn(patch, 'systemName')) {
      const v = String(patch.systemName || '').trim();
      if (!v) throw new Error('systemName cannot be empty');
      next.systemName = v;
    }
    if (Object.hasOwn(patch, 'andromedaThunderWaveLevel')) {
      const raw=String(patch.andromedaThunderWaveLevel||'').trim().toUpperCase();
      next.andromedaThunderWaveLevel = raw==='MID'||raw==='MEDIUM'?'MID':raw==='LOW'?'LOW':'HIGH';
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
    if(next.crystalWallMinCrashCents<1||next.crystalWallMinCrashCents>99||!Number.isInteger(next.crystalWallMinCrashCents))throw new Error('crystalWallMinCrashCents must be an integer from 1 to 99');
    if(next.crystalWallMinReboundCents<1||next.crystalWallMinReboundCents>99||!Number.isInteger(next.crystalWallMinReboundCents))throw new Error('crystalWallMinReboundCents must be an integer from 1 to 99');
    if(next.crystalWallMinUpwardTicks<1||next.crystalWallMinUpwardTicks>20||!Number.isInteger(next.crystalWallMinUpwardTicks))throw new Error('crystalWallMinUpwardTicks must be an integer from 1 to 20');
    if(next.crystalWallWinsToTriggerAthena<1||next.crystalWallWinsToTriggerAthena>5||!Number.isInteger(next.crystalWallWinsToTriggerAthena))throw new Error('crystalWallWinsToTriggerAthena must be an integer from 1 to 5');
    if(next.justiceArrowMinCrashCents<1||next.justiceArrowMinCrashCents>99||!Number.isInteger(next.justiceArrowMinCrashCents))throw new Error('justiceArrowMinCrashCents must be an integer from 1 to 99');
    if(next.justiceArrowMinReboundCents<1||next.justiceArrowMinReboundCents>99||!Number.isInteger(next.justiceArrowMinReboundCents))throw new Error('justiceArrowMinReboundCents must be an integer from 1 to 99');
    if(next.justiceArrowMinUpwardTicks<1||next.justiceArrowMinUpwardTicks>20||!Number.isInteger(next.justiceArrowMinUpwardTicks))throw new Error('justiceArrowMinUpwardTicks must be an integer from 1 to 20');
    if(next.atomicThunderGreenTriggerCents<1||next.atomicThunderGreenTriggerCents>99||!Number.isInteger(next.atomicThunderGreenTriggerCents))throw new Error('atomicThunderGreenTriggerCents must be an integer from 1 to 99');
    if(next.dragonMaxEpisode<1||!Number.isInteger(next.dragonMaxEpisode))throw new Error('dragonMaxEpisode must be a positive integer');
    if(next.infinityBreakMinNetPerOriginalContractCents<=0)throw new Error('infinityBreakMinNetPerOriginalContractCents must be greater than zero');
    if(next.infinityBreakRequiredConfirmations<1||!Number.isInteger(next.infinityBreakRequiredConfirmations))throw new Error('infinityBreakRequiredConfirmations must be a positive integer');
    if(next.infinityBreakMaximumBookAgeMs<100)throw new Error('infinityBreakMaximumBookAgeMs must be at least 100ms');
    if(next.infinityBreakConfirmationWindowMs<250)throw new Error('infinityBreakConfirmationWindowMs must be at least 250ms');
    if(next.auroraDamageControlPercent<1||next.auroraDamageControlPercent>95)throw new Error('auroraDamageControlPercent must be between 1 and 95 percent');
    if(next.lightningPlasmaMaxStrikes<1||!Number.isInteger(next.lightningPlasmaMaxStrikes))throw new Error('lightningPlasmaMaxStrikes must be a positive integer');

    const previousCrystalProofCount=Number(current?.crystalWallWinsToTriggerAthena??MEGA_WAVE.defaultCrystalProofsRequired??3);
    const proofCountChanged=Object.hasOwn(patch||{},'crystalWallWinsToTriggerAthena')&&previousCrystalProofCount!==Number(next.crystalWallWinsToTriggerAthena);
    const topologyKeys=['pegasusEnabled','dragonEnabled','phoenixEnabled','momentumHunterEnabled','waveSurferEnabled','recoveryHunterEnabled','crashRecoveryHunterEnabled','scarletNeedleEnabled','geminiEnabled','justiceArrowEnabled','athenaExclamationEnabled','lightningPlasmaEnabled','galacticExplosionEnabled'];
    const topologyChanged=topologyKeys.some((k)=>Object.hasOwn(patch||{},k)&&current?.[k]!==next[k]);
    const changedKeys=Object.keys(patch||{});
    try{
      if(scope==='cosmos'){
        if(typeof this.db.saveCosmosSettings!=='function')throw new Error('cosmos_settings_unavailable');
        await this.db.saveCosmosSettings(roomId,next);
        const persistedRoom=await this.db.loadCosmosSettings(roomId,freshInstallSettings());
        for(const k of changedKeys){
          const expected=next[k],actual=persistedRoom?.[k];
          const matches=typeof expected==='number'?Number(actual)===Number(expected):typeof expected==='boolean'?actual===expected:String(actual??'')===String(expected??'');
          if(!matches)throw new Error(`settings_persistence_verification_failed:${roomId}:${k}:expected=${expected}:actual=${actual}`);
        }
        this.settingsPersistence={version:'SETTINGS-PERSISTENCE-R1',lastVerifiedAtMs:Date.now(),lastKeys:[...changedKeys],lastValues:Object.fromEntries(changedKeys.map((k)=>[k,next[k]])),lastError:null,scope:'cosmos',cosmosId:roomId,broadcastCosmos:0};
        this.setCosmosWindow(roomId,next);
        this.invalidateStateSnapshot();
        return next;
      }
      await this.db.saveSettings(next);
      if(typeof this.db.loadSettings!=='function')throw new Error('settings_persistence_readback_unavailable');
      const persisted=await this.db.loadSettings(freshInstallSettings());
      for(const k of changedKeys){
        const expected=next[k],actual=persisted?.[k];
        const matches=typeof expected==='number'?Number(actual)===Number(expected):typeof expected==='boolean'?actual===expected:String(actual??'')===String(expected??'');
        if(!matches)throw new Error(`settings_persistence_verification_failed:${k}:expected=${expected}:actual=${actual}`);
      }
      if(typeof this.db.loadCosmosSettings==='function'){
        for(const id of COSMOS_IDS){
          const room=await this.db.loadCosmosSettings(id,freshInstallSettings());
          for(const k of changedKeys){
            const expected=next[k],actual=room?.[k];
            const matches=typeof expected==='number'?Number(actual)===Number(expected):typeof expected==='boolean'?actual===expected:String(actual??'')===String(expected??'');
            if(!matches)throw new Error(`settings_broadcast_verification_failed:${id}:${k}:expected=${expected}:actual=${actual}`);
          }
        }
      }
      this.settingsPersistence={version:'SETTINGS-PERSISTENCE-R1',lastVerifiedAtMs:Date.now(),lastKeys:[...changedKeys],lastValues:Object.fromEntries(changedKeys.map((k)=>[k,next[k]])),lastError:null,broadcastCosmos:typeof this.db.loadCosmosSettings==='function'?COSMOS_IDS.length:0};
    }catch(error){
      this.settingsPersistence={...(this.settingsPersistence||{version:'SETTINGS-PERSISTENCE-R1',lastVerifiedAtMs:0,lastKeys:[],lastValues:{}}),lastError:String(error?.message||error)};
      await this.db.audit?.('error','settings_persistence_verification_failed',{release:RELEASE,changedKeys,message:String(error?.message||error)}).catch(()=>{});
      throw error;
    }
    this.settings = next;
    this.syncCosmosWindowsFromSettings(next);
    if(Object.hasOwn(patch||{},'phoenixEnabled')&&next.phoenixEnabled!==true)this.phoenixCosmo?.clear?.();
    this.invalidateStateSnapshot();
    if(proofCountChanged&&typeof this.db.audit==='function')await this.db.audit('info','crystal_wall_athena_proof_count_changed',{release:RELEASE,previous:previousCrystalProofCount,next:Number(next.crystalWallWinsToTriggerAthena),appliesTo:'next_unconsumed_crystal_wall_proof_group',nonOverlapPreserved:true}).catch(()=>{});
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

  async setEngine(active) {
    this.settings = { ...this.settings, engineActive: Boolean(active) };
    await this.db.saveSettings(this.settings);
    this.invalidateStateSnapshot();
    return this.settings;
  }

  requestScan() { this.scanRequested = true; }

  async resetDashboard() {
    this.settings = { ...this.settings, resetTimestampMs: Date.now() };
    await this.db.saveSettings(this.settings);
    this.invalidateStateSnapshot();
    this.invalidateOperatorTelemetry();
    return this.settings;
  }

  async resetSimulation() {
    if (this.settings.mode !== 'SIMULATION') throw new Error('Simulation reset is only allowed in SIMULATION mode');
    if(this.simulationResetPromise)return this.simulationResetPromise;
    const run=(async()=>{
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
        this.crystalWallShadowOpenByTicker?.clear?.();
        this.crystalWallShadowRecent?.clear?.();
        this.crystalWallShadowRuntime?.clear?.();
        this.activeCosmosByTicker?.clear?.();
        this.refreshCrashPriorityTickers();
        this.settings = { ...this.settings, resetTimestampMs: null };
        await this.db.saveSettings(this.settings);
        this.invalidateStateSnapshot();
        this.invalidateOperatorTelemetry();
        await this.db.audit('info','simulation_reset_completed',{release:RELEASE,archivedEntries:n,intelligencePreserved:true,trackersCleared:false,marketHistoriesCleared:false,athenaMemoryPreserved:true,atomicThunderHistoryPreserved:true,mutationGateBefore:before,mutationGateAtArchive:this.simulationMutationGate.snapshot()}).catch(()=>{});
        return n;
      }finally{this.simulationMutationGate.release();}
    })();
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
      if(typeof this.kalshi.getBalance==='function'){
        this.balance=await this.kalshi.getBalance().catch(()=>this.balance);
      }
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
      this.health.reconciliationOk=summary.ok;
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
    const open = await this.db.openEntries(this.settings.systemName);
    const entered = new Set(open.map((e) => e.ticker));
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

  async withCosmosSettings(id, fn) {
    const cosmosId=normalizeCosmosId(id);
    if(!cosmosId) throw new Error(`unknown_cosmos:${id}`);
    const host=this.settings;
    const loaded=typeof this.db.loadCosmosSettings==='function'
      ? await this.db.loadCosmosSettings(cosmosId, host)
      : host;
    const bound={...loaded, systemName:cosmosId, ownerId:host?.ownerId, mode:host?.mode, engineActive:host?.engineActive, liveArmed:host?.liveArmed};
    this.settings=bound;
    try { return await fn(bound); }
    finally { this.settings=host; }
  }

  async evaluateScheduledCosmos(markets, trackerMap, marketMap) {
    const tokens=this.watchdogDiscoveryTokens();
    if(tokens<=0) return [];
    if(CONSTELLATION.tradingSplitEnabled!==true) return this.evaluateEntryChain(markets, trackerMap, marketMap);
    const created=[];
    const evaluated=this.constellationScan?.evaluated?.length
      ? this.constellationScan.evaluated
      : (this.fairScan?.nextTick?.(tokens)||COSMOS_IDS.slice(0,tokens));
    for(const id of evaluated){
      const window=this.cosmosWindowById?.[id]||{minGameMinutes:Number(this.settings.minGameMinutes||0),maxGameMinutes:Number(this.settings.maxGameMinutes||0)};
      const sample=Array.isArray(markets)?markets.slice(0,8):[];
      const anyInWindow=sample.length===0 || sample.some((quote)=>inCosmosClockWindow(this.sharedElapsedMinutes(quote), window.minGameMinutes, window.maxGameMinutes));
      if(!anyInWindow) continue;
      const opened=await this.withCosmosSettings(id, ()=>this.evaluateEntryChain(markets, trackerMap, marketMap));
      created.push(...(opened||[]));
    }
    return created;
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
      if(this.entryExecutionGate().allowed){
        const admitted=this.admittedInitialExposureMap(marketMap,{allowProbe:false});
        created.push(...await this.evaluateNewGenerationOpportunities(admitted));
      }
      return created;
    }finally{try{releaseSimulationWork?.();}catch{}}
  }

  async fullScan() {
    const start = Date.now();
    this.speed = { ...this.speed, mode: 'fullScan', lastLoopMs: start, checksCompleted: 0, closedThisLoop: 0, fetchFailures: 0 };
    try {
      const open = typeof this.db.openFleetHunterEntries==='function'
        ? await this.db.openFleetHunterEntries()
        : await this.db.openEntries(this.settings.systemName);
      await this.refreshRecoveryPriorityTickers();
      this.refreshCrashPriorityTickers();
      const priority = [...new Set([...open.map((x) => x.ticker), ...this.recoveryPriorityTickers, ...this.crashPriorityTickers])];
      const markets = await this.market.discover(priority);
      this.lastScanMarkets = markets;
      this.observeConstellationScan(markets);
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
      const before = (typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)).length;
      await this.runProtectionSweep('full_scan');
      const after = (typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)).length;
      this.speed.closedThisLoop = Math.max(0, before - after);
      await this.refreshRecoveryPriorityTickers();
      await this.learning.trackRecovery(this.market.quotes, this.settings);
      await this.learning.trackStopGuardRecovery?.(this.market.quotes,this.settings,this.market).catch(async(error)=>{
        await this.db.audit('warning','stop_guard_recovery_tracking',{source:'full_scan',message:String(error?.message||error)}).catch(()=>{});
      });
      for (const q of map.values()) await this.learning.observeCrashQuote(q, this.settings);
      this.refreshCrashPriorityTickers();

      const discoveryTokens = this.watchdogDiscoveryTokens();
      const newEntries = discoveryTokens>0
        ? await this.evaluateScheduledCosmos(markets, trackerMap, map)
        : [];
      if (this.constellationScan) this.constellationScan.discoveryDeferred = discoveryTokens<=0;

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
          const openEntries = await this.db.openEntries(this.settings.systemName);
          await this.refreshRecoveryPriorityTickers();
          this.refreshCrashPriorityTickers();
          const requiredTickers = new Set([...openEntries.map((e) => e.ticker), ...this.recoveryPriorityTickers, ...this.crashPriorityTickers]);
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
          for (const q of marketList) await this.learning.observeCrashQuote(q, this.settings);
          this.refreshCrashPriorityTickers();
          await this.evaluateScheduledCosmos(marketList, trackerMap, map);
          first = false;
        }
        const before = (typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)).length;
        await this.runProtectionSweep('fast_phase');
        const after = (typeof this.db.openHunterEntries==='function'?await this.db.openHunterEntries(this.settings.systemName):await this.db.openEntries(this.settings.systemName)).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)).length;
        closed += Math.max(0, before - after);
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
      systemName: this.settings.systemName,
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
    });
    this.lastSnapshotMs = Date.now();
  }

  async performance({ fullHistory=false, dashboard=false }={}) {
    const canUseOperational = !fullHistory
      && typeof this.db?.performanceAggregate === 'function'
      && typeof this.db?.openEntries === 'function'
      && typeof this.db?.recentClosedHunters === 'function'
      && typeof this.db?.conceptStatsAggregate === 'function';
    if (!canUseOperational) {
      const entries = fullHistory && typeof this.db?.tradingLogRows==='function'
        ? await this.db.tradingLogRows(this.settings.systemName,{limit:5000})
        : (fullHistory && typeof this.db.entriesAllCosmoses==='function'
          ? await this.db.entriesAllCosmoses({ limit: 5000 })
          : await this.db.entries(this.settings.systemName, { limit: 5000 }));
      const reset = this.settings.resetTimestampMs || 0;
      const active = entries.filter((e) => !e.archived);
      const hunters = active.filter((e) => PORTFOLIO_CONCEPTS.has(e.conceptName));
      const closed = hunters.filter((e) => e.status === 'closed' && (!reset || e.closedAtMs >= reset));
      const open = hunters.filter((e) => openLike(e.status));
      const wins = closed.filter((e) => e.pnlCents > 0).length;
      const losses = closed.filter((e) => e.pnlCents < 0).length;
      const scratches = closed.filter((e) => e.pnlCents === 0).length;
      const closedRealized = closed.reduce((sum, e) => sum + Number(e.pnlCents || 0), 0);
      const partialRealized = open.filter((e) => !reset || Number(e.updatedAtMs || 0) >= reset).reduce((sum, e) => sum + Number(e.pnlCents || 0), 0);
      const realized = closedRealized + partialRealized;
      const unrealized = open.reduce((sum, e) => { const v = this.quoteView(e); return sum + this.openUnrealized(e, v.priceCents); }, 0);
      const ghosts = active.filter((e) => FEEDER_CONCEPTS.has(e.conceptName));
      const ghostOpen = ghosts.filter((e) => openLike(e.status));
      const feederUnrealized = ghostOpen.reduce((sum, e) => { const v = this.quoteView(e); const count = Number(e.count || 0); return sum + (v.priceCents - e.entryPriceCents) * count - 2 * Number(this.settings.simFeeCents || 2) * count; }, 0);
      const simulationCashCents = await this.strategy.simulationAvailableCashCents(entries).catch(() => null);
      // Legacy/in-memory fallback: preserve deterministic period fields even
      // when the optimized PostgreSQL aggregate is unavailable. Production
      // uses the database's Europe/Madrid calendar boundaries below.
      return {entries,active,hunters,closed,open,wins,losses,scratches,hunterRealizedCents:realized,closedRealizedCents:closedRealized,partialRealizedCents:partialRealized,dayRealizedCents:0,weekRealizedCents:0,monthRealizedCents:0,yearRealizedCents:0,hunterUnrealizedCents:unrealized,feederRealizedCents:0,feederUnrealizedCents:feederUnrealized,winRate:closed.length?wins/closed.length:0,openHunters:open.length,closedHunters:closed.length,portfolioValueCents:this.portfolioValueCentsForMode(this.settings.startingCapitalCents+realized+unrealized),portfolioValueSource:this.settings?.mode==='LIVE'?'kalshi':'simulation',simulationCashCents,conceptAggregate:null,operationalHistory:false};
    }

    const reset = Number(this.settings.resetTimestampMs || 0);
    const jobs = [
      () => this.db.performanceAggregate(this.settings.systemName,{resetTimestampMs:reset}),
      () => dashboard && typeof this.db.dashboardOpenEntries==='function' ? this.db.dashboardOpenEntries(this.settings.systemName) : this.db.openEntries(this.settings.systemName),
      () => dashboard && typeof this.db.dashboardRecentClosedHunters==='function' ? this.db.dashboardRecentClosedHunters(this.settings.systemName,{limit:OPERATOR_PLANE_ISOLATION.maximumClosedRows,resetTimestampMs:reset}) : this.db.recentClosedHunters(this.settings.systemName,{limit:150,resetTimestampMs:reset}),
      () => this.db.conceptStatsAggregate(this.settings.systemName,{resetTimestampMs:Number(this.settings.resetTimestampMs||0)}),
    ];
    const [aggregate,openEntries,recentClosed,conceptAggregate] = await mapLimit(jobs,2,(job)=>job());
    const open = (openEntries||[]).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName));
    const ghosts = (openEntries||[]).filter((e)=>FEEDER_CONCEPTS.has(e.conceptName));
    const closed = (recentClosed||[]).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName));
    const active = [...(openEntries||[]),...closed];
    const hunters = [...open,...closed];
    const unrealized = open.reduce((sum,e)=>{const v=this.quoteView(e);return sum+this.openUnrealized(e,v.priceCents);},0);
    const feederUnrealized = ghosts.reduce((sum,e)=>{const v=this.quoteView(e),count=Number(e.count||0);return sum+(v.priceCents-e.entryPriceCents)*count-2*Number(this.settings.simFeeCents||2)*count;},0);
    let reserved=0;
    for(const e of open){
      if(e.mode!=='SIMULATION')continue;
      const originalCount=Math.max(0,Number(e.count||0)),remaining=Math.max(0,Number(e.remainingCount||originalCount));
      const storedEntryFee=Number(e.entryFeeCents||0),totalEntryFee=storedEntryFee>0?storedEntryFee:Number(this.settings.simFeeCents||0)*originalCount;
      reserved+=Number(e.entryPriceCents||0)*remaining+(originalCount>0?totalEntryFee*(remaining/originalCount):0);
    }
    const closedRealized=Number(aggregate?.closed_realized_cents||0),partialRealized=Number(aggregate?.partial_realized_cents||0),realized=closedRealized+partialRealized;
    const simulationCashCents=Number(this.settings.startingCapitalCents||0)+Number(aggregate?.simulation_ledger_pnl_cents||0)-reserved;
    const wins=Number(aggregate?.wins||0),losses=Number(aggregate?.losses||0),scratches=Number(aggregate?.scratches||0),closedHunters=Number(aggregate?.closed_hunters||0),openHunters=Number(aggregate?.open_hunters||open.length);
    return {entries:active,active,hunters,closed,open,wins,losses,scratches,hunterRealizedCents:realized,closedRealizedCents:closedRealized,partialRealizedCents:partialRealized,dayRealizedCents:Number(aggregate?.day_realized_cents||0),weekRealizedCents:Number(aggregate?.week_realized_cents||0),monthRealizedCents:Number(aggregate?.month_realized_cents||0),yearRealizedCents:Number(aggregate?.year_realized_cents||0),hunterUnrealizedCents:unrealized,feederRealizedCents:0,feederUnrealizedCents:feederUnrealized,winRate:closedHunters?wins/closedHunters:0,openHunters,closedHunters,portfolioValueCents:this.portfolioValueCentsForMode(this.settings.startingCapitalCents+realized+unrealized),portfolioValueSource:this.settings?.mode==='LIVE'?'kalshi':'simulation',simulationCashCents,conceptAggregate,operationalHistory:true};
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
      version:RUNTIME_RESOURCE_GOVERNOR.version,status,sampledAtMs:Date.now(),
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
      shadowAttack:{universe:'Gemini + Crystal Wall',activeCosmosTickers:Number(this.activeCosmosByTicker?.size||0),sourcePeaks:Number(this.anotherDimensionSourcePeaks?.size||0),anotherDimensionOpen:Number(this.anotherDimensionOpenByTicker?.size||0),anotherDimensionRecent:Number(this.anotherDimensionRecent?.size||0),anotherDimensionRuntime:Number(this.anotherDimensionRuntime?.size||0),crystalWallOpen:Number(this.crystalWallShadowOpenByTicker?.size||0),crystalWallRecent:Number(this.crystalWallShadowRecent?.size||0),crystalWallRuntime:Number(this.crystalWallShadowRuntime?.size||0),crystalWallConsumedEpisodes:Number(this.crystalWallConsumedEpisodeIds?.size||0),openAttemptBookDedup:Number(this.geminiOpenAttemptBookMs?.size||0),maximumRecent:Math.max(ANOTHER_DIMENSION.maximumRecentResults,CRYSTAL_WALL.maximumRecentResults)},
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
      id:x.id||null,systemName:x.systemName||null,ticker:x.ticker||null,eventTicker:x.eventTicker||null,marketTitle:x.marketTitle||'',conceptName:x.conceptName||'',executionAttackName:x.executionAttackName||x.conceptName||'',sourceFeeder:x.sourceFeeder||null,sourceTradeId:x.sourceTradeId||null,mode:x.mode||null,status:x.status||null,
      entryPriceCents:x.entryPriceCents??null,exitPriceCents:x.exitPriceCents??null,currentPriceCents:x.currentPriceCents??null,currentBidCents:x.currentBidCents??null,currentAskCents:x.currentAskCents??null,peakPriceCents:x.peakPriceCents??null,stopPriceCents:x.stopPriceCents??null,count:x.count??0,remainingCount:x.remainingCount??0,pnlCents:x.pnlCents??0,positionPnlCents:x.positionPnlCents??0,
      lowestPriceAfterEntryCents:x.lowestPriceAfterEntryCents??null,maeCents:x.maeCents??null,maeAfterEntryMs:x.maeAfterEntryMs??null,recoveryToEntryMs:x.recoveryToEntryMs??null,recoveryToGreenMs:x.recoveryToGreenMs??null,closeReason:x.closeReason||null,openedAtMs:x.openedAtMs??null,closedAtMs:x.closedAtMs??null,updatedAtMs:x.updatedAtMs??null,dataState:x.dataState||null,quoteAgeMs:x.quoteAgeMs??null,gameMinutes:x.gameMinutes??null,liveStatus:x.liveStatus||null,
      aurora:a?{version:a.version||null,frozen:a.frozen===true,damageControlPercent:a.damageControlPercent??null,maximumEconomicLossRatio:a.maximumEconomicLossRatio??null,dangerPriceCents:a.dangerPriceCents??a.dangerLineCents??null,dangerLineCents:a.dangerLineCents??a.dangerPriceCents??null}:null,
      entryConfig:{profitAuthority,infinityBreak:x.entryConfig?.infinityBreak?{version:x.entryConfig.infinityBreak.version||null,minimumNetPerOriginalContractCents:x.entryConfig.infinityBreak.minimumNetPerOriginalContractCents??null}:null,virtualInfinity:x.entryConfig?.virtualInfinity?{version:x.entryConfig.virtualInfinity.version||null,minimumNetPerOriginalContractCents:x.entryConfig.virtualInfinity.minimumNetPerOriginalContractCents??null,requiredFreshConfirmations:x.entryConfig.virtualInfinity.requiredFreshConfirmations??null}:null},
      postExitCurrentPriceCents:x.postExitCurrentPriceCents??null,postExitDeltaFromExitCents:x.postExitDeltaFromExitCents??null,postExitBestPriceCents:x.postExitBestPriceCents??null,postExitBestDeltaCents:x.postExitBestDeltaCents??null,postExitMissedUpsideCents:x.postExitMissedUpsideCents??null,postExitWorstPriceCents:x.postExitWorstPriceCents??null,postExitWorstDeltaCents:x.postExitWorstDeltaCents??null,postExitLossAvoidedCents:x.postExitLossAvoidedCents??null,postExitResearchComplete:x.postExitResearchComplete===true,
      shadowPnlCents:x.shadowPnlCents??null,shadowMoveCents:x.shadowMoveCents??null,shadowState:x.shadowState||null,greenTriggerCents:x.greenTriggerCents??null,atomicThunderBoltId:x.atomicThunderBoltId||null,athenaSelectedAttack:x.athenaSelectedAttack||null,realEntryId:x.realEntryId||null,referencePnlCents:x.referencePnlCents??null,signalPriceCents:x.signalPriceCents??null,referenceOriginCents:x.referenceOriginCents??null,
      virtualExecution:v?{fullPositionExecutable:v.fullPositionExecutable===true,executableAverageBidCents:v.executableAverageBidCents??null,executableCount:v.executableCount??null,requiredCount:v.requiredCount??null,confirmations:v.confirmations??null,requiredConfirmations:v.requiredConfirmations??null,targetNetPerOriginalContractCents:v.targetNetPerOriginalContractCents??null,holdReason:v.holdReason||null,action:v.action||null}:null,
    };
  }

  invalidateStateSnapshot() { this.stateSnapshotAtMs=0; }

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
    // Mega Wave: Crystal Wall is the shadow proof engine. Athena Exclamation is
    // the first real exposure after the configured 1..5 proof count is certified. All other Saints
    // are downstream-only and retain their own qualification doctrine.
    const initialExposureEnabled = [
      this.settings.athenaExclamationEnabled === true ? 'Athena Exclamation' : null,
    ].filter(Boolean);
    const enabledMegaWaveSaints = [
      this.settings.scarletNeedleEnabled===true?'Scarlet Needle':null,
      this.settings.justiceArrowEnabled===true?'Sagittarius Justice Arrow':null,
      this.settings.momentumHunterEnabled===true?'Momentum Hunter':null,
      this.settings.waveSurferEnabled===true?'Wave Surfer':null,
      this.settings.crashRecoveryHunterEnabled===true?'Crash Recovery Hunter':null,
      this.settings.lightningPlasmaEnabled===true?'Lightning Plasma':null,
    ].filter(Boolean);
    const executionGate = this.entryExecutionGate();
    const referenceGate = this.referenceSignalGate();
    const entryPathWarnings = [];
    const followUpLimit=Math.max(0,Math.min(MEGA_WAVE.maximumFollowUpAttacks,Math.floor(Number(this.settings.athenaExclamationFollowUpAttacks)||0)));
    const crystalProofCount=Math.max(MEGA_WAVE.minimumCrystalProofsRequired||1,Math.min(MEGA_WAVE.maximumCrystalProofsRequired||5,Math.floor(Number(this.settings.crystalWallWinsToTriggerAthena)||MEGA_WAVE.defaultCrystalProofsRequired||3)));
    if (this.settings.athenaExclamationEnabled===true && this.settings.recoveryHunterEnabled!==true) entryPathWarnings.push('Athena Exclamation is enabled but Crystal Wall proof generation is disabled');
    if (this.settings.athenaExclamationEnabled===true && followUpLimit===0 && enabledMegaWaveSaints.length>0) entryPathWarnings.push('Athena follow-up count is 0; downstream Saints cannot be released by a profitable Athena close');
    if (followUpLimit>0 && enabledMegaWaveSaints.length===0) entryPathWarnings.push('Athena follow-up count is positive but no downstream Saints are enabled');
    if (this.settings.galacticExplosionEnabled!==true && followUpLimit>1) entryPathWarnings.push('Galactic Explosion is OFF; exact-ticker topology may limit simultaneous downstream Saints');
    if (!initialExposureEnabled.length) entryPathWarnings.push('Athena Exclamation is disabled; the configured Crystal Wall proof chain cannot create the first real Mega Wave exposure');
    if (referenceGate.allowed && !executionGate.allowed) entryPathWarnings.push(`Real Hunter execution blocked by ${executionGate.reason}; reference feeders remain active`);
    const entryPathConfiguration = {
      version:'MEGA-WAVE-EPC1',
      megaWaveVersion:MEGA_WAVE.version,
      megaWavePolicyRevision:MEGA_WAVE.policyRevision,
      authorityChain:`CI1_CRASH->${crystalProofCount}_CONSECUTIVE_INDEPENDENT_CRYSTAL_WALL_PROFITS->ATHENA_EXCLAMATION_REAL->ATHENA_PROFIT->0_12_SAINT_RELEASE->SAINT_OWN_DOCTRINE->ENTRY_FROZEN_INFINITY_OR_PRI1_R2/AURORA`,
      crystalWallWinsToTriggerAthena:crystalProofCount,
      noBoltNoAttack:true,
      noBoltNoAttackExceptions:[MEGA_WAVE.entryAuthority,MEGA_WAVE.downstreamAuthority,'CRYSTAL_WALL_V3_SHADOW_AUTHORITY'],
      cosmoGreenRequired:false,
      initialExposureEnabled,
      enabledMegaWaveSaints,
      athenaFollowUpAttacks:followUpLimit,
      allocationDoctrine:MEGA_WAVE.allocationDoctrine,
      galacticExplosionEnabled:this.settings.galacticExplosionEnabled===true,
      scarletNeedleContinuationEnabled:false,
      scarletNeedleMegaWaveDownstreamEnabled:this.settings.scarletNeedleEnabled===true,
      geminiEnabled:this.settings.geminiEnabled===true,
      anotherDimensionAttackEnabled:this.settings.geminiEnabled===true,
      justiceArrowIndependentEnabled:false,
      justiceArrowContinuationEnabled:false,
      justiceArrowMegaWaveDownstreamEnabled:this.settings.justiceArrowEnabled===true,
      crystalWallIndependentEnabled:this.settings.recoveryHunterEnabled===true,
      crystalWallShadowOnly:true,
      crystalWallContinuationEnabled:false,
      lightningPlasmaContinuationEnabled:false,
      lightningPlasmaMegaWaveDownstreamEnabled:this.settings.lightningPlasmaEnabled===true,
      recoveryFollowOnEnabled:false,
      warnings:entryPathWarnings,
      entryModeIsolation:'EMI1', referenceSignalEvaluationActive:referenceGate.allowed,
      realHunterExecutionAuthorized:executionGate.allowed, executionGateReason:executionGate.reason,
    };
    const conceptStats = p.conceptAggregate ? this.buildConceptStatsFromAggregate(p.conceptAggregate) : this.buildConceptStats(entries);
    const auroraExecution = this.buildAuroraSummary(entries);
    const infinityBreak = this.buildInfinityBreakSummary(entries);
    const atomicThunderBolt={...this.atomicThunderBolt?.summary?.(),episodes:opportunitySummary};
    const openHunters = p.open.map((e) => this.compactDashboardEntry(e));
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
    const crystalWallTrades=[...this.crystalWallShadowRecent.values()]
      .filter((e)=>!e.archived)
      .sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0))
      .slice(0,CRYSTAL_WALL.maximumRecentResults)
      .map((e)=>this.compactDashboardEntry(e));
    const crystalWallClosed=crystalWallTrades.filter((e)=>e.status==='closed');
    const crystalWallShadowSummary={
      version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,name:'Crystal Wall',enabled:this.settings.recoveryHunterEnabled===true,
      brokerOrderAuthority:false,portfolioCapitalAuthority:false,simulationPortfolioCapitalAuthority:false,
      virtualStakeCents:Number(this.settings.recoveryStakeCents||0),minEntryCents:Number(this.settings.recoveryMinEntryCents||0),maxEntryCents:Number(this.settings.recoveryMaxEntryCents||0),winsToTriggerAthena:Math.max(MEGA_WAVE.minimumCrystalProofsRequired||1,Math.min(MEGA_WAVE.maximumCrystalProofsRequired||5,Math.floor(Number(this.settings.crystalWallWinsToTriggerAthena)||MEGA_WAVE.defaultCrystalProofsRequired||3))),
      total:crystalWallTrades.length,open:crystalWallTrades.filter((e)=>openLike(e.status)).length,closed:crystalWallClosed.length,
      wins:crystalWallClosed.filter((e)=>Number(e.pnlCents||0)>0).length,losses:crystalWallClosed.filter((e)=>Number(e.pnlCents||0)<0).length,pnlCents:crystalWallClosed.reduce((sum,e)=>sum+Number(e.pnlCents||0),0),
    };
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
    const closedHunters = p.closed.map((e) => this.compactDashboardEntry(e));
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
    const state={
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
        justiceArrowIndependentAuthority:false,
        justiceArrowPostScarletContinuationAuthority:true,
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
        justiceArrowOneEntryPerParentScarlet:true,
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
        scarletNeedleMegaWaveDownstreamAuthority:this.settings.scarletNeedleEnabled===true,
        scarletNeedleTrigger:SCARLET_NEEDLE.trigger,
        scarletNeedleMaxRepeats:Number(this.settings.scarletNeedleMaxRepeats??SCARLET_NEEDLE.defaultMaxRepeats),
        scarletNeedleRetracementTriggerEnabled:false,
        scarletNeedleContinuation:{...(this.scarletContinuationStats||{})},
        noBoltNoAttackExceptions:[MEGA_WAVE.entryAuthority,MEGA_WAVE.downstreamAuthority,'CRYSTAL_WALL_V3_SHADOW_AUTHORITY'],
        megaWave:MEGA_WAVE.version,
        megaWavePolicyRevision:MEGA_WAVE.policyRevision,
        megaWaveAthenaFollowUpAttacks:Math.max(0,Math.min(MEGA_WAVE.maximumFollowUpAttacks,Math.floor(Number(this.settings.athenaExclamationFollowUpAttacks)||0))),
        megaWaveCrystalWallWinsToTriggerAthena:Math.max(MEGA_WAVE.minimumCrystalProofsRequired||1,Math.min(MEGA_WAVE.maximumCrystalProofsRequired||5,Math.floor(Number(this.settings.crystalWallWinsToTriggerAthena)||MEGA_WAVE.defaultCrystalProofsRequired||3))),
        megaWaveAllocationDoctrine:MEGA_WAVE.allocationDoctrine,
        crystalWall:CRYSTAL_WALL.version,
        crystalWallPolicyRevision:CRYSTAL_WALL.policyRevision,
        crystalWallIndependentAuthority:true,
        crystalWallShadowOnly:true,
        crystalWallBrokerOrderAuthority:false,
        crystalWallPortfolioCapitalAuthority:false,
        crystalWallSimulationPortfolioCapitalAuthority:false,
        crystalWallAthenaAuthority:false,
        crystalWallTrigger:CRYSTAL_WALL.trigger,
        crystalWallTriggerSources:[...CRYSTAL_WALL.triggerSources],
        crystalWallMinimumCrashCents:Number(this.settings.crystalWallMinCrashCents),
        crystalWallMinimumReboundCents:Number(this.settings.crystalWallMinReboundCents),
        crystalWallMinimumUpwardTicks:Number(this.settings.crystalWallMinUpwardTicks),
        crystalWallWinsToTriggerAthena:Math.max(MEGA_WAVE.minimumCrystalProofsRequired||1,Math.min(MEGA_WAVE.maximumCrystalProofsRequired||5,Math.floor(Number(this.settings.crystalWallWinsToTriggerAthena)||MEGA_WAVE.defaultCrystalProofsRequired||3))),
        crystalWallFixedStakeCents:Number(this.settings.recoveryStakeCents),
        crystalWallStakeMultiplierAllowed:false,
        crystalWallGameClockExempt:true,
        crystalWallEventCapOverlayExempt:true,
        crystalWallFullConfiguredSizeRequired:true,
        crystalWallOneEntryPerCrashEpisode:true,
        crystalWallRuntime:{...(this.crystalWallContinuationStats||{}),activeWatches:this.crystalWallWatches?.size||0,activeShadowTrades:this.crystalWallShadowOpenByTicker?.size||0,recentShadowTrades:this.crystalWallShadowRecent?.size||0,consumedCrashEpisodes:this.crystalWallConsumedEpisodeIds?.size||0,queue:this.crystalWallContinuationQueue?.snapshot?.()||null,shadowQueue:this.crystalWallShadowQueue?.snapshot?.()||null},
        lightningPlasmaContinuationAuthority:false,
        lightningPlasmaMegaWaveDownstreamAuthority:this.settings.lightningPlasmaEnabled===true,
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
        athenaExclamationRole:'MEGA_WAVE_SUPREME_FIRST_REAL_ATTACK_AFTER_TRIPLE_CRYSTAL',
        athenaExclamationStrategicAuthority:MEGA_WAVE.entryAuthority,
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
        athenaConsumers: ['Athena Exclamation'],
        megaWaveDownstreamSaints:[...MEGA_WAVE.downstreamSaints],
        athenaFeedersExcluded: true,
        athenaExitAuthority: false,
        athenaB1ExitAuthority: false,
        athenaExitIntelligence: ATHENA_EXIT_INTELLIGENCE.version,
        athenaExitPolicyRevision: ATHENA_EXIT_INTELLIGENCE.policyRevision,
        athenaExitRole: ATHENA_EXIT_INTELLIGENCE.role,
        athenaExitAppliesTo: 'legacy_creation_time_ATHENA_X1_entries_only; Mega Wave entries freeze Infinity Break or PRI1-R2',
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
        goldenEyeLegacyAthenaX1Compatibility: 'historical_creation_time_ATHENA_X1_preserved_only',
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
      performance: {
        portfolioValueCents: p.portfolioValueCents,
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
      conceptStats, feederSummary, entryPipeline, entryCandidateFunnel, entryPathConfiguration, auroraExecution, resourceUsage, openHunters, openFeeders, cosmoShadowTrades, gemini:geminiSummary, geminiTrades, anotherDimension:{...(this.anotherDimensionStats||{}),active:Number(this.anotherDimensionOpenByTicker?.size||0),recent:Number(this.anotherDimensionRecent?.size||0)}, crystalWallShadow:crystalWallShadowSummary, crystalWallTrades, eventClockAnchor:{version:'ECA1',policyRevision:'ECA1-R1-CRYSTAL-WALL-LEADING-EVENT-CLOCK',anchored:Number(this.strategy?.eventClockByEvent?.size||0),events:[...((this.strategy?.eventClockByEvent?.values&&this.strategy.eventClockByEvent.values())||[])].slice(0,40).map((row)=>{const elapsed=this.strategy.leadingEventElapsedMinutes(row.eventTicker,Date.now());return{eventTicker:row.eventTicker,ticker:row.ticker,crystalWallEntryId:row.crystalWallEntryId,anchoredElapsedMinutes:row.anchoredElapsedMinutes,projectedElapsedMinutes:elapsed,source:row.source,phase:row.phase};})}, constellation:this.constellation?.snapshot?.(this.settings)||{version:CONSTELLATION.version,phase:CONSTELLATION.phase,tradingSplitEnabled:false}, constellationOverview:this.collectConstellationOverview?.([...(p.open||[]),...(p.closed||[])])||[], constellationScan:this.constellationScan||{discoverOnce:true,probeOwner:'host'}, justiceArrow:{...(this.justiceArrowStats||{})}, closedHunters,
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
    const unrealized = openLike(e.status) && PORTFOLIO_CONCEPTS.has(e.conceptName)
      ? this.openUnrealized(e, view.priceCents)
      : 0;
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
    const shadowAttackName=String(e.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName)?'CRYSTAL_WALL':'ANOTHER_DIMENSION';
    const shadowState = isFeeder ? (atomicThunderBoltId?'BOLT_SENT':shadowMoveCents>=greenTriggerCents?'GREEN':'TRACKING') : isShadowAttack ? (openLike(e.status)?shadowAttackName:Number(e.pnlCents||0)>0?'WIN':Number(e.pnlCents||0)<0?'LOSS':'SCRATCH') : null;
    const sourceSignalPrice = e.conceptName === 'Dragon' ? e.entryConfig?.dragonSource?.signalPriceCents : (e.conceptName === 'Phoenix' ? e.entryConfig?.phoenixSource?.signalAskCents : (e.conceptName === 'Golden Dragon' ? e.entryConfig?.goldenDragonSource?.signalPriceCents : null));
    const signalPriceCents = Number.isFinite(Number(sourceSignalPrice)) ? Number(sourceSignalPrice) : null;
    const referenceOriginCents = isShadow ? Number(e.entryPriceCents) : null;
    const referenceOrigin = e.conceptName==='Dragon'?'dragon_signal':(e.conceptName==='Phoenix'?'phoenix_signal':(isShadowAttack?(String(e.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName)?'crystal_wall_shadow':'another_dimension'):(isFeeder?'feeder_entry':null)));
    const identity=EXECUTION_ATTACK_DISPLAY[e.conceptName]||null;
    const aurora=e?.entryConfig?.aurora?.version===AURORA_EXECUTION.version&&e.entryConfig.aurora.frozen===true?e.entryConfig.aurora:null;
    const postExit=e?.postExitState&&typeof e.postExitState==='object'?e.postExitState:{};
    const closedPostPrice=e?.status==='closed'&&Number.isFinite(Number(postExit.latestMarketPriceCents))?Number(postExit.latestMarketPriceCents):null;
    const shadowRuntime=isShadowAttack?(String(e.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName)?this.crystalWallShadowRuntime?.get?.(String(e.id||'')):this.anotherDimensionRuntime?.get?.(String(e.id||''))):null;
    const shadowEvaluation=shadowRuntime?.lastEvaluation||null;
    const shadowPeak=isShadowAttack&&openLike(e.status)?Math.max(Number(e.peakPriceCents||e.entryPriceCents||0),Number(shadowRuntime?.peakPriceCents||0)):Number(e.peakPriceCents||0);
    const shadowLow=isShadowAttack&&openLike(e.status)&&Number(shadowRuntime?.lowestPriceAfterEntryCents)>0?Number(shadowRuntime.lowestPriceAfterEntryCents):e.lowestPriceAfterEntryCents;
    const shadowMae=isShadowAttack&&openLike(e.status)?Number(shadowRuntime?.maeCents??e.maeCents??0):Number(e.maeCents||0);
    const shadowMaeAt=isShadowAttack&&openLike(e.status)?(shadowRuntime?.maeAtMs??e.maeAtMs):e.maeAtMs;
    return {
      ...e,
      ...(isShadowAttack?{peakPriceCents:shadowPeak,lowestPriceAfterEntryCents:shadowLow,maeCents:shadowMae,maeAtMs:shadowMaeAt}:{}),
      currentPriceCents: e?.status==='closed'&&closedPostPrice!=null?closedPostPrice:view.priceCents,
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
      positionPnlCents: Number(e.pnlCents || 0) + unrealized,
      referencePnlCents, shadowPnlCents, shadowMoveCents, shadowState, greenTriggerCents, atomicThunderBoltId, athenaSelectedAttack:e.feederState?.athenaSelectedAttack||null, realEntryId:e.feederState?.realEntryId||null, favorableMoveCents, adverseMoveCents, signalPriceCents, referenceOriginCents, referenceOrigin,
      universe:isShadowAttack?(String(e.conceptName||'')===String(CRYSTAL_WALL.shadowConceptName)?'Crystal Wall Shadow':'Gemini'):null,virtualExecution:isShadowAttack?shadowEvaluation:null,justiceArrowEntryId:String(e.conceptName||'')==='Another Dimension'?(e.feederState?.justiceArrowEntryId||null):null,
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
    const diagnosticOpenHunters=(fullOpenEntries||[]).filter((e)=>PORTFOLIO_CONCEPTS.has(e.conceptName)).map((e)=>this.decorateEntry(e));
    const boundedBase={...base,trackedMarkets,patterns,sports,snapshots,audit,crashEpisodes,athena:this.athena?.summary?.()||base.athena,crashLearning:this.learning?.crashLearningSummary?.()||base.crashLearning,entryPipeline:this.strategy?.entryPipelineSummary?.()||base.entryPipeline,entryCandidateFunnel:this.entryCandidateFunnelSummary(),openHunters:diagnosticOpenHunters,closedHunters:Array.isArray(base.closedHunters)?base.closedHunters.slice(0,150):[]};
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
      'Scope: combined twelve-cosmos book',
      `Generated: ${new Date().toISOString()}`,
      `Release: ${RELEASE}`,
      'Format: TLX1 compact analysis log | Server hard cap: 2000000 UTF-8 bytes',
      `Loaded records: ${active.length} | Hunter trades: ${p.hunters.length} | Open Hunters: ${p.open.length} | Closed Hunters: ${p.closed.length}`,
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
    if(this.resourceGovernorTimer)clearInterval(this.resourceGovernorTimer);
    this.resourceGovernorTimer=null;
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
    this.market?.stop();
    const goldenEyePending=[this.goldenEyeEvaluationPromise,this.goldenEyeExecutionPromise].filter(Boolean);
    if(goldenEyePending.length)await Promise.race([Promise.allSettled(goldenEyePending),sleep(2000)]).catch(()=>{});
    await this.goldenEye?.persist?.(true).catch(()=>{});
    // PLI1 is deliberately off the protection critical path. On orderly
    // shutdown, give already-queued observations a bounded chance to persist
    // before closing PostgreSQL; shutdown can never wait indefinitely on
    // learning I/O.
    await this.profitGuard?.flushProfitLearningQueues?.(2000).catch(()=>false);
    await this.profitGuard?.flushPostExitPersistence?.(2000).catch(()=>false);
    await this.feederSignalIntel?.flush?.(2000).catch(()=>false);
    await this.learning?.flushCrashPersistence?.(2000).catch(()=>false);
    await this.atomicThunderBolt?.flushCounterfactualCompletions?.(2000).catch(()=>false);
    await this.db.close();
  }
}
