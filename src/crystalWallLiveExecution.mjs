/** CW1 protected LIVE transport. Never creates a BUY permission from a signal.
 * Only the exact DB-committed position/seat client ID may be transmitted.
 * An uncertain broker result is NEVER retried here; ProfitGuard reconciles it.
 */
import {classifyLiveOrderResult} from './kalshi.mjs';
import {greatHornAskDepth as crystalWallRecoveryAskDepth} from './greatHornSeatScheduler.mjs';
import {crystalWallRecoverySettingsFingerprint} from './crystalWallSimCapital.mjs';
import {crystalWallRecoveryOperatorBandAllowed,crystalWallRecoverySpreadAllowed} from './crystalWallRecovery.mjs';

export const CW_LIVE_EXECUTION_VERSION='CW1-LIVE-DURABLE-BROKER-V1';
const fail=reason=>({ok:false,reason});

export function crystalWallRecoveryLiveDispatchConfirmation({entry,settings,quote,liveReady,now=Date.now()}={}){
  const recovery=entry?.entryConfig?.crystalWallRecovery;
  if(entry?.conceptName!=='Crystal Wall Recovery'||entry?.mode!=='LIVE'||entry.status!=='entry_pending'
    ||!entry.entryClientOrderId||recovery?.authorization!=='DURABLE_PENDING_AND_DISPATCH_PROOF_REQUIRED')
    return fail('cw_live_durable_pending_intent_required');
  if(settings?.mode!=='LIVE'||settings.liveArmed!==true||settings.engineActive!==true
    ||settings.crystalWallRecoveryEnabled!==true||liveReady!==true||settings.systemName!==entry.systemName
    ||settings.ownerId!==entry.ownerId||Number(settings.resetTimestampMs||0)!==Number(entry.entryConfig.resetTimestampMs||0))
    return fail('cw_live_authorization_revoked');
  const at=Number(quote?.quoteAtMs),ask=Number(quote?.yesAsk),bid=Number(quote?.yesBid);
  const maxAge=Math.min(5000,Number(settings.infinityBreakMaximumBookAgeMs??5000));
  if(quote?.ticker!==entry.ticker||String(quote?.eventTicker||quote?.ticker)!==String(entry.eventTicker)
    ||quote?.status!=='active'||quote?.bookInvalid||quote?.result||!(ask>0&&ask<100&&bid>0&&bid<=ask)
    ||!Number.isFinite(at)||at>now||now-at>maxAge||at<Number(recovery.quoteAtMs)
    ||ask!==Number(recovery.quoteAskCents)
    ||!crystalWallRecoveryOperatorBandAllowed({link:recovery?.capturedSettings?.link===true},ask,settings)
    ||recovery?.capturedSettings?.link!==settings.crystalWallRecoveryLinkEnabled
    ||!crystalWallRecoverySpreadAllowed(quote,settings))
    return fail('cw_live_quote_changed_or_stale');
  if(entry.entryConfig?.crystalWallRecoverySettingsFingerprint!==crystalWallRecoverySettingsFingerprint(settings))
    return fail('cw_live_card_changed_after_intent');
  if(Number(entry.count)*Number(entry.entryPriceCents)>Number(settings.crystalWallRecoveryStakeCents)
    ||Number(entry.entryPriceCents)<ask||entry.entryConfig?.aurora?.frozen!==true)
    return fail('cw_live_economics_changed');
  return {ok:true,reason:'cw_live_synchronous_dispatch_confirmed'};
}

/** Dispatch once only. Caller must persist an atomic LIVE pending intent first.
 * All network and DB dependencies injected; tests can intercept transport.
 */
