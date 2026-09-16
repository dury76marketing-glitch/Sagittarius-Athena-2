import test from 'node:test';
import assert from 'node:assert/strict';
import { MarketHub, MARKET_TRUTH_REVISION, MARKET_RUNTIME_MAINTENANCE } from '../src/market.mjs';
import { StrategyEngine } from '../src/strategy.mjs';
import { SagittariusEngine, RUNTIME_RESOURCE_GOVERNOR, RECOVERY_WATCH_EXECUTION_GOVERNOR } from '../src/engine.mjs';
import { originalSettings } from '../src/config.mjs';

const activeQuote=(ticker='R67',bid=40,ask=41)=>({
  ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,status:'active',result:'',
  updatedAtMs:Date.now(),quoteAtMs:Date.now(),bookInvalid:false,
});

function streamState(sid=7){
  return {sid,lastSeq:10,tickers:new Set(),pendingSnapshots:new Set(),pendingDeltas:new Map(),recoveryOverflow:new Set(),snapshotInFlight:new Map(),snapshotAttempts:new Map(),recovering:false};
}

test('R67 MHF5 non-destructive execution verification leaves canonical WS continuity intact',async()=>{
  let onQuote=0;
  const hub=new MarketHub({
    kalshi:{
      async getMarket(ticker){return {...activeQuote(ticker,50,51),updatedAtMs:Date.now()};},
      async getOrderbook(ticker){return {ticker,yesBids:[{priceCents:50,count:20}],noBids:[{priceCents:49,count:20}],updatedAtMs:Date.now()};},
    },wsUrl:'',fallbackWsUrl:'',getCredentials:()=>null,onQuote:()=>{onQuote+=1;},
  });
  const ticker='R67-MHF5';
  const canonical={ticker,yesBids:[{priceCents:40,count:20}],noBids:[{priceCents:59,count:20}],updatedAtMs:Date.now(),source:'WS',sid:7,seq:10,sequenceValid:true,invalidReason:null};
  hub.quotes.set(ticker,activeQuote(ticker,40,41));
  hub.books.set(ticker,canonical);
  const state=streamState(7);state.tickers.add(ticker);hub.orderbookStreams.set(7,state);

  const proof=await hub.verifyTickerSnapshot(ticker);
  assert.equal(MARKET_TRUTH_REVISION,'R67-MHF5-VERIFIED-SNAPSHOT-ISOLATION-2026-09-06');
  assert.equal(proof.marketFresh,true);assert.equal(proof.bookFresh,true);assert.equal(proof.canonicalBookMutated,false);
  assert.equal(proof.quote.yesBid,50);assert.equal(proof.quote.yesAsk,51);
  assert.equal(hub.books.get(ticker),canonical,'REST proof must not replace the canonical WS object');
  assert.equal(hub.books.get(ticker).source,'WS');assert.equal(hub.books.get(ticker).sid,7);assert.equal(hub.books.get(ticker).seq,10);
  assert.equal(onQuote,0,'verification must not recursively wake quote observers');
  assert.equal(hub.bookIntegrityStats.recoveryRequests,0);

  // The next contiguous WS delta must apply normally instead of entering the
  // old rest_book_requires_ws_snapshot recovery cycle.
  hub.handle({type:'orderbook_delta',sid:7,seq:11,msg:{market_ticker:ticker,side:'yes',price_dollars:'0.40',delta_fp:1,ts_ms:Date.now()}});
  assert.equal(hub.books.get(ticker).source,'WS');assert.equal(hub.books.get(ticker).seq,11);
  assert.equal(hub.bookIntegrityStats.recoveryRequests,0);
  assert.equal(state.pendingSnapshots.size,0);
  assert.equal(onQuote,1);
});

test('R67 entry execution consumes the isolated fresh REST book rather than stale canonical depth',async()=>{
  let freshWalks=0,canonicalWalks=0;
  const book={yesBids:[{priceCents:41,count:20}],noBids:[{priceCents:58,count:20}],updatedAtMs:Date.now(),source:'REST',sequenceValid:true};
  const market={
    async verifyTickerSnapshot(ticker){return {marketFresh:true,bookFresh:true,quote:{...activeQuote(ticker,41,42)},book,bookObservedAtMs:12345};},
    executableAskFromBook(received,count,limit){freshWalks+=1;assert.equal(received,book);assert.equal(limit,43);return {filled:count,full:true,avgCents:42,bestCents:42};},
    executableAsk(){canonicalWalks+=1;throw new Error('canonical executableAsk must not be used');},
  };
  const ctx={market,audit:async()=>{}};
  const plan=await StrategyEngine.prototype.prepareEntryExecution.call(ctx,activeQuote('ENTRY',42,43),10);
  assert.ok(plan);assert.equal(plan.count,10);assert.equal(plan.averagePriceCents,42);assert.equal(plan.bestAskCents,42);assert.equal(plan.verifiedBookAtMs,12345);
  assert.equal(freshWalks,2);assert.equal(canonicalWalks,0);
});

