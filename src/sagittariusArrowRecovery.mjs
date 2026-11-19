/** SA1 verified-loss recovery kernel. The signal itself cannot buy.
 * Separate transactional SIM/LIVE admission and guarded LIVE transport must
 * supply their own durable financial proof and native release verification.
 */
import {createHash} from 'node:crypto';
import {starlightRecoverySignalState,starlightRecoveryQuoteOrder} from './strategy.mjs';
import {STARLIGHT_CAPITAL_VERSION} from './starlightCapital.mjs';
import {isShadowSaintEntry} from './doctrine.mjs';
import {authorityHash} from './authority.mjs';
import {shadowEntryHash,SHADOW_PROTOCOL} from './shadowProtocol.mjs';
import {verifiedLiveCapitalParentEntryFill,liveCapitalParentEntryFillSql} from './liveParentEntryProof.mjs';
export const SA_CONCEPT='Sagittarius Arrow Recovery';
export const SA_VERSION='SA1-RECOVERY-WATCH-V1';
/** Link bypasses *strategy* thresholds only. Exchange prices, spread, depth,
 * scope, broker reconciliation, and other financial admission stay mandatory.
 * Frozen per-parent Link identity is the authority for a durable watch. */
export const sagittariusArrowLinkBypassesStrategy = watch => watch?.link===true;
/** Independent GH entry-only bid/ask tolerance. Never widens the global
 * admission threshold for other Saints or changes protective exit doctrine.
 * Missing legacy GH setting falls back to the previous shared limit until
 * runtime migration persists an independent value.
 */
export function sagittariusArrowSpreadAllowed(quote,settings={}){
 const limit=Number(settings.sagittariusArrowMaxSpreadCents??settings.maxSpreadCents??3);
 const bid=Number(quote?.yesBid),ask=Number(quote?.yesAsk);
 return Number.isInteger(limit)&&limit>=0&&limit<=99
   &&Number.isFinite(bid)&&Number.isFinite(ask)
   &&bid>0&&ask>=bid&&ask<100&&ask-bid<=limit+1e-9;
}
export function sagittariusArrowOperatorBandAllowed(watch,price,settings={}){
 if(sagittariusArrowLinkBypassesStrategy(watch))return true;
 const min=Number(settings.sagittariusArrowMinEntryCents),max=Number(settings.sagittariusArrowMaxEntryCents);
 return Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max<100&&min<=max
   &&Number(price)>=min&&Number(price)<=max;
}

const number=x=>x===null||x===undefined||x===''?NaN:Number(x);
const same=(a,b)=>String(a??'')===String(b??'');
const validInt=x=>Number.isSafeInteger(number(x));
const deny=reason=>({ok:false,reason});
// R10 durable opening authorization: the snapshot is recorded by the
// PostgreSQL trigger in the SAME transaction that makes Starlight OPEN.
// The whitelist is mirrored in sag_sa1_open_settings_snapshot(jsonb) below;
// never accept a partial or operator-changed snapshot as fresh Arrow authority.
const SA_OPEN_SNAPSHOT_KEYS=Object.freeze([
  'systemName','ownerId','mode','resetTimestampMs',
  'engineActive','sagittariusArrowEnabled','sagittariusArrowLinkEnabled',
  'sagittariusArrowMultiply','sagittariusArrowObservationMinutes',
  'sagittariusArrowMinEntryCents','sagittariusArrowMaxEntryCents',
  'sagittariusArrowMinCrashCents','sagittariusArrowMinReboundCents',
  'sagittariusArrowMinUpwardTicks','sagittariusArrowParentEntryRiseCents',
  'sagittariusArrowMaxSpreadCents','sagittariusArrowStakeCents',
  'sagittariusArrowMinProfitNetPerOriginalContractCents',
  'sagittariusArrowAuroraDamageControlPercent'
]);
export function sagittariusArrowOpeningSettings(settings={}){
  return Object.fromEntries(SA_OPEN_SNAPSHOT_KEYS.map(k=>[k,settings?.[k]??null]));
}
export function verifiedSagittariusArrowOpenEvent(event,parent,settings={},now=Date.now()){
  if(!event||event.enabled_at_open!==true)return deny('sa1_no_enabled_durable_open_event');
  if(settings?.engineActive!==true||settings?.sagittariusArrowEnabled!==true)
    return deny('sa1_currently_disabled');
  if(!parent?.id||event.parent_entry_id!==parent.id||event.ticker!==parent.ticker
    ||event.event_ticker!==parent.eventTicker||event.system_name!==parent.systemName
    ||event.owner_id!==parent.ownerId||event.mode!==parent.mode
    ||event.system_name!==settings.systemName||event.owner_id!==settings.ownerId
    ||event.mode!==settings.mode||number(event.reset_epoch)!==number(settings.resetTimestampMs??0)
    ||number(event.parent_opened_at_ms)!==number(parent.openedAtMs)
    ||number(event.parent_entry_price_cents)!==number(parent.entryPriceCents)
    ||number(event.parent_count)!==number(parent.count))
    return deny('sa1_open_event_scope_or_parent_mismatch');
  const at=number(event.confirmed_open_at_ms);
  if(!Number.isSafeInteger(at)||at<number(parent.openedAtMs)||at>now
    ||(parent.status==='closed'&&(!Number.isSafeInteger(number(parent.closedAtMs))
      ||at>number(parent.closedAtMs))))
    return deny('sa1_open_event_chronology_invalid');
  // An opening event cannot precede the independently verified LIVE fill.
  // A database/client clock discrepancy or malformed fill timestamp must
  // deny new Arrow authorization rather than qualify a pre-fill quote.
  if(parent.mode==='LIVE'){
    const fillAt=number(parent.entryConfig?.entryFillProof?.observedAtMs);
    if(!verifiedLiveCapitalParentEntryFill(parent).ok
      ||!Number.isSafeInteger(fillAt)||fillAt<number(parent.openedAtMs)
      ||fillAt>now||at<fillAt)
      return deny('sa1_open_event_predates_live_fill');
  }
  const saved=event.settings_snapshot;
  if(!saved||typeof saved!=='object'||Array.isArray(saved)
    ||Object.keys(saved).length!==SA_OPEN_SNAPSHOT_KEYS.length)
    return deny('sa1_open_event_settings_missing');
  const current=sagittariusArrowOpeningSettings(settings);
  if(SA_OPEN_SNAPSHOT_KEYS.some(key=>
    !Object.prototype.hasOwnProperty.call(saved,key)
    ||JSON.stringify(saved[key])!==JSON.stringify(current[key])))
    return deny('sa1_open_event_settings_changed');
  return {ok:true,reason:'sa1_immutable_open_event_verified'};
}


