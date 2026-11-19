#!/usr/bin/env node
import assert from 'node:assert/strict';
import {freshInstallSettings,sanitizeRuntimeSettings} from '../src/config.mjs';
import {q17LightningPlasmaArrowParityMigration,LP_ARROW_PARITY_MAPPINGS} from '../src/q17LightningPlasmaParity.mjs';
import {SagittariusEngine} from '../src/engine.mjs';
import {StrategyEngine,starlightRecoverySignalState} from '../src/strategy.mjs';
import {verifiedLightningLoss,greatHornWatchFromLoss} from '../src/greatHornRecovery.mjs';
import {sagittariusArrowId} from '../src/sagittariusArrowRecovery.mjs';
import {verifiedGreatHornLoss,crystalWallRecoveryWatchFromLoss} from '../src/crystalWallRecovery.mjs';
import {verifiedSagittariusArrowLoss,scarletNeedleCapitalWatchFromLoss,scarletNeedleCapitalId} from '../src/scarletNeedleCapitalRecovery.mjs';
import {verifiedScarletNeedleRecoveryLoss,pegasusRyuSeiKenCapitalWatchFromLoss} from '../src/pegasusRyuSeiKenCapitalRecovery.mjs';
const original=freshInstallSettings();
const input={...original,mode:'SIMULATION',lightningPlasmaEnabled:true,sagittariusArrowEnabled:true,
  lightningPlasmaMinCrashCents:17,lightningPlasmaMinReboundCents:19,lightningPlasmaMinUpwardTicks:7,
  lightningPlasmaMinEntryCents:10,lightningPlasmaMaxEntryCents:32,
  lightningPlasmaAuroraDamageControlPercent:10,lightningPlasmaStarlightScaleInCents:1,
  sagittariusArrowMinCrashCents:0,sagittariusArrowMinReboundCents:0,sagittariusArrowMinUpwardTicks:0,
  sagittariusArrowMinEntryCents:65,sagittariusArrowMaxEntryCents:89,sagittariusArrowAuroraDamageControlPercent:65,
  sagittariusArrowStakeCents:200,sagittariusArrowMultiply:3};
const migrated=q17LightningPlasmaArrowParityMigration(input);
assert(migrated.changed);
for(const [own,arrow] of LP_ARROW_PARITY_MAPPINGS)assert.equal(migrated.settings[own],input[arrow],own);
assert.equal(migrated.settings.lightningPlasmaStarlightScaleInCents,0);
assert.equal(migrated.settings.lightningPlasmaEnabled,true);
assert.equal(migrated.settings.sagittariusArrowEnabled,true);
assert.equal(migrated.settings.mode,'SIMULATION');
const afterRoundtrip=sanitizeRuntimeSettings(migrated.settings);
assert.equal(afterRoundtrip.q17LightningPlasmaArrowParityApplied,true,'migration marker must persist');
const repeat=q17LightningPlasmaArrowParityMigration({...afterRoundtrip,lightningPlasmaMinEntryCents:55});
assert.equal(repeat.changed,false,'a repeat startup must not overwrite subsequent operator edits');
assert.equal(repeat.settings.lightningPlasmaMinEntryCents,55);
assert.throws(()=>q17LightningPlasmaArrowParityMigration({...input,mode:'LIVE'}),/requires_simulation/);
assert.throws(()=>q17LightningPlasmaArrowParityMigration({...input,sagittariusArrowMinEntryCents:null}),/missing_arrow_setting/);
// The engine uses the SAME durable recovery-geometry evaluator for both attacks;
// compare the generated overlays and qualification states after the one-time copy.
const lp=SagittariusEngine.prototype.independentGeometrySettings.call({},'Lightning Plasma',migrated.settings);
const arrow=SagittariusEngine.prototype.independentGeometrySettings.call({},'Sagittarius Arrow Recovery',migrated.settings);
for(const k of ['crashRecoveryHunterMinCrashCents','crashRecoveryHunterMinReboundCents',
 'crashRecoveryHunterMinUpwardTicks','crashRecoveryMinEntryCents','crashRecoveryMaxEntryCents',
 'crashRecoveryHunterObservationMinutes'])assert.equal(lp[k],arrow[k],k);
const now=Date.now();
const baseWatch={armedAtMs:now-2000,releaseAtMs:now-2000,expiresAtMs:Number.MAX_SAFE_INTEGER,
  stopPriceCents:60,peakSinceArmCents:60,troughSinceArmCents:60,upwardTicks:0,
  lastBidCents:60,lastQuoteAtMs:0,lastQuoteEpoch:'',lastQuoteRevision:0};