test('R67 MRM1 housekeeping prunes only non-wanted caches, releases orphan recovery buffers, and keeps wanted truth',()=>{
  const hub=new MarketHub({kalshi:{},wsUrl:'',fallbackWsUrl:'',getCredentials:()=>null});
  const now=100_000;
  for(const ticker of ['KEEP','KEEP2','OLD']){
    hub.quotes.set(ticker,activeQuote(ticker));
    hub.books.set(ticker,{ticker,yesBids:[{priceCents:40,count:10}],noBids:[{priceCents:59,count:10}],updatedAtMs:now,source:'WS',sid:7,seq:10,sequenceValid:true});
    hub.histories.set(ticker,[{t:now,bid:40,ask:41}]);
  }
  hub.wanted=new Set(['KEEP','KEEP2']);
  const state=streamState(7);state.tickers=new Set(['KEEP','KEEP2','OLD']);state.pendingSnapshots.add('KEEP2');
  state.pendingDeltas.set('KEEP',[{seq:9,msg:{}}]); // orphan: no pending/in-flight snapshot
  state.snapshotInFlight.set('KEEP2',{requestId:99,requestedAtMs:1});
  hub.orderbookStreams.set(7,state);
  hub.recoverySnapshotCommands.set(99,{requestId:99,sid:7,tickers:new Set(['KEEP2']),requestedAtMs:1});
  hub.runtimeMaintenance.lastInvalidRefreshAtMs=now;

  const result=hub.maintenance({now,pressureState:'HARD_RESEARCH_SHED'});
  assert.equal(MARKET_RUNTIME_MAINTENANCE.version,'MRM1');
  assert.equal(result.removed.quotes,1);assert.equal(result.removed.books,1);assert.equal(result.removed.histories,1);
  assert.equal(hub.quotes.has('KEEP'),true);assert.equal(hub.books.has('KEEP2'),true);assert.equal(hub.quotes.has('OLD'),false);
  assert.equal(result.orphanDeltaBuffersReleased,1);assert.equal(state.pendingDeltas.has('KEEP'),false);
  assert.equal(result.staleCommandsReleased,1);assert.equal(hub.recoverySnapshotCommands.has(99),false);assert.equal(state.snapshotInFlight.has('KEEP2'),false);
});

test('R67 MRM1 invalid-book refresher is bounded and becomes more conservative under hard pressure',()=>{
  const hub=new MarketHub({kalshi:{},wsUrl:'',fallbackWsUrl:'',getCredentials:()=>null});
  let repairs=0;hub.resyncBook=async()=>{repairs+=1;};
  for(let i=0;i<10;i++){const ticker=`BAD${i}`;hub.wanted.add(ticker);hub.quotes.set(ticker,{...activeQuote(ticker),bookInvalid:true});}
  hub.maintenance({now:100_000,pressureState:'HARD_RESEARCH_SHED'});
  assert.equal(repairs,2);assert.equal(hub.runtimeMaintenance.invalidBooksRefreshed,2);
  hub.runtimeMaintenance.lastInvalidRefreshAtMs=0;repairs=0;
  hub.maintenance({now:200_000,pressureState:'GREEN'});
  assert.equal(repairs,MARKET_RUNTIME_MAINTENANCE.invalidBookRefreshMaximum);
});

test('R67 RWG1 READY retry cadence is state/price aware and cannot run at quote rate',()=>{
  const engine=Object.create(SagittariusEngine.prototype);
  const prior={status:'READY',lastAttemptQueuedAtMs:1_000,lastAttemptBidCents:50,lastAttemptAskCents:51,retryNotBeforeMs:0};
  const unchanged={qualified:true,bidCents:50,askCents:51};
  const changed={qualified:true,bidCents:51,askCents:52};
  assert.equal(engine.recoveryWatchShouldQueue(prior,unchanged,4_999),false);
  assert.equal(engine.recoveryWatchShouldQueue(prior,unchanged,6_000),true);
  assert.equal(engine.recoveryWatchShouldQueue(prior,changed,1_999),false);
  assert.equal(engine.recoveryWatchShouldQueue(prior,changed,2_000),true);
  assert.equal(RECOVERY_WATCH_EXECUTION_GOVERNOR.unchangedReadyRetryMs,5_000);
  const blocked={...prior,retryNotBeforeMs:10_000};
  assert.equal(engine.recoveryWatchShouldQueue(blocked,changed,9_999),false);
});

