import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { RELEASE, originalSettings, sanitizeRuntimeSettings } from '../src/config.mjs';
import {
  CONSTELLATION,
  COSMOS_IDS,
  COSMOS_DISPLAY,
  ConstellationHost,
  SettingsTenancyLedger,
  isCosmosId,
  normalizeCosmosId,
  cosmosDisplayName,
  cosmosSettingsKey,
  fleetSettingsKey,
  sagittariusRoomIsNotHost,
  constellationSettingsKeys,
  isolateBook,
  partitionBooks,
  emptyCosmosBooks,
  FairScanScheduler,
  inCosmosClockWindow,
  watchdogDiscoveryTokens,
  watchdogMayDiscover,
  FleetTickerLock,
} from '../src/constellation.mjs';
import { MEGA_WAVE } from '../src/doctrine.mjs';
import { SagittariusEngine } from '../src/engine.mjs';

test('TC1 registry freezes twelve constellation rooms', () => {
  assert.equal(CONSTELLATION.version, 'TC1');
  assert.equal(CONSTELLATION.phase, 8);
  assert.equal(CONSTELLATION.policyRevision, 'TC1-P8-TRADING-SPLIT');
  assert.equal(CONSTELLATION.tradingSplitEnabled, true);
  assert.equal(CONSTELLATION.tenantCountExecuting, 12);
  assert.equal(COSMOS_IDS.length, 12);
  assert.deepEqual([...COSMOS_IDS], [
    'ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO',
    'LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES',
  ]);
  for (const id of COSMOS_IDS) {
    assert.equal(typeof COSMOS_DISPLAY[id], 'string');
    assert.equal(normalizeCosmosId(id.toLowerCase()), id);
    assert.equal(cosmosSettingsKey(id), `runtime:${id}`);
  }
  assert.equal(isCosmosId('orion'), false);
  assert.equal(normalizeCosmosId('ORION'), null);
  assert.equal(fleetSettingsKey(), 'fleet');
  assert.equal(constellationSettingsKeys().length, 14);
});

test('TC1 Sagittarius room is not the host process', () => {
  assert.equal(CONSTELLATION.hostProcessName, 'SAGITTARIUS');
  assert.equal(CONSTELLATION.hostOwnerId, 'sagittarius-main');
  assert.equal(COSMOS_IDS.includes('SAGITTARIUS'), true);
  assert.equal(cosmosDisplayName('SAGITTARIUS'), 'Sagittarius');
  assert.equal(sagittariusRoomIsNotHost(), true);
});

test('TC1-P8 host wrapper schedules twelve executing rooms in one process', () => {
  const host = new ConstellationHost();
  const snap = host.snapshot({ systemName: 'SAGITTARIUS', ownerId: 'sagittarius-main' });
  assert.equal(snap.phase, 8);
  assert.equal(snap.tradingSplitEnabled, true);
  assert.equal(snap.settingsTenancy, true);
  assert.equal(snap.bookTenancy, true);
  assert.equal(snap.scanFanout, true);
  assert.equal(snap.watchdog, true);
  assert.equal(snap.fleetLock, true);
  assert.equal(snap.operatorSurface, true);
  assert.equal(snap.tradingSplit, true);
  assert.equal(snap.rooms.length, 12);
  assert.equal(snap.rooms.every((r) => r.executing === true), true);
  assert.equal(snap.execution.tenantCountExecuting, 12);
  assert.equal(snap.execution.singleBookEquivalent, false);
  assert.equal(snap.execution.activeTenant, null);
});

test('TC1 does not change Mega Wave doctrine or release identity', () => {
  assert.equal(RELEASE, 'SAGITTARIUS-MEGA-WAVE-MW1-MW2-MW3-RWY-HF6-CHAIN-REPAIR-2026-09-09');
  assert.equal(MEGA_WAVE.version, 'MEGA-WAVE-MW1-MW2-MW3');
  assert.equal(MEGA_WAVE.maximumFollowUpAttacks, 12);
});

test('TC1-P2 master Save writes twelve identical full-stake clones', () => {
  const master = originalSettings();
  master.athenaExclamationStakeCents = 700;
  master.crystalWallMinCrashCents = 18;
  const ledger = new SettingsTenancyLedger();
  ledger.writeMaster(master);
  assert.equal(ledger.store.size, 14);
  assert.equal(ledger.read('runtime').athenaExclamationStakeCents, 700);
  assert.equal(ledger.read('fleet').athenaExclamationStakeCents, 700);
  for (const id of COSMOS_IDS) {
    const row = ledger.readCosmos(id);
    assert.equal(row.athenaExclamationStakeCents, 700);
    assert.equal(row.crystalWallMinCrashCents, 18);
    assert.equal(row.athenaExclamationStakeCents, master.athenaExclamationStakeCents);
  }
});

