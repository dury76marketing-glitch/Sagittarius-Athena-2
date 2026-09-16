import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { originalSettings, RELEASE } from '../src/config.mjs';
import { StrategyEngine } from '../src/strategy.mjs';
import { SagittariusEngine } from '../src/engine.mjs';
import { Database } from '../src/db.mjs';
import { CRYSTAL_WALL, SCARLET_NEEDLE, INFINITY_BREAK, SHADOW_ATTACK_CONCEPTS, PORTFOLIO_CONCEPTS } from '../src/doctrine.mjs';

const q=(ticker='CW69',bid=20,ask=21)=>({ticker,eventTicker:ticker,title:ticker,sport:'Tennis',yesBid:bid,yesAsk:ask,volume24h:10000,updatedAtMs:Date.now(),status:'active',result:'',liveStatus:'live'});
const openLike=(s)=>['open','entry_pending','exit_pending','pending_recovery'].includes(s);

function settings(overrides={}){
  return {...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r69-2-test',mode:'SIMULATION',liveArmed:false,engineActive:true,
    startingCapitalCents:100,maxPositions:1,maxEntriesPerTrade:1,hunterCooldownMinutes:45,maxSpreadCents:3,
    recoveryHunterEnabled:true,recoveryStakeCents:500,recoveryMinEntryCents:10,recoveryMaxEntryCents:50,
    crystalWallMinCrashCents:15,crystalWallMinReboundCents:5,crystalWallMinUpwardTicks:2,
    scarletNeedleEnabled:true,scarletNeedleStakeCents:500,scarletNeedleMinEntryCents:10,scarletNeedleMaxEntryCents:70,
    scarletNeedleInfinityNetPerOriginalContractCents:8,scarletNeedleMaxRepeats:1,
    infinityBreakMinNetPerOriginalContractCents:1,infinityBreakRequiredConfirmations:1,infinityBreakMaximumBookAgeMs:1000,infinityBreakConfirmationWindowMs:3000,
    auroraDamageControlPercent:95,simFeeCents:2,...overrides};
}

function memoryDb(initial=[]){
  const rows=new Map(initial.map(x=>[String(x.id),structuredClone(x)]));
  const episodes=new Map();
  return {rows,episodes,audits:[],
    async audit(level,event,data){this.audits.push({level,event,data});},
    async insertEntry(e){rows.set(String(e.id),structuredClone(e));return e;},
    async updateEntry(id,patch){const row=rows.get(String(id));if(row)Object.assign(row,structuredClone(patch));},
    async entryById(id){const row=rows.get(String(id));return row?structuredClone(row):null;},
    async entries(){return [...rows.values()].map(x=>structuredClone(x));},
    async entriesByConcept(_s,concept){return [...rows.values()].filter(e=>e.conceptName===concept).map(x=>structuredClone(x));},
    async entriesByConceptTicker(_s,concept,ticker){return [...rows.values()].filter(e=>e.conceptName===concept&&e.ticker===ticker).map(x=>structuredClone(x));},
    async openEntries(){return [...rows.values()].filter(e=>openLike(e.status)).map(x=>structuredClone(x));},
    async openEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&openLike(e.status)).map(x=>structuredClone(x));},
    async openHunterEntriesByTicker(_s,t){return [...rows.values()].filter(e=>e.ticker===t&&PORTFOLIO_CONCEPTS.has(e.conceptName)&&openLike(e.status)).map(x=>structuredClone(x));},
    async entryByConceptSourceTradeId(_s,concept,sourceTradeId){const row=[...rows.values()].find(e=>e.conceptName===concept&&String(e.sourceTradeId||'')===String(sourceTradeId||''));return row?structuredClone(row):null;},
    async acquireHunterTickerLock(){return async()=>{};},
    async opportunityEpisode(id){const ep=episodes.get(String(id));return ep?structuredClone(ep):null;},
    async upsertOpportunityEpisode(ep){const prior=episodes.get(String(ep.id))||{};const next={...structuredClone(prior),...structuredClone(ep)};episodes.set(String(ep.id),next);return structuredClone(next);},
    async opportunityEpisodes(){return [...episodes.values()].map(x=>structuredClone(x));},
    async migrateSimulationCrystalWallToShadow(){return 0;},
  };
}

