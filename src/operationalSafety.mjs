import {classifyCloneRestingOrders} from './cloneIdentity.mjs';
// HC2: operational authority only. No price, sizing, signal or exit strategy.
import {performance} from 'node:perf_hooks';

export const OPERATIONAL_VERSION = 'HC2-OPERATIONAL-SAFETY-V1';
export const OPS_LIMITS = Object.freeze({
  queuePending:256, queueTotal:2048, accountAgeMs:30_000,
  readConcurrency:6, readPending:128, mutationConcurrency:2, mutationPending:32,
  requestBudgetMs:30_000, responseBytes:8*1024*1024, monitorMs:2000,
});
export const WORKER_LIMITS = Object.freeze({
  protection:{durationMs:90_000,idleMs:30_000},
  scanner:{durationMs:420_000,idleMs:480_000},
  reconciliation:{durationMs:35_000,idleMs:40_000},
  shadow:{durationMs:60_000,idleMs:65_000},
  lightning:{durationMs:60_000,idleMs:65_000},
  starlightWake:{durationMs:60_000,idleMs:65_000},
  starlightPoll:{durationMs:60_000,idleMs:65_000},
  persistence:{durationMs:30_000,idleMs:45_000},
});
export const finiteNumber = value => (typeof value==='number'||typeof value==='string'&&value.trim()!=='')
  && Number.isFinite(Number(value));
export const scopeKey = settings => JSON.stringify([settings?.ownerId||'',settings?.systemName||'',settings?.mode||'',Number(settings?.resetTimestampMs||0)]);

export function validateBalance(balance){
  if(!balance||typeof balance!=='object'||Array.isArray(balance)
    ||!finiteNumber(balance.balance)||Number(balance.balance)<0
    ||!finiteNumber(balance.portfolio_value)||Number(balance.portfolio_value)<0)
    throw new Error('broker_balance_incomplete_or_invalid');
  return balance;
}
// Kalshi's canonical response direction is outcome_side/book_side. Per the
// published migration contract, deprecated action/side must not override it.
// Use the legacy pair ONLY when both canonical fields are absent. Malformed or
// contradictory canonical fields never fall back to legacy data. This helper
// grants no order authority; exact identities, fills and finances are validated
// separately by each caller. Shared by account and execution reconciliation.
export function brokerReceiptDirection(raw){
  const d=raw?.order||raw;
  if(!d||typeof d!=='object'||Array.isArray(d))
    return {bookSide:null,source:null,reason:'broker_direction_record_missing'};
  const hasBook=d.book_side!=null,hasOutcome=d.outcome_side!=null;
  if(hasBook||hasOutcome){
    if(hasBook&&!['bid','ask'].includes(d.book_side))
      return {bookSide:null,source:'canonical',reason:'broker_order_direction_mismatch'};
    if(hasOutcome&&!['yes','no'].includes(d.outcome_side))
      return {bookSide:null,source:'canonical',reason:'broker_order_outcome_mismatch'};
    const outcomeBook=hasOutcome?(d.outcome_side==='yes'?'bid':'ask'):null;
    if(hasBook&&hasOutcome&&d.book_side!==outcomeBook)
      return {bookSide:null,source:'canonical',reason:'broker_order_direction_mismatch'};
    return {bookSide:hasBook?d.book_side:outcomeBook,source:'canonical',reason:null};
  }
  if(d.action!=null&&!['buy','sell'].includes(d.action))
    return {bookSide:null,source:'legacy',reason:'broker_order_direction_mismatch'};
  if(d.side!=null&&!['yes','no','bid','ask'].includes(d.side))
    return {bookSide:null,source:'legacy',reason:'broker_order_side_invalid'};
  if(['bid','ask'].includes(d.side))return {bookSide:d.side,source:'legacy',reason:null};
  if(['buy','sell'].includes(d.action)&&['yes','no'].includes(d.side))
    return {bookSide:(d.action==='buy')===(d.side==='yes')?'bid':'ask',source:'legacy',reason:null};
  return {bookSide:null,source:'legacy',reason:'broker_order_direction_missing'};
}