/** A parent loss only starts observation. No result here can place a BUY. */
export function verifiedStarlightShadowLoss(e,s={},now=Date.now()){
  if(e?.conceptName!=='Crash Recovery Hunter'||!isShadowSaintEntry(e)
    ||e?.executionClass!=='SHADOW_SAINT'||e?.entryConfig?.executionClass!=='SHADOW_SAINT'
    ||e?.entryConfig?.starlightShadow?.version!=='APS2-VIRTUAL-STARLIGHT-V1')return deny('sa1_not_verified_starlight_shadow_parent');
  const qty=number(e.count),entry=number(e.entryPriceCents),exit=number(e.exitPriceCents);
  const proof=e.shadowState?.closeProof;
  if(e.archived||e.status!=='closed'||number(e.remainingCount)!==0||!validInt(qty)||qty<1
    ||number(e.exitFilledCount)!==qty||!proof||proof.full!==true||proof.filled!==qty
    ||!['hard_stop_loss','settlement_loss'].includes(e.closeReason))return deny('sa1_shadow_close_not_complete_loss');
  for(const k of ['systemName','ownerId','mode'])if(!same(e[k],s[k])||!String(s[k]||''))return deny('sa1_shadow_scope_mismatch');
  const epoch=number(s.resetTimestampMs??0);
  if(!['SIMULATION','LIVE'].includes(e.mode)||!validInt(epoch)||epoch<0
    ||number(e.shadowEpoch)!==epoch||number(e.openedAtMs)<epoch
    ||!(number(e.closedAtMs)>=number(e.openedAtMs))||number(e.closedAtMs)>now
    ||!e.ticker||!e.eventTicker||!(entry>0&&entry<100&&exit>=0&&exit<=100))return deny('sa1_shadow_scope_epoch_market_invalid');
  if(e.entryOrderId||e.entryClientOrderId||e.exitOrderId||e.exitClientOrderId)
    return deny('sa1_shadow_carries_broker_receipt');
  const vals=[e.entryFeeCents,e.exitFeeCents,e.exitNotionalCents,e.pnlCents].map(number);
  if(vals.some(v=>!Number.isFinite(v))||vals[0]<0||vals[1]<0||vals[2]<0)return deny('sa1_shadow_economics_invalid');
  const net=vals[2]-qty*entry-vals[0]-vals[1];
  if(!(net<0)||Math.abs(net-vals[3])>0.000001||Math.abs(vals[2]-qty*exit)>Math.max(0.000001,qty*0.501))
    return deny('sa1_no_verified_virtual_net_loss');
  if(!e.shadowEntryHash||e.shadowEntryHash!==shadowEntryHash(e)
    ||proof.version!==SHADOW_PROTOCOL||proof.parentEntryId!==e.id
    ||proof.entryHash!==e.shadowEntryHash||proof.full!==true
    ||proof.brokerOrderAuthority!==false||proof.count!==qty||proof.filled!==qty
    ||!Number.isFinite(number(proof.pnlCents))||Math.abs(number(proof.pnlCents)-net)>0.000001
    ||proof.entryPriceCents!==entry
    ||Math.abs(number(proof.exitPriceCents)-exit)>0.501
    ||proof.exitFeeCents!==vals[1]||proof.closeReason!==e.closeReason||proof.closedAtMs!==number(e.closedAtMs)
    ||!same(proof.scope?.systemName,s.systemName)||!same(proof.scope?.ownerId,s.ownerId)
    ||!same(proof.scope?.mode,s.mode)||number(proof.scope?.resetEpoch)!==epoch
    ||authorityHash(proof)!==e.shadowState.closeProofHash)
    return deny('sa1_immutable_shadow_loss_proof_missing_or_changed');
  return {ok:true,reason:'sa1_verified_starlight_virtual_loss',parentEntryId:String(e.id),
    entryPriceCents:entry,exitPriceCents:exit,realizedNetCents:net,closedAtMs:number(e.closedAtMs),count:qty,
    systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:epoch,ticker:e.ticker,eventTicker:e.eventTicker,side:'YES',
    shadowProofHash:String(e.shadowState.closeProofHash)};
}
export function sagittariusArrowId(scope,parentId,seat=0,retryAttempt=0){
 const fields=[scope?.systemName,scope?.ownerId,scope?.mode,scope?.resetEpoch,parentId];
 if(fields.some(v=>v==null||String(v)==='')||!Number.isSafeInteger(seat)||seat<0||seat>20
   ||!Number.isSafeInteger(retryAttempt)||retryAttempt<0||retryAttempt>1000000
   ||(seat===0&&retryAttempt!==0))throw new Error('sa1_scoped_identity_invalid');
 // Retry 0 is byte-identical to every historical R11 identity. A certified
 // never-sent retry receives a different deterministic ID, never a recycled BUY.
 const identity=[...fields.map(String),seat];
 if(retryAttempt>0)identity.push('CERTIFIED_NEVER_SENT_RETRY',retryAttempt);
 return 'SA1-'+createHash('sha256').update(JSON.stringify(identity)).digest('hex').slice(0,40);
}