function market(initial=q(),{askDepth=10000,bidDepth=10000}={}){
  const quote={...initial};let bookMs=Date.now();
  const book=()=>({updatedAtMs:bookMs,yesBids:[{priceCents:Number(quote.yesBid),count:bidDepth}],noBids:[{priceCents:100-Number(quote.yesAsk),count:askDepth}]});
  const execAsk=(count,limit=quote.yesAsk)=>{const ok=Number(quote.yesAsk)<=Number(limit),filled=ok?Math.min(Number(count),askDepth):0;return{filled,full:ok&&askDepth>=Number(count),avgCents:filled?Number(quote.yesAsk):0,bestCents:Number(quote.yesAsk),highestConsumedCents:Number(quote.yesAsk)};};
  const execBid=(count)=>{const filled=Math.min(Number(count),bidDepth);return{filled,full:bidDepth>=Number(count),avgCents:filled?Number(quote.yesBid):0,bestCents:Number(quote.yesBid),lowestConsumedCents:Number(quote.yesBid)};};
  return {
    async verifyTickerSnapshot(){return{marketFresh:true,bookFresh:true,quote:{...quote},book:book(),marketObservedAtMs:Date.now(),bookObservedAtMs:bookMs};},
    async refreshTickerVerified(){return this.verifyTickerSnapshot();},
    async refreshTicker(){return{...quote};},
    executableAskFromBook(_b,count,limit){return execAsk(count,limit);},executableAsk(_t,count,limit){return execAsk(count,limit);},
    executableBid(_t,count){return execBid(count);},getQuote(){return{...quote};},getBook(){return book();},bookAgeMs(){return 0;},quoteAgeMs(){return 0;},
    set(next){Object.assign(quote,next);bookMs+=1;quote.updatedAtMs=bookMs;return{...quote};},
  };
}

function watch(ticker='CW69',episode='EP69'){
  return {authorizationId:`CRYSTAL-WALL-V3:${episode}`,crashEpisodeId:episode,ticker,eventTicker:ticker,sourceKind:'TRACKED_MARKET',coexistingEntryIds:[],
    preCrashPeakCents:40,troughCents:15,troughAtMs:Date.now()-2_000,crashDepthCents:25,lastBidCents:19,upwardTicks:1,authorizedAtMs:Date.now()-2_000,crashStartedAtMs:Date.now()-10_000};
}

function strategyEnv({s=settings(),quote=q(),initial=[],askDepth=10000,bidDepth=10000,kalshi={}}={}){
  const db=memoryDb(initial),m=market(quote,{askDepth,bidDepth});let brokerCalls=0;
  const broker={...kalshi,async placeOrder(args){brokerCalls+=1;if(typeof kalshi.placeOrder==='function')return kalshi.placeOrder(args);return{ok:true,orderId:'SHOULD-NOT-BE-CALLED',fillCount:1,averageFillPriceCents:Number(args.priceCents),feePaidCents:0};}};
  const st=new StrategyEngine({db,kalshi:broker,market:m,learning:{},getSettings:()=>s,getLiveReady:()=>true,random:()=>0});
  return{db,m,st,get brokerCalls(){return brokerCalls;}};
}

test('R69.4 doctrine keeps Crystal Wall shadow-only and requires three consecutive independent profitable proofs for Scarlet',()=>{
  assert.equal(RELEASE,'SAGITTARIUS-R69.6-JUSTICE-DIRECT-POST-SCARLET-2026-09-07');
  assert.equal(CRYSTAL_WALL.policyRevision,'CW3-R4-THIRD-PROOF-PROVENANCE');
  assert.equal(CRYSTAL_WALL.shadowConceptName,'Crystal Wall Shadow');
  assert.equal(SHADOW_ATTACK_CONCEPTS.has(CRYSTAL_WALL.shadowConceptName),true);
  assert.equal(PORTFOLIO_CONCEPTS.has(CRYSTAL_WALL.shadowConceptName),false);
  assert.equal(CRYSTAL_WALL.brokerOrderAuthority,false);assert.equal(CRYSTAL_WALL.portfolioCapitalAuthority,false);assert.equal(CRYSTAL_WALL.simulationPortfolioCapitalAuthority,false);
  assert.equal(SCARLET_NEEDLE.requiredParentConcept,CRYSTAL_WALL.shadowConceptName);
  assert.equal(SCARLET_NEEDLE.trigger,'POST_THIRD_CONSECUTIVE_CRYSTAL_WALL_SHADOW_INFINITY_WIN');
  assert.equal(SCARLET_NEEDLE.requiredParentPolicyRevision,CRYSTAL_WALL.policyRevision);
  assert.equal(SCARLET_NEEDLE.requiredConsecutiveProfitableShadowProofs,3);
  assert.equal(SCARLET_NEEDLE.proofPairing,'NON_OVERLAPPING_CONSECUTIVE_PROFIT_TRIPLES');
  assert.equal(SCARLET_NEEDLE.shadowLossResetsProof,true);
});

