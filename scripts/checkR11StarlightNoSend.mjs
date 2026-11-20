import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]||'.');
const {Database}=await import(pathToFileURL(path.join(root,'src/db.mjs')));
const {starlightNoSendRetryGeneration,starlightCapitalEntryId,STARLIGHT_CAPITAL_SQL}=await import(pathToFileURL(path.join(root,'src/starlightCapital.mjs')));
const BASE={mode:'LIVE',status:'EXECUTING',virtualGroupVersion:'SC1-REAL-STARLIGHT-V1',revision:7,
 authorizationId:'auth:A',parentEntryId:'parent:P',systemName:'SGT-A',ownerId:'owner-A',
 resetEpoch:123,groupSettingsHash:'H',shadowProofHash:'X',maximumSeats:2,ticker:'T',eventTicker:'E',noSendRetryGeneration:0};
function harness(options={}){
 const queries=[];let stored=null,commits=0,rollbacks=0;
 const w=structuredClone(options.watch||BASE);
 const children=structuredClone(options.children||[]);
 const client={async query(sql,params=[]){queries.push({sql:String(sql),params});
   if(sql==='BEGIN'||String(sql).startsWith('set local'))return {rows:[]};
   if(sql==='COMMIT'){commits++;return {rows:[]}};
   if(sql==='ROLLBACK'){rollbacks++;return {rows:[]}};
   if(String(sql).includes('from sag_starlight_recovery_v1')&&String(sql).includes('for update'))
     return {rows:[{status:'EXECUTING',revision:w.revision,watch:structuredClone(w)}]};
   if(String(sql).includes('from sag_entries')&&String(sql).includes('for share'))return {rows:children};
   if(String(sql).includes('update sag_starlight_recovery_v1')){
      if(options.casFailure)return {rows:[]};
      stored=JSON.parse(params[6]);return {rows:[{revision:w.revision+1,status:'WATCHING',watch:stored}]};
   }
   throw Error(`unrecognized simulated SQL: ${String(sql).slice(0,140)}`);
 },release(){}};
 const db=Object.create(Database.prototype);db.pool={async connect(){return client}};
 return {db,w,queries, get stored(){return stored},get commits(){return commits},get rollbacks(){return rollbacks}};
}
function validRejectedChild(){return {id:'child:1',system_name:BASE.systemName,owner_id:BASE.ownerId,mode:'LIVE',
 ticker:BASE.ticker,event_ticker:BASE.eventTicker,execution_class:'CAPITAL',status:'rejected',
 close_reason:'live_entry_not_dispatched',archived:false,entry_order_id:null,exit_order_id:null,
 exit_client_order_id:null,entry_client_order_id:'sagc-test-id',entry_fee_cents:0,exit_fee_cents:0,
 exit_filled_count:0,exit_notional_cents:0,count:1,remaining_count:0,opened_at_ms:100000,
 entry_config:{executionClass:'CAPITAL',dispatchProof:{version:'HC2-R1-DISPATCH',submitted:false,reason:'local_no_send'},
 starlightRecovery:{parentEntryId:BASE.parentEntryId,authorizationId:BASE.authorizationId,resetEpoch:BASE.resetEpoch,
 noSendRetryGeneration:0},starlightCapital:{version:BASE.virtualGroupVersion,resetTimestampMs:BASE.resetEpoch,
 seat:1,noSendRetryGeneration:0}}};}
let passed=0;
const check=async(name,fn)=>{await fn();passed++;console.log(`PASS ${name}`)};
await check('original-generation-zero-ID-unchanged',async()=>{
 assert.equal(starlightNoSendRetryGeneration(BASE),0);
 assert.match(starlightCapitalEntryId({...BASE,stackIndex:1}),/^SE2R5-[0-9a-f]{32}$/);
});
await check('original-source-fault-expected-valid-pre-dispatch-rearm',async()=>{
 const h=harness();const result=await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask');
 assert.equal(result?.status,'WATCHING');assert.equal(h.commits,1);assert.equal(h.rollbacks,0);
 assert.equal(h.stored.noSendRetryGeneration,1);
 assert.ok(h.stored.rearmedNoSubmitAtMs>0);
 assert.equal(h.stored.preDispatchRefusals.length,1);
 const proof=h.stored.preDispatchRefusals[0];
 assert.equal(proof.submitted,false);
 assert.deepEqual(h.stored.rearmedNoSubmitProofIds,[proof.id],
   'BUG: rearm increments retry generation WITHOUT durable referenced proof IDs');
 assert.equal(proof.committedRevision,h.w.revision+1,
   'BUG: durable proof revision should reference committed watch revision');
 assert.equal(starlightNoSendRetryGeneration(h.stored),1,
   'BUG: next-generation retry is rejected by production validator');
 assert.match(starlightCapitalEntryId({...h.stored,stackIndex:1}),/^SE2R5-[0-9a-f]{32}$/);
 assert.match(STARLIGHT_CAPITAL_SQL,/rearmedNoSubmitProofIds/);
});
await check('deny-untrusted-reason',async()=>{
 const h=harness();assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'broker_ambiguous_send'),null);
 assert.equal(h.commits,0);assert.equal(h.stored,null);
});
await check('deny-possibly-broker-submitted-child',async()=>{
 const h=harness({children:[{...validRejectedChild(),entry_config:{...validRejectedChild().entry_config,dispatchProof:{version:'HC2-R1-DISPATCH',submitted:true,reason:'ambiguous'}}}]});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);
});
await check('deny-unproven-rejected-child',async()=>{
 const child=validRejectedChild();delete child.entry_config.dispatchProof;
 const h=harness({children:[child]});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);
});
await check('deny-cross-clone-rejected-child',async()=>{
 const h=harness({children:[{...validRejectedChild(),system_name:'OTHER_CLONE'}]});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);
});
await check('allow-verified-local-rejected-child-and-prove-lineage',async()=>{
 const h=harness({children:[validRejectedChild()]});
 const result=await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask');
 assert.equal(result?.status,'WATCHING');assert.equal(h.commits,1);
 assert.deepEqual(h.stored.rearmedNoSubmitChildIds,['child:1']);
 assert.equal(starlightNoSendRetryGeneration(h.stored),1);
});
await check('deny-invalid-prior-proof-state',async()=>{
 const w={...BASE,noSendRetryGeneration:1};const h=harness({watch:w});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);
});
await check('deny-exhausted-generation',async()=>{
 const w={...BASE,noSendRetryGeneration:64,rearmedNoSubmitAtMs:99,rearmedNoSubmitProofIds:['proof:previous']};const h=harness({watch:w});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);
});
await check('rollback-on-cas-conflict',async()=>{
 const h=harness({casFailure:true});
 assert.equal(await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask'),null);
 assert.equal(h.commits,0);assert.equal(h.rollbacks,1);
});
await check('reject-wrong-SIM-scope',async()=>{
 const h=harness();const result=await h.db.recordPreDispatchRefusalAndRearm(h.w,'no_executable_ask');
 assert.ok(result);assert.equal(starlightNoSendRetryGeneration({...h.stored,mode:'SIMULATION'}),null);
});
console.log(JSON.stringify({test:'SC1_R11_ORIGINAL_AND_CANDIDATE',root,passed,total:11}));
