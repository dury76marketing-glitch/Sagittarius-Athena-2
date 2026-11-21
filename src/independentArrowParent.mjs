import {authorityHash} from './authority.mjs';
import {INDEPENDENT_LIFECYCLE_VERSION,independentCapitalId} from './independentRecoveryLifecycle.mjs';
import {liveCapitalParentEntryFillSql} from './liveParentEntryProof.mjs';

// A filled independent Arrow is a different origin from the SA1 open-Starlight
// route. Its successor must preserve the exact admission identity, including
// the original Athena proof. This helper grants no new Arrow or broker authority.
export function independentArrowParentLineage(entry,settings={}){
 const deny=reason=>({ok:false,reason}),rec=entry?.entryConfig?.independentRecovery,auth=entry?.entryConfig?.independentAuthority;
 const epoch=Number(settings.resetTimestampMs??settings.resetEpoch??0);
 if(entry?.conceptName!=='Sagittarius Arrow Recovery'||entry.executionClass!=='CAPITAL'
   ||entry.entryConfig?.executionClass!=='CAPITAL'||entry.entryConfig?.starlightModelClone===true
   ||rec?.version!=='INDEPENDENT-ATHENA-LOSS-V2'||auth?.version!==rec.version
   ||auth.authorityMode!=='INDEPENDENT_ATHENA_SHADOW_STOP'||auth.verifiedStop!==true
   ||!entry.id||!entry.sourceTradeId||!entry.ticker||!entry.eventTicker
   ||!['SIMULATION','LIVE'].includes(entry.mode)||!Number.isSafeInteger(epoch)||epoch<0
   ||['systemName','ownerId','mode'].some(k=>!entry[k]||entry[k]!==settings[k])
   ||rec.parentEntryId!==entry.sourceTradeId||rec.concept!==entry.conceptName||Number(rec.resetEpoch)!==epoch
   ||!String(rec.parentProofHash||'').match(/^[a-f0-9]{64}$/)
   ||rec.watchAuthorizationId!==`INDEPENDENT:Sagittarius Arrow Recovery:${entry.sourceTradeId}`
   ||!Number.isSafeInteger(Number(rec.watchRevision))||Number(rec.watchRevision)<1
   ||!Number.isSafeInteger(Number(rec.signalQuoteAtMs))||Number(rec.signalQuoteAtMs)<=0
   ||Number(rec.signalQuoteAtMs)>Number(entry.openedAtMs)
   ||!String(rec.signalQuoteEpoch||'')||!Number.isSafeInteger(Number(rec.signalQuoteRevision))||Number(rec.signalQuoteRevision)<1
   ||!Number.isSafeInteger(Number(auth.parentClosedAtMs))||Number(auth.parentClosedAtMs)<epoch
   ||Number(auth.parentClosedAtMs)>Number(rec.signalQuoteAtMs)||!(Number(auth.parentPnlCents)<0)
   ||!(Number(auth.authorizedMaxEntryCents)>0&&Number(auth.authorizedMaxEntryCents)<100)
   ||Number(entry.entryPriceCents)>Number(auth.authorizedMaxEntryCents)+1e-9)
  return deny('sn2_independent_parent_identity_invalid');
 const identity={version:rec.version,parentEntryId:entry.sourceTradeId,parentProofHash:rec.parentProofHash,
  watchAuthorizationId:rec.watchAuthorizationId,watchRevision:Number(rec.watchRevision),
  signalQuoteAtMs:Number(rec.signalQuoteAtMs),signalQuoteEpoch:String(rec.signalQuoteEpoch),signalQuoteRevision:Number(rec.signalQuoteRevision),
  concept:entry.conceptName,ticker:entry.ticker,eventTicker:entry.eventTicker,systemName:entry.systemName,ownerId:entry.ownerId,mode:entry.mode,resetEpoch:epoch};
 if(rec.lifecycleVersion!=null||auth.lifecycleVersion!=null){
  const seat=Number(rec.seat),maximum=Number(rec.maximumSeats),generation=Number(rec.attemptGeneration);
  if(rec.lifecycleVersion!==INDEPENDENT_LIFECYCLE_VERSION||auth.lifecycleVersion!==rec.lifecycleVersion
    ||!Number.isSafeInteger(seat)||seat<1||!Number.isSafeInteger(maximum)||maximum<seat||maximum>20
    ||!Number.isSafeInteger(generation)||generation<0||rec.positionId!==entry.id
    ||entry.id!==independentCapitalId({...identity,seat,attemptGeneration:generation}))
   return deny('sn2_independent_parent_seat_identity_invalid');
  Object.assign(identity,{lifecycleVersion:INDEPENDENT_LIFECYCLE_VERSION,seat,maximumSeats:maximum,attemptGeneration:generation});
 }else if((rec.positionId!=null&&rec.positionId!==entry.id)
   ||['seat','maximumSeats','attemptGeneration'].some(k=>rec[k]!=null||auth[k]!=null)){
  return deny('sn2_independent_legacy_identity_invalid');
 }
 if(Object.entries(identity).some(([k,v])=>auth[k]!==v)
   ||['parentProofHash','watchAuthorizationId','signalQuoteEpoch'].some(k=>rec[k]!==auth[k])
   ||rec.authorizationId!==auth.authorizationId
   ||auth.authorizationId!==`INDEP-STOP:${authorityHash(identity)}`)
  return deny('sn2_independent_parent_authority_hash_invalid');
 return {ok:true,reason:'sn2_independent_parent_immutable_lineage',identity};
}

