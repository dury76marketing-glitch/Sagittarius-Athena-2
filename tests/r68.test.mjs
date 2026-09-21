import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Database } from '../src/db.mjs';
import { SagittariusEngine, OPERATOR_PLANE_ISOLATION } from '../src/engine.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

function compactHarness(){
  const e=Object.create(SagittariusEngine.prototype);
  e.decorateEntry=(x)=>x;
  return e;
}

test('R68 OPI1 compact dashboard entries retain operator truth but strip unbounded JSON graphs',()=>{
  const e=compactHarness();
  const huge='UNBOUNDED_SENTINEL_'.repeat(8000);
  const raw={
    id:'E',ticker:'T',eventTicker:'EV',marketTitle:'Market',conceptName:'Recovery Hunter',executionAttackName:'Crystal Wall',mode:'SIMULATION',status:'open',
    entryPriceCents:40,currentPriceCents:45,currentBidCents:45,currentAskCents:46,peakPriceCents:47,stopPriceCents:5,count:2,remainingCount:2,pnlCents:10,positionPnlCents:18,
    openedAtMs:1,updatedAtMs:2,dataState:'LIVE',quoteAgeMs:10,gameMinutes:21,
    aurora:{version:'AURORA-EXECUTION-V2',frozen:true,damageControlPercent:95,dangerPriceCents:5,huge},
    entryConfig:{profitAuthority:'INFINITY-BREAK',infinityBreak:{version:'IB1',minimumNetPerOriginalContractCents:15,huge},athena:{huge}},
    postExitCurrentPriceCents:null,atomicThunderBoltId:null,athenaSelectedAttack:null,
    virtualExecution:{fullPositionExecutable:true,executableAverageBidCents:45,executableCount:2,requiredCount:2,huge},
    profitGuard:{huge},stopGuardState:{huge},feederState:{huge},postExitState:{huge},huge,
  };
  const out=e.compactDashboardEntry(raw);const text=JSON.stringify(out);
  assert.equal(OPERATOR_PLANE_ISOLATION.version,'OPI1');
  assert.equal(out.id,'E');assert.equal(out.currentBidCents,45);assert.equal(out.aurora.damageControlPercent,95);
  assert.equal(out.entryConfig.infinityBreak.minimumNetPerOriginalContractCents,15);assert.equal(out.virtualExecution.fullPositionExecutable,true);
  assert.equal(text.includes('UNBOUNDED_SENTINEL'),false);
  assert.ok(Buffer.byteLength(text)<10_000,`compact row unexpectedly large: ${Buffer.byteLength(text)}`);
});

test('R68 OPI1 Athena dashboard projection removes story/history graphs while retaining decision counters',()=>{
  const e=Object.create(SagittariusEngine.prototype);
  const huge='ATHENA_HISTORY_SENTINEL_'.repeat(5000);
  const out=e.compactAthenaForDashboard({version:'ATHENA-X',decisions:9,fire:4,watch:3,reject:2,soul:{version:'S1',openStories:7,stories:[huge],ledger:{sealed:3}},memory:{version:'M',entryRows:700,load:{state:'ready'}},lastDecision:{decision:'FIRE',selectedAttack:'Recovery Hunter',ranking:[{expectedNetPerOriginalContractCents:8,targetHitProbability:.7,huge}],huge}});
  const text=JSON.stringify(out);
  assert.equal(out.decisions,9);assert.equal(out.fire,4);assert.equal(out.soul.openStories,7);assert.equal(out.lastDecision.decision,'FIRE');
  assert.equal(text.includes('ATHENA_HISTORY_SENTINEL'),false);assert.ok(Buffer.byteLength(text)<10_000);
});

test('R68 OPI1 slow operator telemetry is single-flight and cached for ten seconds',async()=>{
  const e=Object.create(SagittariusEngine.prototype);e.settings={systemName:'S'};e.operatorTelemetryCache=null;e.operatorTelemetryAtMs=0;e.operatorTelemetryPromise=null;
  const calls={tracker:0,summary:0,audit:0,recovery:0,atomic:0,opportunity:0};
  e.db={
    async trackerDashboardRows(){calls.tracker++;await new Promise(r=>setTimeout(r,5));return[];},async trackerSummary(){calls.summary++;return{};},async recentAudit(){calls.audit++;return[];},
    async recoveryTrackingCount(){calls.recovery++;return 0;},async atomicThunderStats(){calls.atomic++;return{};},async opportunitySummary(){calls.opportunity++;return{};},
  };
  const [a,b,c]=await Promise.all([e.operatorTelemetrySnapshot(),e.operatorTelemetrySnapshot(),e.operatorTelemetrySnapshot()]);
  assert.strictEqual(a,b);assert.strictEqual(b,c);assert.deepEqual(calls,{tracker:1,summary:1,audit:1,recovery:1,atomic:1,opportunity:1});
  await e.operatorTelemetrySnapshot();assert.deepEqual(calls,{tracker:1,summary:1,audit:1,recovery:1,atomic:1,opportunity:1});
  await e.operatorTelemetrySnapshot({force:true});assert.deepEqual(calls,{tracker:2,summary:2,audit:2,recovery:2,atomic:2,opportunity:2});
});

