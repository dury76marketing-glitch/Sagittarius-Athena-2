#!/usr/bin/env node
import assert from 'node:assert/strict';
import {env,RELEASE,EDITABLE_NUMERIC_SETTINGS,EDITABLE_BOOLEAN_SETTINGS,normalizeStartupExecutionMode,sanitizeRuntimeSettings,preserveExecutionArm} from '../src/config.mjs';
import {Q17_SIM_ONLY,Q17_RELEASE,Q17_DATABASE_ACK,assertQ17IsolatedDatabase,q17SimSettings,q17AssertPublicMarketRequest,q17ForbiddenLiveExecution} from '../src/q17Profile.mjs';
import {KalshiClient} from '../src/kalshi.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
assert.equal(Q17_SIM_ONLY,false,'R9 LIVE adapter source must be compiled');
assert.equal(env.allowLiveTrading,false,'default deployed without operator LIVE policy must be fail-closed');
assert.equal(env.defaultEngineMode,'SIMULATION');
const sim=q17SimSettings({mode:'SIMULATION',liveArmed:false,lightningPlasmaEnabled:true});
assert.equal(sim.mode,'SIMULATION');assert.equal(sim.liveArmed,false);assert.equal(sim.lightningPlasmaEnabled,true);
const live=q17SimSettings({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true});
assert.equal(live.mode,'LIVE');assert.equal(live.liveArmed,true,'live selection must not be silently rewritten to SIM');
const bootAllowed=normalizeStartupExecutionMode({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true},true);
assert.equal(bootAllowed.settings.mode,'LIVE');assert.equal(bootAllowed.settings.liveArmed,false,'boot always disarms until verified reconcile');
const bootDenied=normalizeStartupExecutionMode({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true},false);
assert.equal(bootDenied.settings.mode,'SIMULATION');assert.equal(bootDenied.settings.liveArmed,false);
const sanitize=sanitizeRuntimeSettings({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true});
assert.equal(sanitize.mode,'LIVE');assert.equal(sanitize.liveArmed,true);assert.equal(sanitize.liveOwnerAuthorized,true);
const kept=preserveExecutionArm({mode:'LIVE',liveArmed:true,liveOwnerAuthorized:true},{mode:'SIMULATION',liveArmed:false});
assert.equal(kept.mode,'LIVE');assert.equal(kept.liveArmed,true);assert.equal(kept.liveOwnerAuthorized,true);
assert.throws(()=>assertQ17IsolatedDatabase({databaseUrl:'postgresql://x:y@localhost:5432/q17',ack:''}),/q17_isolated_database_ack_required/);
assert.equal(assertQ17IsolatedDatabase({databaseUrl:'postgresql://x:y@localhost:5432/q17',ack:Q17_DATABASE_ACK}),true);
for(const method of ['POST','PATCH','PUT','DELETE'])assert.throws(()=>q17AssertPublicMarketRequest(method,'/portfolio/events/orders'),/q17_live_transport_disabled_by_deployment/);
for(const path of ['/portfolio/balance','/portfolio/orders','/account/limits','/historical/orders','/bad-url'])assert.throws(()=>q17AssertPublicMarketRequest('GET',path),/q17_live_transport_disabled_by_deployment/);
for(const path of ['/markets','/markets/X/orderbook','/events/ABC','/milestones','/live_data/milestone/123'])assert.equal(q17AssertPublicMarketRequest('GET',path),true);
const oldPolicy=process.env.ALLOW_LIVE_TRADING;
process.env.ALLOW_LIVE_TRADING='true';
try{
  for(const path of ['/portfolio/balance','/portfolio/orders','/portfolio/fills','/historical/orders','/account/limits'])
    assert.equal(q17AssertPublicMarketRequest('GET',path),true,`authorized LIVE read ${path}`);
  assert.equal(q17AssertPublicMarketRequest('POST','/portfolio/events/orders'),true);
  assert.equal(q17AssertPublicMarketRequest('DELETE','/portfolio/events/orders/order-1'),true);
  for(const path of ['/account/secret','/markets/ABC'])
    assert.throws(()=>q17AssertPublicMarketRequest('POST',path),/q17_transport_endpoint_not_authorized/);
}finally{if(oldPolicy===undefined)delete process.env.ALLOW_LIVE_TRADING;else process.env.ALLOW_LIVE_TRADING=oldPolicy;}
const broker=new KalshiClient({},'https://example.invalid/trade-api/v2');
let called=0;const prior=globalThis.fetch;globalThis.fetch=()=>{called++;throw new Error('NETWORK MUST NOT RUN');};
try{
 for(const method of ['POST','DELETE','PATCH'])await assert.rejects(()=>broker.request(method,'/portfolio/events/orders'),/q17_live_transport_disabled_by_deployment/);
 await assert.rejects(()=>broker.fetchOnce('POST','https://example.invalid','/portfolio/events/orders',{},100),/q17_live_transport_disabled_by_deployment/);
 const denied=await broker.placeOrder({ticker:'DUMMY-MARKET-1',action:'buy',count:1,priceCents:45,clientOrderId:'sagc-test-valid-order-id'});
 assert.equal(denied.ok,false);assert.equal(called,0,'disabled R9 broker mutations must never call fetch');
 await assert.rejects(()=>q17ForbiddenLiveExecution(),/q17_live_execution_removed/);
}finally{globalThis.fetch=prior;}
// Protected LIVE mode path retains its original manual and deployment guards.
await assert.rejects(()=>SagittariusEngine.prototype.setMode.call({
  settings:{mode:'SIMULATION',liveArmed:false},
  db:{audit:async()=>{}},
  raiseRuntimeSafetyFence:()=>0,runtimeSettingsSafetyRevision:0,
  queueRuntimeSettingsMutation:fn=>fn(),
  health:{}
},'LIVE','ENABLE LIVE TRADING'),/ALLOW_LIVE_TRADING is false/);
import {readFileSync} from 'node:fs';