export function validateRestingOrders(orders){
  if(!Array.isArray(orders))throw new Error('resting_orders_malformed');
  const seen=new Set();
  for(const order of orders){
    const id=order?.order_id;
    const ticker=order?.ticker??order?.market_ticker;
    // A valid canonical direction remains valid even when deprecated fields
    // are stale or absent. Canonical contradictions and missing direction fail.
    const direction=brokerReceiptDirection(order);
    const directionValid=!direction.reason;
    if(typeof id!=='string'||!id||typeof ticker!=='string'||!ticker
      ||!directionValid
      ||order.status!=='resting'||!finiteNumber(order.remaining_count_fp??order.remaining_count)
      ||Number(order.remaining_count_fp??order.remaining_count)<0||seen.has(id))
      throw new Error('resting_orders_invalid_or_duplicate_record');
    seen.add(id);
  }
  return orders;
}
export function ownOrderIssues(orders,owned,options={}){
  return classifyCloneRestingOrders(orders,owned,options);
}

export class QueueBudget {
  constructor(maximum=OPS_LIMITS.queueTotal){this.maximum=maximum;this.used=0;this.rejected=0;this.peak=0;this.lastRejectedAtMs=0;}
  acquire(){if(this.used>=this.maximum){this.rejected++;this.lastRejectedAtMs=Date.now();return false;}this.used++;this.peak=Math.max(this.peak,this.used);return true;}
  release(){this.used=Math.max(0,this.used-1);}
  snapshot(){return{maximum:this.maximum,used:this.used,peak:this.peak,rejected:this.rejected,lastRejectedAtMs:this.lastRejectedAtMs};}
}

