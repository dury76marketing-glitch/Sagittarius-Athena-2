/** Athena -> Starlight optional rise trigger. This is an ADDITIONAL entry gate,
 * never a replacement for the authenticated shadow hard-stop authorization.
 * 0 retains the previous route. A positive value references original entry,
 * not stop price, exit price, recovery trough, or a historical peak.
 */
export const ATHENA_STARLIGHT_TRIGGER_VERSION = 'ATHENA-STARLIGHT-RISE-V1';
export const ATHENA_STARLIGHT_TRIGGER_SETTING = 'athenaExclamationStarlightTriggerCents';
const EPSILON = 1e-9;
const number = value => value == null || value === '' ? NaN : Number(value);

export function athenaStarlightTriggerConfig(settings = {}, concept = 'Athena Exclamation') {
  if (concept !== 'Athena Exclamation') return {enabled:false, valid:true, thresholdCents:0};
  const value = settings[ATHENA_STARLIGHT_TRIGGER_SETTING];
  const thresholdCents = value === undefined ? 0 : number(value);
  const valid = typeof value !== 'boolean' && Number.isSafeInteger(thresholdCents) && thresholdCents >= 0 && thresholdCents <= 99;
  return {enabled:!valid || thresholdCents > 0, valid, thresholdCents};
}

/** Caller MUST obtain parent from verifiedShadowStop()/its locked transaction.
 * A syntactically valid object is not, on its own, a database authorization.
 */
export function athenaStarlightTriggerDecision({settings = {}, parent = null,
  watch = {}, quote = null, now = Date.now(), stamp = null, requireStamp = false} = {}) {
  const config = athenaStarlightTriggerConfig(settings, parent?.conceptName ?? watch.parentConcept);
  const base = {version:ATHENA_STARLIGHT_TRIGGER_VERSION, ...config,
    reference:'ORIGINAL_ATHENA_ENTRY', parentEntryId:String(watch.parentEntryId || parent?.id || '')};
  const deny = (reason, extra = {}) => ({...base, ok:false, reason, ...extra});
  if (!config.valid) return deny('athena_starlight_trigger_setting_invalid');
  if (!config.enabled) return {...base, ok:true, reason:'athena_starlight_trigger_not_active'};
  const originalEntryPriceCents = number(parent?.entryPriceCents);
  const requiredBidCents = originalEntryPriceCents + config.thresholdCents;
  Object.assign(base, {originalEntryPriceCents, requiredBidCents});
  if (!parent || parent.conceptName !== 'Athena Exclamation'
      || String(parent.id) !== String(watch.parentEntryId)
      || parent.archived === true || parent.status !== 'closed'
      || parent.closeReason !== 'hard_stop_loss' || !(number(parent.pnlCents) < 0)
      || number(parent.remainingCount) !== 0 || !(number(parent.count) > 0)
      || (parent.executionClass ?? parent.entryConfig?.executionClass) !== 'SHADOW_SAINT'
      || !(originalEntryPriceCents > 0 && originalEntryPriceCents < 100))
    return deny('athena_starlight_parent_not_verified_loss');
  for (const key of ['systemName','ownerId','mode']) {
    if (!settings[key] || parent[key] !== settings[key] || watch[key] !== settings[key])
      return deny('athena_starlight_parent_scope_mismatch');
  }
  const resetEpoch = Number(settings.resetTimestampMs || 0);
  if (!Number.isSafeInteger(resetEpoch) || resetEpoch < 0
      || number(parent.shadowEpoch) !== resetEpoch || number(watch.resetEpoch) !== resetEpoch
      || !(number(parent.closedAtMs) >= resetEpoch) || number(parent.closedAtMs) > now
      || watch.parentConcept !== parent.conceptName || watch.ticker !== parent.ticker
      || watch.eventTicker !== parent.eventTicker || !watch.shadowProofHash)
    return deny('athena_starlight_parent_identity_mismatch');
  const identity = {version:ATHENA_STARLIGHT_TRIGGER_VERSION,
    reference:'ORIGINAL_ATHENA_ENTRY', parentEntryId:String(parent.id),
    originalEntryPriceCents, thresholdCents:config.thresholdCents,
    ticker:parent.ticker, eventTicker:parent.eventTicker,
    systemName:parent.systemName, ownerId:parent.ownerId, mode:parent.mode,
    resetEpoch, shadowProofHash:watch.shadowProofHash};
  if (requireStamp || stamp) {
    if (!stamp || Object.entries(identity).some(([key, value]) => stamp[key] !== value))
      return deny('athena_starlight_trigger_claim_changed');
  }
  if (!(requiredBidCents < 100)) return deny('athena_starlight_trigger_unreachable');
  if (!quote || quote.ticker !== parent.ticker
      || (quote.eventTicker || quote.ticker) !== parent.eventTicker)
    return deny('athena_starlight_quote_identity_mismatch');
  const bid = number(quote.yesBid), ask = number(quote.yesAsk), at = number(quote.quoteAtMs);
  Object.assign(base, {observedBidCents:bid, observedAskCents:ask});
  if (quote.bookInvalid || quote.result || String(quote.status || quote.liveStatus || '') !== 'active'
      || !(bid > 0 && bid <= ask && ask <= 100))
    return deny('athena_starlight_market_not_executable');
  const configuredAge = number(settings.infinityBreakMaximumBookAgeMs ?? 5000);
  if (!(configuredAge > 0)) return deny('athena_starlight_quote_age_setting_invalid');
  const maxAge = Math.min(5000, configuredAge);
  if (!(at > 0) || at > now || now-at > maxAge || at < number(parent.closedAtMs))
    return deny('athena_starlight_quote_stale_or_pre_stop');
  const riseCents = bid-originalEntryPriceCents;
  if (riseCents+EPSILON < config.thresholdCents)
    return deny('athena_starlight_below_trigger', {riseCents});
  return {...base, ok:true, reason:'athena_starlight_trigger_reached', riseCents,
    stamp:{...identity, observedBidCents:bid, riseCents, quoteAtMs:at, checkedAtMs:now}};
}

