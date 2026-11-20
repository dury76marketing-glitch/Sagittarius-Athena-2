import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const imp=p=>import(pathToFileURL(path.join(root,p)).href);
const {SagittariusEngine}=await imp('src/engine.mjs');
const {freshInstallSettings}=await imp('src/config.mjs');
const {executionSettingsHash,executionSettingsHashMatches,legacyExecutionSettingsHash}=await imp('src/shadowProtocol.mjs');
const tests=[];
const test=async (name,fn)=>{try{await fn();tests.push({name,passed:true});console.log('PASS '+name);}catch(e){tests.push({name,passed:false,error:String(e?.message||e)});console.error('FAIL '+name+': '+String(e?.message||e));}};
const original={...freshInstallSettings(),systemName:'R13-CLONE-A',ownerId:'owner-r13',mode:'LIVE',liveArmed:true,engineActive:true,crashRecoveryHunterEnabled:true,starlightExtinctionRealTradeEnabled:true,resetTimestampMs:1777777000000};
const change=(s,key,v)=>({...s,[key]:v});
await test('starlight-unrelated-Great-Horn-Multiply-must-not-revoke-watch',()=>{
  const h=executionSettingsHash(original,'Crash Recovery Hunter');
  assert.ok(executionSettingsHashMatches(h,change(original,'greatHornMultiply',Number(original.greatHornMultiply)+1),'Crash Recovery Hunter'));
});
await test('starlight-unrelated-learning-window-must-not-revoke-watch',()=>{
  const h=executionSettingsHash(original,'Crash Recovery Hunter');
  assert.ok(executionSettingsHashMatches(h,change(original,'recoveryTrackingHours',Number(original.recoveryTrackingHours)+1),'Crash Recovery Hunter'));
});
await test('starlight-own-Multiply-and-operator-LIVE-scope-still-invalidate',()=>{
  const h=executionSettingsHash(original,'Crash Recovery Hunter');
  assert.equal(executionSettingsHashMatches(h,change(original,'crashRecoveryHunterMultiply',Number(original.crashRecoveryHunterMultiply)+1),'Crash Recovery Hunter'),false);
  for(const [k,v] of [['maxSpreadCents',Number(original.maxSpreadCents)+1],['mode','SIMULATION'],['resetTimestampMs',original.resetTimestampMs+1000],['ownerId','other']])
    assert.equal(executionSettingsHashMatches(h,change(original,k,v),'Crash Recovery Hunter'),false,k);
});
await test('capital-family-A-scoped-unrelated-Arrow-mutations',()=>{
  for(const concept of ['Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery']){
    const h=executionSettingsHash(original,concept);
    assert.ok(executionSettingsHashMatches(h,change(original,'sagittariusArrowMultiply',Number(original.sagittariusArrowMultiply)+1),concept),concept);
  }
});
await test('capital-family-B-scoped-unrelated-Great-Horn-mutations',()=>{
  for(const concept of ['Sagittarius Arrow Recovery','Scarlet Needle Recovery','Pegasus Ryu Sei Ken Recovery']){
    const h=executionSettingsHash(original,concept);
    assert.ok(executionSettingsHashMatches(h,change(original,'greatHornMultiply',Number(original.greatHornMultiply)+1),concept),concept);
  }
});
await test('capital-family-ancestral-and-own-card-mutating-is-denied',()=>{
  for(const [concept,key] of [['Lightning Plasma','lightningPlasmaMultiply'],['Great Horn Recovery','greatHornMultiply'],['Crystal Wall Recovery','crystalWallRecoveryMultiply'],['Sagittarius Arrow Recovery','sagittariusArrowMultiply'],['Scarlet Needle Recovery','scarletNeedleCapitalMultiply'],['Pegasus Ryu Sei Ken Recovery','pegasusRyuSeiKenCapitalMultiply']]){
    const h=executionSettingsHash(original,concept);
    assert.equal(executionSettingsHashMatches(h,change(original,key,Number(original[key])+1),concept),false,concept);
  }
  const cw=executionSettingsHash(original,'Crystal Wall Recovery');
  assert.equal(executionSettingsHashMatches(cw,change(original,'greatHornMultiply',Number(original.greatHornMultiply)+1),'Crystal Wall Recovery'),false,'CW parent setting');
  const sn=executionSettingsHash(original,'Scarlet Needle Recovery');
  assert.equal(executionSettingsHashMatches(sn,change(original,'sagittariusArrowMultiply',Number(original.sagittariusArrowMultiply)+1),'Scarlet Needle Recovery'),false,'SN parent setting');
});
await test('legacy-full-fingerprint-never-silently-upgraded',()=>{
  const old=executionSettingsHash(original);
  const changed=change(original,'greatHornMultiply',Number(original.greatHornMultiply)+1);
  assert.equal(executionSettingsHashMatches(old,changed,'Crash Recovery Hunter'),false);
  assert.equal(executionSettingsHashMatches(legacyExecutionSettingsHash(original),changed,'Crash Recovery Hunter'),false);
  const h=executionSettingsHash(original,'Crash Recovery Hunter');
  assert.equal(executionSettingsHashMatches(h,original,'Great Horn Recovery'),false,'no cross-attack replay');
});
await test('starlight-original-resume-enters-verified-seat-boundary-after-unrelated-card-edit',async()=>{
  const w={status:'EXECUTING',mode:'LIVE',virtualGroupVersion:'SC1-REAL-STARLIGHT-V1',revision:4,authorizationId:'r13-watch',parentEntryId:'r13-parent',ticker:'KX-R13',systemName:original.systemName,ownerId:original.ownerId,resetEpoch:original.resetTimestampMs,maximumSeats:2,groupSettingsHash:executionSettingsHash(original,'Crash Recovery Hunter'),consumePending:false};
  let seats=0,autoBuys=0;const e=Object.create(SagittariusEngine.prototype);
  e.settings=change(original,'greatHornMultiply',Number(original.greatHornMultiply)+1);e.starlightRecoveryWatches=new Map([[w.authorizationId,w]]);
  e.starlightRecoveryInFlight=new Set();e.starlightRecoveryQuoteJobs=new Map();e.starlightRecoveryStats={};e.starlightRecoveryRuntime=()=>({});
  e.starlightScopeMatches=()=>true;e.shadowEntryGate=()=>({allowed:true});e.claimStarlightRecoveryTicker=()=>()=>{};
  e.db={starlightWatch:async()=>({status:'EXECUTING',revision:w.revision,watch:w}),starlightCapitalSeats:async()=>{seats++;return[];},rearmStarlightAfterVerifiedUnsubmittedRejection:async()=>null};
  e.market={};e.strategy={createHunter:async()=>{autoBuys++;throw Error('unauthorized BUY');}};
  await e.resumeStarlightShadowGroups({maximum:1,seatBudget:1});
  assert.equal(seats,1,'unrelated card change must reach seat/proof reconciliation');assert.equal(autoBuys,0,'no broker mutations permitted');
});
function scanContext({slowResearch=false,researchError=false}={}){
  const events=[];const e=Object.create(SagittariusEngine.prototype);
  Object.assign(e,{speed:{},health:{lastProtectionMs:0},running:true,settings:{...original,mode:'SIMULATION'},
    protectedTickers:new Set(), recoveryPriorityTickers:new Set(),sagittariusArrowPriorityTickers:new Set(),
    scarletNeedleCapitalPriorityTickers:new Set(),pegasusRyuSeiKenCapitalPriorityTickers:new Set(),
    greatHornPriorityTickers:new Set(),crystalWallRecoveryPriorityTickers:new Set(),crashPriorityTickers:new Set(),lightningPriorityTickers:new Map(),
    market:{quotes:new Map(),setProtectionPriority(){},discover:async()=>[{ticker:'R13-EVENT-1',quoteAtMs:Date.now(),status:'active'}],sample(){},getQuote(){return null;}},
    openMemoryPriorityTickers:async()=>[],refreshRecoveryPriorityTickers:async()=>{},refreshCrashPriorityTickers:()=>{},
    persistTrackers:async()=>new Map(),openMemoryHunterCount:async()=>0,runProtectionSweep:async()=>{},
    learning:{
      trackRecovery:async()=>{events.push('research_start');if(slowResearch)return new Promise(()=>{});if(researchError)throw Error('pg_research_failure');events.push('research_finished');},
      trackStopGuardRecovery:async()=>{},observeCrashQuote:async()=>{},learnMarketDrops:async()=>{},aggregatePatterns:async()=>{},
      aggregateStopGuardProfiles:async()=>{},learnDurations:async()=>{},
    },evaluateEntryChain:async()=>{events.push('entry_evaluation');return[]},
    runPostExitResearchIfDue:async()=>{},db:{trackers:async()=>[],audit:async()=>{}},
    reconcileBroker:async()=>true,snapshot:async()=>{},recomputeHealth:()=>{},recordError:(kind,err)=>events.push(`diagnostic:${kind}:${err?.message}`),
  });return {e,events};
}
await test('historical-learning-PG-exception-cannot-cancel-entry',async()=>{
  const {e,events}=scanContext({researchError:true});
  const r=await Promise.race([e.fullScan().then(()=>true).catch(()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),120))]);
  assert.equal(r,true,'fullScan should finish despite optional historical-learning PG exception');
  assert.ok(events.includes('entry_evaluation'),'new entry evaluation not reached');
  await new Promise(resolve=>setTimeout(resolve,10));
});
await test('hung-historical-learning-IO-cannot-starve-entry-or-scan',async()=>{
  const {e,events}=scanContext({slowResearch:true});
  const r=await Promise.race([e.fullScan().then(()=>true).catch(()=>false),new Promise(resolve=>setTimeout(()=>resolve(false),120))]);
  assert.equal(r,true,'fullScan blocked by optional research');assert.ok(events.includes('entry_evaluation'),'entry scan blocked');
});
await test('scoped-LINK-capital-switch-and-price-geometry-still-revoke',()=>{
  for(const [concept,key] of [
    ['Crash Recovery Hunter','starlightExtinctionRealTradeEnabled'],
    ['Crash Recovery Hunter','crashRecoveryHunterLinkEnabled'],
    ['Lightning Plasma','lightningPlasmaMinEntryCents'],
    ['Great Horn Recovery','greatHornLinkEnabled'],
    ['Sagittarius Arrow Recovery','sagittariusArrowMinUpwardTicks'],
    ['Crystal Wall Recovery','crystalWallRecoveryMaxSpreadCents'],
  ]){
    const hash=executionSettingsHash(original,concept),old=original[key];
    const changed=typeof old==='boolean'?!old:Number(old)+1;
    assert.equal(executionSettingsHashMatches(hash,change(original,key,changed),concept),false,`${concept}:${key}`);
  }
});
await test('dashboard-does-not-misstate-Starlight-LIVE-or-LP-parent-route',async()=>{
  const fs=await import('node:fs');
  const js=fs.readFileSync(path.join(root,'public/app.js'),'utf8');
  assert.ok(!js.includes('Q-17 never submits real broker orders.'),'Starlight LIVE path described as SIM only');
  assert.ok(!js.includes("authority='Independent verified Athena SHADOW-loss CAPITAL attack."),'old independent LP route overrides current doctrine');
  assert.ok(js.includes('Lightning Plasma V5 requires a verified, still-open CAPITAL Starlight parent'));
});
console.log(JSON.stringify({suite:'R13_CONNECTED_EXECUTION_INDEPENDENCE',originalOrCandidate:root,passed:tests.filter(x=>x.passed).length,failed:tests.filter(x=>!x.passed).length,failures:tests.filter(x=>!x.passed),nativePostgres:false,brokerOrders:0}));
if(tests.some(x=>!x.passed))process.exitCode=1;
