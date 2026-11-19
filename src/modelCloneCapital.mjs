/** R31 MegaWave research candidate — independent Starlight-derived LP/Arrow
 * capital admission. The cloned route must not inherit native LP-V5/Arrow-V1
 * authority or obtain permission merely from a JSON boolean.
 * This module is NOT LIVE certified without native PostgreSQL regression.
 */
import {createHash} from 'node:crypto';
import {ATHENA_STARLIGHT_TRIGGER_VERSION,athenaStarlightTriggerDecision} from './athenaStarlightTrigger.mjs';
export const MODEL_CLONE_CAPITAL_VERSION='SC-MODEL-CLONE-V1';
export const MODEL_CLONE_CONCEPTS=Object.freeze(['Lightning Plasma','Sagittarius Arrow Recovery']);
const same=(a,b)=>String(a??'')===String(b??'');
export const MODEL_CLONE_MAX_RETRY_GENERATION=64;
// Generation zero retains its exact original identity. Later IDs are distinct
// ONLY after the preceding attempt has a durable, CAS-certified no-send.
export function modelCloneCapitalId({systemName,ownerId,mode,resetEpoch,parentEntryId,concept,seat,attemptGeneration=0}){
 const generation=Number(attemptGeneration);
 const scope=[MODEL_CLONE_CAPITAL_VERSION,systemName,ownerId,mode,resetEpoch,parentEntryId,concept,seat];
 if(scope.some(x=>x===undefined||x===null||String(x)==='') || !MODEL_CLONE_CONCEPTS.includes(concept)
   || !Number.isSafeInteger(Number(seat))||Number(seat)<1||Number(seat)>20
   ||!Number.isSafeInteger(generation)||generation<0||generation>MODEL_CLONE_MAX_RETRY_GENERATION)
   throw new Error('sc_clone_identity_invalid');
 if(generation>0)scope.push(`certified-no-send-retry:${generation}`);
 return 'SCMC-'+createHash('sha256').update(JSON.stringify(scope.map(String))).digest('hex').slice(0,36);
}
export function modelCloneCertifiedLocalNoSend(row){
 const proof=row?.entryConfig?.dispatchProof;
 return Boolean(row?.mode==='LIVE'&&row.status==='rejected'
   &&row.cloneNoSendCertified===true
   &&row.entryConfig?.starlightModelClone===true
   &&proof?.version==='HC2-R1-DISPATCH'&&proof.submitted===false
   &&typeof proof.reason==='string'&&proof.reason.length>0&&proof.reason.length<=180
   &&typeof row.entryClientOrderId==='string'&&row.entryClientOrderId.length>0
   &&!row.entryOrderId&&Number(row.remainingCount)===0
   &&Number(row.entryFeeCents||0)===0&&Number(row.exitFilledCount||0)===0
   &&Number(row.exitNotionalCents||0)===0);
}
export function modelCloneAdmission({entry,settings,authority,watch,quote,now=Date.now()}={}){
 const fail=reason=>({ok:false,reason});
 const c=entry?.entryConfig||{},stamp=c.modelCloneCapital;
 if(!entry||c.starlightModelClone!==true||!MODEL_CLONE_CONCEPTS.includes(entry.conceptName)
   ||entry.executionClass!=='CAPITAL'||c.executionClass!=='CAPITAL'||stamp?.version!==MODEL_CLONE_CAPITAL_VERSION)
   return fail('sc_clone_contract_required');
 if(!['LIVE','SIMULATION'].includes(entry.mode)||entry.mode!==settings?.mode||!same(entry.systemName,settings.systemName)
   ||!same(entry.ownerId,settings.ownerId)||settings.engineActive!==true
   ||settings.starlightExtinctionRealTradeEnabled!==true||settings.crashRecoveryHunterEnabled!==true
   ||(entry.conceptName==='Lightning Plasma'&&settings.lightningPlasmaEnabled!==true)
   ||(entry.conceptName==='Sagittarius Arrow Recovery'&&settings.sagittariusArrowEnabled!==true)
   ||(entry.mode==='LIVE'&&settings.liveArmed!==true))return fail('sc_clone_runtime_scope_invalid');
 if((entry.mode==='LIVE'&&(entry.status!=='entry_pending'||!entry.entryClientOrderId||entry.entryOrderId))
   ||(entry.mode==='SIMULATION'&&(entry.status!=='open'||entry.entryClientOrderId||entry.entryOrderId)))
   return fail('sc_clone_intent_status_invalid');
 const epoch=Number(settings.resetTimestampMs||0),seat=Number(stamp.seat),maximum=Number(settings.crashRecoveryHunterMultiply);
 const generation=Number(stamp.attemptGeneration??0);
 if(!Number.isSafeInteger(generation)||generation<0||generation>MODEL_CLONE_MAX_RETRY_GENERATION
   ||!Number.isSafeInteger(epoch)||epoch<0||!Number.isSafeInteger(seat)||seat<1||!Number.isSafeInteger(maximum)
   ||maximum<1||maximum>20||seat>maximum||Number(stamp.maximumSeats)!==maximum
   ||Number(stamp.resetEpoch)!==epoch||Number(c.resetTimestampMs)!==epoch)
   return fail('sc_clone_epoch_or_seat_invalid');
 const p=authority?.parent,w=watch||authority?.watch;
 if(!p||p.id!==entry.sourceTradeId||p.conceptName!=='Athena Exclamation'||p.executionClass!=='SHADOW_SAINT'
   ||p.status!=='closed'||p.closeReason!=='hard_stop_loss'||!(Number(p.pnlCents)<0)||p.archived===true
   ||Number(p.remainingCount)!==0||!(Number(p.count)>0)||Number(p.shadowEpoch)!==epoch
   ||!same(p.systemName,entry.systemName)||!same(p.ownerId,entry.ownerId)||!same(p.mode,entry.mode)
   ||!same(p.ticker,entry.ticker)||!same(p.eventTicker,entry.eventTicker)
   ||!(Number(p.closedAtMs)>=epoch)||Number(p.closedAtMs)>now)
   return fail('sc_clone_athena_parent_not_verified');
 if(!w||!['WATCHING','READY','EXECUTING','CONSUMED'].includes(w.status)
   ||w.parentEntryId!==p.id||w.authorizationId!==`STARLIGHT-RECOVERY:${p.id}`
   ||!same(w.systemName,entry.systemName)||!same(w.ownerId,entry.ownerId)||!same(w.mode,entry.mode)
   ||Number(w.resetEpoch)!==epoch||!same(w.ticker,entry.ticker)||!same(w.eventTicker,entry.eventTicker)
   ||!(Number(w.revision)>0)||!same(w.shadowProofHash,authority.proofHash)
   ||!same(stamp.shadowProofHash,authority.proofHash)||!same(stamp.watchId,w.authorizationId)
   ||!same(stamp.parentEntryId,p.id)||!same(stamp.concept,entry.conceptName)
   ||Number(stamp.watchRevision)!==Number(w.revision))return fail('sc_clone_durable_watch_invalid');
 const cloneId=`STARLIGHT-CLONE:${entry.conceptName}:${p.id}`;
 if(!same(stamp.cloneId,cloneId)||!Array.isArray(w.modelClones)
   ||!w.modelClones.some(x=>x.id===cloneId && x.concept===entry.conceptName))
   return fail('sc_clone_registered_model_missing');
 if(!same(stamp.positionId,entry.id)||entry.id!==modelCloneCapitalId({systemName:entry.systemName,
   ownerId:entry.ownerId,mode:entry.mode,resetEpoch:epoch,parentEntryId:p.id,
   concept:entry.conceptName,seat,attemptGeneration:generation}))
   return fail('sc_clone_position_identity_mismatch');
 if(!(Number(entry.entryPriceCents)>0)||!(Number(entry.entryPriceCents)<100)||!(Number(entry.count)>0)
   ||Number(entry.remainingCount)!==Number(entry.count)
   ||Number(entry.entryPriceCents)*Number(entry.count)>Number(settings.crashRecoveryStakeCents))
   return fail('sc_clone_quantity_or_stake_invalid');
 if(!quote||quote.ticker!==p.ticker||(quote.eventTicker||quote.ticker)!==p.eventTicker
   ||quote.status!=='active'||quote.bookInvalid||quote.result
   ||!(Number(quote.yesBid)>0)||!(Number(quote.yesAsk)>=Number(quote.yesBid))
   ||Number(quote.yesAsk)>=100
   ||!(Number(quote.quoteObservation?.receivedAtMs)>=Number(p.closedAtMs))
   ||Number(quote.quoteAtMs)<Number(p.closedAtMs)-Math.min(5000,Number(settings.infinityBreakMaximumBookAgeMs||5000))
   ||Number(quote.quoteAtMs)>now||now-Number(quote.quoteAtMs)>Math.min(5000,Number(settings.infinityBreakMaximumBookAgeMs||5000))
   ||Number(stamp.signalQuoteAtMs)!==Number(quote.quoteAtMs)
   ||(w.lastQuoteEpoch && quote.quoteObservation?.epoch && String(w.lastQuoteEpoch)===String(quote.quoteObservation.epoch)
      && Number(w.lastQuoteRevision)>0 && !(Number(quote.quoteObservation?.revision)>=Number(w.lastQuoteRevision)))
   ||(w.lastQuoteEpoch && quote.quoteObservation?.epoch && String(w.lastQuoteEpoch)===String(quote.quoteObservation.epoch)
      && Number(quote.quoteObservation?.revision)===Number(w.lastQuoteRevision)
      && Number(w.lastBidCents)>0 && Number(quote.yesBid)!==Number(w.lastBidCents))
   ||(w.lastQuoteEpoch && quote.quoteObservation?.epoch && String(w.lastQuoteEpoch)===String(quote.quoteObservation.epoch)
      && Number(quote.quoteObservation?.revision)===Number(w.lastQuoteRevision)
      && Number(w.lastAskCents)>0 && Number(quote.yesAsk)!==Number(w.lastAskCents))
   ||(w.lastQuoteEpoch && quote.quoteObservation?.epoch && String(w.lastQuoteEpoch)!==String(quote.quoteObservation.epoch)
      && String(quote.quoteObservation.epoch)!==String(stamp.liveEpoch||'') )
   ||(w.lastQuoteEpoch && quote.quoteObservation?.epoch && String(w.lastQuoteEpoch)!==String(quote.quoteObservation.epoch)
      && Number(w.lastQuoteAtMs)>0 && Number(quote.quoteAtMs)<Number(w.lastQuoteAtMs))
   ||((w.lastQuoteEpoch || Number(w.lastQuoteRevision)>0) && (!quote.quoteObservation?.epoch || !(Number(quote.quoteObservation?.revision)>0))))
   return fail('sc_clone_fresh_quote_invalid');
 // The independently authorized clone retains Starlight's effective
 // executable entry band and spread limits. Strategy preflight already checks
 // these, but the atomic insert and broker witness must enforce them too.
 const bandMin=Number(settings.crashRecoveryMinEntryCents),
   bandMax=Number(settings.crashRecoveryMaxEntryCents),
   maxSpread=Number(settings.crashRecoveryMaxSpreadCents);
 if(!Number.isFinite(bandMin)||!Number.isFinite(bandMax)||!Number.isFinite(maxSpread)
   ||bandMin<1||bandMax>99||bandMin>bandMax||maxSpread<0||maxSpread>99
   ||Number(quote.yesAsk)<bandMin||Number(quote.yesAsk)>bandMax
   ||Number(entry.entryPriceCents)<bandMin||Number(entry.entryPriceCents)>bandMax
   ||Number(quote.yesAsk)-Number(quote.yesBid)>maxSpread)
   return fail('sc_clone_frozen_entry_band_or_spread_invalid');
 const rise=athenaStarlightTriggerDecision({settings,parent:p,watch:w,quote,now});
 if(!rise.ok)return fail(`sc_clone_${rise.reason}`);
 const a=entry.mode==='LIVE'?c.auroraPending?.preflight:c.aurora;
 if(!a||a.ok!==true||a.frozen!==true||a.mode!==entry.mode
   ||Number(a.originalContractCount)!==Number(entry.count)
   ||Number(a.entryPriceCents)!==Number(entry.entryPriceCents)
   ||Number(a.damageControlPercent)!==Number(settings.crashRecoveryHunterAuroraDamageControlPercent)
   ||(entry.mode==='LIVE'&&c.auroraPending?.exactFillRequired!==true))
   return fail('sc_clone_aurora_not_verified');
 if(c.finalEntryConfirmation?.ok!==true)return fail('sc_clone_final_book_unverified');
 return {ok:true,reason:'sc_clone_verified_parent_watch_seat',seat,maximum,proofHash:authority.proofHash};
}

