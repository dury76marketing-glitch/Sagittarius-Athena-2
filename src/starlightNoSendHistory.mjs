import {authorityHash} from './authority.mjs';
import {starlightNoSendRetryGeneration,starlightCertifiedRejectedNoSendChild,
  starlightPreDispatchNoSendReason} from './starlightCapital.mjs';

export const SC1_NO_SEND_HISTORY_VERSION='SC1-R15-NO-SEND-HISTORY-V1';
const scope=w=>[String(w.systemName),String(w.ownerId),'LIVE',Number(w.resetEpoch||0),String(w.authorizationId),String(w.parentEntryId)];
const fields=['id','system_name','owner_id','mode','ticker','event_ticker','execution_class','status','close_reason',
  'count','remaining_count','entry_client_order_id','entry_order_id','exit_order_id','exit_client_order_id',
  'entry_fee_cents','exit_fee_cents','exit_filled_count','exit_notional_cents','entry_config','opened_at_ms'];
const snapshot=alias=>`jsonb_build_object(${fields.map(k=>`'${k}',${alias}.${k}`).join(',')})`;
const same=(a,b)=>String(a??'')===String(b??'');
function validProof(p,w){
  if(!p||typeof p.id!=='string'||!p.id||p.id.length>500||p.version!=='HC2-R1-DISPATCH'||p.submitted!==false
    ||typeof p.reason!=='string'||!p.reason||p.reason.length>180
    ||!same(p.authorizationId,w.authorizationId)||!same(p.parentEntryId,w.parentEntryId)
    ||!Number.isSafeInteger(Number(p.claimRevision))||Number(p.claimRevision)<1
    ||Number(p.committedRevision)!==Number(p.claimRevision)+1
    ||!Number.isSafeInteger(Number(p.atMs))||Number(p.atMs)<=0)return false;
  if(!p.source)return starlightPreDispatchNoSendReason(p.reason);
  return p.source.version==='SC1-R12-SOURCE-PRE-INTENT'&&p.source.phase==='BEFORE_DURABLE_INTENT'
    &&p.source.intentBoundaryEntered===false&&typeof p.source.stage==='string'&&p.source.stage.length>=2&&p.source.stage.length<=80
    &&typeof p.source.attemptId==='string'&&p.source.attemptId.length>=3&&p.source.attemptId.length<=180
    &&same(p.systemName,w.systemName)&&same(p.ownerId,w.ownerId)&&p.mode==='LIVE'
    &&Number(p.resetEpoch)===Number(w.resetEpoch)&&same(p.ticker,w.ticker)&&same(p.eventTicker,w.eventTicker);
}

export const SC1_NO_SEND_HISTORY_SQL=`
create table if not exists sag_sc1_no_send_proofs_v1(
 system_name text not null,owner_id text not null,mode text not null check(mode='LIVE'),reset_epoch bigint not null,
 authorization_id text not null,parent_entry_id text not null,proof_id text not null,source_attempt_id text,
 proof jsonb not null,created_at_ms bigint not null,
 primary key(system_name,owner_id,mode,reset_epoch,authorization_id,proof_id));
create unique index if not exists sag_sc1_no_send_source_unique on sag_sc1_no_send_proofs_v1
 (system_name,owner_id,mode,reset_epoch,authorization_id,source_attempt_id) where source_attempt_id is not null;
create table if not exists sag_sc1_no_send_history_v1(
 id text primary key,system_name text not null,owner_id text not null,mode text not null check(mode='LIVE'),
 reset_epoch bigint not null,authorization_id text not null,parent_entry_id text not null,
 generation bigint not null check(generation between 1 and 9007199254740991),
 from_generation bigint,previous_id text references sag_sc1_no_send_history_v1(id),
 kind text not null check(kind in ('LEGACY_BASELINE','NO_SEND_REARM')),evidence jsonb not null,created_at_ms bigint not null,
 unique(system_name,owner_id,mode,reset_epoch,authorization_id,generation));
create table if not exists sag_sc1_no_send_children_v1(
 entry_id text primary key references sag_entries(id),system_name text not null,owner_id text not null,
 mode text not null check(mode='LIVE'),reset_epoch bigint not null,authorization_id text not null,
 parent_entry_id text not null,generation bigint not null check(generation between 0 and 9007199254740991),
 entry_snapshot jsonb not null,certified_at_ms bigint not null);
create or replace function sag_sc1_no_send_audit_immutable() returns trigger language plpgsql as $$
begin raise exception 'sc1_no_send_audit_is_append_only';end;$$;
drop trigger if exists sag_sc1_no_send_proof_immutable on sag_sc1_no_send_proofs_v1;
create trigger sag_sc1_no_send_proof_immutable before update or delete on sag_sc1_no_send_proofs_v1
 for each row execute function sag_sc1_no_send_audit_immutable();
drop trigger if exists sag_sc1_no_send_history_immutable on sag_sc1_no_send_history_v1;
create trigger sag_sc1_no_send_history_immutable before update or delete on sag_sc1_no_send_history_v1
 for each row execute function sag_sc1_no_send_audit_immutable();
drop trigger if exists sag_sc1_no_send_child_immutable on sag_sc1_no_send_children_v1;
create trigger sag_sc1_no_send_child_immutable before update or delete on sag_sc1_no_send_children_v1
 for each row execute function sag_sc1_no_send_audit_immutable();
`;

