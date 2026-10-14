/** Explicit UNIT fixtures. They are not a substitute for the opt-in PostgreSQL tests. */
import { originalSettings } from '../../src/config.mjs';
import { calculateAuroraSnapshotFromFeeModel, freezingCoffinSnapshot, kalshiGeneralTakerFeeEstimateCents } from '../../src/doctrine.mjs';
import { sealAthenaFireCommand } from '../../src/authority.mjs';
import { SHADOW_PROTOCOL, executionSettingsHash, shadowScope, shadowEntryHash, shadowAdmissionId } from '../../src/shadowProtocol.mjs';
import { SagittariusEngine } from '../../src/engine.mjs';

export function shadowFixture({mode='SIMULATION',concept='Athena Exclamation',count=10,coffin=true,id='R3-PARENT',settings:overrides={}}={}) {
  const now=Date.now();
  const settings={...originalSettings(),systemName:'SAGITTARIUS',ownerId:'r3-test',mode,engineActive:true,
    liveArmed:false,resetTimestampMs:0,maxPositions:1,maxEntriesPerTrade:30,galacticExplosionEnabled:true,
    simFeeCents:2,auroraDamageControlPercent:55,freezingCoffinEnabled:coffin,freezingCoffinMaxDropCents:15,
    crashRecoveryHunterEnabled:true,crashRecoveryHunterLinkEnabled:true,crashRecoveryMinEntryCents:40,
    crashRecoveryMaxEntryCents:85,crashRecoveryHunterAuroraDamageControlPercent:55,...overrides};
  const market=(bid=65,depth=count,at=Date.now())=>({
    quote:{ticker:'R3-T',eventTicker:'R3-E',title:'Unit market',sport:'Tennis',status:'active',result:'',
      yesBid:bid,yesAsk:bid+1,quoteAtMs:at,updatedAtMs:at,quoteObservation:{epoch:'UNIT-STREAM',revision:at}},
    book:{ticker:'R3-T',source:'WS',sequenceValid:true,updatedAtMs:at,
      yesBids:[{priceCents:bid,count:depth}],noBids:[{priceCents:99-bid,count:depth}]} });
  const initial=market(79,count,now);
  const entryFee=mode==='LIVE'?kalshiGeneralTakerFeeEstimateCents({priceCents:80,count}):2*count;
  const source=sealAthenaFireCommand({kind:'LEGACY_QUALIFIED_ENTRY_NOT_ATHENA_FIRE',
    authorizationId:id,systemName:settings.systemName,ticker:'R3-T',eventTicker:'R3-E',concept,
    doctrine:{ok:true},athenaAssessment:{blocked:false},decidedAtMs:now,expiresAtMs:now+5000});
  const config={executionClass:'SHADOW_SAINT',executionSettingsHash:executionSettingsHash(settings),
    legacyQualification:source,finalEntryConfirmation:{ok:true,atMs:now,route:'unit_prequalified'},
    aurora:calculateAuroraSnapshotFromFeeModel({entryPriceCents:80,count,entryFeeCents:entryFee,
      mode,simFeeCents:2,damageControlPercent:55,calculatedAtMs:now}),
    shadowSaint:{version:SHADOW_PROTOCOL,authorization:'VIRTUAL_ENTRY',parentConcept:concept,
      brokerOrderAuthority:false,portfolioCapitalAuthority:false,resetEpoch:0,referenceStakeCents:80*count,
      feeModel:mode==='LIVE'?{kind:'KALSHI_TAKER_ESTIMATE'}:{kind:'SIM_PER_CONTRACT',simFeeCents:2},
      entryExecution:{...initial,limitPriceCents:80,averagePriceCents:80,filled:count}}};
  if(coffin)config.freezingCoffin=freezingCoffinSnapshot({entryPriceCents:80,maxDropCents:15,calculatedAtMs:now});
  const entry={id,systemName:settings.systemName,ownerId:settings.ownerId,mode,conceptName:concept,
    ticker:'R3-T',eventTicker:'R3-E',marketTitle:'Unit market',sport:'Tennis',status:'open',executionClass:'SHADOW_SAINT',
    sourceTradeId:null,sourceFeeder:null,entryPriceCents:80,currentPriceCents:80,peakPriceCents:80,
    stopPriceCents:coffin?65:config.aurora.dangerPriceCents,stopLossCents:coffin?15:config.aurora.stopDistanceCents,
    count,remainingCount:count,entryFeeCents:entryFee,exitFeeCents:0,pnlCents:0,
    openedAtMs:now,updatedAtMs:now,archived:false,shadowEpoch:0,shadowRevision:1,shadowState:{},entryConfig:config};
  entry.id=shadowAdmissionId(entry);entry.shadowEntryHash=shadowEntryHash(entry);
  return {settings,entry,initial,observation:market(),market,scope:shadowScope(settings,1)};
}
export function shadowWorkerFixture(f) {
  const engine=Object.create(SagittariusEngine.prototype),waits=[],commits=[],audits=[];
  engine.settings=f.settings;engine.learning={};
  engine.db={
    captureShadowScope:async()=>f.scope,
    openShadowEntriesPage:async()=>[f.entry],
    recordShadowWait:async(e,_s,reason)=>{waits.push({id:e.id,reason});return {ok:true};},
    commitShadowEvaluation:async(...args)=>{commits.push(args);throw new Error('test forbids unexpected close');},
    pendingShadowStops:async()=>[],audit:async(...args)=>audits.push(args)
  };
  engine.market={getQuote:()=>f.observation.quote,getBook:()=>f.observation.book};
  return {engine,waits,commits,audits};
}
