/** MW1-R3 shadow execution protocol. Pure validation; no broker or database access. */
import { CANONICAL_NUMERIC_SETTINGS, CANONICAL_BOOLEAN_SETTINGS } from './config.mjs';
import { authorityHash, verifyAthenaFireCommandHash } from './authority.mjs';
import { isShadowSaintEntry, isShadowSaintConcept, SHADOW_SAINT_ARCHITECTURE,
  SHADOW_SAINT_QUOTE_MAX_AGE_MS, AURORA_EXECUTION, kalshiGeneralTakerFeeEstimateCents } from './doctrine.mjs';

export const SHADOW_PROTOCOL = 'MW1-R3-DURABLE-SHADOW';
export const SHADOW_RUNTIME_LOCK = 'MW-R25-SAVED-RUNTIME-CARD';
export function executionSettingsHash(settings){
  const keys=[...CANONICAL_NUMERIC_SETTINGS,...CANONICAL_BOOLEAN_SETTINGS,'systemName','ownerId','mode','resetTimestampMs','andromedaThunderWaveLevel'];
  return authorityHash(Object.fromEntries([...new Set(keys)].sort().map(k=>[k,settings?.[k]??null])));
}

export const CAPITAL_SQL = "(coalesce(execution_class,'CAPITAL') <> 'SHADOW_SAINT' and coalesce(entry_config->>'executionClass','CAPITAL') <> 'SHADOW_SAINT')";
export const SHADOW_SQL = "(execution_class = 'SHADOW_SAINT' or entry_config->>'executionClass' = 'SHADOW_SAINT')";
export const STARLIGHT_SQL = `concept_name='Crash Recovery Hunter' and ${CAPITAL_SQL}`;
const EPS = 1e-8;
const num = (x) => typeof x === 'number' && Number.isFinite(x);
export function shadowScope(settings, fenceRevision = null) {
  const s = settings || {};
  const scope = {systemName:String(s.systemName || ''), ownerId:String(s.ownerId || ''),
    mode:String(s.mode || ''), resetEpoch:Number(s.resetEpoch ?? s.resetTimestampMs ?? 0)};
  if (!scope.systemName || !scope.ownerId || !['LIVE','SIMULATION'].includes(scope.mode)
      || !Number.isSafeInteger(scope.resetEpoch) || scope.resetEpoch < 0) throw new Error('shadow_scope_invalid');
  if (fenceRevision != null) scope.fenceRevision = Number(fenceRevision);
  return scope;
}
export function sameShadowScope(a, b) {
  try {
    const x=shadowScope(a), y=shadowScope(b);
    return ['systemName','ownerId','mode','resetEpoch'].every(k => x[k] === y[k]);
  } catch { return false; }
}
export function entryMatchesShadowScope(entry, scope) {
  return isShadowSaintEntry(entry) && sameShadowScope({ ...entry,
    resetEpoch:entry.shadowEpoch ?? entry.entryConfig?.shadowSaint?.resetEpoch }, scope)
    && entry.archived !== true;
}
export function shadowDanger(entry) {
  const config=entry?.entryConfig || {}, coffin=config.freezingCoffin, aurora=config.aurora;
  if (coffin?.frozen === true && coffin?.enabled === true && Number(coffin.maxDropCents) > 0)
    return Number(coffin.dangerPriceCents);
  if (aurora?.version === AURORA_EXECUTION.version && aurora.frozen === true && Number(aurora.stopDistanceCents) > 0)
    return Number(aurora.dangerPriceCents);
  return NaN;
}
export function shadowEntryCore(entry) {
  return {id:entry.id, systemName:entry.systemName, ownerId:entry.ownerId, mode:entry.mode,
    ticker:entry.ticker, eventTicker:entry.eventTicker, conceptName:entry.conceptName,
    sourceTradeId:entry.sourceTradeId ?? null, sourceFeeder:entry.sourceFeeder ?? null,
    entryPriceCents:entry.entryPriceCents, entryFeeCents:entry.entryFeeCents, count:entry.count,
    openedAtMs:entry.openedAtMs, entryConfig:JSON.parse(JSON.stringify(entry.entryConfig || {}))};
}
export function shadowEntryHash(entry) { return authorityHash(shadowEntryCore(entry)); }
export function shadowAdmissionId(entry, seat = 1) {
  const c=entry.entryConfig || {};
  const authority=c.crystalWallFire || c.justiceArrowFire || c.ci1WallCloneFire || c.athenaFire || c.legacyQualification || c.starlightShadow;
  const source=authority?.authorizationId || authority?.boltId || entry.sourceTradeId;
  if (!source) throw new Error('shadow_entry_source_identity_missing');
  return `SHADOW:${authorityHash({scope:shadowScope({...entry,resetEpoch:c.shadowSaint?.resetEpoch}),
    concept:entry.conceptName,ticker:entry.ticker,source:String(source),seat:Number(seat)})}`;
}
export function consumeAskDepth(book,count,limit=99){
  const levels=book?.yesAsks || book?.noBids?.map(l=>({priceCents:100-Number(l.priceCents),count:l.count}));
  if(!Array.isArray(levels)||!Number.isSafeInteger(count)||count<=0)return null;
  let left=count,notional=0,prior=0;const consumedLevels=[];
  for(const level of levels){
    const price=Number(level.priceCents),size=Number(level.count);
    if(!Number.isFinite(price)||!Number.isFinite(size)||price<=0||price>=100||size<0||price<prior)return null;
    prior=price;if(price>limit||left<=0)break;
    const take=Math.min(left,size);if(take>0){left-=take;notional+=take*price;consumedLevels.push({priceCents:price,count:take});}
  }
  const filled=count-left;
  return {full:left<=EPS,filled,avgCents:filled?notional/filled:0,bestCents:consumedLevels[0]?.priceCents||0,consumedLevels};
}
export function validateShadowEntryWitness(entry,now=Date.now()){
  const witness=entry.entryConfig?.shadowSaint?.entryExecution,book=witness?.book,q=witness?.quote;
  if(!book||!q||q.ticker!==entry.ticker||String(q.eventTicker||q.ticker)!==entry.eventTicker
    || (book.ticker!=null&&book.ticker!==entry.ticker))return 'shadow_entry_market_identity_missing';
  for(const at of [Number(q.quoteAtMs),Number(book.updatedAtMs)])
    if(!(at>0)||at>now||now-at>SHADOW_SAINT_QUOTE_MAX_AGE_MS)return 'shadow_entry_evidence_stale_or_future';
  if(q.status!=='active'||q.result||q.bookInvalid||book.sequenceValid===false||book.invalidReason
    || !['REST','WS'].includes(String(book.source)))return 'shadow_entry_market_not_executable';
  const ask=Number(book.yesAsks?.[0]?.priceCents??(100-Number(book.noBids?.[0]?.priceCents))),bid=Number(book.yesBids?.[0]?.priceCents);
  if(!(bid>0&&ask<100&&bid<=ask) || bid!==Number(q.yesBid)||ask!==Number(q.yesAsk))return 'shadow_entry_book_incoherent';
  const execution=consumeAskDepth(book,entry.count,Number(witness.limitPriceCents));
  if(!execution?.full||execution.filled<entry.count||Math.abs(execution.avgCents-Number(witness.averagePriceCents))>EPS
    || Math.round(execution.avgCents)!==entry.entryPriceCents)return 'shadow_entry_execution_not_proven';
  return null;
}
export function validateShadowEntry(entry) {
  if (!isShadowSaintEntry(entry) || !isShadowSaintConcept(entry.conceptName)) return 'shadow_class_or_concept_invalid';
  const s=entry.entryConfig?.shadowSaint, config=entry.entryConfig || {};
  if(entry.executionClass !== 'SHADOW_SAINT' || config.executionClass !== 'SHADOW_SAINT') return 'shadow_classification_conflict';
  try { shadowScope({...entry,resetEpoch:s?.resetEpoch}); } catch { return 'shadow_entry_scope_invalid'; }
  if (s?.version !== SHADOW_PROTOCOL || s.brokerOrderAuthority !== false || s.portfolioCapitalAuthority !== false)
    return 'shadow_entry_protocol_invalid';
  if (!entry.id || !entry.ticker || !entry.eventTicker || entry.status !== 'open'
      || !Number.isSafeInteger(entry.count) || entry.count < 1 || entry.remainingCount !== entry.count
      || !(entry.entryPriceCents > 0 && entry.entryPriceCents < 100)
      || !num(entry.entryFeeCents) || entry.entryFeeCents < 0
      || !Number.isSafeInteger(entry.openedAtMs) || entry.openedAtMs < s.resetEpoch
      || !Number.isFinite(shadowDanger(entry))) return 'shadow_entry_economics_invalid';
  if (entry.entryOrderId || entry.entryClientOrderId || entry.exitOrderId || entry.exitClientOrderId)
    return 'shadow_entry_has_broker_identity';
  if (config.finalEntryConfirmation?.ok !== true) return 'shadow_entry_final_confirmation_missing';
  const a=config.crystalWallFire || config.justiceArrowFire || config.ci1WallCloneFire || config.athenaFire || config.legacyQualification || config.starlightShadow;
  if (!a || (!a.authorizationId && !a.boltId) || !verifyAthenaFireCommandHash(a))
    return 'shadow_entry_sealed_source_missing';
  if (String(a.ticker || '') !== entry.ticker) return 'shadow_entry_authority_ticker_mismatch';
  if(a===config.legacyQualification && (a.kind!=='LEGACY_QUALIFIED_ENTRY_NOT_ATHENA_FIRE'
    || a.concept!==entry.conceptName || a.doctrine?.ok!==true || a.athenaAssessment?.blocked===true))
    return 'shadow_legacy_qualification_invalid';
  if(entry.conceptName==='Crash Recovery Hunter'){
    const stamp=config.starlightShadow, recovery=config.starlightRecovery;
    if(!stamp || a!==stamp || stamp.version!=='APS2-VIRTUAL-STARLIGHT-V1'
      || stamp.authorization!=='VERIFIED_SHADOW_STOP_RECOVERY' || !recovery
      || stamp.parentEntryId!==entry.sourceTradeId || stamp.parentEntryId!==recovery.parentEntryId
      || stamp.parentConcept!==entry.sourceFeeder || stamp.parentConcept!==recovery.parentConcept
      || ['Crash Recovery Hunter','Lightning Plasma'].includes(stamp.parentConcept)
      || stamp.authorizationId!==recovery.authorizationId || stamp.shadowProofHash!==recovery.shadowProofHash
      || recovery.shadowProtocol!==SHADOW_PROTOCOL || !stamp.shadowProofHash
      || stamp.watchRevision!==Number(recovery.revision) || !Number.isSafeInteger(stamp.watchRevision) || stamp.watchRevision<1
      || !Number.isSafeInteger(stamp.seat) || stamp.seat<1 || !Number.isSafeInteger(stamp.maximumSeats)
      || stamp.maximumSeats<stamp.seat || stamp.maximumSeats>20 || !sameShadowScope(stamp,{...entry,resetEpoch:entry.shadowEpoch})
      || stamp.eventTicker!==entry.eventTicker || config.freezingCoffin?.enabled===true)
      return 'shadow_starlight_recovery_stamp_invalid';
  }
  if (!s.entryExecution || s.entryExecution.filled < entry.count || !(s.entryExecution.averagePriceCents > 0))
    return 'shadow_entry_execution_witness_missing';
  if (!s.feeModel || !['SIM_PER_CONTRACT','KALSHI_TAKER_ESTIMATE'].includes(s.feeModel.kind))
    return 'shadow_fee_model_missing';
  if(entry.mode==='SIMULATION' && (s.feeModel.kind!=='SIM_PER_CONTRACT' || !Number.isFinite(s.feeModel.simFeeCents) || s.feeModel.simFeeCents<0))return 'shadow_sim_fee_model_invalid';
  if(entry.mode==='LIVE' && s.feeModel.kind!=='KALSHI_TAKER_ESTIMATE')return 'shadow_live_fee_model_invalid';
  return validateShadowEntryWitness(entry);
}

