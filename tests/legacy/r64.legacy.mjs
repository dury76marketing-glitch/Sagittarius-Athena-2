import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, sanitizeRuntimeSettings } from '../src/config.mjs';
import { CRYSTAL_WALL, SAGITTARIUS_JUSTICE_ARROW, ATHENA_EXIT_INTELLIGENCE, COSMO_ROUTING, INFINITY_BREAK, AURORA_EXECUTION, ATHENA_COMMANDER } from '../src/doctrine.mjs';
import { atomicThunderBoltFeatures, atomicThunderBoltDecision } from '../src/opportunity.mjs';
import { rankAthenaAttacks } from '../src/athena.mjs';
import { sealAthenaFireCommand, verifyAthenaFireCommandHash } from '../src/authority.mjs';
import { StrategyEngine, validateAthenaFireCommand, entryConfigSnapshot, crystalWallSignalState, justiceArrowSignalState } from '../src/strategy.mjs';
import { SagittariusEngine } from '../src/engine.mjs';

const nowQuote = (ticker='CW', bid=56, ask=57) => {
  const now=Date.now(); const start=now-45*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,updatedAtMs:now,status:'active',result:'',gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',observedAtMs:now,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_fresh'}};
};
const refreshClock=async(q)=>{const now=Date.now();const start=q.gameStartTimeMs||now-45*60_000;return{gameStartTimeMs:start,liveStatus:'live',gameClockState:{...(q.gameClockState||{}),version:'GCA2',eventTicker:q.eventTicker||q.ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_force_fresh'}};};

function settings(overrides={}){
  return {...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r64-test',mode:'SIMULATION',liveArmed:false,engineActive:true,simFillProbability:1,startingCapitalCents:10_000_000,maxPositions:50,maxEntriesPerTrade:1,hunterCooldownMinutes:45,minGameMinutes:40,maxGameMinutes:55,maxSpreadCents:3,recoveryHunterEnabled:true,recoveryStakeCents:500,recoveryMinEntryCents:10,recoveryMaxEntryCents:50,crystalWallMinCrashCents:15,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:2,infinityBreakMinNetPerOriginalContractCents:15,auroraDamageControlPercent:95,...overrides};
}

function fakeDb(initial=[]){
  const rows=new Map(initial.map(x=>[x.id,structuredClone(x)]));
  const episodes=new Map();
  return {
    rows,episodes,audits:[],inserted:[],updated:[],locks:[],
    async audit(level,event,data){this.audits.push({level,event,data});},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async insertEntry(e){this.inserted.push(structuredClone(e));rows.set(e.id,structuredClone(e));},
    async updateEntry(id,patch){this.updated.push({id,patch:structuredClone(patch)});const e=rows.get(id);if(e)Object.assign(e,structuredClone(patch));},
    async entryById(id){const e=rows.get(id);return e?structuredClone(e):null;},
    async entryByConceptSourceTradeId(_s,concept,sourceTradeId){const e=[...rows.values()].find(x=>x.conceptName===concept&&String(x.sourceTradeId||'')===String(sourceTradeId||''));return e?structuredClone(e):null;},
    async openEntries(){return [...rows.values()].filter(e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)&&!['Pegasus','Dragon','Phoenix'].includes(e.conceptName)).map(x=>structuredClone(x));},
    async acquireHunterTickerLock(_s,key){this.locks.push(key);return async()=>{};},
    async upsertOpportunityEpisode(ep){const prior=episodes.get(ep.id)||{};episodes.set(ep.id,{...structuredClone(prior),...structuredClone(ep)});return structuredClone(episodes.get(ep.id));},
    async opportunityEpisode(id){const e=episodes.get(id);return e?structuredClone(e):null;},
    async opportunityEpisodes(){return [...episodes.values()].map(x=>structuredClone(x));},
    async recentClosed(){return [...rows.values()].filter(e=>e.status==='closed').map(x=>structuredClone(x));},
    async recentClosedForResearch(_s,sinceMs){return [...rows.values()].filter(e=>e.status==='closed'&&Number(e.closedAtMs||0)>=Number(sinceMs||0)).map(x=>structuredClone(x));},
    async profitEpisodes(){return [];},
    async profitEpisode(){return null;},
    async runLowPriorityPersistence(task){return task();},
  };
}

function fakeMarket(q=nowQuote()){
  const quote={...q};
  return {
    quote,
    history:[{t:Date.now()-30_000,bid:50,ask:51},{t:Date.now(),bid:quote.yesBid,ask:quote.yesAsk}],
    getHistory(){return this.history.map(x=>structuredClone(x));},
    async refreshTicker(){return {...quote};},
    async refreshTickerVerified(){return{marketFresh:true,bookFresh:true,quote:{...quote}};},
    getQuote(){return {...quote};},
    getBook(){return{updatedAtMs:Number(quote.updatedAtMs)||Date.now(),yesBids:[{priceCents:quote.yesBid,count:10000}],noBids:[{priceCents:100-quote.yesAsk,count:10000}]};},
    bookAgeMs(){return 0;},quoteAgeMs(){return 0;},
    async ensureFreshBook(){return this.getBook();},
    executableAsk(_ticker,count){return{filled:count,full:true,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},
    executableBid(_ticker,count,floor=0){if(quote.yesBid<floor)return{filled:0,full:false,avgCents:0,bestCents:quote.yesBid};return{filled:count,full:true,avgCents:quote.yesBid,bestCents:quote.yesBid};},
    async refreshTickerVerifiedForExit(){return{marketFresh:true,bookFresh:true,quote:{...quote}};},
    setQuote(next){Object.assign(quote,next);}
  };
}

function strategyFixture({s=settings(),quote=nowQuote(),initial=[]}={}){
  const db=fakeDb(initial),market=fakeMarket(quote);
  const engine=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  return{db,market,s,quote,strategy:engine};
}

function greenShadow(ticker='CW',entryPriceCents=50){
  return {id:`shadow-${ticker}`,conceptName:'Pegasus',ticker,eventTicker:ticker,status:'open',entryPriceCents,openedAtMs:Date.now()-10_000,feederState:{}};
}

function lostParent(q,overrides={}){
  return {id:'lost-parent',systemName:'SAGITTARIUS',ownerId:'r64-test',conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',sport:'Tennis',mode:'SIMULATION',status:'closed',remainingCount:0,entryPriceCents:70,exitPriceCents:40,pnlCents:-8000,closeReason:'hard_stop_loss',closedAtMs:Date.now()-1_000,openedAtMs:Date.now()-120_000,entryConfig:{},...overrides};
}

test('CW3 doctrine is independent crash-rebound authority with fixed stake and no multiplier',()=>{
  assert.equal(CRYSTAL_WALL.version,'CRYSTAL-WALL-V3');
  assert.equal(CRYSTAL_WALL.trigger,'CI1_CRASH_EPISODE');
  assert.equal(CRYSTAL_WALL.triggerRequiresHardStop,false);
  assert.equal(CRYSTAL_WALL.athenaAuthority,false);
  assert.equal(CRYSTAL_WALL.atomicThunderAuthority,false);
  assert.equal(CRYSTAL_WALL.fixedStakeOnly,true);
  assert.equal(CRYSTAL_WALL.stakeMultiplierAllowed,false);
  assert.equal(CRYSTAL_WALL.oneEntryPerCrashEpisode,true);
  assert.equal(CRYSTAL_WALL.shadowConceptName,'Crystal Wall Shadow');assert.equal(CRYSTAL_WALL.brokerOrderAuthority,false);assert.equal(CRYSTAL_WALL.portfolioCapitalAuthority,false);assert.equal(CRYSTAL_WALL.simulationPortfolioCapitalAuthority,false);
  assert.deepEqual([...COSMO_ROUTING.followOnOnlyExceptions],['Lightning Plasma']);
  assert.deepEqual([...COSMO_ROUTING.independentAuthorityExceptions],['Recovery Hunter']);
  const snap=entryConfigSnapshot(settings(),'Recovery Hunter');
  assert.equal(snap.model.structuralRole,'INDEPENDENT_CRASH_REBOUND_ONLY');
  assert.equal(snap.model.stakeCents,500);
  assert.equal(snap.model.stakeMultiplier,1);
  assert.equal(snap.model.minCrashCents,15);
  assert.ok(String(snap.authorityChain).includes('CI1_CRASH->CRYSTAL_WALL->TROUGH->REBOUND')); // legacy snapshot retained only for old real rows
});

test('CW3 remains absent from ordinary Cosmo GREEN and Athena selection',()=>{
  const s=settings({momentumHunterEnabled:false,waveSurferEnabled:false,crashRecoveryHunterEnabled:false,lightningPlasmaEnabled:false,athenaExclamationEnabled:false});
  const q=nowQuote('CW-GREEN',20,21);
  const f=atomicThunderBoltFeatures({q,history:[{t:Date.now()-30_000,bid:10,ask:11},{t:Date.now(),bid:20,ask:21}],settings:s,cosmos:[greenShadow(q.ticker,10)],recoveryContext:{eligible:true},now:Date.now()});
  assert.equal(f.eligibleAttacks.some(x=>x.concept==='Recovery Hunter'),false);
  assert.equal(rankAthenaAttacks({score:100,features:f},s,null,{recoveryContext:{eligible:true}}).some(x=>x.concept==='Recovery Hunter'),false);
});

test('CW3 rejects a fabricated normal Athena FIRE',async()=>{
  const s=settings(),q=nowQuote('CW-FORGED',20,21),f=strategyFixture({s,quote:q});
  const now=Date.now();
  const c=sealAthenaFireCommand({version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,boltId:'forged-crystal',systemName:s.systemName,sourceRelease:'CW3',decidedAtMs:now,expiresAtMs:now+5000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',selectedAttack:'Recovery Hunter',selectedAttackDisplay:'Crystal Wall',stakeCents:500,operatorMinEntryCents:10,operatorMaxEntryCents:50,entryPriceCents:21,authorizedMaxEntryCents:21,maxSpreadCents:3,auroraDamageControlPercent:95,infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:{netPerOriginalContractCents:15,requiredTargetBidCents:40},decisionEvidence:{recoveryContext:{eligible:true}}});
  const e=await f.strategy.createHunter('Recovery Hunter',q,500,0,{athenaFireCommand:c});
  assert.equal(e,null);assert.equal(f.db.inserted.length,0);
  assert.ok(f.db.audits.some(x=>x.event==='crystal_wall_real_entry_blocked'&&x.data?.reason==='crystal_wall_shadow_only_no_real_hunter_authority'));
});

test('CW3 crash alone never buys; +5c rebound and two upward bid ticks qualify; a new low resets proof',()=>{
  const s=settings();
  let w={authorizationId:'CW3:X',crashEpisodeId:'X',ticker:'X',eventTicker:'X',preCrashPeakCents:40,troughCents:20,troughAtMs:1,crashDepthCents:20,lastBidCents:20,upwardTicks:0};
  let r=crystalWallSignalState(w,nowQuote('X',22,23),s);assert.equal(r.qualified,false);assert.equal(r.upwardTicks,1);
  w={...w,...r};r=crystalWallSignalState(w,nowQuote('X',25,26),s);assert.equal(r.qualified,true);assert.equal(r.reboundCents,5);assert.equal(r.upwardTicks,2);
  w={...w,...r};r=crystalWallSignalState(w,nowQuote('X',18,19),s);assert.equal(r.qualified,false);assert.equal(r.troughCents,18);assert.equal(r.upwardTicks,0);
});

test('R69.2 CW3 opens a shadow trade after rebound, freezes virtual +15c Infinity and 95% Aurora, and ignores ordinary >55m Game Clock',async()=>{
  const s=settings();const q=nowQuote('CW-OPEN',20,21);q.gameStartTimeMs=Date.now()-120*60_000;q.gameClockState={...q.gameClockState,startTimeMs:q.gameStartTimeMs};
  const parent={id:'original',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,mode:'SIMULATION',status:'open',remainingCount:7,openedAtMs:Date.now()-10_000};
  const f=strategyFixture({s,quote:q,initial:[parent]});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP1',crashEpisodeId:'EP1',ticker:q.ticker,eventTicker:q.eventTicker,sourceKind:'OWNED_REAL_POSITION',coexistingEntryIds:[parent.id],preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-1000,crashStartedAtMs:Date.now()-5000};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);
  assert.ok(e,JSON.stringify({audits:f.db.audits,pipeline:f.strategy.entryPipelineSummary()}));
  assert.equal(e.conceptName,CRYSTAL_WALL.shadowConceptName);assert.ok(e.entryConfig.crystalWallFire);
  assert.equal(e.entryConfig.crystalWall.stakeMultiplier,1);assert.equal(e.entryConfig.crystalWall.stakeMultiplierAllowed,false);assert.equal(e.entryConfig.crystalWall.coexistingEntryIds[0],parent.id);
  assert.equal(e.entryConfig.virtualInfinity.minimumNetPerOriginalContractCents,15);assert.equal(e.entryConfig.aurora.damageControlPercent,95);
  assert.equal(e.entryConfig.shadowAttack.brokerOrderAuthority,false);assert.equal(e.entryConfig.shadowAttack.portfolioCapitalAuthority,false);assert.equal(e.entryConfig.shadowAttack.simulationPortfolioCapitalAuthority,false);
});

test('R69.2 CW3 shadow ignores real event-entry cap while preserving one shadow per crash episode',async()=>{
  const s=settings({maxEntriesPerTrade:1});const q=nowQuote('CW-OVERLAY',20,21);
  const parent={id:'p',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const f=strategyFixture({s,quote:q,initial:[parent]});
  const watch={authorizationId:'CRYSTAL-WALL-V3:OVERLAY',crashEpisodeId:'OVERLAY',ticker:q.ticker,eventTicker:q.eventTicker,sourceKind:'OWNED_REAL_POSITION',coexistingEntryIds:[parent.id],preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-1000,crashStartedAtMs:Date.now()-5000};
  const first=await f.strategy.executeCrystalWallAttack(q,watch);assert.ok(first);assert.equal(first.conceptName,CRYSTAL_WALL.shadowConceptName);
  const replay=await f.strategy.executeCrystalWallAttack(q,watch);assert.equal(replay,null,'same durable crash episode may not create a second shadow row');
});

test('CW3 requires the entire fixed configured position; insufficient depth cannot silently downsize',async()=>{
  const s=settings(),q=nowQuote('CW-DEPTH',20,21),f=strategyFixture({s,quote:q});
  f.market.executableAsk=(_t,count)=>({filled:Math.min(2,count),full:false,avgCents:21,bestCents:21});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP2',crashEpisodeId:'EP2',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:40,troughCents:15,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);assert.equal(e,null);assert.equal(f.db.inserted.length,0);
  assert.equal(f.db.inserted.length,0,'full configured virtual size must never be silently downsized');
});

test('CW3 engine can arm from a tracked market with no owned position and durable episode suppresses replay',async()=>{
  const s=settings(),q=nowQuote('CW-TRACKED',20,21),db=fakeDb(),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.crystalWallContinuationInFlight=new Set();e.crystalWallWatches=new Map();e.crystalWallContinuationStats=null;e.recoveryPriorityTickers=new Set();e.health={degraded:false};e.recomputeHealth=()=>e.health;e.entryExecutionGate=()=>({allowed:true,reason:'simulation'});
  const crash={episodeId:'EP3',phase:'CRASHING',sport:'Tennis',preCrashPeakCents:40,troughCents:15,crashDepthCents:25,crashStartedAtMs:Date.now()-5000};
  e.observeCrystalWallQuote(nowQuote('CW-TRACKED',18,19),crash);e.observeCrystalWallQuote(nowQuote('CW-TRACKED',19,20),crash);e.observeCrystalWallQuote(nowQuote('CW-TRACKED',20,21),crash);
  const id='CRYSTAL-WALL-V3:EP3',watch=e.crystalWallWatches.get(id);assert.ok(watch);assert.equal(watch.qualified,true);
  const first=await e.attemptCrystalWallAttack(id);assert.equal(first.status,'OPENED',JSON.stringify({first,audits:db.audits}));
  assert.equal(first.entry.entryConfig.crystalWall.sourceKind,'TRACKED_MARKET');
  const ep=await db.opportunityEpisode(id);assert.equal(ep.entryId,first.entry.id);assert.equal(ep.athenaDecision.crystalWall.status,'OPENED');
  e.crystalWallWatches.set(id,watch);const replay=await e.attemptCrystalWallAttack(id);assert.equal(replay.status,'DUPLICATE_SUPPRESSED');
});

test('R69.2 CW3 shadow does not consume or obey real maxPositions capacity',async()=>{
  const s=settings({maxPositions:1}),q=nowQuote('CW-CAP',20,21);
  const other={id:'other',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:'OTHER',eventTicker:'OTHER',mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const f=strategyFixture({s,quote:q,initial:[other]});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP4',crashEpisodeId:'EP4',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:40,troughCents:15,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);assert.ok(e);assert.equal(e.conceptName,CRYSTAL_WALL.shadowConceptName);assert.equal(f.db.inserted.length,1);
});


test('R69.2 CW3 remains broker-free shadow even when system mode is LIVE',async()=>{
  const s=settings({mode:'LIVE',liveArmed:true}),q={...nowQuote('CW-LIVE',20,21),exchangeIndex:0};
  const db=fakeDb(),market=fakeMarket(q),ops=[];
  const baseInsert=db.insertEntry.bind(db);db.insertEntry=async(e)=>{ops.push('intent');return baseInsert(e);};
  const kalshi={
    buildClientOrderId:()=> 'cw-live-entry-id',
    ensureExchangeBalance:async()=>({ok:true,exchangeIndex:0,availableCents:100000,requiredCents:500}),
    placeOrder:async(args)=>{ops.push('buy');kalshi.lastOrder={...args};return{ok:true,orderId:'cw-live-order',fillCount:Math.floor(500/21),averageFillPriceCents:21,feePaidCents:12,httpStatus:201};},
  };
  const st=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>s,getLiveReady:()=>true,refreshGameClock:refreshClock,random:()=>0});
  const watch={authorizationId:'CRYSTAL-WALL-V3:LIVE1',crashEpisodeId:'LIVE1',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-1000,crashStartedAtMs:Date.now()-5000};
  const e=await st.executeCrystalWallAttack(q,watch);
  assert.ok(e,JSON.stringify({audits:db.audits,pipeline:st.entryPipelineSummary()}));
  assert.deepEqual(ops,['intent'],'shadow may persist its virtual row but must never call broker BUY');
  assert.equal(kalshi.lastOrder,undefined);
  assert.equal(e.conceptName,CRYSTAL_WALL.shadowConceptName);assert.equal(e.count,Math.floor(500/21));assert.equal(e.entryConfig.crystalWall.fixedStakeCents,500);assert.equal(e.entryConfig.shadowAttack.brokerOrderAuthority,false);
});


test('CW3 keeps an armed watch alive after CI1 research resets, so temporary liquidity timing cannot choke the recovery',()=>{
  const s=settings(),q=nowQuote('CW-RESET',18,19),db=fakeDb(),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.crystalWallContinuationInFlight=new Set();e.crystalWallWatches=new Map();e.crystalWallContinuationStats=null;e.crystalWallContinuationQueue={enqueue(){return true;}};e.recoveryPriorityTickers=new Set();
  const crash={episodeId:'RESET1',phase:'CRASHING',sport:'Tennis',preCrashPeakCents:40,troughCents:15,crashDepthCents:25,crashStartedAtMs:Date.now()-5000};
  e.observeCrystalWallQuote(nowQuote('CW-RESET',18,19),crash);
  e.observeCrystalWallQuote(nowQuote('CW-RESET',19,20),null);
  e.observeCrystalWallQuote(nowQuote('CW-RESET',20,21),null);
  const watch=e.crystalWallWatches.get('CRYSTAL-WALL-V3:RESET1');assert.ok(watch);assert.equal(watch.qualified,true);assert.equal(watch.reboundCents,5);assert.equal(watch.upwardTicks,2);
});

test('CW3 restart rehydrates an unconsumed durable crash episode and can keep watching without CI1 re-arming it',async()=>{
  const s=settings(),q=nowQuote('CW-RESTART',18,19),db=fakeDb(),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const id='CRYSTAL-WALL-V3:RESTART1';
  await db.upsertOpportunityEpisode({id,systemName:s.systemName,sourceRelease:'CW3',cohortId:'',ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',sport:'Tennis',boltAtMs:Date.now()-5000,boltSnapshot:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:'RESTART1',preCrashPeakCents:40,crashDepthCents:25},athenaDecision:{decision:'AUTHORIZED',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,status:'CRASH_ARMED',terminal:false,authorizationId:id,crashEpisodeId:'RESTART1',ticker:q.ticker,eventTicker:q.eventTicker,authorizedAtMs:Date.now()-4000,preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-4000,crashDepthCents:25,lastBidCents:18,upwardTicks:0}},fireCommand:{},attackSelected:'Recovery Hunter',entryId:null,trackingComplete:false,updatedAtMs:Date.now()});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.crystalWallContinuationInFlight=new Set();e.crystalWallWatches=new Map();e.crystalWallContinuationStats=null;e.crystalWallContinuationQueue={enqueue(){return true;}};e.recoveryPriorityTickers=new Set();
  await e.hydrateCrystalWallV3();assert.ok(e.crystalWallWatches.has(id));
  e.observeCrystalWallQuote(nowQuote('CW-RESTART',19,20),null);e.observeCrystalWallQuote(nowQuote('CW-RESTART',20,21),null);
  const watch=e.crystalWallWatches.get(id);assert.ok(watch);assert.equal(watch.qualified,true);assert.equal(watch.upwardTicks,2);
});

test('CW3 legacy post-stop Recovery evaluator is inert and no production source retains double-stake sizing',async()=>{
  const s=settings(),q=nowQuote('CW-LEGACY',20,21),f=strategyFixture({s,quote:q});
  assert.deepEqual(await f.strategy.evaluateRecovery(new Map([[q.ticker,q]]),{legacyCompatibility:true}),[]);
  const {readFile}=await import('node:fs/promises');
  const strategySource=await readFile(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  assert.equal(strategySource.includes('recoveryBaseStakeCents ?? 20000) * 2'),false);
  assert.equal(strategySource.includes('targetStakeMultiplier: 2'),false);
});



function profitableScarletParent(q,s,{id='scarlet-parent',closedAtMs=Date.now()-10_000,pnlCents=120}={}){
  return {id,systemName:s.systemName,ownerId:s.ownerId,conceptName:'Scarlet Needle',ticker:q.ticker,eventTicker:q.eventTicker,marketTitle:q.title,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,count:10,entryPriceCents:36,exitPriceCents:52,pnlCents,closeReason:'infinity_break',openedAtMs:closedAtMs-60_000,closedAtMs,updatedAtMs:closedAtMs,entryConfig:{profitAuthority:INFINITY_BREAK.version,scarletContinuation:{version:'SCARLET-NEEDLE-V3',policyRevision:'SN3-R5-THIRD-CONSECUTIVE-CW-PROOF',authorizationId:`SCARLET:${id}`}}};
}

function justiceEngineFixture({s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:92,justiceArrowMinCrashCents:1,justiceArrowMinReboundCents:1,justiceArrowMinUpwardTicks:1}),q=nowQuote('SJA3',30,31),parent=null}={}){
  const p=parent||profitableScarletParent(q,s),db=fakeDb([p]),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.crystalWallWatches=new Map();e.justiceArrowWatches=new Map();e.justiceArrowInFlight=new Set();e.justiceArrowStats=null;e.justiceArrowQueue={enqueue(){return true;},snapshot(){return{maxConcurrency:1,active:0,pending:0};}};e.recoveryPriorityTickers=new Set();e.health={degraded:false};e.simulationMutationGate={blocked:false};e.entryExecutionGate=()=>({allowed:true,reason:'simulation'});e.recomputeHealth=()=>e.health;
  return{engine:e,db,market,strategy,s,q,parent:p};
}

test('SJA3 is post-profitable-Scarlet only, needs no CI1 episode, and preserves own confirmation plus ATHENA-X1/Aurora authorities',()=>{
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.version,'SAGITTARIUS-JUSTICE-ARROW-V3');
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.policyRevision,'SJA3-R2-DIRECT-POST-SCARLET-OWN-CONFIRMATION-ATHENA-X1');
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.trigger,'POST_PROFITABLE_SCARLET_NEEDLE_CLOSE_DIRECT_OWN_CONFIRMATION');
  assert.deepEqual([...SAGITTARIUS_JUSTICE_ARROW.triggerSources],['SCARLET_NEEDLE_PROFIT_CLOSE']);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.independentCrashAuthority,false);assert.equal(SAGITTARIUS_JUSTICE_ARROW.requiresCi1CrashEpisode,false);assert.equal(SAGITTARIUS_JUSTICE_ARROW.directObservationFromParentClose,true);assert.equal(SAGITTARIUS_JUSTICE_ARROW.postScarletContinuationAuthority,true);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.requiredParentConcept,'Scarlet Needle');assert.equal(SAGITTARIUS_JUSTICE_ARROW.requiredParentProfitAuthority,INFINITY_BREAK.version);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.fixedStakeOnly,true);assert.equal(SAGITTARIUS_JUSTICE_ARROW.stakeMultiplierAllowed,false);assert.equal(SAGITTARIUS_JUSTICE_ARROW.oneEntryPerCrashEpisode,false);assert.equal(SAGITTARIUS_JUSTICE_ARROW.oneEntryPerParentScarlet,true);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.profitAuthority,ATHENA_EXIT_INTELLIGENCE.version);assert.equal(SAGITTARIUS_JUSTICE_ARROW.lossAuthority,'AURORA_EXECUTION');
  assert.deepEqual([...COSMO_ROUTING.independentAuthorityExceptions],['Recovery Hunter']);
  const snap=entryConfigSnapshot(settings({justiceArrowEnabled:true}),'Sagittarius Justice Arrow');assert.equal(snap.model.structuralRole,'POST_SCARLET_DIRECT_OWN_CONFIRMATION_ATHENA_X1');assert.equal(snap.model.oneEntryPerCrashEpisode,false);assert.equal(String(snap.authorityChain).includes('CI1_CRASH'),false);
});

test('SJA3 cannot be forged through ordinary Athena FIRE',()=>{
  const s=settings({justiceArrowEnabled:true}),q=nowQuote('SJA3-FORGE',35,36),now=Date.now();
  const command=sealAthenaFireCommand({version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,boltId:'forged-sja3',systemName:s.systemName,sourceRelease:'SJA3',decidedAtMs:now,expiresAtMs:now+5000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',selectedAttack:'Sagittarius Justice Arrow',selectedAttackDisplay:'Sagittarius Justice Arrow',stakeCents:500,operatorMinEntryCents:10,operatorMaxEntryCents:50,entryPriceCents:36,authorizedMaxEntryCents:50,maxSpreadCents:3,auroraDamageControlPercent:95,economicTarget:{netPerOriginalContractCents:1,requiredTargetBidCents:40},decisionEvidence:{}});
  const v=validateAthenaFireCommand(command,{concept:'Sagittarius Justice Arrow',q,settings:s,now});assert.equal(v.ok,false);assert.equal(v.reason,'justice_arrow_v3_authority_required');
});

test('SJA3 profitable Scarlet starts one direct same-ticker observation and ignores unrelated ticker activity',async()=>{
  const f=justiceEngineFixture();const armed=await f.engine.handleJusticeArrowContinuation(f.parent);assert.equal(armed.status,'OBSERVING');
  const id=armed.authorizationId,watch0=f.engine.justiceArrowWatches.get(id);assert.ok(watch0?.observationId);assert.equal(watch0?.directPostScarletObservation,true);assert.equal(watch0?.ownCrashArmed,false);assert.equal(f.db.episodes.get(id)?.athenaDecision?.justiceArrow?.status,'OBSERVING');
  f.engine.observeJusticeArrowQuote(nowQuote('OTHER-TICKER',50,51));assert.equal(f.engine.justiceArrowWatches.get(id)?.ownCrashArmed,false,'another ticker cannot consume the Scarlet authorization');
  f.engine.observeJusticeArrowQuote(nowQuote(f.q.ticker,53,54));assert.equal(f.engine.justiceArrowWatches.get(id)?.preCrashPeakCents,53,'the direct watch trails the post-Scarlet peak without CI1');
  f.engine.observeJusticeArrowQuote(nowQuote(f.q.ticker,52,53));assert.equal(f.engine.justiceArrowWatches.get(id)?.ownCrashArmed,true);assert.equal(f.engine.justiceArrowWatches.get(id)?.crashDepthCents,1);
});

test('SJA3 full chain runs profitable Scarlet -> direct own pullback/rebound -> Justice Arrow entry with ATHENA-X1 and durable replay protection',async()=>{
  const q=nowQuote('SJA3-CHAIN',52,53),f=justiceEngineFixture({q});const armed=await f.engine.handleJusticeArrowContinuation(f.parent),id=armed.authorizationId;
  f.market.setQuote({yesBid:53,yesAsk:54});f.engine.observeJusticeArrowQuote(f.market.getQuote());
  f.market.setQuote({yesBid:52,yesAsk:53});f.engine.observeJusticeArrowQuote(f.market.getQuote());
  f.market.setQuote({yesBid:53,yesAsk:54});f.engine.observeJusticeArrowQuote(f.market.getQuote());
  const ready=f.engine.justiceArrowWatches.get(id);assert.equal(ready?.qualified,true);assert.equal(ready?.status,'READY');
  const out=await f.engine.attemptJusticeArrowAttack(id);assert.equal(out.status,'OPENED',JSON.stringify({out,audits:f.db.audits}));const arrow=out.entry;
  assert.equal(arrow.conceptName,'Sagittarius Justice Arrow');assert.equal(arrow.sourceTradeId,armed.observationId);assert.equal(arrow.entryConfig.justiceArrow.observationId,armed.observationId);assert.equal(arrow.entryConfig.justiceArrow.parentScarletEntryId,f.parent.id);assert.equal(arrow.entryConfig.justiceArrow.postScarletContinuation,true);assert.equal(arrow.entryConfig.justiceArrow.directPostScarletObservation,true);assert.equal(arrow.entryConfig.profitAuthority,ATHENA_EXIT_INTELLIGENCE.version);assert.equal(arrow.entryConfig.infinityBreak,undefined);assert.equal(arrow.entryConfig.aurora.frozen,true);assert.equal(arrow.entryConfig.justiceArrow.crashStartedAtMs>=f.parent.closedAtMs,true);
  const episode=f.db.episodes.get(id);assert.equal(episode.entryId,arrow.id);assert.equal(episode.trackingComplete,true);assert.equal(episode.athenaDecision.justiceArrow.status,'OPENED');
  const replay=await f.engine.handleJusticeArrowContinuation(await f.db.entryById(f.parent.id));assert.equal(replay.status,'DUPLICATE_SUPPRESSED');
});

test('SJA3 Scarlet loss/non-Infinity close cannot arm and raw CI1 activity has zero independent authority',async()=>{
  const q=nowQuote('SJA3-BLOCK',30,31),s=settings({justiceArrowEnabled:true}),bad=profitableScarletParent(q,s,{pnlCents:-500});bad.closeReason='hard_stop_loss';
  const f=justiceEngineFixture({s,q,parent:bad});const out=await f.engine.handleJusticeArrowContinuation(bad);assert.equal(out.status,'IGNORED');assert.equal(out.reason,'parent_not_profitable_infinity_close');assert.equal(f.engine.justiceArrowWatches.size,0);
  const observed=f.engine.observeJusticeArrowQuote(q);assert.equal(observed,false);assert.equal(f.engine.justiceArrowWatches.size,0);
});

test('SJA3 restart hydration restores a durable direct post-Scarlet own-crash observation without CI1',async()=>{
  const q=nowQuote('SJA3-RESTART',52,53),f=justiceEngineFixture({q});const armed=await f.engine.handleJusticeArrowContinuation(f.parent),id=armed.authorizationId;
  f.market.setQuote({yesBid:53,yesAsk:54});f.engine.observeJusticeArrowQuote(f.market.getQuote());f.market.setQuote({yesBid:52,yesAsk:53});f.engine.observeJusticeArrowQuote(f.market.getQuote());
  const waiting=await f.engine.attemptJusticeArrowAttack(id);assert.equal(waiting.status,'WATCHING');assert.equal(waiting.reason,'rebound_not_ready');const durable=f.db.episodes.get(id)?.athenaDecision?.justiceArrow;assert.equal(durable?.ownCrashArmed,true);assert.equal(durable?.observationId,armed.observationId);assert.equal(durable?.crashStartedAtMs>=f.parent.closedAtMs,true);
  const restarted=Object.create(SagittariusEngine.prototype);restarted.settings=f.s;restarted.db=f.db;restarted.market=f.market;restarted.strategy=f.strategy;restarted.crystalWallWatches=new Map();restarted.justiceArrowWatches=new Map();restarted.justiceArrowInFlight=new Set();restarted.justiceArrowStats=null;restarted.recoveryPriorityTickers=new Set();await restarted.hydrateJusticeArrowV3();const watch=restarted.justiceArrowWatches.get(id);assert.equal(watch?.observationId,armed.observationId);assert.equal(watch?.ownCrashArmed,true);assert.equal(watch?.directPostScarletObservation,true);await restarted.refreshRecoveryPriorityTickers();assert.equal(restarted.recoveryPriorityTickers.has(q.ticker),true);
});

test('R69.6 restart fails closed on an old R69.5 CI1-gated Justice episode',async()=>{
  const q=nowQuote('SJA3-OLD-R695',52,53),f=justiceEngineFixture({q}),parent=f.parent,authorizationId=`JUSTICE-ARROW-V3:SCARLET:${parent.id}`;
  f.db.episodes.set(authorizationId,{id:authorizationId,systemName:f.s.systemName,ticker:q.ticker,eventTicker:q.eventTicker,trackingComplete:false,entryId:null,athenaDecision:{decision:'PARENT_ARMED',justiceArrow:{version:'SAGITTARIUS-JUSTICE-ARROW-V3',policyRevision:'SJA3-R1-POST-SCARLET-CRASH-REBOUND-ATHENA-X1',status:'PARENT_ARMED',authorizationId,parentScarletEntryId:parent.id}},boltSnapshot:{parentScarletEntryId:parent.id}});
  const restarted=Object.create(SagittariusEngine.prototype);restarted.settings=f.s;restarted.db=f.db;restarted.market=f.market;restarted.strategy=f.strategy;restarted.crystalWallWatches=new Map();restarted.justiceArrowWatches=new Map();restarted.justiceArrowInFlight=new Set();restarted.justiceArrowStats=null;restarted.recoveryPriorityTickers=new Set();
  await restarted.hydrateJusticeArrowV3();assert.equal(restarted.justiceArrowWatches.size,0,'old CI1-gated lineage must not acquire R69.6 direct authority after restart');
});

test('SJA3 quote observer stays memory-only, bounds watches, and queues only own confirmation transitions',()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowMinCrashCents:1,justiceArrowMinReboundCents:1,justiceArrowMinUpwardTicks:1,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:92}),e=Object.create(SagittariusEngine.prototype);e.settings=s;e.justiceArrowWatches=new Map();e.justiceArrowInFlight=new Set();e.justiceArrowStats=null;e.recoveryPriorityTickers=new Set();let queued=0;e.queueJusticeArrowWatch=()=>{queued+=1;return true;};e.db=new Proxy({}, {get(){throw new Error('SJA3 quote observer must remain memory-only');}});const now=Date.now();
  for(let i=0;i<320;i++){const ticker=`SJA3-HOT-${i}`,authorizationId=`JUSTICE-ARROW-V3:SCARLET:P-${i}`;e.justiceArrowWatches.set(authorizationId,{authorizationId,observationId:`JUSTICE-ARROW-V3:OBS:P-${i}`,parentScarletEntryId:`P-${i}`,postScarletContinuation:true,directPostScarletObservation:true,ticker,eventTicker:ticker,parentScarletClosedAtMs:now-10_000,parentScarletExitPriceCents:22,observationStartedAtMs:now-10_000,preCrashPeakCents:22,troughCents:22,troughAtMs:now-10_000,lastBidCents:22,ownCrashArmed:false,status:'OBSERVING'});e.recoveryPriorityTickers.add(ticker);e.observeJusticeArrowQuote(nowQuote(ticker,21,22));}
  assert.ok(e.justiceArrowWatches.size<=256);assert.equal(queued,320,'each newly observed own 1c pullback may queue one durable transition');
  const sample=[...e.justiceArrowWatches.values()][0];queued=0;for(let i=0;i<1000;i++)e.observeJusticeArrowQuote({...nowQuote(sample.ticker,21,22),updatedAtMs:now+i+1});assert.equal(queued,0,'ordinary non-qualified quote storms cannot create durable work');
});
