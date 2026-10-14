import { FixtureStrategyEngine, asShadowFixture } from './helpers/shadow-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { StrategyEngine } from '../src/strategy.mjs';
import { SagittariusEngine } from '../src/engine.mjs';

function settings(){
  return {
    mode:'LIVE', liveArmed:true, engineActive:true, systemName:'s1', ownerId:'o1', resetTimestampMs:0,
    scarletNeedleEnabled:true, justiceArrowEnabled:true, waveSurferEnabled:true,
    crashRecoveryHunterEnabled:true, momentumHunterEnabled:true, lightningPlasmaEnabled:true,
    athenaExclamationEnabled:true, recoveryHunterEnabled:true,
    crashRecoveryHunterLinkEnabled:true, momentumHunterLinkEnabled:true, lightningPlasmaLinkEnabled:true,
    crashRecoveryMinEntryCents:20, crashRecoveryMaxEntryCents:60,
    momentumMinEntryCents:20, momentumMaxEntryCents:60,
    lightningPlasmaMinEntryCents:20, lightningPlasmaMaxEntryCents:60,
    crashRecoveryStakeCents:100, momentumStakeCents:100, lightningPlasmaFieldStakeCents:100,
    crashRecoveryHunterObservationMinutes:0, momentumHunterObservationMinutes:0, lightningPlasmaObservationMinutes:0,
    simFeeCents:0, startingCapitalCents:100000,
  };
}
function engine(){
  const e = new SagittariusEngine();
  e.settings = settings();
  e.db = { insertStarlightWatch: async (w)=>({revision:1, watch:w, status:w.status}), audit: async()=>{} };
  e.getLiveReady = ()=>true;
  return e;
}
function parent(concept='Scarlet Needle'){
  return { id:'p1', ticker:'T', conceptName:concept, status:'closed', closeReason:'hard_stop_loss', mode:'SIMULATION', systemName:'s1', ownerId:'o1', closedAtMs:Date.now()-1000, exitPriceCents:40, archived:false };
}

test('SA2 removed attacks cannot buy', async () => {
  const s = new FixtureStrategyEngine({ db:{audit:async()=>{}, entries:async()=>[]}, kalshi:{}, market:{}, learning:{}, getSettings:settings, getLiveReady:()=>true });
  for (const concept of ['Athena Exclamation','Recovery Hunter']) {
    assert.equal(await s.createHunter(concept, {ticker:'T', yesAsk:40, yesBid:40}, 100, 0, {}), null);
  }
});

test('SA2 Horn and Plasma cannot buy on a green path', async () => {
  const s = new FixtureStrategyEngine({ db:{audit:async()=>{}, entries:async()=>[]}, kalshi:{}, market:{}, learning:{}, getSettings:settings, getLiveReady:()=>true });
  assert.equal(await s.createHunter('Momentum Hunter', {ticker:'T', yesAsk:40, yesBid:40}, 100, 0, {legacyCompatibility:true}), null);
  assert.equal(await s.createHunter('Lightning Plasma', {ticker:'T', yesAsk:40, yesBid:40}, 100, 0, {}), null);
  assert.equal(await s.createHunter('Crash Recovery Hunter', {ticker:'T', yesAsk:40, yesBid:40}, 100, 0, {}), null);
});

test('SA2 a matching real stopped parent arms one durable Starlight watch; mismatched mode and self-chain are rejected', () => {
  const e=engine();
  const actualParent={...parent('Scarlet Needle'),mode:'LIVE'};
  assert.equal(e.armStarlightRecovery(actualParent),true);
  const ids=[...e.starlightRecoveryWatches.keys()];
  assert.equal(ids.length,1);
  assert.equal(ids[0],'STARLIGHT-RECOVERY:p1');
  assert.equal(e.armStarlightRecovery(actualParent),false,'same parent must not rearm');
  const mismatched=engine();
  assert.equal(mismatched.armStarlightRecovery(parent('Scarlet Needle')),false,'SIM parent cannot arm LIVE watch');
  assert.equal(mismatched.armStarlightRecovery({...parent('Crash Recovery Hunter'),mode:'LIVE'}),false,'Starlight cannot self-chain');
});

test('SA2 a shadow win is not a signal', () => {
  const e = engine();
  const win = parent();
  win.closeReason = 'infinity_break';
  assert.equal(e.armStarlightRecovery(win), false);
});
