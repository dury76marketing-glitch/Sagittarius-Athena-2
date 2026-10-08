import test from 'node:test';
import assert from 'node:assert/strict';
import { originalSettings, sanitizeRuntimeSettings, RELEASE } from '../src/config.mjs';
import { sealAthenaFireCommand } from '../src/authority.mjs';
import { ATHENA_COMMANDER, INFINITY_BREAK } from '../src/doctrine.mjs';
import { StrategyEngine, attackMultiplySeats } from '../src/strategy.mjs';

function nowQuote(ticker='STACK', bid=87, ask=88){
  const now=Date.now(), start=now-40*60_000;
  return {ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10_000,status:'active',result:'',updatedAtMs:now,closeTimeMs:now+60*60_000,gameStartTimeMs:start,liveStatus:'live',gameClockState:{version:'GCA2',eventTicker:ticker,phase:'CONFIRMED',confirmed:true,entryAuthorized:true,startTimeMs:start,source:'test',sourceStrength:'strong',evidenceObservedAtMs:now,lastCheckedAtMs:now,authorizationReason:'mul1'}};
}
function refreshClock(q){const now=Date.now();return Promise.resolve({gameClockState:{...q.gameClockState,evidenceObservedAtMs:now,lastCheckedAtMs:now,entryAuthorized:true,confirmed:true,phase:'CONFIRMED'},gameStartTimeMs:q.gameStartTimeMs,liveStatus:'live'});}
function market(q){
  let quote={...q};
  return {
    getQuote:()=>({...quote}),
    quoteAgeMs:()=>0,bookAgeMs:()=>0,
    getBook:()=>({updatedAtMs:Date.now(),yesBids:[{priceCents:quote.yesBid,count:10_000}],noBids:[{priceCents:100-quote.yesAsk,count:10_000}]}),
    async refreshTickerVerified(){quote={...quote,updatedAtMs:Date.now()};return{quote,marketFresh:true,bookFresh:true,marketObservedAtMs:Date.now(),bookObservedAtMs:Date.now()};},
    async ensureFreshBook(){return this.getBook();},
    executableAsk(_t,c){return{filled:c,full:true,avgCents:quote.yesAsk,bestCents:quote.yesAsk};},
    executableBid(_t,c){return{filled:c,full:true,avgCents:quote.yesBid,bestCents:quote.yesBid};},
  };
}
function memoryDb(initial=[]){
  const rows=initial.map(x=>structuredClone(x));
  const active=(s)=>['open','entry_pending','exit_pending','pending_recovery'].includes(String(s));
  return {
    rows,audits:[],
    async entries(){return rows.map(x=>structuredClone(x));},
    async openEntries(){return rows.filter(e=>active(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&active(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return rows.filter(e=>e.ticker===t&&active(e.status)&&!['Pegasus','Dragon','Phoenix'].includes(e.conceptName)).map(x=>structuredClone(x));},
    async entryById(id){const e=rows.find(x=>x.id===id);return e?structuredClone(e):null;},
    async insertEntry(e){rows.push(structuredClone(e));},
    async updateEntry(id,p){const e=rows.find(x=>x.id===id);if(e)Object.assign(e,structuredClone(p));},
    async audit(level,event,data){this.audits.push({level,event,data});},
    async acquireHunterTickerLock(){return async()=>{};},
    async upsertOpportunityEpisode(){return null;},
  };
}
function settings(overrides={}){
  return {
    ...originalSettings(),systemName:'SAGITTARIUS',ownerId:'mul1',mode:'SIMULATION',liveArmed:false,engineActive:true,
    startingCapitalCents:1_000_000,simFillProbability:1,simFeeCents:2,maxPositions:50,maxEntriesPerTrade:1,hunterCooldownMinutes:180,
    minGameMinutes:0,maxGameMinutes:0,maxSpreadCents:3,
    galacticExplosionEnabled:false,
    momentumHunterEnabled:true,waveSurferEnabled:false,crashRecoveryHunterEnabled:false,
    scarletNeedleEnabled:false,lightningPlasmaEnabled:false,recoveryHunterEnabled:false,justiceArrowEnabled:false,
    athenaExclamationEnabled:false,
    momentumStakeCents:100,momentumMinEntryCents:80,momentumMaxEntryCents:95,
    momentumHunterMinCrashCents:0,momentumHunterMinReboundCents:0,momentumHunterMinUpwardTicks:0,
    momentumHunterMultiply:1,
    ...overrides,
  };
}
function engine(s,q,db){
  const st=new StrategyEngine({db,kalshi:{async placeOrder(){return {orderId:'SIM',fillCount:1,averageFillPriceCents:q.yesAsk};}},market:market(q),learning:{},getSettings:()=>s,getLiveReady:()=>false,refreshGameClock:refreshClock,random:()=>0});
  return st;
}
function fire(q,concept='Momentum Hunter'){
  const now=Date.now();
  return sealAthenaFireCommand({
    version:ATHENA_COMMANDER.version,policyRevision:ATHENA_COMMANDER.policyRevision,
    boltId:`bolt-${q.ticker}`,boltFingerprint:'fp',systemName:'SAGITTARIUS',sourceRelease:RELEASE,
    decidedAtMs:now,expiresAtMs:now+5_000,ticker:q.ticker,eventTicker:q.eventTicker,side:'YES',
    selectedAttack:concept,selectedAttackDisplay:concept,stakeCents:100,
    operatorMinEntryCents:80,operatorMaxEntryCents:95,entryPriceCents:q.yesAsk,authorizedMaxEntryCents:q.yesAsk,
    maxSpreadCents:3,auroraDamageControlPercent:45,infinityBreakPolicyVersion:INFINITY_BREAK.version,
    economicTarget:{netPerOriginalContractCents:1,targetFeasible:true,requiredTargetBidCents:q.yesAsk+1},
    ranking:[{concept,score:100,authorityMode:'ATHENA_A3'}],
    decisionEvidence:{features:{askCents:q.yesAsk,bidCents:q.yesBid,eligibleAttacks:[{concept,targetFeasible:true}]},greenTrigger:{ok:true}},
  });
}

test('MUL1 factory Multiply clamps 0→1, 99→20',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-AU2-RESET-ATTACK-COLUMN-2026-10-05');
  const s=sanitizeRuntimeSettings({...originalSettings(),momentumHunterMultiply:0,scarletNeedleMultiply:99});
  assert.equal(s.momentumHunterMultiply,1);
  assert.equal(s.scarletNeedleMultiply,20);
  assert.equal(attackMultiplySeats(s,'Momentum Hunter'),1);
  assert.equal(attackMultiplySeats(s,'Scarlet Needle'),20);
});

test('MUL1 Multiply=1 keeps one-seat law under general cap 1',async()=>{
  const q=nowQuote(),s=settings({momentumHunterMultiply:1,maxEntriesPerTrade:1,hunterCooldownMinutes:180}),db=memoryDb(),st=engine(s,q,db);
  const cmd=fire(q);
  const first=await st.executeAthenaFire(q,{id:'b1',ticker:q.ticker,eventTicker:q.eventTicker,detectedAtMs:Date.now(),features:{askCents:q.yesAsk,bidCents:q.yesBid,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true}]},greenTrigger:{ok:true}},{decision:'FIRE',reason:'test',decidedAtMs:Date.now(),boltId:'b1',ticker:q.ticker,selectedAttack:'Momentum Hunter',fireCommand:cmd,ranking:cmd.ranking});
  assert.ok(first);
  const second=await st.executeAthenaFire(q,{id:'b2',ticker:q.ticker,eventTicker:q.eventTicker,detectedAtMs:Date.now(),features:{askCents:q.yesAsk,bidCents:q.yesBid,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true}]},greenTrigger:{ok:true}},{decision:'FIRE',reason:'test',decidedAtMs:Date.now(),boltId:'b2',ticker:q.ticker,selectedAttack:'Momentum Hunter',fireCommand:fire(q),ranking:cmd.ranking});
  assert.equal(second,null);
  assert.equal(db.rows.filter(e=>e.conceptName==='Momentum Hunter'&&e.status==='open').length,1);
});

test('MUL1 Multiply=3 stacks three Horn seats and bypasses general cap 1 + 180m cooldown',async()=>{
  const q=nowQuote('MUL3'),s=settings({momentumHunterMultiply:3,maxEntriesPerTrade:1,hunterCooldownMinutes:180,maxPositions:50}),db=memoryDb(),st=engine(s,q,db);
  const cmd=fire(q);
  const first=await st.executeAthenaFire(q,{id:'b3',ticker:q.ticker,eventTicker:q.eventTicker,detectedAtMs:Date.now(),features:{askCents:q.yesAsk,bidCents:q.yesBid,eligibleAttacks:[{concept:'Momentum Hunter',targetFeasible:true}]},greenTrigger:{ok:true}},{decision:'FIRE',reason:'test',decidedAtMs:Date.now(),boltId:'b3',ticker:q.ticker,selectedAttack:'Momentum Hunter',fireCommand:cmd,ranking:cmd.ranking});
  assert.ok(first);
  const horns=db.rows.filter(e=>e.conceptName==='Momentum Hunter'&&e.status==='open');
  assert.equal(horns.length,3);
  assert.ok(db.audits.some(a=>a.event==='attack_stack_seat_opened'));
});
