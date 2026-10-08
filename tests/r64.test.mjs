import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, sanitizeRuntimeSettings } from '../src/config.mjs';
import { CRYSTAL_WALL, SAGITTARIUS_JUSTICE_ARROW, ATHENA_EXIT_INTELLIGENCE, COSMO_ROUTING, INFINITY_BREAK, AURORA_EXECUTION, ATHENA_COMMANDER } from '../src/doctrine.mjs';
import { atomicThunderBoltFeatures, atomicThunderBoltDecision } from '../src/opportunity.mjs';
import { rankAthenaAttacks } from '../src/athena.mjs';
import { sealAthenaFireCommand, verifyAthenaFireCommandHash } from '../src/authority.mjs';
import { StrategyEngine, validateAthenaFireCommand, validateJusticeArrowFireCommand, entryConfigSnapshot, crystalWallSignalState, justiceArrowSignalState } from '../src/strategy.mjs';
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
  assert.deepEqual([...COSMO_ROUTING.followOnOnlyExceptions],[]);
  assert.deepEqual([...COSMO_ROUTING.independentAuthorityExceptions],['Recovery Hunter','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer','Crash Recovery Hunter','Scarlet Needle','Lightning Plasma','Athena Exclamation']);
  const snap=entryConfigSnapshot(settings(),'Recovery Hunter');
  assert.equal(snap.model.structuralRole,'INDEPENDENT_CRASH_REBOUND_ONLY');
  assert.equal(snap.model.stakeCents,500);
  assert.equal(snap.model.stakeMultiplier,1);
  assert.equal(snap.model.minCrashCents,15);
  assert.ok(String(snap.authorityChain).includes('CI1_CRASH->CRYSTAL_WALL->TROUGH->REBOUND'));
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
  assert.ok(f.db.audits.some(x=>x.event==='crystal_wall_v3_execution_blocked'&&x.data?.reason==='crystal_wall_v3_authority_required'));
});

test('CW3 crash alone never buys; +5c rebound and two upward bid ticks qualify; a new low resets proof',()=>{
  const s=settings();
  let w={authorizationId:'CW3:X',crashEpisodeId:'X',ticker:'X',eventTicker:'X',preCrashPeakCents:40,troughCents:20,troughAtMs:1,crashDepthCents:20,lastBidCents:20,upwardTicks:0};
  let r=crystalWallSignalState(w,nowQuote('X',22,23),s);assert.equal(r.qualified,false);assert.equal(r.upwardTicks,1);
  w={...w,...r};r=crystalWallSignalState(w,nowQuote('X',25,26),s);assert.equal(r.qualified,true);assert.equal(r.reboundCents,5);assert.equal(r.upwardTicks,2);
  w={...w,...r};r=crystalWallSignalState(w,nowQuote('X',18,19),s);assert.equal(r.qualified,false);assert.equal(r.troughCents,18);assert.equal(r.upwardTicks,0);
});

test('CW3 opens independently after rebound, freezes +15c Infinity and 95% Aurora, and ignores ordinary >55m Game Clock',async()=>{
  const s=settings();const q=nowQuote('CW-OPEN',20,21);q.gameStartTimeMs=Date.now()-120*60_000;q.gameClockState={...q.gameClockState,startTimeMs:q.gameStartTimeMs};
  const parent={id:'original',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,mode:'SIMULATION',status:'open',remainingCount:7,openedAtMs:Date.now()-10_000};
  const f=strategyFixture({s,quote:q,initial:[]});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP1',crashEpisodeId:'EP1',ticker:q.ticker,eventTicker:q.eventTicker,sourceKind:'OWNED_REAL_POSITION',coexistingEntryIds:[parent.id],preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-1000,crashStartedAtMs:Date.now()-5000};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);
  assert.ok(e,JSON.stringify({audits:f.db.audits,pipeline:f.strategy.entryPipelineSummary()}));
  assert.equal(e.conceptName,'Recovery Hunter');assert.equal(e.entryConfig.athena,undefined);assert.equal(e.entryConfig.athenaFire,undefined);assert.ok(e.entryConfig.crystalWallFire);
  assert.equal(e.entryConfig.crystalWall.stakeMultiplier,1);assert.equal(e.entryConfig.crystalWall.stakeMultiplierAllowed,false);assert.equal(e.entryConfig.crystalWall.coexistingEntryIds[0],parent.id);
  assert.equal(e.entryConfig.infinityBreak.minimumNetPerOriginalContractCents,15);assert.equal(e.entryConfig.aurora.damageControlPercent,95);
  assert.equal(e.entryConfig.model.configuredStakeCents,500);assert.equal(e.entryConfig.model.structuralRole,'INDEPENDENT_CRASH_REBOUND_ONLY');
});