test('R69.2 SIM Crystal Wall persists a full-fidelity shadow row despite exhausted real capital/capacity and never calls broker',async()=>{
  const s=settings({startingCapitalCents:0,maxPositions:1});const quote=q('CW-SIM',20,21);
  const existing={id:'real-full',systemName:s.systemName,ownerId:s.ownerId,conceptName:'Momentum Hunter',ticker:'OTHER',eventTicker:'OTHER',mode:'SIMULATION',status:'open',entryPriceCents:50,count:100,remainingCount:100,openedAtMs:Date.now()-1000};
  const env=strategyEnv({s,quote,initial:[existing]});
  const e=await env.st.executeCrystalWallAttack(quote,watch('CW-SIM','SIM-EP'));
  assert.ok(e);assert.equal(e.conceptName,CRYSTAL_WALL.shadowConceptName);assert.equal(env.brokerCalls,0);
  assert.equal(e.entryConfig.shadowAttack.brokerOrderAuthority,false);assert.equal(e.entryConfig.shadowAttack.portfolioCapitalAuthority,false);assert.equal(e.entryConfig.shadowAttack.simulationPortfolioCapitalAuthority,false);
  assert.equal(e.entryConfig.virtualInfinity.version,INFINITY_BREAK.version);assert.equal(e.entryConfig.aurora.frozen,true);
  assert.equal(e.count,Math.floor(500/21));assert.ok(e.entryPriceCents*e.count<=500);
});

test('R69.2 LIVE Crystal Wall uses LIVE fee economics but still has zero BUY/SELL authority',async()=>{
  const s=settings({mode:'LIVE',liveArmed:true}),quote={...q('CW-LIVE',20,21),exchangeIndex:0};const env=strategyEnv({s,quote});
  const e=await env.st.executeCrystalWallAttack(quote,watch('CW-LIVE','LIVE-EP'));
  assert.ok(e);assert.equal(e.mode,'LIVE');assert.equal(e.conceptName,CRYSTAL_WALL.shadowConceptName);assert.equal(env.brokerCalls,0);
  assert.ok(Number(e.entryFeeCents)>=0);assert.equal(e.entryConfig.shadowAttack.brokerOrderAuthority,false);
});

test('R69.2 generic real-Hunter API cannot recreate Crystal Wall in SIM or LIVE',async()=>{
  for(const mode of ['SIMULATION','LIVE']){
    const s=settings({mode,liveArmed:mode==='LIVE'}),quote=q(`CW-BLOCK-${mode}`,20,21),env=strategyEnv({s,quote});
    const e=await env.st.createHunter('Recovery Hunter',quote,500,0,{legacyCompatibility:true});
    assert.equal(e,null);assert.equal(env.brokerCalls,0);assert.equal(env.db.rows.size,0);
    assert.ok(env.db.audits.some(x=>x.event==='crystal_wall_real_entry_blocked'));
  }
});

test('R69.2 Crystal Wall virtual Infinity uses full executable depth and fee-adjusted +1c net economics',async()=>{
  const s=settings(),quote=q('CW-PROFIT',20,21),env=strategyEnv({s,quote});
  const entry=await env.st.executeCrystalWallAttack(quote,watch('CW-PROFIT','PROFIT-EP'));assert.ok(entry);
  env.m.set({yesBid:26,yesAsk:27});
  const engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.market=env.m;engine.crystalWallShadowRuntime=new Map();
  const first=engine.evaluateCrystalWallShadowExit(entry,env.m.getQuote());assert.ok(first);assert.equal(first.closeReason,CRYSTAL_WALL.profitableCloseReason);
  assert.equal(first.pnlCents,entry.count,'26c is exactly +1c NET/original contract after two 2c-per-contract SIM fees from a 21c entry');
  const final=engine.evaluateCrystalWallShadowExit(entry,env.m.getQuote(),{finalize:true});assert.ok(final);assert.equal(final.closeReason,CRYSTAL_WALL.profitableCloseReason);
  const shallow=Object.create(SagittariusEngine.prototype);shallow.settings=s;shallow.market=market(env.m.getQuote(),{bidDepth:1});shallow.crystalWallShadowRuntime=new Map();
  assert.equal(shallow.evaluateCrystalWallShadowExit(entry,shallow.market.getQuote()),null,'virtual profit cannot certify without full-position executable exit depth');
});

