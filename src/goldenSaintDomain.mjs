/**
 * SAGITTARIUS R17 -- GOLDEN SAINTS EXECUTION DOMAIN CONTRACT
 * Domain model for the new constellation architecture.
 * Proofs still require verification at durable PostgreSQL admission.
 *
 * The current R16 starlightRecoverySignalState function remains the oracle.
 * Callers must source Athena authorizations from an authoritative DB reader
 * and must enforce persistence / ownership / no-send invariants at COMMIT.
 */
import {createHash} from 'node:crypto';
import {authorityHash} from './authority.mjs';
import {starlightRecoverySignalState} from './strategy.mjs';
import {verifiedLiveCapitalParentEntryFill} from './liveParentEntryProof.mjs';
import {GOLDEN_SAINTS,GOLDEN_SAINTS_REGULAR,GOLDEN_SAINTS_RECOVERY,
  CARD_FIELDS, goldenSaintTemplate,defaultGoldenSaintCards,validateGoldenSaintCard}
  from './goldenSaintCards.mjs';

export const R17_VERSION='SAGITTARIUS-GOLDEN-SAINTS-R17-DOMAIN-1';
export const REGULAR_SAINTS=GOLDEN_SAINTS_REGULAR;
export const RECOVERY_SAINTS=GOLDEN_SAINTS_RECOVERY;
export const ALL_SAINTS=GOLDEN_SAINTS;
export const R17_ATTACK_PLAN=Object.freeze(ALL_SAINTS.map((name,i)=>Object.freeze({
  number:i+1,name,role:i<10?'REGULAR':i===10?'RECOVERY_1':'RECOVERY_2',
  sourceTemplate:i<10?'Crash Recovery Hunter':i===10?'Great Horn Recovery':'Crystal Wall Recovery',
})));
const allowedModes=new Set(['SIMULATION','LIVE']);
const finite=v=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const numeric=v=>finite(v)?Number(v):NaN;
const compare=(a,b)=>String(a??'')===String(b??'');
const deny=(reason,details={})=>({ok:false,reason,...details});
const seal=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const validString=x=>typeof x==='string'&&x.trim().length>0&&x.length<=256;
const int=(x,lo=0,hi=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=lo&&x<=hi;
const scopeFields=['systemName','ownerId','mode','resetEpoch'];
const cardFields=CARD_FIELDS;

export function validateR17Scope(scope={}){
  if(!validString(scope.systemName)||!validString(scope.ownerId)||!allowedModes.has(scope.mode)||!int(scope.resetEpoch))
    return deny('r17_scope_invalid');
  return {ok:true,scope:{systemName:scope.systemName,ownerId:scope.ownerId,mode:scope.mode,resetEpoch:scope.resetEpoch}};
}
export function strictSameScope(a,b){return scopeFields.every(k=>compare(a?.[k],b?.[k]));}
export function r17InternalConcept(name){if(!ALL_SAINTS.includes(name))throw new Error('r17_unknown_constellation');return `R17:${name}`;}
export function r17SaintName(concept){const raw=String(concept||'');return ALL_SAINTS.includes(raw)?raw:raw.startsWith('R17:')&&ALL_SAINTS.includes(raw.slice(4))?raw.slice(4):null;}
export function saintRole(name){return R17_ATTACK_PLAN.find(x=>x.name===r17SaintName(name))||null;}
export function r17ScopedId(type,scope,parentId,saint,seat=0,generation=0){
  if(!validateR17Scope(scope).ok||!validString(parentId)||!saintRole(saint)||!int(seat,0,20)||!int(generation,0,64))
    throw new Error('r17_scoped_identity_invalid');
  if(!['WATCH','ENTRY','NO_SEND_RETRY'].includes(type))throw new Error('r17_id_type_invalid');
  return `R17-${type}-${seal([R17_VERSION,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,parentId,saint,seat,generation]).slice(0,40)}`;
}

/** Copy the semantics of the Starlight card, not 10 mutable JS engine clones.
 * Each saint owns a separately editable snapshot by value. Do not copy LIVE
 * armed state, credentials, dashboard/persistence metadata or old chain ids.
 */
// Exactly ONE R17 operator schema. The strategy/persistence domain consumes the
// same validator and defaults that config saves; never maintain a second copy.
export function starlightTemplateCard(settings={}){
  return goldenSaintTemplate(settings,'Aries');
}
export function r17ProposedCards(settings={}){
  return defaultGoldenSaintCards(settings);
}
export function r17CardValid(card){return validateGoldenSaintCard(card);}
export function r17CardFingerprint(card){
  if(!r17CardValid(card).ok)throw new Error('r17_invalid_card_fingerprint');
  return seal([R17_VERSION,...cardFields.map(k=>card[k])]);
}

/** A post-Athena event is authorized only by the already database-verified
 * shadow-store authority object AND its exact scoped, authenticated proof.
 * Callers must re-read/lock proof and settings in the same insert transaction.
 */
export function validateAthenaStop({authorization,scope,now=Date.now()}={}){
  if(!validateR17Scope(scope).ok)return deny('r17_athena_scope_invalid');
  const p=authorization?.parent,proof=authorization?.proof;
  if(!p||!proof||!validString(authorization?.proofHash)||authorityHash(proof)!==authorization.proofHash)
    return deny('r17_authenticated_athena_proof_required');
  if(!strictSameScope({...p,resetEpoch:p.shadowEpoch},scope)||!strictSameScope(proof.scope,scope))
    return deny('r17_athena_scope_mismatch');
  if(p.conceptName!=='Athena Exclamation'||p.executionClass!=='SHADOW_SAINT'
    ||p.entryConfig?.executionClass!=='SHADOW_SAINT'||p.archived===true||p.status!=='closed'
    ||p.closeReason!=='hard_stop_loss'||!(numeric(p.pnlCents)<0)||numeric(p.remainingCount)!==0
    ||!(numeric(p.count)>0)||numeric(p.exitFilledCount)!==numeric(p.count))return deny('r17_not_verified_athena_loss');
  if(!compare(proof.parentEntryId,p.id)||!compare(proof.entryHash,p.shadowEntryHash)
    ||proof.authorization!=='VALID_SHADOW_HARD_STOP'||proof.full!==true
    ||numeric(proof.pnlCents)!==numeric(p.pnlCents)||numeric(proof.count)!==numeric(p.count)
    ||numeric(proof.filled)!==numeric(p.count)||numeric(proof.closedAtMs)!==numeric(p.closedAtMs)
    ||!compare(proof.closeReason,p.closeReason)||proof.brokerOrderAuthority===true)
    return deny('r17_athena_proof_lineage_mismatch');
  if(!int(p.closedAtMs,scope.resetEpoch,now)||!validString(p.ticker)||!validString(p.eventTicker)
    ||!(numeric(p.exitPriceCents)>=0&&numeric(p.exitPriceCents)<100)
    ||!(numeric(p.entryPriceCents)>0&&numeric(p.entryPriceCents)<100)
    ||numeric(p.exitPriceCents)!==numeric(proof.exitPriceCents))return deny('r17_athena_time_market_invalid');
  return {ok:true,reason:'verified_athena_stop',parentEntryId:p.id,proofHash:authorization.proofHash,
    scope:{...scope},ticker:p.ticker,eventTicker:p.eventTicker,closedAtMs:p.closedAtMs,
    stopPriceCents:p.exitPriceCents,parentOriginalEntryPriceCents:p.entryPriceCents};
}
export function fanoutAthenaLoss({verifiedStop,cards,now=Date.now()}={}){
  if(!verifiedStop?.ok||verifiedStop.reason!=='verified_athena_stop'||!validateR17Scope(verifiedStop.scope).ok)
    return deny('r17_verified_athena_stop_required');
  const watches=[];
  for(const name of REGULAR_SAINTS){
    const card=cards?.[name];if(!r17CardValid(card).ok)return deny('r17_regular_card_invalid',{saint:name});
    if(card.enabled!==true)continue;
    watches.push(makeWatch({name,scope:verifiedStop.scope,parentId:verifiedStop.parentEntryId,
      proofHash:verifiedStop.proofHash,ticker:verifiedStop.ticker,eventTicker:verifiedStop.eventTicker,
      armedAtMs:verifiedStop.closedAtMs,stopPriceCents:verifiedStop.stopPriceCents,
      parentOriginalEntryPriceCents:verifiedStop.parentOriginalEntryPriceCents,card,now}));
  }
  return {ok:true,watches,created:watches.length,requiredDurability:'per_saint_unique_watch_transaction'};
}
function makeWatch({name,scope,parentId,proofHash,ticker,eventTicker,armedAtMs,stopPriceCents,parentOriginalEntryPriceCents,card,now}){
  const role=saintRole(name).role;
  return {version:R17_VERSION,saint:name,role,parentEntryId:parentId,
    parentProofHash:proofHash,scope:{...scope},ticker,eventTicker,
    authorizationId:r17ScopedId('WATCH',scope,parentId,name),
    status:'ARMED',revision:0,claimAtMs:0,
    armedAtMs,releaseAtMs:armedAtMs+card.observationMinutes*60_000,
    expiresAtMs:Number.MAX_SAFE_INTEGER,stopPriceCents,parentOriginalEntryPriceCents,
    peakSinceArmCents:stopPriceCents,troughSinceArmCents:stopPriceCents,
    lastBidCents:stopPriceCents,lastAskCents:0,lastQuoteAtMs:0,
    lastQuoteEpoch:'',lastQuoteRevision:0,crashConfirmedAtMs:0,upwardTicks:0,
    // Retain the exact card that produced this UNFUNDED observation state.
    // This is not a second owner configuration; it lets a later card edit
    // distinguish an economic change from a change to the observation oracle.
    cardSnapshot:{...card},cardFingerprint:r17CardFingerprint(card),updatedAtMs:now};
}

/** Rebind only an uncommitted watch whose parent was independently re-proved
 * by the repository in its transaction. Identity and the original arm time
 * never move. A changed observation algorithm (or legacy absent snapshot)
 * starts fresh geometry from the real parent stop; it never invents quote
 * provenance, trend ticks or a new waiting period from the edit time.
 */
export function revalidateR17WatchCard({watch,authorizedWatch,card,now=Date.now()}={}){
  if(!watch||watch.status!=='WATCHING'||!authorizedWatch||!r17CardValid(card).ok
    ||card.enabled!==true||!int(now,watch.scope?.resetEpoch||0))
    return deny('r17_card_revision_inputs_invalid');
  const immutable=['version','saint','role','parentEntryId','parentProofHash','ticker',
    'eventTicker','authorizationId','armedAtMs','stopPriceCents','parentOriginalEntryPriceCents'];
  if(immutable.some(k=>!compare(watch[k],authorizedWatch[k]))
    ||!strictSameScope(watch.scope,authorizedWatch.scope)
    ||!compare(watch.regularRootId,authorizedWatch.regularRootId))
    return deny('r17_card_revision_parent_changed');
  const prior=watch.cardSnapshot;
  // minCrash/link change how peak/trough and consecutive ticks were collected.
  // Other card values can be rechecked against the same genuine observations.
  const preserveObservation=r17CardValid(prior).ok
    &&r17CardFingerprint(prior)===watch.cardFingerprint
    &&prior.linkEnabled===card.linkEnabled&&prior.minCrashCents===card.minCrashCents;
  const geometry=['peakSinceArmCents','troughSinceArmCents','lastBidCents','lastAskCents',
    'lastQuoteAtMs','lastQuoteReceivedAtMs','lastQuoteEpoch','lastQuoteRevision',
    'crashConfirmedAtMs','upwardTicks'];
  const revised={...watch,cardSnapshot:{...card},cardFingerprint:r17CardFingerprint(card),
    releaseAtMs:authorizedWatch.releaseAtMs,updatedAtMs:now,
    cardRevalidation:{atMs:now,previousFingerprint:watch.cardFingerprint,
      observationPreserved:preserveObservation}};
  if(!preserveObservation){
    for(const key of geometry){
      if(Object.hasOwn(authorizedWatch,key))revised[key]=authorizedWatch[key];
      else delete revised[key];
    }
    delete revised.qualified;
    delete revised.reason;
  }
  return {ok:true,watch:revised,observationPreserved:preserveObservation};
}

/**
 * All twelve post-parent entries share the R16 Starlight price-observation
 * oracle. Recovery 1/2 reproduce the GH/CW recovery qualification exception:
 * LINK ON bypasses observation, crash, rebound, ticks, band and parent +c,
 * but NOT a fresh, coherent, nonterminal execution book. This is signal
 * eligibility ONLY; no BUY may be dispatched without the separate SQL fence.
 */
export function r17SignalUsingOriginalStarlight({watch,quote,card,now=Date.now(),advance=false,liveEpoch=''}={}){
  const role=saintRole(watch?.saint)?.role;
  if(!watch||watch.version!==R17_VERSION||!['REGULAR','RECOVERY_1','RECOVERY_2'].includes(role)
    ||watch.role!==role||!r17CardValid(card).ok||card.enabled!==true
    ||watch.cardFingerprint!==r17CardFingerprint(card))
    return deny('r17_watch_or_card_invalid');
  if(!['ARMED','WATCHING','EXECUTING'].includes(watch.status))
    return deny('r17_watch_status_unqualified');
  if(String(quote?.ticker||'')!==String(watch.ticker)
    ||String(quote?.eventTicker||quote?.ticker||'')!==String(watch.eventTicker))
    return deny('r17_market_identity_mismatch');
  const rise=Number(card.parentEntryRiseCents);
  const reference=Number(watch.parentOriginalEntryPriceCents),bid=Number(quote?.yesBid);
  if(rise>0&&!(reference>0&&reference<100))
    return deny('r17_verified_parent_original_entry_required');
  // Unlike GH/CW, regular Starlight's +c from the verified ORIGINAL Athena
  // entry stays active even with LINK ON. GH/CW LINK bypasses that +c.
  const link=card.linkEnabled===true;
  const settings={infinityBreakMaximumBookAgeMs:5000,
    crashRecoveryHunterMinCrashCents:link?0:card.minCrashCents,
    crashRecoveryHunterMinReboundCents:link?0:card.minReboundCents,
    crashRecoveryHunterMinUpwardTicks:link?0:card.minUpwardTicks,
    crashRecoveryMinEntryCents:link?1:card.minEntryCents,
    crashRecoveryMaxEntryCents:link?99:card.maxEntryCents};
  const observationWatch=link?{...watch,releaseAtMs:watch.armedAtMs}:watch;
  const signal=starlightRecoverySignalState(observationWatch,quote,settings,now,{advance,liveEpoch});
  // A LINK authorization must still forbid stale/future/invalid market data;
  // the original Starlight oracle is the authoritative observation freshness.
  if(!signal.qualified||!(rise>0)||(link&&role!=='REGULAR'))
    return {ok:true,signal:{...signal,releaseAtMs:watch.releaseAtMs,
      ...(signal.qualified&&link?{reason:role==='REGULAR'?'r17_starlight_link_qualified':'r17_recovery_link_qualified'}:{})}};
  const achieved=bid-reference+1e-9>=rise;
  return {ok:true,signal:{...signal,qualified:achieved,releaseAtMs:watch.releaseAtMs,
    reason:achieved?(link?'r17_starlight_link_qualified':signal.reason):'r17_parent_original_entry_rise_unmet',
    originalParentEntryPriceCents:reference,parentRiseCents:bid-reference,
    minimumParentRiseCents:rise}};
}

/**
 * A persisted strategy observation is not merely a price: it must be proved
 * qualified against the SAME R17 card, price revision, source epoch, receipt
 * time, and geometric Starlight rules again at every capital admission gate.
 *
 * A prior R17 watch without a captured delivery timestamp is intentionally
 * ineligible until a NEW real quote has been observed and persisted. Never
 * invent a receipt timestamp to make an old watch executable.
 */
export function r17PersistedObservationQuote(watch){
  const at=Number(watch?.lastQuoteAtMs||0),received=Number(watch?.lastQuoteReceivedAtMs||0);
  const revision=Number(watch?.lastQuoteRevision||0),epoch=String(watch?.lastQuoteEpoch||'');
  if(!(at>0&&received>0&&revision>0&&epoch))return null;
  return {ticker:watch.ticker,eventTicker:watch.eventTicker,
    yesBid:Number(watch.lastBidCents),yesAsk:Number(watch.lastAskCents),
    status:'active',quoteAtMs:at,updatedAtMs:at,
    quoteObservation:{epoch,liveEpoch:epoch,revision,receivedAtMs:received}};
}
export function r17QualifiedObservationEvidence({watch,card,quote,now=Date.now()}={}){
  if(!watch||!card||!quote||!r17CardValid(card).ok)
    return deny('r17_qualification_inputs_invalid');
  const obs=quote.quoteObservation||{};
  if(Number(watch.lastQuoteAtMs)!==Number(quote.quoteAtMs||quote.updatedAtMs||0)
    ||Number(watch.lastBidCents)!==Number(quote.yesBid)
    ||Number(watch.lastAskCents)!==Number(quote.yesAsk)
    ||Number(watch.lastQuoteReceivedAtMs)!==Number(obs.receivedAtMs)
    ||String(watch.lastQuoteEpoch||'')!==String(obs.epoch||'')
    ||Number(watch.lastQuoteRevision||0)!==Number(obs.revision||0)
    ||!Number.isSafeInteger(Number(obs.revision))||Number(obs.revision)<=0
    ||!(Number(obs.receivedAtMs)>0))return deny('r17_observation_provenance_mismatch');
  const result=r17SignalUsingOriginalStarlight({watch,quote,card,now,advance:false,
    liveEpoch:String(obs.liveEpoch||obs.epoch||'')});
  if(!result.ok||result.signal?.qualified!==true)
    return deny('r17_observation_not_qualified',{qualificationReason:result.signal?.reason||result.reason});
  const signal=result.signal;
  return {ok:true,evidence:{
    version:'R17-STORED-SIGNAL-QUALIFICATION-1',saint:watch.saint,
    role:watch.role,cardFingerprint:watch.cardFingerprint,
    linkEnabled:card.linkEnabled===true,reason:String(signal.reason||'qualified'),
    quoteAtMs:Number(watch.lastQuoteAtMs),quoteReceivedAtMs:Number(obs.receivedAtMs),
    quoteEpoch:String(obs.epoch),quoteRevision:Number(obs.revision),
    bidCents:Number(quote.yesBid),askCents:Number(quote.yesAsk),
    stopPriceCents:Number(watch.stopPriceCents),
    troughSinceArmCents:Number(watch.troughSinceArmCents),
    reboundCents:Number(signal.reboundCents),minimumReboundCents:Number(card.minReboundCents),
    upwardTicks:Number(signal.upwardTicks),minimumUpwardTicks:Number(card.minUpwardTicks),
    crashDepthCents:Number(signal.crashDepthCents),minimumCrashCents:Number(card.minCrashCents),
    parentOriginalEntryCents:Number(watch.parentOriginalEntryPriceCents),
    minimumParentRiseCents:Number(card.parentEntryRiseCents),
    observationReleaseAtMs:Number(watch.releaseAtMs)}};
}

/** Exact net settlement is checked; adverse quotes are never a loss receipt. */
export function verifyR17CapitalNetLoss({entry,scope,expectedRole,now=Date.now()}={}){
  if(!validateR17Scope(scope).ok||!entry)return deny('r17_loss_scope_missing');
  const identity=saintRole(entry.conceptName);
  // A display string is never a capital-entry identity: 'Sagittarius' and
  // 'Gemini' are both meaningful in the preserved pre-Athena legacy universe.
  // Only the independently namespaced R17 capital concept may mint recovery.
  if(!identity||identity.role!==expectedRole)return deny('r17_loss_wrong_parent_stage');
  if(entry.conceptName!==r17InternalConcept(identity.name))return deny('r17_loss_missing_internal_namespace');
  if(!strictSameScope({...entry,resetEpoch:entry.shadowEpoch},scope))return deny('r17_loss_scope_mismatch');
  const saint=r17SaintName(entry.conceptName);
  const stamp=entry.entryConfig?.goldenSaintR17;
  if(stamp?.version!==R17_VERSION||stamp.saint!==saint
    ||stamp.role!==identity.role||!strictSameScope(stamp,scope)
    ||!validString(stamp.parentEntryId)||!validString(stamp.watchAuthorizationId)
    ||!validString(stamp.regularRootId)||stamp.parentEntryId===entry.id)
    return deny('r17_capital_entry_stamp_unverified');
  if(entry.archived===true||entry.executionClass!=='CAPITAL'||entry.entryConfig?.executionClass!=='CAPITAL'
    ||entry.status!=='closed'||numeric(entry.remainingCount)!==0)return deny('r17_capital_not_fully_closed');
  if(!int(entry.openedAtMs,scope.resetEpoch,now)||!int(entry.closedAtMs,entry.openedAtMs,now)
    ||!validString(entry.id)||!validString(entry.ticker)||!validString(entry.eventTicker))
    return deny('r17_loss_identity_or_time_invalid');
  const qty=numeric(entry.count),exitFilled=numeric(entry.exitFilledCount),price=numeric(entry.entryPriceCents);
  const exitPrice=numeric(entry.exitPriceCents),entryFee=numeric(entry.entryFeeCents),exitFee=numeric(entry.exitFeeCents);
  const exitNotional=numeric(entry.exitNotionalCents),pnl=numeric(entry.pnlCents);
  if(!(qty>0)||!finite(exitFilled)||Math.abs(qty-exitFilled)>1e-9
    ||!(price>0&&price<100)||!(exitPrice>=0&&exitPrice<=100)
    ||!(entryFee>=0&&exitFee>=0&&exitNotional>=0)
    ||Math.abs(exitNotional-exitPrice*qty)>Math.max(1e-6,qty*0.501)
    ||Math.abs(exitNotional-price*qty-entryFee-exitFee-pnl)>1e-6||!(pnl<0))
    return deny('r17_not_reconciled_net_loss');
  if(entry.mode==='LIVE'){
    if(!verifiedLiveCapitalParentEntryFill(entry).ok)return deny('r17_live_entry_fill_unverified');
    if(entry.exitExecutionState?.terminal===false
      ||(entry.exitClientOrderId&&entry.exitExecutionState?.terminal!==true)
      ||(!entry.exitOrderId&&!entry.exitExecutionState?.settlementConfirmed))return deny('r17_live_exit_unverified');
  }else if(entry.entryOrderId||entry.exitOrderId||entry.entryClientOrderId||entry.exitClientOrderId)
    return deny('r17_sim_broker_intent_invalid');
  if(!entry.entryConfig?.aurora?.frozen)return deny('r17_parent_protection_evidence_missing');
  return {ok:true,reason:'verified_reconciled_net_loss',parentEntryId:entry.id,parentSaint:saint,
    realizedNetCents:pnl,scope:{...scope},ticker:entry.ticker,eventTicker:entry.eventTicker,
    closedAtMs:entry.closedAtMs,stopPriceCents:exitPrice,
    parentOriginalEntryPriceCents:price,
    regularRootId:stamp.regularRootId};
}

export function authorizeNextRecovery({verifiedLoss,card,now=Date.now()}={}){
  if(verifiedLoss?.ok!==true||verifiedLoss.reason!=='verified_reconciled_net_loss')
    return deny('r17_verified_capital_loss_required');
  const parentRole=saintRole(verifiedLoss.parentSaint)?.role;
  const next=parentRole==='REGULAR'?'Aquarius':parentRole==='RECOVERY_1'?'Pisces':null;
  if(!next)return deny('r17_no_recovery_after_final_stage');
  if(!r17CardValid(card).ok||card.enabled!==true)return deny('r17_recovery_card_disabled_or_invalid');
  const watch=makeWatch({name:next,scope:verifiedLoss.scope,parentId:verifiedLoss.parentEntryId,
    proofHash:seal([verifiedLoss.parentEntryId,verifiedLoss.realizedNetCents,verifiedLoss.closedAtMs]),
    ticker:verifiedLoss.ticker,eventTicker:verifiedLoss.eventTicker,
    armedAtMs:verifiedLoss.closedAtMs,stopPriceCents:verifiedLoss.stopPriceCents,
    parentOriginalEntryPriceCents:verifiedLoss.parentOriginalEntryPriceCents,card,now});
  watch.regularRootId=verifiedLoss.regularRootId;
  return {ok:true,watch,reason:'recovery_watch_eligible_pending_durable_parent_proof'};
}
export const R17_ENTRY_DISPATCH_POLICY=Object.freeze({
  newEntryDispatchDisabledUntilNativeDbCertified:true,
  existingRealPositionExitsRemainAuthorized:true,
  noSendCannotBeInferredFromMissingOrder:true,
  ambiguousSendMustReconcileFirst:true,
  productLiveBrokerTestingForbiddenWithoutIsolatedApprovedAuthorization:true,
});
