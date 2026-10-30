/** CW1 verified-loss recovery kernel. The signal itself cannot buy.
 * Separate transactional SIM/LIVE admission and guarded LIVE transport must
 * supply their own durable financial proof and native release verification.
 */
import {createHash} from 'node:crypto';
import {starlightRecoverySignalState,starlightRecoveryQuoteOrder} from './strategy.mjs';
import {isShadowSaintEntry} from './doctrine.mjs';
export const CW_CONCEPT='Crystal Wall Recovery';
export const CW_VERSION='CW1-RECOVERY-WATCH-V1';
/** Link bypasses *strategy* thresholds only. Exchange prices, spread, depth,
 * scope, broker reconciliation, and other financial admission stay mandatory.
 * Frozen per-parent Link identity is the authority for a durable watch. */
export const crystalWallRecoveryLinkBypassesStrategy = watch => watch?.link===true;
/** Independent GH entry-only bid/ask tolerance. Never widens the global
 * admission threshold for other Saints or changes protective exit doctrine.
 * Missing legacy GH setting falls back to the previous shared limit until
 * runtime migration persists an independent value.
 */
export function crystalWallRecoverySpreadAllowed(quote,settings={}){
 const limit=Number(settings.crystalWallRecoveryMaxSpreadCents??settings.maxSpreadCents??3);
 const bid=Number(quote?.yesBid),ask=Number(quote?.yesAsk);
 return Number.isInteger(limit)&&limit>=0&&limit<=99
   &&Number.isFinite(bid)&&Number.isFinite(ask)
   &&bid>0&&ask>=bid&&ask<100&&ask-bid<=limit;
}
export function crystalWallRecoveryOperatorBandAllowed(watch,price,settings={}){
 if(crystalWallRecoveryLinkBypassesStrategy(watch))return true;
 const min=Number(settings.crystalWallRecoveryMinEntryCents),max=Number(settings.crystalWallRecoveryMaxEntryCents);
 return Number.isFinite(min)&&Number.isFinite(max)&&min>0&&max<100&&min<=max
   &&Number(price)>=min&&Number(price)<=max;
}

const number=x=>x===null||x===undefined||x===''?NaN:Number(x);
const same=(a,b)=>String(a??'')===String(b??'');
const validInt=x=>Number.isSafeInteger(number(x));
const deny=reason=>({ok:false,reason});

