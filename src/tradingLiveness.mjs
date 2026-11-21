// R15 observability only. No timer, SQL, broker call, order retry or entry gate.
// Fixed-size samples and events remain local to one process/clone/scope.
import {createHash} from 'node:crypto';
export const TRADING_LIVENESS_VERSION='R15-TRADING-LIVENESS-1';
export const LIVENESS_LIMITS=Object.freeze({samples:240,sampleBytes:768000,events:256,attempts:128,receipts:256,sampleEveryMs:15000,staleWorkMs:60000});
const clean=(v,n=160)=>v==null?null:String(v).slice(0,n);
const num=v=>v!=null&&Number.isFinite(Number(v))?Number(v):null;
const elapsed=(now,at)=>at>0?Math.max(0,now-at):null;
const scope=s=>JSON.stringify([s?.systemName||'',s?.ownerId||'',s?.mode||'',Number(s?.resetTimestampMs||0)]);
const identity=v=>createHash('sha256').update(String(v)).digest('hex');

export class BoundedDiagnosticReporter {
  constructor(){this.active=null;this.pending=null;this.activeAtMs=0;this.started=0;this.completed=0;this.failed=0;this.coalesced=0;}
  submit(task){
    if(typeof task!=='function')return false;
    if(this.active){this.pending=task;this.coalesced++;return false;}
    this.started++;this.activeAtMs=Date.now();
    this.active=Promise.resolve().then(task).catch(()=>{this.failed++;}).finally(()=>{
      this.active=null;this.activeAtMs=0;this.completed++;const next=this.pending;this.pending=null;if(next)this.submit(next);
    });return true;
  }
  snapshot(){return{active:!!this.active,pending:!!this.pending,oldestActiveMs:elapsed(Date.now(),this.activeAtMs),owner:'optional_runtime_diagnostic',started:this.started,completed:this.completed,failed:this.failed,coalesced:this.coalesced};}
}

export function classifyTradingLiveness({workers=[],queues=[],health={},lastEvent=null,activity={},now=Date.now()}={}){
  const impairedWorkers=workers.filter(w=>w.required!==false&&(w.stalled===true||Number(w.consecutiveFailures)>=3));
  const impairedQueues=queues.filter(q=>Number(q.oldestActiveMs)>LIVENESS_LIMITS.staleWorkMs
    ||(Number(q.pending)>0&&Number(q.oldestPendingMs)>LIVENESS_LIMITS.staleWorkMs));
  // This is the exact original R14 witness: a rejected task was retained only
  // by its diagnostic callback. An old/quiet market or time since last fill
  // cannot establish this state. Current queues free settled tasks immediately.
  const proved=impairedQueues.find(q=>q.retainedSettledTaskForDiagnostic===true&&q.qualifiedCandidateId);
  if(proved)return{state:'REPRODUCED_EXECUTION_STALL',reason:'settled_evaluator_retained_by_diagnostic',
    defectId:'R15-D-AUDIT-WAIT',candidateId:clean(proved.qualifiedCandidateId)};
  if(impairedWorkers.length||impairedQueues.length||health.scannerFresh===false||health.websocketFresh===false)
    return{state:'LIVENESS_DEGRADED',reason:impairedWorkers.length?'worker_progress_stale':impairedQueues.length?'queue_progress_stale':'market_or_scanner_evidence_stale',
      workers:impairedWorkers.map(x=>clean(x.name,64)),queues:impairedQueues.map(x=>clean(x.name,64))};
  // Losing a bounded diagnostic record is a loss of historical COVERAGE, not
  // evidence that a required trading worker or broker operation is stalled.
  // Retain the eviction count in coverage; use live worker/queue/health evidence
  // (above) and the age of retained in-progress candidates (below) for liveness.
  if(Number(activity.oldestInProgressAtMs)>0&&now-Number(activity.oldestInProgressAtMs)>LIVENESS_LIMITS.staleWorkMs)
    return{state:'LIVENESS_DEGRADED',reason:'observed_candidate_progress_stale'};
  const safetyReasons=health.operational?.reasons||[];
  if(safetyReasons.some(r=>r==='independent_watchdog_not_healthy'||r==='global_queue_backpressure'||r==='queue_backpressure'))
    return{state:'LIVENESS_DEGRADED',reason:clean(safetyReasons.find(r=>r==='independent_watchdog_not_healthy'||r==='global_queue_backpressure'||r==='queue_backpressure'))};
  if(health.degraded===true||health.protectionOk===false||health.protectionFresh===false||safetyReasons.length)
    return{state:'SAFETY_BLOCKED',reason:clean(safetyReasons[0]||'required_health_evidence_unavailable')};
  if(lastEvent?.status==='BLOCKED'&&now-Number(lastEvent.atMs||0)<=60000)
    return{state:'SAFETY_BLOCKED',reason:clean(lastEvent.reason||lastEvent.stage),basis:'latest_observed_candidate_denial'};
  if(Number(activity.inProgress)>0)return{state:'HEALTHY_PROCESSING',reason:'observed_evaluation_in_progress'};
  const scanned=workers.some(w=>w.name==='scanner'&&Number(w.lastSuccessMs)>0&&!w.stalled);
  if(!scanned&&!Number(activity.evaluated))return{state:'LIVENESS_DEGRADED',reason:'insufficient_evaluation_evidence'};
  return{state:'HEALTHY_IDLE',reason:'no_qualified_candidate_pending_in_observed_evaluations',
    qualification:'Local bounded observation only; absence of a historical opportunity is not proven.'};
}

