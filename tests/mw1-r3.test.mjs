import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { shadowFixture,shadowWorkerFixture } from './helpers/r3-fixtures.mjs';
import { SHADOW_PROTOCOL,SHADOW_RUNTIME_LOCK,CAPITAL_SQL,shadowScope,sameShadowScope,
  validateShadowEntry,validateShadowObservation,consumeAskDepth,consumeBidDepth,
  shadowEntryHash,buildShadowCloseProof,shadowWatchFromProof } from '../src/shadowProtocol.mjs';
import { ShadowStore,SHADOW_SCHEMA_SQL } from '../src/shadowStore.mjs';
import { evaluateShadowWithOriginalGuard,verifyShadowEvaluationReceipt,ProfitGuard } from '../src/profitGuard.mjs';
import { StrategyEngine } from '../src/strategy.mjs';
import { Database } from '../src/db.mjs';
import { buildLedgerExportPackage } from '../src/server.mjs';
import { isShadowSaintEntry } from '../src/doctrine.mjs';

for(const mode of ['LIVE','SIMULATION'])test(`R3 frozen ${mode} shadow contract and own fee model validate`,()=>{
 const f=shadowFixture({mode});assert.equal(validateShadowEntry(f.entry),null);
 assert.equal(f.entry.entryConfig.shadowSaint.brokerOrderAuthority,false);
 assert.equal(f.entry.shadowEntryHash,shadowEntryHash(f.entry));
});
for(const [label,mutate] of [
 ['missing proof',e=>delete e.entryConfig.legacyQualification],
 ['tampered source',e=>e.entryConfig.legacyQualification={...e.entryConfig.legacyQualification,ticker:'OTHER'}],
 ['broker order',e=>e.entryOrderId='FAKE-REAL-ORDER'],
 ['classification mismatch',e=>e.executionClass='CAPITAL'],
 ['missing final confirmation',e=>delete e.entryConfig.finalEntryConfirmation],
 ['partial entry',e=>e.entryConfig.shadowSaint.entryExecution.book.noBids[0].count=1],
 ['stale entry quote',e=>e.entryConfig.shadowSaint.entryExecution.quote.quoteAtMs=1],
 ['future entry book',e=>e.entryConfig.shadowSaint.entryExecution.book.updatedAtMs=Date.now()+600000]
])test(`R3 admission rejects ${label}`,()=>{const f=shadowFixture();mutate(f.entry);assert.ok(validateShadowEntry(f.entry));});
for(const [label,mutate,reason] of [
 ['old quote / fresh book',o=>o.quote.quoteAtMs=1,'shadow_quote_stale_or_future'],
 ['fresh quote / old book',o=>o.book.updatedAtMs=1,'shadow_book_stale_or_future'],
 ['future quote',o=>o.quote.quoteAtMs=Date.now()+600000,'shadow_quote_stale_or_future'],
 ['future book',o=>o.book.updatedAtMs=Date.now()+600000,'shadow_book_stale_or_future'],
 ['different ticker',o=>o.quote.ticker='OTHER','shadow_quote_identity_mismatch'],
 ['different event',o=>o.quote.eventTicker='OTHER','shadow_quote_identity_mismatch'],
 ['different book',o=>o.book.ticker='OTHER','shadow_book_untrusted'],
 ['invalid book',o=>o.book.sequenceValid=false,'shadow_book_untrusted'],
 ['unknown lifecycle',o=>o.quote.status='unknown','shadow_market_not_active_or_finality_unknown'],
 ['crossed book',o=>o.quote.yesAsk=64,'shadow_crossed_or_incoherent_book'],
 ['partial quantity',o=>o.book.yesBids[0].count=1,'shadow_partial_executable_depth']
])test(`R3 stop evidence rejects ${label} independently`,()=>{const f=shadowFixture();mutate(f.observation);assert.equal(validateShadowObservation(f.entry,f.observation).reason,reason);});
test('R3 quote/book progress cannot move backward even across same-price updates',()=>{
 const f=shadowFixture();f.entry.shadowState={quoteAtMs:f.observation.quote.quoteAtMs+1};
 assert.equal(validateShadowObservation(f.entry,f.observation).reason,'shadow_quote_out_of_order');
 f.entry.shadowState={bookAtMs:f.observation.book.updatedAtMs+1};
 assert.equal(validateShadowObservation(f.entry,f.observation).reason,'shadow_book_out_of_order');
 f.entry.shadowState={quoteObservation:{epoch:'UNIT-STREAM',revision:Date.now()+100}};
 assert.equal(validateShadowObservation(f.entry,f.observation).reason,'shadow_quote_revision_regressed');
});
test('R3 full-depth VWAP uses every consumed level, not the desired stop threshold',()=>{
 const f=shadowFixture();f.observation.book.yesBids=[{priceCents:65,count:2},{priceCents:60,count:8}];
 const fill=consumeBidDepth(f.observation.book,10);assert.equal(fill.full,true);assert.equal(fill.avgCents,61);
 const proof=buildShadowCloseProof(f.entry,f.observation,{reason:'hard_stop_loss'});
 assert.equal(proof.exitPriceCents,61);assert.equal(proof.pnlCents,-230);assert.equal(proof.filled,10);
 const watch=shadowWatchFromProof(f.entry,proof,f.settings);assert.equal(watch.stopPriceCents,61);assert.equal(watch.shadowProtocol,SHADOW_PROTOCOL);
});
for(const mode of ['LIVE','SIMULATION'])test(`R3 original ${mode} virtual guard closes full Coffin stop without any real effect`,async()=>{
 const f=shadowFixture({mode});let writes=0;
 const evaluation=await evaluateShadowWithOriginalGuard(f.entry,f.observation,{settings:f.settings,
  learning:{onHardStop(){writes++;throw Error('virtual loss must not publish capital learning');}}});
 assert.equal(evaluation.closed,true);assert.equal(evaluation.decision.reason,'hard_stop_loss');
 assert.ok(evaluation.result.pnlCents<0);assert.equal(writes,0);
 assert.equal(verifyShadowEvaluationReceipt(evaluation,f.entry,f.observation),true);
 assert.equal(verifyShadowEvaluationReceipt(structuredClone(evaluation),f.entry,f.observation),false);
 evaluation.nextEntry.pnlCents=100;assert.equal(verifyShadowEvaluationReceipt(evaluation,f.entry,f.observation),false);
});
for(const result of ['yes','no'])test(`R3 authoritative ${result} settlement is virtual terminal, never a recovery stop`,async()=>{
 const f=shadowFixture();f.observation={quote:{...f.observation.quote,status:'settled',result},book:null};
 const v=await evaluateShadowWithOriginalGuard(f.entry,f.observation,{settings:f.settings});
 assert.equal(v.closed,true);assert.equal(v.nextEntry.closeReason,result==='yes'?'settlement_win':'settlement_loss');
 const p=buildShadowCloseProof(f.entry,f.observation,v.decision);assert.equal(p.authorization,null);
});
for(const method of ['liveExit','_liveExit','simulationExit','closeAtSettlement','reconcilePending',
 'reconcileExistingExitIntent','applyBrokerExitTruth','applyExitFill','_protect','emergencyExit','manualCashout'])
 test(`R3 defensive capital boundary ${method} rejects either shadow classification`,async()=>{
  for(const marker of ['top','json']){
   const f=shadowFixture({mode:'LIVE'});if(marker==='top')delete f.entry.entryConfig.executionClass;else delete f.entry.executionClass;
   const guard=Object.create(ProfitGuard.prototype);guard.audit=async()=>{};
   guard.kalshi=new Proxy({},{get(){throw Error('broker touched by shadow');}});
   const r=await guard[method](f.entry,{},{});assert.equal(r.reason,'shadow_saint_no_broker');
  }
 });
