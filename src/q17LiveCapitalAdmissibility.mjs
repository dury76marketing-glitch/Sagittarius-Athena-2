// Q17-R9: LIVE execution-only collateral and pending lifecycle accounting.
// No signal, price band, LINK, Multiply, or SIM admission policy lives here.
import {kalshiGeneralTakerFeeEstimateCents} from './doctrine.mjs';
import {liveRecoveryCollateralRequirement} from './executionEconomics.mjs';

export const Q17_LIVE_CAPITAL_ADMISSIBILITY = 'Q17-R9-LIVE-ENTRY-SCOPED-COLLATERAL-V1';
const finite=(v)=>v!==null&&v!==undefined&&v!==''&&typeof v!=='boolean'&&Number.isFinite(Number(v));
const route=(v)=>finite(v)&&Number.isSafeInteger(Number(v))&&Number(v)>=0&&Number(v)<=100?Number(v):null;

export function pendingCapitalRequirement(entry){
  const qty=Number(entry?.count),price=Number(entry?.entryPriceCents);
  if(!Number.isFinite(qty)||qty<=0||!Number.isFinite(price)||price<=0||price>=100)
    return {ok:false,reason:'q17_live_pending_cash_economics_unknown'};
  const estimated=kalshiGeneralTakerFeeEstimateCents({count:qty,priceCents:price});
  const supplied=entry?.entryConfig?.auroraPending?.preflight?.entryFeeCents;
  const fee=finite(supplied)&&Number(supplied)>=0?Math.max(Number(supplied),estimated):estimated;
  const cents=qty*price+fee;
  if(!Number.isFinite(cents)||cents<=0)return {ok:false,reason:'q17_live_pending_cash_economics_unknown'};
  return {ok:true,requiredCents:cents};
}

export function createQ17LiveCashWitness(entry,brokerBalance,{observedAtMs=Date.now()}={}){
  const requirement=liveRecoveryCollateralRequirement(entry),exchangeIndex=route(brokerBalance?.exchangeIndex);
  const availableCents=Number(brokerBalance?.availableCents),time=Number(observedAtMs);
  if(!requirement.ok||brokerBalance?.ok!==true||exchangeIndex===null
    ||!finite(brokerBalance?.availableCents)||availableCents<0
    ||!Number.isSafeInteger(time)||time<=0||time>Date.now()+1_000
    ||availableCents+1e-9<requirement.requiredCents)
    return {ok:false,reason:'q17_live_cash_witness_missing_or_insufficient'};
  return {ok:true,witness:{version:Q17_LIVE_CAPITAL_ADMISSIBILITY,exchangeIndex,
    availableCents,requiredCents:requirement.requiredCents,observedAtMs:time}};
}

export function verifyQ17LiveCashWitness(entry,{now=Date.now(),maximumAgeMs=10_000}={}){
  const proof=entry?.entryConfig?.q17LiveCashWitness;
  const required=liveRecoveryCollateralRequirement(entry);
  const observed=Number(proof?.observedAtMs),available=Number(proof?.availableCents);
  if(!required.ok||proof?.version!==Q17_LIVE_CAPITAL_ADMISSIBILITY
    ||route(proof.exchangeIndex)===null
    ||route(entry?.entryConfig?.brokerRouting?.exchangeIndex)!==Number(proof.exchangeIndex)
    ||!finite(proof.availableCents)||available<0||!finite(proof.requiredCents)
    ||Math.abs(Number(proof.requiredCents)-required.requiredCents)>1e-6
    ||!Number.isSafeInteger(observed)||observed<=0||now<observed||now-observed>maximumAgeMs)
    return {ok:false,reason:'q17_live_cash_witness_stale_or_changed'};
  return {ok:true,exchangeIndex:Number(proof.exchangeIndex),availableCents:available,
    requiredCents:required.requiredCents};
}

export function q17LivePendingReserveDecision(entry,otherPending,options={}){
  const witness=verifyQ17LiveCashWitness(entry,options);if(!witness.ok)return witness;
  let reservedCents=0,competingPending=0;
  for(const row of otherPending||[]){
    if(row.id===entry.id)continue;
    const existingShard=route(row.entryConfig?.brokerRouting?.exchangeIndex);
    // Unknown-route obligations cannot be proved independent of this shard.
    // Never infer they are unsubmitted or treat a missing receipt as zero cash.
    if(existingShard===null)return {ok:false,reason:'q17_live_pending_route_unresolved'};
    if(existingShard!==witness.exchangeIndex)continue;
    const amount=pendingCapitalRequirement(row);
    if(!amount.ok)return amount;
    reservedCents+=amount.requiredCents;competingPending++;
  }
  if(witness.availableCents+1e-9<reservedCents+witness.requiredCents)
    return {ok:false,reason:'q17_live_shard_cash_reserved_for_pending_orders',
      exchangeIndex:witness.exchangeIndex,competingPending,reservedCents,
      requiredCents:witness.requiredCents,availableCents:witness.availableCents};
  return {ok:true,reason:'q17_live_independent_cash_admission',
    exchangeIndex:witness.exchangeIndex,competingPending,reservedCents,
    requiredCents:witness.requiredCents,availableCents:witness.availableCents};
}

// The same durable identity that protects one trade from retrying can be
// accounted for without marking every other market's account unhealthy.
// This never manufactures a fill, erases a cash obligation, or changes P/L.
export function q17LiveOwnedPositionDisposition(entry){
  if(!entry||entry.mode!=='LIVE')return {ok:false,reason:'q17_live_ledger_scope_invalid'};
  const status=entry.status;
  if(status==='entry_pending'){
    if(typeof entry.entryClientOrderId!=='string'||!entry.entryClientOrderId.trim()
      ||route(entry.entryConfig?.brokerRouting?.exchangeIndex)===null
      ||entry.executionClass==='SHADOW_SAINT'
      ||(entry.entryConfig?.q17LiveDispatch?.state!=null
        &&entry.entryConfig?.q17LiveDispatch?.clientOrderId!==entry.entryClientOrderId))
      return {ok:false,reason:'q17_live_pending_identity_unproven'};
    const proof=entry.entryConfig?.entryFillProof;
    if(proof?.authoritative===true){
      const qty=Number(proof.filledCount),planned=Number(entry.count);
      if(!entry.entryOrderId||!Number.isFinite(qty)||qty<=0||!Number.isFinite(planned)
        ||qty>planned+1e-9)return {ok:false,reason:'q17_live_partial_fill_ownership_unverified'};
      // A partially filled BUY is real owned inventory, but the unfilled seat
      // is not a missing broker position. Use exactly the broker-backed count.
      return {ok:true,pending:true,requiresInventory:true,inventoryCount:qty};
    }
    return {ok:true,pending:true,requiresInventory:false};
  }
  if(status==='open'||status==='exit_pending'||status==='pending_recovery'){
    const count=Number(entry.remainingCount??entry.count);
    if(!Number.isFinite(count)||count<0||!entry.entryOrderId
      ||entry.entryConfig?.entryFillProof?.authoritative!==true)
      return {ok:false,reason:'q17_live_owned_inventory_unverified'};
    return {ok:true,pending:status!=='open',requiresInventory:true};
  }
  return {ok:false,reason:'q17_live_owned_status_unexpected'};
}