export class TradingLiveness {
  constructor(){this.scope=null;this.samples=[];this.sampleSizes=[];this.sampleBytes=0;this.events=[];this.lastSampleAtMs=0;this.observationStartedAtMs=Date.now();this.last=null;this.resetCounts();}
  resetCounts(){this.counts={candidateEvaluations:0,strategyQualifiedEvaluations:0,brokerDispatches:0,confirmedEntryReceiptObservations:0,refusals:0};this.times={candidate:0,qualified:0,dispatch:0,fill:0};this.attempts=new Map();this.receipts=new Set();this.attemptEvictions=0;this.unresolvedAttemptEvictions=0;this.receiptEvictions=0;}
  useScope(settings){const key=scope(settings);if(key===this.scope)return;this.scope=key;this.samples=[];this.sampleSizes=[];this.sampleBytes=0;this.events=[];this.lastSampleAtMs=0;this.last=null;this.observationStartedAtMs=Date.now();this.resetCounts();}
  event(row={},settings={}){
    this.useScope(settings);
    const e={atMs:num(row.atMs)||Date.now(),attemptId:clean(row.attemptId),candidateId:clean(row.candidateId),
      concept:clean(row.concept,80),ticker:clean(row.ticker),stage:clean(row.stage,64),status:clean(row.status,32),reason:clean(row.reason),
      marketEventId:clean(row.decisionContext?.marketEventId),settingsHash:clean(row.decisionContext?.settingsHash,128),
      mode:clean(settings.mode,16),parentEntryId:clean(row.parentEntryId||row.starlightRecoveryParentEntryId||row.parentStarlightId),
      quoteAtMs:num(row.decisionContext?.quoteAtMs),quoteRevision:num(row.decisionContext?.quoteRevision)};
    if(e.attemptId){
      const key=identity(row.attemptId);e.attemptKey=key;
      let a=this.attempts.get(key);if(!a){a={firstDenial:null};this.attempts.set(key,a);}
      if(e.status==='BLOCKED'&&!a.firstDenial)a.firstDenial={stage:e.stage,reason:e.reason,atMs:e.atMs};
      a.stage=e.stage;a.atMs=e.atMs;a.terminal=e.status==='BLOCKED'||e.stage==='OPENED'||e.stage==='CONFIRMED_FILL';
      e.firstDenial=a.firstDenial;
      while(this.attempts.size>LIVENESS_LIMITS.attempts){
        const terminal=[...this.attempts].find(([,v])=>v.terminal);
        const remove=terminal?.[0]||this.attempts.keys().next().value;
        if(!this.attempts.get(remove)?.terminal)this.unresolvedAttemptEvictions++;
        this.attempts.delete(remove);this.attemptEvictions++;
      }
    }
    this.events.push(e);if(this.events.length>LIVENESS_LIMITS.events)this.events.shift();
    if(e.stage==='RECEIVED'){this.counts.candidateEvaluations++;this.times.candidate=e.atMs;}
    if(e.stage==='FINAL_SIGNAL'&&e.status==='PASS'){this.counts.strategyQualifiedEvaluations++;this.times.qualified=e.atMs;}
    if(e.status==='BLOCKED')this.counts.refusals++;
    return e;
  }
  brokerDispatch(mutation={},settings={}){
    this.useScope(settings);if(mutation.phase!=='before_send'||mutation.method!=='POST'||mutation.apiPath!=='/portfolio/events/orders'||mutation.side!=='bid')return;
    this.counts.brokerDispatches++;this.times.dispatch=Date.now();
  }
  confirmedFill(entry={},settings={}){
    this.useScope(settings);
    const p=entry.entryConfig?.entryFillProof;
    if(entry.mode!=='LIVE'||p?.authoritative!==true||!(Number(p.filledCount)>0)||!entry.entryOrderId)return;
    // Registration may repeat; count unique retained receipt identities only.
    const id=String(entry.entryOrderId),key=identity(id);if(this.receipts.has(key))return;
    this.receipts.add(key);while(this.receipts.size>LIVENESS_LIMITS.receipts){this.receipts.delete(this.receipts.values().next().value);this.receiptEvictions++;}
    this.counts.confirmedEntryReceiptObservations++;
    // Rehydrating an old receipt is not a newly executed fill. Unknown broker
    // time stays unknown; this counter is never a financial trade total.
    const observed=num(p.observedAtMs);if(observed>0)this.times.fill=Math.max(this.times.fill,observed);
    this.event({atMs:observed||Date.now(),stage:'CONFIRMED_FILL',status:'PASS',reason:'durable_entry_fill_receipt',attemptId:id,concept:entry.conceptName,ticker:entry.ticker},settings);
  }
  sample({settings={},memory={},pressure='GREEN',workers=[],queues=[],health={},broker={},market={},learning={},database={},cpuPercent=null}={}){
    this.useScope(settings);const at=Number(memory.atMs)||Date.now();
    const lastEvent=this.events.at(-1)||null;
    const pending=[...this.attempts.values()].filter(x=>!x.terminal),inProgress=pending.length;
    const brokerQueues=['reads','mutations'].filter(k=>broker[k]).map(k=>({name:'broker_'+k,...broker[k]}));
    const status=classifyTradingLiveness({workers,queues:[...queues,...brokerQueues],health,lastEvent,
      activity:{inProgress,evaluated:this.counts.candidateEvaluations,unresolvedEvictions:this.unresolvedAttemptEvictions,
        oldestInProgressAtMs:pending.length?Math.min(...pending.map(x=>x.atMs)):null},now:at});
    const workerRows=workers.slice(0,16).map(w=>({name:clean(w.name,64),active:!!w.active,lastAttemptMs:num(w.lastAttemptMs),lastSuccessMs:num(w.lastSuccessMs),runningMs:num(w.runningMs),stalled:!!w.stalled}));
    const queueRows=[...queues,...brokerQueues].slice(0,24).map(q=>({name:clean(q.name,64),active:num(q.active),pending:num(q.pending),oldestActiveMs:num(q.oldestActiveMs),oldestActiveKey:clean(q.oldestActiveKey),oldestPendingMs:num(q.oldestPendingMs),oldestPendingKey:clean(q.oldestPendingKey),lastAttemptMs:num(q.lastAttemptMs),lastSuccessMs:num(q.lastSuccessMs),lastFailureMs:num(q.lastFailureMs)}));
    const row={atMs:at,rss:num(memory.rss),heapUsed:num(memory.heapUsed),heapTotal:num(memory.heapTotal),external:num(memory.external),
      gcCount:num(memory.gc?.count),gcTotalMs:num(memory.gc?.totalMs),gcMaxMs:num(memory.gc?.maxMs),
      eventLoopMeanMs:num(memory.eventLoop?.meanMs),eventLoopMaxMs:num(memory.eventLoop?.maxMs),eventLoopSamplingResolutionMs:50,cpuPercent:num(cpuPercent),pressure:clean(pressure,32),
      active:queues.reduce((n,q)=>n+Number(q.active||0),0),pending:queues.reduce((n,q)=>n+Number(q.pending||0),0),
      oldestActiveMs:Math.max(0,...queues.map(q=>Number(q.oldestActiveMs)||0)),
      brokerPending:Number(broker.reads?.pending||0)+Number(broker.mutations?.pending||0),
      dbWaiting:Number(database.mainPool?.waiting||0),quotes:Number(market.quotes||0),books:Number(market.books||0),histories:Number(market.histories||0),
      crashStates:Number(learning.crashStates||0),state:status.state,...this.counts,
      workers:workerRows,queues:queueRows,governorTransitions:num(memory.counters?.governorTransitions),
      brokerRateLimited:Object.values(broker.readCategories?.counts||{}).reduce((n,c)=>n+Number(c.rateLimited||0),0),
      brokerMaxQueueWaitMs:Math.max(Number(broker.reads?.queueWaitMaxMs)||0,Number(broker.mutations?.queueWaitMaxMs)||0),
      reconciliationAtMs:num(workers.find(w=>w.name==='reconciliation')?.lastSuccessMs),
      lastCandidateAtMs:this.times.candidate||null,lastQualifiedAtMs:this.times.qualified||null,lastDispatchAtMs:this.times.dispatch||null,lastConfirmedFillAtMs:this.times.fill||null,
      latestDenial:lastEvent?.firstDenial||null};
    if(!this.lastSampleAtMs||at-this.lastSampleAtMs>=LIVENESS_LIMITS.sampleEveryMs){
      const size=Buffer.byteLength(JSON.stringify(row));this.samples.push(row);this.sampleSizes.push(size);this.sampleBytes+=size;
      while(this.samples.length>LIVENESS_LIMITS.samples||this.sampleBytes>LIVENESS_LIMITS.sampleBytes){this.samples.shift();this.sampleBytes-=this.sampleSizes.shift();}
      this.lastSampleAtMs=at;
    }
    this.last={...status,atMs:at,workers:workerRows,queues:queueRows,
      coverageWarning:this.unresolvedAttemptEvictions>0?'historical_pending_candidate_coverage_lost':null};
    return this.snapshot();
  }
  snapshot({history=false}={}){
    const now=Date.now(),stale=this.last&&now-Number(this.last.atMs)>LIVENESS_LIMITS.staleWorkMs;
    return{version:TRADING_LIVENESS_VERSION,tradingAuthority:false,scope:this.scope,
      state:stale?'LIVENESS_DEGRADED':this.last?.state||'LIVENESS_DEGRADED',reason:stale?'runtime_sample_stale':this.last?.reason||'no_runtime_sample',sampledAtMs:this.last?.atMs||null,
      counts:{...this.counts},countingRule:'stage evaluations and receipt observations; bounded receipt deduplication; not financial trade totals',
      sinceMs:{candidate:elapsed(now,this.times.candidate),qualified:elapsed(now,this.times.qualified),dispatch:elapsed(now,this.times.dispatch),confirmedFill:elapsed(now,this.times.fill)},
      coverage:{observationStartedAtMs:this.observationStartedAtMs,firstSampleAtMs:this.samples[0]?.atMs||null,lastSampleAtMs:this.samples.at(-1)?.atMs||null,
        samples:this.samples.length,maximumSamples:LIVENESS_LIMITS.samples,sampleBytes:this.sampleBytes,maximumSampleBytes:LIVENESS_LIMITS.sampleBytes,events:this.events.length,maximumEvents:LIVENESS_LIMITS.events,sampleEveryMs:LIVENESS_LIMITS.sampleEveryMs,
        retainedAttempts:this.attempts.size,maximumAttempts:LIVENESS_LIMITS.attempts,attemptEvictions:this.attemptEvictions,unresolvedAttemptEvictions:this.unresolvedAttemptEvictions,
        historicalPendingCoverageComplete:this.unresolvedAttemptEvictions===0,
        retainedReceipts:this.receipts.size,maximumReceipts:LIVENESS_LIMITS.receipts,receiptEvictions:this.receiptEvictions,fullHistory:false},
      ...(history?{current:this.last,samples:this.samples.slice(),events:this.events.slice()}:{} )};
  }
}