test('TC1-P2 one-room patch writes one row only', () => {
  const master = originalSettings();
  const ledger = new SettingsTenancyLedger();
  ledger.writeMaster(master);
  ledger.writeOne('ARIES', { ...master, crystalWallMinCrashCents: 20, crystalWallWinsToTriggerAthena: 3 });
  assert.equal(ledger.readCosmos('ARIES').crystalWallMinCrashCents, 20);
  assert.equal(ledger.readCosmos('TAURUS').crystalWallMinCrashCents, master.crystalWallMinCrashCents);
  assert.equal(ledger.readCosmos('LEO').crystalWallWinsToTriggerAthena, master.crystalWallWinsToTriggerAthena);
  assert.equal(ledger.read('runtime').crystalWallMinCrashCents, master.crystalWallMinCrashCents);
});

test('TC1-P2 engine master Save broadcasts; one-room patch does not move the live book', async () => {
  const master = originalSettings();
  const ledger = new SettingsTenancyLedger();
  ledger.writeMaster(master);
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { ...master, systemName: 'SAGITTARIUS', ownerId: 'mw-test', mode: 'SIMULATION' };
  engine.settingsMutationTail = Promise.resolve();
  engine.constellation = new ConstellationHost();
  engine.settingsPersistence = null;
  engine.invalidateStateSnapshot = () => {};
  engine.requestScan = () => {};
  engine.db = {
    async saveSettings(settings) { ledger.writeHost(settings); },
    async broadcastSettingsToAllCosmos(settings) {
      for (const id of COSMOS_IDS) ledger.writeOne(id, settings);
    },
    async loadSettings(defaults) { return { ...defaults, ...ledger.read('runtime') }; },
    async loadCosmosSettings(id, defaults) { return { ...defaults, ...ledger.readCosmos(id) }; },
    async saveCosmosSettings(id, settings) { ledger.writeOne(id, settings); },
    async audit() {},
  };

  await engine.applySettingsPatch({ athenaExclamationStakeCents: 800 });
  assert.equal(engine.settings.athenaExclamationStakeCents, 800);
  for (const id of COSMOS_IDS) assert.equal(ledger.readCosmos(id).athenaExclamationStakeCents, 800);

  await engine.patchCosmosSettings('ARIES', { crystalWallMinCrashCents: 21 });
  assert.equal(ledger.readCosmos('ARIES').crystalWallMinCrashCents, 21);
  assert.equal(ledger.readCosmos('TAURUS').crystalWallMinCrashCents, master.crystalWallMinCrashCents);
  assert.equal(engine.settings.crystalWallMinCrashCents, master.crystalWallMinCrashCents);
});

test('TC1-P8 createHunter stays settings-bound and is not hardcoded to one room', async () => {
  const engine = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  assert.ok(engine.includes("from './constellation.mjs'"));
  assert.ok(engine.includes('new ConstellationHost()'));
  assert.ok(engine.includes('patchCosmosSettings'));
  assert.ok(engine.includes('ensureCosmosSettingsRows'));
  const createHunter = engine.slice(engine.indexOf('async createHunter'), engine.indexOf('async createHunter') + 2500);
  assert.equal(createHunter.includes('runtime:ARIES'), false);
});

test('TC1-P3 Aries cannot see Taurus rows', () => {
  const rows = [
    { id: 'a1', systemName: 'ARIES', ticker: 'YES-A', status: 'open' },
    { id: 't1', systemName: 'TAURUS', ticker: 'YES-T', status: 'closed' },
    { id: 's1', systemName: 'SAGITTARIUS', ticker: 'YES-S', status: 'open' },
    { id: 'x1', systemName: 'ORION', ticker: 'YES-X', status: 'open' },
  ];
  assert.deepEqual(isolateBook(rows, 'ARIES').map((r) => r.id), ['a1']);
  assert.deepEqual(isolateBook(rows, 'TAURUS').map((r) => r.id), ['t1']);
  assert.equal(isolateBook(rows, 'ARIES').some((r) => r.systemName === 'TAURUS'), false);
  const { books, stray } = partitionBooks(rows);
  assert.equal(books.ARIES.length, 1);
  assert.equal(books.TAURUS.length, 1);
  assert.equal(books.GEMINI.length, 0);
  assert.equal(stray.length, 1);
  assert.equal(Object.keys(emptyCosmosBooks()).length, 12);
});

test('TC1-P3 restart hydrates twelve isolated books', async () => {
  const rows = [
    { id: 'a1', systemName: 'ARIES', ticker: 'YES-A', status: 'open' },
    { id: 'a2', systemName: 'ARIES', ticker: 'YES-A2', status: 'closed' },
    { id: 't1', systemName: 'TAURUS', ticker: 'YES-T', status: 'open' },
  ];
  const engine = Object.create(SagittariusEngine.prototype);
  engine.constellation = new ConstellationHost();
  engine.cosmosBooks = emptyCosmosBooks();
  engine.db = {
    async entries(systemName) { return rows.filter((r) => r.systemName === systemName); },
    async hydrateAllCosmosEntries() {
      const books = emptyCosmosBooks();
      for (const id of COSMOS_IDS) books[id] = rows.filter((r) => r.systemName === id);
      return books;
    },
  };
  const hydrated = await engine.hydrateCosmosBooks();
  assert.equal(hydrated.ARIES.length, 2);
  assert.equal(hydrated.TAURUS.length, 1);
  assert.equal(hydrated.GEMINI.length, 0);
  const aries = await engine.getCosmosBook('ARIES');
  assert.equal(aries.open, 1);
  assert.equal(aries.closed, 1);
  assert.equal(aries.entries.some((r) => r.systemName === 'TAURUS'), false);
  const taurus = await engine.getCosmosBook('TAURUS');
  assert.equal(taurus.entries.every((r) => r.systemName === 'TAURUS'), true);
});


