// R40 research persistence contracts. These records grant no order, funding,
// entry or exit authority. Source generations change in the SAME transaction
// as historical evidence, including equal-timestamp corrections and rollback.
export const RESEARCH_GENERATION_POLICY = 'R40-RESEARCH-INPUTS-1';
export const RESEARCH_INPUT_FAMILIES = Object.freeze(['recovery','stop_guard','profit']);

// The same projection serves startup and cold per-ID lifecycle recovery. Keep
// legacy detail in PostgreSQL while returning truthful coverage provenance.
export const PROFIT_EPISODE_COMPACT_PROJECTION = `id,system_name,ticker,event_ticker,concept_name,source_feeder,sport,entry_price_cents,original_count,
  opened_at_ms,closed_at_ms,tracking_complete,((state-'observations'-'shadow')
    ||case when state ? 'observations' or state ? 'shadow' then
      jsonb_build_object('researchCoverage',coalesce(state->'researchCoverage','{}'::jsonb)
        ||jsonb_build_object('legacyDetailPreservedInDatabase',true,'legacyDetailThroughMs',
          coalesce(state#>'{researchCoverage,legacyDetailThroughMs}',state->'lastObservedAtMs')))
      else '{}'::jsonb end) as state,updated_at_ms`;

const families = [
  {family:'recovery',table:'sag_recovery_observations_v2',fields:[
    'id','system_name','tracking_complete','sport','entry_price_cents','exit_price_cents',
    'drop_cents','game_minutes_at_entry','trough_cents','rebound_cents','recovered',
    'time_to_recover_ms','updated_at_ms',
  ]},
  {family:'stop_guard',table:'sag_stop_guard_recovery_v1',fields:[
    'id','system_name','tracking_complete','trigger_stage','mode','concept_name','source_feeder',
    'sport','entry_price_cents','trigger_drop_cents','game_minutes_at_entry','crash_bucket',
    'trigger_at_ms','recovered','recovery_at_ms','coverage_kind',
    "state->'coverageKind'","state->'decisionEvidenceEligible'",'updated_at_ms',
  ]},
  {family:'profit',table:'sag_profit_episodes_v1',fields:[
    'id','system_name','tracking_complete','concept_name','source_feeder','sport','entry_price_cents',
    "state->'version'","state->'maxExecutableNetCents'","state->'postExitMaxExecutableNetCents'",
    "state->'postExitMinExecutableNetCents'","state->'terminalNetCents'","state->'actualRealizedNetCents'",
    "state->'oneTickPullbackCount'","state->'oneTickRecoveryCount'",'updated_at_ms',
  ]},
];

const sourceTriggerSql = ({family,table,fields}) => `
create or replace function sag_research_${family}_changed_r40() returns trigger language plpgsql as $fn$
declare old_system text; new_system text; target_system text;
begin
  if TG_OP='UPDATE' then
    if OLD.tracking_complete is not true and NEW.tracking_complete is not true then return null; end if;
    if row(${fields.map(f=>`OLD.${f}`).join(',')})
       is not distinct from row(${fields.map(f=>`NEW.${f}`).join(',')}) then return null; end if;
  end if;
  if TG_OP<>'INSERT' and OLD.tracking_complete is true then old_system:=OLD.system_name; end if;
  if TG_OP<>'DELETE' and NEW.tracking_complete is true then new_system:=NEW.system_name; end if;
  -- Stable lock order also covers a corrected row moving between systems.
  for target_system in select distinct x from unnest(array[old_system,new_system]) x where x is not null order by x loop
    insert into sag_research_input_generations_v1(system_name,family,generation)
      values(target_system,'${family}',1)
      on conflict(system_name,family) do update set generation=sag_research_input_generations_v1.generation+1;
  end loop;
  return null;
end $fn$;
do $install$
begin
  if not exists(select 1 from pg_trigger where tgrelid='${table}'::regclass and tgname='sag_research_${family}_changed_r40') then
    create trigger sag_research_${family}_changed_r40 after insert or update or delete on ${table}
      for each row execute function sag_research_${family}_changed_r40();
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='${table}'::regclass and tgname='sag_research_${family}_truncated_r40') then
    create trigger sag_research_${family}_truncated_r40 after truncate on ${table}
      for each statement execute function sag_research_input_truncated_r40('${family}');
  end if;
end $install$;
`;

