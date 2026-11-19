import { createHash, createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import {q17SimSettings} from './q17Profile.mjs';

const num = (name, fallback) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
};
const bool = (name, fallback) => {
  const v = process.env[name];
  return v == null ? fallback : /^(1|true|yes|on)$/i.test(v);
};
const pem = (v='') => String(v).replace(/\\n/g, '\n').trim();

export const RELEASE = 'SAGITTARIUS-Q-17-R5-PLASMA-ARROW-LINK-SQL-GUARD-2026-11-19';

export const env = Object.freeze({
  port: num('PORT', 3000),
  databaseUrl: process.env.DATABASE_URL || '',
  kalshiApiKeyId: process.env.KALSHI_API_KEY_ID || '',
  kalshiPrivateKeyPem: pem(process.env.KALSHI_PRIVATE_KEY_PEM || ''),
  kalshiBaseUrl: (process.env.KALSHI_BASE_URL || 'https://api.elections.kalshi.com/trade-api/v2').replace(/\/$/, ''),
  kalshiFallbackBaseUrl: (process.env.KALSHI_FALLBACK_BASE_URL || 'https://external-api.kalshi.com/trade-api/v2').replace(/\/$/, ''),
  kalshiWsUrl: process.env.KALSHI_WS_URL || 'wss://external-api-ws.kalshi.com/trade-api/ws/v2',
  kalshiFallbackWsUrl: process.env.KALSHI_FALLBACK_WS_URL || 'wss://api.elections.kalshi.com/trade-api/ws/v2',
  defaultEngineMode: 'SIMULATION', // Q-17 compile-time SIM-only invariant
  allowLiveTrading: false, // Q-17 never honors LIVE deployment variables
  systemName: process.env.SYSTEM_NAME || 'SAGITTARIUS',
  ownerId: process.env.SYSTEM_OWNER_ID || 'sagittarius-main',
});

export const CANONICAL_NUMERIC_SETTINGS = Object.freeze([
  // Shared/system safety + simulation controls.
  'maxPositions',
  'maxEntriesPerTrade',
  'hunterCooldownMinutes',
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

  // Infinity Break -- sole profit authority for new-generation positions.
  'infinityBreakMinNetPerOriginalContractCents',
  'infinityBreakRequiredConfirmations',
  'infinityBreakMaximumBookAgeMs',
  'infinityBreakConfirmationWindowMs',

  // Aurora Execution -- operator-controlled economic damage envelope.
  'auroraDamageControlPercent',
  'auroraStopWindowMinutes',
  'crashRecoveryHunterAuroraDamageControlPercent',
  'freezingCoffinMaxDropCents',
  'momentumHunterObservationMinutes',
  'sagittariusArrowObservationMinutes',
  'sagittariusArrowStakeCents',
  'sagittariusArrowMaxSpreadCents',
  'sagittariusArrowMinEntryCents',
  'sagittariusArrowMaxEntryCents',
  'sagittariusArrowMultiply',
  'sagittariusArrowMinCrashCents',
  'sagittariusArrowMinReboundCents',
  'sagittariusArrowMinUpwardTicks',
  'sagittariusArrowParentEntryRiseCents',
  'sagittariusArrowAuroraDamageControlPercent',
  'sagittariusArrowMinProfitNetPerOriginalContractCents',
  'scarletNeedleCapitalObservationMinutes',
  'scarletNeedleCapitalStakeCents',
  'scarletNeedleCapitalMaxSpreadCents',
  'scarletNeedleCapitalMinEntryCents',
  'scarletNeedleCapitalMaxEntryCents',
  'scarletNeedleCapitalMultiply',
  'scarletNeedleCapitalMinCrashCents',
  'scarletNeedleCapitalMinReboundCents',
  'scarletNeedleCapitalMinUpwardTicks',
  'scarletNeedleCapitalParentEntryRiseCents',
  'scarletNeedleCapitalAuroraDamageControlPercent',
  'scarletNeedleCapitalMinProfitNetPerOriginalContractCents',
  'pegasusRyuSeiKenCapitalObservationMinutes',
  'pegasusRyuSeiKenCapitalStakeCents',
  'pegasusRyuSeiKenCapitalMaxSpreadCents',
  'pegasusRyuSeiKenCapitalMinEntryCents',
  'pegasusRyuSeiKenCapitalMaxEntryCents',
  'pegasusRyuSeiKenCapitalMultiply',
  'pegasusRyuSeiKenCapitalMinCrashCents',
  'pegasusRyuSeiKenCapitalMinReboundCents',
  'pegasusRyuSeiKenCapitalMinUpwardTicks',
  'pegasusRyuSeiKenCapitalParentEntryRiseCents',
  'pegasusRyuSeiKenCapitalAuroraDamageControlPercent',
  'pegasusRyuSeiKenCapitalMinProfitNetPerOriginalContractCents',
  'greatHornObservationMinutes',
  'greatHornStakeCents',
  'greatHornMaxSpreadCents',
  'greatHornMinEntryCents',
  'greatHornMaxEntryCents',
  'greatHornMultiply',
  'greatHornMinCrashCents',
  'greatHornMinReboundCents',
  'greatHornMinUpwardTicks',
  'greatHornParentEntryRiseCents',
  'greatHornAuroraDamageControlPercent',
  'greatHornMinProfitNetPerOriginalContractCents',
  // CW1 second-recovery card, distinct from legacy Recovery Hunter/Crystal Wall.
  'crystalWallRecoveryObservationMinutes',
  'crystalWallRecoveryStakeCents',
  'crystalWallRecoveryMaxSpreadCents',
  'crystalWallRecoveryMinEntryCents',
  'crystalWallRecoveryMaxEntryCents',
  'crystalWallRecoveryMultiply',
  'crystalWallRecoveryMinCrashCents',
  'crystalWallRecoveryMinReboundCents',
  'crystalWallRecoveryMinUpwardTicks',
  'crystalWallRecoveryParentEntryRiseCents',
  'crystalWallRecoveryAuroraDamageControlPercent',
  'crystalWallRecoveryMinProfitNetPerOriginalContractCents',
  'waveSurferObservationMinutes',
  'crashRecoveryHunterObservationMinutes',
  'crystalWallObservationMinutes',
  'scarletNeedleObservationMinutes',
  'lightningPlasmaObservationMinutes',
  'justiceArrowObservationMinutes',
  'athenaExclamationObservationMinutes',

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
  'momentumMinEntryCents',
  'momentumMaxEntryCents',
  'momentumHunterMinCrashCents',
  'momentumHunterMinReboundCents',
  'momentumHunterMinUpwardTicks',
  'momentumHunterMinProfitNetPerOriginalContractCents',
  'waveStakeCents',
  'waveMinEntryCents',
  'waveMaxEntryCents',
  'waveSurferMinCrashCents',
  'waveSurferMinReboundCents',
  'waveSurferMinUpwardTicks',
  'waveSurferMinProfitNetPerOriginalContractCents',
  'recoveryStakeCents',
  'recoveryMinEntryCents',
  'recoveryMaxEntryCents',
  'crystalWallMinCrashCents',
  'crystalWallMinReboundCents',
  'crystalWallMinUpwardTicks',
  'crashRecoveryStakeCents',
  'crashRecoveryMinEntryCents',
  'crashRecoveryMaxEntryCents',
  'crashRecoveryHunterMinCrashCents',
  'crashRecoveryHunterMinReboundCents',
  'crashRecoveryHunterMinUpwardTicks',
  'crashRecoveryHunterMinProfitNetPerOriginalContractCents',
  'scarletNeedleStakeCents',
  'scarletNeedleMinEntryCents',
  'scarletNeedleMaxEntryCents',
  'scarletNeedleInfinityNetPerOriginalContractCents',
  'scarletNeedleMaxRepeats',
  'scarletNeedleMinCrashCents',
  'scarletNeedleMinReboundCents',
  'scarletNeedleMinUpwardTicks',
  'scarletNeedleMinProfitNetPerOriginalContractCents',
  'recoveryHunterMinProfitNetPerOriginalContractCents',
  'justiceArrowStakeCents',
  'justiceArrowMinEntryCents',
  'justiceArrowMaxEntryCents',
  'justiceArrowMinCrashCents',
  'justiceArrowMinReboundCents',
  'justiceArrowMinUpwardTicks',
  'justiceArrowMinProfitNetPerOriginalContractCents',
  'athenaExclamationStakeCents',
  'athenaExclamationMinEntryCents',
  'athenaExclamationMaxEntryCents',
  'athenaExclamationMinCrashCents',
  'athenaExclamationMinReboundCents',
  'athenaExclamationMinUpwardTicks',
  'athenaExclamationMinProfitNetPerOriginalContractCents',
  'momentumHunterMultiply',
  'waveSurferMultiply',
  'crashRecoveryHunterMultiply',
  'recoveryHunterMultiply',
  'justiceArrowMultiply',
  'scarletNeedleMultiply',
  'lightningPlasmaMultiply',
  'athenaExclamationMultiply',
  'lightningPlasmaFieldStakeCents',
  'lightningPlasmaMinEntryCents',
  'lightningPlasmaMaxEntryCents',
  'lightningPlasmaMaxStrikes',
  'lightningPlasmaMaxRepeats',
  'lightningPlasmaMinCrashCents',
  'lightningPlasmaMinReboundCents',
  'lightningPlasmaMinUpwardTicks',
  'lightningPlasmaMinProfitNetPerOriginalContractCents',
  'lightningPlasmaStarlightScaleInCents',
  'athenaExclamationStarlightTriggerCents',
  'lightningPlasmaAuroraDamageControlPercent',

  'resetTimestampMs',
  'liveDashboardStartMs',
  'simulationDashboardStartMs',
]);

