/** R40 offline research. No import from a trading path, scheduler, or gate.
 * The ledger remains the source of truth. A complete repeatable-read snapshot
 * replaces contributions by scoped entry identity, including equal-time
 * corrections. It never appends a second contribution for a Multiply seat.
 */
import {authorityHash} from './authority.mjs';
import {executionCapital,unresolvedFundedCapital} from './executionReporting.mjs';

export const PRICE_TIME_RESEARCH_VERSION='R40-PRICE-TIME-RESEARCH-1';
const number=v=>v!=null&&v!==''&&Number.isFinite(Number(v))?Number(v):null;
const text=v=>typeof v==='string'&&v.length?v:null;
const scopeKey=s=>JSON.stringify([s.systemName,s.ownerId,s.mode,s.resetEpoch]);
const entryKey=e=>JSON.stringify([e.systemName,e.ownerId,e.mode,number(e.shadowEpoch),e.id]);
export function validateResearchScopes(scopes){
  if(!Array.isArray(scopes)||!scopes.length||scopes.length>100)throw Error('research_explicit_scopes_required');
  return scopes.map(s=>{
    if(!text(s?.systemName)||!text(s?.ownerId)||!['LIVE','SIMULATION'].includes(s.mode)
      ||!Number.isSafeInteger(s.resetEpoch)||s.resetEpoch<0)throw Error('research_scope_invalid');
    return {systemName:s.systemName,ownerId:s.ownerId,mode:s.mode,resetEpoch:s.resetEpoch};
  });
}

// Clock categories stay separate. A bounded start cannot be replaced with its
// midpoint, and an old game_start_time alone is never proof of actual kickoff.
export function researchClock(entry){
  const a=entry?.entryConfig?.sportingTimeAdmission,opened=number(entry?.openedAtMs);
  const unknown={kind:'unknown',elapsedMinutes:null,lowerMinutes:null,upperMinutes:null,source:a?.kind||null};
  if(!(opened>0)||!a)return unknown;
  if(a.kind==='explicit_actual_start'&&a.exactKickoffProven===true){
    const start=number(a.exactStartMs);
    if(start>0&&start<=opened)return {kind:'actual_proven',elapsedMinutes:(opened-start)/60000,lowerMinutes:null,upperMinutes:null,source:a.kind};
  }
  if(a.kind==='observed_provider_status_transition'){
    const lower=number(a.startLowerMs),upper=number(a.startUpperMs);
    if(lower>0&&upper>=lower&&upper<=opened)return {kind:'bounded',elapsedMinutes:null,
      lowerMinutes:(opened-upper)/60000,upperMinutes:(opened-lower)/60000,source:a.kind};
  }
  if(a.kind==='matched_official_schedule_plus_fresh_live'&&a.scheduledStartIsEstimate===true){
    const start=number(a.scheduleReferenceMs),live=number(a.liveObservedAtMs);
    if(start>0&&start<=opened&&live>0&&live<=opened+2000)return {kind:'scheduled_estimate',
      elapsedMinutes:(opened-start)/60000,lowerMinutes:null,upperMinutes:null,source:a.kind};
  }
  return unknown;
}

function settlementFact(e){
  const p=e.postExitState||{};
  if(['settlement_win','settlement_loss'].includes(e.closeReason)&&['yes','no'].includes(p.finalResult)
    &&p.finalResult!==(e.closeReason==='settlement_win'?'yes':'no'))
    return {outcome:null,source:'conflicting_durable_settlement_evidence',observedAtMs:null};
  // A stopped trade can still settle YES. Use terminal market research if it
  // exists, independently of realized P/L and the earlier close route.
  if(p.finalized===true&&p.researchComplete===true&&['yes','no'].includes(p.finalResult)
    &&number(p.finalPayoutCents)===(p.finalResult==='yes'?100:0))
    return {outcome:p.finalResult,source:'durable_terminal_market_research',observedAtMs:number(p.completedAtMs)};
  if(['settlement_win','settlement_loss'].includes(e.closeReason)){
    const outcome=e.closeReason==='settlement_win'?'yes':'no';
    if(number(e.exitPriceCents)===(outcome==='yes'?100:0))
      return {outcome,source:e.mode==='LIVE'?'reconciled_ledger_settlement':'simulation_ledger_settlement',observedAtMs:number(e.closedAtMs)};
  }
  return {outcome:null,source:null,observedAtMs:null};
}

