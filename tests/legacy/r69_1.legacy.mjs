import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, RELEASE } from '../src/config.mjs';
import { StrategyEngine } from '../src/strategy.mjs';
import { SCARLET_NEEDLE, CRYSTAL_WALL, INFINITY_BREAK } from '../src/doctrine.mjs';

const quote=(ticker,bid,ask)=>({ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,updatedAtMs:Date.now(),status:'active',result:'',liveStatus:'live'});

function settings(overrides={}){
  return {...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r69-1-test',mode:'SIMULATION',liveArmed:false,engineActive:true,
    startingCapitalCents:1_000_000,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:45,maxSpreadCents:3,
    galacticExplosionEnabled:true,scarletNeedleEnabled:true,scarletNeedleStakeCents:500,scarletNeedleMinEntryCents:50,
    scarletNeedleMaxEntryCents:70,scarletNeedleInfinityNetPerOriginalContractCents:8,scarletNeedleMaxRepeats:1,simFeeCents:2,...overrides};
}

function db(initial=[]){
  const rows=new Map(initial.map(x=>[x.id,structuredClone(x)]));
  return {rows,audits:[],episodes:new Map(),locks:[],
    async audit(level,event,data){this.audits.push({level,event,data});},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async openEntries(){return [...rows.values()].filter(e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(structuredClone);},
    async openEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(structuredClone);},
    async openHunterEntriesByTicker(_s,t){return this.openEntriesByTicker(_s,t);},
    async acquireHunterTickerLock(_s,key){this.locks.push(key);return async()=>{};},
    async insertEntry(e){rows.set(e.id,structuredClone(e));},
    async updateEntry(id,patch){const e=rows.get(id);if(e)Object.assign(e,structuredClone(patch));},
    async entryById(id){const e=rows.get(id);return e?structuredClone(e):null;},
    async upsertOpportunityEpisode(ep){const prior=this.episodes.get(ep.id)||{};this.episodes.set(ep.id,{...structuredClone(prior),...structuredClone(ep)});return structuredClone(this.episodes.get(ep.id));},
  };
}

function market(freshQuote,{available=10000,higherLevelAvailable=0}={}){
  const q={...freshQuote};
  const book={updatedAtMs:Date.now(),yesBids:[{priceCents:q.yesBid,count:available}],noBids:[{priceCents:100-q.yesAsk,count:available}]};
  const executable=(count,limit)=>{
    if(q.yesAsk>Number(limit))return {filled:0,full:false,avgCents:0,bestCents:q.yesAsk};
    const canSweepHigher=Number(limit)>q.yesAsk;
    const visible=available+(canSweepHigher?higherLevelAvailable:0);
    const filled=Math.min(count,visible);
    const higher=Math.max(0,filled-available);
    const notional=Math.min(filled,available)*q.yesAsk+higher*(q.yesAsk+1);
    return {filled,full:visible>=count,avgCents:filled?notional/filled:0,bestCents:q.yesAsk,highestConsumedCents:higher>0?q.yesAsk+1:q.yesAsk};
  };
  return {
    async verifyTickerSnapshot(){return{marketFresh:true,bookFresh:true,quote:{...q},book:structuredClone(book),marketObservedAtMs:Date.now(),bookObservedAtMs:Date.now()};},
    executableAskFromBook(_book,count,limit){return executable(count,limit);},
    executableAsk(_ticker,count,limit){return executable(count,limit);},
    getQuote(){return {...q};},getBook(){return structuredClone(book);},bookAgeMs(){return 0;},quoteAgeMs(){return 0;},
  };
}

function parent(s,ticker='SN-R69-1'){
  return {id:`cw-${ticker}`,systemName:s.systemName,ownerId:s.ownerId,conceptName:SCARLET_NEEDLE.requiredParentConcept,ticker,eventTicker:ticker,
    marketTitle:ticker,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:59,
    pnlCents:100,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:Date.now()-60_000,closedAtMs:Date.now()-10,
    entryConfig:{side:'YES',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:`CRASH-${ticker}`},virtualInfinity:{version:INFINITY_BREAK.version,minimumNetPerOriginalContractCents:1}}};
}

