#!/usr/bin/env node
/** CW1 W1..W5 supplemental safety tests for GH settlement -> CW durable authorization.
 * Runs offline without real broker/PostgreSQL. No credentials or live orders.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {ProfitGuard} from '../src/profitGuard.mjs';
import {verifiedGreatHornLoss,crystalWallRecoveryWatchFromLoss,crystalWallRecoveryObservationStep,crystalWallRecoverySeatPlan} from '../src/crystalWallRecovery.mjs';
import {createCrystalWallCapitalEntry} from '../src/crystalWallSimCapital.mjs';
import {freshInstallSettings,sanitizeRuntimeSettings} from '../src/config.mjs';
import {statisticsFromRows} from '../src/executionReporting.mjs';
import {readFileSync} from 'node:fs';

const time=()=>Date.now();
function settings(mode='LIVE'){
 return {...freshInstallSettings(),systemName:'CW3-AUDIT',ownerId:'CW3-OWNER',mode,engineActive:true,liveArmed:mode==='LIVE',crystalWallRecoveryEnabled:true,
  resetTimestampMs:time()-300_000,crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryMaxSpreadCents:6,crystalWallRecoveryMultiply:5};
}
function ghParent(s){
 const now=time();
 return {id:'GH3-SETTLEMENT-PARENT',systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
  conceptName:'Great Horn Recovery',executionClass:'CAPITAL',ticker:'CW3-MARKET',eventTicker:'CW3-MARKET',side:'YES',
  status:'open',archived:false,count:2,remainingCount:2,entryPriceCents:91,exitPriceCents:null,entryFeeCents:0,exitFeeCents:0,
  exitFilledCount:0,exitNotionalCents:0,pnlCents:0,entryOrderId:s.mode==='LIVE'?'GH-ENTRY-RECEIPT':null,
  entryClientOrderId:s.mode==='LIVE'?'GH-ENTRY-CLIENT-ID':null,exitOrderId:null,exitClientOrderId:null,exitExecutionState:{},
  openedAtMs:now-40_000,updatedAtMs:now-40_000,
  entryConfig:{executionClass:'CAPITAL',side:'YES',greatHornRecovery:{version:s.mode==='LIVE'?'GH1-LIVE-CAPITAL-V1':'GH1-SIM-CAPITAL-V2'},aurora:{frozen:true},entryFillProof:{authoritative:true,filledCount:2}}};
}
function guard(s,original){
 const events=[];let persisted=original;
 const db={entryById:async()=>persisted,updateEntry:async(_id,patch)=>{persisted={...persisted,...patch};return persisted;},audit:async()=>{}};
 const p=new ProfitGuard({db,getSettings:()=>s,onPositionClosed:e=>{events.push(e);}});
 p.persistLiveExitSnapshot=async (_entry,patch)=>{persisted={...persisted,...patch};return true;};
 p.isAthenaExitTrade=()=>false;p.isProfitLearningTrade=()=>false;
 p.completeOpportunityEpisode=async()=>{};
 return {p,events,getPersisted:()=>persisted};
}

test('W1 / CW settings remain separately opt-in and do not overwrite Great Horn',()=>{
 const s=settings();const current=sanitizeRuntimeSettings({...s,crystalWallRecoveryMaxSpreadCents:8});
 assert.equal(current.crystalWallRecoveryMaxSpreadCents,8);
 assert.equal(current.greatHornMaxSpreadCents,s.greatHornMaxSpreadCents);
 const disabled=sanitizeRuntimeSettings({...s,crystalWallRecoveryEnabled:false});
 assert.equal(disabled.crystalWallRecoveryEnabled,false);
});

test('W2 / financially closed LIVE GH settlement loss has durable CW receipt proof',async()=>{
 const s=settings(),e=ghParent(s),g=guard(s,e);
 const outcome=await g.p.closeAtSettlement(e,{action:'settlement',reason:'settlement_loss',exitPriceCents:0});
 assert.equal(outcome.closed,true);
 const closed=g.getPersisted();
 assert.equal(closed.status,'closed');assert.equal(closed.pnlCents,-182);
 assert.equal(closed.exitOrderId,null);
 assert.equal(closed.remainingCount,0);
 assert.equal(g.events.length,1);
 const proof=verifiedGreatHornLoss(closed,s,time());
 assert.equal(proof.ok,true,JSON.stringify(proof));
 const watch=crystalWallRecoveryWatchFromLoss(proof,s,time());
 assert.equal(watch.ok,true,JSON.stringify(watch));
 assert.equal(watch.watch.parentEntryId,e.id);
});

test('W2 / missing exit receipt is still rejected for a non-settlement LIVE close',()=>{
 const s=settings(),e=ghParent(s);
 const fraudulent={...e,status:'closed',remainingCount:0,closedAtMs:time(),exitFilledCount:2,exitNotionalCents:0,
  exitPriceCents:0,pnlCents:-182,closeReason:'hard_stop_loss'};
 assert.equal(verifiedGreatHornLoss(fraudulent,s,time()).ok,false);
});

test('W2 / GH LIVE settlement with previously reconciled fills also records the CW proof without changing P/L',async()=>{
 const s=settings('LIVE'),base=ghParent(s);
 const e={...base,status:'exit_pending',remainingCount:0,exitFilledCount:2,exitNotionalCents:0,exitPriceCents:0,
  pnlCents:-182,entryFeeCents:0,exitFeeCents:0};
 const g=guard(s,e);
 const result=await g.p.closeAtSettlement(e,{action:'settlement',reason:'settlement_loss',exitPriceCents:0});
 assert.equal(result.closed,true);
 const got=g.getPersisted();
 assert.equal(got.pnlCents,e.pnlCents);
 assert.equal(got.exitFilledCount,e.exitFilledCount);
 assert.equal(got.exitNotionalCents,e.exitNotionalCents);
 assert.equal(got.exitExecutionState?.settlementConfirmed,true);
 assert.equal(verifiedGreatHornLoss(got,s,time()).ok,true);
});

test('W2 / GH winning settlement and every other Saint retain original exit-state metadata',async()=>{
 const s=settings('LIVE');
 for(const name of ['Great Horn Recovery','Lightning Plasma','Crystal Wall Recovery']){
  const e={...ghParent(s),conceptName:name,id:name};
  const g=guard(s,e);
  const result=await g.p.closeAtSettlement(e,{action:'settlement',reason:'settlement_win',exitPriceCents:100});
  assert.equal(result.closed,true);
  assert.equal(g.getPersisted().exitExecutionState?.settlementConfirmed,undefined,name);
 }
 const other={...ghParent(s),conceptName:'Lightning Plasma',id:'OTHER-LP'};
 const g=guard(s,other);
 await g.p.closeAtSettlement(other,{action:'settlement',reason:'settlement_loss',exitPriceCents:0});
 assert.equal(g.getPersisted().exitExecutionState?.settlementConfirmed,undefined);
});

test('W3 / independent recovery seat cap remains bounded at five',()=>{
 const s=settings('SIMULATION'),e=ghParent(s),now=time();
 const closed={...e,status:'closed',remainingCount:0,closedAtMs:now-2000,exitFilledCount:2,exitNotionalCents:0,
  exitPriceCents:0,pnlCents:-182};
 const proof=verifiedGreatHornLoss(closed,s,now);
 assert.equal(proof.ok,true,JSON.stringify(proof));
 const watch=crystalWallRecoveryWatchFromLoss(proof,s,now).watch;
 assert.deepEqual(crystalWallRecoverySeatPlan(watch,[{seat:1},{seat:3}]).free,[2,4,5]);
});

test('W4 / LIVE GH settlement recovery cannot bypass the independent CW LIVE BUY gate',()=>{
 const code=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
 assert.match(code,/if\(live&&process\.env\.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED!==\'true\'\)/);
 assert.match(code,/cw1_live_release_gate_not_verified/);
});

test('W5 / GH loss and CW gain remain different capital reporting cohorts',()=>{
 const s=settings('SIMULATION'),e=ghParent(s),now=time();
 const gh={...e,status:'closed',remainingCount:0,closedAtMs:now-2000,exitFilledCount:2,exitNotionalCents:0,
  exitPriceCents:0,pnlCents:-182};
 const cw={...gh,id:'CW3-FILLED',conceptName:'Crystal Wall Recovery',entryPriceCents:50,exitPriceCents:70,exitNotionalCents:140,
  pnlCents:40,entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true}}};
 const result=statisticsFromRows([gh,cw],s,{now});
 assert.equal(result.byAttack['Great Horn Recovery'].losses,1);
 assert.equal(result.byAttack['Crystal Wall Recovery'].wins,1);
 assert.equal(result.combined.realizedCents,-142);
});