/** A parent loss only starts observation. No result here can place a BUY. */
export function verifiedGreatHornLoss(e,s={},now=Date.now()){
  if(e?.conceptName!=='Great Horn Recovery'||isShadowSaintEntry(e))return deny('not_real_great_horn_parent');
  // Order sizes remain operator-controlled. Broker-confirmed LIVE inventory
  // can be fractional after a partial fill; it is still a real capital parent.
  const actualQuantity=number(e.count);
  const quantityValid=e.mode==='LIVE' ? Number.isFinite(actualQuantity)&&actualQuantity>0
    : validInt(e.count)&&actualQuantity>=1;
  if(e.archived||e.status!=='closed'||number(e.remainingCount)!==0||!quantityValid
    ||!Number.isFinite(number(e.exitFilledCount))
    ||Math.abs(number(e.exitFilledCount)-actualQuantity)>1e-9)return deny('great_horn_not_fully_reconciled');
  for(const k of ['systemName','ownerId','mode'])if(!same(e[k],s[k])||!String(s[k]||''))return deny('great_horn_scope_mismatch');
  if(!['SIMULATION','LIVE'].includes(e.mode))return deny('great_horn_mode_invalid');
  const reset=number(s.resetTimestampMs??0);
  if(!validInt(reset)||reset<0||!(number(e.openedAtMs)>=reset)
    ||!(number(e.closedAtMs)>=number(e.openedAtMs))||number(e.closedAtMs)>now)return deny('great_horn_epoch_invalid');
  const qty=number(e.count),entry=number(e.entryPriceCents),exit=number(e.exitPriceCents);
  if(!(entry>0&&entry<100&&exit>=0&&exit<=100)||!e.ticker||!e.eventTicker
    ||String(e.side||e.entryConfig?.side||'YES').toUpperCase()!=='YES')return deny('great_horn_market_invalid');
  const amounts=[e.entryFeeCents,e.exitFeeCents,e.exitNotionalCents,e.pnlCents].map(number);
  if(amounts.some(x=>!Number.isFinite(x))||amounts[0]<0||amounts[1]<0||amounts[2]<0)return deny('great_horn_fee_or_notional_invalid');
  const pnl=amounts[2]-qty*entry-amounts[0]-amounts[1];
  if(Math.abs(pnl-amounts[3])>0.000001||!(pnl<0))return deny('great_horn_no_verified_net_loss');
  if(Math.abs(amounts[2]-exit*qty)>Math.max(0.000001,qty*0.501))return deny('great_horn_exit_average_incoherent');
  // Completed LIVE orders retain their historical client order IDs by design.
  // A retained ID is not in itself evidence of an outstanding order: only a
  // missing authoritative receipt or nonterminal exit reconciliation is.
  if(e.mode==='SIMULATION'&&(e.entryClientOrderId||e.exitClientOrderId))
    return deny('great_horn_sim_order_intent_unresolved');
  if(e.mode==='LIVE'){
    if(!e.entryOrderId)return deny('great_horn_entry_receipt_missing');
    if(e.exitExecutionState?.terminal===false || (e.exitClientOrderId && e.exitExecutionState?.terminal!==true))
      return deny('great_horn_unresolved_exit_receipt');
    if(!e.exitOrderId&&!e.exitExecutionState?.settlementConfirmed)
      return deny('great_horn_exit_receipt_missing');
    if(e.entryConfig?.entryFillProof?.authoritative===false)
      return deny('great_horn_entry_fill_not_authoritative');
  }
  if(!same(e.entryConfig?.executionClass||e.executionClass,'CAPITAL')
    ||!['GH1-SIM-CAPITAL-V2','GH1-LIVE-CAPITAL-V1'].includes(e.entryConfig?.greatHornRecovery?.version)
    ||!e.entryConfig?.aurora?.frozen)return deny('great_horn_capital_or_protection_unverified');
  return {ok:true,reason:'verified_great_horn_net_loss',parentEntryId:String(e.id),entryPriceCents:entry,
    exitPriceCents:exit,realizedNetCents:pnl,closedAtMs:number(e.closedAtMs),
    count:qty,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:reset,
    ticker:e.ticker,eventTicker:e.eventTicker,side:'YES'};
}
export function crystalWallRecoveryId(scope,parentId,seat=0){
 const fields=[scope?.systemName,scope?.ownerId,scope?.mode,scope?.resetEpoch,parentId];
 if(fields.some(v=>v==null||String(v)==='')||!Number.isSafeInteger(seat)||seat<0||seat>20)throw new Error('cw1_scoped_identity_invalid');
 return 'CW1-'+createHash('sha256').update(JSON.stringify([...fields.map(String),seat])).digest('hex').slice(0,40);
}
export function crystalWallRecoveryWatchFromLoss(loss,settings={},now=Date.now()){
 if(!loss?.ok)return deny('cw1_parent_loss_required');
 if(settings.crystalWallRecoveryEnabled!==true)return deny('cw1_disabled');
 const {systemName,ownerId,mode,resetEpoch,parentEntryId,ticker,eventTicker,entryPriceCents,exitPriceCents,closedAtMs,realizedNetCents}=loss;
 if(!(closedAtMs>0&&closedAtMs<=now))return deny('cw1_loss_time_invalid');
 const multiply=number(settings.crystalWallRecoveryMultiply),observe=number(settings.crystalWallRecoveryObservationMinutes);
 if(!validInt(multiply)||multiply<1||multiply>20||!Number.isFinite(observe)||observe<0||observe>1000)return deny('cw1_card_invalid');
 // Starlight does not discard an unresolved recovery after five minutes.
 // Keep the watch until market finality or an explicit terminal outcome.
 const durationMs=Number.MAX_SAFE_INTEGER-closedAtMs;
 const scope={systemName,ownerId,mode,resetEpoch};
 return {ok:true,watch:{version:CW_VERSION,id:crystalWallRecoveryId(scope,parentEntryId),
   authorizationId:crystalWallRecoveryId(scope,parentEntryId),systemName,ownerId,mode,resetEpoch,
   parentEntryId,parentConcept:'Great Horn Recovery',ticker,eventTicker,side:'YES',
   originalParentEntryPriceCents:entryPriceCents,verifiedLosingExitPriceCents:exitPriceCents,
   parentRealizedNetCents:realizedNetCents,armedAtMs:closedAtMs,
   // Link ON is immediately eligible to qualify; observation applies only to Link OFF.
   releaseAtMs:closedAtMs+(settings.crystalWallRecoveryLinkEnabled===true?0:Math.round(observe*60_000)),
   expiresAtMs:closedAtMs+durationMs,stopPriceCents:exitPriceCents,peakSinceArmCents:exitPriceCents,
   troughSinceArmCents:exitPriceCents,upwardTicks:0,lastBidCents:null,lastQuoteAtMs:0,
   maximumSeats:multiply,link:settings.crystalWallRecoveryLinkEnabled===true,status:'WATCHING',revision:1,
   lastQuoteEpoch:null,lastQuoteRevision:0,lastSignalReason:'not_observed',lastObservedAtMs:0}};
}
export function crystalWallRecoverySignalState(w,q,s={},now=Date.now(),opts={}){
 if(!w||w.version!==CW_VERSION||w.parentConcept!=='Great Horn Recovery')return {...w,qualified:false,reason:'cw1_watch_identity_invalid'};
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {...w,qualified:false,reason:'cw1_market_identity_changed'};
 const rise=number(s.crystalWallRecoveryParentEntryRiseCents??0),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 const at=number(q?.quoteAtMs),maxAge=Math.min(5000,number(s?.infinityBreakMaximumBookAgeMs??5000));
 if(!validInt(rise)||rise<0||rise>99)return {...w,qualified:false,reason:'cw1_parent_rise_invalid'};
 // A durable Link watch created by an older release might still carry a delayed
 // releaseAtMs. Do not let persisted legacy observation timers delay Link ON.
 if(now>number(w.expiresAtMs)||(w.link!==true&&now<number(w.releaseAtMs)))
   return {...w,qualified:false,reason:'cw1_observation_or_expiry'};
 if(q?.status!=='active'||q?.bookInvalid||q?.result||!(bid>0&&bid<=ask&&ask<100))return {...w,qualified:false,reason:'cw1_market_not_executable'};
 if(!(at>=number(w.armedAtMs))||at>now||!(now-at<=maxAge))return {...w,qualified:false,reason:'cw1_quote_stale_or_pre_loss'};
 // The operator's Link ON doctrine bypasses ALL recovery signal filters,
 // including parent-entry rise, the configured price band and the historical
 // losing-exit ask ceiling. It never bypasses executable-book validation.
 if(w.link===true)return {...w,qualified:true,reason:'cw1_link_qualified',lastAskCents:ask};
 if(rise>0&&!(bid>=number(w.originalParentEntryPriceCents)+rise))return {...w,qualified:false,reason:'cw1_below_original_parent_entry_rise'};
 if(!crystalWallRecoveryOperatorBandAllowed(w,ask,s))return {...w,qualified:false,reason:'cw1_entry_band'};
 const mapped={...s,crashRecoveryHunterMinCrashCents:s.crystalWallRecoveryMinCrashCents,
   crashRecoveryHunterMinReboundCents:s.crystalWallRecoveryMinReboundCents,
   crashRecoveryHunterMinUpwardTicks:s.crystalWallRecoveryMinUpwardTicks,
   crashRecoveryMinEntryCents:s.crystalWallRecoveryMinEntryCents,crashRecoveryMaxEntryCents:s.crystalWallRecoveryMaxEntryCents};
 return starlightRecoverySignalState(w,q,mapped,now,opts);
}
/** Deterministic watch transition. This module NEVER authorizes capital by itself.
 * A stale/out-of-order or invalid book must not overwrite valid signal history.
 * This function can be replayed from the persisted JSONB watch after restart.
 */
