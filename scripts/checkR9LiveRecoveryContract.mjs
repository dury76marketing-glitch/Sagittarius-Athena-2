#!/usr/bin/env node
// Q-17 R9 integrated LIVE runtime dispatch checks. Synthetic dependency boundaries only.
// This is NOT a native PostgreSQL or authenticated broker test.
import assert from 'node:assert/strict';
import {parseMarket,KalshiClient,signedPath} from '../src/kalshi.mjs';
import {Q17_SIM_ONLY,q17AssertPublicMarketRequest} from '../src/q17Profile.mjs';
import {
  dispatchGreatHornLiveIntent,
  dispatchCrystalWallLiveIntent,dispatchSagittariusArrowLiveIntent,
  dispatchScarletNeedleCapitalLiveIntent,dispatchPegasusRyuSeiKenCapitalLiveIntent,
} from '../src/q17LiveRecoveryAdapter.mjs';

const profiles={
  gh:['Great Horn Recovery','greatHornRecovery','greatHornEnabled'],
  cw:['Crystal Wall Recovery','crystalWallRecovery','crystalWallRecoveryEnabled'],
  sa:['Sagittarius Arrow Recovery','sagittariusArrowRecovery','sagittariusArrowEnabled'],
  sn:['Scarlet Needle Recovery','scarletNeedleCapitalRecovery','scarletNeedleCapitalEnabled'],
  pr:['Pegasus Ryu Sei Ken Recovery','pegasusRyuSeiKenCapitalRecovery','pegasusRyuSeiKenCapitalEnabled'],
};
let cases=0;const passed={};
function mark(label){cases++;passed[label]=(passed[label]||0)+1;}
function fixture(kind,link,{scenario='ack',bookAge=0,bookDepth=25,quoteAsk=71}={}){
  const [name,key,enabled]=profiles[kind];if(!name)throw Error('kind');
  const now=Date.now(),marketTicker='KXTEST-26NOV21-RECOVERY',eventTicker='KXTEST-26NOV21';
  const quote={ticker:marketTicker,eventTicker,status:'active',bookInvalid:false,result:'',
    yesBid:69,yesAsk:quoteAsk,quoteAtMs:now-bookAge};
  const book={ticker:marketTicker,updatedAtMs:now-bookAge,sequenceValid:true,
    yesBids:[{priceCents:69,count:bookDepth}],noBids:[{priceCents:29,count:bookDepth}]};
  const source={id:`${kind}-${link?'on':'off'}-1`,conceptName:name,mode:'LIVE',executionClass:'CAPITAL',
    status:'entry_pending',entryOrderId:null,entryClientOrderId:`sagc-test-owner-${kind}-seat-1`,
    ticker:marketTicker,eventTicker,ownerId:'TEST_OWNER',systemName:'Q17-LAB',count:1,
    entryPriceCents:72,entryFeeCents:0,remainingCount:1,entryConfig:{
      resetTimestampMs:0,brokerRouting:{exchangeIndex:3},
      [key]:{watchId:`w-${kind}`,parentEntryId:`parent-${kind}`,capturedSettings:{link}},
      auroraPending:{preflight:{entryFeeCents:10}}}};
  const settings={mode:'LIVE',liveArmed:true,engineActive:true,ownerId:'TEST_OWNER',systemName:'Q17-LAB',
    resetTimestampMs:0,[enabled]:true,infinityBreakMaximumBookAgeMs:5000};
  const state={claimed:false,rejected:false,mutations:0,transportCalls:0,networkSends:0,
    verificationCalls:0,claimAttempts:0,patches:[],revision:7};
  const db={
    async claimQ17RecoveryLiveDispatch(e,{safetyRevision}){
      state.claimAttempts++;
      if(scenario==='race_claim_failure'||state.claimed||safetyRevision!==7)return {ok:false,reason:'claim_conflict'};
      state.claimed=true;state.mutations++;
      return {ok:true,entry:{...e,entryConfig:{...e.entryConfig,q17LiveDispatch:{state:'TRANSMISSION_MAY_HAVE_STARTED'}}}};
    },
    async updateEntry(id,patch,exit,expected){
      assert.equal(id,source.id);assert.equal(exit,null);assert.equal(expected.entryConfig.q17LiveDispatch?.state,'TRANSMISSION_MAY_HAVE_STARTED');
      assert.equal(patch.status,'entry_pending');assert(!('entryFeeCents' in patch));assert(!('count' in patch));
      assert(!('entryFillProof' in (patch.entryConfig||{})));state.patches.push(patch);state.mutations++;
    },
  };
  for(const k of Object.keys(profiles)){
    const [,,flag]=profiles[k];
    if(flag!==enabled)continue;
    const methods={gh:['verifyGreatHornLiveIntent','rejectGreatHornUnsubmittedIntent'],
      cw:['verifyCrystalWallLiveIntent','rejectCrystalWallUnsubmittedIntent'],
      sa:['verifySagittariusArrowLiveIntent','rejectSagittariusArrowUnsubmittedIntent'],
      sn:['verifyScarletNeedleCapitalLiveIntent','rejectScarletNeedleCapitalUnsubmittedIntent'],
      pr:['verifyPegasusRyuSeiKenCapitalLiveIntent','rejectPegasusRyuSeiKenCapitalUnsubmittedIntent']}[kind];
    db[methods[0]]=async (e)=>{
      state.verificationCalls++;
      if(scenario==='parent_invalid')return {ok:false,reason:'verified_parent_loss_missing'};
      if(state.claimed||e.entryClientOrderId!==source.entryClientOrderId)return {ok:false,reason:'entry_already_claimed'};
      return {ok:true};
    };
    db[methods[1]]=async (e)=>{
      assert.equal(e.entryConfig.q17LiveDispatch?.state,'TRANSMISSION_MAY_HAVE_STARTED');
      state.rejected=true;state.mutations++;return {ok:true};
    };
  }
  const market={async refreshTickerVerified(){
    return {marketFresh:true,bookFresh:true,quote,book,bookObservedAtMs:book.updatedAtMs};
  },getBook(){return book;},getQuote(){return quote;}};
  const kalshi={async ensureExchangeBalance({exchangeIndex,requiredCents}){
    if(scenario==='no_funding')return {ok:false,reason:'insufficient_cash'};
    return {ok:true,exchangeIndex,requiredCents};
  },async placeOrder(order,{beforeDispatch,confirmDispatch}){
    state.transportCalls++;
    if(scenario==='change_revision')state.revision++;
    const decision=await beforeDispatch();
    if(!decision.ok)return {ok:false,notSubmitted:true,localRejectionReason:decision.reason};
    if(scenario==='late_depleted_book')book.noBids=[{priceCents:29,count:0}];
    if(scenario==='late_worsened_quote')quote.yesAsk=75;
    const final=confirmDispatch();
    if(!final.ok)return {ok:false,notSubmitted:true,localRejectionReason:final.reason};
    if(scenario==='no_send')return {notSubmitted:true,localRejectionReason:'pre_transport_failure'};
    state.networkSends++;
    assert.equal(order.action,'buy');assert.equal(order.exchangeIndex,3);
    assert.equal(order.timeInForce,'immediate_or_cancel');assert.equal(order.clientOrderId,source.entryClientOrderId);
    if(scenario==='throw_transport')throw Error('transport_connection_lost');
    if(scenario==='ambiguous')return {ok:false,ambiguous:true,httpStatus:0,orderId:null};
    if(scenario==='missing_id')return {ok:true,fillCount:1,httpStatus:201,orderId:null};
    return {ok:true,fillCount:1,httpStatus:201,orderId:`broker-order-${kind}`};
  }};
  return {entry:source,settings,state,db,market,kalshi,ctx:{entry:source,settings,db,market,kalshi,
    isLiveReady:()=>true,readSettings:()=>settings,readSafetyRevision:()=>state.revision}};
}

