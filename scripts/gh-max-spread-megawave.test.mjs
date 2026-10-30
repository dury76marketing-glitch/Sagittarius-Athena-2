#!/usr/bin/env node
// GH-SPREAD-MW1. Offline read-only regression tests. No database, broker,
// real market connectivity, or production settings updates are performed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {originalSettings,freshInstallSettings,sanitizeRuntimeSettings,factoryOperatorSettingsPatch,EDITABLE_NUMERIC_SETTINGS} from '../src/config.mjs';
import {verifiedLightningLoss,greatHornWatchFromLoss,greatHornObservationStep,greatHornSeatPlan,greatHornSpreadAllowed,GREAT_HORN_SQL} from '../src/greatHornRecovery.mjs';
import {createGreatHornCapitalEntry,greatHornSettingsFingerprint} from '../src/greatHornSimCapital.mjs';
import {greatHornLiveDispatchConfirmation} from '../src/greatHornLiveExecution.mjs';
import {statisticsFromRows} from '../src/executionReporting.mjs';
import {SagittariusEngine} from '../src/engine.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const currentTime=Date.now();
function settings(overrides={}){
 return {...sanitizeRuntimeSettings({...freshInstallSettings(),
   mode:'SIMULATION',systemName:'MW1-SYS',ownerId:'MW1-OWNER',
   resetTimestampMs:currentTime-300_000,greatHornEnabled:true,greatHornLinkEnabled:true,
   greatHornMaxSpreadCents:8,maxSpreadCents:3,greatHornStakeCents:1000,
   greatHornMultiply:2,simFeeCents:2,galacticExplosionEnabled:true,
   infinityBreakMaximumBookAgeMs:5000,engineActive:true,
   greatHornMinEntryCents:50,greatHornMaxEntryCents:90,
   greatHornAthenaX1Enabled:true}),...overrides};
}
function parent(s=settings(),overrides={}){
 return {id:'LP-MW1-LOSS',conceptName:'Lightning Plasma',executionClass:'CAPITAL',
   entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true},side:'YES'},
   systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,
   archived:false,status:'closed',openedAtMs:currentTime-100_000,closedAtMs:currentTime-10000,
   ticker:'KX-MW1-GAME',eventTicker:'KX-MW1-GAME',side:'YES',
   count:5,remainingCount:0,exitFilledCount:5,entryPriceCents:85,exitPriceCents:29,
   entryFeeCents:0,exitFeeCents:0,exitNotionalCents:145,pnlCents:-280,
   ...(s.mode==='LIVE'?{entryOrderId:'ORDER-ENTRY',exitOrderId:'ORDER-EXIT',exitExecutionState:{terminal:true}}:{}),
   ...overrides};
}
function scenario(s=settings(),{bid=85,ask=91,quoteAtMs=currentTime-400,bookCount=50,watchOverride={}}={}){
 const lp=parent(s);
 const proof=verifiedLightningLoss(lp,s,currentTime);
 assert.equal(proof.ok,true,`verified loss: ${proof.reason}`);
 const watch0=greatHornWatchFromLoss(proof,s,currentTime);
 assert.equal(watch0.ok,true);
 const quote={ticker:lp.ticker,eventTicker:lp.eventTicker,yesBid:bid,yesAsk:ask,quoteAtMs,
   status:'active',title:'Synthetic Great Horn regression',bookInvalid:false,volume24h:20};
 const observed=greatHornObservationStep(watch0.watch,quote,s,currentTime);
 assert.equal(observed.ok,true);
 assert.equal(observed.changed,true,`watch observation: ${observed.reason}`);
 const watch={...observed.watch,...watchOverride};
 const book={sequenceValid:true,noBids:[{priceCents:100-ask,count:bookCount}]};
 const plan={count:1,averagePriceCents:ask,bestAskCents:ask,verifiedBookAtMs:quoteAtMs,
   existingGroupQuantity:0,availableAtLimitCount:bookCount,
   executionEvidence:{book,executable:true,bookInvalid:false}};
 return {s,lp,watch,quote,plan};
}
function build(x,seat=1){
 return createGreatHornCapitalEntry({watch:x.watch,parent:x.lp,quote:x.quote,plan:x.plan,
   settings:x.s,seat,clientOrderId:x.s.mode==='LIVE'?'GH-CLIENT-ORDER-0001':null,now:currentTime});
}

