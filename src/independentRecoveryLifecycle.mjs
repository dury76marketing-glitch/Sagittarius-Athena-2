import {createHash} from 'node:crypto';
import {verifiedLiveCapitalParentEntryFill} from './liveParentEntryProof.mjs';

// Independent Arrow seats are immutable attempts. Rejected JSON alone never
// releases a seat: only the certificate committed with its exact no-send CAS
// can permit the next monotonic generation. Historical LP rows remain readable.
export const INDEPENDENT_LIFECYCLE_VERSION='R15-INDEPENDENT-SEATS-V1';
// Bound the representable identity, not the number of transient no-sends in
// normal operation. SQL keeps the audit history; application projections are
// at most one latest attempt per seat plus continuity/certificate aggregates.
export const INDEPENDENT_MAX_RETRY_GENERATION=Number.MAX_SAFE_INTEGER;
export const INDEPENDENT_MAX_SEATS=20;
export function independentCapitalId({systemName,ownerId,mode,resetEpoch,parentEntryId,concept,seat,attemptGeneration=0}){
  const parts=[INDEPENDENT_LIFECYCLE_VERSION,systemName,ownerId,mode,Number(resetEpoch),parentEntryId,concept,Number(seat),Number(attemptGeneration)];
  if(parts.some(x=>x==null||String(x)==='')||!['LIVE','SIMULATION'].includes(mode)
    ||concept!=='Sagittarius Arrow Recovery'||!Number.isSafeInteger(Number(resetEpoch))||Number(resetEpoch)<0
    ||!Number.isSafeInteger(Number(seat))||Number(seat)<1||Number(seat)>INDEPENDENT_MAX_SEATS
    ||!Number.isSafeInteger(Number(attemptGeneration))||Number(attemptGeneration)<0||Number(attemptGeneration)>INDEPENDENT_MAX_RETRY_GENERATION)
    throw new Error('independent_attempt_identity_invalid');
  return 'IR15-'+createHash('sha256').update(JSON.stringify(parts.map(String))).digest('hex').slice(0,40);
}

export function independentCertifiedLocalNoSend(row){
  const p=row?.entryConfig?.dispatchProof;
  return Boolean(row?.independentNoSendCertified===true&&row?.mode==='LIVE'&&row.status==='rejected'
    &&row.executionClass==='CAPITAL'&&row.entryConfig?.executionClass==='CAPITAL'
    &&row.entryConfig?.independentRecovery?.version==='INDEPENDENT-ATHENA-LOSS-V2'
    &&row.entryClientOrderId&&!row.entryOrderId&&!row.exitOrderId
    &&p?.version==='HC2-R1-DISPATCH'&&p.submitted===false&&typeof p.reason==='string'&&p.reason.length>0
    &&Number.isFinite(Number(p.atMs))&&Number(p.atMs)>=Number(row.openedAtMs||0)
    &&Number(row.remainingCount)===0&&Number(row.entryFeeCents||0)===0&&Number(row.exitFeeCents||0)===0
    &&Number(row.exitFilledCount||0)===0&&Number(row.exitNotionalCents||0)===0&&Number(row.pnlCents||0)===0
    &&row.entryConfig?.entryFillProof?.authoritative!==true);
}

export function independentChildDisposition(row,watch){
  const r=row?.entryConfig?.independentRecovery;
  if(!row?.id||!r||r.version!=='INDEPENDENT-ATHENA-LOSS-V2'
    ||['systemName','ownerId','mode','ticker','eventTicker'].some(k=>String(row[k]??'')!==String(watch?.[k]??''))
    ||row.executionClass!=='CAPITAL'||row.entryConfig?.executionClass!=='CAPITAL'
    ||row.conceptName!==watch.concept||r.concept!==watch.concept||row.sourceTradeId!==watch.parentEntryId
    ||r.parentEntryId!==watch.parentEntryId||r.watchAuthorizationId!==watch.authorizationId
    ||Number(r.resetEpoch)!==Number(watch.resetEpoch))return 'IDENTITY_CONFLICT';
  if(independentCertifiedLocalNoSend(row))return 'CERTIFIED_NO_SEND';
  // A pending order can still acquire additional fills. Keep its exact intent
  // and watch proof owned by reconciliation even when a partial fill is known.
  if(['entry_pending','exit_pending','pending_recovery'].includes(row.status)){
    if(row.entryConfig?.entryFillProof?.authoritative===true&&Number(row.entryConfig.entryFillProof.filledCount)>0)
      return 'PARTIAL_OR_UNSETTLED_FILL';
    return row.entryOrderId||row.entryConfig?.dispatchProof?.submitted===true?'BROKER_RECEIPT_PENDING':'PENDING';
  }
  const funded=Number(row.count)>0&&(row.mode==='SIMULATION'||verifiedLiveCapitalParentEntryFill(row).ok===true);
  if(funded&&row.status==='open'&&Number(row.remainingCount)>0)return 'FUNDED_OPEN';
  if(funded&&(row.status==='reconciliation_orphaned'||(row.status==='closed'
    &&(row.closeReason==='broker_zero_inventory_closed'||row.postExitState?.brokerZeroInventoryClose!=null)
    &&row.postExitState?.brokerZeroInventoryClose?.economicClosure!==true)))return 'ECONOMICALLY_UNRESOLVED';
  if(funded&&row.status==='closed'&&Number(row.remainingCount)===0)return 'FUNDED_CLOSED';
  if(row.status==='rejected')return 'UNVERIFIED_REJECTION';
  return 'PENDING';
}

