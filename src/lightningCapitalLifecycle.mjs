import {createHash} from 'node:crypto';

export const LP_SEAT_LIFECYCLE_VERSION='R15-LP-V5-SEATS-V1';
// Generation is identity, not a retry budget. A finite low cap stranded a
// healthy seat after repeated proven local refusals; only the integer
// representation limit applies. Historical evidence remains in PostgreSQL.
export const LP_MAX_RETRY_GENERATION=Number.MAX_SAFE_INTEGER;
export function lightningCapitalId({systemName,ownerId,mode,resetEpoch,parentEntryId,seat,attemptGeneration=0}){
  return 'LP5:'+createHash('sha256').update(JSON.stringify([LP_SEAT_LIFECYCLE_VERSION,
    String(systemName),String(ownerId),String(mode),Number(resetEpoch),String(parentEntryId),
    Number(seat),Number(attemptGeneration)])).digest('hex');
}
export function lightningCertifiedLocalNoSend(e){
  const p=e?.entryConfig?.dispatchProof;
  return e?.lpNoSendCertified===true&&e.mode==='LIVE'&&e.status==='rejected'
    &&e.executionClass==='CAPITAL'&&e.entryConfig?.executionClass==='CAPITAL'
    &&!!e.entryClientOrderId&&!e.entryOrderId&&!e.exitOrderId&&!e.exitClientOrderId
    &&Number(e.remainingCount)===0&&Number(e.entryFeeCents||0)===0
    &&Number(e.exitFeeCents||0)===0&&Number(e.pnlCents||0)===0
    &&Number(e.exitFilledCount||0)===0&&Number(e.exitNotionalCents||0)===0
    &&Number(e.entryConfig?.entryFillProof?.filledCount||0)===0
    &&p?.version==='HC2-R1-DISPATCH'&&p.submitted===false
    &&typeof p.reason==='string'&&p.reason.length>0;
}
export function lightningCapitalSeatPlan(rows,settings,parentId){
  const maximum=Math.max(1,Math.min(20,Math.floor(Number(settings.lightningPlasmaMultiply)||1)));
  const books=new Map();
  for(const e of rows||[]){
    const t=e.entryConfig?.lightningPlasmaScaleIn,seat=Number(t?.seat),generation=Number(t?.attemptGeneration);
    if(t?.lifecycleVersion!==LP_SEAT_LIFECYCLE_VERSION||!Number.isSafeInteger(seat)||seat<1||seat>20
      ||!Number.isSafeInteger(generation)||generation<0||generation>LP_MAX_RETRY_GENERATION
      ||e.systemName!==settings.systemName||e.ownerId!==settings.ownerId||e.mode!==settings.mode
      ||e.sourceTradeId!==parentId||Number(t.resetTimestampMs)!==Number(settings.resetTimestampMs||0)
      ||e.id!==lightningCapitalId({systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,
        resetEpoch:Number(settings.resetTimestampMs||0),parentEntryId:parentId,seat,attemptGeneration:generation}))
      return {ok:false,reason:'lp_v5_legacy_seat_requires_reconciliation',maximum,seats:[]};
    if(!books.has(seat))books.set(seat,[]);books.get(seat).push({row:e,generation});
  }
  const seats=[];let occupied=0;
  for(let seat=1;seat<=20;seat++){
    const attempts=(books.get(seat)||[]).sort((a,b)=>a.generation-b.generation);
    const history=attempts[0]?.row.lpSeatHistory;
    let generation=attempts.length;
    if(history){
      const latest=attempts[0],count=Number(history.count),last=Number(history.maximumGeneration);
      if(attempts.length!==1||history.identityConsistent!==true||!Number.isSafeInteger(count)||count<1
        ||Number(history.minimumGeneration)!==0||!Number.isSafeInteger(last)||last!==latest.generation
        ||Number(history.distinctGenerations)!==count||count!==last+1)return {ok:false,reason:'lp_v5_retry_history_not_contiguous',maximum,seats:[]};
      if(Number(history.certifiedCount)!==count||!lightningCertifiedLocalNoSend(latest.row)){occupied++;continue;}
      generation=last+1;
    }else{
      if(attempts.some((x,i)=>x.generation!==i))return {ok:false,reason:'lp_v5_retry_history_not_contiguous',maximum,seats:[]};
      if(attempts.some(x=>!lightningCertifiedLocalNoSend(x.row))){occupied++;continue;}
    }
    if(!Number.isSafeInteger(generation)||generation>LP_MAX_RETRY_GENERATION){occupied++;continue;}
    if(seat<=maximum)seats.push({seat,attemptGeneration:generation});
  }
  return {ok:true,maximum,occupied,seats:seats.slice(0,Math.max(0,maximum-occupied))};
}