test('CW3 overlay bypasses maxEntriesPerTrade=1 only for parent coexistence and blocks a second Crystal Wall',async()=>{
  const s=settings({maxEntriesPerTrade:1});const q=nowQuote('CW-OVERLAY',20,21);
  const parent={id:'p',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const f=strategyFixture({s,quote:q,initial:[parent]});
  const allowed=await f.strategy.hunterEntryPolicyDecision('Recovery Hunter',q,{requireClock:false,includeCooldown:false,crystalWallOverlay:true});
  assert.equal(allowed.ok,false);assert.equal(allowed.reason,'ticker_lock');
  f.db.rows.set('cw-existing',{...parent,id:'cw-existing',conceptName:'Recovery Hunter'});
  const blocked=await f.strategy.hunterEntryPolicyDecision('Recovery Hunter',q,{requireClock:false,includeCooldown:false,crystalWallOverlay:true});
  assert.equal(blocked.ok,false);assert.equal(blocked.reason,'ticker_lock');
});

test('CW3 requires the entire fixed configured position; insufficient depth cannot silently downsize',async()=>{
  const s=settings(),q=nowQuote('CW-DEPTH',20,21),f=strategyFixture({s,quote:q});
  f.market.executableAsk=(_t,count)=>({filled:Math.min(2,count),full:false,avgCents:21,bestCents:21});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP2',crashEpisodeId:'EP2',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:40,troughCents:15,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);assert.equal(e,null);assert.equal(f.db.inserted.length,0);
  assert.ok(f.db.audits.some(x=>x.event==='crystal_wall_v3_full_size_blocked'));
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

test('CW3 normal hard safety remains: global maxPositions blocks locally without opening',async()=>{
  const s=settings({maxPositions:1}),q=nowQuote('CW-CAP',20,21);
  const other={id:'other',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:'OTHER',eventTicker:'OTHER',mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const f=strategyFixture({s,quote:q,initial:[other]});
  const watch={authorizationId:'CRYSTAL-WALL-V3:EP4',crashEpisodeId:'EP4',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:40,troughCents:15,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const e=await f.strategy.executeCrystalWallAttack(q,watch);assert.equal(e,null);assert.equal(f.db.inserted.length,0);assert.ok(f.db.audits.some(x=>x.event==='crystal_wall_v3_capacity_blocked'));
});



test('CW3 LIVE submission uses broker fill-or-kill and persists intent before the BUY',async()=>{
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
  assert.deepEqual(ops.slice(0,2),['intent','buy']);
  assert.equal(kalshi.lastOrder.timeInForce,'fill_or_kill');
  assert.equal(kalshi.lastOrder.count,Math.floor(500/21));
  assert.equal(e.count,Math.floor(500/21));assert.equal(e.entryConfig.crystalWall.fixedStakeCents,500);
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


test('SJA2 mirrors Crystal Wall crash-rebound geometry but freezes ATHENA-X1 as the only profit authority',()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2});
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.version,'SAGITTARIUS-JUSTICE-ARROW-V2');
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.trigger,'CI1_CRASH_EPISODE');
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.athenaEntryAuthority,false);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.atomicThunderAuthority,false);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.fixedStakeOnly,true);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.stakeMultiplierAllowed,false);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.oneEntryPerCrashEpisode,true);
  assert.equal(SAGITTARIUS_JUSTICE_ARROW.profitAuthority,ATHENA_EXIT_INTELLIGENCE.version);
  const snap=entryConfigSnapshot(s,'Sagittarius Justice Arrow');
  assert.equal(snap.model.stakeCents,500);assert.equal(snap.model.minCrashCents,15);assert.equal(snap.model.minReboundCents,5);assert.equal(snap.model.minUpwardTicks,2);assert.equal(snap.model.stakeMultiplier,1);assert.equal(snap.profitAuthority,'ATHENA-X1');
  const prior={crashEpisodeId:'SJA-GEO',ticker:'SJA-GEO',eventTicker:'SJA-GEO',preCrashPeakCents:45,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:30,lastBidCents:18,upwardTicks:0};
  const q=nowQuote('SJA-GEO',20,21);
  const cw=crystalWallSignalState(prior,q,{...s,recoveryMinEntryCents:10,recoveryMaxEntryCents:50,crystalWallMinCrashCents:15,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:2},Date.now());
  const ja=justiceArrowSignalState(prior,q,s,Date.now());
  for(const k of ['qualified','reason','troughCents','crashDepthCents','reboundCents','upwardTicks','bidCents','askCents'])assert.deepEqual(ja[k],cw[k],k);
  const lower=justiceArrowSignalState({...prior,lastBidCents:20,upwardTicks:2},nowQuote('SJA-GEO',14,15),s,Date.now());
  assert.equal(lower.reason,'tracking_new_low');assert.equal(lower.troughCents,14);assert.equal(lower.upwardTicks,0);
});

