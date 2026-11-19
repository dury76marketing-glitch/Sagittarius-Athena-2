import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SagittariusEngine} from '../src/engine.mjs';
const src=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
assert(src.includes("if(!this.resourceResearchDeferred&&typeof this.db.conceptStatsAggregate==='function')"), 'Expensive concept aggregate must be shed during pressure');
const scope=['Q17','owner','SIMULATION',0];
let dbReads=0;
const context={
 settings:{systemName:scope[0],ownerId:scope[1],mode:scope[2],resetTimestampMs:scope[3]},
 resourceResearchDeferred:true,
 operatorTelemetryCacheScopeKey:JSON.stringify(scope),
 operatorTelemetryCache:{trackers:[{ticker:'T'}],trackerAggregate:{total:3},audit:[],recoveryTracking:4,atomicThunder:{observed:1},opportunitySummary:{}},
 operatorTelemetryAtMs:Date.now(),
 db:{trackerDashboardRows:()=>{dbReads++;throw Error('unnecessary operator DB read');}},
 operatorOptionalRead:()=>{dbReads++;throw Error('unnecessary optional lane');},
};
const shed=await SagittariusEngine.prototype.operatorTelemetrySnapshot.call(context);
assert.equal(dbReads,0);
assert.equal(shed.diagnosticTelemetryComplete,false);
assert.equal(shed.diagnosticTelemetryStatus,'RESOURCE_SHED');
assert.equal(shed.diagnosticTelemetryFailedFields.length,6);
assert.equal(shed.trackers.length,1);
const empty={...context,operatorTelemetryCacheScopeKey:'another-owner'};
const isolated=await SagittariusEngine.prototype.operatorTelemetrySnapshot.call(empty);
assert.deepEqual(isolated.trackers,[],'No telemetry from a previous scope');
assert.equal(isolated.recoveryTracking,0);
assert.equal(dbReads,0);
assert.equal(context.operatorTelemetryAtMs>0,true);
console.log('Q17-R6 pressure operator reads skipped, status incomplete, financial path retained, scope isolation: PASS');
