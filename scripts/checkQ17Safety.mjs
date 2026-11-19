#!/usr/bin/env node
import assert from 'node:assert/strict';
import {env,RELEASE,EDITABLE_NUMERIC_SETTINGS,EDITABLE_BOOLEAN_SETTINGS,normalizeStartupExecutionMode,sanitizeRuntimeSettings,preserveExecutionArm} from '../src/config.mjs';
import {Q17_SIM_ONLY,Q17_RELEASE,Q17_DATABASE_ACK,assertQ17IsolatedDatabase,q17SimSettings,q17AssertPublicMarketRequest,q17ForbiddenLiveExecution} from '../src/q17Profile.mjs';
import {KalshiClient} from '../src/kalshi.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
assert.equal(Q17_SIM_ONLY,true);
assert.equal(env.allowLiveTrading,false);
assert.equal(env.defaultEngineMode,'SIMULATION');
const sim=q17SimSettings({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true,lightningPlasmaEnabled:true});
assert.equal(sim.mode,'SIMULATION'); assert.equal(sim.liveArmed,false);assert.equal(sim.liveOwnerAuthorized,false);assert.equal(sim.lightningPlasmaEnabled,true);
const boot=normalizeStartupExecutionMode({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true},true);
assert.equal(boot.settings.mode,'SIMULATION');assert.equal(boot.settings.liveArmed,false);
const sanitize=sanitizeRuntimeSettings({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true});
assert.equal(sanitize.mode,'SIMULATION');assert.equal(sanitize.liveArmed,false);assert.equal(sanitize.liveOwnerAuthorized,false);
assert.equal(preserveExecutionArm({mode:'LIVE',liveArmed:true},{mode:'LIVE'}).mode,'SIMULATION');
assert.throws(()=>assertQ17IsolatedDatabase({databaseUrl:'postgresql://x:y@localhost:5432/q17',ack:''}),/q17_isolated_database_ack_required/);
assert.equal(assertQ17IsolatedDatabase({databaseUrl:'postgresql://x:y@localhost:5432/q17',ack:Q17_DATABASE_ACK}),true);
for(const method of ['POST','PATCH','PUT','DELETE'])assert.throws(()=>q17AssertPublicMarketRequest(method,'/portfolio/events/orders'),/q17_broker_mutation/);
for(const path of ['/portfolio/balance','/portfolio/orders','/account/limits','/historical/orders','/bad-url'])assert.throws(()=>q17AssertPublicMarketRequest('GET',path),/forbidden/);
for(const path of ['/markets','/markets/X/orderbook','/events/ABC','/milestones','/live_data/milestone/123'])assert.equal(q17AssertPublicMarketRequest('GET',path),true);
const broker=new KalshiClient({},'https://example.invalid/trade-api/v2');
let called=0;const prior=globalThis.fetch;globalThis.fetch=()=>{called++;throw new Error('NETWORK MUST NOT RUN');};
try{
 for(const method of ['POST','DELETE','PATCH'])await assert.rejects(()=>broker.request(method,'/portfolio/events/orders'),/q17_broker_mutation/);
 await assert.rejects(()=>broker.fetchOnce('POST','https://example.invalid','/portfolio/events/orders',{},100),/q17_broker_mutation/);
 await assert.rejects(()=>broker.placeOrder({ticker:'INVALID',action:'buy',count:1,priceCents:45}),/q17_broker_order_submission_forbidden/);
 await assert.rejects(()=>q17ForbiddenLiveExecution(),/q17_live_execution_removed/);
 assert.equal(called,0,'Q17 broker mutations must not reach fetch');
}finally{globalThis.fetch=prior;}
await assert.rejects(()=>SagittariusEngine.prototype.setMode.call({},'LIVE','ENABLE LIVE TRADING'),/q17_sim_only_mode_immutable/);
import {readFileSync} from 'node:fs';

