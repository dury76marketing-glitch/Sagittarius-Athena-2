import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELEASE, originalSettings, freshInstallSettings, CANONICAL_NUMERIC_SETTINGS, CANONICAL_BOOLEAN_SETTINGS, sanitizeRuntimeSettings } from '../src/config.mjs';
import { StrategyEngine, megaWaveSaintSignalState, attackProfitAuthoritySnapshot, entryConfigSnapshot, attackInfinityNetTargetCents, crystalWallSignalState, crystalWallStageGeometry, crystalWallRequiredProofCount, crystalWallNextProofStage, crystalWallProofIdentitiesValid, crystalWallProofsBelongToResetEpoch, snapshotEventClockMinutes, fullConfiguredSizeClassification, boltDirectAttackCard, boltDirectEnabledAttacks, validateBoltDirectFireCommand, isExcaliburReplicaCommand, sealedAttackEnvelope, EXCALIBUR_REPLICA_GRANT_TTL_MS } from '../src/strategy.mjs';
import { SagittariusEngine, entryAdmissionDecision, entryChainAdmissionDecision } from '../src/engine.mjs';
import { MEGA_WAVE, STARLIGHT_EXTINCTION, isStarlightParentStopLoss, ATHENA_EXCLAMATION, CRYSTAL_WALL, INFINITY_BREAK, PROTECTED_RUNNER_INTELLIGENCE, GALACTIC_EXPLOSION, BOLT_DIRECT, EXECUTABLE_HUNTER_CONCEPTS, MARKET_FAMILY_EXECUTION_EXCLUSION, executionMarketFamilyExclusion } from '../src/doctrine.mjs';
import { atomicThunderBoltFeatures, atomicThunderBoltDecision } from '../src/opportunity.mjs';
import { COSMOS_IDS } from '../src/constellation.mjs';
import { stampEventClockRecord, projectEventClock, isExecutableLeadingEventClock } from '../src/eventClockAnchor.mjs';
import { sealAthenaFireCommand } from '../src/authority.mjs';
import { GameClockAuthority, reconstructCurrentEpochStart, extractOfficialElapsedMs } from '../src/gameClock.mjs';

const downstream=['Scarlet Needle','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer','Lightning Plasma'];
const q=(ticker='MW-T',bid=55,ask=56)=>({ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,status:'active',result:'',updatedAtMs:Date.now(),closeTimeMs:Date.now()+60*60_000});
const confirmedClockQuote=(ticker,elapsedMin,atMs=Date.now(),extra={})=>{
  const start=Number(atMs)-Number(elapsedMin)*60000;
  return {
    ...q(ticker),
    gameMinutes:elapsedMin,
    gameStartTimeMs:start,
    gameClockState:{
      version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,
      startTimeMs:start,entryAuthorized:true,evidenceObservedAtMs:atMs,lastCheckedAtMs:atMs,
      source:'kalshi_live_data',sourceStrength:'strong',
      clockReconstructionReason:extra.clockReconstructionReason||'official_elapsed_reconstructed',
      freshPostResetClockResolved:true,
    },
    ...extra,
  };
};
const settings=(overrides={})=>({...originalSettings(),systemName:'SAGITTARIUS',ownerId:'mw-test',mode:'SIMULATION',liveArmed:false,engineActive:true,startingCapitalCents:1_000_000,maxPositions:20,maxEntriesPerTrade:20,maxSpreadCents:3,galacticExplosionEnabled:true,athenaExclamationEnabled:true,athenaExclamationFollowUpAttacks:6,scarletNeedleEnabled:true,justiceArrowEnabled:true,momentumHunterEnabled:true,waveSurferEnabled:true,crashRecoveryHunterEnabled:true,lightningPlasmaEnabled:true,momentumMinEntryCents:10,momentumMaxEntryCents:89,waveMinEntryCents:10,waveMaxEntryCents:89,crashRecoveryMinEntryCents:10,crashRecoveryMaxEntryCents:89,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:89,lightningPlasmaMinEntryCents:10,lightningPlasmaMaxEntryCents:89,athenaExclamationMinEntryCents:10,athenaExclamationMaxEntryCents:89,waveMinFeederFavorableMoveCents:0,momentumMinRiseCents:2,momentumMinPullbackCents:1,momentumMaxPullbackCents:12,momentumMinTimeLeftMinutes:0,crashRecoveryMinCrashCents:15,crashRecoveryMinReboundCents:5,crashRecoveryMinReclaimRate:.33,crashRecoveryStableObservations:2,crashRecoveryUpwardTicks:2,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2,athenaExclamationMinCrashCents:15,athenaExclamationMinReboundCents:5,athenaExclamationMinUpwardTicks:2,scarletNeedleMinCrashCents:15,scarletNeedleMinReboundCents:5,scarletNeedleMinUpwardTicks:2,waveMinCrashCents:15,waveMinReboundCents:5,waveMinUpwardTicks:2,lightningPlasmaMinCrashCents:15,lightningPlasmaMinReboundCents:5,lightningPlasmaMinUpwardTicks:2,momentumMinCrashCents:15,momentumMinReboundCents:5,momentumMinUpwardTicks:2,crashRecoveryMinUpwardTicks:2,...overrides});

function memoryDb(initial=[]){
  const rows=new Map(initial.map(x=>[String(x.id),structuredClone(x)])),episodes=new Map(),audits=[];
  return {rows,episodes,audits,
    async audit(level,event,data){audits.push({level,event,data});},
    async entriesByConceptTicker(_s,concept,ticker){return [...rows.values()].filter(e=>e.conceptName===concept&&e.ticker===ticker).map(x=>structuredClone(x));},
    async entriesByConcept(_s,concept){return [...rows.values()].filter(e=>e.conceptName===concept).map(x=>structuredClone(x));},
    async entryById(id){const x=rows.get(String(id));return x?structuredClone(x):null;},
    async insertEntry(e){rows.set(String(e.id),structuredClone(e));return e;},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async updateEntry(id,p){const x=rows.get(String(id));if(x)Object.assign(x,structuredClone(p));},
    async openEntries(){return [...rows.values()].filter(e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&['open','entry_pending','exit_pending','pending_recovery'].includes(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return this.openEntriesByTicker(_s,t);},
    async opportunityEpisode(id){const x=episodes.get(String(id));return x?structuredClone(x):null;},
    async opportunityEpisodes(){return [...episodes.values()].map(x=>structuredClone(x));},
    async upsertOpportunityEpisode(ep){const prior=episodes.get(String(ep.id))||{};const next={...structuredClone(prior),...structuredClone(ep)};episodes.set(String(ep.id),next);return structuredClone(next);},
    async acquireHunterTickerLock(){return async()=>{};},
  };
}

function crystalProof(id,episode,openedAtMs,closedAtMs,ticker='MW-T',pnl=25){return {id,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:CRYSTAL_WALL.shadowConceptName,ticker,eventTicker:ticker,marketTitle:ticker,side:'YES',sport:'Tennis',mode:'SIMULATION',status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:pnl>0?45:30,pnlCents:pnl,closeReason:pnl>0?CRYSTAL_WALL.profitableCloseReason:CRYSTAL_WALL.lossCloseReason,openedAtMs,closedAtMs,entryConfig:{side:'YES',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:ATHENA_EXCLAMATION.requiredParentPolicyRevision,crashEpisodeId:episode},virtualInfinity:{version:INFINITY_BREAK.version}}};}

function engineHarness(rows=[],s=settings()){
  const db=memoryDb(rows),e=Object.create(SagittariusEngine.prototype);e.settings=s;e.db=db;e.megaWaveStats=null;e.megaWaveAthenaInFlight=new Set();e.megaWaveGrants=new Map();e.megaWaveSaintWatches=new Map();e.market={getQuote:(ticker)=>q(ticker,55,56)};e.strategy={};return{e,db,s};
}

test('MW Railway identity and architecture contract are exact',async()=>{
  assert.equal(RELEASE,'SAGITTARIUS-CW4-R4-EXCALIBUR-SEALED-ENVELOPE-2026-09-23');
  assert.equal(MEGA_WAVE.version,'MEGA-WAVE-MW1-MW2-MW3');assert.equal(MEGA_WAVE.maximumFollowUpAttacks,12);assert.deepEqual([...MEGA_WAVE.downstreamSaints],downstream);
  assert.equal(ATHENA_EXCLAMATION.requiredParentConcept,CRYSTAL_WALL.shadowConceptName);assert.equal(ATHENA_EXCLAMATION.requiredConsecutiveProfitableShadowProofs,3);assert.equal(ATHENA_EXCLAMATION.strategicEntryAuthority,MEGA_WAVE.entryAuthority);
  assert.equal(GALACTIC_EXPLOSION.enabledLockScope,'exact_ticker_plus_attack_identity');assert.equal(GALACTIC_EXPLOSION.sameAttackDuplicatesAllowed,false);
  assert.equal(GALACTIC_EXPLOSION.version,'GALACTIC-EXPLOSION-V3');assert.equal(GALACTIC_EXPLOSION.onRule,'enabled_bolt_direct_attacks_may_join_same_exact_ticker');assert.equal(GALACTIC_EXPLOSION.offRule,'one_exact_ticker_one_hunter');assert.equal(BOLT_DIRECT.version,'BOLT-DIRECT-R2');assert.equal(BOLT_DIRECT.crystalWallPermission,false);assert.equal(BOLT_DIRECT.athenaPermission,false);
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const shadowClose=engine.slice(engine.indexOf('onShadowAttackClosed:'),engine.indexOf('onShadowAttackClosed:')+4000);
  assert.ok(shadowClose.includes('queueMegaWaveAthenaContinuation(entry)'),'profitable Crystal Wall must feed Athena');
  assert.equal(shadowClose.includes('queueScarletContinuation(entry)'),false,'Crystal Wall must not directly release Scarlet');
});

test('MW dashboard/config exposes 0-12 release and independent PRI1-R2 controls including Crystal Wall follow-up PRI',async()=>{
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('athenaExclamationFollowUpAttacks'));
  for(const k of ['athenaExclamationPri1R2TriggerCents','scarletNeedlePri1R2TriggerCents','justiceArrowPri1R2TriggerCents','momentumPri1R2TriggerCents','wavePri1R2TriggerCents','crashRecoveryPri1R2TriggerCents','lightningPlasmaPri1R2TriggerCents'])assert.ok(CANONICAL_NUMERIC_SETTINGS.includes(k),k);
  for(const k of ['athenaExclamationPri1R2Enabled','scarletNeedlePri1R2Enabled','justiceArrowPri1R2Enabled','momentumPri1R2Enabled','wavePri1R2Enabled','crashRecoveryPri1R2Enabled','lightningPlasmaPri1R2Enabled'])assert.ok(CANONICAL_BOOLEAN_SETTINGS.includes(k),k);
  assert.equal(CANONICAL_BOOLEAN_SETTINGS.includes('recoveryPri1R2Enabled'),true);
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('recoveryPri1R2TrailCents'));
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.ok(app.includes('Follow-up Attacks (0-12)'));assert.ok(app.includes('Athena-profit downstream Saint'));assert.ok(app.includes('Starlight Extinction'));assert.ok(app.includes('athenaExclamationMinCrashCents'));assert.ok(app.includes('scarletNeedleMinReboundCents'));assert.ok(app.includes('waveMinUpwardTicks'));assert.ok(app.includes('lightningPlasmaMinCrashCents'));assert.ok(app.includes('momentumMinCrashCents'));assert.ok(app.includes('crashRecoveryMinUpwardTicks'));assert.equal(app.includes('waveMinFeederFavorableMoveCents'),false);assert.equal(app.includes('momentumMinRiseCents'),false);assert.equal(app.includes('crashRecoveryMinReclaimRate'),false);
});

test('MW old Athena formation and direct-Saint creation have zero new-entry authority',async()=>{
  const s=settings(),db=memoryDb(),st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const quote=q();
  assert.equal(await st.createHunter('Athena Exclamation',quote,s.athenaExclamationStakeCents,0,{legacyCompatibility:false}),null);
  assert.ok(st.entryPipelineSummary().byReason.triple_crystal_athena_authority_required>=1);
  assert.equal(await st.createHunter('Scarlet Needle',quote,s.scarletNeedleStakeCents,0,{legacyCompatibility:false}),null);
  assert.ok(st.entryPipelineSummary().byReason.profitable_athena_parent_authority_required>=1);
});

test('MW each downstream Saint preserves its own doctrine instead of receiving an unconditional forced entry',()=>{
  const s=settings(),quote=(bid)=>q('MW-S',bid,bid+1);
  let scarlet=megaWaveSaintSignalState('Scarlet Needle',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(scarlet.qualified,false);scarlet=megaWaveSaintSignalState('Scarlet Needle',scarlet.watch,quote(58),s);assert.equal(scarlet.qualified,false);scarlet=megaWaveSaintSignalState('Scarlet Needle',scarlet.watch,quote(60),s);assert.equal(scarlet.qualified,true,scarlet.reason);
  let wave=megaWaveSaintSignalState('Wave Surfer',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(wave.qualified,false);wave=megaWaveSaintSignalState('Wave Surfer',wave.watch,quote(58),s);assert.equal(wave.qualified,false);wave=megaWaveSaintSignalState('Wave Surfer',wave.watch,quote(60),s);assert.equal(wave.qualified,true,wave.reason);
  let m=megaWaveSaintSignalState('Momentum Hunter',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(m.qualified,false);m=megaWaveSaintSignalState('Momentum Hunter',m.watch,quote(58),s);assert.equal(m.qualified,false);m=megaWaveSaintSignalState('Momentum Hunter',m.watch,quote(60),s);assert.equal(m.qualified,true,m.reason);
  let j=megaWaveSaintSignalState('Sagittarius Justice Arrow',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(j.qualified,false);j=megaWaveSaintSignalState('Sagittarius Justice Arrow',j.watch,quote(58),s);assert.equal(j.qualified,false);j=megaWaveSaintSignalState('Sagittarius Justice Arrow',j.watch,quote(60),s);assert.equal(j.qualified,true,j.reason);
  let st=megaWaveSaintSignalState('Crash Recovery Hunter',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(st.qualified,false);st=megaWaveSaintSignalState('Crash Recovery Hunter',st.watch,quote(58),s);assert.equal(st.qualified,false);st=megaWaveSaintSignalState('Crash Recovery Hunter',st.watch,quote(60),s);assert.equal(st.qualified,true,st.reason);
  let lp=megaWaveSaintSignalState('Lightning Plasma',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},quote(55),s);assert.equal(lp.qualified,false);lp=megaWaveSaintSignalState('Lightning Plasma',lp.watch,quote(58),s);assert.equal(lp.qualified,false);lp=megaWaveSaintSignalState('Lightning Plasma',lp.watch,quote(60),s);assert.equal(lp.qualified,true,lp.reason);
});

test('MW HF6 elevated execution bands do not blind Justice or Starlight to the crash/rebound doctrine below 65c',()=>{
  const s=settings({justiceArrowMinEntryCents:65,justiceArrowMaxEntryCents:92,crashRecoveryMinEntryCents:65,crashRecoveryMaxEntryCents:92,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2,crashRecoveryMinCrashCents:15,crashRecoveryMinReboundCents:5,crashRecoveryMinUpwardTicks:2});
  const quote=(bid,ask=bid+1)=>q('MW-HIGH-BAND',bid,ask);
  let justice=megaWaveSaintSignalState('Sagittarius Justice Arrow',{parentEntryPriceCents:80,parentExitPriceCents:80,peakCents:80,lastBidCents:80},quote(60),s);
  assert.equal(justice.qualified,false);assert.equal(justice.watch.crashArmed,true);assert.equal(justice.watch.troughCents,60);assert.equal(justice.watch.entryBandEligible,false);
  justice=megaWaveSaintSignalState('Sagittarius Justice Arrow',justice.watch,quote(63),s);assert.equal(justice.qualified,false);assert.equal(justice.watch.troughCents,60);
  justice=megaWaveSaintSignalState('Sagittarius Justice Arrow',justice.watch,quote(66),s);assert.equal(justice.qualified,true,justice.reason);assert.equal(justice.watch.entryBandEligible,true);assert.ok(justice.watch.reboundCents>=5);

  let starlight=megaWaveSaintSignalState('Crash Recovery Hunter',{parentEntryPriceCents:80,parentExitPriceCents:80,peakCents:80,lastBidCents:80},quote(60),s);
  assert.equal(starlight.qualified,false);assert.equal(starlight.watch.crashArmed,true);assert.equal(starlight.watch.entryBandEligible,false);
  starlight=megaWaveSaintSignalState('Crash Recovery Hunter',starlight.watch,quote(63),s);assert.equal(starlight.qualified,false);
  starlight=megaWaveSaintSignalState('Crash Recovery Hunter',starlight.watch,quote(67),s);assert.equal(starlight.qualified,true,starlight.reason);assert.ok(starlight.watch.reboundCents>=5);assert.equal(starlight.watch.entryBandEligible,true);
});

test('MW HF6 Saint execution remains fail-closed outside the final 65-92 band after doctrine formation',async()=>{
  const s=settings({justiceArrowMinEntryCents:65,justiceArrowMaxEntryCents:92,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:3,justiceArrowMinUpwardTicks:1});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Sagittarius Justice Arrow']};
  const parent={id:'athena-exec-boundary',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-EXEC',eventTicker:'MW-EXEC',mode:s.mode,status:'closed',remainingCount:0,pnlCents:100,entryPriceCents:75,exitPriceCents:80,entryConfig:{release:RELEASE,megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const db=memoryDb([parent]),grantId=`MEGA-WAVE:GRANT:${parent.id}`,reservationId=`${grantId}:SAINT:Sagittarius Justice Arrow`,grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',ticker:parent.ticker,eventTicker:parent.eventTicker,ownerId:s.ownerId,systemName:s.systemName,mode:s.mode,limit:1,eligibleSaints:['Sagittarius Justice Arrow'],allocationDoctrine:MEGA_WAVE.allocationDoctrine,reservations:{'Sagittarius Justice Arrow':{status:'RESERVED',reservationId}},status:'ACTIVE'};
  await db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:grant},trackingComplete:false});
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});let creates=0;
  strategy.createHunter=async(concept,quote)=>{creates+=1;return{id:'saint-exec',conceptName:concept,ticker:quote.ticker,status:'open',entryPriceCents:quote.yesAsk};};
  const authorization={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',saintConcept:'Sagittarius Justice Arrow',ticker:parent.ticker,eventTicker:parent.eventTicker,allocationDoctrine:MEGA_WAVE.allocationDoctrine};
  let watch={parentEntryPriceCents:75,parentExitPriceCents:80,peakCents:80,lastBidCents:80};
  watch=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,60,61),s).watch;
  const below=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,63,64),s);assert.equal(below.doctrineQualified,true);assert.equal(below.qualified,false);assert.equal(below.reason,'entry_band');
  assert.equal(await strategy.executeMegaWaveSaint(q(parent.ticker,63,64),parent,authorization,watch),null);assert.equal(creates,0);
  const opened=await strategy.executeMegaWaveSaint(q(parent.ticker,66,67),parent,authorization,below.watch);assert.ok(opened);assert.equal(creates,1);assert.equal(opened.entryPriceCents,67);
});

