#!/usr/bin/env node
/** CW1 five-wave follow-up: real dispatch callbacks and active DB read contract.
 * Isolated, deterministic, no PostgreSQL or broker connection. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../src/db.mjs';
import {ProfitGuard} from '../src/profitGuard.mjs';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

function trade(conceptName,{id=conceptName,price=91,pnl=-62,count=2,remaining=count,fee=0}={}){
 return {id,conceptName,mode:'SIMULATION',systemName:'TEST',ownerId:'OWNER',ticker:'KX-CW-RECOVERY',
  eventTicker:'KX-CW-RECOVERY',status:'open',entryPriceCents:price,count,
  remainingCount:remaining,pnlCents:0,exitFilledCount:0,exitNotionalCents:0,
  entryFeeCents:fee,exitFeeCents:0,entryConfig:{executionClass:'CAPITAL'},
  updatedAtMs:Date.now(),openedAtMs:Date.now()-30000};
}
function guard(events){
 const db={updateEntry:async()=>{},audit:async()=>{}};
 const g=new ProfitGuard({db,getSettings:()=>({simFeeCents:0,mode:'SIMULATION'}),
   onPositionClosed:e=>{events.push(e);}});
 g.isProfitLearningTrade=()=>false;
 g.isProtectedRunnerExitDecision=()=>false;
 g.isAthenaExitDecision=()=>false;
 g.isGoldenEyeExitDecision=()=>false;
 g.isAtomicThunderExitDecision=()=>false;
 g.isAthenaExitTrade=()=>false;
 g.completeOpportunityEpisode=async()=>{};
 return g;
}
const drain=()=>new Promise(resolve=>setImmediate(resolve));

test('W2: Great Horn Aurora loss notifies Crystal Wall once AFTER durable full close',async()=>{
 const events=[],g=guard(events),e=trade('Great Horn Recovery');
 const first=await g.applyExitFill(e,{reason:'aurora_covenant_fault'},{fillCount:1,fillPriceCents:30});
 assert.equal(first.closed,false);
 await drain();assert.equal(events.length,0,'partial exit must not arm Crystal Wall');
 const partial={...e,...first.patch};
 const second=await g.applyExitFill(partial,{reason:'aurora_covenant_fault'},{fillCount:1,fillPriceCents:28});
 assert.equal(second.closed,true);await drain();
 assert.equal(events.length,1);
 assert.equal(events[0].conceptName,'Great Horn Recovery');
 assert.equal(events[0].remainingCount,0);
 assert.equal(events[0].exitFilledCount,2);
 assert.equal(events[0].status,'closed');
 assert.ok(events[0].pnlCents<0);
});

test('W2: Great Horn non-hard-stop losing close sends immediate second recovery notification',async()=>{
 const events=[],g=guard(events),e=trade('Great Horn Recovery');
 const r=await g.applyExitFill(e,{reason:'infinity_break_recovery_close'},{fillCount:2,fillPriceCents:40});
 await drain();assert.equal(r.closed,true);assert.equal(events.length,1);
});

test('W2: Great Horn settlement loss wakes CW1; Lightning previously notifies; CW does not recursively wake',async()=>{
 for(const concept of ['Great Horn Recovery','Lightning Plasma','Crystal Wall Recovery']){
  const events=[],g=guard(events),e=trade(concept);
  const r=await g.closeAtSettlement(e,{reason:'market_settlement',exitPriceCents:0});
  await drain();assert.equal(r.closed,true);
  assert.equal(events.length,concept==='Crystal Wall Recovery'?0:1,concept);
 }
});

test('W2: Great Horn fully closed settlement with pre-applied loss reports CW1 once',async()=>{
 const events=[],g=guard(events),e=trade('Great Horn Recovery',{remaining:0});
 e.status='exit_pending';e.pnlCents=-15;
 const r=await g.closeAtSettlement(e,{reason:'market_settlement',exitPriceCents:0});
 await drain();assert.equal(r.closed,true);assert.equal(events.length,1);
});

test('W2: Positive Great Horn exit never wakes Crystal Wall; other Saints remain unchanged',async()=>{
 for(const concept of ['Great Horn Recovery','Crystal Wall Recovery','Lightning Plasma']){
  const events=[],g=guard(events),e=trade(concept);
  const r=await g.applyExitFill(e,{reason:'normal_profit'},{fillCount:2,fillPriceCents:99});
  await drain();assert.equal(r.closed,true);
  assert.equal(events.length,0,concept);
 }
});

function dbRow(conceptName){return {id:'closed-'+conceptName,concept_name:conceptName,system_name:'TEST',owner_id:'OWNER',
 mode:'SIMULATION',entry_price_cents:91,exit_price_cents:100,count:1,remaining_count:0,
 opened_at_ms:Date.now()-20000,closed_at_ms:Date.now()-1000,status:'closed',pnl_cents:9,
 entry_config:{executionClass:'CAPITAL'},archived:false};}
function fakeDbSnapshot(){
 const calls=[];
 const client={release(){},async query(sql,args=[]){
  const txt=String(sql),a=Array.isArray(args)?args:[];
  calls.push({sql:txt,args:a});
  if(txt.startsWith('select concept_name,')||txt.includes('group by e.concept_name'))return {rows:[]};
  if(txt.includes('having abs('))return {rows:[]};
  if(txt.includes('as realized_cents')&&txt.includes('as reserved_cents'))return {rows:[{realized_cents:27,reserved_cents:0}]};
  if(txt.includes('from sag_entries')&&txt.includes("status='closed'")){
   const arr=a.find(x=>Array.isArray(x));
   const name=arr?.[0]|| (txt.includes("concept_name='Great Horn Recovery'")?'Great Horn Recovery':
    txt.includes("concept_name='Crystal Wall Recovery'")?'Crystal Wall Recovery':null);
   return {rows:name&&name!=='Crash Recovery Hunter'?[dbRow(name)]:[]};
  }
  return {rows:[]};
 }};
 const db={pool:{connect:async()=>client},dashboardEntryProjectionSql:()=>'*'};
 return {db,calls};
}
test('W5: active DB financial read returns separate LP/GH/CW closed position arrays',async()=>{
 const {db,calls}=fakeDbSnapshot();
 const data=await Database.prototype.executionPerformanceSnapshot.call(db,'TEST',
   {ownerId:'OWNER',mode:'SIMULATION',resetTimestampMs:0});
 assert.equal(data.closedRows?.[0]?.conceptName,'Lightning Plasma');
 assert.equal(data.greatHornClosedRows?.[0]?.conceptName,'Great Horn Recovery');
 assert.equal(data.crystalWallClosedRows?.[0]?.conceptName,'Crystal Wall Recovery');
 assert.equal((data.closedRows||[]).length,1);
 assert.equal((data.greatHornClosedRows||[]).length,1);
 assert.equal((data.crystalWallClosedRows||[]).length,1);
 assert.equal(calls.filter(c=>c.sql.includes('order by closed_at_ms desc')).length,4);
});

test('W5: no shadow / legacy positions enter the new recovery closed-row contract',async()=>{
 const {db}=fakeDbSnapshot();
 const data=await Database.prototype.executionPerformanceSnapshot.call(db,'TEST',
   {ownerId:'OWNER',mode:'SIMULATION',resetTimestampMs:0});
 assert.equal(data.legacyClosedRows.length,0);
 assert.ok(data.crystalWallClosedRows.every(e=>e.conceptName==='Crystal Wall Recovery'));
});

test('W5: no duplicate shadowing DB financial readers, and frontend field contract agrees',()=>{
 const dbCode=readFileSync(fileURLToPath(new URL('../src/db.mjs',import.meta.url)),'utf8');
 const engineCode=readFileSync(fileURLToPath(new URL('../src/engine.mjs',import.meta.url)),'utf8');
 assert.equal([...dbCode.matchAll(/async executionPerformanceSnapshot\(/g)].length,1);
 assert.match(dbCode,/crystalWallClosedRows:crystalWallClosed\.rows\.map\(rowEntry\)/);
 assert.match(engineCode,/crystalWallClosedRows=snapshot\.crystalWallClosedRows\|\|\[\]/);
});

test('W4: no Crystal Wall automatic LIVE unlock, no authentication or legacy strategy modifications',()=>{
 const engine=readFileSync(fileURLToPath(new URL('../src/engine.mjs',import.meta.url)),'utf8');
 assert.match(engine,/SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED/);
 assert.match(engine,/cw1_live_release_gate_not_verified/);
 const code=readFileSync(fileURLToPath(new URL('../src/profitGuard.mjs',import.meta.url)),'utf8');
 assert.match(code,/closedEntry\.conceptName==='Great Horn Recovery'&&pnl<0/);
});

function ghDatabaseRow({id='GH-CLOSED-LOSS',mode='SIMULATION',ownerId='OWNER',systemName='TEST',
 openedAtMs=Date.now()-30000,closedAtMs=Date.now()-1000,pnlCents=-124,
 conceptName='Great Horn Recovery',exitNotionalCents=58}={}){
 return {id,mode,owner_id:ownerId,system_name:systemName,concept_name:conceptName,
  execution_class:'CAPITAL',status:'closed',archived:false,remaining_count:0,
  count:2,exit_filled_count:2,entry_price_cents:91,exit_price_cents:29,
  exit_notional_cents:exitNotionalCents,pnl_cents:pnlCents,entry_fee_cents:0,exit_fee_cents:0,
  ticker:'KX-CW-RECOVERY',event_ticker:'KX-CW-RECOVERY',opened_at_ms:openedAtMs,
  closed_at_ms:closedAtMs,entry_config:{greatHornRecovery:{version:'GH1-SIM-CAPITAL-V2'},
   aurora:{frozen:true},executionClass:'CAPITAL',side:'YES'}};
}
function cwArmHarness(parent=ghDatabaseRow(),runtime=null){
 const state=runtime||{mode:'SIMULATION',ownerId:'OWNER',systemName:'TEST',resetTimestampMs:0,
  engineActive:true,crystalWallRecoveryEnabled:true,crystalWallRecoveryMultiply:5,
  crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryObservationMinutes:0};
 const watches=new Map();let commits=0,rollbacks=0;
 const client={release(){},async query(sql,args=[]){
  const q=String(sql);
  if(q==='COMMIT'){commits++;return {rows:[],rowCount:0};}
  if(q==='ROLLBACK'){rollbacks++;return {rows:[],rowCount:0};}
  if(q.includes("select value from sag_settings where key='runtime'"))return {rows:[{value:state}],rowCount:1};
  if(q==='select * from sag_entries where id=$1 for share')return {rows:String(args[0])===parent.id?[parent]:[],rowCount:1};
  if(q.includes('insert into sag_crystal_wall_recovery_watches_v1')){
   const id=args[0];if(watches.has(id))return {rows:[],rowCount:0};
   watches.set(id,{id,watch:args[9],parentId:args[6]});return {rows:[{id}],rowCount:1};
  }
  return {rows:[],rowCount:0};
 }};
 const self={pool:{connect:async()=>client}};
 return {self,watches,get commits(){return commits},get rollbacks(){return rollbacks}};
}

test('W2: actual database arm method creates exactly one durable watch from verified losing GH parent',async()=>{
 const h=cwArmHarness();
 const first=await Database.prototype.armCrystalWallWatchFromClosedGreatHorn.call(h.self,'GH-CLOSED-LOSS');
 assert.equal(first.ok,true,first.reason);assert.equal(first.status,'WATCHING_CREATED');
 const again=await Database.prototype.armCrystalWallWatchFromClosedGreatHorn.call(h.self,'GH-CLOSED-LOSS');
 assert.equal(again.ok,true,again.reason);assert.equal(again.status,'WATCH_ALREADY_PRESENT');
 assert.equal(first.watchId,again.watchId);assert.equal(h.watches.size,1);
 assert.equal(h.commits,2);assert.equal(h.rollbacks,0);
 assert.equal([...h.watches.values()][0].parentId,'GH-CLOSED-LOSS');
});

test('W2: DB arming denies Lightning parent, stale reset, wrong owner and unverified P/L',async()=>{
 const cases=[
  ghDatabaseRow({conceptName:'Lightning Plasma'}),
  ghDatabaseRow({ownerId:'OTHER'}),
  ghDatabaseRow({pnlCents:1}),
  ghDatabaseRow({openedAtMs:Date.now()-30000,closedAtMs:Date.now()-1000})
 ];
 for(let i=0;i<cases.length;i++){
  const runtime={mode:'SIMULATION',ownerId:'OWNER',systemName:'TEST',
   resetTimestampMs:i===3?Date.now()-5000:0,engineActive:true,
   crystalWallRecoveryEnabled:true,crystalWallRecoveryMultiply:5,
   crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryObservationMinutes:0};
  const h=cwArmHarness(cases[i],runtime);
  const v=await Database.prototype.armCrystalWallWatchFromClosedGreatHorn.call(h.self,cases[i].id);
  assert.equal(v.ok,false,JSON.stringify(v));assert.equal(h.watches.size,0);
 }
});

test('W2: Crystal Wall disabled prevents any new watch, preserving all existing GH trades',async()=>{
 const h=cwArmHarness(ghDatabaseRow(),{mode:'SIMULATION',ownerId:'OWNER',systemName:'TEST',resetTimestampMs:0,
  engineActive:true,crystalWallRecoveryEnabled:false});
 const v=await Database.prototype.armCrystalWallWatchFromClosedGreatHorn.call(h.self,'GH-CLOSED-LOSS');
 assert.equal(v.ok,false);assert.equal(v.reason,'cw1_disabled');assert.equal(h.watches.size,0);
});
