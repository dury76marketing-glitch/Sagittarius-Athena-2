import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { originalSettings, CANONICAL_NUMERIC_SETTINGS, sanitizeRuntimeSettings } from '../src/config.mjs';
import { ATOMIC_THUNDER_BOLT, ATHENA_COMMANDER, ARAYASHIKI, INFINITY_BREAK, AURORA_EXECUTION, SCARLET_NEEDLE, CRYSTAL_WALL } from '../src/doctrine.mjs';
import { AtomicThunderBoltEngine, atomicThunderBoltDecision, atomicThunderBoltFeatures } from '../src/opportunity.mjs';
import { AthenaCommander, compileAthenaAttackMemory, rankAthenaAttacks } from '../src/athena.mjs';
import { sealAthenaFireCommand, verifyAthenaFireCommandHash } from '../src/authority.mjs';
import { sealArayashikiCertificate } from '../src/arayashiki.mjs';
import { StrategyEngine, validateAthenaFireCommand, entryConfigSnapshot } from '../src/strategy.mjs';
import { ProfitGuard } from '../src/profitGuard.mjs';
import { SagittariusEngine, SimulationMutationGate } from '../src/engine.mjs';
import { KalshiClient } from '../src/kalshi.mjs';

const nowQuote = (ticker='T', bid=54, ask=55) => {
  const now=Date.now(); const start=now-45*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,updatedAtMs:now,status:'active',result:'',gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',observedAtMs:now,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_fresh'}};
};
const refreshClock=async(q)=>{const now=Date.now();const start=q.gameStartTimeMs||now-45*60_000;return{gameStartTimeMs:start,liveStatus:'live',gameClockState:{...(q.gameClockState||{}),version:'GCA2',eventTicker:q.eventTicker||q.ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'test_force_fresh'}}};

function r51Settings(overrides={}){
  return {...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r51-test',mode:'SIMULATION',liveArmed:false,engineActive:true,simFillProbability:1,startingCapitalCents:10_000_000,maxPositions:50,maxEntriesPerTrade:20,hunterCooldownMinutes:0,minGameMinutes:30,maxGameMinutes:60,maxSpreadCents:3,...overrides};
}

function fakeDb(initial=[]){
  const rows=new Map(initial.map(x=>[x.id,structuredClone(x)]));
  const episodes=new Map();
  return {
    rows,episodes,audits:[],inserted:[],updated:[],locks:[],
    async audit(level,event,data){this.audits.push({level,event,data});},
    async recordAtomicThunderEvent(event){this.atomicEvents??=[];this.atomicEvents.push(structuredClone(event));return true;},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async insertEntry(e){this.inserted.push(structuredClone(e));rows.set(e.id,structuredClone(e));},
    async updateEntry(id,patch){this.updated.push({id,patch:structuredClone(patch)});const e=rows.get(id);if(e)Object.assign(e,structuredClone(patch));},
    async entryById(id){const e=rows.get(id);return e?structuredClone(e):null;},
    async openEntries(){return [...rows.values()].filter(e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)&&!['Pegasus','Dragon'].includes(e.conceptName)).map(x=>structuredClone(x));},
    async acquireHunterTickerLock(_s,key){this.locks.push(key);return async()=>{};},
    async upsertOpportunityEpisode(ep){const prior=episodes.get(ep.id)||{};episodes.set(ep.id,{...structuredClone(prior),...structuredClone(ep)});return structuredClone(episodes.get(ep.id));},
    async opportunityEpisode(id){const e=episodes.get(id);return e?structuredClone(e):null;},
    async opportunityEpisodes(_s,{trackingComplete}={}){let a=[...episodes.values()];if(trackingComplete===true)a=a.filter(x=>x.trackingComplete===true);if(trackingComplete===false)a=a.filter(x=>x.trackingComplete!==true);return a.map(x=>structuredClone(x));},
    async activeScarletNeedleArms(_s,ticker=null){return [...episodes.values()].filter(ep=>(ticker==null||String(ep.ticker)===String(ticker))&&ep.attackSelected==='Scarlet Needle'&&!ep.entryId&&ep.athenaDecision?.scarletNeedle?.status==='ARMED').map(x=>structuredClone(x));},
    async entriesByConcept(_systemName,conceptName,{limit=200}={}){return [...rows.values()].filter(e=>e.conceptName===conceptName).sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0)).slice(0,limit).map(x=>structuredClone(x));},
    async entriesByConceptTicker(_systemName,conceptName,ticker,{limit=200}={}){return [...rows.values()].filter(e=>e.conceptName===conceptName&&String(e.ticker)===String(ticker)).sort((a,b)=>Number(b.openedAtMs||0)-Number(a.openedAtMs||0)).slice(0,limit).map(x=>structuredClone(x));},
    async recentClosed(){return [...rows.values()].filter(e=>e.status==='closed').sort((a,b)=>Number(b.closedAtMs||0)-Number(a.closedAtMs||0)).map(x=>structuredClone(x));},
    async recentClosedForResearch(_s,sinceMs){return [...rows.values()].filter(e=>e.status==='closed'&&Number(e.closedAtMs||0)>=Number(sinceMs||0)).sort((a,b)=>Number(b.closedAtMs||0)-Number(a.closedAtMs||0)).map(x=>structuredClone(x));},
    async profitEpisodes(){return [];},
    async profitEpisode(){return null;},
    async runLowPriorityPersistence(task){return task();},
  };
}

function r56SurvivalContext(q,baseFeatures={},extra={}){
  const now=Date.now();
  return {cosmos:[],crashState:{version:'CI1',phase:'NORMAL',episodeId:null,episodeIndex:0,crashDepthCents:0,reboundCents:0,reclaimRate:0,stableObservations:8,upwardTicks:3,lowerLowCount:0,reboundLostCount:0,entryReady:false,crashStartedAtMs:0,lastResetAtMs:0,lastObservationAtMs:now,updatedAtMs:now,lastBidCents:Number(q.yesBid),lastAskCents:Number(q.yesAsk)},survivalFeatures:{...baseFeatures,ticker:q.ticker,eventTicker:q.eventTicker,bidCents:Number(q.yesBid),askCents:Number(q.yesAsk),spreadCents:Number(q.yesAsk)-Number(q.yesBid),historySamples:Math.max(8,Number(baseFeatures.historySamples||0)),historyWindowMs:Math.max(30000,Number(baseFeatures.historyWindowMs||0)),velocity5CentsPerSec:.1,velocity15CentsPerSec:.08,velocity30CentsPerSec:.04,accelerationCentsPerSec2:.002,recentMove30Cents:2,upwardTicks:3,lowerLowCount:0,reboundLostCount:0,marketObservedAtMs:now,calculatedAtMs:now},...extra};
}


function greenShadow(ticker='T',entryPriceCents=53,conceptName='Pegasus',id=`shadow-${ticker}`){
  return {id,conceptName,ticker,eventTicker:ticker,status:'open',entryPriceCents,openedAtMs:Date.now()-10_000,feederState:{}};
}

function fakeMarket(q=nowQuote()){
  const quote={...q};
  return {
    quote,
    history:[
      {t:Date.now()-30_000,bid:50,ask:51},{t:Date.now()-15_000,bid:51,ask:52},{t:Date.now()-5_000,bid:53,ask:54},{t:Date.now(),bid:54,ask:55},
    ],
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
  };
}
const map={
  'Momentum Hunter':['momentumStakeCents','momentumMinEntryCents','momentumMaxEntryCents'],
  'Wave Surfer':['waveStakeCents','waveMinEntryCents','waveMaxEntryCents'],
  'Recovery Hunter':['recoveryStakeCents','recoveryMinEntryCents','recoveryMaxEntryCents'],
  'Crash Recovery Hunter':['crashRecoveryStakeCents','crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents'],
  'Scarlet Needle':['scarletNeedleStakeCents','scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents'],
  'Athena Exclamation':['athenaExclamationStakeCents','athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents'],
  'Lightning Plasma':['lightningPlasmaFieldStakeCents','lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents'],
};
function command(settings,concept,q=nowQuote(),overrides={}){
  const [stakeKey,minKey,maxKey]=map[concept];const now=Date.now();
  const recovery=concept==='Recovery Hunter'?{eligible:true,sourceTradeId:'loss-1',troughCents:40,reboundCents:14}:null;
  const target=Number(settings.infinityBreakMinNetPerOriginalContractCents??INFINITY_BREAK.defaultMinimumNetPerOriginalContractCents);const simFee=Number(settings.simFeeCents||0);const requiredGrossMoveCents=target+2*simFee;const requiredTargetBidCents=Number(q.yesAsk)+requiredGrossMoveCents;
  const economicTarget={version:'ATHENA-A3-ECONOMIC-TARGET-V1',netPerOriginalContractCents:target,requiredTargetBidCents,requiredGrossMoveCents,estimatedEntryFeePerContractCents:simFee,estimatedExitFeePerContractCents:simFee,targetFeasibilityScore:90,targetHitProbability:0.8,breakEvenTargetHitProbability:0.5,expectedNetPerOriginalContractCents:1,economicEvidence:10,economicQualified:true};
  const survivalCertificate=sealArayashikiCertificate({version:ARAYASHIKI.version,policyRevision:ARAYASHIKI.policyRevision,role:ARAYASHIKI.role,status:'CERTIFIED',ticker:q.ticker,eventTicker:q.eventTicker,boltId:'bolt-1',boltFingerprint:'fp',selectedAttack:concept,examinedAtMs:now,expiresAtMs:now+5000,survivalScore:100,requiredSurvivalScore:70,evidenceCoverage:{quote:true,history:true,crashState:true,regimeContinuity:true},hardBlocks:[],warnings:[],evidence:['test_fixture'],regime:{id:`${q.ticker}:NORMAL:0`,boundaryAtMs:0,sourceContinuity:{regimeBoundaryMs:0,total:0,valid:0,invalid:0,sources:[]}},market:{bidCents:q.yesBid,askCents:q.yesAsk,spreadCents:q.yesAsk-q.yesBid,observedAtMs:now,ageMs:0,historySamples:8,historyWindowMs:30000},crashState:{version:'CI1',phase:'NORMAL',lastObservationAtMs:now,updatedAtMs:now}});
  const core={version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,boltId:'bolt-1',boltFingerprint:'fp',systemName:settings.systemName,sourceRelease:'R52-TEST',decidedAtMs:now,expiresAtMs:now+5000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',selectedAttack:concept,selectedAttackDisplay:concept,stakeCents:settings[stakeKey],fieldBudgetCents:concept==='Lightning Plasma'?settings[stakeKey]:null,maxRays:concept==='Lightning Plasma'?settings.lightningPlasmaMaxStrikes:null,operatorMinEntryCents:settings[minKey],operatorMaxEntryCents:settings[maxKey],entryPriceCents:q.yesAsk,authorizedMaxEntryCents:q.yesAsk,maxSpreadCents:settings.maxSpreadCents,auroraDamageControlPercent:settings.auroraDamageControlPercent,infinityBreakPolicyVersion:INFINITY_BREAK.version,economicTarget,survivalCertificate,ranking:[{concept,score:90}],decisionEvidence:{features:{askCents:q.yesAsk,bidCents:q.yesBid},recoveryContext:recovery,fieldContext:null},...overrides};
  if(overrides.boltId||overrides.selectedAttack||overrides.ticker||overrides.eventTicker){
    const cert=sealArayashikiCertificate({...survivalCertificate,boltId:String(core.boltId),selectedAttack:String(core.selectedAttack),ticker:String(core.ticker),eventTicker:String(core.eventTicker)});
    core.survivalCertificate=cert;
  }
  return sealAthenaFireCommand(core);
}

function crystalWallWinner(settings,q,id='cw-winner',overrides={}){
  return {id,systemName:settings.systemName,ownerId:settings.ownerId,conceptName:SCARLET_NEEDLE.requiredParentConcept,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',sport:'Tennis',mode:settings.mode,status:'closed',remainingCount:0,entryPriceCents:45,exitPriceCents:Number(q.yesBid||60),pnlCents:321,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:Date.now()-60_000,closedAtMs:Date.now()-10,entryConfig:{side:'YES',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:`CRASH-${id}`},virtualInfinity:{version:INFINITY_BREAK.version,minimumNetPerOriginalContractCents:15}},...overrides};
}

function scarletThirdProof(parent,{firstProofEntryId='cw-first-proof',firstProofCrashEpisodeId='CRASH-FIRST',secondProofEntryId='cw-second-proof',secondProofCrashEpisodeId='CRASH-SECOND'}={}){
  const parentOpened=Math.max(10_000,Number(parent.openedAtMs||Date.now()));
  const firstClosed=parentOpened-3_000,secondOpened=firstClosed+500,secondClosed=parentOpened-500;
  return {version:SCARLET_NEEDLE.thirdProofVersion,policyRevision:SCARLET_NEEDLE.policyRevision,ticker:parent.ticker,proofGroupIndex:1,pairing:SCARLET_NEEDLE.proofPairing,requiredConsecutiveProfitableShadowProofs:SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs,consecutiveProfitCount:SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs,proofStage:SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs,independentCrashEpisodes:true,sameExactTicker:true,lossResetsProof:true,
    firstProofEntryId,firstProofCrashEpisodeId,firstProofOpenedAtMs:firstClosed-10_000,firstProofClosedAtMs:firstClosed,firstProofExitPriceCents:Number(parent.entryPriceCents||0),firstProofRealizedPnlCents:10,
    secondProofEntryId,secondProofCrashEpisodeId,secondProofOpenedAtMs:secondOpened,secondProofClosedAtMs:secondClosed,secondProofExitPriceCents:Number(parent.entryPriceCents||0),secondProofRealizedPnlCents:10,
    thirdProofEntryId:String(parent.id),thirdProofCrashEpisodeId:String(parent.entryConfig?.crystalWall?.crashEpisodeId||''),thirdProofOpenedAtMs:Number(parent.openedAtMs||0),thirdProofClosedAtMs:Number(parent.closedAtMs||0),thirdProofExitPriceCents:Number(parent.exitPriceCents||0),thirdProofRealizedPnlCents:Number(parent.pnlCents||0)};
}

function seedScarletThirdProof(db,parent,proof=scarletThirdProof(parent)){
  const first={...structuredClone(parent),id:proof.firstProofEntryId,openedAtMs:proof.firstProofOpenedAtMs,closedAtMs:proof.firstProofClosedAtMs,exitPriceCents:proof.firstProofExitPriceCents,pnlCents:proof.firstProofRealizedPnlCents,entryConfig:{...structuredClone(parent.entryConfig),crystalWall:{...structuredClone(parent.entryConfig.crystalWall),crashEpisodeId:proof.firstProofCrashEpisodeId}}};
  const second={...structuredClone(parent),id:proof.secondProofEntryId,openedAtMs:proof.secondProofOpenedAtMs,closedAtMs:proof.secondProofClosedAtMs,exitPriceCents:proof.secondProofExitPriceCents,pnlCents:proof.secondProofRealizedPnlCents,entryConfig:{...structuredClone(parent.entryConfig),crystalWall:{...structuredClone(parent.entryConfig.crystalWall),crashEpisodeId:proof.secondProofCrashEpisodeId}}};
  db.rows.set(String(first.id),structuredClone(first));db.rows.set(String(second.id),structuredClone(second));db.rows.set(String(parent.id),structuredClone(parent));return proof;
}

function strategyFixture({settings=r51Settings(),quote=nowQuote(),initial=[]}={}){
  const db=fakeDb(initial),market=fakeMarket(quote);
  const s=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>settings,getLiveReady:()=>settings.mode==='LIVE'&&settings.liveArmed===true,refreshGameClock:refreshClock,random:()=>0});
  return{db,market,s,settings,quote};
}

