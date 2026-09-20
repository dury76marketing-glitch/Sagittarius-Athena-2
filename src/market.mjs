import WebSocket from 'ws';
import { setTimeout as sleep } from 'node:timers/promises';
import { isMatchDecisionMarket, MAX_HISTORY } from './doctrine.mjs';
import { parseMarket, signKalshi } from './kalshi.mjs';

export const MARKET_TRUTH_REVISION = 'R67-MHF5-VERIFIED-SNAPSHOT-ISOLATION-2026-09-06';
export const MARKET_RUNTIME_MAINTENANCE = Object.freeze({
  version:'MRM1',
  cadenceMs:5_000,
  invalidBookRefreshCadenceMs:60_000,
  invalidBookRefreshMaximum:8,
  staleRecoveryMultiplier:3,
  role:'non_authority_cache_recovery_cleanup_and_bounded_invalid_book_refresh',
});

const DERIVATIVE = [
  'SPREAD','TOTAL','HRDERBY','3PT','DERBY','EXACT','GAMETO','ANYSET',
  '-1H','-2H','-1Q','-2Q','-3Q','-4Q','-1P','-2P','-3P','HTOTAL','QTOTAL',
];
const SNAPSHOT_BATCH_SIZE = 250;
const RECOVERY_DELTA_BUFFER_LIMIT = 2048;
const RECOVERY_SNAPSHOT_TIMEOUT_MS = 5_000;
const RECOVERY_SNAPSHOT_MAX_ATTEMPTS = 3;
const cents = (v) => Math.round(Number(v || 0) * 100);
const validQuote = (q) => q && q.yesBid >= 0 && q.yesAsk > 0 && q.yesAsk <= 100 && q.yesBid <= q.yesAsk;
const finalStatus = (q) => ['finalized', 'settled'].includes(String(q?.status || '').toLowerCase()) && Boolean(q?.result);
const finiteInt = (v) => Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : null;
const sidOf = (data, msg) => finiteInt(data?.sid ?? msg?.sid);
const seqOf = (data, msg) => finiteInt(data?.seq ?? msg?.seq);

function parseLevels(arr = []) {
  return arr
    .map((x) => ({ priceCents: cents(x[0]), count: Number(x[1]) }))
    .filter((x) => x.priceCents > 0 && x.priceCents < 100 && x.count > 0)
    .sort((a, b) => b.priceCents - a.priceCents);
}

function yesAsksFromNoBids(noBids = []) {
  return noBids
    .map((x) => ({ priceCents: 100 - x.priceCents, count: x.count }))
    .filter((x) => x.priceCents > 0 && x.priceCents < 100 && x.count > 0)
    .sort((a, b) => a.priceCents - b.priceCents);
}

function walkLevels(levels, count, predicate) {
  let need = Math.max(0, Number(count) || 0);
  let filled = 0;
  let notional = 0;
  let lowestConsumedCents = null;
  let highestConsumedCents = null;
  let levelsConsumed = 0;
  const consumedLevels = [];
  for (const x of levels || []) {
    if (!predicate(x)) continue;
    const take = Math.min(need, Number(x.count) || 0);
    if (take <= 0) continue;
    const priceCents = Number(x.priceCents);
    filled += take;
    notional += take * priceCents;
    lowestConsumedCents = lowestConsumedCents == null ? priceCents : Math.min(lowestConsumedCents, priceCents);
    highestConsumedCents = highestConsumedCents == null ? priceCents : Math.max(highestConsumedCents, priceCents);
    levelsConsumed += 1;
    consumedLevels.push({priceCents,count:take});
    need -= take;
    if (need <= 1e-9) break;
  }
  return {
    full: need <= 1e-9,
    filled,
    avgCents: filled > 0 ? notional / filled : null,
    notionalCents: filled > 0 ? notional : 0,
    lowestConsumedCents,
    highestConsumedCents,
    levelsConsumed,
    consumedLevels,
  };
}

export class MarketHub {
  constructor({ kalshi, wsUrl, fallbackWsUrl, getCredentials, onStatus = () => {}, onQuote = () => {}, onPrivate = () => {} }) {
    this.kalshi = kalshi;
    this.wsUrl = wsUrl;
    this.fallbackWsUrl = fallbackWsUrl;
    this.getCredentials = getCredentials;
    this.onStatus = onStatus;
    this.onQuote = onQuote;
    this.onPrivate = onPrivate;
    this.quotes = new Map();
    this.books = new Map();
    this.histories = new Map();
    this.wanted = new Set();
    this.ws = null;
    this.connected = false;
    this.stopped = true;
    this.lastMessageMs = 0;
    this.reconnectToken = 0;
    this.connectLoopRunning = false;
    this.resyncing = new Set();

    // R63 maintenance HF1: Kalshi orderbook sequence is subscription-scoped,
    // never ticker-scoped. Each SID retains one global cursor plus the tickers
    // currently proven to belong to that stream. Recovery state is bounded by
    // the wanted/safety ticker set and requires no timer, worker or DB surface.
    this.orderbookStreams = new Map();
    this.recoverySnapshotCommands = new Map();
    this.recoveryReconnectPending = false;
    this.wsCommandId = 1;
    this.runtimeMaintenance = {
      version:MARKET_RUNTIME_MAINTENANCE.version,lastRunAtMs:0,lastInvalidRefreshAtMs:0,runs:0,
      prunedQuotes:0,prunedBooks:0,prunedHistories:0,trimmedHistories:0,
      staleCommandsReleased:0,orphanDeltaBuffersReleased:0,invalidBooksRefreshed:0,lastResult:null,
    };
    this.bookIntegrityStats = {
      sequenceGaps:0,
      ignoredOldSequences:0,
      missingSequence:0,
      sidMismatch:0,
      recoveryRequests:0,
      recoveryBatches:0,
      recoveryBufferedDeltaEvents:0,
      recoveryReplayedDeltas:0,
      recoveryDeltaDrops:0,
      recoverySnapshotErrors:0,
      recoverySnapshotTimeouts:0,
      recoveryReconnects:0,
      disconnectInvalidations:0,
    };
  }

  hydrateHistories(trackers = []) {
    for (const t of trackers) {
      let h = [];
      try { h = Array.isArray(t.price_history) ? t.price_history : JSON.parse(t.price_history || '[]'); } catch {}
      this.histories.set(t.ticker, h.slice(-MAX_HISTORY));
    }
  }

