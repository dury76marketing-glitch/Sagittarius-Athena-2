#!/usr/bin/env node
// Synthetic LIVE-shaped broker-fill and exit-ledger lifecycle, actual Q17
// ProfitGuard and recovery-parent verification functions; NO PG or broker.
import assert from 'node:assert/strict';
import {ProfitGuard} from '../src/profitGuard.mjs';
import {verifiedLiveCapitalParentEntryFill} from '../src/liveParentEntryProof.mjs';
import {greatHornId,verifiedLightningLoss,greatHornWatchFromLoss} from '../src/greatHornRecovery.mjs';
import {verifiedGreatHornLoss,crystalWallRecoveryWatchFromLoss} from '../src/crystalWallRecovery.mjs';
import {sagittariusArrowId} from '../src/sagittariusArrowRecovery.mjs';
import {verifiedSagittariusArrowLoss,scarletNeedleCapitalWatchFromLoss,scarletNeedleCapitalId} from '../src/scarletNeedleCapitalRecovery.mjs';
import {verifiedScarletNeedleRecoveryLoss,pegasusRyuSeiKenCapitalWatchFromLoss} from '../src/pegasusRyuSeiKenCapitalRecovery.mjs';
import {Q17_SIM_ONLY} from '../src/q17Profile.mjs';
assert.equal(Q17_SIM_ONLY,false);
const now=Date.now();
const s={mode:'LIVE',systemName:'Q17-LAB',ownerId:'LAB',resetTimestampMs:0,
  greatHornEnabled:true,greatHornMultiply:1,greatHornObservationMinutes:0,
  crystalWallRecoveryEnabled:true,crystalWallRecoveryMultiply:1,crystalWallRecoveryObservationMinutes:0,
  scarletNeedleCapitalEnabled:true,scarletNeedleCapitalMultiply:1,scarletNeedleCapitalObservationMinutes:0,
  pegasusRyuSeiKenCapitalEnabled:true,pegasusRyuSeiKenCapitalMultiply:1,pegasusRyuSeiKenCapitalObservationMinutes:0};
