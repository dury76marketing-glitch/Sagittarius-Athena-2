import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { originalSettings, sanitizeRuntimeSettings, RELEASE } from '../src/config.mjs';
import { CI1_WALL_CLONE, ATHENA_EXCLAMATION, COSMO_ROUTING } from '../src/doctrine.mjs';
import { independentCi1SignalState, hunterEntryEnvelope, attackConfiguredStakeCents, StrategyEngine, ci1EpisodeConsumptionKey, ci1EpisodeEntryConsumes } from '../src/strategy.mjs';

test('CI1-R1 doctrine makes every saint a Wall-style first entry including Athena Exclamation',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-AU2-RESET-ATTACK-COLUMN-2026-10-05');
  assert.equal(CI1_WALL_CLONE.policyRevision,'CI1-R1-WALL-CLONE-ALL-SAINTS');
  assert.equal(CI1_WALL_CLONE.stakeCents,500);
  assert.equal(CI1_WALL_CLONE.minEntryCents,90);
  assert.equal(CI1_WALL_CLONE.maxEntryCents,90);
  assert.deepEqual(CI1_WALL_CLONE.saints,[
    'Recovery Hunter','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer',
    'Crash Recovery Hunter','Scarlet Needle','Lightning Plasma','Athena Exclamation',
  ]);
  assert.equal(ATHENA_EXCLAMATION.role,'independent_ci1_crash_rebound_execution_attack');
  assert.equal(ATHENA_EXCLAMATION.minimumSaints,1);
  assert.ok(COSMO_ROUTING.independentAuthorityExceptions.includes('Momentum Hunter'));
  assert.ok(COSMO_ROUTING.independentAuthorityExceptions.includes('Athena Exclamation'));
});

test('PER1 sanitize keeps operator saint cards and does not rewrite them on save',()=>{
  const persisted={
    ...originalSettings(),
    systemName:'SAGITTARIUS',resetTimestampMs:1790698014091,
    scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:56,scarletNeedleMaxEntryCents:99,
    scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,
  };
  const out=sanitizeRuntimeSettings(persisted);
  assert.equal(out.scarletNeedleStakeCents,100);
  assert.equal(out.scarletNeedleMinEntryCents,56);
  assert.equal(out.scarletNeedleMaxEntryCents,99);
  const again=sanitizeRuntimeSettings({...out,scarletNeedleMinEntryCents:70,scarletNeedleMaxEntryCents:80,scarletNeedleStakeCents:100});
  assert.equal(again.scarletNeedleStakeCents,100);
  assert.equal(again.scarletNeedleMinEntryCents,70);
  assert.equal(again.scarletNeedleMaxEntryCents,80);
});

test('CI1-R1 clone saints share the Wall crash-rebound qualifier at 90',()=>{
  const s=sanitizeRuntimeSettings({
    ...originalSettings(),
    recoveryStakeCents:500,crystalWallMinCrashCents:15,momentumMinEntryCents:65,
    momentumStakeCents:500,momentumMinEntryCents:90,momentumMaxEntryCents:90,
    momentumHunterMinCrashCents:15,momentumHunterMinReboundCents:7,momentumHunterMinUpwardTicks:7,
    ci1WallCloneApplied:true,
  });
  const watch={ticker:'T',crashEpisodeId:'CRASH:T:1',authorizationId:'CI1-WALL-CLONE:Momentum Hunter:CRASH:T:1',preCrashPeakCents:99,troughCents:70,crashDepthCents:29,reboundCents:20,upwardTicks:8,lastBidCents:90};
  const q={ticker:'T',eventTicker:'T',yesBid:90,yesAsk:90,status:'active'};
  const signal=independentCi1SignalState('Momentum Hunter',watch,q,s,Date.now());
  assert.equal(signal.qualified,true);
  assert.equal(hunterEntryEnvelope(s,'Momentum Hunter').minEntryCents,90);
  assert.equal(attackConfiguredStakeCents(s,'Momentum Hunter'),500);
});