test('R69.2 virtual Aurora loss never masquerades as a Scarlet certificate',async()=>{
  const s=settings(),quote=q('CW-LOSS',20,21),env=strategyEnv({s,quote});const entry=await env.st.executeCrystalWallAttack(quote,watch('CW-LOSS','LOSS-EP'));assert.ok(entry);
  env.m.set({yesBid:Number(entry.entryConfig.aurora.dangerPriceCents),yesAsk:Number(entry.entryConfig.aurora.dangerPriceCents)+1});
  const engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.market=env.m;engine.crystalWallShadowRuntime=new Map();
  const loss=engine.evaluateCrystalWallShadowExit(entry,env.m.getQuote());assert.ok(loss);assert.equal(loss.closeReason,CRYSTAL_WALL.lossCloseReason);assert.ok(loss.pnlCents<0);
  engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;engine.db=env.db;
  const parent={...entry,status:'closed',remainingCount:0,closeReason:CRYSTAL_WALL.lossCloseReason,pnlCents:loss.pnlCents,exitPriceCents:loss.exitPriceCents,closedAtMs:Date.now()};
  const handoff=await engine.handleScarletContinuation(parent);assert.equal(handoff.status,'IGNORED');assert.equal(handoff.reason,'not_profitable_crystal_wall_shadow_infinity_close');
});

test('R69.4 first and second profitable Crystal Wall shadows are information-only; third consecutive independent profit opens one real Scarlet',async()=>{
  const s=settings({startingCapitalCents:1_000_000,scarletNeedleInfinityNetPerOriginalContractCents:8}),quote=q('CW-TO-SN',40,41),env=strategyEnv({s,quote});
  const now=Date.now();
  const shadow=(id,crash,openedAtMs,closedAtMs)=>({id,systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker:quote.ticker,eventTicker:quote.eventTicker,marketTitle:quote.title,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:30,exitPriceCents:40,pnlCents:100,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs,closedAtMs,
    entryConfig:{side:'YES',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:crash},virtualInfinity:{version:INFINITY_BREAK.version,minimumNetPerOriginalContractCents:1}}});
  const firstProof=shadow('cw-shadow-proof-1','CW-SN-EP-1',now-180_000,now-130_000);env.db.rows.set(firstProof.id,structuredClone(firstProof));
  const engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=env.db;engine.market=env.m;engine.strategy=env.st;engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;
  const first=await engine.handleScarletContinuation(firstProof);assert.equal(first.status,'ARMED');assert.equal(first.reason,'first_crystal_wall_profit_armed_second_proof');assert.equal(first.proof.proofStage,1);assert.equal([...env.db.rows.values()].filter(e=>e.conceptName==='Scarlet Needle').length,0);
  const firstMarker=env.db.episodes.get(`SCARLET-PROOF-1:${firstProof.id}`);assert.equal(firstMarker?.trackingComplete,true);assert.equal(firstMarker?.attackSelected,null);assert.equal(firstMarker?.outcomeLabel,'SCARLET_FIRST_PROOF_INFORMATION_ONLY');assert.equal(firstMarker?.outcome?.scarletAuthority,false);
  const firstReplay=await engine.handleScarletContinuation(firstProof);assert.equal(firstReplay.status,'DUPLICATE_SUPPRESSED');assert.equal(firstReplay.reason,'first_proof_already_durable');
  const secondProof=shadow('cw-shadow-proof-2','CW-SN-EP-2',now-120_000,now-70_000);env.db.rows.set(secondProof.id,structuredClone(secondProof));
  const second=await engine.handleScarletContinuation(secondProof);assert.equal(second.status,'ARMED');assert.equal(second.reason,'second_consecutive_crystal_wall_profit_armed_third_proof');assert.equal(second.proof.proofStage,2);assert.equal([...env.db.rows.values()].filter(e=>e.conceptName==='Scarlet Needle').length,0);
  const secondMarker=env.db.episodes.get(`SCARLET-PROOF-2:${secondProof.id}`);assert.equal(secondMarker?.outcomeLabel,'SCARLET_SECOND_PROOF_INFORMATION_ONLY');assert.equal(secondMarker?.outcome?.scarletAuthority,false);
  const thirdProof=shadow('cw-shadow-proof-3','CW-SN-EP-3',now-60_000,now-100);env.db.rows.set(thirdProof.id,structuredClone(thirdProof));
  const third=await engine.handleScarletContinuation(thirdProof);assert.equal(third.status,'OPENED',JSON.stringify({third,audits:env.db.audits}));assert.equal(third.entry.conceptName,'Scarlet Needle');assert.equal(PORTFOLIO_CONCEPTS.has(third.entry.conceptName),true);
  assert.deepEqual([third.thirdProof.firstProofEntryId,third.thirdProof.secondProofEntryId,third.thirdProof.thirdProofEntryId],[firstProof.id,secondProof.id,thirdProof.id]);assert.equal(third.thirdProof.proofStage,3);assert.equal(third.thirdProof.proofGroupIndex,1);
  assert.deepEqual([third.entry.entryConfig.scarletContinuation.thirdProof.firstProofEntryId,third.entry.entryConfig.scarletContinuation.thirdProof.secondProofEntryId,third.entry.entryConfig.scarletContinuation.thirdProof.thirdProofEntryId],[firstProof.id,secondProof.id,thirdProof.id]);
  const replay=await engine.handleScarletContinuation(thirdProof);assert.equal(replay.status,'DUPLICATE_SUPPRESSED');assert.equal(replay.reason,'durable_authorization_already_consumed');
  assert.equal([...env.db.rows.values()].filter(e=>e.conceptName==='Scarlet Needle').length,1);
});

