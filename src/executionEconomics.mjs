import {kalshiGeneralTakerFeeEstimateCents} from './doctrine.mjs';

// Kalshi order limits and book levels are dollars with four decimal places:
// one tick is 0.01 cents. Normalize binary arithmetic noise only; a price
// between those ticks is invalid and is never rounded into executable depth.
export function executionPriceCents(value) {
  if(value==null||typeof value==='boolean'||String(value).trim()==='')return null;
  const price=Number(value),ticks=Math.round(price*100);
  if(!Number.isFinite(price)||!Number.isSafeInteger(ticks)||ticks<=0||ticks>=10000
    ||Math.abs(price*100-ticks)>1e-7)return null;
  return ticks/100;
}

/** Before a LIVE recovery BUY, prove the fee-bearing collateral estimate
 * frozen in its pending intent. A missing/negative/underestimated fee cannot
 * be turned into free collateral or trigger an unsupported shard transfer.
 * This is funding validation, not a profit target or trading-rule change.
 */
export function liveRecoveryCollateralRequirement(entry) {
  const quantity=Number(entry?.count),price=Number(entry?.entryPriceCents);
  const rawFee=entry?.entryConfig?.auroraPending?.preflight?.entryFeeCents;
  const fee=Number(rawFee);
  if (!Number.isSafeInteger(quantity)||quantity<1||!Number.isFinite(price)||price<=0||price>=100
      ||rawFee==null||typeof rawFee==='boolean'||String(rawFee).trim()===''
      ||!Number.isFinite(fee)||fee<0)
    return {ok:false,reason:'live_recovery_collateral_evidence_invalid'};
  const estimated=kalshiGeneralTakerFeeEstimateCents({count:quantity,priceCents:price});
  if (fee+1e-9<estimated)
    return {ok:false,reason:'live_recovery_collateral_fee_underestimated'};
  const requiredCents=quantity*price+fee;
  if (!Number.isFinite(requiredCents)||requiredCents<=0)
    return {ok:false,reason:'live_recovery_collateral_evidence_invalid'};
  return {ok:true,reason:'live_recovery_collateral_verified',requiredCents,entryFeeCents:fee};
}

/** A LIVE BUY POST is only a receipt; exact fills and fees are financial
 * truth solely after a complete authoritative broker order readback.
 * Validate the readback even when the API adapter is replaced in tests.
 */
export function verifiedLiveBuyFillEconomics({readbackVerified=false,orderId=null,
    filledCount,averageFillPriceCents,feePaidCents,plannedCount}={}) {
  const count=Number(filledCount),price=Number(averageFillPriceCents),fee=Number(feePaidCents);
  if (readbackVerified!==true||typeof orderId!=='string'||!orderId.trim()
    ||!Number.isFinite(count)||count<=0||!Number.isFinite(Number(plannedCount))
    ||count>Number(plannedCount)+1e-9
    ||averageFillPriceCents==null||typeof averageFillPriceCents==='boolean'
    ||!Number.isFinite(price)||price<=0||price>=100
    ||feePaidCents==null||typeof feePaidCents==='boolean'||String(feePaidCents).trim()===''
    ||!Number.isFinite(fee)||fee<0)
    return {ok:false,reason:'live_buy_fill_economics_unverified'};
  return {ok:true,reason:'live_buy_fill_economics_verified',count,price,fee};
}

// Receipt evidence, not a trading rule. Preserve a broker-confirmed zero fee;
// unproven legacy/default zeros retain their existing conservative estimates.
export function hasKnownZeroLiveEntryFee(entry) {
  const proof = entry?.entryConfig?.entryFillProof;
  return entry?.mode === 'LIVE' && entry.entryFeeCents != null
    && entry.entryFeeCents !== '' && Number(entry.entryFeeCents) === 0
    && proof?.authoritative === true && Number(proof.filledCount) > 0
    && Number(proof.filledCount) === Number(entry.count);
}


/** Economic admission boundary, not a signal or price-band rule.
 * At terminal YES settlement the largest possible gross payout is 100 cents
 * per contract, with no SELL transaction and therefore no SELL taker fee.
 * Reject only when even that upper bound cannot reach the already-configured
 * net profit target after the entry fee (SIM fee or estimated LIVE fee).
 * This is a necessary feasibility check, never a profitability guarantee.
 */
export function maximumSettlementNetAdmission({entryPriceCents,count,entryFeeCents,minimumNetPerOriginalContractCents}={}) {
  const price=Number(entryPriceCents),qty=Number(count),fee=Number(entryFeeCents),target=Number(minimumNetPerOriginalContractCents);
  // A missing fee is not evidence of a zero fee. Number(null), Number('')
  // and Number(false) all equal zero, which could silently admit a trade
  // whose actual fees make the configured net target impossible.
  const feeEvidencePresent=entryFeeCents!=null
    && !(typeof entryFeeCents==='string' && entryFeeCents.trim()==='')
    && typeof entryFeeCents!=='boolean';
  if(!Number.isFinite(price)||price<=0||price>=100||!Number.isSafeInteger(qty)||qty<1
    ||!feeEvidencePresent||!Number.isFinite(fee)||fee<0||!Number.isFinite(target)||target<=0)
    return {ok:false,reason:'economic_ceiling_evidence_invalid'};
  const bestNetCents=(100-price)*qty-fee;
  const requiredNetCents=target*qty;
  return {ok:bestNetCents+1e-9>=requiredNetCents,
    reason:bestNetCents+1e-9>=requiredNetCents?'economic_ceiling_possible':'economic_target_unreachable_even_at_settlement',
    bestNetCents,requiredNetCents};
}

/** An entry must carry the same net target in the durable operator settings,
 * its frozen economic proof, its active exit policy, and its parent-seat
 * recovery snapshot. This is an integrity check of existing doctrine, not a
 * new trading target or an exit-policy change.
 */
export function frozenRecoveryEconomicTargetMatches({entryConfig,recovery,configuredTarget}={}) {
  const current=Number(configuredTarget);
  if(!Number.isFinite(current)||current<=0||!entryConfig||!recovery)return false;
  const hasX1=entryConfig.athenaExit!=null;
  const hasInfinity=entryConfig.infinityBreak!=null;
  if(hasX1===hasInfinity)return false;
  const values=[entryConfig.economicTarget?.netPerOriginalContractCents,
    recovery.capturedSettings?.minimumNetPerOriginalContractCents,
    hasX1 ? entryConfig.athenaExit?.minimumProfitNetPerOriginalContractCents
          : entryConfig.infinityBreak?.minimumNetPerOriginalContractCents];
  return values.every(value=>value!=null&&value!==''&&typeof value!=='boolean'
    &&Number.isFinite(Number(value))&&Math.abs(Number(value)-current)<=1e-9);
}