export function independentSeatState(rows,watch,settings={}){
  // The current card controls new attempts. Historic receipts keep their own
  // frozen maximum; a deliberate card edit cannot resurrect a used seat or
  // strand a watch that never reached submission.
  const maximum=Number((watch.concept==='Lightning Plasma'?settings.lightningPlasmaMultiply:settings.sagittariusArrowMultiply)??watch.maximumSeats??1);
  const fail=reason=>({ok:false,status:'PENDING',reason,maximumSeats:maximum,fundedIds:[],pendingIds:[],occupiedSeats:[]});
  if(!Number.isSafeInteger(maximum)||maximum<1||maximum>INDEPENDENT_MAX_SEATS||!Array.isArray(rows)
    ||rows.length>INDEPENDENT_MAX_SEATS)return fail('independent_seat_book_invalid');
  const seats=new Map(),fundedIds=[],pendingIds=[],occupiedSeats=[],pendingDispositions=[];
  let openCount=0;
  for(const row of rows){
    const stamp=row.entryConfig?.independentRecovery;
    const disposition=independentChildDisposition(row,watch);
    if(disposition==='IDENTITY_CONFLICT')return fail('independent_child_identity_conflict');
    const seat=Number(stamp?.seat??1),generation=Number(stamp?.attemptGeneration??0);
    if(!Number.isSafeInteger(seat)||seat<1||seat>INDEPENDENT_MAX_SEATS
      ||!Number.isSafeInteger(generation)||generation<0||generation>INDEPENDENT_MAX_RETRY_GENERATION)
      return fail('independent_seat_generation_invalid');
    if(stamp?.lifecycleVersion===INDEPENDENT_LIFECYCLE_VERSION
      &&(stamp.positionId!==row.id||row.id!==independentCapitalId({...watch,concept:watch.concept,seat,attemptGeneration:generation})))
      return fail('independent_attempt_identity_conflict');
    if(stamp?.lifecycleVersion&&stamp.lifecycleVersion!==INDEPENDENT_LIFECYCLE_VERSION)return fail('independent_lifecycle_version_unknown');
    const history=seats.get(seat)||[];history.push({row,disposition,generation});seats.set(seat,history);
  }
  const retryGenerations={};
  for(const [seat,history] of seats){
    history.sort((a,b)=>a.generation-b.generation);
    const summary=history[0].row.independentAttemptHistory;
    if(summary){
      const {attempts,minGeneration,maxGeneration,distinctGenerations,certifiedNoSends}=summary;
      if(history.length!==1||summary.version!=='R15-INDEPENDENT-HISTORY-V1'
        ||![attempts,minGeneration,maxGeneration,distinctGenerations,certifiedNoSends].every(Number.isSafeInteger)
        ||attempts<1||minGeneration!==0||maxGeneration!==history[0].generation
        ||maxGeneration!==attempts-1||distinctGenerations!==attempts)
        return fail('independent_attempt_history_gap_or_duplicate');
      const latestCertified=history[0].disposition==='CERTIFIED_NO_SEND';
      if(certifiedNoSends!==attempts-(latestCertified?0:1))return fail('independent_prior_attempt_not_certified');
    }else{
      // Small in-memory adapters and pre-R15 single children can be checked
      // directly. Production reads always supply the bounded SQL summary.
      for(let i=0;i<history.length;i++){
        if(history[i].generation!==i)return fail('independent_attempt_history_gap_or_duplicate');
        if(i<history.length-1&&history[i].disposition!=='CERTIFIED_NO_SEND')return fail('independent_prior_attempt_not_certified');
      }
    }
    const latest=history.at(-1);
    if(latest.disposition==='CERTIFIED_NO_SEND'&&latest.generation<INDEPENDENT_MAX_RETRY_GENERATION){retryGenerations[seat]=latest.generation+1;continue;}
    occupiedSeats.push(seat);
    if(latest.disposition==='FUNDED_OPEN'||latest.disposition==='FUNDED_CLOSED'){
      fundedIds.push(latest.row.id);if(latest.disposition==='FUNDED_OPEN')openCount++;
    }else{pendingIds.push(latest.row.id);pendingDispositions.push({id:latest.row.id,disposition:latest.disposition});}
  }
  const nextSeat=Array.from({length:maximum},(_,i)=>i+1).find(s=>!occupiedSeats.includes(s))||null;
  const status=pendingIds.length?'PENDING':fundedIds.length>=maximum?(openCount?'OPENED':'CONSUMED'):'ARMED';
  const pendingReason=pendingDispositions.some(x=>x.disposition==='CERTIFIED_NO_SEND')
    ?'independent_generation_integer_overflow':pendingDispositions.some(x=>x.disposition==='ECONOMICALLY_UNRESOLVED')
    ?'independent_financial_reconciliation_pending':'independent_broker_reconciliation_pending';
  return {ok:true,status,reason:pendingIds.length?pendingReason:
    fundedIds.length>=maximum?'independent_all_seats_funded':'independent_seat_available',
    maximumSeats:maximum,fundedIds,pendingIds,pendingDispositions,occupiedSeats,nextSeat,attemptGeneration:nextSeat?retryGenerations[nextSeat]||0:null};
}