const oldPredictiveKeys=['momentumMinRiseCents','momentumMinPullbackCents','momentumMaxPullbackCents','momentumMinTimeLeftMinutes','waveMinFeederFavorableMoveCents','recoveryMinReboundCents','crashRecoveryMinCrashCents','crashRecoveryMinReboundCents','crashRecoveryMinReclaimRate','crashRecoveryStableObservations','crashRecoveryUpwardTicks','crashRecoveryEpisodeResetRate','lightningPlasmaMaxSourceFadeCents','lightningPlasmaMaxChaseCents'];

test('R51 canonical Attack controls contain only stake/band plus Lightning max rays and exclude retired predictive controls',()=>{
  const keys=new Set(CANONICAL_NUMERIC_SETTINGS);
  for(const [,a] of Object.entries(map))for(const k of a)assert.equal(keys.has(k),true,k);
  assert.equal(keys.has('lightningPlasmaMaxStrikes'),true);
  for(const k of oldPredictiveKeys)assert.equal(keys.has(k),false,`${k} must not be operator authority`);
  assert.equal(keys.has('auroraDamageControlPercent'),true);
});

test('R51 Bolt requires a real short-horizon impulse; price band alone cannot create authority',()=>{
  const s=r51Settings({momentumHunterEnabled:true});const q=nowQuote();const now=Date.now();
  const flat=[0,1,2,3].map(i=>({t:now-(3-i)*5000,bid:54,ask:55}));
  const f=atomicThunderBoltFeatures({q,history:flat,settings:s,now});
  assert.equal(f.eligibleAttacks.length>0,true);
  assert.equal(atomicThunderBoltDecision(f,s).detected,false);
});

test('R60 Bolt is signal-only and fails closed when durable shadow/Bolt persistence is unavailable',async()=>{
  const s=r51Settings({atomicThunderGreenTriggerCents:1});const market=fakeMarket();const audits=[];
  const bolt=new AtomicThunderBoltEngine({market,getSettings:()=>s,db:{},audit:async(e,d)=>audits.push({e,d})});
  const q=nowQuote('T',54,55);const out=await bolt.detect(q,{cosmos:[greenShadow('T',53)]});
  assert.equal(out,null);assert.equal(bolt.summary().detected,0);assert.ok(audits.some(x=>x.e==='atomic_thunder_bolt_persistence_failed'));
  assert.equal(ATOMIC_THUNDER_BOLT.entryAuthority,false);assert.equal(ATOMIC_THUNDER_BOLT.orderAuthority,false);
});

test('R51 Bolt active/counterfactual memory is explicitly bounded',()=>{
  assert.equal(ATOMIC_THUNDER_BOLT.maximumActiveBolts,4096);assert.equal(ATOMIC_THUNDER_BOLT.maximumCounterfactualEpisodes,2048);assert.equal(Math.max(...ATOMIC_THUNDER_BOLT.learningHorizonsMs),600000);
});

test('R51 Athena historical memory deduplicates episode-linked entries and keeps provenance with deterministic hash',()=>{
  const entry={id:'e1',conceptName:'Momentum Hunter',status:'closed',pnlCents:100,maeCents:1,entryPriceCents:55,sourceFeeder:'Pegasus',marketTitle:'Tennis',entryConfig:{release:'R50'},closedAtMs:1};
  const ep={id:'b1',entryId:'e1',attackSelected:'Momentum Hunter',trackingComplete:true,outcomeLabel:'CLEAN_BOLT',sourceRelease:'R51-A',cohortId:'C1',boltSnapshot:{features:{askCents:55,sport:'Tennis',cosmoSources:['Pegasus'],gameMinutes:45}},outcome:{realizedPnlCents:120,maeCents:1}};
  const a=compileAthenaAttackMemory({entries:[entry],episodes:[ep]});const b=compileAthenaAttackMemory({entries:[entry],episodes:[ep]});
  assert.equal(a.memoryHash,b.memoryHash);assert.deepEqual(a.sourceReleases,['R51-A']);assert.deepEqual(a.cohortIds,['C1']);assert.equal(a.opportunityRows,1);
});

test('R51 Athena init reads archived entries and durable FIRE persistence failure downgrades FIRE to REJECT',async()=>{
  let args=null;const settings=r51Settings();
  const db={entries:async(_s,o)=>{args=o;return[];},opportunityEpisodes:async()=>[],upsertOpportunityEpisode:async()=>{throw new Error('db down');}};
  const athena=new AthenaCommander({db,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R51'});await athena.init();assert.equal(args.includeArchived,true);
  const bolt={id:'b',ticker:'T',eventTicker:'T',score:100,detectedAtMs:Date.now(),expiresAtMs:Date.now()+5000,features:{askCents:55,bidCents:54,spreadCents:1,recentMove30Cents:5,momentumRiseCents:5,waveFavorableMoveCents:5,crashDepthCents:5,reboundCents:4,reclaimRate:.8,upwardTicks:4,lowerLowCount:0,gameMinutes:45,sport:'Tennis',cosmoSources:['Pegasus'],eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true,targetFeasibilityScore:90,requiredTargetBidCents:64,requiredGrossMoveCents:9,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2}]}};
  bolt.features.historySamples=8;bolt.features.historyWindowMs=30000;bolt.features.velocity15CentsPerSec=.2;bolt.features.velocity30CentsPerSec=.1;bolt.features.marketObservedAtMs=Date.now();const d=await athena.decide(bolt,{crashState:{version:'CI1',phase:'NORMAL',crashDepthCents:0,reboundCents:0,reclaimRate:0,stableObservations:8,upwardTicks:4,lowerLowCount:0,reboundLostCount:0,lastObservationAtMs:Date.now(),updatedAtMs:Date.now()},cosmos:[]});assert.equal(d.decision,'REJECT');assert.equal(d.reason,'fire_persistence_failed');assert.equal(d.fireCommand,null);assert.equal(d.durableFirePersisted,false);
});

test('R51 sealed FIRE contract detects tampering',()=>{const s=r51Settings(),q=nowQuote(),c=command(s,'Momentum Hunter',q);assert.equal(verifyAthenaFireCommandHash(c),true);assert.equal(validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:s}).ok,true);assert.equal(verifyAthenaFireCommandHash({...c,stakeCents:c.stakeCents+1}),false);});

test('R51 createHunter fails before market/order work when there is no Athena FIRE command',async()=>{const f=strategyFixture();let refreshed=0;f.market.refreshTickerVerified=async()=>{refreshed++;return{marketFresh:true,bookFresh:true,quote:f.quote};};const e=await f.s.createHunter('Momentum Hunter',f.quote,f.settings.momentumStakeCents);assert.equal(e,null);assert.equal(refreshed,0);assert.equal(f.db.inserted.length,0);});

test('R51 new path ignores hostile legacy predictive thresholds after valid Athena FIRE',async()=>{const settings=r51Settings({momentumMinRiseCents:999,momentumMinPullbackCents:999,waveMinFeederFavorableMoveCents:999,crashRecoveryMinCrashCents:999,crashRecoveryMinReboundCents:999});const f=strategyFixture({settings});const c=command(settings,'Momentum Hunter',f.quote);const e=await f.s.createHunter('Momentum Hunter',f.quote,settings.momentumStakeCents,0,{athenaFireCommand:c});assert.ok(e);assert.equal(e.entryConfig.athenaFire.commandHash,c.commandHash);assert.equal(e.entryConfig.model.stakeCents??e.entryConfig.model.stake,settings.momentumStakeCents);});

for(const concept of ['Momentum Hunter','Wave Surfer','Crash Recovery Hunter','Athena Exclamation'])test(`R51 Athena FIRE executes ${concept} without a second strategic veto`,async()=>{const settings=r51Settings(concept==='Athena Exclamation'?{athenaExclamationEnabled:true}:{});const f=strategyFixture({settings});const c=command(f.settings,concept,f.quote);const e=await f.s.createHunter(concept,f.quote,c.stakeCents,0,{athenaFireCommand:c});assert.ok(e,concept);assert.equal(e.conceptName,concept);assert.equal(e.entryConfig.athenaFire.selectedAttack,concept);assert.equal(e.entryConfig.infinityBreak.version,INFINITY_BREAK.version);assert.equal(e.entryConfig.aurora.damageControlPercent,45);});

test('SN3 Crystal Wall win continuation bypasses ordinary cooldown and Game Clock while hard execution safety stays active',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleMaxRepeats:1,scarletNeedleStakeCents:20_000,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,hunterCooldownMinutes:45,minGameMinutes:30,maxGameMinutes:60});
  const q=nowQuote('SN-COOLDOWN',76,77),recent={id:'recent-wave',systemName:settings.systemName,ownerId:settings.ownerId,conceptName:'Wave Surfer',ticker:'OLD',eventTicker:q.eventTicker,marketTitle:'prior',mode:'SIMULATION',status:'closed',entryPriceCents:60,exitPriceCents:65,currentPriceCents:65,peakPriceCents:65,stopPriceCents:40,stopLossCents:20,count:10,remainingCount:0,pnlCents:10,openedAtMs:Date.now()-60_000,closedAtMs:Date.now()-30_000,updatedAtMs:Date.now()-30_000};
  const f=strategyFixture({settings,quote:q,initial:[recent]});
  const upstream=await f.s.hunterEventAdmissionState(q);assert.equal(upstream.cooldownBlocked,true,'ordinary cooldown remains meaningful before normal strategic FIRE');
  let clockCalls=0;f.s.refreshGameClock=async()=>{clockCalls+=1;throw new Error('Scarlet V3 may not depend on ordinary Game Clock');};
  const parent=crystalWallWinner(settings,q,'winner-cooldown',{closedAtMs:Date.now()-5});
  const e=await f.s.executeScarletContinuation(q,parent,{authorizationId:'SCARLET-THIRD-PROOF:first:winner-cooldown',rootEntryId:'first',repeatIndex:1,maxRepeats:1,authorizedAtMs:Date.now(),thirdProof:seedScarletThirdProof(f.db,parent)});
  assert.ok(e,`Crystal Wall win Scarlet continuation must not be re-vetoed: ${JSON.stringify({audits:f.db.audits,pipeline:f.s.entryPipelineSummary()})}`);
  assert.equal(e.entryConfig.scarletContinuation.ordinaryCooldownBypassed,true);assert.equal(e.entryConfig.scarletContinuation.ordinaryGameClockBypassed,true);assert.equal(clockCalls,0);
  const pipeline=f.s.entryPipelineSummary();assert.equal(pipeline.byStage['STATIC_POLICY:BLOCKED']||0,0);assert.ok((pipeline.byStage['EXECUTION_POLICY:PASS']||0)>=1);
});