test('R3 100 virtual parents consume zero capital slots; a genuine Starlight consumes one',async()=>{
 const f=shadowFixture(),strategy=Object.create(StrategyEngine.prototype);strategy.getSettings=()=>f.settings;
 const rows=Array.from({length:100},(_,i)=>({...f.entry,id:`s-${i}`}));strategy.db={openEntries:async()=>rows};
 assert.deepEqual(await strategy.portfolioCapacityState(),{active:0,maximum:1,blocked:false});
 rows.push({...f.entry,id:'real',conceptName:'Crash Recovery Hunter',executionClass:'CAPITAL',entryConfig:{}});
 assert.deepEqual(await strategy.portfolioCapacityState(),{active:1,maximum:1,blocked:true});
});
test('R3 primary reporting retains separate Starlight, legacy account and hypothetical shadow totals',()=>{
 const row=(id,conceptName,pnlCents,executionClass='CAPITAL')=>({id,conceptName,executionClass,mode:'SIMULATION',
  ticker:'T',status:'closed',count:1,remainingCount:0,entryPriceCents:50,exitPriceCents:55,entryFeeCents:0,exitFeeCents:0,pnlCents,openedAtMs:1,closedAtMs:2,entryConfig:{executionClass}});
 const p=buildLedgerExportPackage({records:[row('star','Crash Recovery Hunter',10),row('old','Momentum Hunter',-20),row('shadow','Athena Exclamation',-500,'SHADOW_SAINT')],
  meta:{systemName:'S',exportId:'r3-unit',snapshotCutoffMs:3,expectedCount:3}});
 assert.equal(p.manifest.expectedTotals.realizedCents,10);assert.equal(p.manifest.accountTotals.realizedCents,-10);
 assert.equal(p.manifest.virtualTotals.realizedCents,-500);
 const summary=JSON.parse(p.files.find(x=>x.name==='diagnostic-summary.json').text);
 assert.equal(summary.virtualTotals.basis,'VIRTUAL_COUNTERFACTUAL_NOT_ACCOUNT_MONEY');
 assert.equal(summary.accountTotals.realizedCents,-10);
});
test('R3 actual reporting/cash queries segregate at SQL before LIMIT',async()=>{
 const calls=[],db=Object.create(Database.prototype);db.pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}};
 await db.simulationCashAggregate('S');await db.dashboardRecentClosedHunters('S',{limit:3});
 await db.performanceAggregate('S');await db.athenaEconomicEntries('S');
 for(const x of calls){assert.match(x.sql,/execution_class/);assert.match(x.sql,/entry_config->>'executionClass'/);assert.match(x.sql,/<>'SHADOW_SAINT'|<> 'SHADOW_SAINT'/);}
 assert.deepEqual(calls[1].args[1],['Crash Recovery Hunter']);assert.deepEqual(calls[2].args[1],['Crash Recovery Hunter']);
 assert.ok(calls[1].sql.indexOf('SHADOW_SAINT')<calls[1].sql.indexOf('limit'));
});

