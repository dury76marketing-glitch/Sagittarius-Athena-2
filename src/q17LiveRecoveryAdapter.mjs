/**
 * Q-17 integrated recovery LIVE adapter — research candidate, not LIVE certified.
 * This module contains NO strategy admission rule. The existing PostgreSQL
 * parent/watch/seat/authority proof is required for every recovery BUY.
 *
 * The Q-17 SIM-only release gate remains compiled shut: dispatch entrypoints
 * refuse before touching a broker. An isolated injected simulator exercises
 * this same dispatch decision and durable no-retry mechanism without real API I/O.
 *
 * Once an owner-authorized successor is separately certified, the runtime
 * functions remain required to use the original client ID, atomic durable
 * dispatch claim, and broker-authoritative ProfitGuard.reconcilePending.
 */
import {Q17_SIM_ONLY} from './q17Profile.mjs';
import {liveRecoveryCollateralRequirement} from './executionEconomics.mjs';
import {liveEntryDispatchBookConfirmation} from './liveEntryDispatchBook.mjs';

export const Q17_RECOVERY_LIVE_ADAPTER='Q17-LIVE-RECOVERY-RESEARCH-V1';
const DESCRIPTORS=Object.freeze({
  gh:Object.freeze({name:'Great Horn Recovery',key:'greatHornRecovery',enabled:'greatHornEnabled',
    verify:'verifyGreatHornLiveIntent',reject:'rejectGreatHornUnsubmittedIntent'}),
  cw:Object.freeze({name:'Crystal Wall Recovery',key:'crystalWallRecovery',enabled:'crystalWallRecoveryEnabled',
    verify:'verifyCrystalWallLiveIntent',reject:'rejectCrystalWallUnsubmittedIntent'}),
  sa:Object.freeze({name:'Sagittarius Arrow Recovery',key:'sagittariusArrowRecovery',enabled:'sagittariusArrowEnabled',
    verify:'verifySagittariusArrowLiveIntent',reject:'rejectSagittariusArrowUnsubmittedIntent'}),
  sn:Object.freeze({name:'Scarlet Needle Recovery',key:'scarletNeedleCapitalRecovery',enabled:'scarletNeedleCapitalEnabled',
    verify:'verifyScarletNeedleCapitalLiveIntent',reject:'rejectScarletNeedleCapitalUnsubmittedIntent'}),
  pr:Object.freeze({name:'Pegasus Ryu Sei Ken Recovery',key:'pegasusRyuSeiKenCapitalRecovery',enabled:'pegasusRyuSeiKenCapitalEnabled',
    verify:'verifyPegasusRyuSeiKenCapitalLiveIntent',reject:'rejectPegasusRyuSeiKenCapitalUnsubmittedIntent'}),
});

const denied=(reason)=>({ok:false,pending:false,reason,adapterVersion:Q17_RECOVERY_LIVE_ADAPTER});
const pending=(reason,orderId=null)=>({ok:false,pending:true,reason,
  orderId:typeof orderId==='string'&&orderId.trim()?orderId:null,adapterVersion:Q17_RECOVERY_LIVE_ADAPTER});

const exactRuntime=(entry,scope,descriptor,readSettings,readSafetyRevision,isLiveReady)=>{
  const current=readSettings?.();
  if(!current||current.mode!=='LIVE'||current.liveArmed!==true||current.engineActive!==true
     ||current[descriptor.enabled]!==true||isLiveReady?.()!==true)
    return denied('live_recovery_runtime_not_ready');
  if(!entry||entry.mode!=='LIVE'||entry.status!=='entry_pending'
     ||entry.executionClass!=='CAPITAL'||entry.conceptName!==descriptor.name
     ||!entry.id||!entry.entryClientOrderId||entry.entryOrderId
     ||!entry.ticker||!entry.eventTicker||!entry.ownerId||!entry.systemName
     ||!entry.entryConfig?.[descriptor.key]?.watchId)
    return denied('live_recovery_intent_identity_invalid');
  if(current.ownerId!==entry.ownerId||current.systemName!==entry.systemName
     ||Number(current.resetTimestampMs||0)!==Number(entry.entryConfig.resetTimestampMs||0)
     ||Number(readSafetyRevision?.())!==scope.revision)
    return denied('live_recovery_operator_scope_changed');
  return {ok:true};
};