export const CANONICAL_BOOLEAN_SETTINGS = Object.freeze([
  'engineActive',
  'pegasusEnabled',
  'dragonEnabled',
  'phoenixEnabled',
  'momentumHunterEnabled', // legacy; forcibly OFF for all new entries
  'sagittariusArrowEnabled',
  'sagittariusArrowLinkEnabled',
  'sagittariusArrowAthenaX1Enabled',
  'scarletNeedleCapitalEnabled',
  'scarletNeedleCapitalLinkEnabled',
  'scarletNeedleCapitalAthenaX1Enabled',
  'pegasusRyuSeiKenCapitalEnabled',
  'pegasusRyuSeiKenCapitalLinkEnabled',
  'pegasusRyuSeiKenCapitalAthenaX1Enabled',
  'greatHornEnabled',
  'greatHornLinkEnabled',
  'greatHornAthenaX1Enabled',
  'crystalWallRecoveryEnabled',
  'crystalWallRecoveryLinkEnabled',
  'crystalWallRecoveryAthenaX1Enabled',
  'waveSurferEnabled',
  'recoveryHunterEnabled',
  'crashRecoveryHunterEnabled',
  'crashRecoveryHunterLinkEnabled',
  'starlightExtinctionRealTradeEnabled',
  'scarletNeedleEnabled',
  'geminiEnabled',
  'justiceArrowEnabled',
  'athenaExclamationEnabled',
  'lightningPlasmaEnabled',
  'lightningPlasmaLinkEnabled',
  'galacticExplosionEnabled',
  'andromedaThunderWaveEnabled',
  'freezingCoffinEnabled',
  'athenaSoulEnabled',
  'momentumHunterAthenaX1Enabled',
  'waveSurferAthenaX1Enabled',
  'crashRecoveryHunterAthenaX1Enabled',
  'recoveryHunterAthenaX1Enabled',
  'justiceArrowAthenaX1Enabled',
  'scarletNeedleAthenaX1Enabled',
  'lightningPlasmaAthenaX1Enabled',
  'athenaExclamationAthenaX1Enabled',
  'ci1WallCloneApplied',
  'factoryTradingProfile20261005Applied',
  'athenaArrowCloneApplied',
  'winningCard20261005Applied',
  'card20261006Applied',
  'card20261006SessionApplied',
  'card20261007LiveApplied',
  'card20261008Applied',
  'q17LightningPlasmaArrowParityApplied',
  'q17LightningPlasmaLinkParityApplied',
]);

export const EDITABLE_NUMERIC_SETTINGS = Object.freeze(CANONICAL_NUMERIC_SETTINGS.filter((k) => !['resetTimestampMs','liveDashboardStartMs','simulationDashboardStartMs','simFillProbability'].includes(k)));
export const EDITABLE_BOOLEAN_SETTINGS = Object.freeze(CANONICAL_BOOLEAN_SETTINGS.filter((k) => k !== 'engineActive' && k !== 'q17LightningPlasmaArrowParityApplied' && k !== 'q17LightningPlasmaLinkParityApplied'));