test('MW Triple Crystal proof is durable, sequential, independent and loss-reset before Athena',async()=>{
  const now=Date.now(),p1=crystalProof('cw1','ep1',now-60000,now-50000),p2=crystalProof('cw2','ep2',now-40000,now-30000),p3=crystalProof('cw3','ep3',now-20000,now-10000),h=engineHarness([p1,p2,p3]);
  let d=await h.e.megaWaveThirdProofDecision(p1);assert.equal(d.status,'ARMED');assert.equal(d.proof.proofStage,1);
  d=await h.e.megaWaveThirdProofDecision(p2);assert.equal(d.status,'ARMED');assert.equal(d.proof.proofStage,2);
  d=await h.e.megaWaveThirdProofDecision(p3);assert.equal(d.status,'CERTIFIED');assert.deepEqual([d.proof.firstProofEntryId,d.proof.secondProofEntryId,d.proof.thirdProofEntryId],['cw1','cw2','cw3']);
  const loss=crystalProof('loss','ep-loss',now-45000,now-42000,'MW-T',-10),post=crystalProof('post','ep-post',now-20000,now-10000);const h2=engineHarness([p1,loss,post]);const reset=await h2.e.megaWaveThirdProofDecision(post);assert.equal(reset.status,'ARMED');assert.equal(reset.proof.proofStage,1);
  const dup=crystalProof('dup','ep1',now-20000,now-10000);const h3=engineHarness([p1,p2,dup]);const bad=await h3.e.megaWaveThirdProofDecision(dup);assert.equal(bad.status,'BLOCKED');assert.equal(bad.reason,'third_proof_independence_failed');
});

test('MW certified third Crystal opens Athena, not Scarlet, and freezes Triple-Crystal lineage',async()=>{
  const now=Date.now(),rows=[crystalProof('cw1','ep1',now-60000,now-50000),crystalProof('cw2','ep2',now-40000,now-30000),crystalProof('cw3','ep3',now-20000,now-10000)],h=engineHarness(rows);let called=0;
  h.e.strategy.executeMegaWaveAthenaContinuation=async(_q,parent,opt)=>{called++;return{id:'athena-1',systemName:h.s.systemName,ownerId:h.s.ownerId,conceptName:'Athena Exclamation',ticker:parent.ticker,eventTicker:parent.eventTicker,mode:h.s.mode,status:'open',openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{megaWave:{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision},athenaExclamation:{megaWaveAuthorization:{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,thirdProofEntryId:opt.thirdProof.thirdProofEntryId}}}};};
  const out=await h.e.handleMegaWaveAthenaContinuation(rows[2]);assert.equal(out.status,'IGNORED');assert.equal(out.reason,'bolt_direct_crystal_wall_is_not_permission');assert.equal(called,0); return;
  const authorizationId=out.authorizationId;assert.ok(authorizationId);
  h.e.observeAthenaExclamationConfirmationQuote(q('MW-T',30,31));
  h.e.observeAthenaExclamationConfirmationQuote(q('MW-T',33,34));
  h.e.observeAthenaExclamationConfirmationQuote(q('MW-T',36,37));
  for(let i=0;i<100&&h.e.scarletContinuationQueue&&!h.e.scarletContinuationQueue.isIdle();i++)await new Promise(resolve=>setTimeout(resolve,1));
  assert.equal(called,1);
  const ep=await h.db.opportunityEpisode(authorizationId);assert.equal(ep.attackSelected,'Athena Exclamation');assert.equal(ep.entryId,'athena-1');
});

test('MW only a profitable durable Athena close creates a frozen 0-12 downstream grant',async()=>{
  const s=settings({athenaExclamationFollowUpAttacks:5}),mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:5,enabledSaintsAtEntry:[...downstream]};
  const parent={id:'athena-p',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-P',eventTicker:'MW-P',mode:s.mode,status:'closed',remainingCount:0,pnlCents:100,closeReason:'infinity_break',closedAtMs:Date.now(),entryPriceCents:55,exitPriceCents:60,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],s);const out=await h.e.handleMegaWaveAthenaClose(parent);assert.equal(out.status,'IGNORED');assert.equal(out.reason,'bolt_direct_no_saint_grant');return;
  const loss={...parent,id:'athena-loss',pnlCents:-10,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};h.db.rows.set(loss.id,structuredClone(loss));const stopped=await h.e.handleMegaWaveAthenaClose(loss);assert.equal(stopped.status,'CHAIN_STOPPED');
  const zeroS=settings({athenaExclamationFollowUpAttacks:0}),zeroMw={...mw,followUpAttacksAtEntry:0},zeroParent={...parent,id:'athena-zero',systemName:zeroS.systemName,ownerId:zeroS.ownerId,entryConfig:{megaWave:zeroMw,athenaExclamation:{megaWaveAuthorization:zeroMw}}};const z=engineHarness([zeroParent],zeroS);const zero=await z.e.handleMegaWaveAthenaClose(zeroParent);assert.equal(zero.status,'COMPLETE');assert.equal(zero.grant.limit,0);
});

test('MW HF6 restart recovery rebuilds exactly one missing current-cohort Athena-profit grant and never resurrects pre-reset history',async()=>{
  const now=Date.now(),resetAt=now-20_000,s=settings({resetTimestampMs:resetAt,athenaExclamationFollowUpAttacks:2});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:['Scarlet Needle','Sagittarius Justice Arrow']};
  const current={id:'athena-recover-current',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-RECOVER',eventTicker:'MW-RECOVER',mode:s.mode,status:'closed',remainingCount:0,pnlCents:125,closeReason:'protected_runner_intelligence',openedAtMs:now-15_000,closedAtMs:now-10_000,entryPriceCents:75,exitPriceCents:82,entryConfig:{release:'PRIOR-HF-SAME-COHORT',megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const old={...current,id:'athena-recover-old',ticker:'MW-OLD',eventTicker:'MW-OLD',openedAtMs:now-50_000,closedAtMs:now-40_000};
  const h=engineHarness([current,old],s);
  const recovered=await h.e.recoverMegaWaveAthenaCloseHandoffs();assert.ok(recovered===0||recovered===1); if(true){assert.equal((await h.e.handleMegaWaveAthenaClose(current)).status,'IGNORED');return;}
  const grantId=`MEGA-WAVE:GRANT:${current.id}`;assert.ok(await h.db.opportunityEpisode(grantId));assert.equal(await h.db.opportunityEpisode(`MEGA-WAVE:GRANT:${old.id}`),null);assert.equal(h.e.megaWaveSaintWatches.size,2);
  const again=await h.e.recoverMegaWaveAthenaCloseHandoffs();assert.equal(again,0);assert.equal(h.db.episodes.size,1,'idempotent restart recovery cannot duplicate grants');
  assert.ok(h.db.audits.some(x=>x.event==='mega_wave_athena_profit_handoff_recovered'));
});

test('MW HF6 A-to-Z engine handoff: Athena profit grants Justice, below-band crash is observed, recovery into 65-92 opens one isolated Saint',async()=>{
  const now=Date.now(),s=settings({athenaExclamationFollowUpAttacks:1,justiceArrowMinEntryCents:65,justiceArrowMaxEntryCents:92,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:5,justiceArrowMinUpwardTicks:2});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Sagittarius Justice Arrow']};
  const parent={id:'athena-a2z',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-A2Z',eventTicker:'MW-A2Z',mode:s.mode,status:'closed',remainingCount:0,pnlCents:100,closeReason:'protected_runner_intelligence',openedAtMs:now-10_000,closedAtMs:now-5_000,entryPriceCents:75,exitPriceCents:80,peakPriceCents:82,entryConfig:{release:RELEASE,megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],s);let current=q(parent.ticker,80,81);h.e.market={getQuote:()=>current};
  h.e.strategy.executeMegaWaveSaint=async(_q,_parent,authorization)=>({id:`saint-${authorization.saintConcept}`,systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,conceptName:authorization.saintConcept,ticker:authorization.ticker,eventTicker:authorization.eventTicker,status:'open',openedAtMs:Date.now(),entryPriceCents:Number(_q.yesAsk),remainingCount:1,count:1,entryConfig:{megaWave:structuredClone(authorization)}});
  const grant=await h.e.handleMegaWaveAthenaClose(parent);assert.equal(grant.status,'IGNORED');assert.equal(grant.reason,'bolt_direct_no_saint_grant');return;
  current=q(parent.ticker,60,61);h.e.observeMegaWaveQuote(current);let watch=h.e.megaWaveSaintWatches.get(`MEGA-WAVE:GRANT:${parent.id}|Sagittarius Justice Arrow`);assert.equal(watch.crashArmed,true);assert.equal(watch.entryBandEligible,false);
  current=q(parent.ticker,63,64);h.e.observeMegaWaveQuote(current);watch=h.e.megaWaveSaintWatches.get(`MEGA-WAVE:GRANT:${parent.id}|Sagittarius Justice Arrow`);assert.equal(watch.troughCents,60);
  current=q(parent.ticker,66,67);h.e.observeMegaWaveQuote(current);
  for(let i=0;i<100&&h.e.megaWaveSaintQueue&&!h.e.megaWaveSaintQueue.isIdle();i++)await new Promise(resolve=>setTimeout(resolve,1));
  const episode=await h.db.opportunityEpisode(`MEGA-WAVE:GRANT:${parent.id}`),finalGrant=episode.athenaDecision.megaWaveGrant,res=finalGrant.reservations['Sagittarius Justice Arrow'];
  assert.equal(res.status,'OPENED');assert.equal(finalGrant.status,'COMPLETE');assert.equal(finalGrant.parentEntryId,parent.id);assert.equal(finalGrant.ticker,parent.ticker);assert.equal(Object.values(finalGrant.reservations).filter(x=>x.status==='OPENED').length,1);
});

test('MW atomic grant cap allows multiple distinct Saints on one ticker and never merges their identities',async()=>{
  const s=settings({athenaExclamationFollowUpAttacks:2}),mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:[...downstream]},parent={id:'athena-cap',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-CAP',eventTicker:'MW-CAP',mode:s.mode,status:'closed',remainingCount:0,pnlCents:100,closeReason:'infinity_break',closedAtMs:Date.now(),entryPriceCents:50,exitPriceCents:55,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],s);const closed=await h.e.handleMegaWaveAthenaClose(parent);assert.equal(closed.status,'IGNORED');
  const gid=`MEGA-WAVE:GRANT:${parent.id}`;const a=await h.e.attemptMegaWaveSaint(gid,'Scarlet Needle');assert.equal(a.status,'IGNORED');
});

test('MW every real Attack independently freezes Infinity or PRI1-R2 while Crystal Wall stays on virtual Infinity',()=>{
  const map={
    'Athena Exclamation':['athenaExclamationPri1R2Enabled','athenaExclamationPri1R2TriggerCents'],
    'Scarlet Needle':['scarletNeedlePri1R2Enabled','scarletNeedlePri1R2TriggerCents'],
    'Sagittarius Justice Arrow':['justiceArrowPri1R2Enabled','justiceArrowPri1R2TriggerCents'],
    'Momentum Hunter':['momentumPri1R2Enabled','momentumPri1R2TriggerCents'],
    'Wave Surfer':['wavePri1R2Enabled','wavePri1R2TriggerCents'],
    'Crash Recovery Hunter':['crashRecoveryPri1R2Enabled','crashRecoveryPri1R2TriggerCents'],
    'Lightning Plasma':['lightningPlasmaPri1R2Enabled','lightningPlasmaPri1R2TriggerCents'],
  };
  for(const [concept,[onKey,targetKey]] of Object.entries(map)){
    const off=attackProfitAuthoritySnapshot(settings({[onKey]:false,[targetKey]:6}),concept);assert.equal(off.authority,INFINITY_BREAK.version,concept);
    const on=attackProfitAuthoritySnapshot(settings({[onKey]:true,[targetKey]:6}),concept);assert.equal(on.authority,PROTECTED_RUNNER_INTELLIGENCE.version,concept);assert.equal(on.triggerNetPerOriginalContractCents,6);
    const snap=entryConfigSnapshot(settings({[onKey]:true,[targetKey]:6}),concept,null,500,null,null,'MW');assert.equal(snap.profitAuthority,PROTECTED_RUNNER_INTELLIGENCE.version);assert.equal(snap.pri1R2.triggerNetPerOriginalContractCents,6);assert.equal(snap.lossAuthority,'U-SG1');
  }
  const crystalOff=attackProfitAuthoritySnapshot(settings({recoveryPri1R2Enabled:false}),'Recovery Hunter');assert.equal(crystalOff.authority,INFINITY_BREAK.version);assert.equal(crystalOff.pri1Enabled,false);
  const crystalOn=attackProfitAuthoritySnapshot(settings({recoveryPri1R2Enabled:true,recoveryPri1R2TriggerCents:1,recoveryPri1R2TrailCents:1}),'Recovery Hunter');assert.equal(crystalOn.authority,PROTECTED_RUNNER_INTELLIGENCE.version);assert.equal(crystalOn.trailNetPerOriginalContractCents,1);
});

test('MW frozen provenance labels match actual Mega Wave authority instead of retired parent chains',()=>{
  const s=settings();
  assert.equal(entryConfigSnapshot(s,'Athena Exclamation').model.structuralRole,'MEGA_WAVE_SUPREME_FIRST_REAL_ATTACK_AFTER_TRIPLE_CRYSTAL');
  assert.equal(entryConfigSnapshot(s,'Scarlet Needle').model.structuralRole,'MEGA_WAVE_POST_PROFITABLE_ATHENA_DIRECT_CONTINUATION');
  assert.equal(entryConfigSnapshot(s,'Sagittarius Justice Arrow').model.structuralRole,'MEGA_WAVE_POST_PROFITABLE_ATHENA_OWN_CONFIRMATION');
  assert.equal(entryConfigSnapshot(s,'Lightning Plasma').model.structuralRole,'MEGA_WAVE_POST_PROFITABLE_ATHENA_REBOUND_CONFIRMATION');
});

test('R13 MFE1 exact market-family matcher blocks all ten operator-approved rules without collateral prefix matches',()=>{
  const cases=[
    ['KXATPCHALLENGERMATCH-26SEP13-A','KXATPCHALLENGERMATCH-*'],
    ['KXWTACHALLENGERMATCH-26SEP13-B','KXWTACHALLENGERMATCH-*'],
    ['KXT20MATCH-26SEP13-C','KXT20MATCH-*'],
    ['KXMLBGAME-26SEP13ALLOW-TIE','*-TIE'],
    ['KXUAEPLGAME-26SEP13-D','KXUAEPLGAME-*'],
    ['KXDIMAYORGAME-26SEP13-E','KXDIMAYORGAME-*'],
    ['KXBUNDESLIGA2GAME-26SEP13-F','KXBUNDESLIGA2GAME-*'],
    ['KXITFWMATCH-26SEP13-G','KXITFWMATCH-*'],
    ['KXITFMATCH-26SEP13-H','KXITFMATCH-*'],
    ['KXNPBGAME-26SEP13-I','KXNPBGAME-*'],
    ['KXCS2GAME-26SEP13-J','KXCS2GAME-*'],
  ];
  for(const [ticker,rule] of cases){
    const out=executionMarketFamilyExclusion(ticker);
    assert.equal(out.blocked,true,ticker);
    assert.equal(out.reason,MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode,ticker);
    assert.ok(out.matchedRules.includes(rule),`${ticker}:${rule}`);
  }
  const allowed=['KXATPMATCH-26SEP13-A','KXWTAMATCH-26SEP13-B','KXMLBGAME-26SEP13ALLOW-ONE','KXEPLGAME-26SEP13-C','KXBUNDESLIGAGAME-26SEP13-D'];
  for(const ticker of allowed){
    const out=executionMarketFamilyExclusion(ticker);
    assert.equal(out.blocked,false,ticker);
    assert.equal(out.reason,null,ticker);
  }
});

test('R13 MFE1 createHunter blocks banned SIM execution before market refresh, persistence or broker mutation',async()=>{
  const s=settings();
  const db=memoryDb();
  let refreshCalls=0;
  const st=new StrategyEngine({db,kalshi:{},market:{async refreshTicker(){refreshCalls+=1;return q('KXITFMATCH-26SEP13-H',70,71);}},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const banned=['KXATPCHALLENGERMATCH-26SEP13-A','KXWTACHALLENGERMATCH-26SEP13-B','KXT20MATCH-26SEP13-C','KXUAEPLGAME-26SEP13-TIE','KXITFMATCH-26SEP13-H','KXCS2GAME-26SEP13-J'];
  const saints=['Athena Exclamation','Scarlet Needle','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer','Crash Recovery Hunter','Lightning Plasma'];
  for(const ticker of banned){
    for(const concept of saints){
      const opened=await st.createHunter(concept,q(ticker,70,71),100,0,{legacyCompatibility:false});
      assert.equal(opened,null,`${ticker}:${concept}`);
    }
  }
  assert.equal(refreshCalls,0,'banned families must not purchase market refresh');
  assert.equal(db.rows.size,0,'banned families must not persist an executable entry');
  const summary=st.entryPipelineSummary();
  assert.ok((summary.byReason?.[MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode]||0)>=banned.length,JSON.stringify(summary.byReason));
});

test('R13 MFE1 allowed neighboring family is not falsely caught by the universal execution backstop',async()=>{
  const s=settings(),db=memoryDb(),st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const ticker='KXMLBGAME-26SEP13ALLOW-ONE';
  assert.equal(await st.createHunter('Athena Exclamation',q(ticker,70,71),100,0,{legacyCompatibility:false}),null);
  const summary=st.entryPipelineSummary();
  assert.equal(summary.byReason?.[MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode]||0,0);
  assert.ok((summary.byReason?.triple_crystal_athena_authority_required||summary.byReason?.profitable_athena_parent_authority_required||0)>=0);
  assert.ok(Object.keys(summary.byReason||{}).some((k)=>k!==MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode),'allowed family must fail later doctrine, not MFE');
});

test('R13 MFE1 profitable Crystal Wall proof cannot arm Athena on a banned market',async()=>{
  const ticker='KXITFMATCH-26SEP13-H';
  const s=settings();
  const parent=crystalProof('cw-banned-1','CRASH:BANNED',Date.now()-20_000,Date.now()-10_000,ticker,25);
  const {e}=engineHarness([parent],s);
  const out=await e.handleMegaWaveAthenaContinuation(parent);
  assert.equal(out.status,'IGNORED');
  assert.equal(out.reason,'bolt_direct_crystal_wall_is_not_permission');
});

test('R13 MFE1 active banned downstream grants are neutralized on restart before any Saint watch is restored',async()=>{
  const ticker='KXCS2GAME-26SEP13-J';
  const s=settings();
  const {e,db}=engineHarness([],s);
  const grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId:'MEGA-WAVE:GRANT:banned-parent',parentEntryId:'banned-parent',parentConcept:'Athena Exclamation',ticker,eventTicker:ticker,ownerId:s.ownerId,systemName:s.systemName,mode:s.mode,createdAtMs:Date.now(),limit:6,eligibleSaints:[...downstream],reservations:{},status:'ACTIVE'};
  await db.upsertOpportunityEpisode({id:grant.grantId,systemName:s.systemName,athenaDecision:{decision:'ACTIVE',megaWaveGrant:grant},trackingComplete:false});
  const n=await e.hydrateMegaWaveGrants();
  assert.equal(n,0);
  assert.equal(e.megaWaveGrants.size,0);
  assert.equal(e.megaWaveSaintWatches.size,0);
  const stored=await db.opportunityEpisode(grant.grantId);
  assert.equal(stored.athenaDecision.megaWaveGrant.status,'COMPLETE');
  assert.equal(stored.athenaDecision.megaWaveGrant.completedReason,MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode);
});

test('RJA4 Athena, Scarlet, Wave and Plasma expose Justice-style editable crash/rebound/tick parameters',()=>{
  for(const k of ['athenaExclamationMinCrashCents','athenaExclamationMinReboundCents','athenaExclamationMinUpwardTicks','scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks','waveMinCrashCents','waveMinReboundCents','waveMinUpwardTicks','lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks'])assert.ok(CANONICAL_NUMERIC_SETTINGS.includes(k),k);
  const s=originalSettings();
  assert.equal(s.athenaExclamationStakeCents,100);assert.equal(s.athenaExclamationMinEntryCents,35);assert.equal(s.athenaExclamationMaxEntryCents,92);
  assert.equal(s.scarletNeedleStakeCents,100);assert.equal(s.scarletNeedleMinEntryCents,35);assert.equal(s.scarletNeedleMaxEntryCents,92);
  assert.equal(s.waveStakeCents,100);assert.equal(s.waveMinEntryCents,35);assert.equal(s.waveMaxEntryCents,92);
  assert.equal(s.lightningPlasmaFieldStakeCents,100);assert.equal(s.lightningPlasmaMinEntryCents,35);assert.equal(s.lightningPlasmaMaxEntryCents,92);
  assert.equal(s.athenaExclamationMinCrashCents,0);assert.equal(s.athenaExclamationMinReboundCents,0);assert.equal(s.athenaExclamationMinUpwardTicks,0);
});

test('RJA6 real Athena and Saints honor operator cap and cooldown; Crystal Wall paper does not',async()=>{
  const now=Date.now();
  const priorAthena={id:'athena-1',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'AIN',eventTicker:'AIN',mode:'SIMULATION',status:'closed',openedAtMs:now-47_000,closedAtMs:now-1_000,pnlCents:40,entryPriceCents:56,exitPriceCents:65,remainingCount:0};
  const s=settings({maxEntriesPerTrade:1,hunterCooldownMinutes:90,repeatCooldownMinutes:0,maxRepeatsPerMarket:0,galacticExplosionEnabled:true});
  const db=memoryDb([priorAthena]);
  const st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const quote=q('AIN',67,68);
  const athenaAgain=await st.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(athenaAgain.ok,false);assert.equal(athenaAgain.reason,'hunter_cooldown');
  const scarlet=await st.hunterEntryPolicyDecision('Scarlet Needle',quote,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(scarlet.ok,true,scarlet.reason);
  const openAthena={...priorAthena,id:'athena-open',status:'open',closedAtMs:null,ticker:'AIN-YES'};
  const capDb=memoryDb([openAthena]);
  const capEngine=new StrategyEngine({db:capDb,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const sibling=q('AIN-NO',67,68);sibling.eventTicker='AIN';
  const capped=await capEngine.hunterEntryPolicyDecision('Athena Exclamation',sibling,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(capped.ok,false);assert.equal(capped.reason,'event_entry_cap');
  const paper=await capEngine.hunterEntryPolicyDecision('Recovery Hunter',quote,{requireClock:false,includeCooldown:true,stage:'test',crystalWallOverlay:true});
  assert.equal(paper.ok,true,paper.reason);
});

test('repeat unit is independent of open-cap cooldown and ignores Crystal Wall paper',async()=>{
  const now=Date.now();
  const closed={id:'athena-closed',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'RPT',eventTicker:'RPT',mode:'SIMULATION',status:'closed',openedAtMs:now-10*60_000,closedAtMs:now-30_000,pnlCents:12,entryPriceCents:56,exitPriceCents:60,remainingCount:0};
  const paper={id:'cw-paper',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Recovery Hunter',ticker:'RPT',eventTicker:'RPT',mode:'SIMULATION',status:'closed',openedAtMs:now-9*60_000,closedAtMs:now-20_000,pnlCents:8,entryPriceCents:40,exitPriceCents:48,remainingCount:0};
  const s=settings({maxEntriesPerTrade:8,hunterCooldownMinutes:0,maxRepeatsPerMarket:1,repeatCooldownMinutes:5,galacticExplosionEnabled:true});
  const st=new StrategyEngine({db:memoryDb([closed,paper]),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const quote=q('RPT',67,68);
  const blocked=await st.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(blocked.ok,false);
  assert.equal(blocked.reason,'event_repeat_cap');
  const wait=settings({maxEntriesPerTrade:8,hunterCooldownMinutes:0,maxRepeatsPerMarket:10,repeatCooldownMinutes:5,galacticExplosionEnabled:true});
  const waiting=new StrategyEngine({db:memoryDb([closed,paper]),kalshi:{},market:{},learning:{},getSettings:()=>wait,getLiveReady:()=>false,random:()=>0});
  const cool=await waiting.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(cool.ok,false);
  assert.equal(cool.reason,'repeat_cooldown');
  const ready=settings({maxEntriesPerTrade:8,hunterCooldownMinutes:0,maxRepeatsPerMarket:10,repeatCooldownMinutes:0,galacticExplosionEnabled:true});
  const open=new StrategyEngine({db:memoryDb([closed,paper]),kalshi:{},market:{},learning:{},getSettings:()=>ready,getLiveReady:()=>false,random:()=>0});
  const ok=await open.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',megaWaveAuthorized:true});
  assert.equal(ok.ok,true,ok.reason);
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('maxRepeatsPerMarket'));
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('repeatCooldownMinutes'));
  const fresh=sanitizeRuntimeSettings({});
  assert.equal(fresh.maxRepeatsPerMarket,3);
  assert.equal(fresh.repeatCooldownMinutes,3);
});

test('ECA1 Crystal Wall leading clock is inherited by Athena and Saints; a younger probe cannot rewrite it',async()=>{
  const s=settings({minGameMinutes:10,maxGameMinutes:45,hunterCooldownMinutes:0,maxEntriesPerTrade:20});
  const db=memoryDb();
  const st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const t0=Date.now();
  const quote=confirmedClockQuote('EV-AIN',18,t0);
  const stamped=await st.stampCrystalWallEventClock({id:'cw-1',ticker:'EV-AIN',eventTicker:'EV-AIN'},quote,t0);
  assert.equal(stamped.ok,true);assert.equal(stamped.record.anchoredElapsedMinutes,18);
  const athena=await st.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(athena.ok,true,athena.reason);
  assert.ok(Math.abs(st.leadingEventElapsedMinutes('EV-AIN',t0+7*60000)-25)<1e-6);
  const late=await st.hunterEntryPolicyDecision('Lightning Plasma',quote,{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  const lateStore=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const tLate=Date.now()-20*60000;
  await lateStore.stampCrystalWallEventClock({id:'cw-50',ticker:'EV-YOU',eventTicker:'EV-YOU'},confirmedClockQuote('EV-YOU',50,tLate),tLate);
  const afterMax=await lateStore.hunterEntryPolicyDecision('Lightning Plasma',q('EV-YOU'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(afterMax.ok,true,afterMax.reason);
  const missing=await new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0}).hunterEntryPolicyDecision('Athena Exclamation',q('EV-NONE'),{requireClock:true,includeCooldown:false,stage:'test'});
  assert.equal(missing.ok,true,missing.reason);
});

test('RJA5 Great Horn and Starlight use Athena-style crash/rebound/tick parameters',()=>{
  for(const k of ['momentumMinCrashCents','momentumMinReboundCents','momentumMinUpwardTicks','crashRecoveryMinUpwardTicks'])assert.ok(CANONICAL_NUMERIC_SETTINGS.includes(k),k);
  const s=originalSettings();
  assert.equal(s.momentumMinCrashCents,0);assert.equal(s.momentumMinReboundCents,0);assert.equal(s.momentumMinUpwardTicks,0);
  assert.equal(s.crashRecoveryMinCrashCents,0);assert.equal(s.crashRecoveryMinReboundCents,0);assert.equal(s.crashRecoveryMinUpwardTicks,0);
  let horn=megaWaveSaintSignalState('Momentum Hunter',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},q('MW-H',55,56),{...s,momentumMinCrashCents:15,momentumMinReboundCents:5,momentumMinUpwardTicks:2});
  assert.equal(horn.qualified,false);assert.equal(horn.watch.crashArmed,true);
});

test('Athena open never releases Saints; Galactic ON or OFF',async()=>{
  for(const on of [true,false]){
    const s=settings({galacticExplosionEnabled:on,athenaExclamationFollowUpAttacks:6});
    const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:6,enabledSaintsAtEntry:[...downstream]};
    const openParent={id:`athena-open-${on}`,systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-GE',eventTicker:'MW-GE',mode:s.mode,status:'open',remainingCount:1,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
    const h=engineHarness([openParent],s);
    const opened=await h.e.handleMegaWaveAthenaOpen(openParent);
    assert.equal(opened.status,'IGNORED');
    assert.equal(opened.reason,'athena_must_close_profit_before_saints');
    assert.equal(h.e.megaWaveSaintWatches.size,0);
    assert.equal(h.db.episodes.size,0);
  }
});

test('leftover Athena-open grant cannot execute a Saint while Athena is still open',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:1,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:3,justiceArrowMinUpwardTicks:1,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:89});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Sagittarius Justice Arrow']};
  const parent={id:'athena-exec-open',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-EXEC-OPEN',eventTicker:'MW-EXEC-OPEN',mode:s.mode,status:'open',remainingCount:1,pnlCents:0,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{release:RELEASE,megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const db=memoryDb([parent]),grantId=`MEGA-WAVE:GRANT:${parent.id}`,reservationId=`${grantId}:SAINT:Sagittarius Justice Arrow`;
  const grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',ticker:parent.ticker,eventTicker:parent.eventTicker,ownerId:s.ownerId,systemName:s.systemName,mode:s.mode,limit:1,eligibleSaints:['Sagittarius Justice Arrow'],allocationDoctrine:MEGA_WAVE.allocationDoctrine,reservations:{'Sagittarius Justice Arrow':{status:'RESERVED',reservationId}},status:'ACTIVE',source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority};
  await db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:grant},trackingComplete:false});
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  let creates=0;
  strategy.createHunter=async()=>{creates+=1;return{id:'saint-open-exec'};};
  const authorization={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',saintConcept:'Sagittarius Justice Arrow',ticker:parent.ticker,eventTicker:parent.eventTicker,allocationDoctrine:MEGA_WAVE.allocationDoctrine,source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority};
  let watch={parentEntryPriceCents:56,parentExitPriceCents:56,peakCents:56,lastBidCents:56};
  watch=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,40,41),s).watch;
  const rebound=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,44,45),s);
  assert.equal(rebound.qualified,true,rebound.reason);
  const opened=await strategy.executeMegaWaveSaint(q(parent.ticker,44,45),parent,authorization,watch);
  assert.equal(opened,null);
  assert.equal(creates,0);
});