export function researchContribution(entry,scopes){
  const e=entry||{},allowed=new Set(validateResearchScopes(scopes).map(scopeKey));
  if(!allowed.has(scopeKey({...e,resetEpoch:number(e.shadowEpoch)})))return {accepted:false,reason:'scope_mismatch'};
  if(!text(e.id)||!text(e.ticker)||!executionCapital(e))return {accepted:false,reason:'not_scoped_capital'};
  if(e.status!=='closed'||!(number(e.closedAtMs)>0)||!(number(e.openedAtMs)>0)
    ||number(e.closedAtMs)<number(e.openedAtMs)||number(e.remainingCount)!==0)
    return {accepted:false,reason:'unclosed_or_unreconciled'};
  const c=e.entryConfig||{},p=e.postExitState||{},proof=c.entryFillProof;
  if(unresolvedFundedCapital(e)||(p.brokerZeroInventoryClose!=null&&p.brokerZeroInventoryClose.economicClosure!==true)
    ||(p.brokerOwnershipQuarantine!=null&&p.brokerOwnershipQuarantine.economicClosure!==true))return {accepted:false,reason:'economic_closure_unknown'};
  const price=number(e.entryPriceCents),count=number(e.count),fee=number(e.entryFeeCents),exitFee=number(e.exitFeeCents),net=number(e.pnlCents);
  if(!(price>0&&price<100)||!(count>0)||fee==null||fee<0||exitFee==null||exitFee<0||net==null)
    return {accepted:false,reason:'incomplete_economics'};
  if(e.mode==='LIVE'&&!(proof?.authoritative===true&&number(proof.filledCount)===count
    &&number(proof.averageFillPriceCents)!=null&&number(proof.feePaidCents)!=null
    &&Math.abs(number(proof.averageFillPriceCents)-price)<=0.02&&Math.abs(number(proof.feePaidCents)-fee)<=0.021
    &&text(e.entryOrderId)&&text(e.entryClientOrderId)&&proof.orderId===e.entryOrderId
    &&proof.clientOrderId===e.entryClientOrderId))return {accepted:false,reason:'live_filled_basis_unverified'};
  const stamp=c.goldenSaintR17||{},settlement=settlementFact(e),clock=researchClock(e);
  const countBasis=price*count+fee,payout=settlement.outcome==null?null:settlement.outcome==='yes'?100:0;
  const guard=e.stopGuardState||{},aurora=c.aurora||{};
  const facts={id:e.id,systemName:e.systemName,ownerId:e.ownerId,mode:e.mode,resetEpoch:number(e.shadowEpoch),
    archived:e.archived===true,ticker:e.ticker,eventTicker:text(e.eventTicker),
    eventCluster:text(e.eventTicker)?JSON.stringify(['kalshi',e.eventTicker]):null,
    sport:text(e.sport)||text(c.sport)||null,card:text(stamp.saint)||text(e.conceptName),
    settingsFingerprint:text(stamp.cardFingerprint),parentEntryId:text(stamp.parentEntryId)||text(e.sourceTradeId),
    regularRootId:text(stamp.regularRootId),multiplySeat:number(stamp.seat),multiplyLimit:number(stamp.maximumSeats),
    openedAtMs:number(e.openedAtMs),closedAtMs:number(e.closedAtMs),updatedAtMs:number(e.updatedAtMs),
    entryPriceCents:price,count,entryFeeCents:fee,exitFeeCents:exitFee,realizedNetCents:net,
    entryCapitalCents:countBasis,realizedReturn:countBasis>0?net/countBasis:null,
    exitPriceCents:number(e.exitPriceCents),exitRoute:text(e.closeReason),
    earlyExit:!['settlement_win','settlement_loss'].includes(e.closeReason),clock,settlement,
    // Binary settlement payoff at the actual filled basis. No fictitious sale
    // or intragame liquidity is assumed. Additional counterfactual fees remain
    // unknown, so this is deliberately NOT called realized or fee-complete net.
    settlementPayoffBeforeAdditionalFeesCents:payout==null?null:(payout-price)*count-fee,
    maximumSettlementNetBeforeAdditionalFeesCents:(100-price)*count-fee,
    minimumProfitTargetPerContractCents:number(c.economicTarget?.netPerOriginalContractCents),
    lossSeverityCents:Math.max(0,-net),
    aurora:{frozen:aurora.frozen===true,dangerPriceCents:number(aurora.dangerPriceCents),
      budgetCents:number(aurora.maximumEconomicLossCents),touchVerifiedAtMs:number(guard.auroraTouchVerifiedAtMs),
      touchBookMs:number(guard.auroraTouchBookMs),executableBidCents:number(guard.auroraTouchExecutableBidCents),
      evidenceKind:guard.auroraTouchVerification==='FRESH_EXECUTABLE_BOOK'?'fresh_executable_book':null}};
  facts.targetReachableBeforeAdditionalFees=facts.minimumProfitTargetPerContractCents==null?null:
    facts.maximumSettlementNetBeforeAdditionalFeesCents+1e-9>=facts.minimumProfitTargetPerContractCents*count;
  return {accepted:true,key:entryKey(e),revision:authorityHash(facts),facts};
}

