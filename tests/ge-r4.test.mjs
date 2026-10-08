import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, RELEASE } from '../src/config.mjs';
import { GALACTIC_EXPLOSION, ATHENA_COMMANDER, INFINITY_BREAK } from '../src/doctrine.mjs';
import { sealAthenaFireCommand } from '../src/authority.mjs';
import { StrategyEngine } from '../src/strategy.mjs';

function nowQuote(ticker='JOIN', bid=87, ask=88){
  const now=Date.now(), start=now-40*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10_000,status:'active',result:'',updatedAtMs:now,closeTimeMs:now+60*60_000,gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'ge_r4'}};
}
function refreshClock(q){const now=Date.now();return Promise.resolve({gameClockState:{...q.gameClockState,evidenceObservedAtMs:now,lastCheckedAtMs:now,entryAuthorized:true,confirmed:true,phase:'CONFIRMED'},gameStartTimeMs:q.gameStartTimeMs,liveStatus:'live'});}
function market(q){
  let quote={...q};
  return {
    getQuote:()=>({...quote}),
    quoteAgeMs:()=>0,bookAgeMs:()=>0,
    getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:quote.yesBid,count:10_000}],noBids:[{priceCents:100-quote.yesAsk,count:10_000}]}),
    async refreshTickerVerified(){quote={...quote,updatedAtMs:Date.now()};return{quote,marketFresh:true,bookFresh:true,marketObservedAtMs:Date.now(),bookObservedAtMs:Date.now()};},
    async ensureFreshBook(){return this.getBook();},
    executableAsk(_t,c){return{filled:c,full:true,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},
    executableBid(_t,c){return{filled:c,full:true,avgCents:quote.yesBid,bestCents:quote.yesBid};},
  };
}
function memoryDb(initial=[]){
  const rows=initial.map(x=>structuredClone(x));
  const active=(s)=>['open','entry_pending','exit_pending','pending_recovery'].includes(String(s));
  return {
    rows,audits:[],
    async entries(){return rows.map(x=>structuredClone(x));},
    async openEntries(){return rows.filter(e=>active(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&active(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&active(e.status)&&!['Pegasus','Dragon','Phoenix'].includes(e.conceptName)).map(x=>structuredClone(x));},
    async entryById(id){const e=rows.find(x=>x.id===id);return e?structuredClone(e):null;},
    async insertEntry(e){rows.push(structuredClone(e));},
    async updateEntry(id,p){const e=rows.find(x=>x.id===id);if(e)Object.assign(e,structuredClone(p));},
    async audit(level,event,data){this.audits.push({level,event,data});},
    async acquireHunterTickerLock(){return async()=>{};},
    async upsertOpportunityEpisode(){return null;},
  };
}
function settings(overrides={}){
  return {
    ...originalSettings(),systemName:'SAGITTARIUS',ownerId:'ge-r4',mode:'SIMULATION',liveArmed:false,engineActive:true,
    startingCapitalCents:1_000_000,simFillProbability:1,simFeeCents:2,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,
    minGameMinutes:0,maxGameMinutes:0,maxSpreadCents:3,
    galacticExplosionEnabled:true,
    pegasusEnabled:true,dragonEnabled:true,phoenixEnabled:true,
    momentumHunterEnabled:true,waveSurferEnabled:true,crashRecoveryHunterEnabled:true,
    scarletNeedleEnabled:true,lightningPlasmaEnabled:true,recoveryHunterEnabled:true,justiceArrowEnabled:true,
    athenaExclamationEnabled:false,geminiEnabled:false,
    momentumStakeCents:100,waveStakeCents:100,crashRecoveryStakeCents:100,scarletNeedleStakeCents:100,
    lightningPlasmaFieldStakeCents:100,recoveryStakeCents:100,justiceArrowStakeCents:100,
    momentumMinEntryCents:80,momentumMaxEntryCents:95,
    waveMinEntryCents:80,waveMaxEntryCents:95,
    crashRecoveryMinEntryCents:80,crashRecoveryMaxEntryCents:95,
    scarletNeedleMinEntryCents:80,scarletNeedleMaxEntryCents:95,
    lightningPlasmaMinEntryCents:80,lightningPlasmaMaxEntryCents:95,
    recoveryMinEntryCents:80,recoveryMaxEntryCents:95,
    justiceArrowMinEntryCents:80,justiceArrowMaxEntryCents:95,
    momentumHunterMinCrashCents:0,momentumHunterMinReboundCents:0,momentumHunterMinUpwardTicks:0,
    waveSurferMinCrashCents:0,waveSurferMinReboundCents:0,waveSurferMinUpwardTicks:0,
    crashRecoveryHunterMinCrashCents:0,crashRecoveryHunterMinReboundCents:0,crashRecoveryHunterMinUpwardTicks:0,
    scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,
    lightningPlasmaMinCrashCents:0,lightningPlasmaMinReboundCents:0,lightningPlasmaMinUpwardTicks:0,
    crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,
    justiceArrowMinCrashCents:0,justiceArrowMinReboundCents:0,justiceArrowMinUpwardTicks:0,
    ...overrides,
  };
}
function engine(s,q){
  const db=memoryDb();
  const st=new StrategyEngine({db,kalshi:{},market:market(q),learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  return {st,db,q};
}
function momCommand(s,q){
  const now=Date.now();
  const target=Number(s.infinityBreakMinNetPerOriginalContractCents??1);
  const simFee=Number(s.simFeeCents||0);
  const requiredTargetBidCents=q.yesAsk+target+2*simFee;
  const core={
    version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,
    boltId:'bolt-ge-r4',boltFingerprint:'fp',systemName:s.systemName,sourceRelease:RELEASE,
    decidedAtMs:now,expiresAtMs:now+5_000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',
    selectedAttack:'Momentum Hunter',selectedAttackDisplay:'Momentum Hunter',
    stakeCents:s.momentumStakeCents,fieldBudgetCents:null,maxRays:null,
    operatorMinEntryCents:s.momentumMinEntryCents,operatorMaxEntryCents:s.momentumMaxEntryCents,
    entryPriceCents:q.yesAsk,authorizedMaxEntryCents:q.yesAsk,maxSpreadCents:s.maxSpreadCents,
    auroraDamageControlPercent:s.auroraDamageControlPercent,infinityBreakPolicyVersion:INFINITY_BREAK.version,
    economicTarget:{version:'ATHENA-A3-ECONOMIC-TARGET-V1',netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents:requiredTargetBidCents-q.yesAsk,estimatedEntryFeePerContractCents:simFee,estimatedExitFeePerContractCents:simFee,targetFeasibilityScore:100,targetFeasible:true},
    survivalCertificate:null,ranking:[{concept:'Momentum Hunter',score:90}],
    decisionEvidence:{features:{askCents:q.yesAsk,bidCents:q.yesBid,crashDepthCents:20,reboundCents:10,upwardTicks:8}},
  };
  return sealAthenaFireCommand(core);
}

test('GE-R4 doctrine keeps OFF as one-ticker-one-hunter and ON as card-join',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-AU2-RESET-ATTACK-COLUMN-2026-10-05');
  assert.equal(GALACTIC_EXPLOSION.policyRevision,'GE-R4-OPEN-TICKER-CARD-JOIN');
  assert.equal(GALACTIC_EXPLOSION.disabledLockScope,'exact_ticker');
  assert.equal(GALACTIC_EXPLOSION.enabledLockScope,'exact_ticker_plus_attack_identity');
  assert.equal(GALACTIC_EXPLOSION.sameAttackDuplicatesAllowed,false);
  assert.ok(GALACTIC_EXPLOSION.grantedSaints.includes('Sagittarius Justice Arrow'));
  assert.ok(GALACTIC_EXPLOSION.grantedSaints.includes('Recovery Hunter'));
  assert.equal(originalSettings().galacticExplosionEnabled,false);
});

test('GE OFF: Athena Momentum fire does not mint other saints on the same ticker',async()=>{
  const q=nowQuote('OFF1');
  const s=settings({galacticExplosionEnabled:false});
  const {st,db}=engine(s,q);
  const cmd=momCommand(s,q);
  const opened=await st.executeAthenaFire(q,{id:cmd.boltId,ticker:q.ticker,eventTicker:q.eventTicker,features:cmd.decisionEvidence.features}, {decision:'FIRE',fireCommand:cmd,selectedAttack:'Momentum Hunter'},{cosmos:[]});
  assert.ok(opened);
  const hunters=db.rows.filter(e=>!['Pegasus','Dragon','Phoenix'].includes(e.conceptName));
  assert.equal(hunters.length,1);
  assert.equal(hunters[0].conceptName,'Momentum Hunter');
});

test('GE ON: Athena Momentum fire joins every enabled saint whose band and 0/0/0 card pass',async()=>{
  const q=nowQuote('ON1');
  const s=settings({galacticExplosionEnabled:true});
  const {st,db}=engine(s,q);
  const cmd=momCommand(s,q);
  const opened=await st.executeAthenaFire(q,{id:cmd.boltId,ticker:q.ticker,eventTicker:q.eventTicker,features:cmd.decisionEvidence.features},{decision:'FIRE',fireCommand:cmd,selectedAttack:'Momentum Hunter'},{cosmos:[]});
  assert.ok(opened);
  const names=db.rows.map(e=>e.conceptName).sort();
  assert.ok(names.includes('Momentum Hunter'));
  assert.ok(names.includes('Wave Surfer'));
  assert.ok(names.includes('Lightning Plasma'));
  assert.ok(names.includes('Scarlet Needle'));
  assert.ok(names.includes('Crash Recovery Hunter'));
  assert.ok(names.includes('Recovery Hunter'));
  assert.ok(names.includes('Sagittarius Justice Arrow'));
  assert.equal(names.includes('Athena Exclamation'),false);
  assert.equal(names.filter(n=>n==='Momentum Hunter').length,1);
});

test('GE ON: a saint outside its band is not forced in',async()=>{
  const q=nowQuote('BAND');
  const s=settings({galacticExplosionEnabled:true,waveMinEntryCents:60,waveMaxEntryCents:69});
  const {st,db}=engine(s,q);
  const cmd=momCommand(s,q);
  await st.executeAthenaFire(q,{id:cmd.boltId,ticker:q.ticker,eventTicker:q.eventTicker,features:cmd.decisionEvidence.features},{decision:'FIRE',fireCommand:cmd,selectedAttack:'Momentum Hunter'},{cosmos:[]});
  const names=db.rows.map(e=>e.conceptName);
  assert.ok(names.includes('Momentum Hunter'));
  assert.equal(names.includes('Wave Surfer'),false);
  const skip=db.audits.filter(a=>a.event==='galactic_saint_grant_skipped'&&a.data?.concept==='Wave Surfer');
  assert.ok(skip.length>=1);
  assert.equal(skip[0].data.reason,'band_or_stake');
});

test('GE ON: failed confirmation card is not forced in',async()=>{
  const q=nowQuote('CONF');
  const s=settings({galacticExplosionEnabled:true,waveSurferMinCrashCents:25,waveSurferMinReboundCents:3,waveSurferMinUpwardTicks:3});
  const {st,db}=engine(s,q);
  const cmd=momCommand(s,q);
  await st.executeAthenaFire(q,{id:cmd.boltId,ticker:q.ticker,eventTicker:q.eventTicker,features:{crashDepthCents:8,reboundCents:1,upwardTicks:1,askCents:q.yesAsk,bidCents:q.yesBid}},{decision:'FIRE',fireCommand:cmd,selectedAttack:'Momentum Hunter'},{cosmos:[]});
  const names=db.rows.map(e=>e.conceptName);
  assert.ok(names.includes('Momentum Hunter'));
  assert.equal(names.includes('Wave Surfer'),false);
});

test('GE ON: Justice Arrow crash-door open joins other passing cards on the same ticker',async()=>{
  const q=nowQuote('JA1');
  const s=settings({galacticExplosionEnabled:true});
  const {st,db}=engine(s,q);
  const watch={ticker:q.ticker,eventTicker:q.eventTicker,crashEpisodeId:'CRASH:JA1:1',authorizationId:'JUSTICE-ARROW-V2:CRASH:JA1:1',preCrashPeakCents:98,troughCents:70,crashDepthCents:28,reboundCents:17,upwardTicks:8,lastBidCents:q.yesBid};
  const opened=await st.executeJusticeArrowAttack(q,watch);
  assert.ok(opened);
  const names=db.rows.map(e=>e.conceptName);
  assert.ok(names.includes('Sagittarius Justice Arrow'));
  assert.ok(names.includes('Lightning Plasma'));
  assert.ok(names.includes('Recovery Hunter'));
  assert.equal(names.filter(n=>n==='Sagittarius Justice Arrow').length,1);
});

test('GE OFF: Justice Arrow crash-door open does not join other saints',async()=>{
  const q=nowQuote('JA0');
  const s=settings({galacticExplosionEnabled:false});
  const {st,db}=engine(s,q);
  const watch={ticker:q.ticker,eventTicker:q.eventTicker,crashEpisodeId:'CRASH:JA0:1',authorizationId:'JUSTICE-ARROW-V2:CRASH:JA0:1',preCrashPeakCents:98,troughCents:70,crashDepthCents:28,reboundCents:17,upwardTicks:8,lastBidCents:q.yesBid};
  const opened=await st.executeJusticeArrowAttack(q,watch);
  assert.ok(opened);
  const hunters=db.rows.filter(e=>!['Pegasus','Dragon','Phoenix'].includes(e.conceptName));
  assert.equal(hunters.length,1);
  assert.equal(hunters[0].conceptName,'Sagittarius Justice Arrow');
});