// Wave 1: authority, migration, card, and numerical gate.
test('W1 / factory GH spread starts at existing safe 3 cents',()=>{
 assert.equal(originalSettings().greatHornMaxSpreadCents,3);
 assert.equal(freshInstallSettings().greatHornMaxSpreadCents,3);
 assert.equal(factoryOperatorSettingsPatch().greatHornMaxSpreadCents,3);
 assert.ok(EDITABLE_NUMERIC_SETTINGS.includes('greatHornMaxSpreadCents'));
});
test('W1 / existing persisted cards migrate from previous shared limit exactly once',()=>{
 const legacy=freshInstallSettings();delete legacy.greatHornMaxSpreadCents;legacy.maxSpreadCents=6;
 assert.equal(sanitizeRuntimeSettings(legacy).greatHornMaxSpreadCents,6);
 const migrated={...sanitizeRuntimeSettings(legacy),maxSpreadCents:2};
 assert.equal(sanitizeRuntimeSettings(migrated).greatHornMaxSpreadCents,6);
 assert.equal(sanitizeRuntimeSettings({...legacy,greatHornMaxSpreadCents:0}).greatHornMaxSpreadCents,0);
});
test('W1 / only GH is admitted through independently wider spread',()=>{
 const shared3Gh8=settings();
 assert.equal(greatHornSpreadAllowed({yesBid:85,yesAsk:91},shared3Gh8),true);
 assert.equal(greatHornSpreadAllowed({yesBid:85,yesAsk:91},{...shared3Gh8,greatHornMaxSpreadCents:3,maxSpreadCents:12}),false);
 assert.equal(greatHornSpreadAllowed({yesBid:85,yesAsk:93},shared3Gh8),true);
 assert.equal(greatHornSpreadAllowed({yesBid:85,yesAsk:94},shared3Gh8),false);
});
test('W1 / GH rejects invalid spread settings, invalid quotes, and impossible quotes',()=>{
 for(const limit of [-1,100,2.5,NaN,Infinity]){
   assert.equal(greatHornSpreadAllowed({yesBid:85,yesAsk:91},settings({greatHornMaxSpreadCents:limit})),false);
 }
 for(const quote of [{yesBid:85,yesAsk:100},{yesBid:85,yesAsk:84},
   {yesBid:0,yesAsk:5},{yesBid:NaN,yesAsk:91},{yesBid:85,yesAsk:Infinity}]){
   assert.equal(greatHornSpreadAllowed(quote,settings()),false);
 }
 assert.equal(greatHornSpreadAllowed({yesBid:91,yesAsk:91},settings({greatHornMaxSpreadCents:0})),true);
});
test('W1 / GH fingerprint owns independent setting, not shared spread',()=>{
 const s=settings();const fp=greatHornSettingsFingerprint(s);
 assert.equal(fp,greatHornSettingsFingerprint({...s,maxSpreadCents:1}));
 assert.notEqual(fp,greatHornSettingsFingerprint({...s,greatHornMaxSpreadCents:7}));
 assert.notEqual(fp,greatHornSettingsFingerprint({...s,greatHornLinkEnabled:false}));
});
test('W1 / dashboard UI control, backend guard, and SQL fence use GH field',()=>{
 const ui=readFileSync(join(root,'public/app.js'),'utf8');
 assert.match(ui,/\['greatHornMaxSpreadCents','Max spread','c'\]/);
 assert.match(ui,/key==='greatHornMaxSpreadCents'\)\{minimum=0;maximum=99/);
 assert.match(ui,/GH1_REQUIRED_SETTINGS=[\s\S]*?'greatHornMaxSpreadCents'/);
 assert.match(GREAT_HORN_SQL,/greatHornMaxSpreadCents/);
 assert.match(GREAT_HORN_SQL,/NEW\.spread_at_entry_cents/);
});
test('W1 / actual runtime settings patch accepts only safe GH integers',async()=>{
 const engine=Object.create(SagittariusEngine.prototype);
 engine.settings=settings();engine.runtimeSettingsSafetyRevision=0;
 engine.persistRuntimeSettings=async(next)=>({settings:next,superseded:false});
 engine.invalidateStateSnapshot=()=>{};
 engine.db={audit:async()=>{}};
 const updated=await engine.applySettingsPatch({greatHornMaxSpreadCents:8});
 assert.equal(updated.greatHornMaxSpreadCents,8);
 assert.equal(updated.maxSpreadCents,3);
 engine.settings=updated;
 for(const bad of [-1,100,5.5,'not-a-number',null,'']){
   await assert.rejects(()=>engine.applySettingsPatch({greatHornMaxSpreadCents:bad}));
 }
});