// Scripted query protocol tests below inspect production statements and control
// flow. They are NOT database isolation/concurrency certification.
function transactionFixture(f,{conflict=false,failProof=false,commitUnknown=false}={}){
 const statements=[],row=structuredClone(f.entry);let settings=structuredClone(f.settings);let released=null;
 const client={async query(sql,args=[]){
  statements.push({sql,args});
  if(sql.startsWith('select pg_try'))return {rows:[{locked:true}]};
  if(sql.includes("key='runtime' for update"))return {rows:[{value:settings}]};
  if(sql.includes("key='runtime_commit_revision'"))return {rows:[{value:{revision:1}}]};
  if(sql.startsWith('select * from sag_entries'))return {rows:conflict?[]:[row]};
  if(sql.startsWith('update sag_entries'))return {rows:[row],rowCount:1};
  if(sql.includes('insert into sag_shadow_stops_v3')){if(failProof)throw Error('injected persistence fault');return {rows:[],rowCount:1};}
  if(sql.includes('insert into sag_starlight_recovery_v1'))return {rows:[{revision:1}],rowCount:1};
  if(sql==='COMMIT'&&commitUnknown)throw Error('commit response lost');
  return {rows:[],rowCount:0};
 },release(error){released=error||true;}};
 const db={pool:{connect:async()=>client}},store=new ShadowStore(db,r=>r);
 return {store,statements,client,row,setSettings:s=>settings=s,get released(){return released;}};
}
test('R3 fake guard JSON is rejected before database acquisition',async()=>{
 const f=shadowFixture();const store=new ShadowStore({pool:{connect(){throw Error('DB must not be touched');}}},r=>r);
 await assert.rejects(store.commit(f.entry,f.observation,{closed:true},f.scope),/untrusted_guard/);
});
test('R3 close uses scoped revision lock and persists stop/outbox/watch in one transaction',async()=>{
 const f=shadowFixture();const evaluation=await evaluateShadowWithOriginalGuard(f.entry,f.observation,{settings:f.settings});
 const t=transactionFixture(f);const r=await t.store.commit(f.entry,f.observation,evaluation,f.scope);
 assert.equal(r.closed,true);assert.equal(r.watch.parentEntryId,f.entry.id);
 const statements=t.statements.map(x=>x.sql);assert.equal(statements[0],'BEGIN');assert.equal(statements.at(-1),'COMMIT');
 const selected=statements.find(x=>x.startsWith('select * from sag_entries'));
 for(const part of ['system_name=$1','owner_id=$2','mode=$3','shadow_epoch=$4','shadow_revision=$6',"status='open'",'for update'])assert.ok(selected.includes(part),part);
 const close=statements.findIndex(x=>x.startsWith('update sag_entries'));
 const stop=statements.findIndex(x=>x.includes('insert into sag_shadow_stops_v3'));
 const watch=statements.findIndex(x=>x.includes('insert into sag_starlight_recovery_v1'));
 assert.ok(close<stop&&stop<watch&&watch<statements.length-1);assert.equal(t.released,true);
});
for(const failure of ['revision','persistence','scope','operator-switch','commit-unknown'])test(`R3 transactional ${failure} fails closed without manufactured handoff`,async()=>{
 const f=shadowFixture();const v=await evaluateShadowWithOriginalGuard(f.entry,f.observation,{settings:f.settings});
 const t=transactionFixture(f,{conflict:failure==='revision',failProof:failure==='persistence',commitUnknown:failure==='commit-unknown'});
 if(failure==='scope')t.setSettings({...f.settings,mode:'LIVE'});
 if(failure==='revision'){const r=await t.store.commit(f.entry,f.observation,v,f.scope);assert.equal(r.ok,false);assert.equal(r.reason,'shadow_revision_conflict');}
 else await assert.rejects(t.store.commit(f.entry,f.observation,v,f.scope,{isCurrent:()=>failure!=='operator-switch'}));
 if(failure!=='revision')assert.equal(t.statements.at(-1).sql,'ROLLBACK');
 if(['revision','scope','operator-switch'].includes(failure))assert.equal(t.statements.some(x=>x.sql.includes('insert into sag_shadow_stops')),false);
});
test('R3 database schema guards immutable classification, parent proof and terminal watch authority',()=>{
 for(const token of ['execution classification is immutable','shadow entry identity and frozen authorization are immutable',
  'shadow close economics are immutable','shadow stop proof is immutable','terminal shadow recovery may not replay',
  'sag_shadow_open_work_v3','sag_shadow_pending_handoff_v3'])assert.ok(SHADOW_SCHEMA_SQL.includes(token));
});
test('R3 1000 shadow rows are processed fairly in bounded pages under 10000 wakeups',async()=>{
 const f=shadowFixture(),w=shadowWorkerFixture(f);f.observation.quote.quoteAtMs=1;
 const rows=Array.from({length:1000},(_,i)=>({...f.entry,id:`row-${String(i).padStart(4,'0')}`,last:0}));let pageCalls=0,tick=0,maxPage=0;
 w.engine.db.openShadowEntriesPage=async(_scope,{limit})=>{pageCalls++;maxPage=Math.max(maxPage,limit);return rows.sort((a,b)=>a.last-b.last||a.id.localeCompare(b.id)).slice(0,limit);};
 w.engine.db.recordShadowWait=async(e)=>{e.last=++tick;return {ok:true};};
 for(let i=0;i<32;i++)await w.engine.sweepShadowSaints();assert.ok(rows.every(x=>x.last>0));assert.equal(maxPage,32);
 const before=pageCalls;await Promise.all(Array.from({length:10000},()=>w.engine.sweepShadowSaints()));
 assert.equal(pageCalls,before+1,'coalesce simultaneous wakeups to one database page');assert.equal(w.commits.length,0);
});
test('R3 a single row fault cannot be silently reported healthy',async()=>{
 const f=shadowFixture(),w=shadowWorkerFixture(f);w.engine.db.captureShadowScope=async()=>{throw Error('offline');};
 const r=await w.engine.sweepShadowSaints();assert.equal(r.degraded,true);assert.match(r.lastError,/offline/);assert.equal(w.commits.length,0);
});
test('R3 only actual market quotes reach Starlight entry, never parent-price substitution',async()=>{
 const source=await readFile(new URL('../src/strategy.mjs',import.meta.url),'utf8');
 assert.equal(source.includes('q={...q,yesBid:stop,yesAsk:stop'),false);
 assert.ok(source.includes('starlight_final_quote_not_executable'));
});