// One reservation per distinct key covers pending + active + its latest rerun.
// Overflow rejects NEW work explicitly; callers retain authoritative DB work.
export class BoundedCoalescingQueue {
  constructor({maxConcurrency=4,maxPending=OPS_LIMITS.queuePending,onError=null,onDeferred=null,budget=null}={}){
    this.maxConcurrency=Math.max(1,Math.min(32,Math.floor(Number(maxConcurrency)||1)));
    this.maxPending=Number.isFinite(Number(maxPending))?Math.max(1,Math.floor(Number(maxPending))):OPS_LIMITS.queuePending;
    this.budget=budget;this.onError=onError;this.onDeferred=onDeferred;
    this.pending=new Map();this.active=new Set();this.rerun=new Map();this.started=new Map();this.queuedAt=new Map();
    this.activeCount=0;this.totalStarted=0;this.totalCompleted=0;this.totalCoalesced=0;this.totalDeferred=0;this.totalFailed=0;this.errorHandlerFailures=0;
    this.maxObservedActive=0;this.maxObservedPending=0;this.lastDeferredAtMs=0;this.closed=false;
    this.errorHandlerPromise=null;this.pendingError=null;this.errorHandlerCoalesced=0;
    this.lastAttemptMs=0;this.lastSuccessMs=0;this.lastFailureMs=0;this.lastCompletedMs=0;
  }
  enqueue(key,task){
    const k=String(key||'');if(!k||typeof task!=='function')return false;
    if(this.closed)return this.defer(k);
    if(this.active.has(k)){this.rerun.set(k,task);this.totalCoalesced++;return true;}
    if(this.pending.has(k)){this.pending.set(k,task);this.totalCoalesced++;return true;}
    if(this.pending.size>=this.maxPending||this.budget&&!this.budget.acquire())return this.defer(k);
    this.pending.set(k,task);this.queuedAt.set(k,performance.now());this.maxObservedPending=Math.max(this.maxObservedPending,this.pending.size);this.pump();return true;
  }
  defer(key){this.totalDeferred++;this.lastDeferredAtMs=Date.now();try{this.onDeferred?.(key);}catch{}return false;}
  pump(){
    while(this.activeCount<this.maxConcurrency&&this.pending.size){
      const [key,task]=this.pending.entries().next().value;this.pending.delete(key);this.queuedAt.delete(key);this.active.add(key);this.started.set(key,performance.now());
      this.activeCount++;this.totalStarted++;this.maxObservedActive=Math.max(this.maxObservedActive,this.activeCount);
      this.lastAttemptMs=Date.now();
      void Promise.resolve().then(task).then(()=>{this.lastSuccessMs=Date.now();}).catch(error=>{
        this.totalFailed++;
        this.lastFailureMs=Date.now();
        this.reportError(error,key);
      }).finally(()=>{
        this.active.delete(key);this.started.delete(key);this.activeCount--;this.totalCompleted++;
        this.lastCompletedMs=Date.now();
        const rerun=this.rerun.get(key);this.rerun.delete(key);
        if(rerun){this.pending.set(key,rerun);this.queuedAt.set(key,performance.now());}else this.budget?.release();
        this.pump();
      });
    }
  }
  // R15: the actual task has already rejected. Optional error logging cannot
  // retain its execution slot or block protection/entry work. Keep ONE real
  // diagnostic callback plus ONE latest replacement; a slow audit cannot
  // become an unbounded detached promise chain. Unresolved tasks above retain
  // their original ownership and are never canceled or retried here.
  reportError(error,key){
    if(typeof this.onError!=='function')return;
    if(this.errorHandlerPromise){this.pendingError={error,key};this.errorHandlerCoalesced++;return;}
    const run=Promise.resolve().then(()=>this.onError(error,key))
      .catch(()=>{this.errorHandlerFailures++;})
      .finally(()=>{this.errorHandlerPromise=null;const next=this.pendingError;this.pendingError=null;if(next)this.reportError(next.error,next.key);});
    this.errorHandlerPromise=run;
  }
  // Entry shutdown invalidates *waiting* work only. Active tasks and broker
  // mutations are never cancelled or made to appear completed; their existing
  // commit-time admission and reconciliation fences remain authoritative.
  // A rerun shares the active key's reservation, released when that task exits.
  clear(){
    const pending=this.pending.size,rerun=this.rerun.size;
    for(const key of this.pending.keys())this.budget?.release();
    this.pending.clear();this.queuedAt.clear();this.rerun.clear();
    return {pendingCancelled:pending,rerunsCancelled:rerun,activeUnaffected:this.activeCount};
  }
  isIdle(){return this.activeCount===0&&this.pending.size===0&&this.rerun.size===0;}
  closeAdmission(){this.closed=true;}
  snapshot(){
    const now=performance.now();let oldestActiveKey=null,activeAt=now,oldestPendingKey=null,pendingAt=now;
    for(const [key,at] of this.started)if(oldestActiveKey===null||at<activeAt){oldestActiveKey=key;activeAt=at;}
    for(const [key,at] of this.queuedAt)if(oldestPendingKey===null||at<pendingAt){oldestPendingKey=key;pendingAt=at;}
    return{maxConcurrency:this.maxConcurrency,maxPending:this.maxPending,active:this.activeCount,pending:this.pending.size,rerun:this.rerun.size,
    totalStarted:this.totalStarted,totalCompleted:this.totalCompleted,totalCoalesced:this.totalCoalesced,totalDeferred:this.totalDeferred,totalFailed:this.totalFailed,
    lastAttemptMs:this.lastAttemptMs,lastSuccessMs:this.lastSuccessMs,lastFailureMs:this.lastFailureMs,lastCompletedMs:this.lastCompletedMs,
    errorHandlerFailures:this.errorHandlerFailures,maxObservedActive:this.maxObservedActive,maxObservedPending:this.maxObservedPending,lastDeferredAtMs:this.lastDeferredAtMs,
    oldestActiveMs:oldestActiveKey===null?0:Math.max(0,now-activeAt),oldestActiveKey,
    oldestPendingMs:oldestPendingKey===null?0:Math.max(0,now-pendingAt),oldestPendingKey,
    errorHandlerActive:!!this.errorHandlerPromise,errorHandlerPending:!!this.pendingError,errorHandlerCoalesced:this.errorHandlerCoalesced,closed:this.closed};}
}