export function verifiedStarlightOpen(e,s={},now=Date.now(),{requireOpen=false}={}){
  if(e?.conceptName!=='Crash Recovery Hunter')return deny('sa1_not_starlight_parent');
  // Link ON clones a confirmed REAL Starlight opening. A shadow parent
  // must never generate a capital Arrow seat or durable recovery watch.
  const capital=e.executionClass==='CAPITAL'&&e.entryConfig?.executionClass==='CAPITAL';
  if(!capital||e.entryConfig?.starlightCapital?.version!==STARLIGHT_CAPITAL_VERSION)return deny('sa1_verified_new_real_starlight_parent_required');
  // An arm starts only on an open. Once armed, Starlight closing must not
  // revoke Arrow: the open is the authority, win or loss is not.
  const openNow=String(e.status||'')==='open'&&Number(e.remainingCount)>0;
  const kept=e.archived!==true&&(openNow||String(e.status||'')==='closed'||String(e.status||'')==='exit_pending');
  if(!kept||(requireOpen&&!openNow))return deny('sa1_starlight_not_confirmed_open');
  // Pending broker orders are not a filled capital position.
  // A durable Arrow watch is armed ONLY on the confirmed OPEN Starlight event.
  // Once armed, the parent's later exit must not revoke that watch, but a
  // CLOSED/EXIT_PENDING parent still needs coherent quantities and genuine
  // LIVE entry-fill proof. No order receipt alone is sufficient.
  const quantity=number(e.count),remaining=number(e.remainingCount);
  if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(remaining)
    ||remaining<0||remaining>quantity||(openNow&&remaining<=0))return deny('sa1_starlight_quantity_invalid');
  if(e.status==='closed'&&(remaining!==0||number(e.exitFilledCount)!==quantity
    ||!(number(e.closedAtMs)>=number(e.openedAtMs))||number(e.closedAtMs)>now))
    return deny('sa1_starlight_close_unreconciled');
  if(e.mode==='LIVE'&&!verifiedLiveCapitalParentEntryFill(e).ok)
    return deny('sa1_live_starlight_fill_unverified');
  for(const k of ['systemName','ownerId','mode'])if(!same(e[k],s[k])||!String(s[k]||''))return deny('sa1_starlight_scope_mismatch');
  const epoch=number(s.resetTimestampMs??0),entry=number(e.entryPriceCents),opened=number(e.openedAtMs);
  if(!['SIMULATION','LIVE'].includes(e.mode)||!validInt(epoch)||epoch<0||!(opened>=epoch)||opened>now)return deny('sa1_starlight_epoch_invalid');
  if(e.entryConfig?.starlightRecovery?.resetEpoch!=null
    &&number(e.entryConfig.starlightRecovery.resetEpoch)!==epoch)
    return deny('sa1_starlight_capital_epoch_mismatch');
  if(!e.ticker||!e.eventTicker||!(entry>0&&entry<100))return deny('sa1_starlight_market_invalid');
  const proof=`OPEN:${e.id}:${opened}`;
  return {ok:true,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:epoch,
    parentEntryId:e.id,ticker:e.ticker,eventTicker:e.eventTicker||e.ticker,
    entryPriceCents:entry,openedAtMs:opened,shadowProofHash:proof,executionClass:'CAPITAL'};
}
export function sagittariusArrowWatchFromOpen(open,settings={},now=Date.now()){
  if(!open?.ok||open.executionClass!=='CAPITAL')return deny('sa1_capital_parent_open_required');
  if(settings.sagittariusArrowEnabled!==true)return deny('sa1_disabled');
  const {systemName,ownerId,mode,resetEpoch,parentEntryId,ticker,eventTicker,entryPriceCents,openedAtMs,shadowProofHash}=open;
  // A LIVE order-intent timestamp is NOT a broker-confirmed capital opening.
  // The opening event is written atomically when the reconciled fill turns
  // Starlight OPEN; quotes before that confirmation cannot qualify Arrow.
  const armedAtMs=Number(open.confirmedOpenAtMs??(mode==='SIMULATION'?openedAtMs:NaN));
  if(!Number.isSafeInteger(armedAtMs)||armedAtMs<Number(openedAtMs)||armedAtMs>now
    ||!(openedAtMs>0&&openedAtMs<=now))return deny('sa1_confirmed_open_time_required');
  const multiply=number(settings.sagittariusArrowMultiply),observe=number(settings.sagittariusArrowObservationMinutes);
  if(!validInt(multiply)||multiply<1||multiply>20||!Number.isFinite(observe)||observe<0||observe>1000)return deny('sa1_card_invalid');
  const durationMs=Number.MAX_SAFE_INTEGER-armedAtMs;
  const scope={systemName,ownerId,mode,resetEpoch};
  const link=settings.sagittariusArrowLinkEnabled===true;
  return {ok:true,watch:{version:SA_VERSION,id:sagittariusArrowId(scope,parentEntryId),
    authorizationId:sagittariusArrowId(scope,parentEntryId),systemName,ownerId,mode,resetEpoch,
    parentEntryId,parentConcept:'Crash Recovery Hunter',ticker,eventTicker,side:'YES',
    originalParentEntryPriceCents:entryPriceCents,verifiedLosingExitPriceCents:entryPriceCents,
    parentRealizedNetCents:0,shadowProofHash:String(shadowProofHash||''),armedAtMs,
    releaseAtMs:armedAtMs+(link?0:Math.round(observe*60_000)),
    expiresAtMs:armedAtMs+durationMs,stopPriceCents:entryPriceCents,peakSinceArmCents:entryPriceCents,
    troughSinceArmCents:entryPriceCents,upwardTicks:0,lastBidCents:null,lastQuoteAtMs:0,
    maximumSeats:multiply,link,status:'WATCHING',revision:1,
    lastQuoteEpoch:null,lastQuoteRevision:0,lastSignalReason:'not_observed',lastObservedAtMs:0,
    armedFrom:'starlight_open',retryAttempt:0}};
}
export function sagittariusArrowWatchFromLoss(loss,settings={},now=Date.now()){
 if(!loss?.ok)return deny('sa1_parent_loss_required');
 if(settings.sagittariusArrowEnabled!==true)return deny('sa1_disabled');
 const {systemName,ownerId,mode,resetEpoch,parentEntryId,ticker,eventTicker,entryPriceCents,exitPriceCents,closedAtMs,realizedNetCents}=loss;
 if(!(closedAtMs>0&&closedAtMs<=now))return deny('sa1_loss_time_invalid');
 const multiply=number(settings.sagittariusArrowMultiply),observe=number(settings.sagittariusArrowObservationMinutes);
 if(!validInt(multiply)||multiply<1||multiply>20||!Number.isFinite(observe)||observe<0||observe>1000)return deny('sa1_card_invalid');
 // Starlight does not discard an unresolved recovery after five minutes.
 // Keep the watch until market finality or an explicit terminal outcome.
 const durationMs=Number.MAX_SAFE_INTEGER-closedAtMs;
 const scope={systemName,ownerId,mode,resetEpoch};
 return {ok:true,watch:{version:SA_VERSION,id:sagittariusArrowId(scope,parentEntryId),
   authorizationId:sagittariusArrowId(scope,parentEntryId),systemName,ownerId,mode,resetEpoch,
   parentEntryId,parentConcept:'Crash Recovery Hunter',ticker,eventTicker,side:'YES',
   originalParentEntryPriceCents:entryPriceCents,verifiedLosingExitPriceCents:exitPriceCents,
   parentRealizedNetCents:realizedNetCents,shadowProofHash:String(loss.shadowProofHash||''),armedAtMs:closedAtMs,
   // Link ON is immediately eligible to qualify; observation applies only to Link OFF.
   releaseAtMs:closedAtMs+(settings.sagittariusArrowLinkEnabled===true?0:Math.round(observe*60_000)),
   expiresAtMs:closedAtMs+durationMs,stopPriceCents:exitPriceCents,peakSinceArmCents:exitPriceCents,
   troughSinceArmCents:exitPriceCents,upwardTicks:0,lastBidCents:null,lastQuoteAtMs:0,
   maximumSeats:multiply,link:settings.sagittariusArrowLinkEnabled===true,status:'WATCHING',revision:1,
   lastQuoteEpoch:null,lastQuoteRevision:0,lastSignalReason:'not_observed',lastObservedAtMs:0,retryAttempt:0}};
}
export function sagittariusArrowSignalState(w,q,s={},now=Date.now(),opts={}){
 if(!w||w.version!==SA_VERSION||w.parentConcept!=='Crash Recovery Hunter')return {...w,qualified:false,reason:'sa1_watch_identity_invalid'};
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {...w,qualified:false,reason:'sa1_market_identity_changed'};
 const rise=number(s.sagittariusArrowParentEntryRiseCents??0),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 const at=number(q?.quoteAtMs),maxAge=5000; // observation only; admission keeps operator book age
 if(!validInt(rise)||rise<0||rise>99)return {...w,qualified:false,reason:'sa1_parent_rise_invalid'};
 // A durable Link watch created by an older release might still carry a delayed
 // releaseAtMs. Do not let persisted legacy observation timers delay Link ON.
 if(now>number(w.expiresAtMs)||(w.link!==true&&now<number(w.releaseAtMs)))
   return {...w,qualified:false,reason:'sa1_observation_or_expiry'};
 if(q?.status!=='active'||q?.bookInvalid||q?.result||!(bid>0&&bid<=ask&&ask<100))return {...w,qualified:false,reason:'sa1_market_not_executable'};
 if(!(at>=number(w.armedAtMs))||at>now||!(now-at<=maxAge))return {...w,qualified:false,reason:'sa1_quote_stale_or_pre_loss'};
 // The operator's Link ON doctrine bypasses ALL recovery signal filters,
 // including parent-entry rise, the configured price band and the historical
 // losing-exit ask ceiling. It never bypasses executable-book validation.
 if(w.link===true){
   // R15-R14: Link ON follows the confirmed parent fill. No worse price.
   // Equal or better is allowed. A worse ask is deferred, not chased.
   const parent=number(w.originalParentEntryPriceCents);
   if(!(parent>0)||ask>parent)return {...w,qualified:false,reason:'sa1_link_worse_than_parent_fill',lastAskCents:ask,parentFillCents:parent};
   return {...w,qualified:true,reason:'sa1_link_qualified',lastAskCents:ask,matchingPolicy:'NO_WORSE'};
 }
 if(rise>0&&!(bid>=number(w.originalParentEntryPriceCents)+rise))return {...w,qualified:false,reason:'sa1_below_original_parent_entry_rise'};
 if(!sagittariusArrowOperatorBandAllowed(w,ask,s))return {...w,qualified:false,reason:'sa1_entry_band'};
 const mapped={...s,crashRecoveryHunterMinCrashCents:s.sagittariusArrowMinCrashCents,
   crashRecoveryHunterMinReboundCents:s.sagittariusArrowMinReboundCents,
   crashRecoveryHunterMinUpwardTicks:s.sagittariusArrowMinUpwardTicks,
   crashRecoveryMinEntryCents:s.sagittariusArrowMinEntryCents,crashRecoveryMaxEntryCents:s.sagittariusArrowMaxEntryCents};
 return starlightRecoverySignalState(w,q,mapped,now,opts);
}
/** Deterministic watch transition. This module NEVER authorizes capital by itself.
 * A stale/out-of-order or invalid book must not overwrite valid signal history.
 * This function can be replayed from the persisted JSONB watch after restart.
 */