test('CW3 rejects the retired parent-stop continuation and cannot be fired by Athena',async()=>{
  const f=strategyFixture();
  const parent={id:'loss-1',systemName:f.settings.systemName,ownerId:f.settings.ownerId,conceptName:'Momentum Hunter',ticker:f.quote.ticker,eventTicker:f.quote.eventTicker,side:'YES',mode:'SIMULATION',status:'closed',remainingCount:0,entryPriceCents:60,exitPriceCents:20,pnlCents:-2000,closeReason:'hard_stop_loss',closedAtMs:Date.now()-1000};
  assert.equal(await f.s.executeCrystalWallContinuation(f.quote,parent,{authorizationId:'legacy',authorizedAtMs:Date.now()}),null);
  const fake={version:'ATHENA-A3',selectedAttack:'Recovery Hunter'};const {validateAthenaFireCommand}=await import('../src/strategy.mjs');assert.equal(validateAthenaFireCommand(fake,{concept:'Recovery Hunter',q:f.quote,settings:f.settings}).reason,'crystal_wall_v3_authority_required');
});

test('R51 Lightning Plasma ordinary field FIRE cannot open without Gemini-loss continuation',async()=>{const settings=r51Settings({lightningPlasmaFieldStakeCents:21000,lightningPlasmaMaxStrikes:3});const f=strategyFixture({settings});const c=command(settings,'Lightning Plasma',f.quote,{stakeCents:7000,fieldBudgetCents:21000,maxRays:3});const e=await f.s.createHunter('Lightning Plasma',f.quote,7000,0,{athenaFireCommand:c});assert.equal(e,null);assert.equal(f.db.inserted.length,0);});

test('R51 Attack OFF, operator band change and Athena strike cap abort FIRE as execution safety',()=>{const q=nowQuote(),s=r51Settings();let c=command(s,'Momentum Hunter',q);assert.equal(validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:{...s,momentumHunterEnabled:false}}).ok,true,'enablement is checked by executor, not validator');assert.equal(validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:{...s,momentumMaxEntryCents:59}}).reason,'athena_fire_operator_band_changed');c=command(s,'Momentum Hunter',q,{authorizedMaxEntryCents:54});assert.equal(validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:s}).reason,'athena_strike_price_exceeded');});

test('R51 entry snapshot freezes configurable Aurora percentage and later global edits cannot mutate it',async()=>{const settings=r51Settings({auroraDamageControlPercent:30});const f=strategyFixture({settings});const c=command(settings,'Wave Surfer',f.quote);const e=await f.s.createHunter('Wave Surfer',f.quote,c.stakeCents,0,{athenaFireCommand:c});assert.ok(e);assert.equal(e.entryConfig.auroraDamageControlPercent,30);assert.equal(e.entryConfig.aurora.damageControlPercent,30);settings.auroraDamageControlPercent=45;assert.equal(e.entryConfig.aurora.damageControlPercent,30);assert.equal(AURORA_EXECUTION.defaultDamageControlPercent,45);});

test('R51 entryConfig contains no post-Athena predictive Attack veto fields',()=>{const s=r51Settings();for(const concept of Object.keys(map)){const cfg=entryConfigSnapshot(s,concept);const attack=cfg.model;for(const k of oldPredictiveKeys)assert.equal(Object.hasOwn(attack,k),false,`${concept}:${k}`);}});

test('R51 production Engine source does not call legacy Attack evaluators for new exposure',async()=>{const src=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');for(const call of ['strategy.evaluateMomentumAndWave(','strategy.evaluateRecovery(','strategy.evaluateCrashRecovery(','strategy.evaluateLightningPlasma('])assert.equal(src.includes(call),false,call);assert.ok(src.includes('evaluateNewGenerationOpportunities'));});

test('R51 no independent post-entry timeout exit exists in doctrine/new entry snapshots',async()=>{const doctrine=await readFile(new URL('../src/doctrine.mjs',import.meta.url),'utf8');const strategy=await readFile(new URL('../src/strategy.mjs',import.meta.url),'utf8');for(const token of ['opportunityTimeoutExit','maximumPositionLifetimeMs','forcedTimeExit']){assert.equal(doctrine.includes(token),false);assert.equal(strategy.includes(token),false);}});

test('R51 UI exposes only operator Attack controls plus Plasma rays and configurable Aurora',async()=>{const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(html.includes('ATOMIC THUNDER BOLT'));assert.ok(html.includes('Infinity Break'));assert.ok(html.includes('Damage Control'));assert.ok(app.includes('auroraDamageControlPercent'));assert.ok(app.includes('lightningPlasmaMaxStrikes'));for(const k of oldPredictiveKeys)assert.equal(app.includes(k),false,k);});

test('R51 Infinity Break identity is separated from legacy Atomic Thunder telemetry',async()=>{const src=await readFile(new URL('../src/profitGuard.mjs',import.meta.url),'utf8');assert.ok(src.includes("'infinity_break'"));assert.ok(src.includes('infinity_break_exit_waiting_executable_book'));assert.ok(src.includes('golden_eye_cashout_skipped_infinity_break_priority'));assert.ok(src.includes("entry.closeReason === 'atomic_thunder_cashout'"));});

test('R51 opportunity restart gaps remain explicitly incomplete instead of receiving a guessed label',async()=>{const settings=r51Settings(),db=fakeDb();const old=Date.now()-60_000;db.episodes.set('x',{id:'x',systemName:'SAGITTARIUS',boltAtMs:old,updatedAtMs:old,boltSnapshot:{features:{askCents:55}},athenaDecision:{decision:'REJECT',ranking:[{concept:'Momentum Hunter',stakeCents:20000}]},trackingComplete:false});const b=new AtomicThunderBoltEngine({market:fakeMarket(),getSettings:()=>settings,db,systemName:'SAGITTARIUS'});const r=await b.init();assert.equal(r.incomplete,1);const ep=await db.opportunityEpisode('x');assert.equal(ep.trackingComplete,false);assert.equal(ep.outcome.trackingIncomplete,true);assert.equal(ep.outcome.incompleteReason,'restart_observation_gap');assert.equal(ep.outcomeLabel,undefined);});

test('R51 LIVE intent durability code persists entry_pending before broker BUY source order',async()=>{const src=await readFile(new URL('../src/strategy.mjs',import.meta.url),'utf8');const persist=src.indexOf("status:'entry_pending'");const insert=src.indexOf('await this.db.insertEntry(e);',persist);const buy=src.indexOf("placeOrder({ticker:q.ticker,action:'buy'",insert);assert.ok(persist>0&&insert>persist&&buy>insert);});

test('R51 SIM execution is capped to actually executable ask depth under a valid FIRE',async()=>{
  const settings=r51Settings();const quote=nowQuote();const db=fakeDb();const market=fakeMarket(quote);
  market.executableAsk=(_t,count)=>({filled:Math.min(2,count),full:count<=2,avgCents:55,bestCents:55});
  const st=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>settings,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  const c=command(settings,'Momentum Hunter',quote);const e=await st.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});
  assert.ok(e);assert.equal(e.count,2);assert.equal(e.remainingCount,2);
});

test('R51 SIM buying-power gate blocks Athena FIRE before persistence when capital is insufficient',async()=>{
  const settings=r51Settings({startingCapitalCents:100});const f=strategyFixture({settings});const c=command(settings,'Momentum Hunter',f.quote);const e=await f.s.createHunter('Momentum Hunter',f.quote,c.stakeCents,0,{athenaFireCommand:c});assert.equal(e,null);assert.equal(f.db.inserted.length,0);assert.ok(f.db.audits.some(x=>x.event==='sim_entry_blocked_cash'));
});

test('R51 process-local exact Attack/ticker mutex prevents concurrent duplicate FIRE execution',async()=>{
  const settings=r51Settings();const quote=nowQuote('MUTEX');const db=fakeDb();const market=fakeMarket(quote);let release;const gate=new Promise(r=>release=r);let entered=0;
  market.refreshTickerVerified=async()=>{entered++;if(entered===1)await gate;return{marketFresh:true,bookFresh:true,quote:{...quote}};};
  const st=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>settings,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});const c=command(settings,'Momentum Hunter',quote);
  const p1=st.createHunter('Momentum Hunter',{...quote},c.stakeCents,0,{athenaFireCommand:c});while(entered<1)await new Promise(r=>setTimeout(r,1));const p2=st.createHunter('Momentum Hunter',{...quote},c.stakeCents,0,{athenaFireCommand:c});release();const out=await Promise.all([p1,p2]);assert.equal(out.filter(Boolean).length,1);assert.equal(db.inserted.length,1);
});

test('R51 Galactic Explosion allows different Attacks on one ticker but keeps same-Attack uniqueness',async()=>{
  const settings=r51Settings({galacticExplosionEnabled:true});const quote=nowQuote('GE');const f=strategyFixture({settings,quote});const m=command(settings,'Momentum Hunter',quote,{boltId:'b-m'});const w=command(settings,'Wave Surfer',quote,{boltId:'b-w'});const m2=command(settings,'Momentum Hunter',quote,{boltId:'b-m2'});assert.ok(await f.s.createHunter('Momentum Hunter',{...quote},m.stakeCents,0,{athenaFireCommand:m}));assert.ok(await f.s.createHunter('Wave Surfer',{...quote},w.stakeCents,0,{athenaFireCommand:w}));assert.equal(await f.s.createHunter('Momentum Hunter',{...quote},m2.stakeCents,0,{athenaFireCommand:m2}),null);assert.equal(f.db.inserted.length,2);
});

test('R51 LIVE persists owned entry_pending intent before broker BUY and keeps it durable on submit exception',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true});const quote=nowQuote('LIVE-INTENT');const db=fakeDb();const market=fakeMarket(quote);let sawPending=false;
  const kalshi={buildClientOrderId:(_o,id)=>`cid-${id}`,async placeOrder(){sawPending=[...db.rows.values()].some(e=>e.status==='entry_pending'&&e.entryClientOrderId);throw new Error('network ambiguous');}};
  const st=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,refreshGameClock:refreshClock,random:()=>0});const c=command(settings,'Momentum Hunter',quote);const e=await st.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});assert.equal(sawPending,true);assert.ok(e);assert.equal(e.status,'entry_pending');assert.ok(e.entryClientOrderId);assert.equal(db.inserted.length,1);
});

test('R51 Attack OFF is a hard execution abort even with a valid pre-existing FIRE command',async()=>{
  const initial=r51Settings();const q=nowQuote('OFF');const c=command(initial,'Momentum Hunter',q);const settings={...initial,momentumHunterEnabled:false};const f=strategyFixture({settings,quote:q});const e=await f.s.createHunter('Momentum Hunter',q,c.stakeCents,0,{athenaFireCommand:c});assert.equal(e,null);assert.equal(f.db.inserted.length,0);assert.ok(f.db.audits.some(x=>x.event==='model_entry_disabled'));
});


test('R51 full SIM chain executes Athena FIRE then Infinity Break closes the entire position and completes CLEAN_BOLT learning',async()=>{
  const settings=r51Settings({
    infinityBreakMinNetPerOriginalContractCents:5,
    infinityBreakRequiredConfirmations:2,
    infinityBreakMaximumBookAgeMs:1000,
    infinityBreakConfirmationWindowMs:3000,
    auroraDamageControlPercent:45,
  });
  const quote=nowQuote('CHAIN-PROFIT',54,55);const f=strategyFixture({settings,quote});
  const c=command(settings,'Momentum Hunter',quote,{boltId:'chain-profit-bolt'});
  f.db.episodes.set(c.boltId,{id:c.boltId,systemName:settings.systemName,sourceRelease:'R51-TEST',ticker:quote.ticker,eventTicker:quote.eventTicker,side:'YES',sport:'Tennis',boltAtMs:Date.now()-1000,boltSnapshot:{features:{askCents:55,bidCents:54,gameMinutes:45,cosmoSources:['Pegasus']}},athenaDecision:{decision:'FIRE'},fireCommand:c,attackSelected:'Momentum Hunter',trackingComplete:false});
  const entry=await f.s.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});
  assert.ok(entry);assert.equal(entry.status,'open');assert.equal(entry.entryConfig.infinityBreak.version,INFINITY_BREAK.version);
  f.market.quote.yesBid=70;f.market.quote.yesAsk=71;f.market.quote.updatedAtMs=Date.now();
  const learning={async onHardStop(){},async stopGuardProfile(){return null;},async lossWatchdogProfile(){return null;}};
  const guard=new ProfitGuard({db:f.db,kalshi:{},market:f.market,learning,getSettings:()=>settings});
  let out=await guard.protect(await f.db.entryById(entry.id));
  assert.equal(out.closed??false,false,'Infinity Break requires a second distinct fresh confirmation');
  const secondBookMs=Number(f.market.quote.updatedAtMs)+1;f.market.history.push({t:secondBookMs,bid:70,ask:71});f.market.quote.updatedAtMs=secondBookMs;
  out=await guard.protect(await f.db.entryById(entry.id));
  assert.equal(out.closed,true);
  const closed=await f.db.entryById(entry.id);assert.equal(closed.status,'closed');assert.equal(closed.remainingCount,0);assert.equal(closed.closeReason,'infinity_break');assert.ok(closed.pnlCents>0);
  const ep=await f.db.opportunityEpisode(c.boltId);assert.equal(ep.trackingComplete,true);assert.equal(ep.outcomeLabel,'CLEAN_BOLT');assert.equal(ep.outcome.infinityBreak,true);
});