/**
 * Internal integrated dispatch path: executable only via an approved runtime
 * entrypoint, or an injected synthetic test context. Never claim a fill.
 */
async function executeRecovery(kind,context){
  const descriptor=DESCRIPTORS[kind];
  if(!descriptor)return denied('live_recovery_kind_invalid');
  const {entry,db,kalshi,market,isLiveReady,readSettings,readSafetyRevision}=context||{};
  const revision=Number(readSafetyRevision?.());
  const scope={revision};
  if(!Number.isSafeInteger(revision)||revision<0)return denied('live_recovery_revision_missing');
  const current=()=>exactRuntime(entry,scope,descriptor,readSettings,readSafetyRevision,isLiveReady);
  const first=current();if(!first.ok)return first;
  if(typeof db?.[descriptor.verify]!=='function'||typeof db?.claimQ17RecoveryLiveDispatch!=='function'
    ||typeof db?.updateEntry!=='function'||typeof db?.[descriptor.reject]!=='function'
    ||typeof kalshi?.placeOrder!=='function'||typeof kalshi?.ensureExchangeBalance!=='function'
    ||typeof market?.refreshTickerVerified!=='function')return denied('live_recovery_native_interfaces_missing');
  const collateral=liveRecoveryCollateralRequirement(entry);
  if(!collateral.ok)return denied(collateral.reason);
  const routing=entry.entryConfig?.brokerRouting;
  if(!Number.isSafeInteger(Number(routing?.exchangeIndex))||Number(routing.exchangeIndex)<0)
    return denied('live_recovery_exchange_route_missing');
  const initialProof=await db[descriptor.verify](entry).catch(()=>null);
  if(initialProof?.ok!==true)return denied(initialProof?.reason||'live_recovery_durable_proof_unavailable');
  let claimedEntry=null,bookProof=null,executionProof=null;
  const beforeDispatch=async()=>{
    const still=current();if(!still.ok)return still;
    // A queued broker request must reconfirm the exact durable parent, watch,
    // candidate and financial scope immediately before any possible send.
    const proof=await db[descriptor.verify](entry).catch(()=>null);
    if(proof?.ok!==true)return denied(proof?.reason||'live_recovery_durable_proof_changed');
    const funding=await kalshi.ensureExchangeBalance({ticker:entry.ticker,
      exchangeIndex:Number(routing.exchangeIndex),requiredCents:collateral.requiredCents}).catch(()=>null);
    if(funding?.ok!==true)return denied(funding?.reason||'live_recovery_funding_unavailable');
    if(Number(funding.exchangeIndex)!==Number(routing.exchangeIndex))
      return denied('live_recovery_exchange_route_changed');
    const snapshot=await market.refreshTickerVerified(entry.ticker).catch(()=>null);
    if(snapshot?.marketFresh!==true||snapshot?.bookFresh!==true||!snapshot.quote||!snapshot.book)
      return denied('live_recovery_fresh_market_book_unavailable');
    const execution={count:entry.count,freshMarket:snapshot.quote,
      verifiedBookAtMs:Number(snapshot.bookObservedAtMs||snapshot.book?.updatedAtMs),
      executionEvidence:{book:snapshot.book}};
    executionProof=execution;
    bookProof=liveEntryDispatchBookConfirmation({execution,market,ticker:entry.ticker,
      eventTicker:entry.eventTicker,count:entry.count,limitCents:entry.entryPriceCents,
      maximumBookAgeMs:Math.min(5000,Number(readSettings()?.infinityBreakMaximumBookAgeMs??5000))});
    if(!bookProof.ok)return denied(bookProof.reason);
    const reverified=await db[descriptor.verify](entry).catch(()=>null);
    if(reverified?.ok!==true)return denied(reverified?.reason||'live_recovery_durable_proof_changed');
    const last=current();if(!last.ok)return last;
    // The one-way atomic write excludes a second dispatch attempt, including
    // after an ambiguous HTTP response or process crash before broker receipt.
    const claim=await db.claimQ17RecoveryLiveDispatch(entry,{
      adapterVersion:Q17_RECOVERY_LIVE_ADAPTER,safetyRevision:scope.revision}).catch(()=>null);
    if(claim?.ok!==true||!claim.entry)return denied(claim?.reason||'live_recovery_dispatch_claim_failed');
    claimedEntry=claim.entry;
    return {ok:true};
  };
  const confirmDispatch=()=>{
    // Synchronous final fence: the network request must not be sent if the
    // operator, clone scope or immediate book/market evidence changed.
    const final=current();
    if(!final.ok)return final;
    if(!claimedEntry||!bookProof?.ok||!executionProof)return denied('live_recovery_dispatch_not_claimed');
    // A book can deteriorate after the durable claim while a broker mutation
    // waits in its rate-limited queue. Revalidate synchronously at send time.
    const finalBook=liveEntryDispatchBookConfirmation({execution:executionProof,market,
      ticker:entry.ticker,eventTicker:entry.eventTicker,count:entry.count,
      limitCents:entry.entryPriceCents,
      maximumBookAgeMs:Math.min(5000,Number(readSettings()?.infinityBreakMaximumBookAgeMs??5000))});
    if(!finalBook.ok)return denied(finalBook.reason);
    return {ok:true};
  };
  let receipt;
  try{
    receipt=await kalshi.placeOrder({ticker:entry.ticker,action:'buy',count:entry.count,
      priceCents:entry.entryPriceCents,clientOrderId:entry.entryClientOrderId,
      exchangeIndex:Number(routing.exchangeIndex),timeInForce:'immediate_or_cancel'},
      {beforeDispatch,confirmDispatch});
  }catch{
    // An exception after the transport was invoked is AMBIGUOUS unless
    // beforeDispatch was never able to claim the durable row.
    return claimedEntry?pending('live_recovery_broker_transport_uncertain'):
      denied('live_recovery_broker_dispatch_unavailable');
  }
  if(!claimedEntry){
    // Local validation/pre-dispatch failed. Nothing was durably marked sent.
    return receipt?.notSubmitted===true
      ?denied(receipt.localRejectionReason||'live_recovery_pre_dispatch_denied')
      :pending('live_recovery_transport_result_without_claim',receipt?.orderId);
  }
  if(receipt?.notSubmitted===true){
    // This is strictly an untransmitted local refusal; a HTTP response or
    // missing broker history NEVER qualifies as no-send proof.
    try{
      const released=await db[descriptor.reject](claimedEntry,
        {reason:'q17_local_proven_no_send',brokerRejected:false});
      if(released?.ok===true)return denied('live_recovery_local_no_send_rejected');
    }catch{}
    return pending('live_recovery_no_send_persistence_unresolved');
  }
  const orderId=typeof receipt?.orderId==='string'&&receipt.orderId.trim()?receipt.orderId:null;
  try{
    // Never invent a fill or mark an order as terminal. Existing ProfitGuard
    // reconciliation is the sole authoritative fill/fee/position promotion.
    await db.updateEntry(claimedEntry.id,{status:'entry_pending',
      ...(orderId?{entryOrderId:orderId}:{}),updatedAtMs:Date.now()},null,claimedEntry);
  }catch{
    return pending('live_recovery_receipt_persistence_uncertain',orderId);
  }
  return pending(orderId?'live_recovery_order_receipt_awaiting_authoritative_readback':
    'live_recovery_order_outcome_ambiguous',orderId);
}

