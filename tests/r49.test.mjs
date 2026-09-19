import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELEASE, originalSettings, CANONICAL_NUMERIC_SETTINGS, CANONICAL_BOOLEAN_SETTINGS } from '../src/config.mjs';
import { StrategyEngine, megaWaveSaintSignalState, attackProfitAuthoritySnapshot, entryConfigSnapshot, attackInfinityNetTargetCents } from '../src/strategy.mjs';
import { SagittariusEngine } from '../src/engine.mjs';
import { MEGA_WAVE, STARLIGHT_EXTINCTION, isStarlightParentStopLoss, ATHENA_EXCLAMATION, CRYSTAL_WALL, INFINITY_BREAK, PROTECTED_RUNNER_INTELLIGENCE, GALACTIC_EXPLOSION, MARKET_FAMILY_EXECUTION_EXCLUSION, executionMarketFamilyExclusion } from '../src/doctrine.mjs';

const downstream=['Scarlet Needle','Sagittarius Justice Arrow','Momentum Hunter','Wave Surfer','Lightning Plasma'];
const q=(ticker='MW-T',bid=55,ask=56)=>({ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,status:'active',result:'',updatedAtMs:Date.now(),closeTimeMs:Date.now()+60*60_000});
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
  assert.equal(RELEASE,'SAGITTARIUS-MEGA-WAVE-MW1-MW2-MW3-RWY-HF6-CHAIN-REPAIR-2026-09-09');
  assert.equal(MEGA_WAVE.version,'MEGA-WAVE-MW1-MW2-MW3');assert.equal(MEGA_WAVE.maximumFollowUpAttacks,12);assert.deepEqual([...MEGA_WAVE.downstreamSaints],downstream);
  assert.equal(ATHENA_EXCLAMATION.requiredParentConcept,CRYSTAL_WALL.shadowConceptName);assert.equal(ATHENA_EXCLAMATION.requiredConsecutiveProfitableShadowProofs,3);assert.equal(ATHENA_EXCLAMATION.strategicEntryAuthority,MEGA_WAVE.entryAuthority);
  assert.equal(GALACTIC_EXPLOSION.enabledLockScope,'exact_ticker_plus_attack_identity');assert.equal(GALACTIC_EXPLOSION.sameAttackDuplicatesAllowed,false);
  assert.equal(GALACTIC_EXPLOSION.version,'GALACTIC-EXPLOSION-V2');assert.equal(GALACTIC_EXPLOSION.saintReleaseWhenOn,'athena_open');assert.equal(GALACTIC_EXPLOSION.saintsKeepOwnDoctrine,true);
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const shadowClose=engine.slice(engine.indexOf('onShadowAttackClosed:'),engine.indexOf('onShadowAttackClosed:')+4000);
  assert.ok(shadowClose.includes('queueMegaWaveAthenaContinuation(entry)'),'profitable Crystal Wall must feed Athena');
  assert.equal(shadowClose.includes('queueScarletContinuation(entry)'),false,'Crystal Wall must not directly release Scarlet');
});

test('MW dashboard/config exposes 0-12 release and independent PRI1-R2 controls without giving Crystal Wall PRI authority',async()=>{
  assert.ok(CANONICAL_NUMERIC_SETTINGS.includes('athenaExclamationFollowUpAttacks'));
  for(const k of ['athenaExclamationPri1R2TriggerCents','scarletNeedlePri1R2TriggerCents','justiceArrowPri1R2TriggerCents','momentumPri1R2TriggerCents','wavePri1R2TriggerCents','crashRecoveryPri1R2TriggerCents','lightningPlasmaPri1R2TriggerCents'])assert.ok(CANONICAL_NUMERIC_SETTINGS.includes(k),k);
  for(const k of ['athenaExclamationPri1R2Enabled','scarletNeedlePri1R2Enabled','justiceArrowPri1R2Enabled','momentumPri1R2Enabled','wavePri1R2Enabled','crashRecoveryPri1R2Enabled','lightningPlasmaPri1R2Enabled'])assert.ok(CANONICAL_BOOLEAN_SETTINGS.includes(k),k);
  assert.equal(CANONICAL_BOOLEAN_SETTINGS.includes('recoveryPri1R2Enabled'),false);
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
  const out=await h.e.handleMegaWaveAthenaContinuation(rows[2]);assert.equal(out.status,'OBSERVING');assert.equal(called,0);
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
  const h=engineHarness([parent],s);const out=await h.e.handleMegaWaveAthenaClose(parent);assert.equal(out.status,'ACTIVE');assert.equal(out.grant.limit,5);assert.deepEqual(out.grant.eligibleSaints,downstream);assert.equal(h.e.megaWaveSaintWatches.size,5);
  const loss={...parent,id:'athena-loss',pnlCents:-10,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};h.db.rows.set(loss.id,structuredClone(loss));const stopped=await h.e.handleMegaWaveAthenaClose(loss);assert.equal(stopped.status,'CHAIN_STOPPED');
  const zeroS=settings({athenaExclamationFollowUpAttacks:0}),zeroMw={...mw,followUpAttacksAtEntry:0},zeroParent={...parent,id:'athena-zero',systemName:zeroS.systemName,ownerId:zeroS.ownerId,entryConfig:{megaWave:zeroMw,athenaExclamation:{megaWaveAuthorization:zeroMw}}};const z=engineHarness([zeroParent],zeroS);const zero=await z.e.handleMegaWaveAthenaClose(zeroParent);assert.equal(zero.status,'COMPLETE');assert.equal(zero.grant.limit,0);
});