  getQuote(ticker) { return this.quotes.get(ticker); }
  getBook(ticker) { return this.books.get(ticker); }
  getHistory(ticker) { return this.histories.get(ticker) || []; }
  allQuotes() { return [...this.quotes.values()]; }
  quoteAgeMs(ticker, now = Date.now()) {
    const q = this.quotes.get(ticker);
    const observed = Number(q?.quoteAtMs || q?.updatedAtMs || 0);
    return observed > 0 ? Math.max(0, now - observed) : Infinity;
  }
  bookAgeMs(ticker, now = Date.now()) {
    const b = this.books.get(ticker);
    return b?.updatedAtMs ? Math.max(0, now - Number(b.updatedAtMs)) : Infinity;
  }

  sample(ticker, now = Date.now()) {
    const q = this.quotes.get(ticker);
    if (!validQuote(q)) return this.getHistory(ticker);
    const h = this.histories.get(ticker) || [];
    h.push({ t: now, bid: q.yesBid, ask: q.yesAsk, vol: q.volume24h || 0, spread: q.yesAsk - q.yesBid });
    if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
    this.histories.set(ticker, h);
    return h;
  }

  seed(q) {
    if (!q?.ticker) return;
    const old = this.quotes.get(q.ticker);
    const merged = old && old.updatedAtMs > q.updatedAtMs
      ? { ...q, ...old, result: q.result || old.result, status: q.status || old.status, recentTrades: Math.max(old.recentTrades || 0, q.recentTrades || 0) }
      : { ...(old || {}), ...q, recentTrades: Math.max(old?.recentTrades || 0, q.recentTrades || 0) };
    const quoteAtMs = Number(merged.quoteAtMs || merged.updatedAtMs || 0);
    const normalized = { ...merged, quoteAtMs, updatedAtMs:quoteAtMs || merged.updatedAtMs };
    if (validQuote(normalized) || finalStatus(normalized)) this.quotes.set(q.ticker, { ...normalized, bookInvalid: finalStatus(normalized) ? false : Boolean(normalized.bookInvalid) });
    else this.quotes.set(q.ticker, { ...normalized, bookInvalid: true });
  }

  async discover(priorityTickers = []) {
    const tradeData = await this.kalshi.getRecentTrades(5, 5);
    const [open, tradeMarkets] = await Promise.all([
      this.kalshi.getOpenMarkets(6, 3000).catch(() => []),
      this.kalshi.getLiveSportsViaTrades(tradeData).catch(() => []),
    ]);
    const merged = new Map();
    for (const q of [...open, ...tradeMarkets]) if (!merged.has(q.ticker)) merged.set(q.ticker, q);
    const now = Date.now();
    const markets = [];
    for (const q0 of merged.values()) {
      const q = { ...q0 };
      const t = q.ticker.toUpperCase();
      if (t.startsWith('KXMV') || DERIVATIVE.some((x) => t.includes(x))) continue;
      if (!t.includes('MATCH') && !t.includes('GAME')) continue;
      if (!isMatchDecisionMarket(q) || !q.canCloseEarly || q.closeTimeMs <= now || !validQuote(q)) continue;
      const td = tradeData.get(q.ticker);
      q.recentTrades = td?.count || q.recentTrades || 0;
      q.recentTradesObservedAtMs = Number(td?.observedAtMs || 0);
      if (td?.lastPriceCents) q.lastPrice = td.lastPriceCents;
      const started = q.occurrenceTimeMs > 0 && q.occurrenceTimeMs < now;
      const moved = (q.prevYesBid > 0 && Math.abs(q.yesBid - q.prevYesBid) >= 2)
        || (q.prevYesAsk > 0 && Math.abs(q.yesAsk - q.prevYesAsk) >= 2);
      if (!q.recentTrades && !started && !moved) continue;
      markets.push(q);
      this.seed(q);
    }
    for (const ticker of priorityTickers) {
      if (this.quotes.has(ticker)) continue;
      const q = await this.kalshi.getMarket(ticker).catch(() => null);
      if (q) this.seed(q);
    }
    this.setWanted([...new Set([...markets.map((x) => x.ticker), ...priorityTickers])]);
    return markets;
  }

  pruneUnusedCaches(wanted = this.wanted) {
    const keep = wanted instanceof Set ? wanted : new Set(Array.from(wanted || []).filter(Boolean));
    const removed = { quotes:0, books:0, histories:0 };
    for (const [name, cache] of [['quotes',this.quotes],['books',this.books],['histories',this.histories]]) {
      for (const ticker of [...cache.keys()]) {
        if (keep.has(ticker)) continue;
        cache.delete(ticker);
        removed[name] += 1;
      }
    }
    // Keep sequence/recovery metadata under the same RGM5 cache authority.
    for (const [sid,state] of this.orderbookStreams) {
      for (const ticker of [...state.tickers]) if (!keep.has(ticker)) state.tickers.delete(ticker);
      for (const ticker of [...state.pendingSnapshots]) if (!keep.has(ticker)) state.pendingSnapshots.delete(ticker);
      for (const ticker of [...state.pendingDeltas?.keys?.() || []]) if (!keep.has(ticker)) state.pendingDeltas.delete(ticker);
      for (const ticker of [...state.recoveryOverflow || []]) if (!keep.has(ticker)) state.recoveryOverflow.delete(ticker);
      for (const ticker of [...state.snapshotInFlight?.keys?.() || []]) if (!keep.has(ticker)) this.releaseRecoverySnapshotTicker(state,ticker,{resetAttempts:true});
      for (const ticker of [...state.snapshotAttempts?.keys?.() || []]) if (!keep.has(ticker)) state.snapshotAttempts.delete(ticker);
      if (!state.tickers.size && !state.pendingSnapshots.size) this.orderbookStreams.delete(sid);
    }
    return removed;
  }

