/** V3 financial READ model. Never used for entry, exit, sizing or stop authority. */
import {PORTFOLIO_CONCEPTS,isShadowSaintEntry,kalshiGeneralTakerFeeEstimateCents} from './doctrine.mjs';
export const EXECUTION_REPORT_VERSION='EXECUTION-REPORT-V3';
// Separate performance attribution from actual account/exposure accounting.
export const LIGHTNING_REPORT_VERSION='APS2-LIGHTNING-REPORT-V1';
export const lightningCapital=(e)=>e?.conceptName==='Lightning Plasma'&&!isShadowSaintEntry(e);
export const EXECUTION_ATTACKS=Object.freeze(['Crash Recovery Hunter','Lightning Plasma']);
export const EXPOSURE_STATUSES=Object.freeze(['open','exit_pending','entry_pending','pending_recovery']);
const finite=(v)=>v!==null&&v!==undefined&&Number.isFinite(Number(v));
const n=(v)=>finite(v)?Number(v):0;
export const executionCapital=(e)=>EXECUTION_ATTACKS.includes(e?.conceptName)&&!isShadowSaintEntry(e);
// LIVE entry_pending may store the PLANNED count before any BUY. A positive
// reservation is not a fill. Only authoritative receipt metadata makes those
// partial positions eligible for capital display; trading reservations stay intact.
export const hasConfirmedEntryFill=(e)=>e?.status!=='entry_pending'||e?.mode!=='LIVE'||(
  e?.entryConfig?.entryFillProof?.authoritative===true&&Number(e.entryConfig.entryFillProof.filledCount)>0
  && Number(e.entryConfig.entryFillProof.filledCount)===Number(e.count));
export const actualOpenExposure=(e)=>EXPOSURE_STATUSES.includes(String(e?.status))&&Number(e?.remainingCount)>0&&hasConfirmedEntryFill(e);
export const ACTUAL_OPEN_SQL="status in ('open','exit_pending','entry_pending','pending_recovery') and remaining_count>0 and (status<>'entry_pending' or mode<>'LIVE' or (coalesce(entry_config#>>'{entryFillProof,authoritative}','false')='true' and coalesce((entry_config#>>'{entryFillProof,filledCount}')::numeric,0)>0 and (entry_config#>>'{entryFillProof,filledCount}')::numeric=count))";
export function executionScopeMatches(e,s,{ignoreReset=false}={}){
  return !!e&&!e.archived&&['systemName','ownerId','mode'].every(k=>String(e[k]??'')===String(s[k]??''))
    &&(ignoreReset||Number(e.openedAtMs)>=Number(s.resetTimestampMs||0));
}
/** Mark at a verified current best bid. This is NOT a full-depth liquidation claim. */
export function executionValuation(e,quote,settings={},now=Date.now()){
  const remaining=Math.max(0,n(e?.remainingCount)),count=Math.max(0,n(e?.count));
  if(!actualOpenExposure(e))return {complete:true,unrealizedCents:0,remainingMarketValueCents:0,priceCents:null,atMs:null,source:'no_open_exposure'};
  if(!(count>0)||remaining>count||!finite(e?.entryPriceCents))return {complete:false,unrealizedCents:null,remainingMarketValueCents:null,priceCents:null,reason:'invalid_position_quantity_or_basis'};
  const status=String(quote?.status||'').toLowerCase(),result=String(quote?.result||'').toLowerCase();
  const settled=['finalized','settled','determined','closed'].includes(status)&&['yes','no'].includes(result);
  const observedAt=n(quote?.quoteAtMs||quote?.updatedAtMs);
  const fresh=quote?.ticker===e.ticker&&observedAt>0&&observedAt<=now&&now-observedAt<=15000&&!quote?.bookInvalid;
  let price=null,source=null;
  if(settled&&quote?.ticker===e.ticker&&observedAt>0&&observedAt<=now){price=result==='yes'?100:0;source='verified_terminal_payout';}
  else if(fresh&&status==='active'&&finite(quote.yesBid)&&Number(quote.yesBid)>0&&Number(quote.yesBid)<=100){price=Number(quote.yesBid);source='fresh_best_bid_mark_not_full_depth';}
  if(price===null)return {complete:false,unrealizedCents:null,remainingMarketValueCents:null,priceCents:null,atMs:observedAt||null,reason:'current_executable_mark_unavailable'};
  const entryFee=finite(e.entryFeeCents)?Number(e.entryFeeCents):n(settings.simFeeCents)*count;
  const entryFeeRemaining=entryFee*remaining/count;
  const exitFee=settled?0:e.mode==='LIVE'
    ?kalshiGeneralTakerFeeEstimateCents({count:remaining,priceCents:price})
    :n(settings.simFeeCents)*remaining;
  return {complete:true,priceCents:price,atMs:observedAt,source,entryFeeRemainingCents:entryFeeRemaining,
    estimatedExitFeeCents:exitFee,unrealizedCents:(price-n(e.entryPriceCents))*remaining-entryFeeRemaining-exitFee,
    remainingMarketValueCents:price*remaining-exitFee};
}
export function emptyExecutionStats(name){return {name,open:0,closed:0,pending:0,wins:0,losses:0,scratches:0,total:0,winRate:0,
  realizedCents:0,closedRealizedCents:0,partialRealizedCents:0,unrealizedCents:0,knownUnrealizedCents:0,
  valuationComplete:true,missingValuations:0,avgEntryCents:0,dayRealizedCents:0,weekRealizedCents:0,monthRealizedCents:0,yearRealizedCents:0,
  periodsComplete:{day:true,week:true,month:true,year:true}};}