test('R3 readiness distinguishes schema, failed/stale/cross-epoch worker and genuine protection',async()=>{
 const {SagittariusEngine}=await import('../src/engine.mjs');
 const f=shadowFixture(),now=Date.now();
 const engine={settings:f.settings,db:{shadowArchitectureRequired:true,shadowSchemaReady:true},
   health:{restOk:true,reconciliationOk:true,websocketOk:true,lastWsMessageMs:now,lastProtectionMs:now},
   lastFullScanMs:now,profitGuard:{protectionOk:true},lastError:null,
   shadowSaintStats:{lastSuccessAtMs:now,lastSuccessScope:shadowScope(f.settings),degraded:false}};
 const recalc=()=>SagittariusEngine.prototype.recomputeHealth.call(engine);
 recalc();assert.equal(engine.health.degraded,false);
 engine.shadowSaintStats.degraded=true;recalc();assert.equal(engine.health.shadowWorkerOk,false);assert.equal(engine.health.degraded,true);
 engine.shadowSaintStats.degraded=false;engine.shadowSaintStats.lastSuccessAtMs=now-61_000;
 recalc();assert.equal(engine.health.shadowWorkerFresh,false);assert.equal(engine.health.degraded,true);
 engine.shadowSaintStats.lastSuccessAtMs=now;engine.shadowSaintStats.lastSuccessScope.resetEpoch++;
 recalc();assert.equal(engine.health.shadowWorkerFresh,false);assert.equal(engine.health.degraded,true);
 engine.shadowSaintStats.lastSuccessScope=shadowScope(f.settings);engine.db.shadowSchemaReady=false;
 recalc();assert.equal(engine.health.shadowSchemaReady,false);assert.equal(engine.health.degraded,true);
 engine.db.shadowSchemaReady=true;recalc();assert.equal(engine.health.degraded,false);
 assert.equal(engine.health.protectionOk,true,'shadow readiness never disables existing capital exit protection');
});