export async function dispatchCrystalWallLiveIntent({entry,settings,db,kalshi,market,strategy,
  isLiveReady,readSettings,readSafetyRevision=()=>0,onOpen=()=>{},audit=async()=>{}}={}){
  if(typeof db?.verifyCrystalWallLiveIntent!=='function'||typeof kalshi?.placeOrder!=='function'
    ||typeof market?.getQuote!=='function'||typeof strategy?.prepareEntryExecution!=='function')
    return fail('cw_live_protected_infrastructure_unavailable');
  const ready=()=>{
    if(Number(entry.entryConfig?.crystalWallRecoveryOperatorRevision??0)!==Number(readSafetyRevision()))
      return fail('cw_live_stop_or_safety_epoch_changed');
    return crystalWallRecoveryLiveDispatchConfirmation({entry,settings:readSettings?.(),
      quote:market.getQuote(entry.ticker),liveReady:isLiveReady?.()===true});
  };
  const preflightDenied=async (decision,{brokerRejected=false}={})=>{
    // A delayed local denial does not own an intent that reconciliation changed.
    // Never report a released seat unless the locked database release succeeds.
    if(decision.reconcileOnly!==true){
      try{
        const released=await db.rejectCrystalWallUnsubmittedIntent(entry,{reason:decision.reason,brokerRejected});
        if(released?.ok===true)return {...decision,...(brokerRejected?{rejected:true}:{notSubmitted:true})};
      }catch(error){
        await Promise.resolve(audit('cw_live_intent_release_not_proven',{
          id:entry.id,reason:String(error?.message||error).slice(0,180)})).catch(()=>{});
      }
    }
    return {ok:false,pending:true,reconcileOnly:true,reason:'cw_live_original_intent_reconciliation_required'};
  };
  const prior=ready();if(!prior.ok)return preflightDenied(prior);
  // Only a pretransmission denial may release a pending claim. If the caller
  // never received transport proof, that original client order ID stays owned.
  const initial=await db.verifyCrystalWallLiveIntent(entry);
  if(!initial.ok)return preflightDenied(initial);
  let result;
  try{
    result=await kalshi.placeOrder({ticker:entry.ticker,action:'buy',count:entry.count,
      priceCents:Number(entry.entryConfig.crystalWallRecovery.quoteAskCents),
      clientOrderId:entry.entryClientOrderId,
      timeInForce:'immediate_or_cancel',exchangeIndex:entry.entryConfig?.brokerRouting?.exchangeIndex??null},{
      beforeDispatch:async()=>{
        const base=ready();if(!base.ok)return base;
        const durable=await db.verifyCrystalWallLiveIntent(entry);if(!durable.ok)return durable;
        // HC2-R1: a delayed request must fetch a NEW independently executable
        // book, not reuse the admission-time price/depth snapshot.
        const quote=market.getQuote(entry.ticker);
        const execution=await strategy.prepareEntryExecution(quote,entry.count);
        const fresh=execution?.freshMarket;
        const book=execution?.executionEvidence?.book;
        const evidence=crystalWallRecoveryAskDepth(book,
          Number(entry.entryConfig.crystalWallRecovery.quoteAskCents));
        // GH-SPREAD-FW3: the websocket quote used to start this REST refresh
        // is NOT proof of the spread on the returned executable order book.
        // Verify the fresh REST bid and ask against that same book before any
        // broker transmission. Otherwise a newer bid collapse could silently
        // exceed Great Horn's own limit while the cached ask stayed unchanged.
        const verifiedQuote=execution?.freshMarket;
        const restBid=Number(book?.yesBids?.[0]?.priceCents);
        const restAsk=100-Number(book?.noBids?.[0]?.priceCents);
        const restSpreadProof=crystalWallRecoveryLiveDispatchConfirmation({entry,
          settings:readSettings?.(),quote:verifiedQuote,
          liveReady:isLiveReady?.()===true});
        if(!fresh||execution?.count!==entry.count||!evidence.ok
          ||evidence.count<entry.count||Number(execution.bestAskCents)!==Number(quote.yesAsk)
          ||Number(execution.verifiedBookAtMs)<Date.now()-5000
          ||!restSpreadProof.ok||!Number.isSafeInteger(restBid)||!Number.isSafeInteger(restAsk)
          ||restBid!==Number(verifiedQuote?.yesBid)||restAsk!==Number(verifiedQuote?.yesAsk))
          return fail('cw_live_queued_book_or_liquidity_changed');
        if(typeof kalshi.ensureExchangeBalance!=='function')return fail('cw_live_broker_balance_gate_missing');
        const cost=entry.count*Number(entry.entryPriceCents)
          +Number(entry.entryConfig?.auroraPending?.preflight?.entryFeeCents||0);
        const balance=await kalshi.ensureExchangeBalance({ticker:entry.ticker,
          exchangeIndex:entry.entryConfig?.brokerRouting?.exchangeIndex??null,requiredCents:cost});
        if(!balance?.ok)return fail(balance?.reason||'cw_live_broker_balance_not_ready');
        return ready();
      },
      confirmDispatch:ready,
    });
  }catch(error){
    await audit('cw_live_transport_uncertain',{id:entry.id,reason:String(error?.message||error)});
    return {ok:false,reason:'cw_live_transport_exception_uncertain',pending:true};
  }
  if(result?.notSubmitted===true){
    // The broker transport proved no network send occurred.
    return preflightDenied({ok:false,reason:result.localRejectionReason||'cw_live_not_transmitted'});
  }
  if(result?.orderId){
    try{
      await db.updateEntry(entry.id,{entryOrderId:result.orderId,updatedAtMs:Date.now()},null,entry);
    }catch(error){
      if(String(error?.message||'')!=='sag_entry_receipt_concurrent_change')throw error;
      await audit('cw_live_entry_receipt_concurrent_change',{id:entry.id,
        clientOrderId:entry.entryClientOrderId,reportedOrderId:result.orderId});
      return {ok:false,pending:true,reconcileOnly:true,reason:'cw_live_original_intent_reconciliation_required',entryId:entry.id};
    }
  }
  const classification=classifyLiveOrderResult(result);
  // A definitive broker hard reject may be rejected; 429, timeouts and any
  // insufficient receipt remain pending for original-client-ID reconciliation.
  if(classification.kind==='rejected'&&Number(result?.httpStatus)>=400
    &&Number(result.httpStatus)<429&&result?.ambiguous!==true){
    return preflightDenied({ok:false,reason:classification.reason},{brokerRejected:true});
  }
  // Never promote a planned order into owned inventory from a POST response;
  // ProfitGuard obtains authoritative broker truth and frozen fill economics.
  await audit('cw_live_broker_receipt_pending_reconciliation',{
    id:entry.id,clientOrderId:entry.entryClientOrderId,orderId:result?.orderId||null,
    fillReported:result?.fillCount||0,kind:classification.kind});
  return {ok:true,pending:true,reason:'cw_live_original_intent_reconciliation_required',entryId:entry.id};
}
