/**
 * R17.7-R6 integrated LIVE broker reconciliation, pure decision boundary.
 *
 * Financial orphans are never treated as verified settled positions. Only an
 * authenticated COMPLETE flat broker snapshot, no resting orders on their
 * tickers, AND a valid owner-wide active ledger can make their historical
 * accounting obligation non-blocking for new unrelated LIVE admission.
 *
 * In particular, a clean orphan test CANNOT overwrite a preceding negative
 * q17LiveOwnedPositionDisposition or any genuine broker ownership failure.
 * No broker calls or SQL queries are performed by this helper.
 */
const nonblank=v=>typeof v==='string'&&v.length>0&&v===v.trim();
const finiteQuantity=v=>
  (typeof v==='number'&&Number.isFinite(v))
  ||(typeof v==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim())
    &&Number.isFinite(Number(v)));
const failure=(reason,detail={})=>({ok:false,reason,...detail});

/** The authenticated Kalshi market_positions contract uses position_fp first.
 * Other documented representations are checked conservatively too: any
 * nonzero signed net, YES, or NO leg proves the ticker is NOT broker-flat.
 * Unknown, incomplete, or contradictory quantities cannot establish flatness.
 */
export function r17BrokerInventoryPresence(positions){
  if(!Array.isArray(positions))return failure('broker_inventory_snapshot_unavailable');
  const present=new Set(),seen=new Set();
  for(const row of positions){
    const ticker=row?.ticker??row?.market_ticker;
    if(!nonblank(ticker))return failure('broker_inventory_ticker_unverifiable');
    if(seen.has(ticker))return failure('broker_inventory_duplicate_ticker');
    seen.add(ticker);
    const primary=row?.position_fp??row?.position??row?.market_position;
    // KalshiClient.getPositions() requires one of these fields. Do not allow
    // missing, NaN or malformed quantities to become an apparent zero.
    if(!finiteQuantity(primary))return failure('broker_inventory_quantity_unverifiable');
    const keys=['position_fp','position','market_position','yes_count','no_count'];
    let exposed=false;
    for(const key of keys){
      const value=row?.[key];
      if(value===null||value===undefined)continue;
      if(!finiteQuantity(value))return failure('broker_inventory_quantity_unverifiable');
      if(Number(value)!==0)exposed=true;
    }
    if(exposed)present.add(String(ticker));
  }
  return {ok:true,present};
}

export function liveArmingReconciliationDecision({
  baseReconciliationOk=false,invalidOwned=[],financialOrphans=[],
  positions=null,orders=null,shortages=[],orderIssues=null,
  scopeChanged=false,generationChanged=false,ownClaimedTickers=[],
}={}){
  if(!Array.isArray(invalidOwned)||!Array.isArray(financialOrphans)
    ||!Array.isArray(shortages)||!Array.isArray(orders)||!orderIssues
    ||typeof orderIssues!=='object')return failure('reconciliation_inputs_unavailable');
  // A negative proof from the actual owner-wide disposition/summary is
  // immutable here. An orphan exception may ONLY relax the orphan gate.
  // Classify broker exposure first so historical flat rows cannot block arming.
  const inv=r17BrokerInventoryPresence(positions);
  if(!inv.ok)return inv;
  const resting=new Set();
  for(const order of orders){
    const ticker=order?.ticker??order?.market_ticker;
    if(!nonblank(ticker))return failure('broker_resting_order_ticker_unverifiable');
    resting.add(String(ticker));
  }
  const exposed=t=>inv.present.has(String(t||''))||resting.has(String(t||''));
  const activeInvalid=(invalidOwned||[]).filter(x=>exposed(x.ticker));
  const flatInvalid=(invalidOwned||[]).filter(x=>!exposed(x.ticker));
  if(activeInvalid.length)return failure('owned_position_unverified',{
    invalidOwnedCount:activeInvalid.length,
    invalidOwnedReasons:[...new Set(activeInvalid.map(x=>String(x.reason||'unknown')))].slice(0,8),
    flatInvalidCount:flatInvalid.length,
  });
  const activeShortages=(shortages||[]).filter(s=>exposed(s.ticker));
  if(activeShortages.length)return failure('ownership_shortage',{
    shortageCount:activeShortages.length,flatShortageCount:shortages.length-activeShortages.length});
  // baseReconciliationOk false is only blocking if we still have an unexplained
  // failure after filtering flat historical rows. Flat-only failures are not a block.
  if(baseReconciliationOk!==true&&(activeInvalid.length||activeShortages.length))
    return failure('base_reconciliation_not_clean');
  // unknownOnOwned after clone scoping is often another clone's resting order
  // on a shared ticker. Shared-account inventory is not this clone's exposure.
  // Block only when THIS clone claims an inventory-requiring ticker.
  // Genuine ownershipConflicts always block.
  const thisCloneClaims=(ownClaimedTickers||[]).length>0;
  if(orderIssues.ownershipConflicts)return failure('order_ownership',{kind:'ownership_conflicts'});
  if(orderIssues.unknownOnOwned&&thisCloneClaims)
    return failure('order_ownership',{kind:'unknown_on_owned_with_exposure'});
  // A scope or generation change during the snapshot matters only when this
  // clone claims inventory. An unclaimed clone cannot acquire exposure from
  // a stale read; final order admission still rechecks broker and cash.
  if(thisCloneClaims&&scopeChanged)return failure('scope_changed_during_snapshot');
  if(thisCloneClaims&&generationChanged)return failure('account_generation_changed');

  const claimed=new Set((ownClaimedTickers||[]).map(t=>String(t||'')));
  const active=[],flat=[];
  for(const e of financialOrphans){
    // The native SQL reader enforces these scopes; check again at the pure
    // boundary to prevent unrecognized entries being treated as safely flat.
    const ticker=String(e?.ticker||'');
    const isFlat=!exposed(ticker);
    const claimsThis=claimed.has(ticker);
    if(!nonblank(ticker)||e?.status!=='reconciliation_orphaned'||e?.mode!=='LIVE'){
      if(!claimsThis){flat.push(ticker||'unknown');continue;}
      return failure('funded_orphan_identity_unverifiable');
    }
    if(claimsThis&&(!finiteQuantity(e?.count)||Number(e.count)<=0||!nonblank(e?.entryOrderId)))
      return failure('funded_orphan_identity_unverifiable');
    if(inv.present.has(ticker)||resting.has(ticker))active.push(ticker);
    else flat.push(ticker);
  }
  const mine=active.filter(t=>claimed.has(String(t)));
  if(mine.length)return failure('funded_orphans_with_broker_exposure',{
    activeOrphanTickers:[...new Set(mine)].slice(0,20),
    flatOrphanCount:flat.length+(active.length-mine.length)});
  return {ok:true,reason:null,flatOrphanCount:flat.length,
    flatOrphanTickers:[...new Set(flat)].slice(0,20),activeOrphanTickers:[],
    // This is NOT settlement or proof of realized P&L.
    remainingFinancialObligations:flat.length};
}