export function combineExecutionStats(byAttack){
  const out=emptyExecutionStats('Lightning Plasma + genuine legacy capital');
  for(const a of Object.values(byAttack)){
    for(const k of ['open','closed','pending','wins','losses','scratches','total','realizedCents','closedRealizedCents','partialRealizedCents','knownUnrealizedCents','missingValuations'])out[k]+=n(a[k]);
    for(const p of ['day','week','month','year']){
      out.periodsComplete[p]&&=a.periodsComplete?.[p]!==false;
      out[`${p}RealizedCents`]+=n(a[`${p}RealizedCents`]);
    }
  }
  out.winRate=out.closed?out.wins/out.closed:0;
  out.valuationComplete=out.missingValuations===0;
  out.unrealizedCents=out.valuationComplete?out.knownUnrealizedCents:null;
  for(const p of ['day','week','month','year'])if(!out.periodsComplete[p])out[`${p}RealizedCents`]=null;
  return out;
}
const localFormatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'});
const localDate=(ms)=>{const p=Object.fromEntries(localFormatter.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));return {year:p.year,month:p.year+'-'+p.month,day:Date.UTC(+p.year,+p.month-1,+p.day)};};
function eventInPeriod(ms,period,now){const t=localDate(ms),d=localDate(now),week=d.day-((new Date(d.day).getUTCDay()+6)%7)*86400000;
  return period==='day'?t.day===d.day:period==='week'?t.day>=week&&t.day<=d.day:period==='month'?t.month===d.month:t.year===d.year;}
