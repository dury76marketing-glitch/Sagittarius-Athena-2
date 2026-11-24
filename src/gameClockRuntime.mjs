// Sporting knowledge is durable; entry permission belongs to a fresh runtime
// observation. Provider work and persistence do not manufacture authority.
import {isEntryAuthorizedGameClockState,normalizeGameClockState,GAME_CLOCK_AUTHORITY,
  latestSameEventClockState,clockSourceObservationMs,expireGameClockAuthorization} from './gameClock.mjs';
export {latestSameEventClockState,clockSourceObservationMs,expireGameClockAuthorization};

export const CLOCK_RUNTIME_POLICY=Object.freeze({version:'GCR2-R38',maximumEvents:2048,
  maximumPendingEvents:2048,persistenceHeartbeatMs:30000,maximumQueueWaitMs:10000,
  reservedEntrySlots:2,entryBurst:3});
const scopeKey=s=>JSON.stringify([s?.systemName||'',s?.ownerId||'',s?.mode||'',Number(s?.resetTimestampMs||0)]);
const persistentReason=s=>s?.phase==='FINAL'?(s.terminalReason||s.reason)
  :s?.phase==='CONFLICT'?(s.conflictReason||s.reason):null;
const sportingStatus=s=>s?.sportingStatus||(['FINAL','CONFLICT'].includes(s?.phase)
  ?String(s.phase).toLowerCase():s?.pregameObservationAccepted&&s?.phase==='UNKNOWN'?'pregame':null);

export function durableGameClockState(raw,event=raw?.eventTicker||''){
  const state=normalizeGameClockState(raw,event);
  if(!state||state.eventTicker!==String(event))return null;
  return {...state,persistenceKind:'durable_clock_proof',entryAuthorized:false,
    evidenceObservedAtMs:null,authorizationReason:null,authorizationSource:null,
    sportingStatus:sportingStatus(state),sourceObservationAtMs:clockSourceObservationMs(state)};
}
export function restoreGameClockState(raw,event=raw?.eventTicker||''){
  // Project before returning even legacy rows whose JSON once stored true.
  // A database restart cannot revive an observation's entry permission.
  return durableGameClockState(raw,event);
}
export function clockAuthorityFingerprint(raw){
  const s=normalizeGameClockState(raw,raw?.eventTicker||'');
  if(!s)return 'null';
  return JSON.stringify([s.version,s.eventTicker,s.phase,s.confirmed,s.actualStartMs,
    s.actualStartConfidence,s.actualStartEvidenceSource,s.startTimeMs,s.milestoneId,
    s.source,s.occurrenceConflict,s.pregameObservationAccepted,
    s.pregameObservedAtMs,s.pregameMilestoneId,s.pregameProofObservedAtMs,
    s.boundedStartLowerMs,s.boundedStartUpperMs,s.boundedStartEvidenceSource,
    s.boundedProofObservedAtMs,s.scheduledStartMs,s.scheduleReferenceMilestoneId,
    sportingStatus(s),persistentReason(s)]);
}
export function clockStateNeedsPersistence(prior,next,now=Date.now(),persistedAtMs=0){
  if(!prior||clockAuthorityFingerprint(prior)!==clockAuthorityFingerprint(next))return true;
  const last=Number(persistedAtMs||prior.lastCheckedAtMs||prior.evidenceObservedAtMs||0);
  return now-last>=CLOCK_RUNTIME_POLICY.persistenceHeartbeatMs
    &&Number(next.lastCheckedAtMs||0)>Number(prior.lastCheckedAtMs||0);
}

const freshStats=()=>({resolutions:0,shared:0,writes:0,unchangedWritesSkipped:0,
  persistenceErrors:0,queueRejected:0,queueExpired:0,queueCanceled:0,
  maximumWaiting:0,maximumActive:0,entryStarted:0,scanStarted:0});