test('R69.4 Crystal Wall loss resets the proof sequence and non-overlapping triples prevent proof piggybacking',async()=>{
  const s=settings({startingCapitalCents:1_000_000}),ticker='CW-TRIPLE',now=Date.now(),base={systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker,eventTicker:ticker,marketTitle:ticker,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:46,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision},virtualInfinity:{version:INFINITY_BREAK.version}}};
  const row=(id,crash,open,close,profit=true)=>({...base,id,openedAtMs:open,closedAtMs:close,pnlCents:profit?20:-200,closeReason:profit?CRYSTAL_WALL.profitableCloseReason:CRYSTAL_WALL.lossCloseReason,entryConfig:{...base.entryConfig,crystalWall:{...base.entryConfig.crystalWall,crashEpisodeId:crash}}});
  const rows=[row('p1','ep1',now-100000,now-95000,true),row('loss','ep2',now-90000,now-85000,false),row('p3','ep3',now-80000,now-75000,true),row('p4','ep4',now-70000,now-65000,true),row('p5','ep5',now-60000,now-55000,true),row('p6','ep6',now-50000,now-45000,true),row('p7','ep7',now-40000,now-35000,true),row('p8','ep8',now-30000,now-25000,true)];
  const db=memoryDb(rows),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=db;
  const d1=await engine.scarletThirdProofDecision(rows[2]);assert.equal(d1.status,'ARMED','loss must reset the prior win');assert.equal(d1.proof.consecutiveProfitCount,1);assert.equal(d1.proof.proofStage,1);
  const d2=await engine.scarletThirdProofDecision(rows[3]);assert.equal(d2.status,'ARMED');assert.equal(d2.proof.proofStage,2);
  const triple1=await engine.scarletThirdProofDecision(rows[4]);assert.equal(triple1.status,'CERTIFIED');assert.deepEqual([triple1.proof.firstProofEntryId,triple1.proof.secondProofEntryId,triple1.proof.thirdProofEntryId],['p3','p4','p5']);assert.equal(triple1.proof.proofGroupIndex,1);
  const nextFirst=await engine.scarletThirdProofDecision(rows[5]);assert.equal(nextFirst.status,'ARMED','fourth consecutive win starts a new non-overlapping triple');assert.equal(nextFirst.proof.proofStage,1);assert.equal(nextFirst.proof.firstProofEntryId,'p6');
  const nextSecond=await engine.scarletThirdProofDecision(rows[6]);assert.equal(nextSecond.status,'ARMED');assert.equal(nextSecond.proof.proofStage,2);assert.deepEqual([nextSecond.proof.firstProofEntryId,nextSecond.proof.secondProofEntryId],['p6','p7']);
  const triple2=await engine.scarletThirdProofDecision(rows[7]);assert.equal(triple2.status,'CERTIFIED');assert.deepEqual([triple2.proof.firstProofEntryId,triple2.proof.secondProofEntryId,triple2.proof.thirdProofEntryId],['p6','p7','p8']);assert.equal(triple2.proof.proofGroupIndex,2);
});

