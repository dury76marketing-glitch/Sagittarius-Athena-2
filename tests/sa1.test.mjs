import test from 'node:test';
import assert from 'node:assert/strict';

async function fixture(){
  const { originalSettings } = await import('../src/config.mjs');
  const { SagittariusEngine } = await import('../src/engine.mjs');
  const { StrategyEngine } = await import('../src/strategy.mjs');
  const settings = { ...originalSettings(), mode:'SIMULATION', ownerId:'o1', systemName:'s1',
    crashRecoveryHunterEnabled:true, crashRecoveryHunterLinkEnabled:true,
    momentumHunterEnabled:true, momentumHunterLinkEnabled:true,
    lightningPlasmaEnabled:true, lightningPlasmaLinkEnabled:true,
    scarletNeedleEnabled:true, justiceArrowEnabled:true, waveSurferEnabled:true,
    athenaExclamationEnabled:true, recoveryHunterEnabled:true,
    crashRecoveryMinEntryCents:20, crashRecoveryMaxEntryCents:80,
    momentumMinEntryCents:20, momentumMaxEntryCents:80,
    lightningPlasmaMinEntryCents:20, lightningPlasmaMaxEntryCents:80,
    engineActive:true, resetTimestampMs:0 };
  const mem = { rows:new Map(), children:new Map(), inserted:[],
    key(w){return [w.systemName,w.ownerId,w.mode,w.resetEpoch,w.authorizationId].join('|');},
    async insertStarlightWatch(w){ const k=this.key(w); if(this.rows.has(k))return null; this.rows.set(k,{revision:1,status:w.status,watch:structuredClone(w)}); return structuredClone(this.rows.get(k)); },
    async updateStarlightWatch(w,rev){ const k=this.key(w), r=this.rows.get(k); if(!r||r.revision!==rev)return null; const n={revision:r.revision+1,status:w.status,watch:structuredClone(w)}; this.rows.set(k,n); return structuredClone(n); },
    async entryByConceptSourceTradeId(_s,concept,parent){ return structuredClone([...this.children.values()].find(e=>e.sourceTradeId===parent&&e.conceptName===concept)||null); },
    async insertEntry(e){ this.inserted.push(structuredClone(e)); this.children.set(e.id,structuredClone(e)); },
    async audit(){} };
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = settings;
  engine.db = mem;
  engine.market = { getQuote:()=>({ ticker:'T', yesBid:40, yesAsk:40, status:'active' }) };
  engine.entryExecutionGate = ()=>({allowed:true});
  engine.strategy = new StrategyEngine({ db:mem, market:engine.market, kalshi:{}, learning:{}, getSettings:()=>settings, getLiveReady:()=>false, random:()=>0 });
  engine.starlightRecoveryRuntime();
  return { engine, mem, settings };
}

function parent(concept='Crash Recovery Hunter'){
  return { id:'p1', ticker:'T', eventTicker:'E', conceptName:concept, status:'closed', closeReason:'hard_stop_loss',
    mode:'SIMULATION', systemName:'s1', ownerId:'o1', archived:false, exitPriceCents:40, closedAtMs:Date.now(), sport:'Unknown' };
}

test('SA1 removed attacks cannot buy', async () => {
  const f = await fixture();
  for (const concept of ['Athena Exclamation','Recovery Hunter']) {
    const opened = await f.engine.strategy.createHunter(concept, { ticker:'T', yesAsk:40, yesBid:40, status:'active' }, 100, 0, {});
    assert.equal(opened, null);
  }
  assert.equal(f.mem.inserted.length, 0);
});

test('SA1 shadow scouts cannot buy', async () => {
  const f = await fixture();
  for (const concept of ['Scarlet Needle','Sagittarius Justice Arrow','Wave Surfer']) {
    const opened = await f.engine.strategy.createHunter(concept, { ticker:'T', yesAsk:40, yesBid:40, status:'active' }, 100, 0, {});
    assert.equal(opened, null);
  }
  assert.equal(f.mem.inserted.length, 0);
});

test('SA1 Great Horn and Plasma cannot buy on a green path', async () => {
  const f = await fixture();
  for (const concept of ['Momentum Hunter','Lightning Plasma','Crash Recovery Hunter']) {
    const opened = await f.engine.strategy.createHunter(concept, { ticker:'T', yesAsk:40, yesBid:40, status:'active' }, 100, 0, {});
    assert.equal(opened, null);
  }
});

test('SA1 a Starlight stop arms Horn and Plasma, not another Starlight', async () => {
  const f = await fixture();
  assert.equal(await f.engine.armStarlightRecovery(parent('Crash Recovery Hunter')), true);
  const ids = [...f.engine.starlightRecoveryWatches.keys()];
  assert.ok(ids.some(id=>id.startsWith('RECOVERY:Momentum Hunter:')));
  assert.ok(ids.some(id=>id.startsWith('RECOVERY:Lightning Plasma:')));
  assert.equal(ids.some(id=>id.startsWith('RECOVERY:Crash Recovery Hunter:')), false);
});

