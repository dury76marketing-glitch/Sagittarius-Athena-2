// R28: event evidence is shared; scheduling/persistence never grant authority.
import {isEntryAuthorizedGameClockState,normalizeGameClockState,GAME_CLOCK_AUTHORITY} from './gameClock.mjs';

export const CLOCK_RUNTIME_POLICY=Object.freeze({version:'GCR1',maximumEvents:2048,persistenceHeartbeatMs:30000});
const scopeKey=s=>JSON.stringify([s?.systemName||'',s?.ownerId||'',s?.mode||'',Number(s?.resetTimestampMs||0)]);
export function latestSameEventClockState(event,...values){
  let selected=null;
  for(const raw of values){
    const state=normalizeGameClockState(raw,event);
    if(!state||state.eventTicker!==String(event))continue;
    if(selected?.phase==='FINAL'&&state.phase!=='FINAL')continue;
    if(selected&&!(state.phase==='FINAL'&&selected.phase!=='FINAL')
      &&Number(selected.lastCheckedAtMs||0)>Number(state.lastCheckedAtMs||0))continue;
    selected=state;
  }
  return selected;
}
export function clockAuthorityFingerprint(s){
  return JSON.stringify([s?.version,s?.eventTicker,s?.phase,s?.confirmed,s?.actualStartMs,
    s?.actualStartConfidence,s?.actualStartEvidenceSource,s?.startTimeMs,s?.milestoneId,
    s?.source,s?.liveStatus,s?.liveDataDelayed,s?.entryAuthorized,s?.occurrenceConflict,
    s?.pregameObservedAtMs,s?.pregameMilestoneId,s?.boundedStartLowerMs,
    s?.boundedStartUpperMs,s?.boundedStartEvidenceSource,s?.scheduledStartMs,s?.scheduleReferenceMilestoneId,
    s?.authorizationSource,s?.reason]);
}
export function clockStateNeedsPersistence(prior,next,now=Date.now(),persistedAtMs=0){
  if(!prior||clockAuthorityFingerprint(prior)!==clockAuthorityFingerprint(next))return true;
  const last=Number(persistedAtMs||prior.lastCheckedAtMs||prior.evidenceObservedAtMs||0);
  return now-last>=CLOCK_RUNTIME_POLICY.persistenceHeartbeatMs
    &&Number(next.lastCheckedAtMs||0)>Number(prior.lastCheckedAtMs||0);
}

export class EventClockRuntime{
  constructor(){this.scope=null;this.generation=0;this.states=new Map();this.persisted=new Map();this.pending=new Map();this.active=0;this.waiters=[];this.stats={resolutions:0,shared:0,writes:0,unchangedWritesSkipped:0,persistenceErrors:0};}
  useScope(settings){const key=scopeKey(settings);if(this.scope===key)return;this.scope=key;this.generation++;this.states.clear();this.persisted.clear();this.pending.clear();this.stats={resolutions:0,shared:0,writes:0,unchangedWritesSkipped:0,persistenceErrors:0};}
  remember(map,key,value){map.delete(key);map.set(key,value);while(map.size>CLOCK_RUNTIME_POLICY.maximumEvents)map.delete(map.keys().next().value);return value;}
  current(event){return this.states.get(String(event))||null;}
  adopt(event,raw){
    const state=normalizeGameClockState(raw,event);if(!state||state.eventTicker!==String(event))return null;
    // FINAL dominates a newer nonterminal snapshot as well as older results.
    return this.remember(this.states,String(event),latestSameEventClockState(event,this.current(event),state));
  }
  async resolve(event,{forceFresh=false,allowGameStats=true}={},work){
    const key=String(event),generation=this.generation,existing=this.pending.get(key);
    if(existing){
      this.stats.shared++;
      const state=await existing.promise;
      if(generation!==this.generation)return null;
      const stronger=(forceFresh&&!existing.forceFresh)||(allowGameStats&&!existing.allowGameStats);
      if(stronger&&!['FINAL','CONFLICT'].includes(state?.phase)
        &&!isEntryAuthorizedGameClockState(state,key,Date.now()))
        return this.resolve(key,{forceFresh,allowGameStats},work);
      return this.current(key)||state;
    }
    const entry={forceFresh,allowGameStats,promise:null};
    entry.promise=Promise.resolve().then(async()=>{
      // Bound all scan/execution provider work together, without dropping any
      // waiting market. Sibling requests wait on the same promise above.
      if(this.active>=GAME_CLOCK_AUTHORITY.maxConcurrency)await new Promise(r=>this.waiters.push(r));
      else this.active++;
      try{
        if(generation!==this.generation)return null;
        this.stats.resolutions++;
        const state=await work(this.current(key));
        return generation===this.generation?this.adopt(key,state):null;
      }finally{
        const waiter=this.waiters.shift();if(waiter)waiter();else this.active--;
        if(this.pending.get(key)===entry)this.pending.delete(key);
      }
    });
    this.pending.set(key,entry);
    return entry.promise;
  }
  async persist(event,state,prior,write,now=Date.now(),expectedGeneration=this.generation){
    if(expectedGeneration!==this.generation)return {written:false,state:null};
    if(!state||typeof write!=='function')return {written:false,state};
    const generation=expectedGeneration,key=String(event),record=this.persisted.get(key);
    const previous=record?.state||prior;
    if(!clockStateNeedsPersistence(previous,state,now,record?.atMs)){
      this.stats.unchangedWritesSkipped++;return {written:false,state};
    }
    let result;
    try{result=await write(state);}catch(error){if(generation===this.generation)this.stats.persistenceErrors++;throw error;}
    if(generation!==this.generation)return {written:false,state:null};
    const accepted=result&&Object.hasOwn(result,'state')?normalizeGameClockState(result.state,key):state;
    if(!accepted||accepted.eventTicker!==key)return {written:false,state:null};
    const written=result?.written!==false;
    this.remember(this.persisted,key,{state:accepted,atMs:now});
    if(written)this.stats.writes++;else this.stats.unchangedWritesSkipped++;
    return {written,state:accepted};
  }
  snapshot(){return {version:CLOCK_RUNTIME_POLICY.version,...this.stats,events:this.states.size,inFlight:this.pending.size,active:this.active,waiting:this.waiters.length,persistenceHeartbeatMs:CLOCK_RUNTIME_POLICY.persistenceHeartbeatMs,localEvidenceTimestampsAreAuthoritative:false};}
}