/** Must be installed in the SAME migration transaction as the LP/Arrow fences.
 * Their native branches can exempt a clone only with the transaction-local
 * GUC; this trigger always verifies the complete independently scoped proof.
 * In particular, caller-supplied JSON alone is never INSERT authority.
 */
export const MODEL_CLONE_CAPITAL_SQL=`
-- Separately attested no-send certificates. The app issues this record only
-- in the same PostgreSQL transaction as an exact, unreceipted entry CAS.
-- A caller's JSON dispatchProof flag alone never releases a financial seat.
create table if not exists sag_sc_model_clone_no_send_v1(
 entry_id text primary key references sag_entries(id),
 system_name text not null, owner_id text not null,
 mode text not null check(mode='LIVE'),reset_epoch bigint not null,
 parent_entry_id text not null, concept_name text not null,
 seat integer not null check(seat between 1 and 20),
 attempt_generation integer not null check(attempt_generation between 0 and 64),
 client_order_id text not null, reason text not null, proven_at_ms bigint not null
);
create unique index if not exists sag_sc_clone_no_send_scope_unique
 on sag_sc_model_clone_no_send_v1(system_name,owner_id,mode,reset_epoch,
 parent_entry_id,concept_name,seat,attempt_generation);
create or replace function sag_sc_model_clone_capital_fence() returns trigger language plpgsql as $$
declare s jsonb; rec jsonb; w sag_starlight_recovery_v1; p sag_entries;
 proof sag_shadow_stops_v3; q jsonb; a jsonb; at_ms bigint; maximum int;
 present int; signal_at bigint; book_at bigint; trigger_rise numeric;
 generation int; historical int; certified int;
begin
 if NEW.entry_config->>'starlightModelClone' is distinct from 'true' then return NEW; end if;
 rec:=NEW.entry_config->'modelCloneCapital';
 if current_setting('sagittarius.model_clone_entry',true) is distinct from 'admitted'
  or rec->>'version' is distinct from '${MODEL_CLONE_CAPITAL_VERSION}'
  or NEW.concept_name not in ('Lightning Plasma','Sagittarius Arrow Recovery')
  or NEW.execution_class is distinct from 'CAPITAL'
  or NEW.entry_config->>'executionClass' is distinct from 'CAPITAL'
  or NEW.mode not in ('LIVE','SIMULATION')
  or (NEW.mode='LIVE' and (NEW.status<>'entry_pending' or nullif(NEW.entry_client_order_id,'') is null or NEW.entry_order_id is not null))
  or (NEW.mode='SIMULATION' and (NEW.status<>'open' or NEW.entry_client_order_id is not null or NEW.entry_order_id is not null))
  or NEW.count<=0 or NEW.remaining_count<>NEW.count
  or NEW.entry_price_cents<=0 or NEW.entry_price_cents>=100
  or rec->>'positionId' is distinct from NEW.id
  or rec->>'parentEntryId' is distinct from NEW.source_trade_id
  or rec->>'concept' is distinct from NEW.concept_name
 then raise exception 'sc_clone_transactional_identity_required';end if;
 select value into s from sag_settings where key='runtime' for update;
 maximum:=coalesce((s->>'crashRecoveryHunterMultiply')::int,0);
 if s->>'engineActive' is distinct from 'true' or s->>'crashRecoveryHunterEnabled' is distinct from 'true'
  or s->>'starlightExtinctionRealTradeEnabled' is distinct from 'true'
  or (NEW.concept_name='Lightning Plasma' and s->>'lightningPlasmaEnabled' is distinct from 'true')
  or (NEW.concept_name='Sagittarius Arrow Recovery' and s->>'sagittariusArrowEnabled' is distinct from 'true')
  or s->>'systemName' is distinct from NEW.system_name or s->>'ownerId' is distinct from NEW.owner_id
  or s->>'mode' is distinct from NEW.mode or (NEW.mode='LIVE' and s->>'liveArmed' is distinct from 'true')
  or coalesce((s->>'resetTimestampMs')::bigint,0) is distinct from (rec->>'resetEpoch')::bigint
  or (NEW.entry_config->>'resetTimestampMs')::bigint is distinct from (rec->>'resetEpoch')::bigint
  or maximum not between 1 and 20 or (rec->>'maximumSeats')::int is distinct from maximum
  or (rec->>'seat')::int not between 1 and maximum
  or NEW.entry_price_cents*NEW.count>(s->>'crashRecoveryStakeCents')::numeric
 then raise exception 'sc_clone_operator_multiply_or_stake_changed';end if;
 select * into w from sag_starlight_recovery_v1 where system_name=NEW.system_name
  and owner_id=NEW.owner_id and mode=NEW.mode and reset_epoch=(rec->>'resetEpoch')::bigint
  and parent_entry_id=NEW.source_trade_id and authorization_id=rec->>'watchId' for update;
 select * into p from sag_entries where id=NEW.source_trade_id for share;
 select * into proof from sag_shadow_stops_v3 where parent_entry_id=NEW.source_trade_id
  and system_name=NEW.system_name and owner_id=NEW.owner_id and mode=NEW.mode
  and reset_epoch=(rec->>'resetEpoch')::bigint;
 if p.id is null or p.concept_name<>'Athena Exclamation' or p.execution_class<>'SHADOW_SAINT'
  or p.archived or p.status<>'closed' or p.close_reason<>'hard_stop_loss' or p.pnl_cents>=0
  or p.remaining_count<>0 or p.count<=0 or p.shadow_entry_hash is null
  or p.shadow_epoch<>(rec->>'resetEpoch')::bigint or p.opened_at_ms<p.shadow_epoch
  or p.system_name<>NEW.system_name or p.owner_id<>NEW.owner_id or p.mode<>NEW.mode
  or p.ticker<>NEW.ticker or p.event_ticker is distinct from NEW.event_ticker
  or proof.parent_entry_id is null or proof.delivery_status='DISABLED_AT_CLOSE'
  or proof.proof_hash is distinct from rec->>'shadowProofHash'
  or proof.proof->>'authorization' is distinct from 'VALID_SHADOW_HARD_STOP'
  or proof.proof->>'entryHash' is distinct from p.shadow_entry_hash
  or proof.proof->>'parentEntryId' is distinct from p.id
  or proof.proof->>'full' is distinct from 'true'
  or (proof.proof->>'count')::int is distinct from p.count
  or (proof.proof->>'filled')::int is distinct from p.count
  or (proof.proof->>'pnlCents')::numeric is distinct from p.pnl_cents::numeric
  or w.parent_entry_id is null or w.status not in ('WATCHING','READY','EXECUTING','CONSUMED')
  or w.revision is distinct from (rec->>'watchRevision')::bigint
  or w.watch->>'shadowProofHash' is distinct from proof.proof_hash
  or w.watch->>'authorizationId' is distinct from rec->>'watchId'
  or w.watch->>'parentConcept' is distinct from 'Athena Exclamation'
  or w.watch->>'ticker' is distinct from NEW.ticker
  or w.watch->>'eventTicker' is distinct from NEW.event_ticker
  or w.watch->>'resetEpoch' is distinct from rec->>'resetEpoch'
  or not exists(select 1 from jsonb_array_elements(coalesce(w.watch->'modelClones','[]'::jsonb)) x
     where x->>'id'=rec->>'cloneId' and x->>'concept'=NEW.concept_name)
 then raise exception 'sc_clone_verified_stop_or_watch_missing';end if;
 generation:=coalesce((rec->>'attemptGeneration')::int,0);
 if rec->>'cloneId' is distinct from 'STARLIGHT-CLONE:'||NEW.concept_name||':'||p.id
  or (rec->>'seat')::int not between 1 and maximum
  or generation not between 0 and 64
 then raise exception 'sc_clone_parent_seat_identity_invalid';end if;
 at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 q:=NEW.entry_config#>'{entryExecutionWitness,quote}';
 signal_at:=(q->>'quoteAtMs')::bigint;
 book_at:=coalesce((NEW.entry_config#>>'{finalEntryConfirmation,bookProof,verifiedAtMs}')::bigint,0);
 trigger_rise:=coalesce((s->>'athenaExclamationStarlightTriggerCents')::numeric,0);
 if NEW.entry_config#>>'{finalEntryConfirmation,ok}' is distinct from 'true'
  or coalesce((NEW.entry_config#>>'{finalEntryConfirmation,atMs}')::bigint,0)
      not between greatest(signal_at,book_at) and at_ms
  or q->>'ticker' is distinct from NEW.ticker
  or q->>'eventTicker' is distinct from NEW.event_ticker
  or q->>'status' is distinct from 'active'
  or coalesce(q->>'result','')<>'' or coalesce(q->>'bookInvalid','false')='true'
  or signal_at is null
  or signal_at < p.closed_at_ms - least(5000, coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  or coalesce((q#>>'{quoteObservation,receivedAtMs}')::bigint,0) < p.closed_at_ms
  or coalesce((q#>>'{quoteObservation,receivedAtMs}')::bigint,0) > at_ms+2000
  or at_ms-coalesce((q#>>'{quoteObservation,receivedAtMs}')::bigint,0) > least(5000, coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  or coalesce((q#>>'{quoteObservation,receivedAtMs}')::bigint,0)-signal_at > least(5000, coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  or (coalesce(w.watch->>'lastQuoteEpoch','')<>'' and coalesce(q#>>'{quoteObservation,epoch}','')=w.watch->>'lastQuoteEpoch'
      and coalesce((w.watch->>'lastQuoteRevision')::numeric,0)>0
      and coalesce((q#>>'{quoteObservation,revision}')::numeric,0)<(w.watch->>'lastQuoteRevision')::numeric)
  or (coalesce(w.watch->>'lastQuoteEpoch','')<>'' and coalesce(q#>>'{quoteObservation,epoch}','')=w.watch->>'lastQuoteEpoch'
      and coalesce((q#>>'{quoteObservation,revision}')::numeric,0)=(w.watch->>'lastQuoteRevision')::numeric
      and coalesce((w.watch->>'lastBidCents')::numeric,0)>0
      and (q->>'yesBid')::numeric is distinct from (w.watch->>'lastBidCents')::numeric)
  or (coalesce(w.watch->>'lastQuoteEpoch','')<>'' and coalesce(q#>>'{quoteObservation,epoch}','')=w.watch->>'lastQuoteEpoch'
      and coalesce((q#>>'{quoteObservation,revision}')::numeric,0)=(w.watch->>'lastQuoteRevision')::numeric
      and coalesce((w.watch->>'lastAskCents')::numeric,0)>0
      and (q->>'yesAsk')::numeric is distinct from (w.watch->>'lastAskCents')::numeric)
  or (coalesce(w.watch->>'lastQuoteEpoch','')<>'' and coalesce(q#>>'{quoteObservation,epoch}','')<>''
      and q#>>'{quoteObservation,epoch}' is distinct from w.watch->>'lastQuoteEpoch'
      and (coalesce(rec->>'liveEpoch','')='' or q#>>'{quoteObservation,epoch}' is distinct from rec->>'liveEpoch'
        or (coalesce((w.watch->>'lastQuoteAtMs')::numeric,0)>0 and signal_at<(w.watch->>'lastQuoteAtMs')::numeric)))
  or signal_at>at_ms or at_ms-signal_at > least(5000, coalesce((s->>'infinityBreakMaximumBookAgeMs')::bigint,5000))
  or signal_at is distinct from (rec->>'signalQuoteAtMs')::bigint
  or book_at<at_ms-5000 or book_at>at_ms
  or (q->>'yesBid')::numeric<=0 or (q->>'yesAsk')::numeric<(q->>'yesBid')::numeric
  or (q->>'yesAsk')::numeric>=100
  or NEW.entry_price_cents>(q->>'yesAsk')::numeric
  or coalesce((s->>'crashRecoveryMinEntryCents')::numeric,-1)<1
  or coalesce((s->>'crashRecoveryMaxEntryCents')::numeric,100)>99
  or coalesce((s->>'crashRecoveryMaxSpreadCents')::numeric,-1)<0
  or (s->>'crashRecoveryMinEntryCents')::numeric>(s->>'crashRecoveryMaxEntryCents')::numeric
  or NEW.entry_price_cents not between (s->>'crashRecoveryMinEntryCents')::numeric and (s->>'crashRecoveryMaxEntryCents')::numeric
  or (q->>'yesAsk')::numeric not between (s->>'crashRecoveryMinEntryCents')::numeric and (s->>'crashRecoveryMaxEntryCents')::numeric
  or (q->>'yesAsk')::numeric-(q->>'yesBid')::numeric>(s->>'crashRecoveryMaxSpreadCents')::numeric
  or trigger_rise<0 or trigger_rise>99 or trigger_rise<>trunc(trigger_rise)
  or (coalesce(w.watch->>'link','false')<>'true' and (q->>'yesBid')::numeric<p.entry_price_cents+trigger_rise)
 then raise exception 'sc_clone_fresh_trigger_or_book_invalid';end if;
 a:=case when NEW.mode='LIVE' then NEW.entry_config#>'{auroraPending,preflight}' else NEW.entry_config->'aurora' end;
 if a->>'ok' is distinct from 'true' or a->>'frozen' is distinct from 'true'
  or a->>'mode' is distinct from NEW.mode
  or (a->>'originalContractCount')::numeric is distinct from NEW.count::numeric
  or (a->>'entryPriceCents')::numeric is distinct from NEW.entry_price_cents::numeric
  or (a->>'damageControlPercent')::numeric is distinct from (s->>'crashRecoveryHunterAuroraDamageControlPercent')::numeric
  or (NEW.mode='LIVE' and NEW.entry_config#>>'{auroraPending,exactFillRequired}' is distinct from 'true')
  or coalesce(NEW.entry_config#>>'{freezingCoffin,enabled}','false')='true'
 then raise exception 'sc_clone_aurora_or_protection_not_verified';end if;
 -- An earlier rejected row may release a seat ONLY after the durable
 -- no-send witness was written by a strict, unreceipted CAS. The original
 -- rejected attempts remain immutable evidence. No broker-ambiguous intent
 -- is ever reauthorized merely because it lacks an order ID.
 select count(*),count(*) filter(where status='rejected'
   and entry_config#>>'{dispatchProof,version}'='HC2-R1-DISPATCH'
   and entry_config#>>'{dispatchProof,submitted}'='false'
   and nullif(entry_config#>>'{dispatchProof,reason}','') is not null
   and nullif(entry_client_order_id,'') is not null
   and exists(select 1 from sag_sc_model_clone_no_send_v1 cert
     where cert.entry_id=sag_entries.id
     and cert.system_name=sag_entries.system_name and cert.owner_id=sag_entries.owner_id
     and cert.mode=sag_entries.mode and cert.reset_epoch=coalesce((sag_entries.entry_config#>>'{modelCloneCapital,resetEpoch}')::bigint,-1)
     and cert.parent_entry_id=sag_entries.source_trade_id
     and cert.concept_name=sag_entries.concept_name
     and cert.seat=(sag_entries.entry_config#>>'{modelCloneCapital,seat}')::int
     and cert.attempt_generation=coalesce((sag_entries.entry_config#>>'{modelCloneCapital,attemptGeneration}')::int,0)
     and cert.client_order_id=sag_entries.entry_client_order_id)
   and entry_order_id is null and remaining_count=0
   and coalesce(entry_fee_cents,0)=0 and coalesce(exit_filled_count,0)=0
   and coalesce(exit_notional_cents,0)=0)
 into historical,certified from sag_entries
 where system_name=NEW.system_name and owner_id=NEW.owner_id
   and mode=NEW.mode and source_trade_id=NEW.source_trade_id
   and concept_name=NEW.concept_name and entry_config->>'starlightModelClone'='true'
   and entry_config#>>'{modelCloneCapital,seat}'=rec->>'seat';
 if historical<>generation or certified<>generation
   or exists(select 1 from sag_entries prior
     where prior.system_name=NEW.system_name and prior.owner_id=NEW.owner_id
       and prior.mode=NEW.mode and prior.source_trade_id=NEW.source_trade_id
       and prior.concept_name=NEW.concept_name and prior.entry_config->>'starlightModelClone'='true'
       and prior.entry_config#>>'{modelCloneCapital,seat}'=rec->>'seat'
       and coalesce((prior.entry_config#>>'{modelCloneCapital,attemptGeneration}')::int,0)>=generation)
 then raise exception 'sc_clone_seat_no_send_retry_not_certified';end if;
 select count(distinct entry_config#>>'{modelCloneCapital,seat}') into present
 from sag_entries where system_name=NEW.system_name and owner_id=NEW.owner_id
  and mode=NEW.mode and source_trade_id=NEW.source_trade_id and concept_name=NEW.concept_name
  and entry_config->>'starlightModelClone'='true' and status<>'rejected';
 if present>=maximum then raise exception 'sc_clone_multiply_full';end if;
 return NEW;
end; $$;
drop trigger if exists sag_sc_model_clone_capital_insert_fence on sag_entries;
create trigger sag_sc_model_clone_capital_insert_fence before insert on sag_entries
 for each row when (NEW.entry_config->>'starlightModelClone'='true')
 execute function sag_sc_model_clone_capital_fence();
-- Pre-release R31 had no model-clone inserts. Replace any earlier
-- experimental seat-only index with generation-aware immutable history.
drop index if exists sag_sc_clone_durable_seat_unique;
create unique index sag_sc_clone_durable_seat_unique on sag_entries
(system_name,owner_id,mode,concept_name,source_trade_id,
 (entry_config#>>'{modelCloneCapital,resetEpoch}'),(entry_config#>>'{modelCloneCapital,seat}'),
 (coalesce(entry_config#>>'{modelCloneCapital,attemptGeneration}','0')))
 where entry_config->>'starlightModelClone'='true'
 and entry_config#>>'{modelCloneCapital,version}'='SC-MODEL-CLONE-V1';
create unique index if not exists sag_sc_clone_active_seat_unique on sag_entries
(system_name,owner_id,mode,concept_name,source_trade_id,
 (entry_config#>>'{modelCloneCapital,resetEpoch}'),(entry_config#>>'{modelCloneCapital,seat}'))
 where entry_config->>'starlightModelClone'='true'
 and entry_config#>>'{modelCloneCapital,version}'='SC-MODEL-CLONE-V1'
 and status<>'rejected';
`;