/** Bounded legacy/offline reader: time-uncertain historic partials are NOT fabricated. */
export function statisticsFromRows(rows,settings,{getQuote=()=>null,now=Date.now()}={}){
  const byAttack=Object.fromEntries(EXECUTION_ATTACKS.map(x=>[x,emptyExecutionStats(x)]));
  for(const e of rows){
    if(!executionCapital(e)||!executionScopeMatches(e,settings))continue;
    const a=byAttack[e.conceptName],closed=e.status==='closed'&&Number(e.count)>0,open=actualOpenExposure(e);
    if(!closed&&!open){if(e.status==='entry_pending')a.pending++;continue;}
    a.total++;a.avgEntryCents+=n(e.entryPriceCents);
    a.realizedCents+=n(e.pnlCents);
    if(closed){a.closed++;a.closedRealizedCents+=n(e.pnlCents);if(n(e.pnlCents)>0)a.wins++;else if(n(e.pnlCents)<0)a.losses++;else a.scratches++;}
    else {a.open++;a.partialRealizedCents+=n(e.pnlCents);const v=executionValuation(e,getQuote(e.ticker),settings,now);if(v.complete)a.knownUnrealizedCents+=v.unrealizedCents;else a.missingValuations++;}
    if(n(e.pnlCents)!==0){
      const earliest=n(e.openedAtMs),latest=closed?n(e.closedAtMs):now;
      for(const p of ['day','week','month','year']){
        if(earliest>0&&latest>0&&eventInPeriod(earliest,p,now)&&eventInPeriod(latest,p,now))a[`${p}RealizedCents`]+=n(e.pnlCents);
        else if(latest>0&&eventInPeriod(latest,p,now))a.periodsComplete[p]=false;
      }
    }
  }
  for(const a of Object.values(byAttack)){
    a.avgEntryCents=a.total?a.avgEntryCents/a.total:0;a.winRate=a.closed?a.wins/a.closed:0;
    a.valuationComplete=a.missingValuations===0;a.unrealizedCents=a.valuationComplete?a.knownUnrealizedCents:null;
    for(const p of ['day','week','month','year'])if(!a.periodsComplete[p])a[`${p}RealizedCents`]=null;
  }
  return {byAttack,combined:combineExecutionStats(byAttack)};
}
export function statisticsFromSnapshot(snapshot,settings,{getQuote=()=>null,now=Date.now()}={}){
  const byAttack=Object.fromEntries(EXECUTION_ATTACKS.map(x=>[x,emptyExecutionStats(x)]));
  for(const r of snapshot.aggregates||[]){
    const a=byAttack[r.concept_name];if(!a)continue;
    for(const k of ['open','closed','pending','wins','losses','scratches','total'])a[k]=n(r[k]);
    a.closedRealizedCents=n(r.closed_realized_cents);a.partialRealizedCents=n(r.partial_realized_cents);
    a.realizedCents=a.closedRealizedCents+a.partialRealizedCents;a.avgEntryCents=n(r.avg_entry_cents);
  }
  for(const r of snapshot.periods||[]){const a=byAttack[r.concept_name];if(!a)continue;for(const p of ['day','week','month','year']){a.periodsComplete[p]=Number(r[`${p}_unknown`]||0)===0;a[`${p}RealizedCents`]=a.periodsComplete[p]?n(r[`${p}_realized_cents`]):null;}}
  const observedCounts=Object.fromEntries(EXECUTION_ATTACKS.map(x=>[x,0]));
  for(const e of snapshot.openRows||[]){
    if(!executionCapital(e)||!executionScopeMatches(e,settings)||!actualOpenExposure(e))continue;
    const a=byAttack[e.conceptName];observedCounts[e.conceptName]++;
    const v=executionValuation(e,getQuote(e.ticker),settings,now);if(v.complete)a.knownUnrealizedCents+=v.unrealizedCents;else a.missingValuations++;
  }
  for(const a of Object.values(byAttack)){
    if(observedCounts[a.name]!==a.open)throw Error('execution_reporting_snapshot_count_mismatch');
    a.winRate=a.closed?a.wins/a.closed:0;a.valuationComplete=a.missingValuations===0;a.unrealizedCents=a.valuationComplete?a.knownUnrealizedCents:null;
  }
  return {byAttack,combined:combineExecutionStats(byAttack)};
}
export function simulationAccountValue(openRows,cashCents,settings,{getQuote=()=>null,now=Date.now()}={}){
  if(!finite(cashCents))return null;
  let equity=Number(cashCents);
  for(const e of openRows){
    if(!PORTFOLIO_CONCEPTS.has(e.conceptName)||isShadowSaintEntry(e)||!executionScopeMatches(e,settings,{ignoreReset:true})||!actualOpenExposure(e))continue;
    const v=executionValuation(e,getQuote(e.ticker),settings,now);if(!v.complete)return null;equity+=v.remainingMarketValueCents;
  }
  return equity;
}
/** The journal records cumulative-PNL DELTAS, in the same transaction as sag_entries.
 * Replay with unchanged economic columns posts zero events. Legacy ranges preserve
 * totals but cannot invent the dates of historic partial fills.
 */
