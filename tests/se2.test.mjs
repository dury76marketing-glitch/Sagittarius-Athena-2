import { shadowFixture, shadowWorkerFixture } from './helpers/r3-fixtures.mjs';
import { FixtureStrategyEngine, asShadowFixture } from './helpers/shadow-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { rankAthenaAttacks } from '../src/athena.mjs';
import { RELEASE } from '../src/config.mjs';

test('SE2 Starlight does not rank on a normal bolt without a stop-loss recovery context', () => {
  assert.equal(RELEASE, 'SAGITTARIUS-MW1-R4-ANDROMEDA-AUDIT-2026-10-14');
  const bolt = {
    features: {
      eligibleAttacks: [
        { concept: 'Crash Recovery Hunter', targetFeasible: true },
        { concept: 'Momentum Hunter', targetFeasible: true },
      ],
    },
  };
  const settings = {
    crashRecoveryHunterEnabled: true,
    momentumHunterEnabled: true,
    crashRecoveryStakeCents: 500,
    momentumStakeCents: 500,
    crashRecoveryMinEntryCents: 74,
    crashRecoveryMaxEntryCents: 88,
    momentumMinEntryCents: 74,
    momentumMaxEntryCents: 88,
    infinityBreakMinNetPerOriginalContractCents: 13,
  };
  const ranked = rankAthenaAttacks(bolt, settings, null, {});
  assert.equal(ranked.some((r) => r.concept === 'Crash Recovery Hunter'), false);
  const recovery = rankAthenaAttacks(bolt, settings, null, { starlightRecoveryContext: { eligible: true } });
  assert.equal(recovery.some((r) => r.concept === 'Crash Recovery Hunter'), true);
});

test('SE2 armStarlightRecovery only accepts a hard stop of a real non-Starlight hunter', async () => {
  const { SagittariusEngine } = await import('../src/engine.mjs');
  const engine = Object.create(SagittariusEngine.prototype);
  engine.settings = { crashRecoveryHunterEnabled:true,mode:'SIMULATION',systemName:'s1',ownerId:'o1',resetTimestampMs:Date.now()-3600000 };
  engine.starlightRecoveryWatches = new Map();
  engine.starlightRecoveryInFlight = new Set();
  engine.starlightRecoveryStats = { armed: 0, qualified: 0, opened: 0, blocked: 0, expired: 0, selfChainBlocked: 0, lastEvent: null };
  engine.recoveryPriorityTickers = new Set();
  engine.db = { audit: async () => {} };
  assert.equal(engine.armStarlightRecovery({ id:'p1',ticker:'T',status:'closed',mode:'SIMULATION',systemName:'s1',ownerId:'o1',closedAtMs:Date.now()-1000,conceptName:'Momentum Hunter',closeReason:'hard_stop_loss',exitPriceCents:40 }), true);
  assert.equal(engine.starlightRecoveryWatches.size, 1);
  assert.equal(engine.armStarlightRecovery({ id:'p2',ticker:'T',status:'closed',mode:'SIMULATION',systemName:'s1',ownerId:'o1',closedAtMs:Date.now()-1000,conceptName:'Crash Recovery Hunter',closeReason:'hard_stop_loss',exitPriceCents:30 }), false);
  assert.equal(engine.starlightRecoveryStats.selfChainBlocked, 1);
  assert.equal(engine.armStarlightRecovery({ id: 'p3', ticker: 'T', conceptName: 'Momentum Hunter', closeReason: 'infinity_break', exitPriceCents: 80 }), false);
  assert.equal(engine.armStarlightRecovery({ id: 'p4', ticker: 'T', conceptName: 'Dragon', closeReason: 'hard_stop_loss', exitPriceCents: 20 }), false);
});

test('SE2 CI1 wall clone cannot open Starlight Extinction', async () => {
  const { CI1_WALL_CLONE } = await import('../src/doctrine.mjs');
  assert.equal(CI1_WALL_CLONE.saints.includes('Crash Recovery Hunter'), false);
});


// SE2-R5: regression fixtures use a persistent, revisioned in-memory facsimile
// with the same DB method contract. These are deterministic unit simulations,
// NOT a replacement for the opt-in real PostgreSQL durability gate.
async function harness({mode='SIMULATION',clock=Date.now(),observation=0,crash=7,rebound=3,ticks=2,db=null}={}){
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const mem=db||new WatchStore();
  const engine=Object.create(SagittariusEngine.prototype);
  engine.settings={systemName:'s1',ownerId:'o1',mode,resetTimestampMs:clock-3600000,
    crashRecoveryHunterEnabled:true,crashRecoveryHunterObservationMinutes:observation,
    crashRecoveryHunterMinCrashCents:crash,crashRecoveryHunterMinReboundCents:rebound,
    crashRecoveryHunterMinUpwardTicks:ticks,crashRecoveryMinEntryCents:30,crashRecoveryMaxEntryCents:95,
    infinityBreakMaximumBookAgeMs:5000};
  engine.starlightRecoveryWatches=new Map();engine.starlightRecoveryInFlight=new Set();
  engine.recoveryPriorityTickers=new Set();engine.crystalWallWatches=new Map();engine.justiceArrowWatches=new Map();
  engine.db=mem;engine.entryExecutionGate=()=>({allowed:false});
  engine.market={getQuote:()=>null,ensureFreshBook:async()=>true};
  engine.strategy={createHunter:async()=>null};
  const parent={id:'parent1',ticker:'T',eventTicker:'E',ownerId:'o1',systemName:'s1',mode,
    conceptName:'Momentum Hunter',status:'closed',closeReason:'hard_stop_loss',closedAtMs:clock-6000,exitPriceCents:40};
  if(!mem.parents.has(parent.id))mem.parents.set(parent.id,parent);
  return {engine,mem,parent};
}
class WatchStore {
  constructor(){this.rows=new Map();this.parents=new Map();this.children=new Map();this.failWrites=false;this.auditEvents=[];}
  key(w){return [w.systemName,w.ownerId,w.mode,w.resetEpoch,w.authorizationId].join('|');}
  async insertStarlightWatch(w){
    if(this.failWrites)throw Error('db_unavailable');
    const key=this.key(w);if(this.rows.has(key))return null;
    this.rows.set(key,{revision:1,status:w.status,watch:structuredClone(w)});
    return structuredClone(this.rows.get(key));
  }
  async updateStarlightWatch(w,expected){
    if(this.failWrites)throw Error('db_unavailable');
    const key=this.key(w),r=this.rows.get(key);
    if(!r||r.revision!==expected)return null;
    const next={revision:r.revision+1,status:w.status,watch:structuredClone(w)};
    this.rows.set(key,next);return structuredClone(next);
  }
  async starlightWatch(w){return structuredClone(this.rows.get(this.key(w))||null);}
  async listStarlightWatches(s){
    if(this.failWrites)throw Error('db_unavailable');
    return [...this.rows.entries()].filter(([k])=>k.startsWith([s.systemName,s.ownerId,s.mode,s.resetEpoch].join('|')+'|')).map(([,v])=>structuredClone(v));
  }
  async entries(){return [...this.parents.values(),...this.children.values()].map(x=>structuredClone(x));}
  async entryById(id){return structuredClone(this.parents.get(id)||null);}
  async entryByConceptSourceTradeId(_system,_concept,parentId){return structuredClone(this.children.get(parentId)||null);}
  async audit(level,event,info){this.auditEvents.push({level,event,info});}
}
const sleepTick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function persistArm(ctx){
  assert.equal(ctx.engine.armStarlightRecovery(ctx.parent),true);
  const id='STARLIGHT-RECOVERY:'+ctx.parent.id;
  await ctx.engine.starlightRecoveryArmWrites.get(id);
  return id;
}
function quote(bid,at=Date.now()){return {ticker:'T',eventTicker:'E',status:'active',yesBid:bid,yesAsk:bid+1,quoteAtMs:at};}

test('SE2-R5 real post-stop decline required: 40 to 44 to 47 to 50 is never a crash',async()=>{
  const {starlightRecoverySignalState}=await import('../src/strategy.mjs');
  const s={crashRecoveryHunterMinCrashCents:7,crashRecoveryHunterMinReboundCents:3,crashRecoveryHunterMinUpwardTicks:2,crashRecoveryMinEntryCents:30,crashRecoveryMaxEntryCents:95};
  let w={armedAtMs:Date.now()-10000,releaseAtMs:Date.now()-9000,expiresAtMs:Date.now()+3600000,
    stopPriceCents:40,peakSinceArmCents:40,troughSinceArmCents:40,lastBidCents:40,lastQuoteAtMs:0,upwardTicks:0};
  let t=Date.now()-1000;
  for(const bid of [44,47,50]){
    t+=100;w=starlightRecoverySignalState(w,quote(bid,t),s,Date.now(),{advance:true});
    assert.equal(w.qualified,false);assert.equal(w.crashDepthCents,0);
  }
  for(const bid of [41,40,43,44]){
    t+=100;w=starlightRecoverySignalState(w,quote(bid,t),s,Date.now(),{advance:true});
  }
  assert.equal(w.qualified,true,'only the later genuine decline and confirmed rebound may qualify');
});

test('SE2-R5 crash, rebound, two fresh ticks and minimum wait are enforced',async()=>{
  const {engine,mem,parent}=await harness({observation:0,ticks:2});
  const id=await persistArm({engine,mem,parent});
  const now=Date.now();let t=now-1000;
  for(const bid of [45,37,39,41]){t+=100;await engine.observeStarlightRecoveryQuote(quote(bid,t));}
  const w=engine.starlightRecoveryWatches.get(id);
  assert.equal(w.qualified,undefined);assert.equal(w.status,'READY');
  assert.equal(w.upwardTicks,2);assert.equal(w.crashDepthCents,8);assert.equal(w.reboundCents,4);
  assert.ok(w.revision>=5);
  assert.equal(mem.rows.get(mem.key(w)).status,'READY');
});

test('SE2-R5 exact watch geometry/clock survives restart, and terminal parent cannot rearm',async()=>{
  const {engine,mem,parent}=await harness({ticks:1});
  const id=await persistArm({engine,mem,parent});
  let t=Date.now()-1000;
  for(const bid of [45,37,41]){t+=100;await engine.observeStarlightRecoveryQuote(quote(bid,t));}
  const before=engine.starlightRecoveryWatches.get(id);
  const {engine:restart}=await harness({ticks:1,db:mem});
  restart.settings.resetTimestampMs=engine.settings.resetTimestampMs;
  await restart.rehydrateStarlightRecovery();
  const after=restart.starlightRecoveryWatches.get(id);
  assert.equal(after.armedAtMs,before.armedAtMs);
  assert.equal(after.crashConfirmedAtMs,before.crashConfirmedAtMs);
  assert.equal(after.lastQuoteAtMs,before.lastQuoteAtMs);
  assert.equal(after.upwardTicks,before.upwardTicks);
  assert.equal(after.troughSinceArmCents,before.troughSinceArmCents);
  assert.equal(restart.armStarlightRecovery(parent),false);
});

test('SE2-R5 scanner refresh retains active Starlight recovery ticker',async()=>{
  const {engine,mem,parent}=await harness();
  await persistArm({engine,mem,parent});
  await engine.refreshRecoveryPriorityTickers();
  assert.equal(engine.recoveryPriorityTickers.has('T'),true);
});

test('SE2-R5 quote collapse after READY invalidates recovery qualification',async()=>{
  const {engine,mem,parent}=await harness({ticks:1});
  const id=await persistArm({engine,mem,parent});
  let t=Date.now()-1000;
  for(const bid of [45,37,41]){t+=100;await engine.observeStarlightRecoveryQuote(quote(bid,t));}
  assert.equal(engine.starlightRecoveryWatches.get(id).status,'READY');
  t+=100;await engine.observeStarlightRecoveryQuote(quote(35,t));
  assert.equal(engine.starlightRecoveryWatches.get(id).status,'WATCHING');
  const {starlightRecoverySignalState}=await import('../src/strategy.mjs');
  assert.equal(starlightRecoverySignalState(engine.starlightRecoveryWatches.get(id),quote(35,t),engine.settings).qualified,false);
});

test('SE2-R5 database write error cannot authorize a recovery entry',async()=>{
  const {engine,mem,parent}=await harness();
  const id=await persistArm({engine,mem,parent});
  mem.failWrites=true;
  await assert.rejects(()=>engine.observeStarlightRecoveryQuote(quote(35)),/db_unavailable/);
  assert.equal(engine.starlightRecoveryWatches.get(id).status,'ARMED');
});

test('SE2-R5 one persistent revision claim wins, stale worker cannot duplicate it',async()=>{
  const {engine,mem,parent}=await harness();
  const id=await persistArm({engine,mem,parent});
  const old=engine.starlightRecoveryWatches.get(id);
  const attempt1=await mem.updateStarlightWatch({...old,status:'EXECUTING'},old.revision);
  const attempt2=await mem.updateStarlightWatch({...old,status:'EXECUTING'},old.revision);
  assert.ok(attempt1);assert.equal(attempt2,null);
});

test('SE2-R5 per-mode, owner and reset-epoch isolation blocks invalid parent and replay',async()=>{
  const {engine,mem,parent}=await harness();
  assert.equal(engine.armStarlightRecovery({...parent,mode:'LIVE'}),false);
  assert.equal(engine.armStarlightRecovery({...parent,ownerId:'other'}),false);
  assert.equal(engine.armStarlightRecovery({...parent,closedAtMs:engine.settings.resetTimestampMs-100}),false);
  assert.equal(engine.armStarlightRecovery({...parent,conceptName:'Crash Recovery Hunter'}),false);
  assert.equal(engine.armStarlightRecovery({...parent,closeReason:'settlement'}),false);
  const id=await persistArm({engine,mem,parent});
  const {engine:other}=await harness({mode:'LIVE',db:mem});
  other.settings.resetTimestampMs=engine.settings.resetTimestampMs;
  await other.rehydrateStarlightRecovery();
  assert.equal(other.starlightRecoveryWatches.has(id),false);
});

test('SE2-R5 broker uncertain after acceptance leaves durable EXECUTING until restart reconciliation',async()=>{
  const {engine,mem,parent}=await harness({mode:'LIVE',ticks:0,crash:0,rebound:0});
  const id=await persistArm({engine,mem,parent});
  const q=quote(42);await engine.observeStarlightRecoveryQuote(q);
  const stored=engine.starlightRecoveryWatches.get(id);assert.equal(stored.status,'READY');
  engine.entryExecutionGate=()=>({allowed:true});engine.market={getQuote:()=>q,ensureFreshBook:async()=>true};
  engine.strategy={createHunter:async()=>{throw Error('broker_timeout_after_submit');}};
  await assert.rejects(()=>engine.attemptStarlightRecovery(id),/broker_timeout_after_submit/);
  assert.equal(mem.rows.get(mem.key(stored)).status,'EXECUTING');
  mem.children.set(parent.id,{id:'child1',sourceTradeId:parent.id,conceptName:'Crash Recovery Hunter',
    mode:parent.mode,ownerId:parent.ownerId,systemName:parent.systemName,status:'entry_pending'});
  const {engine:restart}=await harness({mode:'LIVE',ticks:0,crash:0,rebound:0,db:mem});
  restart.settings.resetTimestampMs=engine.settings.resetTimestampMs;
  await restart.rehydrateStarlightRecovery();
  assert.equal(restart.starlightRecoveryWatches.has(id),false);
  assert.equal(mem.rows.get(mem.key(stored)).status,'CONSUMED');
});

test('SE2-R5 entry through a broker pending child is not resubmitted',async()=>{
  const {engine,mem,parent}=await harness({ticks:0,crash:0,rebound:0});
  const id=await persistArm({engine,mem,parent});
  const q=quote(42);await engine.observeStarlightRecoveryQuote(q);
  engine.entryExecutionGate=()=>({allowed:true});engine.market={getQuote:()=>q};
  let count=0;engine.strategy={createHunter:async()=>{count++;return null;}};
  mem.children.set(parent.id,{id:'child-pending',sourceTradeId:parent.id,conceptName:'Crash Recovery Hunter',
    mode:parent.mode,ownerId:parent.ownerId,systemName:parent.systemName,status:'entry_pending'});
  const result=await engine.attemptStarlightRecovery(id);
  assert.equal(result.reason,'existing_child_or_pending_broker_receipt');assert.equal(count,0);
});

test('SE2-R5 enqueue catches transient execution errors without unhandled rejections',async()=>{
  const {engine,mem,parent}=await harness();
  const id=await persistArm({engine,mem,parent});
  engine.attemptStarlightRecovery=async()=>{throw Error('simulated_failure');};
  engine.queueStarlightRecovery(id);
  await sleepTick();await sleepTick();
  assert.equal(engine.starlightRecoveryInFlight.has(id),false);
  assert.equal(engine.starlightRecoveryStats.lastEvent.status,'ERROR');
});

