/** PR3 verified-loss recovery kernel. The signal itself cannot buy.
 * Separate transactional SIM/LIVE admission and guarded LIVE transport must
 * supply their own durable financial proof and native release verification.
 */
import {createHash} from 'node:crypto';
import {starlightRecoverySignalState,starlightRecoveryQuoteOrder} from './strategy.mjs';
import {isShadowSaintEntry} from './doctrine.mjs';
import {verifiedLiveCapitalParentEntryFill,liveCapitalParentEntryFillSql} from './liveParentEntryProof.mjs';
import {scarletNeedleCapitalId} from './scarletNeedleCapitalRecovery.mjs';
export const PR_CONCEPT='Pegasus Ryu Sei Ken Recovery';
export const PR_VERSION='PR3-RECOVERY-WATCH-V1';
/** Link bypasses *strategy* thresholds only. Exchange prices, spread, depth,
 * scope, broker reconciliation, and other financial admission stay mandatory.
 * Frozen per-parent Link identity is the authority for a durable watch. */
export const pegasusRyuSeiKenCapitalLinkBypassesStrategy = watch => watch?.link===true;
/** Independent GH entry-only bid/ask tolerance. Never widens the global
 * admission threshold for other Saints or changes protective exit doctrine.
 * Missing legacy GH setting falls back to the previous shared limit until
 * runtime migration persists an independent value.
 */
export function pegasusRyuSeiKenCapitalSpreadAllowed(quote,settings={}){
 const limit=Number(settings.pegasusRyuSeiKenCapitalMaxSpreadCents??settings.maxSpreadCents??3);
 const bid=Number(quote?.yesBid),ask=Number(quote?.yesAsk);
 return Number.isInteger(limit)&&limit>=0&&limit<=99
   &&Number.isFinite(bid)&&Number.isFinite(ask)
   &&bid>0&&ask>=bid&&ask<100&&ask-bid<=limit+1e-9;
}
export function pegasusRyuSeiKenCapitalOperatorBandAllowed(watch,price,settings={}){
 if(pegasusRyuSeiKenCapitalLinkBypassesStrategy(watch))return true;
 const min=Number(settings.pegasusRyuSeiKenCapitalMinEntryCents),max=Number(settings.pegasusRyuSeiKenCapitalMaxEntryCents);
 return Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max<100&&min<=max
   &&Number(price)>=min&&Number(price)<=max;
}

const number=x=>x===null||x===undefined||x===''?NaN:Number(x);
const same=(a,b)=>String(a??'')===String(b??'');
const validInt=x=>Number.isSafeInteger(number(x));
const deny=reason=>({ok:false,reason});