export const DEFAULT_PRICE_BANDS=Object.freeze([[1,50],[50,70],[70,80],[80,85],[85,90],[90,95],[95,100]]);
const band=(price,bands)=>{const b=bands.find(([lo,hi])=>price>=lo&&price<hi);return b?`${b[0]}-${b[1]}_exclusive`:null;};
function timeCell(clock,windows){
  if(clock.kind==='unknown')return 'unknown';
  if(clock.kind==='bounded'){
    const w=windows.find(w=>clock.lowerMinutes>=w.startMinutes&&clock.upperMinutes<w.endMinutes);
    return w?w.label:'bounded_crosses_bin_or_outside';
  }
  return windows.find(w=>clock.elapsedMinutes>=w.startMinutes&&clock.elapsedMinutes<w.endMinutes)?.label||'outside_windows';
}
const sum=(a,f)=>a.reduce((s,x)=>s+f(x),0);
function statistics(facts){
  const known=facts.filter(f=>f.settlement.outcome!=null),events=new Map();
  for(const f of facts){if(!f.eventCluster)continue;const a=events.get(f.eventCluster)||[];a.push(f);events.set(f.eventCluster,a);}
  const eventReturns=[...events.values()].map(a=>sum(a,x=>x.realizedNetCents)/sum(a,x=>x.entryCapitalCents));
  const mean=eventReturns.length?sum(eventReturns,x=>x)/eventReturns.length:null;
  const se=eventReturns.length>1?Math.sqrt(sum(eventReturns,x=>(x-mean)**2)/(eventReturns.length-1)/eventReturns.length):null;
  const capital=sum(facts,f=>f.entryCapitalCents),net=sum(facts,f=>f.realizedNetCents);
  return {entries:facts.length,contracts:sum(facts,f=>f.count),independentEventClusters:events.size,
    eventIdentityUnknown: facts.filter(f=>!f.eventCluster).length,knownSettlements:known.length,
    censoredSettlements:facts.length-known.length,settlementYes:known.filter(f=>f.settlement.outcome==='yes').length,
    settlementNo:known.filter(f=>f.settlement.outcome==='no').length,
    // Seat-weighted rate is labeled and never treated as N independent trials.
    descriptiveSeatWinRate:known.length?known.filter(f=>f.settlement.outcome==='yes').length/known.length:null,
    earlyExits:facts.filter(f=>f.earlyExit).length,realizedNetCents:net,entryCapitalCents:capital,
    capitalWeightedRealizedReturn:capital>0?net/capital:null,
    feesCents:sum(facts,f=>f.entryFeeCents+f.exitFeeCents),worstEntryNetCents:facts.length?facts.reduce((v,f)=>Math.min(v,f.realizedNetCents),Infinity):null,
    eventMeanRealizedReturn:mean,eventReturnStandardError:se,
    uncertaintyMethod:'event_cluster_sample_standard_error; no normality or independence guarantee; no selected-window confidence claim',
    unreachableTargets:facts.filter(f=>f.targetReachableBeforeAdditionalFees===false).length};
}