// R10 has one authoritative home for every setting. Legacy shared stake keys are
// accepted only while loading an older persisted record so they can be migrated
// into model-owned settings; they are never emitted back into runtime settings.
export function originalSettings() {
  return {
    systemName: env.systemName,
    ownerId: env.ownerId,
    mode: env.defaultEngineMode,
    liveArmed: false,
    liveOwnerAuthorized: false,
    engineActive: true,
    pegasusEnabled: true,
    dragonEnabled: true,
    phoenixEnabled: false,
    momentumHunterEnabled: false, // GH1 retires original Athena-path Momentum Hunter
    sagittariusArrowEnabled:false, // MEGAWAVE: new recovery authority always defaults OFF
    sagittariusArrowLinkEnabled:true,
    sagittariusArrowAthenaX1Enabled:false,
    scarletNeedleCapitalEnabled:false, // MEGAWAVE: new recovery authority always defaults OFF
    scarletNeedleCapitalLinkEnabled:true,
    scarletNeedleCapitalAthenaX1Enabled:false,
    pegasusRyuSeiKenCapitalEnabled:false, // MEGAWAVE: new recovery authority always defaults OFF
    pegasusRyuSeiKenCapitalLinkEnabled:true,
    pegasusRyuSeiKenCapitalAthenaX1Enabled:false,
    greatHornEnabled: false, // GH1 unverified capital route must never auto-arm
    greatHornLinkEnabled: false,
    greatHornAthenaX1Enabled: false,
    crystalWallRecoveryEnabled: false, // CW1 must be explicitly enabled, no automatic new capital
    crystalWallRecoveryLinkEnabled: false,
    crystalWallRecoveryAthenaX1Enabled: false,
    waveSurferEnabled: true,
    recoveryHunterEnabled: true,
    crashRecoveryHunterEnabled: true,
    starlightExtinctionRealTradeEnabled: false,
    crashRecoveryHunterLinkEnabled: false,
    scarletNeedleEnabled: false,
    geminiEnabled: false,
    justiceArrowEnabled: false,
    athenaExclamationEnabled: false,
    lightningPlasmaEnabled: true,
    lightningPlasmaLinkEnabled: false,
    galacticExplosionEnabled: false,
    andromedaThunderWaveEnabled: false,
    andromedaThunderWaveLevel: 'HIGH',
    freezingCoffinEnabled: false,
    freezingCoffinMaxDropCents: 3,
    momentumHunterObservationMinutes: 0,
    greatHornObservationMinutes: 1,
    waveSurferObservationMinutes: 0,
    crashRecoveryHunterObservationMinutes: 0,
    crystalWallObservationMinutes: 0,
    scarletNeedleObservationMinutes: 0,
    lightningPlasmaObservationMinutes: 0,
    justiceArrowObservationMinutes: 0,
    athenaExclamationObservationMinutes: 0,
    athenaSoulEnabled: false,
    momentumHunterAthenaX1Enabled: false,
    waveSurferAthenaX1Enabled: false,
    crashRecoveryHunterAthenaX1Enabled: false,
    recoveryHunterAthenaX1Enabled: false,
    justiceArrowAthenaX1Enabled: true,
    scarletNeedleAthenaX1Enabled: false,
    lightningPlasmaAthenaX1Enabled: false,

    maxPositions: 8,
    maxEntriesPerTrade: 8,
    hunterCooldownMinutes: 0,
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
    auroraStopWindowMinutes: 90,
    crashRecoveryHunterAuroraDamageControlPercent: 45,
    lightningPlasmaAuroraDamageControlPercent: 45,

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

    sagittariusArrowObservationMinutes:0,
    sagittariusArrowStakeCents:100,
    sagittariusArrowMaxSpreadCents:3,
    sagittariusArrowMinEntryCents:50,
    sagittariusArrowMaxEntryCents:90,
    sagittariusArrowMultiply:5,
    sagittariusArrowMinCrashCents:0,
    sagittariusArrowMinReboundCents:0,
    sagittariusArrowMinUpwardTicks:0,
    sagittariusArrowParentEntryRiseCents:0,
    sagittariusArrowAuroraDamageControlPercent:30,
    sagittariusArrowMinProfitNetPerOriginalContractCents:1,
    scarletNeedleCapitalObservationMinutes:0,
    scarletNeedleCapitalStakeCents:100,
    scarletNeedleCapitalMaxSpreadCents:3,
    scarletNeedleCapitalMinEntryCents:50,
    scarletNeedleCapitalMaxEntryCents:90,
    scarletNeedleCapitalMultiply:5,
    scarletNeedleCapitalMinCrashCents:0,
    scarletNeedleCapitalMinReboundCents:0,
    scarletNeedleCapitalMinUpwardTicks:0,
    scarletNeedleCapitalParentEntryRiseCents:0,
    scarletNeedleCapitalAuroraDamageControlPercent:30,
    scarletNeedleCapitalMinProfitNetPerOriginalContractCents:1,
    pegasusRyuSeiKenCapitalObservationMinutes:0,
    pegasusRyuSeiKenCapitalStakeCents:100,
    pegasusRyuSeiKenCapitalMaxSpreadCents:3,
    pegasusRyuSeiKenCapitalMinEntryCents:50,
    pegasusRyuSeiKenCapitalMaxEntryCents:90,
    pegasusRyuSeiKenCapitalMultiply:5,
    pegasusRyuSeiKenCapitalMinCrashCents:0,
    pegasusRyuSeiKenCapitalMinReboundCents:0,
    pegasusRyuSeiKenCapitalMinUpwardTicks:0,
    pegasusRyuSeiKenCapitalParentEntryRiseCents:0,
    pegasusRyuSeiKenCapitalAuroraDamageControlPercent:30,
    pegasusRyuSeiKenCapitalMinProfitNetPerOriginalContractCents:1,
    greatHornStakeCents: 500,
    greatHornMaxSpreadCents: 3,
    greatHornMinEntryCents: 10,
    greatHornMaxEntryCents: 90,
    greatHornMultiply: 1,
    greatHornMinCrashCents: 1,
    greatHornMinReboundCents: 1,
    greatHornMinUpwardTicks: 1,
    greatHornParentEntryRiseCents: 0,
    greatHornAuroraDamageControlPercent: 45,
    greatHornMinProfitNetPerOriginalContractCents: 2,
    crystalWallRecoveryObservationMinutes: 1,
    crystalWallRecoveryStakeCents: 500,
    crystalWallRecoveryMaxSpreadCents: 3,
    crystalWallRecoveryMinEntryCents: 10,
    crystalWallRecoveryMaxEntryCents: 90,
    crystalWallRecoveryMultiply: 1,
    crystalWallRecoveryMinCrashCents: 1,
    crystalWallRecoveryMinReboundCents: 1,
    crystalWallRecoveryMinUpwardTicks: 1,
    crystalWallRecoveryParentEntryRiseCents: 0,
    crystalWallRecoveryAuroraDamageControlPercent: 45,
    crystalWallRecoveryMinProfitNetPerOriginalContractCents: 2,
    momentumStakeCents: 20000,
    momentumMinEntryCents: 50,
    momentumMaxEntryCents: 60,
    momentumHunterMinCrashCents: 0,
    momentumHunterMinReboundCents: 0,
    momentumHunterMinUpwardTicks: 0,
    momentumHunterMinProfitNetPerOriginalContractCents: 2,
    waveStakeCents: 20000,
    waveMinEntryCents: 50,
    waveMaxEntryCents: 60,
    waveSurferMinCrashCents: 0,
    waveSurferMinReboundCents: 0,
    waveSurferMinUpwardTicks: 0,
    waveSurferMinProfitNetPerOriginalContractCents: 2,
    recoveryStakeCents: 500,
    recoveryMinEntryCents: 10,
    recoveryMaxEntryCents: 50,
    crystalWallMinCrashCents: 15,
    crystalWallMinReboundCents: 5,
    crystalWallMinUpwardTicks: 2,
    crashRecoveryStakeCents: 20000,
    crashRecoveryMinEntryCents: 50,
    crashRecoveryMaxEntryCents: 60,
    crashRecoveryHunterMinCrashCents: 0,
    crashRecoveryHunterMinReboundCents: 0,
    crashRecoveryHunterMinUpwardTicks: 0,
    crashRecoveryHunterMinProfitNetPerOriginalContractCents: 2,
    scarletNeedleStakeCents: 20000,
    scarletNeedleMinEntryCents: 10,
    scarletNeedleMaxEntryCents: 89,
    scarletNeedleInfinityNetPerOriginalContractCents: 1,
    scarletNeedleMaxRepeats: 1,
    scarletNeedleMinCrashCents: 0,
    scarletNeedleMinReboundCents: 0,
    scarletNeedleMinUpwardTicks: 0,
    scarletNeedleMinProfitNetPerOriginalContractCents: 2,
    recoveryHunterMinProfitNetPerOriginalContractCents: 2,
    justiceArrowStakeCents: 500,
    justiceArrowMinEntryCents: 10,
    justiceArrowMaxEntryCents: 50,
    justiceArrowMinCrashCents: 15,
    justiceArrowMinReboundCents: 5,
    justiceArrowMinUpwardTicks: 2,
    justiceArrowMinProfitNetPerOriginalContractCents: 2,
    athenaExclamationStakeCents: 20000,
    athenaExclamationMinEntryCents: 50,
    athenaExclamationMaxEntryCents: 60,
    athenaExclamationMinCrashCents: 0,
    athenaExclamationMinReboundCents: 0,
    athenaExclamationMinUpwardTicks: 0,
    athenaExclamationMinProfitNetPerOriginalContractCents: 2,
    athenaExclamationAthenaX1Enabled: false,
    lightningPlasmaFieldStakeCents: 20000,
    lightningPlasmaMinEntryCents: 50,
    lightningPlasmaMaxEntryCents: 60,
    lightningPlasmaMaxStrikes: 3,
    lightningPlasmaMaxRepeats: 1,
    lightningPlasmaMinCrashCents: 0,
    lightningPlasmaMinReboundCents: 0,
    lightningPlasmaMinUpwardTicks: 0,
    lightningPlasmaMinProfitNetPerOriginalContractCents: 2,
    lightningPlasmaStarlightScaleInCents: 8,
    // Optional Athena original-entry rise gate for Starlight; 0 preserves legacy admission.
    athenaExclamationStarlightTriggerCents: 0,
    momentumHunterMultiply: 1,
    waveSurferMultiply: 1,
    crashRecoveryHunterMultiply: 1,
    recoveryHunterMultiply: 1,
    justiceArrowMultiply: 1,
    scarletNeedleMultiply: 1,
    lightningPlasmaMultiply: 1,
    athenaExclamationMultiply: 1,

    resetTimestampMs: null,
    liveDashboardStartMs: null,
    simulationDashboardStartMs: null,
  };
}

// Ledger-locked factory operator card, exported 2026-10-26T17:32:59Z.
// This changes FACTORY settings only. It never overwrites a persisted operator
// card on deployment. Runtime identity, mode, arm state, engine and reset epoch
// are intentionally excluded; they cannot be copied from a historical ledger.
// The full 165-field comparison fixture lives under reference/.
export const LEDGER_FACTORY_OVERRIDES_20261026 = Object.freeze({
  greatHornEnabled: true,
  greatHornLinkEnabled: true,
  greatHornAthenaX1Enabled: true,
  lightningPlasmaEnabled: true,
  andromedaThunderWaveEnabled: true,
  andromedaThunderWaveLevel: "OPEN",
  freezingCoffinEnabled: true,
  freezingCoffinMaxDropCents: 5,
  greatHornObservationMinutes: 0,
  lightningPlasmaObservationMinutes: 0,
  maxPositions: 1000000,
  maxGameMinutes: 55,
  crashRecoveryHunterAuroraDamageControlPercent: 65,
  lightningPlasmaAuroraDamageControlPercent: 20,
  greatHornStakeCents: 100,
  greatHornMultiply: 5,
  greatHornMinCrashCents: 0,
  greatHornMinReboundCents: 0,
  greatHornMinUpwardTicks: 0,
  greatHornAuroraDamageControlPercent: 20,
  greatHornMinProfitNetPerOriginalContractCents: 1,
  crashRecoveryStakeCents: 100,
  crashRecoveryMinEntryCents: 65,
  crashRecoveryMaxEntryCents: 85,
  crashRecoveryHunterMinProfitNetPerOriginalContractCents: 4,
  athenaExclamationMinReboundCents: 7,
  lightningPlasmaFieldStakeCents: 100,
  lightningPlasmaMinEntryCents: 65,
  lightningPlasmaMaxEntryCents: 95,
  lightningPlasmaMinCrashCents: 0,
  lightningPlasmaMinReboundCents: 0,
  lightningPlasmaMinUpwardTicks: 0,
  lightningPlasmaMinProfitNetPerOriginalContractCents: 1,
  lightningPlasmaStarlightScaleInCents: 7,
  crashRecoveryHunterMultiply: 5,
  lightningPlasmaMultiply: 5,
  athenaExclamationMultiply: 5,
});

// Factory-only operator settings cloned from the 2026-10-28T14:38:56Z
// diagnostic ledger. The remaining operator values already match the
// 2026-10-26 factory profile. Never copy ledger reset epochs or arm states.
export const LEDGER_FACTORY_OVERRIDES_20261028 = Object.freeze({
  crashRecoveryHunterLinkEnabled: false,
  greatHornMaxSpreadCents: 4,
  greatHornMinEntryCents: 50,
  athenaExclamationStarlightTriggerCents: 7,
});