// Used both by the bounded reader and the native insertion fence. A receipt
// status or a submitted:false JSON field alone is never a retry certificate.
export const LP_CERTIFIED_NO_SEND_SQL=`c.entry_id=e.id and c.system_name=e.system_name
 and c.owner_id=e.owner_id and c.mode=e.mode and c.parent_entry_id=e.source_trade_id
 and c.reset_epoch=(e.entry_config#>>'{lightningPlasmaScaleIn,resetTimestampMs}')::bigint
 and c.seat=(e.entry_config#>>'{lightningPlasmaScaleIn,seat}')::int
 and c.attempt_generation=(e.entry_config#>>'{lightningPlasmaScaleIn,attemptGeneration}')::bigint
 and c.client_order_id=e.entry_client_order_id
 and e.mode='LIVE' and e.status='rejected' and e.remaining_count=0
 and e.entry_order_id is null and e.exit_order_id is null and e.exit_client_order_id is null
 and e.entry_fee_cents=0 and e.exit_fee_cents=0 and e.exit_filled_count=0
 and e.exit_notional_cents=0 and e.pnl_cents=0
 and coalesce((e.entry_config#>>'{entryFillProof,filledCount}')::numeric,0)=0
 and e.entry_config#>>'{dispatchProof,version}'='HC2-R1-DISPATCH'
 and e.entry_config#>>'{dispatchProof,submitted}'='false'
 and e.entry_config#>>'{dispatchProof,reason}'=c.reason`;

// A certificate is committed in the same transaction as its exact pending
// intent's transition to rejected. A JSON submitted:false alone never frees a
// seat. Historical rows and ambiguous broker submissions remain occupied.
export const LP_NO_SEND_SQL=`
create table if not exists sag_lp_v5_no_send_v1(
 entry_id text primary key references sag_entries(id),system_name text not null,owner_id text not null,
 mode text not null check(mode='LIVE'),reset_epoch bigint not null,parent_entry_id text not null,
 seat integer not null check(seat between 1 and 20),attempt_generation bigint not null check(attempt_generation between 0 and ${LP_MAX_RETRY_GENERATION}),
 client_order_id text not null,reason text not null,proven_at_ms bigint not null);
create unique index if not exists sag_lp_v5_seat_generation_identity on sag_entries
 (system_name,owner_id,mode,source_trade_id,
  (entry_config#>>'{lightningPlasmaScaleIn,resetTimestampMs}'),
  (entry_config#>>'{lightningPlasmaScaleIn,seat}'),
  (entry_config#>>'{lightningPlasmaScaleIn,attemptGeneration}'))
 where concept_name='Lightning Plasma' and execution_class='CAPITAL'
  and entry_config#>>'{lightningPlasmaScaleIn,lifecycleVersion}'='${LP_SEAT_LIFECYCLE_VERSION}';
alter table sag_lp_v5_no_send_v1 alter column attempt_generation type bigint;
alter table sag_lp_v5_no_send_v1 drop constraint if exists sag_lp_v5_no_send_v1_attempt_generation_check;
alter table sag_lp_v5_no_send_v1 add constraint sag_lp_v5_no_send_v1_attempt_generation_check
 check(attempt_generation between 0 and ${LP_MAX_RETRY_GENERATION});
create index if not exists sag_lp_v5_seat_retry_lookup on sag_entries
 (system_name,owner_id,mode,source_trade_id,
  ((entry_config#>>'{lightningPlasmaScaleIn,seat}')::int),
  ((entry_config#>>'{lightningPlasmaScaleIn,attemptGeneration}')::bigint) desc)
 where concept_name='Lightning Plasma' and execution_class='CAPITAL'
  and entry_config#>>'{lightningPlasmaScaleIn,lifecycleVersion}'='${LP_SEAT_LIFECYCLE_VERSION}';
`;