test('R51 full LIVE chain persists intent before BUY, fills, remains protected, and closes the full owned position through Infinity Break SELL',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true,infinityBreakMinNetPerOriginalContractCents:5,infinityBreakRequiredConfirmations:1,infinityBreakMaximumBookAgeMs:1000,infinityBreakConfirmationWindowMs:3000,auroraDamageControlPercent:45});
  const quote={...nowQuote('LIVE-CHAIN',54,55),exchangeIndex:3};const db=fakeDb();const market=fakeMarket(quote);let brokerQty=0;const orders=[];let pendingVisibleBeforeBuy=false;
  const kalshi={
    buildClientOrderId:(_owner,id,kind)=>`${kind}-${id}`,
    async preflightExchangeBalance({exchangeIndex,requiredCents}){assert.equal(exchangeIndex,3);return{ok:true,reason:'live_exchange_balance_ready',exchangeIndex:3,availableCents:100000,requiredCents};},
    async getPositions(){return brokerQty>0?[{ticker:quote.ticker,position_fp:brokerQty}]:[];},
    async placeOrder(o){orders.push({...o});if(o.action==='buy'){pendingVisibleBeforeBuy=[...db.rows.values()].some(e=>e.ticker===quote.ticker&&e.status==='entry_pending'&&e.entryClientOrderId===o.clientOrderId);brokerQty+=Number(o.count);return{orderId:'buy-1',fillCount:Number(o.count),averageFillPriceCents:55,feePaidCents:10};}if(o.action==='sell'){assert.ok(brokerQty>=Number(o.count));brokerQty-=Number(o.count);return{orderId:'sell-1',fillCount:Number(o.count),averageFillPriceCents:Number(o.priceCents),feePaidCents:10};}throw new Error('unexpected action');}
  };
  const strategy=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>settings.mode==='LIVE'&&settings.liveArmed===true,refreshGameClock:refreshClock,random:()=>0});
  const c=command(settings,'Momentum Hunter',quote,{boltId:'live-chain-bolt'});const entry=await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});
  assert.ok(entry);assert.equal(entry.status,'open');assert.equal(pendingVisibleBeforeBuy,true);assert.equal(orders.length,1);assert.equal(orders[0].action,'buy');assert.equal(orders[0].exchangeIndex,3);assert.equal(brokerQty,entry.count);assert.equal(entry.entryConfig.aurora.frozen,true);assert.equal(entry.entryConfig.brokerRouting.exchangeIndex,3);
  market.quote.yesBid=70;market.quote.yesAsk=71;market.quote.updatedAtMs=Date.now();
  const learning={async onHardStop(){},async stopGuardProfile(){return null;},async lossWatchdogProfile(){return null;},async markProfitExit(){}};
  const guard=new ProfitGuard({db,kalshi,market,learning,getSettings:()=>settings});const out=await guard.protect(await db.entryById(entry.id));
  assert.equal(out.closed,true);const closed=await db.entryById(entry.id);assert.equal(closed.status,'closed');assert.equal(closed.remainingCount,0);assert.equal(closed.closeReason,'infinity_break');assert.ok(closed.pnlCents>0);assert.equal(orders.length,2);assert.equal(orders[1].action,'sell');assert.equal(orders[1].exchangeIndex,3);assert.equal(orders[1].count,entry.count);assert.equal(brokerQty,0);assert.ok(db.locks.includes(`broker:${quote.ticker}`));
});

test('LIVE shard preflight blocks an unfunded exchange before durable entry intent or broker mutation',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true});const quote={...nowQuote('SHARD-ZERO',54,55),exchangeIndex:3};const db=fakeDb();const market=fakeMarket(quote);let orders=0;
  const kalshi={buildClientOrderId:()=> 'never',async preflightExchangeBalance({exchangeIndex,requiredCents}){return{ok:false,reason:'live_exchange_insufficient_balance',exchangeIndex,availableCents:0,requiredCents};},async placeOrder(){orders++;throw new Error('must not submit');}};
  const strategy=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,refreshGameClock:refreshClock,random:()=>0});
  const c=command(settings,'Momentum Hunter',quote,{boltId:'shard-zero-bolt'});const e=await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});
  assert.equal(e,null);assert.equal(orders,0);assert.equal(db.inserted.length,0);assert.equal(strategy.entryPipelineSummary().byReason.live_exchange_insufficient_balance,1);
});

test('LIVE shard rebalance waits for asynchronous funding, re-runs the fresh entry chain, then completes BUY -> protection -> Infinity Break SELL on the funded shard',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true,infinityBreakMinNetPerOriginalContractCents:5,infinityBreakRequiredConfirmations:1,infinityBreakMaximumBookAgeMs:1000,infinityBreakConfirmationWindowMs:3000,auroraDamageControlPercent:45});
  const quote={...nowQuote('SHARD-REBALANCE',54,55),exchangeIndex:3};const db=fakeDb();const market=fakeMarket(quote);let brokerQty=0;const orders=[];const transfers=[];let pendingVisibleBeforeBuy=false;
  let balance={balance:45643,balance_breakdown:[{exchange_index:0,balance:'456.4345'},{exchange_index:1,balance:'0.0000'},{exchange_index:2,balance:'0.0000'},{exchange_index:3,balance:'0.0000'}]};
  const kalshi=new KalshiClient({},'https://example.test/trade-api/v2','');
  kalshi.getBalance=async()=>structuredClone(balance);
  kalshi.request=async(method,path,body)=>{assert.equal(method,'POST');assert.equal(path,'/portfolio/intra_exchange_instance_transfer');transfers.push(structuredClone(body));return{ok:true,status:200,data:{transfer_id:`xfer-${transfers.length}`}};};
  kalshi.getPositions=async()=>brokerQty>0?[{ticker:quote.ticker,position_fp:brokerQty}]:[];
  kalshi.placeOrder=async(o)=>{orders.push({...o});if(o.action==='buy'){pendingVisibleBeforeBuy=[...db.rows.values()].some(e=>e.ticker===quote.ticker&&e.status==='entry_pending'&&e.entryClientOrderId===o.clientOrderId);brokerQty+=Number(o.count);return{orderId:'buy-rebalanced',fillCount:Number(o.count),averageFillPriceCents:55,feePaidCents:10};}if(o.action==='sell'){assert.ok(brokerQty>=Number(o.count));brokerQty-=Number(o.count);return{orderId:'sell-rebalanced',fillCount:Number(o.count),averageFillPriceCents:Number(o.priceCents),feePaidCents:10};}throw new Error('unexpected action');};
  const strategy=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,refreshGameClock:refreshClock,random:()=>0});
  const c=command(settings,'Momentum Hunter',quote,{boltId:'shard-rebalance-bolt'});
  assert.equal(await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c}),null,'accepted transfer must not buy on the stale same cycle');
  assert.equal(db.inserted.length,0);assert.equal(orders.length,0);assert.equal(transfers.length,1);assert.equal(transfers[0].destination_exchange_shard,3);
  assert.equal(await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c}),null,'pending transfer must remain fail closed');
  assert.equal(db.inserted.length,0);assert.equal(orders.length,0);assert.equal(transfers.length,1,'same funding need must not duplicate the transfer');

  const requiredCents=Number(transfers[0].amount)/100;balance={balance:45643-requiredCents,balance_breakdown:[{exchange_index:0,balance:String((45643-requiredCents)/100)},{exchange_index:1,balance:'0.0000'},{exchange_index:2,balance:'0.0000'},{exchange_index:3,balance:String(requiredCents/100)}]};
  const entry=await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c});
  assert.ok(entry);assert.equal(entry.status,'open');assert.equal(pendingVisibleBeforeBuy,true);assert.equal(orders.length,1);assert.equal(orders[0].action,'buy');assert.equal(orders[0].exchangeIndex,3);assert.equal(entry.entryConfig.brokerRouting.exchangeIndex,3);assert.equal(brokerQty,entry.count);
  market.quote.yesBid=70;market.quote.yesAsk=71;market.quote.updatedAtMs=Date.now();
  const learning={async onHardStop(){},async stopGuardProfile(){return null;},async lossWatchdogProfile(){return null;},async markProfitExit(){}};
  const guard=new ProfitGuard({db,kalshi,market,learning,getSettings:()=>settings});const out=await guard.protect(await db.entryById(entry.id));
  assert.equal(out.closed,true);const closed=await db.entryById(entry.id);assert.equal(closed.status,'closed');assert.equal(closed.closeReason,'infinity_break');assert.ok(closed.pnlCents>0);assert.equal(orders.length,2);assert.equal(orders[1].action,'sell');assert.equal(orders[1].exchangeIndex,3);assert.equal(orders[1].count,entry.count);assert.equal(brokerQty,0);
  const summary=strategy.entryPipelineSummary();assert.equal(summary.byReason.live_exchange_rebalance_requested,1);assert.equal(summary.byReason.live_exchange_rebalance_pending,1);
});

test('LIVE definitive broker rejection is submitted once per exact Athena FIRE and then suppressed without changing a new Bolt',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true});const quote={...nowQuote('HARD-REJECT',54,55),exchangeIndex:3};const db=fakeDb();const market=fakeMarket(quote);let orders=0;
  const kalshi={buildClientOrderId:(_o,id)=>`cid-${id}`,async preflightExchangeBalance({requiredCents}){return{ok:true,reason:'live_exchange_balance_ready',exchangeIndex:3,availableCents:100000,requiredCents};},async placeOrder(){orders++;return{ok:false,httpStatus:404,brokerError:'market unavailable',brokerErrorCode:'market_not_found',brokerErrorDetails:{exchange_index:3},fillCount:0};}};
  const strategy=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,refreshGameClock:refreshClock,random:()=>0});
  const c=command(settings,'Momentum Hunter',quote,{boltId:'hard-reject-bolt'});
  assert.equal(await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c}),null);
  assert.equal(await strategy.createHunter('Momentum Hunter',quote,c.stakeCents,0,{athenaFireCommand:c}),null);
  assert.equal(orders,1);assert.equal(strategy.entryPipelineSummary().byReason.live_broker_hard_reject_suppressed,1);
});

test('R51 full SIM chain freezes configurable Aurora damage control and exits on its frozen loss boundary after global setting changes',async()=>{
  const settings=r51Settings({auroraDamageControlPercent:30});const quote=nowQuote('CHAIN-AURORA',54,55);const f=strategyFixture({settings,quote});
  const c=command(settings,'Wave Surfer',quote,{boltId:'chain-aurora-bolt'});
  f.db.episodes.set(c.boltId,{id:c.boltId,systemName:settings.systemName,sourceRelease:'R51-TEST',ticker:quote.ticker,eventTicker:quote.eventTicker,side:'YES',sport:'Tennis',boltAtMs:Date.now()-1000,boltSnapshot:{features:{askCents:55,bidCents:54,gameMinutes:45,cosmoSources:['Pegasus']}},athenaDecision:{decision:'FIRE'},fireCommand:c,attackSelected:'Wave Surfer',trackingComplete:false});
  const entry=await f.s.createHunter('Wave Surfer',quote,c.stakeCents,0,{athenaFireCommand:c});assert.ok(entry);assert.equal(entry.entryConfig.aurora.damageControlPercent,30);
  const frozenDanger=entry.entryConfig.aurora.dangerPriceCents;assert.ok(frozenDanger>0&&frozenDanger<entry.entryPriceCents);
  settings.auroraDamageControlPercent=45;
  f.market.quote.yesBid=Math.max(1,Math.floor(frozenDanger)-16);f.market.quote.yesAsk=f.market.quote.yesBid+1;f.market.quote.updatedAtMs=Date.now();
  const learning={hardStops:0,async onHardStop(){this.hardStops++;},async stopGuardProfile(){return null;},async lossWatchdogProfile(){return null;}};
  const guard=new ProfitGuard({db:f.db,kalshi:{},market:f.market,learning,getSettings:()=>settings});
  const out=await guard.protect(await f.db.entryById(entry.id));assert.equal(out.closed,true);
  const closed=await f.db.entryById(entry.id);assert.equal(closed.status,'closed');assert.equal(closed.remainingCount,0);assert.equal(closed.closeReason,'hard_stop_loss');assert.equal(closed.entryConfig.aurora.damageControlPercent,30);assert.ok(closed.pnlCents<0);
  const ep=await f.db.opportunityEpisode(c.boltId);assert.equal(ep.trackingComplete,true);assert.equal(ep.outcomeLabel,'FALSE_BOLT');assert.equal(ep.outcome.auroraExit,true);
});

