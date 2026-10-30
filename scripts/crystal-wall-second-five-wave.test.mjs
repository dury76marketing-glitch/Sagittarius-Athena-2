#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshInstallSettings} from '../src/config.mjs';
import {crystalWallRecoveryWatchFromLoss,crystalWallRecoveryObservationStep} from '../src/crystalWallRecovery.mjs';

const NOW=1761771900000;
const config=(opts={})=>({...freshInstallSettings(),systemName:'CW-TEST',ownerId:'CW-OWNER',mode:'SIMULATION',resetTimestampMs:NOW-100000,engineActive:true,crystalWallRecoveryEnabled:true,crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryMultiply:5,infinityBreakMaximumBookAgeMs:5000,...opts});
const loss=(s)=>({ok:true,systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetEpoch:s.resetTimestampMs,parentEntryId:'GH-LOSS-42',ticker:'CW-MARKET',eventTicker:'CW-MARKET',entryPriceCents:89,exitPriceCents:30,closedAtMs:NOW-7000,realizedNetCents:-120});
const quote=(at=NOW-3000,opts={})=>({ticker:'CW-MARKET',eventTicker:'CW-MARKET',status:'active',result:null,bookInvalid:false,quoteAtMs:at,yesBid:67,yesAsk:69,...opts});
const make=(s=config())=>{const w=crystalWallRecoveryWatchFromLoss(loss(s),s,NOW).watch;return {w,s};};

test('W2 regression: pre-loss terminal quote cannot permanently terminate a newly armed CW watch',()=>{
 const {w,s}=make();
 const result=crystalWallRecoveryObservationStep(w,quote(NOW-9000,{status:'settled',result:'yes'}),s,NOW);
 assert.equal(result.changed,false,'stale terminal event is not proof of post-loss finality');
 assert.equal(result.watch.status,'WATCHING');
});

test('W2 regression: out-of-order old terminal quote cannot terminate a newer qualifying observation',()=>{
 const {w,s}=make();
 const newer=crystalWallRecoveryObservationStep(w,quote(NOW-2000),s,NOW);
 assert.equal(newer.watch.qualified,true);
 const older=crystalWallRecoveryObservationStep(newer.watch,quote(NOW-3000,{status:'closed',result:'no'}),s,NOW);
 assert.equal(older.changed,false);
 assert.equal(older.watch.status,'WATCHING');
 assert.equal(older.watch.qualified,true);
});

test('W2 regression: newer authoritative terminal quote STILL blocks recovery',()=>{
 const {w,s}=make();
 const outcome=crystalWallRecoveryObservationStep(w,quote(NOW-2000,{status:'settled',result:'no'}),s,NOW);
 assert.equal(outcome.changed,true);
 assert.equal(outcome.watch.status,'BLOCKED');
 assert.equal(outcome.watch.qualified,false);
});

test('W2 regression: incomplete/malformed active quote must not erase verified CW qualification',()=>{
 const {w,s}=make();
 const valid=crystalWallRecoveryObservationStep(w,quote(NOW-3000),s,NOW);
 assert.equal(valid.watch.qualified,true);
 const invalid=crystalWallRecoveryObservationStep(valid.watch,quote(NOW-2000,{yesAsk:null}),s,NOW);
 assert.equal(invalid.changed,false);
 assert.equal(invalid.watch.qualified,true);
 assert.equal(invalid.watch.lastQuoteAtMs,NOW-3000);
});

import {sanitizeRuntimeSettings} from '../src/config.mjs';
import {crystalWallRecoverySpreadAllowed,crystalWallRecoverySeatPlan,crystalWallRecoveryAdmissionDecision} from '../src/crystalWallRecovery.mjs';
import {crystalWallRecoveryLiveDispatchConfirmation} from '../src/crystalWallLiveExecution.mjs';
import {Database} from '../src/db.mjs';
import {readFileSync} from 'node:fs';

const cloneTails=['ObservationMinutes','StakeCents','MaxSpreadCents','MinEntryCents','MaxEntryCents','Multiply','MinCrashCents','MinReboundCents','MinUpwardTicks','ParentEntryRiseCents','AuroraDamageControlPercent','MinProfitNetPerOriginalContractCents','LinkEnabled','AthenaX1Enabled'];
test('W1 / all fourteen Great Horn operator fields clone into Crystal Wall only on initial migration',()=>{
 const current=config({greatHornMaxSpreadCents:7,greatHornMultiply:3,greatHornStakeCents:321,greatHornLinkEnabled:false,greatHornAthenaX1Enabled:false,greatHornMinCrashCents:8,greatHornMinReboundCents:3,greatHornMinUpwardTicks:2});
 for(const tail of cloneTails)delete current['crystalWallRecovery'+tail];
 delete current.crystalWallRecoveryEnabled;
 const after=sanitizeRuntimeSettings(current);
 for(const tail of cloneTails)assert.equal(after['crystalWallRecovery'+tail],after['greatHorn'+tail],tail);
 assert.equal(after.crystalWallRecoveryEnabled,false);
 for(const tail of cloneTails)assert.equal(after['greatHorn'+tail],current['greatHorn'+tail],`Great Horn ${tail} unchanged`);
 const later=sanitizeRuntimeSettings({...after,greatHornMaxSpreadCents:1,greatHornMultiply:2});
 assert.equal(later.crystalWallRecoveryMaxSpreadCents,7);
 assert.equal(later.crystalWallRecoveryMultiply,3);
});

