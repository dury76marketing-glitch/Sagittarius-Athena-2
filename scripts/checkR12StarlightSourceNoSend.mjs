import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const root=path.resolve(process.argv[2]||'.');
const imp=async p=>import(pathToFileURL(path.join(root,p)).href);
const {Database}=await imp('src/db.mjs');
const {SagittariusEngine}=await imp('src/engine.mjs');
const {StrategyEngine}=await imp('src/strategy.mjs');
const {starlightNoSendRetryGeneration,starlightCapitalEntryId}=await imp('src/starlightCapital.mjs');
const {executionSettingsHash}=await imp('src/shadowProtocol.mjs');
const V='SC1-REAL-STARLIGHT-V1';
const W={status:'EXECUTING',mode:'LIVE',virtualGroupVersion:V,revision:19,authorizationId:'STARLIGHT:auth:001',parentEntryId:'SHADOW:parent001',systemName:'SGT-A',ownerId:'owner1',ticker:'KXTEST-YES',eventTicker:'KXTEST',resetEpoch:77,maximumSeats:2,groupSettingsHash:'HASH1',shadowProofHash:'PROOF1',claimAtMs:Date.now()-100,attempts:2,noSendRetryGeneration:0,consumePending:false};
const quote={ticker:W.ticker,eventTicker:W.eventTicker,quoteAtMs:Date.now()-100,yesBid:60,yesAsk:62,status:'active'};
const source=(stage='EXECUTION',attemptId='attempt:1')=>({version:'SC1-R12-SOURCE-PRE-INTENT',phase:'BEFORE_DURABLE_INTENT',intentBoundaryEntered:false,stage,attemptId});
const child=(p={})=>({id:'child:1',system_name:W.systemName,owner_id:W.ownerId,mode:'LIVE',ticker:W.ticker,event_ticker:W.eventTicker,execution_class:'CAPITAL',status:'rejected',close_reason:'live_entry_not_dispatched',count:1,remaining_count:0,entry_client_order_id:'sagc-test',entry_order_id:null,exit_order_id:null,exit_client_order_id:null,entry_fee_cents:0,exit_fee_cents:0,exit_filled_count:0,exit_notional_cents:0,archived:false,opened_at_ms:Date.now(),entry_config:{executionClass:'CAPITAL',dispatchProof:{version:'HC2-R1-DISPATCH',submitted:false,reason:'local_no_send'},starlightRecovery:{parentEntryId:W.parentEntryId,authorizationId:W.authorizationId,resetEpoch:W.resetEpoch,noSendRetryGeneration:0},starlightCapital:{version:V,resetTimestampMs:W.resetEpoch,noSendRetryGeneration:0,seat:1}},...p});
function harness({watch=W,children=[],casFail=false}={}){
 const state={status:'EXECUTING',revision:watch.revision,watch:structuredClone(watch)};
 const trace=[];let commits=0,rollbacks=0,clientConnects=0;
 const client={async query(sql,args=[]){trace.push({sql:String(sql),args});
    if(sql==='BEGIN'||String(sql).startsWith('set local'))return {rows:[]};
    if(sql==='COMMIT'){commits++;return {rows:[]}};
    if(sql==='ROLLBACK'){rollbacks++;return {rows:[]}};
    if(String(sql).includes('from sag_starlight_recovery_v1')&&String(sql).includes('for update'))return {rows:[structuredClone(state)]};
    if(String(sql).includes('from sag_entries')&&(String(sql).includes('for share')||String(sql).includes("status in ('open'"))) {
      if(String(sql).includes('for share'))return {rows:structuredClone(children)};
      return {rows:children.filter(c=>['open','entry_pending','exit_pending','pending_recovery'].includes(c.status)&&c.archived===false)};
    }
    if(String(sql).includes('update sag_starlight_recovery_v1')){
       if(casFail)return {rows:[]};
       const revision=Number(args[5]);if(revision!==Number(state.revision))return {rows:[]};
       state.revision++;state.watch=JSON.parse(args[6]);state.status=String(sql).includes("set status='WATCHING'")?'WATCHING':'EXECUTING';
       return {rows:[structuredClone(state)]};
    }
    throw Error('unexpected SQL '+String(sql).slice(0,140));
 },release(){}};
 const db=Object.create(Database.prototype);db.pool={async connect(){clientConnects++;return client}};
 return {db,state,trace,get commits(){return commits},get rollbacks(){return rollbacks},get connects(){return clientConnects}};
}
let passed=0;const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name)};
await check('source-proof-spread-trace-committed',async()=>{
 const h=harness();const p=await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread',source('EXECUTION','attempt:spread'));
 assert.equal(p?.kind,'PRE_DISPATCH_REFUSAL');assert.equal(p.proof.source?.version,'SC1-R12-SOURCE-PRE-INTENT');
 assert.equal(p.proof.source.phase,'BEFORE_DURABLE_INTENT');assert.equal(p.proof.source.intentBoundaryEntered,false);
 assert.equal(p.proof.reason,'spread');assert.equal(p.proof.claimRevision,W.revision);
 assert.equal(p.proof.committedRevision,W.revision+1);assert.equal(h.state.revision,W.revision+1);
 assert.equal(h.commits,1);
 const rearmed=await h.db.rearmStarlightAfterVerifiedUnsubmittedRejection({...W,revision:p.revision});
 assert.equal(rearmed?.status,'WATCHING');assert.equal(h.commits,2);
 assert.equal(starlightNoSendRetryGeneration(rearmed.watch),1);
 assert.deepEqual(rearmed.watch.rearmedNoSubmitProofIds,[p.proof.id]);
 assert.match(starlightCapitalEntryId({...rearmed.watch,stackIndex:1}),/^SE2R5-[a-f0-9]{32}$/);
});
await check('source-proof-live-readiness-restriction-does-not-bypass-gate',async()=>{
 const h=harness();const p=await h.db.recordStarlightPreDispatchRefusal(W,quote,'live_not_ready',source('MODE_AUTHORIZATION','attempt:live'));
 assert.equal(p?.kind,'PRE_DISPATCH_REFUSAL');assert.equal(p?.proof?.reason,'live_not_ready');
 const rearmed=await h.db.rearmStarlightAfterVerifiedUnsubmittedRejection({...W,revision:p.revision});
 assert.equal(rearmed?.status,'WATCHING'); // no BUY; future wake revalidates LIVE safety
});
await check('deny-proof-without-source-phase',async()=>{
 const h=harness();assert.equal(await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread'),null);
 assert.equal(h.connects,0);assert.equal(h.commits,0);
});
await check('deny-source-after-intent-boundary',async()=>{
 const h=harness();assert.equal(await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread',{...source(),intentBoundaryEntered:true}),null);
 assert.equal(h.commits,0);
});
await check('deny-ambiguous-or-submitted-child',async()=>{
 for(const entry of [child({status:'entry_pending'}),child({entry_order_id:'broker-order-id'}),child({entry_config:{...child().entry_config,dispatchProof:{version:'HC2-R1-DISPATCH',submitted:true,reason:'ambiguous'}}}),child({entry_client_order_id:null})]){
  const h=harness({children:[entry]});assert.equal(await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread',source()),null);assert.equal(h.commits,0);
 }
});
await check('deny-cross-clone-or-unknown-history',async()=>{
 for(const entry of [child({system_name:'other-clone'}),child({owner_id:'other-owner'}),child({archived:true}),child({close_reason:'broker_uncertain'})]){
  const h=harness({children:[entry]});assert.equal(await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread',source()),null);assert.equal(h.commits,0);
 }
});
await check('deny-settings-scope-conflict-and-CAS',async()=>{
 for(const watch of [{...W,groupSettingsHash:'changed'},{...W,eventTicker:'OTHER'},{...W,revision:W.revision+1},{...W,consumePending:true}]){
  const h=harness();assert.equal(await h.db.recordStarlightPreDispatchRefusal(watch,quote,'spread',source()),null);assert.equal(h.commits,0);
 }
 const h=harness({casFail:true});assert.equal(await h.db.recordStarlightPreDispatchRefusal(W,quote,'spread',source()),null);assert.equal(h.commits,0);assert.equal(h.rollbacks,1);
});
await check('legacy-stranded-reason-is-never-certified-retroactively',async()=>{
 const h=harness({watch:{...W,lastAttemptReason:'spread',lastAttemptAtMs:Date.now()}});
 assert.equal(await h.db.rearmStarlightAfterVerifiedUnsubmittedRejection(h.state.watch),null);
 assert.equal(h.state.status,'EXECUTING');assert.equal(h.commits,0);
});
await check('EXECUTING-resume-lane-reconciles-source-proof-without-health-bypass',async()=>{
 const settings={mode:'LIVE',crashRecoveryHunterEnabled:true};
 const w={...W,retryNotBeforeMs:0,lastAttemptReason:'spread',groupSettingsHash:executionSettingsHash(settings)};let verifiedCalls=0,brokerCalls=0;
 const e=Object.create(SagittariusEngine.prototype);e.settings=settings;e.starlightRecoveryWatches=new Map([[w.authorizationId,w]]);
 e.starlightRecoveryInFlight=new Set();e.starlightRecoveryQuoteJobs=new Map();e.starlightRecoveryRuntime=()=>({});
 e.starlightScopeMatches=()=>true;e.shadowEntryGate=()=>({allowed:true});e.claimStarlightRecoveryTicker=()=>()=>{};
 e.health={operational:{newEntriesAllowed:false}};e.strategy={createHunter:async()=>{brokerCalls++;throw Error('unexpected BUY')}};
 e.db={starlightWatch:async()=>({status:w.status,revision:w.revision,watch:w}),starlightCapitalSeats:async()=>[],
 rearmStarlightAfterVerifiedUnsubmittedRejection:async()=>{verifiedCalls++;return {status:'WATCHING',revision:w.revision+1,watch:{...w,status:'WATCHING',revision:w.revision+1}}}};
 await e.resumeStarlightShadowGroups({maximum:1,seatBudget:1});
 assert.equal(verifiedCalls,1,'R11 stranded no-send path under temporary LIVE readiness false');
 assert.equal(brokerCalls,0);assert.equal(e.starlightRecoveryWatches.get(w.authorizationId).status,'WATCHING');
});
await check('starlight-source-proof-wired-for-every-pre-intent-strategy-denial',async()=>{
 const code=fs.readFileSync(path.join(root,'src/strategy.mjs'),'utf8');
 const engine=fs.readFileSync(path.join(root,'src/engine.mjs'),'utf8');
 assert.match(code,/starlightIntentBoundaryEntered=true/);
 assert.match(code,/starlightPreIntentDenial && starlightRecoverySnapshot/);
 assert.match(code,/SC1-R12-SOURCE-PRE-INTENT/);
 assert.match(engine,/status:'EXECUTING',virtualGroupVersion:claimed\.virtualGroupVersion/);
 assert.ok(!engine.includes('recordPreDispatchRefusalAndRearm(watch,'),'runtime must not infer no-send from diagnostic string');
});
await check('actual-StrategyEngine-LIVE-disarmed-pre-intent-proof',async()=>{
 let records=[];
 const db={recordStarlightPreDispatchRefusal:async(w,q,reason,source)=>{
   records.push({w,q,reason,source});return {kind:'PRE_DISPATCH_REFUSAL',revision:w.revision+1,proof:{submitted:false}};
 },audit:async()=>{}};
 const s={mode:'LIVE',systemName:W.systemName,ownerId:W.ownerId,resetTimestampMs:W.resetEpoch,
   crashRecoveryHunterEnabled:true,starlightExtinctionRealTradeEnabled:true};
 const st=new StrategyEngine({db,kalshi:{},market:{},getSettings:()=>s,getLiveReady:()=>false});
 const result=await st.createHunter('Crash Recovery Hunter',quote,100,0,{
   sourceFeeder:'Athena Exclamation',sourceTradeId:W.parentEntryId,
   starlightRecovery:true,starlightRecoverySnapshot:structuredClone(W)});
 assert.equal(result,null);assert.equal(records.length,1);
 assert.equal(records[0].reason,'live_not_ready');
 assert.equal(records[0].source.phase,'BEFORE_DURABLE_INTENT');
 assert.equal(st.lastStarlightRefusalByAuth.get(W.authorizationId)?.kind,'PRE_DISPATCH_REFUSAL');
});
await check('connected-LINK-ON-terminal-quote-never-steals-EXECUTING-capital-revision',async()=>{
 let updates=0,linkSchedules=0;
 const e=Object.create(SagittariusEngine.prototype);
 e.settings={mode:'LIVE',crashRecoveryHunterLinkEnabled:true};
 e.starlightRecoveryWatches=new Map([[W.authorizationId,structuredClone(W)]]);
 e.starlightScopeMatches=()=>true;
 e.db={updateStarlightWatch:async()=>{updates++;throw Error('EXECUTING revision must remain reconciliation-owned')}};
 e.scheduleStarlightLink=()=>{linkSchedules++;return true};
 const output=await e.observeStarlightRecoveryQuote({...quote,result:'yes',status:'settled'}, {onlyId:W.authorizationId});
 assert.equal(output,false);assert.equal(updates,0);
 assert.equal(linkSchedules,0);assert.equal(e.starlightRecoveryWatches.get(W.authorizationId).status,'EXECUTING');
});
await check('early-LINK-parent-denial-records-typed-source-proof',async()=>{
 const records=[];
 const db={recordStarlightPreDispatchRefusal:async(w,q,reason,origin)=>{
   records.push({w,q,reason,origin});return {kind:'PRE_DISPATCH_REFUSAL',proof:{id:'proof:early',source:origin},revision:w.revision+1};
 },audit:async()=>{}};
 const s={mode:'LIVE',systemName:W.systemName,ownerId:W.ownerId,resetTimestampMs:W.resetEpoch,
   crashRecoveryHunterEnabled:true,starlightExtinctionRealTradeEnabled:true,crashRecoveryHunterLinkEnabled:true};
 const st=new StrategyEngine({db,kalshi:{},market:{},getSettings:()=>s,getLiveReady:()=>true});
 const output=await st.createHunter('Crash Recovery Hunter',quote,100,0,{
   sourceFeeder:'Athena Exclamation',sourceTradeId:W.parentEntryId,starlightRecovery:true,
   starlightRecoverySnapshot:{...W,link:true,stopPriceCents:-1}});
 assert.equal(output,null);assert.equal(records.length,1);
 assert.equal(records[0].reason,'stop_price_invalid');assert.equal(records[0].origin.stage,'LINK_PARENT_STOP');
 assert.equal(records[0].origin.intentBoundaryEntered,false);
});
await check('claim-settings-mismatch-keeps-EXECUTING-broker-owned-revision',async()=>{
 let updates=0,rearms=0;
 const settings={mode:'LIVE',crashRecoveryHunterEnabled:true};
 const w={...W,groupSettingsHash:'previous-approved-card-hash'};
 const engine=Object.create(SagittariusEngine.prototype);engine.settings=settings;
 engine.starlightRecoveryWatches=new Map([[w.authorizationId,w]]);
 engine.starlightRecoveryInFlight=new Set();engine.starlightRecoveryQuoteJobs=new Map();
 engine.starlightRecoveryStats={};engine.starlightRecoveryRuntime=()=>({});
 engine.starlightScopeMatches=()=>true;engine.shadowEntryGate=()=>({allowed:true});
 engine.claimStarlightRecoveryTicker=()=>()=>{};
 engine.db={starlightWatch:async()=>({status:'EXECUTING',watch:w,revision:w.revision}),
   updateStarlightWatch:async()=>{updates++;return {revision:w.revision+1}},
   rearmStarlightAfterVerifiedUnsubmittedRejection:async()=>{rearms++;throw Error('wrong-settings unauthorized rearm')}};
 const resumed=await engine.resumeStarlightShadowGroups({maximum:1,seatBudget:1});
 assert.equal(resumed,0);assert.equal(updates,0);assert.equal(rearms,0);
 assert.equal(engine.starlightRecoveryWatches.get(w.authorizationId).status,'EXECUTING');
 assert.equal(engine.starlightRecoveryStats.lastEvent.reason,'sc1_executing_settings_changed_require_broker_reconciliation');
});
console.log(JSON.stringify({test:'SC1_R12_SOURCE_PHASE_AND_CONNECTED_LIVENESS',source:root,passed,total:14,nativePostgres:false,realBrokerOrders:0}));