export function sagittariusArrowObservationStep(w,q,settings={},now=Date.now()){
 if(!w||w.version!==SA_VERSION)return deny('sa1_watch_version_invalid');
 if(!['WATCHING','READY','BLOCKED','EXPIRED'].includes(w.status))return deny('sa1_watch_not_observable');
 if(w.status==='BLOCKED'||w.status==='EXPIRED')return {ok:true,changed:false,watch:w,reason:'sa1_terminal_watch'};
 if(now>Number(w.expiresAtMs))return {ok:true,changed:true,reason:'sa1_expired',watch:{...w,status:'EXPIRED',qualified:false,lastSignalReason:'sa1_expired',terminalReason:'expired',updatedAtMs:now,historicalQualified:w.qualified===true}};
 const quoteAt=number(q?.quoteAtMs),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {ok:true,changed:false,reason:'sa1_market_identity_mismatch',watch:w};
 // Recovery terminal observations must be ordered after the armed watch and
 // its latest accepted quote. An older/replayed finality hint cannot erase a
 // newer durable watch; only a proven newer terminal event can block entries.
 if(['finalized','settled','determined','closed'].includes(String(q?.status||'').toLowerCase())||q?.result){
   if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now)
     return {ok:true,changed:false,reason:'sa1_stale_quote',watch:w};
   if(starlightRecoveryQuoteOrder(w,q)<=0)
     return {ok:true,changed:false,reason:'sa1_duplicate_or_out_of_order_quote',watch:w};
   return {ok:true,changed:true,reason:'sa1_market_terminal',watch:{...w,status:'BLOCKED',qualified:false,lastSignalReason:'sa1_market_terminal',terminalReason:'market_finality',updatedAtMs:now,historicalQualified:w.qualified===true}};
 }
 if(q?.status!=='active'||q?.bookInvalid||!(bid>0&&bid<100)||!(ask>=bid&&ask<100)||!(quoteAt>0&&quoteAt<=now))
   return {ok:true,changed:false,reason:'sa1_market_not_executable',watch:w};
 const requestedBookAge=number(settings.infinityBreakMaximumBookAgeMs??5000);
 // Invalid readiness settings cannot advance a durable recovery quote cursor.
 if(!Number.isFinite(requestedBookAge)||requestedBookAge<100)
   return {ok:true,changed:false,reason:'sa1_invalid_quote_age_limit',watch:w};
 const ageLimit=5000; // observation only; admission keeps operator book age
 if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now||now-quoteAt>ageLimit)
   return {ok:true,changed:false,reason:'sa1_stale_quote',watch:w};
 const order=starlightRecoveryQuoteOrder(w,q);
 const legacyLinkGate=['sa1_entry_band','sa1_link_above_parent_exit','sa1_below_original_parent_entry_rise'].includes(w.lastSignalReason);
 const safeLegacyReplay=w.link===true&&legacyLinkGate&&w.qualified!==true
   &&quoteAt===number(w.lastQuoteAtMs)&&order===0;
 if(order<=0&&!safeLegacyReplay)return {ok:true,changed:false,reason:'sa1_duplicate_or_out_of_order_quote',watch:w};
 const next=sagittariusArrowSignalState(w,q,settings,now,{advance:true});
 // READY is a signal fact, not a permission to BUY. The SQL watch remains WATCHING.
 const status='WATCHING';
 const watch={...next,status,qualified:next.qualified===true,lastSignalReason:next.reason,updatedAtMs:now,
   lastQuoteAtMs:quoteAt,lastQuoteEpoch:q.quoteObservation?.epoch||null,
   lastQuoteRevision:number(q.quoteObservation?.revision)||0};
 return {ok:true,changed:true,watch,reason:next.reason};
}