test('W2 / legacy Link-ON qualification replay remains supported after the observation-order repair',()=>{
 const {w,s}=make();const at=NOW-1000;
 const legacy={...w,qualified:false,lastSignalReason:'cw1_entry_band',lastQuoteAtMs:at,lastBidCents:67,lastQuoteEpoch:null,lastQuoteRevision:0};
 const upgraded=crystalWallRecoveryObservationStep(legacy,quote(at),s,NOW);
 assert.equal(upgraded.changed,true,upgraded.reason);
 assert.equal(upgraded.watch.qualified,true);
});

test('W3 / independent CW spread rejects wider prices regardless of Great Horn and shared spreads',()=>{
 const s=config({crystalWallRecoveryMaxSpreadCents:6,greatHornMaxSpreadCents:25,maxSpreadCents:25});
 assert.equal(crystalWallRecoverySpreadAllowed(quote(NOW-500,{yesBid:85,yesAsk:91}),s),true);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(NOW-500,{yesBid:84,yesAsk:91}),s),false);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(NOW-500,{yesBid:95,yesAsk:93}),s),false);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(NOW-500,{yesBid:0,yesAsk:91}),s),false);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(NOW-500,{yesBid:90,yesAsk:100}),s),false);
});

test('W3 / Crystal Wall seats have an independent finite cap and a separate verified parent authority',()=>{
 const {w}=make(config({crystalWallRecoveryMultiply:4}));
 assert.deepEqual(crystalWallRecoverySeatPlan(w,[{seat:1},{seat:3}]).free,[2,4]);
 assert.equal(crystalWallRecoverySeatPlan(w,[{seat:1},{seat:1}]).ok,false);
 assert.equal(crystalWallRecoverySeatPlan(w,[{seat:5}]).ok,false);
 assert.equal(crystalWallRecoveryAdmissionDecision({watch:w,seat:1,settings:config(),quote:quote(NOW-500),parent:null,now:NOW}).ok,false);
});

test('W4 / Crystal Wall LIVE confirmation fails closed when arming, spread or owner is wrong',()=>{
 const s=config({mode:'LIVE',liveArmed:true,crystalWallRecoveryMaxSpreadCents:6});
 const entry={conceptName:'Crystal Wall Recovery',mode:'LIVE',status:'entry_pending',id:'CW-ID',entryClientOrderId:'CW1-SAFE-ORDER',systemName:s.systemName,ownerId:s.ownerId,ticker:'CW-MARKET',eventTicker:'CW-MARKET',entryPriceCents:91,count:1,entryConfig:{resetTimestampMs:s.resetTimestampMs,aurora:{frozen:true},crystalWallRecovery:{quoteAtMs:NOW-1000,quoteAskCents:91,authorization:'DURABLE_PENDING_AND_DISPATCH_PROOF_REQUIRED',capturedSettings:{link:true}}}};
 // A missing persisted entry fingerprint fails closed independently of the quote.
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry,settings:s,quote:quote(NOW-500,{yesBid:85,yesAsk:91}),liveReady:true,now:NOW}).ok,false);
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry,settings:{...s,liveArmed:false},quote:quote(NOW-500,{yesBid:85,yesAsk:91}),liveReady:true,now:NOW}).reason,'cw_live_authorization_revoked');
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry,settings:{...s,ownerId:'OTHER'},quote:quote(NOW-500,{yesBid:85,yesAsk:91}),liveReady:true,now:NOW}).reason,'cw_live_authorization_revoked');
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry,settings:s,quote:quote(NOW-500,{yesBid:84,yesAsk:91}),liveReady:true,now:NOW}).reason,'cw_live_quote_changed_or_stale');
});

test('W5 / closed-trade history query includes CW but excludes legacy Crystal Wall, enforces scope and pagination',async()=>{
 const queries=[];
 const db={pool:{async connect(){return {release(){},async query(sql,args=[]){queries.push({sql,args});return {rows:[]};}};}},dashboardEntryProjectionSql(){return 'id,concept_name';}};
 const args={ownerId:'CW-OWNER',mode:'SIMULATION',resetTimestampMs:NOW-100000,status:'closed',limit:75,beforeAtMs:NOW-1000,beforeId:'CW-CURSOR',snapshotCutoffMs:NOW};
 const data=await Database.prototype.capitalTradeHistoryPage.call(db,'CW-TEST',args);
 assert.equal(data.status,'closed');assert.equal(data.rows.length,0);
 const sql=queries.find(x=>x.sql.includes('from sag_entries'));
 assert.ok(sql);
 assert.match(sql.sql,/concept_name in \('Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery'\)/);
 assert.doesNotMatch(sql.sql,/concept_name in \([^)]*'Recovery Hunter'/);
 assert.match(sql.sql,/owner_id=\$2/);assert.match(sql.sql,/mode=\$3/);assert.match(sql.sql,/opened_at_ms >= \$4/);
 assert.match(sql.sql,/order by .* desc,id desc limit \$8/);
 assert.deepEqual(sql.args,['CW-TEST','CW-OWNER','SIMULATION',args.resetTimestampMs,args.beforeAtMs,args.beforeId,NOW,76]);
});

test('W5 / three independent financial cohorts and legacy identity are distinct in source contracts',()=>{
 const db=readFileSync(new URL('../src/db.mjs',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
 assert.equal((db.match(/async executionPerformanceSnapshot\(/g)||[]).length,1);
 assert.match(db,/crystalWallClosedRows:crystalWallClosed\.rows\.map\(rowEntry\)/);
 assert.match(engine,/crystalWallClosedRows=snapshot\.crystalWallClosedRows\|\|\[\]/);
 assert.match(ui,/Crystal Wall — GH recovery/);
 assert.match(ui,/Crystal Wall \(legacy CI1\)/);
 assert.match(ui,/Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery/);
});