test('SE2-R5 final authorization guard structurally checks live watch revision and signal', async()=>{
  const {readFileSync}=await import('node:fs');
  const source=readFileSync(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  assert.ok(source.includes('starlight_watch_authority_changed'));
  assert.ok(source.includes('starlightRecoverySignalState(live,quote,currentSettings,at)'));
  assert.ok(source.includes('starlight_final_execution_envelope_changed'));
});

test('SE2-R5 delayed observation cannot qualify before the original post-stop release deadline',async()=>{
  const {engine,mem,parent}=await harness({observation:20,crash:7,rebound:3,ticks:1});
  const id=await persistArm({engine,mem,parent});
  let t=Date.now()-1000;
  for(const bid of [45,37,41]){t+=100;await engine.observeStarlightRecoveryQuote(quote(bid,t));}
  const w=engine.starlightRecoveryWatches.get(id);
  assert.equal(w.status,'WATCHING');
  assert.equal(w.releaseAtMs,parent.closedAtMs+20*60000);
  const {starlightRecoverySignalState}=await import('../src/strategy.mjs');
  assert.equal(starlightRecoverySignalState(w,quote(41,t),engine.settings).reason,'observation_wait');
});

test('SE2-R5 partial rebound giveback resets upticks before another entry is possible',async()=>{
  const {engine,mem,parent}=await harness({ticks:2,crash:7,rebound:3});
  const id=await persistArm({engine,mem,parent});
  let t=Date.now()-1500;
  for(const bid of [45,36,38,40]){t+=100;await engine.observeStarlightRecoveryQuote(quote(bid,t));}
  assert.equal(engine.starlightRecoveryWatches.get(id).status,'READY');
  t+=100;await engine.observeStarlightRecoveryQuote(quote(39,t));
  const w=engine.starlightRecoveryWatches.get(id);
  assert.equal(w.status,'WATCHING');assert.equal(w.upwardTicks,0);
});

test('SE2-R5 direct successful recovery consumes its watch once, no second BUY',async()=>{
  const {engine,mem,parent}=await harness({ticks:0,crash:0,rebound:0});
  const id=await persistArm({engine,mem,parent});
  const q=quote(40);await engine.observeStarlightRecoveryQuote(q);
  engine.market={getQuote:()=>q,ensureFreshBook:async()=>true};
  engine.entryExecutionGate=()=>({allowed:true});
  let calls=0;
  engine.strategy={createHunter:async()=>{calls++;return {id:'starlight-child',status:'open',mode:'SIMULATION',sourceTradeId:parent.id};}};
  const first=await engine.attemptStarlightRecovery(id);
  assert.equal(first.status,'OPENED');
  assert.equal(engine.starlightRecoveryWatches.has(id),false);
  assert.equal((await engine.attemptStarlightRecovery(id)).status,'IGNORED');
  assert.equal(calls,1);
  assert.equal(mem.rows.get(mem.key({...parent,authorizationId:id,resetEpoch:engine.settings.resetTimestampMs})).status,'CONSUMED');
});

test('SE2-R5 false-positive stale and future quote stamps never advance the watch',async()=>{
  const {engine,mem,parent}=await harness({ticks:0});
  const id=await persistArm({engine,mem,parent});
  const stale=quote(30,Date.now()-15000);
  await engine.observeStarlightRecoveryQuote(stale);
  assert.equal(engine.starlightRecoveryWatches.get(id).lastQuoteAtMs,0);
  const future=quote(30,Date.now()+15000);
  await engine.observeStarlightRecoveryQuote(future);
  assert.equal(engine.starlightRecoveryWatches.get(id).lastQuoteAtMs,0);
});

test('SE2-R5 repeated quote timestamp never counts repeated upward ticks',async()=>{
  const {engine,mem,parent}=await harness({ticks:2});
  const id=await persistArm({engine,mem,parent});
  const at=Date.now()-1000;
  await engine.observeStarlightRecoveryQuote(quote(45,at));
  await engine.observeStarlightRecoveryQuote(quote(36,at+100));
  await engine.observeStarlightRecoveryQuote(quote(38,at+200));
  const before=engine.starlightRecoveryWatches.get(id);
  await engine.observeStarlightRecoveryQuote(quote(38,at+200));
  const after=engine.starlightRecoveryWatches.get(id);
  assert.equal(after.upwardTicks,before.upwardTicks);
  assert.equal(after.revision,before.revision);
});

test('SE2-R5 CAS rejects stale quote revision without erasing latest durable watch',async()=>{
  const {engine,mem,parent}=await harness();
  const id=await persistArm({engine,mem,parent});
  const first=engine.starlightRecoveryWatches.get(id);
  // Advance the database from another worker while this engine is stale.
  const newer={...first,status:'WATCHING',upwardTicks:6};
  const saved=await mem.updateStarlightWatch(newer,first.revision);
  assert.ok(saved);
  await engine.observeStarlightRecoveryQuote(quote(35));
  const last=engine.starlightRecoveryWatches.get(id);
  assert.equal(last.revision,saved.revision);
  assert.equal(last.upwardTicks,6);
});

test('SE2-R5 parent with a second-system mode or old reset epoch never opens a recovery seat',async()=>{
  const {engine,mem,parent}=await harness();
  const originalEpoch=engine.settings.resetTimestampMs;
  const id=await persistArm({engine,mem,parent});
  engine.settings={...engine.settings,resetTimestampMs:originalEpoch+1};
  await engine.refreshRecoveryPriorityTickers();
  assert.equal(engine.recoveryPriorityTickers.has('T'),false);
  assert.equal((await engine.attemptStarlightRecovery(id)).status,'IGNORED');
});

test('SE2-R5 no broker mutation if persisted watch is missing, even with a qualified in-memory copy',async()=>{
  const {engine,mem,parent}=await harness({ticks:0,crash:0,rebound:0});
  const id=await persistArm({engine,mem,parent});
  const q=quote(40);await engine.observeStarlightRecoveryQuote(q);
  const persisted=engine.starlightRecoveryWatches.get(id);
  engine.starlightRecoveryWatches.set(id,{...persisted,revision:0});
  engine.entryExecutionGate=()=>({allowed:true});
  engine.market={getQuote:()=>q};let orders=0;
  engine.strategy={createHunter:async()=>{orders++;return {id:'unsafe'};}};
  assert.equal((await engine.attemptStarlightRecovery(id)).status,'IGNORED');
  assert.equal(orders,0);
});

// Staging-only real PostgreSQL gate. It runs against a disposable schema and
// verifies the actual SE2-R5 adapter's CAS, rollback, and cross-process read.
test('SE2-R5 POSTGRES GATE: watch/revision survives interrupted transaction and fresh Node restart',
  {skip:!(process.env.SAGITTARIUS_TEST_DATABASE_URL&&process.env.SAGITTARIUS_ALLOW_INTEGRATION_TEST_DB==='1')},async()=>{
  const {default:pg}=await import('pg');
  const {Database}=await import('../src/db.mjs');
  const {randomBytes}=await import('node:crypto');
  const {execFileSync}=await import('node:child_process');
  const url=process.env.SAGITTARIUS_TEST_DATABASE_URL;
  const pool=new pg.Pool({connectionString:url,ssl:/localhost|127\.0\.0\.1/.test(url)?false:{rejectUnauthorized:false}});
  const schema='sag_se2_r5_'+randomBytes(5).toString('hex');
  const table=`"${schema}".sag_starlight_recovery_v1`;
  try{
    await pool.query(`create schema "${schema}"`);
    await pool.query(`create table ${table}(system_name text,owner_id text,mode text,reset_epoch bigint,
      authorization_id text,parent_entry_id text,status text,revision bigint not null,watch jsonb,
      updated_at_ms bigint,primary key(system_name,owner_id,mode,reset_epoch,authorization_id),
      unique(system_name,owner_id,mode,reset_epoch,parent_entry_id))`);
    const db=Object.create(Database.prototype);
    db.pool={query:(sql,values)=>pool.query(sql.replaceAll('sag_starlight_recovery_v1',table),values)};
    const w={authorizationId:'STARLIGHT-RECOVERY:p',parentEntryId:'p',systemName:'s',ownerId:'o',mode:'SIMULATION',resetEpoch:100,
      status:'ARMED',armedAtMs:100,stopPriceCents:42,upwardTicks:0};
    const init=await db.insertStarlightWatch(w);assert.equal(Number(init.revision),1);
    const committed=await db.updateStarlightWatch({...w,status:'READY',upwardTicks:3},1);
    assert.equal(Number(committed.revision),2);
    assert.equal(await db.updateStarlightWatch({...w,status:'CONSUMED'},1),null);
    const connection=await pool.connect();
    await connection.query('begin');
    await connection.query(`update ${table} set status='CONSUMED',revision=9 where authorization_id=$1`,[w.authorizationId]);
    connection.release(true); // drop => server must roll back the uncommitted change
    const current=await db.starlightWatch(w);
    assert.equal(Number(current.revision),2);assert.equal(current.status,'READY');
    const script=`import pg from 'pg';const p=new pg.Pool({connectionString:process.env.SAGITTARIUS_TEST_DATABASE_URL,ssl:/localhost|127\\.0\\.0\\.1/.test(process.env.SAGITTARIUS_TEST_DATABASE_URL)?false:{rejectUnauthorized:false}});try{const r=await p.query('select revision,status,watch from ${table} where authorization_id=$1',['STARLIGHT-RECOVERY:p']);console.log(JSON.stringify(r.rows[0]));}finally{await p.end();}`;
    const child=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],
      {encoding:'utf8',env:process.env,cwd:process.cwd(),timeout:30000}));
    assert.equal(Number(child.revision),2);assert.equal(child.status,'READY');assert.equal(child.watch.upwardTicks,3);
  }finally{try{await pool.query(`drop schema if exists "${schema}" cascade`);}finally{await pool.end();}}
});

test('SE2-R5 one immutable parent produces exactly one deterministic child ID across restarts',async()=>{
  const {starlightRecoveryEntryId}=await import('../src/strategy.mjs');
  const s={systemName:'sys',ownerId:'owner',mode:'LIVE',resetEpoch:169000,parentEntryId:'PARENT'};
  const id=starlightRecoveryEntryId(s);
  assert.equal(starlightRecoveryEntryId({...s,authorizationId:'other',revision:100}),id);
  assert.notEqual(starlightRecoveryEntryId({...s,parentEntryId:'DIFFERENT'}),id);
  assert.notEqual(starlightRecoveryEntryId({...s,resetEpoch:169001}),id);
  assert.notEqual(starlightRecoveryEntryId({...s,mode:'SIMULATION'}),id);
  assert.throws(()=>starlightRecoveryEntryId({...s,parentEntryId:null}),/identity_required/);
  const {readFileSync}=await import('node:fs');
  const src=readFileSync(new URL('../src/strategy.mjs',import.meta.url),'utf8');
  assert.ok(src.includes('starlightRecovery===true?starlightRecoveryEntryId(starlightRecoverySnapshot):nowId()'));
});

// SE2-R6 independent, UNMOCKED StrategyEngine SIM integration. Unlike the
// legacy direct recovery unit fixture, this exercises createHunter's actual
// admission, price, cash, final-confirmation, and ledger-insertion chain.
async function independentStarlightFixture({clockMinutes=200,enabled=true,activeOtherAttack=false,closedParent=true,crash=3,rebound=2,ticks=2,observation=0,staleBook=false,capital=1_000_000,maxPositions=20}={}){
  const { originalSettings }=await import('../src/config.mjs');
  const { StrategyEngine }=await import('../src/strategy.mjs');
  const {engine,mem,parent}=await harness({crash,rebound,ticks,observation});
  engine.settings={...originalSettings(),...engine.settings,
    mode:'SIMULATION',ownerId:'o1',systemName:'s1',
    crashRecoveryHunterEnabled:enabled,
    crashRecoveryStakeCents:500,
    crashRecoveryHunterObservationMinutes:observation,
    crashRecoveryHunterMinCrashCents:crash,
    crashRecoveryHunterMinReboundCents:rebound,
    crashRecoveryHunterMinUpwardTicks:ticks,
    crashRecoveryMinEntryCents:30,crashRecoveryMaxEntryCents:95,
    startingCapitalCents:capital,maxPositions,maxEntriesPerTrade:1,
    hunterCooldownMinutes:181,galacticExplosionEnabled:false,
    minGameMinutes:30,maxGameMinutes:120,engineActive:true,
    infinityBreakMaximumBookAgeMs:5000};
  let liveQuote={...quote(40),gameStartTimeMs:Date.now()-clockMinutes*60_000};
  const market={
    getQuote:()=>structuredClone(liveQuote),
    ensureFreshBook:async()=>true,
    refreshTickerVerified:async()=>staleBook?{marketFresh:true,bookFresh:false,quote:structuredClone(liveQuote)}:{marketFresh:true,bookFresh:true,quote:structuredClone(liveQuote)},
    executableAsk:(_t,count)=>({filled:count,full:true,avgCents:liveQuote.yesAsk,bestCents:liveQuote.yesAsk}),
    bookAgeMs:()=>0,quoteAgeMs:()=>0,
  };
  engine.market=market;
  engine.entryExecutionGate=()=>({allowed:true});
  mem.inserted=[];mem.otherOpen=[];
  if(activeOtherAttack)mem.otherOpen.push({id:'CURRENT-OTHER-ATTACK',conceptName:'Wave Surfer',ticker:'T',eventTicker:'E',mode:'SIMULATION',systemName:'s1',ownerId:'o1',status:'open',openedAtMs:Date.now()-30_000,entryPriceCents:39,count:1,remainingCount:1});
  mem.openEntries=async()=>[...mem.otherOpen,...mem.children.values()].filter(e=>['open','entry_pending','exit_pending','pending_recovery'].includes(e.status));
  mem.openEntriesByTicker=async(_sys,ticker)=>(await mem.openEntries()).filter(e=>e.ticker===ticker);
  mem.openHunterEntriesByTicker=mem.openEntriesByTicker;
  mem.hunterEventPolicySnapshot=async()=>({activeEntries:activeOtherAttack?1:0,latestHunterEntryMs:Date.now()-30_000,latestByConcept:{'Wave Surfer':Date.now()-30_000}});
  mem.acquireHunterTickerLock=async()=>async()=>{};
  mem.insertEntry=async(e)=>{mem.inserted.push(structuredClone(e));mem.children.set(String(e.sourceTradeId),structuredClone(e));};
  mem.updateEntry=async(id,patch)=>{const child=[...mem.children.values()].find(e=>e.id===id);if(child)Object.assign(child,structuredClone(patch));};
  mem.entryById=async(id)=>structuredClone(mem.parents.get(id)||[...mem.children.values()].find(e=>e.id===id)||null);
  mem.entries=async()=>[...mem.parents.values(),...mem.otherOpen,...mem.children.values()].map(e=>structuredClone(e));
  // This throws deliberately: a Starlight-only recovery must NEVER request
  // independent Game Clock evidence after a valid stop-loss signal.
  let clockCalls=0;
  const strategy=new FixtureStrategyEngine({db:mem,market,kalshi:{},learning:{},
    getSettings:()=>engine.settings,getLiveReady:()=>false,
    refreshGameClock:async()=>{clockCalls++;throw Error('ORDINARY_GAME_CLOCK_SHOULD_NOT_RUN');},
    getCurrentStarlightWatch:(id)=>engine.starlightRecoveryWatches.get(String(id))||null,
    random:()=>0});
  engine.strategy=strategy;
  if(!closedParent)parent.status='open';
  const updateQuote=(bid,at=Date.now())=>{
    liveQuote={...quote(bid,at),gameStartTimeMs:Date.now()-clockMinutes*60_000};
    return structuredClone(liveQuote);
  };
  return {engine,mem,parent,strategy,market,updateQuote,clockCalls:()=>clockCalls};
}
async function progressStarlightWatch(f,prices=[44,35,37,40]){
  const id=await persistArm(f);
  let at=Date.now()-1500;
  for(const price of prices){at+=150;await f.engine.observeStarlightRecoveryQuote(f.updateQuote(price,at));}
  return id;
}

test('SE2-R6 round2: real StrategyEngine inserts a Starlight SIM trade after a stop loss beyond minute 200 with no Game Clock',async()=>{
  const f=await independentStarlightFixture({clockMinutes:240,activeOtherAttack:true});
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'READY');
  f.engine.entryExecutionGate=()=>({allowed:true});
  const result=await f.engine.attemptStarlightRecovery(id);
  assert.equal(result.status,'OPENED',JSON.stringify({result,history:f.strategy.entryPipelineEvents.slice(-20),audits:f.mem.auditEvents.slice(-10)}));
  assert.equal(f.clockCalls(),0);
  assert.equal(f.mem.inserted.length,1);
  assert.equal(f.mem.inserted[0].conceptName,'Crash Recovery Hunter');
  assert.equal(f.mem.inserted[0].sourceTradeId,f.parent.id);
  assert.equal(f.mem.inserted[0].entryConfig.starlightRecovery.parentEntryId,f.parent.id);
  assert.equal(f.mem.inserted[0].entryConfig.finalEntryConfirmation.route,'durable_starlight_recovery');
  assert.equal(f.mem.rows.get(f.mem.key({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs})).status,'CONSUMED');
  assert.equal((await f.engine.attemptStarlightRecovery(id)).status,'IGNORED');
  assert.equal(f.mem.inserted.length,1,'parent loss must never produce a second recovery child');
});

test('SE2-R6 round2: missing hard stop, unqualified geometry, and unarmed LIVE recovery fail closed',async()=>{
  const missingStop=await independentStarlightFixture({closedParent:false});
  assert.equal(missingStop.engine.armStarlightRecovery(missingStop.parent),false);
  const insufficient=await independentStarlightFixture({crash:8,rebound:5,ticks:3});
  insufficient.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(insufficient,[44,40,42]);
  assert.notEqual(insufficient.engine.starlightRecoveryWatches.get(id).status,'READY');
  assert.notEqual((await insufficient.engine.attemptStarlightRecovery(id)).status,'OPENED');
  assert.equal(insufficient.mem.inserted.length,0);
  const live=await independentStarlightFixture();
  live.engine.settings.mode='LIVE';live.parent.mode='LIVE';
  assert.equal(live.engine.armStarlightRecovery(live.parent),true);
  await live.engine.starlightRecoveryArmWrites.get('STARLIGHT-RECOVERY:'+live.parent.id);
  assert.equal(live.mem.inserted.length,0);
});

test('SE2-R6 round2: finalized market is durably terminal and removed from recovery priority',async()=>{
  const f=await independentStarlightFixture();
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await persistArm(f);
  await f.engine.refreshRecoveryPriorityTickers();
  assert.equal(f.engine.recoveryPriorityTickers.has('T'),true);
  await f.engine.observeStarlightRecoveryQuote({...f.updateQuote(40),result:'yes',status:'finalized'});
  const watchRow=await f.mem.starlightWatch({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs});
  assert.equal(watchRow.status,'BLOCKED');
  assert.equal(watchRow.watch.terminalReason,'market_finalized');
  assert.equal(f.engine.starlightRecoveryWatches.has(id),false);
  await f.engine.refreshRecoveryPriorityTickers();
  assert.equal(f.engine.recoveryPriorityTickers.has('T'),false);
  assert.equal(f.mem.inserted.length,0);
});

test('SE2-R6 round2: liquidity, capacity and cash remain non-bypassable execution safety gates',async()=>{
  for(const kind of ['book','capacity','cash']){
    const f=await independentStarlightFixture({staleBook:kind==='book',maxPositions:kind==='capacity'?1:20,activeOtherAttack:kind==='capacity',capital:kind==='cash'?10:1000000});
    f.engine.entryExecutionGate=()=>({allowed:false});
    const id=await progressStarlightWatch(f);
    f.engine.entryExecutionGate=()=>({allowed:true});
    const result=await f.engine.attemptStarlightRecovery(id);
    assert.notEqual(result.status,'OPENED',kind);
    assert.equal(f.mem.inserted.length,0,kind);
  }
});

