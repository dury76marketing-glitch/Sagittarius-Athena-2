import {brokerDirectionError} from './kalshi.mjs';
import {brokerReceiptDirection} from './operationalSafety.mjs';
import {clientCloneTag} from './cloneIdentity.mjs';
/**
 * Financial closure proof for a LIVE market position that has disappeared
 * from the broker inventory. This module grants no trading or SELL authority.
 * An account-wide settlement can be attributed to a Sagittarius seat only
 * using exact owned order identities and complete broker fill history.
 * Multiply seats are valid owners; unexplained account history fails closed.
 */
const decimal = value => (typeof value === 'number' && Number.isFinite(value)
  || typeof value === 'string' && /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value))
  && Number.isFinite(Number(value)) && Number(value) >= 0;
const finiteInteger = value => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
  || typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value)));
const deny = (reason,detail=null) => ({ok:false,reason,...(detail?{detail}:{} )});
// All LIVE order builders explicitly submit to primary subaccount 0. Missing
// optional scope is covered by exact order ownership; explicit disagreement
// remains a contradiction even if every fill reports the same wrong account.
const primaryAccountScope = row => ['subaccount_number','subaccount'].every(key=>
  row?.[key]==null||(finiteInteger(row[key])&&Number(row[key])===0));
// A prior LIVE build could quarantine a genuinely funded seat when broker
// inventory reached zero. Only its exact original, non-economic BOR1 marker
// qualifies for evidence-backed rehabilitation. Never infer payout from status.
// Broker-flat locally CLOSED rows are not economically CLOSED. Unlike a
// quarantined funded seat, their remaining_count is zero; only an immutable
// BOR1 no-inference marker and authoritative BUY proof can recover ownership.
// This accepts no market inference and grants no SELL/order authority.
export function isBrokerFlatEconomicUnknown(e){
  const q=e?.postExitState?.brokerZeroInventoryClose, p=e?.entryConfig?.entryFillProof;
  return e?.mode==='LIVE'&&e?.status==='closed'&&e?.archived!==true
    &&e.closeReason==='broker_zero_inventory_closed'&&q?.version==='BOR1'
    &&q?.economicClosure===false&&q?.pnlInferred===false&&q?.exitPriceInferred===false
    &&Number(e.count)>0&&Number(e.remainingCount)===0&&Number(e.exitFilledCount||0)===0
    &&Number(e.exitNotionalCents||0)===0&&Number(e.exitFeeCents||0)===0
    &&Number(e.pnlCents||0)===0&&e.exitPriceCents==null
    &&Boolean(e.entryOrderId)&&Boolean(e.entryClientOrderId)
    &&!e.exitClientOrderId&&!e.exitOrderId&&p?.authoritative===true
    &&String(p.orderId)===String(e.entryOrderId)
    &&String(p.clientOrderId)===String(e.entryClientOrderId)
    &&close(p.filledCount,e.count,1e-7)&&close(p.averageFillPriceCents,e.entryPriceCents,0.02)
    &&close(p.feePaidCents,e.entryFeeCents,0.011);
}
export function isLegacyFundedQuarantine(e){
  const q=e?.postExitState?.brokerOwnershipQuarantine;
  return e?.mode==='LIVE' && e?.status==='reconciliation_orphaned'
    && Number(e.count)>0 && Number(e.remainingCount)>0 && Boolean(e.entryOrderId)
    && !e.exitClientOrderId && !e.exitOrderId
    && q?.version==='BOR1' && q.economicClosure===false
    && q.pnlInferred===false && q.exitPriceInferred===false;
}

const close = (a,b,epsilon=0.011) => Math.abs(Number(a)-Number(b))<=epsilon;