test('R3 read-only complete shadow evidence remains owner/system/mode scoped and does not write',async()=>{
 const f=shadowFixture();const calls=[];
 const store=new ShadowStore({pool:{query:async(sql,params)=>{calls.push({sql,params});return {rows:[{...f.entry,entry_config:f.entry.entryConfig}]};}}},raw=>raw);
 const record=await store.proofDiagnostic(f.entry.id,f.scope);
 assert.equal(record.classification,'VIRTUAL_COUNTERFACTUAL_AUDIT_ONLY');assert.equal(record.stopProof,null);
 assert.equal(record.verifiedProtocol,true);assert.equal(calls.length,1);
 assert.match(calls[0].sql,/e\.system_name=\$1 and e\.owner_id=\$2 and e\.mode=\$3/);
 assert.deepEqual(calls[0].params,[f.scope.systemName,f.scope.ownerId,f.scope.mode,f.entry.id]);
 assert.doesNotMatch(calls[0].sql,/\b(update|insert|delete)\b/i);
});

test('R3 legacy/other-mode risk query never hides genuine LIVE exposure behind current SIM filtering',async()=>{
 const calls=[];const db=Object.create(Database.prototype);
 db.pool={query:async(sql,params)=>{calls.push({sql,params});return {rows:[]};}};
 await db.legacyRealOpenEntries('S',{ownerId:'O',mode:'SIMULATION'});
 assert.match(calls[0].sql,/mode is distinct from \$4/);
 assert.match(calls[0].sql,/concept_name<>'Crash Recovery Hunter'/);
 assert.match(calls[0].sql,/owner_id=\$2/);assert.match(calls[0].sql,/SHADOW_SAINT/);
 assert.equal(calls[0].params[3],'SIMULATION');
 await assert.rejects(db.legacyRealOpenEntries('S',{}),/scope_required/);
});