test('R69.4 third proof is restart-safe and fails closed when durable proof history cannot be read',async()=>{
  const s=settings({startingCapitalCents:1_000_000}),quote=q('CW-RESTART-PROOF',40,41),now=Date.now();
  const mk=(id,crash,open,close)=>({id,systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker:quote.ticker,eventTicker:quote.eventTicker,marketTitle:quote.title,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:30,exitPriceCents:40,pnlCents:100,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:open,closedAtMs:close,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:crash},virtualInfinity:{version:INFINITY_BREAK.version}}});
  const first=mk('restart-first','restart-ep-1',now-180000,now-130000),second=mk('restart-second','restart-ep-2',now-120000,now-70000),third=mk('restart-third','restart-ep-3',now-60000,now-100);
  const env=strategyEnv({s,quote,initial:[first,second,third]}),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=env.db;engine.market=env.m;engine.strategy=env.st;engine.scarletContinuationInFlight=new Set();engine.scarletContinuationStats=null;
  const opened=await engine.handleScarletContinuation(third);assert.equal(opened.status,'OPENED','two prior durable proofs must survive engine restart without in-memory proof state');
  const failed=Object.create(SagittariusEngine.prototype);failed.settings=s;failed.db={async entriesByConceptTicker(){throw new Error('db proof read failed');}};
  const decision=await failed.scarletThirdProofDecision(third);assert.equal(decision.status,'BLOCKED');assert.equal(decision.reason,'third_proof_history_unavailable');
});

test('R69.4 in-memory third close cannot certify Scarlet unless the current Crystal Wall row is already durable',async()=>{
  const s=settings(),ticker='CW-NOT-DURABLE',now=Date.now(),mk=(id,crash,open,close)=>({id,systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker,eventTicker:ticker,mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:46,pnlCents:20,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:open,closedAtMs:close,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:crash},virtualInfinity:{version:INFINITY_BREAK.version}}});
  const first=mk('durable-first','ep-first',now-70000,now-60000),second=mk('durable-second','ep-second',now-50000,now-30000),third=mk('memory-only-third','ep-third',now-20000,now-1000),db=memoryDb([first,second]),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=db;
  const d=await engine.scarletThirdProofDecision(third);assert.equal(d.status,'BLOCKED');assert.equal(d.reason,'third_proof_parent_not_durable');
});

