import {normalizeGoldenSaintCards} from './goldenSaintCards.mjs';
import {maximumSettlementNetAdmission} from './executionEconomics.mjs';
/** R17 durable Golden Saints watches. Intentionally no broker transport here.
 * Each authorization is a scoped, uniquely identified loss lineage. These
 * APIs MUST be called by an owned Database instance using its own pg pool.
 */
import { validateAthenaStop, fanoutAthenaLoss, verifyR17CapitalNetLoss,
  authorizeNextRecovery, r17CardFingerprint, r17ScopedId, validateR17Scope,
  r17PersistedObservationQuote,r17QualifiedObservationEvidence,
  revalidateR17WatchCard,strictSameScope,
  R17_VERSION, saintRole, ALL_SAINTS, r17InternalConcept } from './goldenSaintDomain.mjs';

export const GOLDEN_SAINT_SCHEMA_SQL = `
create table if not exists sag_r17_golden_watches (
  authorization_id text primary key,
  system_name text not null,
  owner_id text not null,
  mode text not null check(mode in ('SIMULATION','LIVE')),
  reset_epoch bigint not null,
  saint text not null check(saint in ('Aries','Taurus','Gemini','Cancer','Leo','Virgo',
      'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces')),
  parent_entry_id text not null,
  ticker text not null,
  card_fingerprint text not null,
  status text not null check(status in ('WATCHING','EXECUTING','CONSUMED','BLOCKED','EXPIRED')),
  revision integer not null default 1 check(revision >= 1),
  watch jsonb not null,
  updated_at_ms bigint not null,
  unique(system_name,owner_id,mode,reset_epoch,saint,parent_entry_id)
);
create index if not exists sag_r17_golden_watch_scope on sag_r17_golden_watches
  (system_name,owner_id,mode,reset_epoch,status,ticker);
-- Active quote-admission reader: cursor pagination indexed by auth ID.
-- Retired/fingerprint-mismatched watches remain durable but leave the hot path.
create index if not exists sag_r17_golden_active_reader_megawave_v1
  on sag_r17_golden_watches (system_name,owner_id,mode,reset_epoch,status,authorization_id)
  include (saint,card_fingerprint,ticker);
-- Stale claim recovery is scoped, bounded and index-backed. It never reopens
-- a watch that already has a durable seat, which might have reached Kalshi.
create index if not exists sag_r17_golden_unseated_claims_v1 on sag_r17_golden_watches
  (system_name,owner_id,mode,reset_epoch,updated_at_ms,authorization_id)
  where status='EXECUTING';
create table if not exists sag_r17_golden_seats (
  authorization_id text not null references sag_r17_golden_watches(authorization_id),
  seat integer not null check(seat between 1 and 20),
  entry_id text not null unique,
  client_order_id text,
  state text not null check(state in ('RESERVED','PENDING_BROKER','FUNDED','DENIED_NO_SEND','UNCERTAIN')),
  updated_at_ms bigint not null,
  primary key(authorization_id,seat)
);
create unique index if not exists sag_r17_golden_client_order_unique
  on sag_r17_golden_seats(client_order_id) where client_order_id is not null;
-- Bounded crash replay must never scan all trades during market activity.
create index if not exists sag_r17_closed_loss_outbox_v1 on sag_entries
  (system_name,owner_id,mode,shadow_epoch,id)
  where execution_class='CAPITAL' and status='closed'
    and remaining_count=0 and pnl_cents<0 and archived=false
    and concept_name like 'R17:%';
`;
const safeInt=(v,min=0)=>Number.isSafeInteger(Number(v))&&Number(v)>=min;
const scopeFromSettings=s=>({systemName:s?.systemName,ownerId:s?.ownerId,
  mode:s?.mode,resetEpoch:Number(s?.resetTimestampMs||0)});