// Wave 2: verified loss -> durable watch -> complete executable SIM entry ->
// identical profit/settlement accounting and other controls still binding.
test('W2 / verified loss required; no profit, wrong scope or shadow parent may arm GH',()=>{
 const s=settings();
 for(const p of [parent(s,{pnlCents:1}),parent(s,{status:'open'}),
   parent(s,{executionClass:'SHADOW_SAINT'}),parent(s,{ownerId:'OTHER'})]){
   assert.equal(verifiedLightningLoss(p,s,currentTime).ok,false);
 }
});
test('W2 / verified LP 29c loss arms durable Link ON GH watch without new broker rights',()=>{
 const x=scenario();
 assert.equal(x.watch.qualified,true);
 assert.equal(x.watch.status,'WATCHING');
 assert.equal(x.watch.parentConcept,'Lightning Plasma');
 assert.equal(x.watch.verifiedLosingExitPriceCents,29);
 assert.equal(x.watch.lastAskCents,91);
 assert.equal(x.watch.link,true);
});
test('W2 / GH admits 6-cent spread on Link ON with independent 8c max, SIM entry frozen and protected',()=>{
 const x=scenario();const result=build(x);
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.entry.entryPriceCents,91);
 assert.equal(result.entry.spreadAtEntryCents,6);
 assert.equal(result.entry.entryConfig.aurora.frozen,true);
 assert.equal(result.entry.entryConfig.greatHornSettingsFingerprint,greatHornSettingsFingerprint(x.s));
 assert.equal(result.entry.conceptName,'Great Horn Recovery');
 assert.equal(result.entry.status,'open');
 assert.equal(result.entry.sourceTradeId,x.lp.id);
});
test('W2 / narrower independent GH max still rejects, regardless of shared limit',()=>{
 const x=scenario(settings({greatHornMaxSpreadCents:3,maxSpreadCents:12}));
 const result=build(x);assert.equal(result.ok,false);assert.equal(result.reason,'gh_excessive_spread');
});
test('W2 / no price-band bypass under Link OFF; Link ON remains unchanged',()=>{
 const link=scenario(settings({greatHornMinEntryCents:50,greatHornMaxEntryCents:90}),{ask:91,bid:85});
 assert.equal(build(link).ok,true);
 const off=settings({greatHornLinkEnabled:false,greatHornObservationMinutes:0,
   greatHornMinCrashCents:0,greatHornMinReboundCents:0,greatHornMinUpwardTicks:0});
 const wrong=scenario(off,{ask:91,bid:85});
 assert.equal(wrong.watch.qualified,false);
 assert.equal(build(wrong).ok,false);
});
test('W2 / missing executable book depth remains a hard denial even with GH spread 99',()=>{
 const x=scenario(settings({greatHornMaxSpreadCents:99}),{bookCount:0});
 assert.equal(build(x).ok,false);
 const y=scenario(settings({greatHornMaxSpreadCents:99}),{bookCount:50});
 y.plan.executionEvidence.bookInvalid=true;
 assert.equal(build(y).ok,false);
});
test('W2 / Multiply seats bounded; no duplicate or extra seat',()=>{
 const x=scenario();
 assert.deepEqual(greatHornSeatPlan(x.watch,[{seat:1}]).free,[2]);
 assert.equal(greatHornSeatPlan(x.watch,[{seat:1},{seat:1}]).ok,false);
 assert.equal(build(x,3).ok,false);
});
test('W2 / entry-to-close financial reporting remains consistent with unchanged exit doctrine',()=>{
 const x=scenario();const made=build(x);
 assert.equal(made.ok,true,made.reason);
 const e=made.entry;const exitCents=96,exitFeeCents=2;
 const closed={...e,status:'closed',remainingCount:0,closedAtMs:currentTime,
   exitPriceCents:exitCents,exitNotionalCents:exitCents*e.count,
   exitFeeCents,exitFilledCount:e.count,
   pnlCents:exitCents*e.count-e.entryPriceCents*e.count-e.entryFeeCents-exitFeeCents};
 const report=statisticsFromRows([closed],x.s,{now:currentTime});
 assert.equal(report.byAttack['Great Horn Recovery'].closed,1);
 assert.equal(report.byAttack['Great Horn Recovery'].wins,1);
 assert.equal(report.byAttack['Great Horn Recovery'].realizedCents,closed.pnlCents);
 assert.equal(report.byAttack['Lightning Plasma'].closed,0);
});

