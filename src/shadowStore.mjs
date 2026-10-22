/**
 * MW1-R3: transactional shadow ledger and stop handoff.
 * Uses the SAME PostgreSQL client and runtime-card lock for every transaction.
 * No in-memory fallback grants entry/close authority when storage is unavailable.
 */
import { verifyShadowEvaluationReceipt } from './profitGuard.mjs';
import { admitShadowStarlight } from './shadowStarlight.mjs';
import { authorityHash } from './authority.mjs';
import { isShadowSaintEntry, starlightParentLossMayArmRecovery } from './doctrine.mjs';
import { SHADOW_PROTOCOL, executionSettingsHash, SHADOW_RUNTIME_LOCK, SHADOW_SQL, CAPITAL_SQL, shadowScope,
  sameShadowScope, entryMatchesShadowScope, validateShadowEntry, validateShadowEntryWitness, shadowEntryHash, shadowAdmissionId,
  validateShadowObservation, shadowDanger, buildShadowCloseProof, shadowWatchFromProof } from './shadowProtocol.mjs';

export const SHADOW_SCHEMA_SQL = `
  alter table sag_entries add column if not exists execution_class text;
  alter table sag_entries add column if not exists shadow_epoch bigint;
  alter table sag_entries add column if not exists shadow_revision bigint not null default 0;
  alter table sag_entries add column if not exists shadow_entry_hash text;
  alter table sag_entries add column if not exists shadow_state jsonb not null default '{}'::jsonb;
  alter table sag_entries add column if not exists shadow_last_evaluated_at_ms bigint not null default 0;
  create table if not exists sag_shadow_architecture_v3 (
    version text primary key, activated_at_ms bigint not null,
    legacy_policy text not null
  );
  insert into sag_shadow_architecture_v3(version,activated_at_ms,legacy_policy)
    values ('MW1-R3-DURABLE-SHADOW',(extract(epoch from clock_timestamp())*1000)::bigint,
      'PRESERVE_EXISTING_REAL_POSITIONS_AND_WATCHES;QUARANTINE_UNVERIFIED_OLD_SHADOWS')
    on conflict(version) do nothing;
  create table if not exists sag_shadow_stops_v3 (
    parent_entry_id text primary key references sag_entries(id),
    system_name text not null,owner_id text not null,mode text not null,reset_epoch bigint not null,
    proof_hash text not null,proof jsonb not null,closed_at_ms bigint not null,
    delivery_status text not null check(delivery_status in ('PENDING','DELIVERED','DISABLED_AT_CLOSE')),
    delivered_at_ms bigint
  );
  create index if not exists sag_shadow_open_work_v3
    on sag_entries(system_name,owner_id,mode,shadow_epoch,shadow_last_evaluated_at_ms,id)
    where execution_class='SHADOW_SAINT' and status='open' and archived=false;
  create index if not exists sag_shadow_event_admission_v3
    on sag_entries(system_name,owner_id,mode,shadow_epoch,event_ticker,concept_name)
    where execution_class='SHADOW_SAINT';
  create index if not exists sag_shadow_pending_handoff_v3
    on sag_shadow_stops_v3(system_name,owner_id,mode,reset_epoch,closed_at_ms,parent_entry_id)
    where delivery_status='PENDING';
  create index if not exists sag_starlight_results_v3
    on sag_entries(system_name,mode,status,closed_at_ms desc)
    where concept_name='Crash Recovery Hunter' and archived=false;
  create or replace function sag_shadow_identity_guard_v3() returns trigger language plpgsql as $$
  declare prior_class text;
  begin
    if NEW.execution_class is not null and NEW.entry_config->>'executionClass' is not null
      and NEW.execution_class <> NEW.entry_config->>'executionClass' then
      raise exception 'execution classification conflict';
    end if;
    if TG_OP='UPDATE' then
      prior_class:=coalesce(OLD.execution_class,OLD.entry_config->>'executionClass','CAPITAL');
      if coalesce(NEW.execution_class,NEW.entry_config->>'executionClass','CAPITAL')<>prior_class then
        raise exception 'execution classification is immutable';
      end if;
      if prior_class='SHADOW_SAINT' and OLD.status='closed' and (
        NEW.status is distinct from OLD.status or NEW.remaining_count is distinct from OLD.remaining_count or
        NEW.pnl_cents is distinct from OLD.pnl_cents or NEW.exit_price_cents is distinct from OLD.exit_price_cents or
        NEW.exit_fee_cents is distinct from OLD.exit_fee_cents or NEW.exit_filled_count is distinct from OLD.exit_filled_count or
        NEW.exit_notional_cents is distinct from OLD.exit_notional_cents or NEW.close_reason is distinct from OLD.close_reason or
        NEW.closed_at_ms is distinct from OLD.closed_at_ms or NEW.shadow_state is distinct from OLD.shadow_state) then raise exception 'shadow close economics and proof are immutable'; end if;
      if prior_class='SHADOW_SAINT' and (
        NEW.id is distinct from OLD.id or NEW.system_name is distinct from OLD.system_name or
        NEW.owner_id is distinct from OLD.owner_id or NEW.mode is distinct from OLD.mode or
        NEW.concept_name is distinct from OLD.concept_name or NEW.ticker is distinct from OLD.ticker or
        NEW.event_ticker is distinct from OLD.event_ticker or NEW.source_trade_id is distinct from OLD.source_trade_id or
        NEW.source_feeder is distinct from OLD.source_feeder or NEW.opened_at_ms is distinct from OLD.opened_at_ms or
        NEW.entry_price_cents is distinct from OLD.entry_price_cents or NEW.count is distinct from OLD.count or
        NEW.entry_fee_cents is distinct from OLD.entry_fee_cents or NEW.entry_config is distinct from OLD.entry_config or
        NEW.shadow_epoch is distinct from OLD.shadow_epoch or NEW.shadow_entry_hash is distinct from OLD.shadow_entry_hash) then
        raise exception 'shadow entry identity and frozen authorization are immutable';
      end if;
    end if;
    if coalesce(NEW.execution_class,NEW.entry_config->>'executionClass','CAPITAL')='SHADOW_SAINT' then
      if NEW.entry_order_id is not null or NEW.entry_client_order_id is not null or
         NEW.exit_order_id is not null or NEW.exit_client_order_id is not null then
        raise exception 'shadow entries may not carry broker orders';
      end if;
      if NEW.concept_name='Crash Recovery Hunter' and NEW.entry_config#>>'{starlightShadow,version}'
        is distinct from 'APS2-VIRTUAL-STARLIGHT-V1' then raise exception 'verified virtual Starlight required'; end if;
      if NEW.concept_name='Crash Recovery Hunter' then
        if TG_OP='INSERT' or NEW.shadow_revision is distinct from OLD.shadow_revision
          or NEW.status is distinct from OLD.status or NEW.shadow_state is distinct from OLD.shadow_state
          or NEW.remaining_count is distinct from OLD.remaining_count
          or NEW.pnl_cents is distinct from OLD.pnl_cents then
          if current_setting('sag.aps2_shadow_writer',true) is distinct from 'APS2-VIRTUAL-STARLIGHT-V1' then
            raise exception 'APS2 virtual Starlight writer fence required';
          end if;
        end if;
        if TG_OP='UPDATE' and OLD.status='open' and NEW.status='closed' then
          if not coalesce(NEW.remaining_count=0 and NEW.exit_filled_count=NEW.count
            and NEW.shadow_revision=OLD.shadow_revision+1
            and NEW.shadow_state#>>'{closeProof,parentEntryId}'=NEW.id
            and NEW.shadow_state#>>'{closeProof,entryHash}'=NEW.shadow_entry_hash
            and NEW.shadow_state#>>'{closeProof,brokerOrderAuthority}'='false'
            and NEW.shadow_state#>>'{closeProof,full}'='true'
            and (NEW.shadow_state#>>'{closeProof,expectedRevision}')::bigint=OLD.shadow_revision
            and (NEW.shadow_state#>>'{closeProof,count}')::int=NEW.count
            and (NEW.shadow_state#>>'{closeProof,filled}')::int=NEW.count
            and (NEW.shadow_state#>>'{closeProof,pnlCents}')::numeric=NEW.pnl_cents::numeric
            and (NEW.shadow_state#>>'{closeProof,closedAtMs}')::bigint=NEW.closed_at_ms
            and NEW.shadow_state#>>'{closeProof,closeReason}'=NEW.close_reason
            and nullif(NEW.shadow_state->>'closeProofHash','') is not null,false) then
            raise exception 'atomic complete virtual Starlight close proof required';
          end if;
        end if;
      end if;
    end if;
    return NEW;
  end $$;
  drop trigger if exists sag_shadow_identity_v3 on sag_entries;
  create trigger sag_shadow_identity_v3 before insert or update on sag_entries
    for each row execute function sag_shadow_identity_guard_v3();
  create or replace function sag_shadow_proof_guard_v3() returns trigger language plpgsql as $$
  begin
    if NEW.parent_entry_id is distinct from OLD.parent_entry_id or NEW.system_name is distinct from OLD.system_name or
      NEW.owner_id is distinct from OLD.owner_id or NEW.mode is distinct from OLD.mode or
      NEW.reset_epoch is distinct from OLD.reset_epoch or NEW.proof_hash is distinct from OLD.proof_hash or
      NEW.proof is distinct from OLD.proof or NEW.closed_at_ms is distinct from OLD.closed_at_ms then
      raise exception 'shadow stop proof is immutable';
    end if;
    if OLD.delivery_status in ('DELIVERED','DISABLED_AT_CLOSE') and NEW.delivery_status <> OLD.delivery_status then
      raise exception 'shadow handoff cannot replay';
    end if;
    return NEW;
  end $$;
  drop trigger if exists sag_shadow_proof_v3 on sag_shadow_stops_v3;
  create trigger sag_shadow_proof_v3 before update on sag_shadow_stops_v3
    for each row execute function sag_shadow_proof_guard_v3();
  create or replace function sag_shadow_watch_guard_v3() returns trigger language plpgsql as $$
  begin
    if OLD.watch->>'shadowProtocol'='MW1-R3-DURABLE-SHADOW' then
      if NEW.system_name is distinct from OLD.system_name or NEW.owner_id is distinct from OLD.owner_id or
        NEW.mode is distinct from OLD.mode or NEW.reset_epoch is distinct from OLD.reset_epoch or
        NEW.authorization_id is distinct from OLD.authorization_id or NEW.parent_entry_id is distinct from OLD.parent_entry_id or
        (NEW.watch->'shadowProofHash') is distinct from (OLD.watch->'shadowProofHash') or
        (NEW.watch->'shadowProtocol') is distinct from (OLD.watch->'shadowProtocol') or
        (NEW.watch->'systemName') is distinct from (OLD.watch->'systemName') or
        (NEW.watch->'ownerId') is distinct from (OLD.watch->'ownerId') or
        (NEW.watch->'mode') is distinct from (OLD.watch->'mode') or
        (NEW.watch->'resetEpoch') is distinct from (OLD.watch->'resetEpoch') or
        (NEW.watch->'authorizationId') is distinct from (OLD.watch->'authorizationId') or
        (NEW.watch->'authorization') is distinct from (OLD.watch->'authorization') or
        (NEW.watch->'parentEntryId') is distinct from (OLD.watch->'parentEntryId') or
        (NEW.watch->'parentConcept') is distinct from (OLD.watch->'parentConcept') or
        (NEW.watch->'ticker') is distinct from (OLD.watch->'ticker') or
        (NEW.watch->'eventTicker') is distinct from (OLD.watch->'eventTicker') or
        (NEW.watch->'stopPriceCents') is distinct from (OLD.watch->'stopPriceCents') or
        (NEW.watch->'stoppedAtMs') is distinct from (OLD.watch->'stoppedAtMs') then
        raise exception 'shadow recovery proof and identity are immutable';
      end if;
      if OLD.status in ('CONSUMED','BLOCKED','EXPIRED','CANCELLED') and NEW.status <> OLD.status then
        raise exception 'terminal shadow recovery may not replay';
      end if;
    end if;
    return NEW;
  end $$;
  drop trigger if exists sag_shadow_watch_v3 on sag_starlight_recovery_v1;
  create trigger sag_shadow_watch_v3 before update on sag_starlight_recovery_v1
    for each row execute function sag_shadow_watch_guard_v3();

  -- LP-AUTH-V1: reject LP-origin Starlight watches at the database boundary.
  -- This also fences a prior-version worker during a rolling deployment.
  create or replace function sag_lp_starlight_watch_guard_v1() returns trigger language plpgsql as $$
  begin
    if NEW.status not in ('BLOCKED','CONSUMED','EXPIRED','CANCELLED')
      and exists (select 1 from sag_entries parent where parent.id=NEW.parent_entry_id
        and parent.system_name=NEW.system_name and parent.owner_id=NEW.owner_id
        and parent.mode=NEW.mode and parent.concept_name in ('Lightning Plasma','Crash Recovery Hunter')) then
      raise exception 'lightning_plasma_parent_no_starlight_watch';
    end if;
    return NEW;
  end $$;
  drop trigger if exists sag_lp_starlight_watch_v1 on sag_starlight_recovery_v1;
  create trigger sag_lp_starlight_watch_v1 before insert or update on sag_starlight_recovery_v1
    for each row execute function sag_lp_starlight_watch_guard_v1();

  -- Final DB wall: even an old worker holding a pre-upgrade authorization
  -- cannot insert a new Starlight BUY intent sourced from a Lightning parent.
  -- Existing capital children stay intact for normal exits/reconciliation.
  create or replace function sag_lp_starlight_entry_guard_v1() returns trigger language plpgsql as $$
  begin
    if NEW.concept_name='Crash Recovery Hunter' and NEW.source_trade_id is not null
      and exists (select 1 from sag_entries parent where parent.id=NEW.source_trade_id
        and parent.concept_name in ('Lightning Plasma','Crash Recovery Hunter')) then
      raise exception 'lightning_plasma_parent_no_starlight_entry';
    end if;
    return NEW;
  end $$;
  drop trigger if exists sag_lp_starlight_entry_v1 on sag_entries;
  create trigger sag_lp_starlight_entry_v1 before insert on sag_entries
    for each row execute function sag_lp_starlight_entry_guard_v1();

  -- Migration is idempotent and preserves immutable proofs, historical fills,
  -- operator settings, broker intents and terminal/consumed watch records.
  -- Active LP watches are terminally BLOCKED and their revisions invalidated.
  update sag_starlight_recovery_v1 w set status='BLOCKED',
    watch=jsonb_set(jsonb_set(coalesce(w.watch,'{}'::jsonb),'{status}',
      to_jsonb('BLOCKED'::text),true),'{lastAttemptReason}',
      to_jsonb('lightning_plasma_parent_no_follow_up'::text),true),
    revision=w.revision+1,updated_at_ms=(extract(epoch from clock_timestamp())*1000)::bigint
    from sag_entries parent where w.parent_entry_id=parent.id
    and w.system_name=parent.system_name and w.owner_id=parent.owner_id
    and w.mode=parent.mode and parent.concept_name='Lightning Plasma'
    and w.status not in ('CONSUMED','BLOCKED','EXPIRED','CANCELLED');
  update sag_shadow_stops_v3 stop set delivery_status='DELIVERED',
    delivered_at_ms=coalesce(stop.delivered_at_ms,(extract(epoch from clock_timestamp())*1000)::bigint)
    from sag_entries parent where stop.parent_entry_id=parent.id
    and parent.concept_name='Lightning Plasma' and stop.delivery_status='PENDING';

`;