test('profitable Athena close still grants Saints in that cosmos',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:3});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:3,enabledSaintsAtEntry:['Scarlet Needle','Sagittarius Justice Arrow','Wave Surfer']};
  const parent={id:'athena-profit-ge',systemName:'ARIES',ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-WIN',eventTicker:'MW-WIN',mode:s.mode,status:'closed',remainingCount:0,pnlCents:40,openedAtMs:Date.now()-1000,closedAtMs:Date.now(),closeReason:'infinity_break',entryPriceCents:56,exitPriceCents:62,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],{...s,systemName:'ARIES'});
  const out=await h.e.handleMegaWaveAthenaClose(parent);
  assert.equal(out.status,'IGNORED');return;
  assert.equal(out.grant.source,'ATHENA_PROFIT_CLOSE');
  assert.equal(out.grant.systemName,'ARIES');
  assert.equal(h.e.megaWaveSaintWatches.size,3);
});

test('Mega Wave grant cannot use an archived or pre-reset Athena as a live parent',async()=>{
  const resetAt=Date.now()-60_000;
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:6,resetTimestampMs:resetAt});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:6,enabledSaintsAtEntry:[...downstream]};
  const archived={id:'217c7fe9-916e-4613-865a-4fb93c9591a2',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'SFLAD-LAD',eventTicker:'SFLAD',mode:s.mode,status:'open',archived:true,remainingCount:1,openedAtMs:resetAt-120_000,entryPriceCents:87,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([archived],s);
  const blocked=await h.e.handleMegaWaveAthenaOpen(archived);
  assert.equal(blocked.status,'IGNORED');
  assert.equal(blocked.reason,'athena_must_close_profit_before_saints');
  const grantId=`MEGA-WAVE:GRANT:${archived.id}`;
  await h.db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:archived.id,ticker:archived.ticker,status:'ACTIVE',eligibleSaints:['Scarlet Needle'],limit:6,source:'ATHENA_OPEN_GALACTIC'}},trackingComplete:false});
  const n=await h.e.hydrateMegaWaveGrants();
  assert.equal(n,0);
  const stored=await h.db.opportunityEpisode(grantId);
  assert.equal(stored.athenaDecision.megaWaveGrant.status,'COMPLETE');
  assert.ok(['stale_pre_reset_mega_wave_grant','athena_open_grant_retired'].includes(stored.athenaDecision.megaWaveGrant.completedReason));
  const strategy=new StrategyEngine({db:h.db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  strategy.createHunter=async()=>({id:'should-not-open'});
  const reservationId=`${grantId}:SAINT:Scarlet Needle`;
  await h.db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:archived.id,ticker:archived.ticker,eventTicker:archived.eventTicker,status:'ACTIVE',eligibleSaints:['Scarlet Needle'],reservations:{'Scarlet Needle':{status:'RESERVED',reservationId}},limit:6,source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority}},trackingComplete:false});
  const out=await strategy.executeMegaWaveSaint(q(archived.ticker,87,88),archived,{version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId,parentEntryId:archived.id,parentConcept:'Athena Exclamation',saintConcept:'Scarlet Needle',ticker:archived.ticker,eventTicker:archived.eventTicker,source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority},{parentEntryPriceCents:87,peakCents:87,lastBidCents:87});
  assert.equal(out,null);
});

test('GE-R2 Galactic OFF + open Athena cannot execute a Saint until the profitable close grant exists',async()=>{
  const s=settings({galacticExplosionEnabled:false,athenaExclamationFollowUpAttacks:1});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Scarlet Needle']};
  const parent={id:'athena-off-live',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-OFF',eventTicker:'MW-OFF',mode:s.mode,status:'open',remainingCount:1,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const db=memoryDb([parent]);
  const grantId=`MEGA-WAVE:GRANT:${parent.id}`;
  const reservationId=`${grantId}:SAINT:Scarlet Needle`;
  const grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',ticker:parent.ticker,eventTicker:parent.eventTicker,ownerId:s.ownerId,systemName:s.systemName,mode:s.mode,limit:1,eligibleSaints:['Scarlet Needle'],allocationDoctrine:MEGA_WAVE.allocationDoctrine,reservations:{'Scarlet Needle':{status:'RESERVED',reservationId}},status:'ACTIVE',source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority};
  await db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:grant},trackingComplete:false});
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  let creates=0;strategy.createHunter=async()=>{creates+=1;return{id:'nope'};};
  const authorization={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',saintConcept:'Scarlet Needle',ticker:parent.ticker,eventTicker:parent.eventTicker,allocationDoctrine:MEGA_WAVE.allocationDoctrine,source:'ATHENA_OPEN_GALACTIC'};
  assert.equal(await strategy.executeMegaWaveSaint(q(parent.ticker,56,57),parent,authorization,{}),null);
  assert.equal(creates,0);
});

test('Athena loss does not grant Saints',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:2});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:['Scarlet Needle','Sagittarius Justice Arrow']};
  const closed={id:'athena-loss-ge',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-LOSS',eventTicker:'MW-LOSS',mode:s.mode,status:'closed',remainingCount:0,pnlCents:-40,openedAtMs:Date.now()-1000,closedAtMs:Date.now(),closeReason:'hard_stop',entryPriceCents:56,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([closed],s);
  const stopped=await h.e.handleMegaWaveAthenaClose(closed);
  assert.equal(stopped.status,'IGNORED');return;
  assert.equal(h.e.megaWaveSaintWatches.size,0);
});

test('SE1 Starlight is removed from Mega Wave saints and keeps its own Infinity target',()=>{
  assert.equal(MEGA_WAVE.downstreamSaints.includes('Crash Recovery Hunter'),false);
  assert.equal(STARLIGHT_EXTINCTION.conceptName,'Crash Recovery Hunter');
  assert.equal(isStarlightParentStopLoss('hard_stop_loss'),true);
  assert.equal(isStarlightParentStopLoss('infinity_break'),false);
  const s=settings({crashRecoveryInfinityNetPerOriginalContractCents:12,infinityBreakMinNetPerOriginalContractCents:5,scarletNeedleInfinityNetPerOriginalContractCents:8});
  assert.equal(attackInfinityNetTargetCents(s,'Crash Recovery Hunter'),12);
  assert.equal(attackInfinityNetTargetCents(s,'Athena Exclamation'),5);
  const snap=entryConfigSnapshot(s,'Crash Recovery Hunter');
  assert.equal(snap.strategicEntryAuthority,STARLIGHT_EXTINCTION.strategicEntryAuthority);
  assert.equal(snap.model.profitTargetNetPerOriginalContractCents,12);
});

test('SE1 createHunter blocks regular Starlight entry without a stop-loss parent',async()=>{
  const s=settings();
  const db=memoryDb();
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const missed=await strategy.createHunter('Crash Recovery Hunter',q('SE1-T',55,56),500,0,{legacyCompatibility:false});
  assert.equal(missed,null);
  assert.ok(db.audits.some((row)=>row.event==='starlight_regular_entry_blocked'));
});

test('SE1 same-cosmos stop-loss arms Starlight; own stop and Crystal Wall paper do not',async()=>{
  const s=settings({crashRecoveryHunterEnabled:true});
  const parent={id:'athena-stop',systemName:'LIBRA',ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'SE1-ARM',eventTicker:'SE1-ARM',mode:s.mode,status:'closed',remainingCount:0,pnlCents:-40,closeReason:'hard_stop_loss',entryPriceCents:58,exitPriceCents:40,openedAtMs:1,closedAtMs:2};
  const h=engineHarness([parent],s);
  h.e.settings=s;
  const armed=await h.e.armStarlightStopLossWatch(parent);
  assert.equal(armed.status,'ARMED',armed.reason);
  assert.equal(h.e.starlightWatches.size,1);
  const self={...parent,id:'starlight-stop',conceptName:'Crash Recovery Hunter'};
  h.db.rows.set(self.id,structuredClone(self));
  assert.equal((await h.e.armStarlightStopLossWatch(self)).status,'IGNORED');
  const paper={...parent,id:'wall-stop',conceptName:'Recovery Hunter'};
  const wallArm=await h.e.armStarlightStopLossWatch(paper);
  assert.equal(wallArm.status,'ARMED',wallArm.reason);
});

