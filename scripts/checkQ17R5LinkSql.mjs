#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {originalSettings,sanitizeRuntimeSettings,EDITABLE_BOOLEAN_SETTINGS,RELEASE} from '../src/config.mjs';
import {q17LightningPlasmaLinkParityMigration} from '../src/q17LightningPlasmaParity.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
import {starlightRecoverySignalState,hunterEntryBoundaryQualifiedAtQuote} from '../src/strategy.mjs';
import {LP_SHADOW_CONTINUATION_SQL,LP_V5_SQL} from '../src/lightningShadowContinuation.mjs';
import {BUILD_INFO} from '../src/authority.mjs';
import {Q17_RELEASE} from '../src/q17Profile.mjs';
const s={...originalSettings(),mode:'SIMULATION',sagittariusArrowLinkEnabled:true,
  lightningPlasmaLinkEnabled:false,lightningPlasmaMinCrashCents:7,
  lightningPlasmaMinReboundCents:5,lightningPlasmaMinUpwardTicks:3,
  lightningPlasmaMinEntryCents:75,lightningPlasmaMaxEntryCents:85,
  sagittariusArrowMinCrashCents:7,sagittariusArrowMinReboundCents:5,sagittariusArrowMinUpwardTicks:3,
  sagittariusArrowMinEntryCents:75,sagittariusArrowMaxEntryCents:85};
const migrated=q17LightningPlasmaLinkParityMigration(s);
assert.equal(migrated.changed,true);
assert.equal(migrated.settings.lightningPlasmaLinkEnabled,true);
const persisted=sanitizeRuntimeSettings(migrated.settings);
assert.equal(persisted.lightningPlasmaLinkEnabled,true);
assert.equal(persisted.q17LightningPlasmaLinkParityApplied,true);
assert.equal(q17LightningPlasmaLinkParityMigration({...persisted,lightningPlasmaLinkEnabled:false}).settings.lightningPlasmaLinkEnabled,false);
assert.equal(q17LightningPlasmaLinkParityMigration({...persisted,lightningPlasmaLinkEnabled:false}).changed,false);
assert(EDITABLE_BOOLEAN_SETTINGS.includes('lightningPlasmaLinkEnabled'));
assert(!EDITABLE_BOOLEAN_SETTINGS.includes('q17LightningPlasmaLinkParityApplied'));
assert.throws(()=>q17LightningPlasmaLinkParityMigration({...s,mode:'LIVE'}),/requires_simulation/);
assert.equal(RELEASE,BUILD_INFO.id);assert.equal(RELEASE,Q17_RELEASE);
const dashboard=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
assert(dashboard.includes('data-model-key="lightningPlasmaLinkEnabled"'),'Plasma LINK button must target own key');
assert(dashboard.includes('data-model-key="sagittariusArrowLinkEnabled"'),'Arrow LINK button must remain');
for(const link of [false,true]){
  const cfg={...migrated.settings,lightningPlasmaLinkEnabled:link,sagittariusArrowLinkEnabled:link};
  const l= Sagit('Lightning Plasma',cfg,link);
  const a= Sagit('Sagittarius Arrow Recovery',cfg,link);
  for(const k of ['crashRecoveryHunterMinCrashCents','crashRecoveryHunterMinReboundCents','crashRecoveryHunterMinUpwardTicks','crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents'])assert.equal(l[k],a[k],`${k}, link=${link}`);
  const now=Date.now(),at=now-100;
  const watch={armedAtMs:now-1000,releaseAtMs:now-900,expiresAtMs:Number.MAX_SAFE_INTEGER,
   stopPriceCents:70,peakSinceArmCents:70,troughSinceArmCents:70,lastBidCents:70,
   upwardTicks:0,lastQuoteAtMs:0,lastQuoteRevision:0,lastQuoteEpoch:''};
  const q={yesBid:70,yesAsk:71,ticker:'T',eventTicker:'E',status:'active',quoteAtMs:at,
   quoteObservation:{epoch:'Q',revision:1,receivedAtMs:at}};
  const opts={advance:true,liveEpoch:'Q'};
  const p=starlightRecoverySignalState(watch,q,l,now,opts);
  const ar=starlightRecoverySignalState(watch,q,a,now,opts);
  assert.equal(p.qualified,ar.qualified);
  assert.equal(p.qualified,link,'LINK true bypasses geometry/band; OFF preserves it');
  const boundaryLP=hunterEntryBoundaryQualifiedAtQuote('Lightning Plasma',q,cfg);
  const boundaryArrow=hunterEntryBoundaryQualifiedAtQuote('Sagittarius Arrow Recovery',q,cfg);
  assert.equal(boundaryLP.ok,boundaryArrow.ok);
  assert.equal(boundaryLP.ok,link,'LINK strategy-band behavior must be equivalent');
  assert.equal(hunterEntryBoundaryQualifiedAtQuote('Lightning Plasma',{...q,yesAsk:90,yesBid:80},cfg).ok,false,'LINK never overrides spread');
  assert.equal(starlightRecoverySignalState(watch,{...q,quoteAtMs:now-20000},l,now,opts).qualified,false,'LINK never overrides freshness');
}
function Sagit(concept,s,link){const x=SagittariusEngine.prototype.independentGeometrySettings.call({},concept,s);
 if(link){x.crashRecoveryHunterMinCrashCents=0;x.crashRecoveryHunterMinReboundCents=0;x.crashRecoveryHunterMinUpwardTicks=0;x.crashRecoveryMinEntryCents=1;x.crashRecoveryMaxEntryCents=99;}return x;}