const scopeParams = s => [s.systemName,s.ownerId,s.mode,s.resetEpoch];
const MUTABLE_GUARD_FIELDS = ['currentPriceCents','peakPriceCents','lowestPriceAfterEntryCents','maeCents','maeAtMs',
  'stopPriceCents','stopGuardState','profitGuardState','apexProfitGuardState','profitHarvestPeakPnlCents'];
const DB_FIELD = {currentPriceCents:'current_price_cents',peakPriceCents:'peak_price_cents',
  lowestPriceAfterEntryCents:'lowest_price_after_entry_cents',maeCents:'mae_cents',maeAtMs:'mae_at_ms',
  stopPriceCents:'stop_price_cents',stopGuardState:'stop_guard_state',profitGuardState:'profit_guard_state',
  apexProfitGuardState:'apex_profit_guard_state',profitHarvestPeakPnlCents:'profit_harvest_peak_pnl_cents'};
export class ShadowStore {
  constructor(db,mapEntry){ this.db=db;this.pool=db.pool;this.mapEntry=mapEntry; }
  async init(){
    const client=await this.pool.connect();
    try {await client.query('BEGIN'); await client.query(SHADOW_SCHEMA_SQL); await client.query('COMMIT');}
    catch(error){try{await client.query('ROLLBACK');}catch{} throw error;}finally{client.release();}
  }
  async captureScope(settings){
    const requested=shadowScope(settings);
    const r=await this.pool.query(`select r.value as runtime,v.value as revision from sag_settings r
      left join sag_settings v on v.key='runtime_commit_revision' where r.key='runtime'`);
    if(!r.rows?.[0] || !sameShadowScope(r.rows[0].runtime,requested))throw new Error('shadow_runtime_scope_changed');
    return {...requested,fenceRevision:Number(r.rows[0].revision?.revision||0)};
  }
  async transaction(scope,action,{isCurrent=()=>true,requireActive=false}={}){
    const expected=shadowScope(scope,scope.fenceRevision);
    if(!Number.isSafeInteger(expected.fenceRevision))throw new Error('shadow_runtime_fence_required');
    const client=await this.pool.connect();let transaction=false;
    try{
      await client.query('BEGIN');transaction=true;
      await client.query("set local lock_timeout='1500ms'");
      await client.query("set local statement_timeout='5000ms'");
      // Transaction-local writer fencing prevents an old shadow worker from
      // closing a new virtual Starlight without its durable continuation proof.
      await client.query("set local sag.aps2_shadow_writer='APS2-VIRTUAL-STARLIGHT-V1'");
      const lock=await client.query('select pg_try_advisory_xact_lock(hashtextextended($1,0)) as locked',[SHADOW_RUNTIME_LOCK]);
      if(lock.rows?.[0]?.locked!==true)throw new Error('shadow_runtime_transaction_busy');
      const r=await client.query("select value from sag_settings where key='runtime' for update");
      const settings=r.rows?.[0]?.value;
      const v=await client.query("select value from sag_settings where key='runtime_commit_revision'");
      if(!settings || !sameShadowScope(settings,expected) || Number(v.rows?.[0]?.value?.revision||0)!==expected.fenceRevision
          || isCurrent()!==true || (requireActive&&settings.engineActive!==true))throw new Error('shadow_runtime_fence_changed');
      const result=await action(client,settings,expected);
      if(isCurrent()!==true)throw new Error('shadow_runtime_changed_before_commit');
      await client.query('COMMIT');transaction=false;
      return result;
    }catch(error){
      if(transaction){try{await client.query('ROLLBACK');}catch(rollback){error.rollbackError=String(rollback?.message||rollback);}}
      // COMMIT may have succeeded despite a transport error. Callers retry by
      // immutable entry/revision identity; no new ID or invented rollback state.
      throw error;
    }finally{client.release();}
  }
  async insert(entry,scope,{multiply=1,isCurrent=()=>true}={}){
    const invalid=validateShadowEntry(entry);if(invalid)throw new Error(invalid);
    if(!entryMatchesShadowScope(entry,scope))throw new Error('shadow_admission_scope_mismatch');
    return this.transaction(scope,(client,settings)=>this.admitEntryWithClient(entry,scope,client,settings,{multiply}),
      {isCurrent,requireActive:true});
  }
  async insertAthenaBatch(entries,scope,{multiply,isCurrent=()=>true}={}){
    // Athena's one-per-episode latch must never consume an unfinished Multiply
    // group. Prepare all seats, then persist all or none under ONE runtime lock.
    // Starlight retains its separate durable, parent-scoped recovery protocol.
    if(!Array.isArray(entries)||!Number.isSafeInteger(multiply)||multiply<1||multiply>20||entries.length!==multiply)
      throw new Error('shadow_athena_batch_size_invalid');
    const first=entries[0];
    for(let index=0;index<entries.length;index++){
      const entry=entries[index],invalid=validateShadowEntry(entry);
      if(invalid)throw new Error(invalid);
      if(entry.conceptName!=='Athena Exclamation'||!entryMatchesShadowScope(entry,scope)
        ||!entry.sourceTradeId||entry.sourceTradeId!==first.sourceTradeId||entry.ticker!==first.ticker||entry.eventTicker!==first.eventTicker
        ||entry.id!==shadowAdmissionId(entry,index+1)||entry.entryConfig.executionSettingsHash!==first.entryConfig.executionSettingsHash)
        throw new Error('shadow_athena_batch_identity_invalid');
    }
    try{
      return await this.transaction(scope,async(client,settings)=>{
        if(Number(settings.athenaExclamationMultiply)!==multiply)throw new Error('shadow_runtime_fence_changed');
        const committed=[];
        for(const entry of entries){
          const result=await this.admitEntryWithClient(entry,scope,client,settings,{multiply});
          if(!result.ok){const error=new Error('shadow_athena_batch_blocked');error.admission=result;throw error;}
          committed.push(result.entry);
        }
        return {ok:true,entries:committed,reason:'shadow_athena_batch_committed'};
      },{isCurrent,requireActive:true});
    }catch(error){
      if(error.message==='shadow_athena_batch_blocked'&&!error.rollbackError)return {...error.admission,ok:false};
      throw error;
    }
  }
  async admitEntryWithClient(entry,scope,client,settings,{multiply=1}={}){
      if(entry.conceptName==='Crash Recovery Hunter')return admitShadowStarlight(this,entry,scope,client,settings);
      const prior=await client.query('select id from sag_entries where id=$1',[entry.id]);
      if(prior.rowCount>0)return {ok:false,reason:'shadow_source_already_consumed',existingId:entry.id};
      if(entry.entryConfig.executionSettingsHash!==executionSettingsHash(settings))throw new Error('shadow_runtime_fence_changed');
      const ge=settings.galacticExplosionEnabled===true;
      const maximum=Math.max(1,Math.floor(Number(settings.maxEntriesPerTrade)||1),Math.floor(Number(multiply)||1));
      const event=entry.eventTicker||entry.ticker;
      const used=await client.query(`select count(*)::int as used from sag_entries where
        system_name=$1 and owner_id=$2 and mode=$3 and shadow_epoch=$4 and execution_class='SHADOW_SAINT'
        and coalesce(nullif(event_ticker,''),ticker)=$5 and ($6::text is null or concept_name=$6)
        and status<>'rejected'`,[...scopeParams(scope),event,ge?entry.conceptName:null]);
      // R25 durable event budget survives the specialist's strategic exemption.
      if( Number(used.rows?.[0]?.used||0)>=maximum)return {ok:false,reason:'shadow_event_lifetime_cap',maximum};
      const active=await client.query(`select concept_name,count(*)::int as active from sag_entries where
        system_name=$1 and owner_id=$2 and mode=$3 and shadow_epoch=$4 and execution_class='SHADOW_SAINT'
        and ticker=$5 and status in ('open','entry_pending','exit_pending','pending_recovery') and archived=false
        group by concept_name`,[...scopeParams(scope),entry.ticker]);
      if(active.rows.some(x=>(x.concept_name===entry.conceptName&&Number(x.active)>=Math.max(1,multiply))
        ||(!ge&&x.concept_name!==entry.conceptName)))return {ok:false,reason:'shadow_ticker_duplicate'};
      entry.entryConfig.durableEventAdmission={version:SHADOW_PROTOCOL,scope:ge?entry.conceptName:'all_shadow_attacks',
        eventTicker:event,resetEpoch:scope.resetEpoch,mode:scope.mode,maxEntries:maximum,
        consumedBefore:Number(used.rows?.[0]?.used||0),claimedAtMs:Date.now(),capitalAuthority:false};
      const fresh=validateShadowEntryWitness(entry);if(fresh)throw new Error(fresh);
      entry.executionClass='SHADOW_SAINT';entry.shadowEpoch=scope.resetEpoch;entry.shadowRevision=1;
      entry.shadowState={};entry.shadowEntryHash=shadowEntryHash(entry);
      await this.db.insertEntry(entry,client);
      return {ok:true,entry,reason:'shadow_admission_committed'};
  }
  async openPage(scope,{limit=32}={}){
    const cap=Math.max(1,Math.min(64,Math.floor(Number(limit)||32)));
    const result=await this.pool.query(`select * from sag_entries where system_name=$1 and owner_id=$2
      and mode=$3 and shadow_epoch=$4 and execution_class='SHADOW_SAINT' and status='open' and archived=false
      order by shadow_last_evaluated_at_ms asc,id asc limit $5`,[...scopeParams(scope),cap]);
    return result.rows.map(this.mapEntry);
  }
  async wait(entry,scope,reason,{isCurrent=()=>true}={}){
    return this.transaction(scope,async client=>{
      const r=await client.query(`update sag_entries set shadow_last_evaluated_at_ms=$7,
        shadow_state=shadow_state || jsonb_build_object('waitReason',$8::text),shadow_revision=shadow_revision+1
        where id=$5 and system_name=$1 and owner_id=$2 and mode=$3 and shadow_epoch=$4
          and shadow_revision=$6 and execution_class='SHADOW_SAINT' and status='open' and archived=false returning id`,
        [...scopeParams(scope),entry.id,entry.shadowRevision,Date.now(),String(reason)]);
      return {ok:r.rowCount===1,reason:r.rowCount===1?'shadow_wait_recorded':'shadow_revision_conflict'};
    },{isCurrent});
  }
  async commit(entry,observation,evaluation,scope,{isCurrent=()=>true}={}){
    if(!verifyShadowEvaluationReceipt(evaluation,entry,observation))throw new Error('shadow_untrusted_guard_evaluation');
    return this.transaction(scope,async(client,settings)=>{
      const selected=await client.query(`select * from sag_entries where id=$5 and system_name=$1 and owner_id=$2
        and mode=$3 and shadow_epoch=$4 and shadow_revision=$6 and execution_class='SHADOW_SAINT'
        and status='open' and archived=false for update`,[...scopeParams(scope),entry.id,entry.shadowRevision]);
      if(!selected.rows[0])return {ok:false,reason:'shadow_revision_conflict'};
      const current=this.mapEntry(selected.rows[0]);
      if(current.shadowEntryHash!==shadowEntryHash(current) || current.shadowEntryHash!==entry.shadowEntryHash)
        throw new Error('shadow_immutable_entry_witness_mismatch');
      if(!verifyShadowEvaluationReceipt(evaluation,current,observation))throw new Error('shadow_guard_receipt_changed');
      const now=Date.now(),checked=validateShadowObservation(current,observation,now,{allowSame:true});
      if(!checked.ok)throw new Error(checked.reason);
      const state={...(current.shadowState||{}),quoteAtMs:checked.quoteAtMs,bookAtMs:checked.bookAtMs,
        quoteObservation:observation.quote.quoteObservation||null,lastSuccessAtMs:now,waitReason:null,
        guardRuntime:evaluation.guardRuntime||null};
      if(!checked.settlement && Number(observation.quote.yesBid)<=shadowDanger(current))
        state.hardStopTriggeredAtMs=Number(state.hardStopTriggeredAtMs||now);
      let proof=null;
      if(evaluation.closed===true){
        proof=buildShadowCloseProof(current,observation,evaluation.decision,now);
        // The immutable virtual close and its continuation evidence commit together.
        state.closeProof=proof;state.closeProofHash=authorityHash(proof);
      }
      const values=[],sets=[];
      const put=(field,value)=>{values.push(value);sets.push(`${field}=$${values.length}`);};
      for(const field of MUTABLE_GUARD_FIELDS){
        if(evaluation.nextEntry?.[field]===undefined)continue;
        let value=evaluation.nextEntry[field];
        if(['currentPriceCents','peakPriceCents','lowestPriceAfterEntryCents','maeCents','stopPriceCents'].includes(field)&&value!=null)value=Math.round(Number(value));
        put(DB_FIELD[field],value);
      }
      if(Buffer.byteLength(JSON.stringify(state))>128*1024)throw new Error('shadow_guard_state_size_exceeded');
      put('shadow_state',state);put('shadow_last_evaluated_at_ms',now);put('updated_at_ms',now);
      if(proof){
        put('status','closed');put('remaining_count',0);put('exit_filled_count',proof.count);
        put('exit_notional_cents',proof.exitPriceCents*proof.count);put('exit_price_cents',Math.round(proof.exitPriceCents));
        put('exit_fee_cents',proof.exitFeeCents);put('pnl_cents',proof.pnlCents);
        put('close_reason',proof.closeReason);put('closed_at_ms',now);
      }
      sets.push('shadow_revision=shadow_revision+1');values.push(current.id);
      const updated=await client.query(`update sag_entries set ${sets.join(',')} where id=$${values.length} returning *`,values);
      const closed=updated.rows[0]?this.mapEntry(updated.rows[0]):null;
      let watch=null;
      if(proof?.authorization){
        // LP's virtual close is still durably recorded, but its loss is NOT
        // authority for a Starlight watch. Both writes share this transaction.
        const proofHash=authorityHash(proof),enabled=settings.crashRecoveryHunterEnabled===true
          && starlightParentLossMayArmRecovery(current);
        await client.query(`insert into sag_shadow_stops_v3(parent_entry_id,system_name,owner_id,mode,reset_epoch,
          proof_hash,proof,closed_at_ms,delivery_status) values($5,$1,$2,$3,$4,$6,$7,$8,$9)`,
          [...scopeParams(scope),current.id,proofHash,proof,now,enabled?'PENDING':'DISABLED_AT_CLOSE']);
        if(enabled){
          watch=shadowWatchFromProof(current,proof,settings);
          const w=await client.query(`insert into sag_starlight_recovery_v1
            (system_name,owner_id,mode,reset_epoch,authorization_id,parent_entry_id,status,revision,watch,updated_at_ms)
            values($1,$2,$3,$4,$5,$6,'ARMED',1,$7,$8) on conflict do nothing returning revision,watch,status`,
            [...scopeParams(scope),watch.authorizationId,current.id,watch,now]);
          if(w.rowCount!==1)throw new Error('shadow_starlight_watch_identity_conflict');
          watch={...watch,revision:1};
        }
      }
      return {ok:true,closed:Boolean(proof),entry:closed,watch,proofHash:proof?authorityHash(proof):null};
    },{isCurrent});
  }
  async authorization(parentId,scope,queryClient=this.pool){
    const r=await queryClient.query(`select e.*,p.proof,p.proof_hash,p.delivery_status,w.watch as durable_watch,
      w.revision as watch_revision,w.status as watch_status from sag_entries e join sag_shadow_stops_v3 p on p.parent_entry_id=e.id
      join sag_starlight_recovery_v1 w on w.system_name=p.system_name and w.owner_id=p.owner_id and w.mode=p.mode
        and w.reset_epoch=p.reset_epoch and w.parent_entry_id=e.id
      where p.system_name=$1 and p.owner_id=$2 and p.mode=$3 and p.reset_epoch=$4 and p.parent_entry_id=$5
        and e.execution_class='SHADOW_SAINT' and e.archived=false and e.status='closed' and e.remaining_count=0
        and e.close_reason='hard_stop_loss' and e.pnl_cents<0`,[...scopeParams(scope),String(parentId)]);
    const raw=r.rows[0];if(!raw)return null;
    const parent=this.mapEntry(raw),proof=raw.proof,watch=raw.durable_watch;
    if(!starlightParentLossMayArmRecovery(parent) || !entryMatchesShadowScope(parent,scope)
      || String(watch?.parentConcept||'')!==String(parent.conceptName)
      || raw.watch_status==='BLOCKED' || raw.delivery_status==='DISABLED_AT_CLOSE'
      || parent.shadowEntryHash!==shadowEntryHash(parent)
      || proof?.entryHash!==parent.shadowEntryHash || proof?.parentEntryId!==parent.id
      || proof?.authorization!=='VALID_SHADOW_HARD_STOP' || !(proof.pnlCents<0)
      || proof.filled!==Number(parent.count) || proof.full!==true || !sameShadowScope(proof.scope,scope)
      || proof.count!==Number(parent.count) || proof.exitFeeCents!==Number(parent.exitFeeCents)
      || proof.pnlCents!==Number(parent.pnlCents) || proof.closeReason!==parent.closeReason
      || Math.abs(proof.exitPriceCents*proof.count-Number(parent.exitNotionalCents))>1e-7
      || proof.closedAtMs!==Number(parent.closedAtMs)
      || authorityHash(proof)!==raw.proof_hash || watch.shadowProofHash!==raw.proof_hash
      || !sameShadowScope(watch,scope) || watch.parentEntryId!==parent.id || watch.ticker!==parent.ticker
      || watch.eventTicker!==parent.eventTicker || watch.shadowProtocol!==SHADOW_PROTOCOL
      || watch.authorization!=='VALID_SHADOW_HARD_STOP' || Number(watch.stopPriceCents)!==proof.exitPriceCents)return null;
    return {parent,proof,proofHash:raw.proof_hash,watch:{...watch,revision:Number(raw.watch_revision),status:raw.watch_status}};
  }
  async pending(scope,{limit=32}={}){
    const r=await this.pool.query(`select parent_entry_id from sag_shadow_stops_v3 where
      system_name=$1 and owner_id=$2 and mode=$3 and reset_epoch=$4 and delivery_status='PENDING'
      and not exists (select 1 from sag_entries parent where parent.id=parent_entry_id
        and parent.concept_name in ('Lightning Plasma','Crash Recovery Hunter'))
      order by closed_at_ms,parent_entry_id limit $5`,[...scopeParams(scope),Math.max(1,Math.min(64,limit))]);
    return r.rows.map(r=>r.parent_entry_id);
  }
  async delivered(parentId,proofHash,scope){
    await this.pool.query(`update sag_shadow_stops_v3 set delivery_status='DELIVERED',delivered_at_ms=$7
      where system_name=$1 and owner_id=$2 and mode=$3 and reset_epoch=$4 and parent_entry_id=$5
        and proof_hash=$6 and delivery_status='PENDING'`,[...scopeParams(scope),parentId,proofHash,Date.now()]);
  }
  async summary(scope){
    const r=await this.pool.query(`select count(*) filter(where status='open')::int as open,
      count(*) filter(where status='closed')::int as closed,
      count(*) filter(where status='closed' and pnl_cents>0)::int as wins,
      count(*) filter(where status='closed' and pnl_cents<0)::int as losses,
      coalesce(sum(pnl_cents) filter(where status='closed'),0)::double precision as virtual_pnl_cents,
      min(case when shadow_last_evaluated_at_ms>0 then shadow_last_evaluated_at_ms else opened_at_ms end) filter(where status='open') as oldest_evaluation_ms,
      count(*) filter(where shadow_entry_hash is null)::int as unverified_legacy
      from sag_entries where system_name=$1 and owner_id=$2 and mode=$3 and ${SHADOW_SQL} and archived=false`,scopeParams(scope).slice(0,3));
    const groups=await this.pool.query(`select concept_name,count(*)::int as total,
      count(*) filter(where status='open')::int as open,count(*) filter(where status='closed')::int as closed,
      count(*) filter(where status='closed' and pnl_cents>0)::int as wins,
      count(*) filter(where status='closed' and pnl_cents<0)::int as losses,
      coalesce(sum(pnl_cents) filter(where status='closed'),0)::double precision as pnl_cents,
      coalesce(avg(entry_price_cents),0)::double precision as avg_entry_cents
      from sag_entries where system_name=$1 and owner_id=$2 and mode=$3 and shadow_epoch=$4
      and ${SHADOW_SQL} and archived=false group by concept_name`,scopeParams(scope));
    const byConcept=Object.fromEntries(groups.rows.map(g=>[g.concept_name,{classification:'VIRTUAL_ONLY',
      total:Number(g.total),open:Number(g.open),closed:Number(g.closed),wins:Number(g.wins),losses:Number(g.losses),
      winRate:Number(g.closed)>0?Number(g.wins)/Number(g.closed):0,pnlCents:Number(g.pnl_cents),avgEntryCents:Number(g.avg_entry_cents)}]));
    return {classification:'VIRTUAL_ONLY',...(r.rows[0]||{}),byConcept};
  }
  async proofDiagnostic(parentId,scope) {
    // Read-only audit view; not an authorization route. Unverified legacy rows
    // remain explicitly labelled and can never manufacture a stop proof here.
    const r=await this.pool.query(`select e.*,p.proof,p.proof_hash,p.delivery_status,to_jsonb(a) as lp_continuation,
      w.watch as recovery_watch,w.status as recovery_status
      from sag_entries e left join sag_shadow_stops_v3 p on p.parent_entry_id=e.id
      left join sag_lp_continuation_v4 a on a.parent_entry_id=e.id
      left join sag_starlight_recovery_v1 w on w.system_name=e.system_name
        and w.owner_id=e.owner_id and w.mode=e.mode and w.reset_epoch=e.shadow_epoch
        and w.parent_entry_id=e.id
      where e.system_name=$1 and e.owner_id=$2 and e.mode=$3
        and e.id=$4 and (e.execution_class='SHADOW_SAINT'
          or e.entry_config->>'executionClass'='SHADOW_SAINT')`,
      [...scopeParams(scope).slice(0,3),String(parentId)]);
    const raw=r.rows[0];
    if(!raw)return null;
    return {classification:'VIRTUAL_COUNTERFACTUAL_AUDIT_ONLY',
      verifiedProtocol:raw.entry_config?.shadowSaint?.version===SHADOW_PROTOCOL,
      entry:this.mapEntry(raw),virtualCloseProof:raw.shadow_state?.closeProof||null,continuation:raw.lp_continuation||null,stopProof:raw.proof||null,proofHash:raw.proof_hash||null,
      deliveryStatus:raw.delivery_status||null,
      recovery:raw.recovery_watch?{...raw.recovery_watch,status:raw.recovery_status}:null};
  }
  async diagnosticRows(scope,{limit=100,status=null,beforeOpenedAtMs=Number.MAX_SAFE_INTEGER,beforeId=''}={}){
    if(status!==null&&!['open','closed'].includes(status))throw new Error('shadow_diagnostic_status_invalid');
    const r=await this.pool.query(`select e.*,p.proof_hash as stop_proof_hash,p.delivery_status,to_jsonb(a) as lp_continuation,
      w.watch as recovery_watch,w.status as recovery_status from sag_entries e
      left join sag_shadow_stops_v3 p on p.parent_entry_id=e.id
      left join sag_lp_continuation_v4 a on a.parent_entry_id=e.id
      left join sag_starlight_recovery_v1 w on w.system_name=e.system_name and w.owner_id=e.owner_id
        and w.mode=e.mode and w.reset_epoch=e.shadow_epoch and w.parent_entry_id=e.id
      where e.system_name=$1 and e.owner_id=$2 and e.mode=$3
      and (e.execution_class='SHADOW_SAINT' or e.entry_config->>'executionClass'='SHADOW_SAINT')
      and e.archived=false and ($4::text is null or e.status=$4)
      and (e.opened_at_ms < $5 or (e.opened_at_ms=$5 and e.id>$6))
      order by e.opened_at_ms desc,e.id asc limit $7`,[...scopeParams(scope).slice(0,3),status,
      Math.max(0,Number(beforeOpenedAtMs)||0),String(beforeId),Math.max(1,Math.min(200,Number(limit)||100))]);
    return r.rows.map(raw=>({...this.mapEntry(raw),shadowProofHash:raw.stop_proof_hash||null,
      shadowDeliveryStatus:raw.delivery_status||null,recovery:raw.recovery_watch?{...raw.recovery_watch,status:raw.recovery_status}:null}));
  }
}
