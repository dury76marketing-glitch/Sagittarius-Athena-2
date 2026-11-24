// Read-only bounded evidence. This module cannot schedule, authorize or deny a trade.
const scopeKey=s=>JSON.stringify([s?.systemName||'',s?.ownerId||'',s?.mode||'',Number(s?.resetTimestampMs||0)]);
const text=(v,n=160)=>v==null?null:String(v).slice(0,n);
export const FUNNEL_LIMITS=Object.freeze({candidates:512,stages:48,recent:80,reasons:96});
export class TradingFunnel{
  constructor(){this.scope=null;this.scopeFastFields=null;this.records=new Map();this.recent=[];this.counts={};this.evicted=0;this.startedAtMs=Date.now();}
  useScope(settings){
    // R36 resource laboratory: avoid repeated JSON serialization of the same
    // primitive operator scope. Non-primitives keep the authoritative key path.
    const fast=[settings?.systemName||'',settings?.ownerId||'',settings?.mode||'',Number(settings?.resetTimestampMs||0)];
    if(this.scopeFastFields && fast.every((v,i)=>v===this.scopeFastFields[i] && v!==null && !['object','function'].includes(typeof v)))return;
    const key=scopeKey(settings);if(key===this.scope){this.scopeFastFields=fast;return;}
    this.scope=key;this.scopeFastFields=fast;
    this.scopeFields={systemName:settings?.systemName||null,ownerId:settings?.ownerId||null,
      mode:settings?.mode||null,resetEpoch:Number(settings?.resetTimestampMs||0)};
    this.records.clear();this.recent=[];this.counts={};this.evicted=0;this.startedAtMs=Date.now();}
  record(event,settings){
    this.useScope(settings);
    const id=text(event?.candidateId);if(!id)return null;
    const stage=text(event.stage||'unknown',64),status=text(event.status||'observed',24),reason=text(event.reason);
    const atMs=Number(event.atMs)||Date.now();
    let row=this.records.get(id);
    if(!row){row={candidateId:id,parentEntryId:text(event.parentEntryId),ticker:text(event.ticker),eventTicker:text(event.eventTicker||event.ticker),firstAtMs:atMs,stages:{},firstRefusal:null,firstWait:null};this.records.set(id,row);}
    if(row.last?.stage===stage&&row.last.status===status&&row.last.reason===reason)return row;
    row.parentEntryId=text(event.parentEntryId)||row.parentEntryId;
    const step={stage,status,reason,atMs};
    const refusal=['BLOCKED','REFUSED','DENIED','FAILED'].includes(String(status).toUpperCase());
    const waiting=String(status).toLowerCase()==='wait';
    if(refusal&&!row.firstRefusal)row.firstRefusal=step;
    if(waiting&&!row.firstWait)row.firstWait=step;
    if(!row.stages[stage]&&Object.keys(row.stages).length<FUNNEL_LIMITS.stages){
      row.stages[stage]=step;
      if(Object.hasOwn(this.counts,stage)||Object.keys(this.counts).length<FUNNEL_LIMITS.stages)
        this.counts[stage]=(this.counts[stage]||0)+1;
    }
    row.last=step;row.lastAtMs=atMs;
    this.records.delete(id);this.records.set(id,row);
    while(this.records.size>FUNNEL_LIMITS.candidates){this.records.delete(this.records.keys().next().value);this.evicted++;}
    this.recent.push({candidateId:id,parentEntryId:row.parentEntryId,ticker:row.ticker,eventTicker:row.eventTicker,...step});
    if(this.recent.length>FUNNEL_LIMITS.recent)this.recent.shift();
    return row;
  }
  snapshot(settings){
    this.useScope(settings);
    const firstRefusals={},firstWaits={};
    let earliestRetainedRefusal=null;
    for(const row of this.records.values()){
      if(row.firstRefusal&&(!earliestRetainedRefusal||row.firstRefusal.atMs<earliestRetainedRefusal.atMs))
        earliestRetainedRefusal={candidateId:row.candidateId,parentEntryId:row.parentEntryId,
          ticker:row.ticker,eventTicker:row.eventTicker,...row.firstRefusal};
      for(const [field,target] of [['firstRefusal',firstRefusals],['firstWait',firstWaits]]){
        if(!row[field])continue;const key=`${row[field].stage}:${row[field].reason}`;
        if(Object.hasOwn(target,key)||Object.keys(target).length<FUNNEL_LIMITS.reasons)target[key]=(target[key]||0)+1;
      }
    }
    return {version:'R28-LINKED-FUNNEL-1',scope:this.scopeFields,observedSinceMs:this.startedAtMs,
      retainedCandidates:this.records.size,evictedCandidates:this.evicted,byStage:{...this.counts},
      firstRefusals,firstWaits,earliestRetainedRefusal,records:[...this.records.values()].slice(-80),recent:[...this.recent],
      countingRule:'stage observations deduplicated by retained candidate identity; distinct clock events, markets, shadow candidates, watches and seats are different populations',
      limitations:['process_local_since_restart_or_scope_change','bounded_history_evictions_reported','not_native_database_totals','not_a_matched_sim_live_tape'],readOnly:true};
  }
}