function recoveryAttemptEngine({justice=false}={}){
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r67-owner',mode:'SIMULATION',engineActive:true,recoveryHunterEnabled:!justice,justiceArrowEnabled:justice,recoveryTrackingHours:24,recoveryStakeCents:500,justiceArrowStakeCents:500};
  const parentClosedAtMs=Date.now()-2_000,parentScarletEntryId='SCARLET:LOCK';
  const authorizationId=justice?`JUSTICE-ARROW-V3:SCARLET:${parentScarletEntryId}`:'CRYSTAL-WALL-V3:CI1:LOCK';
  const watch=justice?{authorizationId,observationId:`JUSTICE-ARROW-V3:OBS:${parentScarletEntryId}`,ticker:'LOCK',eventTicker:'LOCK',sport:'Tennis',authorizedAtMs:Date.now()-1_000,observationStartedAtMs:parentClosedAtMs,preCrashPeakCents:56,troughCents:55,troughAtMs:Date.now()-1_000,crashDepthCents:1,crashStartedAtMs:Date.now()-1_000,ownCrashArmed:true,reboundCents:1,lastBidCents:56,upwardTicks:1,lastAttemptQueuedAtMs:Date.now(),status:'READY',qualified:true,parentScarletEntryId,postScarletContinuation:true,directPostScarletObservation:true,parentScarletClosedAtMs:parentClosedAtMs,parentScarletExitPriceCents:55,parentScarletVersion:'SCARLET-NEEDLE-V3',parentScarletPolicyRevision:'SN3-R5-THIRD-CONSECUTIVE-CW-PROOF',parentScarletAuthorizationId:'SCARLET:AUTH'}:{authorizationId,crashEpisodeId:'CI1:LOCK',ticker:'LOCK',eventTicker:'LOCK',sport:'Tennis',crashStartedAtMs:Date.now()-1_000,authorizedAtMs:Date.now()-1_000,preCrashPeakCents:70,troughCents:35,crashDepthCents:35,lastBidCents:39,upwardTicks:1,lastAttemptQueuedAtMs:Date.now(),status:'READY'};
  engine.recoveryPriorityTickers=new Set(['LOCK']);
  engine.entryExecutionGate=()=>({allowed:true,reason:'ok'});
  engine.marketReads=0;engine.strategyCalls=0;
  engine.market={getQuote:()=>{engine.marketReads+=1;return activeQuote('LOCK',40,41);}};
  const concept=justice?'Sagittarius Justice Arrow':'Recovery Hunter';
  const parent={id:parentScarletEntryId,systemName:'SAGITTARIUS',ownerId:'r67-owner',mode:'SIMULATION',conceptName:'Scarlet Needle',ticker:'LOCK',eventTicker:'LOCK',status:'closed',remainingCount:0,pnlCents:100,closeReason:'infinity_break',closedAtMs:parentClosedAtMs,exitPriceCents:55,entryConfig:{profitAuthority:'INFINITY-BREAK-V1',scarletContinuation:{version:'SCARLET-NEEDLE-V3',policyRevision:'SN3-R5-THIRD-CONSECUTIVE-CW-PROOF',authorizationId:'SCARLET:AUTH'}}};
  const durableEpisode={id:authorizationId,athenaDecision:{decision:'AUTHORIZED',justiceArrow:{version:'SAGITTARIUS-JUSTICE-ARROW-V3',policyRevision:'SJA3-R2-DIRECT-POST-SCARLET-OWN-CONFIRMATION-ATHENA-X1',status:'OWN_CRASH_ARMED',authorizationId,observationId:`JUSTICE-ARROW-V3:OBS:${parentScarletEntryId}`,parentScarletEntryId,postScarletContinuation:true,directPostScarletObservation:true,observationStartedAtMs:parentClosedAtMs,crashStartedAtMs:Date.now()-1_000,ownCrashArmed:true}},boltSnapshot:{parentScarletEntryId,observationId:`JUSTICE-ARROW-V3:OBS:${parentScarletEntryId}`},entryId:null};
  engine.db={
    async acquireHunterTickerLock(){return async()=>{};},async opportunityEpisode(){return justice?structuredClone(durableEpisode):null;},async entryById(id){return justice&&id===parentScarletEntryId?structuredClone(parent):null;},async upsertOpportunityEpisode(){},async audit(){},
    async openEntriesByTicker(){return [{id:'already-open',conceptName:concept,ticker:'LOCK',ownerId:'r67-owner',mode:'SIMULATION',status:'open'}];},
  };
  engine.strategy=justice?{async executeJusticeArrowContinuation(){engine.strategyCalls+=1;return null;}}:{async executeCrystalWallAttack(){engine.strategyCalls+=1;return null;}};
  if(justice){engine.justiceArrowWatches=new Map([[authorizationId,watch]]);engine.justiceArrowInFlight=new Set();engine.justiceArrowContinuationStats=null;}
  else{engine.crystalWallWatches=new Map([[authorizationId,watch]]);engine.crystalWallContinuationInFlight=new Set();engine.crystalWallContinuationStats=null;}
  return {engine,authorizationId};
}

