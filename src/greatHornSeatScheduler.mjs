/** GH1-SIM3 bounded sequential recovery scheduler.
 * A Multiply group is not dependent on receiving N different quote ticks.
 * A single durable qualified signal may attempt N remaining seats, but every
 * attempt must independently refresh price/depth and pass financial admission.
 * This helper is deliberately incapable of placing an order by itself.
 */
export async function runGreatHornSequentialSeats(watch,{isCurrent,attempt}={}){
  const maximumSeats=Number(watch?.maximumSeats);
  if(watch?.status!=='WATCHING'||watch?.qualified!==true
    ||!Number.isSafeInteger(maximumSeats)||maximumSeats<1||maximumSeats>20
    ||typeof isCurrent!=='function'||typeof attempt!=='function')
    return {ok:false,opened:0,blocked:true,reason:'gh_seat_scheduler_invalid',maximumSeats:0};
  let opened=0,reason='gh_batch_complete',blocked=false,pending=false,denialEvidence=null;
  for(let i=0;i<maximumSeats;i++){
    if(!isCurrent()){blocked=true;reason='gh_batch_operator_changed';break;}
    let result;
    try{result=await attempt(i+1);}catch(error){
      blocked=true;reason='gh_batch_exception:'+String(error?.message||error).slice(0,200);break;
    }
    // A broker-uncertain LIVE result is still a durable reconciliation
    // obligation, even when the transport reports ok:false. It must NEVER
    // be recorded as an ordinary admission denial or permit another BUY.
    if(result?.pending===true){
      blocked=true;pending=true;
      reason=String(result?.reason||'gh_live_pending_receipt_requires_reconciliation');
      break;
    }
    if(result?.ok!==true){
      // An exhausted group is expected only if another worker filled its final
      // seat while we were evaluating. It is never an authority to retry.
      if(result?.reason==='gh_sim_multiply_fully_consumed'){reason=result.reason;break;}
      blocked=true;reason=String(result?.reason||'gh_batch_admission_denied');
      // Only compact, non-sensitive integer-depth facts enter the durable audit.
      // Do not retain raw books, account balance or broker credentials.
      denialEvidence={};
      if(typeof result?.depthReason==='string')
        denialEvidence.depthReason=result.depthReason.slice(0,120);
      for(const k of ['availableAtLimitCount','plannedAvailableAtLimitCount',
        'previouslyConsumedCount','requestedCount']){
        const value=Number(result?.[k]);
        if(result?.[k]!=null&&Number.isSafeInteger(value)&&value>=0)
          denialEvidence[k]=value;
      }
      break;
    }
    opened++;
  }
  return {ok:!blocked,opened,blocked,pending,reason,maximumSeats,denialEvidence};
}

/** GH1-W1: conservative *whole-contract* executable YES ask liquidity from
 * Kalshi's fixed-point order book. Kalshi can legitimately return fractional
 * quantities at any price level. A fractional level is not a malformed book;
 * only complete integer contracts are admissible for our integer orders.
 *
 * Use the same eligible-price aggregation semantics as MarketHub's executable
 * order-book walker. Never round UP fractional liquidity, never accept a bad
 * price, negative/NaN quantity, sequence-invalid book or unsafe accumulator.
 * This helper provides liquidity EVIDENCE, not independent capital authority.
 */
export function greatHornAskDepth(book,limitCents){
  if(book?.sequenceValid===false||!Array.isArray(book?.noBids)
    ||!Number.isSafeInteger(Number(limitCents))||Number(limitCents)<1||Number(limitCents)>99)
    return {ok:false,reason:'gh_depth_missing_or_invalid',count:0};
  // Fixed-point feeds arrive as decimal quantities, but repeated additions of
  // valid fractional levels can round a mathematically integral total DOWN
  // (e.g. ten 0.1 levels -> 0.9999999999999999). Compensated summation
  // avoids false zero-depth vetoes without adding an epsilon that would
  // invent whole contracts from genuinely insufficient liquidity.
  let available=0,compensation=0,fractionalLevels=0;
  for(const level of book.noBids){
    const price=100-Number(level?.priceCents),qty=Number(level?.count);
    if(!Number.isSafeInteger(price)||price<1||price>99
      ||!Number.isFinite(qty)||qty<0||qty>Number.MAX_SAFE_INTEGER)
      return {ok:false,reason:'gh_depth_malformed_level',count:0};
    if(!Number.isSafeInteger(qty))fractionalLevels++;
    if(price<=Number(limitCents)){
      const adjusted=qty-compensation;
      const next=available+adjusted;
      compensation=(next-available)-adjusted;
      available=next;
      if(!Number.isFinite(available)||available>Number.MAX_SAFE_INTEGER)
        return {ok:false,reason:'gh_depth_overflow',count:0};
    }
  }
  // Whole-contract orders cannot spend fractional remainder. In particular,
  // 0.99 available is ZERO contracts; 1.5 available is exactly ONE contract.
  const count=Math.floor(available);
  if(!Number.isSafeInteger(count))return {ok:false,reason:'gh_depth_overflow',count:0};
  return {ok:count>0,reason:count>0?'gh_executable_depth_verified':'gh_depth_empty_at_limit',
    count,fractionalLevels};
}
