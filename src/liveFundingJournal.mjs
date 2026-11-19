// Funding transfers are account mutations with an asynchronous broker result.
// Their identity must outlive the worker that submitted them and any local
// strategy reset. This journal grants no order or trading authority.
export const LIVE_FUNDING_JOURNAL_SQL = `
create table if not exists sag_live_funding_transfers_v1(
  owner_id text not null,
  client_transfer_id uuid not null,
  source_exchange_index int not null check(source_exchange_index between 0 and 100),
  destination_exchange_index int not null check(destination_exchange_index between 0 and 100),
  source_subaccount int not null default 0 check(source_subaccount between 0 and 63),
  destination_subaccount int not null default 0 check(destination_subaccount between 0 and 63),
  amount_centicents bigint not null check(amount_centicents>0 and amount_centicents<=9007199254740991),
  state text not null check(state in ('prepared','submitted','ambiguous','complete','failed')),
  transfer_id text,
  receipt jsonb not null default '{}'::jsonb check(jsonb_typeof(receipt)='object'),
  created_at_ms bigint not null,
  updated_at_ms bigint not null,
  primary key(owner_id,client_transfer_id),
  check(source_exchange_index<>destination_exchange_index)
);
create index if not exists sag_live_funding_transfers_v1_pending
  on sag_live_funding_transfers_v1(owner_id,created_at_ms,client_transfer_id)
  where state in ('prepared','submitted','ambiguous');
`;

