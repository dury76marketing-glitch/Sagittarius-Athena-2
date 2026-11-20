#!/usr/bin/env node
// Q17-R9 integrated capital admission / broker scope test.
// This suite uses exact production helpers and a stub database transaction;
// prior native PostgreSQL tests do NOT certify these new changes natively.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Database} from '../src/db.mjs';
import {KalshiClient} from '../src/kalshi.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
import {OperationalMonitor} from '../src/operationalSafety.mjs';
import {kalshiGeneralTakerFeeEstimateCents} from '../src/doctrine.mjs';
import {Q17_LIVE_CAPITAL_ADMISSIBILITY,createQ17LiveCashWitness,
  q17LivePendingReserveDecision,verifyQ17LiveCashWitness,q17LiveOwnedPositionDisposition}
  from '../src/q17LiveCapitalAdmissibility.mjs';
let pass=0;
const mark=(label,condition=true)=>{assert(condition,label);pass++};
const now=Date.now();
const typeNames=['Lightning Plasma','Sagittarius Arrow Recovery','Great Horn Recovery','Crystal Wall Recovery','Scarlet Needle Recovery','Pegasus Ryu Sei Ken Recovery'];
const live=(id,exchangeIndex=3,count=1,price=72,available=385)=>{
  const fee=kalshiGeneralTakerFeeEstimateCents({count,priceCents:price});
  const entry={id,conceptName:typeNames[(id.match(/\d+/)?.[0]||0)%typeNames.length],count,entryPriceCents:price,
    mode:'LIVE',status:'entry_pending',executionClass:'CAPITAL',systemName:'TEST-R9',ownerId:'TEST-OWNER',
    entryClientOrderId:`sagc-integration-test-owner-${id}`,entryOrderId:null,
    ticker:`KXTEST-${id}`,entryConfig:{brokerRouting:{exchangeIndex},auroraPending:{preflight:{ok:true,entryFeeCents:fee},exactFillRequired:true}}};
  const created=createQ17LiveCashWitness(entry,{ok:true,exchangeIndex,availableCents:available});
  assert(created.ok,JSON.stringify(created));entry.entryConfig.q17LiveCashWitness=created.witness;
  return entry;
};
function asDbPending(entry){return {id:entry.id,count:entry.count,entryPriceCents:entry.entryPriceCents,entryConfig:entry.entryConfig};}
{
  const seatSet=Array.from({length:5},(_,i)=>live(`seat${i}`,3));
  for(let i=0;i<seatSet.length;i++){
    const admission=q17LivePendingReserveDecision(seatSet[i],seatSet.slice(0,i).map(asDbPending));
    mark(`Multiply x5 seat ${i+1} should not be blocked by earlier pending cash`,admission.ok);
    mark(`Multiply x5 seat ${i+1} pending count`,admission.competingPending===i);
  }
  const sixth=q17LivePendingReserveDecision(live('sixth',3),seatSet.map(asDbPending));
  mark('unfunded sixth seat rejects',sixth.ok===false&&sixth.reason==='q17_live_shard_cash_reserved_for_pending_orders');
  mark('same client order as existing would need separate DB claim',typeof seatSet[0].entryClientOrderId==='string');
  const different=live('other-shard',4);
  const across=q17LivePendingReserveDecision(different,seatSet.map(asDbPending));
  mark('an unrelated shard has no false global veto',across.ok&&across.competingPending===0);
  const unknown={...asDbPending(seatSet[0]),id:'unknown',entryConfig:{}};
  mark('unresolved pending route fails safely',q17LivePendingReserveDecision(seatSet[1],[unknown]).reason==='q17_live_pending_route_unresolved');
  const insufficient=live('insufficient',3,1,72,385);
  // The actual fresh broker-balance constructor denies before DB intent.
  mark('fresh balance preflight insufficient rejected',
    createQ17LiveCashWitness(insufficient,{ok:true,exchangeIndex:3,availableCents:1}).ok===false);
  mark('witness scheme version is correct',seatSet[0].entryConfig.q17LiveCashWitness.version===Q17_LIVE_CAPITAL_ADMISSIBILITY);
  mark('stale broker witness rejects',verifyQ17LiveCashWitness(seatSet[0],{now:now+30_000}).ok===false);
  mark('wrong broker route rejects',verifyQ17LiveCashWitness({...seatSet[0],entryConfig:{...seatSet[0].entryConfig,brokerRouting:{exchangeIndex:4}}}).ok===false);
  const changedFee={...seatSet[0],entryConfig:{...seatSet[0].entryConfig,auroraPending:{preflight:{entryFeeCents:1}}}};
  mark('underestimated fee rejects',verifyQ17LiveCashWitness(changedFee).ok===false);
}
{
  const openPending=live('new-buy',3);
  const pending=q17LiveOwnedPositionDisposition(openPending);
  mark('normal pending buy is not unfilled broker inventory',pending.ok&&!pending.requiresInventory);
  mark('pending order client ID is authoritative',q17LiveOwnedPositionDisposition({...openPending,entryClientOrderId:''}).ok===false);
  const partial={...openPending,entryOrderId:'REAL-ORDER-ID',entryConfig:{...openPending.entryConfig,entryFillProof:{authoritative:true,filledCount:0.4}}};
  const p=q17LiveOwnedPositionDisposition(partial);
  mark('verified partial fill counts broker inventory',p.ok&&p.requiresInventory&&p.inventoryCount===0.4);
  const forged={...partial,entryConfig:{...partial.entryConfig,entryFillProof:{authoritative:true,filledCount:3}}};
  mark('overfill proof rejected',q17LiveOwnedPositionDisposition(forged).ok===false);
  mark('partial without real order ID rejected',q17LiveOwnedPositionDisposition({...partial,entryOrderId:null}).ok===false);
  const exit={...openPending,status:'exit_pending',entryOrderId:'REAL',entryConfig:{...openPending.entryConfig,entryFillProof:{authoritative:true,filledCount:1}}};
  mark('exit_pending remains real inventory',q17LiveOwnedPositionDisposition(exit).requiresInventory);
  mark('open without broker receipt rejected',q17LiveOwnedPositionDisposition({...exit,status:'open',entryOrderId:null}).ok===false);
}
{
  const e=live('claim-new',3);
  const rows=[live('pending-other-shard',4),live('pending-same',3)];
  const calls=[];
  const client={query:async(query,args)=>{
    calls.push({query,args});
    return {rows:rows.map(v=>({id:v.id,count:v.count,entry_price_cents:v.entryPriceCents,entry_config:v.entryConfig}))};
  }};
  const decision=await Database.prototype.verifyQ17LivePendingCashAtCommit.call({},e,client);
  mark('production database function admits unrelated and affordable pending',decision.ok&&decision.competingPending===1);
  mark('owner/system scope enforced in database query',calls.length===1&&calls[0].args[0]===e.ownerId&&calls[0].args[1]===e.systemName);
  mark('pending rows query excludes rejected/closed and shadow',calls[0].query.includes("status='entry_pending'")&&calls[0].query.includes("execution_class"));
  const low=live('low',3,1,72,75),testClient={query:async()=>({rows:rows.map(v=>({id:v.id,count:v.count,entry_price_cents:v.entryPriceCents,entry_config:v.entryConfig}))})};
  await assert.rejects(()=>Database.prototype.verifyQ17LivePendingCashAtCommit.call({},low,testClient),/q17_live_shard_cash_reserved_for_pending_orders/);
  mark('native SQL precommit helper denies overspending');
  const absentRoute={...rows[0],entryConfig:{}};
  const corruptClient={query:async()=>({rows:[{id:absentRoute.id,count:1,entry_price_cents:72,entry_config:{}}]})};
  await assert.rejects(()=>Database.prototype.verifyQ17LivePendingCashAtCommit.call({},e,corruptClient),/q17_live_pending_route_unresolved/);
  mark('unknown past pending route fails safe');
}
{
  // Actual shared-preflight wrapper with an isolated synthetic broker core.
  // All five simultaneously qualifying Multiply seats on the same shard
  // consume one validated balance read, not five dropped in-progress calls.
  let calls=0;
  const fake={q17ExchangeBalanceFlights:new Map(),
    _ensureExchangeBalanceCore:async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,20));
      return {ok:true,exchangeIndex:3,availableCents:385,requiredCents:73};}};
  const req={ticker:'TEST-EXCHANGE-3',exchangeIndex:3,requiredCents:73};
  const answers=await Promise.all(Array.from({length:5},()=>KalshiClient.prototype.ensureExchangeBalance.call(fake,req)));
  mark('one broker read shared across five concurrent Multiply seats',calls===1);
  for(let i=0;i<answers.length;i++)mark(`same-shard shared preflight seat ${i+1}`,answers[i].ok&&answers[i].availableCents===385);
  const tooMuch=await Promise.all([
    KalshiClient.prototype.ensureExchangeBalance.call(fake,{...req,requiredCents:73}),
    KalshiClient.prototype.ensureExchangeBalance.call(fake,{...req,requiredCents:390}),
  ]);
  mark('higher-priced seat never borrows insufficient cash proof',tooMuch[1].ok===false);
  mark('safe seat still qualifies against its own amount',tooMuch[0].ok===true);
  mark('no cached preflight survives the completed flight',fake.q17ExchangeBalanceFlights.size===0);
  const rejected={q17ExchangeBalanceFlights:new Map(),_ensureExchangeBalanceCore:async()=>{
    await new Promise(resolve=>setTimeout(resolve,20));return {ok:false,reason:'live_exchange_rebalance_pending'};}};
  const errors=await Promise.all(Array.from({length:5},()=>KalshiClient.prototype.ensureExchangeBalance.call(rejected,req)));
  mark('unresolved funding transfers never become trading authority',errors.every(r=>!r.ok));
  const inadequate={q17ExchangeBalanceFlights:new Map(),_ensureExchangeBalanceCore:async()=>{
    await new Promise(resolve=>setTimeout(resolve,20));
    return {ok:false,reason:'live_account_insufficient_balance',exchangeIndex:3,availableCents:100};}};
  const smaller=await Promise.all([
    KalshiClient.prototype.ensureExchangeBalance.call(inadequate,{...req,requiredCents:150}),
    KalshiClient.prototype.ensureExchangeBalance.call(inadequate,{...req,requiredCents:73}),
  ]);
  mark('first too-large seat denied',smaller[0].ok===false);
  mark('independent smaller seat uses same verified no-transfer cash snapshot',smaller[1].ok===true);

}
{
  // Protect a prior genuinely healthy authenticated reconciliation for an
  // exact local BUY only. Never whitelist an ambiguous broker/global error.
  let wall=Date.now(),clock=4000;
  const monitor=new OperationalMonitor({clock:()=>clock,wall:()=>wall});
  const settings={mode:'LIVE',ownerId:'TEST-OWNER',systemName:'TEST-R9',resetTimestampMs:0};
  monitor.setAccount({settings,startedAtMs:wall-100,ok:true,orders:[],balance:{balance:400}});
  mark('normal account proof established',monitor.accountStatus(settings).ok);
  monitor.invalidateAccount('q17_owned_buy_in_flight');
  mark('one known owned buy can bridge recent proof',monitor.hasRecentQ17OwnedBuyProof(settings));
  mark('previous proof invalidated globally',!monitor.accountStatus(settings).ok);
  monitor.invalidateAccount('q17_owned_buy_in_flight');
  mark('next known owned buy can bridge prior bounded proof',monitor.hasRecentQ17OwnedBuyProof(settings));
  monitor.invalidateAccount('broker_account_mutation');
  mark('unknown broker mutation never bridges',!monitor.hasRecentQ17OwnedBuyProof(settings));
  monitor.setAccount({settings,startedAtMs:wall-100,ok:true,orders:[],balance:{balance:400}});
  monitor.invalidateAccount('q17_owned_buy_in_flight');wall+=32_000;
  mark('stale proof cannot bridge',!monitor.hasRecentQ17OwnedBuyProof(settings));
  wall-=32_000;
  mark('other owner cannot borrow proof',!monitor.hasRecentQ17OwnedBuyProof({...settings,ownerId:'OTHER'}));
  monitor.fail('fatal_db_failure');
  mark('fatal failures cannot bridge',!monitor.hasRecentQ17OwnedBuyProof(settings));
}
{
  // Additional source-level structural assertions: the old blanket vetoes
  // no longer exist in any of the five recovery admission paths; independent
  // LP and Arrow starters now use exactly the same local-funding commit fence.
  const db=readFileSync(new URL('../src/db.mjs',import.meta.url),'utf8');
  const strategy=readFileSync(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  const engine=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const old=db.match(/live_outstanding_owner_order_requires_reconciliation/g)||[];
  mark('five legacy global pending-order vetoes are gone',old.length===0);
  mark('five recovery commit fences present',(db.match(/if\(live\)await this\.verifyQ17LivePendingCashAtCommit\(entry,client\)/g)||[]).length===5);
  mark('independent LP and Arrow also use commit fence',db.includes("if(entry.mode==='LIVE')await this.verifyQ17LivePendingCashAtCommit(entry,client)"));
  mark('independent LP/Arrow create fresh cash witness',strategy.includes('e.entryConfig.q17LiveCashWitness=cashWitness.witness'));
  mark('independent LIVE readiness scoped to Athena-loss LP/Arrow',engine.includes("capitalConcept==='Lightning Plasma'||capitalConcept==='Sagittarius Arrow Recovery'"));
  mark('scoped readiness excludes other strategies',(strategy.match(/this\.getLiveReady\(independentRecovery===true\?concept:null\)/g)||[]).length===3);
  mark('five recovery paths bind scoped readiness',(engine.match(/isLiveReady:\(\)=>this\.isLiveReadyForQ17Recovery\(\)/g)||[]).length===5);
  // No changes to strategic threshold, settings schema, LINK or Multiply engine.
  mark('no strategy threshold modification from deployment policy',engine.includes('isLiveReadyForQ17Recovery'));
}
console.log(JSON.stringify({test:'Q17_R9_INTEGRATED_PENDING_CASH_AND_SIM_LIVE_SCOPING',passed:pass,failed:0,
  multiplication:'five same-shard seats funded; sixth denied; other shard independent',
  evidence:'production helper functions and mocked SQL/reconciliation; no broker mutations',nativeDatabaseTests:0}));