// Called inside a transaction after the three original evidence tables exist.
// No evidence is deleted or rewritten. A family epoch makes TRUNCATE visible
// even for pre-migration rows whose system has no generation row yet.
export const RESEARCH_GENERATION_SCHEMA_SQL = `
create table if not exists sag_research_input_generations_v1(
  system_name text not null,family text not null,generation bigint not null default 0,
  primary key(system_name,family),check(family in ('recovery','stop_guard','profit')),
  check(generation>=0)
);
create table if not exists sag_research_input_epochs_v1(
  family text primary key,policy_version text not null,generation bigint not null default 0,
  check(family in ('recovery','stop_guard','profit')),check(generation>=0)
);
insert into sag_research_input_epochs_v1(family,policy_version)
  values('recovery','${RESEARCH_GENERATION_POLICY}'),('stop_guard','${RESEARCH_GENERATION_POLICY}'),('profit','${RESEARCH_GENERATION_POLICY}')
  on conflict(family) do update set policy_version=excluded.policy_version,
    generation=sag_research_input_epochs_v1.generation+1
    where sag_research_input_epochs_v1.policy_version is distinct from excluded.policy_version;
create or replace function sag_research_input_truncated_r40() returns trigger language plpgsql as $fn$
begin
  update sag_research_input_epochs_v1 set generation=generation+1 where family=TG_ARGV[0];
  return null;
end $fn$;
${families.map(sourceTriggerSql).join('\n')}
`;

// Explicit allowlist: brokerZeroInventoryClose, brokerOwnershipQuarantine and
// any future financial key remain owned by broker reconciliation. Never merge
// a stale copy of those keys from the asynchronous research queue.
export const POST_EXIT_RESEARCH_FIELDS = Object.freeze([
  'version','policyRevision','economicBasis','exitPriceCents','actualRealizedPnlCents',
  'researchWindowHours','latestObservedAtMs','latestMarketPriceCents','deltaFromExitCents',
  'latestExecutableBidCents','latestExecutableNetCents','latestExecutableAtMs',
  'bestExecutableNetCents','bestExecutableBidCents','bestObservedAtMs',
  'worstExecutableNetCents','worstExecutableBidCents','worstObservedAtMs',
  'missedUpsideNetCents','bestDeltaFromExitCents','lossAvoidedNetCents','worstDeltaFromExitCents',
  'finalized','finalResult','finalPayoutCents','researchComplete','completionReason',
  'completedAtMs','lastPersistedAtMs',
]);
const researchFieldSet = new Set(POST_EXIT_RESEARCH_FIELDS);
export function postExitResearchPatch(patch={}){
  const source=patch?.postExitState;
  if(!source||typeof source!=='object'||Array.isArray(source))throw new TypeError('post_exit_research_state_required');
  const state=Object.fromEntries(Object.entries(source).filter(([key])=>researchFieldSet.has(key)));
  if(state.version!=='POST-EXIT-RESEARCH-V2')throw new Error('post_exit_research_version_invalid');
  const at=Number(state.lastPersistedAtMs??patch.updatedAtMs);
  if(!Number.isFinite(at)||at<=0)throw new TypeError('post_exit_research_timestamp_invalid');
  state.lastPersistedAtMs=at;
  for(const key of ['latestObservedAtMs','latestExecutableAtMs','completedAtMs']){
    if(state[key]!=null&&(!Number.isFinite(Number(state[key]))||Number(state[key])<0))
      throw new TypeError('post_exit_research_evidence_timestamp_invalid');
    if(state[key]!=null)state[key]=Number(state[key]);
  }
  for(const key of ['bestExecutableNetCents','worstExecutableNetCents']){
    if(state[key]!=null&&!Number.isFinite(Number(state[key])))throw new TypeError('post_exit_research_extreme_invalid');
    if(state[key]!=null)state[key]=Number(state[key]);
  }
  const price=patch.currentPriceCents==null?null:Number(patch.currentPriceCents);
  if(price!=null&&(!Number.isFinite(price)||price<0||price>100))throw new TypeError('post_exit_research_price_invalid');
  let expectedEconomics=null;
  if(patch.expectedEconomics!=null){
    if(typeof patch.expectedEconomics!=='object'||Array.isArray(patch.expectedEconomics))
      throw new TypeError('post_exit_research_economics_invalid');
    expectedEconomics={};
    for(const key of ['closedAtMs','pnlCents','count','entryPriceCents','entryFeeCents','exitFeeCents','exitPriceCents']){
      if(!Object.hasOwn(patch.expectedEconomics,key))throw new TypeError('post_exit_research_economics_incomplete');
      const value=patch.expectedEconomics[key];
      if(key==='exitPriceCents'&&value==null){expectedEconomics[key]=null;continue;}
      if(value==null||!Number.isFinite(Number(value)))throw new TypeError('post_exit_research_economics_invalid');
      expectedEconomics[key]=Number(value);
    }
  }
  return {state,at,currentPriceCents:price,expectedEconomics};
}