export function analyzePriceTimeSnapshot(snapshot,{windows,holdoutAfterMs,priceBands=DEFAULT_PRICE_BANDS}={}){
  if(snapshot?.complete!==true||!Array.isArray(snapshot.entries))throw Error('complete_ledger_snapshot_required');
  const scopes=validateResearchScopes(snapshot.scopes);
  if(!Array.isArray(windows)||!windows.length||windows.some(w=>!text(w.label)||!Number.isFinite(w.startMinutes)
    ||!Number.isFinite(w.endMinutes)||w.startMinutes<0||w.endMinutes<=w.startMinutes))throw Error('predeclared_windows_required');
  if(new Set(windows.map(w=>w.label)).size!==windows.length)throw Error('research_window_labels_must_be_unique');
  const ordered=[...windows].sort((a,b)=>a.startMinutes-b.startMinutes);
  if(ordered.some((w,i)=>i&&w.startMinutes<ordered[i-1].endMinutes))throw Error('research_windows_must_not_overlap');
  if(!Number.isFinite(holdoutAfterMs)||holdoutAfterMs<=0)throw Error('predeclared_forward_holdout_required');
  if(!Array.isArray(priceBands)||!priceBands.length||priceBands.some((b,i)=>!Array.isArray(b)||b.length!==2
    ||!Number.isFinite(b[0])||!Number.isFinite(b[1])||b[0]<0||b[1]>100||b[0]>=b[1]||(i&&b[0]<priceBands[i-1][1])))throw Error('research_bands_invalid');
  const contributions=new Map(),excluded={};
  for(const e of snapshot.entries){const c=researchContribution(e,scopes);if(!c.accepted){excluded[c.reason]=(excluded[c.reason]||0)+1;continue;}
    const prior=contributions.get(c.key);if(prior&&prior.revision!==c.revision)throw Error('conflicting_entry_revisions_in_snapshot');
    contributions.set(c.key,c);
  }
  const facts=[...contributions.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(c=>c.facts);
  // A repeated event cannot leak from the selection cohort into the held-out
  // cohort through later Multiply seats or another clone. Such events are
  // explicitly censored from both comparison subsets.
  const eventFolds=new Map();
  for(const f of facts){if(!f.eventCluster)continue;const set=eventFolds.get(f.eventCluster)||new Set();set.add(f.openedAtMs<holdoutAfterMs?'selection':'forward_holdout');eventFolds.set(f.eventCluster,set);}
  const cells=new Map();
  for(const f of facts){const fold=!f.eventCluster?'event_unknown':eventFolds.get(f.eventCluster).size>1?'cross_boundary_event':f.openedAtMs<holdoutAfterMs?'selection':'forward_holdout';
    const cohort={mode:f.mode,systemName:f.systemName,ownerId:f.ownerId,resetEpoch:f.resetEpoch,archived:f.archived,
      sport:f.sport,card:f.card,settingsFingerprint:f.settingsFingerprint,priceBand:band(f.entryPriceCents,priceBands),
      clockKind:f.clock.kind,timeWindow:timeCell(f.clock,windows),fold};
    const key=JSON.stringify(cohort),cell=cells.get(key)||{cohort,facts:[]};cell.facts.push(f);cells.set(key,cell);
  }
  const serial=[...contributions.values()].sort((a,b)=>a.key.localeCompare(b.key));
  return {version:PRICE_TIME_RESEARCH_VERSION,authority:'read_only_research_no_order_authority',
    source:snapshot.provenance||null,scopes,design:{windows,priceBands,holdoutAfterMs,selection:'no_automatic_window_selection',
      timeZone:'UTC_milliseconds',settlementCounterfactualFees:'additional_fees_unknown'},
    contributionGeneration:authorityHash(serial.map(c=>[c.key,c.revision])),contributions:serial,excluded,
    totals:statistics(facts),cells:[...cells.values()].sort((a,b)=>JSON.stringify(a.cohort).localeCompare(JSON.stringify(b.cohort)))
      .map(c=>({cohort:c.cohort,...statistics(c.facts)})),
    limits:['No production outcomes are implied by synthetic inputs.','Clock evidence categories are never pooled.',
      'Early-exit realized returns and binary settlement counterfactuals are distinct.',
      'Event clusters group Multiply seats and clones; a seat win rate is descriptive.',
      'Unknown settlement, sporting time, sport or executable opportunity remains unknown.',
      'Forward held-out data must be reviewed only after the window selection is frozen.']};
}

// Explicit offline invocation only. Uses a caller-supplied pool; no credentials,
// settings, timers or connection are created at module import. All SQL is read
// only, parameterized, paged, and scoped. A limit overrun fails rather than
// silently certifying a partial corpus. Existing archived cohorts remain tagged.
export async function readPriceTimeSnapshot(pool,{scopes,maximumRows=100000,pageSize=500}={}){
  const valid=validateResearchScopes(scopes);
  if(!Number.isSafeInteger(maximumRows)||maximumRows<1||maximumRows>1000000
    ||!Number.isSafeInteger(pageSize)||pageSize<1||pageSize>2000)throw Error('research_snapshot_limits_invalid');
  const client=await pool.connect(),entries=[];
  try{
    await client.query('begin isolation level repeatable read read only');
    const meta=(await client.query('select txid_current_snapshot()::text as snapshot,transaction_timestamp() as at')).rows[0];
    for(const s of valid){let after='';for(;;){const result=await client.query(`select * from sag_entries
      where system_name=$1 and owner_id=$2 and mode=$3 and shadow_epoch=$4 and id>$5
      order by id limit $6`,[s.systemName,s.ownerId,s.mode,s.resetEpoch,after,pageSize]);
      for(const r of result.rows){const e={};for(const [k,v] of Object.entries(r))e[k.replace(/_([a-z])/g,(_,x)=>x.toUpperCase())]=v;
        // PostgreSQL int8 remains a decimal string. Normalize exact scope and
        // timestamps only after checking finite/safe range in the consumer.
        e.shadowEpoch=number(e.shadowEpoch);entries.push(e);}
      if(entries.length>maximumRows)throw Error('research_snapshot_row_limit_exceeded');
      if(result.rows.length<pageSize)break;after=String(result.rows.at(-1).id);
    }}
    await client.query('commit');
    return {complete:true,scopes:valid,entries,provenance:{kind:'native_postgresql_repeatable_read',
      databaseSnapshot:meta.snapshot,asOf:meta.at,sourceProjectionHash:authorityHash(entries)}};
  }catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}
}
