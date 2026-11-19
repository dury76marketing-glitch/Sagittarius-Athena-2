/** APS2 / LP-V4. Only database-attested virtual Starlight parents authorize NEW capital.
 * LP-V3 remains in the database solely for legacy history/reconciliation. No
 * fictional broker receipt is manufactured to make a virtual LIVE parent pass.
 */
import {authorityHash,verifyAthenaFireCommandHash} from './authority.mjs';
import {isShadowSaintEntry,AURORA_EXECUTION} from './doctrine.mjs';
import {SHADOW_PROTOCOL,shadowEntryHash,sameShadowScope} from './shadowProtocol.mjs';
import {STARLIGHT_SHADOW_VERSION} from './shadowStarlight.mjs';
import {LP_PROFIT_EXIT_REASONS,lightningParentProof as capitalParentProof,
  lightningEntryAuroraProof} from './lightningContinuation.mjs';
export {LP_PROFIT_EXIT_REASONS,lightningEntryAuroraProof};
// V5 authorizes ONLY a confirmed, still-open CAPITAL Starlight parent.
// V4 is retained byte-for-byte for pre-upgrade history/reconciliation.
import {STARLIGHT_CAPITAL_VERSION} from './starlightCapital.mjs';
import {verifiedLiveCapitalParentEntryFill,liveCapitalParentEntryFillSql} from './liveParentEntryProof.mjs';
export const LP_V4_LEGACY_VERSION='LP-V4-VIRTUAL-STARLIGHT';
export const LP_CONTINUATION_VERSION='LP-V5-CAPITAL-OPEN-STARLIGHT';
export const LP_TERMINAL_STATES=Object.freeze(['REVOKED','MARKET_TERMINAL']);
const same=(a,b)=>String(a??'')===String(b??'');
const finite=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x));
export const lightningParentProof=(e)=>({...capitalParentProof(e),
  starlightCapitalVersion:e.entryConfig?.starlightCapital?.version||null,
  entryOrderId:e.entryOrderId||null,entryClientOrderId:e.entryClientOrderId||null,
  entryFillAuthoritative:e.entryConfig?.entryFillProof?.authoritative===true});
