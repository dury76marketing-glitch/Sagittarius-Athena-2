#!/usr/bin/env node
/** Five-wave Great Horn independent-spread verification; no real broker, DB or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {freshInstallSettings,sanitizeRuntimeSettings} from '../src/config.mjs';
import {verifiedLightningLoss,greatHornWatchFromLoss,greatHornObservationStep,greatHornSpreadAllowed,GREAT_HORN_SQL} from '../src/greatHornRecovery.mjs';
import {createGreatHornCapitalEntry,greatHornSettingsFingerprint} from '../src/greatHornSimCapital.mjs';
import {greatHornLiveDispatchConfirmation,dispatchGreatHornLiveIntent} from '../src/greatHornLiveExecution.mjs';
import {statisticsFromRows} from '../src/executionReporting.mjs';
import {profitGuardDecision} from '../src/profitGuard.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const NOW=Date.now();
const quoteBase={ticker:'KX-GH-SPREAD-FIVEWAVE',eventTicker:'KX-GH-SPREAD-FIVEWAVE',yesBid:85,yesAsk:91,
  quoteAtMs:NOW-120,status:'active',bookInvalid:false,result:null,title:'GH five wave local test'};
function settings(overrides={}){
  return {...sanitizeRuntimeSettings({...freshInstallSettings(),systemName:'GH-FIVEWAVE',ownerId:'GH-OWNER',
   mode:'SIMULATION',resetTimestampMs:NOW-60_000,greatHornEnabled:true,engineActive:true,greatHornLinkEnabled:true,
   greatHornStakeCents:100,greatHornMultiply:1,greatHornMaxSpreadCents:8,maxSpreadCents:3,
   greatHornMinEntryCents:50,greatHornMaxEntryCents:90,greatHornMinProfitNetPerOriginalContractCents:1,
   greatHornAuroraDamageControlPercent:20,simFeeCents:0,
   galacticExplosionEnabled:true}),...overrides};
}
function parent(s,more={}){
 const live=s.mode==='LIVE';
 return {id:'LP-PARENT-FIVEWAVE',systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
 conceptName:'Lightning Plasma',executionClass:'CAPITAL',entryConfig:{side:'YES',executionClass:'CAPITAL',aurora:{frozen:true}},
 ticker:quoteBase.ticker,eventTicker:quoteBase.eventTicker,archived:false,status:'closed',openedAtMs:NOW-25_000,
 closedAtMs:NOW-15_000,entryPriceCents:85,exitPriceCents:29,entryFeeCents:0,exitFeeCents:0,
 exitNotionalCents:145,pnlCents:-280,count:5,remainingCount:0,exitFilledCount:5,side:'YES',
 ...(live?{entryOrderId:'OK-ENTRY',exitOrderId:'OK-EXIT',exitExecutionState:{terminal:true}}:{}),...more};
}
function scenario(s=settings(),q={}){
 const p=parent(s),proof=verifiedLightningLoss(p,s,NOW);assert.equal(proof.ok,true,proof.reason);
 const fromLoss=greatHornWatchFromLoss(proof,s,NOW);assert.equal(fromLoss.ok,true,fromLoss.reason);
 const quote={...quoteBase,...q};
 const observed=greatHornObservationStep(fromLoss.watch,quote,s,NOW);
 assert.equal(observed.ok,true,observed.reason);
 const watch=observed.watch;
 const book={ticker:quote.ticker,updatedAtMs:quote.quoteAtMs,sequenceValid:true,
    yesBids:[{priceCents:quote.yesBid,count:50}],noBids:[{priceCents:100-quote.yesAsk,count:50}]};
 const plan={count:1,averagePriceCents:quote.yesAsk,bestAskCents:quote.yesAsk,verifiedBookAtMs:quote.quoteAtMs,
  availableAtLimitCount:50,existingGroupQuantity:0,executionEvidence:{book,executable:true,bookInvalid:false}};
 return {s,p,watch,quote,book,plan};
}
function candidate(x){return createGreatHornCapitalEntry({watch:x.watch,parent:x.p,quote:x.quote,plan:x.plan,
 settings:x.s,seat:1,now:NOW,clientOrderId:x.s.mode==='LIVE'?'GH-FIVEWAVE-CLIENT-ORDER':null});}

// W1: legacy migration, operator independence and quote boundary.
test('W1 / legacy settings inherit shared spread once and then become independent',()=>{
 const legacy={...settings()};delete legacy.greatHornMaxSpreadCents;legacy.maxSpreadCents=6;
 const migrated=sanitizeRuntimeSettings(legacy);
 assert.equal(migrated.greatHornMaxSpreadCents,6);
 assert.equal(sanitizeRuntimeSettings({...migrated,maxSpreadCents:1}).greatHornMaxSpreadCents,6);
 assert.equal(settings().greatHornMaxSpreadCents,8);
});
test('W1 / independently configured 6c GH entry does not relax shared spread',()=>{
 const x=settings();assert.equal(x.maxSpreadCents,3);
 assert.equal(greatHornSpreadAllowed(quoteBase,x),true);
 assert.equal(greatHornSpreadAllowed(quoteBase,{...x,greatHornMaxSpreadCents:3,maxSpreadCents:20}),false);
 assert.equal(greatHornSpreadAllowed({...quoteBase,yesAsk:94},x),false);
 assert.notEqual(greatHornSettingsFingerprint(x),greatHornSettingsFingerprint({...x,greatHornMaxSpreadCents:7}));
 assert.equal(greatHornSettingsFingerprint(x),greatHornSettingsFingerprint({...x,maxSpreadCents:1}));
});
test('W1 / Link ON signal may qualify but capital still enforces GH spread',()=>{
 const x=scenario(settings({greatHornMaxSpreadCents:3}));
 assert.equal(x.watch.qualified,true);
 assert.equal(candidate(x).reason,'gh_excessive_spread');
});

// W2: real engine method -> verified REST market + bid/ask book -> DB adapter, no actual DB.
test('W2 / verified capital parent, canonical SIM entry and financial close reporting',()=>{
 const x=scenario();const made=candidate(x);assert.equal(made.ok,true,made.reason);
 const e=made.entry,closed={...e,status:'closed',remainingCount:0,closedAtMs:NOW,exitPriceCents:96,
   exitFilledCount:e.count,exitNotionalCents:96*e.count,exitFeeCents:0,pnlCents:(96-e.entryPriceCents)*e.count-e.entryFeeCents};
 const report=statisticsFromRows([closed],x.s,{now:NOW});
 assert.equal(e.spreadAtEntryCents,6);assert.equal(report.byAttack['Great Horn Recovery'].closed,1);
 assert.equal(report.byAttack['Great Horn Recovery'].realizedCents,closed.pnlCents);
});
test('W2 / real Great Horn engine entry method accepts independent 8c with shared 3c',async()=>{
 const x=scenario(),engine=Object.create(SagittariusEngine.prototype),observed=[];
 engine.settings=x.s;engine.running=true;engine.shuttingDown=false;
 engine.simulationMutationGate={capture:()=>({epoch:1}),enter:()=>()=>{},blocked:false};
 engine.strategy={prepareEntryExecution:async()=>{},onHunterOpened:()=>{}};
 engine.profitGuard={registerInfinityBreakFastWake:()=>{}};
 engine.recordGreatHornDecision=async()=>{};
 engine.market={
  async verifyTickerSnapshot(){return {quote:{...x.quote,quoteAtMs:Date.now()-40},book:{...x.book,updatedAtMs:Date.now()-40},marketFresh:true,bookFresh:true};},
  executableAskFromBook(book,requested,limit){return {filled:Math.min(50,requested),avgCents:91,consumedLevels:[]};}
 };
 engine.db={entryById:async()=>x.p,pool:{query:async sql=>sql.includes('coalesce(sum(e.count)')
   ?{rows:[{contracts:0}],rowCount:1}:{rows:[],rowCount:0}},
   insertGreatHornSimulationEntry:async entry=>{observed.push(entry);return {entry};}};
 const result=await engine.executeGreatHornCapitalSeat(x.watch,x.quote);
 assert.equal(result.ok,true,JSON.stringify(result));assert.equal(observed.length,1);
 assert.equal(observed[0].spreadAtEntryCents,6);
});
test('W2 / frozen Great Horn stop and settlement decisions ignore entry-only spread edits',()=>{
 const x=scenario();const made=candidate(x);assert.equal(made.ok,true,made.reason);
 const entry=made.entry;
 const settled={...x.quote,yesBid:100,yesAsk:100,status:'settled',result:'yes'};
 const first=profitGuardDecision(entry,settled,x.s);
 const second=profitGuardDecision(entry,settled,{...x.s,greatHornMaxSpreadCents:3});
 assert.deepEqual(first,second);assert.equal(first.action,'settlement');assert.equal(first.exitPriceCents,100);
 const losing={...x.quote,yesBid:45,yesAsk:50};
 assert.deepEqual(profitGuardDecision(entry,losing,x.s),
   profitGuardDecision(entry,losing,{...x.s,greatHornMaxSpreadCents:99}));
});
test('W2 / other parents, revoked or narrower GH setting cannot produce a capital buy',()=>{
 const x=scenario(settings({greatHornMaxSpreadCents:3}));assert.equal(candidate(x).ok,false);
 assert.equal(verifiedLightningLoss(parent(x.s,{pnlCents:9}),x.s,NOW).ok,false);
 assert.equal(verifiedLightningLoss(parent(x.s,{executionClass:'SHADOW_SAINT'}),x.s,NOW).ok,false);
});

function liveSetup(){const x=scenario(settings({mode:'LIVE',liveArmed:true}));const c=candidate(x);
 assert.equal(c.ok,true,c.reason);c.entry.entryConfig.greatHornOperatorRevision=0;
 return {x,entry:c.entry};
}
async function simulateGuardedLive(entry,x,{freshBid=85,freshAsk=91,bookBid=null,confirmedFreshAt=Date.now(),armed=true,settingsOverride={}}={}){
 let sent=0,preflight=null,rejected=0;
 const readSettings=()=>({...x.s,...settingsOverride,liveArmed:armed});
 const fresh={...x.quote,yesBid:freshBid,yesAsk:freshAsk,quoteAtMs:confirmedFreshAt};
 const book={sequenceValid:true,updatedAtMs:confirmedFreshAt,
  yesBids:[{priceCents:bookBid??freshBid,count:40}],noBids:[{priceCents:100-freshAsk,count:40}]};
 const db={verifyGreatHornLiveIntent:async()=>({ok:true}),rejectGreatHornUnsubmittedIntent:async()=>{rejected++;return {ok:true};}};
 const kalshi={placeOrder:async(_order,options)=>{preflight=await options.beforeDispatch();
   if(!preflight.ok)return {notSubmitted:true,localRejectionReason:preflight.reason};
   const confirmation=options.confirmDispatch();if(!confirmation.ok)return {notSubmitted:true,localRejectionReason:confirmation.reason};
   sent++;return {notSubmitted:false,ambiguous:true};},ensureExchangeBalance:async()=>({ok:true})};
 const market={getQuote:()=>x.quote};
 const strategy={prepareEntryExecution:async()=>({count:entry.count,bestAskCents:freshAsk,verifiedBookAtMs:confirmedFreshAt,
   freshMarket:fresh,executionEvidence:{book}})};
 const result=await dispatchGreatHornLiveIntent({entry,settings:x.s,db,kalshi,market,strategy,
   isLiveReady:()=>true,readSettings,readSafetyRevision:()=>0,audit:async()=>{}});
 return {result,sent,preflight,rejected};
}

// W3: queued broker preflight must use its verified REST bid, not only a cached WS quote.
test('W3 / LIVE confirmation admits 6c only while GH limit is 8c',()=>{
 const {entry,x}=liveSetup();
 assert.equal(greatHornLiveDispatchConfirmation({entry,settings:x.s,quote:x.quote,liveReady:true,now:NOW}).ok,true);
 assert.equal(greatHornLiveDispatchConfirmation({entry,settings:{...x.s,greatHornMaxSpreadCents:3},quote:x.quote,liveReady:true,now:NOW}).ok,false);
});
test('W3 / LIVE queued REST book 21c spread is denied despite cached WS 6c',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x,{freshBid:70});
 assert.equal(probe.preflight.ok,false,JSON.stringify(probe));
 assert.equal(probe.sent,0);
 assert.equal(probe.rejected,1);
});
test('W3 / LIVE REST quote and book bid disagreement denies entry',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x,{freshBid:85,bookBid:70});
 assert.equal(probe.preflight.ok,false);assert.equal(probe.sent,0);
});
test('W3 / LIVE REST quote older than the committed intent denies entry',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x,{confirmedFreshAt:NOW-10_000});
 assert.equal(probe.preflight.ok,false);assert.equal(probe.sent,0);
});
test('W3 / LIVE queued REST book with allowed 6c remains eligible (no real broker)',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x);
 assert.equal(probe.preflight.ok,true,JSON.stringify(probe));assert.equal(probe.sent,1);
});
test('W3 / LIVE queued book changes to higher ask and is denied',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x,{freshAsk:92});
 assert.equal(probe.preflight.ok,false);assert.equal(probe.sent,0);
});
test('W3 / LIVE queued preflight rejects revoked arm',async()=>{
 const {entry,x}=liveSetup();const probe=await simulateGuardedLive(entry,x,{armed:false});
 assert.equal(probe.sent,0);
});

// W4: SQL and in-flight authorization invariants.
test('W4 / PostgreSQL INSERT fence uses independent GH max and rejects excess frozen spread',()=>{
 assert.match(GREAT_HORN_SQL,/coalesce\(\(s->>'greatHornMaxSpreadCents'\)::numeric,\(s->>'maxSpreadCents'\)::numeric,3\)/);
 assert.match(GREAT_HORN_SQL,/NEW\.spread_at_entry_cents/);
 assert.match(GREAT_HORN_SQL,/source_trade_id/);
 assert.match(GREAT_HORN_SQL,/gh1_scoped_parent_watch_or_seat_not_authorized/);
});
test('W4 / changed independent GH setting revokes pending LIVE but shared settings do not',()=>{
 const {entry,x}=liveSetup();const check=changes=>greatHornLiveDispatchConfirmation({entry,
  settings:{...x.s,...changes},quote:x.quote,liveReady:true,now:NOW});
 assert.equal(check({greatHornMaxSpreadCents:7}).ok,false);
 assert.equal(check({maxSpreadCents:1}).ok,true);
});
test('W4 / qualified watch does not override executable book and spread guards',()=>{
 const x=scenario();x.plan.executionEvidence.book.noBids[0].count=0;
 assert.equal(candidate(x).ok,false);
 const y=scenario(settings({greatHornMaxSpreadCents:99}));y.plan.executionEvidence.bookInvalid=true;
 assert.equal(candidate(y).ok,false);
});

// W5: source-scope smoke checks and reproducible release integrity checks happen outside this script.
test('W5 / no new authentication, no altered shared spread, and GH-only LIVE guard',()=>{
 const client=readFileSync(join(root,'public/app.js'),'utf8');
 const config=readFileSync(join(root,'src/config.mjs'),'utf8');
 const live=readFileSync(join(root,'src/greatHornLiveExecution.mjs'),'utf8');
 assert.match(client,/No dashboard operator username\/password/);
 assert.match(client,/operatorFetch=\(url,options=\{\}\)=>fetch\(url,options\)/);
 assert.match(client,/\['greatHornMaxSpreadCents','Max spread','c'\]/);
 assert.match(config,/greatHornMaxSpreadCents/);
 assert.match(live,/greatHornSpreadAllowed/);
});