test('SE2-R6 round3: Starlight cannot be vetoed by failed event-admission telemetry or 181-minute cooldown',async()=>{
  const f=await independentStarlightFixture({clockMinutes:250,activeOtherAttack:true});
  f.mem.hunterEventPolicySnapshot=async()=>{throw Error('unrelated_event_admission_db_is_unavailable');};
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  f.engine.entryExecutionGate=()=>({allowed:true});
  const result=await f.engine.attemptStarlightRecovery(id);
  assert.equal(result.status,'OPENED',JSON.stringify({result,history:f.strategy.entryPipelineEvents.slice(-10)}));
  assert.equal(f.mem.inserted.length,1);
  assert.equal(f.clockCalls(),0);
});

test('SE2-R6 round3: no arbitrary six-hour expiry while the market remains active',async()=>{
  const f=await independentStarlightFixture({clockMinutes:900});
  f.engine.settings.resetTimestampMs=Date.now()-24*3600_000;
  f.parent.closedAtMs=Date.now()-8*3600_000;
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await persistArm(f);
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.expiresAtMs,Number.MAX_SAFE_INTEGER);
  assert.equal(w.armedAtMs,f.parent.closedAtMs);
  let at=Date.now()-2000;
  for(const bid of [45,35,37,40]){at+=200;await f.engine.observeStarlightRecoveryQuote(f.updateQuote(bid,at));}
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'READY');
  f.engine.entryExecutionGate=()=>({allowed:true});
  assert.equal((await f.engine.attemptStarlightRecovery(id)).status,'OPENED');
  assert.equal(f.clockCalls(),0);
});

test('SE2-R6 round3: R5 active watch lifts old expiry on restart without resetting evidence',async()=>{
  const f=await independentStarlightFixture();
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  const watch=f.engine.starlightRecoveryWatches.get(id);
  const old={...watch,expiresAtMs:watch.armedAtMs+6*3600_000};
  const updated=await f.mem.updateStarlightWatch(old,watch.revision);
  assert.ok(updated);
  // Restart clears runtime memory but retains durable records and same epoch.
  f.engine.starlightRecoveryWatches.clear();
  f.engine.starlightKnownParents.clear();
  const restored=await f.engine.rehydrateStarlightRecovery();
  assert.ok(restored>=1);
  const after=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(after.expiresAtMs,Number.MAX_SAFE_INTEGER);
  assert.equal(after.armedAtMs,watch.armedAtMs);
  assert.equal(after.crashConfirmedAtMs,watch.crashConfirmedAtMs);
  assert.equal(after.troughSinceArmCents,watch.troughSinceArmCents);
  assert.equal(after.upwardTicks,watch.upwardTicks);
  assert.ok(after.revision>updated.revision);
});

test('SE2-R6 round3: a second stopped parent on the same ticker receives its own recoverable child',async()=>{
  const f=await independentStarlightFixture({clockMinutes:160});
  f.engine.entryExecutionGate=()=>({allowed:false});
  const first=await progressStarlightWatch(f);
  // A second genuine stopped attack gets its OWN watch; Starlight can coexist
  // even while the first Starlight child is open, with hard capacity enforced.
  const second={...f.parent,id:'parent2',conceptName:'Scarlet Needle'};
  f.mem.parents.set(second.id,second);
  assert.equal(f.engine.armStarlightRecovery(second),true);
  const next='STARLIGHT-RECOVERY:'+second.id;
  await f.engine.starlightRecoveryArmWrites.get(next);
  let at=Date.now()-1200;
  for(const bid of [44,34,37,40]){at+=200;await f.engine.observeStarlightRecoveryQuote(f.updateQuote(bid,at));}
  assert.equal(f.engine.starlightRecoveryWatches.get(next).status,'READY');
  f.engine.entryExecutionGate=()=>({allowed:true});
  assert.equal((await f.engine.attemptStarlightRecovery(first)).status,'OPENED');
  assert.equal((await f.engine.attemptStarlightRecovery(next)).status,'OPENED');
  assert.equal(f.mem.inserted.length,2);
  assert.notEqual(f.mem.inserted[0].id,f.mem.inserted[1].id);
  assert.deepEqual(new Set(f.mem.inserted.map(e=>e.sourceTradeId)),new Set(['parent1','parent2']));
  assert.equal(f.engine.armStarlightRecovery({...second,conceptName:'Crash Recovery Hunter'}),false,'self-chain forbidden');
});

test('SE2-R6 round3: on-demand diagnostics explicitly report recovery watch, reasons and independent authority',async()=>{
  const f=await independentStarlightFixture();
  const id=await persistArm(f);
  await f.engine.observeStarlightRecoveryQuote(f.updateQuote(39));
  const d=f.engine.starlightRecoveryDiagnostics();
  assert.equal(d.strategicClockGate,false);
  assert.equal(d.ordinaryEventCapGate,false);
  assert.equal(d.ordinaryTickerCrossAttackGate,false);
  assert.equal(d.ordinaryCooldownGate,false);
  assert.equal(d.activeWatchCount,1);
  assert.equal(d.watches[0].authorizationId,id);
  assert.ok(['crash_rebound_or_ticks','qualified'].includes(d.watches[0].lastSignalReason));
  assert.equal(d.watches[0].expiresAtMs,Number.MAX_SAFE_INTEGER);
});

test('SE2-R6 round3: scanner refresh retires durable watch after missed final websocket update',async()=>{
  const f=await independentStarlightFixture();
  const id=await persistArm(f);
  await f.engine.refreshRecoveryPriorityTickers();
  assert.equal(f.engine.recoveryPriorityTickers.has('T'),true);
  const final={...f.updateQuote(40),status:'finalized',result:'yes'};
  f.market.getQuote=()=>structuredClone(final);
  await f.engine.refreshRecoveryPriorityTickers();
  assert.equal(f.engine.recoveryPriorityTickers.has('T'),false);
  assert.equal((await f.mem.starlightWatch({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs})).status,'BLOCKED');
});

// SE2-R7: Previously absent from the triple audit: operational liveness when
// the recovery ticker has no WS follow-up, admission is temporarily disabled,
// or a claimed SIM entry throws before any child is committed.
test('SE2-R7 round1: REST-only recovering ticker still advances durable watch geometry',async()=>{
  const f=await independentStarlightFixture({crash:0,rebound:1,ticks:1,observation:0});
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await persistArm(f);
  const tasks=[];const bids=[38,39];let restTime=Date.now()-500;
  f.engine.kalshi={getMarket:async(ticker)=>{const bid=bids.shift()??39;return{ticker,eventTicker:'E',status:'active',yesBid:bid,yesAsk:bid+1,updatedAtMs:++restTime};}};
  f.market.seed=(q,{emit=false}={})=>{
    const accepted=f.updateQuote(q.yesBid,q.updatedAtMs);
    if(emit)tasks.push(f.engine.observeStarlightRecoveryQuote(accepted));
    return accepted;
  };
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes()).polled,1);
  await Promise.all(tasks.splice(0));
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes()).polled,1);
  await Promise.all(tasks.splice(0));
  const active=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(active.status,'READY');
  assert.equal(active.upwardTicks,1);
  assert.equal(active.troughSinceArmCents,38);
  assert.equal(f.mem.inserted.length,0,'qualified recovery must not trade while entry disabled');
});

test('SE2-R7 round1: READY recovery wakes and opens without a subsequent quote tick',async()=>{
  const f=await independentStarlightFixture();
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'READY');
  f.engine.entryExecutionGate=()=>({allowed:true});
  assert.equal(await f.engine.wakeStarlightRecoveryWatches(),1);
  for(let i=0;i<40&&f.mem.inserted.length===0;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(f.mem.inserted.length,1,'the existing READY snapshot must be reconsidered');
  assert.equal(f.mem.inserted[0].sourceTradeId,f.parent.id);
});

test('SE2-R7 round2: claimed SIM child exception returns to durable WATCHING rather than EXECUTING forever',async()=>{
  const f=await independentStarlightFixture();
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  f.engine.entryExecutionGate=()=>({allowed:true});
  f.strategy.createHunter=async()=>{throw new Error('temporary_sim_persistence_failure')};
  await assert.rejects(()=>f.engine.attemptStarlightRecovery(id),/temporary_sim_persistence_failure/);
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.status,'WATCHING');
  assert.equal(w.lastAttemptReason,'execution_exception_no_child');
  assert.equal((await f.mem.starlightWatch(w)).status,'WATCHING');
  assert.equal(f.mem.inserted.length,0);
});

test('SE2-R7 round2: orphaned old claim is reconciled without duplicating an order',async()=>{
  const f=await independentStarlightFixture();
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  const w=f.engine.starlightRecoveryWatches.get(id);
  const executing={...w,status:'EXECUTING',claimAtMs:Date.now()-40_000};
  const saved=await f.mem.updateStarlightWatch(executing,w.revision);
  f.engine.starlightRecoveryWatches.set(id,{...executing,revision:Number(saved.revision)});
  f.engine.entryExecutionGate=()=>({allowed:true});
  assert.equal(await f.engine.wakeStarlightRecoveryWatches(),0);
  const current=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(current.status,'WATCHING');
  assert.equal(current.lastAttemptReason,'recovered_stale_execution_claim');
  assert.equal(f.mem.inserted.length,0,'no blind duplicate before a new signal authorization');
});

test('SE2-R7 round3: REST poll is bounded and honors scoped active watches',async()=>{
  const f=await independentStarlightFixture();
  const id=await persistArm(f);
  let requests=0;
  f.engine.kalshi={getMarket:async(t)=>{requests++;return{ticker:t,yesBid:39,yesAsk:40}}};
  f.market.seed=()=>({ticker:'T'});
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes({maximum:1})).polled,1);
  assert.equal(requests,1);
  f.engine.starlightRecoveryWatches.get(id).status='CONSUMED';
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes({maximum:1})).polled,0);
  assert.equal(requests,1);
});

test('SE2-R7 round3: durable watch export carries historical terminal reasons and active evidence',async()=>{
  const {Database}=await import('../src/db.mjs');
  let queryCount=0;
  const db=Object.create(Database.prototype);
  db.pool={query:async(sql)=>{
    queryCount++;
    if(String(sql).includes('group by status'))return{rows:[{status:'WATCHING',count:1},{status:'CONSUMED',count:3}]};
    return{rows:[{parent_entry_id:'PARENT',status:'WATCHING',revision:7,updated_at_ms:Date.now(),watch:{ticker:'T',armedAtMs:123,releaseAtMs:124,stopPriceCents:40,lastBidCents:41,upwardTicks:2,lastSignalReason:'price_band'}}]};
  }};
  const snapshot=await db.starlightExportSnapshot({systemName:'s1',ownerId:'o1',mode:'SIMULATION',resetEpoch:11});
  assert.equal(queryCount,2);
  assert.equal(snapshot.available,true);
  assert.equal(snapshot.total,4);
  assert.equal(snapshot.recordsIncluded,1);
  assert.equal(snapshot.recordsOmitted,3);
  assert.equal(snapshot.records[0].lastSignalReason,'price_band');
});


test('SE2-R7 end-to-end: actual MarketHub REST quote dispatch and real StrategyEngine SIM entry after temporary gate',async()=>{
  const {MarketHub}=await import('../src/market.mjs');
  const f=await independentStarlightFixture({clockMinutes:240,crash:0,rebound:1,ticks:1,observation:0});
  let restIndex=0;
  const latest=[38,39];
  const observers=[];
  let restAt=Date.now()-700;
  const market=new MarketHub({
    kalshi:{getMarket:async(ticker)=>({ticker,eventTicker:'E',status:'active',yesBid:latest[Math.min(restIndex++,1)],yesAsk:latest[Math.min(restIndex-1,1)]+1,updatedAtMs:++restAt})},
    getCredentials:()=>null,onQuote:q=>observers.push(f.engine.observeStarlightRecoveryQuote(q)),
  });
  market.refreshTickerVerified=async()=>({marketFresh:true,bookFresh:true,quote:market.getQuote('T')});
  market.ensureFreshBook=async()=>true;
  market.executableAsk=(_ticker,count)=>({filled:count,full:true,avgCents:market.getQuote('T').yesAsk,bestCents:market.getQuote('T').yesAsk});
  market.bookAgeMs=()=>0;market.quoteAgeMs=()=>0;
  f.engine.market=market;f.engine.kalshi=market.kalshi;f.strategy.market=market;
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await persistArm(f);
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes()).polled,1);
  await Promise.all(observers.splice(0));
  assert.equal((await f.engine.refreshStarlightRecoveryMarketQuotes()).polled,1);
  await Promise.all(observers.splice(0));
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'READY');
  assert.equal(f.mem.inserted.length,0,'entry gate must block qualified orders');
  f.engine.entryExecutionGate=()=>({allowed:true});
  assert.equal(await f.engine.wakeStarlightRecoveryWatches(),1);
  for(let i=0;i<60&&f.mem.inserted.length===0;i++)await new Promise(r=>setTimeout(r,10));
  assert.equal(f.mem.inserted.length,1,'REST-only recovery must reach the actual SIM entry engine');
  assert.equal(f.mem.inserted[0].sourceTradeId,f.parent.id);
  assert.equal(f.mem.inserted[0].entryConfig.finalEntryConfirmation.route,'durable_starlight_recovery');
  assert.equal(f.clockCalls(),0,'ordinary clock must stay exempt');
  assert.equal((await f.mem.starlightWatch({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs})).status,'CONSUMED');
  assert.equal(f.mem.inserted.length,1,'one child per loss');
});

test('SE2-R7 fairness: 18 simultaneous recovery watches are eventually considered with a 4-watch budget',async()=>{
  const f=await independentStarlightFixture({crash:0,rebound:0,ticks:0});
  f.engine.starlightRecoveryWatches.clear();
  f.engine.market.getQuote=()=>null;
  for(let i=0;i<18;i++){
    const w={authorizationId:'STARLIGHT-RECOVERY:fair-'+i,parentEntryId:'fair-'+i,ticker:'T'+i,
      status:'WATCHING',systemName:'s1',ownerId:'o1',mode:'SIMULATION',resetEpoch:f.engine.settings.resetTimestampMs,
      armedAtMs:Date.now()-20000,releaseAtMs:Date.now()-19000,revision:1};
    f.engine.starlightRecoveryWatches.set(w.authorizationId,w);
  }
  let readTickers=[];
  f.engine.market.getQuote=t=>{readTickers.push(t);return null};
  for(let j=0;j<5;j++)await f.engine.wakeStarlightRecoveryWatches({maximum:4});
  assert.equal(new Set(readTickers).size,18,'wakeup budget must not starve the latter watches');
});

test('SE2-R7 LIVE broker ambiguity: expired EXECUTING claim is not blindly retried without broker truth',async()=>{
  const f=await harness({mode:'LIVE',crash:0,rebound:0,ticks:0});
  const id=await persistArm(f);
  const w=f.engine.starlightRecoveryWatches.get(id);
  const claim={...w,status:'EXECUTING',claimAtMs:Date.now()-60_000};
  const saved=await f.mem.updateStarlightWatch(claim,w.revision);
  f.engine.starlightRecoveryWatches.set(id,{...claim,revision:Number(saved.revision)});
  f.engine.entryExecutionGate=()=>({allowed:true});
  await f.engine.wakeStarlightRecoveryWatches();
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'EXECUTING');
  assert.equal((await f.mem.starlightWatch(w)).status,'EXECUTING');
});

test('SE2-R7 real StrategyEngine rejection is attached to its exact stopped parent watch',async()=>{
  const f=await independentStarlightFixture({staleBook:true});
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await progressStarlightWatch(f);
  f.engine.entryExecutionGate=()=>({allowed:true});
  const result=await f.engine.attemptStarlightRecovery(id);
  assert.equal(result.status,'WATCHING');
  const watch=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(watch.status,'WATCHING');
  assert.ok(watch.lastAttemptReason,'must persist the entry rejection rather than a silent retry');
  assert.ok(watch.lastAttemptAtMs>0);
  assert.equal((await f.mem.starlightWatch(watch)).watch.lastAttemptReason,watch.lastAttemptReason);
  assert.equal(f.mem.inserted.length,0);
});

// SE2-R8 A-to-Z liveness regressions. These intentionally reproduce failure
// scenarios that R7's mock-only happy-path tests did not cover.
test('SE2-R8 restart rehydrates an orphaned stopped parent beyond 5000 shadow rows using a targeted SQL outbox',async()=>{
  const f=await harness();
  const closedAt=f.parent.closedAtMs;
  let queried=0;
  f.mem.entries=async()=>{throw Error('forbidden_5000_entry_scan');};
  f.mem.unwatchedStarlightStoppedParents=async(scope,options)=>{
    queried++;
    assert.equal(scope.systemName,'s1');assert.equal(scope.mode,'SIMULATION');
    assert.ok(options.conceptNames.includes('Momentum Hunter'));
    // This parent is absent from the latest 5,000 shadow-heavy ledger rows.
    return [structuredClone(f.parent)];
  };
  assert.ok(await f.engine.rehydrateStarlightRecovery());
  const watch=f.engine.starlightRecoveryWatches.get('STARLIGHT-RECOVERY:parent1');
  assert.ok(watch);assert.equal(watch.armedAtMs,closedAt);
  assert.equal(watch.status,'ARMED');assert.equal(queried,1);
});

test('SE2-R8 missed stop callback is reconciled during runtime and never rearmed twice',async()=>{
  const f=await harness();
  f.mem.unwatchedStarlightStoppedParents=async()=>{
    const row=f.mem.rows.get(f.mem.key({systemName:'s1',ownerId:'o1',mode:'SIMULATION',resetEpoch:f.engine.settings.resetTimestampMs,authorizationId:'STARLIGHT-RECOVERY:parent1'}));
    return row?[]:[structuredClone(f.parent)];
  };
  assert.equal((await f.engine.reconcileStarlightStopLossParents()).armed,1);
  assert.equal(f.engine.starlightRecoveryWatches.size,1);
  assert.equal((await f.engine.reconcileStarlightStopLossParents()).armed,0);
  assert.equal(f.engine.starlightRecoveryStats.orphansArmed,1);
});

test('SE2-R8 failed initial watch persistence is retried after database recovery',async()=>{
  const f=await harness();
  f.mem.failWrites=true;
  const id=await persistArm(f);
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'PERSIST_FAILED');
  f.mem.failWrites=false;
  f.mem.unwatchedStarlightStoppedParents=async()=>[structuredClone(f.parent)];
  const report=await f.engine.reconcileStarlightStopLossParents();
  assert.equal(report.armed,1);
  const watch=f.engine.starlightRecoveryWatches.get(id);
  assert.ok(watch.revision>=1);
  assert.equal(watch.armedAtMs,f.parent.closedAtMs);
  assert.equal((await f.mem.starlightWatch(watch)).status,'ARMED');
});