// Factory operator-card values copied from the 2026-11-04T07:08:34Z
// diagnostic (settingsAtExport). Changes FACTORY values only: no stored settings,
// reset/dashboard timestamps, credentials, runtime mode, or LIVE arming state.
export const LEDGER_FACTORY_OVERRIDES_20261104 = Object.freeze({
  sagittariusArrowMaxSpreadCents: 4,
  sagittariusArrowMultiply: 20,
  sagittariusArrowParentEntryRiseCents: 3,
  sagittariusArrowAuroraDamageControlPercent: 45,
  scarletNeedleCapitalMinEntryCents: 30,
  scarletNeedleCapitalMultiply: 20,
  scarletNeedleCapitalParentEntryRiseCents: 3,
  scarletNeedleCapitalAuroraDamageControlPercent: 45,
  pegasusRyuSeiKenCapitalMinEntryCents: 30,
  pegasusRyuSeiKenCapitalMultiply: 20,
  pegasusRyuSeiKenCapitalParentEntryRiseCents: 3,
  pegasusRyuSeiKenCapitalAuroraDamageControlPercent: 45,
  greatHornMinEntryCents: 30,
  greatHornMultiply: 20,
  greatHornParentEntryRiseCents: 3,
  greatHornAuroraDamageControlPercent: 45,
  crystalWallRecoveryMinEntryCents: 30,
  crystalWallRecoveryMultiply: 20,
  crystalWallRecoveryParentEntryRiseCents: 3,
  crystalWallRecoveryAuroraDamageControlPercent: 45,
  crashRecoveryMinEntryCents: 50,
  crashRecoveryMaxEntryCents: 90,
  athenaExclamationMinEntryCents: 50,
  athenaExclamationMaxEntryCents: 90,
  athenaExclamationMinCrashCents: 0,
  athenaExclamationMinReboundCents: 4,
  athenaExclamationMinUpwardTicks: 0,
  athenaExclamationMinProfitNetPerOriginalContractCents: 4,
  crashRecoveryHunterMultiply: 1,
  athenaExclamationMultiply: 1,
  lightningPlasmaMinEntryCents: 50,
  lightningPlasmaMaxEntryCents: 90,
  lightningPlasmaStarlightScaleInCents: 3,
  athenaExclamationStarlightTriggerCents: 4,
  lightningPlasmaAuroraDamageControlPercent: 45,
  sagittariusArrowEnabled: true,
  sagittariusArrowLinkEnabled: false,
  lightningPlasmaLinkEnabled: false,
  sagittariusArrowAthenaX1Enabled: true,
  scarletNeedleCapitalEnabled: true,
  scarletNeedleCapitalLinkEnabled: false,
  scarletNeedleCapitalAthenaX1Enabled: true,
  pegasusRyuSeiKenCapitalEnabled: true,
  pegasusRyuSeiKenCapitalLinkEnabled: false,
  pegasusRyuSeiKenCapitalAthenaX1Enabled: true,
  greatHornLinkEnabled: false,
  crystalWallRecoveryEnabled: true,
  crystalWallRecoveryLinkEnabled: false,
  crashRecoveryHunterLinkEnabled: true,
});

// Latest complete operator settings card, from the 2026-11-05T06:50:47Z
// diagnostic export (settingsAtExport). All other operator factory values
// already match. Apply ONLY to fresh installs and explicit Factory Reset.
// Never copy mode/LIVE arm/engine STOP, reset epochs, identities or secrets.
export const LEDGER_FACTORY_OVERRIDES_20261105 = Object.freeze({
  sagittariusArrowEnabled: false,
  scarletNeedleCapitalEnabled: false,
  pegasusRyuSeiKenCapitalEnabled: false,
  crashRecoveryHunterLinkEnabled: false,
  greatHornMinEntryCents: 50,
  greatHornMultiply: 2,
  crystalWallRecoveryMinEntryCents: 50,
  crystalWallRecoveryMultiply: 2,
  crashRecoveryHunterMinReboundCents: 2,
  crashRecoveryHunterMinUpwardTicks: 2,
  lightningPlasmaMinEntryCents: 60,
  lightningPlasmaMaxEntryCents: 75,
  lightningPlasmaStarlightScaleInCents: 1,
  athenaExclamationStarlightTriggerCents: 2,
  crashRecoveryHunterMultiply: 2,
  lightningPlasmaMultiply: 2,
  athenaExclamationMultiply: 2,
});

// Factory-only operator card copied from the 2026-11-06T10:48:35Z
// diagnostic settingsAtExport. Preserve existing persisted settings,
// installation identity, startup SIMULATION, LIVE arm, and reset epochs.
export const LEDGER_FACTORY_OVERRIDES_20261106 = Object.freeze({
  maxPositions: 3,
  greatHornParentEntryRiseCents: 1,
  greatHornAuroraDamageControlPercent: 30,
  greatHornMinProfitNetPerOriginalContractCents: 8,
  crystalWallRecoveryParentEntryRiseCents: 1,
  crystalWallRecoveryAuroraDamageControlPercent: 35,
  crystalWallRecoveryMinProfitNetPerOriginalContractCents: 8,
  crashRecoveryHunterMinReboundCents: 0,
  crashRecoveryHunterMinUpwardTicks: 0,
  crashRecoveryHunterMultiply: 1,
  athenaExclamationMultiply: 1,
  lightningPlasmaAuroraDamageControlPercent: 25,
  crashRecoveryHunterLinkEnabled: true,
});

// R6-FS1: factory defaults only, sourced from the LIVE diagnostic export
// 2026-11-07T07:28:52.647Z. Runtime settings remain persisted and untouched.
// Never copy mode, LIVE arm, reset epochs, owner/clone identity, or migration markers.
export const LEDGER_FACTORY_OVERRIDES_20261107 = Object.freeze({
  maxPositions: 10,
  greatHornAuroraDamageControlPercent: 40,
  greatHornMinProfitNetPerOriginalContractCents: 1,
  crystalWallRecoveryAuroraDamageControlPercent: 45,
  crystalWallRecoveryMinProfitNetPerOriginalContractCents: 1,
  crashRecoveryHunterMinReboundCents: 2,
  crashRecoveryHunterMinUpwardTicks: 2,
  crashRecoveryHunterMultiply: 2,
  athenaExclamationMultiply: 2,
  lightningPlasmaMaxEntryCents: 80,
  lightningPlasmaStarlightScaleInCents: 7,
  lightningPlasmaAuroraDamageControlPercent: 65,
  crashRecoveryHunterLinkEnabled: false,
});

// R63-MHF1 authoritative fresh-install profile. Keep the conservative
// originalSettings() contract for legacy migrations and missing-key fallbacks,
// while a brand-new database boots with the locked 2026-08-31 running profile.

export const LEDGER_FACTORY_OVERRIDES_20261109 = Object.freeze({
  crashRecoveryHunterLinkEnabled: true,
  freezingCoffinMaxDropCents: 10,
  minGameMinutes: 45,
  maxGameMinutes: 95,
  lightningPlasmaAuroraDamageControlPercent: 55,
  sagittariusArrowMinEntryCents: 70,
  sagittariusArrowMultiply: 1,
  sagittariusArrowAuroraDamageControlPercent: 35,
  scarletNeedleCapitalMaxSpreadCents: 4,
  scarletNeedleCapitalMinEntryCents: 50,
  scarletNeedleCapitalMultiply: 1,
  scarletNeedleCapitalAuroraDamageControlPercent: 35,
  pegasusRyuSeiKenCapitalMaxSpreadCents: 4,
  pegasusRyuSeiKenCapitalMinEntryCents: 50,
  pegasusRyuSeiKenCapitalMultiply: 1,
  pegasusRyuSeiKenCapitalAuroraDamageControlPercent: 35,
  greatHornMinEntryCents: 60,
  greatHornAuroraDamageControlPercent: 45,
  crystalWallRecoveryMinEntryCents: 60,
  crashRecoveryMinEntryCents: 60,
  crashRecoveryHunterMinReboundCents: 0,
  crashRecoveryHunterMinUpwardTicks: 0,
  athenaExclamationMinEntryCents: 60,
  athenaExclamationMinReboundCents: 0,
  lightningPlasmaMinEntryCents: 70,
  lightningPlasmaMaxEntryCents: 90,
  lightningPlasmaStarlightScaleInCents: 1,
  athenaExclamationStarlightTriggerCents: 1,
  crashRecoveryHunterMultiply: 5,
  lightningPlasmaMultiply: 5,
});