// The database independently checks the immutable hash, original Athena
// evidence, durable independent watch and (for R15) deterministic seat ID.
// Current watch status/card changes cannot rewrite an already funded origin.
// Numeric identities here are safe integers, matching canonicalJson in JS.
export const INDEPENDENT_ARROW_PARENT_SQL=`
create or replace function sag_r15_canonical_json(v jsonb) returns text language plpgsql immutable strict as $$
declare out_text text;
begin
 case jsonb_typeof(v)
 when 'object' then
  select '{'||coalesce(string_agg(to_jsonb(k)::text||':'||sag_r15_canonical_json(x),',' order by k collate "C"),'')||'}'
    into out_text from jsonb_each(v) as t(k,x);
 when 'array' then
  select '['||coalesce(string_agg(sag_r15_canonical_json(x),',' order by n),'')||']'
    into out_text from jsonb_array_elements(v) with ordinality as t(x,n);
 else out_text:=v::text;
 end case;
 return out_text;
end;$$;
create or replace function sag_r15_independent_arrow_origin(p sag_entries,epoch bigint)
 returns boolean language plpgsql stable as $$
declare r jsonb; a jsonb; identity jsonb; origin record; seat_n bigint; maximum_n bigint; generation_n bigint; wanted_id text;
begin
 r:=p.entry_config->'independentRecovery';a:=p.entry_config->'independentAuthority';
 if p.concept_name is distinct from 'Sagittarius Arrow Recovery' or p.execution_class is distinct from 'CAPITAL'
  or p.entry_config->>'executionClass' is distinct from 'CAPITAL' or p.entry_config->>'starlightModelClone'='true'
  or p.archived or p.status is distinct from 'closed' or p.remaining_count<>0 or p.count<=0
  or p.exit_filled_count is distinct from p.count or not coalesce(p.pnl_cents<0,false)
  or p.entry_config#>>'{aurora,frozen}' is distinct from 'true'
  or p.entry_price_cents<=0 or p.entry_price_cents>=100 or p.exit_price_cents not between 0 and 100
  or not coalesce(p.entry_fee_cents>=0 and p.exit_fee_cents>=0 and p.exit_notional_cents>=0,false)
  or not coalesce(abs(p.exit_notional_cents-p.count*p.entry_price_cents-p.entry_fee_cents-p.exit_fee_cents-p.pnl_cents)<=0.000001,false)
  or not coalesce(abs(p.exit_notional_cents-p.exit_price_cents*p.count)<=greatest(0.000001,p.count*0.501),false)
  or p.closed_at_ms is null or p.closed_at_ms<p.opened_at_ms
  or p.closed_at_ms>(extract(epoch from statement_timestamp())*1000)::bigint
  or p.opened_at_ms<epoch
  or (p.mode='SIMULATION' and (p.count<>floor(p.count) or p.entry_client_order_id is not null or p.exit_client_order_id is not null))
  or ${liveCapitalParentEntryFillSql()}
  or (p.mode='LIVE' and ((p.exit_order_id is null and p.exit_execution_state->>'settlementConfirmed' is distinct from 'true')
    or p.exit_execution_state->>'terminal'='false'
    or (p.exit_client_order_id is not null and p.exit_execution_state->>'terminal' is distinct from 'true')))
  or r->>'version' is distinct from 'INDEPENDENT-ATHENA-LOSS-V2' or a->>'version' is distinct from r->>'version'
  or a->>'authorityMode' is distinct from 'INDEPENDENT_ATHENA_SHADOW_STOP' or a->>'verifiedStop' is distinct from 'true'
  or epoch is null or epoch<0 or p.mode not in ('SIMULATION','LIVE') or nullif(p.source_trade_id,'') is null
  or r->>'parentEntryId' is distinct from p.source_trade_id or r->>'concept' is distinct from p.concept_name
  or (r->>'resetEpoch')::bigint is distinct from epoch
  or coalesce(r->>'parentProofHash','')!~'^[a-f0-9]{64}$'
  or r->>'watchAuthorizationId' is distinct from 'INDEPENDENT:Sagittarius Arrow Recovery:'||p.source_trade_id
  or coalesce((r->>'watchRevision')::bigint,0)<1 or coalesce((r->>'signalQuoteRevision')::bigint,0)<1
  or nullif(r->>'signalQuoteEpoch','') is null
  or coalesce((r->>'signalQuoteAtMs')::bigint,0) not between 1 and p.opened_at_ms
  or coalesce((a->>'parentClosedAtMs')::bigint,-1) not between epoch and (r->>'signalQuoteAtMs')::bigint
  or not coalesce((a->>'parentPnlCents')::numeric<0,false)
  or not coalesce((a->>'authorizedMaxEntryCents')::numeric>0 and (a->>'authorizedMaxEntryCents')::numeric<100,false)
  or p.entry_price_cents>(a->>'authorizedMaxEntryCents')::numeric+0.000000001
 then return false;end if;
 identity:=jsonb_build_object('version',r->>'version','parentEntryId',p.source_trade_id,'parentProofHash',r->>'parentProofHash',
  'watchAuthorizationId',r->>'watchAuthorizationId','watchRevision',(r->>'watchRevision')::bigint,
  'signalQuoteAtMs',(r->>'signalQuoteAtMs')::bigint,'signalQuoteEpoch',r->>'signalQuoteEpoch','signalQuoteRevision',(r->>'signalQuoteRevision')::bigint,
  'concept',p.concept_name,'ticker',p.ticker,'eventTicker',p.event_ticker,'systemName',p.system_name,'ownerId',p.owner_id,'mode',p.mode,'resetEpoch',epoch);
 if r->>'lifecycleVersion' is not null or a->>'lifecycleVersion' is not null then
  seat_n:=(r->>'seat')::bigint;maximum_n:=(r->>'maximumSeats')::bigint;generation_n:=(r->>'attemptGeneration')::bigint;
  if r->>'lifecycleVersion' is distinct from '${INDEPENDENT_LIFECYCLE_VERSION}' or a->>'lifecycleVersion' is distinct from r->>'lifecycleVersion'
   or coalesce(seat_n,0) not between 1 and 20 or coalesce(maximum_n,0) not between seat_n and 20
   or coalesce(generation_n,-1) not between 0 and 9007199254740991 or r->>'positionId' is distinct from p.id
  then return false;end if;
  identity:=identity||jsonb_build_object('lifecycleVersion',r->>'lifecycleVersion','seat',seat_n,'maximumSeats',maximum_n,'attemptGeneration',generation_n);
  wanted_id:='IR15-'||substr(encode(sha256(convert_to(sag_r15_canonical_json(jsonb_build_array(
   r->>'lifecycleVersion',p.system_name,p.owner_id,p.mode,epoch::text,p.source_trade_id,p.concept_name,seat_n::text,generation_n::text)),'UTF8')),'hex'),1,40);
  if p.id is distinct from wanted_id then return false;end if;
 elsif (r->>'positionId' is not null and r->>'positionId' is distinct from p.id)
   or r ?| array['seat','maximumSeats','attemptGeneration'] or a ?| array['seat','maximumSeats','attemptGeneration']
 then return false;end if;
 if not coalesce(a @> identity,false) or r->>'authorizationId' is distinct from a->>'authorizationId'
  or a->>'authorizationId' is distinct from 'INDEP-STOP:'||encode(sha256(convert_to(sag_r15_canonical_json(identity),'UTF8')),'hex')
 then return false;end if;
 select ap.*,sp.proof,sp.proof_hash,iw.watch as independent_watch,iw.revision as independent_revision,
  sw.watch as original_watch into origin
 from sag_entries ap join sag_shadow_stops_v3 sp on sp.parent_entry_id=ap.id
 join sag_independent_recovery_v1 iw on iw.parent_entry_id=ap.id and iw.system_name=ap.system_name
  and iw.owner_id=ap.owner_id and iw.mode=ap.mode and iw.reset_epoch=epoch
  and iw.authorization_id=r->>'watchAuthorizationId' and iw.concept=p.concept_name
 join sag_starlight_recovery_v1 sw on sw.parent_entry_id=ap.id and sw.system_name=ap.system_name
  and sw.owner_id=ap.owner_id and sw.mode=ap.mode and sw.reset_epoch=epoch
 where ap.id=p.source_trade_id and ap.system_name=p.system_name and ap.owner_id=p.owner_id and ap.mode=p.mode
  and ap.ticker=p.ticker and ap.event_ticker=p.event_ticker and ap.archived=false
  and ap.concept_name='Athena Exclamation' and ap.execution_class='SHADOW_SAINT'
  and ap.entry_config->>'executionClass'='SHADOW_SAINT' and ap.shadow_epoch=epoch
  and ap.status='closed' and ap.close_reason='hard_stop_loss' and ap.pnl_cents<0 and ap.remaining_count=0
  and ap.count>0 and ap.exit_filled_count=ap.count and ap.opened_at_ms>=epoch
  and ap.closed_at_ms between ap.opened_at_ms and p.opened_at_ms
  and ap.entry_order_id is null and ap.entry_client_order_id is null and ap.exit_order_id is null and ap.exit_client_order_id is null
  and sp.system_name=p.system_name and sp.owner_id=p.owner_id and sp.mode=p.mode and sp.reset_epoch=epoch
  and sp.proof_hash=r->>'parentProofHash';
 if not found then return false;end if;
 if origin.closed_at_ms is distinct from (a->>'parentClosedAtMs')::bigint
  or origin.pnl_cents is distinct from (a->>'parentPnlCents')::double precision
  or abs(origin.exit_notional_cents-origin.count*origin.entry_price_cents-origin.entry_fee_cents-origin.exit_fee_cents-origin.pnl_cents)>0.000001
  or origin.proof_hash is distinct from encode(sha256(convert_to(sag_r15_canonical_json(origin.proof),'UTF8')),'hex')
  or origin.shadow_entry_hash is distinct from encode(sha256(convert_to(sag_r15_canonical_json(jsonb_build_object(
    'id',origin.id,'systemName',origin.system_name,'ownerId',origin.owner_id,'mode',origin.mode,
    'ticker',origin.ticker,'eventTicker',origin.event_ticker,'conceptName',origin.concept_name,
    'sourceTradeId',origin.source_trade_id,'sourceFeeder',origin.source_feeder,'entryPriceCents',origin.entry_price_cents,
    'entryFeeCents',origin.entry_fee_cents,'count',origin.count,'openedAtMs',origin.opened_at_ms,'entryConfig',origin.entry_config)),'UTF8')),'hex')
  or not coalesce(origin.proof @> jsonb_build_object('authorization','VALID_SHADOW_HARD_STOP','parentEntryId',origin.id,
    'entryHash',origin.shadow_entry_hash,'full',true,'filled',origin.count,'count',origin.count,
    'pnlCents',origin.pnl_cents,'closedAtMs',origin.closed_at_ms,'closeReason',origin.close_reason,'exitFeeCents',origin.exit_fee_cents,
    'scope',jsonb_build_object('systemName',p.system_name,'ownerId',p.owner_id,'mode',p.mode,'resetEpoch',epoch)),false)
  or not coalesce(abs((origin.proof->>'exitPriceCents')::numeric*origin.count-origin.exit_notional_cents)<=0.000001,false)
  or not coalesce(origin.independent_watch @> jsonb_build_object('authorizationId',r->>'watchAuthorizationId','independentRecovery',true,
    'authorization','VALID_SHADOW_HARD_STOP','parentEntryId',origin.id,'parentConcept','Athena Exclamation',
    'concept',p.concept_name,'ticker',p.ticker,'eventTicker',p.event_ticker,'systemName',p.system_name,'ownerId',p.owner_id,'mode',p.mode,'resetEpoch',epoch),false)
  or origin.independent_revision<(r->>'watchRevision')::bigint
  or not coalesce(origin.original_watch @> jsonb_build_object('parentEntryId',origin.id,'parentConcept','Athena Exclamation',
    'shadowProofHash',origin.proof_hash,'authorization','VALID_SHADOW_HARD_STOP',
    'ticker',p.ticker,'eventTicker',p.event_ticker,'systemName',p.system_name,'ownerId',p.owner_id,'mode',p.mode,'resetEpoch',epoch),false)
 then return false;end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;$$;
`;