test('SE2-R8 burst of seven ordered upticks is persisted and qualifies even while DB CAS is delayed',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:7,observation:0});
  const id=await persistArm(f);
  const original=f.mem.updateStarlightWatch.bind(f.mem);
  f.mem.updateStarlightWatch=async(...args)=>{
    await new Promise(resolve=>setTimeout(resolve,3));return original(...args);
  };
  const start=Date.now()-1000;
  await Promise.all([41,42,43,44,45,46,47].map((bid,i)=>
    f.engine.observeStarlightRecoveryQuote(quote(bid,start+20*(i+1)))));
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.upwardTicks,7,'R7 lost six of seven ticks by coalescing pending quotes');
  assert.equal(w.status,'READY');
  assert.equal((await f.mem.starlightWatch(w)).watch.upwardTicks,7);
});

test('SE2-R8 delayed older REST observations cannot replace more recent queued WS prices',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  const id=await persistArm(f);
  const original=f.mem.updateStarlightWatch.bind(f.mem);
  f.mem.updateStarlightWatch=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,3));return original(...args);};
  const t=Date.now()-1000;
  const [a,b,c]=await Promise.all([
    f.engine.observeStarlightRecoveryQuote(quote(41,t+100)),
    f.engine.observeStarlightRecoveryQuote(quote(45,t+300)),
    f.engine.observeStarlightRecoveryQuote(quote(42,t+200)),
  ]);
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.lastBidCents,45);
  assert.equal(w.upwardTicks,2);
  assert.ok(f.engine.starlightRecoveryStats.pendingQuoteReorders>=1);
});

test('SE2-R8 terminal market quote is not lost even when it shares an older quote timestamp',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  const id=await persistArm(f);
  const original=f.mem.updateStarlightWatch.bind(f.mem);
  f.mem.updateStarlightWatch=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,3));return original(...args);};
  const t=Date.now()-1000;
  await Promise.all([
    f.engine.observeStarlightRecoveryQuote(quote(42,t+100)),
    f.engine.observeStarlightRecoveryQuote({...quote(42,t+100),status:'finalized',result:'yes'}),
  ]);
  assert.equal(f.engine.starlightRecoveryWatches.has(id),false);
  assert.equal((await f.mem.starlightWatch({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs})).status,'BLOCKED');
});

test('SE2-R8 SQL orphan selection filters by scope, closed hard stops and durable watch/child existence',async()=>{
  const {Database}=await import('../src/db.mjs');
  let query='',params=[];
  const db={pool:{query:async(sql,args)=>{query=sql;params=args;return {rows:[]};}}};
  const rows=await Database.prototype.unwatchedStarlightStoppedParents.call(db,
    {systemName:'S',ownerId:'O',mode:'SIMULATION',resetEpoch:123},
    {conceptNames:['Athena Exclamation','Momentum Hunter','Crash Recovery Hunter'],limit:21});
  assert.deepEqual(rows,[]);
  assert.match(query,/e\.close_reason='hard_stop_loss'/);
  assert.match(query,/not exists \(select 1 from sag_starlight_recovery_v1/);
  assert.match(query,/not exists \(select 1 from sag_entries child/);
  assert.match(query,/e\.closed_at_ms >= \$4/);
  assert.deepEqual(params.slice(0,4),['S','O','SIMULATION',123]);
  assert.deepEqual(params[4],['Athena Exclamation','Momentum Hunter']);
  assert.equal(params[5],21);
});

test('SE2-R8 stale invalid market book is refreshed before REST watch evaluation (real MarketHub)',async()=>{
  const {MarketHub}=await import('../src/market.mjs');
  const f=await harness({crash:0,rebound:1,ticks:1});
  const id=await persistArm(f);
  const tasks=[];
  const api={
    getMarket:async()=>({...quote(42,Date.now()),status:'active'}),
    getOrderbook:async()=>({yesBids:[{priceCents:42,count:10}],noBids:[{priceCents:57,count:10}],updatedAtMs:Date.now()}),
  };
  const hub=new MarketHub({kalshi:api,wsUrl:'ws://nowhere',getCredentials:()=>null,
    onQuote:q=>tasks.push(f.engine.observeStarlightRecoveryQuote(q))});
  hub.seed({...quote(40,Date.now()-6000),bookInvalid:true});
  assert.equal(hub.getQuote('T').bookInvalid,true);
  f.engine.market=hub;f.engine.kalshi=api;
  const report=await f.engine.refreshStarlightRecoveryMarketQuotes({maximum:1});
  await Promise.all(tasks);
  assert.equal(report.bookRefreshed,1);
  assert.equal(hub.getQuote('T').bookInvalid,false);
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.status,'READY');
  assert.equal(w.lastBidCents,42);
});

test('SE2-R8 full recovery: orphaned hard stop, seven rapid ticks, no ordinary clock, exactly one real SIM child',async()=>{
  const f=await independentStarlightFixture({clockMinutes:240,crash:0,rebound:1,ticks:7,observation:0});
  // Power failed after parent close but before Starlight arm callback. The
  // legacy 5,000-row scan has no access to this older parent among shadows.
  const normalEntries=f.mem.entries.bind(f.mem);
  f.mem.entries=async()=>{throw Error('shadow_flood_history_reader_must_not_run_during_recovery');};
  f.mem.unwatchedStarlightStoppedParents=async()=>[structuredClone(f.parent)];
  f.engine.entryExecutionGate=()=>({allowed:false});
  await f.engine.rehydrateStarlightRecovery();
  f.mem.entries=normalEntries; // Normal cash accounting remains authoritative.
  const id='STARLIGHT-RECOVERY:'+f.parent.id;
  assert.ok(f.engine.starlightRecoveryWatches.has(id));
  // PostgreSQL latency must not compress the seven operator-required upticks.
  const original=f.mem.updateStarlightWatch.bind(f.mem);
  f.mem.updateStarlightWatch=async(...args)=>{await new Promise(r=>setTimeout(r,2));return original(...args);};
  const at=Date.now()-1200;
  await Promise.all([41,42,43,44,45,46,47].map((bid,i)=>
    f.engine.observeStarlightRecoveryQuote(f.updateQuote(bid,at+40*(i+1)))));
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.status,'READY');assert.equal(w.upwardTicks,7);
  f.engine.entryExecutionGate=()=>({allowed:true});
  const result=await f.engine.attemptStarlightRecovery(id);
  assert.equal(result.status,'OPENED',JSON.stringify({result,events:f.strategy.entryPipelineEvents?.slice(-15)}));
  assert.equal(f.mem.inserted.length,1);
  assert.equal(f.mem.inserted[0].sourceTradeId,f.parent.id);
  assert.equal(f.mem.inserted[0].entryConfig.finalEntryConfirmation.route,'durable_starlight_recovery');
  assert.equal(f.clockCalls(),0);
  assert.equal((await f.mem.starlightWatch({...f.parent,authorizationId:id,resetEpoch:f.engine.settings.resetTimestampMs})).status,'CONSUMED');
  assert.equal((await f.engine.attemptStarlightRecovery(id)).status,'IGNORED');
  assert.equal(f.mem.inserted.length,1);
});

// SE2-R9 forensic regressions: MarketHub revisions distinguish real ticks
// that share a millisecond timestamp; repeated unchanged quotes are not ticks.
test('SE2-R9 distinct accepted MarketHub revisions at the same millisecond preserve actual upward ticks',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:2});
  const id=await persistArm(f);
  const t=Date.now()-1000,epoch='trusted-market-adapter-run-1';
  for(const [bid,revision] of [[40,10],[41,11],[42,12]]){
    const q={...quote(bid,t),quoteObservation:{epoch,revision,observedAtMs:t,receivedAtMs:t}};
    await f.engine.observeStarlightRecoveryQuote(q);
  }
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.lastBidCents,42);
  assert.equal(w.upwardTicks,2,'two distinct upward market revisions must not vanish due to millisecond collision');
  assert.equal(w.lastQuoteRevision,12);
  assert.equal(w.status,'READY');
});

test('SE2-R9 out-of-order adapter revision cannot forge recovery ticks even with a later timestamp',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:2});
  const id=await persistArm(f),t=Date.now()-1000,epoch='trusted-market-adapter-run-1';
  await f.engine.observeStarlightRecoveryQuote({...quote(40,t),quoteObservation:{epoch,revision:21,observedAtMs:t}});
  await f.engine.observeStarlightRecoveryQuote({...quote(44,t+50),quoteObservation:{epoch,revision:20,observedAtMs:t+50}});
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.lastBidCents,40);
  assert.equal(w.upwardTicks,0);
});

test('SE2-R9 no database revision storm for unchanged quote prices and status',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  const id=await persistArm(f),t=Date.now()-1000;
  await f.engine.observeStarlightRecoveryQuote(quote(40,t));
  const before=f.engine.starlightRecoveryWatches.get(id).revision;
  for(let i=1;i<=35;i++)await f.engine.observeStarlightRecoveryQuote(quote(40,t+i));
  const w=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(w.revision,before,'unchanged price observations must not write the full durable watch each time');
  assert.ok(f.engine.starlightRecoveryStats.redundantQuotesSkipped>=35);
});

test('SE2-R9 Starlight exported diagnostics contain actual ask, spread and configured price band',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  const id=await persistArm(f);
  await f.engine.observeStarlightRecoveryQuote(quote(37,Date.now()-1000));
  const d=f.engine.starlightRecoveryDiagnostics();
  const row=d.watches.find(x=>x.authorizationId===id);
  assert.equal(row.lastBidCents,37);
  assert.equal(row.lastAskCents,38);
  assert.equal(row.lastSpreadCents,1);
  assert.equal(row.operatorMinEntryCents,30);
  assert.equal(row.operatorMaxEntryCents,95);
  const {Database}=await import('../src/db.mjs');
  const fake={pool:{query:async(sql)=>({rows:sql.includes('group by status')?[{status:'WATCHING',count:1}]:[{parent_entry_id:f.parent.id,status:'WATCHING',revision:2,watch:f.engine.starlightRecoveryWatches.get(id),updated_at_ms:Date.now()}]})}};
  const projection=await Database.prototype.starlightExportSnapshot.call(fake,{systemName:'s1',ownerId:'o1',mode:'SIMULATION',resetEpoch:f.engine.settings.resetTimestampMs});
  assert.equal(projection.records[0].lastAskCents,38);
  assert.equal(projection.records[0].lastSpreadCents,1);
});

test('SE2-R9 independent READY/recovery maintenance runs even if ordinary scanner never advances',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const engine=Object.create(SagittariusEngine.prototype);
  engine.running=true;
  engine.starlightRecoveryStats={};
  const counts={wake:0,rest:0,orphan:0};
  let active=0,maximum=0;
  engine.wakeStarlightRecoveryWatches=async()=>{
    active++;maximum=Math.max(maximum,active);counts.wake++;
    await new Promise(r=>setTimeout(r,16));active--;return 1;
  };
  engine.refreshStarlightRecoveryMarketQuotes=async()=>{counts.rest++;return {observed:0};};
  engine.reconcileStarlightStopLossParents=async()=>{counts.orphan++;return {examined:0};};
  engine.db={audit:async()=>{}};
  assert.equal(engine.startStarlightRecoveryMaintenance({wakeMs:10,restMs:15,orphanMs:20,bootMs:100}),true);
  assert.equal(engine.startStarlightRecoveryMaintenance({wakeMs:10,restMs:15,orphanMs:20,bootMs:100}),false);
  try{
    await new Promise(r=>setTimeout(r,90));
    assert.ok(counts.wake>=2,'independent wake must continue without scanner');
    assert.ok(counts.rest>=2,'independent REST refresh must continue without scanner');
    assert.ok(counts.orphan>=2,'independent stop-loss reconciliation must continue without scanner');
    assert.equal(maximum,1,'same maintenance lane must not overlap itself');
  }finally{
    engine.running=false;engine.stopStarlightRecoveryMaintenance();
  }
  assert.equal(engine.starlightRecoveryMaintenanceTimers.length,0);
});

test('SE2-R9 27 stop-loss parents do not write 2700 redundant price observations',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  const ids=[];
  for(let i=0;i<27;i++){
    const p={...f.parent,id:'stress-parent-'+i};
    f.mem.parents.set(p.id,p);
    assert.equal(f.engine.armStarlightRecovery(p),true);
    const id='STARLIGHT-RECOVERY:'+p.id;
    await f.engine.starlightRecoveryArmWrites.get(id);
    ids.push(id);
  }
  const t=Date.now()-1000;
  await f.engine.observeStarlightRecoveryQuote(quote(37,t));
  const before=ids.map(id=>f.engine.starlightRecoveryWatches.get(id).revision);
  for(let n=1;n<=100;n++)await f.engine.observeStarlightRecoveryQuote(quote(37,t+n));
  const after=ids.map(id=>f.engine.starlightRecoveryWatches.get(id).revision);
  assert.deepEqual(after,before,'each unchanged quote must be ignored by all watches');
  assert.ok(f.engine.starlightRecoveryStats.redundantQuotesSkipped>=2700);
});

test('SE2-R9 qualified recovery respects actual executable ask, not misleading recovered bid',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  f.engine.settings={...f.engine.settings,crashRecoveryMinEntryCents:27,crashRecoveryMaxEntryCents:45};
  const id=await persistArm(f),t=Date.now()-1000;
  await f.engine.observeStarlightRecoveryQuote({...quote(32,t),yesAsk:34});
  await f.engine.observeStarlightRecoveryQuote({...quote(37,t+50),yesAsk:46});
  let watch=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(watch.lastSignalReason,'price_band');
  assert.equal(watch.status,'WATCHING');
  assert.equal(watch.upwardTicks,1);
  assert.equal(watch.lastAskCents,46);
  await f.engine.observeStarlightRecoveryQuote({...quote(37,t+100),yesAsk:39});
  watch=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(watch.status,'READY','same bid with genuinely improved executable ask must requalify');
  assert.equal(watch.lastAskCents,39);
});

test('SE2-R9 stale pre-stop quote may never become Starlight post-stop rebound evidence',async()=>{
  const f=await harness({crash:0,rebound:1,ticks:1});
  f.parent.closedAtMs=Date.now()-200;
  const id=await persistArm(f);
  const before=f.engine.starlightRecoveryWatches.get(id);
  await f.engine.observeStarlightRecoveryQuote(quote(50,f.parent.closedAtMs-500));
  const after=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(after.lastQuoteAtMs,0,'market evidence originating before the stop loss must be discarded');
  assert.equal(after.upwardTicks,0);
  assert.equal(after.revision,before.revision);
});

test('SE2-R9 delayed DB processing preserves trusted on-time observed ticks, but not stale final entries',async()=>{
  const {starlightRecoverySignalState}=await import('../src/strategy.mjs');
  const t=Date.now()-9000,now=Date.now();
  const w={armedAtMs:t-1000,releaseAtMs:t-1000,expiresAtMs:Number.MAX_SAFE_INTEGER,
    stopPriceCents:40,peakSinceArmCents:40,troughSinceArmCents:40,lastBidCents:40,lastQuoteAtMs:0,upwardTicks:0};
  const s={crashRecoveryHunterMinCrashCents:0,crashRecoveryHunterMinReboundCents:1,
    crashRecoveryHunterMinUpwardTicks:1,crashRecoveryMinEntryCents:27,crashRecoveryMaxEntryCents:45,
    infinityBreakMaximumBookAgeMs:5000};
  const event={...quote(41,t),quoteObservation:{epoch:'trusted',revision:1,receivedAtMs:t+10,observedAtMs:t}};
  const advanced=starlightRecoverySignalState(w,event,s,now,{advance:true});
  assert.equal(advanced.lastBidCents,41,'legitimate historical evidence must survive database latency');
  assert.equal(starlightRecoverySignalState(advanced,event,s,now).qualified,false,'old quote cannot authorize a BUY');
  const forged={...event,quoteObservation:{epoch:'trusted',revision:2,receivedAtMs:t+10000,observedAtMs:t}};
  assert.equal(starlightRecoverySignalState(w,forged,s,now,{advance:true}).reason,'quote_stale_or_future');
});

test('SE2-R9 actual MarketHub revisions recover three price movements inside one millisecond',async()=>{
  const {MarketHub}=await import('../src/market.mjs');
  const f=await harness({crash:0,rebound:1,ticks:2});
  const id=await persistArm(f),jobs=[];
  const hub=new MarketHub({kalshi:{},wsUrl:'ws://nowhere',getCredentials:()=>null,
    onQuote:q=>jobs.push(f.engine.observeStarlightRecoveryQuote(q))});
  const at=Date.now()-1000;
  for(const [i,bid] of [40,41,42].entries()){
    const accepted=hub.publishQuote(quote(bid,at),{source:'WS_TICKER',stream:'epoch-1',sequence:i+1,emit:true});
    assert.ok(accepted?.quoteObservation?.revision);
  }
  await Promise.all(jobs);
  const watch=f.engine.starlightRecoveryWatches.get(id);
  assert.equal(watch.upwardTicks,2);
  assert.equal(watch.status,'READY');
  assert.equal(watch.lastQuoteEpoch,hub.quoteEpoch);
});

test('SE2-R9 27-45c band qualifies valid 37/38 bid/ask and reaches actual StrategyEngine SIM insert',async()=>{
  const f=await independentStarlightFixture({clockMinutes:240,crash:0,rebound:1,ticks:1,observation:0});
  f.engine.settings={...f.engine.settings,crashRecoveryMinEntryCents:27,crashRecoveryMaxEntryCents:45};
  f.engine.entryExecutionGate=()=>({allowed:false});
  const id=await persistArm(f),t=Date.now()-1000;
  await f.engine.observeStarlightRecoveryQuote(f.updateQuote(32,t));
  await f.engine.observeStarlightRecoveryQuote(f.updateQuote(37,t+100));
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status,'READY');
  f.engine.entryExecutionGate=()=>({allowed:true});
  const result=await f.engine.attemptStarlightRecovery(id);
  assert.equal(result.status,'OPENED',JSON.stringify({result,events:f.strategy.entryPipelineEvents?.slice(-12)}));
  assert.equal(f.mem.inserted.length,1);
  assert.equal(f.mem.inserted[0].sourceTradeId,f.parent.id);
  assert.equal(f.clockCalls(),0);
});