export const LEDGER_FACTORY_OVERRIDES_20261109_1650 = Object.freeze({
  greatHornMinEntryCents: 20,
  greatHornMultiply: 5,
  greatHornParentEntryRiseCents: 3,
  crystalWallRecoveryMinEntryCents: 20,
  crystalWallRecoveryMultiply: 5,
  crystalWallRecoveryParentEntryRiseCents: 3,
  crashRecoveryMinEntryCents: 10,
  crashRecoveryMaxEntryCents: 50,
  athenaExclamationMinEntryCents: 10,
  lightningPlasmaMinEntryCents: 20,
  lightningPlasmaMaxEntryCents: 60,
});


export const LEDGER_FACTORY_OVERRIDES_20261110 = Object.freeze({
  crashRecoveryHunterLinkEnabled: false,
  lightningPlasmaAuroraDamageControlPercent: 25,
  greatHornParentEntryRiseCents: 1,
  greatHornAuroraDamageControlPercent: 25,
  crystalWallRecoveryParentEntryRiseCents: 1,
  crystalWallRecoveryAuroraDamageControlPercent: 25,
  crashRecoveryMaxEntryCents: 60,
  crashRecoveryHunterMinCrashCents: 1,
  crashRecoveryHunterMinReboundCents: 1,
  crashRecoveryHunterMinUpwardTicks: 1,
  athenaExclamationMultiply: 5,
});


export const LEDGER_FACTORY_OVERRIDES_20261110_AURORA10 = Object.freeze({
  lightningPlasmaAuroraDamageControlPercent: 10,
  greatHornAuroraDamageControlPercent: 10,
  crystalWallRecoveryAuroraDamageControlPercent: 10,
  sagittariusArrowAuroraDamageControlPercent: 10,
  scarletNeedleCapitalAuroraDamageControlPercent: 10,
  pegasusRyuSeiKenCapitalAuroraDamageControlPercent: 10,
});


export const LEDGER_FACTORY_OVERRIDES_20261110_1544 = Object.freeze({
  athenaExclamationStarlightTriggerCents: 7,
  crashRecoveryMinEntryCents: 20,
  crashRecoveryMaxEntryCents: 70,
  lightningPlasmaMaxEntryCents: 70,
});


export const LEDGER_FACTORY_OVERRIDES_20261110_2051 = Object.freeze({
  lightningPlasmaMinProfitNetPerOriginalContractCents: 12,
});

export function freshInstallSettings() {
  return {
    ...originalSettings(),
    mode:'SIMULATION',
    liveArmed:false,
    engineActive:true,
    athenaExclamationAthenaX1Enabled:true,
    athenaExclamationEnabled:true,
    athenaExclamationMaxEntryCents:85,
    athenaExclamationMinCrashCents:7,
    athenaExclamationMinEntryCents:65,
    athenaExclamationMinProfitNetPerOriginalContractCents:13,
    athenaExclamationMinReboundCents:3,
    athenaExclamationMinUpwardTicks:7,
    athenaExclamationMultiply:1,
    athenaExclamationObservationMinutes:0,
    athenaExclamationStakeCents:100,
    athenaSoulEnabled:true,
    atomicThunderGreenTriggerCents:1,
    auroraDamageControlPercent:10,
    crashRecoveryHunterAthenaX1Enabled:true,
    crashRecoveryHunterAuroraDamageControlPercent:55,
    crashRecoveryHunterEnabled:true,
    starlightExtinctionRealTradeEnabled:false,
    crashRecoveryHunterLinkEnabled:true,
    crashRecoveryHunterMinCrashCents:0,
    crashRecoveryHunterMinProfitNetPerOriginalContractCents:13,
    crashRecoveryHunterMinReboundCents:0,
    crashRecoveryHunterMinUpwardTicks:0,
    crashRecoveryHunterMultiply:1,
    crashRecoveryHunterObservationMinutes:0,
    crashRecoveryMaxEntryCents:80,
    crashRecoveryMinEntryCents:45,
    crashRecoveryStakeCents:500,
    crystalWallMinCrashCents:7,
    crystalWallMinReboundCents:3,
    crystalWallMinUpwardTicks:7,
    crystalWallObservationMinutes:25,
    dragonEnabled:true,
    dragonMaxEpisode:2,
    dragonMaxSignalPriceCents:90,
    dragonMinSignalPriceCents:20,
    dragonReferenceStakeCents:3000,
    eventCooldownMinutes:1,
    freezingCoffinEnabled:false,
    freezingCoffinMaxDropCents:3,
    galacticExplosionEnabled:true,
    geminiEnabled:false,
    geminiMaxPriceCents:75,
    geminiMinPriceCents:35,
    geminiReferenceStakeCents:20000,
    hunterCooldownMinutes:181,
    infinityBreakConfirmationWindowMs:3000,
    infinityBreakMaximumBookAgeMs:1000,
    infinityBreakMinNetPerOriginalContractCents:13,
    infinityBreakRequiredConfirmations:1,
    justiceArrowAthenaX1Enabled:true,
    justiceArrowEnabled:false,
    justiceArrowMaxEntryCents:79,
    justiceArrowMinCrashCents:7,
    justiceArrowMinEntryCents:70,
    justiceArrowMinProfitNetPerOriginalContractCents:13,
    justiceArrowMinReboundCents:3,
    justiceArrowMinUpwardTicks:7,
    justiceArrowMultiply:1,
    justiceArrowObservationMinutes:0,
    justiceArrowStakeCents:100,
    lightningPlasmaAthenaX1Enabled:true,
    lightningPlasmaEnabled:false,
    lightningPlasmaFieldStakeCents:500,
    lightningPlasmaMaxEntryCents:88,
    lightningPlasmaMaxRepeats:1,
    lightningPlasmaMaxStrikes:1,
    lightningPlasmaMinCrashCents:7,
    lightningPlasmaMinEntryCents:74,
    lightningPlasmaMinProfitNetPerOriginalContractCents:13,
    lightningPlasmaMinReboundCents:3,
    lightningPlasmaMinUpwardTicks:7,
    lightningPlasmaMultiply:1,
    lightningPlasmaObservationMinutes:35,
    maxEntriesPerTrade:1,
    maxGameMinutes:120,
    maxPositions:1000,
    maxSpreadCents:3,
    greatHornMaxSpreadCents:3,
    minGameMinutes:30,
    momentumHunterAthenaX1Enabled:true,
    momentumHunterEnabled:false,
    momentumHunterMinCrashCents:7,
    momentumHunterMinProfitNetPerOriginalContractCents:13,
    momentumHunterMinReboundCents:3,
    momentumHunterMinUpwardTicks:7,
    momentumHunterMultiply:1,
    momentumHunterObservationMinutes:30,
    momentumMaxEntryCents:88,
    momentumMinEntryCents:74,
    momentumStakeCents:500,
    pegasusDropCents:10,
    pegasusEnabled:true,
    pegasusMaxPriceCents:90,
    pegasusMinPriceCents:20,
    pegasusReferenceStakeCents:3000,
    phoenixEnabled:true,
    phoenixMaxPriceCents:90,
    phoenixMinPriceCents:20,
    phoenixReferenceStakeCents:3000,
    recoveryHunterAthenaX1Enabled:true,
    recoveryHunterEnabled:false,
    recoveryHunterMinProfitNetPerOriginalContractCents:13,
    recoveryHunterMultiply:1,
    recoveryMaxEntryCents:88,
    recoveryMinEntryCents:74,
    recoveryStakeCents:500,
    recoveryTrackingHours:24,
    scarletNeedleAthenaX1Enabled:true,
    scarletNeedleEnabled:false,
    scarletNeedleInfinityNetPerOriginalContractCents:13,
    scarletNeedleMaxEntryCents:79,
    scarletNeedleMaxRepeats:1,
    scarletNeedleMinCrashCents:7,
    scarletNeedleMinEntryCents:70,
    scarletNeedleMinProfitNetPerOriginalContractCents:13,
    scarletNeedleMinReboundCents:3,
    scarletNeedleMinUpwardTicks:7,
    scarletNeedleMultiply:1,
    scarletNeedleObservationMinutes:0,
    scarletNeedleStakeCents:100,
    simFeeCents:2,
    simFillProbability:1,
    startingCapitalCents:1000000,
    waveMaxEntryCents:88,
    waveMinEntryCents:74,
    waveStakeCents:500,
    waveSurferAthenaX1Enabled:true,
    waveSurferEnabled:false,
    waveSurferMinCrashCents:7,
    waveSurferMinProfitNetPerOriginalContractCents:13,
    waveSurferMinReboundCents:3,
    waveSurferMinUpwardTicks:7,
    waveSurferMultiply:1,
    waveSurferObservationMinutes:15,
    // Ledger factory card is layered over the pre-upgrade historical defaults.
    // Keep all unrelated trading mechanics and migration flags unchanged.
    ...LEDGER_FACTORY_OVERRIDES_20261026,
    ...LEDGER_FACTORY_OVERRIDES_20261028,
    crystalWallRecoveryEnabled:false,
    crystalWallRecoveryLinkEnabled:true,
    crystalWallRecoveryAthenaX1Enabled:true,
    crystalWallRecoveryObservationMinutes:0,
    crystalWallRecoveryStakeCents:100,
    crystalWallRecoveryMaxSpreadCents:4,
    crystalWallRecoveryMinEntryCents:50,
    crystalWallRecoveryMaxEntryCents:90,
    crystalWallRecoveryMultiply:5,
    crystalWallRecoveryMinCrashCents:0,
    crystalWallRecoveryMinReboundCents:0,
    crystalWallRecoveryMinUpwardTicks:0,
    crystalWallRecoveryParentEntryRiseCents:0,
    crystalWallRecoveryAuroraDamageControlPercent:20,
    crystalWallRecoveryMinProfitNetPerOriginalContractCents:1,
    // Latest owner-selected factory card. Never apply it to existing persisted
    // configurations except through the explicit Factory Reset action.
    ...LEDGER_FACTORY_OVERRIDES_20261104,
    ...LEDGER_FACTORY_OVERRIDES_20261105,
    ...LEDGER_FACTORY_OVERRIDES_20261106,
    ...LEDGER_FACTORY_OVERRIDES_20261107,
    ...LEDGER_FACTORY_OVERRIDES_20261109,
    ...LEDGER_FACTORY_OVERRIDES_20261109_1650,
    ...LEDGER_FACTORY_OVERRIDES_20261110,
    ...LEDGER_FACTORY_OVERRIDES_20261110_AURORA10,
    ...LEDGER_FACTORY_OVERRIDES_20261110_1544,
    ...LEDGER_FACTORY_OVERRIDES_20261110_2051,
    ...LEDGER_FACTORY_OVERRIDES_20261111_1559,
    ...LEDGER_FACTORY_OVERRIDES_20261111_1659,
    ...LEDGER_FACTORY_OVERRIDES_20261116_141852,
    resetTimestampMs:null,
    factoryTradingProfile20261005Applied:true,
    athenaArrowCloneApplied:true,
    winningCard20261005Applied:true,
    card20261006Applied:true,
    card20261006SessionApplied:true,
    card20261007LiveApplied:true,
    card20261008Applied:true,
  };
}