export class EventClockRuntime{
  constructor({now=()=>Date.now()}={}){
    this.now=now;this.scope=null;this.generation=0;this.states=new Map();
    this.persisted=new Map();this.pending=new Map();this.active=0;this.activeScans=0;
    this.waiters=[];this.entryBurst=0;this.stats=freshStats();
  }
  useScope(settings){
    const key=scopeKey(settings);if(this.scope===key)return;
    this.scope=key;this.generation++;this.states.clear();this.persisted.clear();
    // Running provider requests finish under their old generation; queued work
    // is canceled now so it cannot monopolize a new reset/mode/owner scope.
    for(const entry of [...this.waiters])this.cancelQueued(entry,'scope');
    this.pending.clear();this.entryBurst=0;this.stats=freshStats();
  }
  remember(map,key,value){map.delete(key);map.set(key,value);
    while(map.size>CLOCK_RUNTIME_POLICY.maximumEvents)map.delete(map.keys().next().value);return value;}
  current(event){return this.states.get(String(event))||null;}
  adopt(event,raw){
    const state=normalizeGameClockState(raw,event);if(!state||state.eventTicker!==String(event))return null;
    const selected=latestSameEventClockState(event,this.current(event),state);
    return this.remember(this.states,String(event),expireGameClockAuthorization(selected,event,this.now()));
  }
  cancelQueued(entry,reason){
    if(entry.started||entry.settled)return false;
    const at=this.waiters.indexOf(entry);if(at>=0)this.waiters.splice(at,1);
    entry.settled=true;clearTimeout(entry.timer);
    if(this.pending.get(entry.key)===entry)this.pending.delete(entry.key);
    if(reason==='expired')this.stats.queueExpired++;
    else if(reason==='scope')this.stats.queueCanceled++;
    else this.stats.queueRejected++;
    entry.finish(null);return true;
  }
  drain(){
    const limit=GAME_CLOCK_AUTHORITY.maxConcurrency;
    const scanLimit=Math.max(1,limit-CLOCK_RUNTIME_POLICY.reservedEntrySlots);
    while(this.active<limit&&this.waiters.length){
      const high=this.waiters.findIndex(e=>e.priority==='entry');
      const normal=this.activeScans<scanLimit?this.waiters.findIndex(e=>e.priority==='scan'):-1;
      let at=-1;
      if(high>=0&&(normal<0||this.entryBurst<CLOCK_RUNTIME_POLICY.entryBurst)){at=high;this.entryBurst++;}
      else if(normal>=0){at=normal;this.entryBurst=0;}
      else if(high>=0)at=high;
      if(at<0)return;
      const entry=this.waiters.splice(at,1)[0];clearTimeout(entry.timer);
      if(entry.generation!==this.generation){this.cancelQueued(entry,'scope');continue;}
      entry.started=true;this.active++;
      if(entry.priority==='scan')this.activeScans++;
      this.stats.maximumActive=Math.max(this.stats.maximumActive,this.active);
      this.stats[entry.priority==='entry'?'entryStarted':'scanStarted']++;
      Promise.resolve().then(async()=>{
        if(entry.generation!==this.generation)return null;
        this.stats.resolutions++;
        const state=await entry.work(this.current(entry.key));
        return entry.generation===this.generation?this.adopt(entry.key,state):null;
      }).then(entry.finish,entry.fail).finally(()=>{
        entry.settled=true;this.active--;
        if(entry.priority==='scan')this.activeScans--;
        if(this.pending.get(entry.key)===entry)this.pending.delete(entry.key);
        this.drain();
      });
    }
  }
  async resolve(event,{forceFresh=false,allowGameStats=true,priority=forceFresh?'entry':'scan'}={},work){
    const key=String(event),generation=this.generation,existing=this.pending.get(key);
    if(existing){
      this.stats.shared++;
      if(priority==='entry'&&!existing.started){existing.priority='entry';this.drain();}
      const state=await existing.promise;
      if(generation!==this.generation)return null;
      const stronger=(forceFresh&&!existing.forceFresh)||(allowGameStats&&!existing.allowGameStats);
      if(stronger&&!['FINAL','CONFLICT'].includes(state?.phase)
        &&!isEntryAuthorizedGameClockState(state,key,this.now())){
        // The earlier task's finally may run after this await. Remove only its
        // own completed promise before scheduling the stronger refresh.
        if(this.pending.get(key)===existing)this.pending.delete(key);
        return this.resolve(key,{forceFresh,allowGameStats,priority},work);
      }
      return expireGameClockAuthorization(this.current(key)||state,key,this.now());
    }
    if(typeof work!=='function'||!key)return null;
    if(this.pending.size>=CLOCK_RUNTIME_POLICY.maximumPendingEvents){
      const scan=priority==='entry'?this.waiters.find(e=>e.priority==='scan'):null;
      if(scan)this.cancelQueued(scan,'capacity');
      else{this.stats.queueRejected++;return null;}
    }
    const entry={key,generation,forceFresh,allowGameStats,priority:priority==='entry'?'entry':'scan',
      work,promise:null,started:false,settled:false,finish:null,fail:null,timer:null};
    entry.promise=new Promise((resolve,reject)=>{entry.finish=resolve;entry.fail=reject;});
    entry.timer=setTimeout(()=>this.cancelQueued(entry,'expired'),CLOCK_RUNTIME_POLICY.maximumQueueWaitMs);
    this.pending.set(key,entry);this.waiters.push(entry);
    this.stats.maximumWaiting=Math.max(this.stats.maximumWaiting,this.waiters.length);
    this.drain();return entry.promise;
  }
  async persist(event,state,prior,write,now=this.now(),expectedGeneration=this.generation){
    if(expectedGeneration!==this.generation)return {written:false,state:null};
    const key=String(event),live=normalizeGameClockState(state,key);
    if(!live||live.eventTicker!==key)return {written:false,state:null};
    if(typeof write!=='function')return {written:false,state:expireGameClockAuthorization(live,key,this.now())};
    const generation=expectedGeneration,record=this.persisted.get(key),previous=record?.state||prior;
    if(!clockStateNeedsPersistence(previous,live,now,record?.atMs)){
      this.stats.unchangedWritesSkipped++;
      const selected=clockSourceObservationMs(previous)>clockSourceObservationMs(live)
        ?restoreGameClockState(previous,key):live;
      return {written:false,state:expireGameClockAuthorization(selected,key,this.now())};
    }
    const projection=durableGameClockState(live,key);let result;
    try{result=await write(projection);}catch(error){if(generation===this.generation)this.stats.persistenceErrors++;throw error;}
    if(generation!==this.generation)return {written:false,state:null};
    const accepted=restoreGameClockState(result&&Object.hasOwn(result,'state')?result.state:projection,key);
    if(!accepted)return {written:false,state:null};
    const written=result?.written!==false;
    this.remember(this.persisted,key,{state:accepted,atMs:this.now()});
    if(written)this.stats.writes++;else this.stats.unchangedWritesSkipped++;
    // SQL returns durable knowledge with no permission. The successful write
    // (or same-proof skipped write) must not discard this request's fresh LIVE.
    const sameProof=clockAuthorityFingerprint(accepted)===clockAuthorityFingerprint(live);
    // Bounded CAS contention may return an older durable winner. Its receipt
    // cannot erase a newly observed FINAL/CONFLICT (or newer sporting proof).
    // Retain that knowledge locally without granting its transient permission.
    // The persisted cache above records only the actual DB winner, so a proof
    // mismatch remains due for retry on the next normal bounded resolution.
    const selected=sameProof&&clockSourceObservationMs(accepted)<=clockSourceObservationMs(live)
      ?live:restoreGameClockState(latestSameEventClockState(key,accepted,projection),key);
    return {written,state:expireGameClockAuthorization(selected,key,this.now())};
  }
  snapshot(){return {version:CLOCK_RUNTIME_POLICY.version,...this.stats,events:this.states.size,
    inFlight:this.pending.size,active:this.active,waiting:this.waiters.length,
    persistenceHeartbeatMs:CLOCK_RUNTIME_POLICY.persistenceHeartbeatMs,
    maximumPendingEvents:CLOCK_RUNTIME_POLICY.maximumPendingEvents,
    maximumQueueWaitMs:CLOCK_RUNTIME_POLICY.maximumQueueWaitMs,
    localEvidenceTimestampsAreAuthoritative:false};}
}