test('MW HF6 restart recovery rebuilds exactly one missing current-cohort Athena-profit grant and never resurrects pre-reset history',async()=>{
  const now=Date.now(),resetAt=now-20_000,s=settings({resetTimestampMs:resetAt,athenaExclamationFollowUpAttacks:2});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:['Scarlet Needle','Sagittarius Justice Arrow']};
  const current={id:'athena-recover-current',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-RECOVER',eventTicker:'MW-RECOVER',mode:s.mode,status:'closed',remainingCount:0,pnlCents:125,closeReason:'protected_runner_intelligence',openedAtMs:now-15_000,closedAtMs:now-10_000,entryPriceCents:75,exitPriceCents:82,entryConfig:{release:'PRIOR-HF-SAME-COHORT',megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const old={...current,id:'athena-recover-old',ticker:'MW-OLD',eventTicker:'MW-OLD',openedAtMs:now-50_000,closedAtMs:now-40_000};
  const h=engineHarness([current,old],s);
  const recovered=await h.e.recoverMegaWaveAthenaCloseHandoffs();assert.equal(recovered,1);
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
  const grant=await h.e.handleMegaWaveAthenaClose(parent);assert.equal(grant.status,'ACTIVE');assert.equal(h.e.megaWaveSaintWatches.size,1);
  current=q(parent.ticker,60,61);h.e.observeMegaWaveQuote(current);let watch=h.e.megaWaveSaintWatches.get(`MEGA-WAVE:GRANT:${parent.id}|Sagittarius Justice Arrow`);assert.equal(watch.crashArmed,true);assert.equal(watch.entryBandEligible,false);
  current=q(parent.ticker,63,64);h.e.observeMegaWaveQuote(current);watch=h.e.megaWaveSaintWatches.get(`MEGA-WAVE:GRANT:${parent.id}|Sagittarius Justice Arrow`);assert.equal(watch.troughCents,60);
  current=q(parent.ticker,66,67);h.e.observeMegaWaveQuote(current);
  for(let i=0;i<100&&h.e.megaWaveSaintQueue&&!h.e.megaWaveSaintQueue.isIdle();i++)await new Promise(resolve=>setTimeout(resolve,1));
  const episode=await h.db.opportunityEpisode(`MEGA-WAVE:GRANT:${parent.id}`),finalGrant=episode.athenaDecision.megaWaveGrant,res=finalGrant.reservations['Sagittarius Justice Arrow'];
  assert.equal(res.status,'OPENED');assert.equal(finalGrant.status,'COMPLETE');assert.equal(finalGrant.parentEntryId,parent.id);assert.equal(finalGrant.ticker,parent.ticker);assert.equal(Object.values(finalGrant.reservations).filter(x=>x.status==='OPENED').length,1);
});