// Q17-R2: prevent recurrence of Plasma/Arrow-to-Starlight card mapping and
// stale release labels. This validation reads exactly the shipped dashboard
// and the backend's real editable-settings allowlists.
import vm from 'node:vm';
import {BUILD_INFO} from '../src/authority.mjs';
assert.equal(Q17_RELEASE, RELEASE, 'Q-17 product and backend release must match');
assert.equal(BUILD_INFO.id,RELEASE,'runtime fingerprint release label must match Q-17 R9');
const dashboardSource=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const dashboardHtml=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
assert(dashboardHtml.includes('Q-17 R9'), 'dashboard release banner must match R9');
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
assert(wsSource.includes('class') || wsSource.includes('WebSocket'), 'websocket market feed exists');
// Exercise the real HTTP endpoint controls with an injected inert engine.
// Real money may never be activated from the test: env.allowLiveTrading is false.
const {startServer}=await import('../src/server.mjs');
let modeCalls=0,connectionCalls=0;
const runtime={engine:{health:{degraded:false},settings:{mode:'SIMULATION',liveArmed:false},
  recomputeHealth(){},setMode:async(mode,confirmation)=>{modeCalls++;assert.equal(mode,'LIVE');
    assert.equal(confirmation,'ENABLE LIVE TRADING');throw new Error('ALLOW_LIVE_TRADING is false');},
  testConnection:async({authenticate})=>{connectionCalls++;assert.equal(authenticate,true);return{ok:true,authenticated:true};}},
  boot:{status:'running'}};
const server=startServer(runtime,0,new URL('../',import.meta.url).pathname);
try{
 if(!server.listening)await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});
 const port=server.address().port;
 const post=async(path,payload)=>fetch(`http://127.0.0.1:${port}${path}`,{
   method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const mode=await post('/api/mode',{mode:'LIVE',confirmation:'ENABLE LIVE TRADING'});
 assert.equal(mode.status,500,'mode request must relay explicit denial, not silently arm');
 assert.equal(modeCalls,1,'the original mode path must receive LIVE requests');
 const credentials=await post('/api/credentials',{keyId:'TEST',privateKeyPem:'TEST'});
 assert.equal(credentials.status,403,'remote credentials mutation must remain blocked');
 const checked=await post('/api/test-connection',{});
 assert.equal(checked.status,200);assert.equal(connectionCalls,1,'connection test must perform authenticated proof');
 const health=await fetch(`http://127.0.0.1:${port}/health`);
 assert.equal(health.status,200);
}finally{await new Promise(resolve=>server.close(resolve));}
console.log('Q17-R9 SIM default, deployment-policy broker no-send, mode gate, dashboard settings: PASS');