export async function archiveSC1NoSendProof(client,w,p){
  if(!validProof(p,w))return null;
  const r=await client.query(`insert into sag_sc1_no_send_proofs_v1
    (system_name,owner_id,mode,reset_epoch,authorization_id,parent_entry_id,proof_id,source_attempt_id,proof,created_at_ms)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) on conflict
    (system_name,owner_id,mode,reset_epoch,authorization_id,proof_id) do nothing returning proof_id`,
    [...scope(w),p.id,p.source?.attemptId||null,p,Date.now()]);
  if(r.rows?.length===1)return {inserted:true};
  const stored=await client.query(`select proof from sag_sc1_no_send_proofs_v1 where system_name=$1 and owner_id=$2
    and mode=$3 and reset_epoch=$4 and authorization_id=$5 and parent_entry_id=$6 and proof_id=$7`,[...scope(w),p.id]);
  return stored.rows?.length===1&&authorityHash(stored.rows[0].proof)===authorityHash(p)?{inserted:false}:null;
}

async function certifyChildren(client,w,children){
  if(children.length>64)return false;
  for(const child of children){
    if(!starlightCertifiedRejectedNoSendChild(child,w))return false;
    const generation=child.entry_config?.starlightCapital?.noSendRetryGeneration??child.entry_config?.starlightRecovery?.noSendRetryGeneration;
    if(!Number.isSafeInteger(generation)||generation<0)return false;
    const r=await client.query(`insert into sag_sc1_no_send_children_v1
      (entry_id,system_name,owner_id,mode,reset_epoch,authorization_id,parent_entry_id,generation,entry_snapshot,certified_at_ms)
      select e.id,$1,$2,$3,$4,$5,$6,$7,${snapshot('e')},$8 from sag_entries e where e.id=$9
       and e.entry_config=$10::jsonb on conflict(entry_id) do nothing returning entry_id`,
      [...scope(w),generation,Date.now(),child.id,child.entry_config]);
    if(r.rows?.length!==1){
      const sameRow=await client.query(`select c.entry_id from sag_sc1_no_send_children_v1 c join sag_entries e on e.id=c.entry_id
       where c.entry_id=$7 and c.system_name=$1 and c.owner_id=$2 and c.mode=$3 and c.reset_epoch=$4
        and c.authorization_id=$5 and c.parent_entry_id=$6 and c.entry_snapshot=${snapshot('e')}`,[...scope(w),child.id]);
      if(sameRow.rows?.length!==1)return false;
    }
  }
  return true;
}