test('SJA2 cannot be forged through ordinary Athena FIRE',()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50}),q=nowQuote('SJA-FORGED',20,21),now=Date.now();
  const command=sealAthenaFireCommand({version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,boltId:'forged-sja',systemName:s.systemName,sourceRelease:'SJA2',decidedAtMs:now,expiresAtMs:now+5000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',selectedAttack:'Sagittarius Justice Arrow',selectedAttackDisplay:'Sagittarius Justice Arrow',stakeCents:500,operatorMinEntryCents:10,operatorMaxEntryCents:50,entryPriceCents:21,authorizedMaxEntryCents:50,maxSpreadCents:3,auroraDamageControlPercent:95,economicTarget:{netPerOriginalContractCents:1,requiredTargetBidCents:26},decisionEvidence:{}});
  const v=validateAthenaFireCommand(command,{concept:'Sagittarius Justice Arrow',q,settings:s,now});
  assert.equal(v.ok,false);assert.equal(v.reason,'justice_arrow_v2_authority_required');
});

test('SJA2 engine arms a tracked crash, opens once, and durable episode suppresses replay',async()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2}),q=nowQuote('SJA-TRACKED',18,19),db=fakeDb(),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:async()=>{throw new Error('ordinary clock must be bypassed');},random:()=>0});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.justiceArrowInFlight=new Set();e.justiceArrowWatches=new Map();e.justiceArrowStats=null;e.justiceArrowQueue={enqueue(){return true;},snapshot(){return{maxConcurrency:1};}};e.recoveryPriorityTickers=new Set();e.health={degraded:false};e.entryExecutionGate=()=>({allowed:true,reason:'simulation'});e.recomputeHealth=()=>e.health;
  const crash={episodeId:'SJA-EP1',phase:'CRASHING',sport:'Tennis',preCrashPeakCents:45,troughCents:15,crashDepthCents:30,crashStartedAtMs:Date.now()-5000};
  e.observeJusticeArrowQuote(nowQuote(q.ticker,18,19),crash);e.observeJusticeArrowQuote(nowQuote(q.ticker,19,20),crash);e.observeJusticeArrowQuote(nowQuote(q.ticker,20,21),crash);market.setQuote({yesBid:20,yesAsk:21});
  const id='JUSTICE-ARROW-V2:SJA-EP1';assert.equal(e.justiceArrowWatches.get(id)?.qualified,true);
  const first=await e.attemptJusticeArrowAttack(id);assert.equal(first.status,'OPENED',JSON.stringify({first,audits:db.audits}));assert.equal(first.entry.entryConfig.justiceArrow.sourceKind,'TRACKED_MARKET');assert.equal(first.entry.entryConfig.profitAuthority,'ATHENA-X1');assert.equal(first.entry.entryConfig.infinityBreak,undefined);
  const consumed=await db.opportunityEpisode(id);assert.equal(consumed.entryId,first.entry.id);
  e.justiceArrowWatches.set(id,{...first.entry.entryConfig.justiceArrow,authorizationId:id,status:'READY'});const replay=await e.attemptJusticeArrowAttack(id);assert.equal(replay.status,'DUPLICATE_SUPPRESSED');
});