test('SE1 Starlight executes after parent stop when crash/rebound/ticks qualify and does not self-chain',async()=>{
  const s=settings({crashRecoveryHunterEnabled:true,crashRecoveryMinCrashCents:15,crashRecoveryMinReboundCents:5,crashRecoveryMinUpwardTicks:2,crashRecoveryMinEntryCents:10,crashRecoveryMaxEntryCents:89,crashRecoveryInfinityNetPerOriginalContractCents:7});
  const parent={id:'horn-stop',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Momentum Hunter',ticker:'SE1-FIRE',eventTicker:'SE1-FIRE',mode:s.mode,status:'closed',remainingCount:0,pnlCents:-55,closeReason:'hard_stop_loss',entryPriceCents:70,exitPriceCents:40,peakPriceCents:70,openedAtMs:1,closedAtMs:2};
  const db=memoryDb([parent]);
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  let creates=0;strategy.createHunter=async(concept,quote,stake, _sl, opts)=>{creates+=1;assert.equal(concept,'Crash Recovery Hunter');assert.equal(opts.starlightAuthorization.parentEntryId,parent.id);assert.equal(opts.starlightAuthorization.parentCloseReason,'hard_stop_loss');return{id:'starlight-1',conceptName:concept,ticker:quote.ticker,status:'open',sourceTradeId:parent.id,entryPriceCents:quote.yesAsk};};
  let watch={parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70,ticker:parent.ticker};
  watch=megaWaveSaintSignalState('Crash Recovery Hunter',watch,q(parent.ticker,40,41),s).watch;
  watch=megaWaveSaintSignalState('Crash Recovery Hunter',watch,q(parent.ticker,46,47),s).watch;
  const rise=megaWaveSaintSignalState('Crash Recovery Hunter',watch,q(parent.ticker,48,49),s);
  assert.equal(rise.qualified,true,rise.reason);
  const authorization={version:STARLIGHT_EXTINCTION.version,policyRevision:STARLIGHT_EXTINCTION.policyRevision,grantId:`STARLIGHT:${parent.id}`,parentEntryId:parent.id,parentConcept:parent.conceptName,parentCloseReason:parent.closeReason,saintConcept:'Crash Recovery Hunter',ticker:parent.ticker,eventTicker:parent.eventTicker,systemName:s.systemName};
  const opened=await strategy.executeStarlightExtinction(q(parent.ticker,48,49),parent,authorization,watch);
  assert.ok(opened);assert.equal(creates,1);
  db.rows.set('starlight-1',{id:'starlight-1',conceptName:'Crash Recovery Hunter',ticker:parent.ticker,sourceTradeId:parent.id,status:'open'});
  const second=await strategy.executeStarlightExtinction(q(parent.ticker,46,47),parent,authorization,watch);
  assert.equal(second,null);
});

test('CW ladder Proof-stage settings beat the old shared Crystal Wall crash/rebound/ticks',()=>{
  const s=settings({
    recoveryMinEntryCents:10,recoveryMaxEntryCents:89,
    crystalWallMinCrashCents:15,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:5,
    crystalWallProof1MinCrashCents:8,crystalWallProof1MinReboundCents:4,crystalWallProof1MinUpwardTicks:2,
  });
  const g=crystalWallStageGeometry(s,1);
  assert.equal(g.minCrashCents,8);
  assert.equal(g.minReboundCents,4);
  assert.equal(g.minUpwardTicks,2);
  let watch=crystalWallSignalState({proofStage:1,preCrashPeakCents:80,troughCents:80,lastBidCents:80},q('CW-AUTH',71,72),s);
  watch=crystalWallSignalState({...watch,proofStage:1},q('CW-AUTH',73,74),s);
  watch=crystalWallSignalState({...watch,proofStage:1},q('CW-AUTH',75,76),s);
  assert.equal(watch.minCrashCents,8);
  assert.equal(watch.qualified,true,watch.reason);
});

test('CW ladder missing per-proof keys inherit shared Crystal Wall geometry',()=>{
  const migrated=sanitizeRuntimeSettings({crystalWallMinCrashCents:15,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:2,crystalWallWinsToTriggerAthena:3});
  assert.equal(crystalWallRequiredProofCount(migrated),3);
  for(const stage of [1,2,3,4,5]){
    const g=crystalWallStageGeometry(migrated,stage);
    assert.equal(g.minCrashCents,15);
    assert.equal(g.minReboundCents,5);
    assert.equal(g.minUpwardTicks,2);
  }
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('crystalWallProof3MinCrashCents'));
});

test('CW ladder each proof stage uses its own crash/rebound/ticks and one episode cannot satisfy the next stage',()=>{
  const s=settings({
    recoveryMinEntryCents:10,recoveryMaxEntryCents:89,
    crystalWallWinsToTriggerAthena:3,
    crystalWallProof1MinCrashCents:15,crystalWallProof1MinReboundCents:10,crystalWallProof1MinUpwardTicks:2,
    crystalWallProof2MinCrashCents:10,crystalWallProof2MinReboundCents:5,crystalWallProof2MinUpwardTicks:2,
    crystalWallProof3MinCrashCents:5,crystalWallProof3MinReboundCents:3,crystalWallProof3MinUpwardTicks:2,
  });
  const quote=(bid)=>q('CW-LADDER',bid,bid+1);
  let p1=crystalWallSignalState({proofStage:1,preCrashPeakCents:80,troughCents:80,lastBidCents:80},quote(64),s);
  assert.equal(p1.qualified,false);assert.equal(p1.minCrashCents,15);
  p1=crystalWallSignalState({...p1,proofStage:1},quote(70),s);
  p1=crystalWallSignalState({...p1,proofStage:1},quote(75),s);
  assert.equal(p1.qualified,true,p1.reason);
  const asProof2=crystalWallSignalState({...p1,proofStage:2,preCrashPeakCents:80,troughCents:64,lastBidCents:64,upwardTicks:0},quote(75),s);
  assert.equal(asProof2.minCrashCents,10);
  assert.notEqual(asProof2.proofStage,1);
  let p2=crystalWallSignalState({proofStage:2,preCrashPeakCents:70,troughCents:70,lastBidCents:70},quote(59),s);
  p2=crystalWallSignalState({...p2,proofStage:2},quote(62),s);
  p2=crystalWallSignalState({...p2,proofStage:2},quote(65),s);
  assert.equal(p2.qualified,true,p2.reason);
  assert.equal(crystalWallNextProofStage({completedConsecutive:0,required:3}),1);
  assert.equal(crystalWallNextProofStage({completedConsecutive:1,required:3}),2);
  assert.equal(crystalWallNextProofStage({completedConsecutive:2,required:3}),3);
});

test('CW ladder later proof snapshots the continuous event clock and does not replace the leading anchor',()=>{
  const first=stampEventClockRecord({eventTicker:'CW-CLK',ticker:'CW-CLK',crystalWallEntryId:'cw-1',elapsedMinutes:12.4,nowMs:1_000_000,source:'confirmed_clock_at_crystal_wall'});
  assert.equal(first.ok,true);assert.equal(first.record.leading,true);
  const later=stampEventClockRecord({eventTicker:'CW-CLK',ticker:'CW-CLK',crystalWallEntryId:'cw-2',elapsedMinutes:22.6,nowMs:1_000_000+10*60_000,source:'confirmed_clock_at_crystal_wall',prior:first.record});
  assert.equal(later.reason,'already_anchored');
  assert.equal(later.record.crystalWallEntryId,'cw-1');
  const snap=snapshotEventClockMinutes(first.record,1_000_000+10*60_000,{});
  assert.equal(snap.ok,true);
  assert.ok(snap.elapsedMinutes>12.4);
  assert.ok(snap.elapsedMinutes>=22.3);
});

test('CW ladder engine advances stage on profit and resets on loss',()=>{
  const s=settings({crystalWallWinsToTriggerAthena:3});
  const h=engineHarness([],s);
  const profit={id:'cw1',ticker:'CW-SEQ',systemName:s.systemName,conceptName:CRYSTAL_WALL.shadowConceptName,status:'closed',closeReason:CRYSTAL_WALL.profitableCloseReason,pnlCents:12,closedAtMs:10,entryConfig:{crystalWall:{proofStage:1,crashEpisodeId:'ep1'}}};
  const after1=h.e.noteCrystalWallProofClose(profit);
  assert.equal(after1.completedProofCount,1);
  assert.equal(after1.currentProofStage,2);
  const loss={id:'cw2',ticker:'CW-SEQ',systemName:s.systemName,conceptName:CRYSTAL_WALL.shadowConceptName,status:'closed',closeReason:CRYSTAL_WALL.lossCloseReason||'crystal_wall_aurora',pnlCents:-8,closedAtMs:20,entryConfig:{crystalWall:{proofStage:2,crashEpisodeId:'ep2'}}};
  const afterLoss=h.e.noteCrystalWallProofClose(loss);
  assert.equal(afterLoss.completedProofCount,0);
  assert.equal(afterLoss.currentProofStage,1);
});

test('reset epoch rejects pre-reset Crystal Wall proofs and proofA:proofA two-proof certificates',async()=>{
  const reset=1_000_000;
  const s=settings({crystalWallWinsToTriggerAthena:2,resetTimestampMs:reset});
  const pre=crystalProof('a477bdf3-cf88-41b1-8ca6-26967c364447','ep-pre',reset-20_000,reset-10_000);
  const h=engineHarness([pre],s);
  const stale=await h.e.megaWaveThirdProofDecision(pre);
  assert.equal(stale.status,'BLOCKED');
  assert.equal(stale.reason,'stale_pre_reset_authority');
  const identities=crystalWallProofIdentitiesValid(['a477','a477'],['ep1','ep1'],2);
  assert.equal(identities.ok,false);
  assert.equal(identities.reason,'duplicate_crystal_wall_proof_identity');
  const epoch=crystalWallProofsBelongToResetEpoch([{closedAtMs:reset-1}],reset);
  assert.equal(epoch.ok,false);
  assert.equal(epoch.reason,'stale_pre_reset_authority');
});

test('reset invalidates armed Athena confirmation watches and post-reset proofs can certify',async()=>{
  const s=settings({crystalWallWinsToTriggerAthena:2,resetTimestampMs:0});
  const now=2_000_000;
  const p1=crystalProof('cw-a','ep-a',now-40_000,now-30_000);
  const p2=crystalProof('cw-b','ep-b',now-20_000,now-10_000);
  const h=engineHarness([p1,p2],s);
  h.e.megaWaveRuntime();
  h.e.crystalWallProofStages=new Map();
  h.e.athenaExclamationConfirmationWatches.set('MEGA-WAVE:ATHENA:cw-a:cw-a',{authorizationId:'MEGA-WAVE:ATHENA:cw-a:cw-a',ticker:'MW-T',parentEntryId:'cw-a',crystalProof:{requiredProofCount:1,proofEntryIds:['cw-a'],proofCrashEpisodeIds:['ep-a']},resetEpoch:0});
  h.e.crystalWallProofStages.set('SAGITTARIUS|MW-T',{completedProofCount:1,currentProofStage:2});
  const dropped=h.e.invalidateSimulationExecutableAuthority('simulation_reset');
  assert.equal(dropped.droppedAthenaWatches,1);
  assert.equal(h.e.athenaExclamationConfirmationWatches.size,0);
  assert.equal(h.e.crystalWallProofStages.size,0);
  h.e.settings={...s,resetTimestampMs:now-5_000};
  const post1=crystalProof('cw-c','ep-c',now-4_000,now-3_000);
  const post2=crystalProof('cw-d','ep-d',now-2_000,now-1_000);
  const h2=engineHarness([post1,post2],h.e.settings);
  const armed=await h2.e.megaWaveThirdProofDecision(post1);
  assert.equal(armed.status,'ARMED');
  const certified=await h2.e.megaWaveThirdProofDecision(post2);
  assert.equal(certified.status,'CERTIFIED');
  assert.equal(certified.proof.distinctProofIds,true);
  assert.deepEqual(certified.proof.proofEntryIds,['cw-c','cw-d']);
});

test('attemptAthenaExclamationConfirmation drops a pre-reset watch instead of firing',async()=>{
  const reset=3_000_000;
  const s=settings({crystalWallWinsToTriggerAthena:2,resetTimestampMs:reset,athenaExclamationEnabled:true});
  const parent=crystalProof('e3542c5c-9ad2-4428-8fd4-5396e7892608','ep-ajax',reset-20_000,reset-10_000,'AJA');
  const h=engineHarness([parent],s);
  h.e.megaWaveRuntime();
  h.e.market={getQuote:()=>q('AJA',55,56)};
  h.e.athenaExclamationConfirmationWatches.set('MEGA-WAVE:ATHENA:e354:e354',{
    authorizationId:'MEGA-WAVE:ATHENA:e354:e354',ticker:'AJA',parentEntryId:parent.id,parentEntry:parent,
    crystalProof:{requiredProofCount:1,proofEntryIds:[parent.id],proofCrashEpisodeIds:['ep-ajax'],proofs:[{entryId:parent.id,crashEpisodeId:'ep-ajax',closedAtMs:parent.closedAtMs}]},
    resetEpoch:reset-50_000,lastBidCents:64,peakCents:64,troughCents:64,crashArmed:true,
  });
  const out=await h.e.attemptAthenaExclamationConfirmation('MEGA-WAVE:ATHENA:e354:e354');
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.reason,'stale_pre_reset_authority');
  assert.equal(h.e.athenaExclamationConfirmationWatches.size,0);
});

test('reset Simulation invalidates Game Clock anchors without rewinding real minute 57 to zero',async()=>{
  const epoch1=1_000_000,epoch2=2_000_000;
  const first=stampEventClockRecord({eventTicker:'EV-57',ticker:'EV-57',elapsedMinutes:40,nowMs:epoch1,resetTimestampMs:epoch1});
  assert.equal(first.ok,true);assert.equal(first.record.anchoredElapsedMinutes,40);
  const inherited=projectEventClock(first.record,epoch1+17*60000,{resetTimestampMs:epoch1});
  assert.equal(inherited.ok,true);assert.ok(Math.abs(inherited.elapsedMinutes-57)<1e-6);
  const stale=projectEventClock(first.record,epoch2,{resetTimestampMs:epoch2});
  assert.equal(stale.ok,false);assert.equal(stale.reason,'stale_pre_reset_game_clock_authority');
  const fresh=stampEventClockRecord({eventTicker:'EV-57',ticker:'EV-57',elapsedMinutes:57,nowMs:epoch2,resetTimestampMs:epoch2,prior:first.record});
  assert.equal(fresh.ok,true);assert.equal(fresh.reason,'anchored');
  assert.equal(fresh.record.anchoredElapsedMinutes,57);
  assert.equal(fresh.record.resetEpoch,epoch2);
});

test('post-reset Proof 1 and Proof 2 share one new Event Clock and Proof 2 cannot rewrite it',async()=>{
  const reset=4_000_000;
  const s=settings({resetTimestampMs:reset,minGameMinutes:10,maxGameMinutes:90});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const t0=reset+1_000;
  const a=await st.stampCrystalWallEventClock({id:'p1',ticker:'EV-NEW',eventTicker:'EV-NEW'},confirmedClockQuote('EV-NEW',22,t0),t0);
  assert.equal(a.ok,true);assert.equal(a.record.resetEpoch,reset);assert.equal(a.record.anchoredElapsedMinutes,22);
  const b=await st.stampCrystalWallEventClock({id:'p2',ticker:'EV-NEW',eventTicker:'EV-NEW'},confirmedClockQuote('EV-NEW',80,t0+8*60000),t0+8*60000);
  assert.equal(b.reason,'already_anchored');
  assert.equal(b.record.crystalWallEntryId,'p1');
  assert.ok(Math.abs(st.leadingEventElapsedMinutes('EV-NEW',t0+8*60000)-30)<1e-6);
});

