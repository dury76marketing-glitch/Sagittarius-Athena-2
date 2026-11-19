// Independent worker observes the main event loop through shared memory.
// It never owns, cancels, retries or submits a trading operation.
import {Worker,isMainThread,workerData} from 'node:worker_threads';
import {performance} from 'node:perf_hooks';
const ns=()=>process.hrtime.bigint();

export function alertWebhookConfigured(env=process.env){
  try{const u=new URL(env.SAGITTARIUS_ALERT_WEBHOOK_URL||'');return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}
}
export async function deliverOperationalAlert(payload,{env=process.env,fetchImpl=fetch}={}){
  if(!alertWebhookConfigured(env))return {delivered:false,reason:'external_alert_not_configured'};
  // No redirect forwarding, raw exception text, broker/account secrets or trade
  // payloads. Receivers should deduplicate by the stable scope/code/revision.
  const response=await fetchImpl(env.SAGITTARIUS_ALERT_WEBHOOK_URL,{
    method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),
    headers:{'content-type':'application/json'},body:JSON.stringify(payload),
  });
  await response.body?.cancel?.().catch(()=>{});
  if(!response.ok)throw new Error('alert_delivery_http_'+Number(response.status));
  return {delivered:true};
}

export class ProcessSentinel {
  constructor({timeoutMs=60_000,intervalMs=2000,workerFactory=(url,opts)=>new Worker(url,opts)}={}){
    this.shared=new BigInt64Array(new SharedArrayBuffer(48));
    Atomics.store(this.shared,0,ns());Atomics.store(this.shared,1,ns());
    this.timeoutMs=timeoutMs;this.stopped=false;this.lastFailure=null;
    this.worker=workerFactory(new URL('./operationalWatchdog.mjs',import.meta.url),{
      workerData:{hc2Sentinel:true,buffer:this.shared.buffer,timeoutMs,intervalMs},
      // No production dependency loader or unrelated process flags in sentinel.
      execArgv:[],resourceLimits:{maxOldGenerationSizeMb:32,maxYoungGenerationSizeMb:8},
    });
    this.worker.on('error',()=>{this.lastFailure='watchdog_worker_error';Atomics.store(this.shared,2,1n);});
    this.worker.on('exit',code=>{if(!this.stopped){this.lastFailure='watchdog_worker_exit_'+code;Atomics.store(this.shared,2,1n);}});
    this.worker.unref();
    this.timer=setInterval(()=>this.beat(),Math.min(1000,intervalMs));this.timer.unref();
  }
  beat(){if(!this.stopped)Atomics.store(this.shared,0,ns());}
  unsafe(){return !!this.lastFailure||Atomics.load(this.shared,2)!==0n||Number(ns()-Atomics.load(this.shared,1))/1e6>this.timeoutMs;}
  snapshot(){return{configured:true,healthy:!this.unsafe(),timeoutMs:this.timeoutMs,lastFailure:this.lastFailure,
    mainAgeMs:Number(ns()-Atomics.load(this.shared,0))/1e6,workerAgeMs:Number(ns()-Atomics.load(this.shared,1))/1e6,
    stallCount:Number(Atomics.load(this.shared,3)),externalAlertConfigured:alertWebhookConfigured()};}
  async stop(){if(this.stopped)return;this.stopped=true;clearInterval(this.timer);await this.worker.terminate();}
}

if(!isMainThread&&workerData?.hc2Sentinel){
  const shared=new BigInt64Array(workerData.buffer);let lastAlertAt=0,delivering=false,wasStalled=false;
  setInterval(()=>{
    const now=ns();Atomics.store(shared,1,now);
    const age=Number(now-Atomics.load(shared,0))/1e6;
    const stalled=age>workerData.timeoutMs;
    Atomics.store(shared,2,stalled?1n:0n);
    if(stalled&&!wasStalled){Atomics.add(shared,3,1n);console.error(JSON.stringify({event:'sag_operational_critical',code:'main_event_loop_stalled',ageMs:Math.round(age)}));}
    if(stalled&&!delivering&&performance.now()-lastAlertAt>30_000){
      lastAlertAt=performance.now();delivering=true;
      void deliverOperationalAlert({event:'sag_operational_critical',code:'main_event_loop_stalled',atMs:Date.now(),ageMs:Math.round(age)})
        .catch(()=>{}).finally(()=>{delivering=false;});
    }
    wasStalled=stalled;
  },workerData.intervalMs);
}
