import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, freshInstallSettings, sanitizeRuntimeSettings, RELEASE } from '../src/config.mjs';

test('PER1 factory saint card is the 2026-10-06 confirmed card',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-MW1-R4-ANDROMEDA-AUDIT-2026-10-14');
  const s=freshInstallSettings();
  const expected = {
    momentumMinEntryCents:74,momentumMaxEntryCents:88,
    waveMinEntryCents:74,waveMaxEntryCents:88,
    recoveryMinEntryCents:74,recoveryMaxEntryCents:88,
    crashRecoveryMinEntryCents:45,crashRecoveryMaxEntryCents:80,
    scarletNeedleMinEntryCents:70,scarletNeedleMaxEntryCents:79,
    justiceArrowMinEntryCents:70,justiceArrowMaxEntryCents:79,
    athenaExclamationMinEntryCents:65,athenaExclamationMaxEntryCents:85,
    lightningPlasmaMinEntryCents:74,lightningPlasmaMaxEntryCents:88,
  };
  for(const [k,v] of Object.entries(expected)) assert.equal(s[k], v, k);
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