export const lightningClosedProfitProof=()=>false;
export function lightningParentEligibility(parent,settings={}, {ticker=null,strictScope=true}={}){
  const e=parent||{},a=e.lpContinuation;
  const fail=reason=>({ok:false,reason});
  if(e.conceptName!=='Crash Recovery Hunter')return fail('not_starlight');
  if(isShadowSaintEntry(e)||e.executionClass!=='CAPITAL'
    ||e.entryConfig?.executionClass!=='CAPITAL'
    ||e.entryConfig?.starlightCapital?.version!==STARLIGHT_CAPITAL_VERSION)
    return fail('lp_v5_real_capital_starlight_required');
  if(e.status!=='open'||e.archived===true||!(Number(e.remainingCount)>0)
    ||!(Number(e.count)>0)||Number(e.remainingCount)>Number(e.count)
    ||Number(e.exitFilledCount||0)!==0)
    return fail('lp_v5_starlight_must_remain_open');
  if(e.mode==='LIVE'&&!verifiedLiveCapitalParentEntryFill(e).ok)
    return fail('lp_v5_real_live_parent_fill_not_verified');
  if(String(e.side||e.entryConfig?.side||'YES').toUpperCase()!=='YES')return fail('lp_parent_outcome_changed');
  if(strictScope){
    for(const key of ['systemName','ownerId','mode'])if(!settings[key]||!same(e[key],settings[key]))return fail('lp_parent_scope_changed');
    if(!['LIVE','SIMULATION'].includes(e.mode)||!(Number(e.openedAtMs)>0)
      ||Number(e.openedAtMs)<Number(settings.resetTimestampMs||0)
      ||Number(e.shadowEpoch)!==Number(settings.resetTimestampMs||0))return fail('lp_parent_reset_changed');
  }
  if(ticker!==null&&!same(e.ticker,ticker))return fail('lp_parent_ticker_changed');
  if(!a)return fail('lp_v5_no_capital_parent_observer');
  if(a.version!==LP_CONTINUATION_VERSION||!same(a.parentEntryId,e.id)
    ||!same(a.ticker,e.ticker)||!same(a.eventTicker,e.eventTicker)
    ||!same(a.systemName,e.systemName)||!same(a.ownerId,e.ownerId)||!same(a.mode,e.mode)
    ||Number(a.originalEntryPriceCents)!==Number(e.entryPriceCents)
    ||Number(a.originalOpenedAtMs)!==Number(e.openedAtMs)
    ||Number(a.resetTimestampMs)!==Number(e.shadowEpoch)
    ||!Number.isSafeInteger(Number(a.revision))||Number(a.revision)<1)
    return fail('lp_v5_parent_authority_identity_changed');
  if(a.state!=='OPEN')return fail(a.reason||'lp_v5_parent_not_open');
  if(authorityHash(a.proof)!==authorityHash(lightningParentProof(e)))
    return fail('lp_v5_parent_proof_revision_changed');
  return {ok:true,kind:'OPEN_CAPITAL',revision:Number(a.revision),referenceEntryCents:Number(e.entryPriceCents)};
}
export function mapLightningAuthority(r){
  if(!r?.parent_entry_id)return null;
  return {version:LP_CONTINUATION_VERSION,parentEntryId:r.parent_entry_id,systemName:r.system_name,
    ownerId:r.owner_id,mode:r.mode,resetTimestampMs:Number(r.reset_epoch),ticker:r.ticker,eventTicker:r.event_ticker,
    side:'YES',originalEntryPriceCents:Number(r.entry_price_cents),originalOpenedAtMs:Number(r.opened_at_ms),
    state:r.state,revision:Number(r.revision),safetyExitSeen:r.safety_exit_seen===true,proof:r.proof||{},
    reason:r.terminal_reason||null,enrolledAtMs:Number(r.enrolled_at_ms),updatedAtMs:Number(r.updated_at_ms)};
}
// Pure quote geometry: monotone timestamps; detect peak -> crash -> rebound + consecutive rising ticks.
// This state is derived from observed market quotes, never from user-provided entry stamps.
export function observePlasmaGeometry(state,quote,openingPrice){
  const bid=Number(quote?.yesBid),at=Number(quote?.quoteAtMs||quote?.updatedAtMs||0);
  if(!(bid>0)||!Number.isFinite(bid)||!(at>0))return state||null;
  const old=state||{},priorAt=Number(old.lastQuoteAtMs||0),last=Number(old.lastBid||0);
  if(priorAt>=at)return state||null;
  const anchor=Number.isFinite(Number(openingPrice))&&Number(openingPrice)>0?Number(openingPrice):bid;
  // A crash is measured ONLY from a peak to a later trough. An earlier
  // opening trough cannot manufacture a large crash after a subsequent rise.
  // A fresh high starts a new, independently qualified crash/rebound cycle.
  const priorPeak=Number(old.peakBid||anchor);
  const newPeak=last<=0||bid>priorPeak;
  const peak=newPeak?Math.max(anchor,bid):priorPeak;
  const trough=newPeak?bid:Math.min(Number(old.troughBid??priorPeak),bid);
  const crash=newPeak?0:Math.max(Number(old.crashDepth||0),peak-trough);
  const ticks=last>0&&bid>last ? Number(old.upwardTicks||0)+1 :bid<last?0:Number(old.upwardTicks||0);
  return {peakBid:peak,troughBid:trough,crashDepth:crash,reboundCents:Math.max(0,bid-trough),
    upwardTicks:ticks,lastBid:bid,lastQuoteAtMs:at,observations:Number(old.observations||0)+1};
}
export function plasmaGeometryEligibility(observation,settings={},quote=null){
  const minCrash=Math.max(0,Number(settings.lightningPlasmaMinCrashCents||0));
  const minRebound=Math.max(0,Number(settings.lightningPlasmaMinReboundCents||0));
  const minTicks=Math.max(0,Math.floor(Number(settings.lightningPlasmaMinUpwardTicks||0)));
  const fail=reason=>({ok:false,reason});
  if(!observation){if(minCrash||minRebound||minTicks)return fail('lp_v5_observation_required');
    return {ok:true,crashDepth:0,reboundCents:0,upwardTicks:0,quoteAtMs:Number(quote?.quoteAtMs||0)};}
  if(quote && Number(observation.lastQuoteAtMs)!==Number(quote.quoteAtMs||quote.updatedAtMs||0))
    return fail('lp_v5_observation_stale');
  if(Number(observation.crashDepth)<minCrash)return fail('lp_v5_min_crash_not_met');
  if(Number(observation.reboundCents)<minRebound)return fail('lp_v5_min_rebound_not_met');
  if(Number(observation.upwardTicks)<minTicks)return fail('lp_v5_min_upward_ticks_not_met');
  return {ok:true,crashDepth:Number(observation.crashDepth),reboundCents:Number(observation.reboundCents),
    upwardTicks:Number(observation.upwardTicks),quoteAtMs:Number(observation.lastQuoteAtMs||0)};
}
const reasons=LP_PROFIT_EXIT_REASONS.map(x=>`'${x}'`).join(',');
export const LP_SHADOW_CONTINUATION_SQL=`
create table if not exists sag_lp_continuation_v4(
 parent_entry_id text primary key references sag_entries(id),system_name text not null,owner_id text not null,
 mode text not null,reset_epoch bigint not null,ticker text not null,event_ticker text,
 entry_price_cents double precision not null,opened_at_ms bigint not null,
 state text not null check(state in ('OPEN','AWAITING_EXIT','CLOSED_PROFIT','REVOKED','MARKET_TERMINAL')),
 revision bigint not null default 1,safety_exit_seen boolean not null default false,proof jsonb not null,
 terminal_reason text,enrolled_at_ms bigint not null,updated_at_ms bigint not null,last_polled_at_ms bigint not null default 0);
create index if not exists sag_lp_v4_scope_poll on sag_lp_continuation_v4
 (system_name,owner_id,mode,reset_epoch,last_polled_at_ms,parent_entry_id)
 where state in ('OPEN','CLOSED_PROFIT');
create or replace function sag_lp_v4_parent_proof(p sag_entries) returns jsonb language sql immutable as $$
 select sag_lp_v3_parent_proof(p)||jsonb_build_object('entryHash',p.shadow_entry_hash,
 'virtualProtocol',p.entry_config#>>'{starlightShadow,version}',
 'closeProofHash',p.shadow_state->>'closeProofHash');$$;
create or replace function sag_lp_v4_close_qualifies(p sag_entries) returns boolean language sql immutable as $$
 select coalesce(p.execution_class='SHADOW_SAINT' and p.entry_config->>'executionClass'='SHADOW_SAINT'
 and p.status='closed' and p.remaining_count=0 and p.count>0 and p.exit_filled_count=p.count and p.closed_at_ms>0
 and p.pnl_cents>0 and p.close_reason in (${reasons})
 and p.entry_order_id is null and p.entry_client_order_id is null and p.exit_order_id is null and p.exit_client_order_id is null
 and p.exit_notional_cents-p.entry_price_cents*p.count-p.entry_fee_cents-p.exit_fee_cents>0
 and abs(p.pnl_cents-(p.exit_notional_cents-p.entry_price_cents*p.count-p.entry_fee_cents-p.exit_fee_cents))<=0.000001
 and p.shadow_state#>>'{closeProof,version}'='${SHADOW_PROTOCOL}'
 and p.shadow_state#>>'{closeProof,parentEntryId}'=p.id
 and p.shadow_state#>>'{closeProof,entryHash}'=p.shadow_entry_hash
 and p.shadow_state#>>'{closeProof,brokerOrderAuthority}'='false'
 and p.shadow_state#>>'{closeProof,full}'='true'
 and (p.shadow_state#>>'{closeProof,count}')::int=p.count
 and (p.shadow_state#>>'{closeProof,filled}')::int=p.count
 and (p.shadow_state#>>'{closeProof,expectedRevision}')::bigint+1=p.shadow_revision
 and (p.shadow_state#>>'{closeProof,pnlCents}')::numeric=p.pnl_cents::numeric
 and (p.shadow_state#>>'{closeProof,exitFeeCents}')::numeric=p.exit_fee_cents::numeric
 and abs((p.shadow_state#>>'{closeProof,exitPriceCents}')::numeric*p.count-p.exit_notional_cents::numeric)<=0.000001
 and (p.shadow_state#>>'{closeProof,closedAtMs}')::bigint=p.closed_at_ms
 and p.shadow_state#>>'{closeProof,closeReason}'=p.close_reason
 and p.shadow_state#>>'{closeProof,scope,systemName}'=p.system_name
 and p.shadow_state#>>'{closeProof,scope,ownerId}'=p.owner_id
 and p.shadow_state#>>'{closeProof,scope,mode}'=p.mode
 and (p.shadow_state#>>'{closeProof,scope,resetEpoch}')::bigint=p.shadow_epoch
 and nullif(p.shadow_state->>'closeProofHash','') is not null,false);$$;
create or replace function sag_lp_v4_observe_parent() returns trigger language plpgsql as $$
declare a sag_lp_continuation_v4;at_ms bigint;next_state text;pr jsonb;
begin
 if NEW.concept_name<>'Crash Recovery Hunter' or NEW.execution_class is distinct from 'SHADOW_SAINT'
  or NEW.entry_config#>>'{starlightShadow,version}' is distinct from '${STARLIGHT_SHADOW_VERSION}' then return NEW;end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;pr:=sag_lp_v4_parent_proof(NEW);
 select * into a from sag_lp_continuation_v4 where parent_entry_id=NEW.id for update;
 if a.state in ('REVOKED','MARKET_TERMINAL') then return NEW;end if;
 if NEW.archived then next_state:='REVOKED';
 elsif NEW.status='open' and NEW.remaining_count>0 then next_state:='OPEN';
 elsif NEW.status='closed' and sag_lp_v4_close_qualifies(NEW) then next_state:='CLOSED_PROFIT';
 else next_state:='REVOKED';end if;
 if a.parent_entry_id is null then
  -- Only the admission INSERT may enroll a parent; never arm a historical close.
  if TG_OP<>'INSERT' or next_state<>'OPEN' then return NEW;end if;
  insert into sag_lp_continuation_v4(parent_entry_id,system_name,owner_id,mode,reset_epoch,ticker,event_ticker,
   entry_price_cents,opened_at_ms,state,proof,enrolled_at_ms,updated_at_ms)
   values(NEW.id,NEW.system_name,NEW.owner_id,NEW.mode,NEW.shadow_epoch,NEW.ticker,NEW.event_ticker,
   NEW.entry_price_cents,NEW.opened_at_ms,next_state,pr,at_ms,at_ms);
 elsif pr is distinct from a.proof or next_state<>a.state then
  update sag_lp_continuation_v4 set state=next_state,proof=pr,revision=revision+1,
   safety_exit_seen=(next_state='REVOKED'),terminal_reason=case when next_state='REVOKED'
   then 'lp_virtual_parent_loss_or_invalid_close' else null end,updated_at_ms=at_ms where parent_entry_id=NEW.id;
 end if;
 return NEW;
end $$;
drop trigger if exists sag_lp_v4_parent_observer on sag_entries;
create trigger sag_lp_v4_parent_observer after insert or update of status,remaining_count,exit_filled_count,
 exit_fee_cents,exit_notional_cents,pnl_cents,close_reason,closed_at_ms,shadow_state,shadow_revision,archived
 on sag_entries for each row execute function sag_lp_v4_observe_parent();
create or replace function sag_lp_v4_parent_eligible(p sag_entries,a sag_lp_continuation_v4,s jsonb)
 returns boolean language sql stable as $$
 select coalesce(p.id is not null and p.concept_name='Crash Recovery Hunter'
 and p.execution_class='SHADOW_SAINT' and p.entry_config->>'executionClass'='SHADOW_SAINT'
 and p.entry_config#>>'{shadowSaint,version}'='${SHADOW_PROTOCOL}'
 and p.entry_config#>>'{starlightShadow,version}'='${STARLIGHT_SHADOW_VERSION}'
 and nullif(p.shadow_entry_hash,'') is not null and not p.archived and p.mode in ('LIVE','SIMULATION')
 and coalesce(p.entry_config->>'side','YES')='YES'
 and p.entry_order_id is null and p.entry_client_order_id is null and p.exit_order_id is null and p.exit_client_order_id is null
 and p.system_name=s->>'systemName' and p.owner_id=s->>'ownerId' and p.mode=s->>'mode'
 and p.shadow_epoch=coalesce((s->>'resetTimestampMs')::bigint,0) and p.opened_at_ms>=p.shadow_epoch
 and a.parent_entry_id=p.id and a.system_name=p.system_name and a.owner_id=p.owner_id and a.mode=p.mode
 and a.reset_epoch=p.shadow_epoch and a.ticker=p.ticker and a.event_ticker is not distinct from p.event_ticker
 and a.entry_price_cents=p.entry_price_cents and a.opened_at_ms=p.opened_at_ms and a.revision>0
 and a.proof=sag_lp_v4_parent_proof(p)
 and ((p.status='open' and a.state='OPEN' and p.remaining_count>0 and p.remaining_count=p.count and coalesce(p.exit_filled_count,0)=0)
 or (a.state='CLOSED_PROFIT' and not a.safety_exit_seen and sag_lp_v4_close_qualifies(p))),false);$$;
create or replace function sag_lp_v4_child_admission() returns trigger language plpgsql as $$
declare p sag_entries;a sag_lp_continuation_v4;s jsonb;stamp jsonb;q jsonb;aurora jsonb;seats int;at_ms bigint;
begin
 if NEW.concept_name<>'Lightning Plasma' or NEW.execution_class='SHADOW_SAINT'
  or NEW.entry_config->>'executionClass'='SHADOW_SAINT' then return NEW;end if;
 stamp:=NEW.entry_config->'lightningPlasmaScaleIn';
 if stamp->>'version' is distinct from '${LP_V4_LEGACY_VERSION}' then raise exception 'lp_v4_build_required_for_new_capital';end if;
 select value into s from sag_settings where key='runtime' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for update;
 select * into a from sag_lp_continuation_v4 where parent_entry_id=NEW.source_trade_id for update;
 if s->>'engineActive' is distinct from 'true' or s->>'lightningPlasmaEnabled' is distinct from 'true'
  or NEW.system_name is distinct from s->>'systemName' or NEW.owner_id is distinct from s->>'ownerId'
  or NEW.mode is distinct from s->>'mode' or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true')
  or not sag_lp_v4_parent_eligible(p,a,s) or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
 then raise exception 'lp_v4_parent_or_operator_ineligible';end if;
 if stamp->>'parentStarlightId' is distinct from p.id or (stamp->>'parentAuthorityRevision')::bigint is distinct from a.revision
  or (stamp->>'parentEntryPriceCents')::numeric is distinct from p.entry_price_cents::numeric
  or (stamp->>'resetTimestampMs')::bigint is distinct from p.shadow_epoch
  or (stamp->>'thresholdCents')::numeric is distinct from (s->>'lightningPlasmaStarlightScaleInCents')::numeric
 then raise exception 'lp_v4_stale_parent_or_settings_revision';end if;
 q:=NEW.entry_config->'finalEntryConfirmation';at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 if not coalesce(q->>'ok'='true' and (q->>'quoteAtMs')::bigint between greatest(p.opened_at_ms,at_ms-5000) and at_ms
  and (q->>'bidCents')::numeric-p.entry_price_cents>=(stamp->>'thresholdCents')::numeric
  and (stamp->>'thresholdCents')::numeric>0 and (q->>'askCents')::numeric>=(q->>'bidCents')::numeric
  and NEW.entry_price_cents between (s->>'lightningPlasmaMinEntryCents')::numeric and (s->>'lightningPlasmaMaxEntryCents')::numeric
  and NEW.count>0 and NEW.remaining_count=NEW.count
  and ((NEW.mode='SIMULATION' and NEW.status='open' and NEW.entry_client_order_id is null)
   or (NEW.mode='LIVE' and NEW.status='entry_pending' and nullif(NEW.entry_client_order_id,'') is not null)),false)
 then raise exception 'lp_v4_final_signal_or_execution_invalid';end if;
 aurora:=case when NEW.mode='LIVE' then NEW.entry_config#>'{auroraPending,preflight}' else NEW.entry_config->'aurora' end;
 if not coalesce(aurora->>'version'='${AURORA_EXECUTION.version}' and aurora->>'policyRevision'='${AURORA_EXECUTION.policyRevision}'
  and aurora->>'frozen'='true' and aurora->>'ok'='true' and aurora->>'mode'=NEW.mode
  and (aurora->>'damageControlPercent')::numeric=(s->>'lightningPlasmaAuroraDamageControlPercent')::numeric
  and (aurora->>'entryPriceCents')::numeric=NEW.entry_price_cents and (aurora->>'originalContractCount')::int=NEW.count
  and (NEW.entry_config->'freezingCoffin' is null or NEW.entry_config->'freezingCoffin'='null'::jsonb)
  and (NEW.mode<>'LIVE' or NEW.entry_config#>>'{auroraPending,exactFillRequired}'='true'),false)
 then raise exception 'lp_v4_own_aurora_required';end if;
 select count(*) into seats from sag_entries where system_name=NEW.system_name and owner_id=NEW.owner_id
  and mode=NEW.mode and concept_name='Lightning Plasma' and source_trade_id=NEW.source_trade_id
  and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT'
  and not(status='rejected' and coalesce(remaining_count,0)=0);
 if seats>=greatest(1,least(20,coalesce((s->>'lightningPlasmaMultiply')::int,1))) then raise exception 'lp_v4_multiply_full';end if;
 return NEW;
end $$;
-- V3 INSERT authority is superseded atomically, not weakened or rewritten for history.
drop trigger if exists sag_lp_v3_entry_guard on sag_entries;
drop trigger if exists sag_lp_v4_entry_guard on sag_entries;
create trigger sag_lp_v4_entry_guard before insert on sag_entries for each row execute function sag_lp_v4_child_admission();
`;