test('R68 dashboard and trading-log DB readers use compact projections instead of select-star hydration',async()=>{
  const db=Object.create(Database.prototype);const sql=[];
  db.pool={async query(q){sql.push(String(q));return{rows:[],rowCount:0};}};
  await db.dashboardOpenEntries('S');await db.dashboardRecentClosedHunters('S',{limit:100});await db.tradingLogRows('S',{limit:5000});await db.archiveSimulation('S');
  assert.equal(sql.slice(0,3).some(q=>/select\s+\*/i.test(q)),false);
  assert.ok(sql[0].includes('jsonb_build_object'));assert.ok(sql[0].includes("entry_config->'aurora'"));assert.ok(sql[0].includes("post_exit_state->'bestExecutableBidCents'"));
  assert.equal(/returning\s+id/i.test(sql[3]),false,'simulation archive must not materialize every archived row');
});

test('R68 full-history trading log path consumes compact log rows and never calls generic 5000-row select-star loader',async()=>{
  const e=Object.create(SagittariusEngine.prototype);e.settings={systemName:'S',resetTimestampMs:0,startingCapitalCents:100000,simFeeCents:2};
  let compact=0,full=0;e.db={async tradingLogRows(){compact++;return[];},async entries(){full++;throw new Error('generic entries loader must not run');}};
  e.strategy={async simulationAvailableCashCents(){return 100000;}};e.quoteView=()=>({priceCents:0});e.openUnrealized=()=>0;
  const p=await e.performance({fullHistory:true});assert.equal(compact,1);assert.equal(full,0);assert.equal(p.openHunters,0);
});

test('R68 100 pathological trade rows stay bounded after operator projection',()=>{
  const e=compactHarness();const huge='ROW_SENTINEL_'.repeat(10000);const rows=[];
  for(let i=0;i<100;i++)rows.push(e.compactDashboardEntry({id:`E${i}`,ticker:`T${i}`,eventTicker:`EV${i}`,marketTitle:'x',conceptName:'Recovery Hunter',mode:'SIMULATION',status:'closed',entryPriceCents:40,exitPriceCents:55,currentPriceCents:55,currentBidCents:55,currentAskCents:56,peakPriceCents:60,stopPriceCents:4,count:2,remainingCount:0,pnlCents:30,positionPnlCents:30,openedAtMs:i,closedAtMs:i+1,updatedAtMs:i+1,dataState:'FINALIZED',entryConfig:{profitAuthority:'INFINITY-BREAK',infinityBreak:{version:'IB1',minimumNetPerOriginalContractCents:15},huge},profitGuard:{huge},stopGuardState:{huge},postExitState:{huge}}));
  const text=JSON.stringify(rows);assert.equal(text.includes('ROW_SENTINEL'),false);assert.ok(Buffer.byteLength(text)<180_000,`100-row dashboard payload too large: ${Buffer.byteLength(text)}`);
});

test('R68 server and browser explicitly coalesce slow-client UI work instead of accumulating stale snapshots',async()=>{
  const server=await readFile(resolve(root,'src/server.mjs'),'utf8');const app=await readFile(resolve(root,'public/app.js'),'utf8');const engine=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  assert.ok(server.includes('blockedClients=new WeakSet()'));assert.ok(server.includes("r.once('drain'"));assert.ok(server.includes('recordOperatorPayload?.'));
  assert.ok(app.includes('scheduleRender(JSON.parse(e.data))'));assert.ok(app.includes('requestAnimationFrame'));assert.ok(app.includes('CONTROL_FINGERPRINT'));
  assert.ok(engine.includes('slowTelemetryTtlMs:10_000'));assert.ok(engine.includes('recent:Array.isArray(entryPipelineFull.recent)?entryPipelineFull.recent.slice(0,10)'));
  assert.ok(engine.includes('const {states:_operatorCrashStates,...crashLearning}=crashLearningFull'));
});

