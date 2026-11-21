/** SN2 verified-loss recovery kernel. The signal itself cannot buy.
 * Separate transactional SIM/LIVE admission and guarded LIVE transport must
 * supply their own durable financial proof and native release verification.
 */
import {createHash} from 'node:crypto';
import {starlightRecoverySignalState,starlightRecoveryQuoteOrder} from './strategy.mjs';
import {isShadowSaintEntry} from './doctrine.mjs';
import {verifiedLiveCapitalParentEntryFill,liveCapitalParentEntryFillSql} from './liveParentEntryProof.mjs';
import {sagittariusArrowId} from './sagittariusArrowRecovery.mjs';
import {MODEL_CLONE_CAPITAL_VERSION,modelCloneCapitalId} from './modelCloneCapital.mjs';
import {independentArrowParentLineage,INDEPENDENT_ARROW_PARENT_SQL} from './independentArrowParent.mjs';
export const SN_CONCEPT='Scarlet Needle Recovery';
export const SN_VERSION='SN2-RECOVERY-WATCH-V1';
/** Link bypasses *strategy* thresholds only. Exchange prices, spread, depth,
 * scope, broker reconciliation, and other financial admission stay mandatory.
 * Frozen per-parent Link identity is the authority for a durable watch. */
export const scarletNeedleCapitalLinkBypassesStrategy = watch => watch?.link===true;
/** Independent GH entry-only bid/ask tolerance. Never widens the global
 * admission threshold for other Saints or changes protective exit doctrine.
 * Missing legacy GH setting falls back to the previous shared limit until
 * runtime migration persists an independent value.
 */
export function scarletNeedleCapitalSpreadAllowed(quote,settings={}){
 const limit=Number(settings.scarletNeedleCapitalMaxSpreadCents??settings.maxSpreadCents??3);
 const bid=Number(quote?.yesBid),ask=Number(quote?.yesAsk);
 return Number.isInteger(limit)&&limit>=0&&limit<=99
   &&Number.isFinite(bid)&&Number.isFinite(ask)
   &&bid>0&&ask>=bid&&ask<100&&ask-bid<=limit+1e-9;
}
export function scarletNeedleCapitalOperatorBandAllowed(watch,price,settings={}){
 if(scarletNeedleCapitalLinkBypassesStrategy(watch))return true;
 const min=Number(settings.scarletNeedleCapitalMinEntryCents),max=Number(settings.scarletNeedleCapitalMaxEntryCents);
 return Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max<100&&min<=max
   &&Number(price)>=min&&Number(price)<=max;
}

const number=x=>x===null||x===undefined||x===''?NaN:Number(x);
const same=(a,b)=>String(a??'')===String(b??'');
const validInt=x=>Number.isSafeInteger(number(x));
const deny=reason=>({ok:false,reason});