function thirdProof(p,d=null){
  const parentOpened=Math.max(10_000,Number(p.openedAtMs||Date.now()));
  const firstClosed=parentOpened-3_000,secondOpened=firstClosed+500,secondClosed=parentOpened-500;
  const proof={version:SCARLET_NEEDLE.thirdProofVersion,policyRevision:SCARLET_NEEDLE.policyRevision,ticker:p.ticker,proofGroupIndex:1,pairing:SCARLET_NEEDLE.proofPairing,requiredConsecutiveProfitableShadowProofs:3,consecutiveProfitCount:3,proofStage:3,independentCrashEpisodes:true,sameExactTicker:true,lossResetsProof:true,
    firstProofEntryId:`first-${p.ticker}`,firstProofCrashEpisodeId:`CRASH-FIRST-${p.ticker}`,firstProofOpenedAtMs:firstClosed-10000,firstProofClosedAtMs:firstClosed,firstProofExitPriceCents:Number(p.entryPriceCents),firstProofRealizedPnlCents:10,
    secondProofEntryId:`second-${p.ticker}`,secondProofCrashEpisodeId:`CRASH-SECOND-${p.ticker}`,secondProofOpenedAtMs:secondOpened,secondProofClosedAtMs:secondClosed,secondProofExitPriceCents:Number(p.entryPriceCents),secondProofRealizedPnlCents:10,
    thirdProofEntryId:String(p.id),thirdProofCrashEpisodeId:String(p.entryConfig.crystalWall.crashEpisodeId),thirdProofOpenedAtMs:Number(p.openedAtMs),thirdProofClosedAtMs:Number(p.closedAtMs),thirdProofExitPriceCents:Number(p.exitPriceCents),thirdProofRealizedPnlCents:Number(p.pnlCents)};
  if(d?.rows){
    const first={...structuredClone(p),id:proof.firstProofEntryId,openedAtMs:proof.firstProofOpenedAtMs,closedAtMs:proof.firstProofClosedAtMs,exitPriceCents:proof.firstProofExitPriceCents,pnlCents:proof.firstProofRealizedPnlCents,entryConfig:{...structuredClone(p.entryConfig),crystalWall:{...structuredClone(p.entryConfig.crystalWall),crashEpisodeId:proof.firstProofCrashEpisodeId}}};
    const second={...structuredClone(p),id:proof.secondProofEntryId,openedAtMs:proof.secondProofOpenedAtMs,closedAtMs:proof.secondProofClosedAtMs,exitPriceCents:proof.secondProofExitPriceCents,pnlCents:proof.secondProofRealizedPnlCents,entryConfig:{...structuredClone(p.entryConfig),crystalWall:{...structuredClone(p.entryConfig.crystalWall),crashEpisodeId:proof.secondProofCrashEpisodeId}}};
    d.rows.set(first.id,structuredClone(first));d.rows.set(second.id,structuredClone(second));d.rows.set(p.id,structuredClone(p));
  }
  return proof;
}

function strategy({s,fresh,initial=[],available=10000,higherLevelAvailable=0,kalshi={},liveReady=false}){
  const d=db(initial),m=market(fresh,{available,higherLevelAvailable});
  const st=new StrategyEngine({db:d,kalshi,market:m,learning:{},getSettings:()=>s,getLiveReady:()=>liveReady,refreshGameClock:null,random:()=>0});
  return {d,m,st};
}

test('R69.2 runtime release and Scarlet doctrine identify the shadow-certified continuation branch',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-R69.6-JUSTICE-DIRECT-POST-SCARLET-2026-09-07');
  assert.equal(SCARLET_NEEDLE.policyRevision,'SN3-R5-THIRD-CONSECUTIVE-CW-PROOF');
});