test('MW atomic grant cap allows multiple distinct Saints on one ticker and never merges their identities',async()=>{
  const s=settings({athenaExclamationFollowUpAttacks:2}),mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:[...downstream]},parent={id:'athena-cap',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-CAP',eventTicker:'MW-CAP',mode:s.mode,status:'closed',remainingCount:0,pnlCents:100,closeReason:'infinity_break',closedAtMs:Date.now(),entryPriceCents:50,exitPriceCents:55,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],s);await h.e.handleMegaWaveAthenaClose(parent);h.e.strategy.executeMegaWaveSaint=async(_q,_p,a)=>({id:`entry-${a.saintConcept}`,conceptName:a.saintConcept,ticker:a.ticker,status:'open',openedAtMs:Date.now()});
  const gid=`MEGA-WAVE:GRANT:${parent.id}`;const a=await h.e.attemptMegaWaveSaint(gid,'Scarlet Needle');assert.equal(a.status,'OPENED');const b=await h.e.attemptMegaWaveSaint(gid,'Wave Surfer');assert.equal(b.status,'OPENED');assert.notEqual(a.entry.id,b.entry.id);assert.equal(a.entry.ticker,b.entry.ticker);
  const c=await h.e.attemptMegaWaveSaint(gid,'Momentum Hunter');assert.equal(c.status,'IGNORED');const ep=await h.db.opportunityEpisode(gid),grant=ep.athenaDecision.megaWaveGrant;assert.equal(grant.status,'COMPLETE');assert.equal(Object.values(grant.reservations).filter(x=>x.status==='OPENED').length,2);
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
  const crystal=attackProfitAuthoritySnapshot(settings(),'Recovery Hunter');assert.equal(crystal.authority,INFINITY_BREAK.version);assert.equal(crystal.pri1Enabled,false);
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
  assert.equal(out.status,'BLOCKED');
  assert.equal(out.reason,MARKET_FAMILY_EXECUTION_EXCLUSION.reasonCode);
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
  assert.equal(s.athenaExclamationStakeCents,500);assert.equal(s.athenaExclamationMinEntryCents,10);assert.equal(s.athenaExclamationMaxEntryCents,50);
  assert.equal(s.scarletNeedleStakeCents,500);assert.equal(s.scarletNeedleMinEntryCents,10);assert.equal(s.scarletNeedleMaxEntryCents,50);
  assert.equal(s.waveStakeCents,500);assert.equal(s.waveMinEntryCents,10);assert.equal(s.waveMaxEntryCents,50);
  assert.equal(s.lightningPlasmaFieldStakeCents,500);assert.equal(s.lightningPlasmaMinEntryCents,10);assert.equal(s.lightningPlasmaMaxEntryCents,50);
  assert.equal(s.athenaExclamationMinCrashCents,15);assert.equal(s.athenaExclamationMinReboundCents,5);assert.equal(s.athenaExclamationMinUpwardTicks,2);
});

