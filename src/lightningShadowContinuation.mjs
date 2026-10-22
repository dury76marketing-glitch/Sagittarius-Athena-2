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
export const LP_CONTINUATION_VERSION='LP-V4-VIRTUAL-STARLIGHT';
export const LP_TERMINAL_STATES=Object.freeze(['REVOKED','MARKET_TERMINAL']);
const same=(a,b)=>String(a??'')===String(b??'');
const finite=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x));
export function lightningParentProof(e){return {...capitalParentProof(e),
  entryHash:e.shadowEntryHash||null,virtualProtocol:e.entryConfig?.starlightShadow?.version||null,
  closeProofHash:e.shadowState?.closeProofHash||null};}
export function lightningClosedProfitProof(e){
  const p=e?.shadowState?.closeProof;
  if(!e || !isShadowSaintEntry(e) || e.status!=='closed' || Number(e.remainingCount)!==0
    || !Number.isSafeInteger(Number(e.count))||Number(e.count)<1
    ||Number(e.exitFilledCount)!==Number(e.count)||!(Number(e.closedAtMs)>0)
    ||!(Number(e.pnlCents)>0)||!LP_PROFIT_EXIT_REASONS.includes(e.closeReason)
    ||e.entryOrderId||e.entryClientOrderId||e.exitOrderId||e.exitClientOrderId
    ||![e.entryPriceCents,e.entryFeeCents,e.exitFeeCents,e.exitNotionalCents].every(finite)
    ||!p||p.version!==SHADOW_PROTOCOL||p.parentEntryId!==e.id||p.entryHash!==e.shadowEntryHash
    ||p.brokerOrderAuthority!==false||p.full!==true||p.filled!==Number(e.count)||p.count!==Number(e.count)
    ||p.closeReason!==e.closeReason||p.closedAtMs!==Number(e.closedAtMs)
    ||p.pnlCents!==Number(e.pnlCents)||p.exitFeeCents!==Number(e.exitFeeCents)
    ||Math.abs(p.exitPriceCents*p.count-Number(e.exitNotionalCents))>1e-7
    ||!sameShadowScope(p.scope,{...e,resetEpoch:e.shadowEpoch})
    ||Number(p.expectedRevision)+1!==Number(e.shadowRevision)
    ||authorityHash(p)!==e.shadowState.closeProofHash)return false;
  const net=Number(e.exitNotionalCents)-Number(e.entryPriceCents)*Number(e.count)
    -Number(e.entryFeeCents)-Number(e.exitFeeCents);
  return net>0&&Math.abs(net-Number(e.pnlCents))<=1e-6;
}
export function lightningParentEligibility(parent,settings={}, {ticker=null,strictScope=true}={}){
  const e=parent||{},a=e.lpContinuation;
  const fail=reason=>({ok:false,reason});
  if(e.conceptName!=='Crash Recovery Hunter')return fail('not_starlight');
  if(!isShadowSaintEntry(e)||e.executionClass!=='SHADOW_SAINT'
    ||e.entryConfig?.executionClass!=='SHADOW_SAINT')return fail('lp_v4_verified_virtual_parent_required');
  if(e.entryConfig?.shadowSaint?.version!==SHADOW_PROTOCOL
    ||e.entryConfig?.starlightShadow?.version!==STARLIGHT_SHADOW_VERSION
    ||!verifyAthenaFireCommandHash(e.entryConfig.starlightShadow)
    ||!e.shadowEntryHash||e.shadowEntryHash!==shadowEntryHash(e)
    ||e.entryOrderId||e.entryClientOrderId||e.exitOrderId||e.exitClientOrderId)
    return fail('lp_v4_virtual_parent_integrity_invalid');
  if(String(e.side||e.entryConfig?.side||'YES').toUpperCase()!=='YES')return fail('lp_parent_outcome_changed');
  if(strictScope){
    for(const key of ['systemName','ownerId','mode'])if(!settings[key]||!same(e[key],settings[key]))return fail('lp_parent_scope_changed');
    if(!['LIVE','SIMULATION'].includes(e.mode)||!(Number(e.openedAtMs)>0)
      ||Number(e.openedAtMs)<Number(settings.resetTimestampMs||0)
      ||Number(e.shadowEpoch)!==Number(settings.resetTimestampMs||0))return fail('lp_parent_reset_changed');
  }
  if(ticker!==null&&!same(e.ticker,ticker))return fail('lp_parent_ticker_changed');
  if(!a)return fail('lp_no_virtual_parent_continuation_proof');
  if(a.version!==LP_CONTINUATION_VERSION||!same(a.parentEntryId,e.id)||!same(a.ticker,e.ticker)
    ||!same(a.eventTicker,e.eventTicker)||!same(a.systemName,e.systemName)||!same(a.ownerId,e.ownerId)||!same(a.mode,e.mode)
    ||Number(a.originalEntryPriceCents)!==Number(e.entryPriceCents)||Number(a.originalOpenedAtMs)!==Number(e.openedAtMs)
    ||Number(a.resetTimestampMs)!==Number(e.shadowEpoch)||!Number.isSafeInteger(Number(a.revision))||Number(a.revision)<1)
    return fail('lp_parent_authority_identity_changed');
  if(LP_TERMINAL_STATES.includes(a.state))return fail(a.reason||'lp_parent_permanently_terminated');
  if(e.archived===true)return fail('lp_parent_archived');
  if(authorityHash(a.proof)!==authorityHash(lightningParentProof(e)))return fail('lp_parent_proof_revision_changed');
  if(e.status==='open'&&a.state==='OPEN'&&Number(e.remainingCount)>0&&Number(e.remainingCount)===Number(e.count)&&Number(e.exitFilledCount||0)===0)
    return {ok:true,kind:'OPEN_ELIGIBLE',revision:Number(a.revision),referenceEntryCents:Number(e.entryPriceCents)};
  if(e.status==='closed'&&a.state==='CLOSED_PROFIT'&&a.safetyExitSeen!==true&&lightningClosedProfitProof(e))
    return {ok:true,kind:'CLOSED_PROFIT_ELIGIBLE',revision:Number(a.revision),referenceEntryCents:Number(e.entryPriceCents)};
  return fail('lp_closed_virtual_parent_not_confirmed_profit');
}
export function mapLightningAuthority(r){
  if(!r?.parent_entry_id)return null;
  return {version:LP_CONTINUATION_VERSION,parentEntryId:r.parent_entry_id,systemName:r.system_name,
    ownerId:r.owner_id,mode:r.mode,resetTimestampMs:Number(r.reset_epoch),ticker:r.ticker,eventTicker:r.event_ticker,
    side:'YES',originalEntryPriceCents:Number(r.entry_price_cents),originalOpenedAtMs:Number(r.opened_at_ms),
    state:r.state,revision:Number(r.revision),safetyExitSeen:r.safety_exit_seen===true,proof:r.proof||{},
    reason:r.terminal_reason||null,enrolledAtMs:Number(r.enrolled_at_ms),updatedAtMs:Number(r.updated_at_ms)};
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
 if stamp->>'version' is distinct from '${LP_CONTINUATION_VERSION}' then raise exception 'lp_v4_build_required_for_new_capital';end if;
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