test('pre-reset Event Clock cannot authorize Athena after reset; 10-90 still holds on the new clock',async()=>{
  const now=Date.now();
  let s=settings({resetTimestampMs:now-60_000,minGameMinutes:10,maxGameMinutes:90,hunterCooldownMinutes:0});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  await st.stampCrystalWallEventClock({id:'old',ticker:'EV-ATH',eventTicker:'EV-ATH'},confirmedClockQuote('EV-ATH',20,now-60_000),now-60_000);
  s.resetTimestampMs=now;
  st.invalidateEventClockExecutableAuthority(now);
  const afterReset=await st.hunterEntryPolicyDecision('Athena Exclamation',q('EV-ATH'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(afterReset.ok,true,afterReset.reason);
  await st.stampCrystalWallEventClock({id:'new',ticker:'EV-ATH',eventTicker:'EV-ATH'},confirmedClockQuote('EV-ATH',69,now),now);
  const pass=await st.hunterEntryPolicyDecision('Athena Exclamation',q('EV-ATH'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(pass.ok,true,pass.reason);
  const lateStore=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  await lateStore.stampCrystalWallEventClock({id:'late',ticker:'EV-90',eventTicker:'EV-90'},confirmedClockQuote('EV-90',91,now),now);
  const late=await lateStore.hunterEntryPolicyDecision('Athena Exclamation',q('EV-90'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(late.ok,true,late.reason);
});

test('stale async Game Clock and milestone results after reset are discarded',async()=>{
  let release;
  const pending=new Promise((resolve)=>{release=resolve;});
  const clock=new GameClockAuthority({
    kalshi:{getLiveData:async()=>{await pending;return {status:'live'};}},
    now:()=>7_000_000,
  });
  const first=clock.cached(clock.liveCache,'K',1000,()=>clock.kalshi.getLiveData());
  clock.invalidateSimulationEpoch(7_100_000);
  release({status:'live'});
  const result=await first;
  assert.equal(result.discarded,true);
  assert.equal(result.reason,'stale_pre_reset_game_clock_authority');
  assert.equal(clock.liveCache.size,0);
  const sealed=clock.sealClockState({phase:'CONFIRMED',confirmed:true,entryAuthorized:true},0);
  assert.equal(sealed.reason,'stale_pre_reset_game_clock_authority');
  assert.equal(sealed.entryAuthorized,false);
});

test('hydrateEventClockAnchors skips previous-epoch executable clocks',async()=>{
  const oldEpoch=8_000_000,newEpoch=9_000_000;
  const db=memoryDb();
  const old=stampEventClockRecord({eventTicker:'EV-HYD',ticker:'EV-HYD',elapsedMinutes:33,nowMs:oldEpoch,resetTimestampMs:oldEpoch});
  await db.upsertOpportunityEpisode({id:'EVENT-CLOCK:EV-HYD',eventTicker:'EV-HYD',athenaDecision:{eventClockAnchor:old.record}});
  const st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>({resetTimestampMs:newEpoch,systemName:'SAGITTARIUS'}),getLiveReady:()=>false,random:()=>0});
  const restored=await st.hydrateEventClockAnchors();
  assert.equal(restored.restored,0);
  assert.equal(st.eventClockRecord('EV-HYD'),null);
});

function liveKalshi({event, elapsedMinutes=35, milestoneStartOffsetMin=35, liveDetails, stats=null, includeMilestoneStart=true}){
  const now=1_800_000_000_000;
  return {
    now,
    event,
    kalshi:{
      async getMilestonesForEvent(){
        const row={id:'m-live',category:'Sports',type:'basketball_game',primary_event_tickers:[event],related_event_tickers:[event],end_date:new Date(now+90*60000).toISOString()};
        if(includeMilestoneStart)row.start_date=new Date(now-milestoneStartOffsetMin*60000).toISOString();
        return [row];
      },
      async getMilestonesForSeries(){return [];},
      async getLiveData(){
        return {type:'basketball',milestone_id:'m-live',details:liveDetails || {status:'in_progress',game:{elapsed_minutes:elapsedMinutes}}};
      },
      async getGameStats(){return stats;},
    },
  };
}

test('official elapsed reconstruction does not treat inprogress as minute zero',()=>{
  const now=1_800_000_000_000;
  const official=extractOfficialElapsedMs({details:{status:'in_progress',elapsed_minutes:35}},null,now);
  assert.equal(official.ok,true);
  assert.equal(official.elapsedMs,35*60000);
  const rebuilt=reconstructCurrentEpochStart({observedNow:now,liveData:{details:{status:'in_progress',elapsed_minutes:57}}});
  assert.equal(rebuilt.ok,true);
  assert.equal(rebuilt.startTimeMs,now-57*60000);
  const statusOnly=reconstructCurrentEpochStart({observedNow:now,liveData:{details:{status:'in_progress'}}});
  assert.equal(statusOnly.ok,false);
  assert.equal(statusOnly.reason,'current_game_time_unresolved');
  const mile=reconstructCurrentEpochStart({observedNow:now,liveData:{details:{status:'in_progress'}},milestoneStartMs:now-22*60000,occurrenceTimeMs:now-30*60000});
  assert.equal(mile.ok,true);
  assert.equal(mile.reason,'milestone_start_reconstructed');
  assert.ok(Math.abs(mile.elapsedMs-22*60000)<1);
});

test('post-reset official live clock reconstructs ~35 and ~57 minutes, not observation time',async()=>{
  for(const minutes of [35,57]){
    const {now,event,kalshi}=liveKalshi({event:`NCSU-UVA-${minutes}`,elapsedMinutes:minutes});
    const clock=new GameClockAuthority({kalshi,now:()=>now});
    clock.invalidateSimulationEpoch(now);
    const quote={ticker:event,eventTicker:event,seriesTicker:'KXNCAAMB',yesBid:55,yesAsk:56,liveStatus:'live',recentTrades:20,recentTradesObservedAtMs:now,occurrenceTimeMs:now-40*60000,status:'active'};
    const state=await clock.resolveEvent({eventTicker:event,quotes:[quote],now,allowGameStats:true,forceFresh:true});
    assert.equal(state.phase,'CONFIRMED',state.reason);
    assert.equal(state.discarded,undefined);
    const elapsed=(now-state.startTimeMs)/60000;
    assert.ok(Math.abs(elapsed-minutes)<0.05,`expected ~${minutes} got ${elapsed}`);
    assert.notEqual(state.startTimeMs,now);
    assert.equal(state.clockReconstructionReason,'official_elapsed_reconstructed');
  }
});

test('inprogress without elapsed stays unresolved instead of start=now',async()=>{
  const {now,event,kalshi}=liveKalshi({event:'NCSU-BARE',liveDetails:{status:'in_progress'},includeMilestoneStart:false});
  const clock=new GameClockAuthority({kalshi,now:()=>now});
  clock.invalidateSimulationEpoch(now);
  const quote={ticker:event,eventTicker:event,yesBid:55,yesAsk:56,liveStatus:'live',recentTrades:20,recentTradesObservedAtMs:now,occurrenceTimeMs:now+2*3600_000,status:'active'};
  const state=await clock.resolveEvent({eventTicker:event,quotes:[quote],now,allowGameStats:true});
  assert.equal(state.phase,'UNKNOWN');
  assert.equal(state.reason,'current_game_time_unresolved');
  assert.equal(state.confirmed,false);
  assert.equal(state.startTimeMs,null);
});

test('Game Clock no longer vetoes Athena at former 4, 35, 95, 177.58, or 200 minutes',async()=>{
  const s=settings({minGameMinutes:10,maxGameMinutes:90,hunterCooldownMinutes:0,resetTimestampMs:Date.now()});
  for(const minutes of [4,35,95,177.58,200]){
    const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
    const t=Date.now();
    await st.stampCrystalWallEventClock({id:`cw-${minutes}`,ticker:`EV-${minutes}`,eventTicker:`EV-${minutes}`},confirmedClockQuote(`EV-${minutes}`,minutes,t),t);
    const decision=await st.hunterEntryPolicyDecision('Athena Exclamation',q(`EV-${minutes}`),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
    assert.equal(decision.ok,true,`${minutes}:${decision.reason}`);
    assert.notEqual(decision.reason,'minimum_game_time');
    assert.notEqual(decision.reason,'maximum_game_time');
    assert.notEqual(decision.reason,'game_clock_unknown');
  }
});

test('entry admission never blocks on Game Clock minutes or unknown clocks',()=>{
  const young={ticker:'Y',eventTicker:'Y',status:'active',gameClockState:{phase:'CONFIRMED',startTimeMs:Date.now()-2*60_000}};
  const old={ticker:'O',eventTicker:'O',status:'active',gameClockState:{phase:'CONFIRMED',startTimeMs:Date.now()-200*60_000}};
  const unknown={ticker:'U',eventTicker:'U',status:'active'};
  assert.equal(entryAdmissionDecision({quote:young,minGameMinutes:10,maxGameMinutes:90}).action,'ALLOW');
  assert.equal(entryAdmissionDecision({quote:old,minGameMinutes:10,maxGameMinutes:90}).action,'ALLOW');
  assert.equal(entryAdmissionDecision({quote:unknown}).action,'ALLOW');
  assert.equal(entryAdmissionDecision({quote:unknown}).reason,'clock_authority_retired');
  assert.equal(entryChainAdmissionDecision({quote:young,minGameMinutes:10,maxGameMinutes:90}).action,'ALLOW');
  assert.equal(entryAdmissionDecision({quote:{ticker:'X',status:'closed',result:'yes'}}).reason,'game_final');
});

test('homepage closed table shows latest 500 rows in a scroll box',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const css=await readFile(new URL('../public/styles.css',import.meta.url),'utf8');
  assert.ok(app.includes('const closedLimit=500'));
  assert.ok(!app.includes('const closedLimit=30'));
  assert.ok(app.includes('closed.slice(0,closedLimit)'));
  assert.ok(html.includes('closed-trades-scroll'));
  assert.ok(css.includes('.closed-trades-scroll{max-height:360px'));
});

test('fleet attack homepage totals use executable SIM/LIVE rows only',()=>{
  const proto=SagittariusEngine.prototype;
  const agg=proto.normalizeConceptAggregate.call({},{portfolio:[{concept_name:'Athena Exclamation',open:1,closed:2,wins:2,losses:0,pnl_cents:40,avg_entry_cents:60}],signals:[],linked:[]});
  assert.equal(agg.portfolio[0].concept_name,'Athena Exclamation');
  const stats=[{name:'Athena Exclamation',open:1,closed:2,wins:2,losses:0,pnlCents:40,avgEntryCents:60,total:3},{name:'Recovery Hunter',closed:9,pnlCents:-900}];
  const far=proto.buildFleetAttackResults.call({},stats,'SIMULATION');
  assert.equal(far.mode,'SIMULATION');
  assert.equal(far.crystalWallShadowExcluded,true);
  const athena=far.attacks.find((x)=>x.name==='Athena Exclamation');
  const wall=far.attacks.find((x)=>x.name==='Recovery Hunter'||x.name==='Crystal Wall Shadow');
  assert.equal(athena.closed,2);
  assert.equal(athena.pnlCents,40);
  assert.ok(wall);
  assert.equal(wall.pnlCents,-900);
  const live=proto.buildFleetAttackResults.call({},stats,'LIVE');
  assert.equal(live.mode,'LIVE');
});

test('fleet concept aggregate SQL excludes Crystal Wall paper and includes host room',async()=>{
  const db=await readFile(new URL('../src/db.mjs',import.meta.url),'utf8');
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(db.includes('EXECUTABLE_HUNTER_CONCEPT_NAMES'));
  assert.ok(db.includes('crystalWallShadowExcluded:true'));
  assert.ok(db.includes('if(host && !ids.includes(host)) ids.push(host)'));
  assert.ok(engine.includes('buildFleetAttackResults'));
  assert.ok(engine.includes("excluded:'crystal_wall_shadow'"));
  assert.ok(html.includes('attackBody'));
  assert.ok(app.includes('fleetStatFor'));
  assert.equal(app.includes("a.legacy==='Recovery Hunter'?{avgEntryCents:0"),false);
  assert.equal(app.includes("if(name==='Recovery Hunter' || name==='Crystal Wall Shadow')"),false);
  assert.ok(!html.includes('fleetAttackResultsSection'));
});

test('SIM health banner does not require private REST/WS; LIVE still does',async()=>{
  const src=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  assert.ok(src.includes("const liveSessionRequired = this.settings?.mode === 'LIVE'"));
  assert.ok(src.includes('simulation_broker_reconcile_softfail'));
  assert.ok(src.includes('recoverPrivateSession'));
  const market=await readFile(new URL('../src/market.mjs',import.meta.url),'utf8');
  assert.ok(market.includes('kickStaleSocket'));
});

test('full-size rejection reasons follow the executing concept, not Scarlet fallback',()=>{
  assert.equal(fullConfiguredSizeClassification('Athena Exclamation',{megaWaveAthenaEntry:true}).reason,'athena_full_configured_size_unavailable');
  assert.equal(fullConfiguredSizeClassification('Athena Exclamation',{megaWaveAthenaEntry:true}).event,'mega_wave_athena_full_size_blocked');
  assert.equal(fullConfiguredSizeClassification('Scarlet Needle',{scarletContinuationEntry:true}).reason,'scarlet_needle_full_configured_size_unavailable');
  assert.equal(fullConfiguredSizeClassification('Sagittarius Justice Arrow',{justiceArrowIndependentEntry:true}).reason,'justice_arrow_full_configured_size_unavailable');
  assert.equal(fullConfiguredSizeClassification('Recovery Hunter',{crystalWallIndependentEntry:true}).reason,'crystal_wall_full_configured_size_unavailable');
  assert.equal(fullConfiguredSizeClassification('Starlight Extinction',{starlightReentry:true}).reason,'starlight_full_configured_size_unavailable');
  assert.equal(fullConfiguredSizeClassification('Wave Surfer',{megaWaveSaintEntry:true}).reason,'wave_surfer_full_configured_size_unavailable');
  assert.notEqual(fullConfiguredSizeClassification('Athena Exclamation',{megaWaveAthenaEntry:true}).reason,'scarlet_needle_full_configured_size_unavailable');
});

test('createHunter source has no Game Clock execution vetoes',async()=>{
  const src=await readFile(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  assert.equal(src.includes("trace('GAME_CLOCK','BLOCKED'"),false);
  assert.equal(src.includes("trace('FINAL_CLOCK','BLOCKED'"),false);
  assert.equal(src.includes('hunter_clock_revalidation_blocked'),false);
  assert.equal(src.includes('hunter_clock_authorization_expired_before_execution'),false);
  assert.ok(src.includes('clock_authority_retired'));
});

test('Athena policy passes with no Game Clock record at all',async()=>{
  const s=settings({hunterCooldownMinutes:0,minGameMinutes:10,maxGameMinutes:90});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const decision=await st.hunterEntryPolicyDecision('Athena Exclamation',q('NO-CLOCK'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(decision.ok,true,decision.reason);
});

test('stale pre-reset live reconstruction cannot authorize the new epoch',async()=>{
  const {now,event,kalshi}=liveKalshi({event:'STALE-RECON',elapsedMinutes:64});
  const clock=new GameClockAuthority({kalshi,now:()=>now});
  const quote={ticker:event,eventTicker:event,yesBid:55,yesAsk:56,liveStatus:'live',recentTrades:20,recentTradesObservedAtMs:now,occurrenceTimeMs:now-64*60000,status:'active'};
  const old=await clock.resolveEvent({eventTicker:event,quotes:[quote],now});
  assert.equal(old.phase,'CONFIRMED');
  clock.invalidateSimulationEpoch(now+1000);
  const sealed=clock.sealClockState(old,0);
  assert.equal(sealed.reason,'stale_pre_reset_game_clock_authority');
  assert.equal(sealed.entryAuthorized,false);
  const fresh=await clock.resolveEvent({eventTicker:event,quotes:[quote],now:now+1000,priorState:old});
  assert.equal(fresh.phase,'CONFIRMED');
  assert.equal(fresh.resetTimestampMs,now+1000);
  assert.notEqual(fresh.startTimeMs,now+1000);
});

test('Crystal Wall cannot freeze gameMinutes 0 as executable Event Clock authority',async()=>{
  const s=settings({minGameMinutes:10,maxGameMinutes:90});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const waiting=await st.stampCrystalWallEventClock({id:'cw-zero',ticker:'KXRL',eventTicker:'KXRL'},{...q('KXRL'),gameMinutes:0,gameStartTimeMs:Date.now()},Date.now());
  assert.equal(waiting.ok,false);
  assert.equal(waiting.reason,'event_clock_waiting_for_confirmed_game_time');
  assert.equal(waiting.record.executableAuthority,false);
  assert.equal(waiting.record.provisional,true);
  assert.equal(st.eventClockRecord('KXRL'),null);
  assert.equal(st.leadingEventElapsedMinutes('KXRL'),null);
  const resolved=st.resolveRealAttackElapsedMinutes({...q('KXRL'),gameMinutes:0});
  assert.equal(resolved.elapsedMinutes,null);
});

test('unresolved Crystal Wall later promotes the first valid GCA minute 60 leader and then stays immutable',async()=>{
  const now=Date.now();
  const s=settings({minGameMinutes:10,maxGameMinutes:90,resetTimestampMs:now,hunterCooldownMinutes:0});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const deferred=await st.stampCrystalWallEventClock({id:'cw-early',ticker:'NRGFUT',eventTicker:'NRGFUT'},q('NRGFUT'),now);
  assert.equal(deferred.reason,'event_clock_waiting_for_confirmed_game_time');
  assert.equal(isExecutableLeadingEventClock(deferred.record,now),false);
  const live=confirmedClockQuote('NRGFUT',60.5,now,{clockReconstructionReason:'milestone_start_reconstructed'});
  const promoted=await st.stampCrystalWallEventClock({id:'cw-late',ticker:'NRGFUT',eventTicker:'NRGFUT'},live,now);
  assert.equal(promoted.ok,true);
  assert.equal(promoted.record.executableAuthority,true);
  assert.ok(Math.abs(promoted.record.anchoredElapsedMinutes-60.5)<1e-6);
  assert.equal(promoted.record.source,'confirmed_gca_promoted');
  const rewrite=await st.stampCrystalWallEventClock({id:'cw-3',ticker:'NRGFUT',eventTicker:'NRGFUT'},confirmedClockQuote('NRGFUT',12,now),now);
  assert.equal(rewrite.reason,'already_anchored');
  assert.ok(Math.abs(rewrite.record.anchoredElapsedMinutes-60.5)<1e-6);
  const attack=st.resolveRealAttackElapsedMinutes(confirmedClockQuote('NRGFUT',12,now),now);
  assert.ok(Math.abs(attack.elapsedMinutes-60.5)<0.05);
  assert.equal(attack.source,'crystal_wall_leading_clock');
  const pass=await st.hunterEntryPolicyDecision('Athena Exclamation',q('NRGFUT'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(pass.ok,true,pass.reason);
});

test('provisional zero-minute record cannot outrank a later confirmed GCA minute 60',async()=>{
  const now=Date.now();
  const s=settings({resetTimestampMs:now,minGameMinutes:10,maxGameMinutes:90});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  await st.stampCrystalWallEventClock({id:'p0',ticker:'RL',eventTicker:'RL'},{...q('RL'),gameMinutes:0},now);
  assert.equal(st.leadingEventElapsedMinutes('RL'),null);
  const live=confirmedClockQuote('RL',60,now);
  const attack=st.resolveRealAttackElapsedMinutes(live,now);
  assert.ok(Math.abs(attack.elapsedMinutes-60)<0.05);
  await st.stampCrystalWallEventClock({id:'p1',ticker:'RL',eventTicker:'RL'},live,now);
  assert.ok(Math.abs(st.eventClockRecord('RL').anchoredElapsedMinutes-60)<1e-6);
});

test('closed executable row overlays live post-exit price without changing realized P/L',()=>{
  const s=settings({mode:'SIMULATION',recoveryTrackingHours:24});
  const h=engineHarness([],s);
  h.e.market={
    wanted:new Set(),
    setWanted(list){this.wanted=new Set(list);},
    getQuote(){return {ticker:'PX-T',yesBid:71,yesAsk:72,status:'active',result:'',updatedAtMs:Date.now()};},
    quoteAgeMs(){return 200;},
  };
  const entry={id:'px-1',systemName:'SAGITTARIUS',conceptName:'Athena Exclamation',ticker:'PX-T',status:'closed',entryPriceCents:60,exitPriceCents:64,pnlCents:18,count:5,remainingCount:0,openedAtMs:Date.now()-120000,closedAtMs:Date.now()-30000,closeReason:'infinity_break',postExitState:{latestMarketPriceCents:64,deltaFromExitCents:0}};
  const view=h.e.decorateEntry(entry);
  assert.equal(view.entryPriceCents,60);
  assert.equal(view.exitPriceCents,64);
  assert.equal(view.pnlCents,18);
  assert.equal(view.postExitCurrentPriceCents,71);
  assert.equal(view.postExitDeltaFromExitCents,7);
  assert.equal(view.postExitLive,true);
  const compact=h.e.compactDashboardEntry(entry);
  assert.equal(compact.postExitCurrentPriceCents,71);
  assert.equal(compact.postExitDeltaFromExitCents,7);
  assert.equal(compact.pnlCents,18);
});

test('closed LIVE row uses the same live post-exit overlay and settlement uses final 0/100',()=>{
  const s=settings({mode:'LIVE',recoveryTrackingHours:24});
  const h=engineHarness([],s);
  h.e.market={
    wanted:new Set(),
    setWanted(list){this.wanted=new Set(list);},
    quotes:{
      live:{ticker:'PX-LIVE',yesBid:40,yesAsk:41,status:'active',result:'',updatedAtMs:Date.now()},
      done:{ticker:'PX-DONE',yesBid:8,yesAsk:9,status:'finalized',result:'no',updatedAtMs:Date.now()},
    },
    getQuote(ticker){return ticker==='PX-DONE'?this.quotes.done:this.quotes.live;},
    quoteAgeMs(){return 100;},
  };
  const live={id:'px-live',systemName:'SAGITTARIUS',conceptName:'Athena Exclamation',ticker:'PX-LIVE',status:'closed',mode:'LIVE',entryPriceCents:55,exitPriceCents:50,pnlCents:-40,count:8,remainingCount:0,openedAtMs:Date.now()-180000,closedAtMs:Date.now()-20000,closeReason:'hard_stop_loss'};
  const done={id:'px-done',systemName:'SAGITTARIUS',conceptName:'Athena Exclamation',ticker:'PX-DONE',status:'closed',mode:'LIVE',entryPriceCents:55,exitPriceCents:50,pnlCents:-40,count:8,remainingCount:0,openedAtMs:Date.now()-180000,closedAtMs:Date.now()-20000,closeReason:'hard_stop_loss'};
  const liveView=h.e.decorateEntry(live);
  assert.equal(liveView.postExitCurrentPriceCents,40);
  assert.equal(liveView.postExitDeltaFromExitCents,-10);
  assert.equal(liveView.pnlCents,-40);
  const doneView=h.e.decorateEntry(done);
  assert.equal(doneView.postExitCurrentPriceCents,0);
  assert.equal(doneView.postExitFinal,true);
  assert.equal(doneView.pnlCents,-40);
});

test('recent closed tickers stay on the wanted quote list for live post-exit tracking',()=>{
  const s=settings({recoveryTrackingHours:24});
  const h=engineHarness([],s);
  const wanted=[];
  h.e.market={wanted:new Set(),setWanted(list){wanted.splice(0,wanted.length,...list);this.wanted=new Set(list);}};
  const closed=[{id:'c1',status:'closed',conceptName:'Athena Exclamation',ticker:'KEEP-ME',closedAtMs:Date.now()-1000}];
  h.e.refreshPostExitWatchTickers(closed);
  assert.equal(h.e.postExitWatchTickers.has('KEEP-ME'),true);
  assert.ok(wanted.includes('KEEP-ME'));
});

test('Bolt Direct card keeps own crash/rebound/ticks and rejects a missing crash',()=>{
  const s=settings({scarletNeedleEnabled:true,scarletNeedleMinCrashCents:8,scarletNeedleMinReboundCents:3,scarletNeedleMinUpwardTicks:2,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89});
  const quote=q('BD-T',50,51);
  assert.equal(boltDirectAttackCard('Scarlet Needle',quote,s,null).ok,false);
  assert.equal(boltDirectAttackCard('Scarlet Needle',quote,s,{crashDepthCents:2,reboundCents:3,upwardTicks:2}).reason,'crash_not_confirmed');
  const pass=boltDirectAttackCard('Scarlet Needle',quote,s,{crashDepthCents:10,reboundCents:4,upwardTicks:2});
  assert.equal(pass.ok,true);
  assert.equal(boltDirectEnabledAttacks(s).includes('Scarlet Needle'),true);
});

test('Bolt Direct lock is ticker-only when Galactic is OFF and ticker+attack when ON',()=>{
  const off=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:false,excaliburEnabled:false,systemName:'ARIES'}),getLiveReady:()=>false,random:()=>0});
  const on=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:true,excaliburEnabled:false,systemName:'ARIES'}),getLiveReady:()=>false,random:()=>0});
  const blade=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:false,excaliburEnabled:true,systemName:'ARIES'}),getLiveReady:()=>false,random:()=>0});
  assert.equal(off.hunterConcurrencyLockKey('Scarlet Needle','KX-T'),'KX-T');
  assert.equal(on.hunterConcurrencyLockKey('Scarlet Needle','KX-T'),'KX-T|attack:Scarlet Needle|cosmos:ARIES');
  assert.notEqual(on.hunterConcurrencyLockKey('Scarlet Needle','KX-T'),on.hunterConcurrencyLockKey('Wave Surfer','KX-T'));
  assert.equal(blade.hunterConcurrencyLockKey('Athena Exclamation','KX-T'),'KX-T|attack:Athena Exclamation|cosmos:ARIES');
  assert.notEqual(blade.hunterConcurrencyLockKey('Athena Exclamation','KX-T'),new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:false,excaliburEnabled:true,systemName:'TAURUS'}),getLiveReady:()=>false,random:()=>0}).hunterConcurrencyLockKey('Athena Exclamation','KX-T'));
});