export const SETTINGS_MIGRATION_FLAGS = Object.freeze([
  'factoryTradingProfile20261005Applied',
  'athenaArrowCloneApplied',
  'winningCard20261005Applied',
  'card20261006Applied',
  'card20261006SessionApplied',
  'card20261007LiveApplied',
  'card20261008Applied',
]);

export function factoryOperatorSettingsPatch() {
  const factory = freshInstallSettings();
  const patch = {};
  const flags = new Set(SETTINGS_MIGRATION_FLAGS);
  for (const k of EDITABLE_NUMERIC_SETTINGS) if (Object.hasOwn(factory, k) && !flags.has(k)) patch[k] = factory[k];
  for (const k of EDITABLE_BOOLEAN_SETTINGS) if (Object.hasOwn(factory, k) && !flags.has(k)) patch[k] = factory[k];
  // OPEN is a policy level, not a boolean/numeric setting. Include it explicitly
  // so the dashboard Factory Reset restores the exact ledger card.
  patch.andromedaThunderWaveLevel = factory.andromedaThunderWaveLevel;
  return patch;
}

export function startupSettingsPreservation(settings, { preserveCard = false } = {}) {
  const current = settings && typeof settings === 'object' ? { ...settings } : {};
  const recorded = preserveCard || SETTINGS_MIGRATION_FLAGS.some((k) => current[k] === true);
  if (!recorded) return { settings: current, overwrite: true, sealed: [] };
  const sealed = [];
  for (const k of SETTINGS_MIGRATION_FLAGS) if (current[k] !== true) { current[k] = true; sealed.push(k); }
  return { settings: current, overwrite: false, sealed };
}

export function normalizeStartupExecutionMode(settings = {}, allowLiveTrading = env.allowLiveTrading) {
  const current = q17SimSettings(settings && typeof settings === 'object' ? { ...settings } : {});
  // A persisted LIVE selection is impossible to execute when deployment policy
  // explicitly disables LIVE trading. Recover deterministically to SIMULATION
  // while preserving engineActive and every strategy setting. If LIVE is
  // deployment-authorized, the in-memory arm stays false until the health-gated
  // restart resume path commits. A running LIVE engine no longer requires a
  // fresh Enable Live click after a successful deploy.
  if (String(current.mode || '').toUpperCase() === 'LIVE' && allowLiveTrading !== true) {
    return { settings: { ...current, mode:'SIMULATION', liveArmed:false }, recovered:true, reason:'live_trading_disabled' };
  }
  return { settings: { ...current, liveArmed:false }, recovered:false, reason:null };
}


export function kalshiAccountSnapshot(balance) {
  if (!balance || typeof balance !== 'object') return null;
  const cash = Number(balance.balance);
  if (!Number.isFinite(cash)) return null;
  const positionCents = Number.isFinite(Number(balance.portfolio_value)) ? Number(balance.portfolio_value) : 0;
  return { cashCents: cash, positionCents, portfolioCents: cash + positionCents };
}

export function brokerLedgerGaps(positions = [], owned = []) {
  const brokerByTicker = new Map();
  for (const p of positions || []) {
    const ticker = p?.ticker || p?.market_ticker;
    const qty = Math.abs(Number(p?.position_fp ?? p?.position ?? p?.market_position ?? 0));
    if (!ticker || !Number.isFinite(qty) || qty <= 0) continue;
    brokerByTicker.set(ticker, (brokerByTicker.get(ticker) || 0) + qty);
  }
  const ledgerByTicker = new Map();
  for (const e of owned || []) {
    if (!e?.ticker || e.status === 'entry_pending' || e.status === 'pending_recovery') continue;
    const qty = Math.max(0, Number(e.remainingCount ?? e.count ?? 0));
    ledgerByTicker.set(e.ticker, (ledgerByTicker.get(e.ticker) || 0) + qty);
  }
  const untracked = [];
  let brokerContracts = 0;
  let ledgerContracts = 0;
  for (const qty of brokerByTicker.values()) brokerContracts += qty;
  for (const qty of ledgerByTicker.values()) ledgerContracts += qty;
  for (const [ticker, broker] of brokerByTicker) {
    const ledger = ledgerByTicker.get(ticker) || 0;
    if (broker > ledger + 1e-6) untracked.push({ ticker, broker, ledger, untracked: broker - ledger });
  }
  return { brokerContracts, ledgerContracts, untracked };
}


export function sharedAccountBook({ systemId = "SAGITTARIUS", positions = [], owned = [] } = {}) {
  const broker = new Map();
  for (const p of positions || []) {
    const ticker = p?.ticker || p?.market_ticker;
    const qty = Math.abs(Number(p?.position_fp ?? p?.position ?? p?.market_position ?? 0));
    if (!ticker || !Number.isFinite(qty) || qty <= 0) continue;
    broker.set(ticker, (broker.get(ticker) || 0) + qty);
  }
  const own = new Map();
  const ownRows = [];
  for (const e of owned || []) {
    if (!e?.ticker || e.status === "reconciliation_orphaned" || e.status === "closed") continue;
    if (e.status === "entry_pending" || e.status === "pending_recovery") continue;
    const qty = Math.max(0, Number(e.remainingCount ?? e.count ?? 0));
    if (qty <= 0) continue;
    own.set(e.ticker, (own.get(e.ticker) || 0) + qty);
    ownRows.push(e);
  }
  const ignoredOtherSystem = [];
  for (const [ticker, qty] of broker) {
    const mine = own.get(ticker) || 0;
    if (qty > mine + 1e-6) ignoredOtherSystem.push({ ticker, broker: qty, own: mine, ignored: qty - mine, systemId, reason: "other_system_position" });
  }
  const quarantineOwn = [];
  const ownTradable = [];
  for (const [ticker, qty] of own) {
    const have = broker.get(ticker) || 0;
    if (have + 1e-6 < qty) quarantineOwn.push({ ticker, broker: have, own: qty, quarantine: qty - have, systemId, reason: "own_trade_missing_at_broker" });
    else ownTradable.push({ ticker, own: qty, broker: have, systemId });
  }
  return { systemId, ignoredOtherSystem, quarantineOwn, ownTradable, continueTrading: true, blocksOtherSystem: false };
}