test('SA1 Horn Link opens once inside the band and a second callback does not buy again', async () => {
  const f = await fixture();
  f.engine.settings.momentumHunterLinkEnabled = false;
  assert.equal(await f.engine.armStarlightRecovery(parent('Crash Recovery Hunter')), true);
  f.engine.settings.momentumHunterLinkEnabled = true;
  const id = 'RECOVERY:Momentum Hunter:p1';
  await f.engine.starlightRecoveryArmWrites.get(id);
  f.engine.strategy.createHunter = async (concept, q, stake, stop, opts) => {
    assert.equal(concept, 'Momentum Hunter');
    assert.equal(opts.starlightRecovery, true);
    const entry = { id:'child-horn', conceptName:concept, sourceTradeId:opts.sourceTradeId, ownerId:'o1', mode:'SIMULATION', systemName:'s1', entryPriceCents:Number(q.yesAsk), status:'open' };
    f.mem.inserted.push(entry);
    f.mem.children.set(entry.id, entry);
    return entry;
  };
  const first = await f.engine.attemptStarlightLinkEntry(id);
  if(first.status!=='OPENED')throw new Error(JSON.stringify(first));
  assert.equal(first.entry.conceptName, 'Momentum Hunter');
  const again = await f.engine.attemptStarlightLinkEntry(id);
  assert.notEqual(again.status, 'OPENED');
  assert.equal(f.mem.inserted.filter(e=>e.conceptName==='Momentum Hunter').length, 1);
});

test('SA1 a stop outside the band waits and enters when price moves in', async () => {
  const f = await fixture();
  f.engine.settings.momentumHunterLinkEnabled = false;
  f.engine.settings.lightningPlasmaLinkEnabled = false;
  f.engine.settings.crashRecoveryHunterLinkEnabled = false;
  f.engine.settings.momentumMinEntryCents = 50;
  f.engine.settings.momentumMaxEntryCents = 70;
  const p = parent('Crash Recovery Hunter');
  p.exitPriceCents = 20;
  assert.equal(await f.engine.armStarlightRecovery(p), true);
  f.engine.settings.momentumHunterLinkEnabled = true;
  const id = 'RECOVERY:Momentum Hunter:p1';
  await f.engine.starlightRecoveryArmWrites.get(id);
  f.engine.strategy.createHunter = async () => { throw new Error('must not buy outside band'); };
  const waiting = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(waiting.status, 'WATCHING');
  assert.equal(waiting.reason, 'link_price_outside_band');
  f.engine.market.getQuote = ()=>({ ticker:'T', yesBid:55, yesAsk:55, status:'active' });
  f.engine.strategy.createHunter = async (concept, q) => {
    const entry = { id:'child-later', conceptName:concept, sourceTradeId:'p1', ownerId:'o1', mode:'SIMULATION', systemName:'s1', entryPriceCents:Number(q.yesAsk), status:'open' };
    f.mem.inserted.push(entry); f.mem.children.set(entry.id, entry); return entry;
  };
  f.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const later = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(later.status, 'OPENED');
  assert.equal(later.entry.entryPriceCents, 55);
});

test('SA1 a production legacy flag cannot buy Horn, Plasma, or Starlight', async () => {
  const f = await fixture();
  const q = { ticker:'T', yesAsk:40, yesBid:40, status:'active' };
  for (const concept of ['Momentum Hunter','Lightning Plasma','Crash Recovery Hunter']) {
    const opened = await f.engine.strategy.createHunter(concept, q, 100, 0, { legacyCompatibility:true });
    assert.equal(opened, null, concept);
  }
  assert.equal(f.mem.inserted.length, 0);
});

test('SA1 a Horn child blocks a second Horn arm on the same parent', async () => {
  const f = await fixture();
  f.mem.children.set('child', { id:'child', conceptName:'Momentum Hunter', sourceTradeId:'p1', ownerId:'o1', mode:'SIMULATION', systemName:'s1' });
  assert.equal(await f.engine.armStarlightRecovery(parent('Crash Recovery Hunter')), true);
  const ids = [...f.engine.starlightRecoveryWatches.keys()];
  assert.equal(ids.some(id=>id.startsWith('RECOVERY:Momentum Hunter:')), false);
  assert.ok(ids.some(id=>id.startsWith('RECOVERY:Lightning Plasma:')));
});

test('SA1 a SIM stop does not arm a LIVE watch', async () => {
  const f = await fixture();
  const live = parent('Crash Recovery Hunter');
  live.mode = 'LIVE';
  assert.equal(await f.engine.armStarlightRecovery(live), false);
  assert.equal(f.engine.starlightRecoveryWatches.size, 0);
});

test('SA1 a lost claim write leaves the watch retryable and does not buy twice', async () => {
  const f = await fixture();
  f.engine.settings.momentumHunterLinkEnabled = false;
  f.engine.settings.lightningPlasmaLinkEnabled = false;
  f.engine.settings.crashRecoveryHunterLinkEnabled = false;
  assert.equal(await f.engine.armStarlightRecovery(parent('Crash Recovery Hunter')), true);
  const id = 'RECOVERY:Momentum Hunter:p1';
  await f.engine.starlightRecoveryArmWrites.get(id);
  f.engine.settings.momentumHunterLinkEnabled = true;
  let buys = 0;
  f.engine.strategy.createHunter = async () => {
    buys += 1;
    return { id:'c1', conceptName:'Momentum Hunter', sourceTradeId:'p1', ownerId:'o1', mode:'SIMULATION', systemName:'s1', entryPriceCents:40, status:'open' };
  };
  f.mem.updateStarlightWatch = async () => null;
  const first = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(first.status, 'WATCHING');
  assert.equal(buys, 0);
  f.mem.updateStarlightWatch = async (w, rev) => {
    const k = f.mem.key(w);
    const r = f.mem.rows.get(k);
    if (!r || r.revision !== rev) return null;
    const n = { revision:r.revision+1, status:w.status, watch:structuredClone(w) };
    f.mem.rows.set(k, n);
    return structuredClone(n);
  };
  const second = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(second.status, 'OPENED');
  assert.equal(buys, 1);
});