// The portfolio/settlements endpoint has shipped both whole-contract/cent
// fields and fixed-point contract/dollar fields. Verify either documented
// representation without guessing units or treating absent amounts as zero.
// If both are present they MUST agree. All payout/ownership checks remain
// downstream, and an invalid receipt is never settlement authority.
function settlementEconomics(r) {
  const invalid = detail => deny('settlement_receipt_economics_invalid',detail);
  if (!r || typeof r !== 'object' || Array.isArray(r)) return invalid('missing_receipt');
  const counts = {};
  const basis = {};
  let legacy = false;
  for (const side of ['yes','no']) {
    const countFp = r[`${side}_count_fp`], countInt = r[`${side}_count`];
    if (countFp == null && countInt == null) return invalid(`${side}_count_missing`);
    if (countFp != null && !decimal(countFp)) return invalid(`${side}_count_fp_invalid`);
    if (countInt != null && !finiteInteger(countInt)) return invalid(`${side}_count_legacy_invalid`);
    if (countFp != null && countInt != null && !close(countFp,countInt,1e-7))
      return invalid(`${side}_count_representations_conflict`);
    counts[side] = Number(countFp ?? countInt);
    if (countFp == null) legacy = true;
    // The API's *_total_cost legacy fields are CENTS; *_dollars are USD.
    const dollars = r[`${side}_total_cost_dollars`], cents = r[`${side}_total_cost`];
    if (dollars != null && !decimal(dollars)) return invalid(`${side}_cost_dollars_invalid`);
    if (cents != null && !finiteInteger(cents)) return invalid(`${side}_cost_legacy_cents_invalid`);
    if (dollars != null && cents != null && !close(Number(dollars)*100,cents,0.000001))
      return invalid(`${side}_cost_representations_conflict`);
    // NO basis is required only if the broker reports nonzero NO inventory.
    // Missing optional zero-NO cost is not invented or used in calculations.
    if (side==='yes' && dollars == null && cents == null) return invalid('yes_cost_missing');
    if (side==='no' && counts.no>0 && dollars == null && cents == null)
      return invalid('no_cost_missing');
    basis[side] = dollars!=null ? Number(dollars)*100 : cents!=null ? Number(cents) : null;
    if (dollars == null && cents != null) legacy = true;
  }
  if (!decimal(r.fee_cost)) return invalid('fee_cost_missing_or_invalid');
  if (!finiteInteger(r.revenue)) return invalid('revenue_cents_missing_or_invalid');
  // Binary outcome and an optional explicit payout must not disagree. The
  // value field is cents per YES contract, not dollars or account revenue.
  if (r.value != null && (!finiteInteger(r.value)
    || !['yes','no'].includes(String(r.market_result||'').toLowerCase())
    || Number(r.value) !== (String(r.market_result).toLowerCase()==='yes'?100:0)))
    return invalid('binary_payout_value_conflict');
  return {ok:true,yesCount:counts.yes,noCount:counts.no,
    yesBasisCents:basis.yes,noBasisCents:basis.no,
    revenueCents:Number(r.revenue),feeCents:Number(r.fee_cost)*100,
    format:legacy?'legacy_or_mixed':'fixed_point'};
}

export function proveSingleLiveSettlement(entry,settlements,fills,market,{now=Date.now()}={}){
  if(!entry||entry.mode!=='LIVE'||entry.archived===true||!['open','exit_pending'].includes(entry.status)
    ||!entry.ticker||!entry.systemName||!entry.ownerId||!entry.id) return deny('settlement_scope_invalid');
  if(!Number.isFinite(Number(entry.count))||Number(entry.count)<=0
    ||!close(entry.remainingCount,entry.count,1e-7)
    ||Number(entry.exitFilledCount||0)!==0||Number(entry.pnlCents||0)!==0)
    return deny('settlement_partial_or_economic_state_unverified');
  const quantity=Number(entry.count);
  const entryPrice=Number(entry.entryPriceCents),entryFee=Number(entry.entryFeeCents);
  if(!(entryPrice>0&&entryPrice<100)||!decimal(entry.entryFeeCents)||!entry.entryOrderId||!entry.entryClientOrderId
    ||!Number.isSafeInteger(Number(entry.openedAtMs))||Number(entry.openedAtMs)<=0)
    return deny('settlement_entry_identity_invalid');
  const proof=entry.entryConfig?.entryFillProof;
  if(proof?.authoritative!==true||String(proof.orderId)!==String(entry.entryOrderId)
    ||String(proof.clientOrderId)!==String(entry.entryClientOrderId)
    ||!close(proof.filledCount,quantity,1e-7)||!close(proof.averageFillPriceCents,entryPrice,0.02)
    ||!close(proof.feePaidCents,entryFee,0.011))return deny('settlement_entry_proof_missing');
  const shard=entry.entryConfig?.brokerRouting?.exchangeIndex;
  if(!finiteInteger(shard))return deny('settlement_shard_identity_missing');
  if(!Array.isArray(fills)||!fills.length)return deny('settlement_fill_history_missing');
  let buyQuantity=0,buyNotional=0,buyFee=0;
  const seen=new Set();
  for(const f of fills){
    if(!f||String(f.ticker??f.market_ticker??'')!==String(entry.ticker)
      ||!f.fill_id||seen.has(String(f.fill_id)))return deny('settlement_fill_history_not_unique');
    seen.add(String(f.fill_id));
    if(String(f.order_id)!==String(entry.entryOrderId))return deny('settlement_other_order_on_ticker');
    if(!finiteInteger(f.exchange_index)||Number(f.exchange_index)!==Number(shard))return deny('settlement_fill_shard_mismatch');
    if(!primaryAccountScope(f))return deny('settlement_fill_subaccount_mismatch');
    if(brokerDirectionError(f,'bid'))return deny('settlement_fill_direction_mismatch');
    const count=f.count_fp??f.count;
    const px=f.yes_price_dollars!=null?Number(f.yes_price_dollars)*100:Number(f.yes_price);
    if(!decimal(count)||Number(count)<=0||!Number.isFinite(px)||px<=0||px>=100
      ||!decimal(f.fee_cost))return deny('settlement_fill_economics_invalid');
    buyQuantity+=Number(count);buyNotional+=Number(count)*px;buyFee+=Number(f.fee_cost)*100;
  }
  if(!close(buyQuantity,quantity,1e-7)||!close(buyNotional,entryPrice*quantity,0.021)
    ||!close(buyFee,entryFee,0.021))return deny('settlement_entry_fills_mismatch');
  if(!Array.isArray(settlements)||settlements.length!==1)return deny('settlement_missing_or_multiple',
    Array.isArray(settlements)&&settlements.length===0?'authenticated_settlement_receipt_unavailable_no_archive_equivalent':null);
  const receipt=settlements[0];
  if(String(receipt?.ticker??'')!==String(entry.ticker)
    ||(entry.eventTicker&&receipt.event_ticker!=null&&String(receipt.event_ticker)!==String(entry.eventTicker))
    ||!finiteInteger(receipt.exchange_index)||Number(receipt.exchange_index)!==Number(shard))
    return deny('settlement_ticker_or_shard_mismatch');
  if(!primaryAccountScope(receipt))return deny('settlement_receipt_subaccount_mismatch');
  const outcome=String(receipt.market_result||'').toLowerCase();
  if(!['yes','no'].includes(outcome))return deny('settlement_result_invalid');
  const econ=settlementEconomics(receipt);
  if(!econ.ok)return econ;
  if(!close(econ.yesCount,quantity,1e-7)||econ.noCount>1e-7)
    return deny('settlement_account_quantity_mismatch');
  if(!close(econ.yesBasisCents,buyNotional,0.021))
    return deny('settlement_account_basis_mismatch');
  const payoutCents=outcome==='yes'?100:0;
  if(!close(econ.revenueCents,payoutCents*quantity,0.021))
    return deny('settlement_revenue_or_fee_invalid');
  if(!close(econ.feeCents,buyFee,0.021))
    return deny('settlement_account_fees_mismatch');
  const settledAtMs=Date.parse(String(receipt.settled_time||''));
  if(!Number.isFinite(settledAtMs)||settledAtMs<Number(entry.openedAtMs)
    ||settledAtMs>now+30_000)return deny('settlement_time_invalid');
  if(market&&String(market.ticker||'')===String(entry.ticker)){
    const marketResult=String(market.result||'').toLowerCase();
    if(['yes','no'].includes(marketResult)&&marketResult!==outcome)
      return deny('settlement_market_result_conflict');
    if(['active','initialized'].includes(String(market.status||'').toLowerCase()))
      return deny('settlement_market_still_active');
  }
  return {ok:true,reason:'verified_account_settlement',payoutCents,outcome,settledAtMs,
    provenance:{version:'LIVE-SETTLEMENT-ACCOUNT-RECEIPT-V1',ticker:entry.ticker,
      exchangeIndex:Number(shard),settledAtMs,marketResult:outcome,quantity,
      revenueCents:econ.revenueCents,receiptFormat:econ.format,entryOrderId:entry.entryOrderId,
      entryClientOrderId:entry.entryClientOrderId,entryFillCount:buyQuantity,
      entryFillFeeCents:buyFee}};
}