test('R60 green Bolt preserves target-aware Infinity feasibility without turning price motion alone into authority',()=>{
  const now=Date.now(),q=nowQuote('TARGET-RADAR',54,55),cosmos=[greenShadow('TARGET-RADAR',53)];
  const history=[{t:now-30_000,bid:44,ask:45},{t:now-15_000,bid:48,ask:49},{t:now-5_000,bid:53,ask:54},{t:now,bid:54,ask:55}];
  const low=r51Settings({infinityBreakMinNetPerOriginalContractCents:5,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,athenaExclamationEnabled:false,lightningPlasmaEnabled:false});
  const lf=atomicThunderBoltFeatures({q,history,settings:low,cosmos,now});const ld=atomicThunderBoltDecision(lf,low);
  assert.equal(lf.eligibleAttacks[0].requiredTargetBidCents,64);assert.equal(lf.eligibleAttacks[0].targetFeasible,true);assert.equal(ld.detected,true);assert.equal(ld.reason,'cosmo_green');
  const impossible={...low,infinityBreakMinNetPerOriginalContractCents:50};const hf=atomicThunderBoltFeatures({q,history,settings:impossible,cosmos,now});const hd=atomicThunderBoltDecision(hf,impossible);
  assert.equal(hf.eligibleAttacks[0].requiredTargetBidCents,109);assert.equal(hf.eligibleAttacks[0].targetFeasible,false);assert.equal(hd.detected,false);assert.equal(hd.reason,'economic_target_unreachable');
});

test('R58 legacy mixed economics stays a bounded cold-start prior until ATB2+A8 certified evidence exists',()=>{
  const settings=r51Settings({infinityBreakMinNetPerOriginalContractCents:5,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,lightningPlasmaEnabled:false,momentumHunterEnabled:true,athenaExclamationEnabled:true});
  const entries=[];
  for(let i=0;i<8;i++)entries.push({id:`m-${i}`,conceptName:'Momentum Hunter',status:'closed',closeReason:'infinity_break',pnlCents:500,count:100,entryFeeCents:200,maeCents:2,entryPriceCents:50,sourceFeeder:'Pegasus',closedAtMs:100+i,entryConfig:{sport:'Tennis',release:'R51-HIST',infinityBreak:{minimumNetPerOriginalContractCents:5},gameClockAuthority:{elapsedMinutes:45}}});
  for(let i=0;i<8;i++)entries.push({id:`ae-${i}`,conceptName:'Athena Exclamation',status:'closed',closeReason:'hard_stop_loss',pnlCents:-800,count:100,entryFeeCents:200,maeCents:20,entryPriceCents:50,sourceFeeder:'Pegasus',closedAtMs:200+i,entryConfig:{sport:'Tennis',release:'R51-HIST',infinityBreak:{minimumNetPerOriginalContractCents:5},gameClockAuthority:{elapsedMinutes:45}}});
  const memory=compileAthenaAttackMemory({entries,episodes:[],profitEpisodes:[]});
  const band=(concept)=>({concept,targetFeasible:true,targetFeasibilityScore:90,requiredTargetBidCents:59,requiredGrossMoveCents:9,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2});
  const bolt={score:90,features:{askCents:50,bidCents:49,spreadCents:1,sport:'Tennis',gameMinutes:45,cosmoSources:['Pegasus'],cosmoCount:1,velocity15CentsPerSec:0.2,velocity30CentsPerSec:0.1,momentumRiseCents:2,momentumPullbackCents:0,waveFavorableMoveCents:2,crashDepthCents:2,reboundCents:2,reclaimRate:1,upwardTicks:4,lowerLowCount:0,targetFeasibilityScore:90,eligibleAttacks:[band('Momentum Hunter'),band('Athena Exclamation')]}};
  const aeCandidate={id:'ae-cold-start',ticker:'AE-STRUCT',eventTicker:'AE-STRUCT',saintCount:3,expiresAtMs:Date.now()+60_000};
  const ranking=rankAthenaAttacks(bolt,settings,memory,{fieldContext:{athenaExclamationCandidate:aeCandidate}});
  const momentum=ranking.find(x=>x.concept==='Momentum Hunter'),ae=ranking.find(x=>x.concept==='Athena Exclamation');
  assert.equal(momentum.certifiedEconomicMature,false);assert.equal(ae.certifiedEconomicMature,false);
  assert.equal(momentum.economicAuthorityMode,'ATB2_A8_CERTIFIED_COLD_START');assert.equal(ae.economicAuthorityMode,'ATB2_A8_CERTIFIED_COLD_START');
  assert.equal(momentum.legacyEconomicMature,true);assert.equal(momentum.legacyEconomicQualified,true);assert.equal(ae.legacyEconomicMature,true);assert.equal(ae.legacyEconomicQualified,false);
  assert.ok(momentum.economicDecisionWeight<=0.10+1e-9);assert.ok(ae.economicDecisionWeight<=0.10+1e-9,'legacy negative history cannot dominate certified cold start');
});

test('R60 mature negative legacy EV is ranking-only and missing A8 evidence cannot veto a valid green Bolt',async()=>{
  const settings=r51Settings({infinityBreakMinNetPerOriginalContractCents:5,momentumHunterEnabled:true,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,lightningPlasmaEnabled:false,athenaExclamationEnabled:false});
  const rows=[];for(let i=0;i<12;i++)rows.push({id:`bad-${i}`,conceptName:'Momentum Hunter',status:'closed',closeReason:'hard_stop_loss',pnlCents:-900,count:100,entryFeeCents:200,maeCents:24,entryPriceCents:50,sourceFeeder:'Pegasus',closedAtMs:100+i,entryConfig:{sport:'Tennis',release:'R51-HIST',infinityBreak:{minimumNetPerOriginalContractCents:5},gameClockAuthority:{elapsedMinutes:45}}});
  const db=fakeDb(rows);const athena=new AthenaCommander({db,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R60'});await athena.init();
  const now=Date.now(),bolt={id:'green-bolt',ticker:'BAD',eventTicker:'BAD',sport:'Tennis',score:99,detectedAtMs:now,expiresAtMs:now+5000,greenTrigger:{shadowTradeId:'shadow-BAD',cosmo:'Pegasus',moveCents:1},features:{askCents:50,bidCents:49,spreadCents:1,sport:'Tennis',gameMinutes:45,cosmoSources:['Pegasus'],cosmoCount:1,greenSources:[{shadowTradeId:'shadow-BAD',conceptName:'Pegasus',green:true,moveCents:1}],velocity15CentsPerSec:1,momentumRiseCents:5,momentumPullbackCents:0,waveFavorableMoveCents:5,crashDepthCents:5,reboundCents:5,reclaimRate:1,upwardTicks:5,lowerLowCount:0,targetFeasibilityScore:95,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true,targetFeasibilityScore:95,requiredTargetBidCents:59,requiredGrossMoveCents:9,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2}]}};
  const d=await athena.decide(bolt,{});assert.equal(d.decision,'FIRE');assert.ok(d.fireCommand);assert.equal(d.survivalCertificate,null);assert.equal(d.fireCommand.decisionEvidence.predictiveReVetoAllowed,false);assert.equal(d.fireCommand.decisionEvidence.historyRole,'RANKING_ONLY_NO_VETO');
});

test('R52 fixed economic mission is frozen into FIRE and a target edit before execution fails closed',()=>{
  const s=r51Settings({infinityBreakMinNetPerOriginalContractCents:5}),q=nowQuote('TARGET-FREEZE',54,55),c=command(s,'Momentum Hunter',q);
  assert.equal(c.economicTarget.netPerOriginalContractCents,5);assert.equal(validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:s}).ok,true);
  const changed={...s,infinityBreakMinNetPerOriginalContractCents:6};const out=validateAthenaFireCommand(c,{concept:'Momentum Hunter',q,settings:changed});assert.equal(out.ok,false);assert.equal(out.reason,'athena_economic_target_changed');
});

test('R52 post-exit research restores latest price, executable best/worst, missed upside and loss avoided without quote-rate DB writes',async()=>{
  const settings=r51Settings({recoveryTrackingHours:24,simFeeCents:2});const now=Date.now();
  const entry={id:'post-1',systemName:settings.systemName,ownerId:settings.ownerId,conceptName:'Momentum Hunter',ticker:'POST',eventTicker:'POST',marketTitle:'Post Exit',mode:'SIMULATION',status:'closed',entryPriceCents:50,exitPriceCents:60,currentPriceCents:60,peakPriceCents:60,stopPriceCents:30,stopLossCents:20,count:100,remainingCount:0,pnlCents:600,entryFeeCents:200,exitFeeCents:200,closeReason:'manual_cashout',openedAtMs:now-120000,closedAtMs:now-60000,updatedAtMs:now-60000,archived:false,researchTrackingComplete:true,entryConfig:{release:'R52'},postExitState:{}};
  const db=fakeDb([entry]),market=fakeMarket(nowQuote('POST',70,71));const guard=new ProfitGuard({db,kalshi:{},market,learning:{},getSettings:()=>settings});
  await guard.trackPostExit();await new Promise(r=>setTimeout(r,10));let saved=await db.entryById('post-1');assert.equal(saved.postExitState.version,'POST-EXIT-RESEARCH-V2');assert.equal(saved.postExitState.latestMarketPriceCents,70.5);assert.equal(saved.postExitState.deltaFromExitCents,10.5);assert.equal(saved.postExitState.bestExecutableBidCents,70);assert.equal(saved.postExitState.missedUpsideNetCents,1000);assert.equal(saved.postExitState.lossAvoidedNetCents,0);
  market.quote.yesBid=40;market.quote.yesAsk=41;market.quote.updatedAtMs+=1000;await guard.trackPostExit();await new Promise(r=>setTimeout(r,10));saved=await db.entryById('post-1');assert.equal(saved.postExitState.bestExecutableBidCents,70);assert.equal(saved.postExitState.worstExecutableBidCents,40);assert.equal(saved.postExitState.lossAvoidedNetCents,2000);assert.equal(saved.postExitState.missedUpsideNetCents,1000);const snap=guard.resourceSnapshot().postExitPersistence;assert.equal(snap.totalFailed,0);assert.equal(snap.totalDropped,0);assert.ok(snap.maxObservedPending<=1);
});

test('R52 post-exit economic regret never treats partial depth as full-position executable evidence',async()=>{
  const settings=r51Settings({recoveryTrackingHours:24}),now=Date.now();const entry={id:'post-partial',systemName:settings.systemName,ownerId:settings.ownerId,conceptName:'Momentum Hunter',ticker:'PART',eventTicker:'PART',marketTitle:'Partial',mode:'SIMULATION',status:'closed',entryPriceCents:50,exitPriceCents:60,currentPriceCents:60,count:100,remainingCount:0,pnlCents:600,entryFeeCents:200,exitFeeCents:200,closeReason:'manual_cashout',openedAtMs:now-100000,closedAtMs:now-50000,updatedAtMs:now-50000,archived:false,researchTrackingComplete:true,entryConfig:{release:'R52'},postExitState:{}};const db=fakeDb([entry]),market=fakeMarket(nowQuote('PART',80,81));market.executableBid=(_t,count)=>({filled:Math.max(1,count-1),full:false,avgCents:80,bestCents:80});const guard=new ProfitGuard({db,kalshi:{},market,learning:{},getSettings:()=>settings});await guard.trackPostExit();await new Promise(r=>setTimeout(r,10));const saved=await db.entryById('post-partial');assert.equal(saved.postExitState.latestMarketPriceCents,80.5);assert.equal(saved.postExitState.bestExecutableBidCents??null,null);assert.equal(saved.postExitState.missedUpsideNetCents??null,null);
});