/** A parent loss only starts observation. No result here can place a BUY. */
export function verifiedScarletNeedleRecoveryLoss(e,s={},now=Date.now()){
  if(e?.conceptName!=='Scarlet Needle Recovery'||isShadowSaintEntry(e))return deny('not_real_lightning_parent');
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
      return deny('pr3_parent_live_entry_fill_unverified');
  }
  if(!['SN2-SIM-CAPITAL-V2','SN2-LIVE-CAPITAL-V1'].includes(e.entryConfig?.scarletNeedleCapitalRecovery?.version))return deny('pr3_parent_new_recovery_proof_missing');
  // MEGAWAVE FIVE-WAVE: a negative P/L alone does not authorize a successor.
  // Prove the exact independently committed parent, watch, group and Multiply
  // seat identity. Historical similarly named Saints cannot satisfy this.
  const lineage=e.entryConfig?.scarletNeedleCapitalRecovery;
  const sourceId=String(e.sourceTradeId||'');
  const seat=number(lineage?.seat),maximum=number(lineage?.capturedSettings?.multiply);
  const scope={systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset};
  if(!sourceId||!validInt(seat)||seat<1||!validInt(maximum)||maximum<1||maximum>20
    ||seat>maximum||!validInt(lineage?.watchRevision)||number(lineage.watchRevision)<1
    ||lineage.version!==(e.mode==='LIVE'?'SN2-LIVE-CAPITAL-V1':'SN2-SIM-CAPITAL-V2')
    ||lineage.parentEntryId!==sourceId||lineage.positionId!==e.id
    ||lineage.watchId!==scarletNeedleCapitalId(scope,sourceId)
    ||lineage.groupId!==lineage.watchId
    ||e.id!==scarletNeedleCapitalId(scope,sourceId,seat)
    ||e.executionClass!=='CAPITAL'||e.entryConfig?.executionClass!=='CAPITAL')
    return deny('pr3_capital_parent_identity_or_lineage_unverified');
  if(!same(e.entryConfig?.executionClass||e.executionClass,'CAPITAL')
    ||!e.entryConfig?.aurora?.frozen)return deny('lightning_capital_or_protection_unverified');
  return {ok:true,reason:'verified_lightning_net_loss',parentEntryId:String(e.id),entryPriceCents:entry,
    exitPriceCents:exit,realizedNetCents:pnl,closedAtMs:number(e.closedAtMs),
    count:qty,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset,
    ticker:e.ticker,eventTicker:e.eventTicker,side:'YES'};
}
export function pegasusRyuSeiKenCapitalId(scope,parentId,seat=0){
 const fields=[scope?.systemName,scope?.ownerId,scope?.mode,scope?.resetEpoch,parentId];
 if(fields.some(v=>v==null||String(v)==='')||!Number.isSafeInteger(seat)||seat<0||seat>20)throw new Error('pr3_scoped_identity_invalid');
 return 'PR3-'+createHash('sha256').update(JSON.stringify([...fields.map(String),seat])).digest('hex').slice(0,40);
}
export function pegasusRyuSeiKenCapitalWatchFromLoss(loss,settings={},now=Date.now()){
 if(!loss?.ok)return deny('pr3_parent_loss_required');
 if(settings.pegasusRyuSeiKenCapitalEnabled!==true)return deny('pr3_disabled');
 const {systemName,ownerId,mode,resetEpoch,parentEntryId,ticker,eventTicker,entryPriceCents,exitPriceCents,closedAtMs,realizedNetCents}=loss;
 if(!(closedAtMs>0&&closedAtMs<=now))return deny('pr3_loss_time_invalid');
 const multiply=number(settings.pegasusRyuSeiKenCapitalMultiply),observe=number(settings.pegasusRyuSeiKenCapitalObservationMinutes);
 if(!validInt(multiply)||multiply<1||multiply>20||!Number.isFinite(observe)||observe<0||observe>1000)return deny('pr3_card_invalid');
 // Starlight does not discard an unresolved recovery after five minutes.
 // Keep the watch until market finality or an explicit terminal outcome.
 const durationMs=Number.MAX_SAFE_INTEGER-closedAtMs;
 const scope={systemName,ownerId,mode,resetEpoch};
 return {ok:true,watch:{version:PR_VERSION,id:pegasusRyuSeiKenCapitalId(scope,parentEntryId),
   authorizationId:pegasusRyuSeiKenCapitalId(scope,parentEntryId),systemName,ownerId,mode,resetEpoch,
   parentEntryId,parentConcept:loss.parentConcept||'Scarlet Needle Recovery',ticker,eventTicker,side:'YES',
   originalParentEntryPriceCents:entryPriceCents,verifiedLosingExitPriceCents:exitPriceCents,
   parentRealizedNetCents:realizedNetCents,armedAtMs:closedAtMs,
   // Link ON is immediately eligible to qualify; observation applies only to Link OFF.
   releaseAtMs:closedAtMs+(settings.pegasusRyuSeiKenCapitalLinkEnabled===true?0:Math.round(observe*60_000)),
   expiresAtMs:closedAtMs+durationMs,stopPriceCents:exitPriceCents,peakSinceArmCents:exitPriceCents,
   troughSinceArmCents:exitPriceCents,upwardTicks:0,lastBidCents:null,lastQuoteAtMs:0,
   maximumSeats:multiply,link:settings.pegasusRyuSeiKenCapitalLinkEnabled===true,status:'WATCHING',revision:1,
   lastQuoteEpoch:null,lastQuoteRevision:0,lastSignalReason:'not_observed',lastObservedAtMs:0}};
}
export function pegasusRyuSeiKenCapitalSignalState(w,q,s={},now=Date.now(),opts={}){
 if(!w||w.version!==PR_VERSION||w.parentConcept!=='Scarlet Needle Recovery')return {...w,qualified:false,reason:'pr3_watch_identity_invalid'};
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {...w,qualified:false,reason:'pr3_market_identity_changed'};
 const rise=number(s.pegasusRyuSeiKenCapitalParentEntryRiseCents??0),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 const at=number(q?.quoteAtMs),maxAge=5000; // observation only; admission keeps operator book age
 if(!validInt(rise)||rise<0||rise>99)return {...w,qualified:false,reason:'pr3_parent_rise_invalid'};
 // A durable Link watch created by an older release might still carry a delayed
 // releaseAtMs. Do not let persisted legacy observation timers delay Link ON.
 if(now>number(w.expiresAtMs)||(w.link!==true&&now<number(w.releaseAtMs)))
   return {...w,qualified:false,reason:'pr3_observation_or_expiry'};
 if(q?.status!=='active'||q?.bookInvalid||q?.result||!(bid>0&&bid<=ask&&ask<100))return {...w,qualified:false,reason:'pr3_market_not_executable'};
 if(!(at>=number(w.armedAtMs))||at>now||!(now-at<=maxAge))return {...w,qualified:false,reason:'pr3_quote_stale_or_pre_loss'};
 // The operator's Link ON doctrine bypasses ALL recovery signal filters,
 // including parent-entry rise, the configured price band and the historical
 // losing-exit ask ceiling. It never bypasses executable-book validation.
 if(w.link===true)return {...w,qualified:true,reason:'pr3_link_qualified',lastAskCents:ask};
 if(rise>0&&!(bid>=number(w.originalParentEntryPriceCents)+rise))return {...w,qualified:false,reason:'pr3_below_original_parent_entry_rise'};
 if(!pegasusRyuSeiKenCapitalOperatorBandAllowed(w,ask,s))return {...w,qualified:false,reason:'pr3_entry_band'};
 const mapped={...s,crashRecoveryHunterMinCrashCents:s.pegasusRyuSeiKenCapitalMinCrashCents,
   crashRecoveryHunterMinReboundCents:s.pegasusRyuSeiKenCapitalMinReboundCents,
   crashRecoveryHunterMinUpwardTicks:s.pegasusRyuSeiKenCapitalMinUpwardTicks,
   crashRecoveryMinEntryCents:s.pegasusRyuSeiKenCapitalMinEntryCents,crashRecoveryMaxEntryCents:s.pegasusRyuSeiKenCapitalMaxEntryCents};
 return starlightRecoverySignalState(w,q,mapped,now,opts);
}
/** Deterministic watch transition. This module NEVER authorizes capital by itself.
 * A stale/out-of-order or invalid book must not overwrite valid signal history.
 * This function can be replayed from the persisted JSONB watch after restart.
 */
