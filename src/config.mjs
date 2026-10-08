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

export const RELEASE = 'SAGITTARIUS-AU2-RESET-ATTACK-COLUMN-2026-10-05';

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
  'athenaExclamationEnabled',
  'lightningPlasmaEnabled',
  'galacticExplosionEnabled',
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
]);

export const EDITABLE_NUMERIC_SETTINGS = Object.freeze(CANONICAL_NUMERIC_SETTINGS.filter((k) => !['resetTimestampMs','simFillProbability'].includes(k)));
export const EDITABLE_BOOLEAN_SETTINGS = Object.freeze(CANONICAL_BOOLEAN_SETTINGS.filter((k) => k !== 'engineActive'));

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
    athenaExclamationEnabled: false,
    lightningPlasmaEnabled: true,
    galacticExplosionEnabled: false,
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
    momentumHunterMultiply: 1,
    waveSurferMultiply: 1,
    crashRecoveryHunterMultiply: 1,
    recoveryHunterMultiply: 1,
    justiceArrowMultiply: 1,
    scarletNeedleMultiply: 1,
    lightningPlasmaMultiply: 1,
    athenaExclamationMultiply: 1,

    resetTimestampMs: null,
  };
}

// R63-MHF1 authoritative fresh-install profile. Keep the conservative
// originalSettings() contract for legacy migrations and missing-key fallbacks,
// while a brand-new database boots with the locked 2026-08-31 running profile.
export function freshInstallSettings() {
  return {
    ...originalSettings(),
    mode:'SIMULATION',
    liveArmed:false,
    engineActive:true,
    pegasusEnabled:true,
    dragonEnabled:true,
    phoenixEnabled:true,
    momentumHunterEnabled:true,
    waveSurferEnabled:true,
    recoveryHunterEnabled:true,
    crashRecoveryHunterEnabled:true,
    scarletNeedleEnabled:true,
    geminiEnabled:false,
    justiceArrowEnabled:true,
    athenaExclamationEnabled:true,
    lightningPlasmaEnabled:true,
    galacticExplosionEnabled:true,
    athenaSoulEnabled:true,
    momentumHunterAthenaX1Enabled:true,
    waveSurferAthenaX1Enabled:true,
    crashRecoveryHunterAthenaX1Enabled:true,
    recoveryHunterAthenaX1Enabled:true,
    justiceArrowAthenaX1Enabled:true,
    scarletNeedleAthenaX1Enabled:true,
    lightningPlasmaAthenaX1Enabled:true,
    athenaExclamationAthenaX1Enabled:true,

    maxPositions:1000,
    maxEntriesPerTrade:1,
    hunterCooldownMinutes:181,
    minGameMinutes:30,
    maxGameMinutes:55,
    eventCooldownMinutes:1,
    maxSpreadCents:3,
    startingCapitalCents:1_000_000,
    simFillProbability:1,
    simFeeCents:2,
    recoveryTrackingHours:24,

    atomicThunderGreenTriggerCents:1,
    infinityBreakMinNetPerOriginalContractCents:13,
    infinityBreakRequiredConfirmations:1,
    infinityBreakMaximumBookAgeMs:1000,
    infinityBreakConfirmationWindowMs:3000,
    auroraDamageControlPercent:70,

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
    momentumMinEntryCents:80,
    momentumMaxEntryCents:88,
    momentumHunterMinCrashCents:7,
    momentumHunterMinReboundCents:5,
    momentumHunterMinUpwardTicks:7,
    momentumHunterMinProfitNetPerOriginalContractCents:13,
    momentumHunterMultiply:1,
    waveStakeCents:500,
    waveMinEntryCents:80,
    waveMaxEntryCents:88,
    waveSurferMinCrashCents:7,
    waveSurferMinReboundCents:3,
    waveSurferMinUpwardTicks:7,
    waveSurferMinProfitNetPerOriginalContractCents:13,
    waveSurferMultiply:1,
    recoveryStakeCents:500,
    recoveryMinEntryCents:80,
    recoveryMaxEntryCents:88,
    crystalWallMinCrashCents:7,
    crystalWallMinReboundCents:3,
    crystalWallMinUpwardTicks:7,
    recoveryHunterMinProfitNetPerOriginalContractCents:13,
    recoveryHunterMultiply:1,
    crashRecoveryStakeCents:500,
    crashRecoveryMinEntryCents:80,
    crashRecoveryMaxEntryCents:88,
    crashRecoveryHunterMinCrashCents:7,
    crashRecoveryHunterMinReboundCents:5,
    crashRecoveryHunterMinUpwardTicks:7,
    crashRecoveryHunterMinProfitNetPerOriginalContractCents:13,
    crashRecoveryHunterMultiply:1,
    scarletNeedleStakeCents:500,
    scarletNeedleMinEntryCents:80,
    scarletNeedleMaxEntryCents:88,
    scarletNeedleInfinityNetPerOriginalContractCents:13,
    scarletNeedleMaxRepeats:1,
    scarletNeedleMinCrashCents:7,
    scarletNeedleMinReboundCents:3,
    scarletNeedleMinUpwardTicks:7,
    scarletNeedleMinProfitNetPerOriginalContractCents:13,
    scarletNeedleMultiply:1,
    justiceArrowStakeCents:500,
    justiceArrowMinEntryCents:80,
    justiceArrowMaxEntryCents:88,
    justiceArrowMinCrashCents:7,
    justiceArrowMinReboundCents:5,
    justiceArrowMinUpwardTicks:7,
    justiceArrowMinProfitNetPerOriginalContractCents:13,
    justiceArrowMultiply:1,
    athenaExclamationStakeCents:500,
    athenaExclamationMinEntryCents:80,
    athenaExclamationMaxEntryCents:88,
    athenaExclamationMinCrashCents:7,
    athenaExclamationMinReboundCents:5,
    athenaExclamationMinUpwardTicks:7,
    athenaExclamationMinProfitNetPerOriginalContractCents:13,
    athenaExclamationMultiply:1,
    lightningPlasmaFieldStakeCents:500,
    lightningPlasmaMinEntryCents:80,
    lightningPlasmaMaxEntryCents:88,
    lightningPlasmaMaxStrikes:1,
    lightningPlasmaMaxRepeats:1,
    lightningPlasmaMinCrashCents:7,
    lightningPlasmaMinReboundCents:3,
    lightningPlasmaMinUpwardTicks:7,
    lightningPlasmaMinProfitNetPerOriginalContractCents:13,
    lightningPlasmaMultiply:1,

    resetTimestampMs:null,
    factoryTradingProfile20261005Applied:false,
    athenaArrowCloneApplied:false,
    winningCard20261005Applied:false,
    card20261006Applied:false,
    card20261006SessionApplied:false,
    card20261007LiveApplied:false,
    card20261008Applied:false,
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
  return patch;
}

export function startupSettingsPreservation(settings) {
  const current = settings && typeof settings === 'object' ? { ...settings } : {};
  const recorded = SETTINGS_MIGRATION_FLAGS.some((k) => current[k] === true);
  if (!recorded) return { settings: current, overwrite: true, sealed: [] };
  const sealed = [];
  for (const k of SETTINGS_MIGRATION_FLAGS) if (current[k] !== true) { current[k] = true; sealed.push(k); }
  return { settings: current, overwrite: false, sealed };
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
  if (mode === 'LIVE' || mode === 'SIMULATION') next.mode = mode;
  next.liveArmed = prior?.liveArmed === true;
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
  out.scarletNeedleInfinityNetPerOriginalContractCents = Math.max(0.01, Math.min(99, Number(out.scarletNeedleInfinityNetPerOriginalContractCents) || 1));
  out.scarletNeedleMaxRepeats = Math.max(0, Math.min(1, Math.floor(Number(out.scarletNeedleMaxRepeats) || 0)));
  const clampMultiply=(v)=>{const n=Math.floor(Number(v));return Number.isFinite(n)?Math.max(1,Math.min(20,n||1)):1;};
  out.momentumHunterMultiply=clampMultiply(out.momentumHunterMultiply);
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
  for (const k of ['momentumHunterMinProfitNetPerOriginalContractCents','waveSurferMinProfitNetPerOriginalContractCents','crashRecoveryHunterMinProfitNetPerOriginalContractCents','recoveryHunterMinProfitNetPerOriginalContractCents','scarletNeedleMinProfitNetPerOriginalContractCents','lightningPlasmaMinProfitNetPerOriginalContractCents']) out[k]=Math.max(0.01,Math.min(99,Number(out[k])||2));
  out.lightningPlasmaMaxRepeats=Math.max(0,Math.min(1,Math.floor(Number(out.lightningPlasmaMaxRepeats)||1)));
  // R63 simulation/live parity: persisted legacy probabilities are neutralized.
  // SIM still requires fresh executable depth and may fill partially, but never
  // rejects a proven executable IOC through an unrelated random coin flip.

  out.simFillProbability = 1;
  out.liveArmed = false;
  return out;
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