function assertScope(scope){if(!validateR17Scope(scope).ok)throw new Error('r17_durable_scope_invalid');}
function idString(v){return typeof v==='string'&&v.length>0&&v.length<=256;}
function normalizedRecord(row){
  if(!row)return null;
  return {...row.watch,status:row.status,revision:Number(row.revision),
    authorizationId:row.authorization_id,saint:row.saint,parentEntryId:row.parent_entry_id};
}
export class GoldenSaintRepository {
  constructor({pool,shadowStore,entryMapper,entryWriter,simCashCalculator}={}){
    if(!pool||!shadowStore||typeof entryMapper!=='function'||typeof entryWriter!=='function')throw new Error('r17_db_dependencies_required');
    this.pool=pool;this.shadowStore=shadowStore;this.entryMapper=entryMapper;
    this.simCashCalculator=simCashCalculator;this.entryWriter=entryWriter;
  }
  async bootstrap(){await this.pool.query(GOLDEN_SAINT_SCHEMA_SQL);}
  async transaction(action){
    const c=await this.pool.connect();let started=false;
    try{await c.query('BEGIN');started=true;
      await c.query("set local lock_timeout='1500ms'");
      await c.query("set local statement_timeout='5000ms'");
      const result=await action(c);
      await c.query('COMMIT');started=false;return result;
    }catch(error){if(started)try{await c.query('ROLLBACK');}catch{}throw error;}
    finally{c.release();}
  }
  async lockedSettings(c,scope){
    const r=await c.query("select value from sag_settings where key='runtime' for update");
    const settings=r.rows?.[0]?.value;
    if(!settings||settings.systemName!==scope.systemName||settings.ownerId!==scope.ownerId
      ||settings.mode!==scope.mode||Number(settings.resetTimestampMs||0)!==scope.resetEpoch)
      throw new Error('r17_settings_scope_drift');
    // A pre-R17 PostgreSQL card has no goldenSaints field. Its absence means
    // all twelve NEW capital cards are DISABLED, not an implied permission to
    // inherit the old Starlight capital toggle. Never mutate saved card here.
    return {...settings,goldenSaints:normalizeGoldenSaintCards(settings,settings.goldenSaints)};
  }
  async storeWatches(c,watches){
    const stored=[];
    for(const watch of watches){
      const s=watch.scope;assertScope(s);
      if(!idString(watch.parentEntryId)||!idString(watch.ticker)||!idString(watch.eventTicker)
        ||!ALL_SAINTS.includes(watch.saint)||watch.version!==R17_VERSION)
        throw new Error('r17_persist_watch_invalid');
      const saved={...watch,status:'WATCHING',revision:1};
      const r=await c.query(`insert into sag_r17_golden_watches
        (authorization_id,system_name,owner_id,mode,reset_epoch,saint,parent_entry_id,ticker,
          card_fingerprint,status,revision,watch,updated_at_ms)
        values($1,$2,$3,$4,$5,$6,$7,$8,$9,'WATCHING',1,$10::jsonb,$11)
        on conflict(system_name,owner_id,mode,reset_epoch,saint,parent_entry_id)
        do nothing returning authorization_id`,
        [watch.authorizationId,s.systemName,s.ownerId,s.mode,s.resetEpoch,watch.saint,
          watch.parentEntryId,watch.ticker,watch.cardFingerprint,JSON.stringify(saved),Date.now()]);
      stored.push({saint:watch.saint,authorizationId:watch.authorizationId,created:r.rowCount===1});
    }
    return stored;
  }
  async armAthena(parentEntryId,settings){
    const scope=scopeFromSettings(settings);assertScope(scope);
    if(!idString(parentEntryId))throw new Error('r17_athena_parent_id_invalid');
    return this.transaction(async c=>{
      const current=await this.lockedSettings(c,scope);
      const auth=await this.shadowStore.athenaLossAuthorization(parentEntryId,scope,c);
      const valid=validateAthenaStop({authorization:auth,scope});
      if(!valid.ok)throw new Error(valid.reason);
      const fanout=fanoutAthenaLoss({verifiedStop:valid,cards:current.goldenSaints});
      if(!fanout.ok)throw new Error(fanout.reason);
      const result=await this.storeWatches(c,fanout.watches);
      return {ok:true,parentEntryId,proofHash:valid.proofHash,ticker:valid.ticker,
        eventTicker:valid.eventTicker,closedAtMs:valid.closedAtMs,
        eligible:result.length,created:result.filter(x=>x.created).length,watches:result};
    });
  }
  async armCapitalLoss(parentEntryId,settings){
    const scope=scopeFromSettings(settings);assertScope(scope);
    if(!idString(parentEntryId))throw new Error('r17_loss_parent_id_invalid');
    return this.transaction(async c=>{
      const current=await this.lockedSettings(c,scope);
      const p=await c.query(`select * from sag_entries where id=$1 and system_name=$2 and owner_id=$3
        and mode=$4 and archived=false for update`,
        [parentEntryId,scope.systemName,scope.ownerId,scope.mode]);
      const raw=p.rows?.[0];if(!raw)throw new Error('r17_loss_parent_missing');
      const parent=this.entryMapper(raw),role=saintRole(parent.conceptName)?.role;
      if(!['REGULAR','RECOVERY_1'].includes(role))throw new Error('r17_loss_stage_invalid');
      const verified=verifyR17CapitalNetLoss({entry:parent,scope,expectedRole:role});
      if(!verified.ok)throw new Error(verified.reason);
      const next=role==='REGULAR'?'Aquarius':'Pisces';
      const authorized=authorizeNextRecovery({verifiedLoss:verified,card:current.goldenSaints?.[next]});
      if(!authorized.ok)throw new Error(authorized.reason);
      const result=await this.storeWatches(c,[authorized.watch]);
      return {ok:true,parentEntryId,nextSaint:next,created:result[0].created,
        ticker:verified.ticker,eventTicker:verified.eventTicker,closedAtMs:verified.closedAtMs,
        realizedNetCents:verified.realizedNetCents,parentSaint:verified.parentSaint,
        regularRootId:verified.regularRootId,
        authorizationId:result[0].authorizationId};
    });
  }
  /** Crash-safe recovery of a capital loss whose close committed before
   * the in-memory callback could arm its child. Read only; the subsequent
   * armCapitalLoss still re-locks and revalidates the ORIGINAL broker/ledger
   * proof transactionally. Idempotency is the child's unique parent key.
   */
  async pendingRecoverableLosses(scope,{after=null,limit=80}={}){
    assertScope(scope);
    const possible=ALL_SAINTS.slice(0,11).map(r17InternalConcept);
    const r=await this.pool.query(`select e.id from sag_entries e
      where e.system_name=$1 and e.owner_id=$2 and e.mode=$3
        and e.shadow_epoch=$4 and e.concept_name = any($5::text[])
        and e.concept_name like 'R17:%' and e.execution_class='CAPITAL' and e.status='closed'
        and e.remaining_count=0 and e.pnl_cents<0 and e.archived=false
        and ($6::text is null or e.id > $6)
        and not exists (select 1 from sag_r17_golden_watches w
          where w.system_name=e.system_name and w.owner_id=e.owner_id
            and w.mode=e.mode and w.reset_epoch=e.shadow_epoch
            and w.parent_entry_id=e.id
            and w.saint=case when e.concept_name='R17:Aquarius' then 'Pisces' else 'Aquarius' end)
      order by e.id limit $7`,
      [scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,
        possible,after,Math.max(1,Math.min(80,limit))]);
    return (r.rows||[]).map(row=>String(row.id));
  }