export function pegasusRyuSeiKenCapitalObservationStep(w,q,settings={},now=Date.now()){
 if(!w||w.version!==PR_VERSION)return deny('pr3_watch_version_invalid');
 if(!['WATCHING','READY','BLOCKED','EXPIRED'].includes(w.status))return deny('pr3_watch_not_observable');
 if(w.status==='BLOCKED'||w.status==='EXPIRED')return {ok:true,changed:false,watch:w,reason:'pr3_terminal_watch'};
 if(now>Number(w.expiresAtMs))return {ok:true,changed:true,reason:'pr3_expired',watch:{...w,status:'EXPIRED',qualified:false,lastSignalReason:'pr3_expired',terminalReason:'expired',updatedAtMs:now,historicalQualified:w.qualified===true}};
 const quoteAt=number(q?.quoteAtMs),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {ok:true,changed:false,reason:'pr3_market_identity_mismatch',watch:w};
 // Recovery terminal observations must be ordered after the armed watch and
 // its latest accepted quote. An older/replayed finality hint cannot erase a
 // newer durable watch; only a proven newer terminal event can block entries.
 if(['finalized','settled','determined','closed'].includes(String(q?.status||'').toLowerCase())||q?.result){
   if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now)
     return {ok:true,changed:false,reason:'pr3_stale_quote',watch:w};
   if(starlightRecoveryQuoteOrder(w,q)<=0)
     return {ok:true,changed:false,reason:'pr3_duplicate_or_out_of_order_quote',watch:w};
   return {ok:true,changed:true,reason:'pr3_market_terminal',watch:{...w,status:'BLOCKED',qualified:false,lastSignalReason:'pr3_market_terminal',terminalReason:'market_finality',updatedAtMs:now,historicalQualified:w.qualified===true}};
 }
 if(q?.status!=='active'||q?.bookInvalid||!(bid>0&&bid<100)||!(ask>=bid&&ask<100)||!(quoteAt>0&&quoteAt<=now))
   return {ok:true,changed:false,reason:'pr3_market_not_executable',watch:w};
 const requestedBookAge=number(settings.infinityBreakMaximumBookAgeMs??5000);
 // Invalid readiness settings cannot advance a durable recovery quote cursor.
 if(!Number.isFinite(requestedBookAge)||requestedBookAge<100)
   return {ok:true,changed:false,reason:'pr3_invalid_quote_age_limit',watch:w};
 const ageLimit=5000; // observation only; admission keeps operator book age
 if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now||now-quoteAt>ageLimit)
   return {ok:true,changed:false,reason:'pr3_stale_quote',watch:w};
 const order=starlightRecoveryQuoteOrder(w,q);
 const legacyLinkGate=['pr3_entry_band','pr3_link_above_parent_exit','pr3_below_original_parent_entry_rise'].includes(w.lastSignalReason);
 const safeLegacyReplay=w.link===true&&legacyLinkGate&&w.qualified!==true
   &&quoteAt===number(w.lastQuoteAtMs)&&order===0;
 if(order<=0&&!safeLegacyReplay)return {ok:true,changed:false,reason:'pr3_duplicate_or_out_of_order_quote',watch:w};
 const next=pegasusRyuSeiKenCapitalSignalState(w,q,settings,now,{advance:true});
 // READY is a signal fact, not a permission to BUY. The SQL watch remains WATCHING.
 const status='WATCHING';
 const watch={...next,status,qualified:next.qualified===true,lastSignalReason:next.reason,updatedAtMs:now,
   lastQuoteAtMs:quoteAt,lastQuoteEpoch:q.quoteObservation?.epoch||null,
   lastQuoteRevision:number(q.quoteObservation?.revision)||0};
 return {ok:true,changed:true,watch,reason:next.reason};
}

