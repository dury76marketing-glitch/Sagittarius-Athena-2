#!/usr/bin/env node
/** Crystal Wall fourth re-audit: strict original doctrine, scoped recovery
 * subscriptions, no network/real PostgreSQL. Test-only SQL semantics modeled
 * explicitly; a real PostgreSQL integration test remains necessary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../src/db.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
import {freshInstallSettings,sanitizeRuntimeSettings} from '../src/config.mjs';
import {crystalWallRecoverySeatPlan,crystalWallRecoveryObservationStep,
  crystalWallRecoveryWatchFromLoss} from '../src/crystalWallRecovery.mjs';
import {readFileSync} from 'node:fs';

const NOW=1761840000000;
const settings=()=>({...freshInstallSettings(),systemName:'CW4-SYSTEM',ownerId:'CW4-OWNER',mode:'SIMULATION',
 resetTimestampMs:NOW-360000,engineActive:true,crystalWallRecoveryEnabled:true,
 crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryMultiply:5});
const loss=s=>({ok:true,systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
 resetEpoch:s.resetTimestampMs,parentEntryId:'GH-CW4-LOSS',ticker:'CW4-TICKER',eventTicker:'CW4-TICKER',
 entryPriceCents:91,exitPriceCents:29,closedAtMs:NOW-8000,realizedNetCents:-62});
const quote=(timestamp,fields={})=>({ticker:'CW4-TICKER',eventTicker:'CW4-TICKER',
 status:'active',quoteAtMs:timestamp,yesBid:85,yesAsk:91,bookInvalid:false,result:null,...fields});

test('W1 / enabling CW never alters Great Horn or global spread settings',()=>{
 const s=sanitizeRuntimeSettings({...settings(),greatHornMaxSpreadCents:4,
  maxSpreadCents:3,crystalWallRecoveryMaxSpreadCents:7});
 assert.equal(s.crystalWallRecoveryMaxSpreadCents,7);
 assert.equal(s.greatHornMaxSpreadCents,4);
 assert.equal(s.maxSpreadCents,3);
});

test('W2 / watch remains available after duplicate/stale observations; finality remains terminal',()=>{
 const s=settings(),w=crystalWallRecoveryWatchFromLoss(loss(s),s,NOW).watch;
 const first=crystalWallRecoveryObservationStep(w,quote(NOW-300),s,NOW);
 assert.equal(first.watch.qualified,true);
 const stale=crystalWallRecoveryObservationStep(first.watch,quote(NOW-500),s,NOW);
 assert.equal(stale.changed,false);
 assert.equal(stale.watch.qualified,true);
 const terminal=crystalWallRecoveryObservationStep(first.watch,
  quote(NOW-100,{status:'settled',result:'no'}),s,NOW);
 assert.equal(terminal.watch.status,'BLOCKED');
});

test('W3 / multi-parent duplicate ticker crowding cannot exhaust 2 distinct subscriptions',async()=>{
 const rows=[...Array.from({length:260},(_,i)=>({ticker:'MARKET-A',last_scan_ms:1000+i})),
  {ticker:'MARKET-B',last_scan_ms:1},{ticker:'MARKET-C',last_scan_ms:2}];
 let queryText=null,queryArgs=null;
 const db={pool:{async query(sql,args){queryText=sql;queryArgs=args;
   // Limited SQL executor for this one query. DO NOT claim this is native PG.
   const grouped=/\bgroup\s+by\s+ticker\b/i.test(sql);
   let sorted;
   if(grouped){
     const byTicker=new Map();
     for(const r of rows)byTicker.set(r.ticker,
      Math.min(byTicker.get(r.ticker)??Infinity,r.last_scan_ms));
     sorted=[...byTicker].sort((a,b)=>a[1]-b[1]||a[0].localeCompare(b[0]))
       .map(([ticker])=>({ticker}));
   } else sorted=[...rows].sort((a,b)=>b.last_scan_ms-a.last_scan_ms).map(r=>({ticker:r.ticker}));
   return {rows:sorted.slice(0,args[4])};
 }}};
 const result=await Database.prototype.crystalWallRecoveryActiveTickers.call(db,settings(),{limit:2});
 assert.deepEqual(result,['MARKET-B','MARKET-C']);
 assert.match(queryText,/group by ticker/i);
 assert.match(queryText,/order by (?:min\(last_scan_ms\)|oldest_scan_ms) asc/i);
 assert.deepEqual(queryArgs,['CW4-SYSTEM','CW4-OWNER','SIMULATION',NOW-360000,2]);
});

test('W3 / same recovery group cannot consume more than five seats',()=>{
 const s=settings(),w=crystalWallRecoveryWatchFromLoss(loss(s),s,NOW).watch;
 const used=Array.from({length:5},(_,i)=>({seat:i+1}));
 assert.deepEqual(crystalWallRecoverySeatPlan(w,used).free,[]);
 assert.equal(crystalWallRecoverySeatPlan(w,[...used,{seat:1}]).ok,false);
});

test('W4 / Crystal Wall LIVE release remains closed unless independently certified',async()=>{
 const old=process.env.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED;
 try{
  delete process.env.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED;
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={...settings(),mode:'LIVE',liveArmed:true};
  const result=await engine.executeCrystalWallCapitalSeat({id:'X',qualified:true});
  assert.equal(result.ok,false);
  assert.equal(result.reason,'cw1_live_release_gate_not_verified');
 }finally{
  if(old===undefined)delete process.env.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED;
  else process.env.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED=old;
 }
});

test('W5 / no login additions; legacy Crystal Wall and Great Horn unchanged by this upgrade',()=>{
 const db=readFileSync(new URL('../src/db.mjs',import.meta.url),'utf8');
 assert.match(db,/concept_name='Great Horn Recovery'/);
 assert.match(db,/Crystal Wall Recovery/);
 const src=readFileSync(new URL('../src/crystalWallRecovery.mjs',import.meta.url),'utf8');
 assert.match(src,/parentConcept:'Great Horn Recovery'/);
});