test('TC1-P4 one shared elapsed minutes supports three room windows', () => {
  const elapsed = 48;
  assert.equal(inCosmosClockWindow(elapsed, 10, 45), false);
  assert.equal(inCosmosClockWindow(elapsed, 10, 50), true);
  assert.equal(inCosmosClockWindow(elapsed, 10, 55), true);
  assert.equal(inCosmosClockWindow(22, 10, 45), true);
  assert.equal(inCosmosClockWindow(null, 10, 45), false);
});

test('TC1-P4 fair scheduler rotates rooms and does not invent twelve scanners', () => {
  const sched = new FairScanScheduler({ ids: COSMOS_IDS, budget: 4 });
  const a = sched.nextTick();
  const b = sched.nextTick();
  assert.equal(a.length, 4);
  assert.equal(b.length, 4);
  assert.notDeepEqual(a, b);
  assert.equal(new Set([...a, ...b]).size, 8);
});

test('TC1-P4 engine scan observer uses one discover and host probe', async () => {
  const engineSrc = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  assert.ok(engineSrc.includes('observeConstellationScan(markets)'));
  assert.equal((engineSrc.match(/market\.discover\(/g) || []).length, 1);
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { minGameMinutes: 10, maxGameMinutes: 45 };
  engine.fairScan = new FairScanScheduler({ ids: COSMOS_IDS, budget: 4 });
  engine.fairScan.cursor = 0;
  engine.cosmosWindowById = Object.fromEntries(COSMOS_IDS.map((id) => [id, { minGameMinutes: 10, maxGameMinutes: 45 }]));
  engine.cosmosWindowById.ARIES = { minGameMinutes: 10, maxGameMinutes: 45 };
  engine.cosmosWindowById.TAURUS = { minGameMinutes: 10, maxGameMinutes: 50 };
  engine.cosmosWindowById.GEMINI = { minGameMinutes: 10, maxGameMinutes: 55 };
  engine.sharedElapsedMinutes = () => 48;
  const snap = SagittariusEngine.prototype.observeConstellationScan.call(engine, [{ ticker: 'KXMLBGAME-1-HOME', eventTicker: 'KXMLBGAME-1' }]);
  assert.equal(snap.discoverOnce, true);
  assert.equal(snap.probeOwner, 'host');
  assert.deepEqual(snap.evaluated, ['ARIES', 'TAURUS', 'GEMINI', 'CANCER']);
  assert.equal(snap.windows.ARIES.outWindow, 1);
  assert.equal(snap.windows.TAURUS.inWindow, 1);
  assert.equal(snap.windows.GEMINI.inWindow, 1);
});


test('TC1-P5 watchdog shrinks discovery tokens and never spends them on exits', () => {
  assert.equal(watchdogDiscoveryTokens('GREEN'), 4);
  assert.equal(watchdogDiscoveryTokens('COMPACT'), 3);
  assert.equal(watchdogDiscoveryTokens('PRESSURE'), 2);
  assert.equal(watchdogDiscoveryTokens('TRADE_PRIORITY'), 1);
  assert.equal(watchdogDiscoveryTokens('HARD_RESEARCH_SHED'), 0);
  assert.equal(watchdogMayDiscover('HARD_RESEARCH_SHED'), false);
  assert.equal(watchdogMayDiscover('GREEN'), true);
});

test('TC1-P5 heat skips discovery fan-out but leaves protection outside the token gate', async () => {
  const src = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  const scan = src.slice(src.indexOf('async fullScan()'), src.indexOf('async fullScan()') + 7000);
  const protectAt = scan.indexOf("await this.runProtectionSweep('full_scan')");
  const evalAt = scan.indexOf('discoveryTokens>0');
  assert.ok(protectAt >= 0);
  assert.ok(evalAt > protectAt, 'protection must run before the discovery token gate');
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { minGameMinutes: 10, maxGameMinutes: 45 };
  engine.resourcePressureState = 'HARD_RESEARCH_SHED';
  engine.fairScan = new FairScanScheduler({ ids: COSMOS_IDS, budget: 4 });
  engine.cosmosWindowById = Object.fromEntries(COSMOS_IDS.map((id) => [id, { minGameMinutes: 10, maxGameMinutes: 45 }]));
  engine.sharedElapsedMinutes = () => 22;
  const snap = SagittariusEngine.prototype.observeConstellationScan.call(engine, [{ ticker: 'KXMLBGAME-1-HOME' }]);
  assert.deepEqual(snap.evaluated, []);
  assert.equal(snap.tokens, 0);
  assert.equal(snap.discoveryDeferred, true);
  assert.equal(snap.protectionExempt, true);
});


test('TC1-P6 second room cannot occupy an already held ticker', () => {
  const lock = new FleetTickerLock();
  assert.equal(lock.tryAcquire('YES-A', 'ARIES').ok, true);
  const second = lock.tryAcquire('YES-A', 'TAURUS');
  assert.equal(second.ok, false);
  assert.equal(second.occupier, 'ARIES');
  assert.equal(lock.tryAcquire('YES-B', 'TAURUS').ok, true);
  assert.equal(lock.release('YES-A', 'ARIES'), true);
  assert.equal(lock.tryAcquire('YES-A', 'TAURUS').ok, true);
});

test('TC1-P6 createHunter consults fleet occupancy and fleet lock', async () => {
  const strategy = await readFile(new URL('../src/strategy.mjs', import.meta.url), 'utf8');
  assert.ok(strategy.includes('openFleetHunterEntriesByTicker'));
  assert.ok(strategy.includes('acquireFleetTickerLock'));
  assert.ok(strategy.includes('fleet_ticker_lock_busy'));
  const db = await readFile(new URL('../src/db.mjs', import.meta.url), 'utf8');
  assert.ok(db.includes("where ticker=$1 and archived=false and concept_name = any($2::text[])"));
});


test('TC1-P7 homepage keeps original architecture and adds twelve-cosmos overview', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="atomicThunderBoltSection"'));
  assert.ok(html.includes('ATHENA'));
  assert.ok(html.includes('id="infinityBreakSection"'));
  assert.ok(html.includes('id="auroraExecutionSection"'));
  assert.ok(html.includes('id="cosmoUniverseSection"'));
  assert.ok(html.includes('TWELVE GOLDEN SAINT COSMOS'));
  assert.ok(html.includes('twelveCosmosBody'));
  assert.ok(html.includes('Download Diagnostics'));
  assert.ok(html.includes('Download Trading Logs'));
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('href="#cosmos/'));
  assert.ok(app.includes('/api/cosmos/subset'));
});

