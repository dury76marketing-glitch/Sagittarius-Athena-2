import {executionPriceCents} from './executionEconomics.mjs';
import {greatHornAskDepth} from './greatHornSeatScheduler.mjs';

/** Last synchronous executable-depth check for an already-authorized LIVE BUY.
 * A newer top-price quote cannot renew an older book's age or quantity. The
 * caller retains its frozen size/limit and refreshes the executable snapshot
 * after awaited balance/intent work; this function never changes an order or
 * grants parent, account, strategy, or operator authority.
 */
export function liveEntryDispatchBookConfirmation({execution,market=null,ticker,eventTicker,
  count,limitCents,maximumBookAgeMs=5000,now=Date.now()}={}) {
  const deny=reason=>({ok:false,reason});
  const quantity=Number(count),limit=executionPriceCents(limitCents),configuredAge=Number(maximumBookAgeMs);
  if(!ticker||!eventTicker||!Number.isSafeInteger(quantity)||quantity<1
    ||limit==null
    ||!Number.isFinite(configuredAge)||configuredAge<100)
    return deny('live_entry_dispatch_book_scope_invalid');
  if(!execution||Number(execution.count)!==quantity)
    return deny('live_entry_dispatch_book_not_verified');
  let quote=execution.freshMarket,book=execution.executionEvidence?.book;
  let attestedAt=Number(execution.verifiedBookAtMs);
  const initialBookAt=Number(book?.updatedAtMs);
  if(!book||!quote||!Number.isFinite(attestedAt)||attestedAt<=0
    ||!Number.isFinite(initialBookAt)||initialBookAt<=0)
    return deny('live_entry_dispatch_book_not_verified');

  // A sequence-valid newer canonical book is independent current evidence.
  // Inspect it synchronously, including SAME-millisecond quantity changes.
  // Never fall back to older sufficient depth after seeing newer depletion.
  if(typeof market?.getBook==='function'&&typeof market?.getQuote==='function'){
    let currentBook,currentQuote;
    try{currentBook=market.getBook(ticker);currentQuote=market.getQuote(ticker);}
    catch{return deny('live_entry_dispatch_book_snapshot_unavailable');}
    if(currentBook&&Number(currentBook.updatedAtMs)>=initialBookAt){
      book=currentBook;quote=currentQuote;attestedAt=Number(currentBook.updatedAtMs);
    }
  }
  const maximumAge=Math.min(5000,configuredAge),bookAt=Number(book?.updatedAtMs),quoteAt=Number(quote?.quoteAtMs);
  if([bookAt,attestedAt,quoteAt].some(at=>!Number.isFinite(at)||at<=0||at>now||now-at>maximumAge))
    return deny('live_entry_dispatch_book_stale');
  const bid=Number(quote?.yesBid),ask=Number(quote?.yesAsk);
  if(quote?.ticker!==ticker||String(quote?.eventTicker||quote?.ticker)!==String(eventTicker)
    ||(book?.ticker!=null&&String(book.ticker)!==String(ticker))
    ||quote?.status!=='active'||quote?.bookInvalid||quote?.result||book?.sequenceValid===false
    ||!(bid>0&&bid<=ask&&ask<=limit&&ask<100)
    ||Number(book?.yesBids?.[0]?.priceCents)!==bid
    ||executionPriceCents(100-Number(book?.noBids?.[0]?.priceCents))!==ask)
    return deny('live_entry_dispatch_book_changed_or_invalid');
  const depth=greatHornAskDepth(book,limit);
  if(!depth.ok||depth.count<quantity)
    return deny('live_entry_dispatch_depth_insufficient');
  return {ok:true,reason:'live_entry_dispatch_book_confirmed',bookAtMs:bookAt,
    availableAtLimitCount:depth.count,requestedCount:quantity,limitCents:limit};
}