// Bounded waiting with explicit rejection. A timed-out queued request never starts
// later; an already-started mutation is NEVER aborted/retried by this scheduler.
export class RequestLane {
  constructor(concurrency,pending,{reservedConcurrency=0,reservedPending=0,entryReservedConcurrency=0}={}){
    this.concurrency=concurrency;this.maximumPending=pending;
    // Reservations share the EXISTING total budget. Market reads cannot occupy
    // all account-proof slots, and no second/unbounded transport lane is added.
    this.reservedConcurrency=Math.max(0,Math.min(concurrency-1,reservedConcurrency));
    this.reservedPending=Math.max(0,Math.min(pending-1,reservedPending));
    this.entryReservedConcurrency=Math.max(0,Math.min(concurrency-this.reservedConcurrency-1,entryReservedConcurrency));
    this.entryReservedPending=this.entryReservedConcurrency>0
      ?Math.min(8,Math.max(0,pending-this.reservedPending-1)):0;
    this.active=0;this.activeNormal=0;this.activeBackground=0;this.normalTurn=0;this.queue=[];this.rejected=0;this.completed=0;
    this.peakActive=0;this.peakPending=0;
    this.activeJobs=new Map();this.sequence=0;this.queueWaitTotalMs=0;this.queueWaitMaxMs=0;
  }
  run(fn,deadline=performance.now()+OPS_LIMITS.requestBudgetMs,{critical=false,owner='request',priority='normal'}={}){
    if(!Number.isFinite(deadline)||performance.now()>=deadline){this.rejected++;return Promise.reject(new Error('broker_request_queue_expired'));}
    const normalPending=this.queue.reduce((n,j)=>n+(j.critical?0:1),0);
    const backgroundPending=this.queue.reduce((n,j)=>n+(!j.critical&&j.priority!=='clock'?1:0),0);
    if(this.queue.length>=this.maximumPending
      ||(!critical&&normalPending>=this.maximumPending-this.reservedPending)
      ||(!critical&&priority!=='clock'
        &&backgroundPending>=this.maximumPending-this.reservedPending-this.entryReservedPending)){
      this.rejected++;return Promise.reject(new Error('broker_request_backpressure'));
    }
    return new Promise((resolve,reject)=>{
      const job={fn,resolve,reject,deadline,timer:null,critical:critical===true,
        priority:priority==='clock'||priority==='book'?priority:'normal',
        id:++this.sequence,owner:String(owner).slice(0,160),queuedAt:performance.now()};
      // Expiring WAITING work never cancels a dispatched broker mutation.
      job.timer=setTimeout(()=>{
        const at=this.queue.indexOf(job);if(at<0)return;
        this.queue.splice(at,1);job.timer=null;this.rejected++;
        reject(new Error('broker_request_queue_expired'));this.pump();
      },Math.max(1,Math.ceil(deadline-performance.now())));
      job.timer.unref?.();
      this.queue.push(job);this.peakPending=Math.max(this.peakPending,this.queue.length);this.pump();
    });
  }
  pump(){
    while(this.active<this.concurrency&&this.queue.length){
      const normalAvailable=this.activeNormal<this.concurrency-this.reservedConcurrency;
      const backgroundAvailable=normalAvailable&&this.activeBackground<this.concurrency-this.reservedConcurrency-this.entryReservedConcurrency;
      const book=backgroundAvailable?this.queue.findIndex(j=>!j.critical&&j.priority==='book'):-1;
      const clock=normalAvailable?this.queue.findIndex(j=>!j.critical&&j.priority==='clock'):-1;
      const background=backgroundAvailable
        ?this.queue.findIndex(j=>!j.critical&&j.priority==='normal'):-1;
      // Account/protected-exposure reads retain critical priority. Unfunded
      // books and discovery share three slots, leaving one for entry clocks.
      // Weighted round robin bounds service for every noncritical class.
      const order=['clock','clock','clock','book','normal','book'];
      const available={clock,book,normal:background};let normal=-1,nextTurn=this.normalTurn;
      for(let offset=0;offset<order.length;offset++){
        const turn=(this.normalTurn+offset)%order.length,found=available[order[turn]];
        if(found>=0){normal=found;nextTurn=(turn+1)%order.length;break;}
      }
      const critical=this.queue.findIndex(j=>j.critical);
      // Critical reads lead FIFO market work. With sustained critical traffic,
      // keep one slot making market progress too; total concurrency never grows.
      const index=normal>=0&&this.activeNormal===0&&this.active>=this.concurrency-1
        ?normal:critical>=0?critical:normal;
      if(index<0)return;
      const [job]=this.queue.splice(index,1);clearTimeout(job.timer);job.timer=null;
      if(performance.now()>=job.deadline){this.rejected++;job.reject(new Error('broker_request_queue_expired'));continue;}
      this.active++;if(!job.critical){this.activeNormal++;if(job.priority!=='clock')this.activeBackground++;this.normalTurn=nextTurn;}
      job.startedAt=performance.now();this.activeJobs.set(job.id,job);
      const waited=Math.max(0,job.startedAt-job.queuedAt);this.queueWaitTotalMs+=waited;this.queueWaitMaxMs=Math.max(this.queueWaitMaxMs,waited);
      this.peakActive=Math.max(this.peakActive,this.active);
      void Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{
        this.activeJobs.delete(job.id);this.active--;if(!job.critical){this.activeNormal--;if(job.priority!=='clock')this.activeBackground--;}
        this.completed++;this.pump();
      });
    }
  }
  snapshot(){const now=performance.now();let oldest=null;for(const job of this.activeJobs.values())if(!oldest||job.startedAt<oldest.startedAt)oldest=job;
    const pending=this.queue[0];return{active:this.active,pending:this.queue.length,maximumPending:this.maximumPending,concurrency:this.concurrency,
    oldestActiveMs:oldest?Math.max(0,now-oldest.startedAt):0,oldestActiveKey:oldest?.owner||null,
    oldestPendingMs:pending?Math.max(0,now-pending.queuedAt):0,oldestPendingKey:pending?.owner||null,
    queueWaitTotalMs:this.queueWaitTotalMs,queueWaitMaxMs:this.queueWaitMaxMs,
    activeCritical:this.active-this.activeNormal,activeNormal:this.activeNormal,
    pendingCritical:this.queue.filter(j=>j.critical).length,pendingNormal:this.queue.filter(j=>!j.critical).length,
    reservedConcurrency:this.reservedConcurrency,reservedPending:this.reservedPending,
    entryReservedConcurrency:this.entryReservedConcurrency,activeBackground:this.activeBackground,
    entryReservedPending:this.entryReservedPending,
    pendingEntryClock:this.queue.filter(j=>!j.critical&&j.priority==='clock').length,
    rejected:this.rejected,completed:this.completed,peakActive:this.peakActive,peakPending:this.peakPending};}
}