test('R67 1000 unchanged READY quote events collapse to bounded execution retries instead of REST-at-quote-rate churn',()=>{
  const engine=Object.create(SagittariusEngine.prototype),id='STRESS';
  engine.crystalWallWatches=new Map([[id,{status:'READY',lastAttemptQueuedAtMs:1_000,lastAttemptBidCents:50,lastAttemptAskCents:51,retryNotBeforeMs:0,lastBidCents:50}]]);
  const signal={qualified:true,bidCents:50,askCents:51,lastBidCents:50};
  let queued=0;
  for(let i=1;i<=1_000;i++){
    const now=1_000+i*10,prior=engine.crystalWallWatches.get(id);
    if(engine.recoveryWatchShouldQueue(prior,signal,now)){engine.stampRecoveryWatchAttempt(engine.crystalWallWatches,id,signal,now);queued+=1;}
  }
  assert.equal(queued,2,'10 seconds of 100 Hz unchanged READY quotes may schedule only two 5-second retries');
});

test('R69.2 real same-ticker exposure cannot block Crystal Wall shadow observation',async()=>{
  const {engine,authorizationId}=recoveryAttemptEngine();
  engine.crystalWallConsumedEpisodeIds=new Set();
  const out=await engine.attemptCrystalWallAttack(authorizationId);
  assert.equal(out.status,'WATCHING');assert.equal(out.reason,'shadow_hard_safety_or_liquidity_blocked');
  assert.equal(engine.marketReads,1,'shadow candidate must still reach current market truth despite real portfolio exposure');
  assert.equal(engine.strategyCalls,1,'real same-ticker exposure has no authority over the shadow Attack');
  const watch=engine.crystalWallWatches.get(authorizationId);assert.equal(watch.retryReason,'shadow_hard_safety_or_liquidity_blocked');assert.ok(watch.retryNotBeforeMs>Date.now());
});

test('R67 same-ticker Justice Arrow exposure blocks before market verification and installs retry backoff',async()=>{
  const {engine,authorizationId}=recoveryAttemptEngine({justice:true});
  const out=await engine.attemptJusticeArrowAttack(authorizationId);
  assert.equal(out.status,'WATCHING');assert.equal(out.reason,'ticker_exposure_active');assert.equal(engine.marketReads,0);assert.equal(engine.strategyCalls,0);
  const watch=engine.justiceArrowWatches.get(authorizationId);assert.equal(watch.retryReason,'ticker_exposure_active');assert.ok(watch.retryNotBeforeMs>Date.now());
});

test('R67 RGM5 runs one housekeeping action per cadence while state sampling remains cheap',()=>{
  const engine=Object.create(SagittariusEngine.prototype);
  let compactions=0,maintenance=0;
  engine.resourcePressureState='GREEN';engine.resourceResearchDeferred=false;engine.resourceGovernorTransitions=0;engine.resourceGovernorActions=0;engine.resourceGovernorLastActionAtMs=0;engine.resourceGovernorLastResult=null;
  engine.market={wanted:new Set(['PROTECTED']),maintenance(){maintenance+=1;return {ok:true};}};
  engine.learning={compactForMemoryPressure(){compactions+=1;return {ok:true};}};
  engine.phoenixCosmo=null;engine.feederSignalIntel=null;engine.protectedTickers=new Set();engine.recoveryPriorityTickers=new Set();engine.crashPriorityTickers=new Set();engine.feederPriorityTickers=new Set();
  engine.stateSnapshotCache={};engine.stateSnapshotAtMs=1;
  const memory={rss:480*1024*1024};
  const first=engine.applyResourceGovernance({memory,force:true});
  assert.equal(RUNTIME_RESOURCE_GOVERNOR.version,'RGM5');assert.equal(first.pressureState,'TRADE_PRIORITY');assert.equal(first.suppressedDuplicateAction,false);
  assert.equal(compactions,1);assert.equal(maintenance,1);assert.equal(engine.resourceGovernorActions,1);
  const second=engine.applyResourceGovernance({memory});
  assert.equal(second.suppressedDuplicateAction,true);assert.equal(compactions,1);assert.equal(maintenance,1);assert.equal(engine.resourceGovernorActions,1);
  engine.resourceGovernorLastActionAtMs-=RUNTIME_RESOURCE_GOVERNOR.sampleIntervalMs+1;
  const third=engine.applyResourceGovernance({memory});
  assert.equal(third.suppressedDuplicateAction,false);assert.equal(compactions,2);assert.equal(maintenance,2);assert.equal(engine.resourceGovernorActions,2);
});