/** A parent loss only starts observation. No result here can place a BUY. */
export function verifiedSagittariusArrowLoss(e,s={},now=Date.now()){
  if(e?.conceptName!=='Sagittarius Arrow Recovery'||isShadowSaintEntry(e))return deny('not_real_lightning_parent');
  // Order sizes remain operator-controlled. Broker-confirmed LIVE inventory
  // can be fractional after a partial fill; it is still a real capital parent.
  const actualQuantity=number(e.count);
  const quantityValid=e.mode==='LIVE' ? Number.isFinite(actualQuantity)&&actualQuantity>0
    : validInt(e.count)&&actualQuantity>=1;
  if(e.archived||e.status!=='closed'||number(e.remainingCount)!==0||!quantityValid
    ||!Number.isFinite(number(e.exitFilledCount))
    ||Math.abs(number(e.exitFilledCount)-actualQuantity)>1e-9)return deny('lightning_not_fully_reconciled');
  for(const k of ['systemName','ownerId','mode'])if(!same(e[k],s[k])||!String(s[k]||''))return deny('lightning_scope_mismatch');
  if(!['SIMULATION','LIVE'].includes(e.mode))return deny('lightning_mode_invalid');
  const reset=number(s.resetTimestampMs??0);
  if(!validInt(reset)||reset<0||!(number(e.openedAtMs)>=reset)
    ||!(number(e.closedAtMs)>=number(e.openedAtMs))||number(e.closedAtMs)>now)return deny('lightning_epoch_invalid');
  const qty=number(e.count),entry=number(e.entryPriceCents),exit=number(e.exitPriceCents);
  if(!(entry>0&&entry<100&&exit>=0&&exit<=100)||!e.ticker||!e.eventTicker
    ||String(e.side||e.entryConfig?.side||'YES').toUpperCase()!=='YES')return deny('lightning_market_invalid');
  const amounts=[e.entryFeeCents,e.exitFeeCents,e.exitNotionalCents,e.pnlCents].map(number);
  if(amounts.some(x=>!Number.isFinite(x))||amounts[0]<0||amounts[1]<0||amounts[2]<0)return deny('lightning_fee_or_notional_invalid');
  const pnl=amounts[2]-qty*entry-amounts[0]-amounts[1];
  if(Math.abs(pnl-amounts[3])>0.000001||!(pnl<0))return deny('lightning_no_verified_net_loss');
  if(Math.abs(amounts[2]-exit*qty)>Math.max(0.000001,qty*0.501))return deny('lightning_exit_average_incoherent');
  // Completed LIVE orders retain their historical client order IDs by design.
  // A retained ID is not in itself evidence of an outstanding order: only a
  // missing authoritative receipt or nonterminal exit reconciliation is.
  if(e.mode==='SIMULATION'&&(e.entryClientOrderId||e.exitClientOrderId))
    return deny('lightning_sim_order_intent_unresolved');
  if(e.mode==='LIVE'){
    if(!e.entryOrderId)return deny('lightning_entry_receipt_missing');
    if(e.exitExecutionState?.terminal===false || (e.exitClientOrderId && e.exitExecutionState?.terminal!==true))
      return deny('lightning_unresolved_exit_receipt');
    if(!e.exitOrderId&&!e.exitExecutionState?.settlementConfirmed)
      return deny('lightning_exit_receipt_missing');
    // A LIVE parent needs exact broker entry-fill/fee/client identity, not an order receipt.
    if(!verifiedLiveCapitalParentEntryFill(e).ok)
      return deny('sn2_parent_live_entry_fill_unverified');
  }
  if(e.entryConfig?.independentRecovery!=null){
    const lineage=independentArrowParentLineage(e,s);if(!lineage.ok)return lineage;
    if(e.entryConfig?.aurora?.frozen!==true)return deny('lightning_capital_or_protection_unverified');
    return {ok:true,reason:'verified_independent_arrow_net_loss',parentEntryId:String(e.id),parentConcept:e.conceptName,entryPriceCents:entry,
      exitPriceCents:exit,realizedNetCents:pnl,closedAtMs:number(e.closedAtMs),
      count:qty,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset,
      ticker:e.ticker,eventTicker:e.eventTicker,side:'YES'};
  }
  if(e.entryConfig?.starlightModelClone===true){
    // A historical JSON flag is never sufficient to create downstream
    // funded recovery. This identity is minted only by the independently
    // scoped SC clone admission; retain the original parent/seat contract.
    const proof=e.entryConfig?.modelCloneCapital;
    const seat=number(proof?.seat),maximum=number(proof?.maximumSeats);
    const epoch=number(proof?.resetEpoch),source=String(e.sourceTradeId||'');
    if(proof?.version!==MODEL_CLONE_CAPITAL_VERSION
      ||!validInt(seat)||seat<1||!validInt(maximum)||maximum<1||maximum>20||seat>maximum
      ||!validInt(epoch)||epoch!==reset||!source
      ||proof?.positionId!==e.id||proof?.parentEntryId!==source
      ||proof?.concept!=='Sagittarius Arrow Recovery'
      ||proof?.cloneId!==`STARLIGHT-CLONE:Sagittarius Arrow Recovery:${source}`
      ||proof?.watchId!==`STARLIGHT-RECOVERY:${source}`
      ||!validInt(proof?.watchRevision)||number(proof.watchRevision)<1
      ||!String(proof?.shadowProofHash||'')
      ||e.id!==modelCloneCapitalId({systemName:e.systemName,ownerId:e.ownerId,
        mode:e.mode,resetEpoch:epoch,parentEntryId:source,concept:e.conceptName,seat,
        attemptGeneration:Number(proof?.attemptGeneration??0)})
      ||e.entryConfig?.executionClass!=='CAPITAL'||e.executionClass!=='CAPITAL'
      ||!e.entryConfig?.aurora?.frozen||e.entryConfig?.finalEntryConfirmation?.ok!==true)
      return deny('sn2_clone_parent_lineage_unverified');
    return {ok:true,reason:'verified_starlight_clone_arrow_loss',parentEntryId:String(e.id),parentConcept:e.conceptName,entryPriceCents:entry,
      exitPriceCents:exit,realizedNetCents:pnl,closedAtMs:number(e.closedAtMs),
      count:qty,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset,
      ticker:e.ticker,eventTicker:e.eventTicker,side:'YES'};
  }
  if(!['SA1-SIM-CAPITAL-V2','SA1-LIVE-CAPITAL-V1'].includes(e.entryConfig?.sagittariusArrowRecovery?.version))return deny('sn2_parent_new_recovery_proof_missing');
  // MEGAWAVE FIVE-WAVE: a negative P/L alone does not authorize a successor.
  // Prove the exact independently committed parent, watch, group and Multiply
  // seat identity. Historical similarly named Saints cannot satisfy this.
  const lineage=e.entryConfig?.sagittariusArrowRecovery;
  const sourceId=String(e.sourceTradeId||'');
  const seat=number(lineage?.seat),maximum=number(lineage?.capturedSettings?.multiply);
  const scope={systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset};
  if(!sourceId||!validInt(seat)||seat<1||!validInt(maximum)||maximum<1||maximum>20
    ||seat>maximum||!validInt(lineage?.watchRevision)||number(lineage.watchRevision)<1
    ||lineage.version!==(e.mode==='LIVE'?'SA1-LIVE-CAPITAL-V1':'SA1-SIM-CAPITAL-V2')
    ||lineage.parentEntryId!==sourceId||lineage.positionId!==e.id
    ||lineage.watchId!==sagittariusArrowId(scope,sourceId)
    ||lineage.groupId!==lineage.watchId
    ||!validInt(Number(lineage.retryAttempt??0))
    ||e.id!==sagittariusArrowId(scope,sourceId,seat,Number(lineage.retryAttempt??0))
    ||e.executionClass!=='CAPITAL'||e.entryConfig?.executionClass!=='CAPITAL')
    return deny('sn2_capital_parent_identity_or_lineage_unverified');
  if(!same(e.entryConfig?.executionClass||e.executionClass,'CAPITAL')
    ||!e.entryConfig?.aurora?.frozen)return deny('lightning_capital_or_protection_unverified');
  return {ok:true,reason:'verified_lightning_net_loss',parentEntryId:String(e.id),parentConcept:e.conceptName,entryPriceCents:entry,
    exitPriceCents:exit,realizedNetCents:pnl,closedAtMs:number(e.closedAtMs),
    count:qty,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset,
    ticker:e.ticker,eventTicker:e.eventTicker,side:'YES'};
}
export function scarletNeedleCapitalId(scope,parentId,seat=0){
 const fields=[scope?.systemName,scope?.ownerId,scope?.mode,scope?.resetEpoch,parentId];
 if(fields.some(v=>v==null||String(v)==='')||!Number.isSafeInteger(seat)||seat<0||seat>20)throw new Error('sn2_scoped_identity_invalid');
 return 'SN2-'+createHash('sha256').update(JSON.stringify([...fields.map(String),seat])).digest('hex').slice(0,40);
}
export function scarletNeedleCapitalWatchFromLoss(loss,settings={},now=Date.now()){
 if(!loss?.ok)return deny('sn2_parent_loss_required');
 if(settings.scarletNeedleCapitalEnabled!==true)return deny('sn2_disabled');
 const {systemName,ownerId,mode,resetEpoch,parentEntryId,ticker,eventTicker,entryPriceCents,exitPriceCents,closedAtMs,realizedNetCents}=loss;
 if(!(closedAtMs>0&&closedAtMs<=now))return deny('sn2_loss_time_invalid');
 const multiply=number(settings.scarletNeedleCapitalMultiply),observe=number(settings.scarletNeedleCapitalObservationMinutes);
 if(!validInt(multiply)||multiply<1||multiply>20||!Number.isFinite(observe)||observe<0||observe>1000)return deny('sn2_card_invalid');
 // Starlight does not discard an unresolved recovery after five minutes.
 // Keep the watch until market finality or an explicit terminal outcome.
 const durationMs=Number.MAX_SAFE_INTEGER-closedAtMs;
 const scope={systemName,ownerId,mode,resetEpoch};
 return {ok:true,watch:{version:SN_VERSION,id:scarletNeedleCapitalId(scope,parentEntryId),
   authorizationId:scarletNeedleCapitalId(scope,parentEntryId),systemName,ownerId,mode,resetEpoch,
   parentEntryId,parentConcept:'Sagittarius Arrow Recovery',ticker,eventTicker,side:'YES',
   originalParentEntryPriceCents:entryPriceCents,verifiedLosingExitPriceCents:exitPriceCents,
   parentRealizedNetCents:realizedNetCents,armedAtMs:closedAtMs,
   // Link ON is immediately eligible to qualify; observation applies only to Link OFF.
   releaseAtMs:closedAtMs+(settings.scarletNeedleCapitalLinkEnabled===true?0:Math.round(observe*60_000)),
   expiresAtMs:closedAtMs+durationMs,stopPriceCents:exitPriceCents,peakSinceArmCents:exitPriceCents,
   troughSinceArmCents:exitPriceCents,upwardTicks:0,lastBidCents:null,lastQuoteAtMs:0,
   maximumSeats:multiply,link:settings.scarletNeedleCapitalLinkEnabled===true,status:'WATCHING',revision:1,
   lastQuoteEpoch:null,lastQuoteRevision:0,lastSignalReason:'not_observed',lastObservedAtMs:0}};
}
export function scarletNeedleCapitalSignalState(w,q,s={},now=Date.now(),opts={}){
 if(!w||w.version!==SN_VERSION||w.parentConcept!=='Sagittarius Arrow Recovery')return {...w,qualified:false,reason:'sn2_watch_identity_invalid'};
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {...w,qualified:false,reason:'sn2_market_identity_changed'};
 const rise=number(s.scarletNeedleCapitalParentEntryRiseCents??0),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 const at=number(q?.quoteAtMs),maxAge=5000; // observation only; admission keeps operator book age
 if(!validInt(rise)||rise<0||rise>99)return {...w,qualified:false,reason:'sn2_parent_rise_invalid'};
 // A durable Link watch created by an older release might still carry a delayed
 // releaseAtMs. Do not let persisted legacy observation timers delay Link ON.
 if(now>number(w.expiresAtMs)||(w.link!==true&&now<number(w.releaseAtMs)))
   return {...w,qualified:false,reason:'sn2_observation_or_expiry'};
 if(q?.status!=='active'||q?.bookInvalid||q?.result||!(bid>0&&bid<=ask&&ask<100))return {...w,qualified:false,reason:'sn2_market_not_executable'};
 if(!(at>=number(w.armedAtMs))||at>now||!(now-at<=maxAge))return {...w,qualified:false,reason:'sn2_quote_stale_or_pre_loss'};
 // The operator's Link ON doctrine bypasses ALL recovery signal filters,
 // including parent-entry rise, the configured price band and the historical
 // losing-exit ask ceiling. It never bypasses executable-book validation.
 if(w.link===true)return {...w,qualified:true,reason:'sn2_link_qualified',lastAskCents:ask};
 if(rise>0&&!(bid>=number(w.originalParentEntryPriceCents)+rise))return {...w,qualified:false,reason:'sn2_below_original_parent_entry_rise'};
 if(!scarletNeedleCapitalOperatorBandAllowed(w,ask,s))return {...w,qualified:false,reason:'sn2_entry_band'};
 const mapped={...s,crashRecoveryHunterMinCrashCents:s.scarletNeedleCapitalMinCrashCents,
   crashRecoveryHunterMinReboundCents:s.scarletNeedleCapitalMinReboundCents,
   crashRecoveryHunterMinUpwardTicks:s.scarletNeedleCapitalMinUpwardTicks,
   crashRecoveryMinEntryCents:s.scarletNeedleCapitalMinEntryCents,crashRecoveryMaxEntryCents:s.scarletNeedleCapitalMaxEntryCents};
 return starlightRecoverySignalState(w,q,mapped,now,opts);
}
/** Deterministic watch transition. This module NEVER authorizes capital by itself.
 * A stale/out-of-order or invalid book must not overwrite valid signal history.
 * This function can be replayed from the persisted JSONB watch after restart.
 */