// Wave 3: LIVE pre-dispatch/refusal/revocation and immutable scope, unchanged
// other strategies, and absence of any added authentication middleware.
test('W3 / LIVE recheck accepts GH 6c when its own limit is 8c, does not send orders',()=>{
 const s=settings({mode:'LIVE',liveArmed:true});const x=scenario(s);
 const made=build(x);assert.equal(made.ok,true,made.reason);
 const confirmed=greatHornLiveDispatchConfirmation({entry:made.entry,settings:s,
   quote:x.quote,liveReady:true,now:currentTime});
 assert.equal(confirmed.ok,true,confirmed.reason);
 assert.equal(made.entry.status,'entry_pending');
});
test('W3 / LIVE recheck blocks mid-flight GH spread reduction',()=>{
 const s=settings({mode:'LIVE',liveArmed:true});const x=scenario(s);
 const made=build(x);assert.equal(made.ok,true,made.reason);
 const changed={...s,greatHornMaxSpreadCents:3};
 assert.equal(greatHornLiveDispatchConfirmation({entry:made.entry,settings:changed,
   quote:x.quote,liveReady:true,now:currentTime}).ok,false);
});
test('W3 / shared spread changed independently does not silently revoke GH LIVE quote',()=>{
 const s=settings({mode:'LIVE',liveArmed:true});const x=scenario(s);const made=build(x);
 assert.equal(made.ok,true,made.reason);
 const changed={...s,maxSpreadCents:0};
 assert.equal(greatHornLiveDispatchConfirmation({entry:made.entry,settings:changed,
   quote:x.quote,liveReady:true,now:currentTime}).ok,true);
});
test('W3 / LIVE recheck refuses changed ask, stale quote, disarmed or wrong owner',()=>{
 const s=settings({mode:'LIVE',liveArmed:true});const x=scenario(s);const made=build(x);
 assert.equal(made.ok,true,made.reason);
 const samples=[{quote:{...x.quote,yesAsk:92}},{quote:{...x.quote,quoteAtMs:currentTime-50_000}},
   {settings:{...s,liveArmed:false}},{settings:{...s,ownerId:'OTHER'}}];
 for(const update of samples){const decision=greatHornLiveDispatchConfirmation({entry:made.entry,
   settings:s,quote:x.quote,liveReady:true,now:currentTime,...update});
   assert.equal(decision.ok,false);
 }
});
test('W3 / SQL independently checks frozen GH spread and preserves scope/seat/parent',()=>{
 assert.match(GREAT_HORN_SQL,/parentEntryId/);
 assert.match(GREAT_HORN_SQL,/parent_entry_id/);
 assert.match(GREAT_HORN_SQL,/reset_epoch/);
 assert.match(GREAT_HORN_SQL,/greatHornMaxSpreadCents/);
 assert.match(GREAT_HORN_SQL,/NEW\.spread_at_entry_cents/);
 assert.match(GREAT_HORN_SQL,/gh1_scoped_parent_watch_or_seat_not_authorized/);
});
test('W3 / no auth addition, no other-strategy or protective-exit source changes',()=>{
 const app=readFileSync(join(root,'public/app.js'),'utf8');
 assert.match(app,/No dashboard operator username\/password/);
 assert.match(app,/const operatorFetch=\(url,options=\{\}\)=>fetch\(url,options\)/);
 assert.match(app,/\['maxSpreadCents','Shared Max Spread','c'\]/);
 assert.match(app,/\['greatHornMaxSpreadCents','Max spread','c'\]/);
 // Changes in ProfitGuard/doctrine are forbidden by this scope; the final
 // archive audit compares them byte-for-byte to the supplied source baseline.
 assert.ok(createHash('sha256').update(readFileSync(join(root,'src/profitGuard.mjs'))).digest('hex'));
});