const STATES=new Set(['prepared','submitted','ambiguous','complete','failed']);
const TERMINAL=new Set(['complete','failed']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const integer=(v,lo,hi)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=lo&&v<=hi;
const error=code=>Object.assign(new Error(code),{code});

function transferId(value){
  if(value==null)return null;
  if(typeof value!=='string'||!value.trim()||value!==value.trim()||value.length>256)
    throw error('live_funding_transfer_id_invalid');
  return value;
}
function receiptValue(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw error('live_funding_receipt_invalid');
  let json;
  try{json=JSON.stringify(value);}catch{throw error('live_funding_receipt_invalid');}
  if(Buffer.byteLength(json)>32*1024)throw error('live_funding_receipt_too_large');
  return JSON.parse(json);
}
function validateRecord(r){
  if(!r||typeof r!=='object'||typeof r.clientTransferId!=='string'||!UUID.test(r.clientTransferId)
    ||!integer(r.sourceExchangeIndex,0,100)||!integer(r.destinationExchangeIndex,0,100)
    ||r.sourceExchangeIndex===r.destinationExchangeIndex
    ||!integer(r.sourceSubaccount??0,0,63)||!integer(r.destinationSubaccount??0,0,63)
    ||!integer(r.amountCenticents,1,Number.MAX_SAFE_INTEGER))
    throw error('live_funding_journal_intent_invalid');
}
function fromRow(row){
  if(!row)return null;
  const out={clientTransferId:String(row.client_transfer_id),
    sourceExchangeIndex:Number(row.source_exchange_index),destinationExchangeIndex:Number(row.destination_exchange_index),
    sourceSubaccount:Number(row.source_subaccount),destinationSubaccount:Number(row.destination_subaccount),
    amountCenticents:Number(row.amount_centicents),state:String(row.state),
    transferId:transferId(row.transfer_id),receipt:receiptValue(row.receipt),
    createdAtMs:Number(row.created_at_ms),updatedAtMs:Number(row.updated_at_ms)};
  validateRecord(out);
  if(!STATES.has(out.state)||!integer(out.createdAtMs,1,Number.MAX_SAFE_INTEGER)
    ||!integer(out.updatedAtMs,out.createdAtMs,Number.MAX_SAFE_INTEGER))
    throw error('live_funding_journal_row_invalid');
  return out;
}

export function createLiveFundingStore(pool,ownerId){
  if(!pool||typeof pool.connect!=='function'||typeof ownerId!=='string'
    ||!ownerId.trim()||ownerId!==ownerId.trim()||ownerId.length>256)
    throw error('live_funding_journal_scope_invalid');
  const key=`SAGITTARIUS-LIVE-FUNDING-V1|${ownerId}`;
  return Object.freeze({version:'LIVE-FUNDING-JOURNAL-V1',ownerId,
    async withLock(task){
      if(typeof task!=='function')throw error('live_funding_journal_task_invalid');
      // Use one query-pool session for BOTH the advisory lock and every
      // journal query. Entry already holds a ticker lock in the two-client
      // lock pool; requesting another such client could exhaust that pool.
      // No transaction is left open during an HTTP transfer or history read.
      const client=await pool.connect();
      let locked=false,lockStateKnown=false,active=false,releaseError=null;
      try{
        const result=await client.query('select pg_try_advisory_lock(hashtextextended($1,0)) as locked',[key]);
        lockStateKnown=true;
        if(result.rows?.[0]?.locked!==true)throw error('live_funding_lock_busy');
        locked=true;active=true;
        const assertActive=()=>{if(!active)throw error('live_funding_lock_not_held');};
        const lookup=async id=>{
          assertActive();
          const r=await client.query(`select * from sag_live_funding_transfers_v1
            where owner_id=$1 and client_transfer_id=$2::uuid`,[ownerId,id]);
          return fromRow(r.rows?.[0]);
        };
        const lockedStore=Object.freeze({
          async listPending(){
            assertActive();
            const r=await client.query(`select * from sag_live_funding_transfers_v1 where owner_id=$1
              and state in ('prepared','submitted','ambiguous')
              order by created_at_ms,client_transfer_id limit 101`,[ownerId]);
            if(!Array.isArray(r.rows)||r.rows.length>100)throw error('live_funding_pending_limit_exceeded');
            return r.rows.map(fromRow);
          },
          async prepare(record){
            assertActive();validateRecord(record);
            if(record.state!=null&&record.state!=='prepared')throw error('live_funding_prepare_state_invalid');
            if(record.transferId!=null)throw error('live_funding_prepare_receipt_invalid');
            const now=Date.now(),receipt=receiptValue(record.receipt);
            const values=[ownerId,record.clientTransferId,record.sourceExchangeIndex,record.destinationExchangeIndex,
              record.sourceSubaccount??0,record.destinationSubaccount??0,record.amountCenticents,receipt,now];
            const inserted=await client.query(`insert into sag_live_funding_transfers_v1
              (owner_id,client_transfer_id,source_exchange_index,destination_exchange_index,
                source_subaccount,destination_subaccount,amount_centicents,state,receipt,created_at_ms,updated_at_ms)
              values($1,$2::uuid,$3,$4,$5,$6,$7,'prepared',$8,$9,$9)
              on conflict(owner_id,client_transfer_id) do nothing returning *`,values);
            const saved=fromRow(inserted.rows?.[0])||await lookup(record.clientTransferId);
            if(!saved||['sourceExchangeIndex','destinationExchangeIndex','amountCenticents'].some(k=>saved[k]!==record[k])
              ||saved.sourceSubaccount!==(record.sourceSubaccount??0)
              ||saved.destinationSubaccount!==(record.destinationSubaccount??0))
              throw error('live_funding_intent_identity_conflict');
            return saved;
          },
          async update(clientTransferId,patch){
            assertActive();
            if(typeof clientTransferId!=='string'||!UUID.test(clientTransferId)||!patch
              ||typeof patch!=='object'||!STATES.has(patch.state)
              ||Object.keys(patch).some(k=>!['state','transferId','receipt'].includes(k)))
              throw error('live_funding_journal_update_invalid');
            const previous=await lookup(clientTransferId);
            if(!previous)throw error('live_funding_intent_missing');
            if((TERMINAL.has(previous.state)&&patch.state!==previous.state)
              ||(previous.state!=='prepared'&&patch.state==='prepared'))
              throw error('live_funding_terminal_state_conflict');
            const id=patch.transferId===undefined?previous.transferId:transferId(patch.transferId);
            if(previous.transferId&&id!==previous.transferId)throw error('live_funding_transfer_identity_conflict');
            const receipt=patch.receipt===undefined?previous.receipt:receiptValue(patch.receipt);
            const now=Math.max(Date.now(),previous.updatedAtMs);
            const updated=await client.query(`update sag_live_funding_transfers_v1 set
              state=$3,transfer_id=$4,receipt=$5,updated_at_ms=$6
              where owner_id=$1 and client_transfer_id=$2::uuid and state=$7
                and transfer_id is not distinct from $8::text and updated_at_ms=$9
              returning *`,[ownerId,clientTransferId,patch.state,id,receipt,now,
                previous.state,previous.transferId,previous.updatedAtMs]);
            if(updated.rowCount!==1)throw error('live_funding_journal_concurrent_change');
            return fromRow(updated.rows?.[0]);
          },
        });
        return await task(lockedStore);
      }catch(e){
        // A lost acquisition response may conceal an acquired server lock.
        // Close that session rather than returning an uncertain lock to pool.
        if(!lockStateKnown)releaseError=e;
        throw e;
      }finally{
        active=false;
        if(locked){
          try{
            const result=await client.query('select pg_advisory_unlock(hashtextextended($1,0)) as unlocked',[key]);
            if(result.rows?.[0]?.unlocked!==true)releaseError=error('live_funding_lock_release_unverified');
          }catch(e){releaseError=e;}
        }
        // Destroy an uncertain session so it cannot retain a hidden advisory
        // lock when returned to the pool. A prepare write remains durable.
        client.release(releaseError||undefined);
      }
    },
  });
}