export function preserveExecutionArm(prior = {}, sanitized = {}) {
  const next = { ...(sanitized && typeof sanitized === 'object' ? sanitized : {}) };
  const mode = String(prior?.mode || '').toUpperCase();
  next.mode = 'SIMULATION';
  next.liveArmed = false;
  next.liveOwnerAuthorized = false;
  return next;
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
  // SJA2 one-time migration. Justice Arrow adopts the exact *persisted*
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

  if (Object.hasOwn(src,'athenaExclamationStarlightTriggerCents')) {
    const v=src.athenaExclamationStarlightTriggerCents;
    if (v==null || v==='' || typeof v==='boolean' || !Number.isSafeInteger(Number(v)) || Number(v)<0 || Number(v)>99)
      throw new RangeError('athenaExclamationStarlightTriggerCents must be an integer from 0 to 99');
  }
  const out = { ...defaults };
  for (const key of CANONICAL_NUMERIC_SETTINGS) {
    if (!Object.hasOwn(src, key)) continue;
    if (['resetTimestampMs','liveDashboardStartMs','simulationDashboardStartMs'].includes(key) && src[key] == null) { out[key] = null; continue; }
    if (['liveDashboardStartMs','simulationDashboardStartMs'].includes(key) && (!Number.isSafeInteger(Number(src[key])) || Number(src[key])<0)) continue;
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
  // GH-SPREAD-MW1: preserve each existing installation's effective GH admission
  // limit at first deployment. After migration the card is independent: edits to
  // the shared spread must never silently edit GH's separate spread.
  if (!Object.hasOwn(src,'greatHornMaxSpreadCents')) {
    out.greatHornMaxSpreadCents=Number(out.maxSpreadCents);
  }
  // CW1 additive migration: copy CURRENT Great Horn operator parameters once,
  // without altering Great Horn or enabling a new capital layer on deployment.
  for(const tail of ["ObservationMinutes", "StakeCents", "MaxSpreadCents", "MinEntryCents", "MaxEntryCents", "Multiply", "MinCrashCents", "MinReboundCents", "MinUpwardTicks", "ParentEntryRiseCents", "AuroraDamageControlPercent", "MinProfitNetPerOriginalContractCents"]) {
    const own='crystalWallRecovery'+tail,original='greatHorn'+tail;
    if(!Object.hasOwn(src,own))out[own]=out[original];
  }
  for(const tail of ['LinkEnabled','AthenaX1Enabled']) {
    const own='crystalWallRecovery'+tail,original='greatHorn'+tail;
    if(!Object.hasOwn(src,own))out[own]=out[original];
  }
  // MEGAWAVE migration: missing new fields retain approved B defaults and remain disabled.
  // Existing GH factory overrides must not silently change these independent recovery cards.
  for(const prefix of ['sagittariusArrow','scarletNeedleCapital','pegasusRyuSeiKenCapital']){
    if(!Object.hasOwn(src,prefix+'Enabled'))out[prefix+'Enabled']=false;
  }
  // Existing installations remain explicitly opt-in for Crystal Wall buys.
  if(!Object.hasOwn(src,'crystalWallRecoveryEnabled'))out.crystalWallRecoveryEnabled=false;
  // GH1 is a separate identity. Never migrate former Momentum Hunter authority to it.
  // The retired entry authority is intentionally impossible to re-enable through the old card.
  out.momentumHunterEnabled=false;
  if (Object.hasOwn(src, 'systemName') && String(src.systemName).trim()) out.systemName = String(src.systemName).trim();
  if (Object.hasOwn(src, 'ownerId') && String(src.ownerId).trim()) out.ownerId = String(src.ownerId).trim();
  out.mode = 'SIMULATION'; // Q-17 cannot persist a LIVE mode
  if (Object.hasOwn(src, 'andromedaThunderWaveLevel')) {
    const raw=String(src.andromedaThunderWaveLevel||'').trim().toUpperCase();
    out.andromedaThunderWaveLevel = raw==='MID'||raw==='MEDIUM'?'MID':raw==='LOW'?'LOW':(raw==='OPEN'||raw==='ALL'||raw==='NONE'||raw==='CLEAR')?'OPEN':'HIGH';
  }
  // R51 compatibility bridge: old Atomic Thunder profit settings become
  // Infinity Break settings for NEW positions. Historical rows keep their
  // creation-time Atomic Thunder snapshots and close reasons unchanged.
  if (!Object.hasOwn(src, 'infinityBreakMinNetPerOriginalContractCents') && Object.hasOwn(src, 'atomicThunderMinNetPerOriginalContractCents')) out.infinityBreakMinNetPerOriginalContractCents = Number(src.atomicThunderMinNetPerOriginalContractCents);
  if (!Object.hasOwn(src, 'infinityBreakRequiredConfirmations') && Object.hasOwn(src, 'atomicThunderRequiredConfirmations')) out.infinityBreakRequiredConfirmations = Number(src.atomicThunderRequiredConfirmations);
  if (!Object.hasOwn(src, 'infinityBreakMaximumBookAgeMs') && Object.hasOwn(src, 'atomicThunderMaximumBookAgeMs')) out.infinityBreakMaximumBookAgeMs = Number(src.atomicThunderMaximumBookAgeMs);
  if (!Object.hasOwn(src, 'infinityBreakConfirmationWindowMs') && Object.hasOwn(src, 'atomicThunderConfirmationWindowMs')) out.infinityBreakConfirmationWindowMs = Number(src.atomicThunderConfirmationWindowMs);
  out.atomicThunderGreenTriggerCents = Math.max(1, Math.min(99, Math.floor(Number(out.atomicThunderGreenTriggerCents) || 1)));
  out.infinityBreakMinNetPerOriginalContractCents = Math.max(0.01, Number(out.infinityBreakMinNetPerOriginalContractCents) || 0.01);
  out.infinityBreakRequiredConfirmations = Math.max(1, Math.floor(Number(out.infinityBreakRequiredConfirmations) || 1));
  out.infinityBreakMaximumBookAgeMs = Math.max(100, Math.floor(Number(out.infinityBreakMaximumBookAgeMs) || 100));
  out.infinityBreakConfirmationWindowMs = Math.max(250, Math.floor(Number(out.infinityBreakConfirmationWindowMs) || 250));
  out.auroraDamageControlPercent = Math.max(1, Math.min(95, Number(out.auroraDamageControlPercent) || 45));
  out.auroraStopWindowMinutes = Math.max(1, Math.min(720, Math.round(Number(out.auroraStopWindowMinutes) || 90)));
  out.crashRecoveryHunterAuroraDamageControlPercent = Math.max(1, Math.min(95, Number(out.crashRecoveryHunterAuroraDamageControlPercent) || out.auroraDamageControlPercent || 45));
  out.lightningPlasmaAuroraDamageControlPercent = Math.max(1, Math.min(95, Number(out.lightningPlasmaAuroraDamageControlPercent) || out.auroraDamageControlPercent || 45));
  out.scarletNeedleInfinityNetPerOriginalContractCents = Math.max(0.01, Math.min(99, Number(out.scarletNeedleInfinityNetPerOriginalContractCents) || 1));
  out.scarletNeedleMaxRepeats = Math.max(0, Math.min(1, Math.floor(Number(out.scarletNeedleMaxRepeats) || 0)));
  const clampMultiply=(v)=>{const n=Math.floor(Number(v));return Number.isFinite(n)?Math.max(1,Math.min(20,n||1)):1;};
  out.momentumHunterMultiply=clampMultiply(out.momentumHunterMultiply);
  out.greatHornMultiply=clampMultiply(out.greatHornMultiply);
  out.crystalWallRecoveryMultiply=clampMultiply(out.crystalWallRecoveryMultiply);
  out.crystalWallRecoveryAuroraDamageControlPercent=Math.max(1,Math.min(95,Number(out.crystalWallRecoveryAuroraDamageControlPercent)||45));
  out.crystalWallRecoveryParentEntryRiseCents=Math.max(0,Math.min(99,Math.floor(Number(out.crystalWallRecoveryParentEntryRiseCents)||0)));
  out.crystalWallRecoveryMinCrashCents=Math.max(0,Math.min(99,Math.floor(Number(out.crystalWallRecoveryMinCrashCents)||0)));
  out.crystalWallRecoveryMinReboundCents=Math.max(0,Math.min(99,Math.floor(Number(out.crystalWallRecoveryMinReboundCents)||0)));
  out.crystalWallRecoveryMinUpwardTicks=Math.max(0,Math.min(20,Math.floor(Number(out.crystalWallRecoveryMinUpwardTicks)||0)));
  out.crystalWallRecoveryMaxSpreadCents=Math.max(0,Math.min(99,Math.floor(Number(out.crystalWallRecoveryMaxSpreadCents)||0)));
  out.greatHornAuroraDamageControlPercent=Math.max(1,Math.min(95,Number(out.greatHornAuroraDamageControlPercent)||45));
  out.greatHornParentEntryRiseCents=Math.max(0,Math.min(99,Math.floor(Number(out.greatHornParentEntryRiseCents)||0)));
  out.greatHornMinCrashCents=Math.max(0,Math.min(99,Math.floor(Number(out.greatHornMinCrashCents)||0)));
  out.greatHornMinReboundCents=Math.max(0,Math.min(99,Math.floor(Number(out.greatHornMinReboundCents)||0)));
  out.greatHornMinUpwardTicks=Math.max(0,Math.min(20,Math.floor(Number(out.greatHornMinUpwardTicks)||0)));
  out.waveSurferMultiply=clampMultiply(out.waveSurferMultiply);
  out.crashRecoveryHunterMultiply=clampMultiply(out.crashRecoveryHunterMultiply);
  out.recoveryHunterMultiply=clampMultiply(out.recoveryHunterMultiply);
  out.justiceArrowMultiply=clampMultiply(out.justiceArrowMultiply);
  out.scarletNeedleMultiply=clampMultiply(out.scarletNeedleMultiply);
  out.lightningPlasmaMultiply=clampMultiply(out.lightningPlasmaMultiply);
  out.athenaExclamationMultiply=clampMultiply(out.athenaExclamationMultiply);
  out.lightningPlasmaMaxStrikes = Math.max(1, Math.floor(Number(out.lightningPlasmaMaxStrikes) || 1));
  const clampConfirm = (value, fallback, max=99) => {
    const n = Number(value);
    const base = Number.isFinite(n) ? Math.floor(n) : Math.floor(Number(fallback)||0);
    return Math.max(0, Math.min(max, base));
  };
  out.crystalWallMinCrashCents = clampConfirm(out.crystalWallMinCrashCents, 15);
  out.crystalWallMinReboundCents = clampConfirm(out.crystalWallMinReboundCents, 5);
  out.crystalWallMinUpwardTicks = clampConfirm(out.crystalWallMinUpwardTicks, 2, 20);
  out.justiceArrowMinCrashCents = clampConfirm(out.justiceArrowMinCrashCents, 15);
  out.justiceArrowMinReboundCents = clampConfirm(out.justiceArrowMinReboundCents, 5);
  out.justiceArrowMinUpwardTicks = clampConfirm(out.justiceArrowMinUpwardTicks, 2, 20);
  out.justiceArrowMinProfitNetPerOriginalContractCents = Math.max(0.01, Math.min(99, Number(out.justiceArrowMinProfitNetPerOriginalContractCents) || 2));
  for (const k of ['momentumHunterMinCrashCents','momentumHunterMinReboundCents','momentumHunterMinUpwardTicks','waveSurferMinCrashCents','waveSurferMinReboundCents','waveSurferMinUpwardTicks','crashRecoveryHunterMinCrashCents','crashRecoveryHunterMinReboundCents','crashRecoveryHunterMinUpwardTicks','scarletNeedleMinCrashCents','scarletNeedleMinReboundCents','scarletNeedleMinUpwardTicks','lightningPlasmaMinCrashCents','lightningPlasmaMinReboundCents','lightningPlasmaMinUpwardTicks']) out[k]=clampConfirm(out[k],0);
  for (const k of ['crystalWallRecoveryObservationMinutes','greatHornObservationMinutes','momentumHunterObservationMinutes','waveSurferObservationMinutes','crashRecoveryHunterObservationMinutes','crystalWallObservationMinutes','scarletNeedleObservationMinutes','lightningPlasmaObservationMinutes','justiceArrowObservationMinutes','athenaExclamationObservationMinutes']) out[k]=Math.max(0,Math.min(1000,Math.round(Number(out[k])||0)));
  for (const k of ['crystalWallRecoveryMinProfitNetPerOriginalContractCents','greatHornMinProfitNetPerOriginalContractCents','momentumHunterMinProfitNetPerOriginalContractCents','waveSurferMinProfitNetPerOriginalContractCents','crashRecoveryHunterMinProfitNetPerOriginalContractCents','recoveryHunterMinProfitNetPerOriginalContractCents','scarletNeedleMinProfitNetPerOriginalContractCents','lightningPlasmaMinProfitNetPerOriginalContractCents']) out[k]=Math.max(0.01,Math.min(99,Number(out[k])||2));
  out.lightningPlasmaMaxRepeats=Math.max(0,Math.min(1,Math.floor(Number(out.lightningPlasmaMaxRepeats??1))));
  out.lightningPlasmaStarlightScaleInCents=Math.max(0,Math.min(50,Math.round(Number(out.lightningPlasmaStarlightScaleInCents)||0)));
  // R63 simulation/live parity: persisted legacy probabilities are neutralized.
  // SIM still requires fresh executable depth and may fill partially, but never
  // rejects a proven executable IOC through an unrelated random coin flip.

  out.simFillProbability = 1;
  out.liveArmed = false;
  out.liveOwnerAuthorized = false;
  return out;
}


export function liveResumeShouldDeferBrokerRead({fleetSafeActive=false,lastFailureStatus=0,lastFailureEndpoint='',lastFailureAtMs=0,now=Date.now()}={}){
  // A market-read 429 must not freeze account reconciliation. Only a balance
  // throttle is a reason to wait. Resume still requires a clean account proof.
  const balanceFailure=String(lastFailureEndpoint||'')==='balance' && Number(lastFailureStatus)===429 && now-Number(lastFailureAtMs||0)<15000;
  if(fleetSafeActive===true && balanceFailure)return true;
  if(balanceFailure)return true;
  return false;
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

// Factory operator-card values copied from the 2026-11-11T15:59:12Z
// diagnostic (settingsAtExport). Best box so far. Changes FACTORY values only.
export const LEDGER_FACTORY_OVERRIDES_20261111_1559 = Object.freeze({
  lightningPlasmaMinEntryCents: 20,
  lightningPlasmaMaxEntryCents: 90,
  greatHornMinEntryCents: 50,
  greatHornMaxEntryCents: 90,
  scarletNeedleMinEntryCents: 70,
  scarletNeedleMaxEntryCents: 79,
  athenaExclamationMinEntryCents: 10,
  athenaExclamationMaxEntryCents: 90,
  auroraStopWindowMinutes: 90,
  auroraDamageControlPercent: 10,
  infinityBreakMaximumBookAgeMs: 1000,
  lightningPlasmaMinProfitNetPerOriginalContractCents: 12,
});

// Green-box card from sagittarius-ledger-2026-11-11T16-59-28-253Z.
// Operator selected this running configuration as the factory default.
export const LEDGER_FACTORY_OVERRIDES_20261111_1659 = Object.freeze({
  crashRecoveryMaxEntryCents: 90,
  crashRecoveryMinEntryCents: 10,
  crystalWallRecoveryMinEntryCents: 50,
  crystalWallRecoveryParentEntryRiseCents: 7,
  greatHornParentEntryRiseCents: 7,
  lightningPlasmaStarlightScaleInCents: 7,
});

// Owner-authorized factory-only operator card from the LIVE diagnostic export
// sagittarius-ledger-2026-11-16T14-18-52-536Z.zip (settingsAtExport).
// This is for fresh installations and explicit Factory Reset only.
// Never import runtime LIVE mode/arming, identity, reset epochs, or migrations.
export const LEDGER_FACTORY_OVERRIDES_20261116_141852 = Object.freeze({
  maxPositions: 100000,
  minGameMinutes: 30,
  maxGameMinutes: 55,
  auroraStopWindowMinutes: 60,
  freezingCoffinMaxDropCents: 5,
  greatHornMultiply: 1,
  crystalWallRecoveryMultiply: 1,
  athenaExclamationObservationMinutes: 1,
  crashRecoveryHunterMinReboundCents: 3,
  crashRecoveryHunterMinProfitNetPerOriginalContractCents: 1,
  athenaExclamationMinCrashCents: 7,
  athenaExclamationMinReboundCents: 1,
  athenaExclamationMinUpwardTicks: 1,
  crashRecoveryHunterMultiply: 1,
  lightningPlasmaMultiply: 1,
  athenaExclamationMultiply: 1,
  lightningPlasmaMinCrashCents: 1,
  lightningPlasmaMinReboundCents: 1,
  lightningPlasmaMinUpwardTicks: 1,
  lightningPlasmaMinProfitNetPerOriginalContractCents: 1,
  lightningPlasmaStarlightScaleInCents: 1,
  athenaExclamationStarlightTriggerCents: 3,
  sagittariusArrowEnabled: true,
  sagittariusArrowLinkEnabled: true,
  scarletNeedleCapitalEnabled: true,
  pegasusRyuSeiKenCapitalEnabled: true,
  starlightExtinctionRealTradeEnabled: true,
});