test('SJA2 may coexist with another Attack on the same ticker under maxEntriesPerTrade=1 but a second Justice Arrow is blocked',async()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2,maxEntriesPerTrade:1}),q=nowQuote('SJA-OVERLAY',20,21);
  const parent={id:'parent-overlay',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Wave Surfer',ticker:q.ticker,eventTicker:q.eventTicker,mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const f=strategyFixture({s,quote:q,initial:[parent]});
  const watch={authorizationId:'JUSTICE-ARROW-V2:OVER1',crashEpisodeId:'OVER1',ticker:q.ticker,eventTicker:q.eventTicker,sourceKind:'OWNED_REAL_POSITION',coexistingEntryIds:[parent.id],preCrashPeakCents:45,troughCents:15,crashDepthCents:30,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const first=await f.strategy.executeJusticeArrowAttack(q,watch);assert.equal(first,null);assert.ok(f.db.audits.some(x=>x.event==='hunter_exact_ticker_exposure_blocked'));
  const second=await f.strategy.executeJusticeArrowAttack(q,{...watch,authorizationId:'JUSTICE-ARROW-V2:OVER2',crashEpisodeId:'OVER2'});assert.equal(second,null);assert.ok(f.db.audits.some(x=>x.event==='hunter_static_policy_blocked'||x.event==='hunter_exact_ticker_lock_busy'||String(x.data?.reason||'').includes('ticker'))||f.strategy.entryPipelineSummary().blocked>0);
});

test('SJA2 keeps global maxPositions and full configured depth as hard safety gates',async()=>{
  const base={justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2};
  const q=nowQuote('SJA-CAP',20,21),other={id:'other-cap',systemName:'SAGITTARIUS',ownerId:'r64-test',conceptName:'Wave Surfer',ticker:'OTHER',eventTicker:'OTHER',mode:'SIMULATION',status:'open',remainingCount:1,openedAtMs:Date.now()};
  const capped=strategyFixture({s:settings({...base,maxPositions:1}),quote:q,initial:[other]});
  const watch={authorizationId:'JUSTICE-ARROW-V2:CAP',crashEpisodeId:'CAP',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:45,troughCents:15,crashDepthCents:30,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  assert.equal(await capped.strategy.executeJusticeArrowAttack(q,watch),null);assert.ok(capped.db.audits.some(x=>x.event==='justice_arrow_v2_capacity_blocked'));
  const depth=strategyFixture({s:settings(base),quote:q});const requested=Math.floor(500/21);depth.market.executableAsk=(_t,count)=>count===requested?({filled:requested-1,full:false,avgCents:21,bestCents:21}):({filled:count,full:true,avgCents:21,bestCents:21});
  assert.equal(await depth.strategy.executeJusticeArrowAttack(q,{...watch,authorizationId:'JUSTICE-ARROW-V2:DEPTH',crashEpisodeId:'DEPTH'}),null);assert.ok(depth.db.audits.some(x=>x.event==='justice_arrow_v2_full_size_blocked'));
});

test('SJA2 LIVE persists intent before a fill-or-kill BUY and never creates an Infinity snapshot',async()=>{
  const s=settings({mode:'LIVE',liveArmed:true,justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2}),q={...nowQuote('SJA-LIVE',20,21),exchangeIndex:0},db=fakeDb(),market=fakeMarket(q),ops=[];
  const baseInsert=db.insertEntry.bind(db);db.insertEntry=async(e)=>{ops.push('intent');return baseInsert(e);};
  const kalshi={buildClientOrderId:()=> 'sja-live-client',ensureExchangeBalance:async()=>({ok:true,exchangeIndex:0,availableCents:100000,requiredCents:500}),placeOrder:async(args)=>{ops.push('buy');kalshi.lastOrder={...args};return{ok:true,orderId:'sja-live-order',fillCount:Math.floor(500/21),averageFillPriceCents:21,feePaidCents:12,httpStatus:201};}};
  const st=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>s,getLiveReady:()=>true,refreshGameClock:async()=>{throw new Error('SJA2 clock bypass expected');},random:()=>0});
  const watch={authorizationId:'JUSTICE-ARROW-V2:LIVE',crashEpisodeId:'LIVE',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:45,troughCents:15,troughAtMs:Date.now()-1000,crashDepthCents:30,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-1000,crashStartedAtMs:Date.now()-5000};
  const e=await st.executeJusticeArrowAttack(q,watch);assert.ok(e,JSON.stringify({audits:db.audits,pipeline:st.entryPipelineSummary()}));assert.deepEqual(ops.slice(0,2),['intent','buy']);assert.equal(kalshi.lastOrder.timeInForce,'fill_or_kill');assert.equal(kalshi.lastOrder.count,Math.floor(500/21));assert.equal(e.entryConfig.profitAuthority,'ATHENA-X1');assert.equal(e.entryConfig.infinityBreak,undefined);assert.equal(e.entryConfig.justiceArrow.fixedStakeCents,500);assert.equal(e.entryConfig.justiceArrow.stakeMultiplierAllowed,false);
});

