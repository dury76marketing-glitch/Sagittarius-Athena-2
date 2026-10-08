import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, freshInstallSettings, sanitizeRuntimeSettings, RELEASE } from '../src/config.mjs';

test('PER1 factory saint card is the 2026-10-06 confirmed card',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-AU2-RESET-ATTACK-COLUMN-2026-10-05');
  const s=freshInstallSettings();
  for(const [min,max] of [
    ['momentumMinEntryCents','momentumMaxEntryCents'],
    ['waveMinEntryCents','waveMaxEntryCents'],
    ['recoveryMinEntryCents','recoveryMaxEntryCents'],
    ['crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents'],
    ['scarletNeedleMinEntryCents','scarletNeedleMaxEntryCents'],
    ['justiceArrowMinEntryCents','justiceArrowMaxEntryCents'],
    ['athenaExclamationMinEntryCents','athenaExclamationMaxEntryCents'],
    ['lightningPlasmaMinEntryCents','lightningPlasmaMaxEntryCents'],
  ]){
    assert.equal(s[min], 80, min);
    const expectedMax = {momentumMaxEntryCents:88,waveMaxEntryCents:88,recoveryMaxEntryCents:88,crashRecoveryMaxEntryCents:88,scarletNeedleMaxEntryCents:88,justiceArrowMaxEntryCents:88,athenaExclamationMaxEntryCents:88,lightningPlasmaMaxEntryCents:88};
    assert.equal(s[max], expectedMax[max], max);
  }
  assert.equal(s.crystalWallMinCrashCents,7);
  assert.equal(s.crystalWallMinReboundCents,3);
  assert.equal(s.crystalWallMinUpwardTicks,7);
  assert.equal(s.scarletNeedleMinCrashCents,7);
  assert.equal(s.scarletNeedleMinReboundCents,3);
  assert.equal(s.scarletNeedleMinUpwardTicks,7);
  assert.equal(s.momentumHunterMinProfitNetPerOriginalContractCents,13);
  assert.equal(s.scarletNeedleMultiply,1);
  assert.equal(s.waveSurferMultiply,1);
  assert.equal(s.athenaExclamationMinCrashCents,7);
  assert.equal(s.athenaExclamationMultiply,1);
  assert.equal(s.infinityBreakMinNetPerOriginalContractCents,13);
  assert.equal(s.athenaExclamationEnabled,true);
});

test('PER1 operator save of Scarlet 100 / 56-99 survives sanitize with a reset stamp',()=>{
  const raw={
    ...originalSettings(),
    resetTimestampMs:1790795597949,
    scarletNeedleStakeCents:100,
    scarletNeedleMinEntryCents:56,
    scarletNeedleMaxEntryCents:99,
    scarletNeedleMinCrashCents:3,
    scarletNeedleMinReboundCents:4,
    scarletNeedleMinUpwardTicks:5,
  };
  const first=sanitizeRuntimeSettings(raw);
  assert.equal(first.scarletNeedleStakeCents,100);
  assert.equal(first.scarletNeedleMinEntryCents,56);
  assert.equal(first.scarletNeedleMaxEntryCents,99);
  assert.equal(first.scarletNeedleMinCrashCents,3);
  const saved=sanitizeRuntimeSettings(first);
  assert.equal(saved.scarletNeedleStakeCents,100);
  assert.equal(saved.scarletNeedleMinReboundCents,4);
});