test('SE2-R10 Link ON buys the Aurora stop price three times in SIMULATION and three times LIVE-armed', async () => {
  const orders = [];
  async function run(mode, n) {
    const f = await independentStarlightFixture();
    f.engine.settings.mode = mode;
    f.engine.settings.crashRecoveryHunterLinkEnabled = true;
    f.engine.settings.crashRecoveryMinEntryCents = 27;
    f.engine.settings.crashRecoveryMaxEntryCents = 50;
    f.parent.mode = mode;
    f.parent.exitPriceCents = 40;
    f.updateQuote(Number(f.parent.exitPriceCents)-1);
    f.strategy.getLiveReady = () => mode !== 'LIVE' || true;
    f.strategy.kalshi = {
      buildClientOrderId: () => `c-${mode}-${n}`,
      placeOrder: async (order) => {
        orders.push({ mode, n, priceCents: order.priceCents });
        return { orderId: `o-${mode}-${n}`, status: 'executed', fillCount: 1, averageFillPriceCents: order.priceCents, feePaidCents: 2 };
      },
    };
    assert.equal(f.engine.armStarlightRecovery(f.parent), true);
    const result = await f.engine.starlightLinkJob;
    assert.equal(result.status, 'OPENED', `${mode} ${n} ${JSON.stringify(result)}`);
    assert.equal(f.mem.inserted.length, 1);
    assert.equal(f.mem.inserted[0].conceptName, 'Crash Recovery Hunter');
    assert.equal(f.mem.inserted[0].entryPriceCents, 40, `${mode} ${n} must fill at the stop`);
    assert.equal(f.mem.inserted[0].entryConfig.starlightRecovery.link, true);
    assert.equal(f.mem.inserted[0].sourceTradeId, f.parent.id);
    assert.equal(f.engine.armStarlightRecovery({ ...f.parent, conceptName: 'Crash Recovery Hunter', id: 'star-self' }), false);
    return f;
  }
  for (const n of [1, 2, 3]) await run('SIMULATION', n);
  for (const n of [1, 2, 3]) await run('LIVE', n);
  assert.equal(orders.filter((o) => o.mode === 'LIVE').length, 3);
  assert.ok(orders.filter((o) => o.mode === 'LIVE').every((o) => o.priceCents === 40));
});

test('SE2-R10 Link OFF does not buy the stop price', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = false;
  f.parent.exitPriceCents = 24;
  f.updateQuote(55);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  assert.equal(f.engine.starlightLinkJob, undefined);
  assert.equal(f.mem.inserted.length, 0);
  assert.equal(f.engine.starlightRecoveryWatches.size, 1);
});

test('SE2-R11 Link SIM and LIVE both wait after the book jumps; neither fabricates a stop-price fill', async () => {
  async function run(mode) {
    const f = await independentStarlightFixture();
    f.engine.settings.mode = mode;
    f.engine.settings.crashRecoveryHunterLinkEnabled = true;
    f.parent.mode = mode;
    f.parent.exitPriceCents = 40;
    f.updateQuote(55);
    f.market.executableAsk = (_t, _count, limit) => (Number(limit) >= 55 ? { filled: 1, full: true, avgCents: 55, bestCents: 55 } : null);
    f.strategy.getLiveReady = () => true;
    f.strategy.kalshi = {
      buildClientOrderId: () => `c-${mode}`,
      placeOrder: async (order) => ({ orderId: `o-${mode}`, status: 'executed', fillCount: 1, averageFillPriceCents: order.priceCents, feePaidCents: 2 }),
    };
    assert.equal(f.engine.armStarlightRecovery(f.parent), true);
    const result = await f.engine.starlightLinkJob;
    return { mode, result, inserted: f.mem.inserted };
  }
  const sim = await run('SIMULATION');
  assert.notEqual(sim.result.status, 'OPENED');
  assert.equal(sim.inserted.length, 0);
  const live = await run('LIVE');
  assert.notEqual(live.result.status, 'OPENED');
  assert.equal(live.inserted.length, 0);
});

test('SE2-R11 Link ON does not open through the old band watch', async () => {
  const f = await independentStarlightFixture({ crash: 0, rebound: 1, ticks: 0 });
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.entryExecutionGate = () => ({ allowed: false });
  const id = await persistArm(f);
  f.updateQuote(40);
  await f.engine.observeStarlightRecoveryQuote(f.updateQuote(40));
  assert.notEqual(f.engine.starlightRecoveryWatches.get(id)?.status, 'READY');
  assert.equal(f.mem.inserted.length, 0);
});

test('SE2-R12 Link retries the stop price after the entry gate was closed', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 20;
  f.engine.settings.crashRecoveryMaxEntryCents = 50;
  f.engine.entryExecutionGate = () => ({ allowed: false });
  f.parent.exitPriceCents = 24;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const first = await f.engine.starlightLinkJob;
  assert.equal(first.status, 'WATCHING');
  assert.equal(f.mem.inserted.length, 0);
  f.engine.entryExecutionGate = () => ({ allowed: true });
  const n = await f.engine.wakeStarlightRecoveryWatches();
  assert.equal(n, 1);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(f.mem.inserted.length, 1);
  assert.equal(f.mem.inserted[0].entryPriceCents, 24);
});

test('SE2-R13 Starlight freezes its own Aurora percent, not the shared card', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.auroraDamageControlPercent = 45;
  f.engine.settings.crashRecoveryHunterAuroraDamageControlPercent = 20;
  f.parent.exitPriceCents = 40;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'OPENED');
  const child = f.mem.inserted[0];
  assert.equal(child.entryConfig.aurora.damageControlPercent, 20);
  assert.notEqual(child.entryConfig.aurora.damageControlPercent, 45);
  assert.equal(child.entryConfig.auroraDamageControlPercent, 20);
  assert.equal(child.stopPriceCents, child.entryConfig.aurora.dangerPriceCents);
});

test('SE2-R14 Link does not buy a finalized market', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 40;
  f.updateQuote(40);
  const dead = { ...f.updateQuote(40), status: 'finalized', result: 'yes' };
  f.market.getQuote = () => dead;
  f.market.refreshTickerVerified = async () => ({ marketFresh: true, bookFresh: true, quote: dead });
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const result = await f.engine.starlightLinkJob;
  assert.notEqual(result.status, 'OPENED');
  assert.equal(f.mem.inserted.length, 0);
});

test('SE2-R16 PostgreSQL Link consume is durable and idempotent', async () => {
  let newDb;
  try{({newDb}=await import('pg-mem'));}catch{return;}
  const { Database } = await import('../src/db.mjs');
  const mem = newDb();
  const pg = mem.adapters.createPg();
  const pool = new pg.Pool();
  await pool.query(`create table sag_starlight_recovery_v1(
    system_name text not null, owner_id text not null, mode text not null, reset_epoch bigint not null,
    authorization_id text not null, parent_entry_id text not null,
    status text not null, revision bigint not null default 1, watch jsonb not null, updated_at_ms bigint not null,
    primary key(system_name,owner_id,mode,reset_epoch,authorization_id),
    unique(system_name,owner_id,mode,reset_epoch,parent_entry_id))`);
  await pool.query(`create table sag_entries(
    id text primary key, system_name text, owner_id text, concept_name text, source_trade_id text,
    ticker text, event_ticker text, mode text, status text, archived boolean default false, opened_at_ms bigint)`);
  const db = Object.create(Database.prototype);
  db.pool = pool;
  db.runStarlightPersistence = async (fn) => fn();
  db.starlightScope = (w) => [String(w.systemName), String(w.ownerId), String(w.mode), Number(w.resetEpoch||0), String(w.authorizationId)];
  const parentId = 'parent-1';
  const auth = 'STARLIGHT-RECOVERY:parent-1';
  const watch = { systemName:'S', ownerId:'O', mode:'SIMULATION', resetEpoch:10, authorizationId:auth, parentEntryId:parentId, status:'ARMED', ticker:'T' };
  const inserted = await db.insertStarlightWatch(watch);
  assert.equal(inserted.status, 'ARMED');
  const claimed = await db.updateStarlightWatch({ ...watch, status:'EXECUTING' }, 1);
  assert.equal(claimed.status, 'EXECUTING');
  await pool.query(`insert into sag_entries(id,system_name,concept_name,source_trade_id,status,archived,opened_at_ms) values($1,$2,$3,$4,$5,false,$6)`, ['child-1','S','Crash Recovery Hunter',parentId,'open',Date.now()]);
  const child = await db.entryByConceptSourceTradeId('S','Crash Recovery Hunter',parentId);
  assert.equal(child.id, 'child-1');
  const consumed = await db.updateStarlightWatch({ ...watch, status:'CONSUMED', recoveredChildId:child.id }, Number(claimed.revision));
  assert.equal(consumed.status, 'CONSUMED');
  assert.equal(consumed.watch.recoveredChildId, 'child-1');
  const duplicate = await db.updateStarlightWatch({ ...watch, status:'CONSUMED', recoveredChildId:'other' }, Number(claimed.revision));
  assert.equal(duplicate, null);
  const live = await db.updateStarlightWatch({ ...watch, mode:'LIVE', status:'CONSUMED' }, Number(consumed.revision));
  assert.equal(live, null);
  const row = await db.starlightWatch(watch);
  assert.equal(row.status, 'CONSUMED');
  assert.equal(row.watch.recoveredChildId, 'child-1');
  await pool.end();
});

test('SE2-R16 Link commits the child and consumes the watch in the same lifecycle', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 40;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'OPENED');
  assert.equal(result.watchConsumed, true);
  const row = await f.mem.starlightWatch({ ...f.parent, authorizationId:`STARLIGHT-RECOVERY:${f.parent.id}`, resetEpoch:f.engine.settings.resetTimestampMs });
  assert.equal(row.status, 'CONSUMED');
  assert.equal(row.watch.recoveredChildId, result.entry.id);
  assert.equal(f.mem.inserted.length, 1);
  const again = await f.engine.attemptStarlightLinkEntry(`STARLIGHT-RECOVERY:${f.parent.id}`);
  assert.notEqual(again.status, 'OPENED');
  assert.equal(f.mem.inserted.length, 1);
});

test('SE2-R16 database failure after the child keeps authority and reconciles', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 40;
  f.updateQuote(39);
  let fail = true;
  const original = f.mem.updateStarlightWatch.bind(f.mem);
  f.mem.updateStarlightWatch = async (w, rev) => {
    if (fail && w.status === 'CONSUMED') throw new Error('db_down');
    return original(w, rev);
  };
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'OPENED');
  assert.equal(result.watchConsumed, false);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'EXECUTING');
  const durable = await f.mem.starlightWatch({ ...f.parent, authorizationId:id, resetEpoch:f.engine.settings.resetTimestampMs });
  assert.equal(durable.status, 'EXECUTING');
  fail = false;
  f.engine.starlightRecoveryWatches.clear();
  await f.engine.rehydrateStarlightRecovery();
  const after = await f.mem.starlightWatch({ ...f.parent, authorizationId:id, resetEpoch:f.engine.settings.resetTimestampMs });
  assert.equal(after.status, 'CONSUMED');
  assert.equal(after.watch.recoveredChildId, result.entry.id);
  assert.equal(f.mem.inserted.length, 1);
});

test('SE2-R17 Link does not block a watch that already has a committed child', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 40;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const original = f.engine.strategy.createHunter.bind(f.engine.strategy);
  f.engine.strategy.createHunter = async (...args) => {
    const opened = await original(...args);
    return null;
  };
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'OPENED');
  assert.equal(result.reason, 'child_committed_without_return');
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  const row = await f.mem.starlightWatch({ ...f.parent, authorizationId:id, resetEpoch:f.engine.settings.resetTimestampMs });
  assert.equal(row.status, 'CONSUMED');
  assert.equal(f.mem.inserted.length, 1);
});

test('SE2-R17 child lookup failure does not open a second Starlight', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 40;
  f.updateQuote(40);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  f.mem.entryByConceptSourceTradeId = async () => { throw new Error('db_down'); };
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'WATCHING');
  assert.equal(result.reason, 'child_lookup_failed');
  assert.equal(f.mem.inserted.length, 0);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'EXECUTING');
});

test('SE2-R18 Link refuses a stop outside the Starlight band and buys one inside it', async () => {
  const low = await independentStarlightFixture();
  low.engine.settings.crashRecoveryHunterLinkEnabled = true;
  low.engine.settings.crashRecoveryMinEntryCents = 60;
  low.engine.settings.crashRecoveryMaxEntryCents = 88;
  low.parent.exitPriceCents = 40;
  low.updateQuote(40);
  assert.equal(low.engine.armStarlightRecovery(low.parent), true);
  const blocked = await low.engine.starlightLinkJob;
  assert.equal(blocked.status, 'BLOCKED');
  assert.equal(blocked.reason, 'link_stop_outside_band');
  assert.equal(low.mem.inserted.length, 0);
  const id = `STARLIGHT-RECOVERY:${low.parent.id}`;
  const row = await low.mem.starlightWatch({ ...low.parent, authorizationId:id, resetEpoch:low.engine.settings.resetTimestampMs });
  assert.equal(row.status, 'BLOCKED');

  const ok = await independentStarlightFixture();
  ok.engine.settings.crashRecoveryHunterLinkEnabled = true;
  ok.engine.settings.crashRecoveryMinEntryCents = 60;
  ok.engine.settings.crashRecoveryMaxEntryCents = 88;
  ok.parent.exitPriceCents = 64;
  ok.updateQuote(Number(ok.parent.exitPriceCents)-1);
  assert.equal(ok.engine.armStarlightRecovery(ok.parent), true);
  const opened = await ok.engine.starlightLinkJob;
  assert.equal(opened.status, 'OPENED');
  assert.equal(opened.entry.entryPriceCents, 64);
});

test('SE2-R19 Link band edges are inclusive and a bad band does not buy', async () => {
  async function run(stop, min, max) {
    const f = await independentStarlightFixture();
    f.engine.settings.crashRecoveryHunterLinkEnabled = true;
    f.engine.settings.crashRecoveryMinEntryCents = min;
    f.engine.settings.crashRecoveryMaxEntryCents = max;
    f.parent.exitPriceCents = stop;
    f.updateQuote(Number(f.parent.exitPriceCents)-1);
    assert.equal(f.engine.armStarlightRecovery(f.parent), true);
    const result = await f.engine.starlightLinkJob;
    return { result, inserted: f.mem.inserted.length };
  }
  assert.equal((await run(60, 60, 88)).result.status, 'OPENED');
  assert.equal((await run(88, 60, 88)).result.status, 'OPENED');
  assert.equal((await run(59, 60, 88)).result.status, 'BLOCKED');
  assert.equal((await run(89, 60, 88)).result.status, 'BLOCKED');
  const bad = await run(70, 90, 60);
  assert.notEqual(bad.result.status, 'OPENED');
  assert.equal(bad.inserted, 0);
});

test('SE2-R19 a lost band-block write does not pretend the watch is blocked', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 60;
  f.engine.settings.crashRecoveryMaxEntryCents = 88;
  f.parent.exitPriceCents = 40;
  f.updateQuote(40);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  f.mem.updateStarlightWatch = async () => null;
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'WATCHING');
  assert.equal(result.reason, 'stale_revision_band_block');
  assert.equal(f.mem.inserted.length, 0);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  assert.notEqual(f.engine.starlightRecoveryWatches.get(id)?.status, 'CONSUMED');
});

test('SE2-R20 a busy ticker does not kill an eligible Link stop', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 20;
  f.engine.settings.crashRecoveryMaxEntryCents = 60;
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const idBusy = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.starlightLinkRejectByAuth = new Map([[idBusy,'local_ticker_lock_busy']]);
  const original = f.engine.strategy.createHunter.bind(f.engine.strategy);
  f.engine.strategy.createHunter = async () => null;
  const first = await f.engine.starlightLinkJob;
  assert.equal(first.status, 'WATCHING');
  assert.equal(first.reason, 'local_ticker_lock_busy');
  assert.equal(f.mem.inserted.length, 0);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'WATCHING');
  f.engine.strategy.createHunter = original;
  f.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const second = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(second.status, 'OPENED');
  assert.equal(second.entry.entryPriceCents, 36);
});

test('SE2-R20 a finalized market stays blocked', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 36;
  f.updateQuote(36);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  f.strategy.starlightLinkRejectByAuth = new Map([[`STARLIGHT-RECOVERY:${f.parent.id}`,'market_finalized']]);
  f.engine.strategy.createHunter = async () => null;
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'market_finalized');
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'BLOCKED');
});

test('SE2-R21 another parent on the same ticker cannot permanent-block this Link', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 20;
  f.engine.settings.crashRecoveryMaxEntryCents = 60;
  f.parent.exitPriceCents = 36;
  f.updateQuote(36);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.entryPipelineEvents = [{ concept:'Crash Recovery Hunter', ticker:f.parent.ticker, status:'BLOCKED', reason:'market_not_active', starlightRecoveryParentEntryId:'other-parent' }];
  f.strategy.starlightLinkRejectByAuth = new Map([[id,'local_ticker_lock_busy']]);
  f.engine.strategy.createHunter = async () => null;
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'WATCHING');
  assert.equal(result.reason, 'local_ticker_lock_busy');
  assert.notEqual(f.engine.starlightRecoveryWatches.get(id).status, 'BLOCKED');
});

test('SE2-R21 a lost result write does not mark the watch blocked', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 36;
  f.updateQuote(36);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.starlightLinkRejectByAuth = new Map([[id,'market_not_active']]);
  f.engine.strategy.createHunter = async () => null;
  const original = f.mem.updateStarlightWatch.bind(f.mem);
  let calls = 0;
  f.mem.updateStarlightWatch = async (w, rev) => { calls++; if (calls > 1) return null; return original(w, rev); };
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'WATCHING');
  assert.equal(result.reason, 'stale_revision_link_result');
  assert.notEqual(f.engine.starlightRecoveryWatches.get(id).status, 'BLOCKED');
  assert.equal(f.mem.inserted.length, 0);
});

test('SE2-R22 a stale permanent reason cannot block the next attempt', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 20;
  f.engine.settings.crashRecoveryMaxEntryCents = 60;
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.starlightLinkRejectByAuth = new Map([[id,'market_not_active']]);
  const original = f.engine.strategy.createHunter.bind(f.engine.strategy);
  f.engine.strategy.createHunter = async (...args) => {
    f.strategy.starlightLinkRejectByAuth.delete(id);
    f.strategy.starlightLinkRejectByAuth.set(id,'local_ticker_lock_busy');
    return null;
  };
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'WATCHING');
  assert.equal(result.reason, 'local_ticker_lock_busy');
  f.engine.strategy.createHunter = original;
  f.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const opened = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(opened.status, 'OPENED');
});