test('SJA2 migration clones the exact persisted Crystal Wall controls once without silently enabling Justice Arrow',()=>{
  const defaults=originalSettings();
  const raw={systemName:'SAGITTARIUS',ownerId:'persisted',mode:'LIVE',engineActive:true,justiceArrowEnabled:false,justiceArrowStakeCents:20000,justiceArrowMinEntryCents:80,justiceArrowMaxEntryCents:89,recoveryHunterEnabled:true,recoveryStakeCents:100,recoveryMinEntryCents:38,recoveryMaxEntryCents:50,crystalWallMinCrashCents:30,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:2};
  const migrated=sanitizeRuntimeSettings(raw,defaults);
  assert.equal(migrated.justiceArrowEnabled,false);assert.equal(migrated.justiceArrowStakeCents,100);assert.equal(migrated.justiceArrowMinEntryCents,38);assert.equal(migrated.justiceArrowMaxEntryCents,50);assert.equal(migrated.justiceArrowMinCrashCents,30);assert.equal(migrated.justiceArrowMinReboundCents,5);assert.equal(migrated.justiceArrowMinUpwardTicks,2);
  const edited=sanitizeRuntimeSettings({...migrated,justiceArrowStakeCents:150,justiceArrowMinEntryCents:40},defaults);assert.equal(edited.justiceArrowStakeCents,150);assert.equal(edited.justiceArrowMinEntryCents,40,'after migration Justice Arrow controls remain independent');
});

test('SJA2 restart hydration and recovery-priority refresh preserve an armed Justice-only ticker',async()=>{
  const s=settings({recoveryHunterEnabled:false,justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2}),q=nowQuote('SJA-RESTART',18,19),db=fakeDb(),market=fakeMarket(q),strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0}),id='JUSTICE-ARROW-V2:RESTART';
  await db.upsertOpportunityEpisode({id,systemName:s.systemName,sourceRelease:'SJA2',cohortId:'',ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',sport:'Tennis',boltAtMs:Date.now()-5000,boltSnapshot:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,crashEpisodeId:'RESTART',preCrashPeakCents:45,crashDepthCents:30},athenaDecision:{decision:'AUTHORIZED',justiceArrow:{version:SAGITTARIUS_JUSTICE_ARROW.version,policyRevision:SAGITTARIUS_JUSTICE_ARROW.policyRevision,status:'CRASH_ARMED',terminal:false,authorizationId:id,crashEpisodeId:'RESTART',ticker:q.ticker,eventTicker:q.eventTicker,authorizedAtMs:Date.now()-4000,preCrashPeakCents:45,troughCents:15,troughAtMs:Date.now()-4000,crashDepthCents:30,lastBidCents:18,upwardTicks:0}},fireCommand:{},attackSelected:'Sagittarius Justice Arrow',entryId:null,trackingComplete:false,updatedAtMs:Date.now()});
  const e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.market=market;e.strategy=strategy;e.crystalWallWatches=new Map();e.justiceArrowWatches=new Map();e.justiceArrowInFlight=new Set();e.justiceArrowStats=null;e.justiceArrowQueue={enqueue(){return true;}};e.recoveryPriorityTickers=new Set();
  await e.hydrateJusticeArrowV2();assert.ok(e.justiceArrowWatches.has(id));await e.refreshRecoveryPriorityTickers();assert.equal(e.recoveryPriorityTickers.has(q.ticker),true);
  e.observeJusticeArrowQuote(nowQuote(q.ticker,19,20),null);e.observeJusticeArrowQuote(nowQuote(q.ticker,20,21),null);assert.equal(e.justiceArrowWatches.get(id)?.qualified,true);
});


