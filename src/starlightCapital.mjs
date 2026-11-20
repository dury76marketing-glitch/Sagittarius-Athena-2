import {verifiedLiveCapitalParentEntryFill} from './liveParentEntryProof.mjs';
/** Starlight Capital V1. New money can enter ONLY through a durable Athena
 * shadow hard-stop and an EXECUTING Starlight watch in the same clone/scope.
 * Historical APS2 shadow rows are unchanged. No direct/public INSERT grant.
 */
import {isShadowSaintEntry, AURORA_EXECUTION} from './doctrine.mjs';
import {createHash} from 'node:crypto';
import {SHADOW_PROTOCOL,executionSettingsHashMatches} from './shadowProtocol.mjs';
import {starlightAdmissionPolicy} from './shadowStarlight.mjs';
import {athenaStarlightTriggerDecision} from './athenaStarlightTrigger.mjs';
export const STARLIGHT_CAPITAL_VERSION='SC1-REAL-STARLIGHT-V1';
// R15: the original (generation zero) entry ID is retained byte-for-byte.
// After the database has proven and durably rearmed a never-transmitted LIVE
// attempt, a monotonically increasing generation is part of the NEXT ID.
// An R14 watch already rearmed without this new field is generation one;
// it may not try its original, rejected primary key again.
export function starlightNoSendRetryGeneration(w={}){
  if(!w||typeof w!=='object')return null;
  const childIds=Array.isArray(w.rearmedNoSubmitChildIds)?w.rearmedNoSubmitChildIds:[];
  const proofIds=Array.isArray(w.rearmedNoSubmitProofIds)?w.rearmedNoSubmitProofIds:[];
  const ids=childIds.length?childIds:proofIds;
  const hasProof=Number.isSafeInteger(Number(w.rearmedNoSubmitAtMs))
    &&Number(w.rearmedNoSubmitAtMs)>0
    &&ids.length>=1&&ids.length<=64
    &&ids.every(id=>typeof id==='string'&&id.length>0);
  const hasExplicit=Object.hasOwn(w,'noSendRetryGeneration');
  const generation=hasExplicit?w.noSendRetryGeneration:hasProof?1:0;
  if(typeof generation!=='number'||!Number.isSafeInteger(generation)
    ||generation<0||generation>64)return null;
  if(generation>0&&(w.mode!=='LIVE'||!hasProof))return null;
  if(generation===0&&hasProof)return null;
  return generation;
}
export function starlightLocalNoSendProof(c={}){
  const p=c?.dispatchProof;
  return Boolean(p?.version==='HC2-R1-DISPATCH'
    &&p.submitted===false &&typeof p.reason==='string'
    &&p.reason.length>0&&p.reason.length<=180);
}
// R11: the same source-backed pre-dispatch denial classification is used by
// the worker and the PostgreSQL release producer. A denial reason never proves
// that a submitted/ambiguous broker intent is safe to retry.
export const STARLIGHT_PRE_DISPATCH_NO_SEND_REASONS=Object.freeze([
  'athena_starlight_quote_stale_or_pre_stop',
  'athena_starlight_below_trigger',
  'athena_starlight_trigger_setting_invalid',
  'athena_starlight_shadow_stop_not_verified',
  'no_executable_ask',
  'market_or_book_invalid',
  'fee_budget_exhausts_aurora_loss_envelope',
  'starlight_fresh_quote_missing',
  'starlight_unpersisted_price_change',
  'unpersisted_price_change',
  'quote_stale_or_future',
  'live_exchange_balance_unavailable',
  'sc1_entry_execution_or_own_aurora_invalid'
]);
export function starlightPreDispatchNoSendReason(reason){
  return STARLIGHT_PRE_DISPATCH_NO_SEND_REASONS.includes(String(reason||''));
}
// Share the strict rejected-child evidence contract across the two existing
// transactional rearm paths. Never infer no-send from a missing order ID.
export function starlightCertifiedRejectedNoSendChild(child,w){
  const c=child?.entry_config||{},rec=c.starlightRecovery||{},stamp=c.starlightCapital||{};
  return child?.status==='rejected'&&starlightLocalNoSendProof(c)
    &&['sc1_intent_receipted_or_changed','live_entry_not_dispatched'].includes(child.close_reason)
    &&child.archived===false
    &&child.execution_class==='CAPITAL'&&c.executionClass==='CAPITAL'
    &&String(child.system_name)===String(w.systemName)
    &&String(child.owner_id)===String(w.ownerId)&&child.mode==='LIVE'
    &&String(child.ticker)===String(w.ticker)
    &&String(child.event_ticker)===String(w.eventTicker)
    &&String(rec.parentEntryId)===String(w.parentEntryId)
    &&String(rec.authorizationId)===String(w.authorizationId)
    &&Number(rec.resetEpoch)===Number(w.resetEpoch)
    &&stamp.version===STARLIGHT_CAPITAL_VERSION
    &&Number(stamp.resetTimestampMs)===Number(w.resetEpoch)
    &&Number.isSafeInteger(Number(stamp.seat))&&Number(stamp.seat)>=1
    &&Number(stamp.seat)<=Number(w.maximumSeats)
    &&Number.isFinite(Number(child.count))&&Number(child.count)>0
    &&Number(child.remaining_count)===0
    &&typeof child.entry_client_order_id==='string'&&child.entry_client_order_id.length>0
    &&child.entry_order_id==null&&child.exit_order_id==null
    &&child.exit_client_order_id==null
    &&Number(child.entry_fee_cents||0)===0&&Number(child.exit_fee_cents||0)===0
    &&Number(child.exit_filled_count||0)===0&&Number(child.exit_notional_cents||0)===0;
}
export function starlightCapitalEntryId(snapshot={}){
  const fields=[snapshot.systemName,snapshot.ownerId,snapshot.mode,snapshot.resetEpoch,snapshot.parentEntryId];
  if(fields.some(v=>v==null||String(v)===''))throw new Error('starlight_scoped_parent_identity_required');
  const seat=Math.max(1,Math.floor(Number(snapshot.stackIndex)||1));
  if(seat>1)fields.push(`seat:${seat}`);
  const generation=starlightNoSendRetryGeneration(snapshot);
  if(generation===null)throw new Error('sc1_retry_generation_or_no_send_proof_invalid');
  if(generation>0)fields.push(`verified-no-send-retry:${generation}`);
  return 'SE2R5-'+createHash('sha256').update(JSON.stringify(fields.map(String))).digest('hex').slice(0,32);
}
// Preserve SAFE historical rejected children across increasing retry
// generations. A child from an older generation is valid only when the last
// committed watch explicitly listed that exact ID as verified no-send.
// Current-generation children must be fresh to the claim, individually
// rejected with affirmative never-submitted proof, and in the correct scope.
// This prevents R11's repair from creating a generation-2 deadlock while
// refusing every unknown or ambiguous historical/active broker intent.
export function starlightNoSendChildrenForRearm(w,children=[]){
  const generation=starlightNoSendRetryGeneration(w);
  if(generation===null||!Array.isArray(children)||children.length>64)return {ok:false,reason:'invalid_generation_or_count'};
  const priorIds=new Set(Array.isArray(w.rearmedNoSubmitChildIds)?w.rearmedNoSubmitChildIds.map(String):[]);
  const claimAt=Number(w.claimAtMs||0),seenIds=new Set(),current=[];
  for(const child of children){
    const id=String(child?.id||'');
    if(!id||seenIds.has(id)||!starlightCertifiedRejectedNoSendChild(child,w))
      return {ok:false,reason:'unverified_or_duplicated_child'};
    seenIds.add(id);
    const c=child.entry_config||{},childGeneration=c.starlightCapital?.noSendRetryGeneration
      ??c.starlightRecovery?.noSendRetryGeneration;
    if(typeof childGeneration!=='number'||!Number.isSafeInteger(childGeneration)
      ||childGeneration<0||childGeneration>generation)
      return {ok:false,reason:'invalid_child_generation'};
    if(childGeneration<generation){
      if(!priorIds.has(id))return {ok:false,reason:'historical_child_not_prior_certified'};
    }else{
      if(claimAt>0 && Number(child.opened_at_ms||0)<claimAt)
        return {ok:false,reason:'current_child_predates_claim'};
      current.push(child);
    }
  }
  return {ok:true,reason:'verified_scoped_no_send_children',current,allIds:[...seenIds]};
}
const matches=(a,b)=>String(a??'')===String(b??'');
export function starlightCapitalAdmission({entry,settings,authority,watch}={}){
  const c=entry?.entryConfig||{},stamp=c.starlightCapital||{},rec=c.starlightRecovery||{};
  const fail=reason=>({ok:false,reason});
  if(!entry||entry.conceptName!=='Crash Recovery Hunter'||isShadowSaintEntry(entry)
    ||entry.executionClass!=='CAPITAL'||c.executionClass!=='CAPITAL')return fail('sc1_capital_starlight_only');
  if(stamp.version!==STARLIGHT_CAPITAL_VERSION||settings?.starlightExtinctionRealTradeEnabled!==true
    ||settings?.crashRecoveryHunterEnabled!==true||settings?.engineActive!==true)return fail('sc1_real_switch_or_card_disabled');
  if(!['LIVE','SIMULATION'].includes(entry.mode)||!matches(entry.mode,settings.mode)
    ||!matches(entry.ownerId,settings.ownerId)||!matches(entry.systemName,settings.systemName))return fail('sc1_scope_changed');
  if(entry.mode==='LIVE'&&(settings.liveArmed!==true||entry.status!=='entry_pending'
    ||!entry.entryClientOrderId||entry.entryOrderId))return fail('sc1_live_intent_unarmed_or_receipted');
  if(entry.mode==='SIMULATION'&&(entry.status!=='open'||entry.entryClientOrderId||entry.entryOrderId))return fail('sc1_sim_execution_invalid');
  if(Number(rec.resetEpoch)!==Number(settings.resetTimestampMs||0)
    ||Number(stamp.resetTimestampMs)!==Number(settings.resetTimestampMs||0)
    ||!executionSettingsHashMatches(c.executionSettingsHash,settings,'Crash Recovery Hunter'))return fail('sc1_settings_or_reset_changed');
  if(!authority||authority.proofHash!==rec.shadowProofHash||!authority.parent
    ||authority.parent.conceptName!=='Athena Exclamation'||authority.parent.status!=='closed'
    ||authority.parent.closeReason!=='hard_stop_loss'||!(Number(authority.parent.pnlCents)<0)
    ||isShadowSaintEntry(authority.parent)!==true)return fail('sc1_athena_stop_unverified');
  if(String(rec.parentEntryId)!==String(authority.parent.id)||String(entry.sourceTradeId)!==String(authority.parent.id)
    ||!matches(entry.ticker,authority.parent.ticker)||!matches(entry.eventTicker,authority.parent.eventTicker))return fail('sc1_parent_or_market_changed');
  const w=watch||authority.watch;
  if(w?.status!=='EXECUTING'||Number(w.revision)!==Number(rec.revision)
    ||!matches(w.authorizationId,rec.authorizationId)
    ||w.virtualGroupVersion!==STARLIGHT_CAPITAL_VERSION
    ||!matches(w.ticker,entry.ticker)||!matches(w.parentEntryId,entry.sourceTradeId)
    ||!executionSettingsHashMatches(w.groupSettingsHash,settings,'Crash Recovery Hunter'))return fail('sc1_watch_claim_invalid');
  const target=Number(w.maximumSeats),seat=Number(stamp.seat);
  if(!Number.isSafeInteger(seat)||seat<1||!Number.isSafeInteger(target)||target<1
    ||seat>target||target>Math.min(20,Number(settings.crashRecoveryHunterMultiply)||1)
    ||Number(stamp.maximumSeats)!==target)return fail('sc1_seat_out_of_budget');
  const generation=starlightNoSendRetryGeneration(w);
  const reportedGeneration=v=>v?.noSendRetryGeneration==null?0:v.noSendRetryGeneration;
  if(generation===null ||reportedGeneration(rec)!==generation
    ||reportedGeneration(stamp)!==generation
    ||entry.id!==starlightCapitalEntryId({...w,stackIndex:seat}))
    return fail('sc1_retry_identity_or_proof_changed');
  if(!Number.isFinite(Number(entry.count))||Number(entry.count)<1||!(Number(entry.entryPriceCents)>0)
    ||Number(entry.entryPriceCents)>=100
    ||Number(entry.count)*Number(entry.entryPriceCents)>Number(settings.crashRecoveryStakeCents)+1e-8)
    return fail('sc1_stake_or_quantity_invalid');
  const a=entry.mode==='LIVE'?c.auroraPending?.preflight:c.aurora;
  if(!a||a.version!==AURORA_EXECUTION.version||a.policyRevision!==AURORA_EXECUTION.policyRevision
    ||a.ok!==true||a.frozen!==true||a.mode!==entry.mode||Number(a.originalContractCount)!==Number(entry.count)
    ||Number(a.entryPriceCents)!==Number(entry.entryPriceCents)
    ||Number(a.damageControlPercent)!==Number(settings.crashRecoveryHunterAuroraDamageControlPercent)
    ||c.freezingCoffin||entry.mode==='LIVE'&&c.auroraPending?.exactFillRequired!==true)
    return fail('sc1_independent_aurora_invalid');
  const admitted=starlightAdmissionPolicy({settings,watch:w,entry,snapshot:rec,aurora:a});
  if(!admitted.ok)return admitted;
  const rise=athenaStarlightTriggerDecision({settings,parent:authority.parent,watch:w,
    quote:c.entryExecutionWitness?.quote,stamp:rec.athenaTrigger,requireStamp:true});
  if(!rise.ok)return rise;
  if(c.finalEntryConfirmation?.ok!==true)return fail('sc1_fresh_entry_confirmation_required');
  return {ok:true,reason:'sc1_verified_capital_starlight',seat};
}
export const STARLIGHT_CAPITAL_SQL=`
-- This new guard is invoked from the APS2 entry fence for CAPITAL Starlight.
-- The existing virtual-entry validator continues to handle SHADOW_SAINT.
create or replace function sag_sc1_authorize_capital_starlight() returns trigger language plpgsql as $$
declare s jsonb; rec jsonb; stamp jsonb; parent sag_entries; w sag_starlight_recovery_v1;
  proof sag_shadow_stops_v3; a jsonb; witness jsonb; quote jsonb;
  at_ms bigint; seats int; maximum int; retry_gen int;
begin
 if NEW.concept_name<>'Crash Recovery Hunter' or NEW.execution_class<>'CAPITAL'
  or NEW.entry_config->>'executionClass'<>'CAPITAL' then
  raise exception 'sc1_capital_starlight_identity_required';end if;
 select value into s from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'starlightRecovery';stamp:=NEW.entry_config->'starlightCapital';
 if coalesce(s->>'engineActive','false')<>'true' or s->>'crashRecoveryHunterEnabled'<>'true'
  or s->>'starlightExtinctionRealTradeEnabled'<>'true'
  or NEW.system_name is distinct from s->>'systemName' or NEW.owner_id is distinct from s->>'ownerId'
  or NEW.mode is distinct from s->>'mode' or NEW.mode not in ('LIVE','SIMULATION')
  or (NEW.mode='LIVE' and (s->>'liveArmed'<>'true' or NEW.status<>'entry_pending'
     or nullif(NEW.entry_client_order_id,'') is null or NEW.entry_order_id is not null))
  or (NEW.mode='SIMULATION' and (NEW.status<>'open' or NEW.entry_client_order_id is not null))
  or coalesce((rec->>'resetEpoch')::bigint,-1)<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or coalesce((stamp->>'resetTimestampMs')::bigint,-1)<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or stamp->>'version'<>'${STARLIGHT_CAPITAL_VERSION}'
  or rec->>'shadowProtocol'<>'${SHADOW_PROTOCOL}'
  or NEW.entry_config#>>'{finalEntryConfirmation,ok}'<>'true'
 then raise exception 'sc1_scope_mode_or_switch_invalid';end if;
 select * into parent from sag_entries where id=NEW.source_trade_id for share;
 select * into proof from sag_shadow_stops_v3 where parent_entry_id=NEW.source_trade_id;
 select * into w from sag_starlight_recovery_v1 where system_name=NEW.system_name
  and owner_id=NEW.owner_id and mode=NEW.mode
  and reset_epoch=coalesce((s->>'resetTimestampMs')::bigint,0)
  and parent_entry_id=NEW.source_trade_id and authorization_id=rec->>'authorizationId' for update;
 if parent.id is null or parent.concept_name<>'Athena Exclamation'
  or parent.execution_class<>'SHADOW_SAINT' or parent.archived
  or parent.status<>'closed' or parent.close_reason<>'hard_stop_loss' or parent.pnl_cents>=0
  or parent.remaining_count<>0 or parent.shadow_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or parent.system_name<>NEW.system_name or parent.owner_id<>NEW.owner_id or parent.mode<>NEW.mode
  or parent.ticker<>NEW.ticker or parent.event_ticker is distinct from NEW.event_ticker
  or parent.shadow_entry_hash is null
  or proof.parent_entry_id is null or proof.delivery_status='DISABLED_AT_CLOSE'
  or proof.proof_hash is distinct from rec->>'shadowProofHash'
  or proof.proof->>'entryHash' is distinct from parent.shadow_entry_hash
  or proof.proof->>'authorization'<>'VALID_SHADOW_HARD_STOP'
  or (proof.proof->>'pnlCents')::numeric<>parent.pnl_cents::numeric
  or (proof.proof->>'filled')::int<>parent.count or proof.proof->>'full'<>'true'
  or proof.system_name<>NEW.system_name or proof.owner_id<>NEW.owner_id or proof.mode<>NEW.mode
  or proof.reset_epoch<>coalesce((s->>'resetTimestampMs')::bigint,0)
  or w.parent_entry_id is null or w.status<>'EXECUTING'
  or w.revision<>(rec->>'revision')::bigint or w.watch->>'shadowProofHash' is distinct from proof.proof_hash
  or w.watch->>'virtualGroupVersion'<>'${STARLIGHT_CAPITAL_VERSION}'
  or w.watch->>'groupSettingsHash' is distinct from NEW.entry_config->>'executionSettingsHash'
  or w.watch->>'ticker' is distinct from NEW.ticker
  or w.watch->>'authorizationId' is distinct from rec->>'authorizationId'
 then raise exception 'sc1_parent_stop_or_watch_proof_invalid';end if;
 maximum:=coalesce((w.watch->>'maximumSeats')::int,0);
 if maximum<1 or maximum>least(20,greatest(1,(s->>'crashRecoveryHunterMultiply')::int))
  or (stamp->>'maximumSeats')::int<>maximum
  or (stamp->>'seat')::int not between 1 and maximum
 then raise exception 'sc1_seat_identity_invalid';end if;
 -- Match the durable watch's generation without modifying any historical
 -- generation-zero seat or schema. Legacy R14 verified rearm markers infer 1.
 if w.watch ? 'noSendRetryGeneration' then
   if jsonb_typeof(w.watch->'noSendRetryGeneration')<>'number'
     then raise exception 'sc1_retry_generation_invalid';end if;
   retry_gen:=(w.watch->>'noSendRetryGeneration')::int;
 elsif coalesce((w.watch->>'rearmedNoSubmitAtMs')::bigint,0)>0 then
   retry_gen:=1;
 else
   retry_gen:=0;
 end if;
 if retry_gen<0 or retry_gen>64
   or coalesce((rec->>'noSendRetryGeneration')::int,0)<>retry_gen
   or coalesce((stamp->>'noSendRetryGeneration')::int,0)<>retry_gen
   or (retry_gen>0 and (NEW.mode<>'LIVE'
      or coalesce((w.watch->>'rearmedNoSubmitAtMs')::bigint,0)<=0
      or not (
        (jsonb_typeof(w.watch->'rearmedNoSubmitChildIds')='array'
          and jsonb_array_length(w.watch->'rearmedNoSubmitChildIds') between 1 and 64)
        or (jsonb_typeof(w.watch->'rearmedNoSubmitProofIds')='array'
          and jsonb_array_length(w.watch->'rearmedNoSubmitProofIds') between 1 and 64)
      )))
   or (retry_gen=0 and coalesce((w.watch->>'rearmedNoSubmitAtMs')::bigint,0)>0)
 then raise exception 'sc1_retry_generation_or_no_send_proof_invalid';end if;
 select count(*) into seats from sag_entries where system_name=NEW.system_name
  and owner_id=NEW.owner_id and mode=NEW.mode and concept_name='Crash Recovery Hunter'
  and source_trade_id=NEW.source_trade_id and execution_class='CAPITAL'
  and not(status='rejected' and remaining_count=0);
 if seats>=maximum or exists(select 1 from sag_entries where system_name=NEW.system_name
  and owner_id=NEW.owner_id and mode=NEW.mode and concept_name='Crash Recovery Hunter'
  and source_trade_id=NEW.source_trade_id and execution_class='CAPITAL'
  and entry_config#>>'{starlightCapital,seat}'=stamp->>'seat'
  and not(status='rejected' and remaining_count=0))
 then raise exception 'sc1_capital_seat_already_committed';end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 witness:=NEW.entry_config->'entryExecutionWitness';quote:=witness->'quote';
 a:=case when NEW.mode='LIVE' then NEW.entry_config#>'{auroraPending,preflight}' else NEW.entry_config->'aurora' end;
 if not coalesce(NEW.count>0 and NEW.remaining_count=NEW.count
  and NEW.entry_price_cents between 1 and 99
  and NEW.entry_price_cents*NEW.count<=(s->>'crashRecoveryStakeCents')::numeric
  and quote->>'ticker'=NEW.ticker and quote->>'eventTicker'=NEW.event_ticker
  and quote->>'status'='active' and coalesce(quote->>'result','')=''
  and coalesce(quote->>'bookInvalid','false')<>'true'
  and coalesce((quote#>>'{quoteObservation,receivedAtMs}')::bigint,0)>=parent.closed_at_ms
  and coalesce((quote#>>'{quoteObservation,receivedAtMs}')::bigint,0)<=at_ms+2000
  and at_ms-coalesce((quote#>>'{quoteObservation,receivedAtMs}')::bigint,0)<=least(5000,coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  and coalesce((quote#>>'{quoteObservation,receivedAtMs}')::bigint,0)-(quote->>'quoteAtMs')::bigint<=least(5000,coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  and (quote->>'quoteAtMs')::bigint>=parent.closed_at_ms-least(5000,coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  and (quote->>'quoteAtMs')::bigint<=at_ms
  and at_ms-(quote->>'quoteAtMs')::bigint<=least(5000,coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  and (coalesce(w.watch->>'lastQuoteEpoch','')='' or coalesce(quote#>>'{quoteObservation,epoch}','')=''
    or (quote#>>'{quoteObservation,epoch}'=w.watch->>'lastQuoteEpoch'
        and (coalesce((w.watch->>'lastQuoteRevision')::numeric,0)<=0
          or coalesce((quote#>>'{quoteObservation,revision}')::numeric,0)>=(w.watch->>'lastQuoteRevision')::numeric)
        and not (coalesce((quote#>>'{quoteObservation,revision}')::numeric,0)=(w.watch->>'lastQuoteRevision')::numeric
          and coalesce((w.watch->>'lastBidCents')::numeric,0)>0
          and (quote->>'yesBid')::numeric is distinct from (w.watch->>'lastBidCents')::numeric)
        and not (coalesce((quote#>>'{quoteObservation,revision}')::numeric,0)=(w.watch->>'lastQuoteRevision')::numeric
          and coalesce((w.watch->>'lastAskCents')::numeric,0)>0
          and (quote->>'yesAsk')::numeric is distinct from (w.watch->>'lastAskCents')::numeric))
    or (quote#>>'{quoteObservation,epoch}' is distinct from w.watch->>'lastQuoteEpoch'
        and coalesce(rec->>'liveEpoch','')<>''
        and quote#>>'{quoteObservation,epoch}'=rec->>'liveEpoch'
        and (coalesce((w.watch->>'lastQuoteAtMs')::numeric,0)<=0
          or (quote->>'quoteAtMs')::bigint>=(w.watch->>'lastQuoteAtMs')::bigint)))
  and (coalesce(w.watch->>'lastQuoteEpoch','')='' and coalesce((w.watch->>'lastQuoteRevision')::numeric,0)<=0
    or coalesce(quote#>>'{quoteObservation,epoch}','')<>'' and coalesce((quote#>>'{quoteObservation,revision}')::numeric,0)>0)
  and ((rec->>'link'='true' and w.watch->>'link'='true'
      and s->>'crashRecoveryHunterLinkEnabled'='true')
    or (coalesce(rec->>'link','false')='false' and coalesce(w.watch->>'link','false')='false'
      and NEW.entry_price_cents between (s->>'crashRecoveryMinEntryCents')::numeric
                                     and (s->>'crashRecoveryMaxEntryCents')::numeric
      and (w.watch->>'stopPriceCents')::numeric between (s->>'crashRecoveryMinEntryCents')::numeric
                                              and (s->>'crashRecoveryMaxEntryCents')::numeric))
  and a->>'version'='${AURORA_EXECUTION.version}'
  and a->>'policyRevision'='${AURORA_EXECUTION.policyRevision}'
  and a->>'ok'='true' and a->>'frozen'='true' and a->>'mode'=NEW.mode
  and (a->>'entryPriceCents')::numeric=NEW.entry_price_cents
  and (a->>'originalContractCount')::int=NEW.count
  and (a->>'damageControlPercent')::numeric=(s->>'crashRecoveryHunterAuroraDamageControlPercent')::numeric
  and (NEW.mode<>'LIVE' or NEW.entry_config#>>'{auroraPending,exactFillRequired}'='true')
  and coalesce(NEW.entry_config#>>'{freezingCoffin,enabled}','false')<>'true',false)
 then raise exception 'sc1_entry_execution_or_own_aurora_invalid';end if;
 return NEW;
end $$;
-- The APS2 guard's explicit real-Starlight branch skips the virtual validator.
-- The SC1 trigger below independently validates each capital entry.
drop trigger if exists sag_sc1_capital_insert_guard on sag_entries;
create trigger sag_sc1_capital_insert_guard before insert on sag_entries
 for each row when (NEW.concept_name='Crash Recovery Hunter' and NEW.execution_class='CAPITAL')
 execute function sag_sc1_authorize_capital_starlight();
create unique index if not exists sag_sc1_capital_seat_identity on sag_entries
 (system_name,owner_id,mode,source_trade_id,(entry_config#>>'{starlightCapital,seat}'))
 where concept_name='Crash Recovery Hunter' and execution_class='CAPITAL'
 and not(status='rejected' and remaining_count=0);
`;

/** R15-R5: a capital seat is funded only with a confirmed open (LIVE also needs fill proof).
 * entry_pending, rejected, and missing proof are not a funded opening. */
export function starlightCapitalSeatFunded(child){
  if(!child || child.status==='entry_pending' || child.status==='rejected')return false;
  if(!['open','closed','exit_pending','pending_recovery'].includes(String(child.status||'')))return false;
  if(child.mode==='LIVE')return verifiedLiveCapitalParentEntryFill(child).ok===true;
  return true;
}