  maintenance({now=Date.now(),pressureState='GREEN'}={}) {
    const at=Math.max(1,Number(now)||Date.now());
    const removed=this.pruneUnusedCaches(this.wanted);
    let trimmedHistories=0,staleCommandsReleased=0,orphanDeltaBuffersReleased=0,invalidBooksRefreshed=0;
    for(const [ticker,h] of this.histories){
      if(!Array.isArray(h)){this.histories.delete(ticker);continue;}
      if(h.length>MAX_HISTORY){this.histories.set(ticker,h.slice(-MAX_HISTORY));trimmedHistories+=1;}
    }
    const staleMs=RECOVERY_SNAPSHOT_TIMEOUT_MS*MARKET_RUNTIME_MAINTENANCE.staleRecoveryMultiplier;
    for(const [requestId,command] of [...this.recoverySnapshotCommands]){
      if(at-Number(command?.requestedAtMs||0)<=staleMs)continue;
      const state=this.streamState(command?.sid);
      for(const ticker of [...(command?.tickers||[])]){this.releaseRecoverySnapshotTicker(state,ticker);staleCommandsReleased+=1;}
      this.recoverySnapshotCommands.delete(requestId);
    }
    for(const state of this.orderbookStreams.values()){
      for(const ticker of [...state.pendingDeltas.keys()]){
        if(state.pendingSnapshots.has(ticker)||state.snapshotInFlight.has(ticker))continue;
        state.pendingDeltas.delete(ticker);state.recoveryOverflow.delete(ticker);orphanDeltaBuffersReleased+=1;
      }
    }
    if(at-Number(this.runtimeMaintenance.lastInvalidRefreshAtMs||0)>=MARKET_RUNTIME_MAINTENANCE.invalidBookRefreshCadenceMs){
      this.runtimeMaintenance.lastInvalidRefreshAtMs=at;
      const maximum=String(pressureState)==='HARD_RESEARCH_SHED'?2:MARKET_RUNTIME_MAINTENANCE.invalidBookRefreshMaximum;
      const invalid=[...this.wanted].filter((ticker)=>{const q=this.quotes.get(ticker),b=this.books.get(ticker);return !this.resyncing.has(ticker)&&(!b||q?.bookInvalid||b?.sequenceValid===false);}).slice(0,maximum);
      invalidBooksRefreshed=invalid.length;
      for(const ticker of invalid)void this.resyncBook(ticker).catch(()=>{});
    }
    const m=this.runtimeMaintenance;m.runs+=1;m.lastRunAtMs=at;m.prunedQuotes+=removed.quotes;m.prunedBooks+=removed.books;m.prunedHistories+=removed.histories;m.trimmedHistories+=trimmedHistories;m.staleCommandsReleased+=staleCommandsReleased;m.orphanDeltaBuffersReleased+=orphanDeltaBuffersReleased;m.invalidBooksRefreshed+=invalidBooksRefreshed;
    m.lastResult={atMs:at,pressureState,removed,trimmedHistories,staleCommandsReleased,orphanDeltaBuffersReleased,invalidBooksRefreshed,wanted:this.wanted.size};
    return m.lastResult;
  }

  resourceSnapshot() {
    let wsSequenceValidBooks=0,restVerifiedBooks=0,invalidBooks=0,recoveringStreams=0,pendingSnapshots=0,recoverySnapshotsInFlight=0,recoveryBufferedDeltas=0;
    for (const [ticker,book] of this.books) {
      const q=this.quotes.get(ticker);
      if (q?.bookInvalid || book?.sequenceValid===false) invalidBooks+=1;
      if (book?.source==='WS' && book?.sequenceValid===true && !q?.bookInvalid) wsSequenceValidBooks+=1;
      if (book?.source==='REST' && book?.sequenceValid===true && !q?.bookInvalid) restVerifiedBooks+=1;
    }
    for (const state of this.orderbookStreams.values()) {
      if (state.recovering) recoveringStreams+=1;
      pendingSnapshots+=state.pendingSnapshots.size;
      recoverySnapshotsInFlight+=state.snapshotInFlight?.size||0;
      for (const rows of state.pendingDeltas?.values?.() || []) recoveryBufferedDeltas+=rows.length;
    }
    return {
      marketTruthRevision:MARKET_TRUTH_REVISION,
      wanted:this.wanted.size,
      quotes:this.quotes.size,
      books:this.books.size,
      histories:this.histories.size,
      resyncing:this.resyncing.size,
      connected:this.connected,
      bookIntegrity:{
        wsSequenceValidBooks,
        restVerifiedBooks,
        invalidBooks,
        sequenceSids:this.orderbookStreams.size,
        recoveringStreams,
        pendingSnapshots,
        recoverySnapshotsInFlight,
        recoverySnapshotCommands:this.recoverySnapshotCommands.size,
        recoveryBufferedDeltas,
        ...this.bookIntegrityStats,
      },
      cacheBoundedToWanted:true,
      runtimeMaintenance:{...this.runtimeMaintenance},
    };
  }

  setWanted(tickers) {
    const next = new Set(tickers.filter(Boolean));
    const changed = next.size !== this.wanted.size || [...next].some((x) => !this.wanted.has(x));
    this.wanted = next;
    // HF4/RGM1: the current discovery set plus explicit safety-priority tickers is
    // the complete runtime subscription authority. Historical ticker caches are
    // durable elsewhere and must not accumulate for the lifetime of the process.
    // Pruning never removes an active/open/recovery/crash priority ticker because
    // fullScan includes all of those in `priority` before calling discover().
    this.pruneUnusedCaches(next);
    if (changed && this.ws && this.connected) {
      this.reconnectToken += 1;
      this.ws.close(1000, 'subscription refresh');
    }
  }

  trustedRestBook(b) {
    return b ? { ...b, source:'REST', sid:null, seq:null, sequenceValid:true, invalidReason:null } : null;
  }

  quoteFromVerifiedBook(ticker, marketQuote, book, observedAtMs=Date.now()) {
    const base=this.quotes.get(ticker)||{};
    const merged={...base,...(marketQuote||{}),ticker:String(marketQuote?.ticker||base?.ticker||ticker)};
    if(!book)return Object.keys(merged).length?merged:null;
    const yesAsks=yesAsksFromNoBids(book.noBids||[]),bid=book.yesBids?.[0],ask=yesAsks[0];
    if(!bid||!ask||bid.priceCents>ask.priceCents)return {...merged,bookInvalid:true};
    const bookAt=Math.max(1,Number(book.updatedAtMs||observedAtMs)||observedAtMs);
    return {
      ...merged,yesBid:bid.priceCents,yesAsk:ask.priceCents,yesBidSize:bid.count,yesAskSize:ask.count,
      quoteAtMs:Math.max(Number(merged.quoteAtMs||merged.updatedAtMs||0),bookAt),
      updatedAtMs:Math.max(Number(merged.updatedAtMs||0),bookAt),bookInvalid:false,
    };
  }