export function crystalWallRecoveryObservationStep(w,q,settings={},now=Date.now()){
 if(!w||w.version!==CW_VERSION)return deny('cw1_watch_version_invalid');
 if(!['WATCHING','READY','BLOCKED','EXPIRED'].includes(w.status))return deny('cw1_watch_not_observable');
 if(w.status==='BLOCKED'||w.status==='EXPIRED')return {ok:true,changed:false,watch:w,reason:'cw1_terminal_watch'};
 if(now>Number(w.expiresAtMs))return {ok:true,changed:true,reason:'cw1_expired',watch:{...w,status:'EXPIRED',qualified:false,lastSignalReason:'cw1_expired',terminalReason:'expired',updatedAtMs:now,historicalQualified:w.qualified===true}};
 const quoteAt=number(q?.quoteAtMs),bid=number(q?.yesBid),ask=number(q?.yesAsk);
 if(String(q?.ticker||'')!==String(w.ticker)||String(q?.eventTicker||q?.ticker||'')!==String(w.eventTicker))
   return {ok:true,changed:false,reason:'cw1_market_identity_mismatch',watch:w};
 // CW1-R2: a delayed terminal quote must never erase a newer durable watch.
 // Temporal/order proof precedes terminal finality, just as it precedes entry
 // signals. Without a post-loss, newer event we retain WATCHING, but no BUY
 // can be authorized without a separate fresh and active executable book.
 if(!(quoteAt>=number(w.armedAtMs))||quoteAt>now)
   return {ok:true,changed:false,reason:'cw1_stale_quote',watch:w};
 const order=starlightRecoveryQuoteOrder(w,q);
 if(['finalized','settled','determined','closed'].includes(String(q?.status||'').toLowerCase())||q?.result){
   if(order<=0)return {ok:true,changed:false,reason:'cw1_duplicate_or_out_of_order_quote',watch:w};
   return {ok:true,changed:true,reason:'cw1_market_terminal',watch:{...w,status:'BLOCKED',qualified:false,lastSignalReason:'cw1_market_terminal',terminalReason:'market_finality',updatedAtMs:now,historicalQualified:w.qualified===true}};
 }
 // Incomplete/contradictory active quotes are not observations. In particular
 // a missing ask must not demote a previously qualified recovery and consume
 // its quote revision: entry later requires its own coherent REST quote/book.
 if(q?.status!=='active'||q?.bookInvalid||!Number.isFinite(bid)||!Number.isFinite(ask)
    ||!(bid>0&&bid<=ask&&ask<100))
   return {ok:true,changed:false,reason:'cw1_market_not_executable',watch:w};
 const ageLimit=Math.min(5000,Math.max(100,number(settings.infinityBreakMaximumBookAgeMs??5000)));
 if(now-quoteAt>ageLimit)
   return {ok:true,changed:false,reason:'cw1_stale_quote',watch:w};
 const legacyLinkGate=['cw1_entry_band','cw1_link_above_parent_exit','cw1_below_original_parent_entry_rise'].includes(w.lastSignalReason);
 const safeLegacyReplay=w.link===true&&legacyLinkGate&&w.qualified!==true
   &&quoteAt===number(w.lastQuoteAtMs)&&order===0;
 if(order<=0&&!safeLegacyReplay)return {ok:true,changed:false,reason:'cw1_duplicate_or_out_of_order_quote',watch:w};
 const next=crystalWallRecoverySignalState(w,q,settings,now,{advance:true});
 // READY is a signal fact, not a permission to BUY. The SQL watch remains WATCHING.
 const status='WATCHING';
 const watch={...next,status,qualified:next.qualified===true,lastSignalReason:next.reason,updatedAtMs:now,
   lastQuoteAtMs:quoteAt,lastQuoteEpoch:q.quoteObservation?.epoch||null,
   lastQuoteRevision:number(q.quoteObservation?.revision)||0};
 return {ok:true,changed:true,watch,reason:next.reason};
}