export function scarletNeedleCapitalObservationStep(w,q,settings={},now=Date.now()){
 if(!w||w.version!==SN_VERSION)return deny('sn2_watch_version_invalid');
 if(!['WATCHING','READY','BLOCKED','EXPIRED'].includes(w.status))return deny('sn2_watch_not_observable');
 if(w.status==='BLOCKED'||w.status==='EXPIRED')return {ok:true,changed:false,watch:w,reason:'sn2_terminal_watch'};
 if(now>Number(w.expiresAtMs))return {ok:true,changed:true,reason:'sn2_expired',watch:{...w,status:'EXPIRED',qualified:false,lastSignalReason:'sn2_expired',terminalReason:'expired',updatedAtMs:now,historicalQualified:w.qualified===true}};
 const quoteAt=number(q?.quoteAtMs),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {ok:true,changed:false,reason:'sn2_market_identity_mismatch',watch:w};
 // Recovery terminal observations must be ordered after the armed watch and
 // its latest accepted quote. An older/replayed finality hint cannot erase a
 // newer durable watch; only a proven newer terminal event can block entries.
 if(['finalized','settled','determined','closed'].includes(String(q?.status||'').toLowerCase())||q?.result){
   if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now)
     return {ok:true,changed:false,reason:'sn2_stale_quote',watch:w};
   if(starlightRecoveryQuoteOrder(w,q)<=0)
     return {ok:true,changed:false,reason:'sn2_duplicate_or_out_of_order_quote',watch:w};
   return {ok:true,changed:true,reason:'sn2_market_terminal',watch:{...w,status:'BLOCKED',qualified:false,lastSignalReason:'sn2_market_terminal',terminalReason:'market_finality',updatedAtMs:now,historicalQualified:w.qualified===true}};
 }
 if(q?.status!=='active'||q?.bookInvalid||!(bid>0&&bid<100)||!(ask>=bid&&ask<100)||!(quoteAt>0&&quoteAt<=now))
   return {ok:true,changed:false,reason:'sn2_market_not_executable',watch:w};
 const requestedBookAge=number(settings.infinityBreakMaximumBookAgeMs??5000);
 // Invalid readiness settings cannot advance a durable recovery quote cursor.
 if(!Number.isFinite(requestedBookAge)||requestedBookAge<100)
   return {ok:true,changed:false,reason:'sn2_invalid_quote_age_limit',watch:w};
 const ageLimit=5000; // observation only; admission keeps operator book age
 if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now||now-quoteAt>ageLimit)
   return {ok:true,changed:false,reason:'sn2_stale_quote',watch:w};
 const order=starlightRecoveryQuoteOrder(w,q);
 const legacyLinkGate=['sn2_entry_band','sn2_link_above_parent_exit','sn2_below_original_parent_entry_rise'].includes(w.lastSignalReason);
 const safeLegacyReplay=w.link===true&&legacyLinkGate&&w.qualified!==true
   &&quoteAt===number(w.lastQuoteAtMs)&&order===0;
 if(order<=0&&!safeLegacyReplay)return {ok:true,changed:false,reason:'sn2_duplicate_or_out_of_order_quote',watch:w};
 const next=scarletNeedleCapitalSignalState(w,q,settings,now,{advance:true});
 // READY is a signal fact, not a permission to BUY. The SQL watch remains WATCHING.
 const status='WATCHING';
 const watch={...next,status,qualified:next.qualified===true,lastSignalReason:next.reason,updatedAtMs:now,
   lastQuoteAtMs:quoteAt,lastQuoteEpoch:q.quoteObservation?.epoch||null,
   lastQuoteRevision:number(q.quoteObservation?.revision)||0};
 return {ok:true,changed:true,watch,reason:next.reason};
}

