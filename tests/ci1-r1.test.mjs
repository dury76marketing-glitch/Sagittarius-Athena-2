import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { originalSettings, sanitizeRuntimeSettings, RELEASE } from '../src/config.mjs';
import { CI1_WALL_CLONE, ATHENA_EXCLAMATION, COSMO_ROUTING } from '../src/doctrine.mjs';
import { independentCi1SignalState, hunterEntryEnvelope, attackConfiguredStakeCents, StrategyEngine, ci1EpisodeConsumptionKey, ci1EpisodeEntryConsumes } from '../src/strategy.mjs';

test('CI1-R1 doctrine makes every saint a Wall-style first entry including Athena Exclamation',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-AU2-SE2-R24-FACTORY-DIAG-CLONE-2026-10-12');
  assert.equal(CI1_WALL_CLONE.policyRevision,'CI1-R1-WALL-CLONE-ALL-SAINTS');
  assert.equal(CI1_WALL_CLONE.stakeCents,500);
  assert.equal(CI1_WALL_CLONE.minEntryCents,90);
  assert.equal(CI1_WALL_CLONE.maxEntryCents,90);
  assert.deepEqual(CI1_WALL_CLONE.saints,[
    'Recovery Hunter','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer',
    'Scarlet Needle','Lightning Plasma','Athena Exclamation',
  ]);
  assert.equal(CI1_WALL_CLONE.saints.includes('Crash Recovery Hunter'), false);
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
    subscribeQuote:()=>()=>{}, // static fixture
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
    subscribeQuote:()=>()=>{}, // static fixture: no asynchronous price changes
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

// CQ3 release regressions: real quote publication and entry code, no broker network.
{
  const {MarketHub}=await import('../src/market.mjs');
  const {LearningEngine}=await import('../src/learning.mjs');
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {crystalWallSignalState,justiceArrowSignalState}=await import('../src/strategy.mjs');
  const {BUILD_INFO}=await import('../src/authority.mjs');
  const concepts=['Recovery Hunter','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer','Scarlet Needle','Athena Exclamation','Lightning Plasma'];
  function card(mode){
    const s={...originalSettings(),mode,systemName:'CQ3',ownerId:'CQ3',engineActive:true,liveArmed:mode==='LIVE',startingCapitalCents:1e6,simFeeCents:2,simFillProbability:1,maxPositions:1000,maxEntriesPerTrade:1,hunterCooldownMinutes:181,galacticExplosionEnabled:true,minGameMinutes:30,maxGameMinutes:55,maxSpreadCents:3,infinityBreakMinNetPerOriginalContractCents:13,auroraDamageControlPercent:70};
    for(const [p,k] of [['recovery','recoveryStakeCents'],['justiceArrow','justiceArrowStakeCents'],['momentum','momentumStakeCents'],['wave','waveStakeCents'],['crashRecovery','crashRecoveryStakeCents'],['scarletNeedle','scarletNeedleStakeCents'],['athenaExclamation','athenaExclamationStakeCents'],['lightningPlasma','lightningPlasmaFieldStakeCents']]){s[p+'MinEntryCents']=80;s[p+'MaxEntryCents']=88;s[k]=500;}
    for(const p of ['crystalWall','justiceArrow','momentumHunter','waveSurfer','crashRecoveryHunter','scarletNeedle','athenaExclamation','lightningPlasma']){s[p+'MinCrashCents']=7;s[p+'MinReboundCents']=5;s[p+'MinUpwardTicks']=7;}
    for(const p of ['recoveryHunter','justiceArrow','momentumHunter','waveSurfer','crashRecoveryHunter','scarletNeedle','athenaExclamation','lightningPlasma']){s[p+'Enabled']=true;s[p+'Multiply']=1;s[p+'AthenaX1Enabled']=true;s[p+'MinProfitNetPerOriginalContractCents']=13;}
    return s;
  }
  const signal=(c,w,q,s)=>c==='Recovery Hunter'?crystalWallSignalState(w,q,s):c==='Sagittarius Justice Arrow'?justiceArrowSignalState(w,q,s):independentCi1SignalState(c,w,q,s);
  async function execute(mode,scenario,concept='Momentum Hunter'){
    const realNow=Date.now,now=Date.now(),s=card(mode),saved=structuredClone(s),rows=[],audits=[];
    let orders=0,locks=0,quoteTime=now,triggered=false;
    const ticker='KXITFMATCH-CQ3-YES';
    const q=bid=>({ticker,eventTicker:'KXITFMATCH-CQ3',title:'Regression',yesBid:bid,yesAsk:bid+1,status:'active',result:'',quoteAtMs:quoteTime,updatedAtMs:quoteTime,closeTimeMs:now+3600000,canCloseEarly:true,recentTrades:2,liveStatus:'live',gameStartTimeMs:now-180*60000});
    const prior={ticker,eventTicker:'KXITFMATCH-CQ3',concept,authorizationId:'CQ3-WATCH',crashEpisodeId:'CRASH:CQ3:1',crashStartedAtMs:now-300000,authorizedAtMs:now-300000,preCrashPeakCents:90,troughCents:65,troughAtMs:now-100000,crashDepthCents:25,lastBidCents:80,upwardTicks:6};
    const owner=Object.create(SagittariusEngine.prototype);
    Object.assign(owner,{crystalWallWatches:new Map(),justiceArrowWatches:new Map(),ci1CloneWatches:new Map()});
    const map=concept==='Recovery Hunter'?owner.crystalWallWatches:concept==='Sagittarius Justice Arrow'?owner.justiceArrowWatches:owner.ci1CloneWatches;
    const key=concept==='Recovery Hunter'||concept==='Sagittarius Justice Arrow'?prior.authorizationId:owner.ci1CloneWatchKey(concept,prior.authorizationId);
    const captured=signal(concept,prior,q(81),s);map.set(key,captured);
    const market=new MarketHub({kalshi:{},getCredentials:()=>({}),onQuote:quote=>{const current=map.get(key);if(current)map.set(key,signal(concept,current,quote,s));}});
    market.seed(q(81));
    const book=()=>({source:'REST',updatedAtMs:quoteTime,yesBids:[{priceCents:market.getQuote(ticker).yesBid,count:1000}],noBids:[{priceCents:100-market.getQuote(ticker).yesAsk,count:1000}]});
    market.books.set(ticker,book());
    function tick(bid){quoteTime=Math.max(quoteTime,Date.now());market.publishQuote(q(bid),{source:'TEST',emit:true});market.books.set(ticker,book());}
    function change(stage){
      if(triggered||scenario!==stage)return;triggered=true;
      if(stage==='mode_changed')s.mode=mode==='LIVE'?'SIMULATION':'LIVE';
      else if(stage==='stopped')s.engineActive=false;
      else if(stage==='settings_changed')s.auroraDamageControlPercent=45;
      else if(stage==='expired')Date.now=()=>realNow()+6000;
      else if(stage==='watch_deleted')map.delete(key);
      else if(stage==='book_invalid')market.quotes.set(ticker,{...market.getQuote(ticker),bookInvalid:true});
      else if(stage==='market_final'){market.publishQuote({...q(81),status:'settled',result:'yes'},{emit:true});}
      else if(stage==='broker_exception')throw new Error('mock broker lock failed');
      else {tick(79);if(stage==='down_up'||stage==='late_down_up')tick(81);}
    }
    const active=e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status);
    const db={entries:async()=>rows,openEntries:async()=>rows.filter(active),openEntriesByTicker:async()=>rows.filter(active),openHunterEntriesByTicker:async()=>rows.filter(active),entryByConceptSourceTradeId:async()=>null,
      insertEntry:async e=>{rows.push(structuredClone(e));if(mode==='LIVE')change('after_intent');},updateEntry:async(id,p)=>Object.assign(rows.find(e=>e.id===id),structuredClone(p)),audit:async(level,event,data)=>audits.push({level,event,data}),
      acquireHunterTickerLock:async(_system,k)=>{locks++;if(String(k).startsWith('broker:')){change('broker_lock');change('late_down_up');change('mode_changed');change('stopped');change('settings_changed');change('expired');change('watch_deleted');change('book_invalid');change('market_final');change('broker_exception');}return async()=>{if(!String(k).startsWith('broker:'))change('commit_unlock');};}};
    market.refreshTickerVerified=async()=>{change('down_up');change('direct_drop');return{quote:market.getQuote(ticker),book:book(),marketFresh:true,bookFresh:true,marketObservedAtMs:Date.now(),bookObservedAtMs:Date.now()};};
    market.verifyTickerSnapshot=market.refreshTickerVerified;
    const broker={buildClientOrderId:()=>`CQ3-${mode}`,ensureExchangeBalance:async()=>{change('after_balance');return{ok:true,exchangeIndex:0,availableCents:1e6};},placeOrder:async args=>{assert.equal(rows[0].status,'entry_pending');orders++;return{ok:true,orderId:'MOCK-NO-NETWORK',fillCount:args.count,averageFillPriceCents:args.priceCents,feePaidCents:6.72};}};
    const st=new StrategyEngine({db,kalshi:broker,market,learning:{},getSettings:()=>s,getLiveReady:()=>s.liveArmed,getCurrentCrashWatch:(c,a,e)=>owner.currentCrashWatch(c,a,e),refreshGameClock:async()=>{throw new Error('independent route must preserve clock exemption');},random:()=>0});
    const cash=st.simulationAvailableCashCents.bind(st);
    st.simulationAvailableCashCents=async()=>{const v=await cash();change('after_cash');if(mode==='SIMULATION'){change('mode_changed');change('stopped');change('settings_changed');change('expired');change('watch_deleted');change('book_invalid');change('market_final');change('late_down_up');}return v;};
    let opened,error;
    try{opened=concept==='Recovery Hunter'?await st.executeCrystalWallAttack(q(81),prior):concept==='Sagittarius Justice Arrow'?await st.executeJusticeArrowAttack(q(81),prior):await st.executeIndependentCi1Attack(concept,q(81),prior);}catch(e){error=e;}finally{Date.now=realNow;}
    assert.equal(market.quoteObservers?.size||0,0,'attempt listeners are always released');
    if(!['mode_changed','stopped','settings_changed'].includes(scenario))assert.deepEqual(s,saved,'repair cannot modify settings');
    return{opened,error,orders,rows,audits,captured,current:map.get(key),st,s,market};
  }
  for(const concept of concepts)for(const mode of ['SIMULATION','LIVE']){
    test(`CQ3 ${mode} ${concept}: valid signal opens with immutable build evidence`,async()=>{
      const r=await execute(mode,'valid',concept);assert.ifError(r.error);assert.ok(r.opened,JSON.stringify(r.audits));assert.equal(r.orders,mode==='LIVE'?1:0);assert.equal(r.opened.entryConfig.executionBuild.id,BUILD_INFO.id);assert.equal(r.opened.entryConfig.finalEntryConfirmation.ok,true);
    });
    for(const scenario of ['down_up','late_down_up',mode==='LIVE'?'after_balance':'after_cash'])test(`CQ3 ${mode} ${concept}: ${scenario} blocks stale approval`,async()=>{
      const r=await execute(mode,scenario,concept);assert.ifError(r.error);assert.equal(r.opened,null);assert.equal(r.orders,0);assert.equal(r.rows.some(e=>e.status==='open'),false);assert.equal(r.captured.upwardTicks,7);assert.ok(r.current.upwardTicks<7);
      for(const row of r.rows)assert.equal(ci1EpisodeEntryConsumes(row,mode),false,'definitely unsubmitted intent does not consume episode');
    });
  }
  for(const mode of ['SIMULATION','LIVE'])for(const scenario of ['mode_changed','stopped','settings_changed','expired','watch_deleted','book_invalid','market_final'])test(`CQ3 ${mode} final authority change ${scenario} blocks submission`,async()=>{const r=await execute(mode,scenario);assert.ifError(r.error);assert.equal(r.opened,null);assert.equal(r.orders,0);});
  for(const scenario of ['after_intent','broker_lock','commit_unlock'])test(`CQ3 LIVE ${scenario}: durable intent rejected before broker call`,async()=>{const r=await execute('LIVE',scenario);assert.ifError(r.error);assert.equal(r.opened,null);assert.equal(r.orders,0);assert.equal(r.rows[0].status,'rejected');assert.equal(r.rows[0].remainingCount,0);});
  test('CQ3 error during broker-lock acquisition releases the quote observer',async()=>{const r=await execute('LIVE','broker_exception');assert.match(r.error.message,/mock broker lock failed/);assert.equal(r.orders,0);});

  test('CQ3 real websocket sequence reaches crash learning at equal timestamps',()=>{
    const at=Date.now(),ticker='CQ3-SEQ',s=card('SIMULATION'),learning=new LearningEngine({},'CQ3');
    const hub=new MarketHub({kalshi:{},getCredentials:()=>({}),onQuote:q=>learning.observeCrashQuote(q,s,q.quoteAtMs)});
    hub.seed({ticker,eventTicker:ticker,yesBid:90,yesAsk:91,status:'active',updatedAtMs:at-1});
    hub.handle({type:'orderbook_snapshot',sid:17,seq:1,msg:{market_ticker:ticker,ts_ms:at,yes_dollars_fp:[['0.90','10'],['0.70','10']],no_dollars_fp:[['0.09','10']]}});
    hub.handle({type:'orderbook_delta',sid:17,seq:2,msg:{market_ticker:ticker,ts_ms:at,side:'yes',price_dollars:'0.90',delta_fp:'-10'}});
    assert.equal(hub.getQuote(ticker).quoteObservation.sequence,2);assert.equal(learning.crashStates.get(ticker).lastBidCents,70);assert.equal(learning.crashStates.get(ticker).phase,'CRASHING');
    const latest=structuredClone(hub.getQuote(ticker));hub.seed({...latest,yesBid:90,quoteAtMs:at-1,updatedAtMs:at-1});assert.equal(hub.getQuote(ticker).yesBid,70);
    const old=learning.observeCrashQuote({...latest,yesBid:90,quoteObservation:{...latest.quoteObservation,revision:latest.quoteObservation.revision-1}},s,at);
    assert.equal(old.transition,'STALE_OBSERVATION');assert.equal(learning.crashStates.get(ticker).lastBidCents,70);
  });
  test('CQ3 stream replay remains rejected across other quote sources; reconnect sequence may restart',()=>{
    const hub=new MarketHub({kalshi:{},getCredentials:()=>({}),onQuote:()=>{}}),at=Date.now(),q={ticker:'T',yesBid:80,yesAsk:81,status:'active',quoteAtMs:at};
    hub.publishQuote(q,{source:'WS_TICKER',stream:'1:7',sequence:10});hub.publishQuote(q,{source:'REST'});
    hub.publishQuote({...q,yesBid:60},{source:'WS_TICKER',stream:'1:7',sequence:9});assert.equal(hub.getQuote('T').yesBid,80);
    hub.publishQuote({...q,yesBid:79},{source:'WS_TICKER',stream:'2:7',sequence:1});assert.equal(hub.getQuote('T').yesBid,79);
  });
  test('CQ3 concurrent REST proof cannot replay a price over a newer canonical quote',async()=>{
    let resolveMarket,resolveBook;const at=Date.now();const hub=new MarketHub({kalshi:{getMarket:()=>new Promise(r=>resolveMarket=r),getOrderbook:()=>new Promise(r=>resolveBook=r)},getCredentials:()=>({}),onQuote:()=>{}});
    hub.seed({ticker:'T',yesBid:90,yesAsk:91,status:'active',updatedAtMs:at});
    const pending=hub.refreshTickerVerified('T');
    hub.publishQuote({ticker:'T',yesBid:81,yesAsk:82,status:'active',updatedAtMs:at},{source:'WS_BOOK',stream:'1:1',sequence:1});
    hub.books.set('T',{source:'WS',sequenceValid:true,seq:1,updatedAtMs:at,yesBids:[{priceCents:81,count:20}],noBids:[{priceCents:18,count:20}]});
    resolveMarket({ticker:'T',yesBid:70,yesAsk:71,status:'active',updatedAtMs:at});resolveBook({yesBids:[{priceCents:70,count:20}],noBids:[{priceCents:29,count:20}],updatedAtMs:at});
    const verified=await pending;assert.equal(verified.quote.yesBid,81);assert.equal(hub.getQuote('T').yesBid,81);assert.equal(hub.getBook('T').seq,1);
  });
  test('CQ3 fullScan cannot replay discovery after a newer quote arrived during later work',async()=>{
    const at=Date.now(),s=card('SIMULATION'),ticker='KXITFMATCH-CQ3-SCAN';
    const quote=(bid,time)=>({ticker,eventTicker:ticker,yesBid:bid,yesAsk:bid+1,status:'active',quoteAtMs:time,updatedAtMs:time,recentTrades:1});
    const learning=new LearningEngine({},'CQ3');learning.observeCrashQuote(quote(70,at-3000),s,at-3000);
    const engine=Object.create(SagittariusEngine.prototype);
    Object.assign(engine,{settings:s,speed:{},health:{},db:{openEntries:async()=>[],openHunterEntries:async()=>[],trackers:async()=>[],audit:async()=>{}},recoveryPriorityTickers:new Set(),crashPriorityTickers:new Set(),learning,
      market:{discover:async()=>[quote(70,at-3000)],sample:()=>{},getQuote:()=>quote(90,at-1000),quotes:new Map()},
      refreshRecoveryPriorityTickers:async()=>{},refreshCrashPriorityTickers:()=>{},persistTrackers:async()=>{learning.observeCrashQuote(quote(90,at-1000),s,at-1000);return new Map();},
      runProtectionSweep:async()=>{},evaluateEntryChain:async()=>[],runPostExitResearchIfDue:async()=>{},reconcileBroker:async()=>{},testConnection:async()=>{},snapshot:async()=>{},recomputeHealth:()=>{},recordError:(_event,e)=>{throw e;}});
    for(const name of ['trackRecovery','learnMarketDrops','aggregatePatterns','learnDurations','trackStopGuardRecovery','aggregateStopGuardProfiles'])learning[name]=async()=>{};
    await engine.fullScan();assert.equal(learning.crashStates.get(ticker).lastBidCents,90);assert.notEqual(learning.crashStates.get(ticker).phase,'CRASHING');
  });
  test('CQ3 terminal clone watches do not accumulate across 1000 completed markets',()=>{
    const at=Date.now(),engine=Object.create(SagittariusEngine.prototype);
    Object.assign(engine,{settings:card('SIMULATION'),ci1CloneWatches:new Map(),ci1ConsumedEpisodes:new Set(['PRESERVE']),ci1CloneStats:{eligible:0},entryExecutionGate:()=>({allowed:false})});
    for(let i=0;i<1000;i++){
      const q={ticker:'CQ3-'+i,eventTicker:'CQ3-'+i,yesBid:65,yesAsk:66,status:'active',updatedAtMs:at};
      engine.observeCi1WallCloneQuotes(q,{episodeId:'EP-'+i,preCrashPeakCents:90,troughCents:65,crashDepthCents:25,crashStartedAtMs:at,troughAtMs:at});
      engine.observeCi1WallCloneQuotes({...q,status:'settled',result:'yes'},null);
    }
    assert.equal(engine.ci1CloneWatches.size,0);assert.equal(engine.ci1ConsumedEpisodes.has('PRESERVE'),true);
  });

}