/** Deterministic seat plan. Attempts to re-use a seat or add a sixth are denied. */
export function pegasusRyuSeiKenCapitalSeatPlan(w,occupied=[]){
 if(w?.version!==PR_VERSION||!Number.isSafeInteger(number(w.maximumSeats))||number(w.maximumSeats)<1||number(w.maximumSeats)>20)
  return deny('pr3_watch_seat_cap_invalid');
 const seen=new Set();
 for(const seat of occupied){
  const idx=number(seat?.seat);
  if(!Number.isSafeInteger(idx)||idx<1||idx>number(w.maximumSeats)||seen.has(idx))return deny('pr3_seat_ledger_corrupt');
  seen.add(idx);
 }
 const free=[];
 for(let i=1;i<=number(w.maximumSeats);i++)if(!seen.has(i))free.push(i);
 return {ok:true,free,consumed:[...seen].sort((a,b)=>a-b),maximumSeats:number(w.maximumSeats)};
}

export function pegasusRyuSeiKenCapitalAdmissionDecision({watch,seat,settings,quote,parent,now=Date.now()}={}){
 if(!watch||watch.version!==PR_VERSION||settings?.pegasusRyuSeiKenCapitalEnabled!==true)return deny('pr3_disabled_or_watch_missing');
 const loss=verifiedScarletNeedleRecoveryLoss(parent,settings,now);if(!loss.ok)return loss;
 if(watch.id!==pegasusRyuSeiKenCapitalId(loss,loss.parentEntryId)||!same(watch.parentEntryId,parent.id)
   ||watch.parentConcept!=='Scarlet Needle Recovery'||watch.side!=='YES'
   ||!same(watch.systemName,loss.systemName)||!same(watch.ownerId,loss.ownerId)
   ||!same(watch.mode,loss.mode)||number(watch.resetEpoch)!==loss.resetEpoch
   ||!same(watch.ticker,loss.ticker)||!same(watch.eventTicker,loss.eventTicker)
   ||number(watch.originalParentEntryPriceCents)!==loss.entryPriceCents
   ||number(watch.verifiedLosingExitPriceCents)!==loss.exitPriceCents)return deny('pr3_parent_authorization_drift');
 if(!validInt(seat)||seat<1||seat>number(watch.maximumSeats)||number(watch.maximumSeats)!==number(settings.pegasusRyuSeiKenCapitalMultiply))return deny('pr3_seat_cap_invalid');
 const signal=pegasusRyuSeiKenCapitalSignalState(watch,quote,settings,now);
 if(!signal.qualified)return deny(signal.reason);
 return {ok:true,reason:'pr3_signal_only_no_capital_authority',seat,groupId:watch.id,positionId:pegasusRyuSeiKenCapitalId(loss,loss.parentEntryId,seat)};
}
/** Additive schema; scoped LIVE requires a transaction-local proof and durable pending intent. */
export const PEGASUS_RYU_SEI_KEN_RECOVERY_SQL=`
-- PR3-LIVE: no general direct-insert authority. Only a locked, scoped
-- transaction can insert an individually authorized SIM or LIVE seat.
create or replace function sag_pr3_pre_certification_fence() returns trigger language plpgsql as $$
declare w record; p record; s jsonb; rec jsonb; seat_n int; at_ms bigint;
begin
 if NEW.concept_name<>'Pegasus Ryu Sei Ken Recovery' then return NEW;end if;
 if NEW.mode not in ('SIMULATION','LIVE')
  or (NEW.mode='SIMULATION' and NEW.status<>'open')
  or (NEW.mode='LIVE' and NEW.status<>'entry_pending')
  or NEW.execution_class is distinct from 'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or (NEW.mode='SIMULATION' and current_setting('sagittarius.pr3_sim_entry',true) is distinct from 'admitted')
  or (NEW.mode='LIVE' and current_setting('sagittarius.pr3_live_entry',true) is distinct from 'admitted')
 then raise exception 'pr3_live_and_direct_insert_forbidden';end if;
 select value into s from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'pegasusRyuSeiKenCapitalRecovery';
 if s->>'engineActive' is distinct from 'true' or s->>'pegasusRyuSeiKenCapitalEnabled' is distinct from 'true'
  or s->>'mode' is distinct from NEW.mode
  or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true') or s->>'systemName' is distinct from NEW.system_name
  or s->>'ownerId' is distinct from NEW.owner_id
  or coalesce((s->>'resetTimestampMs')::bigint,0)<>(NEW.entry_config->>'resetTimestampMs')::bigint
  or rec->>'version' is distinct from (case when NEW.mode='LIVE' then 'PR3-LIVE-CAPITAL-V1' else 'PR3-SIM-CAPITAL-V2' end)
  or rec->>'parentEntryId' is distinct from NEW.source_trade_id
  or rec->>'positionId' is distinct from NEW.id
  or (rec->>'seat')::int not between 1 and 20
  or NEW.remaining_count<>NEW.count or NEW.count<=0
  or (NEW.mode='SIMULATION' and NEW.entry_client_order_id is not null)
  or (NEW.mode='LIVE' and (NEW.entry_client_order_id is null or length(NEW.entry_client_order_id)<8))
  or NEW.entry_order_id is not null
  or NEW.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or (NEW.entry_config->'aurora'->>'damageControlPercent')::numeric is distinct from (s->>'pegasusRyuSeiKenCapitalAuroraDamageControlPercent')::numeric
 then raise exception 'pr3_scoped_frozen_identity_or_settings_invalid';end if;
 select * into w from sag_pegasus_ryu_sei_ken_recovery_watches_v1 where id=rec->>'watchId' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for share;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 seat_n:=(rec->>'seat')::int;
 if w.id is null or p.id is null or w.status<>'WATCHING'
  or w.parent_entry_id<>p.id or w.system_name<>NEW.system_name or w.owner_id<>NEW.owner_id
  or w.mode<>NEW.mode or w.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or w.ticker<>NEW.ticker or w.event_ticker<>NEW.event_ticker
  or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
  or w.watch->>'eventTicker' is distinct from NEW.event_ticker
  or w.watch->>'parentConcept' is distinct from 'Scarlet Needle Recovery'
  or w.watch->>'side' is distinct from 'YES'
  or w.watch->>'systemName' is distinct from NEW.system_name
  or w.watch->>'ownerId' is distinct from NEW.owner_id
  or w.watch->>'mode' is distinct from NEW.mode
  or w.watch->>'resetEpoch' is distinct from w.reset_epoch::text
  or (w.watch->>'qualified') is distinct from 'true'
  or p.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or p.entry_config#>>'{scarletNeedleCapitalRecovery,parentEntryId}' is distinct from p.source_trade_id
  or p.entry_config#>>'{scarletNeedleCapitalRecovery,positionId}' is distinct from p.id
  or p.entry_config#>>'{scarletNeedleCapitalRecovery,groupId}' is distinct from p.entry_config#>>'{scarletNeedleCapitalRecovery,watchId}'
  -- A verified closed capital parent must have a corresponding durable,
  -- CLOSED Multiply seat in its own stage, not just a plausible entry_config.
  -- Historical legacy concepts cannot populate this new-stage seat ledger.
  or not exists (select 1 from sag_scarlet_needle_recovery_seats_v1 ps
      where ps.position_id=p.id and ps.watch_id=p.entry_config#>>'{scarletNeedleCapitalRecovery,watchId}'
        and ps.seat=(p.entry_config#>>'{scarletNeedleCapitalRecovery,seat}')::integer
        and ps.status='CLOSED')
  or p.entry_config#>>'{scarletNeedleCapitalRecovery,version}' is distinct from
     (case when p.mode='LIVE' then 'SN2-LIVE-CAPITAL-V1' else 'SN2-SIM-CAPITAL-V2' end)
  or coalesce((p.entry_config#>>'{scarletNeedleCapitalRecovery,seat}')::integer,0) not between 1 and 20
  or coalesce((p.entry_config#>>'{scarletNeedleCapitalRecovery,watchRevision}')::bigint,0)<1
  or p.concept_name is distinct from 'Scarlet Needle Recovery' or p.status<>'closed' or p.remaining_count<>0 or p.pnl_cents>=0
  or p.execution_class is distinct from 'CAPITAL'
  or p.entry_config#>>'{scarletNeedleCapitalRecovery,version}' not in ('SN2-SIM-CAPITAL-V2','SN2-LIVE-CAPITAL-V1')
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
      coalesce((s->>'pegasusRyuSeiKenCapitalMaxSpreadCents')::numeric,(s->>'maxSpreadCents')::numeric,3)
  or NEW.spread_at_entry_cents<>(rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric
  or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
  or (w.watch->>'link') is distinct from (s->>'pegasusRyuSeiKenCapitalLinkEnabled')
  or (rec#>>'{capturedSettings,link}') is distinct from (w.watch->>'link')
  or (coalesce((w.watch->>'link')::boolean,false)=false
    and NEW.entry_price_cents not between (s->>'pegasusRyuSeiKenCapitalMinEntryCents')::numeric and (s->>'pegasusRyuSeiKenCapitalMaxEntryCents')::numeric)
  or not exists (select 1 from sag_pegasus_ryu_sei_ken_recovery_seats_v1 x where x.watch_id=w.id and x.seat=seat_n
    and x.position_id=NEW.id and x.status='RESERVED')
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,availableAtLimitCount}')::bigint,0)
       < NEW.count + (case when NEW.mode='LIVE' then 0 else
          (select coalesce(sum(e.count),0) from sag_pegasus_ryu_sei_ken_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE')) end)
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,existingGroupQuantity}')::double precision,-1)
       <> (select coalesce(sum(e.count),0) from sag_pegasus_ryu_sei_ken_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE'))
 then raise exception 'pr3_scoped_parent_watch_or_seat_not_authorized';end if;
 return NEW;
end;$$;
drop trigger if exists sag_pr3_pre_certification_insert_fence on sag_entries;
create trigger sag_pr3_pre_certification_insert_fence before insert on sag_entries
 for each row execute function sag_pr3_pre_certification_fence();
create table if not exists sag_pegasus_ryu_sei_ken_recovery_watches_v1(
 id text primary key, version text not null, system_name text not null,owner_id text not null,
 mode text not null check(mode in ('SIMULATION','LIVE')),reset_epoch bigint not null,
 parent_entry_id text not null references sag_entries(id),ticker text not null,event_ticker text not null,
 status text not null check(status in ('WATCHING','READY','EXECUTING','BLOCKED','EXPIRED','CONSUMED')),
 revision bigint not null default 1 check(revision>=1),watch jsonb not null,
 updated_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,parent_entry_id)
);
alter table sag_pegasus_ryu_sei_ken_recovery_watches_v1 add column if not exists last_scan_ms bigint not null default 0;
create index if not exists sag_pr3_watch_scan on sag_pegasus_ryu_sei_ken_recovery_watches_v1
 (system_name,owner_id,mode,reset_epoch,status,last_scan_ms);
create index if not exists sag_pr3_watch_scope on sag_pegasus_ryu_sei_ken_recovery_watches_v1
(system_name,owner_id,mode,reset_epoch,status,updated_at_ms);
create table if not exists sag_pegasus_ryu_sei_ken_recovery_seats_v1(
 watch_id text not null references sag_pegasus_ryu_sei_ken_recovery_watches_v1(id),seat int not null check(seat between 1 and 20),
 position_id text not null unique,order_intent_id text unique,
 status text not null check(status in ('RESERVED','SUBMITTED','RECONCILE','FILLED','CLOSED','REJECTED')),
 primary key(watch_id,seat)
);
-- Financial closure never frees an occupied Multiply seat. An idempotent
-- trigger keeps the seat ledger visible after either protective or settlement exit.
create or replace function sag_pr3_capital_seat_close() returns trigger language plpgsql as $$
begin
 if NEW.concept_name='Pegasus Ryu Sei Ken Recovery' and NEW.status='open' and OLD.status='entry_pending' then
  update sag_pegasus_ryu_sei_ken_recovery_seats_v1 set status='FILLED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Pegasus Ryu Sei Ken Recovery' and NEW.status='rejected' and OLD.status is distinct from 'rejected' then
  update sag_pegasus_ryu_sei_ken_recovery_seats_v1 set status='REJECTED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Pegasus Ryu Sei Ken Recovery' and NEW.status='closed' and OLD.status is distinct from 'closed' then
  update sag_pegasus_ryu_sei_ken_recovery_seats_v1 set status='CLOSED'
   where position_id=NEW.id and status in ('FILLED','SUBMITTED','RECONCILE');
 end if;
 return NEW;
end;$$;
drop trigger if exists sag_pr3_capital_seat_close_trigger on sag_entries;
create trigger sag_pr3_capital_seat_close_trigger after update on sag_entries
 for each row execute function sag_pr3_capital_seat_close();
`;