test('TC1-P7 subset patch writes only selected rooms', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = originalSettings();
  engine.settingsMutationTail = Promise.resolve();
  engine.invalidateStateSnapshot = () => {};
  const rows = {};
  engine.db = {
    async loadCosmosSettings(id, defaults) { return { ...defaults, ...(rows[id] || engine.settings) }; },
    async saveCosmosSettings(id, settings) { rows[id] = settings; },
    async audit() {},
  };
  const out = await engine.patchCosmosSubset(['ARIES','LEO'], { crystalWallMinCrashCents: 22 });
  assert.equal(out.count, 2);
  assert.equal(rows.ARIES.crystalWallMinCrashCents, 22);
  assert.equal(rows.LEO.crystalWallMinCrashCents, 22);
  assert.equal(rows.TAURUS, undefined);
});


test('TC1-P8 withCosmosSettings binds the room then restores the host book', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { systemName: 'SAGITTARIUS', ownerId: 'host', mode: 'SIMULATION', engineActive: true, liveArmed: false, minGameMinutes: 10 };
  engine.db = {
    async loadCosmosSettings(id, defaults) {
      return { ...defaults, systemName: id, crystalWallMinCrashCents: id === 'ARIES' ? 22 : 15 };
    },
  };
  let seen = null;
  await engine.withCosmosSettings('ARIES', async (bound) => { seen = bound; });
  assert.equal(seen.systemName, 'ARIES');
  assert.equal(seen.ownerId, 'host');
  assert.equal(seen.crystalWallMinCrashCents, 22);
  assert.equal(engine.settings.systemName, 'SAGITTARIUS');
});

test('TC1-P8 scheduled evaluation uses room settings and fleet protection source', async () => {
  const engineSrc = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  assert.ok(engineSrc.includes('evaluateScheduledCosmos'));
  assert.ok(engineSrc.includes('withCosmosSettings'));
  const guard = await readFile(new URL('../src/profitGuard.mjs', import.meta.url), 'utf8');
  assert.ok(guard.includes('openFleetHunterEntries'));
});


test('TC1 overview counts only real SIM/LIVE hunters and excludes shadow cosmos', () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.constellation = new ConstellationHost();
  engine.settings = { minGameMinutes: 30, maxGameMinutes: 55 };
  engine.cosmosWindowById = {};
  engine.cosmosBooks = {
    ARIES: [
      { systemName: 'ARIES', conceptName: 'Athena Exclamation', status: 'closed', pnlCents: 80 },
      { systemName: 'ARIES', conceptName: 'Pegasus', status: 'closed', pnlCents: 999 },
      { systemName: 'ARIES', conceptName: 'Dragon', status: 'open' },
      { systemName: 'ARIES', conceptName: 'Phoenix', status: 'closed', pnlCents: 12 },
      { systemName: 'ARIES', conceptName: 'Crystal Wall Shadow', status: 'closed', pnlCents: -1666 },
      { systemName: 'ARIES', conceptName: 'Recovery Hunter', status: 'closed', pnlCents: -50 },
      { systemName: 'ARIES', conceptName: 'Another Dimension', status: 'closed', pnlCents: 7 },
    ],
  };
  const rows = engine.collectConstellationOverview();
  const aries = rows.find((row) => row.id === 'ARIES');
  assert.equal(aries.open, 0);
  assert.equal(aries.closed, 1);
  assert.equal(aries.pnlCents, 80);
});