// Recovery only: a broker-flat, uniquely owned YES seat may have a complete
// SELL fill history even when the older order's GET receipt is unavailable.
// Never infer an exit from missing inventory or a market result. Require every
// relevant account fill, exact persisted BUY and SELL IDs, shard, quantity,
// price, fee, direction and chronology. No entry or SELL authority is granted.
export function proveExactLiveSellClose(entry,fills,{now=Date.now()}={}){
  if(!entry||entry.mode!=='LIVE'||entry.archived===true||entry.status!=='exit_pending'
    ||!entry.id||!entry.systemName||!entry.ownerId||!entry.ticker
    ||!entry.entryOrderId||!entry.entryClientOrderId||!entry.exitOrderId||!entry.exitClientOrderId)
    return deny('sell_proof_scope_invalid');
  const qty=Number(entry.count),remaining=Number(entry.remainingCount);
  if(!(qty>0)||!close(qty,remaining,1e-7)||Number(entry.exitFilledCount||0)!==0
    ||Number(entry.pnlCents||0)!==0||Number(entry.exitExecutionState?.appliedFillCount||0)!==0)
    return deny('sell_proof_partial_or_ledger_conflict');
  const price=Number(entry.entryPriceCents),fee=Number(entry.entryFeeCents);
  const proof=entry.entryConfig?.entryFillProof;
  if(!(price>0&&price<100)||!decimal(entry.entryFeeCents)
    ||proof?.authoritative!==true||String(proof.orderId)!==String(entry.entryOrderId)
    ||String(proof.clientOrderId)!==String(entry.entryClientOrderId)
    ||!close(proof.filledCount,qty,1e-7)
    ||!close(proof.averageFillPriceCents,price,0.02)
    ||!close(proof.feePaidCents,fee,0.011))return deny('sell_proof_entry_identity_missing');
  const shard=entry.entryConfig?.brokerRouting?.exchangeIndex;
  if(!finiteInteger(shard))return deny('sell_proof_shard_missing');
  if(!Number.isSafeInteger(Number(entry.openedAtMs))||Number(entry.openedAtMs)<=0)
    return deny('sell_proof_entry_time_invalid');
  if(!Array.isArray(fills)||fills.length<2)return deny('sell_proof_complete_history_missing');
  const seen=new Set();
  let buyQty=0,buyNotional=0,buyFee=0,sellQty=0,sellNotional=0,sellFee=0;
  let lastSellAtMs=0;
  for(const f of fills){
    if(!f||!f.fill_id||seen.has(String(f.fill_id))
      ||String(f.ticker??f.market_ticker??'')!==String(entry.ticker))
      return deny('sell_proof_duplicate_or_wrong_market');
    seen.add(String(f.fill_id));
    if(!finiteInteger(f.exchange_index)||Number(f.exchange_index)!==Number(shard))
      return deny('sell_proof_shard_or_side_mismatch');
    if(!primaryAccountScope(f))return deny('sell_proof_subaccount_mismatch');
    const isBuy=String(f.order_id)===String(entry.entryOrderId);
    const isSell=String(f.order_id)===String(entry.exitOrderId);
    if(isBuy===isSell)return deny('sell_proof_other_order_or_collision');
    // Either canonical direction field is sufficient; when both are supplied
    // they must agree. Deprecated action/side is fallback only. Exact client
    // and order identities remain independent mandatory ownership checks.
    const book=isBuy?'bid':'ask';
    const clientId=isBuy?entry.entryClientOrderId:entry.exitClientOrderId;
    if(f.client_order_id!=null&&String(f.client_order_id)!==String(clientId))
      return deny('sell_proof_fill_client_mismatch');
    if(brokerDirectionError(f,book))return deny('sell_proof_fill_direction_mismatch');
    const q=f.count_fp??f.count;
    const px=f.yes_price_dollars!=null?Number(f.yes_price_dollars)*100:Number(f.yes_price);
    if(!decimal(q)||!(Number(q)>0)||!(px>0&&px<=100)||!decimal(f.fee_cost))
      return deny('sell_proof_fill_economics_invalid');
    const ts=f.created_time!=null?Date.parse(String(f.created_time))
      :f.ts!=null?Number(f.ts)*1000:NaN;
    if(!Number.isFinite(ts)||ts<Number(entry.openedAtMs)-120_000||ts>now+30_000)
      return deny('sell_proof_fill_time_invalid');
    if(isBuy){buyQty+=Number(q);buyNotional+=Number(q)*px;buyFee+=Number(f.fee_cost)*100;}
    else{if(ts<Number(entry.openedAtMs))return deny('sell_proof_sell_before_entry');
      sellQty+=Number(q);sellNotional+=Number(q)*px;sellFee+=Number(f.fee_cost)*100;
      lastSellAtMs=Math.max(lastSellAtMs,ts);}
  }
  if(!close(buyQty,qty,1e-7)||!close(buyNotional,qty*price,0.021)
    ||!close(buyFee,fee,0.021))return deny('sell_proof_buy_economics_conflict');
  if(!close(sellQty,remaining,1e-7)||!(sellNotional>0)||!(sellNotional<=sellQty*100+0.021))
    return deny('sell_proof_full_exit_not_verified');
  return {ok:true,reason:'verified_exact_broker_sell_fills',orderId:entry.exitOrderId,
    fillCount:sellQty,averageFillPriceCents:sellNotional/sellQty,feePaidCents:sellFee,
    provenance:{version:'LIVE-EXACT-SELL-FILL-RECOVERY-V1',ticker:entry.ticker,
      orderId:entry.exitOrderId,clientOrderId:entry.exitClientOrderId,exchangeIndex:Number(shard),
      sellQuantity:sellQty,sellNotionalCents:sellNotional,sellFeeCents:sellFee,lastSellAtMs}};
}