// Proof of R4's two-guard bug and the R5 migration ordering:
assert(LP_SHADOW_CONTINUATION_SQL.includes('create trigger sag_lp_v4_entry_guard'));
assert(LP_V5_SQL.includes('drop trigger if exists sag_lp_v4_entry_guard on sag_entries;'));
assert(LP_V5_SQL.includes('create trigger sag_lp_v5_entry_guard'));
assert(LP_V5_SQL.includes("current_setting('sagittarius.independent_recovery_entry',true) is distinct from 'admitted'"));
assert(LP_V5_SQL.includes("NEW.entry_config#>>'{independentRecovery,version}'='INDEPENDENT-ATHENA-LOSS-V2'"));
assert(LP_V5_SQL.includes("w.watch->>'link') is distinct from (s->>'lightningPlasmaLinkEnabled'"));
assert(LP_V5_SQL.includes("p.concept_name is distinct from 'Athena Exclamation'"));
assert(LP_V5_SQL.includes("p.execution_class is distinct from 'SHADOW_SAINT'"));
assert(LP_V5_SQL.includes('sag_shadow_stops_v3'));
const mainDb=readFileSync(new URL('../src/db.mjs',import.meta.url),'utf8');
assert(mainDb.indexOf('client.query(LP_SHADOW_CONTINUATION_SQL)')<mainDb.indexOf('client.query(LP_V5_SQL)'));
assert(mainDb.includes('watch.watch?.link!=='));
const engine=readFileSync(new URL('../src/engine.mjs',import.meta.url),'utf8');
assert(engine.includes('const plasmaLinkParity=q17LightningPlasmaLinkParityMigration(this.settings)'));
assert(engine.includes('independent_link_settings_changed'));
assert(engine.includes('q17_r5_legacy_link_off_restored'));
assert(engine.includes("typeof watch.link!=='boolean' && currentLink===false"));
assert(engine.includes("link:concept==='Lightning Plasma'?s.lightningPlasmaLinkEnabled===true:s.sagittariusArrowLinkEnabled===true"));
assert(!LP_V5_SQL.includes('drop trigger if exists sag_lp_v4_entry_guard on sag_entries;\ndrop trigger if exists sag_lp_v4_entry_guard'));
console.log('Q17-R5 own LINK, migration, strategy parity, freshness/spread safety, independent SQL fence, chain ID: PASS');
