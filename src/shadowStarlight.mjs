/** APS2: virtual Starlight admission, owned by the original shadow transaction.
 * A hash is an integrity check, NOT a substitute for the persisted parent proof.
 * This module has no broker, account-cash, or real-capital reservation API.
 */
import { authorityHash, verifyAthenaFireCommandHash } from './authority.mjs';
import { SHADOW_PROTOCOL, executionSettingsHash, validateShadowEntryWitness,
  shadowEntryHash, shadowAdmissionId } from './shadowProtocol.mjs';
import { athenaStarlightTriggerDecision } from './athenaStarlightTrigger.mjs';
import { isShadowSaintEntry, starlightParentLossMayArmRecovery } from './doctrine.mjs';
export const STARLIGHT_SHADOW_VERSION='APS2-VIRTUAL-STARLIGHT-V1';
export const APS2_VERSION='APS2-SHADOW-STARLIGHT-V1';
const scopeArgs=s=>[s.systemName,s.ownerId,s.mode,s.resetEpoch];
const same=(a,b)=>String(a??'')===String(b??'');
export async function admitShadowStarlight(store,entry,scope,client,settings){
  const config=entry.entryConfig||{},stamp=config.starlightShadow,snapshot=config.starlightRecovery;
  if(!isShadowSaintEntry(entry)||entry.conceptName!=='Crash Recovery Hunter'||!snapshot
    || !stamp || stamp.version!==STARLIGHT_SHADOW_VERSION || !verifyAthenaFireCommandHash(stamp))
    throw new Error('aps2_starlight_virtual_authority_required');
  if(settings.crashRecoveryHunterEnabled!==true || config.executionSettingsHash!==executionSettingsHash(settings))
    throw new Error('aps2_starlight_settings_changed');
  const prior=await client.query('select * from sag_entries where id=$1',[entry.id]);
  if(prior.rows[0]){
    const existing=store.mapEntry(prior.rows[0]);
    if(!isShadowSaintEntry(existing)||existing.conceptName!=='Crash Recovery Hunter'
      || existing.shadowEntryHash!==shadowEntryHash(existing)
      || existing.sourceTradeId!==entry.sourceTradeId || existing.ticker!==entry.ticker
      || existing.ownerId!==entry.ownerId || existing.systemName!==entry.systemName || existing.mode!==entry.mode
      || existing.shadowEpoch!==scope.resetEpoch || existing.entryConfig?.starlightShadow?.seat!==stamp.seat)
      throw new Error('aps2_starlight_id_collision');
    return {ok:true,idempotent:true,entry:existing,reason:'virtual_starlight_already_committed'};
  }
  const w=await client.query(`select * from sag_starlight_recovery_v1 where
    system_name=$1 and owner_id=$2 and mode=$3 and reset_epoch=$4
    and parent_entry_id=$5 and authorization_id=$6 for update`,
    [...scopeArgs(scope),entry.sourceTradeId,snapshot.authorizationId]);
  const row=w.rows[0],watch=row?.watch;
  if(!watch || row.status!=='EXECUTING'||Number(row.revision)!==Number(snapshot.revision)
    || !same(watch.parentEntryId,entry.sourceTradeId)||!same(watch.ticker,entry.ticker)
    || !same(watch.eventTicker,entry.eventTicker)||!same(watch.parentConcept,entry.sourceFeeder)
    || watch.virtualGroupVersion!==STARLIGHT_SHADOW_VERSION
    || watch.groupSettingsHash!==executionSettingsHash(settings))
    throw new Error('aps2_starlight_durable_claim_changed');
  const verified=await store.authorization(entry.sourceTradeId,scope,client);
  if(!verified || !isShadowSaintEntry(verified.parent) || !starlightParentLossMayArmRecovery(verified.parent)
    || verified.proofHash!==snapshot.shadowProofHash || snapshot.shadowProtocol!==SHADOW_PROTOCOL
    || verified.parent.shadowEntryHash!==shadowEntryHash(verified.parent))
    throw new Error('aps2_starlight_shadow_stop_not_verified');
  const maximum=Math.max(1,Math.min(20,Math.floor(Number(settings.crashRecoveryHunterMultiply)||1)));
  const groupMaximum=Number(watch.maximumSeats);
  if(!Number.isSafeInteger(groupMaximum)||groupMaximum<1||groupMaximum>maximum
    || stamp.maximumSeats!==groupMaximum||stamp.seat<1||stamp.seat>groupMaximum
    || entry.id!==shadowAdmissionId(entry,stamp.seat))throw new Error('aps2_starlight_seat_identity_invalid');
  const seats=await client.query(`select id,entry_config from sag_entries where system_name=$1 and owner_id=$2
    and mode=$3 and shadow_epoch=$4 and concept_name='Crash Recovery Hunter' and source_trade_id=$5
    and execution_class='SHADOW_SAINT'`,[...scopeArgs(scope),entry.sourceTradeId]);
  if(seats.rows.length>=groupMaximum||seats.rows.some(r=>Number(r.entry_config?.starlightShadow?.seat)===stamp.seat))
    throw new Error('aps2_starlight_parent_seat_used');
  const minimum=Number(settings.crashRecoveryMinEntryCents),maximumPrice=Number(settings.crashRecoveryMaxEntryCents);
  const stop=Number(watch.stopPriceCents);
  if(!(minimum>0&&maximumPrice>=minimum&&maximumPrice<100)||stop<minimum||stop>maximumPrice
    ||entry.entryPriceCents<minimum||entry.entryPriceCents>maximumPrice)
    throw new Error('aps2_starlight_band_changed');
  if(!(Number(settings.crashRecoveryStakeCents)>0)
    ||entry.count*entry.entryPriceCents>Number(settings.crashRecoveryStakeCents)+1e-8)
    throw new Error('aps2_starlight_reference_stake_exceeded');
  const witness=config.shadowSaint?.entryExecution;
  const invalid=validateShadowEntryWitness(entry);if(invalid)throw new Error(invalid);
  const rise=athenaStarlightTriggerDecision({settings,parent:verified.parent,
    watch:{...watch,revision:Number(row.revision),status:row.status},quote:witness?.quote,
    stamp:snapshot.athenaTrigger,requireStamp:true});
  if(!rise.ok)throw new Error(rise.reason);
  if(snapshot.link===true&&!rise.enabled&&Number(witness.averagePriceCents)>stop)
    throw new Error('aps2_starlight_link_price_exceeds_stop');
  if(config.freezingCoffin?.enabled===true||config.aurora?.frozen!==true||config.aurora?.ok!==true
    ||Number(config.aurora.damageControlPercent)!==Number(settings.crashRecoveryHunterAuroraDamageControlPercent)
    ||config.aurora.mode!==entry.mode||Number(config.aurora.entryPriceCents)!==entry.entryPriceCents
    ||Number(config.aurora.originalContractCount)!==entry.count)
    throw new Error('aps2_starlight_independent_aurora_required');
  config.durableEventAdmission={version:STARLIGHT_SHADOW_VERSION,scope:'verified_shadow_parent_seat',
    parentEntryId:entry.sourceTradeId,authorizationId:snapshot.authorizationId,
    proofHash:verified.proofHash,seat:stamp.seat,maximumSeats:groupMaximum,capitalAuthority:false};
  entry.shadowEpoch=scope.resetEpoch;entry.shadowRevision=1;entry.shadowState={};
  entry.shadowEntryHash=shadowEntryHash(entry);
  await store.db.insertEntry(entry,client);
  return {ok:true,entry,reason:'virtual_starlight_admission_committed'};
}
export const STARLIGHT_SHADOW_SQL=`
create table if not exists sag_aps2_activation(
 singleton boolean primary key default true check(singleton),version text not null,
 activated_at_ms bigint not null,legacy_policy text not null);
insert into sag_aps2_activation values(true,'${APS2_VERSION}',
 (extract(epoch from clock_timestamp())*1000)::bigint,'PRESERVE_REAL_EXPOSURE;NO_NEW_CAPITAL_STARLIGHT;LEGACY_BUYS_RECONCILE_ONLY')
 on conflict(singleton) do nothing;
create or replace function sag_aps2_new_entry_guard() returns trigger language plpgsql as $$
declare cfg jsonb; rec jsonb; stamp jsonb; parent sag_entries; w sag_starlight_recovery_v1;
 proof sag_shadow_stops_v3; maximum int;used int;quote jsonb;at_ms bigint;aurora jsonb;
begin
 if NEW.concept_name in ('Athena Exclamation','Scarlet Needle','Sagittarius Justice Arrow','Momentum Hunter',
  'Recovery Hunter','Wave Surfer','Crash Recovery Hunter','Dragon Recovery Hunter','Golden Dragon Hunter')
  and (NEW.execution_class is distinct from 'SHADOW_SAINT' or NEW.entry_config->>'executionClass' is distinct from 'SHADOW_SAINT')
 then raise exception 'aps2_only_lightning_may_open_capital';end if;
 if NEW.concept_name<>'Crash Recovery Hunter' then return NEW;end if;
 select value into cfg from sag_settings where key='runtime' for update;
 rec:=NEW.entry_config->'starlightRecovery';stamp:=NEW.entry_config->'starlightShadow';
 if cfg->>'engineActive' is distinct from 'true' or cfg->>'crashRecoveryHunterEnabled' is distinct from 'true'
  or cfg->>'systemName' is distinct from NEW.system_name or cfg->>'ownerId' is distinct from NEW.owner_id
  or cfg->>'mode' is distinct from NEW.mode or NEW.mode not in ('LIVE','SIMULATION')
  or NEW.shadow_epoch is distinct from coalesce((cfg->>'resetTimestampMs')::bigint,0)
  or NEW.status is distinct from 'open' or NEW.remaining_count is distinct from NEW.count or NEW.count<=0
  or NEW.shadow_revision<>1 or nullif(NEW.shadow_entry_hash,'') is null
  or NEW.entry_config#>>'{shadowSaint,version}' is distinct from '${SHADOW_PROTOCOL}'
  or NEW.entry_config#>>'{shadowSaint,brokerOrderAuthority}' is distinct from 'false'
  or NEW.entry_config#>>'{shadowSaint,portfolioCapitalAuthority}' is distinct from 'false'
  or stamp->>'version' is distinct from '${STARLIGHT_SHADOW_VERSION}'
  or stamp->>'authorization' is distinct from 'VERIFIED_SHADOW_STOP_RECOVERY'
  or NEW.entry_order_id is not null or NEW.entry_client_order_id is not null
  or NEW.exit_order_id is not null or NEW.exit_client_order_id is not null
 then raise exception 'aps2_starlight_virtual_entry_invalid';end if;
 select * into parent from sag_entries where id=NEW.source_trade_id for share;
 select * into w from sag_starlight_recovery_v1 where system_name=NEW.system_name and owner_id=NEW.owner_id
  and mode=NEW.mode and reset_epoch=NEW.shadow_epoch and parent_entry_id=NEW.source_trade_id
  and authorization_id=rec->>'authorizationId' for update;
 select * into proof from sag_shadow_stops_v3 where parent_entry_id=NEW.source_trade_id;
 if parent.id is null or parent.execution_class is distinct from 'SHADOW_SAINT' or parent.archived
  or parent.status is distinct from 'closed' or parent.close_reason is distinct from 'hard_stop_loss'
  or parent.pnl_cents>=0 or parent.remaining_count<>0 or parent.concept_name in ('Crash Recovery Hunter','Lightning Plasma')
  or parent.system_name is distinct from NEW.system_name or parent.owner_id is distinct from NEW.owner_id
  or parent.mode is distinct from NEW.mode or parent.shadow_epoch is distinct from NEW.shadow_epoch
  or parent.ticker is distinct from NEW.ticker or parent.event_ticker is distinct from NEW.event_ticker
  or parent.concept_name is distinct from NEW.source_feeder
  or w.parent_entry_id is null or w.status is distinct from 'EXECUTING'
  or w.revision is distinct from (rec->>'revision')::bigint
  or w.watch->>'virtualGroupVersion' is distinct from '${STARLIGHT_SHADOW_VERSION}'
  or w.watch->>'groupSettingsHash' is distinct from NEW.entry_config->>'executionSettingsHash'
  or proof.parent_entry_id is null or proof.delivery_status='DISABLED_AT_CLOSE'
  or proof.system_name is distinct from NEW.system_name or proof.owner_id is distinct from NEW.owner_id
  or proof.mode is distinct from NEW.mode or proof.reset_epoch is distinct from NEW.shadow_epoch
  or proof.proof_hash is distinct from rec->>'shadowProofHash'
  or w.watch->>'shadowProofHash' is distinct from proof.proof_hash
  or proof.proof->>'entryHash' is distinct from parent.shadow_entry_hash
  or proof.proof->>'authorization' is distinct from 'VALID_SHADOW_HARD_STOP'
  or (proof.proof->>'pnlCents')::numeric is distinct from parent.pnl_cents::numeric
  or (proof.proof->>'filled')::int is distinct from parent.count or proof.proof->>'full' is distinct from 'true'
  or stamp->>'parentEntryId' is distinct from parent.id or stamp->>'shadowProofHash' is distinct from proof.proof_hash
  or stamp->>'authorizationId' is distinct from w.authorization_id or (stamp->>'watchRevision')::bigint is distinct from w.revision
 then raise exception 'aps2_starlight_parent_proof_invalid';end if;
 maximum:=(w.watch->>'maximumSeats')::int;
 if maximum is null or maximum<1 or maximum>greatest(1,least(20,coalesce((cfg->>'crashRecoveryHunterMultiply')::int,1)))
  or (stamp->>'maximumSeats')::int is distinct from maximum
  or coalesce((stamp->>'seat')::int,0) not between 1 and maximum
 then raise exception 'aps2_starlight_seat_invalid';end if;
 select count(*) into used from sag_entries where system_name=NEW.system_name and owner_id=NEW.owner_id
  and mode=NEW.mode and shadow_epoch=NEW.shadow_epoch and concept_name='Crash Recovery Hunter'
  and execution_class='SHADOW_SAINT' and source_trade_id=NEW.source_trade_id;
 if used>=maximum or exists(select 1 from sag_entries where system_name=NEW.system_name and owner_id=NEW.owner_id
  and mode=NEW.mode and shadow_epoch=NEW.shadow_epoch and concept_name='Crash Recovery Hunter'
  and execution_class='SHADOW_SAINT' and source_trade_id=NEW.source_trade_id
  and entry_config#>>'{starlightShadow,seat}'=stamp->>'seat') then raise exception 'aps2_starlight_seat_consumed';end if;
 quote:=NEW.entry_config#>'{shadowSaint,entryExecution,quote}';at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
 aurora:=NEW.entry_config->'aurora';
 if not coalesce(NEW.entry_price_cents between (cfg->>'crashRecoveryMinEntryCents')::numeric and (cfg->>'crashRecoveryMaxEntryCents')::numeric
  and (w.watch->>'stopPriceCents')::numeric between (cfg->>'crashRecoveryMinEntryCents')::numeric and (cfg->>'crashRecoveryMaxEntryCents')::numeric
  and NEW.entry_price_cents*NEW.count<=(cfg->>'crashRecoveryStakeCents')::numeric
  and quote->>'ticker'=NEW.ticker and quote->>'eventTicker'=NEW.event_ticker and quote->>'status'='active'
  and coalesce(quote->>'result','')='' and coalesce(quote->>'bookInvalid','false')<>'true'
  and (quote->>'quoteAtMs')::bigint between greatest(parent.closed_at_ms,at_ms-5000) and at_ms
  and NEW.entry_config#>>'{finalEntryConfirmation,ok}'='true'
  and aurora->>'frozen'='true' and aurora->>'ok'='true' and aurora->>'mode'=NEW.mode
  and (aurora->>'entryPriceCents')::numeric=NEW.entry_price_cents
  and (aurora->>'originalContractCount')::int=NEW.count
  and (aurora->>'damageControlPercent')::numeric=(cfg->>'crashRecoveryHunterAuroraDamageControlPercent')::numeric
  and coalesce(NEW.entry_config#>>'{freezingCoffin,enabled}','false')<>'true',false)
 then raise exception 'aps2_starlight_execution_evidence_invalid';end if;
 return NEW;
end $$;
drop trigger if exists sag_aps2_new_entry on sag_entries;
create trigger sag_aps2_new_entry before insert on sag_entries for each row execute function sag_aps2_new_entry_guard();
create unique index if not exists sag_aps2_starlight_parent_seat on sag_entries
 (system_name,owner_id,mode,shadow_epoch,source_trade_id,((entry_config#>>'{starlightShadow,seat}')::int))
 where concept_name='Crash Recovery Hunter' and execution_class='SHADOW_SAINT'
 and entry_config#>>'{starlightShadow,version}'='${STARLIGHT_SHADOW_VERSION}';
create or replace function sag_aps2_group_consumed_guard() returns trigger language plpgsql as $$
declare used int;maximum int;
begin
 if OLD.watch->>'virtualGroupVersion'='${STARLIGHT_SHADOW_VERSION}' then
  if NEW.watch->'maximumSeats' is distinct from OLD.watch->'maximumSeats'
   or NEW.watch->'groupSettingsHash' is distinct from OLD.watch->'groupSettingsHash'
   or NEW.watch->'virtualGroupVersion' is distinct from OLD.watch->'virtualGroupVersion'
  then raise exception 'aps2_starlight_group_identity_immutable';end if;
  if NEW.status='CONSUMED' and OLD.status<>'CONSUMED' then
   maximum:=(OLD.watch->>'maximumSeats')::int;
   select count(*) into used from sag_entries where system_name=OLD.system_name and owner_id=OLD.owner_id
    and mode=OLD.mode and shadow_epoch=OLD.reset_epoch and execution_class='SHADOW_SAINT'
    and concept_name='Crash Recovery Hunter' and source_trade_id=OLD.parent_entry_id;
   if maximum is null or used<>maximum then raise exception 'aps2_starlight_group_incomplete';end if;
  end if;
 end if;
 return NEW;
end $$;
drop trigger if exists sag_aps2_group_consumed on sag_starlight_recovery_v1;
create trigger sag_aps2_group_consumed before update on sag_starlight_recovery_v1
 for each row execute function sag_aps2_group_consumed_guard();
-- Fence pending legacy BUY identities. Do not alter fills or protection economics.
update sag_entries set entry_config=entry_config||jsonb_build_object('aps2LegacyIntent',
 jsonb_build_object('reconcileOnly',true,'originalExecutionSettingsHash',entry_config->>'executionSettingsHash'),
 'executionSettingsHash','APS2-RECONCILE-ONLY:'||coalesce(entry_config->>'executionSettingsHash','missing'))
 where concept_name in ('Crash Recovery Hunter','Lightning Plasma') and mode='LIVE' and status='entry_pending'
 and coalesce(execution_class,'CAPITAL')<>'SHADOW_SAINT'
 and entry_config#>>'{lightningPlasmaScaleIn,version}' is distinct from 'LP-V4-VIRTUAL-STARLIGHT'
 and coalesce(entry_config#>>'{aps2LegacyIntent,reconcileOnly}','false')<>'true';
`;