export function consumeBidDepth(book, count, limit = 1) {
  const levels=book?.yesBids;
  if (!Array.isArray(levels) || !Number.isSafeInteger(count) || count <= 0) return null;
  let left=count,notional=0,prior=Infinity;
  const consumedLevels=[];
  for (const level of levels) {
    const price=Number(level.priceCents), size=Number(level.count);
    if (!Number.isFinite(price) || !Number.isFinite(size) || price<=0 || price>=100 || size<0 || price>prior)
      return null;
    prior=price;
    if(price<limit || left<=0)break;
    const take=Math.min(left,size);
    if(take>0){consumedLevels.push({priceCents:price,count:take});notional+=take*price;left-=take;}
  }
  const filled=count-left;
  return {full:left<=EPS,filled,avgCents:filled>0?notional/filled:0,
    bestCents:consumedLevels[0]?.priceCents || 0,
    lowestConsumedCents:consumedLevels.at(-1)?.priceCents || 0,consumedLevels};
}
export function shadowExitFee(entry, execution, settlement=false) {
  if(settlement)return 0;
  const model=entry.entryConfig?.shadowSaint?.feeModel;
  if(model?.kind==='SIM_PER_CONTRACT')return Number(model.simFeeCents)*Number(execution.filled);
  if(model?.kind==='KALSHI_TAKER_ESTIMATE')return execution.consumedLevels.reduce((sum,l)=>sum+
    kalshiGeneralTakerFeeEstimateCents({count:l.count,priceCents:l.priceCents}),0);
  throw new Error('shadow_fee_model_unknown');
}
export function validateShadowObservation(entry, observation, now=Date.now(), {allowSame=false}={}) {
  const q=observation?.quote,b=observation?.book;
  const reject=reason=>({ok:false,reason});
  if (!q || String(q.ticker)!==String(entry.ticker) || String(q.eventTicker||q.ticker)!==String(entry.eventTicker||entry.ticker))
    return reject('shadow_quote_identity_mismatch');
  const quoteAt=Number(q.quoteAtMs), bookAt=Number(b?.updatedAtMs);
  if (!(quoteAt>0) || !Number.isFinite(quoteAt) || quoteAt>now || now-quoteAt>SHADOW_SAINT_QUOTE_MAX_AGE_MS)
    return reject('shadow_quote_stale_or_future');
  const state=entry.shadowState || {};
  if(quoteAt<Number(state.quoteAtMs||0))return reject('shadow_quote_out_of_order');
  const sameAdapter=q.quoteObservation?.epoch && q.quoteObservation.epoch===state.quoteObservation?.epoch;
  if(sameAdapter && Number(q.quoteObservation.revision)<Number(state.quoteObservation.revision))return reject('shadow_quote_revision_regressed');
  const status=String(q.status||'').toLowerCase(), result=String(q.result||'').toLowerCase();
  if(['settled','finalized'].includes(status) && ['yes','no'].includes(result))
    return {ok:true,settlement:true,exitPriceCents:result==='yes'?100:0,quoteAtMs:quoteAt,bookAtMs:0};
  if(status!=='active' || result)return reject('shadow_market_not_active_or_finality_unknown');
  if(!b || (b.ticker!=null && String(b.ticker)!==entry.ticker) || q.bookInvalid===true
      || b.sequenceValid===false || b.invalidReason || !['REST','WS'].includes(String(b.source)))
    return reject('shadow_book_untrusted');
  if(!(bookAt>0) || !Number.isFinite(bookAt) || bookAt>now || now-bookAt>SHADOW_SAINT_QUOTE_MAX_AGE_MS)
    return reject('shadow_book_stale_or_future');
  if(bookAt<Number(state.bookAtMs||0))return reject('shadow_book_out_of_order');
  if(!allowSame && quoteAt===Number(state.quoteAtMs||0) && bookAt===Number(state.bookAtMs||0))
    return reject('shadow_duplicate_observation');
  const bid=Number(q.yesBid),ask=Number(q.yesAsk);
  const bookBid=Number(b.yesBids?.[0]?.priceCents);
  const bookAsk=Number(b.yesAsks?.[0]?.priceCents ?? (100-Number(b.noBids?.[0]?.priceCents)));
  if(!(bid>0&&ask>0&&bid<=ask&&ask<100) || bid!==bookBid || ask!==bookAsk)
    return reject('shadow_crossed_or_incoherent_book');
  const count=Number(entry.remainingCount);
  if(!Number.isSafeInteger(count)||count<1)return reject('shadow_remaining_quantity_invalid');
  const exec=consumeBidDepth(b,count);
  if(!exec?.full || exec.filled+EPS<count)return reject('shadow_partial_executable_depth');
  return {ok:true,settlement:false,execution:exec,quoteAtMs:quoteAt,bookAtMs:bookAt};
}
export function buildShadowCloseProof(entry, observation, decision, now=Date.now()) {
  const valid=validateShadowObservation(entry,observation,now,{allowSame:true});
  if(!valid.ok)throw new Error(valid.reason);
  const count=Number(entry.remainingCount);
  const execution=valid.settlement ? {full:true,filled:count,avgCents:valid.exitPriceCents,consumedLevels:[]} : valid.execution;
  const exitFeeCents=shadowExitFee(entry,execution,valid.settlement);
  const entryFeeShare=Number(entry.entryFeeCents)*count/Number(entry.count);
  const pnlCents=Number(entry.pnlCents||0)+(execution.avgCents-Number(entry.entryPriceCents))*count-entryFeeShare-exitFeeCents;
  let reason=String(decision?.reason||'');
  if(valid.settlement)reason=valid.exitPriceCents===100?'settlement_win':'settlement_loss';
  if(!valid.settlement && reason==='hard_stop_loss') {
    const danger=shadowDanger(entry);
    // A delayed stop may carry forward a *persisted* prior trigger. Caller-supplied
    // guard JSON is not an alternative to a verified trigger recorded by the store.
    if(!(pnlCents<0) || !(Number(observation.quote.yesBid)<=danger+EPS || Number(entry.shadowState?.hardStopTriggeredAtMs)>0))
      throw new Error('shadow_negative_frozen_stop_not_proven');
  } else if(!valid.settlement && !(pnlCents>=0)) throw new Error('shadow_profit_exit_is_negative');
  if(!valid.settlement && !['hard_stop_loss','infinity_break','atomic_thunder_cashout','athena_x1_exit',
      'ultimate_profit_guard','apex_profit_guard','protected_runner_exit','golden_eye_exit',
      'protected_runner_intelligence','golden_eye_cashout'].includes(reason))
    throw new Error('shadow_exit_authority_unknown');
  return {version:SHADOW_PROTOCOL,authorization:reason==='hard_stop_loss'?SHADOW_SAINT_ARCHITECTURE.authorization:null,
    parentEntryId:entry.id,entryHash:shadowEntryHash(entry),scope:shadowScope({...entry,resetEpoch:entry.shadowEpoch}),
    expectedRevision:Number(entry.shadowRevision),count,entryPriceCents:entry.entryPriceCents,
    exitPriceCents:execution.avgCents,exitFeeCents,pnlCents,closedAtMs:now,closeReason:reason,
    full:true,filled:count,quoteAtMs:valid.quoteAtMs,bookAtMs:valid.bookAtMs,
    quoteObservation:structuredClone(observation.quote.quoteObservation||null),
    evidenceHash:authorityHash(observation),observation:structuredClone(observation),
    decision:structuredClone(decision),brokerOrderAuthority:false};
}
export function shadowWatchFromProof(entry, proof, settings) {
  const wait=Math.max(0,Math.min(1000,Math.round(Number(settings.crashRecoveryHunterObservationMinutes)||0)))*60_000;
  return {authorizationId:`STARLIGHT-RECOVERY:${entry.id}`,parentEntryId:entry.id,parentConcept:entry.conceptName,
    authorization:SHADOW_SAINT_ARCHITECTURE.authorization,shadowProtocol:SHADOW_PROTOCOL,shadowProofHash:authorityHash(proof),
    ...shadowScope(settings),ticker:entry.ticker,eventTicker:entry.eventTicker,sport:entry.sport||'Unknown',
    armedAtMs:proof.closedAtMs,releaseAtMs:proof.closedAtMs+wait,expiresAtMs:Number.MAX_SAFE_INTEGER,
    stopPriceCents:proof.exitPriceCents,peakSinceArmCents:proof.exitPriceCents,troughSinceArmCents:proof.exitPriceCents,
    crashConfirmedAtMs:0,upwardTicks:0,lastBidCents:proof.exitPriceCents,lastQuoteAtMs:0,
    status:'ARMED',attempts:0,revision:0,updatedAtMs:proof.closedAtMs};
}