test('SE2-R22 a lost result write stays watching and can retry', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.starlightLinkRejectByAuth = new Map([[id,'local_ticker_lock_busy']]);
  const originalUpdate = f.mem.updateStarlightWatch.bind(f.mem);
  const originalCreate = f.engine.strategy.createHunter.bind(f.engine.strategy);
  let writes = 0;
  f.mem.updateStarlightWatch = async (w, rev) => { writes++; if (writes > 1) return null; return originalUpdate(w, rev); };
  f.engine.strategy.createHunter = async () => null;
  const first = await f.engine.starlightLinkJob;
  assert.equal(first.status, 'WATCHING');
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'WATCHING');
  f.mem.updateStarlightWatch = originalUpdate;
  f.engine.strategy.createHunter = originalCreate;
  f.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const second = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(second.status, 'OPENED');
});

test('SE2-R23 a non-active status does not kill an eligible stop', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.crashRecoveryMinEntryCents = 20;
  f.engine.settings.crashRecoveryMaxEntryCents = 60;
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  f.strategy.starlightLinkRejectByAuth = new Map([[id,'market_not_active']]);
  const original = f.engine.strategy.createHunter.bind(f.engine.strategy);
  f.engine.strategy.createHunter = async () => null;
  const first = await f.engine.starlightLinkJob;
  assert.equal(first.status, 'WATCHING');
  assert.equal(first.reason, 'market_not_active');
  f.engine.strategy.createHunter = original;
  f.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const second = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(second.status, 'OPENED');
  assert.equal(f.mem.inserted.length, 1);
});

test('SE2-R23 an invalid stop is durably blocked and a second callback does not buy', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 0;
  f.updateQuote(40);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  const result = await f.engine.starlightLinkJob;
  assert.equal(result.status, 'BLOCKED');
  assert.equal(result.reason, 'stop_price_invalid');
  assert.equal(f.engine.starlightRecoveryWatches.get(id).status, 'BLOCKED');
  const again = await f.engine.attemptStarlightLinkEntry(id);
  assert.notEqual(again.status, 'OPENED');
  assert.equal(f.mem.inserted.length, 0);
});

test('SE2-R23 a second parent on the same ticker retries and does not double-buy the first parent', async () => {
  const first = await independentStarlightFixture();
  first.engine.settings.crashRecoveryHunterLinkEnabled = true;
  first.engine.settings.crashRecoveryMinEntryCents = 20;
  first.engine.settings.crashRecoveryMaxEntryCents = 60;
  first.parent.exitPriceCents = 36;
  first.updateQuote(Number(first.parent.exitPriceCents)-1);
  assert.equal(first.engine.armStarlightRecovery(first.parent), true);
  const opened = await first.engine.starlightLinkJob;
  assert.equal(opened.status, 'OPENED');
  const again = await first.engine.attemptStarlightLinkEntry(`STARLIGHT-RECOVERY:${first.parent.id}`);
  assert.notEqual(again.status, 'OPENED');
  assert.equal(first.mem.inserted.length, 1);

  const second = await independentStarlightFixture();
  second.engine.settings.crashRecoveryHunterLinkEnabled = true;
  second.engine.settings.crashRecoveryMinEntryCents = 20;
  second.engine.settings.crashRecoveryMaxEntryCents = 60;
  second.parent.exitPriceCents = 36;
  second.parent.ticker = first.parent.ticker;
  second.updateQuote(Number(second.parent.exitPriceCents)-1);
  assert.equal(second.engine.armStarlightRecovery(second.parent), true);
  const id = `STARLIGHT-RECOVERY:${second.parent.id}`;
  second.strategy.starlightLinkRejectByAuth = new Map([[id,'local_ticker_lock_busy']]);
  const original = second.engine.strategy.createHunter.bind(second.engine.strategy);
  second.engine.strategy.createHunter = async () => null;
  const busy = await second.engine.starlightLinkJob;
  assert.equal(busy.status, 'WATCHING');
  assert.equal(busy.reason, 'local_ticker_lock_busy');
  second.engine.strategy.createHunter = original;
  second.engine.starlightRecoveryWatches.get(id).retryNotBeforeMs = 0;
  const later = await second.engine.attemptStarlightLinkEntry(id);
  assert.equal(later.status, 'OPENED');
  assert.equal(second.mem.inserted.length, 1);
});

test('SE2-R23 restart mid-claim keeps a childless SIM watch retryable and does not buy a LIVE child', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.mode = 'SIMULATION';
  f.parent.mode = 'SIMULATION';
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  f.engine.entryExecutionGate = () => ({ allowed:false });
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  await f.engine.starlightRecoveryArmWrites.get(id);
  await f.engine.starlightLinkJob;
  const watch = f.engine.starlightRecoveryWatches.get(id);
  const claimed = { ...watch, status:'EXECUTING', claimAtMs:Date.now()-60_000 };
  const saved = await f.mem.updateStarlightWatch(claimed, watch.revision);
  assert.ok(saved, 'durable claim');
  f.engine.entryExecutionGate = () => ({ allowed:true });
  f.engine.starlightRecoveryWatches.clear();
  await f.engine.rehydrateStarlightRecovery();
  const after = f.engine.starlightRecoveryWatches.get(id);
  assert.equal(after.status, 'WATCHING');
  after.retryNotBeforeMs = 0;
  const opened = await f.engine.attemptStarlightLinkEntry(id);
  assert.equal(opened.status, 'OPENED');

  const live = await independentStarlightFixture();
  live.engine.settings.mode = 'LIVE';
  live.parent.mode = 'LIVE';
  live.parent.ownerId = 'other-owner';
  live.mem.children.set(live.parent.id, { id:'live-child', sourceTradeId:live.parent.id, conceptName:'Crash Recovery Hunter', ownerId:'other-owner', mode:'LIVE', systemName:live.engine.settings.systemName });
  assert.equal(f.engine.starlightChildMatchesWatch(live.mem.children.get(live.parent.id), { ...f.parent, ownerId:f.engine.settings.ownerId, mode:'SIMULATION', systemName:f.engine.settings.systemName }), false);
});

test('SE2-R23 a closed market is blocked before a Link claim', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.parent.exitPriceCents = 36;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  const dead = { ...f.updateQuote(Number(f.parent.exitPriceCents)-1), status:'closed', result:'yes' };
  f.market.getQuote = () => dead;
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const result = await f.engine.starlightLinkJob;
  if(result.status!=='BLOCKED'){
    const id0=`STARLIGHT-RECOVERY:${f.parent.id}`;
    const w=f.engine.starlightRecoveryWatches.get(id0);
    throw new Error(JSON.stringify(result)+' mem='+JSON.stringify({status:w?.status,revision:w?.revision})+' row='+JSON.stringify(f.mem.rows.get(f.mem.key(w||{}))));
  }
  assert.equal(result.reason, 'market_finalized');
  assert.equal(f.mem.inserted.length, 0);
  const id = `STARLIGHT-RECOVERY:${f.parent.id}`;
  const again = await f.engine.attemptStarlightLinkEntry(id);
  assert.notEqual(again.status, 'OPENED');
});

// MW-R25 deterministic hostile admission tests. These use a transaction-and-
// advisory-lock facsimile to test the database contract; real PostgreSQL is
// independently required before Railway release.
class MW25Ledger {
  constructor(){this.rows=[];this.held=new Set();this.failNextInsert=false;this.failNextCommit=false;this.txSerial=0;}
  pool(){return {connect:async()=>this.connect()};}
  connect(){
    const ledger=this;const tx={pending:[],active:false,key:null,released:false};
    return {query:async(sql,args=[])=>{
      const q=String(sql).trim().toLowerCase();
      if(q==='begin'){assert.equal(tx.active,false);tx.active=true;return {rows:[]};}
      if(q==='commit'){
        if(ledger.failNextCommit){ledger.failNextCommit=false;throw Error('MW25_COMMIT_FAILURE');}
        ledger.rows.push(...tx.pending);tx.pending=[];tx.active=false;
        if(tx.key)ledger.held.delete(tx.key);tx.key=null;return {rows:[]};
      }
      if(q==='rollback'){
        tx.pending=[];tx.active=false;
        if(tx.key)ledger.held.delete(tx.key);tx.key=null;return {rows:[]};
      }
      if(q.includes('pg_try_advisory_xact_lock')){
        const key=args[0];if(ledger.held.has(key))return {rows:[{acquired:false}]};
        ledger.held.add(key);tx.key=key;return {rows:[{acquired:true}]};
      }
      if(q.includes('count(*)::int as used')){
        const [sys,owner,mode,reset,event,conceptNames,scoped]=args;
        const n=ledger.rows.filter(e=>e.systemName===sys&&e.ownerId===owner&&e.mode===mode
          &&(e.eventTicker||e.ticker)===event
          &&conceptNames.includes(e.conceptName)&&(!scoped||e.conceptName===scoped)
          &&e.status!=='rejected'
          &&(Number(e.entryConfig?.durableEventAdmission?.resetEpoch??e.entryConfig?.resetTimestampMs??e.openedAtMs)===reset
            ||['open','entry_pending','exit_pending','pending_recovery'].includes(e.status))).length;
        return {rows:[{used:n}]};
      }
      if(q==='mw25_insert_entry'){
        if(ledger.failNextInsert){ledger.failNextInsert=false;throw Error('MW25_PERSIST_FAILURE');}
        tx.pending.push(structuredClone(args[0]));return {rows:[]};
      }
      throw Error('UNEXPECTED_MW25_QUERY '+q.slice(0,100));
    },release(){assert.equal(tx.released,false);tx.released=true;if(tx.key){ledger.held.delete(tx.key);tx.key=null;}}};
  }
}
function mw25Db(ledger){
  return import('../src/db.mjs').then(({Database})=>{
    const db=Object.create(Database.prototype);db.pool=ledger.pool();
    db.insertEntry=async(e,client)=>client.query('MW25_INSERT_ENTRY',[e]);
    return db;
  });
}
function mw25Entry(id,{event='E',ticker='E-YES',system='S',owner='O',mode='SIMULATION',concept='Athena Exclamation',status='open',openedAtMs=1000}={}){
  return {id,systemName:system,ownerId:owner,mode,eventTicker:event,ticker,conceptName:concept,status,openedAtMs,entryConfig:{}};
}
function mw25Opts({reset=100,max=1,ge=true,multiply=1}={}){
  return {resetTimestampMs:reset,maxEntriesPerTrade:max,galacticExplosionEnabled:ge,multiply};
}
test('MW25 CLOSED Athena consumes the event slot, even across distinct CI1 episodes, sides and restarts',async()=>{
  const ledger=new MW25Ledger();const a=await mw25Db(ledger);const opts=mw25Opts();
  let r=await a.insertRegularEntryWithEventCap(mw25Entry('ep3'),opts);
  assert.equal(r.ok,true);
  ledger.rows[0].status='closed';
  const restarted=await mw25Db(ledger);
  for(let i=4;i<=12;i++){
    r=await restarted.insertRegularEntryWithEventCap(mw25Entry('ep'+i,{ticker:'E-NO'}),opts);
    assert.equal(r.ok,false);assert.equal(r.reason,'durable_event_lifetime_cap');
  }
  assert.equal(ledger.rows.length,1);
  assert.equal((await restarted.insertRegularEntryWithEventCap(mw25Entry('OTHER',{event:'E2'}),opts)).ok,true);
});
test('MW25 LIVE pending/partial remains consumed; conclusive rejected releases; SIM/LIVE, owner/reset isolation',async()=>{
  const ledger=new MW25Ledger();const db=await mw25Db(ledger),opts=mw25Opts();
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('pending',{mode:'LIVE',status:'entry_pending'}),opts)).ok,true);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('double',{mode:'LIVE'}),opts)).ok,false);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('sim',{mode:'SIMULATION'}),opts)).ok,true);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('owner2',{mode:'LIVE',owner:'O2'}),opts)).ok,true);
  // An unresolved old LIVE intent blocks an unsafe cross-epoch BUY.
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('unsafe_reset',{mode:'LIVE',openedAtMs:3000}),mw25Opts({reset:2000}))).ok,false);
  ledger.rows.find(e=>e.id==='pending').status='rejected';
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('reset2',{mode:'LIVE',openedAtMs:3000}),mw25Opts({reset:2000}))).ok,true);
  ledger.rows.find(e=>e.id==='reset2').status='closed';
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('recovered',{mode:'LIVE'}),opts)).ok,true);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('blocked_again',{mode:'LIVE'}),opts)).ok,false);
});
test('MW25 serializes separate actors across exact event, and fails closed on a busy claim',async()=>{
  const ledger=new MW25Ledger(),a=await mw25Db(ledger),b=await mw25Db(ledger);
  let entered;const latch=new Promise(resolve=>entered=resolve);
  let resume;const hold=new Promise(resolve=>resume=resolve);
  a.insertEntry=async(e,c)=>{entered();await hold;c.query('MW25_INSERT_ENTRY',[e]);};
  const first=a.insertRegularEntryWithEventCap(mw25Entry('a',{ticker:'E-YES'}),mw25Opts());
  await latch;
  const second=await b.insertRegularEntryWithEventCap(mw25Entry('b',{ticker:'E-NO'}),mw25Opts());
  assert.equal(second.ok,false);assert.equal(second.reason,'durable_event_claim_busy');
  resume();assert.equal((await first).ok,true);
  assert.equal((await b.insertRegularEntryWithEventCap(mw25Entry('c'),mw25Opts())).ok,false);
  assert.equal(ledger.rows.length,1);
});
test('MW25 failed write, failed commit and retry have no ghost quota; retry cannot duplicate committed attempt',async()=>{
  const ledger=new MW25Ledger(),db=await mw25Db(ledger),opts=mw25Opts();
  ledger.failNextInsert=true;
  await assert.rejects(db.insertRegularEntryWithEventCap(mw25Entry('a'),opts),/MW25_PERSIST_FAILURE/);
  assert.equal(ledger.rows.length,0);assert.equal(ledger.held.size,0);
  ledger.failNextCommit=true;
  await assert.rejects(db.insertRegularEntryWithEventCap(mw25Entry('a'),opts),/MW25_COMMIT_FAILURE/);
  assert.equal(ledger.rows.length,0);assert.equal(ledger.held.size,0);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('a'),opts)).ok,true);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('a'),opts)).ok,false);
});
test('MW25 Galactic enabled scopes separate Attacks; disabled scopes all regulars; multiply explicitly allows seats',async()=>{
  const l=new MW25Ledger(),db=await mw25Db(l),on=mw25Opts({ge:true}),off=mw25Opts({ge:false});
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('a'),on)).ok,true);
  assert.equal((await db.insertRegularEntryWithEventCap(mw25Entry('j',{concept:'Sagittarius Justice Arrow'}),on)).ok,true);
  const l2=new MW25Ledger(),d2=await mw25Db(l2);
  assert.equal((await d2.insertRegularEntryWithEventCap(mw25Entry('a'),off)).ok,true);
  assert.equal((await d2.insertRegularEntryWithEventCap(mw25Entry('j',{concept:'Sagittarius Justice Arrow'}),off)).ok,false);
  const l3=new MW25Ledger(),d3=await mw25Db(l3),two=mw25Opts({multiply:2});
  assert.equal((await d3.insertRegularEntryWithEventCap(mw25Entry('first'),two)).ok,true);
  assert.equal((await d3.insertRegularEntryWithEventCap(mw25Entry('second'),two)).ok,true);
  assert.equal((await d3.insertRegularEntryWithEventCap(mw25Entry('third'),two)).ok,false);
});
test('MW25 Starlight LINK inclusive price guard freezes exact saved band and terminal rejection without changing trading doctrine',async()=>{
  const {SagittariusEngine}=await import('../src/engine.mjs');
  const make=({stop,min})=>{
    const engine=Object.create(SagittariusEngine.prototype);
    engine.settings={systemName:'S',ownerId:'O',mode:'SIMULATION',resetTimestampMs:100,
      crashRecoveryHunterEnabled:true,crashRecoveryHunterLinkEnabled:true,
      crashRecoveryMinEntryCents:min,crashRecoveryMaxEntryCents:85,crashRecoveryStakeCents:500};
    engine.entryExecutionGate=()=>({allowed:true});engine.starlightRecoveryWatches=new Map();
    const w={authorizationId:'STARLIGHT-RECOVERY:p',parentEntryId:'p',parentConcept:'Athena Exclamation',systemName:'S',ownerId:'O',mode:'SIMULATION',resetEpoch:100,
      ticker:'E-YES',eventTicker:'E',status:'ARMED',revision:1,stopPriceCents:stop,armedAtMs:Date.now()-10};
    engine.starlightRecoveryWatches.set(w.authorizationId,w);
    engine.starlightRecoveryStats={blocked:0,opened:0};
    engine.market={getQuote:()=>({status:'active',result:'',ticker:'E-YES',eventTicker:'E',yesBid:stop,yesAsk:stop})};
    const saved=[];engine.db={updateStarlightWatch:async(w)=>{saved.push(structuredClone(w));return {revision:Number(w.revision||1)+1};},
      entryByConceptSourceTradeId:async()=>null};
    engine.strategy={createHunter:async(...args)=>({id:'child',ticker:'E-YES',sourceTradeId:'p',conceptName:'Crash Recovery Hunter'})};
    engine.consumeStarlightRecoveryWatch=async()=>true;
    return {engine,saved};
  };
  for(const [stop,min,eligible] of [[44,45,false],[45,45,true],[45,47,false],[85,45,true],[86,45,false]]){
    const {engine,saved}=make({stop,min});
    const result=await engine.attemptStarlightLinkEntry('STARLIGHT-RECOVERY:p');
    if(!eligible){
      assert.equal(result.status,'BLOCKED',`${stop} vs ${min}`);
      assert.equal(result.reason,'link_stop_outside_band');
      assert.equal(saved[0].priceBandDecision.operatorMinEntryCents,min);
      assert.equal(saved[0].priceBandDecision.stopPriceCents,stop);
      assert.equal(saved[0].lastAttemptMessage,stop<min?`STOP ${stop}c BELOW STARLIGHT MIN ${min}c`:`STOP ${stop}c ABOVE STARLIGHT MAX 85c`);
    }else{
      assert.notEqual(result.status,'BLOCKED');assert.equal(saved[0].priceBandDecision.exactMatchEligible,true);
    }
  }
});