  executableBidFromBook(book, count, limitCents = null) {
    if(!book?.yesBids?.length||book.sequenceValid===false)return null;
    const limit=Number.isFinite(Number(limitCents))?Number(limitCents):-Infinity;
    const out=walkLevels(book.yesBids,count,(x)=>x.priceCents>=limit);
    return {...out,bestCents:book.yesBids[0]?.priceCents??null};
  }

  executableAskFromBook(book, count, limitCents = null) {
    if(!book?.noBids?.length||book.sequenceValid===false)return null;
    const asks=yesAsksFromNoBids(book.noBids);
    const limit=Number.isFinite(Number(limitCents))?Number(limitCents):Infinity;
    const out=walkLevels(asks,count,(x)=>x.priceCents<=limit);
    return {...out,bestCents:asks[0]?.priceCents??null};
  }

  // MHF5: execution verification is intentionally non-destructive. A REST
  // proof may be newer than the websocket cache, but it must never replace a
  // sequence-aligned WS book merely because an entry candidate is being
  // revalidated. Callers receive the fresh REST quote/book directly.
  async verifyTickerSnapshot(ticker) {
    const [marketResult,bookResult]=await Promise.allSettled([
      this.kalshi.getMarket(ticker),this.kalshi.getOrderbook(ticker),
    ]);
    const marketQuote=marketResult.status==='fulfilled'?marketResult.value:null;
    const rawBook=bookResult.status==='fulfilled'?bookResult.value:null;
    const book=this.trustedRestBook(rawBook);
    const marketObservedAtMs=marketQuote?Date.now():0;
    const bookObservedAtMs=book?Number(book.updatedAtMs||Date.now()):0;
    const quote=this.quoteFromVerifiedBook(ticker,marketQuote,book,Math.max(marketObservedAtMs,bookObservedAtMs,Date.now()));
    return {quote,book,marketFresh:Boolean(marketQuote),bookFresh:Boolean(book),marketObservedAtMs,bookObservedAtMs,canonicalBookMutated:false};
  }

  async refreshTickerVerified(ticker) {
    const verified=await this.verifyTickerSnapshot(ticker);
    if(verified.marketFresh&&verified.quote)this.seed({...verified.quote,restMarketObservedAtMs:verified.marketObservedAtMs});
    if(verified.bookFresh&&verified.book){this.books.set(ticker,verified.book);this.applyBook(ticker);}
    return {...verified,quote:this.quotes.get(ticker)||verified.quote||null,canonicalBookMutated:Boolean(verified.bookFresh)};
  }

  async refreshTicker(ticker) {
    return (await this.refreshTickerVerified(ticker)).quote;
  }

  async ensureFreshBook(ticker, maxAgeMs = 5000) {
    const q = this.getQuote(ticker);
    const book = this.getBook(ticker);
    if (!book || this.bookAgeMs(ticker) > maxAgeMs || !q || q.bookInvalid || book.sequenceValid===false) await this.refreshTicker(ticker).catch(() => null);
    return this.getBook(ticker) || null;
  }

  async resyncBook(ticker) {
    if (this.resyncing.has(ticker)) return;
    this.resyncing.add(ticker);
    try {
      const raw = await this.kalshi.getOrderbook(ticker);
      const b=this.trustedRestBook(raw);
      if (b) {
        this.books.set(ticker, b);
        this.applyBook(ticker);
      }
    } finally {
      this.resyncing.delete(ticker);
    }
  }

  applyBook(ticker) {
    const book = this.books.get(ticker);
    const old = this.quotes.get(ticker);
    if (!book || !old) return;
    const trusted = book.source == null || book.source==='REST' || (book.source==='WS' && book.sequenceValid===true);
    if (!trusted) {
      this.quotes.set(ticker, { ...old, bookInvalid: !finalStatus(old) });
      return;
    }
    const yesAsks = yesAsksFromNoBids(book.noBids || []);
    book.yesAsks = yesAsks;
    const bid = book.yesBids?.[0];
    const ask = yesAsks[0];
    if (!bid || !ask || bid.priceCents > ask.priceCents) {
      if (book.source==='WS') { book.sequenceValid=false; book.invalidReason='crossed_or_incomplete_book'; }
      this.quotes.set(ticker, { ...old, bookInvalid: !finalStatus(old) });
      if (!finalStatus(old)) void this.resyncBook(ticker);
      return;
    }
    const observedAtMs=Number(book.updatedAtMs || 0);
    const q = {
      ...old,
      yesBid: bid.priceCents,
      yesAsk: ask.priceCents,
      yesBidSize: bid.count,
      yesAskSize: ask.count,
      quoteAtMs: Math.max(Number(old.quoteAtMs || old.updatedAtMs || 0), observedAtMs),
      updatedAtMs: Math.max(Number(old.updatedAtMs || 0), observedAtMs),
      bookInvalid: false,
    };
    this.quotes.set(ticker, q);
    this.onQuote(q);
  }

  executableBid(ticker, count, limitCents = null) {
    const b=this.books.get(ticker),q=this.quotes.get(ticker);
    if(q?.bookInvalid)return null;
    return this.executableBidFromBook(b,count,limitCents);
  }

  executableAsk(ticker, count, limitCents = null) {
    const b=this.books.get(ticker),q=this.quotes.get(ticker);
    if(q?.bookInvalid)return null;
    return this.executableAskFromBook(b,count,limitCents);
  }

  start() {
    this.stopped = false;
    if (!this.connectLoopRunning) void this.connectLoop();
  }

  kickStaleSocket(now = Date.now(), staleMs = 90_000) {
    this.start();
    if (this.lastMessageMs > 0 && now - this.lastMessageMs < staleMs) return false;
    this.reconnectToken += 1;
    try { this.ws?.terminate(); } catch {}
    return true;
  }
  stop() {
    this.stopped = true;
    this.ws?.close();
  }

  wsHeaders(url) {
    const c = this.getCredentials();
    if (!c?.keyId || !c?.privateKeyPem) return {};
    const ts = Date.now().toString();
    const path = new URL(url).pathname;
    return {
      'KALSHI-ACCESS-KEY': c.keyId,
      'KALSHI-ACCESS-TIMESTAMP': ts,
      'KALSHI-ACCESS-SIGNATURE': signKalshi(c.privateKeyPem, ts, 'GET', path),
    };
  }