function ci1Quote(ticker='SUNXUX', bid=67, ask=68){
  const now=Date.now(), start=now-40*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10_000,status:'active',result:'',updatedAtMs:now,closeTimeMs:now+60*60_000,gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'ci1-r2'}};
}
test('CI1-R2 wall clone does not read authorizationId off a null Justice command',async()=>{
  const q=ci1Quote();
  const s={
    ...originalSettings(),systemName:'SAGITTARIUS',ownerId:'ci1r2',mode:'SIMULATION',liveArmed:false,engineActive:true,
    startingCapitalCents:1_000_000,simFillProbability:1,simFeeCents:2,maxPositions:50,maxEntriesPerTrade:1,hunterCooldownMinutes:240,
    minGameMinutes:30,maxGameMinutes:55,maxSpreadCents:3,galacticExplosionEnabled:true,
    momentumHunterEnabled:true,waveSurferEnabled:false,recoveryHunterEnabled:false,justiceArrowEnabled:false,
    scarletNeedleEnabled:false,lightningPlasmaEnabled:false,athenaExclamationEnabled:false,crashRecoveryHunterEnabled:false,
    momentumStakeCents:100,momentumMinEntryCents:60,momentumMaxEntryCents:92,
    momentumHunterMinCrashCents:15,momentumHunterMinReboundCents:7,momentumHunterMinUpwardTicks:7,
    momentumHunterMultiply:1,momentumHunterAthenaX1Enabled:true,momentumHunterMinProfitNetPerOriginalContractCents:1,
  };
  const rows=[];
  const audits=[];
  const db={
    rows,audits,
    async entries(){return rows.map(x=>structuredClone(x));},
    async openEntries(){return rows.filter(e=>e.status==='open').map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&e.status==='open').map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&e.status==='open').map(x=>structuredClone(x));},
    async entryById(id){const e=rows.find(x=>x.id===id);return e?structuredClone(e):null;},
    async insertEntry(e){rows.push(structuredClone(e));},
    async updateEntry(id,p){const e=rows.find(x=>x.id===id);if(e)Object.assign(e,structuredClone(p));},
    async audit(level,event,data){audits.push({level,event,data});},
    async acquireHunterTickerLock(){return async()=>{};},
    async upsertOpportunityEpisode(){return null;},
    async opportunityEpisode(){return null;},
  };
  const market={
    getQuote:()=>({...q,updatedAtMs:Date.now()}),
    quoteAgeMs:()=>0,bookAgeMs:()=>0,
    getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:q.yesBid,count:1000}],noBids:[{priceCents:100-q.yesAsk,count:1000}]}),
    async refreshTickerVerified(){return {quote:{...q,updatedAtMs:Date.now()},marketFresh:true,bookFresh:true,marketObservedAtMs:Date.now(),bookObservedAtMs:Date.now()};},
    async ensureFreshBook(){return this.getBook();},
    executableAsk(_t,c){return {filled:c,full:true,avgCents:q.yesAsk,bestCents:q.yesAsk};},
    executableBid(_t,c){return {filled:c,full:true,avgCents:q.yesBid,bestCents:q.yesBid};},
  };
  const st=new StrategyEngine({db,kalshi:{async placeOrder(){return {orderId:'SIM',fillCount:1,averageFillPriceCents:q.yesAsk};}},market,learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:async()=>q,random:()=>0});
  const watch={ticker:q.ticker,eventTicker:q.eventTicker,concept:'Momentum Hunter',crashEpisodeId:'CRASH:SUNXUX:1',authorizationId:'CI1-WALL-CLONE:Momentum Hunter:CRASH:SUNXUX:1',preCrashPeakCents:90,troughCents:60,crashDepthCents:30,reboundCents:8,upwardTicks:8,lastBidCents:q.yesBid,authorizedAtMs:Date.now(),crashStartedAtMs:Date.now()-60_000};
  let opened;
  await assert.doesNotReject(async()=>{opened=await st.executeIndependentCi1Attack('Momentum Hunter',q,watch);});
  assert.equal(audits.some(a=>String(a.data?.message||'').includes('authorizationId')),false);
  assert.ok(opened,'qualified CI1 clone must open without a Justice command');
  assert.equal(opened.conceptName,'Momentum Hunter');
  assert.equal(opened.entryConfig.ci1WallCloneFire.authorizationId,watch.authorizationId);
  assert.equal(opened.entryConfig.athenaFire,undefined);
  assert.equal(Number(opened.entryConfig.economicTarget.netPerOriginalContractCents)>0,true);
});