// SC1/LP-V5: independent, post-upgrade CAPITAL Starlight observation.
// V4 tables are not altered or backfilled. New LP intents MUST use V5.
export const LP_V5_SQL=`
create table if not exists sag_lp_continuation_v5(
 parent_entry_id text primary key references sag_entries(id),
 system_name text not null,owner_id text not null,mode text not null,
 reset_epoch bigint not null,ticker text not null,event_ticker text,
 entry_price_cents double precision not null,opened_at_ms bigint not null,
 state text not null check(state in ('OPEN','REVOKED','MARKET_TERMINAL')),
 revision bigint not null default 1,safety_exit_seen boolean not null default false,
 proof jsonb not null,terminal_reason text,enrolled_at_ms bigint not null,
 updated_at_ms bigint not null,last_polled_at_ms bigint not null default 0);
create index if not exists sag_lp_v5_scope_poll on sag_lp_continuation_v5
 (system_name,owner_id,mode,reset_epoch,last_polled_at_ms,parent_entry_id)
 where state='OPEN';
create table if not exists sag_lp_v5_observations(
 parent_entry_id text primary key references sag_lp_continuation_v5(parent_entry_id),
 quote_at_ms bigint not null,peak_bid double precision not null,
 trough_bid double precision not null,crash_depth double precision not null,
 rebound_cents double precision not null,upward_ticks integer not null,
 last_bid double precision not null,observations bigint not null,
 updated_at_ms bigint not null);
create or replace function sag_lp_v5_parent_proof(p sag_entries) returns jsonb language sql immutable as $$
 select sag_lp_v3_parent_proof(p)||jsonb_build_object(
 'starlightCapitalVersion',p.entry_config#>>'{starlightCapital,version}',
 'entryOrderId',nullif(p.entry_order_id,''),
 'entryClientOrderId',nullif(p.entry_client_order_id,''),
 'entryFillAuthoritative',coalesce(p.entry_config#>>'{entryFillProof,authoritative}','false')='true');$$;
create or replace function sag_lp_v5_observe_parent() returns trigger language plpgsql as $$
declare a sag_lp_continuation_v5; at_ms bigint; pr jsonb; next_state text; p sag_entries;
begin
 p:=NEW;
 if NEW.concept_name<>'Crash Recovery Hunter' or NEW.execution_class<>'CAPITAL'
  or NEW.entry_config->>'executionClass'<>'CAPITAL'
  or NEW.entry_config#>>'{starlightCapital,version}'<>'${STARLIGHT_CAPITAL_VERSION}' then return NEW;end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 select * into a from sag_lp_continuation_v5 where parent_entry_id=NEW.id for update;
 if a.state in ('REVOKED','MARKET_TERMINAL') then return NEW;end if;
 if NEW.archived or NEW.status<>'open' or NEW.remaining_count<=0
  or NEW.exit_filled_count<>0 or NEW.remaining_count>NEW.count
  or (NEW.mode='LIVE' and (nullif(NEW.entry_order_id,'') is null
    or NEW.entry_config#>>'{entryFillProof,authoritative}'<>'true'))
  or coalesce(${liveCapitalParentEntryFillSql('p')},true)
 then next_state:='REVOKED';else next_state:='OPEN';end if;
 if a.parent_entry_id is null then
  -- Never grandfather historical rows into a newly authorized V5 chain.
  if next_state<>'OPEN'
   or not((TG_OP='INSERT' and NEW.mode='SIMULATION')
     or (TG_OP='UPDATE' and NEW.mode='LIVE' and OLD.status='entry_pending'))
   then return NEW;end if;
  insert into sag_lp_continuation_v5(parent_entry_id,system_name,owner_id,mode,reset_epoch,
   ticker,event_ticker,entry_price_cents,opened_at_ms,state,proof,enrolled_at_ms,updated_at_ms)
  values(NEW.id,NEW.system_name,NEW.owner_id,NEW.mode,NEW.shadow_epoch,
   NEW.ticker,NEW.event_ticker,NEW.entry_price_cents,NEW.opened_at_ms,'OPEN',
   sag_lp_v5_parent_proof(NEW),at_ms,at_ms);
 else
  pr:=sag_lp_v5_parent_proof(NEW);
  if next_state<>a.state or pr is distinct from a.proof then
   update sag_lp_continuation_v5 set state=next_state,revision=revision+1,proof=pr,
    safety_exit_seen=next_state='REVOKED',
    terminal_reason=case when next_state='REVOKED' then 'starlight_no_longer_open' else null end,
    updated_at_ms=at_ms where parent_entry_id=NEW.id;
  end if;
 end if;
 return NEW;
end $$;
drop trigger if exists sag_lp_v5_parent_observer on sag_entries;
create trigger sag_lp_v5_parent_observer after insert or update of status,remaining_count,
 exit_filled_count,entry_order_id,entry_client_order_id,entry_config,archived,
 entry_price_cents,closed_at_ms,exit_fee_cents,exit_notional_cents,pnl_cents,
 close_reason on sag_entries for each row execute function sag_lp_v5_observe_parent();
create or replace function sag_lp_v5_parent_eligible(p sag_entries,a sag_lp_continuation_v5,s jsonb)
 returns boolean language sql stable as $$
 select coalesce(p.id is not null and a.parent_entry_id=p.id
  and p.concept_name='Crash Recovery Hunter'
  and p.execution_class='CAPITAL' and p.entry_config->>'executionClass'='CAPITAL'
  and p.entry_config#>>'{starlightCapital,version}'='${STARLIGHT_CAPITAL_VERSION}'
  and not p.archived and p.status='open' and p.remaining_count>0
  and p.remaining_count<=p.count and p.exit_filled_count=0
  and coalesce(p.entry_config->>'side','YES')='YES'
  and p.mode in ('LIVE','SIMULATION')
  and (p.mode<>'LIVE' or (nullif(p.entry_order_id,'') is not null
   and p.entry_config#>>'{entryFillProof,authoritative}'='true'))
  and not coalesce(${liveCapitalParentEntryFillSql('p')},true)
  and p.system_name=s->>'systemName' and p.owner_id=s->>'ownerId' and p.mode=s->>'mode'
  and p.shadow_epoch=(s->>'resetTimestampMs')::bigint and p.opened_at_ms>=p.shadow_epoch
  and a.system_name=p.system_name and a.owner_id=p.owner_id and a.mode=p.mode
  and a.reset_epoch=p.shadow_epoch and a.ticker=p.ticker
  and a.event_ticker is not distinct from p.event_ticker
  and a.entry_price_cents=p.entry_price_cents and a.opened_at_ms=p.opened_at_ms
  and a.state='OPEN' and a.revision>0 and a.proof=sag_lp_v5_parent_proof(p),false);$$;
create or replace function sag_lp_v5_child_admission() returns trigger language plpgsql as $$
declare p sag_entries;a sag_lp_continuation_v5;s jsonb;stamp jsonb;q jsonb;aurora jsonb;
 obs sag_lp_v5_observations;seats int;at_ms bigint;w record;rec jsonb;
begin
 if NEW.concept_name<>'Lightning Plasma' or NEW.execution_class='SHADOW_SAINT'
  or NEW.entry_config->>'executionClass'='SHADOW_SAINT' then return NEW;end if;
 -- SC clone authority is a distinct BEFORE INSERT fence installed in the SAME
 -- schema transaction. This never grants permission by a JSON boolean alone.
 -- The transaction-local GUC is set ONLY after locked JavaScript admission.
 if NEW.entry_config->>'starlightModelClone'='true'
   and NEW.entry_config#>>'{modelCloneCapital,version}'='SC-MODEL-CLONE-V1'
   and current_setting('sagittarius.model_clone_entry',true)='admitted'
 then return NEW;end if;
 -- Q17-R5: the R4 independent Athena-hard-stop CAPITAL route is NOT the
 -- retired Starlight-profit LP-V5 scale-in route. Its own atomic JavaScript
 -- admission holds settings, shadow-parent, watch and event-cap locks and sets
 -- this transaction-local capability only after all checks have passed.
 -- Revalidate durable facts here; a JSON stamp alone is never authority.
 if NEW.entry_config#>>'{independentRecovery,version}'='INDEPENDENT-ATHENA-LOSS-V2' then
   rec:=NEW.entry_config->'independentRecovery';
   if current_setting('sagittarius.independent_recovery_entry',true) is distinct from 'admitted'
     or NEW.execution_class is distinct from 'CAPITAL'
     or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
     or NEW.mode not in ('SIMULATION','LIVE')
     or (NEW.mode='SIMULATION' and (NEW.status<>'open' or NEW.entry_client_order_id is not null))
     or (NEW.mode='LIVE' and (NEW.status<>'entry_pending' or NEW.entry_client_order_id is null))
     or NEW.entry_order_id is not null or NEW.remaining_count<>NEW.count or NEW.count<=0
     or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
     or NEW.entry_config#>>'{freezingCoffin,enabled}'='true'
   then raise exception 'lp_independent_atomic_admission_required';end if;
   select value into s from sag_settings where key='runtime' for update;
   if s->>'engineActive' is distinct from 'true'
     or s->>'lightningPlasmaEnabled' is distinct from 'true'
     or s->>'mode' is distinct from NEW.mode
     or (NEW.mode='LIVE' and (s->>'liveArmed' is distinct from 'true'
       or s->>'liveOwnerAuthorized' is distinct from 'true'))
     or s->>'systemName' is distinct from NEW.system_name
     or s->>'ownerId' is distinct from NEW.owner_id
     or (s->>'resetTimestampMs')::bigint is distinct from (rec->>'resetEpoch')::bigint
     or rec->>'concept' is distinct from 'Lightning Plasma'
     or rec->>'parentEntryId' is distinct from NEW.source_trade_id
     or rec->>'authorizationId' is distinct from NEW.entry_config#>>'{independentAuthority,authorizationId}'
     or rec->>'parentProofHash' is distinct from NEW.entry_config#>>'{independentAuthority,parentProofHash}'
     or rec->>'watchAuthorizationId' is distinct from NEW.entry_config#>>'{independentAuthority,watchAuthorizationId}'
     or (rec->>'watchRevision')::bigint is distinct from
       (NEW.entry_config#>>'{independentAuthority,watchRevision}')::bigint
     or NEW.entry_config#>>'{independentAuthority,authorityMode}' is distinct from 'INDEPENDENT_ATHENA_SHADOW_STOP'
     or NEW.entry_config#>>'{independentAuthority,verifiedStop}' is distinct from 'true'
     or NEW.entry_config#>>'{independentAuthority,mode}' is distinct from NEW.mode
     or NEW.entry_config#>>'{independentAuthority,systemName}' is distinct from NEW.system_name
     or NEW.entry_config#>>'{independentAuthority,ownerId}' is distinct from NEW.owner_id
     or NEW.entry_config#>>'{independentAuthority,ticker}' is distinct from NEW.ticker
     or NEW.entry_config#>>'{independentAuthority,eventTicker}' is distinct from NEW.event_ticker
     or (NEW.entry_config#>>'{independentAuthority,resetEpoch}')::bigint is distinct from (rec->>'resetEpoch')::bigint
     or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
     or NEW.entry_price_cents > (NEW.entry_config#>>'{independentAuthority,authorizedMaxEntryCents}')::numeric
     or NEW.entry_config->>'auroraDamageControlPercent' is distinct from s->>'lightningPlasmaAuroraDamageControlPercent'
     or (NEW.mode='SIMULATION' and NEW.entry_config#>>'{aurora,frozen}' is distinct from 'true')
   then raise exception 'lp_independent_operator_scope_or_price_invalid';end if;
   select * into w from sag_independent_recovery_v1 where
     system_name=NEW.system_name and owner_id=NEW.owner_id and mode=NEW.mode
     and reset_epoch=(rec->>'resetEpoch')::bigint
     and authorization_id=rec->>'watchAuthorizationId'
     and concept='Lightning Plasma' and parent_entry_id=NEW.source_trade_id for update;
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
     or (w.watch->>'link') is distinct from (s->>'lightningPlasmaLinkEnabled')
     or (coalesce((w.watch->>'link')::boolean,false)=false and
       NEW.entry_price_cents not between (s->>'lightningPlasmaMinEntryCents')::numeric
       and (s->>'lightningPlasmaMaxEntryCents')::numeric)
     or (coalesce((w.watch->>'link')::boolean,false)=false and
       (w.watch->>'crashDepthCents')::numeric<coalesce((s->>'lightningPlasmaMinCrashCents')::numeric,0))
     or (coalesce((w.watch->>'link')::boolean,false)=false and
       (w.watch->>'reboundCents')::numeric<coalesce((s->>'lightningPlasmaMinReboundCents')::numeric,0))
     or (coalesce((w.watch->>'link')::boolean,false)=false and
       (w.watch->>'upwardTicks')::int<coalesce((s->>'lightningPlasmaMinUpwardTicks')::int,0))
     or w.watch->>'independentRecovery' is distinct from 'true'
     or w.watch->>'authorization' is distinct from 'VALID_SHADOW_HARD_STOP'
     or w.watch->>'parentConcept' is distinct from 'Athena Exclamation'
     or w.watch->>'ticker' is distinct from NEW.ticker
     or w.watch->>'eventTicker' is distinct from NEW.event_ticker
     or p.concept_name is distinct from 'Athena Exclamation'
     or p.execution_class is distinct from 'SHADOW_SAINT'
     or p.archived is distinct from false or p.status is distinct from 'closed'
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
   then raise exception 'lp_independent_durable_parent_or_watch_invalid';end if;
   return NEW;
 end if;
 stamp:=NEW.entry_config->'lightningPlasmaScaleIn';
 if stamp->>'version' is distinct from '${LP_CONTINUATION_VERSION}'
  then raise exception 'lp_v5_capital_starlight_build_required';end if;
 select value into s from sag_settings where key='runtime' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for update;
 select * into a from sag_lp_continuation_v5 where parent_entry_id=NEW.source_trade_id for update;
 if coalesce(s->>'engineActive','false')<>'true' or s->>'lightningPlasmaEnabled'<>'true'
  or NEW.system_name is distinct from s->>'systemName'
  or NEW.owner_id is distinct from s->>'ownerId' or NEW.mode is distinct from s->>'mode'
  or (NEW.mode='LIVE' and s->>'liveArmed'<>'true')
  or not sag_lp_v5_parent_eligible(p,a,s)
  or p.ticker is distinct from NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
 then raise exception 'lp_v5_parent_or_operator_ineligible';end if;
 if stamp->>'parentStarlightId' is distinct from p.id
  or (stamp->>'parentAuthorityRevision')::bigint is distinct from a.revision
  or (stamp->>'parentEntryPriceCents')::numeric is distinct from p.entry_price_cents::numeric
  or (stamp->>'resetTimestampMs')::bigint is distinct from p.shadow_epoch
  or (stamp->>'thresholdCents')::numeric is distinct from (s->>'lightningPlasmaStarlightScaleInCents')::numeric
 then raise exception 'lp_v5_stale_parent_or_settings';end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 q:=NEW.entry_config->'finalEntryConfirmation';
 select * into obs from sag_lp_v5_observations where parent_entry_id=p.id for update;
 if not coalesce(q->>'ok'='true'
  and (q->>'quoteAtMs')::bigint between greatest(p.opened_at_ms,at_ms-5000) and at_ms
  and (q->>'bidCents')::numeric-p.entry_price_cents>=(stamp->>'thresholdCents')::numeric
  and (stamp->>'thresholdCents')::numeric>0
  and (q->>'askCents')::numeric>=(q->>'bidCents')::numeric
  and NEW.entry_price_cents between (s->>'lightningPlasmaMinEntryCents')::numeric
                                  and (s->>'lightningPlasmaMaxEntryCents')::numeric
  and NEW.count>0 and NEW.remaining_count=NEW.count
  and ((NEW.mode='SIMULATION' and NEW.status='open' and NEW.entry_client_order_id is null)
    or (NEW.mode='LIVE' and NEW.status='entry_pending' and nullif(NEW.entry_client_order_id,'') is not null)),false)
 then raise exception 'lp_v5_final_signal_or_execution_invalid';end if;
 if (coalesce((s->>'lightningPlasmaMinCrashCents')::numeric,0)>0
     or coalesce((s->>'lightningPlasmaMinReboundCents')::numeric,0)>0
     or coalesce((s->>'lightningPlasmaMinUpwardTicks')::int,0)>0)
  and (obs.parent_entry_id is null or obs.quote_at_ms<>(q->>'quoteAtMs')::bigint
    or obs.crash_depth<coalesce((s->>'lightningPlasmaMinCrashCents')::numeric,0)
    or obs.rebound_cents<coalesce((s->>'lightningPlasmaMinReboundCents')::numeric,0)
    or obs.upward_ticks<coalesce((s->>'lightningPlasmaMinUpwardTicks')::int,0)
    or coalesce((stamp->>'observationQuoteAtMs')::bigint,0)<>obs.quote_at_ms
    or (stamp->>'crashDepth')::numeric<>obs.crash_depth::numeric
    or (stamp->>'reboundCents')::numeric<>obs.rebound_cents::numeric
    or (stamp->>'upwardTicks')::int<>obs.upward_ticks)
 then raise exception 'lp_v5_own_crash_rebound_ticks_invalid';end if;
 aurora:=case when NEW.mode='LIVE' then NEW.entry_config#>'{auroraPending,preflight}' else NEW.entry_config->'aurora' end;
 if not coalesce(aurora->>'version'='${AURORA_EXECUTION.version}'
  and aurora->>'policyRevision'='${AURORA_EXECUTION.policyRevision}'
  and aurora->>'frozen'='true' and aurora->>'ok'='true' and aurora->>'mode'=NEW.mode
  and (aurora->>'damageControlPercent')::numeric=(s->>'lightningPlasmaAuroraDamageControlPercent')::numeric
  and (aurora->>'entryPriceCents')::numeric=NEW.entry_price_cents
  and (aurora->>'originalContractCount')::int=NEW.count
  and coalesce(NEW.entry_config#>>'{freezingCoffin,enabled}','false')<>'true'
  and (NEW.mode<>'LIVE' or NEW.entry_config#>>'{auroraPending,exactFillRequired}'='true'),false)
 then raise exception 'lp_v5_own_aurora_required';end if;
 select count(*) into seats from sag_entries where system_name=NEW.system_name
  and owner_id=NEW.owner_id and mode=NEW.mode and concept_name='Lightning Plasma'
  and source_trade_id=NEW.source_trade_id and execution_class<>'SHADOW_SAINT'
  and not(status='rejected' and remaining_count=0);
 if seats>=greatest(1,least(20,coalesce((s->>'lightningPlasmaMultiply')::int,1)))
  then raise exception 'lp_v5_multiply_full';end if;
 return NEW;
end $$;
-- V4 table persists for existing records; only the V5 insert guard remains.
-- V4 has no new admission rights. PostgreSQL fires ALL BEFORE INSERT
-- triggers, so retaining V4 here would reject the independent Athena route.
drop trigger if exists sag_lp_v4_entry_guard on sag_entries;
drop trigger if exists sag_lp_v5_entry_guard on sag_entries;
create trigger sag_lp_v5_entry_guard before insert on sag_entries
 for each row execute function sag_lp_v5_child_admission();
`;