// Existing values are used inside one UPDATE statement, under PostgreSQL's
// row lock. The research snapshot cannot roll back completion or a newer
// evidence/publication time, nor replace unrelated post-exit financial data.
export const POST_EXIT_RESEARCH_UPDATE_SQL = `
with current_entry as (
  select e.*,($5::jsonb is null or row(e.closed_at_ms,coalesce(e.pnl_cents,0),coalesce(e.count,0),
      coalesce(e.entry_price_cents,0),coalesce(e.entry_fee_cents,0),coalesce(e.exit_fee_cents,0),e.exit_price_cents)
    is not distinct from row(($5::jsonb->>'closedAtMs')::numeric,($5::jsonb->>'pnlCents')::numeric,
      ($5::jsonb->>'count')::numeric,($5::jsonb->>'entryPriceCents')::numeric,
      ($5::jsonb->>'entryFeeCents')::numeric,($5::jsonb->>'exitFeeCents')::numeric,
      ($5::jsonb->>'exitPriceCents')::numeric)) as economics_match
  from sag_entries e where e.id=$1 for update
), changed as (
update sag_entries e set post_exit_state=coalesce(c.post_exit_state,'{}'::jsonb)||$2::jsonb,
  current_price_cents=case when $4::double precision is null then c.current_price_cents else $4 end,
  updated_at_ms=greatest(c.updated_at_ms,$3::bigint)
from current_entry c where e.id=c.id and c.status='closed' and c.economics_match
  and $3::bigint>=case when coalesce(c.post_exit_state->>'lastPersistedAtMs','')~'^[0-9]+([.][0-9]+)?$'
    then (c.post_exit_state->>'lastPersistedAtMs')::numeric else 0 end
  and (not ($2::jsonb ? 'latestObservedAtMs')
    or (case when coalesce($2::jsonb->>'latestObservedAtMs','')~'^[0-9]+([.][0-9]+)?$' then ($2::jsonb->>'latestObservedAtMs')::numeric else 0 end)
       >=(case when coalesce(c.post_exit_state->>'latestObservedAtMs','')~'^[0-9]+([.][0-9]+)?$' then (c.post_exit_state->>'latestObservedAtMs')::numeric else 0 end))
  and (not ($2::jsonb ? 'latestExecutableAtMs')
    or (case when coalesce($2::jsonb->>'latestExecutableAtMs','')~'^[0-9]+([.][0-9]+)?$' then ($2::jsonb->>'latestExecutableAtMs')::numeric else 0 end)
       >=(case when coalesce(c.post_exit_state->>'latestExecutableAtMs','')~'^[0-9]+([.][0-9]+)?$' then (c.post_exit_state->>'latestExecutableAtMs')::numeric else 0 end))
  and (not ($2::jsonb ? 'bestExecutableNetCents')
    or jsonb_typeof(c.post_exit_state->'bestExecutableNetCents') is distinct from 'number'
    or (jsonb_typeof($2::jsonb->'bestExecutableNetCents')='number'
      and ($2::jsonb->>'bestExecutableNetCents')::numeric >= (c.post_exit_state->>'bestExecutableNetCents')::numeric))
  and (not ($2::jsonb ? 'worstExecutableNetCents')
    or jsonb_typeof(c.post_exit_state->'worstExecutableNetCents') is distinct from 'number'
    or (jsonb_typeof($2::jsonb->'worstExecutableNetCents')='number'
      and ($2::jsonb->>'worstExecutableNetCents')::numeric <= (c.post_exit_state->>'worstExecutableNetCents')::numeric))
  and (c.post_exit_state->'researchComplete' is distinct from 'true'::jsonb or $2::jsonb->'researchComplete'='true'::jsonb)
  and (c.post_exit_state->'finalized' is distinct from 'true'::jsonb or $2::jsonb->'finalized'='true'::jsonb)
returning e.id
)
select exists(select 1 from changed) as persisted,
  case when not exists(select 1 from current_entry) then 'entry_not_found'
    when exists(select 1 from current_entry where not economics_match) then 'economics_changed'
    when exists(select 1 from current_entry where status<>'closed') then 'entry_not_closed'
    else 'research_superseded' end as reason
`;