test('CI1-R3 stop and both resets halt clone entries',async()=>{
  const {readFile}=await import('node:fs/promises');
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const start=engine.indexOf('async attemptCi1WallCloneAttack'); const attempt=engine.slice(start, engine.indexOf('queueJusticeArrowWatch', start));
  assert.ok(attempt.includes('entryExecutionGate()'), 'clone attempts must honor Stop Engine');
  const reset=engine.slice(engine.indexOf('async resetSimulation()'), engine.indexOf('async _reconcileBroker()'));
  assert.ok(reset.includes('engineActive: false'));
  assert.ok(reset.includes('haltNewEntries'));
  assert.equal(reset.includes('resetTimestampMs: null'), false);
  const dash=engine.slice(engine.indexOf('async resetDashboard()'), engine.indexOf('async resetSimulation()'));
  assert.ok(dash.includes('engineActive: false'));
});

const episode = 'CRASH:KXATPMATCH-26OCT05TSEMEJ-MEJ:1:1791181175740';

test('CI1 episode consumption keeps clock cooldown and cap exemptions', () => {
  assert.equal(CI1_WALL_CLONE.oneEntryPerCrashEpisode, true);
  assert.equal(CI1_WALL_CLONE.ordinaryGameClockExempt, true);
  assert.equal(CI1_WALL_CLONE.ordinaryCooldownExempt, true);
  assert.equal(CI1_WALL_CLONE.ordinaryEventEntryCapExempt, true);
  assert.equal(ci1EpisodeEntryConsumes({ mode:'SIMULATION', status:'closed', archived:false }, 'SIMULATION'), true);
  assert.equal(ci1EpisodeEntryConsumes({ mode:'SIMULATION', status:'closed', archived:false }, 'LIVE'), false);
  assert.equal(ci1EpisodeEntryConsumes({ mode:'SIMULATION', status:'rejected', archived:false }, 'SIMULATION'), false);
  assert.equal(ci1EpisodeEntryConsumes({ mode:'SIMULATION', status:'closed', archived:true }, 'SIMULATION'), false);
  assert.equal(ci1EpisodeConsumptionKey('Lightning Plasma', episode), `Lightning Plasma|${episode}`);
});

