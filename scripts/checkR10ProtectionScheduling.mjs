import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {SagittariusEngine} from '../src/engine.mjs';
import {OperationalMonitor} from '../src/operationalSafety.mjs';

// The REAL engine protectionLoop and REAL OperationalMonitor are exercised.
// Non-protection reference maintenance is deliberately blocked (>10s).
// Safety must remain strict: only a genuinely completed runProtectionSweep
// can refresh the worker's lastSuccess evidence. No heartbeat-only shortcut.
const engine=Object.create(SagittariusEngine.prototype);
engine.running=true;
engine.protectedTickers=new Set(['TEST-MARKET']);
engine.health={lastProtectionMs:0};
engine.operational=new OperationalMonitor();
engine.operational.requireWorker('protection');
engine.operational.initialized=true;
let completed=0,maintenanceStarted=0,maintenanceReleased=0;
engine.runProtectionSweep=()=>engine.operational.run('protection',async()=>{
  completed++;
  engine.health.lastProtectionMs=Date.now();
  return 1;
});
engine.shadowSweepPromise=Promise.resolve();
engine.lightningPlasmaScaleInPromise=Promise.resolve();
engine.lastShadowSweepAtMs=Date.now();
engine.lastLightningSweepAtMs=Date.now();
engine.lastReferenceSweepMs=0;
engine.strategy={observationWaits:true,observationRestoreState:'ready',releaseObservationWaits:async()=>{maintenanceReleased++;}};
engine.runReferenceSignalSweep=async()=>{maintenanceStarted++;await new Promise(()=>{});};
const loop=engine.protectionLoop();
await delay(12_000);
const worker=engine.operational.workerSnapshot().find(w=>w.name==='protection');
engine.running=false;
const healthy=!worker.stalled;
console.log(JSON.stringify({test:'R10 protection independent non-protection task 12s starvation',healthy,completed,maintenanceStarted,maintenanceReleased,workerStalled:worker.stalled,ageMs:Math.round(Date.now()-worker.lastSuccessMs)}));
assert.ok(maintenanceStarted>=1,'Non-protection maintenance must reproduce blocking');
assert.ok(healthy,'Protection worker must not stale while lower-priority maintenance is blocked');
assert.ok(completed>=3,'Actual protection inspection must recur with open positions');
await Promise.race([loop,delay(4000)]);
// This patch must NOT turn real missing protection evidence into a green gate.
let time=10_000;
const guard=new OperationalMonitor({clock:()=>time,wall:()=>time});
guard.requireWorker('protection');
let heldResolve;
const held=guard.run('protection',()=>new Promise(resolve=>{heldResolve=resolve;}));
await Promise.resolve();
time+=10_001;
let state=guard.workerSnapshot().find(w=>w.name==='protection');
assert.equal(state.stalled,true,'An actual unresolved protection read MUST block');
assert.equal(state.lastSuccessMs,0,'A heartbeat/in-flight protection read must not forge success');
heldResolve();await held;
state=guard.workerSnapshot().find(w=>w.name==='protection');
assert.equal(state.stalled,false,'A real completed protection check restores worker readiness');
console.log(JSON.stringify({test:'R10 no fake protection proof',unresolvedBlocks:true,completedRestores:true}));
// R9 regression: a quote-specific wake must NOT advance full-sweep freshness.
const fast=Object.create(SagittariusEngine.prototype);
fast.running=true;
fast.protectedTickers=new Set(['TEST-MARKET']);
fast.health={lastProtectionMs:42,lastQuoteProtectionMs:0};
fast.profitGuard={protectTicker:async()=>{},shouldFastWakeInfinity:()=>false};
fast.quoteProtectionQueue={enqueue:(key,task)=>{void task();return true;}};
fast.market={getQuote:()=>({}),noteProtectionEvaluation:()=>{}};
fast.protectionWakeMetrics=null;
fast.recomputeHealth=()=>{};
fast.learning={trackStopGuardRecovery:async()=>{}};
fast.db={audit:async()=>{}};
fast.quoteProtectionTimers=new Map();
fast.queueQuoteProtection('TEST-MARKET',{immediate:true});
await delay(25);
assert.equal(fast.health.lastProtectionMs,42,'Quote-specific protection forged full DB-backed inspection proof');
assert.ok(fast.health.lastQuoteProtectionMs>0,'Quote-specific inspection completion was not tracked');
console.log(JSON.stringify({test:'R10 no full-sweep proof from quote wake',fullSweepProofUnchanged:true,quoteInspectionTracked:true}));
console.log('checkR10ProtectionScheduling: PASS');
