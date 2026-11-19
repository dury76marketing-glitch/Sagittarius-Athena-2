/** LP-V3: one parent eligibility policy for observation, admission and dispatch.
 * The SQL predicates below share the same positive exit-reason allowlist.
 * Historical CLOSED rows are never enrolled by this migration.
 */
import {isShadowSaintEntry,AURORA_EXECUTION} from './doctrine.mjs';
export const LP_CONTINUATION_VERSION='LP-V3-PROFIT-CONTINUATION';
export const LP_PROFIT_EXIT_REASONS=Object.freeze([
  'athena_x1_exit','atomic_thunder_cashout','infinity_break','golden_eye_cashout',
  'protected_runner_intelligence','apex_profit_guard','ultimate_profit_guard','manual_cashout',
]);
export const LP_TERMINAL_STATES=Object.freeze(['REVOKED','MARKET_TERMINAL']);
const finite=(v)=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const same=(a,b)=>String(a??'')===String(b??'');
export function lightningClosedProfitProof(parent){
  const e=parent||{};
  if(e.status!=='closed'||!finite(e.remainingCount)||Number(e.remainingCount)!==0
    || !(Number(e.count)>0)||!finite(e.exitFilledCount)||Number(e.exitFilledCount)!==Number(e.count)
    || !(Number(e.closedAtMs)>0)||!finite(e.pnlCents)||!(Number(e.pnlCents)>0)
    || !LP_PROFIT_EXIT_REASONS.includes(String(e.closeReason||''))||e.exitClientOrderId)
    return false;
  if(e.mode==='LIVE'&&e.exitExecutionState?.terminal!==true)return false;
  if(![e.entryPriceCents,e.entryFeeCents,e.exitFeeCents,e.exitNotionalCents].every(finite))return false;
  const net=Number(e.exitNotionalCents)-Number(e.entryPriceCents)*Number(e.count)-Number(e.entryFeeCents)-Number(e.exitFeeCents);
  return net>0&&Math.abs(net-Number(e.pnlCents))<=0.000001;
}
export function lightningParentEligibility(parent,settings={}, {ticker=null,strictScope=true}={}){
  const e=parent||{},a=e.lpContinuation||null;
  if(e.conceptName!=='Crash Recovery Hunter')return {ok:false,reason:'not_starlight'};
  if(isShadowSaintEntry(e))return {ok:false,reason:'shadow_starlight'};
  if(String(e.side||e.entryConfig?.side||'YES').toUpperCase()!=='YES')return {ok:false,reason:'lp_parent_outcome_changed'};
  if(strictScope){
    for(const key of ['systemName','ownerId','mode'])if(!settings[key]||!same(e[key],settings[key]))return {ok:false,reason:'lp_parent_scope_changed'};
    if(!['LIVE','SIMULATION'].includes(e.mode)||!(Number(e.openedAtMs)>0)||Number(e.openedAtMs)<Number(settings.resetTimestampMs||0))return {ok:false,reason:'lp_parent_reset_changed'};
  }
  if(ticker!==null&&!same(e.ticker,ticker))return {ok:false,reason:'lp_parent_ticker_changed'};
  if(!a)return {ok:false,reason:'lp_no_post_upgrade_continuation_proof'};
  if(a){
    if(a.version!==LP_CONTINUATION_VERSION||!same(a.parentEntryId,e.id)||!same(a.ticker,e.ticker)
      ||!same(a.systemName,e.systemName)||!same(a.ownerId,e.ownerId)||!same(a.mode,e.mode)||!same(a.eventTicker,e.eventTicker)
      ||Number(a.originalEntryPriceCents)!==Number(e.entryPriceCents)
      ||Number(a.originalOpenedAtMs)!==Number(e.openedAtMs)
      ||(strictScope&&Number(a.resetTimestampMs)!==Number(settings.resetTimestampMs||0))
      ||!Number.isSafeInteger(Number(a.revision))||Number(a.revision)<1)
      return {ok:false,reason:'lp_parent_authority_identity_changed'};
    if(LP_TERMINAL_STATES.includes(a.state))return {ok:false,reason:a.reason||'lp_parent_permanently_terminated'};
  }
  if(e.status==='open'&&a.state==='OPEN'&&Number(e.remainingCount)>0&&Number(e.remainingCount)<=Number(e.count)&&e.archived!==true){
    for(const [key,value] of Object.entries(lightningParentProof(e)))if(JSON.stringify(a.proof?.[key])!==JSON.stringify(value))return {ok:false,reason:'lp_parent_proof_revision_changed'};
    return {ok:true,kind:'OPEN_ELIGIBLE',revision:Number(a.revision),referenceEntryCents:Number(e.entryPriceCents)};
  }
  if(e.status!=='closed')return {ok:false,reason:'not_open'};
  if(!a)return {ok:false,reason:'lp_no_post_upgrade_continuation_proof'};
  if(a.state!=='CLOSED_PROFIT'||a.safetyExitSeen===true||!lightningClosedProfitProof(e))return {ok:false,reason:'lp_closed_parent_not_confirmed_profit'};
  const p=a.proof||{};
  for(const [key,value] of Object.entries(lightningParentProof(e)))if(JSON.stringify(p[key])!==JSON.stringify(value))return {ok:false,reason:'lp_parent_proof_revision_changed'};
  return {ok:true,kind:'CLOSED_PROFIT_ELIGIBLE',revision:Number(a.revision),referenceEntryCents:Number(e.entryPriceCents)};
}
export function lightningParentProof(e){return {
  status:e.status,count:Number(e.count),remainingCount:Number(e.remainingCount),entryPriceCents:Number(e.entryPriceCents),
  entryFeeCents:Number(e.entryFeeCents),exitFeeCents:Number(e.exitFeeCents),exitFilledCount:Number(e.exitFilledCount),
  exitNotionalCents:Number(e.exitNotionalCents),pnlCents:Number(e.pnlCents),closeReason:e.closeReason||null,
  closedAtMs:e.closedAtMs==null?null:Number(e.closedAtMs),exitClientOrderId:e.exitClientOrderId||null,
  receiptTerminal:e.exitExecutionState?.terminal===true,
};}
// LIVE reserves an intent BEFORE a fill: its existing Aurora calculation is
// stored under auroraPending.preflight, not the eventual fill's aurora field.
// This reads the correct stage's unchanged risk proof; it never weakens or
// recalculates Aurora, and no planned quantity is represented as a broker fill.
export function lightningEntryAuroraProof(entry,settings){
  const c=entry?.entryConfig||{},pending=entry?.mode==='LIVE'&&entry?.status==='entry_pending';
  const a=pending?c.auroraPending?.preflight:c.aurora;
  if(c.freezingCoffin||!a||a.version!==AURORA_EXECUTION.version||a.policyRevision!==AURORA_EXECUTION.policyRevision
    ||a.frozen!==true||a.ok!==true||a.mode!==entry.mode
    ||Number(a.damageControlPercent)!==Number(settings.lightningPlasmaAuroraDamageControlPercent)
    ||Number(a.entryPriceCents)!==Number(entry.entryPriceCents)
    ||Number(a.originalContractCount)!==Number(entry.count))return false;
  if(pending&&(c.auroraPending?.version!==AURORA_EXECUTION.version||c.auroraPending?.exactFillRequired!==true))return false;
  return true;
}
export function mapLightningAuthority(r){
  if(!r||!r.parent_entry_id)return null;
  return {version:LP_CONTINUATION_VERSION,parentEntryId:r.parent_entry_id,systemName:r.system_name,ownerId:r.owner_id,
    mode:r.mode,resetTimestampMs:Number(r.reset_epoch),ticker:r.ticker,eventTicker:r.event_ticker,side:'YES',
    originalEntryPriceCents:Number(r.entry_price_cents),originalOpenedAtMs:Number(r.opened_at_ms),
    state:r.state,revision:Number(r.revision),safetyExitSeen:r.safety_exit_seen===true,proof:r.proof||{},
    reason:r.terminal_reason||null,enrolledAtMs:Number(r.enrolled_at_ms),updatedAtMs:Number(r.updated_at_ms)};
}
const reasons=LP_PROFIT_EXIT_REASONS.map(x=>`'${x}'`).join(',');
export const LP_CONTINUATION_MIGRATION_SQL=`
 create table if not exists sag_lp_v3_activation(singleton boolean primary key default true check(singleton),activated_at_ms bigint not null);
 insert into sag_lp_v3_activation values(true,(extract(epoch from clock_timestamp())*1000)::bigint) on conflict do nothing;
 create table if not exists sag_lp_continuation_v3(
   parent_entry_id text primary key references sag_entries(id),
   system_name text not null,owner_id text not null,mode text not null,reset_epoch bigint not null,
   ticker text not null,event_ticker text,entry_price_cents double precision not null,opened_at_ms bigint not null,
   state text not null check(state in ('OPEN','AWAITING_EXIT','CLOSED_PROFIT','REVOKED','MARKET_TERMINAL')),
   revision bigint not null default 1,safety_exit_seen boolean not null default false,proof jsonb not null default '{}',
   terminal_reason text,enrolled_at_ms bigint not null,updated_at_ms bigint not null,last_polled_at_ms bigint not null default 0
 );
 create index if not exists sag_lp_v3_scope_poll on sag_lp_continuation_v3(system_name,owner_id,mode,reset_epoch,last_polled_at_ms,parent_entry_id)
   where state in ('OPEN','AWAITING_EXIT','CLOSED_PROFIT');
 create or replace function sag_lp_v3_parent_proof(p sag_entries) returns jsonb language sql immutable as $$
 select jsonb_build_object('status',p.status,'count',p.count,'remainingCount',p.remaining_count,
   'entryPriceCents',p.entry_price_cents,'entryFeeCents',p.entry_fee_cents,'exitFeeCents',p.exit_fee_cents,
   'exitFilledCount',p.exit_filled_count,'exitNotionalCents',p.exit_notional_cents,'pnlCents',p.pnl_cents,
   'closeReason',nullif(p.close_reason,''),'closedAtMs',p.closed_at_ms,'exitClientOrderId',nullif(p.exit_client_order_id,''),
   'receiptTerminal',coalesce(p.exit_execution_state->>'terminal','false')='true'); $$;
 create or replace function sag_lp_v3_close_qualifies(p sag_entries) returns boolean language sql immutable as $$
 select coalesce(p.status='closed' and p.remaining_count=0 and p.count>0 and p.exit_filled_count=p.count
   and p.closed_at_ms>0 and p.pnl_cents>0 and p.close_reason in (${reasons})
   and nullif(p.exit_client_order_id,'') is null and (p.mode<>'LIVE' or p.exit_execution_state->>'terminal'='true')
   and p.exit_notional_cents-p.entry_price_cents*p.count-p.entry_fee_cents-p.exit_fee_cents>0
   and abs(p.pnl_cents-(p.exit_notional_cents-p.entry_price_cents*p.count-p.entry_fee_cents-p.exit_fee_cents))<=0.000001,false); $$;
 create or replace function sag_lp_v3_observe_parent() returns trigger language plpgsql as $$
 declare a sag_lp_continuation_v3; s jsonb; at_ms bigint; ep bigint; next_state text; next_reason text;
   safety boolean; pr jsonb; activation bigint;
 begin
   if NEW.concept_name<>'Crash Recovery Hunter' or coalesce(NEW.execution_class,'CAPITAL')='SHADOW_SAINT'
      or coalesce(NEW.entry_config->>'executionClass','CAPITAL')='SHADOW_SAINT' then
     update sag_lp_continuation_v3 set state='REVOKED',revision=revision+1,terminal_reason='lp_parent_class_changed',
       updated_at_ms=(extract(epoch from clock_timestamp())*1000)::bigint
       where parent_entry_id=NEW.id and state not in ('REVOKED','MARKET_TERMINAL');
     return NEW; end if;
   at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
   select * into a from sag_lp_continuation_v3 where parent_entry_id=NEW.id for update;
   if a.parent_entry_id is null then
     select value into s from sag_settings where key='runtime';
     ep:=coalesce((s->>'resetTimestampMs')::bigint,0);
     select activated_at_ms into activation from sag_lp_v3_activation where singleton;
     if NEW.system_name is distinct from s->>'systemName' or NEW.owner_id is distinct from s->>'ownerId'
        or NEW.mode is distinct from s->>'mode' or NEW.opened_at_ms<ep or NEW.archived then return NEW; end if;
     if NEW.status='closed' then
       if TG_OP<>'UPDATE' then return NEW; end if;
       if OLD.status not in ('open','entry_pending','exit_pending','pending_recovery') or NEW.closed_at_ms<activation then return NEW; end if;
     elsif NEW.status not in ('open','entry_pending','exit_pending','pending_recovery') then return NEW;
     end if;
     -- An unenrolled parent with prior exits has no complete V3 safety history.
     -- Keep normal OPEN monitoring, but conservatively veto CLOSED continuation.
     insert into sag_lp_continuation_v3(parent_entry_id,system_name,owner_id,mode,reset_epoch,ticker,event_ticker,entry_price_cents,opened_at_ms,state,safety_exit_seen,enrolled_at_ms,updated_at_ms)
       values(NEW.id,NEW.system_name,NEW.owner_id,NEW.mode,ep,NEW.ticker,NEW.event_ticker,NEW.entry_price_cents,NEW.opened_at_ms,'AWAITING_EXIT',
         NEW.exit_filled_count>0,at_ms,at_ms)
       on conflict do nothing;
     select * into a from sag_lp_continuation_v3 where parent_entry_id=NEW.id for update;
   end if;
   if a.state in ('REVOKED','MARKET_TERMINAL') then return NEW; end if;
   safety:=a.safety_exit_seen;
   if TG_OP='UPDATE' and NEW.exit_filled_count>OLD.exit_filled_count
      and coalesce(NEW.close_reason,'') not in (${reasons}) then safety:=true; end if;
   pr:=sag_lp_v3_parent_proof(NEW);
   next_reason:=null;
   if NEW.system_name<>a.system_name or NEW.owner_id<>a.owner_id or NEW.mode<>a.mode or NEW.ticker<>a.ticker
      or NEW.event_ticker is distinct from a.event_ticker or NEW.opened_at_ms<>a.opened_at_ms then next_state:='REVOKED';next_reason:='lp_parent_identity_mutated';
   elsif NEW.status='closed' and (NEW.pnl_cents<=0 or coalesce(NEW.close_reason,'') not in (${reasons}) or safety) then
     next_state:='REVOKED';next_reason:='lp_parent_loss_breakeven_or_safety_close';
   elsif NEW.status='closed' and sag_lp_v3_close_qualifies(NEW) then next_state:='CLOSED_PROFIT';
   elsif NEW.status='open' and NEW.remaining_count>0 and not NEW.archived then next_state:='OPEN';
   elsif NEW.archived and NEW.status<>'closed' then next_state:='REVOKED';next_reason:='lp_parent_archived_open';
   elsif NEW.status='rejected' then next_state:='REVOKED';next_reason:='lp_parent_no_fill';
   else next_state:='AWAITING_EXIT'; end if;
   -- Any original reference-price correction invalidates previously prepared intents.
   if pr is distinct from a.proof or next_state<>a.state or safety<>a.safety_exit_seen then
     update sag_lp_continuation_v3 set state=next_state,proof=pr,revision=revision+1,safety_exit_seen=safety,
       entry_price_cents=NEW.entry_price_cents,terminal_reason=next_reason,updated_at_ms=at_ms
       where parent_entry_id=NEW.id;
   end if;
   return NEW;
 end; $$;
 drop trigger if exists sag_lp_v3_parent_observer on sag_entries;
 create trigger sag_lp_v3_parent_observer after insert or update of status,entry_price_cents,entry_fee_cents,count,remaining_count,
   exit_filled_count,exit_fee_cents,exit_notional_cents,pnl_cents,close_reason,closed_at_ms,exit_client_order_id,exit_execution_state,archived,
   system_name,owner_id,mode,ticker,event_ticker,opened_at_ms,concept_name,execution_class,entry_config
   on sag_entries for each row execute function sag_lp_v3_observe_parent();
 -- An already OPEN position keeps its existing monitor. No historical CLOSED trade is armed.
 -- Updating only existing open rows invokes the identical atomic observer; no economics change.
 update sag_entries p set remaining_count=p.remaining_count
   from sag_settings r where r.key='runtime' and p.concept_name='Crash Recovery Hunter'
   and p.system_name=r.value->>'systemName' and p.owner_id=r.value->>'ownerId' and p.mode=r.value->>'mode'
   and p.opened_at_ms>=coalesce((r.value->>'resetTimestampMs')::bigint,0)
   and p.status in ('open','entry_pending','exit_pending','pending_recovery') and not p.archived
   and not exists(select 1 from sag_lp_continuation_v3 a where a.parent_entry_id=p.id);
 create or replace function sag_lp_v3_parent_eligible(p sag_entries,a sag_lp_continuation_v3,s jsonb) returns boolean language plpgsql stable as $$
 begin
   if p.id is null or p.mode not in ('LIVE','SIMULATION') or p.concept_name<>'Crash Recovery Hunter' or coalesce(p.execution_class,'CAPITAL')='SHADOW_SAINT'
     or coalesce(p.entry_config->>'executionClass','CAPITAL')='SHADOW_SAINT'
     or p.system_name is distinct from s->>'systemName' or p.owner_id is distinct from s->>'ownerId'
     or p.mode is distinct from s->>'mode' or p.opened_at_ms<coalesce((s->>'resetTimestampMs')::bigint,0) then return false; end if;
   if a.parent_entry_id is null then return false;end if;
   if coalesce(p.entry_config->>'side','YES')<>'YES' then return false;end if;
   if a.parent_entry_id is not null then
     if a.state in ('REVOKED','MARKET_TERMINAL') or a.system_name<>p.system_name or a.owner_id<>p.owner_id or a.mode<>p.mode
       or a.ticker<>p.ticker or a.event_ticker is distinct from p.event_ticker or a.opened_at_ms<>p.opened_at_ms or a.entry_price_cents<>p.entry_price_cents
       or a.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0) then return false; end if;
   end if;
   if p.status='open' and p.remaining_count>0 and p.remaining_count<=p.count and not p.archived
     and a.state='OPEN' and a.proof=sag_lp_v3_parent_proof(p) then return true; end if;
   return coalesce(a.parent_entry_id is not null and a.state='CLOSED_PROFIT' and not a.safety_exit_seen
      and a.proof=sag_lp_v3_parent_proof(p) and sag_lp_v3_close_qualifies(p),false);
 end; $$;
 -- Fence pre-V3 pending BUY intents for dispatch without modifying quantities,
 -- order/client IDs, PNL, Aurora or their protective reconciliation lifecycle.
 update sag_entries set entry_config=entry_config||jsonb_build_object(
   'lpV3LegacyIntent',jsonb_build_object('reconcileOnly',true,'originalExecutionSettingsHash',entry_config->>'executionSettingsHash'),
   'executionSettingsHash','LP-V3-RECONCILE-ONLY:'||coalesce(entry_config->>'executionSettingsHash','missing'))
 where concept_name='Lightning Plasma' and mode='LIVE' and status='entry_pending'
   and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT' and coalesce(entry_config->>'executionClass','CAPITAL')<>'SHADOW_SAINT'
   and entry_config#>>'{lightningPlasmaScaleIn,version}' is distinct from '${LP_CONTINUATION_VERSION}'
   and coalesce(entry_config#>>'{lpV3LegacyIntent,reconcileOnly}','false')<>'true';
 create or replace function sag_lp_v3_child_admission() returns trigger language plpgsql as $$
 declare p sag_entries;a sag_lp_continuation_v3;s jsonb;stamp jsonb;signal jsonb;aurora jsonb;seats int;at_ms bigint;
 begin
   if NEW.concept_name<>'Lightning Plasma' or coalesce(NEW.execution_class,'CAPITAL')='SHADOW_SAINT'
     or coalesce(NEW.entry_config->>'executionClass','CAPITAL')='SHADOW_SAINT' then return NEW; end if;
   stamp:=NEW.entry_config->'lightningPlasmaScaleIn';
   if stamp->>'version' is distinct from '${LP_CONTINUATION_VERSION}' then raise exception 'lp_v3_build_required_for_new_entry'; end if;
   select value into s from sag_settings where key='runtime' for update;
   if s->>'engineActive' is distinct from 'true' or s->>'lightningPlasmaEnabled' is distinct from 'true'
     or NEW.system_name is distinct from s->>'systemName' or NEW.owner_id is distinct from s->>'ownerId'
     or NEW.mode is distinct from s->>'mode' or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true') then raise exception 'lp_v3_operator_authority_changed';end if;
   select * into p from sag_entries where id=NEW.source_trade_id for update;
   select * into a from sag_lp_continuation_v3 where parent_entry_id=NEW.source_trade_id for update;
   if not sag_lp_v3_parent_eligible(p,a,s) or p.ticker<>NEW.ticker then raise exception 'lp_v3_parent_ineligible_at_insert';end if;
   if stamp->>'parentStarlightId' is distinct from NEW.source_trade_id
      or (stamp->>'parentAuthorityRevision')::bigint is distinct from coalesce(a.revision,0)
      or (stamp->>'parentEntryPriceCents')::double precision is distinct from p.entry_price_cents::double precision
      or (stamp->>'resetTimestampMs')::bigint is distinct from coalesce((s->>'resetTimestampMs')::bigint,0)
      or (stamp->>'thresholdCents')::double precision is distinct from (s->>'lightningPlasmaStarlightScaleInCents')::double precision then
     raise exception 'lp_v3_stale_parent_or_settings_revision';end if;
   signal:=NEW.entry_config->'finalEntryConfirmation';at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
   if not coalesce(signal->>'ok'='true'
      and (signal->>'quoteAtMs')::bigint between greatest(1,at_ms-5000) and at_ms
      and (signal->>'bidCents')::double precision-p.entry_price_cents >= (stamp->>'thresholdCents')::double precision
      and (stamp->>'thresholdCents')::double precision>0
      and (signal->>'askCents')::double precision >= (signal->>'bidCents')::double precision
      and NEW.entry_price_cents between (s->>'lightningPlasmaMinEntryCents')::double precision and (s->>'lightningPlasmaMaxEntryCents')::double precision,false) then
     raise exception 'lp_v3_final_signal_or_band_invalid';end if;
   aurora:=case when NEW.mode='LIVE' and NEW.status='entry_pending'
     then NEW.entry_config#>'{auroraPending,preflight}' else NEW.entry_config->'aurora' end;
   if not coalesce(aurora->>'version'='${AURORA_EXECUTION.version}' and aurora->>'policyRevision'='${AURORA_EXECUTION.policyRevision}'
      and aurora->>'frozen'='true' and aurora->>'ok'='true' and aurora->>'mode'=NEW.mode
      and (aurora->>'damageControlPercent')::double precision=(s->>'lightningPlasmaAuroraDamageControlPercent')::double precision
      and (aurora->>'entryPriceCents')::double precision=NEW.entry_price_cents
      and (aurora->>'originalContractCount')::int=NEW.count
      and (NEW.entry_config->'freezingCoffin' is null or NEW.entry_config->'freezingCoffin'='null'::jsonb)
      and (NEW.mode<>'LIVE' or NEW.status<>'entry_pending' or (
        NEW.entry_config#>>'{auroraPending,version}'='${AURORA_EXECUTION.version}'
        and NEW.entry_config#>>'{auroraPending,exactFillRequired}'='true')),false) then raise exception 'lp_scalein_own_aurora_required';end if;
   select count(*) into seats from sag_entries where system_name=NEW.system_name and owner_id=NEW.owner_id and mode=NEW.mode
      and concept_name='Lightning Plasma' and source_trade_id=NEW.source_trade_id
      and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT' and coalesce(entry_config->>'executionClass','CAPITAL')<>'SHADOW_SAINT'
      and not (status='rejected' and coalesce(remaining_count,0)=0);
   if seats>=greatest(1,least(20,coalesce((s->>'lightningPlasmaMultiply')::int,1))) then raise exception 'lp_scalein_multiply_full'; end if;
   return NEW;
 end; $$;
 drop trigger if exists sag_lp_v3_entry_guard on sag_entries;
 create trigger sag_lp_v3_entry_guard before insert on sag_entries for each row execute function sag_lp_v3_child_admission();
`;