  nextWsCommandId(){ const id=this.wsCommandId; this.wsCommandId+=1; return id; }

  streamState(sid,{create=false}={}) {
    if (sid==null) return null;
    let state=this.orderbookStreams.get(sid)||null;
    if (!state && create) {
      state={sid,lastSeq:0,tickers:new Set(),pendingSnapshots:new Set(),pendingDeltas:new Map(),recoveryOverflow:new Set(),snapshotInFlight:new Map(),snapshotAttempts:new Map(),recovering:false};
      this.orderbookStreams.set(sid,state);
    }
    if(state){
      if(!state.pendingDeltas)state.pendingDeltas=new Map();
      if(!state.recoveryOverflow)state.recoveryOverflow=new Set();
      if(!state.snapshotInFlight)state.snapshotInFlight=new Map();
      if(!state.snapshotAttempts)state.snapshotAttempts=new Map();
    }
    return state;
  }

  releaseRecoverySnapshotTicker(state,ticker,{resetAttempts=false}={}) {
    if(!state||!ticker)return;
    const flight=state.snapshotInFlight?.get?.(ticker)||null;
    if(flight?.requestId!=null){
      const command=this.recoverySnapshotCommands.get(flight.requestId);
      if(command){
        command.tickers.delete(ticker);
        if(command.tickers.size===0)this.recoverySnapshotCommands.delete(flight.requestId);
      }
    }
    state.snapshotInFlight?.delete?.(ticker);
    if(resetAttempts)state.snapshotAttempts?.delete?.(ticker);
  }

  clearRecoverySnapshotRequests(state,{resetAttempts=false}={}) {
    if(!state)return;
    for(const ticker of [...state.snapshotInFlight?.keys?.()||[]])this.releaseRecoverySnapshotTicker(state,ticker,{resetAttempts});
  }

  forceRecoveryReconnect(reason='orderbook_recovery_exhausted') {
    if(this.recoveryReconnectPending)return false;
    const ws=this.ws;
    const openConstant=WebSocket?.OPEN;
    if(!ws||!this.connected||typeof ws.close!=='function'||(openConstant!=null&&ws.readyState!==openConstant))return false;
    this.recoveryReconnectPending=true;
    this.bookIntegrityStats.recoveryReconnects+=1;
    try{ws.close(1012,String(reason).slice(0,120));return true;}catch{this.recoveryReconnectPending=false;return false;}
  }

  maintainRecovery(now=Date.now()) {
    for(const state of this.orderbookStreams.values()){
      let reconnect=false;
      for(const [ticker,flight] of [...state.snapshotInFlight.entries()]){
        if(now-Number(flight?.requestedAtMs||0)<=RECOVERY_SNAPSHOT_TIMEOUT_MS)continue;
        this.bookIntegrityStats.recoverySnapshotTimeouts+=1;
        this.releaseRecoverySnapshotTicker(state,ticker);
        void this.resyncBook(ticker);
        if(Number(state.snapshotAttempts?.get?.(ticker)||0)>=RECOVERY_SNAPSHOT_MAX_ATTEMPTS)reconnect=true;
      }
      if(reconnect){this.forceRecoveryReconnect('orderbook_recovery_snapshot_timeout');return false;}
      if(state.pendingSnapshots.size)this.requestStreamSnapshots(state);
    }
    return true;
  }

  invalidateTickerBook(ticker,reason='untrusted_ws_book') {
    const book=this.books.get(ticker);
    if (book?.source==='WS') { book.sequenceValid=false; book.invalidReason=reason; }
    const q=this.quotes.get(ticker);
    if (q && !finalStatus(q)) this.quotes.set(ticker,{...q,bookInvalid:true});
  }

  invalidateStream(state,reason='sequence_gap') {
    if (!state) return;
    // Any snapshot requested before a newly observed continuity break may be
    // older than the missing stream segment. Supersede those requests and ask
    // for fresh snapshots from the newly invalidated cursor.
    this.clearRecoverySnapshotRequests(state);
    for (const ticker of state.tickers) {
      const book=this.books.get(ticker);
      if (book?.source==='WS' && Number(book.sid)===Number(state.sid)) this.invalidateTickerBook(ticker,reason);
      if (this.wanted.has(ticker) || this.books.has(ticker) || this.quotes.has(ticker)) {
        state.pendingSnapshots.add(ticker);
        state.pendingDeltas?.set?.(ticker,[]);
        state.recoveryOverflow?.delete?.(ticker);
      }
    }
    state.recovering=true;
    this.requestStreamSnapshots(state);
  }

  requestStreamSnapshots(state) {
    if (!state || !state.pendingSnapshots.size) return false;
    if(this.recoveryReconnectPending)return false;
    const ws=this.ws;
    const openConstant=WebSocket?.OPEN;
    if (!ws || !this.connected || typeof ws.send!=='function' || (openConstant!=null && ws.readyState!==openConstant)) return false;
    // Snapshot requests are ticker-scoped even though sequence continuity is
    // SID-scoped. A single stream-wide in-flight flag starves tickers that enter
    // recovery after an earlier batch was sent. Request every currently pending
    // ticker that is not already represented by an in-flight command.
    const tickers=[...state.pendingSnapshots].filter((ticker)=>!state.snapshotInFlight.has(ticker));
    if(!tickers.length)return false;
    this.bookIntegrityStats.recoveryRequests+=1;
    for (let i=0;i<tickers.length;i+=SNAPSHOT_BATCH_SIZE) {
      const batch=tickers.slice(i,i+SNAPSHOT_BATCH_SIZE);
      const requestId=this.nextWsCommandId();
      const requestedAtMs=Date.now();
      const command={requestId,sid:state.sid,tickers:new Set(batch),requestedAtMs};
      this.recoverySnapshotCommands.set(requestId,command);
      for(const ticker of batch){
        state.snapshotInFlight.set(ticker,{requestId,requestedAtMs});
        state.snapshotAttempts.set(ticker,Number(state.snapshotAttempts.get(ticker)||0)+1);
      }
      this.bookIntegrityStats.recoveryBatches+=1;
      try{
        // Kalshi's get_snapshot contract documents `sids:[sid]` for this
        // action. Use that canonical shape instead of relying on the generic
        // single-sid update_subscription shorthand.
        ws.send(JSON.stringify({id:requestId,cmd:'update_subscription',params:{sids:[state.sid],market_tickers:batch,action:'get_snapshot'}}));
      }catch{
        this.bookIntegrityStats.recoverySnapshotErrors+=1;
        for(const ticker of batch)this.releaseRecoverySnapshotTicker(state,ticker);
      }
    }
    return true;
  }