test('TC1 homepage keeps a top Home control and hides shadow from overview copy', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="homeBtn"'));
  assert.ok(html.includes('>Home</a>'));
  assert.ok(html.includes('Real SIM and LIVE Execution Attacks only'));
});


test('TC1 homepage subset picker lists twelve rooms and Crystal Wall crash rebound ticks', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES']) {
    assert.ok(html.includes(`data-subset-cosmos="${id}"`), id);
  }
  assert.ok(html.includes('id="subsetCrystalCrash"'));
  assert.ok(html.includes('id="subsetCrystalRebound"'));
  assert.ok(html.includes('id="subsetCrystalTicks"'));
  assert.ok(html.includes('id="subsetSelectAllBtn"'));
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('crystalWallMinReboundCents'));
  assert.ok(app.includes('crystalWallMinUpwardTicks'));
});


test('TC1 LIVE portfolio uses Kalshi account balance and not simulation capital', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { mode: 'LIVE', startingCapitalCents: 1_000_000 };
  engine.balance = { balance: 43210, balance_breakdown: [{ exchange_index: 0, balance: 43210 }] };
  assert.equal(engine.liveKalshiBalanceCents(), 43210);
  assert.equal(engine.portfolioValueCentsForMode(1_001_250), 43210);
  engine.settings = { mode: 'SIMULATION', startingCapitalCents: 1_000_000 };
  assert.equal(engine.portfolioValueCentsForMode(1_001_250), 1_001_250);
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="portfolioValueLabel"'));
});


test('TC1 subset tool is homepage-only and the overview table is foldable', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="twelveCosmosHomeOnly"'));
  assert.ok(html.includes('id="twelveCosmosTableFold"'));
  assert.ok(html.includes('id="twelveCosmosSubsetFold"'));
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes("homeOnly.classList.toggle('hidden'"));
  assert.ok(app.includes('/api/cosmos/${active}/settings'));
  assert.ok(app.includes('boardState'));
});

test('TC1-P7 subset patch writes crash rebound and ticks onto selected rooms only', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = originalSettings();
  engine.settingsMutationTail = Promise.resolve();
  engine.invalidateStateSnapshot = () => {};
  engine.setCosmosWindow = () => {};
  const rows = {};
  engine.db = {
    async loadCosmosSettings(id, defaults) { return { ...defaults, ...(rows[id] || engine.settings) }; },
    async saveCosmosSettings(id, settings) { rows[id] = settings; },
    async audit() {},
  };
  const out = await engine.patchCosmosSubset(['ARIES','PISCES'], {
    crystalWallMinCrashCents: 18,
    crystalWallMinReboundCents: 7,
    crystalWallMinUpwardTicks: 3,
  });
  assert.equal(out.ok, true);
  assert.equal(out.count, 2);
  assert.equal(rows.ARIES.crystalWallMinCrashCents, 18);
  assert.equal(rows.ARIES.crystalWallMinReboundCents, 7);
  assert.equal(rows.ARIES.crystalWallMinUpwardTicks, 3);
  assert.equal(rows.PISCES.crystalWallMinCrashCents, 18);
  assert.equal(rows.TAURUS, undefined);
});


test('TC1 homepage order is title, controls, performance, open, closed, twelve cosmos, operator fold, Athena', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const order = [
    'Download Diagnostics',
    'id="modeBtn"',
    'id="portfolioPerformanceSection"',
    'id="openHunterBody"',
    'id="closedPositionsFold"',
    'TWELVE GOLDEN SAINT COSMOS',
    'id="operatorSettingsFold"',
    'id="twelveCosmosSubset"',
    'id="atomicThunderBoltSection"',
    'id="infinityBreakSection"',
    'id="auroraExecutionSection"',
    'id="executionAttacksSection"',
    'id="cosmoUniverseSection"',
    'id="athenaSection"',
  ];
  let last = -1;
  for (const token of order) {
    const at = html.indexOf(token);
    assert.ok(at > last, token);
    last = at;
  }
});


test('TC1 saint subset sits under Crystal Wall and posts attack confirmation keys', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="saintSubsetFold"'));
  assert.ok(html.includes('id="subsetSaintAttack"'));
  assert.ok(html.includes('id="subsetSaintApplyBtn"'));
  assert.ok(html.indexOf('id="twelveCosmosSubsetFold"') < html.indexOf('id="saintSubsetFold"'));
  assert.ok(html.indexOf('id="saintSubsetFold"') < html.indexOf('id="atomicThunderBoltSection"'));
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('athenaExclamationMinCrashCents'));
  assert.ok(app.includes('scarletNeedleMinReboundCents'));
  assert.ok(app.includes('justiceArrowMinUpwardTicks'));
  assert.ok(app.includes('waveMinCrashCents'));
  assert.ok(app.includes('momentumMinReboundCents'));
  assert.ok(app.includes('crashRecoveryMinUpwardTicks'));
  assert.ok(app.includes('lightningPlasmaMinCrashCents'));
});