/**
 * Attribute one authenticated binary settlement to ALL known seats on a ticker.
 * Quantity is fungible at the broker, but BUY basis, SELL receipts and P/L remain
 * per seat. Closed siblings are included so a restart between durable closes
 * cannot pay the same settlement twice or make the remaining seat unprovable.
 * This function grants no order authority and writes no ledger state.
 */
export function proveLiveSettlementSeats(entries, settlements, fills, market,
  {now=Date.now(), historicalOrders=[],foreignCloneTags=[],verifiedForeignOrders=[]}={}) {
  if(!Array.isArray(entries)||!entries.length||entries.length>2000)
    return deny('settlement_seat_history_missing_or_oversized');
  const first=entries[0],ticker=String(first?.ticker||''),owner=String(first?.ownerId||'');
  if(!ticker||!owner||!Array.isArray(fills)||!fills.length)
    return deny('settlement_seat_fill_history_missing');
  const seats=new Map(),orders=new Map();let latestFillAtMs=0;
  const assign=(orderId,id,phase)=>{
    if(!orderId)return false;
    const key=String(orderId),old=orders.get(key);
    if(old&&(old.id!==id||old.phase!==phase))return false;
    orders.set(key,{id,phase});return true;
  };
  for(const e of entries){
    if(!e||e.mode!=='LIVE'||e.ownerId!==owner||e.ticker!==ticker||!e.systemName||!e.id
      ||seats.has(String(e.id))||e.archived===true
      ||!(['open','exit_pending','closed'].includes(e.status)||isLegacyFundedQuarantine(e)))return deny('settlement_seat_scope_conflict');
    const quantity=Number(e.count),price=Number(e.entryPriceCents),fee=Number(e.entryFeeCents);
    const p=e.entryConfig?.entryFillProof,shard=e.entryConfig?.brokerRouting?.exchangeIndex;
    if(!decimal(e.count)||!(quantity>0)||!(price>0&&price<100)||!decimal(e.entryFeeCents)
      ||!e.entryOrderId||!e.entryClientOrderId||!finiteInteger(shard)
      ||!Number.isSafeInteger(Number(e.openedAtMs))||Number(e.openedAtMs)<=0
      ||p?.authoritative!==true||!decimal(p.filledCount)||!decimal(p.averageFillPriceCents)||!decimal(p.feePaidCents)
      ||String(p.orderId)!==String(e.entryOrderId)
      ||String(p.clientOrderId)!==String(e.entryClientOrderId)
      ||!close(p.filledCount,quantity,1e-7)||!close(p.averageFillPriceCents,price,0.02)
      ||!close(p.feePaidCents,fee,0.011))return deny('settlement_seat_entry_proof_invalid');
    if(!assign(e.entryOrderId,String(e.id),'buy'))return deny('settlement_duplicate_order_owner');
    if(e.exitOrderId&&!assign(e.exitOrderId,String(e.id),'sell'))return deny('settlement_duplicate_order_owner');
    seats.set(String(e.id),{e,quantity,price,fee,shard:Number(shard),buy:0,basis:0,buyFee:0,
      sold:0,proceeds:0,sellFee:0,subaccounts:new Set(),fillIds:[]});
  }
  for(const h of historicalOrders){
    const seat=seats.get(String(h?.entryId));
    // Only the caller's exact authenticated order inspection can supply a
    // historical mapping; there is no ticker-wide FIFO or inferred owner.
    if(!seat||h.authoritative!==true||!h.clientOrderId||!h.orderId
      ||!['executed','filled','canceled','cancelled','expired','rejected'].includes(h.status)
      ||!assign(h.orderId,String(h.entryId),'sell'))return deny('settlement_historical_order_owner_conflict');
  }
  const seen=new Set(),accountIds=new Set(),perOrder=new Map();
  const foreignTags=new Set(foreignCloneTags||[]);
  const exactForeignOrders=new Map();
  // These mappings originate from exact authenticated broker ORDER receipts
  // in the settlement caller. Duplicate/conflicting ownership cannot be
  // overwritten, and a locally-owned order cannot also be "foreign".
  for(const row of verifiedForeignOrders||[]){
    const orderId=String(row?.orderId||''),clientId=String(row?.clientOrderId||'');
    if(!orderId||!clientId||!clientCloneTag(clientId)||orders.has(orderId)
      ||exactForeignOrders.has(orderId))return deny('settlement_foreign_order_identity_conflict');
    exactForeignOrders.set(orderId,clientId);
  }
  let foreignBuy=0,foreignSell=0,foreignBuyBasis=0,foreignSellProceeds=0,foreignFee=0;
  const foreignFillIds=[];
  for(const f of fills){
    if(!f||String(f.ticker??f.market_ticker??'')!==ticker||!f.fill_id||seen.has(String(f.fill_id)))
      return deny('settlement_duplicate_or_wrong_market_fill');
    seen.add(String(f.fill_id));
    const o=orders.get(String(f.order_id)),seat=o&&seats.get(o.id);
    if(!seat){
      // The exact broker ORDER inspection (not an optional fill client ID)
      // supplies foreign client identity. Kalshi fills identify order_id;
      // a present client_order_id must still agree and never override it.
      // Unknown/manual/pre-clone fills remain unprovable and block closure.
      const provenClient=exactForeignOrders.get(String(f.order_id||''));
      const token=clientCloneTag(provenClient);
      if(!provenClient||!token||!foreignTags.has(token)
        ||(f.client_order_id!=null&&String(f.client_order_id)!==provenClient))
        return deny('settlement_unowned_account_fill');
      const direction=brokerReceiptDirection(f);
      if(direction.reason||!['bid','ask'].includes(direction.bookSide))
        return deny('settlement_foreign_fill_direction_invalid');
      if(!finiteInteger(f.exchange_index)||!primaryAccountScope(f))
        return deny('settlement_foreign_fill_account_invalid');
      const q=f.count_fp??f.count,rawPrice=f.yes_price_dollars??f.yes_price;
      const price=Number(rawPrice)*(f.yes_price_dollars!=null?100:1);
      const ts=f.created_time!=null?Date.parse(String(f.created_time)):Number(f.ts)*1000;
      if(!decimal(q)||!(Number(q)>0)||!decimal(rawPrice)||!(price>0&&price<=100)
        ||!decimal(f.fee_cost)||!Number.isFinite(ts)||ts>now+30000)
        return deny('settlement_foreign_fill_economics_invalid');
      const quantity=Number(q),fee=Number(f.fee_cost)*100;
      if(direction.bookSide==='bid'){foreignBuy+=quantity;foreignBuyBasis+=quantity*price;}
      else{foreignSell+=quantity;foreignSellProceeds+=quantity*price;}
      foreignFee+=fee;foreignFillIds.push(String(f.fill_id));
      latestFillAtMs=Math.max(latestFillAtMs,ts);
      continue;
    }
    const expectedClient=o.phase==='buy'?seat.e.entryClientOrderId
      :(String(f.order_id)===String(seat.e.exitOrderId)?(seat.e.exitClientOrderId||seat.e.exitExecutionState?.clientOrderId)
        :historicalOrders.find(h=>String(h.orderId)===String(f.order_id))?.clientOrderId);
    if(f.client_order_id!=null&&(!expectedClient||String(f.client_order_id)!==String(expectedClient)))
      return deny('settlement_seat_fill_client_mismatch');
    if(!finiteInteger(f.exchange_index)||Number(f.exchange_index)!==seat.shard)
      return deny('settlement_seat_fill_shard_mismatch');
    if(!primaryAccountScope(f))return deny('settlement_seat_fill_subaccount_mismatch');
    const buy=o.phase==='buy',expectedBook=buy?'bid':'ask';
    // Canonical direction is authoritative. Only canonical-absent receipts
    // fall back to the complete legacy action/side pair.
    if(brokerDirectionError(f,expectedBook))return deny('settlement_seat_fill_direction_mismatch');
    const q=f.count_fp??f.count,rawPrice=f.yes_price_dollars??f.yes_price;
    const price=Number(rawPrice)*(f.yes_price_dollars!=null?100:1);
    const ts=f.created_time!=null?Date.parse(String(f.created_time)):Number(f.ts)*1000;
    if(!decimal(q)||!(Number(q)>0)||!decimal(rawPrice)||!(price>0&&price<=100)
      ||!decimal(f.fee_cost)||!Number.isFinite(ts)||ts<Number(seat.e.openedAtMs)-(buy?120000:0)
      ||ts>now+30000)return deny('settlement_seat_fill_economics_or_time_invalid');
    latestFillAtMs=Math.max(latestFillAtMs,ts);
    if(f.subaccount_number!=null){if(!finiteInteger(f.subaccount_number))return deny('settlement_subaccount_invalid');
      accountIds.add(Number(f.subaccount_number));}
    const quantity=Number(q),fee=Number(f.fee_cost)*100;
    if(buy){seat.buy+=quantity;seat.basis+=quantity*price;seat.buyFee+=fee;}
    else{seat.sold+=quantity;seat.proceeds+=quantity*price;seat.sellFee+=fee;}
    seat.fillIds.push(String(f.fill_id));
    const total=perOrder.get(String(f.order_id))||{count:0,notional:0,fee:0};
    total.count+=quantity;total.notional+=quantity*price;total.fee+=fee;perOrder.set(String(f.order_id),total);
  }
  if(accountIds.size>1)return deny('settlement_multiple_subaccounts_ambiguous');
  for(const h of historicalOrders){
    const total=perOrder.get(String(h.orderId))||{count:0,notional:0,fee:0};
    if(!decimal(h.fillCount)||!close(total.count,h.fillCount,1e-7)
      ||(total.count>0&&(!close(total.notional,Number(h.averageFillPriceCents)*total.count,0.021)
        ||!close(total.fee,h.feePaidCents,0.021))))return deny('settlement_historical_fill_receipt_mismatch');
  }
  if(!Array.isArray(settlements)||settlements.length!==1)return deny('settlement_missing_or_multiple',
    Array.isArray(settlements)&&settlements.length===0?'authenticated_settlement_receipt_unavailable_no_archive_equivalent':null);
  const r=settlements[0],outcome=String(r?.market_result||'').toLowerCase();
  if(String(r?.ticker||'')!==ticker||!['yes','no'].includes(outcome)||!finiteInteger(r.exchange_index))
    return deny('settlement_receipt_identity_invalid');
  if(!primaryAccountScope(r))return deny('settlement_receipt_subaccount_mismatch');
  const payoutCents=outcome==='yes'?100:0,settledAtMs=Date.parse(String(r.settled_time||''));
  if(!Number.isFinite(settledAtMs)||settledAtMs>now+30000||latestFillAtMs>settledAtMs)
    return deny('settlement_time_invalid');
  const econ=settlementEconomics(r);
  if(!econ.ok)return econ;
  if(market&&String(market.ticker||'')===ticker){
    if(['active','initialized'].includes(String(market.status||'').toLowerCase()))return deny('settlement_market_still_active');
    if(['yes','no'].includes(String(market.result||'').toLowerCase())&&String(market.result).toLowerCase()!==outcome)
      return deny('settlement_market_result_conflict');
  }
  let residualTotal=0,totalBuyQuantity=0,totalBuyBasis=0,totalSold=0,totalSellProceeds=0,totalFillFees=0;
  let previouslyAllocatedRevenueCents=0;
  const allocations=[];
  for(const seat of seats.values()){
    const {e}=seat;
    if(seat.shard!==Number(r.exchange_index)||(e.eventTicker&&r.event_ticker!=null&&e.eventTicker!==r.event_ticker)
      ||settledAtMs<Number(e.openedAtMs))return deny('settlement_seat_receipt_scope_mismatch');
    if(!close(seat.buy,seat.quantity,1e-7)||!close(seat.basis,seat.price*seat.quantity,0.021)
      ||!close(seat.buyFee,seat.fee,0.021)||seat.sold>seat.buy+1e-7)
      return deny('settlement_seat_buy_history_mismatch');
    const remaining=seat.buy-seat.sold;
    const soldPnl=seat.proceeds-seat.price*seat.sold-seat.fee*seat.sold/seat.quantity-seat.sellFee;
    const prior=e.exitExecutionState?.brokerSettlementProof;
    if(isBrokerFlatEconomicUnknown(e)){
      // Treat only this original proof-gated BOR1 closure as unpaid. The row
      // itself never becomes open or sellable. Recovered SELL fills remain
      // exact-order truth; remaining quantity needs a complete ACCOUNT receipt.
      if(remaining>1e-7)allocations.push({entryId:e.id,payoutCents,quantity:remaining,settledAtMs,outcome,
        brokerFlatHistorical:true,soldCount:seat.sold,soldProceedsCents:seat.proceeds,
        soldFeeCents:seat.sellFee,
        provenance:{version:'LIVE-BROKER-FLAT-ECONOMIC-REPLAY-V1',ticker,
          exchangeIndex:seat.shard,settledAtMs,marketResult:outcome,quantity:remaining,
          soldCount:seat.sold,soldProceedsCents:seat.proceeds,soldFeeCents:seat.sellFee,
          revenueCents:payoutCents*remaining,entryOrderId:e.entryOrderId,
          entryClientOrderId:e.entryClientOrderId,ownerSeatIds:[...seats.keys()].sort()}});
    }else if(e.status==='closed'){
      const expectedPnl=soldPnl+(payoutCents-seat.price)*remaining-seat.fee*remaining/seat.quantity;
      if(!close(e.remainingCount,0,1e-7)||!close(e.exitFilledCount,seat.quantity,1e-7)
        ||!close(e.exitNotionalCents,seat.proceeds+payoutCents*remaining,0.021)
        ||!close(e.exitFeeCents,seat.sellFee,0.021)||!close(e.pnlCents,expectedPnl,0.021))
        return deny('settlement_closed_sibling_economics_mismatch');
      if(remaining>1e-7&&(!prior||Number(prior.settledAtMs)!==settledAtMs
        ||prior.ticker!==ticker||Number(prior.quantity)!==remaining||prior.marketResult!==outcome))
        return deny('settlement_closed_sibling_proof_missing');
      previouslyAllocatedRevenueCents+=payoutCents*remaining;
    }else{
      if(!decimal(e.remainingCount)||!close(e.remainingCount,remaining,1e-7)
        ||!close(e.exitFilledCount||0,seat.sold,1e-7)||!close(e.exitNotionalCents||0,seat.proceeds,0.021)
        ||!close(e.exitFeeCents||0,seat.sellFee,0.021)||!close(e.pnlCents||0,soldPnl,0.021))
        return deny('settlement_seat_sell_ledger_mismatch');
      if(remaining>1e-7)allocations.push({entryId:e.id,payoutCents,quantity:remaining,settledAtMs,outcome,
        provenance:{version:'LIVE-MULTISEAT-SETTLEMENT-V2',ticker,exchangeIndex:seat.shard,
          settledAtMs,marketResult:outcome,quantity:remaining,revenueCents:payoutCents*remaining,
          accountQuantity:econ.yesCount,accountRevenueCents:econ.revenueCents,receiptFormat:econ.format,
          entryOrderId:e.entryOrderId,entryClientOrderId:e.entryClientOrderId,
          entryFillCount:seat.buy,entryFillFeeCents:seat.buyFee,verifiedSellCount:seat.sold,
          verifiedSellFeeCents:seat.sellFee,ownerSeatIds:[...seats.keys()].sort()}});
    }
    residualTotal+=remaining;totalBuyQuantity+=seat.buy;totalBuyBasis+=seat.basis;
    totalSold+=seat.sold;totalSellProceeds+=seat.proceeds;
    totalFillFees+=seat.buyFee+seat.sellFee;
  }
  // These are independent clone-owned positions on ONE netted account. The
  // complete receipt must reconcile ALL registered foreign fills in addition
  // to local seats. Foreign amounts NEVER enter local payout allocations.
  if(foreignSell>foreignBuy+1e-7)return deny('settlement_foreign_account_netting_unprovable');
  const accountBuyQuantity=totalBuyQuantity+foreignBuy;
  const accountSoldQuantity=totalSold+foreignSell;
  const accountNetQuantity=residualTotal+foreignBuy-foreignSell;
  const accountBuyBasis=totalBuyBasis+foreignBuyBasis;
  const accountSellProceeds=totalSellProceeds+foreignSellProceeds;
  const accountFeeTotal=totalFillFees+foreignFee;
  const evidence={receiptYesCount:econ.yesCount,receiptNoCount:econ.noCount,
    receiptYesBasisCents:econ.yesBasisCents,receiptNoBasisCents:econ.noBasisCents,
    receiptRevenueCents:econ.revenueCents,receiptFeeCents:econ.feeCents,ownedFillFeeCents:totalFillFees,
    ownedBuyCount:totalBuyQuantity,
    ownedSellCount:totalSold,ownedBuyBasisCents:totalBuyBasis,
    ownedSellProceedsCents:totalSellProceeds,remainingCount:residualTotal,
    foreignFillCount:foreignFillIds.length,foreignBuyQuantity:foreignBuy,
    foreignSellQuantity:foreignSell,foreignNetQuantity:foreignBuy-foreignSell,
    accountNetQuantity,accountFeeTotal};
  // Quantity representation and cash-payout representation are independent.
  // Some receipts retain gross YES/NO acquisition counts even though paired
  // contracts were offset before settlement and only net YES was paid. A pair
  // is worth 100 cents in either binary outcome; it is NEVER a new entitlement
  // for an unsold seat. Exact owned SELL proceeds above remain realized once.
  const expectedNetRevenueCents=payoutCents*accountNetQuantity;
  const pairedReleaseCents=100*accountSoldQuantity;
  const expectedGrossRevenueCents=payoutCents*accountBuyQuantity+(100-payoutCents)*accountSoldQuantity;
  const allocatedRevenueCents=allocations.reduce((sum,a)=>sum+a.provenance.revenueCents,0);
  Object.assign(evidence,{expectedNetRevenueCents,expectedGrossRevenueCents,pairedReleaseCents,
    allocatedRevenueCents,previouslyAllocatedRevenueCents});
  const economicRefusal=(reason,detail)=>({...deny(reason,detail),evidence});
  if(!close(expectedGrossRevenueCents-pairedReleaseCents,expectedNetRevenueCents,0.021)
    ||!close(allocatedRevenueCents+previouslyAllocatedRevenueCents,payoutCents*residualTotal,0.021))
    return economicRefusal('settlement_allocation_mismatch','net_entitlement_conservation_failed');
  let inventoryRepresentation='netted',revenueRepresentation='net_remaining';
  if(econ.noCount>1e-7){
    // An owned YES SELL is also the opposite exposure (NO at 100-YES price).
    // The settlement can retain both legs instead of displaying only net YES.
    // Such a receipt is accepted ONLY when every gross contract and both cost
    // bases are explained by the exact owned fills already proved above. This
    // is not permission to ignore other accounts' NO holdings or infer a sale.
    if(!close(econ.yesCount,accountBuyQuantity,1e-7)||!close(econ.noCount,accountSoldQuantity,1e-7)
      ||!close(econ.yesCount-econ.noCount,accountNetQuantity,1e-7))
      return economicRefusal('settlement_account_quantity_or_revenue_mismatch',
        'opposing_inventory_not_explained_by_owned_fills');
    const noBasis=100*accountSoldQuantity-accountSellProceeds;
    if(!close(econ.yesBasisCents,accountBuyBasis,0.021)||econ.noBasisCents==null
      ||!close(econ.noBasisCents,noBasis,0.021))
      return economicRefusal('settlement_account_basis_mismatch','gross_yes_or_no_cost_basis_mismatch');
    // Do not derive revenue semantics from the gross counts. Accept only
    // either fully proved endpoint, never an arbitrary amount between them.
    // Net-revenue receipts are the production incident's representation.
    // Retain existing gross-leg receipt compatibility, but never allocate the
    // paired release to remaining seats or add it to earlier SELL proceeds.
    if(close(econ.revenueCents,expectedNetRevenueCents,0.021))
      revenueRepresentation='net_remaining';
    else if(close(econ.revenueCents,expectedGrossRevenueCents,0.021))
      revenueRepresentation='gross_legs';
    else return economicRefusal('settlement_account_quantity_or_revenue_mismatch',
      'paired_revenue_matches_neither_net_nor_gross');
    if(!close(econ.feeCents,accountFeeTotal,0.021))
      return economicRefusal('settlement_account_fees_mismatch','gross_fill_fees_mismatch');
    inventoryRepresentation='paired_gross';
  }else{
    if(!close(accountNetQuantity,econ.yesCount,1e-7)||!close(econ.revenueCents,payoutCents*accountNetQuantity,0.021))
      return economicRefusal('settlement_account_quantity_or_revenue_mismatch','net_payout_mismatch');
    // With no SELLs, account basis equals exact aggregate BUY basis. After
    // netting SELLs, account basis is not a per-seat FIFO allocation; exact
    // BUY/SELL fills above still establish each seat's complete economics.
    if(accountSoldQuantity===0&&!close(econ.yesBasisCents,accountBuyBasis,0.021))
      return economicRefusal('settlement_account_basis_mismatch','net_buy_cost_basis_mismatch');
    // Settlement fee_cost is the documented total fees paid, independent of
    // whether quantities are reported gross or net. Exact fills cannot excuse
    // an explicitly contradictory account-wide fee receipt.
    if(!close(econ.feeCents,accountFeeTotal,0.021))
      return economicRefusal('settlement_account_fees_mismatch','net_fill_fees_mismatch');
  }
  for(const allocation of allocations)Object.assign(allocation.provenance,{
    inventoryRepresentation,revenueRepresentation,accountNoQuantity:econ.noCount,accountNetQuantity,
    accountNetRevenueCents:expectedNetRevenueCents,accountGrossRevenueCents:expectedGrossRevenueCents,
    accountPairedReleaseCents:pairedReleaseCents,
    ownedBuyQuantity:totalBuyQuantity,ownedSellQuantity:totalSold});
  return {ok:true,reason:'verified_multiseat_account_settlement',allocations,settledAtMs,
    quantity:residualTotal,revenueCents:econ.revenueCents,settlementRevenueCents:payoutCents*residualTotal,
    allocatedRevenueCents,previouslyAllocatedRevenueCents,
    inventoryRepresentation,revenueRepresentation,evidence};
}