test('SJA2 quote observer is memory-only, bounded, and coalesces hot crash observation before durable work',()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2});
  const e=Object.create(SagittariusEngine.prototype);
  e.settings=s;e.justiceArrowWatches=new Map();e.justiceArrowInFlight=new Set();e.justiceArrowStats=null;e.recoveryPriorityTickers=new Set();
  let queued=0;e.queueJusticeArrowWatch=()=>{queued+=1;return true;};
  e.db=new Proxy({}, {get(){throw new Error('SJA2 quote observer must remain memory-only');}});
  const now=Date.now();
  for(let i=0;i<320;i++){
    const ticker=`SJA-HOT-${i}`;const q=nowQuote(ticker,20,21);
    e.observeJusticeArrowQuote(q,{episodeId:`HOT-${i}`,sport:'Tennis',preCrashPeakCents:45,troughCents:20,crashDepthCents:25,troughAtMs:now-1000,crashStartedAtMs:now-5000});
  }
  assert.ok(e.justiceArrowWatches.size<=256,`watch map must stay bounded: ${e.justiceArrowWatches.size}`);
  assert.equal(e.recoveryPriorityTickers.size,e.justiceArrowWatches.size);
  assert.equal(queued,320,'each new episode may queue one durable transition, never quote-by-quote SQL');
  const sample=[...e.justiceArrowWatches.values()][0];
  queued=0;
  for(let i=0;i<1000;i++)e.observeJusticeArrowQuote({...nowQuote(sample.ticker,20,21),updatedAtMs:now+i+1},null);
  assert.equal(queued,0,'ordinary non-qualified quote storm must not enqueue durable work');
  assert.ok(e.justiceArrowWatches.size<=256);
});

test('SJA2-R2 operator min profit target is independent from Infinity and freezes onto the Justice X1 snapshot',async()=>{
  const s=settings({justiceArrowEnabled:true,justiceArrowStakeCents:500,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:50,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2,justiceArrowMinProfitNetPerOriginalContractCents:10,infinityBreakMinNetPerOriginalContractCents:1});
  const snap=entryConfigSnapshot(s,'Sagittarius Justice Arrow');
  assert.equal(snap.profitAuthority,'ATHENA-X1');
  assert.equal(snap.model.profitTargetNetPerOriginalContractCents,10);
  const q=nowQuote('SJA-MINP',20,21);
  const f=strategyFixture({s,quote:q});
  const watch={authorizationId:'JUSTICE-ARROW-V2:MINP',crashEpisodeId:'MINP',ticker:q.ticker,eventTicker:q.eventTicker,preCrashPeakCents:45,troughCents:15,crashDepthCents:30,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()};
  const opened=await f.strategy.executeJusticeArrowAttack(q,watch);
  assert.ok(opened,JSON.stringify(f.db.audits));
  assert.equal(opened.entryConfig.profitAuthority,'ATHENA-X1');
  assert.equal(opened.entryConfig.infinityBreak,undefined);
  assert.equal(opened.entryConfig.economicTarget.netPerOriginalContractCents,10);
  assert.equal(opened.entryConfig.athenaExit.minimumProfitNetPerOriginalContractCents,10);
  const stale=structuredClone(opened.entryConfig.justiceArrowFire);
  stale.economicTarget={...stale.economicTarget,netPerOriginalContractCents:2};
  const blocked=validateJusticeArrowFireCommand(stale,{q,settings:s,now:Date.now()});
  assert.equal(blocked.ok,false);
  assert.ok(['justice_arrow_v2_economic_target_changed','justice_arrow_v2_fire_hash_invalid'].includes(blocked.reason),blocked.reason);
});