test('TC1 saint subset patch writes only the chosen attack onto selected rooms', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = originalSettings();
  engine.settingsMutationTail = Promise.resolve();
  engine.invalidateStateSnapshot = () => {};
  engine.setCosmosWindow = () => {};
  const rows = {};
  engine.db = {
    async loadCosmosSettings(id, defaults) { return { ...defaults, ...(rows[id] || engine.settings) }; },
    async saveCosmosSettings(id, settings) { rows[id] = settings; },
    async audit() {},
  };
  const out = await engine.patchCosmosSubset(['LEO'], {
    athenaExclamationMinCrashCents: 21,
    athenaExclamationMinReboundCents: 8,
    athenaExclamationMinUpwardTicks: 4,
  });
  assert.equal(out.count, 1);
  assert.equal(rows.LEO.athenaExclamationMinCrashCents, 21);
  assert.equal(rows.LEO.athenaExclamationMinReboundCents, 8);
  assert.equal(rows.LEO.athenaExclamationMinUpwardTicks, 4);
  assert.equal(rows.ARIES, undefined);
});


test('TC1 overview counts a live SAGITTARIUS hunter immediately', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = originalSettings();
  engine.cosmosBooks = Object.fromEntries(['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map((id)=>[id,[]]));
  engine.cosmosWindowById = Object.fromEntries(['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map((id)=>[id,{minGameMinutes:1,maxGameMinutes:240}]));
  engine.constellation = { displayName(id){return id[0]+id.slice(1).toLowerCase();} };
  const hunter = { id:'ae-1', systemName:'SAGITTARIUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXKBOGAME-26SEP160530SSGLOT-LOT', pnlCents:0 };
  const rooms = engine.collectConstellationOverview([hunter]);
  const sag = rooms.find((row)=>row.id==='SAGITTARIUS');
  const aries = rooms.find((row)=>row.id==='ARIES');
  assert.equal(sag.open, 1);
  assert.equal(aries.open, 0);
});

test('TC1 open and closed tables name the cosmos', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.ok(html.includes('id="openHunterBody"'));
  assert.ok(html.includes('id="closedBody"'));
  const app = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('function cosmosName'));
  assert.ok(app.includes('cosmosName(e)'));
});


test('TC1 new Athena hunter is assigned to the least-loaded cosmos', () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.cosmosBooks = Object.fromEntries(['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map((id)=>[id,[]]));
  engine.cosmosBooks.SAGITTARIUS = [
    { id:'a', systemName:'SAGITTARIUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXKBOGAME-AAA' },
    { id:'b', systemName:'SAGITTARIUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXKBOGAME-BBB' },
  ];
  const picked = engine.pickCosmosForRealHunter('KXVALORANTGAME-HAV');
  assert.equal(picked, 'ARIES');
  const same = engine.pickCosmosForRealHunter('KXKBOGAME-AAA');
  assert.equal(same, 'SAGITTARIUS');
});

test('TC1 Mega Wave Athena continuation accepts a Crystal Wall parent from another cosmos room', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { ...originalSettings(), systemName:'SAGITTARIUS', ownerId:'sagittarius-main', mode:'SIMULATION', athenaExclamationEnabled:true };
  engine.megaWaveStats = null;
  engine.db = { async audit(){}, async opportunityEpisode(){ return null; }, async upsertOpportunityEpisode(){}, };
  engine.market = { getQuote(){ return null; } };
  const parent = {
    id:'cw-1', conceptName:'Crystal Wall', status:'closed', remainingCount:0,
    closeReason:'crystal_wall_shadow_profit', pnlCents:40,
    systemName:'ARIES', ownerId:'sagittarius-main', mode:'SIMULATION',
    ticker:'KXKBOGAME-X', eventTicker:'KXKBOGAME-X', entryPriceCents:50, exitPriceCents:60,
  };
  const out = await SagittariusEngine.prototype.handleMegaWaveAthenaContinuation.call(engine, parent);
  assert.notEqual(out.reason, 'parent_identity_or_mode_mismatch');
});


test('TC1 Rozan Hyaku Ryu Ha sits under Galactic Explosion and defaults off', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const geo = html.indexOf('galacticExplosionToggle');
  const rozan = html.indexOf('rozanHyakuRyuHaToggle');
  assert.ok(geo > 0 && rozan > geo);
  const cfg = await readFile(new URL('../src/config.mjs', import.meta.url), 'utf8');
  assert.ok(cfg.includes('rozanHyakuRyuHaEnabled'));
  const factory = originalSettings();
  assert.equal(factory.rozanHyakuRyuHaEnabled, false);
});

test('TC1 Rozan ON assigns a second cosmos to an occupied ticker', () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { rozanHyakuRyuHaEnabled: true };
  engine.cosmosBooks = Object.fromEntries(['ARIES','TAURUS','GEMINI','CANCER','LEO','VIRGO','LIBRA','SCORPIO','SAGITTARIUS','CAPRICORN','AQUARIUS','PISCES'].map((id)=>[id,[]]));
  engine.cosmosBooks.SAGITTARIUS = [
    { id:'a', systemName:'SAGITTARIUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXKBOGAME-LOT' },
  ];
  assert.equal(engine.pickCosmosForRealHunter('KXKBOGAME-LOT'), 'ARIES');
  engine.settings = { rozanHyakuRyuHaEnabled: false };
  assert.equal(engine.pickCosmosForRealHunter('KXKBOGAME-LOT'), 'SAGITTARIUS');
});

