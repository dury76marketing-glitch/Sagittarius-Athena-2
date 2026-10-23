import {getHeapStatistics} from 'node:v8';
import {PerformanceObserver,monitorEventLoopDelay} from 'node:perf_hooks';

export const MEMORY_REPAIR_VERSION='OOM1-BOUNDED-OWNERSHIP-2026-10-23';

// One active operation and at most one replacement per key. Callers reduce all
// observations BEFORE enqueueing; this coalesces writes, never price evidence.
export class LatestStateWriter {
  constructor({concurrency=2,onError=null}={}){
    this.concurrency=Math.max(1,Math.floor(concurrency));this.onError=onError;
    this.pending=new Map();this.active=new Map();this.waiters=new Map();
    this.stats={enqueued:0,coalesced:0,completed:0,failed:0,highWaterKeys:0,maxActive:0};
  }
  enqueue(key,task){
    key=String(key);if(!key||typeof task!=='function')return false;
    this.stats.enqueued++;if(this.pending.has(key)||this.active.has(key))this.stats.coalesced++;
    this.pending.set(key,task);this.stats.highWaterKeys=Math.max(this.stats.highWaterKeys,this.pending.size);
    this.pump();return true;
  }
  pump(){
    for(const [key,task] of this.pending){
      if(this.active.size>=this.concurrency)break;
      if(this.active.has(key))continue;
      this.pending.delete(key);
      const run=Promise.resolve().then(task).then(()=>{this.stats.completed++;},error=>{
        this.stats.failed++;try{this.onError?.(error,key);}catch{}
      }).finally(()=>{
        this.active.delete(key);
        if(!this.pending.has(key)){this.waiters.get(key)?.resolve();this.waiters.delete(key);}
        this.pump();
      });
      this.active.set(key,run);this.stats.maxActive=Math.max(this.stats.maxActive,this.active.size);
    }
  }
  idle(key){
    key=String(key);if(!this.pending.has(key)&&!this.active.has(key))return Promise.resolve(true);
    if(!this.waiters.has(key)){
      let resolve;const promise=new Promise(r=>{resolve=r;});this.waiters.set(key,{resolve,promise});
    }
    return this.waiters.get(key).promise;
  }
  async flush(timeoutMs=2000){
    const keys=new Set([...this.pending.keys(),...this.active.keys()]);
    return deadline(Promise.all([...keys].map(k=>this.idle(k))).then(()=>true),timeoutMs,false);
  }
  snapshot(){return {...this.stats,active:this.active.size,pending:this.pending.size,waiters:this.waiters.size,concurrency:this.concurrency};}
}

export async function deadline(promise,timeoutMs,fallback=false){
  if(!(Number(timeoutMs)>0))return promise;
  let timer;try{return await Promise.race([promise,new Promise(resolve=>{timer=setTimeout(()=>resolve(fallback),timeoutMs);})]);}
  finally{clearTimeout(timer);}
}

// Learning needs economics and identity, not frozen entry proofs, command
// trees, entire market books or the UI's nested diagnostic payloads.
export function profitLearningEntry(entry={}){
  const out={};
  for(const k of ['id','systemName','ownerId','mode','ticker','eventTicker','marketTitle','conceptName','sourceFeeder',
    'entryPriceCents','entryFeeCents','count','remainingCount','openedAtMs','closedAtMs','pnlCents','exitPriceCents','closeReason'])out[k]=entry[k];
  return out;
}

// Opt-in process telemetry has constant-sized counters. Heap snapshots remain
// an OFFLINE diagnostic: taking one on the trading thread can itself exhaust RAM.
export class MemoryTelemetry {
  constructor(){
    this.gc={count:0,totalMs:0,lastMs:0,maxMs:0};this.last=null;
    this.observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){
      this.gc.count++;this.gc.totalMs+=e.duration;this.gc.lastMs=e.duration;this.gc.maxMs=Math.max(this.gc.maxMs,e.duration);
    }});this.observer.observe({entryTypes:['gc']});
    this.delay=monitorEventLoopDelay({resolution:50});this.delay.enable();
  }
  sample(counters={}){
    const m=process.memoryUsage(),h=getHeapStatistics();
    const row={version:MEMORY_REPAIR_VERSION,atMs:Date.now(),uptimeSeconds:process.uptime(),
      ...m,heapLimitBytes:h.heap_size_limit,heapUtilization:m.heapUsed/h.heap_size_limit,
      gc:{...this.gc},eventLoop:{meanMs:Number.isFinite(this.delay.mean)?this.delay.mean/1e6:0,maxMs:this.delay.max/1e6},counters};
    this.last=row;this.delay.reset();return row;
  }
  close(){this.observer.disconnect();this.delay.disable();}
}
