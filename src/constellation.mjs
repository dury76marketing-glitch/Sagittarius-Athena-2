// Twelve Gold Saint Cosmos — Phase 8 trading split.
// Each room executes its own settings and book. One process, one Kalshi account.

export const CONSTELLATION = Object.freeze({
  version: 'TC1',
  phase: 8,
  policyRevision: 'TC1-P8-TRADING-SPLIT',
  fairScanBudget: 4,
  watchdogTokens: Object.freeze({
    GREEN: 4,
    COMPACT: 3,
    PRESSURE: 2,
    TRADE_PRIORITY: 1,
    HARD_RESEARCH_SHED: 0,
  }),
  hostProcessName: 'SAGITTARIUS',
  hostOwnerId: 'sagittarius-main',
  tradingSplitEnabled: true,
  tenantCountExecuting: 12,
  settingsKeyPrefix: 'runtime:',
  fleetSettingsKey: 'fleet',
  masterSettingsKey: 'runtime',
});

export const COSMOS_IDS = Object.freeze([
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
]);

export const COSMOS_DISPLAY = Object.freeze({
  ARIES: 'Aries',
  TAURUS: 'Taurus',
  GEMINI: 'Gemini',
  CANCER: 'Cancer',
  LEO: 'Leo',
  VIRGO: 'Virgo',
  LIBRA: 'Libra',
  SCORPIO: 'Scorpio',
  SAGITTARIUS: 'Sagittarius',
  CAPRICORN: 'Capricorn',
  AQUARIUS: 'Aquarius',
  PISCES: 'Pisces',
});

const COSMOS_SET = new Set(COSMOS_IDS);

export function isCosmosId(value) {
  return COSMOS_SET.has(String(value || '').trim().toUpperCase());
}

export function normalizeCosmosId(value) {
  const id = String(value || '').trim().toUpperCase();
  return COSMOS_SET.has(id) ? id : null;
}

export function cosmosDisplayName(value) {
  const id = normalizeCosmosId(value);
  return id ? COSMOS_DISPLAY[id] : null;
}

export function cosmosSettingsKey(value) {
  const id = normalizeCosmosId(value);
  return id ? `${CONSTELLATION.settingsKeyPrefix}${id}` : null;
}

export function fleetSettingsKey() {
  return CONSTELLATION.fleetSettingsKey;
}

export function isHostProcessName(value) {
  return String(value || '') === CONSTELLATION.hostProcessName;
}

export function sagittariusRoomIsNotHost() {
  return CONSTELLATION.hostProcessName === 'SAGITTARIUS'
    && COSMOS_IDS.includes('SAGITTARIUS');
}

export class ConstellationHost {
  constructor() {
    this.version = CONSTELLATION.version;
    this.phase = CONSTELLATION.phase;
    this.policyRevision = CONSTELLATION.policyRevision;
    this.ids = COSMOS_IDS;
  }

  isRegistered(value) {
    return isCosmosId(value);
  }

  displayName(value) {
    return cosmosDisplayName(value);
  }

  settingsKey(value) {
    return cosmosSettingsKey(value);
  }

  // Phase 1: the running book is still the single existing systemName.
  // Rooms are registered, not yet executing tenants.
  executionIdentity(settings = {}) {
    return {
      phase: this.phase,
      tradingSplitEnabled: CONSTELLATION.tradingSplitEnabled,
      tenantCountRegistered: COSMOS_IDS.length,
      tenantCountExecuting: CONSTELLATION.tenantCountExecuting,
      processName: CONSTELLATION.hostProcessName,
      ownerId: String(settings.ownerId || CONSTELLATION.hostOwnerId),
      systemName: CONSTELLATION.hostProcessName,
      activeTenant: null,
      singleBookEquivalent: false,
    };
  }

  snapshot(settings = {}) {
    const execution = this.executionIdentity(settings);
    return Object.freeze({
      version: this.version,
      phase: this.phase,
      policyRevision: this.policyRevision,
      hostProcessName: CONSTELLATION.hostProcessName,
      hostOwnerId: CONSTELLATION.hostOwnerId,
      sagittariusRoomIsNotHost: sagittariusRoomIsNotHost(),
      tradingSplitEnabled: CONSTELLATION.tradingSplitEnabled,
      settingsTenancy: true,
      bookTenancy: true,
      scanFanout: true,
      watchdog: true,
      fleetLock: true,
      operatorSurface: true,
      tradingSplit: true,
      rooms: COSMOS_IDS.map((id) => Object.freeze({
        id,
        displayName: COSMOS_DISPLAY[id],
        settingsKey: cosmosSettingsKey(id),
        executing: CONSTELLATION.tradingSplitEnabled,
      })),
      execution,
    });
  }
}

export function constellationSettingsKeys() {
  return Object.freeze([
    CONSTELLATION.masterSettingsKey,
    CONSTELLATION.fleetSettingsKey,
    ...COSMOS_IDS.map((id) => cosmosSettingsKey(id)),
  ]);
}

