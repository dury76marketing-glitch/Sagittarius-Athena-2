#!/usr/bin/env node
// R9 - synthetic operator transition proof, with no real DB or broker I/O.
// Runs in separate process to make deployment policy immutable per process.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const mark={checks:0,network:0,dbWrites:0};
if(process.env.R9_MODE_CHILD!=='1'){
  const r=spawnSync(process.execPath,[new URL(import.meta.url).pathname],{
    env:{...process.env,ALLOW_LIVE_TRADING:'true',R9_MODE_CHILD:'1'},encoding:'utf8',timeout:15000});
  assert.equal(r.status,0,`LIVE operator synthetic child failed: ${r.stderr.slice(0,400)}`);
  const out=JSON.parse(r.stdout.trim().split('\n').at(-1));
  assert(out.checks>=15 && out.network===0);
  console.log(JSON.stringify({kind:'SIMULATED_OPERATOR_LIVE_TRANSITION',...out}));
}else{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const {env}=await import('../src/config.mjs');
  assert.equal(env.allowLiveTrading,true);mark.checks++;
  const obj={settings:{mode:'SIMULATION',liveArmed:false,liveOwnerAuthorized:false,
      engineActive:true,ownerId:'R9_LAB_OWNER',systemName:'R9_LAB',resetTimestampMs:0},
    cloneIdentity:{deploymentBound:true},health:{degraded:false},db:{audit:async()=>{}},
    runtimeSettingsSafetyRevision:13,
    raiseRuntimeSafetyFence(patch){this.runtimeSettingsSafetyRevision++;this.settings={...this.settings,...patch};return this.runtimeSettingsSafetyRevision;},
    queueRuntimeSettingsMutation:async(fn)=>fn(),
    async testConnection({authenticate}={}){assert.equal(authenticate,true);mark.checks++;
      return {balance:{balance:12345,portfolio_value:0},balanceObservedAtMs:Date.now(),balanceGeneration:7};},
    async reconcileBroker({authorityMode,balanceProof}={}){assert.equal(authorityMode,'LIVE');mark.checks++;
      assert.equal(balanceProof.value.balance,12345);mark.checks++;return true;},
    async runProtectionSweep(source){assert.equal(source,'live_arm_check');mark.checks++;},
    recomputeHealth(){this.health.degraded=false;},
    liveArmHealthDenials(settings){assert.equal(settings.mode,'LIVE');assert.equal(settings.liveArmed,false);mark.checks+=2;return [];},
    async persistRuntimeSettings(next){this.settings=next;mark.dbWrites++;return {superseded:false,settings:next};},
    cancelLiveAutoRearm(){},requestScan(){mark.checks++;},
    };
  // Exact old operator confirmation is mandatory, never a GUI-only gate.
  await assert.rejects(()=>SagittariusEngine.prototype.setMode.call(obj,'LIVE','NO'),/ENABLE LIVE TRADING/);mark.checks++;
  assert.equal(obj.settings.mode,'SIMULATION');mark.checks++;
  const live=await SagittariusEngine.prototype.setMode.call(obj,'LIVE','ENABLE LIVE TRADING');
  assert.equal(live.mode,'LIVE');mark.checks++;
  assert.equal(live.liveArmed,true);mark.checks++;
  assert.equal(live.liveOwnerAuthorized,true);mark.checks++;
  assert.equal(mark.dbWrites,1);mark.checks++;
  // Deliberate operator SIM switch persists disarm rather than masking old LIVE.
  const sim=await SagittariusEngine.prototype.setMode.call(obj,'SIMULATION');
  assert.equal(sim.mode,'SIMULATION');mark.checks++;
  assert.equal(sim.liveArmed,false);mark.checks++;
  assert.equal(mark.dbWrites,2);mark.checks++;
  console.log(JSON.stringify(mark));
}