export const EXECUTION_REPORT_MIGRATION_SQL=`
 create table if not exists sag_execution_realizations_v3(
   id bigserial primary key,entry_id text not null references sag_entries(id),event_key text,
   amount_cents double precision not null,earliest_ms bigint not null,latest_ms bigint not null,
   time_basis text not null,unique(entry_id,event_key)
 );
 create index if not exists sag_execution_realizations_v3_entry on sag_execution_realizations_v3(entry_id,latest_ms);
 create or replace function sag_execution_realization_v3() returns trigger language plpgsql as $$
 declare delta double precision;at_ms bigint;
 begin
   if NEW.concept_name not in ('Crash Recovery Hunter','Lightning Plasma') or coalesce(NEW.execution_class,'CAPITAL')='SHADOW_SAINT'
     or coalesce(NEW.entry_config->>'executionClass','CAPITAL')='SHADOW_SAINT' then return NEW;end if;
   at_ms:=(extract(epoch from clock_timestamp())*1000)::bigint;
   if TG_OP='INSERT' then
     insert into sag_execution_realizations_v3(entry_id,event_key,amount_cents,earliest_ms,latest_ms,time_basis)
       values(NEW.id,'initial',NEW.pnl_cents,at_ms,at_ms,'ledger_posting') on conflict do nothing;
   else
     delta:=NEW.pnl_cents-OLD.pnl_cents;
     if delta<>0 then insert into sag_execution_realizations_v3(entry_id,amount_cents,earliest_ms,latest_ms,time_basis)
       values(NEW.id,delta,at_ms,at_ms,'ledger_posting');end if;
   end if;
   return NEW;
 end; $$;
 -- Snapshot existing cumulative economics exactly once. The possible booking
 -- interval is disclosed; no fictional per-fill historical timestamp is created.
 insert into sag_execution_realizations_v3(entry_id,event_key,amount_cents,earliest_ms,latest_ms,time_basis)
   select e.id,'initial',e.pnl_cents,e.opened_at_ms,
     greatest(e.opened_at_ms,coalesce(e.closed_at_ms,(extract(epoch from clock_timestamp())*1000)::bigint)),
     'legacy_time_interval'
   from sag_entries e where e.concept_name in ('Crash Recovery Hunter','Lightning Plasma')
   and coalesce(e.execution_class,'CAPITAL')<>'SHADOW_SAINT' and coalesce(e.entry_config->>'executionClass','CAPITAL')<>'SHADOW_SAINT'
   and not exists(select 1 from sag_execution_realizations_v3 j where j.entry_id=e.id) on conflict do nothing;
 drop trigger if exists sag_execution_realization_observer_v3 on sag_entries;
 create trigger sag_execution_realization_observer_v3 after insert or update of pnl_cents on sag_entries
   for each row execute function sag_execution_realization_v3();
 alter table sag_snapshots add column if not exists reporting_version text;
 alter table sag_snapshots add column if not exists reporting_scope jsonb;
 alter table sag_snapshots add column if not exists reporting_detail jsonb;
 alter table sag_snapshots alter column portfolio_value_cents drop not null;
 alter table sag_snapshots alter column unrealized_pnl_cents drop not null;
 alter table sag_snapshots alter column hunter_unrealized_pnl_cents drop not null;
`;