// Q17-R2: prevent recurrence of Plasma/Arrow-to-Starlight card mapping and
// stale release labels. This validation reads exactly the shipped dashboard
// and the backend's real editable-settings allowlists.
import vm from 'node:vm';
import {BUILD_INFO} from '../src/authority.mjs';
assert.equal(Q17_RELEASE, RELEASE, 'Q-17 product and backend release must match');
assert.equal(BUILD_INFO.id,RELEASE,'runtime fingerprint release label must match Q-17 R7');
const dashboardSource=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const dashboardHtml=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert(dashboardHtml.includes('Q-17 R7 &mdash; SIMULATION ONLY'), 'dashboard release banner must match R7');
const attackStart=dashboardSource.indexOf('const ATTACKS=[');
const attackEnd=dashboardSource.indexOf('\nconst COSMOS=',attackStart);
assert(attackStart>=0&&attackEnd>attackStart,'attack-card source definitions required');
const cards=vm.runInNewContext(dashboardSource.slice(attackStart,attackEnd)+'\nATTACKS;',{}, {timeout:5000});
assert.equal(cards.length,8,'eight attack/recovery cards expected');
const numericKeys=new Set(EDITABLE_NUMERIC_SETTINGS);
const booleanKeys=new Set(EDITABLE_BOOLEAN_SETTINGS);
const expectedAurora={
  'Crash Recovery Hunter':'crashRecoveryHunterAuroraDamageControlPercent',
  'Lightning Plasma':'lightningPlasmaAuroraDamageControlPercent',
  'Great Horn Recovery':'greatHornAuroraDamageControlPercent',
  'Crystal Wall Recovery':'crystalWallRecoveryAuroraDamageControlPercent',
  'Sagittarius Arrow Recovery':'sagittariusArrowAuroraDamageControlPercent',
  'Scarlet Needle Recovery':'scarletNeedleCapitalAuroraDamageControlPercent',
  'Pegasus Ryu Sei Ken Recovery':'pegasusRyuSeiKenCapitalAuroraDamageControlPercent',
};
for(const card of cards){
  const editKeys=[card.stake,card.min,card.max,card.multiply,card.rays,card.repeats,...(card.fields||[]).map(f=>f[0])].filter(Boolean);
  for(const key of editKeys)assert(numericKeys.has(key),`${card.name}: unknown numeric setting ${key}`);
  for(const key of [card.key,card.x1,card.real].filter(Boolean))assert(booleanKeys.has(key),`${card.name}: unknown boolean setting ${key}`);
  if(expectedAurora[card.legacy]){
    const auroraFields=(card.fields||[]).filter(f=>f[1]==='Aurora %');
    assert.deepEqual(Array.from(auroraFields,f=>f[0]),[expectedAurora[card.legacy]],`${card.name}: wrong Aurora owner`);
  }
  if(['Lightning Plasma','Sagittarius Arrow Recovery'].includes(card.legacy)){
    assert(!editKeys.some(k=>k.startsWith('crashRecovery')||k.startsWith('starlight')),`${card.name}: leaked Starlight card setting`);
  }
}
assert(dashboardSource.includes("save.closest('tr')"),'save action must target its card row');
assert(dashboardSource.includes("row.querySelectorAll('[data-setting-key]')"),'card saves must gather only row-local editable settings');
const arrowSimSource=readFileSync(new URL('../src/sagittariusArrowSimCapital.mjs',import.meta.url),'utf8');
assert(arrowSimSource.includes("structuralRole:'ATHENA_VERIFIED_SHADOW_LOSS_INDEPENDENT_RECOVERY'"),
  'Arrow simulated capital lineage must identify its verified Athena SHADOW parent');
assert(!arrowSimSource.includes("structuralRole:'STARLIGHT_OPEN_CAPITAL_RECOVERY'"),
  'Arrow must not describe a Starlight capital parent');
console.log('Q17 eight attack-card key ownership, Aurora mapping, and release label: PASS');

const wsSource=readFileSync(new URL('../src/market.mjs',import.meta.url),'utf8');
assert(!wsSource.includes("subscribe({channels:['fill','market_positions','user_orders']})"),'Q17 must not subscribe account/order streams');
// Exercise the real HTTP route gate, not only the module-level mode guard.
const {startServer}=await import('../src/server.mjs');
const runtime={engine:{health:{degraded:false},settings:{mode:'SIMULATION',liveArmed:false},recomputeHealth(){}},boot:{status:'running'}};
const server=startServer(runtime,0,new URL('../',import.meta.url).pathname);
try{
 if(!server.listening)await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 const port=server.address().port;
 for(const [path,payload] of [
   ['/api/mode',{mode:'LIVE',confirmation:'ENABLE LIVE TRADING'}],
   ['/api/credentials',{keyId:'TEST',privateKeyPem:'TEST'}],
   ['/api/test-connection',{}],
 ]){
   const response=await fetch(`http://127.0.0.1:${port}${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
   assert.equal(response.status,403,`SIM-only HTTP endpoint accepted ${path}`);
 }
 const health=await fetch(`http://127.0.0.1:${port}/health`);
 assert.equal(health.status,200);
}finally{await new Promise(resolve=>server.close(resolve));}
console.log('Q17 SIM isolation, public-only WebSocket, live HTTP-denial, broker-order-denial: PASS');