export const INDEPENDENT_LIFECYCLE_SQL=`
create table if not exists sag_independent_no_send_v1(
 entry_id text primary key references sag_entries(id),system_name text not null,owner_id text not null,
 mode text not null check(mode='LIVE'),reset_epoch bigint not null,parent_entry_id text not null,
 concept_name text not null,watch_authorization_id text not null,seat int not null check(seat between 1 and 20),
 attempt_generation bigint not null check(attempt_generation between 0 and 9007199254740991),client_order_id text not null,
 reason text not null,proven_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,parent_entry_id,concept_name,seat,attempt_generation)
);
alter table sag_independent_no_send_v1 alter column attempt_generation type bigint;
alter table sag_independent_no_send_v1 drop constraint if exists sag_independent_no_send_v1_attempt_generation_check;
alter table sag_independent_no_send_v1 add constraint sag_independent_no_send_v1_attempt_generation_check
 check(attempt_generation between 0 and 9007199254740991);
create or replace function sag_independent_attempt_fence() returns trigger language plpgsql as $$
declare rec jsonb;s jsonb;generation bigint;seat_n int;maximum int;historical bigint;certified bigint;
 minimum_generation bigint;maximum_generation bigint;distinct_generations bigint;
begin
 if NEW.entry_config#>>'{independentRecovery,version}' is distinct from 'INDEPENDENT-ATHENA-LOSS-V2' then return NEW;end if;
 rec:=NEW.entry_config->'independentRecovery';
 if NEW.concept_name<>'Sagittarius Arrow Recovery'
  or current_setting('sagittarius.independent_recovery_entry',true) is distinct from 'admitted'
  or rec->>'lifecycleVersion' is distinct from '${INDEPENDENT_LIFECYCLE_VERSION}'
  or rec->>'positionId' is distinct from NEW.id
  or NEW.entry_config#>>'{independentAuthority,lifecycleVersion}' is distinct from rec->>'lifecycleVersion'
  or NEW.entry_config#>>'{independentAuthority,seat}' is distinct from rec->>'seat'
  or NEW.entry_config#>>'{independentAuthority,maximumSeats}' is distinct from rec->>'maximumSeats'
  or NEW.entry_config#>>'{independentAuthority,attemptGeneration}' is distinct from rec->>'attemptGeneration'
 then raise exception 'independent_attempt_capability_required';end if;
 select value into s from sag_settings where key='runtime' for update;
 generation:=(rec->>'attemptGeneration')::bigint;seat_n:=(rec->>'seat')::int;
 maximum:=(s->>'sagittariusArrowMultiply')::int;
 if generation is null or generation not between 0 and 9007199254740991 or maximum is null or maximum not between 1 and 20
  or seat_n is null or seat_n not between 1 and maximum or (rec->>'maximumSeats')::int is distinct from maximum
 then raise exception 'independent_attempt_seat_or_generation_invalid';end if;
 select count(*),min(coalesce((e.entry_config#>>'{independentRecovery,attemptGeneration}')::bigint,0)),
  max(coalesce((e.entry_config#>>'{independentRecovery,attemptGeneration}')::bigint,0)),
  count(distinct coalesce((e.entry_config#>>'{independentRecovery,attemptGeneration}')::bigint,0)),
  count(*) filter(where e.status='rejected'
  and e.entry_order_id is null and e.exit_order_id is null and e.remaining_count=0
  and coalesce(e.entry_fee_cents,0)=0 and coalesce(e.exit_fee_cents,0)=0
  and coalesce(e.exit_filled_count,0)=0 and coalesce(e.exit_notional_cents,0)=0 and coalesce(e.pnl_cents,0)=0
  and e.entry_config#>>'{dispatchProof,version}'='HC2-R1-DISPATCH'
  and e.entry_config#>>'{dispatchProof,submitted}'='false'
  and e.entry_config#>>'{entryFillProof,authoritative}' is distinct from 'true'
  and exists(select 1 from sag_independent_no_send_v1 cert where cert.entry_id=e.id
    and cert.system_name=e.system_name and cert.owner_id=e.owner_id and cert.mode=e.mode
    and cert.reset_epoch=(rec->>'resetEpoch')::bigint and cert.parent_entry_id=e.source_trade_id
    and cert.concept_name=e.concept_name and cert.watch_authorization_id=rec->>'watchAuthorizationId'
    and cert.seat=seat_n and cert.attempt_generation=coalesce((e.entry_config#>>'{independentRecovery,attemptGeneration}')::bigint,0)
    and cert.client_order_id=e.entry_client_order_id)) into historical,minimum_generation,maximum_generation,distinct_generations,certified
 from sag_entries e where e.system_name=NEW.system_name and e.owner_id=NEW.owner_id and e.mode=NEW.mode
  and e.source_trade_id=NEW.source_trade_id and e.concept_name=NEW.concept_name
  and (e.entry_config#>>'{independentRecovery,resetEpoch}')::bigint=(rec->>'resetEpoch')::bigint
  and coalesce((e.entry_config#>>'{independentRecovery,seat}')::int,1)=seat_n;
 if historical<>generation or certified<>generation or distinct_generations<>historical
  or (historical>0 and (minimum_generation<>0 or maximum_generation<>generation-1)) or exists(select 1 from sag_entries e
  where e.system_name=NEW.system_name and e.owner_id=NEW.owner_id and e.mode=NEW.mode
   and e.source_trade_id=NEW.source_trade_id and e.concept_name=NEW.concept_name
   and (e.entry_config#>>'{independentRecovery,resetEpoch}')::bigint=(rec->>'resetEpoch')::bigint
   and coalesce((e.entry_config#>>'{independentRecovery,seat}')::int,1)=seat_n
   and coalesce((e.entry_config#>>'{independentRecovery,attemptGeneration}')::bigint,0)>=generation)
 then raise exception 'independent_attempt_no_send_history_not_certified';end if;
 return NEW;
end; $$;
drop trigger if exists sag_independent_attempt_insert_fence on sag_entries;
create trigger sag_independent_attempt_insert_fence before insert on sag_entries
 for each row execute function sag_independent_attempt_fence();
create unique index if not exists sag_independent_attempt_unique on sag_entries
 (system_name,owner_id,mode,concept_name,source_trade_id,
  (entry_config#>>'{independentRecovery,resetEpoch}'),(entry_config#>>'{independentRecovery,seat}'),
  (entry_config#>>'{independentRecovery,attemptGeneration}'))
 where entry_config#>>'{independentRecovery,lifecycleVersion}'='${INDEPENDENT_LIFECYCLE_VERSION}';
create unique index if not exists sag_independent_active_seat_unique on sag_entries
 (system_name,owner_id,mode,concept_name,source_trade_id,
  (entry_config#>>'{independentRecovery,resetEpoch}'),(entry_config#>>'{independentRecovery,seat}'))
 where entry_config#>>'{independentRecovery,lifecycleVersion}'='${INDEPENDENT_LIFECYCLE_VERSION}' and status<>'rejected';
`;