  /** Crash-safe no-send recovery for a claim abandoned BEFORE any durable
   * seat. A worker may have died between claim() and reserveSeat(). A claim
   * older than the bounded lease is re-opened only after PostgreSQL locks the
   * watch and confirms there is NO seat (and therefore no broker intent).
   * Claim revision changes fence a previously delayed worker before it can
   * reserve or dispatch. Claims with any seat must NEVER be reopened here.
   */
  async reclaimAbandonedNoSeatClaims(scope,{minAgeMs=45000,limit=16,now=Date.now()}={}){
    assertScope(scope);
    const age=Number(minAgeMs),cap=Number(limit),at=Number(now);
    if(!safeInt(age,10000)||age>300000||!safeInt(cap,1)||cap>32
      ||!safeInt(at,scope.resetEpoch))throw new Error('r17_claim_recovery_bounds_invalid');
    return this.transaction(async c=>{
      const rows=await c.query(`select w.authorization_id,w.revision,w.watch
        from sag_r17_golden_watches w
        where w.system_name=$1 and w.owner_id=$2 and w.mode=$3 and w.reset_epoch=$4
          and w.status='EXECUTING' and w.updated_at_ms<=$5
          and not exists (select 1 from sag_r17_golden_seats s
            where s.authorization_id=w.authorization_id)
        order by w.updated_at_ms,w.authorization_id limit $6
        for update of w skip locked`,[scope.systemName,scope.ownerId,scope.mode,
          scope.resetEpoch,at-age,cap]);
      let recovered=0;
      for(const row of rows.rows||[]){
        if(!idString(row.authorization_id)||!safeInt(Number(row.revision),1)
          ||!row.watch||row.watch.authorizationId!==row.authorization_id
          ||!validateR17Scope(row.watch.scope).ok)throw new Error('r17_claim_recovery_watch_corrupt');
        const revised=Number(row.revision)+1;
        const watch={...row.watch,status:'WATCHING',revision:revised,
          claimedAtMs:0,retryNotBeforeMs:at+2000,updatedAtMs:at};
        const updated=await c.query(`update sag_r17_golden_watches w
          set status='WATCHING',revision=$2,watch=$3::jsonb,updated_at_ms=$4
          where w.authorization_id=$1 and w.status='EXECUTING' and w.revision=$5
            and not exists (select 1 from sag_r17_golden_seats s
              where s.authorization_id=w.authorization_id)
          returning w.authorization_id`,[row.authorization_id,revised,JSON.stringify(watch),at,Number(row.revision)]);
        recovered+=Number(updated.rowCount||0);
      }
      return {ok:true,recovered,examined:rows.rows?.length||0,
        reason:'r17_native_proven_no_seat_claim_recovery'};
    });
  }