  bufferRecoveryDelta(state,ticker,data) {
    if(!state||!ticker||!data)return false;
    if(!state.pendingDeltas)state.pendingDeltas=new Map();
    if(!state.recoveryOverflow)state.recoveryOverflow=new Set();
    const rows=state.pendingDeltas.get(ticker)||[];
    if(rows.length>=RECOVERY_DELTA_BUFFER_LIMIT){
      state.recoveryOverflow.add(ticker);
      rows.shift();
      this.bookIntegrityStats.recoveryDeltaDrops+=1;
    }
    rows.push({sid:sidOf(data,data?.msg||{}),seq:seqOf(data,data?.msg||{}),msg:{...(data?.msg||{})}});
    state.pendingDeltas.set(ticker,rows);
    this.bookIntegrityStats.recoveryBufferedDeltaEvents+=1;
    return true;
  }

  applyDeltaToBook(book,msg,seq) {
    if(!book||!msg)return false;
    const nativeSide=String(msg.side||'').toLowerCase()==='no'?book.noBids:book.yesBids;
    const price=cents(msg.price_dollars);
    const delta=Number(msg.delta_fp??msg.delta??0);
    if(!(price>0&&price<100)||!Number.isFinite(delta))return false;
    const found=nativeSide.find((x)=>x.priceCents===price);
    if(found)found.count+=delta;
    else if(delta>0)nativeSide.push({priceCents:price,count:delta});
    const clean=nativeSide.filter((x)=>x.count>1e-9).sort((a,b)=>b.priceCents-a.priceCents);
    if(String(msg.side||'').toLowerCase()==='no')book.noBids=clean;else book.yesBids=clean;
    book.updatedAtMs=Math.max(Number(book.updatedAtMs||0),Number(msg.ts_ms)||Date.now());
    if(seq!=null)book.seq=seq;
    return true;
  }

  applyRecoverySnapshot(state,ticker,sid,seq,msg) {
    if(!state||!ticker||sid==null||seq==null)return false;
    this.releaseRecoverySnapshotTicker(state,ticker);
    const buffered=(state.pendingDeltas?.get?.(ticker)||[]).slice().sort((a,b)=>Number(a.seq||0)-Number(b.seq||0));
    const overflow=Boolean(state.recoveryOverflow?.has?.(ticker));
    if(overflow&&seq<state.lastSeq){
      // We cannot prove that every ignored delta after this stale snapshot is
      // still buffered. Stay fail-closed and ask Kalshi for a newer snapshot.
      state.pendingDeltas.set(ticker,[]);
      state.recoveryOverflow.delete(ticker);
      this.requestStreamSnapshots(state);
      return false;
    }
    const book={
      ticker,
      yesBids:parseLevels(msg.yes_dollars_fp||msg.yes_dollars),
      noBids:parseLevels(msg.no_dollars_fp||msg.no_dollars),
      updatedAtMs:Number(msg.ts_ms)||Date.now(),
      source:'WS',sid,seq,sequenceValid:true,invalidReason:null,
    };
    for(const row of buffered){
      if(Number(row.seq||0)<=Number(seq))continue;
      if(this.applyDeltaToBook(book,row.msg,row.seq))this.bookIntegrityStats.recoveryReplayedDeltas+=1;
    }
    this.books.set(ticker,book);
    state.tickers.add(ticker);
    state.pendingSnapshots.delete(ticker);
    state.pendingDeltas?.delete?.(ticker);
    state.recoveryOverflow?.delete?.(ticker);
    state.snapshotAttempts?.delete?.(ticker);
    state.recovering=state.pendingSnapshots.size>0;
    this.applyBook(ticker);
    // A second ticker can enter recovery while an earlier snapshot request is
    // still in flight. Immediately request any newly pending/unrequested ticker
    // so one completed snapshot cannot leave the rest of the stream stranded.
    if(state.pendingSnapshots.size)this.requestStreamSnapshots(state);
    return true;
  }

  startSingleTickerRecovery(state,ticker,reason,data=null) {
    if (!state || !ticker) return;
    state.tickers.add(ticker);
    if(!state.pendingSnapshots.has(ticker)){
      state.pendingSnapshots.add(ticker);
      state.pendingDeltas?.set?.(ticker,[]);
      state.recoveryOverflow?.delete?.(ticker);
    }
    if(data)this.bufferRecoveryDelta(state,ticker,data);
    state.recovering=true;
    this.invalidateTickerBook(ticker,reason);
    this.requestStreamSnapshots(state);
    if(!state.snapshotInFlight.has(ticker))void this.resyncBook(ticker);
  }

  advanceStreamSequence(data,{ticker=null,type='orderbook'}={}) {
    const msg=data?.msg||{};
    const sid=sidOf(data,msg),seq=seqOf(data,msg);
    if (sid==null || seq==null) {
      this.bookIntegrityStats.missingSequence+=1;
      const knownBook=ticker?this.books.get(ticker):null;
      const knownSid=knownBook?.source==='WS'?finiteInt(knownBook.sid):null;
      const knownState=knownSid==null?null:this.streamState(knownSid);
      if (knownState) this.invalidateStream(knownState,'missing_sid_or_sequence');
      else if (ticker) {
        this.invalidateTickerBook(ticker,'missing_sid_or_sequence');
        void this.resyncBook(ticker);
      }
      return {ok:false,sid,seq,state:knownState,reason:'missing_sid_or_sequence'};
    }
    let state=this.streamState(sid,{create:type==='snapshot'});
    if (!state) {
      this.bookIntegrityStats.missingSequence+=1;
      if (ticker) {
        this.invalidateTickerBook(ticker,'subscription_state_missing');
        void this.resyncBook(ticker);
      }
      return {ok:false,sid,seq,state:null,reason:'subscription_state_missing'};
    }
    if (seq<=state.lastSeq) {
      this.bookIntegrityStats.ignoredOldSequences+=1;
      return {ok:false,sid,seq,state,reason:'old_or_duplicate_sequence'};
    }
    if (state.lastSeq>0 && seq!==state.lastSeq+1) {
      this.bookIntegrityStats.sequenceGaps+=1;
      const previousSeq=state.lastSeq;
      state.lastSeq=seq;
      this.invalidateStream(state,`sequence_gap:${previousSeq}->${seq}`);
      return {ok:false,sid,seq,state,reason:'sequence_gap'};
    }
    state.lastSeq=seq;
    return {ok:true,sid,seq,state,reason:'contiguous'};
  }