export function cloneSettingsUnchanged(settings) {
  return JSON.parse(JSON.stringify(settings || {}));
}

export class SettingsTenancyLedger {
  constructor(store = new Map()) {
    this.store = store;
  }

  writeHost(settings) {
    const clone = cloneSettingsUnchanged(settings);
    this.store.set(CONSTELLATION.masterSettingsKey, clone);
    this.store.set(CONSTELLATION.fleetSettingsKey, cloneSettingsUnchanged(clone));
    return clone;
  }

  writeMaster(settings) {
    const clone = this.writeHost(settings);
    for (const id of COSMOS_IDS) {
      this.store.set(cosmosSettingsKey(id), cloneSettingsUnchanged(clone));
    }
    return clone;
  }

  writeOne(id, settings) {
    const key = cosmosSettingsKey(id);
    if (!key) throw new Error(`unknown_cosmos:${id}`);
    const clone = cloneSettingsUnchanged(settings);
    this.store.set(key, clone);
    return clone;
  }

  read(key, fallback = null) {
    const row = this.store.get(key);
    return row ? cloneSettingsUnchanged(row) : fallback;
  }

  readCosmos(id, fallback = null) {
    return this.read(cosmosSettingsKey(id), fallback);
  }
}

export function isolateBook(rows, cosmosId) {
  const id = normalizeCosmosId(cosmosId);
  if (!id) return [];
  return (rows || []).filter((row) => String(row?.systemName || '') === id);
}

export function partitionBooks(rows) {
  const books = Object.fromEntries(COSMOS_IDS.map((id) => [id, []]));
  const stray = [];
  for (const row of rows || []) {
    const id = normalizeCosmosId(row?.systemName);
    if (id) books[id].push(row);
    else stray.push(row);
  }
  return { books, stray };
}

export function emptyCosmosBooks() {
  return Object.fromEntries(COSMOS_IDS.map((id) => [id, []]));
}


export function inCosmosClockWindow(elapsedMinutes, minGameMinutes = 0, maxGameMinutes = 0) {
  void elapsedMinutes; void minGameMinutes; void maxGameMinutes;
  return true;
}

export class FairScanScheduler {
  constructor({ ids = COSMOS_IDS, budget = CONSTELLATION.fairScanBudget } = {}) {
    this.ids = Object.freeze([...(ids || COSMOS_IDS)]);
    this.budget = Math.max(1, Math.min(this.ids.length, Number(budget) || CONSTELLATION.fairScanBudget));
    this.cursor = 0;
    this.ticks = 0;
  }

  nextTick(budget = this.budget) {
    const n = Math.max(1, Math.min(this.ids.length, Number(budget) || this.budget));
    const out = [];
    for (let i = 0; i < n; i += 1) out.push(this.ids[(this.cursor + i) % this.ids.length]);
    this.cursor = (this.cursor + n) % this.ids.length;
    this.ticks += 1;
    return out;
  }
}


export function watchdogDiscoveryTokens(pressureState = 'GREEN') {
  const table = CONSTELLATION.watchdogTokens || {};
  const key = String(pressureState || 'GREEN').toUpperCase();
  if (Object.hasOwn(table, key)) return Math.max(0, Number(table[key]) || 0);
  return Math.max(0, Number(table.GREEN) || 0);
}

export function watchdogMayDiscover(pressureState = 'GREEN') {
  return watchdogDiscoveryTokens(pressureState) > 0;
}


export function fleetTickerLockKey(ticker) {
  return `fleet|ticker|${String(ticker || '').trim()}`;
}

export class FleetTickerLock {
  constructor() {
    this.held = new Map();
  }

  occupier(ticker) {
    const key = String(ticker || '').trim();
    return key ? (this.held.get(key) || null) : null;
  }

  tryAcquire(ticker, cosmosId, { unison=false }={}) {
    const key = String(ticker || '').trim();
    const owner = String(cosmosId || '').trim();
    if (!key || !owner) return { ok: false, reason: 'fleet_lock_invalid' };
    if (unison===true) {
      this.shared = this.shared instanceof Map ? this.shared : new Map();
      const set = this.shared.get(key) || new Set();
      set.add(owner);
      this.shared.set(key, set);
      return { ok: true, occupier: owner, unison:true };
    }
    const current = this.held.get(key);
    if (current && current !== owner) return { ok: false, reason: 'fleet_ticker_occupied', occupier: current };
    this.held.set(key, owner);
    return { ok: true, occupier: owner };
  }

  release(ticker, cosmosId) {
    const key = String(ticker || '').trim();
    const owner = String(cosmosId || '').trim();
    if (!key) return false;
    const current = this.held.get(key);
    if (current && current !== owner) return false;
    return this.held.delete(key);
  }
}