for(const [index,ask,bid] of [[1,70,69],[2,85,83],[3,95,94]]){
 const quote={ticker:'EVENT-MARKET',eventTicker:'EVENT',status:'active',yesBid:bid,yesAsk:ask,
   quoteAtMs:now-25+index,quoteObservation:{epoch:'E1',liveEpoch:'E1',revision:index,receivedAtMs:now-15+index}};
 const a=starlightRecoverySignalState(baseWatch,quote,lp,now,{advance:true,liveEpoch:'E1'});
 const b=starlightRecoverySignalState(baseWatch,quote,arrow,now,{advance:true,liveEpoch:'E1'});
 assert.equal(a.qualified,b.qualified,`Arrow/Plasma signal must match at ${ask}c`);
 assert.equal(a.reason,b.reason,`Arrow/Plasma denial must match at ${ask}c`);
}
// Retire competing legacy entry routes: even with old feature flags on, the
// capital LP path must use independentRecovery and an Athena shadow-stop proof.
for(const route of [{},{lightningPlasmaScaleIn:true},{starlightModelClone:true},{legacyCompatibility:true}]){
 assert.equal(await StrategyEngine.prototype.createHunter.call({},'Lightning Plasma',{},100,0,route),null);
}
// Doctrinal lineage: only a settled, net-loss, funded SIM Plasma parent may
// arm GH. GH must then lose itself before CW can arm. Shadow/Arrow parents fail.
const settings={...migrated.settings,systemName:'TEST',ownerId:'TEST-OWNER',mode:'SIMULATION',resetTimestampMs:0,
  greatHornEnabled:true,crystalWallRecoveryEnabled:true};
const parent=(concept,config={executionClass:'CAPITAL',aurora:{frozen:true}})=>({
 id:`PARENT-${concept}`,conceptName:concept,executionClass:'CAPITAL',entryConfig:config,
 systemName:'TEST',ownerId:'TEST-OWNER',mode:'SIMULATION',ticker:'T',eventTicker:'E',
 status:'closed',archived:false,count:1,remainingCount:0,exitFilledCount:1,
 entryPriceCents:70,exitPriceCents:40,entryFeeCents:1,exitFeeCents:1,exitNotionalCents:40,
 pnlCents:-32,openedAtMs:now-2000,closedAtMs:now-1000,side:'YES'
});
const plasma=parent('Lightning Plasma');
const verified=verifiedLightningLoss(plasma,settings,now);
assert.equal(verified.ok,true,`LP verified loss: ${verified.reason}`);
assert.equal(greatHornWatchFromLoss(verified,settings,now).ok,true);
assert.equal(verifiedLightningLoss({...plasma,executionClass:'SHADOW_SAINT'},settings,now).ok,false);
assert.equal(verifiedLightningLoss({...plasma,pnlCents:32},settings,now).ok,false);
assert.equal(verifiedLightningLoss(parent('Sagittarius Arrow Recovery'),settings,now).ok,false);
const gh=parent('Great Horn Recovery',{executionClass:'CAPITAL',aurora:{frozen:true},greatHornRecovery:{version:'GH1-SIM-CAPITAL-V2'}});
const ghLoss=verifiedGreatHornLoss(gh,settings,now);
assert.equal(ghLoss.ok,true,`GH verified loss: ${ghLoss.reason}`);
assert.equal(crystalWallRecoveryWatchFromLoss(ghLoss,settings,now).ok,true);
assert.equal(verifiedGreatHornLoss(plasma,settings,now).ok,false);
assert.equal(verifiedSagittariusArrowLoss(plasma,settings,now).ok,false,
  'LP loss cannot arm Arrow->Scarlet chain');
// Independent Arrow->Scarlet->Pegasus recovery remains isolated from LP/GH.
const chainSettings={...settings,scarletNeedleCapitalEnabled:true,pegasusRyuSeiKenCapitalEnabled:true};
const scope={systemName:'TEST',ownerId:'TEST-OWNER',mode:'SIMULATION',resetEpoch:0};
const athenaId='ATHENA-SHADOW-CHAIN2';
const arrowWatchId=sagittariusArrowId(scope,athenaId),arrowId=sagittariusArrowId(scope,athenaId,1,0);
const arrowParent={...parent('Sagittarius Arrow Recovery'),id:arrowId,sourceTradeId:athenaId,
 entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true},sagittariusArrowRecovery:{
   version:'SA1-SIM-CAPITAL-V2',parentEntryId:athenaId,positionId:arrowId,
   watchId:arrowWatchId,groupId:arrowWatchId,seat:1,watchRevision:1,
   retryAttempt:0,capturedSettings:{multiply:1}}}};
const arrowLoss=verifiedSagittariusArrowLoss(arrowParent,chainSettings,now);
assert.equal(arrowLoss.ok,true,`Arrow verified loss: ${arrowLoss.reason}`);
assert.equal(scarletNeedleCapitalWatchFromLoss(arrowLoss,chainSettings,now).ok,true);
const scarletWatchId=scarletNeedleCapitalId(scope,arrowId),scarletId=scarletNeedleCapitalId(scope,arrowId,1);
const scarletParent={...parent('Scarlet Needle Recovery'),id:scarletId,sourceTradeId:arrowId,
 entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true},scarletNeedleCapitalRecovery:{
   version:'SN2-SIM-CAPITAL-V2',parentEntryId:arrowId,positionId:scarletId,
   watchId:scarletWatchId,groupId:scarletWatchId,seat:1,watchRevision:1,
   capturedSettings:{multiply:1}}}};
const scarletLoss=verifiedScarletNeedleRecoveryLoss(scarletParent,chainSettings,now);
assert.equal(scarletLoss.ok,true,`Scarlet verified loss: ${scarletLoss.reason}`);
assert.equal(pegasusRyuSeiKenCapitalWatchFromLoss(scarletLoss,chainSettings,now).ok,true);
assert.equal(verifiedScarletNeedleRecoveryLoss(plasma,chainSettings,now).ok,false);
console.log('Q17-R4 migration, restart, Arrow/LP qualification parity, retired LP routes, and both verified recovery chains: PASS');