  invalidateWsBooks(reason='websocket_disconnect') {
    let count=0;
    for (const [ticker,book] of this.books) {
      if (book?.source!=='WS') continue;
      count+=1;
      book.sequenceValid=false;
      book.invalidReason=reason;
      book.sid=null;
      book.seq=null;
      const q=this.quotes.get(ticker);
      if (q && !finalStatus(q)) this.quotes.set(ticker,{...q,bookInvalid:true});
    }
    this.recoverySnapshotCommands.clear();
    this.orderbookStreams.clear();
    this.recoveryReconnectPending=false;
    this.bookIntegrityStats.disconnectInvalidations+=count;
    return count;
  }

  async connectLoop() {
    if (this.connectLoopRunning) return;
    this.connectLoopRunning = true;
    let attempt = 0;
    try {
      while (!this.stopped) {
        if (!this.getCredentials()?.keyId) {
          await sleep(2000);
          continue;
        }
        const token = this.reconnectToken;
        const urls = [this.wsUrl, this.fallbackWsUrl].filter((x, i, a) => x && a.indexOf(x) === i);
        try {
          await this.connectOnce(urls[Math.min(attempt, urls.length - 1)] || this.wsUrl, token);
          attempt = 0;
        } catch {
          attempt += 1;
        }
        if (!this.stopped) await sleep(Math.min(1000 * 2 ** Math.min(attempt, 5), 30000));
      }
    } finally {
      this.connectLoopRunning = false;
    }
  }

