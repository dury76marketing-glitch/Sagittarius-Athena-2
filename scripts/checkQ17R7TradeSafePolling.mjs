import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const r7=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
// Reproduce the exact R6 lexical-scope failure and redundant read shape
// without bundling an unrelated R6 source tree into the Railway ZIP.
const oldCount=`        const before = openNow>0 ? await this.openMemoryHunterCount() : 0;
        if(openNow>0 && Date.now()-(this.health.lastProtectionMs||0)>=1_000)await this.runProtectionSweep('fast_phase');
        const after = openNow>0 ? await this.openMemoryHunterCount() : 0;
        closed += Math.max(0, before - after);`;
const newCount=`        // R7: the before/after counts are REPORTING ONLY. R6 queried PG
        // twice on every 450ms fast-phase turn, even when no sweep ran.
        // The due predicate and protection sweep are unchanged: only skip
        // those redundant reporting reads when there is no sweep to count.
        if(openNow>0 && Date.now()-(this.health.lastProtectionMs||0)>=1_000){
          const before=await this.openMemoryHunterCount();
          await this.runProtectionSweep('fast_phase');
          const after=await this.openMemoryHunterCount();
          closed+=Math.max(0,before-after);
        }`;
assert(r7.includes(newCount));
const oldCountsSource=r7.replace(newCount,oldCount);
const r6=oldCountsSource.replace('      let openNow=0;\n','').replace('        openNow=this.protectedTickers?.size||0;','        const openNow=this.protectedTickers?.size||0;');

function fastPhaseFrom(source,ctx){
  const begin=source.indexOf('  async fastPhase(index) {');
  const end=source.indexOf('\n  async cycleLoop()',begin);
  assert(begin>=0&&end>begin,'Fast-phase method exists');
  return runInNewContext('({'+source.slice(begin,end)+'}).fastPhase',ctx);
}
async function scenario(source){
 let clock=0, countQueries=0,sweeps=0, entryEvaluations=0;
 const ctx={Date:{now(){clock+=200;return clock;}},waitUntil:async()=>{},console};
 const fast=fastPhaseFrom(source,ctx);
 const engine={running:true,settings:{systemName:'SIM'},protectedTickers:new Set(['OPEN_TICKER']),
  health:{lastProtectionMs:0},speed:{},db:{trackers:async()=>[]},
  openMemoryPriorityTickers:async()=>['OPEN_TICKER'],
  refreshRecoveryPriorityTickers:async()=>{},refreshCrashPriorityTickers:()=>{},
  recoveryPriorityTickers:new Set(),sagittariusArrowPriorityTickers:new Set(),scarletNeedleCapitalPriorityTickers:new Set(),
  pegasusRyuSeiKenCapitalPriorityTickers:new Set(),greatHornPriorityTickers:new Set(),crystalWallRecoveryPriorityTickers:new Set(),crashPriorityTickers:new Set(),
  market:{setProtectionPriority:()=>{},getQuote:()=>null,sample:()=>{}},
  learning:{observeCrashQuote:async()=>{},trackStopGuardRecovery:async()=>{}},
  evaluateEntryChain:async()=>{entryEvaluations++;return [];},
  openMemoryHunterCount:async()=>{countQueries++;return 1;},
  runProtectionSweep:async()=>{sweeps++;engine.health.lastProtectionMs=clock;},
  runPostExitResearchIfDue:async()=>{},
  };
 await fast.call(engine,0);
 return {countQueries,sweeps,entryEvaluations};
}
let originalError=null;
try{await scenario(r6);}catch(error){originalError=error;}
assert(originalError instanceof Error||originalError?.name==='ReferenceError');
assert.equal(originalError?.name,'ReferenceError','Original fast phase breaks at its first sleep decision');
assert.match(String(originalError?.message),/openNow/);
const oldCountResult=await scenario(oldCountsSource);
const after=await scenario(r7);
assert.equal(after.sweeps,oldCountResult.sweeps,'Protection scheduling unchanged versus old polling');
assert(oldCountResult.countQueries>after.countQueries,'Eliminates redundant DB reads when no sweep occurs');
assert(after.sweeps>0&&after.entryEvaluations===1,'Entry evaluation and protection still execute');
assert.equal(after.countQueries,after.sweeps*2,'Reporting counts occur only with actual protection sweeps');
console.log(JSON.stringify({test:'Q17 R7 restored fast-phase continuous monitoring and reporting-only DB reads',originalFailure:String(originalError),oldCountResult,after,readReductionPct:Math.round(100*(1-after.countQueries/oldCountResult.countQueries)),result:'PASS'}));
