// R28 on-demand evidence only. No mutation and no execution dependency.
import {normalizeGoldenSaintCards} from './goldenSaintCards.mjs';
import {ALL_SAINTS,r17CardFingerprint} from './goldenSaintDomain.mjs';
import {authorityHash} from './authority.mjs';
import {isEntryAuthorizedGameClockState} from './gameClock.mjs';
import {NATIVE_LEDGER_EVIDENCE_SQL,nativeLedgerEvidenceParameters} from './nativeLedgerEvidence.mjs';
const scope=s=>[s?.systemName||'',s?.ownerId||'',s?.mode||'',Number(s?.resetTimestampMs||0)];
const sameScope=(a,b)=>JSON.stringify(scope(a))===JSON.stringify(scope(b));
const countRows=rows=>rows.map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,/count|total|mismatch/.test(k)?Number(v):v])));
export async function collectNativeTradingDiagnostics(engine){
  const captured={...engine.settings},key=JSON.stringify(scope(captured));
  const processStartedAtMs=Number.isSafeInteger(Number(engine.startedAtMs))&&Number(engine.startedAtMs)>0
    ?Number(engine.startedAtMs):null;
  const cached=engine.nativeTradingDiagnosticCache;
  if(cached?.key===key&&Date.now()-cached.atMs<15000)return cached.value;
  if(engine.nativeTradingDiagnosticPending?.key===key)return engine.nativeTradingDiagnosticPending.promise;
  const promise=(async()=>{
    let client,begun=false;
    try{
      client=await engine.db.pool.connect();
      await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');begun=true;
      await client.query("SET LOCAL statement_timeout='2000ms'");
      await client.query("SET LOCAL lock_timeout='250ms'");
      const saved=(await client.query("SELECT value FROM sag_settings WHERE key='runtime'")).rows[0]?.value;
      if(!saved||!sameScope(saved,captured))throw new Error('diagnostic_scope_changed');
      const cards=normalizeGoldenSaintCards(saved,saved.goldenSaints);
      const params=scope(saved),cardRows=ALL_SAINTS.map(saint=>({saint,enabled:cards[saint]?.enabled===true,fingerprint:r17CardFingerprint(cards[saint])}));
      const watches=await client.query(`WITH card AS (
        SELECT * FROM jsonb_to_recordset($5::jsonb) AS x(saint text,enabled boolean,fingerprint text))
        SELECT w.saint,w.status,count(*) AS watch_count,count(DISTINCT w.ticker) AS distinct_ticker_count,
          min(w.updated_at_ms) AS oldest_updated_at_ms,max(w.updated_at_ms) AS newest_updated_at_ms,
          count(*) FILTER(WHERE card.enabled AND w.card_fingerprint<>card.fingerprint) AS fingerprint_mismatch_count,
          count(*) FILTER(WHERE card.enabled AND w.status='WATCHING' AND w.card_fingerprint<>card.fingerprint
            AND NOT EXISTS(SELECT 1 FROM sag_r17_golden_seats z WHERE z.authorization_id=w.authorization_id)) AS unseated_fingerprint_mismatch_count
        FROM sag_r17_golden_watches w JOIN card USING(saint)
        WHERE w.system_name=$1 AND w.owner_id=$2 AND w.mode=$3 AND w.reset_epoch=$4
        GROUP BY w.saint,w.status ORDER BY w.saint,w.status`,[...params,JSON.stringify(cardRows)]);
      const seats=await client.query(`SELECT w.saint,s.state,count(*) AS seat_count
        FROM sag_r17_golden_seats s JOIN sag_r17_golden_watches w USING(authorization_id)
        WHERE w.system_name=$1 AND w.owner_id=$2 AND w.mode=$3 AND w.reset_epoch=$4
        GROUP BY w.saint,s.state ORDER BY w.saint,s.state`,params);
      const entries=await client.query(`SELECT concept_name,execution_class,status,count(*) AS entry_count,
        count(*) FILTER(WHERE mode='LIVE' AND entry_order_id IS NOT NULL) AS broker_order_id_count,
        count(*) FILTER(WHERE mode='LIVE' AND entry_order_id IS NOT NULL AND entry_config#>>'{entryFillProof,authoritative}'='true') AS recorded_authoritative_entry_proof_count,
        count(*) FILTER(WHERE status='closed' AND remaining_count=0 AND pnl_cents<0) AS fully_closed_negative_count
        FROM sag_entries WHERE system_name=$1 AND owner_id=$2 AND mode=$3 AND shadow_epoch=$4 AND archived=false
        GROUP BY concept_name,execution_class,status ORDER BY concept_name,execution_class,status`,params);
      const lineage=await client.query(`SELECT w.saint,count(DISTINCT w.parent_entry_id) AS authorized_parent_count,
        count(*) AS authorization_count FROM sag_r17_golden_watches w
        WHERE w.system_name=$1 AND w.owner_id=$2 AND w.mode=$3 AND w.reset_epoch=$4
        GROUP BY w.saint ORDER BY w.saint`,params);
      const proofs=await client.query(`SELECT count(*) AS recorded_athena_stop_proof_count
        FROM sag_shadow_stops_v3 p JOIN sag_entries e ON e.id=p.parent_entry_id
        WHERE p.system_name=$1 AND p.owner_id=$2 AND p.mode=$3 AND p.reset_epoch=$4
          AND e.concept_name='Athena Exclamation' AND e.execution_class='SHADOW_SAINT'
          AND e.archived=false`,params);
      const clocks=await client.query(`SELECT state->>'phase' AS phase,
        state->>'actualStartConfidence' AS start_confidence,count(*) AS event_count,
        count(*) FILTER(WHERE state->>'persistenceKind'='durable_clock_proof') AS durable_proof_record_count,
        count(*) FILTER(WHERE state->>'entryAuthorized'='true') AS legacy_stored_permission_flag_count,
        min(last_updated_ms) AS oldest_persisted_at_ms,max(last_updated_ms) AS newest_persisted_at_ms
        FROM sag_game_clock_authority WHERE system_name=$1
        GROUP BY state->>'phase',state->>'actualStartConfidence'`,[saved.systemName]);
      const ledgerAttribution=await client.query(NATIVE_LEDGER_EVIDENCE_SQL,nativeLedgerEvidenceParameters(saved,processStartedAtMs));
      const databaseTables=await client.query(`SELECT relname,n_live_tup,n_dead_tup,
        last_autovacuum,last_autoanalyze,pg_relation_size(relid) AS relation_bytes,
        pg_indexes_size(relid) AS index_bytes,pg_total_relation_size(relid) AS total_bytes
        FROM pg_stat_user_tables WHERE relname=ANY($1::text[]) ORDER BY relname`,[
        ['sag_entries','sag_shadow_stops_v3','sag_r17_golden_watches','sag_r17_golden_seats',
          'sag_game_clock_authority','sag_trackers','sag_settings']]);
      await client.query('COMMIT');begun=false;
      if(!sameScope(engine.settings,captured))throw new Error('diagnostic_scope_changed');
      const now=Date.now(),runtimeClocks=[...(engine.eventClockRuntime?.states?.values?.()||[])].filter(Boolean);
      const value={version:'R38-NATIVE-FUNNEL-2',status:'AVAILABLE',readOnly:true,atMs:now,processStartedAtMs,
        scope:{systemName:saved.systemName,ownerId:saved.ownerId,mode:saved.mode,resetEpoch:Number(saved.resetTimestampMs||0)},
        ownerConfigurationFingerprint:authorityHash(saved),watches:countRows(watches.rows),seats:countRows(seats.rows),
        entries:countRows(entries.rows),authorizations:countRows(lineage.rows),proofs:countRows(proofs.rows),clocks:countRows(clocks.rows),
        ledgerAttribution:ledgerAttribution.rows[0]||{},
        databaseHealth:{tables:databaseTables.rows,tupleCountsAreEstimates:true},
        runtimeClockEvidence:{inMemory:runtimeClocks.length,
          currentlyAuthorized:runtimeClocks.filter(x=>isEntryAuthorizedGameClockState(x,x.eventTicker,now)).length,
          ...engine.eventClockRuntime?.snapshot?.()},
        limitations:['stored_native_state_not_independent_broker_reverification','negative_close_alone_is_not_a_verified_recovery_authority','clock_rows_are_event_scoped_durable_proof_and_never_restart_entry_permission','legacy_stored_permission_flags_are_not_current_authorizations','old_epoch_rows_require_attribution_before_any_reconciliation','table_statistics_do_not_prove_physical_bloat','historical_first_refusals_require_retained_linked_funnel_evidence']};
      engine.nativeTradingDiagnosticCache={key,atMs:Date.now(),value};return value;
    }catch(error){return {version:'R38-NATIVE-FUNNEL-2',status:'UNAVAILABLE',readOnly:true,reason:String(error?.code||error?.message||'query_failed').slice(0,140),counts:null};}
    finally{if(begun)await client?.query('ROLLBACK').catch(()=>{});client?.release();}
  })();
  const pending={key,promise};engine.nativeTradingDiagnosticPending=pending;
  try{return await promise;}finally{if(engine.nativeTradingDiagnosticPending===pending)engine.nativeTradingDiagnosticPending=null;}
}
