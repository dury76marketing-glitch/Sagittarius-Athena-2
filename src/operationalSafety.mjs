// HC2: operational authority only. No price, sizing, signal or exit strategy.
import {performance} from 'node:perf_hooks';

export const OPERATIONAL_VERSION = 'HC2-OPERATIONAL-SAFETY-V1';
export const OPS_LIMITS = Object.freeze({
  queuePending:256, queueTotal:2048, accountAgeMs:30_000,
  readConcurrency:6, readPending:128, mutationConcurrency:2, mutationPending:32,
  requestBudgetMs:30_000, responseBytes:8*1024*1024, monitorMs:2000,
});
export const WORKER_LIMITS = Object.freeze({
  protection:{durationMs:30_000,idleMs:30_000},
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
export function validateRestingOrders(orders){
  if(!Array.isArray(orders))throw new Error('resting_orders_malformed');
  const seen=new Set();
  for(const order of orders){
    const id=order?.order_id;
    const ticker=order?.ticker??order?.market_ticker;
    if(typeof id!=='string'||!id||typeof ticker!=='string'||!ticker
      ||!['buy','sell'].includes(order.action)||!['yes','no'].includes(order.side)
      ||order.status!=='resting'||!finiteNumber(order.remaining_count_fp??order.remaining_count)
      ||Number(order.remaining_count_fp??order.remaining_count)<0||seen.has(id))
      throw new Error('resting_orders_invalid_or_duplicate_record');
    seen.add(id);
  }
  return orders;
}
export function ownOrderIssues(orders,owned){
  const ids=new Set(),clients=new Set(),tickers=new Set();
  for(const e of owned||[]){
    tickers.add(e.ticker);
    for(const k of ['entryOrderId','exitOrderId'])if(e[k])ids.add(String(e[k]));
    for(const k of ['entryClientOrderId','exitClientOrderId'])if(e[k])clients.add(String(e[k]));
  }
  const own=orders.filter(o=>ids.has(o.order_id)||clients.has(o.client_order_id));
  const unknownOnOwned=orders.filter(o=>tickers.has(o.ticker??o.market_ticker)&&!ids.has(o.order_id)&&!clients.has(o.client_order_id));
  return {knownResting:own.length,unknownOnOwned:unknownOnOwned.length,otherSystemResting:orders.length-own.length-unknownOnOwned.length};
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
    this.pending=new Map();this.active=new Set();this.rerun=new Map();this.started=new Map();
    this.activeCount=0;this.totalStarted=0;this.totalCompleted=0;this.totalCoalesced=0;this.totalDeferred=0;this.totalFailed=0;this.errorHandlerFailures=0;
    this.maxObservedActive=0;this.maxObservedPending=0;this.lastDeferredAtMs=0;this.closed=false;
  }
  enqueue(key,task){
    const k=String(key||'');if(!k||typeof task!=='function')return false;
    if(this.closed)return this.defer(k);
    if(this.active.has(k)){this.rerun.set(k,task);this.totalCoalesced++;return true;}
    if(this.pending.has(k)){this.pending.set(k,task);this.totalCoalesced++;return true;}
    if(this.pending.size>=this.maxPending||this.budget&&!this.budget.acquire())return this.defer(k);
    this.pending.set(k,task);this.maxObservedPending=Math.max(this.maxObservedPending,this.pending.size);this.pump();return true;
  }
  defer(key){this.totalDeferred++;this.lastDeferredAtMs=Date.now();try{this.onDeferred?.(key);}catch{}return false;}
  pump(){
    while(this.activeCount<this.maxConcurrency&&this.pending.size){
      const [key,task]=this.pending.entries().next().value;this.pending.delete(key);this.active.add(key);this.started.set(key,performance.now());
      this.activeCount++;this.totalStarted++;this.maxObservedActive=Math.max(this.maxObservedActive,this.activeCount);
      void Promise.resolve().then(task).catch(async error=>{
        this.totalFailed++;
        try{await this.onError?.(error,key);}catch{this.errorHandlerFailures++;}
      }).finally(()=>{
        this.active.delete(key);this.started.delete(key);this.activeCount--;this.totalCompleted++;
        const rerun=this.rerun.get(key);this.rerun.delete(key);
        if(rerun)this.pending.set(key,rerun);else this.budget?.release();
        this.pump();
      });
    }
  }
  isIdle(){return this.activeCount===0&&this.pending.size===0&&this.rerun.size===0;}
  closeAdmission(){this.closed=true;}
  snapshot(){return{maxConcurrency:this.maxConcurrency,maxPending:this.maxPending,active:this.activeCount,pending:this.pending.size,rerun:this.rerun.size,
    totalStarted:this.totalStarted,totalCompleted:this.totalCompleted,totalCoalesced:this.totalCoalesced,totalDeferred:this.totalDeferred,totalFailed:this.totalFailed,
    errorHandlerFailures:this.errorHandlerFailures,maxObservedActive:this.maxObservedActive,maxObservedPending:this.maxObservedPending,lastDeferredAtMs:this.lastDeferredAtMs,
    oldestActiveMs:this.started.size?Math.max(0,performance.now()-Math.min(...this.started.values())):0,closed:this.closed};}
}

// Bounded waiting with explicit rejection. A timed-out queued request never starts
// later; an already-started mutation is NEVER aborted/retried by this scheduler.
export class RequestLane {
  constructor(concurrency,pending){this.concurrency=concurrency;this.maximumPending=pending;this.active=0;this.queue=[];this.rejected=0;this.completed=0;}
  run(fn,deadline=performance.now()+OPS_LIMITS.requestBudgetMs){
    if(!Number.isFinite(deadline)||performance.now()>=deadline){this.rejected++;return Promise.reject(new Error('broker_request_queue_expired'));}
    if(this.queue.length>=this.maximumPending){this.rejected++;return Promise.reject(new Error('broker_request_backpressure'));}
    return new Promise((resolve,reject)=>{
      const job={fn,resolve,reject,deadline,timer:null};
      // HC2-R1: expiry must settle while the lane is blocked, not only after
      // another request completes. This cancels WAITING work, never a request
      // already dispatched. It cannot release a live broker-mutation lock.
      job.timer=setTimeout(()=>{
        const at=this.queue.indexOf(job);
        if(at<0)return;
        this.queue.splice(at,1);job.timer=null;this.rejected++;
        reject(new Error('broker_request_queue_expired'));
      },Math.max(1,Math.ceil(deadline-performance.now())));
      job.timer.unref?.();
      this.queue.push(job);this.pump();
    });
  }
  pump(){
    while(this.active<this.concurrency&&this.queue.length){
      const job=this.queue.shift();clearTimeout(job.timer);job.timer=null;
      if(performance.now()>=job.deadline){this.rejected++;job.reject(new Error('broker_request_queue_expired'));continue;}
      this.active++;void Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{this.active--;this.completed++;this.pump();});
    }
  }
  snapshot(){return{active:this.active,pending:this.queue.length,maximumPending:this.maximumPending,concurrency:this.concurrency,rejected:this.rejected,completed:this.completed};}
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
  setAccount({settings,startedAtMs,ok,balance,orders,ownIssues}){
    const now=this.wall();
    this.account={scope:scopeKey(settings),verifiedAtMs:now,observedAtMs:startedAtMs,ok:ok===true,
      balanceCents:Number(balance?.balance),restingOrders:orders?.length??0,ownIssues:ownIssues||{},
      monotonicAt:this.clock(),ageAtCommit:Math.max(0,now-startedAtMs)};
  }
  invalidateAccount(reason){this.accountGeneration++;this.account={...this.account,ok:false,reason:String(reason||'account_invalidated').slice(0,100)};}
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
      const stalled=s.required!==false&&elapsed>(s.active?limits.durationMs:limits.idleMs);
      return{name:s.name,required:s.required!==false,active:s.active,attempts:s.attempts,lastAttemptMs:s.lastAttemptMs,lastSuccessMs:s.lastSuccessMs,lastDurationMs:s.lastDurationMs??0,
        runningMs:s.active?Math.max(0,elapsed):0,stalled,consecutiveFailures:s.consecutiveFailures,lastError:s.lastError};
    });
  }
  entryReasons(settings,queues=[]){
    const reasons=[];if(this.fatal)reasons.push(this.fatal);
    if(this.sentinel?.unsafe?.())reasons.push('independent_watchdog_not_healthy');
    if(this.budget&&this.budget.used>=this.budget.maximum)reasons.push('global_queue_backpressure');
    for(const w of this.workerSnapshot())if(w.required&&(w.stalled||w.consecutiveFailures>=3))reasons.push('worker_'+w.name+'_unhealthy');
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
