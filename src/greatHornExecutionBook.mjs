import {greatHornAskDepth} from './greatHornSeatScheduler.mjs';
/** GH1-ROOT2: one fresh, independently verified executable book is the limit,
 * sizing and fee witness for a recovery seat. A cached stop-time quote is only
 * a wake hint: it must never become a hidden BUY price ceiling.
 *
 * Timestamp separation: requestStartMs is captured before the async market
 * call. Freshness is evaluated against responseCompletionMs after the await.
 * This prevents rejecting a genuinely fresh response merely because it arrived
 * after the request began.
 *
 * This module does NOT grant any financial authority. The frozen watch, parent,
 * mode, capital, and transactional PostgreSQL guards still decide admission.
 */
export async function prepareGreatHornExecutionBook({market,watch,stakeCents,maxAgeMs=1000,now=null}={}){
  const reject=reason=>({ok:false,reason});
  if(!market||typeof market.verifyTickerSnapshot!=='function'
    ||typeof market.executableAskFromBook!=='function')return reject('gh_verified_book_adapter_unavailable');
  if(!watch?.ticker||!watch?.eventTicker||!Number.isFinite(Number(stakeCents))||Number(stakeCents)<=0)
    return reject('gh_execution_scope_or_stake_invalid');
  const requestStartMs = Number.isFinite(now) ? now : Date.now();
  let result;
  try{result=await market.verifyTickerSnapshot(watch.ticker);}catch{return reject('gh_verified_market_book_request_failed');}
  const responseCompletionMs = Date.now();
  // GH1-W2: a newer WS revision may be selected while REST verifies the
  // market. That WS book is owned by MarketHub and receives in-place deltas.
  // Clone the coherent quote/book synchronously after the awaited response;
  // otherwise database awaits between sizing and admission could silently
  // change the original book under a previously computed position count.
  const q=result?.quote?structuredClone(result.quote):null;
  const book=result?.book?structuredClone(result.book):null;
  if(!result?.marketFresh||!result?.bookFresh||!q||!book)
    return reject('gh_verified_market_book_unavailable');
  if(q.ticker!==watch.ticker||String(q.eventTicker||q.ticker)!==String(watch.eventTicker)
    ||(book.ticker!=null&&String(book.ticker)!==String(watch.ticker)))
    return reject('gh_verified_book_identity_mismatch');
  if(String(q.status||'').toLowerCase()!=='active'||Boolean(q.result)||Boolean(q.bookInvalid)
    ||book.sequenceValid===false)return reject('gh_verified_market_not_active');
  const ask=Number(q.yesAsk),bid=Number(q.yesBid),quoteAt=Number(q.quoteAtMs),
    bookAt=Number(book.updatedAtMs||result.bookObservedAtMs),max=Math.min(5000,Math.max(100,Number(maxAgeMs)||1000));
  if(!Number.isSafeInteger(ask)||ask<1||ask>99||!Number.isSafeInteger(bid)||bid<1||bid>ask)
    return reject('gh_verified_book_price_invalid');
  // Primary freshness check AFTER the asynchronous response completes.
  // Use responseCompletionMs as the reference "now" for age and future-date checks.
  const verificationNow = responseCompletionMs;
  if(!Number.isFinite(quoteAt)||!Number.isFinite(bookAt)||quoteAt<=0||bookAt<=0
    ||quoteAt>verificationNow||bookAt>verificationNow||verificationNow-quoteAt>max||verificationNow-bookAt>max
    ||quoteAt<Number(watch.armedAtMs||0))return reject('gh_verified_book_stale_or_pre_loss');
  const topBid=Number(book.yesBids?.[0]?.priceCents),topAsk=100-Number(book.noBids?.[0]?.priceCents);
  if(topBid!==bid||topAsk!==ask)return reject('gh_verified_book_quote_incoherent');
  const requested=Math.floor(Number(stakeCents)/ask);
  if(!Number.isSafeInteger(requested)||requested<1||requested>100000)
    return reject('gh_verified_book_stake_below_current_ask');
  const execution=market.executableAskFromBook(book,requested,ask);
  const count=Math.floor(Math.min(requested,Number(execution?.filled||0))+1e-9);
  if(count<1)return reject('gh_verified_book_no_executable_ask_at_current_price');
  const exact=market.executableAskFromBook(book,count,ask);
  const price=Number(exact?.avgCents);
  if(!exact||Number(exact.filled)+1e-9<count||!Number.isFinite(price)||price<ask||price>99)
    return reject('gh_verified_book_partial_or_price_incoherent');
  // Final integer-depth proof is derived from the SAME immutable-by-ownership
  // snapshot and the SAME ask limit used for executable order sizing.
  const depth=greatHornAskDepth(book,ask);
  if(!depth.ok||depth.count<count)
    return reject(`gh_verified_book_whole_contract_depth:${depth.reason}`);
  return {ok:true,quote:q,plan:{count,averagePriceCents:price,bestAskCents:ask,
    verifiedAvailableAtLimitCount:depth.count,verifiedFractionalLevels:depth.fractionalLevels,
    freshMarket:q,verifiedBookAtMs:bookAt,
    requestStartMs,responseCompletionMs,verificationNow,
    executionEvidence:{quote:q,book,limitPriceCents:ask,
      consumedLevels:exact.consumedLevels||null}},reason:'gh_verified_book_current_executable_price'};
}