// Additive, idempotent INSERT fence. Does not update trades or settings, and
// never blocks updates used for partial fills, exits, or reconciliation.
// Install atomically before the engine reports schema readiness.
export const ATHENA_STARLIGHT_TRIGGER_SQL = `
create or replace function sag_athena_starlight_rise_guard_v1() returns trigger language plpgsql as $$
declare p sag_entries%rowtype; cfg jsonb; st jsonb; q jsonb; rec jsonb;
  w sag_starlight_recovery_v1%rowtype; proof sag_shadow_stops_v3%rowtype;
  threshold numeric; bid numeric; ask numeric; observed numeric; current_ms numeric; max_age numeric;
begin
  if NEW.concept_name <> 'Crash Recovery Hunter' then return NEW; end if;
  select * into p from sag_entries where id=NEW.source_trade_id;
  if not found or p.concept_name <> 'Athena Exclamation' then return NEW; end if;
  select value into cfg from sag_settings where key='runtime' for share;
  if cfg ? 'athenaExclamationStarlightTriggerCents' and (cfg->>'athenaExclamationStarlightTriggerCents') is null then
    raise exception 'athena_starlight_trigger_setting_invalid'; end if;
  threshold := coalesce((cfg->>'athenaExclamationStarlightTriggerCents')::numeric,0);
  if threshold < 0 or threshold > 99 or threshold <> trunc(threshold) then
    raise exception 'athena_starlight_trigger_setting_invalid'; end if;
  if threshold=0 then return NEW; end if;
  rec := NEW.entry_config->'starlightRecovery'; st := rec->'athenaTrigger';
  q := coalesce(NEW.entry_config#>'{shadowSaint,entryExecution,quote}',NEW.entry_config#>'{entryExecutionWitness,quote}');
  select * into w from sag_starlight_recovery_v1 where system_name=NEW.system_name
    and owner_id=NEW.owner_id and mode=NEW.mode and parent_entry_id=p.id
    and reset_epoch=coalesce((cfg->>'resetTimestampMs')::bigint,0)
    and authorization_id=rec->>'authorizationId';
  if not found then raise exception 'athena_starlight_durable_watch_required'; end if;
  select * into proof from sag_shadow_stops_v3 where parent_entry_id=p.id
    and system_name=NEW.system_name and owner_id=NEW.owner_id and mode=NEW.mode
    and reset_epoch=coalesce((cfg->>'resetTimestampMs')::bigint,0);
  if not found then raise exception 'athena_starlight_shadow_stop_required'; end if;
  current_ms := extract(epoch from clock_timestamp())*1000;
  bid := (q->>'yesBid')::numeric; ask := (q->>'yesAsk')::numeric;
  observed := (q->>'quoteAtMs')::numeric;
  max_age := least(5000,coalesce((cfg->>'infinityBreakMaximumBookAgeMs')::numeric,5000));
  if (cfg->>'engineActive') is distinct from 'true'
    or (cfg->>'crashRecoveryHunterEnabled') is distinct from 'true'
    or (NEW.mode='LIVE' and NEW.execution_class<>'SHADOW_SAINT' and (cfg->>'liveArmed') is distinct from 'true')
    or p.execution_class is distinct from 'SHADOW_SAINT' or p.status is distinct from 'closed'
    or p.close_reason is distinct from 'hard_stop_loss' or not (p.pnl_cents<0)
    or p.archived or p.remaining_count is distinct from 0 or not (p.count>0)
    or p.system_name is distinct from NEW.system_name or p.owner_id is distinct from NEW.owner_id
    or p.mode is distinct from NEW.mode or p.ticker is distinct from NEW.ticker
    or p.event_ticker is distinct from NEW.event_ticker
    or cfg->>'systemName' is distinct from NEW.system_name or cfg->>'ownerId' is distinct from NEW.owner_id
    or cfg->>'mode' is distinct from NEW.mode
    or p.shadow_epoch is distinct from coalesce((cfg->>'resetTimestampMs')::bigint,0)
    or w.status is distinct from 'EXECUTING' or w.revision is distinct from (rec->>'revision')::bigint
    or proof.proof_hash is distinct from rec->>'shadowProofHash'
    or proof.delivery_status='DISABLED_AT_CLOSE'
    or st->>'version' is distinct from 'ATHENA-STARLIGHT-RISE-V1'
    or st->>'reference' is distinct from 'ORIGINAL_ATHENA_ENTRY'
    or st->>'parentEntryId' is distinct from p.id
    or (st->>'originalEntryPriceCents')::numeric is distinct from p.entry_price_cents::numeric
    or (st->>'thresholdCents')::numeric is distinct from threshold
    or st->>'ticker' is distinct from p.ticker or st->>'eventTicker' is distinct from p.event_ticker
    or st->>'systemName' is distinct from p.system_name or st->>'ownerId' is distinct from p.owner_id
    or st->>'mode' is distinct from p.mode
    or (st->>'resetEpoch')::bigint is distinct from p.shadow_epoch
    or st->>'shadowProofHash' is distinct from proof.proof_hash
    or q->>'ticker' is distinct from p.ticker or q->>'eventTicker' is distinct from p.event_ticker
    or q->>'status' is distinct from 'active' or coalesce(q->>'result','')<>''
    or coalesce((q->>'bookInvalid')::boolean,false)
    or (max_age>0 and observed>0 and observed<=current_ms and current_ms-observed<=max_age
      and observed>=p.closed_at_ms and bid>0 and bid<=ask and ask<=100
      and p.entry_price_cents+threshold<100 and bid>=p.entry_price_cents+threshold) is not true
  then raise exception 'athena_starlight_trigger_not_authorized_at_insert'; end if;
  return NEW;
end $$;
drop trigger if exists sag_athena_starlight_rise_v1 on sag_entries;
create trigger sag_athena_starlight_rise_v1 before insert on sag_entries
  for each row execute function sag_athena_starlight_rise_guard_v1();
`;