// Runtime entrypoints are connected to the engine, but compilation remains
// SIM-only until a separately certified, explicitly owner-authorized release.
function runtimeDispatch(kind,context){
  if(Q17_SIM_ONLY)return Promise.resolve(denied('q17_live_release_gate_closed'));
  return executeRecovery(kind,context);
}
export const dispatchGreatHornLiveIntent=context=>runtimeDispatch('gh',context);
export const dispatchCrystalWallLiveIntent=context=>runtimeDispatch('cw',context);
export const dispatchSagittariusArrowLiveIntent=context=>runtimeDispatch('sa',context);
export const dispatchScarletNeedleCapitalLiveIntent=context=>runtimeDispatch('sn',context);
export const dispatchPegasusRyuSeiKenCapitalLiveIntent=context=>runtimeDispatch('pr',context);

/**
 * Synthetic-only fixture entrypoint. Reuses the exact dispatch algorithm but
 * is not called by any runtime module; Q17 KalshiClient itself remains no-send.
 * Test results cannot be promoted to native DB or broker certification.
 */
export async function simulateQ17RecoveryLiveDispatch(kind,context={}){
  if(!Q17_SIM_ONLY)throw new Error('q17_synthetic_replay_must_not_run_in_live_build');
  return executeRecovery(kind,context);
}