export async function prepareSC1NoSendHistory(client,w){
  const generation=starlightNoSendRetryGeneration(w);if(generation===null)return null;
  const prior=await client.query(`select id,generation,kind,evidence from sag_sc1_no_send_history_v1
    where system_name=$1 and owner_id=$2 and mode=$3 and reset_epoch=$4 and authorization_id=$5 and parent_entry_id=$6
    order by generation desc limit 1`,scope(w));
  const latest=prior.rows?.[0],marker=w.noSendRetryHistory;
  if(marker){
    if(marker.version!==SC1_NO_SEND_HISTORY_VERSION||!latest||marker.id!==latest.id
      ||Number(marker.generation)!==generation||Number(latest.generation)!==generation)return null;
  }else if(latest)return null;
  const proofs=Array.isArray(w.preDispatchRefusals)?w.preDispatchRefusals:[];
  if(proofs.length>64||proofs.some(p=>!validProof(p,w)))return null;
  for(const p of proofs)if(!await archiveSC1NoSendProof(client,w,p))return null;
  if(marker)return {generation,id:latest.id,marker};
  if(generation===0)return {generation,id:null,marker:null};
  // Import only the original bounded, explicit R14 rearm references. A
  // diagnostic reason or a rejected row without those references is not a
  // legacy certificate. Keep the complete old watch in the immutable audit.
  if(generation>64)return null;
  const childIds=Array.isArray(w.rearmedNoSubmitChildIds)?w.rearmedNoSubmitChildIds:[];
  const proofIds=Array.isArray(w.rearmedNoSubmitProofIds)?w.rearmedNoSubmitProofIds:[];
  if(childIds.length>64||proofIds.length>64)return null;
  if(childIds.length){
    const rows=await client.query(`select ${fields.map(k=>'e.'+k).join(',')},e.archived from sag_entries e
      where e.id=any($1::text[]) order by e.id for share`,[childIds]);
    if(rows.rows.length!==new Set(childIds).size||rows.rows.some(child=>!starlightCertifiedRejectedNoSendChild(child,w)
      ||Number(child.entry_config?.starlightCapital?.noSendRetryGeneration??child.entry_config?.starlightRecovery?.noSendRetryGeneration)>=generation))return null;
    if(!await certifyChildren(client,w,rows.rows))return null;
  }else if(!proofIds.length||proofIds.some(id=>!proofs.some(p=>p.id===id)))return null;
  const id='SC1-NS-'+authorityHash([...scope(w),'legacy',generation]);
  const evidence={version:SC1_NO_SEND_HISTORY_VERSION,legacyWatch:w};
  const r=await client.query(`insert into sag_sc1_no_send_history_v1
    (id,system_name,owner_id,mode,reset_epoch,authorization_id,parent_entry_id,generation,from_generation,previous_id,kind,evidence,created_at_ms)
    values($7,$1,$2,$3,$4,$5,$6,$8,null,null,'LEGACY_BASELINE',$9,$10) returning id`,
    [...scope(w),id,generation,evidence,Date.now()]);
  if(r.rows?.length!==1)return null;
  return {generation,id,marker:{version:SC1_NO_SEND_HISTORY_VERSION,id,generation}};
}

export async function readSC1UncertifiedChildren(client,w){
  // The native certificate binds the exact original child snapshot. A late
  // receipt or changed broker/economic field makes it visible again and
  // fails the existing no-send validator. Unrelated clone rows stay visible.
  const r=await client.query(`select ${fields.map(k=>'e.'+k).join(',')},e.archived from sag_entries e
    where e.concept_name='Crash Recovery Hunter' and e.source_trade_id=$6
     and not exists(select 1 from sag_sc1_no_send_children_v1 c
      where c.entry_id=e.id and c.system_name=$1 and c.owner_id=$2 and c.mode=$3 and c.reset_epoch=$4
       and c.authorization_id=$5 and c.parent_entry_id=$6 and c.generation<$7
       and c.entry_snapshot=${snapshot('e')})
    order by e.opened_at_ms,e.id limit 65 for share`,[...scope(w),starlightNoSendRetryGeneration(w)]);
  return r.rows||[];
}

export async function commitSC1NoSendGeneration(client,w,context,{children=[],proof=null,proofIds=[],reason}={}){
  if(!context||context.generation!==starlightNoSendRetryGeneration(w)
    ||context.generation>=Number.MAX_SAFE_INTEGER||children.length>64||proofIds.length>64)return null;
  if(proof&&!await archiveSC1NoSendProof(client,w,proof))return null;
  if(!await certifyChildren(client,w,children))return null;
  const generation=context.generation+1,id='SC1-NS-'+authorityHash([...scope(w),'generation',generation]);
  const evidence={version:SC1_NO_SEND_HISTORY_VERSION,reason:String(reason||''),claimRevision:Number(w.revision),
    committedRevision:Number(w.revision)+1,childIds:children.map(x=>String(x.id)),proofIds,
    groupSettingsHash:w.groupSettingsHash,shadowProofHash:w.shadowProofHash,atMs:Date.now()};
  const r=await client.query(`insert into sag_sc1_no_send_history_v1
    (id,system_name,owner_id,mode,reset_epoch,authorization_id,parent_entry_id,generation,from_generation,previous_id,kind,evidence,created_at_ms)
    values($7,$1,$2,$3,$4,$5,$6,$8,$9,$10,'NO_SEND_REARM',$11,$12) returning id`,
    [...scope(w),id,generation,context.generation,context.id,evidence,Date.now()]);
  return r.rows?.length===1?{version:SC1_NO_SEND_HISTORY_VERSION,id,generation}:null;
}
