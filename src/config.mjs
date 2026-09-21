import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
};
const bool = (name, fallback) => {
  const v = process.env[name];
  return v == null ? fallback : /^(1|true|yes|on)$/i.test(v);
};
const pem = (v='') => String(v).replace(/\\n/g, '\n').trim();

export const RELEASE = 'SAGITTARIUS-BOLT-DIRECT-R2-2026-09-21';

export const env = Object.freeze({
  port: num('PORT', 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  kalshiApiKeyId: process.env.KALSHI_API_KEY_ID || '',
  kalshiPrivateKeyPem: pem(process.env.KALSHI_PRIVATE_KEY_PEM || ''),
  kalshiBaseUrl: (process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2').replace(/\/$/, ''),
  kalshiFallbackBaseUrl: (process.env.KALSHI_FALLBACK_BASE_URL || 'https://external-api.kalshi.com/trade-api/v2').replace(/\/$/, ''),
  kalshiWsUrl: process.env.KALSHI_WS_URL || 'wss://external-api-ws.kalshi.com/trade-api/ws/v2',
  kalshiFallbackWsUrl: process.env.KALSHI_FALLBACK_WS_URL || 'wss://api.elections.kalshi.com/trade-api/ws/v2',
  defaultEngineMode: String(process.env.DEFAULT_ENGINE_MODE || 'SIMULATION').toUpperCase() === 'LIVE' ? 'LIVE' : 'SIMULATION',
  allowLiveTrading: bool('ALLOW_LIVE_TRADING', false),
  systemName: process.env.SYSTEM_NAME || 'SAGITTARIUS',
  ownerId: process.env.SYSTEM_OWNER_ID || 'sagittarius-main',
});

export const CANONICAL_NUMERIC_SETTINGS = Object.freeze([
  // Shared/system safety + simulation controls.
  'maxPositions',
  'maxEntriesPerTrade',
  'hunterCooldownMinutes',
  'maxRepeatsPerMarket',
  'repeatCooldownMinutes',
  'minGameMinutes',
  'maxGameMinutes',
  'eventCooldownMinutes',
  'maxSpreadCents',
  'startingCapitalCents',
  'simFillProbability',
  'simFeeCents',
  'recoveryTrackingHours',

  // Atomic Thunder -- operator-editable favorable move required from a shadow Cosmo trade.
  'atomicThunderGreenTriggerCents',

  // Entry-frozen profit authority: Infinity Break when PRI1-R2 is OFF; PRI1-R2 when enabled per Attack.
  'infinityBreakMinNetPerOriginalContractCents',
  'infinityBreakRequiredConfirmations',
  'infinityBreakMaximumBookAgeMs',
  'infinityBreakConfirmationWindowMs',

  // Aurora Execution -- operator-controlled economic damage envelope.
  'auroraDamageControlPercent',

  // Pegasus/Dragon/Phoenix remain reference-only Cosmos controls.
  'pegasusReferenceStakeCents',
  'pegasusMinPriceCents',
  'pegasusMaxPriceCents',
  'pegasusDropCents',
  'dragonReferenceStakeCents',
  'dragonMinSignalPriceCents',
  'dragonMaxSignalPriceCents',
  'dragonMaxEpisode',
  'phoenixReferenceStakeCents',
  'phoenixMinPriceCents',
  'phoenixMaxPriceCents',
  'geminiReferenceStakeCents',
  'geminiMinPriceCents',
  'geminiMaxPriceCents',

  // Execution Attacks retain only stake + operator-permitted price band.
  'momentumStakeCents',

  'momentumMinRiseCents',
  'momentumMinPullbackCents',
  'momentumMaxPullbackCents',
  'momentumMinTimeLeftMinutes',
  'momentumMinCrashCents',
  'momentumMinReboundCents',
  'momentumMinUpwardTicks',
  'waveMinFeederFavorableMoveCents',
  'crashRecoveryMinCrashCents',
  'crashRecoveryMinReboundCents',
  'crashRecoveryMinReclaimRate',
  'crashRecoveryStableObservations',
  'crashRecoveryUpwardTicks',
  'crashRecoveryMinUpwardTicks',

  'momentumMinEntryCents',
  'momentumMaxEntryCents',
  'waveStakeCents',
  'waveMinEntryCents',
  'waveMaxEntryCents',
  'recoveryStakeCents',
  'recoveryMinEntryCents',
  'recoveryMaxEntryCents',
  'crystalWallMinCrashCents',
  'crystalWallMinReboundCents',
  'crystalWallMinUpwardTicks',
  'crystalWallWinsToTriggerAthena',
  'crystalWallProof1MinCrashCents',
  'crystalWallProof1MinReboundCents',
  'crystalWallProof1MinUpwardTicks',
  'crystalWallProof2MinCrashCents',
  'crystalWallProof2MinReboundCents',
  'crystalWallProof2MinUpwardTicks',
  'crystalWallProof3MinCrashCents',
  'crystalWallProof3MinReboundCents',
  'crystalWallProof3MinUpwardTicks',
  'crystalWallProof4MinCrashCents',
  'crystalWallProof4MinReboundCents',
  'crystalWallProof4MinUpwardTicks',
  'crystalWallProof5MinCrashCents',
  'crystalWallProof5MinReboundCents',
  'crystalWallProof5MinUpwardTicks',
  'crashRecoveryStakeCents',
  'crashRecoveryMinEntryCents',
  'crashRecoveryMaxEntryCents',
  'crashRecoveryInfinityNetPerOriginalContractCents',
  'scarletNeedleStakeCents',
  'scarletNeedleMinEntryCents',
  'scarletNeedleMaxEntryCents',
  'scarletNeedleInfinityNetPerOriginalContractCents',
  'scarletNeedleMaxRepeats',
  'scarletNeedleMinCrashCents',
  'scarletNeedleMinReboundCents',
  'scarletNeedleMinUpwardTicks',
  'waveMinCrashCents',
  'waveMinReboundCents',
  'waveMinUpwardTicks',
  'justiceArrowStakeCents',
  'justiceArrowMinEntryCents',
  'justiceArrowMaxEntryCents',
  'justiceArrowMinCrashCents',
  'justiceArrowMinReboundCents',
  'justiceArrowMinUpwardTicks',
  'athenaExclamationStakeCents',
  'athenaExclamationMinEntryCents',
  'athenaExclamationMaxEntryCents',
  'athenaExclamationMinCrashCents',
  'athenaExclamationMinReboundCents',
  'athenaExclamationMinUpwardTicks',
  'lightningPlasmaFieldStakeCents',
  'lightningPlasmaMinEntryCents',
  'lightningPlasmaMaxEntryCents',
  'lightningPlasmaMinCrashCents',
  'lightningPlasmaMinReboundCents',
  'lightningPlasmaMinUpwardTicks',
  'lightningPlasmaMaxStrikes',


  'athenaExclamationFollowUpAttacks',
  'athenaExclamationPri1R2TriggerCents',
  'scarletNeedlePri1R2TriggerCents',
  'justiceArrowPri1R2TriggerCents',
  'momentumPri1R2TriggerCents',
  'wavePri1R2TriggerCents',
  'crashRecoveryPri1R2TriggerCents',
  'lightningPlasmaPri1R2TriggerCents',

  'resetTimestampMs',
]);

export const CANONICAL_BOOLEAN_SETTINGS = Object.freeze([
  'engineActive',
  'pegasusEnabled',
  'dragonEnabled',
  'phoenixEnabled',
  'momentumHunterEnabled',
  'waveSurferEnabled',
  'recoveryHunterEnabled',
  'crashRecoveryHunterEnabled',
  'scarletNeedleEnabled',
  'geminiEnabled',
  'justiceArrowEnabled',
  'justiceArrowPostScarletV3Migrated',
  'athenaExclamationEnabled',
  'lightningPlasmaEnabled',
  'galacticExplosionEnabled',
  'rozanHyakuRyuHaEnabled',
  'excaliburEnabled',
  'andromedaThunderWaveEnabled',
  'athenaSoulEnabled',

  'athenaExclamationPri1R2Enabled',
  'scarletNeedlePri1R2Enabled',
  'justiceArrowPri1R2Enabled',
  'momentumPri1R2Enabled',
  'wavePri1R2Enabled',
  'crashRecoveryPri1R2Enabled',
  'lightningPlasmaPri1R2Enabled',
]);

export const CRYSTAL_WALL_PROOF_STAGES = Object.freeze([1,2,3,4,5]);
export function crystalWallProofSettingKeys(stage=1){
  const n=Math.max(1,Math.min(5,Math.floor(Number(stage)||1)));
  return Object.freeze({
    stage:n,
    crash:`crystalWallProof${n}MinCrashCents`,
    rebound:`crystalWallProof${n}MinReboundCents`,
    ticks:`crystalWallProof${n}MinUpwardTicks`,
  });
}

export const EDITABLE_NUMERIC_SETTINGS = Object.freeze(CANONICAL_NUMERIC_SETTINGS.filter((k) => !['resetTimestampMs','simFillProbability'].includes(k)));
export const EDITABLE_BOOLEAN_SETTINGS = Object.freeze(CANONICAL_BOOLEAN_SETTINGS.filter((k) => !['engineActive','justiceArrowPostScarletV3Migrated'].includes(k)));

// R69.5 one-time authority migration. Existing R69.4 deployments may have the
// former independent Justice Arrow persisted OFF. Enable the new post-Scarlet
// continuation exactly once, then honor all later operator changes.
export function applyJusticeArrowPostScarletV3Migration(input={}) {
  const settings={...input};
  if(settings.justiceArrowPostScarletV3Migrated===true)return{settings,migrated:false};
  settings.justiceArrowEnabled=true;
  settings.justiceArrowPostScarletV3Migrated=true;
  return{settings,migrated:true};
}

// R10 has one authoritative home for every setting. Legacy shared stake keys are
// accepted only while loading an older persisted record so they can be migrated
// into model-owned settings; they are never emitted back into runtime settings.
export function originalSettings() {
  return {
    systemName: env.systemName,
    ownerId: env.ownerId,
    mode: env.defaultEngineMode,
    liveArmed: false,
    engineActive: true,
    pegasusEnabled: true,
    dragonEnabled: true,
    phoenixEnabled: false,
    momentumHunterEnabled: true,
    waveSurferEnabled: true,
    recoveryHunterEnabled: true,
    crashRecoveryHunterEnabled: true,
    scarletNeedleEnabled: false,
    geminiEnabled: false,
    justiceArrowEnabled: false,
    justiceArrowPostScarletV3Migrated: false,
    athenaExclamationEnabled: false,
    lightningPlasmaEnabled: true,
    galacticExplosionEnabled: false,
    rozanHyakuRyuHaEnabled: false,
    excaliburEnabled: false,
    andromedaThunderWaveEnabled: false,
    andromedaThunderWaveLevel: 'HIGH',
    athenaSoulEnabled: false,

    maxPositions: 8,
    maxEntriesPerTrade: 8,
    hunterCooldownMinutes: 0,
    maxRepeatsPerMarket: 0,
    repeatCooldownMinutes: 0,
    minGameMinutes: 30,
    maxGameMinutes: 60,
    eventCooldownMinutes: 1,
    maxSpreadCents: 3,
    startingCapitalCents: 100000,
    // Compatibility telemetry only. R63 SIM execution is deterministic from fresh
    // visible IOC depth and no longer applies an independent random fill lottery.
    simFillProbability: 1,
    simFeeCents: 2,
    recoveryTrackingHours: 24,

    atomicThunderGreenTriggerCents: 1,

    infinityBreakMinNetPerOriginalContractCents: 1,
    infinityBreakRequiredConfirmations: 2,
    infinityBreakMaximumBookAgeMs: 1000,
    infinityBreakConfirmationWindowMs: 3000,
    auroraDamageControlPercent: 45,

    pegasusReferenceStakeCents: 3000,
    pegasusMinPriceCents: 45,
    pegasusMaxPriceCents: 60,
    pegasusDropCents: 1,
    dragonReferenceStakeCents: 3000,
    dragonMinSignalPriceCents: 45,
    dragonMaxSignalPriceCents: 60,
    dragonMaxEpisode: 4,
    phoenixReferenceStakeCents: 3000,
    phoenixMinPriceCents: 10,
    phoenixMaxPriceCents: 50,
    geminiReferenceStakeCents: 20000,
    geminiMinPriceCents: 10,
    geminiMaxPriceCents: 89,

    momentumStakeCents: 20000,

    momentumMinRiseCents: 2,
    momentumMinPullbackCents: 1,
    momentumMaxPullbackCents: 12,
    momentumMinTimeLeftMinutes: 3,
    momentumMinCrashCents: 15,
    momentumMinReboundCents: 5,
    momentumMinUpwardTicks: 2,
    waveMinFeederFavorableMoveCents: 0,
    crashRecoveryMinCrashCents: 15,
    crashRecoveryMinReboundCents: 5,
    crashRecoveryMinReclaimRate: 0.33,
    crashRecoveryStableObservations: 2,
    crashRecoveryUpwardTicks: 2,
    crashRecoveryMinUpwardTicks: 2,

    momentumMinEntryCents: 50,
    momentumMaxEntryCents: 60,
    waveStakeCents: 500,
    waveMinEntryCents: 10,
    waveMaxEntryCents: 50,
    waveMinCrashCents: 15,
    waveMinReboundCents: 5,
    waveMinUpwardTicks: 2,
    recoveryStakeCents: 500,
    recoveryMinEntryCents: 10,
    recoveryMaxEntryCents: 50,
    crystalWallMinCrashCents: 15,
    crystalWallMinReboundCents: 5,
    crystalWallMinUpwardTicks: 2,
    crystalWallWinsToTriggerAthena: 3,
    crystalWallProof1MinCrashCents: 15,
    crystalWallProof1MinReboundCents: 5,
    crystalWallProof1MinUpwardTicks: 2,
    crystalWallProof2MinCrashCents: 15,
    crystalWallProof2MinReboundCents: 5,
    crystalWallProof2MinUpwardTicks: 2,
    crystalWallProof3MinCrashCents: 15,
    crystalWallProof3MinReboundCents: 5,
    crystalWallProof3MinUpwardTicks: 2,
    crystalWallProof4MinCrashCents: 15,
    crystalWallProof4MinReboundCents: 5,
    crystalWallProof4MinUpwardTicks: 2,
    crystalWallProof5MinCrashCents: 15,
    crystalWallProof5MinReboundCents: 5,
    crystalWallProof5MinUpwardTicks: 2,
    crashRecoveryStakeCents: 20000,
    crashRecoveryMinEntryCents: 50,
    crashRecoveryMaxEntryCents: 60,
    crashRecoveryInfinityNetPerOriginalContractCents: 5,
    scarletNeedleStakeCents: 500,
    scarletNeedleMinEntryCents: 10,
    scarletNeedleMaxEntryCents: 50,
    scarletNeedleMinCrashCents: 15,
    scarletNeedleMinReboundCents: 5,
    scarletNeedleMinUpwardTicks: 2,
    scarletNeedleInfinityNetPerOriginalContractCents: 1,
    scarletNeedleMaxRepeats: 1,
    justiceArrowStakeCents: 500,
    justiceArrowMinEntryCents: 10,
    justiceArrowMaxEntryCents: 50,
    justiceArrowMinCrashCents: 15,
    justiceArrowMinReboundCents: 5,
    justiceArrowMinUpwardTicks: 2,
    athenaExclamationStakeCents: 500,
    athenaExclamationMinEntryCents: 10,
    athenaExclamationMaxEntryCents: 50,
    athenaExclamationMinCrashCents: 15,
    athenaExclamationMinReboundCents: 5,
    athenaExclamationMinUpwardTicks: 2,
    lightningPlasmaFieldStakeCents: 500,
    lightningPlasmaMinEntryCents: 10,
    lightningPlasmaMaxEntryCents: 50,
    lightningPlasmaMinCrashCents: 15,
    lightningPlasmaMinReboundCents: 5,
    lightningPlasmaMinUpwardTicks: 2,
    lightningPlasmaMaxStrikes: 3,


    athenaExclamationFollowUpAttacks: 6,
    athenaExclamationPri1R2Enabled: false,
    athenaExclamationPri1R2TriggerCents: 5,
    scarletNeedlePri1R2Enabled: false,
    scarletNeedlePri1R2TriggerCents: 5,
    justiceArrowPri1R2Enabled: false,
    justiceArrowPri1R2TriggerCents: 5,
    momentumPri1R2Enabled: false,
    momentumPri1R2TriggerCents: 6,
    wavePri1R2Enabled: false,
    wavePri1R2TriggerCents: 5,
    crashRecoveryPri1R2Enabled: false,
    crashRecoveryPri1R2TriggerCents: 6,
    lightningPlasmaPri1R2Enabled: false,
    lightningPlasmaPri1R2TriggerCents: 5,

    resetTimestampMs: null,
  };
}

// Authoritative fresh-install/operator-default profile. Keep the conservative
// originalSettings() contract for legacy migrations and missing-key fallbacks.
// A brand-new database and the operator Factory Defaults action boot into the
// 2026-09-12 operator baseline captured from the supplied diagnostics. Crystal Wall
// remains the proof engine; the current operator enablement, stakes, bands, proof
// count and exit/risk settings are reproduced exactly. Fresh installs remain
// SIMULATION + disarmed as a deployment safety boundary.
export function freshInstallSettings() {
  return {
    ...originalSettings(),
    mode:'SIMULATION',
    liveArmed:false,
    engineActive:true,
    // Pegasus / Dragon / Phoenix remain ON only as reference-only Cosmos. They
    // cannot create portfolio exposure and are required to keep CI1/CW supplied.
    pegasusEnabled:true,
    dragonEnabled:true,
    phoenixEnabled:true,
    momentumHunterEnabled:false,
    waveSurferEnabled:false,
    recoveryHunterEnabled:true,
    crashRecoveryHunterEnabled:false,
    scarletNeedleEnabled:true,
    geminiEnabled:false,
    justiceArrowEnabled:true,
    // Fresh installs are already beyond the retired Justice Arrow auto-arm
    // migration; keeping this true prevents startup from re-enabling a Saint.
    justiceArrowPostScarletV3Migrated:true,
    athenaExclamationEnabled:true,
    lightningPlasmaEnabled:true,
    galacticExplosionEnabled:false,
    rozanHyakuRyuHaEnabled:false,
    excaliburEnabled:false,
    andromedaThunderWaveEnabled:false,
    andromedaThunderWaveLevel:'HIGH',
    athenaSoulEnabled:false,

    maxPositions:20,
    maxEntriesPerTrade:1,
    hunterCooldownMinutes:45,
    maxRepeatsPerMarket:0,
    repeatCooldownMinutes:0,
    minGameMinutes:30,
    maxGameMinutes:55,
    eventCooldownMinutes:1,
    maxSpreadCents:3,
    startingCapitalCents:1_000_000,
    simFillProbability:1,
    simFeeCents:2,
    recoveryTrackingHours:24,

    atomicThunderGreenTriggerCents:5,
    infinityBreakMinNetPerOriginalContractCents:5,
    infinityBreakRequiredConfirmations:1,
    infinityBreakMaximumBookAgeMs:1000,
    infinityBreakConfirmationWindowMs:3000,
    auroraDamageControlPercent:95,

    pegasusReferenceStakeCents:3000,
    pegasusMinPriceCents:20,
    pegasusMaxPriceCents:90,
    pegasusDropCents:10,
    dragonReferenceStakeCents:3000,
    dragonMinSignalPriceCents:20,
    dragonMaxSignalPriceCents:90,
    dragonMaxEpisode:2,
    phoenixReferenceStakeCents:3000,
    phoenixMinPriceCents:20,
    phoenixMaxPriceCents:90,
    geminiReferenceStakeCents:20000,
    geminiMinPriceCents:35,
    geminiMaxPriceCents:75,

    momentumStakeCents:500,
    momentumMinRiseCents:2,
    momentumMinPullbackCents:1,
    momentumMaxPullbackCents:12,
    momentumMinTimeLeftMinutes:3,
    momentumMinCrashCents:15,
    momentumMinReboundCents:5,
    momentumMinUpwardTicks:2,
    momentumMinEntryCents:55,
    momentumMaxEntryCents:75,
    waveMinFeederFavorableMoveCents:2,
    waveStakeCents:500,
    waveMinEntryCents:10,
    waveMaxEntryCents:50,
    waveMinCrashCents:15,
    waveMinReboundCents:5,
    waveMinUpwardTicks:2,
    recoveryStakeCents:500,
    recoveryMinEntryCents:35,
    recoveryMaxEntryCents:85,
    crystalWallMinCrashCents:15,
    crystalWallMinReboundCents:5,
    crystalWallMinUpwardTicks:4,
    crystalWallWinsToTriggerAthena:2,
    crystalWallProof1MinCrashCents:15,
    crystalWallProof1MinReboundCents:5,
    crystalWallProof1MinUpwardTicks:4,
    crystalWallProof2MinCrashCents:15,
    crystalWallProof2MinReboundCents:5,
    crystalWallProof2MinUpwardTicks:4,
    crystalWallProof3MinCrashCents:15,
    crystalWallProof3MinReboundCents:5,
    crystalWallProof3MinUpwardTicks:4,
    crystalWallProof4MinCrashCents:15,
    crystalWallProof4MinReboundCents:5,
    crystalWallProof4MinUpwardTicks:4,
    crystalWallProof5MinCrashCents:15,
    crystalWallProof5MinReboundCents:5,
    crystalWallProof5MinUpwardTicks:4,
    crashRecoveryMinCrashCents:15,
    crashRecoveryMinReboundCents:5,
    crashRecoveryMinReclaimRate:0.33,
    crashRecoveryStableObservations:2,
    crashRecoveryUpwardTicks:2,
    crashRecoveryMinUpwardTicks:2,
    crashRecoveryStakeCents:500,
    crashRecoveryMinEntryCents:55,
    crashRecoveryMaxEntryCents:75,
    crashRecoveryInfinityNetPerOriginalContractCents:5,
    scarletNeedleStakeCents:500,
    scarletNeedleMinEntryCents:10,
    scarletNeedleMaxEntryCents:50,
    scarletNeedleMinCrashCents:15,
    scarletNeedleMinReboundCents:5,
    scarletNeedleMinUpwardTicks:2,
    scarletNeedleInfinityNetPerOriginalContractCents:5,
    scarletNeedleMaxRepeats:1,
    justiceArrowStakeCents:500,
    justiceArrowMinEntryCents:55,
    justiceArrowMaxEntryCents:75,
    justiceArrowMinCrashCents:1,
    justiceArrowMinReboundCents:1,
    justiceArrowMinUpwardTicks:1,
    athenaExclamationStakeCents:500,
    athenaExclamationMinEntryCents:10,
    athenaExclamationMaxEntryCents:50,
    athenaExclamationMinCrashCents:15,
    athenaExclamationMinReboundCents:5,
    athenaExclamationMinUpwardTicks:2,
    lightningPlasmaFieldStakeCents:500,
    lightningPlasmaMinEntryCents:10,
    lightningPlasmaMaxEntryCents:50,
    lightningPlasmaMinCrashCents:15,
    lightningPlasmaMinReboundCents:5,
    lightningPlasmaMinUpwardTicks:2,
    lightningPlasmaMaxStrikes:1,

    athenaExclamationFollowUpAttacks:0,
    athenaExclamationPri1R2Enabled:false,
    athenaExclamationPri1R2TriggerCents:5,
    scarletNeedlePri1R2Enabled:false,
    scarletNeedlePri1R2TriggerCents:5,
    justiceArrowPri1R2Enabled:false,
    justiceArrowPri1R2TriggerCents:5,
    momentumPri1R2Enabled:false,
    momentumPri1R2TriggerCents:5,
    wavePri1R2Enabled:false,
    wavePri1R2TriggerCents:5,
    crashRecoveryPri1R2Enabled:false,
    crashRecoveryPri1R2TriggerCents:5,
    lightningPlasmaPri1R2Enabled:false,
    lightningPlasmaPri1R2TriggerCents:5,

    resetTimestampMs:null,
  };
}

export function factoryOperatorSettingsPatch() {
  const factory = freshInstallSettings();
  const patch = {};
  for (const k of EDITABLE_NUMERIC_SETTINGS) if (Object.hasOwn(factory, k)) patch[k] = factory[k];
  for (const k of EDITABLE_BOOLEAN_SETTINGS) if (Object.hasOwn(factory, k)) patch[k] = factory[k];
  return patch;
}

export function normalizeStartupExecutionMode(settings = {}, allowLiveTrading = env.allowLiveTrading) {
  const current = settings && typeof settings === 'object' ? { ...settings } : {};
  // A persisted LIVE selection is impossible to execute when deployment policy
  // explicitly disables LIVE trading. Recover deterministically to SIMULATION
  // while preserving engineActive and every strategy setting. If LIVE is
  // deployment-authorized, remain fail-closed and disarmed after restart; the
  // operator must explicitly re-arm it.
  if (String(current.mode || '').toUpperCase() === 'LIVE' && allowLiveTrading !== true) {
    return { settings: { ...current, mode:'SIMULATION', liveArmed:false }, recovered:true, reason:'live_trading_disabled' };
  }
  return { settings: { ...current, liveArmed:false }, recovered:false, reason:null };
}

export function sanitizeRuntimeSettings(value = {}, defaults = originalSettings()) {
  const raw = value && typeof value === 'object' ? value : {};
  // One-time compatibility bridge from R9 and earlier. These aliases are not
  // canonical and disappear immediately after the first R10 save.
  const src = { ...raw };
  if (!Object.hasOwn(src, 'pegasusReferenceStakeCents') && Object.hasOwn(src, 'feederStakeCents')) src.pegasusReferenceStakeCents = src.feederStakeCents;
  if (!Object.hasOwn(src, 'momentumStakeCents') && Object.hasOwn(src, 'hunterStakeCents')) src.momentumStakeCents = src.hunterStakeCents;
  if (!Object.hasOwn(src, 'recoveryStakeCents') && Object.hasOwn(src, 'recoveryBaseStakeCents')) src.recoveryStakeCents = Number(src.recoveryBaseStakeCents);
  if (!Object.hasOwn(src, 'recoveryStakeCents') && Object.hasOwn(src, 'hunterStakeCents')) src.recoveryStakeCents = src.hunterStakeCents;
  if (!Object.hasOwn(src, 'waveStakeCents') && Object.hasOwn(src, 'stakeCents')) src.waveStakeCents = src.stakeCents;
  // CW3 one-time migration. Presence of the new crash-depth setting is the
  // durable marker that a persisted runtime has already crossed from V2 to V3.
  // V2's $200 / 56-69 recovery geometry and historical 2x base-stake bridge are
  // intentionally retired. The user's approved V3 launch profile is fixed $5,
  // 10-50c, 15c crash, +5c rebound, two upward ticks, and enabled.
  if (Object.keys(raw).length > 0 && !Object.hasOwn(src, 'crystalWallWinsToTriggerAthena')) src.crystalWallWinsToTriggerAthena = 3;
  const crystalWallV3Migration = Object.keys(raw).length > 0 && !Object.hasOwn(raw, 'crystalWallMinCrashCents');
  if (crystalWallV3Migration) {
    src.recoveryHunterEnabled = true;
    src.recoveryStakeCents = 500;
    src.recoveryMinEntryCents = 10;
    src.recoveryMaxEntryCents = 50;
    src.crystalWallMinCrashCents = 15;
    src.crystalWallMinReboundCents = 5;
    src.crystalWallMinUpwardTicks = 2;
  }
  // SJA2 legacy settings migration. Justice Arrow adopts the exact *persisted*
  // Crystal Wall V3 crash-rebound settings at upgrade time, while retaining
  // its own enable toggle and ATHENA-X1 profit authority. This makes the first
  // paired experiment identical at entry without silently arming a disabled
  // Attack. Subsequent operator edits remain independent controls.
  const justiceArrowV2Migration = Object.keys(raw).length > 0 && !Object.hasOwn(raw, 'justiceArrowMinCrashCents');
  if (justiceArrowV2Migration) {
    src.justiceArrowStakeCents = Number(src.recoveryStakeCents ?? 500);
    src.justiceArrowMinEntryCents = Number(src.recoveryMinEntryCents ?? 10);
    src.justiceArrowMaxEntryCents = Number(src.recoveryMaxEntryCents ?? 50);
    src.justiceArrowMinCrashCents = Number(src.crystalWallMinCrashCents ?? 15);
    src.justiceArrowMinReboundCents = Number(src.crystalWallMinReboundCents ?? 5);
    src.justiceArrowMinUpwardTicks = Number(src.crystalWallMinUpwardTicks ?? 2);
  }
  // R63 rename/migration: the former Another Dimension shadow-universe toggle
  // becomes Gemini. Existing R62 deployments retain their operator state and
  // inherit the prior Great Horn-linked virtual stake/band exactly once.
  if (!Object.hasOwn(src, 'geminiEnabled') && Object.hasOwn(src, 'anotherDimensionEnabled')) src.geminiEnabled = src.anotherDimensionEnabled;
  if (!Object.hasOwn(src, 'geminiReferenceStakeCents') && Object.hasOwn(src, 'momentumStakeCents')) src.geminiReferenceStakeCents = src.momentumStakeCents;
  if (!Object.hasOwn(src, 'geminiMinPriceCents') && Object.hasOwn(src, 'momentumMinEntryCents')) src.geminiMinPriceCents = src.momentumMinEntryCents;
  if (!Object.hasOwn(src, 'geminiMaxPriceCents') && Object.hasOwn(src, 'momentumMaxEntryCents')) src.geminiMaxPriceCents = src.momentumMaxEntryCents;

  // R45 retired runtime concepts/settings are intentionally not canonical.
  // Persisted legacy keys are ignored on load, while historical trade-level
  // snapshots remain intact in sag_entries for audit and legacy protection.
  const hasPersistedRecord=Object.keys(raw).length>0;
  const migrationFailSafeOff=new Set(['dragonEnabled','phoenixEnabled','crashRecoveryHunterEnabled','scarletNeedleEnabled','geminiEnabled','justiceArrowEnabled','athenaExclamationEnabled','lightningPlasmaEnabled']);

  const out = { ...defaults };
  for (const key of CANONICAL_NUMERIC_SETTINGS) {
    if (!Object.hasOwn(src, key)) continue;
    if (key === 'resetTimestampMs' && src[key] == null) { out[key] = null; continue; }
    const v = Number(src[key]);
    if (Number.isFinite(v)) out[key] = v;
  }
  for (const key of CANONICAL_BOOLEAN_SETTINGS) {
    if (!Object.hasOwn(src, key)) {
      if(hasPersistedRecord&&migrationFailSafeOff.has(key)) out[key]=false;
      continue;
    }
    out[key] = typeof src[key] === 'boolean' ? src[key] : /^(1|true|yes|on)$/i.test(String(src[key]));
  }
  if (Object.hasOwn(src, 'systemName') && String(src.systemName).trim()) out.systemName = String(src.systemName).trim();
  if (Object.hasOwn(src, 'ownerId') && String(src.ownerId).trim()) out.ownerId = String(src.ownerId).trim();
  if (Object.hasOwn(src, 'mode')) out.mode = String(src.mode).toUpperCase() === 'LIVE' ? 'LIVE' : 'SIMULATION';
  if (Object.hasOwn(src, 'andromedaThunderWaveLevel')) out.andromedaThunderWaveLevel = src.andromedaThunderWaveLevel;
  // R51 compatibility bridge: old Atomic Thunder profit settings become
  // Infinity Break settings for NEW positions. Historical rows keep their
  // creation-time Atomic Thunder snapshots and close reasons unchanged.
  if (!Object.hasOwn(src, 'infinityBreakMinNetPerOriginalContractCents') && Object.hasOwn(src, 'atomicThunderMinNetPerOriginalContractCents')) out.infinityBreakMinNetPerOriginalContractCents = Number(src.atomicThunderMinNetPerOriginalContractCents);
  if (!Object.hasOwn(src, 'infinityBreakRequiredConfirmations') && Object.hasOwn(src, 'atomicThunderRequiredConfirmations')) out.infinityBreakRequiredConfirmations = Number(src.atomicThunderRequiredConfirmations);
  if (!Object.hasOwn(src, 'infinityBreakMaximumBookAgeMs') && Object.hasOwn(src, 'atomicThunderMaximumBookAgeMs')) out.infinityBreakMaximumBookAgeMs = Number(src.atomicThunderMaximumBookAgeMs);
  if (!Object.hasOwn(src, 'infinityBreakConfirmationWindowMs') && Object.hasOwn(src, 'atomicThunderConfirmationWindowMs')) out.infinityBreakConfirmationWindowMs = Number(src.atomicThunderConfirmationWindowMs);
  out.maxRepeatsPerMarket = Math.max(0, Math.min(99, Math.floor(Number(out.maxRepeatsPerMarket) || 0)));
  out.repeatCooldownMinutes = Math.max(0, Math.min(10080, Math.floor(Number(out.repeatCooldownMinutes) || 0)));
  out.atomicThunderGreenTriggerCents = Math.max(1, Math.min(99, Math.floor(Number(out.atomicThunderGreenTriggerCents) || 1)));
  out.infinityBreakMinNetPerOriginalContractCents = Math.max(0.01, Number(out.infinityBreakMinNetPerOriginalContractCents) || 0.01);
  out.infinityBreakRequiredConfirmations = Math.max(1, Math.floor(Number(out.infinityBreakRequiredConfirmations) || 1));
  out.infinityBreakMaximumBookAgeMs = Math.max(100, Math.floor(Number(out.infinityBreakMaximumBookAgeMs) || 100));
  out.infinityBreakConfirmationWindowMs = Math.max(250, Math.floor(Number(out.infinityBreakConfirmationWindowMs) || 250));
  out.auroraDamageControlPercent = Math.max(1, Math.min(95, Number(out.auroraDamageControlPercent) || 45));
  out.scarletNeedleInfinityNetPerOriginalContractCents = Math.max(0.01, Math.min(99, Number(out.scarletNeedleInfinityNetPerOriginalContractCents) || 1));
  out.crashRecoveryInfinityNetPerOriginalContractCents = Math.max(0.01, Math.min(99, Number(out.crashRecoveryInfinityNetPerOriginalContractCents) || 5));
  out.scarletNeedleMaxRepeats = Math.max(0, Math.min(1, Math.floor(Number(out.scarletNeedleMaxRepeats) || 0)));
  out.lightningPlasmaMaxStrikes = Math.max(1, Math.floor(Number(out.lightningPlasmaMaxStrikes) || 1));
  out.crystalWallMinCrashCents = Math.max(1, Math.min(99, Math.floor(Number(out.crystalWallMinCrashCents) || 15)));
  out.crystalWallMinReboundCents = Math.max(1, Math.min(99, Math.floor(Number(out.crystalWallMinReboundCents) || 5)));
  out.crystalWallMinUpwardTicks = Math.max(1, Math.min(20, Math.floor(Number(out.crystalWallMinUpwardTicks) || 2)));
  out.crystalWallWinsToTriggerAthena = Math.max(1, Math.min(5, Math.floor(Number(out.crystalWallWinsToTriggerAthena) || 3)));
  // CW proof-ladder migration: missing per-proof geometry inherits the shared
  // Crystal Wall values so existing 15/5/2 (or operator) boxes stay identical.
  for (const stage of [1,2,3,4,5]) {
    const crashKey=`crystalWallProof${stage}MinCrashCents`;
    const reboundKey=`crystalWallProof${stage}MinReboundCents`;
    const ticksKey=`crystalWallProof${stage}MinUpwardTicks`;
    if (!Object.hasOwn(src, crashKey)) out[crashKey] = out.crystalWallMinCrashCents;
    if (!Object.hasOwn(src, reboundKey)) out[reboundKey] = out.crystalWallMinReboundCents;
    if (!Object.hasOwn(src, ticksKey)) out[ticksKey] = out.crystalWallMinUpwardTicks;
    out[crashKey] = Math.max(1, Math.min(99, Math.floor(Number(out[crashKey]) || out.crystalWallMinCrashCents)));
    out[reboundKey] = Math.max(1, Math.min(99, Math.floor(Number(out[reboundKey]) || out.crystalWallMinReboundCents)));
    out[ticksKey] = Math.max(1, Math.min(20, Math.floor(Number(out[ticksKey]) || out.crystalWallMinUpwardTicks)));
  }
  const clampBoltGeom=(value,fallback,max)=>{
    const n=Number(value);
    const raw=Number.isFinite(n)?Math.floor(n):fallback;
    return Math.max(0, Math.min(max, raw));
  };
  out.justiceArrowMinCrashCents = clampBoltGeom(out.justiceArrowMinCrashCents, 15, 99);
  out.justiceArrowMinReboundCents = clampBoltGeom(out.justiceArrowMinReboundCents, 5, 99);
  out.justiceArrowMinUpwardTicks = clampBoltGeom(out.justiceArrowMinUpwardTicks, 2, 20);
  for (const [crash,rebound,ticks] of [
    ['athenaExclamationMinCrashCents','athenaExclamationMinReboundCents','athenaExclamationMinUpwardTicks'],
    ['scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks'],
    ['waveMinCrashCents','waveMinReboundCents','waveMinUpwardTicks'],
    ['lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks'],
    ['momentumMinCrashCents','momentumMinReboundCents','momentumMinUpwardTicks'],
  ]) {
    out[crash] = clampBoltGeom(out[crash], 15, 99);
    out[rebound] = clampBoltGeom(out[rebound], 5, 99);
    out[ticks] = clampBoltGeom(out[ticks], 2, 20);
  }


  out.momentumMinRiseCents=Math.max(0,Math.min(99,Number(out.momentumMinRiseCents)||0));
  out.momentumMinPullbackCents=Math.max(0,Math.min(99,Number(out.momentumMinPullbackCents)||0));
  out.momentumMaxPullbackCents=Math.max(out.momentumMinPullbackCents,Math.min(99,Number(out.momentumMaxPullbackCents)||12));
  out.momentumMinTimeLeftMinutes=Math.max(0,Math.min(240,Number(out.momentumMinTimeLeftMinutes)||0));
  out.waveMinFeederFavorableMoveCents=Math.max(0,Math.min(99,Number(out.waveMinFeederFavorableMoveCents)||0));
  out.crashRecoveryMinCrashCents=Math.max(1,Math.min(99,Number(out.crashRecoveryMinCrashCents)||15));
  out.crashRecoveryMinReboundCents=Math.max(1,Math.min(99,Number(out.crashRecoveryMinReboundCents)||5));
  out.crashRecoveryMinReclaimRate=Math.max(0,Math.min(1,Number(out.crashRecoveryMinReclaimRate)||0.33));
  out.crashRecoveryStableObservations=Math.max(1,Math.min(20,Math.floor(Number(out.crashRecoveryStableObservations)||2)));
  out.crashRecoveryUpwardTicks=Math.max(1,Math.min(20,Math.floor(Number(out.crashRecoveryUpwardTicks)||2)));
  if(!Object.hasOwn(out,'crashRecoveryMinUpwardTicks') || out.crashRecoveryMinUpwardTicks==null) out.crashRecoveryMinUpwardTicks=out.crashRecoveryUpwardTicks;
  out.crashRecoveryMinUpwardTicks=Math.max(1,Math.min(20,Math.floor(Number(out.crashRecoveryMinUpwardTicks)||out.crashRecoveryUpwardTicks||2)));

  out.athenaExclamationFollowUpAttacks = Math.max(0, Math.min(12, Math.floor(Number(out.athenaExclamationFollowUpAttacks) || 0)));
  for (const key of ['athenaExclamationPri1R2TriggerCents','scarletNeedlePri1R2TriggerCents','justiceArrowPri1R2TriggerCents','momentumPri1R2TriggerCents','wavePri1R2TriggerCents','crashRecoveryPri1R2TriggerCents','lightningPlasmaPri1R2TriggerCents']) {
    out[key] = Math.max(0.01, Math.min(99, Number(out[key]) || 0.01));
  }

  // R63 simulation/live parity: persisted legacy probabilities are neutralized.
  // SIM still requires fresh executable depth and may fill partially, but never
  // rejects a proven executable IOC through an unrelated random coin flip.
  out.excaliburEnabled = out.excaliburEnabled===true;
  out.rozanHyakuRyuHaEnabled = out.rozanHyakuRyuHaEnabled===true;
  if (out.excaliburEnabled===true && out.rozanHyakuRyuHaEnabled===true) {
    if (Object.hasOwn(raw,'rozanHyakuRyuHaEnabled') && raw.rozanHyakuRyuHaEnabled===true && !(Object.hasOwn(raw,'excaliburEnabled') && raw.excaliburEnabled===true)) {
      out.excaliburEnabled=false;
    } else {
      out.rozanHyakuRyuHaEnabled=false;
    }
  }

  out.andromedaThunderWaveEnabled = out.andromedaThunderWaveEnabled===true;
  const andromedaLevel=String(src.andromedaThunderWaveLevel||out.andromedaThunderWaveLevel||'HIGH').trim().toUpperCase();
  out.andromedaThunderWaveLevel = andromedaLevel==='MID'||andromedaLevel==='MEDIUM'?'MID':andromedaLevel==='LOW'?'LOW':'HIGH';
  if(out.andromedaThunderWaveEnabled!==true) out.andromedaThunderWaveLevel='HIGH';

  out.simFillProbability = 1;
  out.liveArmed = false;
  return out;
}

export function fleetTickerUnisonEnabled(settings = {}) {
  return settings?.excaliburEnabled===true || settings?.rozanHyakuRyuHaEnabled===true;
}

export function deploymentConfigRecord() {
  return {
    release: RELEASE,
    KALSHI_API_KEY_ID: env.kalshiApiKeyId,
    KALSHI_PRIVATE_KEY_PEM: env.kalshiPrivateKeyPem ? '[configured]' : '',
    KALSHI_BASE_URL: env.kalshiBaseUrl,
    DEFAULT_ENGINE_MODE: env.defaultEngineMode,
    ALLOW_LIVE_TRADING: env.allowLiveTrading,
  };
}

function secretKey() {
  if (!env.databaseUrl) throw new Error('DATABASE_URL is required');
  return createHash('sha256').update(`${env.databaseUrl}|${env.ownerId}|SAGITTARIUS-PDF-PARITY-v2`).digest();
}
export function encryptSecret(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secretKey(), iv);
  const enc = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${enc.toString('base64')}`;
}
export function decryptSecret(value) {
  const [iv, tag, data] = String(value || '').split('.');
  if (!iv || !tag || !data) throw new Error('Invalid encrypted secret');
  const d = createDecipheriv('aes-256-gcm', secretKey(), Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(data, 'base64')), d.final()]).toString('utf8');
}