  connectOnce(url, token) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, { headers: this.wsHeaders(url), handshakeTimeout: 10000 });
      this.ws = ws;
      let ping = null;
      let stale = null;
      let cleaned = false;
      const clean = () => {
        if (cleaned) return;
        cleaned = true;
        if (ping) clearInterval(ping);
        if (stale) clearInterval(stale);
        this.invalidateWsBooks('websocket_disconnect');
        if (this.ws === ws) this.ws = null;
        this.connected = false;
        this.onStatus(false, this.lastMessageMs);
      };
      ws.on('open', () => {
        this.recoveryReconnectPending=false;
        this.connected = true;
        this.lastMessageMs = Date.now();
        this.onStatus(true, this.lastMessageMs);
        const tickers = [...this.wanted];
        if (tickers.length) {
          ws.send(JSON.stringify({ id: this.nextWsCommandId(), cmd: 'subscribe', params: { channels: ['ticker', 'trade'], market_tickers: tickers } }));
          // Explicitly preserve Kalshi native YES-bid / NO-bid orderbook semantics.
          // YES asks are derived internally as 100 - NO bid for REST/WS parity.
          ws.send(JSON.stringify({ id: this.nextWsCommandId(), cmd: 'subscribe', params: { channels: ['orderbook_delta'], market_tickers: tickers, use_yes_price:false } }));
        }
        ws.send(JSON.stringify({ id: this.nextWsCommandId(), cmd: 'subscribe', params: { channels: ['market_lifecycle_v2'] } }));
        ws.send(JSON.stringify({ id: this.nextWsCommandId(), cmd: 'subscribe', params: { channels: ['fill', 'market_positions', 'user_orders'] } }));
        ping = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 20000);
        stale = setInterval(() => {
          this.maintainRecovery(Date.now());
          if (Date.now() - this.lastMessageMs > 65000 && ws.readyState === WebSocket.OPEN) ws.terminate();
          if (token !== this.reconnectToken && ws.readyState === WebSocket.OPEN) ws.close(1000, 'refresh');
        }, 5000);
      });
      ws.on('message', (raw) => {
        this.lastMessageMs = Date.now();
        this.onStatus(true, this.lastMessageMs);
        try { this.handle(JSON.parse(raw.toString())); } catch {}
      });
      ws.on('pong', () => {
        this.lastMessageMs = Date.now();
        this.onStatus(true, this.lastMessageMs);
      });
      ws.on('error', (e) => { clean(); reject(e); });
      ws.on('close', () => { clean(); resolve(); });
    });
  }

  handle(data) {
    const type = data.type;
    const msg = data.msg || {};

    // A rejected/invalid get_snapshot command must release its in-flight
    // tickers. Otherwise they can remain permanently pending while every later
    // delta is buffered and eventually dropped. Retry a bounded number of times
    // and then force a clean subscription reconnect.
    if(type==='error'){
      const requestId=finiteInt(data?.id);
      const command=requestId==null?null:this.recoverySnapshotCommands.get(requestId);
      if(command){
        this.bookIntegrityStats.recoverySnapshotErrors+=1;
        const state=this.streamState(command.sid);
        const tickers=[...command.tickers];
        let reconnect=false;
        for(const ticker of tickers){
          this.releaseRecoverySnapshotTicker(state,ticker);
          void this.resyncBook(ticker);
          if(Number(state?.snapshotAttempts?.get?.(ticker)||0)>=RECOVERY_SNAPSHOT_MAX_ATTEMPTS)reconnect=true;
        }
        if(reconnect)this.forceRecoveryReconnect(`orderbook_recovery_error:${msg?.code??'unknown'}`);
        else if(state?.pendingSnapshots?.size)this.requestStreamSnapshots(state);
      }
      return;
    }

    // Kalshi update_subscription acknowledgements can carry the same SID/SEQ
    // cursor as book messages. They advance continuity but never heal a book.
    if (type === 'ok') {
      const sid=sidOf(data,msg),seq=seqOf(data,msg);
      const state=this.streamState(sid);
      if (state && seq!=null) this.advanceStreamSequence(data,{type:'ok'});
      return;
    }

    if (type === 'ticker') {
      const ticker = msg.market_ticker;
      const old = this.quotes.get(ticker);
      if (!ticker || !old) return;
      const hasBid=msg.yes_bid_dollars != null,hasAsk=msg.yes_ask_dollars != null;
      const directQuoteTruth=hasBid||hasAsk;
      const observedAt=directQuoteTruth ? (Number(msg.ts_ms) || Date.now()) : Number(old.quoteAtMs || old.updatedAtMs || 0);
      const q = {
        ...old,
        yesBid: hasBid ? cents(msg.yes_bid_dollars) : old.yesBid,
        yesAsk: hasAsk ? cents(msg.yes_ask_dollars) : old.yesAsk,
        yesBidSize: msg.yes_bid_size_fp != null ? Number(msg.yes_bid_size_fp) : old.yesBidSize,
        yesAskSize: msg.yes_ask_size_fp != null ? Number(msg.yes_ask_size_fp) : old.yesAskSize,
        lastPrice: msg.price_dollars != null ? cents(msg.price_dollars) : old.lastPrice,
        volume: msg.volume_fp != null ? Number(msg.volume_fp) : old.volume,
        quoteAtMs:observedAt,
        updatedAtMs:observedAt,
        // A quote/ticker message can refresh bid/ask values but it cannot prove
        // continuity of the executable depth book after sequence invalidation.
        bookInvalid:Boolean(old.bookInvalid),
      };
      if (!validQuote(q) && !finalStatus(q)) {
        this.quotes.set(ticker, { ...old, bookInvalid: true });
        void this.resyncBook(ticker);
        return;
      }
      this.quotes.set(ticker, q);
      this.onQuote(q);
      return;
    }

    if (type === 'trade') {
      const ticker = msg.market_ticker;
      const q = this.quotes.get(ticker);
      if (q) {
        const observedAt=Number(msg.ts_ms) || Date.now();
        q.recentTrades = (q.recentTrades || 0) + 1;
        q.recentTradesObservedAtMs = Math.max(Number(q.recentTradesObservedAtMs || 0),observedAt);
        q.lastTradeObservedAtMs = observedAt;
        if (msg.yes_price_dollars != null) q.lastPrice = cents(msg.yes_price_dollars);
        // Critical HF2 invariant: trade activity is not bid/ask freshness.
        // Do not mutate quoteAtMs/updatedAtMs or bookInvalid here.
        this.onQuote(q);
      }
      return;
    }

    if (type === 'orderbook_snapshot') {
      const ticker=msg.market_ticker;
      if(!ticker)return;
      const sid=sidOf(data,msg),seq=seqOf(data,msg);
      const existing=this.books.get(ticker);
      if(existing?.source==='WS'&&existing.sid!=null&&sid!=null&&Number(existing.sid)!==Number(sid)){
        this.bookIntegrityStats.sidMismatch+=1;
        const oldState=this.streamState(finiteInt(existing.sid));
        if(oldState)this.invalidateStream(oldState,'sid_mismatch');
        this.invalidateTickerBook(ticker,'sid_mismatch');
        void this.resyncBook(ticker);
        return;
      }
      const knownState=this.streamState(sid,{create:true});
      const pending=Boolean(knownState?.pendingSnapshots?.has?.(ticker));
      // A requested full snapshot may arrive after later stream messages have
      // already advanced the subscription cursor. It is still usable if we can
      // replay every buffered delta for this ticker after the snapshot seq.
      if(pending&&seq!=null&&seq<=knownState.lastSeq){
        this.applyRecoverySnapshot(knownState,ticker,sid,seq,msg);
        return;
      }
      const gate=this.advanceStreamSequence(data,{ticker,type:'snapshot'});
      if(!gate.ok){
        if(pending&&gate.reason==='sequence_gap')this.applyRecoverySnapshot(gate.state,ticker,sid,seq,msg);
        return;
      }
      this.applyRecoverySnapshot(gate.state,ticker,gate.sid,gate.seq,msg);
      return;
    }

    if (type === 'orderbook_delta') {
      const ticker=msg.market_ticker;
      if(!ticker)return;
      const gate=this.advanceStreamSequence(data,{ticker,type:'delta'});
      const state=gate.state;
      if(!gate.ok)return;
      if(state.pendingSnapshots.has(ticker)){this.bufferRecoveryDelta(state,ticker,data);return;}
      const book=this.books.get(ticker);
      if(!book){this.startSingleTickerRecovery(state,ticker,'missing_snapshot_before_delta',data);return;}
      if(book.source!=='WS'){
        // REST is independently trusted, but it is not aligned to this WS SID.
        // Request one WS snapshot and buffer subsequent deltas; this is not an
        // SID mismatch and must not create a mismatch storm.
        this.startSingleTickerRecovery(state,ticker,'rest_book_requires_ws_snapshot',data);
        return;
      }
      if(Number(book.sid)!==Number(gate.sid)){
        this.bookIntegrityStats.sidMismatch+=1;
        this.startSingleTickerRecovery(state,ticker,'sid_mismatch',data);
        return;
      }
      if(book.sequenceValid!==true){this.startSingleTickerRecovery(state,ticker,'sequence_invalid',data);return;}
      if(!this.applyDeltaToBook(book,msg,gate.seq)){
        this.startSingleTickerRecovery(state,ticker,'invalid_delta',data);
        return;
      }
      book.sequenceValid=true;book.invalidReason=null;
      this.applyBook(ticker);
      return;
    }

    if (type === 'market_lifecycle_v2') {
      const ticker = msg.market_ticker || msg.ticker;
      const q = this.quotes.get(ticker);
      if (q) {
        const e = String(msg.event_type || '').toLowerCase();
        if (e === 'activated') q.status = 'active';
        else if (e === 'deactivated') q.status = 'inactive';
        else if (e === 'determined') { q.status = 'determined'; q.result = msg.result || q.result; }
        else if (e === 'settled' || e === 'finalized') { q.status = 'finalized'; q.result = msg.result || q.result; }
        q.lifecycleObservedAtMs = Number(msg.ts_ms) || Date.now();
        // Lifecycle is not bid/ask freshness and cannot heal an invalid book.
        this.onQuote(q);
      }
      return;
    }
    if (['fill', 'market_position', 'market_positions', 'user_order', 'user_orders'].includes(type)) this.onPrivate({ type, msg });
  }
}