test('R52 production wiring supplies deterministic sport context to Bolt/Athena and UI restores post-trade economics columns',async()=>{
  const [engine,html,app,db,doctrine]=await Promise.all([readFile(new URL('../src/engine.mjs',import.meta.url),'utf8'),readFile(new URL('../public/index.html',import.meta.url),'utf8'),readFile(new URL('../public/app.js',import.meta.url),'utf8'),readFile(new URL('../src/db.mjs',import.meta.url),'utf8'),readFile(new URL('../src/doctrine.mjs',import.meta.url),'utf8')]);
  assert.match(engine,/classifyDeterministic\(q\.ticker/);assert.match(engine,/ATHENA-A3/);assert.match(engine,/runPostExitResearchIfDue\('full_scan'\)/);assert.match(engine,/runPostExitResearchIfDue\('fast_phase'\)/);assert.equal((engine.match(/profitGuard\.trackPostExit\(\)/g)||[]).length,1);assert.match(doctrine,/sweepIntervalMs:5_000/);assert.match(doctrine,/maximumRowsPerSweep:500/);for(const label of ['Post Price','Delta Exit','Best Exec','Missed Upside','Worst Exec','Loss Avoided'])assert.match(html,new RegExp(label));assert.match(app,/postExitMissedUpsideCents/);assert.match(app,/postExitLossAvoidedCents/);for(const id of ['athenaTarget','athenaProfitEpisodes','athenaLastEV','athenaLastTargetProb'])assert.match(html,new RegExp(`id=\"${id}\"`));assert.match(app,/expectedNetPerOriginalContractCents/);assert.match(app,/targetHitProbability/);assert.match(db,/post_exit_state jsonb/);assert.match(db,/postExitState:'post_exit_state'/);
});


test('R52 target-aware Bolt and Athena C2 exclude structurally unavailable Athena Exclamation instead of using it to fake economic feasibility',()=>{
  const now=Date.now(),q=nowQuote('AE-STRUCT',54,55),history=[{t:now-30_000,bid:54,ask:55},{t:now-15_000,bid:54,ask:55},{t:now-5_000,bid:54,ask:55},{t:now,bid:54,ask:55}];
  const settings=r51Settings({momentumHunterEnabled:false,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,lightningPlasmaEnabled:false,athenaExclamationEnabled:true,infinityBreakMinNetPerOriginalContractCents:5});
  const unavailable=atomicThunderBoltFeatures({q,history,settings,fieldContext:{goldSaintCount:2,independentEventCount:5},now});
  assert.equal(unavailable.eligibleAttacks.some(x=>x.concept==='Athena Exclamation'),false);
  assert.equal(atomicThunderBoltDecision(unavailable,settings).detected,false);
  const candidate={id:'ae-struct-candidate',ticker:q.ticker,eventTicker:q.eventTicker,saintCount:3,expiresAtMs:now+60_000};
  const available=atomicThunderBoltFeatures({q,history,settings,fieldContext:{athenaExclamationCandidate:candidate},now});
  assert.equal(available.eligibleAttacks.some(x=>x.concept==='Athena Exclamation'),true);
  const artificial={score:95,features:{...available,eligibleAttacks:[{concept:'Athena Exclamation',targetFeasible:true,targetFeasibilityScore:90,requiredTargetBidCents:64,requiredGrossMoveCents:9,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2}]}};
  assert.equal(rankAthenaAttacks(artificial,settings,null,{fieldContext:{goldSaintCount:3,independentEventCount:5}}).length,0,'synthetic Saint count alone must not make AE structurally available');
  assert.equal(rankAthenaAttacks(artificial,settings,null,{fieldContext:{athenaExclamationCandidate:candidate}}).length,1,'the durable AE1 convergence candidate is the structural prerequisite');
});

test('R52 Athena Exclamation FIRE still fails closed on its three-Saint structural prerequisite without restoring strategic revalidation',async()=>{
  const settings=r51Settings({athenaExclamationEnabled:true}),q=nowQuote('AE-FIRE',54,55),f=strategyFixture({settings,quote:q});
  const c=command(settings,'Athena Exclamation',q,{boltId:'ae-struct-fire',decisionEvidence:{features:{askCents:q.yesAsk,bidCents:q.yesBid},fieldContext:{goldSaintCount:2,independentEventCount:5}}});
  const decision={decision:'FIRE',fireCommand:c,ranking:c.ranking};
  const e=await f.s.executeAthenaFire(q,{id:c.boltId,ticker:q.ticker,eventTicker:q.eventTicker,features:{sport:'Tennis'}},decision,{fieldContext:{goldSaintCount:2,independentEventCount:5}});
  assert.equal(e,null);assert.equal(f.db.inserted.length,0);assert.ok(f.db.audits.some(x=>x.event==='athena_fire_execution_aborted'&&x.data?.reason==='three_saints_candidate_missing_or_expired'));
});

test('R52 post-exit research records terminal settlement as executable economic evidence and completes the research row',async()=>{
  const settings=r51Settings({recoveryTrackingHours:24,simFeeCents:2}),now=Date.now();
  const entry={id:'post-final',systemName:settings.systemName,ownerId:settings.ownerId,conceptName:'Momentum Hunter',ticker:'FINAL',eventTicker:'FINAL',marketTitle:'Final',mode:'SIMULATION',status:'closed',entryPriceCents:50,exitPriceCents:60,currentPriceCents:60,count:100,remainingCount:0,pnlCents:600,entryFeeCents:200,exitFeeCents:200,closeReason:'infinity_break',openedAtMs:now-120000,closedAtMs:now-60000,updatedAtMs:now-60000,archived:false,researchTrackingComplete:true,entryConfig:{release:'R52'},postExitState:{}};
  const q={...nowQuote('FINAL',99,100),status:'finalized',result:'yes',yesBid:100,yesAsk:100,updatedAtMs:now};
  const db=fakeDb([entry]),market=fakeMarket(q),guard=new ProfitGuard({db,kalshi:{},market,learning:{},getSettings:()=>settings});
  await guard.trackPostExit();assert.equal(await guard.flushPostExitPersistence(500),true);
  const saved=await db.entryById('post-final'),state=saved.postExitState;
  assert.equal(state.finalized,true);assert.equal(state.finalResult,'yes');assert.equal(state.finalPayoutCents,100);assert.equal(state.researchComplete,true);assert.equal(state.completionReason,'market_final');
  assert.equal(state.bestExecutableBidCents,100);assert.equal(state.worstExecutableBidCents,100);assert.equal(state.bestExecutableNetCents,4800);assert.equal(state.missedUpsideNetCents,4200);assert.equal(saved.currentPriceCents,100);
});

test('R52 post-exit persistence retries the newest state after a transient DB failure and orderly flush bypasses cooldown once',async()=>{
  const settings=r51Settings();let attempts=0,last=null;
  const db={async updateEntry(id,patch){attempts+=1;if(attempts===1)throw new Error('temporary db outage');last={id,patch:structuredClone(patch)};},async runLowPriorityPersistence(task){return task();},async audit(){}};
  const guard=new ProfitGuard({db,kalshi:{},market:fakeMarket(),learning:{},getSettings:()=>settings});
  guard.enqueuePostExitPersistence('retry',{postExitState:{version:'POST-EXIT-RESEARCH-V2',latestMarketPriceCents:61}});
  for(let i=0;i<50&&guard.resourceSnapshot().postExitPersistence.totalFailed<1;i++)await new Promise(r=>setTimeout(r,2));
  assert.equal(guard.resourceSnapshot().postExitPersistence.totalFailed,1);assert.equal(guard.resourceSnapshot().postExitPersistence.pending,1);
  guard.enqueuePostExitPersistence('retry',{postExitState:{version:'POST-EXIT-RESEARCH-V2',latestMarketPriceCents:63}});
  assert.equal(await guard.flushPostExitPersistence(500),true);assert.equal(attempts,2);assert.equal(last.patch.postExitState.latestMarketPriceCents,63);
  const snap=guard.resourceSnapshot().postExitPersistence;assert.equal(snap.pending,0);assert.equal(snap.totalCompleted,1);assert.equal(snap.totalDropped,0);
});

test('R52 post-exit persistence has an absolute 512-entry bound under a stalled writer and drains without unbounded work',async()=>{
  const settings=r51Settings();let release;const gate=new Promise(r=>release=r);let calls=0;
  const db={async updateEntry(){calls+=1;if(calls===1)await gate;},async runLowPriorityPersistence(task){return task();},async audit(){}};
  const guard=new ProfitGuard({db,kalshi:{},market:fakeMarket(),learning:{},getSettings:()=>settings});
  for(let i=0;i<600;i++)guard.enqueuePostExitPersistence(`sat-${i}`,{postExitState:{version:'POST-EXIT-RESEARCH-V2',latestMarketPriceCents:i%100}});
  const loaded=guard.resourceSnapshot().postExitPersistence;assert.equal(loaded.active,1);assert.equal(loaded.pending,512);assert.equal(loaded.maxObservedPending,512);assert.equal(loaded.totalDropped,87);
  release();assert.equal(await guard.flushPostExitPersistence(3000),true);const drained=guard.resourceSnapshot().postExitPersistence;assert.equal(drained.pending,0);assert.equal(drained.active,0);assert.equal(drained.maxObservedPending,512);assert.equal(drained.totalCompleted,513);
});

test('R58 certified economics has no privileged Attack: mature ATB2+A8 evidence can select each structurally eligible Saint',()=>{
  const settings=r51Settings({infinityBreakMinNetPerOriginalContractCents:5,momentumHunterEnabled:true,waveSurferEnabled:true,recoveryHunterEnabled:true,crashRecoveryHunterEnabled:true,lightningPlasmaEnabled:true,athenaExclamationEnabled:true});
  const concepts=['Momentum Hunter','Wave Surfer','Crash Recovery Hunter','Recovery Hunter','Lightning Plasma','Athena Exclamation'];
  const band=concept=>({concept,targetFeasible:true,targetFeasibilityScore:85,requiredTargetBidCents:59,requiredGrossMoveCents:9,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2});
  const baseFeatures={askCents:50,bidCents:49,spreadCents:1,sport:'Tennis',gameMinutes:45,cosmoSources:['Dragon'],cosmoCount:1,velocity15CentsPerSec:0.1,velocity30CentsPerSec:0.08,momentumRiseCents:2,momentumPullbackCents:1,waveFavorableMoveCents:3,crashDepthCents:6,reboundCents:3,reclaimRate:0.5,upwardTicks:3,lowerLowCount:0,targetFeasibilityScore:85,eligibleAttacks:concepts.map(band)};
  const mkProfile=(good)=>({evidence:30,targetSamples:{'5':30},targetHits:{'5':good?25:4},realizedContractSamples:30,avgNetPerContractCents:good?2.5:-3.5,avgFailureNetPerContractCents:good?-4:-8,avgReturnRatio:good?0.08:-0.10,avgMaeCents:good?4:18});
  for(const desired of concepts){
    const profiles={};for(const concept of concepts)profiles[`A|${concept}`]=mkProfile(concept===desired);
    const memory={profiles:{},certifiedProfiles:profiles};
    const ranking=rankAthenaAttacks({score:80,features:baseFeatures},settings,memory,{recoveryContext:{eligible:true},fieldContext:{lightningPlasmaQualified:true,currentTickerEligible:true,independentEventCount:5,minCosmos:3,minStrikes:2,athenaExclamationCandidate:{id:'ae-mature',ticker:'T',eventTicker:'T',saintCount:3,expiresAtMs:Date.now()+60_000}}});
    assert.equal(ranking[0].concept,desired,`certified economic evidence should be able to select ${desired}`);assert.equal(ranking[0].certifiedEconomicQualified,true);assert.equal(ranking[0].economicAuthorityMode,'ATB2_A8_CERTIFIED_MATURE');
  }
});

test('R52 post-exit research survives Reset Simulation archive boundaries and still completes the economic path',async()=>{
  const settings=r51Settings({recoveryTrackingHours:24}),now=Date.now();
  const entry={id:'post-archived',systemName:settings.systemName,ownerId:settings.ownerId,conceptName:'Wave Surfer',ticker:'ARCH',eventTicker:'ARCH',marketTitle:'Archived cohort',mode:'SIMULATION',status:'closed',entryPriceCents:50,exitPriceCents:60,currentPriceCents:60,count:100,remainingCount:0,pnlCents:600,entryFeeCents:200,exitFeeCents:200,closeReason:'infinity_break',openedAtMs:now-120000,closedAtMs:now-60000,updatedAtMs:now-60000,archived:true,researchTrackingComplete:true,entryConfig:{release:'R52'},postExitState:{}};
  const db=fakeDb([entry]),market=fakeMarket(nowQuote('ARCH',70,71)),guard=new ProfitGuard({db,kalshi:{},market,learning:{},getSettings:()=>settings});
  await guard.trackPostExit();assert.equal(await guard.flushPostExitPersistence(500),true);const saved=await db.entryById('post-archived');assert.equal(saved.archived,true);assert.equal(saved.postExitState.bestExecutableBidCents,70);assert.equal(saved.postExitState.missedUpsideNetCents,1000);
});


test('SN3 Scarlet Needle is Crystal-Wall-win continuation only with one-shot authority and its own Infinity target',()=>{
  const s=originalSettings();
  assert.equal(SCARLET_NEEDLE.version,'SCARLET-NEEDLE-V3');
  assert.equal(SCARLET_NEEDLE.trigger,'POST_THIRD_CONSECUTIVE_CRYSTAL_WALL_SHADOW_INFINITY_WIN');
  assert.equal(SCARLET_NEEDLE.requiredParentConcept,'Crystal Wall Shadow');
  assert.equal(SCARLET_NEEDLE.requiredParentVersion,'CRYSTAL-WALL-V3');
  assert.equal(SCARLET_NEEDLE.athenaApprovalRequired,false);assert.equal(SCARLET_NEEDLE.athenaSoulHandoffVeto,false);assert.equal(SCARLET_NEEDLE.ordinaryGameClockExempt,true);assert.equal(SCARLET_NEEDLE.fullConfiguredSizeRequired,true);
  assert.equal(Object.hasOwn(SCARLET_NEEDLE,'triggerDropCents'),false,'the old retracement trigger must be gone');
  for(const k of ['scarletNeedleStakeCents','scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents','scarletNeedleInfinityNetPerOriginalContractCents','scarletNeedleMaxRepeats'])assert.equal(CANONICAL_NUMERIC_SETTINGS.includes(k),true,k);
  assert.equal(s.scarletNeedleInfinityNetPerOriginalContractCents,SCARLET_NEEDLE.defaultInfinityNetPerOriginalContractCents);
  assert.equal(s.scarletNeedleMaxRepeats,1);assert.equal(SCARLET_NEEDLE.maximumConfigurableRepeats,1);
  assert.equal(sanitizeRuntimeSettings({...s,scarletNeedleMaxRepeats:999}).scarletNeedleMaxRepeats,1);
  assert.equal(sanitizeRuntimeSettings({...s,scarletNeedleMaxRepeats:-5}).scarletNeedleMaxRepeats,0);
  assert.equal(sanitizeRuntimeSettings({...s,scarletNeedleMaxRepeats:3.9}).scarletNeedleMaxRepeats,1);
  const snap=entryConfigSnapshot({...s,scarletNeedleEnabled:true,scarletNeedleInfinityNetPerOriginalContractCents:7,scarletNeedleMaxRepeats:1},'Scarlet Needle');
  assert.equal(snap.model.structuralRole,'POST_THIRD_CRYSTAL_WALL_PROOF_CONTINUATION_ONLY');assert.equal(snap.model.maxRepeats,1);assert.equal(snap.model.profitTargetNetPerOriginalContractCents,7);
});

test('R61 Scarlet Needle is absent from normal Cosmos/Bolt/Athena strategic selection',()=>{
  const settings=r51Settings({
    scarletNeedleEnabled:true,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,
    momentumHunterEnabled:false,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,lightningPlasmaEnabled:false,athenaExclamationEnabled:false,
  });
  const now=Date.now(),q=nowQuote('SN-NORMAL',60,61),history=[{t:now-30_000,bid:52,ask:53},{t:now-15_000,bid:55,ask:56},{t:now-5_000,bid:59,ask:60},{t:now,bid:60,ask:61}];
  const f=atomicThunderBoltFeatures({q,history,settings,cosmos:[greenShadow(q.ticker,50)],now});
  assert.equal(f.eligibleAttacks.some(x=>x.concept==='Scarlet Needle'),false);
  assert.equal(rankAthenaAttacks({score:100,features:f},settings,null,{}).some(x=>x.concept==='Scarlet Needle'),false);
  assert.equal(atomicThunderBoltDecision(f,settings).detected,false,'Scarlet alone cannot make a normal Bolt executable');
});

test('R61 a fabricated normal Athena FIRE cannot open Scarlet Needle outside continuation authority',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleStakeCents:20_000,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,hunterCooldownMinutes:45});
  const q=nowQuote('SN-FORGED',60,61),f=strategyFixture({settings,quote:q});
  const c=command(settings,'Scarlet Needle',q,{boltId:'forged-normal-scarlet'});
  const e=await f.s.createHunter('Scarlet Needle',q,c.stakeCents,0,{athenaFireCommand:c});
  assert.equal(e,null);assert.equal(f.db.inserted.length,0);
  assert.ok(f.db.audits.some(x=>x.event==='scarlet_continuation_execution_blocked'&&x.data?.reason==='scarlet_continuation_authority_required'));
});