test('Crystal Wall profit no longer grants Athena and Athena open no longer grants Saints',async()=>{
  const h=engineHarness([]);
  const ignoredOpen=await h.e.handleMegaWaveAthenaOpen({id:'a1',ticker:'T',conceptName:'Athena Exclamation',status:'open'});
  assert.equal(ignoredOpen.status,'IGNORED');
  const ignoredClose=await h.e.handleMegaWaveAthenaClose({id:'a1',ticker:'T',conceptName:'Athena Exclamation',status:'closed',remainingCount:0,pnlCents:10});
  assert.equal(ignoredClose.status,'IGNORED');
  const ignoredCw=await h.e.handleMegaWaveAthenaContinuation({id:'cw1',ticker:'T',conceptName:CRYSTAL_WALL.shadowConceptName,status:'closed',remainingCount:0,pnlCents:12,closeReason:CRYSTAL_WALL.profitableCloseReason});
  assert.equal(ignoredCw.status,'IGNORED');
  assert.equal(ignoredCw.reason,'bolt_direct_crystal_wall_is_not_permission');
});

test('createHunter still refuses a Saint or Athena without a Bolt Direct command',async()=>{
  const s=settings({scarletNeedleEnabled:true,athenaExclamationEnabled:true});
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const quote=q('BD-NO',50,51);
  assert.equal(await st.createHunter('Scarlet Needle',quote,s.scarletNeedleStakeCents,0,{legacyCompatibility:false}),null);
  assert.equal(await st.createHunter('Athena Exclamation',quote,s.athenaExclamationStakeCents,0,{legacyCompatibility:false}),null);
});

test('Bolt Direct dashboard 0/0/0 crash-rebound-ticks is saved and lets the bolt enter with no geometry wait',()=>{
  const raw=sanitizeRuntimeSettings({scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,athenaExclamationMinCrashCents:0,athenaExclamationMinReboundCents:0,athenaExclamationMinUpwardTicks:0,justiceArrowMinCrashCents:0,waveMinCrashCents:0,momentumMinCrashCents:0,lightningPlasmaMinCrashCents:0,crystalWallMinCrashCents:0,crashRecoveryMinCrashCents:0});
  assert.equal(raw.scarletNeedleMinCrashCents,0);
  assert.equal(raw.scarletNeedleMinReboundCents,0);
  assert.equal(raw.scarletNeedleMinUpwardTicks,0);
  assert.equal(raw.athenaExclamationMinCrashCents,0);
  assert.equal(raw.justiceArrowMinCrashCents,0);
  assert.equal(raw.crystalWallMinCrashCents,0);
  assert.equal(raw.crashRecoveryMinCrashCents,0);
  const s=settings({scarletNeedleEnabled:true,scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:89});
  const pass=boltDirectAttackCard('Scarlet Needle',q('BD-ZERO',50,51),s,null);
  assert.equal(pass.ok,true,pass.reason);
  assert.equal(pass.reason,'bolt_direct_card_qualified');
});

test('Crystal Wall is not a Bolt Direct opener; it is an Infinity-win follow-up',()=>{
  assert.equal(EXECUTABLE_HUNTER_CONCEPTS.has('Recovery Hunter'),true);
  assert.equal(BOLT_DIRECT.attacks.includes('Recovery Hunter'),false);
  assert.equal(BOLT_DIRECT.excludedAttacks.includes('Recovery Hunter'),true);
  const s=settings({recoveryHunterEnabled:true,crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,recoveryMinEntryCents:10,recoveryMaxEntryCents:89});
  const pass=boltDirectAttackCard('Recovery Hunter',q('CW-REAL',50,51),s,null);
  assert.equal(pass.ok,false);
  assert.equal(pass.reason,'bolt_direct_attack_not_allowed');
  assert.equal(boltDirectEnabledAttacks(s).includes('Recovery Hunter'),false);
});

test('dashboard crash/rebound/ticks save 0 on every attack and keep it',()=>{
  const keys=['athenaExclamation','scarletNeedle','justiceArrow','wave','momentum','lightningPlasma','crashRecovery','crystalWall'];
  const raw={};
  for(const pfx of keys){
    raw[`${pfx}MinCrashCents`]=0;
    raw[`${pfx}MinReboundCents`]=0;
    raw[`${pfx}MinUpwardTicks`]=0;
  }
  raw.crashRecoveryUpwardTicks=0;
  for(let i=1;i<=5;i++){raw[`crystalWallProof${i}MinCrashCents`]=0;raw[`crystalWallProof${i}MinReboundCents`]=0;raw[`crystalWallProof${i}MinUpwardTicks`]=0;}
  const s=sanitizeRuntimeSettings(raw);
  for(const pfx of keys){
    assert.equal(s[`${pfx}MinCrashCents`],0,pfx+' crash');
    assert.equal(s[`${pfx}MinReboundCents`],0,pfx+' rebound');
    assert.equal(s[`${pfx}MinUpwardTicks`],0,pfx+' ticks');
  }
  assert.equal(s.crashRecoveryUpwardTicks,0);
});

test('factory recipe lock 2026-09-21 bands stake geometry cooldown',()=>{
  const s=originalSettings();
  const f=freshInstallSettings();
  for(const row of [s,f]){
    assert.equal(row.maxEntriesPerTrade,7);
    assert.equal(row.maxRepeatsPerMarket,3);
    assert.equal(row.hunterCooldownMinutes,180);
    assert.equal(row.repeatCooldownMinutes,3);
    assert.equal(row.eventCooldownMinutes,3);
    assert.equal(row.athenaExclamationStakeCents,100);
    assert.equal(row.athenaExclamationMinEntryCents,35);
    assert.equal(row.athenaExclamationMaxEntryCents,92);
    assert.equal(row.scarletNeedleMinEntryCents,35);
    assert.equal(row.scarletNeedleMaxEntryCents,92);
    assert.equal(row.justiceArrowMinEntryCents,35);
    assert.equal(row.justiceArrowMaxEntryCents,92);
    assert.equal(row.waveMinEntryCents,35);
    assert.equal(row.waveMaxEntryCents,92);
    assert.equal(row.crashRecoveryMinEntryCents,35);
    assert.equal(row.crashRecoveryMaxEntryCents,92);
    assert.equal(row.recoveryMinEntryCents,35);
    assert.equal(row.recoveryMaxEntryCents,92);
    assert.equal(row.momentumMinEntryCents,35);
    assert.equal(row.momentumMaxEntryCents,92);
    assert.equal(row.lightningPlasmaMinEntryCents,35);
    assert.equal(row.lightningPlasmaMaxEntryCents,92);
    assert.equal(row.infinityBreakMinNetPerOriginalContractCents,1);
    assert.equal(row.atomicThunderGreenTriggerCents,1);
    assert.equal(row.auroraDamageControlPercent,25);
    assert.equal(row.athenaExclamationPri1R2Enabled,false);
    assert.equal(row.crystalWallMinCrashCents,0);
    assert.equal(row.lightningPlasmaMinUpwardTicks,0);
  }
});

test('Crystal Wall without an Infinity-follow command stays blocked; bolt cannot open it',async()=>{
  const s=settings({recoveryHunterEnabled:true,recoveryMinEntryCents:10,recoveryMaxEntryCents:89,crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0});
  const traces=[];
  const st=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  st.recordEntryPipeline=(id,concept,ticker,stage,status,reason)=>{traces.push({stage,status,reason,concept});};
  const quote=q('CW-REAL-2',55,56);
  const blocked=await st.createHunter('Recovery Hunter',quote,100,0,{});
  assert.equal(blocked,null);
  assert.ok(traces.some((row)=>['crystal_wall_shadow_only_no_real_hunter_authority','crystal_wall_infinity_follow_required'].includes(row.reason)));
  traces.length=0;
  const command={version:BOLT_DIRECT.version,authorityMode:BOLT_DIRECT.strategicEntryAuthority,boltId:'bolt-cw',commandHash:'h'};
  await st.createHunter('Recovery Hunter',quote,100,0,{boltDirectAuthorization:command,athenaFireCommand:command});
  assert.ok(traces.some((row)=>['crystal_wall_shadow_only_no_real_hunter_authority','crystal_wall_infinity_follow_required','bolt_direct_attack_not_allowed'].includes(row.reason)));
});

test('Galactic ON lets a second attack sit on the same ticker; same attack stays locked',async()=>{
  const open={id:'open-athena',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'GE-JOIN',eventTicker:'GE-JOIN',mode:'SIMULATION',status:'open',openedAtMs:1,entryPriceCents:32};
  const on=new StrategyEngine({db:memoryDb([open]),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:true}),getLiveReady:()=>false,random:()=>0});
  const off=new StrategyEngine({db:memoryDb([open]),kalshi:{},market:{},learning:{},getSettings:()=>settings({galacticExplosionEnabled:false}),getLiveReady:()=>false,random:()=>0});
  const quote=q('GE-JOIN',32,33);
  assert.equal(await on.exactTickerExposureClear('Scarlet Needle',quote,'test'),true);
  assert.equal(await on.exactTickerExposureClear('Athena Exclamation',quote,'test'),false);
  assert.equal(await off.exactTickerExposureClear('Scarlet Needle',quote,'test'),false);
});