/** Deterministic seat plan. Attempts to re-use a seat or add a sixth are denied. */
export function sagittariusArrowSeatPlan(w,occupied=[]){
 if(w?.version!==SA_VERSION||!Number.isSafeInteger(number(w.maximumSeats))||number(w.maximumSeats)<1||number(w.maximumSeats)>20)
  return deny('sa1_watch_seat_cap_invalid');
 const seen=new Set();
 for(const seat of occupied){
  const idx=number(seat?.seat);
  if(!Number.isSafeInteger(idx)||idx<1||idx>number(w.maximumSeats)||seen.has(idx))return deny('sa1_seat_ledger_corrupt');
  seen.add(idx);
 }
 const free=[];
 for(let i=1;i<=number(w.maximumSeats);i++)if(!seen.has(i))free.push(i);
 return {ok:true,free,consumed:[...seen].sort((a,b)=>a-b),maximumSeats:number(w.maximumSeats)};
}

export function sagittariusArrowAdmissionDecision({watch,seat,settings,quote,parent,now=Date.now()}={}){
 if(!watch||watch.version!==SA_VERSION||settings?.sagittariusArrowEnabled!==true)return deny('sa1_disabled_or_watch_missing');
 const open=verifiedStarlightOpen(parent,settings,now);if(!open.ok)return open;
 if(watch.id!==sagittariusArrowId(open,open.parentEntryId)||!same(watch.parentEntryId,parent.id)
   ||typeof watch.shadowProofHash!=='string'||watch.shadowProofHash!==open.shadowProofHash
   ||watch.parentConcept!=='Crash Recovery Hunter'||watch.side!=='YES'
   ||!same(watch.systemName,open.systemName)||!same(watch.ownerId,open.ownerId)
   ||!same(watch.mode,open.mode)||number(watch.resetEpoch)!==open.resetEpoch
   ||!same(watch.ticker,open.ticker)||!same(watch.eventTicker,open.eventTicker)
   ||number(watch.originalParentEntryPriceCents)!==open.entryPriceCents
   ||number(watch.verifiedLosingExitPriceCents)!==open.entryPriceCents)return deny('sa1_parent_authorization_drift');
 if(!validInt(seat)||seat<1||seat>number(watch.maximumSeats)||number(watch.maximumSeats)!==number(settings.sagittariusArrowMultiply))return deny('sa1_seat_cap_invalid');
 const signal=sagittariusArrowSignalState(watch,quote,settings,now);
 if(!signal.qualified)return deny(signal.reason);
 const retryAttempt=Number(watch.retryAttempt??0);
 if(!Number.isSafeInteger(retryAttempt)||retryAttempt<0||retryAttempt>1000000)
   return deny('sa1_retry_identity_invalid');
 return {ok:true,reason:'sa1_signal_only_no_capital_authority',seat,groupId:watch.id,
   positionId:sagittariusArrowId(open,open.parentEntryId,seat,retryAttempt)};
}
/** Additive schema; scoped LIVE requires a transaction-local proof and durable pending intent. */
export const SAGITTARIUS_ARROW_SQL=`
-- SA1-LIVE: no general direct-insert authority. Only a locked, scoped
-- transaction can insert an individually authorized SIM or LIVE seat.
-- FENCE_VERSION SA1-OPEN-PARENT-V2
create or replace function sag_sa1_pre_certification_fence() returns trigger language plpgsql as $$
declare w record; p record; s jsonb; rec jsonb; seat_n int; at_ms bigint;
begin
 if NEW.concept_name<>'Sagittarius Arrow Recovery' then return NEW;end if;
 -- Only the separate SC clone SQL fence may authorize a Starlight-derived
 -- Arrow clone. Both fences run in the same insert transaction. Native SA1
 -- continues to require its own reserved Arrow watch/seat and operator stamp.
 if NEW.entry_config->>'starlightModelClone'='true'
   and NEW.entry_config#>>'{modelCloneCapital,version}'='SC-MODEL-CLONE-V1'
   and current_setting('sagittarius.model_clone_entry',true)='admitted'
 then return NEW;end if;
 -- IA3: independently authorized Arrow after Athena SHADOW loss is not the
 -- legacy SA1 Starlight-CAPITAL parent route. Require its OWN durable parent
 -- stop, matching watch and a transaction-local capability; do not weaken
 -- the original SA1 reserved-seat fence below.
 if NEW.entry_config#>>'{independentRecovery,version}'='INDEPENDENT-ATHENA-LOSS-V2' then
   if current_setting('sagittarius.independent_recovery_entry',true) is distinct from 'admitted'
     or NEW.execution_class is distinct from 'CAPITAL'
     or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
     or NEW.mode not in ('SIMULATION','LIVE')
     or (NEW.mode='SIMULATION' and (NEW.status<>'open' or NEW.entry_client_order_id is not null))
     or (NEW.mode='LIVE' and (NEW.status<>'entry_pending' or NEW.entry_client_order_id is null))
     or NEW.entry_order_id is not null or NEW.remaining_count<>NEW.count or NEW.count<=0
     or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
   then raise exception 'independent_arrow_atomic_admission_required';end if;
   select value into s from sag_settings where key='runtime' for update;
   rec:=NEW.entry_config->'independentRecovery';
   if s->>'engineActive' is distinct from 'true'
     or s->>'sagittariusArrowEnabled' is distinct from 'true'
     or s->>'mode' is distinct from NEW.mode
     or (NEW.mode='LIVE' and (s->>'liveArmed' is distinct from 'true'
        or s->>'liveOwnerAuthorized' is distinct from 'true'))
     or s->>'systemName' is distinct from NEW.system_name
     or s->>'ownerId' is distinct from NEW.owner_id
     or (s->>'resetTimestampMs')::bigint is distinct from (rec->>'resetEpoch')::bigint
     or rec->>'concept' is distinct from NEW.concept_name
     or rec->>'parentEntryId' is distinct from NEW.source_trade_id
     or rec->>'authorizationId' is distinct from NEW.entry_config#>>'{independentAuthority,authorizationId}'
     or rec->>'parentProofHash' is distinct from NEW.entry_config#>>'{independentAuthority,parentProofHash}'
     or rec->>'watchAuthorizationId' is distinct from NEW.entry_config#>>'{independentAuthority,watchAuthorizationId}'
     or (rec->>'watchRevision')::bigint is distinct from (NEW.entry_config#>>'{independentAuthority,watchRevision}')::bigint
     or NEW.entry_config#>>'{independentAuthority,authorityMode}' is distinct from 'INDEPENDENT_ATHENA_SHADOW_STOP'
     or NEW.entry_config#>>'{independentAuthority,verifiedStop}' is distinct from 'true'
     or NEW.entry_config#>>'{independentAuthority,mode}' is distinct from NEW.mode
     or NEW.entry_config#>>'{independentAuthority,systemName}' is distinct from NEW.system_name
     or NEW.entry_config#>>'{independentAuthority,ownerId}' is distinct from NEW.owner_id
     or NEW.entry_config#>>'{independentAuthority,ticker}' is distinct from NEW.ticker
     or NEW.entry_config#>>'{independentAuthority,eventTicker}' is distinct from NEW.event_ticker
     or (NEW.entry_config#>>'{independentAuthority,resetEpoch}')::bigint is distinct from (rec->>'resetEpoch')::bigint
     or NEW.entry_price_cents not between (s->>'sagittariusArrowMinEntryCents')::numeric
       and (s->>'sagittariusArrowMaxEntryCents')::numeric
     or NEW.entry_price_cents > (NEW.entry_config#>>'{independentAuthority,authorizedMaxEntryCents}')::numeric
     or NEW.entry_config->>'auroraDamageControlPercent' is distinct from s->>'sagittariusArrowAuroraDamageControlPercent'
   then raise exception 'independent_arrow_operator_scope_or_price_invalid';end if;
   select * into w from sag_independent_recovery_v1 where
     system_name=NEW.system_name and owner_id=NEW.owner_id and mode=NEW.mode
     and reset_epoch=(rec->>'resetEpoch')::bigint
     and authorization_id=rec->>'watchAuthorizationId'
     and concept=NEW.concept_name and parent_entry_id=NEW.source_trade_id for update;
   select * into p from sag_entries where id=NEW.source_trade_id for share;
   if w.authorization_id is null or p.id is null
     or w.status is distinct from 'WATCHING'
     or w.revision is distinct from (rec->>'watchRevision')::bigint
     or w.watch->>'qualified' is distinct from 'true'
     or (w.watch->>'lastQuoteAtMs')::bigint is distinct from (rec->>'signalQuoteAtMs')::bigint
     or w.watch->>'lastQuoteEpoch' is distinct from rec->>'signalQuoteEpoch'
     or (w.watch->>'lastQuoteRevision')::bigint is distinct from (rec->>'signalQuoteRevision')::bigint
     or (rec->>'signalQuoteAtMs')::bigint not between
        (extract(epoch from clock_timestamp())*1000)::bigint-5000
        and (extract(epoch from clock_timestamp())*1000)::bigint
     or (w.watch->>'releaseAtMs')::bigint>NEW.opened_at_ms
     or (w.watch->>'crashDepthCents')::numeric<coalesce((s->>'sagittariusArrowMinCrashCents')::numeric,0)
     or (w.watch->>'reboundCents')::numeric<coalesce((s->>'sagittariusArrowMinReboundCents')::numeric,0)
     or (w.watch->>'upwardTicks')::int<coalesce((s->>'sagittariusArrowMinUpwardTicks')::int,0)
     or w.watch->>'independentRecovery' is distinct from 'true'
     or w.watch->>'authorization' is distinct from 'VALID_SHADOW_HARD_STOP'
     or w.watch->>'parentConcept' is distinct from 'Athena Exclamation'
     or w.watch->>'ticker' is distinct from NEW.ticker
     or w.watch->>'eventTicker' is distinct from NEW.event_ticker
     or p.concept_name is distinct from 'Athena Exclamation'
     or p.execution_class is distinct from 'SHADOW_SAINT'
     or p.archived is distinct from false
     or p.status is distinct from 'closed'
     or p.close_reason is distinct from 'hard_stop_loss'
     or p.pnl_cents is null or p.pnl_cents>=0 or p.remaining_count<>0
     or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
     or p.system_name is distinct from NEW.system_name or p.owner_id is distinct from NEW.owner_id
     or p.mode is distinct from NEW.mode
     or p.shadow_epoch is distinct from (rec->>'resetEpoch')::bigint
     or not exists(select 1 from sag_shadow_stops_v3 v
       where v.parent_entry_id=p.id and v.system_name=NEW.system_name
       and v.owner_id=NEW.owner_id and v.mode=NEW.mode
       and v.reset_epoch=(rec->>'resetEpoch')::bigint
       and v.proof_hash=rec->>'parentProofHash'
       and v.proof->>'authorization'='VALID_SHADOW_HARD_STOP')
   then raise exception 'independent_arrow_durable_parent_or_watch_invalid';end if;
   return NEW;
 end if;
 if NEW.mode not in ('SIMULATION','LIVE')
  or (NEW.mode='SIMULATION' and NEW.status<>'open')
  or (NEW.mode='LIVE' and NEW.status<>'entry_pending')
  or NEW.execution_class is distinct from 'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or (NEW.mode='SIMULATION' and current_setting('sagittarius.sa1_sim_entry',true) is distinct from 'admitted')
  or (NEW.mode='LIVE' and current_setting('sagittarius.sa1_live_entry',true) is distinct from 'admitted')
 then raise exception 'sa1_live_and_direct_insert_forbidden';end if;
 select value into s from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'sagittariusArrowRecovery';
 if s->>'engineActive' is distinct from 'true' or s->>'sagittariusArrowEnabled' is distinct from 'true'
  or s->>'mode' is distinct from NEW.mode
  or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true') or s->>'systemName' is distinct from NEW.system_name
  or s->>'ownerId' is distinct from NEW.owner_id
  or coalesce((s->>'resetTimestampMs')::bigint,0)<>(NEW.entry_config->>'resetTimestampMs')::bigint
  or rec->>'version' is distinct from (case when NEW.mode='LIVE' then 'SA1-LIVE-CAPITAL-V1' else 'SA1-SIM-CAPITAL-V2' end)
  or rec->>'parentEntryId' is distinct from NEW.source_trade_id
  or rec->>'positionId' is distinct from NEW.id
  or (rec->>'seat')::int not between 1 and 20
  or NEW.remaining_count<>NEW.count or NEW.count<=0
  or (NEW.mode='SIMULATION' and NEW.entry_client_order_id is not null)
  or (NEW.mode='LIVE' and (NEW.entry_client_order_id is null or length(NEW.entry_client_order_id)<8))
  or NEW.entry_order_id is not null
  or NEW.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or (NEW.entry_config->'aurora'->>'damageControlPercent')::numeric is distinct from (s->>'sagittariusArrowAuroraDamageControlPercent')::numeric
 then raise exception 'sa1_scoped_frozen_identity_or_settings_invalid';end if;
 select * into w from sag_sagittarius_arrow_watches_v1 where id=rec->>'watchId' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for share;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 seat_n:=(rec->>'seat')::int;
 if w.id is null or p.id is null or w.status<>'WATCHING'
  or w.parent_entry_id<>p.id or w.system_name<>NEW.system_name or w.owner_id<>NEW.owner_id
  or w.mode<>NEW.mode or w.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or w.ticker<>NEW.ticker or w.event_ticker<>NEW.event_ticker
  or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
  or w.watch->>'eventTicker' is distinct from NEW.event_ticker
  or w.watch->>'parentConcept' is distinct from 'Crash Recovery Hunter'
  or w.watch->>'side' is distinct from 'YES'
  or w.watch->>'systemName' is distinct from NEW.system_name
  or w.watch->>'ownerId' is distinct from NEW.owner_id
  or w.watch->>'mode' is distinct from NEW.mode
  or w.watch->>'resetEpoch' is distinct from w.reset_epoch::text
  or (w.watch->>'qualified') is distinct from 'true'
  or p.concept_name<>'Crash Recovery Hunter'
  -- Arrow's durable watch was armed while Starlight was OPEN. The original
  -- parent can subsequently close without revoking that authorization.
  -- Unknown, unfilled, archived, incoherently closed or old-lineage parents
  -- remain denied; the current quote/clock/fees/cash/seat checks still apply.
  or p.archived=true
  or p.status not in ('open','exit_pending','closed') or p.count<=0
  or p.remaining_count<0 or p.remaining_count>p.count
  or (p.status='open' and p.remaining_count<=0)
  or (p.status='closed' and (p.remaining_count<>0 or p.exit_filled_count is distinct from p.count
      or p.closed_at_ms is null or p.closed_at_ms<p.opened_at_ms))
  or w.watch->>'armedFrom' is distinct from 'starlight_open'
  or (w.watch->>'armedAtMs')::bigint is distinct from coalesce(
    (select a.confirmed_open_at_ms from sag_sa1_open_events_v1 a
      where a.parent_entry_id=p.id and a.system_name=NEW.system_name
        and a.owner_id=NEW.owner_id and a.mode=NEW.mode
        and a.reset_epoch=w.reset_epoch and a.enabled_at_open=true),
    p.opened_at_ms)
  -- Legacy pre-R10 watches remain visible, but LIVE admission always needs a
  -- quote observed AFTER the authoritative Starlight fill reconciliation.
  or (p.mode='LIVE' and (
       (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint is null
       or (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint < p.opened_at_ms
       or (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint > at_ms
       or (rec->>'quoteAtMs')::bigint < (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint))
  or p.execution_class<>'CAPITAL' or p.entry_config->>'executionClass'<>'CAPITAL'
  or p.entry_config#>>'{starlightCapital,version}'<>'${STARLIGHT_CAPITAL_VERSION}'
  or ${liveCapitalParentEntryFillSql('p')}
  or w.watch->>'shadowProofHash' is distinct from
     ('OPEN:'||p.id||':'||p.opened_at_ms::text)
  or p.system_name<>NEW.system_name or p.owner_id<>NEW.owner_id or p.mode<>NEW.mode
  or p.opened_at_ms<w.reset_epoch
  or (rec->>'watchRevision')::bigint<>w.revision
  or coalesce((rec->>'retryAttempt')::int,0)<>coalesce((w.watch->>'retryAttempt')::int,0)
  or seat_n>coalesce((w.watch->>'maximumSeats')::int,0)
  or (rec->>'quoteAtMs')::bigint not between greatest((w.watch->>'armedAtMs')::bigint,at_ms-30000) and at_ms
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,verifiedAtMs}')::bigint,0) not between at_ms-30000 and at_ms
  or (rec->>'quoteAskCents')::numeric<>(NEW.entry_config#>>'{finalEntryConfirmation,askCents}')::numeric
  or rec->>'quoteBidCents' is null
  or (rec->>'quoteAskCents')::numeric<(rec->>'quoteBidCents')::numeric
  or (rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric>
      coalesce((s->>'sagittariusArrowMaxSpreadCents')::numeric,(s->>'maxSpreadCents')::numeric,3)
  or NEW.spread_at_entry_cents<>(rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric
  or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
  or (w.watch->>'link') is distinct from (s->>'sagittariusArrowLinkEnabled')
  or (rec#>>'{capturedSettings,link}') is distinct from (w.watch->>'link')
  or (coalesce((w.watch->>'link')::boolean,false)=false
    and NEW.entry_price_cents not between (s->>'sagittariusArrowMinEntryCents')::numeric and (s->>'sagittariusArrowMaxEntryCents')::numeric)
  or not exists (select 1 from sag_sagittarius_arrow_seats_v1 x where x.watch_id=w.id and x.seat=seat_n
    and x.position_id=NEW.id and x.status='RESERVED')
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,availableAtLimitCount}')::bigint,0)
       < NEW.count + (case when NEW.mode='LIVE' then 0 else
          (select coalesce(sum(e.count),0) from sag_sagittarius_arrow_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE')) end)
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,existingGroupQuantity}')::double precision,-1)
       <> (select coalesce(sum(e.count),0) from sag_sagittarius_arrow_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE'))
 then raise exception 'sa1_scoped_parent_watch_or_seat_not_authorized';end if;
 return NEW;
end;$$;
drop trigger if exists sag_sa1_pre_certification_insert_fence on sag_entries;
create trigger sag_sa1_pre_certification_insert_fence before insert on sag_entries
 for each row execute function sag_sa1_pre_certification_fence();
create table if not exists sag_sagittarius_arrow_watches_v1(
 id text primary key, version text not null, system_name text not null,owner_id text not null,
 mode text not null check(mode in ('SIMULATION','LIVE')),reset_epoch bigint not null,
 parent_entry_id text not null references sag_entries(id),ticker text not null,event_ticker text not null,
 status text not null check(status in ('WATCHING','READY','EXECUTING','BLOCKED','EXPIRED','CONSUMED')),
 revision bigint not null default 1 check(revision>=1),watch jsonb not null,
 updated_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,parent_entry_id)
);
alter table sag_sagittarius_arrow_watches_v1 add column if not exists last_scan_ms bigint not null default 0;
create index if not exists sag_sa1_watch_scan on sag_sagittarius_arrow_watches_v1
 (system_name,owner_id,mode,reset_epoch,status,last_scan_ms);
create index if not exists sag_sa1_watch_scope on sag_sagittarius_arrow_watches_v1
(system_name,owner_id,mode,reset_epoch,status,updated_at_ms);
create table if not exists sag_sagittarius_arrow_seats_v1(
 watch_id text not null references sag_sagittarius_arrow_watches_v1(id),seat int not null check(seat between 1 and 20),
 position_id text not null unique,order_intent_id text unique,
 status text not null check(status in ('RESERVED','SUBMITTED','RECONCILE','FILLED','CLOSED','REJECTED')),
 primary key(watch_id,seat)
);
-- Financial closure never frees an occupied Multiply seat. An idempotent
-- trigger keeps the seat ledger visible after either protective or settlement exit.
create or replace function sag_sa1_capital_seat_close() returns trigger language plpgsql as $$
begin
 if NEW.concept_name='Sagittarius Arrow Recovery' and NEW.status='open' and OLD.status='entry_pending' then
  update sag_sagittarius_arrow_seats_v1 set status='FILLED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Sagittarius Arrow Recovery' and NEW.status='rejected' and OLD.status is distinct from 'rejected' then
  update sag_sagittarius_arrow_seats_v1 set status='REJECTED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Sagittarius Arrow Recovery' and NEW.status='closed' and OLD.status is distinct from 'closed' then
  update sag_sagittarius_arrow_seats_v1 set status='CLOSED'
   where position_id=NEW.id and status in ('FILLED','SUBMITTED','RECONCILE');
 end if;
 return NEW;
end;$$;
drop trigger if exists sag_sa1_capital_seat_close_trigger on sag_entries;
create trigger sag_sa1_capital_seat_close_trigger after update on sag_entries
 for each row execute function sag_sa1_capital_seat_close();

-- R10 opening authority is captured at the Starlight OPEN transaction,
-- not manufactured later from a historical closed parent. Store DISABLED
-- origins as immutable negative proof: enabling Arrow later cannot backfill.
create table if not exists sag_sa1_open_events_v1(
 parent_entry_id text primary key references sag_entries(id),
 system_name text not null,owner_id text not null,mode text not null
   check(mode in ('SIMULATION','LIVE')),
 reset_epoch bigint not null,ticker text not null,event_ticker text not null,
 parent_opened_at_ms bigint not null,confirmed_open_at_ms bigint not null,
 parent_entry_price_cents double precision not null,parent_count double precision not null,
 enabled_at_open boolean not null,settings_snapshot jsonb not null,
 recorded_at_ms bigint not null
);
create index if not exists sag_sa1_open_events_replay_v1
 on sag_sa1_open_events_v1(system_name,owner_id,mode,reset_epoch,
 enabled_at_open,confirmed_open_at_ms desc,parent_entry_id desc);
create or replace function sag_sa1_open_settings_snapshot(v jsonb)
 returns jsonb language sql immutable as $$
 select jsonb_build_object(
   'systemName',v->'systemName',
   'ownerId',v->'ownerId',
   'mode',v->'mode',
   'resetTimestampMs',v->'resetTimestampMs',
   'engineActive',v->'engineActive',
   'sagittariusArrowEnabled',v->'sagittariusArrowEnabled',
   'sagittariusArrowLinkEnabled',v->'sagittariusArrowLinkEnabled',
   'sagittariusArrowMultiply',v->'sagittariusArrowMultiply',
   'sagittariusArrowObservationMinutes',v->'sagittariusArrowObservationMinutes',
   'sagittariusArrowMinEntryCents',v->'sagittariusArrowMinEntryCents',
   'sagittariusArrowMaxEntryCents',v->'sagittariusArrowMaxEntryCents',
   'sagittariusArrowMinCrashCents',v->'sagittariusArrowMinCrashCents',
   'sagittariusArrowMinReboundCents',v->'sagittariusArrowMinReboundCents',
   'sagittariusArrowMinUpwardTicks',v->'sagittariusArrowMinUpwardTicks',
   'sagittariusArrowParentEntryRiseCents',v->'sagittariusArrowParentEntryRiseCents',
   'sagittariusArrowMaxSpreadCents',v->'sagittariusArrowMaxSpreadCents',
   'sagittariusArrowStakeCents',v->'sagittariusArrowStakeCents',
   'sagittariusArrowMinProfitNetPerOriginalContractCents',v->'sagittariusArrowMinProfitNetPerOriginalContractCents',
   'sagittariusArrowAuroraDamageControlPercent',v->'sagittariusArrowAuroraDamageControlPercent'
 );$$;
create or replace function sag_sa1_capture_starlight_open()
 returns trigger language plpgsql as $$
declare v jsonb; p sag_entries%rowtype; at_ms bigint; epoch bigint;
begin
 if NEW.concept_name<>'Crash Recovery Hunter' or NEW.status<>'open'
  or NEW.archived=true or NEW.execution_class<>'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or NEW.entry_config#>>'{starlightCapital,version}' is distinct from '${STARLIGHT_CAPITAL_VERSION}'
  or NEW.remaining_count<=0 or NEW.count<=0 or NEW.remaining_count>NEW.count
  or NEW.mode not in ('SIMULATION','LIVE')
 then return NEW;end if;
 -- Only first committed SIM opening or the verified LIVE fill transition.
 -- A later correction/reopen must never mint a retroactive authorization.
 if TG_OP='INSERT' then
   if NEW.mode<>'SIMULATION' then return NEW;end if;
 else
   if NEW.mode<>'LIVE' or OLD.status<>'entry_pending' then return NEW;end if;
 end if;
 if NEW.mode='LIVE' then
   p:=NEW;
   if ${liveCapitalParentEntryFillSql('p')} then return NEW;end if;
   -- A broker-confirmed fill must already have occurred when the opening
   -- event is captured. A future/missing proof cannot mint early authority.
   if (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint is null
     or (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint < p.opened_at_ms
     or (p.entry_config#>>'{entryFillProof,observedAtMs}')::bigint >
          (extract(epoch from clock_timestamp())*1000)::bigint
   then return NEW;end if;
 end if;
 select value into v from sag_settings where key='runtime';
 if v is null then return NEW;end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 epoch:=coalesce((v->>'resetTimestampMs')::bigint,0);
 if v->>'systemName' is distinct from NEW.system_name
  or v->>'ownerId' is distinct from NEW.owner_id
  or v->>'mode' is distinct from NEW.mode
  or NEW.opened_at_ms<epoch or NEW.opened_at_ms>at_ms
 then return NEW;end if;
 -- INSERT is atomic with the original capital opening or LIVE fill write.
 insert into sag_sa1_open_events_v1(
  parent_entry_id,system_name,owner_id,mode,reset_epoch,ticker,event_ticker,
  parent_opened_at_ms,confirmed_open_at_ms,parent_entry_price_cents,parent_count,
  enabled_at_open,settings_snapshot,recorded_at_ms)
 values(NEW.id,NEW.system_name,NEW.owner_id,NEW.mode,epoch,NEW.ticker,NEW.event_ticker,
  NEW.opened_at_ms,at_ms,NEW.entry_price_cents,NEW.count,
  (v->>'engineActive'='true' and v->>'sagittariusArrowEnabled'='true'),
  sag_sa1_open_settings_snapshot(v),at_ms)
 on conflict(parent_entry_id) do nothing;
 return NEW;
exception when others then
 -- Never roll back a broker-confirmed Starlight LIVE fill/accounting receipt
 -- because an optional child-opening audit record failed. Log the failure,
 -- leave Arrow unauthorized, preserve ownership and let the worker fail closed.
 if NEW.mode='LIVE' then
   raise warning 'sa1_open_event_capture_failed_for_live_receipt: %',SQLSTATE;
   return NEW;
 end if;
 raise;
end;$$;
drop trigger if exists sag_sa1_open_event_insert on sag_entries;
create trigger sag_sa1_open_event_insert after insert on sag_entries
 for each row execute function sag_sa1_capture_starlight_open();
drop trigger if exists sag_sa1_open_event_update on sag_entries;
create trigger sag_sa1_open_event_update after update of status on sag_entries
 for each row execute function sag_sa1_capture_starlight_open();
`;