const scope={systemName:s.systemName,ownerId:s.ownerId,mode:'LIVE',resetEpoch:0};
const arrowParentId='STARLIGHT-LAB';
const arrowWatchId=sagittariusArrowId(scope,arrowParentId);
const arrowId=sagittariusArrowId(scope,arrowParentId,1,0);
const snWatchId=scarletNeedleCapitalId(scope,arrowId);
const snId=scarletNeedleCapitalId(scope,arrowId,1);
const lpId='LP-LAB';const ghId=greatHornId(scope,lpId,1);
const profiles=[
  {concept:'Lightning Plasma',id:lpId,sourceTradeId:'STARLIGHT-LAB',verify:verifiedLightningLoss,watch:greatHornWatchFromLoss},
  {concept:'Great Horn Recovery',id:ghId,sourceTradeId:lpId,
    extra:{greatHornRecovery:{version:'GH1-LIVE-CAPITAL-V1'}},verify:verifiedGreatHornLoss,watch:crystalWallRecoveryWatchFromLoss},
  {concept:'Sagittarius Arrow Recovery',id:arrowId,sourceTradeId:arrowParentId,
    extra:{sagittariusArrowRecovery:{version:'SA1-LIVE-CAPITAL-V1',seat:1,watchRevision:1,retryAttempt:0,
      capturedSettings:{multiply:1},parentEntryId:arrowParentId,positionId:arrowId,watchId:arrowWatchId,groupId:arrowWatchId}},
    verify:verifiedSagittariusArrowLoss,watch:scarletNeedleCapitalWatchFromLoss},
  {concept:'Scarlet Needle Recovery',id:snId,sourceTradeId:arrowId,
    extra:{scarletNeedleCapitalRecovery:{version:'SN2-LIVE-CAPITAL-V1',seat:1,watchRevision:1,
      capturedSettings:{multiply:1},parentEntryId:arrowId,positionId:snId,watchId:snWatchId,groupId:snWatchId}},
    verify:verifiedScarletNeedleRecoveryLoss,watch:pegasusRyuSeiKenCapitalWatchFromLoss},
];
let cases=0;const diagnostics=[];
for(const p of profiles){
  const entry={id:p.id,sourceTradeId:p.sourceTradeId,conceptName:p.concept,
    executionClass:'CAPITAL',status:'open',mode:'LIVE',ownerId:s.ownerId,systemName:s.systemName,
    ticker:'KXTEST-LAB',eventTicker:'KXTEST',side:'YES',archived:false,
    openedAtMs:now-10000,count:1,remainingCount:1,entryPriceCents:71,entryFeeCents:1,
    exitFeeCents:0,exitFilledCount:0,exitNotionalCents:0,pnlCents:0,
    entryClientOrderId:'sagc-lab-buy-'+p.id,entryOrderId:'BROKER-BUY-'+p.id,
    exitClientOrderId:'sagc-lab-sell-'+p.id,
    exitExecutionState:{appliedFillCount:0},
    entryConfig:{executionClass:'CAPITAL',aurora:{frozen:true},...p.extra,
      entryFillProof:{version:'ENTRY-FILL-REPORT-V1',authoritative:true,filledCount:1,
        averageFillPriceCents:71,feePaidCents:1,orderId:'BROKER-BUY-'+p.id,
        clientOrderId:'sagc-lab-buy-'+p.id,observedAtMs:now-8000}},
  };
  assert.equal(verifiedLiveCapitalParentEntryFill(entry).ok,true);
  const writes=[];
  const guard=Object.create(ProfitGuard.prototype);
  guard.getSettings=()=>({simFeeCents:0});
  guard.isProfitLearningTrade=()=>false;
  guard.isProtectedRunnerExitDecision=()=>false;
  guard.isAthenaExitDecision=()=>false;
  guard.isAtomicThunderExitDecision=()=>false;
  guard.audit=async()=>{};
  guard.completeOpportunityEpisode=async()=>{};
  guard.db={async updateEntry(id,patch,expect){assert.equal(id,p.id);assert(expect);writes.push(patch);}};
  const closed=await guard.applyExitFill(entry,{reason:'hard_stop_loss',peakPriceCents:71,stopPriceCents:60},{
    fillCount:1,fillPriceCents:65,exitFeeCents:1,orderId:'BROKER-SELL-'+p.id,
    exitExecutionState:{terminal:true},clearClientId:true});
  assert.equal(closed.closed,true,`${p.concept} closed flag`);
  const row={...entry,...writes.at(-1)};
  assert.equal(row.status,'closed');assert.equal(row.pnlCents,-8);
  assert.equal(row.exitFilledCount,1);assert.equal(row.remainingCount,0);
  const v=p.verify(row,s,now+10);
  assert(v.ok,`${p.concept} loss rejected: ${v.reason}`);
  for(const link of [true,false]){
    const flags=p.concept==='Lightning Plasma'?{greatHornLinkEnabled:link}
      :p.concept==='Great Horn Recovery'?{crystalWallRecoveryLinkEnabled:link}
      :p.concept==='Sagittarius Arrow Recovery'?{scarletNeedleCapitalLinkEnabled:link}
      :{pegasusRyuSeiKenCapitalLinkEnabled:link};
    const watch=p.watch(v,{...s,...flags},now+10);
    assert(watch.ok,`${p.concept} child watch: ${watch.reason}`);
    assert.equal(watch.watch.link,link);
    cases++;
  }
  const absent={...row,entryConfig:{...row.entryConfig,entryFillProof:{...row.entryConfig.entryFillProof,authoritative:false}}};
  assert.equal(p.verify(absent,s,now+10).ok,false,`${p.concept} forged parent fill accepted`);
  cases++;
  diagnostics.push({parent:p.concept,netCents:row.pnlCents,verifiedLoss:true,linkOn:true,linkOff:true});
}
console.log(JSON.stringify({test:'Q17_REAL_PRODUCTION_EXIT_TO_NEXT_RECOVERY_WATCH',kind:'MOCKED_FINANCIAL_LIFECYCLE',passed:cases,failed:0,diagnostics,realBrokerOrders:0,nativeDatabaseTests:0}));
