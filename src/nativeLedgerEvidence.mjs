// Read-only attribution. These counts never grant or deny trading authority.
import {CAPITAL_SQL} from './shadowProtocol.mjs';
import {ACTUAL_OPEN_SQL,UNVALUED_LIVE_PENDING_SQL,UNRESOLVED_FUNDED_SQL} from './executionReporting.mjs';

export const NATIVE_LEDGER_EVIDENCE_SQL=`SELECT
  count(*) FILTER (WHERE owner_id=$2 AND mode=$3 AND shadow_epoch=$4 AND archived=false
    AND concept_name LIKE 'R17:%')::int AS current_scope_saint_capital_rows,
  count(*) FILTER (WHERE owner_id=$2 AND mode=$3 AND shadow_epoch=$4 AND archived=false
    AND concept_name LIKE 'R17:%' AND ${ACTUAL_OPEN_SQL})::int AS current_scope_saint_actual_open_rows,
  CASE WHEN $5::bigint IS NULL THEN NULL ELSE count(*) FILTER (WHERE owner_id=$2 AND mode=$3 AND shadow_epoch=$4 AND archived=false
    AND concept_name LIKE 'R17:%' AND opened_at_ms>=$5)::int END AS current_scope_saint_entries_since_process_start,
  CASE WHEN $5::bigint IS NULL THEN NULL ELSE count(*) FILTER (WHERE owner_id=$2 AND mode='SIMULATION' AND concept_name LIKE 'R17:%'
    AND opened_at_ms>=$5)::int END AS owner_sim_saint_entries_since_process_start_including_archived,
  count(*) FILTER (WHERE owner_id=$2 AND mode='SIMULATION' AND archived=true)::int AS owner_archived_sim_capital_rows,
  count(*) FILTER (WHERE owner_id=$2 AND mode='SIMULATION' AND shadow_epoch<>$4
    AND archived=false)::int AS owner_other_epoch_unarchived_sim_capital_rows,
  count(*) FILTER (WHERE owner_id=$2 AND mode='SIMULATION' AND shadow_epoch<$4
    AND archived=false AND status IN ('open','entry_pending','exit_pending','pending_recovery')
    AND remaining_count>0)::int AS owner_old_epoch_active_sim_capital_rows_requiring_attribution,
  count(*) FILTER (WHERE owner_id=$2 AND mode='LIVE' AND archived=false
    AND ${ACTUAL_OPEN_SQL})::int AS retained_live_actual_open_capital_rows_all_epochs,
  count(*) FILTER (WHERE owner_id=$2 AND mode='LIVE' AND archived=false
    AND ${UNVALUED_LIVE_PENDING_SQL})::int AS retained_live_unverified_intent_rows_all_epochs,
  count(*) FILTER (WHERE owner_id=$2 AND ${UNRESOLVED_FUNDED_SQL})::int AS retained_live_financial_reconciliation_rows_all_epochs,
  count(*) FILTER (WHERE owner_id IS NULL OR mode IS NULL)::int AS legacy_null_scope_capital_rows
  FROM sag_entries WHERE system_name=$1 AND ${CAPITAL_SQL}`;

export const nativeLedgerEvidenceParameters=(settings,processStartedAtMs=null)=>[
  String(settings?.systemName||''),String(settings?.ownerId||''),String(settings?.mode||''),
  Number(settings?.resetTimestampMs||0),Number.isSafeInteger(Number(processStartedAtMs))&&Number(processStartedAtMs)>0
    ?Number(processStartedAtMs):null,
];