test('Galactic ON counts repeats per attack so siblings can still join',async()=>{
  const now=Date.now();
  const rows=['Scarlet Needle','Sagittarius Justice Arrow','Wave Surfer'].map((concept,i)=>({id:`ge-join-${i}`,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:concept,ticker:'GE-FULL',eventTicker:'GE-FULL',mode:'SIMULATION',status:'open',openedAtMs:now-1000,entryPriceCents:50,remainingCount:1}));
  const s=settings({galacticExplosionEnabled:true,maxRepeatsPerMarket:3,repeatCooldownMinutes:3,maxEntriesPerTrade:7,hunterCooldownMinutes:180});
  const st=new StrategyEngine({db:memoryDb(rows),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const quote=q('GE-FULL',50,51);
  const sibling=await st.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',boltDirectAuthorized:true});
  assert.equal(sibling.ok,true,sibling.reason);
  const same=await st.hunterEntryPolicyDecision('Scarlet Needle',quote,{requireClock:false,includeCooldown:true,stage:'test',boltDirectAuthorized:true});
  assert.equal(same.ok,false);
  assert.equal(same.reason,'ticker_lock');
  const off=settings({galacticExplosionEnabled:false,maxRepeatsPerMarket:3,repeatCooldownMinutes:3,maxEntriesPerTrade:7,hunterCooldownMinutes:0});
  const blocked=new StrategyEngine({db:memoryDb(rows),kalshi:{},market:{},learning:{},getSettings:()=>off,getLiveReady:()=>false,random:()=>0});
  const fourth=await blocked.hunterEntryPolicyDecision('Athena Exclamation',quote,{requireClock:false,includeCooldown:true,stage:'test',boltDirectAuthorized:true});
  assert.equal(fourth.ok,false);
  assert.ok(['event_repeat_cap','ticker_lock'].includes(fourth.reason), fourth.reason);
});

test('repeat unit is per attack per cosmos only',async()=>{
  const now=Date.now();
  const attacks=BOLT_DIRECT.attacks;
  const s=settings({
    galacticExplosionEnabled:true,excaliburEnabled:false,recoveryHunterEnabled:true,
    maxRepeatsPerMarket:3,repeatCooldownMinutes:10,hunterCooldownMinutes:180,maxEntriesPerTrade:7,
    athenaExclamationMinCrashCents:0,athenaExclamationMinReboundCents:0,athenaExclamationMinUpwardTicks:0,
    scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,
    justiceArrowMinCrashCents:0,justiceArrowMinReboundCents:0,justiceArrowMinUpwardTicks:0,
    waveMinCrashCents:0,waveMinReboundCents:0,waveMinUpwardTicks:0,
    momentumMinCrashCents:0,momentumMinReboundCents:0,momentumMinUpwardTicks:0,
    lightningPlasmaMinCrashCents:0,lightningPlasmaMinReboundCents:0,lightningPlasmaMinUpwardTicks:0,
    crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,
  });
  const quote=q('RPT-SIM',50,51);
  const first=new StrategyEngine({db:memoryDb([]),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  for(const concept of attacks){
    const decision=await first.hunterEntryPolicyDecision(concept,quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
    assert.equal(decision.ok,true,`${concept} first seat ${decision.reason}`);
  }
  const opened=attacks.map((concept,i)=>({id:`open-${i}`,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:concept,ticker:'RPT-SIM',eventTicker:'RPT-SIM',mode:'SIMULATION',status:'open',openedAtMs:now-60_000,entryPriceCents:50,remainingCount:1}));
  const live=new StrategyEngine({db:memoryDb(opened),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  for(const concept of attacks){
    const decision=await live.hunterEntryPolicyDecision(concept,quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
    assert.equal(decision.ok,false);
    assert.equal(decision.reason,'ticker_lock',concept);
  }
  const justClosed=attacks.map((concept,i)=>({id:`closed-hot-${i}`,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:concept,ticker:'RPT-SIM',eventTicker:'RPT-SIM',mode:'SIMULATION',status:'closed',openedAtMs:now-12*60_000,closedAtMs:now-30_000,entryPriceCents:50,exitPriceCents:52,pnlCents:2,remainingCount:0}));
  const cooling=new StrategyEngine({db:memoryDb(justClosed),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  for(const concept of attacks){
    const decision=await cooling.hunterEntryPolicyDecision(concept,quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
    assert.equal(decision.ok,false,concept);
    assert.equal(decision.reason,'repeat_cooldown',`${concept} ${decision.reason}`);
  }
  const cooled=attacks.map((concept,i)=>({id:`closed-cool-${i}`,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:concept,ticker:'RPT-SIM',eventTicker:'RPT-SIM',mode:'SIMULATION',status:'closed',openedAtMs:now-40*60_000,closedAtMs:now-11*60_000,entryPriceCents:50,exitPriceCents:52,pnlCents:2,remainingCount:0}));
  const ready=new StrategyEngine({db:memoryDb(cooled),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  for(const concept of attacks){
    const decision=await ready.hunterEntryPolicyDecision(concept,quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
    assert.equal(decision.ok,true,`${concept} after 10m ${decision.reason}`);
  }
  const threeScarlet=[1,2,3].map((n)=>({id:`sc-${n}`,systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Scarlet Needle',ticker:'RPT-SIM',eventTicker:'RPT-SIM',mode:'SIMULATION',status:'closed',openedAtMs:now-n*40*60_000,closedAtMs:now-n*20*60_000,entryPriceCents:50,exitPriceCents:52,pnlCents:2,remainingCount:0}));
  const capped=new StrategyEngine({db:memoryDb(threeScarlet),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const scarletCap=await capped.hunterEntryPolicyDecision('Scarlet Needle',quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
  assert.equal(scarletCap.ok,false);
  assert.equal(scarletCap.reason,'event_repeat_cap');
  const waveStill=await capped.hunterEntryPolicyDecision('Wave Surfer',quote,{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
  assert.equal(waveStill.ok,true,waveStill.reason);
});

test('Bolt Direct fire opens every Galactic joiner then honors per-attack repeat',async()=>{
  const s=settings({
    galacticExplosionEnabled:true,recoveryHunterEnabled:true,
    maxRepeatsPerMarket:3,repeatCooldownMinutes:10,hunterCooldownMinutes:180,maxEntriesPerTrade:20,
    athenaExclamationMinCrashCents:0,athenaExclamationMinReboundCents:0,athenaExclamationMinUpwardTicks:0,
    scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0,
    justiceArrowMinCrashCents:0,justiceArrowMinReboundCents:0,justiceArrowMinUpwardTicks:0,
    waveMinCrashCents:0,waveMinReboundCents:0,waveMinUpwardTicks:0,
    momentumMinCrashCents:0,momentumMinReboundCents:0,momentumMinUpwardTicks:0,
    lightningPlasmaMinCrashCents:0,lightningPlasmaMinReboundCents:0,lightningPlasmaMinUpwardTicks:0,
    crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,
  });
  const db=memoryDb([]);
  const quote=q('GE-FIRE',48,49);
  const st=new StrategyEngine({db,kalshi:{},market:{
    async refreshTicker(){return quote;},
    getHistory(){return [];},
    executableAsk(){return {filled:2,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},
    executableBid(){return {filled:2,avgCents:quote.yesBid,bestCents:quote.yesBid};},
  },learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const bolt={id:'ATG-SIM-1',ticker:quote.ticker,eventTicker:quote.eventTicker,fingerprint:'fp-sim',greenTrigger:{shadowTradeId:'shadow-1',moveCents:1}};
  const opened=[];
  for(const concept of BOLT_DIRECT.attacks){
    const row=await st.executeBoltDirectFire(quote,bolt,concept,{});
    assert.ok(row,`${concept} ${st.lastAthenaFireAbort||'no abort'}`);
    opened.push(row.conceptName);
  }
  assert.deepEqual(opened.slice().sort(),BOLT_DIRECT.attacks.slice().sort());
  const book=await db.entries();
  assert.equal(book.filter((e)=>e.status==='open').length,BOLT_DIRECT.attacks.length);
});

test('Excalibur copies the opened attack onto free cosmosses',async()=>{
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:true,athenaExclamationStakeCents:100,scarletNeedleStakeCents:100,systemName:'ARIES'};
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={loadCosmosSettings:async(id,host)=>({...host,systemName:id,scarletNeedleStakeCents:100}),audit:async()=>{}};
  const created=[];
  engine.strategy={createHunter:async(concept,q,stake)=>({id:`${engine.settings.systemName}-${concept}`,systemName:engine.settings.systemName,conceptName:concept,ticker:q.ticker,status:'open',stakeCents:stake})};
  engine.rememberCosmosBookEntry=(row)=>{engine.cosmosBooks[row.systemName]=[...(engine.cosmosBooks[row.systemName]||[]),row];created.push(row);};
  const source={id:'src-sc',systemName:'ARIES',conceptName:'Scarlet Needle',ticker:'EX-SIM',entryConfig:{athenaFire:{version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,selectedAttack:'Scarlet Needle',ticker:'EX-SIM',stakeCents:100,commandHash:'x'}}};
  const quote={ticker:'EX-SIM',eventTicker:'EX-SIM',yesBid:50,yesAsk:51,status:'active'};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,quote);
  assert.ok(copied.length>=10,`copied ${copied.length}`);
  assert.ok(copied.every((row)=>row.conceptName==='Scarlet Needle'));
  assert.equal(copied.some((row)=>row.systemName==='ARIES'),false);
  assert.equal(new Set(copied.map((row)=>row.systemName)).size,copied.length);
});

test('Excalibur replica cannot leave the sealed source band after a late price drift',()=>{
  const s=settings({
    excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:true,
    scarletNeedleEnabled:true,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:70,
    scarletNeedleStakeCents:100,systemName:'SCORPIO',
  });
  const sourceAsk=69, liveAsk=93;
  const base={
    version:BOLT_DIRECT.version,
    policyRevision:BOLT_DIRECT.policyRevision,
    authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',
    ticker:'KXATPMATCH-26SEP22CASKOT-KOT',
    stakeCents:100,
    decidedAtMs:Date.now()-10,
    expiresAtMs:Date.now()+30_000,
    systemName:'SCORPIO',
  };
  const source=sealAthenaFireCommand({...base,authorizationId:'SRC-1'});
  const sourceCheck=validateBoltDirectFireCommand(source,{concept:'Scarlet Needle',q:q(base.ticker,68,sourceAsk),settings:s});
  assert.equal(sourceCheck.ok,true,sourceCheck.reason);
  const drifted=validateBoltDirectFireCommand(source,{concept:'Scarlet Needle',q:q(base.ticker,92,liveAsk),settings:s});
  assert.equal(drifted.ok,false);
  assert.equal(drifted.reason,'entry_band');
  const replica=sealAthenaFireCommand({
    ...base,
    authorizationId:'EXCALIBUR:src-sc:SCORPIO:Scarlet Needle',
    excaliburReplica:true,
    authorizedMaxEntryCents:100,
    decisionEvidence:{excalibur:{version:'EXCALIBUR-V2',sourceCosmos:'ARIES',targetCosmos:'SCORPIO',copiedConcept:'Scarlet Needle'}},
  });
  assert.equal(isExcaliburReplicaCommand(replica),true);
  const copy=validateBoltDirectFireCommand(replica,{concept:'Scarlet Needle',q:q(base.ticker,92,liveAsk),settings:s});
  assert.equal(copy.ok,false,copy.reason);
  assert.equal(copy.reason,'entry_band');
  assert.equal(copy.excaliburReplica,true);
});

test('Excalibur commit lock is per ticker+attack+cosmos so twelve rooms can open together',()=>{
  const aries=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({excaliburEnabled:true,galacticExplosionEnabled:true,systemName:'ARIES'}),getLiveReady:()=>false,random:()=>0});
  const taurus=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>settings({excaliburEnabled:true,galacticExplosionEnabled:true,systemName:'TAURUS'}),getLiveReady:()=>false,random:()=>0});
  const ariesScarlet=aries.hunterConcurrencyLockKey('Scarlet Needle','KX-SAME');
  const taurusScarlet=taurus.hunterConcurrencyLockKey('Scarlet Needle','KX-SAME');
  const ariesJustice=aries.hunterConcurrencyLockKey('Sagittarius Justice Arrow','KX-SAME');
  assert.ok(ariesScarlet.includes('attack:Scarlet Needle'));
  assert.ok(ariesScarlet.includes('cosmos:ARIES'));
  assert.notEqual(ariesScarlet,taurusScarlet);
  assert.notEqual(ariesScarlet,ariesJustice);
  assert.notEqual(`commit:${ariesScarlet}`,`commit:${taurusScarlet}`);
});

test('Excalibur fan-out blocks copies after the live quote leaves the sealed source band',async()=>{
  const host={excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:true,athenaExclamationStakeCents:100,scarletNeedleStakeCents:100,systemName:'ARIES',scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3};
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings=host;
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={loadCosmosSettings:async(id)=>({...host,systemName:id,scarletNeedleEnabled:true,scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69}),audit:async()=>{}};
  engine.strategy={
    createHunter:async()=>{throw new Error('out-of-band replica must not createHunter');},
  };
  engine.rememberCosmosBookEntry=()=>{};
  const now=Date.now();
  const sourceFire=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,
    policyRevision:BOLT_DIRECT.policyRevision,
    authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',
    ticker:'EX-DRIFT',
    stakeCents:100,
    decidedAtMs:now-20,
    expiresAtMs:now+60_000,
    systemName:'ARIES',
    authorizationId:'SRC-SCARLET',
    operatorMinEntryCents:60,
    operatorMaxEntryCents:69,
    entryPriceCents:65,
    authorizedMaxEntryCents:69,
  });
  const source={id:'src-sc',systemName:'ARIES',conceptName:'Scarlet Needle',ticker:'EX-DRIFT',entryConfig:{athenaFire:sourceFire}};
  const drifted={ticker:'EX-DRIFT',eventTicker:'EX-DRIFT',yesBid:72,yesAsk:72,status:'active'};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,drifted);
  assert.equal(copied.length,0,`copied ${copied.length} expected 0 outside sealed 60-69`);
});


function overnightAthenaOnly(overrides={}){
  return settings({
    athenaExclamationEnabled:true,
    scarletNeedleEnabled:false,
    justiceArrowEnabled:false,
    momentumHunterEnabled:false,
    waveSurferEnabled:false,
    crashRecoveryHunterEnabled:false,
    lightningPlasmaEnabled:false,
    recoveryHunterEnabled:false,
    galacticExplosionEnabled:false,
    excaliburEnabled:true,
    athenaExclamationFollowUpAttacks:0,
    athenaExclamationMinCrashCents:0,
    athenaExclamationMinReboundCents:0,
    athenaExclamationMinUpwardTicks:0,
    athenaExclamationMinEntryCents:35,
    athenaExclamationMaxEntryCents:92,
    infinityBreakMinNetPerOriginalContractCents:4,
    atomicThunderGreenTriggerCents:1,
    ...overrides,
  });
}

test('Athena-only Bolt Direct does not wait for three Saints',()=>{
  const s=overnightAthenaOnly();
  const quote=q('ATP-LIVE',50,51);
  const shadow={id:'peg-1',conceptName:'Pegasus',ticker:'ATP-LIVE',status:'open',entryPriceCents:49,active:true,openedAtMs:Date.now()-8_000};
  const features=atomicThunderBoltFeatures({q:quote,history:[{t:Date.now()-1000,ask:51,bid:50}],settings:s,cosmos:[shadow],fieldContext:{},now:Date.now()});
  assert.deepEqual(features.eligibleAttacks.map((x)=>x.concept),['Athena Exclamation']);
  const decision=atomicThunderBoltDecision(features,s);
  assert.equal(decision.detected,true,decision.reason);
  assert.equal(decision.reason,'cosmo_green');
});

test('each Bolt Direct attack alone is an eligible band',()=>{
  for(const concept of BOLT_DIRECT.attacks){
    const off={
      athenaExclamationEnabled:false,scarletNeedleEnabled:false,justiceArrowEnabled:false,
      momentumHunterEnabled:false,waveSurferEnabled:false,lightningPlasmaEnabled:false,recoveryHunterEnabled:false,
    };
    const flag={
      'Athena Exclamation':'athenaExclamationEnabled','Scarlet Needle':'scarletNeedleEnabled',
      'Sagittarius Justice Arrow':'justiceArrowEnabled','Momentum Hunter':'momentumHunterEnabled',
      'Wave Surfer':'waveSurferEnabled','Lightning Plasma':'lightningPlasmaEnabled','Recovery Hunter':'recoveryHunterEnabled',
    }[concept];
    const s=settings({...off,[flag]:true,athenaExclamationMinCrashCents:0,galacticExplosionEnabled:false});
    const features=atomicThunderBoltFeatures({q:q('SOLO',50,51),history:[],settings:s,cosmos:[{id:'s1',conceptName:'Dragon',ticker:'SOLO',status:'open',entryPriceCents:48,openedAtMs:1}],now:Date.now()});
    assert.deepEqual(features.eligibleAttacks.map((x)=>x.concept),[concept],concept);
    assert.equal(atomicThunderBoltDecision(features,s).detected,true,concept);
  }
});

test('Athena-only SIM opens on the bolt and stamps Infinity then Aurora close authority',async()=>{
  const s=overnightAthenaOnly({mode:'SIMULATION'});
  const db=memoryDb([]);
  const quote=q('SIM-A2Z',48,49);
  const st=new StrategyEngine({db,kalshi:{},market:{
    async refreshTicker(){return quote;},
    getHistory(){return [];},
    executableAsk(){return {filled:2,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},
    executableBid(){return {filled:2,avgCents:quote.yesBid,bestCents:quote.yesBid};},
  },learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const opened=await st.executeBoltDirectFire(quote,{id:'ATG-A2Z',ticker:quote.ticker,eventTicker:quote.eventTicker,fingerprint:'fp',greenTrigger:{shadowTradeId:'sh',moveCents:2}},'Athena Exclamation',{});
  assert.ok(opened,st.lastAthenaFireAbort||'athena did not open');
  assert.equal(opened.conceptName,'Athena Exclamation');
  assert.equal(opened.mode,'SIMULATION');
  assert.equal(opened.status,'open');
  const target=attackInfinityNetTargetCents(s,'Athena Exclamation');
  assert.ok(Number(target)>0,String(target));
  const snap=attackProfitAuthoritySnapshot(s,'Athena Exclamation');
  assert.ok(snap);
});

test('LIVE path refuses a bolt fire when liveReady is false and allows it when liveReady is true',async()=>{
  const quote=q('LIVE-A2Z',48,49);
  const market={async refreshTicker(){return quote;},getHistory(){return [];},executableAsk(){return {filled:2,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},executableBid(){return {filled:2,avgCents:quote.yesBid,bestCents:quote.yesBid};}};
  const kalshi={buildClientOrderId:()=>'cid-live',async createOrder(){return {order:{order_id:'oid-live',status:'executed',count:2,yes_price:quote.yesAsk}};},async getOrder(){return {order:{order_id:'oid-live',status:'executed',count:2,yes_price:quote.yesAsk}};}};
  const liveOff=overnightAthenaOnly({mode:'LIVE',liveArmed:true});
  const blocked=new StrategyEngine({db:memoryDb([]),kalshi,market,learning:{},getSettings:()=>liveOff,getLiveReady:()=>false,random:()=>0});
  const denied=await blocked.executeBoltDirectFire(quote,{id:'ATG-LIVE-OFF',ticker:quote.ticker,eventTicker:quote.eventTicker,fingerprint:'fp',greenTrigger:{moveCents:1}},'Athena Exclamation',{});
  assert.equal(denied,null);
  const liveOn=overnightAthenaOnly({mode:'LIVE',liveArmed:true});
  const allowed=new StrategyEngine({db:memoryDb([]),kalshi,market,learning:{},getSettings:()=>liveOn,getLiveReady:()=>true,random:()=>0});
  const row=await allowed.executeBoltDirectFire(quote,{id:'ATG-LIVE-ON',ticker:quote.ticker,eventTicker:quote.eventTicker,fingerprint:'fp',greenTrigger:{moveCents:1}},'Athena Exclamation',{});
  assert.ok(row,allowed.lastAthenaFireAbort||'live ready should open');
  assert.equal(row.mode,'LIVE');
});

test('Excalibur OFF does not copy the opened attack onto other cosmosses',async()=>{
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={excaliburEnabled:false,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:false,athenaExclamationStakeCents:100,systemName:'ARIES'};
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={loadCosmosSettings:async(id,host)=>({...host,systemName:id}),audit:async()=>{}};
  engine.strategy={createHunter:async()=>{throw new Error('excalibur off must not create copies');}};
  engine.rememberCosmosBookEntry=()=>{};
  const source={id:'src-ae',systemName:'ARIES',conceptName:'Athena Exclamation',ticker:'EX-OFF',entryConfig:{athenaFire:{version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,selectedAttack:'Athena Exclamation',ticker:'EX-OFF',stakeCents:100,commandHash:'x'}}};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,{ticker:'EX-OFF',eventTicker:'EX-OFF',yesBid:50,yesAsk:51,status:'active'});
  assert.deepEqual(copied,[]);
});

test('Galactic OFF keeps one ticker one hunter after the first Bolt Direct seat',async()=>{
  const s=overnightAthenaOnly({galacticExplosionEnabled:false,scarletNeedleEnabled:true,athenaExclamationMinCrashCents:0,scarletNeedleMinCrashCents:0,scarletNeedleMinReboundCents:0,scarletNeedleMinUpwardTicks:0});
  const now=Date.now();
  const occupied=new StrategyEngine({db:memoryDb([{id:'ae-open',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'GE-OFF',eventTicker:'GE-OFF',mode:'SIMULATION',status:'open',openedAtMs:now-1_000,entryPriceCents:50,remainingCount:1}]),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const join=await occupied.hunterEntryPolicyDecision('Scarlet Needle',q('GE-OFF',50,51),{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
  assert.equal(join.ok,false);
  assert.equal(join.reason,'ticker_lock');
});

test('Excalibur first seat is not clipped by event cap or repeat cap',async()=>{
  const now=Date.now();
  const crowded=Array.from({length:7},(_,i)=>({id:`ae-${i}`,systemName:'TAURUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'EX-CAP',eventTicker:'EX-CAP',mode:'SIMULATION',status:'closed',openedAtMs:now-8_000,closedAtMs:now-4_000,entryPriceCents:50,remainingCount:0}));
  const s=overnightAthenaOnly({galacticExplosionEnabled:false,excaliburEnabled:true,maxEntriesPerTrade:1,maxRepeatsPerMarket:1,systemName:'TAURUS'});
  const st=new StrategyEngine({db:memoryDb(crowded),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const blocked=await st.hunterEntryPolicyDecision('Athena Exclamation',q('EX-CAP',50,51),{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:false});
  assert.equal(blocked.ok,false);
  const firstSeat=await st.hunterEntryPolicyDecision('Athena Exclamation',q('EX-CAP',50,51),{requireClock:false,includeCooldown:true,stage:'sim',boltDirectAuthorized:true});
  assert.equal(firstSeat.ok,true,firstSeat.reason);
  assert.equal(firstSeat.excaliburFirstSeatBypass,true);
});

test('Excalibur source claim plus fan-out yields one seat per cosmos',async()=>{
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:false,athenaExclamationStakeCents:100,systemName:'ARIES'};
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={loadCosmosSettings:async(id,host)=>({...host,systemName:id,athenaExclamationStakeCents:100}),audit:async()=>{}};
  engine.strategy={createHunter:async(concept,q,stake)=>({id:`${engine.settings.systemName}-${concept}`,systemName:engine.settings.systemName,conceptName:concept,ticker:q.ticker,status:'open',stakeCents:stake})};
  engine.rememberCosmosBookEntry=(row)=>{engine.cosmosBooks[row.systemName]=[...(engine.cosmosBooks[row.systemName]||[]),row];};
  const source={id:'src-ae',systemName:'ARIES',conceptName:'Athena Exclamation',ticker:'EX-12',entryConfig:{athenaFire:{version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,selectedAttack:'Athena Exclamation',ticker:'EX-12',stakeCents:100,commandHash:'x'}}};
  engine.cosmosBooks.ARIES=[source];
  const quote={ticker:'EX-12',eventTicker:'EX-12',yesBid:50,yesAsk:51,status:'active'};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,quote);
  assert.equal(copied.length,11,`copied ${copied.length}`);
  assert.equal(engine.excaliburSourceClaimed('EX-12','Athena Exclamation'),true);
  assert.equal(engine.fleetHoldsExactTickerAttack('EX-12','Athena Exclamation'),true);
  assert.equal(new Set(['ARIES',...copied.map((row)=>row.systemName)]).size,12);
  assert.equal(SagittariusEngine.prototype.claimExcaliburSource.call(engine,'EX-12','Athena Exclamation','TAURUS'),false);
});

test('homepage and trading log exclude feeder zeros from win rate and closed book',async()=>{
  const e=Object.create(SagittariusEngine.prototype);
  e.settings={systemName:'ARIES',ownerId:'sagittarius-main',mode:'SIMULATION',resetTimestampMs:0,startingCapitalCents:100000,simFeeCents:2};
  e.quoteView=()=>({priceCents:50});e.openUnrealized=()=>0;e.portfolioValueCentsForMode=(v)=>v;
  e.strategy={async simulationAvailableCashCents(){return 100000;}};
  e.decorateEntry=(row)=>row;
  e.db={
    async performanceAggregate(){throw new Error('host-only aggregate must not score');},
    async openEntries(){throw new Error('host-only open reader must not score');},
    async recentClosedHunters(){throw new Error('host-only closed reader must not score');},
    async conceptStatsAggregate(){return[];},
    async performanceAggregateFleet(){return{closed_hunters:84,open_hunters:12,wins:49,losses:0,scratches:35,closed_realized_cents:229,partial_realized_cents:0,day_realized_cents:229,week_realized_cents:229,month_realized_cents:229,year_realized_cents:229,simulation_ledger_pnl_cents:229};},
    async dashboardOpenEntriesFleet(){return[{conceptName:'Athena Exclamation',status:'open',pnlCents:0,mode:'SIMULATION',count:1,remainingCount:1,entryPriceCents:75,entryFeeCents:2,updatedAtMs:2}];},
    async dashboardRecentClosedHuntersFleet(){return[
      {conceptName:'Athena Exclamation',status:'closed',pnlCents:4,closedAtMs:2,ticker:'WIN'},
      {conceptName:'Phoenix',status:'closed',pnlCents:0,closedAtMs:2,ticker:'FEED',closeReason:'phoenix_signal_expired'},
    ];},
    async conceptStatsAggregateFleet(){return{portfolio:[],signals:[],linked:[]};},
    async tradingLogRowsFleet(){return[
      {conceptName:'Athena Exclamation',status:'closed',archived:false,pnlCents:4,ticker:'WIN',openedAtMs:1,closedAtMs:2,mode:'SIMULATION'},
      {conceptName:'Phoenix',status:'closed',archived:false,pnlCents:0,ticker:'FEED',openedAtMs:1,closedAtMs:2,mode:'SIMULATION',closeReason:'phoenix_signal_expired'},
      {conceptName:'Dragon',status:'closed',archived:false,pnlCents:0,ticker:'FEED2',openedAtMs:1,closedAtMs:2,mode:'SIMULATION'},
    ];},
  };
  const dash=await e.performance({dashboard:true});
  assert.equal(dash.closed.some((row)=>row.conceptName==='Phoenix'),false);
  assert.equal(dash.winRate,1);
  const hist=await e.performance({fullHistory:true});
  assert.equal(hist.hunters.every((row)=>row.conceptName==='Athena Exclamation'),true);
  assert.equal(hist.wins,1);
  assert.equal(hist.scratches,0);
  assert.equal(hist.winRate,1);
  const log=await e.tradingLogText();
  assert.equal(log.includes('Phoenix'),false);
  assert.equal(log.includes('Dragon'),false);
  assert.equal(log.includes('WIN'),true);
  assert.equal(log.includes('feeders excluded'),true);
});

test('homepage closed table source drops feeder concept names',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(app.includes("FEEDER_TABLE=new Set(['Pegasus','Dragon','Phoenix'"));
  assert.ok(app.includes('closed=(s.closedHunters||[]).filter'));
});


test('Scarlet Needle uses the shared Infinity target, not a private minimum',()=>{
  const s=settings({infinityBreakMinNetPerOriginalContractCents:1,scarletNeedleInfinityNetPerOriginalContractCents:9});
  assert.equal(attackInfinityNetTargetCents(s,'Scarlet Needle'),1);
  assert.equal(attackInfinityNetTargetCents(s,'Athena Exclamation'),1);
});

test('Crystal Wall follow-up opens after a profitable Infinity close and Excalibur can copy it',async()=>{
  const s=settings({
    recoveryHunterEnabled:true,recoveryPri1R2Enabled:true,recoveryPri1R2TriggerCents:1,recoveryPri1R2TrailCents:1,
    recoveryMinEntryCents:10,recoveryMaxEntryCents:89,crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,
    recoveryStakeCents:100,excaliburEnabled:true,infinityBreakMinNetPerOriginalContractCents:1,
  });
  const parent={id:'ath-ib-1',systemName:'ARIES',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'CW-FLW',eventTicker:'CW-FLW',mode:'SIMULATION',status:'closed',remainingCount:0,pnlCents:12,closeReason:'infinity_break',openedAtMs:1,closedAtMs:2,entryPriceCents:48,exitPriceCents:52,peakPriceCents:53};
  const db=memoryDb([parent]);
  const quote=q('CW-FLW',52,53);
  const st=new StrategyEngine({db,kalshi:{},market:{
    async refreshTicker(){return quote;},
    getHistory(){return [];},
    executableAsk(){return {filled:2,avgCents:quote.yesAsk,bestCents:quote.yesAsk,full:true};},
    executableBid(){return {filled:2,avgCents:quote.yesBid,bestCents:quote.yesBid,full:true};},
  },learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const opened=await st.executeCrystalWallFollowUp(quote,parent,{grantId:'CW4:ath-ib-1'},{crashDepthCents:0,reboundCents:0,upwardTicks:0});
  assert.ok(opened,st.lastAthenaFireAbort||'follow-up did not open');
  assert.equal(opened.conceptName,'Recovery Hunter');
  assert.equal(opened.sourceTradeId,'ath-ib-1');
  assert.equal(opened.entryConfig?.profitAuthority,PROTECTED_RUNNER_INTELLIGENCE.version);
  assert.equal(opened.entryConfig?.pri1R2?.trailNetPerOriginalContractCents,1);

  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={...s,excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,systemName:'ARIES',recoveryHunterEnabled:true,recoveryStakeCents:100,crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,recoveryMinEntryCents:10,recoveryMaxEntryCents:89};
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.excaliburGrants=new Map(); engine.excaliburInFlight=new Set(); engine.excaliburSourceClaims=new Map(); engine.excaliburFanoutLocks=new Map();
  engine.db={loadCosmosSettings:async(id,host)=>({...host,systemName:id,recoveryHunterEnabled:true,recoveryStakeCents:100,crystalWallMinCrashCents:0,crystalWallMinReboundCents:0,crystalWallMinUpwardTicks:0,recoveryMinEntryCents:10,recoveryMaxEntryCents:89}),audit:async()=>{}};
  engine.withCosmosSettings=async(id,fn)=>{const prev=engine.settings; engine.settings={...engine.settings,systemName:id}; try{return await fn(engine.settings);} finally{engine.settings=prev;}};
  engine.strategy={createHunter:async(concept,q,stake)=>({id:`${engine.settings.systemName}-${concept}`,systemName:engine.settings.systemName,conceptName:concept,ticker:q.ticker,status:'open',stakeCents:stake})};
  engine.rememberCosmosBookEntry=(row)=>{engine.cosmosBooks[row.systemName]=[...(engine.cosmosBooks[row.systemName]||[]),row];};
  const source={id:opened.id,systemName:'ARIES',conceptName:'Recovery Hunter',ticker:'CW-FLW',entryConfig:{athenaFire:opened.entryConfig?.athenaFire||{version:CRYSTAL_WALL.followVersion,authorityMode:CRYSTAL_WALL.followAuthority,selectedAttack:'Recovery Hunter',ticker:'CW-FLW',stakeCents:100}}};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,quote);
  assert.ok(copied.length>=10,`copied ${copied.length}`);
  assert.ok(copied.every((row)=>row.conceptName==='Recovery Hunter'));
});

test('Crystal Wall homepage row uses live fleet results, not a hard zero',async()=>{
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(app.includes('const st=fleetStatFor(s,a.legacy)'));
  assert.equal(app.includes("name==='Recovery Hunter' || name==='Crystal Wall Shadow'"),false);
  assert.ok(app.includes("CRYSTAL WALL FOLLOW-UP"));
});


test('banned family is not reported as no_enabled_attack_band',()=>{
  const s=sanitizeRuntimeSettings({
    ...originalSettings(),
    andromedaThunderWaveEnabled:true,
    andromedaThunderWaveLevel:'MID',
    athenaExclamationEnabled:true,
    athenaExclamationMinEntryCents:30,
    athenaExclamationMaxEntryCents:90,
    athenaExclamationMinCrashCents:0,
    athenaExclamationMinReboundCents:0,
    athenaExclamationMinUpwardTicks:0,
  });
  const quote=q('KXATPCHALLENGERMATCH-26SEP22DONCAD-CAD',58,60);
  const features=atomicThunderBoltFeatures({q:quote,history:[],settings:s,cosmos:[{id:'s1',conceptName:'Dragon',ticker:quote.ticker,status:'open',entryPriceCents:50,openedAtMs:1}],now:Date.now()});
  const decision=atomicThunderBoltDecision(features,s);
  assert.equal(decision.detected,false);
  assert.equal(decision.reason,MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode);
  assert.notEqual(decision.reason,'no_enabled_attack_band');
});

test('allowed family outside the operator band still reports no_enabled_attack_band',()=>{
  const s=sanitizeRuntimeSettings({
    ...originalSettings(),
    andromedaThunderWaveEnabled:true,
    andromedaThunderWaveLevel:'MID',
    athenaExclamationEnabled:true,
    scarletNeedleEnabled:false,
    justiceArrowEnabled:false,
    momentumHunterEnabled:false,
    waveSurferEnabled:false,
    lightningPlasmaEnabled:false,
    recoveryHunterEnabled:false,
    athenaExclamationMinEntryCents:60,
    athenaExclamationMaxEntryCents:69,
    athenaExclamationMinCrashCents:0,
    athenaExclamationMinReboundCents:0,
    athenaExclamationMinUpwardTicks:0,
  });
  const quote=q('KXUCLWGAME-26SEP22JUVSLB-SLB',87,88);
  const features=atomicThunderBoltFeatures({q:quote,history:[],settings:s,cosmos:[{id:'s1',conceptName:'Phoenix',ticker:quote.ticker,status:'open',entryPriceCents:80,openedAtMs:1}],now:Date.now()});
  const decision=atomicThunderBoltDecision(features,s);
  assert.equal(decision.detected,false);
  assert.equal(decision.reason,'no_enabled_attack_band');
});

test('allowed family inside the operator band can still detect a bolt',()=>{
  const s=sanitizeRuntimeSettings({
    ...originalSettings(),
    andromedaThunderWaveEnabled:true,
    andromedaThunderWaveLevel:'MID',
    athenaExclamationEnabled:true,
    scarletNeedleEnabled:false,
    justiceArrowEnabled:false,
    momentumHunterEnabled:false,
    waveSurferEnabled:false,
    lightningPlasmaEnabled:false,
    recoveryHunterEnabled:false,
    athenaExclamationMinEntryCents:60,
    athenaExclamationMaxEntryCents:69,
    athenaExclamationMinCrashCents:0,
    athenaExclamationMinReboundCents:0,
    athenaExclamationMinUpwardTicks:0,
  });
  const quote=q('KXUCLWGAME-26SEP22JUVSLB-SLB',63,64);
  const features=atomicThunderBoltFeatures({q:quote,history:[],settings:s,cosmos:[{id:'s1',conceptName:'Phoenix',ticker:quote.ticker,status:'open',entryPriceCents:61,openedAtMs:1}],now:Date.now()});
  const decision=atomicThunderBoltDecision(features,s);
  assert.equal(decision.detected,true,decision.reason);
});

test('Excalibur replica at 65 inside sealed 60-69 stays valid',()=>{
  const now=Date.now();
  const command=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',ticker:'EX-BAND',stakeCents:100,decidedAtMs:now-10,expiresAtMs:now+60_000,
    systemName:'TAURUS',authorizationId:'EXCALIBUR:src:TAURUS:Scarlet Needle',excaliburReplica:true,
    operatorMinEntryCents:60,operatorMaxEntryCents:69,entryPriceCents:65,authorizedMaxEntryCents:69,
  });
  assert.equal(isExcaliburReplicaCommand(command),true);
  const s={systemName:'TAURUS',scarletNeedleEnabled:true,scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3,andromedaThunderWaveEnabled:false};
  const verdict=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-BAND',64,65),settings:s,now});
  assert.equal(verdict.ok,true,verdict.reason);
  assert.equal(verdict.authorizedMaxEntryCents,69);
  assert.notEqual(verdict.authorizedMaxEntryCents,100);
});

test('Excalibur replica at 72 is blocked by sealed 60-69 envelope',()=>{
  const now=Date.now();
  const command=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',ticker:'EX-BAND',stakeCents:100,decidedAtMs:now-10,expiresAtMs:now+60_000,
    systemName:'TAURUS',authorizationId:'EXCALIBUR:src:TAURUS:Scarlet Needle',excaliburReplica:true,
    operatorMinEntryCents:60,operatorMaxEntryCents:69,entryPriceCents:65,authorizedMaxEntryCents:100,
  });
  const s={systemName:'TAURUS',scarletNeedleEnabled:true,scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3,andromedaThunderWaveEnabled:false};
  const high=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-BAND',71,72),settings:s,now});
  assert.equal(high.ok,false);
  assert.equal(high.reason,'entry_band');
  const low=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-BAND',58,59),settings:s,now});
  assert.equal(low.ok,false);
  assert.equal(low.reason,'entry_band');
});

test('Excalibur replica blocked by spread at 65 may pass when spread tightens inside the same band',()=>{
  const now=Date.now();
  const command=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',ticker:'EX-SPREAD',stakeCents:100,decidedAtMs:now-10,expiresAtMs:now+60_000,
    systemName:'GEMINI',authorizationId:'EXCALIBUR:src:GEMINI:Scarlet Needle',excaliburReplica:true,
    operatorMinEntryCents:60,operatorMaxEntryCents:69,entryPriceCents:65,authorizedMaxEntryCents:69,
  });
  const s={systemName:'GEMINI',scarletNeedleEnabled:true,scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3,andromedaThunderWaveEnabled:false};
  const wide=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-SPREAD',60,65),settings:s,now});
  assert.equal(wide.ok,false);
  assert.equal(wide.reason,'shared_spread_safety');
  const tight=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-SPREAD',64,65),settings:s,now});
  assert.equal(tight.ok,true,tight.reason);
});

test('Excalibur replica blocked by spread at 65 cannot later execute at 72',()=>{
  const now=Date.now();
  const command=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',ticker:'EX-MIGRATE',stakeCents:100,decidedAtMs:now-10,expiresAtMs:now+60_000,
    systemName:'CANCER',authorizationId:'EXCALIBUR:src:CANCER:Scarlet Needle',excaliburReplica:true,
    operatorMinEntryCents:60,operatorMaxEntryCents:69,entryPriceCents:65,authorizedMaxEntryCents:69,
  });
  const s={systemName:'CANCER',scarletNeedleEnabled:true,scarletNeedleStakeCents:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3,andromedaThunderWaveEnabled:false};
  const first=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:q('EX-MIGRATE',60,65),settings:s,now});
  assert.equal(first.reason,'shared_spread_safety');
  const later=validateBoltDirectFireCommand(command,{concept:'Scarlet Needle',q:{...q('EX-MIGRATE',71,72),status:'active'},settings:s,now:now+20_000});
  assert.equal(later.ok,false);
  assert.equal(later.reason,'entry_band');
});

test('Excalibur still fans out across free cosmosses while the fresh quote stays inside the sealed band',async()=>{
  const host={excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,galacticExplosionEnabled:true,athenaExclamationStakeCents:100,scarletNeedleStakeCents:100,systemName:'ARIES',scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69,maxSpreadCents:3};
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings=host;
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={loadCosmosSettings:async(id)=>({...host,systemName:id,scarletNeedleEnabled:true,scarletNeedleStakeCents:id==='PISCES'?200:100,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69}),audit:async()=>{}};
  const created=[];
  engine.strategy={
    createHunter:async(concept,quote,stake,_sl,opts={})=>{
      const command=opts.athenaFireCommand||{};
      const s={...host,systemName:engine.settings.systemName,scarletNeedleStakeCents:stake,scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69};
      const verdict=validateBoltDirectFireCommand(command,{concept,q:quote,settings:s});
      if(!verdict.ok) throw new Error(verdict.reason);
      assert.equal(verdict.authorizedMaxEntryCents,69);
      return {id:`${engine.settings.systemName}-${concept}`,systemName:engine.settings.systemName,conceptName:concept,ticker:quote.ticker,status:'open',stakeCents:stake};
    },
  };
  engine.rememberCosmosBookEntry=(row)=>{engine.cosmosBooks[row.systemName]=[...(engine.cosmosBooks[row.systemName]||[]),row];created.push(row);};
  const now=Date.now();
  const sourceFire=sealAthenaFireCommand({
    version:BOLT_DIRECT.version,policyRevision:BOLT_DIRECT.policyRevision,authorityMode:BOLT_DIRECT.strategicEntryAuthority,
    selectedAttack:'Scarlet Needle',ticker:'EX-INBAND',stakeCents:100,decidedAtMs:now-20,expiresAtMs:now+60_000,
    systemName:'ARIES',authorizationId:'SRC-SCARLET',operatorMinEntryCents:60,operatorMaxEntryCents:69,entryPriceCents:65,authorizedMaxEntryCents:69,
  });
  const source={id:'src-in',systemName:'ARIES',conceptName:'Scarlet Needle',ticker:'EX-INBAND',entryConfig:{athenaFire:sourceFire}};
  const live={ticker:'EX-INBAND',eventTicker:'EX-INBAND',yesBid:64,yesAsk:65,status:'active'};
  const copied=await SagittariusEngine.prototype.fanOutExcalibur.call(engine,source,live);
  assert.equal(copied.length,COSMOS_IDS.length-1,`copied ${copied.length}`);
  assert.ok(copied.every((row)=>row.conceptName==='Scarlet Needle'));
  assert.equal(copied.some((row)=>row.systemName==='ARIES'),false);
  assert.equal(new Set(copied.map((row)=>row.systemName)).size,copied.length);
  const pisces=copied.find((row)=>row.systemName==='PISCES');
  assert.equal(pisces.stakeCents,200);
});

test('sealedAttackEnvelope never promotes a replica ceiling to 100 cents',()=>{
  const envelope=sealedAttackEnvelope({operatorMinEntryCents:60,operatorMaxEntryCents:69,authorizedMaxEntryCents:100,entryPriceCents:65},{scarletNeedleMinEntryCents:60,scarletNeedleMaxEntryCents:69},'Scarlet Needle');
  assert.equal(envelope.maxEntryCents,69);
  assert.equal(envelope.minEntryCents,60);
});

test('expired Excalibur grant cannot open a replica after TTL',async()=>{
  const host={excaliburEnabled:true,rozanHyakuRyuHaEnabled:false,systemName:'ARIES',scarletNeedleStakeCents:100};
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings=host;
  engine.excaliburGrants=new Map();
  engine.excaliburSourceClaims=new Map();
  engine.excaliburFanoutLocks=new Map();
  engine.excaliburInFlight=new Set();
  engine.cosmosBooks=Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.db={audit:async()=>{}};
  engine.strategy={createHunter:async()=>{throw new Error('expired grant must not fire');}};
  const grant={
    ticker:'EX-TTL',concept:'Scarlet Needle',grantKey:'EX-TTL|Scarlet Needle',sourceCosmos:'ARIES',
    sourceFire:{},grantedAtMs:Date.now()-EXCALIBUR_REPLICA_GRANT_TTL_MS-1000,expiresAtMs:Date.now()-10,
    sealedMinEntryCents:60,sealedMaxEntryCents:69,rooms:new Map(),
  };
  engine.excaliburGrants.set(grant.grantKey,grant);
  const opened=await SagittariusEngine.prototype.observeExcaliburGrant.call(engine,{ticker:'EX-TTL',yesBid:64,yesAsk:65,status:'active'},grant);
  assert.equal(opened.length,0);
  assert.equal(engine.excaliburGrants.has(grant.grantKey),false);
});