test('R69.4 Strategy rejects forged third-proof context when any referenced durable proof row is missing',async()=>{
  const s=settings({startingCapitalCents:1_000_000}),quote=q('CW-FORGED-PROOF',40,41),now=Date.now();
  const parent={id:'durable-third',systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker:quote.ticker,eventTicker:quote.eventTicker,marketTitle:quote.title,side:'YES',sport:'Tennis',mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:30,exitPriceCents:40,pnlCents:100,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:now-20000,closedAtMs:now-1000,entryConfig:{side:'YES',crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:'forged-third-ep'},virtualInfinity:{version:INFINITY_BREAK.version,minimumNetPerOriginalContractCents:1}}};
  const env=strategyEnv({s,quote,initial:[parent]});
  const proof={version:SCARLET_NEEDLE.thirdProofVersion,policyRevision:SCARLET_NEEDLE.policyRevision,ticker:quote.ticker,proofGroupIndex:1,pairing:SCARLET_NEEDLE.proofPairing,requiredConsecutiveProfitableShadowProofs:3,consecutiveProfitCount:3,proofStage:3,independentCrashEpisodes:true,sameExactTicker:true,lossResetsProof:true,firstProofEntryId:'missing-first',firstProofCrashEpisodeId:'missing-first-ep',firstProofOpenedAtMs:now-90000,firstProofClosedAtMs:now-80000,firstProofExitPriceCents:35,firstProofRealizedPnlCents:10,secondProofEntryId:'missing-second',secondProofCrashEpisodeId:'missing-second-ep',secondProofOpenedAtMs:now-70000,secondProofClosedAtMs:now-30000,secondProofExitPriceCents:36,secondProofRealizedPnlCents:10,thirdProofEntryId:parent.id,thirdProofCrashEpisodeId:'forged-third-ep',thirdProofOpenedAtMs:parent.openedAtMs,thirdProofClosedAtMs:parent.closedAtMs,thirdProofExitPriceCents:parent.exitPriceCents,thirdProofRealizedPnlCents:parent.pnlCents};
  const opened=await env.st.executeScarletContinuation(quote,parent,{authorizationId:'SCARLET-THIRD-PROOF:missing-first:durable-third',rootEntryId:'missing-first',authorizedAtMs:now,thirdProof:proof});
  assert.equal(opened,null);assert.equal([...env.db.rows.values()].filter(e=>e.conceptName==='Scarlet Needle').length,0);
});

test('R69.4 the same crash episode cannot satisfy two of the three Crystal Wall proofs',async()=>{
  const s=settings(),ticker='CW-SAME-EP',now=Date.now(),mk=(id,crash,open,close)=>({id,systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker,eventTicker:ticker,mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:46,pnlCents:20,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:open,closedAtMs:close,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,policyRevision:CRYSTAL_WALL.policyRevision,crashEpisodeId:crash},virtualInfinity:{version:INFINITY_BREAK.version}}});
  const first=mk('same-first','ep-1',now-70000,now-60000),second=mk('same-second','same-episode',now-50000,now-30000),third=mk('same-third','same-episode',now-20000,now-1000),db=memoryDb([first,second,third]),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=db;
  const d=await engine.scarletThirdProofDecision(third);assert.equal(d.status,'BLOCKED');assert.equal(d.reason,'third_proof_independence_failed');
});

test('R69.4 old R69.3 Crystal Wall policy rows cannot silently seed the new third-proof doctrine',async()=>{
  const s=settings(),ticker='CW-OLD-POLICY',now=Date.now(),mk=(id,policy,crash,open,close)=>({id,systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,ticker,eventTicker:ticker,mode:s.mode,status:'closed',remainingCount:0,entryPriceCents:40,exitPriceCents:46,pnlCents:20,closeReason:CRYSTAL_WALL.profitableCloseReason,openedAtMs:open,closedAtMs:close,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,policyRevision:policy,crashEpisodeId:crash},virtualInfinity:{version:INFINITY_BREAK.version}}});
  const old1=mk('old1','CW3-R3-SECOND-PROOF-PROVENANCE','old-ep-1',now-90000,now-80000),old2=mk('old2','CW3-R3-SECOND-PROOF-PROVENANCE','old-ep-2',now-70000,now-60000),current=mk('current',CRYSTAL_WALL.policyRevision,'current-ep',now-30000,now-1000),db=memoryDb([old1,old2,current]),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=db;
  const d=await engine.scarletThirdProofDecision(current);assert.equal(d.status,'ARMED');assert.equal(d.proof.consecutiveProfitCount,1,'pre-upgrade shadow wins must not count toward the new triple');assert.equal(d.proof.proofStage,1);
});

test('R69.2 consumed crash episodes are bounded and cannot re-arm the quote hot loop',()=>{
  const engine=Object.create(SagittariusEngine.prototype);engine.crystalWallConsumedEpisodeIds=new Set();
  for(let i=0;i<CRYSTAL_WALL.maximumConsumedCrashEpisodes+200;i++)engine.rememberCrystalWallConsumedEpisode(`EP-${i}`);
  assert.equal(engine.crystalWallConsumedEpisodeIds.size,CRYSTAL_WALL.maximumConsumedCrashEpisodes);
  engine.settings=settings();engine.crystalWallShadowOpenByTicker=new Map();engine.crystalWallWatches=new Map();engine.crystalWallContinuationQueue={enqueue(){throw new Error('must not enqueue consumed episode');}};engine.crystalWallContinuationStats=null;engine.recoveryPriorityTickers=new Set();
  engine.rememberCrystalWallConsumedEpisode('CONSUMED');
  const observed=engine.observeCrystalWallQuote(q('CW-HOT',20,21),{episodeId:'CONSUMED',phase:'CRASHING',sport:'Tennis',preCrashPeakCents:40,troughCents:15,crashDepthCents:25,crashStartedAtMs:Date.now()-1000});
  assert.equal(observed,false);assert.equal(engine.crystalWallWatches.size,0);
});

