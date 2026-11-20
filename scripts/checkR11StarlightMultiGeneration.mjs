import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
const {Database}=await import(pathToFileURL(path.join(root,'src/db.mjs')));
const {starlightNoSendRetryGeneration,starlightCapitalEntryId}=await import(pathToFileURL(path.join(root,'src/starlightCapital.mjs')));
const v='SC1-REAL-STARLIGHT-V1';
const w={mode:'LIVE',status:'EXECUTING',virtualGroupVersion:v,revision:9,
 authorizationId:'auth:A',parentEntryId:'parent:P',systemName:'SGT-A',ownerId:'owner-A',
 resetEpoch:123,groupSettingsHash:'H',shadowProofHash:'X',maximumSeats:2,ticker:'T',eventTicker:'E',
 noSendRetryGeneration:1,claimAtMs:1_000_000,rearmedNoSubmitChildIds:['old-child'],
 rearmedNoSubmitProofIds:['old-proof'],rearmedNoSubmitAtMs:900_000};
const child=(id,generation,openedAt)=>({id,system_name:w.systemName,owner_id:w.ownerId,mode:'LIVE',
 ticker:w.ticker,event_ticker:w.eventTicker,execution_class:'CAPITAL',status:'rejected',
 close_reason:'live_entry_not_dispatched',archived:false,entry_order_id:null,exit_order_id:null,
 exit_client_order_id:null,entry_client_order_id:'sagc-'+id,entry_fee_cents:0,exit_fee_cents:0,
 exit_filled_count:0,exit_notional_cents:0,count:1,remaining_count:0,opened_at_ms:openedAt,
 entry_config:{executionClass:'CAPITAL',dispatchProof:{version:'HC2-R1-DISPATCH',submitted:false,reason:'local_no_send'},
 starlightRecovery:{parentEntryId:w.parentEntryId,authorizationId:w.authorizationId,resetEpoch:w.resetEpoch,
 noSendRetryGeneration:generation},starlightCapital:{version:v,resetTimestampMs:w.resetEpoch,
 seat:1,noSendRetryGeneration:generation}}});
async function attempt(method,children,watch=w){let committed=false,rolled=false,result=null;
 const cl={async query(sql,args=[]){if(sql==='BEGIN'||String(sql).startsWith('set local'))return {rows:[]};
 if(sql==='COMMIT'){committed=true;return {rows:[]}};
 if(sql==='ROLLBACK'){rolled=true;return {rows:[]}};
 if(String(sql).includes('from sag_starlight_recovery_v1')&&String(sql).includes('for update'))return {rows:[{status:'EXECUTING',revision:watch.revision,watch}]};
 if(String(sql).includes('from sag_entries')&&String(sql).includes('for share'))return {rows:children};
 if(String(sql).includes('update sag_starlight_recovery_v1')){result=JSON.parse(args[6]);return {rows:[{status:'WATCHING',revision:watch.revision+1,watch:result}]};}
 throw Error('unknown SQL '+String(sql).slice(0,180));},release(){}};
 const db=Object.create(Database.prototype);db.pool={async connect(){return cl}};
 const updated=method==='pre'?await db.recordPreDispatchRefusalAndRearm(watch,'no_executable_ask'):
 await db.rearmStarlightAfterVerifiedUnsubmittedRejection(watch);
 return {updated,committed,rolled,result};}
const old=child('old-child',0,950_000),current=child('current-child',1,1_001_000);
const a=await attempt('verified',[old,current]);
assert.equal(a.updated?.status,'WATCHING','CONNECTED BUG: verified rearm rejects previously authorized historic no-send child');
assert.equal(a.committed,true);
assert.deepEqual(a.result.rearmedNoSubmitChildIds,['old-child','current-child']);
assert.equal(starlightNoSendRetryGeneration(a.result),2);
const b=await attempt('pre',[old]);
assert.equal(b.updated?.status,'WATCHING','CONNECTED BUG: pre-dispatch refusal fails to distinguish historical proven no-send child from current claim');
assert.equal(starlightNoSendRetryGeneration(b.result),2);
const c=await attempt('pre',[{...old,id:'unlinked-historical-child'}]);
assert.equal(c.updated,null,'unknown older-generation rejected child must remain blocked');
const d=await attempt('pre',[old,{...current,entry_config:{...current.entry_config,dispatchProof:{submitted:true,version:'HC2-R1-DISPATCH',reason:'bad'}}}]);
assert.equal(d.updated,null,'potentially submitted current child must remain blocked');
console.log(JSON.stringify({test:'SC1_MULTI_GENERATION_CONNECTED_REARM',root,verifiedRearm:true,preDispatchRearm:true,negativeControls:2}));
