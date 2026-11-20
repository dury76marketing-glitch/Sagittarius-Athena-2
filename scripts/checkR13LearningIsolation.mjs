import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(process.argv[2]||path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const imp=p=>import(pathToFileURL(path.join(root,p)).href);
const {SagittariusEngine}=await imp('src/engine.mjs');
const {LearningEngine}=await imp('src/learning.mjs');
const tests=[];const test=async(name,fn)=>{try{await fn();tests.push({name,pass:true});console.log('PASS '+name);}catch(e){tests.push({name,pass:false,error:String(e?.message||e)});console.error('FAIL '+name+': '+e?.message);}};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
await test('historical-recovery-batch-bounded-and-round-robin-across-100-rows',async()=>{
 const rows=Array.from({length:100},(_,i)=>({id:`obs${i}`,ticker:`KX-${i}`,prices:[],trough_cents:45,entry_price_cents:55,exit_at_ms:Date.now()-60000}));
 const touched=[];const l=Object.create(LearningEngine.prototype);l.systemName='SGT-TEST';l.recoveryResearchCursor=0;
 l.db={recoveryObservations:async()=>rows,updateRecoveryObservation:async(id)=>touched.push(id)};
 const quotes=new Map(rows.map(o=>[o.ticker,{yesBid:53,yesAsk:55,status:'active'}]));
 await l.trackRecovery(quotes,{recoveryTrackingHours:24},{maximum:32});
 assert.equal(touched.length,32,'research database writes must be bounded to 32 per pass');
 await l.trackRecovery(quotes,{recoveryTrackingHours:24},{maximum:32});
 assert.equal(touched.length,64);assert.equal(new Set(touched).size,64,'round-robin fair progress');
 await l.trackRecovery(quotes,{recoveryTrackingHours:24},{maximum:32});
 await l.trackRecovery(quotes,{recoveryTrackingHours:24},{maximum:32});
 assert.equal(new Set(touched).size,100,'all eligible rows eventually examined');
});
await test('stop-guard-learning-bounded-without-losing-signal-authority',async()=>{
 const rows=Array.from({length:80},(_,i)=>({id:`sg${i}`,ticker:`SG-${i}`,state:{},trigger_at_ms:Date.now(),entry_price_cents:55,tracked_count:1,original_count:1,base_realized_pnl_cents:0,entry_fee_cents:0}));
 const touched=[];const l=Object.create(LearningEngine.prototype);l.systemName='SGT-TEST';l.stopGuardResearchCursor=0;l.stopGuardRecoveryTrackingLocks=new Set();
 l.db={stopGuardRecoveryEpisodes:async()=>rows,updateStopGuardRecoveryEpisode:async(id)=>touched.push(id)};
 const market={getQuote:()=>null,quoteAgeMs:()=>0,refreshTicker:async()=>null};
 await l.trackStopGuardRecovery(new Map(),{recoveryTrackingHours:24},market,{maximum:24});
 assert.equal(touched.length,24);
 await l.trackStopGuardRecovery(new Map(),{recoveryTrackingHours:24},market,{maximum:24});
 assert.equal(new Set(touched).size,48);
 for(let i=0;i<2;i++)await l.trackStopGuardRecovery(new Map(),{recoveryTrackingHours:24},market,{maximum:24});
 assert.equal(new Set(touched).size,80);
});
await test('optional-research-singleflight-coalesces-scan-wakes',async()=>{
 let calls=0,resolveWorker;
 const e=Object.create(SagittariusEngine.prototype);e.running=true;e.resourceResearchDeferred=false;
 e.runOptionalResearchCycle=async()=>{calls++;await new Promise(resolve=>{resolveWorker=resolve;});};
 assert.equal(e.scheduleOptionalScanResearch('full_scan'),true);
 assert.equal(e.scheduleOptionalScanResearch('fast_phase'),false,'duplicate queued wake');
 await sleep(8);
 assert.equal(calls,1);
 assert.equal(e.scheduleOptionalScanResearch('fast_phase'),false,'duplicate active worker');
 assert.equal(e.optionalResearchStats.scheduled,1);
 assert.ok(e.optionalResearchStats.coalesced>=2);
 resolveWorker();await sleep(8);
 assert.equal(e.optionalResearchRunning,false);
});
await test('optional-research-step-error-is-contained-and-next-step-progresses',async()=>{
 const visited=[],e=Object.create(SagittariusEngine.prototype);
 e.running=true;e.settings={systemName:'SGT1',ownerId:'o',mode:'SIMULATION',resetTimestampMs:1};
 e.resourceResearchDeferred=false;
 e.market={quotes:new Map()};e.db={audit:async()=>{visited.push('audit');},trackers:async()=>[]};
 e.learning={trackRecovery:async()=>{visited.push('recovery');throw Error('isolated research PG error');},
 trackStopGuardRecovery:async()=>visited.push('stopguard'),learnMarketDrops:async()=>visited.push('drops'),
 aggregatePatterns:async()=>visited.push('patterns'),aggregateStopGuardProfiles:async()=>visited.push('profiles'),learnDurations:async()=>visited.push('durations')};
 e.runPostExitResearchIfDue=async()=>visited.push('postexit');
 await e.runOptionalResearchCycle('test');
 assert.deepEqual(visited,['recovery','audit','stopguard','postexit','drops','patterns','profiles','durations']);
 assert.equal(e.optionalResearchStats.failed,1);
});
await test('changed-mode-or-reset-stops-obsolete-research-followup',async()=>{
 const visited=[],e=Object.create(SagittariusEngine.prototype);
 e.running=true;e.settings={systemName:'SGT1',ownerId:'o',mode:'LIVE',resetTimestampMs:77};
 e.market={quotes:new Map()};e.db={audit:async()=>{},trackers:async()=>[]};
 e.learning={trackRecovery:async()=>{visited.push('recovery');e.settings={...e.settings,resetTimestampMs:88};},
 trackStopGuardRecovery:async()=>visited.push('unsafe-next-step')};
 await e.runOptionalResearchCycle('test');
 assert.deepEqual(visited,['recovery']);
});
await test('historical-research-not-authoritative-for-old-claims',async()=>{
 const {executionSettingsHash,executionSettingsHashMatches}=await imp('src/shadowProtocol.mjs');
 const s={systemName:'SGT1',ownerId:'o',mode:'LIVE',resetTimestampMs:77,recoveryTrackingHours:24};
 const legacy=executionSettingsHash(s),next={...s,recoveryTrackingHours:72};
 assert.equal(executionSettingsHashMatches(legacy,next,'Crash Recovery Hunter'),false,'no retroactive release of V2 claim');
 const scoped=executionSettingsHash(s,'Crash Recovery Hunter');
 assert.equal(executionSettingsHashMatches(scoped,next,'Crash Recovery Hunter'),true,'new active chain not blocked by unrelated research');
 // Legacy Recovery Hunter retains its full-card research window.
 assert.equal(executionSettingsHashMatches(legacy,next,'Recovery Hunter'),false);
});
console.log(JSON.stringify({suite:'R13_BOUNDED_LEARNING_ISOLATION',root,passed:tests.filter(t=>t.pass).length,failed:tests.filter(t=>!t.pass).length,failures:tests.filter(t=>!t.pass),nativePostgres:false,brokerOrders:0}));
if(tests.some(t=>!t.pass))process.exitCode=1;