test('R69.2 restart hydration restores open Crystal Wall shadow rows and their consumed crash lineage',async()=>{
  const s=settings(),row={id:'CW-RESTART',systemName:s.systemName,ownerId:s.ownerId,conceptName:CRYSTAL_WALL.shadowConceptName,sourceTradeId:'RESTART-EP',ticker:'CW-RESTART',eventTicker:'CW-RESTART',mode:s.mode,status:'open',entryPriceCents:20,count:25,remainingCount:25,entryConfig:{crystalWall:{version:CRYSTAL_WALL.version,crashEpisodeId:'RESTART-EP'},virtualInfinity:{version:INFINITY_BREAK.version}}};
  const db=memoryDb([row]),engine=Object.create(SagittariusEngine.prototype);engine.settings=s;engine.db=db;
  await engine.hydrateCrystalWallShadow();assert.equal(engine.crystalWallShadowOpenByTicker.get('CW-RESTART')?.id,row.id);assert.equal(engine.crystalWallConsumedEpisodeIds.has('RESTART-EP'),true);
});

test('R69.2 PostgreSQL migration is SIMULATION-only and concept/performance queries receive real portfolio boundaries',async()=>{
  const calls=[];const d=Object.create(Database.prototype);d.pool={async query(sql,args){calls.push({sql,args});return{rowCount:3,rows:[{portfolio:[],signals:[],linked:[]}]};}};
  const n=await d.migrateSimulationCrystalWallToShadow('SAGITTARIUS',{shadowConceptName:CRYSTAL_WALL.shadowConceptName,release:RELEASE,policyRevision:CRYSTAL_WALL.policyRevision});assert.equal(n,3);
  assert.match(calls[0].sql,/mode='SIMULATION'/);assert.match(calls[0].sql,/concept_name='Recovery Hunter'/);assert.match(calls[0].sql,/crystalWall,version/);assert.equal(calls[0].args[1],CRYSTAL_WALL.shadowConceptName);
  calls.length=0;await d.conceptStatsAggregate('SAGITTARIUS',{resetTimestampMs:123456});assert.equal(calls[0].args[3],123456,'concept cards must honor the active reset boundary');
  assert.equal(PORTFOLIO_CONCEPTS.has(CRYSTAL_WALL.shadowConceptName),false,'the DB portfolio concept array is frozen from this set and therefore excludes Crystal Wall shadow P/L');
  calls.length=0;await d.entriesByConceptTicker('SAGITTARIUS',CRYSTAL_WALL.shadowConceptName,'CW-TICK',{limit:17});assert.match(calls[0].sql,/concept_name=\$2 and ticker=\$3/);assert.deepEqual(calls[0].args,['SAGITTARIUS',CRYSTAL_WALL.shadowConceptName,'CW-TICK',17]);
});


test('R69.2 ordinary Athena real-entry context excludes Crystal Wall shadow rows',async()=>{
  const engineSource=await readFile(new URL('../src/engine.mjs',import.meta.url),'utf8');
  assert.ok(engineSource.includes("const openEntriesOnTicker=(rows||[]).filter(e=>PORTFOLIO_CONCEPTS.has(String(e.conceptName||''))&&String(e.ticker||'')===String(q.ticker||'')&&openLike(e.status));"));
});

test('R69.2 operator UI exposes Crystal Wall only in a dedicated shadow table and labels zero portfolio P/L authority',async()=>{
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.ok(html.includes('CRYSTAL WALL — SHADOW TRADES'));assert.ok(html.includes('zero broker, simulation capital and portfolio P/L'));
  assert.ok(app.includes('s.crystalWallTrades||[]'));assert.ok(app.includes('SHADOW ONLY: CI1 crash episode'));
});