test('TC1 FleetTickerLock allows shared ticker owners only when unison is on', () => {
  const lock = new FleetTickerLock();
  assert.equal(lock.tryAcquire('T1','SAGITTARIUS').ok, true);
  assert.equal(lock.tryAcquire('T1','ARIES').ok, false);
  assert.equal(lock.tryAcquire('T1','ARIES',{unison:true}).ok, true);
});


test('TC1 compact dashboard keeps systemName so closed trades name the cosmos', () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.decorateEntry = (e)=>e;
  const row = engine.compactDashboardEntry({
    id:'h1', systemName:'SAGITTARIUS', ticker:'KXKBO-LOT', conceptName:'Athena Exclamation',
    executionAttackName:'Athena Exclamation', status:'closed', pnlCents:5,
  });
  assert.equal(row.systemName, 'SAGITTARIUS');
});


test('TC1 Athena FIRE stamps the bound cosmos instead of the frozen host name', async () => {
  const athena = await readFile(new URL('../src/athena.mjs', import.meta.url), 'utf8');
  assert.ok(athena.includes('systemName:String(settings.systemName||this.systemName)'));
  assert.equal(athena.includes('systemName:this.systemName,sourceRelease:this.sourceRelease,decidedAtMs:now'), false);
});


test('TC1 homepage performance and open/closed tables read all twelve cosmos books', async () => {
  const engine=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  const db=await readFile(new URL('../src/db.mjs',import.meta.url),'utf8');
  assert.ok(engine.includes('performanceAggregateFleet'));
  assert.ok(engine.includes('dashboardOpenEntriesFleet'));
  assert.ok(engine.includes('openEntriesFleet'));
  assert.ok(db.includes('async openEntriesFleet'));
  assert.ok(db.includes('system_name = any($3::text[])'));
  assert.ok(engine.includes('ownerId:this.settings.ownerId'));
});

test('TC1 Excalibur sits under Rozan, defaults off, and is exclusive with Rozan', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  const rozan = html.indexOf('rozanHyakuRyuHaToggle');
  const blade = html.indexOf('excaliburToggle');
  assert.ok(rozan > 0 && blade > rozan);
  const factory = originalSettings();
  assert.equal(factory.excaliburEnabled, false);
  const both = sanitizeRuntimeSettings({ ...factory, rozanHyakuRyuHaEnabled: true, excaliburEnabled: true });
  assert.equal(both.excaliburEnabled, true);
  assert.equal(both.rozanHyakuRyuHaEnabled, false);
  const rozanOnly = sanitizeRuntimeSettings({ ...factory, rozanHyakuRyuHaEnabled: true, excaliburEnabled: false });
  assert.equal(rozanOnly.rozanHyakuRyuHaEnabled, true);
  assert.equal(rozanOnly.excaliburEnabled, false);
});

test('TC1 Excalibur pickCosmos treats occupied ticker as free for another room', () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { excaliburEnabled: true };
  engine.cosmosBooks = Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.cosmosBooks.SAGITTARIUS = [
    { id:'a', systemName:'SAGITTARIUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXKBOGAME-LOT' },
  ];
  assert.equal(engine.pickCosmosForRealHunter('KXKBOGAME-LOT'), 'ARIES');
});