test('homepage scoreboard counts executable fleet hunters and drops Crystal Wall paper',async()=>{
  const {EXECUTABLE_HUNTER_CONCEPTS}=await import('../src/doctrine.mjs');
  assert.equal(EXECUTABLE_HUNTER_CONCEPTS.has('Athena Exclamation'),true);
  assert.equal(EXECUTABLE_HUNTER_CONCEPTS.has('Scarlet Needle'),true);
  assert.equal(EXECUTABLE_HUNTER_CONCEPTS.has('Recovery Hunter'),true);
  assert.equal(OPERATOR_PLANE_ISOLATION.maximumClosedRows,500);
  const e=Object.create(SagittariusEngine.prototype);
  e.settings={systemName:'LIBRA',ownerId:'sagittarius-main',mode:'SIMULATION',resetTimestampMs:1000,startingCapitalCents:100000,simFeeCents:2};
  e.quoteView=()=>({priceCents:50});e.openUnrealized=()=>0;
  e.strategy={async simulationAvailableCashCents(){return 100000;}};
  let fleetLog=0;
  e.db={
    async performanceAggregate(){throw new Error('host-only aggregate must not score the homepage');},
    async openEntries(){throw new Error('host-only open reader must not score the homepage');},
    async recentClosedHunters(){throw new Error('host-only closed reader must not score the homepage');},
    async conceptStatsAggregate(){return[];},
    async performanceAggregateFleet(){return{closed_hunters:2,open_hunters:1,wins:2,losses:0,scratches:0,closed_realized_cents:521,partial_realized_cents:0,day_realized_cents:521,week_realized_cents:521,month_realized_cents:521,year_realized_cents:521,simulation_ledger_pnl_cents:521};},
    async dashboardOpenEntriesFleet(){return[
      {conceptName:'Athena Exclamation',status:'open',pnlCents:0,mode:'SIMULATION',count:1,remainingCount:1,entryPriceCents:45,entryFeeCents:2,updatedAtMs:2000},
      {conceptName:'Recovery Hunter',status:'open',pnlCents:-80,mode:'SIMULATION',count:1,remainingCount:1,entryPriceCents:40,entryFeeCents:0,updatedAtMs:2000},
    ];},
    async dashboardRecentClosedHuntersFleet(){return[
      {conceptName:'Athena Exclamation',status:'closed',pnlCents:300,closedAtMs:2000},
      {conceptName:'Scarlet Needle',status:'closed',pnlCents:221,closedAtMs:2000},
      {conceptName:'Recovery Hunter',status:'closed',pnlCents:-900,closedAtMs:2000},
    ];},
    async conceptStatsAggregateFleet(){return[];},
    async tradingLogRows(){throw new Error('single-room trading log must not be used when fleet reader exists');},
    async tradingLogRowsFleet(){fleetLog++;return[
      {conceptName:'Athena Exclamation',status:'closed',archived:false,pnlCents:300,systemName:'ARIES',closedAtMs:2000,openedAtMs:1500},
      {conceptName:'Scarlet Needle',status:'closed',archived:false,pnlCents:221,systemName:'TAURUS',closedAtMs:2000,openedAtMs:1600},
      {conceptName:'Recovery Hunter',status:'closed',archived:false,pnlCents:-900,systemName:'LIBRA',closedAtMs:2000,openedAtMs:1700},
    ];},
    async entries(){throw new Error('generic entries loader must not run');},
  };
  const dash=await e.performance({dashboard:true});
  assert.equal(dash.open.length,2);
  assert.equal(dash.open.some((row)=>row.conceptName==='Recovery Hunter'),true);
  assert.equal(dash.closed.length,3);
  assert.equal(dash.closed.some((row)=>row.conceptName==='Recovery Hunter'),true);
  const hist=await e.performance({fullHistory:true});
  assert.equal(fleetLog,1);
  assert.equal(hist.closed.length,3);
  assert.equal(hist.hunters.length,3);
});

test('R68 diagnostics explicitly restore full open-position and Athena fidelity outside the compact SSE path',async()=>{
  const src=await readFile(resolve(root,'src/engine.mjs'),'utf8');
  const at=src.indexOf('async diagnostics()');const end=src.indexOf('async tradingLogText()',at);const d=src.slice(at,end);
  assert.ok(d.includes('this.db.openEntries(this.settings.systemName)'));assert.ok(d.includes('this.athena?.summary?.()||base.athena'));assert.ok(d.includes('diagnosticOpenHunters'));
});