assert.equal(Q17_SIM_ONLY,false,'R9 runtime LIVE adapter must be present');mark('R9 compiled LIVE transport allowed under policy');
const routes={gh:dispatchGreatHornLiveIntent,cw:dispatchCrystalWallLiveIntent,sa:dispatchSagittariusArrowLiveIntent,
  sn:dispatchScarletNeedleCapitalLiveIntent,pr:dispatchPegasusRyuSeiKenCapitalLiveIntent};
for(const kind of Object.keys(profiles))for(const link of [true,false]){
  const f=fixture(kind,link);
  const result=await routes[kind](f.ctx);
  assert.equal(result.pending,true,`${kind}/${link}: ${result.reason}`);
  assert.equal(result.reason,'live_recovery_order_receipt_awaiting_authoritative_readback');
  assert.equal(f.state.claimed,true);assert.equal(f.state.networkSends,1);
  assert.equal(f.state.patches.length,1);assert.equal(f.state.patches[0].status,'entry_pending');
  assert(!('entryFillProof' in f.state.patches[0]));
  assert.equal(f.entry.entryConfig[profiles[kind][1]].capturedSettings.link,link);
  mark('LINK ON/OFF proof-to-pending-handoff');
  const again=await routes[kind](f.ctx);
  assert.equal(again.ok,false);assert.equal(f.state.networkSends,1);
  mark('duplicate dispatch denied');
}
for(const kind of Object.keys(profiles)){
  for(const [scenario,expect] of [
    ['parent_invalid',{sends:0,claim:0,pending:false}],
    ['no_funding',{sends:0,claim:0,pending:false}],
    ['race_claim_failure',{sends:0,claim:0,pending:false}],
    ['change_revision',{sends:0,claim:0,pending:false}],
    ['no_send',{sends:0,claim:1,pending:false}],
    ['late_depleted_book',{sends:0,claim:1,pending:false}],
    ['late_worsened_quote',{sends:0,claim:1,pending:false}],
    ['ambiguous',{sends:1,claim:1,pending:true}],
    ['throw_transport',{sends:1,claim:1,pending:true}],
    ['missing_id',{sends:1,claim:1,pending:true}],
  ]){
    const f=fixture(kind,false,{scenario});
    const r=await routes[kind](f.ctx);
    assert.equal(r.pending,expect.pending,`${kind}/${scenario} pending ${r.reason}`);
    assert.equal(f.state.claimed,Boolean(expect.claim),`${kind}/${scenario} claimed`);
    assert.equal(f.state.networkSends,expect.sends,`${kind}/${scenario} sends`);
    if(scenario==='no_send')assert.equal(f.state.rejected,true);
    if(expect.pending)assert.equal(f.state.rejected,false);
    mark('adversarial receipt/claim/balance/parent/revision');
  }
  for(const [config,label] of [[{bookAge:9000},'stale executable book'],
    [{bookDepth:0.5},'fractional book insufficient'],
    [{quoteAsk:75},'worsened market above limit']]){
    const f=fixture(kind,true,config);
    const r=await routes[kind](f.ctx);
    assert.equal(r.pending,false,`${kind} ${label} ${r.reason}`);
    assert.equal(f.state.networkSends,0);assert.equal(f.state.claimed,false);
    mark(label);
  }
  const f=fixture(kind,true);
  f.settings.ownerId='WRONG_OWNER';
  const r=await routes[kind](f.ctx);
  assert.equal(r.pending,false);assert.equal(f.state.networkSends,0);
  mark('wrong owner denied');
}
const timestamp='2026-11-21T09:00:00Z';
assert.equal(parseMarket({ticker:'TEST',latest_expiration_time:timestamp}).closeTimeMs,Date.parse(timestamp));
mark('market latest expiration migration');
assert.equal(parseMarket({ticker:'TEST',close_time:'2026-11-22T10:00:00Z',latest_expiration_time:timestamp}).closeTimeMs,Date.parse('2026-11-22T10:00:00Z'));
mark('market close-time precedence');
const broker=new KalshiClient(null,'https://external-api.kalshi.com/trade-api/v2');
const order=broker.buildOrder({ticker:'TEST-OUTCOME',action:'buy',count:2,priceCents:71,clientOrderId:'sagc-unit-test',exchangeIndex:3});
assert.equal(order.side,'bid');assert.equal(order.count,'2.00');assert.equal(order.price,'0.7100');
assert.equal(order.exchange_index,3);assert.equal(order.subaccount,0);mark('Kalshi V2 order fields');
assert.equal(signedPath('https://external-api.kalshi.com/trade-api/v2','/portfolio/events/orders?test=1'),'/trade-api/v2/portfolio/events/orders');
mark('Kalshi signing path');
assert.throws(()=>q17AssertPublicMarketRequest('POST','/portfolio/events/orders'),/q17_live_transport_disabled_by_deployment/);
const oldFetch=globalThis.fetch;let sendCount=0;globalThis.fetch=()=>{sendCount++;throw new Error('forbidden outbound network');};
try{const noSend=await broker.placeOrder({ticker:'TEST',action:'buy',count:1,priceCents:71,clientOrderId:'untrusted'});assert.equal(noSend.ok,false);assert.equal(sendCount,0);}finally{globalThis.fetch=oldFetch;}
mark('default deployment order transport disabled');
console.log(JSON.stringify({kind:'SYNTHETIC_MOCKED_INTEGRATION',passed:cases,failed:0,coverage:passed,realBrokerOrders:0,nativeDatabaseTests:0}));