test('SN3 Crystal Wall Infinity win reuses hard safety and freezes Scarlet own Infinity target plus fresh Aurora',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleMaxRepeats:1,scarletNeedleStakeCents:20_000,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,scarletNeedleInfinityNetPerOriginalContractCents:7,infinityBreakMinNetPerOriginalContractCents:25,hunterCooldownMinutes:45,auroraDamageControlPercent:45,athenaSoulEnabled:true});
  const q=nowQuote('SN-CONT',60,61),f=strategyFixture({settings,quote:q});
  f.s.athena={assess(){throw new Error('Athena approval must not be called for Scarlet V3');}};
  const parent=crystalWallWinner(settings,q,'winner-1',{entryPriceCents:30,exitPriceCents:60,pnlCents:321});
  const entry=await f.s.executeScarletContinuation(q,parent,{authorizationId:'SCARLET-THIRD-PROOF:first:winner-1',rootEntryId:'first',repeatIndex:1,maxRepeats:1,authorizedAtMs:Date.now(),thirdProof:seedScarletThirdProof(f.db,parent)});
  assert.ok(entry,`continuation entry blocked: ${JSON.stringify({audits:f.db.audits,pipeline:f.s.entryPipelineSummary()})}`);assert.equal(entry.conceptName,'Scarlet Needle');assert.equal(entry.ticker,parent.ticker);assert.equal(entry.eventTicker,parent.eventTicker);
  assert.equal(entry.entryConfig.model.structuralRole,'POST_THIRD_CRYSTAL_WALL_PROOF_CONTINUATION_ONLY');assert.equal(entry.entryConfig.model.maxRepeats,1);
  assert.equal(entry.entryConfig.scarletContinuation.parentEntryId,parent.id);assert.equal(entry.entryConfig.scarletContinuation.parentCrystalWallVersion,CRYSTAL_WALL.version);assert.equal(entry.entryConfig.scarletContinuation.repeatIndex,1);assert.equal(entry.entryConfig.scarletContinuation.athenaApprovalRequired,false);assert.equal(entry.entryConfig.scarletContinuation.athenaSoulVetoApplied,false);
  assert.equal(entry.entryConfig.athenaFire.authorityMode,SCARLET_NEEDLE.strategicEntryAuthority);assert.equal(entry.entryConfig.athenaFire.authorizedMaxEntryCents,88,'Scarlet V3 authorization must use the highest economically feasible price inside the operator band');assert.equal(entry.entryConfig.scarletContinuation.authorizationPricePolicy,'OPERATOR_BAND_CAPPED_BY_TARGET_FEASIBILITY');assert.equal(verifyAthenaFireCommandHash(entry.entryConfig.athenaFire),true);
  assert.equal(entry.entryConfig.scarletAuthority.strategicAuthority,false);assert.equal(entry.entryConfig.infinityBreak.version,INFINITY_BREAK.version);assert.equal(entry.entryConfig.infinityBreak.minimumNetPerOriginalContractCents,7,'Scarlet own target must freeze independently of global Infinity');
  settings.scarletNeedleInfinityNetPerOriginalContractCents=30;assert.equal(entry.entryConfig.infinityBreak.minimumNetPerOriginalContractCents,7,'later settings edits may not mutate an open Scarlet target');
  assert.equal(entry.entryConfig.aurora.version,AURORA_EXECUTION.version);assert.equal(entry.entryConfig.aurora.frozen,true);assert.ok(f.db.locks.some(x=>String(x).includes(q.ticker)));
});

test('SN3 engine consumes each completed Crystal Wall proof triple exactly once and persists durable Scarlet authorization',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleMaxRepeats:1});const q=nowQuote('SN-HANDOFF',60,61);
  const parent=crystalWallWinner(settings,q,'winner-handoff',{openedAtMs:Date.now()-20_000,closedAtMs:Date.now()-5});
  const firstProof=crystalWallWinner(settings,q,'winner-handoff-first',{openedAtMs:Date.now()-80_000,closedAtMs:Date.now()-60_000});
  const secondProof=crystalWallWinner(settings,q,'winner-handoff-second',{openedAtMs:Date.now()-50_000,closedAtMs:Date.now()-30_000});
  const db=fakeDb([firstProof,secondProof,parent]),market=fakeMarket(q);
  let calls=0;const engine=Object.create(SagittariusEngine.prototype);engine.settings=settings;engine.db=db;engine.market=market;engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;
  engine.freshExecutionSnapshot=async()=>({marketFresh:true,bookFresh:true,quote:market.getQuote()});
  engine.strategy={async executeScarletContinuation(_q,parent,ctx){calls+=1;return{id:`sn-open-${calls}`,conceptName:'Scarlet Needle',ticker:parent.ticker,eventTicker:parent.eventTicker,entryPriceCents:61,openedAtMs:Date.now(),entryConfig:{athenaFire:{authorityMode:SCARLET_NEEDLE.strategicEntryAuthority},scarletContinuation:{rootEntryId:ctx.rootEntryId,parentEntryId:parent.id,repeatIndex:ctx.repeatIndex,maxRepeatsAtEntry:ctx.maxRepeats}}};}};
  const first=await engine.handleScarletContinuation(parent);assert.equal(first.status,'OPENED');assert.equal(calls,1);const ep=await db.opportunityEpisode(first.authorizationId);assert.equal(ep.entryId,'sn-open-1');assert.equal(ep.athenaDecision.scarletNeedleContinuation.status,'OPENED');
  const replay=await engine.handleScarletContinuation(parent);assert.equal(replay.status,'DUPLICATE_SUPPRESSED');assert.equal(calls,1,'durable close authorization must never execute twice');
});

test('SN3 Scarlet is one-shot per Crystal Wall proof triple, rejects recursive/unrelated parents, and never retries terminal unsafe handoff',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleMaxRepeats:1});const q=nowQuote('SN-REPEAT',60,61);
  const blockedParent=crystalWallWinner(settings,q,'winner-blocked',{openedAtMs:Date.now()-20_000,closedAtMs:Date.now()-5});
  const firstProof=crystalWallWinner(settings,q,'winner-blocked-first',{openedAtMs:Date.now()-80_000,closedAtMs:Date.now()-60_000});
  const secondProof=crystalWallWinner(settings,q,'winner-blocked-second',{openedAtMs:Date.now()-50_000,closedAtMs:Date.now()-30_000});
  const db=fakeDb([firstProof,secondProof,blockedParent]),market=fakeMarket(q);let calls=0;
  const engine=Object.create(SagittariusEngine.prototype);engine.settings=settings;engine.db=db;engine.market=market;engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;engine.freshExecutionSnapshot=async()=>({marketFresh:true,bookFresh:true,quote:market.getQuote()});engine.strategy={async executeScarletContinuation(){calls+=1;return null;}};
  const blocked=await engine.handleScarletContinuation(blockedParent);assert.equal(blocked.status,'BLOCKED');assert.equal(blocked.reason,'hard_safety_or_execution_blocked');assert.equal(calls,1);
  const replay=await engine.handleScarletContinuation(blockedParent);assert.equal(replay.status,'DUPLICATE_SUPPRESSED');assert.equal(calls,1,'blocked continuation is one-shot and must not chase forever');
  const unrelated={...blockedParent,id:'other-parent',conceptName:'Wave Surfer'};assert.equal((await engine.handleScarletContinuation(unrelated)).reason,'not_crystal_wall_parent');
  const recursive={...blockedParent,id:'scarlet-parent',conceptName:'Scarlet Needle'};assert.equal((await engine.handleScarletContinuation(recursive)).reason,'not_crystal_wall_parent');
  const wrongVersion={...blockedParent,id:'old-cw',entryConfig:{...blockedParent.entryConfig,crystalWall:{...blockedParent.entryConfig.crystalWall,version:'CRYSTAL-WALL-V2'}}};assert.equal((await engine.handleScarletContinuation(wrongVersion)).reason,'not_crystal_wall_v3_parent');assert.equal(calls,1);
});

test('SN3 Scarlet continuation fails closed on owner/mode mismatch before any market or execution work',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleMaxRepeats:1});const db=fakeDb();let refreshes=0,calls=0;const engine=Object.create(SagittariusEngine.prototype);engine.settings=settings;engine.db=db;engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;engine.market={async refreshTickerVerified(){refreshes+=1;return null;}};engine.strategy={async executeScarletContinuation(){calls+=1;return null;}};
  const q=nowQuote('T',60,61),base=crystalWallWinner(settings,q,'foreign',{ownerId:'other-owner'});
  assert.equal((await engine.handleScarletContinuation(base)).reason,'owner_or_system_mismatch');
  assert.equal((await engine.handleScarletContinuation({...base,id:'mode',ownerId:settings.ownerId,mode:'LIVE'})).reason,'mode_changed_since_parent_close');
  assert.equal(refreshes,0);assert.equal(calls,0);
});

test('R60-HF1 SimulationMutationGate drains entered work and permanently rejects stale pre-reset epochs',async()=>{
  const gate=new SimulationMutationGate();
  const stale=gate.capture();
  const releaseEntered=gate.enter(stale);assert.equal(typeof releaseEntered,'function');assert.equal(gate.snapshot().active,1);
  let drained=false;const blocking=gate.blockAndDrain().then(()=>{drained=true;});
  await Promise.resolve();assert.equal(gate.snapshot().blocked,true);assert.equal(drained,false,'reset must wait for work already inside the mutation boundary');
  releaseEntered();await blocking;assert.equal(drained,true);assert.equal(gate.snapshot().active,0);
  gate.release();assert.equal(gate.enter(stale),null,'a task captured before reset may never commit after reset');
  const fresh=gate.capture(),releaseFresh=gate.enter(fresh);assert.equal(typeof releaseFresh,'function');releaseFresh();
});

test('R60-HF1 Reset Simulation archives economics but preserves tracker history, MarketHub history and Athena memory',async()=>{
  const gate=new SimulationMutationGate(),histories=new Map([['T',[{t:1,bid:50,ask:51},{t:2,bid:51,ask:52}]]]);
  const memory={version:'MEM',profiles:{x:{evidence:9}}};let archived=0,saved=0,clearTrackersCalled=0;
  const engine=Object.create(SagittariusEngine.prototype);
  Object.assign(engine,{
    settings:{mode:'SIMULATION',systemName:'SAGITTARIUS',resetTimestampMs:null},simulationMutationGate:gate,simulationResetPromise:null,
    athenaCommander:{memory,async cancelAllScarletNeedleArms(){}},market:{histories},
    db:{async archiveSimulation(){archived++;return 7;},async clearTrackers(){clearTrackersCalled++;throw new Error('must not clear trackers');},async saveSettings(){saved++;},async audit(){}},
    refreshCrashPriorityTickers(){},invalidateStateSnapshot(){},
  });
  const beforeHistory=structuredClone(histories.get('T'));const beforeMemory=engine.athenaCommander.memory;
  const n=await engine.resetSimulation();
  assert.equal(n,7);assert.equal(archived,1);assert.equal(saved,1);assert.equal(clearTrackersCalled,0);
  assert.deepEqual(histories.get('T'),beforeHistory);assert.equal(engine.athenaCommander.memory,beforeMemory);assert.equal(gate.snapshot().blocked,false);
});