test('RJA6 real Athena and Saints honor operator cap and cooldown; Crystal Wall paper does not',async()=>{
  const now=Date.now();
  const priorAthena={id:'athena-1',systemName:'SAGITTARIUS',ownerId:'mw-test',conceptName:'Athena Exclamation',ticker:'AIN',eventTicker:'AIN',mode:'SIMULATION',status:'closed',openedAtMs:now-47_000,closedAtMs:now-1_000,pnlCents:40,entryPriceCents:56,exitPriceCents:65,remainingCount:0};
  const s=settings({maxEntriesPerTrade:1,hunterCooldownMinutes:90,galacticExplosionEnabled:true});
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

test('ECA1 Crystal Wall leading clock is inherited by Athena and Saints; a younger probe cannot rewrite it',async()=>{
  const s=settings({minGameMinutes:10,maxGameMinutes:45,hunterCooldownMinutes:0,maxEntriesPerTrade:20});
  const db=memoryDb();
  const st=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  const t0=Date.now();
  const quote=q('EV-AIN',67,68);
  const stamped=await st.stampCrystalWallEventClock({id:'cw-1',ticker:'EV-AIN',eventTicker:'EV-AIN'},{...quote,gameMinutes:18},t0);
  assert.equal(stamped.ok,true);assert.equal(stamped.record.anchoredElapsedMinutes,18);
  const athena=await st.hunterEntryPolicyDecision('Athena Exclamation',{...quote,gameMinutes:12},{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(athena.ok,true,athena.reason);
  assert.ok(Math.abs(st.leadingEventElapsedMinutes('EV-AIN',t0+7*60000)-25)<1e-6);
  const late=await st.hunterEntryPolicyDecision('Lightning Plasma',quote,{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  // policy uses Date.now(), so freeze inherited by stamping far in the past
  const lateStore=new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  await lateStore.stampCrystalWallEventClock({id:'cw-50',ticker:'EV-YOU',eventTicker:'EV-YOU'},{...q('EV-YOU'),gameMinutes:50},Date.now()-20*60000);
  const blocked=await lateStore.hunterEntryPolicyDecision('Lightning Plasma',q('EV-YOU'),{requireClock:true,includeCooldown:false,stage:'test',megaWaveAuthorized:true});
  assert.equal(blocked.ok,false);assert.equal(blocked.reason,'maximum_game_time');
  assert.ok(blocked.elapsedMinutes>45);
  const missing=await new StrategyEngine({db:memoryDb(),kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0}).hunterEntryPolicyDecision('Athena Exclamation',q('EV-NONE'),{requireClock:true,includeCooldown:false,stage:'test'});
  assert.equal(missing.ok,false);assert.equal(missing.reason,'game_clock_unknown');
});

test('RJA5 Great Horn and Starlight use Athena-style crash/rebound/tick parameters',()=>{
  for(const k of ['momentumMinCrashCents','momentumMinReboundCents','momentumMinUpwardTicks','crashRecoveryMinUpwardTicks'])assert.ok(CANONICAL_NUMERIC_SETTINGS.includes(k),k);
  const s=originalSettings();
  assert.equal(s.momentumMinCrashCents,15);assert.equal(s.momentumMinReboundCents,5);assert.equal(s.momentumMinUpwardTicks,2);
  assert.equal(s.crashRecoveryMinCrashCents,15);assert.equal(s.crashRecoveryMinReboundCents,5);assert.equal(s.crashRecoveryMinUpwardTicks,2);
  let horn=megaWaveSaintSignalState('Momentum Hunter',{parentEntryPriceCents:70,parentExitPriceCents:70,peakCents:70,lastBidCents:70},q('MW-H',55,56),s);
  assert.equal(horn.qualified,false);assert.equal(horn.watch.crashArmed,true);
});

test('GE-R2 Galactic ON grants follow-up Saints when Athena opens; OFF still requires a profitable close',async()=>{
  const sOn=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:6});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:6,enabledSaintsAtEntry:[...downstream]};
  const openParent={id:'athena-open-ge',systemName:sOn.systemName,ownerId:sOn.ownerId,conceptName:'Athena Exclamation',ticker:'MW-GE',eventTicker:'MW-GE',mode:sOn.mode,status:'open',remainingCount:1,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const onH=engineHarness([openParent],sOn);
  const opened=await onH.e.handleMegaWaveAthenaOpen(openParent);
  assert.equal(opened.status,'ACTIVE');
  assert.equal(opened.grant.source,'ATHENA_OPEN_GALACTIC');
  assert.equal(opened.grant.limit,6);
  assert.equal(opened.grant.systemName,sOn.systemName);
  assert.equal(onH.e.megaWaveSaintWatches.size,5);
  const again=await onH.e.handleMegaWaveAthenaOpen(openParent);
  assert.equal(again.status,'ACTIVE');
  assert.equal(onH.db.episodes.size,1,'open grant is idempotent');

  const sOff=settings({galacticExplosionEnabled:false,athenaExclamationFollowUpAttacks:6});
  const offH=engineHarness([{...openParent,id:'athena-open-off'}],sOff);
  const ignored=await offH.e.handleMegaWaveAthenaOpen({...openParent,id:'athena-open-off'});
  assert.equal(ignored.status,'IGNORED');
  assert.equal(offH.e.megaWaveSaintWatches.size,0);
});

test('GE-R2 Galactic open grant lets a Saint execute while Athena is still open',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:1,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:3,justiceArrowMinUpwardTicks:1,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:89});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Sagittarius Justice Arrow']};
  const parent={id:'athena-live-ge',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-LIVE',eventTicker:'MW-LIVE',mode:s.mode,status:'open',remainingCount:1,pnlCents:0,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{release:RELEASE,megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([parent],s);
  const grantOut=await h.e.handleMegaWaveAthenaOpen(parent);
  assert.equal(grantOut.status,'ACTIVE');
  h.e.strategy.executeMegaWaveSaint=async(_q,_p,a)=>({id:`saint-${a.saintConcept}`,conceptName:a.saintConcept,ticker:a.ticker,status:'open',openedAtMs:Date.now()});
  const opened=await h.e.attemptMegaWaveSaint(grantOut.grant.grantId,'Sagittarius Justice Arrow');
  assert.equal(opened.status,'OPENED',opened.reason);
  assert.equal(opened.entry.ticker,parent.ticker);
});

test('GE-R2 real executeMegaWaveSaint accepts an open Athena parent only on a Galactic open grant',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:1,justiceArrowMinCrashCents:15,justiceArrowMinReboundCents:3,justiceArrowMinUpwardTicks:1,justiceArrowMinEntryCents:10,justiceArrowMaxEntryCents:89});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:1,enabledSaintsAtEntry:['Sagittarius Justice Arrow']};
  const parent={id:'athena-exec-open',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-EXEC-OPEN',eventTicker:'MW-EXEC-OPEN',mode:s.mode,status:'open',remainingCount:1,pnlCents:0,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{release:RELEASE,megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const db=memoryDb([parent]),grantId=`MEGA-WAVE:GRANT:${parent.id}`,reservationId=`${grantId}:SAINT:Sagittarius Justice Arrow`;
  const grant={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',ticker:parent.ticker,eventTicker:parent.eventTicker,ownerId:s.ownerId,systemName:s.systemName,mode:s.mode,limit:1,eligibleSaints:['Sagittarius Justice Arrow'],allocationDoctrine:MEGA_WAVE.allocationDoctrine,reservations:{'Sagittarius Justice Arrow':{status:'RESERVED',reservationId}},status:'ACTIVE',source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority};
  await db.upsertOpportunityEpisode({id:grantId,athenaDecision:{megaWaveGrant:grant},trackingComplete:false});
  const strategy=new StrategyEngine({db,kalshi:{},market:{},learning:{},getSettings:()=>s,getLiveReady:()=>false,random:()=>0});
  let creates=0;
  strategy.createHunter=async(concept,quote)=>{creates+=1;return{id:'saint-open-exec',conceptName:concept,ticker:quote.ticker,status:'open',entryPriceCents:quote.yesAsk};};
  const authorization={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,grantId,reservationId,parentEntryId:parent.id,parentConcept:'Athena Exclamation',saintConcept:'Sagittarius Justice Arrow',ticker:parent.ticker,eventTicker:parent.eventTicker,allocationDoctrine:MEGA_WAVE.allocationDoctrine,source:'ATHENA_OPEN_GALACTIC',authority:MEGA_WAVE.galacticOpenAuthority};
  let watch={parentEntryPriceCents:56,parentExitPriceCents:56,peakCents:56,lastBidCents:56};
  watch=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,40,41),s).watch;
  const rebound=megaWaveSaintSignalState('Sagittarius Justice Arrow',watch,q(parent.ticker,44,45),s);
  assert.equal(rebound.qualified,true,rebound.reason);
  const opened=await strategy.executeMegaWaveSaint(q(parent.ticker,44,45),parent,authorization,watch);
  assert.ok(opened);assert.equal(creates,1);assert.equal(opened.ticker,parent.ticker);
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