export class OperationalMonitor {
  constructor({clock=()=>performance.now(),wall=()=>Date.now()}={}){
    this.clock=clock;this.wall=wall;this.started=clock();this.workers=new Map();this.account=null;this.accountGeneration=0;this.fatal=null;this.overloadAt=0;this.initialized=false;this.sentinel=null;
  }
  requireWorker(name,required=true){
    if(!Object.hasOwn(WORKER_LIMITS,name))throw new Error('unknown_operational_worker');
    let state=this.workers.get(name);
    if(!state){state={name,active:false,lastAttemptMs:0,lastSuccessMs:0,consecutiveFailures:0,lastError:null,attempts:0,required};this.workers.set(name,state);}
    state.required=required;return state;
  }
  heartbeat(name){
    const state=this.workers.get(name);
    if(state?.active)state.started=this.clock();
  }
  async run(name,fn){
    const state=this.workers.get(name)||this.requireWorker(name);
    // Existing single-flight owners retain ownership. Never declare a timeout a
    // cancellation or spawn a second transaction while the first is unresolved.
    if(state.promise)return state.promise;
    state.active=true;state.started=this.clock();state.lastAttemptMs=this.wall();state.attempts++;
    const pending=Promise.resolve().then(fn).then(value=>{state.lastSuccess=this.clock();state.lastSuccessMs=this.wall();state.consecutiveFailures=0;state.lastError=null;return value;},error=>{
      state.consecutiveFailures++;state.lastError=String(error?.code||error?.name||'worker_error').slice(0,100);throw error;
    }).finally(()=>{state.lastDurationMs=Math.max(0,this.clock()-state.started);state.active=false;state.promise=null;});
    state.promise=pending;return pending;
  }
  setAccount({settings,startedAtMs,ok,reason=null,balance,orders,ownIssues}){
    const now=this.wall();
    this.account={scope:scopeKey(settings),verifiedAtMs:now,observedAtMs:startedAtMs,ok:ok===true,
      reason:ok===true?null:String(reason||'account_reconciliation_required').slice(0,100),
      balanceCents:Number(balance?.balance),restingOrders:orders?.length??0,ownIssues:ownIssues||{},
      monotonicAt:this.clock(),ageAtCommit:Math.max(0,now-startedAtMs)};
  }
  invalidateAccount(reason){
    const exactOwnedBuy=reason==='q17_owned_buy_in_flight';
    const prior=this.account;
    const ownerProofGood=exactOwnedBuy&&(prior?.ok===true||prior?.priorOwnerProofOk===true);
    this.accountGeneration++;
    this.account={...prior,ok:false,reason:String(reason||'account_invalidated').slice(0,100),
      priorOwnerProofOk:ownerProofGood,
      priorOwnerProofObservedAtMs:ownerProofGood?(prior?.ok===true?Number(prior.observedAtMs||0):Number(prior.priorOwnerProofObservedAtMs||0)):0};
  }
  // Narrow, bounded exception ONLY for the five Q17 recovery BUY paths.
  // The last authenticated owner proof must have been healthy before this
  // clone's own exact client-ID BUY invalidated the account generation.
  // The BUY still needs an independent current-shard cash verification and
  // atomic pending-collateral reservation at database commit and send time.
  hasRecentQ17OwnedBuyProof(settings){
    const a=this.account,at=Number(a?.priorOwnerProofObservedAtMs||0),age=this.wall()-at;
    return a?.reason==='q17_owned_buy_in_flight' && a.priorOwnerProofOk===true
      && a.scope===scopeKey(settings) && at>0 && age>=0&&age<=OPS_LIMITS.accountAgeMs
      && !this.fatal && !this.sentinel?.unsafe?.();
  }
  accountStatus(settings){
    const a=this.account;const age=a?Math.max(this.wall()-Number(a.observedAtMs||0),Number(a.ageAtCommit||0)+this.clock()-Number(a.monotonicAt||0)):Infinity;
    const ok=!!a&&a.ok===true&&a.scope===scopeKey(settings)&&age>=0&&age<=OPS_LIMITS.accountAgeMs;
    return {ok,reason:ok?null:a?.reason||(!a?'account_not_verified':a.scope!==scopeKey(settings)?'account_scope_changed':!a.ok?'account_reconciliation_required':'account_evidence_stale'),ageMs:Number.isFinite(age)?Math.max(0,age):null,
      verifiedAtMs:a?.verifiedAtMs||0,observedAtMs:a?.observedAtMs||0,restingOrders:a?.restingOrders??null,ownIssues:a?.ownIssues||null};
  }
  fail(reason){this.fatal=String(reason).slice(0,120);this.invalidateAccount(reason);}
  workerSnapshot(){
    const now=this.clock();return [...this.workers.values()].map(s=>{
      const limits=WORKER_LIMITS[s.name];const elapsed=s.active?now-s.started:now-(s.lastSuccess??this.started);
      // A heartbeat or an in-flight read does NOT establish completed protection.
      // Match the engine's 10-second protection freshness limit, including before
      // the first successful inspection; any missing/stale proof denies entries.
      const protectionEvidenceStale=s.name==='protection'
        && (s.lastSuccess==null||now<s.lastSuccess||now-s.lastSuccess>10_000);
      const stalled=s.required!==false&&(protectionEvidenceStale
        ||(!s.active&&elapsed>limits.idleMs)
        ||(s.active&&elapsed>limits.durationMs));
      return{name:s.name,required:s.required!==false,active:s.active,attempts:s.attempts,lastAttemptMs:s.lastAttemptMs,lastSuccessMs:s.lastSuccessMs,lastDurationMs:s.lastDurationMs??0,
        runningMs:s.active?Math.max(0,elapsed):0,stalled,consecutiveFailures:s.consecutiveFailures,lastError:s.lastError};
    });
  }
  entryReasons(settings,queues=[]){
    const reasons=[];if(this.fatal)reasons.push(this.fatal);
    if(this.sentinel?.unsafe?.())reasons.push('independent_watchdog_not_healthy');
    if(this.budget&&this.budget.used>=this.budget.maximum)reasons.push('global_queue_backpressure');
    for(const w of this.workerSnapshot()){
      if(!w.required||!(w.stalled||w.consecutiveFailures>=3))continue;
      if(w.name==='protection'||(settings?.mode==='LIVE'&&w.name==='reconciliation'))
        reasons.push('worker_'+w.name+'_unhealthy');
    }
    for(const q of queues){const s=q?.snapshot?.();if(s&&(s.pending>=s.maxPending||s.oldestActiveMs>60_000))reasons.push('queue_backpressure');}
    if(settings?.mode==='LIVE'){
      // HTTP operator-login configuration is not a broker execution-health
      // requirement. Mode transitions remain authenticated at /api/mode;
      // capital admission continues to require account, worker, and other
      // independent safety evidence.
      if(!this.initialized)reasons.push('operational_monitor_not_initialized');
      const a=this.accountStatus(settings);if(!a.ok)reasons.push(a.reason);
    }
    return [...new Set(reasons)];
  }
  snapshot(settings,queues=[]){const reasons=this.entryReasons(settings,queues);return{version:OPERATIONAL_VERSION,
    state:reasons.length?(this.fatal?'CRITICAL':'NEW_ENTRIES_BLOCKED'):'HEALTHY',newEntriesAllowed:reasons.length===0,reasons,
    workers:this.workerSnapshot(),account:settings?.mode==='LIVE'?this.accountStatus(settings):{ok:true,reason:'simulation_no_broker_capital'},
    sentinel:this.sentinel?.snapshot?.()||{configured:false},initialized:this.initialized};}
}

// Nonfinancial status/outbox only; never replaces or prunes order/fill truth.
export const OPS_SCHEMA_SQL = `
create table if not exists sag_operational_state_v1 (
 scope text primary key, instance_id text not null, updated_at timestamptz not null default now(), state jsonb not null,
 constraint sag_ops_state_size check(octet_length(state::text)<=131072));
create table if not exists sag_operational_alerts_v1 (
 scope text not null, code text not null, state text not null, occurrences bigint not null default 1,
 first_at timestamptz not null default now(), last_at timestamptz not null default now(), resolved_at timestamptz,
 revision bigint not null default 1, delivered_revision bigint not null default 0,
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 primary key(scope,code), constraint sag_ops_alert_code check(length(code)<=160));
create index if not exists sag_ops_alert_due_v1 on sag_operational_alerts_v1(next_attempt_at)
 where delivered_revision<revision;
`;