  /** Card edits may rebind an existing unique parent authorization, but only
   * while it is WATCHING and native SQL proves that no seat of ANY state has
   * ever existed. The same settings -> watch -> parent lock order as capital
   * admission fences a concurrent claim or owner edit. This bounded repair is
   * called in the background lifecycle lane, never before every quote read.
   */
  async revalidateUnseatedWatches(scope,{after=null,limit=40,now=Date.now()}={}){
    assertScope(scope);
    if((after!==null&&!idString(after))||!safeInt(limit,1)||limit>40
      ||!safeInt(now,scope.resetEpoch))throw new Error('r17_card_revalidation_bounds_invalid');
    return this.transaction(async c=>{
      const current=await this.lockedSettings(c,scope);
      const enabled=ALL_SAINTS.filter(saint=>current.goldenSaints[saint]?.enabled===true);
      if(!enabled.length)return {ok:true,examined:0,revalidated:0,skipped:0,reasons:{},
        nextCursor:null,morePossible:false,authorizationIds:[]};
      const fingerprints=Object.fromEntries(enabled.map(saint=>
        [saint,r17CardFingerprint(current.goldenSaints[saint])]));
      const candidates=await c.query(`select w.authorization_id from sag_r17_golden_watches w
        where w.system_name=$1 and w.owner_id=$2 and w.mode=$3 and w.reset_epoch=$4
          and w.status='WATCHING' and ($5::text is null or w.authorization_id>$5)
          and w.saint=any($6::text[])
          and w.card_fingerprint is distinct from ($7::jsonb->>w.saint)
          and not exists (select 1 from sag_r17_golden_seats s
            where s.authorization_id=w.authorization_id)
        order by w.authorization_id limit $8`,
        [scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,after,enabled,
          JSON.stringify(fingerprints),limit]);
      // Keep skip-locked work visible to the cursor: a concurrent quote write
      // must not make a mismatched watch disappear for this card revision.
      // The preview and lock are both bounded; locked candidates are revisited
      // by the next ordinary background pass without holding up capital work.
      const rows=candidates.rows.length?await c.query(`select w.* from sag_r17_golden_watches w
        where w.authorization_id=any($1::text[]) and w.status='WATCHING'
          and not exists(select 1 from sag_r17_golden_seats s where s.authorization_id=w.authorization_id)
        order by w.authorization_id for update of w skip locked`,
        [candidates.rows.map(row=>row.authorization_id)]):{rows:[]};
      const retryRequired=rows.rows.length<candidates.rows.length;
      const authorizationIds=[],reasons={},parentWatches=new Map();
      const skip=reason=>{reasons[reason]=Number(reasons[reason]||0)+1;};
      for(const row of rows.rows||[]){
        const watch=normalizedRecord(row);
        if(!row.watch||!idString(row.authorization_id)||!idString(row.parent_entry_id)
          ||!ALL_SAINTS.includes(row.saint)||row.watch.version!==R17_VERSION
          ||row.watch.status!=='WATCHING'||Number(row.watch.revision)!==Number(row.revision)
          ||!validateR17Scope(row.watch.scope).ok||row.watch.authorizationId!==row.authorization_id
          ||row.watch.saint!==row.saint||row.watch.parentEntryId!==row.parent_entry_id
          ||row.watch.ticker!==row.ticker||row.watch.cardFingerprint!==row.card_fingerprint
          ||!strictSameScope(row.watch.scope,scope)||!safeInt(row.revision,1)
          ||row.authorization_id!==r17ScopedId('WATCH',scope,row.parent_entry_id,row.saint)){
          skip('r17_card_revalidation_watch_corrupt');continue;
        }
        const role=saintRole(watch.saint)?.role,card=current.goldenSaints[watch.saint];
        let authorizedWatch=null;
        if(role==='REGULAR'){
          if(!parentWatches.has(watch.parentEntryId)){
            // Both entry and proof are locked before reading authenticated
            // lineage; no financial field or proof is modified here.
            await c.query(`select e.id from sag_entries e join sag_shadow_stops_v3 p
              on p.parent_entry_id=e.id and p.system_name=e.system_name
                and p.owner_id=e.owner_id and p.mode=e.mode and p.reset_epoch=e.shadow_epoch
              where e.id=$1 and e.system_name=$2 and e.owner_id=$3 and e.mode=$4
                and e.shadow_epoch=$5 and e.archived=false for update of e,p`,
              [watch.parentEntryId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
            const auth=await this.shadowStore.athenaLossAuthorization(watch.parentEntryId,scope,c);
            const valid=validateAthenaStop({authorization:auth,scope,now});
            const fanout=valid.ok?fanoutAthenaLoss({verifiedStop:valid,cards:current.goldenSaints,now}):valid;
            parentWatches.set(watch.parentEntryId,fanout);
          }
          const result=parentWatches.get(watch.parentEntryId);
          if(!result.ok){skip(result.reason);continue;}
          authorizedWatch=result.watches.find(w=>w.saint===watch.saint);
        }else{
          const p=await c.query(`select * from sag_entries where id=$1 and system_name=$2
            and owner_id=$3 and mode=$4 and shadow_epoch=$5 and archived=false for update`,
            [watch.parentEntryId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
          const parent=p.rows?.[0]?this.entryMapper(p.rows[0]):null;
          const verified=verifyR17CapitalNetLoss({entry:parent,scope,now,
            expectedRole:role==='RECOVERY_1'?'REGULAR':'RECOVERY_1'});
          const result=verified.ok?authorizeNextRecovery({verifiedLoss:verified,card,now}):verified;
          if(!result.ok){skip(result.reason);continue;}
          authorizedWatch=result.watch;
        }
        const rebound=revalidateR17WatchCard({watch,authorizedWatch,card,now});
        if(!rebound.ok){skip(rebound.reason);continue;}
        const next={...rebound.watch,status:'WATCHING',revision:Number(row.revision)+1};
        const updated=await c.query(`update sag_r17_golden_watches w
          set card_fingerprint=$2,revision=$3,watch=$4::jsonb,updated_at_ms=$5
          where w.authorization_id=$1 and w.status='WATCHING' and w.revision=$6
            and not exists(select 1 from sag_r17_golden_seats s where s.authorization_id=w.authorization_id)
          returning w.authorization_id`,[row.authorization_id,next.cardFingerprint,next.revision,
            JSON.stringify(next),now,Number(row.revision)]);
        if(updated.rowCount===1)authorizationIds.push(row.authorization_id);
        else skip('r17_card_revalidation_raced');
      }
      const examined=rows.rows?.length||0,morePossible=retryRequired||candidates.rows.length===limit;
      return {ok:true,examined,revalidated:authorizationIds.length,
        skipped:examined-authorizationIds.length,reasons,authorizationIds,morePossible,retryRequired,
        nextCursor:retryRequired?after:(morePossible?candidates.rows.at(-1).authorization_id:null)};
    });
  }

  async page(scope,{ticker=null,limit=100,after=null,enabledFingerprints=null}={}){
    assertScope(scope);
    // Optional per-card filtering happens in PostgreSQL, saving 10^5 reads of
    // disabled/fingerprint-mismatched historical WATCHING rows. No rows are
    // deleted; bounded no-seat card revalidation repairs eligible mismatches
    // without weakening this reader's exact current-fingerprint fence.
    // Use strict parameterized text pairs rather than JSONB parameter coercion:
    // Node pg and alternative native drivers differ in JSON string encoding.
    if(enabledFingerprints!==null&&(typeof enabledFingerprints!=='object'
      ||Array.isArray(enabledFingerprints)))throw new Error('r17_page_fingerprint_map_invalid');
    const clauses=ALL_SAINTS.map((_,i)=>
      `(saint=$${9+2*i}::text and card_fingerprint=$${10+2*i}::text)`).join(' or ');
    const allowed=ALL_SAINTS.flatMap(saint=>[saint,enabledFingerprints?.[saint]||null]);
    const r=await this.pool.query(`select * from sag_r17_golden_watches
      where system_name=$1 and owner_id=$2 and mode=$3 and reset_epoch=$4
        and status='WATCHING' and ($5::text is null or ticker=$5)
        and ($6::text is null or authorization_id > $6)
        and ($8::boolean=false or (${clauses}))
      order by authorization_id limit $7`,
      [scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,ticker,after,
        Math.max(1,Math.min(500,limit)),enabledFingerprints!==null,...allowed]);
    return r.rows.map(normalizedRecord);
  }
  async get(scope,authorizationId){
    assertScope(scope);
    const r=await this.pool.query(`select * from sag_r17_golden_watches
      where authorization_id=$1 and system_name=$2 and owner_id=$3 and mode=$4 and reset_epoch=$5`,
      [authorizationId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
    return normalizedRecord(r.rows?.[0]);
  }
  async persistObserved(watch,expectedRevision){
    const s=watch?.scope;assertScope(s);
    if(!idString(watch.authorizationId)||!safeInt(expectedRevision,1))throw new Error('r17_observation_revision_invalid');
    const next={...watch,revision:Number(expectedRevision)+1};
    const r=await this.pool.query(`update sag_r17_golden_watches set watch=$8::jsonb,
      revision=revision+1,updated_at_ms=$9 where authorization_id=$1
      and system_name=$2 and owner_id=$3 and mode=$4 and reset_epoch=$5
      and saint=$6 and parent_entry_id=$7 and revision=$10 and status='WATCHING'
      returning *`,[watch.authorizationId,s.systemName,s.ownerId,s.mode,s.resetEpoch,
        watch.saint,watch.parentEntryId,JSON.stringify(next),Date.now(),expectedRevision]);
    return normalizedRecord(r.rows?.[0]);
  }
  async claim(watch,expectedRevision,card){
    const s=watch?.scope;assertScope(s);
    if(!idString(watch.authorizationId)||!safeInt(expectedRevision,1)
      ||r17CardFingerprint(card)!==watch.cardFingerprint||card.enabled!==true)
      throw new Error('r17_claim_invalid');
    return this.transaction(async c=>{
      const current=await this.lockedSettings(c,s);
      if(r17CardFingerprint(current.goldenSaints?.[watch.saint])!==watch.cardFingerprint
        ||current.goldenSaints[watch.saint].enabled!==true)throw new Error('r17_card_changed');
      const row=await c.query(`select * from sag_r17_golden_watches
        where authorization_id=$1 and system_name=$2 and owner_id=$3 and mode=$4
        and reset_epoch=$5 for update`,
        [watch.authorizationId,s.systemName,s.ownerId,s.mode,s.resetEpoch]);
      const saved=row.rows?.[0];
      if(!saved||saved.status!=='WATCHING'||Number(saved.revision)!==Number(expectedRevision)
        ||saved.saint!==watch.saint||saved.parent_entry_id!==watch.parentEntryId
        ||saved.card_fingerprint!==watch.cardFingerprint||saved.ticker!==watch.ticker)
        throw new Error('r17_watch_claim_changed');
      const next={...watch,status:'EXECUTING',revision:Number(expectedRevision)+1,
        claimedAtMs:Date.now()};
      await c.query(`update sag_r17_golden_watches set status='EXECUTING',
        revision=$2,watch=$3::jsonb,updated_at_ms=$4 where authorization_id=$1`,
        [watch.authorizationId,next.revision,JSON.stringify(next),Date.now()]);
      return next;
    });
  }
  /** A single atomic admission. No WATCH or SQL client may create a capital
   * entry by inserting sag_entries directly. Both parent and settings are
   * re-locked in the same PostgreSQL transaction that reserves a seat.
   * The external broker never runs while holding a database transaction.
   */

  // Compare-and-swap a claimed watch onto a newer authenticated quote that
  // has already requalified. Status stays EXECUTING. Revision advances once.
  // Never invents a timestamp, revision, bid or ask.
  async refreshClaimedObservation(watch,expectedRevision){
    const s=watch?.scope;assertScope(s);
    if(!idString(watch.authorizationId)||!safeInt(expectedRevision,1))throw new Error('r17_observation_revision_invalid');
    return this.transaction(async c=>{
      const row=await c.query(`select * from sag_r17_golden_watches
        where authorization_id=$1 and system_name=$2 and owner_id=$3 and mode=$4
        and reset_epoch=$5 for update`,
        [watch.authorizationId,s.systemName,s.ownerId,s.mode,s.resetEpoch]);
      const saved=row.rows?.[0];
      if(!saved||saved.status!=='EXECUTING'||Number(saved.revision)!==Number(expectedRevision)
        ||saved.saint!==watch.saint||saved.ticker!==watch.ticker)
        throw new Error('r17_watch_claim_changed');
      const next={...watch,status:'EXECUTING',revision:Number(expectedRevision)+1};
      await c.query(`update sag_r17_golden_watches set revision=$2,watch=$3::jsonb,
        updated_at_ms=$4 where authorization_id=$1`,
        [watch.authorizationId,next.revision,JSON.stringify(next),Date.now()]);
      return next;
    });
  }

  async reserveSeat({scope,watch,expectedRevision,seat,entry,requiredCents,confirmReservation=null}={}){
    assertScope(scope);
    if(!watch||!entry||!safeInt(expectedRevision,1)||!safeInt(seat,1)||seat>20
      ||!idString(watch.authorizationId)||!idString(entry.id)||!idString(entry.sourceTradeId)
      ||entry.conceptName!==r17InternalConcept(watch.saint)||entry.executionClass!=='CAPITAL'
      ||entry.entryConfig?.goldenSaintR17?.version!==R17_VERSION
      ||entry.entryConfig?.goldenSaintR17?.watchAuthorizationId!==watch.authorizationId
      ||entry.entryConfig?.goldenSaintR17?.parentEntryId!==watch.parentEntryId
      ||Number(entry.entryConfig?.goldenSaintR17?.seat)!==Number(seat)
      ||Number(entry.shadowEpoch)!==Number(scope.resetEpoch)
      ||entry.id!==r17ScopedId('ENTRY',scope,watch.parentEntryId,watch.saint,seat)
      ||entry.systemName!==scope.systemName||entry.ownerId!==scope.ownerId
      ||entry.mode!==scope.mode||entry.sourceTradeId!==watch.parentEntryId
      ||entry.ticker!==watch.ticker||entry.eventTicker!==watch.eventTicker
      ||entry.status!==(scope.mode==='LIVE'?'entry_pending':'open')
      ||Number(entry.count)<1||!Number.isSafeInteger(Number(entry.count))
      ||Number(entry.remainingCount)!==Number(entry.count)||Number(entry.entryPriceCents)<=0
      ||Number(entry.entryPriceCents)>=100||!Number.isFinite(requiredCents)||requiredCents<=0)
      throw new Error('r17_seat_insert_input_invalid');
    if(saintRole(watch.saint)?.role==='REGULAR'&&typeof confirmReservation!=='function')
      throw new Error('r17_regular_reservation_clock_confirmation_required');
    if(scope.mode==='SIMULATION'&&(entry.entryOrderId||entry.entryClientOrderId))throw new Error('r17_sim_has_broker_identity');
    if(scope.mode==='LIVE'&&(!idString(entry.entryClientOrderId)||entry.entryOrderId||Number(entry.entryFeeCents||0)!==0))
      throw new Error('r17_live_intent_identity_invalid');
    const target=Number(entry.entryConfig?.economicTarget?.netPerOriginalContractCents);
    const fee=scope.mode==='SIMULATION'?Number(entry.entryFeeCents):Number(entry.entryConfig?.auroraPending?.preflight?.entryFeeCents);
    const max=maximumSettlementNetAdmission({entryPriceCents:Number(entry.entryPriceCents),count:Number(entry.count),
      entryFeeCents:fee,minimumNetPerOriginalContractCents:target});
    if(!max.ok||Math.abs(requiredCents-(Number(entry.entryPriceCents)*Number(entry.count)+fee))>0.011)
      throw new Error('r17_entry_economics_invalid');
    return this.transaction(async c=>{
      const current=await this.lockedSettings(c,scope);
      const card=current.goldenSaints?.[watch.saint];
      if(!card||card.enabled!==true||r17CardFingerprint(card)!==watch.cardFingerprint
        ||current.engineActive!==true||(scope.mode==='LIVE'&&(current.liveArmed!==true||current.liveOwnerAuthorized!==true)))
        throw new Error('r17_current_card_or_mode_invalid');
      if(seat>Number(card.multiply)||Number(entry.entryConfig?.goldenSaintR17?.maximumSeats)!==Number(card.multiply))
        throw new Error('r17_multiply_seat_changed');
      const wr=await c.query(`select * from sag_r17_golden_watches where authorization_id=$1
        and system_name=$2 and owner_id=$3 and mode=$4 and reset_epoch=$5 for update`,
        [watch.authorizationId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
      const stored=wr.rows?.[0];
      if(!stored||stored.status!=='EXECUTING'||Number(stored.revision)!==Number(expectedRevision)
        ||stored.saint!==watch.saint||stored.parent_entry_id!==watch.parentEntryId
        ||stored.card_fingerprint!==watch.cardFingerprint||stored.ticker!==entry.ticker
        ||Number(stored.watch?.lastQuoteAtMs)!==Number(watch.lastQuoteAtMs)
        ||stored.watch?.parentProofHash!==watch.parentProofHash)
        throw new Error('r17_watch_changed_since_claim');
      // The SQL admission fence must independently prove strategy qualification
      // from the LOCKED persisted observation. It cannot trust a caller's
      // claim that an earlier loop applied the rebound or LINK rules.
      const storedWatch={...stored.watch,status:'EXECUTING',revision:Number(stored.revision),
        authorizationId:stored.authorization_id,saint:stored.saint};
      const lastObservedQuote=r17PersistedObservationQuote(storedWatch);
      const eligible=r17QualifiedObservationEvidence({watch:storedWatch,card,
        quote:lastObservedQuote,now:Date.now()});
      const stamped=entry.entryConfig?.goldenSaintR17?.signalEligibility;
      if(!eligible.ok||JSON.stringify(eligible.evidence)!==JSON.stringify(stamped)
        ||Number(entry.entryConfig?.finalEntryConfirmation?.quoteAtMs)!==Number(storedWatch.lastQuoteAtMs)
        ||Number(entry.entryConfig?.finalEntryConfirmation?.bidCents)!==Number(storedWatch.lastBidCents)
        ||Number(entry.entryConfig?.finalEntryConfirmation?.askCents)!==Number(storedWatch.lastAskCents))
        throw new Error('r17_native_signal_qualification_unverified');
      const role=saintRole(watch.saint)?.role;
      if(role==='REGULAR'){
        const auth=await this.shadowStore.athenaLossAuthorization(watch.parentEntryId,scope,c);
        const valid=validateAthenaStop({authorization:auth,scope});
        if(!valid.ok||valid.proofHash!==watch.parentProofHash
          ||valid.ticker!==entry.ticker||valid.eventTicker!==entry.eventTicker)
          throw new Error('r17_athena_parent_changed');
      }else{
        const p=await c.query(`select * from sag_entries where id=$1 and system_name=$2
          and owner_id=$3 and mode=$4 and archived=false for update`,
          [watch.parentEntryId,scope.systemName,scope.ownerId,scope.mode]);
        const parent=p.rows?.[0]?this.entryMapper(p.rows[0]):null;
        const verified=verifyR17CapitalNetLoss({entry:parent,scope,
          expectedRole:role==='RECOVERY_1'?'REGULAR':'RECOVERY_1'});
        if(!verified.ok||verified.ticker!==entry.ticker||verified.eventTicker!==entry.eventTicker
          ||verified.regularRootId!==entry.entryConfig?.goldenSaintR17?.regularRootId)
          throw new Error('r17_recovery_parent_changed');
      }
      const all=await c.query(`select seat,entry_id,state from sag_r17_golden_seats
        where authorization_id=$1 for update`,[watch.authorizationId]);
      if(all.rows.some(x=>Number(x.seat)===seat||x.entry_id===entry.id))
        throw new Error('r17_seat_already_reserved');
      const count=await c.query(`select count(*)::int as active from sag_entries
        where system_name=$1 and owner_id=$2 and mode=$3 and archived=false
          and execution_class='CAPITAL'
          and status in ('open','entry_pending','exit_pending','pending_recovery')`,
        [scope.systemName,scope.ownerId,scope.mode]);
      if(Number(count.rows?.[0]?.active||0)>=Number(current.maxPositions))
        throw new Error('r17_max_positions_reached');
      if(scope.mode==='SIMULATION'){
        const cash=await this.simCashCalculator(scope.systemName,{
          simFeeCents:Number(current.simFeeCents||0),ownerId:scope.ownerId,
          realizedSinceMs:Number(current.resetTimestampMs||0)},c);
        const available=Number(current.startingCapitalCents)+Number(cash.realizedCents)-Number(cash.reservedCents);
        if(!Number.isFinite(available)||available+1e-7<requiredCents)
          throw new Error('r17_sim_available_cash_insufficient');
      }
      const confirm=phase=>{
        if(confirmReservation===null)return;
        if(typeof confirmReservation!=='function')throw new Error('r17_reservation_confirmation_invalid');
        const decision=confirmReservation({settings:current,phase});
        if(decision&&typeof decision.then==='function')throw new Error('r17_reservation_confirmation_must_be_synchronous');
        if(decision?.ok!==true)throw new Error(String(decision?.reason||'r17_reservation_confirmation_denied'));
      };
      // Recheck with the LOCKED owner card after lock/cash/proof waits, then
      // after the awaited writes so a closing window rolls back the entire
      // transaction before COMMIT is requested. No network work in this hook.
      confirm('before_write');
      await this.entryWriter(entry,c);
      await c.query(`insert into sag_r17_golden_seats
        (authorization_id,seat,entry_id,client_order_id,state,updated_at_ms)
        values($1,$2,$3,$4,$5,$6)`,[watch.authorizationId,seat,entry.id,
        entry.entryClientOrderId||null,scope.mode==='LIVE'?'PENDING_BROKER':'FUNDED',Date.now()]);
      confirm('before_commit');
      return {ok:true,entryId:entry.id,watchAuthorizationId:watch.authorizationId,seat};
    });
  }

  /** A claim is retryable ONLY if PostgreSQL proves absolutely no seat was
   * inserted, hence no durable broker intent could have been transmitted.
   * Never reopen after any seat ID, even a rejected or ambiguous order.
   */
  async releaseClaimNoSend(scope,authorizationId,revision){
    assertScope(scope);
    if(!idString(authorizationId)||!safeInt(revision,1))throw new Error('r17_release_identity_invalid');
    return this.transaction(async c=>{
      const r=await c.query(`select * from sag_r17_golden_watches where authorization_id=$1
        and system_name=$2 and owner_id=$3 and mode=$4 and reset_epoch=$5 for update`,
        [authorizationId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
      const w=r.rows?.[0];
      if(!w||w.status!=='EXECUTING'||Number(w.revision)!==Number(revision))
        return {ok:false,reason:'r17_release_watch_not_claimed'};
      const seats=await c.query(`select count(*)::int as seats from sag_r17_golden_seats
        where authorization_id=$1`,[authorizationId]);
      if(Number(seats.rows?.[0]?.seats)!==0)
        return {ok:false,reason:'r17_release_capital_seat_exists'};
      const next={...w.watch,status:'WATCHING',revision:revision+1,
        retryNotBeforeMs:Date.now()+1500};
      await c.query(`update sag_r17_golden_watches set status='WATCHING',revision=$2,
        watch=$3::jsonb,updated_at_ms=$4 where authorization_id=$1`,
        [authorizationId,revision+1,JSON.stringify(next),Date.now()]);
      return {ok:true,reason:'r17_durable_no_seat_proved'};
    });
  }

  async verifyLiveIntent(scope,entryId){
    assertScope(scope);if(scope.mode!=='LIVE'||!idString(entryId))return {ok:false,reason:'r17_live_scope_or_id_invalid'};
    const q=await this.pool.query(`select e.*,w.watch,w.status as watch_status,w.revision as watch_revision,
       x.state as seat_state,x.seat as claimed_seat,s.value as settings
       from sag_entries e join sag_r17_golden_seats x on x.entry_id=e.id
       join sag_r17_golden_watches w on w.authorization_id=x.authorization_id
       join sag_settings s on s.key='runtime'
       where e.id=$1 and e.system_name=$2 and e.owner_id=$3 and e.mode='LIVE'
         and w.system_name=$2 and w.owner_id=$3 and w.mode='LIVE' and w.reset_epoch=$4`,
       [entryId,scope.systemName,scope.ownerId,scope.resetEpoch]);
    const raw=q.rows?.[0];if(!raw)return {ok:false,reason:'r17_live_intent_missing'};
    const settings=raw.settings||{};
    const card=normalizeGoldenSaintCards(settings,settings.goldenSaints)[raw.watch?.saint];
    const cfg=raw.entry_config?.goldenSaintR17;
    if(settings.mode!=='LIVE'||settings.liveArmed!==true||settings.liveOwnerAuthorized!==true
      ||settings.engineActive!==true||Number(settings.resetTimestampMs)!==scope.resetEpoch
      ||settings.ownerId!==scope.ownerId||settings.systemName!==scope.systemName
      ||!card||card.enabled!==true||r17CardFingerprint(card)!==raw.watch?.cardFingerprint
      ||raw.watch_status!=='EXECUTING'||raw.seat_state!=='PENDING_BROKER'
      ||Number(raw.claimed_seat)!==Number(cfg?.seat)||raw.status!=='entry_pending'
      ||raw.entry_order_id||!idString(raw.entry_client_order_id)||raw.execution_class!=='CAPITAL'
      ||raw.concept_name!==r17InternalConcept(raw.watch?.saint)||cfg?.version!==R17_VERSION
      ||cfg?.watchAuthorizationId!==raw.watch?.authorizationId
      ||!Number.isSafeInteger(Number(raw.entry_config?.brokerRouting?.exchangeIndex))
      ||Number(raw.entry_config.brokerRouting.exchangeIndex)<0)
      return {ok:false,reason:'r17_live_intent_drift'};
    return {ok:true,reason:'r17_live_intent_current',entryId};
  }

  /** A genuine LOCAL notSubmitted result is the only releaseable no-send.
   * Atomically terminate its funded-intent accounting and seat under a row
   * lock; a network timeout or an accepted/partially filled order must never
   * enter this method. Do not delete the ledger or original client order ID.
   */
  async finalizeProvenNoSend(scope,entryId){
    assertScope(scope);
    if(scope.mode!=='LIVE'||!idString(entryId))throw new Error('r17_no_send_scope_invalid');
    return this.transaction(async c=>{
      const record=await c.query(`select e.id,e.status,e.entry_order_id,
        e.entry_client_order_id,e.concept_name,e.execution_class,
        e.entry_config,w.system_name,w.owner_id,w.mode,w.reset_epoch,
        w.watch,x.state as seat_state,x.client_order_id as reserved_client
        from sag_entries e join sag_r17_golden_seats x on x.entry_id=e.id
        join sag_r17_golden_watches w on w.authorization_id=x.authorization_id
        where e.id=$1 and e.system_name=$2 and e.owner_id=$3 and e.mode='LIVE'
          and w.system_name=$2 and w.owner_id=$3 and w.mode='LIVE'
          and w.reset_epoch=$4 for update of e,x,w`,
        [entryId,scope.systemName,scope.ownerId,scope.resetEpoch]);
      const e=record.rows?.[0],stamp=e?.entry_config?.goldenSaintR17;
      if(!e||e.status!=='entry_pending'||e.entry_order_id||!e.entry_client_order_id
        ||e.entry_client_order_id!==e.reserved_client
        ||e.execution_class!=='CAPITAL'||e.concept_name!==r17InternalConcept(e.watch?.saint)
        ||e.seat_state!=='PENDING_BROKER'||stamp?.version!==R17_VERSION
        ||stamp?.watchAuthorizationId!==e.watch?.authorizationId)
        throw new Error('r17_local_no_send_intent_changed');
      const updated=await c.query(`update sag_entries set status='rejected',remaining_count=0,
        close_reason='live_entry_not_dispatched',updated_at_ms=$2 where id=$1
        and status='entry_pending' and entry_order_id is null returning id`,[entryId,Date.now()]);
      if(updated.rowCount!==1)throw new Error('r17_no_send_entry_commit_changed');
      const seat=await c.query(`update sag_r17_golden_seats set state='DENIED_NO_SEND',
        updated_at_ms=$2 where entry_id=$1 and state='PENDING_BROKER' returning entry_id`,[entryId,Date.now()]);
      if(seat.rowCount!==1)throw new Error('r17_no_send_seat_commit_changed');
      return {ok:true,reason:'r17_proven_local_no_send_terminal'};
    });
  }

  async markSeat(scope,entryId,state){
    assertScope(scope);
    if(!['FUNDED','DENIED_NO_SEND','UNCERTAIN'].includes(state))throw new Error('r17_seat_status_invalid');
    const r=await this.pool.query(`update sag_r17_golden_seats x set state=$2,updated_at_ms=$3
      from sag_r17_golden_watches w where x.authorization_id=w.authorization_id
      and x.entry_id=$1 and w.system_name=$4 and w.owner_id=$5 and w.mode=$6
      and w.reset_epoch=$7 returning x.entry_id`,[entryId,state,Date.now(),scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
    if(!r.rowCount)throw new Error('r17_seat_missing');
    return {ok:true};
  }

  async closeWatch(scope,authorizationId){
    assertScope(scope);
    const r=await this.pool.query(`update sag_r17_golden_watches set status='CONSUMED',
       revision=revision+1,updated_at_ms=$6 where authorization_id=$1
       and system_name=$2 and owner_id=$3 and mode=$4 and reset_epoch=$5
       and status='EXECUTING' returning authorization_id`,
      [authorizationId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,Date.now()]);
    return {ok:r.rowCount===1};
  }

  /** Broker-proven terminal market has no executable new-entry path.
   * This is a durable WATCHING -> BLOCKED transition only. It never modifies
   * any funded/possibly-sent seat and never removes recovery loss evidence.
   * The caller must supply fresh, same-ticker final/settled broker evidence.
   */
  async retireTerminalWatches(scope,{ticker,proof,limit=40}={}){
    assertScope(scope);
    if(!idString(ticker)||proof?.ticker!==ticker
      ||!['settled','finalized'].includes(proof?.status)
      ||!['yes','no'].includes(String(proof?.result||'').toLowerCase())
      ||!['REST','BROKER_REST','WS','WS_TICKER','WS_BOOK','LIFECYCLE'].includes(proof?.source)
      ||!safeInt(proof?.observedAtMs,1)||Number(proof.observedAtMs)>Date.now()+3000)
      throw new Error('r17_terminal_market_proof_invalid');
    const cap=Math.min(40,Math.max(1,Math.trunc(Number(limit)||40)));
    return this.transaction(async c=>{
      const selected=await c.query(`select w.authorization_id,w.revision,w.watch
        from sag_r17_golden_watches w
        where w.system_name=$1 and w.owner_id=$2 and w.mode=$3
          and w.reset_epoch=$4 and w.ticker=$5 and w.status='WATCHING'
          and not exists (select 1 from sag_r17_golden_seats s
            where s.authorization_id=w.authorization_id)
        order by w.authorization_id limit $6 for update of w skip locked`,
        [scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch,ticker,cap]);
      let retired=0;
      for(const row of selected.rows||[]){
        if(row.watch?.ticker!==ticker||row.watch?.authorizationId!==row.authorization_id
          ||!safeInt(row.revision,1))throw new Error('r17_terminal_watch_corrupt');
        const watch={...row.watch,status:'BLOCKED',revision:Number(row.revision)+1,
          terminalMarketProof:{...proof},updatedAtMs:Date.now()};
        const updated=await c.query(`update sag_r17_golden_watches w
          set status='BLOCKED',revision=$2,watch=$3::jsonb,updated_at_ms=$4
          where w.authorization_id=$1 and w.revision=$5 and w.status='WATCHING'
            and not exists (select 1 from sag_r17_golden_seats s
              where s.authorization_id=w.authorization_id)
          returning w.authorization_id`,[row.authorization_id,watch.revision,
            JSON.stringify(watch),watch.updatedAtMs,Number(row.revision)]);
        retired+=Number(updated.rowCount||0);
      }
      return {ok:true,retired,examined:selected.rows?.length||0,
        morePossible:(selected.rows?.length||0)===cap,reason:'r17_broker_terminal_watch_retired'};
    });
  }

  async seats(scope,authorizationId){
    assertScope(scope);
    const r=await this.pool.query(`select s.* from sag_r17_golden_seats s
      join sag_r17_golden_watches w using(authorization_id)
      where w.authorization_id=$1 and w.system_name=$2 and w.owner_id=$3
        and w.mode=$4 and w.reset_epoch=$5 order by s.seat`,
      [authorizationId,scope.systemName,scope.ownerId,scope.mode,scope.resetEpoch]);
    return r.rows;
  }
}