test('GE-R2 Athena loss after an open grant stops new Saints and does not invent a second grant',async()=>{
  const s=settings({galacticExplosionEnabled:true,athenaExclamationFollowUpAttacks:2});
  const mw={version:MEGA_WAVE.version,policyRevision:MEGA_WAVE.policyRevision,followUpAttacksAtEntry:2,enabledSaintsAtEntry:['Scarlet Needle','Sagittarius Justice Arrow']};
  const openParent={id:'athena-loss-ge',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Athena Exclamation',ticker:'MW-LOSS',eventTicker:'MW-LOSS',mode:s.mode,status:'open',remainingCount:1,openedAtMs:Date.now(),entryPriceCents:56,entryConfig:{megaWave:mw,athenaExclamation:{megaWaveAuthorization:mw}}};
  const h=engineHarness([openParent],s);
  await h.e.handleMegaWaveAthenaOpen(openParent);
  assert.equal(h.e.megaWaveSaintWatches.size,2);
  const closed={...openParent,status:'closed',remainingCount:0,pnlCents:-40,closedAtMs:Date.now(),closeReason:'hard_stop'};
  h.db.rows.set(closed.id,structuredClone(closed));
  const stopped=await h.e.handleMegaWaveAthenaClose(closed);
  assert.equal(stopped.status,'CHAIN_STOPPED');
  const ep=await h.db.opportunityEpisode(`MEGA-WAVE:GRANT:${closed.id}`);
  assert.equal(ep.athenaDecision.megaWaveGrant.status,'COMPLETE');
  assert.equal(h.e.megaWaveSaintWatches.size,0);
  assert.equal(h.db.episodes.size,1);
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
  assert.equal((await h.e.armStarlightStopLossWatch(paper)).reason,'parent_not_executable');
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

