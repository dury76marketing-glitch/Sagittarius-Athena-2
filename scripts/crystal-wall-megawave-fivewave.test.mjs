#!/usr/bin/env node
/** CW1 isolated five-wave checks. Native PostgreSQL, Railway and broker remain outside this local suite. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {freshInstallSettings,sanitizeRuntimeSettings} from '../src/config.mjs';
import {verifiedLightningLoss,greatHornWatchFromLoss,greatHornObservationStep} from '../src/greatHornRecovery.mjs';
import {createGreatHornCapitalEntry} from '../src/greatHornSimCapital.mjs';
import {verifiedGreatHornLoss,crystalWallRecoveryWatchFromLoss,crystalWallRecoveryObservationStep,crystalWallRecoveryAdmissionDecision,crystalWallRecoverySeatPlan,crystalWallRecoverySpreadAllowed,CRYSTAL_WALL_RECOVERY_SQL} from '../src/crystalWallRecovery.mjs';
import {createCrystalWallCapitalEntry,crystalWallRecoverySettingsFingerprint} from '../src/crystalWallSimCapital.mjs';
import {crystalWallRecoveryLiveDispatchConfirmation,dispatchCrystalWallLiveIntent} from '../src/crystalWallLiveExecution.mjs';
import {statisticsFromRows} from '../src/executionReporting.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(join(root,p),'utf8');
const NOW=Date.now(),ticker='KX-CW1-FIVEWAVE',eventTicker=ticker;
function settings(overrides={}){
 return {...sanitizeRuntimeSettings({...freshInstallSettings(),systemName:'CW1-TEST',ownerId:'CW1-OWNER',mode:'SIMULATION',engineActive:true,liveArmed:false,
 resetTimestampMs:NOW-100000,greatHornEnabled:true,greatHornLinkEnabled:true,greatHornStakeCents:1000,greatHornMultiply:5,greatHornMaxSpreadCents:8,
 greatHornMinEntryCents:50,greatHornMaxEntryCents:90,greatHornAuroraDamageControlPercent:20,greatHornMinProfitNetPerOriginalContractCents:1,
 crystalWallRecoveryEnabled:true,crystalWallRecoveryLinkEnabled:true,crystalWallRecoveryStakeCents:1000,crystalWallRecoveryMultiply:5,
 crystalWallRecoveryMaxSpreadCents:8,crystalWallRecoveryMinEntryCents:50,crystalWallRecoveryMaxEntryCents:90,
 crystalWallRecoveryMinProfitNetPerOriginalContractCents:1,crystalWallRecoveryAuroraDamageControlPercent:20,
 maxSpreadCents:3,galacticExplosionEnabled:true,simFeeCents:0}),...overrides};
}
const quote=(bid=85,ask=91,at=NOW-200)=>({ticker,eventTicker,status:'active',yesBid:bid,yesAsk:ask,quoteAtMs:at,bookInvalid:false,result:null,title:'CW1 synthetic market'});
function plan(q=quote(),count=1){const amount=50,book={ticker,updatedAtMs:q.quoteAtMs,sequenceValid:true,yesBids:[{priceCents:q.yesBid,count:amount}],noBids:[{priceCents:100-q.yesAsk,count:amount}]};return {count,averagePriceCents:q.yesAsk,bestAskCents:q.yesAsk,verifiedBookAtMs:q.quoteAtMs,availableAtLimitCount:amount,existingGroupQuantity:0,executionEvidence:{book,executable:true,bookInvalid:false}};}
function lpParent(s){return {id:'LP-CW1-ORIGINAL',systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,conceptName:'Lightning Plasma',executionClass:'CAPITAL',
 entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true},side:'YES'},ticker,eventTicker,status:'closed',archived:false,
 openedAtMs:NOW-65000,closedAtMs:NOW-50000,entryPriceCents:85,exitPriceCents:29,entryFeeCents:0,exitFeeCents:0,
 exitNotionalCents:145,pnlCents:-280,count:5,remainingCount:0,exitFilledCount:5,side:'YES',
 ...(s.mode==='LIVE'?{entryOrderId:'LP-ENTRY-RECEIPT',exitOrderId:'LP-EXIT-RECEIPT',exitExecutionState:{terminal:true}}:{})};}
function scenario(s=settings()){
 const lp=lpParent(s),original=verifiedLightningLoss(lp,s,NOW);assert.equal(original.ok,true,original.reason);
 const gw=greatHornWatchFromLoss(original,s,NOW);assert.equal(gw.ok,true,gw.reason);
 const gq=quote(85,91,NOW-30000),go=greatHornObservationStep(gw.watch,gq,s,NOW-29000);
 assert.equal(go.ok,true,go.reason);
 const gh=createGreatHornCapitalEntry({watch:go.watch,parent:lp,quote:gq,plan:plan(gq),settings:s,seat:1,now:NOW-29000,clientOrderId:s.mode==='LIVE'?'GH1-CW1-TEST-CLIENT':null});
 assert.equal(gh.ok,true,gh.reason);
 const loss={...gh.entry,status:'closed',archived:false,remainingCount:0,exitFilledCount:gh.entry.count,exitPriceCents:29,
 exitNotionalCents:29*gh.entry.count,exitFeeCents:0,pnlCents:(29-gh.entry.entryPriceCents)*gh.entry.count-gh.entry.entryFeeCents,
 closedAtMs:NOW-12000,entryClientOrderId:s.mode==='LIVE'?gh.entry.entryClientOrderId:null,
 ...(s.mode==='LIVE'?{entryOrderId:'GH1-ENTRY-PROOF',exitOrderId:'GH1-EXIT-PROOF',exitExecutionState:{terminal:true},entryConfig:{...gh.entry.entryConfig,entryFillProof:{authoritative:true}}}:{})};
 const verified=verifiedGreatHornLoss(loss,s,NOW);assert.equal(verified.ok,true,verified.reason);
 const made=crystalWallRecoveryWatchFromLoss(verified,s,NOW);assert.equal(made.ok,true,made.reason);
 const cq=quote(85,91,NOW-500),o=crystalWallRecoveryObservationStep(made.watch,cq,s,NOW);
 assert.equal(o.ok,true,o.reason);assert.equal(o.watch.qualified,true,o.reason);
 const candidate=createCrystalWallCapitalEntry({watch:o.watch,parent:loss,quote:cq,plan:plan(cq),settings:s,seat:1,now:NOW,clientOrderId:s.mode==='LIVE'?'CW1-TEST-CLIENT-ORDER':null});
 return {s,lp,gh:loss,watch:o.watch,cq,candidate,verified};
}
// WAVE 1: Settings, migration, identity and noninterference.
test('W1 / fresh factory clones GH card values, CW1 remains explicitly disabled',()=>{
 const defaults=freshInstallSettings();
 assert.equal(defaults.crystalWallRecoveryEnabled,false);
 for(const [cw,gh] of [['crystalWallRecoveryMaxSpreadCents','greatHornMaxSpreadCents'],['crystalWallRecoveryMultiply','greatHornMultiply'],['crystalWallRecoveryStakeCents','greatHornStakeCents'],['crystalWallRecoveryLinkEnabled','greatHornLinkEnabled'],['crystalWallRecoveryAthenaX1Enabled','greatHornAthenaX1Enabled'],['crystalWallRecoveryAuroraDamageControlPercent','greatHornAuroraDamageControlPercent']])assert.equal(defaults[cw],defaults[gh],cw);
});
test('W1 / old persisted settings inherit current Great Horn card once, not global spread',()=>{
 const old=settings({greatHornMaxSpreadCents:6,maxSpreadCents:2,greatHornMultiply:4});
 for(const k of Object.keys(old))if(k.startsWith('crystalWallRecovery'))delete old[k];
 const migrated=sanitizeRuntimeSettings(old);
 assert.equal(migrated.crystalWallRecoveryMaxSpreadCents,6);
 assert.equal(migrated.crystalWallRecoveryMultiply,4);
 assert.equal(migrated.crystalWallRecoveryEnabled,false);
 assert.equal(sanitizeRuntimeSettings({...migrated,greatHornMaxSpreadCents:1}).crystalWallRecoveryMaxSpreadCents,6);
 // Chain migration: GH must inherit the shared legacy limit before CW clones GH.
 const first={...old,maxSpreadCents:7};delete first.greatHornMaxSpreadCents;
 const chain=sanitizeRuntimeSettings(first);
 assert.equal(chain.greatHornMaxSpreadCents,7);assert.equal(chain.crystalWallRecoveryMaxSpreadCents,7);
});
test('W1 / spread independence, fingerprint and legacy Crystal Wall identity',()=>{
 const s=settings();assert.equal(s.maxSpreadCents,3);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(),s),true);
 assert.equal(crystalWallRecoverySpreadAllowed(quote(),{...s,crystalWallRecoveryMaxSpreadCents:3,maxSpreadCents:20}),false);
 assert.notEqual(crystalWallRecoverySettingsFingerprint(s),crystalWallRecoverySettingsFingerprint({...s,crystalWallRecoveryMaxSpreadCents:7}));
 assert.equal(crystalWallRecoverySettingsFingerprint(s),crystalWallRecoverySettingsFingerprint({...s,greatHornMaxSpreadCents:99}));
 assert.ok(read('public/app.js').includes("{legacy:'Recovery Hunter',name:'Recovery Hunter (legacy CI1)'"));
 assert.ok(read('public/app.js').includes("{legacy:'Crystal Wall Recovery',name:'Crystal Wall — GH recovery'"));
});
// WAVE 2: Parent authorization and durable observations.
test('W2 / complete Lightning loss -> Great Horn loss -> unique CW1 watch',()=>{
 const x=scenario();assert.equal(x.candidate.ok,true,x.candidate.reason);assert.equal(x.candidate.entry.sourceTradeId,x.gh.id);
 assert.equal(x.candidate.entry.conceptName,'Crystal Wall Recovery');
 assert.equal(x.candidate.entry.entryConfig.crystalWallRecovery.parentEntryId,x.gh.id);
 assert.equal(x.candidate.entry.entryConfig.crystalWallRecovery.version,'CW1-SIM-CAPITAL-V2');
 assert.notEqual(x.candidate.entry.id,x.gh.id);
});
test('W2 / only financially closed genuine Great Horn losses arm Crystal Wall',()=>{
 const x=scenario();assert.equal(verifiedGreatHornLoss({...x.gh,conceptName:'Lightning Plasma'},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,conceptName:'Recovery Hunter'},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,pnlCents:10},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,remainingCount:1,status:'open'},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,exitNotionalCents:0},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,ownerId:'OTHER-OWNER'},x.s,NOW).ok,false);
 assert.equal(verifiedGreatHornLoss({...x.gh,entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true}}},x.s,NOW).ok,false);
});
test('W2 / invalid market, stale quote, pre-loss quote cannot qualify',()=>{
 const x=scenario(),bad=crystalWallRecoveryObservationStep({...x.watch,lastQuoteAtMs:0},quote(85,91,NOW-15000),x.s,NOW);
 assert.equal(bad.watch.qualified,true); // duplicate stale handled as no change; must preserve prior verified status
 const since=crystalWallRecoveryWatchFromLoss(x.verified,x.s,NOW).watch;
 assert.equal(crystalWallRecoveryObservationStep(since,quote(85,91,NOW-15000),x.s,NOW).changed,false);
 assert.equal(crystalWallRecoveryObservationStep(since,{...quote(),status:'settled',result:'yes'},x.s,NOW).watch.status,'BLOCKED');
 assert.equal(crystalWallRecoveryObservationStep(since,{...quote(),ticker:'OTHER'},x.s,NOW).changed,false);
});
test('W2 / Link ON bypasses price band only; Link OFF enforces own configured card',()=>{
 const x=scenario(settings({crystalWallRecoveryMaxEntryCents:90,crystalWallRecoveryMinEntryCents:60}));
 assert.equal(x.candidate.ok,true,'Link should bypass 91c price out of band');
 const off=settings({crystalWallRecoveryLinkEnabled:false,crystalWallRecoveryMinEntryCents:60,crystalWallRecoveryMaxEntryCents:90,crystalWallRecoveryObservationMinutes:0,crystalWallRecoveryMinCrashCents:0,crystalWallRecoveryMinReboundCents:0,crystalWallRecoveryMinUpwardTicks:0});
 const initial=crystalWallRecoveryWatchFromLoss(x.verified,off,NOW);
 assert.equal(initial.ok,true);
 const observed=crystalWallRecoveryObservationStep(initial.watch,x.cq,off,NOW);
 assert.equal(observed.watch.qualified,false);
 assert.equal(observed.watch.lastSignalReason,'cw1_entry_band');
});
// WAVE 3: SIM sizing, safety and ledger calculations.
test('W3 / Spread remains mandatory even when Link ON, irrespective of other attacks',()=>{
 const x=scenario(settings({crystalWallRecoveryMaxSpreadCents:3,greatHornMaxSpreadCents:8,maxSpreadCents:99}));
 assert.equal(x.candidate.ok,false);assert.equal(x.candidate.reason,'cw_excessive_spread');
});
test('W3 / seats do not duplicate, exceed Multiply or reuse consumed ones',()=>{
 const x=scenario(),seat=crystalWallRecoverySeatPlan(x.watch,[{seat:1},{seat:3}]);
 assert.equal(seat.ok,true);assert.deepEqual(seat.free,[2,4,5]);
 assert.equal(crystalWallRecoverySeatPlan(x.watch,[{seat:1},{seat:1}]).ok,false);
 assert.equal(crystalWallRecoverySeatPlan(x.watch,[{seat:6}]).ok,false);
 assert.notEqual(crystalWallRecoveryAdmissionDecision({watch:x.watch,seat:2,settings:x.s,quote:x.cq,parent:x.gh,now:NOW}).positionId,x.candidate.entry.id);
 assert.equal(crystalWallRecoveryAdmissionDecision({watch:x.watch,seat:6,settings:x.s,quote:x.cq,parent:x.gh,now:NOW}).ok,false);
});
test('W3 / depth proof, fee/frozen Aurora and isolated capital reports',()=>{
 const x=scenario();assert.equal(x.candidate.ok,true,x.candidate.reason);
 assert.equal(x.candidate.entry.entryConfig.aurora.frozen,true);
 assert.equal(x.candidate.entry.spreadAtEntryCents,6);
 assert.equal(createCrystalWallCapitalEntry({watch:x.watch,parent:x.gh,quote:x.cq,plan:plan(x.cq,51),settings:x.s,seat:2,now:NOW}).ok,false);
 const closed={...x.candidate.entry,status:'closed',remainingCount:0,closedAtMs:NOW,exitPriceCents:100,exitFilledCount:1,exitNotionalCents:100,exitFeeCents:0,pnlCents:100-x.candidate.entry.entryPriceCents-x.candidate.entry.entryFeeCents};
 const report=statisticsFromRows([closed,x.gh],x.s,{now:NOW});
 assert.equal(report.byAttack['Crystal Wall Recovery'].wins,1);
 assert.equal(report.byAttack['Crystal Wall Recovery'].realizedCents,closed.pnlCents);
 assert.equal(report.byAttack['Great Horn Recovery'].losses,1);
 assert.equal(report.byAttack['Lightning Plasma'].closed,0);
});
test('W3 / real engine SIM seat admission uses fresh quote and CW1 atomic DB method only',async()=>{
 const x=scenario(),engine=Object.create(SagittariusEngine.prototype),inserted=[];
 engine.settings=x.s;engine.running=true;engine.shuttingDown=false;
 engine.simulationMutationGate={capture:()=>({epoch:1}),enter:()=>()=>{},blocked:false};
 engine.strategy={prepareEntryExecution:async()=>{},onHunterOpened:()=>{}};
 engine.profitGuard={registerInfinityBreakFastWake:()=>{}};
 engine.recordCrystalWallDecision=async()=>{};
 engine.market={
  async verifyTickerSnapshot(){return {quote:{...x.cq,quoteAtMs:Date.now()-40},book:{...plan(x.cq).executionEvidence.book,updatedAtMs:Date.now()-40},marketFresh:true,bookFresh:true};},
  executableAskFromBook(book,requested,limit){return {filled:Math.min(50,requested),avgCents:91,consumedLevels:[]};}
 };
 engine.db={entryById:async()=>x.gh,pool:{query:async sql=>sql.includes('coalesce(sum(e.count)')?{rows:[{contracts:0}],rowCount:1}:{rows:[],rowCount:0}},
    insertCrystalWallSimulationEntry:async entry=>{inserted.push(entry);return {entry};}};
 const result=await engine.executeCrystalWallCapitalSeat(x.watch,x.cq);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(inserted.length,1);
 assert.equal(inserted[0].conceptName,'Crystal Wall Recovery');
 assert.equal(inserted[0].spreadAtEntryCents,6);
});
test('W3 / CW1 entry-only spread edits do not alter frozen Aurora settlement or stop decisions',()=>{
 const x=scenario();assert.equal(x.candidate.ok,true);
 // Protective exits must use the frozen entry config, never the new CW max spread.
 const code=read('src/profitGuard.mjs');
 assert.ok(code.includes("String(entry?.conceptName)==='Crystal Wall Recovery'"));
 assert.ok(!code.includes('crystalWallRecoveryMaxSpreadCents'));
});
test('W3 / default disabling keeps CW1 from placing capital',()=>{
 const x=scenario(),s={...x.s,crystalWallRecoveryEnabled:false};
 assert.equal(createCrystalWallCapitalEntry({watch:x.watch,parent:x.gh,quote:x.cq,plan:plan(x.cq),settings:s,seat:1,now:NOW}).ok,false);
});
// WAVE 4: LIVE release, fresh quote and order book transport.
test('W4 / new Crystal Wall BUY is blocked by a separate LIVE release gate',()=>{
 const engine=read('src/engine.mjs');
 assert.ok(engine.includes("if(live&&process.env.SAGITTARIUS_CW1_LIVE_RELEASE_VERIFIED!=='true')"));
 assert.ok(engine.includes('cw1_live_release_gate_not_verified')); 
});
test('W4 / financially confirmed LIVE Great Horn loss produces CW1 pending intent only',()=>{
 const s=settings({mode:'LIVE',liveArmed:true}),x=scenario(s);
 assert.equal(x.candidate.ok,true,x.candidate.reason);
 assert.equal(x.candidate.entry.status,'entry_pending');
 assert.equal(x.candidate.entry.entryFeeCents,0);
 assert.equal(x.candidate.entry.entryConfig.crystalWallRecovery.authorization,'DURABLE_PENDING_AND_DISPATCH_PROOF_REQUIRED');
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry:x.candidate.entry,settings:s,quote:x.cq,liveReady:true,now:NOW}).ok,true);
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry:x.candidate.entry,settings:{...s,crystalWallRecoveryMaxSpreadCents:3},quote:x.cq,liveReady:true,now:NOW}).ok,false);
 assert.equal(crystalWallRecoveryLiveDispatchConfirmation({entry:x.candidate.entry,settings:s,quote:x.cq,liveReady:false,now:NOW}).ok,false);
});
test('W4 / delayed LIVE dispatch refuses fresh 21c spread without broker send',async()=>{
 const s=settings({mode:'LIVE',liveArmed:true}),x=scenario(s);let brokerSend=0;
 const cached=x.cq;
 const db={verifyCrystalWallLiveIntent:async()=>({ok:true}),rejectCrystalWallUnsubmittedIntent:async()=>({ok:true}),updateEntry:async()=>{throw new Error('unexpected receipt');}};
 const kalshi={placeOrder:async(p,{beforeDispatch})=>{const gate=await beforeDispatch();if(gate.ok){brokerSend++;return {orderId:'UNEXPECTED'};}return {notSubmitted:true,localRejectionReason:gate.reason};},ensureExchangeBalance:async()=>({ok:true})};
 const market={getQuote:()=>cached};
 const bad={...cached,yesBid:70,quoteAtMs:NOW};
 const book={ticker,yesBids:[{priceCents:70,count:40}],noBids:[{priceCents:9,count:40}],sequenceValid:true};
 const strategy={prepareEntryExecution:async()=>({freshMarket:bad,executionEvidence:{book,executable:true},count:1,bestAskCents:91,verifiedBookAtMs:Date.now()})};
 const result=await dispatchCrystalWallLiveIntent({entry:x.candidate.entry,settings:s,db,kalshi,market,strategy,
    isLiveReady:()=>true,readSettings:()=>s,readSafetyRevision:()=>0});
 assert.equal(brokerSend,0);assert.equal(result.notSubmitted,true);
});
test('W4 / SQL fences and native scope guards exist, but are not a PostgreSQL integration test',()=>{
 const src=read('src/db.mjs');
 for(const q of ['CW_LIVE_VERSION','cw1_only_atomic_capital_admission','sag_crystal_wall_recovery_seats_v1','crystalWallRecoverySettingsFingerprint','AUTHORIZED_CW_LIVE_INSERTS'])assert.ok(src.includes(q),q);
 for(const q of ['sag_cw1_pre_certification_insert_fence','p.concept_name<>\'Great Horn Recovery\'','sag_cw1_capital_seat_close_trigger','cw1_scoped_parent_watch_or_seat_not_authorized','cw1_live_and_direct_insert_forbidden'])assert.ok(CRYSTAL_WALL_RECOVERY_SQL.includes(q),q);
});
// WAVE 5: Complete operator and financial integration / unchanged historical identity.
test('W5 / both independent performance panels and three-capital combined dashboard',()=>{
 const html=read('public/index.html'),app=read('public/app.js');
 for(const id of ['greatHornPerformancePanel','crystalWallPerformancePanel','cw1WinRate','cw1Realized','cw1LinkState','crystalWallOpenBody','crystalWallClosedBody'])assert.ok(html.includes(`id="${id}"`),id);
 assert.ok(html.indexOf('id="crystalWallPerformancePanel"')>html.indexOf('id="greatHornPerformancePanel"'));
 assert.ok(app.includes("verifiedCrystalWallRecoveryPerformance"));
 assert.ok(app.includes("renderCrystalWallFinancialDetail(s)"));
 assert.ok(app.includes("'Crystal Wall Recovery'"));
 assert.ok(read('src/db.mjs').includes("and concept_name in ('Lightning Plasma','Great Horn Recovery','Crystal Wall Recovery')"));
});
test('W5 / UI financial verification sums three independent scoped reports and fails closed on mismatch',()=>{
 const app=read('public/app.js');const header=app.slice(0,app.indexOf('function actualAccountBalances(s){'));
 const context={};runInNewContext(header,context);
 const s=settings(),scope={systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetTimestampMs:s.resetTimestampMs};
 const mock=(concept,realized)=>({reportingVersion:concept==='Great Horn Recovery'?'GH1-CAPITAL-REPORT-V1':'CW1-CAPITAL-REPORT-V1',asOfMs:NOW,scope:{...scope,executionClass:'CAPITAL',conceptName:concept},open:0,closed:1,wins:1,losses:0,scratches:0,pending:0,realizedCents:realized,unrealizedCents:0,valuationComplete:true,periodsComplete:{day:true,week:true,month:true,year:true},dayRealizedCents:realized,weekRealizedCents:realized,monthRealizedCents:realized,yearRealizedCents:realized});
 const lp={reportingVersion:'APS2-LIGHTNING-REPORT-V1',asOfMs:NOW,scope:{...scope,executionClass:'CAPITAL',conceptName:'Lightning Plasma'},byAttack:{'Lightning Plasma':{...mock('Great Horn Recovery',100),realizedCents:100}}};
 const state={settings:s,build:{sourceSha256:'a'.repeat(64)},performance:lp,greatHornPerformance:mock('Great Horn Recovery',20),crystalWallRecoveryPerformance:mock('Crystal Wall Recovery',15)};
 let result=context.capitalCombinedPerformance(state);assert.equal(result.available,true,JSON.stringify(result));assert.equal(result.realizedCents,135);assert.equal(result.closed,3);
 result=context.capitalCombinedPerformance({...state,crystalWallRecoveryPerformance:{...state.crystalWallRecoveryPerformance,asOfMs:NOW+1}});assert.equal(result.available,false);
 result=context.capitalCombinedPerformance({...state,crystalWallRecoveryPerformance:{...state.crystalWallRecoveryPerformance,scope:{...scope,executionClass:'CAPITAL',conceptName:'Recovery Hunter'}}});assert.equal(result.available,false);
});
test('W5 / no old Crystal Wall/Recovery Hunter trading behavior renamed and no auth restriction',()=>{
 const app=read('public/app.js'),html=read('public/index.html');
 assert.ok(app.includes("{legacy:'Recovery Hunter',name:'Recovery Hunter (legacy CI1)'"));
 assert.ok(app.includes("{legacy:'Crystal Wall Recovery',name:'Crystal Wall — GH recovery'"));
 assert.ok(!read('src/crystalWallRecovery.mjs').includes('import pg'));
 assert.ok(html.includes('No new operator password') || !html.includes('type="password"'));
 for(const p of ['src/strategy.mjs','src/doctrine.mjs','src/profitGuard.mjs'])assert.ok(read(p).includes('Crystal Wall Recovery'),p);
});
test('W5 / CW1 ledger diagnostics and independent rate limits are present',()=>{
 const server=read('src/server.mjs'),engine=read('src/engine.mjs');
 assert.ok(server.includes('crystalWallRecoveryDiagnostics'));
 assert.ok(server.includes('crystalWallRecoveryObserverStatus'));
 assert.ok(engine.includes('replayCrystalWallMissedParents'));
 assert.ok(engine.includes('armCrystalWallWatchFromClosedGreatHorn'));
 assert.ok(engine.includes('refreshCrystalWallPriorityTickers'));
});