test('R69.1 fresh book may move upward inside Scarlet band without stale handoff-ask choke',async()=>{
  const s=settings(),ticker='SN-UP';
  const evidence=quote(ticker,59,60),fresh=quote(ticker,60,61),p=parent(s,ticker),{st,d}=strategy({s,fresh});
  const e=await st.executeScarletContinuation(evidence,p,{authorizationId:`SCARLET-CONTINUATION:${p.id}:1`,authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.ok(e,JSON.stringify(st.entryPipelineSummary()));
  assert.equal(e.entryPriceCents,61);
  assert.equal(e.count,8,'quantity must be recomputed from the fresh ask so the 500c stake is not overspent');
  assert.ok(e.entryPriceCents*e.count<=s.scarletNeedleStakeCents);
  assert.equal(e.entryConfig.athenaFire.entryPriceCents,60,'sealed authority retains the evidence price');
  assert.equal(e.entryConfig.athenaFire.authorizedMaxEntryCents,70,'authority follows operator band, not the single handoff ask');
  assert.equal(e.entryConfig.scarletContinuation.authorizationPricePolicy,'OPERATOR_BAND_CAPPED_BY_TARGET_FEASIBILITY');
  assert.equal(e.entryConfig.economicTarget.executionEntryPriceCents,61);
  assert.equal(e.entryConfig.economicTarget.requiredTargetBidCents,73,'8c net + two 2c SIM fees is revalidated from actual execution price');
  assert.equal(e.entryConfig.economicTarget.authorizationSnapshot.requiredTargetBidCents,72);
});

test('R69.1 Scarlet authorization is capped below operator max when the configured net target would become unreachable',async()=>{
  const s=settings({scarletNeedleMaxEntryCents:95,scarletNeedleInfinityNetPerOriginalContractCents:15}),ticker='SN-CAP';
  const q=quote(ticker,69,70),p=parent(s,ticker),{st,d}=strategy({s,fresh:q});
  const e=await st.executeScarletContinuation(q,p,{authorizationId:`SCARLET-CONTINUATION:${p.id}:1`,authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.ok(e);
  assert.equal(e.entryConfig.athenaFire.authorizedMaxEntryCents,80,'80 + 15 target + 4 SIM fees = 99c; 81c would be unreachable');
});

test('R69.1 price outside Scarlet band remains fail-closed',async()=>{
  const s=settings(),ticker='SN-OOB';
  const evidence=quote(ticker,59,60),fresh=quote(ticker,70,71),p=parent(s,ticker),{st,d}=strategy({s,fresh});
  const e=await st.executeScarletContinuation(evidence,p,{authorizationId:`SCARLET-CONTINUATION:${p.id}:1`,authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.equal(e,null);assert.equal([...d.rows.values()].filter(x=>x.conceptName==='Scarlet Needle').length,0);
  assert.ok((st.entryPipelineSummary().byReason.no_executable_ask||0)>=1,'book walk must not consume above sealed 70c authorization');
});

test('R69.1 shared spread and full-depth safety remain unchanged',async()=>{
  const s=settings(),ticker='SN-SAFE',p=parent(s,ticker),evidence=quote(ticker,59,60);
  const wide=strategy({s,fresh:quote(ticker,57,61)});assert.equal(await wide.st.executeScarletContinuation(evidence,p,{authorizationId:'SN-WIDE',authorizedAtMs:Date.now(),thirdProof:thirdProof(p,wide.d)}),null);
  assert.ok((wide.st.entryPipelineSummary().byReason.shared_spread_safety||0)>=1);
  const shallow=strategy({s,fresh:quote(ticker,60,61),available:3});assert.equal(await shallow.st.executeScarletContinuation(evidence,p,{authorizationId:'SN-SHALLOW',authorizedAtMs:Date.now(),thirdProof:thirdProof(p,shallow.d)}),null);
  assert.ok((shallow.st.entryPipelineSummary().byReason.scarlet_needle_full_configured_size_unavailable||0)>=1);
});

test('R69.1 event exposure cap remains a hard Scarlet risk boundary',async()=>{
  const s=settings({maxEntriesPerTrade:1}),ticker='SN-EVENT',evidence=quote(ticker,59,60),fresh=quote(ticker,60,61),p=parent(s,ticker);
  const other={id:'other-open',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Momentum Hunter',ticker:'OTHER-TICKER',eventTicker:ticker,status:'open',openedAtMs:Date.now()-1000};
  const {st,d}=strategy({s,fresh,initial:[other]});
  const e=await st.executeScarletContinuation(evidence,p,{authorizationId:'SN-EVENT-CAP',authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.equal(e,null);assert.ok((st.entryPipelineSummary().byReason.event_entry_cap||0)>=1);
});


test('R69.1 full-depth proof may not sweep above the fresh best ask merely because the Scarlet band authorizes a higher price',async()=>{
  const s=settings(),ticker='SN-NO-SWEEP',evidence=quote(ticker,59,60),fresh=quote(ticker,60,61),p=parent(s,ticker);
  const {st,d}=strategy({s,fresh,available:3,higherLevelAvailable:100});
  const e=await st.executeScarletContinuation(evidence,p,{authorizationId:'SN-NO-SWEEP',authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.equal(e,null);assert.equal([...d.rows.values()].filter(x=>x.conceptName==='Scarlet Needle').length,0);
  assert.ok((st.entryPipelineSummary().byReason.scarlet_needle_full_configured_size_unavailable||0)>=1,'depth at 62c must not be borrowed to satisfy a 61c fresh entry');
});

test('R69.1 LIVE Scarlet submits the same fresh best-ask limit and fresh stake-sized quantity proven by execution revalidation',async()=>{
  const s=settings({mode:'LIVE',liveArmed:true}),ticker='SN-LIVE-UP';
  const evidence={...quote(ticker,59,60),exchangeIndex:0},fresh={...quote(ticker,60,61),exchangeIndex:0},p=parent(s,ticker);
  p.mode='LIVE';
  const orders=[];
  const kalshi={
    buildClientOrderId:()=> 'r69-live-client',
    ensureExchangeBalance:async({requiredCents})=>({ok:true,exchangeIndex:0,availableCents:100_000,requiredCents}),
    async placeOrder(args){orders.push(structuredClone(args));return{ok:true,orderId:'r69-live-order',fillCount:8,averageFillPriceCents:61,feePaidCents:8,httpStatus:201};},
  };
  const {st,d}=strategy({s,fresh,kalshi,liveReady:true});
  const e=await st.executeScarletContinuation(evidence,p,{authorizationId:'SN-LIVE-UP',authorizedAtMs:Date.now(),thirdProof:thirdProof(p,d)});
  assert.ok(e,JSON.stringify(st.entryPipelineSummary()));
  assert.equal(orders.length,1);assert.equal(orders[0].priceCents,61,'LIVE BUY limit must use the fresh proven ask, never the stale 60c handoff ask');
  assert.equal(orders[0].count,8);assert.equal(orders[0].timeInForce,'fill_or_kill');
  assert.equal(e.entryPriceCents,61);assert.equal(e.count,8);assert.equal(e.status,'open');
});