/** Deterministic seat plan. Attempts to re-use a seat or add a sixth are denied. */
export function crystalWallRecoverySeatPlan(w,occupied=[]){
 if(w?.version!==CW_VERSION||!Number.isSafeInteger(number(w.maximumSeats))||number(w.maximumSeats)<1||number(w.maximumSeats)>20)
  return deny('cw1_watch_seat_cap_invalid');
 const seen=new Set();
 for(const seat of occupied){
  const idx=number(seat?.seat);
  if(!Number.isSafeInteger(idx)||idx<1||idx>number(w.maximumSeats)||seen.has(idx))return deny('cw1_seat_ledger_corrupt');
  seen.add(idx);
 }
 const free=[];
 for(let i=1;i<=number(w.maximumSeats);i++)if(!seen.has(i))free.push(i);
 return {ok:true,free,consumed:[...seen].sort((a,b)=>a-b),maximumSeats:number(w.maximumSeats)};
}

export function crystalWallRecoveryAdmissionDecision({watch,seat,settings,quote,parent,now=Date.now()}={}){
 if(!watch||watch.version!==CW_VERSION||settings?.crystalWallRecoveryEnabled!==true)return deny('cw1_disabled_or_watch_missing');
 const loss=verifiedGreatHornLoss(parent,settings,now);if(!loss.ok)return loss;
 if(watch.id!==crystalWallRecoveryId(loss,loss.parentEntryId)||!same(watch.parentEntryId,parent.id)
   ||!same(watch.ticker,parent.ticker)||number(watch.originalParentEntryPriceCents)!==loss.entryPriceCents
   ||number(watch.verifiedLosingExitPriceCents)!==loss.exitPriceCents)return deny('cw1_parent_authorization_drift');
 if(!validInt(seat)||seat<1||seat>number(watch.maximumSeats)||number(watch.maximumSeats)!==number(settings.crystalWallRecoveryMultiply))return deny('cw1_seat_cap_invalid');
 const signal=crystalWallRecoverySignalState(watch,quote,settings,now);
 if(!signal.qualified)return deny(signal.reason);
 return {ok:true,reason:'cw1_signal_only_no_capital_authority',seat,groupId:watch.id,positionId:crystalWallRecoveryId(loss,loss.parentEntryId,seat)};
}
/** Additive schema; scoped LIVE requires a transaction-local proof and durable pending intent. */
export const CRYSTAL_WALL_RECOVERY_SQL=`
-- CW1-LIVE: no general direct-insert authority. Only a locked, scoped
-- transaction can insert an individually authorized SIM or LIVE seat.
create or replace function sag_cw1_pre_certification_fence() returns trigger language plpgsql as $$
declare w record; p record; s jsonb; rec jsonb; seat_n int; at_ms bigint;
begin
 if NEW.concept_name<>'Crystal Wall Recovery' then return NEW;end if;
 if NEW.mode not in ('SIMULATION','LIVE')
  or (NEW.mode='SIMULATION' and NEW.status<>'open')
  or (NEW.mode='LIVE' and NEW.status<>'entry_pending')
  or NEW.execution_class is distinct from 'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or (NEW.mode='SIMULATION' and current_setting('sagittarius.cw1_sim_entry',true) is distinct from 'admitted')
  or (NEW.mode='LIVE' and current_setting('sagittarius.cw1_live_entry',true) is distinct from 'admitted')
 then raise exception 'cw1_live_and_direct_insert_forbidden';end if;
 select value into s from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'crystalWallRecovery';
 if s->>'engineActive' is distinct from 'true' or s->>'crystalWallRecoveryEnabled' is distinct from 'true'
  or s->>'mode' is distinct from NEW.mode
  or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true') or s->>'systemName' is distinct from NEW.system_name
  or s->>'ownerId' is distinct from NEW.owner_id
  or coalesce((s->>'resetTimestampMs')::bigint,0)<>(NEW.entry_config->>'resetTimestampMs')::bigint
  or rec->>'version' is distinct from (case when NEW.mode='LIVE' then 'CW1-LIVE-CAPITAL-V1' else 'CW1-SIM-CAPITAL-V2' end)
  or rec->>'parentEntryId' is distinct from NEW.source_trade_id
  or rec->>'positionId' is distinct from NEW.id
  or (rec->>'seat')::int not between 1 and 20
  or NEW.remaining_count<>NEW.count or NEW.count<=0
  or (NEW.mode='SIMULATION' and NEW.entry_client_order_id is not null)
  or (NEW.mode='LIVE' and (NEW.entry_client_order_id is null or length(NEW.entry_client_order_id)<8))
  or NEW.entry_order_id is not null
  or NEW.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or (NEW.entry_config->'aurora'->>'damageControlPercent')::numeric is distinct from (s->>'crystalWallRecoveryAuroraDamageControlPercent')::numeric
 then raise exception 'cw1_scoped_frozen_identity_or_settings_invalid';end if;
 select * into w from sag_crystal_wall_recovery_watches_v1 where id=rec->>'watchId' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for share;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 seat_n:=(rec->>'seat')::int;
 if w.id is null or p.id is null or w.status<>'WATCHING'
  or w.parent_entry_id<>p.id or w.system_name<>NEW.system_name or w.owner_id<>NEW.owner_id
  or w.mode<>NEW.mode or w.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or w.ticker<>NEW.ticker or w.event_ticker<>NEW.event_ticker
  or (w.watch->>'qualified') is distinct from 'true'
  or p.concept_name<>'Great Horn Recovery'
  or p.entry_config#>>'{greatHornRecovery,version}' not in ('GH1-SIM-CAPITAL-V2','GH1-LIVE-CAPITAL-V1')
  or p.status<>'closed' or p.remaining_count<>0 or p.pnl_cents>=0
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
      coalesce((s->>'crystalWallRecoveryMaxSpreadCents')::numeric,(s->>'maxSpreadCents')::numeric,3)
  or NEW.spread_at_entry_cents<>(rec->>'quoteAskCents')::numeric-(rec->>'quoteBidCents')::numeric
  or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
  or (w.watch->>'link') is distinct from (s->>'crystalWallRecoveryLinkEnabled')
  or (rec#>>'{capturedSettings,link}') is distinct from (w.watch->>'link')
  or (coalesce((w.watch->>'link')::boolean,false)=false
    and NEW.entry_price_cents not between (s->>'crystalWallRecoveryMinEntryCents')::numeric and (s->>'crystalWallRecoveryMaxEntryCents')::numeric)
  or not exists (select 1 from sag_crystal_wall_recovery_seats_v1 x where x.watch_id=w.id and x.seat=seat_n
    and x.position_id=NEW.id and x.status='RESERVED')
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,availableAtLimitCount}')::bigint,0)
       < NEW.count + (case when NEW.mode='LIVE' then 0 else
          (select coalesce(sum(e.count),0) from sag_crystal_wall_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE')) end)
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,existingGroupQuantity}')::double precision,-1)
       <> (select coalesce(sum(e.count),0) from sag_crystal_wall_recovery_seats_v1 x
          join sag_entries e on e.id=x.position_id where x.watch_id=w.id
          and x.status in ('FILLED','CLOSED','SUBMITTED','RECONCILE'))
 then raise exception 'cw1_scoped_parent_watch_or_seat_not_authorized';end if;
 return NEW;
end;$$;
drop trigger if exists sag_cw1_pre_certification_insert_fence on sag_entries;
create trigger sag_cw1_pre_certification_insert_fence before insert on sag_entries
 for each row execute function sag_cw1_pre_certification_fence();
create table if not exists sag_crystal_wall_recovery_watches_v1(
 id text primary key, version text not null, system_name text not null,owner_id text not null,
 mode text not null check(mode in ('SIMULATION','LIVE')),reset_epoch bigint not null,
 parent_entry_id text not null references sag_entries(id),ticker text not null,event_ticker text not null,
 status text not null check(status in ('WATCHING','READY','EXECUTING','BLOCKED','EXPIRED','CONSUMED')),
 revision bigint not null default 1 check(revision>=1),watch jsonb not null,
 updated_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,parent_entry_id)
);
alter table sag_crystal_wall_recovery_watches_v1 add column if not exists last_scan_ms bigint not null default 0;
create index if not exists sag_cw1_watch_scan on sag_crystal_wall_recovery_watches_v1
 (system_name,owner_id,mode,reset_epoch,status,last_scan_ms);
create index if not exists sag_cw1_watch_scope on sag_crystal_wall_recovery_watches_v1
(system_name,owner_id,mode,reset_epoch,status,updated_at_ms);
create table if not exists sag_crystal_wall_recovery_seats_v1(
 watch_id text not null references sag_crystal_wall_recovery_watches_v1(id),seat int not null check(seat between 1 and 20),
 position_id text not null unique,order_intent_id text unique,
 status text not null check(status in ('RESERVED','SUBMITTED','RECONCILE','FILLED','CLOSED','REJECTED')),
 primary key(watch_id,seat)
);
-- Financial closure never frees an occupied Multiply seat. An idempotent
-- trigger keeps the seat ledger visible after either protective or settlement exit.
create or replace function sag_cw1_capital_seat_close() returns trigger language plpgsql as $$
begin
 if NEW.concept_name='Crystal Wall Recovery' and NEW.status='open' and OLD.status='entry_pending' then
  update sag_crystal_wall_recovery_seats_v1 set status='FILLED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Crystal Wall Recovery' and NEW.status='rejected' and OLD.status is distinct from 'rejected' then
  update sag_crystal_wall_recovery_seats_v1 set status='REJECTED'
   where position_id=NEW.id and status='RECONCILE';
 end if;
 if NEW.concept_name='Crystal Wall Recovery' and NEW.status='closed' and OLD.status is distinct from 'closed' then
  update sag_crystal_wall_recovery_seats_v1 set status='CLOSED'
   where position_id=NEW.id and status in ('FILLED','SUBMITTED','RECONCILE');
 end if;
 return NEW;
end;$$;
drop trigger if exists sag_cw1_capital_seat_close_trigger on sag_entries;
create trigger sag_cw1_capital_seat_close_trigger after update on sag_entries
 for each row execute function sag_cw1_capital_seat_close();
`;