test('CI1 same episode cannot re-enter after close; new episode and other mode can', async () => {
  const q = { ticker:'KXATPMATCH-26OCT05TSEMEJ-MEJ', eventTicker:'KXATPMATCH-26OCT05TSEMEJ', yesAsk:72, yesBid:71, status:'active', result:'', updatedAtMs:Date.now() };
  const s = sanitizeRuntimeSettings({ ...originalSettings(), mode:'SIMULATION', lightningPlasmaEnabled:true, lightningPlasmaMinEntryCents:60, lightningPlasmaMaxEntryCents:75, lightningPlasmaFieldStakeCents:100, lightningPlasmaMinCrashCents:0, lightningPlasmaMinReboundCents:0, lightningPlasmaMinUpwardTicks:0, lightningPlasmaMinProfitNetPerOriginalContractCents:2 });
  const rows = [{ id:'first', systemName:s.systemName, conceptName:'Lightning Plasma', sourceTradeId:episode, ticker:q.ticker, mode:'SIMULATION', status:'closed', archived:false }];
  const db = {
    async entries(){ return rows; },
    async openEntries(){ return []; },
    async openEntriesByTicker(){ return []; },
    async openHunterEntriesByTicker(){ return []; },
    async entryById(){ return null; },
    async entryByConceptSourceTradeId(_sys, concept, source){ return rows.find(e => e.conceptName===concept && e.sourceTradeId===source && e.archived!==true) || null; },
    async insertEntry(e){ rows.push(e); },
    async updateEntry(){},
    async audit(){},
    async acquireHunterTickerLock(){ return async()=>{}; },
    async upsertOpportunityEpisode(){},
    async opportunityEpisode(){ return null; },
  };
  const market = {
    getQuote:()=>({ ...q, updatedAtMs:Date.now() }), quoteAgeMs:()=>0, bookAgeMs:()=>0,
    getBook:()=>({ updatedAtMs:Date.now(), yesBids:[{priceCents:q.yesBid,count:1000}], noBids:[{priceCents:100-q.yesAsk,count:1000}] }),
    async refreshTickerVerified(){ return { quote:{...q,updatedAtMs:Date.now()}, marketFresh:true, bookFresh:true, marketObservedAtMs:Date.now(), bookObservedAtMs:Date.now() }; },
    async ensureFreshBook(){ return this.getBook(); },
    executableAsk(_t,c){ return { filled:c, full:true, avgCents:q.yesAsk, bestCents:q.yesAsk }; },
    executableBid(_t,c){ return { filled:c, full:true, avgCents:q.yesBid, bestCents:q.yesBid }; },
  };
  const watch = { ticker:q.ticker, eventTicker:q.eventTicker, concept:'Lightning Plasma', crashEpisodeId:episode, authorizationId:`CI1-WALL-CLONE:Lightning Plasma:${episode}`, preCrashPeakCents:80, troughCents:50, crashDepthCents:30, reboundCents:21, upwardTicks:4, lastBidCents:q.yesBid, authorizedAtMs:Date.now(), crashStartedAtMs:Date.now()-60_000 };
  const sim = new StrategyEngine({ db, kalshi:{ buildClientOrderId(){ return 'cid'; }, async placeOrder(){ return { orderId:'SIM', fillCount:1, averageFillPriceCents:q.yesAsk }; } }, market, learning:{}, getSettings:()=>s, getLiveReady:()=>false, refreshGameClock:async()=>q, random:()=>0 });
  assert.equal(await sim.executeIndependentCi1Attack('Lightning Plasma', q, watch), null);
  const next = { ...watch, crashEpisodeId:episode+':2', authorizationId:`CI1-WALL-CLONE:Lightning Plasma:${episode}:2` };
  const opened = await sim.executeIndependentCi1Attack('Lightning Plasma', q, next);
  assert.equal(opened?.conceptName, 'Lightning Plasma');
  const live = new StrategyEngine({ db, kalshi:{ buildClientOrderId(){ return 'cid'; }, async placeOrder(){ return { orderId:'SIM', fillCount:1, averageFillPriceCents:q.yesAsk }; } }, market, learning:{}, getSettings:()=>({ ...s, mode:'LIVE' }), getLiveReady:()=>true, refreshGameClock:async()=>q, random:()=>0 });
  const liveOpened = await live.executeIndependentCi1Attack('Lightning Plasma', q, watch);
  assert.equal(liveOpened?.mode, 'LIVE');
});

test('CI1 restart replay and concurrent reservation stay closed for a consumed episode', async () => {
  const engine = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  const attempt = engine.slice(engine.indexOf('async attemptCi1WallCloneAttack'), engine.indexOf('queueJusticeArrowWatch(authorizationOrTicker)'));
  assert.match(attempt, /one_entry_per_crash_episode/);
  assert.match(attempt, /ci1EpisodeReservations/);
  assert.match(engine, /hydrateCi1ConsumedEpisodes/);
  assert.match(engine, /listCi1ConsumedEpisodes/);
  const reset = engine.slice(engine.indexOf('async resetSimulation()'), engine.indexOf('async _reconcileBroker()'));
  assert.match(reset, /ci1ConsumedEpisodes\?\.clear/);
  const halt = engine.slice(engine.indexOf('haltNewEntries'), engine.indexOf('async setEngine'));
  assert.equal(halt.includes('ci1ConsumedEpisodes'), false);
});