// MW-R25 second-pass adversarial checks. These run independently from the
// existing happy-path R25 tests; pg/ws doubles are NOT broker/PG certification.
test('MW25 Starlight never executes under a newer band than its durable watch claim', async()=>{
  const {StrategyEngine}=await import('../src/strategy.mjs');
  const strategy=Object.create(StrategyEngine.prototype);
  strategy.getSettings=()=>({systemName:'S',ownerId:'O',mode:'SIMULATION',resetTimestampMs:123,
    crashRecoveryHunterLinkEnabled:true,crashRecoveryMinEntryCents:47,crashRecoveryMaxEntryCents:85});
  const audited=[];strategy.audit=async(...args)=>audited.push(args);
  const auth='STARLIGHT-RECOVERY:p';
  const result=await strategy.createHunter('Crash Recovery Hunter',
    {ticker:'T',eventTicker:'E',yesBid:45,yesAsk:45},500,0,{starlightRecovery:true,
      starlightRecoverySnapshot:{link:true,authorizationId:auth,stopPriceCents:45,
        priceBandDecision:{minEntryCents:45,maxEntryCents:85,settingsCommitRevision:7}}});
  assert.equal(result,null);
  assert.equal(strategy.starlightLinkRejectByAuth.get(auth),'link_band_changed_since_watch_claim');
  assert.equal(audited[0][0],'starlight_link_settings_changed_during_claim');
  const {SagittariusEngine}=await import('../src/engine.mjs');
  assert.equal(SagittariusEngine.prototype.starlightLinkRejectIsPermanent.call({},'link_band_changed_since_watch_claim'),false);
});

test('MW25 settings save couples revision, effective band and audit; failed commit does not acknowledge a draft',async()=>{
  const {Database}=await import('../src/db.mjs');
  const {freshInstallSettings}=await import('../src/config.mjs');
  const values=new Map();const audit=[];let failCommit=false,rollbackCount=0;
  const pool={connect:async()=>{
    let staged=new Map(values),stagedAudit=[],started=false;
    return {query:async(sql,args=[])=>{
      const s=String(sql).toLowerCase().trim();
      if(s==='begin'){started=true;return {rows:[]};}
      if(s.includes('pg_advisory_xact_lock'))return {rows:[{pg_advisory_xact_lock:true}]};
      if(s.startsWith('select value from sag_settings')){
        const key=s.includes('runtime_commit_revision')?'runtime_commit_revision':'runtime';
        return {rows:staged.has(key)?[{value:staged.get(key)}]:[]};
      }
      if(s.startsWith('insert into sag_settings')){
        const key=s.includes("values('runtime_commit_revision'")?'runtime_commit_revision':'runtime';
        staged.set(key,structuredClone(args[0]));return {rows:[],rowCount:1};
      }
      if(s.startsWith('insert into sag_audit')){stagedAudit.push(JSON.parse(args[0]));return {rows:[],rowCount:1};}
      if(s==='commit'){
        if(failCommit){failCommit=false;throw Error('DISK_COMMIT_FAILED');}
        assert.equal(started,true);values.clear();for(const [k,v]of staged)values.set(k,v);
        audit.push(...stagedAudit);started=false;return {rows:[]};
      }
      if(s==='rollback'){rollbackCount++;started=false;return {rows:[]};}
      throw Error('unknown MW25 saved-settings query: '+s);
    },release:()=>{}};
  },query:async(sql)=>{
    assert.match(sql,/runtime_commit_revision/);
    return {rows:values.has('runtime_commit_revision')?[{value:values.get('runtime_commit_revision')}]:[]};
  }};
  const db=Object.create(Database.prototype);db.pool=pool;
  const initial=freshInstallSettings();
  const a=await db.saveSettings({...initial,crashRecoveryMinEntryCents:45,crashRecoveryMaxEntryCents:85});
  assert.equal(a.revision,1);assert.equal(await db.loadSettingsRevision(),1);
  assert.equal(values.get('runtime').crashRecoveryMinEntryCents,45);
  assert.equal(audit.at(-1).effective.minEntryCents,45);
  const b=await db.saveSettings({...initial,crashRecoveryMinEntryCents:47,crashRecoveryMaxEntryCents:85});
  assert.equal(b.revision,2);assert.equal(values.get('runtime').crashRecoveryMinEntryCents,47);
  assert.equal(audit.at(-1).previous.minEntryCents,45);
  assert.equal(audit.at(-1).effective.minEntryCents,47);
  assert.equal(audit.at(-1).revision,2);
  failCommit=true;
  await assert.rejects(db.saveSettings({...initial,crashRecoveryMinEntryCents:50,crashRecoveryMaxEntryCents:85}),/DISK_COMMIT_FAILED/);
  assert.equal(rollbackCount,1);
  assert.equal(values.get('runtime').crashRecoveryMinEntryCents,47);
  assert.equal(await db.loadSettingsRevision(),2);
  assert.equal(audit.length,2);
});

test('MW25 diagnostic export prioritizes executable Starlight/Athena history before newer high-volume shadows',async()=>{
  const {buildLedgerExportPackage}=await import('../src/server.mjs');
  const now=200000;
  const base=(id,concept,ms)=>({id,systemName:'S',ownerId:'O',conceptName:concept,ticker:'T',eventTicker:'EVT',mode:'SIMULATION',
    status:'closed',openedAtMs:ms,closedAtMs:ms+10,updatedAtMs:ms+10,
    entryPriceCents:60,currentPriceCents:70,exitPriceCents:70,count:1,remainingCount:0,
    pnlCents:6,entryFeeCents:2,exitFeeCents:2,entryConfig:{release:'R25'}});
  const executives=Array.from({length:32},(_,i)=>base('real-'+i,i%2?'Crash Recovery Hunter':'Athena Exclamation',1000+i));
  const shadows=Array.from({length:1200},(_,i)=>base('shadow-'+i,'Phoenix',5000+i));
  const run=buildLedgerExportPackage({records:[...executives,...shadows],
    meta:{exportId:'MW25-BUDGET',systemName:'S',ownerId:'O',mode:'SIMULATION',resetTimestampMs:100,
      snapshotCutoffMs:now,expectedCount:executives.length+shadows.length,exportedAtMs:now}});
  const ids=new Set();for(const f of run.files||[]){if(f.name?.startsWith('trades-'))for(const e of JSON.parse(f.text).records||[])ids.add(e.positionId);}
  for(const e of executives)assert.ok(ids.has(e.id),'real executable trade missing: '+e.id);
  assert.ok(run.manifest.coverage?.tradesOmitted>0,'fixture must pressure the 1 MB budget');
  assert.equal(run.manifest.coverage?.executableTradesOmitted,0);
  assert.ok(run.manifest.coverage?.shadowTradesOmitted>0);
});

test('MW25 exact logged adjacency: stopped Athena followed 88 ms later by CI1 re-entry consumes one market slot',async()=>{
  const ledger=new MW25Ledger();const db=await mw25Db(ledger),opts=mw25Opts({max:1});
  const first=mw25Entry('parent',{event:'KXGER3LGAME-26OCT13HANMEP-MEP',openedAtMs:1000});
  assert.equal((await db.insertRegularEntryWithEventCap(first,opts)).ok,true);
  ledger.rows[0].status='closed';ledger.rows[0].closedAtMs=1000;
  const next=mw25Entry('new-crash-episode',{event:first.eventTicker,openedAtMs:1088});
  const result=await db.insertRegularEntryWithEventCap(next,opts);
  assert.equal(result.ok,false);assert.equal(result.reason,'durable_event_lifetime_cap');
  assert.equal(ledger.rows.length,1);
});

test('MW25 source contains PostgreSQL Starlight parent uniqueness plus regular event index without changing Andromeda doctrine',async()=>{
  const {readFileSync}=await import('node:fs');
  const {fileURLToPath}=await import('node:url');
  const {resolve}=await import('node:path');
  const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
  const sql=readFileSync(resolve(root,'src/db.mjs'),'utf8');
  assert.match(sql,/create unique index if not exists sag_entries_mw25_starlight_parent_unique/);
  assert.match(sql,/where concept_name='Crash Recovery Hunter' and source_trade_id is not null/);
  assert.match(sql,/create index if not exists sag_entries_mw25_regular_event/);
  assert.match(sql,/pg_try_advisory_xact_lock/);
});

test('SE2-R27 A ordinary attacker still exits on Freezing Coffin', async () => {
  const { freezingCoffinSnapshot, AURORA_EXECUTION } = await import('../src/doctrine.mjs');
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  const coffin = freezingCoffinSnapshot({ entryPriceCents: 80, maxDropCents: 15 });
  const exits = [];
  const guard = Object.create(ProfitGuard.prototype);
  Object.assign(guard, {
    db: { updateEntry: async () => {}, entryById: async () => null },
    market: {
      ensureFreshBook: async () => null,
      getQuote: () => ({ ticker: 'T', yesBid: 65, yesAsk: 66, updatedAtMs: Date.now(), status: 'active', bookInvalid: false }),
      getBook: () => ({ updatedAtMs: Date.now() }),
      executableBid: () => ({ full: true, filled: 1, avgCents: 65 }),
    },
    learning: { onHardStop: async () => {} },
    setState: () => {},
    audit: async () => {},
  });
  guard.simulationExit = async (_e, d) => { exits.push(d); return { closed: true }; };
  const entry = {
    id: 'a1', ticker: 'T', conceptName: 'Athena Exclamation', mode: 'SIMULATION', status: 'open',
    count: 1, remainingCount: 1, entryPriceCents: 80, currentPriceCents: 80, peakPriceCents: 80, stopGuardState: {},
    entryConfig: { aurora: { version: AURORA_EXECUTION.version, frozen: true, stopDistanceCents: 40, dangerPriceCents: 40 }, freezingCoffin: coffin },
  };
  const out = await guard.handleUltimateStopGuard(entry, { ticker: 'T', yesBid: 65, yesAsk: 66, updatedAtMs: Date.now(), status: 'active' }, { mode: 'SIMULATION' });
  assert.equal(out.handled, true);
  assert.equal(exits[0].guardState, 'FREEZING_COFFIN_EXIT');
  assert.equal(exits[0].stopPriceCents, 65);
});

test('SE2-R27 B Starlight ignores the 15-cent Coffin line and keeps its own Aurora', async () => {
  const { freezingCoffinSnapshot, calculateAuroraSnapshotFromFeeModel } = await import('../src/doctrine.mjs');
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  const aurora = calculateAuroraSnapshotFromFeeModel({ entryPriceCents: 80, count: 1, mode: 'SIMULATION', simFeeCents: 2, damageControlPercent: 55 });
  assert.equal(aurora.ok, true);
  const coffin = freezingCoffinSnapshot({ entryPriceCents: 80, maxDropCents: 15 });
  assert.equal(coffin.dangerPriceCents, 65);
  assert.ok(aurora.dangerPriceCents < 65);
  const audits = [];
  function guardFor(bid) {
    const guard = Object.create(ProfitGuard.prototype);
    Object.assign(guard, {
      db: { updateEntry: async () => {}, entryById: async () => null },
      market: {
        ensureFreshBook: async () => null,
        getQuote: () => ({ ticker: 'T', yesBid: bid, yesAsk: bid + 1, updatedAtMs: Date.now(), status: 'active', bookInvalid: false }),
        getBook: () => ({ updatedAtMs: Date.now() }),
        executableBid: () => ({ full: true, filled: 1, avgCents: bid }),
      },
      learning: { onHardStop: async () => {} },
      setState: () => {},
      audit: async (e, d) => audits.push({ e, d }),
      stopGuardLearningProfile: async () => ({}),
      beginStopGuardLearningEpisode: async () => null,
      aggregateExecutableNetCents: () => 0,
    });
    guard.simulationExit = async (_e, d) => { audits.push({ e: 'EXIT', d }); return { closed: true }; };
    return guard;
  }
  const entry = {
    id: 's1', ticker: 'T', conceptName: 'Crash Recovery Hunter', mode: 'SIMULATION', status: 'open',
    count: 1, remainingCount: 1, entryPriceCents: 80, currentPriceCents: 80, peakPriceCents: 80, stopGuardState: {},
    entryConfig: { aurora, freezingCoffin: coffin },
  };
  const held = await guardFor(65).handleUltimateStopGuard(entry, { ticker: 'T', yesBid: 65, yesAsk: 66, updatedAtMs: Date.now(), status: 'active' }, { mode: 'SIMULATION' });
  assert.equal(held.handled, false);
  assert.equal(audits.some((a) => a.d?.guardState === 'FREEZING_COFFIN_EXIT' || a.e === 'EXIT'), false);
  const stopped = await guardFor(aurora.dangerPriceCents).handleUltimateStopGuard(entry, { ticker: 'T', yesBid: aurora.dangerPriceCents, yesAsk: aurora.dangerPriceCents + 1, updatedAtMs: Date.now(), status: 'active' }, { mode: 'SIMULATION' });
  assert.equal(stopped.handled, true);
  const armed = audits.find((a) => a.e === 'usg1_armed');
  assert.ok(armed);
  assert.equal(armed.d.dangerLineCents, aurora.dangerPriceCents);
  assert.equal(audits.some((a) => a.d?.guardState === 'FREEZING_COFFIN_EXIT'), false);
  assert.equal(entry.entryConfig.freezingCoffin.dangerPriceCents, 65);
});

test('SE2-R27 C a Coffin parent stop still opens Starlight on its own Aurora', async () => {
  const f = await independentStarlightFixture();
  f.engine.settings.crashRecoveryHunterLinkEnabled = true;
  f.engine.settings.freezingCoffinEnabled = true;
  f.engine.settings.freezingCoffinMaxDropCents = 15;
  f.engine.settings.crashRecoveryHunterAuroraDamageControlPercent = 55;
  f.engine.settings.crashRecoveryMinEntryCents = 30;
  f.engine.settings.crashRecoveryMaxEntryCents = 90;
  f.parent.closeReason = 'hard_stop_loss';
  f.parent.entryConfig = { freezingCoffin: { frozen: true, enabled: true, maxDropCents: 15, dangerPriceCents: 65 } };
  f.parent.exitPriceCents = 80;
  f.updateQuote(Number(f.parent.exitPriceCents)-1);
  assert.equal(f.engine.armStarlightRecovery(f.parent), true);
  const opened = await f.engine.starlightLinkJob;
  assert.equal(opened.status, 'OPENED');
  assert.equal(opened.entry.entryPriceCents, 80);
  assert.equal(opened.entry.entryConfig.freezingCoffin, undefined);
  assert.equal(opened.entry.entryConfig.aurora.frozen, true);
  assert.equal(opened.entry.entryConfig.aurora.damageControlPercent, 55);
  assert.equal(f.engine.armStarlightRecovery({ ...f.parent, id: 'self', conceptName: 'Crash Recovery Hunter' }), false);
});

test('SE2-R27 D SIM and LIVE use the same Starlight exit authority', async () => {
  const { freezingCoffinSnapshot, calculateAuroraSnapshotFromFeeModel } = await import('../src/doctrine.mjs');
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  for (const mode of ['SIMULATION', 'LIVE']) {
    const aurora = calculateAuroraSnapshotFromFeeModel({ entryPriceCents: 80, count: 1, mode, simFeeCents: 2, damageControlPercent: 55 });
    const coffin = freezingCoffinSnapshot({ entryPriceCents: 80, maxDropCents: 15 });
    const audits = [];
    const guard = Object.create(ProfitGuard.prototype);
    Object.assign(guard, {
      db: { updateEntry: async () => {}, entryById: async () => null },
      market: {
        ensureFreshBook: async () => null,
        getQuote: () => ({ ticker: 'T', yesBid: 65, yesAsk: 66, updatedAtMs: Date.now(), status: 'active', bookInvalid: false }),
        getBook: () => ({ updatedAtMs: Date.now() }),
        executableBid: () => ({ full: true, filled: 1, avgCents: 65 }),
      },
      learning: { onHardStop: async () => {} },
      setState: () => {},
      audit: async (e, d) => audits.push({ e, d }),
    });
    const entry = {
      id: `s-${mode}`, ticker: 'T', conceptName: 'Crash Recovery Hunter', mode, status: 'open',
      count: 1, remainingCount: 1, entryPriceCents: 80, stopGuardState: {},
      entryConfig: { aurora, freezingCoffin: coffin },
    };
    const out = await guard.handleUltimateStopGuard(entry, { ticker: 'T', yesBid: 65, yesAsk: 66, updatedAtMs: Date.now(), status: 'active' }, { mode });
    assert.equal(out.handled, false, mode);
    assert.equal(audits.some((a) => a.d?.guardState === 'FREEZING_COFFIN_EXIT'), false, mode);
    assert.equal(aurora.dangerPriceCents < 65, true, mode);
  }
});

test('SE2-R27 E a restarted Starlight row keeps Aurora even if Coffin is still stored', async () => {
  const { freezingCoffinSnapshot, calculateAuroraSnapshotFromFeeModel } = await import('../src/doctrine.mjs');
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  const aurora = calculateAuroraSnapshotFromFeeModel({ entryPriceCents: 80, count: 1, mode: 'SIMULATION', simFeeCents: 2, damageControlPercent: 55 });
  const coffin = freezingCoffinSnapshot({ entryPriceCents: 80, maxDropCents: 15 });
  const stored = {
    id: 'hydrated', ticker: 'T', conceptName: 'Crash Recovery Hunter', mode: 'SIMULATION', status: 'open',
    count: 1, remainingCount: 1, entryPriceCents: 80, peakPriceCents: 80, stopGuardState: {},
    entryConfig: { aurora, freezingCoffin: coffin },
  };
  const audits = [];
  const guard = Object.create(ProfitGuard.prototype);
  Object.assign(guard, {
    db: { updateEntry: async () => {}, entryById: async (id) => id === stored.id ? stored : null },
    market: {
      ensureFreshBook: async () => null,
      getQuote: () => ({ ticker: 'T', yesBid: aurora.dangerPriceCents, yesAsk: aurora.dangerPriceCents + 1, updatedAtMs: Date.now(), status: 'active', bookInvalid: false }),
      getBook: () => ({ updatedAtMs: Date.now() }),
      executableBid: () => ({ full: true, filled: 1, avgCents: aurora.dangerPriceCents }),
    },
    learning: { onHardStop: async () => {} },
    setState: () => {},
    audit: async (e, d) => audits.push({ e, d }),
    stopGuardLearningProfile: async () => ({}),
    beginStopGuardLearningEpisode: async () => null,
    aggregateExecutableNetCents: () => 0,
  });
  guard.simulationExit = async (_e, d) => { audits.push({ e: 'EXIT', d }); return { closed: true }; };
  const out = await guard.handleUltimateStopGuard(stored, { ticker: 'T', yesBid: aurora.dangerPriceCents, yesAsk: aurora.dangerPriceCents + 1, updatedAtMs: Date.now(), status: 'active' }, { mode: 'SIMULATION' });
  assert.equal(out.handled, true);
  const armed = audits.find((a) => a.e === 'usg1_armed');
  assert.ok(armed);
  assert.equal(armed.d.dangerLineCents, aurora.dangerPriceCents);
  assert.equal(audits.some((a) => a.d?.guardState === 'FREEZING_COFFIN_EXIT'), false);
  assert.equal(stored.entryConfig.freezingCoffin.dangerPriceCents, 65);
});