test('TC1 Excalibur grant does not copy Athena until each room prints its own Crystal Wall', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { excaliburEnabled: true, rozanHyakuRyuHaEnabled: false, athenaExclamationStakeCents: 100, systemName: 'ARIES' };
  engine.cosmosBooks = Object.fromEntries(COSMOS_IDS.map((id)=>[id,[]]));
  engine.cosmosBooks.TAURUS = [
    { id:'hold', systemName:'TAURUS', conceptName:'Athena Exclamation', status:'open', ticker:'KXITFMATCH-TOP' },
  ];
  engine.db = {
    loadCosmosSettings: async (id, host) => ({
      ...host,
      systemName: id,
      athenaExclamationStakeCents: id==='GEMINI' ? 500 : 100,
      crystalWallMinCrashCents: id==='GEMINI' ? 20 : 15,
      crystalWallMinReboundCents: 5,
      crystalWallMinUpwardTicks: 2,
    }),
    audit: async () => {},
  };
  engine.strategy = {
    createHunter: async (concept, q, stake) => ({
      id: `${engine.settings.systemName}-${stake}`,
      systemName: engine.settings.systemName,
      conceptName: concept,
      ticker: q.ticker,
      status: 'open',
      stakeCents: stake,
    }),
  };
  const source = {
    id: 'src-ae',
    systemName: 'ARIES',
    conceptName: 'Athena Exclamation',
    ticker: 'KXITFMATCH-TOP',
    entryConfig: { athenaFire: { version: 'ATHENA-A3', selectedAttack: 'Athena Exclamation', ticker: 'KXITFMATCH-TOP', stakeCents: 100, commandHash: 'x' } },
  };
  const grantQuote = { ticker: 'KXITFMATCH-TOP', eventTicker: 'KXITFMATCH-TOP', yesBid: 58, yesAsk: 60, status: 'active' };
  const immediate = await SagittariusEngine.prototype.fanOutExcalibur.call(engine, source, grantQuote);
  assert.equal(immediate.length, 0);
  assert.equal(engine.excaliburGrants.get('KXITFMATCH-TOP').sourceCosmos, 'ARIES');

  const shallow = {
    ticker: 'KXITFMATCH-TOP', eventTicker: 'KXITFMATCH-TOP', yesBid: 50, yesAsk: 52, status: 'active',
  };
  const crash16 = { episodeId: 'ep-16', preCrashPeakCents: 66, troughCents: 50, crashDepthCents: 16, phase: 'REBOUND_CONFIRMED' };
  const first = await SagittariusEngine.prototype.observeExcaliburQuote.call(engine, shallow, crash16);
  assert.equal(first.some((row)=>row.systemName==='ARIES'), false);
  assert.equal(first.some((row)=>row.systemName==='TAURUS'), false);
  assert.equal(first.some((row)=>row.systemName==='GEMINI'), false);

  // rebound + two upticks from the 50 trough to satisfy 15/5/2 but not 20
  let opened = [];
  let bid = 50;
  for (const next of [56, 57]) {
    bid = next;
    opened = await SagittariusEngine.prototype.observeExcaliburQuote.call(engine, {
      ticker: 'KXITFMATCH-TOP', eventTicker: 'KXITFMATCH-TOP', yesBid: bid, yesAsk: bid+2, status: 'active',
    }, crash16);
  }
  assert.equal(opened.some((row)=>row.systemName==='GEMINI'), false);
  assert.ok(opened.length >= 1);
  const geminiStillOut = !opened.some((row)=>row.systemName==='GEMINI');
  assert.equal(geminiStillOut, true);

  const crash21 = { episodeId: 'ep-21', preCrashPeakCents: 71, troughCents: 50, crashDepthCents: 21, phase: 'REBOUND_CONFIRMED' };
  opened = await SagittariusEngine.prototype.observeExcaliburQuote.call(engine, {
    ticker: 'KXITFMATCH-TOP', eventTicker: 'KXITFMATCH-TOP', yesBid: 57, yesAsk: 59, status: 'active',
  }, crash21);
  const gemini = opened.find((row)=>row.systemName==='GEMINI');
  assert.equal(gemini?.stakeCents, 500);
});

test('TC1 Excalibur does not fan out Crystal Wall or fire when Rozan is on', async () => {
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { excaliburEnabled: true, rozanHyakuRyuHaEnabled: true };
  engine._excaliburFanout = false;
  const none = await SagittariusEngine.prototype.fanOutExcalibur.call(engine, {
    id:'cw', systemName:'ARIES', conceptName:'Recovery Hunter', ticker:'T',
  }, { ticker:'T' });
  assert.deepEqual(none, []);
  engine.settings = { excaliburEnabled: true, rozanHyakuRyuHaEnabled: false };
  const still = await SagittariusEngine.prototype.fanOutExcalibur.call(engine, {
    id:'cw', systemName:'ARIES', conceptName:'Recovery Hunter', ticker:'T',
  }, { ticker:'T' });
  assert.deepEqual(still, []);
});

test('TC1 host Start/Stop does not overwrite a room Crystal Wall', async () => {
  const master = originalSettings();
  const ledger = new SettingsTenancyLedger();
  ledger.writeMaster(master);
  ledger.writeOne('ARIES', { ...master, crystalWallMinCrashCents: 20, crystalWallMinReboundCents: 8, crystalWallMinUpwardTicks: 7 });
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { ...master, systemName: 'SAGITTARIUS', ownerId: 'mw-test', mode: 'SIMULATION', engineActive: false };
  engine.invalidateStateSnapshot = () => {};
  engine.db = {
    async saveSettings(settings) { ledger.writeHost(settings); },
    async loadSettings(defaults) { return { ...defaults, ...ledger.read('runtime') }; },
    async loadCosmosSettings(id, defaults) { return { ...defaults, ...ledger.readCosmos(id) }; },
    async saveCosmosSettings(id, settings) { ledger.writeOne(id, settings); },
  };
  await engine.setEngine(true);
  assert.equal(engine.settings.engineActive, true);
  assert.equal(ledger.readCosmos('ARIES').crystalWallMinCrashCents, 20);
  assert.equal(ledger.readCosmos('ARIES').crystalWallMinReboundCents, 8);
  assert.equal(ledger.readCosmos('TAURUS').crystalWallMinCrashCents, master.crystalWallMinCrashCents);
});

test('TC1 homepage Save still broadcasts Crystal Wall; incidental host save does not', async () => {
  const db = await readFile(new URL('../src/db.mjs', import.meta.url), 'utf8');
  assert.ok(db.includes('async broadcastSettingsToAllCosmos'));
  assert.ok(db.includes('return this.saveHostSettings(settings)'));
  const save = db.split('async saveSettings(settings)')[1].split('async loadCosmosSettings')[0];
  assert.equal(save.includes('for (const id of COSMOS_IDS)'), false);
  const engine = await readFile(new URL('../src/engine.mjs', import.meta.url), 'utf8');
  assert.ok(engine.includes('broadcastSettingsToAllCosmos(next)'));
});