/** Deterministic seat plan. Attempts to re-use a seat or add a sixth are denied. */
export function scarletNeedleCapitalSeatPlan(w,occupied=[]){
 if(w?.version!==SN_VERSION||!Number.isSafeInteger(number(w.maximumSeats))||number(w.maximumSeats)<1||number(w.maximumSeats)>20)
  return deny('sn2_watch_seat_cap_invalid');
 const seen=new Set();
 for(const seat of occupied){
  const idx=number(seat?.seat);
  if(!Number.isSafeInteger(idx)||idx<1||idx>number(w.maximumSeats)||seen.has(idx))return deny('sn2_seat_ledger_corrupt');
  seen.add(idx);
 }
 const free=[];
 for(let i=1;i<=number(w.maximumSeats);i++)if(!seen.has(i))free.push(i);
 return {ok:true,free,consumed:[...seen].sort((a,b)=>a-b),maximumSeats:number(w.maximumSeats)};
}

export function scarletNeedleCapitalAdmissionDecision({watch,seat,settings,quote,parent,now=Date.now()}={}){
 if(!watch||watch.version!==SN_VERSION||settings?.scarletNeedleCapitalEnabled!==true)return deny('sn2_disabled_or_watch_missing');
 const loss=verifiedSagittariusArrowLoss(parent,settings,now);if(!loss.ok)return loss;
 if(watch.id!==scarletNeedleCapitalId(loss,loss.parentEntryId)||!same(watch.parentEntryId,parent.id)
   ||watch.parentConcept!=='Sagittarius Arrow Recovery'||watch.side!=='YES'
   ||!same(watch.systemName,loss.systemName)||!same(watch.ownerId,loss.ownerId)
   ||!same(watch.mode,loss.mode)||number(watch.resetEpoch)!==loss.resetEpoch
   ||!same(watch.ticker,loss.ticker)||!same(watch.eventTicker,loss.eventTicker)
   ||number(watch.originalParentEntryPriceCents)!==loss.entryPriceCents
   ||number(watch.verifiedLosingExitPriceCents)!==loss.exitPriceCents)return deny('sn2_parent_authorization_drift');
 if(!validInt(seat)||seat<1||seat>number(watch.maximumSeats)||number(watch.maximumSeats)!==number(settings.scarletNeedleCapitalMultiply))return deny('sn2_seat_cap_invalid');
 const signal=scarletNeedleCapitalSignalState(watch,quote,settings,now);
 if(!signal.qualified)return deny(signal.reason);
 return {ok:true,reason:'sn2_signal_only_no_capital_authority',seat,groupId:watch.id,positionId:scarletNeedleCapitalId(loss,loss.parentEntryId,seat)};
}
/** Additive schema; scoped LIVE requires a transaction-local proof and durable pending intent. */
export const SCARLET_NEEDLE_RECOVERY_SQL=INDEPENDENT_ARROW_PARENT_SQL+`
-- SN2-LIVE: no general direct-insert authority. Only a locked, scoped
-- transaction can insert an individually authorized SIM or LIVE seat.
create or replace function sag_sn2_pre_certification_fence() returns trigger language plpgsql as $$
declare w record; p sag_entries; s jsonb; rec jsonb; seat_n int; at_ms bigint;
begin
 if NEW.concept_name<>'Scarlet Needle Recovery' then return NEW;end if;
 if NEW.mode not in ('SIMULATION','LIVE')
  or (NEW.mode='SIMULATION' and NEW.status<>'open')
  or (NEW.mode='LIVE' and NEW.status<>'entry_pending')
  or NEW.execution_class is distinct from 'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or (NEW.mode='SIMULATION' and current_setting('sagittarius.sn2_sim_entry',true) is distinct from 'admitted')
  or (NEW.mode='LIVE' and current_setting('sagittarius.sn2_live_entry',true) is distinct from 'admitted')
 then raise exception 'sn2_live_and_direct_insert_forbidden';end if;
 select value into s from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'scarletNeedleCapitalRecovery';
 if s->>'engineActive' is distinct from 'true' or s->>'scarletNeedleCapitalEnabled' is distinct from 'true'
  or s->>'mode' is distinct from NEW.mode
  or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true') or s->>'systemName' is distinct from NEW.system_name
  or s->>'ownerId' is distinct from NEW.owner_id
  or coalesce((s->>'resetTimestampMs')::bigint,0)<>(NEW.entry_config->>'resetTimestampMs')::bigint
  or rec->>'version' is distinct from (case when NEW.mode='LIVE' then 'SN2-LIVE-CAPITAL-V1' else 'SN2-SIM-CAPITAL-V2' end)
  or rec->>'parentEntryId' is distinct from NEW.source_trade_id
  or rec->>'positionId' is distinct from NEW.id
  or (rec->>'seat')::int not between 1 and 20
  or NEW.remaining_count<>NEW.count or NEW.count<=0
  or (NEW.mode='SIMULATION' and NEW.entry_client_order_id is not null)
  or (NEW.mode='LIVE' and (NEW.entry_client_order_id is null or length(NEW.entry_client_order_id)<8))
  or NEW.entry_order_id is not null
  or NEW.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or (NEW.entry_config->'aurora'->>'damageControlPercent')::numeric is distinct from (s->>'scarletNeedleCapitalAuroraDamageControlPercent')::numeric
 then raise exception 'sn2_scoped_frozen_identity_or_settings_invalid';end if;
 select * into w from sag_scarlet_needle_recovery_watches_v1 where id=rec->>'watchId' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for share;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 seat_n:=(rec->>'seat')::int;
 if w.id is null or p.id is null or w.status<>'WATCHING'
  or w.parent_entry_id<>p.id or w.system_name<>NEW.system_name or w.owner_id<>NEW.owner_id
  or w.mode<>NEW.mode or w.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or w.ticker<>NEW.ticker or w.event_ticker<>NEW.event_ticker
  or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
  or w.watch->>'eventTicker' is distinct from NEW.event_ticker
  or w.watch->>'parentConcept' is distinct from 'Sagittarius Arrow Recovery'
  or w.watch->>'side' is distinct from 'YES'
  or w.watch->>'systemName' is distinct from NEW.system_name
  or w.watch->>'ownerId' is distinct from NEW.owner_id
  or w.watch->>'mode' is distinct from NEW.mode
  or w.watch->>'resetEpoch' is distinct from w.reset_epoch::text
  or (w.watch->>'qualified') is distinct from 'true'
  or p.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or not (
    -- Clone Arrow and native SA1 are distinct parent admission contracts.
    -- All financial, broker-fill, watch, fee and scope guards below apply
    -- to BOTH, including to a historical row with a plausible clone flag.
    (
      p.entry_config->>'starlightModelClone'='true'
      and p.entry_config#>>'{modelCloneCapital,version}'='SC-MODEL-CLONE-V1'
      and p.entry_config#>>'{modelCloneCapital,positionId}'=p.id
      and p.entry_config#>>'{modelCloneCapital,parentEntryId}'=p.source_trade_id
      and p.entry_config#>>'{modelCloneCapital,concept}'='Sagittarius Arrow Recovery'
      and p.entry_config#>>'{modelCloneCapital,cloneId}'='STARLIGHT-CLONE:Sagittarius Arrow Recovery:'||p.source_trade_id
      and p.entry_config#>>'{modelCloneCapital,watchId}'='STARLIGHT-RECOVERY:'||p.source_trade_id
      and (p.entry_config#>>'{modelCloneCapital,seat}')::int between 1 and 20
      and (p.entry_config#>>'{modelCloneCapital,maximumSeats}')::int between
        (p.entry_config#>>'{modelCloneCapital,seat}')::int and 20
      and (p.entry_config#>>'{modelCloneCapital,watchRevision}')::bigint>=1
      and nullif(p.entry_config#>>'{modelCloneCapital,shadowProofHash}','') is not null
      and (p.entry_config#>>'{modelCloneCapital,resetEpoch}')::bigint=w.reset_epoch
      and p.entry_config#>>'{finalEntryConfirmation,ok}'='true'
      and exists (select 1 from sag_shadow_stops_v3 sp
          join sag_entries ap on ap.id=sp.parent_entry_id
        where ap.id=p.source_trade_id and ap.concept_name='Athena Exclamation'
          and ap.execution_class='SHADOW_SAINT' and ap.status='closed'
          and ap.close_reason='hard_stop_loss' and ap.pnl_cents<0 and ap.remaining_count=0
          and ap.archived=false and ap.ticker=p.ticker and ap.event_ticker=p.event_ticker
          and ap.system_name=p.system_name and ap.owner_id=p.owner_id and ap.mode=p.mode
          and sp.system_name=p.system_name and sp.owner_id=p.owner_id and sp.mode=p.mode
          and sp.reset_epoch=w.reset_epoch
          and sp.proof_hash=p.entry_config#>>'{modelCloneCapital,shadowProofHash}'
          and sp.proof->>'authorization'='VALID_SHADOW_HARD_STOP'
          and sp.proof->>'full'='true'
      )
    )
    or sag_r15_independent_arrow_origin(p,w.reset_epoch)
    or (
      p.entry_config->>'starlightModelClone' is distinct from 'true'
      and p.entry_config#>>'{sagittariusArrowRecovery,parentEntryId}'=p.source_trade_id
      and p.entry_config#>>'{sagittariusArrowRecovery,positionId}'=p.id
      and p.entry_config#>>'{sagittariusArrowRecovery,groupId}'=p.entry_config#>>'{sagittariusArrowRecovery,watchId}'
      and exists (select 1 from sag_sagittarius_arrow_seats_v1 ps
        where ps.position_id=p.id and ps.watch_id=p.entry_config#>>'{sagittariusArrowRecovery,watchId}'
        and ps.seat=(p.entry_config#>>'{sagittariusArrowRecovery,seat}')::integer
        and ps.status='CLOSED')
      and p.entry_config#>>'{sagittariusArrowRecovery,version}'=
        (case when p.mode='LIVE' then 'SA1-LIVE-CAPITAL-V1' else 'SA1-SIM-CAPITAL-V2' end)
      and coalesce((p.entry_config#>>'{sagittariusArrowRecovery,seat}')::integer,0) between 1 and 20
      and coalesce((p.entry_config#>>'{sagittariusArrowRecovery,watchRevision}')::bigint,0)>=1
    )
  )
  or p.concept_name<>'Sagittarius Arrow Recovery' or p.status<>'closed' or p.remaining_count<>0 or p.pnl_cents>=0
  or p.execution_class is distinct from 'CAPITAL'
  or p.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or ${liveCapitalParentEntryFillSql()}
  or (p.mode='LIVE' and (p.exit_execution_state->>'terminal'='false'
    or (p.exit_client_order_id is not null and p.exit_execution_state->>'terminal' is distinct from 'true')))
  or p.system_name<>NEW.system_name or p.owner_id<>NEW.owner_id or p.mode<>NEW.mode
  or p.opened_at_ms<w.reset_epoch
  or (rec->>'watchRevision')::bigint<>w.revision
  or seat_n>coalesce((w.watch->>'maximumSeats')::int,0)
  or (rec->>'quoteAtMs')::bigint not between greatest((w.watch->>'armedAtMs')::bigint,at_ms-5000) and at_ms
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,verifiedAtMs}')::bigint,0) not between at_ms-5000 and at_ms
  or (rec->>'quoteAskCents')::numeric<>(NEW.entry_config#>>'{finalEntryConfirmation,askCents}')::numeric
  or rec->>'quoteBidCents' is null
  or (rec->>'quoteAskCents')::numeric<(rec->>'quoteBidCents')::numeric
  or (rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric>
      coalesce((s->>'scarletNeedleCapitalMaxSpreadCents')::numeric,(s->>'maxSpreadCents')::numeric,3)
  or NEW.spread_at_entry_cents<>(rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric
  or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
  or (w.watch->>'link') is distinct from (s->>'scarletNeedleCapitalLinkEnabled')
  or (rec#>>'{capturedSettings,link}') is distinct from (w.watch->>'link')
  or (coalesce((w.watch->>'link')::boolean,false)=false
    and NEW.entry_price_cents not between (s->>'scarletNeedleCapitalMinEntryCents')::numeric and (s->>'scarletNeedleCapitalMaxEntryCents')::numeric)
  or not exists (select 1 from sag_scarlet_needle_recovery_seats_v1 x where x.watch_id=w.id and x.seat=seat_n
    and x.position_id=NEW.id and x.status='RESERVED')
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,availableAtLimitCount}')::bigint,0)
       < NEW.count + (case when NEW.mode='LIVE' then 0 else
          (select coalesce(sum(e.count),0) from sag_scarlet_needle_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE')) end)
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,existingGroupQuantity}')::double precision,-1)
       <> (select coalesce(sum(e.count),0) from sag_scarlet_needle_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE'))
 then raise exception 'sn2_scoped_parent_watch_or_seat_not_authorized';end if;
 return NEW;
end;$$;
drop trigger if exists sag_sn2_pre_certification_insert_fence on sag_entries;
create trigger sag_sn2_pre_certification_insert_fence before insert on sag_entries
 for each row execute function sag_sn2_pre_certification_fence();
create table if not exists sag_scarlet_needle_recovery_watches_v1(
 id text primary key, version text not null, system_name text not null,owner_id text not null,
 mode text not null check(mode in ('SIMULATION','LIVE')),reset_epoch bigint not null,
 parent_entry_id text not null references sag_entries(id),ticker text not null,event_ticker text not null,
 status text not null check(status in ('WATCHING','READY','EXECUTING','BLOCKED','EXPIRED','CONSUMED')),
 revision bigint not null default 1 check(revision>=1),watch jsonb not null,
 updated_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,parent_entry_id)
);
alter table sag_scarlet_needle_recovery_watches_v1 add column if not exists last_scan_ms bigint not null default 0;
create index if not exists sag_sn2_watch_scan on sag_scarlet_needle_recovery_watches_v1
 (system_name,owner_id,mode,reset_epoch,status,last_scan_ms);
create index if not exists sag_sn2_watch_scope on sag_scarlet_needle_recovery_watches_v1
(system_name,owner_id,mode,reset_epoch,status,updated_at_ms);
create table if not exists sag_scarlet_needle_recovery_seats_v1(
 watch_id text not null references sag_scarlet_needle_recovery_watches_v1(id),seat int not null check(seat between 1 and 20),
 position_id text not null unique,order_intent_id text unique,
 status text not null check(status in ('RESERVED','SUBMITTED','RECONCILE','FILLED','CLOSED','REJECTED')),
 primary key(watch_id,seat)
);
-- Financial closure never frees an occupied Multiply seat. An idempotent
-- trigger keeps the seat ledger visible after either protective or settlement exit.
create or replace function sag_sn2_capital_seat_close() returns trigger language plpgsql as $$
begin
 if NEW.concept_name='Scarlet Needle Recovery' and NEW.status='open' and OLD.status='entry_pending' then
  update sag_scarlet_needle_recovery_seats_v1 set status='FILLED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Scarlet Needle Recovery' and NEW.status='rejected' and OLD.status is distinct from 'rejected' then
  update sag_scarlet_needle_recovery_seats_v1 set status='REJECTED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Scarlet Needle Recovery' and NEW.status='closed' and OLD.status is distinct from 'closed' then
  update sag_scarlet_needle_recovery_seats_v1 set status='CLOSED'
   where position_id=NEW.id and status in ('FILLED','SUBMITTED','RECONCILE');
 end if;
 return NEW;
end;$$;
drop trigger if exists sag_sn2_capital_seat_close_trigger on sag_entries;
create trigger sag_sn2_capital_seat_close_trigger after update on sag_entries
 for each row execute function sag_sn2_capital_seat_close();
`;
