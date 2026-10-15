import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings } from '../src/config.mjs';
import { LIGHTNING_PLASMA, COSMO_ROUTING, INFINITY_BREAK, AURORA_EXECUTION, ATHENA_COMMANDER, ANOTHER_DIMENSION } from '../src/doctrine.mjs';
import { atomicThunderBoltFeatures } from '../src/opportunity.mjs';
import { rankAthenaAttacks } from '../src/athena.mjs';
import { sealAthenaFireCommand, verifyAthenaFireCommandHash } from '../src/authority.mjs';
import { StrategyEngine, entryConfigSnapshot, followUpConfirmationState, isProfitableExecutableParent, attackUsesAthenaX1 } from '../src/strategy.mjs';
import { SagittariusEngine } from '../src/engine.mjs';

const nowQuote = (ticker='LP', bid=56, ask=57) => {
  const now=Date.now(); const start=now-45*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,updatedAtMs:now,status:'active',result:'',gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',observedAtMs:now,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_fresh'}};
};
const refreshClock=async(q)=>{const now=Date.now();const start=q.gameStartTimeMs||now-45*60_000;return{gameStartTimeMs:start,liveStatus:'live',gameClockState:{...(q.gameClockState||{}),version:'GCA2',eventTicker:q.eventTicker||q.ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_force_fresh'}};};

function settings(overrides={}){
  return {...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r65-test',mode:'SIMULATION',liveArmed:false,engineActive:true,simFillProbability:1,startingCapitalCents:10_000_000,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:45,minGameMinutes:10,maxGameMinutes:90,maxSpreadCents:3,geminiEnabled:true,lightningPlasmaEnabled:true,lightningPlasmaFieldStakeCents:20_000,lightningPlasmaMinEntryCents:10,lightningPlasmaMaxEntryCents:89,...overrides};
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

function greenShadow(ticker='LP',entryPriceCents=50){
  return {id:`shadow-${ticker}`,conceptName:'Pegasus',ticker,eventTicker:ticker,status:'open',entryPriceCents,openedAtMs:Date.now()-10_000,feederState:{}};
}

function wonParent(q,overrides={}){
  return {id:'win-parent',systemName:'SAGITTARIUS',ownerId:'r65-test',conceptName:'Momentum Hunter',ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',sport:'Tennis',mode:'SIMULATION',status:'closed',remainingCount:0,entryPriceCents:50,exitPriceCents:56,peakPriceCents:58,pnlCents:800,closeReason:'infinity_break',closedAtMs:Date.now()-1_000,openedAtMs:Date.now()-120_000,sourceFeeder:'Pegasus',sourceTradeId:'cosmo-1',entryConfig:{},...overrides};
}

test('AU2 Lightning Plasma is an ordinary Athena-path initial-entry Attack',()=>{
  assert.equal(LIGHTNING_PLASMA.version,'LIGHTNING-PLASMA-V4');
  assert.equal(LIGHTNING_PLASMA.trigger,'COSMO_GREEN_ATHENA_FIRE');
  assert.equal(LIGHTNING_PLASMA.anyExecutableAttackWin,false);
  assert.equal(LIGHTNING_PLASMA.parentCannotBeSelf,true);
  assert.equal(LIGHTNING_PLASMA.defaultMaxRepeats,1);
  assert.equal(COSMO_ROUTING.followOnOnlyExceptions.includes('Lightning Plasma'),false);
  assert.equal(COSMO_ROUTING.currentInitialEntryConsumers.includes('Lightning Plasma'),true);
  const snap=entryConfigSnapshot(settings(),'Lightning Plasma');
  assert.equal(snap.model.structuralRole,'ATHENA_PATH_INITIAL_ENTRY');
  assert.equal(snap.strategicEntryAuthority,ATHENA_COMMANDER.version);
  assert.ok(String(snap.authorityChain).includes('COSMO_GREEN'));
  assert.equal(attackUsesAthenaX1(settings(),'Lightning Plasma'),false);
});

test('AU2 Lightning Plasma is present in Cosmo GREEN / ordinary Athena selection',()=>{
  const s=settings({momentumHunterEnabled:false,waveSurferEnabled:false,crashRecoveryHunterEnabled:false,athenaExclamationEnabled:false,recoveryHunterEnabled:false});
  const q=nowQuote('LP-GREEN',56,57);
  const f=atomicThunderBoltFeatures({q,history:[{t:Date.now()-30_000,bid:40,ask:41},{t:Date.now(),bid:56,ask:57}],settings:s,cosmos:[greenShadow(q.ticker,50)],fieldContext:{lightningPlasmaQualified:true,independentEventCount:3,cosmoCount:3},now:Date.now()});
  assert.equal(f.eligibleAttacks.some(x=>x.concept==='Lightning Plasma'),true);
  assert.equal(rankAthenaAttacks({score:100,features:f},s,null,{fieldContext:{lightningPlasmaQualified:true}}).some(x=>x.concept==='Lightning Plasma'),true);
});

test('AU2 a sealed Athena FIRE opens Lightning Plasma as a regular Attack',async()=>{
  const s=settings({hunterCooldownMinutes:0,minGameMinutes:10,maxGameMinutes:90});
  const q=nowQuote('LP-FORGED',56,57);
  const f=strategyFixture({s,quote:q});
  const now=Date.now();
  const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,boltId:'forged-plasma',systemName:s.systemName,sourceRelease:'R65',decidedAtMs:now,expiresAtMs:now+5000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',selectedAttack:'Lightning Plasma',selectedAttackDisplay:'Lightning Plasma',stakeCents:s.lightningPlasmaFieldStakeCents,operatorMinEntryCents:s.lightningPlasmaMinEntryCents,operatorMaxEntryCents:s.lightningPlasmaMaxEntryCents,entryPriceCents:q.yesAsk,authorizedMaxEntryCents:q.yesAsk,maxSpreadCents:s.maxSpreadCents,auroraDamageControlPercent:s.auroraDamageControlPercent,infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget:{version:'ATHENA-A3-ECONOMIC-TARGET-V1',netPerOriginalContractCents:Number(s.infinityBreakMinNetPerOriginalContractCents||1),requiredTargetBidCents:q.yesAsk+5,requiredGrossMoveCents:5,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2,targetFeasible:true},ranking:[{concept:'Lightning Plasma',score:90}],decisionEvidence:{}};
  const c=sealAthenaFireCommand(core);
  const e=await f.strategy.createHunter('Lightning Plasma',q,c.stakeCents,0,{athenaFireCommand:c});
  assert.ok(e,`blocked ${JSON.stringify(f.db.audits.slice(-8))}`);
  assert.equal(e.conceptName,'Lightning Plasma');
  assert.equal(e.entryConfig.profitAuthority,INFINITY_BREAK.version);
  assert.equal(e.entryConfig.aurora.frozen,true);
});

test('AU1 0/0/0 confirmation is immediately qualified and operator rebound waits for lift',()=>{
  const off=settings();
  const immediate=followUpConfirmationState({parentExitPriceCents:56,troughCents:56,lastBidCents:56},nowQuote('LP-REB',56,57),off,Date.now(),'Lightning Plasma');
  assert.equal(immediate.qualified,true);
  const gated=settings({lightningPlasmaMinReboundCents:5});
  const atExit=followUpConfirmationState({parentExitPriceCents:56,troughCents:56,lastBidCents:56},nowQuote('LP-REB',56,57),gated,Date.now(),'Lightning Plasma');
  assert.equal(atExit.qualified,false);assert.equal(atExit.reason,'rebound_not_confirmed');
  const after=followUpConfirmationState({parentExitPriceCents:56,troughCents:56,lastBidCents:56},nowQuote('LP-REB',62,63),gated,Date.now(),'Lightning Plasma');
  assert.equal(after.qualified,true);assert.equal(after.reboundCents,6);
});

test('AU2 former Plasma win-follow-up executor is inert',async()=>{
  const s=settings();
  const q=nowQuote('LP-OPEN',56,57);
  const f=strategyFixture({s,quote:q});
  const parent=wonParent(q);
  assert.equal(await f.strategy.executeLightningPlasmaContinuation(q,parent,{authorizationId:'LIGHTNING-PLASMA-CONTINUATION:win-parent:1'}),null);
});

test('AU2 engine Plasma close-follow-up handler is retired',async()=>{
  const s=settings();
  const q=nowQuote('LP-WATCH',56,57);
  const db=fakeDb();
  const market=fakeMarket(q);
  const strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings=s;engine.db=db;engine.market=market;engine.strategy=strategy;
  engine.lightningPlasmaContinuationInFlight=new Set();engine.lightningPlasmaWatches=new Map();engine.lightningPlasmaContinuationStats=null;
  const first=await engine.handleLightningPlasmaContinuation(wonParent(q));
  assert.equal(first.status,'IGNORED');
  assert.equal(first.reason,'follow_up_retired_athena_initial_entry');
});