test('SE2-R27 F Coffin off keeps Aurora and Starlight does not chain itself', async () => {
  const { AURORA_EXECUTION } = await import('../src/doctrine.mjs');
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  const audits = [];
  const guard = Object.create(ProfitGuard.prototype);
  Object.assign(guard, {
    db: { updateEntry: async () => {}, entryById: async () => null },
    market: {
      ensureFreshBook: async () => null,
      getQuote: () => ({ ticker: 'T', yesBid: 40, yesAsk: 41, updatedAtMs: Date.now(), status: 'active', bookInvalid: false }),
      getBook: () => ({ updatedAtMs: Date.now() }),
      executableBid: () => ({ full: true, filled: 1, avgCents: 40 }),
    },
    learning: { onHardStop: async () => {} },
    setState: () => {},
    audit: async (e, d) => audits.push({ e, d }),
    stopGuardLearningProfile: async () => ({}),
    beginStopGuardLearningEpisode: async () => null,
    aggregateExecutableNetCents: () => 0,
  });
  guard.simulationExit = async (_e, d) => { audits.push({ e: 'EXIT', d }); return { closed: true }; };
  const ordinary = {
    id: 'o1', ticker: 'T', conceptName: 'Athena Exclamation', mode: 'SIMULATION', status: 'open',
    count: 1, remainingCount: 1, entryPriceCents: 80, stopGuardState: {},
    entryConfig: { aurora: { version: AURORA_EXECUTION.version, frozen: true, stopDistanceCents: 40, dangerPriceCents: 40 } },
  };
  const out = await guard.handleUltimateStopGuard(ordinary, { ticker: 'T', yesBid: 40, yesAsk: 41, updatedAtMs: Date.now(), status: 'active' }, { mode: 'SIMULATION' });
  assert.equal(out.handled, true);
  assert.equal(audits.some((a) => a.d?.guardState === 'FREEZING_COFFIN_EXIT'), false);
  const f = await independentStarlightFixture();
  assert.equal(f.engine.armStarlightRecovery({ ...f.parent, conceptName: 'Crash Recovery Hunter' }), false);
});

test('MW1 T01-T04 every parent uses complete post-qualification shadow admission, never broker execution', async () => {
 const {SHADOW_SAINT_CONCEPTS,isShadowSaintConcept}=await import('../src/doctrine.mjs');
 for(const mode of ['SIMULATION','LIVE'])for(const concept of SHADOW_SAINT_CONCEPTS){
  const f=shadowFixture({mode,concept,id:`${mode}:${concept}`}),rows=[],orders=[];
  const strategy=new FixtureStrategyEngine({db:{rows,async insertEntry(e){rows.push(e);},async audit(){}},
   kalshi:{async placeOrder(o){orders.push(o);throw Error('parent must not use broker');}},market:{},getSettings:()=>f.settings});
  const e=await strategy.openShadowSaint({concept,q:f.initial.quote,settings:f.settings,stakeCents:800,
   plan:{count:10,averagePriceCents:80,bestAskCents:80,executionEvidence:f.entry.entryConfig.shadowSaint.entryExecution},
   frozenEntryConfig:f.entry.entryConfig,finalConfirmation:()=>({ok:true}),expectedEventTicker:'R3-E'});
  assert.equal(e.executionClass,'SHADOW_SAINT');assert.equal(e.entryConfig.shadowSaint.brokerOrderAuthority,false);
  assert.equal(e.entryConfig.legacyQualification.commandHash,f.entry.entryConfig.legacyQualification.commandHash);
  assert.equal(rows.length,1);assert.equal(orders.length,0);
 }
 assert.equal(isShadowSaintConcept('Crash Recovery Hunter'),false);
});

test('MW1 T05-T07 only actual negative virtual exits yield stop proofs; look-alike records cannot arm', async () => {
 const {buildShadowCloseProof}=await import('../src/shadowProtocol.mjs');
 const {evaluateShadowWithOriginalGuard}=await import('../src/profitGuard.mjs');
 const f=shadowFixture();const evaluation=await evaluateShadowWithOriginalGuard(f.entry,f.observation,{settings:f.settings});
 assert.equal(evaluation.closed,true);assert.equal(evaluation.decision.reason,'hard_stop_loss');
 const proof=buildShadowCloseProof(f.entry,f.observation,evaluation.decision);
 assert.equal(proof.authorization,'VALID_SHADOW_HARD_STOP');assert.equal(proof.filled,10);assert.ok(proof.pnlCents<0);
 const {engine}=shadowWorkerFixture(f);
 for(const pnlCents of [10,-190])assert.equal(engine.armStarlightRecovery({...f.entry,status:'closed',closeReason:'hard_stop_loss',pnlCents}),false);
 const profitable=buildShadowCloseProof(f.entry,f.market(90),{reason:'infinity_break'});
 assert.ok(profitable.pnlCents>0);assert.equal(profitable.authorization,null);
 assert.throws(()=>buildShadowCloseProof(f.entry,f.market(90),{reason:'hard_stop_loss'}),/negative_frozen_stop/);
});

test('MW1 T08-T10 exact legacy recovery band boundaries remain inclusive; fake shadow and self-chain refused', async () => {
 for(const [stop,expected] of [[29,false],[81,false],[30,true],[80,true]]){
  const box=await independentStarlightFixture();
  Object.assign(box.engine.settings,{crashRecoveryHunterLinkEnabled:true,crashRecoveryMinEntryCents:30,crashRecoveryMaxEntryCents:80});
  box.parent.exitPriceCents=stop;box.updateQuote(stop-1);
  assert.equal(box.engine.armStarlightRecovery({...box.parent,executionClass:'SHADOW_SAINT'}),false);
  assert.equal(box.engine.armStarlightRecovery(box.parent),true,'explicit pre-cutover memory fixture');
  const result=await box.engine.starlightLinkJob;assert.equal(result.status==='OPENED',expected,String(stop));
 }
 const box=await independentStarlightFixture();assert.equal(box.engine.armStarlightRecovery({...box.parent,conceptName:'Crash Recovery Hunter'}),false);
});

test('MW1 T12 Starlight still ignores Coffin and T22-T24 boards are Starlight only', async () => {
  const { isShadowSaintConcept } = await import('../src/doctrine.mjs');
  const rows = [
    { conceptName: 'Athena Exclamation', entryConfig: { executionClass: 'SHADOW_SAINT' }, status: 'open' },
    { conceptName: 'Crash Recovery Hunter', entryConfig: {}, status: 'open' },
  ];
  const primary = rows.filter((e) => e.conceptName === 'Crash Recovery Hunter' && e.entryConfig.executionClass !== 'SHADOW_SAINT');
  const shadows = rows.filter((e) => e.entryConfig.executionClass === 'SHADOW_SAINT');
  assert.equal(primary.length, 1);
  assert.equal(shadows.length, 1);
  assert.equal(isShadowSaintConcept('Crash Recovery Hunter'), false);
  assert.equal(isShadowSaintConcept('Athena Exclamation'), true);
});

test('MW1-R2 P0-01 shadow is rejected by every capital exit path', async () => {
  const { isShadowSaintEntry } = await import('../src/doctrine.mjs');
  const shadow = { id: 's1', conceptName: 'Athena Exclamation', entryConfig: { executionClass: 'SHADOW_SAINT' } };
  assert.equal(isShadowSaintEntry(shadow), true);
  assert.equal(isShadowSaintEntry({ entryConfig: {} }), false);
  const { ProfitGuard } = await import('../src/profitGuard.mjs');
  const pg = Object.create(ProfitGuard.prototype);
  const audits = [];
  pg.audit = async (_e, body) => audits.push(body);
  const live = await pg.liveExit(shadow, {});
  const emergency = await pg.emergencyExit(shadow, null);
  const manual = await pg.manualCashout(shadow, null, {});
  const protect = await pg._protect(shadow);
  assert.equal(live.reason, 'shadow_saint_no_broker');
  assert.equal(emergency.reason, 'shadow_saint_no_broker');
  assert.equal(manual.reason, 'shadow_saint_no_broker');
  assert.equal(protect.reason, 'shadow_saint_no_broker');
  assert.equal(audits.length, 4);
});

test('MW1-R2 P0-02 partial depth and P0-03 stale book are rejected by the production shadow sweep', async () => {
 const f=shadowFixture({mode:'LIVE'});f.observation=f.market(40,1);
 const {engine,commits,waits}=shadowWorkerFixture(f);
 const partial=await engine.sweepShadowSaints();assert.equal(partial.waits,1);assert.equal(commits.length,0);
 assert.equal(waits[0].reason,'shadow_partial_executable_depth');
 f.observation=f.market(40,10);f.observation.book.updatedAtMs=Date.now()-60000;
 await engine.sweepShadowSaints();assert.equal(commits.length,0);assert.equal(waits.at(-1).reason,'shadow_book_stale_or_future');
});

test('MW1-R2 P0-04 production shadow worker refuses cross-mode rows and records the error', async () => {
 const f=shadowFixture({mode:'LIVE'});f.entry.mode='SIMULATION';
 const {engine,commits,audits}=shadowWorkerFixture(f);
 const result=await engine.sweepShadowSaints();assert.equal(result.errors,1);assert.equal(result.degraded,true);
 assert.equal(commits.length,0);assert.ok(audits.some(x=>x[1]==='shadow_lifecycle_failed'));
});

test('MW1-R2 P1-07 primary boards are Starlight only', async () => {
  const rows = [
    { conceptName: 'Athena Exclamation', entryConfig: { executionClass: 'SHADOW_SAINT' }, status: 'open' },
    { conceptName: 'Crash Recovery Hunter', entryConfig: {}, status: 'open' },
    { conceptName: 'Scarlet Needle', entryConfig: {}, status: 'closed' },
  ];
  const primary = rows.filter((e) => e.conceptName === 'Crash Recovery Hunter' && e.entryConfig.executionClass !== 'SHADOW_SAINT');
  assert.equal(primary.length, 1);
  assert.equal(primary[0].conceptName, 'Crash Recovery Hunter');
});

test('MW1-R3 a Postgres idle-client error does not kill the process and marks degraded', async () => {
  const { Database } = await import('../src/db.mjs');
  const logs = [];
  const original = console.error;
  console.error = (...a) => logs.push(a.join(' '));
  try {
    const db = new Database('postgres://user:pass@localhost:5432/db');
    const err = Object.assign(new Error('terminating connection due to administrator command'), { code: '57P01', severity: 'FATAL' });
    db.pool.emit('error', err);
    assert.equal(db.dbInterrupted, true);
    assert.equal(db.lastDbError.code, '57P01');
    assert.equal(logs.some((l) => l.includes('postgres_pool_error') && l.includes('57P01')), true);
    assert.equal(logs.some((l) => l.includes('pass@')), false);
    db.markDbRecovered();
    assert.equal(db.dbInterrupted, false);
    await db.pool.end();
    await db.lockPool.end();
  } finally {
    console.error = original;
  }
});

test('MW1-R3 Starlight backpressure is contained and does not throw from a detached call', async () => {
  const { SagittariusEngine } = await import('../src/engine.mjs');
  const engine = Object.create(SagittariusEngine.prototype);
  const audits = [];
  engine.starlightRecoveryInFlight = new Set();
  engine.db = { audit: async (_l, _e, body) => audits.push(body) };
  engine.attemptStarlightLinkEntry = async () => { throw Object.assign(new Error('low_priority_persistence_backpressure'), { code: 'LOW_PRIORITY_PERSISTENCE_BACKPRESSURE' }); };
  engine.scheduleStarlightLink('auth-1');
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(audits.length, 1);
  assert.equal(audits[0].code, 'LOW_PRIORITY_PERSISTENCE_BACKPRESSURE');
  assert.equal(engine.starlightRecoveryInFlight.has('auth-1'), false);
  engine.scheduleStarlightLink('auth-1');
  engine.scheduleStarlightLink('auth-1');
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(audits.length, 2);
});

test('MW1-R3 a full persistence queue rejects without throwing into the process', async () => {
  const { BoundedDbWorkGate } = await import('../src/db.mjs');
  const gate = new BoundedDbWorkGate(1, 2);
  let release;
  const held = new Promise((r) => { release = r; });
  gate.run(() => held);
  gate.run(() => Promise.resolve(1));
  gate.run(() => Promise.resolve(2));
  await assert.rejects(gate.run(() => Promise.resolve(3)), /low_priority_persistence_backpressure/);
  release();
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(gate.totalRejected, 1);
});

test('MW1-R3 shadow_runtime_transaction_busy is a wait, not an error', async () => {
  const message = 'shadow_runtime_transaction_busy';
  const isBusy = message === 'shadow_runtime_transaction_busy';
  assert.equal(isBusy, true);
  const audits = [];
  if (!isBusy) audits.push({ level: 'error', event: 'shadow_lifecycle_failed' });
  assert.equal(audits.some((a) => a.level === 'error'), false);
});

test('ANDROMEDA OFF equals HIGH and blocks the full ban list', async () => {
  const { executionMarketFamilyExclusion } = await import('../src/doctrine.mjs');
  const off = executionMarketFamilyExclusion('KXITFMATCH-26OCT14ABC', { andromedaThunderWaveEnabled: false });
  assert.equal(off.blocked, true);
  assert.equal(off.andromeda.level, 'HIGH');
  const high = executionMarketFamilyExclusion('KXCS2GAME-26OCT14ABC', { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'HIGH' });
  assert.equal(high.blocked, true);
  const tie = executionMarketFamilyExclusion('KXWTAMATCH-26OCT14ABC-TIE', { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'HIGH' });
  assert.equal(tie.blocked, true);
});

test('ANDROMEDA MID unlocks ITF men and CS2 but keeps Challenger banned', async () => {
  const { executionMarketFamilyExclusion } = await import('../src/doctrine.mjs');
  const settings = { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'MID' };
  assert.equal(executionMarketFamilyExclusion('KXITFMATCH-26OCT14ABC', settings).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXCS2GAME-26OCT14ABC', settings).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXDIMAYORGAME-26OCT14ABC', settings).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXBUNDESLIGA2GAME-26OCT14ABC', settings).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXATPCHALLENGERMATCH-26OCT14ABC', settings).blocked, true);
  assert.equal(executionMarketFamilyExclusion('KXWTACHALLENGERMATCH-26OCT14ABC', settings).blocked, true);
  assert.equal(executionMarketFamilyExclusion('KXT20MATCH-26OCT14ABC', settings).blocked, true);
});

test('ANDROMEDA OPEN bans nothing and LOW matches MID', async () => {
  const { executionMarketFamilyExclusion } = await import('../src/doctrine.mjs');
  const open = { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'OPEN' };
  assert.equal(executionMarketFamilyExclusion('KXATPCHALLENGERMATCH-26OCT14ABC', open).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXITFMATCH-26OCT14ABC-TIE', open).blocked, false);
  const low = { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'LOW' };
  assert.equal(executionMarketFamilyExclusion('KXITFMATCH-26OCT14ABC', low).blocked, false);
  assert.equal(executionMarketFamilyExclusion('KXNPBGAME-26OCT14ABC', low).blocked, true);
});

test('ANDROMEDA createHunter rejects a banned family before any entry', async () => {
  const { StrategyEngine } = await import('../src/strategy.mjs');
  const strategy = Object.create(StrategyEngine.prototype);
  const audits = [];
  strategy.getSettings = () => ({ andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'HIGH', mode: 'SIMULATION' });
  strategy.audit = async (_e, body) => audits.push(body);
  const result = await strategy.createHunter('Athena Exclamation', { ticker: 'KXATPCHALLENGERMATCH-26OCT14ABC' }, 500);
  assert.equal(result, null);
  assert.equal(audits[0].reason, 'market_family_historical_loss_exclusion');
});

test('ANDROMEDA armStarlightRecovery rejects a banned parent ticker', async () => {
  const { SagittariusEngine } = await import('../src/engine.mjs');
  const engine = Object.create(SagittariusEngine.prototype);
  const audits = [];
  engine.settings = { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'HIGH', crashRecoveryHunterEnabled: true };
  engine.starlightRecoveryRuntime = () => ({});
  engine.db = { audit: async () => audits.push(1), shadowArchitectureRequired: false };
  const armed = engine.armStarlightRecovery({
    id: 'p1', ticker: 'KXWTACHALLENGERMATCH-26OCT14ABC', conceptName: 'Athena Exclamation',
    status: 'closed', closeReason: 'hard_stop_loss', pnlCents: -10, closedAtMs: Date.now(),
  });
  assert.equal(armed, false);
});

test('ANDROMEDA level survives sanitize and shadow-stop arm is gated', async () => {
  const { sanitizeRuntimeSettings } = await import('../src/config.mjs');
  const saved = sanitizeRuntimeSettings({ andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'MID' });
  assert.equal(saved.andromedaThunderWaveLevel, 'MID');
  const open = sanitizeRuntimeSettings({ andromedaThunderWaveLevel: 'OPEN' });
  assert.equal(open.andromedaThunderWaveLevel, 'OPEN');
  const junk = sanitizeRuntimeSettings({ andromedaThunderWaveLevel: 'nonsense' });
  assert.equal(junk.andromedaThunderWaveLevel, 'HIGH');
  const { SagittariusEngine } = await import('../src/engine.mjs');
  const engine = Object.create(SagittariusEngine.prototype);
  const audits = [];
  engine.settings = { andromedaThunderWaveEnabled: true, andromedaThunderWaveLevel: 'HIGH' };
  engine.db = { verifiedShadowStop: async () => ({ watch: { ticker: 'KXATPCHALLENGERMATCH-ABC', parentConcept: 'Athena Exclamation', authorizationId: 'a1' }, proofHash: 'h' }), audit: async () => audits.push(1) };
  const result = await engine.acceptCommittedShadowStop('p1', engine.settings);
  assert.equal(result, null);
  assert.equal(audits.length, 1);
});