test('R60-HF1 Reset Simulation waits for an in-flight SIM mutation before crossing the archive boundary',async()=>{
  const gate=new SimulationMutationGate(),token=gate.capture(),release=gate.enter(token);let archiveStarted=false;
  const engine=Object.create(SagittariusEngine.prototype);
  Object.assign(engine,{
    settings:{mode:'SIMULATION',systemName:'SAGITTARIUS',resetTimestampMs:null},simulationMutationGate:gate,simulationResetPromise:null,
    athenaCommander:{async cancelAllScarletNeedleArms(){}},market:{histories:new Map([['T',[]]])},
    db:{async archiveSimulation(){archiveStarted=true;return 1;},async saveSettings(){},async audit(){}},refreshCrashPriorityTickers(){},invalidateStateSnapshot(){},
  });
  const reset=engine.resetSimulation();await Promise.resolve();assert.equal(gate.snapshot().blocked,true);assert.equal(archiveStarted,false);
  release();assert.equal(await reset,1);assert.equal(archiveStarted,true);assert.equal(gate.snapshot().blocked,false);
});

test('R60-HF1 Athena can FIRE from live GREEN geometry while historical memory is still loading',async()=>{
  let releaseHistory;const historyWait=new Promise((resolve)=>{releaseHistory=resolve;});const persisted=[];
  const settings=r51Settings({momentumHunterEnabled:true,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,scarletNeedleEnabled:false,athenaExclamationEnabled:false,lightningPlasmaEnabled:false});
  const db={athenaEconomicEntries:async()=>historyWait,athenaEconomicOpportunityEpisodes:async()=>historyWait,async upsertOpportunityEpisode(ep){persisted.push(structuredClone(ep));},async audit(){}};
  const athena=new AthenaCommander({db,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R60-HF1'});
  await athena.init({background:true});assert.equal(athena.summary().memory.load.state,'LOADING');assert.equal(athena.summary().memory.entryAuthorityBlockedUntilLoaded,false);
  const now=Date.now(),bolt={id:'learning-live-bolt',ticker:'LEARN-LIVE',eventTicker:'LEARN-LIVE',sport:'Tennis',score:90,detectedAtMs:now,expiresAtMs:now+5000,greenTrigger:{shadowTradeId:'shadow-live',cosmo:'Pegasus',moveCents:1},features:{askCents:55,bidCents:54,spreadCents:1,sport:'Tennis',gameMinutes:45,cosmoSources:['Pegasus'],cosmoCount:1,greenSources:[{shadowTradeId:'shadow-live',conceptName:'Pegasus',green:true,moveCents:1}],targetFeasibilityScore:95,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true,targetFeasibilityScore:95,requiredTargetBidCents:60,requiredGrossMoveCents:5,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2}]}};
  const decision=await athena.decide(bolt,{});assert.equal(decision.decision,'FIRE');assert.equal(decision.selectedAttack,'Momentum Hunter');assert.ok(decision.fireCommand);assert.equal(persisted.length,1);
  releaseHistory([]);await athena.memoryRefreshPromise;assert.equal(athena.summary().memory.load.state,'READY');
});

test('R60-HF1 Athena historical-memory failure is visible but cannot suppress GREEN FIRE authority',async()=>{
  const settings=r51Settings({momentumHunterEnabled:true,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,scarletNeedleEnabled:false,athenaExclamationEnabled:false,lightningPlasmaEnabled:false});
  const db={async athenaEconomicEntries(){throw new Error('history unavailable');},async athenaEconomicOpportunityEpisodes(){throw new Error('history unavailable');},async upsertOpportunityEpisode(){},async audit(){}};
  const athena=new AthenaCommander({db,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R60-HF1'});await athena.init({background:true});await new Promise((resolve)=>setImmediate(resolve));
  assert.equal(athena.summary().memory.load.state,'FAILED');assert.match(athena.summary().memory.load.lastError,/history unavailable/);
  const now=Date.now(),bolt={id:'learning-failed-bolt',ticker:'LEARN-FAIL',eventTicker:'LEARN-FAIL',sport:'Tennis',score:90,detectedAtMs:now,expiresAtMs:now+5000,greenTrigger:{shadowTradeId:'shadow-fail',cosmo:'Pegasus',moveCents:1},features:{askCents:55,bidCents:54,spreadCents:1,sport:'Tennis',gameMinutes:45,cosmoSources:['Pegasus'],cosmoCount:1,greenSources:[{shadowTradeId:'shadow-fail',conceptName:'Pegasus',green:true,moveCents:1}],targetFeasibilityScore:95,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true,targetFeasibilityScore:95,requiredTargetBidCents:60,requiredGrossMoveCents:5,estimatedEntryFeePerContractCents:2,estimatedExitFeePerContractCents:2}]}};
  const decision=await athena.decide(bolt,{});assert.equal(decision.decision,'FIRE');assert.equal(decision.selectedAttack,'Momentum Hunter');assert.ok(decision.fireCommand);
});

test('R60-HF1 immediate post-reset A-to-Z chain: Pegasus shadow GREEN -> Atomic Thunder -> Athena FIRE -> Attack -> Infinity Break',async()=>{
  const settings=r51Settings({atomicThunderGreenTriggerCents:1,infinityBreakMinNetPerOriginalContractCents:1,infinityBreakRequiredConfirmations:2,pegasusEnabled:true,dragonEnabled:false,phoenixEnabled:false,momentumHunterEnabled:true,waveSurferEnabled:false,recoveryHunterEnabled:false,crashRecoveryHunterEnabled:false,scarletNeedleEnabled:false,athenaExclamationEnabled:false,lightningPlasmaEnabled:false,auroraDamageControlPercent:45});
  const gate=new SimulationMutationGate(),db=fakeDb(),market=fakeMarket(nowQuote('POST-RESET',54,55));
  const resetEngine=Object.create(SagittariusEngine.prototype);Object.assign(resetEngine,{settings:{...settings},simulationMutationGate:gate,simulationResetPromise:null,athenaCommander:{async cancelAllScarletNeedleArms(){}},market:{histories:new Map([['POST-RESET',structuredClone(market.history)]])},db:{...db,async archiveSimulation(){return 0;},async saveSettings(){},async audit(level,event,data){db.audits.push({level,event,data});}},refreshCrashPriorityTickers(){},invalidateStateSnapshot(){}});
  await resetEngine.resetSimulation();assert.ok(resetEngine.market.histories.get('POST-RESET').length>=4,'Atomic Thunder rolling history must survive reset');
  const strategy=new StrategyEngine({db,kalshi:{},market,learning:{},getSettings:()=>settings,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0,captureSimulationMutationToken:()=>gate.capture(),enterSimulationMutation:(token)=>gate.enter(token)});
  const shadow=await strategy.createGhost('Pegasus',market.quote,53,market.quote.gameStartTimeMs);assert.ok(shadow);assert.equal(shadow.conceptName,'Pegasus');
  const atomic=new AtomicThunderBoltEngine({db,market,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R60-HF1'});
  const bolt=await atomic.detect(market.quote,{cosmos:[shadow]});assert.ok(bolt);assert.equal(bolt.greenTrigger.shadowTradeId,shadow.id);assert.equal(bolt.greenTrigger.moveCents,1);
  const athena=new AthenaCommander({db,getSettings:()=>settings,systemName:settings.systemName,sourceRelease:'R60-HF1'});
  const decision=await athena.decide(bolt,{});assert.equal(decision.decision,'FIRE');assert.equal(decision.selectedAttack,'Momentum Hunter');
  const entry=await strategy.executeAthenaFire(market.quote,bolt,decision,{cosmos:[shadow]});assert.ok(entry);assert.equal(entry.conceptName,'Momentum Hunter');assert.equal(entry.sourceTradeId,shadow.id);
  market.quote.yesBid=65;market.quote.yesAsk=66;market.quote.updatedAtMs=Date.now();
  const learning={async onHardStop(){},async stopGuardProfile(){return null;},async lossWatchdogProfile(){return null;}};const guard=new ProfitGuard({db,kalshi:{},market,learning,getSettings:()=>settings});
  let out=await guard.protect(await db.entryById(entry.id));assert.equal(out.closed??false,false);market.quote.updatedAtMs+=1;market.history.push({t:market.quote.updatedAtMs,bid:65,ask:66});out=await guard.protect(await db.entryById(entry.id));assert.equal(out.closed,true);
  const closed=await db.entryById(entry.id);assert.equal(closed.closeReason,'infinity_break');assert.ok(closed.pnlCents>0);
});

test('SN3 Scarlet full configured size is fail-closed before persistence when executable depth is insufficient',async()=>{
  const settings=r51Settings({scarletNeedleEnabled:true,scarletNeedleStakeCents:500,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,scarletNeedleInfinityNetPerOriginalContractCents:7,scarletNeedleMaxRepeats:1});
  const q=nowQuote('SN3-DEPTH',60,61),f=strategyFixture({settings,quote:q});
  const depth=Math.max(1,Math.floor(500/q.yesAsk)-1);
  f.market.executableAsk=(_ticker,count)=>{const filled=Math.min(count,depth);return{filled,full:filled>=count,avgCents:q.yesAsk,bestCents:q.yesAsk};};
  const p=crystalWallWinner(settings,q,'sn3-depth');
  const opened=await f.s.executeScarletContinuation(q,p,{authorizationId:'SCARLET-THIRD-PROOF:first:sn3-depth',authorizedAtMs:Date.now(),thirdProof:seedScarletThirdProof(f.db,p)});
  assert.equal(opened,null);assert.equal(f.db.inserted.length,0);assert.ok(f.db.audits.some(x=>x.event==='scarlet_needle_v3_full_size_blocked'));
});

test('SN3 LIVE Scarlet persists intent before a full-size fill-or-kill BUY',async()=>{
  const settings=r51Settings({mode:'LIVE',liveArmed:true,scarletNeedleEnabled:true,scarletNeedleStakeCents:500,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,scarletNeedleInfinityNetPerOriginalContractCents:7,scarletNeedleMaxRepeats:1});
  const q={...nowQuote('SN3-LIVE',20,21),exchangeIndex:0},db=fakeDb(),market=fakeMarket(q),ops=[];
  const originalInsert=db.insertEntry.bind(db);db.insertEntry=async(e)=>{ops.push('intent');return originalInsert(e);};
  const kalshi={buildClientOrderId:()=> 'sn3-live-client',ensureExchangeBalance:async()=>({ok:true,exchangeIndex:0,availableCents:100000,requiredCents:500}),async placeOrder(args){ops.push('buy');this.last={...args};return{ok:true,orderId:'sn3-live-order',fillCount:Math.floor(500/21),averageFillPriceCents:21,feePaidCents:12,httpStatus:201};}};
  const st=new StrategyEngine({db,kalshi,market,learning:{},getSettings:()=>settings,getLiveReady:()=>true,refreshGameClock:async()=>{throw new Error('Scarlet V3 must bypass ordinary Game Clock');},random:()=>0});
  const p=crystalWallWinner(settings,q,'sn3-live',{mode:'LIVE',entryPriceCents:10,exitPriceCents:20});
  const opened=await st.executeScarletContinuation(q,p,{authorizationId:'SCARLET-THIRD-PROOF:first:sn3-live',authorizedAtMs:Date.now(),thirdProof:seedScarletThirdProof(db,p)});
  assert.ok(opened,JSON.stringify({audits:db.audits,pipeline:st.entryPipelineSummary()}));assert.deepEqual(ops.slice(0,2),['intent','buy']);assert.equal(kalshi.last.timeInForce,'fill_or_kill');assert.equal(kalshi.last.count,Math.floor(500/21));
});


test('SN3 Scarlet own Infinity target persists with readback and invalid values fail before persistence',async()=>{
  const base=r51Settings({scarletNeedleInfinityNetPerOriginalContractCents:1});
  let persisted=structuredClone(base),saves=0;
  const engine=Object.create(SagittariusEngine.prototype);
  Object.assign(engine,{
    settings:structuredClone(base),settingsPersistence:null,
    db:{
      async saveSettings(next){saves++;persisted=structuredClone(next);},
      async loadSettings(){return structuredClone(persisted);},
      async audit(){},
    },
    invalidateStateSnapshot(){},requestScan(){},
    async refreshFeederPriorityTickers(){},async refreshRecoveryPriorityTickers(){},refreshCrashPriorityTickers(){},
  });
  const updated=await engine.applySettingsPatch({scarletNeedleInfinityNetPerOriginalContractCents:8.5});
  assert.equal(updated.scarletNeedleInfinityNetPerOriginalContractCents,8.5);
  assert.equal(engine.settings.scarletNeedleInfinityNetPerOriginalContractCents,8.5);
  assert.equal(persisted.scarletNeedleInfinityNetPerOriginalContractCents,8.5);
  assert.equal(engine.settingsPersistence.lastValues.scarletNeedleInfinityNetPerOriginalContractCents,8.5);
  assert.equal(saves,1);
  await assert.rejects(()=>engine.applySettingsPatch({scarletNeedleInfinityNetPerOriginalContractCents:0}),/between 0\.01 and 99 cents/);
  assert.equal(saves,1,'invalid Scarlet target must fail before any persistence write');
  assert.equal(engine.settings.scarletNeedleInfinityNetPerOriginalContractCents,8.5);
});
